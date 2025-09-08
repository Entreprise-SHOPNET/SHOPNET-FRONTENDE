

import React from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Share,
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { FontAwesome } from "@expo/vector-icons";

const TroisPointsProfil = () => {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { id, title } = params as { id: string; title?: string };

  const menuItems = [
    { label: "Modifier", icon: "edit", action: "modify", color: "#4CB050" },
    { label: "Supprimer", icon: "trash", action: "delete", color: "#E53935" },
    { label: "Masquer / Désactiver", icon: "eye-slash", action: "hide", color: "#999" },
    { label: "Mettre en promotion", icon: "tag", action: "promotion", color: "#4CB050" },
    { label: "Booster / Mettre en avant", icon: "rocket", action: "boost", color: "#4CB050" },
    { label: "Partager", icon: "share-alt", action: "share", color: "#4CB050" },
    { label: "Dupliquer", icon: "copy", action: "duplicate", color: "#4CB050" },
    { label: "Voir statistiques", icon: "bar-chart", action: "stats", color: "#4CB050" },
  ];

  const handleAction = async (action: string) => {
    switch (action) {
      case "modify":
        router.push(`/product/edit/${id}`);
        break;
      case "delete":
        Alert.alert("Confirmation", "Voulez-vous vraiment supprimer ce produit ?", [
          { text: "Annuler", style: "cancel" },
          { text: "Supprimer", style: "destructive", onPress: () => router.push(`/product/delete/${id}`) },
        ]);
        break;
      case "hide":
        Alert.alert("Confirmation", "Masquer ce produit ?", [
          { text: "Non", style: "cancel" },
          { text: "Oui", onPress: () => router.push(`/product/hide/${id}`) },
        ]);
        break;
      case "share":
        await Share.share({
          message: `Découvrez ce produit ShopNet : https://shopnet.com/products/${id}`,
        });
        break;
      default:
        router.push(`/product/${action}/${id}`);
        break;
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      {/* Bouton retour */}
      <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
        <FontAwesome name="arrow-left" size={20} color="#fff" />
        <Text style={styles.backText}>Retour</Text>
      </TouchableOpacity>

      {/* Titre principal */}
      <Text style={styles.header}>Actions sur le produit</Text>

      {/* Sous-titre optionnel */}
      <Text style={styles.subTitle}>{title || `Produit #${id}`}</Text>

      {/* Liste des actions */}
      <View style={styles.menuContainer}>
        {menuItems.map((item) => (
          <TouchableOpacity
            key={item.action}
            style={styles.menuRow}
            onPress={() => handleAction(item.action)}
            activeOpacity={0.7}
          >
            <FontAwesome
              name={item.icon as any}
              size={22}
              color={item.color}
              style={styles.menuIcon}
            />
            <Text style={styles.menuLabel}>{item.label}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </ScrollView>
  );
};

export default TroisPointsProfil;

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    backgroundColor: "#202A36",
    paddingTop: 40,
  },
  backButton: {
    flexDirection: "row",
    alignItems: "center",
    marginLeft: 15,
    marginBottom: 15,
  },
  backText: {
    color: "#fff",
    fontSize: 16,
    marginLeft: 8,
  },
  header: {
    fontSize: 22,
    fontWeight: "700",
    color: "#fff",
    textAlign: "center",
    marginBottom: 5,
  },
  subTitle: {
    fontSize: 16,
    fontWeight: "500",
    color: "#aaa",
    textAlign: "center",
    marginBottom: 20,
  },
  menuContainer: {
    borderTopWidth: 1,
    borderTopColor: "#333",
  },
  menuRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 18,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#333",
  },
  menuIcon: {
    marginRight: 15,
  },
  menuLabel: {
    fontSize: 16,
    color: "#fff",
    fontWeight: "500",
  },
});
