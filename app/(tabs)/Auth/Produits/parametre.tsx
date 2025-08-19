

import React, { useState, useRef, useEffect } from 'react';
import { 
  View, 
  Text, 
  TouchableOpacity, 
  StyleSheet,
  Alert,
  Platform,
  StatusBar,
  SafeAreaView,
  Animated,
  ScrollView,
  Dimensions,
  Image,
  TextInput
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons, MaterialIcons, FontAwesome, Feather } from '@expo/vector-icons';
import axios from 'axios';

const BASE_URL = 'http://100.64.134.89:5000/api';
const { width } = Dimensions.get('window');

const settingsSections = [
  {
    title: "Compte",
    items: [
      { name: 'Mon profil', route: '/profil', icon: 'user' },
      { name: 'Sécurité', route: '/securite', icon: 'lock' },
      { name: 'Paiements', route: '/paiement', icon: 'credit-card' },
      { name: 'Badge Bleu', route: '/badge', icon: 'check-circle' },
    ]
  },
  {
    title: "Préférences",
    items: [
      { name: 'Notifications', route: '/notifications', icon: 'bell' },
      { name: 'Affichage', route: '/affichage', icon: 'desktop' },
      { name: 'Localisation', route: '/localisation', icon: 'map-marker' },
      { name: 'Langue', route: '/langue', icon: 'globe' },
    ]
  },
  {
    title: "Votre activité",
    items: [
      { name: 'Messages', route: '/messages', icon: 'envelope' },
      { name: 'Réseau', route: '/reseau', icon: 'users' },
      { name: 'Publicité', route: '/publicite', icon: 'bullhorn' },
      { name: 'Historique', route: '/historique', icon: 'history' },
    ]
  },
  {
    title: "Support",
    items: [
      { name: 'Aide et support', route: '/support', icon: 'question-circle' },
      { name: 'Légal', route: '/legaux', icon: 'balance-scale' },
      { name: 'Équipe', route: '/equipe', icon: 'users' },
      { name: 'Signaler un problème', route: '../../../MisAjour', icon: 'exclamation-triangle' },
    ]
  },
  {
    title: "Boutique",
    items: [
      { name: 'Vendeurs', route: '../../../MisAjour', icon: 'store' },
      { name: 'Acheteurs', route: '../../../MisAjour', icon: 'shopping-cart' },
      { name: 'Produits', route: '../../../MisAjour', icon: 'box' },
      { name: 'Livraison', route: '../../../MisAjour', icon: 'truck' },
    ]
  },
];

