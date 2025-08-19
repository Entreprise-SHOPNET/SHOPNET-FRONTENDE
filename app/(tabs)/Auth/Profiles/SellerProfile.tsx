


import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  Image,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
  TouchableOpacity,
  Linking,
  Alert,
} from 'react-native';
import axios from 'axios';
import { FontAwesome } from '@expo/vector-icons';
import { useLocalSearchParams } from 'expo-router';

// Interfaces basées sur la structure du backend
interface Product {
  id: number;
  title: string;
  description: string;
  price: number;
  original_price: number | null;
  stock: number;
  category: string;
  condition: string;
  created_at: string;
  images: string[];
}

interface Seller {
  id: number;
  name: string;
  companyName: string | null;
  address: string | null;
  profilePhoto: string | null;
  coverPhoto: string | null;
  description: string | null;
  memberSince: string;
  products: Product[];
}

const SellerProfile = () => {
  const { sellerId } = useLocalSearchParams();
  const numericSellerId = Number(sellerId);
  const [seller, setSeller] = useState<Seller | null>(null);
  const [loading, setLoading] = useState(true);
  const [showAllProducts, setShowAllProducts] = useState(false);
  const [isFavorite, setIsFavorite] = useState(false);

  if (!sellerId || isNaN(numericSellerId)) {
    return (
      <View style={[styles.container, styles.center]}>
        <Text style={styles.errorText}>Identifiant vendeur invalide.</Text>
      </View>
    );
  }

  useEffect(() => {
    const fetchSeller = async () => {
      try {
        const res = await axios.get(`https://shopnet-backend.onrender.com/api/sellers/${numericSellerId}`);
        if (res.data.success && res.data.seller) {
          const sellerData = res.data.seller;
          setSeller(sellerData);
        } else {
          setSeller(null);
        }
      } catch (error) {
        console.error('Erreur fetch seller:', error);
        setSeller(null);
      } finally {
        setLoading(false);
      }
    };

    fetchSeller();
  }, [numericSellerId]);

  const handleContact = (method: 'email' | 'phone' | 'chat') => {
    Alert.alert('Contact', `Fonctionnalité ${method} à venir`);
  };

  const toggleFavorite = () => {
    setIsFavorite(!isFavorite);
  };

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString();
  };


  const renderProduct = ({ item }: { item: Product }) => (
  <View style={styles.productCard}>
    {item.images.length > 0 ? (
      <Image source={{ uri: item.images[0] }} style={styles.productImage} />
    ) : (
      <View style={[styles.productImage, styles.noImage]}>
        <FontAwesome name="image" size={40} color="#666" />
        <Text style={{ color: '#666', fontSize: 12 }}>Pas d'image</Text>
      </View>
    )}
    <View style={styles.productInfo}>
      <Text style={styles.productTitle}>{item.title}</Text>
      <Text style={styles.productPrice}>
        ${item.price.toFixed(2)}{' '}
        {item.original_price && item.original_price > item.price && (
          <Text style={styles.originalPrice}>${item.original_price.toFixed(2)}</Text>
        )}
      </Text>

      {/* Correction ici */}
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        <FontAwesome name="archive" size={14} color="#4CB050" />
        <Text style={[styles.productStock, { marginLeft: 5 }]}>Stock: {item.stock}</Text>
      </View>
    </View>
  </View>
);



  if (loading) {
    return (
      <View style={[styles.container, styles.center]}>
        <ActivityIndicator size="large" color="#4CB050" />
      </View>
    );
  }

  if (!seller) {
    return (
      <View style={[styles.container, styles.center]}>
        <Text style={styles.errorText}>Vendeur non trouvé.</Text>
      </View>
    );
  }

  const displayedProducts = showAllProducts 
    ? seller.products 
    : seller.products.slice(0, 5);

  // Données simulées pour les fonctionnalités non fournies par le backend
  const simulatedData = {
    productsSold: 60,
    satisfactionRate: 97,
    badges: ['premium', 'top-seller'],
    averageRating: 4.5,
    totalReviews: 23,
  };

  return (
    <ScrollView style={styles.container}>
      {seller.coverPhoto ? (
        <Image source={{ uri: seller.coverPhoto }} style={styles.coverPhoto} />
      ) : (
        <View style={[styles.coverPhoto, styles.coverPlaceholder]}>
          <FontAwesome name="building" size={60} color="#555" />
        </View>
      )}

      <View style={styles.profileSection}>
        {seller.profilePhoto ? (
          <Image source={{ uri: seller.profilePhoto }} style={styles.profilePhoto} />
        ) : (
          <View style={[styles.profilePhoto, styles.profilePlaceholder]}>
            <FontAwesome name="user" size={40} color="#999" />
          </View>
        )}
        <View style={{ marginLeft: 15, flex: 1 }}>
          <Text style={styles.sellerName}>{seller.name}</Text>
          {seller.companyName && <Text style={styles.companyName}>{seller.companyName}</Text>}
          
          {/* Badges simulés */}
          <View style={styles.badgesContainer}>
            {simulatedData.badges.map((badge, index) => (
              <View key={index} style={styles.badge}>
                <Text style={styles.badgeText}>{badge}</Text>
              </View>
            ))}
          </View>
          
          {/* Note et avis simulés */}
          <View style={styles.ratingContainer}>
            <FontAwesome name="star" size={16} color="#FFD700" />
            <Text style={styles.ratingText}>
              {simulatedData.averageRating.toFixed(1)} ({simulatedData.totalReviews} avis)
            </Text>
          </View>
        </View>
        
        {/* Bouton favori */}
        <TouchableOpacity onPress={toggleFavorite} style={styles.favoriteButton}>
          <FontAwesome 
            name={isFavorite ? "heart" : "heart-o"} 
            size={24} 
            color={isFavorite ? "#FF5A5F" : "#9AB9D3"} 
          />
        </TouchableOpacity>
      </View>

      {/* Historique vertical avec données simulées */}
      <View style={styles.infoSection}>
        <View style={styles.historyContainer}>
          <View style={styles.historyItem}>
            <FontAwesome name="calendar" size={16} color="#9AB9D3" />
            <Text style={styles.historyText}>Membre depuis {formatDate(seller.memberSince)}</Text>
          </View>
          <View style={styles.historyItem}>
            <FontAwesome name="shopping-bag" size={16} color="#9AB9D3" />
            <Text style={styles.historyText}>Plus de {simulatedData.productsSold} produits vendus</Text>
          </View>
          <View style={styles.historyItem}>
            <FontAwesome name="smile-o" size={16} color="#9AB9D3" />
            <Text style={styles.historyText}>Satisfaction client: {simulatedData.satisfactionRate}%</Text>
          </View>
        </View>
      </View>

      {/* Section réseaux sociaux simulée */}
      <View style={styles.infoSection}>
        <Text style={styles.sectionTitle}>Réseaux sociaux</Text>
        <View style={styles.socialContainer}>
          <TouchableOpacity 
            style={styles.socialButton}
            onPress={() => handleContact('chat')}
          >
            <FontAwesome name="facebook" size={20} color="#9AB9D3" />
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.socialButton}
            onPress={() => handleContact('chat')}
          >
            <FontAwesome name="instagram" size={20} color="#9AB9D3" />
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.socialButton}
            onPress={() => handleContact('chat')}
          >
            <FontAwesome name="twitter" size={20} color="#9AB9D3" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Localisation */}
      {seller.address && (
        <View style={styles.infoSection}>
          <Text style={styles.sectionTitle}>Localisation</Text>
          <View style={styles.mapPlaceholder}>
            <FontAwesome name="map-marker" size={30} color="#4CB050" />
            <Text style={styles.addressText}>{seller.address}</Text>
            <Text style={styles.mapText}>Carte interactive (Google Maps)</Text>
          </View>
        </View>
      )}

      {/* Sections détaillées */}
      {seller.description && (
        <View style={styles.infoSection}>
          <Text style={styles.sectionTitle}>À propos</Text>
          <Text style={styles.infoText}>{seller.description}</Text>
        </View>
      )}
      
      <View style={styles.infoSection}>
        <Text style={styles.sectionTitle}>Politiques</Text>
        <View style={styles.policyItem}>
          <FontAwesome name="check-circle" size={16} color="#4CB050" />
          <Text style={styles.policyText}>Retours acceptés sous 14 jours</Text>
        </View>
        <View style={styles.policyItem}>
          <FontAwesome name="check-circle" size={16} color="#4CB050" />
          <Text style={styles.policyText}>Livraison gratuite à partir de 50€</Text>
        </View>
        <View style={styles.policyItem}>
          <FontAwesome name="check-circle" size={16} color="#4CB050" />
          <Text style={styles.policyText}>Garantie 1 an sur tous les produits</Text>
        </View>
      </View>

      {/* Produits */}
      <View style={styles.productsContainer}>
        <View style={styles.productsHeader}>
          <Text style={styles.productsTitle}>Produits en vente</Text>
          {seller.products.length > 5 && (
            <TouchableOpacity onPress={() => setShowAllProducts(!showAllProducts)}>
              <Text style={styles.seeAllButton}>
                {showAllProducts ? 'Voir moins' : 'Voir tous'}
              </Text>
            </TouchableOpacity>
          )}
        </View>
        
        {displayedProducts.length === 0 ? (
          <Text style={styles.noProductsText}>
            Ce vendeur n'a pas encore de produits en vente.
          </Text>
        ) : (
          <FlatList
            data={displayedProducts}
            keyExtractor={(item) => item.id.toString()}
            renderItem={renderProduct}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: 10 }}
          />
        )}
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#202A36',
  },
  center: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    color: '#F44336',
    fontSize: 18,
  },
  coverPhoto: {
    width: '100%',
    height: 180,
    resizeMode: 'cover',
    backgroundColor: '#2B3948',
  },
  coverPlaceholder: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileSection: {
    flexDirection: 'row',
    paddingHorizontal: 15,
    paddingVertical: 15,
    backgroundColor: '#273646',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#34465D',
  },
  profilePhoto: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#3B4A63',
  },
  profilePlaceholder: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  sellerName: {
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: 'bold',
  },
  companyName: {
    color: '#4CB050',
    fontSize: 16,
    marginTop: 2,
  },
  badgesContainer: {
    flexDirection: 'row',
    marginTop: 8,
    flexWrap: 'wrap',
  },
  badge: {
    backgroundColor: '#4CB050',
    borderRadius: 4,
    paddingVertical: 2,
    paddingHorizontal: 6,
    marginRight: 6,
    marginBottom: 4,
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: 'bold',
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
  },
  ratingText: {
    color: '#FFD700',
    marginLeft: 5,
    fontSize: 14,
  },
  favoriteButton: {
    padding: 10,
  },
  infoSection: {
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#34465D',
  },
  sectionTitle: {
    color: '#4CB050',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  infoText: {
    color: '#BCC8D7',
    marginLeft: 10,
    fontSize: 16,
  },
  socialContainer: {
    flexDirection: 'row',
    marginTop: 15,
  },
  socialButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#34465D',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  mapPlaceholder: {
    height: 150,
    backgroundColor: '#273646',
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 10,
  },
  addressText: {
    color: '#FFFFFF',
    marginTop: 10,
    fontSize: 16,
    fontWeight: '500',
  },
  mapText: {
    color: '#9AB9D3',
    marginTop: 5,
    fontSize: 14,
  },
  productsContainer: {
    paddingVertical: 15,
  },
  productsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 15,
    marginBottom: 10,
  },
  productsTitle: {
    color: '#4CB050',
    fontSize: 18,
    fontWeight: '600',
  },
  seeAllButton: {
    color: '#4CB050',
    fontSize: 14,
    fontWeight: 'bold',
  },
  noProductsText: {
    color: '#ccc',
    fontStyle: 'italic',
    textAlign: 'center',
    marginVertical: 20,
  },
  productCard: {
    backgroundColor: '#273646',
    borderRadius: 8,
    marginRight: 15,
    width: 180,
    overflow: 'hidden',
  },
  productImage: {
    width: '100%',
    height: 110,
    resizeMode: 'cover',
    backgroundColor: '#3B4A63',
  },
  noImage: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  productInfo: {
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  productTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  productPrice: {
    color: '#4CB050',
    fontSize: 14,
    marginTop: 4,
  },
  originalPrice: {
    textDecorationLine: 'line-through',
    color: '#768696',
    fontSize: 12,
    marginLeft: 6,
  },
  productStock: {
    color: '#9AB9D3',
    marginTop: 4,
    fontSize: 12,
  },
  historyContainer: {
    backgroundColor: '#273646',
    borderRadius: 10,
    padding: 15,
  },
  historyItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  historyText: {
    color: '#BCC8D7',
    marginLeft: 10,
    fontSize: 16,
  },
  policyItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  policyText: {
    color: '#BCC8D7',
    marginLeft: 10,
    fontSize: 16,
  },
});

export default SellerProfile;