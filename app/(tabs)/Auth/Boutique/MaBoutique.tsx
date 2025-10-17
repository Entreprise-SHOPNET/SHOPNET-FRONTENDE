

import React, { useEffect, useState } from "react";
import { 
  View, Text, StyleSheet, ActivityIndicator, TouchableOpacity, 
  FlatList, Image, Dimensions, SafeAreaView, StatusBar, ScrollView 
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter } from "expo-router";
import { FontAwesome5, Ionicons } from "@expo/vector-icons";

const API_URL = 'https://shopnet-backend.onrender.com/api/all-products';
const screenWidth = Dimensions.get('window').width;

const SHOPNET_BLUE = '#00182A';
const SHOPNET_GREEN = '#4DB14E';

export default function MaBoutique() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [products, setProducts] = useState<any[]>([]);
  const [profile, setProfile] = useState<any>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const token = await AsyncStorage.getItem("userToken");
        if (!token) {
          router.replace("/splash");
          return;
        }

        // Récupérer les produits de l'utilisateur connecté
        const res = await fetch(API_URL, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        if (res.ok) {
          setProducts(data.slice(0, 10)); // max 10 produits
        }

        // Récupérer le profil de l'utilisateur
        const profileRes = await fetch("https://shopnet-backend.onrender.com/api/user/profile", {
          headers: { Authorization: `Bearer ${token}` },
        });
        const profileData = await profileRes.json();
        if (profileRes.ok) setProfile(profileData);
      } catch (error) {
        console.log(error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const renderProduct = ({ item }: { item: any }) => (
    <View style={styles.productCard}>
      <Image source={{ uri: item.image }} style={styles.productImage} />
      <Text style={styles.productName}>{item.nom}</Text>
      <Text style={styles.productPrice}>${item.prix}</Text>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={SHOPNET_GREEN} />
        <Text style={styles.loadingText}>Chargement...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={SHOPNET_BLUE} />

      {/* Header profil */}
      {profile && (
        <View style={styles.profileHeader}>
          <FontAwesome5 name="user-circle" size={50} color={SHOPNET_GREEN} />
          <View style={{ marginLeft: 12 }}>
            <Text style={styles.profileName}>{profile.nom}</Text>
            <Text style={styles.profileType}>Standard • Activé</Text>
          </View>
        </View>
      )}

      {/* Produits */}
      <FlatList
        data={products}
        renderItem={renderProduct}
        keyExtractor={(item) => item._id}
        numColumns={2}
        contentContainerStyle={{ paddingBottom: 100, paddingHorizontal: 10, paddingTop: 10 }}
        columnWrapperStyle={{ justifyContent: "space-between", marginBottom: 16 }}
      />

      {/* Footer fixe */}
      <View style={styles.footer}>
        <TouchableOpacity style={styles.footerBtn} onPress={() => router.push("/(tabs)/Auth/Produits/Creer")}>
          <FontAwesome5 name="dolly" size={20} color="#fff" />
          <Text style={styles.footerText}>Vendre</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.footerBtn} onPress={() => router.push("/(tabs)/Auth/Commandes")}>
          <FontAwesome5 name="shopping-cart" size={20} color="#fff" />
          <Text style={styles.footerText}>Commandes</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.footerBtn} onPress={() => router.push("/(tabs)/Auth/Vendeur/Profile")}>
          <FontAwesome5 name="user" size={20} color="#fff" />
          <Text style={styles.footerText}>Profil</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.footerBtn} onPress={() => router.push("/(tabs)/Auth/Boutique/Info")}>
          <Ionicons name="ios-information-circle" size={20} color="#fff" />
          <Text style={styles.footerText}>Infos</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: SHOPNET_BLUE },
  loadingContainer: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: SHOPNET_BLUE },
  loadingText: { color: "#fff", marginTop: 16, fontSize: 16 },

  profileHeader: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "rgba(0,24,42,0.95)",
    marginBottom: 10,
    borderRadius: 12,
    marginHorizontal: 10
  },
  profileName: { color: "#fff", fontSize: 18, fontWeight: "700" },
  profileType: { color: SHOPNET_GREEN, fontSize: 14, fontWeight: "600", marginTop: 2 },

  productCard: { 
    backgroundColor: "rgba(30,42,59,0.9)", 
    borderRadius: 12, 
    flex: 1, 
    marginHorizontal: 5, 
    padding: 10, 
    alignItems: "center" 
  },
  productImage: { width: (screenWidth / 2) - 30, height: 120, borderRadius: 8, marginBottom: 8 },
  productName: { color: "#fff", fontWeight: "700", fontSize: 14, textAlign: "center" },
  productPrice: { color: SHOPNET_GREEN, fontWeight: "600", fontSize: 14, marginTop: 2 },

  footer: { 
    position: "absolute", bottom: 0, left: 0, right: 0, height: 70, backgroundColor: "rgba(0,24,42,0.95)", 
    flexDirection: "row", justifyContent: "space-around", alignItems: "center", paddingHorizontal: 10 
  },
  footerBtn: { alignItems: "center" },
  footerText: { color: "#fff", fontSize: 12, marginTop: 4 },
});
