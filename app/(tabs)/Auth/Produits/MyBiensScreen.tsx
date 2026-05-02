



import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Image,
  ActivityIndicator,
  TouchableOpacity,
  RefreshControl,
  SafeAreaView,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';

// Types
type Bien = {
  id: number;
  titre: string;
  type_bien: string;
  type_offre: string;
  prix: string;
  devise: string;
  ville: string;
  commune: string;
  quartier: string;
  reference: string;
  images: string[];
  status: 'approved' | 'pending' | 'rejected';
  created_at: string;
};

type ApiResponse = {
  success: boolean;
  count: number;
  biens: Bien[];
};

// Configuration
const API_URL = 'https://shopnet-immo-backend.onrender.com/api/agent/my-biens';
const CACHE_KEY = 'my_biens_cache';
const CACHE_TTL = 30 * 60 * 1000; // 30 minutes

// Couleurs (Apple-like)
const COLORS = {
  primary: '#007AFF',
  background: '#F2F2F7', // fond gris clair style iOS
  cardBackground: '#FFFFFF',
  text: '#1C1C1E',
  textSecondary: '#8E8E93',
  border: '#C6C6C8',
  success: '#34C759',
  warning: '#FF9500',
  danger: '#FF3B30',
};

export default function MyBiensScreen() {
  const router = useRouter();
  const [biens, setBiens] = useState<Bien[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Charger depuis le cache ou l'API
  const loadBiens = async (isRefresh = false) => {
    if (!isRefresh) setLoading(true);
    setError(null);

    try {
      const token = await AsyncStorage.getItem('userToken');
      if (!token) {
        Alert.alert('Erreur', 'Vous devez être connecté');
        router.push('/splash');
        return;
      }

      // 1. Vérifier le cache (sauf si refresh forcé)
      if (!isRefresh) {
        const cached = await AsyncStorage.getItem(CACHE_KEY);
        if (cached) {
          const { data, timestamp } = JSON.parse(cached);
          if (Date.now() - timestamp < CACHE_TTL && data.length > 0) {
            setBiens(data);
            setLoading(false);
            // Mise à jour en arrière‑plan
            fetchBiensFromAPI(token, true);
            return;
          }
        }
      }

      // 2. Charger depuis l'API
      await fetchBiensFromAPI(token);
    } catch (err) {
      console.error(err);
      setError('Impossible de charger vos biens');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const fetchBiensFromAPI = async (token: string, silent = false) => {
    try {
      const response = await fetch(API_URL, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data: ApiResponse = await response.json();

      if (data.success) {
        setBiens(data.biens);
        // Mettre en cache
        await AsyncStorage.setItem(
          CACHE_KEY,
          JSON.stringify({ data: data.biens, timestamp: Date.now() })
        );
      } else if (!silent) {
        setError('Impossible de charger vos biens');
      }
    } catch (err) {
      if (!silent) setError('Erreur réseau');
      console.error(err);
    }
  };

  useEffect(() => {
    loadBiens();
  }, []);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadBiens(true);
  }, []);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved': return COLORS.success;
      case 'pending': return COLORS.warning;
      case 'rejected': return COLORS.danger;
      default: return COLORS.textSecondary;
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'approved': return 'Approuvé';
      case 'pending': return 'En attente';
      case 'rejected': return 'Refusé';
      default: return status;
    }
  };

  // Actions
  const handleView = (bien: Bien) => {
    router.push({
      pathname: './ImmobilierDetail',
      params: { id: bien.id.toString() },
    });
  };

  const handleEdit = (bien: Bien) => {
    router.push({
      pathname: './PublierImmobilier',
      params: { mode: 'edit', id: bien.id.toString() },
    });
  };

  const handleBoost = (bien: Bien) => {
    router.push({
      pathname: './BoosterBien',
      params: { id: bien.id.toString(), titre: bien.titre },
    });
  };

  const renderBienItem = ({ item }: { item: Bien }) => {
    const imageUrl = item.images && item.images.length > 0
      ? item.images[0]
      : 'https://placehold.co/600x400?text=SHOPNET+IMMO';

    return (
      <View style={styles.card}>
        {/* Image pleine largeur */}
        <TouchableOpacity activeOpacity={0.9} onPress={() => handleView(item)}>
          <Image source={{ uri: imageUrl }} style={styles.cardImage} />
        </TouchableOpacity>

        <View style={styles.cardContent}>
          <TouchableOpacity onPress={() => handleView(item)}>
            <Text style={styles.cardTitle} numberOfLines={1}>{item.titre}</Text>
            <Text style={styles.cardPrice}>
              {parseFloat(item.prix).toLocaleString()} {item.devise}
            </Text>
            <Text style={styles.cardLocation}>
              {item.ville}, {item.commune}
            </Text>
            <View style={styles.statusContainer}>
              <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) }]}>
                <Text style={styles.statusText}>{getStatusLabel(item.status)}</Text>
              </View>
            </View>
          </TouchableOpacity>

          {/* Actions */}
          <View style={styles.actionsRow}>
            <TouchableOpacity style={styles.actionButton} onPress={() => handleView(item)}>
              <Ionicons name="eye-outline" size={20} color={COLORS.primary} />
              <Text style={styles.actionText}>Voir</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionButton} onPress={() => handleEdit(item)}>
              <Ionicons name="create-outline" size={20} color={COLORS.primary} />
              <Text style={styles.actionText}>Modifier</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionButton} onPress={() => handleBoost(item)}>
              <Ionicons name="rocket-outline" size={20} color={COLORS.primary} />
              <Text style={styles.actionText}>Booster</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  };

  const renderEmptyList = () => (
    <View style={styles.emptyContainer}>
      <Ionicons name="home-outline" size={60} color={COLORS.textSecondary} />
      <Text style={styles.emptyTitle}>Aucun bien publié</Text>
      <Text style={styles.emptySubtitle}>
        Commencez à publier votre premier bien immobilier
      </Text>
      <TouchableOpacity
        style={styles.publishButton}
        onPress={() => router.push('/(tabs)/Auth/Produits/PublierImmobilier')}
      >
        <Ionicons name="add-circle-outline" size={20} color="#FFFFFF" />
        <Text style={styles.publishButtonText}>Publier une annonce</Text>
      </TouchableOpacity>
    </View>
  );

  if (loading && !refreshing) {
    return (
      <SafeAreaView style={styles.centerContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Chargement de vos biens...</Text>
      </SafeAreaView>
    );
  }

  if (error && biens.length === 0) {
    return (
      <SafeAreaView style={styles.centerContainer}>
        <Ionicons name="alert-circle-outline" size={60} color={COLORS.danger} />
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={onRefresh}>
          <Text style={styles.retryButtonText}>Réessayer</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header fixe */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Mes biens</Text>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => router.push('/(tabs)/Auth/Produits/PublierImmobilier')}
        >
          <Ionicons name="add-circle" size={32} color={COLORS.primary} />
        </TouchableOpacity>
      </View>

      <FlatList
        data={biens}
        keyExtractor={(item) => item.id.toString()}
        renderItem={renderBienItem}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[COLORS.primary]}
            tintColor={COLORS.primary}
          />
        }
        ListEmptyComponent={renderEmptyList}
        showsVerticalScrollIndicator={false}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.background,
    padding: 20,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: COLORS.textSecondary,
  },
  errorText: {
    marginTop: 16,
    fontSize: 16,
    color: COLORS.danger,
    textAlign: 'center',
  },
  retryButton: {
    marginTop: 20,
    backgroundColor: COLORS.primary,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '600',
    color: COLORS.text,
  },
  addButton: {
    padding: 4,
  },
  listContent: {
    paddingBottom: 20,
  },
  card: {
    backgroundColor: COLORS.cardBackground,
    marginBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    overflow: 'hidden',
  },
  cardImage: {
    width: '100%',
    height: 200,
    resizeMode: 'cover',
    backgroundColor: '#F2F2F7',
  },
  cardContent: {
    padding: 12,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 4,
  },
  cardPrice: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.primary,
    marginBottom: 4,
  },
  cardLocation: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginBottom: 8,
  },
  statusContainer: {
    marginBottom: 12,
    alignSelf: 'flex-start',
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  statusText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  actionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    paddingTop: 12,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  actionText: {
    fontSize: 14,
    fontWeight: '500',
    color: COLORS.primary,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    paddingHorizontal: 20,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: COLORS.text,
    marginTop: 16,
  },
  emptySubtitle: {
    fontSize: 14,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginTop: 8,
    marginBottom: 24,
  },
  publishButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primary,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 30,
    gap: 8,
  },
  publishButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 14,
  },
});