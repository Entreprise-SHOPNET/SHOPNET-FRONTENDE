
import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  Image,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Dimensions,
  RefreshControl,
  Modal,
  ScrollView,
} from 'react-native';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';

const { width } = Dimensions.get('window');
const API_URL = 'https://shopnet-immo-backend.onrender.com/api/biens/public';
const CACHE_KEY = 'immo_biens_cache';
const CACHE_TTL = 30 * 60 * 1000; // 30 minutes
const FAVORITES_KEY = 'immo_favorites';
const ITEMS_PER_PAGE = 10;

type Bien = {
  id: number;
  titre: string;
  type_bien: string;
  type_offre: string;
  prix: number;
  devise: string;
  ville: string;
  quartier: string;
  images: string[];
  description: string;
  whatsapp?: string;
  telephone?: string;
};

export default function Immobilier() {
  const router = useRouter();
  const [allProperties, setAllProperties] = useState<Bien[]>([]);
  const [filteredProperties, setFilteredProperties] = useState<Bien[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [favorites, setFavorites] = useState<number[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [totalCount, setTotalCount] = useState(0);
  const [numColumns, setNumColumns] = useState(2);

  // États des filtres
  const [selectedVille, setSelectedVille] = useState('');
  const [selectedOffre, setSelectedOffre] = useState('');
  const [selectedType, setSelectedType] = useState('');

  // États pour modaux
  const [modalVilleVisible, setModalVilleVisible] = useState(false);
  const [modalOffreVisible, setModalOffreVisible] = useState(false);
  const [modalTypeVisible, setModalTypeVisible] = useState(false);

  const villes = ['Lubumbashi', 'Likasi', 'Kolwezi', 'Kasumbalesa'];
  const offres = ['Vente', 'Location'];
  const types = ['Maison', 'Appartement', 'Parcelle', 'Bureau', 'Entrepôt', 'Ferme'];

  useEffect(() => {
    const updateColumns = () => {
      setNumColumns(width >= 768 ? 3 : 2);
    };
    updateColumns();
    const subscription = Dimensions.addEventListener('change', updateColumns);
    return () => subscription.remove();
  }, []);

  // Favoris
  const loadFavorites = async () => {
    try {
      const favs = await AsyncStorage.getItem(FAVORITES_KEY);
      if (favs) setFavorites(JSON.parse(favs));
    } catch (error) {}
  };

  const saveFavorites = async (newFavs: number[]) => {
    try {
      await AsyncStorage.setItem(FAVORITES_KEY, JSON.stringify(newFavs));
      setFavorites(newFavs);
    } catch (error) {}
  };

  // Appel API paginée
  const fetchPage = async (pageNum: number): Promise<{ biens: Bien[]; hasMore: boolean; total: number }> => {
    const response = await fetch(`${API_URL}?page=${pageNum}&limit=${ITEMS_PER_PAGE}`);
    const json = await response.json();
    if (json.success && json.biens) {
      const biens = json.biens.map((b: any) => ({
        ...b,
        images: Array.isArray(b.images) && b.images.length ? b.images : ['https://placehold.co/600x400?text=SHOPNET+IMMO'],
      }));
      return { biens, hasMore: json.hasMore, total: json.total };
    }
    throw new Error('Erreur API');
  };

  const loadInitialData = async () => {
    try {
      const cached = await AsyncStorage.getItem(CACHE_KEY);
      if (cached) {
        const { data, page: cachedPage, hasMore: cachedHasMore, total: cachedTotal, timestamp } = JSON.parse(cached);
        if (Date.now() - timestamp < CACHE_TTL) {
          setAllProperties(data);
          setPage(cachedPage);
          setHasMore(cachedHasMore);
          setTotalCount(cachedTotal);
          applyFilters(data);
          setLoading(false);
          return;
        }
      }
      await loadMorePages(1, true);
    } catch (error) {
      console.error(error);
      setLoading(false);
    }
  };

  const loadMorePages = async (nextPage: number, reset = false) => {
    if (reset) {
      setPage(1);
      setAllProperties([]);
      setHasMore(true);
      setLoading(true);
    } else {
      if (!hasMore || loadingMore) return;
      setLoadingMore(true);
    }

    try {
      const { biens, hasMore: newHasMore, total } = await fetchPage(nextPage);
      let updatedProperties = reset ? biens : [...allProperties, ...biens];
      updatedProperties = updatedProperties.filter((item, index, self) => self.findIndex(i => i.id === item.id) === index);
      setAllProperties(updatedProperties);
      setPage(nextPage);
      setHasMore(newHasMore);
      setTotalCount(total);
      applyFilters(updatedProperties);

      await AsyncStorage.setItem(
        CACHE_KEY,
        JSON.stringify({
          data: updatedProperties,
          page: nextPage,
          hasMore: newHasMore,
          total,
          timestamp: Date.now(),
        })
      );
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
      setLoadingMore(false);
      setRefreshing(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await AsyncStorage.removeItem(CACHE_KEY);
    await loadMorePages(1, true);
  };

  const loadMore = () => {
    if (!loadingMore && hasMore && !loading) {
      loadMorePages(page + 1, false);
    }
  };

  const applyFilters = (properties: Bien[]) => {
    let filtered = [...properties];
    if (selectedVille) {
      filtered = filtered.filter(p => p.ville?.toLowerCase() === selectedVille.toLowerCase());
    }
    if (selectedOffre) {
      filtered = filtered.filter(p => p.type_offre?.toLowerCase() === selectedOffre.toLowerCase());
    }
    if (selectedType) {
      filtered = filtered.filter(p => p.type_bien?.toLowerCase() === selectedType.toLowerCase());
    }
    setFilteredProperties(filtered);
  };

  useEffect(() => {
    loadFavorites();
    loadInitialData();
  }, []);

  useEffect(() => {
    applyFilters(allProperties);
  }, [selectedVille, selectedOffre, selectedType, allProperties]);

  const toggleFavorite = (id: number) => {
    const newFavs = favorites.includes(id) ? favorites.filter(f => f !== id) : [...favorites, id];
    saveFavorites(newFavs);
  };

  const navigateToDetail = (bien: Bien) => {
    router.push({ pathname: './ImmobilierDetail', params: { id: bien.id.toString() } });
  };

  const renderCard = ({ item }: { item: Bien }) => {
    const isFavorite = favorites.includes(item.id);
    const priceFormatted = new Intl.NumberFormat().format(item.prix);
    const lieu = [item.ville, item.quartier].filter(Boolean).join(', ') || 'RDC';
    const imageUrl = item.images[0];
    return (
      <TouchableOpacity style={styles.card} onPress={() => navigateToDetail(item)} activeOpacity={0.8}>
        <View style={styles.imageContainer}>
          <Image source={{ uri: imageUrl }} style={styles.cardImage} />
          <TouchableOpacity style={styles.favoriteButton} onPress={(e) => { e.stopPropagation(); toggleFavorite(item.id); }}>
            <Ionicons name={isFavorite ? 'heart' : 'heart-outline'} size={20} color={isFavorite ? '#ef4444' : '#cbd5e1'} />
          </TouchableOpacity>
        </View>
        <View style={styles.cardContent}>
          <Text style={styles.cardTitle} numberOfLines={1}>{item.titre}</Text>
          <Text style={styles.cardPrice}>{priceFormatted} {item.devise}</Text>
          <View style={styles.locationRow}>
            <Ionicons name="location-outline" size={12} color="#64748b" />
            <Text style={styles.locationText}>{lieu}</Text>
          </View>
          <View style={styles.cardMeta}>
            <Text style={styles.metaText}>{item.type_bien || 'Bien'}</Text>
            <Text style={[styles.metaText, styles.offerTag]}>{item.type_offre === 'Vente' ? 'Vente' : 'Location'}</Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const FilterModal = ({ visible, title, options, selectedValue, onSelect, onClose }: any) => (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={onClose}>
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>{title}</Text>
            <TouchableOpacity onPress={onClose}><Ionicons name="close" size={24} color="#104ccf" /></TouchableOpacity>
          </View>
          <ScrollView>
            {options.map((opt: string) => (
              <TouchableOpacity
                key={opt}
                style={[styles.modalOption, selectedValue === opt && styles.modalOptionSelected]}
                onPress={() => { onSelect(opt); onClose(); }}
              >
                <Text style={[styles.modalOptionText, selectedValue === opt && styles.modalOptionTextSelected]}>{opt}</Text>
                {selectedValue === opt && <Ionicons name="checkmark" size={20} color="#104ccf" />}
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      </TouchableOpacity>
    </Modal>
  );

  // ========== EN-TÊTE PRINCIPAL FIXE ==========
  const MainHeader = () => (
    <View style={styles.mainHeader}>
      <View style={styles.headerLeft}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#0f172a" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Immobilier</Text>
      </View>
      <View style={styles.headerRight}>
        <TouchableOpacity
          style={styles.headerIcon}
          onPress={() => router.push('/(tabs)/Auth/Produits/PublierImmobilier')}
        >
          <Ionicons name="add" size={23} color="#104ccf" />
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.headerIcon}
          onPress={() => router.push('/(tabs)/Auth/Produits/MyBiensScreen')}
        >
          <Ionicons name="person-outline" size={23} color="#104ccf" />
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.headerIcon}
          onPress={() => router.push('/(tabs)/Auth/Produits/parametre')}
        >
          <Ionicons name="settings-outline" size={23} color="#104ccf" />
        </TouchableOpacity>
      </View>
    </View>
  );

  // ========== FILTRES FIXES (STICKY) ==========
  const StickyFilters = () => (
    <View style={styles.stickyFilters}>
      <View style={styles.filtersRow}>
        <TouchableOpacity style={styles.filterButton} onPress={() => setModalVilleVisible(true)}>
          <Ionicons name="location-outline" size={18} color="#104ccf" />
          <Text style={styles.filterButtonText}>{selectedVille || 'Ville'}</Text>
          <Ionicons name="chevron-down" size={16} color="#104ccf" />
        </TouchableOpacity>
        <TouchableOpacity style={styles.filterButton} onPress={() => setModalOffreVisible(true)}>
          <Ionicons name="swap-horizontal-outline" size={18} color="#104ccf" />
          <Text style={styles.filterButtonText}>{selectedOffre || 'Offre'}</Text>
          <Ionicons name="chevron-down" size={16} color="#104ccf" />
        </TouchableOpacity>
        <TouchableOpacity style={styles.filterButton} onPress={() => setModalTypeVisible(true)}>
          <Ionicons name="pricetag-outline" size={18} color="#104ccf" />
          <Text style={styles.filterButtonText}>{selectedType || 'Type'}</Text>
          <Ionicons name="chevron-down" size={16} color="#104ccf" />
        </TouchableOpacity>
      </View>
    </View>
  );

  // ========== CONTENU DU FLATLIST (PARTIE DÉFILANTE) ==========
  const renderListHeader = () => (
    <>
      <View style={styles.heroSection}>
        <Text style={styles.heroTitle}>Trouvez le bien qui vous correspond 💖</Text>
        <Text style={styles.heroSubtitle}>Appartements, villas et espaces professionnels sélectionnés pour vous.</Text>
      </View>
      <Text style={styles.sectionTitle}>✨ Coups de cœur</Text>
    </>
  );

  const featuredProperties = filteredProperties.slice(0, 3);
  const restProperties = filteredProperties.slice(3);

  const renderFooter = () => {
    if (!loadingMore) return null;
    return (
      <View style={styles.footerLoader}>
        <ActivityIndicator size="small" color="#104ccf" />
        <Text style={styles.footerText}>Chargement...</Text>
      </View>
    );
  };

  if (loading && allProperties.length === 0) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#104ccf" />
        <Text style={styles.loadingText}>Chargement des biens...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* EN-TÊTE PRINCIPAL FIXE */}
      <MainHeader />
      {/* FILTRES FIXES (STICKY) */}
      <StickyFilters />

      {/* FLATLIST POUR LE CONTENU DÉFILANT */}
      <FlatList
        data={restProperties}
        keyExtractor={(item) => item.id.toString()}
        renderItem={renderCard}
        numColumns={numColumns}
        key={numColumns}
        columnWrapperStyle={numColumns > 1 ? styles.columnWrapper : undefined}
        ListHeaderComponent={
          <>
            {renderListHeader()}
            {featuredProperties.length > 0 && (
              <FlatList
                data={featuredProperties}
                keyExtractor={(item) => `featured-${item.id}`}
                renderItem={renderCard}
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.horizontalList}
              />
            )}
            {restProperties.length > 0 && <Text style={styles.sectionTitle}>🏠 Toutes nos annonces</Text>}
          </>
        }
        ListFooterComponent={renderFooter}
        ListEmptyComponent={
          !loading && (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>Aucun bien trouvé</Text>
            </View>
          )
        }
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#104ccf']} />}
        onEndReached={loadMore}
        onEndReachedThreshold={0.3}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
      />

      {/* MODAUX (inchangés) */}
      <FilterModal
        visible={modalVilleVisible}
        title="Sélectionnez une ville"
        options={villes}
        selectedValue={selectedVille}
        onSelect={setSelectedVille}
        onClose={() => setModalVilleVisible(false)}
      />
      <FilterModal
        visible={modalOffreVisible}
        title="Sélectionnez une offre"
        options={offres}
        selectedValue={selectedOffre}
        onSelect={setSelectedOffre}
        onClose={() => setModalOffreVisible(false)}
      />
      <FilterModal
        visible={modalTypeVisible}
        title="Sélectionnez un type de bien"
        options={types}
        selectedValue={selectedType}
        onSelect={setSelectedType}
        onClose={() => setModalTypeVisible(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#ffffff' },
  centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#ffffff' },
  loadingText: { marginTop: 12, fontSize: 14, color: '#64748b' },

  // En-tête principal fixe
  mainHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#eef2f6',
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  backButton: { padding: 4 },
  headerTitle: { fontSize: 20, fontWeight: '700', color: '#0f172a' },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  headerIcon: { padding: 4 },

  // Filtres fixes (sticky)
  stickyFilters: {
    backgroundColor: '#ffffff',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#eef2f6',
  },
  filtersRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 10 },
  filterButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 8,
    gap: 6,
  },
  filterButtonText: { fontSize: 13, fontWeight: '500', color: '#1e293b' },

  // Contenu défilant (dans FlatList)
  heroSection: { paddingHorizontal: 16, marginBottom: 20, marginTop: 8 },
  heroTitle: { fontSize: 20, fontWeight: '700', color: '#0f172a', marginBottom: 6 },
  heroSubtitle: { fontSize: 13, color: '#475569', lineHeight: 18 },
  sectionTitle: { fontSize: 18, fontWeight: '700', color: '#0f172a', marginHorizontal: 16, marginBottom: 12, marginTop: 8 },
  horizontalList: { paddingHorizontal: 12, gap: 12 },
  listContent: { paddingBottom: 20 },
  columnWrapper: { justifyContent: 'space-between', paddingHorizontal: 16, gap: 12 },
  card: { flex: 1, backgroundColor: '#ffffff', borderRadius: 18, borderWidth: 1, borderColor: '#eef2f6', overflow: 'hidden', marginBottom: 12 },
  imageContainer: { position: 'relative' },
  cardImage: { width: '100%', height: 150, resizeMode: 'cover', backgroundColor: '#f1f5f9' },
  favoriteButton: { position: 'absolute', top: 8, right: 8, backgroundColor: 'rgba(255,255,255,0.9)', borderRadius: 20, width: 32, height: 32, justifyContent: 'center', alignItems: 'center' },
  cardContent: { padding: 10 },
  cardTitle: { fontSize: 15, fontWeight: '600', color: '#0f172a', marginBottom: 4 },
  cardPrice: { fontSize: 16, fontWeight: '700', color: '#104ccf', marginBottom: 4 },
  locationRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 6 },
  locationText: { fontSize: 11, color: '#64748b', flex: 1 },
  cardMeta: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#f8fafc', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 20 },
  metaText: { fontSize: 11, fontWeight: '500', color: '#334155' },
  offerTag: { color: '#104ccf', fontWeight: '600' },
  emptyContainer: { padding: 40, alignItems: 'center' },
  emptyText: { fontSize: 14, color: '#94a3b8' },
  footerLoader: { paddingVertical: 20, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8 },
  footerText: { fontSize: 14, color: '#104ccf' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  modalContainer: { width: width * 0.8, backgroundColor: '#ffffff', borderRadius: 16, overflow: 'hidden', maxHeight: 400 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: '#eef2f6' },
  modalTitle: { fontSize: 18, fontWeight: '600', color: '#0f172a' },
  modalOption: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 14, borderBottomWidth: 1, borderBottomColor: '#eef2f6' },
  modalOptionSelected: { backgroundColor: '#f0f7ff' },
  modalOptionText: { fontSize: 16, color: '#1e293b' },
  modalOptionTextSelected: { color: '#104ccf', fontWeight: '500' },
});


