

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

const { width } = Dimensions.get("window");

// ============================================
// CONFIGURATION – URL FIXE
// ============================================
const API_URL = "https://shopnet-backend.onrender.com/api/products/ai/top-ventes";
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

// ============================================
// TYPES
// ============================================
type Product = {
  id: number;
  title: string;
  price: number;
  image: string | null;
  location: string | null;
  total_sales: number;
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
}: {
  item: Product;
  onPress: () => void;
  showCategoryBadge?: boolean;
}) => {
  const [imageLoaded, setImageLoaded] = useState(false);
  const price = Number(item.price) || 0;
  const isTopSeller = item.total_sales > 5 || item.score > 100;

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.7}>
      <View style={styles.imageContainer}>
        {!imageLoaded && (
          <View style={styles.imagePlaceholder}>
            <ActivityIndicator size="small" color="#FF6B00" />
          </View>
        )}
        <Image
          source={{ uri: item.image || "https://via.placeholder.com/300" }}
          style={styles.productImage}
          onLoad={() => setImageLoaded(true)}
          onError={() => setImageLoaded(true)}
        />
        {showCategoryBadge && (
          <View style={styles.categoryBadge}>
            <Text style={styles.categoryBadgeText}>⭐ Top vente</Text>
          </View>
        )}
        {isTopSeller && (
          <View style={styles.salesBadge}>
            <Ionicons name="trophy-outline" size={10} color="#fff" />
            <Text style={styles.salesBadgeText}>{item.total_sales} vendus</Text>
          </View>
        )}
      </View>
      <View style={styles.cardContent}>
        <Text style={styles.title} numberOfLines={2}>
          {item.title}
        </Text>
        <View style={styles.priceRow}>
          <Text style={styles.currentPrice}>${formatPrice(price)}</Text>
        </View>
        <View style={styles.footerRow}>
          <View style={styles.sellerInfo}>
            <Image
              source={{ uri: item.seller.avatar || "https://via.placeholder.com/16" }}
              style={styles.sellerAvatar}
            />
            <Text style={styles.sellerName} numberOfLines={1}>
              {item.seller.name || "Vendeur"}
            </Text>
          </View>
          {item.distance && (
            <View style={styles.distanceBadge}>
              <Ionicons name="location-outline" size={12} color="#666" />
              <Text style={styles.distanceText}>{formatDistance(item.distance)}</Text>
            </View>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
};

// ============================================
// ÉCRAN PRINCIPAL TOP VENTES
// ============================================
export default function TopVentesScreen() {
  const router = useRouter();
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
      const cacheKey = `top_ventes_${pageNum}`;
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
      console.log("🔍 Fetching top ventes:", url);
      const response = await fetch(url);
      const json = await response.json();

      if (json.success && json.products) {
        const normalized = json.products.map((p: any) => ({
          ...p,
          price: Number(p.price) || 0,
          total_sales: p.total_sales || 0,
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
      await AsyncStorage.removeItem("top_ventes_1");
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
        <ActivityIndicator size="small" color="#FF6B00" />
      </View>
    );
  };

  const renderEmpty = () => {
    if (loading) return null;
    return (
      <View style={styles.emptyContainer}>
        <Ionicons name="alert-circle-outline" size={60} color="#999" />
        <Text style={styles.emptyText}>{error || "Aucun produit top vente trouvé"}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={onRefresh}>
          <Text style={styles.retryButtonText}>Réessayer</Text>
        </TouchableOpacity>
      </View>
    );
  };

  if (loading && rows.length === 0) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#FF6B00" />
        <Text style={styles.loadingText}>Chargement des meilleures ventes...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.headerButton}>
          <Ionicons name="arrow-back" size={24} color="#1A1A1A" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>🏆 Top Ventes</Text>
        <TouchableOpacity onPress={onRefresh} style={styles.headerButton}>
          <Ionicons name="refresh-outline" size={22} color="#FF6B00" />
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
            colors={["#FF6B00"]}
            tintColor="#FF6B00"
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
  container: { flex: 1, backgroundColor: "#f5f5f5" },
  loadingContainer: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#fff" },
  loadingText: { marginTop: 12, fontSize: 16, color: "#666" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  headerButton: { padding: 6 },
  headerTitle: { fontSize: 18, fontWeight: "600", color: "#1A1A1A" },
  listContent: { paddingHorizontal: 8, paddingBottom: 20 },
  row: { flexDirection: "row", justifyContent: "space-between", marginBottom: 12 },
  col: { flex: 1, marginHorizontal: 4 },
  card: {
    backgroundColor: "#fff",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#eee",
    overflow: "hidden",
  },
  imageContainer: { position: "relative", aspectRatio: 1, backgroundColor: "#f9f9f9" },
  productImage: { width: "100%", height: "100%" },
  imagePlaceholder: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f9f9f9",
  },
  categoryBadge: {
    position: "absolute",
    top: 6,
    left: 6,
    backgroundColor: "#FF6B00",
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 3,
  },
  categoryBadgeText: { color: "#fff", fontSize: 8, fontWeight: "600" },
  salesBadge: {
    position: "absolute",
    bottom: 6,
    left: 6,
    backgroundColor: "#FFA000",
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 4,
    paddingVertical: 2,
    borderRadius: 4,
  },
  salesBadgeText: { color: "#fff", fontSize: 8, fontWeight: "600", marginLeft: 2 },
  cardContent: { padding: 8 },
  title: { fontSize: 13, fontWeight: "500", color: "#1A1A1A", marginBottom: 4, lineHeight: 18 },
  priceRow: { flexDirection: "row", alignItems: "baseline", marginBottom: 6 },
  currentPrice: { fontSize: 14, fontWeight: "700", color: "#FF6B00", marginRight: 6 },
  footerRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  sellerInfo: { flexDirection: "row", alignItems: "center", flex: 1 },
  sellerAvatar: { width: 16, height: 16, borderRadius: 8, marginRight: 4, backgroundColor: "#eee" },
  sellerName: { fontSize: 10, color: "#666", flex: 1 },
  distanceBadge: { flexDirection: "row", alignItems: "center", backgroundColor: "#eee", paddingHorizontal: 6, paddingVertical: 2, borderRadius: 10 },
  distanceText: { fontSize: 9, color: "#666", marginLeft: 2 },
  footerLoader: { paddingVertical: 20, alignItems: "center" },
  emptyContainer: { alignItems: "center", justifyContent: "center", paddingTop: 60, paddingHorizontal: 20 },
  emptyText: { fontSize: 16, color: "#999", marginTop: 16, marginBottom: 20, textAlign: "center" },
  retryButton: { backgroundColor: "#FF6B00", paddingHorizontal: 20, paddingVertical: 10, borderRadius: 8 },
  retryButtonText: { color: "#fff", fontWeight: "600" },
});






