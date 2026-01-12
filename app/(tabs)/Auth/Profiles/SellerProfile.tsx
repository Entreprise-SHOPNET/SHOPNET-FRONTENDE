

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
  Feather,
  MaterialCommunityIcons 
} from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import Toast from 'react-native-toast-message';

const { width } = Dimensions.get('window');

// Couleurs SHOPNET
const SHOPNET_BLUE = "#00182A";
const PRO_BLUE = "#42A5F5";
const SHOPNET_WHITE = "#FFFFFF";
const SHOPNET_GRAY = "#1A2B3C";
const SHOPNET_LIGHT_GRAY = "#2A3B4C";
const SHOPNET_DARK_GRAY = "#B0B3B8";
const SHOPNET_BLACK = "#000000";
const SHOPNET_GREEN = "#25D366";
const SHOPNET_RED = "#FA383E";
const SHOPNET_BORDER = "#0A1B2C";
const SHOPNET_CARD_BG = "#0A1B2C";
const TEXT_WHITE = "#FFFFFF";

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
  ville: string | null;
  phone: string | null;
  email: string | null;
  profilePhoto: string | null;
  coverPhoto: string | null;
  description: string | null;
  memberSince: string;
  products: Product[];
}

const SellerProfile = () => {
  const { sellerId } = useLocalSearchParams();
  const router = useRouter();
  const numericSellerId = Number(sellerId);
  const [seller, setSeller] = useState<Seller | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'publications' | 'about' | 'products'>('publications');
  const [following, setFollowing] = useState(false);

  // Fonction pour formater le numéro de téléphone
  const formatPhoneNumber = (rawPhone: string) => {
    if (!rawPhone) return "";
    
    // Nettoyer le numéro
    let phone = rawPhone.replace(/\s+/g, '').replace(/\D/g, '');
    
    // Si le numéro commence par 0, le remplacer par +243
    if (phone.startsWith('0')) {
      phone = '+243' + phone.substring(1);
    }
    // Si le numéro n'a pas d'indicatif, ajouter +243
    else if (!phone.startsWith('+')) {
      phone = '+243' + phone;
    }
    
    return phone;
  };

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
        setSeller(res.data.seller);
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

  // Fonction pour formater les nombres (1K, 1M, etc.)
  const formatNumber = (num: number): string => {
    if (num >= 1000000) {
      return (num / 1000000).toFixed(1).replace(/\.0$/, '') + 'M';
    }
    if (num >= 1000) {
      return (num / 1000).toFixed(1).replace(/\.0$/, '') + 'K';
    }
    return num.toString();
  };

  const handleFollowToggle = () => {
    setFollowing(!following);
    
    Toast.show({
      type: 'success',
      text1: following ? 'Désabonné' : 'Abonné',
      text2: following ? 'Vous ne suivez plus ce vendeur' : 'Vous suivez maintenant ce vendeur'
    });
  };

  const openWhatsApp = () => {
    const rawPhone = seller?.phone || "";
    if (!rawPhone) {
      Toast.show({
        type: 'info',
        text1: 'Information',
        text2: 'Numéro WhatsApp non disponible'
      });
      return;
    }
    
    const phone = formatPhoneNumber(rawPhone);
    
    // Vérifier si le numéro est valide
    if (!phone || phone.length < 10) {
      Toast.show({
        type: 'error',
        text1: 'Erreur',
        text2: `Impossible de chercher le numéro de téléphone ${rawPhone} car il manque l'indicatif pays ou le numéro est erroné`
      });
      return;
    }
    
    const message = `Bonjour ${seller?.name}, je suis intéressé(e) par vos produits sur SHOPNET. Pouvez-vous me donner plus d'informations ?`;
    const url = `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
    
    Linking.openURL(url).catch(() => {
      const webUrl = `https://web.whatsapp.com/send?phone=${phone}&text=${encodeURIComponent(message)}`;
      Linking.openURL(webUrl).catch(() =>
        Toast.show({
          type: 'error',
          text1: 'Erreur',
          text2: '❌ Impossible d\'ouvrir WhatsApp'
        })
      );
    });
  };

  const handleEmail = () => {
    if (!seller?.email) {
      Toast.show({
        type: 'info',
        text1: 'Information',
        text2: 'Email non disponible'
      });
      return;
    }

    const subject = `Demande d'informations - SHOPNET`;
    const body = `Bonjour ${seller.name},\n\nJe suis intéressé(e) par vos produits sur SHOPNET. Pouvez-vous me donner plus d'informations ?\n\nCordialement,\n[Votre nom]`;
    const mailtoUrl = `mailto:${seller.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    
    Linking.openURL(mailtoUrl);
  };

  const handleProductPress = (productId: number) => {
    router.push({
      pathname: '/(tabs)/Auth/Panier/DetailId',
      params: { id: productId.toString() }
    });
  };

  const handleSearchPress = () => {
    router.push('/(tabs)/Auth/Produits/Recherche');
  };

  const formatDate = (dateStr: string) => {
    try {
      const date = new Date(dateStr);
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
      
      if (diffDays === 0) return "Aujourd'hui";
      if (diffDays === 1) return 'Hier';
      if (diffDays < 7) return `Il y a ${diffDays} jours`;
      if (diffDays < 30) return `Il y a ${Math.floor(diffDays / 7)} semaines`;
      if (diffDays < 365) return `Il y a ${Math.floor(diffDays / 30)} mois`;
      return `Il y a ${Math.floor(diffDays / 365)} ans`;
    } catch {
      return 'Date inconnue';
    }
  };

  // Rendu des publications (produits sous forme de posts)
  const renderPublication = ({ item }: { item: Product }) => (
    <TouchableOpacity 
      style={styles.publicationCard}
      onPress={() => handleProductPress(item.id)}
      activeOpacity={0.8}
    >
      <View style={styles.publicationHeader}>
        <View style={styles.publicationProfile}>
          {seller?.profilePhoto ? (
            <Image source={{ uri: seller.profilePhoto }} style={styles.publicationProfileImage} />
          ) : (
            <View style={styles.publicationProfilePlaceholder}>
              <Ionicons name="person" size={24} color={TEXT_WHITE} />
            </View>
          )}
          <View>
            <Text style={styles.publicationName}>{seller?.name || 'Vendeur'}</Text>
            <Text style={styles.publicationDate}>{formatDate(item.created_at)} · 🌍</Text>
          </View>
        </View>
      </View>
      
      <Text style={styles.publicationTitle} numberOfLines={2}>{item.title}</Text>
      
      {item.description && (
        <Text style={styles.publicationDescription} numberOfLines={3}>
          {item.description}
        </Text>
      )}
      
      {item.images?.[0] && (
        <Image
          source={{ uri: item.images[0] }}
          style={styles.publicationImage}
          resizeMode="cover"
        />
      )}
      
      <View style={styles.publicationPriceContainer}>
        <Text style={styles.publicationPrice}>${item.price?.toFixed(2)}</Text>
        {item.original_price && item.original_price > item.price && (
          <Text style={styles.publicationOriginalPrice}>${item.original_price.toFixed(2)}</Text>
        )}
      </View>
    </TouchableOpacity>
  );

  // Rendu des produits sous forme de grille
  const renderProductGrid = ({ item }: { item: Product }) => (
    <TouchableOpacity
      style={styles.productGridItem}
      onPress={() => handleProductPress(item.id)}
      activeOpacity={0.8}
    >
      <Image
        source={{ uri: item.images?.[0] || 'https://via.placeholder.com/200x200' }}
        style={styles.productGridImage}
        resizeMode="cover"
      />
      <View style={styles.productGridInfo}>
        <Text style={styles.productGridTitle} numberOfLines={2}>
          {item.title}
        </Text>
        <Text style={styles.productGridPrice}>${item.price?.toFixed(2)}</Text>
        {item.original_price && item.original_price > item.price && (
          <Text style={styles.productGridOriginalPrice}>${item.original_price.toFixed(2)}</Text>
        )}
      </View>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar backgroundColor={SHOPNET_BLUE} barStyle="light-content" />
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
        <StatusBar backgroundColor={SHOPNET_BLUE} barStyle="light-content" />
        <View style={styles.errorContainer}>
          <Ionicons name="person-remove-outline" size={80} color={PRO_BLUE} />
          <Text style={styles.errorTitle}>Vendeur non trouvé</Text>
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <Ionicons name="arrow-back" size={20} color={TEXT_WHITE} />
            <Text style={styles.backButtonText}>Retour</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const products = seller.products || [];

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar backgroundColor={SHOPNET_BLUE} barStyle="light-content" />
      
      {/* Header fixe */}
      <View style={styles.fixedHeader}>
        <TouchableOpacity 
          style={styles.backButtonHeader}
          onPress={() => router.back()}
        >
          <Ionicons name="arrow-back" size={24} color={TEXT_WHITE} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{seller.name}</Text>
        <View style={styles.headerActions}>
          <TouchableOpacity 
            style={styles.headerActionButton}
            onPress={handleSearchPress}
          >
            <Ionicons name="search" size={22} color={TEXT_WHITE} />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView 
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        stickyHeaderIndices={[1]}
      >
        {/* Cover Photo */}
        <View style={styles.coverContainer}>
          {seller.coverPhoto ? (
            <Image source={{ uri: seller.coverPhoto }} style={styles.coverPhoto} />
          ) : (
            <View style={styles.coverPlaceholder}>
              <Ionicons name="storefront-outline" size={60} color={PRO_BLUE} />
            </View>
          )}
        </View>

        {/* Profile Info Bar */}
        <View style={styles.profileInfoBar}>
          <View style={styles.profileImageContainer}>
            {seller.profilePhoto ? (
              <Image source={{ uri: seller.profilePhoto }} style={styles.profileImage} />
            ) : (
              <View style={styles.profileImagePlaceholder}>
                <Ionicons name="person" size={40} color={TEXT_WHITE} />
              </View>
            )}
          </View>
          
          <View style={styles.profileActions}>
            <TouchableOpacity
              style={[styles.actionButtonLarge, following ? styles.followingButton : styles.followButton]}
              onPress={handleFollowToggle}
            >
              <Ionicons 
                name={following ? 'checkmark' : 'person-add'} 
                size={20} 
                color={following ? PRO_BLUE : TEXT_WHITE} 
              />
              <Text style={[styles.actionButtonText, following && styles.followingButtonText]}>
                {following ? 'Suivi' : 'Suivre'}
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[styles.actionButtonLarge, styles.whatsappButton]}
              onPress={openWhatsApp}
            >
              <FontAwesome name="whatsapp" size={20} color={TEXT_WHITE} />
              <Text style={[styles.actionButtonText, styles.whatsappButtonText]}>WhatsApp</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.emailButton}
              onPress={handleEmail}
            >
              <MaterialIcons name="email" size={24} color={TEXT_WHITE} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Profile Details */}
        <View style={styles.profileDetails}>
          <Text style={styles.profileName}>{seller.name}</Text>
          {seller.companyName && (
            <Text style={styles.companyName}>{seller.companyName}</Text>
          )}
          <Text style={styles.profileCategory}>Boutique en ligne · Vendeur SHOPNET</Text>
          
          <View style={styles.profileStats}>
            <View style={styles.statContainer}>
              <Text style={styles.statNumber}>{products.length}</Text>
              <Text style={styles.statLabel}>produits</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statContainer}>
              <Ionicons name="star" size={16} color="#FFB800" />
              <Text style={styles.statNumber}>4.8</Text>
              <Text style={styles.statLabel}>(124)</Text>
            </View>
          </View>
          
          <View style={styles.contactInfo}>
            <TouchableOpacity style={styles.contactItem} onPress={openWhatsApp}>
              <FontAwesome name="whatsapp" size={16} color={SHOPNET_GREEN} />
              <Text style={styles.contactText}>{seller.phone || 'Non disponible'}</Text>
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.contactItem} onPress={handleEmail}>
              <MaterialIcons name="email" size={16} color={PRO_BLUE} />
              <Text style={styles.contactText}>{seller.email || 'Non disponible'}</Text>
            </TouchableOpacity>
            
            {(seller.address || seller.ville) && (
              <View style={styles.contactItem}>
                <Ionicons name="location-outline" size={16} color={PRO_BLUE} />
                <Text style={styles.contactText}>
                  {seller.address && seller.ville 
                    ? `${seller.address}, ${seller.ville}`
                    : seller.address || seller.ville}
                </Text>
              </View>
            )}
          </View>
        </View>

        {/* Tabs Navigation */}
        <View style={styles.tabsContainer}>
          <TouchableOpacity 
            style={[styles.tab, activeTab === 'publications' && styles.activeTab]}
            onPress={() => setActiveTab('publications')}
          >
            <Ionicons 
              name="newspaper-outline" 
              size={20} 
              color={activeTab === 'publications' ? PRO_BLUE : TEXT_WHITE} 
            />
            <Text style={[styles.tabText, activeTab === 'publications' && styles.activeTabText]}>
              Publications
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.tab, activeTab === 'about' && styles.activeTab]}
            onPress={() => setActiveTab('about')}
          >
            <Ionicons 
              name="information-circle-outline" 
              size={20} 
              color={activeTab === 'about' ? PRO_BLUE : TEXT_WHITE} 
            />
            <Text style={[styles.tabText, activeTab === 'about' && styles.activeTabText]}>
              À propos
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.tab, activeTab === 'products' && styles.activeTab]}
            onPress={() => setActiveTab('products')}
          >
            <Ionicons 
              name="cart-outline" 
              size={20} 
              color={activeTab === 'products' ? PRO_BLUE : TEXT_WHITE} 
            />
            <Text style={[styles.tabText, activeTab === 'products' && styles.activeTabText]}>
              Produits
            </Text>
          </TouchableOpacity>
        </View>

        {/* Tab Content */}
        {activeTab === 'publications' && (
          <View style={styles.tabContent}>
            {products.length === 0 ? (
              <View style={styles.emptyContent}>
                <Ionicons name="newspaper-outline" size={60} color={SHOPNET_DARK_GRAY} />
                <Text style={styles.emptyText}>Aucune publication</Text>
                <Text style={styles.emptySubtext}>Ce vendeur n'a pas encore publié de contenu</Text>
              </View>
            ) : (
              <FlatList
                data={products}
                keyExtractor={(item) => item.id.toString()}
                renderItem={renderPublication}
                scrollEnabled={false}
                ItemSeparatorComponent={() => <View style={styles.publicationSeparator} />}
              />
            )}
          </View>
        )}

        {activeTab === 'about' && (
          <View style={styles.tabContent}>
            <View style={styles.aboutSection}>
              <Text style={styles.sectionTitle}>Description</Text>
              {seller.description ? (
                <Text style={styles.aboutText}>{seller.description}</Text>
              ) : (
                <Text style={styles.noInfoText}>Aucune description fournie</Text>
              )}
            </View>
            
            <View style={styles.aboutSection}>
              <Text style={styles.sectionTitle}>Informations</Text>
              <View style={styles.infoList}>
                <View style={styles.infoItem}>
                  <Ionicons name="calendar-outline" size={20} color={PRO_BLUE} />
                  <View>
                    <Text style={styles.infoLabel}>Membre depuis</Text>
                    <Text style={styles.infoValue}>
                      {new Date(seller.memberSince).toLocaleDateString('fr-FR', {
                        month: 'long',
                        year: 'numeric'
                      })}
                    </Text>
                  </View>
                </View>
                
                <View style={styles.infoItem}>
                  <Ionicons name="call-outline" size={20} color={PRO_BLUE} />
                  <View>
                    <Text style={styles.infoLabel}>Téléphone</Text>
                    <Text style={styles.infoValue}>{seller.phone || 'Non disponible'}</Text>
                  </View>
                </View>
                
                <View style={styles.infoItem}>
                  <MaterialIcons name="email" size={20} color={PRO_BLUE} />
                  <View>
                    <Text style={styles.infoLabel}>Email</Text>
                    <Text style={styles.infoValue}>{seller.email || 'Non disponible'}</Text>
                  </View>
                </View>
                
                <View style={styles.infoItem}>
                  <Ionicons name="location-outline" size={20} color={PRO_BLUE} />
                  <View>
                    <Text style={styles.infoLabel}>Adresse</Text>
                    <Text style={styles.infoValue}>
                      {seller.address && seller.ville 
                        ? `${seller.address}, ${seller.ville}`
                        : seller.address || seller.ville || 'Non disponible'}
                    </Text>
                  </View>
                </View>
              </View>
            </View>
          </View>
        )}

        {activeTab === 'products' && (
          <View style={styles.tabContent}>
            {products.length === 0 ? (
              <View style={styles.emptyContent}>
                <Ionicons name="cart-outline" size={60} color={SHOPNET_DARK_GRAY} />
                <Text style={styles.emptyText}>Aucun produit</Text>
                <Text style={styles.emptySubtext}>Ce vendeur n'a pas encore ajouté de produits</Text>
              </View>
            ) : (
              <FlatList
                data={products}
                keyExtractor={(item) => item.id.toString()}
                renderItem={renderProductGrid}
                numColumns={2}
                scrollEnabled={false}
                columnWrapperStyle={styles.productGridRow}
                contentContainerStyle={styles.productGridContainer}
              />
            )}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: SHOPNET_BLUE,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: SHOPNET_BLUE,
  },
  loadingText: {
    color: TEXT_WHITE,
    fontSize: 16,
    marginTop: 12,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: SHOPNET_BLUE,
  },
  errorTitle: {
    color: TEXT_WHITE,
    fontSize: 22,
    fontWeight: '600',
    marginTop: 16,
    marginBottom: 8,
  },
  fixedHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: SHOPNET_BLUE,
    borderBottomWidth: 1,
    borderBottomColor: SHOPNET_BORDER,
  },
  backButtonHeader: {
    padding: 4,
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
  },
  scrollView: {
    flex: 1,
    backgroundColor: SHOPNET_BLUE,
  },
  coverContainer: {
    height: 200,
    backgroundColor: SHOPNET_GRAY,
  },
  coverPhoto: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  coverPlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: SHOPNET_GRAY,
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileInfoBar: {
    backgroundColor: SHOPNET_GRAY,
    paddingHorizontal: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: SHOPNET_BORDER,
  },
  profileImageContainer: {
    marginTop: -40,
  },
  profileImage: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 4,
    borderColor: SHOPNET_GRAY,
    backgroundColor: SHOPNET_GRAY,
  },
  profileImagePlaceholder: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: PRO_BLUE,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 4,
    borderColor: SHOPNET_GRAY,
  },
  profileActions: {
    flexDirection: 'row',
    marginTop: 12,
    gap: 8,
  },
  actionButtonLarge: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 6,
    gap: 6,
  },
  followButton: {
    backgroundColor: PRO_BLUE,
  },
  followingButton: {
    backgroundColor: SHOPNET_LIGHT_GRAY,
    borderWidth: 1,
    borderColor: PRO_BLUE,
  },
  whatsappButton: {
    backgroundColor: SHOPNET_GREEN,
  },
  actionButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: TEXT_WHITE,
  },
  followingButtonText: {
    color: PRO_BLUE,
  },
  whatsappButtonText: {
    color: TEXT_WHITE,
  },
  emailButton: {
    width: 40,
    height: 40,
    borderRadius: 6,
    backgroundColor: PRO_BLUE,
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileDetails: {
    backgroundColor: SHOPNET_GRAY,
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: SHOPNET_BORDER,
  },
  profileName: {
    fontSize: 24,
    fontWeight: '700',
    color: TEXT_WHITE,
    marginBottom: 4,
  },
  companyName: {
    fontSize: 16,
    color: PRO_BLUE,
    marginBottom: 4,
  },
  profileCategory: {
    fontSize: 15,
    color: SHOPNET_DARK_GRAY,
    marginBottom: 16,
  },
  profileStats: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    justifyContent: 'center',
  },
  statContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statNumber: {
    fontSize: 17,
    fontWeight: '700',
    color: TEXT_WHITE,
  },
  statLabel: {
    fontSize: 15,
    color: SHOPNET_DARK_GRAY,
  },
  statDivider: {
    width: 1,
    height: 20,
    backgroundColor: SHOPNET_BORDER,
    marginHorizontal: 16,
  },
  contactInfo: {
    gap: 8,
  },
  contactItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  contactText: {
    fontSize: 15,
    color: TEXT_WHITE,
  },
  tabsContainer: {
    flexDirection: 'row',
    backgroundColor: SHOPNET_GRAY,
    borderBottomWidth: 1,
    borderBottomColor: SHOPNET_BORDER,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    gap: 8,
    borderBottomWidth: 3,
    borderBottomColor: 'transparent',
  },
  activeTab: {
    borderBottomColor: PRO_BLUE,
  },
  tabText: {
    fontSize: 15,
    fontWeight: '600',
    color: TEXT_WHITE,
  },
  activeTabText: {
    color: PRO_BLUE,
  },
  tabContent: {
    backgroundColor: SHOPNET_BLUE,
    minHeight: 400,
  },
  publicationCard: {
    backgroundColor: SHOPNET_CARD_BG,
    marginBottom: 1,
    padding: 0,
    width: '100%',
  },
  publicationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: SHOPNET_BORDER,
  },
  publicationProfile: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  publicationProfileImage: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  publicationProfilePlaceholder: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: PRO_BLUE,
    justifyContent: 'center',
    alignItems: 'center',
  },
  publicationName: {
    fontSize: 15,
    fontWeight: '600',
    color: TEXT_WHITE,
  },
  publicationDate: {
    fontSize: 13,
    color: SHOPNET_DARK_GRAY,
    marginTop: 2,
  },
  publicationTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: TEXT_WHITE,
    marginBottom: 8,
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  publicationDescription: {
    fontSize: 14,
    color: SHOPNET_DARK_GRAY,
    lineHeight: 20,
    marginBottom: 12,
    paddingHorizontal: 16,
  },
  publicationImage: {
    width: '100%',
    height: 300,
    marginBottom: 12,
  },
  publicationPriceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  publicationPrice: {
    fontSize: 18,
    fontWeight: '700',
    color: SHOPNET_RED,
  },
  publicationOriginalPrice: {
    fontSize: 14,
    color: SHOPNET_DARK_GRAY,
    textDecorationLine: 'line-through',
  },
  publicationSeparator: {
    height: 0,
  },
  aboutSection: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: SHOPNET_BORDER,
    backgroundColor: SHOPNET_GRAY,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: TEXT_WHITE,
    marginBottom: 12,
  },
  aboutText: {
    fontSize: 15,
    color: TEXT_WHITE,
    lineHeight: 22,
  },
  noInfoText: {
    fontSize: 15,
    color: SHOPNET_DARK_GRAY,
    fontStyle: 'italic',
  },
  infoList: {
    gap: 16,
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  infoLabel: {
    fontSize: 13,
    color: SHOPNET_DARK_GRAY,
    marginBottom: 2,
  },
  infoValue: {
    fontSize: 15,
    color: TEXT_WHITE,
  },
  productGridContainer: {
    padding: 8,
  },
  productGridRow: {
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  productGridItem: {
    width: (width - 24) / 2,
    backgroundColor: SHOPNET_CARD_BG,
    borderRadius: 8,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: SHOPNET_BORDER,
  },
  productGridImage: {
    width: '100%',
    height: 150,
  },
  productGridInfo: {
    padding: 12,
  },
  productGridTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: TEXT_WHITE,
    marginBottom: 6,
    lineHeight: 18,
  },
  productGridPrice: {
    fontSize: 16,
    fontWeight: '700',
    color: SHOPNET_RED,
  },
  productGridOriginalPrice: {
    fontSize: 13,
    color: SHOPNET_DARK_GRAY,
    textDecorationLine: 'line-through',
  },
  emptyContent: {
    alignItems: 'center',
    paddingVertical: 60,
    paddingHorizontal: 20,
  },
  emptyText: {
    fontSize: 17,
    fontWeight: '600',
    color: TEXT_WHITE,
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 15,
    color: SHOPNET_DARK_GRAY,
    textAlign: 'center',
    lineHeight: 20,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: PRO_BLUE,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 6,
    gap: 8,
    marginTop: 20,
  },
  backButtonText: {
    color: TEXT_WHITE,
    fontSize: 16,
    fontWeight: '600',
  },
});

export default SellerProfile;

