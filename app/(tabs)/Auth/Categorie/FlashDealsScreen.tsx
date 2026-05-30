
import React, { useEffect, useState, useCallback, useRef } from "react";
import {
  View,
  Text,
  Image,
  ActivityIndicator,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  FlatList,
  SafeAreaView,
  StatusBar,
  RefreshControl,
  Animated,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useTheme } from "../../../../app/theme/ThemeContext";

const { width } = Dimensions.get("window");

// ============================================
// CONFIGURATION
// ============================================
const API_URL = "https://shopnet-backend.onrender.com/api/products/ai/flash-deals";
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

// ============================================
// HOOK COULEURS DYNAMIQUES
// ============================================
const useDynamicColors = () => {
  const { isDark } = useTheme();

  return {
    background: isDark ? '#0D0D0D' : '#F5F5F5',
    surface: isDark ? '#1A1A1A' : '#FFFFFF',
    card: isDark ? '#1A1A1A' : '#FFFFFF',
    border: isDark ? '#2E2E2E' : '#EEEEEE',
    text: isDark ? '#F5F5F5' : '#1A1A1A',
    textSecondary: isDark ? '#B0B0B0' : '#666666',
    textTertiary: isDark ? '#888888' : '#999999',
    accent: '#FF6B00',
    discount: '#FF4444',
    bestPrice: '#4CAF50',
    imageBg: isDark ? '#222222' : '#F9F9F9',
    placeholderBg: isDark ? '#222222' : '#F9F9F9',
    sellerBg: isDark ? '#2A2A2A' : '#EEEEEE',
    distanceBg: isDark ? '#2A2A2A' : '#EEEEEE',
    headerBg: isDark ? '#1A1A1A' : '#FFFFFF',
    headerBorder: isDark ? '#2E2E2E' : '#EEEEEE',
    headerIcon: isDark ? '#F5F5F5' : '#1A1A1A',
    statusBar: isDark ? '#0D0D0D' : '#FFFFFF',
    barStyle: isDark ? 'light-content' as const : 'dark-content' as const,
    loadingBg: isDark ? '#0D0D0D' : '#FFFFFF',
    emptyIcon: isDark ? '#666666' : '#999999',
    retryBg: '#FF6B00',
    retryText: '#FFFFFF',
    white: '#FFFFFF',
  };
};

// ============================================
// TYPES
// ============================================
type Product = {
  id: number;
  title: string;
  price: number;
  old_price: number | null;
  discount: number;
  image: string | null;
  location: string | null;
  score: number;
  distance: number | null;
  seller: {
    name: string;
    avatar: string | null;
  };
};

type Row = {
  key: string;
  items: Product[];
};

// ============================================
// FONCTIONS UTILITAIRES
// ============================================
const formatPrice = (price: any): string => {
  const num = Number(price);
  return isNaN(num) ? "0.00" : num.toFixed(2);
};

const formatDistance = (km: number | null) => {
  if (!km) return null;
  if (km < 1) return `${Math.round(km * 1000)} m`;
  return `${km.toFixed(1)} km`;
};

const shuffleArray = <T,>(array: T[]): T[] => {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
};

const buildRows = (products: Product[]): Row[] => {
  const rows: Row[] = [];
  let idx = 0;
  const pattern = [3, 2, 4, 2];
  let patternIndex = 0;

  while (idx < products.length) {
    const cols = pattern[patternIndex % pattern.length];
    const items = products.slice(idx, idx + cols);
    if (items.length > 0) {
      rows.push({ key: `row-${rows.length}`, items });
    }
    idx += cols;
    patternIndex++;
  }
  return rows;
};

