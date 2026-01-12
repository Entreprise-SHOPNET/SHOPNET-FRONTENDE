

// app/(tabs)/Auth/Boutique/CreerBoutique.tsx
// app/(tabs)/Auth/Boutique/CreerBoutique.tsx
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
  StatusBar,
  Dimensions,
  TextInput,
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Platform,
  BackHandler,
  Modal,
  FlatList,
} from "react-native";
import { useRouter } from 'expo-router';
import { 
  MaterialIcons, 
  Ionicons, 
  MaterialCommunityIcons,
} from "@expo/vector-icons";
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");
const SHOPNET_BLUE = "#00182A";
const PREMIUM_GOLD = "#FFA726";
const SUCCESS_GREEN = "#4CAF50";
const ERROR_RED = "#F44336";
const PRO_BLUE = "#42A5F5";
const LIGHT_BLUE = "#64B5F6";
const DARK_GOLD = "#FF8F00";

// Types de boutique disponibles
const BOUTIQUE_TYPES = [
  { id: 'fashion', icon: 'tshirt-crew', label: 'Mode & Vêtements', color: '#FF6B8B' },
  { id: 'electronics', icon: 'laptop', label: 'Électronique', color: '#4ECDC4' },
  { id: 'food', icon: 'food-apple', label: 'Alimentation', color: '#FFD166' },
  { id: 'beauty', icon: 'spa', label: 'Beauté & Cosmétique', color: '#EF476F' },
  { id: 'home', icon: 'home', label: 'Maison & Déco', color: '#118AB2' },
  { id: 'sports', icon: 'dumbbell', label: 'Sports & Loisirs', color: '#06D6A0' },
  { id: 'books', icon: 'book-open-variant', label: 'Livres & Éducation', color: '#7209B7' },
  { id: 'art', icon: 'palette', label: 'Art & Artisanat', color: '#F15BB5' },
  { id: 'auto', icon: 'car', label: 'Auto & Moto', color: '#00BBF9' },
  { id: 'health', icon: 'medical-bag', label: 'Santé & Bien-être', color: '#84DCC6' },
];

// Catégories par type
const CATEGORIES_BY_TYPE = {
  'fashion': ['Vêtements Femmes', 'Vêtements Hommes', 'Accessoires', 'Chaussures', 'Bijoux', 'Lingerie', 'Enfants'],
  'electronics': ['Téléphones', 'Ordinateurs', 'TV & Vidéo', 'Audio', 'Jeux Vidéo', 'Électroménager', 'Accessoires'],
  'food': ['Épicerie', 'Restaurant', 'Boulangerie', 'Traiteur', 'Boissons', 'Bio', 'Snacks'],
  'beauty': ['Maquillage', 'Soins Visage', 'Soins Corps', 'Parfums', 'Coiffure', 'Onglerie', 'Homme'],
  'home': ['Meubles', 'Décoration', 'Cuisine', 'Jardin', 'Luminaire', 'Textile', 'Bricolage'],
  'sports': ['Fitness', 'Randonnée', 'Cyclisme', 'Foot', 'Natation', 'Camping', 'Sport Collectif'],
  'books': ['Romans', 'BD & Manga', 'Éducation', 'Business', 'Enfants', 'Cuisine', 'Développement Perso'],
  'art': ['Peinture', 'Sculpture', 'Photographie', 'DIY', 'Musique', 'Théâtre', 'Danse'],
  'auto': ['Pièces Auto', 'Accessoires', 'Entretien', 'Moto', 'Vélos', 'Équipement', 'GPS'],
  'health': ['Médicaments', 'Compléments', 'Équipement Médical', 'Maman-Bébé', 'Orthopédie', 'Soins Dentaires'],
};

