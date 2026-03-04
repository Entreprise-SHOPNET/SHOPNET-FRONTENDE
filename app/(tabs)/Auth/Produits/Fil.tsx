


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
} from 'react-native';
import { FontAwesome } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Audio } from 'expo-av';
import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import { getApiUrl } from './apiUtils';
import { authApi } from '../authService';

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
      const cacheData: CacheData = {
        ...data,
        timestamp: Date.now(),
      };
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
      return {
        normal: data.normal,
        promo: data.promo,
      };
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
// FONCTION DE FORMATAGE DES NOMBRES (AJOUTÉE)
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
// HOOK PERSONNALISÉ useFeed
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
): UseFeedReturn => {
  const router = useRouter();
  const cacheService = FeedCacheService.getInstance();

  // États
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

  // ==========================================
  // UTILITAIRES
  // ==========================================

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
    ]).start(() => setShowNotification(false));
  }, [notificationAnim]);

  // ==========================================
  // GÉNÉRATION DYNAMIQUE DU FEED
  // ==========================================

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

    // Publication interne
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

  // ==========================================
  // APPELS API
  // ==========================================

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

  // ==========================================
  // RAFRAÎCHISSEMENT INTELLIGENT
  // ==========================================

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

      // Générer le nouveau feed
      const newFeedItems = generateFeedItems(normalData.products, promos);
      setFeedItems(newFeedItems);

      // Sauvegarde en cache
      await cacheService.save({ normal: normalData.products, promo: promos });
    } catch (error) {
      console.error('❌ Erreur refresh:', error);
      displayNotification('Erreur de chargement');
    } finally {
      setRefreshing(false);
      setLoading(false);
    }
  }, [fetchPromotions, fetchNormalProducts, isOnline, cacheService, generateFeedItems]);

  // ==========================================
  // CHARGEMENT INITIAL AVEC CACHE
  // ==========================================

  useEffect(() => {
    const initFeed = async () => {
      // Vérifier la connexion
      const netInfo = await NetInfo.fetch();
      setIsOnline(netInfo.isConnected ?? true);

      // Charger le cache
      const cached = await cacheService.load();

      if (cached) {
        setNormalProducts(cached.normal);
        setPromotionProducts(cached.promo);
        // Générer le feed à partir du cache
        const cachedFeedItems = generateFeedItems(cached.normal, cached.promo);
        setFeedItems(cachedFeedItems);
      }

      // Si en ligne, rafraîchir en arrière-plan
      if (netInfo.isConnected) {
        refreshFeed(!cached); // Afficher le loader seulement si pas de cache
      } else {
        setLoading(false);
      }
    };

    initFeed();

    // Écouter les changements de connexion
    const unsubscribe = NetInfo.addEventListener(state => {
      const wasOffline = !isOnline;
      setIsOnline(state.isConnected ?? true);

      if (state.isConnected && wasOffline) {
        // Rafraîchir silencieusement au retour de la connexion
        refreshFeed(false);
      }
    });

    return () => unsubscribe();
  }, []);

  // ==========================================
  // PAGINATION
  // ==========================================

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

        // Régénérer tout le feed avec les nouvelles données
        const newFeedItems = generateFeedItems(updatedNormalProducts, promotionProducts);
        setFeedItems(newFeedItems);

        // Mettre à jour le cache
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

  // ==========================================
  // HANDLERS D'INTERACTION (Optimistic Updates)
  // ==========================================

  const handleLike = useCallback(async (productId: string) => {
    // Sauvegarde de l'état précédent pour rollback éventuel
    let previousState: { isLiked: boolean; likes: number } | null = null;

    // 1. Mise à jour optimiste dans feedItems
    setFeedItems(prevFeed => {
      const newFeed = prevFeed.map(item => {
        if (item.type === 'product' && item.data.id === productId) {
          previousState = {
            isLiked: item.data.isLiked,
            likes: item.data.likes,
          };
          return {
            ...item,
            data: {
              ...item.data,
              isLiked: !item.data.isLiked,
              likes: item.data.isLiked ? item.data.likes - 1 : item.data.likes + 1,
            },
          };
        }
        if (item.type === 'horizontal') {
          const updatedData = item.data.map(p => {
            if (p.id === productId) {
              previousState = { isLiked: p.isLiked, likes: p.likes };
              return {
                ...p,
                isLiked: !p.isLiked,
                likes: p.isLiked ? p.likes - 1 : p.likes + 1,
              };
            }
            return p;
          });
          return { ...item, data: updatedData };
        }
        if (item.type === 'grid') {
          const updatedData = item.data.map(p => {
            if (p.id === productId) {
              previousState = { isLiked: p.isLiked, likes: p.likes };
              return {
                ...p,
                isLiked: !p.isLiked,
                likes: p.isLiked ? p.likes - 1 : p.likes + 1,
              };
            }
            return p;
          });
          return { ...item, data: updatedData };
        }
        return item;
      });
      return newFeed;
    });

    // 2. Mise à jour dans les listes brutes
    let normalIdx = normalProducts.findIndex(p => p.id === productId);
    if (normalIdx !== -1) {
      const product = normalProducts[normalIdx];
      const updated = [...normalProducts];
      updated[normalIdx] = {
        ...product,
        isLiked: !product.isLiked,
        likes: product.isLiked ? product.likes - 1 : product.likes + 1,
      };
      setNormalProducts(updated);
    } else {
      const promoIdx = promotionProducts.findIndex(p => p.id === productId);
      if (promoIdx !== -1) {
        const product = promotionProducts[promoIdx];
        const updated = [...promotionProducts];
        updated[promoIdx] = {
          ...product,
          isLiked: !product.isLiked,
          likes: product.isLiked ? product.likes - 1 : product.likes + 1,
        };
        setPromotionProducts(updated);
      } else {
        if (previousState) {
          setFeedItems(prevFeed => prevFeed.map(item => {
            if (item.type === 'product' && item.data.id === productId) {
              return { ...item, data: { ...item.data, ...previousState! } };
            }
            if (item.type === 'horizontal') {
              return {
                ...item,
                data: item.data.map(p =>
                  p.id === productId ? { ...p, ...previousState! } : p
                ),
              };
            }
            if (item.type === 'grid') {
              return {
                ...item,
                data: item.data.map(p =>
                  p.id === productId ? { ...p, ...previousState! } : p
                ),
              };
            }
            return item;
          }));
        }
        return;
      }
    }

    // 3. Appel API en arrière-plan
    try {
      const token = await AsyncStorage.getItem('userToken');
      if (!token) throw new Error('Non authentifié');

      const endpoint = productId.startsWith('promo_')
        ? `https://shopnet-backend.onrender.com/api/promotions/${productId.replace('promo_', '')}/like`
        : `https://shopnet-backend.onrender.com/api/interactions/${productId}/like`;

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = await response.json();
      if (!data.success) throw new Error('Erreur like');
    } catch (error) {
      if (previousState) {
        setFeedItems(prevFeed =>
          prevFeed.map(item => {
            if (item.type === 'product' && item.data.id === productId) {
              return { ...item, data: { ...item.data, ...previousState! } };
            }
            if (item.type === 'horizontal') {
              return {
                ...item,
                data: item.data.map(p =>
                  p.id === productId ? { ...p, ...previousState! } : p
                ),
              };
            }
            if (item.type === 'grid') {
              return {
                ...item,
                data: item.data.map(p =>
                  p.id === productId ? { ...p, ...previousState! } : p
                ),
              };
            }
            return item;
          })
        );

        if (normalIdx !== -1) {
          setNormalProducts(prev => {
            const updated = [...prev];
            updated[normalIdx!] = { ...updated[normalIdx!], ...previousState! };
            return updated;
          });
        } else {
          const promoIdx = promotionProducts.findIndex(p => p.id === productId);
          if (promoIdx !== -1) {
            setPromotionProducts(prev => {
              const updated = [...prev];
              updated[promoIdx] = { ...updated[promoIdx], ...previousState! };
              return updated;
            });
          }
        }
      }
      displayNotification('Erreur lors du like');
    }
  }, [normalProducts, promotionProducts, displayNotification]);

  const handleComment = useCallback((productId: string) => {
    router.push({
      pathname: '/(tabs)/Auth/Produits/Commentaire',
      params: { productId },
    });
  }, []);

  const handleShare = useCallback(async (product: Product) => {
    setFeedItems(prevFeed =>
      prevFeed.map(item => {
        if (item.type === 'product' && item.data.id === product.id) {
          return { ...item, data: { ...item.data, shares: item.data.shares + 1 } };
        }
        if (item.type === 'horizontal') {
          return {
            ...item,
            data: item.data.map(p =>
              p.id === product.id ? { ...p, shares: p.shares + 1 } : p
            ),
          };
        }
        if (item.type === 'grid') {
          return {
            ...item,
            data: item.data.map(p =>
              p.id === product.id ? { ...p, shares: p.shares + 1 } : p
            ),
          };
        }
        return item;
      })
    );

    const normalIdx = normalProducts.findIndex(p => p.id === product.id);
    if (normalIdx !== -1) {
      const updated = [...normalProducts];
      updated[normalIdx].shares += 1;
      setNormalProducts(updated);
    } else {
      const promoIdx = promotionProducts.findIndex(p => p.id === product.id);
      if (promoIdx !== -1) {
        const updated = [...promotionProducts];
        updated[promoIdx].shares += 1;
        setPromotionProducts(updated);
      }
    }

    try {
      const result = await Share.share({
        title: product.isPromotion ? `🔥 PROMO: ${product.title}` : `Partager ${product.title}`,
        message: product.isPromotion
          ? `🔥 PROMOTION !\n${product.title}\nPrix: $${product.price}\n${product.description}`
          : `Découvrez ${product.title} à $${product.price}\n${product.description}`,
      });
    } catch (error) {
      console.error('❌ Erreur partage:', error);
    }
  }, [normalProducts, promotionProducts]);

  const handleAddToCart = useCallback(async (product: Product) => {
    try {
      const token = await AsyncStorage.getItem('userToken');
      if (!token) {
        displayNotification('Authentification requise');
        return;
      }

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

      const res = await authApi.post(
        'https://shopnet-backend.onrender.com/api/cart',
        cartItem,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (res.data?.success) {
        displayNotification(`✅ ${product.isPromotion ? 'Promotion' : 'Produit'} ajouté au panier`);
        if (soundRef.current) await soundRef.current.replayAsync();
      } else {
        displayNotification('⚠️ Impossible d\'ajouter');
      }
    } catch (error) {
      displayNotification('❌ Erreur');
    }
  }, [activeCategory, categories]);

  // Chargement son
  useEffect(() => {
    const loadSound = async () => {
      try {
        const { sound } = await Audio.Sound.createAsync(
          require('../../../../assets/sounds/success-sound.mp3')
        );
        soundRef.current = sound;
      } catch (error) {
        console.error('❌ Erreur chargement son:', error);
      }
    };
    loadSound();

    return () => {
      soundRef.current?.unloadAsync();
    };
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
// COMPOSANTS OPTIMISÉS
// ============================================

const NotificationBadge = memo(({ count, small = false }: { count: number; small?: boolean }) => {
  if (count <= 0) return null;
  return (
    <View style={[
      styles.badge,
      small ? styles.smallBadge : styles.regularBadge,
      count > 99 && styles.largeCountBadge,
    ]}>
      <Text style={[
        styles.badgeText,
        small ? styles.smallBadgeText : styles.regularBadgeText,
      ]}>
        {count > 99 ? '99+' : count}
      </Text>
    </View>
  );
});

const ProductMiniCard = memo(({ item, onPress }: { item: Product; onPress: () => void }) => {
  const imageUrl = item.images?.[0] || 'https://via.placeholder.com/120';
  const [imageLoaded, setImageLoaded] = useState(false);

  return (
    <TouchableOpacity style={styles.miniCard} onPress={onPress}>
      <View style={styles.miniImageContainer}>
        {!imageLoaded && (
          <View style={[styles.miniImage, styles.imagePlaceholder]}>
            <ActivityIndicator size="small" color="#4CAF50" />
          </View>
        )}
        <Image
          source={{ uri: imageUrl }}
          style={styles.miniImage}
          onLoad={() => setImageLoaded(true)}
        />
      </View>
      <Text numberOfLines={1} style={styles.miniTitle}>{item.title}</Text>
      <Text style={styles.miniPrice}>${item.price?.toFixed(2) ?? '0.00'}</Text>
    </TouchableOpacity>
  );
});

const HorizontalProductRow = memo(({
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
}: {
  item: Product;
  handleLike: (id: string) => void;
  handleComment: (id: string) => void;
  handleShare: (product: Product) => void;
  handleAddToCart: (product: Product) => void;
  router: any;
}) => {
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
    <View style={styles.fullWidthCard}>
      <TouchableOpacity
        style={styles.productHeader}
        onPress={() => router.push({
          pathname: '/(tabs)/Auth/Profiles/SellerProfile',
          params: { sellerId: seller.id },
        })}
      >
        <Image source={{ uri: seller.avatar || 'https://via.placeholder.com/40' }} style={styles.avatar} />
        <View style={styles.sellerInfo}>
          <Text style={styles.sellerName} numberOfLines={1}>{seller.name || 'Vendeur'}</Text>
          <Text style={styles.productLocation} numberOfLines={1}>{item.location || 'Lubumbashi'}</Text>
        </View>
      </TouchableOpacity>

      <TouchableOpacity
        onPress={() => {
          if (item.isPromotion && item.promotionId) {
            router.push({
              pathname: '/(tabs)/Auth/Panier/PromoDetail',
              params: { id: item.promotionId.toString() },
            });
          } else {
            router.push({
              pathname: '/(tabs)/Auth/Panier/DetailId',
              params: { id: item.id.toString() },
            });
          }
        }}
      >
        <View style={styles.fullWidthImageContainer}>
          {!imageLoaded && (
            <View style={[styles.fullWidthImage, styles.imagePlaceholder]}>
              <ActivityIndicator size="large" color="#4CAF50" />
            </View>
          )}
          <Image
            source={{ uri: images[0] }}
            style={styles.fullWidthImage}
            onLoad={() => setImageLoaded(true)}
          />
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
        <Text style={styles.productTitle} numberOfLines={2}>{item.title}</Text>
        <Text style={styles.productDescription} numberOfLines={2}>{item.description}</Text>
      </View>

      <TouchableOpacity
        style={styles.ratingContainer}
        onPress={() => router.push({
          pathname: '/(tabs)/Auth/Produits/Commentaire',
          params: { productId: item.id },
        })}
      >
        <View style={styles.starsContainer}>
          {[1, 2, 3, 4, 5].map((star) => (
            <FontAwesome
              key={star}
              name={star <= Math.floor(rating) ? 'star' : 'star-o'}
              size={16}
              color="#FFD700"
            />
          ))}
        </View>
        <Text style={styles.socialCount}>{comments} commentaires</Text>
      </TouchableOpacity>

      <View style={styles.actionButtons}>
        <View style={styles.socialActions}>
          <TouchableOpacity style={styles.socialButton} onPress={() => handleLike(item.id)}>
            <FontAwesome
              name={item.isLiked ? 'heart' : 'heart-o'}
              size={20}
              color={item.isLiked ? '#FF3B30' : '#333'}
            />
            {/* MODIFICATION ICI : utilisation de formatNumber pour les likes */}
            <Text style={styles.socialCount}>{formatNumber(likes)}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.socialButton} onPress={() => handleComment(item.id)}>
            <FontAwesome name="comment-o" size={20} color="#333" />
            <Text style={styles.socialCount}>{comments}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.socialButton} onPress={() => handleShare(item)}>
            <FontAwesome name="share" size={20} color="#333" />
            <Text style={styles.socialCount}>{shares}</Text>
          </TouchableOpacity>
        </View>
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
    prev.item.isPromotion === next.item.isPromotion
  );
});

