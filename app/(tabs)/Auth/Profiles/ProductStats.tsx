

import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Image,
  ActivityIndicator,
  Dimensions,
} from "react-native";
import { FontAwesome } from "@expo/vector-icons";
import axios from "axios";
import { getValidToken } from "../authService";

const { width } = Dimensions.get("window");

interface TopProduit {
  id: number;
  title: string;
  price?: number;
  ventes?: number;
  vues?: number;
  image?: string | null;
}

interface Statistiques {
  ventes: {
    total_produits_vendus: number;
    revenu_total: number;
    revenu_mensuel: number;
  };
  produits: {
    total_produits_en_vente: number;
    top_vendus: TopProduit[];
    top_vus: TopProduit[];
  };
  vues: {
    total: number;
  };
  interactions: {
    likes: number;
    partages: number;
    commentaires: number;
  };
}

const ProfileStats = () => {
  const [stats, setStats] = useState<Statistiques | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const token = await getValidToken();
        if (!token) return setLoading(false);

        const { data } = await axios.get(
          "https://shopnet-backend.onrender.com/api/profile/statistiques",
          { headers: { Authorization: `Bearer ${token}` } }
        );

        if (data.success) setStats(data.statistiques);
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, []);

  const calcPercent = (value: number, total: number) =>
    total ? Math.round((value / total) * 100) : 0;

  if (loading)
    return (
      <View style={styles.loader}>
        <ActivityIndicator size="large" color="#4CB050" />
      </View>
    );

  if (!stats)
    return (
      <View style={styles.errorWrapper}>
        <Text style={styles.errorText}>Impossible de récupérer les statistiques.</Text>
      </View>
    );

  const totalVentes = stats.ventes.total_produits_vendus || 1;

  return (
    <View style={{ flex: 1, backgroundColor: "#202A36" }}>
      <View style={styles.fixedHeader}>
        <Text style={styles.headerText}>Dashboard SHOPNET</Text>
      </View>

      <ScrollView style={{ flex: 1, marginTop: 70, padding: 16 }}>
        <Text style={styles.sectionTitle}>Ventes</Text>
        <View style={styles.statsRow}>
          <View style={styles.statBox}>
            <FontAwesome name="shopping-cart" size={24} color="#fff" />
            <Text style={styles.statLabel}>Produits vendus</Text>
            <Text style={styles.statValue}>{stats.ventes.total_produits_vendus}</Text>
          </View>
          <View style={styles.statBox}>
            <FontAwesome name="dollar" size={24} color="#fff" />
            <Text style={styles.statLabel}>Revenu total</Text>
            <Text style={styles.statValue}>${stats.ventes.revenu_total.toFixed(2)}</Text>
          </View>
          <View style={styles.statBox}>
            <FontAwesome name="calendar" size={24} color="#fff" />
            <Text style={styles.statLabel}>Revenu ce mois</Text>
            <Text style={styles.statValue}>${stats.ventes.revenu_mensuel.toFixed(2)}</Text>
          </View>
        </View>

        <Text style={styles.sectionTitle}>Top Produits Vendus</Text>
        {stats.produits.top_vendus.map((p) => {
          const pourc = calcPercent(p.ventes || 0, totalVentes);
          return (
            <View key={p.id} style={styles.topProduit}>
              {p.image && <Image source={{ uri: p.image }} style={styles.image} />}
              <View style={styles.topInfo}>
                <Text style={styles.productTitle}>{p.title}</Text>
                <Text style={{ color: pourc > 50 ? "#4CB050" : "#FF4C4C" }}>
                  {p.ventes || 0} ventes ({pourc}%)
                </Text>
                <Text style={styles.productPrice}>
                  ${p.price !== undefined ? p.price.toFixed(2) : "0.00"}
                </Text>
                <View style={styles.barBackground}>
                  <View
                    style={[
                      styles.barFill,
                      { width: `${pourc}%`, backgroundColor: pourc > 50 ? "#4CB050" : "#FF4C4C" },
                    ]}
                  />
                </View>
              </View>
            </View>
          );
        })}

        <Text style={styles.sectionTitle}>Top Produits Vus</Text>
        {stats.produits.top_vus.map((p) => {
          const pourc = calcPercent(p.vues || 0, stats.vues.total);
          return (
            <View key={p.id} style={styles.topProduit}>
              {p.image && <Image source={{ uri: p.image }} style={styles.image} />}
              <View style={styles.topInfo}>
                <Text style={styles.productTitle}>{p.title}</Text>
                <Text style={{ color: pourc > 50 ? "#4CB050" : "#FF4C4C" }}>
                  {p.vues || 0} vues ({pourc}%)
                </Text>
                <View style={styles.barBackground}>
                  <View
                    style={[
                      styles.barFill,
                      { width: `${pourc}%`, backgroundColor: pourc > 50 ? "#4CB050" : "#FF4C4C" },
                    ]}
                  />
                </View>
              </View>
            </View>
          );
        })}

        <Text style={styles.sectionTitle}>Interactions</Text>
        <View style={styles.statsRow}>
          <View style={styles.statBox}>
            <FontAwesome name="heart" size={24} color="#FF4C4C" />
            <Text style={styles.statLabel}>Likes</Text>
            <Text style={styles.statValue}>{stats.interactions.likes}</Text>
          </View>
          <View style={styles.statBox}>
            <FontAwesome name="share" size={24} color="#4CB050" />
            <Text style={styles.statLabel}>Partages</Text>
            <Text style={styles.statValue}>{stats.interactions.partages}</Text>
          </View>
          <View style={styles.statBox}>
            <FontAwesome name="comment" size={24} color="#007AFF" />
            <Text style={styles.statLabel}>Commentaires</Text>
            <Text style={styles.statValue}>{stats.interactions.commentaires}</Text>
          </View>
          <View style={styles.statBox}>
            <FontAwesome name="eye" size={24} color="#FFA500" />
            <Text style={styles.statLabel}>Vues</Text>
            <Text style={styles.statValue}>{stats.vues.total}</Text>
          </View>
        </View>

        <View style={{ height: 30 }} />
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  fixedHeader: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 70,
    backgroundColor: "#4CB050",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 999,
  },
  headerText: { fontSize: 24, fontWeight: "bold", color: "#fff" },
  sectionTitle: { fontSize: 22, fontWeight: "700", color: "#fff", marginTop: 20, marginBottom: 10 },
  statsRow: { flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between" },
  statBox: {
    width: width / 2 - 24,
    backgroundColor: "#2b3645",
    borderRadius: 10,
    padding: 12,
    marginBottom: 12,
  },
  statLabel: { color: "#fff", fontSize: 14, marginTop: 4 },
  statValue: { color: "#fff", fontSize: 20, fontWeight: "bold" },
  topProduit: { flexDirection: "row", alignItems: "center", marginVertical: 6 },
  image: { width: 50, height: 50, borderRadius: 6, marginRight: 12 },
  topInfo: { flex: 1 },
  productTitle: { color: "#fff", fontWeight: "600" },
  productPrice: { color: "#fff", fontSize: 14, marginTop: 2 },
  barBackground: {
    width: "100%",
    height: 8,
    backgroundColor: "#2b3645",
    borderRadius: 4,
    marginTop: 4,
  },
  barFill: {
    height: 8,
    borderRadius: 4,
  },
  loader: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#202A36" },
  errorWrapper: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#202A36" },
  errorText: { color: "red", fontSize: 16, textAlign: "center" },
});

export default ProfileStats;
