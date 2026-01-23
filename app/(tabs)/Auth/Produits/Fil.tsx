


import { getApiUrl } from './apiUtils';
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
import { FontAwesome, Ionicons } from '@expo/vector-icons';
import { useRouter, useFocusEffect } from 'expo-router';
import axios from 'axios';



// ===============================
// Configuration API – PRODUCTION
// ===============================
const API_BASE_URL = 'https://shopnet-backend.onrender.com/api';

const PRODUCTS_ENDPOINT = `${API_BASE_URL}/products`;
const PROMOTIONS_API_URL = `${API_BASE_URL}/promotions`;
const NOTIFICATIONS_API_URL = `${API_BASE_URL}/notifications`;


// ===============================
// Configuration API – LOCAL (commentée)
// ===============================
// const API_BASE_URL = 'http://100.64.134.89:5000/api';
// const PRODUCTS_ENDPOINT = `${API_BASE_URL}/products`;
// const PROMOTIONS_API_URL = `${API_BASE_URL}/promotions`;
// const NOTIFICATIONS_API_URL = `${API_BASE_URL}/notifications`;

const { width } = Dimensions.get('window');

interface Product {
  id: string;
  title: string;
  description: string;
  price: number;
  original_price?: number;
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
  isPromotion?: boolean;
  promotionId?: number;
  duration_days?: number;
  created_at?: string;
  time_remaining?: string;
}

interface Notification {
  id: string;
  title: string;
  message: string;
  type: 'promotion' | 'message' | 'order' | 'system' | 'like' | 'comment';
  isRead: boolean;
  createdAt: string;
  icon?: string;
  data?: any;
}

// Fonction pour mélanger aléatoirement un tableau
const shuffleArray = (array: any[]) => {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
};

// Fonction pour calculer le temps restant d'une promotion
const calculateTimeRemaining = (createdAt: string, durationDays: number): string => {
  const createdDate = new Date(createdAt);
  const endDate = new Date(createdDate.getTime() + durationDays * 24 * 60 * 60 * 1000);
  const now = new Date();
  const diffMs = endDate.getTime() - now.getTime();
  
  if (diffMs <= 0) return 'Expirée';
  
  const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  
  if (days > 0) return `${days} jours ${hours}h`;
  return `${hours} heures`;
};

// Composant pour les badges de notification
const NotificationBadge = ({ count, small = false }: { count: number, small?: boolean }) => {
  if (count <= 0) return null;
  
  return (
    <View style={[
      styles.badge,
      small ? styles.smallBadge : styles.regularBadge,
      count > 99 ? styles.largeCountBadge : {}
    ]}>
      <Text style={[
        styles.badgeText,
        small ? styles.smallBadgeText : styles.regularBadgeText
      ]}>
        {count > 99 ? '99+' : count}
      </Text>
    </View>
  );
};

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
        onPress={() => {
          if (item.isPromotion && item.promotionId) {
            router.push({
              pathname: "/(tabs)/Auth/Panier/PromoDetail",
              params: { id: item.promotionId.toString() } // ✅ safe
            });
          } else {
            router.push({
              pathname: '/(tabs)/Auth/Panier/DetailId',
              params: { id: item.id.toString() }
            });
          }
        }}
        >

        <Image 
          source={{ uri: item.images[0] || 'https://via.placeholder.com/400' }} 
          style={styles.productImage}
          resizeMode="cover"
        />
        
        {/* Badge Promotion */}
        {item.isPromotion && (
          <View style={styles.promotionBadge}>
            <Text style={styles.promotionBadgeText}>🔥 PROMO</Text>
            {item.time_remaining && (
              <Text style={styles.timerText}>{item.time_remaining}</Text>
            )}
          </View>
        )}

        <View style={styles.priceContainer}>
          {item.isPromotion && item.original_price ? (
            <>
              <Text style={styles.originalPrice}>
                ${item.original_price.toFixed(2)}
              </Text>
              <Text style={styles.discountedPrice}>
                ${item.price.toFixed(2)}
              </Text>
              {item.discount && item.discount > 0 && (
                <View style={styles.discountBadge}>
                  <Text style={styles.discountBadgeText}>
                    -{item.discount}%
                  </Text>
                </View>
              )}
            </>
          ) : (
            <Text style={styles.normalPrice}>
              ${item.price.toFixed(2)}
              {item.discount && item.discount > 0 && (
                <Text style={styles.discountText}> {item.discount}% OFF</Text>
              )}
            </Text>
          )}
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
          style={[styles.cartButton, item.isPromotion && styles.promotionCartButton]}
          onPress={() => handleAddToCart(item)}
        >
          <Text style={styles.cartButtonText}>
            {item.isPromotion ? '🔥 Ajouter Promo' : 'Ajouter au panier'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}, (prevProps, nextProps) => {
  return (
    prevProps.item.id === nextProps.item.id &&
    prevProps.item.isLiked === nextProps.item.isLiked &&
    prevProps.item.likes === nextProps.item.likes &&
    prevProps.item.comments === nextProps.item.comments &&
    prevProps.item.shares === nextProps.item.shares &&
    prevProps.item.isPromotion === nextProps.item.isPromotion
  );
});

