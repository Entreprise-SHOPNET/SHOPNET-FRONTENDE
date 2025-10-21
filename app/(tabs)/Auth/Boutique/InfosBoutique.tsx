import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Linking,
  LayoutAnimation,
  UIManager,
  Platform,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { FontAwesome } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import axios from "axios";

// Pour animation sur Android
if (
  Platform.OS === "android" &&
  UIManager.setLayoutAnimationEnabledExperimental
) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

export default function InfosBoutique() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [boutique, setBoutique] = useState<any>(null);
  const [faqOpen, setFaqOpen] = useState<{ [key: number]: boolean }>({});

  const API_BASE_URL = "https://shopnet-backend.onrender.com";

  useEffect(() => {
    const fetchBoutique = async () => {
      try {
        const token = await AsyncStorage.getItem("userToken");
        const res = await axios.get(`${API_BASE_URL}/api/boutiques/check`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.data.success) setBoutique(res.data.boutique);
        else alert("Impossible de charger les informations de la boutique.");
      } catch (e) {
        console.log("Erreur serveur :", e);
        alert("Impossible de charger les informations de la boutique.");
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

  if (!boutique) {
    return (
      <View style={styles.loaderContainer}>
        <Text style={{ color: "#fff" }}>
          Impossible de charger les informations de la boutique.
        </Text>
      </View>
    );
  }

  const openWhatsApp = () => {
    const message = encodeURIComponent(
      "Bonjour, j'ai besoin d'aide avec ma boutique SHOPNET.",
    );
    Linking.openURL(`https://wa.me/243896037137?text=${message}`);
  };

  const toggleFAQ = (index: number) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setFaqOpen((prev) => ({ ...prev, [index]: !prev[index] }));
  };

  const faqQuestions = [
    {
      question: "Comment publier un produit ?",
      answer: "Depuis ta boutique, clique sur “Ajouter un produit”.",
    },
    {
      question: "Comment répondre à une commande ?",
      answer: "Va dans “Commandes reçues” et confirme ou refuse la commande.",
    },
    {
      question: "Comment améliorer sa visibilité sur SHOPNET ?",
      answer: "Publie régulièrement et complète ta description.",
    },
    {
      question: "Comment contacter un client ?",
      answer: "Utilise la messagerie interne de SHOPNET.",
    },
    {
      question: "Comment gérer mes produits ?",
      answer: "Modifie ou supprime depuis la liste des produits.",
    },
  ];

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={{ paddingBottom: 100 }}>
        {/* HEADER */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()}>
            <FontAwesome name="arrow-left" size={22} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Informations de la Boutique</Text>
          <View style={{ width: 22 }} />
        </View>

        {/* INFOS */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Informations générales</Text>

          {[
            ["Nom", boutique.nom],
            ["Propriétaire", boutique.proprietaire],
            ["Email", boutique.email],
            ["WhatsApp", boutique.whatsapp],
            ["Adresse", boutique.adresse],
            ["Catégorie", boutique.categorie],
            ["Description", boutique.description],
          ].map(([label, value], idx) => (
            <View key={idx} style={styles.infoRow}>
              <Text style={styles.label}>{label} :</Text>
              <Text style={styles.value}>{value || "—"}</Text>
            </View>
          ))}
        </View>

        {/* Support & Aide */}
        <TouchableOpacity style={styles.card} onPress={openWhatsApp}>
          <Text style={styles.link}>📞 Support & Aide (WhatsApp)</Text>
        </TouchableOpacity>

        {/* Conditions, règles et politique */}
        <TouchableOpacity
          style={styles.card}
          onPress={() =>
            Linking.openURL(
              "https://entreprise-shopnet.github.io/SHOPNET-CONDITION/",
            )
          }
        >
          <Text style={styles.link}>⚖️ Conditions, Règles & Politique</Text>
        </TouchableOpacity>

        {/* Version & nouveautés */}
        <TouchableOpacity
          style={styles.card}
          onPress={() => router.push("/MisAjour")}
        >
          <Text style={styles.link}>🚀 Version & Nouveautés</Text>
          <Text style={styles.value}>Version actuelle : v1.0.0</Text>
          <Text style={styles.value}>
            Prochaines fonctionnalités : messagerie interne, tableau de
            statistiques, notifications en temps réel.
          </Text>
        </TouchableOpacity>

        {/* Tutoriels rapides */}
        <View style={styles.card}>
          <Text style={styles.link}>🎓 Tutoriels rapides</Text>
          {faqQuestions.map((faq, idx) => (
            <View key={idx} style={{ marginTop: 10 }}>
              <TouchableOpacity onPress={() => toggleFAQ(idx)}>
                <Text style={styles.faqQuestion}>• {faq.question}</Text>
              </TouchableOpacity>
              {faqOpen[idx] && (
                <Text style={styles.faqAnswer}>{faq.answer}</Text>
              )}
            </View>
          ))}
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
    marginHorizontal: 20,
    marginTop: 20,
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
  value: { color: "#fff", fontSize: 16, fontWeight: "600", marginTop: 3 },
  link: { color: "#00D68F", fontWeight: "bold", fontSize: 16 },
  faqQuestion: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "bold",
    marginVertical: 5,
  },
  faqAnswer: { color: "#00D68F", marginLeft: 15, marginTop: 3, fontSize: 15 },
});
