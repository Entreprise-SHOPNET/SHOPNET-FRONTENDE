



import React, { useState, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Animated,
  Dimensions,
  Share,
  StatusBar,
  SafeAreaView,
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { Ionicons, MaterialIcons } from "@expo/vector-icons";
import { authApi, getValidToken } from ".././authService";

const { width, height } = Dimensions.get("window");

// Couleurs SHOPNET PRO
const SHOPNET_BLUE = "#00182A";
const PRO_BLUE = "#42A5F5";
const PREMIUM_GOLD = "#FFD700";
const CARD_BG = "#1E2A3B";
const TEXT_WHITE = "#FFFFFF";
const TEXT_SECONDARY = "#A0AEC0";
const SUCCESS_GREEN = "#4CAF50";
const ERROR_RED = "#FF6B6B";
const WARNING_ORANGE = "#FFA726";

const TroisPointsProfil = () => {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { id, title, price, imageUrl } = params as {
    id: string;
    title?: string;
    price?: string;
    imageUrl?: string;
  };

  const [confirmAction, setConfirmAction] = useState<null | string>(null);
  const [toastMessage, setToastMessage] = useState("");
  const [toastVisible, setToastVisible] = useState(false);

  // Animations
  const scaleAnim = useRef(new Animated.Value(0.8)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;
  const toastAnim = useRef(new Animated.Value(-100)).current;

  const showConfirmation = () => {
    Animated.parallel([
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 50,
        friction: 7,
        useNativeDriver: true,
      }),
      Animated.timing(opacityAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const hideConfirmation = () => {
    Animated.parallel([
      Animated.timing(opacityAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 0.8,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start(() => setConfirmAction(null));
  };

  const showToast = (message: string) => {
    setToastMessage(message);
    setToastVisible(true);

    Animated.sequence([
      Animated.timing(toastAnim, {
        toValue: 0,
        duration: 400,
        useNativeDriver: true,
      }),
      Animated.delay(2000),
      Animated.timing(toastAnim, {
        toValue: -100,
        duration: 400,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setToastVisible(false);
    });
  };

  const deleteProduct = async () => {
    try {
      const token = await getValidToken();
      if (!token) {
        showToast("🔐 Utilisateur non connecté");
        return;
      }

      const response = await authApi.delete(`/products/${id}`);
      showToast(`✅ Produit "${title}" supprimé avec succès !`);
      hideConfirmation();

      setTimeout(() => {
        router.back();
      }, 1500);
    } catch (err: any) {
      console.error(err);
      showToast("❌ Erreur lors de la suppression");
    }
  };

  const handleConfirmAction = (action: string) => {
    switch (action) {
      case "delete":
        deleteProduct();
        break;
      case "hide":
        showToast(`👁️ Produit "${title}" masqué temporairement`);
        hideConfirmation();
        break;
      case "duplicate":
        showToast(`📋 Produit "${title}" dupliqué avec succès`);
        hideConfirmation();
        break;
    }
  };

  const handleAction = async (action: string) => {
    switch (action) {
      case "modify":
        router.push({
          pathname: "/(tabs)/Auth/Profiles/EditProduct",
          params: { id },
        });
        break;

      case "delete":
      case "hide":
      case "duplicate":
        setConfirmAction(action);
        showConfirmation();
        break;

      case "promotion":
        router.push({
          pathname: "/(tabs)/Auth/Profiles/confirmation",
          params: { id, title, price },
        });
        break;

      case "boost":
        router.push({
          pathname: "/(tabs)/Auth/Profiles/booste",
          params: { id, title, price, imageUrl },
        });
        break;

      case "share":
        try {
          await Share.share({
            title: `Découvrez ${title} sur SHOPNET`,
            message: `🌟 Découvrez ce produit exclusif sur SHOPNET : ${title} - ${price}$\n\nhttps://shopnet.com/products/${id}`,
          });
          showToast("📤 Produit partagé avec succès");
        } catch (error) {
          showToast("❌ Erreur lors du partage");
        }
        break;

      case "stats":
        router.push(`/(tabs)/Auth/Profiles/ProductStats`);
        break;

      default:
        break;
    }
  };

  
  const menuItems = [
    // GESTION PRODUIT
    {
      label: "Modifier",
      icon: "create-outline",
      action: "modify",
      description: "Modifier les informations du produit",
      section: "Gestion Produit",
    },
    {
      label: "Dupliquer",
      icon: "copy-outline",
      action: "duplicate",
      description: "Créer une copie de ce produit",
      section: "Gestion Produit",
    },

    // VISIBILITÉ
    {
      label: "Masquer / Désactiver",
      icon: "eye-off-outline",
      action: "hide",
      description: "Rendre le produit invisible temporairement",
      section: "Visibilité",
    },
    {
      label: "Mettre en promotion",
      icon: "pricetag-outline",
      action: "promotion",
      description: "Ajouter une promotion sur ce produit",
      section: "Visibilité",
    },
    {
      label: "Booster / Mettre en avant",
      icon: "rocket-outline",
      action: "boost",
      description: "Augmenter la visibilité du produit",
      section: "Visibilité",
    },

    // ANALYTIQUE & PARTAGE
    {
      label: "Voir statistiques",
      icon: "stats-chart-outline",
      action: "stats",
      description: "Consulter les performances du produit",
      section: "Analytique & Partage",
    },
    {
      label: "Partager",
      icon: "share-social-outline",
      action: "share",
      description: "Partager ce produit sur les réseaux",
      section: "Analytique & Partage",
    },
    {
      label: "Supprimer",
      icon: "trash-outline",
      action: "delete",
      description: "Supprimer définitivement le produit",
      section: "Analytique & Partage",
    },
  ];

  // Regrouper les items par section
  const groupedItems = menuItems.reduce(
    (acc, item) => {
      if (!acc[item.section]) {
        acc[item.section] = [];
      }
      acc[item.section].push(item);
      return acc;
    },
    {} as { [key: string]: typeof menuItems },
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar backgroundColor={SHOPNET_BLUE} barStyle="light-content" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Ionicons name="arrow-back" size={24} color={PRO_BLUE} />
          <Text style={styles.backText}>Retour</Text>
        </TouchableOpacity>

        <Text style={styles.headerTitle}>Options Produit</Text>

        <View style={styles.headerRight} />
      </View>

      {/* Image Produit */}
      {imageUrl && (
        <View style={styles.imageContainer}>
          <Image
            source={{ uri: imageUrl }}
            style={styles.productImage}
            resizeMode="cover"
          />
          <View style={styles.imageOverlay} />
        </View>
      )}

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContainer}
        showsVerticalScrollIndicator={false}
      >
        {/* Informations Produit */}
        <View style={styles.infoContainer}>
          <Text style={styles.title}>{title || `Produit #${id}`}</Text>
          {price && (
            <Text style={styles.price}>${Number(price).toFixed(2)}</Text>
          )}
          <Text style={styles.idText}>ID : {id}</Text>
        </View>

        {/* Menu Sections */}
        <View style={styles.menuContainer}>
          {Object.entries(groupedItems).map(([section, items]) => (
            <View key={section} style={styles.section}>
              <Text style={styles.sectionTitle}>{section}</Text>
              <View style={styles.sectionContent}>
                {items.map((item, index) => (
                  <TouchableOpacity
                    key={item.action}
                    style={[
                      styles.menuRow,
                      index === items.length - 1 && styles.lastMenuItem,
                    ]}
                    onPress={() => handleAction(item.action)}
                    activeOpacity={0.7}
                  >
                    <View style={styles.menuLeft}>
                      <View
                        style={[
                          styles.iconContainer,
                          item.action === "delete" && styles.deleteIcon,
                        ]}
                      >
                        <Ionicons
                          name={item.icon as any}
                          size={22}
                          color={
                            item.action === "delete" ? ERROR_RED : PRO_BLUE
                          }
                        />
                      </View>
                      <View style={styles.textContainer}>
                        <Text style={styles.menuLabel}>{item.label}</Text>
                        <Text style={styles.menuDescription}>
                          {item.description}
                        </Text>
                      </View>
                    </View>
                    <Ionicons
                      name="chevron-forward"
                      size={20}
                      color={TEXT_SECONDARY}
                    />
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          ))}
        </View>
      </ScrollView>

      {/* Modal de Confirmation */}
      {confirmAction && (
        <View style={styles.confirmOverlay}>
          <Animated.View
            style={[
              styles.confirmContainer,
              {
                opacity: opacityAnim,
                transform: [{ scale: scaleAnim }],
              },
            ]}
          >
            <View style={styles.confirmIcon}>
              <Ionicons
                name={
                  confirmAction === "delete"
                    ? "warning"
                    : confirmAction === "hide"
                      ? "eye-off"
                      : "copy"
                }
                size={48}
                color={
                  confirmAction === "delete"
                    ? ERROR_RED
                    : confirmAction === "hide"
                      ? WARNING_ORANGE
                      : PRO_BLUE
                }
              />
            </View>

            <Text style={styles.confirmTitle}>
              {confirmAction === "delete" && "Confirmer la suppression"}
              {confirmAction === "hide" && "Masquer le produit"}
              {confirmAction === "duplicate" && "Dupliquer le produit"}
            </Text>

            <Text style={styles.confirmMessage}>
              {confirmAction === "delete" &&
                `Voulez-vous supprimer définitivement "${title}" ?`}
              {confirmAction === "hide" && `Voulez-vous masquer "${title}" ?`}
              {confirmAction === "duplicate" &&
                `Voulez-vous dupliquer "${title}" ?`}
            </Text>

            <View style={styles.confirmButtons}>
              <TouchableOpacity
                style={[styles.confirmButton, styles.cancelButton]}
                onPress={hideConfirmation}
              >
                <Text style={styles.cancelButtonText}>Annuler</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.confirmButton,
                  confirmAction === "delete"
                    ? styles.deleteButton
                    : confirmAction === "hide"
                      ? styles.warningButton
                      : styles.successButton,
                ]}
                onPress={() => handleConfirmAction(confirmAction)}
              >
                <Text style={styles.confirmButtonText}>
                  {confirmAction === "delete"
                    ? "Supprimer"
                    : confirmAction === "hide"
                      ? "Masquer"
                      : "Dupliquer"}
                </Text>
              </TouchableOpacity>
            </View>
          </Animated.View>
        </View>
      )}

      {/* Toast Notification */}
      {toastVisible && (
        <Animated.View
          style={[
            styles.toastContainer,
            { transform: [{ translateY: toastAnim }] },
          ]}
        >
          <View style={styles.toastContent}>
            <Ionicons name="checkmark-circle" size={24} color={SUCCESS_GREEN} />
            <Text style={styles.toastText}>{toastMessage}</Text>
          </View>
        </Animated.View>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: SHOPNET_BLUE,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: SHOPNET_BLUE,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(66, 165, 245, 0.1)",
  },
  backButton: {
    flexDirection: "row",
    alignItems: "center",
    padding: 8,
  },
  backText: {
    color: PRO_BLUE,
    fontSize: 16,
    fontWeight: "600",
    marginLeft: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: TEXT_WHITE,
  },
  headerRight: {
    width: 40,
  },
  imageContainer: {
    position: "relative",
  },
  productImage: {
    width: "100%",
    height: 200,
  },
  imageOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0, 26, 42, 0.3)",
  },
  scrollView: {
    flex: 1,
  },
  scrollContainer: {
    paddingBottom: 20,
  },
  infoContainer: {
    paddingHorizontal: 20,
    paddingVertical: 20,
    backgroundColor: CARD_BG,
    marginHorizontal: 20,
    marginTop: 20,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(66, 165, 245, 0.1)",
  },
  title: {
    fontSize: 22,
    fontWeight: "700",
    color: TEXT_WHITE,
    marginBottom: 8,
  },
  price: {
    fontSize: 24,
    fontWeight: "800",
    color: PREMIUM_GOLD,
    marginBottom: 8,
  },
  idText: {
    fontSize: 14,
    color: TEXT_SECONDARY,
    fontWeight: "500",
  },
  menuContainer: {
    paddingHorizontal: 20,
    marginTop: 10,
  },
  section: {
    marginBottom: 25,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: PRO_BLUE,
    marginBottom: 12,
    marginLeft: 5,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  sectionContent: {
    backgroundColor: CARD_BG,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(66, 165, 245, 0.1)",
    overflow: "hidden",
  },
  menuRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 18,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(66, 165, 245, 0.1)",
  },
  lastMenuItem: {
    borderBottomWidth: 0,
  },
  menuLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: 10,
    backgroundColor: "rgba(66, 165, 245, 0.1)",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 15,
  },
  deleteIcon: {
    backgroundColor: "rgba(255, 107, 107, 0.1)",
  },
  textContainer: {
    flex: 1,
  },
  menuLabel: {
    fontSize: 16,
    fontWeight: "600",
    color: TEXT_WHITE,
    marginBottom: 4,
  },
  menuDescription: {
    fontSize: 13,
    color: TEXT_SECONDARY,
    lineHeight: 16,
  },
  confirmOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0, 0, 0, 0.7)",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 1000,
  },
  confirmContainer: {
    backgroundColor: CARD_BG,
    borderRadius: 16,
    padding: 24,
    marginHorizontal: 20,
    width: width - 40,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(66, 165, 245, 0.2)",
  },
  confirmIcon: {
    marginBottom: 16,
  },
  confirmTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: TEXT_WHITE,
    textAlign: "center",
    marginBottom: 12,
  },
  confirmMessage: {
    fontSize: 15,
    color: TEXT_SECONDARY,
    textAlign: "center",
    lineHeight: 22,
    marginBottom: 24,
  },
  confirmButtons: {
    flexDirection: "row",
    width: "100%",
    gap: 12,
  },
  confirmButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: "center",
  },
  cancelButton: {
    backgroundColor: "rgba(66, 165, 245, 0.1)",
    borderWidth: 1,
    borderColor: PRO_BLUE,
  },
  deleteButton: {
    backgroundColor: ERROR_RED,
  },
  warningButton: {
    backgroundColor: WARNING_ORANGE,
  },
  successButton: {
    backgroundColor: PRO_BLUE,
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
  toastContainer: {
    position: "absolute",
    top: 0,
    left: 20,
    right: 20,
    backgroundColor: CARD_BG,
    borderRadius: 12,
    padding: 16,
    zIndex: 1001,
    borderLeftWidth: 4,
    borderLeftColor: SUCCESS_GREEN,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  toastContent: {
    flexDirection: "row",
    alignItems: "center",
  },
  toastText: {
    marginLeft: 12,
    fontSize: 16,
    fontWeight: "600",
    color: TEXT_WHITE,
    flex: 1,
  },
});

export default TroisPointsProfil;
