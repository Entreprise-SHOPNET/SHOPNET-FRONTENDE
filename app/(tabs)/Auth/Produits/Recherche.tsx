


import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  View,
  Text,
  TextInput,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  Image,
  RefreshControl,
  Dimensions,
  Keyboard,
  Animated,
  ScrollView,
  Modal,
  SafeAreaView,
  StatusBar,
  Platform,
  Alert,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { 
  FontAwesome, 
  Ionicons, 
  MaterialIcons, 
  Feather, 
  Entypo,
  MaterialCommunityIcons 
} from "@expo/vector-icons";
import { useRouter } from "expo-router";
import axios from "axios";
import { BlurView } from "expo-blur";
import * as Haptics from "expo-haptics";

const { width, height } = Dimensions.get("window");

// Configuration API
// const API_BASE_URL = "http://100.64.134.89:5000/api"; // Serveur LOCAL (commenté)
const API_BASE_URL = "https://shopnet-backend.onrender.com/api"; // Serveur Render (production)


// Couleurs professionnelles
const PRIMARY_COLOR = "#00182A";
const SECONDARY_COLOR = "#42A5F5";
const SUCCESS_COLOR = "#4CAF50";
const ERROR_COLOR = "#FF3B30";
const WARNING_COLOR = "#FFA726";
const TEXT_PRIMARY = "#FFFFFF";
const TEXT_SECONDARY = "#A0AEC0";
const CARD_BACKGROUND = "rgba(30, 42, 59, 0.9)";
const BORDER_COLOR = "rgba(66, 165, 245, 0.1)";

// Types de données
type Product = {
  id: number;
  title: string;
  description: string;
  category: string;
  price: number;
  original_price?: number;
  condition: string;
  stock: number;
  location: string;
  created_at: string;
  views_count?: number;
  likes_count?: number;
  shares_count?: number;
  seller_name: string;
  seller_rating: number;
  seller_avatar?: string;
  images: string[] | string;
  relevance_score?: number;
  distance?: number;
  delivery_available?: boolean;
  pickup_available?: boolean;
  views?: number;
  likes?: number;
  shares?: number;
  popularity_score?: number;
};

type SearchResult = {
  success: boolean;
  data: {
    query: string;
    analysis: any;
    total: number;
    page: number;
    total_pages: number;
    results: Product[];
    suggestions: string[];
    related_searches: string[];
    filters: {
      category?: string;
      price_range: string;
      location?: string;
      condition?: string;
    };
  };
};

type SearchSuggestion = {
  type: 'product' | 'category' | 'history' | 'popular';
  id?: string;
  title: string;
  subtitle?: string;
  image?: string;
  count?: number;
};

type FilterState = {
  category: string;
  minPrice: string;
  maxPrice: string;
  condition: string;
  location: string;
  sortBy: 'relevance' | 'price_asc' | 'price_desc' | 'date' | 'popularity';
  inStock: boolean;
  deliveryAvailable: boolean;
  pickupAvailable: boolean;
};

