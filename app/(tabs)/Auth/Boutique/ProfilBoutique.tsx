import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { FontAwesome } from "@expo/vector-icons";
import { useRouter } from "expo-router";

export default function ProfilBoutique() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [boutique, setBoutique] = useState<any>(null);

  // ✅ Ton URL Render ici :
  const API_BASE_URL = "https://shopnet-backend.onrender.com";

  useEffect(() => {
    const fetchBoutique = async () => {
      const token = await AsyncStorage.getItem("userToken");
      try {
        const res = await fetch(`${API_BASE_URL}/api/boutiques/check`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        if (res.ok) setBoutique(data.boutique);
        else console.log("Erreur :", data.message);
      } catch (e) {
        console.log("Erreur serveur :", e);
      } finally {
        setLoading(false);
      }
    };
    fetchBoutique();
  }, []);

  if (loading) {
    return (
      <View style={styles.loaderContainer}>
        <ActivityIndicator size="large" color="#00D68F" />
        <Text style={{ color: "#fff", marginTop: 10 }}>Chargement...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={{ paddingBottom: 100 }}>
        {/* HEADER */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()}>
            <FontAwesome name="arrow-left" size={22} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Profil de ma Boutique</Text>
          <View style={{ width: 22 }} />
        </View>

        {/* INFOS */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Informations de la boutique</Text>

          <View style={styles.infoRow}>
            <Text style={styles.label}>Nom de la boutique :</Text>
            <Text style={styles.value}>{boutique?.nom || "—"}</Text>
          </View>

          <View style={styles.infoRow}>
            <Text style={styles.label}>Propriétaire :</Text>
            <Text style={styles.value}>{boutique?.proprietaire || "—"}</Text>
          </View>

          <View style={styles.infoRow}>
            <Text style={styles.label}>Email :</Text>
            <Text style={styles.value}>{boutique?.email || "—"}</Text>
          </View>

          <View style={styles.infoRow}>
            <Text style={styles.label}>WhatsApp :</Text>
            <Text style={styles.value}>{boutique?.whatsapp || "—"}</Text>
          </View>

          <View style={styles.infoRow}>
            <Text style={styles.label}>Adresse :</Text>
            <Text style={styles.value}>{boutique?.adresse || "—"}</Text>
          </View>

          <View style={styles.infoRow}>
            <Text style={styles.label}>Catégorie :</Text>
            <Text style={styles.value}>{boutique?.categorie || "—"}</Text>
          </View>

          <View style={styles.infoRow}>
            <Text style={styles.label}>Description :</Text>
            <Text style={styles.value}>{boutique?.description || "—"}</Text>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

// --- STYLES ---
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0D1B2A" },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 15,
    backgroundColor: "#192E46",
  },
  headerTitle: { color: "#fff", fontSize: 20, fontWeight: "bold" },
  loaderContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#0D1B2A",
  },
  card: {
    backgroundColor: "#192E46",
    margin: 20,
    padding: 20,
    borderRadius: 16,
    shadowColor: "#00D68F",
    shadowOpacity: 0.2,
    shadowOffset: { width: 0, height: 3 },
  },
  sectionTitle: {
    color: "#00D68F",
    fontSize: 17,
    fontWeight: "bold",
    marginBottom: 15,
  },
  infoRow: {
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.1)",
    paddingVertical: 10,
  },
  label: { color: "#ccc", fontSize: 14 },
  value: { color: "#fff", fontSize: 16, fontWeight: "600" },
});
