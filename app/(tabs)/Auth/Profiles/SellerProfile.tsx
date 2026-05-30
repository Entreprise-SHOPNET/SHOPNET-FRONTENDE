

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
import { useTheme } from "../../../../app/theme/ThemeContext";

const { width } = Dimensions.get('window');

// Hook pour les couleurs dynamiques
const useDynamicColors = () => {
  const { isDark } = useTheme();

  return {
    background: isDark ? '#0D0D0D' : '#00182A',
    surface: isDark ? '#1A1A1A' : '#1A2B3C',
    cardBg: isDark ? '#1A1A1A' : '#0A1B2C',
    border: isDark ? '#2E2E2E' : '#0A1B2C',
    text: isDark ? '#F5F5F5' : '#FFFFFF',
    textSecondary: isDark ? '#B0B0B0' : '#B0B3B8',
    primary: '#42A5F5',
    green: '#25D366',
    red: '#FA383E',
    white: '#FFFFFF',
    black: '#000000',
    headerBg: isDark ? '#1A1A1A' : '#00182A',
    headerBorder: isDark ? '#2E2E2E' : '#0A1B2C',
    tabBg: isDark ? '#1A1A1A' : '#1A2B3C',
    tabActiveBorder: '#42A5F5',
    tabInactiveText: isDark ? '#B0B0B0' : '#FFFFFF',
    statDivider: isDark ? '#2E2E2E' : '#0A1B2C',
    contactIconBg: isDark ? 'rgba(66, 165, 245, 0.15)' : 'rgba(66, 165, 245, 0.1)',
    disabledBg: isDark ? '#2A2A2A' : '#2A3B4C',
    disabledText: isDark ? '#666666' : '#B0B3B8',
    placeholderBg: isDark ? '#2A2A2A' : '#1A2B3C',
    coverBg: isDark ? '#1A1A1A' : '#1A2B3C',
    profileBorder: isDark ? '#1A1A1A' : '#1A2B3C',
    loadingBg: isDark ? '#0D0D0D' : '#00182A',
    loadingText: isDark ? '#B0B0B0' : '#FFFFFF',
    errorBg: isDark ? '#0D0D0D' : '#00182A',
    errorText: isDark ? '#F5F5F5' : '#FFFFFF',
    emptyText: isDark ? '#F5F5F5' : '#FFFFFF',
    emptySubtext: isDark ? '#B0B0B0' : '#B0B3B8',
    statusBar: isDark ? '#0D0D0D' : '#00182A',
    barStyle: 'light-content' as const,
  };
};

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
  followersCount?: number;
}

