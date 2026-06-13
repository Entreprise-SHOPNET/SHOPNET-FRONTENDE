


// RechercheAvancee.tsx - Version IA intégrée (sans bouton de bascule)
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
  Ionicons, 
  MaterialIcons,
  MaterialCommunityIcons 
} from "@expo/vector-icons";
import { useRouter } from "expo-router";
import axios from "axios";
import { BlurView } from "expo-blur";
import * as Haptics from "expo-haptics";

const { width, height } = Dimensions.get("window");

// ===========================================
// CONFIGURATION
// ===========================================
const API_BASE_URL = "https://shopnet-backend.onrender.com/api";
const AI_SEARCH_URL = `${API_BASE_URL}/ai/search`;

// Couleurs
const PRIMARY_COLOR = "#00182A";
const SECONDARY_COLOR = "#42A5F5";
const SUCCESS_COLOR = "#4CAF50";
const ERROR_COLOR = "#FF3B30";
const WARNING_COLOR = "#FFA726";
const TEXT_PRIMARY = "#FFFFFF";
const TEXT_SECONDARY = "#A0AEC0";
const CARD_BACKGROUND = "rgba(30, 42, 59, 0.9)";
const BORDER_COLOR = "rgba(66, 165, 245, 0.1)";

// ===========================================
// TYPES
// ===========================================
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
  images?: string[] | string;
  image_url?: string;
  relevance_score?: number;
  delivery_available?: boolean;
  pickup_available?: boolean;
  views?: number;
  likes?: number;
  shares?: number;
  popularity_score?: number;
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

type RecentProduct = {
  id: number;
  title: string;
  price: number;
  image: string;
  timestamp: number;
};

