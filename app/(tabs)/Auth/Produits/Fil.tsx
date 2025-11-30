


import { getApiUrl } from './apiUtils'; // ajuste le chemin si nécessaire
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Audio } from 'expo-av';
import { authApi } from '../authService';
import React, { useState, useEffect, useCallback, useRef, memo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  FlatList,
  StatusBar,
  SafeAreaView,
  RefreshControl,
  ActivityIndicator,
  Dimensions,
  Animated,
  Share
} from 'react-native';
import { FontAwesome } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import axios from 'axios';
type RootStackParamList = {
  Home: undefined;
  SellerProfile: { sellerId: string };
  ProductDetail: { productId: string };
  CategoryProducts: { category: string };
  ProfileMenu: undefined;
  Reviews: { productId: string };
  Discover: undefined;
  Sell: undefined;
  Messages: undefined;
  Profile: undefined;
  Search: undefined;
  Comments: { productId: string };
};

interface Product {
  id: string;
  title: string;
  description: string;
  price: number;
  discount?: number;
  images: string[];
  seller: {
    id: string;
    name: string;
    avatar?: string;
  };
  rating: number;
  comments: number;
  likes: number;
  location: string;
  isLiked: boolean;
  shares: number;
}

const API_BASE_URL = 'http://100.64.134.89:5000';
const RENDER_API = 'http://100.64.134.89:5000/api';
const PRODUCTS_ENDPOINT = '/api/products';

const { width } = Dimensions.get('window');

// Composant memoïsé pour les produits
const ProductItem = memo(({ 
  item, 
  handleLike, 
  handleComment, 
  handleShare, 
  handleAddToCart, 
  router 
}: {
  item: Product;
  handleLike: (id: string) => void;
  handleComment: (id: string) => void;
  handleShare: (product: Product) => void;
  handleAddToCart: (product: Product) => void;
  router: any;
}) => {
  return (
    <View style={styles.productCard}>
      <TouchableOpacity 
        style={styles.productHeader}
        onPress={() => router.push({
          pathname: '/(tabs)/Auth/Profiles/SellerProfile',
          params: { sellerId: item.seller.id }
        })}
      >
        <Image 
          source={{ uri: item.seller.avatar || 'https://via.placeholder.com/40' }} 
          style={styles.avatar}
          resizeMode="cover"
        />
        <View style={styles.sellerInfo}>
          <Text style={styles.sellerName} numberOfLines={1}>{item.seller.name}</Text>
          <Text style={styles.productLocation} numberOfLines={1}>{item.location}</Text>
        </View>
        <TouchableOpacity 
          onPress={() => router.push('/MisAjour')}
          style={styles.menuButton}
        >
          <FontAwesome name="ellipsis-v" size={16} color="#666" />
        </TouchableOpacity>
      </TouchableOpacity>

      <TouchableOpacity
        onPress={() => router.push({
          pathname: '/(tabs)/Auth/Panier/DetailId',
          params: { id: item.id.toString() }
        })}
      >
        <Image 
          source={{ uri: item.images[0] || 'https://via.placeholder.com/400' }} 
          style={styles.productImage}
          resizeMode="cover"
        />
        <View style={styles.priceContainer}>
          <Text style={styles.priceText}>
            ${item.price.toFixed(2)}
            {item.discount && item.discount > 0 && (
              <Text style={styles.discountText}> {item.discount}% OFF</Text>
            )}
          </Text>
        </View>
      </TouchableOpacity>

      <View style={styles.productInfo}>
        <Text style={styles.productTitle} numberOfLines={2}>{item.title}</Text>
        <Text style={styles.productDescription} numberOfLines={2}>{item.description}</Text>
      </View>

      <TouchableOpacity 
        style={styles.ratingContainer}
        onPress={() => router.push({
          pathname: '/(tabs)/Auth/Produits/Commentaire',
          params: { productId: item.id }
        })}
      >
        <View style={styles.starsContainer}>
          {[1, 2, 3, 4, 5].map((star) => (
            <FontAwesome 
              key={star} 
              name={star <= Math.floor(item.rating) ? "star" : "star-o"} 
              size={16} 
              color="#FFD700" 
            />
          ))}
        </View>
        <Text style={styles.socialCount}>{item.comments} commentaires</Text>
      </TouchableOpacity>

      <View style={styles.actionButtons}>
        <View style={styles.socialActions}>
          <TouchableOpacity 
            style={styles.socialButton}
            onPress={() => handleLike(item.id)}
          >
            <FontAwesome 
              name={item.isLiked ? "heart" : "heart-o"} 
              size={20} 
              color={item.isLiked ? "#FF3B30" : "#333"} 
            />
            <Text style={styles.socialCount}>{item.likes}</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.socialButton}
            onPress={() => handleComment(item.id)}
          >
            <FontAwesome name="comment-o" size={20} color="#333" />
            <Text style={styles.socialCount}>{item.comments}</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.socialButton}
            onPress={() => handleShare(item)}
          >
            <FontAwesome name="share" size={20} color="#333" />
            <Text style={styles.socialCount}>{item.shares}</Text>
          </TouchableOpacity>
        </View>
        <TouchableOpacity 
          style={styles.cartButton}
          onPress={() => handleAddToCart(item)}
        >
          <Text style={styles.cartButtonText}>Ajouter au panier</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}, (prevProps, nextProps) => {
  // Comparaison personnalisée pour éviter les re-rendus inutiles
  return (
    prevProps.item.id === nextProps.item.id &&
    prevProps.item.isLiked === nextProps.item.isLiked &&
    prevProps.item.likes === nextProps.item.likes &&
    prevProps.item.comments === nextProps.item.comments &&
    prevProps.item.shares === nextProps.item.shares
  );
});

