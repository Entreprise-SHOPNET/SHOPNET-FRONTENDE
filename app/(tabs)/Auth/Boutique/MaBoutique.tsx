

import React, { useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  Animated,
  Alert,
  Dimensions,
  Image,
  SafeAreaView,
  StatusBar,
  FlatList,
  Platform,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter } from "expo-router";
import { FontAwesome5, Ionicons, Feather } from "@expo/vector-icons";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const SHOPNET_BLUE = "#00182A";
const SHOPNET_GREEN = "#4DB14E";
const API_URL = "https://shopnet-backend.onrender.com/api/all-products";

// Hauteur fixe du header (visible tout le temps)
const FIXED_HEADER_HEIGHT = Platform.OS === "ios" ? 94 : 88;

export default function MaBoutique() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [boutique, setBoutique] = useState<any | null>(null);
  const [products, setProducts] = useState<any[]>([]);
  const scrollY = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const fetchBoutiqueAndProducts = async () => {
      try {
        const token = await AsyncStorage.getItem("userToken");
        if (!token) {
          Alert.alert("Erreur", "Veuillez vous reconnecter.");
          router.replace("/splash");
          return;
        }

        // Get boutique
        const resBoutique = await fetch(
          "https://shopnet-backend.onrender.com/api/boutiques/check",
          { headers: { Authorization: `Bearer ${token}` } }
        );
        const dataBoutique = await resBoutique.json();
        if (!resBoutique.ok) throw new Error(dataBoutique.message || "Erreur boutique");
        setBoutique(dataBoutique.boutique);

        // Get all products and try to extract array in multiple possible shapes
        const resProducts = await fetch(API_URL, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const raw = await resProducts.json();
        let allProducts: any[] = [];

        if (Array.isArray(raw)) allProducts = raw;
        else if (Array.isArray(raw.products)) allProducts = raw.products;
        else if (Array.isArray(raw.data)) allProducts = raw.data;
        else if (Array.isArray(raw.items)) allProducts = raw.items;

        // Find userId from boutique (support various keys)
        const userId =
          dataBoutique.boutique.userId ??
          dataBoutique.boutique._id ??
          dataBoutique.boutique.ownerId ??
          dataBoutique.boutique.id;

        // filter products of this user
        const userProducts = allProducts.filter((p: any) => {
          return (
            p.userId === userId ||
            p.user === userId ||
            p.ownerId === userId ||
            p.vendorId === userId ||
            p.sellerId === userId
          );
        });

        // fallback: if no products matched, try to show products whose vendor matches boutique name (best-effort)
        const finalProducts = (userProducts.length ? userProducts : allProducts).slice(0, 10);
        setProducts(finalProducts);
      } catch (err: any) {
        console.warn("Erreur fetch boutique/products:", err);
        Alert.alert("Erreur", err.message || "Problème serveur");
      } finally {
        setLoading(false);
      }
    };

    fetchBoutiqueAndProducts();
  }, []);

  // helper to obtain product image
  const productImageUri = (p: any) => {
    if (!p) return null;
    return p.image ?? p.imageUrl ?? (p.images && p.images[0]) ?? p.photo ?? null;
  };

  const renderCarouselItem = ({ item }: { item: any }) => {
    const id = item._id ?? item.id ?? Math.random().toString();
    const uri = productImageUri(item) ?? "https://via.placeholder.com/400x300?text=No+Image";
    const name = item.nom ?? item.name ?? "Produit";
    const price = item.prix ?? item.price ?? item.amount ?? "";
    return (
      <TouchableOpacity
        key={id}
        activeOpacity={0.85}
        style={styles.carouselCard}
        onPress={() =>
          router.push(`/produit/${id}`)
        }
      >
        <Image source={{ uri }} style={styles.carouselImage} />
        <View style={styles.carouselMeta}>
          <Text numberOfLines={1} style={styles.carouselTitle}>{name}</Text>
          <Text style={styles.carouselPrice}>{price ? `${price} $` : ""}</Text>
        </View>
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={SHOPNET_GREEN} />
        <Text style={styles.loadingText}>Chargement de votre boutique...</Text>
      </SafeAreaView>
    );
  }

  if (!boutique) {
    return (
      <SafeAreaView style={styles.emptyContainer}>
        <FontAwesome5 name="store-slash" size={90} color="rgba(255,255,255,0.25)" />
        <Text style={styles.emptyTitle}>Aucune boutique trouvée</Text>
        <TouchableOpacity
          style={styles.createButton}
          onPress={() => router.push("/(tabs)/Auth/Boutique/CreerBoutique")}
        >
          <FontAwesome5 name="plus" size={18} color="#fff" />
          <Text style={styles.createButtonText}>Créer ma boutique</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={SHOPNET_BLUE} />

      {/* --- Fixed header (always visible) --- */}
      <View style={styles.fixedHeader}>
        <View style={styles.fixedLeft}>
          <FontAwesome5 name="store" size={28} color={SHOPNET_GREEN} />
        </View>

        <View style={styles.fixedCenter}>
          <Text style={styles.fixedShopName} numberOfLines={1}>
            {boutique.nom}
          </Text>
          <View style={styles.statusRow}>
            <Text style={styles.statusText}>Standard activé</Text>
            <View style={styles.activeDot} />
          </View>
        </View>

        <View style={styles.fixedRight}>
          <TouchableOpacity
            style={[styles.upgradeButton, { backgroundColor: "#FFAA00" }]}
            onPress={() => router.push("/(tabs)/Auth/Boutique/Upgrade?plan=premium")}
          >
            <Text style={styles.upgradeText}>Premium</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.upgradeButton, { backgroundColor: "#00CFFF" }]}
            onPress={() => router.push("/(tabs)/Auth/Boutique/Upgrade?plan=pro")}
          >
            <Text style={styles.upgradeText}>Pro</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* --- Scrollable content: add paddingTop so header doesn't cover content --- */}
      <Animated.ScrollView
        contentContainerStyle={{ paddingTop: FIXED_HEADER_HEIGHT + 12, paddingBottom: 120 }}
        scrollEventThrottle={16}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
          { useNativeDriver: false }
        )}
      >
        {/* Small hero area (centered big store icon + name) */}
        <View style={styles.hero}>
          <FontAwesome5 name="store" size={84} color={SHOPNET_GREEN} />
          <Text style={styles.heroTitle} numberOfLines={2}>
            {boutique.nom}
          </Text>
        </View>

        {/* --- Carousel Horizontal --- */}
        <View style={styles.sectionTitleRow}>
          <Text style={styles.sectionTitle}>Vos produits</Text>
          <Text style={styles.sectionSub}>Max 10 — Boutique Standard</Text>
        </View>

        <FlatList
          data={products}
          horizontal
          showsHorizontalScrollIndicator={false}
          keyExtractor={(item, idx) => (item._id ?? item.id ?? idx).toString()}
          renderItem={renderCarouselItem}
          contentContainerStyle={{ paddingHorizontal: 12 }}
          ItemSeparatorComponent={() => <View style={{ width: 12 }} />}
        />

        {/* Option: grid fallback below carousel showing same items in 2 columns */}
        <View style={styles.gridLabelRow}>
          <Text style={styles.gridLabel}>Tous les produits</Text>
        </View>

        <View style={styles.productsGrid}>
          {products.length === 0 ? (
            <View style={styles.noProducts}>
              <Text style={styles.noProductsText}>Aucun produit disponible</Text>
            </View>
          ) : (
            products.map((p, i) => {
              const id = p._id ?? p.id ?? i;
              const uri = productImageUri(p) ?? "https://via.placeholder.com/400x300?text=No+Image";
              const name = p.nom ?? p.name ?? "Produit";
              const price = p.prix ?? p.price ?? "";
              return (
                <TouchableOpacity
                  key={id}
                  style={styles.productCard}
                  onPress={() => router.push(`/produit/${id}`)}
                >
                  <Image source={{ uri }} style={styles.productImage} />
                  <Text numberOfLines={1} style={styles.productName}>{name}</Text>
                  <Text style={styles.productPrice}>{price ? `${price} $` : ""}</Text>
                </TouchableOpacity>
              );
            })
          )}
        </View>

      </Animated.ScrollView>

      {/* --- Bottom navigation fixed --- */}
      <View style={styles.bottomBar}>
        <TouchableOpacity style={styles.bottomButton} onPress={() => router.push("/(tabs)/Auth/Produits/Creer")}>
          <Ionicons name="add-circle-outline" size={28} color="#fff" />
          <Text style={styles.bottomText}>Vendre</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.bottomButton} onPress={() => router.push("/(tabs)/Auth/Commandes")}>
          <Ionicons name="cart-outline" size={28} color="#fff" />
          <Text style={styles.bottomText}>Commandes</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.bottomButton} onPress={() => router.push("/(tabs)/Auth/Vendeur/Profile")}>
          <Ionicons name="person-outline" size={28} color="#fff" />
          <Text style={styles.bottomText}>Profil</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.bottomButton} onPress={() => router.push("/(tabs)/Auth/Boutique/Info")}>
          <Feather name="info" size={26} color="#fff" />
          <Text style={styles.bottomText}>Infos</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

