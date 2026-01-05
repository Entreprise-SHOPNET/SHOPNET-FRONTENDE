




import { useRouter } from 'expo-router';
import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  TextInput, Image, Alert, KeyboardAvoidingView,
  ActivityIndicator, Platform, Dimensions, SafeAreaView,
} from 'react-native';
import { FontAwesome, Ionicons, Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { Picker } from '@react-native-picker/picker';
import * as Location from 'expo-location';
import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';

const { width, height } = Dimensions.get('window');
// const API_URL = 'http://100.64.134.89:5000/api/products'; // Serveur LOCAL (commenté)
const API_URL = 'https://shopnet-backend.onrender.com/api/products'; // Serveur Render (production)


// Couleurs premium SHOPNET VIP
const PRIMARY_COLOR = "#00182A";
const SECONDARY_COLOR = "#42A5F5";
const PREMIUM_GOLD = "#FFD700";
const TEXT_WHITE = "#FFFFFF";
const TEXT_SECONDARY = "#A0AEC0";
const SUCCESS_GREEN = "#4CAF50";
const ERROR_RED = "#FF6B6B";
const WARNING_ORANGE = "#FFA726";
const ACCENT_PURPLE = "#9C27B0";

interface ProductFormData {
  title: string;
  description: string;
  price: string;
  originalPrice: string;
  category: string;
  condition: string;
  stock: string;
  location: string;
  deliveryOptions: string[];
}

interface ImageInfo {
  uri: string;
  name: string;
  type: string;
}

const ProductForm = () => {
  const router = useRouter();

  const [formData, setFormData] = useState<ProductFormData>({
    title: '',
    description: '',
    price: '',
    originalPrice: '',
    category: 'mode',
    condition: 'new',
    stock: '1',
    location: '',
    deliveryOptions: ['standard'],
  });

  const [images, setImages] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isPromo, setIsPromo] = useState(false);
  const [activeStep, setActiveStep] = useState(1);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [useLocation, setUseLocation] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [authToken, setAuthToken] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  const scrollViewRef = useRef<ScrollView>(null);

  const categories = [
    { label: '📱 Électronique', value: 'electronics', icon: 'mobile-alt' },
    { label: '👗 Mode & Vêtements', value: 'fashion', icon: 'tshirt' },
    { label: '🏠 Maison & Jardin', value: 'home', icon: 'home' },
    { label: '🚗 Automobile', value: 'auto', icon: 'car' },
    { label: '💄 Beauté & Santé', value: 'beauty', icon: 'spa' },
    { label: '⚽ Sports & Loisirs', value: 'sports', icon: 'futbol' },
    { label: '🎮 Jeux & Jouets', value: 'games', icon: 'gamepad' },
    { label: '📚 Livres & Éducation', value: 'books', icon: 'book' },
  ];

  const conditions = [
    { label: '🌟 Neuf avec étiquette', value: 'new', icon: 'certificate' },
    { label: '✨ Comme neuf', value: 'like_new', icon: 'star' },
    { label: '✅ Bon état', value: 'good', icon: 'check-circle' },
    { label: '🔄 Satisfaisant', value: 'satisfactory', icon: 'sync-alt' },
  ];

  const deliveryOptions = [
    { label: '🚚 Livraison standard', value: 'standard', icon: 'truck' },
    { label: '⚡ Livraison express', value: 'express', icon: 'bolt' },
    { label: '🏪 Retrait en magasin', value: 'pickup', icon: 'store' },
    { label: '✈️ Livraison internationale', value: 'international', icon: 'plane' },
  ];

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const token = await AsyncStorage.getItem('userToken');
        if (token) {
          setAuthToken(token);
        } else {
          router.push('/splash');
        }
      } catch (error) {
        console.error('Erreur de vérification du token:', error);
        router.push('/splash');
      }
    };

    checkAuth();

    (async () => {
      if (Platform.OS !== 'web') {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert('Permission requise', 'Nous avons besoin de la permission pour accéder à vos photos.');
        }
      }
    })();
  }, []);

  const handleInputChange = (name: keyof ProductFormData, value: string) => {
    setFormData(prev => ({ ...prev, [name]: value }));
    if (formErrors[name]) {
      setFormErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const pickImage = async () => {
    if (images.length >= 8) {
      Alert.alert('Maximum atteint', 'Vous ne pouvez ajouter que 8 images maximum');
      return;
    }

    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });

      if (!result.canceled && result.assets?.[0]?.uri) {
        const newImages = [...images, result.assets[0].uri];
        setImages(newImages);
      }
    } catch (error) {
      console.error('Erreur lors de la sélection de l\'image:', error);
      Alert.alert('Erreur', 'Impossible de sélectionner l\'image');
    }
  };

  const removeImage = (index: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setImages(prev => prev.filter((_, i) => i !== index));
  };

  const getLocation = async () => {
    if (Platform.OS === 'web') {
      Alert.alert('Info', 'La géolocalisation web n\'est pas implémentée dans cet exemple');
      return;
    }

    setIsLoading(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission refusée', 'Nous avons besoin de la permission pour accéder à votre position.');
        return;
      }

      const location = await Location.getCurrentPositionAsync({});
      const [place] = await Location.reverseGeocodeAsync(location.coords);

      if (place) {
        const city = place.city || place.region || 'Inconnu';
        const country =
          place.country === 'Democratic Republic of the Congo' ? 'RDC' : place.country;
        const locationString = `${city}, ${country}`;
        setFormData(prev => ({
          ...prev,
          location: locationString,
        }));
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    } catch (error) {
      console.error('Erreur de localisation:', error);
      Alert.alert('Erreur', 'Impossible d\'obtenir votre position');
    } finally {
      setIsLoading(false);
    }
  };

  const toggleLocation = () => {
    if (!useLocation) {
      getLocation();
    } else {
      setFormData(prev => ({ ...prev, location: '' }));
    }
    setUseLocation(!useLocation);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const validateStep = (step: number): boolean => {
    const errors: Record<string, string> = {};

    if (step === 1) {
      if (images.length === 0) errors.images = 'Ajoutez au moins une photo';
    }

    if (step === 2) {
      if (!formData.title.trim()) errors.title = 'Titre requis';
      else if (formData.title.length < 5) errors.title = 'Titre trop court (min 5 caractères)';

      if (!formData.description.trim()) errors.description = 'Description requise';
      else if (formData.description.length < 20) errors.description = 'Description trop courte (min 20 caractères)';
    }

    if (step === 3) {
      if (!formData.price) errors.price = 'Prix requis';
      else if (isNaN(parseFloat(formData.price))) errors.price = 'Prix invalide';

      if (isPromo && !formData.originalPrice) errors.originalPrice = 'Prix original requis';
      else if (isPromo && isNaN(parseFloat(formData.originalPrice))) errors.originalPrice = 'Prix original invalide';

      if (!formData.stock) errors.stock = 'Quantité requise';
      else if (isNaN(parseInt(formData.stock))) errors.stock = 'Quantité invalide';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleNextStep = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (validateStep(activeStep)) {
      setActiveStep(prev => prev + 1);
      scrollViewRef.current?.scrollTo({ y: 0, animated: true });
    }
  };

  const handlePrevStep = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setActiveStep(prev => prev - 1);
    scrollViewRef.current?.scrollTo({ y: 0, animated: true });
  };

  const formatPrice = (price: string) => {
    if (!price) return '';
    const numericValue = parseFloat(price);
    if (isNaN(numericValue)) return '';
    return `$${numericValue.toFixed(2)}`;
  };

  const prepareImageForUpload = async (uri: string, index: number): Promise<ImageInfo> => {
    try {
      const manipResult = await manipulateAsync(
        uri,
        [{ resize: { width: 1200 } }],
        { compress: 0.8, format: SaveFormat.JPEG }
      );

      const fileName = `product_${Date.now()}_${index}.jpg`;

      return {
        uri: manipResult.uri,
        name: fileName,
        type: 'image/jpeg',
      };
    } catch (error) {
      console.error('Erreur préparation image:', error);
      throw new Error('Erreur lors de la préparation de l\'image');
    }
  };

  const handleSubmit = async () => {
    if (!validateStep(activeStep)) return;

    if (!authToken) {
      Alert.alert('Erreur', 'Vous devez être connecté pour publier un produit');
      router.push('/splash');
      return;
    }

    setIsSubmitting(true);
    setSubmitError(null);

    try {
      const formDataToSend = new FormData();

      formDataToSend.append('title', formData.title);
      formDataToSend.append('description', formData.description);
      formDataToSend.append('price', formData.price);
      formDataToSend.append('original_price', formData.originalPrice || '');
      formDataToSend.append('category', formData.category);
      formDataToSend.append('condition', formData.condition);
      formDataToSend.append('stock', formData.stock);
      formDataToSend.append('location', formData.location || '');
      formDataToSend.append('deliveryOptions', JSON.stringify(formData.deliveryOptions));

      for (let i = 0; i < images.length; i++) {
        const imageInfo = await prepareImageForUpload(images[i], i);

        if (Platform.OS === 'web') {
          const response = await fetch(imageInfo.uri);
          const blob = await response.blob();
          formDataToSend.append('images', blob, imageInfo.name);
        } else {
          formDataToSend.append('images', {
            uri: imageInfo.uri,
            name: imageInfo.name,
            type: imageInfo.type,
          } as any);
        }
      }

      const headers: Record<string, string> = {
        Authorization: `Bearer ${authToken}`,
        Accept: 'application/json',
      };

      if (Platform.OS === 'web') {
        headers['Content-Type'] = 'multipart/form-data';
      }

      const response = await fetch(API_URL, {
        method: 'POST',
        headers,
        body: formDataToSend,
      });

      const responseData = await response.json();

      if (!response.ok) {
        throw new Error(responseData.error || 'Erreur lors de la publication');
      }

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setShowSuccess(true);

      setTimeout(() => {
        setShowSuccess(false);
        router.push('/(tabs)/Auth/Produits/Fil');
      }, 2000);
    } catch (error: any) {
      setSubmitError(error.message || 'Échec de la publication. Veuillez réessayer.');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);

      if (error.message.includes('401') || error.message.includes('token')) {
        Alert.alert('Session expirée', 'Veuillez vous reconnecter');
        await AsyncStorage.removeItem('userToken');
        router.push('/splash');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderStepIndicator = () => (
    <View style={styles.stepIndicatorContainer}>
      {[1, 2, 3].map((step) => (
        <View key={step} style={styles.stepRow}>
          <View style={[
            styles.stepCircle,
            activeStep >= step ? styles.stepCircleActive : styles.stepCircleInactive
          ]}>
            {activeStep > step ? (
              <Ionicons name="checkmark" size={20} color={TEXT_WHITE} />
            ) : (
              <Text style={styles.stepNumber}>{step}</Text>
            )}
          </View>
          <Text style={[
            styles.stepLabel,
            activeStep >= step ? styles.stepLabelActive : styles.stepLabelInactive
          ]}>
            {step === 1 ? 'Photos' : step === 2 ? 'Détails' : 'Prix'}
          </Text>
          {step < 3 && <View style={[
            styles.stepConnector,
            activeStep > step ? styles.stepConnectorActive : styles.stepConnectorInactive
          ]} />}
        </View>
      ))}
    </View>
  );

  const renderStep1 = () => (
    <View style={styles.stepContainer}>
      <View style={styles.sectionHeader}>
        <View style={styles.sectionIconContainer}>
          <Ionicons name="images" size={28} color={SECONDARY_COLOR} />
        </View>
        <View>
          <Text style={styles.sectionTitle}>Photos du produit</Text>
          <Text style={styles.sectionSubtitle}>Ajoutez jusqu'à 8 photos de qualité</Text>
        </View>
      </View>

      {formErrors.images && (
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle" size={20} color={ERROR_RED} />
          <Text style={styles.errorText}>{formErrors.images}</Text>
        </View>
      )}

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.imageScroll}>
        {images.map((uri, index) => (
          <View key={index} style={styles.imageContainer}>
            <Image source={{ uri }} style={styles.image} />
            <TouchableOpacity
              style={styles.deleteImageButton}
              onPress={() => removeImage(index)}>
              <Ionicons name="close-circle" size={24} color={ERROR_RED} />
            </TouchableOpacity>
            <View style={styles.imageBadge}>
              <Text style={styles.imageBadgeText}>{index + 1}</Text>
            </View>
          </View>
        ))}

        {images.length < 8 && (
          <TouchableOpacity style={styles.addImageContainer} onPress={pickImage}>
            <View style={styles.addImageIconContainer}>
              <Ionicons name="add-circle" size={40} color={SECONDARY_COLOR} />
            </View>
            <Text style={styles.addImageText}>Ajouter une photo</Text>
            <Text style={styles.addImageSubtext}>{images.length}/8</Text>
          </TouchableOpacity>
        )}
      </ScrollView>

      <View style={styles.tipsContainer}>
        <Ionicons name="bulb" size={20} color={PREMIUM_GOLD} />
        <Text style={styles.tipsText}>
          Conseils : Prenez des photos sous bon éclairage, sous plusieurs angles
        </Text>
      </View>
    </View>
  );

  const renderStep2 = () => (
    <View style={styles.stepContainer}>
      <View style={styles.sectionHeader}>
        <View style={styles.sectionIconContainer}>
          <Ionicons name="document-text" size={28} color={SECONDARY_COLOR} />
        </View>
        <View>
          <Text style={styles.sectionTitle}>Détails du produit</Text>
          <Text style={styles.sectionSubtitle}>Remplissez les informations essentielles</Text>
        </View>
      </View>

      <View style={styles.inputContainer}>
        <View style={styles.inputHeader}>
          <FontAwesome name="tag" size={16} color={SECONDARY_COLOR} />
          <Text style={styles.inputLabel}>Titre du produit *</Text>
        </View>
        <TextInput
          style={[styles.input, formErrors.title && styles.inputError]}
          value={formData.title}
          onChangeText={text => handleInputChange('title', text)}
          placeholder="Ex: iPhone 15 Pro Max 256GB"
          placeholderTextColor={TEXT_SECONDARY}
          autoCapitalize="sentences"
        />
        {formErrors.title && (
          <Text style={styles.errorText}>{formErrors.title}</Text>
        )}
      </View>

      <View style={styles.inputContainer}>
        <View style={styles.inputHeader}>
          <FontAwesome name="align-left" size={16} color={SECONDARY_COLOR} />
          <Text style={styles.inputLabel}>Description détaillée *</Text>
        </View>
        <TextInput
          style={[styles.input, styles.textArea, formErrors.description && styles.inputError]}
          multiline
          numberOfLines={6}
          value={formData.description}
          onChangeText={text => handleInputChange('description', text)}
          placeholder="Décrivez votre produit avec précision (état, caractéristiques, accessoires inclus...)"
          placeholderTextColor={TEXT_SECONDARY}
          textAlignVertical="top"
        />
        <View style={styles.charCount}>
          <Text style={[
            styles.charCountText,
            formData.description.length < 20 && styles.charCountWarning
          ]}>
            {formData.description.length} / 20 caractères minimum
          </Text>
        </View>
        {formErrors.description && (
          <Text style={styles.errorText}>{formErrors.description}</Text>
        )}
      </View>

      <View style={styles.row}>
        <View style={[styles.inputContainer, { flex: 1, marginRight: 8 }]}>
          <View style={styles.inputHeader}>
            <Ionicons name="apps" size={16} color={SECONDARY_COLOR} />
            <Text style={[styles.inputLabel, { color: SECONDARY_COLOR }]}>Catégorie</Text>
          </View>
          <View style={styles.pickerWrapper}>
            <Picker
              selectedValue={formData.category}
              onValueChange={(itemValue) => handleInputChange('category', itemValue)}
              mode="dropdown"
              style={[styles.picker, { color: SECONDARY_COLOR }]}
              dropdownIconColor={SECONDARY_COLOR}
            >
              {categories.map(item => (
                <Picker.Item 
                  key={item.value} 
                  label={item.label} 
                  value={item.value} 
                  color={SECONDARY_COLOR}
                />
              ))}
            </Picker>
          </View>
        </View>

        <View style={[styles.inputContainer, { flex: 1, marginLeft: 8 }]}>
          <View style={styles.inputHeader}>
            <FontAwesome name="star" size={16} color={SECONDARY_COLOR} />
            <Text style={[styles.inputLabel, { color: SECONDARY_COLOR }]}>État</Text>
          </View>
          <View style={styles.pickerWrapper}>
            <Picker
              selectedValue={formData.condition}
              onValueChange={(itemValue) => handleInputChange('condition', itemValue)}
              mode="dropdown"
              style={[styles.picker, { color: SECONDARY_COLOR }]}
              dropdownIconColor={SECONDARY_COLOR}
            >
              {conditions.map(item => (
                <Picker.Item 
                  key={item.value} 
                  label={item.label} 
                  value={item.value}
                  color={SECONDARY_COLOR}
                />
              ))}
            </Picker>
          </View>
        </View>
      </View>
    </View>
  );

  const renderStep3 = () => (
    <View style={styles.stepContainer}>
      <View style={styles.sectionHeader}>
        <View style={styles.sectionIconContainer}>
          <FontAwesome name="dollar-sign" size={28} color={SECONDARY_COLOR} />
        </View>
        <View>
          <Text style={styles.sectionTitle}>Prix & Livraison</Text>
          <Text style={styles.sectionSubtitle}>Fixez votre prix et options de livraison</Text>
        </View>
      </View>

      <View style={styles.inputContainer}>
        <View style={styles.inputHeader}>
          <FontAwesome name="money-bill-wave" size={16} color={SUCCESS_GREEN} />
          <Text style={styles.inputLabel}>Prix de vente ($) *</Text>
        </View>
        <View style={styles.priceWrapper}>
          <View style={styles.priceInputContainer}>
            <View style={styles.currencySymbol}>
              <Text style={styles.currencyText}>$</Text>
            </View>
            <TextInput
              style={[styles.priceInput, formErrors.price && styles.inputError]}
              keyboardType="numeric"
              value={formData.price}
              onChangeText={(text) => handleInputChange('price', text)}
              placeholder="0.00"
              placeholderTextColor={TEXT_SECONDARY}
            />
          </View>
          {formData.price && (
            <View style={styles.priceDisplay}>
              <Text style={styles.priceDisplayText}>{formatPrice(formData.price)}</Text>
            </View>
          )}
        </View>
        {formErrors.price && (
          <Text style={styles.errorText}>{formErrors.price}</Text>
        )}
      </View>

      <TouchableOpacity
        style={styles.promoContainer}
        onPress={() => {
          setIsPromo(!isPromo);
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        }}
      >
        <View style={styles.promoHeader}>
          <View style={styles.promoIcon}>
            {isPromo ? (
              <FontAwesome name="fire" size={20} color={WARNING_ORANGE} />
            ) : (
              <FontAwesome name="tag" size={20} color={TEXT_SECONDARY} />
            )}
          </View>
          <Text style={styles.promoTitle}>
            {isPromo ? 'Produit en promotion' : 'Mettre en promotion'}
          </Text>
          <View style={[styles.toggle, isPromo && styles.toggleActive]}>
            <View style={[styles.toggleButton, isPromo && styles.toggleButtonActive]} />
          </View>
        </View>
        {isPromo && (
          <View style={styles.promoInputContainer}>
            <View style={styles.inputHeader}>
              <FontAwesome name="history" size={16} color={WARNING_ORANGE} />
              <Text style={styles.inputLabel}>Prix original ($) *</Text>
            </View>
            <View style={styles.priceInputContainer}>
              <View style={styles.currencySymbol}>
                <Text style={styles.currencyText}>$</Text>
              </View>
              <TextInput
                style={[styles.priceInput, formErrors.originalPrice && styles.inputError]}
                keyboardType="numeric"
                value={formData.originalPrice}
                onChangeText={(text) => handleInputChange('originalPrice', text)}
                placeholder="0.00"
                placeholderTextColor={TEXT_SECONDARY}
              />
            </View>
            {formData.originalPrice && formData.price && (
              <View style={styles.discountTag}>
                <Text style={styles.discountText}>
                  -{Math.round((1 - parseFloat(formData.price) / parseFloat(formData.originalPrice)) * 100)}%
                </Text>
              </View>
            )}
            {formErrors.originalPrice && (
              <Text style={styles.errorText}>{formErrors.originalPrice}</Text>
            )}
          </View>
        )}
      </TouchableOpacity>

      <View style={styles.inputContainer}>
        <View style={styles.inputHeader}>
          <FontAwesome name="boxes" size={16} color={SECONDARY_COLOR} />
          <Text style={styles.inputLabel}>Quantité disponible *</Text>
        </View>
        <View style={styles.quantityWrapper}>
          <TouchableOpacity
            style={styles.quantityButton}
            onPress={() => {
              const current = parseInt(formData.stock) || 1;
              if (current > 1) handleInputChange('stock', (current - 1).toString());
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            }}
          >
            <Ionicons name="remove" size={24} color={SECONDARY_COLOR} />
          </TouchableOpacity>
          <TextInput
            style={styles.quantityInput}
            keyboardType="numeric"
            value={formData.stock}
            onChangeText={(text) => handleInputChange('stock', text)}
            textAlign="center"
          />
          <TouchableOpacity
            style={styles.quantityButton}
            onPress={() => {
              const current = parseInt(formData.stock) || 1;
              handleInputChange('stock', (current + 1).toString());
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            }}
          >
            <Ionicons name="add" size={24} color={SECONDARY_COLOR} />
          </TouchableOpacity>
        </View>
        {formErrors.stock && (
          <Text style={styles.errorText}>{formErrors.stock}</Text>
        )}
      </View>

      <View style={styles.inputContainer}>
        <View style={styles.locationHeader}>
          <View style={styles.inputHeader}>
            <Ionicons name="location" size={16} color={SECONDARY_COLOR} />
            <Text style={styles.inputLabel}>Localisation</Text>
          </View>
          <TouchableOpacity 
            style={styles.locationToggle}
            onPress={toggleLocation}
          >
            <Ionicons 
              name={useLocation ? "location" : "location-outline"} 
              size={20} 
              color={useLocation ? SUCCESS_GREEN : SECONDARY_COLOR} 
            />
            <Text style={styles.locationToggleText}>
              {useLocation ? 'Désactiver GPS' : 'Utiliser GPS'}
            </Text>
          </TouchableOpacity>
        </View>
        
        {useLocation ? (
          <View style={styles.locationContainer}>
            {formData.location ? (
              <>
                <Ionicons name="checkmark-circle" size={20} color={SUCCESS_GREEN} />
                <Text style={styles.locationText}>{formData.location}</Text>
              </>
            ) : (
              <View style={styles.locationLoading}>
                <ActivityIndicator size="small" color={SECONDARY_COLOR} />
                <Text style={styles.locationLoadingText}>Détection en cours...</Text>
              </View>
            )}
          </View>
        ) : (
          <TextInput
            style={styles.input}
            value={formData.location}
            onChangeText={(text) => handleInputChange('location', text)}
            placeholder="Ville, région, pays"
            placeholderTextColor={TEXT_SECONDARY}
          />
        )}
      </View>

      <View style={styles.inputContainer}>
        <View style={styles.inputHeader}>
          <FontAwesome name="shipping-fast" size={16} color={SECONDARY_COLOR} />
          <Text style={styles.inputLabel}>Options de livraison</Text>
        </View>
        <View style={styles.deliveryOptionsGrid}>
          {deliveryOptions.map((option) => (
            <TouchableOpacity
              key={option.value}
              style={[
                styles.deliveryOption,
                formData.deliveryOptions.includes(option.value) && styles.deliveryOptionSelected
              ]}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                const currentOptions = [...formData.deliveryOptions];
                if (currentOptions.includes(option.value)) {
                  if (currentOptions.length > 1) {
                    const index = currentOptions.indexOf(option.value);
                    currentOptions.splice(index, 1);
                  }
                } else {
                  currentOptions.push(option.value);
                }
                setFormData(prev => ({ ...prev, deliveryOptions: currentOptions }));
              }}
            >
              <FontAwesome 
                name={option.icon as any} 
                size={20} 
                color={formData.deliveryOptions.includes(option.value) ? SECONDARY_COLOR : TEXT_SECONDARY} 
              />
              <Text style={[
                styles.deliveryOptionText,
                formData.deliveryOptions.includes(option.value) && styles.deliveryOptionTextSelected
              ]}>
                {option.label}
              </Text>
              {formData.deliveryOptions.includes(option.value) && (
                <View style={styles.deliveryCheck}>
                  <Ionicons name="checkmark" size={16} color={SECONDARY_COLOR} />
                </View>
              )}
            </TouchableOpacity>
          ))}
        </View>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <Ionicons name="chevron-back" size={28} color={SECONDARY_COLOR} />
          </TouchableOpacity>
          <View style={styles.headerCenter}>
            <Text style={styles.headerTitle}>SHOPNET</Text>
            <View style={styles.vipBadge}>
              <FontAwesome name="crown" size={12} color={PREMIUM_GOLD} />
              <Text style={styles.vipText}>PRO</Text>
            </View>
          </View>
          <View style={styles.headerRight}>
            <Text style={styles.stepCounter}>Étape {activeStep}/3</Text>
          </View>
        </View>

        {showSuccess && (
          <View style={styles.successNotification}>
            <Ionicons name="checkmark-circle" size={24} color={SUCCESS_GREEN} />
            <Text style={styles.successNotificationText}>Produit publié avec succès !</Text>
          </View>
        )}

        {renderStepIndicator()}

        <ScrollView
          ref={scrollViewRef}
          contentContainerStyle={styles.container}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {activeStep === 1 && renderStep1()}
          {activeStep === 2 && renderStep2()}
          {activeStep === 3 && renderStep3()}

          {submitError && (
            <View style={styles.errorAlert}>
              <Ionicons name="alert-circle" size={24} color={ERROR_RED} />
              <Text style={styles.errorAlertText}>{submitError}</Text>
            </View>
          )}

          <View style={[
            styles.navigationButtons,
            activeStep === 1 ? { justifyContent: 'flex-end' } : { justifyContent: 'space-between' }
          ]}>
            {activeStep > 1 && (
              <TouchableOpacity
                style={styles.secondaryButton}
                onPress={handlePrevStep}
              >
                <Ionicons name="arrow-back" size={20} color={SECONDARY_COLOR} />
                <Text style={styles.secondaryButtonText}>Précédent</Text>
              </TouchableOpacity>
            )}

            {activeStep < 3 && (
              <TouchableOpacity
                style={[
                  styles.primaryButton,
                  activeStep === 1 ? { flex: 1 } : { width: width / 2 - 30 }
                ]}
                onPress={handleNextStep}
              >
                <Text style={styles.primaryButtonText}>Continuer</Text>
                <Ionicons name="arrow-forward" size={20} color={TEXT_WHITE} />
              </TouchableOpacity>
            )}

            {activeStep === 3 && (
              <TouchableOpacity
                style={[styles.primaryButton, isSubmitting && styles.buttonDisabled]}
                onPress={handleSubmit}
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <ActivityIndicator color={TEXT_WHITE} />
                ) : (
                  <>
                    <FontAwesome name="rocket" size={20} color={TEXT_WHITE} />
                    <Text style={styles.primaryButtonText}>Publier maintenant</Text>
                  </>
                )}
              </TouchableOpacity>
            )}
          </View>

          <View style={styles.footer}>
            <Text style={styles.footerText}>
              💎 Publication VIP • Visibilité maximale • Support prioritaire
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: PRIMARY_COLOR,
  },
  flex: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: PRIMARY_COLOR,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(66, 165, 245, 0.1)',
  },
  backButton: {
    padding: 4,
  },
  headerCenter: {
    alignItems: 'center',
    flexDirection: 'row',
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '900',
    color: SECONDARY_COLOR,
    marginRight: 8,
    letterSpacing: 1,
  },
  vipBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 215, 0, 0.1)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: PREMIUM_GOLD,
  },
  vipText: {
    color: PREMIUM_GOLD,
    fontSize: 12,
    fontWeight: '800',
    marginLeft: 4,
  },
  headerRight: {},
  stepCounter: {
    color: TEXT_SECONDARY,
    fontSize: 14,
    fontWeight: '600',
  },
  successNotification: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: SUCCESS_GREEN,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginHorizontal: 20,
    marginTop: 10,
    borderRadius: 8,
  },
  successNotificationText: {
    color: TEXT_WHITE,
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 12,
  },
  stepIndicatorContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 40,
    paddingVertical: 20,
    marginHorizontal: 20,
    marginTop: 10,
    borderRadius: 16,
    backgroundColor: 'rgba(30, 42, 59, 0.5)',
    borderWidth: 1,
    borderColor: 'rgba(66, 165, 245, 0.1)',
  },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  stepCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1,
  },
  stepCircleActive: {
    backgroundColor: SECONDARY_COLOR,
  },
  stepCircleInactive: {
    backgroundColor: 'rgba(160, 174, 192, 0.2)',
    borderWidth: 2,
    borderColor: 'rgba(160, 174, 192, 0.3)',
  },
  stepNumber: {
    color: TEXT_WHITE,
    fontSize: 16,
    fontWeight: '700',
  },
  stepLabel: {
    fontSize: 12,
    fontWeight: '600',
    marginTop: 6,
    textAlign: 'center',
  },
  stepLabelActive: {
    color: SECONDARY_COLOR,
  },
  stepLabelInactive: {
    color: TEXT_SECONDARY,
  },
  stepConnector: {
    flex: 1,
    height: 3,
    marginHorizontal: 4,
  },
  stepConnectorActive: {
    backgroundColor: SECONDARY_COLOR,
  },
  stepConnectorInactive: {
    backgroundColor: 'rgba(160, 174, 192, 0.2)',
  },
  container: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  stepContainer: {
    marginTop: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
  },
  sectionIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(66, 165, 245, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
    borderWidth: 1,
    borderColor: 'rgba(66, 165, 245, 0.2)',
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: TEXT_WHITE,
    marginBottom: 4,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: TEXT_SECONDARY,
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 107, 107, 0.1)',
    padding: 16,
    borderRadius: 12,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 107, 107, 0.3)',
  },
  errorText: {
    color: ERROR_RED,
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 12,
    flex: 1,
  },
  imageScroll: {
    flexDirection: 'row',
    marginBottom: 20,
  },
  imageContainer: {
    position: 'relative',
    marginRight: 12,
    width: 140,
    height: 140,
    borderRadius: 12,
  },
  image: {
    width: '100%',
    height: '100%',
    borderRadius: 12,
    backgroundColor: '#2C3A4A',
  },
  deleteImageButton: {
    position: 'absolute',
    top: -8,
    right: -8,
    backgroundColor: PRIMARY_COLOR,
    borderRadius: 20,
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
    borderWidth: 2,
    borderColor: ERROR_RED,
  },
  imageBadge: {
    position: 'absolute',
    top: 8,
    left: 8,
    backgroundColor: SECONDARY_COLOR,
    borderRadius: 10,
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  imageBadgeText: {
    color: TEXT_WHITE,
    fontSize: 12,
    fontWeight: '800',
  },
  addImageContainer: {
    width: 140,
    height: 140,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: SECONDARY_COLOR,
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(66, 165, 245, 0.05)',
  },
  addImageIconContainer: {
    marginBottom: 8,
  },
  addImageText: {
    fontSize: 14,
    fontWeight: '600',
    color: SECONDARY_COLOR,
    textAlign: 'center',
  },
  addImageSubtext: {
    fontSize: 12,
    color: TEXT_SECONDARY,
    marginTop: 4,
  },
  tipsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 215, 0, 0.1)',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 215, 0, 0.2)',
  },
  tipsText: {
    color: PREMIUM_GOLD,
    fontSize: 14,
    marginLeft: 12,
    flex: 1,
    fontWeight: '500',
  },
  inputContainer: {
    backgroundColor: 'rgba(30, 42, 59, 0.5)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(66, 165, 245, 0.1)',
  },
  inputHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: TEXT_WHITE,
    marginLeft: 8,
  },
  input: {
    backgroundColor: 'rgba(30, 42, 59, 0.5)',
    color: TEXT_WHITE,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    fontSize: 16,
    borderWidth: 1,
    borderColor: 'rgba(66, 165, 245, 0.1)',
  },
  textArea: {
    minHeight: 120,
    textAlignVertical: 'top',
  },
  inputError: {
    borderColor: ERROR_RED,
  },
  charCount: {
    marginTop: 8,
  },
  charCountText: {
    fontSize: 12,
    color: TEXT_SECONDARY,
  },
  charCountWarning: {
    color: WARNING_ORANGE,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  pickerWrapper: {
    backgroundColor: 'rgba(30, 42, 59, 0.5)',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(66, 165, 245, 0.1)',
  },
  picker: {
    height: 50,
  },
  priceWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  priceInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 12,
  },
  currencySymbol: {
    backgroundColor: 'rgba(76, 175, 80, 0.1)',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopLeftRadius: 8,
    borderBottomLeftRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(76, 175, 80, 0.3)',
  },
  currencyText: {
    color: SUCCESS_GREEN,
    fontSize: 18,
    fontWeight: '800',
  },
  priceInput: {
    flex: 1,
    backgroundColor: 'rgba(30, 42, 59, 0.5)',
    color: TEXT_WHITE,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopRightRadius: 8,
    borderBottomRightRadius: 8,
    fontSize: 16,
    borderWidth: 1,
    borderColor: 'rgba(66, 165, 245, 0.1)',
    borderLeftWidth: 0,
  },
  priceDisplay: {
    backgroundColor: 'rgba(76, 175, 80, 0.1)',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(76, 175, 80, 0.3)',
  },
  priceDisplayText: {
    color: SUCCESS_GREEN,
    fontSize: 16,
    fontWeight: '700',
  },
  promoContainer: {
    backgroundColor: 'rgba(30, 42, 59, 0.5)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 167, 38, 0.2)',
  },
  promoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  promoIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 167, 38, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 167, 38, 0.3)',
  },
  promoTitle: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    color: TEXT_WHITE,
    marginLeft: 12,
  },
  toggle: {
    width: 52,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(160, 174, 192, 0.3)',
    padding: 2,
    justifyContent: 'center',
  },
  toggleActive: {
    backgroundColor: WARNING_ORANGE,
  },
  toggleButton: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: TEXT_WHITE,
  },
  toggleButtonActive: {
    alignSelf: 'flex-end',
  },
  promoInputContainer: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 167, 38, 0.1)',
  },
  discountTag: {
    position: 'absolute',
    top: 16,
    right: 16,
    backgroundColor: WARNING_ORANGE,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  discountText: {
    color: TEXT_WHITE,
    fontSize: 14,
    fontWeight: '800',
  },
  quantityWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  quantityButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(66, 165, 245, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(66, 165, 245, 0.3)',
  },
  quantityInput: {
    flex: 1,
    backgroundColor: 'rgba(30, 42, 59, 0.5)',
    color: TEXT_WHITE,
    fontSize: 24,
    fontWeight: '700',
    padding: 12,
    marginHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(66, 165, 245, 0.1)',
    textAlign: 'center',
  },
  locationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  locationToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(66, 165, 245, 0.1)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(66, 165, 245, 0.3)',
  },
  locationToggleText: {
    color: SECONDARY_COLOR,
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 6,
  },
  locationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(76, 175, 80, 0.1)',
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(76, 175, 80, 0.3)',
  },
  locationText: {
    color: SUCCESS_GREEN,
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 12,
    flex: 1,
  },
  locationLoading: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  locationLoadingText: {
    color: SECONDARY_COLOR,
    fontSize: 14,
    marginLeft: 12,
    fontStyle: 'italic',
  },
  deliveryOptionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -4,
  },
  deliveryOption: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(30, 42, 59, 0.5)',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    margin: 4,
    flex: 1,
    minWidth: width / 2 - 40,
    borderWidth: 1,
    borderColor: 'rgba(66, 165, 245, 0.1)',
  },
  deliveryOptionSelected: {
    backgroundColor: 'rgba(66, 165, 245, 0.1)',
    borderColor: SECONDARY_COLOR,
  },
  deliveryOptionText: {
    fontSize: 14,
    color: TEXT_SECONDARY,
    marginLeft: 8,
    flex: 1,
  },
  deliveryOptionTextSelected: {
    color: SECONDARY_COLOR,
    fontWeight: '600',
  },
  deliveryCheck: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: SECONDARY_COLOR,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorAlert: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 107, 107, 0.1)',
    padding: 16,
    borderRadius: 12,
    marginVertical: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 107, 107, 0.3)',
  },
  errorAlertText: {
    color: ERROR_RED,
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 12,
    flex: 1,
  },
  navigationButtons: {
    flexDirection: 'row',
    marginTop: 32,
    marginBottom: 20,
  },
  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: SECONDARY_COLOR,
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderRadius: 12,
  },
  primaryButtonText: {
    color: TEXT_WHITE,
    fontSize: 16,
    fontWeight: '700',
    marginHorizontal: 8,
  },
  secondaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(30, 42, 59, 0.5)',
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(66, 165, 245, 0.3)',
    flex: 1,
    marginRight: 12,
  },
  secondaryButtonText: {
    color: SECONDARY_COLOR,
    fontSize: 16,
    fontWeight: '700',
    marginLeft: 8,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  footer: {
    alignItems: 'center',
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(66, 165, 245, 0.1)',
    marginTop: 16,
  },
  footerText: {
    color: PREMIUM_GOLD,
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
  },
});

export default ProductForm;