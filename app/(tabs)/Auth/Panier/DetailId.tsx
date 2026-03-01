


import React, { useEffect, useState, useRef } from "react";
import {
  View,
  Text,
  Image,
  ActivityIndicator,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Dimensions,
  Linking,
  FlatList,
  Modal,
  Animated,
  SafeAreaView,
  StatusBar,
  LayoutAnimation,
  Platform,
  UIManager,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons, MaterialIcons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";

// Enable LayoutAnimation on Android
if (Platform.OS === "android") {
  UIManager.setLayoutAnimationEnabledExperimental?.(true);
}

// 🔹 Serveur Render en production
const API_URL = "https://shopnet-backend.onrender.com/api/products";
const COMMAND_API_URL = "https://shopnet-backend.onrender.com/api/commandes";
const PANIER_API_URL = "https://shopnet-backend.onrender.com/api/cart";

const { width, height } = Dimensions.get("window");

// Couleurs SHOPNET PRO VIP
const SHOPNET_BLUE = "#00182A";
const PRO_BLUE = "#42A5F5";
const PREMIUM_GOLD = "#FFD700";
const CARD_BG = "#1E2A3B";
const TEXT_WHITE = "#FFFFFF";
const TEXT_SECONDARY = "#A0AEC0";
const SUCCESS_GREEN = "#4CAF50";
const ERROR_RED = "#FF6B6B";
const WARNING_ORANGE = "#FFA726";
const WHATSAPP_GREEN = "#25D366";
const LINK_BLUE = "#5D9CEC";
const LINK_PURPLE = "#9B59B6";

const formatPrice = (price: any) => {
  const n = Number(price);
  return isNaN(n) ? "N/A" : n.toFixed(2);
};

const formatPhoneNumber = (phone: string) => {
  let cleaned = phone.trim().replace(/\D/g, "");
  if (cleaned.startsWith("0")) cleaned = "243" + cleaned.substring(1);
  return cleaned;
};

const getValidToken = async () => {
  try {
    const token = await AsyncStorage.getItem("userToken");
    return token || null;
  } catch {
    return null;
  }
};

// Fonction pour nettoyer le texte des espaces superflus
const cleanText = (text: string) => {
  if (!text) return "";
  // Remplacer les espaces multiples par un seul espace
  return text.replace(/\s+/g, ' ').trim();
};

// 🔗 Fonction pour détecter les URLs dans un texte
const extractUrls = (text: string): { url: string; type: string }[] => {
  if (!text) return [];
  
  const urlRegex = /(https?:\/\/[^\s]+)|(www\.[^\s]+)|([a-zA-Z0-9][a-zA-Z0-9-]{1,61}[a-zA-Z0-9]\.[a-zA-Z]{2,}(?:\/[^\s]*)?)/gi;
  
  const urls: { url: string; type: string }[] = [];
  let match;
  
  while ((match = urlRegex.exec(text)) !== null) {
    let url = match[0];
    
    let type = "lien";
    if (url.includes('youtube.com') || url.includes('youtu.be')) {
      type = "youtube";
    } else if (url.includes('facebook.com')) {
      type = "facebook";
    } else if (url.includes('instagram.com')) {
      type = "instagram";
    } else if (url.includes('twitter.com') || url.includes('x.com')) {
      type = "twitter";
    } else if (url.includes('tiktok.com')) {
      type = "tiktok";
    } else if (url.includes('amazon.com') || url.includes('amzn.to')) {
      type = "amazon";
    } else if (url.includes('ebay.com')) {
      type = "ebay";
    } else if (url.includes('.pdf')) {
      type = "pdf";
    } else if (url.includes('.jpg') || url.includes('.png') || url.includes('.gif')) {
      type = "image";
    }
    
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      url = 'https://' + url;
    }
    
    urls.push({ url, type });
  }
  
  return urls;
};

