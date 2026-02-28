import React, { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Alert,
  StyleSheet,
  Dimensions,
  FlatList,
  Modal,
} from "react-native";
import axios from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as ImagePicker from "expo-image-picker";
import { useRouter } from "expo-router";
import {
  Ionicons,
  FontAwesome5,
  MaterialIcons,
  Feather,
  MaterialCommunityIcons,
} from "@expo/vector-icons";

// Configuration API
const BASE_URL = "https://shopnet-backend.onrender.com";

const { width } = Dimensions.get("window");
const PRO_BLUE = "#42A5F5";
const SHOPNET_BLUE = "#00182A";
const NOTIFICATION_RED = "#FF3B30";

// Types
type Notification = {
  id: string;
  title: string;
  message: string;
  type: "statistic" | "order" | "message" | "shop" | "promotion" | "setting";
  isRead: boolean;
  createdAt: string;
  icon?: string;
  data?: any;
};

type Product = {
  id: number;
  title: string;
  price: number;
  images: string[];
};

type UserProfile = {
  id: number;
  fullName: string;
  description?: string;
  phone?: string;
  email?: string;
  website?: string;
  profile_photo?: string | null;
  cover_photo?: string | null;
  date_inscription: string;
  productsCount: number;
  salesCount: number;
  rating: number;
  ordersCount: number;
};

// Données mockées pour les notifications
const MOCK_NOTIFICATIONS: Notification[] = [
  {
    id: "1",
    title: "Nouvelle statistique 📈",
    message: "Votre boutique a été vue 150 fois cette semaine",
    type: "statistic",
    isRead: false,
    createdAt: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
    icon: "bar-chart",
    data: { views: 150 },
  },
  {
    id: "2",
    title: "Nouvelle commande 🛒",
    message: "Commande #7890 confirmée par Marie",
    type: "order",
    isRead: false,
    createdAt: new Date(Date.now() - 1000 * 60 * 45).toISOString(),
    icon: "cart",
    data: { orderId: 7890 },
  },
  {
    id: "3",
    title: "Nouveau message 💬",
    message: "Jean vous a envoyé un message",
    type: "message",
    isRead: false,
    createdAt: new Date(Date.now() - 1000 * 60 * 60).toISOString(),
    icon: "chatbubble",
    data: { sender: "Jean" },
  },
  {
    id: "4",
    title: "Mise à jour boutique 🏪",
    message: "Votre boutique a été mise en avant",
    type: "shop",
    isRead: false,
    createdAt: new Date(Date.now() - 1000 * 60 * 90).toISOString(),
    icon: "store",
    data: { featured: true },
  },
  {
    id: "5",
    title: "Promotion expirant bientôt ⏰",
    message: "Votre promotion sur les smartphones expire dans 2h",
    type: "promotion",
    isRead: false,
    createdAt: new Date(Date.now() - 1000 * 60 * 120).toISOString(),
    icon: "pricetag",
    data: { promotionId: 123 },
  },
  {
    id: "6",
    title: "Mise à jour paramètres ⚙️",
    message: "Nouvelles options de paiement disponibles",
    type: "setting",
    isRead: false,
    createdAt: new Date(Date.now() - 1000 * 60 * 150).toISOString(),
    icon: "settings",
    data: { feature: "paiement" },
  },
  {
    id: "7",
    title: "Commande annulée ❌",
    message: "Commande #7891 a été annulée",
    type: "order",
    isRead: false,
    createdAt: new Date(Date.now() - 1000 * 60 * 180).toISOString(),
    icon: "close-circle",
    data: { orderId: 7891 },
  },
  {
    id: "8",
    title: "Nouveau commentaire ⭐",
    message: "Pierre a commenté votre produit",
    type: "message",
    isRead: false,
    createdAt: new Date(Date.now() - 1000 * 60 * 200).toISOString(),
    icon: "star",
    data: { productId: 456 },
  },
  {
    id: "9",
    title: "Statistique hebdomadaire 📊",
    message: "+25% de ventes cette semaine",
    type: "statistic",
    isRead: false,
    createdAt: new Date(Date.now() - 1000 * 60 * 240).toISOString(),
    icon: "trending-up",
    data: { increase: 25 },
  },
  {
    id: "10",
    title: "Promotion créée 🎉",
    message: "Votre promotion sur les casques est active",
    type: "promotion",
    isRead: false,
    createdAt: new Date(Date.now() - 1000 * 60 * 300).toISOString(),
    icon: "flash",
    data: { promotionId: 456 },
  },
];