export default function CreerBoutique() {
  const router = useRouter();
  
  // États
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [locationPermission, setLocationPermission] = useState(false);
  const [isGettingLocation, setIsGettingLocation] = useState(false);
  const [locationInfo, setLocationInfo] = useState<any>(null);
  const [notification, setNotification] = useState<{
    visible: boolean;
    message: string;
    type: 'success' | 'error' | 'info';
  }>({ visible: false, message: '', type: 'info' });
  
  // Données du formulaire
  const [formData, setFormData] = useState({
    nom: '',
    type: '',
    categorie: '',
    description: '',
    logo: null as string | null,
    email: '',
    phone: '',
    adresse: '',
    ville: '',
    pays: 'RDC',
    codePostal: '',
    latitude: 0,
    longitude: 0,
  });
  
  // États d'interface
  const [showTypeModal, setShowTypeModal] = useState(false);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [descriptionLength, setDescriptionLength] = useState(0);
  
  // Fonction pour afficher une notification
  const showNotification = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
    setNotification({ visible: true, message, type });
    
    // Masquer automatiquement après 3 secondes
    setTimeout(() => {
      setNotification({ ...notification, visible: false });
    }, 3000);
  };
  
  // Initialisation
  useEffect(() => {
    checkLocationPermission();
    
    const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
      if (currentStep > 1) {
        handlePrevStep();
        return true;
      }
      return false;
    });
    
    return () => backHandler.remove();
  }, []);
  
  // Vérifier la permission de localisation
  const checkLocationPermission = async () => {
    try {
      const { status } = await Location.getForegroundPermissionsAsync();
      setLocationPermission(status === 'granted');
    } catch (error) {
      console.log('Erreur vérification permission:', error);
    }
  };
  
  // Demander la permission de localisation
  const requestLocationPermission = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      setLocationPermission(status === 'granted');
      return status === 'granted';
    } catch (error) {
      console.log('Erreur permission location:', error);
      showNotification('Erreur lors de la demande de permission de localisation', 'error');
      return false;
    }
  };
  
  // Utiliser la localisation actuelle
  const useCurrentLocation = async () => {
    setIsGettingLocation(true);
    
    try {
      let hasPermission = locationPermission;
      if (!hasPermission) {
        hasPermission = await requestLocationPermission();
      }
      
      if (!hasPermission) {
        showNotification('Permission de localisation requise pour remplir automatiquement votre adresse', 'error');
        return;
      }
      
      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      
      const addresses = await Location.reverseGeocodeAsync({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      });
      
      if (addresses.length > 0) {
        const address = addresses[0];
        const locationData = {
          city: address.city || '',
          country: address.country || 'RDC',
          region: address.region || '',
          postalCode: address.postalCode || '',
          street: address.street || '',
          name: address.name || '',
        };
        
        setLocationInfo(locationData);
        
        const streetAddress = [address.street, address.name].filter(Boolean).join(' ');
        
        setFormData(prev => ({
          ...prev,
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
          adresse: streetAddress.trim(),
          ville: address.city || prev.ville,
          pays: address.country || prev.pays,
          codePostal: address.postalCode || prev.codePostal,
        }));
        
        const villeMsg = address.city || 'Non détectée';
        const paysMsg = address.country || 'Non détecté';
        showNotification(`Localisation récupérée: Ville: ${villeMsg}, Pays: ${paysMsg}`, 'success');
      } else {
        showNotification('Adresse non trouvée pour cette position', 'info');
      }
    } catch (error) {
      console.log('Erreur localisation:', error);
      showNotification('Impossible de récupérer votre position', 'error');
    } finally {
      setIsGettingLocation(false);
    }
  };
  
  // Choisir une image depuis la galerie
  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    
    if (status !== 'granted') {
      showNotification('Vous devez autoriser l\'accès à la galerie pour ajouter un logo', 'error');
      return;
    }
    
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.8,
    });
    
    if (!result.canceled && result.assets[0]) {
      setFormData(prev => ({ ...prev, logo: result.assets[0].uri }));
      showNotification('Logo ajouté avec succès', 'success');
    }
  };
  
  // Prendre une photo
  const takePhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    
    if (status !== 'granted') {
      showNotification('Vous devez autoriser l\'accès à la caméra pour prendre une photo', 'error');
      return;
    }
    
    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.8,
    });
    
    if (!result.canceled && result.assets[0]) {
      setFormData(prev => ({ ...prev, logo: result.assets[0].uri }));
      showNotification('Photo prise avec succès', 'success');
    }
  };
  
  // Valider l'étape 1
  const validateStep1 = () => {
    const newErrors: Record<string, string> = {};
    
    if (!formData.nom.trim()) {
      newErrors.nom = 'Le nom de la boutique est requis';
    } else if (formData.nom.length < 3) {
      newErrors.nom = 'Le nom doit contenir au moins 3 caractères';
    }
    
    if (!formData.type) {
      newErrors.type = 'Le type de boutique est requis';
    }
    
    if (!formData.categorie) {
      newErrors.categorie = 'La catégorie est requise';
    }
    
    if (!formData.description.trim()) {
      newErrors.description = 'La description est requise';
    } else if (formData.description.length < 70) {
      newErrors.description = `La description doit contenir au moins 70 caractères (${formData.description.length}/70)`;
    }
    
    if (!formData.email.trim()) {
      newErrors.email = 'L\'email est requis';
    } else {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(formData.email)) {
        newErrors.email = 'Format d\'email invalide';
      }
    }
    
    if (!formData.phone.trim()) {
      newErrors.phone = 'Le téléphone est requis';
    } else if (formData.phone.length < 8) {
      newErrors.phone = 'Numéro de téléphone invalide';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };
  
  // Valider l'étape 2
  const validateStep2 = () => {
    const newErrors: Record<string, string> = {};
    
    if (!formData.adresse.trim()) {
      newErrors.adresse = 'L\'adresse est requise';
    }
    
    if (!formData.ville.trim()) {
      newErrors.ville = 'La ville est requise';
    }
    
    if (!formData.pays.trim()) {
      newErrors.pays = 'Le pays est requis';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };
  
  // Aller à l'étape suivante
  const handleNextStep = () => {
    if (currentStep === 1 && !validateStep1()) {
      showNotification('Veuillez corriger les erreurs dans le formulaire', 'error');
      return;
    }
    
    if (currentStep === 2 && !validateStep2()) {
      showNotification('Veuillez corriger les erreurs dans le formulaire', 'error');
      return;
    }
    
    if (currentStep === 3) {
      handleSubmit();
      return;
    }
    
    setCurrentStep(prev => prev + 1);
    setErrors({});
  };
  
  // Revenir à l'étape précédente
  const handlePrevStep = () => {
    if (currentStep === 1) {
      router.back();
      return;
    }
    
    setCurrentStep(prev => prev - 1);
    setErrors({});
  };
  
  // Soumettre le formulaire
  const handleSubmit = async () => {
    setLoading(true);

    try {
      const token = await AsyncStorage.getItem('userToken');
      if (!token) {
        showNotification('Veuillez vous reconnecter', 'error');
        router.replace('/Auth/auth');
        return;
      }

      // Créer FormData
      const formDataToSend = new FormData();

      // Ajouter toutes les données texte
      formDataToSend.append('nom', formData.nom);
      formDataToSend.append('type', 'premium');
      formDataToSend.append('type_boutique', formData.type);
      formDataToSend.append('categorie', formData.categorie);
      formDataToSend.append('description', formData.description);
      formDataToSend.append('email', formData.email);
      formDataToSend.append('phone', formData.phone);
      formDataToSend.append('adresse', formData.adresse);
      formDataToSend.append('ville', formData.ville);
      formDataToSend.append('pays', formData.pays);
      formDataToSend.append('codePostal', formData.codePostal || '');
      formDataToSend.append('latitude', String(formData.latitude || ''));
      formDataToSend.append('longitude', String(formData.longitude || ''));
      formDataToSend.append('statut', 'pending');
      formDataToSend.append('prix', '9.99');

      // Ajouter l'image si elle existe
      if (formData.logo) {
        const filename = formData.logo.split('/').pop() || `logo_${Date.now()}.jpg`;
        const match = /\.(\w+)$/.exec(filename);
        const fileType = match ? `image/${match[1]}` : 'image/jpeg';

        formDataToSend.append('logo', {
          uri: formData.logo,
          name: filename,
          type: fileType,
        } as any);
      }

      // Envoyer les données au backend
      const response = await fetch('https://shopnet-backend.onrender.com/api/boutique/premium/create', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        body: formDataToSend,
      });

      const responseText = await response.text();
      console.log('Réponse brute:', responseText);

      let result;
      try {
        result = JSON.parse(responseText);
      } catch (e) {
        console.error('Erreur de parsing JSON:', e);
        showNotification('Réponse invalide du serveur', 'error');
        return;
      }

      if (response.ok && result.success) {
        // Stocker l'ID de la boutique et toutes les données
        const boutiqueId = String(result.boutiqueId || result.id || result.data?.id);
        await AsyncStorage.setItem('currentBoutiqueId', boutiqueId);
        await AsyncStorage.setItem('premiumBoutiqueCreated', 'true');
        
        // Stocker aussi les données de la boutique
        const boutiqueData = {
          id: boutiqueId,
          nom: formData.nom,
          type: formData.type,
          categorie: formData.categorie,
          email: formData.email,
          phone: formData.phone,
          ville: formData.ville,
          pays: formData.pays,
          adresse: formData.adresse,
          logo: formData.logo,
        };
        await AsyncStorage.setItem('currentBoutiqueData', JSON.stringify(boutiqueData));

        // Afficher notification de succès
        showNotification('Boutique premium créée avec succès ! Redirection...', 'success');
        
        // Rediriger vers la page de paiement avec TOUTES les données
        setTimeout(() => {
          router.push({
            pathname: '/(tabs)/Auth/Boutique/Premium/PayerPremium',
            params: { 
              boutiqueId: boutiqueId,
              boutiqueNom: formData.nom,
              boutiqueType: formData.type,
              boutiqueCategorie: formData.categorie,
              boutiqueVille: formData.ville,
              boutiquePays: formData.pays,
              boutiqueEmail: formData.email,
              boutiquePhone: formData.phone,
              boutiqueAdresse: formData.adresse,
              isNewBoutique: 'true'
            }
          });
        }, 1500);
      } else {
        const errorMessage = result.message || result.error || 'Erreur lors de la création de la boutique';
        console.log('Erreur du serveur:', errorMessage);
        showNotification(errorMessage, 'error');
      }
    } catch (error: any) {
      console.log('Erreur création boutique:', error);
      showNotification(error.message || 'Impossible de créer la boutique. Veuillez réessayer.', 'error');
    } finally {
      setLoading(false);
    }
  };
 
  // Rendu des étapes du stepper
  const renderStepper = () => {
    const steps = [
      { number: 1, label: 'Informations', icon: 'info' },
      { number: 2, label: 'Localisation', icon: 'location-on' },
      { number: 3, label: 'Confirmation', icon: 'check-circle' },
    ];
    
    return (
      <View style={styles.stepperContainer}>
        {steps.map((step, index) => (
          <React.Fragment key={step.number}>
            <View style={styles.stepItem}>
              <View style={[
                styles.stepCircle,
                currentStep >= step.number 
                  ? styles.stepCircleActive 
                  : styles.stepCircleInactive
              ]}>
                {currentStep > step.number ? (
                  <MaterialIcons name="check" size={18} color="#fff" />
                ) : (
                  <MaterialIcons name={step.icon} size={18} color={
                    currentStep >= step.number ? "#fff" : "rgba(255,255,255,0.5)"
                  } />
                )}
              </View>
              <Text style={[
                styles.stepLabel,
                currentStep >= step.number 
                  ? styles.stepLabelActive 
                  : styles.stepLabelInactive
              ]}>
                {step.label}
              </Text>
            </View>
            
            {index < steps.length - 1 && (
              <View style={[
                styles.stepLine,
                currentStep > step.number 
                  ? styles.stepLineActive 
                  : styles.stepLineInactive
              ]} />
            )}
          </React.Fragment>
        ))}
      </View>
    );
  };
  
  // Étape 1: Informations de base
  const renderStep1 = () => (
    <View style={styles.stepContainer}>
      <Text style={styles.stepTitle}>Informations de votre boutique</Text>
      
      {/* Logo */}
      <View style={styles.formGroup}>
        <Text style={styles.label}>
          Logo de la boutique <Text style={styles.optional}>(Format horizontal recommandé)</Text>
        </Text>
        
        {formData.logo ? (
          <View style={styles.logoPreviewContainer}>
            <Image source={{ uri: formData.logo }} style={styles.logoPreviewHorizontal} />
            <TouchableOpacity 
              style={styles.changeLogoButton}
              onPress={() => setFormData({ ...formData, logo: null })}
            >
              <MaterialIcons name="close" size={20} color="#fff" />
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.logoButtons}>
            <TouchableOpacity style={styles.logoButton} onPress={takePhoto}>
              <MaterialIcons name="camera-alt" size={24} color={PREMIUM_GOLD} />
              <Text style={styles.logoButtonText}>Prendre une photo</Text>
              <Text style={styles.logoFormatText}>Format horizontal</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.logoButton} onPress={pickImage}>
              <MaterialIcons name="photo-library" size={24} color={PREMIUM_GOLD} />
              <Text style={styles.logoButtonText}>Choisir un logo</Text>
              <Text style={styles.logoFormatText}>Format horizontal</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
      
      {/* Nom */}
      <View style={styles.formGroup}>
        <Text style={styles.label}>
          Nom de la boutique <Text style={styles.required}>*</Text>
        </Text>
        <TextInput
          style={[styles.input, errors.nom && styles.inputError]}
          placeholder="Ex: Fashion Store Kinshasa"
          placeholderTextColor="rgba(255,255,255,0.4)"
          value={formData.nom}
          onChangeText={(text) => {
            setFormData({ ...formData, nom: text });
            if (errors.nom) setErrors({ ...errors, nom: '' });
          }}
          maxLength={50}
        />
        {errors.nom ? (
          <Text style={styles.errorText}>{errors.nom}</Text>
        ) : (
          <Text style={styles.hintText}>50 caractères maximum</Text>
        )}
      </View>
      
      {/* Type de boutique */}
      <View style={styles.formGroup}>
        <Text style={styles.label}>
          Type de boutique <Text style={styles.required}>*</Text>
        </Text>
        <TouchableOpacity
          style={[styles.selectInput, errors.type && styles.inputError]}
          onPress={() => setShowTypeModal(true)}
        >
          <Text style={formData.type ? styles.selectText : styles.selectPlaceholder}>
            {formData.type 
              ? BOUTIQUE_TYPES.find(t => t.id === formData.type)?.label
              : 'Sélectionnez un type'}
          </Text>
          <MaterialIcons name="arrow-drop-down" size={24} color="rgba(255,255,255,0.7)" />
        </TouchableOpacity>
        {errors.type && <Text style={styles.errorText}>{errors.type}</Text>}
      </View>
      
      {/* Catégorie */}
      {formData.type && (
        <View style={styles.formGroup}>
          <Text style={styles.label}>
            Catégorie principale <Text style={styles.required}>*</Text>
          </Text>
          <TouchableOpacity
            style={[styles.selectInput, errors.categorie && styles.inputError]}
            onPress={() => setShowCategoryModal(true)}
          >
            <Text style={formData.categorie ? styles.selectText : styles.selectPlaceholder}>
              {formData.categorie || 'Sélectionnez une catégorie'}
            </Text>
            <MaterialIcons name="arrow-drop-down" size={24} color="rgba(255,255,255,0.7)" />
          </TouchableOpacity>
          {errors.categorie && <Text style={styles.errorText}>{errors.categorie}</Text>}
        </View>
      )}
      
      {/* Description */}
      <View style={styles.formGroup}>
        <Text style={styles.label}>
          Description <Text style={styles.required}>*</Text>
        </Text>
        <TextInput
          style={[styles.textarea, errors.description && styles.inputError]}
          placeholder="Décrivez votre boutique, vos produits, votre philosophie..."
          placeholderTextColor="rgba(255,255,255,0.4)"
          value={formData.description}
          onChangeText={(text) => {
            setFormData({ ...formData, description: text });
            setDescriptionLength(text.length);
            if (errors.description) setErrors({ ...errors, description: '' });
          }}
          multiline
          numberOfLines={4}
          maxLength={500}
        />
        <View style={styles.textareaFooter}>
          <Text style={[
            styles.charCount,
            descriptionLength < 70 ? styles.charCountError : styles.charCountSuccess
          ]}>
            {descriptionLength}/70
          </Text>
          <Text style={styles.hintText}>Minimum 70 caractères</Text>
        </View>
        {errors.description && <Text style={styles.errorText}>{errors.description}</Text>}
      </View>
      
      {/* Email */}
      <View style={styles.formGroup}>
        <Text style={styles.label}>
          Email de contact <Text style={styles.required}>*</Text>
        </Text>
        <TextInput
          style={[styles.input, errors.email && styles.inputError]}
          placeholder="contact@votreboutique.cd"
          placeholderTextColor="rgba(255,255,255,0.4)"
          value={formData.email}
          onChangeText={(text) => {
            setFormData({ ...formData, email: text });
            if (errors.email) setErrors({ ...errors, email: '' });
          }}
          keyboardType="email-address"
          autoCapitalize="none"
        />
        {errors.email && <Text style={styles.errorText}>{errors.email}</Text>}
      </View>
      
      {/* Téléphone */}
      <View style={styles.formGroup}>
        <Text style={styles.label}>
          Téléphone <Text style={styles.required}>*</Text>
        </Text>
        <TextInput
          style={[styles.input, errors.phone && styles.inputError]}
          placeholder="+243 81 00 00 000"
          placeholderTextColor="rgba(255,255,255,0.4)"
          value={formData.phone}
          onChangeText={(text) => {
            setFormData({ ...formData, phone: text });
            if (errors.phone) setErrors({ ...errors, phone: '' });
          }}
          keyboardType="phone-pad"
        />
        {errors.phone && <Text style={styles.errorText}>{errors.phone}</Text>}
      </View>
    </View>
  );
  
  // Étape 2: Localisation
  const renderStep2 = () => (
    <View style={styles.stepContainer}>
      <Text style={styles.stepTitle}>Localisation de votre boutique</Text>
      
      <View style={styles.locationHelpCard}>
        <MaterialIcons name="info" size={20} color={PRO_BLUE} />
        <Text style={styles.locationHelpText}>
          Votre adresse sera utilisée pour afficher votre boutique aux clients proches.
        </Text>
      </View>
      
      {/* Bouton localisation actuelle */}
      <TouchableOpacity 
        style={[
          styles.locationButton,
          isGettingLocation && styles.locationButtonDisabled
        ]} 
        onPress={useCurrentLocation}
        disabled={isGettingLocation}
      >
        {isGettingLocation ? (
          <ActivityIndicator size="small" color="#fff" />
        ) : (
          <>
            <MaterialIcons name="my-location" size={20} color="#fff" />
            <Text style={styles.locationButtonText}>Utiliser ma position actuelle</Text>
          </>
        )}
      </TouchableOpacity>
      
      {/* Affichage des informations de localisation */}
      {locationInfo && (
        <View style={styles.locationInfoCard}>
          <View style={styles.locationInfoHeader}>
            <MaterialIcons name="location-on" size={20} color={SUCCESS_GREEN} />
            <Text style={styles.locationInfoTitle}>Position détectée</Text>
          </View>
          <View style={styles.locationInfoContent}>
            {locationInfo.city && (
              <View style={styles.locationInfoRow}>
                <Text style={styles.locationInfoLabel}>Ville:</Text>
                <Text style={styles.locationInfoValue}>{locationInfo.city}</Text>
              </View>
            )}
            {locationInfo.country && (
              <View style={styles.locationInfoRow}>
                <Text style={styles.locationInfoLabel}>Pays:</Text>
                <Text style={styles.locationInfoValue}>{locationInfo.country}</Text>
              </View>
            )}
            {locationInfo.postalCode && (
              <View style={styles.locationInfoRow}>
                <Text style={styles.locationInfoLabel}>Code postal:</Text>
                <Text style={styles.locationInfoValue}>{locationInfo.postalCode}</Text>
              </View>
            )}
          </View>
        </View>
      )}
      
      {/* Adresse */}
      <View style={styles.formGroup}>
        <Text style={styles.label}>
          Adresse complète <Text style={styles.required}>*</Text>
        </Text>
        <TextInput
          style={[styles.input, errors.adresse && styles.inputError]}
          placeholder="Numéro, rue, quartier"
          placeholderTextColor="rgba(255,255,255,0.4)"
          value={formData.adresse}
          onChangeText={(text) => {
            setFormData({ ...formData, adresse: text });
            if (errors.adresse) setErrors({ ...errors, adresse: '' });
          }}
        />
        {errors.adresse && <Text style={styles.errorText}>{errors.adresse}</Text>}
      </View>
      
      {/* Ville */}
      <View style={styles.formGroup}>
        <Text style={styles.label}>
          Ville <Text style={styles.required}>*</Text>
        </Text>
        <TextInput
          style={[styles.input, errors.ville && styles.inputError]}
          placeholder="Ex: Kinshasa, Goma, Lubumbashi"
          placeholderTextColor="rgba(255,255,255,0.4)"
          value={formData.ville}
          onChangeText={(text) => {
            setFormData({ ...formData, ville: text });
            if (errors.ville) setErrors({ ...errors, ville: '' });
          }}
        />
        {errors.ville && <Text style={styles.errorText}>{errors.ville}</Text>}
      </View>
      
      {/* Pays et Code Postal */}
      <View style={styles.rowGroup}>
        <View style={[styles.formGroup, { flex: 1, marginRight: 10 }]}>
          <Text style={styles.label}>Pays</Text>
          <TextInput
            style={styles.input}
            placeholder="Ex: RDC"
            placeholderTextColor="rgba(255,255,255,0.4)"
            value={formData.pays}
            onChangeText={(text) => setFormData({ ...formData, pays: text })}
          />
        </View>
        
        <View style={[styles.formGroup, { flex: 1 }]}>
          <Text style={styles.label}>Code postal</Text>
          <TextInput
            style={styles.input}
            placeholder="Code postal"
            placeholderTextColor="rgba(255,255,255,0.4)"
            value={formData.codePostal}
            onChangeText={(text) => setFormData({ ...formData, codePostal: text })}
            keyboardType="number-pad"
          />
        </View>
      </View>
      
      <View style={styles.tipCard}>
        <MaterialIcons name="lightbulb" size={18} color={PREMIUM_GOLD} />
        <Text style={styles.tipText}>
          Pour une meilleure visibilité, assurez-vous que votre adresse est précise.
        </Text>
      </View>
    </View>
  );
  
  // Étape 3: Récapitulatif Premium
  const renderStep3 = () => {
    const typeLabel = BOUTIQUE_TYPES.find(t => t.id === formData.type)?.label || 'Non défini';
    const typeColor = BOUTIQUE_TYPES.find(t => t.id === formData.type)?.color || PREMIUM_GOLD;
    
    const summarySections = [
      {
        title: "Logo & Identité",
        icon: "store",
        color: PREMIUM_GOLD,
        items: [
          {
            label: "Logo",
            value: formData.logo ? "✓ Ajouté (Format horizontal)" : "Non ajouté",
            icon: "image",
            color: formData.logo ? SUCCESS_GREEN : "rgba(255,255,255,0.5)"
          },
          {
            label: "Nom de la boutique",
            value: formData.nom || "Non défini",
            icon: "storefront",
            color: LIGHT_BLUE
          }
        ]
      },
      {
        title: "Catégorisation",
        icon: "category",
        color: typeColor,
        items: [
          {
            label: "Type",
            value: typeLabel,
            icon: "style",
            color: typeColor
          },
          {
            label: "Catégorie",
            value: formData.categorie || "Non définie",
            icon: "label",
            color: PRO_BLUE
          }
        ]
      },
      {
        title: "Description",
        icon: "description",
        color: "#9C27B0",
        items: [
          {
            label: "Description",
            value: formData.description 
              ? (formData.description.length > 100 
                ? `${formData.description.substring(0, 100)}...` 
                : formData.description)
              : "Non définie",
            icon: "subject",
            color: "#9C27B0",
            multiline: true
          }
        ]
      },
      {
        title: "Contact",
        icon: "contact-mail",
        color: "#00BCD4",
        items: [
          {
            label: "Email",
            value: formData.email || "Non défini",
            icon: "email",
            color: "#00BCD4"
          },
          {
            label: "Téléphone",
            value: formData.phone || "Non défini",
            icon: "phone",
            color: "#4CAF50"
          }
        ]
      },
      {
        title: "Localisation",
        icon: "location-on",
        color: "#FF5722",
        items: [
          {
            label: "Adresse",
            value: formData.adresse || "Non définie",
            icon: "home",
            color: "#FF5722"
          },
          {
            label: "Ville",
            value: formData.ville || "Non définie",
            icon: "location-city",
            color: "#2196F3"
          },
          {
            label: "Pays",
            value: formData.pays || "Non défini",
            icon: "public",
            color: "#3F51B5"
          },
          ...(formData.codePostal ? [{
            label: "Code postal",
            value: formData.codePostal,
            icon: "markunread-mailbox",
            color: "#009688"
          }] : [])
        ]
      },
      {
        title: "Abonnement Premium",
        icon: "star",
        color: PREMIUM_GOLD,
        items: [
          {
            label: "Type",
            value: "Boutique Premium",
            icon: "stars",
            color: PREMIUM_GOLD
          },
          {
            label: "Prix mensuel",
            value: "9.99 USD",
            icon: "payments",
            color: SUCCESS_GREEN
          },
          {
            label: "Statut initial",
            value: "En attente de paiement",
            icon: "pending",
            color: "#FF9800"
          }
        ]
      }
    ];
    
    return (
      <View style={styles.stepContainer}>
        {/* En-tête premium */}
        <View style={styles.premiumHeader}>
          <View style={styles.premiumHeaderIcon}>
            <MaterialIcons name="stars" size={32} color={PREMIUM_GOLD} />
          </View>
          <Text style={styles.premiumHeaderTitle}>Récapitulatif Premium</Text>
          <Text style={styles.premiumHeaderSubtitle}>
            Vérifiez les informations avant de créer votre boutique premium
          </Text>
        </View>
        
        {/* Carte de statut */}
        <View style={styles.statusCard}>
          <View style={styles.statusIconContainer}>
            <MaterialIcons name="pending" size={28} color="#FF9800" />
          </View>
          <View style={styles.statusContent}>
            <Text style={styles.statusTitle}>Boutique Premium</Text>
            <Text style={styles.statusText}>
              Après création, vous serez redirigé vers la page de paiement (9.99 USD/mois)
            </Text>
          </View>
        </View>
        
        {/* Sections du récapitulatif */}
        <ScrollView 
          style={styles.summaryScrollView}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.summaryScrollContent}
        >
          {summarySections.map((section, sectionIndex) => (
            <View key={sectionIndex} style={styles.summarySection}>
              {/* En-tête de section */}
              <View style={styles.sectionHeader}>
                <View style={[styles.sectionIcon, { backgroundColor: `${section.color}20` }]}>
                  <MaterialIcons name={section.icon} size={20} color={section.color} />
                </View>
                <Text style={styles.sectionTitle}>{section.title}</Text>
              </View>
              
              {/* Contenu de la section */}
              <View style={styles.sectionContent}>
                {section.items.map((item, itemIndex) => (
                  <View key={itemIndex} style={styles.summaryItem}>
                    <View style={styles.itemIconContainer}>
                      <View style={[styles.itemIcon, { backgroundColor: `${item.color}20` }]}>
                        <MaterialIcons name={item.icon} size={16} color={item.color} />
                      </View>
                    </View>
                    <View style={styles.itemContent}>
                      <Text style={styles.itemLabel}>{item.label}</Text>
                      <Text 
                        style={[
                          styles.itemValue,
                          item.multiline && styles.multilineValue
                        ]}
                        numberOfLines={item.multiline ? 3 : 1}
                      >
                        {item.value}
                      </Text>
                    </View>
                  </View>
                ))}
              </View>
            </View>
          ))}
          
          {/* Carte de vérification finale */}
          <View style={styles.finalCheckCard}>
            <View style={styles.finalCheckHeader}>
              <MaterialIcons name="checklist" size={24} color={PREMIUM_GOLD} />
              <Text style={styles.finalCheckTitle}>Vérification finale</Text>
            </View>
            <View style={styles.finalCheckItems}>
              <View style={styles.finalCheckItem}>
                <MaterialIcons name="check-circle" size={18} color={SUCCESS_GREEN} />
                <Text style={styles.finalCheckText}>Toutes les informations sont complètes</Text>
              </View>
              <View style={styles.finalCheckItem}>
                <MaterialIcons name="check-circle" size={18} color={SUCCESS_GREEN} />
                <Text style={styles.finalCheckText}>Données prêtes à être envoyées</Text>
              </View>
              <View style={styles.finalCheckItem}>
                <MaterialIcons name="check-circle" size={18} color={SUCCESS_GREEN} />
                <Text style={styles.finalCheckText}>Redirection vers paiement après création</Text>
              </View>
            </View>
          </View>
          
          {/* Conditions */}
          <View style={styles.termsPremiumCard}>
            <MaterialIcons name="security" size={20} color={PRO_BLUE} />
            <Text style={styles.termsPremiumText}>
              En créant votre boutique premium, vous acceptez de payer 9.99 USD/mois et nos conditions d'utilisation.
            </Text>
          </View>
        </ScrollView>
      </View>
    );
  };
  
  // Modal pour sélectionner le type
  const renderTypeModal = () => (
    <Modal
      visible={showTypeModal}
      transparent
      animationType="slide"
      onRequestClose={() => setShowTypeModal(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Type de boutique</Text>
            <TouchableOpacity onPress={() => setShowTypeModal(false)}>
              <MaterialIcons name="close" size={24} color="#fff" />
            </TouchableOpacity>
          </View>
          
          <FlatList
            data={BOUTIQUE_TYPES}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={[
                  styles.typeItem,
                  formData.type === item.id && styles.typeItemSelected
                ]}
                onPress={() => {
                  setFormData({ 
                    ...formData, 
                    type: item.id,
                    categorie: ''
                  });
                  setShowTypeModal(false);
                }}
              >
                <View style={[styles.typeIcon, { backgroundColor: item.color }]}>
                  <MaterialCommunityIcons name={item.icon} size={24} color="#fff" />
                </View>
                <Text style={styles.typeLabel}>{item.label}</Text>
                {formData.type === item.id && (
                  <MaterialIcons name="check-circle" size={20} color={SUCCESS_GREEN} />
                )}
              </TouchableOpacity>
            )}
            contentContainerStyle={styles.modalContent}
          />
        </View>
      </View>
    </Modal>
  );
  
  // Modal pour sélectionner la catégorie
  const renderCategoryModal = () => {
    const categories = CATEGORIES_BY_TYPE[formData.type as keyof typeof CATEGORIES_BY_TYPE] || [];
    
    return (
      <Modal
        visible={showCategoryModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowCategoryModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Catégorie</Text>
              <TouchableOpacity onPress={() => setShowCategoryModal(false)}>
                <MaterialIcons name="close" size={24} color="#fff" />
              </TouchableOpacity>
            </View>
            
            <FlatList
              data={categories}
              keyExtractor={(item, index) => `${item}-${index}`}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[
                    styles.categoryItem,
                    formData.categorie === item && styles.categoryItemSelected
                  ]}
                  onPress={() => {
                    setFormData({ ...formData, categorie: item });
                    setShowCategoryModal(false);
                  }}
                >
                  <Text style={styles.categoryLabel}>{item}</Text>
                  {formData.categorie === item && (
                    <MaterialIcons name="check" size={20} color={SUCCESS_GREEN} />
                  )}
                </TouchableOpacity>
              )}
              contentContainerStyle={styles.modalContent}
            />
          </View>
        </View>
      </Modal>
    );
  };
  
  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={SHOPNET_BLUE} />
      
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity 
            style={styles.backButton}
            onPress={handlePrevStep}
          >
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
          
          <View style={styles.headerCenter}>
            <Text style={styles.headerTitle}>Créer une boutique</Text>
            <Text style={styles.headerSubtitle}>Premium • 9.99 USD/mois</Text>
          </View>
          
          <View style={styles.headerRight}>
            {loading && <ActivityIndicator size="small" color={PREMIUM_GOLD} />}
          </View>
        </View>
        
        {/* Notification */}
        {notification.visible && (
          <View 
            style={[
              styles.notification,
              notification.type === 'success' ? styles.notificationSuccess :
              notification.type === 'error' ? styles.notificationError :
              styles.notificationInfo
            ]}
          >
            <View style={styles.notificationContent}>
              <MaterialIcons 
                name={
                  notification.type === 'success' ? 'check-circle' :
                  notification.type === 'error' ? 'error' : 'info'
                } 
                size={20} 
                color="#fff" 
              />
              <Text style={styles.notificationText}>{notification.message}</Text>
            </View>
            <TouchableOpacity 
              onPress={() => setNotification({ ...notification, visible: false })}
              style={styles.notificationClose}
            >
              <MaterialIcons name="close" size={18} color="#fff" />
            </TouchableOpacity>
          </View>
        )}
        
        {/* Stepper */}
        {renderStepper()}
        
        {/* Formulaire */}
        <ScrollView 
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {currentStep === 1 && renderStep1()}
          {currentStep === 2 && renderStep2()}
          {currentStep === 3 && renderStep3()}
          
          {/* Boutons de navigation */}
          <View style={styles.navigationButtonsContainer}>
            <View style={[styles.navigationButtons, { justifyContent: currentStep > 1 ? 'space-between' : 'center' }]}>
              {currentStep > 1 && (
                <TouchableOpacity 
                  style={styles.prevButton}
                  onPress={handlePrevStep}
                  disabled={loading}
                >
                  <Ionicons name="arrow-back" size={18} color="#fff" />
                  <Text style={styles.prevButtonText}>Précédent</Text>
                </TouchableOpacity>
              )}
              
              <TouchableOpacity 
                style={[
                  styles.nextButton,
                  currentStep === 3 && styles.submitButton,
                  currentStep === 1 && styles.nextButtonFullWidth
                ]}
                onPress={handleNextStep}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <>
                    <Text style={styles.nextButtonText}>
                      {currentStep === 3 ? 'Créer' : 'Suivant'}
                    </Text>
                    {currentStep < 3 && (
                      <Ionicons name="arrow-forward" size={18} color="#fff" />
                    )}
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
          
          {/* Espace supplémentaire pour le clavier */}
          <View style={{ height: Platform.OS === 'ios' ? 100 : 50 }} />
        </ScrollView>
      </KeyboardAvoidingView>
      
      {/* Modals */}
      {renderTypeModal()}
      {renderCategoryModal()}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: SHOPNET_BLUE 
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
  },
  backButton: {
    padding: 8,
  },
  headerCenter: {
    alignItems: 'center',
  },
  headerTitle: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '700',
  },
  headerSubtitle: {
    color: PREMIUM_GOLD,
    fontSize: 12,
    fontWeight: '600',
    marginTop: 2,
  },
  headerRight: {
    width: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  notification: {
    position: 'absolute',
    top: 70,
    left: 20,
    right: 20,
    zIndex: 1000,
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  notificationSuccess: {
    backgroundColor: SUCCESS_GREEN,
  },
  notificationError: {
    backgroundColor: ERROR_RED,
  },
  notificationInfo: {
    backgroundColor: PRO_BLUE,
  },
  notificationContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  notificationText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 12,
    flex: 1,
  },
  notificationClose: {
    padding: 4,
  },
  stepperContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
    paddingHorizontal: 20,
  },
  stepItem: {
    alignItems: 'center',
  },
  stepCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 6,
  },
  stepCircleActive: {
    backgroundColor: PREMIUM_GOLD,
  },
  stepCircleInactive: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  stepLabel: {
    fontSize: 12,
    fontWeight: '600',
  },
  stepLabelActive: {
    color: PREMIUM_GOLD,
  },
  stepLabelInactive: {
    color: 'rgba(255,255,255,0.4)',
  },
  stepLine: {
    width: 40,
    height: 2,
    marginHorizontal: 10,
    marginTop: -18,
  },
  stepLineActive: {
    backgroundColor: PREMIUM_GOLD,
  },
  stepLineInactive: {
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 30,
  },
  stepContainer: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 10,
  },
  stepTitle: {
    color: '#fff',
    fontSize: 24,
    fontWeight: '800',
    marginBottom: 24,
    textAlign: 'center',
  },
  formGroup: {
    marginBottom: 20,
  },
  rowGroup: {
    flexDirection: 'row',
    marginBottom: 20,
  },
  label: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  required: {
    color: ERROR_RED,
  },
  optional: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 12,
  },
  input: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    color: '#fff',
    padding: 16,
    borderRadius: 12,
    fontSize: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  inputError: {
    borderColor: ERROR_RED,
    borderWidth: 2,
  },
  textarea: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    color: '#fff',
    padding: 16,
    borderRadius: 12,
    fontSize: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
    minHeight: 120,
    textAlignVertical: 'top',
  },
  textareaFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
  },
  charCount: {
    fontSize: 12,
    fontWeight: '700',
  },
  charCountSuccess: {
    color: SUCCESS_GREEN,
  },
  charCountError: {
    color: ERROR_RED,
  },
  hintText: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 12,
  },
  errorText: {
    color: ERROR_RED,
    fontSize: 12,
    marginTop: 4,
  },
  logoButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  logoButton: {
    flex: 1,
    backgroundColor: 'rgba(255, 167, 38, 0.1)',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 167, 38, 0.3)',
  },
  logoButtonText: {
    color: PREMIUM_GOLD,
    fontSize: 12,
    fontWeight: '600',
    marginTop: 8,
  },
  logoFormatText: {
    color: 'rgba(255, 167, 38, 0.7)',
    fontSize: 10,
    marginTop: 2,
  },
  logoPreviewContainer: {
    alignItems: 'center',
    position: 'relative',
  },
  logoPreviewHorizontal: {
    width: 180,
    height: 120,
    borderRadius: 12,
    borderWidth: 3,
    borderColor: PREMIUM_GOLD,
  },
  changeLogoButton: {
    position: 'absolute',
    top: -8,
    right: 80,
    backgroundColor: ERROR_RED,
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  selectInput: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  selectText: {
    color: '#fff',
    fontSize: 16,
  },
  selectPlaceholder: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 16,
  },
  locationHelpCard: {
    backgroundColor: 'rgba(66, 165, 245, 0.1)',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(66, 165, 245, 0.3)',
  },
  locationHelpText: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: 14,
    flex: 1,
    marginLeft: 12,
    lineHeight: 20,
  },
  locationButton: {
    backgroundColor: PRO_BLUE,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 12,
    marginBottom: 20,
  },
  locationButtonDisabled: {
    backgroundColor: 'rgba(66, 165, 245, 0.5)',
  },
  locationButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  locationInfoCard: {
    backgroundColor: 'rgba(76, 175, 80, 0.1)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(76, 175, 80, 0.3)',
  },
  locationInfoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  locationInfoTitle: {
    color: SUCCESS_GREEN,
    fontSize: 16,
    fontWeight: '700',
    marginLeft: 8,
  },
  locationInfoContent: {
    gap: 8,
  },
  locationInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  locationInfoLabel: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 14,
    width: 80,
  },
  locationInfoValue: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
    flex: 1,
  },
  tipCard: {
    backgroundColor: 'rgba(255, 167, 38, 0.1)',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginTop: 10,
  },
  tipText: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 14,
    flex: 1,
    marginLeft: 12,
    lineHeight: 20,
  },
  premiumHeader: {
    alignItems: 'center',
    paddingVertical: 20,
    marginBottom: 20,
  },
  premiumHeaderIcon: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: 'rgba(255, 167, 38, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
    borderWidth: 2,
    borderColor: PREMIUM_GOLD,
  },
  premiumHeaderTitle: {
    color: '#fff',
    fontSize: 28,
    fontWeight: '800',
    marginBottom: 8,
  },
  premiumHeaderSubtitle: {
    color: PREMIUM_GOLD,
    fontSize: 14,
    textAlign: 'center',
    paddingHorizontal: 20,
  },
  statusCard: {
    backgroundColor: 'rgba(255, 167, 38, 0.1)',
    borderRadius: 16,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 25,
    borderWidth: 1,
    borderColor: 'rgba(255, 167, 38, 0.3)',
  },
  statusIconContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(255, 167, 38, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  statusContent: {
    flex: 1,
  },
  statusTitle: {
    color: PREMIUM_GOLD,
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 4,
  },
  statusText: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 13,
  },
  summaryScrollView: {
    flex: 1,
    marginBottom: 10,
  },
  summaryScrollContent: {
    paddingBottom: 20,
  },
  summarySection: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    paddingHorizontal: 5,
  },
  sectionIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  sectionTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
  },
  sectionContent: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  summaryItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.05)',
  },
  itemIconContainer: {
    marginRight: 12,
    marginTop: 2,
  },
  itemIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  itemContent: {
    flex: 1,
  },
  itemLabel: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  itemValue: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '500',
  },
  multilineValue: {
    lineHeight: 20,
    fontStyle: 'italic',
    color: 'rgba(255,255,255,0.9)',
  },
  finalCheckCard: {
    backgroundColor: 'rgba(255, 167, 38, 0.1)',
    borderRadius: 16,
    padding: 20,
    marginTop: 10,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 167, 38, 0.3)',
  },
  finalCheckHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  finalCheckTitle: {
    color: PREMIUM_GOLD,
    fontSize: 18,
    fontWeight: '700',
    marginLeft: 12,
  },
  finalCheckItems: {
    gap: 12,
  },
  finalCheckItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  finalCheckText: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: 14,
    marginLeft: 12,
    flex: 1,
  },
  termsPremiumCard: {
    backgroundColor: 'rgba(66, 165, 245, 0.1)',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'flex-start',
    borderWidth: 1,
    borderColor: 'rgba(66, 165, 245, 0.3)',
  },
  termsPremiumText: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 12,
    flex: 1,
    marginLeft: 12,
    lineHeight: 18,
  },
  navigationButtonsContainer: {
    paddingHorizontal: 20,
    marginTop: 20,
    marginBottom: 30,
  },
  navigationButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
  },
  prevButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 24,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 12,
    minWidth: 120,
    justifyContent: 'center',
  },
  prevButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  nextButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 24,
    backgroundColor: PREMIUM_GOLD,
    borderRadius: 12,
    justifyContent: 'center',
    minWidth: 120,
  },
  nextButtonFullWidth: {
    width: '100%',
  },
  submitButton: {
    backgroundColor: SUCCESS_GREEN,
  },
  nextButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
    marginRight: 8,
    textAlign: 'center',
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
    maxHeight: SCREEN_HEIGHT * 0.8,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
  },
  modalTitle: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '700',
  },
  modalContent: {
    padding: 20,
  },
  typeItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    marginBottom: 10,
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  typeItemSelected: {
    backgroundColor: 'rgba(255, 167, 38, 0.1)',
    borderWidth: 1,
    borderColor: PREMIUM_GOLD,
  },
  typeIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  typeLabel: {
    color: '#fff',
    fontSize: 16,
    flex: 1,
  },
  categoryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderRadius: 12,
    marginBottom: 8,
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  categoryItemSelected: {
    backgroundColor: 'rgba(255, 167, 38, 0.1)',
    borderWidth: 1,
    borderColor: PREMIUM_GOLD,
  },
  categoryLabel: {
    color: '#fff',
    fontSize: 16,
    flex: 1,
  },
});

