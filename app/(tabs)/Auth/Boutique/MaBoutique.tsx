// --- Imports inchangés ---
import React, { useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  Animated,
  Dimensions,
  Image,
  SafeAreaView,
  StatusBar,
  FlatList,
  Platform,
  Modal,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter } from "expo-router";
import { FontAwesome5, Ionicons, Feather } from "@expo/vector-icons";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const SHOPNET_BLUE = "#00182A";
const SHOPNET_GREEN = "#4DB14E";
// URL publique Render
const API_URL = "https://shopnet-backend.onrender.com/api/boutique/products";
const FIXED_HEADER_HEIGHT = Platform.OS === "ios" ? 94 : 88;
const STANDARD_PRODUCT_LIMIT = 10;

export default function MaBoutique() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [boutique, setBoutique] = useState<any | null>(null);
  const [products, setProducts] = useState<any[]>([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [modalType, setModalType] = useState<
    "error" | "limit" | "success" | "info"
  >("info");
  const [modalTitle, setModalTitle] = useState("");
  const [modalMessage, setModalMessage] = useState("");
  const [modalActions, setModalActions] = useState<
    Array<{
      text: string;
      onPress: () => void;
      style?: "primary" | "secondary";
    }>
  >([]);
  const scrollY = useRef(new Animated.Value(0)).current;

  const showModal = (
    type: "error" | "limit" | "success" | "info",
    title: string,
    message: string,
    actions: Array<{
      text: string;
      onPress: () => void;
      style?: "primary" | "secondary";
    }>,
  ) => {
    setModalType(type);
    setModalTitle(title);
    setModalMessage(message);
    setModalActions(actions);
    setModalVisible(true);
  };

  const hideModal = () => {
    setModalVisible(false);
  };

  useEffect(() => {
    const fetchBoutiqueAndProducts = async () => {
      try {
        const token = await AsyncStorage.getItem("userToken");
        if (!token) {
          showModal(
            "error",
            "Session expirée",
            "Veuillez vous reconnecter pour accéder à votre boutique.",
            [
              {
                text: "Se connecter",
                onPress: () => {
                  hideModal();
                  router.replace("/splash");
                },
                style: "primary",
              },
            ],
          );
          return;
        }

        // --- Récupération boutique ---
        const resBoutique = await fetch(
          "https://shopnet-backend.onrender.com/api/boutiques/check",
          { headers: { Authorization: `Bearer ${token}` } },
        );
        const dataBoutique = await resBoutique.json();
        if (!resBoutique.ok)
          throw new Error(dataBoutique.message || "Erreur boutique");
        setBoutique(dataBoutique.boutique);

        // --- Récupération produits ---
        const resProducts = await fetch(API_URL, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const raw = await resProducts.json();
        if (!resProducts.ok || !raw.success)
          throw new Error(raw.message || raw.error || "Erreur produits");

        // raw.products contient déjà uniquement les produits du propriétaire
        const userProducts = Array.isArray(raw.products) ? raw.products : [];
        setProducts(userProducts);
      } catch (err: any) {
        console.warn("Erreur fetch boutique/products:", err);
        showModal(
          "error",
          "Oups ! Une erreur est survenue",
          err.message ||
            "Problème de connexion au serveur. Veuillez réessayer.",
          [
            {
              text: "Réessayer",
              onPress: () => {
                hideModal();
                setLoading(true);
                setTimeout(() => fetchBoutiqueAndProducts(), 500);
              },
              style: "primary",
            },
            {
              text: "Fermer",
              onPress: hideModal,
              style: "secondary",
            },
          ],
        );
      } finally {
        setLoading(false);
      }
    };

    fetchBoutiqueAndProducts();
  }, []);

  const productImageUri = (p: any) => {
    if (!p) return null;
    return (
      p.image ?? p.imageUrl ?? (p.images && p.images[0]) ?? p.photo ?? null
    );
  };

  const renderCarouselItem = ({ item }: { item: any }) => {
    const id = item._id ?? item.id ?? Math.random().toString();
    const uri =
      productImageUri(item) ??
      "https://via.placeholder.com/400x300?text=No+Image";
    const name = item.nom ?? item.name ?? "Produit";
    const price = item.prix ?? item.price ?? item.amount ?? "";
    return (
      <TouchableOpacity
        key={id}
        activeOpacity={0.85}
        style={styles.carouselCard}
        onPress={() => router.push(`/MisAjour`)}
      >
        <Image source={{ uri }} style={styles.carouselImage} />
        <View style={styles.carouselMeta}>
          <Text numberOfLines={1} style={styles.carouselTitle}>
            {name}
          </Text>
          <Text style={styles.carouselPrice}>{price ? `${price} $` : ""}</Text>
        </View>
      </TouchableOpacity>
    );
  };

  const handleVendre = () => {
    if (products.length >= STANDARD_PRODUCT_LIMIT) {
      showModal(
        "limit",
        "Limite de produits atteinte 🚫",
        `Votre boutique Standard est limitée à ${STANDARD_PRODUCT_LIMIT} produits.\n\nPassez à une formule supérieure pour vendre plus et booster vos ventes !`,
        [
          {
            text: "Passer à Premium",
            onPress: () => {
              hideModal();
              router.push("/(tabs)/Auth/Boutique/Premium/PayerPremium");
            },
            style: "primary",
          },
          {
            text: "Passer à Pro VIP",
            onPress: () => {
              hideModal();
              router.push("/(tabs)/Auth/Boutique/Pro/paiementPro");
            },
            style: "primary",
          },
          {
            text: "Plus tard",
            onPress: hideModal,
            style: "secondary",
          },
        ],
      );
      return;
    }
    router.push("/(tabs)/Auth/Boutique/PublierProduits");
  };

  const getModalIcon = () => {
    switch (modalType) {
      case "error":
        return <Ionicons name="alert-circle" size={50} color="#FF6B6B" />;
      case "limit":
        return <Ionicons name="card-outline" size={50} color="#FFAA00" />;
      case "success":
        return <Ionicons name="checkmark-circle" size={50} color="#4DB14E" />;
      case "info":
        return <Ionicons name="information-circle" size={50} color="#42A5F5" />;
      default:
        return <Ionicons name="information-circle" size={50} color="#42A5F5" />;
    }
  };

  const getModalBackground = () => {
    switch (modalType) {
      case "error":
        return "#2A1E2A";
      case "limit":
        return "#2A2A1E";
      case "success":
        return "#1E2A1E";
      case "info":
        return "#1E2A3B";
      default:
        return "#1E2A3B";
    }
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
        <FontAwesome5
          name="store-slash"
          size={90}
          color="rgba(255,255,255,0.25)"
        />
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

      {/* Modal personnalisé */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={modalVisible}
        onRequestClose={hideModal}
      >
        <View style={styles.modalOverlay}>
          <View
            style={[
              styles.modalContainer,
              { backgroundColor: getModalBackground() },
            ]}
          >
            <View style={styles.modalIconContainer}>{getModalIcon()}</View>

            <Text style={styles.modalTitle}>{modalTitle}</Text>
            <Text style={styles.modalMessage}>{modalMessage}</Text>

            <View style={styles.modalActions}>
              {modalActions.map((action, index) => (
                <TouchableOpacity
                  key={index}
                  style={[
                    styles.modalButton,
                    action.style === "primary"
                      ? styles.modalButtonPrimary
                      : styles.modalButtonSecondary,
                  ]}
                  onPress={action.onPress}
                >
                  <Text
                    style={[
                      styles.modalButtonText,
                      action.style === "primary"
                        ? styles.modalButtonTextPrimary
                        : styles.modalButtonTextSecondary,
                    ]}
                  >
                    {action.text}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>
      </Modal>

      {/* --- Fixed header --- */}
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
            onPress={() =>
              router.push("/(tabs)/Auth/Boutique/Premium/PayerPremium")
            }
          >
            <Text style={styles.upgradeText}>Premium</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.upgradeButton, { backgroundColor: "#00CFFF" }]}
            onPress={() => router.push("/(tabs)/Auth/Boutique/Pro/paiementPro")}
          >
            <Text style={styles.upgradeText}>Pro</Text>
          </TouchableOpacity>
        </View>
      </View>

      <Animated.ScrollView
        contentContainerStyle={{
          paddingTop: FIXED_HEADER_HEIGHT + 12,
          paddingBottom: 120,
        }}
        scrollEventThrottle={16}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
          { useNativeDriver: false },
        )}
      >
        <View style={styles.hero}>
          <FontAwesome5 name="store" size={84} color={SHOPNET_GREEN} />
          <Text style={styles.heroTitle} numberOfLines={2}>
            {boutique.nom}
          </Text>
        </View>

        <View style={styles.sectionTitleRow}>
          <Text style={styles.sectionTitle}>Vos produits</Text>
          <Text style={styles.sectionSub}>
            Max {STANDARD_PRODUCT_LIMIT} — Boutique Standard
          </Text>
        </View>

        <FlatList
          data={products.slice(0, STANDARD_PRODUCT_LIMIT)}
          horizontal
          showsHorizontalScrollIndicator={false}
          keyExtractor={(item, idx) => (item._id ?? item.id ?? idx).toString()}
          renderItem={renderCarouselItem}
          contentContainerStyle={{ paddingHorizontal: 12 }}
          ItemSeparatorComponent={() => <View style={{ width: 12 }} />}
        />

        <View style={styles.gridLabelRow}>
          <Text style={styles.gridLabel}>Tous les produits</Text>
        </View>
        <View style={styles.productsGrid}>
          {products.length === 0 ? (
            <View style={styles.noProducts}>
              <Text style={styles.noProductsText}>
                Aucun produit disponible
              </Text>
            </View>
          ) : (
            products.slice(0, STANDARD_PRODUCT_LIMIT).map((p, i) => {
              const id = p._id ?? p.id ?? i;
              const uri =
                productImageUri(p) ??
                "https://via.placeholder.com/400x300?text=No+Image";
              const name = p.nom ?? p.name ?? "Produit";
              const price = p.prix ?? p.price ?? "";
              return (
                <TouchableOpacity
                  key={id}
                  style={styles.productCard}
                  onPress={() => router.push(`/MisAjour`)}
                >
                  <Image source={{ uri }} style={styles.productImage} />
                  <Text numberOfLines={1} style={styles.productName}>
                    {name}
                  </Text>
                  <Text style={styles.productPrice}>
                    {price ? `${price} $` : ""}
                  </Text>
                </TouchableOpacity>
              );
            })
          )}
        </View>
      </Animated.ScrollView>

      <View style={styles.bottomBar}>
        <TouchableOpacity style={styles.bottomButton} onPress={handleVendre}>
          <Ionicons name="add-circle-outline" size={28} color="#fff" />
          <Text style={styles.bottomText}>Vendre</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.bottomButton}
          onPress={() =>
            router.push("/(tabs)/Auth/Panier/VendeurNotifications")
          }
        >
          <Ionicons name="cart-outline" size={28} color="#fff" />
          <Text style={styles.bottomText}>Commandes</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.bottomButton}
          onPress={() => router.push("/(tabs)/Auth/Boutique/ProfilBoutique")}
        >
          <Ionicons name="person-outline" size={28} color="#fff" />
          <Text style={styles.bottomText}>Profil</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.bottomButton}
          onPress={() => router.push("/(tabs)/Auth/Boutique/InfosBoutique")}
        >
          <Feather name="info" size={26} color="#fff" />
          <Text style={styles.bottomText}>Infos</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

// --- Styles avec ajout des styles du modal ---
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: SHOPNET_BLUE },
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
  fixedShopName: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "700",
    maxWidth: SCREEN_WIDTH - 220,
  },
  statusRow: { flexDirection: "row", alignItems: "center", marginTop: 3 },
  statusText: { color: SHOPNET_GREEN, fontSize: 13, fontWeight: "600" },
  activeDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#00B0FF",
    marginLeft: 8,
  },
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
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: SHOPNET_BLUE,
  },
  loadingText: { color: "#fff", marginTop: 12 },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: SHOPNET_BLUE,
  },
  emptyTitle: { color: "#fff", fontSize: 20, marginTop: 12 },
  createButton: {
    backgroundColor: SHOPNET_GREEN,
    padding: 12,
    borderRadius: 10,
    flexDirection: "row",
    alignItems: "center",
    marginTop: 12,
  },
  createButtonText: { color: "#fff", marginLeft: 8, fontWeight: "600" },
  hero: { alignItems: "center", marginTop: 18, marginBottom: 8 },
  heroTitle: {
    color: "#fff",
    fontSize: 24,
    fontWeight: "800",
    textAlign: "center",
    marginTop: 10,
    paddingHorizontal: 16,
  },
  sectionTitleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 12,
    marginTop: 6,
    marginBottom: 8,
  },
  sectionTitle: { color: "#fff", fontSize: 16, fontWeight: "700" },
  sectionSub: { color: "rgba(255,255,255,0.6)", fontSize: 12 },
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
  gridLabelRow: { paddingHorizontal: 12, marginTop: 18, marginBottom: 8 },
  gridLabel: { color: "rgba(255,255,255,0.9)", fontWeight: "700" },
  productsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    paddingHorizontal: 12,
  },
  productCard: {
    width: Math.round(SCREEN_WIDTH / 2) - 18,
    backgroundColor: "rgba(30,42,59,0.95)",
    borderRadius: 12,
    marginBottom: 14,
    overflow: "hidden",
  },
  productImage: {
    width: "100%",
    height: 130,
    resizeMode: "cover",
    backgroundColor: "rgba(255,255,255,0.03)",
  },
  productName: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 14,
    paddingHorizontal: 8,
    paddingTop: 8,
  },
  productPrice: {
    color: SHOPNET_GREEN,
    fontWeight: "700",
    paddingHorizontal: 8,
    paddingBottom: 12,
    paddingTop: 6,
  },
  noProducts: { padding: 20, alignItems: "center", width: "100%" },
  noProductsText: { color: "rgba(255,255,255,0.7)" },
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

  // Nouveaux styles pour le modal personnalisé
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.7)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  modalContainer: {
    width: "100%",
    maxWidth: 400,
    borderRadius: 20,
    padding: 24,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  modalIconContainer: {
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: "800",
    color: "#fff",
    textAlign: "center",
    marginBottom: 12,
  },
  modalMessage: {
    fontSize: 16,
    color: "rgba(255, 255, 255, 0.9)",
    textAlign: "center",
    lineHeight: 22,
    marginBottom: 24,
  },
  modalActions: {
    width: "100%",
    gap: 12,
  },
  modalButton: {
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  modalButtonPrimary: {
    backgroundColor: "#42A5F5",
  },
  modalButtonSecondary: {
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.2)",
  },
  modalButtonText: {
    fontSize: 16,
    fontWeight: "700",
  },
  modalButtonTextPrimary: {
    color: "#fff",
  },
  modalButtonTextSecondary: {
    color: "rgba(255, 255, 255, 0.9)",
  },
});
