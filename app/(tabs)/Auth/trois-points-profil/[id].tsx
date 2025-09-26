

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
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { FontAwesome } from "@expo/vector-icons";
import { authApi, getValidToken } from '.././authService'; // <-- import authApi

const { width } = Dimensions.get("window");

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

  const scaleAnim = useRef(new Animated.Value(0.5)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  const showConfirmation = () => {
    Animated.parallel([
      Animated.spring(scaleAnim, { toValue: 1, friction: 5, useNativeDriver: true }),
      Animated.timing(opacityAnim, { toValue: 1, duration: 200, useNativeDriver: true }),
    ]).start();
  };

  const hideConfirmation = () => {
    Animated.parallel([
      Animated.timing(opacityAnim, { toValue: 0, duration: 200, useNativeDriver: true }),
      Animated.timing(scaleAnim, { toValue: 0.5, duration: 200, useNativeDriver: true }),
    ]).start(() => setConfirmAction(null));
  };

  const deleteProduct = async () => {
    try {
      const token = await getValidToken(); // Récupère automatiquement un token valide
      if (!token) {
        setToastMessage("Utilisateur non connecté");
        setTimeout(() => setToastMessage(""), 2000);
        return;
      }

      const response = await authApi.delete(`/products/${id}`);
      setToastMessage(`Produit "${title}" supprimé !`);
      hideConfirmation();
      setTimeout(() => {
        setToastMessage("");
        router.back();
      }, 1500);

    } catch (err: any) {
      console.error(err);
      setToastMessage(err.response?.data?.message || "Erreur lors de la suppression");
      setTimeout(() => setToastMessage(""), 2000);
    }
  };

  const handleConfirmAction = (action: string) => {
    switch (action) {
      case "delete":
        deleteProduct();
        break;
      case "hide":
        setToastMessage(`Produit "${title}" masqué / désactivé !`);
        hideConfirmation();
        break;
      case "duplicate":
        setToastMessage(`Produit "${title}" dupliqué !`);
        hideConfirmation();
        break;
    }
  };
const handleAction = async (action: string) => {
  switch (action) {
    case "modify":
      // <-- Changement ici : on envoie l'id via params
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
      router.push(`/product/promotion/${id}`);
      break;

    case "boost":
      router.push({
        pathname: "/(tabs)/Auth/Profiles/booste",
        params: { id, title, price, imageUrl },
      });
      break;

    case "share":
      await Share.share({
        message: `Découvrez ce produit ShopNet : ${title} - ${price}$ https://shopnet.com/products/${id}`,
      });
      break;

    case "stats":
      router.push(`/product/stats/${id}`);
      break;

    default:
      break;
  }
};

  const menuItems = [
    { label: "Modifier", icon: "edit", action: "modify" },
    { label: "Supprimer", icon: "trash", action: "delete" },
    { label: "Masquer / Désactiver", icon: "eye-slash", action: "hide" },
    { label: "Mettre en promotion", icon: "tag", action: "promotion" },
    { label: "Booster / Mettre en avant", icon: "rocket", action: "boost" },
    { label: "Partager", icon: "share-alt", action: "share" },
    { label: "Dupliquer", icon: "copy", action: "duplicate" },
    { label: "Voir statistiques", icon: "bar-chart", action: "stats" },
  ];

  return (
    <View style={styles.container}>
      {imageUrl && <Image source={{ uri: imageUrl }} style={styles.productImage} resizeMode="cover" />}

      <View style={styles.backButtonContainer}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <FontAwesome name="arrow-left" size={20} color="#fff" />
          <Text style={styles.backText}>Retour</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <View style={styles.infoContainer}>
          <Text style={styles.title}>{title || `Produit #${id}`}</Text>
          {price && <Text style={styles.price}>{Number(price).toFixed(2)} $</Text>}
          <Text style={styles.idText}>ID : {id}</Text>
        </View>

        <View style={styles.menuContainer}>
          {menuItems.map((item) => (
            <TouchableOpacity
              key={item.action}
              style={styles.menuRow}
              onPress={() => handleAction(item.action)}
              activeOpacity={0.7}
            >
              <FontAwesome name={item.icon as any} size={22} color="#fff" style={styles.menuIcon} />
              <Text style={styles.menuLabel}>{item.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>

      {confirmAction && (
        <View style={styles.confirmOverlay}>
          <Animated.View style={[styles.confirmContainer, { opacity: opacityAnim, transform: [{ scale: scaleAnim }] }]}>
            <Text style={styles.confirmText}>
              {confirmAction === "delete" && `Voulez-vous supprimer "${title}" ?`}
              {confirmAction === "hide" && `Voulez-vous masquer "${title}" ?`}
              {confirmAction === "duplicate" && `Voulez-vous dupliquer "${title}" ?`}
            </Text>
            <View style={styles.confirmButtons}>
              <TouchableOpacity style={[styles.confirmButton, { backgroundColor: "#4CB050" }]} onPress={() => handleConfirmAction(confirmAction)}>
                <Text style={styles.confirmButtonText}>Oui</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.confirmButton, { backgroundColor: "#E53935" }]} onPress={() => hideConfirmation()}>
                <Text style={styles.confirmButtonText}>Non</Text>
              </TouchableOpacity>
            </View>
          </Animated.View>
        </View>
      )}

      {toastMessage !== "" && (
        <View style={styles.toastContainer}>
          <Text style={styles.toastText}>{toastMessage}</Text>
        </View>
      )}
    </View>
  );
};

export default TroisPointsProfil;

// Styles inchangés
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#202A36" },
  scrollContainer: { paddingBottom: 20 },
  productImage: { width, height: 250 },
  backButtonContainer: { position: "absolute", top: 40, left: 15, zIndex: 10 },
  backButton: { flexDirection: "row", alignItems: "center", backgroundColor: "#FA7921", paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
  backText: { color: "#fff", fontSize: 16, marginLeft: 8, fontWeight: "600" },
  infoContainer: { paddingHorizontal: 20, marginTop: 10, marginBottom: 20 },
  title: { fontSize: 24, fontWeight: "700", color: "#fff", marginBottom: 8 },
  price: { fontSize: 20, fontWeight: "600", color: "#fff", marginBottom: 4 },
  idText: { fontSize: 14, color: "#fff" },
  menuContainer: { borderTopWidth: 1, borderTopColor: "#333" },
  menuRow: { flexDirection: "row", alignItems: "center", paddingVertical: 18, paddingHorizontal: 20, borderBottomWidth: 1, borderBottomColor: "#333" },
  menuIcon: { marginRight: 15 },
  menuLabel: { fontSize: 16, color: "#fff", fontWeight: "500" },
  confirmOverlay: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(0,0,0,0.4)", justifyContent: "center", alignItems: "center", zIndex: 20 },
  confirmContainer: { backgroundColor: "#202A36", padding: 20, borderRadius: 12, width: width - 60, alignItems: "center" },
  confirmText: { color: "#fff", fontSize: 18, textAlign: "center", marginBottom: 16 },
  confirmButtons: { flexDirection: "row", justifyContent: "space-between", width: "100%" },
  confirmButton: { flex: 1, paddingVertical: 12, marginHorizontal: 5, borderRadius: 8, alignItems: "center" },
  confirmButtonText: { color: "#fff", fontWeight: "600", fontSize: 16 },
  toastContainer: { position: "absolute", bottom: 40, left: 20, right: 20, backgroundColor: "#FA7921", padding: 12, borderRadius: 10, alignItems: "center" },
  toastText: { color: "#fff", fontWeight: "500", fontSize: 14, textAlign: "center" },
});
