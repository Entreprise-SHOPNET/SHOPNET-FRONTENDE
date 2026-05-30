


import React, { useState, useCallback, useRef, memo, useEffect } from 'react';
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
  Platform,
} from 'react-native';
import { FontAwesome, MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Audio } from 'expo-av';
import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import { getApiUrl } from './apiUtils';
import { authApi } from '../authService';
import { useTheme } from "../../../../app/theme/ThemeContext";

const { width } = Dimensions.get('window');

// ============================================
// TYPES
// ============================================

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
  is_boosted?: boolean;
}

interface InternalPromotion {
  id: string;
  type: 'internal_promotion';
  title: string;
  description: string;
  imageUrl: string;
  targetRoute: string;
}

type FeedItem =
  | { type: 'product'; data: Product }
  | { type: 'horizontal'; data: Product[] }
  | { type: 'grid'; data: Product[] }
  | { type: 'internal'; data: InternalPromotion };

interface CacheData {
  normal: Product[];
  promo: Product[];
  timestamp: number;
}

// ============================================
// CONSTANTES
// ============================================

const API_BASE_URL = 'https://shopnet-backend.onrender.com/api';
const PROMOTIONS_API_URL = `${API_BASE_URL}/promotions`;
const CACHE_KEY = '@shopnet_feed_cache';
const PRODUCTS_PER_PAGE = 10;
const INTERNAL_PROMO_POSITION = 5;

// ============================================
// FONCTIONS UTILITAIRES
// ============================================

// Génère un nombre aléatoire entre min et max
const randomInt = (min: number, max: number): number => {
  return Math.floor(Math.random() * (max - min + 1)) + min;
};

// Génère des badges mockés aléatoires
const generateMockBadges = () => ({
  notification: randomInt(0, 9),
  message: randomInt(0, 5),
  cart: randomInt(0, 8),
  profile: randomInt(0, 3),
  home: randomInt(0, 6),
  discover: randomInt(0, 4),
  sell: randomInt(0, 2),
});

// ============================================
// SERVICE DE CACHE ROBUSTE
// ============================================

class FeedCacheService {
  private static instance: FeedCacheService;
  private constructor() {}
  static getInstance(): FeedCacheService {
    if (!FeedCacheService.instance) {
      FeedCacheService.instance = new FeedCacheService();
    }
    return FeedCacheService.instance;
  }
  async save(data: { normal: Product[]; promo: Product[] }): Promise<void> {
    try {
      const cacheData: CacheData = { ...data, timestamp: Date.now() };
      await AsyncStorage.setItem(CACHE_KEY, JSON.stringify(cacheData));
    } catch (error) {
      console.error('❌ Erreur sauvegarde cache:', error);
    }
  }
  async load(): Promise<{ normal: Product[]; promo: Product[] } | null> {
    try {
      const cached = await AsyncStorage.getItem(CACHE_KEY);
      if (!cached) return null;
      const data: CacheData = JSON.parse(cached);
      return { normal: data.normal, promo: data.promo };
    } catch (error) {
      console.error('❌ Erreur lecture cache:', error);
      return null;
    }
  }
  async clear(): Promise<void> {
    try {
      await AsyncStorage.removeItem(CACHE_KEY);
    } catch (error) {
      console.error('❌ Erreur suppression cache:', error);
    }
  }
}

// ============================================
// FONCTION DE FORMATAGE DES NOMBRES
// ============================================
const formatNumber = (num: number): string => {
  if (num >= 1_000_000) {
    const formatted = (num / 1_000_000).toFixed(1);
    return formatted.replace(/\.0$/, '') + 'M';
  }
  if (num >= 1_000) {
    const formatted = (num / 1_000).toFixed(1);
    return formatted.replace(/\.0$/, '') + 'K';
  }
  return num.toString();
};

// ============================================
// COMPOSANTS AVEC THÈME DYNAMIQUE
// ============================================

const SponsoredBadge = () => {
  const { isDark } = useTheme();
  return (
    <View style={[styles.sponsoredBadge, { backgroundColor: isDark ? 'rgba(66, 165, 245, 0.2)' : '#E3F2FD' }]}>
      <MaterialIcons name="verified" size={14} color="#42A5F5" />
      <Text style={[styles.sponsoredText, { color: '#1E88E5' }]}>Sponsorisé</Text>
    </View>
  );
};

const RotatingText = ({ product }: { product: Product }) => {
  const { isDark } = useTheme();
  const [currentIndex, setCurrentIndex] = useState(0);
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const translateYAnim = useRef(new Animated.Value(0)).current;
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const generateMessages = (p: Product): string[] => {
    const msgs: string[] = [];
    const views = p.likes + p.comments + p.shares;
    const orders = p.shares || 0;
    const likes = p.likes || 0;
    const hasPromo = p.isPromotion || (p.original_price && p.original_price > p.price);
    const discount = p.discount || (p.original_price ? Math.round(((p.original_price - p.price) / p.original_price) * 100) : 0);
    const stockLimited = (p as any).stock && (p as any).stock < 10;
    const isNew = (Date.now() - new Date(p.created_at || 0).getTime()) < 24 * 60 * 60 * 1000;

    if (hasPromo) {
      if (discount > 0) msgs.push(`🔥 -${discount}% aujourd'hui`);
      else msgs.push(`🔥 Promo active`);
      if (discount > 1) msgs.push(`🔥 Offre Flash -${discount}%`);
    }
    if (views > 1) msgs.push(`👁️ ${formatNumber(views)} personnes regardent`);
    else if (views > 0) msgs.push(`👁️ ${formatNumber(views)} vues`);
    if (views > 1) msgs.push(`👁️ Très populaire`);
    if (likes > 1) msgs.push(`❤️ ${formatNumber(likes)} intéressés`);
    if (likes > 10) msgs.push(`🔥 Très demandé aujourd'hui`);
    if (orders > 1) msgs.push(`📦 ${formatNumber(orders)} vendus`);
    if (orders > 1) msgs.push(`📦 Déjà ${formatNumber(orders)}+ commandes`);
    if (stockLimited) msgs.push(`⚡ Stock limité`);
    if (stockLimited) msgs.push(`⚡ Derniers stocks disponibles`);
    if (p.location && p.location.toLowerCase().includes('lubumbashi')) msgs.push(`📍 Disponible près de vous`);
    if (p.rating > 4.5) msgs.push(`⭐ ${p.rating.toFixed(1)} / 5`);
    if (isNew) msgs.push(`🆕 Nouveau produit`);
    if (views > 1) msgs.push(`🛒 Ajouté récemment au panier`);
    if (p.time_remaining) msgs.push(`⏳ Offre limitée dans le temps`);
    if (msgs.length === 0) {
      msgs.push(`✨ Découvrez ce produit`);
      msgs.push(`📱 Tendance du moment`);
    }
    return msgs.slice(0, 5);
  };

  const messages = generateMessages(product);

  const animateTransition = (nextIndex: number) => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 0, duration: 300, useNativeDriver: true }),
      Animated.timing(translateYAnim, { toValue: -20, duration: 300, useNativeDriver: true }),
    ]).start(() => {
      setCurrentIndex(nextIndex);
      translateYAnim.setValue(20);
      Animated.parallel([
        Animated.timing(fadeAnim, { toValue: 1, duration: 300, useNativeDriver: true }),
        Animated.timing(translateYAnim, { toValue: 0, duration: 300, useNativeDriver: true }),
      ]).start();
    });
  };

  useEffect(() => {
    if (messages.length <= 1) return;
    const interval = setInterval(() => {
      const nextIndex = (currentIndex + 1) % messages.length;
      animateTransition(nextIndex);
    }, 4000);
    intervalRef.current = interval;
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [messages, currentIndex]);

  if (messages.length === 0) return null;
  return (
    <Animated.Text
      style={[
        styles.rotatingText,
        { opacity: fadeAnim, transform: [{ translateY: translateYAnim }], color: isDark ? '#FF8A65' : '#FF5722' },
      ]}
      numberOfLines={1}
    >
      {messages[currentIndex]}
    </Animated.Text>
  );
};

