import { getApiUrl } from "./apiUtils";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Audio } from "expo-av";
import { authApi } from "../authService";
import React, { useState, useEffect, useCallback, useRef, memo } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  FlatList,
  StatusBar,
  SafeAreaView,
  RefreshControl,
  ActivityIndicator,
  Dimensions,
  Animated,
  Share,
} from "react-native";
import { FontAwesome } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import axios from "axios";

// ===============================
// Configuration API – PRODUCTION
// ===============================
const API_BASE_URL = "https://shopnet-backend.onrender.com/api";
const PROMOTIONS_API_URL = `${API_BASE_URL}/promotions`;

const { width } = Dimensions.get("window");

// ===============================
// TYPES
// ===============================
interface Product {
  id: string;
  title: string;
  description: string;
  price: number;
  original_price?: number;
  discount?: number;
  images: string[];
  seller: {
    id: string;
    name: string;
    avatar?: string;
  };
  rating: number;
  comments: number;
  likes: number;
  location: string;
  isLiked: boolean;
  shares: number;
  isPromotion?: boolean;
  promotionId?: number;
  duration_days?: number;
  created_at?: string;
  time_remaining?: string;
}

interface InternalPromotion {
  id: string;
  type: "internal_promotion";
  title: string;
  description: string;
  imageUrl: string;
  targetRoute: string;
}

interface Notification {
  id: string;
  title: string;
  message: string;
  type: "promotion" | "message" | "order" | "system" | "like" | "comment";
  isRead: boolean;
  createdAt: string;
  icon?: string;
  data?: any;
}

// Union type pour les éléments du feed
type FeedItem =
  | { type: "product"; data: Product } // pleine largeur
  | { type: "horizontal"; data: Product[] } // ligne horizontale
  | { type: "grid"; data: Product[] } // grille 2 colonnes
  | { type: "internal"; data: InternalPromotion }; // publication interne

// ===============================
// CONSTANTES & UTILITAIRES
// ===============================
const shuffleArray = (array: any[]) => {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
};

const calculateTimeRemaining = (
  createdAt: string,
  durationDays: number,
): string => {
  const createdDate = new Date(createdAt);
  const endDate = new Date(
    createdDate.getTime() + durationDays * 24 * 60 * 60 * 1000,
  );
  const now = new Date();
  const diffMs = endDate.getTime() - now.getTime();
  if (diffMs <= 0) return "Expirée";
  const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  if (days > 0) return `${days}j ${hours}h`;
  return `${hours}h`;
};

// Cache keys
const CACHE_KEY_NORMAL = "@feed_normal_products";
const CACHE_KEY_PROMO = "@feed_promo_products";

const saveFeedToCache = async (normal: Product[], promo: Product[]) => {
  try {
    await AsyncStorage.setItem(CACHE_KEY_NORMAL, JSON.stringify(normal));
    await AsyncStorage.setItem(CACHE_KEY_PROMO, JSON.stringify(promo));
  } catch (error) {
    console.error("Erreur sauvegarde cache:", error);
  }
};

const loadCachedFeed = async (): Promise<{
  normal: Product[];
  promo: Product[];
}> => {
  try {
    const [normalJson, promoJson] = await Promise.all([
      AsyncStorage.getItem(CACHE_KEY_NORMAL),
      AsyncStorage.getItem(CACHE_KEY_PROMO),
    ]);
    return {
      normal: normalJson ? JSON.parse(normalJson) : [],
      promo: promoJson ? JSON.parse(promoJson) : [],
    };
  } catch (error) {
    console.error("Erreur lecture cache:", error);
    return { normal: [], promo: [] };
  }
};

// ===============================
// COMPOSANTS DE NOTIFICATION
// ===============================
const NotificationBadge = memo(
  ({ count, small = false }: { count: number; small?: boolean }) => {
    if (count <= 0) return null;
    return (
      <View
        style={[
          styles.badge,
          small ? styles.smallBadge : styles.regularBadge,
          count > 99 && styles.largeCountBadge,
        ]}
      >
        <Text
          style={[
            styles.badgeText,
            small ? styles.smallBadgeText : styles.regularBadgeText,
          ]}
        >
          {count > 99 ? "99+" : count}
        </Text>
      </View>
    );
  },
);

// ===============================
// COMPOSANTS D'AFFICHAGE
// ===============================

// Mini carte pour ligne horizontale
const ProductMiniCard = memo(
  ({ item, onPress }: { item: Product; onPress: () => void }) => {
    const sellerName = item.seller?.name ?? "Vendeur";
    return (
      <TouchableOpacity style={styles.miniCard} onPress={onPress}>
        <Image
          source={{
            uri: item.images?.[0] || "https://via.placeholder.com/120",
          }}
          style={styles.miniImage}
        />
        <Text numberOfLines={1} style={styles.miniTitle}>
          {item.title}
        </Text>
        <Text style={styles.miniPrice}>
          ${item.price?.toFixed(2) ?? "0.00"}
        </Text>
      </TouchableOpacity>
    );
  },
);

// Ligne horizontale
const HorizontalProductRow = memo(
  ({
    products,
    onProductPress,
  }: {
    products: Product[];
    onProductPress: (product: Product) => void;
  }) => {
    if (products.length === 0) return null;
    return (
      <View style={styles.horizontalRowContainer}>
        <FlatList
          horizontal
          data={products}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <ProductMiniCard item={item} onPress={() => onProductPress(item)} />
          )}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.horizontalListContent}
          removeClippedSubviews
          maxToRenderPerBatch={4}
          windowSize={3}
        />
      </View>
    );
  },
);

