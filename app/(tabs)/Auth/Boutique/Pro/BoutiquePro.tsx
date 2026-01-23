


import React, { useEffect, useRef, useState } from "react";
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
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter } from "expo-router";
import { FontAwesome5, Ionicons, Feather, MaterialCommunityIcons, MaterialIcons, AntDesign } from "@expo/vector-icons";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const SHOPNET_BLUE = "#00182A";
const PRO_BLUE = "#42A5F5";
const VERIFIED_BLUE = "#1877F2"; // Bleu Facebook/WhatsApp officiel

// Interfaces TypeScript
interface Product {
  _id?: string;
  id?: string;
  nom?: string;
  name?: string;
  prix?: number;
  price?: number;
  amount?: number;
  image?: string;
  imageUrl?: string;
  images?: string[];
  photo?: string;
  userId?: string;
  user?: string;
}

interface Boutique {
  _id: string;
  nom: string;
  userId?: string;
  type: string;
  email?: string;
  whatsapp?: string;
  adresse?: string;
  categorie?: string;
  description?: string;
  plan?: "Premium" | "Pro" | "Basic"; // Ajout du champ plan
}

interface Stats {
  products: number;
  orders: number;
  views: number;
  revenue: number;
  customers: number;
}

interface AIInsight {
  id: string;
  icon: string;
  text: string;
  color: string;
}

interface NavItem {
  id: string;
  icon: string;
  label: string;
  route: string;
  badge?: string;
}

// Fonction utilitaire pour formater les nombres
const formatNumber = (num: number): string => {
  if (num >= 1000000) {
    return (num / 1000000).toFixed(1).replace(/\.0$/, '') + 'M';
  }
  if (num >= 1000) {
    return (num / 1000).toFixed(1).replace(/\.0$/, '') + 'K';
  }
  return num.toString();
};

const FIXED_HEADER_HEIGHT = Platform.OS === "ios" ? 94 : 88;

// Composant Badge de Certification Réutilisable
const CertifiedBadge = ({ 
  size = 18, 
  showTooltip = true,
  plan 
}: { 
  size?: number; 
  showTooltip?: boolean;
  plan?: string;
}) => {
  const [showTooltipState, setShowTooltipState] = useState(false);
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const tooltipAnim = useRef(new Animated.Value(0)).current;

  // Animation de pulsation légère comme les badges officiels
  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.1,
          duration: 1500,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1500,
          useNativeDriver: true,
        }),
      ])
    );
    
    pulse.start();
    
    return () => pulse.stop();
  }, []);

  const handlePress = () => {
    if (showTooltip) {
      Animated.spring(tooltipAnim, {
        toValue: showTooltipState ? 0 : 1,
        tension: 50,
        friction: 7,
        useNativeDriver: true,
      }).start();
      setShowTooltipState(!showTooltipState);
    }
  };

  const isCertified = plan === "Premium" || plan === "Pro";

  if (!isCertified) return null;

  return (
    <View style={styles.certifiedBadgeContainer}>
      <TouchableOpacity
        onPress={handlePress}
        onLongPress={handlePress}
        delayLongPress={300}
        activeOpacity={0.7}
        accessibilityLabel="Boutique certifiée"
        accessibilityRole="button"
        accessibilityHint="Appuyez pour voir les détails de certification"
      >
        <Animated.View
          style={[
            styles.certifiedBadge,
            {
              width: size,
              height: size,
              borderRadius: size / 2,
              transform: [{ scale: pulseAnim }],
            },
          ]}
        >
          <Ionicons 
            name="checkmark" 
            size={size * 0.7} 
            color="#FFFFFF" 
            style={styles.checkIcon}
          />
        </Animated.View>
      </TouchableOpacity>

      {/* Tooltip avec animation */}
      {showTooltip && showTooltipState && (
        <Animated.View
          style={[
            styles.tooltip,
            {
              opacity: tooltipAnim,
              transform: [
                { 
                  translateY: tooltipAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [-5, 0],
                  }),
                },
              ],
            },
          ]}
        >
          <View style={styles.tooltipContent}>
            <Ionicons name="shield-checkmark" size={14} color={VERIFIED_BLUE} />
            <Text style={styles.tooltipText}>Boutique certifiée</Text>
          </View>
          <View style={styles.tooltipArrow} />
        </Animated.View>
      )}
    </View>
  );
};

