

import React, { useEffect, useState, useRef, useCallback } from 'react';
import {
  View,
  Text,
  Image,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  FlatList,
  Dimensions,
  Animated,
  Modal,
  SafeAreaView,
  StatusBar,
  AppState,
  AppStateStatus,
  RefreshControl
} from 'react-native';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from "../../../../app/theme/ThemeContext";

const { width } = Dimensions.get('window');
const LOCAL_API = 'https://shopnet-backend.onrender.com/api';

// Hook pour les couleurs dynamiques
const useDynamicColors = () => {
  const { isDark } = useTheme();

  return {
    background: isDark ? '#0D0D0D' : '#F5F7FA',
    surface: isDark ? '#1A1A1A' : '#FFFFFF',
    primary: '#42A5F5',
    primaryDark: '#1976D2',
    secondary: isDark ? '#B0B0B0' : '#6C757D',
    success: '#4CAF50',
    danger: '#FF6B6B',
    warning: '#FFC107',
    premium: '#FFD700',
    text: isDark ? '#F5F5F5' : '#2C3E50',
    textSecondary: isDark ? '#B0B0B0' : '#7F8C8D',
    textLight: isDark ? '#666666' : '#95A5A6',
    border: isDark ? '#2E2E2E' : '#E9ECEF',
    divider: isDark ? '#2E2E2E' : '#EDF2F7',
    new: '#9C27B0',
    statusBar: isDark ? '#0D0D0D' : '#FFFFFF',
    barStyle: isDark ? 'light-content' as const : 'dark-content' as const,
    headerBg: isDark ? '#1A1A1A' : '#FFFFFF',
    headerBorder: isDark ? '#2E2E2E' : '#E9ECEF',
    cardBg: isDark ? '#1A1A1A' : '#FFFFFF',
    placeholderBg: isDark ? '#222222' : '#F5F7FA',
    iconButtonBg: isDark ? '#222222' : '#F5F7FA',
    modalBg: isDark ? '#1A1A1A' : '#FFFFFF',
    modalOverlay: 'rgba(0,0,0,0.5)',
    floatingBg: '#42A5F5',
    threeDotsBg: isDark ? '#222222' : '#F5F7FA',
    threeDotsBorder: isDark ? '#2E2E2E' : '#E9ECEF',
  };
};

type Product = {
  id: number;
  title: string;
  price: number;
  original_price?: number;
  images: string[];
  category: string;
  likes_count: number;
  comments_count: number;
  shares_count: number;
  is_promotion?: boolean;
  promo_price?: number;
  duration_days?: number;
  created_at?: string;
  time_remaining?: string;
  is_new?: boolean;
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
  images: string[];
  time_remaining?: string;
  is_new?: boolean;
};

type CacheData = {
  products: (Product | Promotion)[];
  page: number;
  hasMore: boolean;
  viewedProducts: number[];
  timestamp: number;
};

const CACHE_KEY = 'discover_cache';
const CACHE_DURATION = 10 * 60 * 1000;
const VIEWED_PRODUCTS_KEY = 'viewed_products';

const saveToCache = async (products: (Product | Promotion)[], page: number, hasMore: boolean, viewedProducts: number[]) => {
  try {
    const cacheData: CacheData = {
      products: products || [],
      page: page || 1,
      hasMore: hasMore || false,
      viewedProducts: viewedProducts || [],
      timestamp: Date.now(),
    };
    await AsyncStorage.setItem(CACHE_KEY, JSON.stringify(cacheData));
  } catch (error) {
    console.error('❌ Erreur sauvegarde cache:', error);
  }
};

const loadFromCache = async (): Promise<CacheData | null> => {
  try {
    const cached = await AsyncStorage.getItem(CACHE_KEY);
    if (!cached) return null;
    const data: CacheData = JSON.parse(cached);
    const now = Date.now();
    if (now - data.timestamp > CACHE_DURATION) {
      console.log('📦 Cache expiré (10 minutes)');
      return null;
    }
    return data;
  } catch (error) {
    console.error('❌ Erreur chargement cache:', error);
    return null;
  }
};

const loadViewedProducts = async (): Promise<number[]> => {
  try {
    const viewed = await AsyncStorage.getItem(VIEWED_PRODUCTS_KEY);
    return viewed ? JSON.parse(viewed) : [];
  } catch (error) {
    console.error('❌ Erreur chargement historique:', error);
    return [];
  }
};

const saveViewedProduct = async (productId: number) => {
  try {
    const viewed = await loadViewedProducts();
    if (!viewed.includes(productId)) {
      const updated = [productId, ...viewed].slice(0, 50);
      await AsyncStorage.setItem(VIEWED_PRODUCTS_KEY, JSON.stringify(updated));
    }
  } catch (error) {
    console.error('❌ Erreur sauvegarde historique:', error);
  }
};

const sendPresence = async () => {
  try {
    const userId = await AsyncStorage.getItem('userId');
    if (!userId) return;
    await axios.post(`${LOCAL_API}/admin/dashboard/update-activity`, { userId });
  } catch (error: any) {
    console.error('Erreur lors de l\'envoi de présence:', error.message);
  }
};