const ProductBadges = ({ product }: { product: Product }) => {
  const hasPromo = product.isPromotion || (product.original_price && product.original_price > product.price);
  const isTrending = (product.likes + product.comments + product.shares) > 100;
  const isBoosted = product.is_boosted === true;
  const isForYou = !hasPromo && !isTrending && !isBoosted && (product.rating > 4.5 || (Date.now() - new Date(product.created_at || 0).getTime()) < 24 * 60 * 60 * 1000);

  return (
    <View style={styles.badgesContainer}>
      {hasPromo && <View style={[styles.productBadge, styles.badgePromo]}><Text style={styles.productBadgeText}>🔥 PROMO</Text></View>}
      {isTrending && <View style={[styles.productBadge, styles.badgeTrending]}><Text style={styles.productBadgeText}>⭐ Tendance</Text></View>}
      {isBoosted && <View style={[styles.productBadge, styles.badgeBoost]}><Text style={styles.productBadgeText}>📢 Pub</Text></View>}
      {isForYou && <View style={[styles.productBadge, styles.badgeForYou]}><Text style={styles.productBadgeText}>🎁 Pour vous</Text></View>}
    </View>
  );
};

// ============================================
// COMPOSANT BADGE DE NOTIFICATION
// ============================================

const NotificationBadge = memo(({ count, small = false, color = '#FF3B30' }: { count: number; small?: boolean; color?: string }) => {
  if (count <= 0) return null;
  const displayCount = count > 99 ? '99+' : count > 9 ? '9+' : count.toString();
  return (
    <View style={[
      styles.notifBadge, 
      small ? styles.smallNotifBadge : styles.regularNotifBadge, 
      count > 99 && styles.largeCountNotifBadge,
      { backgroundColor: color }
    ]}>
      <Text style={[styles.notifBadgeText, small ? styles.smallNotifBadgeText : styles.regularNotifBadgeText]}>
        {displayCount}
      </Text>
    </View>
  );
});

// ============================================
// HOOK PERSONNALISÉ useFeed (INCHANGÉ - IDENTIQUE À LA VERSION PRÉCÉDENTE)
// ============================================

interface UseFeedReturn {
  feedItems: FeedItem[];
  loading: boolean;
  refreshing: boolean;
  isLoadingMore: boolean;
  hasMore: boolean;
  handleRefresh: () => Promise<void>;
  handleLoadMore: () => Promise<void>;
  handleLike: (productId: string) => Promise<void>;
  handleComment: (productId: string) => void;
  handleShare: (product: Product) => Promise<void>;
  handleAddToCart: (product: Product) => Promise<void>;
  handleCategoryChange: (index: number) => void;
}

