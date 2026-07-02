import React, { useState, useEffect, useMemo, useRef } from "react";
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
  Linking,
  Animated,
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
import { useTheme } from "../../../../app/theme/ThemeContext";
import { useLanguage } from "../../../../context/LanguageContext";

const { width, height } = Dimensions.get("window");
const PRO_BLUE = "#42A5F5";
const NOTIFICATION_RED = "#FF3B30";

const BASE_URL = 'https://shopnet-backend.onrender.com';

// Types
type SettingsItem = {
  id: string;
  name: string;
  route: string;
  icon: string;
  badge?: number;
  iconFamily?: 'ionicons' | 'material' | 'fontawesome' | 'feather';
  url?: string;
  subItems?: SettingsItem[];
};

type SettingsSection = {
  id: string;
  title: string;
  items: SettingsItem[];
};

// Composants réutilisables
const SettingIcon = ({ item, colors }: { item: SettingsItem; colors: any }) => {
  const iconProps = { size: 22, color: colors.accent };
  if (item.iconFamily === 'material') return <MaterialIcons name={item.icon as any} {...iconProps} />;
  if (item.iconFamily === 'fontawesome') return <FontAwesome name={item.icon as any} {...iconProps} />;
  if (item.iconFamily === 'feather') return <Feather name={item.icon as any} {...iconProps} />;
  return <Ionicons name={item.icon as any} {...iconProps} />;
};

const SettingRow = ({ item, onPress, colors }: { item: SettingsItem; onPress: () => void; colors: any }) => (
  <TouchableOpacity style={[styles.settingRow, { borderBottomColor: colors.borderLight }]} onPress={onPress}>
    <View style={styles.settingRowLeft}>
      <View style={[styles.iconContainer, { backgroundColor: colors.iconBg }]}>
        <SettingIcon item={item} colors={colors} />
      </View>
      <Text style={[styles.settingName, { color: colors.text }]}>{item.name}</Text>
    </View>
    <View style={styles.settingRowRight}>
      {item.badge && item.badge > 0 ? (
        <View style={[styles.badge, { backgroundColor: colors.danger }]}>
          <Text style={styles.badgeText}>{item.badge}</Text>
        </View>
      ) : null}
      {item.url ? (
        <Ionicons name="open-outline" size={18} color={colors.accent} />
      ) : (
        <Feather name="chevron-right" size={20} color={colors.accent} />
      )}
    </View>
  </TouchableOpacity>
);

const QuickSetting = ({
  iconName,
  title,
  description,
  value,
  onValueChange,
  colors,
}: {
  iconName: string;
  title: string;
  description: string;
  value: boolean;
  onValueChange: (value: boolean) => void;
  colors: any;
}) => (
  <View style={[styles.quickSettingCard, { backgroundColor: colors.cardAlt }]}>
    <View style={styles.quickSettingHeader}>
      <Ionicons name={iconName as any} size={24} color={colors.accent} />
      <Switch
        value={value}
        onValueChange={onValueChange}
        trackColor={{ false: colors.trackOff, true: colors.accent }}
        thumbColor="#FFFFFF"
      />
    </View>
    <Text style={[styles.quickSettingTitle, { color: colors.text }]}>{title}</Text>
    <Text style={[styles.quickSettingDescription, { color: colors.textSecondary }]}>{description}</Text>
  </View>
);

const InfoRow = ({ iconName, label, value, colors }: { iconName: string; label: string; value: string; colors: any }) => (
  <View style={styles.infoRow}>
    <Ionicons name={iconName as any} size={20} color={colors.accent} />
    <View style={styles.infoContent}>
      <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>{label}</Text>
      <Text style={[styles.infoValue, { color: colors.text }]}>{value}</Text>
    </View>
  </View>
);

