


// AssistantDashboard.tsx
import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  ActivityIndicator,
  RefreshControl,
  Modal,
  Alert,
  Image,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation } from '@react-navigation/native';
import {
  FontAwesome5,
  MaterialIcons,
  Ionicons,
  Feather,
  AntDesign,
} from '@expo/vector-icons';
import { LineChart, BarChart, ProgressChart } from 'react-native-chart-kit';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const SHOPNET_BLUE = "#00182A";
const PREMIUM_GOLD = "#FFA726";
const VALID_GREEN = "#4DB14E";
const PENDING_BLUE = "#42A5F5";
const CHART_PURPLE = "#9C27B0";
const CHART_ORANGE = "#FF9800";
const DANGER_RED = "#F44336";

// ------------------------- Types (basés sur le backend amélioré) -------------------------
interface ActionRecommandee {
  type: string;
  label: string;
  description: string;
  priority: string;
  cout_estime?: number;
  duree_jours?: number;
}

interface MoneyInsight {
  type: string;
  message: string;
  gravite?: string;
  action?: string;
  gain_estime?: number;
  new_price_suggestion?: string;
}

interface PredictionVentes {
  ventes_estimees_30j: number;
  chiffre_affaires_estime: string;
  niveau_confiance: string;
}

interface SuggestionPrix {
  prix_actuel: string;
  prix_suggere: string;
  raison: string;
}

interface ConcurrenceData {
  avg_price_category: string;
  nb_competitors_category: number;
  avg_price_similar_products: string;
  nb_similar_products: number;
}

interface AIPredictions {
  best_time_to_post: string;
  action_recommendation: string;
  conversion_probability: number;
  expected_boost: string;
  raw_action: string;
}

interface Product {
  id: number;
  title: string;
  price: string;
  stock: number;
  views: number;
  likes: number;
  age_heures: number;
  nb_images: number;
  images: string[];
  main_image: string | null;
  category: string;
  is_boosted: boolean;
  score: number;
  statut: string;
  actions_recommandees: ActionRecommandee[];
  money_insights: MoneyInsight[];
  prediction_ventes: PredictionVentes;
  suggestion_prix: SuggestionPrix;
  concurrence: ConcurrenceData;
  ai_predictions: AIPredictions;
}

interface DashboardStats {
  total_products: number;
  total_views: number;
  total_likes: number;
  avg_views_per_product: number;
  avg_likes_per_product: number;
  platform_avg_views: number;
  platform_avg_likes: number;
}

interface DashboardData {
  stats: DashboardStats;
  products: Product[];
  top_products: Product[];
  weak_products: Product[];
  produits_a_supprimer: { id: number; title: string; raison: string; score: number; main_image?: string }[];
  recommandations_globales: string[];
  global_ai_predictions: { type: string; message: string; priority: string }[];
}

interface ApiResponse {
  success: boolean;
  dashboard: DashboardData;
  message?: string;
}

const API_URL = "https://shopnet-backend.onrender.com/assistant-ia/dashboard";

