


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

// 🔹 Serveur Render en production
const API_URL = "https://shopnet-backend.onrender.com/api/products";
const COMMAND_API_URL = "https://shopnet-backend.onrender.com/api/commandes";
const PANIER_API_URL = "https://shopnet-backend.onrender.com/api/cart";

// 🔹 Serveur local pour développement (commenté)
// const API_URL = "http://100.64.134.89:5000/api/products";
// const COMMAND_API_URL = "http://100.64.134.89:5000/api/commandes";
// const PANIER_API_URL = "http://100.64.134.89:5000/api/cart";


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

const formatPhoneNumber = (phone: string) => {
  let cleaned = phone.trim().replace(/\D/g, "");
  if (cleaned.startsWith("0")) cleaned = "243" + cleaned.substring(1);
  return cleaned;
};

const getValidToken = async () => {
  try {
    const token = await AsyncStorage.getItem("userToken");
    return token || null;
  } catch {
    return null;
  }
};

export default function DetailId() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [product, setProduct] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [similarProducts, setSimilarProducts] = useState<any[]>([]);
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

  const fetchProduct = async () => {
    setLoading(true);
    try {
      const token = await getValidToken();
      const res = await fetch(`${API_URL}/${id}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      const data = await res.json();

      if (data.success) {
        const prod = data.product;
        if (!prod.image_urls && prod.images) {
          prod.image_urls = prod.images.map((img: any) => img.url);
        }
        setProduct(prod);
        fetchSimilar(prod.category);

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
        setError(data.error || "Produit non trouvé");
      }
    } catch {
      setError("Erreur de connexion au serveur");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (id) {
      fetchProduct();
    }
  }, [id]);

  const fetchSimilar = async (category: string) => {
    try {
      const res = await fetch(API_URL);
      const data = await res.json();
      if (data.success) {
        const filtered = data.products
          .filter((p: any) => p.id !== Number(id) && p.category === category)
          .slice(0, 4);
        setSimilarProducts(filtered);
      }
    } catch {
      // silently fail
    }
  };

  const openWhatsApp = () => {
    const rawPhone = product?.seller?.phone || "";
    if (!rawPhone) {
      showNotification("📞 Numéro WhatsApp non disponible");
      return;
    }
    const phone = formatPhoneNumber(rawPhone);
    const imageUrl = product.image_urls?.[0] || "";
    const message = `Bonjour, je suis intéressé par le produit "${product.title}" sur SHOPNET. Prix: $${product.price}. Voici l'image : ${imageUrl}`;
    const url = `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
    Linking.openURL(url).catch(() =>
      showNotification("❌ Impossible d'ouvrir WhatsApp"),
    );
  };

  const commanderProduit = async () => {
    try {
      const token = await getValidToken();
      if (!token) {
        showNotification("🔐 Veuillez vous connecter pour commander");
        return;
      }

      const body = {
        produits: [{ produit_id: product.id, quantite: 1 }],
        adresse_livraison: "Adresse par défaut",
        mode_paiement: "especes",
        commentaire: "Commande depuis l'application SHOPNET PRO",
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
    try {
      const token = await getValidToken();
      if (!token) {
        showNotification("🔐 Veuillez vous connecter pour ajouter au panier");
        return;
      }

      const body = {
        product_id: product.id,
        title: product.title,
        description: product.description || "",
        price: product.price,
        original_price: product.original_price || product.price,
        category: product.category || "",
        condition: product.condition || "new",
        quantity: 1,
        stock: product.stock || 0,
        location: product.location || "",
        delivery_options: product.delivery_options || {},
        images: product.image_urls || [],
        seller_id: product.seller?.id || "",
        seller_name: product.seller?.name || "",
        seller_rating: product.seller?.rating || 0,
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
        showNotification("🛒 Produit ajouté au panier !");
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
    const images = product.image_urls || [];
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
        <Text style={styles.loadingText}>Chargement du produit...</Text>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.errorContainer}>
        <StatusBar backgroundColor={SHOPNET_BLUE} barStyle="light-content" />
        <Ionicons name="alert-circle" size={80} color={ERROR_RED} />
        <Text style={styles.errorTitle}>Erreur</Text>
        <Text style={styles.errorText}>{error}</Text>
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

  const images = product.image_urls || [];

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
          <Text style={styles.headerTitle}>Détails Produit</Text>
          <Text style={styles.headerSubtitle}>SHOPNET</Text>
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
          <TouchableOpacity
            onPress={() => showImage(images[0] || "", 0)}
            activeOpacity={0.9}
          >
            <Image
              source={{ uri: images[0] || "https://via.placeholder.com/400" }}
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
            <Text style={styles.title}>{product.title}</Text>
            <View style={styles.categoryBadge}>
              <Ionicons name="pricetag" size={16} color={PRO_BLUE} />
              <Text style={styles.category}>{product.category}</Text>
            </View>
          </View>

          {/* Prix et Stock */}
          <View style={styles.priceStockSection}>
            <View style={styles.priceContainer}>
              <Text style={styles.price}>${formatPrice(product.price)}</Text>
              {product.original_price &&
                product.original_price > product.price && (
                  <Text style={styles.originalPrice}>
                    ${formatPrice(product.original_price)}
                  </Text>
                )}
            </View>

            <View
              style={[
                styles.stockBadge,
                {
                  backgroundColor:
                    product.stock > 0 ? SUCCESS_GREEN + "20" : ERROR_RED + "20",
                },
              ]}
            >
              <Ionicons
                name={product.stock > 0 ? "checkmark-circle" : "close-circle"}
                size={16}
                color={product.stock > 0 ? SUCCESS_GREEN : ERROR_RED}
              />
              <Text
                style={[
                  styles.stockText,
                  { color: product.stock > 0 ? SUCCESS_GREEN : ERROR_RED },
                ]}
              >
                {product.stock > 0 ? "En stock" : "Rupture"}
              </Text>
            </View>
          </View>

          {/* Description */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Ionicons name="document-text" size={20} color={PRO_BLUE} />
              <Text style={styles.sectionTitle}>Description</Text>
            </View>
            <Text style={styles.description}>
              {product.description ||
                "Aucune description disponible pour ce produit."}
            </Text>
          </View>

          {/* Informations Vendeur */}
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
                    {product.seller?.name || "Vendeur SHOPNET"}
                  </Text>
                </View>

                <View style={styles.sellerRow}>
                  <Ionicons name="call" size={18} color={TEXT_SECONDARY} />
                  <Text style={styles.sellerText}>
                    {product.seller?.phone || "Non disponible"}
                  </Text>
                </View>

                {product.seller?.email && (
                  <View style={styles.sellerRow}>
                    <Ionicons name="mail" size={18} color={TEXT_SECONDARY} />
                    <Text style={styles.sellerText}>
                      {product.seller.email}
                    </Text>
                  </View>
                )}

                {product.seller?.address && (
                  <View style={styles.sellerRow}>
                    <Ionicons
                      name="location"
                      size={18}
                      color={TEXT_SECONDARY}
                    />
                    <Text style={styles.sellerText}>
                      {product.seller.address}
                    </Text>
                  </View>
                )}
              </View>
            </View>
          </View>

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

          {/* Produits Similaires */}
          {similarProducts.length > 0 && (
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Ionicons name="layers" size={20} color={PRO_BLUE} />
                <Text style={styles.sectionTitle}>Produits Similaires</Text>
              </View>

              <FlatList
                data={similarProducts}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={styles.similarProductCard}
                    onPress={() =>
                      router.push(`/(tabs)/Auth/Panier/DetailId/${item.id}`)
                    }
                    activeOpacity={0.8}
                  >
                    <Image
                      source={{
                        uri:
                          item.image_urls?.[0] ||
                          "https://via.placeholder.com/150",
                      }}
                      style={styles.similarProductImage}
                    />
                    <View style={styles.similarProductInfo}>
                      <Text
                        style={styles.similarProductTitle}
                        numberOfLines={2}
                      >
                        {item.title}
                      </Text>
                      <Text style={styles.similarProductPrice}>
                        ${formatPrice(item.price)}
                      </Text>
                    </View>
                  </TouchableOpacity>
                )}
                keyExtractor={(item) => item.id.toString()}
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.similarProductsContainer}
              />
            </View>
          )}
        </Animated.View>
      </ScrollView>

      {/* Modal Image Fullscreen */}
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
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: SHOPNET_BLUE,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: SHOPNET_BLUE,
  },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: SHOPNET_BLUE,
    padding: 20,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: SHOPNET_BLUE,
  },
  backButton: {
    padding: 4,
  },
  headerCenter: {
    alignItems: "center",
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: TEXT_WHITE,
  },
  headerSubtitle: {
    fontSize: 12,
    color: PRO_BLUE,
    fontWeight: "600",
    marginTop: 2,
  },
  headerRight: {
    width: 28,
  },
  scrollView: {
    flex: 1,
  },
  imageSection: {
    marginBottom: 0,
  },
  mainImage: {
    width: "100%",
    height: 400,
    backgroundColor: CARD_BG,
  },
  thumbnailsContainer: {
    padding: 16,
    gap: 8,
  },
  thumbnail: {
    width: 80,
    height: 80,
    borderRadius: 12,
    backgroundColor: CARD_BG,
  },
  content: {
    padding: 20,
    backgroundColor: SHOPNET_BLUE,
  },
  titleSection: {
    marginBottom: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: "800",
    color: TEXT_WHITE,
    marginBottom: 8,
    lineHeight: 34,
  },
  categoryBadge: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    backgroundColor: "rgba(66, 165, 245, 0.1)",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    gap: 6,
  },
  category: {
    color: PRO_BLUE,
    fontSize: 14,
    fontWeight: "600",
  },
  priceStockSection: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 24,
  },
  priceContainer: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 12,
  },
  price: {
    fontSize: 32,
    fontWeight: "800",
    color: PREMIUM_GOLD,
  },
  originalPrice: {
    fontSize: 18,
    color: TEXT_SECONDARY,
    textDecorationLine: "line-through",
    fontWeight: "500",
  },
  stockBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    gap: 6,
  },
  stockText: {
    fontSize: 14,
    fontWeight: "700",
  },
  section: {
    marginBottom: 28,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
    gap: 8,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: TEXT_WHITE,
  },
  description: {
    color: TEXT_SECONDARY,
    fontSize: 16,
    lineHeight: 24,
    textAlign: "justify",
  },
  sellerCard: {
    backgroundColor: CARD_BG,
    borderRadius: 16,
    padding: 20,
  },
  sellerInfo: {
    gap: 12,
  },
  sellerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  sellerText: {
    fontSize: 16,
    color: TEXT_WHITE,
    fontWeight: "500",
    flex: 1,
  },
  actionsContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 10,
  },
  actionButton: {
    flex: 1,
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 16,
    paddingHorizontal: 8,
    borderRadius: 12,
    minHeight: 80,
  },
  actionIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 8,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
  },
  whatsappButton: {
    backgroundColor: WHATSAPP_GREEN,
  },
  cartButton: {
    backgroundColor: PRO_BLUE,
  },
  orderButton: {
    backgroundColor: SUCCESS_GREEN,
  },
  actionButtonText: {
    color: TEXT_WHITE,
    fontSize: 14,
    fontWeight: "700",
    textAlign: "center",
  },
  similarProductsContainer: {
    paddingRight: 20,
    gap: 12,
  },
  similarProductCard: {
    width: 160,
    backgroundColor: CARD_BG,
    borderRadius: 16,
    overflow: "hidden",
  },
  similarProductImage: {
    width: "100%",
    height: 140,
    backgroundColor: "#2C3A4A",
  },
  similarProductInfo: {
    padding: 12,
  },
  similarProductTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: TEXT_WHITE,
    marginBottom: 6,
    lineHeight: 18,
  },
  similarProductPrice: {
    fontSize: 16,
    fontWeight: "800",
    color: PREMIUM_GOLD,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.95)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalCloseButton: {
    position: "absolute",
    top: 60,
    right: 20,
    zIndex: 1,
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    borderRadius: 20,
    padding: 8,
  },
  navButton: {
    position: "absolute",
    top: "50%",
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    borderRadius: 25,
    padding: 12,
    zIndex: 1,
  },
  prevButton: {
    left: 20,
  },
  nextButton: {
    right: 20,
  },
  fullScreenImage: {
    width: "100%",
    height: "80%",
  },
  imageCounter: {
    position: "absolute",
    bottom: 60,
    backgroundColor: "rgba(0, 0, 0, 0.7)",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  imageCounterText: {
    color: TEXT_WHITE,
    fontSize: 14,
    fontWeight: "600",
  },
  notificationContainer: {
    position: "absolute",
    top: 0,
    left: 20,
    right: 20,
    backgroundColor: CARD_BG,
    borderRadius: 12,
    padding: 16,
    zIndex: 1000,
    borderLeftWidth: 4,
    borderLeftColor: SUCCESS_GREEN,
  },
  notificationContent: {
    flexDirection: "row",
    alignItems: "center",
  },
  notificationText: {
    marginLeft: 12,
    fontSize: 16,
    fontWeight: "600",
    color: TEXT_WHITE,
    flex: 1,
  },
  loadingText: {
    color: PRO_BLUE,
    fontSize: 16,
    marginTop: 12,
    fontWeight: "500",
  },
  errorTitle: {
    color: ERROR_RED,
    fontSize: 24,
    fontWeight: "700",
    marginTop: 16,
    marginBottom: 8,
  },
  errorText: {
    color: TEXT_SECONDARY,
    fontSize: 16,
    textAlign: "center",
    marginBottom: 24,
    lineHeight: 22,
  },
  backButtonText: {
    color: TEXT_WHITE,
    fontSize: 16,
    fontWeight: "600",
  },
});