// Composant pour les badges de notification
const NotificationBadge = ({
  count,
  small = false,
}: {
  count: number;
  small?: boolean;
}) => {
  if (count <= 0) return null;

  const displayCount = count > 10 ? "+9" : count.toString();

  return (
    <View
      style={[styles.badge, small ? styles.smallBadge : styles.regularBadge]}
    >
      <Text
        style={[
          styles.badgeText,
          small ? styles.smallBadgeText : styles.regularBadgeText,
        ]}
      >
        {displayCount}
      </Text>
    </View>
  );
};

// Fonction pour générer des nombres aléatoires limités à 10
const generateRandomCount = (min: number, max: number): number => {
  const count = Math.floor(Math.random() * (max - min + 1)) + min;
  return count > 10 ? 10 : count;
};

// Composants modaux
const PhotoModalComponent = ({
  visible,
  type,
  hasPhoto,
  uploading,
  onView,
  onChoose,
  onClose,
}: {
  visible: boolean;
  type: "profile" | "cover" | null;
  hasPhoto: boolean;
  uploading: boolean;
  onView: () => void;
  onChoose: () => void;
  onClose: () => void;
}) => (
  <Modal
    visible={visible}
    transparent
    animationType="fade"
    onRequestClose={onClose}
  >
    <View style={styles.modalOverlay}>
      <View style={styles.modalContent}>
        <Text style={styles.modalTitle}>
          {type === "profile" ? "Photo de profil" : "Photo de couverture"}
        </Text>
        <TouchableOpacity
          style={[styles.modalBtn, !hasPhoto && styles.disabledBtn]}
          onPress={onView}
          disabled={uploading || !hasPhoto}
        >
          <View style={styles.modalBtnContent}>
            <Ionicons name="eye" size={20} color="#FFFFFF" />
            <Text style={styles.modalBtnText}>Voir la photo</Text>
          </View>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.modalBtn}
          onPress={onChoose}
          disabled={uploading}
        >
          {uploading ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <View style={styles.modalBtnContent}>
              <Ionicons name="image" size={20} color="#FFFFFF" />
              <Text style={styles.modalBtnText}>Choisir une photo</Text>
            </View>
          )}
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.modalBtn, styles.cancelBtn]}
          onPress={onClose}
          disabled={uploading}
        >
          <Text style={styles.modalBtnText}>Annuler</Text>
        </TouchableOpacity>
      </View>
    </View>
  </Modal>
);

const FullscreenPhotoModalComponent = ({
  visible,
  photoUri,
  onClose,
}: {
  visible: boolean;
  photoUri: string | null | undefined;
  onClose: () => void;
}) => (
  <Modal
    visible={visible}
    transparent={false}
    animationType="fade"
    onRequestClose={onClose}
  >
    <View style={styles.fullscreenPhotoContainer}>
      <TouchableOpacity style={styles.closePhotoButton} onPress={onClose}>
        <Ionicons name="close" size={30} color="#FFFFFF" />
      </TouchableOpacity>
      {photoUri ? (
        <Image
          source={{
            uri: photoUri.startsWith("http")
              ? photoUri
              : `${BASE_URL}${photoUri}`,
          }}
          style={styles.fullscreenPhoto}
          resizeMode={photoUri.includes("cover") ? "cover" : "contain"}
        />
      ) : (
        <View style={styles.fullscreenPlaceholder}>
          <Ionicons name="image" size={60} color="#FFFFFF" />
          <Text style={styles.fullscreenPlaceholderText}>
            Image non disponible
          </Text>
        </View>
      )}
    </View>
  </Modal>
);