export default function RechercheAvancee() {
  const router = useRouter();
  
  // Références
  const scrollY = useRef(new Animated.Value(0)).current;
  const searchInputRef = useRef<TextInput>(null);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const isMountedRef = useRef(true);
  const flatListRef = useRef<FlatList>(null);

  // États de recherche
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isVoiceSearch, setIsVoiceSearch] = useState(false);

  // Données
  const [products, setProducts] = useState<Product[]>([]);
  const [searchHistory, setSearchHistory] = useState<string[]>([]);
  const [searchSuggestions, setSearchSuggestions] = useState<SearchSuggestion[]>([]);
  const [trendingSearches, setTrendingSearches] = useState<{term: string, count: number}[]>([]);
  const [popularCategories, setPopularCategories] = useState<{name: string, count: number}[]>([]);

  // Filtres
  const [filters, setFilters] = useState<FilterState>({
    category: "",
    minPrice: "",
    maxPrice: "",
    condition: "",
    location: "",
    sortBy: 'relevance',
    inStock: true,
    deliveryAvailable: false,
    pickupAvailable: false,
  });

  // UI States
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Modals
  const [showFiltersModal, setShowFiltersModal] = useState(false);
  const [showVoiceModal, setShowVoiceModal] = useState(false);
  const [showAnalytics, setShowAnalytics] = useState(false);

  // ===========================================
  // 🌟 INITIALISATION
  // ===========================================

  useEffect(() => {
    initializeApp();
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const initializeApp = async () => {
    try {
      // Animation d'entrée
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }).start();

      // Chargement des données initiales
      await Promise.all([
        loadSearchHistory(),
        loadUserPreferences(),
        fetchTrendingData(),
      ]);
    } catch (error) {
      console.error('Erreur initialisation:', error);
    }
  };

  // ===========================================
  // 💾 STOCKAGE LOCAL
  // ===========================================

  const loadSearchHistory = async () => {
    try {
      const history = await AsyncStorage.getItem("shopnet_search_history");
      if (history) {
        setSearchHistory(JSON.parse(history).slice(0, 10));
      }
    } catch (error) {
      console.error("Erreur chargement historique:", error);
    }
  };

  const saveSearchHistory = async (query: string) => {
    if (!query.trim()) return;

    try {
      const updatedHistory = [
        query.trim(),
        ...searchHistory.filter(item => 
          item.toLowerCase() !== query.trim().toLowerCase()
        )
      ].slice(0, 10);

      setSearchHistory(updatedHistory);
      await AsyncStorage.setItem(
        "shopnet_search_history",
        JSON.stringify(updatedHistory)
      );
    } catch (error) {
      console.error("Erreur sauvegarde historique:", error);
    }
  };

  const clearSearchHistory = async () => {
    Alert.alert(
      "Effacer l'historique",
      "Êtes-vous sûr de vouloir effacer tout l'historique de recherche ?",
      [
        { text: "Annuler", style: "cancel" },
        {
          text: "Effacer",
          style: "destructive",
          onPress: async () => {
            setSearchHistory([]);
            await AsyncStorage.removeItem("shopnet_search_history");
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
          }
        }
      ]
    );
  };

  const loadUserPreferences = async () => {
    try {
      const prefs = await AsyncStorage.getItem("shopnet_search_preferences");
      if (prefs) {
        setFilters(JSON.parse(prefs));
      }
    } catch (error) {
      console.error("Erreur chargement préférences:", error);
    }
  };

  const saveUserPreferences = async () => {
    try {
      await AsyncStorage.setItem(
        "shopnet_search_preferences",
        JSON.stringify(filters)
      );
    } catch (error) {
      console.error("Erreur sauvegarde préférences:", error);
    }
  };

  // ===========================================
  // 📊 DONNÉES TRENDINGS
  // ===========================================

  const fetchTrendingData = async () => {
    try {
      // Données simulées
      setTrendingSearches([
        { term: "iPhone 15", count: 1250 },
        { term: "Chaussures running", count: 890 },
        { term: "PC Gamer", count: 750 },
        { term: "Parfum homme", count: 620 },
        { term: "Tablette Samsung", count: 580 },
      ]);

      setPopularCategories([
        { name: "Électronique", count: 1250 },
        { name: "Mode", count: 890 },
        { name: "Maison", count: 750 },
        { name: "Sport", count: 620 },
        { name: "Beauté", count: 580 },
        { name: "Auto", count: 450 },
      ]);
    } catch (error) {
      console.error("Erreur chargement tendances:", error);
    }
  };

  // ===========================================
  // 🔍 RECHERCHE PRINCIPALE
  // ===========================================

  const handleSearch = async (query: string, reset = true) => {
    if (!query.trim()) return;

    try {
      if (reset) {
        setIsSearching(true);
        setError(null);
        setPage(1);
        setHasMore(true);
        setProducts([]);
      } else {
        setLoading(true);
      }

      setShowSuggestions(false);

      const currentPage = reset ? 1 : page;

      // Construire les paramètres de recherche
      const params: any = {
        q: query.trim(),
        page: currentPage,
        limit: 5,
        sort_by: filters.sortBy,
      };

      // Ajouter les filtres actifs
      if (filters.category) params.category = filters.category;
      if (filters.minPrice) params.min_price = filters.minPrice;
      if (filters.maxPrice) params.max_price = filters.maxPrice;
      if (filters.condition) params.condition = filters.condition;
      if (filters.location) params.location = filters.location;
      if (filters.inStock) params.in_stock = filters.inStock;
      if (filters.deliveryAvailable) params.delivery_available = filters.deliveryAvailable;
      if (filters.pickupAvailable) params.pickup_available = filters.pickupAvailable;

      console.log('🔍 Recherche avec params:', params);

      // Appel API
      const response = await axios.get<SearchResult>(
        `${API_BASE_URL}/search/search`,
        { params, timeout: 10000 }
      );

      if (response.data.success) {
        const { results, total, page: currentPage, total_pages } = response.data.data;

        // Traitement des images
        const processedResults = results.map(product => ({
          ...product,
          images: processImages(product.images),
          views: product.views || product.views_count || 0,
          likes: product.likes || product.likes_count || 0,
          shares: product.shares || product.shares_count || 0,
        }));

        if (reset) {
          setProducts(processedResults);
        } else {
          setProducts(prev => [...prev, ...processedResults]);
        }

        setHasMore(currentPage < total_pages);
        setPage(currentPage + 1);

        // Sauvegarder dans l'historique
        await saveSearchHistory(query);

        // Feedback haptique
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    } catch (error: any) {
      console.error('❌ Erreur recherche:', error);
      
      let errorMessage = "Erreur lors de la recherche";
      if (error.code === 'ECONNABORTED') {
        errorMessage = "La recherche a pris trop de temps";
      } else if (error.response?.status === 404) {
        errorMessage = "Service de recherche indisponible";
      } else if (error.response?.data?.error) {
        errorMessage = error.response.data.error;
      }
      
      setError(errorMessage);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setIsSearching(false);
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Fonction pour traiter les images
  const processImages = (images: string | string[] | undefined): string[] => {
    if (!images) return ['https://via.placeholder.com/150'];
    
    if (Array.isArray(images)) {
      return images.filter(img => img && img.trim() !== '');
    }
    
    if (typeof images === 'string') {
      return images.split(',').filter(img => img && img.trim() !== '');
    }
    
    return ['https://via.placeholder.com/150'];
  };

  // ===========================================
  // 🔤 AUTOCOMPLÉTION
  // ===========================================

  const fetchAutocompleteSuggestions = async (query: string) => {
    if (query.length < 2) {
      setSearchSuggestions([]);
      return;
    }

    try {
      const response = await axios.get(
        `${API_BASE_URL}/search/autocomplete`,
        { params: { q: query }, timeout: 5000 }
      );

      const suggestions: SearchSuggestion[] = [];

      // Suggestions de l'API
      if (response.data.suggestions) {
        response.data.suggestions.forEach((suggestion: string) => {
          suggestions.push({
            type: 'popular',
            title: suggestion,
          });
        });
      }

      // Produits suggérés
      if (response.data.products) {
        response.data.products.forEach((product: any) => {
          suggestions.push({
            type: 'product',
            id: product.id.toString(),
            title: product.title,
            subtitle: `${formatPrice(product.price)} • ${product.category}`,
            image: product.thumbnail,
          });
        });
      }

      // Catégories suggérées
      if (response.data.categories) {
        response.data.categories.forEach((category: any) => {
          suggestions.push({
            type: 'category',
            id: category.name,
            title: category.name,
            subtitle: `${category.product_count || category.count} produits`,
          });
        });
      }

      // Historique correspondant
      const matchingHistory = searchHistory.filter(term =>
        term.toLowerCase().includes(query.toLowerCase())
      );
      
      matchingHistory.forEach(term => {
        suggestions.push({
          type: 'history',
          title: term,
        });
      });

      setSearchSuggestions(suggestions.slice(0, 10));
      setShowSuggestions(true);
    } catch (error) {
      console.error('Erreur autocomplete:', error);
      // Suggestions locales en fallback
      setSearchSuggestions([
        {
          type: 'popular',
          title: `${query} pas cher`,
        },
        {
          type: 'popular',
          title: `${query} occasion`,
        },
        {
          type: 'popular',
          title: `meilleur ${query}`,
        },
      ]);
    }
  };

  // ===========================================
  // 🎤 RECHERCHE VOCALE
  // ===========================================

  const startVoiceSearch = () => {
    setShowVoiceModal(true);
    setIsVoiceSearch(true);
    
    // Simulation de reconnaissance vocale
    setTimeout(() => {
      const simulatedQuery = "téléphone samsung neuf";
      setSearchQuery(simulatedQuery);
      handleSearch(simulatedQuery, true);
      setShowVoiceModal(false);
      setIsVoiceSearch(false);
    }, 2000);
  };

  // ===========================================
  // 🎯 NAVIGATION SÉCURISÉE - CORRIGÉE
  // ===========================================

  const navigateToProduct = (product: Product) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    
    if (isMountedRef.current && product && product.id) {
      try {
        // CORRECTION : Navigation correcte vers la page de détail avec l'ID
        router.push({
          pathname: "/Auth/Panier/DetailId",
          params: { id: product.id.toString() }
        });
      } catch (error) {
        console.error("Erreur de navigation:", error);
        Alert.alert(
          "Erreur de navigation",
          "Impossible d'afficher les détails du produit. Veuillez réessayer."
        );
      }
    }
  };

  const navigateToCategory = (category: string) => {
    setFilters(prev => ({ ...prev, category }));
    setSearchQuery(category);
    handleSearch(category, true);
  };

  // ===========================================
  // 🎨 FONCTIONS DE FORMATAGE SÉCURISÉES - CORRIGÉES
  // ===========================================

  const formatPrice = (price: any): string => {
    if (price === undefined || price === null) {
      return "0.00";
    }
    
    const priceNumber = typeof price === 'number' ? price : parseFloat(price);
    
    if (isNaN(priceNumber)) {
      return "0.00";
    }
    
    // CORRECTION : Utiliser le symbole $ au lieu de €
    return `$${priceNumber.toFixed(2)}`;
  };

  const formatRating = (rating: any): string => {
    if (rating === undefined || rating === null) {
      return "0.0";
    }
    
    const ratingNumber = typeof rating === 'number' ? rating : parseFloat(rating);
    
    if (isNaN(ratingNumber)) {
      return "0.0";
    }
    
    return ratingNumber.toFixed(1);
  };

  const formatStock = (stock: any): number => {
    if (stock === undefined || stock === null) {
      return 0;
    }
    
    const stockNumber = typeof stock === 'number' ? stock : parseInt(stock, 10);
    
    if (isNaN(stockNumber)) {
      return 0;
    }
    
    return stockNumber;
  };

  // ===========================================
  // 🔄 INFINITE SCROLL
  // ===========================================

  const handleLoadMore = () => {
    if (!loading && hasMore && searchQuery.length > 0) {
      handleSearch(searchQuery, false);
    }
  };

  // ===========================================
  // 🎨 COMPOSANTS DE RENDU
  // ===========================================

  // Header animé
  const headerHeight = scrollY.interpolate({
    inputRange: [0, 100],
    outputRange: [180, 100],
    extrapolate: "clamp",
  });

  const renderHeader = () => (
    <Animated.View style={[styles.header, { height: headerHeight }]}>
      <View style={styles.headerContent}>
        <View style={styles.headerTop}>
          <Text style={styles.headerTitle}>Recherche Shopnet</Text>
          <TouchableOpacity
            style={styles.analyticsButton}
            onPress={() => setShowAnalytics(true)}
          >
            <Ionicons name="stats-chart" size={22} color={SECONDARY_COLOR} />
          </TouchableOpacity>
        </View>

        {/* Barre de recherche */}
        <View style={styles.searchContainer}>
          <View style={styles.searchInputWrapper}>
            <Ionicons name="search" size={22} color={SECONDARY_COLOR} style={styles.searchIcon} />
            <TextInput
              ref={searchInputRef}
              style={styles.searchInput}
              placeholder="Rechercher des produits..."
              placeholderTextColor={TEXT_SECONDARY}
              value={searchQuery}
              onChangeText={(text) => {
                setSearchQuery(text);
                if (text.length >= 2) {
                  fetchAutocompleteSuggestions(text);
                } else {
                  setShowSuggestions(false);
                }
              }}
              autoCorrect={false}
              autoCapitalize="none"
              returnKeyType="search"
              onSubmitEditing={() => handleSearch(searchQuery, true)}
              onFocus={() => setShowSuggestions(true)}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity
                onPress={() => {
                  setSearchQuery("");
                  setProducts([]);
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                }}
                style={styles.clearButton}
              >
                <Ionicons name="close-circle" size={22} color={ERROR_COLOR} />
              </TouchableOpacity>
            )}
            <TouchableOpacity
              onPress={startVoiceSearch}
              style={styles.voiceButton}
              disabled={isVoiceSearch}
            >
              {isVoiceSearch ? (
                <ActivityIndicator size="small" color={SECONDARY_COLOR} />
              ) : (
                <Ionicons name="mic" size={22} color={SECONDARY_COLOR} />
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Animated.View>
  );

  // Suggestions
  const renderSuggestions = () => {
    if (!showSuggestions || searchSuggestions.length === 0) return null;

    return (
      <View style={styles.suggestionsContainer}>
        <FlatList
          data={searchSuggestions}
          keyExtractor={(item, index) => `${item.type}-${index}`}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.suggestionItem}
              onPress={() => {
                setSearchQuery(item.title);
                handleSearch(item.title, true);
              }}
              activeOpacity={0.7}
            >
              <View style={styles.suggestionIcon}>
                {item.type === 'history' && <Ionicons name="time" size={18} color={TEXT_SECONDARY} />}
                {item.type === 'product' && <Ionicons name="cube" size={18} color={SECONDARY_COLOR} />}
                {item.type === 'category' && <MaterialIcons name="category" size={18} color={SUCCESS_COLOR} />}
                {item.type === 'popular' && <Ionicons name="trending-up" size={18} color={WARNING_COLOR} />}
              </View>
              <View style={styles.suggestionContent}>
                <Text style={styles.suggestionTitle} numberOfLines={1}>
                  {item.title}
                </Text>
                {item.subtitle && (
                  <Text style={styles.suggestionSubtitle} numberOfLines={1}>
                    {item.subtitle}
                  </Text>
                )}
              </View>
            </TouchableOpacity>
          )}
          ListHeaderComponent={
            <View style={styles.suggestionsHeader}>
              <Text style={styles.suggestionsTitle}>Suggestions</Text>
              {searchHistory.length > 0 && (
                <TouchableOpacity onPress={clearSearchHistory}>
                  <Text style={styles.clearHistoryText}>Effacer historique</Text>
                </TouchableOpacity>
              )}
            </View>
          }
        />
      </View>
    );
  };

  // Historique de recherche
  const renderSearchHistory = () => {
    if (searchQuery.length > 0 || searchHistory.length === 0) return null;

    return (
      <Animated.View style={[styles.section, { opacity: fadeAnim }]}>
        <View style={styles.sectionHeader}>
          <Ionicons name="time" size={20} color={TEXT_SECONDARY} />
          <Text style={styles.sectionTitle}>Historique récent</Text>
          {searchHistory.length > 0 && (
            <TouchableOpacity onPress={clearSearchHistory}>
              <Text style={styles.clearAllText}>Tout effacer</Text>
            </TouchableOpacity>
          )}
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {searchHistory.map((term, index) => (
            <TouchableOpacity
              key={index}
              style={styles.historyChip}
              onPress={() => {
                setSearchQuery(term);
                handleSearch(term, true);
              }}
            >
              <Ionicons name="search" size={14} color={TEXT_SECONDARY} />
              <Text style={styles.historyText} numberOfLines={1}>
                {term}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </Animated.View>
    );
  };

  // Tendances du jour - Style original
  const renderTrendingSearches = () => {
    if (searchQuery.length > 0) return null;

    return (
      <Animated.View style={[styles.section, { opacity: fadeAnim }]}>
        <View style={styles.sectionHeader}>
          <Ionicons name="trending-up" size={20} color={SECONDARY_COLOR} />
          <Text style={styles.sectionTitle}>Tendances du jour</Text>
        </View>
        <View style={styles.trendingContainer}>
          {trendingSearches.map((item, index) => (
            <TouchableOpacity
              key={index}
              style={styles.trendingCard}
              onPress={() => {
                setSearchQuery(item.term);
                handleSearch(item.term, true);
              }}
            >
              <View style={styles.trendingContent}>
                <View style={styles.trendingLeft}>
                  <Text style={styles.trendingRank}>#{index + 1}</Text>
                  <View style={styles.trendingTextContainer}>
                    <Text style={styles.trendingTerm} numberOfLines={1}>
                      {item.term}
                    </Text>
                    <Text style={styles.trendingCount}>
                      {item.count} recherches
                    </Text>
                  </View>
                </View>
                <Ionicons name="trending-up" size={20} color={SECONDARY_COLOR} />
              </View>
            </TouchableOpacity>
          ))}
        </View>
      </Animated.View>
    );
  };

  // Catégories populaires - Style original
  const renderPopularCategories = () => {
    if (searchQuery.length > 0) return null;

    return (
      <Animated.View style={[styles.section, { opacity: fadeAnim }]}>
        <View style={styles.sectionHeader}>
          <Ionicons name="apps" size={20} color={SECONDARY_COLOR} />
          <Text style={styles.sectionTitle}>Catégories populaires</Text>
        </View>
        <View style={styles.categoriesContainer}>
          {popularCategories.map((category, index) => (
            <TouchableOpacity
              key={index}
              style={styles.categoryCard}
              onPress={() => navigateToCategory(category.name)}
            >
              <View style={[
                styles.categoryIconContainer,
                { backgroundColor: getCategoryColor(category.name) }
              ]}>
                <Ionicons 
                  name={getCategoryIcon(category.name)} 
                  size={24} 
                  color="#FFF" 
                />
              </View>
              <Text style={styles.categoryName} numberOfLines={1}>
                {category.name}
              </Text>
              <Text style={styles.categoryCount}>{category.count} produits</Text>
            </TouchableOpacity>
          ))}
        </View>
      </Animated.View>
    );
  };

  const getCategoryIcon = (category: string) => {
    const icons: {[key: string]: string} = {
      'Électronique': 'phone-portrait',
      'Mode': 'shirt',
      'Maison': 'home',
      'Sport': 'basketball',
      'Beauté': 'sparkles',
      'Auto': 'car',
      'Informatique': 'laptop',
      'Jardin': 'leaf',
      'Livres': 'book',
      'Musique': 'musical-notes',
      'Jeux': 'game-controller',
      'Santé': 'medical',
      'Bébé': 'heart',
      'default': 'cube',
    };
    
    return icons[category] || icons.default;
  };

  const getCategoryColor = (category: string) => {
    const colors: {[key: string]: string} = {
      'Électronique': '#FF3B30',
      'Mode': '#5856D6',
      'Maison': '#FF9500',
      'Sport': '#34C759',
      'Beauté': '#FF2D55',
      'Auto': '#007AFF',
      'default': SECONDARY_COLOR,
    };
    
    return colors[category] || colors.default;
  };

  // Filtres actifs
  const renderActiveFilters = () => {
    const activeFiltersCount = Object.values(filters).filter(
      value => value !== '' && value !== false && value !== 'relevance'
    ).length;

    if (activeFiltersCount === 0) return null;

    return (
      <View style={styles.filtersContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <TouchableOpacity
            style={styles.filterChip}
            onPress={() => setShowFiltersModal(true)}
          >
            <Ionicons name="filter" size={16} color={SECONDARY_COLOR} />
            <Text style={styles.filterChipText}>
              Filtres ({activeFiltersCount})
            </Text>
          </TouchableOpacity>

          {filters.category && (
            <TouchableOpacity
              style={styles.activeFilter}
              onPress={() => setFilters({...filters, category: ''})}
            >
              <Text style={styles.activeFilterText}>{filters.category}</Text>
              <Ionicons name="close" size={14} color="#fff" />
            </TouchableOpacity>
          )}

          {filters.location && (
            <TouchableOpacity
              style={styles.activeFilter}
              onPress={() => setFilters({...filters, location: ''})}
            >
              <Text style={styles.activeFilterText}>{filters.location}</Text>
              <Ionicons name="close" size={14} color="#fff" />
            </TouchableOpacity>
          )}
        </ScrollView>
      </View>
    );
  };

  // Produits
  const renderProductItem = ({ item, index }: { item: Product, index: number }) => {
    // Vérification et formatage sécurisé des données
    const price = formatPrice(item.price);
    const originalPrice = item.original_price ? formatPrice(item.original_price) : null;
    const discount = item.original_price && item.original_price > item.price 
      ? Math.round(((item.original_price - item.price) / item.original_price) * 100)
      : 0;
    
    const stock = formatStock(item.stock);
    const sellerRating = formatRating(item.seller_rating);
    const sellerName = item.seller_name || "Vendeur";
    const location = item.location || "Non spécifié";
    
    // Traitement des images
    const images = processImages(item.images);
    const mainImage = images.length > 0 ? images[0] : 'https://via.placeholder.com/150';

    return (
      <TouchableOpacity
        style={styles.productCard}
        onPress={() => navigateToProduct(item)}
        activeOpacity={0.9}
      >
        {/* Image produit */}
        <View style={styles.productImageContainer}>
          <Image
            source={{ 
              uri: mainImage
            }}
            style={styles.productImage}
            resizeMode="cover"
          />
          
          {/* Badges */}
          {discount > 0 && (
            <View style={styles.discountBadge}>
              <Text style={styles.discountText}>-{discount}%</Text>
            </View>
          )}
          
          {item.condition === 'neuf' && (
            <View style={styles.conditionBadge}>
              <Text style={styles.conditionText}>NEUF</Text>
            </View>
          )}

          {item.delivery_available && (
            <View style={styles.deliveryBadge}>
              <Ionicons name="rocket" size={12} color="#fff" />
            </View>
          )}
        </View>

        {/* Contenu produit */}
        <View style={styles.productContent}>
          <Text style={styles.productTitle} numberOfLines={2}>
            {item.title || "Produit sans nom"}
          </Text>
          
          <Text style={styles.productCategory} numberOfLines={1}>
            {item.category || "Non catégorisé"}
          </Text>

          {/* Prix avec vérification */}
          <View style={styles.priceContainer}>
            <Text style={styles.price}>{price}</Text>
            {originalPrice && (
              <Text style={styles.originalPrice}>
                {originalPrice}
              </Text>
            )}
          </View>

          {/* Vendeur */}
          <View style={styles.sellerContainer}>
            <Text style={styles.sellerName} numberOfLines={1}>
              {sellerName}
            </Text>
            <View style={styles.ratingContainer}>
              <Ionicons name="star" size={12} color="#FFD700" />
              <Text style={styles.ratingText}>
                {sellerRating}
              </Text>
            </View>
          </View>

          {/* Localisation et stock */}
          <View style={styles.productFooter}>
            <View style={styles.locationContainer}>
              <Ionicons name="location" size={12} color={TEXT_SECONDARY} />
              <Text style={styles.locationText}>
                {location}
              </Text>
            </View>
            
            {stock > 0 ? (
              <Text style={styles.inStockText}>En stock</Text>
            ) : (
              <Text style={styles.outOfStockText}>Rupture</Text>
            )}
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  // Liste principale avec pagination infinie
  const renderMainList = () => {
    if (isSearching && products.length === 0) {
      return (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={SECONDARY_COLOR} />
          <Text style={styles.loadingText}>Recherche en cours...</Text>
        </View>
      );
    }

    if (error) {
      return (
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle" size={60} color={ERROR_COLOR} />
          <Text style={styles.errorTitle}>Erreur</Text>
          <Text style={styles.errorMessage}>{error}</Text>
          <TouchableOpacity
            style={styles.retryButton}
            onPress={() => handleSearch(searchQuery, true)}
          >
            <Text style={styles.retryButtonText}>Réessayer</Text>
          </TouchableOpacity>
        </View>
      );
    }

    return (
      <FlatList
        ref={flatListRef}
        data={products}
        renderItem={renderProductItem}
        keyExtractor={(item) => item.id?.toString() || Math.random().toString()}
        numColumns={2}
        columnWrapperStyle={styles.productRow}
        contentContainerStyle={[
          styles.contentContainer,
          { paddingTop: 180, paddingBottom: 20 }
        ]}
        showsVerticalScrollIndicator={false}
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.5}
        ListHeaderComponent={
          <View>
            {/* Historique */}
            {renderSearchHistory()}
            
            {/* Tendances */}
            {renderTrendingSearches()}
            
            {/* Catégories populaires */}
            {renderPopularCategories()}
            
            {/* Filtres actifs */}
            {renderActiveFilters()}
            
            {/* En-tête résultats */}
            {searchQuery.length > 0 && products.length > 0 && (
              <View style={styles.resultsHeader}>
                <Text style={styles.resultsCount}>
                  {products.length} résultats
                </Text>
                <TouchableOpacity
                  style={styles.sortButton}
                  onPress={() => setShowFiltersModal(true)}
                >
                  <Text style={styles.sortButtonText}>
                    Trier: {filters.sortBy}
                  </Text>
                  <Ionicons name="chevron-down" size={16} color={SECONDARY_COLOR} />
                </TouchableOpacity>
              </View>
            )}
          </View>
        }
        ListFooterComponent={
          loading ? (
            <View style={styles.loadingFooter}>
              <ActivityIndicator size="small" color={SECONDARY_COLOR} />
              <Text style={styles.loadingText}>Chargement...</Text>
            </View>
          ) : !hasMore && products.length > 0 ? (
            <View style={styles.endOfResults}>
              <Text style={styles.endOfResultsText}>
                Fin des résultats
              </Text>
            </View>
          ) : null
        }
        ListEmptyComponent={
          searchQuery.length > 0 && !isSearching ? (
            <View style={styles.emptyContainer}>
              <Ionicons name="search-outline" size={80} color={SECONDARY_COLOR} />
              <Text style={styles.emptyTitle}>
                Aucun résultat pour "{searchQuery}"
              </Text>
              <Text style={styles.emptySubtitle}>
                Essayez d'autres mots-clés ou modifiez vos filtres
              </Text>
            </View>
          ) : null
        }
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
          { useNativeDriver: false }
        )}
        scrollEventThrottle={16}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => handleSearch(searchQuery, true)}
            colors={[SECONDARY_COLOR]}
            tintColor={SECONDARY_COLOR}
          />
        }
      />
    );
  };

  // ===========================================
  // 🎯 RENDU PRINCIPAL
  // ===========================================

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor={PRIMARY_COLOR} />
      
      {/* Header fixe */}
      {renderHeader()}
      
      {/* Suggestions flottantes */}
      {renderSuggestions()}

      {/* Liste principale avec pagination infinie */}
      {renderMainList()}

      {/* Modal recherche vocale */}
      <Modal
        visible={showVoiceModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowVoiceModal(false)}
      >
        <BlurView intensity={90} style={styles.modalOverlay}>
          <View style={styles.voiceModal}>
            <View style={styles.voiceAnimation}>
              <Ionicons name="mic" size={80} color={SECONDARY_COLOR} />
            </View>
            <Text style={styles.voiceModalTitle}>Parlez maintenant...</Text>
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={() => setShowVoiceModal(false)}
            >
              <Text style={styles.cancelButtonText}>Annuler</Text>
            </TouchableOpacity>
          </View>
        </BlurView>
      </Modal>
    </SafeAreaView>
  );
}

