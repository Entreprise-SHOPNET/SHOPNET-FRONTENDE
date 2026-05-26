


import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  Image,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  TextInput,
  ActivityIndicator,
  Dimensions,
  RefreshControl,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width } = Dimensions.get('window');
const LOCAL_API = 'https://shopnet-backend.onrender.com/api';
const CACHE_KEY = '@all_shops_cache';
const CACHE_EXPIRY = 5 * 60 * 1000; // 5 minutes
const ITEMS_PER_PAGE = 8;

const COLORS = {
  background: '#FFFFFF',
  card: '#FFFFFF',
  text: '#1C1C1E',
  textSecondary: '#8E8E93',
  accent: '#0A68B4',
  accentLight: '#E6F0FA',
  border: '#E8E8E8',
  error: '#F44336',
  verified: '#1877F2',
};

type Shop = {
  id: number;
  nom: string;
  logo: string;
  description: string;
  ville: string;
  pays: string;
  latitude: string;
  longitude: string;
  type_boutique: string;
  date_activation: string | null;
  distance?: number;
  verified?: boolean;
};

const VerificationBadge = ({ size = 14 }: { size?: number }) => (
  <View style={[styles.verificationBadge, { width: size, height: size }]}>
    <MaterialIcons name="verified" size={size * 0.9} color={COLORS.verified} />
  </View>
);