const ShopApp = () => {
  const router = useRouter();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeCategory, setActiveCategory] = useState(0);
  const [activeTab, setActiveTab] = useState(0);
  const [notificationAnim] = useState(new Animated.Value(-100));
  const [notificationText, setNotificationText] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [feedType, setFeedType] = useState<'latest' | 'popular' | 'feed' | 'all'>('all');
  const categories = ['✨ Tendance', '🔥 Promos', '👗 Mode', '📱 Tech', '🏠 Maison', '💄 Beauté'];

  const showNotification = useCallback((message: string) => {
    setNotificationText(message);
    Animated.sequence([
      Animated.timing(notificationAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true
      }),
      Animated.delay(2000),
      Animated.timing(notificationAnim, {
        toValue: -100,
        duration: 300,
        useNativeDriver: true
      })
    ]).start();
  }, [notificationAnim]);

  const getProducts = useCallback(async (page = 1, isRefreshing = false) => {
    try {
      if (isRefreshing) {
        setRefreshing(true);
        page = 1;
      } else if (page === 1) {
        setLoading(true);
      } else {
        setIsLoadingMore(true);
      }

          // Récupérer le token JWT de l'utilisateur
          const token = await AsyncStorage.getItem('userToken');

          if (!token) {
            console.warn('Token JWT manquant !');
            showNotification("Veuillez vous connecter");
            return;
          }

      const apiUrl = getApiUrl(feedType);

      const response = await axios.get(apiUrl, {
        headers: { Authorization: `Bearer ${token}` },
        params: {
          category: categories[activeCategory]?.replace(/[^a-zA-Z]/g, '') || '',
          page,
          limit: 10
        }
      });

      if (!response.data || !response.data.products) {
        throw new Error('Réponse API invalide');
      }

      const formattedProducts = response.data.products.map((product: any) => ({
        id: product.id?.toString() ?? '',
        title: product.title ?? 'Titre non disponible',
        description: product.description ?? 'Description non disponible',
        price: Number(product.price) ?? 0,
        discount: product.original_price
          ? Math.round((1 - product.price / product.original_price) * 100)
          : 0,
        images: Array.isArray(product.image_urls) && product.image_urls.length > 0
        ? product.image_urls
        : ['https://via.placeholder.com/400'],

        seller: {
          id: product.seller.id ?? "1",
          name: product.seller.name ?? "Vendeur inconnu",
          avatar: product.seller.avatar
            ? (product.seller.avatar.startsWith('http')
                ? product.seller.avatar
                : `${API_BASE_URL}${product.seller.avatar}`)
            : 'https://via.placeholder.com/40',
        },

        rating: product.rating ?? 0,
        comments: product.comments ?? 0,
        likes: product.likes ?? 0,
        isLiked: product.isLiked ?? false,
        shares: product.shares ?? 0,
        location: product.location ?? 'Lubumbashi',
      }));

      if (page === 1) {
        setProducts(formattedProducts);
      } else {
        setProducts(prev => [...prev, ...formattedProducts]);
      }

      setCurrentPage(page);
      setTotalPages(response.data.totalPages || 1);
    } catch (error: any) {
      console.error('Erreur de chargement des produits :', error);

      let errorMessage = "Erreur de chargement";
      if (error.response) {
        if (error.response.status === 401) {
          errorMessage = "Session expirée, reconnectez-vous";
        } else {
          errorMessage = `Erreur serveur: ${error.response.status}`;
        }
      } else if (error.message.includes('timeout')) {
        errorMessage = "Temps d'attente dépassé";
      } else if (error.message.includes('Network Error')) {
        errorMessage = "Problème de réseau";
      } else if (error.message === 'Réponse API invalide') {
        errorMessage = "Format de données incorrect";
      }

      showNotification(errorMessage);
    } finally {
      setLoading(false);
      setRefreshing(false);
      setIsLoadingMore(false);
    }
  }, [showNotification, activeCategory]);

  useEffect(() => {
    getProducts(1);
  }, [activeCategory]);

  const soundRef = useRef<Audio.Sound | null>(null);

  useEffect(() => {
    const loadSound = async () => {
      try {
        const { sound } = await Audio.Sound.createAsync(
          require('../../../../assets/sounds/success-sound.mp3')
        );
        soundRef.current = sound;
      } catch (error) {
        console.error("Erreur de chargement du son", error);
      }
    };

    loadSound();

    return () => {
      soundRef.current?.unloadAsync();
    };
  }, []);

  const handleAddToCart = useCallback(
    async (product: Product) => {
      try {
        const token = await AsyncStorage.getItem('userToken');
        if (!token) {
          showNotification('Authentification requise');
          return;
        }

        const cartItem = {
          product_id: product.id,
          title: product.title,
          description: product.description,
          price: product.price,
          original_price: product.discount
            ? product.price / (1 - product.discount / 100)
            : product.price,
          category: categories[activeCategory].replace(/[^a-zA-Z]/g, ''),
          condition: 'new',
          quantity: 1,
          stock: 10,
          location: product.location,
          delivery_options: { pickup: true, delivery: true },
          images: product.images,
          seller_id: product.seller.id,
          seller_name: product.seller.name,
          seller_rating: product.rating,
        };

        const res = await authApi.post( 
          '/cart', 
          cartItem,
          {
            headers: {
              Authorization: `Bearer ${token}`
            }
          }
        );

        if (res?.data?.success) {
          showNotification('✅ Produit ajouté avec succès !');

          if (soundRef.current) {
            await soundRef.current.replayAsync();
          }
        } else {
          showNotification('⚠️ Impossible d’ajouter au panier.');
        }
      } catch (error: any) {
        console.error('Erreur lors de l’ajout au panier:', error);
        showNotification('❌ Erreur lors de l’ajout au panier');
      }
    },
    [activeCategory, categories, showNotification]
  );

