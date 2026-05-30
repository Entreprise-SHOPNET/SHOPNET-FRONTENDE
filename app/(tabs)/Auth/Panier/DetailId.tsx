

import React, { useEffect, useState, useRef, useCallback } from "react";
import {
  View,
  Text,
  Image,
  ActivityIndicator,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  Linking,
  FlatList,
  Modal,
  Animated,
  SafeAreaView,
  StatusBar,
  LayoutAnimation,
  Platform,
  UIManager,
  Share,
  TextInput,
  Alert,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons, MaterialIcons, FontAwesome } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useTheme } from "../../../../app/theme/ThemeContext";

// Enable LayoutAnimation on Android
if (Platform.OS === "android") {
  UIManager.setLayoutAnimationEnabledExperimental?.(true);
}

// ------------------------------------------------------------
// Configuration et constantes
// ------------------------------------------------------------
const LOCAL_API = "https://shopnet-backend.onrender.com/api";
const { width, height } = Dimensions.get("window");
const USD_TO_CDF = 2307;

// Cache TTL (5 minutes)
const CACHE_TTL = 5 * 60 * 1000;

// Couleurs de base (utilisées comme fallback)
const COLORS_BASE = {
  primary: "#222222",
  secondary: "#757575",
  accent: "#FF6B00",
  background: "#FFFFFF",
  cardBackground: "#F5F5F5",
  border: "#E8E8E8",
  white: "#FFFFFF",
  black: "#000000",
  success: "#4CAF50",
  error: "#FF4444",
  whatsapp: "#25D366",
  blue: "#1877F2",
};

// Types
type ProductDetail = {
  id: number;
  title: string;
  description: string;
  price: number;
  original_price: number | null;
  category: string;
  condition: string;
  stock: number;
  location: string;
  created_at: string;
  images: string[];
  is_boosted?: boolean;
};

type Seller = {
  id: number;
  nom: string;
  phone: string;
  email: string;
  adresse: string;
};

type Boutique = {
  id: number;
  nom: string;
  ville: string;
};

type SimilarProduct = {
  id: number;
  title: string;
  price: number;
  original_price?: number | null;
  image_url: string | null;
  is_boosted?: boolean;
  created_at?: string;
  duration_days?: number;
};

type Category = {
  id: string;
  name: string;
  icon: string;
  onPress: () => void;
};

// ------------------------------------------------------------
// Hook pour obtenir les couleurs dynamiques selon le thème
// ------------------------------------------------------------
const useDynamicColors = () => {
  const { isDark } = useTheme();

  return {
    primary: isDark ? '#F5F5F5' : '#1A1A2E',
    secondary: isDark ? '#B0B0B0' : '#6C6C80',
    accent: '#FF6B00',
    background: isDark ? '#0D0D0D' : '#F5F6FA',
    cardBackground: isDark ? '#1A1A1A' : '#F0F0F4',
    border: isDark ? '#2E2E2E' : '#E8E8EC',
    white: isDark ? '#1A1A1A' : '#FFFFFF',
    black: '#000000',
    success: '#4CAF50',
    error: '#FF4444',
    whatsapp: '#25D366',
    blue: '#1877F2',
    headerBg: isDark ? '#1A1A1A' : '#FFFFFF',
    headerBorder: isDark ? '#2E2E2E' : '#E8E8EC',
    textPrimary: isDark ? '#F5F5F5' : '#1A1A2E',
    textSecondary: isDark ? '#B0B0B0' : '#6C6C80',
    textInverse: isDark ? '#1A1A2E' : '#FFFFFF',
    cardBg: isDark ? '#1A1A1A' : '#FFFFFF',
    placeholder: isDark ? '#222222' : '#F0F0F4',
    statusBar: isDark ? '#0D0D0D' : '#FFFFFF',
    barStyle: isDark ? 'light-content' as const : 'dark-content' as const,
    overlayBg: isDark ? 'rgba(0,0,0,0.95)' : 'rgba(0,0,0,0.95)',
    modalBg: isDark ? '#1A1A1A' : '#FFFFFF',
    inputBg: isDark ? '#222222' : '#FFFFFF',
    inputBorder: isDark ? '#2E2E2E' : '#E8E8EC',
    inputText: isDark ? '#F5F5F5' : '#1A1A2E',
    placeholderText: isDark ? '#666666' : '#999999',
  };
};

// ------------------------------------------------------------
// Fonctions utilitaires (cache)
// ------------------------------------------------------------
const getCachedData = async (key: string) => {
  try {
    const cached = await AsyncStorage.getItem(key);
    if (cached) {
      const { data, timestamp } = JSON.parse(cached);
      if (Date.now() - timestamp < CACHE_TTL) {
        return data;
      }
    }
    return null;
  } catch {
    return null;
  }
};

const setCachedData = async (key: string, data: any) => {
  try {
    const cacheObj = { data, timestamp: Date.now() };
    await AsyncStorage.setItem(key, JSON.stringify(cacheObj));
  } catch (e) {
    console.error("Cache set error", e);
  }
};

// ------------------------------------------------------------
// Fonctions utilitaires existantes
// ------------------------------------------------------------
const formatPrice = (price: any) => {
  const n = Number(price);
  return isNaN(n) ? "0.00" : n.toFixed(2);
};

