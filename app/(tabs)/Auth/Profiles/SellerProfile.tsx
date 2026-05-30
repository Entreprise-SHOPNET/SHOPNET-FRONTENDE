



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
import { useLanguage } from "../../../../context/LanguageContext";

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
  const { language } = useLanguage();
  const fr = language === 'fr';
  
  const [seller, setSeller] = useState<Seller | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'publications' | 'about' | 'products'>('publications');
  const [following, setFollowing] = useState(false);
  const [followersCount, setFollowersCount] = useState(0);

  useEffect(() => {
    if (!sellerId || isNaN(numericSellerId)) {
      Toast.show({ type: 'error', text1: fr ? 'Erreur' : 'Error', text2: fr ? 'ID du vendeur invalide' : 'Invalid seller ID' });
      router.back();
    }
  }, [sellerId, numericSellerId, fr]);

  const fetchSeller = useCallback(async () => {
    try {
      const token = await AsyncStorage.getItem('userToken');
      const res = await axios.get(`https://shopnet-backend.onrender.com/api/sellers/${numericSellerId}`, { headers: token ? { Authorization: `Bearer ${token}` } : {} });
      if (res.data.success && res.data.seller) { setSeller(res.data.seller); setFollowersCount(125); }
      else { Toast.show({ type: 'error', text1: fr ? 'Erreur' : 'Error', text2: fr ? 'Impossible de charger le profil du vendeur' : 'Unable to load seller profile' }); }
    } catch (error: any) {
      Toast.show({ type: 'error', text1: fr ? 'Erreur' : 'Error', text2: error.message || (fr ? 'Problème de connexion' : 'Connection issue') });
    } finally { setLoading(false); }
  }, [numericSellerId, fr]);

  useEffect(() => { if (numericSellerId) fetchSeller(); }, [fetchSeller, numericSellerId]);

  const formatNumber = (num: number): string => {
    if (num >= 1000000) return (num / 1000000).toFixed(1).replace(/\.0$/, '') + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1).replace(/\.0$/, '') + 'K';
    return num.toString();
  };

  const handleFollowToggle = () => {
    const newFollowing = !following; setFollowing(newFollowing);
    setFollowersCount(prev => newFollowing ? prev + 1 : Math.max(0, prev - 1));
    Toast.show({ type: 'success', text1: newFollowing ? (fr ? 'Abonné' : 'Following') : (fr ? 'Désabonné' : 'Unfollowed'), text2: newFollowing ? (fr ? 'Vous suivez maintenant ce vendeur' : 'You are now following this seller') : (fr ? 'Vous ne suivez plus ce vendeur' : 'You are no longer following this seller') });
  };

  const formatPhoneForDisplay = (rawPhone: string | null): string => {
    if (!rawPhone) return "";
    let phone = rawPhone.replace(/\s+/g, '').replace(/\D/g, '');
    if (phone.startsWith('243')) phone = phone.substring(3);
    else if (phone.startsWith('0')) phone = phone.substring(1);
    if (phone.length >= 9) return `+243 ${phone.substring(0, 3)} ${phone.substring(3, 6)} ${phone.substring(6, 9)}`.trim();
    return `+243 ${phone}`;
  };

  const formatPhoneForWhatsApp = (rawPhone: string | null): string => {
    if (!rawPhone) return "";
    let phone = rawPhone.replace(/\s+/g, '').replace(/\D/g, '');
    if (phone.startsWith('0')) phone = '+243' + phone.substring(1);
    else if (!phone.startsWith('+')) phone = '+243' + phone;
    return phone;
  };

  const openWhatsApp = () => {
    const rawPhone = seller?.phone || "";
    if (!rawPhone) { Toast.show({ type: 'info', text1: fr ? 'Information' : 'Info', text2: fr ? 'Numéro WhatsApp non disponible' : 'WhatsApp number not available' }); return; }
    const phone = formatPhoneForWhatsApp(rawPhone);
    if (!phone || phone.length < 13) { Toast.show({ type: 'error', text1: fr ? 'Erreur' : 'Error', text2: fr ? 'Numéro invalide' : 'Invalid number' }); return; }
    const messageFR = `Bonjour ${seller?.name || ''} 👋,\n\nJe me permets de vous contacter via *SHOPNET*.\n\nJ'ai parcouru votre profil et vos produits m'ont intéressé(e).\n\nJe souhaiterais en savoir plus sur vos offres et disponibilités.\n\nCordialement,\n[Client SHOPNET] 🛍️`;
    const messageEN = `Hello ${seller?.name || ''} 👋,\n\nI'm contacting you via *SHOPNET*.\n\nI browsed your profile and your products caught my attention.\n\nI'd like to know more about your offers and availability.\n\nBest regards,\n[SHOPNET Client] 🛍️`;
    const url = `https://wa.me/${phone.replace('+', '')}?text=${encodeURIComponent(fr ? messageFR : messageEN)}`;
    Linking.openURL(url).catch(() => Linking.openURL(`https://web.whatsapp.com/send?phone=${phone.replace('+', '')}&text=${encodeURIComponent(fr ? messageFR : messageEN)}`).catch(() => Toast.show({ type: 'error', text1: fr ? 'Erreur' : 'Error', text2: fr ? 'Impossible d\'ouvrir WhatsApp' : 'Unable to open WhatsApp' })));
  };

  const makePhoneCall = () => {
    const rawPhone = seller?.phone || "";
    if (!rawPhone) { Toast.show({ type: 'info', text1: fr ? 'Information' : 'Info', text2: fr ? 'Numéro non disponible' : 'Number not available' }); return; }
    Linking.openURL(`tel:${formatPhoneForWhatsApp(rawPhone)}`).catch(() => Toast.show({ type: 'error', text1: fr ? 'Erreur' : 'Error', text2: fr ? 'Impossible de passer un appel' : 'Unable to make call' }));
  };

  const handleEmail = () => {
    const email = seller?.email;
    if (!email) { Toast.show({ type: 'info', text1: fr ? 'Information' : 'Info', text2: fr ? 'Email non disponible' : 'Email not available' }); return; }
    const subject = fr ? `Demande d'informations - Produits SHOPNET` : `Information Request - SHOPNET Products`;
    const body = fr ? `Bonjour ${seller?.name || ''},\n\nJe me permets de vous contacter via SHOPNET.\n\nJ'ai consulté votre profil et vos produits m'intéressent.\n\nPourriez-vous me donner plus d'informations ?\n\nCordialement,\n[Votre nom]` : `Hello ${seller?.name || ''},\n\nI'm contacting you via SHOPNET.\n\nI checked your profile and I'm interested in your products.\n\nCould you give me more information?\n\nBest regards,\n[Your name]`;
    Linking.openURL(`mailto:${email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`).catch(() => Toast.show({ type: 'error', text1: fr ? 'Erreur' : 'Error', text2: fr ? 'Impossible d\'ouvrir l\'application email' : 'Unable to open email app' }));
  };

  const handleProductPress = (productId: number) => { router.push({ pathname: '/(tabs)/Auth/Panier/DetailId', params: { id: productId.toString() } }); };
  const handleSearchPress = () => { router.push('/(tabs)/Auth/Produits/Recherche'); };

  const formatDate = (dateStr: string, fr: boolean) => {
    try {
      const date = new Date(dateStr); const now = new Date();
      const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
      if (diffDays === 0) return fr ? "Aujourd'hui" : "Today";
      if (diffDays === 1) return fr ? 'Hier' : 'Yesterday';
      if (diffDays < 7) return fr ? `Il y a ${diffDays} jours` : `${diffDays} days ago`;
      if (diffDays < 30) return fr ? `Il y a ${Math.floor(diffDays / 7)} semaines` : `${Math.floor(diffDays / 7)} weeks ago`;
      if (diffDays < 365) return fr ? `Il y a ${Math.floor(diffDays / 30)} mois` : `${Math.floor(diffDays / 30)} months ago`;
      return fr ? `Il y a ${Math.floor(diffDays / 365)} ans` : `${Math.floor(diffDays / 365)} years ago`;
    } catch { return fr ? 'Date inconnue' : 'Unknown date'; }
  };

  const renderPublication = ({ item }: { item: Product }) => (
    <TouchableOpacity style={[styles.publicationCard, { backgroundColor: COLORS.cardBg, borderBottomColor: COLORS.border }]} onPress={() => handleProductPress(item.id)} activeOpacity={0.8}>
      <View style={[styles.publicationHeader, { borderBottomColor: COLORS.border }]}>
        <View style={styles.publicationProfile}>
          {seller?.profilePhoto ? (<Image source={{ uri: seller.profilePhoto }} style={styles.publicationProfileImage} />) : (<View style={[styles.publicationProfilePlaceholder, { backgroundColor: COLORS.primary }]}><Ionicons name="person" size={24} color={COLORS.white} /></View>)}
          <View><Text style={[styles.publicationName, { color: COLORS.text }]}>{seller?.name || (fr ? 'Vendeur' : 'Seller')}</Text><Text style={[styles.publicationDate, { color: COLORS.textSecondary }]}>{formatDate(item.created_at, fr)} · 🌍</Text></View>
        </View>
      </View>
      <Text style={[styles.publicationTitle, { color: COLORS.text }]} numberOfLines={2}>{item.title}</Text>
      {item.description && (<Text style={[styles.publicationDescription, { color: COLORS.textSecondary }]} numberOfLines={3}>{item.description}</Text>)}
      {item.images?.[0] && (<Image source={{ uri: item.images[0] }} style={styles.publicationImage} resizeMode="cover" />)}
      <View style={styles.publicationPriceContainer}><Text style={[styles.publicationPrice, { color: COLORS.red }]}>${item.price?.toFixed(2)}</Text>{item.original_price && item.original_price > item.price && (<Text style={[styles.publicationOriginalPrice, { color: COLORS.textSecondary }]}>${item.original_price.toFixed(2)}</Text>)}</View>
    </TouchableOpacity>
  );

  const renderProductGrid = ({ item }: { item: Product }) => (
    <TouchableOpacity style={[styles.productGridItem, { backgroundColor: COLORS.cardBg, borderColor: COLORS.border }]} onPress={() => handleProductPress(item.id)} activeOpacity={0.8}>
      <Image source={{ uri: item.images?.[0] || 'https://via.placeholder.com/200x200' }} style={styles.productGridImage} resizeMode="cover" />
      <View style={styles.productGridInfo}>
        <Text style={[styles.productGridTitle, { color: COLORS.text }]} numberOfLines={2}>{item.title}</Text>
        <Text style={[styles.productGridPrice, { color: COLORS.red }]}>${item.price?.toFixed(2)}</Text>
        {item.original_price && item.original_price > item.price && (<Text style={[styles.productGridOriginalPrice, { color: COLORS.textSecondary }]}>${item.original_price.toFixed(2)}</Text>)}
      </View>
    </TouchableOpacity>
  );

  if (loading) return (
    <SafeAreaView style={[styles.container, { backgroundColor: COLORS.background }]}>
      <StatusBar backgroundColor={COLORS.statusBar} barStyle={COLORS.barStyle} />
      <View style={[styles.loadingContainer, { backgroundColor: COLORS.loadingBg }]}><ActivityIndicator size="large" color={COLORS.primary} /><Text style={[styles.loadingText, { color: COLORS.loadingText }]}>{fr ? 'Chargement du profil...' : 'Loading profile...'}</Text></View>
    </SafeAreaView>
  );

  if (!seller) return (
    <SafeAreaView style={[styles.container, { backgroundColor: COLORS.background }]}>
      <StatusBar backgroundColor={COLORS.statusBar} barStyle={COLORS.barStyle} />
      <View style={[styles.errorContainer, { backgroundColor: COLORS.errorBg }]}><Ionicons name="person-remove-outline" size={80} color={COLORS.primary} /><Text style={[styles.errorTitle, { color: COLORS.errorText }]}>{fr ? 'Vendeur non trouvé' : 'Seller Not Found'}</Text><TouchableOpacity style={[styles.backButton, { backgroundColor: COLORS.primary }]} onPress={() => router.back()}><Ionicons name="arrow-back" size={20} color={COLORS.white} /><Text style={styles.backButtonText}>{fr ? 'Retour' : 'Back'}</Text></TouchableOpacity></View>
    </SafeAreaView>
  );

  const products = seller.products || [];
  const displayPhone = seller.phone ? formatPhoneForDisplay(seller.phone) : "";
  const displayEmail = seller.email || "";

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: COLORS.background }]}>
      <StatusBar backgroundColor={COLORS.statusBar} barStyle={COLORS.barStyle} />
      <View style={[styles.fixedHeader, { backgroundColor: COLORS.headerBg, borderBottomColor: COLORS.headerBorder }]}>
        <TouchableOpacity style={styles.backButtonHeader} onPress={() => router.back()}><Ionicons name="arrow-back" size={24} color={COLORS.text} /></TouchableOpacity>
        <Text style={[styles.headerTitle, { color: COLORS.text }]}>{seller.name}</Text>
        <View style={styles.headerActions}><TouchableOpacity style={styles.headerActionButton} onPress={handleSearchPress}><Ionicons name="search" size={22} color={COLORS.text} /></TouchableOpacity></View>
      </View>
      <ScrollView style={[styles.scrollView, { backgroundColor: COLORS.background }]} showsVerticalScrollIndicator={false} stickyHeaderIndices={[1]}>
        <View style={[styles.coverContainer, { backgroundColor: COLORS.coverBg }]}>
          {seller.coverPhoto ? (<Image source={{ uri: seller.coverPhoto }} style={styles.coverPhoto} />) : (<View style={[styles.coverPlaceholder, { backgroundColor: COLORS.placeholderBg }]}><Ionicons name="storefront-outline" size={60} color={COLORS.primary} /></View>)}
        </View>
        <View style={[styles.profileInfoBar, { backgroundColor: COLORS.surface, borderBottomColor: COLORS.border }]}>
          <View style={styles.profileImageContainer}>
            {seller.profilePhoto ? (<Image source={{ uri: seller.profilePhoto }} style={[styles.profileImage, { borderColor: COLORS.profileBorder }]} />) : (<View style={[styles.profileImagePlaceholder, { backgroundColor: COLORS.primary, borderColor: COLORS.profileBorder }]}><Ionicons name="person" size={40} color={COLORS.white} /></View>)}
          </View>
          <View style={styles.profileActions}>
            <TouchableOpacity style={[styles.actionButtonLarge, following ? styles.followingButton : styles.followButton]} onPress={handleFollowToggle}><Ionicons name={following ? 'checkmark' : 'person-add'} size={20} color={following ? COLORS.primary : COLORS.white} /><Text style={[styles.actionButtonText, following && { color: COLORS.primary }]}>{following ? (fr ? 'Suivi' : 'Following') : (fr ? 'Suivre' : 'Follow')}</Text></TouchableOpacity>
            <TouchableOpacity style={[styles.actionButtonLarge, styles.whatsappButton, !seller.phone && { backgroundColor: COLORS.disabledBg, opacity: 0.5 }]} onPress={openWhatsApp} disabled={!seller.phone}><FontAwesome name="whatsapp" size={20} color={seller.phone ? COLORS.white : COLORS.disabledText} /><Text style={[styles.actionButtonText, !seller.phone && { color: COLORS.disabledText }]}>WhatsApp</Text></TouchableOpacity>
            <TouchableOpacity style={[styles.emailButton, !seller.email && { backgroundColor: COLORS.disabledBg, opacity: 0.5 }]} onPress={handleEmail} disabled={!seller.email}><MaterialIcons name="email" size={24} color={seller.email ? COLORS.white : COLORS.disabledText} /></TouchableOpacity>
          </View>
        </View>
        <View style={[styles.profileDetails, { backgroundColor: COLORS.surface, borderBottomColor: COLORS.border }]}>
          <Text style={[styles.profileName, { color: COLORS.text }]}>{seller.name}</Text>
          {seller.companyName && (<Text style={[styles.companyName, { color: COLORS.primary }]}>{seller.companyName}</Text>)}
          <Text style={[styles.profileCategory, { color: COLORS.textSecondary }]}>{fr ? 'Boutique en ligne · Vendeur SHOPNET' : 'Online Shop · SHOPNET Seller'}</Text>
          <View style={styles.profileStats}>
            <View style={styles.statContainer}><Text style={[styles.statNumber, { color: COLORS.text }]}>{products.length}</Text><Text style={[styles.statLabel, { color: COLORS.textSecondary }]}>{fr ? 'produits' : 'products'}</Text></View>
            <View style={[styles.statDivider, { backgroundColor: COLORS.statDivider }]} />
            <View style={styles.statContainer}><Text style={[styles.statNumber, { color: COLORS.text }]}>{formatNumber(followersCount)}</Text><Text style={[styles.statLabel, { color: COLORS.textSecondary }]}>{fr ? 'abonnés' : 'followers'}</Text></View>
            <View style={[styles.statDivider, { backgroundColor: COLORS.statDivider }]} />
            <View style={styles.statContainer}><Ionicons name="star" size={16} color="#FFB800" /><Text style={[styles.statNumber, { color: COLORS.text }]}>4.8</Text><Text style={[styles.statLabel, { color: COLORS.textSecondary }]}>(124)</Text></View>
          </View>
          {(seller.phone || seller.email) && (
            <View style={styles.contactInfo}>
              {seller.phone && (<View style={styles.contactRow}><View style={[styles.contactIconContainer, { backgroundColor: COLORS.contactIconBg }]}><Ionicons name="call-outline" size={20} color={COLORS.primary} /></View><View style={styles.contactDetails}><Text style={[styles.contactLabel, { color: COLORS.textSecondary }]}>{fr ? 'Téléphone' : 'Phone'}</Text><TouchableOpacity onPress={makePhoneCall}><Text style={[styles.contactValue, { color: COLORS.text }]}>{displayPhone}</Text></TouchableOpacity><View style={styles.contactButtons}><TouchableOpacity style={[styles.contactActionButton, { backgroundColor: COLORS.primary }]} onPress={makePhoneCall}><Ionicons name="call" size={14} color={COLORS.white} /><Text style={styles.contactActionText}>{fr ? 'Appeler' : 'Call'}</Text></TouchableOpacity><TouchableOpacity style={[styles.contactActionButton, { backgroundColor: COLORS.green }]} onPress={openWhatsApp}><FontAwesome name="whatsapp" size={14} color={COLORS.white} /><Text style={styles.contactActionText}>WhatsApp</Text></TouchableOpacity></View></View></View>)}
              {seller.email && (<View style={styles.contactRow}><View style={[styles.contactIconContainer, { backgroundColor: COLORS.contactIconBg }]}><MaterialIcons name="email" size={20} color={COLORS.primary} /></View><View style={styles.contactDetails}><Text style={[styles.contactLabel, { color: COLORS.textSecondary }]}>Email</Text><TouchableOpacity onPress={handleEmail}><Text style={[styles.contactValue, { color: COLORS.text }]}>{displayEmail}</Text></TouchableOpacity><TouchableOpacity style={[styles.contactActionButton, { backgroundColor: COLORS.primary }]} onPress={handleEmail}><MaterialIcons name="email" size={14} color={COLORS.white} /><Text style={styles.contactActionText}>{fr ? 'Envoyer Email' : 'Send Email'}</Text></TouchableOpacity></View></View>)}
            </View>
          )}
        </View>
        <View style={[styles.tabsContainer, { backgroundColor: COLORS.tabBg, borderBottomColor: COLORS.border }]}>
          {[
            { key: 'publications', label: fr ? 'Publications' : 'Posts', icon: 'newspaper-outline' },
            { key: 'about', label: fr ? 'À propos' : 'About', icon: 'information-circle-outline' },
            { key: 'products', label: fr ? 'Produits' : 'Products', icon: 'cart-outline' },
          ].map(tab => (
            <TouchableOpacity key={tab.key} style={[styles.tab, activeTab === tab.key && { borderBottomColor: COLORS.tabActiveBorder }]} onPress={() => setActiveTab(tab.key as any)}>
              <Ionicons name={tab.icon as any} size={20} color={activeTab === tab.key ? COLORS.primary : COLORS.tabInactiveText} />
              <Text style={[styles.tabText, { color: activeTab === tab.key ? COLORS.primary : COLORS.tabInactiveText }]}>{tab.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
        {activeTab === 'publications' && (
          <View style={[styles.tabContent, { backgroundColor: COLORS.background }]}>
            {products.length === 0 ? (<View style={styles.emptyContent}><Ionicons name="newspaper-outline" size={60} color={COLORS.textSecondary} /><Text style={[styles.emptyText, { color: COLORS.emptyText }]}>{fr ? 'Aucune publication' : 'No posts'}</Text><Text style={[styles.emptySubtext, { color: COLORS.emptySubtext }]}>{fr ? "Ce vendeur n'a pas encore publié de contenu" : "This seller hasn't posted yet"}</Text></View>) : (<FlatList data={products} keyExtractor={(item) => item.id.toString()} renderItem={renderPublication} scrollEnabled={false} />)}
          </View>
        )}
        {activeTab === 'about' && (
          <View style={[styles.tabContent, { backgroundColor: COLORS.background }]}>
            <View style={[styles.aboutSection, { backgroundColor: COLORS.surface, borderBottomColor: COLORS.border }]}>
              <Text style={[styles.sectionTitle, { color: COLORS.text }]}>{fr ? 'Description' : 'Description'}</Text>
              {seller.description ? (<Text style={[styles.aboutText, { color: COLORS.text }]}>{seller.description}</Text>) : (<Text style={[styles.noInfoText, { color: COLORS.textSecondary }]}>{fr ? 'Aucune description fournie' : 'No description provided'}</Text>)}
            </View>
            <View style={[styles.aboutSection, { backgroundColor: COLORS.surface, borderBottomColor: COLORS.border }]}>
              <Text style={[styles.sectionTitle, { color: COLORS.text }]}>{fr ? 'Informations de contact' : 'Contact Information'}</Text>
              <View style={styles.infoList}>
                {seller.phone && (<View style={styles.infoItem}><Ionicons name="call-outline" size={20} color={COLORS.primary} /><View><Text style={[styles.infoLabel, { color: COLORS.textSecondary }]}>{fr ? 'Téléphone' : 'Phone'}</Text><TouchableOpacity onPress={makePhoneCall}><Text style={[styles.infoValue, { color: COLORS.text }]}>{displayPhone}</Text></TouchableOpacity></View></View>)}
                {seller.email && (<View style={styles.infoItem}><MaterialIcons name="email" size={20} color={COLORS.primary} /><View><Text style={[styles.infoLabel, { color: COLORS.textSecondary }]}>Email</Text><TouchableOpacity onPress={handleEmail}><Text style={[styles.infoValue, { color: COLORS.text }]}>{displayEmail}</Text></TouchableOpacity></View></View>)}
                {(seller.address || seller.ville) && (<View style={styles.infoItem}><Ionicons name="location-outline" size={20} color={COLORS.primary} /><View><Text style={[styles.infoLabel, { color: COLORS.textSecondary }]}>{fr ? 'Adresse' : 'Address'}</Text><Text style={[styles.infoValue, { color: COLORS.text }]}>{(seller.address && seller.ville) ? `${seller.address}, ${seller.ville}` : seller.address || seller.ville}</Text></View></View>)}
                <View style={styles.infoItem}><Ionicons name="calendar-outline" size={20} color={COLORS.primary} /><View><Text style={[styles.infoLabel, { color: COLORS.textSecondary }]}>{fr ? 'Membre depuis' : 'Member since'}</Text><Text style={[styles.infoValue, { color: COLORS.text }]}>{new Date(seller.memberSince).toLocaleDateString(fr ? 'fr-FR' : 'en-US', { month: 'long', year: 'numeric' })}</Text></View></View>
              </View>
            </View>
          </View>
        )}
        {activeTab === 'products' && (
          <View style={[styles.tabContent, { backgroundColor: COLORS.background }]}>
            {products.length === 0 ? (<View style={styles.emptyContent}><Ionicons name="cart-outline" size={60} color={COLORS.textSecondary} /><Text style={[styles.emptyText, { color: COLORS.emptyText }]}>{fr ? 'Aucun produit' : 'No products'}</Text><Text style={[styles.emptySubtext, { color: COLORS.emptySubtext }]}>{fr ? "Ce vendeur n'a pas encore ajouté de produits" : "This seller hasn't added products yet"}</Text></View>) : (<FlatList data={products} keyExtractor={(item) => item.id.toString()} renderItem={renderProductGrid} numColumns={2} scrollEnabled={false} columnWrapperStyle={styles.productGridRow} contentContainerStyle={styles.productGridContainer} />)}
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
  fixedHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1 },
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