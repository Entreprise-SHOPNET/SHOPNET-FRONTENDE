


import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  Image,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Dimensions,
  Modal,
  FlatList,
  Alert,
  Share,
  Linking,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from "../../../../app/theme/ThemeContext";

const { width } = Dimensions.get('window');
const API_BASE = 'https://shopnet-immo-backend.onrender.com/api/biens';
const FAVORITES_KEY = 'shopnet_favorites';
const DETAIL_CACHE_KEY = 'immo_detail_cache_';
const CACHE_TTL = 30 * 60 * 1000; // 30 minutes

type Bien = {
  id: number;
  titre: string;
  type_bien: string;
  type_offre: string;
  prix: number;
  devise: string;
  ville: string;
  commune: string;
  quartier: string;
  reference: string;
  superficie?: string;
  chambres: number;
  salles_bain: number;
  images: string[];
  description: string;
  whatsapp?: string;
  telephone?: string;
  status: string;
};

// Hook pour les couleurs dynamiques
const useDynamicColors = () => {
  const { isDark } = useTheme();

  return {
    background: isDark ? '#0D0D0D' : '#FFFFFF',
    surface: isDark ? '#1A1A1A' : '#FFFFFF',
    text: isDark ? '#F5F5F5' : '#0F172A',
    textSecondary: isDark ? '#B0B0B0' : '#64748B',
    textTertiary: isDark ? '#A0AEC0' : '#475569',
    textMuted: isDark ? '#A0AEC0' : '#334155',
    primary: '#104CCF',
    primaryLight: '#104CCF',
    border: isDark ? '#2E2E2E' : '#EEF2F6',
    borderLight: isDark ? '#2E2E2E' : '#E2E8F0',
    cardBg: isDark ? '#1A1A1A' : '#FFFFFF',
    inputBg: isDark ? '#222222' : '#F8FAFC',
    detailBg: isDark ? '#1A1A1A' : '#F8FAFC',
    statBg: isDark ? '#222222' : '#F8FAFC',
    statText: isDark ? '#B0B0B0' : '#334155',
    metaBg: isDark ? '#1A2A3A' : '#EEF2FF',
    metaText: '#104CCF',
    aboutTitle: isDark ? '#F5F5F5' : '#0F172A',
    aboutText: isDark ? '#B0B0B0' : '#475569',
    headerBg: isDark ? '#1A1A1A' : '#FFFFFF',
    headerBorder: isDark ? '#2E2E2E' : '#EEF2F6',
    headerText: isDark ? '#F5F5F5' : '#0F172A',
    headerIcon: '#1E293B',
    favHeaderBg: isDark ? '#222222' : '#F8FAFC',
    favHeaderBorder: isDark ? '#2E2E2E' : '#E2E8F0',
    favBadge: '#EF4444',
    favBadgeText: '#FFFFFF',
    favActive: '#EF4444',
    favInactive: isDark ? '#666666' : '#CBD5E1',
    favButtonBg: isDark ? '#222222' : '#F8FAFC',
    favButtonText: isDark ? '#B0B0B0' : '#64748B',
    priceColor: '#104CCF',
    priceSmall: isDark ? '#B0B0B0' : '#64748B',
    loadingText: isDark ? '#B0B0B0' : '#64748B',
    detailLabel: isDark ? '#B0B0B0' : '#334155',
    detailValue: isDark ? '#F5F5F5' : '#0F172A',
    detailIcon: isDark ? '#B0B0B0' : '#64748B',
    modalBg: isDark ? '#1A1A1A' : '#FFFFFF',
    modalOverlay: 'rgba(0,0,0,0.5)',
    modalTitle: isDark ? '#F5F5F5' : '#0F172A',
    modalBorder: isDark ? '#2E2E2E' : '#EEF2F6',
    favItemText: isDark ? '#F5F5F5' : '#1E293B',
    emptyFav: isDark ? '#B0B0B0' : '#94A3B8',
    messageBg: isDark ? '#1A2A3A' : '#EEF2FF',
    messageText: '#104CCF',
    similarTitle: isDark ? '#F5F5F5' : '#0F172A',
    similarCardBg: isDark ? '#1A1A1A' : '#FFFFFF',
    similarCardBorder: isDark ? '#2E2E2E' : '#EEF2F6',
    similarCardTitle: isDark ? '#F5F5F5' : '#0F172A',
    similarCardPrice: '#104CCF',
    similarCardMeta: isDark ? '#B0B0B0' : '#64748B',
    imageBg: '#F1F5F9',
    thumbnailBorder: 'transparent',
    thumbnailActive: '#104CCF',
    whatsapp: '#25D366',
    call: '#3B82F6',
    share: '#6366F1',
    reserve: '#104CCF',
    white: '#FFFFFF',
    statusBar: isDark ? '#0D0D0D' : '#FFFFFF',
    barStyle: isDark ? 'light-content' as const : 'dark-content' as const,
  };
};

