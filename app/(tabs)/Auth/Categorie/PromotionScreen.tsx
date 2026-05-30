

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
import { useTheme } from "../../../../app/theme/ThemeContext";

const { width } = Dimensions.get('window');
const API_URL = 'https://shopnet-backend.onrender.com/api/products/ai/promotions-feed';
const CACHE_KEY = '@shopnet_promotions_cache';
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes
const ITEMS_PER_PAGE = 8;

// Hook pour les couleurs dynamiques
const useDynamicColors = () => {
  const { isDark } = useTheme();

  return {
    background: isDark ? '#0D0D0D' : '#FFFFFF',
    card: isDark ? '#1A1A1A' : '#F9F9F9',
    text: isDark ? '#F5F5F5' : '#1C1C1E',
    textSecondary: isDark ? '#B0B0B0' : '#8E8E93',
    accent: '#FF6B00',
    border: isDark ? '#2E2E2E' : '#E5E5EA',
    success: '#34C759',
    error: '#FF3B30',
    statusBar: isDark ? '#0D0D0D' : '#FFFFFF',
    barStyle: isDark ? 'light-content' as const : 'dark-content' as const,
    loadingBg: isDark ? '#0D0D0D' : '#FFFFFF',
    headerBorder: isDark ? '#2E2E2E' : '#E5E5EA',
    emptyIcon: isDark ? '#666666' : '#8E8E93',
  };
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
  const COLORS = useDynamicColors();
  const { isDark } = useTheme();
  
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
        style={[styles.productCard, { backgroundColor: COLORS.card, borderColor: COLORS.border }]}
        onPress={() => handleProductPress(item.id)}
        activeOpacity={0.9}
      >
        <View style={styles.imageContainer}>
          <Image source={{ uri: imageUrl }} style={styles.productImage} resizeMode="cover" />
          {item.discount > 0 && (
            <View style={[styles.discountBadge, { backgroundColor: COLORS.accent }]}>
              <Text style={styles.discountText}>-{item.discount}%</Text>
            </View>
          )}
        </View>
        <View style={styles.infoContainer}>
          <Text style={[styles.title, { color: COLORS.text }]} numberOfLines={2}>{item.title}</Text>
          <View style={styles.priceRow}>
            <Text style={[styles.promoPrice, { color: COLORS.accent }]}>{formatPrice(item.promo_price)}</Text>
            <Text style={[styles.originalPrice, { color: COLORS.textSecondary }]}>{formatPrice(item.price)}</Text>
          </View>
          {item.location ? (
            <View style={styles.locationRow}>
              <Ionicons name="location-outline" size={12} color={COLORS.textSecondary} />
              <Text style={[styles.locationText, { color: COLORS.textSecondary }]} numberOfLines={1}>{item.location}</Text>
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
        <Text style={[styles.footerText, { color: COLORS.textSecondary }]}>Chargement...</Text>
      </View>
    );
  };

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <Ionicons name="pricetag-outline" size={64} color={COLORS.emptyIcon} />
      <Text style={[styles.emptyText, { color: COLORS.text }]}>Aucune promotion disponible</Text>
    </View>
  );

  if (loading && !cacheLoaded) {
    return (
      <SafeAreaView style={[styles.loadingContainer, { backgroundColor: COLORS.loadingBg }]}>
        <StatusBar backgroundColor={COLORS.statusBar} barStyle={COLORS.barStyle} />
        <ActivityIndicator size="large" color={COLORS.accent} />
        <Text style={[styles.loadingText, { color: COLORS.textSecondary }]}>Chargement des promotions...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: COLORS.background }]}>
      <StatusBar backgroundColor={COLORS.statusBar} barStyle={COLORS.barStyle} />
      <View style={[styles.header, { borderBottomColor: COLORS.headerBorder }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.headerButton}>
          <Ionicons name="arrow-back" size={24} color={COLORS.text} />
        </TouchableOpacity>
        <View style={styles.headerTextContainer}>
          <Text style={[styles.mainTitle, { color: COLORS.text }]}>💰 Promotions actives</Text>
          <Text style={[styles.subTitle, { color: COLORS.textSecondary }]}>
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
  container: { flex: 1 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: 12, fontSize: 16 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  headerButton: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },
  headerTextContainer: {
    flex: 1,
    marginLeft: 8,
  },
  mainTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 2,
  },
  subTitle: {
    fontSize: 12,
    lineHeight: 16,
  },
  listContent: { paddingHorizontal: 12, paddingBottom: 20 },
  columnWrapper: { justifyContent: 'space-between', marginBottom: 12 },
  productCard: {
    width: (width - 36) / 2,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
  },
  imageContainer: { position: 'relative', width: '100%', aspectRatio: 1 },
  productImage: { width: '100%', height: '100%' },
  discountBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 20,
  },
  discountText: { color: '#FFFFFF', fontSize: 12, fontWeight: '700' },
  infoContainer: { padding: 8 },
  title: { fontSize: 13, fontWeight: '500', marginBottom: 4, lineHeight: 18 },
  priceRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
  promoPrice: { fontSize: 15, fontWeight: '700', marginRight: 6 },
  originalPrice: { fontSize: 12, textDecorationLine: 'line-through' },
  locationRow: { flexDirection: 'row', alignItems: 'center', marginTop: 2 },
  locationText: { fontSize: 11, marginLeft: 4 },
  footerLoader: { paddingVertical: 20, alignItems: 'center' },
  footerText: { marginTop: 8, fontSize: 14 },
  emptyContainer: { alignItems: 'center', justifyContent: 'center', paddingVertical: 60 },
  emptyText: { fontSize: 16, marginTop: 12 },
});