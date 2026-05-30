
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
import { useTheme } from "../../../../app/theme/ThemeContext";

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

// Hook pour les couleurs dynamiques
const useDynamicColors = () => {
  const { isDark } = useTheme();

  return {
    background: isDark ? '#0D0D0D' : '#FFFFFF',
    surface: isDark ? '#1A1A1A' : '#FFFFFF',
    text: isDark ? '#F5F5F5' : '#0F172A',
    textSecondary: isDark ? '#B0B0B0' : '#64748B',
    textTertiary: isDark ? '#A0AEC0' : '#475569',
    primary: '#b1c5f1',
    primaryLight: '#b1c5f1',
    border: isDark ? '#2E2E2E' : '#EEF2F6',
    borderLight: isDark ? '#2E2E2E' : '#E2E8F0',
    cardBg: isDark ? '#1A1A1A' : '#FFFFFF',
    inputBg: isDark ? '#222222' : '#F8FAFC',
    heroBg: isDark ? '#1A1A1A' : '#FFFFFF',
    metaBg: isDark ? '#222222' : '#F8FAFC',
    metaText: isDark ? '#B0B0B0' : '#334155',
    offerTag: '#b1c5f1',
    statusBar: isDark ? '#0D0D0D' : '#FFFFFF',
    barStyle: isDark ? 'light-content' as const : 'dark-content' as const,
    headerBg: isDark ? '#1A1A1A' : '#FFFFFF',
    headerBorder: isDark ? '#2E2E2E' : '#EEF2F6',
    headerIcon: '#b1c5f1',
    headerText: isDark ? '#F5F5F5' : '#0F172A',
    filterBg: isDark ? '#1A1A1A' : '#FFFFFF',
    filterButtonBg: isDark ? '#222222' : '#F8FAFC',
    filterButtonBorder: isDark ? '#2E2E2E' : '#E2E8F0',
    filterButtonText: isDark ? '#B0B0B0' : '#1E293B',
    modalBg: isDark ? '#1A1A1A' : '#FFFFFF',
    modalOverlay: 'rgba(0,0,0,0.5)',
    modalBorder: isDark ? '#2E2E2E' : '#EEF2F6',
    modalOptionBg: isDark ? '#1A1A1A' : '#FFFFFF',
    modalOptionSelectedBg: isDark ? '#1A2A3A' : '#F0F7FF',
    emptyText: isDark ? '#B0B0B0' : '#94A3B8',
    footerText: '#104CCF',
    loadingText: isDark ? '#B0B0B0' : '#64748B',
    favoriteBg: 'rgba(255,255,255,0.9)',
    favActive: '#EF4444',
    favInactive: '#CBD5E1',
    locationIcon: '#64748B',
  };
};

