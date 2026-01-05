

import React, { useEffect, useState, useCallback } from 'react';
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
  Modal,
  TextInput,
  Dimensions,
  Platform,
  SafeAreaView,
  StatusBar,
} from 'react-native';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { 
  FontAwesome, 
  Ionicons, 
  MaterialIcons,
  Feather 
} from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import Toast from 'react-native-toast-message';

const { width, height } = Dimensions.get('window');

// Couleurs premium SHOPNET
const PRIMARY_BLUE = '#00182A';
const PRO_BLUE = '#42A5F5';
const PRO_GREEN = '#4CAF50';
const PRO_ORANGE = '#FF9800';
const PRO_RED = '#F44336';
const PRO_PURPLE = '#9C27B0';
const PREMIUM_GOLD = '#FFD700';
const CARD_BG = 'rgba(30, 42, 59, 0.9)';
const BORDER_COLOR = 'rgba(66, 165, 245, 0.1)';
const TEXT_WHITE = '#FFFFFF';
const TEXT_SECONDARY = '#A0AEC0';

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
  is_boosted: boolean;
}

interface Review {
  id: number;
  user_name: string;
  user_avatar: string;
  rating: number;
  comment: string;
  created_at: string;
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
  socialLinks: {
    facebook?: string;
    whatsapp?: string;
    instagram?: string;
    tiktok?: string;
  };
  followersCount: number;
  rating: number;
  reviewsCount: number;
  isFollowing: boolean;
  reviews?: Review[];
}

interface RatingData {
  rating: number;
  comment: string;
}