const GridProductCard = memo(({ item, onPress }: { item: Product; onPress: () => void }) => {
  const [imageLoaded, setImageLoaded] = useState(false);
  const seller = item.seller ?? { id: '0', name: 'Vendeur', avatar: '' };
  const price = item.price ?? 0;
  const originalPrice = item.original_price ?? price;
  const discount = item.discount ?? 0;

  return (
    <TouchableOpacity style={styles.gridCard} onPress={onPress}>
      <View style={styles.gridImageContainer}>
        {!imageLoaded && (
          <View style={[styles.gridImage, styles.imagePlaceholder]}>
            <ActivityIndicator size="small" color="#4CAF50" />
          </View>
        )}
        <Image
          source={{ uri: item.images?.[0] || 'https://via.placeholder.com/200' }}
          style={styles.gridImage}
          onLoad={() => setImageLoaded(true)}
        />
      </View>
      <Text numberOfLines={2} style={styles.gridTitle}>{item.title}</Text>
      <View style={styles.gridPriceRow}>
        {item.isPromotion && originalPrice > 0 ? (
          <>
            <Text style={styles.gridOriginalPrice}>${originalPrice.toFixed(2)}</Text>
            <Text style={styles.gridPrice}>${price.toFixed(2)}</Text>
          </>
        ) : (
          <Text style={styles.gridPrice}>${price.toFixed(2)}</Text>
        )}
        {discount > 0 && <Text style={styles.gridDiscount}>-{discount}%</Text>}
      </View>
      <View style={styles.gridSellerRow}>
        <Image source={{ uri: seller.avatar || 'https://via.placeholder.com/20' }} style={styles.gridSellerAvatar} />
        <Text numberOfLines={1} style={styles.gridSellerName}>{seller.name || 'Vendeur'}</Text>
      </View>
    </TouchableOpacity>
  );
});

