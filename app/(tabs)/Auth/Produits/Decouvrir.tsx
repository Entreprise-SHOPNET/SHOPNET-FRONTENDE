




import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  Image,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  FlatList,
  Dimensions,
} from 'react-native';
import axios from 'axios';
import { useRouter } from 'expo-router';
import { FontAwesome5, FontAwesome } from '@expo/vector-icons';

const API_URL = 'https://shopnet-backend.onrender.com/api/products/discover';
const screenWidth = Dimensions.get('window').width;

const categoryIcons: Record<string, React.ReactNode> = {
  mode: <FontAwesome5 name="tshirt" size={28} color="#4CB050" />,
  autre: <FontAwesome name="tags" size={28} color="#4CB050" />,
  tech: <FontAwesome5 name="microchip" size={28} color="#4CB050" />,
  electronique: <FontAwesome5 name="tv" size={28} color="#4CB050" />,
  electronics: <FontAwesome5 name="laptop" size={28} color="#4CB050" />,
  default: <FontAwesome5 name="boxes" size={28} color="#4CB050" />,
};

const DiscoverScreen = () => {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState({
    recent: [],
    popular: [],
    featured: [],
    nearby: [],
    recommended: [],
    trendingCategories: [],
  });

  useEffect(() => {
    fetchDiscover();
  }, []);

  const fetchDiscover = async () => {
    try {
      const response = await axios.get(API_URL, {
        params: { lat: -4.322447, lon: 15.307045, userId: 1 },
      });
      setData(response.data);
    } catch (err) {
      console.error('Erreur Discover :', err.message);
    } finally {
      setLoading(false);
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
      {product.image_urls?.[0] ? (
        <Image source={{ uri: product.image_urls[0] }} style={styles.gridImage} />
      ) : (
        <View style={styles.imagePlaceholder}>
          <Text style={{ color: '#999' }}>Aucune image</Text>
        </View>
      )}
      <Text style={styles.productTitle} numberOfLines={1}>
        {product.title}
      </Text>
      <Text style={styles.productPrice}>{product.price} FC</Text>
    </TouchableOpacity>
  );

  const renderFeatured = () => {
    if (!data.featured.length) return null;
    return (
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>
          <FontAwesome name="star" size={16} color="#4CB050" /> Produits sponsorisés
        </Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {data.featured.map((product: any) => (
            <TouchableOpacity
              key={product.id}
              style={styles.featuredCard}
              onPress={() =>
                router.push({
                  pathname: '/(tabs)/Auth/Panier/DetailId',
                  params: { id: product.id.toString() },
                })
              }
              activeOpacity={0.8}
            >
              {product.image_urls?.[0] ? (
                <Image source={{ uri: product.image_urls[0] }} style={styles.featuredImage} />
              ) : (
                <View style={styles.imagePlaceholder}>
                  <Text style={{ color: '#ccc' }}>Image manquante</Text>
                </View>
              )}
              <View style={styles.featuredBadge}>
                <Text style={styles.featuredBadgeText}>Sponsorisé</Text>
              </View>
              <Text style={styles.featuredTitle} numberOfLines={1}>
                {product.title}
              </Text>
              <Text style={styles.productPrice}>{product.price} FC</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>
    );
  };

  const renderGridSection = (title: string, products: any[]) => {
    if (!products.length) return null;
    return (
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{title}</Text>
        <FlatList
          data={products}
          keyExtractor={(item) => item.id.toString()}
          numColumns={2}
          scrollEnabled={false}
          columnWrapperStyle={{ justifyContent: 'space-between' }}
          renderItem={({ item }) => renderProductCard(item)}
          removeClippedSubviews
        />
      </View>
    );
  };

  const renderTrendingCategories = () => {
    if (!data.trendingCategories.length) return null;
    return (
      <View style={styles.stickyHeader}>
        <Text style={styles.sectionTitle}>📊 Tendances par catégorie</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {data.trendingCategories.map((cat: any) => {
            const key = cat.category.toLowerCase();
            const icon = categoryIcons[key] || categoryIcons.default;
            return (
              <TouchableOpacity
                key={cat.category}
                style={styles.categoryCard}
                onPress={() =>
                  router.push(`/category/${encodeURIComponent(cat.category)}`)
                }
                activeOpacity={0.7}
              >
                <View style={styles.categoryIconContainer}>{icon}</View>
                <Text style={styles.categoryText} numberOfLines={1}>
                  {cat.category}
                </Text>
                <Text style={styles.categoryCount}>{cat.count}</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
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
      <ScrollView
        style={styles.container}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingTop: 130 }} // Pour laisser la place au menu fixe
      >
        {renderFeatured()}
        {renderGridSection('🔥 Produits populaires', data.popular)}
        {renderGridSection('🎯 Recommandés pour vous', data.recommended)}
        {renderGridSection('🆕 Nouveautés', data.recent)}
      </ScrollView>
    </View>
  );
};

export default DiscoverScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 12,
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: '#202A36',
    justifyContent: 'center',
    alignItems: 'center',
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 10,
  },
  featuredCard: {
    width: 140,
    marginRight: 14,
    backgroundColor: '#2A3949',
    borderRadius: 10,
    padding: 8,
    position: 'relative',
  },
  featuredImage: {
    width: '100%',
    height: 100,
    borderRadius: 8,
  },
  featuredBadge: {
    position: 'absolute',
    top: 8,
    left: 8,
    backgroundColor: '#1976D2',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  featuredBadgeText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '600',
  },
  featuredTitle: {
    color: '#fff',
    marginTop: 8,
    fontSize: 14,
  },
  productPrice: {
    color: '#4CB050',
    fontWeight: 'bold',
    fontSize: 13,
    marginTop: 4,
  },
  gridCard: {
    backgroundColor: '#2F3C4A',
    width: (screenWidth - 36) / 2,
    marginBottom: 16,
    borderRadius: 10,
    padding: 10,
  },
  gridImage: {
    width: '100%',
    height: 120,
    borderRadius: 8,
  },
  imagePlaceholder: {
    height: 120,
    backgroundColor: '#555',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 8,
  },
  productTitle: {
    color: '#fff',
    marginTop: 8,
    fontSize: 15,
  },

  // Sticky trending categories
  stickyHeader: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    backgroundColor: '#202A36',
    paddingTop: 20,
    paddingHorizontal: 12,
    zIndex: 10,
    paddingBottom: 10,
  },
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
  categoryIconContainer: {
    marginBottom: 8,
  },
  categoryText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 13,
    textAlign: 'center',
  },
  categoryCount: {
    color: '#4CB050',
    fontWeight: '700',
    fontSize: 11,
    marginTop: 4,
  },
});
