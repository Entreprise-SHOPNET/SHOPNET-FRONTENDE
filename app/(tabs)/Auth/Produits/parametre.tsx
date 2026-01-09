

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

// Types
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

// Données de configuration
const settingsData: SettingsSection[] = [
  {
    id: '1',
    title: "Compte & Profil",
    items: [
      { id: '1-1', name: "Mon profil", route: "/Auth/Produits/profil-edit", icon: "person-circle", badge: 0, iconFamily: 'ionicons' },
      { id: '1-2', name: "Sécurité", route: "/MisAjour", icon: "shield-checkmark", badge: 0, iconFamily: 'ionicons' },
      { id: '1-3', name: "Paiements", route: "/MisAjour", icon: "card-outline", badge: 3, iconFamily: 'ionicons' },
      { id: '1-4', name: "Badge Pro", route: "/MisAjour", icon: "verified", badge: 0, iconFamily: 'material' },
    ],
  },
  {
    id: '2',
    title: "Notifications & Communications",
    items: [
      { id: '2-1', name: "Notifications", route: "/MisAjour", icon: "notifications", badge: 5, iconFamily: 'ionicons' },
      { id: '2-2', name: "Messages", route: "/MisAjour", icon: "chatbubble", badge: 0, iconFamily: 'ionicons' },
      { id: '2-3', name: "Alertes", route: "/MisAjour", icon: "alert-circle", badge: 0, iconFamily: 'ionicons' },
      { id: '2-4', name: "Son & Vibration", route: "/MisAjour", icon: "volume-high", badge: 0, iconFamily: 'ionicons' },
    ],
  },
  {
    id: '3',
    title: "Apparence & Préférences",
    items: [
      { id: '3-1', name: "Thème", route: "/MisAjour", icon: "palette", badge: 0, iconFamily: 'ionicons' },
      { id: '3-2', name: "Langue", route: "/MisAjour", icon: "language", badge: 0, iconFamily: 'ionicons' },
      { id: '3-3', name: "Localisation", route: "/MisAjour", icon: "location", badge: 0, iconFamily: 'ionicons' },
      { id: '3-4', name: "Affichage", route: "/MisAjour", icon: "desktop", badge: 0, iconFamily: 'fontawesome' },
    ],
  },
  {
    id: '4',
    title: "Boutique & Produits",
    items: [
      { id: '4-1', name: "Paramètres boutique", route: "/MisAjour", icon: "store", badge: 0, iconFamily: 'material' },
      { id: '4-2', name: "Gestion produits", route: "/MisAjour", icon: "cube", badge: 9, iconFamily: 'ionicons' },
      { id: '4-3', name: "Livraison", route: "/MisAjour", icon: "truck", badge: 0, iconFamily: 'fontawesome' },
      { id: '4-4', name: "Promotions", route: "/MisAjour", icon: "pricetag", badge: 2, iconFamily: 'ionicons' },
    ],
  },
  {
    id: '5',
    title: "Support & Aide",
    items: [
      { id: '5-1', name: "Centre d'aide", route: "/MisAjour", icon: "help-circle", badge: 0, iconFamily: 'ionicons' },
      { id: '5-2', name: "Signaler un problème", route: "/MisAjour", icon: "warning", badge: 0, iconFamily: 'material' },
      { id: '5-3', name: "Nous contacter", route: "/MisAjour", icon: "mail", badge: 0, iconFamily: 'ionicons' },
      { id: '5-4', name: "À propos", route: "/MisAjour", icon: "information-circle", badge: 0, iconFamily: 'ionicons' },
    ],
  },
  {
    id: '6',
    title: "Confidentialité & Sécurité",
    items: [
      { id: '6-1', name: "Vie privée", route: "/MisAjour", icon: "lock-closed", badge: 0, iconFamily: 'ionicons' },
      { id: '6-2', name: "Sécurité avancée", route: "/MisAjour", icon: "shield", badge: 0, iconFamily: 'ionicons' },
      { id: '6-3', name: "Historique", route: "/MisAjour", icon: "time", badge: 0, iconFamily: 'ionicons' },
      { id: '6-4', name: "Autorisations", route: "/MisAjour", icon: "key", badge: 0, iconFamily: 'fontawesome' },
    ],
  },
];

// Composants réutilisables
const SettingIcon = ({ item }: { item: SettingsItem }) => {
  const iconProps = { size: 22, color: PRO_BLUE };
  
  if (item.iconFamily === 'material') {
    return <MaterialIcons name={item.icon as any} {...iconProps} />;
  }
  if (item.iconFamily === 'fontawesome') {
    return <FontAwesome name={item.icon as any} {...iconProps} />;
  }
  if (item.iconFamily === 'feather') {
    return <Feather name={item.icon as any} {...iconProps} />;
  }
  return <Ionicons name={item.icon as any} {...iconProps} />;
};

