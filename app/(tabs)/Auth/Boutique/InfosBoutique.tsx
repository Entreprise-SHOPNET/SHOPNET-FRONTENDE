import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  Linking,
  ActivityIndicator,
  TouchableOpacity,
  StyleSheet,
} from "react-native";
import axios from "axios";

export default function InfosBoutique() {
  const [infos, setInfos] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // ID de la boutique (à remplacer par celui du vendeur connecté)
  const boutiqueId = 123;

  useEffect(() => {
    const fetchInfos = async () => {
      try {
        const response = await axios.get(
          `https://shopnet-backend.onrender.com/api/boutique/${boutiqueId}`,
        );
        setInfos(response.data);
      } catch (error) {
        console.error("Erreur lors du chargement des infos :", error);
      } finally {
        setLoading(false);
      }
    };
    fetchInfos();
  }, []);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#007BFF" />
        <Text>Chargement des informations...</Text>
      </View>
    );
  }

  if (!infos) {
    return (
      <View style={styles.center}>
        <Text>Impossible de charger les informations de la boutique.</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <Text style={styles.title}>Informations de la Boutique</Text>

      <View style={styles.card}>
        <Text style={styles.label}>Nom :</Text>
        <Text style={styles.value}>{infos.nom}</Text>

        <Text style={styles.label}>Description :</Text>
        <Text style={styles.value}>{infos.description}</Text>

        <Text style={styles.label}>Date de création :</Text>
        <Text style={styles.value}>
          {new Date(infos.date_creation).toLocaleDateString()}
        </Text>

        <Text style={styles.label}>Formule active :</Text>
        <Text style={styles.value}>{infos.formule}</Text>

        <Text style={styles.label}>Lien public :</Text>
        <TouchableOpacity
          onPress={() =>
            Linking.openURL(`https://shopnet.com/boutique/${infos.id}`)
          }
        >
          <Text style={[styles.value, styles.link]}>
            https://shopnet.com/boutique/{infos.id}
          </Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.sectionTitle}>📞 Support & Aide</Text>

      <TouchableOpacity
        style={styles.card}
        onPress={() => Linking.openURL("https://wa.me/243970000000")}
      >
        <Text style={styles.link}>Contacter le support SHOPNET</Text>
      </TouchableOpacity>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>❓ Foire aux questions (FAQ)</Text>
        <Text style={styles.text}>• Comment publier un produit ?</Text>
        <Text style={styles.text}>
          → Depuis ta boutique, clique sur “Ajouter un produit”.
        </Text>
        <Text style={styles.text}>• Comment répondre à une commande ?</Text>
        <Text style={styles.text}>
          → Va dans “Commandes reçues” et confirme ou refuse la commande.
        </Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>📘 Conditions générales</Text>
        <Text style={styles.text}>
          En utilisant SHOPNET, tu acceptes de respecter les conditions
          d’utilisation, les lois locales et la politique de confidentialité de
          la plateforme.
        </Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>⚖️ Règlement du vendeur</Text>
        <Text style={styles.text}>
          Il est strictement interdit de vendre des produits illégaux, dangereux
          ou frauduleux sur SHOPNET.
        </Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>🔐 Politique de confidentialité</Text>
        <Text style={styles.text}>
          SHOPNET protège les données personnelles de ses utilisateurs et ne les
          partage jamais sans autorisation.
        </Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>🚀 Version & Nouveautés</Text>
        <Text style={styles.text}>Version actuelle : v1.0.0</Text>
        <Text style={styles.text}>
          Prochaines fonctionnalités : système de messagerie interne, tableau de
          statistiques, et notifications en temps réel.
        </Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>🎓 Tutoriels rapides</Text>
        <Text style={styles.text}>• Comment publier un produit</Text>
        <Text style={styles.text}>• Comment répondre à une commande</Text>
        <Text style={styles.text}>
          • Comment améliorer sa visibilité sur SHOPNET
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F9FAFB",
    padding: 15,
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#007BFF",
    marginBottom: 15,
  },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 10,
    padding: 15,
    marginBottom: 15,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 2,
  },
  label: {
    fontWeight: "bold",
    color: "#333",
    marginTop: 5,
  },
  value: {
    color: "#555",
    marginBottom: 5,
  },
  link: {
    color: "#007BFF",
    textDecorationLine: "underline",
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#222",
    marginBottom: 5,
  },
  text: {
    color: "#444",
    marginTop: 3,
  },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
});
