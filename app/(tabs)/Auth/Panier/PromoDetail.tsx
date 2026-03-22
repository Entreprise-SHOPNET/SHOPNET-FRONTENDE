

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
  Alert,
  TextInput,
  LayoutAnimation,
  Platform,
  UIManager,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons, MaterialIcons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";

// Enable LayoutAnimation on Android
if (Platform.OS === "android") {
  UIManager.setLayoutAnimationEnabledExperimental?.(true);
}

// ------------------------------------------------------------
// Configuration et constantes
// ------------------------------------------------------------
const LOCAL_API = "https://shopnet-backend.onrender.com/api";
const COMMAND_API_URL = `${LOCAL_API}/commandes`;
const PANIER_API_URL = `${LOCAL_API}/cart`;
const PROMOTIONS_API_URL = `${LOCAL_API}/promotions`;
const PRODUCTS_API_URL = `${LOCAL_API}/products`;
const REVIEW_API_URL = `${LOCAL_API}/products`; // pour poster un commentaire

const { width, height } = Dimensions.get("window");

// Couleurs AliExpress / blanc
const COLORS = {
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

const USD_TO_CDF = 2200; // 1 USD = 2200 CDF (taux fictif)

const formatPrice = (price: any) => {
  const n = Number(price);
  return isNaN(n) ? "0.00" : n.toFixed(2);
};

const formatPriceCDF = (priceUSD: number) => {
  return Math.round(priceUSD * USD_TO_CDF).toLocaleString("fr-CD") + " CDF";
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

// Calculate remaining time with hours and minutes
const calculateTimeRemaining = (createdAt: string, durationDays: number): { days: number; hours: number; minutes: number; seconds: number; text: string } => {
  const createdDate = new Date(createdAt);
  const endDate = new Date(createdDate.getTime() + durationDays * 24 * 60 * 60 * 1000);
  const now = new Date();
  const diffMs = endDate.getTime() - now.getTime();

  if (diffMs <= 0) return { days: 0, hours: 0, minutes: 0, seconds: 0, text: 'Expirée' };

  const seconds = Math.floor(diffMs / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  const remainingHours = hours % 24;
  const remainingMinutes = minutes % 60;
  const remainingSeconds = seconds % 60;

  let text = '';
  if (days > 0) text = `${days}j ${remainingHours}h ${remainingMinutes}min`;
  else if (hours > 0) text = `${remainingHours}h ${remainingMinutes}min ${remainingSeconds}s`;
  else if (minutes > 0) text = `${remainingMinutes}min ${remainingSeconds}s`;
  else text = `${remainingSeconds}s`;

  return { days, hours: remainingHours, minutes: remainingMinutes, seconds: remainingSeconds, text };
};

const parsePromotionImages = (images: string[] | string): string[] => {
  if (Array.isArray(images)) return images;
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

// Helper to extract URLs from text
const extractUrls = (text: string): { url: string; type: string }[] => {
  if (!text) return [];
  const urlRegex = /(https?:\/\/[^\s]+)|(www\.[^\s]+)|([a-zA-Z0-9][a-zA-Z0-9-]{1,61}[a-zA-Z0-9]\.[a-zA-Z]{2,}(?:\/[^\s]*)?)/gi;
  const urls: { url: string; type: string }[] = [];
  let match;
  while ((match = urlRegex.exec(text)) !== null) {
    let url = match[0];
    let type = "lien";
    if (url.includes('youtube.com') || url.includes('youtu.be')) type = "youtube";
    else if (url.includes('facebook.com')) type = "facebook";
    else if (url.includes('instagram.com')) type = "instagram";
    else if (url.includes('twitter.com') || url.includes('x.com')) type = "twitter";
    else if (url.includes('tiktok.com')) type = "tiktok";
    else if (url.includes('amazon.com') || url.includes('amzn.to')) type = "amazon";
    else if (url.includes('ebay.com')) type = "ebay";
    else if (url.includes('.pdf')) type = "pdf";
    else if (url.includes('.jpg') || url.includes('.png') || url.includes('.gif')) type = "image";
    if (!url.startsWith('http://') && !url.startsWith('https://')) url = 'https://' + url;
    urls.push({ url, type });
  }
  return urls;
};

// Link component (reused from product detail)
const LinkComponent = ({ url, type, onPress }: { url: string; type: string; onPress: (url: string) => void }) => {
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
    try { return new URL(url).hostname.replace('www.', ''); }
    catch { return url.substring(0, 30) + (url.length > 30 ? '...' : ''); }
  };

  return (
    <TouchableOpacity style={styles.linkItem} onPress={() => onPress(url)} activeOpacity={0.7}>
      <View style={styles.linkIconContainer}>{getIconForType()}</View>
      <View style={styles.linkContent}>
        <Text style={styles.linkDomain} numberOfLines={1}>{getDomain(url)}</Text>
        <Text style={styles.linkUrl} numberOfLines={1}>{url}</Text>
      </View>
      <View style={styles.linkArrow}><Ionicons name="open-outline" size={18} color={COLORS.secondary} /></View>
    </TouchableOpacity>
  );
};

// Expandable description component
const ExpandableDescription = ({ description }: { description: string }) => {
  const [expanded, setExpanded] = useState(false);
  const [isLongText, setIsLongText] = useState(false);
  const animationValue = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (description.length > 150) setIsLongText(true);
  }, [description]);

  const toggleExpand = () => {
    LayoutAnimation.configureNext({
      duration: 300,
      create: { type: LayoutAnimation.Types.easeInEaseOut, property: LayoutAnimation.Properties.opacity },
      update: { type: LayoutAnimation.Types.easeInEaseOut },
    });
    Animated.timing(animationValue, { toValue: expanded ? 0 : 1, duration: 300, useNativeDriver: true }).start();
    setExpanded(!expanded);
  };

  const rotateIcon = animationValue.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '180deg'] });

  if (!description) return <Text style={styles.description}>Aucune description disponible.</Text>;

  return (
    <View>
      <Text style={[styles.description, !expanded && styles.descriptionCollapsed]} numberOfLines={expanded ? undefined : 4}>
        {description}
      </Text>
      {isLongText && (
        <TouchableOpacity style={styles.readMoreButton} onPress={toggleExpand} activeOpacity={0.7}>
          <View style={styles.readMoreContent}>
            <Text style={styles.readMoreText}>{expanded ? "Voir moins" : "Voir plus"}</Text>
            <Animated.View style={{ transform: [{ rotate: rotateIcon }] }}>
              <Ionicons name="chevron-down" size={18} color={COLORS.accent} />
            </Animated.View>
          </View>
        </TouchableOpacity>
      )}
    </View>
  );
};