const useFeed = (
  initialCategory: number = 0,
  categories: string[],
  isDark: boolean,
): UseFeedReturn => {
  const router = useRouter();
  const cacheService = FeedCacheService.getInstance();

  const [normalProducts, setNormalProducts] = useState<Product[]>([]);
  const [promotionProducts, setPromotionProducts] = useState<Product[]>([]);
  const [feedItems, setFeedItems] = useState<FeedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [activeCategory, setActiveCategory] = useState(initialCategory);
  const [isOnline, setIsOnline] = useState(true);
  const [showNotification, setShowNotification] = useState(false);
  const [notificationMessage, setNotificationMessage] = useState('');
  const notificationAnim = useState(new Animated.Value(-100))[0];
  const soundRef = useRef<Audio.Sound | null>(null);

  const shuffleArray = <T,>(array: T[]): T[] => {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  };

  const calculateTimeRemaining = (createdAt: string, durationDays: number): string => {
    const createdDate = new Date(createdAt);
    const endDate = new Date(createdDate.getTime() + durationDays * 24 * 60 * 60 * 1000);
    const now = new Date();
    const diffMs = endDate.getTime() - now.getTime();
    if (diffMs <= 0) return 'Expirée';
    const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    return days > 0 ? `${days}j ${hours}h` : `${hours}h`;
  };

  const displayNotification = useCallback((message: string) => {
    setNotificationMessage(message);
    setShowNotification(true);
    Animated.sequence([
      Animated.timing(notificationAnim, { toValue: 0, duration: 300, useNativeDriver: true }),
      Animated.delay(2000),
      Animated.timing(notificationAnim, { toValue: -100, duration: 300, useNativeDriver: true }),
    ]).start(() => setShowNotification(false));
  }, [notificationAnim]);

  const generateFeedItems = useCallback((normals: Product[], promos: Product[]) => {
    const allProducts = shuffleArray([...normals, ...promos]);
    const items: FeedItem[] = [];
    let i = 0;
    const pattern: Array<'full' | 'horizontal' | 'grid'> = ['full', 'horizontal', 'grid'];
    let patternIndex = 0;
    while (i < allProducts.length) {
      const currentPattern = pattern[patternIndex % pattern.length];
      if (currentPattern === 'full') {
        items.push({ type: 'product', data: allProducts[i] });
        i += 1;
      } else if (currentPattern === 'horizontal') {
        const end = Math.min(i + 4, allProducts.length);
        const horizontalProducts = allProducts.slice(i, end);
        if (horizontalProducts.length > 0) {
          items.push({ type: 'horizontal', data: horizontalProducts });
          i = end;
        }
      } else {
        const end = Math.min(i + 2, allProducts.length);
        const gridProducts = allProducts.slice(i, end);
        if (gridProducts.length > 0) {
          items.push({ type: 'grid', data: gridProducts });
          i = end;
        }
      }
      patternIndex++;
    }
    const internalPromo: InternalPromotion = {
      id: 'internal-promo-1',
      type: 'internal_promotion',
      title: '🚀 Créez votre boutique Premium dès maintenant',
      description: 'Débloquez plus de fonctionnalités, augmentez votre visibilité et développez votre business.',
      imageUrl: 'https://res.cloudinary.com/dddr7gb6w/image/upload/v1772195595/Gemini_Generated_Image_wu89avwu89avwu89_vi6zsf.png',
      targetRoute: '/(tabs)/Auth/Boutique/Boutique',
    };
    if (items.length >= INTERNAL_PROMO_POSITION) {
      items.splice(INTERNAL_PROMO_POSITION, 0, { type: 'internal', data: internalPromo });
    } else {
      items.push({ type: 'internal', data: internalPromo });
    }
    return items;
  }, []);

  const fetchPromotions = useCallback(async (): Promise<Product[]> => {
    try {
      const token = await AsyncStorage.getItem('userToken');
      if (!token) return [];
      const response = await fetch(PROMOTIONS_API_URL, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) throw new Error('Erreur réseau');
      const data = await response.json();
      if (data?.success && data.promotions) {
        return data.promotions.map((promo: any) => ({
          id: `promo_${promo.promotionId}`,
          promotionId: promo.promotionId,
          title: promo.product_title || 'Promotion',
          description: promo.description || 'Produit en promotion',
          price: Number(promo.promo_price) || 0,
          original_price: Number(promo.original_price) || 0,
          discount: promo.original_price && promo.promo_price
            ? Math.round(((promo.original_price - promo.promo_price) / promo.original_price) * 100)
            : 0,
          images: Array.isArray(promo.images) ? promo.images :
            (typeof promo.images === 'string' ? [promo.images] : ['https://via.placeholder.com/400']),
          seller: {
            id: promo.seller?.id?.toString() || '1',
            name: promo.seller?.name || 'Vendeur SHOPNET',
            avatar: promo.seller?.avatar || 'https://via.placeholder.com/40',
          },
          rating: 4.5,
          comments: 0,
          likes: 0,
          isLiked: false,
          shares: 0,
          location: promo.seller?.address || 'Lubumbashi',
          isPromotion: true,
          duration_days: promo.duration_days || 7,
          created_at: promo.created_at || new Date().toISOString(),
          time_remaining: calculateTimeRemaining(
            promo.created_at || new Date().toISOString(),
            promo.duration_days || 7,
          ),
          is_boosted: false,
        }));
      }
      return [];
    } catch (error) {
      console.error('❌ Erreur fetchPromotions:', error);
      return [];
    }
  }, []);

  const fetchNormalProducts = useCallback(async (page: number = 1) => {
    try {
      const token = await AsyncStorage.getItem('userToken');
      if (!token) {
        displayNotification('Veuillez vous connecter');
        return { products: [], totalPages: 1 };
      }
      const apiUrl = getApiUrl('all');
      const response = await fetch(
        `${apiUrl}?category=${categories[activeCategory]?.replace(/[^a-zA-Z]/g, '') || ''}&page=${page}&limit=${PRODUCTS_PER_PAGE}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (!response.ok) throw new Error('Erreur réseau');
      const data = await response.json();
      if (!data?.products) throw new Error('Réponse invalide');
      const formatted = data.products.map((product: any) => {
        const images = Array.isArray(product.images)
          ? product.images.filter((img: string) => img && img.trim() !== '')
          : [];
        const isBoosted = product.isPromotion === true;
        return {
          id: product.id?.toString() ?? '',
          title: product.title ?? 'Titre non disponible',
          description: product.description ?? '',
          price: Number(product.price) ?? 0,
          discount: product.original_price
            ? Math.round((1 - product.price / product.original_price) * 100)
            : 0,
          images: images.length > 0
            ? images.map((img: string) => img.startsWith('http') ? img : `${API_BASE_URL}${img}`)
            : ['https://via.placeholder.com/400'],
          seller: {
            id: product.seller?.id?.toString() ?? '1',
            name: product.seller?.name ?? 'Vendeur inconnu',
            avatar: product.seller?.avatar
              ? (product.seller.avatar.startsWith('http')
                ? product.seller.avatar
                : `${API_BASE_URL}${product.seller.avatar}`)
              : 'https://via.placeholder.com/40',
          },
          rating: product.rating ?? 0,
          comments: product.comments ?? 0,
          likes: product.likes ?? 0,
          isLiked: product.isLiked ?? false,
          shares: product.shares ?? 0,
          location: product.location ?? 'Lubumbashi',
          isPromotion: false,
          created_at: product.created_at || new Date().toISOString(),
          is_boosted: isBoosted,
        };
      });
      return {
        products: formatted,
        totalPages: data.totalPages || 1,
      };
    } catch (error) {
      console.error('❌ Erreur fetchNormalProducts:', error);
      return { products: [], totalPages: 1 };
    }
  }, [activeCategory, categories]);

  const refreshFeed = useCallback(async (showLoader: boolean = true) => {
    if (!isOnline) {
      displayNotification('Mode hors ligne - données du cache');
      return;
    }
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
      const newFeedItems = generateFeedItems(normalData.products, promos);
      setFeedItems(newFeedItems);
      await cacheService.save({ normal: normalData.products, promo: promos });
    } catch (error) {
      console.error('❌ Erreur refresh:', error);
      displayNotification('Erreur de chargement');
    } finally {
      setRefreshing(false);
      setLoading(false);
    }
  }, [fetchPromotions, fetchNormalProducts, isOnline, cacheService, generateFeedItems]);

  useEffect(() => {
    const initFeed = async () => {
      const netInfo = await NetInfo.fetch();
      setIsOnline(netInfo.isConnected ?? true);
      const cached = await cacheService.load();
      if (cached) {
        setNormalProducts(cached.normal);
        setPromotionProducts(cached.promo);
        const cachedFeedItems = generateFeedItems(cached.normal, cached.promo);
        setFeedItems(cachedFeedItems);
      }
      if (netInfo.isConnected) {
        refreshFeed(!cached);
      } else {
        setLoading(false);
      }
    };
    initFeed();
    const unsubscribe = NetInfo.addEventListener(state => {
      const wasOffline = !isOnline;
      setIsOnline(state.isConnected ?? true);
      if (state.isConnected && wasOffline) {
        refreshFeed(false);
      }
    });
    return () => unsubscribe();
  }, []);

  const loadMore = useCallback(async () => {
    if (!isOnline || currentPage >= totalPages || isLoadingMore || loading) return;
    setIsLoadingMore(true);
    try {
      const nextPage = currentPage + 1;
      const normalData = await fetchNormalProducts(nextPage);
      if (normalData.products.length > 0) {
        const updatedNormalProducts = [...normalProducts, ...normalData.products];
        setNormalProducts(updatedNormalProducts);
        setCurrentPage(nextPage);
        setTotalPages(normalData.totalPages);
        const newFeedItems = generateFeedItems(updatedNormalProducts, promotionProducts);
        setFeedItems(newFeedItems);
        await cacheService.save({
          normal: updatedNormalProducts,
          promo: promotionProducts,
        });
      }
    } catch (error) {
      console.error('❌ Erreur loadMore:', error);
    } finally {
      setIsLoadingMore(false);
    }
  }, [
    currentPage,
    totalPages,
    isLoadingMore,
    loading,
    isOnline,
    fetchNormalProducts,
    normalProducts,
    promotionProducts,
    cacheService,
    generateFeedItems,
  ]);

  const handleLike = useCallback(async (productId: string) => {
    let previousState: { isLiked: boolean; likes: number } | null = null;
    setFeedItems(prevFeed => {
      const newFeed = prevFeed.map(item => {
        if (item.type === 'product' && item.data.id === productId) {
          previousState = { isLiked: item.data.isLiked, likes: item.data.likes };
          return { ...item, data: { ...item.data, isLiked: !item.data.isLiked, likes: item.data.isLiked ? item.data.likes - 1 : item.data.likes + 1 } };
        }
        if (item.type === 'horizontal') {
          const updatedData = item.data.map(p => {
            if (p.id === productId) {
              previousState = { isLiked: p.isLiked, likes: p.likes };
              return { ...p, isLiked: !p.isLiked, likes: p.isLiked ? p.likes - 1 : p.likes + 1 };
            }
            return p;
          });
          return { ...item, data: updatedData };
        }
        if (item.type === 'grid') {
          const updatedData = item.data.map(p => {
            if (p.id === productId) {
              previousState = { isLiked: p.isLiked, likes: p.likes };
              return { ...p, isLiked: !p.isLiked, likes: p.isLiked ? p.likes - 1 : p.likes + 1 };
            }
            return p;
          });
          return { ...item, data: updatedData };
        }
        return item;
      });
      return newFeed;
    });
    let normalIdx = normalProducts.findIndex(p => p.id === productId);
    if (normalIdx !== -1) {
      const product = normalProducts[normalIdx];
      const updated = [...normalProducts];
      updated[normalIdx] = { ...product, isLiked: !product.isLiked, likes: product.isLiked ? product.likes - 1 : product.likes + 1 };
      setNormalProducts(updated);
    } else {
      const promoIdx = promotionProducts.findIndex(p => p.id === productId);
      if (promoIdx !== -1) {
        const product = promotionProducts[promoIdx];
        const updated = [...promotionProducts];
        updated[promoIdx] = { ...product, isLiked: !product.isLiked, likes: product.isLiked ? product.likes - 1 : product.likes + 1 };
        setPromotionProducts(updated);
      } else {
        if (previousState) {
          setFeedItems(prevFeed => prevFeed.map(item => {
            if (item.type === 'product' && item.data.id === productId) return { ...item, data: { ...item.data, ...previousState! } };
            if (item.type === 'horizontal') return { ...item, data: item.data.map(p => p.id === productId ? { ...p, ...previousState! } : p) };
            if (item.type === 'grid') return { ...item, data: item.data.map(p => p.id === productId ? { ...p, ...previousState! } : p) };
            return item;
          }));
        }
        return;
      }
    }
    try {
      const token = await AsyncStorage.getItem('userToken');
      if (!token) throw new Error('Non authentifié');
      const endpoint = productId.startsWith('promo_')
        ? `https://shopnet-backend.onrender.com/api/promotions/${productId.replace('promo_', '')}/like`
        : `https://shopnet-backend.onrender.com/api/interactions/${productId}/like`;
      const response = await fetch(endpoint, { method: 'POST', headers: { Authorization: `Bearer ${token}` } });
      const data = await response.json();
      if (!data.success) throw new Error('Erreur like');
    } catch (error) {
      if (previousState) {
        setFeedItems(prevFeed => prevFeed.map(item => {
          if (item.type === 'product' && item.data.id === productId) return { ...item, data: { ...item.data, ...previousState! } };
          if (item.type === 'horizontal') return { ...item, data: item.data.map(p => p.id === productId ? { ...p, ...previousState! } : p) };
          if (item.type === 'grid') return { ...item, data: item.data.map(p => p.id === productId ? { ...p, ...previousState! } : p) };
          return item;
        }));
        if (normalIdx !== -1) setNormalProducts(prev => { const updated = [...prev]; updated[normalIdx!] = { ...updated[normalIdx!], ...previousState! }; return updated; });
        else { const promoIdx = promotionProducts.findIndex(p => p.id === productId); if (promoIdx !== -1) setPromotionProducts(prev => { const updated = [...prev]; updated[promoIdx] = { ...updated[promoIdx], ...previousState! }; return updated; }); }
      }
      displayNotification('Erreur lors du like');
    }
  }, [normalProducts, promotionProducts, displayNotification]);

  const handleComment = useCallback((productId: string) => {
    router.push({ pathname: '/(tabs)/Auth/Produits/Commentaire', params: { productId } });
  }, []);

  const handleShare = useCallback(async (product: Product) => {
    setFeedItems(prevFeed =>
      prevFeed.map(item => {
        if (item.type === 'product' && item.data.id === product.id) return { ...item, data: { ...item.data, shares: item.data.shares + 1 } };
        if (item.type === 'horizontal') return { ...item, data: item.data.map(p => p.id === product.id ? { ...p, shares: p.shares + 1 } : p) };
        if (item.type === 'grid') return { ...item, data: item.data.map(p => p.id === product.id ? { ...p, shares: p.shares + 1 } : p) };
        return item;
      })
    );
    const normalIdx = normalProducts.findIndex(p => p.id === product.id);
    if (normalIdx !== -1) { const updated = [...normalProducts]; updated[normalIdx].shares += 1; setNormalProducts(updated); }
    else { const promoIdx = promotionProducts.findIndex(p => p.id === product.id); if (promoIdx !== -1) { const updated = [...promotionProducts]; updated[promoIdx].shares += 1; setPromotionProducts(updated); } }
    try {
      await Share.share({
        title: product.isPromotion ? `🔥 PROMO: ${product.title}` : `Partager ${product.title}`,
        message: product.isPromotion ? `🔥 PROMOTION !\n${product.title}\nPrix: $${product.price}\n${product.description}` : `Découvrez ${product.title} à $${product.price}\n${product.description}`,
      });
    } catch (error) { console.error('❌ Erreur partage:', error); }
  }, [normalProducts, promotionProducts]);

  const handleAddToCart = useCallback(async (product: Product) => {
    try {
      const token = await AsyncStorage.getItem('userToken');
      if (!token) { displayNotification('Authentification requise'); return; }
      const cartItem = {
        product_id: product.isPromotion ? product.promotionId : product.id,
        title: product.title,
        description: product.description,
        price: product.price,
        original_price: product.original_price || product.price,
        category: categories[activeCategory]?.replace(/[^a-zA-Z]/g, '') || '',
        condition: 'new',
        quantity: 1,
        stock: 10,
        location: product.location,
        delivery_options: { pickup: true, delivery: true },
        images: product.images || [],
        seller_id: product.seller?.id || '',
        seller_name: product.seller?.name || '',
        seller_rating: product.rating || 0,
      };
      const res = await authApi.post('https://shopnet-backend.onrender.com/api/cart', cartItem, { headers: { Authorization: `Bearer ${token}` } });
      if (res.data?.success) {
        displayNotification(`✅ ${product.isPromotion ? 'Promotion' : 'Produit'} ajouté au panier`);
        if (soundRef.current) await soundRef.current.replayAsync();
      } else { displayNotification('⚠️ Impossible d\'ajouter'); }
    } catch (error) { displayNotification('❌ Erreur'); }
  }, [activeCategory, categories]);

  useEffect(() => {
    const loadSound = async () => {
      try {
        const { sound } = await Audio.Sound.createAsync(require('../../../../assets/sounds/success-sound.mp3'));
        soundRef.current = sound;
      } catch (error) { console.error('❌ Erreur chargement son:', error); }
    };
    loadSound();
    return () => { soundRef.current?.unloadAsync(); };
  }, []);

  return {
    feedItems,
    loading,
    refreshing,
    isLoadingMore,
    hasMore: currentPage < totalPages,
    handleRefresh: () => refreshFeed(true),
    handleLoadMore: loadMore,
    handleLike,
    handleComment,
    handleShare,
    handleAddToCart,
    handleCategoryChange: setActiveCategory,
  };
};

// ============================================
// COMPOSANTS OPTIMISÉS AVEC THÈME
// ============================================

const ProductMiniCard = memo(({ item, onPress, onSellerPress }: { item: Product; onPress: () => void; onSellerPress: () => void }) => {
  const { isDark } = useTheme();
  const imageUrl = item.images?.[0] || 'https://via.placeholder.com/120';
  const [imageLoaded, setImageLoaded] = useState(false);
  return (
    <TouchableOpacity style={[styles.miniCard, { backgroundColor: isDark ? '#1A1A1A' : '#FFFFFF' }]} onPress={onPress}>
      <View style={styles.miniImageContainer}>
        {!imageLoaded && <View style={[styles.miniImage, styles.imagePlaceholder, { backgroundColor: isDark ? '#222222' : '#F0F0F4' }]}><ActivityIndicator size="small" color="#4CAF50" /></View>}
        <Image source={{ uri: imageUrl }} style={styles.miniImage} onLoad={() => setImageLoaded(true)} />
      </View>
      <Text numberOfLines={1} style={[styles.miniTitle, { color: isDark ? '#F5F5F5' : '#1A1A2E' }]}>{item.title}</Text>
      <Text style={[styles.miniPrice, { color: '#4CAF50' }]}>${item.price?.toFixed(2) ?? '0.00'}</Text>
      <RotatingText product={item} />
      {!item.isPromotion && (
        <TouchableOpacity onPress={onSellerPress} style={styles.miniSeller}>
          <Image source={{ uri: item.seller.avatar || 'https://via.placeholder.com/20' }} style={styles.miniSellerAvatar} />
          <Text numberOfLines={1} style={[styles.miniSellerName, { color: isDark ? '#B0B0B0' : '#6C6C80' }]}>{item.seller.name}</Text>
        </TouchableOpacity>
      )}
    </TouchableOpacity>
  );
});

const HorizontalProductRow = memo(({ products, onProductPress, onSellerPress }: { products: Product[]; onProductPress: (product: Product) => void; onSellerPress: (sellerId: string) => void }) => {
  const { isDark } = useTheme();
  if (products.length === 0) return null;
  return (
    <View style={[styles.horizontalRowContainer, { backgroundColor: isDark ? '#1A1A1A' : '#FFFFFF', borderBottomColor: isDark ? '#2E2E2E' : '#E8E8EC' }]}>
      <FlatList
        horizontal
        data={products}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <ProductMiniCard
            item={item}
            onPress={() => onProductPress(item)}
            onSellerPress={() => onSellerPress(item.seller.id)}
          />
        )}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.horizontalListContent}
        removeClippedSubviews
        maxToRenderPerBatch={4}
        windowSize={3}
        initialNumToRender={4}
      />
    </View>
  );
});

