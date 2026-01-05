


import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Platform,
  StatusBar,
  SafeAreaView,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
  Dimensions,
  Modal,
} from "react-native";
import { useRouter } from "expo-router";
import { 
  Ionicons, 
  MaterialIcons, 
  Feather, 
  AntDesign,
  FontAwesome5 
} from "@expo/vector-icons";
import { getValidToken } from "../authService";

const { width } = Dimensions.get("window");
const SHOPNET_BLUE = "#00182A";
const PRO_BLUE = "#42A5F5";
const PRO_GREEN = "#4CAF50";
const PRO_ORANGE = "#FF9800";
const PRO_RED = "#F44336";
const PRO_PURPLE = "#9C27B0";
const CARD_BG = "rgba(30, 42, 59, 0.9)";
const BORDER_COLOR = "rgba(66, 165, 245, 0.1)";


// Base URL pour les requêtes backend
const BASE_URL = "https://shopnet-backend.onrender.com"; // ✅ Serveur Render (production)
// const BASE_URL = "http://100.64.134.89:5000"; // 🟢 Serveur local (dev/test)


// Types
type BoostStatus = 'pending' | 'active' | 'failed' | 'completed';
type Boost = {
  id: string;
  boost_id: string;
  product_id: string;
  product_title: string;
  product_image: string;
  product_price: number;
  amount: number;
  currency: string;
  status: BoostStatus;
  views: number;
  start_date: string;
  end_date: string;
  duration_hours: number;
  payment_url?: string;
  original_amount: number;
  country?: string;
  city?: string;
  address?: string;
  transaction_id?: string;
  created_at: string;
  updated_at: string;
};

type Stats = {
  total: number;
  active: number;
  pending: number;
  failed: number;
  completed: number;
  totalInvestment: number;
  totalViews: number;
  performanceRate: number;
  totalRevenue: number;
};