// Composant Badge avec Nom pour Header
const CertifiedBadgeWithName = ({ plan }: { plan?: string }) => {
  const [showTooltip, setShowTooltip] = useState(false);
  const tooltipAnim = useRef(new Animated.Value(0)).current;

  const isCertified = plan === "Premium" || plan === "Pro";

  if (!isCertified) return null;

  const handlePress = () => {
    Animated.spring(tooltipAnim, {
      toValue: showTooltip ? 0 : 1,
      tension: 50,
      friction: 7,
      useNativeDriver: true,
    }).start();
    setShowTooltip(!showTooltip);
  };

  return (
    <View style={styles.certifiedWithNameContainer}>
      <TouchableOpacity
        onPress={handlePress}
        onLongPress={handlePress}
        delayLongPress={300}
        activeOpacity={0.7}
        style={styles.certifiedNameTouchable}
        accessibilityLabel="Boutique certifiée officiellement"
        accessibilityRole="button"
      >
        <View style={styles.certifiedNameContent}>
          <View style={styles.certifiedBadgeSmall}>
            <Ionicons name="checkmark" size={10} color="#FFFFFF" />
          </View>
          <Text style={styles.certifiedText}>Certifiée</Text>
        </View>
      </TouchableOpacity>

      {/* Tooltip pour la version avec nom */}
      {showTooltip && (
        <Animated.View
          style={[
            styles.tooltip,
            styles.tooltipWithName,
            {
              opacity: tooltipAnim,
              transform: [
                { 
                  translateY: tooltipAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [-5, 0],
                  }),
                },
              ],
            },
          ]}
        >
          <View style={styles.tooltipContent}>
            <Ionicons name="verified" size={16} color={VERIFIED_BLUE} />
            <View style={styles.tooltipDetails}>
              <Text style={styles.tooltipTitle}>Boutique Certifiée</Text>
              <Text style={styles.tooltipDescription}>
                Cette boutique a été vérifiée et certifiée par SHOPNET
              </Text>
            </View>
          </View>
          <View style={styles.tooltipArrow} />
        </Animated.View>
      )}
    </View>
  );
};

// NOUVEAU COMPOSANT BADGE VERIFIED FACEBOOK STYLE
const VerifiedBadge = () => {
  return (
    <View style={styles.verifiedBadge}>
      <MaterialIcons name="verified" size={16} color={VERIFIED_BLUE} />
      <Text style={styles.verifiedText}>Vérifié</Text>
    </View>
  );
};