const FullWidthProductCard = memo(({
  item,
  handleLike,
  handleComment,
  handleShare,
  handleAddToCart,
  router,
  onSellerPress,
}: {
  item: Product;
  handleLike: (id: string) => void;
  handleComment: (id: string) => void;
  handleShare: (product: Product) => void;
  handleAddToCart: (product: Product) => void;
  router: any;
  onSellerPress: (sellerId: string) => void;
}) => {
  const { isDark } = useTheme();
  const [imageLoaded, setImageLoaded] = useState(false);
  const seller = item.seller ?? { id: '0', name: 'Inconnu', avatar: '' };
  const images = item.images?.length ? item.images : ['https://via.placeholder.com/400'];
  const price = item.price ?? 0;
  const originalPrice = item.original_price ?? price;
  const discount = item.discount ?? 0;
  const rating = item.rating ?? 0;
  const comments = item.comments ?? 0;
  const likes = item.likes ?? 0;
  const shares = item.shares ?? 0;

  return (
    <View style={[styles.fullWidthCard, { backgroundColor: isDark ? '#1A1A1A' : '#FFFFFF', borderBottomColor: isDark ? '#2E2E2E' : '#E8E8EC' }]}>
      {!item.isPromotion && (
        <TouchableOpacity
          style={styles.productHeader}
          onPress={() => onSellerPress(seller.id)}
        >
          <Image source={{ uri: seller.avatar || 'https://via.placeholder.com/40' }} style={styles.avatar} />
          <View style={styles.sellerInfo}>
            <View style={styles.sellerNameRow}>
              <Text style={[styles.sellerName, { color: isDark ? '#F5F5F5' : '#1A1A2E' }]} numberOfLines={1}>{seller.name || 'Vendeur'}</Text>
              {item.is_boosted && <SponsoredBadge />}
            </View>
            <Text style={[styles.productLocation, { color: isDark ? '#B0B0B0' : '#6C6C80' }]} numberOfLines={1}>{item.location || 'Lubumbashi'}</Text>
          </View>
        </TouchableOpacity>
      )}

      <TouchableOpacity
        onPress={() => {
          if (item.isPromotion && item.promotionId) {
            router.push({ pathname: '/(tabs)/Auth/Panier/PromoDetail', params: { id: item.promotionId.toString() } });
          } else {
            router.push({ pathname: '/(tabs)/Auth/Panier/DetailId', params: { id: item.id.toString() } });
          }
        }}
      >
        <View style={styles.fullWidthImageContainer}>
          {!imageLoaded && <View style={[styles.fullWidthImage, styles.imagePlaceholder, { backgroundColor: isDark ? '#222222' : '#F0F0F4' }]}><ActivityIndicator size="large" color="#4CAF50" /></View>}
          <Image source={{ uri: images[0] }} style={styles.fullWidthImage} onLoad={() => setImageLoaded(true)} />
          <ProductBadges product={item} />
          {item.is_boosted && (
            <View style={styles.imageSponsoredBadge}>
              <Text style={styles.imageSponsoredText}>Offre spéciale</Text>
            </View>
          )}
        </View>

        {item.isPromotion && (
          <View style={styles.promotionBadge}>
            <Text style={styles.promotionBadgeText}>🔥 PROMO</Text>
            {item.time_remaining && <Text style={styles.timerText}>{item.time_remaining}</Text>}
          </View>
        )}

        <View style={styles.priceContainer}>
          {item.isPromotion && originalPrice > 0 ? (
            <>
              <Text style={styles.originalPrice}>${originalPrice.toFixed(2)}</Text>
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
              {discount > 0 && <Text style={styles.discountText}> {discount}% OFF</Text>}
            </Text>
          )}
        </View>
      </TouchableOpacity>

      <View style={styles.productInfo}>
        <Text style={[styles.productTitle, { color: isDark ? '#F5F5F5' : '#1A1A2E' }]} numberOfLines={2}>{item.title}</Text>
        <Text style={[styles.productDescription, { color: isDark ? '#B0B0B0' : '#6C6C80' }]} numberOfLines={2}>{item.description}</Text>
      </View>

      <RotatingText product={item} />

      <TouchableOpacity
        style={styles.ratingContainer}
        onPress={() => router.push({ pathname: '/(tabs)/Auth/Produits/Commentaire', params: { productId: item.id } })}
      >
        <View style={styles.starsContainer}>
          {[1, 2, 3, 4, 5].map((star) => (
            <FontAwesome key={star} name={star <= Math.floor(rating) ? 'star' : 'star-o'} size={16} color="#FFD700" />
          ))}
        </View>
        <Text style={[styles.socialCount, { color: isDark ? '#B0B0B0' : '#6C6C80' }]}>{comments} commentaires</Text>
      </TouchableOpacity>

      <View style={[styles.actionButtons, { borderTopColor: isDark ? '#2E2E2E' : '#E8E8EC' }]}>
        {!item.isPromotion && (
          <View style={styles.socialActions}>
            <TouchableOpacity style={styles.socialButton} onPress={() => handleLike(item.id)}>
              <FontAwesome name={item.isLiked ? 'heart' : 'heart-o'} size={20} color={item.isLiked ? '#FF3B30' : isDark ? '#B0B0B0' : '#6C6C80'} />
              <Text style={[styles.socialCount, { color: isDark ? '#B0B0B0' : '#6C6C80' }]}>{formatNumber(likes)}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.socialButton} onPress={() => handleComment(item.id)}>
              <FontAwesome name="comment-o" size={20} color={isDark ? '#B0B0B0' : '#6C6C80'} />
              <Text style={[styles.socialCount, { color: isDark ? '#B0B0B0' : '#6C6C80' }]}>{comments}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.socialButton} onPress={() => handleShare(item)}>
              <FontAwesome name="share" size={20} color={isDark ? '#B0B0B0' : '#6C6C80'} />
              <Text style={[styles.socialCount, { color: isDark ? '#B0B0B0' : '#6C6C80' }]}>{shares}</Text>
            </TouchableOpacity>
          </View>
        )}
        <TouchableOpacity
          style={[styles.cartButton, item.isPromotion && styles.promotionCartButton]}
          onPress={() => handleAddToCart(item)}
        >
          <Text style={styles.cartButtonText}>
            {item.isPromotion ? '🔥 Ajouter Promo' : 'Ajouter au panier'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}, (prev, next) => {
  return (
    prev.item.id === next.item.id &&
    prev.item.isLiked === next.item.isLiked &&
    prev.item.likes === next.item.likes &&
    prev.item.comments === next.item.comments &&
    prev.item.shares === next.item.shares &&
    prev.item.isPromotion === next.item.isPromotion &&
    prev.item.is_boosted === next.item.is_boosted
  );
});

