


import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Alert,
  StyleSheet,
  Linking,
  Modal,
  Dimensions,
} from 'react-native';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import { Ionicons, FontAwesome5, MaterialIcons, Feather, Entypo } from '@expo/vector-icons';



// Constant  
const BASE_URL = 'https://shopnet-backend.onrender.com';

// Types
type Product = {
  id: number;
  title: string;
  price: number;
  photo?: string;
};

type UserProfile = {
  id: number;
  fullName: string;
  description?: string;
  phone?: string;
  email?: string;
  website?: string;
  profile_photo?: string | null;
  cover_photo?: string | null;
  date_inscription: string;
  productsCount: number;
  salesCount: number;
  rating: number;
  ordersCount: number;
};

// Constantes
const API_BASE_URL = 'https://shopnet-backend.onrender.com/api';
const { width } = Dimensions.get('window');

export default function ProfilVendeurPremium() {
  // États
  const router = useRouter();
  const [user, setUser] = useState<UserProfile | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [token, setToken] = useState<string | null>(null);
  const [photoModalVisible, setPhotoModalVisible] = useState(false);
  const [photoModalType, setPhotoModalType] = useState<'profile' | 'cover' | null>(null);
  const [uploading, setUploading] = useState(false);
  const [viewingPhoto, setViewingPhoto] = useState(false);

  // Fonctions d'initialisation
  const loadTokenAndUser = useCallback(async () => {
    try {
      const savedToken = await AsyncStorage.getItem('userToken');
      if (!savedToken) {
        router.push('/login');
        return;
      }
      setToken(savedToken);
      await fetchUserProfile(savedToken);
      await fetchProducts(savedToken, 1, true);
    } catch (error) {
      Alert.alert('Erreur', "Impossible de récupérer l'utilisateur.");
    }
  }, [router]);

  useEffect(() => {
    loadTokenAndUser();
  }, [loadTokenAndUser]);

  // Fonctions de récupération de données
  const fetchUserProfile = async (token: string) => {
    try {
      setLoading(true);
      const res = await axios.get(`${API_BASE_URL}/user/profile`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.data.success) {
        setUser(res.data.user);
      }
    } catch (error) {
      Alert.alert('Erreur', 'Erreur lors de la récupération du profil');
    } finally {
      setLoading(false);
    }
  };

  const fetchProducts = async (token: string, pageNumber: number, refresh = false) => {
    try {
      if (refresh) setRefreshing(true);
      else if (pageNumber === 1) setLoading(true);
      else setLoadingMore(true);

      const res = await axios.get(`${API_BASE_URL}/products`, {
        headers: { Authorization: `Bearer ${token}` },
        params: { page: pageNumber, limit: 10 },
      });

      if (res.data.success) {
        setProducts(prev => 
          pageNumber === 1 ? res.data.products : [...prev, ...res.data.products]
        );
        setPage(pageNumber);
      }
    } catch (error) {
      Alert.alert('Erreur', 'Erreur lors du chargement des produits');
    } finally {
      setLoading(false);
      setRefreshing(false);
      setLoadingMore(false);
    }
  };

  // Fonctions de gestion des interactions
  const onRefresh = useCallback(() => {
    if (!token) return;
    fetchUserProfile(token);
    fetchProducts(token, 1, true);
  }, [token]);

  const loadMore = useCallback(() => {
    if (!token || loadingMore || loading) return;
    fetchProducts(token, page + 1);
  }, [token, page, loadingMore, loading]);

  const openLink = useCallback((type: 'phone' | 'email' | 'website', value?: string) => {
    if (!value) {
      Alert.alert('Information manquante', `Aucun ${type} disponible`);
      return;
    }

    let url = '';
    switch (type) {
      case 'phone': url = `tel:${value}`; break;
      case 'email': url = `mailto:${value}`; break;
      case 'website': 
        url = value.startsWith('http') ? value : `https://${value}`;
        break;
    }

    Linking.openURL(url).catch(err => {
      Alert.alert('Erreur', `Impossible d'ouvrir le ${type}`);
    });
  }, []);

  // Fonctions de gestion des photos
  const handlePhotoAction = useCallback((type: 'profile' | 'cover') => {
    setPhotoModalType(type);
    setPhotoModalVisible(true);
  }, []);

  const closePhotoModal = useCallback(() => {
    setPhotoModalVisible(false);
    setPhotoModalType(null);
    setViewingPhoto(false);
  }, []);

  const handleViewPhoto = useCallback(() => {
    if (!photoModalType || !user) return;
    
    const photoUri = photoModalType === 'profile' 
      ? user.profile_photo 
      : user.cover_photo;
    
    if (!photoUri) {
      Alert.alert('Aucune photo', `Aucune photo de ${photoModalType === 'profile' ? 'profil' : 'couverture'} disponible`);
      return;
    }
    
    setViewingPhoto(true);
  }, [photoModalType, user]);

  const handleChoosePhoto = useCallback(async () => {
    if (!token || !photoModalType) return;

    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        throw new Error('Permission refusée pour accéder à la galerie');
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: photoModalType === 'profile' ? [1, 1] : [16, 9],
        quality: 0.7,
      });

      if (result.canceled) return;
      const asset = result.assets[0];
      if (!asset?.uri) throw new Error('Aucune image sélectionnée');

      setUploading(true);

      // Création du FormData pour l'envoi
      const formData = new FormData();
      formData.append(photoModalType === 'profile' ? 'profile_photo' : 'cover_photo', {
        uri: asset.uri,
        name: `photo_${Date.now()}.jpg`,
        type: 'image/jpeg',
      } as any);
      const endpoint =
  photoModalType === 'profile'
    ? `${API_BASE_URL}/user/profile/photo`
    : `${API_BASE_URL}/user/cover/photo`;


    const response = await axios.put(endpoint, formData, {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'multipart/form-data',
      },
    });


      if (response.data.success) {
        await fetchUserProfile(token);
        Alert.alert('Succès', `Photo ${photoModalType === 'profile' ? 'de profil' : 'de couverture'} mise à jour`);
      }
    } catch (error: any) {
      console.error('Erreur upload:', error);
      Alert.alert(
        'Erreur',
        error.response?.data?.message || 
        error.message || 
        "Échec du téléchargement de l'image"
      );
    } finally {
      setUploading(false);
      closePhotoModal();
    }
  }, [token, photoModalType, closePhotoModal, fetchUserProfile]);

  // Fonctions utilitaires
  const formatDateFR = useCallback((dateStr: string) => {
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString('fr-FR', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
    } catch (error) {
      return dateStr;
    }
  }, []);

  const renderProductItem = useCallback((item: Product) => (
    <TouchableOpacity
      key={item.id.toString()}
      style={styles.productCard}
      onPress={() => router.push(`/product/${item.id}`)}
      activeOpacity={0.8}
    >
    <Image
      source={{
        uri: item.photo
          ? `${BASE_URL}${item.photo}`
          : 'https://via.placeholder.com/150'
      }}
        style={styles.productImage}
        resizeMode="cover"
      />
      <View style={styles.productInfoContainer}>
        <Text numberOfLines={2} style={styles.productTitle}>
          {item.title}
        </Text>
        <Text style={styles.productPrice}>{item.price.toFixed(2)} €</Text>
      </View>
    </TouchableOpacity>
  ), [router]);

  // Affichage des états de chargement
  if (!user && loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#4CB050" />
      </View>
    );
  }

  if (!user) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>Impossible de charger le profil</Text>
        <TouchableOpacity 
          style={styles.retryButton} 
          onPress={loadTokenAndUser}
        >
          <Text style={styles.retryButtonText}>Réessayer</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // Rendu principal
  return (
    <View style={styles.mainContainer}>
      <ScrollView
        style={styles.container}
        refreshControl={
          <RefreshControl 
            refreshing={refreshing} 
            onRefresh={onRefresh}
            colors={['#4CB050']}
            tintColor="#4CB050"
          />
        }
        contentContainerStyle={styles.scrollContent}
      >
        {/* Section Photo de couverture */}
        <TouchableOpacity 
          activeOpacity={0.8} 
          onPress={() => handlePhotoAction('cover')}
          style={styles.coverPhotoContainer}
        >
          {user.cover_photo ? (
            <Image
              source={{ uri: `${BASE_URL}${user.cover_photo}` }}
              style={styles.coverPhoto}
            />
          ) : (
            <View style={[styles.coverPhoto, styles.coverPlaceholder]}>
              <Ionicons name="camera" size={40} color="#666" />
            </View>
          )}
          <View style={styles.coverOverlay} />
        </TouchableOpacity>

        {/* Section Profil */}
        <View style={styles.profileSection}>
          <TouchableOpacity 
            activeOpacity={0.8} 
            onPress={() => handlePhotoAction('profile')}
            style={styles.profilePhotoContainer}
          >
            {user.profile_photo ? (
              <Image
                source={{ uri: `${BASE_URL}${user.profile_photo}` }}
                style={styles.profilePhoto}
              />
            ) : (
              <View style={[styles.profilePhoto, styles.profilePlaceholder]}>
                <FontAwesome5 name="user-alt" size={60} color="#aaa" />
              </View>
            )}
          </TouchableOpacity>

          <View style={styles.userInfoContainer}>
            <Text style={styles.userName}>{user.fullName}</Text>
            <Text style={styles.memberSince}>
              Membre depuis {formatDateFR(user.date_inscription)}
            </Text>
            {user.description && (
              <Text style={styles.description}>{user.description}</Text>
            )}
          </View>
        </View>


            {/* Tableau de bord */}
        <View style={styles.dashboardContainer}>
        <Text style={styles.sectionTitle}>Tableau de bord</Text>
        <View style={styles.dashboardGrid}>

            {/* Statistiques */}
            <TouchableOpacity
              style={styles.dashboardCard}
              onPress={() => router.push('/(tabs)/Auth/Profiles/Statistiques')}
            >
              <View style={styles.dashboardIcon}>
                <Feather name="bar-chart" size={24} color="#4CB050" />
              </View>
              <Text style={styles.dashboardText}>Statistiques</Text>
            </TouchableOpacity>

            {/* Commandes */}
            <TouchableOpacity
              style={styles.dashboardCard}
              onPress={() => router.push('/(tabs)/Auth/Panier/VendeurNotifications')}
            >
              <View style={styles.dashboardIcon}>
                <Entypo name="shopping-cart" size={24} color="#4CB050" />
              </View>
              <Text style={styles.dashboardText}>Commandes</Text>
            </TouchableOpacity>

            {/* Messages */}
            <TouchableOpacity
              style={styles.dashboardCard}
              onPress={() => router.push('/MisAjour')}
            >
              <View style={styles.dashboardIcon}>
                <Feather name="message-square" size={24} color="#4CB050" />
              </View>
              <Text style={styles.dashboardText}>Messages</Text>
            </TouchableOpacity>

            {/* Avis */}
            <TouchableOpacity
              style={styles.dashboardCard}
              onPress={() => router.push('/MisAjour')}
            >
              <View style={styles.dashboardIcon}>
                <Ionicons name="star" size={24} color="#4CB050" />
              </View>
              <Text style={styles.dashboardText}>Avis</Text>
            </TouchableOpacity>

          </View>
        </View>

        {/* Statistiques */}
        <View style={styles.statsContainer}>
          {[
            { value: user.productsCount, label: 'Produits' },
            { value: user.salesCount, label: 'Ventes' },
            { value: (Number(user.rating) || 0).toFixed(1), label: 'Note' },
            { value: user.ordersCount, label: 'Commandes' },
          ].map((stat, index) => (
            <View key={index} style={styles.statItem}>
              <Text style={styles.statNumber}>{stat.value}</Text>
              <Text style={styles.statLabel}>{stat.label}</Text>
            </View>
          ))}
        </View>



        {/* Menu Actions */}
      <View style={styles.menuContainer}>
        {/* Ma boutique */}
        <TouchableOpacity
          style={styles.menuItem}
          onPress={() => router.push('/MisAjour')}
        >
          <View style={styles.menuIcon}>
            <MaterialIcons name="store" size={24} color="#4CB050" />
          </View>
          <Text style={styles.menuText}>Ma boutique</Text>
        </TouchableOpacity>

        {/* Ajouter produit */}
        <TouchableOpacity
          style={styles.menuItem}
          onPress={() => router.push('/(tabs)/Auth/Produits/Produit')}
        >
          <View style={styles.menuIcon}>
            <Ionicons name="add-circle" size={24} color="#4CB050" />
          </View>
          <Text style={styles.menuText}>Ajouter produit</Text>
        </TouchableOpacity>

        {/* Promotions */}
        <TouchableOpacity
          style={styles.menuItem}
          onPress={() => router.push('/MisAjour')}
        >
          <View style={styles.menuIcon}>
            <MaterialIcons name="local-offer" size={24} color="#4CB050" />
          </View>
          <Text style={styles.menuText}>Promotions</Text>
        </TouchableOpacity>

        {/* Paramètres */}
        <TouchableOpacity
          style={styles.menuItem}
          onPress={() => router.push('/Auth/Produits/parametre')}
        >
          <View style={styles.menuIcon}>
            <Ionicons name="settings" size={24} color="#4CB050" />
          </View>
          <Text style={styles.menuText}>Paramètres</Text>
        </TouchableOpacity>
      </View>


        {/* Section Contacts */}
        <View style={styles.contactSection}>
          <Text style={styles.sectionTitle}>Coordonnées</Text>
          {[
            { type: 'phone', value: user.phone, icon: 'call' },
            { type: 'email', value: user.email, icon: 'mail' },
            { type: 'website', value: user.website, icon: 'globe' },
          ].map((contact, index) => (
            contact.value && (
              <TouchableOpacity 
                key={index}
                style={styles.contactItem}
                onPress={() => openLink(contact.type as any, contact.value)}
              >
                <View style={styles.contactIcon}>
                  <Ionicons name={contact.icon} size={20} color="#4CB050" />
                </View>
                <Text style={styles.contactText}>
                  {contact.type === 'website' 
                    ? contact.value.replace(/^https?:\/\//, '')
                    : contact.value}
                </Text>
              </TouchableOpacity>
            )
          ))}
        </View>

        {/* Section Produits */}
        <View style={styles.productsSection}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Produits en vente</Text>
            <TouchableOpacity onPress={() => router.push('/MisAjour')}>
              <Text style={styles.seeAll}>Voir tout</Text>
            </TouchableOpacity>
          </View>
          
          {loading && page === 1 ? (
            <ActivityIndicator size="large" color="#4CB050" style={styles.loader} />
          ) : (
            <View style={styles.productsGrid}>
              {products.length > 0 ? (
                <>
                  {[0, 2].map((startIdx) => (
                    products.slice(startIdx, startIdx + 2).length > 0 && (
                      <View key={startIdx} style={styles.productRow}>
                        {products.slice(startIdx, startIdx + 2).map(renderProductItem)}
                      </View>
                    )
                  ))}
                  {loadingMore && (
                    <ActivityIndicator color="#4CB050" style={styles.loader} />
                  )}
                </>
              ) : (
                <Text style={styles.emptyText}>Aucun produit trouvé</Text>
              )}
            </View>
          )}
        </View>
      </ScrollView>

      {/* Modals */}
      <PhotoModal
        visible={photoModalVisible && !viewingPhoto}
        type={photoModalType}
        hasPhoto={!!user?.[photoModalType === 'profile' ? 'profile_photo' : 'cover_photo']}
        uploading={uploading}
        onView={handleViewPhoto}
        onChoose={handleChoosePhoto}
        onClose={closePhotoModal}
      />

      <FullscreenPhotoModal
        visible={viewingPhoto}
        photoUri={
          photoModalType === 'profile' 
            ? user.profile_photo 
            : photoModalType === 'cover'
              ? user.cover_photo
              : null
        }
        onClose={closePhotoModal}
      />
    </View>
  );
}