// ===========================================
// 🎨 STYLES
// ===========================================

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: PRIMARY_COLOR,
    paddingTop: Platform.OS === "android" ? StatusBar.currentHeight : 0,
  },
  contentContainer: {
    paddingBottom: 20,
  },

  // Header
  header: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    backgroundColor: PRIMARY_COLOR,
    zIndex: 100,
    paddingTop: Platform.OS === "ios" ? 40 : 20,
    overflow: 'hidden',
  },
  headerContent: {
    paddingHorizontal: 16,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: TEXT_PRIMARY,
  },
  analyticsButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: CARD_BACKGROUND,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: BORDER_COLOR,
  },

  // Barre de recherche
  searchContainer: {
    marginBottom: 8,
  },
  searchInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: CARD_BACKGROUND,
    borderRadius: 12,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: BORDER_COLOR,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    height: 50,
    color: TEXT_PRIMARY,
    fontSize: 16,
  },
  clearButton: {
    padding: 4,
    marginLeft: 4,
  },
  voiceButton: {
    padding: 4,
    marginLeft: 4,
  },

  // Suggestions
  suggestionsContainer: {
    position: 'absolute',
    top: 160,
    left: 16,
    right: 16,
    backgroundColor: CARD_BACKGROUND,
    borderRadius: 12,
    maxHeight: 300,
    borderWidth: 1,
    borderColor: BORDER_COLOR,
    zIndex: 99,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  suggestionsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: BORDER_COLOR,
  },
  suggestionsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: TEXT_SECONDARY,
  },
  clearHistoryText: {
    fontSize: 12,
    color: ERROR_COLOR,
    fontWeight: '600',
  },
  suggestionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(66, 165, 245, 0.05)',
  },
  suggestionIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(66, 165, 245, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  suggestionContent: {
    flex: 1,
  },
  suggestionTitle: {
    color: TEXT_PRIMARY,
    fontSize: 14,
    fontWeight: '500',
  },
  suggestionSubtitle: {
    color: TEXT_SECONDARY,
    fontSize: 12,
    marginTop: 2,
  },

  // Sections
  section: {
    marginBottom: 24,
    paddingHorizontal: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: '700',
    color: TEXT_PRIMARY,
    marginLeft: 12,
  },
  clearAllText: {
    fontSize: 14,
    color: ERROR_COLOR,
    fontWeight: '600',
  },

  // Historique
  historyChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(66, 165, 245, 0.1)',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    marginRight: 10,
    borderWidth: 1,
    borderColor: 'rgba(66, 165, 245, 0.2)',
  },
  historyText: {
    color: SECONDARY_COLOR,
    fontSize: 14,
    fontWeight: '500',
    marginLeft: 8,
    maxWidth: 150,
  },

  // Tendances (style original)
  trendingContainer: {
    backgroundColor: CARD_BACKGROUND,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: BORDER_COLOR,
  },
  trendingCard: {
    marginBottom: 12,
  },
  trendingContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  trendingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  trendingRank: {
    fontSize: 16,
    fontWeight: '800',
    color: SECONDARY_COLOR,
    width: 30,
  },
  trendingTextContainer: {
    flex: 1,
  },
  trendingTerm: {
    color: TEXT_PRIMARY,
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  trendingCount: {
    color: TEXT_SECONDARY,
    fontSize: 14,
  },

  // Catégories (style original)
  categoriesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  categoryCard: {
    width: (width - 48) / 2,
    backgroundColor: CARD_BACKGROUND,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: BORDER_COLOR,
    alignItems: 'center',
  },
  categoryIconContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  categoryName: {
    color: TEXT_PRIMARY,
    fontSize: 16,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 4,
  },
  categoryCount: {
    color: TEXT_SECONDARY,
    fontSize: 14,
  },

  // Filtres
  filtersContainer: {
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: CARD_BACKGROUND,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    marginRight: 8,
    borderWidth: 1,
    borderColor: SECONDARY_COLOR,
  },
  filterChipText: {
    color: SECONDARY_COLOR,
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 6,
  },
  activeFilter: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: SECONDARY_COLOR,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
    marginRight: 8,
  },
  activeFilterText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
    marginRight: 6,
  },

  // Résultats
  resultsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    paddingHorizontal: 16,
  },
  resultsCount: {
    color: TEXT_SECONDARY,
    fontSize: 14,
    fontWeight: '600',
  },
  sortButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: CARD_BACKGROUND,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: BORDER_COLOR,
  },
  sortButtonText: {
    color: SECONDARY_COLOR,
    fontSize: 14,
    fontWeight: '600',
    marginRight: 4,
  },

  // Produits
  productRow: {
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  productCard: {
    width: (width - 40) / 2,
    backgroundColor: CARD_BACKGROUND,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: BORDER_COLOR,
  },
  productImageContainer: {
    position: 'relative',
    width: '100%',
    height: 150,
  },
  productImage: {
    width: '100%',
    height: '100%',
    backgroundColor: '#2C3A4A',
  },
  discountBadge: {
    position: 'absolute',
    top: 8,
    left: 8,
    backgroundColor: ERROR_COLOR,
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 3,
  },
  discountText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '800',
  },
  conditionBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: SUCCESS_COLOR,
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 3,
  },
  conditionText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '800',
  },
  deliveryBadge: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    backgroundColor: SECONDARY_COLOR,
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  productContent: {
    padding: 12,
  },
  productTitle: {
    color: TEXT_PRIMARY,
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
    lineHeight: 18,
  },
  productCategory: {
    color: TEXT_SECONDARY,
    fontSize: 12,
    marginBottom: 8,
  },
  priceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  price: {
    color: TEXT_PRIMARY,
    fontSize: 18,
    fontWeight: '700',
    marginRight: 8,
  },
  originalPrice: {
    color: TEXT_SECONDARY,
    fontSize: 12,
    textDecorationLine: 'line-through',
  },
  sellerContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  sellerName: {
    flex: 1,
    color: TEXT_SECONDARY,
    fontSize: 12,
    marginRight: 8,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  ratingText: {
    color: '#FFD700',
    fontSize: 11,
    marginLeft: 4,
    fontWeight: '600',
  },
  productFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  locationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  locationText: {
    color: TEXT_SECONDARY,
    fontSize: 11,
    marginLeft: 4,
  },
  inStockText: {
    color: SUCCESS_COLOR,
    fontSize: 11,
    fontWeight: '600',
  },
  outOfStockText: {
    color: ERROR_COLOR,
    fontSize: 11,
    fontWeight: '600',
  },

  // États
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  loadingText: {
    color: SECONDARY_COLOR,
    fontSize: 16,
    marginTop: 16,
  },
  loadingFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
  },
  errorContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    paddingHorizontal: 20,
  },
  errorTitle: {
    color: TEXT_PRIMARY,
    fontSize: 22,
    fontWeight: '700',
    marginTop: 16,
    marginBottom: 8,
  },
  errorMessage: {
    color: TEXT_SECONDARY,
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 24,
  },
  retryButton: {
    backgroundColor: SECONDARY_COLOR,
    paddingHorizontal: 32,
    paddingVertical: 12,
    borderRadius: 12,
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    paddingHorizontal: 20,
  },
  emptyTitle: {
    color: TEXT_PRIMARY,
    fontSize: 20,
    fontWeight: '700',
    marginTop: 16,
    marginBottom: 8,
    textAlign: 'center',
  },
  emptySubtitle: {
    color: TEXT_SECONDARY,
    fontSize: 16,
    textAlign: 'center',
  },
  endOfResults: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  endOfResultsText: {
    color: TEXT_SECONDARY,
    fontSize: 14,
  },

  // Modal
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  voiceModal: {
    backgroundColor: CARD_BACKGROUND,
    borderRadius: 24,
    padding: 40,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: BORDER_COLOR,
    minWidth: width * 0.8,
  },
  voiceAnimation: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(66, 165, 245, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  voiceModalTitle: {
    color: TEXT_PRIMARY,
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 24,
  },
  cancelButton: {
    paddingHorizontal: 32,
    paddingVertical: 12,
    backgroundColor: 'rgba(255, 59, 48, 0.1)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 59, 48, 0.3)',
  },
  cancelButtonText: {
    color: ERROR_COLOR,
    fontSize: 16,
    fontWeight: '600',
  },
});

