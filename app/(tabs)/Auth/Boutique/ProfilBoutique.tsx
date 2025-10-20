import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { FontAwesome } from "@expo/vector-icons";
import { useRouter } from "expo-router";

export default function ProfilBoutique() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [boutique, setBoutique] = useState<any>(null);
  const [deleting, setDeleting] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  useEffect(() => {
    const fetchBoutique = async () => {
      const token = await AsyncStorage.getItem("userToken");
      try {
        const res = await fetch(
          "https://shopnet-backend.onrender.com/api/boutiques/me",
          {
            headers: { Authorization: `Bearer ${token}` },
          },
        );
        const data = await res.json();
        if (res.ok) setBoutique(data);
      } catch (e) {
        console.log("Erreur :", e);
      } finally {
        setLoading(false);
      }
    };
    fetchBoutique();
  }, []);

  const handleLogout = async () => {
    setLoggingOut(true);
    await AsyncStorage.removeItem("userToken");
    setTimeout(() => {
      setLoggingOut(false);
      router.replace("/(tabs)/Auth/Login");
    }, 1500);
  };

  const handleDelete = async () => {
    Alert.alert(
      "Confirmation",
      "Êtes-vous sûr de vouloir supprimer votre compte ? Cette action est irréversible.",
      [
        { text: "Annuler", style: "cancel" },
        {
          text: "Supprimer",
          style: "destructive",
          onPress: async () => {
            setDeleting(true);
            const token = await AsyncStorage.getItem("userToken");
            try {
              const res = await fetch(
                "https://shopnet-backend.onrender.com/api/boutiques/delete",
                {
                  method: "DELETE",
                  headers: { Authorization: `Bearer ${token}` },
                },
              );
              if (res.ok) {
                await AsyncStorage.removeItem("userToken");
                Alert.alert("Compte supprimé", "Votre compte a été supprimé.");
                router.replace("/(tabs)/Auth/Login");
              } else {
                Alert.alert("Erreur", "Impossible de supprimer le compte.");
              }
            } catch (e) {
              Alert.alert("Erreur", "Problème de connexion au serveur.");
            } finally {
              setDeleting(false);
            }
          },
        },
      ],
    );
  };

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
          <Text style={styles.sectionTitle}>Informations du compte</Text>

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
            <Text style={styles.label}>Lieu :</Text>
            <Text style={styles.value}>{boutique?.adresse || "—"}</Text>
          </View>
        </View>

        {/* ACTIONS */}
        <View style={styles.actions}>
          <TouchableOpacity
            style={[styles.actionBtn, { backgroundColor: "#FF5555" }]}
            onPress={handleDelete}
            disabled={deleting}
          >
            {deleting ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <FontAwesome name="trash" size={18} color="#fff" />
                <Text style={styles.actionText}>Supprimer le compte</Text>
              </>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionBtn, { backgroundColor: "#00D68F" }]}
            onPress={handleLogout}
            disabled={loggingOut}
          >
            {loggingOut ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <FontAwesome name="sign-out" size={18} color="#fff" />
                <Text style={styles.actionText}>Se déconnecter</Text>
              </>
            )}
          </TouchableOpacity>
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
  actions: { marginTop: 30, paddingHorizontal: 20 },
  actionBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 14,
    borderRadius: 10,
    marginBottom: 15,
  },
  actionText: { color: "#fff", fontSize: 16, fontWeight: "bold" },
});