export default function ImmobilierDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const COLORS = useDynamicColors();
  const { isDark } = useTheme();

  const [bien, setBien] = useState<Bien | null>(null);
  const [loading, setLoading] = useState(true);
  const [favorites, setFavorites] = useState<number[]>([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [similarBiens, setSimilarBiens] = useState<Bien[]>([]);
  const [mainImage, setMainImage] = useState('');
  const [reservations, setReservations] = useState(0);
  const messageInterval = useRef<NodeJS.Timeout | null>(null);
  const [currentMessageIndex, setCurrentMessageIndex] = useState(0);
  const messages = [
    "🏡 Offrez-vous un cadre de vie exceptionnel...",
    "✨ Une pépite rare : confort et sécurité.",
    "💎 Investissez dans votre bonheur.",
    "🌿 Vivez une expérience unique.",
    "🚀 Ce bien booste votre quotidien.",
    "🏠 L'art de vivre SHOPNET IMMOBILIER."
  ];

  // Charger favoris
  const loadFavorites = async () => {
    try {
      const favs = await AsyncStorage.getItem(FAVORITES_KEY);
      if (favs) setFavorites(JSON.parse(favs));
    } catch (error) {}
  };

  const saveFavorites = async (newFavs: number[]) => {
    await AsyncStorage.setItem(FAVORITES_KEY, JSON.stringify(newFavs));
    setFavorites(newFavs);
  };

  const isFavorite = (id: number) => favorites.includes(id);
  const toggleFavorite = () => {
    if (!bien) return;
    let newFavs;
    if (isFavorite(bien.id)) {
      newFavs = favorites.filter(f => f !== bien.id);
    } else {
      newFavs = [...favorites, bien.id];
    }
    saveFavorites(newFavs);
  };

  // Charger les détails avec cache 30 min
  const fetchDetail = async () => {
    try {
      const cacheKey = DETAIL_CACHE_KEY + id;
      const cached = await AsyncStorage.getItem(cacheKey);
      if (cached) {
        const { data, timestamp } = JSON.parse(cached);
        if (Date.now() - timestamp < CACHE_TTL) {
          const b = data;
          b.images = b.images || [];
          setBien(b);
          setMainImage(b.images[0] || 'https://placehold.co/800x500?text=SHOPNET+IMMO');
          setLoading(false);
          return;
        }
      }

      const res = await fetch(`${API_BASE}/${id}`);
      const data = await res.json();
      if (data.success) {
        const b = data.bien;
        b.images = b.images || [];
        setBien(b);
        setMainImage(b.images[0] || 'https://placehold.co/800x500?text=SHOPNET+IMMO');
        await AsyncStorage.setItem(cacheKey, JSON.stringify({ data: b, timestamp: Date.now() }));
      } else {
        Alert.alert('Erreur', 'Bien introuvable');
      }
    } catch (error) {
      Alert.alert('Erreur', 'Impossible de charger le détail');
    } finally {
      setLoading(false);
    }
  };

  // Charger biens similaires (même ville)
  const fetchSimilar = async (ville: string) => {
    try {
      const res = await fetch(`${API_BASE}/public`);
      const data = await res.json();
      if (data.success && data.biens) {
        let similars = data.biens.filter(
          (b: Bien) => b.id !== Number(id) && b.status === 'approved' && b.ville === ville
        );
        setSimilarBiens(similars.slice(0, 4));
      }
    } catch (error) {}
  };

  useEffect(() => {
    loadFavorites();
    fetchDetail();
    return () => {
      if (messageInterval.current) clearInterval(messageInterval.current);
    };
  }, []);

  useEffect(() => {
    if (bien?.ville) fetchSimilar(bien.ville);
  }, [bien]);

  // Carrousel de messages
  useEffect(() => {
    if (messageInterval.current) clearInterval(messageInterval.current);
    messageInterval.current = setInterval(() => {
      setCurrentMessageIndex(prev => (prev + 1) % messages.length);
    }, 5000);
    return () => {
      if (messageInterval.current) clearInterval(messageInterval.current);
    };
  }, []);

  const handleWhatsApp = () => {
    if (!bien?.whatsapp) return;
    let rawNumber = bien.whatsapp.toString().replace(/\D/g, '');
    if (!rawNumber.startsWith('243') && rawNumber.length === 9) rawNumber = '243' + rawNumber;
    else if (!rawNumber.startsWith('243') && rawNumber.length > 9) rawNumber = '243' + rawNumber.slice(-9);
    
    const imageUrl = bien.images?.[0] || '';
    const message = encodeURIComponent(
`Bonjour 👋,

Je vous contacte suite à une annonce que j'ai consultée sur *SHOPNET IMMOBILIER*.

Le bien a particulièrement retenu mon attention :

🏡 Bien : "${bien.titre}"
💰 Prix : ${bien.prix} ${bien.devise}
📍 Localisation : ${bien.ville}

📸 Voir l'image :
${imageUrl}

Je souhaiterais savoir si ce bien est toujours disponible.

Je suis réellement intéressé(e) et j'aimerais obtenir plus d'informations concernant :
- les conditions (vente/location),
- la disponibilité,
- ainsi que la possibilité d'organiser une visite.

Dans l'attente de votre retour.

Merci 🙏`
    );
    Linking.openURL(`https://wa.me/${rawNumber}?text=${message}`);
  };

  const handleCall = () => {
    if (bien?.telephone) {
      Linking.openURL(`tel:${bien.telephone.replace(/[^0-9+]/g, '')}`);
    }
  };

  const handleShare = async () => {
    try {
      await Share.share({
        title: bien?.titre,
        message: `${bien?.titre} - ${bien?.prix} ${bien?.devise} sur SHOPNET IMMOBILIER\n${bien?.images?.[0] || ''}`,
      });
    } catch (error) {}
  };

  const handleReserve = () => {
    setReservations(prev => prev + 1);
    Alert.alert('Réservation', `✅ Bien réservé ! Total : ${reservations + 1}`);
  };

  const renderThumbnails = () => {
    if (!bien || bien.images.length <= 1) return null;
    return (
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.thumbnailsContainer}>
        {bien.images.map((img, idx) => (
          <TouchableOpacity key={idx} onPress={() => setMainImage(img)}>
            <Image
              source={{ uri: img }}
              style={[
                styles.thumbnail,
                { borderColor: COLORS.thumbnailBorder },
                mainImage === img && { borderColor: COLORS.thumbnailActive }
              ]}
            />
          </TouchableOpacity>
        ))}
      </ScrollView>
    );
  };

  const renderSimilarCard = ({ item }: { item: Bien }) => (
    <TouchableOpacity
      style={[styles.similarCard, { backgroundColor: COLORS.similarCardBg, borderColor: COLORS.similarCardBorder }]}
      onPress={() => router.push({ pathname: './ImmobilierDetail', params: { id: item.id.toString() } })}
    >
      <Image source={{ uri: item.images?.[0] || 'https://placehold.co/400x250' }} style={styles.similarImage} />
      <View style={styles.similarContent}>
        <Text style={[styles.similarCardTitle, { color: COLORS.similarCardTitle }]} numberOfLines={1}>{item.titre}</Text>
        <Text style={[styles.similarCardPrice, { color: COLORS.similarCardPrice }]}>
          {new Intl.NumberFormat().format(item.prix)} {item.devise}
        </Text>
        <Text style={[styles.similarCardMeta, { color: COLORS.similarCardMeta }]}>
          🏠 {item.superficie || '?'} m² • 🛏️ {item.chambres || 0}
        </Text>
      </View>
    </TouchableOpacity>
  );

  const renderFavoritesModal = () => (
    <Modal visible={modalVisible} animationType="slide" transparent={true} onRequestClose={() => setModalVisible(false)}>
      <View style={[styles.modalOverlay, { backgroundColor: COLORS.modalOverlay }]}>
        <View style={[styles.modalContainer, { backgroundColor: COLORS.modalBg }]}>
          <View style={[styles.modalHeader, { borderBottomColor: COLORS.modalBorder }]}>
            <Text style={[styles.modalTitle, { color: COLORS.modalTitle }]}>
              <Ionicons name="heart" size={20} color="#FF5A5F" /> Mes favoris
            </Text>
            <TouchableOpacity onPress={() => setModalVisible(false)}>
              <Ionicons name="close" size={24} color={COLORS.text} />
            </TouchableOpacity>
          </View>
          <FlatList
            data={favorites}
            keyExtractor={(item) => item.toString()}
            renderItem={({ item: favId }) => {
              return (
                <TouchableOpacity
                  style={[styles.favItem, { borderBottomColor: COLORS.modalBorder }]}
                  onPress={() => {
                    setModalVisible(false);
                    router.push({ pathname: './ImmobilierDetail', params: { id: favId.toString() } });
                  }}
                >
                  <Text style={[styles.favItemText, { color: COLORS.favItemText }]}>Bien #{favId}</Text>
                  <TouchableOpacity
                    onPress={() => {
                      const newFavs = favorites.filter(f => f !== favId);
                      saveFavorites(newFavs);
                      setModalVisible(false);
                    }}
                  >
                    <Ionicons name="trash-outline" size={20} color="#EF4444" />
                  </TouchableOpacity>
                </TouchableOpacity>
              );
            }}
            ListEmptyComponent={
              <Text style={[styles.emptyFav, { color: COLORS.emptyFav }]}>Aucun favori</Text>
            }
            contentContainerStyle={{ paddingBottom: 20 }}
          />
        </View>
      </View>
    </Modal>
  );

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: COLORS.background }]}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={[styles.loadingText, { color: COLORS.loadingText }]}>Chargement...</Text>
      </View>
    );
  }

  if (!bien) return null;

  const lieu = [bien.ville, bien.commune, bien.quartier].filter(Boolean).join(', ');
  const priceFormatted = new Intl.NumberFormat().format(bien.prix);
  const typeOffre = bien.type_offre === 'Vente' ? 'achat' : 'mois';

  return (
    <View style={[styles.container, { backgroundColor: COLORS.background }]}>
      {/* Header fixe */}
      <View style={[styles.headerFixed, { backgroundColor: COLORS.headerBg, borderBottomColor: COLORS.headerBorder }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={COLORS.headerText} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: COLORS.headerText }]}>Détail du bien</Text>
        <TouchableOpacity
          style={[styles.favHeaderButton, { backgroundColor: COLORS.favHeaderBg, borderColor: COLORS.favHeaderBorder }]}
          onPress={() => setModalVisible(true)}
        >
          <Ionicons name="heart-outline" size={22} color={COLORS.primary} />
          {favorites.length > 0 && (
            <View style={[styles.favBadge, { backgroundColor: COLORS.favBadge }]}>
              <Text style={[styles.favBadgeText, { color: COLORS.favBadgeText }]}>{favorites.length}</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {/* Galerie */}
        <View style={styles.gallery}>
          <Image source={{ uri: mainImage }} style={[styles.mainImage, { backgroundColor: COLORS.imageBg }]} />
          {renderThumbnails()}
        </View>

        {/* Contenu détail */}
        <View style={styles.content}>
          <View style={styles.titleRow}>
            <Text style={[styles.title, { color: COLORS.text }]}>{bien.titre}</Text>
            <TouchableOpacity
              onPress={toggleFavorite}
              style={[styles.favButton, { backgroundColor: COLORS.favButtonBg }]}
            >
              <Ionicons
                name={isFavorite(bien.id) ? 'heart' : 'heart-outline'}
                size={24}
                color={isFavorite(bien.id) ? COLORS.favActive : COLORS.favInactive}
              />
              <Text style={[styles.favButtonText, { color: COLORS.favButtonText }]}>
                {isFavorite(bien.id) ? 'Retirer' : 'Favoris'}
              </Text>
            </TouchableOpacity>
          </View>
          <Text style={[styles.price, { color: COLORS.priceColor }]}>
            {priceFormatted} {bien.devise}{' '}
            <Text style={[styles.priceSmall, { color: COLORS.priceSmall }]}>/ {typeOffre}</Text>
          </Text>

          <View style={styles.statsRow}>
            <View style={[styles.statItem, { backgroundColor: COLORS.statBg }]}>
              <Ionicons name="cart-outline" size={16} color={COLORS.primary} />
              <Text style={[styles.statText, { color: COLORS.statText }]}>{reservations} réservations</Text>
            </View>
            <View style={[styles.statItem, { backgroundColor: COLORS.statBg }]}>
              <Ionicons name="heart-outline" size={16} color={COLORS.primary} />
              <Text style={[styles.statText, { color: COLORS.statText }]}>{favorites.length} favoris</Text>
            </View>
            <View style={[styles.metaBadge, { backgroundColor: COLORS.metaBg }]}>
              <Text style={[styles.metaBadgeText, { color: COLORS.metaText }]}>
                {bien.type_bien || 'Bien'} • {bien.type_offre === 'Vente' ? 'Vente' : 'Location'}
              </Text>
            </View>
          </View>

          <View style={[styles.detailList, { backgroundColor: COLORS.detailBg }]}>
            <View style={styles.detailItem}>
              <Ionicons name="location-outline" size={18} color={COLORS.detailIcon} />
              <Text style={[styles.detailLabel, { color: COLORS.detailLabel }]}>Localisation</Text>
              <Text style={[styles.detailValue, { color: COLORS.detailValue }]}>{lieu || 'Non spécifié'}</Text>
            </View>
            <View style={styles.detailItem}>
              <Ionicons name="resize-outline" size={18} color={COLORS.detailIcon} />
              <Text style={[styles.detailLabel, { color: COLORS.detailLabel }]}>Superficie</Text>
              <Text style={[styles.detailValue, { color: COLORS.detailValue }]}>
                {bien.superficie ? `${bien.superficie} m²` : 'Non spécifiée'}
              </Text>
            </View>
            <View style={styles.detailItem}>
              <Ionicons name="bed-outline" size={18} color={COLORS.detailIcon} />
              <Text style={[styles.detailLabel, { color: COLORS.detailLabel }]}>Chambres</Text>
              <Text style={[styles.detailValue, { color: COLORS.detailValue }]}>{bien.chambres || 0}</Text>
            </View>
            <View style={styles.detailItem}>
              <Ionicons name="water-outline" size={18} color={COLORS.detailIcon} />
              <Text style={[styles.detailLabel, { color: COLORS.detailLabel }]}>Salles de bain</Text>
              <Text style={[styles.detailValue, { color: COLORS.detailValue }]}>{bien.salles_bain || 0}</Text>
            </View>
            <View style={styles.detailItem}>
              <Ionicons name="hash-outline" size={18} color={COLORS.detailIcon} />
              <Text style={[styles.detailLabel, { color: COLORS.detailLabel }]}>Référence</Text>
              <Text style={[styles.detailValue, { color: COLORS.detailValue }]}>{bien.reference || '---'}</Text>
            </View>
          </View>

          <View style={styles.aboutBlock}>
            <Text style={[styles.aboutTitle, { color: COLORS.aboutTitle }]}>À propos</Text>
            <Text style={[styles.aboutText, { color: COLORS.aboutText }]}>
              {bien.type_bien || 'Bien'} en {bien.type_offre || 'location'} à {bien.ville || 'emplacement idéal'}. {bien.description || ''}
            </Text>
          </View>

          <Text style={[styles.actionTitle, { color: COLORS.text }]}>⚡ Action Rapide</Text>
          <View style={styles.actionGrid}>
            <View style={styles.actionRow}>
              <TouchableOpacity style={[styles.actionButton, styles.whatsappButton]} onPress={handleWhatsApp}>
                <Ionicons name="logo-whatsapp" size={28} color={COLORS.white} />
                <Text style={styles.actionButtonText}>WhatsApp</Text>
                <Text style={styles.actionSubText}>Contact direct</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.actionButton, styles.callButton]} onPress={handleCall}>
                <Ionicons name="call-outline" size={28} color={COLORS.white} />
                <Text style={styles.actionButtonText}>Appeler</Text>
                <Text style={styles.actionSubText}>Posez vos questions</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.actionRow}>
              <TouchableOpacity style={[styles.actionButton, styles.shareButton]} onPress={handleShare}>
                <Ionicons name="share-social-outline" size={28} color={COLORS.white} />
                <Text style={styles.actionButtonText}>Partager</Text>
                <Text style={styles.actionSubText}>Envoyer l'annonce</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.actionButton, styles.reserveActionButton]} onPress={handleReserve}>
                <Ionicons name="calendar-outline" size={28} color={COLORS.white} />
                <Text style={styles.actionButtonText}>Réserver</Text>
                <Text style={styles.actionSubText}>Confirmer l'intérêt</Text>
              </TouchableOpacity>
            </View>
          </View>

          <View style={[styles.messageCarousel, { backgroundColor: COLORS.messageBg }]}>
            <Text style={[styles.messageText, { color: COLORS.messageText }]}>{messages[currentMessageIndex]}</Text>
          </View>

          {similarBiens.length > 0 && (
            <View style={styles.similarSection}>
              <Text style={[styles.similarSectionTitle, { color: COLORS.similarTitle }]}>🏠 Logements similaires</Text>
              <FlatList
                horizontal
                data={similarBiens}
                renderItem={renderSimilarCard}
                keyExtractor={(item) => item.id.toString()}
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ gap: 12, paddingHorizontal: 16 }}
              />
            </View>
          )}
        </View>
      </ScrollView>

      {renderFavoritesModal()}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: 12, fontSize: 14 },
  headerFixed: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    position: 'sticky',
    top: 0,
    zIndex: 10,
  },
  backButton: { padding: 6 },
  headerTitle: { fontSize: 18, fontWeight: '600' },
  favHeaderButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 30,
    borderWidth: 1,
  },
  favBadge: {
    borderRadius: 12,
    minWidth: 18,
    height: 18,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
    marginLeft: 4,
  },
  favBadgeText: { fontSize: 10, fontWeight: 'bold' },
  scrollContent: { paddingBottom: 30 },
  gallery: { marginBottom: 16 },
  mainImage: { width: width, height: 280, resizeMode: 'cover' },
  thumbnailsContainer: { flexDirection: 'row', paddingHorizontal: 12, paddingVertical: 8, gap: 8 },
  thumbnail: { width: 70, height: 70, borderRadius: 12, borderWidth: 2 },
  content: { paddingHorizontal: 16 },
  titleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  title: { fontSize: 22, fontWeight: '700', flexShrink: 1, marginRight: 12 },
  favButton: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 30 },
  favButtonText: { fontSize: 12 },
  price: { fontSize: 24, fontWeight: '800', marginBottom: 8 },
  priceSmall: { fontSize: 14, fontWeight: '400' },
  statsRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 12, marginBottom: 16 },
  statItem: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 20 },
  statText: { fontSize: 12 },
  metaBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  metaBadgeText: { fontSize: 12, fontWeight: '500' },
  detailList: { borderRadius: 20, padding: 12, marginBottom: 16 },
  detailItem: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', marginBottom: 12 },
  detailLabel: { fontSize: 14, fontWeight: '500', marginLeft: 8, width: 100 },
  detailValue: { fontSize: 14, flexShrink: 1 },
  aboutBlock: { marginBottom: 20 },
  aboutTitle: { fontSize: 18, fontWeight: '700', marginBottom: 6 },
  aboutText: { fontSize: 14, lineHeight: 20 },
  actionTitle: { fontSize: 18, fontWeight: '700', marginBottom: 12, marginTop: 8 },
  actionGrid: { marginBottom: 20 },
  actionRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 12, marginBottom: 12 },
  actionButton: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 12, borderRadius: 16, gap: 4 },
  whatsappButton: { backgroundColor: '#25D366' },
  callButton: { backgroundColor: '#b1c5f1' },
  shareButton: { backgroundColor: '#6366F1' },
  reserveActionButton: { backgroundColor: '#b1c5f1' },
  actionButtonText: { color: '#FFFFFF', fontWeight: '700', fontSize: 14 },
  actionSubText: { color: 'rgba(255,255,255,0.8)', fontSize: 10 },
  messageCarousel: { borderRadius: 30, paddingVertical: 10, paddingHorizontal: 16, marginBottom: 20, alignItems: 'center' },
  messageText: { fontSize: 13, fontStyle: 'italic', textAlign: 'center' },
  similarSection: { marginTop: 8, marginBottom: 20 },
  similarSectionTitle: { fontSize: 20, fontWeight: '700', marginBottom: 12, paddingHorizontal: 16 },
  similarCard: { width: 200, borderRadius: 16, borderWidth: 1, overflow: 'hidden', marginRight: 12 },
  similarImage: { width: '100%', height: 130, resizeMode: 'cover' },
  similarContent: { padding: 10 },
  similarCardTitle: { fontSize: 14, fontWeight: '600', marginBottom: 4 },
  similarCardPrice: { fontSize: 14, fontWeight: '700' },
  similarCardMeta: { fontSize: 11, marginTop: 4 },
  modalOverlay: { flex: 1, justifyContent: 'flex-end' },
  modalContainer: { borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: '80%', padding: 20 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  modalTitle: { fontSize: 18, fontWeight: '700' },
  favItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1 },
  favItemText: { fontSize: 15 },
  emptyFav: { textAlign: 'center', padding: 20 },
});