// ============================================
// COMPOSANT CARTE PRODUIT
// ============================================
const ProductCard = ({
  item,
  onPress,
  showCategoryBadge = true,
  colors,
}: {
  item: Product;
  onPress: () => void;
  showCategoryBadge?: boolean;
  colors: any;
}) => {
  const [imageLoaded, setImageLoaded] = useState(false);
  const hasDiscount = item.discount > 0;
  const isCheapest = item.score > 100;
  const price = Number(item.price) || 0;
  const oldPrice = item.old_price ? Number(item.old_price) : null;

  return (
    <TouchableOpacity style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]} onPress={onPress} activeOpacity={0.7}>
      <View style={[styles.imageContainer, { backgroundColor: colors.imageBg }]}>
        {!imageLoaded && (
          <View style={[styles.imagePlaceholder, { backgroundColor: colors.placeholderBg }]}>
            <ActivityIndicator size="small" color={colors.accent} />
          </View>
        )}
        <Image
          source={{ uri: item.image || "https://via.placeholder.com/300" }}
          style={styles.productImage}
          onLoad={() => setImageLoaded(true)}
          onError={() => setImageLoaded(true)}
        />
        {showCategoryBadge && (
          <View style={[styles.categoryBadge, { backgroundColor: colors.accent }]}>
            <Text style={styles.categoryBadgeText}>⚡ Flash</Text>
          </View>
        )}
        {hasDiscount && (
          <View style={[styles.discountBadge, { backgroundColor: colors.discount }]}>
            <Text style={styles.discountText}>-{item.discount}%</Text>
          </View>
        )}
        {isCheapest && (
          <View style={[styles.bestPriceBadge, { backgroundColor: colors.bestPrice }]}>
            <Ionicons name="pricetag-outline" size={10} color={colors.white} />
            <Text style={styles.bestPriceText}>Prix mini</Text>
          </View>
        )}
      </View>
      <View style={styles.cardContent}>
        <Text style={[styles.title, { color: colors.text }]} numberOfLines={2}>
          {item.title}
        </Text>
        <View style={styles.priceRow}>
          <Text style={[styles.currentPrice, { color: colors.accent }]}>${formatPrice(price)}</Text>
          {hasDiscount && oldPrice && (
            <Text style={[styles.oldPrice, { color: colors.textTertiary }]}>
              ${formatPrice(oldPrice)}
            </Text>
          )}
        </View>
        <View style={styles.footerRow}>
          <View style={styles.sellerInfo}>
            <Image
              source={{ uri: item.seller.avatar || "https://via.placeholder.com/16" }}
              style={[styles.sellerAvatar, { backgroundColor: colors.sellerBg }]}
            />
            <Text style={[styles.sellerName, { color: colors.textSecondary }]} numberOfLines={1}>
              {item.seller.name || "Vendeur"}
            </Text>
          </View>
          {item.distance && (
            <View style={[styles.distanceBadge, { backgroundColor: colors.distanceBg }]}>
              <Ionicons name="location-outline" size={12} color={colors.textSecondary} />
              <Text style={[styles.distanceText, { color: colors.textSecondary }]}>
                {formatDistance(item.distance)}
              </Text>
            </View>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
};

// ============================================
// ÉCRAN PRINCIPAL FLASH DEALS
// ============================================
export default function FlashDealsScreen() {
  const router = useRouter();
  const COLORS = useDynamicColors();
  const { isDark } = useTheme();
  
  const [products, setProducts] = useState<Product[]>([]);
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fadeAnim = useRef(new Animated.Value(0)).current;

  const fetchProducts = async (pageNum: number, shouldCache = true) => {
    try {
      const cacheKey = `flash_deals_${pageNum}`;
      if (shouldCache) {
        const cached = await AsyncStorage.getItem(cacheKey);
        if (cached) {
          const { data, timestamp } = JSON.parse(cached);
          if (Date.now() - timestamp < CACHE_TTL) {
            return data;
          }
        }
      }

      const url = `${API_URL}?page=${pageNum}&limit=12`;
      console.log("🔍 Fetching flash deals:", url);
      const response = await fetch(url);
      const json = await response.json();

      if (json.success && json.products) {
        const normalized = json.products.map((p: any) => ({
          ...p,
          price: Number(p.price) || 0,
          old_price: p.old_price ? Number(p.old_price) : null,
        }));
        const result = {
          products: normalized,
          hasMore: json.has_more,
        };
        if (shouldCache) {
          await AsyncStorage.setItem(
            cacheKey,
            JSON.stringify({ data: result, timestamp: Date.now() })
          );
        }
        return result;
      }
      throw new Error(json.message || "Erreur API");
    } catch (err: any) {
      console.error("Fetch error:", err.message);
      throw new Error("Erreur réseau");
    }
  };

  const loadInitial = async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await fetchProducts(1, true);
      const shuffled = shuffleArray(result.products);
      setProducts(shuffled);
      setRows(buildRows(shuffled));
      setHasMore(result.hasMore);
      setPage(1);
      Animated.timing(fadeAnim, { toValue: 1, duration: 400, useNativeDriver: true }).start();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const loadMore = async () => {
    if (loadingMore || !hasMore) return;
    setLoadingMore(true);
    try {
      const nextPage = page + 1;
      const result = await fetchProducts(nextPage, true);
      const newProducts = result.products;
      const updatedProducts = [...products, ...newProducts];
      setProducts(updatedProducts);
      setRows(buildRows(updatedProducts));
      setHasMore(result.hasMore);
      setPage(nextPage);
    } catch (err) {
      console.error("Load more error:", err);
    } finally {
      setLoadingMore(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await AsyncStorage.removeItem("flash_deals_1");
      const result = await fetchProducts(1, false);
      const shuffled = shuffleArray(result.products);
      setProducts(shuffled);
      setRows(buildRows(shuffled));
      setHasMore(result.hasMore);
      setPage(1);
      fadeAnim.setValue(0);
      Animated.timing(fadeAnim, { toValue: 1, duration: 400, useNativeDriver: true }).start();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadInitial();
  }, []);

  const handleProductPress = (product: Product) => {
    router.push({
      pathname: "/(tabs)/Auth/Panier/DetailId",
      params: { id: product.id.toString() },
    });
  };

  const renderRow = ({ item }: { item: Row }) => {
    const showBadge = item.items.length === 2;
    return (
      <View style={styles.row}>
        {item.items.map((product, idx) => (
          <View key={`${product.id}_${idx}`} style={styles.col}>
            <ProductCard
              item={product}
              onPress={() => handleProductPress(product)}
              showCategoryBadge={showBadge}
              colors={COLORS}
            />
          </View>
        ))}
      </View>
    );
  };

  const renderFooter = () => {
    if (!loadingMore) return null;
    return (
      <View style={styles.footerLoader}>
        <ActivityIndicator size="small" color={COLORS.accent} />
      </View>
    );
  };

  const renderEmpty = () => {
    if (loading) return null;
    return (
      <View style={styles.emptyContainer}>
        <Ionicons name="alert-circle-outline" size={60} color={COLORS.emptyIcon} />
        <Text style={[styles.emptyText, { color: COLORS.emptyIcon }]}>
          {error || "Aucune offre flash trouvée"}
        </Text>
        <TouchableOpacity style={[styles.retryButton, { backgroundColor: COLORS.retryBg }]} onPress={onRefresh}>
          <Text style={[styles.retryButtonText, { color: COLORS.retryText }]}>Réessayer</Text>
        </TouchableOpacity>
      </View>
    );
  };

  if (loading && rows.length === 0) {
    return (
      <SafeAreaView style={[styles.loadingContainer, { backgroundColor: COLORS.loadingBg }]}>
        <ActivityIndicator size="large" color={COLORS.accent} />
        <Text style={[styles.loadingText, { color: COLORS.textSecondary }]}>Chargement des offres flash...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: COLORS.background }]}>
      <StatusBar backgroundColor={COLORS.statusBar} barStyle={COLORS.barStyle} />
      <View style={[styles.header, { backgroundColor: COLORS.headerBg, borderBottomColor: COLORS.headerBorder }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.headerButton}>
          <Ionicons name="arrow-back" size={24} color={COLORS.headerIcon} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: COLORS.text }]}>⚡ Flash Deals</Text>
        <TouchableOpacity onPress={onRefresh} style={styles.headerButton}>
          <Ionicons name="refresh-outline" size={22} color={COLORS.accent} />
        </TouchableOpacity>
      </View>

      <FlatList
        data={rows}
        keyExtractor={(item) => item.key}
        renderItem={renderRow}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[COLORS.accent]}
            tintColor={COLORS.accent}
          />
        }
        onEndReached={loadMore}
        onEndReachedThreshold={0.3}
        ListFooterComponent={renderFooter}
        ListEmptyComponent={renderEmpty}
        showsVerticalScrollIndicator={false}
      />
    </SafeAreaView>
  );
}

