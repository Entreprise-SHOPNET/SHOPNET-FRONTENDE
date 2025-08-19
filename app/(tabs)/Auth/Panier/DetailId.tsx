



import React, { useEffect, useState, useRef } from 'react';
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
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { FontAwesome, Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';

const API_URL = 'https://shopnet-backend.onrender.com/api/products';
const COMMAND_API_URL = 'https://shopnet-backend.onrender.com/api/commandes';
const PANIER_API_URL = 'https://shopnet-backend.onrender.com/api/panier';

const { width } = Dimensions.get('window');
const ITEM_WIDTH = (width - 40) / 2;

const formatPrice = (price: any) => {
  const n = Number(price);
  return isNaN(n) ? 'N/A' : n.toFixed(2);
};

const formatPhoneNumber = (phone: string) => {
  let cleaned = phone.trim().replace(/\D/g, '');
  if (cleaned.startsWith('0')) cleaned = '243' + cleaned.substring(1);
  return cleaned;
};

const getValidToken = async () => {
  try {
    const token = await AsyncStorage.getItem('userToken');
    return token || null;
  } catch {
    return null;
  }
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

  // Notification animation (sans son)
  const [notificationVisible, setNotificationVisible] = useState(false);
  const [notificationMessage, setNotificationMessage] = useState('');
  const notificationPosition = useRef(new Animated.Value(-100)).current;

  const showNotification = (message: string) => {
    setNotificationMessage(message);
    setNotificationVisible(true);

    Animated.sequence([
      Animated.timing(notificationPosition, {
        toValue: 40,
        duration: 500,
        useNativeDriver: true,
      }),
      Animated.delay(2000),
      Animated.timing(notificationPosition, {
        toValue: -100,
        duration: 500,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setNotificationVisible(false);
    });
  };

  const fetchProduct = async () => {
    setLoading(true);
    try {
      const token = await getValidToken(); // Récupérer le token
      const res = await fetch(`${API_URL}/${id}`, {
        headers: {
          Authorization: `Bearer ${token}`,  // Ajouter le token dans les headers
        },
      });
      const data = await res.json();

      if (data.success) {
        const prod = data.product;
        if (!prod.image_urls && prod.images) {
          prod.image_urls = prod.images.map((img: any) => img.url);
        }
        setProduct(prod);
        fetchSimilar(prod.category);
      } else {
        setError(data.error || 'Produit non trouvé');
      }
    } catch {
      setError('Erreur de connexion au serveur');
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
    const rawPhone = product?.seller?.phone || '';
    if (!rawPhone) return alert('Numéro WhatsApp du vendeur non disponible.');
    const phone = formatPhoneNumber(rawPhone);
    const imageUrl = product.image_urls?.[0] || '';
    const message = `Bonjour, je suis intéressé par le produit "${product.title}". Voici l'image : ${imageUrl}`;
    const url = `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
    Linking.openURL(url).catch(() => alert("Impossible d'ouvrir WhatsApp"));
  };

  const commanderProduit = async () => {
    try {
      const token = await getValidToken();
      if (!token) return alert('Veuillez vous connecter pour commander.');

      const body = {
        produits: [{ produit_id: product.id, quantite: 1 }],
        adresse_livraison: "Adresse par défaut",
        mode_paiement: "especes",
        commentaire: "Commande depuis l'application mobile"
      };

      const res = await fetch(COMMAND_API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(body)
      });
      const data = await res.json();

      if (data.success) {
        showNotification("Commande envoyée !");
      } else {
        alert(data.error || 'Erreur inconnue');
      }
    } catch {
      alert("Erreur réseau ou serveur.");
    }
  };

  const ajouterAuPanier = async () => {
    try {
      const token = await getValidToken();
      if (!token) return alert('Veuillez vous connecter pour ajouter au panier.');

      const body = { produit_id: product.id, quantite: 1 };

      const res = await fetch(PANIER_API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(body)
      });
      const data = await res.json();

      if (data.success) {
        showNotification("Produit ajouté au panier !");
      } else {
        alert(data.error || 'Erreur inconnue');
      }
    } catch {
      alert("Erreur réseau ou serveur.");
    }
  };

  const showImage = (url: string) => {
    setSelectedImage(url);
    setModalVisible(true);
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.center}>
        <ActivityIndicator size="large" color="#4CB050" />
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.center}>
        <FontAwesome name="exclamation-triangle" size={50} color="#FF6B6B" />
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} activeOpacity={0.8}>
          <Text style={styles.backText}>Retour</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  return (
    <View style={styles.mainContainer}>
      {/* Notification */}
      {notificationVisible && (
        <Animated.View 
          style={[
            styles.notificationContainer,
            { 
              transform: [{ translateY: notificationPosition }],
              opacity: notificationPosition.interpolate({
                inputRange: [-100, 40],
                outputRange: [0, 1],
              }),
            },
          ]}
        >
          <View style={styles.notificationContent}>
            <Ionicons name="checkmark-circle" size={24} color="#4CB050" />
            <Text style={styles.notificationText}>{notificationMessage}</Text>
          </View>
        </Animated.View>
      )}

      <ScrollView style={styles.container}>
        {/* Modal image fullscreen */}
        <Modal visible={modalVisible} transparent animationType="fade">
          <View style={styles.modalBackground}>
            <TouchableOpacity 
              onPress={() => setModalVisible(false)} 
              style={styles.closeBtn}
              activeOpacity={0.7}
            >
              <Ionicons name="close" size={30} color="#fff" />
            </TouchableOpacity>
            <Image 
              source={{ uri: selectedImage || '' }} 
              style={styles.fullImage} 
              resizeMode="contain"
            />
          </View>
        </Modal>

        {/* Image principale et miniatures */}
        <View style={styles.imageGalleryContainer}>
          <TouchableOpacity 
            onPress={() => showImage(product.image_urls?.[0] || '')}
            activeOpacity={0.8}
          >
            <Image 
              source={{ uri: product.image_urls?.[0] || 'https://via.placeholder.com/300' }} 
              style={styles.mainImage}
              resizeMode="cover"
            />
          </TouchableOpacity>
          
          <FlatList
            data={(product.image_urls || []).slice(1, 5)}
            renderItem={({ item }) => (
              <TouchableOpacity onPress={() => showImage(item)} activeOpacity={0.8}>
                <Image source={{ uri: item }} style={styles.thumbnail} />
              </TouchableOpacity>
            )}
            keyExtractor={(_, idx) => idx.toString()}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.thumbnailsContainer}
          />
        </View>

        {/* Détails du produit */}
        <View style={styles.content}>
          <Text style={styles.title}>{product.title}</Text>
          <Text style={styles.category}>{product.category}</Text>
          
          <View style={styles.priceRow}>
            <Text style={styles.price}>${formatPrice(product.price)}</Text>
            {product.original_price && (
              <Text style={styles.originalPrice}>${formatPrice(product.original_price)}</Text>
            )}
          </View>
          
          <View style={styles.stockBadge}>
            <Text style={[styles.stockText, product.stock > 0 ? styles.inStock : styles.outOfStock]}>
              {product.stock > 0 ? 'En stock' : 'Rupture de stock'}
            </Text>
          </View>
          
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Description</Text>
            <Text style={styles.description}>
              {product.description || 'Aucune description fournie.'}
            </Text>
          </View>
          
          {/* Infos vendeur */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Vendeur</Text>
            <View style={styles.sellerCard}>
              <View style={styles.sellerRow}>
                <FontAwesome name="user" size={20} color="#4CB050" />
                <Text style={styles.sellerText}>{product.seller?.name || 'Nom non disponible'}</Text>
              </View>
              
              <View style={styles.sellerRow}>
                <FontAwesome name="phone" size={20} color="#4CB050" />
                <Text style={styles.sellerText}>{product.seller?.phone || 'Téléphone non disponible'}</Text>
              </View>
              
              <View style={styles.sellerRow}>
                <FontAwesome name="envelope" size={20} color="#4CB050" />
                <Text style={styles.sellerText}>{product.seller?.email || 'Email non disponible'}</Text>
              </View>
              
              <View style={styles.sellerRow}>
                <FontAwesome name="map-marker" size={20} color="#4CB050" />
                <Text style={styles.sellerText}>{product.seller?.address || 'Adresse non disponible'}</Text>
              </View>
            </View>
          </View>

          {/* Actions rapides */}
          <View style={styles.dashboardContainer}>
            <Text style={styles.sectionTitle}>Actions rapides</Text>
            <View style={styles.dashboardGrid}>
              {[
                { icon: 'whatsapp', text: 'Contacter', action: openWhatsApp, color: '#25D366' },
                { icon: 'shopping-cart', text: 'Panier', action: ajouterAuPanier, color: '#4CB050' },
                { icon: 'check', text: 'Commander', action: commanderProduit, color: '#1877F2' },
              ].map((item, index) => (
                <TouchableOpacity 
                  key={index}
                  style={styles.dashboardCard}
                  onPress={item.action}
                >
                  <View style={[styles.dashboardIcon, { backgroundColor: `${item.color}20` }]}>
                    <FontAwesome name={item.icon} size={24} color={item.color} />
                  </View>
                  <Text style={styles.dashboardText}>{item.text}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Produits similaires */}
          {similarProducts.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Produits similaires</Text>
              <FlatList
                data={similarProducts}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={styles.similarCard}
                    onPress={() => router.push(`/(tabs)/Auth/Panier/DetailId/${item.id}`)}
                    activeOpacity={0.8}
                  >
                    <Image 
                      source={{ uri: item.image_urls?.[0] || 'https://via.placeholder.com/150' }} 
                      style={styles.similarImage}
                      resizeMode="cover"
                    />
                    <Text numberOfLines={1} style={styles.similarTitle}>{item.title}</Text>
                    <Text style={styles.similarPrice}>${formatPrice(item.price)}</Text>
                  </TouchableOpacity>
                )}
                keyExtractor={item => item.id.toString()}
                numColumns={2}
                columnWrapperStyle={styles.similarGrid}
                scrollEnabled={false}
              />
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  mainContainer: {
    flex: 1,
    backgroundColor: '#202A36',
  },
  container: {
    flex: 1,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#202A36',
  },
  errorText: {
    color: '#fff',
    fontSize: 18,
    margin: 20,
    textAlign: 'center',
  },
  backBtn: {
    backgroundColor: '#4CB050',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 6,
  },
  backText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '500',
  },
  imageGalleryContainer: {
    marginBottom: 20,
  },
  mainImage: {
    width: '100%',
    height: 350,
    backgroundColor: '#2C3A4A',
  },
  thumbnailsContainer: {
    padding: 10,
    justifyContent: 'center',
  },
  thumbnail: {
    width: 80,
    height: 80,
    marginHorizontal: 5,
    borderRadius: 8,
    backgroundColor: '#2C3A4A',
  },
  content: {
    padding: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 5,
  },
  category: {
    color: '#4CA4B0',
    fontSize: 16,
    marginBottom: 15,
    fontWeight: '500',
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
  },
  price: {
    fontSize: 26,
    color: '#fff',
    fontWeight: '700',
  },
  originalPrice: {
    fontSize: 18,
    color: '#aaa',
    textDecorationLine: 'line-through',
    marginLeft: 14,
  },
  stockBadge: {
    alignSelf: 'flex-start',
    marginBottom: 20,
    backgroundColor: '#2C3A4A',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 20,
  },
  stockText: {
    fontWeight: '700',
    fontSize: 14,
  },
  inStock: {
    color: '#4CB050',
  },
  outOfStock: {
    color: '#FF6B6B',
  },
  section: {
    marginBottom: 25,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 15,
  },
  description: {
    color: '#E2E8F0',
    fontSize: 16,
    lineHeight: 24,
  },
  sellerCard: {
    backgroundColor: '#2C3A4A',
    borderRadius: 10,
    padding: 16,
    elevation: 2,
  },
  sellerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
  },
  sellerText: {
    fontSize: 16,
    color: '#fff',
    marginLeft: 12,
    flexShrink: 1,
  },
  dashboardContainer: {
    marginHorizontal: 0,
    marginBottom: 24,
  },
  dashboardGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginTop: 12,
  },
  dashboardCard: {
    width: '32%',
    backgroundColor: '#2C3A4A',
    borderRadius: 10,
    padding: 16,
    marginBottom: 16,
    alignItems: 'center',
    elevation: 2,
  },
  dashboardIcon: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  dashboardText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
    textAlign: 'center',
  },
  similarGrid: {
    justifyContent: 'space-between',
  },
  similarCard: {
    width: ITEM_WIDTH,
    marginBottom: 20,
    backgroundColor: '#2C3A4A',
    borderRadius: 10,
    padding: 10,
    elevation: 2,
  },
  similarImage: {
    width: '100%',
    height: ITEM_WIDTH,
    borderRadius: 8,
    marginBottom: 8,
  },
  similarTitle: {
    fontSize: 14,
    color: '#fff',
    fontWeight: '600',
  },
  similarPrice: {
    fontSize: 14,
    color: '#4CB050',
    fontWeight: '700',
  },
  modalBackground: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  fullImage: {
    width: '90%',
    height: '80%',
    borderRadius: 8,
  },
  closeBtn: {
    position: 'absolute',
    top: 40,
    right: 20,
    zIndex: 100,
  },
  notificationContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    backgroundColor: '#4CB050',
    paddingVertical: 10,
    paddingHorizontal: 20,
    zIndex: 1000,
    flexDirection: 'row',
    alignItems: 'center',
  },
  notificationContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  notificationText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 16,
    marginLeft: 10,
  },
});