const SellerProfile = () => {
  const { sellerId } = useLocalSearchParams();
  const router = useRouter();
  const numericSellerId = Number(sellerId);
  const COLORS = useDynamicColors();
  const { isDark } = useTheme();
  
  const [seller, setSeller] = useState<Seller | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'publications' | 'about' | 'products'>('publications');
  const [following, setFollowing] = useState(false);
  const [followersCount, setFollowersCount] = useState(0);

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
        const sellerData = res.data.seller;
        setSeller(sellerData);
        setFollowersCount(125);
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
    const newFollowing = !following;
    setFollowing(newFollowing);
    if (newFollowing) {
      setFollowersCount(prev => prev + 1);
    } else {
      setFollowersCount(prev => Math.max(0, prev - 1));
    }
    Toast.show({
      type: 'success',
      text1: newFollowing ? 'Abonné' : 'Désabonné',
      text2: newFollowing ? 'Vous suivez maintenant ce vendeur' : 'Vous ne suivez plus ce vendeur'
    });
  };

  const formatPhoneForDisplay = (rawPhone: string | null): string => {
    if (!rawPhone) return "";
    let phone = rawPhone.replace(/\s+/g, '').replace(/\D/g, '');
    if (phone.startsWith('243')) {
      phone = phone.substring(3);
    } else if (phone.startsWith('0')) {
      phone = phone.substring(1);
    }
    if (phone.length >= 9) {
      const part1 = phone.substring(0, 3);
      const part2 = phone.substring(3, 6);
      const part3 = phone.substring(6, 9);
      return `+243 ${part1} ${part2} ${part3}`.trim();
    }
    return `+243 ${phone}`;
  };

  const formatPhoneForWhatsApp = (rawPhone: string | null): string => {
    if (!rawPhone) return "";
    let phone = rawPhone.replace(/\s+/g, '').replace(/\D/g, '');
    if (phone.startsWith('0')) {
      phone = '+243' + phone.substring(1);
    } else if (!phone.startsWith('+')) {
      phone = '+243' + phone;
    }
    return phone;
  };

  const openWhatsApp = () => {
    const rawPhone = seller?.phone || "";
    if (!rawPhone) {
      Toast.show({ type: 'info', text1: 'Information', text2: 'Numéro WhatsApp non disponible' });
      return;
    }
    
    const phone = formatPhoneForWhatsApp(rawPhone);
    if (!phone || phone.length < 13) {
      Toast.show({ type: 'error', text1: 'Erreur', text2: 'Numéro de téléphone invalide' });
      return;
    }
    
    // Message professionnel prér rempli
    const message = encodeURIComponent(
`Bonjour ${seller?.name || ''} 👋,

Je me permets de vous contacter via *SHOPNET*, la plateforme de confiance pour les achats et ventes en ligne.

J'ai parcouru votre profil et vos produits m'ont particulièrement intéressé(e).

🎯 *Ce qui a retenu mon attention :*
• La qualité de vos publications
• Votre réputation sur la plateforme
• La diversité de votre catalogue

Je souhaiterais en savoir davantage sur vos offres actuelles et vos disponibilités.

📌 *Mes questions :*
1. Quels sont vos produits les plus populaires en ce moment ?
2. Proposez-vous des facilités de paiement ?
3. Quelles sont vos conditions de livraison ?

Je suis disponible pour échanger et éventuellement convenir d'un rendez-vous si nécessaire.

Dans l'attente de votre retour, je vous remercie par avance.

Cordialement,
[Client SHOPNET] 🛍️`
    );
    
    const url = `https://wa.me/${phone.replace('+', '')}?text=${message}`;
    Linking.openURL(url).catch(() => {
      const webUrl = `https://web.whatsapp.com/send?phone=${phone.replace('+', '')}&text=${message}`;
      Linking.openURL(webUrl).catch(() =>
        Toast.show({ type: 'error', text1: 'Erreur', text2: '❌ Impossible d\'ouvrir WhatsApp' })
      );
    });
  };

  const makePhoneCall = () => {
    const rawPhone = seller?.phone || "";
    if (!rawPhone) {
      Toast.show({ type: 'info', text1: 'Information', text2: 'Numéro de téléphone non disponible' });
      return;
    }
    const phone = formatPhoneForWhatsApp(rawPhone);
    const url = `tel:${phone}`;
    Linking.openURL(url).catch(() => {
      Toast.show({ type: 'error', text1: 'Erreur', text2: '❌ Impossible de passer un appel' });
    });
  };

  const handleEmail = () => {
    const email = seller?.email;
    if (!email) {
      Toast.show({ type: 'info', text1: 'Information', text2: 'Email non disponible' });
      return;
    }

    const subject = `Demande d'informations - Produits SHOPNET`;
    const body = `Bonjour ${seller?.name || ''},\n\nJe me permets de vous contacter via SHOPNET.\n\nJ'ai consulté votre profil et vos produits m'intéressent.\n\nPourriez-vous me donner plus d'informations sur :\n- Vos produits disponibles\n- Vos conditions de vente\n- Les modalités de livraison\n\nJe reste à votre disposition pour échanger.\n\nCordialement,\n[Votre nom]`;
    const mailtoUrl = `mailto:${email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    
    Linking.openURL(mailtoUrl).catch(() => {
      Toast.show({ type: 'error', text1: 'Erreur', text2: '❌ Impossible d\'ouvrir l\'application email' });
    });
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
    } catch { return 'Date inconnue'; }
  };

  const renderPublication = ({ item }: { item: Product }) => (
    <TouchableOpacity 
      style={[styles.publicationCard, { backgroundColor: COLORS.cardBg, borderBottomColor: COLORS.border }]}
      onPress={() => handleProductPress(item.id)}
      activeOpacity={0.8}
    >
      <View style={[styles.publicationHeader, { borderBottomColor: COLORS.border }]}>
        <View style={styles.publicationProfile}>
          {seller?.profilePhoto ? (
            <Image source={{ uri: seller.profilePhoto }} style={styles.publicationProfileImage} />
          ) : (
            <View style={[styles.publicationProfilePlaceholder, { backgroundColor: COLORS.primary }]}>
              <Ionicons name="person" size={24} color={COLORS.white} />
            </View>
          )}
          <View>
            <Text style={[styles.publicationName, { color: COLORS.text }]}>{seller?.name || 'Vendeur'}</Text>
            <Text style={[styles.publicationDate, { color: COLORS.textSecondary }]}>{formatDate(item.created_at)} · 🌍</Text>
          </View>
        </View>
      </View>
      
      <Text style={[styles.publicationTitle, { color: COLORS.text }]} numberOfLines={2}>{item.title}</Text>
      
      {item.description && (
        <Text style={[styles.publicationDescription, { color: COLORS.textSecondary }]} numberOfLines={3}>
          {item.description}
        </Text>
      )}
      
      {item.images?.[0] && (
        <Image source={{ uri: item.images[0] }} style={styles.publicationImage} resizeMode="cover" />
      )}
      
      <View style={styles.publicationPriceContainer}>
        <Text style={[styles.publicationPrice, { color: COLORS.red }]}>${item.price?.toFixed(2)}</Text>
        {item.original_price && item.original_price > item.price && (
          <Text style={[styles.publicationOriginalPrice, { color: COLORS.textSecondary }]}>
            ${item.original_price.toFixed(2)}
          </Text>
        )}
      </View>
    </TouchableOpacity>
  );

  const renderProductGrid = ({ item }: { item: Product }) => (
    <TouchableOpacity
      style={[styles.productGridItem, { backgroundColor: COLORS.cardBg, borderColor: COLORS.border }]}
      onPress={() => handleProductPress(item.id)}
      activeOpacity={0.8}
    >
      <Image
        source={{ uri: item.images?.[0] || 'https://via.placeholder.com/200x200' }}
        style={styles.productGridImage}
        resizeMode="cover"
      />
      <View style={styles.productGridInfo}>
        <Text style={[styles.productGridTitle, { color: COLORS.text }]} numberOfLines={2}>
          {item.title}
        </Text>
        <Text style={[styles.productGridPrice, { color: COLORS.red }]}>${item.price?.toFixed(2)}</Text>
        {item.original_price && item.original_price > item.price && (
          <Text style={[styles.productGridOriginalPrice, { color: COLORS.textSecondary }]}>
            ${item.original_price.toFixed(2)}
          </Text>
        )}
      </View>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: COLORS.background }]}>
        <StatusBar backgroundColor={COLORS.statusBar} barStyle={COLORS.barStyle} />
        <View style={[styles.loadingContainer, { backgroundColor: COLORS.loadingBg }]}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={[styles.loadingText, { color: COLORS.loadingText }]}>Chargement du profil...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!seller) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: COLORS.background }]}>
        <StatusBar backgroundColor={COLORS.statusBar} barStyle={COLORS.barStyle} />
        <View style={[styles.errorContainer, { backgroundColor: COLORS.errorBg }]}>
          <Ionicons name="person-remove-outline" size={80} color={COLORS.primary} />
          <Text style={[styles.errorTitle, { color: COLORS.errorText }]}>Vendeur non trouvé</Text>
          <TouchableOpacity 
            style={[styles.backButton, { backgroundColor: COLORS.primary }]}
            onPress={() => router.back()}
          >
            <Ionicons name="arrow-back" size={20} color={COLORS.white} />
            <Text style={styles.backButtonText}>Retour</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const products = seller.products || [];
  const displayPhone = seller.phone ? formatPhoneForDisplay(seller.phone) : "";
  const displayEmail = seller.email || "";

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: COLORS.background }]}>
      <StatusBar backgroundColor={COLORS.statusBar} barStyle={COLORS.barStyle} />
      
      {/* Header fixe */}
      <View style={[styles.fixedHeader, { backgroundColor: COLORS.headerBg, borderBottomColor: COLORS.headerBorder }]}>
        <TouchableOpacity 
          style={styles.backButtonHeader}
          onPress={() => router.back()}
        >
          <Ionicons name="arrow-back" size={24} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: COLORS.text }]}>{seller.name}</Text>
        <View style={styles.headerActions}>
          <TouchableOpacity 
            style={styles.headerActionButton}
            onPress={handleSearchPress}
          >
            <Ionicons name="search" size={22} color={COLORS.text} />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView 
        style={[styles.scrollView, { backgroundColor: COLORS.background }]}
        showsVerticalScrollIndicator={false}
        stickyHeaderIndices={[1]}
      >
        {/* Cover Photo */}
        <View style={[styles.coverContainer, { backgroundColor: COLORS.coverBg }]}>
          {seller.coverPhoto ? (
            <Image source={{ uri: seller.coverPhoto }} style={styles.coverPhoto} />
          ) : (
            <View style={[styles.coverPlaceholder, { backgroundColor: COLORS.placeholderBg }]}>
              <Ionicons name="storefront-outline" size={60} color={COLORS.primary} />
            </View>
          )}
        </View>

        {/* Profile Info Bar */}
        <View style={[styles.profileInfoBar, { backgroundColor: COLORS.surface, borderBottomColor: COLORS.border }]}>
          <View style={styles.profileImageContainer}>
            {seller.profilePhoto ? (
              <Image source={{ uri: seller.profilePhoto }} style={[styles.profileImage, { borderColor: COLORS.profileBorder }]} />
            ) : (
              <View style={[styles.profileImagePlaceholder, { backgroundColor: COLORS.primary, borderColor: COLORS.profileBorder }]}>
                <Ionicons name="person" size={40} color={COLORS.white} />
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
                color={following ? COLORS.primary : COLORS.white} 
              />
              <Text style={[styles.actionButtonText, following && { color: COLORS.primary }]}>
                {following ? 'Suivi' : 'Suivre'}
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[styles.actionButtonLarge, styles.whatsappButton, !seller.phone && { backgroundColor: COLORS.disabledBg, opacity: 0.5 }]}
              onPress={openWhatsApp}
              disabled={!seller.phone}
            >
              <FontAwesome name="whatsapp" size={20} color={seller.phone ? COLORS.white : COLORS.disabledText} />
              <Text style={[styles.actionButtonText, !seller.phone && { color: COLORS.disabledText }]}>
                WhatsApp
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.emailButton, !seller.email && { backgroundColor: COLORS.disabledBg, opacity: 0.5 }]}
              onPress={handleEmail}
              disabled={!seller.email}
            >
              <MaterialIcons name="email" size={24} color={seller.email ? COLORS.white : COLORS.disabledText} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Profile Details */}
        <View style={[styles.profileDetails, { backgroundColor: COLORS.surface, borderBottomColor: COLORS.border }]}>
          <Text style={[styles.profileName, { color: COLORS.text }]}>{seller.name}</Text>
          {seller.companyName && (
            <Text style={[styles.companyName, { color: COLORS.primary }]}>{seller.companyName}</Text>
          )}
          <Text style={[styles.profileCategory, { color: COLORS.textSecondary }]}>Boutique en ligne · Vendeur SHOPNET</Text>
          
          <View style={styles.profileStats}>
            <View style={styles.statContainer}>
              <Text style={[styles.statNumber, { color: COLORS.text }]}>{products.length}</Text>
              <Text style={[styles.statLabel, { color: COLORS.textSecondary }]}>produits</Text>
            </View>
            <View style={[styles.statDivider, { backgroundColor: COLORS.statDivider }]} />
            <View style={styles.statContainer}>
              <Text style={[styles.statNumber, { color: COLORS.text }]}>{formatNumber(followersCount)}</Text>
              <Text style={[styles.statLabel, { color: COLORS.textSecondary }]}>abonnés</Text>
            </View>
            <View style={[styles.statDivider, { backgroundColor: COLORS.statDivider }]} />
            <View style={styles.statContainer}>
              <Ionicons name="star" size={16} color="#FFB800" />
              <Text style={[styles.statNumber, { color: COLORS.text }]}>4.8</Text>
              <Text style={[styles.statLabel, { color: COLORS.textSecondary }]}>(124)</Text>
            </View>
          </View>
          
          {(seller.phone || seller.email) && (
            <View style={styles.contactInfo}>
              {seller.phone && (
                <View style={styles.contactRow}>
                  <View style={[styles.contactIconContainer, { backgroundColor: COLORS.contactIconBg }]}>
                    <Ionicons name="call-outline" size={20} color={COLORS.primary} />
                  </View>
                  <View style={styles.contactDetails}>
                    <Text style={[styles.contactLabel, { color: COLORS.textSecondary }]}>Téléphone</Text>
                    <TouchableOpacity onPress={makePhoneCall}>
                      <Text style={[styles.contactValue, { color: COLORS.text }]}>{displayPhone}</Text>
                    </TouchableOpacity>
                    <View style={styles.contactButtons}>
                      <TouchableOpacity 
                        style={[styles.contactActionButton, { backgroundColor: COLORS.primary }]}
                        onPress={makePhoneCall}
                      >
                        <Ionicons name="call" size={14} color={COLORS.white} />
                        <Text style={styles.contactActionText}>Appeler</Text>
                      </TouchableOpacity>
                      <TouchableOpacity 
                        style={[styles.contactActionButton, { backgroundColor: COLORS.green }]}
                        onPress={openWhatsApp}
                      >
                        <FontAwesome name="whatsapp" size={14} color={COLORS.white} />
                        <Text style={styles.contactActionText}>WhatsApp</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>
              )}
              
              {seller.email && (
                <View style={styles.contactRow}>
                  <View style={[styles.contactIconContainer, { backgroundColor: COLORS.contactIconBg }]}>
                    <MaterialIcons name="email" size={20} color={COLORS.primary} />
                  </View>
                  <View style={styles.contactDetails}>
                    <Text style={[styles.contactLabel, { color: COLORS.textSecondary }]}>Email</Text>
                    <TouchableOpacity onPress={handleEmail}>
                      <Text style={[styles.contactValue, { color: COLORS.text }]}>{displayEmail}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity 
                      style={[styles.contactActionButton, { backgroundColor: COLORS.primary }]}
                      onPress={handleEmail}
                    >
                      <MaterialIcons name="email" size={14} color={COLORS.white} />
                      <Text style={styles.contactActionText}>Envoyer Email</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}
            </View>
          )}
        </View>

        {/* Tabs Navigation */}
        <View style={[styles.tabsContainer, { backgroundColor: COLORS.tabBg, borderBottomColor: COLORS.border }]}>
          <TouchableOpacity 
            style={[styles.tab, activeTab === 'publications' && { borderBottomColor: COLORS.tabActiveBorder }]}
            onPress={() => setActiveTab('publications')}
          >
            <Ionicons 
              name="newspaper-outline" 
              size={20} 
              color={activeTab === 'publications' ? COLORS.primary : COLORS.tabInactiveText} 
            />
            <Text style={[styles.tabText, { color: activeTab === 'publications' ? COLORS.primary : COLORS.tabInactiveText }]}>
              Publications
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.tab, activeTab === 'about' && { borderBottomColor: COLORS.tabActiveBorder }]}
            onPress={() => setActiveTab('about')}
          >
            <Ionicons 
              name="information-circle-outline" 
              size={20} 
              color={activeTab === 'about' ? COLORS.primary : COLORS.tabInactiveText} 
            />
            <Text style={[styles.tabText, { color: activeTab === 'about' ? COLORS.primary : COLORS.tabInactiveText }]}>
              À propos
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.tab, activeTab === 'products' && { borderBottomColor: COLORS.tabActiveBorder }]}
            onPress={() => setActiveTab('products')}
          >
            <Ionicons 
              name="cart-outline" 
              size={20} 
              color={activeTab === 'products' ? COLORS.primary : COLORS.tabInactiveText} 
            />
            <Text style={[styles.tabText, { color: activeTab === 'products' ? COLORS.primary : COLORS.tabInactiveText }]}>
              Produits
            </Text>
          </TouchableOpacity>
        </View>

        {/* Tab Content */}
        {activeTab === 'publications' && (
          <View style={[styles.tabContent, { backgroundColor: COLORS.background }]}>
            {products.length === 0 ? (
              <View style={styles.emptyContent}>
                <Ionicons name="newspaper-outline" size={60} color={COLORS.textSecondary} />
                <Text style={[styles.emptyText, { color: COLORS.emptyText }]}>Aucune publication</Text>
                <Text style={[styles.emptySubtext, { color: COLORS.emptySubtext }]}>Ce vendeur n'a pas encore publié de contenu</Text>
              </View>
            ) : (
              <FlatList
                data={products}
                keyExtractor={(item) => item.id.toString()}
                renderItem={renderPublication}
                scrollEnabled={false}
              />
            )}
          </View>
        )}

        {activeTab === 'about' && (
          <View style={[styles.tabContent, { backgroundColor: COLORS.background }]}>
            <View style={[styles.aboutSection, { backgroundColor: COLORS.surface, borderBottomColor: COLORS.border }]}>
              <Text style={[styles.sectionTitle, { color: COLORS.text }]}>Description</Text>
              {seller.description ? (
                <Text style={[styles.aboutText, { color: COLORS.text }]}>{seller.description}</Text>
              ) : (
                <Text style={[styles.noInfoText, { color: COLORS.textSecondary }]}>Aucune description fournie</Text>
              )}
            </View>
            
            <View style={[styles.aboutSection, { backgroundColor: COLORS.surface, borderBottomColor: COLORS.border }]}>
              <Text style={[styles.sectionTitle, { color: COLORS.text }]}>Informations de contact</Text>
              <View style={styles.infoList}>
                {seller.phone && (
                  <View style={styles.infoItem}>
                    <Ionicons name="call-outline" size={20} color={COLORS.primary} />
                    <View>
                      <Text style={[styles.infoLabel, { color: COLORS.textSecondary }]}>Téléphone</Text>
                      <TouchableOpacity onPress={makePhoneCall}>
                        <Text style={[styles.infoValue, { color: COLORS.text }]}>{displayPhone}</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                )}
                
                {seller.email && (
                  <View style={styles.infoItem}>
                    <MaterialIcons name="email" size={20} color={COLORS.primary} />
                    <View>
                      <Text style={[styles.infoLabel, { color: COLORS.textSecondary }]}>Email</Text>
                      <TouchableOpacity onPress={handleEmail}>
                        <Text style={[styles.infoValue, { color: COLORS.text }]}>{displayEmail}</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                )}
                
                {(seller.address || seller.ville) && (
                  <View style={styles.infoItem}>
                    <Ionicons name="location-outline" size={20} color={COLORS.primary} />
                    <View>
                      <Text style={[styles.infoLabel, { color: COLORS.textSecondary }]}>Adresse</Text>
                      <Text style={[styles.infoValue, { color: COLORS.text }]}>
                        {seller.address && seller.ville 
                          ? `${seller.address}, ${seller.ville}`
                          : seller.address || seller.ville}
                      </Text>
                    </View>
                  </View>
                )}
                
                <View style={styles.infoItem}>
                  <Ionicons name="calendar-outline" size={20} color={COLORS.primary} />
                  <View>
                    <Text style={[styles.infoLabel, { color: COLORS.textSecondary }]}>Membre depuis</Text>
                    <Text style={[styles.infoValue, { color: COLORS.text }]}>
                      {new Date(seller.memberSince).toLocaleDateString('fr-FR', {
                        month: 'long',
                        year: 'numeric'
                      })}
                    </Text>
                  </View>
                </View>
              </View>
            </View>
          </View>
        )}

        {activeTab === 'products' && (
          <View style={[styles.tabContent, { backgroundColor: COLORS.background }]}>
            {products.length === 0 ? (
              <View style={styles.emptyContent}>
                <Ionicons name="cart-outline" size={60} color={COLORS.textSecondary} />
                <Text style={[styles.emptyText, { color: COLORS.emptyText }]}>Aucun produit</Text>
                <Text style={[styles.emptySubtext, { color: COLORS.emptySubtext }]}>Ce vendeur n'a pas encore ajouté de produits</Text>
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
  container: { flex: 1 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { fontSize: 16, marginTop: 12 },
  errorContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
  errorTitle: { fontSize: 22, fontWeight: '600', marginTop: 16, marginBottom: 8 },
  fixedHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1,
  },
  backButtonHeader: { padding: 4 },
  headerTitle: { fontSize: 18, fontWeight: '700' },
  headerActions: { flexDirection: 'row', alignItems: 'center' },
  headerActionButton: { padding: 8 },
  scrollView: { flex: 1 },
  coverContainer: { height: 200 },
  coverPhoto: { width: '100%', height: '100%', resizeMode: 'cover' },
  coverPlaceholder: { width: '100%', height: '100%', justifyContent: 'center', alignItems: 'center' },
  profileInfoBar: { paddingHorizontal: 16, paddingBottom: 16, borderBottomWidth: 1 },
  profileImageContainer: { marginTop: -40 },
  profileImage: { width: 120, height: 120, borderRadius: 60, borderWidth: 4 },
  profileImagePlaceholder: { width: 120, height: 120, borderRadius: 60, justifyContent: 'center', alignItems: 'center', borderWidth: 4 },
  profileActions: { flexDirection: 'row', marginTop: 12, gap: 8 },
  actionButtonLarge: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 10, borderRadius: 6, gap: 6 },
  followButton: { backgroundColor: '#42A5F5' },
  followingButton: { backgroundColor: 'transparent', borderWidth: 1, borderColor: '#42A5F5' },
  whatsappButton: { backgroundColor: '#25D366' },
  actionButtonText: { fontSize: 15, fontWeight: '600', color: '#FFFFFF' },
  emailButton: { width: 40, height: 40, borderRadius: 6, backgroundColor: '#42A5F5', justifyContent: 'center', alignItems: 'center' },
  profileDetails: { padding: 16, borderBottomWidth: 1 },
  profileName: { fontSize: 24, fontWeight: '700', marginBottom: 4 },
  companyName: { fontSize: 16, marginBottom: 4 },
  profileCategory: { fontSize: 15, marginBottom: 16 },
  profileStats: { flexDirection: 'row', alignItems: 'center', marginBottom: 16, justifyContent: 'center' },
  statContainer: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  statNumber: { fontSize: 17, fontWeight: '700' },
  statLabel: { fontSize: 15 },
  statDivider: { width: 1, height: 20, marginHorizontal: 16 },
  contactInfo: { marginTop: 16, gap: 20 },
  contactRow: { flexDirection: 'row', gap: 12, alignItems: 'flex-start' },
  contactIconContainer: { width: 40, height: 40, borderRadius: 8, justifyContent: 'center', alignItems: 'center', marginTop: 4 },
  contactDetails: { flex: 1 },
  contactLabel: { fontSize: 13, marginBottom: 2 },
  contactValue: { fontSize: 16, fontWeight: '600', marginBottom: 8 },
  contactButtons: { flexDirection: 'row', gap: 8, marginTop: 4 },
  contactActionButton: { flexDirection: 'row', alignItems: 'center', paddingVertical: 6, paddingHorizontal: 12, borderRadius: 4, gap: 6 },
  contactActionText: { fontSize: 12, fontWeight: '600', color: '#FFFFFF' },
  tabsContainer: { flexDirection: 'row', borderBottomWidth: 1 },
  tab: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 14, gap: 8, borderBottomWidth: 3, borderBottomColor: 'transparent' },
  tabText: { fontSize: 15, fontWeight: '600' },
  tabContent: { minHeight: 400 },
  publicationCard: { marginBottom: 0, padding: 0, width: '100%' },
  publicationHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1 },
  publicationProfile: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  publicationProfileImage: { width: 40, height: 40, borderRadius: 20 },
  publicationProfilePlaceholder: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center' },
  publicationName: { fontSize: 15, fontWeight: '600' },
  publicationDate: { fontSize: 13, marginTop: 2 },
  publicationTitle: { fontSize: 16, fontWeight: '700', marginBottom: 8, paddingHorizontal: 16, paddingTop: 12 },
  publicationDescription: { fontSize: 14, lineHeight: 20, marginBottom: 12, paddingHorizontal: 16 },
  publicationImage: { width: '100%', height: 300, marginBottom: 12 },
  publicationPriceContainer: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 16, paddingBottom: 16 },
  publicationPrice: { fontSize: 18, fontWeight: '700' },
  publicationOriginalPrice: { fontSize: 14, textDecorationLine: 'line-through' },
  aboutSection: { padding: 16, borderBottomWidth: 1 },
  sectionTitle: { fontSize: 17, fontWeight: '700', marginBottom: 12 },
  aboutText: { fontSize: 15, lineHeight: 22 },
  noInfoText: { fontSize: 15, fontStyle: 'italic' },
  infoList: { gap: 16 },
  infoItem: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  infoLabel: { fontSize: 13, marginBottom: 2 },
  infoValue: { fontSize: 15 },
  productGridContainer: { padding: 8 },
  productGridRow: { justifyContent: 'space-between', marginBottom: 8 },
  productGridItem: { width: (width - 24) / 2, borderRadius: 8, overflow: 'hidden', borderWidth: 1 },
  productGridImage: { width: '100%', height: 150 },
  productGridInfo: { padding: 12 },
  productGridTitle: { fontSize: 14, fontWeight: '600', marginBottom: 6, lineHeight: 18 },
  productGridPrice: { fontSize: 16, fontWeight: '700' },
  productGridOriginalPrice: { fontSize: 13, textDecorationLine: 'line-through' },
  emptyContent: { alignItems: 'center', paddingVertical: 60, paddingHorizontal: 20 },
  emptyText: { fontSize: 17, fontWeight: '600', marginTop: 16, marginBottom: 8 },
  emptySubtext: { fontSize: 15, textAlign: 'center', lineHeight: 20 },
  backButton: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 12, borderRadius: 6, gap: 8, marginTop: 20 },
  backButtonText: { color: '#FFFFFF', fontSize: 16, fontWeight: '600' },
});

export default SellerProfile;