const DiscoverScreen = () => {
  const router = useRouter();
  const COLORS = useDynamicColors();
  const { isDark } = useTheme();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [products, setProducts] = useState<(Product | Promotion)[]>([]);
  const [trendingProducts, setTrendingProducts] = useState<(Product | Promotion)[]>([]);
  const [promoProducts, setPromoProducts] = useState<(Product | Promotion)[]>([]);
  const [doubleProducts, setDoubleProducts] = useState<(Product | Promotion)[]>([]);
  const [recommendedProducts, setRecommendedProducts] = useState<(Product | Promotion)[]>([]);
  const [viewedProducts, setViewedProducts] = useState<number[]>([]);
  const [token, setToken] = useState<string | null>(null);
  const [selectedProduct, setSelectedProduct] = useState<any>(null);
  const [actionModalVisible, setActionModalVisible] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [totalPages, setTotalPages] = useState(1);
  const [isShuffled, setIsShuffled] = useState(false);
  const [columns, setColumns] = useState(2);
  const [flatListKey, setFlatListKey] = useState('2-columns');

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;
  const presenceIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const isMountedRef = useRef(true);
  const flatListRef = useRef<FlatList>(null);

  useEffect(() => {
    isMountedRef.current = true;
    initializeScreen();
    const appStateSubscription = AppState.addEventListener('change', handleAppStateChange);
    return () => {
      isMountedRef.current = false;
      cleanupPresenceSystem();
      appStateSubscription.remove();
    };
  }, []);

  const initializeScreen = async () => {
    startEntranceAnimation();
    const viewed = await loadViewedProducts();
    setViewedProducts(viewed || []);
    await loadToken();
    setupPresenceSystem();
  };

  const isProductNew = (createdAt?: string): boolean => {
    if (!createdAt) return false;
    try {
      const createdDate = new Date(createdAt);
      const now = new Date();
      const diffDays = Math.floor((now.getTime() - createdDate.getTime()) / (1000 * 60 * 60 * 24));
      return diffDays <= 7;
    } catch (error) {
      return false;
    }
  };

  const organizeProductsBySections = (allProducts: (Product | Promotion)[]) => {
    if (!allProducts || !Array.isArray(allProducts) || allProducts.length === 0) return;

    const productsWithNew = allProducts.map(product => ({
      ...product,
      is_new: isProductNew(product.created_at)
    }));

    const trending = [...productsWithNew].sort(() => Math.random() - 0.5).slice(0, 15);
    setTrendingProducts(trending || []);

    const promos = (productsWithNew || [])
      .filter(p => {
        if ('promotionId' in p) {
          const promoPrice = (p as Promotion).promo_price;
          return promoPrice && promoPrice > 0;
        }
        return false;
      })
      .slice(0, 10);
    setPromoProducts(promos.length > 0 ? promos : (productsWithNew || []).slice(0, 10));

    const doubles = (productsWithNew || []).slice(0, 8);
    setDoubleProducts(doubles || []);

    if (viewedProducts && viewedProducts.length > 0) {
      const recommended = (productsWithNew || [])
        .filter(p => !viewedProducts.includes(getProductId(p)))
        .sort(() => Math.random() - 0.5)
        .slice(0, 10);
      setRecommendedProducts(recommended || []);
    } else {
      const random = (productsWithNew || []).sort(() => Math.random() - 0.5).slice(0, 10);
      setRecommendedProducts(random || []);
    }
  };

  const setupPresenceSystem = async () => {
    try {
      await sendPresence();
      presenceIntervalRef.current = setInterval(async () => {
        if (isMountedRef.current) await sendPresence();
      }, 300000);
    } catch (error) {
      console.error('Erreur lors de l\'initialisation du système de présence:', error);
    }
  };

  const cleanupPresenceSystem = () => {
    if (presenceIntervalRef.current) {
      clearInterval(presenceIntervalRef.current);
      presenceIntervalRef.current = null;
    }
  };

  const handleAppStateChange = async (nextAppState: AppStateStatus) => {
    if (nextAppState === 'active') {
      await sendPresence();
      if (!presenceIntervalRef.current && isMountedRef.current) setupPresenceSystem();
    } else if (nextAppState === 'background' || nextAppState === 'inactive') {
      cleanupPresenceSystem();
    }
  };

  const startEntranceAnimation = () => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 600, useNativeDriver: true }),
    ]).start();
  };

  const loadToken = async () => {
    try {
      const storedToken = await AsyncStorage.getItem('userToken');
      const cachedData = await loadFromCache();
      if (cachedData && cachedData.products) {
        setProducts(cachedData.products || []);
        setPage(cachedData.page || 1);
        setHasMore(cachedData.hasMore || false);
        setViewedProducts(cachedData.viewedProducts || []);
        organizeProductsBySections(cachedData.products || []);
        setLoading(false);
      }
      if (storedToken) {
        setToken(storedToken);
        await fetchMixedProducts(storedToken, 1, true);
      } else {
        setLoading(false);
      }
    } catch (err) {
      console.error('Erreur chargement token:', err);
      setLoading(false);
    }
  };

  const fetchMixedProducts = async (jwtToken: string, pageNum = 1, reset = false) => {
    try {
      if (reset) setLoading(true);
      else setLoadingMore(true);

      const limit = 8;
      const regularResponse = await axios.get(`${LOCAL_API}/all-products`, {
        headers: { Authorization: `Bearer ${jwtToken}` },
        params: { page: pageNum, limit, sort: 'newest' },
      });
      const promotionResponse = await axios.get(`${LOCAL_API}/promotions`, {
        headers: { Authorization: `Bearer ${jwtToken}` },
      });

      let regularProducts: Product[] = [];
      let promotionProducts: Promotion[] = [];

      if (regularResponse.data && regularResponse.data.success) {
        regularProducts = regularResponse.data.products || [];
        setTotalPages(regularResponse.data.totalPages || 1);
      }
      if (promotionResponse.data && promotionResponse.data.success) {
        promotionProducts = (promotionResponse.data.promotions || []).map((promo: Promotion) => ({
          ...promo,
          time_remaining: calculateTimeRemaining(promo.created_at, promo.duration_days)
        }));
      }

      const allProducts = [...(regularProducts || []), ...(promotionProducts || [])].sort(() => Math.random() - 0.5);

      if (reset) {
        setProducts(allProducts || []);
        organizeProductsBySections(allProducts || []);
        setPage(pageNum);
        setHasMore((regularProducts || []).length === limit);
        await saveToCache(allProducts || [], pageNum, (regularProducts || []).length === limit, viewedProducts || []);
      } else {
        const updatedProducts = [...(products || []), ...(allProducts || [])];
        setProducts(updatedProducts);
        organizeProductsBySections(updatedProducts);
        setPage(pageNum);
        setHasMore((regularProducts || []).length === limit);
        await saveToCache(updatedProducts, pageNum, (regularProducts || []).length === limit, viewedProducts || []);
      }
    } catch (err: any) {
      console.error('❌ Erreur API produits:', err.message);
    } finally {
      setLoading(false);
      setLoadingMore(false);
      setRefreshing(false);
    }
  };

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    setPage(1);
    setHasMore(true);
    if (token) fetchMixedProducts(token, 1, true);
  }, [token]);

  const loadMoreProducts = () => {
    if (!loadingMore && hasMore && token) {
      fetchMixedProducts(token, page + 1, false);
    }
  };

  const calculateTimeRemaining = (createdAt: string, durationDays: number): string => {
    if (!createdAt || !durationDays) return '';
    try {
      const createdDate = new Date(createdAt);
      const endDate = new Date(createdDate.getTime() + durationDays * 24 * 60 * 60 * 1000);
      const now = new Date();
      const diffMs = endDate.getTime() - now.getTime();
      if (diffMs <= 0) return 'Expirée';
      const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      return days > 0 ? `${days}j` : `${hours}h`;
    } catch (error) {
      return '';
    }
  };

  useEffect(() => {
    const interval = setInterval(() => {
      setProducts(prev =>
        (prev || []).map(item =>
          'duration_days' in item && item.created_at
            ? { ...item, time_remaining: calculateTimeRemaining(item.created_at, item.duration_days) }
            : item
        )
      );
    }, 60000);
    return () => clearInterval(interval);
  }, []);

  const showActionModal = (product: any) => {
    setSelectedProduct(product);
    setActionModalVisible(true);
  };

  const hideActionModal = () => {
    setActionModalVisible(false);
    setSelectedProduct(null);
  };

  const handleProductPress = async (product: any) => {
    if (!product) return;
    const productId = getProductId(product);
    await saveViewedProduct(productId);
    const path = isPromotion(product) ? '/(tabs)/Auth/Panier/PromoDetail' : '/(tabs)/Auth/Panier/DetailId';
    router.push({ pathname: path, params: { id: productId.toString() } });
  };

  const calculateDiscount = (original: number, promo: number) => {
    if (!original || !promo || original <= 0) return 0;
    return Math.round(((original - promo) / original) * 100);
  };

  const getProductId = (item: Product | Promotion): number => {
    if (!item) return 0;
    return 'product_id' in item ? item.product_id || 0 : item.id || 0;
  };

  const getProductTitle = (item: Product | Promotion): string => {
    if (!item) return 'Produit sans titre';
    return 'product_title' in item ? item.product_title || 'Produit' : item.title || 'Produit';
  };

  const getProductPrice = (item: Product | Promotion): number => {
    if (!item) return 0;
    const price = 'promo_price' in item ? item.promo_price : item.price;
    return typeof price === 'number' && !isNaN(price) && price > 0 ? price : 0;
  };

  const getProductImages = (item: Product | Promotion): string[] => {
    if (!item) return [];
    if ('images' in item) {
      if (Array.isArray(item.images)) return item.images;
      else if (typeof item.images === 'string') {
        try {
          const parsed = JSON.parse(item.images);
          return Array.isArray(parsed) ? parsed : [item.images];
        } catch {
          return [item.images];
        }
      }
    }
    return [];
  };

  const isPromotion = (item: Product | Promotion): boolean => {
    if (!item) return false;
    return 'promotionId' in item;
  };

  const shuffleArray = (array: any[]) => {
    if (!array || !Array.isArray(array)) return [];
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  };

  const toggleShuffle = () => {
    if (isShuffled) {
      // Retour à l'ordre original
      onRefresh();
    } else {
      setProducts(shuffleArray([...(products || [])]));
    }
    setIsShuffled(!isShuffled);
  };

  const toggleColumns = () => {
    const newColumns = columns === 2 ? 3 : 2;
    setColumns(newColumns);
    setFlatListKey(`${newColumns}-columns-${Date.now()}`);
  };

  const scrollToTop = () => {
    flatListRef.current?.scrollToOffset({ offset: 0, animated: true });
  };

  // Render pour les produits horizontaux
  const renderHorizontalProduct = ({ item }: { item: Product | Promotion }) => {
    if (!item) return null;
    const productTitle = getProductTitle(item);
    const productPrice = getProductPrice(item);
    const images = getProductImages(item);
    const isPromo = isPromotion(item);
    const promotionItem = item as Promotion;
    const discount = isPromo ? calculateDiscount(Number(promotionItem.original_price), Number(promotionItem.promo_price)) : 0;
    const imageUrl = images && images.length > 0 ? images[0] : null;
    const isNew = item.is_new;

    return (
      <TouchableOpacity
        style={[styles.horizontalProductCard, { backgroundColor: COLORS.cardBg, borderColor: COLORS.border }]}
        onPress={() => handleProductPress(item)}
        activeOpacity={0.9}
      >
        <View style={[styles.horizontalImageContainer, { backgroundColor: COLORS.placeholderBg }]}>
          {imageUrl ? (
            <Image source={{ uri: imageUrl }} style={styles.horizontalProductImage} resizeMode="cover" />
          ) : (
            <View style={[styles.horizontalImagePlaceholder, { backgroundColor: COLORS.placeholderBg }]}>
              <Ionicons name="cube-outline" size={24} color={COLORS.textLight} />
            </View>
          )}
          <View style={styles.horizontalBadgeContainer}>
            {isNew && (
              <View style={styles.newBadge}>
                <Text style={styles.newBadgeText}>NOUVEAU</Text>
              </View>
            )}
            {isPromo && discount > 0 && (
              <View style={styles.horizontalPromoBadge}>
                <Text style={styles.horizontalPromoText}>-{discount}%</Text>
              </View>
            )}
          </View>
        </View>
        <View style={styles.horizontalProductContent}>
          <Text style={[styles.horizontalProductTitle, { color: COLORS.text }]} numberOfLines={2}>
            {productTitle}
          </Text>
          <Text style={[styles.horizontalProductPrice, { color: COLORS.primary }]}>
            ${typeof productPrice === 'number' && productPrice > 0 ? productPrice.toFixed(2) : '0.00'}
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  // Render pour les produits doubles
  const renderDoubleProduct = ({ item }: { item: Product | Promotion }) => {
    if (!item) return null;
    const productTitle = getProductTitle(item);
    const productPrice = getProductPrice(item);
    const images = getProductImages(item);
    const isPromo = isPromotion(item);
    const promotionItem = item as Promotion;
    const discount = isPromo ? calculateDiscount(Number(promotionItem.original_price), Number(promotionItem.promo_price)) : 0;
    const imageUrl = images && images.length > 0 ? images[0] : null;
    const isNew = item.is_new;

    return (
      <TouchableOpacity
        style={[styles.doubleProductCard, { backgroundColor: COLORS.cardBg, borderColor: COLORS.border }]}
        onPress={() => handleProductPress(item)}
        activeOpacity={0.9}
      >
        <View style={[styles.doubleImageContainer, { backgroundColor: COLORS.placeholderBg }]}>
          {imageUrl ? (
            <Image source={{ uri: imageUrl }} style={styles.doubleProductImage} resizeMode="cover" />
          ) : (
            <View style={[styles.doubleImagePlaceholder, { backgroundColor: COLORS.placeholderBg }]}>
              <Ionicons name="cube-outline" size={30} color={COLORS.textLight} />
            </View>
          )}
          <View style={styles.doubleBadgeContainer}>
            {isNew && (
              <View style={styles.newBadge}>
                <Text style={styles.newBadgeText}>NOUVEAU</Text>
              </View>
            )}
            {isPromo && discount > 0 && (
              <View style={styles.doublePromoBadge}>
                <Text style={styles.doublePromoText}>-{discount}%</Text>
              </View>
            )}
          </View>
        </View>
        <View style={styles.doubleProductContent}>
          <Text style={[styles.doubleProductTitle, { color: COLORS.text }]} numberOfLines={2}>
            {productTitle}
          </Text>
          <Text style={[styles.doubleProductPrice, { color: COLORS.primary }]}>
            ${typeof productPrice === 'number' && productPrice > 0 ? productPrice.toFixed(2) : '0.00'}
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  const renderProductItem = ({ item, index }: { item: Product | Promotion; index: number }) => {
    if (!item) return null;
    const productTitle = getProductTitle(item);
    const productPrice = getProductPrice(item);
    const images = getProductImages(item);
    const isPromo = isPromotion(item);
    const promotionItem = item as Promotion;
    const discount = isPromo ? calculateDiscount(Number(promotionItem.original_price), Number(promotionItem.promo_price)) : 0;
    const isExpired = isPromo && promotionItem.time_remaining === 'Expirée';
    const imageUrl = images && images.length > 0 ? images[0] : null;
    const isNew = item.is_new;

    const cardWidth = columns === 2 ? (width - 36) / 2 : (width - 48) / 3;

    return (
      <Animated.View
        style={[
          styles.productCard,
          {
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }],
            width: cardWidth,
            backgroundColor: COLORS.cardBg,
            borderColor: COLORS.border,
          }
        ]}
      >
        <TouchableOpacity onPress={() => handleProductPress(item)} activeOpacity={0.9}>
          <View style={styles.imageContainer}>
            {imageUrl ? (
              <Image source={{ uri: imageUrl }} style={[styles.productImage, { backgroundColor: COLORS.placeholderBg }]} resizeMode="cover" />
            ) : (
              <View style={[styles.imagePlaceholder, { backgroundColor: COLORS.placeholderBg }]}>
                <Ionicons name="cube-outline" size={40} color={COLORS.textLight} />
              </View>
            )}
            <View style={styles.imageHeader}>
              <View style={styles.leftBadges}>
                {isNew && (
                  <View style={styles.newBadge}>
                    <Ionicons name="new" size={12} color="#FFFFFF" />
                    <Text style={styles.newBadgeText}>NOUVEAU</Text>
                  </View>
                )}
                {isPromo && (
                  <View style={styles.promotionBadge}>
                    <Ionicons name="flash" size={12} color="#FFFFFF" />
                    <Text style={styles.promotionBadgeText}>PROMO</Text>
                  </View>
                )}
                <View style={[styles.categoryBadge, { backgroundColor: COLORS.primary + '20' }]}>
                  <Text style={[styles.categoryBadgeText, { color: COLORS.primary }]}>
                    {'category' in item ? item.category || 'Catégorie' : 'Promotion'}
                  </Text>
                </View>
              </View>
              <View style={styles.rightActions}>
                {isPromo && promotionItem.time_remaining && (
                  <View style={[styles.timeBadge, isExpired ? styles.timeBadgeExpired : styles.timeBadgeActive]}>
                    <Ionicons name={isExpired ? "time-outline" : "timer-outline"} size={10} color="#FFFFFF" />
                    <Text style={styles.timeBadgeText}>{promotionItem.time_remaining}</Text>
                  </View>
                )}
                <TouchableOpacity
                  style={[styles.threeDotsButton, { backgroundColor: COLORS.threeDotsBg, borderColor: COLORS.threeDotsBorder }]}
                  onPress={(e) => { e.stopPropagation(); showActionModal(item); }}
                >
                  <Ionicons name="ellipsis-horizontal" size={16} color={COLORS.text} />
                </TouchableOpacity>
              </View>
            </View>
          </View>
          <View style={styles.cardContent}>
            <Text style={[styles.productTitle, { color: COLORS.text }]} numberOfLines={2}>{productTitle}</Text>
            <View style={styles.priceRow}>
              {isPromo ? (
                <View style={styles.promotionPriceContainer}>
                  <Text style={[styles.originalPrice, { color: COLORS.textLight }]}>
                    ${Number(promotionItem.original_price || 0).toFixed(2)}
                  </Text>
                  <Text style={[styles.promoPrice, { color: COLORS.danger }]}>
                    ${typeof productPrice === 'number' && productPrice > 0 ? productPrice.toFixed(2) : '0.00'}
                  </Text>
                  {discount > 0 && (
                    <View style={styles.discountBadge}>
                      <Text style={styles.discountText}>-{discount}%</Text>
                    </View>
                  )}
                </View>
              ) : (
                <Text style={[styles.regularPrice, { color: COLORS.primary }]}>
                  ${typeof productPrice === 'number' && productPrice > 0 ? productPrice.toFixed(2) : '0.00'}
                </Text>
              )}
            </View>
            {isPromo && promotionItem.description && (
              <Text style={[styles.promotionDescription, { color: COLORS.textSecondary }]} numberOfLines={2}>
                {promotionItem.description}
              </Text>
            )}
          </View>
        </TouchableOpacity>
      </Animated.View>
    );
  };

  const renderActionModal = () => (
    <Modal visible={actionModalVisible} transparent animationType="fade" onRequestClose={hideActionModal}>
      <TouchableOpacity style={[styles.modalOverlay, { backgroundColor: COLORS.modalOverlay }]} activeOpacity={1} onPress={hideActionModal}>
        <View style={[styles.actionModal, { backgroundColor: COLORS.modalBg }]}>
          {selectedProduct && (
            <>
              <View style={[styles.modalHeader, { borderBottomColor: COLORS.border }]}>
                <Text style={[styles.modalTitle, { color: COLORS.text }]}>Options Produit</Text>
                <Text style={[styles.modalSubtitle, { color: COLORS.textSecondary }]} numberOfLines={1}>
                  {getProductTitle(selectedProduct)}
                </Text>
              </View>
              <View style={styles.modalActions}>
                <TouchableOpacity
                  style={styles.modalAction}
                  onPress={() => { hideActionModal(); handleProductPress(selectedProduct); }}
                >
                  <Ionicons name="eye-outline" size={24} color={COLORS.primary} />
                  <Text style={[styles.modalActionText, { color: COLORS.text }]}>Voir les détails</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.modalAction}>
                  <Ionicons name="chatbubble-ellipses-outline" size={24} color={COLORS.primary} />
                  <Text style={[styles.modalActionText, { color: COLORS.text }]}>Contacter le vendeur</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.modalAction, { borderTopColor: COLORS.border }, styles.reportAction]} onPress={hideActionModal}>
                  <Ionicons name="share-outline" size={24} color={COLORS.primary} />
                  <Text style={[styles.modalActionText, { color: COLORS.text }]}>Partager</Text>
                </TouchableOpacity>
              </View>
              <TouchableOpacity style={[styles.modalCancel, { borderTopColor: COLORS.border }]} onPress={hideActionModal}>
                <Text style={[styles.modalCancelText, { color: COLORS.primary }]}>Annuler</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      </TouchableOpacity>
    </Modal>
  );

  const renderFooter = () => {
    if (loadingMore) {
      return (
        <View style={styles.footerLoader}>
          <ActivityIndicator size="small" color={COLORS.primary} />
          <Text style={[styles.footerText, { color: COLORS.primary }]}>Chargement des produits...</Text>
        </View>
      );
    }
    return null;
  };

  const renderFixedHeader = () => (
    <View style={[styles.fixedHeader, { backgroundColor: COLORS.headerBg, borderBottomColor: COLORS.headerBorder }]}>
      <View style={[styles.header, { backgroundColor: COLORS.headerBg }]}>
        <View style={styles.headerLeft}>
          <Ionicons name="cube-outline" size={28} color={COLORS.primary} />
          <Text style={[styles.headerTitle, { color: COLORS.text }]}>Découvrir</Text>
        </View>
        <View style={styles.headerRight}>
          <TouchableOpacity
            style={[styles.iconButton, { backgroundColor: COLORS.iconButtonBg }, isShuffled && styles.iconButtonActive]}
            onPress={toggleShuffle}
          >
            <Ionicons
              name={isShuffled ? "shuffle" : "shuffle-outline"}
              size={22}
              color={isShuffled ? COLORS.warning : COLORS.primary}
            />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.iconButton, { backgroundColor: COLORS.iconButtonBg }, columns === 3 && styles.iconButtonActive]}
            onPress={toggleColumns}
          >
            <Ionicons
              name={columns === 2 ? "grid" : "grid-outline"}
              size={22}
              color={columns === 3 ? COLORS.warning : COLORS.primary}
            />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.iconButton, { backgroundColor: COLORS.iconButtonBg }]}
            onPress={() => router.push('/(tabs)/Auth/Produits/Recherche')}
          >
            <Ionicons name="search-outline" size={22} color={COLORS.primary} />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );

  const renderSections = () => (
    <View>
      {trendingProducts && trendingProducts.length > 0 && (
        <View style={[styles.section, { backgroundColor: COLORS.surface }]}>
          <View style={styles.sectionHeader}>
            <Ionicons name="trending-up" size={18} color={COLORS.primary} />
            <Text style={[styles.sectionTitle, { color: COLORS.text }]}>Tendances du moment</Text>
          </View>
          <FlatList
            data={trendingProducts.slice(0, 15)}
            renderItem={renderHorizontalProduct}
            keyExtractor={(item, index) => `trending-${getProductId(item)}-${index}`}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.horizontalListContent}
          />
        </View>
      )}

      {promoProducts && promoProducts.length > 0 && (
        <View style={[styles.section, { backgroundColor: COLORS.surface }]}>
          <View style={styles.sectionHeader}>
            <Ionicons name="flash" size={18} color={COLORS.danger} />
            <Text style={[styles.sectionTitle, { color: COLORS.text }]}>Promotions exclusives</Text>
          </View>
          <FlatList
            data={promoProducts.slice(0, 10)}
            renderItem={renderHorizontalProduct}
            keyExtractor={(item, index) => `promo-${getProductId(item)}-${index}`}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.horizontalListContent}
          />
        </View>
      )}

      {recommendedProducts && recommendedProducts.length > 0 && (
        <View style={[styles.section, { backgroundColor: COLORS.surface }]}>
          <View style={styles.sectionHeader}>
            <Ionicons name="person" size={18} color={COLORS.success} />
            <Text style={[styles.sectionTitle, { color: COLORS.text }]}>Recommandés pour vous</Text>
          </View>
          <FlatList
            data={recommendedProducts.slice(0, 10)}
            renderItem={renderDoubleProduct}
            keyExtractor={(item, index) => `recommended-${getProductId(item)}-${index}`}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.doubleListContent}
          />
        </View>
      )}

      {doubleProducts && doubleProducts.length > 0 && (
        <View style={[styles.section, { backgroundColor: COLORS.surface }]}>
          <View style={styles.sectionHeader}>
            <Ionicons name="cube" size={18} color={COLORS.primary} />
            <Text style={[styles.sectionTitle, { color: COLORS.text }]}>Meilleures offres</Text>
          </View>
          <FlatList
            data={doubleProducts.slice(0, 8)}
            renderItem={renderDoubleProduct}
            keyExtractor={(item, index) => `double-${getProductId(item)}-${index}`}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.doubleListContent}
          />
        </View>
      )}

      <View style={[styles.gridHeader, { backgroundColor: COLORS.surface, borderTopColor: COLORS.border }]}>
        <Ionicons name="apps" size={18} color={COLORS.primary} />
        <Text style={[styles.gridTitle, { color: COLORS.text }]}>Tous les produits ({(products || []).length})</Text>
      </View>
    </View>
  );

  if (loading && !refreshing && (!products || products.length === 0)) {
    return (
      <SafeAreaView style={[styles.loadingContainer, { backgroundColor: COLORS.surface }]}>
        <StatusBar backgroundColor={COLORS.statusBar} barStyle={COLORS.barStyle} />
        <View style={styles.loadingContent}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={[styles.loadingText, { color: COLORS.primary }]}>Chargement des produits...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: COLORS.background }]}>
      <StatusBar backgroundColor={COLORS.statusBar} barStyle={COLORS.barStyle} />
      {renderFixedHeader()}

      <FlatList
        ref={flatListRef}
        key={flatListKey}
        data={products || []}
        keyExtractor={(item, index) => `product-${getProductId(item)}-${index}-${columns}`}
        renderItem={renderProductItem}
        numColumns={columns}
        columnWrapperStyle={columns > 1 ? styles.columnWrapper : undefined}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        onEndReached={loadMoreProducts}
        onEndReachedThreshold={0.3}
        ListHeaderComponent={renderSections}
        ListFooterComponent={renderFooter}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[COLORS.primary]}
            tintColor={COLORS.primary}
          />
        }
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Ionicons name="cube-outline" size={64} color={COLORS.textLight} />
            <Text style={[styles.emptyStateTitle, { color: COLORS.text }]}>Aucun produit disponible</Text>
            <Text style={[styles.emptyStateText, { color: COLORS.textSecondary }]}>Les produits apparaîtront ici lorsqu'ils seront ajoutés</Text>
          </View>
        }
      />

      {products && products.length > 0 && (
        <TouchableOpacity style={[styles.floatingButton, { backgroundColor: COLORS.floatingBg }]} onPress={scrollToTop}>
          <Ionicons name="arrow-up" size={24} color="#FFFFFF" />
        </TouchableOpacity>
      )}

      {renderActionModal()}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingContent: { alignItems: 'center' },
  loadingText: { fontSize: 16, fontWeight: "600", marginTop: 12 },
  fixedHeader: { borderBottomWidth: 1, zIndex: 1000 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 16 },
  headerLeft: { flexDirection: 'row', alignItems: 'center' },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  headerTitle: { fontSize: 24, fontWeight: '700', marginLeft: 12 },
  iconButton: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center' },
  iconButtonActive: {},
  section: { paddingVertical: 12, marginTop: 8 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, marginBottom: 8, gap: 6 },
  sectionTitle: { fontSize: 16, fontWeight: '600' },
  horizontalListContent: { paddingHorizontal: 12, gap: 8 },
  horizontalProductCard: { width: 120, borderRadius: 8, marginRight: 8, borderWidth: 1, overflow: 'hidden' },
  horizontalImageContainer: { position: 'relative', width: '100%', height: 100 },
  horizontalProductImage: { width: '100%', height: '100%' },
  horizontalImagePlaceholder: { width: '100%', height: '100%', justifyContent: 'center', alignItems: 'center' },
  horizontalBadgeContainer: { position: 'absolute', top: 4, left: 4, flexDirection: 'row', gap: 4 },
  horizontalPromoBadge: { backgroundColor: '#FF6B6B', paddingHorizontal: 4, paddingVertical: 2, borderRadius: 4 },
  horizontalPromoText: { fontSize: 9, fontWeight: '700', color: '#FFFFFF' },
  horizontalProductContent: { padding: 8 },
  horizontalProductTitle: { fontSize: 11, marginBottom: 4, lineHeight: 14 },
  horizontalProductPrice: { fontSize: 12, fontWeight: '700' },
  doubleListContent: { paddingHorizontal: 12, gap: 12 },
  doubleProductCard: { width: width * 0.45, borderRadius: 10, marginRight: 12, borderWidth: 1, overflow: 'hidden' },
  doubleImageContainer: { position: 'relative', width: '100%', height: 150 },
  doubleProductImage: { width: '100%', height: '100%' },
  doubleImagePlaceholder: { width: '100%', height: '100%', justifyContent: 'center', alignItems: 'center' },
  doubleBadgeContainer: { position: 'absolute', top: 8, left: 8, flexDirection: 'row', gap: 4 },
  doublePromoBadge: { backgroundColor: '#FF6B6B', paddingHorizontal: 6, paddingVertical: 3, borderRadius: 4 },
  doublePromoText: { fontSize: 10, fontWeight: '700', color: '#FFFFFF' },
  doubleProductContent: { padding: 10 },
  doubleProductTitle: { fontSize: 13, marginBottom: 6, lineHeight: 16 },
  doubleProductPrice: { fontSize: 14, fontWeight: '700' },
  gridHeader: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, marginTop: 8, borderTopWidth: 1, gap: 6 },
  gridTitle: { fontSize: 16, fontWeight: '600' },
  listContent: { paddingHorizontal: 12, paddingBottom: 20 },
  columnWrapper: { justifyContent: 'space-between', gap: 12 },
  productCard: { borderRadius: 12, overflow: 'hidden', marginBottom: 12, borderWidth: 1 },
  imageContainer: { position: 'relative' },
  productImage: { width: '100%', height: 150 },
  imagePlaceholder: { height: 150, justifyContent: 'center', alignItems: 'center' },
  imageHeader: { position: 'absolute', top: 8, left: 8, right: 8, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', zIndex: 2 },
  leftBadges: { flexDirection: 'column', alignItems: 'flex-start', gap: 4 },
  rightActions: { flexDirection: 'column', alignItems: 'flex-end', gap: 4 },
  newBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#9C27B0', paddingHorizontal: 6, paddingVertical: 3, borderRadius: 4, gap: 2 },
  newBadgeText: { color: '#FFFFFF', fontSize: 8, fontWeight: '800' },
  promotionBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FF6B6B', paddingHorizontal: 6, paddingVertical: 3, borderRadius: 4, gap: 2 },
  promotionBadgeText: { color: '#FFFFFF', fontSize: 9, fontWeight: '800', marginLeft: 2 },
  timeBadge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 6, paddingVertical: 3, borderRadius: 4 },
  timeBadgeActive: { backgroundColor: '#FF6B6B' },
  timeBadgeExpired: { backgroundColor: '#95A5A6' },
  timeBadgeText: { color: '#FFFFFF', fontSize: 9, fontWeight: '700', marginLeft: 2 },
  categoryBadge: { paddingHorizontal: 6, paddingVertical: 3, borderRadius: 4 },
  categoryBadgeText: { fontSize: 10, fontWeight: '600' },
  threeDotsButton: { width: 28, height: 28, borderRadius: 14, justifyContent: 'center', alignItems: 'center', borderWidth: 1 },
  cardContent: { padding: 12 },
  productTitle: { fontSize: 14, fontWeight: '600', lineHeight: 18, marginBottom: 8 },
  priceRow: { marginBottom: 8 },
  regularPrice: { fontWeight: '800', fontSize: 16 },
  promotionPriceContainer: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 6 },
  originalPrice: { fontSize: 12, fontWeight: '600', textDecorationLine: 'line-through' },
  promoPrice: { fontWeight: '800', fontSize: 16 },
  discountBadge: { backgroundColor: '#4CAF50', paddingHorizontal: 4, paddingVertical: 2, borderRadius: 4 },
  discountText: { color: '#FFFFFF', fontSize: 10, fontWeight: '700' },
  promotionDescription: { fontSize: 11, lineHeight: 14 },
  emptyState: { alignItems: 'center', paddingVertical: 60, paddingHorizontal: 40 },
  emptyStateTitle: { fontSize: 18, fontWeight: '700', marginTop: 16, textAlign: 'center' },
  emptyStateText: { fontSize: 14, marginTop: 8, textAlign: 'center', lineHeight: 20 },
  footerLoader: { paddingVertical: 20, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 8 },
  footerText: { fontSize: 14 },
  floatingButton: { position: 'absolute', bottom: 20, right: 20, width: 50, height: 50, borderRadius: 25, justifyContent: 'center', alignItems: 'center', elevation: 5, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.2, shadowRadius: 4 },
  modalOverlay: { flex: 1, justifyContent: 'flex-end' },
  actionModal: { margin: 16, borderRadius: 16, overflow: 'hidden' },
  modalHeader: { padding: 20, borderBottomWidth: 1, alignItems: 'center' },
  modalTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 4 },
  modalSubtitle: { fontSize: 14, textAlign: 'center' },
  modalActions: { paddingVertical: 8 },
  modalAction: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 16 },
  modalActionText: { fontSize: 16, marginLeft: 12 },
  reportAction: { borderTopWidth: 1 },
  modalCancel: { padding: 16, alignItems: 'center', borderTopWidth: 1 },
  modalCancelText: { fontSize: 17, fontWeight: '600' },
});

export default DiscoverScreen;