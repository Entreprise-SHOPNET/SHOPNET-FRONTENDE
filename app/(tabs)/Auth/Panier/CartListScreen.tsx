import React, { useState, useCallback, useRef, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Image,
  TouchableOpacity,
  ActivityIndicator,
  SafeAreaView,
  RefreshControl,
  Animated,
  Modal,
  Pressable,
  Dimensions,
  StatusBar,
} from "react-native";
import axios from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Ionicons, MaterialIcons } from "@expo/vector-icons";
import { useFocusEffect, useRouter } from "expo-router";

const { width, height } = Dimensions.get("window");
// const API_BASE_URL = "http://100.64.134.89:5000"; // Serveur LOCAL (commenté)
const API_BASE_URL = "https://shopnet-backend.onrender.com"; // Serveur Render (production)

const CART_ENDPOINT = "/api/cart";

// Couleurs SHOPNET PRO VIP
const SHOPNET_BLUE = "#00182A";
const PRO_BLUE = "#42A5F5";
const PREMIUM_GOLD = "#FFD700";
const CARD_BG = "#1E2A3B";
const TEXT_WHITE = "#FFFFFF";
const TEXT_SECONDARY = "#A0AEC0";
const ACCENT_RED = "#FF6B6B";

interface CartItem {
  cart_id: number;
  product_id: number;
  title: string;
  price: string | number;
  quantity: number;
  images: string[];
}