// 🔗 Composant pour afficher un lien avec icône
const LinkComponent = ({ url, type, onPress }: { url: string; type: string; onPress: (url: string) => void }) => {
  const getIconForType = () => {
    switch(type) {
      case "youtube":
        return <Ionicons name="logo-youtube" size={20} color="#FF0000" />;
      case "facebook":
        return <Ionicons name="logo-facebook" size={20} color="#1877F2" />;
      case "instagram":
        return <Ionicons name="logo-instagram" size={20} color="#E4405F" />;
      case "twitter":
        return <Ionicons name="logo-twitter" size={20} color="#1DA1F2" />;
      case "tiktok":
        return <Ionicons name="logo-tiktok" size={20} color="#000000" />;
      case "amazon":
        return <Ionicons name="cart" size={20} color="#FF9900" />;
      case "ebay":
        return <Ionicons name="pricetag" size={20} color="#E53238" />;
      case "pdf":
        return <Ionicons name="document-text" size={20} color="#FF5722" />;
      case "image":
        return <Ionicons name="image" size={20} color="#4CAF50" />;
      default:
        return <Ionicons name="link" size={20} color={LINK_BLUE} />;
    }
  };

  const getDomain = (url: string) => {
    try {
      const domain = new URL(url).hostname.replace('www.', '');
      return domain;
    } catch {
      return url.substring(0, 30) + (url.length > 30 ? '...' : '');
    }
  };

  return (
    <TouchableOpacity
      style={styles.linkItem}
      onPress={() => onPress(url)}
      activeOpacity={0.7}
    >
      <View style={styles.linkIconContainer}>
        {getIconForType()}
      </View>
      <View style={styles.linkContent}>
        <Text style={styles.linkDomain} numberOfLines={1}>
          {getDomain(url)}
        </Text>
        <Text style={styles.linkUrl} numberOfLines={1}>
          {url}
        </Text>
      </View>
      <View style={styles.linkArrow}>
        <Ionicons name="open-outline" size={18} color={TEXT_SECONDARY} />
      </View>
    </TouchableOpacity>
  );
};

// 📝 Composant Description avec Lire plus / Lire moins
const ExpandableDescription = ({ description }: { description: string }) => {
  const [expanded, setExpanded] = useState(false);
  const [textHeight, setTextHeight] = useState(0);
  const [isLongText, setIsLongText] = useState(false);
  const animationValue = useRef(new Animated.Value(0)).current;

  // Nettoyer le texte
  const cleanDescription = cleanText(description);

  useEffect(() => {
    // Déterminer si le texte est long (plus de 4 lignes approximativement)
    if (textHeight > 100) {
      setIsLongText(true);
    }
  }, [textHeight]);

  const toggleExpand = () => {
    LayoutAnimation.configureNext({
      duration: 300,
      create: { type: LayoutAnimation.Types.easeInEaseOut, property: LayoutAnimation.Properties.opacity },
      update: { type: LayoutAnimation.Types.easeInEaseOut },
    });

    Animated.timing(animationValue, {
      toValue: expanded ? 0 : 1,
      duration: 300,
      useNativeDriver: true,
    }).start();

    setExpanded(!expanded);
  };

  const rotateIcon = animationValue.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '180deg'],
  });

  if (!description) {
    return (
      <Text style={styles.description}>
        Aucune description disponible pour ce produit.
      </Text>
    );
  }

  return (
    <View style={styles.descriptionContainer}>
      <Text 
        style={[
          styles.description,
          !expanded && styles.descriptionCollapsed
        ]}
        numberOfLines={expanded ? undefined : 4}
        onTextLayout={(e) => {
          const { lines } = e.nativeEvent;
          setTextHeight(lines.length * 22);
        }}
      >
        {cleanDescription}
      </Text>
      
      {isLongText && (
        <TouchableOpacity 
          style={styles.readMoreButton} 
          onPress={toggleExpand}
          activeOpacity={0.7}
        >
          <View style={styles.readMoreContent}>
            <Text style={styles.readMoreText}>
              {expanded ? "Voir moins" : "Voir plus"}
            </Text>
            <Animated.View style={{ transform: [{ rotate: rotateIcon }] }}>
              <Ionicons 
                name="chevron-down" 
                size={18} 
                color={PRO_BLUE} 
              />
            </Animated.View>
          </View>
        </TouchableOpacity>
      )}
    </View>
  );
};