const formatPriceCDF = (priceUSD: number) => {
  return Math.round(priceUSD * USD_TO_CDF).toLocaleString("fr-CD") + " CDF";
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

const cleanText = (text: string) => {
  if (!text) return "";
  return text.replace(/\s+/g, " ").trim();
};

const getRelativeDate = (dateString: string) => {
  if (!dateString) return "";
  const created = new Date(dateString);
  const now = new Date();
  const diffDays = Math.floor(
    (now.getTime() - created.getTime()) / (1000 * 60 * 60 * 24),
  );
  if (diffDays < 7) return `Il y a ${diffDays} jour${diffDays > 1 ? "s" : ""}`;
  return "Plus de 7 jours";
};

// Génération de 100 avis mockés avec noms congolais
const generateMockReviews = () => {
  const firstNames = [
    "Jean", "Marie", "Paul", "Joseph", "Pierre", "Albert", "Antoine", "Benoît",
    "Charles", "Daniel", "Emmanuel", "Fabrice", "Georges", "Henri", "Isaac",
    "Jacques", "Koffi", "Léon", "Michel", "Nicolas", "Olivier", "Patrice",
    "Quentin", "Roger", "Serge", "Thierry", "Ulrich", "Vincent", "Wilfried",
    "Xavier", "Yves", "Zacharie", "Aimé", "Blaise", "Célestin", "Didier",
    "Étienne", "Félix", "Gaston", "Hugo",
  ];
  const lastNames = [
    "Mbala", "Kabasele", "Tshibola", "Lukusa", "Mukendi", "Kazadi", "Ilunga",
    "Ntumba", "Mbuyi", "Tshimanga", "Kabongo", "Mpoyi", "Banza", "Kalonji",
    "Lumumba", "Mobutu", "Tshisekedi", "Kabila", "Malu", "Ngoy",
  ];
  const comments = [
    "Excellent produit, je recommande !",
    "Très satisfait, livraison rapide.",
    "Conforme à la description, bon rapport qualité-prix.",
    "Produit de qualité, je referai mes achats ici.",
    "Superbe, rien à dire.",
    "Je suis ravi de mon achat, merci SHOPNET !",
    "Parfait, je l'utilise tous les jours.",
    "Bonne réactivité du vendeur, je recommande.",
    "Rien à redire, tout est parfait.",
    "Je suis très content de ce produit, il répond à mes attentes.",
    "Livraison rapide et produit conforme.",
    "Très bonne qualité, je suis satisfait.",
    "Je recommande ce vendeur, sérieux et professionnel.",
    "Top !",
    "Rapport qualité-prix imbattable.",
    "Je ne suis pas déçu, je recommande vivement.",
    "Service client réactif, merci.",
    "Produit bien emballé, rien à signaler.",
    "Je le conseille à tout le monde.",
    "Super produit, je l'utilise depuis une semaine et rien à redire.",
  ];
  const reviews = [];
  for (let i = 1; i <= 100; i++) {
    const firstName = firstNames[Math.floor(Math.random() * firstNames.length)];
    const lastName = lastNames[Math.floor(Math.random() * lastNames.length)];
    const fullName = `${firstName} ${lastName}`;
    const rating = Math.floor(Math.random() * 5) + 1;
    const comment = comments[Math.floor(Math.random() * comments.length)];
    reviews.push({
      id: i,
      user: fullName,
      avatar: `https://randomuser.me/api/portraits/${Math.random() > 0.5 ? "men" : "women"}/${Math.floor(Math.random() * 100)}.jpg`,
      rating,
      comment,
      date: new Date(
        Date.now() - Math.random() * 90 * 24 * 60 * 60 * 1000,
      ).toISOString(),
    });
  }
  return reviews;
};

// Détection d'URLs
const extractUrls = (text: string): { url: string; type: string }[] => {
  if (!text) return [];
  const urlRegex =
    /(https?:\/\/[^\s]+)|(www\.[^\s]+)|([a-zA-Z0-9][a-zA-Z0-9-]{1,61}[a-zA-Z0-9]\.[a-zA-Z]{2,}(?:\/[^\s]*)?)/gi;
  const urls: { url: string; type: string }[] = [];
  let match;
  while ((match = urlRegex.exec(text)) !== null) {
    let url = match[0];
    let type = "lien";
    if (url.includes("youtube.com") || url.includes("youtu.be")) type = "youtube";
    else if (url.includes("facebook.com")) type = "facebook";
    else if (url.includes("instagram.com")) type = "instagram";
    else if (url.includes("twitter.com") || url.includes("x.com")) type = "twitter";
    else if (url.includes("tiktok.com")) type = "tiktok";
    else if (url.includes("amazon.com") || url.includes("amzn.to")) type = "amazon";
    else if (url.includes("ebay.com")) type = "ebay";
    else if (url.includes(".pdf")) type = "pdf";
    else if (url.includes(".jpg") || url.includes(".png") || url.includes(".gif")) type = "image";
    if (!url.startsWith("http://") && !url.startsWith("https://")) url = "https://" + url;
    urls.push({ url, type });
  }
  return urls;
};

// Composant lien
const LinkComponent = ({
  url,
  type,
  onPress,
  colors,
}: {
  url: string;
  type: string;
  onPress: (url: string) => void;
  colors: any;
}) => {
  const getIconForType = () => {
    switch (type) {
      case "youtube": return <Ionicons name="logo-youtube" size={20} color="#FF0000" />;
      case "facebook": return <Ionicons name="logo-facebook" size={20} color="#1877F2" />;
      case "instagram": return <Ionicons name="logo-instagram" size={20} color="#E4405F" />;
      case "twitter": return <Ionicons name="logo-twitter" size={20} color="#1DA1F2" />;
      case "tiktok": return <Ionicons name="logo-tiktok" size={20} color="#000000" />;
      case "amazon": return <Ionicons name="cart" size={20} color="#FF9900" />;
      case "ebay": return <Ionicons name="pricetag" size={20} color="#E53238" />;
      case "pdf": return <Ionicons name="document-text" size={20} color="#FF5722" />;
      case "image": return <Ionicons name="image" size={20} color="#4CAF50" />;
      default: return <Ionicons name="link" size={20} color="#1877F2" />;
    }
  };

  const getDomain = (url: string) => {
    try { return new URL(url).hostname.replace("www.", ""); }
    catch { return url.substring(0, 30) + (url.length > 30 ? "..." : ""); }
  };

  return (
    <TouchableOpacity
      style={[styles.linkItem, { backgroundColor: colors.cardBackground }]}
      onPress={() => onPress(url)}
      activeOpacity={0.7}
    >
      <View style={[styles.linkIconContainer, { backgroundColor: colors.cardBg }]}>
        {getIconForType()}
      </View>
      <View style={styles.linkContent}>
        <Text style={[styles.linkDomain, { color: colors.textPrimary }]} numberOfLines={1}>
          {getDomain(url)}
        </Text>
        <Text style={[styles.linkUrl, { color: colors.textSecondary }]} numberOfLines={1}>
          {url}
        </Text>
      </View>
      <View style={styles.linkArrow}>
        <Ionicons name="open-outline" size={18} color={colors.textSecondary} />
      </View>
    </TouchableOpacity>
  );
};

// Description extensible
const ExpandableDescription = ({ description, colors }: { description: string; colors: any }) => {
  const [expanded, setExpanded] = useState(false);
  const [isLongText, setIsLongText] = useState(false);
  const animationValue = useRef(new Animated.Value(0)).current;
  const cleanDescription = cleanText(description);

  useEffect(() => {
    if (cleanDescription.length > 150) setIsLongText(true);
  }, [cleanDescription]);

  const toggleExpand = () => {
    LayoutAnimation.configureNext({
      duration: 300,
      create: { type: LayoutAnimation.Types.easeInEaseOut, property: LayoutAnimation.Properties.opacity },
      update: { type: LayoutAnimation.Types.easeInEaseOut },
    });
    Animated.timing(animationValue, {
      toValue: expanded ? 0 : 1,
      duration: 300,
      useNativeDriver: true,
    }).start();
    setExpanded(!expanded);
  };

  const rotateIcon = animationValue.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "180deg"],
  });

  if (!description)
    return <Text style={[styles.description, { color: colors.textSecondary }]}>Aucune description disponible.</Text>;

  return (
    <View style={styles.descriptionContainer}>
      <Text
        style={[styles.description, { color: colors.textPrimary }, !expanded && styles.descriptionCollapsed]}
        numberOfLines={expanded ? undefined : 4}
      >
        {cleanDescription}
      </Text>
      {isLongText && (
        <TouchableOpacity style={styles.readMoreButton} onPress={toggleExpand} activeOpacity={0.7}>
          <View style={styles.readMoreContent}>
            <Text style={[styles.readMoreText, { color: colors.accent }]}>
              {expanded ? "Voir moins" : "Voir plus"}
            </Text>
            <Animated.View style={{ transform: [{ rotate: rotateIcon }] }}>
              <Ionicons name="chevron-down" size={18} color={colors.accent} />
            </Animated.View>
          </View>
        </TouchableOpacity>
      )}
    </View>
  );
};

// Étoiles
const StarRating = ({
  rating,
  onRatingChange,
  size = 30,
  colors,
}: {
  rating: number;
  onRatingChange: (r: number) => void;
  size?: number;
  colors: any;
}) => {
  return (
    <View style={{ flexDirection: "row" }}>
      {[1, 2, 3, 4, 5].map((star) => (
        <TouchableOpacity key={star} onPress={() => onRatingChange(star)}>
          <Ionicons
            name={star <= rating ? "star" : "star-outline"}
            size={size}
            color={star <= rating ? "#FFC107" : colors.textSecondary}
            style={{ marginHorizontal: 5 }}
          />
        </TouchableOpacity>
      ))}
    </View>
  );
};