// ============================================
// STYLES
// ============================================
const styles = StyleSheet.create({
  container: { flex: 1 },
  loadingContainer: { flex: 1, justifyContent: "center", alignItems: "center" },
  loadingText: { marginTop: 12, fontSize: 16 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  headerButton: { padding: 6 },
  headerTitle: { fontSize: 18, fontWeight: "600" },
  listContent: { paddingHorizontal: 8, paddingBottom: 20 },
  row: { flexDirection: "row", justifyContent: "space-between", marginBottom: 12 },
  col: { flex: 1, marginHorizontal: 4 },
  card: {
    borderRadius: 12,
    borderWidth: 1,
    overflow: "hidden",
  },
  imageContainer: { position: "relative", aspectRatio: 1 },
  productImage: { width: "100%", height: "100%" },
  imagePlaceholder: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: "center",
    alignItems: "center",
  },
  categoryBadge: {
    position: "absolute",
    top: 6,
    left: 6,
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 3,
  },
  categoryBadgeText: { color: "#FFFFFF", fontSize: 8, fontWeight: "600" },
  discountBadge: {
    position: "absolute",
    top: 8,
    right: 8,
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 4,
  },
  discountText: { color: "#FFFFFF", fontSize: 10, fontWeight: "800" },
  bestPriceBadge: {
    position: "absolute",
    bottom: 6,
    left: 6,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 4,
    paddingVertical: 2,
    borderRadius: 4,
  },
  bestPriceText: { color: "#FFFFFF", fontSize: 8, fontWeight: "600", marginLeft: 2 },
  cardContent: { padding: 8 },
  title: { fontSize: 13, fontWeight: "500", marginBottom: 4, lineHeight: 18 },
  priceRow: { flexDirection: "row", alignItems: "baseline", marginBottom: 6 },
  currentPrice: { fontSize: 14, fontWeight: "700", marginRight: 6 },
  oldPrice: { fontSize: 11, textDecorationLine: "line-through" },
  footerRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  sellerInfo: { flexDirection: "row", alignItems: "center", flex: 1 },
  sellerAvatar: { width: 16, height: 16, borderRadius: 8, marginRight: 4 },
  sellerName: { fontSize: 10, flex: 1 },
  distanceBadge: { flexDirection: "row", alignItems: "center", paddingHorizontal: 6, paddingVertical: 2, borderRadius: 10 },
  distanceText: { fontSize: 9, marginLeft: 2 },
  footerLoader: { paddingVertical: 20, alignItems: "center" },
  emptyContainer: { alignItems: "center", justifyContent: "center", paddingTop: 60, paddingHorizontal: 20 },
  emptyText: { fontSize: 16, marginTop: 16, marginBottom: 20, textAlign: "center" },
  retryButton: { paddingHorizontal: 20, paddingVertical: 10, borderRadius: 8 },
  retryButtonText: { fontWeight: "600" },
});

