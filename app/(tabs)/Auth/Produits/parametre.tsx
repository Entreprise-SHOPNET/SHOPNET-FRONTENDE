

import React, { useState, useRef, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Platform,
  StatusBar,
  SafeAreaView,
  Animated,
  ScrollView,
  Dimensions,
  Image,
  TextInput,
  Switch,
  ActivityIndicator,
} from "react-native";
import { useRouter } from "expo-router";
import {
  Ionicons,
  MaterialIcons,
  FontAwesome,
  Feather,
} from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";

const { width, height } = Dimensions.get("window");
const SHOPNET_BLUE = "#00182A";
const PRO_BLUE = "#42A5F5";
const PRO_GREEN = "#4CAF50";
const NOTIFICATION_RED = "#FF3B30";
const CARD_BG = "rgba(30, 42, 59, 0.9)";
const BORDER_COLOR = "rgba(66, 165, 245, 0.1)";

const BASE_URL = 'https://shopnet-backend.onrender.com';

// ========== TYPES ==========
type SettingsItem = {
  id: string;
  name: string;
  route: string;
  icon: string;
  badge?: number;
  iconFamily?: 'ionicons' | 'material' | 'fontawesome' | 'feather';
};

type SettingsSection = {
  id: string;
  title: string;
  items: SettingsItem[];
};

type UserData = {
  name: string;
  email: string;
  role: string;
  avatar: string;
  boutique: string;
  memberSince: string;
};

// ========== DATA ==========
const createSettingsData = (): SettingsSection[] => [
  {
    id: 'section-1',
    title: "Compte & Profil",
    items: [
      { id: 'item-1-1', name: "Mon profil", route: "/Auth/Produits/profil-edit", icon: "person-circle", badge: 0, iconFamily: 'ionicons' },
      { id: 'item-1-2', name: "Sécurité", route: "/MisAjour", icon: "shield-checkmark", badge: 0, iconFamily: 'ionicons' },
      { id: 'item-1-3', name: "Paiements", route: "/MisAjour", icon: "card-outline", badge: 3, iconFamily: 'ionicons' },
      { id: 'item-1-4', name: "Badge Pro", route: "/MisAjour", icon: "verified", badge: 0, iconFamily: 'material' },
    ],
  },
  {
    id: 'section-2',
    title: "Notifications & Communications",
    items: [
      { id: 'item-2-1', name: "Notifications", route: "/MisAjour", icon: "notifications", badge: 5, iconFamily: 'ionicons' },
      { id: 'item-2-2', name: "Messages", route: "/MisAjour", icon: "chatbubble", badge: 0, iconFamily: 'ionicons' },
      { id: 'item-2-3', name: "Alertes", route: "/MisAjour", icon: "alert-circle", badge: 0, iconFamily: 'ionicons' },
      { id: 'item-2-4', name: "Son & Vibration", route: "/MisAjour", icon: "volume-high", badge: 0, iconFamily: 'ionicons' },
    ],
  },
  {
    id: 'section-3',
    title: "Apparence & Préférences",
    items: [
      { id: 'item-3-1', name: "Thème", route: "/MisAjour", icon: "palette", badge: 0, iconFamily: 'ionicons' },
      { id: 'item-3-2', name: "Langue", route: "/MisAjour", icon: "language", badge: 0, iconFamily: 'ionicons' },
      { id: 'item-3-3', name: "Localisation", route: "/MisAjour", icon: "location", badge: 0, iconFamily: 'ionicons' },
      { id: 'item-3-4', name: "Affichage", route: "/MisAjour", icon: "desktop", badge: 0, iconFamily: 'fontawesome' },
    ],
  },
  {
    id: 'section-4',
    title: "Boutique & Produits",
    items: [
      { id: 'item-4-1', name: "Paramètres boutique", route: "/MisAjour", icon: "store", badge: 0, iconFamily: 'material' },
      { id: 'item-4-2', name: "Gestion produits", route: "/MisAjour", icon: "cube", badge: 9, iconFamily: 'ionicons' },
      { id: 'item-4-3', name: "Livraison", route: "/MisAjour", icon: "truck", badge: 0, iconFamily: 'fontawesome' },
      { id: 'item-4-4', name: "Promotions", route: "/MisAjour", icon: "pricetag", badge: 2, iconFamily: 'ionicons' },
    ],
  },
  {
    id: 'section-5',
    title: "Support & Aide",
    items: [
      { id: 'item-5-1', name: "Centre d'aide", route: "/MisAjour", icon: "help-circle", badge: 0, iconFamily: 'ionicons' },
      { id: 'item-5-2', name: "Signaler un problème", route: "/MisAjour", icon: "warning", badge: 0, iconFamily: 'material' },
      { id: 'item-5-3', name: "Nous contacter", route: "/MisAjour", icon: "mail", badge: 0, iconFamily: 'ionicons' },
      { id: 'item-5-4', name: "À propos", route: "/MisAjour", icon: "information-circle", badge: 0, iconFamily: 'ionicons' },
    ],
  },
  {
    id: 'section-6',
    title: "Confidentialité & Sécurité",
    items: [
      { id: 'item-6-1', name: "Vie privée", route: "/MisAjour", icon: "lock-closed", badge: 0, iconFamily: 'ionicons' },
      { id: 'item-6-2', name: "Sécurité avancée", route: "/MisAjour", icon: "shield", badge: 0, iconFamily: 'ionicons' },
      { id: 'item-6-3', name: "Historique", route: "/MisAjour", icon: "time", badge: 0, iconFamily: 'ionicons' },
      { id: 'item-6-4', name: "Autorisations", route: "/MisAjour", icon: "key", badge: 0, iconFamily: 'fontawesome' },
    ],
  },
];