// Données mockées pour les notifications
const MOCK_NOTIFICATIONS: Notification[] = [
  {
    id: '1',
    title: 'Nouvelle Promotion 🔥',
    message: 'Réduction de 50% sur les smartphones Samsung',
    type: 'promotion',
    isRead: false,
    createdAt: new Date(Date.now() - 1000 * 60 * 30).toISOString(), // 30 minutes ago
    icon: 'flash',
    data: { promotionId: 123 }
  },
  {
    id: '2',
    title: 'Message du vendeur',
    message: 'Votre commande #12345 a été expédiée',
    type: 'message',
    isRead: false,
    createdAt: new Date(Date.now() - 1000 * 60 * 120).toISOString(), // 2 heures ago
    icon: 'chatbubble'
  },
  {
    id: '3',
    title: 'Nouveau commentaire',
    message: 'Marie a commenté votre produit "Téléphone Xiaomi"',
    type: 'comment',
    isRead: false,
    createdAt: new Date(Date.now() - 1000 * 60 * 180).toISOString(), // 3 heures ago
    icon: 'heart'
  },
  {
    id: '4',
    title: 'Commande confirmée',
    message: 'Votre commande #12346 a été confirmée',
    type: 'order',
    isRead: true,
    createdAt: new Date(Date.now() - 1000 * 60 * 240).toISOString(), // 4 heures ago
    icon: 'bag-check'
  },
  {
    id: '5',
    title: 'Nouveau produit dans vos favoris',
    message: 'Le produit "Casque Bluetooth" est maintenant en stock',
    type: 'system',
    isRead: false,
    createdAt: new Date(Date.now() - 1000 * 60 * 300).toISOString(), // 5 heures ago
    icon: 'notifications'
  },
  {
    id: '6',
    title: 'Promotion spéciale 🎉',
    message: 'Black Friday - Jusqu\'à 70% de réduction sur toute la boutique',
    type: 'promotion',
    isRead: false,
    createdAt: new Date(Date.now() - 1000 * 60 * 360).toISOString(), // 6 heures ago
    icon: 'pricetag'
  }
];