export default function DetailId() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [product, setProduct] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [similarProducts, setSimilarProducts] = useState<any[]>([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  
  // 📏 État pour stocker les dimensions calculées des images
  const [imageDimensions, setImageDimensions] = useState<{[key: string]: {width: number, height: number}}>({});
  
  // 🔗 État pour stocker les liens détectés
  const [detectedLinks, setDetectedLinks] = useState<{url: string; type: string}[]>([]);

  // Animations
  const [notificationVisible, setNotificationVisible] = useState(false);
  const [notificationMessage, setNotificationMessage] = useState("");
  const notificationPosition = useRef(new Animated.Value(-100)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;

  const flatListRef = useRef<FlatList>(null);

  const showNotification = (message: string) => {
    setNotificationMessage(message);
    setNotificationVisible(true);

    Animated.sequence([
      Animated.timing(notificationPosition, {
        toValue: 60,
        duration: 400,
        useNativeDriver: true,
      }),
      Animated.delay(2000),
      Animated.timing(notificationPosition, {
        toValue: -100,
        duration: 400,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setNotificationVisible(false);
    });
  };

  // 📏 Fonction pour obtenir les dimensions d'une image
  const getImageDimensions = (uri: string) => {
    return new Promise<{width: number, height: number}>((resolve) => {
      Image.getSize(
        uri,
        (imgWidth, imgHeight) => {
          resolve({ width: imgWidth, height: imgHeight });
        },
        () => {
          resolve({ width: 1, height: 1 });
        }
      );
    });
  };

  // 📏 Calculer la hauteur adaptative pour une image
  const getAdaptiveHeight = (uri: string, screenWidth: number = width) => {
    if (imageDimensions[uri]) {
      const { width: imgWidth, height: imgHeight } = imageDimensions[uri];
      return (imgHeight / imgWidth) * screenWidth;
    }
    return 400;
  };

  // 📏 Charger les dimensions de toutes les images
  useEffect(() => {
    if (product?.image_urls?.length > 0) {
      const loadDimensions = async () => {
        const dimensions: {[key: string]: {width: number, height: number}} = {};
        for (const url of product.image_urls) {
          try {
            dimensions[url] = await getImageDimensions(url);
          } catch (error) {
            dimensions[url] = { width: 1, height: 1 };
          }
        }
        setImageDimensions(dimensions);
      };
      loadDimensions();
    }
  }, [product]);

  // 🔗 Détecter les liens dans la description quand le produit est chargé
  useEffect(() => {
    if (product?.description) {
      const links = extractUrls(product.description);
      setDetectedLinks(links);
    }
  }, [product]);

  const fetchProduct = async () => {
    setLoading(true);
    try {
      const token = await getValidToken();
      const res = await fetch(`${API_URL}/${id}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      const data = await res.json();

      if (data.success) {
        const prod = data.product;
        if (!prod.image_urls && prod.images) {
          prod.image_urls = prod.images.map((img: any) => img.url);
        }
        // Nettoyer la description avant de la stocker
        if (prod.description) {
          prod.description = cleanText(prod.description);
        }
        setProduct(prod);
        fetchSimilar(prod.category);

        Animated.parallel([
          Animated.timing(fadeAnim, {
            toValue: 1,
            duration: 600,
            useNativeDriver: true,
          }),
          Animated.timing(slideAnim, {
            toValue: 0,
            duration: 500,
            useNativeDriver: true,
          }),
        ]).start();
      } else {
        setError(data.error || "Produit non trouvé");
      }
    } catch {
      setError("Erreur de connexion au serveur");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (id) {
      fetchProduct();
    }
  }, [id]);

  const fetchSimilar = async (category: string) => {
    try {
      const res = await fetch(API_URL);
      const data = await res.json();
      if (data.success) {
        const filtered = data.products
          .filter((p: any) => p.id !== Number(id) && p.category === category)
          .slice(0, 4);
        setSimilarProducts(filtered);
      }
    } catch {
      // silently fail
    }
  };

  const openWhatsApp = () => {
    const rawPhone = product?.seller?.phone || "";
    if (!rawPhone) {
      showNotification("📞 Numéro WhatsApp non disponible");
      return;
    }
    const phone = formatPhoneNumber(rawPhone);
    const imageUrl = product.image_urls?.[0] || "";
    const message = `Bonjour, je suis intéressé par le produit "${product.title}" sur SHOPNET. Prix: $${product.price}. Voici l'image : ${imageUrl}`;
    const url = `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
    Linking.openURL(url).catch(() =>
      showNotification("❌ Impossible d'ouvrir WhatsApp"),
    );
  };

  const commanderProduit = async () => {
    try {
      const token = await getValidToken();
      if (!token) {
        showNotification("🔐 Veuillez vous connecter pour commander");
        return;
      }

      const body = {
        produits: [{ produit_id: product.id, quantite: 1 }],
        adresse_livraison: "Adresse par défaut",
        mode_paiement: "especes",
        commentaire: "Commande depuis l'application SHOPNET PRO",
      };

      const res = await fetch(COMMAND_API_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(body),
      });
      const data = await res.json();

      if (data.success) {
        showNotification("✅ Commande envoyée avec succès !");
      } else {
        showNotification(data.error || "❌ Erreur lors de la commande");
      }
    } catch {
      showNotification("❌ Erreur réseau ou serveur");
    }
  };

  const ajouterAuPanier = async () => {
    try {
      const token = await getValidToken();
      if (!token) {
        showNotification("🔐 Veuillez vous connecter pour ajouter au panier");
        return;
      }

      const body = {
        product_id: product.id,
        title: product.title,
        description: cleanText(product.description || ""),
        price: product.price,
        original_price: product.original_price || product.price,
        category: product.category || "",
        condition: product.condition || "new",
        quantity: 1,
        stock: product.stock || 0,
        location: product.location || "",
        delivery_options: product.delivery_options || {},
        images: product.image_urls || [],
        seller_id: product.seller?.id || "",
        seller_name: product.seller?.name || "",
        seller_rating: product.seller?.rating || 0,
      };

      const res = await fetch(PANIER_API_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(body),
      });

      const data = await res.json();

      if (data.success) {
        showNotification("🛒 Produit ajouté au panier !");
      } else {
        showNotification(
          data.message || data.error || "❌ Erreur lors de l'ajout",
        );
      }
    } catch (err) {
      showNotification("❌ Erreur réseau ou serveur");
    }
  };

  const showImage = (url: string, index: number) => {
    setSelectedImage(url);
    setActiveImageIndex(index);
    setModalVisible(true);
  };

  const scrollToImage = (index: number) => {
    if (flatListRef.current) {
      flatListRef.current.scrollToIndex({ index, animated: true });
    }
    setActiveImageIndex(index);
    setSelectedImage(product.image_urls[index]);
  };

  const navigateToImage = (direction: "prev" | "next") => {
    const images = product.image_urls || [];
    if (images.length <= 1) return;

    let newIndex;
    if (direction === "next") {
      newIndex = (activeImageIndex + 1) % images.length;
    } else {
      newIndex = (activeImageIndex - 1 + images.length) % images.length;
    }

    scrollToImage(newIndex);
  };

  const openLink = (url: string) => {
    Linking.openURL(url).catch(() => {
      showNotification("❌ Impossible d'ouvrir ce lien");
    });
  };

  const renderImageItem = ({ item, index }: { item: string; index: number }) => {
    const adaptiveHeight = getAdaptiveHeight(item);
    
    return (
      <TouchableOpacity
        activeOpacity={0.9}
        onPress={() => showImage(item, index)}
        style={styles.imageItemContainer}
      >
        <Image
          source={{ uri: item }}
          style={[styles.galleryImage, { height: adaptiveHeight }]}
          resizeMode="contain"
        />
        {index === 0 && product.isPromotion && (
          <View style={styles.promoBadge}>
            <Ionicons name="flash" size={16} color={SHOPNET_BLUE} />
            <Text style={styles.promoBadgeText}>PROMO</Text>
          </View>
        )}
        {index === 0 && product.is_featured && (
          <View style={styles.featuredBadge}>
            <Ionicons name="star" size={14} color={TEXT_WHITE} />
            <Text style={styles.featuredBadgeText}>SPONSORISÉ</Text>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  const renderThumbnailItem = ({ item, index }: { item: string; index: number }) => {
    const isActive = index === activeImageIndex;
    
    return (
      <TouchableOpacity
        onPress={() => scrollToImage(index)}
        activeOpacity={0.8}
        style={[styles.thumbnailWrapper, isActive && styles.activeThumbnail]}
      >
        <Image source={{ uri: item }} style={styles.thumbnailImage} />
        {index === activeImageIndex && (
          <View style={styles.activeIndicator} />
        )}
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <StatusBar backgroundColor={SHOPNET_BLUE} barStyle="light-content" />
        <ActivityIndicator size="large" color={PRO_BLUE} />
        <Text style={styles.loadingText}>Chargement du produit...</Text>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.errorContainer}>
        <StatusBar backgroundColor={SHOPNET_BLUE} barStyle="light-content" />
        <Ionicons name="alert-circle" size={80} color={ERROR_RED} />
        <Text style={styles.errorTitle}>Erreur</Text>
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backButton}
          activeOpacity={0.8}
        >
          <Ionicons name="arrow-back" size={20} color={TEXT_WHITE} />
          <Text style={styles.backButtonText}>Retour</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  const images = product.image_urls || [];

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar backgroundColor={SHOPNET_BLUE} barStyle="light-content" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.headerButton}
          onPress={() => router.back()}
        >
          <Ionicons name="chevron-back" size={28} color={PRO_BLUE} />
        </TouchableOpacity>

        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Détails Produit</Text>
          <Text style={styles.headerSubtitle}>SHOPNET</Text>
        </View>

        <View style={styles.headerButton} />
      </View>

      {/* Notification */}
      {notificationVisible && (
        <Animated.View
          style={[
            styles.notificationContainer,
            {
              transform: [{ translateY: notificationPosition }],
            },
          ]}
        >
          <View style={styles.notificationContent}>
            <Ionicons name="checkmark-circle" size={24} color={SUCCESS_GREEN} />
            <Text style={styles.notificationText}>{notificationMessage}</Text>
          </View>
        </Animated.View>
      )}

      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
      >
        {/* Galerie d'images principale */}
        <Animated.View
          style={[
            styles.imageSection,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }],
            },
          ]}
        >
          {/* FlatList pour les images avec hauteur adaptative */}
          <FlatList
            ref={flatListRef}
            data={images}
            renderItem={renderImageItem}
            keyExtractor={(item, index) => `image-${index}`}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onMomentumScrollEnd={(event) => {
              const newIndex = Math.round(event.nativeEvent.contentOffset.x / width);
              setActiveImageIndex(newIndex);
              setSelectedImage(images[newIndex]);
            }}
            getItemLayout={(data, index) => ({
              length: width,
              offset: width * index,
              index,
            })}
          />

          {/* Indicateur de page */}
          {images.length > 1 && (
            <View style={styles.pageIndicator}>
              <Text style={styles.pageIndicatorText}>
                {activeImageIndex + 1} / {images.length}
              </Text>
            </View>
          )}

          {/* Miniatures horizontales */}
          {images.length > 1 && (
            <View style={styles.thumbnailsSection}>
              <FlatList
                data={images}
                renderItem={renderThumbnailItem}
                keyExtractor={(item, index) => `thumb-${index}`}
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.thumbnailsContainer}
              />
            </View>
          )}
        </Animated.View>

        {/* Contenu principal */}
        <Animated.View
          style={[
            styles.content,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }],
            },
          ]}
        >
          {/* Titre et Catégorie */}
          <View style={styles.titleSection}>
            <Text style={styles.title}>{product.title}</Text>
            <View style={styles.categoryBadge}>
              <Ionicons name="pricetag" size={16} color={PRO_BLUE} />
              <Text style={styles.category}>{product.category}</Text>
            </View>
          </View>

          {/* Prix et Stock */}
          <View style={styles.priceStockSection}>
            <View style={styles.priceContainer}>
              <Text style={styles.price}>${formatPrice(product.price)}</Text>
              {product.original_price &&
                product.original_price > product.price && (
                  <Text style={styles.originalPrice}>
                    ${formatPrice(product.original_price)}
                  </Text>
                )}
            </View>

            <View
              style={[
                styles.stockBadge,
                {
                  backgroundColor:
                    product.stock > 0 ? SUCCESS_GREEN + "20" : ERROR_RED + "20",
                },
              ]}
            >
              <Ionicons
                name={product.stock > 0 ? "checkmark-circle" : "close-circle"}
                size={16}
                color={product.stock > 0 ? SUCCESS_GREEN : ERROR_RED}
              />
              <Text
                style={[
                  styles.stockText,
                  { color: product.stock > 0 ? SUCCESS_GREEN : ERROR_RED },
                ]}
              >
                {product.stock > 0 ? "En stock" : "Rupture"}
              </Text>
            </View>
          </View>

          {/* Description avec Lire plus / Lire moins */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Ionicons name="document-text" size={20} color={PRO_BLUE} />
              <Text style={styles.sectionTitle}>Description</Text>
            </View>
            
            {/* Utilisation du composant ExpandableDescription */}
            <ExpandableDescription description={product.description} />

            {/* 🔗 Liens détectés dans la description */}
            {detectedLinks.length > 0 && (
              <View style={styles.linksSection}>
                <View style={styles.linksHeader}>
                  <Ionicons name="link" size={18} color={PRO_BLUE} />
                  <Text style={styles.linksTitle}>
                    {detectedLinks.length} lien{detectedLinks.length > 1 ? 's' : ''} détecté{detectedLinks.length > 1 ? 's' : ''}
                  </Text>
                </View>
                {detectedLinks.map((link, index) => (
                  <LinkComponent
                    key={index}
                    url={link.url}
                    type={link.type}
                    onPress={openLink}
                  />
                ))}
              </View>
            )}
          </View>

          {/* Informations Vendeur */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Ionicons name="business" size={20} color={PRO_BLUE} />
              <Text style={styles.sectionTitle}>Vendeur</Text>
            </View>

            <View style={styles.sellerCard}>
              <View style={styles.sellerInfo}>
                <View style={styles.sellerRow}>
                  <Ionicons name="person" size={18} color={TEXT_SECONDARY} />
                  <Text style={styles.sellerText}>
                    {product.seller?.name || "Vendeur SHOPNET"}
                  </Text>
                </View>

                <View style={styles.sellerRow}>
                  <Ionicons name="call" size={18} color={TEXT_SECONDARY} />
                  <Text style={styles.sellerText}>
                    {product.seller?.phone || "Non disponible"}
                  </Text>
                </View>

                {product.seller?.email && (
                  <View style={styles.sellerRow}>
                    <Ionicons name="mail" size={18} color={TEXT_SECONDARY} />
                    <Text style={styles.sellerText}>
                      {product.seller.email}
                    </Text>
                  </View>
                )}

                {product.seller?.address && (
                  <View style={styles.sellerRow}>
                    <Ionicons
                      name="location"
                      size={18}
                      color={TEXT_SECONDARY}
                    />
                    <Text style={styles.sellerText}>
                      {product.seller.address}
                    </Text>
                  </View>
                )}
              </View>
            </View>
          </View>

          {/* Actions Rapides */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Ionicons name="flash" size={20} color={PREMIUM_GOLD} />
              <Text style={styles.sectionTitle}>Actions Rapides</Text>
            </View>

            <View style={styles.actionsContainer}>
              <TouchableOpacity
                style={[styles.actionButton, styles.whatsappButton]}
                onPress={openWhatsApp}
                activeOpacity={0.8}
              >
                <View style={styles.actionIconContainer}>
                  <Ionicons name="logo-whatsapp" size={22} color={TEXT_WHITE} />
                </View>
                <Text style={styles.actionButtonText}>WhatsApp</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.actionButton, styles.cartButton]}
                onPress={ajouterAuPanier}
                activeOpacity={0.8}
              >
                <View style={styles.actionIconContainer}>
                  <Ionicons name="cart" size={22} color={TEXT_WHITE} />
                </View>
                <Text style={styles.actionButtonText}>Panier</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.actionButton, styles.orderButton]}
                onPress={commanderProduit}
                activeOpacity={0.8}
              >
                <View style={styles.actionIconContainer}>
                  <Ionicons name="bag-check" size={22} color={TEXT_WHITE} />
                </View>
                <Text style={styles.actionButtonText}>Commander</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Produits Similaires */}
          {similarProducts.length > 0 && (
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Ionicons name="layers" size={20} color={PRO_BLUE} />
                <Text style={styles.sectionTitle}>Produits Similaires</Text>
              </View>

              <FlatList
                data={similarProducts}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={styles.similarProductCard}
                    onPress={() =>
                      router.push(`/(tabs)/Auth/Panier/DetailId/${item.id}`)
                    }
                    activeOpacity={0.8}
                  >
                    <Image
                      source={{
                        uri:
                          item.image_urls?.[0] ||
                          "https://via.placeholder.com/150",
                      }}
                      style={styles.similarProductImage}
                    />
                    <View style={styles.similarProductInfo}>
                      <Text
                        style={styles.similarProductTitle}
                        numberOfLines={2}
                      >
                        {item.title}
                      </Text>
                      <Text style={styles.similarProductPrice}>
                        ${formatPrice(item.price)}
                      </Text>
                    </View>
                  </TouchableOpacity>
                )}
                keyExtractor={(item) => item.id.toString()}
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.similarProductsContainer}
              />
            </View>
          )}
        </Animated.View>
      </ScrollView>

      {/* Modal Image Fullscreen */}
      <Modal visible={modalVisible} transparent animationType="fade">
        <View style={styles.modalContainer}>
          <TouchableOpacity
            onPress={() => setModalVisible(false)}
            style={styles.modalCloseButton}
            activeOpacity={0.7}
          >
            <Ionicons name="close" size={28} color={TEXT_WHITE} />
          </TouchableOpacity>

          {images.length > 1 && (
            <>
              <TouchableOpacity
                style={[styles.navButton, styles.prevButton]}
                onPress={() => navigateToImage("prev")}
                activeOpacity={0.7}
              >
                <Ionicons name="chevron-back" size={28} color={TEXT_WHITE} />
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.navButton, styles.nextButton]}
                onPress={() => navigateToImage("next")}
                activeOpacity={0.7}
              >
                <Ionicons name="chevron-forward" size={28} color={TEXT_WHITE} />
              </TouchableOpacity>
            </>
          )}

          <Image
            source={{ uri: selectedImage || "" }}
            style={styles.fullScreenImage}
            resizeMode="contain"
          />

          <View style={styles.imageCounter}>
            <Text style={styles.imageCounterText}>
              {activeImageIndex + 1} / {images.length}
            </Text>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: SHOPNET_BLUE,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: SHOPNET_BLUE,
  },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: SHOPNET_BLUE,
    padding: 20,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: SHOPNET_BLUE,
  },
  headerButton: {
    width: 40,
    height: 40,
    justifyContent: "center",
    alignItems: "center",
  },
  headerCenter: {
    alignItems: "center",
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: TEXT_WHITE,
  },
  headerSubtitle: {
    fontSize: 11,
    color: PRO_BLUE,
    fontWeight: "600",
    marginTop: 2,
  },
  scrollView: {
    flex: 1,
  },
  imageSection: {
    marginBottom: 12,
  },
  imageItemContainer: {
    width: width,
    justifyContent: "center",
    alignItems: "center",
    position: "relative",
  },
  galleryImage: {
    width: width,
    backgroundColor: CARD_BG,
  },
  promoBadge: {
    position: "absolute",
    top: 16,
    left: 16,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: PREMIUM_GOLD,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 4,
  },
  promoBadgeText: {
    color: SHOPNET_BLUE,
    fontSize: 12,
    fontWeight: "800",
  },
  featuredBadge: {
    position: "absolute",
    top: 16,
    right: 16,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: SUCCESS_GREEN,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 4,
  },
  featuredBadgeText: {
    color: TEXT_WHITE,
    fontSize: 10,
    fontWeight: "800",
  },
  pageIndicator: {
    position: "absolute",
    bottom: 20,
    right: 20,
    backgroundColor: "rgba(0, 0, 0, 0.6)",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  pageIndicatorText: {
    color: TEXT_WHITE,
    fontSize: 12,
    fontWeight: "600",
  },
  thumbnailsSection: {
    marginTop: 10,
    marginBottom: 5,
  },
  thumbnailsContainer: {
    paddingHorizontal: 12,
    gap: 8,
  },
  thumbnailWrapper: {
    position: "relative",
  },
  thumbnailImage: {
    width: 60,
    height: 60,
    borderRadius: 8,
    backgroundColor: CARD_BG,
  },
  activeThumbnail: {
    borderWidth: 2,
    borderColor: PRO_BLUE,
    borderRadius: 10,
  },
  activeIndicator: {
    position: "absolute",
    bottom: -4,
    left: "50%",
    marginLeft: -4,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: PRO_BLUE,
  },
  content: {
    padding: 16,
    backgroundColor: SHOPNET_BLUE,
  },
  titleSection: {
    marginBottom: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: "800",
    color: TEXT_WHITE,
    marginBottom: 8,
    lineHeight: 30,
  },
  categoryBadge: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    backgroundColor: "rgba(66, 165, 245, 0.1)",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    gap: 6,
  },
  category: {
    color: PRO_BLUE,
    fontSize: 13,
    fontWeight: "600",
  },
  priceStockSection: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.1)",
  },
  priceContainer: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 10,
  },
  price: {
    fontSize: 28,
    fontWeight: "800",
    color: PREMIUM_GOLD,
  },
  originalPrice: {
    fontSize: 16,
    color: TEXT_SECONDARY,
    textDecorationLine: "line-through",
    fontWeight: "500",
  },
  stockBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    gap: 6,
  },
  stockText: {
    fontSize: 13,
    fontWeight: "700",
  },
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
    gap: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: TEXT_WHITE,
  },
  // Styles pour la description extensible
  descriptionContainer: {
    width: "100%",
  },
  description: {
    color: TEXT_SECONDARY,
    fontSize: 15,
    lineHeight: 22,
    textAlign: "left",
  },
  descriptionCollapsed: {
    maxHeight: 88,
  },
  readMoreButton: {
    marginTop: 8,
    alignSelf: "flex-start",
  },
  readMoreContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  readMoreText: {
    color: PRO_BLUE,
    fontSize: 14,
    fontWeight: "600",
  },
  // Styles pour les liens
  linksSection: {
    marginTop: 16,
    backgroundColor: CARD_BG,
    borderRadius: 12,
    padding: 12,
  },
  linksHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
    gap: 8,
  },
  linksTitle: {
    color: TEXT_WHITE,
    fontSize: 15,
    fontWeight: "600",
  },
  linkItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(66, 165, 245, 0.1)",
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
  },
  linkIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  linkContent: {
    flex: 1,
  },
  linkDomain: {
    color: PRO_BLUE,
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 2,
  },
  linkUrl: {
    color: TEXT_SECONDARY,
    fontSize: 11,
  },
  linkArrow: {
    marginLeft: 8,
  },
  sellerCard: {
    backgroundColor: CARD_BG,
    borderRadius: 12,
    padding: 16,
  },
  sellerInfo: {
    gap: 12,
  },
  sellerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  sellerText: {
    fontSize: 15,
    color: TEXT_WHITE,
    fontWeight: "500",
    flex: 1,
  },
  actionsContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 8,
  },
  actionButton: {
    flex: 1,
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    paddingHorizontal: 4,
    borderRadius: 10,
    minHeight: 70,
  },
  actionIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 6,
    backgroundColor: "rgba(255, 255, 255, 0.15)",
  },
  whatsappButton: {
    backgroundColor: WHATSAPP_GREEN,
  },
  cartButton: {
    backgroundColor: PRO_BLUE,
  },
  orderButton: {
    backgroundColor: SUCCESS_GREEN,
  },
  actionButtonText: {
    color: TEXT_WHITE,
    fontSize: 12,
    fontWeight: "700",
    textAlign: "center",
  },
  similarProductsContainer: {
    paddingRight: 16,
    gap: 12,
  },
  similarProductCard: {
    width: 150,
    backgroundColor: CARD_BG,
    borderRadius: 12,
    overflow: "hidden",
  },
  similarProductImage: {
    width: "100%",
    height: 120,
    backgroundColor: "#2C3A4A",
  },
  similarProductInfo: {
    padding: 10,
  },
  similarProductTitle: {
    fontSize: 13,
    fontWeight: "600",
    color: TEXT_WHITE,
    marginBottom: 6,
    lineHeight: 16,
  },
  similarProductPrice: {
    fontSize: 14,
    fontWeight: "800",
    color: PREMIUM_GOLD,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.95)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalCloseButton: {
    position: "absolute",
    top: 50,
    right: 20,
    zIndex: 2,
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    borderRadius: 20,
    padding: 8,
  },
  navButton: {
    position: "absolute",
    top: "50%",
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    borderRadius: 25,
    padding: 12,
    zIndex: 2,
    marginTop: -25,
  },
  prevButton: {
    left: 20,
  },
  nextButton: {
    right: 20,
  },
  fullScreenImage: {
    width: "100%",
    height: "80%",
  },
  imageCounter: {
    position: "absolute",
    bottom: 40,
    backgroundColor: "rgba(0, 0, 0, 0.7)",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  imageCounterText: {
    color: TEXT_WHITE,
    fontSize: 14,
    fontWeight: "600",
  },
  notificationContainer: {
    position: "absolute",
    top: 0,
    left: 20,
    right: 20,
    backgroundColor: CARD_BG,
    borderRadius: 12,
    padding: 16,
    zIndex: 1000,
    borderLeftWidth: 4,
    borderLeftColor: SUCCESS_GREEN,
  },
  notificationContent: {
    flexDirection: "row",
    alignItems: "center",
  },
  notificationText: {
    marginLeft: 12,
    fontSize: 16,
    fontWeight: "600",
    color: TEXT_WHITE,
    flex: 1,
  },
  loadingText: {
    color: PRO_BLUE,
    fontSize: 16,
    marginTop: 12,
    fontWeight: "500",
  },
  errorTitle: {
    color: ERROR_RED,
    fontSize: 22,
    fontWeight: "700",
    marginTop: 16,
    marginBottom: 8,
  },
  errorText: {
    color: TEXT_SECONDARY,
    fontSize: 15,
    textAlign: "center",
    marginBottom: 24,
    lineHeight: 20,
  },
  backButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: PRO_BLUE,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 10,
  },
  backButtonText: {
    color: TEXT_WHITE,
    fontSize: 15,
    fontWeight: "600",
  },
});