// Composant compte à rebours pour promotion
const CountdownTimer = ({ endDate }: { endDate: Date }) => {
  const [timeLeft, setTimeLeft] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });

  useEffect(() => {
    const interval = setInterval(() => {
      const now = new Date().getTime();
      const distance = endDate.getTime() - now;
      if (distance < 0) {
        clearInterval(interval);
        setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0 });
        return;
      }
      const days = Math.floor(distance / (1000 * 60 * 60 * 24));
      const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((distance % (1000 * 60)) / 1000);
      setTimeLeft({ days, hours, minutes, seconds });
    }, 1000);
    return () => clearInterval(interval);
  }, [endDate]);

  if (timeLeft.days === 0 && timeLeft.hours === 0 && timeLeft.minutes === 0 && timeLeft.seconds === 0) return null;

  return (
    <View style={styles.countdownContainer}>
      <Ionicons name="time-outline" size={12} color="#FFFFFF" />
      <Text style={styles.countdownText}>
        {timeLeft.days > 0 && `${timeLeft.days}j `}
        {timeLeft.hours}h {timeLeft.minutes}m {timeLeft.seconds}s
      </Text>
    </View>
  );
};

// ------------------------------------------------------------
// Composant principal
// ------------------------------------------------------------
export default function DetailId() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const COLORS = useDynamicColors();

  // États principaux
  const [loading, setLoading] = useState(true);
  const [product, setProduct] = useState<ProductDetail | null>(null);
  const [seller, setSeller] = useState<Seller | null>(null);
  const [boutique, setBoutique] = useState<Boutique | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [similarProducts, setSimilarProducts] = useState<SimilarProduct[]>([]);
  const [similarPage, setSimilarPage] = useState(1);
  const [similarHasMore, setSimilarHasMore] = useState(true);
  const [similarLoadingMore, setSimilarLoadingMore] = useState(false);

  // Autres sections
  const [viralProducts, setViralProducts] = useState<ProductDetail[]>([]);
  const [suggestions, setSuggestions] = useState<ProductDetail[]>([]);

  // Images & liens
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [detectedLinks, setDetectedLinks] = useState<{ url: string; type: string }[]>([]);

  // Avis
  const [allReviews] = useState(generateMockReviews());
  const [visibleReviews, setVisibleReviews] = useState<any[]>([]);
  const [reviewsOffset, setReviewsOffset] = useState(0);
  const REVIEWS_PER_LOAD = 3;

  // Modal d'avis
  const [reviewModalVisible, setReviewModalVisible] = useState(false);
  const [newRating, setNewRating] = useState(5);
  const [newComment, setNewComment] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Animations & notifications
  const [notificationVisible, setNotificationVisible] = useState(false);
  const [notificationMessage, setNotificationMessage] = useState("");
  const notificationPosition = useRef(new Animated.Value(-100)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;

  const flatListRef = useRef<FlatList>(null);

  const showNotification = (message: string) => {
    setNotificationMessage(message);
    setNotificationVisible(true);
    Animated.sequence([
      Animated.timing(notificationPosition, { toValue: 60, duration: 400, useNativeDriver: true }),
      Animated.delay(2000),
      Animated.timing(notificationPosition, { toValue: -100, duration: 400, useNativeDriver: true }),
    ]).start(() => setNotificationVisible(false));
  };

  // Avis initiaux
  useEffect(() => {
    setVisibleReviews(allReviews.slice(0, REVIEWS_PER_LOAD));
    setReviewsOffset(REVIEWS_PER_LOAD);
  }, []);

  const loadMoreReviews = () => {
    const newOffset = reviewsOffset + REVIEWS_PER_LOAD;
    const newReviews = allReviews.slice(0, newOffset);
    setVisibleReviews(newReviews);
    setReviewsOffset(newOffset);
  };

  // ------------------------------------------------------------
  // Récupération du produit principal (avec cache)
  // ------------------------------------------------------------
  const fetchProductDetail = async () => {
    try {
      const cacheKey = `product_${id}`;
      const cachedData = await getCachedData(cacheKey);

      if (cachedData) {
        setProduct(cachedData.product);
        setSeller(cachedData.seller);
        setBoutique(cachedData.boutique);
        setDetectedLinks(extractUrls(cachedData.product.description || ""));
        const initialSimilars = (cachedData.similar_products || []).slice(0, 10).map((p: any) => ({
          id: p.id, title: p.title, price: parseFloat(p.price) || 0,
          original_price: p.original_price ? parseFloat(p.original_price) : null,
          image_url: p.image_url, is_boosted: p.is_boosted || false,
          created_at: p.created_at, duration_days: p.duration_days,
        }));
        setSimilarProducts(initialSimilars);
        setSimilarHasMore(initialSimilars.length >= 10 ? false : true);
        setLoading(false);
        fetchProductDetailFromNetwork(cacheKey);
        return;
      }

      await fetchProductDetailFromNetwork(cacheKey);
    } catch (err) {
      console.error("Erreur fetch product detail:", err);
      setError("Erreur de connexion");
    }
  };

  const fetchProductDetailFromNetwork = async (cacheKey?: string) => {
    try {
      const token = await getValidToken();
      const res = await fetch(`${LOCAL_API}/products/discover/product/${id}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      const data = await res.json();
      if (data.success) {
        setProduct(data.product);
        setSeller(data.seller);
        setBoutique(data.boutique);
        setDetectedLinks(extractUrls(data.product.description || ""));

        const initialSimilars = (data.similar_products || []).slice(0, 10).map((p: any) => ({
          id: p.id, title: p.title, price: parseFloat(p.price) || 0,
          original_price: p.original_price ? parseFloat(p.original_price) : null,
          image_url: p.image_url, is_boosted: p.is_boosted || false,
          created_at: p.created_at, duration_days: p.duration_days,
        }));
        setSimilarProducts(initialSimilars);
        setSimilarHasMore(initialSimilars.length >= 10 ? false : true);

        if (cacheKey) {
          await setCachedData(cacheKey, {
            product: data.product, seller: data.seller, boutique: data.boutique,
            similar_products: data.similar_products,
          });
        }

        await fetchViral();
        await fetchSuggestions();

        Animated.parallel([
          Animated.timing(fadeAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
          Animated.timing(slideAnim, { toValue: 0, duration: 500, useNativeDriver: true }),
        ]).start();
      } else {
        setError(data.message || "Produit non trouvé");
      }
    } catch (err) {
      console.error("Erreur fetch product detail network:", err);
      setError("Erreur de connexion");
    } finally {
      setLoading(false);
    }
  };

  const fetchMoreSimilar = async () => {
    if (similarProducts.length >= 10 || !similarHasMore || similarLoadingMore) return;
    setSimilarLoadingMore(true);
    try {
      const token = await getValidToken();
      const res = await fetch(`${LOCAL_API}/products/${id}/similar?page=${similarPage}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      const data = await res.json();
      if (data.success) {
        const newProducts = (data.products || []).map((p: any) => ({
          id: p.id, title: p.title, price: parseFloat(p.price) || 0,
          original_price: p.original_price ? parseFloat(p.original_price) : null,
          image_url: p.image_url, is_boosted: p.is_boosted || false,
          created_at: p.created_at, duration_days: p.duration_days,
        }));
        const merged = [...similarProducts, ...newProducts];
        const limited = merged.slice(0, 10);
        setSimilarProducts(limited);
        setSimilarPage((prev) => prev + 1);
        if (limited.length >= 10 || !data.has_more) {
          setSimilarHasMore(false);
        } else {
          setSimilarHasMore(data.has_more === true);
        }
      } else {
        setSimilarHasMore(false);
      }
    } catch (err) {
      console.error("Erreur fetch more similar:", err);
    } finally {
      setSimilarLoadingMore(false);
    }
  };

  const fetchViral = async () => {
    try {
      const cacheKey = "viral_products";
      const cached = await getCachedData(cacheKey);
      if (cached) { setViralProducts(cached); return; }
      const token = await getValidToken();
      const res = await fetch(`${LOCAL_API}/products/popular?limit=10`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      const data = await res.json();
      if (data.success) { setViralProducts(data.products); await setCachedData(cacheKey, data.products); }
    } catch (err) { console.error("Erreur fetch viral", err); }
  };

  const fetchSuggestions = async () => {
    try {
      const cacheKey = "suggestions";
      const cached = await getCachedData(cacheKey);
      if (cached) { setSuggestions(cached); return; }
      const res = await fetch(`${LOCAL_API}/products?limit=8`);
      const data = await res.json();
      if (data.success) {
        const others = data.products.filter((p: any) => p.id !== Number(id)).slice(0, 8);
        setSuggestions(others);
        await setCachedData(cacheKey, others);
      }
    } catch (err) { console.error("Erreur fetch suggestions", err); }
  };

  useEffect(() => {
    if (id) { setLoading(true); fetchProductDetail().finally(() => setLoading(false)); }
    else { setError("ID produit manquant"); router.back(); }
  }, [id]);

  // ------------------------------------------------------------
  // Actions
  // ------------------------------------------------------------
  const openWhatsApp = () => {
    const phone = seller?.phone;
    if (!phone) { showNotification("Numéro WhatsApp non disponible"); return; }
    const imageUrl = product?.images?.[0] || "";
    const message = encodeURIComponent(
      `Bonjour 👋,\n\nJe vous contacte via *SHOPNET*, une entreprise digitale spécialisée dans la mise en relation entre acheteurs et vendeurs.\n\nJ'ai découvert votre produit et il m'intéresse particulièrement :\n\n🛍️ Produit : "${product?.title}"\n💰 Prix : $${product?.price}\n\n📸 Aperçu du produit :\n${imageUrl}\n\nJe souhaiterais savoir s'il est toujours disponible.\n\nSi oui, pourriez-vous me donner plus d'informations (état du produit, disponibilité, modalités de livraison ou de paiement) ?\n\nJe suis réellement intéressé(e) et prêt(e) à avancer rapidement si le produit correspond à mes attentes.\n\nDans l'attente de votre retour.\n\nMerci d'avance 🙏`
    );
    Linking.openURL(`https://wa.me/${formatPhoneNumber(phone)}?text=${message}`).catch(() => showNotification("Impossible d'ouvrir WhatsApp"));
  };

  const sendEmail = () => {
    const email = seller?.email;
    if (!email) { showNotification("Email non disponible"); return; }
    const subject = `Question concernant le produit : ${product?.title}`;
    const body = `Bonjour,\n\nJe suis intéressé par votre produit "${product?.title}" sur SHOPNET.\n\nPrix : ${product?.price} USD\n\nMerci de me contacter pour la disponibilité.\n\nCordialement.`;
    Linking.openURL(`mailto:${email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`).catch(() => showNotification("Impossible d'ouvrir l'application mail"));
  };

  const commanderProduit = async () => {
    try {
      const token = await getValidToken();
      if (!token) { showNotification("Connectez-vous pour commander"); return; }
      const res = await fetch(`${LOCAL_API}/commandes`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ produits: [{ produit_id: product?.id, quantite: 1 }], adresse_livraison: "Adresse par défaut", mode_paiement: "especes" }),
      });
      const data = await res.json();
      if (data.success) showNotification("Commande envoyée !");
      else showNotification(data.error || "Erreur");
    } catch { showNotification("Erreur réseau"); }
  };

  const ajouterAuPanier = async () => {
    try {
      const token = await getValidToken();
      if (!token) { showNotification("Connectez-vous pour ajouter au panier"); return; }
      const res = await fetch(`${LOCAL_API}/cart`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ product_id: product?.id, title: product?.title, price: product?.price, quantity: 1, images: product?.images || [], seller_id: seller?.id }),
      });
      const data = await res.json();
      if (data.success) showNotification("Ajouté au panier !");
      else showNotification(data.error || "Erreur");
    } catch { showNotification("Erreur réseau"); }
  };

  const callSeller = () => {
    const phone = seller?.phone;
    if (!phone) { showNotification("Numéro non disponible"); return; }
    Linking.openURL(`tel:${phone}`);
  };

  const handleShare = async () => {
    try {
      await Share.share({ message: `💰 Découvrez ce produit sur SHOPNET : ${product?.title}\nPrix : $${product?.price}\n${product?.images?.[0] || ""}` });
    } catch (error) { console.log("Erreur partage", error); }
  };

  const handleReport = () => {
    Alert.alert("Signaler ce produit", "Veuillez décrire le problème (spam, contenu inapproprié, etc.)", [
      { text: "Annuler", style: "cancel" },
      { text: "Envoyer", onPress: () => showNotification("Merci, votre signalement a été envoyé.") },
    ]);
  };

  const submitReview = async () => {
    if (!newComment.trim()) { showNotification("Veuillez écrire un commentaire."); return; }
    setSubmitting(true);
    try {
      const token = await getValidToken();
      if (!token) { showNotification("Connectez-vous pour laisser un avis."); setSubmitting(false); return; }
      const res = await fetch(`${LOCAL_API}/products/${product?.id}/comment`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ comment: newComment, rating: newRating }),
      });
      const data = await res.json();
      if (data.success) {
        showNotification("Avis envoyé avec succès !");
        setReviewModalVisible(false); setNewComment(""); setNewRating(5);
      } else { showNotification(data.message || "Erreur lors de l'envoi"); }
    } catch (err) { showNotification("Erreur réseau"); }
    finally { setSubmitting(false); }
  };

  const navigateToProduct = (item: SimilarProduct | ProductDetail) => {
    router.push({ pathname: "/(tabs)/Auth/Panier/DetailId", params: { id: item.id.toString() } });
  };

  const showImage = (url: string, index: number) => {
    setSelectedImage(url); setActiveImageIndex(index); setModalVisible(true);
  };

  const scrollToImage = (index: number) => {
    if (flatListRef.current) flatListRef.current.scrollToIndex({ index, animated: true });
    setActiveImageIndex(index);
    setSelectedImage(product?.images?.[index] || null);
  };

  const navigateToImage = (direction: "prev" | "next") => {
    const images = product?.images || [];
    if (images.length <= 1) return;
    let newIndex = direction === "next" ? (activeImageIndex + 1) % images.length : (activeImageIndex - 1 + images.length) % images.length;
    scrollToImage(newIndex);
  };

  const openLink = (url: string) => {
    Linking.openURL(url).catch(() => showNotification("Impossible d'ouvrir ce lien"));
  };

  // ------------------------------------------------------------
  // Renderers
  // ------------------------------------------------------------
  const renderImageItem = ({ item, index }: { item: string; index: number }) => (
    <TouchableOpacity activeOpacity={0.9} onPress={() => showImage(item, index)} style={styles.imageWrapper}>
      <Image source={{ uri: item }} style={styles.mainImage} resizeMode="cover" />
      {index === 0 && product?.original_price && product?.original_price > product?.price && (
        <View style={styles.promoBadge}>
          <Ionicons name="flash" size={16} color="#FFFFFF" />
          <Text style={styles.promoBadgeText}>PROMO</Text>
        </View>
      )}
    </TouchableOpacity>
  );

  const renderThumbnailItem = ({ item, index }: { item: string; index: number }) => (
    <TouchableOpacity onPress={() => scrollToImage(index)} activeOpacity={0.8} style={[styles.thumbnailWrapper, { borderColor: COLORS.border }, index === activeImageIndex && { borderColor: COLORS.accent, borderWidth: 2 }]}>
      <Image source={{ uri: item }} style={styles.thumbnailImage} />
    </TouchableOpacity>
  );

  const renderProductCard = (item: SimilarProduct | ProductDetail, isPromo?: boolean) => {
    const discount = item.original_price && item.original_price > item.price ? Math.round(((item.original_price - item.price) / item.original_price) * 100) : 0;
    const isBoosted = (item as any).is_boosted || false;
    const endDate = item.created_at && (item as any).duration_days ? new Date(new Date(item.created_at).getTime() + (item as any).duration_days * 24 * 60 * 60 * 1000) : null;

    return (
      <TouchableOpacity style={[styles.productCard, { backgroundColor: COLORS.cardBackground }]} onPress={() => navigateToProduct(item)} activeOpacity={0.8}>
        <View style={styles.productImageContainer}>
          <Image source={{ uri: (item as any).image_url || (item as any).images?.[0] || "https://via.placeholder.com/150" }} style={styles.productCardImage} />
          {isBoosted && (
            <View style={styles.sponsoredBadge}>
              <Ionicons name="star" size={12} color="#FFFFFF" />
              <Text style={styles.sponsoredBadgeText}>Sponsorisé</Text>
            </View>
          )}
          {discount > 0 && (
            <View style={styles.discountBadge}>
              <Text style={styles.discountBadgeText}>-{discount}%</Text>
            </View>
          )}
          {endDate && <CountdownTimer endDate={endDate} />}
        </View>
        <Text style={[styles.productCardTitle, { color: COLORS.textPrimary }]} numberOfLines={2}>{item.title}</Text>
        <View style={styles.productCardPriceRow}>
          <Text style={[styles.productCardPrice, { color: COLORS.accent }]}>${formatPrice(item.price)}</Text>
          {discount > 0 && <Text style={[styles.productCardOriginalPrice, { color: COLORS.textSecondary }]}>${formatPrice(item.original_price!)}</Text>}
        </View>
      </TouchableOpacity>
    );
  };

  const renderReviewItem = ({ item }: { item: any }) => (
    <View key={item.id} style={[styles.reviewCard, { backgroundColor: COLORS.cardBackground }]}>
      <View style={styles.reviewHeader}>
        <Image source={{ uri: item.avatar }} style={styles.reviewAvatar} />
        <View>
          <Text style={[styles.reviewName, { color: COLORS.textPrimary }]}>{item.user}</Text>
          <View style={styles.reviewStars}>
            {[...Array(5)].map((_, i) => (
              <FontAwesome key={i} name="star" size={12} color={i < item.rating ? "#FFC107" : "#E0E0E0"} />
            ))}
          </View>
        </View>
      </View>
      <Text style={[styles.reviewComment, { color: COLORS.textSecondary }]}>{item.comment}</Text>
    </View>
  );

  const categories = [
    { id: "electronics", name: "Électronique IA 🔥", icon: "📱", onPress: () => router.push("/Auth/Categorie/ElectroniqueScreen") },
    { id: "fashion", name: "Mode", icon: "👕", onPress: () => router.push("/Auth/Categorie/ModeScreen") },
    { id: "home", name: "Maison", icon: "🏠", onPress: () => router.push("/Auth/Categorie/MaisonScreen") },
    { id: "computer", name: "Informatique", icon: "💻", onPress: () => router.push("/Auth/Categorie/ComputersScreen") },
    { id: "beauty", name: "Beauté", icon: "💄", onPress: () => router.push("/Auth/Categorie/BeautyScreen") },
    { id: "auto", name: "Auto & Moto", icon: "🚗", onPress: () => router.push("/Auth/Categorie/AutoMotoScreen") },
    { id: "food", name: "Alimentaire", icon: "🍔", onPress: () => router.push("/Auth/Categorie/FoodScreen") },
    { id: "services", name: "Services", icon: "🧰", onPress: () => router.push("/Auth/Categorie/ServicesScreen") },
    { id: "shops", name: "Boutiques", icon: "🏪", onPress: () => router.push("/(tabs)/Auth/Panier/AllShops") },
    { id: "popular", name: "Produits populaires", icon: "🔥", onPress: () => router.push("/Auth/Categorie/GlobalScreen") },
    { id: "new", name: "Nouveautés", icon: "🆕", onPress: () => router.push("/Auth/Categorie/RecentLocalScreen") },
    { id: "bargains", name: "Bons prix", icon: "💰", onPress: () => router.push("/Auth/Categorie/FlashDealsScreen") },
    { id: "top", name: "Top ventes", icon: "⭐", onPress: () => router.push("/Auth/Categorie/TopVentesScreen") },
    { id: "nearby", name: "Près de vous", icon: "📍", onPress: () => router.push("/Auth/Categorie/NearbyScreen") },
  ];

  const renderCategoryItem = ({ item }: { item: Category }) => (
    <TouchableOpacity style={[styles.categoryButton, { backgroundColor: COLORS.cardBackground }]} onPress={item.onPress}>
      <Text style={styles.categoryIcon}>{item.icon}</Text>
      <Text style={[styles.categoryName, { color: COLORS.textPrimary }]}>{item.name}</Text>
    </TouchableOpacity>
  );

  // ------------------------------------------------------------
  // Rendu principal
  // ------------------------------------------------------------
  const renderHeader = () => (
    <>
      <View style={styles.imageSection}>
        <FlatList ref={flatListRef} data={product?.images || []} horizontal pagingEnabled showsHorizontalScrollIndicator={false}
          onMomentumScrollEnd={(e) => { const idx = Math.round(e.nativeEvent.contentOffset.x / width); setActiveImageIndex(idx); }}
          renderItem={renderImageItem} keyExtractor={(item, i) => i.toString()} />
        {(product?.images?.length ?? 0) > 1 && (
          <>
            <FlatList data={product?.images || []} horizontal showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.thumbnailList} renderItem={renderThumbnailItem} keyExtractor={(item, i) => `thumb-${i}`} />
            <View style={styles.pageIndicator}>
              <Text style={styles.pageText}>{activeImageIndex + 1}/{product?.images?.length}</Text>
            </View>
          </>
        )}
      </View>

      <View style={styles.content}>
        <Text style={[styles.title, { color: COLORS.textPrimary }]}>{product?.title}</Text>
        <View style={styles.categoryRow}>
          <Ionicons name="pricetag-outline" size={16} color={COLORS.textSecondary} />
          <Text style={[styles.category, { color: COLORS.textSecondary }]}>{product?.category}</Text>
        </View>

        <View style={styles.priceRow}>
          <View>
            <Text style={[styles.priceUSD, { color: COLORS.accent }]}>${formatPrice(product?.price || 0)}</Text>
            <Text style={[styles.priceCDF, { color: COLORS.textSecondary }]}>{formatPriceCDF(product?.price || 0)}</Text>
          </View>
          {product?.original_price && product.original_price > product.price && (
            <View style={[styles.promoBadgeRight, { backgroundColor: COLORS.accent + '10' }]}>
              <Text style={styles.promoText}>PROMO</Text>
              <Text style={[styles.promoDate, { color: COLORS.textSecondary }]}>jusqu'au 31 déc 2025</Text>
            </View>
          )}
        </View>

        <View style={styles.stockRow}>
          <Ionicons name={product?.stock && product.stock > 0 ? "checkmark-circle" : "close-circle"} size={18}
            color={product?.stock && product.stock > 0 ? COLORS.success : COLORS.error} />
          <Text style={[styles.stockText, { color: product?.stock && product.stock > 0 ? COLORS.success : COLORS.error }]}>
            {product?.stock && product.stock > 0 ? "En stock" : "Rupture"}
          </Text>
          {product?.stock && product.stock > 0 && (
            <View style={[styles.wholesaleBadge, { backgroundColor: COLORS.cardBackground }]}>
              <Text style={[styles.wholesaleText, { color: COLORS.textPrimary }]}>Vente en gros 10+ pièces</Text>
            </View>
          )}
        </View>
        <Text style={[styles.dateText, { color: COLORS.textSecondary }]}>Publié : {getRelativeDate(product?.created_at || "")}</Text>

        <View style={styles.deliveryRow}>
          <Ionicons name="bicycle-outline" size={18} color={COLORS.textSecondary} />
          <View style={{ marginLeft: 6 }}>
            <Text style={[styles.deliveryText, { color: COLORS.textPrimary }]}>Livraison : À convenir avec le vendeur</Text>
            <Text style={[styles.deliveryTime, { color: COLORS.textPrimary }]}>Disponibilité : Flexible selon accord</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: COLORS.textPrimary }]}>Description</Text>
          <ExpandableDescription description={product?.description || ""} colors={COLORS} />
          {detectedLinks.length > 0 && (
            <View style={styles.linksSection}>
              <View style={styles.linksHeader}>
                <Ionicons name="link" size={18} color={COLORS.textSecondary} />
                <Text style={[styles.linksTitle, { color: COLORS.textPrimary }]}>{detectedLinks.length} lien{detectedLinks.length > 1 ? "s" : ""}</Text>
              </View>
              {detectedLinks.map((link, index) => (
                <LinkComponent key={index} url={link.url} type={link.type} onPress={openLink} colors={COLORS} />
              ))}
            </View>
          )}
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: COLORS.textPrimary }]}>Avis clients ({allReviews.length})</Text>
          {visibleReviews.map((review) => renderReviewItem({ item: review }))}
          {reviewsOffset < allReviews.length && (
            <TouchableOpacity style={[styles.loadMoreButton, { backgroundColor: COLORS.cardBackground }]} onPress={loadMoreReviews}>
              <Text style={[styles.loadMoreText, { color: COLORS.accent }]}>Voir plus d'avis</Text>
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: COLORS.textPrimary }]}>Vendeur</Text>
          <View style={[styles.sellerContainer, { backgroundColor: COLORS.cardBackground }]}>
            <View style={styles.sellerLine}>
              <Text style={[styles.sellerLabel, { color: COLORS.textSecondary }]}>Produit proposé par :</Text>
              <Text style={[styles.sellerValue, { color: COLORS.textPrimary }]}>{seller?.nom || "Vendeur SHOPNET"}</Text>
            </View>
            <View style={styles.sellerLine}>
              <Text style={[styles.sellerLabel, { color: COLORS.textSecondary }]}>Ce produit est vendu dans la ville de :</Text>
              <Text style={[styles.sellerValue, { color: COLORS.textPrimary }]}>{product?.location || "Ville inconnue"}</Text>
            </View>
            <View style={styles.sellerLine}>
              <Text style={[styles.sellerLabel, { color: COLORS.textSecondary }]}>Email du vendeur :</Text>
              {seller?.email ? (
                <TouchableOpacity onPress={sendEmail} style={styles.emailButton}>
                  <Ionicons name="mail-outline" size={20} color={COLORS.accent} />
                  <Text style={[styles.sellerValue, styles.emailText, { color: COLORS.accent }]}>{seller.email}</Text>
                </TouchableOpacity>
              ) : (
                <Text style={[styles.sellerValue, { color: COLORS.textPrimary }]}>Non renseigné</Text>
              )}
            </View>
          </View>
        </View>

        <View style={styles.actionsContainer}>
          <View style={styles.actionRow}>
            <TouchableOpacity style={[styles.actionButton, styles.whatsappButton]} onPress={openWhatsApp}>
              <Ionicons name="logo-whatsapp" size={20} color="#FFFFFF" />
              <Text style={styles.actionText}>WhatsApp</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.actionButton, styles.cartButton]} onPress={ajouterAuPanier}>
              <Ionicons name="cart-outline" size={20} color="#FFFFFF" />
              <Text style={styles.actionText}>Panier</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.actionRow}>
            <TouchableOpacity style={[styles.actionButton, styles.orderButton]} onPress={commanderProduit}>
              <Ionicons name="bag-check-outline" size={20} color="#FFFFFF" />
              <Text style={styles.actionText}>Commander</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.actionButton, styles.buyNowButton]} onPress={callSeller}>
              <Ionicons name="call-outline" size={20} color="#FFFFFF" />
              <Text style={styles.actionText}>Acheter</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.navButtonsContainer}>
          <TouchableOpacity style={[styles.navButton, { backgroundColor: COLORS.cardBackground }]} onPress={() => router.push("/(tabs)/Auth/Categorie/PromotionScreen")}>
            <Ionicons name="flame-outline" size={32} color={COLORS.accent} />
            <Text style={[styles.navButtonTitle, { color: COLORS.accent }]}>Voir plus de promotions similaires</Text>
            <Text style={[styles.navButtonSubtitle, { color: COLORS.textSecondary }]}>Découvrez d'autres offres</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.navButton, { backgroundColor: COLORS.cardBackground }]} onPress={() => router.push("/MisAjour")}>
            <Ionicons name="business-outline" size={32} color={COLORS.accent} />
            <Text style={[styles.navButtonTitle, { color: COLORS.accent }]}>Voir des boutiques proches</Text>
            <Text style={[styles.navButtonSubtitle, { color: COLORS.textSecondary }]}>Trouvez des vendeurs près de vous</Text>
          </TouchableOpacity>
        </View>

        {viralProducts.length > 0 && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: COLORS.textPrimary }]}>🔥 Produits viraux près de chez vous</Text>
            <FlatList data={viralProducts} horizontal showsHorizontalScrollIndicator={false}
              renderItem={({ item }) => renderProductCard(item)} keyExtractor={(item) => item.id.toString()} />
          </View>
        )}
      </View>
    </>
  );

  const renderFooter = () => (
    <View style={styles.content}>
      <View style={styles.categoriesSection}>
        <Text style={[styles.sectionTitle, { color: COLORS.textPrimary }]}>Explorer d'autres catégories</Text>
        <FlatList data={categories} numColumns={4} columnWrapperStyle={styles.categoriesGrid}
          renderItem={renderCategoryItem} keyExtractor={(item) => item.id} scrollEnabled={false} />
      </View>

      {suggestions.length > 0 && (
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: COLORS.textPrimary }]}>🧠 Suggestions pour vous</Text>
          <FlatList data={suggestions} numColumns={2} columnWrapperStyle={styles.suggestionsGrid}
            renderItem={({ item }) => renderProductCard(item)} keyExtractor={(item) => item.id.toString()} scrollEnabled={false} />
        </View>
      )}

      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: COLORS.textPrimary }]}>Produits similaires</Text>
        <FlatList data={similarProducts} numColumns={2} columnWrapperStyle={styles.suggestionsGrid}
          renderItem={({ item }) => renderProductCard(item)} keyExtractor={(item) => item.id.toString()}
          onEndReached={fetchMoreSimilar} onEndReachedThreshold={0.3}
          ListFooterComponent={similarLoadingMore ? <View style={styles.footerLoader}><ActivityIndicator size="small" color={COLORS.accent} /></View> : null}
          scrollEnabled={false} />
        {!similarHasMore && similarProducts.length > 0 && (
          <Text style={[styles.endMessage, { color: COLORS.textSecondary }]}>Fin des résultats</Text>
        )}
      </View>

      <View style={styles.bottomButtons}>
        <TouchableOpacity style={[styles.bottomButton, { backgroundColor: COLORS.cardBackground }]} onPress={handleReport}>
          <View style={styles.bottomIconContainer}>
            <Ionicons name="flag-outline" size={28} color={COLORS.error} />
          </View>
          <Text style={[styles.bottomButtonTitle, { color: COLORS.textPrimary }]}>Signaler ce produit</Text>
          <Text style={[styles.bottomButtonSubtitle, { color: COLORS.textSecondary }]}>Contenu inapproprié ?</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.bottomButton, { backgroundColor: COLORS.cardBackground }]} onPress={() => setReviewModalVisible(true)}>
          <View style={styles.bottomIconContainer}>
            <Ionicons name="star-outline" size={28} color={COLORS.accent} />
          </View>
          <Text style={[styles.bottomButtonTitle, { color: COLORS.textPrimary }]}>Donner mon avis</Text>
          <Text style={[styles.bottomButtonSubtitle, { color: COLORS.textSecondary }]}>Partagez votre expérience</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  if (loading && !product) {
    return (
      <SafeAreaView style={[styles.loadingContainer, { backgroundColor: COLORS.background }]}>
        <StatusBar backgroundColor={COLORS.statusBar} barStyle={COLORS.barStyle} />
        <ActivityIndicator size="large" color={COLORS.accent} />
        <Text style={[styles.loadingText, { color: COLORS.textSecondary }]}>Chargement...</Text>
      </SafeAreaView>
    );
  }

  if (error && !product) {
    return (
      <SafeAreaView style={[styles.errorContainer, { backgroundColor: COLORS.background }]}>
        <StatusBar backgroundColor={COLORS.statusBar} barStyle={COLORS.barStyle} />
        <Ionicons name="alert-circle-outline" size={80} color={COLORS.error} />
        <Text style={[styles.errorTitle, { color: COLORS.textPrimary }]}>Erreur</Text>
        <Text style={[styles.errorText, { color: COLORS.textSecondary }]}>{error}</Text>
        <TouchableOpacity onPress={() => router.back()} style={[styles.backButton, { backgroundColor: COLORS.accent }]}>
          <Ionicons name="arrow-back" size={20} color="#FFFFFF" />
          <Text style={styles.backButtonText}>Retour</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  if (!product) return null;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: COLORS.background }]}>
      <StatusBar backgroundColor={COLORS.statusBar} barStyle={COLORS.barStyle} />

      {/* Header */}
      <View style={[styles.header, { backgroundColor: COLORS.headerBg, borderBottomColor: COLORS.headerBorder }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.headerIcon}>
          <Ionicons name="arrow-back" size={24} color={COLORS.textPrimary} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: COLORS.textPrimary }]}>Détail produit</Text>
        <View style={styles.headerRight}>
          <TouchableOpacity style={styles.headerIcon} onPress={() => router.push("/Auth/Produits/Recherche")}>
            <Ionicons name="search-outline" size={24} color={COLORS.textPrimary} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.headerIcon} onPress={handleShare}>
            <Ionicons name="share-outline" size={24} color={COLORS.textPrimary} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Notification */}
      {notificationVisible && (
        <Animated.View style={[styles.notification, { backgroundColor: COLORS.cardBg, borderColor: COLORS.border, transform: [{ translateY: notificationPosition }] }]}>
          <Ionicons name="checkmark-circle" size={20} color={COLORS.success} />
          <Text style={[styles.notificationText, { color: COLORS.textPrimary }]}>{notificationMessage}</Text>
        </Animated.View>
      )}

      {/* Contenu principal */}
      <FlatList data={[]} renderItem={() => null}
        ListHeaderComponent={renderHeader()} ListFooterComponent={renderFooter()}
        showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContainer} />

      {/* Modal image plein écran */}
      <Modal visible={modalVisible} transparent animationType="fade">
        <View style={[styles.modalContainer, { backgroundColor: COLORS.overlayBg }]}>
          <TouchableOpacity onPress={() => setModalVisible(false)} style={styles.modalClose}>
            <Ionicons name="close" size={28} color="#FFFFFF" />
          </TouchableOpacity>
          {(product?.images?.length ?? 0) > 1 && (
            <>
              <TouchableOpacity onPress={() => navigateToImage("prev")} style={[styles.modalNav, { left: 10 }]}>
                <Ionicons name="chevron-back" size={28} color="#FFFFFF" />
              </TouchableOpacity>
              <TouchableOpacity onPress={() => navigateToImage("next")} style={[styles.modalNav, { right: 10 }]}>
                <Ionicons name="chevron-forward" size={28} color="#FFFFFF" />
              </TouchableOpacity>
            </>
          )}
          <Image source={{ uri: product?.images?.[activeImageIndex] || "" }} style={styles.modalImage} resizeMode="contain" />
        </View>
      </Modal>

      {/* Modal avis */}
      <Modal visible={reviewModalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalReviewContainer, { backgroundColor: COLORS.modalBg }]}>
            <Text style={[styles.modalTitle, { color: COLORS.textPrimary }]}>Donnez votre avis</Text>
            <StarRating rating={newRating} onRatingChange={setNewRating} size={30} colors={COLORS} />
            <TextInput
              style={[styles.commentInput, { borderColor: COLORS.inputBorder, backgroundColor: COLORS.inputBg, color: COLORS.inputText }]}
              placeholder="Votre commentaire..."
              placeholderTextColor={COLORS.placeholderText}
              multiline numberOfLines={4}
              value={newComment} onChangeText={setNewComment} />
            <View style={styles.modalButtons}>
              <TouchableOpacity style={[styles.cancelButton, { backgroundColor: COLORS.cardBackground }]} onPress={() => setReviewModalVisible(false)}>
                <Text style={[styles.cancelButtonText, { color: COLORS.textSecondary }]}>Annuler</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.submitButton, { backgroundColor: COLORS.accent }]} onPress={submitReview} disabled={submitting}>
                {submitting ? <ActivityIndicator size="small" color="#FFFFFF" /> : <Text style={styles.submitButtonText}>Envoyer</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

// ------------------------------------------------------------
// Styles
// ------------------------------------------------------------
const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContainer: { paddingBottom: 20 },
  loadingContainer: { flex: 1, justifyContent: "center", alignItems: "center" },
  errorContainer: { flex: 1, justifyContent: "center", alignItems: "center", padding: 20 },
  loadingText: { marginTop: 12, fontSize: 16 },
  errorTitle: { fontSize: 22, fontWeight: "600", marginTop: 16 },
  errorText: { fontSize: 16, textAlign: "center", marginVertical: 12 },
  backButton: { flexDirection: "row", paddingVertical: 12, paddingHorizontal: 24, alignItems: "center", borderRadius: 8 },
  backButtonText: { color: "#FFFFFF", fontSize: 16, fontWeight: "600", marginLeft: 8 },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1 },
  headerIcon: { padding: 6 },
  headerTitle: { fontSize: 18, fontWeight: "600" },
  headerRight: { flexDirection: "row" },
  notification: { position: "absolute", top: 0, left: 20, right: 20, borderWidth: 1, padding: 12, flexDirection: "row", alignItems: "center", zIndex: 1000, borderRadius: 8 },
  notificationText: { marginLeft: 8, fontSize: 14, flex: 1 },
  imageSection: { marginBottom: 16 },
  imageWrapper: { width, height: width, backgroundColor: '#eee' },
  mainImage: { width: "100%", height: "100%" },
  promoBadge: { position: "absolute", top: 10, left: 10, backgroundColor: '#FF6B00', flexDirection: "row", alignItems: "center", paddingHorizontal: 8, paddingVertical: 4, borderRadius: 4 },
  promoBadgeText: { color: "#FFFFFF", fontSize: 12, fontWeight: "600", marginLeft: 4 },
  pageIndicator: { position: "absolute", bottom: 70, right: 10, backgroundColor: "rgba(0,0,0,0.5)", paddingHorizontal: 8, paddingVertical: 4, borderRadius: 4 },
  pageText: { color: "#FFFFFF", fontSize: 12 },
  thumbnailList: { paddingHorizontal: 16, paddingVertical: 8, gap: 8 },
  thumbnailWrapper: { width: 60, height: 60, marginRight: 8, borderWidth: 1, borderRadius: 4 },
  thumbnailImage: { width: "100%", height: "100%", resizeMode: "cover", borderRadius: 4 },
  content: { paddingHorizontal: 16 },
  title: { fontSize: 22, fontWeight: "600", marginBottom: 6 },
  categoryRow: { flexDirection: "row", alignItems: "center", marginBottom: 12 },
  category: { fontSize: 14, marginLeft: 4 },
  priceRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 },
  priceUSD: { fontSize: 28, fontWeight: "700" },
  priceCDF: { fontSize: 16, marginTop: 4 },
  promoBadgeRight: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 4 },
  promoText: { fontSize: 12, fontWeight: "600", color: '#FF6B00' },
  promoDate: { fontSize: 10 },
  stockRow: { flexDirection: "row", alignItems: "center", marginBottom: 8 },
  stockText: { fontSize: 14, fontWeight: "500", marginLeft: 6, marginRight: 12 },
  wholesaleBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 4 },
  wholesaleText: { fontSize: 12 },
  dateText: { fontSize: 12, marginBottom: 12 },
  deliveryRow: { flexDirection: "row", alignItems: "center", marginBottom: 16, flexWrap: "wrap" },
  deliveryText: { fontSize: 14 },
  deliveryTime: { fontSize: 14 },
  section: { marginBottom: 24 },
  sectionTitle: { fontSize: 18, fontWeight: "600", marginBottom: 12 },
  descriptionContainer: {},
  description: { fontSize: 15, lineHeight: 22 },
  descriptionCollapsed: { overflow: "hidden" },
  readMoreButton: { marginTop: 8, alignSelf: "flex-start" },
  readMoreContent: { flexDirection: "row", alignItems: "center" },
  readMoreText: { fontSize: 14, fontWeight: "500", marginRight: 4 },
  linksSection: { marginTop: 16 },
  linksHeader: { flexDirection: "row", alignItems: "center", marginBottom: 8 },
  linksTitle: { fontSize: 15, fontWeight: "500", marginLeft: 6 },
  linkItem: { flexDirection: "row", alignItems: "center", padding: 12, marginBottom: 8, borderRadius: 8 },
  linkIconContainer: { width: 36, height: 36, justifyContent: "center", alignItems: "center", marginRight: 12, borderRadius: 18 },
  linkContent: { flex: 1 },
  linkDomain: { fontSize: 14, fontWeight: "600" },
  linkUrl: { fontSize: 12, marginTop: 2 },
  linkArrow: { marginLeft: 8 },
  reviewCard: { padding: 12, marginBottom: 12, borderRadius: 8 },
  reviewHeader: { flexDirection: "row", marginBottom: 8 },
  reviewAvatar: { width: 40, height: 40, marginRight: 12, borderRadius: 20 },
  reviewName: { fontSize: 14, fontWeight: "600" },
  reviewStars: { flexDirection: "row", marginTop: 4 },
  reviewComment: { fontSize: 13, lineHeight: 18 },
  loadMoreButton: { marginTop: 8, alignItems: "center", paddingVertical: 10, borderRadius: 8 },
  loadMoreText: { fontSize: 14, fontWeight: "600" },
  sellerContainer: { padding: 16, borderRadius: 8 },
  sellerLine: { flexDirection: "row", flexWrap: "wrap", alignItems: "center", marginBottom: 12 },
  sellerLabel: { fontSize: 14, fontWeight: "500", marginRight: 6 },
  sellerValue: { fontSize: 14, flexShrink: 1 },
  emailButton: { flexDirection: "row", alignItems: "center", gap: 6 },
  emailText: { textDecorationLine: "underline" },
  actionsContainer: { marginBottom: 24 },
  actionRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 8 },
  actionButton: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", paddingVertical: 14, marginHorizontal: 4, borderRadius: 8 },
  whatsappButton: { backgroundColor: '#25D366' },
  cartButton: { backgroundColor: '#FF6B00' },
  orderButton: { backgroundColor: '#222222' },
  buyNowButton: { backgroundColor: '#1877F2' },
  actionText: { color: "#FFFFFF", fontSize: 15, fontWeight: "600", marginLeft: 8 },
  navButtonsContainer: { flexDirection: "row", justifyContent: "space-between", marginBottom: 24, gap: 12 },
  navButton: { flex: 1, alignItems: "center", justifyContent: "center", paddingVertical: 16, borderRadius: 12, paddingHorizontal: 8 },
  navButtonTitle: { fontSize: 14, fontWeight: "600", marginTop: 8, textAlign: "center" },
  navButtonSubtitle: { fontSize: 11, textAlign: "center", marginTop: 2 },
  productCard: { width: (width - 48) / 2, marginBottom: 16, borderRadius: 8, overflow: "hidden" },
  productImageContainer: { position: "relative", aspectRatio: 1 },
  productCardImage: { width: "100%", height: "100%" },
  sponsoredBadge: { position: "absolute", top: 4, left: 4, backgroundColor: '#FF6B00', flexDirection: "row", alignItems: "center", paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, zIndex: 2 },
  sponsoredBadgeText: { color: "#FFFFFF", fontSize: 8, fontWeight: "600", marginLeft: 2 },
  discountBadge: { position: "absolute", top: 4, right: 4, backgroundColor: '#FF4444', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, zIndex: 2 },
  discountBadgeText: { color: "#FFFFFF", fontSize: 10, fontWeight: "800" },
  countdownContainer: { position: "absolute", bottom: 4, left: 4, backgroundColor: "rgba(0,0,0,0.6)", flexDirection: "row", alignItems: "center", paddingHorizontal: 4, paddingVertical: 2, borderRadius: 4 },
  countdownText: { color: "#FFFFFF", fontSize: 9, marginLeft: 2 },
  productCardTitle: { fontSize: 13, fontWeight: "500", paddingHorizontal: 8, paddingTop: 8, marginBottom: 4 },
  productCardPriceRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 8, paddingBottom: 8 },
  productCardPrice: { fontSize: 14, fontWeight: "700" },
  productCardOriginalPrice: { fontSize: 11, textDecorationLine: "line-through" },
  suggestionsGrid: { justifyContent: "space-between", gap: 16 },
  footerLoader: { paddingVertical: 20, alignItems: "center" },
  endMessage: { textAlign: "center", fontSize: 12, marginVertical: 8 },
  bottomButtons: { flexDirection: "row", justifyContent: "space-between", marginTop: 16, marginBottom: 30, gap: 16 },
  bottomButton: { flex: 1, alignItems: "center", paddingVertical: 16, borderRadius: 12 },
  bottomIconContainer: { marginBottom: 8 },
  bottomButtonTitle: { fontSize: 15, fontWeight: "600", marginBottom: 4 },
  bottomButtonSubtitle: { fontSize: 12, textAlign: "center" },
  categoriesSection: { marginBottom: 20 },
  categoriesGrid: { justifyContent: "space-between", marginBottom: 12, gap: 12 },
  categoryButton: { width: (width - 48) / 4, alignItems: "center", paddingVertical: 12, borderRadius: 12, marginBottom: 8 },
  categoryIcon: { fontSize: 28, marginBottom: 4 },
  categoryName: { fontSize: 11, textAlign: "center" },
  modalContainer: { flex: 1, justifyContent: "center", alignItems: "center" },
  modalClose: { position: "absolute", top: 50, right: 20, zIndex: 10, padding: 8 },
  modalNav: { position: "absolute", top: "50%", zIndex: 10, padding: 16 },
  modalImage: { width: width, height: height * 0.8 },
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "center", alignItems: "center", padding: 20 },
  modalReviewContainer: { width: width * 0.9, borderRadius: 12, padding: 20, alignItems: "center" },
  modalTitle: { fontSize: 20, fontWeight: "bold", marginBottom: 20 },
  commentInput: { width: "100%", borderWidth: 1, borderRadius: 8, padding: 12, marginTop: 20, marginBottom: 20, textAlignVertical: "top", minHeight: 100 },
  modalButtons: { flexDirection: "row", justifyContent: "space-between", width: "100%" },
  cancelButton: { flex: 1, paddingVertical: 12, marginRight: 8, alignItems: "center", borderRadius: 8 },
  cancelButtonText: { fontWeight: "600" },
  submitButton: { flex: 1, paddingVertical: 12, marginLeft: 8, alignItems: "center", borderRadius: 8 },
  submitButtonText: { color: "#FFFFFF", fontWeight: "600" },
});