const SettingRow = ({ item, onPress }: { item: SettingsItem; onPress: () => void }) => (
  <TouchableOpacity style={styles.settingRow} onPress={onPress}>
    <View style={styles.settingRowLeft}>
      <View style={styles.iconContainer}>
        <SettingIcon item={item} />
      </View>
      <Text style={styles.settingName}>{item.name}</Text>
    </View>
    <View style={styles.settingRowRight}>
      {item.badge && item.badge > 0 ? (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{item.badge}</Text>
        </View>
      ) : null}
      <Feather name="chevron-right" size={20} color={PRO_BLUE} />
    </View>
  </TouchableOpacity>
);

const QuickSetting = ({
  iconName,
  title,
  description,
  value,
  onValueChange
}: {
  iconName: string;
  title: string;
  description: string;
  value: boolean;
  onValueChange: (value: boolean) => void;
}) => (
  <View style={styles.quickSettingCard}>
    <View style={styles.quickSettingHeader}>
      <Ionicons name={iconName as any} size={24} color={PRO_BLUE} />
      <Switch
        value={value}
        onValueChange={onValueChange}
        trackColor={{ false: "#3A4A5A", true: PRO_BLUE }}
        thumbColor="#FFFFFF"
      />
    </View>
    <Text style={styles.quickSettingTitle}>{title}</Text>
    <Text style={styles.quickSettingDescription}>{description}</Text>
  </View>
);

const InfoRow = ({ iconName, label, value }: { iconName: string; label: string; value: string }) => (
  <View style={styles.infoRow}>
    <Ionicons name={iconName as any} size={20} color={PRO_BLUE} />
    <View style={styles.infoContent}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
  </View>
);