const TwoColumnGrid = memo(({
  products,
  onProductPress,
}: {
  products: Product[];
  onProductPress: (product: Product) => void;
}) => {
  return (
    <View style={styles.gridContainer}>
      {products.map((item) => (
        <GridProductCard key={item.id} item={item} onPress={() => onProductPress(item)} />
      ))}
    </View>
  );
});

const InternalPromotionCard = memo(({ item, onPress }: { item: InternalPromotion; onPress: () => void }) => {
  const [imageLoaded, setImageLoaded] = useState(false);

  return (
    <TouchableOpacity style={styles.internalPromoCard} onPress={onPress}>
      <View style={styles.internalPromoImageContainer}>
        {!imageLoaded && (
          <View style={[styles.internalPromoImage, styles.imagePlaceholder]}>
            <ActivityIndicator size="large" color="#4CAF50" />
          </View>
        )}
        <Image
          source={{ uri: item.imageUrl }}
          style={styles.internalPromoImage}
          onLoad={() => setImageLoaded(true)}
        />
      </View>
      <View style={styles.internalPromoContent}>
        <Text style={styles.internalPromoTitle}>{item.title}</Text>
        <Text style={styles.internalPromoDescription}>{item.description}</Text>
      </View>
    </TouchableOpacity>
  );
});