// ========== COMPONENTS ==========
const IconRenderer = ({ item }: { item: SettingsItem }) => {
  const size = 22;
  const color = PRO_BLUE;

  switch (item.iconFamily) {
    case 'material':
      return <MaterialIcons name={item.icon as any} size={size} color={color} />;
    case 'fontawesome':
      return <FontAwesome name={item.icon as any} size={size} color={color} />;
    case 'feather':
      return <Feather name={item.icon as any} size={size} color={color} />;
    default:
      return <Ionicons name={item.icon as any} size={size} color={color} />;
  }
};

const SettingItemComponent = ({ 
  item, 
  onPress 
}: { 
  item: SettingsItem; 
  onPress: () => void 
}) => (
  <TouchableOpacity style={styles.settingItem} onPress={onPress}>
    <View style={styles.itemLeft}>
      <View style={styles.itemIconContainer}>
        <IconRenderer item={item} />
      </View>
      <Text style={styles.itemText}>{item.name}</Text>
    </View>
    <View style={styles.itemRight}>
      {item.badge && item.badge > 0 && (
        <View style={styles.itemBadge}>
          <Text style={styles.itemBadgeText}>{item.badge}</Text>
        </View>
      )}
      <Feather name="chevron-right" size={20} color={PRO_BLUE} />
    </View>
  </TouchableOpacity>
);

const QuickSettingItem = ({
  icon,
  label,
  subLabel,
  value,
  onValueChange
}: {
  icon: string;
  label: string;
  subLabel: string;
  value: boolean;
  onValueChange: (value: boolean) => void;
}) => (
  <View style={styles.quickSettingItem}>
    <View style={styles.quickSettingHeader}>
      <Ionicons name={icon as any} size={24} color={PRO_BLUE} />
      <Switch
        value={value}
        onValueChange={onValueChange}
        trackColor={{ false: "#3A4A5A", true: PRO_BLUE }}
        thumbColor="#FFFFFF"
      />
    </View>
    <Text style={styles.quickSettingText}>{label}</Text>
    <Text style={styles.quickSettingSubText}>{subLabel}</Text>
  </View>
);

const InfoItem = ({
  icon,
  title,
  value
}: {
  icon: string;
  title: string;
  value: string;
}) => (
  <View style={styles.infoItem}>
    <Ionicons name={icon as any} size={20} color={PRO_BLUE} />
    <View style={styles.infoTextContainer}>
      <Text style={styles.infoTitle}>{title}</Text>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
  </View>
);

