

import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  Image,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  FlatList,
  Dimensions,
} from 'react-native';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import { FontAwesome5, FontAwesome } from '@expo/vector-icons';

const API_URL = 'https://shopnet-backend.onrender.com/api/all-products';
const screenWidth = Dimensions.get('window').width;

const categoryIcons: Record<string, React.ReactNode> = {
  mode: <FontAwesome5 name="tshirt" size={28} color="#4CB050" />,
  tech: <FontAwesome5 name="microchip" size={28} color="#4CB050" />,
  electronics: <FontAwesome5 name="laptop" size={28} color="#4CB050" />,
  electronique: <FontAwesome5 name="tv" size={28} color="#4CB050" />,
  beauty: <FontAwesome5 name="spa" size={28} color="#4CB050" />,
  autre: <FontAwesome name="tags" size={28} color="#4CB050" />,
  default: <FontAwesome5 name="boxes" size={28} color="#4CB050" />,
};

// Formater les nombres >1000 en K
const formatNumber = (num: number) => {
  if (num >= 1000) return (num / 1000).toFixed(1).replace('.0', '') + 'K';
  return num.toString();
};

const DiscoverScreen = () => {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [products, setProducts] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [token, setToken] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  useEffect(() => {
    loadToken();
  }, []);

  const loadToken = async () => {
    try {
      const storedToken = await AsyncStorage.getItem('userToken');
      if (storedToken) {
        setToken(storedToken);
        fetchProducts(storedToken, 1, true);
      } else {
        console.error('Aucun token trouvé');
        setLoading(false);
      }
    } catch (err) {
      console.error('Erreur chargement token:', err);
      setLoading(false);
    }
  };

  const fetchProducts = async (jwtToken: string, pageNumber = 1, initial = false) => {
    try {
      if (!initial) setIsLoadingMore(true);
      const response = await axios.get(API_URL, {
        headers: {
          Authorization: `Bearer ${jwtToken}`,
        },
        params: { page: pageNumber, limit: 8 },
      });

      if (response.data.success) {
        const newProducts = response.data.products;

        // Trier par tendance: likes, shares, comments, cart, orders, views
        newProducts.sort((a: any, b: any) => {
          const scoreA =
            a.likes + a.shares * 2 + a.comments * 1.5 + a.cart_count * 2 + a.orders_count * 5 + a.views;
          const scoreB =
            b.likes + b.shares * 2 + b.comments * 1.5 + b.cart_count * 2 + b.orders_count * 5 + b.views;
          return scoreB - scoreA;
        });

        setProducts((prev) => (initial ? newProducts : [...prev, ...newProducts]));

        // Calcul des catégories
        const cats: Record<string, number> = {};
        [...(initial ? newProducts : [...products, ...newProducts])].forEach((p: any) => {
          cats[p.category] = (cats[p.category] || 0) + 1;
        });
        setCategories(Object.entries(cats).map(([cat, count]) => ({ category: cat, count })));

        setPage(pageNumber);
        setTotalPages(response.data.totalPages);
      }
    } catch (err: any) {
      console.error('Erreur API:', err.message);
    } finally {
      setLoading(false);
      setIsLoadingMore(false);
    }
  };

  const handleLoadMore = () => {
    if (page < totalPages && !isLoadingMore && token) {
      fetchProducts(token, page + 1);
    }
  };

  const renderProductCard = (product: any) => (
    <TouchableOpacity
      key={product.id}
      style={styles.gridCard}
      onPress={() =>
        router.push({
          pathname: '/(tabs)/Auth/Panier/DetailId',
          params: { id: product.id.toString() },
        })
      }
      activeOpacity={0.8}
    >
      {product.images?.[0] ? (
        <Image source={{ uri: product.images[0] }} style={styles.gridImage} />
      ) : (
        <View style={styles.imagePlaceholder}>
          <Text style={{ color: '#999' }}>Aucune image</Text>
        </View>
      )}
      <Text style={styles.productTitle} numberOfLines={1}>
        {product.title}
      </Text>
      <Text style={styles.productPrice}>{product.price} FC</Text>
      <View style={styles.statsContainer}>
        <FontAwesome5 name="heart" size={12} color="#E53935" />
        <Text style={styles.statsText}>{formatNumber(product.likes)}</Text>
        <FontAwesome5 name="share" size={12} color="#4CB050" style={{ marginLeft: 8 }} />
        <Text style={styles.statsText}>{formatNumber(product.shares)}</Text>
        <FontAwesome5 name="comment" size={12} color="#FFB300" style={{ marginLeft: 8 }} />
        <Text style={styles.statsText}>{formatNumber(product.comments)}</Text>
      </View>
    </TouchableOpacity>
  );

  const renderTrendingCategories = () => {
    if (!categories.length) return null;
    return (
      <View style={styles.stickyHeader}>
        <Text style={styles.sectionTitle}>📊 Tendances par catégorie</Text>
        <FlatList
          horizontal
          data={categories}
          keyExtractor={(item) => item.category}
          showsHorizontalScrollIndicator={false}
          renderItem={({ item }) => {
            const key = item.category.toLowerCase();
            const icon = categoryIcons[key] || categoryIcons.default;
            return (
              <TouchableOpacity
                style={styles.categoryCard}
                onPress={() =>
                  router.push(`/category/${encodeURIComponent(item.category)}`)
                }
                activeOpacity={0.7}
              >
                <View style={styles.categoryIconContainer}>{icon}</View>
                <Text style={styles.categoryText} numberOfLines={1}>
                  {item.category}
                </Text>
                <Text style={styles.categoryCount}>{item.count}</Text>
              </TouchableOpacity>
            );
          }}
        />
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4CB050" />
        <Text style={{ color: '#fff', marginTop: 8 }}>Chargement...</Text>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: '#202A36' }}>
      {renderTrendingCategories()}
      <FlatList
        data={products}
        keyExtractor={(item) => item.id.toString()}
        numColumns={2}
        columnWrapperStyle={{ justifyContent: 'space-between' }}
        renderItem={({ item }) => renderProductCard(item)}
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.5}
        ListFooterComponent={isLoadingMore ? <ActivityIndicator color="#4CB050" /> : null}
        contentContainerStyle={{ paddingTop: 130, paddingHorizontal: 12, paddingBottom: 20 }}
      />
    </View>
  );
};

