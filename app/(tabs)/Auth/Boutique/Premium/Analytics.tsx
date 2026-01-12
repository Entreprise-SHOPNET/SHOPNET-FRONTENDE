

// app/(tabs)/analytics.tsx - Version complète et corrigée
import React, { useState, useEffect } from 'react';
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
  Alert,
  Modal,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import {
  FontAwesome5,
  MaterialIcons,
  Ionicons,
  Feather,
  AntDesign,
} from '@expo/vector-icons';
import { LineChart } from 'react-native-chart-kit';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const SHOPNET_BLUE = "#00182A";
const PREMIUM_GOLD = "#FFA726";
const VALID_GREEN = "#4DB14E";
const PENDING_BLUE = "#42A5F5";
const CHART_PURPLE = "#9C27B0";
const CHART_ORANGE = "#FF9800";
const DANGER_RED = "#F44336";

// 🔹 Serveur Render en production
const LOCAL_API = "https://shopnet-backend.onrender.com/api";

// Types basés sur le backend
interface Boutique {
  id: number;
  nom: string;
  type: 'premium';
  statut: 'validé' | 'pending_validation' | 'rejeté';
  logo?: string;
  date_creation: string;
}

interface AnalyticsData {
  success: boolean;
  period_days: number;
  totalProducts: number;
  totalViews: number;
  totalLikes: number;
  totalShares: number;
  totalComments: number;
  totalSales: number;
  popularProducts: ProductAnalytics[];
}

interface ProductAnalytics {
  id: number;
  name: string;
  prix: number;
  category?: string;
  status: string;
  views: number;
  likes: number;
  comments: number;
  shares: number;
  sales: number;
}

interface DailyStats {
  success: boolean;
  period_days: number;
  daily_stats: {
    date: string;
    views: number;
    likes: number;
    comments: number;
    shares: number;
    sales: number;
  }[];
}