// Produit pleine largeur (design modernisé)
const FullWidthProductCard = memo(
  ({
    item,
    handleLike,
    handleComment,
    handleShare,
    handleAddToCart,
    router,
  }: {
    item: Product;
    handleLike: (id: string) => void;
    handleComment: (id: string) => void;
    handleShare: (product: Product) => void;
    handleAddToCart: (product: Product) => void;
    router: any;
  }) => {
    const seller = item.seller ?? { id: "0", name: "Inconnu", avatar: "" };
    const sellerAvatar = seller.avatar || "https://via.placeholder.com/40";
    const sellerName = seller.name || "Vendeur";
    const location = item.location || "Lubumbashi";
    const images = item.images?.length
      ? item.images
      : ["https://via.placeholder.com/400"];
    const price = item.price ?? 0;
    const originalPrice = item.original_price ?? price;
    const discount = item.discount ?? 0;
    const rating = item.rating ?? 0;
    const comments = item.comments ?? 0;
    const likes = item.likes ?? 0;
    const shares = item.shares ?? 0;

    return (
      <View style={styles.fullWidthCard}>
        <TouchableOpacity
          style={styles.productHeader}
          onPress={() =>
            router.push({
              pathname: "/(tabs)/Auth/Profiles/SellerProfile",
              params: { sellerId: seller.id },
            })
          }
        >
          <Image source={{ uri: sellerAvatar }} style={styles.avatar} />
          <View style={styles.sellerInfo}>
            <Text style={styles.sellerName} numberOfLines={1}>
              {sellerName}
            </Text>
            <Text style={styles.productLocation} numberOfLines={1}>
              {location}
            </Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => {
            if (item.isPromotion && item.promotionId) {
              router.push({
                pathname: "/(tabs)/Auth/Panier/PromoDetail",
                params: { id: item.promotionId.toString() },
              });
            } else {
              router.push({
                pathname: "/(tabs)/Auth/Panier/DetailId",
                params: { id: item.id.toString() },
              });
            }
          }}
        >
          <Image source={{ uri: images[0] }} style={styles.fullWidthImage} />
          {item.isPromotion && (
            <View style={styles.promotionBadge}>
              <Text style={styles.promotionBadgeText}>🔥 PROMO</Text>
              {item.time_remaining && (
                <Text style={styles.timerText}>{item.time_remaining}</Text>
              )}
            </View>
          )}
          <View style={styles.priceContainer}>
            {item.isPromotion && originalPrice > 0 ? (
              <>
                <Text style={styles.originalPrice}>
                  ${originalPrice.toFixed(2)}
                </Text>
                <Text style={styles.discountedPrice}>${price.toFixed(2)}</Text>
                {discount > 0 && (
                  <View style={styles.discountBadge}>
                    <Text style={styles.discountBadgeText}>-{discount}%</Text>
                  </View>
                )}
              </>
            ) : (
              <Text style={styles.normalPrice}>
                ${price.toFixed(2)}
                {discount > 0 && (
                  <Text style={styles.discountText}> {discount}% OFF</Text>
                )}
              </Text>
            )}
          </View>
        </TouchableOpacity>

        <View style={styles.productInfo}>
          <Text style={styles.productTitle} numberOfLines={2}>
            {item.title}
          </Text>
          <Text style={styles.productDescription} numberOfLines={2}>
            {item.description}
          </Text>
        </View>

        <TouchableOpacity
          style={styles.ratingContainer}
          onPress={() =>
            router.push({
              pathname: "/(tabs)/Auth/Produits/Commentaire",
              params: { productId: item.id },
            })
          }
        >
          <View style={styles.starsContainer}>
            {[1, 2, 3, 4, 5].map((star) => (
              <FontAwesome
                key={star}
                name={star <= Math.floor(rating) ? "star" : "star-o"}
                size={16}
                color="#FFD700"
              />
            ))}
          </View>
          <Text style={styles.socialCount}>{comments} commentaires</Text>
        </TouchableOpacity>

        <View style={styles.actionButtons}>
          <View style={styles.socialActions}>
            <TouchableOpacity
              style={styles.socialButton}
              onPress={() => handleLike(item.id)}
            >
              <FontAwesome
                name={item.isLiked ? "heart" : "heart-o"}
                size={20}
                color={item.isLiked ? "#FF3B30" : "#333"}
              />
              <Text style={styles.socialCount}>{likes}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.socialButton}
              onPress={() => handleComment(item.id)}
            >
              <FontAwesome name="comment-o" size={20} color="#333" />
              <Text style={styles.socialCount}>{comments}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.socialButton}
              onPress={() => handleShare(item)}
            >
              <FontAwesome name="share" size={20} color="#333" />
              <Text style={styles.socialCount}>{shares}</Text>
            </TouchableOpacity>
          </View>
          <TouchableOpacity
            style={[
              styles.cartButton,
              item.isPromotion && styles.promotionCartButton,
            ]}
            onPress={() => handleAddToCart(item)}
          >
            <Text style={styles.cartButtonText}>
              {item.isPromotion ? "🔥 Ajouter Promo" : "Ajouter au panier"}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  },
  (prev, next) => {
    return (
      prev.item.id === next.item.id &&
      prev.item.isLiked === next.item.isLiked &&
      prev.item.likes === next.item.likes &&
      prev.item.comments === next.item.comments &&
      prev.item.shares === next.item.shares &&
      prev.item.isPromotion === next.item.isPromotion
    );
  },
);

