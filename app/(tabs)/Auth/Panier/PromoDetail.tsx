
// panier/Promoetail.tsx
import React, { useEffect, useState, useRef } from "react";
import {
  View,
  Text,
  Image,
  ActivityIndicator,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Dimensions,
  Linking,
  FlatList,
  Modal,
  Animated,
  SafeAreaView,
  StatusBar,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons, MaterialIcons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";

// 🔹 Serveur Render en production
const LOCAL_API = "https://shopnet-backend.onrender.com/api";
// 🔹 Serveur local pour développement (commenté)
// const LOCAL_API = "http://100.64.134.89:5000/api";



const COMMAND_API_URL = `${LOCAL_API}/commandes`;
const PANIER_API_URL = `${LOCAL_API}/cart`;
const PROMOTIONS_API_URL = `${LOCAL_API}/promotions`;

const { width, height } = Dimensions.get("window");

// Couleurs SHOPNET PRO VIP
const SHOPNET_BLUE = "#00182A";
const PRO_BLUE = "#42A5F5";
const PREMIUM_GOLD = "#FFD700";
const CARD_BG = "#1E2A3B";
const TEXT_WHITE = "#FFFFFF";
const TEXT_SECONDARY = "#A0AEC0";
const SUCCESS_GREEN = "#4CAF50";
const ERROR_RED = "#FF6B6B";
const WARNING_ORANGE = "#FFA726";
const WHATSAPP_GREEN = "#25D366";

const formatPrice = (price: any) => {
  const n = Number(price);
  return isNaN(n) ? "N/A" : n.toFixed(2);
};

const calculateDiscount = (original: number, promo: number) => {
  return Math.round(((original - promo) / original) * 100);
};

const formatPhoneNumber = (phone: string) => {
  if (!phone) return "";
  let cleaned = phone.trim().replace(/\D/g, "");
  if (cleaned.startsWith("0")) cleaned = "243" + cleaned.substring(1);
  return cleaned;
};

const calculateTimeRemaining = (createdAt: string, durationDays: number): string => {
  const createdDate = new Date(createdAt);
  const endDate = new Date(createdDate.getTime() + durationDays * 24 * 60 * 60 * 1000);
  const now = new Date();
  const diffMs = endDate.getTime() - now.getTime();
  
  if (diffMs <= 0) return 'Expirée';
  
  const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  
  if (days > 0) return `${days} jours ${hours}h`;
  return `${hours} heures`;
};

const parsePromotionImages = (images: string[] | string): string[] => {
  if (Array.isArray(images)) {
    return images;
  }
  
  if (typeof images === 'string') {
    try {
      const parsed = JSON.parse(images);
      return Array.isArray(parsed) ? parsed : [images];
    } catch (error) {
      return [images];
    }
  }
  
  return [];
};

const getValidToken = async () => {
  try {
    const token = await AsyncStorage.getItem("userToken");
    return token || null;
  } catch {
    return null;
  }
};

type Promotion = {
  promotionId: number;
  product_id: number;
  product_title: string;
  original_price: number;
  promo_price: number;
  description: string;
  duration_days: number;
  created_at: string;
  images: string[] | string;
  time_remaining?: string;
  seller?: {
    name: string;
    phone: string;
    email?: string;
    address?: string;
    rating?: number;
  };
  category?: string;
};

export default function PromoDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [promotion, setPromotion] = useState<Promotion | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [similarPromotions, setSimilarPromotions] = useState<Promotion[]>([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [activeImageIndex, setActiveImageIndex] = useState(0);

  // Animations
  const [notificationVisible, setNotificationVisible] = useState(false);
  const [notificationMessage, setNotificationMessage] = useState("");
  const notificationPosition = useRef(new Animated.Value(-100)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;

  const showNotification = (message: string) => {
    setNotificationMessage(message);
    setNotificationVisible(true);

    Animated.sequence([
      Animated.timing(notificationPosition, {
        toValue: 60,
        duration: 400,
        useNativeDriver: true,
      }),
      Animated.delay(2000),
      Animated.timing(notificationPosition, {
        toValue: -100,
        duration: 400,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setNotificationVisible(false);
    });
  };

  const fetchPromotion = async () => {
    setLoading(true);
    try {
      const token = await getValidToken();
      
      // Récupérer toutes les promotions
      const promotionsResponse = await axios.get(PROMOTIONS_API_URL, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (promotionsResponse.data.success) {
        const allPromotions = promotionsResponse.data.promotions.map((promo: Promotion) => ({
          ...promo,
          time_remaining: calculateTimeRemaining(promo.created_at, promo.duration_days),
          images: parsePromotionImages(promo.images)
        }));

        // Trouver la promotion correspondant au product_id
        const currentPromotion = allPromotions.find((promo: Promotion) => 
          promo.product_id === Number(id) || promo.promotionId === Number(id)
        );

        if (currentPromotion) {
          setPromotion(currentPromotion);
          
          // Récupérer les informations du vendeur via l'API produit
          try {
            const productResponse = await axios.get(`${LOCAL_API}/products/${currentPromotion.product_id}`, {
              headers: { Authorization: `Bearer ${token}` },
            });
            
            if (productResponse.data.success) {
              const productData = productResponse.data.product;
              setPromotion(prev => ({
                ...prev!,
                seller: productData.seller,
                category: productData.category
              }));
            }
          } catch (error) {
            console.log("Erreur récupération produit:", error);
          }

          // Trouver des promotions similaires (même catégorie ou autres promotions)
          const similar = allPromotions
            .filter((promo: Promotion) => 
              promo.product_id !== currentPromotion.product_id && 
              promo.promotionId !== currentPromotion.promotionId
            )
            .slice(0, 10);
          
          setSimilarPromotions(similar);

          // Animation d'entrée
          Animated.parallel([
            Animated.timing(fadeAnim, {
              toValue: 1,
              duration: 600,
              useNativeDriver: true,
            }),
            Animated.timing(slideAnim, {
              toValue: 0,
              duration: 500,
              useNativeDriver: true,
            }),
          ]).start();
        } else {
          setError("Promotion non trouvée");
        }
      } else {
        setError("Erreur lors du chargement des promotions");
      }
    } catch (error) {
      console.error("Erreur fetchPromotion:", error);
      setError("Erreur de connexion au serveur");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (id) {
      fetchPromotion();
    }
  }, [id]);

  const openWhatsApp = () => {
    const rawPhone = promotion?.seller?.phone || "";
    if (!rawPhone) {
      showNotification("📞 Numéro WhatsApp non disponible");
      return;
    }
    const phone = formatPhoneNumber(rawPhone);
    const images = parsePromotionImages(promotion?.images || []);
    const imageUrl = images[0] || "";
    const message = `Bonjour, je suis intéressé par la promotion "${promotion?.product_title}" sur SHOPNET. Prix original: $${promotion?.original_price}, Prix promo: $${promotion?.promo_price}. Voici l'image : ${imageUrl}`;
    const url = `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
    Linking.openURL(url).catch(() =>
      showNotification("❌ Impossible d'ouvrir WhatsApp"),
    );
  };

  const commanderProduit = async () => {
    if (!promotion) return;
    
    try {
      const token = await getValidToken();
      if (!token) {
        showNotification("🔐 Veuillez vous connecter pour commander");
        return;
      }

      const body = {
        produits: [{ produit_id: promotion.product_id, quantite: 1 }],
        adresse_livraison: "Adresse par défaut",
        mode_paiement: "especes",
        commentaire: "Commande promotion depuis l'application SHOPNET PRO",
      };

      const res = await fetch(COMMAND_API_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(body),
      });
      const data = await res.json();

      if (data.success) {
        showNotification("✅ Commande envoyée avec succès !");
      } else {
        showNotification(data.error || "❌ Erreur lors de la commande");
      }
    } catch {
      showNotification("❌ Erreur réseau ou serveur");
    }
  };

  const ajouterAuPanier = async () => {
    if (!promotion) return;
    
    try {
      const token = await getValidToken();
      if (!token) {
        showNotification("🔐 Veuillez vous connecter pour ajouter au panier");
        return;
      }

      const images = parsePromotionImages(promotion.images || []);
      
      const body = {
        product_id: promotion.product_id,
        title: promotion.product_title,
        description: promotion.description || "",
        price: promotion.promo_price,
        original_price: promotion.original_price,
        category: promotion.category || "Promotion",
        condition: "new",
        quantity: 1,
        stock: 1,
        location: promotion.seller?.address || "",
        delivery_options: {},
        images: images,
        seller_id: promotion.seller?.name || "",
        seller_name: promotion.seller?.name || "",
        seller_rating: promotion.seller?.rating || 0,
      };

      const res = await fetch(PANIER_API_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(body),
      });

      const data = await res.json();

      if (data.success) {
        showNotification("🛒 Promotion ajoutée au panier !");
      } else {
        showNotification(
          data.message || data.error || "❌ Erreur lors de l'ajout",
        );
      }
    } catch (err) {
      showNotification("❌ Erreur réseau ou serveur");
    }
  };

  const showImage = (url: string, index: number) => {
    setSelectedImage(url);
    setActiveImageIndex(index);
    setModalVisible(true);
  };

  const navigateToImage = (direction: "prev" | "next") => {
    const images = parsePromotionImages(promotion?.images || []);
    if (images.length <= 1) return;

    let newIndex;
    if (direction === "next") {
      newIndex = (activeImageIndex + 1) % images.length;
    } else {
      newIndex = (activeImageIndex - 1 + images.length) % images.length;
    }

    setActiveImageIndex(newIndex);
    setSelectedImage(images[newIndex]);
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <StatusBar backgroundColor={SHOPNET_BLUE} barStyle="light-content" />
        <ActivityIndicator size="large" color={PRO_BLUE} />
        <Text style={styles.loadingText}>Chargement de la promotion...</Text>
      </SafeAreaView>
    );
  }

  if (error || !promotion) {
    return (
      <SafeAreaView style={styles.errorContainer}>
        <StatusBar backgroundColor={SHOPNET_BLUE} barStyle="light-content" />
        <Ionicons name="alert-circle" size={80} color={ERROR_RED} />
        <Text style={styles.errorTitle}>Erreur</Text>
        <Text style={styles.errorText}>{error || "Promotion non trouvée"}</Text>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backButton}
          activeOpacity={0.8}
        >
          <Ionicons name="arrow-back" size={20} color={TEXT_WHITE} />
          <Text style={styles.backButtonText}>Retour</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  const images = parsePromotionImages(promotion.images || []);
  const discount = calculateDiscount(promotion.original_price, promotion.promo_price);
  const formattedCreatedAt = new Date(promotion.created_at).toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar backgroundColor={SHOPNET_BLUE} barStyle="light-content" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Ionicons name="chevron-back" size={28} color={PRO_BLUE} />
        </TouchableOpacity>

        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Détails Promotion</Text>
          <Text style={styles.headerSubtitle}>SHOPNET PROMO</Text>
        </View>

        <View style={styles.headerRight} />
      </View>

      {/* Notification */}
      {notificationVisible && (
        <Animated.View
          style={[
            styles.notificationContainer,
            {
              transform: [{ translateY: notificationPosition }],
            },
          ]}
        >
          <View style={styles.notificationContent}>
            <Ionicons name="checkmark-circle" size={24} color={SUCCESS_GREEN} />
            <Text style={styles.notificationText}>{notificationMessage}</Text>
          </View>
        </Animated.View>
      )}

      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
      >
        {/* Gallery d'images */}
        <Animated.View
          style={[
            styles.imageSection,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }],
            },
          ]}
        >
          {images.length > 0 ? (
            <>
              <TouchableOpacity
                onPress={() => showImage(images[0], 0)}
                activeOpacity={0.9}
              >
                <Image
                  source={{ uri: images[0] }}
                  style={styles.mainImage}
                  resizeMode="cover"
                />
              </TouchableOpacity>

              {images.length > 1 && (
                <FlatList
                  data={images.slice(1)}
                  renderItem={({ item, index }) => (
                    <TouchableOpacity
                      onPress={() => showImage(item, index + 1)}
                      activeOpacity={0.8}
                    >
                      <Image source={{ uri: item }} style={styles.thumbnail} />
                    </TouchableOpacity>
                  )}
                  keyExtractor={(_, idx) => (idx + 1).toString()}
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.thumbnailsContainer}
                />
              )}
            </>
          ) : (
            <View style={styles.noImageContainer}>
              <Ionicons name="image-outline" size={60} color={TEXT_SECONDARY} />
              <Text style={styles.noImageText}>Aucune image disponible</Text>
            </View>
          )}
        </Animated.View>

        {/* Contenu principal */}
        <Animated.View
          style={[
            styles.content,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }],
            },
          ]}
        >
          {/* Titre et Catégorie */}
          <View style={styles.titleSection}>
            <Text style={styles.title}>{promotion.product_title}</Text>
            
            <View style={styles.promotionHeader}>
              <View style={styles.categoryBadge}>
                <Ionicons name="pricetag" size={16} color={PRO_BLUE} />
                <Text style={styles.category}>{promotion.category || "Promotion"}</Text>
              </View>
              
              <View style={styles.promotionTimer}>
                <Ionicons name="timer-outline" size={14} color={ERROR_RED} />
                <Text style={styles.promotionTimerText}>
                  {promotion.time_remaining || calculateTimeRemaining(promotion.created_at, promotion.duration_days)}
                </Text>
              </View>
            </View>
          </View>

          {/* Prix et informations promotion */}
          <View style={styles.promotionInfoSection}>
            <View style={styles.promotionPrices}>
              <Text style={styles.originalPrice}>${formatPrice(promotion.original_price)}</Text>
              <Text style={styles.promoPrice}>${formatPrice(promotion.promo_price)}</Text>
              <View style={styles.discountBadge}>
                <Text style={styles.discountText}>-{discount}%</Text>
              </View>
            </View>
            
            <View style={styles.promotionMeta}>
              <View style={styles.metaItem}>
                <Ionicons name="calendar-outline" size={16} color={TEXT_SECONDARY} />
                <Text style={styles.metaText}>Créée le: {formattedCreatedAt}</Text>
              </View>
              
              <View style={styles.metaItem}>
                <Ionicons name="time-outline" size={16} color={TEXT_SECONDARY} />
                <Text style={styles.metaText}>Durée: {promotion.duration_days} jours</Text>
              </View>
            </View>
          </View>

          {/* Description */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Ionicons name="document-text" size={20} color={PRO_BLUE} />
              <Text style={styles.sectionTitle}>Description de la promotion</Text>
            </View>
            <Text style={styles.description}>
              {promotion.description || "Aucune description disponible pour cette promotion."}
            </Text>
          </View>

          {/* Informations Vendeur */}
          {promotion.seller && (
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Ionicons name="business" size={20} color={PRO_BLUE} />
                <Text style={styles.sectionTitle}>Vendeur</Text>
              </View>

              <View style={styles.sellerCard}>
                <View style={styles.sellerInfo}>
                  <View style={styles.sellerRow}>
                    <Ionicons name="person" size={18} color={TEXT_SECONDARY} />
                    <Text style={styles.sellerText}>
                      {promotion.seller.name || "Vendeur SHOPNET"}
                    </Text>
                  </View>

                  {promotion.seller.phone && (
                    <View style={styles.sellerRow}>
                      <Ionicons name="call" size={18} color={TEXT_SECONDARY} />
                      <Text style={styles.sellerText}>
                        {promotion.seller.phone}
                      </Text>
                    </View>
                  )}

                  {promotion.seller.email && (
                    <View style={styles.sellerRow}>
                      <Ionicons name="mail" size={18} color={TEXT_SECONDARY} />
                      <Text style={styles.sellerText}>
                        {promotion.seller.email}
                      </Text>
                    </View>
                  )}

                  {promotion.seller.address && (
                    <View style={styles.sellerRow}>
                      <Ionicons
                        name="location"
                        size={18}
                        color={TEXT_SECONDARY}
                      />
                      <Text style={styles.sellerText}>
                        {promotion.seller.address}
                      </Text>
                    </View>
                  )}

                  {promotion.seller.rating && (
                    <View style={styles.sellerRating}>
                      <Ionicons name="star" size={16} color={PREMIUM_GOLD} />
                      <Text style={styles.sellerRatingText}>
                        {promotion.seller.rating.toFixed(1)}
                      </Text>
                    </View>
                  )}
                </View>
              </View>
            </View>
          )}

          {/* Actions Rapides */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Ionicons name="flash" size={20} color={PREMIUM_GOLD} />
              <Text style={styles.sectionTitle}>Actions Rapides</Text>
            </View>

            <View style={styles.actionsContainer}>
              <TouchableOpacity
                style={[styles.actionButton, styles.whatsappButton]}
                onPress={openWhatsApp}
                activeOpacity={0.8}
              >
                <View style={styles.actionIconContainer}>
                  <Ionicons name="logo-whatsapp" size={22} color={TEXT_WHITE} />
                </View>
                <Text style={styles.actionButtonText}>WhatsApp</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.actionButton, styles.cartButton]}
                onPress={ajouterAuPanier}
                activeOpacity={0.8}
              >
                <View style={styles.actionIconContainer}>
                  <Ionicons name="cart" size={22} color={TEXT_WHITE} />
                </View>
                <Text style={styles.actionButtonText}>Panier</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.actionButton, styles.orderButton]}
                onPress={commanderProduit}
                activeOpacity={0.8}
              >
                <View style={styles.actionIconContainer}>
                  <Ionicons name="bag-check" size={22} color={TEXT_WHITE} />
                </View>
                <Text style={styles.actionButtonText}>Commander</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Promotions similaires */}
          {similarPromotions.length > 0 && (
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Ionicons name="flash" size={20} color={PREMIUM_GOLD} />
                <Text style={styles.sectionTitle}>Autres Promotions</Text>
              </View>

              <FlatList
                data={similarPromotions}
                renderItem={({ item }) => {
                  const itemImages = parsePromotionImages(item.images || []);
                  const itemDiscount = calculateDiscount(item.original_price, item.promo_price);
                  
                  return (
                    <TouchableOpacity
                      style={styles.similarPromotionCard}
                      onPress={() =>
                        router.push({
                          pathname: "/(tabs)/Auth/Panier/PromoDetail",
                          params: { id: item.product_id.toString() },
                        })
                      }
                      activeOpacity={0.8}
                    >
                      {itemImages.length > 0 ? (
                        <Image
                          source={{ uri: itemImages[0] }}
                          style={styles.similarPromotionImage}
                        />
                      ) : (
                        <View style={styles.similarPromotionNoImage}>
                          <Ionicons name="image-outline" size={30} color={TEXT_SECONDARY} />
                        </View>
                      )}
                      <View style={styles.similarPromotionInfo}>
                        <Text style={styles.similarPromotionTitle} numberOfLines={2}>
                          {item.product_title}
                        </Text>
                        <View style={styles.similarPromotionPrices}>
                          <Text style={styles.similarPromotionOriginalPrice}>
                            ${formatPrice(item.original_price)}
                          </Text>
                          <Text style={styles.similarPromotionPrice}>
                            ${formatPrice(item.promo_price)}
                          </Text>
                        </View>
                        <View style={styles.similarPromotionDiscount}>
                          <Text style={styles.similarPromotionDiscountText}>
                            -{itemDiscount}%
                          </Text>
                        </View>
                      </View>
                    </TouchableOpacity>
                  );
                }}
                keyExtractor={(item) => item.promotionId.toString()}
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.similarPromotionsContainer}
              />
            </View>
          )}
        </Animated.View>
      </ScrollView>

      {/* Modal Image Fullscreen */}
      {images.length > 0 && (
        <Modal visible={modalVisible} transparent animationType="fade">
          <View style={styles.modalContainer}>
            <TouchableOpacity
              onPress={() => setModalVisible(false)}
              style={styles.modalCloseButton}
              activeOpacity={0.7}
            >
              <Ionicons name="close" size={28} color={TEXT_WHITE} />
            </TouchableOpacity>

            {images.length > 1 && (
              <>
                <TouchableOpacity
                  style={[styles.navButton, styles.prevButton]}
                  onPress={() => navigateToImage("prev")}
                  activeOpacity={0.7}
                >
                  <Ionicons name="chevron-back" size={28} color={TEXT_WHITE} />
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.navButton, styles.nextButton]}
                  onPress={() => navigateToImage("next")}
                  activeOpacity={0.7}
                >
                  <Ionicons name="chevron-forward" size={28} color={TEXT_WHITE} />
                </TouchableOpacity>
              </>
            )}

            <Image
              source={{ uri: selectedImage || "" }}
              style={styles.fullScreenImage}
              resizeMode="contain"
            />

            <View style={styles.imageCounter}>
              <Text style={styles.imageCounterText}>
                {activeImageIndex + 1} / {images.length}
              </Text>
            </View>
          </View>
        </Modal>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: SHOPNET_BLUE },
  scrollView: { flex: 1 },
  loadingContainer: {
    flex: 1,
    backgroundColor: SHOPNET_BLUE,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: { color: TEXT_WHITE, marginTop: 10, fontSize: 16 },
  errorContainer: {
    flex: 1,
    backgroundColor: SHOPNET_BLUE,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 20,
  },
  errorTitle: { fontSize: 28, fontWeight: "bold", color: ERROR_RED, marginTop: 16 },
  errorText: { fontSize: 16, color: TEXT_WHITE, marginTop: 8, textAlign: "center" },
  backButton: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 16 },
  backButtonText: { color: TEXT_WHITE, fontSize: 16 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: SHOPNET_BLUE,
  },
  headerCenter: { flex: 1, alignItems: "center" },
  headerTitle: { color: TEXT_WHITE, fontSize: 18, fontWeight: "bold" },
  headerSubtitle: { color: PREMIUM_GOLD, fontSize: 12 },
  headerRight: { width: 24 },
  notificationContainer: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 999,
    paddingHorizontal: 16,
  },
  notificationContent: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: CARD_BG,
    padding: 12,
    borderRadius: 8,
    gap: 8,
  },
  notificationText: { color: TEXT_WHITE, fontSize: 14, flexShrink: 1 },
  imageSection: { paddingVertical: 10 },
  mainImage: { width: width, height: width, backgroundColor: "#333" },
  thumbnailsContainer: { paddingHorizontal: 10, marginTop: 8 },
  thumbnail: { width: 80, height: 80, borderRadius: 8, marginRight: 8 },
  noImageContainer: {
    width: width,
    height: width,
    backgroundColor: CARD_BG,
    justifyContent: "center",
    alignItems: "center",
  },
  noImageText: { color: TEXT_SECONDARY, marginTop: 10, fontSize: 14 },
  content: { paddingHorizontal: 16, paddingBottom: 40 },
  titleSection: { marginVertical: 10 },
  title: { fontSize: 22, fontWeight: "700", color: TEXT_WHITE },
  promotionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 8,
  },
  categoryBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(66, 165, 245, 0.2)",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
  },
  category: { color: PRO_BLUE, fontSize: 12, marginLeft: 4 },
  promotionTimer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255, 107, 107, 0.2)",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
  },
  promotionTimerText: {
    color: ERROR_RED,
    fontSize: 12,
    fontWeight: "600",
    marginLeft: 4,
  },
  promotionInfoSection: { marginVertical: 15 },
  promotionPrices: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 10,
    marginBottom: 8,
  },
  originalPrice: {
    fontSize: 18,
    color: TEXT_SECONDARY,
    textDecorationLine: "line-through",
  },
  promoPrice: { fontSize: 28, fontWeight: "bold", color: PREMIUM_GOLD },
  discountBadge: {
    backgroundColor: SUCCESS_GREEN,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  discountText: { color: TEXT_WHITE, fontSize: 14, fontWeight: "700" },
  promotionMeta: {
    flexDirection: "row",
    gap: 15,
    marginTop: 10,
  },
  metaItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  metaText: { color: TEXT_SECONDARY, fontSize: 13 },
  section: { marginVertical: 16 },
  sectionHeader: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 8 },
  sectionTitle: { color: TEXT_WHITE, fontSize: 16, fontWeight: "600" },
  description: { color: TEXT_SECONDARY, fontSize: 14, lineHeight: 22 },
  sellerCard: {
    backgroundColor: CARD_BG,
    borderRadius: 10,
    padding: 16,
  },
  sellerInfo: { flex: 1 },
  sellerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 8,
  },
  sellerText: { color: TEXT_WHITE, fontSize: 14 },
  sellerRating: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 8,
  },
  sellerRatingText: {
    color: PREMIUM_GOLD,
    fontWeight: "600",
    fontSize: 14,
  },
  actionsContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 10,
  },
  actionButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    borderRadius: 10,
    justifyContent: "center",
    gap: 8,
  },
  actionIconContainer: { alignItems: "center" },
  actionButtonText: { color: TEXT_WHITE, fontWeight: "600", fontSize: 14 },
  whatsappButton: { backgroundColor: WHATSAPP_GREEN },
  cartButton: { backgroundColor: PRO_BLUE },
  orderButton: { backgroundColor: PREMIUM_GOLD },
  similarPromotionsContainer: { paddingRight: 16 },
  similarPromotionCard: {
    width: 160,
    backgroundColor: CARD_BG,
    borderRadius: 12,
    marginRight: 12,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: PREMIUM_GOLD + "40",
  },
  similarPromotionImage: {
    width: 160,
    height: 120,
    backgroundColor: "#2C3A4A",
  },
  similarPromotionNoImage: {
    width: 160,
    height: 120,
    backgroundColor: "#2C3A4A",
    justifyContent: "center",
    alignItems: "center",
  },
  similarPromotionInfo: { padding: 10 },
  similarPromotionTitle: {
    color: TEXT_WHITE,
    fontSize: 13,
    fontWeight: "600",
    marginBottom: 6,
  },
  similarPromotionPrices: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 6,
  },
  similarPromotionOriginalPrice: {
    color: TEXT_SECONDARY,
    fontSize: 12,
    textDecorationLine: "line-through",
  },
  similarPromotionPrice: {
    color: PREMIUM_GOLD,
    fontSize: 16,
    fontWeight: "700",
  },
  similarPromotionDiscount: {
    alignSelf: "flex-start",
    backgroundColor: SUCCESS_GREEN,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  similarPromotionDiscountText: {
    color: TEXT_WHITE,
    fontSize: 11,
    fontWeight: "700",
  },
  modalContainer: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.95)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalCloseButton: {
    position: "absolute",
    top: 40,
    right: 20,
    zIndex: 10,
  },
  navButton: {
    position: "absolute",
    top: "50%",
    transform: [{ translateY: -14 }],
    zIndex: 10,
  },
  prevButton: { left: 20 },
  nextButton: { right: 20 },
  fullScreenImage: { width: width, height: width },
  imageCounter: {
    position: "absolute",
    bottom: 40,
    backgroundColor: "rgba(0,0,0,0.7)",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  imageCounterText: { color: TEXT_WHITE, fontSize: 14 },
});