const ShopApp = () => {
  const router = useRouter();
  const [products, setProducts] = useState<Product[]>([]);
  const [normalProducts, setNormalProducts] = useState<Product[]>([]);
  const [promotionProducts, setPromotionProducts] = useState<Product[]>([]);
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
  
  // États pour les notifications
  const [notifications, setNotifications] = useState<Notification[]>(MOCK_NOTIFICATIONS);
  const [unreadCount, setUnreadCount] = useState(0);
  const [badgeCounts, setBadgeCounts] = useState({
    promotion: 2,
    discover: 1,
    cart: 3,
    profile: 1,
    notification: 5
  });

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

  // Calculer le nombre de notifications non lues
  useEffect(() => {
    const unread = notifications.filter(n => !n.isRead).length;
    setUnreadCount(unread);
    
    // Mettre à jour les badges
    setBadgeCounts(prev => ({
      ...prev,
      notification: unread,
      promotion: notifications.filter(n => n.type === 'promotion' && !n.isRead).length,
      cart: notifications.filter(n => n.type === 'order' && !n.isRead).length
    }));
  }, [notifications]);

  // Fonction pour marquer toutes les notifications comme lues
  const markAllAsRead = useCallback(() => {
    setNotifications(prev => 
      prev.map(notification => ({ ...notification, isRead: true }))
    );
    showNotification('✅ Toutes les notifications marquées comme lues');
  }, [showNotification]);

  // Fonction pour marquer une notification comme lue
  const markAsRead = useCallback((id: string) => {
    setNotifications(prev =>
      prev.map(notification =>
        notification.id === id ? { ...notification, isRead: true } : notification
      )
    );
  }, []);

  // Fonction pour mélanger les produits normaux et promotions
  const shuffleProducts = useCallback((normals: Product[], promotions: Product[]) => {
    const allProducts = [...normals, ...promotions];
    return shuffleArray(allProducts);
  }, []);

  // Récupérer les promotions
  const fetchPromotions = useCallback(async () => {
    try {
      const token = await AsyncStorage.getItem('userToken');
      
      if (!token) {
        console.warn('Token JWT manquant !');
        return [];
      }

      const response = await axios.get(PROMOTIONS_API_URL, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.data && response.data.success && response.data.promotions) {
        const promotions = response.data.promotions.map((promo: any) => {
          const images = Array.isArray(promo.images) 
            ? promo.images 
            : (typeof promo.images === 'string' ? [promo.images] : ['https://via.placeholder.com/400']);
          
          const discount = promo.original_price && promo.promo_price
            ? Math.round(((promo.original_price - promo.promo_price) / promo.original_price) * 100)
            : 0;

          return {
            id: `promo_${promo.promotionId}`,
            promotionId: promo.promotionId,
            title: promo.product_title || 'Promotion',
            description: promo.description || 'Produit en promotion',
            price: Number(promo.promo_price) || 0,
            original_price: Number(promo.original_price) || 0,
            discount: discount,
            images: images,
            seller: {
              id: promo.seller?.id?.toString() || '1',
              name: promo.seller?.name || 'Vendeur SHOPNET',
              avatar: promo.seller?.avatar || 'https://via.placeholder.com/40',
            },
            rating: 4.5, // Valeur par défaut pour les promotions
            comments: 0,
            likes: 0,
            isLiked: false,
            shares: 0,
            location: promo.seller?.address || 'Lubumbashi',
            isPromotion: true,
            duration_days: promo.duration_days || 7,
            created_at: promo.created_at || new Date().toISOString(),
            time_remaining: calculateTimeRemaining(
              promo.created_at || new Date().toISOString(),
              promo.duration_days || 7
            )
          };
        });

        return promotions;
      }
      return [];
    } catch (error) {
      console.error('Erreur lors de la récupération des promotions:', error);
      return [];
    }
  }, []);

  // Récupérer les produits normaux
  const fetchNormalProducts = useCallback(async (page = 1) => {
    try {
      const token = await AsyncStorage.getItem('userToken');

      if (!token) {
        console.warn('Token JWT manquant !');
        showNotification("Veuillez vous connecter");
        return { products: [], totalPages: 1 };
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

 const formattedProducts = response.data.products.map((product: any) => {
  // S'assurer que images est un tableau non vide d'URLs valides
  const images = Array.isArray(product.images)
    ? product.images.filter((img: string) => typeof img === 'string' && img.trim() !== '')
    : [];

  return {
    id: product.id?.toString() ?? '',
    title: product.title ?? 'Titre non disponible',
    description: product.description ?? 'Description non disponible',
    price: Number(product.price) ?? 0,
    discount: product.original_price
      ? Math.round((1 - product.price / product.original_price) * 100)
      : 0,
    images: images.length > 0
      ? images.map((img: string) => img.startsWith('http') ? img : `${API_BASE_URL}${img}`)
      : ['https://via.placeholder.com/400'], // fallback si pas d'image
    seller: {
      id: product.seller?.id?.toString() ?? "1",
      name: product.seller?.name ?? "Vendeur inconnu",
      avatar: product.seller?.avatar
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
    isPromotion: false
  };
});

      return {
        products: formattedProducts,
        totalPages: response.data.totalPages || 1
      };
    } catch (error: any) {
      console.error('Erreur de chargement des produits :', error);
      return { products: [], totalPages: 1 };
    }
  }, [feedType, activeCategory, categories, showNotification]);

  // Charger les données
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

      // Charger les promotions (uniquement pour la première page ou lors du rafraîchissement)
      if (page === 1 || isRefreshing) {
        const promotions = await fetchPromotions();
        setPromotionProducts(promotions);
      }

      // Charger les produits normaux
      const normalData = await fetchNormalProducts(page);
      
      if (page === 1 || isRefreshing) {
        setNormalProducts(normalData.products);
      } else {
        setNormalProducts(prev => [...prev, ...normalData.products]);
      }

      setCurrentPage(page);
      setTotalPages(normalData.totalPages);

      // Mélanger les produits (normaux + promotions) pour affichage
      const allNormals = page === 1 ? normalData.products : [...normalProducts, ...normalData.products];
      const allPromotions = promotionProducts;
      
      // Mélanger aléatoirement tous les produits
      const shuffled = shuffleProducts(allNormals, allPromotions);
      setProducts(shuffled);

    } catch (error: any) {
      console.error('Erreur lors du chargement des données:', error);
      showNotification("Erreur de chargement des produits");
    } finally {
      setLoading(false);
      setRefreshing(false);
      setIsLoadingMore(false);
    }
  }, [fetchPromotions, fetchNormalProducts, shuffleProducts, normalProducts, promotionProducts]);

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
      // 🔹 Vérifier que le token existe
      const token = await AsyncStorage.getItem('userToken');
      if (!token) {
        showNotification('⚠️ Authentification requise');
        return;
      }

      // 🔹 Construire l'objet à envoyer
      const cartItem = {
        product_id: product.isPromotion ? product.promotionId : product.id,
        title: product.title,
        description: product.description || '',
        price: product.price,
        original_price: product.original_price || product.price,
        category: categories[activeCategory]?.replace(/[^a-zA-Z]/g, '') || '',
        condition: 'new',
        quantity: 1,
        stock: 10,
        location: product.location || '',
        delivery_options: { pickup: true, delivery: true },
        images: product.images || [],
        seller_id: product.seller?.id || '',
        seller_name: product.seller?.name || '',
        seller_rating: product.rating || 0,
      };

      // 🔹 Endpoint correct selon le type de produit
      const endpoint = product.isPromotion
        ? 'https://shopnet-backend.onrender.com/api/cart' // même endpoint pour promotions
        : 'https://shopnet-backend.onrender.com/api/cart'; // même endpoint pour produits normaux

      console.log('➡️ Endpoint:', endpoint);
      console.log('➡️ Cart Item envoyé:', cartItem);
      console.log('➡️ Token présent:', !!token);

      // 🔹 Appel POST vers le backend
      const res = await authApi.post(endpoint, cartItem, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (res?.data?.success) {
        // ✅ Notification utilisateur
        showNotification(`✅ ${product.isPromotion ? 'Promotion' : 'Produit'} ajouté au panier !`);

        const userNotification: Notification = {
          id: `cart_${Date.now()}`,
          title: 'Produit ajouté au panier 🛒',
          message: `Vous avez ajouté "${product.title}" à votre panier`,
          type: 'system',
          isRead: false,
          createdAt: new Date().toISOString(),
          icon: 'cart',
          data: { productId: product.id }
        };

        setNotifications(prev => [userNotification, ...prev]);
        setBadgeCounts(prev => ({
          ...prev,
          cart: prev.cart + 1,
          notification: prev.notification + 1
        }));

        // 🔔 Notification vendeur
        const sellerNotification: Notification = {
          id: `seller_${Date.now()}`,
          title: 'Un de vos produits a été ajouté au panier 🛒',
          message: `"${product.title}" a été ajouté au panier par un client.`,
          type: 'system',
          isRead: false,
          createdAt: new Date().toISOString(),
          icon: 'cart',
          data: { productId: product.id, buyerId: res.data.userId || null }
        };

        // Ici, tu peux envoyer cette notification au store global ou à une route API notifications
        console.log('🔔 Notification vendeur:', sellerNotification);

        // 🔹 Son si activé
        if (soundRef.current) {
          await soundRef.current.replayAsync();
        }

      } else {
        console.warn('⚠️ Backend renvoie success=false', res.data);
        showNotification('⚠️ Impossible d\'ajouter au panier.');
      }

    } catch (error: any) {
      console.error('❌ Erreur lors de l\'ajout au panier:', error);
      showNotification('❌ Erreur lors de l\'ajout au panier');
    }
  },
  [activeCategory, categories, showNotification]
);



  const handleLike = useCallback(async (productId: string) => {
    let previousLikeState = false;
    let previousLikesCount = 0;

    try {
      console.log('🔹 Début handleLike pour productId:', productId);

      // Trouver le produit pour créer une notification
      const product = products.find(p => p.id === productId);
      
      // Mise à jour immédiate de l'UI
      setProducts(prevProducts =>
        prevProducts.map(product => {
          if (product.id === productId) {
            previousLikeState = product.isLiked;
            previousLikesCount = product.likes ?? 0;

            const newLikeState = !product.isLiked;
            const newLikesCount = newLikeState
              ? previousLikesCount + 1
              : Math.max(0, previousLikesCount - 1);

            // Créer une notification si l'utilisateur aime le produit
            if (newLikeState && !previousLikeState && product) {
              const newNotification: Notification = {
                id: `like_${Date.now()}`,
                title: 'Nouveau like ❤️',
                message: `Vous avez aimé "${product.title}"`,
                type: 'like',
                isRead: false,
                createdAt: new Date().toISOString(),
                icon: 'heart',
                data: { productId: product.id }
              };
              
              setNotifications(prev => [newNotification, ...prev]);
              setBadgeCounts(prev => ({
                ...prev,
                notification: prev.notification + 1
              }));
            }

            return { ...product, isLiked: newLikeState, likes: newLikesCount };
          }
          return product;
        })
      );

      const token = await AsyncStorage.getItem('userToken');
      if (!token) {
        showNotification('Authentification requise');
        console.warn('⚠️ Aucun token trouvé.');
        return;
      }

      console.log('➡️ Envoi du like au serveur...');

      // Envoi au serveur (adapter l'URL selon que c'est une promotion ou un produit normal)
    // const endpoint = productId.startsWith('promo_') 
    //   ? `http://100.64.134.89:5000/api/promotions/${productId.replace('promo_', '')}/like` // Serveur LOCAL (commenté)
    //   : `http://100.64.134.89:5000/api/interactions/${productId}/like`; // Serveur LOCAL (commenté)

    const endpoint = productId.startsWith('promo_') 
      ? `https://shopnet-backend.onrender.com/api/promotions/${productId.replace('promo_', '')}/like` // Serveur Render (production)
      : `https://shopnet-backend.onrender.com/api/interactions/${productId}/like`; // Serveur Render (production)


      const response = await axios.post(
        endpoint,
        {},
        { headers: { Authorization: `Bearer ${token}` }, timeout: 10000 }
      );

      console.log('✅ Réponse du serveur:', response.data);

      if (!response.data.success) {
        throw new Error(response.data.message || 'Erreur lors du like');
      }

      console.log(`🔹 Like effectué avec succès: liked=${response.data.liked}`);

    } catch (error: any) {
      console.error('❌ Erreur handleLike :', error);

      // Restauration de l'état précédent en cas d'erreur
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
  }, [products, showNotification]);

  const handleComment = useCallback((productId: string) => {
    const product = products.find(p => p.id === productId);
    
    if (product) {
      // Créer une notification pour le commentaire
      const newNotification: Notification = {
        id: `comment_${Date.now()}`,
        title: 'Nouveau commentaire 💬',
        message: `Vous avez commenté "${product.title}"`,
        type: 'comment',
        isRead: false,
        createdAt: new Date().toISOString(),
        icon: 'chatbubble',
        data: { productId: product.id }
      };
      
      setNotifications(prev => [newNotification, ...prev]);
      setBadgeCounts(prev => ({
        ...prev,
        notification: prev.notification + 1
      }));
    }
    
    router.push({
      pathname: '/(tabs)/Auth/Produits/Commentaire',
      params: { productId }
    });
  }, [products, router]);

  const handleShare = useCallback(async (product: Product) => {
    try {
      const token = await AsyncStorage.getItem('userToken');
      if (!token) {
        showNotification('Authentification requise');
        return;
      }

      const shareOptions = {
        title: product.isPromotion ? `🔥 PROMO: ${product.title}` : `Partager ${product.title}`,
        message: product.isPromotion 
          ? `🔥 PROMOTION EXCEPTIONNELLE !\n${product.title}\nPrix original: $${product.original_price}\nPrix promo: $${product.price}\n${product.description}\n\nNe manquez pas cette offre!`
          : `Découvrez ce produit: ${product.title} - ${product.price}$\n${product.description}`,
        ...(product.images?.length ? { url: product.images[0] } : {}),
      };

      const result = await Share.share(shareOptions);

      if (result.action === Share.sharedAction) {
        // Mettre à jour le compteur de partages
        setProducts(prevProducts =>
          prevProducts.map(p =>
            p.id === product.id ? { ...p, shares: (p.shares || 0) + 1 } : p
          )
        );

        // Créer une notification pour le partage
        const newNotification: Notification = {
          id: `share_${Date.now()}`,
          title: 'Produit partagé 🔄',
          message: `Vous avez partagé "${product.title}"`,
          type: 'system',
          isRead: false,
          createdAt: new Date().toISOString(),
          icon: 'share-social',
          data: { productId: product.id }
        };
        
        setNotifications(prev => [newNotification, ...prev]);
        setBadgeCounts(prev => ({
          ...prev,
          notification: prev.notification + 1
        }));
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
    // Réinitialiser la liste des produits pour re-mélanger
    setProducts([]);
  }, []);

  // Gérer la navigation avec les badges
  const handleTabPress = useCallback((screen: string, index: number) => {
    setActiveTab(index);
    
    // Réinitialiser le badge pour cet onglet
    if (screen === 'Home') {
      setBadgeCounts(prev => ({ ...prev, promotion: 0 }));
    } else if (screen === 'Discover') {
      setBadgeCounts(prev => ({ ...prev, discover: 0 }));
    } else if (screen === 'Messages') {
      setBadgeCounts(prev => ({ ...prev, cart: 0 }));
    } else if (screen === 'Profile') {
      setBadgeCounts(prev => ({ ...prev, profile: 0 }));
    }
    
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
  }, [router]);

  const handleNotificationPress = useCallback(() => {
    // Réinitialiser le badge des notifications
    setBadgeCounts(prev => ({ ...prev, notification: 0 }));
    // Marquer toutes les notifications comme lues
    markAllAsRead();
    // Naviguer vers la page des notifications
    router.push('/(tabs)/Auth/Notification/NotificationsUser');
  }, [router, markAllAsRead]);

  // Mémoïser les fonctions
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
        <Text style={styles.loadingText}>Chargement des produits...</Text>
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
            onPress={handleNotificationPress}
          >
            <View style={styles.iconContainer}>
              <FontAwesome name="bell" size={20} color="#333" />
              <NotificationBadge count={badgeCounts.notification} />
            </View>
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.iconButton}
            onPress={() => router.push('/(tabs)/Auth/Produits/profil-debug')}
          >
            <View style={styles.iconContainer}>
              <FontAwesome name="user-circle" size={20} color="#333" />
              <NotificationBadge count={badgeCounts.profile} small />
            </View>
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
            <FontAwesome name="shopping-bag" size={60} color="#ccc" />
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
            onPress={() => handleTabPress(screen, index)}
          >
            <View style={styles.navIconContainer}>
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
              {screen === 'Home' && badgeCounts.promotion > 0 && (
                <NotificationBadge count={badgeCounts.promotion} small />
              )}
              {screen === 'Discover' && badgeCounts.discover > 0 && (
                <NotificationBadge count={badgeCounts.discover} small />
              )}
              {screen === 'Messages' && badgeCounts.cart > 0 && (
                <NotificationBadge count={badgeCounts.cart} small />
              )}
              {screen === 'Profile' && badgeCounts.profile > 0 && (
                <NotificationBadge count={badgeCounts.profile} small />
              )}
            </View>
            <Text style={[
              styles.navLabel,
              activeTab === index && styles.activeNavLabel
            ]}>
              {screen === 'Home' ? 'Promotion' :
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
    alignItems: 'center',
    backgroundColor: '#fff'
  },
  loadingText: {
    marginTop: 10,
    color: '#666',
    fontSize: 16
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
    marginTop: 20,
    marginBottom: 20,
    textAlign: 'center'
  },
  retryButton: {
    backgroundColor: '#4CAF50',
    paddingVertical: 12,
    paddingHorizontal: 25,
    borderRadius: 8,
    elevation: 2
  },
  retryButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16
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
    borderBottomColor: '#e0e0e0',
    elevation: 2
  },
  logo: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#4CAF50'
  },
  headerIcons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 20
  },
  searchIcon: {
    padding: 5
  },
  iconButton: {
    padding: 5,
    position: 'relative'
  },
  iconContainer: {
    position: 'relative',
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
    paddingVertical: 10,
    borderRadius: 20,
    marginRight: 10,
    backgroundColor: '#f0f2f5',
    elevation: 1
  },
  activeCategoryPill: {
    backgroundColor: '#4CAF50'
  },
  categoryText: {
    color: '#666',
    fontWeight: '600',
    fontSize: 14
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
    borderBottomColor: '#e0e0e0',
    elevation: 1
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
    fontSize: 15
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
  promotionBadge: {
    position: 'absolute',
    top: 10,
    left: 10,
    backgroundColor: 'rgba(255, 87, 34, 0.9)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    flexDirection: 'row',
    alignItems: 'center'
  },
  promotionBadgeText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 12
  },
  timerText: {
    color: '#FFD700',
    fontWeight: 'bold',
    fontSize: 10,
    marginLeft: 5
  },
  priceContainer: {
    position: 'absolute',
    bottom: 10,
    left: 10,
    backgroundColor: 'rgba(0,0,0,0.7)',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center'
  },
  originalPrice: {
    color: '#aaa',
    textDecorationLine: 'line-through',
    fontSize: 14,
    marginRight: 8
  },
  discountedPrice: {
    color: '#FFD700',
    fontWeight: 'bold',
    fontSize: 18
  },
  normalPrice: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 18
  },
  discountText: {
    color: '#FFD700',
    fontSize: 12,
    marginLeft: 5
  },
  discountBadge: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginLeft: 8
  },
  discountBadgeText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: 'bold'
  },
  productInfo: {
    paddingHorizontal: 12,
    paddingVertical: 10
  },
  productTitle: {
    fontSize: 17,
    fontWeight: 'bold',
    color: '#333'
  },
  productDescription: {
    color: '#666',
    marginTop: 4,
    fontSize: 14,
    lineHeight: 20
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
    fontSize: 13,
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
    gap: 20
  },
  socialButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5
  },
  cartButton: {
    backgroundColor: '#4CAF50',
    borderRadius: 8,
    paddingHorizontal: 20,
    paddingVertical: 10,
    elevation: 2
  },
  promotionCartButton: {
    backgroundColor: '#FF5722'
  },
  cartButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 14
  },
  enhancedBottomNav: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    paddingVertical: 12,
    paddingHorizontal: 5,
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    elevation: 8
  },
  navButton: {
    alignItems: 'center',
    flex: 1,
    position: 'relative'
  },
  navIconContainer: {
    position: 'relative',
  },
  navLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 4
  },
  activeNavLabel: {
    color: '#4CAF50',
    fontWeight: 'bold'
  },
  // Styles pour les badges de notification
  badge: {
    position: 'absolute',
    top: -5,
    right: -5,
    backgroundColor: '#FF3B30',
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#fff',
    minWidth: 18,
    height: 18,
    zIndex: 100,
  },
  smallBadge: {
    minWidth: 16,
    height: 16,
    top: -3,
    right: -3,
  },
  regularBadge: {
    minWidth: 20,
    height: 20,
    top: -8,
    right: -8,
  },
  largeCountBadge: {
    minWidth: 24,
    paddingHorizontal: 4,
  },
  badgeText: {
    color: '#fff',
    fontWeight: 'bold',
    textAlign: 'center',
  },
  smallBadgeText: {
    fontSize: 9,
  },
  regularBadgeText: {
    fontSize: 11,
  },
});

export default ShopApp;