export default function CartListScreen() {
  const router = useRouter();
  const [items, setItems] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [discoverLoading, setDiscoverLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedCartId, setSelectedCartId] = useState<number | null>(null);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;

  const fetchItems = useCallback(async () => {
    try {
      setLoading(true);
      const token = await AsyncStorage.getItem("userToken");
      if (!token) {
        console.error("Token manquant");
        setLoading(false);
        return;
      }

      const resp = await axios.get(`${API_BASE_URL}${CART_ENDPOINT}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      setItems(Array.isArray(resp.data.cart) ? resp.data.cart : []);
    } catch (err) {
      console.error("Cart fetch error", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchItems();
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 600,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 500,
          useNativeDriver: true,
        }),
      ]).start();
    }, [fetchItems]),
  );

  const onRefresh = () => {
    setRefreshing(true);
    fetchItems();
  };

  const handleDiscover = () => {
    setDiscoverLoading(true);
    setTimeout(() => {
      setDiscoverLoading(false);
      router.push("/(tabs)/Auth/Produits/Fil");
    }, 800);
  };

  const openDeleteModal = (cart_id: number) => {
    setSelectedCartId(cart_id);
    setModalVisible(true);
  };

  const handleDelete = async () => {
    if (!selectedCartId) return;

    try {
      const token = await AsyncStorage.getItem("userToken");
      if (!token) return;

      const resp = await axios.delete(
        `${API_BASE_URL}${CART_ENDPOINT}/${selectedCartId}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );

      if (resp.data.success) {
        setItems((prev) => prev.filter((i) => i.cart_id !== selectedCartId));
      }
    } catch (err) {
      console.error("Erreur suppression", err);
    } finally {
      setModalVisible(false);
      setSelectedCartId(null);
    }
  };

  const calculateTotal = () => {
    return items
      .reduce((total, item) => {
        return total + parseFloat(item.price.toString()) * item.quantity;
      }, 0)
      .toFixed(2);
  };

  const getTotalItems = () => {
    return items.reduce((total, item) => total + item.quantity, 0);
  };

  const renderRow = ({ item, index }: { item: CartItem; index: number }) => {
    const imageUrl =
      Array.isArray(item.images) && item.images.length
        ? item.images[0]
        : "https://via.placeholder.com/100";

    const itemPrice = parseFloat(item.price.toString());
    const itemTotal = itemPrice * item.quantity;

    return (
      <Animated.View
        style={[
          styles.productCard,
          {
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }],
          },
        ]}
      >
        <View style={styles.cardHeader}>
          <View style={styles.productImageContainer}>
            <Image source={{ uri: imageUrl }} style={styles.productImage} />
            <View style={styles.quantityBadge}>
              <Text style={styles.quantityBadgeText}>{item.quantity}</Text>
            </View>
          </View>

          <View style={styles.productDetails}>
            <Text style={styles.productTitle} numberOfLines={2}>
              {item.title}
            </Text>

            <View style={styles.priceContainer}>
              <Text style={styles.unitPrice}>${itemPrice.toFixed(2)}</Text>
              <Text style={styles.multiplier}>× {item.quantity}</Text>
            </View>

            <View style={styles.totalContainer}>
              <Text style={styles.totalLabel}>Sous-total:</Text>
              <Text style={styles.totalPrice}>${itemTotal.toFixed(2)}</Text>
            </View>
          </View>
        </View>

        <View style={styles.cardActions}>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() =>
              router.push(`/(tabs)/Auth/Panier/DetailId?id=${item.product_id}`)
            }
          >
            <MaterialIcons name="visibility" size={20} color={PRO_BLUE} />
            <Text style={styles.actionText}>Voir</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionButton, styles.deleteAction]}
            onPress={() => openDeleteModal(item.cart_id)}
          >
            <MaterialIcons name="delete-outline" size={20} color={ACCENT_RED} />
            <Text style={[styles.actionText, { color: ACCENT_RED }]}>
              Supprimer
            </Text>
          </TouchableOpacity>
        </View>
      </Animated.View>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar backgroundColor={SHOPNET_BLUE} barStyle="light-content" />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={PRO_BLUE} />
          <Text style={styles.loadingText}>
            Chargement de votre panier VIP...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar backgroundColor={SHOPNET_BLUE} barStyle="light-content" />

      {/* Header SHOPNET PRO */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <Ionicons name="chevron-back" size={28} color={PRO_BLUE} />
          </TouchableOpacity>
          <View>
            <Text style={styles.headerTitle}>Mon Panier</Text>
            <Text style={styles.headerSubtitle}>SHOPNET PRO</Text>
          </View>
        </View>

        <View style={styles.headerBadge}>
          <Ionicons name="diamond" size={16} color={PREMIUM_GOLD} />
          <Text style={styles.headerBadgeText}>VIP</Text>
        </View>
      </View>

      {/* Summary Card */}
      {items.length > 0 && (
        <Animated.View
          style={[
            styles.summaryCard,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }],
            },
          ]}
        >
          <View style={styles.summaryRow}>
            <View>
              <Text style={styles.summaryLabel}>Articles dans le panier</Text>
              <Text style={styles.summaryCount}>
                {getTotalItems()} produit(s)
              </Text>
            </View>
            <View style={styles.totalSection}>
              <Text style={styles.totalLabel}>Total à payer</Text>
              <Text style={styles.totalAmount}>${calculateTotal()}</Text>
            </View>
          </View>

          <TouchableOpacity style={styles.checkoutButton}>
            <MaterialIcons name="payment" size={24} color={TEXT_WHITE} />
            <Text style={styles.checkoutText}>Procéder au paiement</Text>
            <Ionicons name="arrow-forward" size={20} color={TEXT_WHITE} />
          </TouchableOpacity>
        </Animated.View>
      )}

      {/* Products List */}
      <FlatList
        data={items}
        keyExtractor={(item) => item.cart_id?.toString()}
        renderItem={renderRow}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[PRO_BLUE]}
            tintColor={PRO_BLUE}
          />
        }
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <Animated.View style={[styles.emptyState, { opacity: fadeAnim }]}>
            <View style={styles.emptyIcon}>
              <MaterialIcons name="shopping-cart" size={80} color={PRO_BLUE} />
            </View>
            <Text style={styles.emptyTitle}>Panier VIP vide</Text>
            <Text style={styles.emptyDescription}>
              Votre panier SHOPNET PRO attend ses premiers produits premium
            </Text>

            <TouchableOpacity
              style={styles.discoverButton}
              onPress={handleDiscover}
              disabled={discoverLoading}
            >
              {discoverLoading ? (
                <ActivityIndicator size="small" color={TEXT_WHITE} />
              ) : (
                <>
                  <Ionicons name="rocket" size={20} color={PREMIUM_GOLD} />
                  <Text style={styles.discoverButtonText}>
                    Explorer les produits
                  </Text>
                  <Ionicons name="rocket" size={20} color={PREMIUM_GOLD} />
                </>
              )}
            </TouchableOpacity>
          </Animated.View>
        }
      />

      {/* Delete Confirmation Modal */}
      <Modal
        visible={modalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <Animated.View style={[styles.modalCard, { opacity: fadeAnim }]}>
            <View style={styles.modalIcon}>
              <MaterialIcons name="warning" size={50} color={PREMIUM_GOLD} />
            </View>

            <Text style={styles.modalTitle}>Confirmation requise</Text>
            <Text style={styles.modalMessage}>
              Souhaitez-vous retirer cet article de votre panier SHOPNET PRO ?
            </Text>

            <View style={styles.modalActions}>
              <Pressable
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => setModalVisible(false)}
              >
                <Text style={styles.cancelButtonText}>Annuler</Text>
              </Pressable>

              <Pressable
                style={[styles.modalButton, styles.confirmButton]}
                onPress={handleDelete}
              >
                <MaterialIcons name="delete" size={18} color={TEXT_WHITE} />
                <Text style={styles.confirmButtonText}>Supprimer</Text>
              </Pressable>
            </View>
          </Animated.View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: SHOPNET_BLUE,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: SHOPNET_BLUE,
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: "700",
    color: TEXT_WHITE,
  },
  headerSubtitle: {
    fontSize: 12,
    color: PRO_BLUE,
    fontWeight: "600",
    marginTop: 2,
  },
  headerBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255, 215, 0, 0.1)",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: PREMIUM_GOLD,
    gap: 4,
  },
  headerBadgeText: {
    color: PREMIUM_GOLD,
    fontSize: 12,
    fontWeight: "800",
  },
  summaryCard: {
    backgroundColor: CARD_BG,
    marginHorizontal: 20,
    marginBottom: 16,
    padding: 20,
    borderRadius: 16,
  },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 20,
  },
  summaryLabel: {
    fontSize: 16,
    fontWeight: "600",
    color: TEXT_SECONDARY,
    marginBottom: 4,
  },
  summaryCount: {
    fontSize: 14,
    color: PRO_BLUE,
    fontWeight: "500",
  },
  totalSection: {
    alignItems: "flex-end",
  },
  totalLabel: {
    fontSize: 14,
    color: TEXT_SECONDARY,
    fontWeight: "500",
    marginBottom: 4,
  },
  totalAmount: {
    fontSize: 28,
    fontWeight: "800",
    color: PREMIUM_GOLD,
  },
  checkoutButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: PRO_BLUE,
    paddingVertical: 16,
    borderRadius: 12,
    gap: 10,
  },
  checkoutText: {
    color: TEXT_WHITE,
    fontSize: 18,
    fontWeight: "700",
  },
  listContent: {
    paddingBottom: 20,
  },
  productCard: {
    backgroundColor: CARD_BG,
    marginHorizontal: 20,
    marginVertical: 8,
    padding: 16,
    borderRadius: 16,
  },
  cardHeader: {
    flexDirection: "row",
    marginBottom: 16,
  },
  productImageContainer: {
    position: "relative",
    marginRight: 16,
  },
  productImage: {
    width: 100,
    height: 100,
    borderRadius: 12,
    backgroundColor: "#2C3A4A",
  },
  quantityBadge: {
    position: "absolute",
    top: -8,
    right: -8,
    backgroundColor: PRO_BLUE,
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: CARD_BG,
  },
  quantityBadgeText: {
    color: TEXT_WHITE,
    fontSize: 12,
    fontWeight: "800",
  },
  productDetails: {
    flex: 1,
    justifyContent: "space-between",
  },
  productTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: TEXT_WHITE,
    lineHeight: 20,
    marginBottom: 12,
  },
  priceContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  unitPrice: {
    fontSize: 18,
    fontWeight: "700",
    color: PRO_BLUE,
  },
  multiplier: {
    fontSize: 14,
    color: TEXT_SECONDARY,
    fontWeight: "500",
  },
  totalContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: "rgba(66, 165, 245, 0.2)",
  },
  totalLabel: {
    fontSize: 14,
    color: TEXT_SECONDARY,
    fontWeight: "500",
  },
  totalPrice: {
    fontSize: 20,
    fontWeight: "800",
    color: PREMIUM_GOLD,
  },
  cardActions: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
  },
  actionButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    borderRadius: 10,
    gap: 6,
    backgroundColor: "rgba(66, 165, 245, 0.1)",
  },
  deleteAction: {
    backgroundColor: "rgba(255, 107, 107, 0.1)",
  },
  actionText: {
    fontSize: 14,
    fontWeight: "600",
    color: PRO_BLUE,
  },
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    paddingTop: height * 0.2,
    paddingHorizontal: 40,
  },
  emptyIcon: {
    marginBottom: 24,
  },
  emptyTitle: {
    fontSize: 22,
    fontWeight: "700",
    color: TEXT_WHITE,
    textAlign: "center",
    marginBottom: 12,
  },
  emptyDescription: {
    fontSize: 16,
    color: TEXT_SECONDARY,
    textAlign: "center",
    lineHeight: 22,
    marginBottom: 32,
  },
  discoverButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: PRO_BLUE,
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    gap: 8,
  },
  discoverButtonText: {
    color: TEXT_WHITE,
    fontSize: 16,
    fontWeight: "700",
  },
  loadingText: {
    color: PRO_BLUE,
    fontSize: 16,
    marginTop: 12,
    fontWeight: "500",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.7)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalCard: {
    backgroundColor: CARD_BG,
    borderRadius: 20,
    padding: 24,
    alignItems: "center",
    marginHorizontal: 20,
    width: "85%",
  },
  modalIcon: {
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: TEXT_WHITE,
    textAlign: "center",
    marginBottom: 12,
  },
  modalMessage: {
    fontSize: 15,
    color: TEXT_SECONDARY,
    textAlign: "center",
    lineHeight: 22,
    marginBottom: 24,
  },
  modalActions: {
    flexDirection: "row",
    width: "100%",
    gap: 12,
  },
  modalButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
    borderRadius: 10,
    gap: 6,
  },
  cancelButton: {
    backgroundColor: "rgba(66, 165, 245, 0.1)",
    borderWidth: 1,
    borderColor: PRO_BLUE,
  },
  confirmButton: {
    backgroundColor: ACCENT_RED,
  },
  cancelButtonText: {
    color: PRO_BLUE,
    fontSize: 16,
    fontWeight: "600",
  },
  confirmButtonText: {
    color: TEXT_WHITE,
    fontSize: 16,
    fontWeight: "600",
  },
});