// Composant principal
export default function ProfilVendeurPremium() {
  const router = useRouter();
  const [user, setUser] = useState<UserProfile | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [token, setToken] = useState<string | null>(null);
  const [photoModalVisible, setPhotoModalVisible] = useState(false);
  const [photoModalType, setPhotoModalType] = useState<
    "profile" | "cover" | null
  >(null);
  const [uploading, setUploading] = useState(false);
  const [viewingPhoto, setViewingPhoto] = useState(false);

  // État pour les notifications et badges
  const [notifications, setNotifications] =
    useState<Notification[]>(MOCK_NOTIFICATIONS);
  const [badgeCounts, setBadgeCounts] = useState({
    statistics: generateRandomCount(0, 15),
    orders: generateRandomCount(0, 15),
    messages: generateRandomCount(0, 15),
    boutique: generateRandomCount(0, 15),
    promotions: generateRandomCount(0, 15),
    settings: generateRandomCount(0, 15),
  });

  // Charger token et profil
  const loadTokenAndUser = useCallback(async () => {
    try {
      const savedToken = await AsyncStorage.getItem("userToken");
      if (!savedToken) {
        router.push("/splash");
        return;
      }
      setToken(savedToken);
      await fetchUserProfile(savedToken);
      await fetchProducts(savedToken);
    } catch (error) {
      console.error("Erreur chargement token/profil:", error);
      Alert.alert("Erreur", "Impossible de récupérer l'utilisateur.");
    }
  }, [router]);

  useEffect(() => {
    loadTokenAndUser();

    const updateBadgeCounts = () => {
      setBadgeCounts({
        statistics: generateRandomCount(0, 15),
        orders: generateRandomCount(0, 15),
        messages: generateRandomCount(0, 15),
        boutique: generateRandomCount(0, 15),
        promotions: generateRandomCount(0, 15),
        settings: generateRandomCount(0, 15),
      });
    };

    const interval = setInterval(updateBadgeCounts, 30000);
    updateBadgeCounts();

    return () => clearInterval(interval);
  }, []);

  // Fonction pour réinitialiser un badge
  const resetBadge = (key: keyof typeof badgeCounts) => {
    setBadgeCounts((prev) => ({
      ...prev,
      [key]: 0,
    }));

    const typeMap: { [key: string]: Notification["type"] } = {
      statistics: "statistic",
      orders: "order",
      messages: "message",
      boutique: "shop",
      promotions: "promotion",
      settings: "setting",
    };

    setNotifications((prev) =>
      prev.map((notification) =>
        notification.type === typeMap[key]
          ? { ...notification, isRead: true }
          : notification,
      ),
    );
  };

  const fetchUserProfile = async (token: string) => {
    try {
      setLoading(true);
      const res = await axios.get(`${BASE_URL}/api/user/profile`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.data.success) setUser(res.data.user);
    } catch (error) {
      console.error("Erreur fetchUserProfile:", error);
      Alert.alert("Erreur", "Erreur lors de la récupération du profil");
    } finally {
      setLoading(false);
    }
  };

  const fetchProducts = async (token: string) => {
    try {
      setLoading(true);
      const res = await axios.get(`${BASE_URL}/api/user/my-products`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.data.success) {
        const productsWithNumericPrices = res.data.products.map(
          (product: any) => ({
            ...product,
            price: Number(product.price) || 0,
          }),
        );
        setProducts(productsWithNumericPrices);
      }
    } catch (error: any) {
      console.error("Erreur fetchProducts:", error);
      if (error.response?.status === 401) {
        Alert.alert("Session expirée", "Veuillez vous reconnecter");
        await AsyncStorage.removeItem("userToken");
        router.push("/splash");
      } else {
        Alert.alert("Erreur", "Erreur lors du chargement de vos produits");
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    if (token) {
      fetchUserProfile(token);
      fetchProducts(token);
    } else {
      loadTokenAndUser();
    }
  }, [token]);

  // Photos profil / couverture
  const handlePhotoAction = useCallback((type: "profile" | "cover") => {
    setPhotoModalType(type);
    setPhotoModalVisible(true);
  }, []);

  const closePhotoModal = useCallback(() => {
    setPhotoModalVisible(false);
    setPhotoModalType(null);
    setViewingPhoto(false);
  }, []);

  const handleViewPhoto = useCallback(() => {
    if (!photoModalType || !user) return;
    if (!user[photoModalType === "profile" ? "profile_photo" : "cover_photo"]) {
      Alert.alert(
        "Aucune photo",
        `Aucune photo de ${photoModalType === "profile" ? "profil" : "couverture"} disponible`,
      );
      return;
    }
    setViewingPhoto(true);
  }, [photoModalType, user]);

  const handleChoosePhoto = useCallback(async () => {
    if (!token || !photoModalType) return;
    try {
      const { status } =
        await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== "granted") throw new Error("Permission refusée");

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: photoModalType === "profile" ? [1, 1] : [16, 9],
        quality: 0.7,
      });

      if (result.canceled) return;
      const asset = result.assets[0];
      if (!asset?.uri) throw new Error("Aucune image sélectionnée");

      setUploading(true);
      const formData = new FormData();
      formData.append(
        photoModalType === "profile" ? "profile_photo" : "cover_photo",
        {
          uri: asset.uri,
          name: `photo_${Date.now()}.jpg`,
          type: "image/jpeg",
        } as any,
      );

      const endpoint =
        photoModalType === "profile"
          ? `${BASE_URL}/api/user/profile/photo`
          : `${BASE_URL}/api/user/cover/photo`;

      const response = await axios.put(endpoint, formData, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "multipart/form-data",
        },
      });

      if (response.data.success) {
        await fetchUserProfile(token);
        Alert.alert(
          "Succès",
          `Photo ${photoModalType === "profile" ? "de profil" : "de couverture"} mise à jour`,
        );
      }
    } catch (error: any) {
      console.error("Erreur upload photo:", error);
      Alert.alert(
        "Erreur",
        error.response?.data?.message ||
          error.message ||
          "Échec du téléchargement de l'image",
      );
    } finally {
      setUploading(false);
      closePhotoModal();
    }
  }, [token, photoModalType, closePhotoModal]);

  const formatDateFR = useCallback((dateStr: string) => {
    try {
      return new Date(dateStr).toLocaleDateString("fr-FR", {
        year: "numeric",
        month: "long",
        day: "numeric",
      });
    } catch {
      return dateStr;
    }
  }, []);

  // Gestion de la navigation avec réinitialisation des badges
  const handleNavigation = useCallback(
    (route: string, badgeKey?: keyof typeof badgeCounts) => {
      if (badgeKey) {
        resetBadge(badgeKey);
      }
      router.push(route);
    },
    [router],
  );

  const renderProductItem = useCallback(
    ({ item }: { item: Product }) => (
      <View style={styles.productCard}>
        <Image
          source={{
            uri:
              item.images && item.images.length > 0
                ? item.images[0]
                : "https://via.placeholder.com/150?text=No+Image",
          }}
          style={styles.productImage}
          resizeMode="cover"
        />

        <View style={styles.productProBadge}>
          <Ionicons name="rocket" size={10} color="#FFFFFF" />
          <Text style={styles.productProBadgeText}>PRO</Text>
        </View>

        <View style={styles.productInfoContainer}>
          <Text numberOfLines={2} style={styles.productTitle}>
            {item.title}
          </Text>
          <Text style={styles.productPrice}>
            {Number(item.price).toFixed(2)} $
          </Text>
        </View>

        <TouchableOpacity
          style={styles.menuButton}
          onPress={() =>
            router.push({
              pathname: "/(tabs)/Auth/trois-points-profil/[id]",
              params: {
                id: item.id,
                title: item.title,
                price: item.price,
                imageUrl:
                  item.images && item.images.length > 0 ? item.images[0] : "",
              },
            })
          }
        >
          <Ionicons name="ellipsis-vertical" size={20} color="#A0AEC0" />
        </TouchableOpacity>
      </View>
    ),
    [router],
  );

  if (!user && loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={PRO_BLUE} />
        <Text style={styles.loadingText}>Chargement du profil Pro...</Text>
      </View>
    );
  }

  if (!user) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>Impossible de charger le profil</Text>
        <TouchableOpacity style={styles.retryButton} onPress={loadTokenAndUser}>
          <Text style={styles.retryButtonText}>Réessayer</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.mainContainer}>
      <ScrollView
        style={styles.container}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[PRO_BLUE]}
            tintColor={PRO_BLUE}
          />
        }
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Section Couverture */}
        <View style={styles.coverSection}>
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => handlePhotoAction("cover")}
            style={styles.coverPhotoContainer}
          >
            {user.cover_photo ? (
              <Image
                source={{
                  uri: user.cover_photo.startsWith("http")
                    ? user.cover_photo
                    : `${BASE_URL}${user.cover_photo}`,
                }}
                style={styles.coverPhoto}
              />
            ) : (
              <View style={[styles.coverPhoto, styles.coverPlaceholder]}>
                <MaterialCommunityIcons
                  name="image-edit"
                  size={40}
                  color={PRO_BLUE}
                />
                <Text style={styles.coverPlaceholderText}>
                  Photo de couverture
                </Text>
              </View>
            )}
            <View style={styles.coverOverlay} />

            <View style={styles.coverBadge}>
              <Ionicons name="diamond" size={14} color="#0048ffff" />
              <Text style={styles.coverBadgeText}>PROFIL PRO</Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* Section Profil */}
        <View style={styles.profileSection}>
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => handlePhotoAction("profile")}
            style={styles.profilePhotoContainer}
          >
            {user.profile_photo ? (
              <Image
                source={{
                  uri: user.profile_photo.startsWith("http")
                    ? user.profile_photo
                    : `${BASE_URL}${user.profile_photo}`,
                }}
                style={styles.profilePhoto}
              />
            ) : (
              <View style={[styles.profilePhoto, styles.profilePlaceholder]}>
                <FontAwesome5 name="user-tie" size={40} color={PRO_BLUE} />
              </View>
            )}
            <View style={styles.editPhotoBadge}>
              <Ionicons name="camera" size={14} color="#FFFFFF" />
            </View>
          </TouchableOpacity>

          <View style={styles.userInfoContainer}>
            <View style={styles.nameContainer}>
              <Text style={styles.userName}>{user.fullName}</Text>
              <View style={styles.verifiedBadge}>
                <Ionicons name="checkmark-circle" size={16} color={PRO_BLUE} />
                <Text style={styles.verifiedText}>Vérifié</Text>
              </View>
            </View>

            <View style={styles.memberSinceContainer}>
              <Ionicons name="time" size={14} color={PRO_BLUE} />
              <Text style={styles.memberSince}>
                Membre depuis {formatDateFR(user.date_inscription)}
              </Text>
            </View>

            {user.description && (
              <Text style={styles.description}>{user.description}</Text>
            )}
          </View>
        </View>

        {/* Statistiques */}
        <View style={styles.statsSection}>
          <Text style={styles.sectionTitle}>Performance Business</Text>
          <View style={styles.statsGrid}>
            {[
              {
                value: user.productsCount,
                label: "Produits",
                icon: "cube-outline",
                color: PRO_BLUE,
              },
              {
                value: user.salesCount,
                label: "Ventes",
                icon: "trending-up",
                color: "#4CAF50",
              },
              {
                value: (Number(user.rating) || 0).toFixed(1),
                label: "Note",
                icon: "star",
                color: "#FFA726",
              },
              {
                value: user.ordersCount,
                label: "Commandes",
                icon: "cart",
                color: PRO_BLUE,
              },
            ].map((stat, i) => (
              <View key={i} style={styles.statCard}>
                <View
                  style={[
                    styles.statIconContainer,
                    { backgroundColor: `${stat.color}20` },
                  ]}
                >
                  <Ionicons
                    name={stat.icon as any}
                    size={20}
                    color={stat.color}
                  />
                </View>
                <Text style={styles.statNumber}>{stat.value}</Text>
                <Text style={styles.statLabel}>{stat.label}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Tableau de Bord Pro */}
        <View style={styles.dashboardSection}>
          <Text style={styles.sectionTitle}>Centre de Commande Pro</Text>
          <View style={styles.dashboardGrid}>
            {[
              {
                title: "Statistiques",
                subtitle: "Analyses détaillées",
                icon: "bar-chart",
                color: PRO_BLUE,
                badgeCount: badgeCounts.statistics,
                badgeKey: "statistics" as const,
                route: "/(tabs)/Auth/Profiles/Statistiques",
              },
              {
                title: "Commandes",
                subtitle: "Gestion des ventes",
                icon: "shopping-cart",
                color: "#4CAF50",
                badgeCount: badgeCounts.orders,
                badgeKey: "orders" as const,
                route: "/(tabs)/Auth/Panier/VendeurNotifications",
              },
              {
                title: "Aide & Support",
                subtitle: "Besoin d'assistance ?",
                icon: "headphones",
                color: "#FFA726",
                badgeCount: badgeCounts.messages,
                badgeKey: "messages" as const,
                route: "/(tabs)/Auth/Produits/Support",
              },
              {
                title: "Boost Pro",
                subtitle: "Produits premium",
                icon: "award",
                color: PRO_BLUE,
                route: "/(tabs)/Auth/Profiles/PaymentStatus",
              },
            ].map((item, index) => (
              <TouchableOpacity
                key={index}
                style={styles.dashboardCard}
                onPress={() => handleNavigation(item.route, item.badgeKey)}
              >
                <View style={styles.dashboardCardContent}>
                  <View style={styles.dashboardIconContainer}>
                    <View
                      style={[
                        styles.dashboardIcon,
                        { backgroundColor: `${item.color}15` },
                      ]}
                    >
                      <Feather
                        name={item.icon as any}
                        size={24}
                        color={item.color}
                      />
                      {/* CORRECTION ICI: Utiliser une comparaison explicite > 0 au lieu de && avec un nombre */}
                      {item.badgeCount > 0 && (
                        <NotificationBadge count={item.badgeCount} small />
                      )}
                    </View>
                  </View>
                  <Text style={styles.dashboardTitle}>{item.title}</Text>
                  <Text style={styles.dashboardSubtitle}>{item.subtitle}</Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Menu Actions Rapides */}
        <View style={styles.quickActionsSection}>
          <Text style={styles.sectionTitle}>Actions Rapides</Text>
          <View style={styles.quickActionsGrid}>
            <TouchableOpacity
              style={styles.quickActionButton}
              onPress={async () => {
                resetBadge("boutique");

                try {
                  const token = await AsyncStorage.getItem("userToken");
                  if (!token) {
                    router.push("/splash");
                    return;
                  }

                  const response = await fetch(
                    "https://shopnet-backend.onrender.com/api/boutiques/check",
                    {
                      method: "GET",
                      headers: {
                        Authorization: `Bearer ${token}`,
                        "Content-Type": "application/json",
                      },
                    },
                  );

                  const data = await response.json();

                  if (response.ok && data.success) {
                    router.push("/(tabs)/Auth/Boutique/Boutique");
                  } else {
                    router.push("/(tabs)/Auth/Boutique/Boutique");
                  }
                } catch (error) {
                  console.error("Erreur vérification boutique:", error);
                  Alert.alert(
                    "Erreur",
                    "Impossible de vérifier votre boutique. Réessayez plus tard.",
                  );
                }
              }}
            >
              <View style={styles.quickActionContent}>
                <View style={styles.quickActionIconContainer}>
                  <View
                    style={[
                      styles.quickActionIcon,
                      { backgroundColor: `${PRO_BLUE}15` },
                    ]}
                  >
                    <MaterialIcons name="store" size={24} color={PRO_BLUE} />
                    {/* CORRECTION ICI: Utiliser une comparaison explicite > 0 */}
                    {badgeCounts.boutique > 0 && (
                      <NotificationBadge count={badgeCounts.boutique} small />
                    )}
                  </View>
                </View>
                <Text style={styles.quickActionText}>Boutique</Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.quickActionButton}
              onPress={() => router.push("/(tabs)/Auth/Produits/Produit")}
            >
              <View style={styles.quickActionContent}>
                <View style={styles.quickActionIconContainer}>
                  <View
                    style={[
                      styles.quickActionIcon,
                      { backgroundColor: `${PRO_BLUE}15` },
                    ]}
                  >
                    <Ionicons name="add-circle" size={24} color={PRO_BLUE} />
                  </View>
                </View>
                <Text style={styles.quickActionText}>Ajouter</Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.quickActionButton}
              onPress={() => {
                resetBadge("promotions");
                router.push("/MisAjour");
              }}
            >
              <View style={styles.quickActionContent}>
                <View style={styles.quickActionIconContainer}>
                  <View
                    style={[
                      styles.quickActionIcon,
                      { backgroundColor: `${PRO_BLUE}15` },
                    ]}
                  >
                    <MaterialIcons
                      name="local-offer"
                      size={24}
                      color={PRO_BLUE}
                    />
                    {/* CORRECTION ICI: Utiliser une comparaison explicite > 0 */}
                    {badgeCounts.promotions > 0 && (
                      <NotificationBadge count={badgeCounts.promotions} small />
                    )}
                  </View>
                </View>
                <Text style={styles.quickActionText}>Promotions</Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.quickActionButton}
              onPress={() => {
                resetBadge("settings");
                router.push("/Auth/Produits/parametre");
              }}
            >
              <View style={styles.quickActionContent}>
                <View style={styles.quickActionIconContainer}>
                  <View
                    style={[
                      styles.quickActionIcon,
                      { backgroundColor: `${PRO_BLUE}15` },
                    ]}
                  >
                    <Ionicons name="settings" size={24} color={PRO_BLUE} />
                    {/* CORRECTION ICI: Utiliser une comparaison explicite > 0 */}
                    {badgeCounts.settings > 0 && (
                      <NotificationBadge count={badgeCounts.settings} small />
                    )}
                  </View>
                </View>
                <Text style={styles.quickActionText}>Paramètres</Text>
              </View>
            </TouchableOpacity>
          </View>
        </View>

        {/* Section Produits */}
        <View style={styles.productsSection}>
          <View style={styles.sectionHeader}>
            <View>
              <Text style={styles.sectionTitle}>Mes Produits Pro</Text>
              <Text style={styles.sectionSubtitle}>
                {products.length} produits en ligne
              </Text>
            </View>
            <TouchableOpacity
              style={styles.seeAllButton}
              onPress={() => router.push("/MisAjour")}
            >
              <Text style={styles.seeAllText}>Voir tout</Text>
              <Ionicons name="arrow-forward" size={16} color={PRO_BLUE} />
            </TouchableOpacity>
          </View>

          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={PRO_BLUE} />
              <Text style={styles.loadingText}>Chargement des produits...</Text>
            </View>
          ) : products.length > 0 ? (
            <FlatList
              data={products}
              renderItem={renderProductItem}
              keyExtractor={(item) => item.id.toString()}
              numColumns={2}
              columnWrapperStyle={styles.productRow}
              scrollEnabled={false}
              showsVerticalScrollIndicator={false}
            />
          ) : (
            <View style={styles.emptyContainer}>
              <View style={styles.emptyIcon}>
                <Ionicons name="cube-outline" size={64} color={PRO_BLUE} />
              </View>
              <Text style={styles.emptyTitle}>Aucun produit en vente</Text>
              <Text style={styles.emptySubtitle}>
                Commencez à vendre dès maintenant
              </Text>
              <TouchableOpacity
                style={styles.addProductButton}
                onPress={() => router.push("/(tabs)/Auth/Produits/Produit")}
              >
                <Ionicons name="add" size={20} color="#FFFFFF" />
                <Text style={styles.addProductButtonText}>
                  Créer un produit
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </ScrollView>

      <PhotoModalComponent
        visible={photoModalVisible && !viewingPhoto}
        type={photoModalType}
        hasPhoto={
          !!user?.[
            photoModalType === "profile" ? "profile_photo" : "cover_photo"
          ]
        }
        uploading={uploading}
        onView={handleViewPhoto}
        onChoose={handleChoosePhoto}
        onClose={closePhotoModal}
      />

      <FullscreenPhotoModalComponent
        visible={viewingPhoto}
        photoUri={
          photoModalType === "profile"
            ? user.profile_photo
            : photoModalType === "cover"
              ? user.cover_photo
              : null
        }
        onClose={closePhotoModal}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  mainContainer: {
    flex: 1,
    backgroundColor: SHOPNET_BLUE,
  },
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 40,
  },
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: SHOPNET_BLUE,
    padding: 20,
  },
  loadingText: {
    color: PRO_BLUE,
    fontSize: 16,
    marginTop: 12,
    fontWeight: "600",
  },
  errorText: {
    color: "#FFFFFF",
    fontSize: 18,
    marginBottom: 20,
    textAlign: "center",
  },
  retryButton: {
    backgroundColor: PRO_BLUE,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    elevation: 4,
  },
  retryButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },
  coverSection: {
    marginBottom: 0,
  },
  coverPhotoContainer: {
    height: 220,
    backgroundColor: "#1a2530",
    position: "relative",
    overflow: "hidden",
  },
  coverPhoto: {
    width: "100%",
    height: "100%",
  },
  coverOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.2)",
  },
  coverPlaceholder: {
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#1a2530",
  },
  coverPlaceholderText: {
    color: PRO_BLUE,
    marginTop: 8,
    fontSize: 14,
    fontWeight: "500",
  },
  coverBadge: {
    position: "absolute",
    top: 16,
    right: 16,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(0, 0, 0, 0.7)",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: PRO_BLUE,
  },
  coverBadgeText: {
    color: "#FFFFFF",
    fontSize: 10,
    fontWeight: "700",
    marginLeft: 4,
    letterSpacing: 0.5,
  },
  profileSection: {
    flexDirection: "row",
    alignItems: "flex-start",
    paddingHorizontal: 20,
    marginTop: -80,
    marginBottom: 24,
  },
  profilePhotoContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 4,
    borderColor: SHOPNET_BLUE,
    backgroundColor: "#1a2530",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
    position: "relative",
  },
  profilePhoto: {
    width: "100%",
    height: "100%",
    borderRadius: 60,
  },
  profilePlaceholder: {
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#1a2530",
  },
  editPhotoBadge: {
    position: "absolute",
    bottom: 4,
    right: 4,
    backgroundColor: PRO_BLUE,
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: SHOPNET_BLUE,
  },
  userInfoContainer: {
    flex: 1,
    marginLeft: 20,
    marginTop: 20,
  },
  nameContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 6,
  },
  userName: {
    fontSize: 24,
    fontWeight: "800",
    color: "#FFFFFF",
    marginRight: 8,
  },
  verifiedBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(66, 165, 245, 0.1)",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  verifiedText: {
    color: PRO_BLUE,
    fontSize: 10,
    fontWeight: "700",
    marginLeft: 2,
  },
  memberSinceContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
  },
  memberSince: {
    fontSize: 14,
    color: PRO_BLUE,
    fontWeight: "500",
    marginLeft: 4,
  },
  description: {
    fontSize: 15,
    color: "#E2E8F0",
    lineHeight: 22,
  },
  statsSection: {
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: "#FFFFFF",
    letterSpacing: 0.5,
    marginBottom: 16,
  },
  statsGrid: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  statCard: {
    alignItems: "center",
    backgroundColor: "rgba(30, 42, 59, 0.9)",
    borderRadius: 16,
    padding: 16,
    flex: 1,
    marginHorizontal: 4,
    borderWidth: 1,
    borderColor: "rgba(66, 165, 245, 0.1)",
  },
  statIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 8,
  },
  statNumber: {
    fontSize: 18,
    fontWeight: "800",
    color: "#FFFFFF",
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: "#A0AEC0",
    fontWeight: "500",
  },
  dashboardSection: {
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  dashboardGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },
  dashboardCard: {
    width: "48%",
    backgroundColor: "rgba(30, 42, 59, 0.9)",
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "rgba(66, 165, 245, 0.1)",
  },
  dashboardCardContent: {
    alignItems: "center",
  },
  dashboardIconContainer: {
    position: "relative",
  },
  dashboardIcon: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 12,
  },
  dashboardTitle: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
    textAlign: "center",
    marginBottom: 4,
  },
  dashboardSubtitle: {
    color: "#A0AEC0",
    fontSize: 12,
    textAlign: "center",
  },
  quickActionsSection: {
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  quickActionsGrid: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  quickActionButton: {
    alignItems: "center",
    flex: 1,
    marginHorizontal: 4,
  },
  quickActionContent: {
    alignItems: "center",
  },
  quickActionIconContainer: {
    position: "relative",
  },
  quickActionIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 8,
  },
  quickActionText: {
    color: "#E2E8F0",
    fontSize: 12,
    fontWeight: "500",
    textAlign: "center",
  },
  productsSection: {
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: PRO_BLUE,
    fontWeight: "500",
    marginTop: 2,
  },
  seeAllButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(66, 165, 245, 0.1)",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  seeAllText: {
    color: PRO_BLUE,
    fontSize: 14,
    fontWeight: "600",
    marginRight: 4,
  },
  productRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  productCard: {
    width: "48%",
    backgroundColor: "rgba(30, 42, 59, 0.9)",
    borderRadius: 16,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(66, 165, 245, 0.1)",
    position: "relative",
  },
  productImage: {
    width: "100%",
    height: 140,
    backgroundColor: "#2C3A4A",
  },
  productProBadge: {
    position: "absolute",
    top: 8,
    left: 8,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: PRO_BLUE,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    zIndex: 2,
  },
  productProBadgeText: {
    color: "#FFFFFF",
    fontSize: 8,
    fontWeight: "800",
    marginLeft: 2,
  },
  productInfoContainer: {
    padding: 12,
  },
  productTitle: {
    color: "#E2E8F0",
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 6,
    lineHeight: 18,
  },
  productPrice: {
    color: PRO_BLUE,
    fontSize: 16,
    fontWeight: "800",
  },
  menuButton: {
    position: "absolute",
    top: 8,
    right: 8,
    zIndex: 10,
    padding: 4,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    borderRadius: 12,
  },
  loadingContainer: {
    alignItems: "center",
    padding: 40,
  },
  emptyContainer: {
    alignItems: "center",
    padding: 40,
    backgroundColor: "rgba(30, 42, 59, 0.5)",
    borderRadius: 16,
    marginTop: 8,
  },
  emptyIcon: {
    marginBottom: 16,
  },
  emptyTitle: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 8,
    textAlign: "center",
  },
  emptySubtitle: {
    color: "#A0AEC0",
    fontSize: 14,
    textAlign: "center",
    marginBottom: 20,
  },
  addProductButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: PRO_BLUE,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    elevation: 4,
  },
  addProductButtonText: {
    color: "#FFFFFF",
    fontWeight: "700",
    marginLeft: 6,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.8)",
  },
  modalContent: {
    backgroundColor: "#1a2530",
    borderRadius: 16,
    padding: 24,
    width: "80%",
    borderWidth: 1,
    borderColor: PRO_BLUE,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#FFFFFF",
    marginBottom: 20,
    textAlign: "center",
  },
  modalBtn: {
    backgroundColor: PRO_BLUE,
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    elevation: 4,
  },
  modalBtnContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  disabledBtn: {
    backgroundColor: "#3A4A5A",
    opacity: 0.6,
  },
  cancelBtn: {
    backgroundColor: "#3A4A5A",
  },
  modalBtnText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
    marginLeft: 8,
  },
  fullscreenPhotoContainer: {
    flex: 1,
    backgroundColor: "black",
    justifyContent: "center",
    alignItems: "center",
    position: "relative",
  },
  fullscreenPhoto: {
    width: "100%",
    height: "100%",
  },
  fullscreenPlaceholder: {
    justifyContent: "center",
    alignItems: "center",
  },
  fullscreenPlaceholderText: {
    color: "#FFFFFF",
    fontSize: 18,
    marginTop: 20,
  },
  closePhotoButton: {
    position: "absolute",
    top: 50,
    right: 20,
    zIndex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    borderRadius: 20,
    padding: 8,
  },
  badge: {
    position: "absolute",
    top: -5,
    right: -5,
    backgroundColor: NOTIFICATION_RED,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
    zIndex: 100,
  },
  smallBadge: {
    minWidth: 18,
    height: 18,
    top: -3,
    right: -3,
    borderRadius: 9,
  },
  regularBadge: {
    minWidth: 22,
    height: 22,
    borderRadius: 11,
  },
  badgeText: {
    color: "#FFFFFF",
    fontWeight: "bold",
    textAlign: "center",
  },
  smallBadgeText: {
    fontSize: 10,
  },
  regularBadgeText: {
    fontSize: 12,
  },
});