// Composant principal
const SettingsScreen = () => {
  const router = useRouter();
  
  const [userData, setUserData] = useState({
    name: "SHOPNET Pro",
    email: "entreprise@shopnet.com",
    role: "Vendeur Premium",
    avatar: "https://res.cloudinary.com/dddr7gb6w/image/upload/v1754689052/shopnet/product_1754689050822_5996.jpg",
    boutique: "SHOPNET Official",
    memberSince: "2023",
  });

  const [searchText, setSearchText] = useState("");
  const [loading, setLoading] = useState(false);
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [darkModeEnabled, setDarkModeEnabled] = useState(true);
  const [locationEnabled, setLocationEnabled] = useState(true);
  const [advancedSecurityEnabled, setAdvancedSecurityEnabled] = useState(false);

  useEffect(() => {
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
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Paramètres Pro</Text>
          <TouchableOpacity style={styles.syncButton} onPress={handleSyncData} disabled={loading}>
            {loading ? (
              <ActivityIndicator size="small" color={PRO_BLUE} />
            ) : (
              <Ionicons name="sync" size={24} color={PRO_BLUE} />
            )}
          </TouchableOpacity>
        </View>

        <View style={styles.profileCard}>
          <TouchableOpacity onPress={() => router.push("/Auth/Produits/profil-edit")}>
            <View style={styles.avatarContainer}>
              <Image source={{ uri: userData.avatar }} style={styles.avatar} />
              <View style={styles.avatarEditBadge}>
                <Ionicons name="camera" size={12} color="#FFFFFF" />
              </View>
            </View>
          </TouchableOpacity>
          
          <View style={styles.profileInfo}>
            <Text style={styles.userName}>{userData.name}</Text>
            <Text style={styles.userEmail}>{userData.email}</Text>
            
            <View style={styles.roleContainer}>
              <Text style={styles.userRole}>{userData.role}</Text>
              <View style={styles.verifiedIcon}>
                <Ionicons name="checkmark-circle" size={12} color={PRO_BLUE} />
              </View>
            </View>
            
            <View style={styles.memberSinceContainer}>
              <Ionicons name="calendar" size={12} color={PRO_BLUE} />
              <Text style={styles.memberSinceText}>
                Membre depuis {userData.memberSince}
              </Text>
            </View>
          </View>
        </View>
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {/* Barre de recherche */}
        <View style={styles.searchBar}>
          <Ionicons name="search" size={20} color={PRO_BLUE} style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Rechercher un paramètre..."
            placeholderTextColor="#A0AEC0"
            value={searchText}
            onChangeText={setSearchText}
          />
          {searchText.length > 0 && (
            <TouchableOpacity onPress={() => setSearchText("")}>
              <Ionicons name="close-circle" size={20} color={NOTIFICATION_RED} />
            </TouchableOpacity>
          )}
        </View>

        {/* Réglages rapides */}
        <View style={styles.quickSettingsSection}>
          <Text style={styles.sectionTitle}>Réglages rapides</Text>
          
          <View style={styles.quickSettingsGrid}>
            <QuickSetting
              iconName="notifications"
              title="Notifications"
              description="Activer/Désactiver"
              value={notificationsEnabled}
              onValueChange={setNotificationsEnabled}
            />
            
            <QuickSetting
              iconName="moon"
              title="Mode sombre"
              description="Thème Shopnet"
              value={darkModeEnabled}
              onValueChange={setDarkModeEnabled}
            />
            
            <QuickSetting
              iconName="location"
              title="Localisation"
              description="Partager ma position"
              value={locationEnabled}
              onValueChange={setLocationEnabled}
            />
            
            <QuickSetting
              iconName="shield-checkmark"
              title="Sécurité avancée"
              description="Protection renforcée"
              value={advancedSecurityEnabled}
              onValueChange={setAdvancedSecurityEnabled}
            />
          </View>
          
          <TouchableOpacity style={styles.saveButton} onPress={handleSaveSettings} disabled={loading}>
            <View style={styles.saveButtonContent}>
              <Ionicons name="save" size={20} color="#FFFFFF" />
              <Text style={styles.saveButtonText}>Sauvegarder les réglages</Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* Paramètres */}
        {settingsData.map((section) => (
          <View key={section.id} style={styles.settingsSection}>
            <Text style={styles.sectionTitle}>{section.title}</Text>
            <View style={styles.settingsList}>
              {section.items.map((item) => (
                <SettingRow
                  key={item.id}
                  item={item}
                  onPress={() => router.push(item.route)}
                />
              ))}
            </View>
          </View>
        ))}

        {/* Informations */}
        <View style={styles.infoSection}>
          <InfoRow
            iconName="information-circle"
            label="Version de l'application"
            value="Shopnet Pro 2.5.1"
          />
          
          <InfoRow
            iconName="phone-portrait"
            label="Appareil"
            value="React Native / Expo"
          />
          
          <InfoRow
            iconName="cloud"
            label="Dernière synchronisation"
            value="À l'instant"
          />
        </View>

        {/* Déconnexion */}
        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout} disabled={loading}>
          <View style={styles.logoutButtonContent}>
            <MaterialIcons name="logout" size={22} color={NOTIFICATION_RED} />
            <Text style={styles.logoutButtonText}>Déconnexion</Text>
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
  header: {
    backgroundColor: SHOPNET_BLUE,
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 20,
  },
  headerTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
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
  profileCard: {
    flexDirection: "row",
    alignItems: "center",
  },
  avatarContainer: {
    position: "relative",
  },
  avatar: {
    width: 70,
    height: 70,
    borderRadius: 35,
    borderWidth: 3,
    borderColor: PRO_BLUE,
  },
  avatarEditBadge: {
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
  profileInfo: {
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
  roleContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 6,
  },
  userRole: {
    fontSize: 13,
    color: "#A0AEC0",
    fontWeight: "600",
  },
  verifiedIcon: {
    marginLeft: 4,
  },
  memberSinceContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  memberSinceText: {
    fontSize: 12,
    color: "#A0AEC0",
    marginLeft: 4,
  },
  scrollView: {
    flex: 1,
    backgroundColor: "transparent",
  },
  scrollContent: {
    paddingBottom: 40,
  },
  searchBar: {
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
  quickSettingCard: {
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
  quickSettingTitle: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 4,
  },
  quickSettingDescription: {
    color: "#A0AEC0",
    fontSize: 12,
  },
  saveButton: {
    backgroundColor: PRO_BLUE,
    borderRadius: 12,
    padding: 16,
    marginTop: 12,
  },
  saveButtonContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  saveButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
    marginLeft: 8,
  },
  settingsSection: {
    backgroundColor: CARD_BG,
    borderRadius: 16,
    marginHorizontal: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: BORDER_COLOR,
  },
  settingsList: {
    paddingHorizontal: 8,
  },
  settingRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 18,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(66, 165, 245, 0.05)",
  },
  settingRowLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(66, 165, 245, 0.1)",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  settingName: {
    fontSize: 16,
    color: "#E2E8F0",
    fontWeight: "500",
    flex: 1,
  },
  settingRowRight: {
    flexDirection: "row",
    alignItems: "center",
  },
  badge: {
    backgroundColor: NOTIFICATION_RED,
    minWidth: 22,
    height: 22,
    borderRadius: 11,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  badgeText: {
    color: "#FFFFFF",
    fontSize: 11,
    fontWeight: "bold",
    paddingHorizontal: 4,
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
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
  },
  infoContent: {
    flex: 1,
    marginLeft: 16,
  },
  infoLabel: {
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
    marginHorizontal: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: "rgba(255, 107, 107, 0.2)",
  },
  logoutButtonContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 20,
  },
  logoutButtonText: {
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