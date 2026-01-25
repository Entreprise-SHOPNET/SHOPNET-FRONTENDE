




// BoutiquePremium.tsx
// BoutiquePremium.tsx
import React, { useEffect, useRef, useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  Animated,
  Alert,
  Dimensions,
  Image,
  SafeAreaView,
  StatusBar,
  FlatList,
  Platform,
  ScrollView,
  Easing,
  Linking,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter, useLocalSearchParams } from "expo-router";
import { FontAwesome5, Ionicons, Feather, MaterialCommunityIcons, MaterialIcons, AntDesign } from "@expo/vector-icons";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");
const SHOPNET_BLUE = "#00182A";
const PREMIUM_GOLD = "#FFA726";


// 🔹 Serveur Render en production
const LOCAL_API = "https://shopnet-backend.onrender.com/api";

// 🔹 Serveur local pour développement (commenté)
// const LOCAL_API = "http://100.64.134.89:5000/api";


// Configuration Cloudinary
const CLOUDINARY_CLOUD_NAME = "dddr7gb6w";
const CLOUDINARY_API_KEY = "333693199574515";
const CLOUDINARY_API_SECRET = "_eK8E7dCux4lR69IwnVvCGeZTAg";

const FIXED_HEADER_HEIGHT = Platform.OS === "ios" ? 94 : 88;

// Types pour les données
interface Boutique {
  id: number;
  nom: string;
  type: 'premium';
  type_boutique?: string;
  categorie?: string;
  description?: string;
  logo?: string;
  email?: string;
  phone?: string;
  adresse?: string;
  ville?: string;
  pays?: string;
  codePostal?: string;
  statut: 'pending_payment' | 'pending_validation' | 'validé' | 'rejeté';
  prix?: number;
  devise?: string;
  date_creation?: string;
  date_expiration?: string;
  jours_restants?: number;
  proprietaire?: {
    nom: string;
    email: string;
    phone: string;
  };
}

interface Product {
  id: string | number;
  nom?: string;
  name?: string;
  prix?: number;
  price?: number;
  amount?: number;
  image?: string;
  imageUrl?: string;
  images?: string[];
  photo?: string;
  description?: string;
  boutique_id?: number;
  created_at?: string;
  updated_at?: string;
  views?: number;
  likes?: number;
  shares?: number;
  comments?: number;
  orders?: number;
  status?: 'active' | 'inactive' | 'sold';
}

interface Stats {
  success: boolean;
  totalCommandes: number;
  totalRevenu: string;
  totalVues: string;
  totalLikes?: number;
  totalPartages?: number;
  totalCommentaires?: number;
  totalVuesCalculees?: string;
}

interface NotificationCounts {
  sell: number;
  analytics: number;
  orders: number;
  profile: number;
  clients: number;
  promotions: number;
}

