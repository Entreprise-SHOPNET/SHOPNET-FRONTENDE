

import React, { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  Image,
  TouchableOpacity,
  ScrollView,
  Dimensions,
  RefreshControl,
  StatusBar,
  SafeAreaView,
} from "react-native";
import axios from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Ionicons, MaterialIcons, FontAwesome } from "@expo/vector-icons";
import { useRouter } from "expo-router";

const { width } = Dimensions.get("window");

// Couleurs SHOPNET PRO VIP
const SHOPNET_BLUE = "#00182A";
const PRO_BLUE = "#42A5F5";
const PRO_GREEN = "#4CAF50";
const PRO_ORANGE = "#FF9800";
const PRO_RED = "#F44336";
const PRO_PURPLE = "#9C27B0";
const PREMIUM_GOLD = "#FFD700";
const CARD_BG = "rgba(30, 42, 59, 0.9)";
const BORDER_COLOR = "rgba(66, 165, 245, 0.1)";
const TEXT_WHITE = "#FFFFFF";
const TEXT_SECONDARY = "#A0AEC0";
const SUCCESS_GREEN = "#4CAF50";
const ERROR_RED = "#FF6B6B";

type TopProduct = {
  id: number;
  title: string;
  ventes?: number;
  vues?: number;
  image: string | null;
};

type StatsResponse = {
  success: boolean;
  statistiques: {
    ventes: {
      total_produits_vendus: number | string;
      revenu_total: number;
      revenu_mensuel: number;
    };
    produits: {
      total_produits_en_vente: number;
      top_vendus: TopProduct[];
      top_vus: TopProduct[];
    };
    interactions: {
      likes: number;
      partages: number;
      commentaires: number;
    };
  };
};

