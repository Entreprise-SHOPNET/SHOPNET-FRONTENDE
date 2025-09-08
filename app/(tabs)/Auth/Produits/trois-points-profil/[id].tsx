


import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Alert,
} from "react-native";
import { useSearchParams, useRouter } from "expo-router";
import axios from "axios";
import { FontAwesome } from "@expo/vector-icons";

interface Product {
  id: number;
  title: string;
  description: string;
  price: number;
  images: string[];
  visible: boolean;
  created_at: string;
  updated_at: string;
  // autres champs si nécessaire
}

const TroisPointsProfil = () => {
  const { id } = useSearchParams();
  const router = useRouter();
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProduct = async () => {
      try {
        const res = await axios.get(`http://100.64.134.89:5000/api/products/${id}`);
        setProduct(res.data);
      } catch (err) {
        console.error(err);
        Alert.alert("Erreur", "Impossible de récupérer le produit");
      } finally {
        setLoading(false);
      }
    };
    fetchProduct();
  }, [id]);

  if (loading) return <ActivityIndicator style={{ flex: 1, marginTop: 50 }} />;

  if (!product) return <Text style={{ flex: 1, textAlign: "center", marginTop: 50 }}>Produit introuvable</Text>;

  const handleAction = (action: string) => {
    switch (action) {
      case "modify":
        router.push(`/product/edit/${product.id}`);
        break;
      case "delete":
        router.push(`/product/delete/${product.id}`);
        break;
      case "hide":
        router.push(`/product/hide/${product.id}`);
        break;
      case "promotion":
        router.push(`/product/promotion/${product.id}`);
        break;
      case "boost":
        router.push(`/product/boost/${product.id}`);
        break;
      case "share":
        router.push(`/product/share/${product.id}`);
        break;
      case "duplicate":
        router.push(`/product/duplicate/${product.id}`);
        break;
      case "stats":
        router.push(`/product/stats/${product.id}`);
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
    <ScrollView style={styles.container}>
      {/* Images du produit */}
      {product.images && product.images.length > 0 ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.imagesContainer}>
          {product.images.map((img, index) => (
            <Image key={index} source={{ uri: img }} style={styles.productImage} />
          ))}
        </ScrollView>
      ) : (
        <View style={styles.noImage}>
          <FontAwesome name="image" size={60} color="#ccc" />
          <Text style={{ color: "#666", marginTop: 10 }}>Aucune image</Text>
        </View>
      )}

      {/* Infos produit */}
      <View style={styles.infoContainer}>
        <Text style={styles.title}>{product.title}</Text>
        <Text style={styles.price}>Prix : {product.price} €</Text>
        <Text style={styles.description}>{product.description}</Text>
        <Text style={styles.status}>Visible : {product.visible ? "Oui" : "Non"}</Text>
        <Text style={styles.date}>Créé le : {new Date(product.created_at).toLocaleDateString()}</Text>
      </View>

      {/* Menu des actions */}
      <View style={styles.menuContainer}>
        {menuItems.map((item) => (
          <TouchableOpacity
            key={item.action}
            style={styles.menuButton}
            onPress={() => handleAction(item.action)}
          >
            <FontAwesome name={item.icon as any} size={22} color="#4CB050" style={styles.menuIcon} />
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
    flex: 1,
    backgroundColor: "#fff",
  },
  imagesContainer: {
    height: 250,
    backgroundColor: "#f5f5f5",
  },
  productImage: {
    width: 250,
    height: 250,
    borderRadius: 15,
    marginHorizontal: 10,
  },
  noImage: {
    height: 250,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f5f5f5",
  },
  infoContainer: {
    padding: 20,
    borderBottomColor: "#eee",
    borderBottomWidth: 1,
  },
  title: {
    fontSize: 22,
    fontWeight: "700",
    marginBottom: 5,
  },
  price: {
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 10,
    color: "#4CB050",
  },
  description: {
    fontSize: 16,
    marginBottom: 10,
    color: "#333",
  },
  status: {
    fontSize: 14,
    color: "#666",
    marginBottom: 5,
  },
  date: {
    fontSize: 12,
    color: "#999",
  },
  menuContainer: {
    padding: 20,
  },
  menuButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 15,
    borderBottomColor: "#eee",
    borderBottomWidth: 1,
  },
  menuIcon: {
    marginRight: 15,
  },
  menuLabel: {
    fontSize: 16,
    color: "#333",
  },
});