// ========== MAIN COMPONENT ==========
const SettingsScreen = () => {
  const router = useRouter();
  const scrollY = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;

  const [userData, setUserData] = useState<UserData>({
    name: "SHOPNET Pro",
    email: "entreprise@shopnet.com",
    role: "Vendeur Premium",
    avatar: "https://res.cloudinary.com/dddr7gb6w/image/upload/v1754689052/shopnet/product_1754689050822_5996.jpg",
    boutique: "SHOPNET Official",
    memberSince: "2023",
  });

  const [searchText, setSearchText] = useState("");
  const [searchResults, setSearchResults] = useState<SettingsItem[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [loading, setLoading] = useState(false);
  const [settingsSections] = useState<SettingsSection[]>(createSettingsData());
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [darkModeEnabled, setDarkModeEnabled] = useState(true);
  const [locationEnabled, setLocationEnabled] = useState(true);
  const [advancedSecurityEnabled, setAdvancedSecurityEnabled] = useState(false);

  // Animation au chargement
  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 600,
        useNativeDriver: true,
      }),
    ]).start();

    fetchUserData();
  }, []);

  const fetchUserData = async () => {
    try {
      setLoading(true);
      const token = await AsyncStorage.getItem("userToken");
      if (!token) {
        router.push("/splash");
        return;
      }

      const response = await axios.get(`${BASE_URL}/api/user/profile`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.data.success) {
        const user = response.data.user;
        setUserData({
          name: user.fullName || "SHOPNET Pro",
          email: user.email || "entreprise@shopnet.com",
          role: "Vendeur Premium",
          avatar: user.profile_photo || "https://res.cloudinary.com/dddr7gb6w/image/upload/v1754689052/shopnet/product_1754689050822_5996.jpg",
          boutique: "SHOPNET Official",
          memberSince: user.date_inscription ? new Date(user.date_inscription).getFullYear().toString() : "2023",
        });
      }
    } catch (error) {
      console.error("Erreur de chargement des données utilisateur", error);
      Alert.alert("Erreur", "Impossible de charger les données du profil");
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (text: string) => {
    setSearchText(text);
    if (text.length > 0) {
      setIsSearching(true);
      const results: SettingsItem[] = [];

      settingsSections.forEach((section) => {
        section.items.forEach((item) => {
          if (item.name.toLowerCase().includes(text.toLowerCase())) {
            results.push(item);
          }
        });
      });

      setSearchResults(results);
    } else {
      setIsSearching(false);
      setSearchResults([]);
    }
  };

  const handleLogout = async () => {
    Alert.alert(
      "Déconnexion",
      "Êtes-vous sûr de vouloir vous déconnecter ?",
      [
        { text: "Annuler", style: "cancel" },
        {
          text: "Déconnexion",
          onPress: async () => {
            try {
              await AsyncStorage.removeItem("userToken");
              router.push("/splash");
            } catch (error) {
              Alert.alert("Erreur", "Échec de la déconnexion");
            }
          },
        },
      ]
    );
  };

  const handleSaveSettings = async () => {
    try {
      setLoading(true);
      const token = await AsyncStorage.getItem("userToken");
      
      const settingsData = {
        notifications_enabled: notificationsEnabled,
        dark_mode: darkModeEnabled,
        location_enabled: locationEnabled,
        advanced_security: advancedSecurityEnabled,
        updated_at: new Date().toISOString(),
      };

      await axios.post(
        `${BASE_URL}/api/user/settings`,
        settingsData,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      Alert.alert("Succès", "Paramètres sauvegardés avec succès");
    } catch (error) {
      console.error("Erreur sauvegarde paramètres:", error);
      Alert.alert("Erreur", "Impossible de sauvegarder les paramètres");
    } finally {
      setLoading(false);
    }
  };

  const handleSyncData = async () => {
    try {
      setLoading(true);
      const token = await AsyncStorage.getItem("userToken");
      
      await axios.post(
        `${BASE_URL}/api/user/sync`,
        {},
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      await fetchUserData();
      
      Alert.alert("Succès", "Données synchronisées avec succès");
    } catch (error) {
      console.error("Erreur synchronisation:", error);
      Alert.alert("Erreur", "Impossible de synchroniser les données");
    } finally {
      setLoading(false);
    }
  };

  const headerHeight = scrollY.interpolate({
    inputRange: [0, 100],
    outputRange: [220, 120],
    extrapolate: "clamp",
  });

  const headerOpacity = scrollY.interpolate({
    inputRange: [0, 100],
    outputRange: [1, 0.8],
    extrapolate: "clamp",
  });

  if (loading && !userData.name) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={PRO_BLUE} />
        <Text style={styles.loadingText}>Chargement des paramètres...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Header avec effet de parallax */}
      <Animated.View
        style={[
          styles.headerContainer,
          {
            height: headerHeight,
            opacity: headerOpacity,
          },
        ]}
      >
        <View style={styles.headerBackground}>
          <View style={styles.glowCircle1} />
          <View style={styles.glowCircle2} />
        </View>

        <View style={styles.headerContent}>
          <View style={styles.headerTop}>
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => router.back()}
            >
              <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Paramètres Pro</Text>
            <TouchableOpacity
              style={styles.syncButton}
              onPress={handleSyncData}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator size="small" color={PRO_BLUE} />
              ) : (
                <Ionicons name="sync" size={24} color={PRO_BLUE} />
              )}
            </TouchableOpacity>
          </View>

          <View style={styles.userInfoCard}>
            <TouchableOpacity onPress={() => router.push("/Auth/Produits/profil-edit")}>
              <Image source={{ uri: userData.avatar }} style={styles.userAvatar} />
              <View style={styles.editAvatarBadge}>
                <Ionicons name="camera" size={12} color="#FFFFFF" />
              </View>
            </TouchableOpacity>
            <View style={styles.userInfo}>
              <Text style={styles.userName}>{userData.name}</Text>
              <Text style={styles.userEmail}>{userData.email}</Text>
              <View style={styles.userRoleContainer}>
                <Text style={styles.userRole}>{userData.role}</Text>
                <View style={styles.verifiedBadge}>
                  <Ionicons name="checkmark-circle" size={12} color={PRO_BLUE} />
                </View>
              </View>
              <View style={styles.userSinceContainer}>
                <Ionicons name="calendar" size={12} color={PRO_BLUE} />
                <Text style={styles.userSince}>Membre depuis {userData.memberSince}</Text>
              </View>
            </View>
          </View>
        </View>
      </Animated.View>

      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.contentContainer}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
          { useNativeDriver: false }
        )}
        scrollEventThrottle={16}
        showsVerticalScrollIndicator={false}
      >
        {/* Barre de recherche */}
        <Animated.View
          style={[
            styles.searchContainer,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }],
            },
          ]}
        >
          <Ionicons name="search" size={20} color={PRO_BLUE} style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Rechercher un paramètre..."
            placeholderTextColor="#A0AEC0"
            value={searchText}
            onChangeText={handleSearch}
          />
          {searchText.length > 0 && (
            <TouchableOpacity
              style={styles.clearButton}
              onPress={() => {
                setSearchText("");
                setIsSearching(false);
                setSearchResults([]);
              }}
            >
              <Ionicons name="close-circle" size={20} color={NOTIFICATION_RED} />
            </TouchableOpacity>
          )}
        </Animated.View>

        {/* Section des réglages rapides */}
        <Animated.View
          style={[
            styles.quickSettingsSection,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }],
            },
          ]}
        >
          <Text style={styles.sectionTitle}>Réglages rapides</Text>
          <View style={styles.quickSettingsGrid}>
            <QuickSettingItem
              icon="notifications"
              label="Notifications"
              subLabel="Activer/Désactiver"
              value={notificationsEnabled}
              onValueChange={setNotificationsEnabled}
            />
            <QuickSettingItem
              icon="moon"
              label="Mode sombre"
              subLabel="Thème Shopnet"
              value={darkModeEnabled}
              onValueChange={setDarkModeEnabled}
            />
            <QuickSettingItem
              icon="location"
              label="Localisation"
              subLabel="Partager ma position"
              value={locationEnabled}
              onValueChange={setLocationEnabled}
            />
            <QuickSettingItem
              icon="shield-checkmark"
              label="Sécurité avancée"
              subLabel="Protection renforcée"
              value={advancedSecurityEnabled}
              onValueChange={setAdvancedSecurityEnabled}
            />
          </View>

          <TouchableOpacity
            style={styles.saveSettingsButton}
            onPress={handleSaveSettings}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <View style={styles.saveSettingsContent}>
                <Ionicons name="save" size={20} color="#FFFFFF" />
                <Text style={styles.saveSettingsText}>Sauvegarder les réglages</Text>
              </View>
            )}
          </TouchableOpacity>
        </Animated.View>

        {/* Résultats de recherche */}
        {isSearching ? (
          <Animated.View
            style={[
              styles.section,
              {
                opacity: fadeAnim,
                transform: [{ translateY: slideAnim }],
              },
            ]}
          >
            <Text style={styles.sectionTitle}>
              Résultats pour "{searchText}"
            </Text>
            <View style={styles.sectionContent}>
              {searchResults.length > 0 ? (
                searchResults.map((item) => (
                  <SettingItemComponent
                    key={item.id}
                    item={item}
                    onPress={() => router.push(item.route)}
                  />
                ))
              ) : (
                <View style={styles.noResultsContainer}>
                  <Ionicons name="search-outline" size={48} color={PRO_BLUE} />
                  <Text style={styles.noResultsText}>Aucun paramètre trouvé</Text>
                  <Text style={styles.noResultsSubText}>
                    Essayez avec d'autres mots-clés
                  </Text>
                </View>
              )}
            </View>
          </Animated.View>
        ) : (
          /* Sections de paramètres */
          settingsSections.map((section) => (
            <Animated.View
              key={section.id}
              style={[
                styles.section,
                {
                  opacity: fadeAnim,
                  transform: [{ translateY: slideAnim }],
                },
              ]}
            >
              <Text style={styles.sectionTitle}>{section.title}</Text>
              <View style={styles.sectionContent}>
                {section.items.map((item) => (
                  <SettingItemComponent
                    key={item.id}
                    item={item}
                    onPress={() => router.push(item.route)}
                  />
                ))}
              </View>
            </Animated.View>
          ))
        )}

        {/* Section informations */}
        <Animated.View
          style={[
            styles.infoSection,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }],
            },
          ]}
        >
          <InfoItem
            icon="information-circle"
            title="Version de l'application"
            value="Shopnet Pro 2.5.1"
          />
          <InfoItem
            icon="phone-portrait"
            title="Appareil"
            value="React Native / Expo"
          />
          <InfoItem
            icon="cloud"
            title="Dernière synchronisation"
            value="À l'instant"
          />
        </Animated.View>

        {/* Bouton déconnexion */}
        <TouchableOpacity
          style={styles.logoutButton}
          onPress={handleLogout}
          disabled={loading}
        >
          <View style={styles.logoutContent}>
            <MaterialIcons name="logout" size={22} color={NOTIFICATION_RED} />
            <Text style={styles.logoutText}>Déconnexion</Text>
          </View>
        </TouchableOpacity>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>© 2026 Shopnet Pro. Tous droits réservés.</Text>
          <Text style={styles.footerSubText}>Version 2.5.1 • Build 2412</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