export default DiscoverScreen;

const styles = StyleSheet.create({
  gridCard: {
    backgroundColor: '#2F3C4A',
    width: (screenWidth - 36) / 2,
    marginBottom: 16,
    borderRadius: 10,
    padding: 10,
  },
  gridImage: { width: '100%', height: 120, borderRadius: 8 },
  imagePlaceholder: {
    height: 120,
    backgroundColor: '#555',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 8,
  },
  productTitle: { color: '#fff', marginTop: 8, fontSize: 15 },
  productPrice: { color: '#4CB050', fontWeight: 'bold', fontSize: 13, marginTop: 4 },
  statsContainer: { flexDirection: 'row', alignItems: 'center', marginTop: 4 },
  statsText: { color: '#fff', fontSize: 11, marginLeft: 2 },
  stickyHeader: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    backgroundColor: '#202A36',
    paddingTop: 20,
    paddingBottom: 10,
    zIndex: 10,
  },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', color: '#fff', marginBottom: 10, paddingHorizontal: 12 },
  categoryCard: {
    backgroundColor: '#2E3A49',
    width: 80,
    height: 100,
    borderRadius: 10,
    marginRight: 14,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 12,
  },
  categoryIconContainer: { marginBottom: 8 },
  categoryText: { color: '#fff', fontWeight: '600', fontSize: 13, textAlign: 'center' },
  categoryCount: { color: '#4CB050', fontWeight: '700', fontSize: 11, marginTop: 4 },
  loadingContainer: {
    flex: 1,
    backgroundColor: '#202A36',
    justifyContent: 'center',
    alignItems: 'center',
  },
});