export default function Analytics() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [boutique, setBoutique] = useState<Boutique | null>(null);
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [dailyStats, setDailyStats] = useState<DailyStats['daily_stats']>([]);
  const [period, setPeriod] = useState<7 | 30>(30);
  const [activeTab, setActiveTab] = useState<'overview' | 'engagement' | 'products' | 'sales'>('overview');
  const [showProductModal, setShowProductModal] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<ProductAnalytics | null>(null);

  useEffect(() => {
    fetchAnalyticsData();
  }, [period]);

  const fetchAnalyticsData = async () => {
    try {
      setLoading(true);
      const token = await AsyncStorage.getItem('userToken');
      
      if (!token) {
        router.push('/splash');
        return;
      }

      // 1. Récupérer les informations de la boutique
      const boutiqueRes = await fetch(`${LOCAL_API}/boutique/premium/check`, {
        headers: { 
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
      });

      if (boutiqueRes.ok) {
        const boutiqueData = await boutiqueRes.json();
        if (boutiqueData.success && boutiqueData.boutique) {
          const boutiqueInfo = boutiqueData.boutique;
          setBoutique(boutiqueInfo);
          
          // 2. Récupérer les analytics globales de la boutique
          const analyticsRes = await fetch(
            `${LOCAL_API}/analytics/boutique/${boutiqueInfo.id}?period=${period}`,
            {
              headers: { 
                Authorization: `Bearer ${token}`,
                'Content-Type': 'application/json'
              },
            }
          );

          if (analyticsRes.ok) {
            const analyticsData: AnalyticsData = await analyticsRes.json();
            setAnalytics(analyticsData);
          } else {
            // Fallback en cas d'erreur
            setAnalytics({
              success: true,
              period_days: period,
              totalProducts: 0,
              totalViews: 0,
              totalLikes: 0,
              totalShares: 0,
              totalComments: 0,
              totalSales: 0,
              popularProducts: []
            });
          }

          // 3. Récupérer les statistiques quotidiennes
          const dailyRes = await fetch(
            `${LOCAL_API}/analytics/boutique/${boutiqueInfo.id}/daily?period=7`,
            {
              headers: { 
                Authorization: `Bearer ${token}`,
                'Content-Type': 'application/json'
              },
            }
          );

          if (dailyRes.ok) {
            const dailyData: DailyStats = await dailyRes.json();
            if (dailyData.success) {
              setDailyStats(dailyData.daily_stats);
            } else {
              setDailyStats([]);
            }
          } else {
            setDailyStats([]);
          }
        }
      } else {
        Alert.alert('Erreur', 'Impossible de récupérer les informations de la boutique');
      }
    } catch (error) {
      console.error('Erreur lors du chargement des analytics:', error);
      Alert.alert('Erreur', 'Impossible de charger les données analytiques');
      // Données par défaut en cas d'erreur
      setAnalytics({
        success: true,
        period_days: period,
        totalProducts: 0,
        totalViews: 0,
        totalLikes: 0,
        totalShares: 0,
        totalComments: 0,
        totalSales: 0,
        popularProducts: []
      });
      setDailyStats([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchAnalyticsData();
  };

  const formatNumber = (num: number): string => {
    if (typeof num !== 'number' || isNaN(num)) {
      return '0';
    }
    
    if (num >= 1000000) {
      const formatted = (num / 1000000).toFixed(1);
      return formatted.replace('.0', '') + 'M';
    }
    
    if (num >= 1000) {
      const formatted = (num / 1000).toFixed(1);
      return formatted.replace('.0', '') + 'K';
    }
    
    return num.toString();
  };

  const safeToFixed = (value: any, decimals: number = 1): string => {
    if (typeof value === 'number' && !isNaN(value)) {
      return value.toFixed(decimals);
    }
    return '0';
  };

  const getEngagementRate = () => {
    if (!analytics) return "0.0";
    const totalEngagement = analytics.totalLikes + analytics.totalComments + analytics.totalShares;
    const totalViews = analytics.totalViews || 1;
    return safeToFixed((totalEngagement / totalViews) * 100, 1);
  };

  const getConversionRate = () => {
    if (!analytics) return "0.00";
    const totalSales = analytics.totalSales || 0;
    const totalViews = analytics.totalViews || 1;
    return safeToFixed((totalSales / totalViews) * 100, 2);
  };

  const renderOverview = () => {
    if (!analytics) return null;

    // Préparer les données pour le graphique
    const chartLabels = dailyStats.slice(-7).map(stat => {
      try {
        const date = new Date(stat.date);
        return `${date.getDate()}/${date.getMonth() + 1}`;
      } catch {
        return '01/01';
      }
    });
    
    // S'assurer que toutes les données sont des nombres
    const chartViews = dailyStats.slice(-7).map(stat => Number(stat.views) || 0);
    const chartSales = dailyStats.slice(-7).map(stat => Number(stat.sales) || 0);

    return (
      <ScrollView showsVerticalScrollIndicator={false} style={styles.tabContent}>
        {/* Cartes de statistiques principales */}
        <View style={styles.mainStatsGrid}>
          <TouchableOpacity style={styles.mainStatCard}>
            <View style={[styles.mainStatIcon, { backgroundColor: `${PREMIUM_GOLD}20` }]}>
              <FontAwesome5 name="box" size={18} color={PREMIUM_GOLD} />
            </View>
            <Text style={styles.mainStatValue}>{analytics.totalProducts}</Text>
            <Text style={styles.mainStatLabel}>Produits</Text>
            <Text style={styles.mainStatSubLabel}>actifs</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.mainStatCard}>
            <View style={[styles.mainStatIcon, { backgroundColor: `${VALID_GREEN}20` }]}>
              <FontAwesome5 name="shopping-cart" size={18} color={VALID_GREEN} />
            </View>
            <Text style={styles.mainStatValue}>{analytics.totalSales}</Text>
            <Text style={styles.mainStatLabel}>Ventes</Text>
            <Text style={styles.mainStatSubLabel}>{period} jours</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.mainStatCard}>
            <View style={[styles.mainStatIcon, { backgroundColor: `${PENDING_BLUE}20` }]}>
              <FontAwesome5 name="eye" size={18} color={PENDING_BLUE} />
            </View>
            <Text style={styles.mainStatValue}>{formatNumber(analytics.totalViews)}</Text>
            <Text style={styles.mainStatLabel}>Vues</Text>
            <Text style={styles.mainStatSubLabel}>{period} jours</Text>
          </TouchableOpacity>
        </View>

        {/* Graphique de performance (si données disponibles) */}
        {dailyStats.length > 0 && chartViews.length > 0 && (
          <View style={styles.chartCard}>
            <View style={styles.chartHeader}>
              <MaterialIcons name="trending-up" size={18} color={PREMIUM_GOLD} />
              <Text style={styles.chartTitle}>Performance des 7 derniers jours</Text>
            </View>
            <LineChart
              data={{
                labels: chartLabels,
                datasets: [
                  {
                    data: chartViews,
                    color: (opacity = 1) => `rgba(66, 165, 245, ${opacity})`,
                    strokeWidth: 2
                  },
                  {
                    data: chartSales,
                    color: (opacity = 1) => `rgba(77, 177, 78, ${opacity})`,
                    strokeWidth: 2
                  }
                ],
                legend: ["Vues", "Ventes"]
              }}
              width={SCREEN_WIDTH - 48}
              height={200}
              chartConfig={{
                backgroundColor: 'transparent',
                backgroundGradientFrom: 'rgba(30, 42, 59, 0.8)',
                backgroundGradientTo: 'rgba(30, 42, 59, 0.8)',
                decimalPlaces: 0,
                color: (opacity = 1) => `rgba(255, 255, 255, ${opacity})`,
                labelColor: (opacity = 1) => `rgba(255, 255, 255, ${opacity})`,
                style: {
                  borderRadius: 16
                },
                propsForDots: {
                  r: "4",
                  strokeWidth: "2",
                  stroke: "#fff"
                }
              }}
              bezier
              style={{
                marginVertical: 8,
                borderRadius: 16
              }}
              fromZero={true}
              yAxisSuffix=""
            />
          </View>
        )}

        {/* Cartes d'engagement */}
        <View style={styles.statsGrid}>
          <View style={styles.statCard}>
            <View style={styles.statRow}>
              <MaterialIcons name="thumb-up" size={20} color={VALID_GREEN} />
              <View style={styles.statInfo}>
                <Text style={styles.statValue}>{formatNumber(analytics.totalLikes)}</Text>
                <Text style={styles.statLabel}>Likes</Text>
                <Text style={styles.statSubLabel}>engagement</Text>
              </View>
            </View>
          </View>

          <View style={styles.statCard}>
            <View style={styles.statRow}>
              <MaterialIcons name="share" size={20} color={CHART_PURPLE} />
              <View style={styles.statInfo}>
                <Text style={styles.statValue}>{formatNumber(analytics.totalShares)}</Text>
                <Text style={styles.statLabel}>Partages</Text>
                <Text style={styles.statSubLabel}>viralité</Text>
              </View>
            </View>
          </View>

          <View style={styles.statCard}>
            <View style={styles.statRow}>
              <MaterialIcons name="comment" size={20} color={PENDING_BLUE} />
              <View style={styles.statInfo}>
                <Text style={styles.statValue}>{formatNumber(analytics.totalComments)}</Text>
                <Text style={styles.statLabel}>Commentaires</Text>
                <Text style={styles.statSubLabel}>interaction</Text>
              </View>
            </View>
          </View>

          <View style={styles.statCard}>
            <View style={styles.statRow}>
              <MaterialIcons name="swap-vert" size={20} color={CHART_ORANGE} />
              <View style={styles.statInfo}>
                <Text style={styles.statValue}>{getEngagementRate()}%</Text>
                <Text style={styles.statLabel}>Engagement</Text>
                <Text style={styles.statSubLabel}>taux</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Résumé de performance */}
        <View style={styles.summaryCard}>
          <View style={styles.summaryHeader}>
            <MaterialIcons name="analytics" size={20} color={PREMIUM_GOLD} />
            <Text style={styles.summaryTitle}>Résumé de Performance</Text>
          </View>
          
          <View style={styles.summaryItem}>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Taux de conversion</Text>
              <Text style={styles.summaryValue}>{getConversionRate()}%</Text>
            </View>
            <Text style={styles.summarySubLabel}>Vues → Ventes</Text>
          </View>

          <View style={styles.summaryItem}>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Moyenne engagement par vue</Text>
              <Text style={styles.summaryValue}>
                {analytics.totalViews > 0 ? 
                  safeToFixed((analytics.totalLikes + analytics.totalComments + analytics.totalShares) / analytics.totalViews, 2) : "0.00"}
              </Text>
            </View>
            <Text style={styles.summarySubLabel}>interactions par vue</Text>
          </View>

          <View style={styles.summaryItem}>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Produits performants</Text>
              <Text style={styles.summaryValue}>
                {analytics.popularProducts.filter(p => p.sales > 0).length} / {analytics.totalProducts}
              </Text>
            </View>
            <Text style={styles.summarySubLabel}>avec ventes</Text>
          </View>
        </View>
      </ScrollView>
    );
  };

  const renderEngagement = () => {
    if (!analytics) return null;

    // Préparer les données pour le graphique d'engagement
    const chartLabels = dailyStats.slice(-7).map(stat => {
      try {
        const date = new Date(stat.date);
        return `${date.getDate()}/${date.getMonth() + 1}`;
      } catch {
        return '01/01';
      }
    });
    
    const chartLikes = dailyStats.slice(-7).map(stat => Number(stat.likes) || 0);
    const chartComments = dailyStats.slice(-7).map(stat => Number(stat.comments) || 0);
    const chartShares = dailyStats.slice(-7).map(stat => Number(stat.shares) || 0);

    return (
      <ScrollView showsVerticalScrollIndicator={false} style={styles.tabContent}>
        {/* Graphique d'engagement */}
        {dailyStats.length > 0 && chartLikes.length > 0 && (
          <View style={styles.chartCard}>
            <View style={styles.chartHeader}>
              <MaterialIcons name="insights" size={18} color={PREMIUM_GOLD} />
              <Text style={styles.chartTitle}>Évolution de l'Engagement (7 jours)</Text>
            </View>
            <LineChart
              data={{
                labels: chartLabels,
                datasets: [
                  {
                    data: chartLikes,
                    color: (opacity = 1) => `rgba(77, 177, 78, ${opacity})`,
                    strokeWidth: 2
                  },
                  {
                    data: chartComments,
                    color: (opacity = 1) => `rgba(156, 39, 176, ${opacity})`,
                    strokeWidth: 2
                  },
                  {
                    data: chartShares,
                    color: (opacity = 1) => `rgba(255, 152, 0, ${opacity})`,
                    strokeWidth: 2
                  }
                ],
                legend: ["Likes", "Commentaires", "Partages"]
              }}
              width={SCREEN_WIDTH - 48}
              height={220}
              chartConfig={{
                backgroundColor: 'transparent',
                backgroundGradientFrom: 'rgba(30, 42, 59, 0.8)',
                backgroundGradientTo: 'rgba(30, 42, 59, 0.8)',
                decimalPlaces: 0,
                color: (opacity = 1) => `rgba(255, 255, 255, ${opacity})`,
                labelColor: (opacity = 1) => `rgba(255, 255, 255, ${opacity})`,
                style: {
                  borderRadius: 16
                },
                propsForDots: {
                  r: "4",
                  strokeWidth: "2",
                  stroke: "#fff"
                }
              }}
              bezier
              style={{
                marginVertical: 8,
                borderRadius: 16
              }}
              fromZero={true}
              yAxisSuffix=""
            />
          </View>
        )}

        {/* Taux d'engagement global */}
        <View style={styles.engagementCard}>
          <View style={styles.engagementHeader}>
            <MaterialIcons name="analytics" size={20} color={PREMIUM_GOLD} />
            <Text style={styles.engagementTitle}>Taux d'Engagement Global</Text>
          </View>
          <View style={styles.engagementRate}>
            <Text style={styles.engagementRateValue}>{getEngagementRate()}%</Text>
            <Text style={styles.engagementRateLabel}>
              {analytics.totalViews > 0 ? 
                safeToFixed(((analytics.totalLikes + analytics.totalComments + analytics.totalShares) / analytics.totalViews) * 100, 2) : "0.00"}% des vues génèrent de l'engagement
            </Text>
          </View>
        </View>

        {/* Détail des interactions */}
        <View style={styles.detailCard}>
          <Text style={styles.detailTitle}>Détail des Interactions ({period} jours)</Text>
          
          <View style={styles.detailItem}>
            <View style={styles.detailItemLeft}>
              <View style={[styles.detailIcon, { backgroundColor: `${PENDING_BLUE}20` }]}>
                <MaterialIcons name="visibility" size={16} color={PENDING_BLUE} />
              </View>
              <Text style={styles.detailLabel}>Vues totales</Text>
            </View>
            <View style={styles.detailValueContainer}>
              <Text style={styles.detailValue}>{formatNumber(analytics.totalViews)}</Text>
            </View>
          </View>

          <View style={styles.detailItem}>
            <View style={styles.detailItemLeft}>
              <View style={[styles.detailIcon, { backgroundColor: `${VALID_GREEN}20` }]}>
                <MaterialIcons name="thumb-up" size={16} color={VALID_GREEN} />
              </View>
              <Text style={styles.detailLabel}>Likes</Text>
            </View>
            <View style={styles.detailValueContainer}>
              <Text style={styles.detailValue}>{formatNumber(analytics.totalLikes)}</Text>
              <Text style={styles.detailPercentage}>
                ({analytics.totalViews > 0 ? safeToFixed((analytics.totalLikes / analytics.totalViews) * 100, 1) : "0.0"}%)
              </Text>
            </View>
          </View>

          <View style={styles.detailItem}>
            <View style={styles.detailItemLeft}>
              <View style={[styles.detailIcon, { backgroundColor: `${CHART_PURPLE}20` }]}>
                <MaterialIcons name="comment" size={16} color={CHART_PURPLE} />
              </View>
              <Text style={styles.detailLabel}>Commentaires</Text>
            </View>
            <View style={styles.detailValueContainer}>
              <Text style={styles.detailValue}>{formatNumber(analytics.totalComments)}</Text>
              <Text style={styles.detailPercentage}>
                ({analytics.totalViews > 0 ? safeToFixed((analytics.totalComments / analytics.totalViews) * 100, 1) : "0.0"}%)
              </Text>
            </View>
          </View>

          <View style={styles.detailItem}>
            <View style={styles.detailItemLeft}>
              <View style={[styles.detailIcon, { backgroundColor: `${CHART_ORANGE}20` }]}>
                <MaterialIcons name="share" size={16} color={CHART_ORANGE} />
              </View>
              <Text style={styles.detailLabel}>Partages</Text>
            </View>
            <View style={styles.detailValueContainer}>
              <Text style={styles.detailValue}>{formatNumber(analytics.totalShares)}</Text>
              <Text style={styles.detailPercentage}>
                ({analytics.totalViews > 0 ? safeToFixed((analytics.totalShares / analytics.totalViews) * 100, 1) : "0.0"}%)
              </Text>
            </View>
          </View>
        </View>

        {/* Recommandations d'engagement */}
        <View style={styles.recommendationsCard}>
          <View style={styles.recommendationsHeader}>
            <MaterialIcons name="lightbulb" size={18} color={CHART_ORANGE} />
            <Text style={styles.recommendationsTitle}>Conseils pour Augmenter l'Engagement</Text>
          </View>
          
          <View style={styles.recommendationItem}>
            <View style={styles.recommendationIcon}>
              <MaterialIcons name="photo-camera" size={16} color={PENDING_BLUE} />
            </View>
            <View style={styles.recommendationTextContainer}>
              <Text style={styles.recommendationTitleText}>Améliorez vos photos</Text>
              <Text style={styles.recommendationText}>
                Des photos de qualité augmentent les likes de 40%
              </Text>
            </View>
          </View>

          <View style={styles.recommendationItem}>
            <View style={styles.recommendationIcon}>
              <MaterialIcons name="reply" size={16} color={VALID_GREEN} />
            </View>
            <View style={styles.recommendationTextContainer}>
              <Text style={styles.recommendationTitleText}>Répondez aux commentaires</Text>
              <Text style={styles.recommendationText}>
                Les réponses augmentent l'engagement de 25%
              </Text>
            </View>
          </View>

          <View style={styles.recommendationItem}>
            <View style={styles.recommendationIcon}>
              <MaterialIcons name="local-offer" size={16} color={CHART_PURPLE} />
            </View>
            <View style={styles.recommendationTextContainer}>
              <Text style={styles.recommendationTitleText}>Offres spéciales</Text>
              <Text style={styles.recommendationText}>
                Les promotions génèrent 3x plus de partages
              </Text>
            </View>
          </View>
        </View>
      </ScrollView>
    );
  };

  const renderProducts = () => {
    if (!analytics) return null;

    return (
      <ScrollView showsVerticalScrollIndicator={false} style={styles.tabContent}>
        {/* En-tête produits */}
        <View style={styles.productsHeader}>
          <View>
            <Text style={styles.productsTitle}>Performance des Produits</Text>
            <Text style={styles.productsSubtitle}>
              Top {Math.min(analytics.popularProducts.length, 10)} produits par engagement
            </Text>
          </View>
          <TouchableOpacity 
            style={styles.refreshSmallButton}
            onPress={fetchAnalyticsData}
          >
            <Feather name="refresh-cw" size={16} color={PREMIUM_GOLD} />
          </TouchableOpacity>
        </View>

        {/* Liste des produits */}
        <View style={styles.productsList}>
          {analytics.popularProducts.length > 0 ? (
            analytics.popularProducts.map((product, index) => (
              <TouchableOpacity 
                key={product.id} 
                style={styles.productCard}
                onPress={() => {
                  setSelectedProduct(product);
                  setShowProductModal(true);
                }}
              >
                <View style={styles.productCardHeader}>
                  <View style={styles.productRank}>
                    <Text style={styles.rankText}>#{index + 1}</Text>
                  </View>
                  <Text style={styles.productName} numberOfLines={1}>
                    {product.name}
                  </Text>
                  <View style={styles.productPrice}>
                    <Text style={styles.priceText}>{safeToFixed(product.prix, 0)} $</Text>
                  </View>
                </View>
                
                <View style={styles.productMetrics}>
                  <View style={styles.metricItem}>
                    <Feather name="eye" size={12} color={PENDING_BLUE} />
                    <Text style={styles.metricText}>{formatNumber(product.views)}</Text>
                  </View>
                  <View style={styles.metricItem}>
                    <AntDesign name="like1" size={12} color={VALID_GREEN} />
                    <Text style={styles.metricText}>{formatNumber(product.likes)}</Text>
                  </View>
                  <View style={styles.metricItem}>
                    <Feather name="message-circle" size={12} color={CHART_PURPLE} />
                    <Text style={styles.metricText}>{formatNumber(product.comments)}</Text>
                  </View>
                  <View style={styles.metricItem}>
                    <Feather name="share-2" size={12} color={CHART_ORANGE} />
                    <Text style={styles.metricText}>{formatNumber(product.shares)}</Text>
                  </View>
                  <View style={styles.metricItem}>
                    <Feather name="shopping-bag" size={12} color={DANGER_RED} />
                    <Text style={styles.metricText}>{formatNumber(product.sales)}</Text>
                  </View>
                </View>

                <View style={styles.productCardFooter}>
                  <View style={styles.productCategory}>
                    <Text style={styles.categoryText}>
                      {product.category || 'Non catégorisé'}
                    </Text>
                  </View>
                  <View style={[
                    styles.productStatus,
                    product.status === 'active' ? styles.statusActive : styles.statusInactive
                  ]}>
                    <Text style={styles.statusText}>
                      {product.status === 'active' ? '🟢 Actif' : '🔴 Inactif'}
                    </Text>
                  </View>
                </View>
              </TouchableOpacity>
            ))
          ) : (
            <View style={styles.emptyProducts}>
              <MaterialIcons name="inventory" size={40} color="rgba(255,255,255,0.3)" />
              <Text style={styles.emptyProductsText}>Aucun produit disponible</Text>
              <Text style={styles.emptyProductsSubtext}>
                Créez des produits pour voir leurs statistiques
              </Text>
            </View>
          )}
        </View>

        {/* Statistiques produits */}
        <View style={styles.productStatsCard}>
          <View style={styles.productStatsHeader}>
            <MaterialIcons name="bar-chart" size={18} color={PREMIUM_GOLD} />
            <Text style={styles.productStatsTitle}>Statistiques Globales</Text>
          </View>
          <View style={styles.productStatsGrid}>
            <View style={styles.productStatItem}>
              <Text style={styles.productStatValue}>{analytics.totalProducts}</Text>
              <Text style={styles.productStatLabel}>Produits</Text>
            </View>
            <View style={styles.productStatItem}>
              <Text style={styles.productStatValue}>
                {analytics.popularProducts.filter(p => p.status === 'active').length}
              </Text>
              <Text style={styles.productStatLabel}>Actifs</Text>
            </View>
            <View style={styles.productStatItem}>
              <Text style={styles.productStatValue}>
                {analytics.totalSales}
              </Text>
              <Text style={styles.productStatLabel}>Ventes</Text>
            </View>
            <View style={styles.productStatItem}>
              <Text style={styles.productStatValue}>
                {getConversionRate()}%
              </Text>
              <Text style={styles.productStatLabel}>Conversion</Text>
            </View>
          </View>
        </View>
      </ScrollView>
    );
  };

  const renderSales = () => {
    if (!analytics) return null;

    // Préparer les données pour le graphique des ventes
    const chartLabels = dailyStats.slice(-7).map(stat => {
      try {
        const date = new Date(stat.date);
        return `${date.getDate()}/${date.getMonth() + 1}`;
      } catch {
        return '01/01';
      }
    });
    
    const chartSales = dailyStats.slice(-7).map(stat => Number(stat.sales) || 0);

    return (
      <ScrollView showsVerticalScrollIndicator={false} style={styles.tabContent}>
        {/* Graphique des ventes */}
        {dailyStats.length > 0 && chartSales.length > 0 && (
          <View style={styles.chartCard}>
            <View style={styles.chartHeader}>
              <MaterialIcons name="trending-up" size={18} color={VALID_GREEN} />
              <Text style={styles.chartTitle}>Évolution des Ventes (7 jours)</Text>
            </View>
            <LineChart
              data={{
                labels: chartLabels,
                datasets: [
                  {
                    data: chartSales,
                    color: (opacity = 1) => `rgba(77, 177, 78, ${opacity})`,
                    strokeWidth: 3
                  }
                ]
              }}
              width={SCREEN_WIDTH - 48}
              height={200}
              chartConfig={{
                backgroundColor: 'transparent',
                backgroundGradientFrom: 'rgba(30, 42, 59, 0.8)',
                backgroundGradientTo: 'rgba(30, 42, 59, 0.8)',
                decimalPlaces: 0,
                color: (opacity = 1) => `rgba(255, 255, 255, ${opacity})`,
                labelColor: (opacity = 1) => `rgba(255, 255, 255, ${opacity})`,
                style: {
                  borderRadius: 16
                },
                propsForDots: {
                  r: "5",
                  strokeWidth: "2",
                  stroke: "#4DB14E"
                },
                fillShadowGradient: '#4DB14E',
                fillShadowGradientOpacity: 0.3
              }}
              bezier
              style={{
                marginVertical: 8,
                borderRadius: 16
              }}
              fromZero={true}
              yAxisSuffix=""
            />
          </View>
        )}

        {/* Performance des ventes */}
        <View style={styles.salesCard}>
          <View style={styles.salesHeader}>
            <MaterialIcons name="assessment" size={20} color={VALID_GREEN} />
            <Text style={styles.salesTitle}>Performance des Ventes ({period} jours)</Text>
          </View>
          <View style={styles.salesStats}>
            <View style={styles.salesStat}>
              <Text style={styles.salesStatValue}>{analytics.totalSales}</Text>
              <Text style={styles.salesStatLabel}>Ventes totales</Text>
              <Text style={styles.salesStatSubLabel}>quantité</Text>
            </View>
            <View style={styles.salesStat}>
              <Text style={styles.salesStatValue}>
                {analytics.totalProducts > 0 ? 
                  safeToFixed(analytics.totalSales / analytics.totalProducts, 1) : "0.0"}
              </Text>
              <Text style={styles.salesStatLabel}>Ventes/produit</Text>
              <Text style={styles.salesStatSubLabel}>moyenne</Text>
            </View>
            <View style={styles.salesStat}>
              <Text style={styles.salesStatValue}>
                {getConversionRate()}%
              </Text>
              <Text style={styles.salesStatLabel}>Taux conversion</Text>
              <Text style={styles.salesStatSubLabel}>vues → ventes</Text>
            </View>
          </View>
        </View>

        {/* Analyse de conversion */}
        <View style={styles.conversionCard}>
          <View style={styles.conversionHeader}>
            <MaterialIcons name="swap-vert" size={18} color={PENDING_BLUE} />
            <Text style={styles.conversionTitle}>Analyse de Conversion</Text>
          </View>
          
          <View style={styles.conversionItem}>
            <View style={styles.conversionRow}>
              <View style={styles.conversionLabelContainer}>
                <Text style={styles.conversionLabel}>Valeur moyenne par vente</Text>
                <Text style={styles.conversionSubLabel}>prix moyen</Text>
              </View>
              <Text style={styles.conversionValue}>
                {analytics.popularProducts.length > 0 ? 
                  safeToFixed(analytics.popularProducts.reduce((sum, p) => sum + p.prix, 0) / analytics.popularProducts.length, 0) : "0"} $
              </Text>
            </View>
          </View>

          <View style={styles.conversionItem}>
            <View style={styles.conversionRow}>
              <View style={styles.conversionLabelContainer}>
                <Text style={styles.conversionLabel}>Produits sans vente</Text>
                <Text style={styles.conversionSubLabel}>à améliorer</Text>
              </View>
              <Text style={styles.conversionValue}>
                {analytics.popularProducts.filter(p => p.sales === 0).length}
              </Text>
            </View>
          </View>

          <View style={styles.conversionItem}>
            <View style={styles.conversionRow}>
              <View style={styles.conversionLabelContainer}>
                <Text style={styles.conversionLabel}>Produits stars</Text>
                <Text style={styles.conversionSubLabel}>+5 ventes</Text>
              </View>
              <Text style={styles.conversionValue}>
                {analytics.popularProducts.filter(p => p.sales >= 5).length}
              </Text>
            </View>
          </View>
        </View>

        {/* Conseils d'optimisation */}
        <View style={styles.optimizationCard}>
          <View style={styles.optimizationHeader}>
            <MaterialIcons name="auto-awesome" size={18} color={CHART_ORANGE} />
            <Text style={styles.optimizationTitle}>Optimisez vos Ventes</Text>
          </View>
          
          <View style={styles.optimizationTip}>
            <View style={styles.tipIcon}>
              <MaterialIcons name="local-offer" size={16} color={VALID_GREEN} />
            </View>
            <View style={styles.tipContent}>
              <Text style={styles.tipTitle}>Promotions ciblées</Text>
              <Text style={styles.tipText}>
                Réduisez de 15% les produits avec plus de 100 vues mais peu de ventes
              </Text>
            </View>
          </View>

          <View style={styles.optimizationTip}>
            <View style={styles.tipIcon}>
              <MaterialIcons name="star" size={16} color={PREMIUM_GOLD} />
            </View>
            <View style={styles.tipContent}>
              <Text style={styles.tipTitle}>Mettez en avant</Text>
              <Text style={styles.tipText}>
                Boostez les produits avec un taux de conversion supérieur à 5%
              </Text>
            </View>
          </View>

          <View style={styles.optimizationTip}>
            <View style={styles.tipIcon}>
              <MaterialIcons name="diversity-3" size={16} color={CHART_PURPLE} />
            </View>
            <View style={styles.tipContent}>
              <Text style={styles.tipTitle}>Diversifiez l'offre</Text>
              <Text style={styles.tipText}>
                Ajoutez 3 nouveaux produits dans les catégories les plus performantes
              </Text>
            </View>
          </View>
        </View>
      </ScrollView>
    );
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'overview': return renderOverview();
      case 'engagement': return renderEngagement();
      case 'products': return renderProducts();
      case 'sales': return renderSales();
      default: return renderOverview();
    }
  };

  const renderProductModal = () => {
    if (!selectedProduct) return null;

    const product = selectedProduct;
    const engagementRate = product.views > 0 ? 
      (((product.likes + product.comments + product.shares) / product.views) * 100) : 0;
    const conversionRate = product.views > 0 ? 
      ((product.sales / product.views) * 100) : 0;

    return (
      <Modal
        animationType="slide"
        transparent={true}
        visible={showProductModal}
        onRequestClose={() => setShowProductModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle} numberOfLines={2}>{product.name}</Text>
              <TouchableOpacity 
                style={styles.modalCloseButton}
                onPress={() => setShowProductModal(false)}
              >
                <MaterialIcons name="close" size={24} color="#fff" />
              </TouchableOpacity>
            </View>
            
            <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
              {/* Informations produit */}
              <View style={styles.modalSection}>
                <View style={styles.modalSectionHeader}>
                  <MaterialIcons name="info" size={18} color={PREMIUM_GOLD} />
                  <Text style={styles.modalSectionTitle}>Informations Produit</Text>
                </View>
                <View style={styles.modalInfoGrid}>
                  <View style={styles.modalInfoItem}>
                    <Text style={styles.modalInfoLabel}>Prix</Text>
                    <Text style={styles.modalInfoValue}>{safeToFixed(product.prix, 0)} $</Text>
                  </View>
                  <View style={styles.modalInfoItem}>
                    <Text style={styles.modalInfoLabel}>Catégorie</Text>
                    <Text style={styles.modalInfoValue}>{product.category || 'Non catégorisé'}</Text>
                  </View>
                  <View style={styles.modalInfoItem}>
                    <Text style={styles.modalInfoLabel}>Statut</Text>
                    <View style={[
                      styles.statusBadge,
                      product.status === 'active' ? styles.statusActiveBadge : styles.statusInactiveBadge
                    ]}>
                      <Text style={styles.statusBadgeText}>
                        {product.status === 'active' ? 'Actif' : 'Inactif'}
                      </Text>
                    </View>
                  </View>
                </View>
              </View>

              {/* Statistiques détaillées */}
              <View style={styles.modalSection}>
                <View style={styles.modalSectionHeader}>
                  <MaterialIcons name="bar-chart" size={18} color={PENDING_BLUE} />
                  <Text style={styles.modalSectionTitle}>Statistiques ({period} jours)</Text>
                </View>
                <View style={styles.modalStatsGrid}>
                  <View style={styles.modalStatCard}>
                    <View style={[styles.modalStatIcon, { backgroundColor: `${PENDING_BLUE}20` }]}>
                      <Feather name="eye" size={16} color={PENDING_BLUE} />
                    </View>
                    <Text style={styles.modalStatValue}>{formatNumber(product.views)}</Text>
                    <Text style={styles.modalStatLabel}>Vues</Text>
                  </View>
                  <View style={styles.modalStatCard}>
                    <View style={[styles.modalStatIcon, { backgroundColor: `${VALID_GREEN}20` }]}>
                      <AntDesign name="like1" size={16} color={VALID_GREEN} />
                    </View>
                    <Text style={styles.modalStatValue}>{formatNumber(product.likes)}</Text>
                    <Text style={styles.modalStatLabel}>Likes</Text>
                  </View>
                  <View style={styles.modalStatCard}>
                    <View style={[styles.modalStatIcon, { backgroundColor: `${CHART_PURPLE}20` }]}>
                      <Feather name="message-circle" size={16} color={CHART_PURPLE} />
                    </View>
                    <Text style={styles.modalStatValue}>{formatNumber(product.comments)}</Text>
                    <Text style={styles.modalStatLabel}>Commentaires</Text>
                  </View>
                  <View style={styles.modalStatCard}>
                    <View style={[styles.modalStatIcon, { backgroundColor: `${CHART_ORANGE}20` }]}>
                      <Feather name="share-2" size={16} color={CHART_ORANGE} />
                    </View>
                    <Text style={styles.modalStatValue}>{formatNumber(product.shares)}</Text>
                    <Text style={styles.modalStatLabel}>Partages</Text>
                  </View>
                  <View style={styles.modalStatCard}>
                    <View style={[styles.modalStatIcon, { backgroundColor: `${DANGER_RED}20` }]}>
                      <Feather name="shopping-bag" size={16} color={DANGER_RED} />
                    </View>
                    <Text style={styles.modalStatValue}>{formatNumber(product.sales)}</Text>
                    <Text style={styles.modalStatLabel}>Ventes</Text>
                  </View>
                  <View style={styles.modalStatCard}>
                    <View style={[styles.modalStatIcon, { backgroundColor: `${PREMIUM_GOLD}20` }]}>
                      <MaterialIcons name="trending-up" size={16} color={PREMIUM_GOLD} />
                    </View>
                    <Text style={styles.modalStatValue}>
                      {safeToFixed(conversionRate, 2)}%
                    </Text>
                    <Text style={styles.modalStatLabel}>Conversion</Text>
                  </View>
                </View>
              </View>

              {/* Analyse et recommandations */}
              <View style={styles.modalSection}>
                <View style={styles.modalSectionHeader}>
                  <MaterialIcons name="lightbulb" size={18} color={CHART_ORANGE} />
                  <Text style={styles.modalSectionTitle}>Recommandations</Text>
                </View>
                
                {product.sales === 0 ? (
                  <View style={styles.modalRecommendation}>
                    <View style={[styles.modalRecommendationIcon, { backgroundColor: `${DANGER_RED}20` }]}>
                      <MaterialIcons name="warning" size={16} color={DANGER_RED} />
                    </View>
                    <View style={styles.modalRecommendationContent}>
                      <Text style={styles.modalRecommendationTitle}>Aucune vente enregistrée</Text>
                      <Text style={styles.modalRecommendationText}>
                        Considérez une réduction de prix ou une meilleure présentation du produit.
                      </Text>
                    </View>
                  </View>
                ) : (
                  <View style={styles.modalRecommendation}>
                    <View style={[styles.modalRecommendationIcon, { backgroundColor: `${VALID_GREEN}20` }]}>
                      <MaterialIcons name="check-circle" size={16} color={VALID_GREEN} />
                    </View>
                    <View style={styles.modalRecommendationContent}>
                      <Text style={styles.modalRecommendationTitle}>Performance satisfaisante</Text>
                      <Text style={styles.modalRecommendationText}>
                        Le produit génère un bon taux de conversion. Pensez à le mettre en avant.
                      </Text>
                    </View>
                  </View>
                )}

                {product.views > 100 && product.likes < (product.views * 0.05) && (
                  <View style={styles.modalRecommendation}>
                    <View style={[styles.modalRecommendationIcon, { backgroundColor: `${PENDING_BLUE}20` }]}>
                      <MaterialIcons name="thumb-up" size={16} color={PENDING_BLUE} />
                    </View>
                    <View style={styles.modalRecommendationContent}>
                      <Text style={styles.modalRecommendationTitle}>Engagement à améliorer</Text>
                      <Text style={styles.modalRecommendationText}>
                        Beaucoup de vues mais peu de likes. Améliorez la présentation du produit.
                      </Text>
                    </View>
                  </View>
                )}

                {product.views > 0 && engagementRate < 5 && (
                  <View style={styles.modalRecommendation}>
                    <View style={[styles.modalRecommendationIcon, { backgroundColor: `${CHART_ORANGE}20` }]}>
                      <MaterialIcons name="trending-up" size={16} color={CHART_ORANGE} />
                    </View>
                    <View style={styles.modalRecommendationContent}>
                      <Text style={styles.modalRecommendationTitle}>Taux d'engagement faible</Text>
                      <Text style={styles.modalRecommendationText}>
                        Taux d'engagement de {safeToFixed(engagementRate, 2)}%. Essayez d'interagir plus avec les clients.
                      </Text>
                    </View>
                  </View>
                )}
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar backgroundColor={SHOPNET_BLUE} barStyle="light-content" />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={PREMIUM_GOLD} />
          <Text style={styles.loadingText}>Chargement des analytics...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar backgroundColor={SHOPNET_BLUE} barStyle="light-content" />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={22} color="#fff" />
        </TouchableOpacity>
        
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Analytics Premium</Text>
          <Text style={styles.headerSubtitle}>{boutique?.nom || 'Boutique Premium'}</Text>
        </View>
        
        <TouchableOpacity style={styles.refreshButton} onPress={fetchAnalyticsData}>
          <Feather name="refresh-cw" size={18} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* Sélecteur de période */}
      <View style={styles.periodCard}>
        <View style={styles.periodHeader}>
          <MaterialIcons name="calendar-today" size={18} color={PREMIUM_GOLD} />
          <Text style={styles.periodTitle}>Période d'analyse</Text>
        </View>
        <View style={styles.periodButtons}>
          <TouchableOpacity
            style={[styles.periodButton, period === 7 && styles.periodButtonActive]}
            onPress={() => setPeriod(7)}
          >
            <Text style={[styles.periodButtonText, period === 7 && styles.periodButtonTextActive]}>
              7 jours
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.periodButton, period === 30 && styles.periodButtonActive]}
            onPress={() => setPeriod(30)}
          >
            <Text style={[styles.periodButtonText, period === 30 && styles.periodButtonTextActive]}>
              30 jours
            </Text>
          </TouchableOpacity>
        </View>
        <Text style={styles.periodNote}>
          Données mises à jour en temps réel pour les {period} derniers jours
        </Text>
      </View>

      {/* Menu horizontal */}
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false}
        style={styles.tabsContainer}
        contentContainerStyle={styles.tabsContent}
      >
        {[
          { id: 'overview', label: 'Vue générale', icon: 'dashboard' },
          { id: 'engagement', label: 'Engagement', icon: 'thumb-up' },
          { id: 'products', label: 'Produits', icon: 'inventory' },
          { id: 'sales', label: 'Ventes', icon: 'trending-up' },
        ].map((tab) => (
          <TouchableOpacity
            key={tab.id}
            style={[
              styles.tabButton,
              activeTab === tab.id && styles.tabButtonActive,
            ]}
            onPress={() => setActiveTab(tab.id as any)}
          >
            <MaterialIcons 
              name={tab.icon as any} 
              size={18} 
              color={activeTab === tab.id ? PREMIUM_GOLD : 'rgba(255,255,255,0.6)'} 
            />
            <Text style={[
              styles.tabText,
              activeTab === tab.id && styles.tabTextActive,
            ]}>
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Contenu principal */}
      <View style={styles.contentContainer}>
        <ScrollView 
          style={styles.contentScroll}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={[PREMIUM_GOLD]}
              tintColor={PREMIUM_GOLD}
            />
          }
        >
          {renderContent()}
          
          {/* Pied de page */}
          <View style={styles.footer}>
            <Text style={styles.footerText}>
              Données pour les {period} derniers jours • 
              Dernière mise à jour: {new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
            </Text>
          </View>
        </ScrollView>
      </View>

      {renderProductModal()}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: SHOPNET_BLUE,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#fff',
    marginTop: 12,
    fontSize: 14,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
    height: 64,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  headerCenter: {
    flex: 1,
  },
  headerTitle: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '700',
  },
  headerSubtitle: {
    color: PREMIUM_GOLD,
    fontSize: 12,
    marginTop: 2,
  },
  refreshButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  periodCard: {
    backgroundColor: 'rgba(30, 42, 59, 0.9)',
    padding: 16,
    margin: 16,
    borderRadius: 12,
    marginTop: 8,
  },
  periodHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  periodTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  periodButtons: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 8,
    padding: 2,
    marginBottom: 12,
  },
  periodButton: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 6,
  },
  periodButtonActive: {
    backgroundColor: 'rgba(255, 167, 38, 0.2)',
  },
  periodButtonText: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 12,
    fontWeight: '500',
  },
  periodButtonTextActive: {
    color: PREMIUM_GOLD,
    fontWeight: '600',
  },
  periodNote: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 11,
    textAlign: 'center',
  },
  tabsContainer: {
    backgroundColor: 'rgba(30, 42, 59, 0.9)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
    maxHeight: 52,
  },
  tabsContent: {
    flexDirection: 'row',
    paddingHorizontal: 12,
    paddingVertical: 8,
    alignItems: 'center',
  },
  tabButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginHorizontal: 4,
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  tabButtonActive: {
    backgroundColor: 'rgba(255, 167, 38, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(255, 167, 38, 0.3)',
  },
  tabText: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 13,
    fontWeight: '600',
    marginLeft: 6,
  },
  tabTextActive: {
    color: PREMIUM_GOLD,
  },
  contentContainer: {
    flex: 1,
  },
  contentScroll: {
    flex: 1,
  },
  tabContent: {
    padding: 16,
  },
  mainStatsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  mainStatCard: {
    flex: 1,
    backgroundColor: 'rgba(30, 42, 59, 0.9)',
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 4,
    alignItems: 'center',
    minHeight: 100,
  },
  mainStatIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  mainStatValue: {
    color: '#fff',
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 2,
  },
  mainStatLabel: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  mainStatSubLabel: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 10,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  statCard: {
    width: (SCREEN_WIDTH - 48) / 2 - 4,
    backgroundColor: 'rgba(30, 42, 59, 0.9)',
    borderRadius: 12,
    padding: 14,
    marginBottom: 8,
  },
  statRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statInfo: {
    marginLeft: 10,
    flex: 1,
  },
  statValue: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 2,
  },
  statLabel: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  statSubLabel: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 10,
  },
  chartCard: {
    backgroundColor: 'rgba(30, 42, 59, 0.9)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  chartHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  chartTitle: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 8,
  },
  summaryCard: {
    backgroundColor: 'rgba(30, 42, 59, 0.9)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  summaryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
  },
  summaryTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  summaryItem: {
    marginBottom: 12,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  summaryLabel: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 13,
    flex: 1,
  },
  summaryValue: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 10,
  },
  summarySubLabel: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 11,
    marginTop: 2,
  },
  engagementCard: {
    backgroundColor: 'rgba(30, 42, 59, 0.9)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  engagementHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  engagementTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  engagementRate: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  engagementRateValue: {
    color: PREMIUM_GOLD,
    fontSize: 32,
    fontWeight: '700',
    marginBottom: 4,
  },
  engagementRateLabel: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 12,
    textAlign: 'center',
  },
  detailCard: {
    backgroundColor: 'rgba(30, 42, 59, 0.9)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  detailTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  detailItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
  },
  detailItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  detailIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  detailLabel: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 14,
    flex: 1,
  },
  detailValueContainer: {
    alignItems: 'flex-end',
  },
  detailValue: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  detailPercentage: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 11,
  },
  recommendationsCard: {
    backgroundColor: 'rgba(30, 42, 59, 0.9)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  recommendationsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
  },
  recommendationsTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  recommendationItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
    padding: 10,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 8,
  },
  recommendationIcon: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  recommendationTextContainer: {
    flex: 1,
  },
  recommendationTitleText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 2,
  },
  recommendationText: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 12,
    lineHeight: 16,
  },
  productsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  productsTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
  },
  productsSubtitle: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 12,
    marginTop: 2,
  },
  refreshSmallButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.05)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  productsList: {
    marginBottom: 16,
  },
  productCard: {
    backgroundColor: 'rgba(30, 42, 59, 0.9)',
    borderRadius: 12,
    padding: 14,
    marginBottom: 8,
  },
  productCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  productRank: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: PREMIUM_GOLD,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  rankText: {
    color: '#00182A',
    fontSize: 12,
    fontWeight: '700',
  },
  productName: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    flex: 1,
    marginRight: 10,
  },
  productPrice: {
    backgroundColor: 'rgba(255, 167, 38, 0.1)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  priceText: {
    color: PREMIUM_GOLD,
    fontSize: 12,
    fontWeight: '600',
  },
  productMetrics: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  metricItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  metricText: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 11,
    marginLeft: 4,
  },
  productCardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  productCategory: {
    backgroundColor: 'rgba(66, 165, 245, 0.1)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  categoryText: {
    color: PENDING_BLUE,
    fontSize: 11,
  },
  productStatus: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  statusActive: {
    backgroundColor: 'rgba(77, 177, 78, 0.1)',
  },
  statusInactive: {
    backgroundColor: 'rgba(244, 67, 54, 0.1)',
  },
  statusText: {
    fontSize: 11,
    color: '#fff',
  },
  emptyProducts: {
    alignItems: 'center',
    paddingVertical: 30,
    backgroundColor: 'rgba(30, 42, 59, 0.9)',
    borderRadius: 12,
  },
  emptyProductsText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    marginTop: 12,
  },
  emptyProductsSubtext: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 12,
    marginTop: 4,
  },
  productStatsCard: {
    backgroundColor: 'rgba(30, 42, 59, 0.9)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  productStatsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  productStatsTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  productStatsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  productStatItem: {
    width: (SCREEN_WIDTH - 64) / 2,
    alignItems: 'center',
    padding: 12,
  },
  productStatValue: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 4,
  },
  productStatLabel: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 11,
    textAlign: 'center',
  },
  salesCard: {
    backgroundColor: 'rgba(30, 42, 59, 0.9)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  salesHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  salesTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  salesStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  salesStat: {
    flex: 1,
    alignItems: 'center',
    padding: 12,
  },
  salesStatValue: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 4,
  },
  salesStatLabel: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
  },
  salesStatSubLabel: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 10,
    textAlign: 'center',
  },
  conversionCard: {
    backgroundColor: 'rgba(30, 42, 59, 0.9)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  conversionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
  },
  conversionTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  conversionItem: {
    marginBottom: 12,
  },
  conversionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  conversionLabelContainer: {
    flex: 1,
  },
  conversionLabel: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: 13,
    fontWeight: '500',
  },
  conversionSubLabel: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 11,
  },
  conversionValue: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
    marginLeft: 10,
  },
  optimizationCard: {
    backgroundColor: 'rgba(30, 42, 59, 0.9)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  optimizationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
  },
  optimizationTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  optimizationTip: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 10,
    padding: 10,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 8,
  },
  tipIcon: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  tipContent: {
    flex: 1,
  },
  tipTitle: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 2,
  },
  tipText: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 12,
    lineHeight: 16,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: SHOPNET_BLUE,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '85%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
  },
  modalTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
    flex: 1,
  },
  modalCloseButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalBody: {
    padding: 16,
  },
  modalSection: {
    marginBottom: 20,
  },
  modalSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  modalSectionTitle: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
    marginLeft: 8,
  },
  modalInfoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  modalInfoItem: {
    width: (SCREEN_WIDTH - 64) / 3,
    marginBottom: 12,
  },
  modalInfoLabel: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 11,
    marginBottom: 4,
  },
  modalInfoValue: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    alignSelf: 'flex-start',
  },
  statusActiveBadge: {
    backgroundColor: 'rgba(77, 177, 78, 0.2)',
  },
  statusInactiveBadge: {
    backgroundColor: 'rgba(244, 67, 54, 0.2)',
  },
  statusBadgeText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '600',
  },
  modalStatsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  modalStatCard: {
    width: (SCREEN_WIDTH - 64) / 3,
    alignItems: 'center',
    padding: 10,
    marginBottom: 10,
  },
  modalStatIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 6,
  },
  modalStatValue: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 2,
  },
  modalStatLabel: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 10,
  },
  modalRecommendation: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
    padding: 12,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 8,
  },
  modalRecommendationIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  modalRecommendationContent: {
    flex: 1,
  },
  modalRecommendationTitle: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 4,
  },
  modalRecommendationText: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 12,
    lineHeight: 16,
  },
  footer: {
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.1)',
    marginTop: 8,
    marginBottom: 20,
  },
  footerText: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 11,
    textAlign: 'center',
  },
});

