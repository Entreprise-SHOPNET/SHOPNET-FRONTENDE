



import React, { useEffect, useState, useRef, useCallback } from 'react';
import {
  View,
  Text,
  Image,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  FlatList,
  ScrollView,
  Dimensions,
  Modal,
  SafeAreaView,
  StatusBar,
  Linking,
  Alert,
  RefreshControl,
  Platform,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import { Ionicons, MaterialIcons, FontAwesome5 } from '@expo/vector-icons';
import * as Location from 'expo-location';

// ========== CONSTANTES ==========
const { width } = Dimensions.get('window');
const LOCAL_API = 'https://shopnet-backend.onrender.com/api';
const ITEMS_PER_PAGE = 10;
const INITIAL_LIMIT = 50;
const CACHE_KEY = '@shopnet_discover_cache';
const CACHE_EXPIRY = 10 * 60 * 1000; // 10 minutes

// ========== PALETTE DE COULEURS MODERNE (sans ombres) ==========
const COLORS = {
  background: '#F5F7FA',
  card: '#FFFFFF',
  text: '#1E2A3A',
  textSecondary: '#6B7A8F',
  accent: '#42A5F5',
  accentLight: '#E3F2FD',
  border: '#E9ECF0',
  success: '#4CAF50',
  warning: '#FF9800',
  error: '#F44336',
  gold: '#FFD700',
  verified: '#1877F2',
  headerBg: '#FFFFFF',
  statusBar: 'dark-content',
  overlay: 'rgba(0,0,0,0.5)',
};

// ========== TYPES ==========
type Product = {
  id: string;
  title: string;
  description: string;
  price: number;
  original_price: number | null;
  images: string[];
  shares: number;
  isPromotion: boolean;
  is_boosted?: boolean;
  is_featured?: boolean;
  is_premium?: boolean;
  category: string;
  condition: string;
  stock: number;
  location: string;
  distance?: number;
  created_at: string;
  seller: {
    id: string;
    name: string;
    avatar: string | null;
    city: string | null;
    email?: string;
    phone?: string;
    is_premium?: boolean;
  };
};

type Shop = {
  id: string;
  nom: string;
  logo: string;
  description: string;
  ville: string;
  pays: string;
  latitude: string;
  longitude: string;
  type_boutique: string;
  date_activation: string | null;
  distance: number;
  is_premium: boolean;
  products_count?: number;
  rating?: number;
};

type CacheData = {
  timestamp: number;
  products: Product[];
  shops: Shop[];
  trending: Product[];
  boosted: Product[];
};

// ========== COMPOSANT BADGE VÉRIFIÉ ==========
const VerificationBadge = ({ size = 14, showText = false }: { size?: number; showText?: boolean }) => (
  <View style={styles.verificationBadgeContainer}>
    <View style={[styles.verificationBadge, { width: size, height: size }]}>
      <MaterialIcons name="verified" size={size * 0.9} color={COLORS.verified} />
    </View>
    {showText && <Text style={[styles.verifiedText, { color: COLORS.verified }]}>Vérifié</Text>}
  </View>
);

// ========== COMPOSANT BADGE PREMIUM ==========
const PremiumBadge = ({ size = 14, showText = false }: { size?: number; showText?: boolean }) => (
  <View style={styles.premiumBadgeContainer}>
    <View style={[styles.premiumBadge, { backgroundColor: COLORS.gold }]}>
      <Ionicons name="star" size={size * 0.8} color="#000" />
    </View>
    {showText && <Text style={[styles.premiumText, { color: COLORS.gold }]}>Premium</Text>}
  </View>
);

// ========== COMPOSANT PRINCIPAL ==========
export default function DiscoverScreen() {
  const router = useRouter();

  // États produits
  const [allProducts, setAllProducts] = useState<Product[]>([]);
  const [feedProducts, setFeedProducts] = useState<Product[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // États sections
  const [shops, setShops] = useState<Shop[]>([]);
  const [trendingProducts, setTrendingProducts] = useState<Product[]>([]);
  const [boostedProducts, setBoostedProducts] = useState<Product[]>([]);
  const [userLocation, setUserLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [actionModalVisible, setActionModalVisible] = useState(false);
  const [isCacheLoaded, setIsCacheLoaded] = useState(false);

  // Mode d'affichage : 'horizontal' ou 'vertical'
  const [layoutMode, setLayoutMode] = useState<'horizontal' | 'vertical'>('horizontal');

  const flatListRef = useRef<FlatList>(null);

  // ========== SYSTÈME DE CACHE AVANCÉ ==========
  useEffect(() => {
    const loadInitialData = async () => {
      const cached = await loadCache();
      if (cached) {
        setAllProducts(cached.products);
        setFeedProducts(cached.products.slice(0, ITEMS_PER_PAGE));
        setShops(cached.shops);
        setTrendingProducts(cached.trending);
        setBoostedProducts(cached.boosted);
        setIsCacheLoaded(true);
        setLoading(false);
      }
      setTimeout(() => {
        requestLocationAndFetchData();
      }, 100);
    };
    loadInitialData();
  }, []);

  const loadCache = async (): Promise<CacheData | null> => {
    try {
      const cacheStr = await AsyncStorage.getItem(CACHE_KEY);
      if (cacheStr) {
        const cache: CacheData = JSON.parse(cacheStr);
        if (Date.now() - cache.timestamp < CACHE_EXPIRY) {
          console.log('📦 Cache chargé');
          return cache;
        }
      }
    } catch (error) {
      console.error('Erreur chargement cache:', error);
    }
    return null;
  };

  const saveCache = async (products: Product[], shops: Shop[], trending: Product[], boosted: Product[]) => {
    try {
      const cacheData: CacheData = {
        timestamp: Date.now(),
        products,
        shops,
        trending,
        boosted,
      };
      await AsyncStorage.setItem(CACHE_KEY, JSON.stringify(cacheData));
    } catch (error) {
      console.error('Erreur sauvegarde cache:', error);
    }
  };

  // ========== LOCALISATION ==========
  const requestLocationAndFetchData = async () => {
    if (!isCacheLoaded) setLoading(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      let location = null;
      if (status === 'granted') {
        const loc = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });
        location = {
          latitude: loc.coords.latitude,
          longitude: loc.coords.longitude,
        };
        setUserLocation(location);
      } else {
        location = { latitude: -4.4419, longitude: 15.2663 }; // Kinshasa
        setUserLocation(location);
      }

      await Promise.all([
        fetchProducts(1, true, true),
        fetchNearbyShops(location!.latitude, location!.longitude),
        fetchTrendingProducts(),
        fetchBoostedProducts(),
      ]);
    } catch (error) {
      console.error('Erreur chargement initial:', error);
    } finally {
      setLoading(false);
    }
  };

  // ========== BOUTIQUES PREMIUM PROCHES ==========
  const fetchNearbyShops = async (lat: number, lng: number, radius = 20) => {
    try {
      const url = `${LOCAL_API}/boutique/premium/discover/nearby?latitude=${lat}&longitude=${lng}&radius=${radius}`;
      const response = await fetch(url);
      const data = await response.json();
      if (data.success) {
        const sortedShops = (data.shops || []).sort((a: Shop, b: Shop) => a.distance - b.distance);
        setShops(sortedShops);
        saveCache(allProducts, sortedShops, trendingProducts, boostedProducts);
      }
    } catch (error) {
      console.error('Erreur fetchNearbyShops:', error);
    }
  };

  // ========== PRODUITS PRINCIPAUX ==========
  const fetchProducts = async (pageNum = 1, shouldShuffle = false, forceRefresh = false) => {
    try {
      const params = new URLSearchParams({
        page: pageNum.toString(),
        limit: (pageNum === 1 ? INITIAL_LIMIT : ITEMS_PER_PAGE).toString(),
      });
      if (userLocation) {
        params.append('lat', userLocation.latitude.toString());
        params.append('lng', userLocation.longitude.toString());
      }

      const response = await fetch(`${LOCAL_API}/products?${params}`);
      const data = await response.json();

      if (data.success) {
        let products = formatProducts(data.products || []);
        if (shouldShuffle) products = shuffleArray(products);

        if (pageNum === 1) {
          setAllProducts(products);
          setFeedProducts(products.slice(0, ITEMS_PER_PAGE));
          saveCache(products, shops, trendingProducts, boostedProducts);
        } else {
          setAllProducts(prev => {
            const existingIds = new Set(prev.map(p => p.id));
            const newProducts = products.filter(p => !existingIds.has(p.id));
            return [...prev, ...newProducts];
          });
          setFeedProducts(prev => {
            const existingIds = new Set(prev.map(p => p.id));
            const newProducts = products.filter(p => !existingIds.has(p.id));
            return [...prev, ...newProducts];
          });
        }
        setPage(pageNum);
        setHasMore(pageNum < (data.totalPages || 1));
      }
    } catch (error) {
      console.error('Erreur fetchProducts:', error);
    }
  };

  // ========== PRODUITS BOOSTÉS ==========
  const fetchBoostedProducts = async () => {
    try {
      const params = new URLSearchParams({ limit: '15', boosted: 'true' });
      if (userLocation) {
        params.append('lat', userLocation.latitude.toString());
        params.append('lng', userLocation.longitude.toString());
      }
      const response = await fetch(`${LOCAL_API}/products/boosted?${params}`);
      const data = await response.json();
      if (data.success) {
        let products = formatProducts(data.products || []);
        setBoostedProducts(products);
        saveCache(allProducts, shops, trendingProducts, products);
      }
    } catch (error) {
      console.error('Erreur fetchBoosted:', error);
    }
  };

  // ========== PRODUITS TENDANCES ==========
  const fetchTrendingProducts = async () => {
    try {
      const response = await fetch(`${LOCAL_API}/products/trending?limit=10`);
      const data = await response.json();
      if (data.success) {
        let products = formatProducts(data.products || []);
        setTrendingProducts(products);
        saveCache(allProducts, shops, products, boostedProducts);
      }
    } catch (error) {
      console.error('Erreur fetchTrending:', error);
    }
  };

  // ========== FORMATAGE PRODUIT ==========
  const formatProducts = (rawProducts: any[]): Product[] => {
    return rawProducts.map(p => ({
      id: p.id.toString(),
      title: p.title || 'Sans titre',
      description: p.description || '',
      price: Number(p.price) || 0,
      original_price: p.original_price ? Number(p.original_price) : null,
      images: Array.isArray(p.image_urls) ? p.image_urls : [],
      shares: p.shares || 0,
      isPromotion: Boolean(p.isPromotion || p.is_boosted),
      is_boosted: Boolean(p.is_boosted),
      is_featured: Boolean(p.is_featured),
      is_premium: Boolean(p.seller?.is_premium),
      category: p.category || 'Non catégorisé',
      condition: p.condition || 'neuf',
      stock: p.stock || 0,
      location: p.location || p.seller?.city || 'Ville inconnue',
      distance: p.distance,
      created_at: p.created_at || '',
      seller: {
        id: p.seller?.id?.toString() || '',
        name: p.seller?.name || 'Vendeur inconnu',
        avatar: p.seller?.avatar || null,
        city: p.seller?.city || null,
        email: p.seller?.email,
        phone: p.seller?.phone,
        is_premium: Boolean(p.seller?.is_premium),
      },
    }));
  };

  // ========== MÉLANGE ==========
  const shuffleArray = (array: Product[]) => {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  };

  // ========== CHARGEMENT SUPPLÉMENTAIRE ==========
  const loadMoreProducts = () => {
    if (!loadingMore && hasMore) {
      setLoadingMore(true);
      fetchProducts(page + 1, false).finally(() => setLoadingMore(false));
    }
  };

  // ========== RAFRAÎCHISSEMENT ==========
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    if (userLocation) {
      await Promise.all([
        fetchProducts(1, true, true),
        fetchNearbyShops(userLocation.latitude, userLocation.longitude),
        fetchTrendingProducts(),
        fetchBoostedProducts(),
      ]);
    } else {
      await requestLocationAndFetchData();
    }
    setRefreshing(false);
  }, [userLocation]);

  // ========== NAVIGATION ==========
  const handleSearch = () => router.push('/search');

  const handleNearbyShops = () => {
    if (userLocation) {
      router.push({
        pathname: '/AllShops',
        params: {
          latitude: userLocation.latitude.toString(),
          longitude: userLocation.longitude.toString(),
        },
      });
    } else {
      Alert.alert(
        'Localisation requise',
        'Activez la localisation pour voir les boutiques proches.',
        [
          { text: 'Annuler', style: 'cancel' },
          { text: 'Activer', onPress: () => Location.requestForegroundPermissionsAsync() },
        ]
      );
    }
  };

  const goToDetail = (product: Product) => {
    router.push({ pathname: '/ProductDetail', params: { id: product.id } });
  };

  const goToShopDetail = (shop: Shop) => {
    router.push({ pathname: '/ShopDetail', params: { id: shop.id } });
  };

  // ========== CONTACT VIA WHATSAPP ==========
  const contactSeller = (product: Product) => {
    const phone = product.seller?.phone?.replace(/\D/g, '') || '243896037137';
    const message = `Bonjour, je suis intéressé par le produit "${product.title}" sur SHOPNET. Prix: ${product.price} USD. Voici le lien: https://shopnet.app/product/${product.id}`;
    const url = `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
    Linking.openURL(url).catch(() => Alert.alert('Erreur', 'Impossible d\'ouvrir WhatsApp'));
  };

  // ========== RENDU CARTE PRODUIT (sans likes/comments, sans ombres) ==========
  // Pour le mode horizontal (défilement horizontal)
  const renderHorizontalProductCard = ({ item }: { item: Product }) => {
    const discount = item.original_price
      ? Math.round(((item.original_price - item.price) / item.original_price) * 100)
      : 0;
    const imageUrl = item.images?.length > 0 ? item.images[0] : null;
    const cardWidth = width - 32; // largeur presque pleine pour une meilleure lisibilité

    return (
      <TouchableOpacity
        activeOpacity={0.95}
        onPress={() => goToDetail(item)}
        style={[
          styles.productCardHorizontal,
          { backgroundColor: COLORS.card, borderColor: COLORS.border, width: cardWidth, marginHorizontal: 8 },
        ]}
      >
        <View style={styles.imageContainerHorizontal}>
          {imageUrl ? (
            <Image source={{ uri: imageUrl }} style={styles.productImageHorizontal} resizeMode="cover" />
          ) : (
            <View style={[styles.imagePlaceholder, { backgroundColor: COLORS.border }]}>
              <Ionicons name="cube-outline" size={30} color={COLORS.textSecondary} />
            </View>
          )}

          <View style={styles.badgeContainer}>
            {item.isPromotion && (
              <View style={[styles.badge, { backgroundColor: COLORS.error }]}>
                <Ionicons name="flash" size={10} color="#fff" />
                <Text style={styles.badgeText}>PROMO</Text>
              </View>
            )}
            {item.is_boosted && !item.isPromotion && (
              <View style={[styles.badge, { backgroundColor: COLORS.accent }]}>
                <Ionicons name="rocket" size={10} color="#fff" />
                <Text style={styles.badgeText}>BOOST</Text>
              </View>
            )}
            {discount > 0 && (
              <View style={[styles.discountBadge, { backgroundColor: COLORS.error }]}>
                <Text style={styles.discountText}>-{discount}%</Text>
              </View>
            )}
            {item.is_premium && (
              <View style={[styles.badge, { backgroundColor: COLORS.gold }]}>
                <Ionicons name="star" size={10} color="#000" />
                <Text style={[styles.badgeText, { color: '#000' }]}>PREMIUM</Text>
              </View>
            )}
          </View>

          <TouchableOpacity
            style={styles.optionsButton}
            onPress={(e) => {
              e.stopPropagation();
              setSelectedProduct(item);
              setActionModalVisible(true);
            }}
          >
            <Ionicons name="ellipsis-horizontal" size={16} color="#fff" />
          </TouchableOpacity>
        </View>

        <View style={styles.cardContent}>
          <Text style={[styles.productTitle, { color: COLORS.text }]} numberOfLines={2}>
            {item.title}
          </Text>

          <View style={styles.sellerRow}>
            {item.seller?.avatar ? (
              <Image source={{ uri: item.seller.avatar }} style={styles.sellerAvatar} />
            ) : (
              <View style={[styles.sellerAvatar, styles.sellerAvatarPlaceholder, { backgroundColor: COLORS.border }]}>
                <Ionicons name="person" size={12} color={COLORS.textSecondary} />
              </View>
            )}
            <Text style={[styles.sellerName, { color: COLORS.textSecondary }]} numberOfLines={1}>
              {item.seller?.name}
            </Text>
            {item.seller?.is_premium && <PremiumBadge size={12} />}
          </View>

          <View style={styles.priceRow}>
            {item.original_price ? (
              <View style={styles.priceContainer}>
                <Text style={[styles.originalPrice, { color: COLORS.textSecondary }]}>
                  ${item.original_price.toFixed(2)}
                </Text>
                <Text style={[styles.promoPrice, { color: COLORS.error }]}>
                  ${item.price.toFixed(2)}
                </Text>
              </View>
            ) : (
              <Text style={[styles.regularPrice, { color: COLORS.accent }]}>
                ${item.price.toFixed(2)}
              </Text>
            )}
          </View>

          <View style={styles.productMetaRow}>
            {item.location && (
              <View style={styles.locationRow}>
                <Ionicons name="location-outline" size={10} color={COLORS.textSecondary} />
                <Text style={[styles.locationText, { color: COLORS.textSecondary }]} numberOfLines={1}>
                  {item.location}
                </Text>
              </View>
            )}
            {item.distance && (
              <Text style={[styles.distanceText, { color: COLORS.textSecondary }]}>
                • {item.distance.toFixed(1)} km
              </Text>
            )}
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  // Pour le mode vertical (grille 2 colonnes)
  const renderVerticalProductCard = ({ item }: { item: Product }) => {
    const discount = item.original_price
      ? Math.round(((item.original_price - item.price) / item.original_price) * 100)
      : 0;
    const imageUrl = item.images?.length > 0 ? item.images[0] : null;
    const cardWidth = (width - 36) / 2;

    return (
      <TouchableOpacity
        activeOpacity={0.95}
        onPress={() => goToDetail(item)}
        style={[
          styles.productCardVertical,
          { backgroundColor: COLORS.card, borderColor: COLORS.border, width: cardWidth },
        ]}
      >
        <View style={styles.imageContainerVertical}>
          {imageUrl ? (
            <Image source={{ uri: imageUrl }} style={styles.productImageVertical} resizeMode="cover" />
          ) : (
            <View style={[styles.imagePlaceholder, { backgroundColor: COLORS.border }]}>
              <Ionicons name="cube-outline" size={30} color={COLORS.textSecondary} />
            </View>
          )}

          <View style={styles.badgeContainer}>
            {item.isPromotion && (
              <View style={[styles.badge, { backgroundColor: COLORS.error }]}>
                <Ionicons name="flash" size={10} color="#fff" />
                <Text style={styles.badgeText}>PROMO</Text>
              </View>
            )}
            {item.is_boosted && !item.isPromotion && (
              <View style={[styles.badge, { backgroundColor: COLORS.accent }]}>
                <Ionicons name="rocket" size={10} color="#fff" />
                <Text style={styles.badgeText}>BOOST</Text>
              </View>
            )}
            {discount > 0 && (
              <View style={[styles.discountBadge, { backgroundColor: COLORS.error }]}>
                <Text style={styles.discountText}>-{discount}%</Text>
              </View>
            )}
            {item.is_premium && (
              <View style={[styles.badge, { backgroundColor: COLORS.gold }]}>
                <Ionicons name="star" size={10} color="#000" />
                <Text style={[styles.badgeText, { color: '#000' }]}>PREMIUM</Text>
              </View>
            )}
          </View>

          <TouchableOpacity
            style={styles.optionsButton}
            onPress={(e) => {
              e.stopPropagation();
              setSelectedProduct(item);
              setActionModalVisible(true);
            }}
          >
            <Ionicons name="ellipsis-horizontal" size={16} color="#fff" />
          </TouchableOpacity>
        </View>

        <View style={styles.cardContent}>
          <Text style={[styles.productTitle, { color: COLORS.text }]} numberOfLines={2}>
            {item.title}
          </Text>

          <View style={styles.sellerRow}>
            {item.seller?.avatar ? (
              <Image source={{ uri: item.seller.avatar }} style={styles.sellerAvatar} />
            ) : (
              <View style={[styles.sellerAvatar, styles.sellerAvatarPlaceholder, { backgroundColor: COLORS.border }]}>
                <Ionicons name="person" size={12} color={COLORS.textSecondary} />
              </View>
            )}
            <Text style={[styles.sellerName, { color: COLORS.textSecondary }]} numberOfLines={1}>
              {item.seller?.name}
            </Text>
            {item.seller?.is_premium && <PremiumBadge size={12} />}
          </View>

          <View style={styles.priceRow}>
            {item.original_price ? (
              <View style={styles.priceContainer}>
                <Text style={[styles.originalPrice, { color: COLORS.textSecondary }]}>
                  ${item.original_price.toFixed(2)}
                </Text>
                <Text style={[styles.promoPrice, { color: COLORS.error }]}>
                  ${item.price.toFixed(2)}
                </Text>
              </View>
            ) : (
              <Text style={[styles.regularPrice, { color: COLORS.accent }]}>
                ${item.price.toFixed(2)}
              </Text>
            )}
          </View>

          <View style={styles.productMetaRow}>
            {item.location && (
              <View style={styles.locationRow}>
                <Ionicons name="location-outline" size={10} color={COLORS.textSecondary} />
                <Text style={[styles.locationText, { color: COLORS.textSecondary }]} numberOfLines={1}>
                  {item.location}
                </Text>
              </View>
            )}
            {item.distance && (
              <Text style={[styles.distanceText, { color: COLORS.textSecondary }]}>
                • {item.distance.toFixed(1)} km
              </Text>
            )}
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  // ========== SECTION BOUTIQUES PREMIUM PROCHES ==========
  const renderShopsSection = () => {
    if (shops.length === 0) return null;
    return (
      <View style={styles.sectionContainer}>
        <View style={styles.sectionHeader}>
          <View style={styles.sectionTitleContainer}>
            <Ionicons name="storefront" size={22} color={COLORS.gold} />
            <Text style={[styles.sectionTitle, { color: COLORS.text }]}>Boutiques premium près de vous</Text>
          </View>
          <TouchableOpacity onPress={handleNearbyShops}>
            <Text style={[styles.seeAllText, { color: COLORS.accent }]}>Voir tout</Text>
          </TouchableOpacity>
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.shopsScrollContent}>
          {shops.map(shop => (
            <TouchableOpacity
              key={shop.id}
              style={[styles.shopCard, { backgroundColor: COLORS.card, borderColor: COLORS.border }]}
              onPress={() => goToShopDetail(shop)}
              activeOpacity={0.9}
            >
              <View style={styles.shopImageContainer}>
                <Image source={{ uri: shop.logo || 'https://via.placeholder.com/80' }} style={styles.shopImage} />
                <View style={[styles.premiumCorner, { backgroundColor: COLORS.gold }]}>
                  <Ionicons name="star" size={12} color="#000" />
                </View>
              </View>
              <View style={styles.shopInfo}>
                <Text style={[styles.shopName, { color: COLORS.text }]} numberOfLines={1}>
                  {shop.nom}
                </Text>
                <View style={styles.shopMetaRow}>
                  <Ionicons name="location-outline" size={12} color={COLORS.textSecondary} />
                  <Text style={[styles.shopDistance, { color: COLORS.textSecondary }]}>
                    {shop.distance.toFixed(1)} km
                  </Text>
                  <VerificationBadge size={12} />
                </View>
                {shop.products_count && (
                  <Text style={[styles.shopProducts, { color: COLORS.textSecondary }]}>
                    {shop.products_count} produits
                  </Text>
                )}
              </View>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>
    );
  };

  // ========== SECTION PRODUITS BOOSTÉS ==========
  const renderBoostedSection = () => {
    const boosted = boostedProducts.length > 0 ? boostedProducts : allProducts.filter(p => p.is_boosted).slice(0, 10);
    if (boosted.length === 0) return null;
    return (
      <View style={styles.sectionContainer}>
        <View style={styles.sectionHeader}>
          <View style={styles.sectionTitleContainer}>
            <Ionicons name="rocket" size={22} color={COLORS.accent} />
            <Text style={[styles.sectionTitle, { color: COLORS.text }]}>Produits Boostés</Text>
          </View>
          <TouchableOpacity onPress={() => router.push('/BoostedProducts')}>
            <Text style={[styles.seeAllText, { color: COLORS.accent }]}>Voir tout</Text>
          </TouchableOpacity>
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.horizontalScrollContent}>
          {boosted.map((item, idx) => (
            <TouchableOpacity
              key={`boosted-${item.id}`}
              activeOpacity={0.95}
              onPress={() => goToDetail(item)}
              style={[
                styles.productCard,
                {
                  backgroundColor: COLORS.card,
                  borderColor: COLORS.border,
                  width: 160,
                  marginRight: 12,
                },
              ]}
            >
              <View style={styles.imageContainer}>
                {item.images[0] ? (
                  <Image source={{ uri: item.images[0] }} style={styles.productImage} resizeMode="cover" />
                ) : (
                  <View style={[styles.imagePlaceholder, { backgroundColor: COLORS.border }]}>
                    <Ionicons name="cube-outline" size={30} color={COLORS.textSecondary} />
                  </View>
                )}
                <View style={styles.badgeContainer}>
                  {item.isPromotion && (
                    <View style={[styles.badge, { backgroundColor: COLORS.error }]}>
                      <Ionicons name="flash" size={10} color="#fff" />
                      <Text style={styles.badgeText}>PROMO</Text>
                    </View>
                  )}
                  {item.original_price && (
                    <View style={[styles.discountBadge, { backgroundColor: COLORS.error }]}>
                      <Text style={styles.discountText}>
                        -{Math.round(((item.original_price - item.price) / item.original_price) * 100)}%
                      </Text>
                    </View>
                  )}
                </View>
              </View>
              <View style={styles.cardContent}>
                <Text style={[styles.productTitle, { color: COLORS.text }]} numberOfLines={2}>
                  {item.title}
                </Text>
                <Text style={[styles.horizontalPrice, { color: COLORS.accent }]}>
                  ${item.price.toFixed(2)}
                </Text>
              </View>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>
    );
  };

  // ========== SECTION MEILLEURES OFFRES ==========
  const renderPromoSection = () => {
    const promos = allProducts.filter(p => p.isPromotion).slice(0, 8);
    if (promos.length === 0) return null;
    return (
      <View style={styles.sectionContainer}>
        <View style={styles.sectionHeader}>
          <View style={styles.sectionTitleContainer}>
            <Ionicons name="flash" size={22} color={COLORS.error} />
            <Text style={[styles.sectionTitle, { color: COLORS.text }]}>Meilleures offres</Text>
          </View>
          <TouchableOpacity onPress={() => router.push('/PromoProducts')}>
            <Text style={[styles.seeAllText, { color: COLORS.accent }]}>Voir tout</Text>
          </TouchableOpacity>
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.horizontalScrollContent}>
          {promos.map((item, idx) => (
            <TouchableOpacity
              key={`promo-${item.id}`}
              activeOpacity={0.95}
              onPress={() => goToDetail(item)}
              style={[
                styles.productCard,
                {
                  backgroundColor: COLORS.card,
                  borderColor: COLORS.border,
                  width: (width - 48) / 3,
                  marginRight: 12,
                },
              ]}
            >
              <View style={styles.imageContainer}>
                {item.images[0] ? (
                  <Image source={{ uri: item.images[0] }} style={styles.productImage} resizeMode="cover" />
                ) : (
                  <View style={[styles.imagePlaceholder, { backgroundColor: COLORS.border }]}>
                    <Ionicons name="cube-outline" size={30} color={COLORS.textSecondary} />
                  </View>
                )}
                <View style={styles.badgeContainer}>
                  <View style={[styles.badge, { backgroundColor: COLORS.error }]}>
                    <Ionicons name="flash" size={10} color="#fff" />
                    <Text style={styles.badgeText}>PROMO</Text>
                  </View>
                </View>
              </View>
              <View style={styles.cardContent}>
                <Text style={[styles.productTitle, { color: COLORS.text }]} numberOfLines={2}>
                  {item.title}
                </Text>
                <Text style={[styles.horizontalPrice, { color: COLORS.accent }]}>
                  ${item.price.toFixed(2)}
                </Text>
              </View>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>
    );
  };

  // ========== SECTION TENDANCES ==========
  const renderTrendingSection = () => {
    if (trendingProducts.length === 0) return null;
    return (
      <View style={styles.sectionContainer}>
        <View style={styles.sectionHeader}>
          <View style={styles.sectionTitleContainer}>
            <Ionicons name="trending-up" size={22} color={COLORS.success} />
            <Text style={[styles.sectionTitle, { color: COLORS.text }]}>Tendances</Text>
          </View>
          <TouchableOpacity onPress={() => router.push('/TrendingProducts')}>
            <Text style={[styles.seeAllText, { color: COLORS.accent }]}>Voir tout</Text>
          </TouchableOpacity>
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.horizontalScrollContent}>
          {trendingProducts.map((item, idx) => (
            <TouchableOpacity
              key={`trending-${item.id}`}
              activeOpacity={0.95}
              onPress={() => goToDetail(item)}
              style={[
                styles.productCard,
                {
                  backgroundColor: COLORS.card,
                  borderColor: COLORS.border,
                  width: (width - 32) / 2,
                  marginRight: 12,
                },
              ]}
            >
              <View style={styles.imageContainer}>
                {item.images[0] ? (
                  <Image source={{ uri: item.images[0] }} style={styles.productImage} resizeMode="cover" />
                ) : (
                  <View style={[styles.imagePlaceholder, { backgroundColor: COLORS.border }]}>
                    <Ionicons name="cube-outline" size={30} color={COLORS.textSecondary} />
                  </View>
                )}
              </View>
              <View style={styles.cardContent}>
                <Text style={[styles.productTitle, { color: COLORS.text }]} numberOfLines={2}>
                  {item.title}
                </Text>
                <Text style={[styles.horizontalPrice, { color: COLORS.accent }]}>
                  ${item.price.toFixed(2)}
                </Text>
              </View>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>
    );
  };

  // ========== SECTION PRODUITS RÉCENTS ==========
  const renderRecentSection = () => {
    const recent = allProducts
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(0, 8);
    if (recent.length === 0) return null;
    return (
      <View style={styles.sectionContainer}>
        <View style={styles.sectionHeader}>
          <View style={styles.sectionTitleContainer}>
            <Ionicons name="time" size={22} color={COLORS.textSecondary} />
            <Text style={[styles.sectionTitle, { color: COLORS.text }]}>Nouveautés</Text>
          </View>
          <TouchableOpacity onPress={() => router.push('/RecentProducts')}>
            <Text style={[styles.seeAllText, { color: COLORS.accent }]}>Voir tout</Text>
          </TouchableOpacity>
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.horizontalScrollContent}>
          {recent.map((item, idx) => (
            <TouchableOpacity
              key={`recent-${item.id}`}
              activeOpacity={0.95}
              onPress={() => goToDetail(item)}
              style={[
                styles.productCard,
                {
                  backgroundColor: COLORS.card,
                  borderColor: COLORS.border,
                  width: (width - 48) / 3,
                  marginRight: 12,
                },
              ]}
            >
              <View style={styles.imageContainer}>
                {item.images[0] ? (
                  <Image source={{ uri: item.images[0] }} style={styles.productImage} resizeMode="cover" />
                ) : (
                  <View style={[styles.imagePlaceholder, { backgroundColor: COLORS.border }]}>
                    <Ionicons name="cube-outline" size={30} color={COLORS.textSecondary} />
                  </View>
                )}
              </View>
              <View style={styles.cardContent}>
                <Text style={[styles.productTitle, { color: COLORS.text }]} numberOfLines={2}>
                  {item.title}
                </Text>
                <Text style={[styles.horizontalPrice, { color: COLORS.accent }]}>
                  ${item.price.toFixed(2)}
                </Text>
              </View>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>
    );
  };

  // ========== SECTION PRODUITS PROCHES ==========
  const renderNearbySection = () => {
    const nearby = allProducts.filter(p => p.distance && p.distance < 10).slice(0, 8);
    if (nearby.length === 0) return null;
    return (
      <View style={styles.sectionContainer}>
        <View style={styles.sectionHeader}>
          <View style={styles.sectionTitleContainer}>
            <Ionicons name="location" size={22} color={COLORS.accent} />
            <Text style={[styles.sectionTitle, { color: COLORS.text }]}>Près de chez vous</Text>
          </View>
          <TouchableOpacity onPress={() => router.push('/NearbyProducts')}>
            <Text style={[styles.seeAllText, { color: COLORS.accent }]}>Voir tout</Text>
          </TouchableOpacity>
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.horizontalScrollContent}>
          {nearby.map((item, idx) => (
            <TouchableOpacity
              key={`nearby-${item.id}`}
              activeOpacity={0.95}
              onPress={() => goToDetail(item)}
              style={[
                styles.productCard,
                {
                  backgroundColor: COLORS.card,
                  borderColor: COLORS.border,
                  width: 160,
                  marginRight: 12,
                },
              ]}
            >
              <View style={styles.imageContainer}>
                {item.images[0] ? (
                  <Image source={{ uri: item.images[0] }} style={styles.productImage} resizeMode="cover" />
                ) : (
                  <View style={[styles.imagePlaceholder, { backgroundColor: COLORS.border }]}>
                    <Ionicons name="cube-outline" size={30} color={COLORS.textSecondary} />
                  </View>
                )}
              </View>
              <View style={styles.cardContent}>
                <Text style={[styles.productTitle, { color: COLORS.text }]} numberOfLines={2}>
                  {item.title}
                </Text>
                <Text style={[styles.horizontalPrice, { color: COLORS.accent }]}>
                  ${item.price.toFixed(2)}
                </Text>
              </View>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>
    );
  };

  // ========== HEADER FIXE AVEC SEULEMENT RECHERCHE ==========
  const renderFixedHeader = () => (
    <View style={[styles.fixedHeader, { backgroundColor: COLORS.headerBg, borderBottomColor: COLORS.border }]}>
      <View style={styles.headerLeft}>
        <TouchableOpacity onPress={() => router.push('/')}>
          <View style={styles.logoContainer}>
            <Ionicons name="cube" size={28} color={COLORS.accent} />
          </View>
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: COLORS.text }]}>SHOPNET</Text>
      </View>
      <View style={styles.headerRight}>
        <TouchableOpacity style={styles.iconButton} onPress={handleSearch}>
          <Ionicons name="search-outline" size={22} color={COLORS.accent} />
        </TouchableOpacity>
      </View>
    </View>
  );

  // ========== LISTE PRINCIPALE (HEADER) ==========
  const renderListHeader = () => (
    <View style={styles.listHeaderContainer}>
      {renderShopsSection()}
      {renderBoostedSection()}
      {renderPromoSection()}
      {renderTrendingSection()}
      {renderRecentSection()}
      {renderNearbySection()}
      <View style={[styles.divider, { backgroundColor: COLORS.border }]} />
      <View style={styles.feedHeader}>
        <Text style={[styles.feedTitle, { color: COLORS.text }]}>Recommandations pour vous</Text>
        <TouchableOpacity
          style={styles.toggleButton}
          onPress={() => setLayoutMode(layoutMode === 'horizontal' ? 'vertical' : 'horizontal')}
        >
          <Ionicons
            name={layoutMode === 'horizontal' ? 'grid-outline' : 'list-outline'}
            size={22}
            color={COLORS.accent}
          />
          <Text style={[styles.toggleText, { color: COLORS.accent }]}>
            {layoutMode === 'horizontal' ? 'Grille' : 'Liste'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  // ========== FOOTER DE CHARGEMENT ==========
  const renderFooter = () => {
    if (loadingMore) {
      return (
        <View style={styles.footerLoader}>
          <ActivityIndicator size="small" color={COLORS.accent} />
          <Text style={[styles.loadingMoreText, { color: COLORS.textSecondary }]}>Chargement...</Text>
        </View>
      );
    }
    if (!hasMore && feedProducts.length > 0) {
      return (
        <View style={styles.noMoreContainer}>
          <Ionicons name="checkmark-circle-outline" size={20} color={COLORS.success} />
          <Text style={[styles.noMoreText, { color: COLORS.textSecondary }]}>Fin du catalogue</Text>
        </View>
      );
    }
    return null;
  };

  // ========== MODAL D'ACTIONS ==========
  const renderActionModal = () => (
    <Modal
      visible={actionModalVisible}
      transparent
      animationType="slide"
      onRequestClose={() => setActionModalVisible(false)}
    >
      <TouchableOpacity
        style={styles.modalOverlay}
        activeOpacity={1}
        onPress={() => setActionModalVisible(false)}
      >
        <View style={[styles.actionModal, { backgroundColor: COLORS.card }]}>
          {selectedProduct && (
            <>
              <View style={styles.modalHeader}>
                <View>
                  <Text style={[styles.modalTitle, { color: COLORS.text }]}>Options</Text>
                  <Text style={[styles.modalSubtitle, { color: COLORS.textSecondary }]} numberOfLines={1}>
                    {selectedProduct.title}
                  </Text>
                </View>
                <TouchableOpacity onPress={() => setActionModalVisible(false)}>
                  <Ionicons name="close" size={24} color={COLORS.textSecondary} />
                </TouchableOpacity>
              </View>
              <View style={styles.modalActions}>
                <TouchableOpacity
                  style={styles.modalAction}
                  onPress={() => {
                    setActionModalVisible(false);
                    goToDetail(selectedProduct);
                  }}
                >
                  <View style={[styles.modalIconContainer, { backgroundColor: COLORS.accentLight }]}>
                    <Ionicons name="eye-outline" size={22} color={COLORS.accent} />
                  </View>
                  <View style={styles.modalActionContent}>
                    <Text style={[styles.modalActionText, { color: COLORS.text }]}>Voir détails</Text>
                    <Text style={[styles.modalActionSubtext, { color: COLORS.textSecondary }]}>
                      Informations complètes du produit
                    </Text>
                  </View>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.modalAction}
                  onPress={() => {
                    setActionModalVisible(false);
                    contactSeller(selectedProduct);
                  }}
                >
                  <View style={[styles.modalIconContainer, { backgroundColor: '#E8F5E9' }]}>
                    <Ionicons name="logo-whatsapp" size={22} color="#25D366" />
                  </View>
                  <View style={styles.modalActionContent}>
                    <Text style={[styles.modalActionText, { color: COLORS.text }]}>Contacter</Text>
                    <Text style={[styles.modalActionSubtext, { color: COLORS.textSecondary }]}>
                      WhatsApp
                    </Text>
                  </View>
                </TouchableOpacity>
              </View>
            </>
          )}
        </View>
      </TouchableOpacity>
    </Modal>
  );

  // ========== ÉTAT DE CHARGEMENT ==========
  if (loading && !isCacheLoaded) {
    return (
      <SafeAreaView style={[styles.loadingContainer, { backgroundColor: COLORS.background }]}>
        <StatusBar barStyle={COLORS.statusBar as any} backgroundColor={COLORS.headerBg} />
        <ActivityIndicator size="large" color={COLORS.accent} />
        <Text style={[styles.loadingText, { color: COLORS.textSecondary }]}>Chargement des produits...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: COLORS.background }]}>
      <StatusBar barStyle={COLORS.statusBar as any} backgroundColor={COLORS.headerBg} />

      {/* HEADER FIXE */}
      {renderFixedHeader()}

      {/* FLATLIST PRINCIPALE (horizontal ou vertical) */}
      <FlatList
        ref={flatListRef}
        data={feedProducts}
        keyExtractor={(item) => `feed-${item.id}`}
        renderItem={layoutMode === 'horizontal' ? renderHorizontalProductCard : renderVerticalProductCard}
        horizontal={layoutMode === 'horizontal'}
        showsHorizontalScrollIndicator={layoutMode === 'horizontal'}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={layoutMode === 'horizontal' ? styles.horizontalListContent : styles.verticalListContent}
        onEndReached={!loadingMore && hasMore ? loadMoreProducts : null}
        onEndReachedThreshold={0.5}
        ListHeaderComponent={renderListHeader()}
        ListFooterComponent={renderFooter()}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[COLORS.accent]}
            tintColor={COLORS.accent}
          />
        }
        ListEmptyComponent={
          !loading && (
            <View style={styles.emptyState}>
              <Ionicons name="cube-outline" size={64} color={COLORS.textSecondary} />
              <Text style={[styles.emptyStateTitle, { color: COLORS.text }]}>Aucun produit</Text>
              <Text style={[styles.emptyStateSubtitle, { color: COLORS.textSecondary }]}>
                Actualisez pour voir les dernières annonces
              </Text>
              <TouchableOpacity
                style={[styles.retryButton, { backgroundColor: COLORS.accent }]}
                onPress={onRefresh}
                activeOpacity={0.8}
              >
                <Ionicons name="refresh-outline" size={20} color="#fff" />
                <Text style={styles.retryButtonText}>Actualiser</Text>
              </TouchableOpacity>
            </View>
          )
        }
      />

      {renderActionModal()}
    </SafeAreaView>
  );
}

// ========== STYLES (sans ombres) ==========
const styles = StyleSheet.create({
  container: { flex: 1 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: 12, fontSize: 16 },
  fixedHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  logoContainer: { width: 40, height: 40, borderRadius: 8, justifyContent: 'center', alignItems: 'center' },
  headerTitle: { fontSize: 20, fontWeight: '700' },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  iconButton: { padding: 4 },

  // Sections
  sectionContainer: { marginBottom: 24 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, marginBottom: 12 },
  sectionTitleContainer: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  sectionTitle: { fontSize: 18, fontWeight: '700' },
  seeAllText: { fontSize: 14, fontWeight: '600' },
  shopsScrollContent: { paddingHorizontal: 16, gap: 12 },
  horizontalScrollContent: { paddingHorizontal: 16, gap: 12 },
  horizontalListContent: { paddingHorizontal: 8, paddingBottom: 20 },
  verticalListContent: { paddingBottom: 20 },

  // Cartes horizontales
  productCardHorizontal: {
    borderRadius: 12,
    borderWidth: 1,
    overflow: 'hidden',
    marginBottom: 12,
  },
  imageContainerHorizontal: {
    position: 'relative',
    width: '100%',
    height: 200,
    backgroundColor: COLORS.border,
  },
  productImageHorizontal: {
    width: '100%',
    height: '100%',
  },
  // Cartes verticales
  productCardVertical: {
    borderRadius: 12,
    borderWidth: 1,
    overflow: 'hidden',
    marginBottom: 12,
  },
  imageContainerVertical: {
    position: 'relative',
    width: '100%',
    aspectRatio: 1,
    backgroundColor: COLORS.border,
  },
  productImageVertical: {
    width: '100%',
    height: '100%',
  },
  // Cartes horizontales pour sections
  productCard: {
    borderRadius: 12,
    borderWidth: 1,
    overflow: 'hidden',
  },
  imageContainer: {
    position: 'relative',
    width: '100%',
    height: 120,
    backgroundColor: COLORS.border,
  },
  productImage: {
    width: '100%',
    height: '100%',
  },
  imagePlaceholder: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  badgeContainer: {
    position: 'absolute',
    top: 8,
    left: 8,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
    zIndex: 2,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 4,
    gap: 2,
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '800',
  },
  discountBadge: {
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 4,
  },
  discountText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '800',
  },
  optionsButton: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 2,
  },
  cardContent: {
    padding: 12,
  },
  productTitle: {
    fontSize: 14,
    fontWeight: '500',
    lineHeight: 18,
    marginBottom: 8,
  },
  sellerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  sellerAvatar: {
    width: 18,
    height: 18,
    borderRadius: 9,
  },
  sellerAvatarPlaceholder: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  sellerName: {
    fontSize: 11,
    flex: 1,
  },
  priceRow: {
    marginBottom: 4,
  },
  priceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  regularPrice: {
    fontSize: 16,
    fontWeight: '700',
  },
  originalPrice: {
    fontSize: 12,
    textDecorationLine: 'line-through',
  },
  promoPrice: {
    fontSize: 16,
    fontWeight: '700',
  },
  horizontalPrice: {
    fontSize: 14,
    fontWeight: '600',
  },
  productMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  locationText: {
    fontSize: 10,
  },
  distanceText: {
    fontSize: 10,
  },

  // Boutiques
  shopCard: {
    width: 180,
    borderRadius: 12,
    borderWidth: 1,
    overflow: 'hidden',
  },
  shopImageContainer: {
    position: 'relative',
    width: '100%',
    height: 100,
  },
  shopImage: {
    width: '100%',
    height: '100%',
  },
  premiumCorner: {
    position: 'absolute',
    top: 8,
    left: 8,
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  shopInfo: {
    padding: 12,
  },
  shopName: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
  },
  shopMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 4,
  },
  shopDistance: {
    fontSize: 12,
  },
  shopProducts: {
    fontSize: 11,
  },

  verificationBadgeContainer: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  verificationBadge: { justifyContent: 'center', alignItems: 'center' },
  premiumBadgeContainer: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  premiumBadge: { borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  verifiedText: { fontSize: 11, fontWeight: '500' },
  premiumText: { fontSize: 11, fontWeight: '500' },

  divider: { height: 8, marginVertical: 8 },
  feedHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  feedTitle: { fontSize: 18, fontWeight: '700' },
  toggleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: COLORS.accent,
  },
  toggleText: { fontSize: 13, fontWeight: '500' },

  footerLoader: { padding: 20, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 8 },
  loadingMoreText: { fontSize: 14 },
  noMoreContainer: { padding: 20, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 6 },
  noMoreText: { fontSize: 13 },

  emptyState: { alignItems: 'center', paddingVertical: 60, paddingHorizontal: 40 },
  emptyStateTitle: { fontSize: 18, fontWeight: '700', marginTop: 16 },
  emptyStateSubtitle: { fontSize: 14, marginTop: 8, textAlign: 'center', marginBottom: 20 },
  retryButton: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 24, paddingVertical: 12, borderRadius: 25 },
  retryButtonText: { color: '#FFFFFF', fontSize: 14, fontWeight: '600' },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  actionModal: { borderTopLeftRadius: 20, borderTopRightRadius: 20, overflow: 'hidden' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  modalTitle: { fontSize: 18, fontWeight: '700', marginBottom: 2 },
  modalSubtitle: { fontSize: 13 },
  modalActions: { padding: 12 },
  modalAction: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, paddingHorizontal: 8, gap: 12 },
  modalIconContainer: { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center' },
  modalActionContent: { flex: 1 },
  modalActionText: { fontSize: 15, fontWeight: '600', marginBottom: 2 },
  modalActionSubtext: { fontSize: 12 },
});