const SellerProfile = () => {
  const { sellerId } = useLocalSearchParams();
  const router = useRouter();
  const numericSellerId = Number(sellerId);
  const [seller, setSeller] = useState<Seller | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [ratingModalVisible, setRatingModalVisible] = useState(false);
  const [ratingData, setRatingData] = useState<RatingData>({
    rating: 5,
    comment: ''
  });
  const [showAllReviews, setShowAllReviews] = useState(false);

  // Vérifier si l'ID est valide
  useEffect(() => {
    if (!sellerId || isNaN(numericSellerId)) {
      Toast.show({
        type: 'error',
        text1: 'Erreur',
        text2: 'ID du vendeur invalide'
      });
      router.back();
    }
  }, [sellerId, numericSellerId]);

  const fetchSeller = useCallback(async () => {
    try {
      const token = await AsyncStorage.getItem('userToken');
      const res = await axios.get(
        `https://shopnet-backend.onrender.com/api/sellers/${numericSellerId}`,
        {
          headers: token ? { Authorization: `Bearer ${token}` } : {}
        }
      );
      
      if (res.data.success && res.data.seller) {
        // Assurer que reviews existe
        const sellerData = {
          ...res.data.seller,
          reviews: res.data.seller.reviews || [],
          products: res.data.seller.products || [],
          socialLinks: res.data.seller.socialLinks || {},
          followersCount: res.data.seller.followersCount || 0,
          rating: res.data.seller.rating || 0,
          reviewsCount: res.data.seller.reviewsCount || 0,
          isFollowing: res.data.seller.isFollowing || false
        };
        setSeller(sellerData);
      } else {
        Toast.show({
          type: 'error',
          text1: 'Erreur',
          text2: 'Impossible de charger le profil du vendeur'
        });
      }
    } catch (error: any) {
      console.error('Erreur fetch seller:', error.message);
      Toast.show({
        type: 'error',
        text1: 'Erreur',
        text2: error.message || 'Problème de connexion au serveur'
      });
    } finally {
      setLoading(false);
    }
  }, [numericSellerId]);

  useEffect(() => {
    if (numericSellerId) {
      fetchSeller();
    }
  }, [fetchSeller, numericSellerId]);

  const handleFollowToggle = async () => {
    if (!seller) return;
    
    try {
      setActionLoading(true);
      const token = await AsyncStorage.getItem('userToken');
      if (!token) {
        Toast.show({
          type: 'error',
          text1: 'Connexion requise',
          text2: 'Connectez-vous pour suivre ce vendeur'
        });
        router.push('/Auth/auth');
        return;
      }

      const endpoint = seller.isFollowing 
        ? `https://shopnet-backend.onrender.com/api/sellers/${numericSellerId}/unfollow`
        : `https://shopnet-backend.onrender.com/api/sellers/${numericSellerId}/follow`;
      
      const res = await axios.post(endpoint, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (res.data.success) {
        setSeller(prev => prev ? {
          ...prev,
          isFollowing: !prev.isFollowing,
          followersCount: prev.isFollowing 
            ? Math.max(0, prev.followersCount - 1)
            : prev.followersCount + 1
        } : null);
        
        Toast.show({
          type: 'success',
          text1: 'Succès',
          text2: seller.isFollowing 
            ? 'Vous ne suivez plus ce vendeur' 
            : 'Vous suivez maintenant ce vendeur'
        });
      }
    } catch (error: any) {
      console.error('Erreur follow toggle:', error.message);
      Toast.show({
        type: 'error',
        text1: 'Erreur',
        text2: error.message || 'Impossible de modifier l\'abonnement'
      });
    } finally {
      setActionLoading(false);
    }
  };

  const handleRateSeller = async () => {
    if (!seller || !ratingData.rating) {
      Toast.show({
        type: 'error',
        text1: 'Erreur',
        text2: 'Veuillez sélectionner une note'
      });
      return;
    }

    try {
      setActionLoading(true);
      const token = await AsyncStorage.getItem('userToken');
      if (!token) {
        Toast.show({
          type: 'error',
          text1: 'Connexion requise',
          text2: 'Connectez-vous pour noter ce vendeur'
        });
        router.push('/Auth/auth');
        return;
      }

      const res = await axios.post(
        `https://shopnet-backend.onrender.com/api/sellers/${numericSellerId}/reviews`,
        ratingData,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (res.data.success) {
        Toast.show({
          type: 'success',
          text1: 'Merci !',
          text2: 'Votre avis a été enregistré'
        });
        setRatingModalVisible(false);
        setRatingData({ rating: 5, comment: '' });
        // Recharger les données du vendeur
        fetchSeller();
      }
    } catch (error: any) {
      console.error('Erreur rating:', error.message);
      Toast.show({
        type: 'error',
        text1: 'Erreur',
        text2: error.message || 'Impossible d\'enregistrer votre avis'
      });
    } finally {
      setActionLoading(false);
    }
  };

  const handleSocialLink = (platform: string, url?: string) => {
    if (!url) {
      Toast.show({
        type: 'info',
        text1: 'Lien indisponible',
        text2: `Le vendeur n'a pas fourni de lien ${platform}`
      });
      return;
    }

    // Formater l'URL selon la plateforme
    let formattedUrl = url;
    if (platform === 'whatsapp' && !url.startsWith('http')) {
      formattedUrl = `https://wa.me/${url.replace(/\D/g, '')}`;
    } else if (platform === 'instagram' && !url.startsWith('http')) {
      formattedUrl = `https://instagram.com/${url}`;
    } else if (platform === 'facebook' && !url.startsWith('http')) {
      formattedUrl = `https://facebook.com/${url}`;
    } else if (platform === 'tiktok' && !url.startsWith('http')) {
      formattedUrl = `https://tiktok.com/@${url}`;
    }

    Linking.openURL(formattedUrl).catch(() => {
      Toast.show({
        type: 'error',
        text1: 'Erreur',
        text2: 'Impossible d\'ouvrir le lien'
      });
    });
  };

  const handleOpenAddress = () => {
    if (!seller?.address) {
      Toast.show({
        type: 'info',
        text1: 'Information',
        text2: 'Adresse non disponible'
      });
      return;
    }
    
    const mapsUrl = Platform.select({
      ios: `maps:?q=${encodeURIComponent(seller.address)}`,
      android: `geo:?q=${encodeURIComponent(seller.address)}`,
      default: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(seller.address)}`
    });

    Linking.openURL(mapsUrl).catch(() => {
      Toast.show({
        type: 'error',
        text1: 'Erreur',
        text2: 'Impossible d\'ouvrir la carte'
      });
    });
  };

  const handleProductPress = (productId: number) => {
    router.push({
      pathname: '/(tabs)/Auth/Panier/DetailId',
      params: { id: productId.toString() }
    });
  };

  const formatDate = (dateStr: string) => {
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString('fr-FR', {
        day: 'numeric',
        month: 'long',
        year: 'numeric'
      });
    } catch {
      return 'Date inconnue';
    }
  };

  const renderStars = (rating: number = 0, size: number = 16) => {
    return (
      <View style={styles.starsContainer}>
        {[1, 2, 3, 4, 5].map((star) => (
          <Ionicons
            key={star}
            name={star <= Math.floor(rating) ? 'star' : 
                  star - 0.5 <= rating ? 'star-half' : 'star-outline'}
            size={size}
            color={star <= rating ? PREMIUM_GOLD : TEXT_SECONDARY}
            style={styles.star}
          />
        ))}
      </View>
    );
  };

  const renderSocialIcon = (platform: string, url?: string) => {
    const icons: any = {
      facebook: { name: 'facebook', color: '#1877F2', icon: 'facebook' },
      whatsapp: { name: 'whatsapp', color: '#25D366', icon: 'whatsapp' },
      instagram: { name: 'instagram', color: '#E4405F', icon: 'instagram' },
      tiktok: { name: 'tiktok', color: '#000000', icon: 'music' }
    };

    const icon = icons[platform];
    if (!icon) return null;

    return (
      <TouchableOpacity
        key={platform}
        style={[styles.socialIcon, { backgroundColor: url ? `${icon.color}20` : '#3A4A5A' }]}
        onPress={() => handleSocialLink(platform, url)}
        disabled={!url}
      >
        <FontAwesome 
          name={icon.icon as any} 
          size={20} 
          color={url ? icon.color : TEXT_SECONDARY} 
        />
      </TouchableOpacity>
    );
  };

  const renderProduct = ({ item }: { item: Product }) => (
    <TouchableOpacity
      style={styles.productCard}
      onPress={() => handleProductPress(item.id)}
      activeOpacity={0.8}
    >
      <View style={styles.productImageContainer}>
        <Image
          source={{ uri: item.images?.[0] || 'https://via.placeholder.com/200x150' }}
          style={styles.productImage}
          resizeMode="cover"
        />
        {item.is_boosted && (
          <View style={styles.boostedBadge}>
            <Ionicons name="rocket" size={12} color="#fff" />
          </View>
        )}
        {item.original_price && item.original_price > item.price && (
          <View style={styles.discountBadge}>
            <Text style={styles.discountText}>
              -{Math.round((1 - item.price / item.original_price) * 100)}%
            </Text>
          </View>
        )}
      </View>
      
      <View style={styles.productInfo}>
        <Text style={styles.productTitle} numberOfLines={2}>
          {item.title || 'Produit sans titre'}
        </Text>
        
        <View style={styles.productPriceContainer}>
          <Text style={styles.productPrice}>${item.price?.toFixed(2) || '0.00'}</Text>
          {item.original_price && item.original_price > item.price && (
            <Text style={styles.originalPrice}>${item.original_price.toFixed(2)}</Text>
          )}
        </View>
        
        <View style={styles.productStats}>
          <View style={styles.productStat}>
            <Ionicons name="cube-outline" size={12} color={PRO_GREEN} />
            <Text style={styles.productStatText}>{item.stock || 0} en stock</Text>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );

  const renderReview = ({ item }: { item: Review }) => (
    <View style={styles.reviewCard}>
      <View style={styles.reviewHeader}>
        <View style={styles.reviewUser}>
          {item.user_avatar ? (
            <Image source={{ uri: item.user_avatar }} style={styles.reviewAvatar} />
          ) : (
            <View style={styles.reviewAvatarPlaceholder}>
              <Ionicons name="person" size={20} color="#fff" />
            </View>
          )}
          <View>
            <Text style={styles.reviewUserName}>{item.user_name || 'Utilisateur'}</Text>
            <Text style={styles.reviewDate}>{formatDate(item.created_at)}</Text>
          </View>
        </View>
        {renderStars(item.rating || 0, 14)}
      </View>
      <Text style={styles.reviewComment}>{item.comment || 'Pas de commentaire'}</Text>
    </View>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar backgroundColor={PRIMARY_BLUE} barStyle="light-content" />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={PRO_BLUE} />
          <Text style={styles.loadingText}>Chargement du profil...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!seller) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar backgroundColor={PRIMARY_BLUE} barStyle="light-content" />
        <View style={styles.errorContainer}>
          <Ionicons name="person-remove-outline" size={80} color={TEXT_SECONDARY} />
          <Text style={styles.errorTitle}>Vendeur non trouvé</Text>
          <Text style={styles.errorText}>
            Le vendeur que vous recherchez n'existe pas ou a été supprimé.
          </Text>
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <Ionicons name="arrow-back" size={20} color="#fff" />
            <Text style={styles.backButtonText}>Retour</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const reviews = seller.reviews || [];
  const visibleReviews = showAllReviews ? reviews : reviews.slice(0, 3);
  const socialLinks = seller.socialLinks || {};

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar backgroundColor={PRIMARY_BLUE} barStyle="light-content" />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButtonHeader}
          onPress={() => router.back()}
        >
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Profil Vendeur</Text>
        <View style={styles.headerActions}>
          <TouchableOpacity 
            style={styles.headerActionButton}
            onPress={() => {
              Toast.show({
                type: 'info',
                text1: 'Partage',
                text2: 'Fonctionnalité bientôt disponible'
              });
            }}
          >
            <Ionicons name="share-outline" size={22} color="#fff" />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView 
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
      >
        {/* Cover Photo */}
        <View style={styles.coverContainer}>
          {seller.coverPhoto ? (
            <Image source={{ uri: seller.coverPhoto }} style={styles.coverPhoto} />
          ) : (
            <View style={styles.coverPlaceholder}>
              <Ionicons name="storefront-outline" size={60} color="#3A4A5A" />
            </View>
          )}
          <View style={styles.coverOverlay} />
        </View>

        {/* Profile Header */}
        <View style={styles.profileHeader}>
          <View style={styles.profileImageContainer}>
            {seller.profilePhoto ? (
              <Image source={{ uri: seller.profilePhoto }} style={styles.profileImage} />
            ) : (
              <View style={styles.profileImagePlaceholder}>
                <Ionicons name="person" size={40} color="#fff" />
              </View>
            )}
            <View style={styles.verificationBadge}>
              <Ionicons name="checkmark-circle" size={20} color={PRO_GREEN} />
            </View>
          </View>

          <View style={styles.profileInfo}>
            <Text style={styles.sellerName}>{seller.name || 'Vendeur'}</Text>
            {seller.companyName && (
              <Text style={styles.companyName}>{seller.companyName}</Text>
            )}
            
            <View style={styles.followersContainer}>
              <Ionicons name="people" size={16} color={PRO_BLUE} />
              <Text style={styles.followersCount}>
                {seller.followersCount || 0} abonnés
              </Text>
            </View>

            <View style={styles.locationContainer}>
              <Ionicons name="location-outline" size={16} color={TEXT_SECONDARY} />
              <Text style={styles.locationText}>
                {seller.address || 'Localisation non précisée'}
              </Text>
            </View>
          </View>
        </View>

        {/* Follow Button */}
        <View style={styles.followContainer}>
          <TouchableOpacity
            style={[
              styles.followButton,
              seller.isFollowing && styles.followingButton
            ]}
            onPress={handleFollowToggle}
            disabled={actionLoading}
          >
            {actionLoading ? (
              <ActivityIndicator size="small" color={seller.isFollowing ? PRO_BLUE : '#fff'} />
            ) : (
              <>
                <Ionicons 
                  name={seller.isFollowing ? 'checkmark-circle' : 'person-add'} 
                  size={20} 
                  color={seller.isFollowing ? PRO_BLUE : '#fff'} 
                />
                <Text style={[
                  styles.followButtonText,
                  seller.isFollowing && styles.followingButtonText
                ]}>
                  {seller.isFollowing ? 'Abonné' : 'S\'abonner'}
                </Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        {/* Social Links */}
        <View style={styles.socialSection}>
          <Text style={styles.sectionTitle}>Réseaux sociaux</Text>
          <View style={styles.socialLinksContainer}>
            {renderSocialIcon('facebook', socialLinks.facebook)}
            {renderSocialIcon('whatsapp', socialLinks.whatsapp)}
            {renderSocialIcon('instagram', socialLinks.instagram)}
            {renderSocialIcon('tiktok', socialLinks.tiktok)}
          </View>
        </View>

        {/* Description */}
        {seller.description && (
          <View style={styles.descriptionSection}>
            <Text style={styles.sectionTitle}>À propos</Text>
            <View style={styles.descriptionCard}>
              <Text style={styles.descriptionText}>{seller.description}</Text>
            </View>
          </View>
        )}

        {/* Products Section */}
        <View style={styles.productsSection}>
          <Text style={styles.sectionTitle}>Produits en vente</Text>
          
          {!seller.products || seller.products.length === 0 ? (
            <View style={styles.emptySection}>
              <Ionicons name="cube-outline" size={60} color={TEXT_SECONDARY} />
              <Text style={styles.emptyText}>Aucun produit disponible</Text>
              <Text style={styles.emptySubtext}>
                Ce vendeur n'a pas encore publié de produits
              </Text>
            </View>
          ) : (
            <FlatList
              data={seller.products}
              keyExtractor={(item) => item.id.toString()}
              renderItem={renderProduct}
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.productsList}
              decelerationRate="fast"
              snapToInterval={width * 0.7 + 16}
              snapToAlignment="center"
            />
          )}
        </View>

        {/* Reviews Section */}
        <View style={styles.reviewsSection}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Avis des clients</Text>
            <TouchableOpacity
              style={styles.addReviewButton}
              onPress={() => setRatingModalVisible(true)}
            >
              <Ionicons name="add-circle-outline" size={20} color={PRO_BLUE} />
              <Text style={styles.addReviewText}>Ajouter un avis</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.ratingSummary}>
            <Text style={styles.ratingNumber}>{(seller.rating || 0).toFixed(1)}</Text>
            <View>
              {renderStars(seller.rating || 0, 20)}
              <Text style={styles.reviewsCountText}>
                Basé sur {seller.reviewsCount || 0} avis
              </Text>
            </View>
          </View>

          {reviews.length === 0 ? (
            <View style={styles.emptySection}>
              <Ionicons name="star-outline" size={60} color={TEXT_SECONDARY} />
              <Text style={styles.emptyText}>Aucun avis pour l'instant</Text>
              <Text style={styles.emptySubtext}>
                Soyez le premier à noter ce vendeur
              </Text>
              <TouchableOpacity
                style={styles.rateButton}
                onPress={() => setRatingModalVisible(true)}
              >
                <Text style={styles.rateButtonText}>Noter ce vendeur</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <>
              <FlatList
                data={visibleReviews}
                keyExtractor={(item) => item.id.toString()}
                renderItem={renderReview}
                scrollEnabled={false}
                ItemSeparatorComponent={() => <View style={styles.reviewSeparator} />}
              />
              {reviews.length > 3 && (
                <TouchableOpacity
                  style={styles.showMoreButton}
                  onPress={() => setShowAllReviews(!showAllReviews)}
                >
                  <Text style={styles.showMoreText}>
                    {showAllReviews ? 'Voir moins' : `Voir tous les avis (${reviews.length})`}
                  </Text>
                  <Ionicons 
                    name={showAllReviews ? 'chevron-up' : 'chevron-down'} 
                    size={20} 
                    color={PRO_BLUE} 
                  />
                </TouchableOpacity>
              )}
            </>
          )}
        </View>
      </ScrollView>

      {/* Rating Modal */}
      <Modal
        visible={ratingModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setRatingModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Noter {seller.name}</Text>
              <TouchableOpacity
                onPress={() => setRatingModalVisible(false)}
              >
                <Ionicons name="close" size={24} color={TEXT_SECONDARY} />
              </TouchableOpacity>
            </View>

            <View style={styles.ratingStarsModal}>
              {[1, 2, 3, 4, 5].map((star) => (
                <TouchableOpacity
                  key={star}
                  onPress={() => setRatingData({...ratingData, rating: star})}
                >
                  <Ionicons
                    name={star <= ratingData.rating ? 'star' : 'star-outline'}
                    size={40}
                    color={PREMIUM_GOLD}
                  />
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.ratingLabel}>
              {ratingData.rating === 5 ? 'Excellent' :
               ratingData.rating === 4 ? 'Très bon' :
               ratingData.rating === 3 ? 'Bon' :
               ratingData.rating === 2 ? 'Moyen' : 'Médiocre'}
            </Text>

            <TextInput
              style={styles.commentInput}
              placeholder="Partagez votre expérience avec ce vendeur..."
              placeholderTextColor={TEXT_SECONDARY}
              multiline
              numberOfLines={4}
              value={ratingData.comment}
              onChangeText={(text) => setRatingData({...ratingData, comment: text})}
            />

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => setRatingModalVisible(false)}
              >
                <Text style={styles.cancelButtonText}>Annuler</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.modalButton, styles.submitButton]}
                onPress={handleRateSeller}
                disabled={actionLoading}
              >
                {actionLoading ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.submitButtonText}>Publier l'avis</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: PRIMARY_BLUE,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: PRO_BLUE,
    fontSize: 16,
    marginTop: 12,
    fontWeight: '500',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorTitle: {
    color: TEXT_WHITE,
    fontSize: 24,
    fontWeight: '700',
    marginTop: 16,
    marginBottom: 8,
  },
  errorText: {
    color: TEXT_SECONDARY,
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 15,
    backgroundColor: PRIMARY_BLUE,
    borderBottomWidth: 1,
    borderBottomColor: BORDER_COLOR,
  },
  backButtonHeader: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: TEXT_WHITE,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerActionButton: {
    padding: 8,
    marginLeft: 8,
  },
  scrollView: {
    flex: 1,
  },
  coverContainer: {
    position: 'relative',
    height: 180,
  },
  coverPhoto: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  coverPlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: '#1A2332',
    justifyContent: 'center',
    alignItems: 'center',
  },
  coverOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 80,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  profileHeader: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    marginTop: -40,
    alignItems: 'flex-end',
    marginBottom: 20,
  },
  profileImageContainer: {
    position: 'relative',
  },
  profileImage: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 3,
    borderColor: PRIMARY_BLUE,
    backgroundColor: CARD_BG,
  },
  profileImagePlaceholder: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: PRO_BLUE,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: PRIMARY_BLUE,
  },
  verificationBadge: {
    position: 'absolute',
    bottom: 5,
    right: 5,
    backgroundColor: PRIMARY_BLUE,
    borderRadius: 10,
    padding: 2,
  },
  profileInfo: {
    flex: 1,
    marginLeft: 16,
    marginBottom: 10,
  },
  sellerName: {
    fontSize: 22,
    fontWeight: '800',
    color: TEXT_WHITE,
    marginBottom: 4,
  },
  companyName: {
    fontSize: 14,
    color: PRO_BLUE,
    fontWeight: '600',
    marginBottom: 8,
  },
  followersContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 6,
  },
  followersCount: {
    color: PRO_BLUE,
    fontSize: 14,
    fontWeight: '600',
  },
  locationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  locationText: {
    color: TEXT_SECONDARY,
    fontSize: 13,
    marginLeft: 6,
    flex: 1,
  },
  followContainer: {
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  followButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: PRO_BLUE,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 25,
    gap: 8,
  },
  followingButton: {
    backgroundColor: 'rgba(66, 165, 245, 0.1)',
    borderWidth: 1,
    borderColor: PRO_BLUE,
  },
  followButtonText: {
    color: TEXT_WHITE,
    fontSize: 16,
    fontWeight: '600',
  },
  followingButtonText: {
    color: PRO_BLUE,
  },
  socialSection: {
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: TEXT_WHITE,
    marginBottom: 12,
  },
  socialLinksContainer: {
    flexDirection: 'row',
    gap: 16,
  },
  socialIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: BORDER_COLOR,
  },
  descriptionSection: {
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  descriptionCard: {
    backgroundColor: CARD_BG,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: BORDER_COLOR,
  },
  descriptionText: {
    color: TEXT_SECONDARY,
    fontSize: 14,
    lineHeight: 22,
  },
  productsSection: {
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  productsList: {
    paddingRight: 20,
  },
  productCard: {
    width: width * 0.65,
    backgroundColor: CARD_BG,
    borderRadius: 12,
    marginRight: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: BORDER_COLOR,
  },
  productImageContainer: {
    position: 'relative',
    height: 140,
  },
  productImage: {
    width: '100%',
    height: '100%',
  },
  boostedBadge: {
    position: 'absolute',
    top: 8,
    left: 8,
    backgroundColor: PRO_ORANGE,
    paddingHorizontal: 6,
    paddingVertical: 4,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  discountBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: PRO_RED,
    paddingHorizontal: 6,
    paddingVertical: 4,
    borderRadius: 8,
  },
  discountText: {
    color: TEXT_WHITE,
    fontSize: 11,
    fontWeight: '700',
  },
  productInfo: {
    padding: 12,
  },
  productTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: TEXT_WHITE,
    marginBottom: 6,
    lineHeight: 18,
  },
  productPriceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  productPrice: {
    fontSize: 16,
    fontWeight: '800',
    color: PRO_GREEN,
  },
  originalPrice: {
    fontSize: 13,
    color: TEXT_SECONDARY,
    textDecorationLine: 'line-through',
    marginLeft: 6,
  },
  productStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  productStat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  productStatText: {
    fontSize: 11,
    color: TEXT_SECONDARY,
  },
  emptySection: {
    alignItems: 'center',
    paddingVertical: 30,
    backgroundColor: CARD_BG,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: BORDER_COLOR,
  },
  emptyText: {
    color: TEXT_SECONDARY,
    fontSize: 15,
    fontWeight: '600',
    marginTop: 16,
  },
  emptySubtext: {
    color: TEXT_SECONDARY,
    fontSize: 13,
    marginTop: 4,
    textAlign: 'center',
    lineHeight: 18,
    paddingHorizontal: 20,
  },
  reviewsSection: {
    paddingHorizontal: 20,
    marginBottom: 30,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  addReviewButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    padding: 8,
  },
  addReviewText: {
    color: PRO_BLUE,
    fontSize: 14,
    fontWeight: '600',
  },
  ratingSummary: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: CARD_BG,
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: BORDER_COLOR,
  },
  ratingNumber: {
    fontSize: 40,
    fontWeight: '800',
    color: TEXT_WHITE,
    marginRight: 16,
  },
  reviewsCountText: {
    color: TEXT_SECONDARY,
    fontSize: 13,
    marginTop: 4,
  },
  reviewCard: {
    backgroundColor: CARD_BG,
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: BORDER_COLOR,
  },
  reviewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  reviewUser: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  reviewAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    marginRight: 10,
  },
  reviewAvatarPlaceholder: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: PRO_BLUE,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  reviewUserName: {
    fontSize: 15,
    fontWeight: '600',
    color: TEXT_WHITE,
    marginBottom: 2,
  },
  reviewDate: {
    fontSize: 11,
    color: TEXT_SECONDARY,
  },
  reviewComment: {
    color: TEXT_SECONDARY,
    fontSize: 13,
    lineHeight: 18,
  },
  reviewSeparator: {
    height: 8,
  },
  showMoreButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    gap: 8,
  },
  showMoreText: {
    color: PRO_BLUE,
    fontSize: 15,
    fontWeight: '600',
  },
  starsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  star: {
    marginRight: 2,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: PRO_BLUE,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 25,
    gap: 8,
  },
  backButtonText: {
    color: TEXT_WHITE,
    fontSize: 16,
    fontWeight: '600',
  },
  rateButton: {
    backgroundColor: PRO_BLUE,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 25,
    marginTop: 16,
  },
  rateButtonText: {
    color: TEXT_WHITE,
    fontSize: 15,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: PRIMARY_BLUE,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 24,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: TEXT_WHITE,
  },
  ratingStarsModal: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 12,
    marginBottom: 16,
  },
  ratingLabel: {
    fontSize: 18,
    fontWeight: '600',
    color: TEXT_WHITE,
    textAlign: 'center',
    marginBottom: 20,
  },
  commentInput: {
    backgroundColor: CARD_BG,
    borderRadius: 12,
    padding: 16,
    color: TEXT_WHITE,
    fontSize: 15,
    minHeight: 120,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: BORDER_COLOR,
    textAlignVertical: 'top',
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButton: {
    backgroundColor: CARD_BG,
    borderWidth: 1,
    borderColor: BORDER_COLOR,
  },
  cancelButtonText: {
    color: TEXT_SECONDARY,
    fontSize: 15,
    fontWeight: '600',
  },
  submitButton: {
    backgroundColor: PRO_BLUE,
  },
  submitButtonText: {
    color: TEXT_WHITE,
    fontSize: 15,
    fontWeight: '600',
  },
});

export default SellerProfile;