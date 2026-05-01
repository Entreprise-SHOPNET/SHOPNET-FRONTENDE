


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

export default function ImmobilierDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
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

Je vous contacte suite à une annonce que j’ai consultée sur *SHOPNET IMMOBILIER*.

Le bien a particulièrement retenu mon attention :

🏡 Bien : "${bien.titre}"
💰 Prix : ${bien.prix} ${bien.devise}
📍 Localisation : ${bien.ville}

📸 Voir l’image :
${imageUrl}

Je souhaiterais savoir si ce bien est toujours disponible.

Je suis réellement intéressé(e) et j’aimerais obtenir plus d’informations concernant :
- les conditions (vente/location),
- la disponibilité,
- ainsi que la possibilité d’organiser une visite.

Dans l’attente de votre retour.

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
            <Image source={{ uri: img }} style={[styles.thumbnail, mainImage === img && styles.thumbnailActive]} />
          </TouchableOpacity>
        ))}
      </ScrollView>
    );
  };

  const renderSimilarCard = ({ item }: { item: Bien }) => (
    <TouchableOpacity
      style={styles.similarCard}
      onPress={() => router.push({ pathname: './ImmobilierDetail', params: { id: item.id.toString() } })}
    >
      <Image source={{ uri: item.images?.[0] || 'https://placehold.co/400x250' }} style={styles.similarImage} />
      <View style={styles.similarContent}>
        <Text style={styles.similarCardTitle} numberOfLines={1}>{item.titre}</Text>
        <Text style={styles.similarCardPrice}>{new Intl.NumberFormat().format(item.prix)} {item.devise}</Text>
        <Text style={styles.similarCardMeta}>🏠 {item.superficie || '?'} m² • 🛏️ {item.chambres || 0}</Text>
      </View>
    </TouchableOpacity>
  );

  const renderFavoritesModal = () => (
    <Modal visible={modalVisible} animationType="slide" transparent={true} onRequestClose={() => setModalVisible(false)}>
      <View style={styles.modalOverlay}>
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}><Ionicons name="heart" size={20} color="#FF5A5F" /> Mes favoris</Text>
            <TouchableOpacity onPress={() => setModalVisible(false)}>
              <Ionicons name="close" size={24} color="#333" />
            </TouchableOpacity>
          </View>
          <FlatList
            data={favorites}
            keyExtractor={(item) => item.toString()}
            renderItem={({ item: favId }) => {
              return (
                <TouchableOpacity
                  style={styles.favItem}
                  onPress={() => {
                    setModalVisible(false);
                    router.push({ pathname: './ImmobilierDetail', params: { id: favId.toString() } });
                  }}
                >
                  <Text style={styles.favItemText}>Bien #{favId}</Text>
                  <TouchableOpacity
                    onPress={() => {
                      const newFavs = favorites.filter(f => f !== favId);
                      saveFavorites(newFavs);
                      setModalVisible(false);
                    }}
                  >
                    <Ionicons name="trash-outline" size={20} color="#ef4444" />
                  </TouchableOpacity>
                </TouchableOpacity>
              );
            }}
            ListEmptyComponent={<Text style={styles.emptyFav}>Aucun favori</Text>}
            contentContainerStyle={{ paddingBottom: 20 }}
          />
        </View>
      </View>
    </Modal>
  );

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#104ccf" />
        <Text style={styles.loadingText}>Chargement...</Text>
      </View>
    );
  }

  if (!bien) return null;

  const lieu = [bien.ville, bien.commune, bien.quartier].filter(Boolean).join(', ');
  const priceFormatted = new Intl.NumberFormat().format(bien.prix);
  const typeOffre = bien.type_offre === 'Vente' ? 'achat' : 'mois';

  return (
    <View style={styles.container}>
      {/* Header fixe */}
      <View style={styles.headerFixed}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#1e293b" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Détail du bien</Text>
        <TouchableOpacity style={styles.favHeaderButton} onPress={() => setModalVisible(true)}>
          <Ionicons name="heart-outline" size={22} color="#104ccf" />
          {favorites.length > 0 && <View style={styles.favBadge}><Text style={styles.favBadgeText}>{favorites.length}</Text></View>}
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {/* Galerie */}
        <View style={styles.gallery}>
          <Image source={{ uri: mainImage }} style={styles.mainImage} />
          {renderThumbnails()}
        </View>

        {/* Contenu détail */}
        <View style={styles.content}>
          <View style={styles.titleRow}>
            <Text style={styles.title}>{bien.titre}</Text>
            <TouchableOpacity onPress={toggleFavorite} style={styles.favButton}>
              <Ionicons name={isFavorite(bien.id) ? 'heart' : 'heart-outline'} size={24} color={isFavorite(bien.id) ? '#ef4444' : '#cbd5e1'} />
              <Text style={styles.favButtonText}>{isFavorite(bien.id) ? 'Retirer' : 'Favoris'}</Text>
            </TouchableOpacity>
          </View>
          <Text style={styles.price}>{priceFormatted} {bien.devise} <Text style={styles.priceSmall}>/ {typeOffre}</Text></Text>

          <View style={styles.statsRow}>
            <View style={styles.statItem}><Ionicons name="cart-outline" size={16} color="#104ccf" /><Text style={styles.statText}>{reservations} réservations</Text></View>
            <View style={styles.statItem}><Ionicons name="heart-outline" size={16} color="#104ccf" /><Text style={styles.statText}>{favorites.length} favoris</Text></View>
            <View style={styles.metaBadge}><Text style={styles.metaBadgeText}>{bien.type_bien || 'Bien'} • {bien.type_offre === 'Vente' ? 'Vente' : 'Location'}</Text></View>
          </View>

          <View style={styles.detailList}>
            <View style={styles.detailItem}><Ionicons name="location-outline" size={18} color="#64748b" /><Text style={styles.detailLabel}>Localisation</Text><Text style={styles.detailValue}>{lieu || 'Non spécifié'}</Text></View>
            <View style={styles.detailItem}><Ionicons name="resize-outline" size={18} color="#64748b" /><Text style={styles.detailLabel}>Superficie</Text><Text style={styles.detailValue}>{bien.superficie ? `${bien.superficie} m²` : 'Non spécifiée'}</Text></View>
            <View style={styles.detailItem}><Ionicons name="bed-outline" size={18} color="#64748b" /><Text style={styles.detailLabel}>Chambres</Text><Text style={styles.detailValue}>{bien.chambres || 0}</Text></View>
            <View style={styles.detailItem}><Ionicons name="water-outline" size={18} color="#64748b" /><Text style={styles.detailLabel}>Salles de bain</Text><Text style={styles.detailValue}>{bien.salles_bain || 0}</Text></View>
            <View style={styles.detailItem}><Ionicons name="hash-outline" size={18} color="#64748b" /><Text style={styles.detailLabel}>Référence</Text><Text style={styles.detailValue}>{bien.reference || '---'}</Text></View>
          </View>

          <View style={styles.aboutBlock}>
            <Text style={styles.aboutTitle}>À propos</Text>
            <Text style={styles.aboutText}>{bien.type_bien || 'Bien'} en {bien.type_offre || 'location'} à {bien.ville || 'emplacement idéal'}. {bien.description || ''}</Text>
          </View>

          <Text style={styles.actionTitle}>⚡ Action Rapide</Text>
          <View style={styles.actionGrid}>
            <View style={styles.actionRow}>
              <TouchableOpacity style={[styles.actionButton, styles.whatsappButton]} onPress={handleWhatsApp}>
                <Ionicons name="logo-whatsapp" size={28} color="#fff" />
                <Text style={styles.actionButtonText}>WhatsApp</Text>
                <Text style={styles.actionSubText}>Contact direct</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.actionButton, styles.callButton]} onPress={handleCall}>
                <Ionicons name="call-outline" size={28} color="#fff" />
                <Text style={styles.actionButtonText}>Appeler</Text>
                <Text style={styles.actionSubText}>Posez vos questions</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.actionRow}>
              <TouchableOpacity style={[styles.actionButton, styles.shareButton]} onPress={handleShare}>
                <Ionicons name="share-social-outline" size={28} color="#fff" />
                <Text style={styles.actionButtonText}>Partager</Text>
                <Text style={styles.actionSubText}>Envoyer l'annonce</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.actionButton, styles.reserveActionButton]} onPress={handleReserve}>
                <Ionicons name="calendar-outline" size={28} color="#fff" />
                <Text style={styles.actionButtonText}>Réserver</Text>
                <Text style={styles.actionSubText}>Confirmer l'intérêt</Text>
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.messageCarousel}>
            <Text style={styles.messageText}>{messages[currentMessageIndex]}</Text>
          </View>

          {similarBiens.length > 0 && (
            <View style={styles.similarSection}>
              <Text style={styles.similarSectionTitle}>🏠 Logements similaires</Text>
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
  container: { flex: 1, backgroundColor: '#ffffff' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: 12, fontSize: 14, color: '#64748b' },
  headerFixed: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eef2f6',
    position: 'sticky',
    top: 0,
    zIndex: 10,
  },
  backButton: { padding: 6 },
  headerTitle: { fontSize: 18, fontWeight: '600', color: '#0f172a' },
  favHeaderButton: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#f8fafc', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 30, borderWidth: 1, borderColor: '#e2e8f0' },
  favBadge: { backgroundColor: '#ef4444', borderRadius: 12, minWidth: 18, height: 18, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 4, marginLeft: 4 },
  favBadgeText: { color: '#fff', fontSize: 10, fontWeight: 'bold' },
  scrollContent: { paddingBottom: 30 },
  gallery: { marginBottom: 16 },
  mainImage: { width: width, height: 280, resizeMode: 'cover', backgroundColor: '#f1f5f9' },
  thumbnailsContainer: { flexDirection: 'row', paddingHorizontal: 12, paddingVertical: 8, gap: 8 },
  thumbnail: { width: 70, height: 70, borderRadius: 12, borderWidth: 2, borderColor: 'transparent' },
  thumbnailActive: { borderColor: '#104ccf' },
  content: { paddingHorizontal: 16 },
  titleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  title: { fontSize: 22, fontWeight: '700', color: '#0f172a', flexShrink: 1, marginRight: 12 },
  favButton: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#f8fafc', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 30 },
  favButtonText: { fontSize: 12, color: '#64748b' },
  price: { fontSize: 24, fontWeight: '800', color: '#104ccf', marginBottom: 8 },
  priceSmall: { fontSize: 14, fontWeight: '400', color: '#64748b' },
  statsRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 12, marginBottom: 16 },
  statItem: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#f8fafc', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 20 },
  statText: { fontSize: 12, color: '#334155' },
  metaBadge: { backgroundColor: '#eef2ff', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  metaBadgeText: { fontSize: 12, color: '#104ccf', fontWeight: '500' },
  detailList: { backgroundColor: '#f8fafc', borderRadius: 20, padding: 12, marginBottom: 16 },
  detailItem: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', marginBottom: 12 },
  detailLabel: { fontSize: 14, fontWeight: '500', color: '#334155', marginLeft: 8, width: 100 },
  detailValue: { fontSize: 14, color: '#0f172a', flexShrink: 1 },
  aboutBlock: { marginBottom: 20 },
  aboutTitle: { fontSize: 18, fontWeight: '700', color: '#0f172a', marginBottom: 6 },
  aboutText: { fontSize: 14, color: '#475569', lineHeight: 20 },
  actionTitle: { fontSize: 18, fontWeight: '700', color: '#0f172a', marginBottom: 12, marginTop: 8 },
  actionGrid: { marginBottom: 20 },
  actionRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 12, marginBottom: 12 },
  actionButton: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 12, borderRadius: 16, gap: 4 },
  whatsappButton: { backgroundColor: '#25D366' },
  callButton: { backgroundColor: '#3b82f6' },
  shareButton: { backgroundColor: '#6366f1' },
  reserveActionButton: { backgroundColor: '#104ccf' },
  actionButtonText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  actionSubText: { color: '#ffffffcc', fontSize: 10 },
  messageCarousel: { backgroundColor: '#eef2ff', borderRadius: 30, paddingVertical: 10, paddingHorizontal: 16, marginBottom: 20, alignItems: 'center' },
  messageText: { fontSize: 13, color: '#104ccf', fontStyle: 'italic', textAlign: 'center' },
  similarSection: { marginTop: 8, marginBottom: 20 },
  similarSectionTitle: { fontSize: 20, fontWeight: '700', color: '#0f172a', marginBottom: 12, paddingHorizontal: 16 },
  similarCard: { width: 200, backgroundColor: '#fff', borderRadius: 16, borderWidth: 1, borderColor: '#eef2f6', overflow: 'hidden', marginRight: 12 },
  similarImage: { width: '100%', height: 130, resizeMode: 'cover' },
  similarContent: { padding: 10 },
  similarCardTitle: { fontSize: 14, fontWeight: '600', color: '#0f172a', marginBottom: 4 },
  similarCardPrice: { fontSize: 14, fontWeight: '700', color: '#104ccf' },
  similarCardMeta: { fontSize: 11, color: '#64748b', marginTop: 4 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContainer: { backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: '80%', padding: 20 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  modalTitle: { fontSize: 18, fontWeight: '700', color: '#0f172a' },
  favItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#eef2f6' },
  favItemText: { fontSize: 15, color: '#1e293b' },
  emptyFav: { textAlign: 'center', padding: 20, color: '#94a3b8' },
});