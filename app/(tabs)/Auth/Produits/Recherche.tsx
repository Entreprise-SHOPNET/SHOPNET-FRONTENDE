



import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, TextInput, FlatList, TouchableOpacity,
  ActivityIndicator, StyleSheet, Image, RefreshControl, Dimensions, Keyboard
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { FontAwesome, Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

const API_URL = 'https://shopnet-backend.onrender.com/api/search';

const { width } = Dimensions.get('window');
const ITEM_WIDTH = (width - 40) / 2;

type Product = {
  id: number;
  title: string;
  description?: string;
  category: string;
  price: string;
  originalPrice?: string;
  condition?: string;
  images: { filename: string, url: string }[];
  relevance?: number;
};

export default function Recherche() {
  const router = useRouter();

  const [search, setSearch] = useState('');
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [suggestions, setSuggestions] = useState<string[]>([]);

  useEffect(() => {
    AsyncStorage.getItem('recentSearches').then(data => {
      if (data) setRecentSearches(JSON.parse(data));
    });
  }, []);

  const saveRecentSearch = async (term: string) => {
    if (!term.trim()) return;
    const updated = [term, ...recentSearches.filter(s => s !== term)].slice(0, 10);
    setRecentSearches(updated);
    await AsyncStorage.setItem('recentSearches', JSON.stringify(updated));
  };

  const chargerProduits = useCallback(async (reset = false) => {
    if (loading || (!hasMore && !reset)) return;

    const currentPage = reset ? 1 : page;

    try {
      if (reset) setLoading(true);
      else setRefreshing(true);
      setError(null);

      const url = `${API_URL}?search=${encodeURIComponent(search)}&page=${currentPage}&limit=20`;
      const res = await fetch(url);
      if (!res.ok) throw new Error('Erreur réseau');
      const data = await res.json();

      if (!data || !data.products) {
        setHasMore(false);
        if (reset) setProducts([]);
        return;
      }

      setProducts(prev => reset ? data.products : [...prev, ...data.products]);
      setSuggestions(data.suggestions || []);
      setHasMore(data.products.length === 20);
      setPage(currentPage + 1);

    } catch (err) {
      setError('Erreur de connexion au serveur');
      console.error('❌ Recherche erreur:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [search, page, loading, hasMore]);

  useEffect(() => {
    if (!search.trim()) {
      setProducts([]);
      setHasMore(false);
      setPage(1);
      return;
    }
    const timer = setTimeout(() => {
      chargerProduits(true);
      saveRecentSearch(search.trim());
    }, 500);
    return () => clearTimeout(timer);
  }, [search]);

  const onSelectRecent = (term: string) => {
    setSearch(term);
    Keyboard.dismiss();
  };

  const onPressProduct = (item: Product) => {
  router.push(`/ProductDetail/${item.id}` as any);
};


  const ProductItem = ({ item }: { item: Product }) => (
    <TouchableOpacity
      style={styles.card}
      activeOpacity={0.8}
      onPress={() => onPressProduct(item)}
    >
      {/* Badge pour condition */}
      {item.condition && (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{item.condition}</Text>
        </View>
      )}

      <Image
        source={{ uri: item.images[0]?.url || 'https://via.placeholder.com/150' }}
        style={styles.image}
        resizeMode="cover"
      />

      <View style={styles.priceContainer}>
        <Text style={styles.price}>${item.price}</Text>
        {item.originalPrice && (
          <Text style={styles.originalPrice}>${item.originalPrice}</Text>
        )}
      </View>

      <Text style={styles.nom} numberOfLines={1}>{item.title}</Text>
      <Text style={styles.categorie} numberOfLines={1}>{item.category}</Text>

      <View style={styles.ratingContainer}>
        <FontAwesome name="star" size={12} color="#FFD700" />
        <Text style={styles.ratingText}>
          {item.relevance?.toFixed(1) || '4.5'}
        </Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Recherche intelligente</Text>

        <View style={styles.searchContainer}>
          <FontAwesome name="search" size={18} color="#888" style={{ marginRight: 10 }} />
          <TextInput
            placeholder="Rechercher un produit..."
            placeholderTextColor="#888"
            style={styles.input}
            value={search}
            onChangeText={setSearch}
            returnKeyType="search"
            autoCorrect={false}
            autoCapitalize="none"
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => setSearch('')}>
              <Ionicons name="close-circle" size={20} color="#888" />
            </TouchableOpacity>
          )}
        </View>

        {recentSearches.length > 0 && !search && (
          <View style={styles.recentContainer}>
            <Text style={styles.recentTitle}>Recherches récentes :</Text>
            {recentSearches.map(term => (
              <TouchableOpacity key={term} onPress={() => onSelectRecent(term)} style={styles.recentItem}>
                <Text style={styles.recentText}>🔍 {term}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {suggestions.length > 0 && (
          <View style={styles.recentContainer}>
            <Text style={styles.recentTitle}>Suggestions :</Text>
            {suggestions.map(s => (
              <TouchableOpacity key={s} onPress={() => onSelectRecent(s)} style={styles.recentItem}>
                <Text style={styles.recentText}>💡 {s}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </View>

      {error ? (
        <View style={styles.centerContainer}>
          <FontAwesome name="exclamation-triangle" size={50} color="#FF6B6B" />
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={() => chargerProduits(true)}>
            <Text style={styles.retryText}>Réessayer</Text>
          </TouchableOpacity>
        </View>
      ) : products.length === 0 && !loading ? (
        <View style={styles.centerContainer}>
          <FontAwesome name="search" size={60} color="#4CA4B0" />
          <Text style={styles.message}>
            {search ? `Aucun résultat pour "${search}"` : 'Recherchez un produit...'}
          </Text>
        </View>
      ) : (
        <FlatList
          data={products}
          keyExtractor={(item) => item.id.toString()}
          renderItem={ProductItem}
          numColumns={2}
          columnWrapperStyle={styles.row}
          onEndReached={() => hasMore && chargerProduits()}
          onEndReachedThreshold={0.5}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => chargerProduits(true)}
              colors={['#4CA4B0']}
              tintColor="#4CA4B0"
            />
          }
          ListFooterComponent={() =>
            hasMore ? (
              <View style={styles.loaderContainer}>
                <ActivityIndicator size="large" color="#4CA4B0" />
              </View>
            ) : null
          }
        />
      )}
    </View>
  );
}

  /* … même styles que ton code (inchangés) … */


const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#202A36',
    paddingTop: 10,
  },
  header: {
    paddingHorizontal: 15,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 10,
    textAlign: 'center',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2A3648',
    borderRadius: 25,
    paddingHorizontal: 15,
    paddingVertical: 8,
    marginBottom: 10,
  },
  input: {
    flex: 1,
    color: '#fff',
    fontSize: 16,
  },
  filters: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
    marginBottom: 10,
  },
  filterBtn: {
    backgroundColor: '#2A3648',
    borderRadius: 20,
    paddingVertical: 8,
    paddingHorizontal: 15,
  },
  activeFilter: {
    backgroundColor: '#4CA4B0',
  },
  filterText: {
    color: '#fff',
    fontWeight: '600',
  },
  activeFilterText: {
    fontWeight: '700',
  },
  recentContainer: {
    marginBottom: 10,
  },
  recentTitle: {
    color: '#aaa',
    fontWeight: '600',
    marginBottom: 5,
  },
  recentItem: {
    paddingVertical: 6,
  },
  recentText: {
    color: '#4CA4B0',
    fontSize: 15,
  },
  row: {
    justifyContent: 'space-between',
    paddingHorizontal: 15,
    marginBottom: 10,
  },
  card: {
    width: ITEM_WIDTH,
    backgroundColor: '#2A3648',
    borderRadius: 12,
    padding: 12,
    marginBottom: 15,
    position: 'relative',
  },
  badge: {
    position: 'absolute',
    top: 10,
    right: 10,
    backgroundColor: '#FF6B6B',
    borderRadius: 10,
    paddingVertical: 3,
    paddingHorizontal: 8,
    zIndex: 10,
  },
  badgeText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 12,
  },
  image: {
    width: '100%',
    height: ITEM_WIDTH,
    borderRadius: 8,
    marginBottom: 10,
  },
  priceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 5,
  },
  price: {
    fontWeight: 'bold',
    color: '#fff',
    fontSize: 16,
  },
  originalPrice: {
    color: '#888',
    fontSize: 12,
    textDecorationLine: 'line-through',
    marginLeft: 8,
  },
  nom: {
    color: '#fff',
    fontWeight: '600',
    marginBottom: 3,
    fontSize: 16,
  },
  categorie: {
    color: '#888',
    fontSize: 12,
    marginBottom: 5,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  ratingText: {
    color: '#FFD700',
    marginLeft: 5,
    fontSize: 12,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  message: {
    textAlign: 'center',
    color: '#fff',
    marginTop: 20,
    fontStyle: 'italic',
    fontSize: 16,
  },
  errorText: {
    textAlign: 'center',
    color: '#FF6B6B',
    marginTop: 20,
    fontSize: 16,
    maxWidth: '80%',
  },
  retryBtn: {
    marginTop: 20,
    backgroundColor: '#4CA4B0',
    paddingVertical: 10,
    paddingHorizontal: 25,
    borderRadius: 25,
  },
  retryText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  loaderContainer: {
    padding: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