// Carte pour la grille 2 colonnes
const GridProductCard = memo(
  ({ item, onPress }: { item: Product; onPress: () => void }) => {
    const seller = item.seller ?? { id: "0", name: "Vendeur", avatar: "" };
    const sellerAvatar = seller.avatar || "https://via.placeholder.com/20";
    const sellerName = seller.name || "Vendeur";
    const price = item.price ?? 0;
    const originalPrice = item.original_price ?? price;
    const discount = item.discount ?? 0;
    return (
      <TouchableOpacity style={styles.gridCard} onPress={onPress}>
        <Image
          source={{
            uri: item.images?.[0] || "https://via.placeholder.com/200",
          }}
          style={styles.gridImage}
        />
        <Text numberOfLines={2} style={styles.gridTitle}>
          {item.title}
        </Text>
        <View style={styles.gridPriceRow}>
          {item.isPromotion && originalPrice > 0 ? (
            <>
              <Text style={styles.gridOriginalPrice}>
                ${originalPrice.toFixed(2)}
              </Text>
              <Text style={styles.gridPrice}>${price.toFixed(2)}</Text>
            </>
          ) : (
            <Text style={styles.gridPrice}>${price.toFixed(2)}</Text>
          )}
          {discount > 0 && (
            <Text style={styles.gridDiscount}>-{discount}%</Text>
          )}
        </View>
        <View style={styles.gridSellerRow}>
          <Image
            source={{ uri: sellerAvatar }}
            style={styles.gridSellerAvatar}
          />
          <Text numberOfLines={1} style={styles.gridSellerName}>
            {sellerName}
          </Text>
        </View>
      </TouchableOpacity>
    );
  },
);

// Grille 2 colonnes
const TwoColumnGrid = memo(
  ({
    products,
    onProductPress,
  }: {
    products: Product[];
    onProductPress: (product: Product) => void;
  }) => {
    return (
      <View style={styles.gridContainer}>
        {products.map((item) => (
          <GridProductCard
            key={item.id}
            item={item}
            onPress={() => onProductPress(item)}
          />
        ))}
      </View>
    );
  },
);

// Publication interne SHOPNET
const InternalPromotionCard = memo(
  ({ item, onPress }: { item: InternalPromotion; onPress: () => void }) => (
    <TouchableOpacity style={styles.internalPromoCard} onPress={onPress}>
      <Image
        source={{ uri: item.imageUrl }}
        style={styles.internalPromoImage}
      />
      <View style={styles.internalPromoContent}>
        <Text style={styles.internalPromoTitle}>{item.title}</Text>
        <Text style={styles.internalPromoDescription}>{item.description}</Text>
      </View>
    </TouchableOpacity>
  ),
);