// Composants modaux séparés pour plus de clarté
const PhotoModal = ({
  visible,
  type,
  hasPhoto,
  uploading,
  onView,
  onChoose,
  onClose,
}: {
  visible: boolean;
  type: 'profile' | 'cover' | null;
  hasPhoto: boolean;
  uploading: boolean;
  onView: () => void;
  onChoose: () => void;
  onClose: () => void;
}) => (
  <Modal
    visible={visible}
    transparent
    animationType="fade"
    onRequestClose={onClose}
  >
    <View style={styles.modalOverlay}>
      <View style={styles.modalContent}>
        <Text style={styles.modalTitle}>
          {type === 'profile' ? 'Photo de profil' : 'Photo de couverture'}
        </Text>

        <TouchableOpacity
          style={styles.modalBtn}
          onPress={onView}
          disabled={uploading || !hasPhoto}
        >
          <Text style={styles.modalBtnText}>Voir la photo</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.modalBtn}
          onPress={onChoose}
          disabled={uploading}
        >
          {uploading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.modalBtnText}>Choisir une photo</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.modalBtn, styles.cancelBtn]}
          onPress={onClose}
          disabled={uploading}
        >
          <Text style={styles.modalBtnText}>Annuler</Text>
        </TouchableOpacity>
      </View>
    </View>
  </Modal>
);

