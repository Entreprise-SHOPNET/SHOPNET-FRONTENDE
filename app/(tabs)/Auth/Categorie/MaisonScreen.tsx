

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
const API_URL = "https://shopnet-backend.onrender.com/api/products/maison/ai";
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
const formatPrice = (price: number) => price.toFixed(2);

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
  const discount = item.score > 80 ? Math.floor(Math.random() * 30) + 10 : 0;
  const originalPrice = discount ? item.price / (1 - discount / 100) : null;

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
            <Text style={styles.categoryBadgeText}>🏠 Maison</Text>
          </View>
        )}
        {discount > 0 && (
          <View style={styles.discountBadge}>
            <Text style={styles.discountText}>-{discount}%</Text>
          </View>
        )}
      </View>
      <View style={styles.cardContent}>
        <Text style={styles.title} numberOfLines={2}>
          {item.title}
        </Text>
        <View style={styles.priceRow}>
          <Text style={styles.currentPrice}>${formatPrice(item.price)}</Text>
          {originalPrice && (
            <Text style={styles.originalPrice}>${formatPrice(originalPrice)}</Text>
          )}
        </View>
        <View style={styles.sellerRow}>
          <Image
            source={{ uri: item.seller.avatar || "https://via.placeholder.com/16" }}
            style={styles.sellerAvatar}
          />
          <Text style={styles.sellerName} numberOfLines={1}>
            {item.seller.name || "Vendeur"}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );
};

// ============================================
// ÉCRAN PRINCIPAL MAISON AI
// ============================================
export default function MaisonAIScreen() {
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
      const cacheKey = `maison_ai_${pageNum}`;
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
      console.log("🔍 Fetching maison AI:", url);
      const response = await fetch(url);
      const json = await response.json();

      if (json.success && json.products) {
        const result = {
          products: json.products,
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
      await AsyncStorage.removeItem("maison_ai_1");
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
        <Text style={styles.emptyText}>{error || "Aucun produit maison trouvé"}</Text>
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
        <Text style={styles.loadingText}>Chargement des produits maison...</Text>
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
        <Text style={styles.headerTitle}>🏠 Maison IA</Text>
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
// STYLES (identique aux autres pages)
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
  discountBadge: {
    position: "absolute",
    top: 8,
    right: 8,
    backgroundColor: "#FF4444",
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 4,
  },
  discountText: { color: "#fff", fontSize: 10, fontWeight: "800" },
  cardContent: { padding: 8 },
  title: { fontSize: 13, fontWeight: "500", color: "#1A1A1A", marginBottom: 4, lineHeight: 18 },
  priceRow: { flexDirection: "row", alignItems: "baseline", marginBottom: 6 },
  currentPrice: { fontSize: 14, fontWeight: "700", color: "#FF6B00", marginRight: 6 },
  originalPrice: { fontSize: 11, color: "#999", textDecorationLine: "line-through" },
  sellerRow: { flexDirection: "row", alignItems: "center" },
  sellerAvatar: { width: 16, height: 16, borderRadius: 8, marginRight: 4, backgroundColor: "#eee" },
  sellerName: { fontSize: 10, color: "#666", flex: 1 },
  footerLoader: { paddingVertical: 20, alignItems: "center" },
  emptyContainer: { alignItems: "center", justifyContent: "center", paddingTop: 60, paddingHorizontal: 20 },
  emptyText: { fontSize: 16, color: "#999", marginTop: 16, marginBottom: 20, textAlign: "center" },
  retryButton: { backgroundColor: "#FF6B00", paddingHorizontal: 20, paddingVertical: 10, borderRadius: 8 },
  retryButtonText: { color: "#fff", fontWeight: "600" },
});