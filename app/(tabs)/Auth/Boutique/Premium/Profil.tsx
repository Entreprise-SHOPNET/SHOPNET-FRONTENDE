


// app/(tabs)/boutique/[id]/index.tsx - ÉCRAN BOUTIQUE PREMIUM COMPLET
// app/(tabs)/boutique/[id]/index.tsx - ÉCRAN BOUTIQUE PREMIUM COMPLET
import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  ScrollView,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Alert,
  Modal,
  TextInput,
  Platform,
  Animated,
  RefreshControl,
  Linking,
  Dimensions,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter, useLocalSearchParams } from 'expo-router';
import {
  MaterialIcons,
  Ionicons,
  FontAwesome5,
  Feather,
  Entypo,
  FontAwesome,
  AntDesign,
} from '@expo/vector-icons';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const SHOPNET_BLUE = "#00182A";
const PREMIUM_GOLD = "#FFA726";
const VALID_GREEN = "#4DB14E";
const PENDING_BLUE = "#42A5F5";
const DANGER_RED = "#F44336";
const PURPLE = "#9C27B0";
const LIGHT_BLUE = "#E3F2FD";


// 🔹 Utiliser le serveur Render en production
const LOCAL_API = "https://shopnet-backend.onrender.com/api";

// 🔹 Serveur local pour développement (commenté)
// const LOCAL_API = "http://100.64.134.89:5000/api";


// Types correspondant à votre backend
interface UserInfo {
  id: number;
  nom: string;
  postnom: string;
  prenom: string;
  email: string;
  numero: string;
  adresse: string;
  ville: string;
  pays: string;
  codePostal: string;
}

interface BoutiqueInfo {
  id: number;
  nom: string;
  type: string;
  type_boutique: string;
  categorie: string;
  description: string;
  logo: string;
  email: string;
  phone: string;
  adresse: string;
  ville: string;
  pays: string;
  codePostal?: string;
  statut: 'pending_payment' | 'pending_validation' | 'validé' | 'active';
  prix: number;
  devise: string;
  date_creation: string;
  date_expiration?: string;
  jours_restants?: number;
  proprietaire: {
    nom: string;
    email: string;
    phone: string;
  };
}

interface StatsInfo {
  totalCommandes: number;
  totalRevenu: number;
  totalVues: string;
}

