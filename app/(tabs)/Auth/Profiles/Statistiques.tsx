


// SellerStatsScreen.tsx
import React, { useEffect, useState, useCallback } from 'react';
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
} from 'react-native';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { FontAwesome5, FontAwesome } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

const { width } = Dimensions.get('window');
const CARD_WIDTH = (width - 48) / 2;

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
      const token = await AsyncStorage.getItem('userToken'); // ou nom utilisé
      if (!token) {
        setError('Token manquant. Connectez-vous.');
        setLoading(false);
        return;
      }
      const res = await axios.get<StatsResponse>(
        'https://shopnet-backend.onrender.com/api/profile/statistiques',
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      setData(res.data);
    } catch (err: any) {
      console.error('Erreur fetchStats:', err.message || err);
      setError('Impossible de charger les statistiques.');
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

  if (loading && !refreshing) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#1877F2" />
        <Text style={styles.loadingText}>Chargement des statistiques...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.center}>
        <FontAwesome name="exclamation-triangle" size={50} color="#FF6B6B" />
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity style={styles.retryBtn} onPress={fetchStats}>
          <Text style={styles.retryText}>Réessayer</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (!data || !data.success) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>Pas de données disponibles.</Text>
      </View>
    );
  }

  const stats = data.statistiques;

  const SummaryCard = ({
    icon,
    label,
    value,
    small,
  }: {
    icon: React.ReactNode;
    label: string;
    value: string | number;
    small?: boolean;
  }) => (
    <View style={[styles.summaryCard, small && styles.summaryCardSmall]}>
      <View style={styles.summaryIcon}>{icon}</View>
      <View style={styles.summaryTextContainer}>
        <Text style={styles.summaryLabel}>{label}</Text>
        <Text style={styles.summaryValue}>{value}</Text>
      </View>
    </View>
  );

  const ProductRow = ({
    item,
    type,
  }: {
    item: TopProduct;
    type: 'vendu' | 'vu';
  }) => (
    <TouchableOpacity
      style={styles.productRow}
      onPress={() => router.push({ pathname: '/(tabs)/Auth/Panier/DetailId', params: { id: item.id.toString() } })}
      activeOpacity={0.8}
    >
      <Image
        source={{
          uri: item.image || 'https://via.placeholder.com/80x80?text=No+Image',
        }}
        style={styles.productImage}
        resizeMode="cover"
      />
      <View style={styles.productInfo}>
        <Text style={styles.productTitle} numberOfLines={1}>
          {item.title}
        </Text>
        <View style={styles.productMeta}>
          {type === 'vendu' ? (
            <>
              <FontAwesome name="shopping-cart" size={14} color="#555" />
              <Text style={styles.metaText}>{item.ventes ?? 0} vend.</Text>
            </>
          ) : (
            <>
              <FontAwesome name="eye" size={14} color="#555" />
              <Text style={styles.metaText}>{item.vues ?? 0} vues</Text>
            </>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <ScrollView
      style={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#1877F2" />}
    >
      <Text style={styles.header}>Tableau de bord vendeur</Text>

      {/* Résumé haut */}
      <View style={styles.row}>
        <SummaryCard
          icon={<FontAwesome5 name="shopping-bag" size={24} color="#fff" />}
          label="Produits vendus"
          value={stats.ventes.total_produits_vendus}
        />
        <SummaryCard
          icon={<FontAwesome5 name="cash-register" size={24} color="#fff" />}
          label="Revenu total"
          value={`$${stats.ventes.revenu_total.toLocaleString()}`}
        />
      </View>
      <View style={styles.row}>
        <SummaryCard
          icon={<FontAwesome5 name="calendar-day" size={24} color="#fff" />}
          label="Revenu ce mois"
          value={`$${stats.ventes.revenu_mensuel.toLocaleString()}`}
        />
        <SummaryCard
          icon={<FontAwesome5 name="box-open" size={24} color="#fff" />}
          label="Produits en vente"
          value={stats.produits.total_produits_en_vente}
        />
      </View>

      <View style={styles.row}>
        <SummaryCard
          icon={<FontAwesome5 name="eye" size={24} color="#fff" />}
          label="Vues totales"
          value={stats.vues.total}
          small
        />
        <SummaryCard
          icon={<FontAwesome5 name="heart" size={24} color="#fff" />}
          label="Likes"
          value={stats.interactions.likes}
          small
        />
        <SummaryCard
          icon={<FontAwesome5 name="share-alt" size={24} color="#fff" />}
          label="Partages"
          value={stats.interactions.partages}
          small
        />
      </View>

      {/* Top produits vendus */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Top produits vendus</Text>
        <FlatList
          data={stats.produits.top_vendus}
          keyExtractor={(i) => i.id.toString()}
          renderItem={({ item }) => <ProductRow item={item} type="vendu" />}
          scrollEnabled={false}
          ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
        />
      </View>

      {/* Top produits vus */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Top produits vus</Text>
        <FlatList
          data={stats.produits.top_vus}
          keyExtractor={(i) => i.id.toString()}
          renderItem={({ item }) => <ProductRow item={item} type="vu" />}
          scrollEnabled={false}
          ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
        />
      </View>

      {/* CTA / Actions rapides */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Actions rapides</Text>
        <View style={styles.actionsRow}>
          <TouchableOpacity style={styles.actionCard}>
            <FontAwesome5 name="plus-circle" size={22} color="#1877F2" />
            <Text style={styles.actionText}>Ajouter produit</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionCard}>
            <FontAwesome5 name="chart-line" size={22} color="#1877F2" />
            <Text style={styles.actionText}>Voir détails</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionCard}>
            <FontAwesome5 name="history" size={22} color="#1877F2" />
            <Text style={styles.actionText}>Historique</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Footer léger */}
      <View style={{ height: 40 }} />
    </ScrollView>
  );
};

export default SellerStatsScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1F273A',
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  header: {
    fontSize: 24,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 16,
  },
  row: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
    flexWrap: 'wrap',
  },
  summaryCard: {
    flex: 1,
    minWidth: CARD_WIDTH,
    backgroundColor: '#2A374F',
    borderRadius: 12,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#2F4469',
  },
  summaryCardSmall: {
    flex: 1,
    minWidth: (width - 64) / 3,
  },
  summaryIcon: {
    marginRight: 12,
    backgroundColor: '#0D1B3A',
    padding: 10,
    borderRadius: 8,
  },
  summaryTextContainer: {
    flex: 1,
  },
  summaryLabel: {
    fontSize: 12,
    color: '#aaa',
    marginBottom: 4,
    textTransform: 'uppercase',
    fontWeight: '600',
  },
  summaryValue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
  },
  section: {
    marginTop: 18,
    marginBottom: 6,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 8,
  },
  productRow: {
    backgroundColor: '#2A374F',
    borderRadius: 10,
    flexDirection: 'row',
    padding: 12,
    alignItems: 'center',
    gap: 12,
  },
  productImage: {
    width: 60,
    height: 60,
    borderRadius: 8,
    backgroundColor: '#22304E',
  },
  productInfo: {
    flex: 1,
  },
  productTitle: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
  },
  productMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  metaText: {
    color: '#d1d9ee',
    marginLeft: 4,
    fontSize: 12,
  },
  actionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 6,
  },
  actionCard: {
    flex: 1,
    backgroundColor: '#22304E',
    borderRadius: 10,
    padding: 14,
    alignItems: 'center',
    marginHorizontal: 4,
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'center',
  },
  actionText: {
    color: '#fff',
    marginLeft: 6,
    fontSize: 12,
    fontWeight: '600',
  },
  center: {
    flex: 1,
    backgroundColor: '#1F273A',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    color: '#ccc',
    marginTop: 10,
    fontSize: 14,
  },
  errorText: {
    color: '#FF6B6B',
    fontSize: 16,
    marginTop: 12,
    textAlign: 'center',
  },
  retryBtn: {
    marginTop: 12,
    backgroundColor: '#1877F2',
    paddingVertical: 10,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  retryText: {
    color: '#fff',
    fontWeight: '600',
  },
});