const GridProductCard = memo(({ item, onPress, onSellerPress }: { item: Product; onPress: () => void; onSellerPress: () => void }) => {
  const { isDark } = useTheme();
  const [imageLoaded, setImageLoaded] = useState(false);
  const seller = item.seller ?? { id: '0', name: 'Vendeur', avatar: '' };
  const price = item.price ?? 0;
  const originalPrice = item.original_price ?? price;
  const discount = item.discount ?? 0;
  return (
    <TouchableOpacity style={[styles.gridCard, { backgroundColor: isDark ? '#1A1A1A' : '#FFFFFF' }]} onPress={onPress}>
      <View style={styles.gridImageContainer}>
        {!imageLoaded && <View style={[styles.gridImage, styles.imagePlaceholder, { backgroundColor: isDark ? '#222222' : '#F0F0F4' }]}><ActivityIndicator size="small" color="#4CAF50" /></View>}
        <Image source={{ uri: item.images?.[0] || 'https://via.placeholder.com/200' }} style={styles.gridImage} onLoad={() => setImageLoaded(true)} />
        <ProductBadges product={item} />
      </View>
      <Text numberOfLines={2} style={[styles.gridTitle, { color: isDark ? '#F5F5F5' : '#1A1A2E' }]}>{item.title}</Text>
      <View style={styles.gridPriceRow}>
        {item.isPromotion && originalPrice > 0 ? (
          <>
            <Text style={styles.gridOriginalPrice}>${originalPrice.toFixed(2)}</Text>
            <Text style={[styles.gridPrice, { color: isDark ? '#F5F5F5' : '#1A1A2E' }]}>${price.toFixed(2)}</Text>
          </>
        ) : (
          <Text style={[styles.gridPrice, { color: isDark ? '#F5F5F5' : '#1A1A2E' }]}>${price.toFixed(2)}</Text>
        )}
        {discount > 0 && <Text style={[styles.gridDiscount, { color: '#4CAF50' }]}>-{discount}%</Text>}
      </View>
      <RotatingText product={item} />
      {!item.isPromotion && (
        <TouchableOpacity onPress={onSellerPress} style={styles.gridSellerRow}>
          <Image source={{ uri: seller.avatar || 'https://via.placeholder.com/20' }} style={styles.gridSellerAvatar} />
          <Text numberOfLines={1} style={[styles.gridSellerName, { color: isDark ? '#B0B0B0' : '#6C6C80' }]}>{seller.name || 'Vendeur'}</Text>
        </TouchableOpacity>
      )}
    </TouchableOpacity>
  );
});