// ============================================
// COMPOSANT PRINCIPAL
// ============================================

const ShopApp = () => {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState(0);
  const [badgeCounts, setBadgeCounts] = useState({
    promotion: 0,
    discover: 0,
    cart: 0,
    profile: 0,
    notification: 0,
  });

  const categories = [
    '✨ Tendance',
    '🔥 Promos',
    '👗 Mode',
    '📱 Tech',
    '🏠 Maison',
    '💄 Beauté',
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
  } = useFeed(0, categories);

  const onProductPress = useCallback((product: Product) => {
    if (product.isPromotion && product.promotionId) {
      router.push({
        pathname: '/(tabs)/Auth/Panier/PromoDetail',
        params: { id: product.promotionId.toString() },
      });
    } else {
      router.push({
        pathname: '/(tabs)/Auth/Panier/DetailId',
        params: { id: product.id.toString() },
      });
    }
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
          />
        );
      case 'horizontal':
        return (
          <HorizontalProductRow
            products={item.data}
            onProductPress={onProductPress}
          />
        );
      case 'grid':
        return (
          <TwoColumnGrid
            products={item.data}
            onProductPress={onProductPress}
          />
        );
      case 'internal':
        return (
          <InternalPromotionCard
            item={item.data}
            onPress={onInternalPromoPress}
          />
        );
      default:
        return null;
    }
  }, [handleLike, handleComment, handleShare, handleAddToCart, router, onProductPress, onInternalPromoPress]);

  const renderFooter = useCallback(() => {
    if (!isLoadingMore) return null;
    return (
      <View style={styles.footerLoader}>
        <ActivityIndicator size="large" color="#4CAF50" />
      </View>
    );
  }, [isLoadingMore]);

  const renderEmpty = useCallback(() => (
    <View style={styles.emptyContainer}>
      <FontAwesome name="shopping-bag" size={60} color="#ccc" />
      <Text style={styles.emptyText}>Aucun produit disponible</Text>
      <TouchableOpacity style={styles.retryButton} onPress={handleRefresh}>
        <Text style={styles.retryButtonText}>Réessayer</Text>
      </TouchableOpacity>
    </View>
  ), [handleRefresh]);

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

    if (screen === 'Sell') router.push('/(tabs)/Auth/Produits/Produit');
    else if (screen === 'Home') router.push('/(tabs)/Auth/Produits/Fil');
    else if (screen === 'Discover') router.push('/(tabs)/Auth/Produits/Decouvrir');
    else if (screen === 'Messages') router.push('/(tabs)/Auth/Panier/CartListScreen');
    else router.push('/(tabs)/Auth/Produits/profil-debug');
  }, []);

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

      <View style={styles.header}>
        <Text style={styles.logo}>SHOPNET</Text>
        <View style={styles.headerIcons}>
          <TouchableOpacity onPress={() => router.push('/(tabs)/Auth/Produits/Recherche')}>
            <FontAwesome name="search" size={20} color="#333" />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => router.push('/(tabs)/Auth/Notification/NotificationsUser')}>
            <View style={styles.iconContainer}>
              <FontAwesome name="bell" size={20} color="#333" />
              <NotificationBadge count={badgeCounts.notification} />
            </View>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => router.push('/(tabs)/Auth/Produits/profil-debug')}>
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
          keyExtractor={(_, index) => `category-${index}`}
          renderItem={({ item, index }) => (
            <TouchableOpacity
              style={[
                styles.categoryPill,
                index === 0 && styles.activeCategoryPill,
              ]}
              onPress={() => handleCategoryChange(index)}
            >
              <Text style={[
                styles.categoryText,
                index === 0 && styles.activeCategoryText,
              ]}>
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
        keyExtractor={keyExtractor}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={['#4CAF50']}
          />
        }
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
        maintainVisibleContentPosition={{
          minIndexForVisible: 0,
        }}
      />

      <View style={styles.enhancedBottomNav}>
        {['Home', 'Discover', 'Sell', 'Messages', 'Profile'].map((screen, index) => (
          <TouchableOpacity
            key={screen}
            style={styles.navButton}
            onPress={() => handleTabPress(screen, index)}
          >
            <View style={styles.navIconContainer}>
              <FontAwesome
                name={
                  screen === 'Home' ? 'home' :
                    screen === 'Discover' ? 'compass' :
                      screen === 'Sell' ? 'plus' :
                        screen === 'Messages' ? 'comments' : 'user'
                }
                size={24}
                color={activeTab === index ? '#4CAF50' : '#666'}
              />
            </View>
            <Text style={[styles.navLabel, activeTab === index && styles.activeNavLabel]}>
              {screen === 'Home' ? 'Tendances' :
                screen === 'Discover' ? 'Découvrir' :
                  screen === 'Sell' ? 'Vendre' :
                    screen === 'Messages' ? 'Panier' : 'Profil'}
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
  container: { flex: 1, backgroundColor: '#f0f2f5' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#fff' },
  loadingText: { marginTop: 10, color: '#666', fontSize: 16 },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20, marginTop: 50 },
  emptyText: { fontSize: 18, color: '#666', marginTop: 20, marginBottom: 20, textAlign: 'center' },
  retryButton: { backgroundColor: '#4CAF50', paddingVertical: 12, paddingHorizontal: 25, borderRadius: 8 },
  retryButtonText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
  footerLoader: { padding: 20, justifyContent: 'center', alignItems: 'center' },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 15,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    elevation: 2,
  },
  logo: { fontSize: 24, fontWeight: 'bold', color: '#4CAF50' },
  headerIcons: { flexDirection: 'row', alignItems: 'center', gap: 20 },
  iconContainer: { position: 'relative' },
  categoriesWrapper: {
    backgroundColor: '#fff',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  categoriesContainer: { paddingHorizontal: 15 },
  categoryPill: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    marginRight: 10,
    backgroundColor: '#f0f2f5',
    elevation: 1,
  },
  activeCategoryPill: { backgroundColor: '#4CAF50' },
  categoryText: { color: '#666', fontWeight: '600', fontSize: 14 },
  activeCategoryText: { color: '#fff' },
  listContent: { paddingBottom: 80 },

  // Full Width Product Card
  fullWidthCard: {
    backgroundColor: '#fff',
    marginBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  fullWidthImageContainer: { width: '100%', height: width, backgroundColor: '#eee' },
  fullWidthImage: { width: '100%', height: '100%', position: 'absolute', top: 0, left: 0 },
  productHeader: { flexDirection: 'row', alignItems: 'center', padding: 12 },
  avatar: { width: 40, height: 40, borderRadius: 20, marginRight: 10, backgroundColor: '#eee' },
  sellerInfo: { flex: 1 },
  sellerName: { fontWeight: 'bold', fontSize: 15 },
  productLocation: { fontSize: 12, color: '#666' },
  priceContainer: {
    position: 'absolute',
    bottom: 10,
    left: 10,
    backgroundColor: 'rgba(0,0,0,0.7)',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
  },
  originalPrice: { color: '#aaa', textDecorationLine: 'line-through', fontSize: 14, marginRight: 8 },
  discountedPrice: { color: '#FFD700', fontWeight: 'bold', fontSize: 18 },
  normalPrice: { color: '#fff', fontWeight: 'bold', fontSize: 18 },
  discountText: { color: '#FFD700', fontSize: 12, marginLeft: 5 },
  discountBadge: { backgroundColor: '#4CAF50', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, marginLeft: 8 },
  discountBadgeText: { color: '#fff', fontSize: 11, fontWeight: 'bold' },
  promotionBadge: {
    position: 'absolute',
    top: 10,
    left: 10,
    backgroundColor: 'rgba(255, 87, 34, 0.9)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    flexDirection: 'row',
    alignItems: 'center',
  },
  promotionBadgeText: { color: '#fff', fontWeight: 'bold', fontSize: 12 },
  timerText: { color: '#FFD700', fontWeight: 'bold', fontSize: 10, marginLeft: 5 },
  productInfo: { paddingHorizontal: 12, paddingVertical: 10 },
  productTitle: { fontSize: 17, fontWeight: 'bold', color: '#333' },
  productDescription: { color: '#666', marginTop: 4, fontSize: 14, lineHeight: 20 },
  ratingContainer: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, marginBottom: 10 },
  starsContainer: { flexDirection: 'row', marginRight: 5 },
  socialCount: { fontSize: 13, color: '#666' },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    borderTopWidth: 1,
    borderTopColor: '#f0f2f5',
  },
  socialActions: { flexDirection: 'row', alignItems: 'center', gap: 20 },
  socialButton: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  cartButton: { backgroundColor: '#4CAF50', borderRadius: 8, paddingHorizontal: 20, paddingVertical: 10, elevation: 2 },
  promotionCartButton: { backgroundColor: '#FF5722' },
  cartButtonText: { color: '#fff', fontWeight: 'bold', fontSize: 14 },

  // Horizontal Row
  horizontalRowContainer: {
    backgroundColor: '#fff',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  horizontalListContent: { paddingHorizontal: 12 },
  miniCard: { width: 120, marginRight: 10, backgroundColor: '#fff', borderRadius: 8, elevation: 1, overflow: 'hidden' },
  miniImageContainer: { width: 120, height: 120, backgroundColor: '#eee', position: 'relative' },
  miniImage: { width: 120, height: 120, position: 'absolute', top: 0, left: 0 },
  miniTitle: { fontSize: 13, fontWeight: '500', paddingHorizontal: 5, marginTop: 5 },
  miniPrice: { fontSize: 12, fontWeight: 'bold', color: '#4CAF50', paddingHorizontal: 5, paddingBottom: 5 },

  // Grid 2 Colonnes
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    backgroundColor: '#fff',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  gridCard: {
    width: (width - 36) / 2,
    backgroundColor: '#fff',
    marginBottom: 12,
    borderRadius: 8,
    elevation: 1,
    overflow: 'hidden',
  },
  gridImageContainer: {
    width: '100%',
    height: (width - 36) / 2,
    backgroundColor: '#eee',
    position: 'relative',
  },
  gridImage: { width: '100%', height: '100%', position: 'absolute', top: 0, left: 0 },
  gridTitle: { fontSize: 14, fontWeight: '500', paddingHorizontal: 8, marginTop: 5 },
  gridPriceRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, marginTop: 3 },
  gridOriginalPrice: { fontSize: 12, color: '#aaa', textDecorationLine: 'line-through', marginRight: 6 },
  gridPrice: { fontSize: 14, fontWeight: 'bold', color: '#333' },
  gridDiscount: { fontSize: 12, color: '#4CAF50', marginLeft: 6 },
  gridSellerRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, paddingBottom: 8, marginTop: 4 },
  gridSellerAvatar: { width: 16, height: 16, borderRadius: 8, marginRight: 4, backgroundColor: '#eee' },
  gridSellerName: { fontSize: 11, color: '#666', flex: 1 },

  // Internal Promotion
  internalPromoCard: {
    backgroundColor: '#fff',
    marginBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  internalPromoImageContainer: { width: '100%', height: 200, backgroundColor: '#4CAF50', position: 'relative' },
  internalPromoImage: { width: '100%', height: '100%', position: 'absolute', top: 0, left: 0 },
  internalPromoContent: { padding: 15 },
  internalPromoTitle: { fontSize: 18, fontWeight: 'bold', color: '#333', marginBottom: 5 },
  internalPromoDescription: { fontSize: 14, color: '#666', lineHeight: 20 },

  // Placeholder commun
  imagePlaceholder: {
    backgroundColor: '#f0f2f5',
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Badges
  badge: {
    position: 'absolute',
    top: -5,
    right: -5,
    backgroundColor: '#FF3B30',
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#fff',
    minWidth: 18,
    height: 18,
    zIndex: 100,
  },
  smallBadge: { minWidth: 16, height: 16, top: -3, right: -3 },
  regularBadge: { minWidth: 20, height: 20, top: -8, right: -8 },
  largeCountBadge: { minWidth: 24, paddingHorizontal: 4 },
  badgeText: { color: '#fff', fontWeight: 'bold', textAlign: 'center' },
  smallBadgeText: { fontSize: 9 },
  regularBadgeText: { fontSize: 11 },

  // Bottom Navigation
  enhancedBottomNav: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    paddingVertical: 12,
    paddingHorizontal: 5,
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    elevation: 8,
  },
  navButton: { alignItems: 'center', flex: 1, position: 'relative' },
  navIconContainer: { position: 'relative' },
  navLabel: { fontSize: 12, color: '#666', marginTop: 4 },
  activeNavLabel: { color: '#4CAF50', fontWeight: 'bold' },
});

export default ShopApp;