export default function BoutiqueDetailScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const boutiqueId = params.id as string;
  
  console.log('Params received:', params);
  console.log('Boutique ID from params:', boutiqueId);
  
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [boutique, setBoutique] = useState<BoutiqueInfo | null>(null);
  const [userInfo, setUserInfo] = useState<UserInfo | null>(null);
  const [stats, setStats] = useState<StatsInfo | null>(null);
  const [activeTab, setActiveTab] = useState<'infos' | 'proprietaire' | 'statistiques'>('infos');
  const [isEditingUser, setIsEditingUser] = useState(false);
  const [showEditBoutiqueModal, setShowEditBoutiqueModal] = useState(false);
  const [showStatsModal, setShowStatsModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // États pour l'édition des infos utilisateur
  const [editUserData, setEditUserData] = useState({
    nom: '',
    email: '',
    numero: '',
    adresse: '',
    ville: '',
  });

  // États pour l'édition de la boutique
  const [editBoutiqueData, setEditBoutiqueData] = useState({
    nom: '',
    description: '',
    email: '',
    phone: '',
    adresse: '',
    ville: '',
    pays: '',
    codePostal: '',
  });

  // Animations
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  const scaleAnim = useRef(new Animated.Value(0.9)).current;
  const scrollViewRef = useRef<ScrollView>(null);

  useEffect(() => {
    if (!boutiqueId) {
      console.error('No boutique ID found in params');
      setError('Identifiant de boutique manquant');
      setLoading(false);
      return;
    }

    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 8,
        tension: 40,
        useNativeDriver: true,
      }),
    ]).start();
    fetchBoutiqueData();
  }, [boutiqueId]);

  const fetchBoutiqueData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const token = await AsyncStorage.getItem('userToken');
      
      if (!token) {
        router.push('/splash');
        return;
      }

      if (!boutiqueId || boutiqueId === 'undefined') {
        console.error('Invalid boutique ID:', boutiqueId);
        setError('Identifiant de boutique invalide');
        setLoading(false);
        return;
      }

      console.log('Fetching boutique data for ID:', boutiqueId);

      // 1. Récupérer les détails de la boutique PREMIUM
      const boutiqueRes = await fetch(`${LOCAL_API}/boutique/premium/${boutiqueId}`, {
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
      });

      console.log('Boutique response status:', boutiqueRes.status);
      
      if (boutiqueRes.ok) {
        const boutiqueData = await boutiqueRes.json();
        console.log('Boutique data received:', JSON.stringify(boutiqueData, null, 2));
        
        if (boutiqueData.success && boutiqueData.boutique) {
          setBoutique(boutiqueData.boutique);
          setEditBoutiqueData({
            nom: boutiqueData.boutique.nom || '',
            description: boutiqueData.boutique.description || '',
            email: boutiqueData.boutique.email || '',
            phone: boutiqueData.boutique.phone || '',
            adresse: boutiqueData.boutique.adresse || '',
            ville: boutiqueData.boutique.ville || '',
            pays: boutiqueData.boutique.pays || '',
            codePostal: boutiqueData.boutique.codePostal || '',
          });
        } else {
          console.error('Boutique data not found:', boutiqueData);
          setError('Boutique non trouvée');
        }
      } else {
        const errorData = await boutiqueRes.json();
        console.error('Boutique fetch error:', errorData);
        setError(errorData.message || 'Erreur lors du chargement de la boutique');
      }

      // 2. Récupérer les informations utilisateur (PROPRIÉTAIRE) pour boutique PREMIUM
      if (boutiqueId && boutiqueId !== 'undefined') {
        const userRes = await fetch(`${LOCAL_API}/boutique/premium/${boutiqueId}/user`, {
          headers: { 
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
        });

        console.log('User response status:', userRes.status);
        
        if (userRes.ok) {
          const userData = await userRes.json();
          console.log('User data received:', JSON.stringify(userData, null, 2));
          
          if (userData.success && userData.user) {
            const userProfile = userData.user;
            setUserInfo(userProfile);
            
            // Remplir les données d'édition selon votre backend corrigé
            setEditUserData({
              nom: userProfile.nom || '',
              email: userProfile.email || '',
              numero: userProfile.numero || '',
              adresse: userProfile.adresse || '',
              ville: userProfile.ville || '',
            });
          } else {
            console.error('User data not found:', userData);
          }
        } else {
          const errorData = await userRes.json();
          console.error('User fetch error:', errorData);
        }
      }

      // 3. Récupérer les statistiques (si disponible)
      if (boutiqueId && boutiqueId !== 'undefined') {
        try {
          const statsRes = await fetch(`${LOCAL_API}/boutique/premium/${boutiqueId}/stats`, {
            headers: { 
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            },
          });

          console.log('Stats response status:', statsRes.status);
          
          if (statsRes.ok) {
            const statsData = await statsRes.json();
            console.log('Stats data:', statsData);
            
            if (statsData.success) {
              setStats(statsData);
            }
          }
        } catch (statsError) {
          console.log('Stats endpoint not available, using default values');
          // Valeurs par défaut pour les stats
          setStats({
            totalCommandes: 0,
            totalRevenu: 0,
            totalVues: '0',
          });
        }
      }

    } catch (error) {
      console.error('Erreur chargement données boutique:', error);
      setError('Impossible de charger les données de la boutique');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchBoutiqueData();
  };

  const validateUserForm = () => {
    if (!editUserData.nom.trim()) {
      Alert.alert('Erreur', 'Le nom complet est requis');
      return false;
    }

    if (!editUserData.email.trim()) {
      Alert.alert('Erreur', 'L\'email est requis');
      return false;
    }

    if (!editUserData.numero.trim()) {
      Alert.alert('Erreur', 'Le numéro de téléphone est requis');
      return false;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(editUserData.email)) {
      Alert.alert('Erreur', 'Veuillez entrer un email valide');
      return false;
    }

    return true;
  };

  const handleSaveUserInfo = async () => {
    if (!validateUserForm()) {
      return;
    }

    try {
      setSaving(true);
      const token = await AsyncStorage.getItem('userToken');
      if (!token) {
        router.push('/splash');
        return;
      }

      console.log('Saving user info with data:', editUserData);

      const response = await fetch(`${LOCAL_API}/boutique/premium/${boutiqueId}/user/update`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(editUserData),
      });

      console.log('Save user response status:', response.status);
      
      if (response.ok) {
        const result = await response.json();
        console.log('Save user response:', result);
        
        if (result.success) {
          // Mettre à jour les informations utilisateur selon le format de réponse
          setUserInfo(prev => prev ? {
            ...prev,
            nom: result.user.nom || editUserData.nom,
            email: result.user.email || editUserData.email,
            numero: result.user.numero || editUserData.numero,
            adresse: result.user.adresse || editUserData.adresse,
            ville: result.user.ville || editUserData.ville,
          } : null);
          
          setIsEditingUser(false);
          Alert.alert('Succès', 'Informations mises à jour avec succès');
        } else {
          Alert.alert('Erreur', result.message || 'Erreur lors de la mise à jour');
        }
      } else {
        const errorData = await response.json();
        Alert.alert('Erreur', errorData.message || 'Erreur lors de la mise à jour');
      }
    } catch (error) {
      console.error('Erreur mise à jour infos utilisateur:', error);
      Alert.alert('Erreur', 'Impossible de mettre à jour les informations');
    } finally {
      setSaving(false);
    }
  };

  const validateBoutiqueForm = () => {
    if (!editBoutiqueData.nom.trim()) {
      Alert.alert('Erreur', 'Le nom de la boutique est requis');
      return false;
    }

    if (!editBoutiqueData.description.trim()) {
      Alert.alert('Erreur', 'La description est requise');
      return false;
    }

    if (!editBoutiqueData.email.trim()) {
      Alert.alert('Erreur', 'L\'email de contact est requis');
      return false;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(editBoutiqueData.email)) {
      Alert.alert('Erreur', 'Veuillez entrer un email valide');
      return false;
    }

    if (!editBoutiqueData.phone.trim()) {
      Alert.alert('Erreur', 'Le téléphone est requis');
      return false;
    }

    return true;
  };

  const handleSaveBoutiqueInfo = async () => {
    if (!validateBoutiqueForm()) {
      return;
    }

    try {
      setSaving(true);
      const token = await AsyncStorage.getItem('userToken');
      if (!token) {
        router.push('/splash');
        return;
      }

      const response = await fetch(`${LOCAL_API}/boutique/premium/${boutiqueId}/update`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(editBoutiqueData),
      });

      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          setBoutique(prev => prev ? { 
            ...prev, 
            ...result.boutique,
            nom: editBoutiqueData.nom,
            description: editBoutiqueData.description,
            email: editBoutiqueData.email,
            phone: editBoutiqueData.phone,
            adresse: editBoutiqueData.adresse,
            ville: editBoutiqueData.ville,
            pays: editBoutiqueData.pays,
            codePostal: editBoutiqueData.codePostal,
          } : null);
          setShowEditBoutiqueModal(false);
          Alert.alert('Succès', 'Boutique mise à jour avec succès');
        } else {
          Alert.alert('Erreur', result.message || 'Erreur lors de la mise à jour');
        }
      } else {
        const errorData = await response.json();
        Alert.alert('Erreur', errorData.message || 'Erreur lors de la mise à jour');
      }
    } catch (error) {
      console.error('Erreur mise à jour boutique:', error);
      Alert.alert('Erreur', 'Impossible de mettre à jour la boutique');
    } finally {
      setSaving(false);
    }
  };

  const handleCallPhone = (phoneNumber: string) => {
    Linking.openURL(`tel:${phoneNumber}`);
  };

  const handleSendEmail = (email: string) => {
    Linking.openURL(`mailto:${email}?subject=Contact%20Boutique%20ShopNet`);
  };

  const handleOpenMaps = (adresse: string, ville: string, pays: string) => {
    const address = encodeURIComponent(`${adresse}, ${ville}, ${pays}`);
    const url = Platform.select({
      ios: `maps:0,0?q=${address}`,
      android: `geo:0,0?q=${address}`,
    });
    if (url) Linking.openURL(url);
  };

  const handleOpenWhatsApp = (phoneNumber: string) => {
    const formattedNumber = phoneNumber.replace(/\D/g, '');
    Linking.openURL(`https://wa.me/${formattedNumber}`);
  };

  const renderHeader = () => (
    <Animated.View 
      style={[
        styles.header,
        { 
          opacity: fadeAnim,
          transform: [
            { translateY: slideAnim },
            { scale: scaleAnim }
          ]
        }
      ]}
    >
      <View style={styles.headerTop}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        
        <View style={styles.headerTitleContainer}>
          <Text style={styles.headerTitle}>Ma Boutique</Text>
          {boutique && (
            <Text style={styles.headerSubtitle}>Premium • {boutique.categorie}</Text>
          )}
        </View>
        
        <View style={styles.headerActions}>
          <TouchableOpacity 
            style={styles.headerActionButton}
            onPress={() => setShowStatsModal(true)}
          >
            <MaterialIcons name="analytics" size={22} color="#fff" />
          </TouchableOpacity>
        </View>
      </View>
      
      {boutique && (
        <Animated.View 
          style={[
            styles.boutiqueHeader,
            { opacity: fadeAnim }
          ]}
        >
          <View style={styles.boutiqueLogoContainer}>
            {boutique.logo ? (
              <Image source={{ uri: boutique.logo }} style={styles.boutiqueLogo} />
            ) : (
              <View style={styles.boutiqueLogoPlaceholder}>
                <FontAwesome5 name="store" size={28} color={PREMIUM_GOLD} />
              </View>
            )}
            
            <View style={styles.boutiqueTitleContainer}>
              <Text style={styles.boutiqueName} numberOfLines={1}>{boutique.nom}</Text>
              <View style={styles.boutiqueMeta}>
                <View style={[
                  styles.statusBadge,
                  boutique.statut === 'validé' || boutique.statut === 'active' ? styles.statusValid :
                  boutique.statut === 'pending_validation' ? styles.statusPending :
                  styles.statusPayment
                ]}>
                  <Text style={styles.statusText}>
                    {boutique.statut === 'validé' || boutique.statut === 'active' ? '🟢 Active' : 
                     boutique.statut === 'pending_validation' ? '🟡 En validation' : '🔴 Paiement en attente'}
                  </Text>
                </View>
                
                <View style={styles.premiumBadge}>
                  <MaterialIcons name="star" size={12} color={PREMIUM_GOLD} />
                  <Text style={styles.premiumText}>PREMIUM</Text>
                </View>
              </View>
            </View>
          </View>
          
          <View style={styles.boutiqueQuickInfo}>
            <View style={styles.quickInfoItem}>
              <MaterialIcons name="calendar-today" size={14} color="rgba(255,255,255,0.7)" />
              <Text style={styles.quickInfoText}>
                Depuis {new Date(boutique.date_creation).toLocaleDateString('fr-FR', { month: 'short', year: 'numeric' })}
              </Text>
            </View>
            
            {boutique.jours_restants !== undefined && boutique.jours_restants > 0 && (
              <View style={styles.quickInfoItem}>
                <MaterialIcons name="event" size={14} color="rgba(255,255,255,0.7)" />
                <Text style={styles.quickInfoText}>
                  {boutique.jours_restants} jours restants
                </Text>
              </View>
            )}
          </View>
        </Animated.View>
      )}
    </Animated.View>
  );

  const renderTabs = () => (
    <Animated.View 
      style={[
        styles.tabsContainer,
        { opacity: fadeAnim }
      ]}
    >
      <View style={styles.tabsWrapper}>
        <TouchableOpacity
          style={[styles.tabButton, activeTab === 'infos' && styles.tabButtonActive]}
          onPress={() => setActiveTab('infos')}
        >
          <MaterialIcons 
            name="store" 
            size={22} 
            color={activeTab === 'infos' ? PREMIUM_GOLD : 'rgba(255,255,255,0.6)'} 
          />
          <Text style={[styles.tabText, activeTab === 'infos' && styles.tabTextActive]}>
            Informations
          </Text>
          {activeTab === 'infos' && <View style={styles.tabIndicator} />}
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.tabButton, activeTab === 'proprietaire' && styles.tabButtonActive]}
          onPress={() => setActiveTab('proprietaire')}
        >
          <MaterialIcons 
            name="person" 
            size={22} 
            color={activeTab === 'proprietaire' ? PREMIUM_GOLD : 'rgba(255,255,255,0.6)'} 
          />
          <Text style={[styles.tabText, activeTab === 'proprietaire' && styles.tabTextActive]}>
            Propriétaire
          </Text>
          {activeTab === 'proprietaire' && <View style={styles.tabIndicator} />}
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.tabButton, activeTab === 'statistiques' && styles.tabButtonActive]}
          onPress={() => setActiveTab('statistiques')}
        >
          <MaterialIcons 
            name="trending-up" 
            size={22} 
            color={activeTab === 'statistiques' ? PREMIUM_GOLD : 'rgba(255,255,255,0.6)'} 
          />
          <Text style={[styles.tabText, activeTab === 'statistiques' && styles.tabTextActive]}>
            Statistiques
          </Text>
          {activeTab === 'statistiques' && <View style={styles.tabIndicator} />}
        </TouchableOpacity>
      </View>
    </Animated.View>
  );

  const renderBoutiqueInfo = () => {
    if (!boutique) return null;

    return (
      <Animated.View 
        style={[
          styles.tabContent,
          { opacity: fadeAnim }
        ]}
      >
        <ScrollView 
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          {/* Carte Description */}
          <View style={styles.infoCard}>
            <View style={styles.infoCardHeader}>
              <View style={styles.infoCardTitleContainer}>
                <MaterialIcons name="description" size={20} color={PREMIUM_GOLD} />
                <Text style={styles.infoCardTitle}>Description</Text>
              </View>
              <TouchableOpacity 
                style={styles.editButton}
                onPress={() => setShowEditBoutiqueModal(true)}
              >
                <MaterialIcons name="edit" size={18} color={PENDING_BLUE} />
                <Text style={styles.editButtonText}>Modifier</Text>
              </TouchableOpacity>
            </View>
            
            <Text style={styles.descriptionText}>{boutique.description}</Text>
            
            <View style={styles.infoGrid}>
              <View style={styles.infoItem}>
                <View style={[styles.infoIcon, { backgroundColor: `${PURPLE}15` }]}>
                  <MaterialIcons name="category" size={18} color={PURPLE} />
                </View>
                <View style={styles.infoContent}>
                  <Text style={styles.infoLabel}>Type</Text>
                  <Text style={styles.infoValue}>{boutique.type_boutique}</Text>
                </View>
              </View>
              
              <View style={styles.infoItem}>
                <View style={[styles.infoIcon, { backgroundColor: `${VALID_GREEN}15` }]}>
                  <MaterialIcons name="local-offer" size={18} color={VALID_GREEN} />
                </View>
                <View style={styles.infoContent}>
                  <Text style={styles.infoLabel}>Abonnement</Text>
                  <Text style={styles.infoValue}>
                    {boutique.prix} {boutique.devise}/mois
                  </Text>
                </View>
              </View>
              
              <View style={styles.infoItem}>
                <View style={[styles.infoIcon, { backgroundColor: `${PENDING_BLUE}15` }]}>
                  <MaterialIcons name="calendar-today" size={18} color={PENDING_BLUE} />
                </View>
                <View style={styles.infoContent}>
                  <Text style={styles.infoLabel}>Créée le</Text>
                  <Text style={styles.infoValue}>
                    {new Date(boutique.date_creation).toLocaleDateString('fr-FR', { 
                      day: 'numeric', 
                      month: 'long', 
                      year: 'numeric' 
                    })}
                  </Text>
                </View>
              </View>
              
              {boutique.date_expiration && (
                <View style={styles.infoItem}>
                  <View style={[styles.infoIcon, { backgroundColor: `${DANGER_RED}15` }]}>
                    <MaterialIcons name="event" size={18} color={DANGER_RED} />
                  </View>
                  <View style={styles.infoContent}>
                    <Text style={styles.infoLabel}>Expire le</Text>
                    <Text style={styles.infoValue}>
                      {new Date(boutique.date_expiration).toLocaleDateString('fr-FR', { 
                        day: 'numeric', 
                        month: 'short', 
                        year: 'numeric' 
                      })}
                    </Text>
                  </View>
                </View>
              )}
            </View>
          </View>

          {/* Carte Contact */}
          <View style={styles.infoCard}>
            <View style={styles.infoCardHeader}>
              <View style={styles.infoCardTitleContainer}>
                <MaterialIcons name="contact-phone" size={20} color={PENDING_BLUE} />
                <Text style={styles.infoCardTitle}>Coordonnées</Text>
              </View>
            </View>
            
            <View style={styles.contactGrid}>
              <TouchableOpacity 
                style={styles.contactButton}
                onPress={() => handleSendEmail(boutique.email)}
              >
                <View style={[styles.contactIcon, { backgroundColor: `${PENDING_BLUE}15` }]}>
                  <MaterialIcons name="email" size={22} color={PENDING_BLUE} />
                </View>
                <View style={styles.contactContent}>
                  <Text style={styles.contactLabel}>Email</Text>
                  <Text style={styles.contactValue}>{boutique.email}</Text>
                </View>
                <MaterialIcons name="chevron-right" size={20} color="rgba(255,255,255,0.3)" />
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={styles.contactButton}
                onPress={() => handleCallPhone(boutique.phone)}
              >
                <View style={[styles.contactIcon, { backgroundColor: `${VALID_GREEN}15` }]}>
                  <MaterialIcons name="phone" size={22} color={VALID_GREEN} />
                </View>
                <View style={styles.contactContent}>
                  <Text style={styles.contactLabel}>Téléphone</Text>
                  <Text style={styles.contactValue}>{boutique.phone}</Text>
                </View>
                <MaterialIcons name="chevron-right" size={20} color="rgba(255,255,255,0.3)" />
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={styles.contactButton}
                onPress={() => handleOpenWhatsApp(boutique.phone)}
              >
                <View style={[styles.contactIcon, { backgroundColor: `${VALID_GREEN}15` }]}>
                  <FontAwesome5 name="whatsapp" size={20} color={VALID_GREEN} />
                </View>
                <View style={styles.contactContent}>
                  <Text style={styles.contactLabel}>WhatsApp</Text>
                  <Text style={styles.contactValue}>Envoyer un message</Text>
                </View>
                <MaterialIcons name="chevron-right" size={20} color="rgba(255,255,255,0.3)" />
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={styles.contactButton}
                onPress={() => handleOpenMaps(boutique.adresse, boutique.ville, boutique.pays)}
              >
                <View style={[styles.contactIcon, { backgroundColor: `${DANGER_RED}15` }]}>
                  <MaterialIcons name="location-on" size={22} color={DANGER_RED} />
                </View>
                <View style={styles.contactContent}>
                  <Text style={styles.contactLabel}>Adresse</Text>
                  <Text style={styles.contactValue}>
                    {boutique.adresse}, {boutique.ville}
                  </Text>
                </View>
                <MaterialIcons name="chevron-right" size={20} color="rgba(255,255,255,0.3)" />
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </Animated.View>
    );
  };

  const renderProprietaireInfo = () => {
    if (!userInfo || !boutique) return null;

    const fullName = userInfo.nom || boutique.proprietaire?.nom || 'Propriétaire';

    if (isEditingUser) {
      return (
        <Animated.View 
          style={[
            styles.tabContent,
            { opacity: fadeAnim }
          ]}
        >
          <ScrollView 
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.scrollContent}
          >
            <View style={styles.editFormCard}>
              <View style={styles.editFormHeader}>
                <View style={styles.editFormTitleContainer}>
                  <MaterialIcons name="edit" size={22} color={PREMIUM_GOLD} />
                  <Text style={styles.editFormTitle}>Modifier les informations</Text>
                </View>
                <TouchableOpacity 
                  style={styles.closeButton}
                  onPress={() => setIsEditingUser(false)}
                >
                  <MaterialIcons name="close" size={20} color={DANGER_RED} />
                </TouchableOpacity>
              </View>
              
              <View style={styles.formContainer}>
                <View style={styles.formSection}>
                  <Text style={styles.formSectionTitle}>Informations personnelles</Text>
                  
                  <View style={styles.formGroup}>
                    <Text style={styles.formLabel}>
                      Nom complet <Text style={styles.required}>*</Text>
                    </Text>
                    <TextInput
                      style={styles.formInput}
                      value={editUserData.nom}
                      onChangeText={(text) => setEditUserData({ ...editUserData, nom: text })}
                      placeholder="Votre nom complet"
                      placeholderTextColor="rgba(255,255,255,0.3)"
                      autoCapitalize="words"
                    />
                  </View>
                  
                  <View style={styles.formGroup}>
                    <Text style={styles.formLabel}>
                      Email <Text style={styles.required}>*</Text>
                    </Text>
                    <TextInput
                      style={styles.formInput}
                      value={editUserData.email}
                      onChangeText={(text) => setEditUserData({ ...editUserData, email: text })}
                      placeholder="Votre email"
                      placeholderTextColor="rgba(255,255,255,0.3)"
                      keyboardType="email-address"
                      autoCapitalize="none"
                    />
                  </View>
                  
                  <View style={styles.formGroup}>
                    <Text style={styles.formLabel}>
                      Téléphone <Text style={styles.required}>*</Text>
                    </Text>
                    <TextInput
                      style={styles.formInput}
                      value={editUserData.numero}
                      onChangeText={(text) => setEditUserData({ ...editUserData, numero: text })}
                      placeholder="Votre numéro de téléphone"
                      placeholderTextColor="rgba(255,255,255,0.3)"
                      keyboardType="phone-pad"
                    />
                  </View>
                  
                  <View style={styles.formGroup}>
                    <Text style={styles.formLabel}>Adresse</Text>
                    <TextInput
                      style={[styles.formInput, styles.textarea]}
                      value={editUserData.adresse}
                      onChangeText={(text) => setEditUserData({ ...editUserData, adresse: text })}
                      placeholder="Votre adresse"
                      placeholderTextColor="rgba(255,255,255,0.3)"
                      multiline
                      numberOfLines={2}
                    />
                  </View>
                  
                  <View style={styles.formGroup}>
                    <Text style={styles.formLabel}>Ville</Text>
                    <TextInput
                      style={styles.formInput}
                      value={editUserData.ville}
                      onChangeText={(text) => setEditUserData({ ...editUserData, ville: text })}
                      placeholder="Votre ville"
                      placeholderTextColor="rgba(255,255,255,0.3)"
                    />
                  </View>
                </View>
              </View>
              
              <View style={styles.formActions}>
                <TouchableOpacity 
                  style={styles.secondaryButton}
                  onPress={() => setIsEditingUser(false)}
                  disabled={saving}
                >
                  <Text style={styles.secondaryButtonText}>Annuler</Text>
                </TouchableOpacity>
                
                <TouchableOpacity 
                  style={[styles.primaryButton, saving && styles.buttonDisabled]}
                  onPress={handleSaveUserInfo}
                  disabled={saving}
                >
                  {saving ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <>
                      <MaterialIcons name="save" size={18} color="#fff" />
                      <Text style={styles.primaryButtonText}>Enregistrer</Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </ScrollView>
        </Animated.View>
      );
    }

    return (
      <Animated.View 
        style={[
          styles.tabContent,
          { opacity: fadeAnim }
        ]}
      >
        <ScrollView 
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          {/* Carte Profil Propriétaire */}
          <View style={styles.infoCard}>
            <View style={styles.infoCardHeader}>
              <View style={styles.infoCardTitleContainer}>
                <MaterialIcons name="person" size={22} color={PURPLE} />
                <Text style={styles.infoCardTitle}>Propriétaire</Text>
              </View>
              <TouchableOpacity 
                style={styles.editButton}
                onPress={() => setIsEditingUser(true)}
              >
                <MaterialIcons name="edit" size={18} color={PENDING_BLUE} />
                <Text style={styles.editButtonText}>Modifier</Text>
              </TouchableOpacity>
            </View>
            
            <View style={styles.profileSection}>
              <View style={styles.avatarContainer}>
                <View style={styles.avatar}>
                  <Text style={styles.avatarText}>
                    {fullName.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2)}
                  </Text>
                </View>
                <View style={styles.profileInfo}>
                  <Text style={styles.profileName}>{fullName}</Text>
                  <Text style={styles.profileRole}>Propriétaire • Premium</Text>
                </View>
              </View>
              
              <View style={styles.contactInfo}>
                <TouchableOpacity 
                  style={styles.contactInfoItem}
                  onPress={() => handleSendEmail(userInfo.email || boutique.proprietaire?.email || '')}
                >
                  <MaterialIcons name="email" size={18} color={PENDING_BLUE} />
                  <View style={styles.contactInfoContent}>
                    <Text style={styles.contactInfoLabel}>Email personnel</Text>
                    <Text style={styles.contactInfoValue}>{userInfo.email || boutique.proprietaire?.email || 'Non renseigné'}</Text>
                  </View>
                  <MaterialIcons name="open-in-new" size={16} color="rgba(255,255,255,0.4)" />
                </TouchableOpacity>
                
                <TouchableOpacity 
                  style={styles.contactInfoItem}
                  onPress={() => handleCallPhone(userInfo.numero || boutique.proprietaire?.phone || '')}
                >
                  <MaterialIcons name="phone" size={18} color={VALID_GREEN} />
                  <View style={styles.contactInfoContent}>
                    <Text style={styles.contactInfoLabel}>Téléphone personnel</Text>
                    <Text style={styles.contactInfoValue}>{userInfo.numero || boutique.proprietaire?.phone || 'Non renseigné'}</Text>
                  </View>
                  <MaterialIcons name="call" size={16} color="rgba(255,255,255,0.4)" />
                </TouchableOpacity>
                
                <View style={styles.contactInfoItem}>
                  <MaterialIcons name="location-on" size={18} color={DANGER_RED} />
                  <View style={styles.contactInfoContent}>
                    <Text style={styles.contactInfoLabel}>Localisation</Text>
                    <Text style={styles.contactInfoValue}>
                      {[userInfo.adresse, userInfo.ville].filter(Boolean).join(', ') || 'Non renseigné'}
                    </Text>
                  </View>
                </View>
              </View>
            </View>
          </View>

          {/* Carte Boutique Associée */}
          <View style={styles.infoCard}>
            <View style={styles.infoCardHeader}>
              <View style={styles.infoCardTitleContainer}>
                <MaterialIcons name="store" size={22} color={PREMIUM_GOLD} />
                <Text style={styles.infoCardTitle}>Boutique associée</Text>
              </View>
            </View>
            
            <View style={styles.boutiqueAssociation}>
              <View style={styles.associationItem}>
                <MaterialIcons name="store" size={18} color={PREMIUM_GOLD} />
                <View style={styles.associationContent}>
                  <Text style={styles.associationLabel}>Nom de la boutique</Text>
                  <Text style={styles.associationValue}>{boutique.nom}</Text>
                </View>
              </View>
              
              <View style={styles.associationItem}>
                <MaterialIcons name="category" size={18} color={VALID_GREEN} />
                <View style={styles.associationContent}>
                  <Text style={styles.associationLabel}>Catégorie</Text>
                  <Text style={styles.associationValue}>{boutique.categorie}</Text>
                </View>
              </View>
              
              <View style={styles.associationItem}>
                <MaterialIcons name="date-range" size={18} color={PURPLE} />
                <View style={styles.associationContent}>
                  <Text style={styles.associationLabel}>Propriétaire depuis</Text>
                  <Text style={styles.associationValue}>
                    {new Date(boutique.date_creation).toLocaleDateString('fr-FR', { 
                      month: 'long', 
                      year: 'numeric' 
                    })}
                  </Text>
                </View>
              </View>
              
              <View style={styles.associationItem}>
                <MaterialIcons name="check-circle" size={18} color={VALID_GREEN} />
                <View style={styles.associationContent}>
                  <Text style={styles.associationLabel}>Statut de la boutique</Text>
                  <View style={[
                    styles.statusBadgeSmall,
                    boutique.statut === 'validé' || boutique.statut === 'active' ? styles.statusValid :
                    boutique.statut === 'pending_validation' ? styles.statusPending :
                    styles.statusPayment
                  ]}>
                    <Text style={styles.statusTextSmall}>
                      {boutique.statut === 'validé' || boutique.statut === 'active' ? 'Active' : 
                       boutique.statut === 'pending_validation' ? 'En validation' : 'Paiement en attente'}
                    </Text>
                  </View>
                </View>
              </View>
            </View>
          </View>
        </ScrollView>
      </Animated.View>
    );
  };

  const renderStatistiques = () => {
    const defaultStats = {
      totalCommandes: 0,
      totalRevenu: 0,
      totalVues: '0',
    };

    const currentStats = stats || defaultStats;

    return (
      <Animated.View 
        style={[
          styles.tabContent,
          { opacity: fadeAnim }
        ]}
      >
        <ScrollView 
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          {/* Statistiques Principales */}
          <View style={styles.statsCard}>
            <View style={styles.statsCardHeader}>
              <MaterialIcons name="trending-up" size={24} color={PREMIUM_GOLD} />
              <Text style={styles.statsCardTitle}>Aperçu des performances</Text>
            </View>
            
            <View style={styles.statsGrid}>
              <View style={[styles.statCard, styles.statCardFixed]}>
                <View style={[styles.statIcon, { backgroundColor: `${PENDING_BLUE}15` }]}>
                  <MaterialIcons name="shopping-cart" size={28} color={PENDING_BLUE} />
                </View>
                <View style={styles.statValueContainer}>
                  <Text style={styles.statValue}>{currentStats.totalCommandes}</Text>
                </View>
                <View style={styles.statLabelContainer}>
                  <Text style={styles.statLabel}>Commandes totales</Text>
                  <Text style={styles.statSubLabel}>Toutes périodes</Text>
                </View>
              </View>
              
              <View style={[styles.statCard, styles.statCardFixed]}>
                <View style={[styles.statIcon, { backgroundColor: `${VALID_GREEN}15` }]}>
                  <FontAwesome5 name="money-bill-wave" size={24} color={VALID_GREEN} />
                </View>
                <View style={styles.statValueContainer}>
                  <Text style={styles.statValue}>{currentStats.totalRevenu} $</Text>
                </View>
                <View style={styles.statLabelContainer}>
                  <Text style={styles.statLabel}>Revenu généré</Text>
                  <Text style={styles.statSubLabel}>Chiffre d'affaires</Text>
                </View>
              </View>
              
              <View style={[styles.statCard, styles.statCardFixed]}>
                <View style={[styles.statIcon, { backgroundColor: `${PURPLE}15` }]}>
                  <MaterialIcons name="visibility" size={28} color={PURPLE} />
                </View>
                <View style={styles.statValueContainer}>
                  <Text style={styles.statValue}>{currentStats.totalVues}</Text>
                </View>
                <View style={styles.statLabelContainer}>
                  <Text style={styles.statLabel}>Visibilité</Text>
                  <Text style={styles.statSubLabel}>Vues totales</Text>
                </View>
              </View>
              
              <View style={[styles.statCard, styles.statCardFixed]}>
                <View style={[styles.statIcon, { backgroundColor: `${PREMIUM_GOLD}15` }]}>
                  <MaterialIcons name="star" size={28} color={PREMIUM_GOLD} />
                </View>
                <View style={styles.statValueContainer}>
                  <Text style={styles.statValue}>Premium</Text>
                </View>
                <View style={styles.statLabelContainer}>
                  <Text style={styles.statLabel}>Performance</Text>
                  <Text style={styles.statSubLabel}>Niveau premium</Text>
                </View>
              </View>
            </View>
          </View>

          {/* Détails des performances - NOUVELLE STRUCTURE */}
          <View style={styles.infoCard}>
            <Text style={styles.infoCardTitle}>Détails des performances</Text>
            
            <View style={styles.performanceDetailsContainer}>
              {/* Commande */}
              <View style={styles.performanceDetailRow}>
                <View style={styles.performanceDetailLeft}>
                  <View style={[styles.performanceDetailIcon, { backgroundColor: `${PENDING_BLUE}15` }]}>
                    <MaterialIcons name="shopping-cart" size={20} color={PENDING_BLUE} />
                  </View>
                  <View style={styles.performanceDetailText}>
                    <Text style={styles.performanceDetailTitle}>Commandes</Text>
                    <Text style={styles.performanceDetailSubtitle}>Total des ventes</Text>
                  </View>
                </View>
                <Text style={styles.performanceDetailValue}>{currentStats.totalCommandes}</Text>
              </View>
              
              {/* Revenu */}
              <View style={styles.performanceDetailRow}>
                <View style={styles.performanceDetailLeft}>
                  <View style={[styles.performanceDetailIcon, { backgroundColor: `${VALID_GREEN}15` }]}>
                    <FontAwesome5 name="money-bill-wave" size={18} color={VALID_GREEN} />
                  </View>
                  <View style={styles.performanceDetailText}>
                    <Text style={styles.performanceDetailTitle}>Revenu</Text>
                    <Text style={styles.performanceDetailSubtitle}>Chiffre d'affaires</Text>
                  </View>
                </View>
                <Text style={styles.performanceDetailValue}>{currentStats.totalRevenu} USD</Text>
              </View>
              
              {/* Visibilité */}
              <View style={styles.performanceDetailRow}>
                <View style={styles.performanceDetailLeft}>
                  <View style={[styles.performanceDetailIcon, { backgroundColor: `${PURPLE}15` }]}>
                    <MaterialIcons name="visibility" size={20} color={PURPLE} />
                  </View>
                  <View style={styles.performanceDetailText}>
                    <Text style={styles.performanceDetailTitle}>Visibilité</Text>
                    <Text style={styles.performanceDetailSubtitle}>Portée globale</Text>
                  </View>
                </View>
                <Text style={styles.performanceDetailValue}>{currentStats.totalVues}</Text>
              </View>
              
              {/* Performance */}
              <View style={styles.performanceDetailRow}>
                <View style={styles.performanceDetailLeft}>
                  <View style={[styles.performanceDetailIcon, { backgroundColor: `${PREMIUM_GOLD}15` }]}>
                    <MaterialIcons name="speed" size={20} color={PREMIUM_GOLD} />
                  </View>
                  <View style={styles.performanceDetailText}>
                    <Text style={styles.performanceDetailTitle}>Performance</Text>
                    <Text style={styles.performanceDetailSubtitle}>Niveau premium</Text>
                  </View>
                </View>
                <Text style={styles.performanceDetailValue}>Élevée</Text>
              </View>
            </View>
          </View>

          {/* Bouton pour plus de statistiques */}
          <TouchableOpacity 
            style={[styles.actionButton, styles.actionButtonSecondary]}
            onPress={() => setShowStatsModal(true)}
          >
            <MaterialIcons name="analytics" size={20} color={PENDING_BLUE} />
            <Text style={styles.actionButtonTextSecondary}>Voir plus de stats</Text>
          </TouchableOpacity>
        </ScrollView>
      </Animated.View>
    );
  };

  const renderContent = () => {
    return (
      <View style={styles.content}>
        {renderTabs()}
        
        <ScrollView 
          ref={scrollViewRef}
          style={styles.contentScroll}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={[PREMIUM_GOLD]}
              tintColor={PREMIUM_GOLD}
              progressBackgroundColor={SHOPNET_BLUE}
            />
          }
          showsVerticalScrollIndicator={false}
        >
          {activeTab === 'infos' && renderBoutiqueInfo()}
          {activeTab === 'proprietaire' && renderProprietaireInfo()}
          {activeTab === 'statistiques' && renderStatistiques()}
        </ScrollView>
      </View>
    );
  };

  const renderEditBoutiqueModal = () => (
    <Modal
      visible={showEditBoutiqueModal}
      transparent
      animationType="slide"
      onRequestClose={() => setShowEditBoutiqueModal(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <View style={styles.modalTitleContainer}>
              <MaterialIcons name="edit" size={22} color={PREMIUM_GOLD} />
              <Text style={styles.modalTitle}>Modifier la boutique</Text>
            </View>
            <TouchableOpacity 
              style={styles.modalCloseButton}
              onPress={() => setShowEditBoutiqueModal(false)}
            >
              <MaterialIcons name="close" size={24} color="rgba(255,255,255,0.7)" />
            </TouchableOpacity>
          </View>
          
          <ScrollView 
            style={styles.modalContent} 
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            <View style={styles.modalForm}>
              <View style={styles.modalFormGroup}>
                <Text style={styles.modalFormLabel}>
                  Nom de la boutique <Text style={styles.required}>*</Text>
                </Text>
                <TextInput
                  style={styles.modalFormInput}
                  value={editBoutiqueData.nom}
                  onChangeText={(text) => setEditBoutiqueData({ ...editBoutiqueData, nom: text })}
                  placeholder="Nom de votre boutique"
                  placeholderTextColor="rgba(255,255,255,0.3)"
                />
              </View>
              
              <View style={styles.modalFormGroup}>
                <Text style={styles.modalFormLabel}>
                  Description <Text style={styles.required}>*</Text>
                </Text>
                <TextInput
                  style={[styles.modalFormInput, styles.modalTextarea]}
                  value={editBoutiqueData.description}
                  onChangeText={(text) => setEditBoutiqueData({ ...editBoutiqueData, description: text })}
                  placeholder="Décrivez votre boutique..."
                  placeholderTextColor="rgba(255,255,255,0.3)"
                  multiline
                  numberOfLines={4}
                  textAlignVertical="top"
                />
              </View>
              
              <View style={styles.modalFormGroup}>
                <Text style={styles.modalFormLabel}>
                  Email de contact <Text style={styles.required}>*</Text>
                </Text>
                <TextInput
                  style={styles.modalFormInput}
                  value={editBoutiqueData.email}
                  onChangeText={(text) => setEditBoutiqueData({ ...editBoutiqueData, email: text })}
                  placeholder="contact@votreboutique.com"
                  placeholderTextColor="rgba(255,255,255,0.3)"
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
              </View>
              
              <View style={styles.modalFormGroup}>
                <Text style={styles.modalFormLabel}>
                  Téléphone <Text style={styles.required}>*</Text>
                </Text>
                <TextInput
                  style={styles.modalFormInput}
                  value={editBoutiqueData.phone}
                  onChangeText={(text) => setEditBoutiqueData({ ...editBoutiqueData, phone: text })}
                  placeholder="Votre numéro de téléphone"
                  placeholderTextColor="rgba(255,255,255,0.3)"
                  keyboardType="phone-pad"
                />
              </View>
              
              <View style={styles.modalFormGroup}>
                <Text style={styles.modalFormLabel}>Adresse</Text>
                <TextInput
                  style={[styles.modalFormInput, styles.modalTextarea]}
                  value={editBoutiqueData.adresse}
                  onChangeText={(text) => setEditBoutiqueData({ ...editBoutiqueData, adresse: text })}
                  placeholder="Adresse complète de la boutique"
                  placeholderTextColor="rgba(255,255,255,0.3)"
                  multiline
                  numberOfLines={3}
                  textAlignVertical="top"
                />
              </View>
              
              <View style={styles.modalFormRow}>
                <View style={[styles.modalFormGroup, { flex: 1, marginRight: 10 }]}>
                  <Text style={styles.modalFormLabel}>Ville</Text>
                  <TextInput
                    style={styles.modalFormInput}
                    value={editBoutiqueData.ville}
                    onChangeText={(text) => setEditBoutiqueData({ ...editBoutiqueData, ville: text })}
                    placeholder="Ville"
                    placeholderTextColor="rgba(255,255,255,0.3)"
                  />
                </View>
                
                <View style={[styles.modalFormGroup, { flex: 1 }]}>
                  <Text style={styles.modalFormLabel}>Pays</Text>
                  <TextInput
                    style={styles.modalFormInput}
                    value={editBoutiqueData.pays}
                    onChangeText={(text) => setEditBoutiqueData({ ...editBoutiqueData, pays: text })}
                    placeholder="Pays"
                    placeholderTextColor="rgba(255,255,255,0.3)"
                  />
                </View>
              </View>
              
              <View style={styles.modalFormGroup}>
                <Text style={styles.modalFormLabel}>Code Postal</Text>
                <TextInput
                  style={styles.modalFormInput}
                  value={editBoutiqueData.codePostal}
                  onChangeText={(text) => setEditBoutiqueData({ ...editBoutiqueData, codePostal: text })}
                  placeholder="Code postal"
                  placeholderTextColor="rgba(255,255,255,0.3)"
                  keyboardType="number-pad"
                />
              </View>
            </View>
            
            <View style={styles.modalActions}>
              <TouchableOpacity 
                style={styles.modalSecondaryButton}
                onPress={() => setShowEditBoutiqueModal(false)}
                disabled={saving}
              >
                <Text style={styles.modalSecondaryButtonText}>Annuler</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[styles.modalPrimaryButton, saving && styles.buttonDisabled]}
                onPress={handleSaveBoutiqueInfo}
                disabled={saving}
              >
                {saving ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <>
                    <MaterialIcons name="save" size={18} color="#fff" />
                    <Text style={styles.modalPrimaryButtonText}>Enregistrer</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );

  const renderStatsModal = () => (
    <Modal
      visible={showStatsModal}
      transparent
      animationType="slide"
      onRequestClose={() => setShowStatsModal(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={[styles.modalContainer, styles.statsModal]}>
          <View style={styles.modalHeader}>
            <View style={styles.modalTitleContainer}>
              <MaterialIcons name="analytics" size={24} color={PREMIUM_GOLD} />
              <Text style={styles.modalTitle}>Statistiques détaillées</Text>
            </View>
            <TouchableOpacity 
              style={styles.modalCloseButton}
              onPress={() => setShowStatsModal(false)}
            >
              <MaterialIcons name="close" size={24} color="rgba(255,255,255,0.7)" />
            </TouchableOpacity>
          </View>
          
          {boutique && (
            <ScrollView 
              style={styles.modalContent} 
              showsVerticalScrollIndicator={false}
            >
              {/* Statistiques principales */}
              <View style={styles.statsModalSection}>
                <Text style={styles.statsModalSectionTitle}>Performances globales</Text>
                
                <View style={styles.statsModalGrid}>
                  <View style={[styles.statsModalCard, styles.statsModalCardFixed]}>
                    <View style={[styles.statsModalIcon, { backgroundColor: `${PENDING_BLUE}15` }]}>
                      <MaterialIcons name="shopping-cart" size={30} color={PENDING_BLUE} />
                    </View>
                    <View style={styles.statsModalValueContainer}>
                      <Text style={styles.statsModalValue}>{stats?.totalCommandes || 0}</Text>
                    </View>
                    <View style={styles.statsModalLabelContainer}>
                      <Text style={styles.statsModalLabel}>Commandes</Text>
                      <Text style={styles.statsModalDescription}>
                        Toutes les commandes reçues
                      </Text>
                    </View>
                  </View>
                  
                  <View style={[styles.statsModalCard, styles.statsModalCardFixed]}>
                    <View style={[styles.statsModalIcon, { backgroundColor: `${VALID_GREEN}15` }]}>
                      <FontAwesome5 name="money-bill-wave" size={26} color={VALID_GREEN} />
                    </View>
                    <View style={styles.statsModalValueContainer}>
                      <Text style={styles.statsModalValue}>{stats?.totalRevenu || 0} $</Text>
                    </View>
                    <View style={styles.statsModalLabelContainer}>
                      <Text style={styles.statsModalLabel}>Revenu</Text>
                      <Text style={styles.statsModalDescription}>
                        Chiffre d'affaires total
                      </Text>
                    </View>
                  </View>
                  
                  <View style={[styles.statsModalCard, styles.statsModalCardFixed]}>
                    <View style={[styles.statsModalIcon, { backgroundColor: `${PURPLE}15` }]}>
                      <MaterialIcons name="visibility" size={30} color={PURPLE} />
                    </View>
                    <View style={styles.statsModalValueContainer}>
                      <Text style={styles.statsModalValue}>{stats?.totalVues || '0'}</Text>
                    </View>
                    <View style={styles.statsModalLabelContainer}>
                      <Text style={styles.statsModalLabel}>Visibilité</Text>
                      <Text style={styles.statsModalDescription}>
                        Portée de la boutique
                      </Text>
                    </View>
                  </View>
                  
                  <View style={[styles.statsModalCard, styles.statsModalCardFixed]}>
                    <View style={[styles.statsModalIcon, { backgroundColor: `${PREMIUM_GOLD}15` }]}>
                      <MaterialIcons name="star" size={30} color={PREMIUM_GOLD} />
                    </View>
                    <View style={styles.statsModalValueContainer}>
                      <Text style={styles.statsModalValue}>Premium</Text>
                    </View>
                    <View style={styles.statsModalLabelContainer}>
                      <Text style={styles.statsModalLabel}>Performance</Text>
                      <Text style={styles.statsModalDescription}>
                        Niveau premium
                      </Text>
                    </View>
                  </View>
                </View>
              </View>

              {/* Détails des performances dans la modal */}
              <View style={styles.statsModalSection}>
                <Text style={styles.statsModalSectionTitle}>Détails des performances</Text>
                
                <View style={styles.modalPerformanceDetails}>
                  <View style={styles.modalPerformanceRow}>
                    <View style={styles.modalPerformanceLeft}>
                      <View style={[styles.modalPerformanceIcon, { backgroundColor: `${PENDING_BLUE}15` }]}>
                        <MaterialIcons name="shopping-cart" size={20} color={PENDING_BLUE} />
                      </View>
                      <View style={styles.modalPerformanceText}>
                        <Text style={styles.modalPerformanceTitle}>Commandes</Text>
                        <Text style={styles.modalPerformanceSubtitle}>Total des ventes</Text>
                      </View>
                    </View>
                    <Text style={styles.modalPerformanceValue}>{stats?.totalCommandes || 0}</Text>
                  </View>
                  
                  <View style={styles.modalPerformanceRow}>
                    <View style={styles.modalPerformanceLeft}>
                      <View style={[styles.modalPerformanceIcon, { backgroundColor: `${VALID_GREEN}15` }]}>
                        <FontAwesome5 name="money-bill-wave" size={18} color={VALID_GREEN} />
                      </View>
                      <View style={styles.modalPerformanceText}>
                        <Text style={styles.modalPerformanceTitle}>Revenu</Text>
                        <Text style={styles.modalPerformanceSubtitle}>Chiffre d'affaires</Text>
                      </View>
                    </View>
                    <Text style={styles.modalPerformanceValue}>{stats?.totalRevenu || 0} USD</Text>
                  </View>
                  
                  <View style={styles.modalPerformanceRow}>
                    <View style={styles.modalPerformanceLeft}>
                      <View style={[styles.modalPerformanceIcon, { backgroundColor: `${PURPLE}15` }]}>
                        <MaterialIcons name="visibility" size={20} color={PURPLE} />
                      </View>
                      <View style={styles.modalPerformanceText}>
                        <Text style={styles.modalPerformanceTitle}>Visibilité</Text>
                        <Text style={styles.modalPerformanceSubtitle}>Portée globale</Text>
                      </View>
                    </View>
                    <Text style={styles.modalPerformanceValue}>{stats?.totalVues || '0'}</Text>
                  </View>
                  
                  <View style={styles.modalPerformanceRow}>
                    <View style={styles.modalPerformanceLeft}>
                      <View style={[styles.modalPerformanceIcon, { backgroundColor: `${PREMIUM_GOLD}15` }]}>
                        <MaterialIcons name="speed" size={20} color={PREMIUM_GOLD} />
                      </View>
                      <View style={styles.modalPerformanceText}>
                        <Text style={styles.modalPerformanceTitle}>Performance</Text>
                        <Text style={styles.modalPerformanceSubtitle}>Niveau premium</Text>
                      </View>
                    </View>
                    <Text style={styles.modalPerformanceValue}>Élevée</Text>
                  </View>
                </View>
              </View>

              {/* Bouton de fermeture */}
              <TouchableOpacity 
                style={styles.modalCloseActionButton}
                onPress={() => setShowStatsModal(false)}
              >
                <Text style={styles.modalCloseActionText}>Fermer</Text>
              </TouchableOpacity>
            </ScrollView>
          )}
        </View>
      </View>
    </Modal>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar backgroundColor={SHOPNET_BLUE} barStyle="light-content" />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={PREMIUM_GOLD} />
          <Text style={styles.loadingText}>Chargement des informations...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error || !boutique) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar backgroundColor={SHOPNET_BLUE} barStyle="light-content" />
        <View style={styles.errorContainer}>
          <MaterialIcons name="error-outline" size={64} color={DANGER_RED} />
          <Text style={styles.errorTitle}>Erreur</Text>
          <Text style={styles.errorMessage}>
            {error || 'Impossible de charger les informations de la boutique.'}
          </Text>
          <TouchableOpacity 
            style={styles.primaryButton}
            onPress={() => router.back()}
          >
            <Text style={styles.primaryButtonText}>Retour</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.secondaryButton}
            onPress={fetchBoutiqueData}
          >
            <Text style={styles.secondaryButtonText}>Réessayer</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar backgroundColor={SHOPNET_BLUE} barStyle="light-content" />
      
      {renderHeader()}
      {renderContent()}
      
      {renderEditBoutiqueModal()}
      {renderStatsModal()}
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
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: SHOPNET_BLUE,
  },
  loadingText: {
    color: '#fff',
    marginTop: 16,
    fontSize: 16,
    fontWeight: '500',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: SHOPNET_BLUE,
  },
  errorTitle: {
    color: '#fff',
    fontSize: 24,
    fontWeight: '700',
    marginTop: 16,
    marginBottom: 8,
  },
  errorMessage: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 24,
  },
  header: {
    backgroundColor: 'rgba(30, 42, 59, 0.95)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
    paddingTop: Platform.OS === 'ios' ? 10 : 20,
    paddingBottom: 16,
    paddingHorizontal: 16,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitleContainer: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    color: '#fff',
    fontSize: 22,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  headerSubtitle: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 12,
    marginTop: 2,
  },
  headerActions: {
    flexDirection: 'row',
  },
  headerActionButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  boutiqueHeader: {
    marginTop: 8,
  },
  boutiqueLogoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  boutiqueLogo: {
    width: 60,
    height: 60,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: PREMIUM_GOLD,
  },
  boutiqueLogoPlaceholder: {
    width: 60,
    height: 60,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.05)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: PREMIUM_GOLD,
  },
  boutiqueTitleContainer: {
    flex: 1,
    marginLeft: 16,
  },
  boutiqueName: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 6,
  },
  boutiqueMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    marginRight: 8,
  },
  statusValid: {
    backgroundColor: 'rgba(77, 177, 78, 0.15)',
  },
  statusPending: {
    backgroundColor: 'rgba(255, 167, 38, 0.15)',
  },
  statusPayment: {
    backgroundColor: 'rgba(244, 67, 54, 0.15)',
  },
  statusText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#fff',
  },
  premiumBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 167, 38, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: 'rgba(255, 167, 38, 0.3)',
  },
  premiumText: {
    fontSize: 10,
    fontWeight: '700',
    color: PREMIUM_GOLD,
    marginLeft: 4,
    letterSpacing: 0.5,
  },
  boutiqueQuickInfo: {
    flexDirection: 'row',
    marginTop: 8,
  },
  quickInfoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 16,
  },
  quickInfoText: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 12,
    marginLeft: 6,
  },
  content: {
    flex: 1,
  },
  tabsContainer: {
    backgroundColor: 'rgba(30, 42, 59, 0.9)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
  },
  tabsWrapper: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 4,
  },
  tabButton: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 14,
    position: 'relative',
  },
  tabButtonActive: {
    backgroundColor: 'rgba(255, 167, 38, 0.1)',
    borderRadius: 8,
  },
  tabText: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 14,
    fontWeight: '600',
    marginTop: 4,
    letterSpacing: 0.3,
  },
  tabTextActive: {
    color: PREMIUM_GOLD,
  },
  tabIndicator: {
    position: 'absolute',
    bottom: 0,
    height: 3,
    width: '60%',
    backgroundColor: PREMIUM_GOLD,
    borderRadius: 1.5,
  },
  contentScroll: {
    flex: 1,
  },
  tabContent: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 30,
  },
  infoCard: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  infoCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  infoCardTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  infoCardTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
    marginLeft: 10,
  },
  editButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(66, 165, 245, 0.15)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(66, 165, 245, 0.3)',
  },
  editButtonText: {
    color: PENDING_BLUE,
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 4,
  },
  descriptionText: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 15,
    lineHeight: 22,
    marginBottom: 20,
  },
  infoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  infoItem: {
    width: '48%',
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },
  infoIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  infoContent: {
    flex: 1,
  },
  infoLabel: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 11,
    marginBottom: 2,
    fontWeight: '500',
  },
  infoValue: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  contactGrid: {
    marginTop: 8,
  },
  contactButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
  },
  contactIcon: {
    width: 42,
    height: 42,
    borderRadius: 21,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  contactContent: {
    flex: 1,
  },
  contactLabel: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 12,
    marginBottom: 2,
    fontWeight: '500',
  },
  contactValue: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: PREMIUM_GOLD,
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 20,
    marginTop: 8,
  },
  primaryButtonText: {
    color: '#00182A',
    fontSize: 16,
    fontWeight: '700',
    marginHorizontal: 10,
    flex: 1,
    textAlign: 'center',
  },
  editFormCard: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  editFormHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  editFormTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  editFormTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
    marginLeft: 10,
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(244, 67, 54, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(244, 67, 54, 0.3)',
  },
  formContainer: {
    marginBottom: 20,
  },
  formSection: {
    marginBottom: 24,
  },
  formSectionTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 16,
    opacity: 0.9,
  },
  formGroup: {
    marginBottom: 16,
  },
  formLabel: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 14,
    marginBottom: 8,
    fontWeight: '500',
  },
  required: {
    color: DANGER_RED,
  },
  formInput: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    borderRadius: 10,
    padding: 14,
    color: '#fff',
    fontSize: 15,
  },
  textarea: {
    minHeight: 100,
    textAlignVertical: 'top',
  },
  formActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10,
  },
  secondaryButton: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    borderRadius: 10,
    paddingVertical: 14,
    marginRight: 10,
    alignItems: 'center',
    marginTop: 10,
  },
  secondaryButtonText: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 16,
    fontWeight: '600',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  profileSection: {
    marginTop: 8,
  },
  avatarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
  },
  avatar: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: 'rgba(255, 167, 38, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: 'rgba(255, 167, 38, 0.4)',
  },
  avatarText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: PREMIUM_GOLD,
  },
  profileInfo: {
    flex: 1,
    marginLeft: 16,
  },
  profileName: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 4,
  },
  profileRole: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 14,
  },
  contactInfo: {
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: 12,
    padding: 16,
  },
  contactInfoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.05)',
  },
  contactInfoContent: {
    flex: 1,
    marginLeft: 14,
  },
  contactInfoLabel: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 12,
    marginBottom: 2,
    fontWeight: '500',
  },
  contactInfoValue: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  boutiqueAssociation: {
    marginTop: 8,
  },
  associationItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.05)',
  },
  associationContent: {
    flex: 1,
    marginLeft: 14,
  },
  associationLabel: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 12,
    marginBottom: 2,
    fontWeight: '500',
  },
  associationValue: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  statusBadgeSmall: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
    alignSelf: 'flex-start',
  },
  statusTextSmall: {
    fontSize: 10,
    fontWeight: '600',
    color: '#fff',
  },
  statsCard: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  statsCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  statsCardTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
    marginLeft: 10,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  statCard: {
    width: '48%',
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  statCardFixed: {
    height: 160,
    justifyContent: 'space-between',
  },
  statIcon: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    alignSelf: 'center',
  },
  statValueContainer: {
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 4,
    minHeight: 30,
  },
  statValue: {
    color: '#fff',
    fontSize: 22,
    fontWeight: '700',
    textAlign: 'center',
  },
  statLabelContainer: {
    alignItems: 'center',
  },
  statLabel: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 2,
  },
  statSubLabel: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 11,
    textAlign: 'center',
  },
  // Nouvelles styles pour les détails de performance alignés
  performanceDetailsContainer: {
    marginTop: 8,
  },
  performanceDetailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 10,
  },
  performanceDetailLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  performanceDetailIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  performanceDetailText: {
    flex: 1,
  },
  performanceDetailTitle: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 2,
  },
  performanceDetailSubtitle: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 12,
  },
  performanceDetailValue: {
    color: PREMIUM_GOLD,
    fontSize: 16,
    fontWeight: '700',
    textAlign: 'right',
    minWidth: 80,
    marginLeft: 10,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    paddingVertical: 14,
    marginTop: 8,
    width: '100%',
  },
  actionButtonSecondary: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  actionButtonTextSecondary: {
    color: PENDING_BLUE,
    fontSize: 15,
    fontWeight: '600',
    marginLeft: 8,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    backgroundColor: SHOPNET_BLUE,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingBottom: Platform.OS === 'ios' ? 40 : 20,
    maxHeight: '85%',
  },
  statsModal: {
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
  },
  modalTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  modalTitle: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '700',
    marginLeft: 10,
  },
  modalCloseButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    padding: 20,
  },
  modalForm: {
    marginBottom: 20,
  },
  modalFormGroup: {
    marginBottom: 16,
  },
  modalFormLabel: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 14,
    marginBottom: 8,
    fontWeight: '500',
  },
  modalFormInput: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    borderRadius: 10,
    padding: 14,
    color: '#fff',
    fontSize: 15,
  },
  modalTextarea: {
    minHeight: 100,
    textAlignVertical: 'top',
  },
  modalFormRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10,
  },
  modalSecondaryButton: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    borderRadius: 10,
    paddingVertical: 14,
    marginRight: 10,
    alignItems: 'center',
  },
  modalSecondaryButtonText: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 16,
    fontWeight: '600',
  },
  modalPrimaryButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: PREMIUM_GOLD,
    borderRadius: 10,
    paddingVertical: 14,
    marginLeft: 10,
  },
  modalPrimaryButtonText: {
    color: '#00182A',
    fontSize: 16,
    fontWeight: '700',
    marginLeft: 8,
  },
  statsModalSection: {
    marginBottom: 24,
  },
  statsModalSectionTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 16,
  },
  statsModalGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  statsModalCard: {
    width: '48%',
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  statsModalCardFixed: {
    height: 180,
    justifyContent: 'space-between',
  },
  statsModalIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    alignSelf: 'center',
  },
  statsModalValueContainer: {
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 4,
    minHeight: 40,
  },
  statsModalValue: {
    color: '#fff',
    fontSize: 24,
    fontWeight: '700',
    textAlign: 'center',
  },
  statsModalLabelContainer: {
    alignItems: 'center',
  },
  statsModalLabel: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 4,
  },
  statsModalDescription: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 11,
    textAlign: 'center',
  },
  statsInfoList: {
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: 12,
    padding: 16,
  },
  statsInfoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.05)',
  },
  statsInfoContent: {
    flex: 1,
    marginLeft: 14,
  },
  statsInfoLabel: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 12,
    marginBottom: 2,
    fontWeight: '500',
  },
  statsInfoValue: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  // Styles pour les détails de performance dans la modal
  modalPerformanceDetails: {
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: 12,
    padding: 16,
  },
  modalPerformanceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.05)',
  },
  modalPerformanceLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  modalPerformanceIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  modalPerformanceText: {
    flex: 1,
  },
  modalPerformanceTitle: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 2,
  },
  modalPerformanceSubtitle: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 12,
  },
  modalPerformanceValue: {
    color: PREMIUM_GOLD,
    fontSize: 16,
    fontWeight: '700',
    textAlign: 'right',
    minWidth: 80,
    marginLeft: 10,
  },
  modalCloseActionButton: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  modalCloseActionText: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 16,
    fontWeight: '600',
  },
});