

import React from "react";
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity,
  Dimensions,
  SafeAreaView,
  StatusBar 
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons, MaterialCommunityIcons, FontAwesome5 } from "@expo/vector-icons";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

// Couleurs Pro VIP ShopNet
const VIP_COLORS = {
  primary: "#00182A",      // Bleu ShopNet foncé
  secondary: "#4DB14E",    // Vert ShopNet
  accent: "#8B5CF6",       // Violet premium
  gold: "#FFD700",         // Or pour les badges VIP
  background: "#0F172A",   // Fond sombre élégant
  surface: "#1E293B",      // Surface élevée
  surfaceLight: "#334155", // Surface légère
  text: "#FFFFFF",
  textSecondary: "rgba(255,255,255,0.7)",
  textTertiary: "rgba(255,255,255,0.5)",
  border: "rgba(255,255,255,0.1)",
  success: "#10B981",
  warning: "#F59E0B",
  error: "#EF4444",
};

interface NotificationDetailParams {
  id: string;
  titre: string;
  contenu: string;
  date_notification: string;
  type?: string;
  priorite?: string;
  lien?: string;
  read?: string;
}

export default function NotificationDetailScreen() {
  const { 
    id, 
    titre, 
    contenu, 
    date_notification, 
    type, 
    priorite, 
    lien, 
    read 
  } = useLocalSearchParams<NotificationDetailParams>();
  
  const router = useRouter();

  const getPriorityIcon = (priorite?: string) => {
    switch (priorite) {
      case "haute":
        return <Ionicons name="warning" size={20} color={VIP_COLORS.error} />;
      case "moyenne":
        return <Ionicons name="information-circle" size={20} color={VIP_COLORS.warning} />;
      case "basse":
        return <Ionicons name="checkmark-circle" size={20} color={VIP_COLORS.success} />;
      default:
        return <Ionicons name="notifications" size={20} color={VIP_COLORS.accent} />;
    }
  };

  const getTypeIcon = (type?: string) => {
    switch (type) {
      case "commande":
        return <MaterialCommunityIcons name="package-variant" size={24} color={VIP_COLORS.secondary} />;
      case "promotion":
        return <Ionicons name="pricetag" size={22} color={VIP_COLORS.gold} />;
      case "systeme":
        return <Ionicons name="settings" size={22} color={VIP_COLORS.accent} />;
      case "securite":
        return <Ionicons name="shield-checkmark" size={22} color={VIP_COLORS.success} />;
      default:
        return <Ionicons name="notifications" size={22} color={VIP_COLORS.textSecondary} />;
    }
  };

  const getPriorityConfig = (priorite?: string) => {
    const config = {
      haute: { color: VIP_COLORS.error, bgColor: "rgba(239, 68, 68, 0.1)", label: "URGENT" },
      moyenne: { color: VIP_COLORS.warning, bgColor: "rgba(245, 158, 11, 0.1)", label: "IMPORTANT" },
      basse: { color: VIP_COLORS.success, bgColor: "rgba(16, 185, 129, 0.1)", label: "INFO" }
    };
    
    return config[priorite as keyof typeof config] || config.basse;
  };

  const getTypeConfig = (type?: string) => {
    const config = {
      commande: { color: VIP_COLORS.secondary, label: "COMMANDE" },
      promotion: { color: VIP_COLORS.gold, label: "PROMOTION" },
      systeme: { color: VIP_COLORS.accent, label: "SYSTÈME" },
      securite: { color: VIP_COLORS.success, label: "SÉCURITÉ" }
    };
    
    return config[type as keyof typeof config] || { color: VIP_COLORS.textSecondary, label: type?.toUpperCase() || "GÉNÉRAL" };
  };

  const priorityConfig = getPriorityConfig(priorite);
  const typeConfig = getTypeConfig(type);

  // Boutons de navigation rapide
  const quickActions = [
    {
      id: 1,
      title: "Mes Commandes",
      icon: "cart-outline",
      route: "/(tabs)/Auth/Panier/VendeurNotifications", // ← chemin relatif correct
      color: VIP_COLORS.secondary
    },

    {
      id: 2,
      title: "Ma Boutique",
      icon: "storefront-outline",
      route: "/(tabs)/Auth/Boutique/Boutique", // ← chemin relatif correct
      color: VIP_COLORS.accent
    },

    {
      id: 3,
      title: "Mon Profil",
      icon: "person-outline",
      route: "/(tabs)/Auth/Produits/profil-debug", // ← chemin relatif correct
      color: VIP_COLORS.gold
    },

    {
      id: 4,
      title: "Support",
      icon: "headset-outline",
      route: "/MisAjour", // ← chemin relatif correct
      color: VIP_COLORS.success
    },

  ];

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={VIP_COLORS.primary} />
      
      {/* Header Pro VIP */}
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Ionicons name="arrow-back" size={24} color={VIP_COLORS.text} />
        </TouchableOpacity>
        
        <View style={styles.headerTitleContainer}>
          <Text style={styles.headerTitle}>Détail Notification</Text>
          <View style={styles.vipBadge}>
            <Ionicons name="diamond" size={12} color={VIP_COLORS.gold} />
            <Text style={styles.vipText}>PRO VIP</Text>
          </View>
        </View>
        
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView 
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Carte principale de la notification */}
        <View style={styles.notificationCard}>
          {/* En-tête avec icône et badges */}
          <View style={styles.cardHeader}>
            <View style={styles.typeIconContainer}>
              {getTypeIcon(type)}
            </View>
            
            <View style={styles.badgesContainer}>
              <View style={[styles.priorityBadge, { backgroundColor: priorityConfig.bgColor }]}>
                {getPriorityIcon(priorite)}
                <Text style={[styles.priorityText, { color: priorityConfig.color }]}>
                  {priorityConfig.label}
                </Text>
              </View>
              
              <View style={[styles.typeBadge, { backgroundColor: `rgba(${parseInt(typeConfig.color.slice(1, 3), 16)}, ${parseInt(typeConfig.color.slice(3, 5), 16)}, ${parseInt(typeConfig.color.slice(5, 7), 16)}, 0.1)` }]}>
                <Text style={[styles.typeText, { color: typeConfig.color }]}>
                  {typeConfig.label}
                </Text>
              </View>
            </View>
          </View>

          {/* Titre et date */}
          <Text style={styles.title}>{titre}</Text>
          
          <View style={styles.metaContainer}>
            <View style={styles.dateContainer}>
              <Ionicons name="time-outline" size={16} color={VIP_COLORS.textTertiary} />
              <Text style={styles.date}>
                {date_notification ? new Date(date_notification).toLocaleString('fr-FR', {
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                }) : "Date non disponible"}
              </Text>
            </View>
            
            {read === "true" && (
              <View style={styles.readBadge}>
                <Ionicons name="checkmark-done" size={14} color={VIP_COLORS.success} />
                <Text style={styles.readText}>LU</Text>
              </View>
            )}
          </View>

          {/* Contenu */}
          <View style={styles.contentCard}>
            <Text style={styles.contentLabel}>Message :</Text>
            <Text style={styles.content}>{contenu}</Text>
          </View>

          {/* Lien si disponible */}
          {lien && (
            <View style={styles.linkCard}>
              <Ionicons name="link-outline" size={18} color={VIP_COLORS.accent} />
              <Text style={styles.linkLabel}>Lien associé :</Text>
              <Text style={styles.link} numberOfLines={1}>{lien}</Text>
            </View>
          )}

          {/* ID de la notification */}
          <View style={styles.idContainer}>
            <Text style={styles.idLabel}>ID Notification :</Text>
            <Text style={styles.idValue}>#{id}</Text>
          </View>
        </View>

        {/* Actions rapides */}
        <View style={styles.quickActionsSection}>
          <Text style={styles.sectionTitle}>Accès Rapide</Text>
          <Text style={styles.sectionSubtitle}>
            Naviguez rapidement vers d'autres sections de l'application
          </Text>
          
          <View style={styles.quickActionsGrid}>
            {quickActions.map((action) => (
              <TouchableOpacity
                key={action.id}
                style={styles.quickActionButton}
                onPress={() => router.push(action.route as any)}
              >
                <View style={[styles.actionIcon, { backgroundColor: `${action.color}20` }]}>
                  <Ionicons name={action.icon as any} size={24} color={action.color} />
                </View>
                <Text style={styles.actionTitle}>{action.title}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Actions supplémentaires */}
        <View style={styles.actionsSection}>
          <TouchableOpacity 
            style={styles.primaryButton}
            onPress={() => router.push("/(tabs)/Auth/Notification/NotificationsUser")}
          >
            <Ionicons name="notifications-outline" size={20} color="#FFFFFF" />
            <Text style={styles.primaryButtonText}>Retour aux notifications</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.secondaryButton}
            onPress={() => router.push("/(tabs)/Auth/Boutique/Boutique")}
          >
            <FontAwesome5 name="store" size={16} color={VIP_COLORS.text} />
            <Text style={styles.secondaryButtonText}>Voir ma boutique</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: VIP_COLORS.background,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 20,
    backgroundColor: VIP_COLORS.surface,
    borderBottomWidth: 1,
    borderBottomColor: VIP_COLORS.border,
  },
  backButton: {
    padding: 8,
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.1)",
  },
  headerTitleContainer: {
    alignItems: "center",
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: VIP_COLORS.text,
    marginBottom: 4,
  },
  vipBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255, 215, 0, 0.15)",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  vipText: {
    fontSize: 10,
    fontWeight: "800",
    color: VIP_COLORS.gold,
    marginLeft: 4,
    letterSpacing: 0.5,
  },
  headerSpacer: {
    width: 40,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  notificationCard: {
    backgroundColor: VIP_COLORS.surface,
    borderRadius: 20,
    padding: 24,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: VIP_COLORS.border,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 20,
  },
  typeIconContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "rgba(255,255,255,0.1)",
    justifyContent: "center",
    alignItems: "center",
  },
  badgesContainer: {
    alignItems: "flex-end",
    gap: 8,
  },
  priorityBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    gap: 6,
  },
  priorityText: {
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 0.5,
  },
  typeBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  typeText: {
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 0.5,
  },
  title: {
    fontSize: 24,
    fontWeight: "800",
    color: VIP_COLORS.text,
    marginBottom: 16,
    lineHeight: 32,
  },
  metaContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 24,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: VIP_COLORS.border,
  },
  dateContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  date: {
    fontSize: 14,
    color: VIP_COLORS.textTertiary,
    fontWeight: "500",
  },
  readBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(16, 185, 129, 0.1)",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    gap: 4,
  },
  readText: {
    fontSize: 10,
    color: VIP_COLORS.success,
    fontWeight: "700",
    letterSpacing: 0.5,
  },
  contentCard: {
    backgroundColor: "rgba(255,255,255,0.05)",
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
  },
  contentLabel: {
    fontSize: 14,
    fontWeight: "700",
    color: VIP_COLORS.textSecondary,
    marginBottom: 8,
  },
  content: {
    fontSize: 16,
    color: VIP_COLORS.text,
    lineHeight: 24,
    fontWeight: "500",
  },
  linkCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(139, 92, 246, 0.1)",
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    gap: 12,
  },
  linkLabel: {
    fontSize: 14,
    fontWeight: "700",
    color: VIP_COLORS.text,
  },
  link: {
    fontSize: 14,
    color: VIP_COLORS.accent,
    fontWeight: "500",
    flex: 1,
  },
  idContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: VIP_COLORS.border,
  },
  idLabel: {
    fontSize: 14,
    color: VIP_COLORS.textTertiary,
    fontWeight: "500",
  },
  idValue: {
    fontSize: 14,
    color: VIP_COLORS.text,
    fontWeight: "700",
  },
  quickActionsSection: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: VIP_COLORS.text,
    marginBottom: 8,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: VIP_COLORS.textSecondary,
    marginBottom: 20,
    lineHeight: 20,
  },
  quickActionsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  quickActionButton: {
    width: (SCREEN_WIDTH - 64) / 2,
    backgroundColor: VIP_COLORS.surface,
    borderRadius: 16,
    padding: 16,
    alignItems: "center",
    borderWidth: 1,
    borderColor: VIP_COLORS.border,
  },
  actionIcon: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 8,
  },
  actionTitle: {
    fontSize: 12,
    fontWeight: "600",
    color: VIP_COLORS.text,
    textAlign: "center",
  },
  actionsSection: {
    gap: 12,
  },
  primaryButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: VIP_COLORS.accent,
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 24,
    gap: 8,
  },
  primaryButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
  },
  secondaryButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.1)",
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 24,
    gap: 8,
    borderWidth: 1,
    borderColor: VIP_COLORS.border,
  },
  secondaryButtonText: {
    color: VIP_COLORS.text,
    fontSize: 16,
    fontWeight: "600",
  },
});