export default function RechercheAvancee() {
  const router = useRouter();
  
  // Références
  const scrollY = useRef(new Animated.Value(0)).current;
  const searchInputRef = useRef<TextInput>(null);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const isMountedRef = useRef(true);
  const flatListRef = useRef<FlatList>(null);
  const debounceTimer = useRef<NodeJS.Timeout | null>(null);

  // États de recherche
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isVoiceSearch, setIsVoiceSearch] = useState(false);

  // Données principales
  const [products, setProducts] = useState<Product[]>([]);
  const [searchHistory, setSearchHistory] = useState<string[]>([]);
  const [recentProducts, setRecentProducts] = useState<RecentProduct[]>([]);
  const [searchSuggestions, setSearchSuggestions] = useState<SearchSuggestion[]>([]);
  const [trendingProducts, setTrendingProducts] = useState<Product[]>([]);
  const [popularCategories, setPopularCategories] = useState<{name: string, count: number}[]>([]);

  // Filtres (conservés mais non utilisés pour l'API IA)
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
  const [error, setError] = useState<string | null>(null);
  
  // Modals
  const [showFiltersModal, setShowFiltersModal] = useState(false);
  const [showVoiceModal, setShowVoiceModal] = useState(false);
  const [showAnalytics, setShowAnalytics] = useState(false);

  // ===========================================
  // INITIALISATION
  // ===========================================
  useEffect(() => {
    initializeApp();
    return () => {
      isMountedRef.current = false;
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
    };
  }, []);

  const initializeApp = async () => {
    try {
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }).start();

      await Promise.all([
        loadSearchHistory(),
        loadRecentProducts(),
        loadUserPreferences(),
        fetchTrendingProducts(),
        fetchPopularCategories(),
      ]);
    } catch (error) {
      console.error('Erreur initialisation:', error);
    }
  };

  // ===========================================
  // STOCKAGE LOCAL
  // ===========================================
  const loadSearchHistory = async () => {
    try {
      const history = await AsyncStorage.getItem("shopnet_search_history");
      if (history) setSearchHistory(JSON.parse(history).slice(0, 10));
    } catch (error) { console.error(error); }
  };

  const saveSearchHistory = async (query: string) => {
    if (!query.trim()) return;
    try {
      const updatedHistory = [
        query.trim(),
        ...searchHistory.filter(item => item.toLowerCase() !== query.trim().toLowerCase())
      ].slice(0, 10);
      setSearchHistory(updatedHistory);
      await AsyncStorage.setItem("shopnet_search_history", JSON.stringify(updatedHistory));
    } catch (error) { console.error(error); }
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

  const loadRecentProducts = async () => {
    try {
      const stored = await AsyncStorage.getItem("shopnet_recent_products");
      if (stored) setRecentProducts(JSON.parse(stored).slice(0, 10));
    } catch (error) { console.error(error); }
  };

  const addToRecentProducts = async (product: Product) => {
    const image = getProductImage(product);
    const newRecent: RecentProduct = {
      id: product.id,
      title: product.title,
      price: product.price,
      image,
      timestamp: Date.now(),
    };
    const updated = [
      newRecent,
      ...recentProducts.filter(p => p.id !== product.id)
    ].slice(0, 10);
    setRecentProducts(updated);
    await AsyncStorage.setItem("shopnet_recent_products", JSON.stringify(updated));
  };

  const clearRecentProducts = async () => {
    setRecentProducts([]);
    await AsyncStorage.removeItem("shopnet_recent_products");
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
  };

  const loadUserPreferences = async () => {
    try {
      const prefs = await AsyncStorage.getItem("shopnet_search_preferences");
      if (prefs) setFilters(JSON.parse(prefs));
    } catch (error) { console.error(error); }
  };

  // ===========================================
  // DONNÉES TRENDINGS
  // ===========================================
  const fetchTrendingProducts = async () => {
    try {
      // Tentative d'appel API (si endpoint existe)
      const response = await axios.get(`${API_BASE_URL}/products/popular`, { timeout: 5000 });
      if (response.data && response.data.products) {
        setTrendingProducts(response.data.products.slice(0, 6));
      } else {
        setTrendingProducts([]);
      }
    } catch (error) {
      setTrendingProducts([]);
    }
  };

  const fetchPopularCategories = async () => {
    setPopularCategories([
      { name: "Électronique", count: 1250 },
      { name: "Mode", count: 890 },
      { name: "Maison", count: 750 },
      { name: "Sport", count: 620 },
      { name: "Beauté", count: 580 },
      { name: "Auto", count: 450 },
    ]);
  };

  // ===========================================
  // RECHERCHE IA (avec debounce)
  // ===========================================
  const performAISearch = async (query: string) => {
    try {
      const response = await axios.post(
        AI_SEARCH_URL,
        { query: query.trim() },
        { headers: { 'Content-Type': 'application/json' }, timeout: 10000 }
      );
      if (response.data.success) {
        let productsData = response.data.products || [];
        productsData = productsData.map((p: any) => ({
          ...p,
          price: parseFloat(p.price) || 0,
          original_price: p.original_price ? parseFloat(p.original_price) : null,
          stock: parseInt(p.stock) || 0,
          seller_name: p.seller_name || "Vendeur",
          seller_rating: p.seller_rating || 0,
          image_url: p.image_url || null,
          images: p.images || (p.image_url ? [p.image_url] : []),
        }));
        return { success: true, products: productsData, count: response.data.count || 0 };
      }
      throw new Error(response.data.message || "Erreur IA");
    } catch (error: any) {
      console.error("❌ Recherche IA échouée:", error);
      throw new Error(error.response?.data?.error || error.message || "Erreur de recherche");
    }
  };

  const handleSearch = (query: string) => {
    if (!query.trim()) return;

    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(async () => {
      setIsSearching(true);
      setError(null);
      setProducts([]);
      Keyboard.dismiss();

      try {
        const result = await performAISearch(query);
        if (result.success) {
          setProducts(result.products);
          await saveSearchHistory(query);
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        } else {
          throw new Error("Aucun résultat");
        }
      } catch (err: any) {
        setError(err.message || "Erreur lors de la recherche");
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      } finally {
        setIsSearching(false);
        setRefreshing(false);
      }
    }, 500);
  };

  // ===========================================
  // AUTOCOMPLÉTION
  // ===========================================
  const fetchAutocompleteSuggestions = async (query: string) => {
    if (query.length < 2) {
      setSearchSuggestions([]);
      return;
    }
    try {
      const response = await axios.get(`${API_BASE_URL}/search/autocomplete`, { params: { q: query }, timeout: 5000 });
      const suggestions: SearchSuggestion[] = [];
      if (response.data.suggestions) {
        response.data.suggestions.forEach((s: string) => suggestions.push({ type: 'popular', title: s }));
      }
      if (response.data.products) {
        response.data.products.forEach((p: any) => suggestions.push({
          type: 'product', id: p.id.toString(), title: p.title, subtitle: `${formatPrice(p.price)} • ${p.category}`, image: p.thumbnail
        }));
      }
      const matchingHistory = searchHistory.filter(term => term.toLowerCase().includes(query.toLowerCase()));
      matchingHistory.forEach(term => suggestions.push({ type: 'history', title: term }));

      setSearchSuggestions(suggestions.slice(0, 8));
      setShowSuggestions(true);
    } catch (error) {
      setSearchSuggestions([]);
    }
  };

  // ===========================================
  // RECHERCHE VOCALE (simulation)
  // ===========================================
  const startVoiceSearch = () => {
    setShowVoiceModal(true);
    setIsVoiceSearch(true);
    setTimeout(() => {
      const simulatedQuery = "téléphone samsung neuf";
      setSearchQuery(simulatedQuery);
      handleSearch(simulatedQuery);
      setShowVoiceModal(false);
      setIsVoiceSearch(false);
    }, 2000);
  };

  // ===========================================
  // NAVIGATION PRODUIT
  // ===========================================
  const navigateToProduct = async (product: Product) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    await addToRecentProducts(product);
    if (isMountedRef.current && product.id) {
      router.push({ pathname: "/Auth/Panier/DetailId", params: { id: product.id.toString() } });
    }
  };

  const navigateToCategory = (category: string) => {
    setSearchQuery(category);
    handleSearch(category);
  };

  // ===========================================
  // UTILITAIRES
  // ===========================================
  const getProductImage = (product: Product): string => {
    if (product.image_url) return product.image_url;
    if (product.images) {
      if (Array.isArray(product.images) && product.images.length > 0) return product.images[0];
      if (typeof product.images === 'string') return product.images;
    }
    return 'https://via.placeholder.com/150';
  };

  const formatPrice = (price: any): string => {
    const num = typeof price === 'number' ? price : parseFloat(price);
    return isNaN(num) ? "0.00 $" : `${num.toFixed(2)} $`;
  };

  const formatRating = (rating: any): string => {
    const num = typeof rating === 'number' ? rating : parseFloat(rating);
    return isNaN(num) ? "0.0" : num.toFixed(1);
  };

  // ===========================================
  // COMPOSANTS DE RENDU
  // ===========================================
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
          <TouchableOpacity style={styles.analyticsButton} onPress={() => setShowAnalytics(true)}>
            <Ionicons name="stats-chart" size={22} color={SECONDARY_COLOR} />
          </TouchableOpacity>
        </View>
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
                if (text.length >= 2) fetchAutocompleteSuggestions(text);
                else setShowSuggestions(false);
              }}
              returnKeyType="search"
              onSubmitEditing={() => handleSearch(searchQuery)}
              onFocus={() => setShowSuggestions(true)}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => { setSearchQuery(""); setProducts([]); }} style={styles.clearButton}>
                <Ionicons name="close-circle" size={22} color={ERROR_COLOR} />
              </TouchableOpacity>
            )}
            <TouchableOpacity onPress={startVoiceSearch} style={styles.voiceButton} disabled={isVoiceSearch}>
              {isVoiceSearch ? <ActivityIndicator size="small" color={SECONDARY_COLOR} /> : <Ionicons name="mic" size={22} color={SECONDARY_COLOR} />}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Animated.View>
  );

  const renderSuggestions = () => {
    if (!showSuggestions || searchSuggestions.length === 0) return null;
    return (
      <View style={styles.suggestionsContainer}>
        <FlatList
          data={searchSuggestions}
          keyExtractor={(_, i) => `${i}`}
          renderItem={({ item }) => (
            <TouchableOpacity style={styles.suggestionItem} onPress={() => { setSearchQuery(item.title); handleSearch(item.title); }}>
              <View style={styles.suggestionIcon}>
                {item.type === 'history' && <Ionicons name="time" size={18} color={TEXT_SECONDARY} />}
                {item.type === 'product' && <Ionicons name="cube" size={18} color={SECONDARY_COLOR} />}
                {item.type === 'popular' && <Ionicons name="trending-up" size={18} color={WARNING_COLOR} />}
              </View>
              <View style={styles.suggestionContent}>
                <Text style={styles.suggestionTitle}>{item.title}</Text>
                {item.subtitle && <Text style={styles.suggestionSubtitle}>{item.subtitle}</Text>}
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

  const renderSearchHistoryText = () => {
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
                handleSearch(term);
              }}
            >
              <Ionicons name="search" size={14} color={TEXT_SECONDARY} />
              <Text style={styles.historyText}>{term}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </Animated.View>
    );
  };

  const renderRecentProductsSection = () => {
    if (searchQuery.length > 0 || recentProducts.length === 0) return null;
    return (
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Ionicons name="time" size={20} color={SECONDARY_COLOR} />
          <Text style={styles.sectionTitle}>Produits récents</Text>
          <TouchableOpacity onPress={clearRecentProducts}>
            <Text style={styles.clearAllText}>Effacer</Text>
          </TouchableOpacity>
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {recentProducts.map((item) => (
            <TouchableOpacity
              key={item.id}
              style={styles.recentProductCard}
              onPress={() => navigateToProduct(item as Product)}
            >
              <Image source={{ uri: item.image }} style={styles.recentProductImage} resizeMode="cover" />
              <Text style={styles.recentProductTitle} numberOfLines={1}>{item.title}</Text>
              <Text style={styles.recentProductPrice}>{formatPrice(item.price)}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>
    );
  };

  const renderTrendingSection = () => {
    if (searchQuery.length > 0) return null;
    // Si des produits tendances sont disponibles, affichage en cartes horizontales
    if (trendingProducts.length > 0) {
      return (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="trending-up" size={20} color={SECONDARY_COLOR} />
            <Text style={styles.sectionTitle}>Tendances du jour</Text>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {trendingProducts.map((product) => (
              <TouchableOpacity
                key={product.id}
                style={styles.trendingProductCard}
                onPress={() => navigateToProduct(product)}
              >
                <Image source={{ uri: getProductImage(product) }} style={styles.trendingProductImage} resizeMode="cover" />
                <Text style={styles.trendingProductTitle} numberOfLines={2}>{product.title}</Text>
                <Text style={styles.trendingProductPrice}>{formatPrice(product.price)}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      );
    }
    // Fallback : affichage textuel (ancien style)
    const mockTrends = [
      { term: "iPhone 15", count: 1250 },
      { term: "Chaussures running", count: 890 },
      { term: "PC Gamer", count: 750 },
      { term: "Parfum homme", count: 620 },
      { term: "Tablette Samsung", count: 580 },
    ];
    return (
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Ionicons name="trending-up" size={20} color={SECONDARY_COLOR} />
          <Text style={styles.sectionTitle}>Tendances du jour</Text>
        </View>
        <View style={styles.trendingContainer}>
          {mockTrends.map((item, idx) => (
            <TouchableOpacity key={idx} style={styles.trendingCard} onPress={() => handleSearch(item.term)}>
              <View style={styles.trendingContent}>
                <View style={styles.trendingLeft}>
                  <Text style={styles.trendingRank}>#{idx+1}</Text>
                  <View style={styles.trendingTextContainer}>
                    <Text style={styles.trendingTerm}>{item.term}</Text>
                    <Text style={styles.trendingCount}>{item.count} recherches</Text>
                  </View>
                </View>
                <Ionicons name="trending-up" size={20} color={SECONDARY_COLOR} />
              </View>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    );
  };

  const renderPopularCategories = () => {
    if (searchQuery.length > 0) return null;
    const getCategoryIcon = (cat: string) => {
      const icons: {[key: string]: string} = {
        'Électronique': 'phone-portrait', 'Mode': 'shirt', 'Maison': 'home',
        'Sport': 'basketball', 'Beauté': 'sparkles', 'Auto': 'car', 'default': 'cube'
      };
      return icons[cat] || icons.default;
    };
    const getCategoryColor = (cat: string) => {
      const colors: {[key: string]: string} = {
        'Électronique': '#FF3B30', 'Mode': '#5856D6', 'Maison': '#FF9500',
        'Sport': '#34C759', 'Beauté': '#FF2D55', 'Auto': '#007AFF', 'default': SECONDARY_COLOR
      };
      return colors[cat] || colors.default;
    };
    return (
      <Animated.View style={[styles.section, { opacity: fadeAnim }]}>
        <View style={styles.sectionHeader}>
          <Ionicons name="apps" size={20} color={SECONDARY_COLOR} />
          <Text style={styles.sectionTitle}>Catégories populaires</Text>
        </View>
        <View style={styles.categoriesContainer}>
          {popularCategories.map((category, index) => (
            <TouchableOpacity key={index} style={styles.categoryCard} onPress={() => navigateToCategory(category.name)}>
              <View style={[styles.categoryIconContainer, { backgroundColor: getCategoryColor(category.name) }]}>
                <Ionicons name={getCategoryIcon(category.name)} size={24} color="#FFF" />
              </View>
              <Text style={styles.categoryName}>{category.name}</Text>
              <Text style={styles.categoryCount}>{category.count} produits</Text>
            </TouchableOpacity>
          ))}
        </View>
      </Animated.View>
    );
  };

  const renderProductItem = ({ item }: { item: Product }) => {
    const price = formatPrice(item.price);
    const originalPrice = item.original_price ? formatPrice(item.original_price) : null;
    const discount = item.original_price && item.original_price > item.price
      ? Math.round(((item.original_price - item.price) / item.original_price) * 100)
      : 0;
    const stock = item.stock || 0;
    const sellerRating = formatRating(item.seller_rating);
    const imageUri = getProductImage(item);

    return (
      <TouchableOpacity style={styles.productCard} onPress={() => navigateToProduct(item)} activeOpacity={0.9}>
        <View style={styles.productImageContainer}>
          <Image source={{ uri: imageUri }} style={styles.productImage} resizeMode="cover" />
          {discount > 0 && <View style={styles.discountBadge}><Text style={styles.discountText}>-{discount}%</Text></View>}
          {item.condition === 'neuf' && <View style={styles.conditionBadge}><Text style={styles.conditionText}>NEUF</Text></View>}
          {item.delivery_available && <View style={styles.deliveryBadge}><Ionicons name="rocket" size={12} color="#fff" /></View>}
        </View>
        <View style={styles.productContent}>
          <Text style={styles.productTitle} numberOfLines={2}>{item.title}</Text>
          <Text style={styles.productCategory}>{item.category || "Non catégorisé"}</Text>
          <View style={styles.priceContainer}>
            <Text style={styles.price}>{price}</Text>
            {originalPrice && <Text style={styles.originalPrice}>{originalPrice}</Text>}
          </View>
          <View style={styles.sellerContainer}>
            <Text style={styles.sellerName}>{item.seller_name || "Vendeur"}</Text>
            <View style={styles.ratingContainer}>
              <Ionicons name="star" size={12} color="#FFD700" />
              <Text style={styles.ratingText}>{sellerRating}</Text>
            </View>
          </View>
          <View style={styles.productFooter}>
            <View style={styles.locationContainer}>
              <Ionicons name="location" size={12} color={TEXT_SECONDARY} />
              <Text style={styles.locationText}>{item.location || "Non spécifié"}</Text>
            </View>
            {stock > 0 ? <Text style={styles.inStockText}>En stock</Text> : <Text style={styles.outOfStockText}>Rupture</Text>}
          </View>
        </View>
      </TouchableOpacity>
    );
  };

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
          <TouchableOpacity style={styles.retryButton} onPress={() => handleSearch(searchQuery)}>
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
        keyExtractor={(item) => item.id.toString()}
        numColumns={2}
        columnWrapperStyle={styles.productRow}
        contentContainerStyle={[styles.contentContainer, { paddingTop: 180, paddingBottom: 20 }]}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <View>
            {renderRecentProductsSection()}
            {renderTrendingSection()}
            {renderSearchHistoryText()}
            {renderPopularCategories()}
            {searchQuery.length > 0 && products.length > 0 && (
              <View style={styles.resultsHeader}>
                <Text style={styles.resultsCount}>{products.length} résultats</Text>
              </View>
            )}
          </View>
        }
        ListEmptyComponent={
          searchQuery.length > 0 && !isSearching ? (
            <View style={styles.emptyContainer}>
              <Ionicons name="search-outline" size={80} color={SECONDARY_COLOR} />
              <Text style={styles.emptyTitle}>Aucun résultat pour "{searchQuery}"</Text>
              <Text style={styles.emptySubtitle}>Essayez d'autres mots-clés</Text>
            </View>
          ) : null
        }
        onScroll={Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], { useNativeDriver: false })}
        scrollEventThrottle={16}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => handleSearch(searchQuery)} colors={[SECONDARY_COLOR]} />}
      />
    );
  };

  // ===========================================
  // RENDU PRINCIPAL
  // ===========================================
  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor={PRIMARY_COLOR} />
      {renderHeader()}
      {renderSuggestions()}
      {renderMainList()}
      <Modal visible={showVoiceModal} transparent animationType="fade" onRequestClose={() => setShowVoiceModal(false)}>
        <BlurView intensity={90} style={styles.modalOverlay}>
          <View style={styles.voiceModal}>
            <View style={styles.voiceAnimation}>
              <Ionicons name="mic" size={80} color={SECONDARY_COLOR} />
            </View>
            <Text style={styles.voiceModalTitle}>Parlez maintenant...</Text>
            <TouchableOpacity style={styles.cancelButton} onPress={() => setShowVoiceModal(false)}>
              <Text style={styles.cancelButtonText}>Annuler</Text>
            </TouchableOpacity>
          </View>
        </BlurView>
      </Modal>
    </SafeAreaView>
  );
}

// ===========================================
// STYLES (inchangés + ajouts)
// ===========================================
const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: PRIMARY_COLOR, paddingTop: Platform.OS === "android" ? StatusBar.currentHeight : 0 },
  contentContainer: { paddingBottom: 20 },
  header: { position: 'absolute', top: 0, left: 0, right: 0, backgroundColor: PRIMARY_COLOR, zIndex: 100, paddingTop: Platform.OS === "ios" ? 40 : 20, overflow: 'hidden' },
  headerContent: { paddingHorizontal: 16 },
  headerTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  headerTitle: { fontSize: 24, fontWeight: '700', color: TEXT_PRIMARY },
  analyticsButton: { width: 40, height: 40, borderRadius: 20, backgroundColor: CARD_BACKGROUND, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: BORDER_COLOR },
  searchContainer: { marginBottom: 8 },
  searchInputWrapper: { flexDirection: 'row', alignItems: 'center', backgroundColor: CARD_BACKGROUND, borderRadius: 12, paddingHorizontal: 12, borderWidth: 1, borderColor: BORDER_COLOR },
  searchIcon: { marginRight: 8 },
  searchInput: { flex: 1, height: 50, color: TEXT_PRIMARY, fontSize: 16 },
  clearButton: { padding: 4, marginLeft: 4 },
  voiceButton: { padding: 4, marginLeft: 4 },
  suggestionsContainer: { position: 'absolute', top: 160, left: 16, right: 16, backgroundColor: CARD_BACKGROUND, borderRadius: 12, maxHeight: 300, borderWidth: 1, borderColor: BORDER_COLOR, zIndex: 99, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 12, elevation: 8 },
  suggestionsHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: BORDER_COLOR },
  suggestionsTitle: { fontSize: 14, fontWeight: '600', color: TEXT_SECONDARY },
  clearHistoryText: { fontSize: 12, color: ERROR_COLOR, fontWeight: '600' },
  suggestionItem: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: 'rgba(66, 165, 245, 0.05)' },
  suggestionIcon: { width: 32, height: 32, borderRadius: 16, backgroundColor: 'rgba(66, 165, 245, 0.1)', justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  suggestionContent: { flex: 1 },
  suggestionTitle: { color: TEXT_PRIMARY, fontSize: 14, fontWeight: '500' },
  suggestionSubtitle: { color: TEXT_SECONDARY, fontSize: 12, marginTop: 2 },
  section: { marginBottom: 24, paddingHorizontal: 16 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  sectionTitle: { flex: 1, fontSize: 18, fontWeight: '700', color: TEXT_PRIMARY, marginLeft: 12 },
  clearAllText: { fontSize: 14, color: ERROR_COLOR, fontWeight: '600' },
  historyChip: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(66, 165, 245, 0.1)', borderRadius: 20, paddingHorizontal: 16, paddingVertical: 10, marginRight: 10, borderWidth: 1, borderColor: 'rgba(66, 165, 245, 0.2)' },
  historyText: { color: SECONDARY_COLOR, fontSize: 14, fontWeight: '500', marginLeft: 8, maxWidth: 150 },
  recentProductCard: { width: 120, marginRight: 12, backgroundColor: CARD_BACKGROUND, borderRadius: 12, padding: 8, borderWidth: 1, borderColor: BORDER_COLOR },
  recentProductImage: { width: '100%', height: 100, borderRadius: 8, backgroundColor: '#2C3A4A' },
  recentProductTitle: { color: TEXT_PRIMARY, fontSize: 12, fontWeight: '500', marginTop: 6 },
  recentProductPrice: { color: SECONDARY_COLOR, fontSize: 12, fontWeight: '600', marginTop: 2 },
  trendingContainer: { backgroundColor: CARD_BACKGROUND, borderRadius: 12, padding: 16, borderWidth: 1, borderColor: BORDER_COLOR },
  trendingCard: { marginBottom: 12 },
  trendingContent: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  trendingLeft: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  trendingRank: { fontSize: 16, fontWeight: '800', color: SECONDARY_COLOR, width: 30 },
  trendingTextContainer: { flex: 1 },
  trendingTerm: { color: TEXT_PRIMARY, fontSize: 16, fontWeight: '600', marginBottom: 4 },
  trendingCount: { color: TEXT_SECONDARY, fontSize: 14 },
  trendingProductCard: { width: 140, marginRight: 12, backgroundColor: CARD_BACKGROUND, borderRadius: 12, padding: 8, borderWidth: 1, borderColor: BORDER_COLOR },
  trendingProductImage: { width: '100%', height: 120, borderRadius: 8, backgroundColor: '#2C3A4A' },
  trendingProductTitle: { color: TEXT_PRIMARY, fontSize: 12, fontWeight: '500', marginTop: 6 },
  trendingProductPrice: { color: SECONDARY_COLOR, fontSize: 12, fontWeight: '600', marginTop: 2 },
  categoriesContainer: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  categoryCard: { width: (width - 48) / 2, backgroundColor: CARD_BACKGROUND, borderRadius: 12, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: BORDER_COLOR, alignItems: 'center' },
  categoryIconContainer: { width: 60, height: 60, borderRadius: 30, justifyContent: 'center', alignItems: 'center', marginBottom: 12 },
  categoryName: { color: TEXT_PRIMARY, fontSize: 16, fontWeight: '700', textAlign: 'center', marginBottom: 4 },
  categoryCount: { color: TEXT_SECONDARY, fontSize: 14 },
  resultsHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, paddingHorizontal: 16 },
  resultsCount: { color: TEXT_SECONDARY, fontSize: 14, fontWeight: '600' },
  productRow: { justifyContent: 'space-between', paddingHorizontal: 16, marginBottom: 12 },
  productCard: { width: (width - 40) / 2, backgroundColor: CARD_BACKGROUND, borderRadius: 12, overflow: 'hidden', borderWidth: 1, borderColor: BORDER_COLOR },
  productImageContainer: { position: 'relative', width: '100%', height: 150 },
  productImage: { width: '100%', height: '100%', backgroundColor: '#2C3A4A' },
  discountBadge: { position: 'absolute', top: 8, left: 8, backgroundColor: ERROR_COLOR, borderRadius: 6, paddingHorizontal: 6, paddingVertical: 3 },
  discountText: { color: '#fff', fontSize: 10, fontWeight: '800' },
  conditionBadge: { position: 'absolute', top: 8, right: 8, backgroundColor: SUCCESS_COLOR, borderRadius: 6, paddingHorizontal: 6, paddingVertical: 3 },
  conditionText: { color: '#fff', fontSize: 10, fontWeight: '800' },
  deliveryBadge: { position: 'absolute', bottom: 8, right: 8, backgroundColor: SECONDARY_COLOR, width: 24, height: 24, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  productContent: { padding: 12 },
  productTitle: { color: TEXT_PRIMARY, fontSize: 14, fontWeight: '600', marginBottom: 4, lineHeight: 18 },
  productCategory: { color: TEXT_SECONDARY, fontSize: 12, marginBottom: 8 },
  priceContainer: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  price: { color: TEXT_PRIMARY, fontSize: 18, fontWeight: '700', marginRight: 8 },
  originalPrice: { color: TEXT_SECONDARY, fontSize: 12, textDecorationLine: 'line-through' },
  sellerContainer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  sellerName: { flex: 1, color: TEXT_SECONDARY, fontSize: 12, marginRight: 8 },
  ratingContainer: { flexDirection: 'row', alignItems: 'center' },
  ratingText: { color: '#FFD700', fontSize: 11, marginLeft: 4, fontWeight: '600' },
  productFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  locationContainer: { flexDirection: 'row', alignItems: 'center' },
  locationText: { color: TEXT_SECONDARY, fontSize: 11, marginLeft: 4 },
  inStockText: { color: SUCCESS_COLOR, fontSize: 11, fontWeight: '600' },
  outOfStockText: { color: ERROR_COLOR, fontSize: 11, fontWeight: '600' },
  loadingContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 60 },
  loadingText: { color: SECONDARY_COLOR, fontSize: 16, marginTop: 16 },
  errorContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 60, paddingHorizontal: 20 },
  errorTitle: { color: TEXT_PRIMARY, fontSize: 22, fontWeight: '700', marginTop: 16, marginBottom: 8 },
  errorMessage: { color: TEXT_SECONDARY, fontSize: 16, textAlign: 'center', marginBottom: 24 },
  retryButton: { backgroundColor: SECONDARY_COLOR, paddingHorizontal: 32, paddingVertical: 12, borderRadius: 12 },
  retryButtonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  emptyContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 60, paddingHorizontal: 20 },
  emptyTitle: { color: TEXT_PRIMARY, fontSize: 20, fontWeight: '700', marginTop: 16, marginBottom: 8, textAlign: 'center' },
  emptySubtitle: { color: TEXT_SECONDARY, fontSize: 16, textAlign: 'center' },
  modalOverlay: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  voiceModal: { backgroundColor: CARD_BACKGROUND, borderRadius: 24, padding: 40, alignItems: 'center', borderWidth: 1, borderColor: BORDER_COLOR, minWidth: width * 0.8 },
  voiceAnimation: { width: 120, height: 120, borderRadius: 60, backgroundColor: 'rgba(66, 165, 245, 0.1)', justifyContent: 'center', alignItems: 'center', marginBottom: 24 },
  voiceModalTitle: { color: TEXT_PRIMARY, fontSize: 22, fontWeight: '700', marginBottom: 24 },
  cancelButton: { paddingHorizontal: 32, paddingVertical: 12, backgroundColor: 'rgba(255, 59, 48, 0.1)', borderRadius: 12, borderWidth: 1, borderColor: 'rgba(255, 59, 48, 0.3)' },
  cancelButtonText: { color: ERROR_COLOR, fontSize: 16, fontWeight: '600' },
});