const FullscreenPhotoModal = ({
  visible,
  photoUri,
  onClose,
}: {
  visible: boolean;
  photoUri: string | null | undefined;
  onClose: () => void;
}) => (
  <Modal
    visible={visible}
    transparent={false}
    animationType="fade"
    onRequestClose={onClose}
  >
    <View style={styles.fullscreenPhotoContainer}>
      <TouchableOpacity 
        style={styles.closePhotoButton}
        onPress={onClose}
      >
        <Ionicons name="close" size={30} color="#fff" />
      </TouchableOpacity>
      
      {photoUri && (
        <Image
          source={{ uri: `http://100.64.134.89:5000${photoUri}` }}
          style={styles.fullscreenPhoto}
          resizeMode={photoUri.includes('cover') ? 'cover' : 'contain'}
        />
      )}
    </View>
  </Modal>
);

// Styles
const styles = StyleSheet.create({
  mainContainer: {
    flex: 1,
    backgroundColor: '#202A36',
  },
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 30,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#202A36',
    padding: 20,
  },
  errorText: {
    color: '#fff',
    fontSize: 18,
    marginBottom: 20,
    textAlign: 'center',
  },
  retryButton: {
    backgroundColor: '#4CB050',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 6,
    elevation: 2,
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '500',
  },
  coverPhotoContainer: {
    height: 200,
    backgroundColor: '#2C3A4A',
    position: 'relative',
  },
  coverPhoto: {
    width: '100%',
    height: '100%',
  },
  coverOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  coverPlaceholder: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#2C3A4A',
  },
  profileSection: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingHorizontal: 16,
    marginTop: -70,
    marginBottom: 16,
  },
  profilePhotoContainer: {
    width: 140,
    height: 140,
    borderRadius: 70,
    borderWidth: 4,
    borderColor: '#202A36',
    backgroundColor: '#2C3A4A',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 5,
  },
  profilePhoto: {
    width: '100%',
    height: '100%',
    borderRadius: 70,
  },
  profilePlaceholder: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#2C3A4A',
  },
  userInfoContainer: {
    flex: 1,
    marginLeft: 20,
    marginTop: 30,
  },
  userName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 6,
  },
  memberSince: {
    fontSize: 14,
    color: '#A0AEC0',
    marginBottom: 10,
  },
  description: {
    fontSize: 15,
    color: '#E2E8F0',
    lineHeight: 22,
  },
  dashboardContainer: {
    marginHorizontal: 16,
    marginBottom: 24,
  },
  dashboardGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginTop: 12,
  },
  dashboardCard: {
    width: '48%',
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
    backgroundColor: '#2D374850',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  dashboardText: {
    color: '#E2E8F0',
    fontSize: 15,
    fontWeight: '500',
    textAlign: 'center',
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginHorizontal: 16,
    marginBottom: 24,
    paddingVertical: 16,
    backgroundColor: '#2C3A4A',
    borderRadius: 10,
    paddingHorizontal: 20,
    elevation: 2,
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statNumber: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#4CB050',
    marginBottom: 6,
  },
  statLabel: {
    fontSize: 14,
    color: '#A0AEC0',
  },
  menuContainer: {
    marginHorizontal: 16,
    marginBottom: 24,
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  menuItem: {
    width: '48%',
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 12,
    marginBottom: 12,
    borderRadius: 8,
    backgroundColor: '#2C3A4A',
    elevation: 2,
  },
  menuIcon: {
    marginRight: 12,
  },
  menuText: {
    fontSize: 16,
    color: '#E2E8F0',
    fontWeight: '500',
  },
  contactSection: {
    marginHorizontal: 16,
    marginBottom: 24,
    backgroundColor: '#2C3A4A',
    borderRadius: 10,
    padding: 16,
    elevation: 2,
  },
  contactItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderColor: '#3A4A5A',
  },
  contactIcon: {
    marginRight: 12,
  },
  contactText: {
    fontSize: 16,
    color: '#E2E8F0',
  },
  productsSection: {
    marginHorizontal: 16,
    marginBottom: 24,
    backgroundColor: '#2C3A4A',
    borderRadius: 10,
    padding: 16,
    elevation: 2,
  },
  productsGrid: {
    minHeight: 200,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
  },
  seeAll: {
    color: '#4CB050',
    fontSize: 14,
    fontWeight: '500',
  },
  productRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  productCard: {
    width: '48%',
    backgroundColor: '#3A4A5A',
    borderRadius: 8,
    overflow: 'hidden',
    elevation: 2,
  },
  productImage: {
    width: '100%',
    height: 150,
    backgroundColor: '#2C3A4A',
  },
  productInfoContainer: {
    padding: 12,
  },
  productTitle: {
    color: '#E2E8F0',
    fontSize: 14,
    marginBottom: 8,
    height: 40,
  },
  productPrice: {
    color: '#4CB050',
    fontSize: 16,
    fontWeight: 'bold',
  },
  emptyText: {
    color: '#A0AEC0',
    textAlign: 'center',
    marginTop: 20,
    fontSize: 16,
  },
  loader: {
    marginVertical: 20,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.7)',
  },
  modalContent: {
    backgroundColor: '#2C3A4A',
    borderRadius: 12,
    padding: 24,
    width: '85%',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 24,
    textAlign: 'center',
  },
  modalBtn: {
    backgroundColor: '#4CB050',
    padding: 14,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 12,
    elevation: 2,
  },
  cancelBtn: {
    backgroundColor: '#3A4A5A',
  },
  modalBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  fullscreenPhotoContainer: {
    flex: 1,
    backgroundColor: 'black',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  fullscreenPhoto: {
    width: '100%',
    height: '100%',
  },
  closePhotoButton: {
    position: 'absolute',
    top: 40,
    right: 20,
    zIndex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 20,
    padding: 5,
  },
});