// ===============================
// COMPOSANT PRINCIPAL
// ===============================
const ShopApp = () => {
  const router = useRouter();

  // États pour les données brutes
  const [normalProducts, setNormalProducts] = useState<Product[]>([]);
  const [promotionProducts, setPromotionProducts] = useState<Product[]>([]);
  const [feedItems, setFeedItems] = useState<FeedItem[]>([]);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeCategory, setActiveCategory] = useState(0);
  const [activeTab, setActiveTab] = useState(0);
  const [notificationAnim] = useState(new Animated.Value(-100));
  const [notificationText, setNotificationText] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [feedType] = useState<"latest" | "popular" | "feed" | "all">("all");
  const categories = [
    "✨ Tendance",
    "🔥 Promos",
    "👗 Mode",
    "📱 Tech",
    "🏠 Maison",
    "💄 Beauté",
  ];

  // États notifications
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [badgeCounts, setBadgeCounts] = useState({
    promotion: 0,
    discover: 0,
    cart: 0,
    profile: 0,
    notification: 0,
  });

  const soundRef = useRef<Audio.Sound | null>(null);

  // ===============================
  // CACHE : CHARGEMENT IMMÉDIAT
  // ===============================
  useEffect(() => {
    const loadCacheAndFetch = async () => {
      const cached = await loadCachedFeed();
      setNormalProducts(cached.normal);
      setPromotionProducts(cached.promo);
      // Générer le feed avec les données en cache
      generateFeedItems(cached.normal, cached.promo);

      // Si le cache est vide, on fetch directement avec loader
      if (cached.normal.length === 0 && cached.promo.length === 0) {
        await refreshFeed(true);
      } else {
        // Sinon, fetch en arrière-plan silencieux
        refreshFeed(false);
      }
    };
    loadCacheAndFetch();
  }, []);

  // Re-générer le feed quand les produits bruts changent
  useEffect(() => {
    generateFeedItems(normalProducts, promotionProducts);
  }, [normalProducts, promotionProducts]);

  // ===============================
  // CONSTRUCTION DYNAMIQUE DU FEED
  // ===============================
  const generateFeedItems = (normals: Product[], promos: Product[]) => {
    // Fusionner tous les produits et mélanger
    const allProducts = shuffleArray([...normals, ...promos]) as Product[];
    const items: FeedItem[] = [];

    // Parcourir les produits et créer des sections selon un pattern cyclique
    let i = 0;
    const pattern: Array<"full" | "horizontal" | "grid"> = [
      "full",
      "horizontal",
      "grid",
    ];
    let patternIndex = 0;

    while (i < allProducts.length) {
      const currentPattern = pattern[patternIndex % pattern.length];

      if (currentPattern === "full") {
        // Un seul produit en pleine largeur
        items.push({ type: "product", data: allProducts[i] });
        i += 1;
      } else if (currentPattern === "horizontal") {
        // Prendre jusqu'à 4 produits pour la ligne horizontale
        const end = Math.min(i + 4, allProducts.length);
        const horizontalProducts = allProducts.slice(i, end);
        if (horizontalProducts.length > 0) {
          items.push({ type: "horizontal", data: horizontalProducts });
          i = end;
        }
      } else if (currentPattern === "grid") {
        // Prendre 2 produits pour la grille
        const end = Math.min(i + 2, allProducts.length);
        const gridProducts = allProducts.slice(i, end);
        if (gridProducts.length > 0) {
          items.push({ type: "grid", data: gridProducts });
          i = end;
        }
      }
      patternIndex++;
    }

    // Injecter la publication interne à la position 5 (si possible)
    const internalPromo: InternalPromotion = {
      id: "internal-promo-1",
      type: "internal_promotion",
      title: "🚀 Créez votre boutique Premium dès maintenant",
      description:
        "Débloquez plus de fonctionnalités, augmentez votre visibilité et développez votre business.",
      imageUrl:
        "https://res.cloudinary.com/dddr7gb6w/image/upload/v1772195595/Gemini_Generated_Image_wu89avwu89avwu89_vi6zsf.png",
      targetRoute: "/(tabs)/Auth/Boutique/Boutique",
    };

    if (items.length >= 5) {
      items.splice(5, 0, { type: "internal", data: internalPromo });
    } else {
      items.push({ type: "internal", data: internalPromo });
    }

    setFeedItems(items);
  };

  // ===============================
  // FONCTIONS API
  // ===============================
  const fetchPromotions = useCallback(async (): Promise<Product[]> => {
    try {
      const token = await AsyncStorage.getItem("userToken");
      if (!token) return [];
      const response = await axios.get(PROMOTIONS_API_URL, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.data?.success && response.data.promotions) {
        return response.data.promotions.map((promo: any) => ({
          id: `promo_${promo.promotionId}`,
          promotionId: promo.promotionId,
          title: promo.product_title || "Promotion",
          description: promo.description || "Produit en promotion",
          price: Number(promo.promo_price) || 0,
          original_price: Number(promo.original_price) || 0,
          discount:
            promo.original_price && promo.promo_price
              ? Math.round(
                  ((promo.original_price - promo.promo_price) /
                    promo.original_price) *
                    100,
                )
              : 0,
          images: Array.isArray(promo.images)
            ? promo.images
            : typeof promo.images === "string"
              ? [promo.images]
              : ["https://via.placeholder.com/400"],
          seller: {
            id: promo.seller?.id?.toString() || "1",
            name: promo.seller?.name || "Vendeur SHOPNET",
            avatar: promo.seller?.avatar || "https://via.placeholder.com/40",
          },
          rating: 4.5,
          comments: 0,
          likes: 0,
          isLiked: false,
          shares: 0,
          location: promo.seller?.address || "Lubumbashi",
          isPromotion: true,
          duration_days: promo.duration_days || 7,
          created_at: promo.created_at || new Date().toISOString(),
          time_remaining: calculateTimeRemaining(
            promo.created_at || new Date().toISOString(),
            promo.duration_days || 7,
          ),
        }));
      }
      return [];
    } catch (error) {
      console.error("Erreur promotions:", error);
      return [];
    }
  }, []);

  const fetchNormalProducts = useCallback(
    async (page = 1) => {
      try {
        const token = await AsyncStorage.getItem("userToken");
        if (!token) {
          showNotification("Veuillez vous connecter");
          return { products: [], totalPages: 1 };
        }
        const apiUrl = getApiUrl(feedType);
        const response = await axios.get(apiUrl, {
          headers: { Authorization: `Bearer ${token}` },
          params: {
            category:
              categories[activeCategory]?.replace(/[^a-zA-Z]/g, "") || "",
            page,
            limit: 10,
          },
        });
        if (!response.data?.products) throw new Error("Réponse invalide");

        const formatted = response.data.products.map((product: any) => {
          const images = Array.isArray(product.images)
            ? product.images.filter((img: string) => img && img.trim() !== "")
            : [];
          return {
            id: product.id?.toString() ?? "",
            title: product.title ?? "Titre non disponible",
            description: product.description ?? "",
            price: Number(product.price) ?? 0,
            discount: product.original_price
              ? Math.round((1 - product.price / product.original_price) * 100)
              : 0,
            images:
              images.length > 0
                ? images.map((img: string) =>
                    img.startsWith("http") ? img : `${API_BASE_URL}${img}`,
                  )
                : ["https://via.placeholder.com/400"],
            seller: {
              id: product.seller?.id?.toString() ?? "1",
              name: product.seller?.name ?? "Vendeur inconnu",
              avatar: product.seller?.avatar
                ? product.seller.avatar.startsWith("http")
                  ? product.seller.avatar
                  : `${API_BASE_URL}${product.seller.avatar}`
                : "https://via.placeholder.com/40",
            },
            rating: product.rating ?? 0,
            comments: product.comments ?? 0,
            likes: product.likes ?? 0,
            isLiked: product.isLiked ?? false,
            shares: product.shares ?? 0,
            location: product.location ?? "Lubumbashi",
            isPromotion: false,
          };
        });

        return {
          products: formatted,
          totalPages: response.data.totalPages || 1,
        };
      } catch (error) {
        console.error("Erreur produits:", error);
        return { products: [], totalPages: 1 };
      }
    },
    [feedType, activeCategory, categories],
  );

  // Rafraîchissement (pull-to-refresh ou premier chargement)
  const refreshFeed = useCallback(
    async (showLoader = true) => {
      if (showLoader) setRefreshing(true);
      try {
        const [promos, normalData] = await Promise.all([
          fetchPromotions(),
          fetchNormalProducts(1),
        ]);

        setPromotionProducts(promos);
        setNormalProducts(normalData.products);
        setCurrentPage(1);
        setTotalPages(normalData.totalPages);

        // Sauvegarder dans le cache
        await saveFeedToCache(normalData.products, promos);
      } catch (error) {
        console.error("Erreur refresh:", error);
        showNotification("Erreur de chargement");
      } finally {
        setRefreshing(false);
        setLoading(false);
      }
    },
    [fetchPromotions, fetchNormalProducts],
  );

  // Chargement supplémentaire (pagination)
  const loadMore = useCallback(async () => {
    if (currentPage >= totalPages || isLoadingMore || loading) return;
    setIsLoadingMore(true);
    try {
      const nextPage = currentPage + 1;
      const normalData = await fetchNormalProducts(nextPage);
      if (normalData.products.length > 0) {
        setNormalProducts((prev) => [...prev, ...normalData.products]);
        setCurrentPage(nextPage);
        setTotalPages(normalData.totalPages);
        // Mettre à jour le cache avec les nouveaux produits
        const updatedNormal = [...normalProducts, ...normalData.products];
        await saveFeedToCache(updatedNormal, promotionProducts);
      }
    } catch (error) {
      console.error("Erreur load more:", error);
    } finally {
      setIsLoadingMore(false);
    }
  }, [
    currentPage,
    totalPages,
    isLoadingMore,
    loading,
    fetchNormalProducts,
    normalProducts,
    promotionProducts,
  ]);

  // ===============================
  // HANDLERS (likes, comment, share, addToCart)
  // ===============================
  const showNotification = useCallback(
    (message: string) => {
      setNotificationText(message);
      Animated.sequence([
        Animated.timing(notificationAnim, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.delay(2000),
        Animated.timing(notificationAnim, {
          toValue: -100,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();
    },
    [notificationAnim],
  );

  const handleLike = useCallback(
    async (productId: string) => {
      let previousLikeState = false;
      let previousLikesCount = 0;
      let productIndex = -1;
      let isPromo = false;

      // Chercher dans normalProducts
      productIndex = normalProducts.findIndex((p) => p.id === productId);
      if (productIndex !== -1) {
        const product = normalProducts[productIndex];
        previousLikeState = product.isLiked;
        previousLikesCount = product.likes;
        const updated = [...normalProducts];
        updated[productIndex] = {
          ...product,
          isLiked: !previousLikeState,
          likes: previousLikeState
            ? previousLikesCount - 1
            : previousLikesCount + 1,
        };
        setNormalProducts(updated);
      } else {
        // Chercher dans promotions
        productIndex = promotionProducts.findIndex((p) => p.id === productId);
        if (productIndex !== -1) {
          isPromo = true;
          const product = promotionProducts[productIndex];
          previousLikeState = product.isLiked;
          previousLikesCount = product.likes;
          const updated = [...promotionProducts];
          updated[productIndex] = {
            ...product,
            isLiked: !previousLikeState,
            likes: previousLikeState
              ? previousLikesCount - 1
              : previousLikesCount + 1,
          };
          setPromotionProducts(updated);
        } else return;
      }

      try {
        const token = await AsyncStorage.getItem("userToken");
        if (!token) throw new Error("Non authentifié");

        const endpoint = productId.startsWith("promo_")
          ? `https://shopnet-backend.onrender.com/api/promotions/${productId.replace("promo_", "")}/like`
          : `https://shopnet-backend.onrender.com/api/interactions/${productId}/like`;

        const response = await axios.post(
          endpoint,
          {},
          { headers: { Authorization: `Bearer ${token}` } },
        );
        if (!response.data.success) throw new Error("Erreur like");
      } catch (error) {
        // Rollback
        if (!isPromo) {
          const updated = [...normalProducts];
          updated[productIndex] = {
            ...updated[productIndex],
            isLiked: previousLikeState,
            likes: previousLikesCount,
          };
          setNormalProducts(updated);
        } else {
          const updated = [...promotionProducts];
          updated[productIndex] = {
            ...updated[productIndex],
            isLiked: previousLikeState,
            likes: previousLikesCount,
          };
          setPromotionProducts(updated);
        }
        showNotification("Erreur lors du like");
      }
    },
    [normalProducts, promotionProducts],
  );

  const handleComment = useCallback((productId: string) => {
    router.push({
      pathname: "/(tabs)/Auth/Produits/Commentaire",
      params: { productId },
    });
  }, []);

  const handleShare = useCallback(
    async (product: Product) => {
      try {
        const result = await Share.share({
          title: product.isPromotion
            ? `🔥 PROMO: ${product.title}`
            : `Partager ${product.title}`,
          message: product.isPromotion
            ? `🔥 PROMOTION !\n${product.title}\nPrix: $${product.price}\n${product.description}`
            : `Découvrez ${product.title} à $${product.price}\n${product.description}`,
        });
        if (result.action === Share.sharedAction) {
          // Incrémenter les partages
          const productIndex = normalProducts.findIndex(
            (p) => p.id === product.id,
          );
          if (productIndex !== -1) {
            const updated = [...normalProducts];
            updated[productIndex].shares += 1;
            setNormalProducts(updated);
          } else {
            const promoIndex = promotionProducts.findIndex(
              (p) => p.id === product.id,
            );
            if (promoIndex !== -1) {
              const updated = [...promotionProducts];
              updated[promoIndex].shares += 1;
              setPromotionProducts(updated);
            }
          }
        }
      } catch (error) {
        console.error("Erreur partage:", error);
      }
    },
    [normalProducts, promotionProducts],
  );

  const handleAddToCart = useCallback(
    async (product: Product) => {
      try {
        const token = await AsyncStorage.getItem("userToken");
        if (!token) {
          showNotification("Authentification requise");
          return;
        }

        const cartItem = {
          product_id: product.isPromotion ? product.promotionId : product.id,
          title: product.title,
          description: product.description,
          price: product.price,
          original_price: product.original_price || product.price,
          category: categories[activeCategory]?.replace(/[^a-zA-Z]/g, "") || "",
          condition: "new",
          quantity: 1,
          stock: 10,
          location: product.location,
          delivery_options: { pickup: true, delivery: true },
          images: product.images || [],
          seller_id: product.seller?.id || "",
          seller_name: product.seller?.name || "",
          seller_rating: product.rating || 0,
        };

        const res = await authApi.post(
          "https://shopnet-backend.onrender.com/api/cart",
          cartItem,
          {
            headers: { Authorization: `Bearer ${token}` },
          },
        );

        if (res.data?.success) {
          showNotification(
            `✅ ${product.isPromotion ? "Promotion" : "Produit"} ajoutm� au panier`,
          );
          if (soundRef.current) await soundRef.current.replayAsync();
        } else {
          showNotification("⚠️ Impossible d'ajouter");
        }
      } catch (error) {
        showNotification("❌ Erreur");
      }
    },
    [activeCategory, categories],
  );

  const onProductPress = useCallback((product: Product) => {
    if (product.isPromotion && product.promotionId) {
      router.push({
        pathname: "/(tabs)/Auth/Panier/PromoDetail",
        params: { id: product.promotionId.toString() },
      });
    } else {
      router.push({
        pathname: "/(tabs)/Auth/Panier/DetailId",
        params: { id: product.id.toString() },
      });
    }
  }, []);

  const onInternalPromoPress = useCallback(() => {
    router.push("/(tabs)/Auth/Boutique/Boutique");
  }, []);

  // ===============================
  // RENDU DU FLATLIST
  // ===============================
  const renderFeedItem = useCallback(
    ({ item }: { item: FeedItem }) => {
      switch (item.type) {
        case "product":
          return (
            <FullWidthProductCard
              item={item.data}
              handleLike={handleLike}
              handleComment={handleComment}
              handleShare={handleShare}
              handleAddToCart={handleAddToCart}
              router={router}
            />
          );
        case "horizontal":
          return (
            <HorizontalProductRow
              products={item.data}
              onProductPress={onProductPress}
            />
          );
        case "grid":
          return (
            <TwoColumnGrid
              products={item.data}
              onProductPress={onProductPress}
            />
          );
        case "internal":
          return (
            <InternalPromotionCard
              item={item.data}
              onPress={onInternalPromoPress}
            />
          );
        default:
          return null;
      }
    },
    [
      handleLike,
      handleComment,
      handleShare,
      handleAddToCart,
      router,
      onProductPress,
      onInternalPromoPress,
    ],
  );

  const renderFooter = useCallback(() => {
    if (!isLoadingMore) return null;
    return (
      <ActivityIndicator
        style={styles.footerLoader}
        size="large"
        color="#4CAF50"
      />
    );
  }, [isLoadingMore]);

  const handleRefresh = useCallback(() => refreshFeed(true), [refreshFeed]);
  const handleLoadMore = useCallback(() => loadMore(), [loadMore]);
  const handleCategoryPress = useCallback(
    (index: number) => {
      setActiveCategory(index);
      refreshFeed(true);
    },
    [refreshFeed],
  );

  // ===============================
  // RENDU PRINCIPAL
  // ===============================
  if (loading && feedItems.length === 0) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4CAF50" />
        <Text style={styles.loadingText}>Chargement du fil...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar backgroundColor="#fff" barStyle="dark-content" />

      <Animated.View
        style={[
          styles.notification,
          { transform: [{ translateY: notificationAnim }] },
        ]}
      >
        <Text style={styles.notificationText}>{notificationText}</Text>
      </Animated.View>

      <View style={styles.header}>
        <Text style={styles.logo}>SHOPNET</Text>
        <View style={styles.headerIcons}>
          <TouchableOpacity
            onPress={() => router.push("/(tabs)/Auth/Produits/Recherche")}
          >
            <FontAwesome name="search" size={20} color="#333" />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() =>
              router.push("/(tabs)/Auth/Notification/NotificationsUser")
            }
          >
            <View style={styles.iconContainer}>
              <FontAwesome name="bell" size={20} color="#333" />
              <NotificationBadge count={badgeCounts.notification} />
            </View>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => router.push("/(tabs)/Auth/Produits/profil-debug")}
          >
            <View style={styles.iconContainer}>
              <FontAwesome name="user-circle" size={20} color="#333" />
              <NotificationBadge count={badgeCounts.profile} small />
            </View>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.categoriesWrapper}>
        <FlatList
          horizontal
          data={categories}
          keyExtractor={(_, index) => index.toString()}
          renderItem={({ item, index }) => (
            <TouchableOpacity
              style={[
                styles.categoryPill,
                activeCategory === index && styles.activeCategoryPill,
              ]}
              onPress={() => handleCategoryPress(index)}
            >
              <Text
                style={[
                  styles.categoryText,
                  activeCategory === index && styles.activeCategoryText,
                ]}
              >
                {item}
              </Text>
            </TouchableOpacity>
          )}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.categoriesContainer}
        />
      </View>

      <FlatList
        data={feedItems}
        renderItem={renderFeedItem}
        keyExtractor={(item, index) => {
          if (item.type === "product") return `product-${item.data.id}`;
          if (item.type === "horizontal") return `horizontal-${index}`;
          if (item.type === "grid") return `grid-${index}`;
          return `internal-${item.data.id}`;
        }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={["#4CAF50"]}
          />
        }
        contentContainerStyle={styles.listContent}
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.3}
        ListFooterComponent={renderFooter}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <FontAwesome name="shopping-bag" size={60} color="#ccc" />
            <Text style={styles.emptyText}>Aucun produit disponible</Text>
            <TouchableOpacity
              style={styles.retryButton}
              onPress={() => refreshFeed(true)}
            >
              <Text style={styles.retryButtonText}>Réessayer</Text>
            </TouchableOpacity>
          </View>
        }
        initialNumToRender={5}
        maxToRenderPerBatch={10}
        windowSize={7}
        removeClippedSubviews
        getItemLayout={(data, index) => ({
          length: 500,
          offset: 500 * index,
          index,
        })} // approximatif
      />

      {/* Bottom Navigation (identique) */}
      <View style={styles.enhancedBottomNav}>
        {["Home", "Discover", "Sell", "Messages", "Profile"].map(
          (screen, index) => (
            <TouchableOpacity
              key={screen}
              style={styles.navButton}
              onPress={() => {
                setActiveTab(index);
                if (screen === "Sell")
                  router.push("/(tabs)/Auth/Produits/Produit");
                else if (screen === "Home")
                  router.push("/(tabs)/Auth/Produits/Fil");
                else if (screen === "Discover")
                  router.push("/(tabs)/Auth/Produits/Decouvrir");
                else if (screen === "Messages")
                  router.push("/(tabs)/Auth/Panier/CartListScreen");
                else router.push("/(tabs)/Auth/Produits/profil-debug");
              }}
            >
              <View style={styles.navIconContainer}>
                <FontAwesome
                  name={
                    screen === "Home"
                      ? "home"
                      : screen === "Discover"
                        ? "compass"
                        : screen === "Sell"
                          ? "plus"
                          : screen === "Messages"
                            ? "comments"
                            : "user"
                  }
                  size={24}
                  color={activeTab === index ? "#4CAF50" : "#666"}
                />
                {screen === "Home" && badgeCounts.promotion > 0 && (
                  <NotificationBadge count={badgeCounts.promotion} small />
                )}
                {screen === "Discover" && badgeCounts.discover > 0 && (
                  <NotificationBadge count={badgeCounts.discover} small />
                )}
                {screen === "Messages" && badgeCounts.cart > 0 && (
                  <NotificationBadge count={badgeCounts.cart} small />
                )}
                {screen === "Profile" && badgeCounts.profile > 0 && (
                  <NotificationBadge count={badgeCounts.profile} small />
                )}
              </View>
              <Text
                style={[
                  styles.navLabel,
                  activeTab === index && styles.activeNavLabel,
                ]}
              >
                {screen === "Home"
                  ? "Tendances"
                  : screen === "Discover"
                    ? "Découvrir"
                    : screen === "Sell"
                      ? "Vendre"
                      : screen === "Messages"
                        ? "Panier"
                        : "Profil"}
              </Text>
            </TouchableOpacity>
          ),
        )}
      </View>
    </SafeAreaView>
  );
};

