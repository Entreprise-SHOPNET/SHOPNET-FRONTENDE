

import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  Image,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  ActivityIndicator,
  RefreshControl,
  Dimensions,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width } = Dimensions.get('window');
const API_URL = 'https://shopnet-backend.onrender.com/api/products/ai/promotions-feed';
const CACHE_KEY = '@shopnet_promotions_cache';
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes
const ITEMS_PER_PAGE = 8;

const COLORS = {
  background: '#FFFFFF',
  card: '#F9F9F9',
  text: '#1C1C1E',
  textSecondary: '#8E8E93',
  accent: '#FF6B00',
  border: '#E5E5EA',
  success: '#34C759',
  error: '#FF3B30',
};

type PromoProduct = {
  id: number;
  title: string;
  price: number;
  promo_price: number;
  discount: number;
  image: string | null;
  location: string;
  seller: {
    name: string;
    avatar: string | null;
  };
};

type ApiResponse = {
  success: boolean;
  page: number;
  count: number;
  has_more: boolean;
  ai_promotions: boolean;
  products: PromoProduct[];
};

export default function PromotionScreen() {
  const router = useRouter();
  const [products, setProducts] = useState<PromoProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [cacheLoaded, setCacheLoaded] = useState(false);

  const loadCache = async () => {
    try {
      const cached = await AsyncStorage.getItem(CACHE_KEY);
      if (cached) {
        const { data, timestamp } = JSON.parse(cached);
        if (Date.now() - timestamp < CACHE_TTL) {
          setProducts(data.products);
          setHasMore(data.hasMore);
          setPage(data.page);
          setCacheLoaded(true);
          setLoading(false);
        }
      }
    } catch (error) {
      console.error('Erreur chargement cache:', error);
    }
  };

  const saveCache = async (productsData: PromoProduct[], currentPage: number, hasMoreData: boolean) => {
    try {
      const cacheData = {
        timestamp: Date.now(),
        data: { products: productsData, page: currentPage, hasMore: hasMoreData },
      };
      await AsyncStorage.setItem(CACHE_KEY, JSON.stringify(cacheData));
    } catch (error) {
      console.error('Erreur sauvegarde cache:', error);
    }
  };

  const fetchPromotions = async (pageNum: number = 1, shouldCache: boolean = true) => {
    try {
      const url = `${API_URL}?page=${pageNum}&limit=${ITEMS_PER_PAGE}`;
      const response = await fetch(url);
      const data: ApiResponse = await response.json();

      if (data.success && data.products) {
        const newProducts = data.products;
        const hasMoreData = data.has_more === true;

        if (pageNum === 1) {
          setProducts(newProducts);
          setHasMore(hasMoreData);
          if (shouldCache) saveCache(newProducts, pageNum, hasMoreData);
        } else {
          setProducts(prev => [...prev, ...newProducts]);
          setHasMore(hasMoreData);
        }
        setPage(pageNum);
        return true;
      }
      return false;
    } catch (error) {
      console.error('Erreur fetch promotions:', error);
      return false;
    }
  };

  useEffect(() => {
    const init = async () => {
      await loadCache();
      if (!cacheLoaded) setLoading(true);
      await fetchPromotions(1, !cacheLoaded);
      setLoading(false);
    };
    init();
  }, []);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchPromotions(1, true);
    setRefreshing(false);
  }, []);

  const loadMore = useCallback(async () => {
    if (loadingMore || !hasMore) return;
    setLoadingMore(true);
    await fetchPromotions(page + 1, false);
    setLoadingMore(false);
  }, [page, hasMore, loadingMore]);

  const formatPrice = (price: number) => `$${price.toFixed(2)}`;

  const handleProductPress = (productId: number) => {
    router.push({
      pathname: '/(tabs)/Auth/Panier/DetailId',
      params: { id: productId.toString() },
    });
  };

  const renderItem = ({ item }: { item: PromoProduct }) => {
    const imageUrl = item.image || 'https://via.placeholder.com/300';
    return (
      <TouchableOpacity
        style={styles.productCard}
        onPress={() => handleProductPress(item.id)}
        activeOpacity={0.9}
      >
        <View style={styles.imageContainer}>
          <Image source={{ uri: imageUrl }} style={styles.productImage} resizeMode="cover" />
          {item.discount > 0 && (
            <View style={styles.discountBadge}>
              <Text style={styles.discountText}>-{item.discount}%</Text>
            </View>
          )}
        </View>
        <View style={styles.infoContainer}>
          <Text style={styles.title} numberOfLines={2}>{item.title}</Text>
          <View style={styles.priceRow}>
            <Text style={styles.promoPrice}>{formatPrice(item.promo_price)}</Text>
            <Text style={styles.originalPrice}>{formatPrice(item.price)}</Text>
          </View>
          {item.location ? (
            <View style={styles.locationRow}>
              <Ionicons name="location-outline" size={12} color={COLORS.textSecondary} />
              <Text style={styles.locationText} numberOfLines={1}>{item.location}</Text>
            </View>
          ) : null}
        </View>
      </TouchableOpacity>
    );
  };

  const renderFooter = () => {
    if (!loadingMore) return null;
    return (
      <View style={styles.footerLoader}>
        <ActivityIndicator size="small" color={COLORS.accent} />
        <Text style={styles.footerText}>Chargement...</Text>
      </View>
    );
  };

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <Ionicons name="pricetag-outline" size={64} color={COLORS.textSecondary} />
      <Text style={styles.emptyText}>Aucune promotion disponible</Text>
    </View>
  );

  if (loading && !cacheLoaded) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <StatusBar barStyle="dark-content" backgroundColor={COLORS.background} />
        <ActivityIndicator size="large" color={COLORS.accent} />
        <Text style={styles.loadingText}>Chargement des promotions...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.background} />
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.headerButton}>
          <Ionicons name="arrow-back" size={24} color={COLORS.text} />
        </TouchableOpacity>
        <View style={styles.headerTextContainer}>
          <Text style={styles.mainTitle}>💰 Promotions actives</Text>
          <Text style={styles.subTitle}>
            Découvrez les meilleures offres du moment et profitez des réductions avant leur expiration.
          </Text>
        </View>
        <View style={{ width: 40 }} />
      </View>

      <FlatList
        data={products}
        keyExtractor={(item) => item.id.toString()}
        renderItem={renderItem}
        numColumns={2}
        columnWrapperStyle={styles.columnWrapper}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        onEndReached={loadMore}
        onEndReachedThreshold={0.3}
        ListFooterComponent={renderFooter}
        ListEmptyComponent={renderEmpty}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[COLORS.accent]}
            tintColor={COLORS.accent}
          />
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: COLORS.background },
  loadingText: { marginTop: 12, fontSize: 16, color: COLORS.textSecondary },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  headerButton: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },
  headerTextContainer: {
    flex: 1,
    marginLeft: 8,
  },
  mainTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 2,
  },
  subTitle: {
    fontSize: 12,
    color: COLORS.textSecondary,
    lineHeight: 16,
  },
  listContent: { paddingHorizontal: 12, paddingBottom: 20 },
  columnWrapper: { justifyContent: 'space-between', marginBottom: 12 },
  productCard: {
    width: (width - 36) / 2,
    backgroundColor: COLORS.card,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  imageContainer: { position: 'relative', width: '100%', aspectRatio: 1 },
  productImage: { width: '100%', height: '100%' },
  discountBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: COLORS.accent,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 20,
  },
  discountText: { color: '#fff', fontSize: 12, fontWeight: '700' },
  infoContainer: { padding: 8 },
  title: { fontSize: 13, fontWeight: '500', color: COLORS.text, marginBottom: 4, lineHeight: 18 },
  priceRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
  promoPrice: { fontSize: 15, fontWeight: '700', color: COLORS.accent, marginRight: 6 },
  originalPrice: { fontSize: 12, color: COLORS.textSecondary, textDecorationLine: 'line-through' },
  locationRow: { flexDirection: 'row', alignItems: 'center', marginTop: 2 },
  locationText: { fontSize: 11, color: COLORS.textSecondary, marginLeft: 4 },
  footerLoader: { paddingVertical: 20, alignItems: 'center' },
  footerText: { marginTop: 8, fontSize: 14, color: COLORS.textSecondary },
  emptyContainer: { alignItems: 'center', justifyContent: 'center', paddingVertical: 60 },
  emptyText: { fontSize: 16, color: COLORS.text, marginTop: 12 },
});