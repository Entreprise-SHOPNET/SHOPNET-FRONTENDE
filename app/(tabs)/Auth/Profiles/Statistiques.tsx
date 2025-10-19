import React, { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  FlatList,
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
import { Ionicons, MaterialIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";

const { width } = Dimensions.get("window");

// Couleurs SHOPNET PRO VIP
const SHOPNET_BLUE = "#00182A";
const PRO_BLUE = "#42A5F5";
const PREMIUM_GOLD = "#FFD700";
const CARD_BG = "#1E2A3B";
const TEXT_WHITE = "#FFFFFF";
const TEXT_SECONDARY = "#A0AEC0";
const SUCCESS_GREEN = "#4CAF50";
const ERROR_RED = "#FF6B6B";
const WARNING_ORANGE = "#FFA726";

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
    vues: {
      total: number | string;
    };
    interactions: {
      likes: number;
      partages: number;
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

  const formatNumber = (num: number | string) => {
    const n = typeof num === "string" ? parseInt(num) : num;
    if (n >= 1000000) return (n / 1000000).toFixed(1) + "M";
    if (n >= 1000) return (n / 1000).toFixed(1) + "K";
    return n.toString();
  };

  const formatCurrency = (amount: number) => {
    return `$${amount.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  if (loading && !refreshing) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <StatusBar backgroundColor={SHOPNET_BLUE} barStyle="light-content" />
        <ActivityIndicator size="large" color={PRO_BLUE} />
        <Text style={styles.loadingText}>Chargement des statistiques...</Text>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.errorContainer}>
        <StatusBar backgroundColor={SHOPNET_BLUE} barStyle="light-content" />
        <Ionicons name="cloud-offline" size={80} color={ERROR_RED} />
        <Text style={styles.errorTitle}>Erreur</Text>
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={fetchStats}>
          <Ionicons name="refresh" size={20} color={TEXT_WHITE} />
          <Text style={styles.retryButtonText}>Réessayer</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  if (!data || !data.success) {
    return (
      <SafeAreaView style={styles.errorContainer}>
        <StatusBar backgroundColor={SHOPNET_BLUE} barStyle="light-content" />
        <Ionicons name="stats-chart" size={80} color={TEXT_SECONDARY} />
        <Text style={styles.errorTitle}>Aucune donnée</Text>
        <Text style={styles.errorText}>
          Aucune statistique disponible pour le moment
        </Text>
        <TouchableOpacity style={styles.retryButton} onPress={fetchStats}>
          <Ionicons name="refresh" size={20} color={TEXT_WHITE} />
          <Text style={styles.retryButtonText}>Actualiser</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  const stats = data.statistiques;

  const StatCard = ({
    icon,
    label,
    value,
    color = PRO_BLUE,
  }: {
    icon: string;
    label: string;
    value: string | number;
    color?: string;
  }) => (
    <View style={styles.statCard}>
      <View style={styles.statHeader}>
        <View style={[styles.statIcon, { backgroundColor: `${color}20` }]}>
          <Ionicons name={icon as any} size={24} color={color} />
        </View>
      </View>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );

  const ProductCard = ({
    item,
    type,
    rank,
  }: {
    item: TopProduct;
    type: "vendu" | "vu";
    rank: number;
  }) => (
    <TouchableOpacity
      style={styles.productCard}
      onPress={() =>
        router.push({
          pathname: "/(tabs)/Auth/Panier/DetailId",
          params: { id: item.id.toString() },
        })
      }
      activeOpacity={0.8}
    >
      <View style={styles.rankBadge}>
        <Text style={styles.rankText}>#{rank}</Text>
      </View>
      <Image
        source={{
          uri: item.image || "https://via.placeholder.com/80",
        }}
        style={styles.productImage}
        resizeMode="cover"
      />
      <View style={styles.productInfo}>
        <Text style={styles.productTitle} numberOfLines={2}>
          {item.title}
        </Text>
        <View style={styles.productStats}>
          <View style={styles.statRow}>
            <Ionicons
              name={type === "vendu" ? "cart" : "eye"}
              size={16}
              color={type === "vendu" ? SUCCESS_GREEN : PRO_BLUE}
            />
            <Text style={styles.statCount}>
              {type === "vendu" ? (item.ventes ?? 0) : (item.vues ?? 0)}
            </Text>
            <Text style={styles.statLabel}>
              {type === "vendu" ? "ventes" : "vues"}
            </Text>
          </View>
        </View>
      </View>
      <Ionicons name="chevron-forward" size={20} color={TEXT_SECONDARY} />
    </TouchableOpacity>
  );

  const ActionButton = ({
    icon,
    label,
    onPress,
    color = PRO_BLUE,
  }: {
    icon: string;
    label: string;
    onPress: () => void;
    color?: string;
  }) => (
    <TouchableOpacity
      style={styles.actionButton}
      onPress={onPress}
      activeOpacity={0.8}
    >
      <View style={[styles.actionIcon, { backgroundColor: `${color}20` }]}>
        <Ionicons name={icon as any} size={24} color={color} />
      </View>
      <Text style={styles.actionLabel}>{label}</Text>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar backgroundColor={SHOPNET_BLUE} barStyle="light-content" />

      {/* Header Élégant */}
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>Tableau de Bord</Text>
          <Text style={styles.headerSubtitle}>
            Vue d'ensemble de votre activité
          </Text>
        </View>
        <TouchableOpacity
          style={styles.refreshButton}
          onPress={onRefresh}
          disabled={refreshing}
        >
          <Ionicons
            name="refresh"
            size={22}
            color={PRO_BLUE}
            style={refreshing && styles.refreshing}
          />
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
          <Text style={styles.sectionTitle}>Aperçu des Performances</Text>
          <View style={styles.mainStatsGrid}>
            <StatCard
              icon="bag-check-outline"
              label="Produits Vendus"
              value={formatNumber(stats.ventes.total_produits_vendus)}
              color={SUCCESS_GREEN}
            />
            <StatCard
              icon="cash-outline"
              label="Revenu Total"
              value={formatCurrency(stats.ventes.revenu_total)}
              color={PREMIUM_GOLD}
            />
            <StatCard
              icon="calendar-outline"
              label="Ce Mois"
              value={formatCurrency(stats.ventes.revenu_mensuel)}
              color={PRO_BLUE}
            />
            <StatCard
              icon="cube-outline"
              label="En Vente"
              value={stats.produits.total_produits_en_vente}
              color={WARNING_ORANGE}
            />
          </View>
        </View>

        {/* Métriques d'Engagement */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Engagement</Text>
          <View style={styles.engagementGrid}>
            <View style={styles.engagementCard}>
              <Ionicons name="eye-outline" size={28} color={PRO_BLUE} />
              <View style={styles.engagementInfo}>
                <Text style={styles.engagementValue}>
                  {formatNumber(stats.vues.total)}
                </Text>
                <Text style={styles.engagementLabel}>Vues Total</Text>
              </View>
            </View>
            <View style={styles.engagementCard}>
              <Ionicons name="heart-outline" size={28} color={ERROR_RED} />
              <View style={styles.engagementInfo}>
                <Text style={styles.engagementValue}>
                  {formatNumber(stats.interactions.likes)}
                </Text>
                <Text style={styles.engagementLabel}>Likes</Text>
              </View>
            </View>
            <View style={styles.engagementCard}>
              <Ionicons
                name="share-social-outline"
                size={28}
                color={SUCCESS_GREEN}
              />
              <View style={styles.engagementInfo}>
                <Text style={styles.engagementValue}>
                  {formatNumber(stats.interactions.partages)}
                </Text>
                <Text style={styles.engagementLabel}>Partages</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Top Produits */}
        <View style={styles.topProductsSection}>
          <View style={styles.sectionHeader}>
            <Ionicons name="trophy-outline" size={24} color={PREMIUM_GOLD} />
            <Text style={styles.sectionTitle}>Produits Performants</Text>
          </View>

          <FlatList
            data={stats.produits.top_vendus}
            keyExtractor={(item) => item.id.toString()}
            renderItem={({ item, index }) => (
              <ProductCard item={item} type="vendu" rank={index + 1} />
            )}
            scrollEnabled={false}
            ItemSeparatorComponent={() => <View style={styles.separator} />}
            ListEmptyComponent={
              <View style={styles.emptySection}>
                <Ionicons
                  name="cart-outline"
                  size={48}
                  color={TEXT_SECONDARY}
                />
                <Text style={styles.emptyText}>Aucune vente enregistrée</Text>
                <Text style={styles.emptySubtext}>
                  Vos produits performants apparaîtront ici
                </Text>
              </View>
            }
          />
        </View>

        {/* Actions Rapides */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="flash-outline" size={24} color={PREMIUM_GOLD} />
            <Text style={styles.sectionTitle}>Actions Rapides</Text>
          </View>
          <View style={styles.actionsGrid}>
            <ActionButton
              icon="add-circle-outline"
              label="Nouveau Produit"
              onPress={() => router.push("/(tabs)/Auth/Produits/Produit")}
              color={SUCCESS_GREEN}
            />
            <ActionButton
              icon="analytics-outline"
              label="Analytiques"
              onPress={() => router.push("/(tabs)/Auth/Profiles/ProductStats")}
              color={PRO_BLUE}
            />
            <ActionButton
              icon="time-outline"
              label="Historique"
              onPress={() => router.push("/MisAjour")}
              color={WARNING_ORANGE}
            />
            <ActionButton
              icon="settings-outline"
              label="Paramètres"
              onPress={() => router.push("/MisAjour")}
              color={TEXT_SECONDARY}
            />
          </View>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>
            Mis à jour à{" "}
            {new Date().toLocaleTimeString("fr-FR", {
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
    padding: 8,
  },
  refreshing: {
    opacity: 0.5,
  },
  scrollView: {
    flex: 1,
  },
  mainStatsSection: {
    padding: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: TEXT_WHITE,
    marginBottom: 16,
  },
  mainStatsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  statCard: {
    width: (width - 64) / 2,
    backgroundColor: CARD_BG,
    padding: 20,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(66, 165, 245, 0.1)",
  },
  statHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 12,
  },
  statIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  statValue: {
    fontSize: 24,
    fontWeight: "800",
    color: TEXT_WHITE,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 14,
    color: TEXT_SECONDARY,
    fontWeight: "500",
  },
  section: {
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
    gap: 8,
  },
  engagementGrid: {
    flexDirection: "row",
    gap: 12,
  },
  engagementCard: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: CARD_BG,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(66, 165, 245, 0.1)",
    gap: 12,
  },
  engagementInfo: {
    flex: 1,
  },
  engagementValue: {
    fontSize: 18,
    fontWeight: "800",
    color: TEXT_WHITE,
    marginBottom: 2,
  },
  engagementLabel: {
    fontSize: 12,
    color: TEXT_SECONDARY,
    fontWeight: "500",
  },
  topProductsSection: {
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  productCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: CARD_BG,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(66, 165, 245, 0.1)",
  },
  rankBadge: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: PREMIUM_GOLD,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  rankText: {
    fontSize: 14,
    fontWeight: "800",
    color: SHOPNET_BLUE,
  },
  productImage: {
    width: 50,
    height: 50,
    borderRadius: 8,
    backgroundColor: "#2C3A4A",
  },
  productInfo: {
    flex: 1,
    marginLeft: 12,
    marginRight: 12,
  },
  productTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: TEXT_WHITE,
    marginBottom: 6,
    lineHeight: 20,
  },
  productStats: {
    flexDirection: "row",
    alignItems: "center",
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
  separator: {
    height: 8,
  },
  emptySection: {
    alignItems: "center",
    paddingVertical: 40,
    backgroundColor: CARD_BG,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(66, 165, 245, 0.1)",
  },
  emptyText: {
    color: TEXT_SECONDARY,
    fontSize: 16,
    marginTop: 12,
    fontWeight: "600",
  },
  emptySubtext: {
    color: TEXT_SECONDARY,
    fontSize: 14,
    marginTop: 4,
    textAlign: "center",
  },
  actionsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  actionButton: {
    width: (width - 64) / 2,
    backgroundColor: CARD_BG,
    borderRadius: 12,
    padding: 20,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(66, 165, 245, 0.1)",
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

// ✅ EXPORT CORRECT
export default SellerStatsScreen;