const SettingsScreen = () => {
  const router = useRouter();
  const scrollY = useRef(new Animated.Value(0)).current;
  const [userData, setUserData] = useState({
    name: "SHOPNET",
    email: "Entreprishe SHOPNET",
    avatar: "https://res.cloudinary.com/dddr7gb6w/image/upload/v1754689052/shopnet/product_1754689050822_5996.jpg"
  });
  const [searchText, setSearchText] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        setUserData({
          name: "SHOPNET",
        email: "Entreprishe SHOPNET",
        avatar: "https://res.cloudinary.com/dddr7gb6w/image/upload/v1754689052/shopnet/product_1754689050822_5996.jpg"
            });
      } catch (error) {
        console.error("Erreur de chargement des données utilisateur", error);
      }
    };
    
    fetchUserData();
  }, []);

  const handleSearch = (text: string) => {
    setSearchText(text);
    if (text.length > 0) {
      setIsSearching(true);
      const results: any[] = [];
      
      settingsSections.forEach(section => {
        section.items.forEach(item => {
          if (item.name.toLowerCase().includes(text.toLowerCase())) {
            results.push({ ...item, sectionTitle: section.title });
          }
        });
      });
      
      setSearchResults(results);
    } else {
      setIsSearching(false);
      setSearchResults([]);
    }
  };

  const handleLogout = async () => {
    Alert.alert(
      'Déconnexion',
      'Êtes-vous sûr de vouloir vous déconnecter ?',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Déconnexion',
          onPress: async () => {
            try {
              await axios.post(`${BASE_URL}/auth/logout`);
              router.push('/login');
            } catch (error) {
              Alert.alert('Erreur', 'Échec de la déconnexion');
            }
          }
        }
      ]
    );
  };

  const headerTranslateY = scrollY.interpolate({
    inputRange: [0, 50],
    outputRange: [0, -50],
    extrapolate: 'clamp',
  });

  const renderSettingsItem = (item: any) => (
    <TouchableOpacity
      key={item.name}
      style={styles.settingItem}
      onPress={() => router.push(item.route)}
    >
      <View style={styles.itemLeft}>
        <FontAwesome name={item.icon} size={18} color="#A0A6B1" style={styles.itemIcon} />
        <Text style={styles.itemText}>{item.name}</Text>
      </View>
      <Feather name="chevron-right" size={18} color="#3D4A5C" />
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <Animated.View style={[styles.header, { transform: [{ translateY: headerTranslateY }] }]}>
        <Text style={styles.headerTitle}>Paramètres</Text>
        <View style={styles.searchContainer}>
          <Ionicons name="search" size={20} color="#A0A6B1" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Rechercher dans les paramètres..."
            placeholderTextColor="#A0A6B1"
            value={searchText}
            onChangeText={handleSearch}
          />
          {searchText.length > 0 && (
            <TouchableOpacity 
              style={styles.clearButton} 
              onPress={() => {
                setSearchText('');
                setIsSearching(false);
                setSearchResults([]);
              }}
            >
              <Ionicons name="close" size={20} color="#A0A6B1" />
            </TouchableOpacity>
          )}
        </View>
      </Animated.View>

      <Animated.ScrollView
        style={styles.container}
        contentContainerStyle={styles.contentContainer}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
          { useNativeDriver: true }
        )}
        scrollEventThrottle={16}
      >
        {/* Header utilisateur */}
        <View style={styles.userHeader}>
          <Image 
            source={{ uri: userData.avatar }} 
            style={styles.userAvatar} 
          />
          <View style={styles.userInfo}>
            <Text style={styles.userName}>{userData.name}</Text>
            <Text style={styles.userEmail}>{userData.email}</Text>
          </View>
          <TouchableOpacity 
            style={styles.editButton}
            onPress={() => router.push('/MisAjour')}
          >
            <Ionicons name="pencil" size={16} color="#4CB050" />
          </TouchableOpacity>
        </View>

        {/* Section horizontale */}
        <View style={styles.horizontalSection}>
          <TouchableOpacity 
            style={styles.horizontalItem}
            onPress={() => router.push('/MisAjour')}
          >
            <View style={styles.iconCircle}>
              <Ionicons name="notifications" size={24} color="#4CB050" />
            </View>
            <Text style={styles.horizontalText}>Notifications</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.horizontalItem}
            onPress={() => router.push('/MisAjour')}
          >
            <View style={styles.iconCircle}>
              <Ionicons name="lock-closed" size={24} color="#4CB050" />
            </View>
            <Text style={styles.horizontalText}>Sécurité</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.horizontalItem}
            onPress={() => router.push('/MisAjour')}
          >
            <View style={styles.iconCircle}>
              <Ionicons name="help-circle" size={24} color="#4CB050" />
            </View>
            <Text style={styles.horizontalText}>Aide</Text>
          </TouchableOpacity>
        </View>

        {/* Résultats de recherche */}
        {isSearching && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Résultats de recherche</Text>
            <View style={styles.sectionContent}>
              {searchResults.length > 0 ? (
                searchResults.map((item, index) => (
                  <TouchableOpacity
                    key={index}
                    style={styles.settingItem}
                    onPress={() => router.push(item.route)}
                  >
                    <View style={styles.itemLeft}>
                      <FontAwesome name={item.icon} size={18} color="#A0A6B1" style={styles.itemIcon} />
                      <View>
                        <Text style={styles.itemText}>{item.name}</Text>
                        <Text style={styles.sectionSubtitle}>{item.sectionTitle}</Text>
                      </View>
                    </View>
                    <Feather name="chevron-right" size={18} color="#3D4A5C" />
                  </TouchableOpacity>
                ))
              ) : (
                <Text style={styles.noResultsText}>Aucun résultat trouvé</Text>
              )}
            </View>
          </View>
        )}

        {/* Sections verticales (affichées quand pas de recherche) */}
        {!isSearching && settingsSections.map((section, index) => (
          <View key={index} style={styles.section}>
            <Text style={styles.sectionTitle}>{section.title}</Text>
            <View style={styles.sectionContent}>
              {section.items.map(renderSettingsItem)}
            </View>
          </View>
        ))}

        {/* Bouton déconnexion */}
        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <MaterialIcons name="logout" size={20} color="#ff6b6b" />
          <Text style={styles.logoutText}>Déconnexion</Text>
        </TouchableOpacity>

      </Animated.ScrollView>

      {/* Barre de navigation en bas - Agrandie */}
      <View style={styles.bottomNav}>
        <TouchableOpacity 
          style={styles.navItem} 
          onPress={() => router.push('/')}
        >
          <Ionicons name="home" size={24} color="#4CB050" />
          <Text style={styles.navText}>Accueil</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.navItem} 
          onPress={() => router.push('/MisAjour')}
        >
          <Ionicons name="compass" size={24} color="#A0A6B1" />
          <Text style={styles.navText}>Découvrir</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.navItem} 
          onPress={() => router.push('/MisAjour')}
        >
          <Ionicons name="people" size={24} color="#A0A6B1" />
          <Text style={styles.navText}>Réseau</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.navItem} 
          onPress={() => router.push('/MisAjour')}
        >
          <Ionicons name="notifications" size={24} color="#A0A6B1" />
          <Text style={styles.navText}>Alertes</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.navItem} 
          onPress={() => router.push('/MisAjour')}
        >
          <Ionicons name="mail" size={24} color="#A0A6B1" />
          <Text style={styles.navText}>Messages</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#202A36',
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
  },
  header: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 100,
    backgroundColor: '#2A3646',
    borderBottomWidth: 1,
    borderBottomColor: '#3D4A5C',
    paddingTop: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    height: 60,
    paddingHorizontal: 15,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#F0F2F5',
  },
  searchContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1E2A3A',
    borderRadius: 8,
    marginLeft: 15,
    paddingHorizontal: 10,
    height: 36,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    color: '#F0F2F5',
    height: 36,
    fontSize: 14,
  },
  clearButton: {
    padding: 4,
  },
  container: {
    flex: 1,
    backgroundColor: '#202A36',
  },
  contentContainer: {
    paddingTop: 60,
    paddingBottom: 80, // Augmenté pour la barre de navigation plus grande
  },
  userHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
    backgroundColor: '#2A3646',
    borderBottomWidth: 1,
    borderBottomColor: '#3D4A5C',
  },
  userAvatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    marginRight: 12,
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#F0F2F5',
    marginBottom: 4,
  },
  userEmail: {
    fontSize: 14,
    color: '#A0A6B1',
  },
  editButton: {
    padding: 6,
  },
  horizontalSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: '#2A3646',
    padding: 15,
    marginBottom: 10,
  },
  horizontalItem: {
    alignItems: 'center',
    flex: 1,
  },
  iconCircle: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#1E2A3A',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  horizontalText: {
    fontSize: 14,
    color: '#F0F2F5',
    textAlign: 'center',
  },
  section: {
    backgroundColor: '#2A3646',
    borderRadius: 8,
    margin: 10,
    marginTop: 10,
    overflow: 'hidden',
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#A0A6B1',
    padding: 12,
    backgroundColor: '#1E2A3A',
  },
  sectionSubtitle: {
    fontSize: 12,
    color: '#65676B',
    marginTop: 2,
  },
  sectionContent: {
    paddingHorizontal: 8,
  },
  settingItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 15,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#3D4A5C',
  },
  itemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  itemIcon: {
    width: 24,
    marginRight: 12,
  },
  itemText: {
    fontSize: 16,
    color: '#F0F2F5',
  },
  logoutButton: {
    flexDirection: 'row',
    backgroundColor: '#2A3646',
    borderRadius: 8,
    padding: 15,
    justifyContent: 'center',
    alignItems: 'center',
    margin: 10,
    marginTop: 16,
  },
  logoutText: {
    color: '#ff6b6b',
    fontWeight: 'bold',
    marginLeft: 10,
    fontSize: 16,
  },
  noResultsText: {
    color: '#A0A6B1',
    textAlign: 'center',
    paddingVertical: 20,
  },
  footer: {
    padding: 16,
    alignItems: 'center',
  },
  footerText: {
    color: '#65676B',
    fontSize: 12,
    marginBottom: 4,
  },
  bottomNav: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#2A3646',
    flexDirection: 'row',
    justifyContent: 'space-around',
    borderTopWidth: 1,
    borderTopColor: '#3D4A5C',
    paddingTop: 12,
    paddingBottom: Platform.OS === 'ios' ? 24 : 12,
    height: 70, // Augmenté la hauteur
  },
  navItem: {
    alignItems: 'center',
    paddingHorizontal: 8,
    flex: 1,
  },
  navText: {
    color: '#A0A6B1',
    fontSize: 12,
    marginTop: 6,
    fontWeight: '500',
  },
});

export default SettingsScreen;