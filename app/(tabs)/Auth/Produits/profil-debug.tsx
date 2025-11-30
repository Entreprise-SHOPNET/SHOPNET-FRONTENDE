


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
  Linking,
  Modal,
  Dimensions,
  FlatList,
  Animated,
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
  Entypo,
  MaterialCommunityIcons,
} from "@expo/vector-icons";
 

const BASE_URL = "http://100.64.134.89:5000";
const { width } = Dimensions.get("window");
const PRO_BLUE = "#42A5F5";
const SHOPNET_BLUE = "#00182A";

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

  // Animations
  const fadeAnim = useState(new Animated.Value(0))[0];
  const slideAnim = useState(new Animated.Value(30))[0];
  const scaleAnim = useState(new Animated.Value(0.9))[0];

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

      // Lancement des animations
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
        Animated.spring(scaleAnim, {
          toValue: 1,
          tension: 50,
          friction: 7,
          useNativeDriver: true,
        }),
      ]).start();
    } catch (error) {
      console.error("Erreur chargement token/profil:", error);
      Alert.alert("Erreur", "Impossible de récupérer l'utilisateur.");
    }
  }, [router]);

  useEffect(() => {
    loadTokenAndUser();
  }, [loadTokenAndUser]);

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
    if (token) {
      fetchUserProfile(token);
      fetchProducts(token);
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
  }, [token, photoModalType, closePhotoModal, fetchUserProfile]);

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

  const renderProductItem = useCallback(
    ({ item }: { item: Product }) => (
      <Animated.View
        style={[
          styles.productCard,
          {
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }],
          },
        ]}
      >
        {/* Image du produit */}
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

        {/* Badge Pro sur produit */}
        <View style={styles.productProBadge}>
          <Ionicons name="rocket" size={10} color="#fff" />
          <Text style={styles.productProBadgeText}>PRO</Text>
        </View>

        {/* Info produit */}
        <View style={styles.productInfoContainer}>
          <Text numberOfLines={2} style={styles.productTitle}>
            {item.title}
          </Text>
          <Text style={styles.productPrice}>
            {Number(item.price).toFixed(2)} $
          </Text>
        </View>

        {/* Bouton trois points */}
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
      </Animated.View>
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
      {/* Background Effects */}
      <View style={styles.backgroundEffects}>
        <View style={styles.glowCircle1} />
        <View style={styles.glowCircle2} />
      </View>

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
        {/* Section Couverture VIP */}
        <Animated.View
          style={[
            styles.coverSection,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }],
            },
          ]}
        >
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

            {/* Badge VIP sur couverture */}
            <View style={styles.coverBadge}>
              <Ionicons name="diamond" size={14} color="#FFD700" />
              <Text style={styles.coverBadgeText}>PROFIL PRO</Text>
            </View>
          </TouchableOpacity>
        </Animated.View>

        {/* Section Profil Premium */}
        <Animated.View
          style={[
            styles.profileSection,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }],
            },
          ]}
        >
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
            {/* Badge édition photo */}
            <View style={styles.editPhotoBadge}>
              <Ionicons name="camera" size={14} color="#fff" />
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

            <Text style={styles.memberSince}>
              <Ionicons name="time" size={14} color={PRO_BLUE} /> Membre depuis{" "}
              {formatDateFR(user.date_inscription)}
            </Text>

            {user.description && (
              <Text style={styles.description}>{user.description}</Text>
            )}
          </View>
        </Animated.View>

        {/* Statistiques VIP */}
        <Animated.View
          style={[
            styles.statsSection,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }],
            },
          ]}
        >
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
        </Animated.View>

        {/* Tableau de Bord Pro */}
        <Animated.View
          style={[
            styles.dashboardSection,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }],
            },
          ]}
        >
          <Text style={styles.sectionTitle}>Centre de Commande Pro</Text>
          <View style={styles.dashboardGrid}>
            {[
              {
                title: "Statistiques",
                subtitle: "Analyses détaillées",
                icon: "bar-chart",
                color: PRO_BLUE,
                onPress: () =>
                  router.push("/(tabs)/Auth/Profiles/Statistiques"),
              },
              {
                title: "Commandes",
                subtitle: "Gestion des ventes",
                icon: "shopping-cart",
                color: "#4CAF50",
                onPress: () =>
                  router.push("/(tabs)/Auth/Panier/VendeurNotifications"),
              },
              {
                title: "Messages",
                subtitle: "Support clients",
                icon: "message-square",
                color: "#FFA726",
                onPress: () => router.push("/MisAjour"),
              },
              {
                title: "Avis",
                subtitle: "Réputation",
                icon: "star",
                color: PRO_BLUE,
                onPress: () => router.push("/MisAjour"),
              },
            ].map((item, index) => (
              <TouchableOpacity
                key={index}
                style={styles.dashboardCard}
                onPress={item.onPress}
              >
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
                </View>
                <Text style={styles.dashboardTitle}>{item.title}</Text>
                <Text style={styles.dashboardSubtitle}>{item.subtitle}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </Animated.View>

        {/* Menu Actions Rapides */}
        <Animated.View
          style={[
            styles.quickActionsSection,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }],
            },
          ]}
        >
          <Text style={styles.sectionTitle}>Actions Rapides</Text>
          <View style={styles.quickActionsGrid}>
            <TouchableOpacity
              style={styles.quickActionButton}
              onPress={async () => {
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
                    router.push("/(tabs)/Auth/Boutique/MaBoutique");
                  } else {
                    router.push("/(tabs)/Auth/Boutique/CreerBoutique");
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
              <View
                style={[
                  styles.quickActionIcon,
                  { backgroundColor: `${PRO_BLUE}15` },
                ]}
              >
                <MaterialIcons name="store" size={24} color={PRO_BLUE} />
              </View>
              <Text style={styles.quickActionText}>Boutique</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.quickActionButton}
              onPress={() => router.push("/(tabs)/Auth/Produits/Produit")}
            >
              <View
                style={[
                  styles.quickActionIcon,
                  { backgroundColor: `${PRO_BLUE}15` },
                ]}
              >
                <Ionicons name="add-circle" size={24} color={PRO_BLUE} />
              </View>
              <Text style={styles.quickActionText}>Ajouter</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.quickActionButton}
              onPress={() => router.push("/MisAjour")}
            >
              <View
                style={[
                  styles.quickActionIcon,
                  { backgroundColor: `${PRO_BLUE}15` },
                ]}
              >
                <MaterialIcons name="local-offer" size={24} color={PRO_BLUE} />
              </View>
              <Text style={styles.quickActionText}>Promotions</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.quickActionButton}
              onPress={() => router.push("/Auth/Produits/parametre")}
            >
              <View
                style={[
                  styles.quickActionIcon,
                  { backgroundColor: `${PRO_BLUE}15` },
                ]}
              >
                <Ionicons name="settings" size={24} color={PRO_BLUE} />
              </View>
              <Text style={styles.quickActionText}>Paramètres</Text>
            </TouchableOpacity>
          </View>
        </Animated.View>

        {/* Section Produits VIP */}
        <Animated.View
          style={[
            styles.productsSection,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }],
            },
          ]}
        >
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
                <Ionicons name="add" size={20} color="#fff" />
                <Text style={styles.addProductButtonText}>
                  Créer un produit
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </Animated.View>
      </ScrollView>

      <PhotoModal
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

      <FullscreenPhotoModal
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