const TwoColumnGrid = memo(({ products, onProductPress, onSellerPress }: { products: Product[]; onProductPress: (product: Product) => void; onSellerPress: (sellerId: string) => void }) => {
  const { isDark } = useTheme();
  return (
    <View style={[styles.gridContainer, { backgroundColor: isDark ? '#1A1A1A' : '#FFFFFF', borderBottomColor: isDark ? '#2E2E2E' : '#E8E8EC' }]}>
      {products.map((item) => (
        <GridProductCard
          key={item.id}
          item={item}
          onPress={() => onProductPress(item)}
          onSellerPress={() => onSellerPress(item.seller.id)}
        />
      ))}
    </View>
  );
});

const InternalPromotionCard = memo(({ item, onPress }: { item: InternalPromotion; onPress: () => void }) => {
  const { isDark } = useTheme();
  const [imageLoaded, setImageLoaded] = useState(false);
  return (
    <TouchableOpacity style={[styles.internalPromoCard, { backgroundColor: isDark ? '#1A1A1A' : '#FFFFFF', borderBottomColor: isDark ? '#2E2E2E' : '#E8E8EC' }]} onPress={onPress}>
      <View style={styles.internalPromoImageContainer}>
        {!imageLoaded && <View style={[styles.internalPromoImage, styles.imagePlaceholder, { backgroundColor: isDark ? '#222222' : '#F0F0F4' }]}><ActivityIndicator size="large" color="#4CAF50" /></View>}
        <Image source={{ uri: item.imageUrl }} style={styles.internalPromoImage} onLoad={() => setImageLoaded(true)} />
      </View>
      <View style={styles.internalPromoContent}>
        <Text style={[styles.internalPromoTitle, { color: isDark ? '#F5F5F5' : '#1A1A2E' }]}>{item.title}</Text>
        <Text style={[styles.internalPromoDescription, { color: isDark ? '#B0B0B0' : '#6C6C80' }]}>{item.description}</Text>
      </View>
    </TouchableOpacity>
  );
});

// ============================================
// COMPOSANT PRINCIPAL SHOPNET
// ============================================