export default function AllShopsScreen() {
  const router = useRouter();
  const [allShops, setAllShops] = useState<Shop[]>([]);
  const [displayedShops, setDisplayedShops] = useState<Shop[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [userLocation, setUserLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [networkMode, setNetworkMode] = useState<'gps' | 'no_gps'>('no_gps');

  // Charger le cache
  const loadCache = async (): Promise<Shop[] | null> => {
    try {
      const cacheStr = await AsyncStorage.getItem(CACHE_KEY);
      if (cacheStr) {
        const { data, timestamp } = JSON.parse(cacheStr);
        if (Date.now() - timestamp < CACHE_EXPIRY) {
          return data;
        }
      }
    } catch (error) {
      console.error('Erreur chargement cache:', error);
    }
    return null;
  };

  const saveCache = async (shops: Shop[]) => {
    try {
      const cacheData = { timestamp: Date.now(), data: shops };
      await AsyncStorage.setItem(CACHE_KEY, JSON.stringify(cacheData));
    } catch (error) {
      console.error('Erreur sauvegarde cache:', error);
    }
  };

  const applyPagination = (shops: Shop[], pageNum: number) => {
    const end = pageNum * ITEMS_PER_PAGE;
    const paginated = shops.slice(0, end);
    setDisplayedShops(paginated);
    setHasMore(end < shops.length);
    setPage(pageNum);
  };

  const fetchShops = async (pageNum: number, lat?: number, lng?: number, isLoadMore = false) => {
    try {
      let url = `${LOCAL_API}/boutique/premium/discover/nearby?page=${pageNum}&limit=${ITEMS_PER_PAGE}`;
      if (lat !== undefined && lng !== undefined) {
        url += `&latitude=${lat}&longitude=${lng}&radius=500`;
      }
      console.log('Fetching shops:', url);
      const response = await fetch(url);
      const data = await response.json();
      console.log('API response:', data);

      if (data.success && data.shops) {
        const shops: Shop[] = data.shops.map((shop: any) => ({
          ...shop,
          verified: true,
        }));

        if (pageNum === 1) {
          setAllShops(shops);
          setNetworkMode(data.mode);
          saveCache(shops);
          applyPagination(shops, 1);
        } else {
          setAllShops(prev => {
            const newShops = [...prev, ...shops];
            saveCache(newShops);
            return newShops;
          });
          setDisplayedShops(prev => [...prev, ...shops]);
          setHasMore(shops.length === ITEMS_PER_PAGE);
          setPage(pageNum);
        }
        return true;
      } else {
        console.warn('API returned success false or no shops', data);
        if (pageNum === 1) {
          setAllShops([]);
          setDisplayedShops([]);
          setHasMore(false);
        }
        return false;
      }
    } catch (error) {
      console.error('Erreur fetchShops:', error);
      return false;
    }
  };

  const loadInitialData = async () => {
    // 1. Cache
    const cached = await loadCache();
    if (cached && cached.length > 0) {
      setAllShops(cached);
      applyPagination(cached, 1);
      setLoading(false);
    }

    // 2. Demander la localisation
    let location = null;
    let hasGps = false;
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status === 'granted') {
      try {
        const loc = await Location.getCurrentPositionAsync({});
        location = {
          latitude: loc.coords.latitude,
          longitude: loc.coords.longitude,
        };
        setUserLocation(location);
        hasGps = true;
      } catch (err) {
        console.warn('Erreur position:', err);
      }
    }

    // 3. Appel réseau
    if (hasGps && location) {
      await fetchShops(1, location.latitude, location.longitude);
    } else {
      await fetchShops(1);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadInitialData();
  }, []);

  const loadMore = () => {
    if (loadingMore || !hasMore) return;
    setLoadingMore(true);
    const nextPage = page + 1;
    if (userLocation) {
      fetchShops(nextPage, userLocation.latitude, userLocation.longitude, true).finally(() => setLoadingMore(false));
    } else {
      fetchShops(nextPage, undefined, undefined, true).finally(() => setLoadingMore(false));
    }
  };

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    if (userLocation) {
      fetchShops(1, userLocation.latitude, userLocation.longitude).finally(() => setRefreshing(false));
    } else {
      fetchShops(1).finally(() => setRefreshing(false));
    }
  }, [userLocation]);

  // Filtrage local (recherche)
  useEffect(() => {
    if (searchQuery.trim() === '') {
      applyPagination(allShops, 1);
    } else {
      const query = searchQuery.toLowerCase();
      const filtered = allShops.filter(
        shop =>
          shop.nom.toLowerCase().includes(query) ||
          shop.ville.toLowerCase().includes(query)
      );
      setDisplayedShops(filtered);
      setHasMore(false);
    }
  }, [searchQuery, allShops]);

  const renderShopItem = ({ item }: { item: Shop }) => {
    const distanceText = item.distance !== undefined && item.distance !== null
      ? `${item.distance.toFixed(1)} km`
      : 'Distance inconnue';
    return (
      <TouchableOpacity
        style={[styles.shopCard, { borderColor: COLORS.border }]}
        onPress={() => router.push(`/ShopDetail?id=${item.id}`)}
      >
        <Image source={{ uri: item.logo }} style={styles.shopLogo} />
        <View style={styles.shopInfo}>
          <View style={styles.shopNameRow}>
            <Text style={[styles.shopName, { color: COLORS.text }]} numberOfLines={1}>
              {item.nom}
            </Text>
            {item.verified && <VerificationBadge size={14} />}
          </View>
          <Text style={[styles.shopCity, { color: COLORS.textSecondary }]} numberOfLines={1}>
            {item.ville}, {item.pays}
          </Text>
          <View style={styles.shopDistanceRow}>
            <Ionicons name="location-outline" size={12} color={COLORS.textSecondary} />
            <Text style={[styles.shopDistance, { color: COLORS.textSecondary }]}>
              {distanceText}
            </Text>
          </View>
        </View>
        <Ionicons name="chevron-forward" size={20} color={COLORS.textSecondary} />
      </TouchableOpacity>
    );
  };

  const renderFooter = () => {
    if (!loadingMore) return null;
    return (
      <View style={styles.footerLoader}>
        <ActivityIndicator size="small" color={COLORS.accent} />
        <Text style={[styles.footerText, { color: COLORS.textSecondary }]}>Chargement...</Text>
      </View>
    );
  };

  if (loading && allShops.length === 0) {
    return (
      <SafeAreaView style={[styles.loadingContainer, { backgroundColor: COLORS.background }]}>
        <StatusBar barStyle="dark-content" backgroundColor={COLORS.background} />
        <ActivityIndicator size="large" color={COLORS.accent} />
        <Text style={[styles.loadingText, { color: COLORS.textSecondary }]}>Chargement des boutiques...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: COLORS.background }]}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.background} />

      <View style={[styles.header, { borderBottomColor: COLORS.border }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="chevron-back" size={28} color={COLORS.text} />
        </TouchableOpacity>
        <View style={styles.headerTextContainer}>
          <Text style={styles.headerTitle}>Boutiques</Text>
          <Text style={styles.headerSubtitle}>
            {networkMode === 'gps' ? 'À proximité' : 'Toutes les boutiques'}
          </Text>
        </View>
        <View style={{ width: 40 }} />
      </View>

      <View style={[styles.searchContainer, { borderColor: COLORS.border }]}>
        <Ionicons name="search-outline" size={20} color={COLORS.textSecondary} />
        <TextInput
          style={[styles.searchInput, { color: COLORS.text }]}
          placeholder="Rechercher une boutique..."
          placeholderTextColor={COLORS.textSecondary}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery('')}>
            <Ionicons name="close-circle" size={20} color={COLORS.textSecondary} />
          </TouchableOpacity>
        )}
      </View>

      <FlatList
        data={displayedShops}
        keyExtractor={(item) => item.id.toString()}
        renderItem={renderShopItem}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        onEndReached={loadMore}
        onEndReachedThreshold={0.3}
        ListFooterComponent={renderFooter}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[COLORS.accent]}
            tintColor={COLORS.accent}
          />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="storefront-outline" size={64} color={COLORS.textSecondary} />
            <Text style={[styles.emptyText, { color: COLORS.text }]}>
              Aucune boutique trouvée
            </Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: 12, fontSize: 16 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  backButton: { padding: 4 },
  headerTextContainer: { flex: 1, marginLeft: 8 },
  headerTitle: { fontSize: 24, fontWeight: '700', color: COLORS.text },
  headerSubtitle: { fontSize: 13, color: COLORS.textSecondary, marginTop: 2 },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
    borderRadius: 12,
    backgroundColor: COLORS.card,
  },
  searchInput: { flex: 1, marginLeft: 8, fontSize: 16, paddingVertical: 4 },
  listContent: { paddingHorizontal: 16, paddingBottom: 20 },
  shopCard: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderRadius: 16,
    marginBottom: 12,
    backgroundColor: COLORS.card,
  },
  shopLogo: { width: 56, height: 56, borderRadius: 28, marginRight: 14 },
  shopInfo: { flex: 1 },
  shopNameRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 4 },
  shopName: { fontSize: 16, fontWeight: '600' },
  shopCity: { fontSize: 13, marginBottom: 4 },
  shopDistanceRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  shopDistance: { fontSize: 12 },
  verificationBadge: { justifyContent: 'center', alignItems: 'center' },
  footerLoader: { paddingVertical: 20, alignItems: 'center', justifyContent: 'center' },
  footerText: { fontSize: 14, marginTop: 8 },
  emptyContainer: { alignItems: 'center', justifyContent: 'center', paddingVertical: 60 },
  emptyText: { fontSize: 16, marginTop: 12 },
});