

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
import { Ionicons, MaterialIcons, FontAwesome, Feather } from "@expo/vector-icons";
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
const WARNING_ORANGE = "#FFA726";

type TopProduct = {
  id: number;
  title: string;
  ventes?: number;
  vues?: number;
  likes?: number;
  commentaires?: number;
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

  // Calculer les vues totales selon la formule : (ventes * 2) + (likes * 3)
  const calculateTotalVues = () => {
    if (!data || !data.statistiques) return 0;
    const ventes = typeof data.statistiques.ventes.total_produits_vendus === 'string' 
      ? parseInt(data.statistiques.ventes.total_produits_vendus) 
      : data.statistiques.ventes.total_produits_vendus;
    const likes = data.statistiques.interactions.likes;
    return (ventes * 2) + (likes * 3);
  };

  // Calculer les vues pour un produit spécifique
  const calculateProductVues = (produit: TopProduct) => {
    const ventesVues = (produit.ventes || 0) * 2;
    const likesVues = (data?.statistiques.interactions.likes || 0) * 0.1;
    return Math.round(ventesVues + likesVues);
  };

  // Formater les nombres en K et M
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
  const totalVuesCalcule = calculateTotalVues();

  // Composant de carte de statistique compacte
  const CompactStatCard = ({
    icon,
    title,
    value,
    color = PRO_BLUE,
    trend,
  }: {
    icon: string;
    title: string;
    value: string | number;
    color?: string;
    trend?: string;
  }) => (
    <View style={[styles.compactStatCard, { borderColor: color + '40' }]}>
      <View style={styles.compactStatTop}>
        <View style={[styles.compactStatIcon, { backgroundColor: color + '20' }]}>
          <FontAwesome name={icon as any} size={16} color={color} />
        </View>
        {trend && (
          <View style={styles.compactStatTrend}>
            <Feather name="trending-up" size={10} color={color} />
            <Text style={[styles.compactStatTrendText, { color }]}>{trend}</Text>
          </View>
        )}
      </View>
      <Text style={[styles.compactStatValue, { color }]}>{value}</Text>
      <Text style={styles.compactStatTitle}>{title}</Text>
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
  }) => {
    // Calcul des vues pour ce produit
    const productVues = type === "vu" ? calculateProductVues(item) : item.ventes || 0;
    
    return (
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
        <View style={[
          styles.rankBadge,
          rank === 1 ? styles.rankFirst :
          rank === 2 ? styles.rankSecond :
          rank === 3 ? styles.rankThird : styles.rankOther
        ]}>
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
                {type === "vendu" ? formatNumber(item.ventes || 0) : formatNumber(productVues)}
              </Text>
              <Text style={styles.statLabel}>
                {type === "vendu" ? "ventes" : "vues"}
              </Text>
            </View>
            {type === "vu" && (
              <View style={styles.vuesFormula}>
                <Text style={styles.vuesFormulaText}>
                  = ({item.ventes || 0} × 2) + ({stats.interactions.likes} × 3)
                </Text>
              </View>
            )}
          </View>
        </View>
        <Ionicons name="chevron-forward" size={20} color={TEXT_SECONDARY} />
      </TouchableOpacity>
    );
  };

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
        {/* Statistiques Principales - Alignement Horizontal */}
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
            <CompactStatCard
              icon="dollar"
              title="Revenu Total"
              value={formatCurrency(stats.ventes.revenu_total)}
              color={PRO_GREEN}
              trend={`+${formatNumber(stats.ventes.revenu_mensuel)}`}
            />
            
            <CompactStatCard
              icon="shopping-cart"
              title="Ventes Total"
              value={formatNumber(stats.ventes.total_produits_vendus)}
              color={PRO_RED}
              trend="Hot"
            />
            
            <CompactStatCard
              icon="eye"
              title="Vues Total"
              value={formatNumber(totalVuesCalcule)}
              color={PRO_BLUE}
              trend={`${formatNumber(totalVuesCalcule)}`}
            />
            
            <CompactStatCard
              icon="calendar"
              title="Ce Mois"
              value={formatCurrency(stats.ventes.revenu_mensuel)}
              color={PRO_ORANGE}
              trend="Boost"
            />
          </ScrollView>
        </View>

        {/* Calcul des Vues */}
        <View style={styles.calculationCard}>
          <View style={styles.calculationHeader}>
            <MaterialIcons name="calculate" size={20} color={PRO_BLUE} />
            <Text style={styles.calculationTitle}>Calcul des Vues</Text>
          </View>
          <View style={styles.calculationContent}>
            <View style={styles.calculationRow}>
              <Text style={styles.calculationLabel}>Ventes totales</Text>
              <Text style={styles.calculationValue}>
                {formatNumber(stats.ventes.total_produits_vendus)}
              </Text>
              <Text style={styles.calculationSymbol}>× 2 =</Text>
              <Text style={styles.calculationResult}>
                {formatNumber(typeof stats.ventes.total_produits_vendus === 'string' 
                  ? parseInt(stats.ventes.total_produits_vendus) * 2 
                  : stats.ventes.total_produits_vendus * 2)} vues
              </Text>
            </View>
            <View style={styles.calculationRow}>
              <Text style={styles.calculationLabel}>Likes</Text>
              <Text style={styles.calculationValue}>
                {formatNumber(stats.interactions.likes)}
              </Text>
              <Text style={styles.calculationSymbol}>× 3 =</Text>
              <Text style={styles.calculationResult}>
                {formatNumber(stats.interactions.likes * 3)} vues
              </Text>
            </View>
            <View style={styles.calculationTotal}>
              <Text style={styles.calculationTotalLabel}>VUES TOTALES</Text>
              <Text style={styles.calculationTotalValue}>
                {formatNumber(totalVuesCalcule)}
              </Text>
            </View>
          </View>
        </View>

        {/* Métriques d'Engagement */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="stats-chart" size={20} color={PRO_PURPLE} />
            <Text style={styles.sectionTitle}>Engagement</Text>
          </View>
          <View style={styles.engagementGrid}>
            <View style={[styles.engagementCard, { borderColor: PRO_BLUE + '40' }]}>
              <View style={[styles.engagementIcon, { backgroundColor: PRO_BLUE + '20' }]}>
                <Ionicons name="eye-outline" size={24} color={PRO_BLUE} />
              </View>
              <View style={styles.engagementInfo}>
                <Text style={styles.engagementValue}>
                  {formatNumber(totalVuesCalcule)}
                </Text>
                <Text style={styles.engagementLabel}>Vues Total</Text>
                <Text style={styles.engagementSubtitle}>
                  Ventes×2 + Likes×3
                </Text>
              </View>
            </View>
            
            <View style={[styles.engagementCard, { borderColor: PRO_RED + '40' }]}>
              <View style={[styles.engagementIcon, { backgroundColor: PRO_RED + '20' }]}>
                <Ionicons name="heart-outline" size={24} color={PRO_RED} />
              </View>
              <View style={styles.engagementInfo}>
                <Text style={styles.engagementValue}>
                  {formatNumber(stats.interactions.likes)}
                </Text>
                <Text style={styles.engagementLabel}>Likes</Text>
                <Text style={styles.engagementSubtitle}>
                  ×3 = vues
                </Text>
              </View>
            </View>
            
            <View style={[styles.engagementCard, { borderColor: PRO_GREEN + '40' }]}>
              <View style={[styles.engagementIcon, { backgroundColor: PRO_GREEN + '20' }]}>
                <Ionicons name="share-social-outline" size={24} color={PRO_GREEN} />
              </View>
              <View style={styles.engagementInfo}>
                <Text style={styles.engagementValue}>
                  {formatNumber(stats.interactions.partages)}
                </Text>
                <Text style={styles.engagementLabel}>Partages</Text>
                <Text style={styles.engagementSubtitle}>
                  Viralité
                </Text>
              </View>
            </View>
            
            <View style={[styles.engagementCard, { borderColor: PRO_ORANGE + '40' }]}>
              <View style={[styles.engagementIcon, { backgroundColor: PRO_ORANGE + '20' }]}>
                <Ionicons name="chatbubble-outline" size={24} color={PRO_ORANGE} />
              </View>
              <View style={styles.engagementInfo}>
                <Text style={styles.engagementValue}>
                  {formatNumber(stats.interactions.commentaires || 0)}
                </Text>
                <Text style={styles.engagementLabel}>Commentaires</Text>
                <Text style={styles.engagementSubtitle}>
                  Engagement
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* Top Produits Vendus */}
        <View style={styles.topProductsSection}>
          <View style={styles.sectionHeader}>
            <Ionicons name="trophy-outline" size={24} color={PREMIUM_GOLD} />
            <Text style={styles.sectionTitle}>Top Produits Vendus</Text>
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

        {/* Top Produits Vus */}
        <View style={styles.topProductsSection}>
          <View style={styles.sectionHeader}>
            <Ionicons name="eye-outline" size={24} color={PRO_BLUE} />
            <Text style={styles.sectionTitle}>Top Produits Vus</Text>
          </View>

          <FlatList
            data={stats.produits.top_vus}
            keyExtractor={(item) => item.id.toString()}
            renderItem={({ item, index }) => (
              <ProductCard item={item} type="vu" rank={index + 1} />
            )}
            scrollEnabled={false}
            ItemSeparatorComponent={() => <View style={styles.separator} />}
            ListEmptyComponent={
              <View style={styles.emptySection}>
                <Ionicons
                  name="eye-outline"
                  size={48}
                  color={TEXT_SECONDARY}
                />
                <Text style={styles.emptyText}>Aucune vue enregistrée</Text>
                <Text style={styles.emptySubtext}>
                  Les vues de vos produits apparaîtront ici
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
  // Styles pour les statistiques horizontales compactes
  horizontalStatsScroll: {
    marginHorizontal: -4,
  },
  horizontalStatsContent: {
    paddingHorizontal: 4,
    paddingVertical: 8,
  },
  compactStatCard: {
    width: 140,
    backgroundColor: CARD_BG,
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    marginLeft: 8,
  },
  compactStatTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 12,
  },
  compactStatIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
  },
  compactStatTrend: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 10,
  },
  compactStatTrendText: {
    fontSize: 9,
    fontWeight: "600",
    marginLeft: 2,
  },
  compactStatValue: {
    fontSize: 20,
    fontWeight: "800",
    marginBottom: 4,
  },
  compactStatTitle: {
    fontSize: 13,
    color: "rgba(255, 255, 255, 0.9)",
    fontWeight: "600",
  },
  calculationCard: {
    marginHorizontal: 16,
    marginBottom: 24,
    backgroundColor: CARD_BG,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: BORDER_COLOR,
  },
  calculationHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },
  calculationTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: TEXT_WHITE,
    marginLeft: 10,
  },
  calculationContent: {
    backgroundColor: "rgba(0, 0, 0, 0.2)",
    borderRadius: 12,
    padding: 16,
  },
  calculationRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
    justifyContent: "space-between",
  },
  calculationLabel: {
    fontSize: 13,
    color: "rgba(255, 255, 255, 0.8)",
    flex: 2,
  },
  calculationValue: {
    fontSize: 14,
    fontWeight: "700",
    color: PRO_BLUE,
    flex: 1,
    textAlign: "center",
  },
  calculationSymbol: {
    fontSize: 13,
    color: "rgba(255, 255, 255, 0.6)",
    flex: 1,
    textAlign: "center",
  },
  calculationResult: {
    fontSize: 14,
    fontWeight: "600",
    color: PRO_GREEN,
    flex: 2,
    textAlign: "right",
  },
  calculationTotal: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: "rgba(255, 255, 255, 0.1)",
  },
  calculationTotalLabel: {
    fontSize: 12,
    color: "rgba(255, 255, 255, 0.6)",
    fontWeight: "700",
  },
  calculationTotalValue: {
    fontSize: 20,
    fontWeight: "800",
    color: PRO_BLUE,
  },
  section: {
    marginHorizontal: 16,
    marginBottom: 24,
  },
  engagementGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  engagementCard: {
    width: (width - 56) / 2,
    backgroundColor: CARD_BG,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
  },
  engagementIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 12,
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
    color: "rgba(255, 255, 255, 0.9)",
    fontWeight: "600",
    marginBottom: 2,
  },
  engagementSubtitle: {
    fontSize: 10,
    color: "rgba(255, 255, 255, 0.6)",
  },
  topProductsSection: {
    marginHorizontal: 16,
    marginBottom: 24,
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
  rankOther: {
    backgroundColor: "rgba(66, 165, 245, 0.15)",
    borderColor: PRO_BLUE,
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
    marginBottom: 4,
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
  vuesFormula: {
    marginTop: 2,
  },
  vuesFormulaText: {
    fontSize: 10,
    color: "rgba(255, 255, 255, 0.5)",
    fontStyle: "italic",
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
    borderColor: BORDER_COLOR,
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