export default function Immobilier() {
  const router = useRouter();
  const COLORS = useDynamicColors();
  const { isDark } = useTheme();

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
      <TouchableOpacity
        style={[styles.card, { backgroundColor: COLORS.cardBg, borderColor: COLORS.border }]}
        onPress={() => navigateToDetail(item)}
        activeOpacity={0.8}
      >
        <View style={styles.imageContainer}>
          <Image source={{ uri: imageUrl }} style={styles.cardImage} />
          <TouchableOpacity
            style={[styles.favoriteButton, { backgroundColor: COLORS.favoriteBg }]}
            onPress={(e) => { e.stopPropagation(); toggleFavorite(item.id); }}
          >
            <Ionicons
              name={isFavorite ? 'heart' : 'heart-outline'}
              size={20}
              color={isFavorite ? COLORS.favActive : COLORS.favInactive}
            />
          </TouchableOpacity>
        </View>
        <View style={styles.cardContent}>
          <Text style={[styles.cardTitle, { color: COLORS.text }]} numberOfLines={1}>{item.titre}</Text>
          <Text style={[styles.cardPrice, { color: COLORS.primary }]}>{priceFormatted} {item.devise}</Text>
          <View style={styles.locationRow}>
            <Ionicons name="location-outline" size={12} color={COLORS.locationIcon} />
            <Text style={[styles.locationText, { color: COLORS.textSecondary }]}>{lieu}</Text>
          </View>
          <View style={[styles.cardMeta, { backgroundColor: COLORS.metaBg }]}>
            <Text style={[styles.metaText, { color: COLORS.metaText }]}>{item.type_bien || 'Bien'}</Text>
            <Text style={[styles.metaText, styles.offerTag, { color: COLORS.offerTag }]}>
              {item.type_offre === 'Vente' ? 'Vente' : 'Location'}
            </Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const FilterModal = ({ visible, title, options, selectedValue, onSelect, onClose }: any) => (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <TouchableOpacity style={[styles.modalOverlay, { backgroundColor: COLORS.modalOverlay }]} activeOpacity={1} onPress={onClose}>
        <View style={[styles.modalContainer, { backgroundColor: COLORS.modalBg }]}>
          <View style={[styles.modalHeader, { borderBottomColor: COLORS.modalBorder }]}>
            <Text style={[styles.modalTitle, { color: COLORS.text }]}>{title}</Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={24} color={COLORS.primary} />
            </TouchableOpacity>
          </View>
          <ScrollView>
            {options.map((opt: string) => (
              <TouchableOpacity
                key={opt}
                style={[
                  styles.modalOption,
                  { backgroundColor: COLORS.modalOptionBg, borderBottomColor: COLORS.modalBorder },
                  selectedValue === opt && { backgroundColor: COLORS.modalOptionSelectedBg }
                ]}
                onPress={() => { onSelect(opt); onClose(); }}
              >
                <Text style={[
                  styles.modalOptionText,
                  { color: COLORS.filterButtonText },
                  selectedValue === opt && styles.modalOptionTextSelected
                ]}>
                  {opt}
                </Text>
                {selectedValue === opt && <Ionicons name="checkmark" size={20} color={COLORS.primary} />}
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      </TouchableOpacity>
    </Modal>
  );

  // ========== EN-TÊTE PRINCIPAL FIXE ==========
  const MainHeader = () => (
    <View style={[styles.mainHeader, { backgroundColor: COLORS.headerBg, borderBottomColor: COLORS.headerBorder }]}>
      <View style={styles.headerLeft}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={COLORS.headerText} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: COLORS.headerText }]}>Immobilier</Text>
      </View>
      <View style={styles.headerRight}>
        <TouchableOpacity
          style={styles.headerIcon}
          onPress={() => router.push('/(tabs)/Auth/Produits/PublierImmobilier')}
        >
          <Ionicons name="add" size={23} color={COLORS.headerIcon} />
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.headerIcon}
          onPress={() => router.push('/(tabs)/Auth/Produits/MyBiensScreen')}
        >
          <Ionicons name="person-outline" size={23} color={COLORS.headerIcon} />
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.headerIcon}
          onPress={() => router.push('/(tabs)/Auth/Produits/parametre')}
        >
          <Ionicons name="settings-outline" size={23} color={COLORS.headerIcon} />
        </TouchableOpacity>
      </View>
    </View>
  );

  // ========== FILTRES FIXES (STICKY) ==========
  const StickyFilters = () => (
    <View style={[styles.stickyFilters, { backgroundColor: COLORS.filterBg, borderBottomColor: COLORS.headerBorder }]}>
      <View style={styles.filtersRow}>
        <TouchableOpacity
          style={[styles.filterButton, { backgroundColor: COLORS.filterButtonBg, borderColor: COLORS.filterButtonBorder }]}
          onPress={() => setModalVilleVisible(true)}
        >
          <Ionicons name="location-outline" size={18} color={COLORS.primary} />
          <Text style={[styles.filterButtonText, { color: COLORS.filterButtonText }]}>
            {selectedVille || 'Ville'}
          </Text>
          <Ionicons name="chevron-down" size={16} color={COLORS.primary} />
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.filterButton, { backgroundColor: COLORS.filterButtonBg, borderColor: COLORS.filterButtonBorder }]}
          onPress={() => setModalOffreVisible(true)}
        >
          <Ionicons name="swap-horizontal-outline" size={18} color={COLORS.primary} />
          <Text style={[styles.filterButtonText, { color: COLORS.filterButtonText }]}>
            {selectedOffre || 'Offre'}
          </Text>
          <Ionicons name="chevron-down" size={16} color={COLORS.primary} />
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.filterButton, { backgroundColor: COLORS.filterButtonBg, borderColor: COLORS.filterButtonBorder }]}
          onPress={() => setModalTypeVisible(true)}
        >
          <Ionicons name="pricetag-outline" size={18} color={COLORS.primary} />
          <Text style={[styles.filterButtonText, { color: COLORS.filterButtonText }]}>
            {selectedType || 'Type'}
          </Text>
          <Ionicons name="chevron-down" size={16} color={COLORS.primary} />
        </TouchableOpacity>
      </View>
    </View>
  );

  // ========== CONTENU DU FLATLIST (PARTIE DÉFILANTE) ==========
  const renderListHeader = () => (
    <>
      <View style={[styles.heroSection, { backgroundColor: COLORS.heroBg }]}>
        <Text style={[styles.heroTitle, { color: COLORS.text }]}>Trouvez le bien qui vous correspond 💖</Text>
        <Text style={[styles.heroSubtitle, { color: COLORS.textTertiary }]}>
          Appartements, villas et espaces professionnels sélectionnés pour vous.
        </Text>
      </View>
      <Text style={[styles.sectionTitle, { color: COLORS.text }]}>✨ Coups de cœur</Text>
    </>
  );

  const featuredProperties = filteredProperties.slice(0, 3);
  const restProperties = filteredProperties.slice(3);

  const renderFooter = () => {
    if (!loadingMore) return null;
    return (
      <View style={styles.footerLoader}>
        <ActivityIndicator size="small" color={COLORS.primary} />
        <Text style={[styles.footerText, { color: COLORS.footerText }]}>Chargement...</Text>
      </View>
    );
  };

  if (loading && allProperties.length === 0) {
    return (
      <View style={[styles.centerContainer, { backgroundColor: COLORS.background }]}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={[styles.loadingText, { color: COLORS.loadingText }]}>Chargement des biens...</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: COLORS.background }]}>
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
            {restProperties.length > 0 && (
              <Text style={[styles.sectionTitle, { color: COLORS.text }]}>🏠 Toutes nos annonces</Text>
            )}
          </>
        }
        ListFooterComponent={renderFooter}
        ListEmptyComponent={
          !loading && (
            <View style={styles.emptyContainer}>
              <Text style={[styles.emptyText, { color: COLORS.emptyText }]}>Aucun bien trouvé</Text>
            </View>
          )
        }
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[COLORS.primary]}
            tintColor={COLORS.primary}
          />
        }
        onEndReached={loadMore}
        onEndReachedThreshold={0.3}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
      />

      {/* MODAUX */}
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
  container: { flex: 1 },
  centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: 12, fontSize: 14 },

  // En-tête principal fixe
  mainHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  backButton: { padding: 4 },
  headerTitle: { fontSize: 20, fontWeight: '700' },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  headerIcon: { padding: 4 },

  // Filtres fixes (sticky)
  stickyFilters: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderBottomWidth: 1,
  },
  filtersRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 10 },
  filterButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 8,
    gap: 6,
  },
  filterButtonText: { fontSize: 13, fontWeight: '500' },

  // Contenu défilant (dans FlatList)
  heroSection: { paddingHorizontal: 16, marginBottom: 20, marginTop: 8 },
  heroTitle: { fontSize: 20, fontWeight: '700', marginBottom: 6 },
  heroSubtitle: { fontSize: 13, lineHeight: 18 },
  sectionTitle: { fontSize: 18, fontWeight: '700', marginHorizontal: 16, marginBottom: 12, marginTop: 8 },
  horizontalList: { paddingHorizontal: 12, gap: 12 },
  listContent: { paddingBottom: 20 },
  columnWrapper: { justifyContent: 'space-between', paddingHorizontal: 16, gap: 12 },
  card: { flex: 1, borderRadius: 18, borderWidth: 1, overflow: 'hidden', marginBottom: 12 },
  imageContainer: { position: 'relative' },
  cardImage: { width: '100%', height: 150, resizeMode: 'cover', backgroundColor: '#F1F5F9' },
  favoriteButton: { position: 'absolute', top: 8, right: 8, borderRadius: 20, width: 32, height: 32, justifyContent: 'center', alignItems: 'center' },
  cardContent: { padding: 10 },
  cardTitle: { fontSize: 15, fontWeight: '600', marginBottom: 4 },
  cardPrice: { fontSize: 16, fontWeight: '700', marginBottom: 4 },
  locationRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 6 },
  locationText: { fontSize: 11, flex: 1 },
  cardMeta: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 20 },
  metaText: { fontSize: 11, fontWeight: '500' },
  offerTag: { fontWeight: '600' },
  emptyContainer: { padding: 40, alignItems: 'center' },
  emptyText: { fontSize: 14 },
  footerLoader: { paddingVertical: 20, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8 },
  footerText: { fontSize: 14 },
  modalOverlay: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  modalContainer: { width: width * 0.8, borderRadius: 16, overflow: 'hidden', maxHeight: 400 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 1 },
  modalTitle: { fontSize: 18, fontWeight: '600' },
  modalOption: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 14, borderBottomWidth: 1 },
  modalOptionSelected: {},
  modalOptionText: { fontSize: 16 },
  modalOptionTextSelected: { fontWeight: '500' },
});