const handleLike = useCallback(async (productId: string) => {
  let previousLikeState = false;
  let previousLikesCount = 0;

  try {
    console.log('🔹 Début handleLike pour productId:', productId);

    // Mise à jour immédiate de l’UI (optimistic update)
    setProducts(prevProducts =>
      prevProducts.map(product => {
        if (product.id === productId) {
          previousLikeState = product.isLiked;
          previousLikesCount = product.likes ?? 0;

          const newLikeState = !product.isLiked;
          const newLikesCount = newLikeState
            ? previousLikesCount + 1
            : Math.max(0, previousLikesCount - 1);

          return { ...product, isLiked: newLikeState, likes: newLikesCount };
        }
        return product;
      })
    );

    // Récupération du token utilisateur
    const token = await AsyncStorage.getItem('userToken');
    if (!token) {
      showNotification('Authentification requise');
      console.warn('⚠️ Aucun token trouvé.');
      return;
    }

    console.log('➡️ Envoi du like au serveur Render...');

    // Envoi au serveur Render (en ligne)
    const response = await axios.post(
      `https://shopnet-backend.onrender.com/api/interactions/${productId}/like`,
      {},
      { headers: { Authorization: `Bearer ${token}` }, timeout: 10000 }
    );

    console.log('✅ Réponse du serveur Render:', response.data);

    if (!response.data.success) {
      throw new Error(response.data.message || 'Erreur lors du like');
    }

    console.log(`🔹 Like effectué avec succès: liked=${response.data.liked}`);

  } catch (error: any) {
    console.error('❌ Erreur handleLike :', error);

    // Restauration de l’état précédent en cas d’erreur
    setProducts(prevProducts =>
      prevProducts.map(product =>
        product.id === productId
          ? { ...product, isLiked: previousLikeState, likes: previousLikesCount }
          : product
      )
    );

    showNotification(error.message || 'Erreur lors de la mise à jour du like');
  }

  console.log('🔹 Fin handleLike pour productId:', productId);
}, [showNotification]);

  const handleComment = useCallback((productId: string) => {
    router.push({
      pathname: '/(tabs)/Auth/Produits/Commentaire',
      params: { productId }
    });
  }, [router]);

  const handleShare = useCallback(async (product: Product) => {
    try {
      const token = await AsyncStorage.getItem('userToken');
      if (!token) {
        showNotification('Authentification requise');
        return;
      }

      const shareOptions = {
        title: `Partager ${product.title}`,
        message: `Découvrez ce produit: ${product.title} - ${product.price}$\n${product.description}`,
        ...(product.images?.length ? { url: product.images[0] } : {}),
      };

      const result = await Share.share(shareOptions);

      if (result.action === Share.sharedAction) {
        await axios.post(
          `${API_BASE_URL}/api/products/${product.id}/share`,
          {},
          { headers: { Authorization: `Bearer ${token}` } }
        );

        const response = await axios.get(`${API_BASE_URL}/api/products/${product.id}`);
        const updatedProduct = response.data;

        setProducts(prevProducts =>
          prevProducts.map(p =>
            p.id === updatedProduct.id ? updatedProduct : p
          )
        );
      }
    } catch (error) {
      console.error("Erreur lors du partage :", error);
      showNotification("Produit partagé");
    }
  }, [showNotification]);

  const handleRefresh = useCallback(() => {
    getProducts(1, true);
  }, [getProducts]);

  const handleLoadMore = useCallback(() => {
    if (currentPage < totalPages && !isLoadingMore && !loading) {
      getProducts(currentPage + 1);
    }
  }, [currentPage, totalPages, isLoadingMore, loading, getProducts]);

  const handleCategoryPress = useCallback((index: number) => {
    setActiveCategory(index);
  }, []);

  // Mémoïser les fonctions pour éviter des références changeantes
  const memoizedHandleLike = useCallback((productId: string) => {
    handleLike(productId);
  }, [handleLike]);

  const memoizedHandleComment = useCallback((productId: string) => {
    handleComment(productId);
  }, [handleComment]);

  const memoizedHandleShare = useCallback((product: Product) => {
    handleShare(product);
  }, [handleShare]);

  const memoizedHandleAddToCart = useCallback((product: Product) => {
    handleAddToCart(product);
  }, [handleAddToCart]);

  const renderProductItem = useCallback(({ item }: { item: Product }) => (
    <ProductItem 
      item={item}
      handleLike={memoizedHandleLike}
      handleComment={memoizedHandleComment}
      handleShare={memoizedHandleShare}
      handleAddToCart={memoizedHandleAddToCart}
      router={router}
    />
  ), [memoizedHandleLike, memoizedHandleComment, memoizedHandleShare, memoizedHandleAddToCart, router]);

  const renderFooter = useCallback(() => {
    if (!isLoadingMore) return null;

    return (
      <View style={styles.footerLoader}>
        <ActivityIndicator size="large" color="#4CAF50" />
      </View>
    );
  }, [isLoadingMore]);

  if (loading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4CAF50" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar backgroundColor="#fff" barStyle="dark-content" />

      <Animated.View 
        style={[
          styles.notification,
          { transform: [{ translateY: notificationAnim }] }
        ]}
      >
        <Text style={styles.notificationText}>{notificationText}</Text>
      </Animated.View>

      <View style={styles.header}>
        <Text style={styles.logo}>SHOPNET</Text>
        <View style={styles.headerIcons}>
          <TouchableOpacity 
            style={styles.searchIcon}
            onPress={() => router.push('/(tabs)/Auth/Produits/Recherche')}
          >
            <FontAwesome name="search" size={20} color="#333" />
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.iconButton}
            onPress={() => router.push('/(tabs)/Auth/Notification/NotificationsUser')}
          >
            <FontAwesome name="bell" size={20} color="#333" />
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.iconButton}
            onPress={() => router.push('/(tabs)/Auth/Produits/profil-debug')}
          >
            <FontAwesome name="user-circle" size={20} color="#333" />
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.categoriesWrapper}>
        <FlatList
          horizontal
          data={categories}
          keyExtractor={(item, index) => index.toString()}
          renderItem={({ item, index }) => (
            <TouchableOpacity
              style={[
                styles.categoryPill,
                activeCategory === index && styles.activeCategoryPill
              ]}
              onPress={() => handleCategoryPress(index)}
            >
              <Text style={[
                styles.categoryText,
                activeCategory === index && styles.activeCategoryText
              ]}>
                {item}
              </Text>
            </TouchableOpacity>
          )}
          contentContainerStyle={styles.categoriesContainer}
          showsHorizontalScrollIndicator={false}
        />
      </View>

      <FlatList
        data={products}
        renderItem={renderProductItem}
        keyExtractor={(item) => item.id}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={['#4CAF50']}
          />
        }
        contentContainerStyle={styles.listContent}
        initialNumToRender={6}
        maxToRenderPerBatch={8}
        windowSize={11}
        updateCellsBatchingPeriod={100}
        removeClippedSubviews={true}
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.5}
        ListFooterComponent={renderFooter}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>Aucun produit disponible</Text>
            <TouchableOpacity 
              style={styles.retryButton}
              onPress={() => getProducts(1)}
            >
              <Text style={styles.retryButtonText}>Réessayer</Text>
            </TouchableOpacity>
          </View>
        }
      />

      <View style={styles.enhancedBottomNav}>
        {['Home', 'Discover', 'Sell', 'Messages', 'Profile'].map((screen, index) => (
          <TouchableOpacity 
            key={screen}
            style={styles.navButton} 
            onPress={() => {
              setActiveTab(index);
              if (screen === 'Sell') {
                router.push('/(tabs)/Auth/Produits/Produit');
              } else if (screen === 'Home') {
                router.push('/(tabs)/Auth/Produits/Fil');
              } else if (screen === 'Discover') {
                router.push('/(tabs)/Auth/Produits/Decouvrir');
              } else if (screen === 'Messages') {
                router.push('/(tabs)/Auth/Panier/CartListScreen');
              } else if (screen === 'Profile') {
                router.push('/(tabs)/Auth/Produits/profil-debug');
              }
            }}
          >
            <FontAwesome 
              name={
                screen === 'Home' ? 'home' :
                screen === 'Discover' ? 'compass' :
                screen === 'Sell' ? 'plus' :
                screen === 'Messages' ? 'comments' : 'user'
              } 
              size={24} 
              color={activeTab === index ? '#4CAF50' : '#666'} 
            />
            <Text style={[
              styles.navLabel,
              activeTab === index && styles.activeNavLabel
            ]}>
              {screen === 'Home' ? 'Accueil' :
              screen === 'Discover' ? 'Découvrir' :
              screen === 'Sell' ? 'Vendre' :
              screen === 'Messages' ? 'Panier' : 'Profil'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f0f2f5'
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center'
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    marginTop: 50
  },
  emptyText: {
    fontSize: 18,
    color: '#666',
    marginBottom: 20,
    textAlign: 'center'
  },
  retryButton: {
    backgroundColor: '#4CAF50',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 5
  },
  retryButtonText: {
    color: '#fff',
    fontWeight: 'bold'
  },
  footerLoader: {
    padding: 20,
    justifyContent: 'center',
    alignItems: 'center'
  },
  notification: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    backgroundColor: '#4CAF50',
    padding: 15,
    zIndex: 100,
  },
  notificationText: {
    color: '#fff',
    textAlign: 'center',
    fontWeight: 'bold'
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 15,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0'
  },
  logo: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#4CAF50'
  },
  headerIcons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 15
  },
  searchIcon: {
    padding: 5
  },
  iconButton: {
    padding: 5
  },
  categoriesWrapper: {
    backgroundColor: '#fff',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0'
  },
  categoriesContainer: {
    paddingHorizontal: 15
  },
  categoryPill: {
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 10,
    backgroundColor: '#f0f2f5'
  },
  activeCategoryPill: {
    backgroundColor: '#4CAF50'
  },
  categoryText: {
    color: '#666',
    fontWeight: '500'
  },
  activeCategoryText: {
    color: '#fff'
  },
  listContent: {
    paddingBottom: 80,
  },
  productCard: {
    backgroundColor: '#fff',
    marginBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0'
  },
  productHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 10,
    backgroundColor: '#eee'
  },
  sellerInfo: {
    flex: 1
  },
  sellerName: {
    fontWeight: 'bold',
    fontSize: 14
  },
  productLocation: {
    fontSize: 12,
    color: '#666'
  },
  menuButton: {
    padding: 5
  },
  productImage: {
    width: '100%',
    height: width,
    backgroundColor: '#eee'
  },
  priceContainer: {
    position: 'absolute',
    bottom: 10,
    left: 10,
    backgroundColor: 'rgba(0,0,0,0.7)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 5
  },
  priceText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16
  },
  discountText: {
    color: '#FFD700',
    fontSize: 12
  },
  productInfo: {
    paddingHorizontal: 12,
    paddingVertical: 10
  },
  productTitle: {
    fontSize: 16,
    fontWeight: 'bold'
  },
  productDescription: {
    color: '#666',
    marginTop: 4,
    fontSize: 14
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    marginBottom: 10
  },
  starsContainer: {
    flexDirection: 'row',
    marginRight: 5
  },
  socialCount: {
    fontSize: 12,
    color: '#666'
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    borderTopWidth: 1,
    borderTopColor: '#f0f2f5'
  },
  socialActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 15
  },
  socialButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5
  },
  cartButton: {
    backgroundColor: '#4CAF50',
    borderRadius: 5,
    paddingHorizontal: 15,
    paddingVertical: 8
  },
  cartButtonText: {
    color: '#fff',
    fontWeight: 'bold'
  },
  enhancedBottomNav: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    paddingVertical: 10,
    paddingHorizontal: 5,
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
  },
  navButton: {
    alignItems: 'center',
    flex: 1
  },
  navLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 4
  },
  activeNavLabel: {
    color: '#4CAF50',
    fontWeight: 'bold'
  }
});

export default ShopApp;