const SellerStatsScreen = () => {
  const router = useRouter();
  const [data, setData] = useState<StatsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchStats = useCallback(async () => {
    setError(null);
    try {
      const token = await AsyncStorage.getItem("userToken");
      if (!token) {
        setError("Connectez-vous pour voir vos statistiques");
        setLoading(false);
        return;
      }

      const res = await axios.get<StatsResponse>(
        "https://shopnet-backend.onrender.com/api/profile/statistiques",
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
          timeout: 10000,
        },
      );

      setData(res.data);
    } catch (err: any) {
      console.error("Erreur fetchStats:", err.message || err);
      setError("Erreur de connexion au serveur");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchStats();
  };

  // Formater les nombres
  const formatNumber = (num: number | string) => {
    const n = typeof num === "string" ? parseInt(num) : num;
    if (isNaN(n)) return "0";
    if (n >= 1000000) return (n / 1000000).toFixed(1).replace('.0', '') + "M";
    if (n >= 1000) return (n / 1000).toFixed(1).replace('.0', '') + "K";
    return n.toString();
  };

  const formatCurrency = (amount: number) => {
    if (amount >= 1000000) {
      return `$${(amount / 1000000).toFixed(1).replace('.0', '')}M`;
    }
    if (amount >= 1000) {
      return `$${(amount / 1000).toFixed(1).replace('.0', '')}K`;
    }
    return `$${amount.toLocaleString("fr-FR", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
  };

  // Écran de chargement
  if (loading && !refreshing) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={PRO_BLUE} />
        <Text style={styles.loadingText}>Chargement des statistiques...</Text>
      </View>
    );
  }

  // Écran d'erreur
  if (error) {
    return (
      <View style={styles.errorContainer}>
        <Ionicons name="cloud-offline" size={80} color={ERROR_RED} />
        <Text style={styles.errorTitle}>Erreur</Text>
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={fetchStats}>
          <Ionicons name="refresh" size={20} color={TEXT_WHITE} />
          <Text style={styles.retryButtonText}>Réessayer</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // Écran si pas de données
  if (!data || !data.success) {
    return (
      <View style={styles.errorContainer}>
        <Ionicons name="stats-chart" size={80} color={TEXT_SECONDARY} />
        <Text style={styles.errorTitle}>Aucune donnée</Text>
        <Text style={styles.errorText}>Aucune statistique disponible pour le moment</Text>
        <TouchableOpacity style={styles.retryButton} onPress={fetchStats}>
          <Ionicons name="refresh" size={20} color={TEXT_WHITE} />
          <Text style={styles.retryButtonText}>Actualiser</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const stats = data.statistiques;

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar backgroundColor={SHOPNET_BLUE} barStyle="light-content" />

      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>Tableau de Bord</Text>
          <Text style={styles.headerSubtitle}>Vue d'ensemble de votre activité</Text>
        </View>
        <TouchableOpacity
          style={styles.refreshButton}
          onPress={onRefresh}
          disabled={refreshing}
        >
          {refreshing ? (
            <ActivityIndicator size="small" color={PRO_BLUE} />
          ) : (
            <Ionicons name="refresh" size={22} color={PRO_BLUE} />
          )}
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[PRO_BLUE]}
            tintColor={PRO_BLUE}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Statistiques Principales */}
        <View style={styles.mainStatsSection}>
          <View style={styles.sectionHeader}>
            <MaterialIcons name="dashboard" size={20} color={PRO_BLUE} />
            <Text style={styles.sectionTitle}>Statistiques Clés</Text>
          </View>
          
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false}
            style={styles.horizontalStatsScroll}
            contentContainerStyle={styles.horizontalStatsContent}
          >
            <View style={[styles.statCard, { borderColor: PRO_GREEN + '40' }]}>
              <View style={[styles.statIcon, { backgroundColor: PRO_GREEN + '20' }]}>
                <FontAwesome name="dollar" size={16} color={PRO_GREEN} />
              </View>
              <Text style={[styles.statValue, { color: PRO_GREEN }]}>{formatCurrency(stats.ventes.revenu_total)}</Text>
              <Text style={styles.statTitle}>Revenu Total</Text>
            </View>
            
            <View style={[styles.statCard, { borderColor: PRO_RED + '40' }]}>
              <View style={[styles.statIcon, { backgroundColor: PRO_RED + '20' }]}>
                <FontAwesome name="shopping-cart" size={16} color={PRO_RED} />
              </View>
              <Text style={[styles.statValue, { color: PRO_RED }]}>{formatNumber(stats.ventes.total_produits_vendus)}</Text>
              <Text style={styles.statTitle}>Ventes Total</Text>
            </View>
            
            <View style={[styles.statCard, { borderColor: PRO_BLUE + '40' }]}>
              <View style={[styles.statIcon, { backgroundColor: PRO_BLUE + '20' }]}>
                <FontAwesome name="eye" size={16} color={PRO_BLUE} />
              </View>
              <Text style={[styles.statValue, { color: PRO_BLUE }]}>{formatNumber(stats.produits.total_produits_en_vente)}</Text>
              <Text style={styles.statTitle}>Produits en vente</Text>
            </View>
            
            <View style={[styles.statCard, { borderColor: PRO_ORANGE + '40' }]}>
              <View style={[styles.statIcon, { backgroundColor: PRO_ORANGE + '20' }]}>
                <FontAwesome name="calendar" size={16} color={PRO_ORANGE} />
              </View>
              <Text style={[styles.statValue, { color: PRO_ORANGE }]}>{formatCurrency(stats.ventes.revenu_mensuel)}</Text>
              <Text style={styles.statTitle}>Ce Mois</Text>
            </View>
          </ScrollView>
        </View>

        {/* Métriques d'Engagement */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="stats-chart" size={20} color={PRO_PURPLE} />
            <Text style={styles.sectionTitle}>Engagement</Text>
          </View>
          <View style={styles.engagementGrid}>
            <View style={[styles.engagementCard, { borderColor: PRO_RED + '40' }]}>
              <View style={[styles.engagementIcon, { backgroundColor: PRO_RED + '20' }]}>
                <Ionicons name="heart-outline" size={24} color={PRO_RED} />
              </View>
              <Text style={styles.engagementValue}>{formatNumber(stats.interactions.likes)}</Text>
              <Text style={styles.engagementLabel}>Likes</Text>
            </View>
            
            <View style={[styles.engagementCard, { borderColor: PRO_GREEN + '40' }]}>
              <View style={[styles.engagementIcon, { backgroundColor: PRO_GREEN + '20' }]}>
                <Ionicons name="share-social-outline" size={24} color={PRO_GREEN} />
              </View>
              <Text style={styles.engagementValue}>{formatNumber(stats.interactions.partages)}</Text>
              <Text style={styles.engagementLabel}>Partages</Text>
            </View>
            
            <View style={[styles.engagementCard, { borderColor: PRO_BLUE + '40' }]}>
              <View style={[styles.engagementIcon, { backgroundColor: PRO_BLUE + '20' }]}>
                <Ionicons name="chatbubble-outline" size={24} color={PRO_BLUE} />
              </View>
              <Text style={styles.engagementValue}>{formatNumber(stats.interactions.commentaires || 0)}</Text>
              <Text style={styles.engagementLabel}>Commentaires</Text>
            </View>
          </View>
        </View>

        {/* Top Produits Vendus */}
        <View style={styles.topProductsSection}>
          <View style={styles.sectionHeader}>
            <Ionicons name="trophy-outline" size={24} color={PREMIUM_GOLD} />
            <Text style={styles.sectionTitle}>Top Produits Vendus</Text>
          </View>

          {stats.produits.top_vendus && stats.produits.top_vendus.length > 0 ? (
            <View style={styles.productsList}>
              {stats.produits.top_vendus.map((item, index) => (
                <TouchableOpacity
                  key={item.id.toString()}
                  style={styles.productCard}
                  onPress={() => {
                    router.push({
                      pathname: "/(tabs)/Auth/Panier/DetailId",
                      params: { id: item.id.toString() },
                    });
                  }}
                  activeOpacity={0.8}
                >
                  <View style={[
                    styles.rankBadge,
                    index === 0 ? styles.rankFirst :
                    index === 1 ? styles.rankSecond :
                    styles.rankThird
                  ]}>
                    <Text style={styles.rankText}>#{index + 1}</Text>
                  </View>
                  <Image
                    source={{ uri: item.image || "https://via.placeholder.com/80" }}
                    style={styles.productImage}
                    resizeMode="cover"
                  />
                  <View style={styles.productInfo}>
                    <Text style={styles.productTitle} numberOfLines={2}>
                      {item.title || "Produit sans nom"}
                    </Text>
                    <View style={styles.productStats}>
                      <View style={styles.statRow}>
                        <Ionicons name="cart" size={16} color={SUCCESS_GREEN} />
                        <Text style={styles.statCount}>{formatNumber(item.ventes || 0)}</Text>
                        <Text style={styles.statLabel}>ventes</Text>
                      </View>
                    </View>
                  </View>
                  <Ionicons name="chevron-forward" size={20} color={TEXT_SECONDARY} />
                </TouchableOpacity>
              ))}
            </View>
          ) : (
            <View style={styles.emptySection}>
              <Ionicons name="cart-outline" size={48} color={TEXT_SECONDARY} />
              <Text style={styles.emptyText}>Aucune vente enregistrée</Text>
            </View>
          )}
        </View>

        {/* Top Produits Vus */}
        <View style={styles.topProductsSection}>
          <View style={styles.sectionHeader}>
            <Ionicons name="eye-outline" size={24} color={PRO_BLUE} />
            <Text style={styles.sectionTitle}>Top Produits Vus</Text>
          </View>

          {stats.produits.top_vus && stats.produits.top_vus.length > 0 ? (
            <View style={styles.productsList}>
              {stats.produits.top_vus.map((item, index) => (
                <TouchableOpacity
                  key={item.id.toString()}
                  style={styles.productCard}
                  onPress={() => {
                    router.push({
                      pathname: "/(tabs)/Auth/Panier/DetailId",
                      params: { id: item.id.toString() },
                    });
                  }}
                  activeOpacity={0.8}
                >
                  <View style={[
                    styles.rankBadge,
                    index === 0 ? styles.rankFirst :
                    index === 1 ? styles.rankSecond :
                    styles.rankThird
                  ]}>
                    <Text style={styles.rankText}>#{index + 1}</Text>
                  </View>
                  <Image
                    source={{ uri: item.image || "https://via.placeholder.com/80" }}
                    style={styles.productImage}
                    resizeMode="cover"
                  />
                  <View style={styles.productInfo}>
                    <Text style={styles.productTitle} numberOfLines={2}>
                      {item.title || "Produit sans nom"}
                    </Text>
                    <View style={styles.productStats}>
                      <View style={styles.statRow}>
                        <Ionicons name="eye" size={16} color={PRO_BLUE} />
                        <Text style={styles.statCount}>{formatNumber(item.vues || 0)}</Text>
                        <Text style={styles.statLabel}>vues</Text>
                      </View>
                    </View>
                  </View>
                  <Ionicons name="chevron-forward" size={20} color={TEXT_SECONDARY} />
                </TouchableOpacity>
              ))}
            </View>
          ) : (
            <View style={styles.emptySection}>
              <Ionicons name="eye-outline" size={48} color={TEXT_SECONDARY} />
              <Text style={styles.emptyText}>Aucune vue enregistrée</Text>
            </View>
          )}
        </View>

        {/* Actions Rapides */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="flash-outline" size={24} color={PREMIUM_GOLD} />
            <Text style={styles.sectionTitle}>Actions Rapides</Text>
          </View>
          <View style={styles.actionsGrid}>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => router.push("/(tabs)/Auth/Produits/Produit")}
              activeOpacity={0.8}
            >
              <View style={[styles.actionIcon, { backgroundColor: SUCCESS_GREEN + '20' }]}>
                <Ionicons name="add-circle-outline" size={24} color={SUCCESS_GREEN} />
              </View>
              <Text style={styles.actionLabel}>Nouveau Produit</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => router.push("/(tabs)/Auth/Profiles/ProductStats")}
              activeOpacity={0.8}
            >
              <View style={[styles.actionIcon, { backgroundColor: PRO_BLUE + '20' }]}>
                <Ionicons name="analytics-outline" size={24} color={PRO_BLUE} />
              </View>
              <Text style={styles.actionLabel}>Analytiques</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>
            Mis à jour à {new Date().toLocaleTimeString("fr-FR", {
              hour: "2-digit",
              minute: "2-digit",
            })}
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: SHOPNET_BLUE,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: SHOPNET_BLUE,
    padding: 20,
  },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: SHOPNET_BLUE,
    padding: 20,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 20,
    backgroundColor: SHOPNET_BLUE,
    borderBottomWidth: 1,
    borderBottomColor: BORDER_COLOR,
  },
  headerContent: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: "800",
    color: TEXT_WHITE,
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 16,
    color: TEXT_SECONDARY,
    fontWeight: "500",
  },
  refreshButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: CARD_BG,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: BORDER_COLOR,
  },
  scrollView: {
    flex: 1,
  },
  mainStatsSection: {
    marginHorizontal: 16,
    marginTop: 8,
    marginBottom: 16,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
    gap: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: TEXT_WHITE,
  },
  horizontalStatsScroll: {
    marginHorizontal: -4,
  },
  horizontalStatsContent: {
    paddingHorizontal: 4,
    paddingVertical: 8,
  },
  statCard: {
    width: 140,
    backgroundColor: CARD_BG,
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    marginLeft: 8,
    alignItems: "center",
  },
  statIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 12,
  },
  statValue: {
    fontSize: 20,
    fontWeight: "800",
    marginBottom: 4,
    textAlign: "center",
  },
  statTitle: {
    fontSize: 13,
    color: "rgba(255, 255, 255, 0.9)",
    fontWeight: "600",
    textAlign: "center",
  },
  section: {
    marginHorizontal: 16,
    marginBottom: 24,
  },
  engagementGrid: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  engagementCard: {
    width: (width - 56) / 3,
    backgroundColor: CARD_BG,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: "center",
  },
  engagementIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 8,
  },
  engagementValue: {
    fontSize: 16,
    fontWeight: "800",
    color: TEXT_WHITE,
    marginBottom: 2,
    textAlign: "center",
  },
  engagementLabel: {
    fontSize: 11,
    color: "rgba(255, 255, 255, 0.9)",
    fontWeight: "600",
    textAlign: "center",
  },
  topProductsSection: {
    marginHorizontal: 16,
    marginBottom: 24,
  },
  productsList: {
    gap: 8,
  },
  productCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: CARD_BG,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: BORDER_COLOR,
  },
  rankBadge: {
    width: 32,
    height: 32,
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
    borderWidth: 2,
  },
  rankFirst: {
    backgroundColor: "rgba(255, 215, 0, 0.15)",
    borderColor: "#FFD700",
  },
  rankSecond: {
    backgroundColor: "rgba(192, 192, 192, 0.15)",
    borderColor: "#C0C0C0",
  },
  rankThird: {
    backgroundColor: "rgba(205, 127, 50, 0.15)",
    borderColor: "#CD7F32",
  },
  rankText: {
    fontSize: 12,
    fontWeight: "800",
    color: TEXT_WHITE,
  },
  productImage: {
    width: 60,
    height: 60,
    borderRadius: 8,
    backgroundColor: "#2C3A4A",
  },
  productInfo: {
    flex: 1,
    marginLeft: 12,
    marginRight: 12,
  },
  productTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: TEXT_WHITE,
    marginBottom: 6,
    lineHeight: 18,
  },
  productStats: {
    flexDirection: "column",
  },
  statRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  statCount: {
    fontSize: 14,
    fontWeight: "700",
    color: TEXT_WHITE,
    marginLeft: 2,
  },
  statLabel: {
    fontSize: 12,
    color: TEXT_SECONDARY,
    fontWeight: "500",
  },
  emptySection: {
    alignItems: "center",
    paddingVertical: 40,
    backgroundColor: CARD_BG,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: BORDER_COLOR,
  },
  emptyText: {
    color: TEXT_SECONDARY,
    fontSize: 16,
    marginTop: 12,
    fontWeight: "600",
  },
  actionsGrid: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  actionButton: {
    width: (width - 56) / 2,
    backgroundColor: CARD_BG,
    borderRadius: 12,
    padding: 16,
    alignItems: "center",
    borderWidth: 1,
    borderColor: BORDER_COLOR,
  },
  actionIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 8,
  },
  actionLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: TEXT_WHITE,
    textAlign: "center",
  },
  footer: {
    padding: 20,
    alignItems: "center",
  },
  footerText: {
    fontSize: 12,
    color: TEXT_SECONDARY,
    fontWeight: "500",
  },
  loadingText: {
    color: PRO_BLUE,
    fontSize: 16,
    marginTop: 12,
    fontWeight: "500",
  },
  errorTitle: {
    color: ERROR_RED,
    fontSize: 24,
    fontWeight: "700",
    marginTop: 16,
    marginBottom: 8,
  },
  errorText: {
    color: TEXT_SECONDARY,
    fontSize: 16,
    textAlign: "center",
    marginBottom: 24,
    lineHeight: 22,
  },
  retryButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: PRO_BLUE,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
    gap: 8,
  },
  retryButtonText: {
    color: TEXT_WHITE,
    fontSize: 16,
    fontWeight: "600",
  },
});

export default SellerStatsScreen;