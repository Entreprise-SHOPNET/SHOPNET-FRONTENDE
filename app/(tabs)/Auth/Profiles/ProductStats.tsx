

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
  SafeAreaView,
  Platform,
  StatusBar,
} from "react-native";
import { 
  FontAwesome, 
  MaterialIcons, 
  Ionicons, 
  Feather,
  AntDesign 
} from "@expo/vector-icons";
import axios from "axios";
import { getValidToken } from "../authService";

const { width } = Dimensions.get("window");

// Couleurs VIP
const SHOPNET_BLUE = "#00182A";
const PRO_BLUE = "#42A5F5";
const PRO_GREEN = "#4CAF50";
const PRO_ORANGE = "#FF9800";
const PRO_RED = "#F44336";
const PRO_PURPLE = "#9C27B0";
const PRO_CYAN = "#00BCD4";
const CARD_BG = "rgba(30, 42, 59, 0.9)";
const BORDER_COLOR = "rgba(66, 165, 245, 0.1)";

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

  // Calculer les vues totales selon la formule : (ventes * 2) + (likes * 3)
  const calculateTotalVues = () => {
    if (!stats) return 0;
    const ventesVues = stats.ventes.total_produits_vendus * 2;
    const likesVues = stats.interactions.likes * 3;
    return ventesVues + likesVues;
  };

  // Calculer les vues pour un produit spécifique
  const calculateProductVues = (produit: TopProduit) => {
    const ventesVues = (produit.ventes || 0) * 2;
    const likesVues = (stats?.interactions.likes || 0) * 0.1;
    return Math.round(ventesVues + likesVues);
  };

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
    if (score >= 80) return PRO_GREEN;
    if (score >= 60) return PRO_ORANGE;
    return PRO_RED;
  };

  const getPerformanceLevel = (score: number) => {
    if (score >= 80) return 'Expert';
    if (score >= 60) return 'Intermédiaire';
    return 'Débutant';
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <View style={styles.loadingContent}>
          <ActivityIndicator size="large" color={PRO_BLUE} />
          <Text style={styles.loadingText}>Chargement des statistiques...</Text>
        </View>
      </View>
    );
  }

  if (!stats) {
    return (
      <View style={styles.errorContainer}>
        <View style={styles.errorContent}>
          <MaterialIcons name="error-outline" size={64} color={PRO_RED} />
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
  const totalVuesCalcule = calculateTotalVues();

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Header VIP */}
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <View style={styles.headerTitleContainer}>
            <Text style={styles.headerTitle}>Analytics Dashboard</Text>
            <View style={styles.premiumBadge}>
              <Ionicons name="stats-chart" size={14} color={PRO_BLUE} />
              <Text style={styles.premiumText}>VIP PRO</Text>
            </View>
          </View>
          <TouchableOpacity 
            style={styles.refreshButton}
            onPress={onRefresh}
            disabled={refreshing}
          >
            {refreshing ? (
              <ActivityIndicator size="small" color={PRO_BLUE} />
            ) : (
              <Ionicons name="refresh" size={20} color={PRO_BLUE} />
            )}
          </TouchableOpacity>
        </View>
        <Text style={styles.headerSubtitle}>
          Analyse avancée de votre performance commerciale
        </Text>
      </View>

      {/* Navigation Tabs VIP */}
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
            {activeTab === tab && <View style={styles.tabIndicator} />}
          </TouchableOpacity>
        ))}
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
        {/* Performance Score VIP */}
        <Animated.View 
          style={[
            styles.performanceCard,
            { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }
          ]}
        >
          <View style={styles.performanceHeader}>
            <View>
              <Text style={styles.performanceTitle}>Score de Performance</Text>
              <Text style={styles.performanceSubtitle}>
                Basé sur vos résultats du mois
              </Text>
            </View>
            <MaterialIcons name="trending-up" size={24} color={PRO_BLUE} />
          </View>
          
          <View style={styles.performanceContent}>
            <View style={styles.scoreCircleContainer}>
              <View style={[
                styles.scoreCircle,
                { borderColor: getPerformanceColor(stats.performance?.score || 0) }
              ]}>
                <Text style={[
                  styles.scoreText,
                  { color: getPerformanceColor(stats.performance?.score || 0) }
                ]}>
                  {stats.performance?.score || 0}%
                </Text>
              </View>
              <View style={styles.scoreInfo}>
                <Text style={styles.scoreLabel}>
                  Niveau: {getPerformanceLevel(stats.performance?.score || 0)}
                </Text>
                <View style={styles.scoreProgress}>
                  <View 
                    style={[
                      styles.scoreProgressFill,
                      { width: `${stats.performance?.score || 0}%` }
                    ]}
                  />
                </View>
              </View>
            </View>
            
            <View style={styles.performanceStats}>
              {[
                { label: 'Produits', value: stats.produits.total_produits_en_vente, icon: 'inventory' },
                { label: 'Boostés', value: stats.produits.produits_boostes || 0, icon: 'rocket-launch' },
                { label: 'Engagement', value: `${stats.interactions.taux_engagement || 0}%`, icon: 'trending-up' },
                { label: 'Conversion', value: `${stats.ventes.croissance_mensuelle || 0}%`, icon: 'swap-vert' },
              ].map((stat, index) => (
                <View key={index} style={styles.performanceStatItem}>
                  <View style={styles.performanceStatIcon}>
                    <MaterialIcons name={stat.icon as any} size={16} color={PRO_BLUE} />
                  </View>
                  <Text style={styles.performanceStatValue}>{stat.value}</Text>
                  <Text style={styles.performanceStatLabel}>{stat.label}</Text>
                </View>
              ))}
            </View>
          </View>
        </Animated.View>

        {/* Stats Principales VIP - Alignement Horizontal Compact */}
        <Animated.View 
          style={[
            styles.section,
            { opacity: fadeAnim, transform: [{ translateY: slideAnim }], marginBottom: 8 }
          ]}
        >
          <View style={styles.sectionHeader}>
            <View style={styles.sectionTitleContainer}>
              <View style={styles.sectionIcon}>
                <MaterialIcons name="dashboard" size={18} color={PRO_BLUE} />
              </View>
              <Text style={styles.sectionTitle}>Statistiques Clés</Text>
            </View>
          </View>
          
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false}
            style={styles.horizontalStatsScroll}
            contentContainerStyle={styles.horizontalStatsContent}
          >
            {[
              {
                title: 'Revenu Total',
                value: `$${stats.ventes.revenu_total.toFixed(0)}`,
                icon: 'dollar',
                color: PRO_GREEN,
                trend: `+${stats.ventes.croissance_mensuelle || 0}%`,
                iconName: 'dollar-sign' as const,
                subtitle: 'Cumul'
              },
              {
                title: 'Ventes Total',
                value: formatNumber(stats.ventes.total_produits_vendus),
                icon: 'shopping-cart',
                color: PRO_RED,
                trend: 'Hot',
                iconName: 'shopping-cart' as const,
                subtitle: 'Unités'
              },
              {
                title: 'Vues Total',
                value: formatNumber(totalVuesCalcule),
                icon: 'eye',
                color: PRO_BLUE,
                trend: `+${stats.vues.croissance || 0}%`,
                iconName: 'eye' as const,
                subtitle: 'Visibilité'
              },
              {
                title: 'Ce Mois',
                value: `$${stats.ventes.revenu_mensuel.toFixed(0)}`,
                icon: 'calendar',
                color: PRO_ORANGE,
                trend: 'Boost',
                iconName: 'calendar' as const,
                subtitle: 'Revenu mensuel'
              },
            ].map((stat, index) => (
              <View 
                key={index}
                style={[
                  styles.compactStatCard,
                  { 
                    borderColor: stat.color + '40',
                    marginLeft: index === 0 ? 0 : 8
                  }
                ]}
              >
                <View style={styles.compactStatTop}>
                  <View style={[styles.compactStatIconContainer, { backgroundColor: stat.color + '20' }]}>
                    <FontAwesome name={stat.iconName} size={16} color={stat.color} />
                  </View>
                  <View style={styles.compactStatTrend}>
                    <Feather name="trending-up" size={10} color={stat.color} />
                    <Text style={[styles.compactStatTrendText, { color: stat.color }]}>
                      {stat.trend}
                    </Text>
                  </View>
                </View>
                
                <Text style={[styles.compactStatValue, { color: stat.color }]}>
                  {stat.value}
                </Text>
                
                <Text style={styles.compactStatTitle}>{stat.title}</Text>
                
                {stat.subtitle && (
                  <Text style={styles.compactStatSubtitle}>{stat.subtitle}</Text>
                )}
              </View>
            ))}
          </ScrollView>
        </Animated.View>

        {/* Top Produits Vendus VIP */}
        <Animated.View 
          style={[
            styles.section,
            { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }
          ]}
        >
          <View style={styles.sectionHeader}>
            <View style={styles.sectionTitleContainer}>
              <View style={styles.sectionIcon}>
                <Ionicons name="trophy" size={20} color={PRO_ORANGE} />
              </View>
              <Text style={styles.sectionTitle}>Top Produits Vendus</Text>
            </View>
            <TouchableOpacity style={styles.seeAllButton}>
              <Text style={styles.seeAllText}>Voir tout</Text>
              <Feather name="chevron-right" size={16} color={PRO_BLUE} />
            </TouchableOpacity>
          </View>
          
          <View style={styles.productsContainer}>
            {stats.produits.top_vendus.map((produit, index) => {
              const pourcentage = calcPercent(produit.ventes || 0, totalVentes);
              return (
                <TouchableOpacity key={produit.id} style={styles.productCard}>
                  <View style={[
                    styles.productRank,
                    index === 0 ? styles.rankFirst : 
                    index === 1 ? styles.rankSecond : 
                    index === 2 ? styles.rankThird : styles.rankOther
                  ]}>
                    <Text style={styles.rankText}>#{index + 1}</Text>
                  </View>
                  
                  <Image 
                    source={{ 
                      uri: produit.image || 'https://via.placeholder.com/80x80.png?text=Produit' 
                    }} 
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
                    
                    <View style={styles.productStats}>
                      <View style={styles.productStat}>
                        <FontAwesome name="shopping-cart" size={12} color={PRO_GREEN} />
                        <Text style={styles.productStatText}>
                          {produit.ventes || 0} ventes
                        </Text>
                      </View>
                      <View style={styles.productStat}>
                        <FontAwesome name="dollar" size={12} color={PRO_BLUE} />
                        <Text style={styles.productStatText}>
                          ${produit.price?.toFixed(2) || '0.00'}
                        </Text>
                      </View>
                    </View>
                    
                    <View style={styles.progressContainer}>
                      <View style={styles.progressHeader}>
                        <Text style={styles.progressLabel}>Performance</Text>
                        <Text style={styles.progressPercent}>{pourcentage}%</Text>
                      </View>
                      <View style={styles.progressBackground}>
                        <View 
                          style={[
                            styles.progressFill,
                            { 
                              width: `${Math.min(pourcentage, 100)}%`,
                              backgroundColor: pourcentage > 50 ? PRO_GREEN : PRO_ORANGE
                            }
                          ]}
                        />
                      </View>
                    </View>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        </Animated.View>

        {/* Top Produits Vus VIP */}
        <Animated.View 
          style={[
            styles.section,
            { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }
          ]}
        >
          <View style={styles.sectionHeader}>
            <View style={styles.sectionTitleContainer}>
              <View style={styles.sectionIcon}>
                <Feather name="eye" size={20} color={PRO_BLUE} />
              </View>
              <Text style={styles.sectionTitle}>Top Produits Vus</Text>
            </View>
            <TouchableOpacity style={styles.seeAllButton}>
              <Text style={styles.seeAllText}>Voir tout</Text>
              <Feather name="chevron-right" size={16} color={PRO_BLUE} />
            </TouchableOpacity>
          </View>
          
          <View style={styles.productsContainer}>
            {stats.produits.top_vus.map((produit, index) => {
              const productVues = calculateProductVues(produit);
              const pourcentage = calcPercent(productVues, totalVuesCalcule);
              
              return (
                <TouchableOpacity key={produit.id} style={styles.productCard}>
                  <View style={[
                    styles.productRank,
                    { backgroundColor: PRO_CYAN + '20', borderColor: PRO_CYAN }
                  ]}>
                    <Feather name="eye" size={12} color={PRO_CYAN} />
                  </View>
                  
                  <Image 
                    source={{ 
                      uri: produit.image || 'https://via.placeholder.com/80x80.png?text=Produit' 
                    }} 
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
                    
                    <View style={styles.productStats}>
                      <View style={styles.productStat}>
                        <Feather name="eye" size={12} color={PRO_CYAN} />
                        <Text style={styles.productStatText}>
                          {formatNumber(productVues)} vues
                        </Text>
                      </View>
                      <View style={styles.productStat}>
                        <MaterialIcons name="trending-up" size={12} color={PRO_PURPLE} />
                        <Text style={styles.productStatText}>
                          {pourcentage}% du total
                        </Text>
                      </View>
                    </View>
                    
                    <View style={styles.progressContainer}>
                      <View style={styles.progressHeader}>
                        <Text style={styles.progressLabel}>Engagement visuel</Text>
                        <Text style={styles.progressPercent}>{pourcentage}%</Text>
                      </View>
                      <View style={styles.progressBackground}>
                        <View 
                          style={[
                            styles.progressFill,
                            { 
                              width: `${Math.min(pourcentage, 100)}%`,
                              backgroundColor: PRO_CYAN
                            }
                          ]}
                        />
                      </View>
                    </View>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        </Animated.View>

        {/* Interactions VIP */}
        <Animated.View 
          style={[
            styles.section,
            { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }
          ]}
        >
          <View style={styles.sectionHeader}>
            <View style={styles.sectionTitleContainer}>
              <View style={styles.sectionIcon}>
                <AntDesign name="star" size={20} color={PRO_PURPLE} />
              </View>
              <Text style={styles.sectionTitle}>Interactions Sociales</Text>
            </View>
          </View>
          
          <View style={styles.interactionsGrid}>
            {[
              {
                label: 'Likes',
                value: formatNumber(stats.interactions.likes),
                icon: 'heart',
                color: PRO_RED,
                description: '×3 = vues',
              },
              {
                label: 'Partages',
                value: formatNumber(stats.interactions.partages),
                icon: 'share',
                color: PRO_BLUE,
                description: 'Viralité',
              },
              {
                label: 'Commentaires',
                value: formatNumber(stats.interactions.commentaires),
                icon: 'message-square',
                color: PRO_GREEN,
                description: 'Engagement',
              },
              {
                label: 'Taux Engagement',
                value: `${stats.interactions.taux_engagement || 0}%`,
                icon: 'activity',
                color: PRO_ORANGE,
                description: 'Performance',
              },
            ].map((interaction, index) => (
              <View key={index} style={styles.interactionCard}>
                <View style={[styles.interactionIcon, { backgroundColor: interaction.color + '20' }]}>
                  <Feather name={interaction.icon as any} size={20} color={interaction.color} />
                </View>
                <Text style={styles.interactionValue}>{interaction.value}</Text>
                <Text style={styles.interactionLabel}>{interaction.label}</Text>
                <Text style={styles.interactionDescription}>{interaction.description}</Text>
              </View>
            ))}
          </View>
        </Animated.View>

        {/* Calcul des vues explication */}
        <View style={styles.calculationCard}>
          <View style={styles.calculationHeader}>
            <MaterialIcons name="calculate" size={20} color={PRO_BLUE} />
            <Text style={styles.calculationTitle}>Calcul des Vues</Text>
          </View>
          <View style={styles.calculationContent}>
            <View style={styles.calculationRow}>
              <Text style={styles.calculationLabel}>Ventes totales</Text>
              <Text style={styles.calculationValue}>{stats.ventes.total_produits_vendus}</Text>
              <Text style={styles.calculationSymbol}>× 2 =</Text>
              <Text style={styles.calculationResult}>
                {stats.ventes.total_produits_vendus * 2} vues
              </Text>
            </View>
            <View style={styles.calculationRow}>
              <Text style={styles.calculationLabel}>Likes</Text>
              <Text style={styles.calculationValue}>{stats.interactions.likes}</Text>
              <Text style={styles.calculationSymbol}>× 3 =</Text>
              <Text style={styles.calculationResult}>
                {stats.interactions.likes * 3} vues
              </Text>
            </View>
            <View style={styles.calculationTotal}>
              <Text style={styles.calculationTotalLabel}>VUES TOTALES</Text>
              <Text style={styles.calculationTotalValue}>{formatNumber(totalVuesCalcule)}</Text>
            </View>
          </View>
        </View>

        <View style={styles.footerSpacer} />
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: SHOPNET_BLUE,
    paddingTop: Platform.OS === "android" ? StatusBar.currentHeight : 0,
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: SHOPNET_BLUE,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingContent: {
    alignItems: "center",
  },
  loadingText: {
    color: PRO_BLUE,
    fontSize: 16,
    marginTop: 20,
    fontWeight: "600",
  },
  errorContainer: {
    flex: 1,
    backgroundColor: SHOPNET_BLUE,
    justifyContent: "center",
    alignItems: "center",
  },
  errorContent: {
    alignItems: "center",
    padding: 20,
  },
  errorTitle: {
    color: "#fff",
    fontSize: 24,
    fontWeight: "700",
    marginTop: 20,
    marginBottom: 10,
  },
  errorSubtitle: {
    color: "rgba(255, 255, 255, 0.7)",
    fontSize: 16,
    textAlign: "center",
    marginBottom: 30,
  },
  retryButton: {
    backgroundColor: PRO_BLUE,
    paddingHorizontal: 30,
    paddingVertical: 12,
    borderRadius: 25,
  },
  retryText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 15,
    backgroundColor: SHOPNET_BLUE,
    borderBottomWidth: 1,
    borderBottomColor: BORDER_COLOR,
  },
  headerTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  headerTitleContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: "700",
    color: "#fff",
    marginRight: 10,
  },
  premiumBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(66, 165, 245, 0.15)",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: PRO_BLUE,
  },
  premiumText: {
    color: PRO_BLUE,
    fontSize: 12,
    fontWeight: "700",
    marginLeft: 4,
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
  headerSubtitle: {
    fontSize: 14,
    color: "rgba(255, 255, 255, 0.7)",
    fontWeight: "500",
  },
  tabContainer: {
    flexDirection: "row",
    paddingHorizontal: 20,
    backgroundColor: SHOPNET_BLUE,
    borderBottomWidth: 1,
    borderBottomColor: BORDER_COLOR,
  },
  tab: {
    flex: 1,
    paddingVertical: 15,
    alignItems: "center",
    position: "relative",
  },
  tabActive: {},
  tabText: {
    color: "rgba(255, 255, 255, 0.6)",
    fontSize: 14,
    fontWeight: "600",
  },
  tabTextActive: {
    color: PRO_BLUE,
  },
  tabIndicator: {
    position: "absolute",
    bottom: 0,
    left: "25%",
    right: "25%",
    height: 3,
    backgroundColor: PRO_BLUE,
    borderTopLeftRadius: 2,
    borderTopRightRadius: 2,
  },
  scrollView: {
    flex: 1,
  },
  performanceCard: {
    margin: 16,
    backgroundColor: CARD_BG,
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: BORDER_COLOR,
  },
  performanceHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 20,
  },
  performanceTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#fff",
    marginBottom: 4,
  },
  performanceSubtitle: {
    fontSize: 12,
    color: "rgba(255, 255, 255, 0.6)",
  },
  performanceContent: {
    flexDirection: "row",
    alignItems: "center",
  },
  scoreCircleContainer: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  scoreCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 4,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 16,
  },
  scoreText: {
    fontSize: 22,
    fontWeight: "800",
  },
  scoreInfo: {
    flex: 1,
  },
  scoreLabel: {
    fontSize: 14,
    color: "rgba(255, 255, 255, 0.8)",
    marginBottom: 8,
    fontWeight: "600",
  },
  scoreProgress: {
    height: 6,
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    borderRadius: 3,
    overflow: "hidden",
  },
  scoreProgressFill: {
    height: "100%",
    backgroundColor: PRO_BLUE,
    borderRadius: 3,
  },
  performanceStats: {
    flexDirection: "row",
    flexWrap: "wrap",
    flex: 1,
    marginLeft: 10,
  },
  performanceStatItem: {
    width: "48%",
    marginBottom: 12,
  },
  performanceStatIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 6,
  },
  performanceStatValue: {
    fontSize: 16,
    fontWeight: "700",
    color: "#fff",
    marginBottom: 2,
  },
  performanceStatLabel: {
    fontSize: 11,
    color: "rgba(255, 255, 255, 0.6)",
  },
  section: {
    marginHorizontal: 16,
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  sectionTitleContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  sectionIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 10,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#fff",
  },
  seeAllButton: {
    flexDirection: "row",
    alignItems: "center",
  },
  seeAllText: {
    color: PRO_BLUE,
    fontSize: 14,
    fontWeight: "600",
    marginRight: 4,
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
  },
  compactStatTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 12,
  },
  compactStatIconContainer: {
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
    marginBottom: 2,
  },
  compactStatSubtitle: {
    fontSize: 10,
    color: "rgba(255, 255, 255, 0.6)",
  },
  productsContainer: {
    backgroundColor: CARD_BG,
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    borderColor: BORDER_COLOR,
  },
  productCard: {
    flexDirection: "row",
    backgroundColor: "rgba(255, 255, 255, 0.03)",
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
    alignItems: "center",
  },
  productRank: {
    width: 32,
    height: 32,
    borderRadius: 16,
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
    color: "#fff",
    fontSize: 12,
    fontWeight: "800",
  },
  productImage: {
    width: 60,
    height: 60,
    borderRadius: 10,
    marginRight: 12,
  },
  productInfo: {
    flex: 1,
  },
  productHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 6,
  },
  productTitle: {
    flex: 1,
    fontSize: 14,
    fontWeight: "600",
    color: "#fff",
    marginRight: 8,
  },
  boostBadge: {
    backgroundColor: PRO_ORANGE,
    width: 18,
    height: 18,
    borderRadius: 9,
    justifyContent: "center",
    alignItems: "center",
  },
  productStats: {
    flexDirection: "row",
    marginBottom: 8,
  },
  productStat: {
    flexDirection: "row",
    alignItems: "center",
    marginRight: 16,
  },
  productStatText: {
    fontSize: 11,
    color: "rgba(255, 255, 255, 0.7)",
    marginLeft: 4,
  },
  progressContainer: {
    marginTop: 4,
  },
  progressHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },
  progressLabel: {
    fontSize: 10,
    color: "rgba(255, 255, 255, 0.6)",
  },
  progressPercent: {
    fontSize: 10,
    color: PRO_BLUE,
    fontWeight: "600",
  },
  progressBackground: {
    height: 4,
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    borderRadius: 2,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    borderRadius: 2,
  },
  interactionsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },
  interactionCard: {
    width: (width - 40) / 2,
    backgroundColor: CARD_BG,
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
    alignItems: "center",
    borderWidth: 1,
    borderColor: BORDER_COLOR,
  },
  interactionIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 12,
  },
  interactionValue: {
    fontSize: 18,
    fontWeight: "800",
    color: "#fff",
    marginBottom: 4,
  },
  interactionLabel: {
    fontSize: 12,
    color: "rgba(255, 255, 255, 0.9)",
    fontWeight: "600",
    marginBottom: 2,
  },
  interactionDescription: {
    fontSize: 10,
    color: "rgba(255, 255, 255, 0.6)",
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
    color: "#fff",
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
  footerSpacer: {
    height: 30,
  },
});

export default ProfileStats;