



import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Image,
  ActivityIndicator,
  Dimensions,
  TouchableOpacity,
  Animated,
  RefreshControl,
} from "react-native";
import { FontAwesome, MaterialIcons, Ionicons, Feather } from "@expo/vector-icons";
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
  boost?: boolean;
}

interface Statistiques {
  ventes: {
    total_produits_vendus: number;
    revenu_total: number;
    revenu_mensuel: number;
    croissance_mensuelle: number;
  };
  produits: {
    total_produits_en_vente: number;
    top_vendus: TopProduit[];
    top_vus: TopProduit[];
    produits_boostes: number;
  };
  vues: {
    total: number;
    croissance: number;
  };
  interactions: {
    likes: number;
    partages: number;
    commentaires: number;
    taux_engagement: number;
  };
  performance: {
    score: number;
    niveau: string;
  };
}

const ProfileStats = () => {
  const [stats, setStats] = useState<Statistiques | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState("overview");
  
  const fadeAnim = React.useRef(new Animated.Value(0)).current;
  const slideAnim = React.useRef(new Animated.Value(50)).current;

  React.useEffect(() => {
    if (stats) {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 600,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [stats]);

  const fetchStats = async () => {
    try {
      const token = await getValidToken();
      if (!token) {
        setLoading(false);
        return;
      }

      const { data } = await axios.get(
        "https://shopnet-backend.onrender.com/api/profile/statistiques",
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (data.success) {
        setStats(data.statistiques);
      }
    } catch (error) {
      console.error("Erreur lors du chargement des stats:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  const onRefresh = React.useCallback(() => {
    setRefreshing(true);
    fetchStats();
  }, []);

  const calcPercent = (value: number, total: number) =>
    total ? Math.round((value / total) * 100) : 0;

  const formatNumber = (num: number) => {
    if (num >= 1000000) {
      return (num / 1000000).toFixed(1) + 'M';
    }
    if (num >= 1000) {
      return (num / 1000).toFixed(1) + 'K';
    }
    return num.toString();
  };

  const getPerformanceColor = (score: number) => {
    if (score >= 80) return '#00C851';
    if (score >= 60) return '#FFC107';
    return '#FF4444';
  };

  const getPerformanceLevel = (score: number) => {
    if (score >= 80) return 'Expert';
    if (score >= 60) return 'Intermédiaire';
    return 'Débutant';
  };

  if (loading) {
    return (
      <View style={styles.loaderContainer}>
        <View style={styles.loaderContent}>
          <ActivityIndicator size="large" color="#00C851" />
          <Text style={styles.loaderText}>Chargement des statistiques...</Text>
        </View>
      </View>
    );
  }

  if (!stats) {
    return (
      <View style={styles.errorContainer}>
        <View style={styles.errorContent}>
          <MaterialIcons name="error-outline" size={64} color="#FF4444" />
          <Text style={styles.errorTitle}>Données indisponibles</Text>
          <Text style={styles.errorSubtitle}>
            Impossible de charger vos statistiques
          </Text>
          <TouchableOpacity style={styles.retryButton} onPress={fetchStats}>
            <Text style={styles.retryText}>Réessayer</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const totalVentes = stats.ventes.total_produits_vendus || 1;

  return (
    <View style={styles.container}>
      {/* Header Moderne */}
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <View style={styles.headerTop}>
            <Text style={styles.headerTitle}>Dashboard Analytics</Text>
            <View style={styles.premiumBadge}>
              <Ionicons name="stats-chart" size={16} color="#00C851" />
              <Text style={styles.premiumText}>PRO</Text>
            </View>
          </View>
          <Text style={styles.headerSubtitle}>
            Analyse détaillée de votre performance commerciale
          </Text>
        </View>
      </View>

      {/* Navigation Tabs */}
      <View style={styles.tabContainer}>
        {['overview', 'products', 'analytics'].map((tab) => (
          <TouchableOpacity
            key={tab}
            style={[
              styles.tab,
              activeTab === tab && styles.tabActive
            ]}
            onPress={() => setActiveTab(tab)}
          >
            <Text style={[
              styles.tabText,
              activeTab === tab && styles.tabTextActive
            ]}>
              {tab === 'overview' ? 'Aperçu' : 
               tab === 'products' ? 'Produits' : 'Analytique'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView 
        style={styles.scrollView}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#00C851"
            colors={['#00C851']}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Performance Score */}
        <Animated.View 
          style={[
            styles.performanceCard,
            { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }
          ]}
        >
          <View style={styles.performanceHeader}>
            <Text style={styles.performanceTitle}>Score de Performance</Text>
            <MaterialIcons name="trending-up" size={24} color="#00C851" />
          </View>
          <View style={styles.performanceContent}>
            <View style={styles.scoreCircle}>
              <View style={[
                styles.scoreCircleInner,
                { borderColor: getPerformanceColor(stats.performance?.score || 0) }
              ]}>
                <Text style={[
                  styles.scoreText,
                  { color: getPerformanceColor(stats.performance?.score || 0) }
                ]}>
                  {stats.performance?.score || 0}%
                </Text>
              </View>
              <Text style={styles.scoreLabel}>
                {getPerformanceLevel(stats.performance?.score || 0)}
              </Text>
            </View>
            <View style={styles.performanceStats}>
              <View style={styles.performanceStat}>
                <Text style={styles.performanceStatValue}>
                  {stats.produits.total_produits_en_vente}
                </Text>
                <Text style={styles.performanceStatLabel}>Produits</Text>
              </View>
              <View style={styles.performanceStat}>
                <Text style={styles.performanceStatValue}>
                  {stats.produits.produits_boostes || 0}
                </Text>
                <Text style={styles.performanceStatLabel}>Boostés</Text>
              </View>
              <View style={styles.performanceStat}>
                <Text style={styles.performanceStatValue}>
                  {stats.interactions.taux_engagement || 0}%
                </Text>
                <Text style={styles.performanceStatLabel}>Engagement</Text>
              </View>
            </View>
          </View>
        </Animated.View>

        {/* Stats Principales */}
        <Animated.View 
          style={[
            styles.statsGrid,
            { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }
          ]}
        >
          <View style={[styles.statCard, styles.statCardPrimary]}>
            <View style={styles.statIconContainer}>
              <FontAwesome name="dollar" size={24} color="#fff" />
            </View>
            <Text style={styles.statValue}>${stats.ventes.revenu_total.toFixed(0)}</Text>
            <Text style={styles.statLabel}>Revenu Total</Text>
            <View style={styles.statTrend}>
              <Feather name="trending-up" size={16} color="#fff" />
              <Text style={styles.statTrendText}>
                +{stats.ventes.croissance_mensuelle || 0}%
              </Text>
            </View>
          </View>

          <View style={[styles.statCard, styles.statCardDanger]}>
            <View style={styles.statIconContainer}>
              <FontAwesome name="shopping-cart" size={24} color="#fff" />
            </View>
            <Text style={styles.statValue}>{formatNumber(stats.ventes.total_produits_vendus)}</Text>
            <Text style={styles.statLabel}>Ventes Total</Text>
            <View style={styles.statTrend}>
              <MaterialIcons name="local-fire-department" size={16} color="#fff" />
              <Text style={styles.statTrendText}>Hot</Text>
            </View>
          </View>

          <View style={[styles.statCard, styles.statCardInfo]}>
            <View style={styles.statIconContainer}>
              <FontAwesome name="eye" size={24} color="#fff" />
            </View>
            <Text style={styles.statValue}>{formatNumber(stats.vues.total)}</Text>
            <Text style={styles.statLabel}>Vues Total</Text>
            <View style={styles.statTrend}>
              <Feather name="trending-up" size={16} color="#fff" />
              <Text style={styles.statTrendText}>
                +{stats.vues.croissance || 0}%
              </Text>
            </View>
          </View>

          <View style={[styles.statCard, styles.statCardWarning]}>
            <View style={styles.statIconContainer}>
              <FontAwesome name="calendar" size={24} color="#fff" />
            </View>
            <Text style={styles.statValue}>${stats.ventes.revenu_mensuel.toFixed(0)}</Text>
            <Text style={styles.statLabel}>Ce Mois</Text>
            <View style={styles.statTrend}>
              <MaterialIcons name="rocket" size={16} color="#fff" />
              <Text style={styles.statTrendText}>Boost</Text>
            </View>
          </View>
        </Animated.View>

        {/* Top Produits Vendus */}
        <Animated.View 
          style={[
            styles.section,
            { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }
          ]}
        >
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>🏆 Top Produits Vendus</Text>
            <TouchableOpacity>
              <Text style={styles.seeAllText}>Voir tout</Text>
            </TouchableOpacity>
          </View>
          
          {stats.produits.top_vendus.map((produit, index) => {
            const pourcentage = calcPercent(produit.ventes || 0, totalVentes);
            return (
              <View key={produit.id} style={styles.productCard}>
                <View style={styles.productRank}>
                  <Text style={styles.rankText}>#{index + 1}</Text>
                </View>
                <Image 
                  source={{ uri: produit.image || 'https://via.placeholder.com/60x60.png?text=Produit' }} 
                  style={styles.productImage}
                />
                <View style={styles.productInfo}>
                  <View style={styles.productHeader}>
                    <Text style={styles.productTitle} numberOfLines={1}>
                      {produit.title}
                    </Text>
                    {produit.boost && (
                      <View style={styles.boostBadge}>
                        <Ionicons name="rocket" size={12} color="#fff" />
                      </View>
                    )}
                  </View>
                  <Text style={styles.productSales}>
                    {produit.ventes || 0} ventes • {pourcentage}% du total
                  </Text>
                  <View style={styles.progressContainer}>
                    <View style={styles.progressBackground}>
                      <View 
                        style={[
                          styles.progressFill,
                          { 
                            width: `${pourcentage}%`,
                            backgroundColor: pourcentage > 50 ? '#00C851' : '#FF6B6B'
                          }
                        ]}
                      />
                    </View>
                  </View>
                  <Text style={styles.productPrice}>
                    ${produit.price?.toFixed(2) || '0.00'}
                  </Text>
                </View>
              </View>
            );
          })}
        </Animated.View>

        {/* Top Produits Vus */}
        <Animated.View 
          style={[
            styles.section,
            { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }
          ]}
        >
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>👁️ Top Produits Vus</Text>
            <TouchableOpacity>
              <Text style={styles.seeAllText}>Voir tout</Text>
            </TouchableOpacity>
          </View>
          
          {stats.produits.top_vus.map((produit, index) => {
            const pourcentage = calcPercent(produit.vues || 0, stats.vues.total);
            return (
              <View key={produit.id} style={styles.productCard}>
                <View style={styles.productRank}>
                  <Text style={styles.rankText}>#{index + 1}</Text>
                </View>
                <Image 
                  source={{ uri: produit.image || 'https://via.placeholder.com/60x60.png?text=Produit' }} 
                  style={styles.productImage}
                />
                <View style={styles.productInfo}>
                  <View style={styles.productHeader}>
                    <Text style={styles.productTitle} numberOfLines={1}>
                      {produit.title}
                    </Text>
                    {produit.boost && (
                      <View style={styles.boostBadge}>
                        <Ionicons name="rocket" size={12} color="#fff" />
                      </View>
                    )}
                  </View>
                  <Text style={styles.productViews}>
                    {formatNumber(produit.vues || 0)} vues • {pourcentage}% du total
                  </Text>
                  <View style={styles.progressContainer}>
                    <View style={styles.progressBackground}>
                      <View 
                        style={[
                          styles.progressFill,
                          { 
                            width: `${pourcentage}%`,
                            backgroundColor: pourcentage > 50 ? '#4FC3F7' : '#FFA726'
                          }
                        ]}
                      />
                    </View>
                  </View>
                </View>
              </View>
            );
          })}
        </Animated.View>

        {/* Interactions */}
        <Animated.View 
          style={[
            styles.section,
            { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }
          ]}
        >
          <Text style={styles.sectionTitle}>💫 Interactions</Text>
          <View style={styles.interactionsGrid}>
            <View style={styles.interactionCard}>
              <View style={[styles.interactionIcon, { backgroundColor: '#FF6B6B' }]}>
                <FontAwesome name="heart" size={20} color="#fff" />
              </View>
              <Text style={styles.interactionValue}>{formatNumber(stats.interactions.likes)}</Text>
              <Text style={styles.interactionLabel}>Likes</Text>
            </View>

            <View style={styles.interactionCard}>
              <View style={[styles.interactionIcon, { backgroundColor: '#4FC3F7' }]}>
                <FontAwesome name="share" size={20} color="#fff" />
              </View>
              <Text style={styles.interactionValue}>{formatNumber(stats.interactions.partages)}</Text>
              <Text style={styles.interactionLabel}>Partages</Text>
            </View>

            <View style={styles.interactionCard}>
              <View style={[styles.interactionIcon, { backgroundColor: '#00C851' }]}>
                <FontAwesome name="comment" size={20} color="#fff" />
              </View>
              <Text style={styles.interactionValue}>{formatNumber(stats.interactions.commentaires)}</Text>
              <Text style={styles.interactionLabel}>Commentaires</Text>
            </View>

            <View style={styles.interactionCard}>
              <View style={[styles.interactionIcon, { backgroundColor: '#FFA726' }]}>
                <MaterialIcons name="trending-up" size={20} color="#fff" />
              </View>
              <Text style={styles.interactionValue}>{stats.interactions.taux_engagement || 0}%</Text>
              <Text style={styles.interactionLabel}>Engagement</Text>
            </View>
          </View>
        </Animated.View>

        <View style={styles.footerSpacer} />
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0A1429',
  },
  header: {
    paddingTop: 60,
    paddingBottom: 20,
    paddingHorizontal: 20,
    backgroundColor: '#1A2332',
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  headerContent: {
    alignItems: 'center',
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: '#fff',
    marginRight: 12,
  },
  premiumBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 200, 81, 0.2)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#00C851',
  },
  premiumText: {
    color: '#00C851',
    fontSize: 12,
    fontWeight: '700',
    marginLeft: 4,
  },
  headerSubtitle: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.8)',
    textAlign: 'center',
  },
  tabContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    marginTop: 20,
    marginBottom: 10,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabActive: {
    borderBottomColor: '#00C851',
  },
  tabText: {
    color: 'rgba(255, 255, 255, 0.6)',
    fontSize: 14,
    fontWeight: '600',
  },
  tabTextActive: {
    color: '#00C851',
  },
  scrollView: {
    flex: 1,
  },
  performanceCard: {
    margin: 20,
    backgroundColor: '#1A2332',
    borderRadius: 20,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
  },
  performanceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  performanceTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
  },
  performanceContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  scoreCircle: {
    alignItems: 'center',
  },
  scoreCircleInner: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 4,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  scoreText: {
    fontSize: 24,
    fontWeight: '800',
  },
  scoreLabel: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
    fontWeight: '600',
  },
  performanceStats: {
    flex: 1,
    marginLeft: 20,
  },
  performanceStat: {
    marginBottom: 15,
  },
  performanceStatValue: {
    fontSize: 20,
    fontWeight: '800',
    color: '#fff',
    marginBottom: 2,
  },
  performanceStatLabel: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.7)',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 15,
    marginBottom: 10,
  },
  statCard: {
    width: (width - 40) / 2,
    margin: 5,
    padding: 20,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  statCardPrimary: {
    backgroundColor: '#00C851',
  },
  statCardDanger: {
    backgroundColor: '#FF6B6B',
  },
  statCardInfo: {
    backgroundColor: '#4FC3F7',
  },
  statCardWarning: {
    backgroundColor: '#FFA726',
  },
  statIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  statValue: {
    fontSize: 24,
    fontWeight: '800',
    color: '#fff',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.9)',
    fontWeight: '600',
  },
  statTrend: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  statTrendText: {
    fontSize: 12,
    color: '#fff',
    fontWeight: '600',
    marginLeft: 4,
  },
  section: {
    marginHorizontal: 20,
    marginBottom: 25,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#fff',
  },
  seeAllText: {
    color: '#00C851',
    fontSize: 14,
    fontWeight: '600',
  },
  productCard: {
    flexDirection: 'row',
    backgroundColor: '#1A2332',
    borderRadius: 16,
    padding: 15,
    marginBottom: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  productRank: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#00C851',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  rankText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '800',
  },
  productImage: {
    width: 50,
    height: 50,
    borderRadius: 12,
    marginRight: 12,
  },
  productInfo: {
    flex: 1,
  },
  productHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  productTitle: {
    flex: 1,
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
    marginRight: 8,
  },
  boostBadge: {
    backgroundColor: '#FF6B6B',
    width: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  productSales: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.7)',
    marginBottom: 8,
  },
  productViews: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.7)',
    marginBottom: 8,
  },
  productPrice: {
    fontSize: 14,
    fontWeight: '700',
    color: '#00C851',
    marginTop: 4,
  },
  progressContainer: {
    marginTop: 4,
  },
  progressBackground: {
    height: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
  },
  interactionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  interactionCard: {
    width: (width - 60) / 2,
    backgroundColor: '#1A2332',
    borderRadius: 16,
    padding: 20,
    marginBottom: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  interactionIcon: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  interactionValue: {
    fontSize: 20,
    fontWeight: '800',
    color: '#fff',
    marginBottom: 4,
  },
  interactionLabel: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.7)',
    fontWeight: '600',
  },
  footerSpacer: {
    height: 30,
  },
  loaderContainer: {
    flex: 1,
    backgroundColor: '#0A1429',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loaderContent: {
    alignItems: 'center',
  },
  loaderText: {
    color: '#fff',
    fontSize: 16,
    marginTop: 20,
    fontWeight: '600',
  },
  errorContainer: {
    flex: 1,
    backgroundColor: '#0A1429',
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorContent: {
    alignItems: 'center',
    padding: 20,
  },
  errorTitle: {
    color: '#fff',
    fontSize: 24,
    fontWeight: '700',
    marginTop: 20,
    marginBottom: 10,
  },
  errorSubtitle: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 30,
  },
  retryButton: {
    backgroundColor: '#00C851',
    paddingHorizontal: 30,
    paddingVertical: 12,
    borderRadius: 25,
  },
  retryText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default ProfileStats;