// Star rating component
const StarRating = ({ rating, onRatingChange, size = 30 }: { rating: number; onRatingChange: (r: number) => void; size?: number }) => {
  return (
    <View style={{ flexDirection: 'row' }}>
      {[1, 2, 3, 4, 5].map((star) => (
        <TouchableOpacity key={star} onPress={() => onRatingChange(star)}>
          <Ionicons
            name={star <= rating ? "star" : "star-outline"}
            size={size}
            color={star <= rating ? "#FFC107" : COLORS.secondary}
            style={{ marginHorizontal: 5 }}
          />
        </TouchableOpacity>
      ))}
    </View>
  );
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
  time_remaining?: { days: number; hours: number; minutes: number; seconds: number; text: string };
  seller?: {
    name: string;
    phone: string;
    email?: string;
    address?: string;
    rating?: number;
  };
  category?: string;
};

// Cache keys – permanent (no expiry)
const CACHE_KEY_PROMO = (id: string) => `promo_${id}`;
const CACHE_KEY_SIMILAR = "similar_promotions";

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
  const [detectedLinks, setDetectedLinks] = useState<{ url: string; type: string }[]>([]);
  const [remainingTime, setRemainingTime] = useState<{ days: number; hours: number; minutes: number; seconds: number; text: string }>({ days: 0, hours: 0, minutes: 0, seconds: 0, text: '' });

  // Review modal state
  const [reviewModalVisible, setReviewModalVisible] = useState(false);
  const [newRating, setNewRating] = useState(5);
  const [newComment, setNewComment] = useState("");
  const [submitting, setSubmitting] = useState(false);

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
      Animated.timing(notificationPosition, { toValue: 60, duration: 400, useNativeDriver: true }),
      Animated.delay(2000),
      Animated.timing(notificationPosition, { toValue: -100, duration: 400, useNativeDriver: true }),
    ]).start(() => setNotificationVisible(false));
  };

  // Update countdown every second
  useEffect(() => {
    if (!promotion) return;
    const updateRemaining = () => {
      const remaining = calculateTimeRemaining(promotion.created_at, promotion.duration_days);
      setRemainingTime(remaining);
    };
    updateRemaining();
    const interval = setInterval(updateRemaining, 1000);
    return () => clearInterval(interval);
  }, [promotion]);

  // Load from cache (permanent) then fetch fresh data
  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        // 1) Load cached promotion
        const cachedPromo = await AsyncStorage.getItem(CACHE_KEY_PROMO(id));
        if (cachedPromo) {
          const promo = JSON.parse(cachedPromo);
          setPromotion(promo);
          if (promo.description) setDetectedLinks(extractUrls(promo.description));
          Animated.parallel([
            Animated.timing(fadeAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
            Animated.timing(slideAnim, { toValue: 0, duration: 500, useNativeDriver: true }),
          ]).start();
        }
        // 2) Always fetch fresh data in background
        await fetchPromotion();
      } catch (e) {
        console.error("Cache error", e);
      } finally {
        setLoading(false);
      }
    };
    if (id) loadData();
  }, [id]);

  const fetchPromotion = async () => {
    try {
      const token = await getValidToken();
      const promotionsResponse = await axios.get(PROMOTIONS_API_URL, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (promotionsResponse.data.success) {
        const allPromotions = promotionsResponse.data.promotions.map((promo: Promotion) => ({
          ...promo,
          images: parsePromotionImages(promo.images),
        }));

        const currentPromotion = allPromotions.find(
          (promo: Promotion) => promo.product_id === Number(id) || promo.promotionId === Number(id)
        );

        if (currentPromotion) {
          setPromotion(currentPromotion);
          setDetectedLinks(extractUrls(currentPromotion.description || ""));
          await AsyncStorage.setItem(CACHE_KEY_PROMO(id), JSON.stringify(currentPromotion));

          // Fetch seller info from product API
          try {
            const productResponse = await axios.get(`${PRODUCTS_API_URL}/${currentPromotion.product_id}`, {
              headers: { Authorization: `Bearer ${token}` },
            });
            if (productResponse.data.success) {
              const productData = productResponse.data.product;
              const updatedPromo = { ...currentPromotion, seller: productData.seller, category: productData.category };
              setPromotion(updatedPromo);
              await AsyncStorage.setItem(CACHE_KEY_PROMO(id), JSON.stringify(updatedPromo));
            }
          } catch (error) {
            console.log("Erreur récupération vendeur:", error);
          }

          // Similar promotions (max 10)
          const similar = allPromotions
            .filter(
              (promo: Promotion) =>
                promo.product_id !== currentPromotion.product_id &&
                promo.promotionId !== currentPromotion.promotionId
            )
            .slice(0, 10);
          setSimilarPromotions(similar);
          await AsyncStorage.setItem(CACHE_KEY_SIMILAR, JSON.stringify({ data: similar, timestamp: Date.now() }));

          // Re-run animation if needed (already done from cache)
          if (!promotion) {
            Animated.parallel([
              Animated.timing(fadeAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
              Animated.timing(slideAnim, { toValue: 0, duration: 500, useNativeDriver: true }),
            ]).start();
          }
        } else {
          setError("Promotion non trouvée");
        }
      } else {
        setError("Erreur lors du chargement des promotions");
      }
    } catch (error) {
      console.error("Erreur fetchPromotion:", error);
      // Try to load similar from cache
      const cachedSimilar = await AsyncStorage.getItem(CACHE_KEY_SIMILAR);
      if (cachedSimilar) {
        const { data } = JSON.parse(cachedSimilar);
        setSimilarPromotions(data);
      }
      if (!promotion) setError("Erreur de connexion au serveur");
    }
  };

  // Actions
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
    Linking.openURL(`https://wa.me/${phone}?text=${encodeURIComponent(message)}`).catch(() => showNotification("❌ Impossible d'ouvrir WhatsApp"));
  };

  // Nouvelle fonction pour profiter de la promotion avec le message personnalisé
  const handleTakePromo = () => {
    const rawPhone = promotion?.seller?.phone || "";
    if (!rawPhone) {
      showNotification("📞 Numéro WhatsApp non disponible");
      return;
    }
    const phone = formatPhoneNumber(rawPhone);
    const images = parsePromotionImages(promotion?.images || []);
    const imageUrl = images[0] || "";
    const productName = promotion?.product_title || "ce produit";
    const promoPrice = formatPrice(promotion?.promo_price);
    const originalPrice = formatPrice(promotion?.original_price);

    const message = `Bonjour,

Je vous contacte au nom de la plateforme **SHOPNET**.

J’ai vu votre produit **${productName}** sur **SHOPNET**, actuellement proposé à **${promoPrice} USD au lieu de ${originalPrice} USD**, et je souhaite profiter de cette offre promotionnelle.

Pourriez-vous me confirmer la disponibilité du produit ainsi que les modalités de commande, de paiement et de livraison ?

Dans l’attente de votre retour, je vous remercie pour votre attention.

Cordialement.

Image du produit : ${imageUrl}`;

    Linking.openURL(`https://wa.me/${phone}?text=${encodeURIComponent(message)}`).catch(() => showNotification("❌ Impossible d'ouvrir WhatsApp"));
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
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (data.success) showNotification("✅ Commande envoyée avec succès !");
      else showNotification(data.error || "❌ Erreur lors de la commande");
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
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (data.success) showNotification("🛒 Promotion ajoutée au panier !");
      else showNotification(data.message || data.error || "❌ Erreur lors de l'ajout");
    } catch (err) {
      showNotification("❌ Erreur réseau ou serveur");
    }
  };

  const handleReport = () => {
    Alert.alert(
      "Signaler cette promotion",
      "Veuillez décrire le problème (spam, contenu inapproprié, etc.)",
      [
        { text: "Annuler", style: "cancel" },
        { text: "Envoyer", onPress: () => showNotification("Merci, votre signalement a été envoyé.") }
      ]
    );
  };

  const submitReview = async () => {
    if (!newComment.trim()) {
      showNotification("Veuillez écrire un commentaire.");
      return;
    }
    setSubmitting(true);
    try {
      const token = await getValidToken();
      if (!token) {
        showNotification("Connectez-vous pour laisser un avis.");
        setSubmitting(false);
        return;
      }
      const res = await fetch(`${REVIEW_API_URL}/${promotion?.product_id}/comment`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          comment: newComment,
          rating: newRating,
        }),
      });
      const data = await res.json();
      if (data.success) {
        showNotification("Avis envoyé avec succès !");
        setReviewModalVisible(false);
        setNewComment("");
        setNewRating(5);
      } else {
        showNotification(data.message || "Erreur lors de l'envoi");
      }
    } catch (err) {
      showNotification("Erreur réseau");
    } finally {
      setSubmitting(false);
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
    let newIndex = direction === "next" ? (activeImageIndex + 1) % images.length : (activeImageIndex - 1 + images.length) % images.length;
    setActiveImageIndex(newIndex);
    setSelectedImage(images[newIndex]);
  };

  const openLink = (url: string) => {
    Linking.openURL(url).catch(() => showNotification("Impossible d'ouvrir ce lien"));
  };

  if (loading && !promotion) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <StatusBar backgroundColor={COLORS.background} barStyle="dark-content" />
        <ActivityIndicator size="large" color={COLORS.accent} />
        <Text style={styles.loadingText}>Chargement de la promotion...</Text>
      </SafeAreaView>
    );
  }

  if (error && !promotion) {
    return (
      <SafeAreaView style={styles.errorContainer}>
        <StatusBar backgroundColor={COLORS.background} barStyle="dark-content" />
        <Ionicons name="alert-circle-outline" size={80} color={COLORS.error} />
        <Text style={styles.errorTitle}>Erreur</Text>
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={20} color={COLORS.white} />
          <Text style={styles.backButtonText}>Retour</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  if (!promotion) return null;

  const images = parsePromotionImages(promotion.images || []);
  const discount = calculateDiscount(promotion.original_price, promotion.promo_price);
  const priceUSD = promotion.promo_price;
  const priceCDF = formatPriceCDF(priceUSD);
  const isExpired = remainingTime.text === 'Expirée';

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar backgroundColor={COLORS.background} barStyle="dark-content" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.headerIcon} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={COLORS.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Promotion</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Notification */}
      {notificationVisible && (
        <Animated.View style={[styles.notification, { transform: [{ translateY: notificationPosition }] }]}>
          <Ionicons name="checkmark-circle" size={20} color={COLORS.success} />
          <Text style={styles.notificationText}>{notificationMessage}</Text>
        </Animated.View>
      )}

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Galerie d'images */}
        <Animated.View style={[styles.imageSection, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
          {images.length > 0 ? (
            <>
              <FlatList
                data={images}
                horizontal
                pagingEnabled
                showsHorizontalScrollIndicator={false}
                onMomentumScrollEnd={(e) => {
                  const idx = Math.round(e.nativeEvent.contentOffset.x / width);
                  setActiveImageIndex(idx);
                }}
                renderItem={({ item, index }) => (
                  <TouchableOpacity activeOpacity={0.9} onPress={() => showImage(item, index)} style={styles.imageWrapper}>
                    <Image source={{ uri: item }} style={styles.mainImage} resizeMode="cover" />
                    {index === 0 && (
                      <View style={styles.promoBadge}>
                        <Ionicons name="flash" size={16} color={COLORS.white} />
                        <Text style={styles.promoBadgeText}>PROMO</Text>
                      </View>
                    )}
                  </TouchableOpacity>
                )}
                keyExtractor={(item, i) => i.toString()}
              />
              {images.length > 1 && (
                <>
                  <FlatList
                    data={images}
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.thumbnailList}
                    renderItem={({ item, index }) => (
                      <TouchableOpacity
                        onPress={() => {
                          setActiveImageIndex(index);
                          setSelectedImage(item);
                        }}
                        style={[styles.thumbnailWrapper, index === activeImageIndex && styles.activeThumbnail]}
                      >
                        <Image source={{ uri: item }} style={styles.thumbnailImage} />
                      </TouchableOpacity>
                    )}
                    keyExtractor={(item, i) => `thumb-${i}`}
                  />
                  <View style={styles.pageIndicator}>
                    <Text style={styles.pageText}>{activeImageIndex + 1}/{images.length}</Text>
                  </View>
                </>
              )}
            </>
          ) : (
            <View style={styles.noImageContainer}>
              <Ionicons name="image-outline" size={60} color={COLORS.secondary} />
              <Text style={styles.noImageText}>Aucune image disponible</Text>
            </View>
          )}
        </Animated.View>

        {/* Contenu principal */}
        <Animated.View style={[styles.content, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
          {/* Titre */}
          <Text style={styles.title}>{promotion.product_title}</Text>
          <View style={styles.categoryRow}>
            <Ionicons name="pricetag-outline" size={16} color={COLORS.secondary} />
            <Text style={styles.category}>{promotion.category || "Promotion"}</Text>
          </View>

          {/* Countdown timer */}
          <View style={styles.timerContainer}>
            <Ionicons name="time-outline" size={20} color={isExpired ? COLORS.error : COLORS.accent} />
            <Text style={[styles.timerTitle, isExpired && styles.expiredText]}>
              {isExpired ? "Promotion expirée" : "Temps restant"}
            </Text>
            {!isExpired && (
              <View style={styles.countdown}>
                {remainingTime.days > 0 && (
                  <View style={styles.countdownUnit}>
                    <Text style={styles.countdownNumber}>{remainingTime.days}</Text>
                    <Text style={styles.countdownLabel}>j</Text>
                  </View>
                )}
                <View style={styles.countdownUnit}>
                  <Text style={styles.countdownNumber}>{remainingTime.hours}</Text>
                  <Text style={styles.countdownLabel}>h</Text>
                </View>
                <View style={styles.countdownUnit}>
                  <Text style={styles.countdownNumber}>{remainingTime.minutes}</Text>
                  <Text style={styles.countdownLabel}>min</Text>
                </View>
                <View style={styles.countdownUnit}>
                  <Text style={styles.countdownNumber}>{remainingTime.seconds}</Text>
                  <Text style={styles.countdownLabel}>s</Text>
                </View>
              </View>
            )}
          </View>

          {/* Bouton rouge "Profiter cette promotion" */}
          {!isExpired && (
            <TouchableOpacity style={styles.promoButton} onPress={handleTakePromo}>
              <Ionicons name="logo-whatsapp" size={20} color={COLORS.white} />
              <Text style={styles.promoButtonText}>Profiter cette promotion</Text>
            </TouchableOpacity>
          )}

          {/* Prix */}
          <View style={styles.priceRow}>
            <View>
              <Text style={styles.originalPrice}>${formatPrice(promotion.original_price)}</Text>
              <View style={styles.promoPriceRow}>
                <Text style={styles.promoPrice}>${formatPrice(promotion.promo_price)}</Text>
                <Text style={styles.priceCDF}>{priceCDF}</Text>
              </View>
            </View>
            <View style={styles.discountBadge}>
              <Text style={styles.discountText}>-{discount}%</Text>
            </View>
          </View>

          {/* Description avec détection de liens */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Description</Text>
            <ExpandableDescription description={promotion.description || "Aucune description disponible."} />
            {detectedLinks.length > 0 && (
              <View style={styles.linksSection}>
                <View style={styles.linksHeader}>
                  <Ionicons name="link" size={18} color={COLORS.secondary} />
                  <Text style={styles.linksTitle}>{detectedLinks.length} lien{detectedLinks.length > 1 ? 's' : ''}</Text>
                </View>
                {detectedLinks.map((link, index) => (
                  <LinkComponent key={index} url={link.url} type={link.type} onPress={openLink} />
                ))}
              </View>
            )}
          </View>

          {/* Vendeur */}
          {promotion.seller && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Vendeur</Text>
              <View style={styles.sellerInfo}>
                <Text style={styles.sellerLine}>
                  <Text style={styles.sellerLabel}>Produit proposé par : </Text>
                  <Text style={styles.sellerValue}>{promotion.seller.name || "Vendeur SHOPNET"}</Text>
                </Text>
                <Text style={styles.sellerLine}>
                  <Text style={styles.sellerLabel}>Boutique : </Text>
                  <Text style={styles.sellerValue}>Boutique {promotion.seller.name || "Officielle"}</Text>
                </Text>
                <Text style={styles.sellerLine}>
                  <Text style={styles.sellerLabel}>Contact par email : </Text>
                  <Text style={styles.sellerValue}>{promotion.seller.email || "Non renseigné"}</Text>
                </Text>
                <Text style={styles.sellerLine}>
                  <Text style={styles.sellerLabel}>Numéro du vendeur : </Text>
                  <Text style={styles.sellerValue}>{promotion.seller.phone || "Non disponible"}</Text>
                </Text>
              </View>
            </View>
          )}

          {/* Boutons d'action */}
          <View style={styles.actionsContainer}>
            <View style={styles.actionRow}>
              <TouchableOpacity style={[styles.actionButton, styles.whatsappButton]} onPress={openWhatsApp}>
                <Ionicons name="logo-whatsapp" size={20} color={COLORS.white} />
                <Text style={styles.actionText}>WhatsApp</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.actionButton, styles.cartButton]} onPress={ajouterAuPanier}>
                <Ionicons name="cart-outline" size={20} color={COLORS.white} />
                <Text style={styles.actionText}>Panier</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.actionRow}>
              <TouchableOpacity style={[styles.actionButton, styles.orderButton]} onPress={commanderProduit}>
                <Ionicons name="bag-check-outline" size={20} color={COLORS.white} />
                <Text style={styles.actionText}>Commander</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.actionButton, styles.buyNowButton]} onPress={openWhatsApp}>
                <Ionicons name="call-outline" size={20} color={COLORS.white} />
                <Text style={styles.actionText}>Acheter</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Boutons Signaler et Avis */}
          <View style={styles.bottomButtons}>
            <TouchableOpacity style={styles.reportButton} onPress={handleReport}>
              <Ionicons name="flag-outline" size={20} color={COLORS.error} />
              <Text style={styles.reportButtonText}>Signaler</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.reviewButton} onPress={() => setReviewModalVisible(true)}>
              <Ionicons name="star-outline" size={20} color={COLORS.accent} />
              <Text style={styles.reviewButtonText}>Donner mon avis</Text>
            </TouchableOpacity>
          </View>

          {/* Autres promotions (max 10) */}
          {similarPromotions.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>🔥 Autres promotions</Text>
              <FlatList
                data={similarPromotions}
                horizontal
                showsHorizontalScrollIndicator={false}
                renderItem={({ item }) => {
                  const itemImages = parsePromotionImages(item.images || []);
                  const itemDiscount = calculateDiscount(item.original_price, item.promo_price);
                  return (
                    <TouchableOpacity
                      style={styles.similarCard}
                      onPress={() =>
                        router.push({
                          pathname: "/(tabs)/Auth/Panier/PromoDetail",
                          params: { id: item.product_id.toString() },
                        })
                      }
                    >
                      <Image
                        source={{ uri: itemImages[0] || "https://via.placeholder.com/120" }}
                        style={styles.similarImage}
                      />
                      <Text style={styles.similarTitle} numberOfLines={2}>{item.product_title}</Text>
                      <View style={styles.similarPrices}>
                        <Text style={styles.similarOriginalPrice}>${formatPrice(item.original_price)}</Text>
                        <Text style={styles.similarPromoPrice}>${formatPrice(item.promo_price)}</Text>
                      </View>
                      <View style={styles.similarDiscount}>
                        <Text style={styles.similarDiscountText}>-{itemDiscount}%</Text>
                      </View>
                    </TouchableOpacity>
                  );
                }}
                keyExtractor={(item) => item.promotionId.toString()}
              />

              {/* Boutons de navigation améliorés – utilisent tous router.push */}
              <View style={styles.navButtonsContainer}>
                <TouchableOpacity
                  style={styles.navButton}
                  onPress={() => router.push('/MisAjour')}
                >
                  <Ionicons name="flame-outline" size={32} color={COLORS.accent} />
                  <Text style={styles.navButtonTitle}>Voir plus de promotions similaires</Text>
                  <Text style={styles.navButtonSubtitle}>Découvrez d'autres offres</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.navButton}
                  onPress={() => router.push('/(tabs)/Auth/Panier/AllShops')}
                >
                  <Ionicons name="business-outline" size={32} color={COLORS.accent} />
                  <Text style={styles.navButtonTitle}>Voir des boutiques proches</Text>
                  <Text style={styles.navButtonSubtitle}>Trouvez des vendeurs près de vous</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        </Animated.View>
      </ScrollView>

      {/* Modal plein écran pour les images */}
      {images.length > 0 && (
        <Modal visible={modalVisible} transparent animationType="fade">
          <View style={styles.modalContainer}>
            <TouchableOpacity onPress={() => setModalVisible(false)} style={styles.modalClose}>
              <Ionicons name="close" size={28} color={COLORS.white} />
            </TouchableOpacity>
            {images.length > 1 && (
              <>
                <TouchableOpacity onPress={() => navigateToImage("prev")} style={[styles.modalNav, { left: 10 }]}>
                  <Ionicons name="chevron-back" size={28} color={COLORS.white} />
                </TouchableOpacity>
                <TouchableOpacity onPress={() => navigateToImage("next")} style={[styles.modalNav, { right: 10 }]}>
                  <Ionicons name="chevron-forward" size={28} color={COLORS.white} />
                </TouchableOpacity>
              </>
            )}
            <Image source={{ uri: images[activeImageIndex] }} style={styles.modalImage} resizeMode="contain" />
          </View>
        </Modal>
      )}

      {/* Modal pour laisser un avis */}
      <Modal visible={reviewModalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalReviewContainer}>
            <Text style={styles.modalTitle}>Donnez votre avis</Text>
            <StarRating rating={newRating} onRatingChange={setNewRating} size={30} />
            <TextInput
              style={styles.commentInput}
              placeholder="Votre commentaire..."
              multiline
              numberOfLines={4}
              value={newComment}
              onChangeText={setNewComment}
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity style={styles.cancelButton} onPress={() => setReviewModalVisible(false)}>
                <Text style={styles.cancelButtonText}>Annuler</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.submitButton} onPress={submitReview} disabled={submitting}>
                {submitting ? <ActivityIndicator size="small" color={COLORS.white} /> : <Text style={styles.submitButtonText}>Envoyer</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  loadingContainer: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: COLORS.background },
  errorContainer: { flex: 1, justifyContent: "center", alignItems: "center", padding: 20, backgroundColor: COLORS.background },
  loadingText: { marginTop: 12, fontSize: 16, color: COLORS.secondary },
  errorTitle: { fontSize: 22, fontWeight: "600", color: COLORS.primary, marginTop: 16 },
  errorText: { fontSize: 16, color: COLORS.secondary, textAlign: "center", marginVertical: 12 },
  backButton: { backgroundColor: COLORS.accent, flexDirection: "row", paddingVertical: 12, paddingHorizontal: 24, alignItems: "center" },
  backButtonText: { color: COLORS.white, fontSize: 16, fontWeight: "600", marginLeft: 8 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  headerIcon: { padding: 6 },
  headerTitle: { fontSize: 18, fontWeight: "600", color: COLORS.primary },
  notification: {
    position: "absolute",
    top: 0,
    left: 20,
    right: 20,
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 12,
    flexDirection: "row",
    alignItems: "center",
    zIndex: 1000,
  },
  notificationText: { marginLeft: 8, fontSize: 14, color: COLORS.primary, flex: 1 },
  scrollView: { flex: 1 },
  imageSection: { marginBottom: 16 },
  imageWrapper: { width, height: width, backgroundColor: COLORS.cardBackground },
  mainImage: { width: "100%", height: "100%" },
  promoBadge: {
    position: "absolute",
    top: 10,
    left: 10,
    backgroundColor: COLORS.accent,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  promoBadgeText: { color: COLORS.white, fontSize: 12, fontWeight: "600", marginLeft: 4 },
  pageIndicator: {
    position: "absolute",
    bottom: 70,
    right: 10,
    backgroundColor: "rgba(0,0,0,0.5)",
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  pageText: { color: COLORS.white, fontSize: 12 },
  thumbnailList: { paddingHorizontal: 16, paddingVertical: 8, gap: 8 },
  thumbnailWrapper: { width: 60, height: 60, marginRight: 8, borderWidth: 1, borderColor: COLORS.border },
  activeThumbnail: { borderColor: COLORS.accent, borderWidth: 2 },
  thumbnailImage: { width: "100%", height: "100%", resizeMode: "cover" },
  noImageContainer: { width, height: width, backgroundColor: COLORS.cardBackground, justifyContent: "center", alignItems: "center" },
  noImageText: { color: COLORS.secondary, marginTop: 10, fontSize: 14 },
  content: { paddingHorizontal: 16, paddingBottom: 24 },
  title: { fontSize: 22, fontWeight: "600", color: COLORS.primary, marginBottom: 6 },
  categoryRow: { flexDirection: "row", alignItems: "center", marginBottom: 12 },
  category: { fontSize: 14, color: COLORS.secondary, marginLeft: 4 },
  timerContainer: {
    backgroundColor: COLORS.cardBackground,
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
  },
  timerTitle: { fontSize: 16, fontWeight: "600", marginLeft: 8, color: COLORS.accent },
  expiredText: { color: COLORS.error },
  countdown: { flexDirection: "row", marginLeft: 12 },
  countdownUnit: { alignItems: "center", marginHorizontal: 4, backgroundColor: COLORS.white, paddingHorizontal: 6, paddingVertical: 4, borderRadius: 4 },
  countdownNumber: { fontSize: 16, fontWeight: "bold", color: COLORS.primary },
  countdownLabel: { fontSize: 10, color: COLORS.secondary },
  promoButton: {
    backgroundColor: COLORS.error,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
    borderRadius: 8,
    marginBottom: 16,
  },
  promoButtonText: { color: COLORS.white, fontSize: 16, fontWeight: "bold", marginLeft: 8 },
  priceRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 16 },
  originalPrice: { fontSize: 16, color: COLORS.secondary, textDecorationLine: "line-through", marginBottom: 4 },
  promoPriceRow: { flexDirection: "row", alignItems: "baseline", marginTop: 4 },
  promoPrice: { fontSize: 28, fontWeight: "700", color: COLORS.accent, marginRight: 8 },
  priceCDF: { fontSize: 14, color: COLORS.secondary },
  discountBadge: { backgroundColor: COLORS.error + "20", paddingHorizontal: 8, paddingVertical: 4, borderRadius: 4 },
  discountText: { fontSize: 14, fontWeight: "700", color: COLORS.error },
  section: { marginBottom: 24 },
  sectionTitle: { fontSize: 18, fontWeight: "600", color: COLORS.primary, marginBottom: 12 },
  description: { fontSize: 15, lineHeight: 22, color: COLORS.primary },
  descriptionCollapsed: { overflow: "hidden" },
  readMoreButton: { marginTop: 8, alignSelf: "flex-start" },
  readMoreContent: { flexDirection: "row", alignItems: "center" },
  readMoreText: { fontSize: 14, color: COLORS.accent, fontWeight: "500", marginRight: 4 },
  linksSection: { marginTop: 16 },
  linksHeader: { flexDirection: "row", alignItems: "center", marginBottom: 8 },
  linksTitle: { fontSize: 15, fontWeight: "500", color: COLORS.primary, marginLeft: 6 },
  linkItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.cardBackground,
    padding: 12,
    marginBottom: 8,
    borderRadius: 8,
  },
  linkIconContainer: { width: 36, height: 36, backgroundColor: COLORS.white, justifyContent: "center", alignItems: "center", marginRight: 12, borderRadius: 18 },
  linkContent: { flex: 1 },
  linkDomain: { fontSize: 14, fontWeight: "600", color: COLORS.primary },
  linkUrl: { fontSize: 12, color: COLORS.secondary, marginTop: 2 },
  linkArrow: { marginLeft: 8 },
  sellerInfo: { marginTop: 8 },
  sellerLine: { marginBottom: 8, flexDirection: "row", flexWrap: "wrap" },
  sellerLabel: { fontSize: 14, fontWeight: "500", color: COLORS.secondary },
  sellerValue: { fontSize: 14, color: COLORS.primary },
  actionsContainer: { marginBottom: 24 },
  actionRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 8 },
  actionButton: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", paddingVertical: 14, marginHorizontal: 4, borderRadius: 4 },
  whatsappButton: { backgroundColor: COLORS.whatsapp },
  cartButton: { backgroundColor: COLORS.accent },
  orderButton: { backgroundColor: COLORS.primary },
  buyNowButton: { backgroundColor: COLORS.blue },
  actionText: { color: COLORS.white, fontSize: 15, fontWeight: "600", marginLeft: 8 },
  bottomButtons: { flexDirection: "row", justifyContent: "space-between", marginBottom: 24 },
  reportButton: { flexDirection: "row", alignItems: "center", paddingVertical: 8, paddingHorizontal: 16, backgroundColor: COLORS.cardBackground, borderRadius: 4 },
  reportButtonText: { marginLeft: 8, fontSize: 14, color: COLORS.error },
  reviewButton: { flexDirection: "row", alignItems: "center", paddingVertical: 8, paddingHorizontal: 16, backgroundColor: COLORS.cardBackground, borderRadius: 4 },
  reviewButtonText: { marginLeft: 8, fontSize: 14, color: COLORS.accent },
  similarCard: { width: 140, marginRight: 12, backgroundColor: COLORS.cardBackground, padding: 8, borderRadius: 8 },
  similarImage: { width: "100%", height: 120, marginBottom: 8, borderRadius: 4 },
  similarTitle: { fontSize: 13, color: COLORS.primary, marginBottom: 4 },
  similarPrices: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 4 },
  similarOriginalPrice: { fontSize: 12, color: COLORS.secondary, textDecorationLine: "line-through" },
  similarPromoPrice: { fontSize: 14, fontWeight: "600", color: COLORS.accent },
  similarDiscount: { alignSelf: "flex-start", backgroundColor: COLORS.error + "20", paddingHorizontal: 4, paddingVertical: 2, borderRadius: 4 },
  similarDiscountText: { fontSize: 10, fontWeight: "bold", color: COLORS.error },
  navButtonsContainer: { flexDirection: "row", justifyContent: "space-between", marginTop: 16, gap: 12 },
  navButton: { flex: 1, alignItems: "center", justifyContent: "center", paddingVertical: 12, backgroundColor: COLORS.cardBackground, borderRadius: 8, paddingHorizontal: 8 },
  navButtonTitle: { fontSize: 13, fontWeight: "600", color: COLORS.accent, marginTop: 6, textAlign: "center" },
  navButtonSubtitle: { fontSize: 11, color: COLORS.secondary, textAlign: "center", marginTop: 2 },
  modalContainer: { flex: 1, backgroundColor: "rgba(0,0,0,0.95)", justifyContent: "center", alignItems: "center" },
  modalClose: { position: "absolute", top: 50, right: 20, zIndex: 10, padding: 8 },
  modalNav: { position: "absolute", top: "50%", zIndex: 10, padding: 16 },
  modalImage: { width: width, height: height * 0.8 },
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "center", alignItems: "center", padding: 20 },
  modalReviewContainer: { width: width * 0.9, backgroundColor: COLORS.white, borderRadius: 12, padding: 20, alignItems: "center" },
  modalTitle: { fontSize: 20, fontWeight: "bold", marginBottom: 20, color: COLORS.primary },
  commentInput: { width: "100%", borderWidth: 1, borderColor: COLORS.border, borderRadius: 8, padding: 12, marginTop: 20, marginBottom: 20, textAlignVertical: "top", minHeight: 100 },
  modalButtons: { flexDirection: "row", justifyContent: "space-between", width: "100%" },
  cancelButton: { flex: 1, paddingVertical: 12, marginRight: 8, backgroundColor: COLORS.cardBackground, alignItems: "center", borderRadius: 8 },
  cancelButtonText: { color: COLORS.secondary, fontWeight: "600" },
  submitButton: { flex: 1, paddingVertical: 12, marginLeft: 8, backgroundColor: COLORS.accent, alignItems: "center", borderRadius: 8 },
  submitButtonText: { color: COLORS.white, fontWeight: "600" },
});