// Modaux Photo (gardés identiques mais avec styles améliorés)
const PhotoModal = ({
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
          <Ionicons name="eye" size={20} color="#fff" />
          <Text style={styles.modalBtnText}>Voir la photo</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.modalBtn}
          onPress={onChoose}
          disabled={uploading}
        >
          {uploading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Ionicons name="image" size={20} color="#fff" />
              <Text style={styles.modalBtnText}>Choisir une photo</Text>
            </>
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

const FullscreenPhotoModal = ({
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
        <Ionicons name="close" size={30} color="#fff" />
      </TouchableOpacity>
      {photoUri && (
        <Image
          source={{
            uri: photoUri.startsWith("http")
              ? photoUri
              : `${BASE_URL}${photoUri}`,
          }}
          style={styles.fullscreenPhoto}
          resizeMode={photoUri.includes("cover") ? "cover" : "contain"}
        />
      )}
    </View>
  </Modal>
);

// Styles VIP Pro
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
  backgroundEffects: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  glowCircle1: {
    position: "absolute",
    top: "10%",
    right: "10%",
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: "rgba(66, 165, 245, 0.03)",
  },
  glowCircle2: {
    position: "absolute",
    bottom: "20%",
    left: "5%",
    width: 150,
    height: 150,
    borderRadius: 75,
    backgroundColor: "rgba(66, 165, 245, 0.02)",
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
    color: "#fff",
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
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },

  // Cover Section
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
    color: "#fff",
    fontSize: 10,
    fontWeight: "700",
    marginLeft: 4,
    letterSpacing: 0.5,
  },

  // Profile Section
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
    color: "#fff",
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
  memberSince: {
    fontSize: 14,
    color: PRO_BLUE,
    marginBottom: 10,
    fontWeight: "500",
  },
  description: {
    fontSize: 15,
    color: "#E2E8F0",
    lineHeight: 22,
  },

  // Stats Section
  statsSection: {
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  statsGrid: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 16,
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
    color: "#fff",
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: "#A0AEC0",
    fontWeight: "500",
  },

  // Dashboard Section
  dashboardSection: {
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  dashboardGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    marginTop: 16,
  },
  dashboardCard: {
    width: "48%",
    backgroundColor: "rgba(30, 42, 59, 0.9)",
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(66, 165, 245, 0.1)",
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
    color: "#fff",
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

  // Quick Actions
  quickActionsSection: {
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  quickActionsGrid: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 16,
  },
  quickActionButton: {
    alignItems: "center",
    flex: 1,
    marginHorizontal: 4,
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

  // Products Section
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
  sectionTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: "#fff",
    letterSpacing: 0.5,
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
    color: "#fff",
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
    color: "#fff",
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
  emptyText: {
    color: "#A0AEC0",
    textAlign: "center",
    marginTop: 20,
    fontSize: 16,
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
    color: "#fff",
    fontWeight: "700",
    marginLeft: 6,
  },

  // Modal Styles
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
    color: "#fff",
    marginBottom: 20,
    textAlign: "center",
  },
  modalBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: PRO_BLUE,
    padding: 16,
    borderRadius: 12,
    alignItems: "center",
    marginBottom: 12,
    elevation: 4,
  },
  disabledBtn: {
    backgroundColor: "#3A4A5A",
    opacity: 0.6,
  },
  cancelBtn: {
    backgroundColor: "#3A4A5A",
  },
  modalBtnText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
    marginLeft: 8,
    flex: 1,
    textAlign: "center",
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
  closePhotoButton: {
    position: "absolute",
    top: 50,
    right: 20,
    zIndex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    borderRadius: 20,
    padding: 8,
  },
});
