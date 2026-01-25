


import React, { useEffect, useState, useRef } from 'react';
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
  AppStateStatus
} from 'react-native';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

const { width } = Dimensions.get('window');
const LOCAL_API = 'https://shopnet-backend.onrender.com/api';

const SHOPNET_BLUE = "#00182A";
const PRO_BLUE = "#42A5F5";
const PREMIUM_GOLD = "#FFD700";
const CARD_BG = "#1E2A3B";
const TEXT_WHITE = "#FFFFFF";
const TEXT_SECONDARY = "#A0AEC0";
const SUCCESS_GREEN = "#4CAF50";
const ERROR_RED = "#FF6B6B";

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
};

const sendPresence = async () => {
  try {
    const userId = await AsyncStorage.getItem('userId');
    
    if (!userId) {
      console.log('Aucun userId trouvé pour l\'envoi de présence');
      return;
    }
    
    await axios.post(`${LOCAL_API}/admin/dashboard/update-activity`, {
      userId
    });
    
    console.log('Présence envoyée avec succès pour userId:', userId);
  } catch (error: any) {
    console.error('Erreur lors de l\'envoi de présence:', error.message);
  }
};

const DiscoverScreen = () => {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [products, setProducts] = useState<(Product | Promotion)[]>([]);
  const [originalProducts, setOriginalProducts] = useState<(Product | Promotion)[]>([]);
  const [token, setToken] = useState<string | null>(null);
  const [selectedProduct, setSelectedProduct] = useState<any>(null);
  const [actionModalVisible, setActionModalVisible] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [isShuffled, setIsShuffled] = useState(false);
  const [columns, setColumns] = useState(2);
  const [flatListKey, setFlatListKey] = useState('2-columns'); // Clé pour forcer le re-render

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;
  
  const presenceIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;
    
    loadToken();
    startEntranceAnimation();
    
    setupPresenceSystem();
    
    const appStateSubscription = AppState.addEventListener('change', handleAppStateChange);
    
    return () => {
      isMountedRef.current = false;
      cleanupPresenceSystem();
      appStateSubscription.remove();
    };
  }, []);

  const setupPresenceSystem = async () => {
    try {
      await sendPresence();
      
      presenceIntervalRef.current = setInterval(async () => {
        if (isMountedRef.current) {
          await sendPresence();
        }
      }, 300000);
      
      console.log('Système de présence initialisé');
    } catch (error) {
      console.error('Erreur lors de l\'initialisation du système de présence:', error);
    }
  };

  const cleanupPresenceSystem = () => {
    if (presenceIntervalRef.current) {
      clearInterval(presenceIntervalRef.current);
      presenceIntervalRef.current = null;
      console.log('Système de présence nettoyé');
    }
  };

  const handleAppStateChange = async (nextAppState: AppStateStatus) => {
    if (nextAppState === 'active') {
      await sendPresence();
      
      if (!presenceIntervalRef.current && isMountedRef.current) {
        setupPresenceSystem();
      }
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
      if (storedToken) {
        setToken(storedToken);
        await fetchMixedProducts(storedToken, 1, true);
      } else {
        console.error('Aucun token trouvé');
        setLoading(false);
      }
    } catch (err) {
      console.error('Erreur chargement token:', err);
      setLoading(false);
    }
  };

  const fetchMixedProducts = async (jwtToken: string, pageNum = 1, initial = false) => {
    try {
      if (!initial) setLoadingMore(true);

      const limit = 5;

      const regularResponse = await axios.get(`${LOCAL_API}/all-products`, {
        headers: { Authorization: `Bearer ${jwtToken}` },
        params: { page: pageNum, limit },
      });

      const promotionResponse = await axios.get(`${LOCAL_API}/promotions`, {
        headers: { Authorization: `Bearer ${jwtToken}` },
      });

      let regularProducts: Product[] = [];
      let promotionProducts: Promotion[] = [];

      if (regularResponse.data.success) regularProducts = regularResponse.data.products || [];
      if (promotionResponse.data.success) {
        promotionProducts = (promotionResponse.data.promotions || []).map((promo: Promotion) => ({
          ...promo,
          time_remaining: calculateTimeRemaining(promo.created_at, promo.duration_days)
        }));
      }

      const allProducts = [...regularProducts, ...promotionProducts].sort(() => Math.random() - 0.5);

      if (initial) {
        setOriginalProducts(allProducts);
        if (isShuffled) {
          setProducts(shuffleArray([...allProducts]));
        } else {
          setProducts(allProducts);
        }
      } else {
        const updatedOriginalProducts = [...originalProducts, ...allProducts];
        setOriginalProducts(updatedOriginalProducts);
        
        if (isShuffled) {
          setProducts(prevProducts => [...prevProducts, ...allProducts]);
        } else {
          setProducts(updatedOriginalProducts);
        }
      }

      setHasMore(regularProducts.length === limit);
      setPage(pageNum);

    } catch (err: any) {
      console.error('Erreur API produits:', err.message);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
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

  useEffect(() => {
    const interval = setInterval(() => {
      setProducts(prev =>
        prev.map(item =>
          'duration_days' in item && item.created_at
            ? { ...item, time_remaining: calculateTimeRemaining(item.created_at, item.duration_days) }
            : item
        )
      );
    }, 60000);
    return () => clearInterval(interval);
  }, []);

  const loadMoreProducts = () => {
    if (!loadingMore && hasMore && token) fetchMixedProducts(token, page + 1, false);
  };

  const showActionModal = (product: any) => {
    setSelectedProduct(product);
    setActionModalVisible(true);
  };

  const hideActionModal = () => {
    setActionModalVisible(false);
    setSelectedProduct(null);
  };

  const calculateDiscount = (original: number, promo: number) =>
    Math.round(((original - promo) / original) * 100);

  const getProductId = (item: Product | Promotion): number =>
    'product_id' in item ? item.product_id : item.id;

  const getProductTitle = (item: Product | Promotion): string =>
    'product_title' in item ? item.product_title : item.title;

  const getProductPrice = (item: Product | Promotion): number =>
    'promo_price' in item ? item.promo_price : item.price;

  const getProductImages = (item: Product | Promotion): string[] => {
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
    return item.images || [];
  };

  const isPromotion = (item: Product | Promotion) => 'promotionId' in item;

  const shuffleArray = (array: any[]) => {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  };

  const toggleShuffle = () => {
    if (isShuffled) {
      setProducts(originalProducts);
    } else {
      setProducts(shuffleArray([...products]));
    }
    setIsShuffled(!isShuffled);
  };

  const toggleColumns = () => {
    const newColumns = columns === 2 ? 3 : 2;
    setColumns(newColumns);
    setFlatListKey(`${newColumns}-columns-${Date.now()}`); // Changer la clé pour forcer un nouveau rendu
  };

  const renderProductItem = ({ item, index }: { item: Product | Promotion; index: number }) => {
    const productId = getProductId(item);
    const productTitle = getProductTitle(item);
    const productPrice = getProductPrice(item);
    const images = getProductImages(item);
    const isPromo = isPromotion(item);
    const promotionItem = item as Promotion;
    const discount = isPromo ? calculateDiscount(Number(promotionItem.original_price), Number(promotionItem.promo_price)) : 0;
    const isExpired = isPromo && promotionItem.time_remaining === 'Expirée';
    const imageUrl = images.length > 0 ? images[0] : null;

    const cardWidth = columns === 2 
      ? (width - 36) / 2  // 2 colonnes : padding 12 * 2 + gap 12 = 36
      : (width - 48) / 3; // 3 colonnes : padding 12 * 2 + gap 12 * 2 = 48

    return (
      <Animated.View
        style={[
          styles.productCard, 
          { 
            opacity: fadeAnim, 
            transform: [{ translateY: slideAnim }],
            width: cardWidth
          }
        ]}
      >
        <TouchableOpacity
          onPress={() => {
            const path = isPromo ? '/(tabs)/Auth/Panier/PromoDetail' : '/(tabs)/Auth/Panier/DetailId';
            router.push({ pathname: path, params: { id: productId.toString() } });
          }}
          activeOpacity={0.9}
        >
          <View style={styles.imageContainer}>
            {imageUrl ? (
              <Image source={{ uri: imageUrl }} style={styles.productImage} resizeMode="cover" />
            ) : (
              <View style={styles.imagePlaceholder}>
                <Ionicons name="cube-outline" size={40} color={TEXT_SECONDARY} />
                <Text style={styles.placeholderText}>Aucune image</Text>
              </View>
            )}
            <View style={styles.imageHeader}>
              <View style={styles.leftBadges}>
                {isPromo && (
                  <View style={styles.promotionBadge}>
                    <Ionicons name="flash" size={12} color={TEXT_WHITE} />
                    <Text style={styles.promotionBadgeText}>PROMO</Text>
                  </View>
                )}
                <View style={styles.categoryBadge}>
                  <Text style={styles.categoryBadgeText}>{'category' in item ? item.category : 'Promotion'}</Text>
                </View>
              </View>
              <View style={styles.rightActions}>
                {isPromo && (
                  <View style={[styles.timeBadge, isExpired ? styles.timeBadgeExpired : styles.timeBadgeActive]}>
                    <Ionicons name={isExpired ? "time-outline" : "timer-outline"} size={10} color={TEXT_WHITE} />
                    <Text style={styles.timeBadgeText}>{promotionItem.time_remaining}</Text>
                  </View>
                )}
                <TouchableOpacity style={styles.threeDotsButton} onPress={(e) => { e.stopPropagation(); showActionModal(item); }}>
                  <Ionicons name="ellipsis-horizontal" size={16} color={TEXT_WHITE} />
                </TouchableOpacity>
              </View>
            </View>
          </View>

          <View style={styles.cardContent}>
            <Text style={styles.productTitle} numberOfLines={2}>{productTitle}</Text>
            <View style={styles.priceRow}>
              {isPromo ? (
                <View style={styles.promotionPriceContainer}>
                  <Text style={styles.originalPrice}>${Number(promotionItem.original_price).toFixed(2)}</Text>
                  <Text style={styles.promoPrice}>${Number(productPrice).toFixed(2)}</Text>
                  <View style={styles.discountBadge}>
                    <Text style={styles.discountText}>-{discount}%</Text>
                  </View>
                </View>
              ) : (
                <Text style={styles.regularPrice}>${Number(productPrice).toFixed(2)}</Text>
              )}
            </View>
            {isPromo && promotionItem.description && <Text style={styles.promotionDescription} numberOfLines={2}>{promotionItem.description}</Text>}
          </View>
        </TouchableOpacity>
      </Animated.View>
    );
  };

  const renderActionModal = () => (
    <Modal visible={actionModalVisible} transparent animationType="fade" onRequestClose={hideActionModal}>
      <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={hideActionModal}>
        <View style={styles.actionModal}>
          {selectedProduct && (
            <>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Options Produit</Text>
                <Text style={styles.modalSubtitle} numberOfLines={1}>{getProductTitle(selectedProduct)}</Text>
              </View>
              <View style={styles.modalActions}>
                <TouchableOpacity 
                  style={styles.modalAction}
                  onPress={() => {
                    hideActionModal();
                    const productId = getProductId(selectedProduct);
                    const path = isPromotion(selectedProduct) ? '/(tabs)/Auth/Panier/PromoDetail' : '/(tabs)/Auth/Panier/DetailId';
                    router.push({ pathname: path, params: { id: productId.toString() } });
                  }}
                >
                  <Ionicons name="eye-outline" size={24} color={PRO_BLUE} />
                  <Text style={styles.modalActionText}>Voir les détails</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.modalAction}>
                  <Ionicons name="chatbubble-ellipses-outline" size={24} color={PRO_BLUE} />
                  <Text style={styles.modalActionText}>Contacter le vendeur</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.modalAction, styles.reportAction]} onPress={hideActionModal}>
                  <Ionicons name="share-outline" size={24} color={PRO_BLUE} />
                  <Text style={styles.modalActionText}>Partager</Text>
                </TouchableOpacity>
              </View>
              <TouchableOpacity style={styles.modalCancel} onPress={hideActionModal}>
                <Text style={styles.modalCancelText}>Annuler</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      </TouchableOpacity>
    </Modal>
  );

  const renderFooter = () => loadingMore ? (
    <View style={styles.footerLoader}>
      <ActivityIndicator size="small" color={PRO_BLUE} />
      <Text style={styles.loadingMoreText}>Chargement...</Text>
    </View>
  ) : null;

  if (loading) return (
    <SafeAreaView style={styles.loadingContainer}>
      <StatusBar backgroundColor={SHOPNET_BLUE} barStyle="light-content" />
      <View style={styles.loadingContent}>
        <ActivityIndicator size="large" color={PRO_BLUE} />
        <Text style={styles.loadingText}>Chargement des produits...</Text>
      </View>
    </SafeAreaView>
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar backgroundColor={SHOPNET_BLUE} barStyle="light-content" />
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Ionicons name="cube-outline" size={28} color={PRO_BLUE} />
          <Text style={styles.headerTitle}>Découvrir</Text>
        </View>
        <View style={styles.headerRight}>
          <TouchableOpacity 
            style={[styles.iconButton, isShuffled && styles.iconButtonActive]}
            onPress={toggleShuffle}
          >
            <Ionicons 
              name={isShuffled ? "shuffle" : "shuffle-outline"} 
              size={22} 
              color={isShuffled ? PREMIUM_GOLD : PRO_BLUE} 
            />
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.iconButton, columns === 3 && styles.iconButtonActive]}
            onPress={toggleColumns}
          >
            <Ionicons 
              name={columns === 2 ? "grid" : "grid-outline"} 
              size={22} 
              color={columns === 3 ? PREMIUM_GOLD : PRO_BLUE} 
            />
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.iconButton}
            onPress={() => router.push('/(tabs)/Auth/Produits/Recherche')}
          >
            <Ionicons name="search-outline" size={22} color={PRO_BLUE} />
          </TouchableOpacity>
        </View>
      </View>
      <FlatList
        key={flatListKey} // Clé dynamique pour forcer un nouveau rendu
        data={products}
        keyExtractor={(item, index) => `product-${getProductId(item)}-${index}-${columns}`}
        renderItem={renderProductItem}
        numColumns={columns}
        columnWrapperStyle={columns > 1 ? styles.columnWrapper : undefined}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        onEndReached={loadMoreProducts}
        onEndReachedThreshold={0.5}
        ListFooterComponent={renderFooter}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Ionicons name="cube-outline" size={64} color={TEXT_SECONDARY} />
            <Text style={styles.emptyStateTitle}>Aucun produit disponible</Text>
            <Text style={styles.emptyStateText}>Les produits apparaîtront ici lorsqu'ils seront ajoutés</Text>
          </View>
        }
      />
      {renderActionModal()}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: SHOPNET_BLUE,
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: SHOPNET_BLUE,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingContent: {
    alignItems: 'center',
  },
  loadingText: {
    color: PRO_BLUE,
    fontSize: 16,
    fontWeight: "600",
    marginTop: 12,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: SHOPNET_BLUE,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: TEXT_WHITE,
    marginLeft: 12,
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#0A1420',
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconButtonActive: {
    backgroundColor: 'rgba(255, 215, 0, 0.1)',
  },
  listContent: {
    paddingHorizontal: 12,
    paddingBottom: 20,
  },
  columnWrapper: {
    justifyContent: 'space-between',
    gap: 12,
  },
  productCard: {
    backgroundColor: CARD_BG,
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 12,
  },
  imageContainer: {
    position: 'relative',
  },
  productImage: {
    width: '100%',
    height: 150,
    backgroundColor: '#2C3A4A',
  },
  imagePlaceholder: {
    height: 150,
    backgroundColor: '#2C3A4A',
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholderText: {
    color: TEXT_SECONDARY,
    fontSize: 12,
    marginTop: 8,
  },
  imageHeader: {
    position: 'absolute',
    top: 8,
    left: 8,
    right: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    zIndex: 2,
  },
  leftBadges: {
    flexDirection: 'column',
    alignItems: 'flex-start',
    gap: 4,
  },
  rightActions: {
    flexDirection: 'column',
    alignItems: 'flex-end',
    gap: 4,
  },
  promotionBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: PREMIUM_GOLD,
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 4,
  },
  promotionBadgeText: {
    color: SHOPNET_BLUE,
    fontSize: 10,
    fontWeight: '800',
    marginLeft: 2,
  },
  timeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 4,
  },
  timeBadgeActive: {
    backgroundColor: ERROR_RED,
  },
  timeBadgeExpired: {
    backgroundColor: TEXT_SECONDARY,
  },
  timeBadgeText: {
    color: TEXT_WHITE,
    fontSize: 9,
    fontWeight: '700',
    marginLeft: 2,
  },
  categoryBadge: {
    backgroundColor: "rgba(66, 165, 245, 0.9)",
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 4,
  },
  categoryBadgeText: {
    color: TEXT_WHITE,
    fontSize: 10,
    fontWeight: '600',
  },
  threeDotsButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardContent: {
    padding: 12,
  },
  productTitle: {
    color: TEXT_WHITE,
    fontSize: 14,
    fontWeight: '600',
    lineHeight: 18,
    marginBottom: 8,
  },
  priceRow: {
    marginBottom: 8,
  },
  regularPrice: {
    color: PRO_BLUE,
    fontWeight: '800',
    fontSize: 16,
  },
  promotionPriceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
  },
  originalPrice: {
    color: TEXT_SECONDARY,
    fontSize: 12,
    fontWeight: '600',
    textDecorationLine: 'line-through',
  },
  promoPrice: {
    color: PREMIUM_GOLD,
    fontWeight: '800',
    fontSize: 16,
  },
  discountBadge: {
    backgroundColor: SUCCESS_GREEN,
    paddingHorizontal: 4,
    paddingVertical: 2,
    borderRadius: 4,
  },
  discountText: {
    color: TEXT_WHITE,
    fontSize: 10,
    fontWeight: '700',
  },
  promotionDescription: {
    color: TEXT_SECONDARY,
    fontSize: 11,
    lineHeight: 14,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 60,
    paddingHorizontal: 40,
  },
  emptyStateTitle: {
    color: TEXT_WHITE,
    fontSize: 18,
    fontWeight: '700',
    marginTop: 16,
    textAlign: 'center',
  },
  emptyStateText: {
    color: TEXT_SECONDARY,
    fontSize: 14,
    marginTop: 8,
    textAlign: 'center',
    lineHeight: 20,
  },
  footerLoader: {
    padding: 20,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
  },
  loadingMoreText: {
    color: PRO_BLUE,
    fontSize: 14,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'flex-end',
  },
  actionModal: {
    backgroundColor: CARD_BG,
    margin: 16,
    borderRadius: 16,
    overflow: 'hidden',
  },
  modalHeader: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(66, 165, 245, 0.1)",
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: TEXT_WHITE,
    marginBottom: 4,
  },
  modalSubtitle: {
    fontSize: 14,
    color: TEXT_SECONDARY,
    textAlign: 'center',
  },
  modalActions: {
    paddingVertical: 8,
  },
  modalAction: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  modalActionText: {
    fontSize: 16,
    color: TEXT_WHITE,
    marginLeft: 12,
  },
  reportAction: {
    borderTopWidth: 1,
    borderTopColor: "rgba(66, 165, 245, 0.1)",
  },
  modalCancel: {
    padding: 16,
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: "rgba(66, 165, 245, 0.1)",
  },
  modalCancelText: {
    fontSize: 17,
    fontWeight: '600',
    color: PRO_BLUE,
  },
});

export default DiscoverScreen;