export default function BoutiquePremium() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const [loading, setLoading] = useState(true);
  const [boutique, setBoutique] = useState<Boutique | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [stats, setStats] = useState<Stats>({
    success: false,
    totalCommandes: 0,
    totalRevenu: "0",
    totalVues: "0"
  });
  
  const [notificationCounts, setNotificationCounts] = useState<NotificationCounts>({
    sell: 0,
    analytics: 0,
    orders: 0,
    profile: 0,
    clients: 0,
    promotions: 0
  });
  
  // État pour le paiement expiré
  const [showPaymentScreen, setShowPaymentScreen] = useState(false);
  
  // Calcul des vues basées sur les données de l'API
  const [calculatedViews, setCalculatedViews] = useState<string>("0");

  // Références pour éviter les boucles
  const isFetchingRef = useRef(false);
  const mountedRef = useRef(true);
  
  // Animations
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;
  const headerScrollAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    logger.info('Composant BoutiquePremium monté', { params });
    
    // Marquer que le composant est monté
    mountedRef.current = true;
    
    // Vérifier si nous devons charger les données
    const shouldLoad = async () => {
      if (params.boutiqueId) {
        // Si un ID de boutique est passé, charger directement
        await fetchBoutiqueAndProducts();
      } else {
        // Sinon vérifier via le token
        await checkAndLoadBoutique();
      }
    };
    
    shouldLoad();
    
    // Animation pulsante pour les notifications
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.2,
          duration: 500,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 500,
          useNativeDriver: true,
        }),
      ])
    ).start();
    
    // Cleanup à la destruction du composant
    return () => {
      mountedRef.current = false;
      isFetchingRef.current = false;
    };
  }, []);

  const logger = {
    info: (message: string, data?: any) => {
      console.log(`[BOUTIQUE-PREMIUM] INFO: ${message}`, data || '');
    },
    error: (message: string, error?: any) => {
      console.error(`[BOUTIQUE-PREMIUM] ERROR: ${message}`, error || '');
    },
    warn: (message: string, data?: any) => {
      console.warn(`[BOUTIQUE-PREMIUM] WARN: ${message}`, data || '');
    }
  };

  // Fonction pour formater les nombres
  const formatNumber = (num: number): string => {
    if (num >= 1000000000) {
      return (num / 1000000000).toFixed(1).replace(/\.0$/, '') + 'Md';
    }
    if (num >= 1000000) {
      return (num / 1000000).toFixed(1).replace(/\.0$/, '') + 'M';
    }
    if (num >= 1000) {
      return (num / 1000).toFixed(1).replace(/\.0$/, '') + 'K';
    }
    return num.toString();
  };

  // Fonction pour formater le revenu
  const formatRevenue = (revenue: string): string => {
    try {
      const num = parseFloat(revenue);
      if (isNaN(num)) return "0";
      return formatNumber(num);
    } catch {
      return "0";
    }
  };

  // Fonction pour calculer les vues basées sur les interactions de l'API
  const calculateViewsFromAPI = (stats: Stats): string => {
    try {
      const baseViews = parseInt(stats.totalVues) || 0;
      const likes = stats.totalLikes || 0;
      const shares = stats.totalPartages || 0;
      const comments = stats.totalCommentaires || 0;
      const orders = stats.totalCommandes || 0;
      
      // Formule: vues de base + (likes * 0.5) + (shares * 2) + (comments * 0.7) + (orders * 2)
      const calculated = baseViews + 
        (likes * 0.5) + 
        (shares * 2) + 
        (comments * 0.7) + 
        (orders * 2);
      
      return Math.round(calculated).toString();
    } catch {
      return stats.totalVues || "0";
    }
  };

  // Fonction pour générer des nombres aléatoires pour les notifications
  const generateRandomNotifications = () => {
    return {
      sell: Math.floor(Math.random() * 15) + 1,
      analytics: Math.floor(Math.random() * 10) + 1,
      orders: Math.floor(Math.random() * 20) + 1,
      profile: Math.floor(Math.random() * 5) + 1,
      clients: Math.floor(Math.random() * 12) + 1,
      promotions: Math.floor(Math.random() * 8) + 1
    };
  };

  // Fonction pour construire l'URL Cloudinary
  const buildCloudinaryUrl = (imagePath: string): string => {
    if (!imagePath) return "https://via.placeholder.com/400x300?text=No+Image";
    
    // Si c'est déjà une URL complète, la retourner telle quelle
    if (imagePath.startsWith('http')) {
      return imagePath;
    }
    
    // Si c'est un chemin Cloudinary, construire l'URL complète
    if (imagePath.startsWith('v')) {
      return `https://res.cloudinary.com/${CLOUDINARY_CLOUD_NAME}/image/upload/${imagePath}`;
    }
    
    // Sinon, utiliser le placeholder
    return "https://via.placeholder.com/400x300?text=No+Image";
  };

  const checkAndLoadBoutique = async () => {
    try {
      const token = await AsyncStorage.getItem("userToken");
      if (!token) {
        if (mountedRef.current) {
          setLoading(false);
        }
        return;
      }
      
      await fetchBoutiqueAndProducts();
    } catch (error) {
      logger.error("Erreur vérification boutique", error);
      if (mountedRef.current) {
        setLoading(false);
      }
    }
  };

  const fetchBoutiqueAndProducts = useCallback(async () => {
    // Éviter les appels parallèles
    if (isFetchingRef.current) {
      logger.info("Déjà en train de récupérer les données, annulation");
      return;
    }
    
    try {
      isFetchingRef.current = true;
      if (mountedRef.current) {
        setLoading(true);
      }
      
      const token = await AsyncStorage.getItem("userToken");
      if (!token) {
        throw new Error("Token non trouvé");
      }

      logger.info("Début récupération boutique, produits et statistiques");

      // 1. Récupérer la boutique
      const boutiqueData = await fetchBoutique(token);
      if (!boutiqueData) {
        if (mountedRef.current) {
          setBoutique(null);
          setLoading(false);
        }
        return;
      }

      // Vérifier si la boutique a expiré
      if (boutiqueData.jours_restants !== undefined && boutiqueData.jours_restants <= 0) {
        if (mountedRef.current) {
          setBoutique(boutiqueData);
          setShowPaymentScreen(true);
          setLoading(false);
        }
        return;
      }

      // 2. Récupérer les produits (tous les produits en vente)
      let productsData: Product[] = [];
      if (boutiqueData.statut === 'validé' && boutiqueData.id) {
        productsData = await fetchAllProducts(token, boutiqueData.id);
      }

      // 3. Récupérer les statistiques via le nouvel endpoint
      const statsData = await fetchStats(token, boutiqueData.id);

      // 4. Calculer les vues basées sur les données de l'API
      const calculatedViews = calculateViewsFromAPI(statsData);

      // 5. Générer de nouvelles notifications aléatoires
      const notificationsData = generateRandomNotifications();

      // 6. Mettre à jour l'état
      if (mountedRef.current) {
        setBoutique(boutiqueData);
        setProducts(productsData);
        setStats(statsData);
        setNotificationCounts(notificationsData);
        setCalculatedViews(calculatedViews);
        setShowPaymentScreen(false);
        
        // 7. Démarrer les animations
        startAnimations();
      }

    } catch (error: any) {
      logger.error("Erreur lors du chargement:", error);
      
      if (mountedRef.current) {
        Alert.alert(
          "Erreur",
          error.message || "Impossible de charger les données",
          [{ text: "OK" }]
        );
      }
    } finally {
      if (mountedRef.current) {
        setLoading(false);
      }
      isFetchingRef.current = false;
    }
  }, []);

  const fetchBoutique = async (token: string): Promise<Boutique | null> => {
    try {
      logger.info("Récupération boutique");
      const response = await fetch(
        `${LOCAL_API}/boutique/premium/check`,
        { 
          headers: { 
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json'
          } 
        }
      );
      
      if (!response.ok) {
        if (response.status === 401) {
          throw new Error("Token invalide ou expiré");
        }
        throw new Error(`Erreur serveur: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (!data.success || !data.hasBoutique || !data.boutique) {
        return null;
      }
      
      return data.boutique;
    } catch (error) {
      logger.error("Erreur récupération boutique", error);
      throw error;
    }
  };

  const fetchAllProducts = async (token: string, boutiqueId: number): Promise<Product[]> => {
    try {
      logger.info(`Récupération de TOUS les produits pour boutique ${boutiqueId}`);
      
      const response = await fetch(
        `${LOCAL_API}/boutique/premium/${boutiqueId}/all-products`,
        { 
          headers: { 
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json'
          } 
        }
      );
      
      if (!response.ok) {
        logger.warn(`Produits non récupérés: ${response.status}`);
        // Essayer l'endpoint standard si l'autre ne fonctionne pas
        return await fetchProductsFallback(token, boutiqueId);
      }
      
      const data = await response.json();
      
      if (data.success && Array.isArray(data.products)) {
        return data.products;
      }
      
      return [];
    } catch (error) {
      logger.error("Erreur récupération produits", error);
      return [];
    }
  };

  const fetchProductsFallback = async (token: string, boutiqueId: number): Promise<Product[]> => {
    try {
      const response = await fetch(
        `${LOCAL_API}/boutique/premium/${boutiqueId}/products`,
        { 
          headers: { 
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json'
          } 
        }
      );
      
      if (!response.ok) {
        return [];
      }
      
      const data = await response.json();
      
      if (data.success && Array.isArray(data.products)) {
        return data.products;
      }
      
      return [];
    } catch (error) {
      return [];
    }
  };

  // Fonction pour récupérer les statistiques via le nouvel endpoint
  const fetchStats = async (token: string, boutiqueId: number): Promise<Stats> => {
    try {
      logger.info(`Récupération des statistiques pour boutique ${boutiqueId}`);
      
      const response = await fetch(
        `${LOCAL_API}/boutique/premium/${boutiqueId}/stats`,
        { 
          headers: { 
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json'
          } 
        }
      );
      
      if (!response.ok) {
        logger.warn(`Statistiques non récupérées: ${response.status}`);
        // Retourner des valeurs par défaut
        return {
          success: true,
          totalCommandes: 0,
          totalRevenu: "0",
          totalVues: "0"
        };
      }
      
      const data = await response.json();
      
      if (data.success) {
        // Retourner les données avec les nouveaux champs si disponibles
        return {
          success: data.success,
          totalCommandes: data.totalCommandes || 0,
          totalRevenu: data.totalRevenu || "0",
          totalVues: data.totalVues || "0",
          totalLikes: data.totalLikes || 0,
          totalPartages: data.totalPartages || 0,
          totalCommentaires: data.totalCommentaires || 0,
          totalVuesCalculees: data.totalVuesCalculees || "0"
        };
      }
      
      // En cas d'erreur, retourner des valeurs par défaut
      return {
        success: true,
        totalCommandes: 0,
        totalRevenu: "0",
        totalVues: "0"
      };
    } catch (error) {
      logger.error("Erreur récupération statistiques", error);
      // Retourner des valeurs par défaut en cas d'erreur
      return {
        success: true,
        totalCommandes: 0,
        totalRevenu: "0",
        totalVues: "0"
      };
    }
  };

  const startAnimations = () => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 600,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 500,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start();
  };

  const handleRefresh = async () => {
    if (isFetchingRef.current) {
      logger.info("Refresh ignoré, déjà en cours");
      return;
    }
    
    logger.info("Rafraîchissement manuel");
    
    // Réinitialiser les animations
    fadeAnim.setValue(0);
    slideAnim.setValue(20);
    
    await fetchBoutiqueAndProducts();
  };

  const handleCreateProduct = () => {
    if (!boutique) {
      Alert.alert("Erreur", "Aucune boutique disponible");
      return;
    }
    
    if (boutique.statut !== 'validé') {
      Alert.alert(
        "Boutique non active",
        "Votre boutique doit être validée pour ajouter des produits.",
        [{ text: "OK" }]
      );
      return;
    }
    
    router.push({
      pathname: "/(tabs)/Auth/Produits/Produit",
      params: { boutiqueId: boutique.id.toString() }
    });
  };

  // Fonction pour contacter le support
  const contactSupport = async (via: 'email' | 'whatsapp') => {
    try {
      if (via === 'email') {
        const email = 'Entrepriseshopia@gmail.com';
        const subject = encodeURIComponent('Support Boutique Premium');
        const body = encodeURIComponent(`Bonjour,\n\nJ'ai besoin d'assistance pour ma boutique premium.\n\nBoutique: ${boutique?.nom}\nID: ${boutique?.id}\n\nMerci.`);
        await Linking.openURL(`mailto:${email}?subject=${subject}&body=${body}`);
      } else {
        const phone = '243978727791';
        const message = encodeURIComponent('Bonjour, j\'ai besoin d\'assistance pour ma boutique premium.');
        await Linking.openURL(`https://wa.me/${phone}?text=${message}`);
      }
    } catch (error) {
      Alert.alert("Erreur", "Impossible d'ouvrir l'application");
    }
  };

  // Fonction pour naviguer vers la page de paiement d'abonnement
  const navigateToSubscriptionPayment = () => {
    if (!boutique) {
      Alert.alert("Erreur", "Aucune boutique disponible");
      return;
    }
    
    router.push({
      pathname: "/(tabs)/Auth/Boutique/Premium/PayerPremium",
      params: { 
        boutiqueId: boutique.id.toString(),
        boutiqueNom: boutique.nom,
        prix: boutique.prix?.toString() || "0",
        devise: boutique.devise || "$"
      }
    });
  };

  const getProductImageUri = (product: Product): string => {
    if (!product) return "https://via.placeholder.com/400x300?text=No+Image";
    
    // Essayer différents champs d'image et construire l'URL Cloudinary
    const imagePath = 
      product.image ||
      product.imageUrl ||
      (product.images && product.images[0]) ||
      product.photo;
    
    if (imagePath) {
      return buildCloudinaryUrl(imagePath);
    }
    
    return "https://via.placeholder.com/400x300?text=No+Image";
  };

  const getProductName = (product: Product): string => {
    return product.nom || product.name || "Produit sans nom";
  };

  const getProductPrice = (product: Product): string => {
    const price = product.prix || product.price || product.amount;
    return price ? `${price} $` : "Gratuit";
  };

  // Composant ProductImage qui gère les erreurs de chargement
  const ProductImage = ({ uri, style }: { uri: string; style: any }) => {
    const [imageUri, setImageUri] = useState(uri);
    
    const handleImageError = () => {
      setImageUri("https://via.placeholder.com/400x300?text=No+Image");
    };
    
    return (
      <Image 
        source={{ uri: imageUri }} 
        style={style} 
        onError={handleImageError}
      />
    );
  };

  const renderCarouselItem = ({ item }: { item: Product }) => {
    const uri = getProductImageUri(item);
    const name = getProductName(item);
    const price = getProductPrice(item);
    
    return (
      <View style={styles.carouselCard}>
        <ProductImage uri={uri} style={styles.carouselImage} />
        <View style={styles.carouselMeta}>
          <Text numberOfLines={1} style={styles.carouselTitle}>{name}</Text>
          <Text style={styles.carouselPrice}>{price}</Text>
          <View style={styles.featuredBadge}>
            <MaterialCommunityIcons name="crown" size={12} color="#fff" />
            <Text style={styles.featuredText}>Top</Text>
          </View>
        </View>
      </View>
    );
  };

  const renderProductGridItem = ({ item }: { item: Product }) => {
    const uri = getProductImageUri(item);
    const name = getProductName(item);
    const price = getProductPrice(item);
    
    return (
      <View style={styles.productCard}>
        <ProductImage uri={uri} style={styles.productImage} />
        <View style={styles.productInfo}>
          <Text numberOfLines={2} style={styles.productName}>{name}</Text>
          <Text style={styles.productPrice}>{price}</Text>
        </View>
      </View>
    );
  };

  // Composant Badge de Notification
  const NotificationBadge = ({ count, size = 18 }: { count: number, size?: number }) => {
    if (count <= 0) return null;
    
    return (
      <Animated.View 
        style={[
          styles.notificationBadge,
          { 
            transform: [{ scale: pulseAnim }],
            minWidth: size,
            height: size,
            borderRadius: size / 2
          }
        ]}
      >
        <Text style={[styles.notificationText, { fontSize: size * 0.6 }]}>
          {count > 9 ? '9+' : count}
        </Text>
      </Animated.View>
    );
  };

  // Composant Badge de Vérification (uniquement pour le header)
  const VerificationBadge = ({ size = 16 }: { size?: number }) => (
    <View style={[styles.verificationBadge, { width: size, height: size }]}>
      <MaterialIcons name="verified" size={size * 0.9} color="#42A5F5" />
    </View>
  );

  // Composant StatCard amélioré - NON CLIQUABLE et avec 2 vues basées sur l'API
  const StatCard = ({ icon, value, label, color, isString = false, secondValue = null, secondLabel = null }: any) => (
    <View style={styles.statCard}>
      <View style={[styles.statIcon, { backgroundColor: `${color}20` }]}>
        <FontAwesome5 name={icon} size={20} color={color} />
      </View>
      
      {secondValue ? (
        // Affichage avec deux valeurs (pour les vues)
        <View style={styles.doubleValueContainer}>
          <View style={styles.valueRow}>
            <Text style={styles.statValue}>
              {isString ? value : formatNumber(parseInt(value) || 0)}
            </Text>
            <Text style={styles.statValueLabel}>{label}</Text>
          </View>
          
          <View style={styles.valueRow}>
            <Text style={[styles.statValue, { color: PREMIUM_GOLD }]}>
              {isString ? secondValue : formatNumber(parseInt(secondValue) || 0)}
            </Text>
            <Text style={styles.statValueLabel}>{secondLabel}</Text>
          </View>
        </View>
      ) : (
        // Affichage normal avec une seule valeur
        <>
          <Text style={styles.statValue}>
            {isString ? value : formatNumber(parseInt(value) || 0)}
          </Text>
          <Text style={styles.statLabel}>{label}</Text>
        </>
      )}
    </View>
  );

  // Header animé en fonction du scroll
  const headerBackgroundColor = headerScrollAnim.interpolate({
    inputRange: [0, 50],
    outputRange: ['rgba(0, 24, 42, 0)', 'rgba(0, 24, 42, 1)'],
    extrapolate: 'clamp',
  });

  // Écran de paiement expiré
  if (showPaymentScreen && boutique) {
    return (
      <SafeAreaView style={styles.paymentContainer}>
        <StatusBar barStyle="light-content" backgroundColor={SHOPNET_BLUE} />
        
        <View style={styles.paymentHeader}>
          <TouchableOpacity onPress={() => setShowPaymentScreen(false)} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.paymentHeaderTitle}>Paiement Requis</Text>
        </View>

        <ScrollView contentContainerStyle={styles.paymentContent}>
          <View style={styles.paymentIconContainer}>
            <MaterialCommunityIcons name="crown" size={80} color={PREMIUM_GOLD} />
            <MaterialCommunityIcons name="clock-alert" size={40} color="#FF6B6B" style={styles.alertIcon} />
          </View>

          <Text style={styles.paymentTitle}>Abonnement Expiré</Text>
          
          <Text style={styles.paymentSubtitle}>
            Votre abonnement premium pour la boutique "{boutique.nom}" a expiré.
          </Text>

          <View style={styles.paymentDetails}>
            <View style={styles.detailRow}>
              <Ionicons name="calendar-outline" size={20} color="#FFA726" />
              <Text style={styles.detailText}>
                Date d'expiration: {boutique.date_expiration || 'Non disponible'}
              </Text>
            </View>
            
            <View style={styles.detailRow}>
              <Ionicons name="time-outline" size={20} color="#FF6B6B" />
              <Text style={styles.detailText}>
                Jours restants: {boutique.jours_restants || 0}
              </Text>
            </View>
            
            <View style={styles.detailRow}>
              <FontAwesome5 name="coins" size={20} color="#4DB14E" />
              <Text style={styles.detailText}>
                Montant: {boutique.prix || 0} {boutique.devise || '$'}
              </Text>
            </View>
          </View>

          <Text style={styles.paymentWarning}>
            ⚠️ Veuillez renouveler votre abonnement pour continuer à utiliser les fonctionnalités premium.
          </Text>

          <TouchableOpacity 
            style={styles.payNowButton} 
            onPress={navigateToSubscriptionPayment}
          >
            <MaterialCommunityIcons name="credit-card-check" size={24} color="#fff" />
            <Text style={styles.payNowText}>Payer Abonnement</Text>
          </TouchableOpacity>

          <View style={styles.supportSection}>
            <Text style={styles.supportTitle}>Besoin d'aide ? Contactez notre support</Text>
            
            <TouchableOpacity 
              style={styles.supportButton}
              onPress={() => contactSupport('email')}
            >
              <MaterialIcons name="email" size={20} color="#fff" />
              <Text style={styles.supportButtonText}>Email: Entrepriseshopia@gmail.com</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.supportButton}
              onPress={() => contactSupport('whatsapp')}
            >
              <FontAwesome5 name="whatsapp" size={20} color="#25D366" />
              <Text style={styles.supportButtonText}>WhatsApp: +243 97 87 27 791</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  if (loading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={PREMIUM_GOLD} />
        <Text style={styles.loadingText}>Chargement de votre boutique...</Text>
      </SafeAreaView>
    );
  }

  if (!boutique) {
    return (
      <SafeAreaView style={styles.emptyContainer}>
        <MaterialCommunityIcons name="crown" size={90} color="rgba(255,255,255,0.25)" />
        <Text style={styles.emptyTitle}>Aucune boutique Premium trouvée</Text>
        <Text style={styles.emptySubtitle}>
          Créez une boutique premium pour débloquer les fonctionnalités avancées
        </Text>
        
        <TouchableOpacity
          style={styles.createButton}
          onPress={() => router.push("/(tabs)/Auth/Boutique/CreerBoutique")}
          activeOpacity={0.8}
        >
          <MaterialCommunityIcons name="crown" size={18} color="#fff" />
          <Text style={styles.createButtonText}>Créer une boutique</Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={styles.secondaryButton}
          onPress={handleRefresh}
          activeOpacity={0.8}
        >
          <Feather name="refresh-cw" size={16} color="#fff" />
          <Text style={styles.secondaryButtonText}>Actualiser</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={SHOPNET_BLUE} />

      {/* Header fixe animé */}
      <Animated.View 
        style={[
          styles.fixedHeader,
          { backgroundColor: headerBackgroundColor }
        ]}
      >
        <View style={styles.headerLeft}>
          {boutique.logo ? (
            <Image source={{ uri: boutique.logo }} style={styles.logoImage} />
          ) : (
            <View style={styles.storeIconSmall}>
              <MaterialCommunityIcons name="crown" size={20} color={PREMIUM_GOLD} />
            </View>
          )}
          <View style={styles.shopNameContainer}>
            <View style={styles.shopNameRow}>
              <Text style={styles.shopName} numberOfLines={1}>
                {boutique.nom}
              </Text>
              <VerificationBadge size={18} />
            </View>
            <View style={styles.planBadge}>
              <MaterialCommunityIcons name="crown" size={10} color="#fff" />
              <Text style={styles.planText}>PREMIUM • Original</Text>
            </View>
          </View>
        </View>

        <View style={styles.headerRight}>
          <TouchableOpacity 
            style={styles.refreshButton}
            onPress={handleRefresh}
            activeOpacity={0.7}
          >
            <Feather name="refresh-cw" size={18} color="#fff" />
          </TouchableOpacity>
        </View>
      </Animated.View>

      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: headerScrollAnim } } }],
          { useNativeDriver: false }
        )}
        scrollEventThrottle={16}
      >
        {/* Section Hero */}
        <Animated.View 
          style={[
            styles.heroSection,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }]
            }
          ]}
        >
          <View style={styles.heroIcon}>
            <MaterialCommunityIcons name="crown" size={50} color={PREMIUM_GOLD} />
          </View>
          <Text style={styles.heroTitle}>{boutique.nom}</Text>
          <Text style={styles.heroSubtitle}>
            Boutique Premium • {boutique.categorie || 'Catégorie générale'}
          </Text>
          
          {boutique.jours_restants !== undefined && (
            <View style={[
              styles.daysRemaining,
              { 
                backgroundColor: boutique.jours_restants <= 7 
                  ? 'rgba(255, 107, 107, 0.1)' 
                  : 'rgba(77, 177, 78, 0.1)' 
              }
            ]}>
              <MaterialIcons 
                name="calendar-today" 
                size={16} 
                color={boutique.jours_restants <= 7 ? '#FF6B6B' : '#4DB14E'} 
              />
              <Text style={[
                styles.daysRemainingText,
                { color: boutique.jours_restants <= 7 ? '#FF6B6B' : '#4DB14E' }
              ]}>
                {boutique.jours_restants > 0 
                  ? `${boutique.jours_restants} jours restants` 
                  : 'Expire aujourd\'hui'}
              </Text>
            </View>
          )}

          {/* Bouton pour payer l'abonnement */}
          <TouchableOpacity 
            style={styles.subscriptionButton}
            onPress={navigateToSubscriptionPayment}
            activeOpacity={0.8}
          >
            <MaterialCommunityIcons name="credit-card-check" size={20} color="#fff" />
            <Text style={styles.subscriptionButtonText}>Payer Abonnement</Text>
          </TouchableOpacity>
        </Animated.View>

        {/* Statistiques - DONNÉES RÉELLES DE L'API */}
        <Animated.View 
          style={[
            styles.statsSection,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }]
            }
          ]}
        >
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Aperçu</Text>
            <NotificationBadge count={notificationCounts.analytics} />
          </View>
          <View style={styles.statsGrid}>
            <StatCard 
              icon="box" 
              value={products.length.toString()} 
              label="Produits" 
              color={PREMIUM_GOLD}
            />
            <StatCard 
              icon="shopping-cart" 
              value={stats.totalCommandes.toString()} 
              label="Commandes" 
              color="#4DB14E"
            />
            <StatCard 
              icon="eye" 
              value={stats.totalVues} 
              secondValue={calculatedViews}
              secondLabel="Vues calculées"
              label="Vues API" 
              color="#42A5F5"
              isString={true}
            />
            <StatCard 
              icon="dollar-sign" 
              value={formatRevenue(stats.totalRevenu)} 
              label="Revenus" 
              color="#FF6B6B"
              isString={true}
            />
          </View>
          
          {/* Affichage détaillé des statistiques - DONNÉES DE L'API */}
          <View style={styles.detailedStats}>
            <Text style={styles.detailedStatsTitle}>Statistiques détaillées</Text>
            <View style={styles.detailedStatsRow}>
              <View style={styles.detailedStatItem}>
                <Text style={styles.detailedStatLabel}>Commandes totales</Text>
                <Text style={styles.detailedStatValue}>{stats.totalCommandes}</Text>
              </View>
              <View style={styles.detailedStatItem}>
                <Text style={styles.detailedStatLabel}>Revenu total</Text>
                <Text style={styles.detailedStatValue}>{stats.totalRevenu} $</Text>
              </View>
            </View>
            <View style={styles.detailedStatsRow}>
              <View style={styles.detailedStatItem}>
                <Text style={styles.detailedStatLabel}>Vues API</Text>
                <Text style={styles.detailedStatValue}>{stats.totalVues}</Text>
              </View>
              <View style={styles.detailedStatItem}>
                <Text style={styles.detailedStatLabel}>Vues calculées</Text>
                <Text style={styles.detailedStatValue}>{formatNumber(parseInt(calculatedViews) || 0)}</Text>
              </View>
            </View>
            <View style={styles.detailedStatsRow}>
              <View style={styles.detailedStatItem}>
                <Text style={styles.detailedStatLabel}>Likes</Text>
                <Text style={styles.detailedStatValue}>{formatNumber(stats.totalLikes || 0)}</Text>
              </View>
              <View style={styles.detailedStatItem}>
                <Text style={styles.detailedStatLabel}>Partages</Text>
                <Text style={styles.detailedStatValue}>{formatNumber(stats.totalPartages || 0)}</Text>
              </View>
            </View>
            <View style={styles.detailedStatsRow}>
              <View style={styles.detailedStatItem}>
                <Text style={styles.detailedStatLabel}>Commentaires</Text>
                <Text style={styles.detailedStatValue}>{formatNumber(stats.totalCommentaires || 0)}</Text>
              </View>
              <View style={styles.detailedStatItem}>
                <Text style={styles.detailedStatLabel}>Produits actifs</Text>
                <Text style={styles.detailedStatValue}>{products.length}</Text>
              </View>
            </View>
          </View>
        </Animated.View>

        {/* Actions rapides */}
        <Animated.View 
          style={[
            styles.actionsSection,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }]
            }
          ]}
        >
          <Text style={styles.sectionTitle}>Actions</Text>
          <View style={styles.actionsGrid}>
            <TouchableOpacity style={styles.actionButton} onPress={handleCreateProduct} activeOpacity={0.8}>
              <MaterialIcons name="add-business" size={24} color={PREMIUM_GOLD} />
              <Text style={styles.actionText}>Vendre</Text>
              <NotificationBadge count={notificationCounts.sell} />
            </TouchableOpacity>

            <TouchableOpacity style={styles.actionButton} onPress={() => router.push("/(tabs)/Auth/Boutique/Premium/Analytics")} activeOpacity={0.8}>
              <MaterialIcons name="analytics" size={24} color={PREMIUM_GOLD} />
              <Text style={styles.actionText}>Analytics</Text>
              <NotificationBadge count={notificationCounts.analytics} />
            </TouchableOpacity>

            <TouchableOpacity style={styles.actionButton} onPress={() => router.push("/MisAjour")} activeOpacity={0.8}>
              <MaterialIcons name="local-offer" size={24} color={PREMIUM_GOLD} />
              <Text style={styles.actionText}>Promotion</Text>
              <NotificationBadge count={notificationCounts.promotions} />
            </TouchableOpacity>

            <TouchableOpacity style={styles.actionButton} onPress={() => router.push("/MisAjour")} activeOpacity={0.8}>
              <MaterialIcons name="people" size={24} color={PREMIUM_GOLD} />
              <Text style={styles.actionText}>Clients</Text>
              <NotificationBadge count={notificationCounts.clients} />
            </TouchableOpacity>
          </View>
        </Animated.View>

        {/* Produits en vedette */}
        <Animated.View 
          style={[
            styles.section,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }]
            }
          ]}
        >
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Produits en Vedette</Text>
            <TouchableOpacity onPress={handleCreateProduct} activeOpacity={0.7}>
              <Text style={styles.seeAllText}>+ Ajouter</Text>
            </TouchableOpacity>
          </View>

          {products.length > 0 ? (
            <FlatList
              data={products.slice(0, 5)}
              horizontal
              showsHorizontalScrollIndicator={false}
              keyExtractor={(item, idx) => (item.id?.toString() || idx.toString())}
              renderItem={renderCarouselItem}
              contentContainerStyle={styles.carouselContent}
              ItemSeparatorComponent={() => <View style={{ width: 12 }} />}
            />
          ) : (
            <View style={styles.emptyProducts}>
              <Feather name="package" size={40} color="rgba(255,255,255,0.3)" />
              <Text style={styles.emptyProductsText}>Aucun produit encore</Text>
              <Text style={styles.emptyProductsSubtext}>
                Ajoutez votre premier produit premium
              </Text>
              <TouchableOpacity 
                style={styles.addProductButton}
                onPress={handleCreateProduct}
                activeOpacity={0.8}
              >
                <Feather name="plus" size={18} color="#fff" />
                <Text style={styles.addProductText}>Premier Produit</Text>
              </TouchableOpacity>
            </View>
          )}
        </Animated.View>

        {/* Tous les produits */}
        {products.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Tous les Produits ({products.length})</Text>
              <Text style={styles.productCount}>{products.length} produits</Text>
            </View>

            <FlatList
              data={products}
              numColumns={2}
              scrollEnabled={false}
              keyExtractor={(item, idx) => (item.id?.toString() || idx.toString())}
              renderItem={renderProductGridItem}
              contentContainerStyle={styles.gridContent}
              columnWrapperStyle={styles.gridRow}
            />
          </View>
        )}
      </ScrollView>

      {/* Navigation inférieure */}
      <View style={styles.bottomNav}>
        <TouchableOpacity 
          style={styles.navButton}
          onPress={handleCreateProduct}
          activeOpacity={0.7}
        >
          <View>
            <Ionicons name="add-circle" size={26} color={PREMIUM_GOLD} />
            <NotificationBadge count={notificationCounts.sell} size={16} />
          </View>
          <Text style={styles.navTextActive}>Vendre</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.navButton}
          onPress={() => router.push("/(tabs)/Auth/Boutique/Premium/Analytics")}
          activeOpacity={0.7}
        >
          <View>
            <Ionicons name="stats-chart" size={24} color="rgba(255,255,255,0.7)" />
            <NotificationBadge count={notificationCounts.analytics} size={16} />
          </View>
          <Text style={styles.navText}>Analytics</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.navButton}
          onPress={() => router.push("/(tabs)/Auth/Panier/VendeurNotifications")}
          activeOpacity={0.7}
        >
          <View>
            <Ionicons name="cart" size={24} color="rgba(255,255,255,0.7)" />
            <NotificationBadge count={notificationCounts.orders} size={16} />
          </View>
          <Text style={styles.navText}>Commandes</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.navButton}
          onPress={() => {
            if (!boutique?.id) {
              Alert.alert("Erreur", "Boutique introuvable");
              return;
            }

            router.push({
              pathname: "/(tabs)/Auth/Boutique/Premium/Profil",
              params: { id: boutique.id.toString() }
            });
          }}
          activeOpacity={0.7}
        >
          <View>
            <Ionicons name="person" size={24} color="rgba(255,255,255,0.7)" />
            <NotificationBadge count={notificationCounts.profile} size={16} />
          </View>
          <Text style={styles.navText}>Profil</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: SHOPNET_BLUE 
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 100,
  },
  loadingContainer: { 
    flex: 1, 
    justifyContent: "center", 
    alignItems: "center", 
    backgroundColor: SHOPNET_BLUE 
  },
  loadingText: { 
    color: "#fff", 
    marginTop: 12,
    fontSize: 16 
  },
  emptyContainer: { 
    flex: 1, 
    justifyContent: "center", 
    alignItems: "center", 
    backgroundColor: SHOPNET_BLUE,
    paddingHorizontal: 40 
  },
  emptyTitle: { 
    color: "#fff", 
    fontSize: 24, 
    fontWeight: "700",
    marginTop: 16,
    textAlign: "center"
  },
  emptySubtitle: {
    color: "rgba(255,255,255,0.7)",
    fontSize: 16,
    textAlign: "center",
    marginTop: 8,
    lineHeight: 22
  },
  createButton: { 
    backgroundColor: PREMIUM_GOLD, 
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12, 
    flexDirection: "row", 
    alignItems: "center", 
    marginTop: 24
  },
  createButtonText: { 
    color: "#00182A", 
    marginLeft: 8, 
    fontWeight: "700",
    fontSize: 16 
  },
  secondaryButton: {
    backgroundColor: "rgba(255, 167, 38, 0.2)",
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    flexDirection: "row",
    alignItems: "center",
    marginTop: 12,
    borderWidth: 1,
    borderColor: "rgba(255, 167, 38, 0.3)",
  },
  secondaryButtonText: {
    color: "#fff",
    marginLeft: 6,
    fontWeight: "600",
    fontSize: 14,
  },
  fixedHeader: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: FIXED_HEADER_HEIGHT,
    zIndex: 40,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.1)",
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  logoImage: {
    width: 36,
    height: 36,
    borderRadius: 18,
    marginRight: 12,
  },
  storeIconSmall: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(255, 167, 38, 0.1)",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  shopNameContainer: {
    flex: 1,
  },
  shopNameRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  shopName: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "700",
    marginRight: 6,
  },
  planBadge: {
    backgroundColor: PREMIUM_GOLD,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    marginTop: 2,
    alignSelf: "flex-start",
  },
  planText: {
    color: "#00182A",
    fontSize: 10,
    fontWeight: "800",
    marginLeft: 2,
  },
  headerRight: {
    flexDirection: "row",
    alignItems: "center",
  },
  refreshButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.1)",
    justifyContent: "center",
    alignItems: "center",
  },
  heroSection: {
    alignItems: "center",
    paddingVertical: 32,
    paddingHorizontal: 20,
    marginTop: FIXED_HEADER_HEIGHT,
  },
  heroIcon: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: "rgba(255, 167, 38, 0.1)",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
    borderWidth: 2,
    borderColor: "rgba(255, 167, 38, 0.3)",
  },
  heroTitle: {
    color: "#fff",
    fontSize: 28,
    fontWeight: "800",
    textAlign: "center",
    marginBottom: 4,
  },
  heroSubtitle: {
    color: "rgba(255,255,255,0.8)",
    fontSize: 16,
    textAlign: "center",
    fontWeight: "500",
    marginBottom: 16,
  },
  daysRemaining: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    marginBottom: 16,
  },
  daysRemainingText: {
    fontSize: 14,
    fontWeight: "600",
    marginLeft: 4,
  },
  subscriptionButton: {
    backgroundColor: "#4DB14E",
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
    marginTop: 8,
  },
  subscriptionButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
    marginLeft: 8,
  },
  statsSection: {
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
  },
  sectionTitle: {
    color: "#fff",
    fontSize: 20,
    fontWeight: "700",
    marginBottom: 16,
    marginRight: 8,
  },
  statsGrid: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  statCard: {
    alignItems: "center",
    flex: 1,
    backgroundColor: "rgba(30, 42, 59, 0.9)",
    borderRadius: 12,
    padding: 12,
    marginHorizontal: 4,
    position: "relative",
  },
  statIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 8,
    position: "relative",
  },
  statValue: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "800",
    marginBottom: 2,
  },
  statLabel: {
    color: "rgba(255,255,255,0.6)",
    fontSize: 11,
    fontWeight: "500",
    textAlign: "center",
  },
  // Styles pour double valeur (vues)
  doubleValueContainer: {
    alignItems: "center",
    width: "100%",
  },
  valueRow: {
    alignItems: "center",
    marginBottom: 4,
  },
  statValueLabel: {
    color: "rgba(255,255,255,0.6)",
    fontSize: 10,
    fontWeight: "500",
  },
  // Nouveaux styles pour les statistiques détaillées
  detailedStats: {
    backgroundColor: "rgba(30, 42, 59, 0.7)",
    borderRadius: 12,
    padding: 16,
    marginTop: 16,
  },
  detailedStatsTitle: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 12,
    textAlign: "center",
  },
  detailedStatsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  detailedStatItem: {
    flex: 1,
    alignItems: "center",
    padding: 8,
  },
  detailedStatLabel: {
    color: "rgba(255,255,255,0.7)",
    fontSize: 11,
    marginBottom: 4,
    textAlign: "center",
  },
  detailedStatValue: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
  },
  actionsSection: {
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  actionsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },
  actionButton: {
    width: (SCREEN_WIDTH - 60) / 2,
    backgroundColor: "rgba(30, 42, 59, 0.9)",
    borderRadius: 12,
    padding: 16,
    alignItems: "center",
    marginBottom: 12,
    position: "relative",
  },
  actionText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "600",
    marginTop: 8,
    textAlign: "center",
  },
  section: {
    marginBottom: 24,
  },
  seeAllText: {
    color: PREMIUM_GOLD,
    fontSize: 14,
    fontWeight: "600",
  },
  productCount: {
    color: "rgba(255,255,255,0.6)",
    fontSize: 14,
    fontWeight: "500",
  },
  carouselContent: {
    paddingHorizontal: 20,
  },
  carouselCard: {
    width: SCREEN_WIDTH * 0.7,
    borderRadius: 16,
    overflow: "hidden",
    backgroundColor: "rgba(30, 42, 59, 0.95)",
    marginRight: 12,
    position: "relative",
  },
  carouselImage: {
    width: "100%",
    height: 160,
    resizeMode: "cover",
  },
  carouselMeta: {
    padding: 12,
    position: "relative",
  },
  carouselTitle: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 16,
    marginBottom: 4,
  },
  carouselPrice: {
    color: PREMIUM_GOLD,
    fontWeight: "700",
    fontSize: 16,
  },
  featuredBadge: {
    position: "absolute",
    top: -10,
    right: 12,
    backgroundColor: PREMIUM_GOLD,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  featuredText: {
    color: "#00182A",
    fontSize: 10,
    fontWeight: "800",
    marginLeft: 2,
  },
  emptyProducts: {
    alignItems: "center",
    paddingVertical: 40,
    paddingHorizontal: 20,
  },
  emptyProductsText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "600",
    marginTop: 12,
  },
  emptyProductsSubtext: {
    color: "rgba(255,255,255,0.6)",
    fontSize: 14,
    textAlign: "center",
    marginTop: 4,
    lineHeight: 20,
  },
  addProductButton: {
    backgroundColor: PREMIUM_GOLD,
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    marginTop: 16,
  },
  addProductText: {
    color: "#00182A",
    fontWeight: "700",
    marginLeft: 6,
  },
  gridContent: {
    paddingHorizontal: 20,
  },
  gridRow: {
    justifyContent: "space-between",
    marginBottom: 12,
  },
  productCard: {
    width: (SCREEN_WIDTH - 52) / 2,
    borderRadius: 12,
    overflow: "hidden",
    backgroundColor: "rgba(30, 42, 59, 0.95)",
    marginBottom: 12,
    position: "relative",
  },
  productImage: {
    width: "100%",
    height: 120,
    resizeMode: "cover",
  },
  productInfo: {
    padding: 10,
  },
  productName: {
    color: "#fff",
    fontWeight: "500",
    fontSize: 14,
    marginBottom: 4,
    height: 36,
  },
  productPrice: {
    color: PREMIUM_GOLD,
    fontWeight: "700",
    fontSize: 14,
  },
  bottomNav: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: 80,
    backgroundColor: "rgba(0, 24, 42, 0.95)",
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,0.1)",
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "center",
    paddingBottom: Platform.OS === "ios" ? 20 : 8,
  },
  navButton: {
    alignItems: "center",
    flex: 1,
    position: "relative",
  },
  navText: {
    color: "rgba(255,255,255,0.7)",
    fontSize: 12,
    marginTop: 4,
  },
  navTextActive: {
    color: PREMIUM_GOLD,
    fontSize: 12,
    marginTop: 4,
    fontWeight: "600",
  },
  // Styles pour le badge de vérification
  verificationBadge: {
    justifyContent: "center",
    alignItems: "center",
  },
  // Styles pour le badge de notification
  notificationBadge: {
    position: "absolute",
    top: -5,
    right: -5,
    backgroundColor: "#FF6B6B",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: SHOPNET_BLUE,
  },
  notificationText: {
    color: "#fff",
    fontWeight: "bold",
    textAlign: "center",
  },
  // Styles pour l'écran de paiement
  paymentContainer: {
    flex: 1,
    backgroundColor: SHOPNET_BLUE,
  },
  paymentHeader: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.1)",
  },
  backButton: {
    marginRight: 16,
  },
  paymentHeaderTitle: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "bold",
  },
  paymentContent: {
    flexGrow: 1,
    padding: 20,
    alignItems: "center",
  },
  paymentIconContainer: {
    position: "relative",
    marginVertical: 30,
  },
  alertIcon: {
    position: "absolute",
    bottom: -10,
    right: -10,
    backgroundColor: SHOPNET_BLUE,
    borderRadius: 20,
    padding: 4,
  },
  paymentTitle: {
    color: "#FF6B6B",
    fontSize: 28,
    fontWeight: "bold",
    textAlign: "center",
    marginBottom: 10,
  },
  paymentSubtitle: {
    color: "rgba(255,255,255,0.8)",
    fontSize: 16,
    textAlign: "center",
    marginBottom: 30,
    lineHeight: 24,
  },
  paymentDetails: {
    backgroundColor: "rgba(30, 42, 59, 0.9)",
    borderRadius: 16,
    padding: 20,
    width: "100%",
    marginBottom: 30,
  },
  detailRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  detailText: {
    color: "#fff",
    fontSize: 16,
    marginLeft: 12,
    flex: 1,
  },
  paymentWarning: {
    color: "#FFA726",
    fontSize: 14,
    textAlign: "center",
    marginBottom: 30,
    padding: 16,
    backgroundColor: "rgba(255, 167, 38, 0.1)",
    borderRadius: 12,
    width: "100%",
  },
  payNowButton: {
    backgroundColor: PREMIUM_GOLD,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 18,
    paddingHorizontal: 30,
    borderRadius: 12,
    width: "100%",
    marginBottom: 30,
  },
  payNowText: {
    color: "#00182A",
    fontSize: 18,
    fontWeight: "bold",
    marginLeft: 10,
  },
  supportSection: {
    width: "100%",
    backgroundColor: "rgba(30, 42, 59, 0.9)",
    borderRadius: 16,
    padding: 20,
  },
  supportTitle: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "bold",
    textAlign: "center",
    marginBottom: 20,
  },
  supportButton: {
    backgroundColor: "rgba(42, 58, 82, 0.9)",
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 12,
    marginBottom: 12,
  },
  supportButtonText: {
    color: "#fff",
    fontSize: 14,
    marginLeft: 10,
    flex: 1,
  },
});