// Hook couleurs dynamiques
const useDynamicColors = () => {
  const { isDark } = useTheme();
  return {
    background: isDark ? '#0D0D0D' : '#00182A',
    surface: isDark ? '#1A1A1A' : '#00182A',
    card: isDark ? '#1A1A1A' : 'rgba(30, 42, 59, 0.9)',
    cardAlt: isDark ? '#222222' : 'rgba(26, 38, 51, 0.8)',
    border: isDark ? '#2E2E2E' : 'rgba(66, 165, 245, 0.1)',
    borderLight: isDark ? '#2E2E2E' : 'rgba(66, 165, 245, 0.05)',
    text: isDark ? '#F5F5F5' : '#FFFFFF',
    textSecondary: isDark ? '#B0B0B0' : '#A0AEC0',
    textMuted: isDark ? '#888888' : '#718096',
    accent: '#42A5F5',
    success: '#4CAF50',
    danger: '#FF3B30',
    iconBg: isDark ? 'rgba(66, 165, 245, 0.15)' : 'rgba(66, 165, 245, 0.1)',
    trackOff: isDark ? '#444444' : '#3A4A5A',
    headerBg: isDark ? '#1A1A1A' : '#00182A',
    headerBorder: isDark ? '#2E2E2E' : 'rgba(66, 165, 245, 0.1)',
    statusBar: isDark ? '#0D0D0D' : '#00182A',
    barStyle: 'light-content' as const,
    inputBg: isDark ? '#1A1A1A' : 'rgba(30, 42, 59, 0.9)',
    inputText: isDark ? '#F5F5F5' : '#FFFFFF',
    placeholder: isDark ? '#666666' : '#A0AEC0',
    footerBorder: isDark ? '#2E2E2E' : 'rgba(66, 165, 245, 0.1)',
    logoutBorder: isDark ? 'rgba(255, 107, 107, 0.3)' : 'rgba(255, 107, 107, 0.2)',
    profileBorder: '#42A5F5',
  };
};

