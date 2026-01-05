


import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Animated,
  Dimensions,
} from "react-native";
import { FontAwesome, Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { notificationService } from "../../../notificationService";
import AsyncStorage from "@react-native-async-storage/async-storage";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

// Couleurs Pro VIP ShopNet
const VIP_COLORS = {
  primary: "#00182A",
  secondary: "#4DB14E",
  accent: "#8B5CF6",
  gold: "#FFD700",
  background: "#0F172A",
  surface: "#1E293B",
  surfaceLight: "#334155",
  text: "#FFFFFF",
  textSecondary: "rgba(255,255,255,0.7)",
  textTertiary: "rgba(255,255,255,0.5)",
  border: "rgba(255,255,255,0.1)",
  unread: "rgba(139, 92, 246, 0.15)",
  read: "rgba(255,255,255,0.02)",
};

interface Notification {
  id: number;
  titre: string;
  contenu: string;
  date_notification: string;
  type?: string;
  priorite?: string;
  lien?: string | null;
  read?: boolean;
}

// Clé pour stocker les notifications lues
const READ_NOTIFICATIONS_KEY = 'read_notifications';

// Fonction utilitaire pour formater et valider les dates
const formatNotificationDate = (dateString: string): string => {
  if (!dateString) {
    return new Date().toISOString();
  }

  try {
    // Si c'est déjà une date ISO valide
    if (!isNaN(new Date(dateString).getTime())) {
      return dateString;
    }

    // Si c'est une date locale, la convertir en ISO
    const date = new Date(dateString);
    if (!isNaN(date.getTime())) {
      return date.toISOString();
    }

    // Fallback : date actuelle
    return new Date().toISOString();
  } catch (error) {
    console.warn("Erreur format date:", error, "dateString:", dateString);
    return new Date().toISOString();
  }
};

// Fonction de tri par date (plus récent en premier)
const sortNotificationsByDate = (notifications: Notification[]): Notification[] => {
  return [...notifications].sort((a, b) => {
    const dateA = new Date(formatNotificationDate(a.date_notification)).getTime();
    const dateB = new Date(formatNotificationDate(b.date_notification)).getTime();
    return dateB - dateA; // Ordre décroissant (plus récent en premier)
  });
};

// Composant séparé pour l'item de notification avec animations
const NotificationItem = ({ 
  item, 
  index, 
  onPress 
}: { 
  item: Notification; 
  index: number;
  onPress: (item: Notification) => void;
}) => {
  const scaleAnim = React.useRef(new Animated.Value(0.9)).current;
  const opacityAnim = React.useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    Animated.parallel([
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 50,
        friction: 7,
        useNativeDriver: true,
        delay: index * 50,
      }),
      Animated.timing(opacityAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
        delay: index * 50,
      }),
    ]).start();
  }, []);

  const getPriorityIcon = (priorite?: string) => {
    switch (priorite) {
      case "haute":
        return <Ionicons name="warning" size={16} color="#EF4444" />;
      case "moyenne":
        return <Ionicons name="information-circle" size={16} color="#F59E0B" />;
      case "basse":
        return <Ionicons name="checkmark-circle" size={16} color="#10B981" />;
      default:
        return <Ionicons name="notifications" size={16} color={VIP_COLORS.accent} />;
    }
  };

  const getTypeIcon = (type?: string) => {
    switch (type) {
      case "commande":
        return <MaterialCommunityIcons name="package-variant" size={20} color={VIP_COLORS.secondary} />;
      case "promotion":
        return <Ionicons name="pricetag" size={18} color={VIP_COLORS.gold} />;
      case "systeme":
        return <Ionicons name="settings" size={18} color={VIP_COLORS.accent} />;
      case "securite":
        return <Ionicons name="shield-checkmark" size={18} color="#10B981" />;
      default:
        return <Ionicons name="notifications" size={18} color={VIP_COLORS.textSecondary} />;
    }
  };

  const getPriorityBadge = (priorite?: string) => {
    if (!priorite) return null;

    const priorityConfig = {
      haute: { color: "#EF4444", bgColor: "rgba(239, 68, 68, 0.1)", label: "URGENT" },
      moyenne: { color: "#F59E0B", bgColor: "rgba(245, 158, 11, 0.1)", label: "IMPORTANT" },
      basse: { color: "#10B981", bgColor: "rgba(16, 185, 129, 0.1)", label: "INFO" }
    };

    const config = priorityConfig[priorite as keyof typeof priorityConfig] || priorityConfig.basse;

    return (
      <View style={[styles.priorityBadge, { backgroundColor: config.bgColor }]}>
        {getPriorityIcon(priorite)}
        <Text style={[styles.priorityText, { color: config.color }]}>
          {config.label}
        </Text>
      </View>
    );
  };

  // Formatage sécurisé de la date pour l'affichage
  const formatDisplayDate = (dateString: string): string => {
    try {
      const date = new Date(formatNotificationDate(dateString));
      if (isNaN(date.getTime())) {
        return "Date invalide";
      }
      
      return date.toLocaleString('fr-FR', {
        day: 'numeric',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (error) {
      return "Date invalide";
    }
  };

  return (
    <Animated.View
      style={[
        { opacity: opacityAnim, transform: [{ scale: scaleAnim }] }
      ]}
    >
      <TouchableOpacity
        style={[
          styles.notificationItem,
          item.read ? styles.readNotification : styles.unreadNotification,
        ]}
        onPress={() => onPress(item)}
        activeOpacity={0.7}
      >
        {/* Badge non lu */}
        {!item.read && (
          <View style={styles.unreadBadge}>
            <View style={styles.unreadDot} />
          </View>
        )}

        {/* Icône type */}
        <View style={styles.typeIcon}>
          {getTypeIcon(item.type)}
        </View>

        {/* Contenu */}
        <View style={styles.content}>
          <View style={styles.header}>
            <Text style={[
              styles.title, 
              item.read ? styles.readTitle : styles.unreadTitle
            ]} numberOfLines={1}>
              {item.titre}
            </Text>
            {getPriorityBadge(item.priorite)}
          </View>
          
          <Text style={[
            styles.message, 
            item.read ? styles.readMessage : styles.unreadMessage
          ]} numberOfLines={2}>
            {item.contenu}
          </Text>
          
          <View style={styles.footer}>
            <Text style={[
              styles.date, 
              item.read ? styles.readDate : styles.unreadDate
            ]}>
              {formatDisplayDate(item.date_notification)}
            </Text>
            
            {item.type && (
              <View style={styles.typeBadge}>
                <Text style={styles.typeText}>
                  {item.type.toUpperCase()}
                </Text>
              </View>
            )}
          </View>
        </View>

        {/* Indicateur de lecture */}
        <View style={styles.readIndicator}>
          <Ionicons 
            name="chevron-forward" 
            size={16} 
            color={item.read ? VIP_COLORS.textTertiary : VIP_COLORS.accent} 
          />
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
};

export default function NotificationsScreen() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [unreadCount, setUnreadCount] = useState(0);
  const router = useRouter();

  const userId = 70; // ID utilisateur connecté

  // Charger les notifications lues depuis le stockage
  const loadReadNotifications = async () => {
    try {
      const readNotifications = await AsyncStorage.getItem(READ_NOTIFICATIONS_KEY);
      return readNotifications ? JSON.parse(readNotifications) : [];
    } catch (error) {
      console.warn("Erreur chargement notifications lues:", error);
      return [];
    }
  };

  // Sauvegarder les notifications lues
  const saveReadNotifications = async (readIds: number[]) => {
    try {
      await AsyncStorage.setItem(READ_NOTIFICATIONS_KEY, JSON.stringify(readIds));
    } catch (error) {
      console.warn("Erreur sauvegarde notifications lues:", error);
    }
  };

  useEffect(() => {
    fetchNotifications();

    notificationService.initSocket().catch((err) =>
      console.warn("Erreur socket:", err)
    );

    const listener = (notif: Notification) => {
      console.log("📨 Nouvelle notification reçue:", notif);
      
      // S'assurer que la notification a une date valide
      const notificationWithValidDate = {
        ...notif,
        date_notification: formatNotificationDate(notif.date_notification || new Date().toISOString()),
        read: false
      };

      setNotifications(prev => {
        const newNotifications = [notificationWithValidDate, ...prev];
        return sortNotificationsByDate(newNotifications);
      });
    };
    
    notificationService.subscribe(listener);

    return () => {
      notificationService.unsubscribe(listener);
      notificationService.disconnect();
    };
  }, []);

  useEffect(() => {
    updateUnreadCount(notifications);
  }, [notifications]);

  const updateUnreadCount = (notifs: Notification[]) => {
    const count = notifs.filter(notif => !notif.read).length;
    setUnreadCount(count);
  };

  const fetchNotifications = async () => {
    try {
        // const response = await fetch(`http://100.64.134.89:5000/api/notifications`);
        const response = await fetch(`https://shopnet-backend.onrender.com/api/notifications`);
        const data = await response.json();
        console.log("🔍 Données reçues :", data);


      let notificationsData: Notification[] = [];
      
      if (data.success && Array.isArray(data.notifications)) {
        notificationsData = data.notifications;
      } else if (Array.isArray(data)) {
        notificationsData = data;
      }

      // Charger les IDs des notifications déjà lues
      const readNotificationIds = await loadReadNotifications();
      
      // Marquer les notifications comme lues si elles sont dans la liste
      const updatedNotifications = notificationsData.map(notif => ({
        ...notif,
        date_notification: formatNotificationDate(notif.date_notification),
        read: readNotificationIds.includes(notif.id)
      }));

      // Trier par date avant de définir le state
      const sortedNotifications = sortNotificationsByDate(updatedNotifications);
      setNotifications(sortedNotifications);
      
    } catch (error) {
      console.warn("Erreur fetch notifications:", error);
      setNotifications([]);
    } finally {
      setLoading(false);
    }
  };

  const handlePress = async (notif: Notification) => {
    // Marquer comme lu
    const updatedNotifications = notifications.map((n) => 
      n.id === notif.id ? { ...n, read: true } : n
    );
    
    // Re-trier après modification
    const sortedNotifications = sortNotificationsByDate(updatedNotifications);
    setNotifications(sortedNotifications);

    // Sauvegarder l'ID de la notification lue
    const readNotificationIds = await loadReadNotifications();
    const newReadIds = [...new Set([...readNotificationIds, notif.id])];
    await saveReadNotifications(newReadIds);

    // Navigation vers le détail
    router.push({
      pathname: `/Auth/Notification/[id]`,
      params: {
        id: notif.id.toString(),
        titre: notif.titre,
        contenu: notif.contenu,
        date_notification: formatNotificationDate(notif.date_notification),
        type: notif.type,
        priorite: notif.priorite,
        lien: notif.lien,
        read: "true",
      },
    });
  };

  const markAllAsRead = async () => {
    const updatedNotifications = notifications.map(notif => ({
      ...notif,
      read: true
    }));
    
    // Re-trier après modification
    const sortedNotifications = sortNotificationsByDate(updatedNotifications);
    setNotifications(sortedNotifications);

    // Sauvegarder tous les IDs comme lus
    const allIds = notifications.map(notif => notif.id);
    await saveReadNotifications(allIds);
  };

  const renderItem = ({ item, index }: { item: Notification; index: number }) => (
    <NotificationItem 
      item={item} 
      index={index} 
      onPress={handlePress} 
    />
  );

  return (
    <View style={styles.container}>
      {/* Header Pro VIP */}
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <View style={styles.titleContainer}>
            <Ionicons name="notifications" size={28} color={VIP_COLORS.accent} />
            <Text style={styles.headerTitle}>Notifications</Text>
            {unreadCount > 0 && (
              <View style={styles.unreadCounter}>
                <Text style={styles.unreadCounterText}>{unreadCount}</Text>
              </View>
            )}
          </View>
          
          {unreadCount > 0 && (
            <TouchableOpacity style={styles.markAllButton} onPress={markAllAsRead}>
              <Text style={styles.markAllText}>Tout marquer comme lu</Text>
            </TouchableOpacity>
          )}
        </View>
        
        <View style={styles.vipBadge}>
          <Ionicons name="diamond" size={14} color={VIP_COLORS.gold} />
          <Text style={styles.vipText}>PRO VIP</Text>
        </View>
      </View>

      {/* Liste des notifications */}
      {loading && notifications.length === 0 ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={VIP_COLORS.accent} />
          <Text style={styles.loadingText}>Chargement des notifications...</Text>
        </View>
      ) : notifications.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="notifications-off" size={80} color={VIP_COLORS.textTertiary} />
          <Text style={styles.emptyTitle}>Aucune notification</Text>
          <Text style={styles.emptySubtitle}>
            Vous serez notifié des nouvelles activités ici
          </Text>
        </View>
      ) : (
        <FlatList
          data={notifications}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderItem}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.listContent}
        />
      )}
    </View>
  );
}

