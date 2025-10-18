

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
  ScrollView,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter } from "expo-router";
import { FontAwesome5, Ionicons, Feather, MaterialCommunityIcons, MaterialIcons } from "@expo/vector-icons";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const SHOPNET_BLUE = "#00182A";
const PREMIUM_GOLD = "#FFA726";
const API_URL = "https://shopnet-backend.onrender.com/api/all-products";

const FIXED_HEADER_HEIGHT = Platform.OS === "ios" ? 94 : 88;

export default function BoutiquePremium() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [boutique, setBoutique] = useState<any | null>(null);
  const [products, setProducts] = useState<any[]>([]);
  const [stats, setStats] = useState({
    products: 0,
    orders: 0,
    views: 1250,
    revenue: 2840
  });
  
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;

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

        // Get products
        const resProducts = await fetch(API_URL, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const raw = await resProducts.json();
        let allProducts: any[] = [];

        if (Array.isArray(raw)) allProducts = raw;
        else if (Array.isArray(raw.products)) allProducts = raw.products;
        else if (Array.isArray(raw.data)) allProducts = raw.data;
        else if (Array.isArray(raw.items)) allProducts = raw.items;

        const userId = dataBoutique.boutique.userId ?? dataBoutique.boutique._id;
        const userProducts = allProducts.filter((p: any) => 
          p.userId === userId || p.user === userId
        ).slice(0, 200); // Limit to 200 products for Premium

        setProducts(userProducts);
        setStats(prev => ({ 
          ...prev, 
          products: userProducts.length,
          orders: userProducts.length * 3, // Simulated data
        }));

        // Start animations after data load
        Animated.parallel([
          Animated.timing(fadeAnim, {
            toValue: 1,
            duration: 800,
            useNativeDriver: true,
          }),
          Animated.timing(slideAnim, {
            toValue: 0,
            duration: 600,
            useNativeDriver: true,
          }),
        ]).start();

      } catch (err: any) {
        console.warn("Erreur:", err);
        Alert.alert("Erreur", err.message || "Problème serveur");
      } finally {
        setLoading(false);
      }
    };

    fetchBoutiqueAndProducts();
  }, []);

  const productImageUri = (p: any) => {
    if (!p) return null;
    return p.image ?? p.imageUrl ?? (p.images && p.images[0]) ?? p.photo ?? "https://via.placeholder.com/400x300?text=No+Image";
  };

  const renderCarouselItem = ({ item }: { item: any }) => {
    const id = item._id ?? item.id ?? Math.random().toString();
    const uri = productImageUri(item);
    const name = item.nom ?? item.name ?? "Produit";
    const price = item.prix ?? item.price ?? item.amount ?? "0";
    
    return (
      <Animated.View 
        style={[
          styles.carouselCard,
          {
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }]
          }
        ]}
      >
        <TouchableOpacity
          activeOpacity={0.85}
          onPress={() => router.push(`/produit/${id}`)}
        >
          <Image source={{ uri }} style={styles.carouselImage} />
          <View style={styles.carouselMeta}>
            <Text numberOfLines={1} style={styles.carouselTitle}>{name}</Text>
            <Text style={styles.carouselPrice}>{price ? `${price} $` : "Gratuit"}</Text>
            <View style={styles.featuredBadge}>
              <MaterialCommunityIcons name="crown" size={12} color="#fff" />
              <Text style={styles.featuredText}>Top</Text>
            </View>
          </View>
        </TouchableOpacity>
      </Animated.View>
    );
  };

  const renderProductGridItem = ({ item, index }: { item: any; index: number }) => {
    const id = item._id ?? item.id ?? index;
    const uri = productImageUri(item);
    const name = item.nom ?? item.name ?? "Produit";
    const price = item.prix ?? item.price ?? item.amount ?? "0";
    
    return (
      <Animated.View 
        style={[
          styles.productCard,
          {
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }]
          }
        ]}
      >
        <TouchableOpacity
          onPress={() => router.push(`/produit/${id}`)}
          activeOpacity={0.9}
        >
          <Image source={{ uri }} style={styles.productImage} />
          <View style={styles.productInfo}>
            <Text numberOfLines={2} style={styles.productName}>{name}</Text>
            <Text style={styles.productPrice}>{price ? `${price} $` : "Gratuit"}</Text>
          </View>
        </TouchableOpacity>
      </Animated.View>
    );
  };

  const StatCard = ({ icon, value, label, color }: any) => (
    <View style={styles.statCard}>
      <View style={[styles.statIcon, { backgroundColor: `${color}20` }]}>
        <FontAwesome5 name={icon} size={20} color={color} />
      </View>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={PREMIUM_GOLD} />
        <Text style={styles.loadingText}>Chargement de votre boutique Premium...</Text>
      </SafeAreaView>
    );
  }

  if (!boutique) {
    return (
      <SafeAreaView style={styles.emptyContainer}>
        <MaterialCommunityIcons name="crown" size={90} color="rgba(255,255,255,0.25)" />
        <Text style={styles.emptyTitle}>Aucune boutique Premium trouvée</Text>
        <Text style={styles.emptySubtitle}>
          Passez à la formule Premium pour débloquer toutes les fonctionnalités avancées
        </Text>
        <TouchableOpacity
          style={styles.createButton}
          onPress={() => router.push("/(tabs)/Auth/Boutique/CreerBoutique")}
        >
          <MaterialCommunityIcons name="crown" size={18} color="#fff" />
          <Text style={styles.createButtonText}>Passer à Premium</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={SHOPNET_BLUE} />

      {/* Fixed Header */}
      <View style={styles.fixedHeader}>
        <View style={styles.headerLeft}>
          <View style={styles.storeIconSmall}>
            <MaterialCommunityIcons name="crown" size={20} color={PREMIUM_GOLD} />
          </View>
          <View>
            <Text style={styles.shopName} numberOfLines={1}>
              {boutique.nom}
            </Text>
            <View style={styles.planBadge}>
              <MaterialCommunityIcons name="crown" size={10} color="#fff" />
              <Text style={styles.planText}>PREMIUM</Text>
            </View>
          </View>
        </View>

        <View style={styles.headerRight}>
          <TouchableOpacity 
            style={styles.upgradeButton}
            onPress={() => router.push("/(tabs)/Auth/Boutique/UpgradePro")}
          >
            <Ionicons name="rocket" size={16} color="#42A5F5" />
            <Text style={styles.upgradeText}>Pro</Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Hero Section */}
        <Animated.View 
          style={[
            styles.heroSection,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }]
            }
          ]}
        >
          <View style={styles.heroIcon}>
            <MaterialCommunityIcons name="crown" size={50} color={PREMIUM_GOLD} />
          </View>
          <Text style={styles.heroTitle}>{boutique.nom}</Text>
          <Text style={styles.heroSubtitle}>Boutique Premium • Fonctionnalités Avancées</Text>
        </Animated.View>

        {/* Stats Overview */}
        <Animated.View 
          style={[
            styles.statsSection,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }]
            }
          ]}
        >
          <Text style={styles.sectionTitle}>Aperçu des Performances</Text>
          <View style={styles.statsGrid}>
            <StatCard icon="box" value={stats.products} label="Produits" color={PREMIUM_GOLD} />
            <StatCard icon="shopping-cart" value={stats.orders} label="Commandes" color="#4DB14E" />
            <StatCard icon="eye" value={stats.views} label="Vues" color="#42A5F5" />
            <StatCard icon="dollar-sign" value={`${stats.revenue}$`} label="Revenus" color="#FF6B6B" />
          </View>
        </Animated.View>

        {/* Quick Actions */}
        <Animated.View 
          style={[
            styles.actionsSection,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }]
            }
          ]}
        >
          <Text style={styles.sectionTitle}>Actions Rapides</Text>
          <View style={styles.actionsGrid}>
            <TouchableOpacity style={styles.actionButton} onPress={() => router.push("/(tabs)/Auth/Produits/Creer")}>
              <MaterialIcons name="add-business" size={24} color={PREMIUM_GOLD} />
              <Text style={styles.actionText}>Nouveau Produit</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.actionButton} onPress={() => router.push("/(tabs)/Auth/Analytics")}>
              <MaterialIcons name="analytics" size={24} color={PREMIUM_GOLD} />
              <Text style={styles.actionText}>Analytics</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.actionButton} onPress={() => router.push("/(tabs)/Auth/Promotions")}>
              <MaterialIcons name="local-offer" size={24} color={PREMIUM_GOLD} />
              <Text style={styles.actionText}>Promotions</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.actionButton} onPress={() => router.push("/(tabs)/Auth/Clients")}>
              <MaterialIcons name="people" size={24} color={PREMIUM_GOLD} />
              <Text style={styles.actionText}>Clients</Text>
            </TouchableOpacity>
          </View>
        </Animated.View>

        {/* Featured Products Carousel */}
        <Animated.View 
          style={[
            styles.section,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }]
            }
          ]}
        >
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Produits en Vedette</Text>
            <TouchableOpacity onPress={() => router.push("/(tabs)/Auth/Produits/Creer")}>
              <Text style={styles.seeAllText}>+ Ajouter</Text>
            </TouchableOpacity>
          </View>

          {products.length > 0 ? (
            <FlatList
              data={products.slice(0, 5)}
              horizontal
              showsHorizontalScrollIndicator={false}
              keyExtractor={(item, idx) => (item._id ?? item.id ?? idx).toString()}
              renderItem={renderCarouselItem}
              contentContainerStyle={styles.carouselContent}
              ItemSeparatorComponent={() => <View style={{ width: 12 }} />}
            />
          ) : (
            <View style={styles.emptyProducts}>
              <Feather name="package" size={40} color="rgba(255,255,255,0.3)" />
              <Text style={styles.emptyProductsText}>Aucun produit encore</Text>
              <Text style={styles.emptyProductsSubtext}>
                Ajoutez votre premier produit premium
              </Text>
              <TouchableOpacity 
                style={styles.addProductButton}
                onPress={() => router.push("/(tabs)/Auth/Produits/Creer")}
              >
                <Feather name="plus" size={18} color="#fff" />
                <Text style={styles.addProductText}>Premier Produit</Text>
              </TouchableOpacity>
            </View>
          )}
        </Animated.View>

        {/* All Products Grid */}
        {products.length > 0 && (
          <Animated.View 
            style={[
              styles.section,
              {
                opacity: fadeAnim,
                transform: [{ translateY: slideAnim }]
              }
            ]}
          >
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Tous les Produits</Text>
              <Text style={styles.productCount}>{products.length}/200</Text>
            </View>

            <FlatList
              data={products}
              numColumns={2}
              scrollEnabled={false}
              keyExtractor={(item, idx) => (item._id ?? item.id ?? idx).toString()}
              renderItem={renderProductGridItem}
              contentContainerStyle={styles.gridContent}
              columnWrapperStyle={styles.gridRow}
            />
          </Animated.View>
        )}

        {/* Premium Features */}
        <Animated.View 
          style={[
            styles.featuresSection,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }]
            }
          ]}
        >
          <Text style={styles.sectionTitle}>Fonctionnalités Premium</Text>
          <View style={styles.featuresGrid}>
            <View style={styles.featureItem}>
              <MaterialIcons name="analytics" size={24} color={PREMIUM_GOLD} />
              <Text style={styles.featureTitle}>Analytics Avancés</Text>
            </View>
            <View style={styles.featureItem}>
              <MaterialIcons name="trending-up" size={24} color={PREMIUM_GOLD} />
              <Text style={styles.featureTitle}>Produits en Vedette</Text>
            </View>
            <View style={styles.featureItem}>
              <MaterialIcons name="people" size={24} color={PREMIUM_GOLD} />
              <Text style={styles.featureTitle}>Gestion Clients</Text>
            </View>
            <View style={styles.featureItem}>
              <MaterialIcons name="support" size={24} color={PREMIUM_GOLD} />
              <Text style={styles.featureTitle}>Support Prioritaire</Text>
            </View>
          </View>
        </Animated.View>
      </ScrollView>

      {/* Bottom Navigation */}
      <View style={styles.bottomNav}>
        <TouchableOpacity 
          style={styles.navButton}
          onPress={() => router.push("/(tabs)/Auth/Produits/Creer")}
        >
          <Ionicons name="add-circle" size={26} color={PREMIUM_GOLD} />
          <Text style={styles.navTextActive}>Vendre</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.navButton}
          onPress={() => router.push("/(tabs)/Auth/Analytics")}
        >
          <Ionicons name="stats-chart" size={24} color="rgba(255,255,255,0.7)" />
          <Text style={styles.navText}>Analytics</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.navButton}
          onPress={() => router.push("/(tabs)/Auth/Commandes")}
        >
          <Ionicons name="cart" size={24} color="rgba(255,255,255,0.7)" />
          <Text style={styles.navText}>Commandes</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.navButton}
          onPress={() => router.push("/(tabs)/Auth/Vendeur/Profile")}
        >
          <Ionicons name="person" size={24} color="rgba(255,255,255,0.7)" />
          <Text style={styles.navText}>Profil</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: SHOPNET_BLUE 
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 100,
  },
  loadingContainer: { 
    flex: 1, 
    justifyContent: "center", 
    alignItems: "center", 
    backgroundColor: SHOPNET_BLUE 
  },
  loadingText: { 
    color: "#fff", 
    marginTop: 12,
    fontSize: 16 
  },
  emptyContainer: { 
    flex: 1, 
    justifyContent: "center", 
    alignItems: "center", 
    backgroundColor: SHOPNET_BLUE,
    paddingHorizontal: 40 
  },
  emptyTitle: { 
    color: "#fff", 
    fontSize: 24, 
    fontWeight: "700",
    marginTop: 16,
    textAlign: "center"
  },
  emptySubtitle: {
    color: "rgba(255,255,255,0.7)",
    fontSize: 16,
    textAlign: "center",
    marginTop: 8,
    lineHeight: 22
  },
  createButton: { 
    backgroundColor: PREMIUM_GOLD, 
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12, 
    flexDirection: "row", 
    alignItems: "center", 
    marginTop: 24 
  },
  createButtonText: { 
    color: "#00182A", 
    marginLeft: 8, 
    fontWeight: "700",
    fontSize: 16 
  },
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
    justifyContent: "space-between",
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.1)",
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  storeIconSmall: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(255, 167, 38, 0.1)",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  shopName: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "700",
  },
  planBadge: {
    backgroundColor: PREMIUM_GOLD,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    marginTop: 2,
    alignSelf: "flex-start",
  },
  planText: {
    color: "#00182A",
    fontSize: 10,
    fontWeight: "800",
    marginLeft: 2,
  },
  headerRight: {
    flexDirection: "row",
    alignItems: "center",
  },
  upgradeButton: {
    backgroundColor: "rgba(66, 165, 245, 0.2)",
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "rgba(66, 165, 245, 0.3)",
  },
  upgradeText: {
    color: "#42A5F5",
    fontSize: 12,
    fontWeight: "700",
    marginLeft: 4,
  },
  heroSection: {
    alignItems: "center",
    paddingVertical: 32,
    paddingHorizontal: 20,
    marginTop: FIXED_HEADER_HEIGHT,
  },
  heroIcon: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: "rgba(255, 167, 38, 0.1)",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
    borderWidth: 2,
    borderColor: "rgba(255, 167, 38, 0.3)",
  },
  heroTitle: {
    color: "#fff",
    fontSize: 28,
    fontWeight: "800",
    textAlign: "center",
    marginBottom: 4,
  },
  heroSubtitle: {
    color: PREMIUM_GOLD,
    fontSize: 16,
    textAlign: "center",
    fontWeight: "600",
  },
  statsSection: {
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  sectionTitle: {
    color: "#fff",
    fontSize: 20,
    fontWeight: "700",
    marginBottom: 16,
  },
  statsGrid: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  statCard: {
    alignItems: "center",
    flex: 1,
    backgroundColor: "rgba(30, 42, 59, 0.9)",
    borderRadius: 12,
    padding: 12,
    marginHorizontal: 4,
  },
  statIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 8,
  },
  statValue: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "800",
    marginBottom: 2,
  },
  statLabel: {
    color: "rgba(255,255,255,0.6)",
    fontSize: 12,
    fontWeight: "500",
  },
  actionsSection: {
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  actionsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },
  actionButton: {
    width: (SCREEN_WIDTH - 60) / 2,
    backgroundColor: "rgba(30, 42, 59, 0.9)",
    borderRadius: 12,
    padding: 16,
    alignItems: "center",
    marginBottom: 12,
  },
  actionText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "600",
    marginTop: 8,
    textAlign: "center",
  },
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    marginBottom: 12,
  },
  seeAllText: {
    color: PREMIUM_GOLD,
    fontSize: 14,
    fontWeight: "600",
  },
  productCount: {
    color: "rgba(255,255,255,0.6)",
    fontSize: 14,
    fontWeight: "500",
  },
  carouselContent: {
    paddingHorizontal: 20,
  },
  carouselCard: {
    width: SCREEN_WIDTH * 0.7,
    borderRadius: 16,
    overflow: "hidden",
    backgroundColor: "rgba(30, 42, 59, 0.95)",
  },
  carouselImage: {
    width: "100%",
    height: 160,
    resizeMode: "cover",
  },
  carouselMeta: {
    padding: 12,
    position: "relative",
  },
  carouselTitle: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 16,
    marginBottom: 4,
  },
  carouselPrice: {
    color: PREMIUM_GOLD,
    fontWeight: "700",
    fontSize: 16,
  },
  featuredBadge: {
    position: "absolute",
    top: -10,
    right: 12,
    backgroundColor: PREMIUM_GOLD,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  featuredText: {
    color: "#00182A",
    fontSize: 10,
    fontWeight: "800",
    marginLeft: 2,
  },
  emptyProducts: {
    alignItems: "center",
    paddingVertical: 40,
    paddingHorizontal: 20,
  },
  emptyProductsText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "600",
    marginTop: 12,
  },
  emptyProductsSubtext: {
    color: "rgba(255,255,255,0.6)",
    fontSize: 14,
    textAlign: "center",
    marginTop: 4,
    lineHeight: 20,
  },
  addProductButton: {
    backgroundColor: PREMIUM_GOLD,
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    marginTop: 16,
  },
  addProductText: {
    color: "#00182A",
    fontWeight: "700",
    marginLeft: 6,
  },
  gridContent: {
    paddingHorizontal: 20,
  },
  gridRow: {
    justifyContent: "space-between",
    marginBottom: 12,
  },
  productCard: {
    width: (SCREEN_WIDTH - 52) / 2,
    borderRadius: 12,
    overflow: "hidden",
    backgroundColor: "rgba(30, 42, 59, 0.95)",
  },
  productImage: {
    width: "100%",
    height: 120,
    resizeMode: "cover",
  },
  productInfo: {
    padding: 10,
  },
  productName: {
    color: "#fff",
    fontWeight: "500",
    fontSize: 14,
    marginBottom: 4,
    height: 36,
  },
  productPrice: {
    color: PREMIUM_GOLD,
    fontWeight: "700",
    fontSize: 14,
  },
  featuresSection: {
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  featuresGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },
  featureItem: {
    width: (SCREEN_WIDTH - 60) / 2,
    backgroundColor: "rgba(30, 42, 59, 0.9)",
    borderRadius: 12,
    padding: 16,
    alignItems: "center",
    marginBottom: 12,
    flexDirection: "row",
  },
  featureTitle: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "600",
    marginLeft: 8,
    flex: 1,
  },
  bottomNav: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: 80,
    backgroundColor: "rgba(0, 24, 42, 0.95)",
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,0.1)",
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "center",
    paddingBottom: Platform.OS === "ios" ? 20 : 8,
  },
  navButton: {
    alignItems: "center",
    flex: 1,
  },
  navText: {
    color: "rgba(255,255,255,0.7)",
    fontSize: 12,
    marginTop: 4,
  },
  navTextActive: {
    color: PREMIUM_GOLD,
    fontSize: 12,
    marginTop: 4,
    fontWeight: "600",
  },
});