const ShopApp = () => {
  const router = useRouter();
  const { isDark } = useTheme();
  const [activeTab, setActiveTab] = useState(0);
  
  // 🎲 BADGES MOCKÉS DYNAMIQUES
  const [badgeCounts, setBadgeCounts] = useState(generateMockBadges());

  // 🔄 Changer les badges à chaque rafraîchissement
  const updateBadges = useCallback(() => {
    setBadgeCounts(generateMockBadges());
  }, []);

  const categories = [
    { id: "electronics", name: "📱 Électronique", onPress: () => router.push("/Auth/Categorie/ElectroniqueScreen") },
    { id: "fashion", name: "👕 Mode", onPress: () => router.push("/Auth/Categorie/ModeScreen") },
    { id: "home", name: "🏠 Maison", onPress: () => router.push("/Auth/Categorie/MaisonScreen") },
    { id: "computer", name: "💻 Informatique", onPress: () => router.push("/Auth/Categorie/ComputersScreen") },
    { id: "beauty", name: "💄 Beauté", onPress: () => router.push("/Auth/Categorie/BeautyScreen") },
    { id: "auto", name: "🚗 Auto & Moto", onPress: () => router.push("/Auth/Categorie/AutoMotoScreen") },
    { id: "food", name: "🍔 Alimentaire", onPress: () => router.push("/Auth/Categorie/FoodScreen") },
    { id: "services", name: "🧰 Services", onPress: () => router.push("/Auth/Categorie/ServicesScreen") },
    { id: "shops", name: "🏪 Boutiques", onPress: () => router.push("/(tabs)/Auth/Panier/AllShops") },
    { id: "popular", name: "🔥 Produits populaires", onPress: () => router.push("/Auth/Categorie/GlobalScreen") },
    { id: "new", name: "🆕 Nouveautés", onPress: () => router.push("/Auth/Categorie/RecentLocalScreen") },
    { id: "bargains", name: "💰 Bons prix", onPress: () => router.push("/Auth/Categorie/FlashDealsScreen") },
    { id: "top", name: "⭐ Top ventes", onPress: () => router.push("/Auth/Categorie/TopVentesScreen") },
    { id: "nearby", name: "📍 Près de vous", onPress: () => router.push("/Auth/Categorie/NearbyScreen") },
  ];

  const {
    feedItems,
    loading,
    refreshing,
    isLoadingMore,
    hasMore,
    handleRefresh,
    handleLoadMore,
    handleLike,
    handleComment,
    handleShare,
    handleAddToCart,
    handleCategoryChange,
  } = useFeed(0, categories.map(c => c.name), isDark);

  // 🔄 Rafraîchir avec mise à jour des badges
  const onRefreshWithBadges = useCallback(async () => {
    updateBadges();
    await handleRefresh();
  }, [handleRefresh, updateBadges]);

  const onProductPress = useCallback((product: Product) => {
    if (product.isPromotion && product.promotionId) {
      router.push({ pathname: '/(tabs)/Auth/Panier/PromoDetail', params: { id: product.promotionId.toString() } });
    } else {
      router.push({ pathname: '/(tabs)/Auth/Panier/DetailId', params: { id: product.id.toString() } });
    }
  }, []);

  const onSellerPress = useCallback((sellerId: string) => {
    router.push({ pathname: '/(tabs)/Auth/Profiles/SellerProfile', params: { sellerId } });
  }, []);

  const onInternalPromoPress = useCallback(() => {
    router.push('/(tabs)/Auth/Boutique/Boutique');
  }, []);

  const renderFeedItem = useCallback(({ item }: { item: FeedItem }) => {
    switch (item.type) {
      case 'product':
        return (
          <FullWidthProductCard
            item={item.data}
            handleLike={handleLike}
            handleComment={handleComment}
            handleShare={handleShare}
            handleAddToCart={handleAddToCart}
            router={router}
            onSellerPress={onSellerPress}
          />
        );
      case 'horizontal':
        return <HorizontalProductRow products={item.data} onProductPress={onProductPress} onSellerPress={onSellerPress} />;
      case 'grid':
        return <TwoColumnGrid products={item.data} onProductPress={onProductPress} onSellerPress={onSellerPress} />;
      case 'internal':
        return <InternalPromotionCard item={item.data} onPress={onInternalPromoPress} />;
      default:
        return null;
    }
  }, [handleLike, handleComment, handleShare, handleAddToCart, router, onProductPress, onSellerPress, onInternalPromoPress]);

  const renderFooter = useCallback(() => {
    if (!isLoadingMore) return null;
    return <View style={styles.footerLoader}><ActivityIndicator size="large" color="#4CAF50" /></View>;
  }, [isLoadingMore]);

  const renderEmpty = useCallback(() => (
    <View style={styles.emptyContainer}>
      <FontAwesome name="shopping-bag" size={60} color={isDark ? '#B0B0B0' : '#6C6C80'} />
      <Text style={[styles.emptyText, { color: isDark ? '#B0B0B0' : '#6C6C80' }]}>Aucun produit disponible</Text>
      <TouchableOpacity style={styles.retryButton} onPress={onRefreshWithBadges}>
        <Text style={styles.retryButtonText}>Réessayer</Text>
      </TouchableOpacity>
    </View>
  ), [onRefreshWithBadges, isDark]);

  const keyExtractor = useCallback((item: FeedItem, index: number) => {
    if (item.type === 'product') return `product-${item.data.id}`;
    if (item.type === 'horizontal') return `horizontal-${index}-${item.data[0]?.id}`;
    if (item.type === 'grid') return `grid-${index}-${item.data[0]?.id}`;
    return `internal-${item.data.id}`;
  }, []);

  const getItemLayout = useCallback((data: ArrayLike<FeedItem> | null | undefined, index: number) => {
    return { length: 500, offset: 500 * index, index };
  }, []);

  const handleTabPress = useCallback((screen: string, index: number) => {
    setActiveTab(index);
    updateBadges(); // Change les badges au changement d'onglet
    if (screen === 'Sell') router.push('/(tabs)/Auth/Produits/Produit');
    else if (screen === 'Home') router.push('/(tabs)/Auth/Produits/Fil');
    else if (screen === 'Discover') router.push('/(tabs)/Auth/Produits/Decouvrir');
    else if (screen === 'Messages') router.push('/(tabs)/Auth/Panier/CartListScreen');
    else router.push('/(tabs)/Auth/Produits/profil-debug');
  }, [updateBadges]);

  if (loading && feedItems.length === 0) {
    return (
      <SafeAreaView style={[styles.loadingContainer, { backgroundColor: isDark ? '#0D0D0D' : '#F5F6FA' }]}>
        <ActivityIndicator size="large" color="#4CAF50" />
        <Text style={[styles.loadingText, { color: isDark ? '#B0B0B0' : '#6C6C80' }]}>Chargement du fil...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: isDark ? '#0D0D0D' : '#F5F6FA' }]}>
      <StatusBar backgroundColor={isDark ? '#0D0D0D' : '#FFFFFF'} barStyle={isDark ? 'light-content' : 'dark-content'} />
      
      {/* HEADER AVEC BADGES MOCKÉS */}
      <View style={[
        styles.header, 
        { 
          backgroundColor: isDark ? '#1A1A1A' : '#FFFFFF', 
          borderBottomColor: isDark ? '#2E2E2E' : '#E8E8EC',
          ...Platform.select({
            ios: {
              shadowColor: isDark ? 'transparent' : '#000',
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: isDark ? 0 : 0.08,
              shadowRadius: isDark ? 0 : 4,
            },
            android: {
              elevation: isDark ? 0 : 3,
            },
          }),
        }
      ]}>
        <Text style={[styles.logo, { color: '#4CAF50' }]}>SHOPNET</Text>
        <View style={styles.headerIcons}>
          {/* Immobilier - Badge vert */}
          <TouchableOpacity onPress={() => router.push('/(tabs)/Auth/Produits/Immobilier')}>
            <View style={styles.iconContainer}>
              <FontAwesome name="home" size={22} color="#28a745" />
              <NotificationBadge count={badgeCounts.home} small color="#28a745" />
            </View>
          </TouchableOpacity>
          {/* Recherche - Badge bleu */}
          <TouchableOpacity onPress={() => router.push('/(tabs)/Auth/Produits/Recherche')}>
            <View style={styles.iconContainer}>
              <FontAwesome name="search" size={20} color={isDark ? '#B0B0B0' : '#292525'} />
              <NotificationBadge count={badgeCounts.discover} small color="#42A5F5" />
            </View>
          </TouchableOpacity>
          {/* Notifications - Badge rouge */}
          <TouchableOpacity onPress={() => router.push('/(tabs)/Auth/Notification/NotificationsUser')}>
            <View style={styles.iconContainer}>
              <FontAwesome name="bell" size={20} color={isDark ? '#B0B0B0' : '#292525'} />
              <NotificationBadge count={badgeCounts.notification} color="#FF3B30" />
            </View>
          </TouchableOpacity>
          {/* Profil - Badge orange */}
          <TouchableOpacity onPress={() => router.push('/(tabs)/Auth/Produits/profil-debug')}>
            <View style={styles.iconContainer}>
              <FontAwesome name="user-circle" size={20} color={isDark ? '#B0B0B0' : '#292525'} />
              <NotificationBadge count={badgeCounts.profile} small color="#FF9800" />
            </View>
          </TouchableOpacity>
        </View>
      </View>

      <View style={[styles.categoriesWrapper, { backgroundColor: isDark ? '#1A1A1A' : '#FFFFFF', borderBottomColor: isDark ? '#2E2E2E' : '#E8E8EC' }]}>
        <FlatList
          horizontal
          data={categories}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <TouchableOpacity style={[styles.categoryPill, { backgroundColor: isDark ? '#222222' : '#F0F0F4' }]} onPress={item.onPress}>
              <Text style={[styles.categoryText, { color: isDark ? '#B0B0B0' : '#6C6C80' }]}>{item.name}</Text>
            </TouchableOpacity>
          )}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.categoriesContainer}
        />
      </View>

      <FlatList
        data={feedItems}
        renderItem={renderFeedItem}
        keyExtractor={keyExtractor}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefreshWithBadges} colors={['#4CAF50']} tintColor={isDark ? '#F5F5F5' : '#4CAF50'} />}
        contentContainerStyle={styles.listContent}
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.3}
        ListFooterComponent={renderFooter}
        ListEmptyComponent={renderEmpty}
        initialNumToRender={5}
        maxToRenderPerBatch={10}
        windowSize={7}
        removeClippedSubviews
        getItemLayout={getItemLayout}
        maintainVisibleContentPosition={{ minIndexForVisible: 0 }}
      />

      {/* MENU DU BAS AVEC BADGES MOCKÉS */}
      <View style={[styles.enhancedBottomNav, { backgroundColor: isDark ? '#1A1A1A' : '#FFFFFF', borderTopColor: isDark ? '#2E2E2E' : '#E8E8EC' }]}>
        {[
          { screen: 'Home', icon: 'home', label: 'Tendances', badgeKey: 'home' as const, badgeColor: '#4CAF50' },
          { screen: 'Discover', icon: 'compass', label: 'Découvrir', badgeKey: 'discover' as const, badgeColor: '#42A5F5' },
          { screen: 'Sell', icon: 'plus', label: 'Vendre', badgeKey: 'sell' as const, badgeColor: '#FF9800' },
          { screen: 'Messages', icon: 'shopping-cart', label: 'Panier', badgeKey: 'cart' as const, badgeColor: '#FF3B30' },
          { screen: 'Profile', icon: 'user', label: 'Profil', badgeKey: 'profile' as const, badgeColor: '#9C27B0' },
        ].map((item, index) => (
          <TouchableOpacity key={item.screen} style={styles.navButton} onPress={() => handleTabPress(item.screen, index)}>
            <View style={styles.navIconContainer}>
              <FontAwesome
                name={item.icon as any}
                size={24}
                color={activeTab === index ? '#4CAF50' : isDark ? '#B0B0B0' : '#6C6C80'}
              />
              <NotificationBadge count={badgeCounts[item.badgeKey]} small color={item.badgeColor} />
            </View>
            <Text style={[styles.navLabel, { color: isDark ? '#B0B0B0' : '#6C6C80' }, activeTab === index && styles.activeNavLabel]}>
              {item.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </SafeAreaView>
  );
};

// ============================================
// STYLES
// ============================================

const styles = StyleSheet.create({
  container: { flex: 1 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: 10, fontSize: 16 },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20, marginTop: 50 },
  emptyText: { fontSize: 18, marginTop: 20, marginBottom: 20, textAlign: 'center' },
  retryButton: { backgroundColor: '#4CAF50', paddingVertical: 12, paddingHorizontal: 25, borderRadius: 8 },
  retryButtonText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
  footerLoader: { padding: 20, justifyContent: 'center', alignItems: 'center' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 15, borderBottomWidth: 1 },
  logo: { fontSize: 24, fontWeight: 'bold' },
  headerIcons: { flexDirection: 'row', alignItems: 'center', gap: 20 },
  iconContainer: { position: 'relative' },
  categoriesWrapper: { paddingVertical: 10, borderBottomWidth: 1 },
  categoriesContainer: { paddingHorizontal: 15 },
  categoryPill: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, marginRight: 8 },
  categoryText: { fontWeight: '600', fontSize: 13 },
  listContent: { paddingBottom: 80 },
  fullWidthCard: { marginBottom: 8, borderBottomWidth: 1 },
  fullWidthImageContainer: { width: '100%', height: width, backgroundColor: '#eee', position: 'relative' },
  fullWidthImage: { width: '100%', height: '100%', position: 'absolute', top: 0, left: 0 },
  productHeader: { flexDirection: 'row', alignItems: 'center', padding: 12 },
  avatar: { width: 40, height: 40, borderRadius: 20, marginRight: 10, backgroundColor: '#eee' },
  sellerInfo: { flex: 1 },
  sellerNameRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 6 },
  sellerName: { fontWeight: 'bold', fontSize: 15 },
  productLocation: { fontSize: 12, marginTop: 2 },
  sponsoredBadge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 14, gap: 4 },
  sponsoredText: { fontSize: 11, fontWeight: '600' },
  imageSponsoredBadge: { position: 'absolute', top: 12, right: 12, backgroundColor: 'rgba(0,0,0,0.7)', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20, zIndex: 10 },
  imageSponsoredText: { color: '#FFD700', fontWeight: 'bold', fontSize: 12 },
  priceContainer: { position: 'absolute', bottom: 10, left: 10, backgroundColor: 'rgba(0,0,0,0.7)', paddingHorizontal: 15, paddingVertical: 8, borderRadius: 8, flexDirection: 'row', alignItems: 'center' },
  originalPrice: { color: '#aaa', textDecorationLine: 'line-through', fontSize: 14, marginRight: 8 },
  discountedPrice: { color: '#FFD700', fontWeight: 'bold', fontSize: 18 },
  normalPrice: { color: '#fff', fontWeight: 'bold', fontSize: 18 },
  discountText: { color: '#FFD700', fontSize: 12, marginLeft: 5 },
  discountBadge: { backgroundColor: '#4CAF50', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, marginLeft: 8 },
  discountBadgeText: { color: '#fff', fontSize: 11, fontWeight: 'bold' },
  promotionBadge: { position: 'absolute', top: 10, left: 10, backgroundColor: 'rgba(255, 87, 34, 0.9)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, flexDirection: 'row', alignItems: 'center' },
  promotionBadgeText: { color: '#fff', fontWeight: 'bold', fontSize: 12 },
  timerText: { color: '#FFD700', fontWeight: 'bold', fontSize: 10, marginLeft: 5 },
  productInfo: { paddingHorizontal: 12, paddingVertical: 10 },
  productTitle: { fontSize: 17, fontWeight: 'bold' },
  productDescription: { marginTop: 4, fontSize: 14, lineHeight: 20 },
  ratingContainer: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, marginBottom: 10 },
  starsContainer: { flexDirection: 'row', marginRight: 5 },
  socialCount: { fontSize: 13 },
  actionButtons: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 12, borderTopWidth: 1 },
  socialActions: { flexDirection: 'row', alignItems: 'center', gap: 20 },
  socialButton: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  cartButton: { backgroundColor: '#4CAF50', borderRadius: 8, paddingHorizontal: 20, paddingVertical: 10, elevation: 2 },
  promotionCartButton: { backgroundColor: '#FF5722' },
  cartButtonText: { color: '#fff', fontWeight: 'bold', fontSize: 14 },
  horizontalRowContainer: { paddingVertical: 10, borderBottomWidth: 1 },
  horizontalListContent: { paddingHorizontal: 12 },
  miniCard: { width: 120, marginRight: 10, borderRadius: 8, elevation: 1, overflow: 'hidden' },
  miniImageContainer: { width: 120, height: 120, backgroundColor: '#eee', position: 'relative' },
  miniImage: { width: 120, height: 120, position: 'absolute', top: 0, left: 0 },
  miniTitle: { fontSize: 13, fontWeight: '500', paddingHorizontal: 5, marginTop: 5 },
  miniPrice: { fontSize: 12, fontWeight: 'bold', paddingHorizontal: 5, paddingBottom: 5 },
  miniSeller: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 5, paddingBottom: 5, marginTop: 4 },
  miniSellerAvatar: { width: 16, height: 16, borderRadius: 8, marginRight: 4 },
  miniSellerName: { fontSize: 10, flex: 1 },
  gridContainer: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', paddingHorizontal: 12, paddingVertical: 10, borderBottomWidth: 1 },
  gridCard: { width: (width - 36) / 2, marginBottom: 12, borderRadius: 8, elevation: 1, overflow: 'hidden' },
  gridImageContainer: { width: '100%', height: (width - 36) / 2, backgroundColor: '#eee', position: 'relative' },
  gridImage: { width: '100%', height: '100%', position: 'absolute', top: 0, left: 0 },
  gridTitle: { fontSize: 14, fontWeight: '500', paddingHorizontal: 8, marginTop: 5 },
  gridPriceRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, marginTop: 3 },
  gridOriginalPrice: { fontSize: 12, color: '#aaa', textDecorationLine: 'line-through', marginRight: 6 },
  gridPrice: { fontSize: 14, fontWeight: 'bold' },
  gridDiscount: { fontSize: 12, marginLeft: 6 },
  gridSellerRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, paddingBottom: 8, marginTop: 4 },
  gridSellerAvatar: { width: 16, height: 16, borderRadius: 8, marginRight: 4, backgroundColor: '#eee' },
  gridSellerName: { fontSize: 11, flex: 1 },
  internalPromoCard: { marginBottom: 8, borderBottomWidth: 1 },
  internalPromoImageContainer: { width: '100%', height: 200, backgroundColor: '#4CAF50', position: 'relative' },
  internalPromoImage: { width: '100%', height: '100%', position: 'absolute', top: 0, left: 0 },
  internalPromoContent: { padding: 15 },
  internalPromoTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 5 },
  internalPromoDescription: { fontSize: 14, lineHeight: 20 },
  imagePlaceholder: { justifyContent: 'center', alignItems: 'center' },
  rotatingText: { fontSize: 13, fontWeight: '500', marginVertical: 4, marginHorizontal: 12 },
  badgesContainer: { position: 'absolute', top: 8, left: 8, flexDirection: 'row', flexWrap: 'wrap', gap: 6, zIndex: 10 },
  productBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 12, overflow: 'hidden' },
  badgePromo: { backgroundColor: '#FF4444' },
  badgeTrending: { backgroundColor: '#FF9800' },
  badgeBoost: { backgroundColor: '#2196F3' },
  badgeForYou: { backgroundColor: '#4CAF50' },
  productBadgeText: { color: '#fff', fontSize: 10, fontWeight: 'bold' },
  notifBadge: { position: 'absolute', top: -6, right: -8, borderRadius: 10, justifyContent: 'center', alignItems: 'center', borderWidth: 1.5, borderColor: '#fff', minWidth: 18, height: 18, zIndex: 100 },
  smallNotifBadge: { minWidth: 15, height: 15, top: -5, right: -7, borderRadius: 8 },
  regularNotifBadge: { minWidth: 20, height: 20, top: -8, right: -10, borderRadius: 10 },
  largeCountNotifBadge: { minWidth: 26, paddingHorizontal: 4 },
  notifBadgeText: { color: '#fff', fontWeight: 'bold', textAlign: 'center' },
  smallNotifBadgeText: { fontSize: 9 },
  regularNotifBadgeText: { fontSize: 11 },
  enhancedBottomNav: { flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center', borderTopWidth: 1, paddingVertical: 12, paddingHorizontal: 5, position: 'absolute', bottom: 0, left: 0, right: 0 },
  navButton: { alignItems: 'center', flex: 1, position: 'relative' },
  navIconContainer: { position: 'relative' },
  navLabel: { fontSize: 12, marginTop: 4 },
  activeNavLabel: { color: '#4CAF50', fontWeight: 'bold' },
});

export default ShopApp;