// Les styles restent identiques...
const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: VIP_COLORS.background,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 20,
    backgroundColor: VIP_COLORS.surface,
    borderBottomWidth: 1,
    borderBottomColor: VIP_COLORS.border,
  },
  headerContent: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  titleContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: "800",
    color: VIP_COLORS.text,
    marginLeft: 12,
  },
  unreadCounter: {
    backgroundColor: VIP_COLORS.accent,
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
    marginLeft: 8,
    minWidth: 24,
    alignItems: "center",
  },
  unreadCounterText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "800",
  },
  markAllButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: "rgba(139, 92, 246, 0.1)",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "rgba(139, 92, 246, 0.3)",
  },
  markAllText: {
    color: VIP_COLORS.accent,
    fontSize: 12,
    fontWeight: "600",
  },
  vipBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255, 215, 0, 0.15)",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    alignSelf: "flex-start",
  },
  vipText: {
    fontSize: 12,
    fontWeight: "800",
    color: VIP_COLORS.gold,
    marginLeft: 4,
    letterSpacing: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: VIP_COLORS.textSecondary,
    fontWeight: "500",
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 40,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: VIP_COLORS.text,
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 16,
    color: VIP_COLORS.textSecondary,
    textAlign: "center",
    lineHeight: 22,
  },
  listContent: {
    paddingHorizontal: 0,
  },
  notificationItem: {
    flexDirection: "row",
    borderRadius: 0,
    padding: 16,
    marginBottom: 0,
    borderBottomWidth: 1,
    borderBottomColor: VIP_COLORS.border,
    width: SCREEN_WIDTH,
  },
  unreadNotification: {
    backgroundColor: VIP_COLORS.unread,
  },
  readNotification: {
    backgroundColor: VIP_COLORS.read,
  },
  unreadBadge: {
    position: "absolute",
    top: 16,
    left: 16,
    zIndex: 1,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: VIP_COLORS.accent,
  },
  typeIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.1)",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  content: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 6,
  },
  title: {
    fontSize: 16,
    fontWeight: "700",
    flex: 1,
    marginRight: 8,
  },
  unreadTitle: {
    color: VIP_COLORS.text,
  },
  readTitle: {
    color: VIP_COLORS.textTertiary,
  },
  priorityBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    gap: 4,
  },
  priorityText: {
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 0.5,
  },
  message: {
    fontSize: 14,
    lineHeight: 18,
    marginBottom: 8,
  },
  unreadMessage: {
    color: VIP_COLORS.textSecondary,
  },
  readMessage: {
    color: VIP_COLORS.textTertiary,
  },
  footer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  date: {
    fontSize: 12,
    fontWeight: "500",
  },
  unreadDate: {
    color: VIP_COLORS.textSecondary,
  },
  readDate: {
    color: VIP_COLORS.textTertiary,
  },
  typeBadge: {
    backgroundColor: "rgba(255,255,255,0.1)",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  typeText: {
    fontSize: 10,
    color: VIP_COLORS.textTertiary,
    fontWeight: "600",
    letterSpacing: 0.5,
  },
  readIndicator: {
    justifyContent: "center",
    alignItems: "center",
    marginLeft: 8,
  },
});