// Composant principal
const SettingsScreen = () => {
  const router = useRouter();
  const { isDark, toggleTheme } = useTheme();
  const { language } = useLanguage();
  const fr = language === 'fr';
  const COLORS = useDynamicColors();

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
  const [locationEnabled, setLocationEnabled] = useState(true);
  const [advancedSecurityEnabled, setAdvancedSecurityEnabled] = useState(false);
  const [expandedSection, setExpandedSection] = useState<string | null>(null);
  
  // État pour le toast de notification
  const [toastVisible, setToastVisible] = useState(false);
  const [toastMessage, setToastMessage] = useState("");
  const toastOpacity = useRef(new Animated.Value(0)).current;

  // Données de configuration avec traductions (section Alertes supprimée)
  const settingsData: SettingsSection[] = [
    {
      id: '1',
      title: fr ? "Compte & Profil" : "Account & Profile",
      items: [
        { id: '1-1', name: fr ? "Mon profil" : "My Profile", route: "/Auth/Produits/profil-edit", icon: "person-circle", badge: 0, iconFamily: 'ionicons' },
        { id: '1-2', name: fr ? "Sécurité" : "Security", route: "/Auth/Parametre/Securite", icon: "shield-checkmark", badge: 0, iconFamily: 'ionicons' },
        { id: '1-3', name: fr ? "Paiements" : "Payments", route: "/MisAjour", icon: "card-outline", badge: 3, iconFamily: 'ionicons' },
        { id: '1-4', name: fr ? "Badge Pro" : "Pro Badge", route: "/MisAjour", icon: "verified", badge: 0, iconFamily: 'material' },
      ],
    },
    {
      id: '2',
      title: fr ? "Notifications & Communications" : "Notifications & Communications",
      items: [
        { id: '2-1', name: fr ? "Notifications" : "Notifications", route: "/Auth/Parametre/NotificationSettings", icon: "notifications", badge: 5, iconFamily: 'ionicons' },
        // Suppression de l'élément "Alertes" (id '2-3')
      ],
    },
    {
      id: '3',
      title: fr ? "Apparence & Préférences" : "Appearance & Preferences",
      items: [
        { id: '3-2', name: fr ? "Langue" : "Language", route: "/Auth/Parametre/Langue", icon: "language", badge: 0, iconFamily: 'ionicons' },
        { id: '3-3', name: fr ? "Localisation" : "Location", route: "/MisAjour", icon: "location", badge: 0, iconFamily: 'ionicons' },
      ],
    },
    {
      id: '4',
      title: fr ? "📢 Publicité" : "📢 Advertising",
      items: [
        { id: '4-1', name: fr ? "Créer une publicité" : "Create Ad", route: "/MisAjour", icon: "bullhorn", iconFamily: 'fontawesome' },
        { id: '4-2', name: fr ? "Mes publicités" : "My Ads", route: "/MisAjour", icon: "list", iconFamily: 'ionicons' },
        { id: '4-3', name: fr ? "Statistiques publicitaires" : "Ad Statistics", route: "/MisAjour", icon: "bar-chart", iconFamily: 'fontawesome' },
        { id: '4-4', name: fr ? "Ciblage" : "Targeting", route: "/MisAjour", icon: "target", iconFamily: 'fontawesome' },
        { id: '4-5', name: fr ? "Paiements publicité" : "Ad Payments", route: "/MisAjour", icon: "credit-card", iconFamily: 'fontawesome' },
        { id: '4-6', name: fr ? "Planification" : "Scheduling", route: "/MisAjour", icon: "calendar", iconFamily: 'fontawesome' },
        { id: '4-7', name: fr ? "Suggestions IA" : "AI Suggestions", route: "/MisAjour", icon: "brain", iconFamily: 'ionicons' },
        { id: '4-8', name: fr ? "Paramètres publicité" : "Ad Settings", route: "/MisAjour", icon: "settings", iconFamily: 'ionicons' },
      ],
    },
    {
      id: '5',
      title: fr ? "🛒 Activité" : "🛒 Activity",
      items: [
        { id: '5-1', name: fr ? "Historique des commandes" : "Order History", route: "/MisAjour", icon: "receipt", badge: 0, iconFamily: 'ionicons' },
        { id: '5-2', name: fr ? "Produits favoris" : "Favorite Products", route: "/MisAjour", icon: "heart", badge: 0, iconFamily: 'ionicons' },
        { id: '5-3', name: fr ? "Produits publiés" : "Published Products", route: "/MisAjour", icon: "layers", badge: 0, iconFamily: 'ionicons' },
      ],
    },
    {
      id: '6',
      title: fr ? "Support & Aide" : "Support & Help",
      items: [
        { id: '6-1', name: fr ? "Centre d'aide" : "Help Center", route: "/Auth/AssistantIA/Centre_aide", icon: "help-circle", badge: 0, iconFamily: 'ionicons' },
        { id: '6-2', name: fr ? "Signaler un problème" : "Report a Problem", route: "/Auth/AssistantIA/Signalement", icon: "warning", badge: 0, iconFamily: 'material' },
        { id: '6-3', name: fr ? "Nous contacter" : "Contact Us", route: "/MisAjour", icon: "mail", badge: 0, iconFamily: 'ionicons' },
        { id: '6-4', name: fr ? "À propos" : "About", route: "/MisAjour", icon: "information-circle", badge: 0, iconFamily: 'ionicons' },
      ],
    },
    {
      id: '7',
      title: fr ? "Confidentialité & Sécurité" : "Privacy & Security",
      items: [
        { id: '7-1', name: fr ? "Vie privée" : "Privacy", route: "/MisAjour", icon: "lock-closed", badge: 0, iconFamily: 'ionicons' },
        { id: '7-2', name: fr ? "Sécurité avancée" : "Advanced Security", route: "/MisAjour", icon: "shield", badge: 0, iconFamily: 'ionicons' },
        { id: '7-3', name: fr ? "Historique" : "History", route: "/MisAjour", icon: "time", badge: 0, iconFamily: 'ionicons' },
      ],
    },
    {
      id: '8',
      title: fr ? "Légal & Informations" : "Legal & Information",
      items: [
        { id: '8-1', name: fr ? "Politique de Confidentialité" : "Privacy Policy", route: "", url: "https://shopnet-condition.vercel.app/", icon: "shield-checkmark", badge: 0, iconFamily: 'ionicons' },
        { id: '8-2', name: fr ? "Conditions d'Utilisation" : "Terms of Use", route: "", url: "https://shopnet-condition.vercel.app/ConditionD-utilisation.html", icon: "document-text", badge: 0, iconFamily: 'ionicons' },
        { id: '8-3', name: fr ? "Conditions de Vente" : "Terms of Sale", route: "", url: "https://shopnet-condition.vercel.app/ConditionDeVente.html", icon: "cart", badge: 0, iconFamily: 'ionicons' },
        { id: '8-4', name: fr ? "Politique de Remboursement" : "Refund Policy", route: "", url: "https://shopnet-condition.vercel.app/PolitiqueDeRembourssement.html", icon: "refresh-circle", badge: 0, iconFamily: 'ionicons' },
        { id: '8-5', name: fr ? "Règles de la Communauté" : "Community Rules", route: "", url: "https://shopnet-condition.vercel.app/RegleDelaCommun.html", icon: "people", badge: 0, iconFamily: 'ionicons' },
        { id: '8-6', name: fr ? "À propos de SHOPNET" : "About SHOPNET", route: "", url: "https://shopnet-condition.vercel.app/AproposShopnet.html", icon: "information-circle", badge: 0, iconFamily: 'ionicons' },
      ],
    },
  ];

  // Filtrer les données en fonction du texte de recherche (titre de section ou nom d'item)
  const filteredData = useMemo(() => {
    if (!searchText.trim()) return settingsData;
    const lowerSearch = searchText.toLowerCase();
    return settingsData
      .map(section => {
        const sectionMatches = section.title.toLowerCase().includes(lowerSearch);
        const filteredItems = section.items.filter(item =>
          item.name.toLowerCase().includes(lowerSearch)
        );
        // Garder la section si le titre correspond ou s'il y a des items correspondants
        if (sectionMatches || filteredItems.length > 0) {
          return {
            ...section,
            items: sectionMatches ? section.items : filteredItems,
          };
        }
        return null;
      })
      .filter(Boolean) as SettingsSection[];
  }, [searchText, settingsData]);

  useEffect(() => { fetchUserData(); }, []);

  const fetchUserData = async () => {
    try {
      setLoading(true);
      const token = await AsyncStorage.getItem("userToken");
      if (!token) { router.push("/splash"); return; }
      const response = await axios.get(`${BASE_URL}/api/user/profile`, { headers: { Authorization: `Bearer ${token}` } });
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
      Alert.alert(fr ? "Erreur" : "Error", fr ? "Impossible de charger les données du profil" : "Unable to load profile data");
    } finally { setLoading(false); }
  };

  const handleLogout = async () => {
    Alert.alert(
      fr ? "Déconnexion" : "Logout",
      fr ? "Êtes-vous sûr de vouloir vous déconnecter ?" : "Are you sure you want to logout?",
      [
        { text: fr ? "Annuler" : "Cancel", style: "cancel" },
        { text: fr ? "Déconnexion" : "Logout", onPress: async () => { try { await AsyncStorage.removeItem("userToken"); router.push("/splash"); } catch (error) { Alert.alert(fr ? "Erreur" : "Error", fr ? "Échec de la déconnexion" : "Logout failed"); } } },
      ]
    );
  };

  // Fonction qui affiche un toast au lieu d'une alerte
  const showToast = (message: string) => {
    setToastMessage(message);
    setToastVisible(true);
    Animated.timing(toastOpacity, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true,
    }).start();
    setTimeout(() => {
      Animated.timing(toastOpacity, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }).start(() => {
        setToastVisible(false);
      });
    }, 3000);
  };

  const handleSaveSettings = async () => {
    try {
      setLoading(true);
      const token = await AsyncStorage.getItem("userToken");
      const settingsData = {
        notifications_enabled: notificationsEnabled,
        dark_mode: isDark,
        location_enabled: locationEnabled,
        advanced_security: advancedSecurityEnabled,
        updated_at: new Date().toISOString()
      };
      await axios.post(`${BASE_URL}/api/user/settings`, settingsData, {
        headers: { Authorization: `Bearer ${token}` }
      });
      // Notification toast au lieu de Alert.alert
      showToast(fr ? "✅ Paramètres sauvegardés avec succès" : "✅ Settings saved successfully");
    } catch (error) {
      console.error("Erreur sauvegarde paramètres:", error);
      showToast(fr ? "❌ Erreur lors de la sauvegarde" : "❌ Error saving settings");
    } finally {
      setLoading(false);
    }
  };

  const handleSyncData = async () => {
    try {
      setLoading(true);
      const token = await AsyncStorage.getItem("userToken");
      await axios.post(`${BASE_URL}/api/user/sync`, {}, { headers: { Authorization: `Bearer ${token}` } });
      await fetchUserData();
      showToast(fr ? "✅ Données synchronisées" : "✅ Data synced");
    } catch (error) {
      console.error("Erreur synchronisation:", error);
      showToast(fr ? "❌ Erreur de synchronisation" : "❌ Sync error");
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateApp = () => {
    const playStoreUrl = "https://play.google.com/store/apps/details?id=com.shopai.app&pcampaignid=web_share";
    Linking.openURL(playStoreUrl).catch(() => {
      showToast(fr ? "❌ Impossible d'ouvrir le Play Store" : "❌ Unable to open Play Store");
    });
  };

  const handleItemPress = (item: SettingsItem) => {
    if (item.url) {
      Linking.openURL(item.url).catch(() => {
        showToast(fr ? "❌ Impossible d'ouvrir ce lien" : "❌ Unable to open link");
      });
    } else {
      router.push(item.route);
    }
  };

  const toggleSection = (sectionId: string) => {
    setExpandedSection(prev => prev === sectionId ? null : sectionId);
  };

  if (loading && !userData.name) {
    return (
      <SafeAreaView style={[styles.loadingContainer, { backgroundColor: COLORS.background }]}>
        <StatusBar backgroundColor={COLORS.statusBar} barStyle={COLORS.barStyle} />
        <ActivityIndicator size="large" color={COLORS.accent} />
        <Text style={[styles.loadingText, { color: COLORS.accent }]}>{fr ? "Chargement des paramètres..." : "Loading settings..."}</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: COLORS.background }]}>
      <StatusBar backgroundColor={COLORS.statusBar} barStyle={COLORS.barStyle} />
      <View style={[styles.header, { backgroundColor: COLORS.headerBg }]}>
        <View style={styles.headerTop}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} color={COLORS.text} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: COLORS.text }]}>{fr ? "Paramètres Pro" : "Pro Settings"}</Text>
          <TouchableOpacity style={[styles.syncButton, { backgroundColor: COLORS.card, borderColor: COLORS.border }]} onPress={handleSyncData} disabled={loading}>
            {loading ? <ActivityIndicator size="small" color={COLORS.accent} /> : <Ionicons name="sync" size={24} color={COLORS.accent} />}
          </TouchableOpacity>
        </View>
        <View style={styles.profileCard}>
          <TouchableOpacity onPress={() => router.push("/Auth/Produits/profil-edit")}>
            <View style={styles.avatarContainer}>
              <Image source={{ uri: userData.avatar }} style={[styles.avatar, { borderColor: COLORS.profileBorder }]} />
              <View style={styles.avatarEditBadge}><Ionicons name="camera" size={12} color="#FFFFFF" /></View>
            </View>
          </TouchableOpacity>
          <View style={styles.profileInfo}>
            <Text style={[styles.userName, { color: COLORS.text }]}>{userData.name}</Text>
            <View style={styles.memberSinceContainer}>
              <Ionicons name="calendar" size={12} color={COLORS.accent} />
              <Text style={[styles.memberSinceText, { color: COLORS.textSecondary }]}>
                {fr ? "Membre depuis" : "Member since"} {userData.memberSince}
              </Text>
            </View>
          </View>
        </View>
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {/* Barre de recherche */}
        <View style={[styles.searchBar, { backgroundColor: COLORS.card, borderColor: COLORS.border }]}>
          <Ionicons name="search" size={20} color={COLORS.accent} style={styles.searchIcon} />
          <TextInput
            style={[styles.searchInput, { color: COLORS.inputText }]}
            placeholder={fr ? "Rechercher un paramètre..." : "Search settings..."}
            placeholderTextColor={COLORS.placeholder}
            value={searchText}
            onChangeText={setSearchText}
          />
          {searchText.length > 0 && (
            <TouchableOpacity onPress={() => setSearchText("")}>
              <Ionicons name="close-circle" size={20} color={COLORS.danger} />
            </TouchableOpacity>
          )}
        </View>

        {/* Réglages rapides */}
        <View style={[styles.quickSettingsSection, { backgroundColor: COLORS.card, borderColor: COLORS.border }]}>
          <Text style={[styles.sectionTitle, { color: COLORS.text }]}>{fr ? "Réglages rapides" : "Quick Settings"}</Text>
          <View style={styles.quickSettingsGrid}>
            <QuickSetting iconName="notifications" title={fr ? "Notifications" : "Notifications"} description={fr ? "Activer/Désactiver" : "Enable/Disable"} value={notificationsEnabled} onValueChange={setNotificationsEnabled} colors={COLORS} />
            <QuickSetting iconName="moon" title={fr ? "Mode sombre" : "Dark Mode"} description={fr ? "Thème Shopnet" : "Shopnet Theme"} value={isDark} onValueChange={toggleTheme} colors={COLORS} />
            <QuickSetting iconName="location" title={fr ? "Localisation" : "Location"} description={fr ? "Partager ma position" : "Share my location"} value={locationEnabled} onValueChange={setLocationEnabled} colors={COLORS} />
            <QuickSetting iconName="shield-checkmark" title={fr ? "Sécurité avancée" : "Advanced Security"} description={fr ? "Protection renforcée" : "Enhanced protection"} value={advancedSecurityEnabled} onValueChange={setAdvancedSecurityEnabled} colors={COLORS} />
          </View>
          <TouchableOpacity style={[styles.saveButton, { backgroundColor: COLORS.accent }]} onPress={handleSaveSettings} disabled={loading}>
            <View style={styles.saveButtonContent}>
              <Ionicons name="save" size={20} color="#FFFFFF" />
              <Text style={styles.saveButtonText}>{fr ? "Sauvegarder les réglages" : "Save Settings"}</Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* Sections filtrées */}
        {filteredData.map((section) => {
          const isExpanded = expandedSection === section.id;
          const isAdvertising = section.id === '4';
          return (
            <View key={section.id} style={[styles.settingsSection, { backgroundColor: COLORS.card, borderColor: COLORS.border }]}>
              <TouchableOpacity
                style={styles.sectionHeaderTouchable}
                onPress={() => isAdvertising && toggleSection(section.id)}
                activeOpacity={0.7}
              >
                <Text style={[styles.sectionTitle, { color: COLORS.text }]}>{section.title}</Text>
                {isAdvertising && (
                  <Ionicons name={isExpanded ? "chevron-up" : "chevron-down"} size={24} color={COLORS.textSecondary} />
                )}
              </TouchableOpacity>

              {!isAdvertising || (isAdvertising && isExpanded) ? (
                <View style={styles.settingsList}>
                  {section.items.map((item) => (
                    <SettingRow key={item.id} item={item} onPress={() => handleItemPress(item)} colors={COLORS} />
                  ))}
                </View>
              ) : null}
            </View>
          );
        })}

        {/* Informations */}
        <View style={[styles.infoSection, { backgroundColor: COLORS.card, borderColor: COLORS.border }]}>
          <InfoRow iconName="information-circle" label={fr ? "Version de l'application" : "App Version"} value="Shopnet Pro 3.2.3" colors={COLORS} />
          <TouchableOpacity style={[styles.updateButton, { backgroundColor: COLORS.accent }]} onPress={handleUpdateApp}>
            <Ionicons name="download-outline" size={20} color="#FFFFFF" style={{ marginRight: 8 }} />
            <Text style={styles.updateButtonText}>{fr ? "Mettre l'application à jour" : "Update App"}</Text>
          </TouchableOpacity>
          <InfoRow iconName="phone-portrait" label={fr ? "Appareil" : "Device"} value="React Native / Expo" colors={COLORS} />
          <InfoRow iconName="cloud" label={fr ? "Dernière synchronisation" : "Last Sync"} value={fr ? "À l'instant" : "Just now"} colors={COLORS} />
        </View>

        {/* Bouton Déconnexion */}
        <TouchableOpacity style={[styles.logoutButton, { backgroundColor: COLORS.card, borderColor: COLORS.logoutBorder }]} onPress={handleLogout} disabled={loading}>
          <View style={styles.logoutButtonContent}>
            <MaterialIcons name="logout" size={22} color={COLORS.danger} />
            <Text style={[styles.logoutButtonText, { color: COLORS.danger }]}>{fr ? "Déconnexion" : "Logout"}</Text>
          </View>
        </TouchableOpacity>

        <View style={[styles.footer, { borderTopColor: COLORS.footerBorder }]}>
          <Text style={[styles.footerText, { color: COLORS.textSecondary }]}>© 2026 Shopnet Markeplace RDC. {fr ? "Tous droits réservés." : "All rights reserved."}</Text>
          <Text style={[styles.footerSubText, { color: COLORS.textMuted }]}>Version 10.2.2 • Build 213</Text>
        </View>
      </ScrollView>

      {/* Toast notification */}
      {toastVisible && (
        <Animated.View style={[styles.toastContainer, { opacity: toastOpacity, backgroundColor: COLORS.card }]}>
          <Text style={[styles.toastText, { color: COLORS.text }]}>{toastMessage}</Text>
        </Animated.View>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: { flex: 1, paddingTop: Platform.OS === "android" ? StatusBar.currentHeight || 0 : 0 },
  loadingContainer: { flex: 1, justifyContent: "center", alignItems: "center" },
  loadingText: { fontSize: 16, marginTop: 12, fontWeight: "600" },
  header: { paddingHorizontal: 20, paddingTop: 10, paddingBottom: 20 },
  headerTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 20 },
  backButton: { padding: 8 },
  headerTitle: { fontSize: 20, fontWeight: "800", letterSpacing: 0.5 },
  syncButton: { width: 40, height: 40, borderRadius: 20, justifyContent: "center", alignItems: "center", borderWidth: 1 },
  profileCard: { flexDirection: "row", alignItems: "center" },
  avatarContainer: { position: "relative" },
  avatar: { width: 70, height: 70, borderRadius: 35, borderWidth: 3 },
  avatarEditBadge: { position: "absolute", bottom: 0, right: 0, backgroundColor: '#42A5F5', width: 24, height: 24, borderRadius: 12, justifyContent: "center", alignItems: "center", borderWidth: 2, borderColor: '#00182A' },
  profileInfo: { flex: 1, marginLeft: 16 },
  userName: { fontSize: 22, fontWeight: "800", marginBottom: 4 },
  memberSinceContainer: { flexDirection: "row", alignItems: "center" },
  memberSinceText: { fontSize: 12, marginLeft: 4 },
  scrollView: { flex: 1, backgroundColor: "transparent" },
  scrollContent: { paddingBottom: 40 },
  searchBar: { borderRadius: 16, marginHorizontal: 20, marginBottom: 20, paddingHorizontal: 16, paddingVertical: 12, flexDirection: "row", alignItems: "center", borderWidth: 1 },
  searchIcon: { marginRight: 12 },
  searchInput: { flex: 1, fontSize: 16, padding: 0 },
  quickSettingsSection: { borderRadius: 16, marginHorizontal: 20, marginBottom: 20, padding: 20, borderWidth: 1 },
  sectionTitle: { fontSize: 18, fontWeight: "800", marginBottom: 16, letterSpacing: 0.5 },
  sectionHeaderTouchable: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 16 },
  quickSettingsGrid: { flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between" },
  quickSettingCard: { width: "48%", borderRadius: 12, padding: 16, marginBottom: 12 },
  quickSettingHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 },
  quickSettingTitle: { fontSize: 14, fontWeight: "600", marginBottom: 4 },
  quickSettingDescription: { fontSize: 12 },
  saveButton: { borderRadius: 12, padding: 16, marginTop: 12 },
  saveButtonContent: { flexDirection: "row", alignItems: "center", justifyContent: "center" },
  saveButtonText: { color: "#FFFFFF", fontSize: 16, fontWeight: "700", marginLeft: 8 },
  settingsSection: { borderRadius: 16, marginHorizontal: 20, marginBottom: 16, borderWidth: 1, padding: 20 },
  settingsList: { paddingHorizontal: 0 },
  settingRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 18, paddingHorizontal: 20, borderBottomWidth: 1 },
  settingRowLeft: { flexDirection: "row", alignItems: "center", flex: 1 },
  iconContainer: { width: 40, height: 40, borderRadius: 20, justifyContent: "center", alignItems: "center", marginRight: 12 },
  settingName: { fontSize: 16, fontWeight: "500", flex: 1 },
  settingRowRight: { flexDirection: "row", alignItems: "center" },
  badge: { minWidth: 22, height: 22, borderRadius: 11, justifyContent: "center", alignItems: "center", marginRight: 12 },
  badgeText: { color: "#FFFFFF", fontSize: 11, fontWeight: "bold", paddingHorizontal: 4 },
  infoSection: { borderRadius: 16, marginHorizontal: 20, marginBottom: 20, padding: 20, borderWidth: 1 },
  infoRow: { flexDirection: "row", alignItems: "center", paddingVertical: 12 },
  infoContent: { flex: 1, marginLeft: 16 },
  infoLabel: { fontSize: 14, marginBottom: 2 },
  infoValue: { fontSize: 15, fontWeight: "600" },
  updateButton: { flexDirection: "row", alignItems: "center", justifyContent: "center", borderRadius: 12, paddingVertical: 14, marginVertical: 16 },
  updateButtonText: { color: "#FFFFFF", fontSize: 16, fontWeight: "700" },
  logoutButton: { borderRadius: 16, marginHorizontal: 20, marginBottom: 20, borderWidth: 1 },
  logoutButtonContent: { flexDirection: "row", alignItems: "center", justifyContent: "center", paddingVertical: 20 },
  logoutButtonText: { fontSize: 17, fontWeight: "700", marginLeft: 12 },
  footer: { alignItems: "center", paddingTop: 20, borderTopWidth: 1, marginHorizontal: 20 },
  footerText: { fontSize: 12, textAlign: "center", marginBottom: 4 },
  footerSubText: { fontSize: 11, textAlign: "center" },
  // Toast styles
  toastContainer: {
    position: 'absolute',
    bottom: 40,
    left: 20,
    right: 20,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(66, 165, 245, 0.2)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
    alignItems: 'center',
  },
  toastText: {
    fontSize: 15,
    fontWeight: '600',
    textAlign: 'center',
  },
});

export default SettingsScreen;