// helper used in render - defined after export to keep code readable
function productImageUri(p: any) {
  if (!p) return null;
  return p.image ?? p.imageUrl ?? (p.images && p.images[0]) ?? p.photo ?? null;
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: SHOPNET_BLUE },

  // fixed header
  fixedHeader: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: FIXED_HEADER_HEIGHT,
    backgroundColor: SHOPNET_BLUE,
    zIndex: 40,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.03)",
  },
  fixedLeft: { width: 44, alignItems: "center" },
  fixedCenter: { flex: 1, paddingHorizontal: 8 },
  fixedShopName: { color: "#fff", fontSize: 18, fontWeight: "700", maxWidth: SCREEN_WIDTH - 220 },
  statusRow: { flexDirection: "row", alignItems: "center", marginTop: 3 },
  statusText: { color: SHOPNET_GREEN, fontSize: 13, fontWeight: "600" },
  activeDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: "#00B0FF", marginLeft: 8 },
  fixedRight: { flexDirection: "row", gap: 8 },

  upgradeButton: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 10,
    marginLeft: 8,
    justifyContent: "center",
    alignItems: "center",
  },
  upgradeText: { color: "#00182A", fontWeight: "700", fontSize: 13 },

  // loading / empty
  loadingContainer: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: SHOPNET_BLUE },
  loadingText: { color: "#fff", marginTop: 12 },
  emptyContainer: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: SHOPNET_BLUE },
  emptyTitle: { color: "#fff", fontSize: 20, marginTop: 12 },
  createButton: { backgroundColor: SHOPNET_GREEN, padding: 12, borderRadius: 10, flexDirection: "row", alignItems: "center", marginTop: 12 },
  createButtonText: { color: "#fff", marginLeft: 8, fontWeight: "600" },

  // hero
  hero: { alignItems: "center", marginTop: 18, marginBottom: 8 },
  heroTitle: { color: "#fff", fontSize: 24, fontWeight: "800", textAlign: "center", marginTop: 10, paddingHorizontal: 16 },

  // section titles
  sectionTitleRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 12, marginTop: 6, marginBottom: 8 },
  sectionTitle: { color: "#fff", fontSize: 16, fontWeight: "700" },
  sectionSub: { color: "rgba(255,255,255,0.6)", fontSize: 12 },

  // carousel card
  carouselCard: {
    width: Math.round(SCREEN_WIDTH * 0.65),
    borderRadius: 12,
    overflow: "hidden",
    backgroundColor: "rgba(30,42,59,0.95)",
  },
  carouselImage: { width: "100%", height: 180, resizeMode: "cover" },
  carouselMeta: { padding: 10 },
  carouselTitle: { color: "#fff", fontWeight: "700", fontSize: 16 },
  carouselPrice: { color: SHOPNET_GREEN, fontWeight: "700", marginTop: 6 },

  // grid label
  gridLabelRow: { paddingHorizontal: 12, marginTop: 18, marginBottom: 8 },
  gridLabel: { color: "rgba(255,255,255,0.9)", fontWeight: "700" },

  // product grid (2 columns)
  productsGrid: { flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between", paddingHorizontal: 12 },
  productCard: { width: Math.round(SCREEN_WIDTH / 2) - 18, backgroundColor: "rgba(30,42,59,0.95)", borderRadius: 12, marginBottom: 14, overflow: "hidden" },
  productImage: { width: "100%", height: 130, resizeMode: "cover", backgroundColor: "rgba(255,255,255,0.03)" },
  productName: { color: "#fff", fontWeight: "600", fontSize: 14, paddingHorizontal: 8, paddingTop: 8 },
  productPrice: { color: SHOPNET_GREEN, fontWeight: "700", paddingHorizontal: 8, paddingBottom: 12, paddingTop: 6 },

  noProducts: { padding: 20, alignItems: "center", width: "100%" },
  noProductsText: { color: "rgba(255,255,255,0.7)" },

  // bottom bar
  bottomBar: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: 70,
    backgroundColor: SHOPNET_BLUE,
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,0.03)",
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "center",
    zIndex: 50,
  },
  bottomButton: { alignItems: "center" },
  bottomText: { color: "#fff", fontSize: 12, marginTop: 4 },
});