// ===============================
// STYLES (ajouts pour les nouveaux composants)
// ===============================
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f0f2f5" },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#fff",
  },
  loadingText: { marginTop: 10, color: "#666", fontSize: 16 },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
    marginTop: 50,
  },
  emptyText: {
    fontSize: 18,
    color: "#666",
    marginTop: 20,
    marginBottom: 20,
    textAlign: "center",
  },
  retryButton: {
    backgroundColor: "#4CAF50",
    paddingVertical: 12,
    paddingHorizontal: 25,
    borderRadius: 8,
  },
  retryButtonText: { color: "#fff", fontWeight: "bold", fontSize: 16 },
  footerLoader: { padding: 20, justifyContent: "center", alignItems: "center" },
  notification: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    backgroundColor: "#4CAF50",
    padding: 15,
    zIndex: 100,
  },
  notificationText: { color: "#fff", textAlign: "center", fontWeight: "bold" },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 15,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#e0e0e0",
    elevation: 2,
  },
  logo: { fontSize: 24, fontWeight: "bold", color: "#4CAF50" },
  headerIcons: { flexDirection: "row", alignItems: "center", gap: 20 },
  iconContainer: { position: "relative" },
  categoriesWrapper: {
    backgroundColor: "#fff",
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#e0e0e0",
  },
  categoriesContainer: { paddingHorizontal: 15 },
  categoryPill: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    marginRight: 10,
    backgroundColor: "#f0f2f5",
    elevation: 1,
  },
  activeCategoryPill: { backgroundColor: "#4CAF50" },
  categoryText: { color: "#666", fontWeight: "600", fontSize: 14 },
  activeCategoryText: { color: "#fff" },
  listContent: { paddingBottom: 80 },

  // Styles pour les différents formats
  fullWidthCard: {
    backgroundColor: "#fff",
    marginBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#e0e0e0",
  },
  fullWidthImage: { width: "100%", height: width, backgroundColor: "#eee" },
  productHeader: { flexDirection: "row", alignItems: "center", padding: 12 },
  avatar: { width: 40, height: 40, borderRadius: 20, marginRight: 10 },
  sellerInfo: { flex: 1 },
  sellerName: { fontWeight: "bold", fontSize: 15 },
  productLocation: { fontSize: 12, color: "#666" },
  priceContainer: {
    position: "absolute",
    bottom: 10,
    left: 10,
    backgroundColor: "rgba(0,0,0,0.7)",
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 8,
    flexDirection: "row",
    alignItems: "center",
  },
  originalPrice: {
    color: "#aaa",
    textDecorationLine: "line-through",
    fontSize: 14,
    marginRight: 8,
  },
  discountedPrice: { color: "#FFD700", fontWeight: "bold", fontSize: 18 },
  normalPrice: { color: "#fff", fontWeight: "bold", fontSize: 18 },
  discountText: { color: "#FFD700", fontSize: 12, marginLeft: 5 },
  discountBadge: {
    backgroundColor: "#4CAF50",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginLeft: 8,
  },
  discountBadgeText: { color: "#fff", fontSize: 11, fontWeight: "bold" },
  promotionBadge: {
    position: "absolute",
    top: 10,
    left: 10,
    backgroundColor: "rgba(255, 87, 34, 0.9)",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    flexDirection: "row",
    alignItems: "center",
  },
  promotionBadgeText: { color: "#fff", fontWeight: "bold", fontSize: 12 },
  timerText: {
    color: "#FFD700",
    fontWeight: "bold",
    fontSize: 10,
    marginLeft: 5,
  },
  productInfo: { paddingHorizontal: 12, paddingVertical: 10 },
  productTitle: { fontSize: 17, fontWeight: "bold", color: "#333" },
  productDescription: {
    color: "#666",
    marginTop: 4,
    fontSize: 14,
    lineHeight: 20,
  },
  ratingContainer: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    marginBottom: 10,
  },
  starsContainer: { flexDirection: "row", marginRight: 5 },
  socialCount: { fontSize: 13, color: "#666" },
  actionButtons: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 12,
    borderTopWidth: 1,
    borderTopColor: "#f0f2f5",
  },
  socialActions: { flexDirection: "row", alignItems: "center", gap: 20 },
  socialButton: { flexDirection: "row", alignItems: "center", gap: 5 },
  cartButton: {
    backgroundColor: "#4CAF50",
    borderRadius: 8,
    paddingHorizontal: 20,
    paddingVertical: 10,
    elevation: 2,
  },
  promotionCartButton: { backgroundColor: "#FF5722" },
  cartButtonText: { color: "#fff", fontWeight: "bold", fontSize: 14 },

  // Horizontal row
  horizontalRowContainer: {
    backgroundColor: "#fff",
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#e0e0e0",
  },
  horizontalListContent: { paddingHorizontal: 12 },
  miniCard: {
    width: 120,
    marginRight: 10,
    backgroundColor: "#fff",
    borderRadius: 8,
    elevation: 1,
    overflow: "hidden",
  },
  miniImage: { width: 120, height: 120, backgroundColor: "#eee" },
  miniTitle: {
    fontSize: 13,
    fontWeight: "500",
    paddingHorizontal: 5,
    marginTop: 5,
  },
  miniPrice: {
    fontSize: 12,
    fontWeight: "bold",
    color: "#4CAF50",
    paddingHorizontal: 5,
    paddingBottom: 5,
  },

  // Grid 2 colonnes
  gridContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    paddingHorizontal: 12,
    backgroundColor: "#fff",
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#e0e0e0",
  },
  gridCard: {
    width: (width - 36) / 2,
    backgroundColor: "#fff",
    marginBottom: 12,
    borderRadius: 8,
    elevation: 1,
    overflow: "hidden",
  },
  gridImage: {
    width: "100%",
    height: (width - 36) / 2,
    backgroundColor: "#eee",
  },
  gridTitle: {
    fontSize: 14,
    fontWeight: "500",
    paddingHorizontal: 8,
    marginTop: 5,
  },
  gridPriceRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    marginTop: 3,
  },
  gridOriginalPrice: {
    fontSize: 12,
    color: "#aaa",
    textDecorationLine: "line-through",
    marginRight: 6,
  },
  gridPrice: { fontSize: 14, fontWeight: "bold", color: "#333" },
  gridDiscount: { fontSize: 12, color: "#4CAF50", marginLeft: 6 },
  gridSellerRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingBottom: 8,
    marginTop: 4,
  },
  gridSellerAvatar: { width: 16, height: 16, borderRadius: 8, marginRight: 4 },
  gridSellerName: { fontSize: 11, color: "#666", flex: 1 },

  // Internal promotion
  internalPromoCard: {
    backgroundColor: "#fff",
    marginBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#e0e0e0",
  },
  internalPromoImage: {
    width: "100%",
    height: 200,
    backgroundColor: "#4CAF50",
  },
  internalPromoContent: { padding: 15 },
  internalPromoTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 5,
  },
  internalPromoDescription: { fontSize: 14, color: "#666", lineHeight: 20 },

  // Badges
  badge: {
    position: "absolute",
    top: -5,
    right: -5,
    backgroundColor: "#FF3B30",
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1.5,
    borderColor: "#fff",
    minWidth: 18,
    height: 18,
    zIndex: 100,
  },
  smallBadge: { minWidth: 16, height: 16, top: -3, right: -3 },
  regularBadge: { minWidth: 20, height: 20, top: -8, right: -8 },
  largeCountBadge: { minWidth: 24, paddingHorizontal: 4 },
  badgeText: { color: "#fff", fontWeight: "bold", textAlign: "center" },
  smallBadgeText: { fontSize: 9 },
  regularBadgeText: { fontSize: 11 },

  // Bottom navigation
  enhancedBottomNav: {
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "center",
    backgroundColor: "#fff",
    borderTopWidth: 1,
    borderTopColor: "#e0e0e0",
    paddingVertical: 12,
    paddingHorizontal: 5,
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    elevation: 8,
  },
  navButton: { alignItems: "center", flex: 1, position: "relative" },
  navIconContainer: { position: "relative" },
  navLabel: { fontSize: 12, color: "#666", marginTop: 4 },
  activeNavLabel: { color: "#4CAF50", fontWeight: "bold" },
});

export default ShopApp;