// ========== STYLES ==========
const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: SHOPNET_BLUE,
    paddingTop: Platform.OS === "android" ? StatusBar.currentHeight || 0 : 0,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: SHOPNET_BLUE,
  },
  loadingText: {
    color: PRO_BLUE,
    fontSize: 16,
    marginTop: 12,
    fontWeight: "600",
  },
  headerContainer: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
    backgroundColor: SHOPNET_BLUE,
    overflow: "hidden",
  },
  headerBackground: {
    ...StyleSheet.absoluteFillObject,
  },
  glowCircle1: {
    position: "absolute",
    top: -50,
    right: -50,
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: "rgba(66, 165, 245, 0.03)",
  },
  glowCircle2: {
    position: "absolute",
    bottom: -50,
    left: -50,
    width: 150,
    height: 150,
    borderRadius: 75,
    backgroundColor: "rgba(66, 165, 245, 0.02)",
  },
  headerContent: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 10,
    justifyContent: "space-between",
  },
  headerTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: 10,
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: "#FFFFFF",
    letterSpacing: 0.5,
  },
  syncButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: CARD_BG,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: BORDER_COLOR,
  },
  userInfoCard: {
    flexDirection: "row",
    alignItems: "center",
    paddingBottom: 20,
  },
  userAvatar: {
    width: 70,
    height: 70,
    borderRadius: 35,
    borderWidth: 3,
    borderColor: PRO_BLUE,
  },
  editAvatarBadge: {
    position: "absolute",
    bottom: 0,
    right: 0,
    backgroundColor: PRO_BLUE,
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: SHOPNET_BLUE,
  },
  userInfo: {
    flex: 1,
    marginLeft: 16,
  },
  userName: {
    fontSize: 22,
    fontWeight: "800",
    color: "#FFFFFF",
    marginBottom: 4,
  },
  userEmail: {
    fontSize: 14,
    color: PRO_BLUE,
    marginBottom: 6,
  },
  userRoleContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 6,
  },
  userRole: {
    fontSize: 13,
    color: "#A0AEC0",
    fontWeight: "600",
  },
  verifiedBadge: {
    marginLeft: 4,
  },
  userSinceContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  userSince: {
    fontSize: 12,
    color: "#A0AEC0",
    marginLeft: 4,
  },
  container: {
    flex: 1,
    backgroundColor: "transparent",
  },
  contentContainer: {
    paddingTop: 220,
    paddingBottom: 40,
  },
  searchContainer: {
    backgroundColor: CARD_BG,
    borderRadius: 16,
    marginHorizontal: 20,
    marginBottom: 20,
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: BORDER_COLOR,
  },
  searchIcon: {
    marginRight: 12,
  },
  searchInput: {
    flex: 1,
    color: "#FFFFFF",
    fontSize: 16,
    padding: 0,
  },
  clearButton: {
    padding: 4,
  },
  quickSettingsSection: {
    backgroundColor: CARD_BG,
    borderRadius: 16,
    marginHorizontal: 20,
    marginBottom: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: BORDER_COLOR,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#FFFFFF",
    marginBottom: 16,
    letterSpacing: 0.5,
  },
  quickSettingsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },
  quickSettingItem: {
    width: "48%",
    backgroundColor: "rgba(26, 38, 51, 0.8)",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  quickSettingHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  quickSettingText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 4,
  },
  quickSettingSubText: {
    color: "#A0AEC0",
    fontSize: 12,
  },
  saveSettingsButton: {
    backgroundColor: PRO_BLUE,
    borderRadius: 12,
    padding: 16,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 12,
  },
  saveSettingsContent: {
    flexDirection: "row",
    alignItems: "center",
  },
  saveSettingsText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
    marginLeft: 8,
  },
  section: {
    backgroundColor: CARD_BG,
    borderRadius: 16,
    marginHorizontal: 20,
    marginBottom: 16,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: BORDER_COLOR,
  },
  sectionContent: {
    paddingHorizontal: 8,
  },
  settingItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 18,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(66, 165, 245, 0.05)",
  },
  itemLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  itemIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(66, 165, 245, 0.1)",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  itemText: {
    fontSize: 16,
    color: "#E2E8F0",
    fontWeight: "500",
    flex: 1,
  },
  itemRight: {
    flexDirection: "row",
    alignItems: "center",
  },
  itemBadge: {
    backgroundColor: NOTIFICATION_RED,
    minWidth: 22,
    height: 22,
    borderRadius: 11,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  itemBadgeText: {
    color: "#FFFFFF",
    fontSize: 11,
    fontWeight: "bold",
    paddingHorizontal: 4,
  },
  noResultsContainer: {
    alignItems: "center",
    paddingVertical: 40,
    paddingHorizontal: 20,
  },
  noResultsText: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "700",
    marginTop: 16,
    marginBottom: 8,
    textAlign: "center",
  },
  noResultsSubText: {
    color: "#A0AEC0",
    fontSize: 14,
    textAlign: "center",
  },
  infoSection: {
    backgroundColor: CARD_BG,
    borderRadius: 16,
    marginHorizontal: 20,
    marginBottom: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: BORDER_COLOR,
  },
  infoItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
  },
  infoTextContainer: {
    flex: 1,
    marginLeft: 16,
  },
  infoTitle: {
    color: "#A0AEC0",
    fontSize: 14,
    marginBottom: 2,
  },
  infoValue: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "600",
  },
  logoutButton: {
    backgroundColor: CARD_BG,
    borderRadius: 16,
    padding: 20,
    justifyContent: "center",
    alignItems: "center",
    marginHorizontal: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: "rgba(255, 107, 107, 0.2)",
  },
  logoutContent: {
    flexDirection: "row",
    alignItems: "center",
  },
  logoutText: {
    color: NOTIFICATION_RED,
    fontSize: 17,
    fontWeight: "700",
    marginLeft: 12,
  },
  footer: {
    alignItems: "center",
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: BORDER_COLOR,
    marginHorizontal: 20,
  },
  footerText: {
    color: "#A0AEC0",
    fontSize: 12,
    textAlign: "center",
    marginBottom: 4,
  },
  footerSubText: {
    color: "#718096",
    fontSize: 11,
    textAlign: "center",
  },
});

export default SettingsScreen;