export default function BoutiquePro() {
  const router = useRouter();
  const [loading, setLoading] = useState<boolean>(true);
  const [boutique, setBoutique] = useState<Boutique | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [displayedProducts, setDisplayedProducts] = useState<Product[]>([]);
  const [activeNav, setActiveNav] = useState<string>("dashboard");
  const [stats, setStats] = useState<Stats>({
    products: 0,
    orders: 0,
    views: 4280,
    revenue: 12560,
    customers: 342
  });

  // Animations séparées pour chaque section
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;
  const statsAnim = useRef(new Animated.Value(0)).current;
  const aiAnim = useRef(new Animated.Value(0)).current;
  const actionsAnim = useRef(new Animated.Value(0)).current;
  const productsAnim = useRef(new Animated.Value(0)).current;
  const badgeScale = useRef(new Animated.Value(0)).current;

  // Pagination pour les produits
  const PRODUCTS_PER_PAGE = 8;
  const [currentPage, setCurrentPage] = useState<number>(1);

  // Menu de navigation enterprise
  const navItems: NavItem[] = [
    { id: "dashboard", icon: "rocket", label: "Dashboard", route: "/(tabs)/Auth/Boutique/Pro/Dashboard" },
    { id: "analytics", icon: "analytics", label: "Analytics", route: "/(tabs)/Auth/AI/Analytics", badge: "IA" },
    { id: "products", icon: "cube", label: "Produits", route: "/(tabs)/Auth/Produits/Management" },
    { id: "marketing", icon: "megaphone", label: "Marketing", route: "/(tabs)/Auth/Marketing/Dashboard", badge: "PRO" },
    { id: "team", icon: "people", label: "Équipe", route: "/(tabs)/Auth/Team/Management" },
  ];

  useEffect(() => {
    const fetchBoutiqueAndProducts = async () => {
      try {
        const token = await AsyncStorage.getItem("userToken");
        if (!token) {
          Alert.alert("Erreur", "Veuillez vous reconnecter.");
          router.replace("/splash");
          return;
        }

        // Get boutique
        const resBoutique = await fetch(
          "https://shopnet-backend.onrender.com/api/boutiques/check",
          { 
            headers: { 
              Authorization: `Bearer ${token}`,
              'Content-Type': 'application/json'
            } 
          }
        );

        if (!resBoutique.ok) {
          throw new Error("Erreur lors de la récupération de la boutique");
        }

        const dataBoutique = await resBoutique.json();
        setBoutique(dataBoutique.boutique);

        // Get products PRO - Appel API optimisé avec userId
        const userId = dataBoutique.boutique.userId ?? dataBoutique.boutique._id;
        const resProducts = await fetch(
          `https://shopnet-backend.onrender.com/api/products/user/${userId}`,
          { 
            headers: { 
              Authorization: `Bearer ${token}`,
              'Content-Type': 'application/json'
            } 
          }
        );

        let userProducts: Product[] = [];
        
        if (resProducts.ok) {
          const productsData = await resProducts.json();
          userProducts = Array.isArray(productsData) ? productsData : 
                        Array.isArray(productsData.products) ? productsData.products : 
                        Array.isArray(productsData.data) ? productsData.data : [];
        } else {
          // Fallback vers l'ancienne méthode si l'API user n'existe pas
          console.warn("API user products non disponible, utilisation du fallback");
          const resAllProducts = await fetch(
            "https://shopnet-backend.onrender.com/api/all-products",
            { headers: { Authorization: `Bearer ${token}` } }
          );
          
          if (resAllProducts.ok) {
            const allProductsData = await resAllProducts.json();
            const allProducts: Product[] = Array.isArray(allProductsData) ? allProductsData : 
                                         Array.isArray(allProductsData.products) ? allProductsData.products : 
                                         Array.isArray(allProductsData.data) ? allProductsData.data : [];
            
            userProducts = allProducts.filter((p: Product) => 
              p.userId === userId || p.user === userId
            );
          }
        }

        setProducts(userProducts);
        setDisplayedProducts(userProducts.slice(0, PRODUCTS_PER_PAGE));
        
        setStats(prev => ({ 
          ...prev, 
          products: userProducts.length,
          orders: Math.floor(userProducts.length * 4.2),
        }));

        // Lancement des animations séquentielles
        Animated.sequence([
          // Badge animation
          Animated.spring(badgeScale, { 
            toValue: 1, 
            tension: 50,
            friction: 7,
            useNativeDriver: true 
          }),
          // Hero section
          Animated.parallel([
            Animated.timing(fadeAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
            Animated.timing(slideAnim, { toValue: 0, duration: 600, useNativeDriver: true }),
          ]),
          // Stats section
          Animated.timing(statsAnim, { toValue: 1, duration: 600, useNativeDriver: true, delay: 200 }),
          // AI section
          Animated.timing(aiAnim, { toValue: 1, duration: 600, useNativeDriver: true, delay: 200 }),
          // Actions section
          Animated.timing(actionsAnim, { toValue: 1, duration: 600, useNativeDriver: true, delay: 200 }),
          // Products section
          Animated.timing(productsAnim, { toValue: 1, duration: 600, useNativeDriver: true, delay: 200 }),
        ]).start();

      } catch (err: any) {
        console.error("Erreur:", err);
        Alert.alert("Erreur", err.message || "Problème de connexion au serveur");
      } finally {
        setLoading(false);
      }
    };

    fetchBoutiqueAndProducts();
  }, []);

  const loadMoreProducts = () => {
    const nextPage = currentPage + 1;
    const startIndex = currentPage * PRODUCTS_PER_PAGE;
    const endIndex = startIndex + PRODUCTS_PER_PAGE;
    const newProducts = products.slice(startIndex, endIndex);
    
    if (newProducts.length > 0) {
      setDisplayedProducts(prev => [...prev, ...newProducts]);
      setCurrentPage(nextPage);
    }
  };

  const productImageUri = (p: Product): string => {
    return p.image ?? p.imageUrl ?? (p.images && p.images[0]) ?? p.photo ?? "https://via.placeholder.com/400x300?text=No+Image";
  };

  const handleNavPress = (navItem: NavItem) => {
    setActiveNav(navItem.id);
    router.push(navItem.route as any);
  };

  const renderCarouselItem = ({ item }: { item: Product }) => {
    const id = item._id ?? item.id ?? Math.random().toString();
    const uri = productImageUri(item);
    const name = item.nom ?? item.name ?? "Produit";
    const price = item.prix ?? item.price ?? item.amount ?? 0;
    
    return (
      <Animated.View 
        style={[
          styles.carouselCard,
          {
            opacity: productsAnim,
            transform: [{ translateY: productsAnim.interpolate({
              inputRange: [0, 1],
              outputRange: [20, 0]
            }) }]
          }
        ]}
      >
        <TouchableOpacity
          activeOpacity={0.85}
          onPress={() => router.push(`/produit/${id}`)}
          accessibilityLabel={`Voir le produit ${name}`}
          accessibilityRole="button"
        >
          <Image 
            source={{ uri }} 
            style={styles.carouselImage}
            accessibilityLabel={`Image du produit ${name}`}
          />
          <View style={styles.carouselMeta}>
            <Text numberOfLines={1} style={styles.carouselTitle}>{name}</Text>
            <Text style={styles.carouselPrice}>{price ? `${price} $` : "Gratuit"}</Text>
            <View style={styles.proBadge}>
              <Ionicons name="rocket" size={10} color="#fff" />
              <Text style={styles.proBadgeText}>PRO</Text>
            </View>
          </View>
        </TouchableOpacity>
      </Animated.View>
    );
  };

  const renderProductGridItem = ({ item, index }: { item: Product; index: number }) => {
    const id = item._id ?? item.id ?? index.toString();
    const uri = productImageUri(item);
    const name = item.nom ?? item.name ?? "Produit";
    const price = item.prix ?? item.price ?? item.amount ?? 0;
    
    return (
      <View style={styles.productCard}>
        <TouchableOpacity
          onPress={() => router.push(`/produit/${id}`)}
          activeOpacity={0.9}
          accessibilityLabel={`Voir le produit ${name}`}
          accessibilityRole="button"
        >
          <Image 
            source={{ uri }} 
            style={styles.productImage}
            accessibilityLabel={`Image du produit ${name}`}
          />
          <View style={styles.productInfo}>
            <Text numberOfLines={2} style={styles.productName}>{name}</Text>
            <Text style={styles.productPrice}>{price ? `${price} $` : "Gratuit"}</Text>
          </View>
        </TouchableOpacity>
      </View>
    );
  };

  const StatCard = ({ icon, value, label, color, trend }: { 
    icon: string; 
    value: number; 
    label: string; 
    color: string; 
    trend?: string; 
  }) => (
    <Animated.View 
      style={[
        styles.statCard,
        {
          opacity: statsAnim,
          transform: [{ scale: statsAnim.interpolate({
            inputRange: [0, 1],
            outputRange: [0.8, 1]
          }) }]
        }
      ]}
    >
      <View style={[styles.statIcon, { backgroundColor: `${color}20` }]}>
        <FontAwesome5 name={icon} size={20} color={color} />
      </View>
      <Text style={styles.statValue}>{formatNumber(value)}</Text>
      <Text style={styles.statLabel}>{label}</Text>
      {trend && (
        <View style={styles.trendBadge}>
          <Ionicons name="trending-up" size={12} color="#4DB14E" />
          <Text style={styles.trendText}>{trend}</Text>
        </View>
      )}
    </Animated.View>
  );

  const aiInsights: AIInsight[] = [
    {
      id: "1",
      icon: "trending-up",
      text: "Vos produits électroniques ont +45% de vues",
      color: "#4DB14E"
    },
    {
      id: "2", 
      icon: "time",
      text: "Meilleur moment pour publier: 18h-20h",
      color: "#FFA726"
    },
    {
      id: "3",
      icon: "bulb", 
      text: "Suggestion: Promo de 15% le weekend",
      color: PRO_BLUE
    }
  ];

  if (loading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={PRO_BLUE} />
        <Text style={styles.loadingText}>Chargement de votre boutique Pro...</Text>
      </SafeAreaView>
    );
  }

  if (!boutique) {
    return (
      <SafeAreaView style={styles.emptyContainer}>
        <Ionicons name="rocket" size={90} color="rgba(255,255,255,0.25)" />
        <Text style={styles.emptyTitle}>Aucune boutique Pro trouvée</Text>
        <Text style={styles.emptySubtitle}>
          Passez à la formule Pro pour débloquer toutes les fonctionnalités enterprise
        </Text>
        <TouchableOpacity
          style={styles.createButton}
          onPress={() => router.push("/(tabs)/Auth/Boutique/CreerBoutique")}
          accessibilityLabel="Passer au plan Pro"
          accessibilityRole="button"
        >
          <Ionicons name="rocket" size={18} color="#fff" />
          <Text style={styles.createButtonText}>Passer au Pro</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  const isCertified = boutique.plan === "Premium" || boutique.plan === "Pro";

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={SHOPNET_BLUE} />

      {/* Fixed Header avec Badge Pro ET Badge de Certification */}
      <View style={styles.fixedHeader}>
        <View style={styles.headerLeft}>
          <View style={styles.storeIconSmall}>
            <Ionicons name="rocket" size={20} color={PRO_BLUE} />
            {/* Badge de certification sur l'icône */}
            {isCertified && (
              <View style={styles.storeIconBadge}>
                <CertifiedBadge size={12} showTooltip={false} plan={boutique.plan} />
              </View>
            )}
          </View>
          <View style={styles.titleContainer}>
            <View style={styles.shopNameRow}>
              <Text style={styles.shopName} numberOfLines={1}>
                {boutique.nom}
              </Text>
              
              {/* NOUVEAU BADGE VERIFIED FACEBOOK STYLE - BIEN VISIBLE */}
              <VerifiedBadge />
              
              <Animated.View 
                style={[
                  styles.enterpriseBadge,
                  {
                    transform: [{ scale: badgeScale }]
                  }
                ]}
              >
                <Ionicons name="business" size={12} color="#fff" />
                <Text style={styles.enterpriseBadgeText}>ENTERPRISE</Text>
              </Animated.View>
            </View>
            
            {/* Ligne avec le plan et le badge "Certifiée" */}
            <View style={styles.planRow}>
              <View style={styles.planBadge}>
                <Ionicons name="star" size={10} color="#fff" />
                <Text style={styles.planText}>{boutique.plan?.toUpperCase() || "PRO"} PLAN</Text>
              </View>
              
              {/* Badge "Certifiée" avec nom */}
              <CertifiedBadgeWithName plan={boutique.plan} />
            </View>
          </View>
        </View>

        <View style={styles.headerRight}>
          <TouchableOpacity 
            style={styles.aiButton}
            onPress={() => router.push("/(tabs)/Auth/AI/Analytics")}
            accessibilityLabel="Ouvrir les analyses IA"
            accessibilityRole="button"
          >
            <Ionicons name="analytics" size={16} color={PRO_BLUE} />
            <Text style={styles.aiText}>IA</Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Hero Section avec Badge de Certification */}
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
            <Ionicons name="rocket" size={50} color={PRO_BLUE} />
            {/* Badge de certification sur l'icône hero */}
            {isCertified && (
              <View style={styles.heroIconBadge}>
                <CertifiedBadge size={20} showTooltip={false} plan={boutique.plan} />
              </View>
            )}
          </View>
          
          <View style={styles.heroTitleContainer}>
            <Text style={styles.heroTitle}>{boutique.nom}</Text>
            {/* Badge de certification dans le titre */}
            <CertifiedBadge size={22} plan={boutique.plan} />
          </View>
          
          <Text style={styles.heroSubtitle}>Boutique {boutique.plan} • Solution Enterprise</Text>
          
          {/* Indicateur de certification dans les performances */}
          <View style={styles.performanceBadge}>
            <Ionicons name="shield-checkmark" size={16} color={VERIFIED_BLUE} />
            <Text style={styles.performanceText}>Boutique Certifiée SHOPNET</Text>
          </View>
        </Animated.View>

        {/* Stats Overview */}
        <Animated.View 
          style={[
            styles.statsSection,
            {
              opacity: statsAnim,
              transform: [{ translateY: statsAnim.interpolate({
                inputRange: [0, 1],
                outputRange: [20, 0]
              }) }]
            }
          ]}
        >
          <View style={styles.statsHeader}>
            <View style={styles.statsTitleContainer}>
              <Text style={styles.sectionTitle}>Tableau de Bord Pro</Text>
              {isCertified && (
                <View style={styles.certifiedStatsBadge}>
                  <Ionicons name="verified" size={14} color={VERIFIED_BLUE} />
                  <Text style={styles.certifiedStatsText}>Certifiée</Text>
                </View>
              )}
            </View>
            <TouchableOpacity 
              onPress={() => router.push("/(tabs)/Auth/Analytics/Advanced")}
              accessibilityLabel="Voir les détails des analyses"
              accessibilityRole="button"
            >
              <Text style={styles.seeDetailsText}>Détails →</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.statsGrid}>
            <StatCard icon="box" value={stats.products} label="Produits" color={PRO_BLUE} trend="+12%" />
            <StatCard icon="shopping-cart" value={stats.orders} label="Commandes" color="#4DB14E" trend="+8%" />
            <StatCard icon="eye" value={stats.views} label="Vues" color="#FFA726" trend="+15%" />
            <StatCard icon="dollar-sign" value={stats.revenue} label="Revenus" color="#FF6B6B" trend="+22%" />
          </View>
        </Animated.View>

        {/* AI Quick Insights */}
        <Animated.View 
          style={[
            styles.aiSection,
            {
              opacity: aiAnim,
              transform: [{ translateY: aiAnim.interpolate({
                inputRange: [0, 1],
                outputRange: [20, 0]
              }) }]
            }
          ]}
        >
          <View style={styles.aiHeader}>
            <Ionicons name="sparkles" size={20} color={PRO_BLUE} />
            <Text style={styles.aiTitle}>Recommandations IA</Text>
            {isCertified && (
              <View style={styles.aiCertifiedBadge}>
                <CertifiedBadge size={14} showTooltip={false} plan={boutique.plan} />
              </View>
            )}
          </View>
          <View style={styles.aiInsights}>
            {aiInsights.map((insight) => (
              <View key={insight.id} style={styles.insightItem}>
                <Ionicons name={insight.icon as any} size={16} color={insight.color} />
                <Text style={styles.insightText}>{insight.text}</Text>
              </View>
            ))}
          </View>
        </Animated.View>

        {/* Enterprise Actions */}
        <Animated.View 
          style={[
            styles.actionsSection,
            {
              opacity: actionsAnim,
              transform: [{ translateY: actionsAnim.interpolate({
                inputRange: [0, 1],
                outputRange: [20, 0]
              }) }]
            }
          ]}
        >
          <View style={styles.actionsHeader}>
            <Text style={styles.sectionTitle}>Centre de Commande Pro</Text>
            {isCertified && (
              <View style={styles.actionsCertified}>
                <Ionicons name="shield-checkmark" size={14} color={VERIFIED_BLUE} />
                <Text style={styles.actionsCertifiedText}>Sécurisé</Text>
              </View>
            )}
          </View>
          <View style={styles.actionsGrid}>
            <TouchableOpacity 
              style={styles.actionButton}
              onPress={() => router.push("/(tabs)/Auth/Produits/Creer")}
              accessibilityLabel="Créer un nouveau produit"
              accessibilityRole="button"
            >
              <MaterialIcons name="add-business" size={24} color={PRO_BLUE} />
              <Text style={styles.actionText}>Nouveau Produit</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.actionButton}
              onPress={() => router.push("/(tabs)/Auth/AI/Analytics")}
              accessibilityLabel="Ouvrir les analyses IA avancées"
              accessibilityRole="button"
            >
              <Ionicons name="analytics" size={24} color={PRO_BLUE} />
              <Text style={styles.actionText}>Analytics IA</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.actionButton}
              onPress={() => router.push("/(tabs)/Auth/Marketing/Campaigns")}
              accessibilityLabel="Gérer les campagnes marketing"
              accessibilityRole="button"
            >
              <MaterialIcons name="campaign" size={24} color={PRO_BLUE} />
              <Text style={styles.actionText}>Campagnes</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.actionButton}
              onPress={() => router.push("/(tabs)/Auth/Team/Management")}
              accessibilityLabel="Gérer l'équipe"
              accessibilityRole="button"
            >
              <MaterialIcons name="groups" size={24} color={PRO_BLUE} />
              <Text style={styles.actionText}>Équipe</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.actionButton}
              onPress={() => router.push("/(tabs)/Auth/Inventory/Advanced")}
              accessibilityLabel="Gérer le stock avancé"
              accessibilityRole="button"
            >
              <MaterialIcons name="inventory" size={24} color={PRO_BLUE} />
              <Text style={styles.actionText}>Stock Pro</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.actionButton}
              onPress={() => router.push("/(tabs)/Auth/Reports/Advanced")}
              accessibilityLabel="Voir les rapports avancés"
              accessibilityRole="button"
            >
              <MaterialIcons name="summarize" size={24} color={PRO_BLUE} />
              <Text style={styles.actionText}>Rapports</Text>
            </TouchableOpacity>
          </View>
        </Animated.View>

        {/* Featured Products Carousel */}
        <Animated.View 
          style={[
            styles.section,
            {
              opacity: productsAnim,
              transform: [{ translateY: productsAnim.interpolate({
                inputRange: [0, 1],
                outputRange: [20, 0]
              }) }]
            }
          ]}
        >
          <View style={styles.sectionHeader}>
            <View style={styles.productsTitleContainer}>
              <Text style={styles.sectionTitle}>Produits en Vedette</Text>
              {isCertified && (
                <View style={styles.productsCertifiedBadge}>
                  <Ionicons name="verified" size={12} color={VERIFIED_BLUE} />
                  <Text style={styles.productsCertifiedText}>Vérifiés</Text>
                </View>
              )}
            </View>
            <TouchableOpacity 
              onPress={() => router.push("/(tabs)/Auth/Produits/Creer")}
              accessibilityLabel="Ajouter un nouveau produit"
              accessibilityRole="button"
            >
              <Text style={styles.seeAllText}>+ Ajouter</Text>
            </TouchableOpacity>
          </View>

          {displayedProducts.length > 0 ? (
            <FlatList
              data={displayedProducts.slice(0, 5)}
              horizontal
              showsHorizontalScrollIndicator={false}
              keyExtractor={(item, idx) => (item._id ?? item.id ?? idx.toString()).toString()}
              renderItem={renderCarouselItem}
              contentContainerStyle={styles.carouselContent}
              ItemSeparatorComponent={() => <View style={{ width: 12 }} />}
            />
          ) : (
            <View style={styles.emptyProducts}>
              <Feather name="package" size={40} color="rgba(255,255,255,0.3)" />
              <Text style={styles.emptyProductsText}>Aucun produit encore</Text>
              <Text style={styles.emptyProductsSubtext}>
                Ajoutez votre premier produit avec les outils Pro
              </Text>
              <TouchableOpacity 
                style={styles.addProductButton}
                onPress={() => router.push("/(tabs)/Auth/Produits/Creer")}
                accessibilityLabel="Créer votre premier produit Pro"
                accessibilityRole="button"
              >
                <Feather name="plus" size={18} color="#fff" />
                <Text style={styles.addProductText}>Premier Produit Pro</Text>
              </TouchableOpacity>
            </View>
          )}
        </Animated.View>

        {/* All Products Grid */}
        {displayedProducts.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Tous les Produits</Text>
              <Text style={styles.productCount}>
                {formatNumber(products.length)} produits • Illimité
              </Text>
            </View>

            <FlatList
              data={displayedProducts}
              numColumns={2}
              scrollEnabled={false}
              keyExtractor={(item, idx) => (item._id ?? item.id ?? idx.toString()).toString()}
              renderItem={renderProductGridItem}
              contentContainerStyle={styles.gridContent}
              columnWrapperStyle={styles.gridRow}
              onEndReached={loadMoreProducts}
              onEndReachedThreshold={0.5}
              ListFooterComponent={
                products.length > displayedProducts.length ? (
                  <View style={styles.loadingMoreContainer}>
                    <ActivityIndicator size="small" color={PRO_BLUE} />
                    <Text style={styles.loadingMoreText}>Chargement...</Text>
                  </View>
                ) : null
              }
            />
          </View>
        )}
      </ScrollView>

      {/* Menu de Navigation Enterprise - Version Ultra Pro */}
      <View style={styles.enterpriseNav}>
        <View style={styles.navContainer}>
          {navItems.map((item) => (
            <TouchableOpacity
              key={item.id}
              style={[
                styles.navItem,
                activeNav === item.id && styles.navItemActive
              ]}
              onPress={() => handleNavPress(item)}
              accessibilityLabel={`Naviguer vers ${item.label}`}
              accessibilityRole="button"
            >
              <View style={styles.navIconContainer}>
                <Ionicons 
                  name={item.icon as any} 
                  size={22} 
                  color={activeNav === item.id ? PRO_BLUE : "rgba(255,255,255,0.6)"} 
                />
                {item.badge && (
                  <View style={styles.navBadge}>
                    <Text style={styles.navBadgeText}>{item.badge}</Text>
                  </View>
                )}
              </View>
              <Text style={[
                styles.navLabel,
                activeNav === item.id && styles.navLabelActive
              ]}>
                {item.label}
              </Text>
              
              {/* Indicateur actif */}
              {activeNav === item.id && (
                <View style={styles.activeIndicator} />
              )}
            </TouchableOpacity>
          ))}
        </View>
        
        {/* Barre de statut Pro avec certification */}
        <View style={styles.navStatusBar}>
          <View style={styles.statusIndicator}>
            {isCertified ? (
              <>
                <Ionicons name="shield-checkmark" size={12} color={VERIFIED_BLUE} />
                <Text style={styles.statusText}>Certifiée & Sécurisée</Text>
              </>
            ) : (
              <>
                <Ionicons name="rocket" size={12} color={PRO_BLUE} />
                <Text style={styles.statusText}>Système Pro Actif</Text>
              </>
            )}
          </View>
          <View style={styles.performanceIndicator}>
            <Ionicons name="flash" size={12} color={PRO_BLUE} />
            <Text style={styles.performanceText}>Performance Max</Text>
          </View>
        </View>
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
    paddingBottom: 120,
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
    backgroundColor: PRO_BLUE, 
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12, 
    flexDirection: "row", 
    alignItems: "center", 
    marginTop: 24 
  },
  createButtonText: { 
    color: "#fff", 
    marginLeft: 8, 
    fontWeight: "700",
    fontSize: 16 
  },
  fixedHeader: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: FIXED_HEADER_HEIGHT,
    backgroundColor: SHOPNET_BLUE,
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
  storeIconSmall: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(66, 165, 245, 0.1)",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
    position: "relative",
  },
  storeIconBadge: {
    position: "absolute",
    top: -2,
    right: -2,
    backgroundColor: SHOPNET_BLUE,
    borderRadius: 8,
    padding: 1,
  },
  titleContainer: {
    flex: 1,
  },
  shopNameRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 2,
    flexWrap: "wrap",
  },
  shopName: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "700",
    marginRight: 6,
  },
  // NOUVEAU STYLE POUR LE BADGE VERIFIED
  verifiedBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(24, 119, 242, 0.2)",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(24, 119, 242, 0.4)",
    marginRight: 6,
  },
  verifiedText: {
    color: VERIFIED_BLUE,
    fontSize: 12,
    fontWeight: "800",
    marginLeft: 4,
  },
  planRow: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    marginTop: 2,
  },
  planBadge: {
    backgroundColor: "rgba(66, 165, 245, 0.2)",
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: "rgba(66, 165, 245, 0.3)",
    marginRight: 8,
  },
  planText: {
    color: PRO_BLUE,
    fontSize: 8,
    fontWeight: "800",
    marginLeft: 2,
  },
  enterpriseBadge: {
    backgroundColor: PRO_BLUE,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.3)",
    marginLeft: 6,
  },
  enterpriseBadgeText: {
    color: "#fff",
    fontSize: 10,
    fontWeight: "800",
    marginLeft: 2,
  },
  headerRight: {
    flexDirection: "row",
    alignItems: "center",
  },
  aiButton: {
    backgroundColor: "rgba(66, 165, 245, 0.2)",
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "rgba(66, 165, 245, 0.3)",
  },
  aiText: {
    color: PRO_BLUE,
    fontSize: 12,
    fontWeight: "700",
    marginLeft: 4,
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
    backgroundColor: "rgba(66, 165, 245, 0.1)",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
    borderWidth: 2,
    borderColor: "rgba(66, 165, 245, 0.3)",
    position: "relative",
  },
  heroIconBadge: {
    position: "absolute",
    top: -4,
    right: -4,
    backgroundColor: SHOPNET_BLUE,
    borderRadius: 12,
    padding: 2,
  },
  heroTitleContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  heroTitle: {
    color: "#fff",
    fontSize: 28,
    fontWeight: "800",
    textAlign: "center",
    marginRight: 8,
  },
  heroSubtitle: {
    color: PRO_BLUE,
    fontSize: 16,
    textAlign: "center",
    fontWeight: "600",
    marginBottom: 12,
  },
  performanceBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(24, 119, 242, 0.2)",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(24, 119, 242, 0.3)",
  },
  performanceText: {
    color: VERIFIED_BLUE,
    fontSize: 12,
    fontWeight: "700",
    marginLeft: 4,
  },
  statsSection: {
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  statsHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 16,
  },
  statsTitleContainer: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    flexWrap: "wrap",
  },
  sectionTitle: {
    color: "#fff",
    fontSize: 20,
    fontWeight: "700",
    marginRight: 8,
  },
  certifiedStatsBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(24, 119, 242, 0.2)",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "rgba(24, 119, 242, 0.3)",
  },
  certifiedStatsText: {
    color: VERIFIED_BLUE,
    fontSize: 10,
    fontWeight: "700",
    marginLeft: 2,
  },
  seeDetailsText: {
    color: PRO_BLUE,
    fontSize: 14,
    fontWeight: "600",
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
  },
  statIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 8,
  },
  statValue: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "800",
    marginBottom: 2,
  },
  statLabel: {
    color: "rgba(255,255,255,0.6)",
    fontSize: 12,
    fontWeight: "500",
    marginBottom: 4,
  },
  trendBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(77, 177, 78, 0.2)",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  trendText: {
    color: "#4DB14E",
    fontSize: 10,
    fontWeight: "700",
    marginLeft: 2,
  },
  aiSection: {
    backgroundColor: "rgba(66, 165, 245, 0.1)",
    marginHorizontal: 20,
    borderRadius: 16,
    padding: 16,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: "rgba(66, 165, 245, 0.2)",
  },
  aiHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  aiTitle: {
    color: PRO_BLUE,
    fontSize: 16,
    fontWeight: "700",
    marginLeft: 8,
    marginRight: 8,
  },
  aiCertifiedBadge: {
    marginLeft: "auto",
  },
  aiInsights: {
    gap: 8,
  },
  insightItem: {
    flexDirection: "row",
    alignItems: "flex-start",
  },
  insightText: {
    color: "#fff",
    fontSize: 14,
    marginLeft: 8,
    flex: 1,
    lineHeight: 18,
  },
  actionsSection: {
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  actionsHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  actionsCertified: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(24, 119, 242, 0.2)",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "rgba(24, 119, 242, 0.3)",
  },
  actionsCertifiedText: {
    color: VERIFIED_BLUE,
    fontSize: 10,
    fontWeight: "700",
    marginLeft: 2,
  },
  actionsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },
  actionButton: {
    width: (SCREEN_WIDTH - 60) / 3,
    backgroundColor: "rgba(30, 42, 59, 0.9)",
    borderRadius: 12,
    padding: 16,
    alignItems: "center",
    marginBottom: 12,
  },
  actionText: {
    color: "#fff",
    fontSize: 11,
    fontWeight: "600",
    marginTop: 8,
    textAlign: "center",
  },
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    marginBottom: 12,
  },
  productsTitleContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  productsCertifiedBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(24, 119, 242, 0.2)",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: "rgba(24, 119, 242, 0.3)",
    marginLeft: 8,
  },
  productsCertifiedText: {
    color: VERIFIED_BLUE,
    fontSize: 10,
    fontWeight: "700",
    marginLeft: 2,
  },
  seeAllText: {
    color: PRO_BLUE,
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
    color: PRO_BLUE,
    fontWeight: "700",
    fontSize: 16,
  },
  proBadge: {
    position: "absolute",
    top: -10,
    right: 12,
    backgroundColor: PRO_BLUE,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  proBadgeText: {
    color: "#fff",
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
    backgroundColor: PRO_BLUE,
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    marginTop: 16,
  },
  addProductText: {
    color: "#fff",
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
    color: PRO_BLUE,
    fontWeight: "700",
    fontSize: 14,
  },
  loadingMoreContainer: {
    padding: 16,
    alignItems: "center",
  },
  loadingMoreText: {
    color: "rgba(255,255,255,0.6)",
    fontSize: 12,
    marginTop: 8,
  },
  // Menu de Navigation Enterprise
  enterpriseNav: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "rgba(0, 24, 42, 0.98)",
    borderTopWidth: 1,
    borderTopColor: "rgba(66, 165, 245, 0.3)",
    paddingTop: 8,
    paddingBottom: Platform.OS === "ios" ? 25 : 8,
  },
  navContainer: {
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "center",
    paddingHorizontal: 8,
  },
  navItem: {
    alignItems: "center",
    flex: 1,
    paddingVertical: 8,
    position: "relative",
  },
  navItemActive: {
    // Style pour l'item actif
  },
  navIconContainer: {
    position: "relative",
    marginBottom: 4,
  },
  navBadge: {
    position: "absolute",
    top: -6,
    right: -8,
    backgroundColor: PRO_BLUE,
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 4,
  },
  navBadgeText: {
    color: "#fff",
    fontSize: 8,
    fontWeight: "800",
  },
  navLabel: {
    color: "rgba(255,255,255,0.6)",
    fontSize: 10,
    fontWeight: "500",
    textAlign: "center",
  },
  navLabelActive: {
    color: PRO_BLUE,
    fontWeight: "700",
  },
  activeIndicator: {
    position: "absolute",
    top: -2,
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: PRO_BLUE,
  },
  navStatusBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,0.1)",
    marginTop: 4,
  },
  statusIndicator: {
    flexDirection: "row",
    alignItems: "center",
  },
  statusText: {
    color: "rgba(255,255,255,0.5)",
    fontSize: 10,
    fontWeight: "500",
    marginLeft: 4,
  },
  performanceIndicator: {
    flexDirection: "row",
    alignItems: "center",
  },
  performanceText: {
    color: PRO_BLUE,
    fontSize: 10,
    fontWeight: "600",
    marginLeft: 4,
  },
  // Styles pour le badge de certification
  certifiedBadgeContainer: {
    position: "relative",
  },
  certifiedBadge: {
    backgroundColor: VERIFIED_BLUE,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: VERIFIED_BLUE,
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  checkIcon: {
    textShadowColor: "rgba(0, 0, 0, 0.2)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  tooltip: {
    position: "absolute",
    bottom: "100%",
    left: "50%",
    transform: [{ translateX: -50 }],
    marginBottom: 8,
    backgroundColor: "rgba(30, 42, 59, 0.95)",
    borderRadius: 8,
    padding: 8,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
    zIndex: 50,
  },
  tooltipWithName: {
    minWidth: 160,
  },
  tooltipContent: {
    flexDirection: "row",
    alignItems: "center",
  },
  tooltipDetails: {
    marginLeft: 8,
    flex: 1,
  },
  tooltipText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "600",
    marginLeft: 4,
  },
  tooltipTitle: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "700",
    marginBottom: 2,
  },
  tooltipDescription: {
    color: "rgba(255,255,255,0.7)",
    fontSize: 10,
    lineHeight: 12,
  },
  tooltipArrow: {
    position: "absolute",
    bottom: -4,
    left: "50%",
    transform: [{ translateX: -4 }],
    width: 0,
    height: 0,
    backgroundColor: "transparent",
    borderStyle: "solid",
    borderLeftWidth: 4,
    borderRightWidth: 4,
    borderTopWidth: 4,
    borderLeftColor: "transparent",
    borderRightColor: "transparent",
    borderTopColor: "rgba(30, 42, 59, 0.95)",
  },
  certifiedWithNameContainer: {
    position: "relative",
  },
  certifiedNameTouchable: {
    flexDirection: "row",
    alignItems: "center",
  },
  certifiedNameContent: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(24, 119, 242, 0.2)",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: "rgba(24, 119, 242, 0.3)",
  },
  certifiedBadgeSmall: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: VERIFIED_BLUE,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 4,
  },
  certifiedText: {
    color: VERIFIED_BLUE,
    fontSize: 10,
    fontWeight: "700",
  },
});