export default function MyBoostsScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [boosts, setBoosts] = useState<Boost[]>([]);
  const [stats, setStats] = useState<Stats>({
    total: 0,
    active: 0,
    pending: 0,
    failed: 0,
    completed: 0,
    totalInvestment: 0,
    totalViews: 0,
    performanceRate: 0,
    totalRevenue: 0,
  });
  const [selectedBoost, setSelectedBoost] = useState<Boost | null>(null);
  const [detailModalVisible, setDetailModalVisible] = useState(false);
  const [filter, setFilter] = useState<'all' | BoostStatus>('all');
  const [searchQuery, setSearchQuery] = useState("");
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('table');

  // Récupérer les données
  const fetchBoostsData = useCallback(async () => {
    try {
      const token = await getValidToken();
      if (!token) {
        Alert.alert("Erreur", "Vous devez être connecté");
        router.push("/Auth/auth");
        return;
      }

      const response = await fetch(`${BASE_URL}/api/manual-payment/user-boosts`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Erreur ${response.status}`);
      }

      const data = await response.json();
      
      if (data.success) {
        const apiBoosts: Boost[] = (data.boosts || []).map((boost: any) => ({
          id: String(boost.id || boost.boost_id),
          boost_id: boost.boost_id || `boost_${boost.id}`,
          product_id: String(boost.product_id),
          product_title: boost.product_title || 'Produit sans titre',
          product_image: boost.product_image || 'https://via.placeholder.com/150',
          product_price: parseFloat(boost.product_price) || 0,
          amount: parseFloat(boost.amount) || 0,
          currency: boost.currency || 'CDF',
          status: (boost.status || 'pending') as BoostStatus,
          views: parseInt(boost.views) || 0,
          start_date: boost.start_date || new Date().toISOString(),
          end_date: boost.end_date || new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
          duration_hours: parseInt(boost.duration_hours) || 24,
          payment_url: boost.payment_url,
          original_amount: parseFloat(boost.original_amount) || parseFloat(boost.amount) || 0,
          country: boost.country,
          city: boost.city,
          address: boost.address,
          transaction_id: boost.transaction_id,
          created_at: boost.created_at || new Date().toISOString(),
          updated_at: boost.updated_at || new Date().toISOString(),
        }));

        setBoosts(apiBoosts);
        calculateStats(apiBoosts);
      } else {
        Alert.alert("Erreur", data.message || "Impossible de récupérer les données");
      }
    } catch (error: any) {
      console.error("Erreur:", error);
      Alert.alert("Erreur", error.message || "Problème de connexion");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchBoostsData();
  }, []);

  // Calculer les statistiques
  const calculateStats = (boostsList: Boost[]) => {
    const newStats: Stats = {
      total: boostsList.length,
      active: boostsList.filter(b => b.status === 'active').length,
      pending: boostsList.filter(b => b.status === 'pending').length,
      failed: boostsList.filter(b => b.status === 'failed').length,
      completed: boostsList.filter(b => b.status === 'completed').length,
      totalInvestment: boostsList.reduce((sum, b) => sum + b.amount, 0),
      totalViews: boostsList.reduce((sum, b) => sum + b.views, 0),
      performanceRate: 0,
      totalRevenue: 0,
    };

    // Calculer taux de performance
    if (newStats.total > 0) {
      const successfulBoosts = newStats.active + newStats.completed;
      newStats.performanceRate = Math.round((successfulBoosts / newStats.total) * 100);
    }

    // Calculer revenus estimés
    newStats.totalRevenue = boostsList.reduce((sum, b) => {
      if (['active', 'completed'].includes(b.status)) {
        return sum + (b.views * b.product_price * 0.005);
      }
      return sum;
    }, 0);

    setStats(newStats);
  };

  // Formater la date
  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString("fr-FR", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      });
    } catch {
      return "N/A";
    }
  };

  // Formater la durée
  const formatDuration = (hours: number) => {
    if (hours >= 24) {
      const days = Math.floor(hours / 24);
      return `${days}j`;
    }
    return `${hours}h`;
  };

  // Obtenir les infos du statut
  const getStatusInfo = (status: BoostStatus) => {
    switch(status) {
      case 'active':
        return { label: 'ACTIF', color: PRO_GREEN, bgColor: 'rgba(76, 175, 80, 0.15)' };
      case 'pending':
        return { label: 'EN ATTENTE', color: PRO_ORANGE, bgColor: 'rgba(255, 152, 0, 0.15)' };
      case 'failed':
        return { label: 'REJETÉ', color: PRO_RED, bgColor: 'rgba(244, 67, 54, 0.15)' };
      case 'completed':
        return { label: 'TERMINÉ', color: PRO_BLUE, bgColor: 'rgba(66, 165, 245, 0.15)' };
      default:
        return { label: 'INCONNU', color: '#A0AEC0', bgColor: 'rgba(160, 174, 192, 0.15)' };
    }
  };

  // Filtrer les boosts
  const filteredBoosts = boosts.filter(boost => {
    if (filter !== 'all' && boost.status !== filter) return false;
    
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      return (
        boost.product_title.toLowerCase().includes(query) ||
        boost.boost_id.toLowerCase().includes(query) ||
        (boost.transaction_id || '').toLowerCase().includes(query)
      );
    }
    
    return true;
  });

  // Rafraîchir
  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchBoostsData();
  }, [fetchBoostsData]);

  // Carte de statistique
  const StatCard = ({ title, value, icon, color, subtitle }: {
    title: string;
    value: string | number;
    icon: string;
    color: string;
    subtitle?: string;
  }) => (
    <View style={styles.statCard}>
      <View style={styles.statIconContainer}>
        <MaterialIcons name={icon as any} size={20} color={color} />
      </View>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statTitle}>{title}</Text>
      {subtitle && <Text style={styles.statSubtitle}>{subtitle}</Text>}
    </View>
  );

  // Carte de boost (mode grille)
  const BoostGridCard = ({ boost }: { boost: Boost }) => {
    const statusInfo = getStatusInfo(boost.status);
    
    return (
      <TouchableOpacity 
        style={styles.gridCard}
        onPress={() => {
          setSelectedBoost(boost);
          setDetailModalVisible(true);
        }}
      >
        <View style={styles.gridCardHeader}>
          <View style={styles.productImagePlaceholder}>
            <Text style={styles.productInitial}>
              {boost.product_title.charAt(0).toUpperCase()}
            </Text>
          </View>
          <View style={styles.gridCardTitleContainer}>
            <Text style={styles.gridCardTitle} numberOfLines={2}>
              {boost.product_title}
            </Text>
            <Text style={styles.gridCardId}>ID: {boost.boost_id.slice(0, 8)}...</Text>
          </View>
        </View>
        
        <View style={styles.gridCardStats}>
          <View style={styles.gridStatRow}>
            <View style={styles.gridStatItem}>
              <Feather name="dollar-sign" size={12} color={PRO_BLUE} />
              <Text style={styles.gridStatText}>
                {boost.amount.toLocaleString()} {boost.currency}
              </Text>
            </View>
            <View style={styles.gridStatItem}>
              <Feather name="eye" size={12} color={PRO_PURPLE} />
              <Text style={styles.gridStatText}>{boost.views.toLocaleString()}</Text>
            </View>
          </View>
          <View style={styles.gridStatRow}>
            <View style={styles.gridStatItem}>
              <Ionicons name="time-outline" size={12} color={PRO_ORANGE} />
              <Text style={styles.gridStatText}>{formatDuration(boost.duration_hours)}</Text>
            </View>
            <View style={styles.gridStatItem}>
              <MaterialIcons name="date-range" size={12} color="#A0AEC0" />
              <Text style={styles.gridStatText}>{formatDate(boost.start_date)}</Text>
            </View>
          </View>
        </View>
        
        <View style={[styles.statusBadge, { backgroundColor: statusInfo.bgColor }]}>
          <View style={[styles.statusDot, { backgroundColor: statusInfo.color }]} />
          <Text style={[styles.statusText, { color: statusInfo.color }]}>
            {statusInfo.label}
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  // Ligne de tableau (mode liste)
  const BoostTableRow = ({ boost, index }: { boost: Boost; index: number }) => {
    const statusInfo = getStatusInfo(boost.status);
    
    return (
      <TouchableOpacity 
        style={[styles.tableRow, index % 2 === 0 ? styles.tableRowEven : styles.tableRowOdd]}
        onPress={() => {
          setSelectedBoost(boost);
          setDetailModalVisible(true);
        }}
      >
        <View style={[styles.tableCell, { flex: 2.5 }]}>
          <View style={styles.productCell}>
            <View style={styles.productImageSmall}>
              <Text style={styles.productInitialSmall}>
                {boost.product_title.charAt(0).toUpperCase()}
              </Text>
            </View>
            <View style={styles.productInfo}>
              <Text style={styles.productTitle} numberOfLines={1}>
                {boost.product_title}
              </Text>
              <Text style={styles.productId}>ID: {boost.boost_id}</Text>
            </View>
          </View>
        </View>
        
        <View style={[styles.tableCell, { flex: 1 }]}>
          <View style={[styles.statusCell, { backgroundColor: statusInfo.bgColor }]}>
            <View style={[styles.statusDot, { backgroundColor: statusInfo.color }]} />
            <Text style={[styles.statusText, { color: statusInfo.color }]}>
              {statusInfo.label}
            </Text>
          </View>
        </View>
        
        <View style={[styles.tableCell, { flex: 1 }]}>
          <Text style={styles.cellText}>
            {boost.amount.toLocaleString()} {boost.currency}
          </Text>
        </View>
        
        <View style={[styles.tableCell, { flex: 1 }]}>
          <Text style={styles.cellText}>{boost.views.toLocaleString()}</Text>
        </View>
        
        <View style={[styles.tableCell, { flex: 1 }]}>
          <Text style={styles.cellText}>{formatDate(boost.start_date)}</Text>
        </View>
        
        <View style={[styles.tableCell, { flex: 1 }]}>
          <Text style={styles.cellText}>{formatDate(boost.end_date)}</Text>
        </View>
        
        <View style={[styles.tableCell, { flex: 0.5 }]}>
          <Feather name="chevron-right" size={16} color="#A0AEC0" />
        </View>
      </TouchableOpacity>
    );
  };

  if (loading && boosts.length === 0) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={PRO_BLUE} />
        <Text style={styles.loadingText}>Chargement des données...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Dashboard Boosts</Text>
          <View style={styles.headerActions}>
            <TouchableOpacity 
              style={styles.viewToggleButton}
              onPress={() => setViewMode(viewMode === 'table' ? 'grid' : 'table')}
            >
              <MaterialIcons 
                name={viewMode === 'table' ? 'grid-view' : 'view-list'} 
                size={20} 
                color={PRO_BLUE} 
              />
            </TouchableOpacity>
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
        </View>

        {/* Statistiques */}
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          style={styles.statsScroll}
        >
          <View style={styles.statsContainer}>
            <StatCard
              title="Total Boosts"
              value={stats.total}
              icon="rocket-launch"
              color={PRO_BLUE}
              subtitle={`${stats.performanceRate}% perf.`}
            />
            <StatCard
              title="Actifs"
              value={stats.active}
              icon="check-circle"
              color={PRO_GREEN}
              subtitle="en cours"
            />
            <StatCard
              title="Investissement"
              value={stats.totalInvestment.toLocaleString()}
              icon="attach-money"
              color={PRO_ORANGE}
              subtitle={boosts[0]?.currency || 'CDF'}
            />
            <StatCard
              title="Vues Total"
              value={stats.totalViews.toLocaleString()}
              icon="trending-up"
              color={PRO_PURPLE}
              subtitle="impressions"
            />
            <StatCard
              title="En attente"
              value={stats.pending}
              icon="pending"
              color="#FFD700"
              subtitle="à traiter"
            />
          </View>
        </ScrollView>
      </View>

      {/* Barre de contrôle */}
      <View style={styles.controlBar}>
        {/* Barre de recherche */}
        <View style={styles.searchContainer}>
          <Feather name="search" size={16} color="#A0AEC0" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Rechercher boost, produit, ID..."
            placeholderTextColor="#718096"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity 
              style={styles.clearButton}
              onPress={() => setSearchQuery("")}
            >
              <Ionicons name="close-circle" size={18} color="#A0AEC0" />
            </TouchableOpacity>
          )}
        </View>

        {/* Filtres */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.filtersScroll}
        >
          <View style={styles.filtersContainer}>
            {(['all', 'active', 'pending', 'failed', 'completed'] as const).map((item) => (
              <TouchableOpacity
                key={item}
                style={[
                  styles.filterButton,
                  filter === item && styles.filterButtonActive
                ]}
                onPress={() => setFilter(item)}
              >
                <Text style={[
                  styles.filterButtonText,
                  filter === item && styles.filterButtonTextActive
                ]}>
                  {item === 'all' ? 'Tous' : 
                   item === 'active' ? 'Actifs' :
                   item === 'pending' ? 'En attente' :
                   item === 'failed' ? 'Rejetés' : 'Terminés'}
                </Text>
                {filter === item && (
                  <View style={styles.filterIndicator} />
                )}
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>
      </View>

      {/* Contenu */}
      <View style={styles.content}>
        {viewMode === 'table' ? (
          /* Mode Tableau */
          <ScrollView 
            horizontal
            showsHorizontalScrollIndicator={true}
            style={styles.tableScroll}
          >
            <View style={styles.tableContainer}>
              {/* En-têtes du tableau */}
              <View style={styles.tableHeader}>
                <View style={[styles.tableHeaderCell, { flex: 2.5 }]}>
                  <Text style={styles.tableHeaderText}>PRODUIT</Text>
                </View>
                <View style={[styles.tableHeaderCell, { flex: 1 }]}>
                  <Text style={styles.tableHeaderText}>STATUT</Text>
                </View>
                <View style={[styles.tableHeaderCell, { flex: 1 }]}>
                  <Text style={styles.tableHeaderText}>MONTANT</Text>
                </View>
                <View style={[styles.tableHeaderCell, { flex: 1 }]}>
                  <Text style={styles.tableHeaderText}>VUES</Text>
                </View>
                <View style={[styles.tableHeaderCell, { flex: 1 }]}>
                  <Text style={styles.tableHeaderText}>DÉBUT</Text>
                </View>
                <View style={[styles.tableHeaderCell, { flex: 1 }]}>
                  <Text style={styles.tableHeaderText}>FIN</Text>
                </View>
                <View style={[styles.tableHeaderCell, { flex: 0.5 }]}>
                  <Text style={styles.tableHeaderText}></Text>
                </View>
              </View>

              {/* Lignes du tableau */}
              {filteredBoosts.length === 0 ? (
                <View style={styles.emptyState}>
                  <MaterialIcons name="rocket-launch" size={50} color="#3A4A5A" />
                  <Text style={styles.emptyStateTitle}>
                    {searchQuery ? 'Aucun résultat' : 'Aucun boost trouvé'}
                  </Text>
                  <Text style={styles.emptyStateText}>
                    {searchQuery 
                      ? 'Essayez avec d\'autres termes'
                      : 'Commencez par booster votre premier produit'
                    }
                  </Text>
                </View>
              ) : (
                <ScrollView 
                  showsVerticalScrollIndicator={true}
                  style={styles.tableBodyScroll}
                >
                  {filteredBoosts.map((boost, index) => (
                    <BoostTableRow key={boost.boost_id} boost={boost} index={index} />
                  ))}
                </ScrollView>
              )}
            </View>
          </ScrollView>
        ) : (
          /* Mode Grille */
          <ScrollView 
            contentContainerStyle={styles.gridContainer}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                colors={[PRO_BLUE]}
                tintColor={PRO_BLUE}
              />
            }
          >
            {filteredBoosts.length === 0 ? (
              <View style={styles.emptyState}>
                <MaterialIcons name="rocket-launch" size={50} color="#3A4A5A" />
                <Text style={styles.emptyStateTitle}>
                  {searchQuery ? 'Aucun résultat' : 'Aucun boost trouvé'}
                </Text>
              </View>
            ) : (
              <View style={styles.grid}>
                {filteredBoosts.map((boost) => (
                  <BoostGridCard key={boost.boost_id} boost={boost} />
                ))}
              </View>
            )}
          </ScrollView>
        )}
      </View>

      {/* Footer */}
      <View style={styles.footer}>
        <Text style={styles.footerText}>
          {filteredBoosts.length} boost{filteredBoosts.length !== 1 ? 's' : ''} affiché{filteredBoosts.length !== 1 ? 's' : ''}
        </Text>
        <View style={styles.footerStats}>
          <View style={styles.footerStatItem}>
            <Feather name="dollar-sign" size={12} color={PRO_GREEN} />
            <Text style={styles.footerStatText}>
              Total: {stats.totalInvestment.toLocaleString()} {boosts[0]?.currency || 'CDF'}
            </Text>
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: SHOPNET_BLUE,
    paddingTop: Platform.OS === "android" ? StatusBar.currentHeight : 0,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: SHOPNET_BLUE,
  },
  loadingText: {
    color: PRO_BLUE,
    fontSize: 16,
    marginTop: 12,
    fontWeight: "600",
  },
  header: {
    backgroundColor: SHOPNET_BLUE,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(66, 165, 245, 0.1)",
  },
  headerTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  backButton: {
    padding: 8,
  },
  headerActions: {
    flexDirection: "row",
    alignItems: "center",
  },
  viewToggleButton: {
    padding: 8,
    marginRight: 8,
  },
  refreshButton: {
    padding: 8,
    width: 36,
    height: 36,
    justifyContent: "center",
    alignItems: "center",
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#fff",
    letterSpacing: 0.5,
  },
  statsScroll: {
    marginHorizontal: -16,
  },
  statsContainer: {
    flexDirection: "row",
    paddingHorizontal: 16,
    paddingBottom: 4,
  },
  statCard: {
    width: 120,
    backgroundColor: CARD_BG,
    borderRadius: 12,
    padding: 16,
    marginRight: 12,
    borderWidth: 1,
    borderColor: BORDER_COLOR,
  },
  statIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 12,
  },
  statValue: {
    fontSize: 24,
    fontWeight: "800",
    color: "#fff",
    marginBottom: 4,
  },
  statTitle: {
    fontSize: 12,
    color: "#E2E8F0",
    fontWeight: "600",
    marginBottom: 2,
  },
  statSubtitle: {
    fontSize: 11,
    color: "#A0AEC0",
  },
  controlBar: {
    backgroundColor: SHOPNET_BLUE,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(66, 165, 245, 0.1)",
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: CARD_BG,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: BORDER_COLOR,
    marginBottom: 12,
  },
  searchIcon: {
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    color: "#fff",
    fontSize: 14,
    fontWeight: "500",
  },
  clearButton: {
    padding: 4,
  },
  filtersScroll: {
    marginHorizontal: -16,
  },
  filtersContainer: {
    flexDirection: "row",
    paddingHorizontal: 16,
  },
  filterButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: CARD_BG,
    marginRight: 8,
    borderWidth: 1,
    borderColor: BORDER_COLOR,
    position: "relative",
  },
  filterButtonActive: {
    backgroundColor: PRO_BLUE,
    borderColor: PRO_BLUE,
  },
  filterButtonText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#A0AEC0",
  },
  filterButtonTextActive: {
    color: "#fff",
  },
  filterIndicator: {
    position: "absolute",
    top: -2,
    right: -2,
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#fff",
  },
  content: {
    flex: 1,
    backgroundColor: SHOPNET_BLUE,
  },
  tableScroll: {
    flex: 1,
  },
  tableContainer: {
    minWidth: width,
    padding: 16,
  },
  tableHeader: {
    flexDirection: "row",
    backgroundColor: "rgba(20, 32, 49, 0.95)",
    borderTopLeftRadius: 10,
    borderTopRightRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(66, 165, 245, 0.2)",
  },
  tableHeaderCell: {
    paddingHorizontal: 8,
  },
  tableHeaderText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#A0AEC0",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  tableBodyScroll: {
    maxHeight: 400,
  },
  tableRow: {
    flexDirection: "row",
    paddingHorizontal: 16,
    paddingVertical: 12,
    alignItems: "center",
    minHeight: 60,
  },
  tableRowEven: {
    backgroundColor: "rgba(30, 42, 59, 0.6)",
  },
  tableRowOdd: {
    backgroundColor: "rgba(26, 38, 51, 0.6)",
  },
  tableCell: {
    paddingHorizontal: 8,
  },
  productCell: {
    flexDirection: "row",
    alignItems: "center",
  },
  productImageSmall: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: "rgba(66, 165, 245, 0.1)",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  productInitialSmall: {
    color: PRO_BLUE,
    fontSize: 14,
    fontWeight: "700",
  },
  productInfo: {
    flex: 1,
  },
  productTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#fff",
    marginBottom: 2,
  },
  productId: {
    fontSize: 11,
    color: "#A0AEC0",
  },
  statusCell: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    alignSelf: "flex-start",
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 6,
  },
  statusText: {
    fontSize: 11,
    fontWeight: "700",
  },
  cellText: {
    fontSize: 13,
    fontWeight: "500",
    color: "#fff",
  },
  gridContainer: {
    padding: 16,
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },
  gridCard: {
    width: (width - 40) / 2,
    backgroundColor: CARD_BG,
    borderRadius: 12,
    padding: 14,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: BORDER_COLOR,
  },
  gridCardHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  productImagePlaceholder: {
    width: 48,
    height: 48,
    borderRadius: 10,
    backgroundColor: "rgba(66, 165, 245, 0.1)",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  productInitial: {
    color: PRO_BLUE,
    fontSize: 18,
    fontWeight: "700",
  },
  gridCardTitleContainer: {
    flex: 1,
  },
  gridCardTitle: {
    fontSize: 13,
    fontWeight: "600",
    color: "#fff",
    marginBottom: 2,
    lineHeight: 16,
  },
  gridCardId: {
    fontSize: 10,
    color: "#A0AEC0",
  },
  gridCardStats: {
    marginBottom: 12,
  },
  gridStatRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  gridStatItem: {
    flexDirection: "row",
    alignItems: "center",
  },
  gridStatText: {
    fontSize: 11,
    color: "#A0AEC0",
    marginLeft: 4,
    fontWeight: "500",
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  emptyState: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 60,
    paddingHorizontal: 40,
  },
  emptyStateTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#fff",
    marginTop: 16,
    marginBottom: 8,
    textAlign: "center",
  },
  emptyStateText: {
    fontSize: 14,
    color: "#A0AEC0",
    textAlign: "center",
    lineHeight: 20,
  },
  footer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: CARD_BG,
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderTopWidth: 1,
    borderTopColor: BORDER_COLOR,
  },
  footerText: {
    fontSize: 13,
    color: "#A0AEC0",
    fontWeight: "500",
  },
  footerStats: {
    flexDirection: "row",
    alignItems: "center",
  },
  footerStatItem: {
    flexDirection: "row",
    alignItems: "center",
  },
  footerStatText: {
    fontSize: 12,
    color: "#E2E8F0",
    marginLeft: 6,
    fontWeight: "500",
  },
});