export default function AssistantDashboard() {
  const navigation = useNavigation();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [dashboard, setDashboard] = useState<DashboardData | null>(null);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'products' | 'insights'>('overview');

  const getAuthToken = async () => {
    try {
      return await AsyncStorage.getItem('userToken');
    } catch (error) {
      return null;
    }
  };

  const fetchDashboard = async () => {
    try {
      const token = await getAuthToken();
      if (!token) {
        Alert.alert('Erreur', 'Vous devez être connecté');
        navigation.goBack();
        return;
      }

      const response = await fetch(API_URL, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });
      const data: ApiResponse = await response.json();

      if (data.success && data.dashboard) {
        setDashboard(data.dashboard);
      } else {
        Alert.alert('Erreur', data.message || 'Impossible de charger les données');
      }
    } catch (error) {
      console.error(error);
      Alert.alert('Erreur réseau', 'Vérifiez votre connexion');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchDashboard();
  }, []);

  useEffect(() => {
    fetchDashboard();
  }, []);

  const formatNumber = (num: number): string => {
    if (typeof num !== 'number' || isNaN(num)) return '0';
    if (num >= 1_000_000) return (num / 1_000_000).toFixed(1).replace('.0', '') + 'M';
    if (num >= 1_000) return (num / 1_000).toFixed(1).replace('.0', '') + 'k';
    return num.toString();
  };

  const getScoreColor = (score: number) => {
    if (score < 40) return DANGER_RED;
    if (score < 70) return CHART_ORANGE;
    return VALID_GREEN;
  };

  const getPriorityColor = (priority: string) => {
    switch (priority.toLowerCase()) {
      case 'critique':
      case 'haute':
        return DANGER_RED;
      case 'moyenne':
        return CHART_ORANGE;
      default:
        return '#888';
    }
  };

  // Préparer les données pour le graphique à barres (Top 5 produits par score)
  const topProductsByScore = dashboard
    ? [...dashboard.products].sort((a, b) => b.score - a.score).slice(0, 5)
    : [];
  const barChartData = {
    labels: topProductsByScore.map(p => p.title.length > 12 ? p.title.slice(0,10)+'…' : p.title),
    datasets: [{ data: topProductsByScore.map(p => p.score) }],
  };

  // Répartition des statuts produits
  const statusCount = dashboard ? {
    star: dashboard.top_products.length,
    bon: dashboard.products.filter(p => p.score >= 60 && p.score < 80).length,
    moyen: dashboard.products.filter(p => p.score >= 40 && p.score < 60).length,
    faible: dashboard.weak_products.length,
  } : { star: 0, bon: 0, moyen: 0, faible: 0 };
  const progressChartData = {
    labels: ['Stars', 'Bons', 'Moyens', 'Faibles'],
    data: dashboard && dashboard.products.length > 0 ? [
      statusCount.star / dashboard.products.length,
      statusCount.bon / dashboard.products.length,
      statusCount.moyen / dashboard.products.length,
      statusCount.faible / dashboard.products.length,
    ] : [0,0,0,0],
  };

  // Données pour le graphique d'engagement (ligne simulée à partir des données existantes)
  const engagementData = dashboard ? {
    labels: ['Likes', 'Vues', 'Score'],
    datasets: [{ data: [dashboard.stats.total_likes, dashboard.stats.total_views, dashboard.stats.avg_views_per_product] }],
  } : { labels: [], datasets: [{ data: [] }] };

  const renderKPI = () => {
    if (!dashboard) return null;
    const { stats } = dashboard;
    const engagementRate = stats.total_views > 0 ? (stats.total_likes / stats.total_views) * 100 : 0;
    return (
      <View style={styles.kpiGrid}>
        <View style={styles.kpiCard}>
          <FontAwesome5 name="box" size={20} color={PREMIUM_GOLD} />
          <Text style={styles.kpiValue}>{stats.total_products}</Text>
          <Text style={styles.kpiLabel}>Produits</Text>
          <Text style={styles.kpiSubLabel}>actifs</Text>
        </View>
        <View style={styles.kpiCard}>
          <Feather name="eye" size={20} color={PENDING_BLUE} />
          <Text style={styles.kpiValue}>{formatNumber(stats.total_views)}</Text>
          <Text style={styles.kpiLabel}>Vues totales</Text>
          <Text style={styles.kpiSubLabel}>période</Text>
        </View>
        <View style={styles.kpiCard}>
          <AntDesign name="like1" size={20} color={VALID_GREEN} />
          <Text style={styles.kpiValue}>{formatNumber(stats.total_likes)}</Text>
          <Text style={styles.kpiLabel}>J'aime</Text>
          <Text style={styles.kpiSubLabel}>engagement</Text>
        </View>
        <View style={styles.kpiCard}>
          <MaterialIcons name="trending-up" size={20} color={CHART_PURPLE} />
          <Text style={styles.kpiValue}>{stats.avg_views_per_product.toFixed(0)}</Text>
          <Text style={styles.kpiLabel}>Moy. vues/prod</Text>
          <Text style={styles.kpiSubLabel}>performance</Text>
        </View>
        <View style={styles.kpiCard}>
          <MaterialIcons name="compare-arrows" size={20} color={CHART_ORANGE} />
          <Text style={styles.kpiValue}>{stats.platform_avg_views}</Text>
          <Text style={styles.kpiLabel}>Plateforme (vues)</Text>
          <Text style={styles.kpiSubLabel}>référence</Text>
        </View>
        <View style={styles.kpiCard}>
          <FontAwesome5 name="chart-line" size={20} color={PREMIUM_GOLD} />
          <Text style={styles.kpiValue}>{engagementRate.toFixed(1)}%</Text>
          <Text style={styles.kpiLabel}>Taux d'engagement</Text>
          <Text style={styles.kpiSubLabel}>likes/vues</Text>
        </View>
      </View>
    );
  };

  const renderCharts = () => {
    if (!dashboard || dashboard.products.length === 0) return null;
    return (
      <View style={styles.chartsContainer}>
        <View style={styles.chartCard}>
          <Text style={styles.chartTitle}>🏆 Top produits par score</Text>
          <BarChart
            data={barChartData}
            width={SCREEN_WIDTH - 40}
            height={200}
            yAxisSuffix=""
            yAxisLabel=""
            chartConfig={{
              backgroundColor: 'transparent',
              backgroundGradientFrom: 'rgba(30,42,59,0.8)',
              backgroundGradientTo: 'rgba(30,42,59,0.8)',
              decimalPlaces: 0,
              color: (opacity = 1) => `rgba(255, 167, 38, ${opacity})`,
              labelColor: (opacity = 1) => `rgba(255,255,255,${opacity})`,
              style: { borderRadius: 16 },
            }}
            style={styles.chart}
            showBarTops={false}
            fromZero
          />
        </View>

        <View style={styles.chartCard}>
          <Text style={styles.chartTitle}>📊 Répartition des performances</Text>
          <ProgressChart
            data={progressChartData}
            width={SCREEN_WIDTH - 40}
            height={180}
            strokeWidth={12}
            radius={32}
            chartConfig={{
              backgroundColor: 'transparent',
              backgroundGradientFrom: 'rgba(30,42,59,0.8)',
              backgroundGradientTo: 'rgba(30,42,59,0.8)',
              color: (opacity = 1, index) => {
                const colors = [VALID_GREEN, PENDING_BLUE, CHART_ORANGE, DANGER_RED];
                return colors[index % colors.length];
              },
              labelColor: (opacity = 1) => `rgba(255,255,255,${opacity})`,
            }}
            hideLegend={false}
          />
        </View>

        <View style={styles.chartCard}>
          <Text style={styles.chartTitle}>📈 Comparaison clés</Text>
          <LineChart
            data={engagementData}
            width={SCREEN_WIDTH - 40}
            height={200}
            chartConfig={{
              backgroundColor: 'transparent',
              backgroundGradientFrom: 'rgba(30,42,59,0.8)',
              backgroundGradientTo: 'rgba(30,42,59,0.8)',
              decimalPlaces: 0,
              color: (opacity = 1) => `rgba(66, 165, 245, ${opacity})`,
              labelColor: (opacity = 1) => `rgba(255,255,255,${opacity})`,
              style: { borderRadius: 16 },
            }}
            bezier
            style={styles.chart}
          />
        </View>
      </View>
    );
  };

  const renderGlobalRecommendations = () => {
    if (!dashboard || dashboard.recommandations_globales.length === 0) return null;
    return (
      <View style={styles.sectionCard}>
        <View style={styles.sectionHeader}>
          <FontAwesome5 name="lightbulb" size={22} color={PREMIUM_GOLD} />
          <Text style={styles.sectionTitle}>Recommandations globales</Text>
        </View>
        {dashboard.recommandations_globales.map((rec, idx) => (
          <View key={idx} style={styles.recommendationItem}>
            <Text style={styles.recommendationBullet}>•</Text>
            <Text style={styles.recommendationText}>{rec}</Text>
          </View>
        ))}
      </View>
    );
  };

  const renderAIPredictions = () => {
    if (!dashboard || dashboard.global_ai_predictions.length === 0) return null;
    return (
      <View style={styles.sectionCard}>
        <View style={styles.sectionHeader}>
          <Ionicons name="brain-outline" size={22} color={CHART_PURPLE} />
          <Text style={styles.sectionTitle}>Prédictions IA globales</Text>
        </View>
        {dashboard.global_ai_predictions.map((pred, idx) => (
          <View key={idx} style={[styles.predictionCard, { borderLeftColor: getPriorityColor(pred.priority) }]}>
            <Text style={styles.predictionMessage}>{pred.message}</Text>
            <Text style={styles.predictionPriority}>Priorité: {pred.priority}</Text>
          </View>
        ))}
      </View>
    );
  };

  const renderProductList = (products: Product[], title: string, icon: string, filter?: (p: Product) => boolean) => {
    const filtered = filter ? products.filter(filter) : products;
    if (filtered.length === 0) return null;
    return (
      <View style={styles.sectionCard}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionIcon}>{icon}</Text>
          <Text style={styles.sectionTitle}>{title} ({filtered.length})</Text>
        </View>
        {filtered.slice(0, 5).map((product) => (
          <TouchableOpacity
            key={product.id}
            style={styles.productItem}
            onPress={() => {
              setSelectedProduct(product);
              setModalVisible(true);
            }}
          >
            <View style={styles.productItemLeft}>
              <View style={styles.productImageContainer}>
                {product.main_image ? (
                  <Image source={{ uri: product.main_image }} style={styles.productImage} />
                ) : (
                  <View style={styles.productImagePlaceholder}>
                    <FontAwesome5 name="image" size={20} color="#888" />
                  </View>
                )}
              </View>
              <View style={styles.productInfo}>
                <Text style={styles.productName} numberOfLines={1}>{product.title}</Text>
                <View style={styles.productMeta}>
                  <Text style={styles.productPrice}>{product.price}</Text>
                  <View style={[styles.scoreBadge, { backgroundColor: getScoreColor(product.score) }]}>
                    <Text style={styles.scoreText}>{product.score}</Text>
                  </View>
                </View>
                <Text style={styles.productStats}>👁️ {formatNumber(product.views)}  ❤️ {formatNumber(product.likes)}</Text>
              </View>
            </View>
            <Feather name="chevron-right" size={18} color="#888" />
          </TouchableOpacity>
        ))}
        {filtered.length > 5 && (
          <Text style={styles.moreText}>+{filtered.length - 5} autres produits</Text>
        )}
      </View>
    );
  };

  const renderProductsOverview = () => {
    if (!dashboard) return null;
    return (
      <>
        {renderProductList(dashboard.top_products, 'Produits stars', '🔥', p => p.score >= 75)}
        {renderProductList(dashboard.weak_products, 'Potentiel faible', '⚠️', p => p.score < 40)}
        {dashboard.produits_a_supprimer.length > 0 && (
          <View style={styles.sectionCard}>
            <View style={styles.sectionHeader}>
              <MaterialIcons name="delete-outline" size={22} color={DANGER_RED} />
              <Text style={styles.sectionTitle}>Produits morts à supprimer</Text>
            </View>
            {dashboard.produits_a_supprimer.map((item) => (
              <View key={item.id} style={styles.deleteItem}>
                {item.main_image && (
                  <Image source={{ uri: item.main_image }} style={styles.deleteImage} />
                )}
                <View style={styles.deleteContent}>
                  <Text style={styles.deleteTitle}>{item.title}</Text>
                  <Text style={styles.deleteReason}>{item.raison}</Text>
                </View>
              </View>
            ))}
          </View>
        )}
      </>
    );
  };

  const renderProductModal = () => {
    if (!selectedProduct) return null;
    const p = selectedProduct;
    return (
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle} numberOfLines={2}>{p.title}</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)} style={styles.modalClose}>
                <MaterialIcons name="close" size={24} color="#fff" />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.modalBody}>
              {p.main_image && (
                <Image source={{ uri: p.main_image }} style={styles.modalImage} />
              )}
              <View style={styles.modalSection}>
                <Text style={styles.modalSectionTitle}>📊 Métriques clés</Text>
                <View style={styles.modalStatsGrid}>
                  <View style={styles.modalStat}>
                    <Text style={styles.modalStatValue}>{p.score}</Text>
                    <Text style={styles.modalStatLabel}>Score</Text>
                  </View>
                  <View style={styles.modalStat}>
                    <Text style={styles.modalStatValue}>{formatNumber(p.views)}</Text>
                    <Text style={styles.modalStatLabel}>Vues</Text>
                  </View>
                  <View style={styles.modalStat}>
                    <Text style={styles.modalStatValue}>{formatNumber(p.likes)}</Text>
                    <Text style={styles.modalStatLabel}>Likes</Text>
                  </View>
                  <View style={styles.modalStat}>
                    <Text style={styles.modalStatValue}>{p.price}</Text>
                    <Text style={styles.modalStatLabel}>Prix</Text>
                  </View>
                </View>
              </View>

              <View style={styles.modalSection}>
                <Text style={styles.modalSectionTitle}>🤖 Prédiction IA</Text>
                <Text style={styles.modalText}>📅 Meilleur moment: {p.ai_predictions.best_time_to_post}</Text>
                <Text style={styles.modalText}>🎯 Conversion: {p.ai_predictions.conversion_probability}%</Text>
                <Text style={styles.modalText}>⚡ {p.ai_predictions.expected_boost}</Text>
                <Text style={styles.modalRecommendation}>{p.ai_predictions.action_recommendation}</Text>
              </View>

              {p.actions_recommandees.length > 0 && (
                <View style={styles.modalSection}>
                  <Text style={styles.modalSectionTitle}>📋 Actions recommandées</Text>
                  {p.actions_recommandees.map((action, idx) => (
                    <View key={idx} style={styles.modalAction}>
                      <Text style={[styles.modalActionLabel, { color: getPriorityColor(action.priority) }]}>
                        {action.label}
                      </Text>
                      <Text style={styles.modalActionDesc}>{action.description}</Text>
                    </View>
                  ))}
                </View>
              )}

              {p.money_insights.length > 0 && (
                <View style={styles.modalSection}>
                  <Text style={styles.modalSectionTitle}>💰 Insights financiers</Text>
                  {p.money_insights.map((insight, idx) => (
                    <Text key={idx} style={styles.modalInsight}>{insight.message}</Text>
                  ))}
                </View>
              )}

              <View style={styles.modalSection}>
                <Text style={styles.modalSectionTitle}>📈 Prédiction ventes (30j)</Text>
                <Text style={styles.modalText}>Ventes estimées: {p.prediction_ventes.ventes_estimees_30j} unités</Text>
                <Text style={styles.modalText}>CA estimé: {p.prediction_ventes.chiffre_affaires_estime}</Text>
                <Text style={styles.modalText}>Confiance: {p.prediction_ventes.niveau_confiance}</Text>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
    );
  };

  const renderOverview = () => (
    <ScrollView showsVerticalScrollIndicator={false}>
      {renderKPI()}
      {renderCharts()}
      {renderGlobalRecommendations()}
      {renderAIPredictions()}
    </ScrollView>
  );

  const renderProductsTab = () => (
    <ScrollView showsVerticalScrollIndicator={false}>
      {renderProductsOverview()}
    </ScrollView>
  );

  const renderInsightsTab = () => {
    if (!dashboard) return null;
    return (
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <MaterialIcons name="insights" size={22} color={PREMIUM_GOLD} />
            <Text style={styles.sectionTitle}>Analyse comparative</Text>
          </View>
          <View style={styles.comparisonRow}>
            <Text style={styles.comparisonLabel}>Votre moyenne vues/produit</Text>
            <Text style={styles.comparisonValue}>{dashboard.stats.avg_views_per_product.toFixed(0)}</Text>
            <Text style={styles.comparisonVs}>vs</Text>
            <Text style={styles.comparisonValue}>{dashboard.stats.platform_avg_views}</Text>
            <Text style={styles.comparisonLabel}>Plateforme</Text>
          </View>
          <View style={styles.comparisonRow}>
            <Text style={styles.comparisonLabel}>Votre moyenne likes/produit</Text>
            <Text style={styles.comparisonValue}>{dashboard.stats.avg_likes_per_product.toFixed(0)}</Text>
            <Text style={styles.comparisonVs}>vs</Text>
            <Text style={styles.comparisonValue}>{dashboard.stats.platform_avg_likes}</Text>
            <Text style={styles.comparisonLabel}>Plateforme</Text>
          </View>
          <View style={styles.scoreGauge}>
            <Text style={styles.scoreGaugeLabel}>Score moyen boutique</Text>
            <Text style={styles.scoreGaugeValue}>
              {(dashboard.products.reduce((acc, p) => acc + p.score, 0) / dashboard.products.length).toFixed(0)}
            </Text>
          </View>
        </View>
      </ScrollView>
    );
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'overview': return renderOverview();
      case 'products': return renderProductsTab();
      case 'insights': return renderInsightsTab();
      default: return renderOverview();
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar backgroundColor={SHOPNET_BLUE} barStyle="light-content" />
        <View style={styles.center}>
          <ActivityIndicator size="large" color={PREMIUM_GOLD} />
          <Text style={styles.loadingText}>Chargement de l'assistant IA...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar backgroundColor={SHOPNET_BLUE} barStyle="light-content" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Assistant IA Vendeur</Text>
          <Text style={styles.headerSubtitle}>Pro • Scoring & Prédictions</Text>
        </View>
        <TouchableOpacity onPress={onRefresh} style={styles.refreshButton}>
          <Feather name="refresh-cw" size={18} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* Tabs */}
      <View style={styles.tabsContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'overview' && styles.tabActive]}
          onPress={() => setActiveTab('overview')}
        >
          <MaterialIcons name="dashboard" size={18} color={activeTab === 'overview' ? PREMIUM_GOLD : '#aaa'} />
          <Text style={[styles.tabText, activeTab === 'overview' && styles.tabTextActive]}>Vue globale</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'products' && styles.tabActive]}
          onPress={() => setActiveTab('products')}
        >
          <Feather name="package" size={18} color={activeTab === 'products' ? PREMIUM_GOLD : '#aaa'} />
          <Text style={[styles.tabText, activeTab === 'products' && styles.tabTextActive]}>Produits</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'insights' && styles.tabActive]}
          onPress={() => setActiveTab('insights')}
        >
          <MaterialIcons name="insights" size={18} color={activeTab === 'insights' ? PREMIUM_GOLD : '#aaa'} />
          <Text style={[styles.tabText, activeTab === 'insights' && styles.tabTextActive]}>Comparaisons</Text>
        </TouchableOpacity>
      </View>

      {/* Main content */}
      <ScrollView
        style={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[PREMIUM_GOLD]} />}
      >
        {renderContent()}
        <View style={styles.footer}>
          <Text style={styles.footerText}>
            Données mises à jour en temps réel • Assistant v3 Pro
          </Text>
        </View>
      </ScrollView>

      {renderProductModal()}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: SHOPNET_BLUE },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { color: '#fff', marginTop: 12, fontSize: 14 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
  },
  backButton: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },
  headerCenter: { flex: 1, alignItems: 'center' },
  headerTitle: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
  headerSubtitle: { color: PREMIUM_GOLD, fontSize: 12, marginTop: 2 },
  refreshButton: { width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.1)', justifyContent: 'center', alignItems: 'center' },
  tabsContainer: { flexDirection: 'row', marginHorizontal: 16, backgroundColor: 'rgba(30,42,59,0.9)', borderRadius: 30, padding: 4, marginVertical: 12 },
  tab: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 10, borderRadius: 25, gap: 6 },
  tabActive: { backgroundColor: 'rgba(255,167,38,0.2)' },
  tabText: { color: '#aaa', fontSize: 13, fontWeight: '500' },
  tabTextActive: { color: PREMIUM_GOLD, fontWeight: '600' },
  content: { flex: 1, padding: 16 },
  kpiGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', marginBottom: 16 },
  kpiCard: { backgroundColor: 'rgba(30,42,59,0.9)', borderRadius: 16, padding: 12, width: (SCREEN_WIDTH - 48) / 2, alignItems: 'center', marginBottom: 12 },
  kpiValue: { color: '#fff', fontSize: 22, fontWeight: 'bold', marginTop: 8 },
  kpiLabel: { color: '#fff', fontSize: 12, fontWeight: '600', marginTop: 4 },
  kpiSubLabel: { color: 'rgba(255,255,255,0.5)', fontSize: 10, marginTop: 2 },
  chartsContainer: { gap: 16, marginBottom: 16 },
  chartCard: { backgroundColor: 'rgba(30,42,59,0.9)', borderRadius: 16, padding: 12 },
  chartTitle: { color: '#fff', fontSize: 14, fontWeight: '600', marginBottom: 8 },
  chart: { borderRadius: 12, marginLeft: -20 },
  sectionCard: { backgroundColor: 'rgba(30,42,59,0.9)', borderRadius: 16, padding: 16, marginBottom: 16 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 12, gap: 8 },
  sectionIcon: { fontSize: 18 },
  sectionTitle: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  recommendationItem: { flexDirection: 'row', marginBottom: 8, paddingLeft: 4 },
  recommendationBullet: { color: PREMIUM_GOLD, marginRight: 8, fontSize: 14 },
  recommendationText: { color: 'rgba(255,255,255,0.8)', flex: 1, fontSize: 13 },
  predictionCard: { backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 12, padding: 12, marginBottom: 8, borderLeftWidth: 3 },
  predictionMessage: { color: '#fff', fontSize: 13, marginBottom: 4 },
  predictionPriority: { color: 'rgba(255,255,255,0.5)', fontSize: 11 },
  productItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.1)' },
  productItemLeft: { flex: 1, flexDirection: 'row', alignItems: 'center' },
  productImageContainer: { width: 50, height: 50, borderRadius: 8, marginRight: 12, backgroundColor: '#1e2a3b', overflow: 'hidden' },
  productImage: { width: 50, height: 50, resizeMode: 'cover' },
  productImagePlaceholder: { width: 50, height: 50, justifyContent: 'center', alignItems: 'center' },
  productInfo: { flex: 1 },
  productName: { color: '#fff', fontSize: 14, fontWeight: '600' },
  productMeta: { flexDirection: 'row', alignItems: 'center', marginTop: 4, gap: 8 },
  productPrice: { color: PREMIUM_GOLD, fontSize: 12, fontWeight: '600' },
  scoreBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 20 },
  scoreText: { color: '#fff', fontSize: 12, fontWeight: 'bold' },
  productStats: { color: 'rgba(255,255,255,0.6)', fontSize: 11, marginTop: 4 },
  moreText: { color: PREMIUM_GOLD, fontSize: 12, textAlign: 'center', marginTop: 12 },
  deleteItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.1)' },
  deleteImage: { width: 40, height: 40, borderRadius: 6, marginRight: 12 },
  deleteContent: { flex: 1 },
  deleteTitle: { color: DANGER_RED, fontSize: 14, fontWeight: '600' },
  deleteReason: { color: 'rgba(255,255,255,0.7)', fontSize: 12, marginTop: 2 },
  comparisonRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  comparisonLabel: { color: 'rgba(255,255,255,0.7)', fontSize: 12, flex: 1 },
  comparisonValue: { color: '#fff', fontSize: 18, fontWeight: 'bold', marginHorizontal: 8 },
  comparisonVs: { color: PREMIUM_GOLD, fontSize: 12 },
  scoreGauge: { alignItems: 'center', marginTop: 16, paddingTop: 16, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.1)' },
  scoreGaugeLabel: { color: 'rgba(255,255,255,0.7)', fontSize: 12 },
  scoreGaugeValue: { color: PREMIUM_GOLD, fontSize: 32, fontWeight: 'bold', marginTop: 4 },
  footer: { paddingVertical: 16, alignItems: 'center' },
  footerText: { color: 'rgba(255,255,255,0.4)', fontSize: 11 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: SHOPNET_BLUE, borderTopLeftRadius: 20, borderTopRightRadius: 20, maxHeight: '85%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.1)' },
  modalTitle: { color: '#fff', fontSize: 18, fontWeight: 'bold', flex: 1 },
  modalClose: { padding: 8 },
  modalBody: { padding: 16 },
  modalImage: { width: '100%', height: 200, borderRadius: 12, marginBottom: 16, resizeMode: 'cover' },
  modalSection: { marginBottom: 20 },
  modalSectionTitle: { color: PREMIUM_GOLD, fontSize: 16, fontWeight: '600', marginBottom: 12 },
  modalStatsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  modalStat: { backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 12, padding: 12, flex: 1, minWidth: (SCREEN_WIDTH - 64) / 2, alignItems: 'center' },
  modalStatValue: { color: '#fff', fontSize: 20, fontWeight: 'bold' },
  modalStatLabel: { color: 'rgba(255,255,255,0.6)', fontSize: 11, marginTop: 4 },
  modalText: { color: 'rgba(255,255,255,0.8)', fontSize: 13, marginBottom: 6 },
  modalRecommendation: { color: PREMIUM_GOLD, fontSize: 13, fontStyle: 'italic', marginTop: 6 },
  modalAction: { marginBottom: 12, paddingLeft: 8, borderLeftWidth: 2, borderLeftColor: '#888' },
  modalActionLabel: { fontSize: 14, fontWeight: '600', marginBottom: 2 },
  modalActionDesc: { color: 'rgba(255,255,255,0.7)', fontSize: 12 },
  modalInsight: { color: 'rgba(255,255,255,0.8)', fontSize: 12, marginBottom: 6, paddingLeft: 8 },
});

