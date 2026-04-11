


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
import * as Location from "expo-location";

const { width } = Dimensions.get("window");

// ============================================
// CONFIGURATION
// ============================================
const API_NEARBY = "https://shopnet-backend.onrender.com/api/products/ai/nearby";
const API_GLOBAL = "https://shopnet-backend.onrender.com/api/products/ai/global";
const CACHE_TTL = 5 * 60 * 1000;

// ============================================
// TYPES
// ============================================
type Product = {
  id: number;
  title: string;
  price: number;
  image: string | null;
  location: string | null;
  distance?: number | null;
  score?: number;
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

const formatDistance = (km: number | null): string => {
  if (!km) return "? km";
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
  showDistance = false,
}: {
  item: Product;
  onPress: () => void;
  showCategoryBadge?: boolean;
  showDistance?: boolean;
}) => {
  const [imageLoaded, setImageLoaded] = useState(false);
  const price = Number(item.price) || 0;

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
            <Text style={styles.categoryBadgeText}>📍 Près de vous</Text>
          </View>
        )}
        {showDistance && item.distance && (
          <View style={styles.distanceBadge}>
            <Ionicons name="location-outline" size={10} color="#fff" />
            <Text style={styles.distanceBadgeText}>{formatDistance(item.distance)}</Text>
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
// ÉCRAN PRINCIPAL NEARBY (SANS ALERTE)
// ============================================
export default function NearbyScreen() {
  const router = useRouter();
  const [products, setProducts] = useState<Product[]>([]);
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [location, setLocation] = useState<{ lat: number; lon: number } | null>(null);
  const [locationStatus, setLocationStatus] = useState<"pending" | "granted" | "denied">("pending");
  const fadeAnim = useRef(new Animated.Value(0)).current;

  // Demander la localisation SANS ALERTE
  useEffect(() => {
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === "granted") {
        try {
          const loc = await Location.getCurrentPositionAsync({});
          setLocation({
            lat: loc.coords.latitude,
            lon: loc.coords.longitude,
          });
          setLocationStatus("granted");
        } catch (err) {
          setLocationStatus("denied");
        }
      } else {
        setLocationStatus("denied");
      }
    })();
  }, []);

  // Chargement des produits (avec ou sans localisation)
  const fetchProducts = useCallback(
    async (pageNum: number, shouldCache = true, forceLocation = location) => {
      try {
        // Si la localisation est disponible, on utilise l'API nearby
        if (forceLocation && locationStatus === "granted") {
          const cacheKey = `nearby_${pageNum}_${forceLocation.lat}_${forceLocation.lon}`;
          if (shouldCache) {
            const cached = await AsyncStorage.getItem(cacheKey);
            if (cached) {
              const { data, timestamp } = JSON.parse(cached);
              if (Date.now() - timestamp < CACHE_TTL) return data;
            }
          }
          const url = `${API_NEARBY}?page=${pageNum}&limit=12&lat=${forceLocation.lat}&lon=${forceLocation.lon}`;
          const response = await fetch(url);
          const json = await response.json();
          if (json.success && json.products) {
            const result = {
              products: json.products.map((p: any) => ({
                ...p,
                price: Number(p.price) || 0,
                distance: p.distance !== null ? parseFloat(p.distance) : null,
              })),
              hasMore: json.has_more,
            };
            if (shouldCache) {
              await AsyncStorage.setItem(cacheKey, JSON.stringify({ data: result, timestamp: Date.now() }));
            }
            return result;
          }
          throw new Error("Erreur API nearby");
        } else {
          // Fallback : produits populaires (global) si pas de localisation
          const cacheKey = `global_fallback_${pageNum}`;
          if (shouldCache) {
            const cached = await AsyncStorage.getItem(cacheKey);
            if (cached) {
              const { data, timestamp } = JSON.parse(cached);
              if (Date.now() - timestamp < CACHE_TTL) return data;
            }
          }
          const url = `${API_GLOBAL}?page=${pageNum}&limit=12`;
          const response = await fetch(url);
          const json = await response.json();
          if (json.success && json.products) {
            const result = {
              products: json.products.map((p: any) => ({
                ...p,
                price: Number(p.price) || 0,
              })),
              hasMore: json.has_more,
            };
            if (shouldCache) {
              await AsyncStorage.setItem(cacheKey, JSON.stringify({ data: result, timestamp: Date.now() }));
            }
            return result;
          }
          throw new Error("Erreur API fallback");
        }
      } catch (err: any) {
        console.error("Fetch error:", err.message);
        throw new Error("Erreur réseau");
      }
    },
    [location, locationStatus]
  );

  const loadInitial = async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await fetchProducts(1, true, location);
      if (result) {
        const shuffled = shuffleArray(result.products);
        setProducts(shuffled);
        setRows(buildRows(shuffled));
        setHasMore(result.hasMore);
        setPage(1);
        Animated.timing(fadeAnim, { toValue: 1, duration: 400, useNativeDriver: true }).start();
      }
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
      const result = await fetchProducts(nextPage, true, location);
      if (result) {
        const newProducts = result.products;
        const updatedProducts = [...products, ...newProducts];
        setProducts(updatedProducts);
        setRows(buildRows(updatedProducts));
        setHasMore(result.hasMore);
        setPage(nextPage);
      }
    } catch (err) {
      console.error("Load more error:", err);
    } finally {
      setLoadingMore(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      // Invalider le cache selon le mode
      if (location && locationStatus === "granted") {
        await AsyncStorage.removeItem(`nearby_1_${location.lat}_${location.lon}`);
      } else {
        await AsyncStorage.removeItem("global_fallback_1");
      }
      const result = await fetchProducts(1, false, location);
      if (result) {
        const shuffled = shuffleArray(result.products);
        setProducts(shuffled);
        setRows(buildRows(shuffled));
        setHasMore(result.hasMore);
        setPage(1);
        fadeAnim.setValue(0);
        Animated.timing(fadeAnim, { toValue: 1, duration: 400, useNativeDriver: true }).start();
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setRefreshing(false);
    }
  };

  useEffect(() => {
    if (locationStatus !== "pending") {
      loadInitial();
    }
  }, [locationStatus, location]);

  const handleProductPress = (product: Product) => {
    router.push({
      pathname: "/(tabs)/Auth/Panier/DetailId",
      params: { id: product.id.toString() },
    });
  };

  const renderRow = ({ item }: { item: Row }) => {
    const showBadge = item.items.length === 2;
    const showDistanceInfo = locationStatus === "granted" && !!location;
    return (
      <View style={styles.row}>
        {item.items.map((product, idx) => (
          <View key={`${product.id}_${idx}`} style={styles.col}>
            <ProductCard
              item={product}
              onPress={() => handleProductPress(product)}
              showCategoryBadge={showBadge}
              showDistance={showDistanceInfo}
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
    if (error) {
      return (
        <View style={styles.emptyContainer}>
          <Ionicons name="alert-circle-outline" size={60} color="#999" />
          <Text style={styles.emptyText}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={onRefresh}>
            <Text style={styles.retryButtonText}>Réessayer</Text>
          </TouchableOpacity>
        </View>
      );
    }
    return (
      <View style={styles.emptyContainer}>
        <Ionicons name="location-outline" size={60} color="#999" />
        <Text style={styles.emptyText}>
          {locationStatus === "denied"
            ? "Activez la localisation pour voir les produits près de vous.\nAffichage des tendances globales."
            : "Aucun produit trouvé près de chez vous"}
        </Text>
        {locationStatus === "denied" && (
          <TouchableOpacity style={styles.retryButton} onPress={onRefresh}>
            <Text style={styles.retryButtonText}>Actualiser</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  };

  if (loading && rows.length === 0) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#FF6B00" />
        <Text style={styles.loadingText}>Chargement des produits...</Text>
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
        <Text style={styles.headerTitle}>
          {locationStatus === "granted" ? "📍 Près de vous" : "🔥 Tendances"}
        </Text>
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
  distanceBadge: {
    position: "absolute",
    bottom: 6,
    left: 6,
    backgroundColor: "rgba(0,0,0,0.6)",
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 4,
    paddingVertical: 2,
    borderRadius: 4,
  },
  distanceBadgeText: { color: "#fff", fontSize: 8, fontWeight: "600", marginLeft: 2 },
  cardContent: { padding: 8 },
  title: { fontSize: 13, fontWeight: "500", color: "#1A1A1A", marginBottom: 4, lineHeight: 18 },
  priceRow: { flexDirection: "row", alignItems: "baseline", marginBottom: 6 },
  currentPrice: { fontSize: 14, fontWeight: "700", color: "#FF6B00", marginRight: 6 },
  sellerRow: { flexDirection: "row", alignItems: "center" },
  sellerAvatar: { width: 16, height: 16, borderRadius: 8, marginRight: 4, backgroundColor: "#eee" },
  sellerName: { fontSize: 10, color: "#666", flex: 1 },
  footerLoader: { paddingVertical: 20, alignItems: "center" },
  emptyContainer: { alignItems: "center", justifyContent: "center", paddingTop: 60, paddingHorizontal: 20 },
  emptyText: { fontSize: 16, color: "#999", marginTop: 16, marginBottom: 20, textAlign: "center" },
  retryButton: { backgroundColor: "#FF6B00", paddingHorizontal: 20, paddingVertical: 10, borderRadius: 8 },
  retryButtonText: { color: "#fff", fontWeight: "600" },
});

