

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
import { useTheme } from "../../../../app/theme/ThemeContext";
import { useLanguage } from "../../../../context/LanguageContext";

const { width, height } = Dimensions.get('window');
const API_URL = 'https://shopnet-backend.onrender.com/api/products';
const AI_API_URL = 'https://shopnet-backend.onrender.com/api/ai/description';

// Hook couleurs dynamiques
const useDynamicColors = () => {
  const { isDark } = useTheme();
  return {
    background: isDark ? '#0D0D0D' : '#00182A',
    surface: isDark ? '#1A1A1A' : 'rgba(30, 42, 59, 0.5)',
    surfaceAlt: isDark ? '#222222' : 'rgba(30, 42, 59, 0.5)',
    border: isDark ? '#2E2E2E' : 'rgba(66, 165, 245, 0.1)',
    borderActive: isDark ? '#42A5F5' : 'rgba(66, 165, 245, 0.3)',
    text: isDark ? '#F5F5F5' : '#FFFFFF',
    textSecondary: isDark ? '#B0B0B0' : '#A0AEC0',
    accent: '#42A5F5',
    gold: '#FFD700',
    success: '#4CAF50',
    error: '#FF6B6B',
    warning: '#FFA726',
    purple: '#9C27B0',
    headerBg: isDark ? '#1A1A1A' : '#00182A',
    headerBorder: isDark ? '#2E2E2E' : 'rgba(66, 165, 245, 0.1)',
    stepBg: isDark ? '#1A1A1A' : 'rgba(30, 42, 59, 0.5)',
    stepInactive: isDark ? 'rgba(160, 174, 192, 0.15)' : 'rgba(160, 174, 192, 0.2)',
    stepBorder: isDark ? 'rgba(160, 174, 192, 0.2)' : 'rgba(160, 174, 192, 0.3)',
    inputBg: isDark ? '#222222' : 'rgba(30, 42, 59, 0.5)',
    inputBorder: isDark ? '#2E2E2E' : 'rgba(66, 165, 245, 0.1)',
    inputText: isDark ? '#F5F5F5' : '#FFFFFF',
    placeholder: isDark ? '#888888' : '#A0AEC0',
    statusBar: isDark ? '#0D0D0D' : '#00182A',
    barStyle: 'light-content' as const,
    white: '#FFFFFF',
    iconBg: isDark ? 'rgba(66, 165, 245, 0.15)' : 'rgba(66, 165, 245, 0.1)',
    iconBorder: isDark ? 'rgba(66, 165, 245, 0.25)' : 'rgba(66, 165, 245, 0.2)',
    promoBg: isDark ? '#1A1A1A' : 'rgba(30, 42, 59, 0.5)',
    promoBorder: isDark ? 'rgba(255, 167, 38, 0.3)' : 'rgba(255, 167, 38, 0.2)',
    promoIconBg: isDark ? 'rgba(255, 167, 38, 0.15)' : 'rgba(255, 167, 38, 0.1)',
    promoIconBorder: isDark ? 'rgba(255, 167, 38, 0.35)' : 'rgba(255, 167, 38, 0.3)',
    toggleOff: isDark ? 'rgba(160, 174, 192, 0.2)' : 'rgba(160, 174, 192, 0.3)',
    currencyBg: isDark ? 'rgba(76, 175, 80, 0.15)' : 'rgba(76, 175, 80, 0.1)',
    currencyBorder: isDark ? 'rgba(76, 175, 80, 0.35)' : 'rgba(76, 175, 80, 0.3)',
    priceDisplayBg: isDark ? 'rgba(76, 175, 80, 0.15)' : 'rgba(76, 175, 80, 0.1)',
    priceDisplayBorder: isDark ? 'rgba(76, 175, 80, 0.35)' : 'rgba(76, 175, 80, 0.3)',
    qtyBtnBg: isDark ? 'rgba(66, 165, 245, 0.15)' : 'rgba(66, 165, 245, 0.1)',
    qtyBtnBorder: isDark ? 'rgba(66, 165, 245, 0.35)' : 'rgba(66, 165, 245, 0.3)',
    locationBg: isDark ? 'rgba(76, 175, 80, 0.15)' : 'rgba(76, 175, 80, 0.1)',
    locationBorder: isDark ? 'rgba(76, 175, 80, 0.35)' : 'rgba(76, 175, 80, 0.3)',
    deliveryBg: isDark ? '#222222' : 'rgba(30, 42, 59, 0.5)',
    deliverySelectedBg: isDark ? 'rgba(66, 165, 245, 0.15)' : 'rgba(66, 165, 245, 0.1)',
    errorBg: isDark ? 'rgba(255, 107, 107, 0.1)' : 'rgba(255, 107, 107, 0.1)',
    errorBorder: isDark ? 'rgba(255, 107, 107, 0.35)' : 'rgba(255, 107, 107, 0.3)',
    tipsBg: isDark ? 'rgba(255, 215, 0, 0.1)' : 'rgba(255, 215, 0, 0.1)',
    tipsBorder: isDark ? 'rgba(255, 215, 0, 0.25)' : 'rgba(255, 215, 0, 0.2)',
    secBtnBg: isDark ? '#1A1A1A' : 'rgba(30, 42, 59, 0.5)',
    secBtnBorder: isDark ? '#2E2E2E' : 'rgba(66, 165, 245, 0.3)',
    footerBorder: isDark ? '#2E2E2E' : 'rgba(66, 165, 245, 0.1)',
    locationToggleBg: isDark ? 'rgba(66, 165, 245, 0.15)' : 'rgba(66, 165, 245, 0.1)',
    locationToggleBorder: isDark ? 'rgba(66, 165, 245, 0.35)' : 'rgba(66, 165, 245, 0.3)',
    vipBg: isDark ? 'rgba(255, 215, 0, 0.1)' : 'rgba(255, 215, 0, 0.1)',
    vipBorder: isDark ? 'rgba(255, 215, 0, 0.3)' : '#FFD700',
    addImageBg: isDark ? 'rgba(66, 165, 245, 0.08)' : 'rgba(66, 165, 245, 0.05)',
    pickerBg: isDark ? '#222222' : 'rgba(30, 42, 59, 0.5)',
    pickerBorder: isDark ? '#2E2E2E' : 'rgba(66, 165, 245, 0.1)',
  };
};

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
  const { language } = useLanguage();
  const fr = language === 'fr';
  const COLORS = useDynamicColors();

  const [formData, setFormData] = useState<ProductFormData>({
    title: '', description: '', price: '', originalPrice: '',
    category: '', // ✅ CHANGEMENT : catégorie vide par défaut (plus de "mode")
    condition: 'new', stock: '1', location: '',
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
  const [isGeneratingDesc, setIsGeneratingDesc] = useState(false);
  const scrollViewRef = useRef<ScrollView>(null);

  const categories = [
    { label: fr ? '📱 Électronique' : '📱 Electronics', value: 'electronics', icon: 'mobile-alt' },
    { label: fr ? '👗 Mode & Vêtements' : '👗 Fashion', value: 'fashion', icon: 'tshirt' },
    { label: fr ? '🏠 Maison & Jardin' : '🏠 Home & Garden', value: 'home', icon: 'home' },
    { label: fr ? '🚗 Automobile' : '🚗 Automotive', value: 'auto', icon: 'car' },
    { label: fr ? '💄 Beauté & Santé' : '💄 Beauty & Health', value: 'beauty', icon: 'spa' },
    { label: fr ? '⚽ Sports & Loisirs' : '⚽ Sports', value: 'sports', icon: 'futbol' },
    { label: fr ? '🎮 Jeux & Jouets' : '🎮 Games & Toys', value: 'games', icon: 'gamepad' },
    { label: fr ? '📚 Livres & Éducation' : '📚 Books & Education', value: 'books', icon: 'book' },
  ];

  const conditions = [
    { label: fr ? '🌟 Neuf avec étiquette' : '🌟 New with Tag', value: 'new', icon: 'certificate' },
    { label: fr ? '✨ Comme neuf' : '✨ Like New', value: 'like_new', icon: 'star' },
    { label: fr ? '✅ Bon état' : '✅ Good', value: 'good', icon: 'check-circle' },
    { label: fr ? '🔄 Satisfaisant' : '🔄 Satisfactory', value: 'satisfactory', icon: 'sync-alt' },
  ];

  const deliveryOptions = [
    { label: fr ? '🚚 Livraison standard' : '🚚 Standard Delivery', value: 'standard', icon: 'truck' },
    { label: fr ? '⚡ Livraison express' : '⚡ Express Delivery', value: 'express', icon: 'bolt' },
    { label: fr ? '🏪 Retrait en magasin' : '🏪 Pickup', value: 'pickup', icon: 'store' },
    { label: fr ? '✈️ Livraison internationale' : '✈️ International', value: 'international', icon: 'plane' },
  ];

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const token = await AsyncStorage.getItem('userToken');
        if (token) { setAuthToken(token); } else { router.push('/splash'); }
      } catch (error) { console.error('Erreur de vérification du token:', error); router.push('/splash'); }
    };
    checkAuth();
    (async () => {
      if (Platform.OS !== 'web') {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') { Alert.alert(fr ? 'Permission requise' : 'Permission Required', fr ? 'Nous avons besoin de la permission pour accéder à vos photos.' : 'We need permission to access your photos.'); }
      }
    })();
  }, []);

  const handleInputChange = (name: keyof ProductFormData, value: string) => {
    setFormData(prev => ({ ...prev, [name]: value }));
    if (formErrors[name]) { setFormErrors(prev => ({ ...prev, [name]: '' })); }
  };

  const pickImage = async () => {
    if (images.length >= 8) { Alert.alert(fr ? 'Maximum atteint' : 'Limit Reached', fr ? 'Vous ne pouvez ajouter que 8 images maximum' : 'You can only add up to 8 images'); return; }
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, allowsEditing: false, quality: 0.8 });
      if (!result.canceled && result.assets?.[0]?.uri) { setImages([...images, result.assets[0].uri]); }
    } catch (error) { console.error('Erreur sélection image:', error); Alert.alert(fr ? 'Erreur' : 'Error', fr ? 'Impossible de sélectionner l\'image' : 'Unable to select image'); }
  };

  const removeImage = (index: number) => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setImages(prev => prev.filter((_, i) => i !== index)); };

  const getLocation = async () => {
    if (Platform.OS === 'web') { Alert.alert('Info', fr ? 'La géolocalisation web n\'est pas implémentée' : 'Web geolocation not implemented'); return; }
    setIsLoading(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') { Alert.alert(fr ? 'Permission refusée' : 'Permission Denied', fr ? 'Nous avons besoin de la permission pour accéder à votre position.' : 'We need location permission.'); return; }
      const location = await Location.getCurrentPositionAsync({});
      const [place] = await Location.reverseGeocodeAsync(location.coords);
      if (place) { const city = place.city || place.region || 'Inconnu'; const country = place.country === 'Democratic Republic of the Congo' ? 'RDC' : place.country; setFormData(prev => ({ ...prev, location: `${city}, ${country}` })); Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success); }
    } catch (error) { Alert.alert(fr ? 'Erreur' : 'Error', fr ? 'Impossible d\'obtenir votre position' : 'Unable to get location'); }
    finally { setIsLoading(false); }
  };

  const toggleLocation = () => { if (!useLocation) { getLocation(); } else { setFormData(prev => ({ ...prev, location: '' })); } setUseLocation(!useLocation); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); };

  const validateStep = (step: number): boolean => {
    const errors: Record<string, string> = {};
    if (step === 1 && images.length === 0) errors.images = fr ? 'Ajoutez au moins une photo' : 'Add at least one photo';
    if (step === 2) {
      if (!formData.title.trim()) errors.title = fr ? 'Titre requis' : 'Title required';
      else if (formData.title.length < 5) errors.title = fr ? 'Titre trop court (min 5 caractères)' : 'Title too short (min 5 characters)';
      if (!formData.description.trim()) errors.description = fr ? 'Description requise' : 'Description required';
      else if (formData.description.length < 20) errors.description = fr ? 'Description trop courte (min 20 caractères)' : 'Description too short (min 20 characters)';
      // ✅ Validation catégorie : ne doit pas être vide
      if (!formData.category) errors.category = fr ? 'Veuillez sélectionner une catégorie' : 'Please select a category';
    }
    if (step === 3) {
      if (!formData.price) errors.price = fr ? 'Prix requis' : 'Price required';
      else if (isNaN(parseFloat(formData.price))) errors.price = fr ? 'Prix invalide' : 'Invalid price';
      if (isPromo && !formData.originalPrice) errors.originalPrice = fr ? 'Prix original requis' : 'Original price required';
      if (!formData.stock) errors.stock = fr ? 'Quantité requise' : 'Quantity required';
    }
    setFormErrors(errors); return Object.keys(errors).length === 0;
  };

  const handleNextStep = () => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); if (validateStep(activeStep)) { setActiveStep(prev => prev + 1); scrollViewRef.current?.scrollTo({ y: 0, animated: true }); } };
  const handlePrevStep = () => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setActiveStep(prev => prev - 1); scrollViewRef.current?.scrollTo({ y: 0, animated: true }); };
  const formatPrice = (price: string) => { if (!price) return ''; const numericValue = parseFloat(price); return isNaN(numericValue) ? '' : `$${numericValue.toFixed(2)}`; };

  // Génération description par IA
  const generateDescriptionWithAI = async () => {
    const { title, category } = formData;
    if (!title.trim()) {
      Alert.alert(fr ? 'Titre manquant' : 'Missing title', fr ? 'Veuillez d\'abord saisir un titre pour générer la description.' : 'Please enter a title first.');
      return;
    }
    if (!category) {
      Alert.alert(fr ? 'Catégorie manquante' : 'Missing category', fr ? 'Veuillez sélectionner une catégorie.' : 'Please select a category.');
      return;
    }

    setIsGeneratingDesc(true);
    try {
      const url = `${AI_API_URL}?title=${encodeURIComponent(title)}&category=${encodeURIComponent(category)}`;
      const response = await fetch(url, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      });
      const data = await response.json();
      if (data.success && data.description) {
        handleInputChange('description', data.description);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } else {
        throw new Error(data.error || 'Erreur IA');
      }
    } catch (error: any) {
      console.error('Erreur génération IA:', error);
      Alert.alert(
        fr ? 'Erreur IA' : 'AI Error',
        fr ? 'Impossible de générer la description. Vérifiez votre connexion.' : 'Unable to generate description. Check your connection.'
      );
    } finally {
      setIsGeneratingDesc(false);
    }
  };

  const prepareImageForUpload = async (uri: string, index: number): Promise<ImageInfo> => {
    try {
      const manipResult = await manipulateAsync(uri, [{ resize: { width: 1200 } }], { compress: 0.8, format: SaveFormat.JPEG });
      return { uri: manipResult.uri, name: `product_${Date.now()}_${index}.jpg`, type: 'image/jpeg' };
    } catch (error) { throw new Error(fr ? 'Erreur lors de la préparation de l\'image' : 'Image preparation error'); }
  };

  const handleSubmit = async () => {
    if (!validateStep(activeStep)) return;
    if (!authToken) { Alert.alert(fr ? 'Erreur' : 'Error', fr ? 'Vous devez être connecté pour publier' : 'You must be logged in to publish'); router.push('/splash'); return; }
    setIsSubmitting(true); setSubmitError(null);
    try {
      const formDataToSend = new FormData();
      formDataToSend.append('title', formData.title); formDataToSend.append('description', formData.description);
      formDataToSend.append('price', formData.price); formDataToSend.append('original_price', formData.originalPrice || '');
      formDataToSend.append('category', formData.category); formDataToSend.append('condition', formData.condition);
      formDataToSend.append('stock', formData.stock); formDataToSend.append('location', formData.location || '');
      formDataToSend.append('deliveryOptions', JSON.stringify(formData.deliveryOptions));
      for (let i = 0; i < images.length; i++) {
        const imageInfo = await prepareImageForUpload(images[i], i);
        if (Platform.OS === 'web') { const response = await fetch(imageInfo.uri); const blob = await response.blob(); formDataToSend.append('images', blob, imageInfo.name); }
        else { formDataToSend.append('images', { uri: imageInfo.uri, name: imageInfo.name, type: imageInfo.type } as any); }
      }
      const headers: Record<string, string> = { Authorization: `Bearer ${authToken}`, Accept: 'application/json' };
      if (Platform.OS === 'web') headers['Content-Type'] = 'multipart/form-data';
      const response = await fetch(API_URL, { method: 'POST', headers, body: formDataToSend });
      const responseData = await response.json();
      if (!response.ok) throw new Error(responseData.error || (fr ? 'Erreur lors de la publication' : 'Publication error'));
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success); setShowSuccess(true);
      setTimeout(() => { setShowSuccess(false); router.push('/(tabs)/Auth/Produits/Fil'); }, 2000);
    } catch (error: any) {
      setSubmitError(error.message || (fr ? 'Échec de la publication' : 'Publication failed'));
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      if (error.message.includes('401') || error.message.includes('token')) { Alert.alert(fr ? 'Session expirée' : 'Session Expired', fr ? 'Veuillez vous reconnecter' : 'Please log in again'); await AsyncStorage.removeItem('userToken'); router.push('/splash'); }
    } finally { setIsSubmitting(false); }
  };

  const renderStepIndicator = () => (
    <View style={[styles.stepIndicatorContainer, { backgroundColor: COLORS.stepBg, borderColor: COLORS.border }]}>
      {[1, 2, 3].map((step) => (
        <View key={step} style={styles.stepRow}>
          <View style={[styles.stepCircle, activeStep >= step ? { backgroundColor: COLORS.accent } : { backgroundColor: COLORS.stepInactive, borderColor: COLORS.stepBorder }]}>
            {activeStep > step ? <Ionicons name="checkmark" size={20} color={COLORS.white} /> : <Text style={[styles.stepNumber, { color: COLORS.text }]}>{step}</Text>}
          </View>
          <Text style={[styles.stepLabel, activeStep >= step ? { color: COLORS.accent } : { color: COLORS.textSecondary }]}>
            {step === 1 ? (fr ? 'Photos' : 'Photos') : step === 2 ? (fr ? 'Détails' : 'Details') : (fr ? 'Prix' : 'Price')}
          </Text>
          {step < 3 && <View style={[styles.stepConnector, activeStep > step ? { backgroundColor: COLORS.accent } : { backgroundColor: COLORS.stepInactive }]} />}
        </View>
      ))}
    </View>
  );

  const renderStep1 = () => (
    <View style={styles.stepContainer}>
      <View style={styles.sectionHeader}>
        <View style={[styles.sectionIconContainer, { backgroundColor: COLORS.iconBg, borderColor: COLORS.iconBorder }]}>
          <Ionicons name="images" size={28} color={COLORS.accent} />
        </View>
        <View>
          <Text style={[styles.sectionTitle, { color: COLORS.text }]}>{fr ? 'Photos du produit' : 'Product Photos'}</Text>
          <Text style={[styles.sectionSubtitle, { color: COLORS.textSecondary }]}>{fr ? 'Ajoutez jusqu\'à 8 photos de qualité' : 'Add up to 8 quality photos'}</Text>
        </View>
      </View>
      {formErrors.images && (<View style={[styles.errorContainer, { backgroundColor: COLORS.errorBg, borderColor: COLORS.errorBorder }]}><Ionicons name="alert-circle" size={20} color={COLORS.error} /><Text style={[styles.errorText, { color: COLORS.error }]}>{formErrors.images}</Text></View>)}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.imageScroll}>
        {images.map((uri, index) => (
          <View key={index} style={styles.imageContainer}>
            <Image source={{ uri }} style={styles.image} />
            <TouchableOpacity style={[styles.deleteImageButton, { backgroundColor: COLORS.background, borderColor: COLORS.error }]} onPress={() => removeImage(index)}><Ionicons name="close-circle" size={24} color={COLORS.error} /></TouchableOpacity>
            <View style={[styles.imageBadge, { backgroundColor: COLORS.accent }]}><Text style={styles.imageBadgeText}>{index + 1}</Text></View>
          </View>
        ))}
        {images.length < 8 && (
          <TouchableOpacity style={[styles.addImageContainer, { borderColor: COLORS.accent, backgroundColor: COLORS.addImageBg }]} onPress={pickImage}>
            <View style={styles.addImageIconContainer}><Ionicons name="add-circle" size={40} color={COLORS.accent} /></View>
            <Text style={[styles.addImageText, { color: COLORS.accent }]}>{fr ? 'Ajouter une photo' : 'Add Photo'}</Text>
            <Text style={[styles.addImageSubtext, { color: COLORS.textSecondary }]}>{images.length}/8</Text>
          </TouchableOpacity>
        )}
      </ScrollView>
      <View style={[styles.tipsContainer, { backgroundColor: COLORS.tipsBg, borderColor: COLORS.tipsBorder }]}>
        <Ionicons name="bulb" size={20} color={COLORS.gold} />
        <Text style={[styles.tipsText, { color: COLORS.gold }]}>{fr ? 'Conseils : Prenez des photos sous bon éclairage, sous plusieurs angles' : 'Tips: Take photos in good lighting, from multiple angles'}</Text>
      </View>
    </View>
  );

  const renderStep2 = () => (
    <View style={styles.stepContainer}>
      <View style={styles.sectionHeader}>
        <View style={[styles.sectionIconContainer, { backgroundColor: COLORS.iconBg, borderColor: COLORS.iconBorder }]}>
          <Ionicons name="document-text" size={28} color={COLORS.accent} />
        </View>
        <View>
          <Text style={[styles.sectionTitle, { color: COLORS.text }]}>{fr ? 'Détails du produit' : 'Product Details'}</Text>
          <Text style={[styles.sectionSubtitle, { color: COLORS.textSecondary }]}>{fr ? 'Remplissez les informations essentielles' : 'Fill in essential information'}</Text>
        </View>
      </View>
      <View style={[styles.inputContainer, { backgroundColor: COLORS.surface, borderColor: COLORS.border }]}>
        <View style={styles.inputHeader}><FontAwesome name="tag" size={16} color={COLORS.accent} /><Text style={[styles.inputLabel, { color: COLORS.text }]}>{fr ? 'Titre du produit *' : 'Product Title *'}</Text></View>
        <TextInput style={[styles.input, { backgroundColor: COLORS.inputBg, borderColor: formErrors.title ? COLORS.error : COLORS.inputBorder, color: COLORS.inputText }]} value={formData.title} onChangeText={text => handleInputChange('title', text)} placeholder={fr ? 'Ex: iPhone 15 Pro Max 256GB' : 'Ex: iPhone 15 Pro Max 256GB'} placeholderTextColor={COLORS.placeholder} autoCapitalize="sentences" />
        {formErrors.title && <Text style={[styles.errorText, { color: COLORS.error }]}>{formErrors.title}</Text>}
      </View>
      <View style={[styles.inputContainer, { backgroundColor: COLORS.surface, borderColor: COLORS.border }]}>
        <View style={styles.inputHeaderRow}>
          <View style={styles.inputHeader}>
            <FontAwesome name="align-left" size={16} color={COLORS.accent} />
            <Text style={[styles.inputLabel, { color: COLORS.text }]}>{fr ? 'Description détaillée *' : 'Detailed Description *'}</Text>
          </View>
          <TouchableOpacity
            style={[styles.aiButton, { backgroundColor: COLORS.accent }]}
            onPress={generateDescriptionWithAI}
            disabled={isGeneratingDesc || !formData.title || !formData.category}
          >
            {isGeneratingDesc ? (
              <ActivityIndicator size="small" color={COLORS.white} />
            ) : (
              <>
                <MaterialCommunityIcons name="robot" size={16} color={COLORS.white} />
                <Text style={styles.aiButtonText}>{fr ? 'Générer avec IA' : 'Generate with AI'}</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
        <TextInput
          style={[styles.input, styles.textArea, { backgroundColor: COLORS.inputBg, borderColor: formErrors.description ? COLORS.error : COLORS.inputBorder, color: COLORS.inputText }]}
          multiline numberOfLines={6}
          value={formData.description}
          onChangeText={text => handleInputChange('description', text)}
          placeholder={fr ? 'Décrivez votre produit avec précision...' : 'Describe your product accurately...'}
          placeholderTextColor={COLORS.placeholder}
          textAlignVertical="top"
        />
        <View style={styles.charCount}>
          <Text style={[styles.charCountText, formData.description.length < 20 && { color: COLORS.warning }, { color: COLORS.textSecondary }]}>
            {formData.description.length} / {fr ? '20 caractères minimum' : '20 characters minimum'}
          </Text>
        </View>
        {formErrors.description && <Text style={[styles.errorText, { color: COLORS.error }]}>{formErrors.description}</Text>}
      </View>
      <View style={styles.row}>
        <View style={[styles.inputContainer, { flex: 1, marginRight: 8, backgroundColor: COLORS.surface, borderColor: COLORS.border }]}>
          <View style={styles.inputHeader}><Ionicons name="apps" size={16} color={COLORS.accent} /><Text style={[styles.inputLabel, { color: COLORS.accent }]}>{fr ? 'Catégorie *' : 'Category *'}</Text></View>
          <View style={[styles.pickerWrapper, { backgroundColor: COLORS.pickerBg, borderColor: COLORS.pickerBorder }]}>
            <Picker
              selectedValue={formData.category}
              onValueChange={(itemValue) => handleInputChange('category', itemValue)}
              mode="dropdown"
              style={[styles.picker, { color: COLORS.accent }]}
              dropdownIconColor={COLORS.accent}
            >
              <Picker.Item
                label={fr ? '-- Sélectionnez une catégorie --' : '-- Select a category --'}
                value=""
                enabled={false}
                color={COLORS.placeholder}
              />
              {categories.map(item => (
                <Picker.Item key={item.value} label={item.label} value={item.value} color={COLORS.accent} />
              ))}
            </Picker>
          </View>
          {formErrors.category && <Text style={[styles.errorText, { color: COLORS.error }]}>{formErrors.category}</Text>}
        </View>
        <View style={[styles.inputContainer, { flex: 1, marginLeft: 8, backgroundColor: COLORS.surface, borderColor: COLORS.border }]}>
          <View style={styles.inputHeader}><FontAwesome name="star" size={16} color={COLORS.accent} /><Text style={[styles.inputLabel, { color: COLORS.accent }]}>{fr ? 'État' : 'Condition'}</Text></View>
          <View style={[styles.pickerWrapper, { backgroundColor: COLORS.pickerBg, borderColor: COLORS.pickerBorder }]}>
            <Picker selectedValue={formData.condition} onValueChange={(itemValue) => handleInputChange('condition', itemValue)} mode="dropdown" style={[styles.picker, { color: COLORS.accent }]} dropdownIconColor={COLORS.accent}>
              {conditions.map(item => (<Picker.Item key={item.value} label={item.label} value={item.value} color={COLORS.accent} />))}
            </Picker>
          </View>
        </View>
      </View>
    </View>
  );

  const renderStep3 = () => (
    <View style={styles.stepContainer}>
      <View style={styles.sectionHeader}>
        <View style={[styles.sectionIconContainer, { backgroundColor: COLORS.iconBg, borderColor: COLORS.iconBorder }]}>
          <FontAwesome name="dollar-sign" size={28} color={COLORS.accent} />
        </View>
        <View>
          <Text style={[styles.sectionTitle, { color: COLORS.text }]}>{fr ? 'Prix & Livraison' : 'Price & Delivery'}</Text>
          <Text style={[styles.sectionSubtitle, { color: COLORS.textSecondary }]}>{fr ? 'Fixez votre prix et options de livraison' : 'Set your price and delivery options'}</Text>
        </View>
      </View>
      <View style={[styles.inputContainer, { backgroundColor: COLORS.surface, borderColor: COLORS.border }]}>
        <View style={styles.inputHeader}><FontAwesome name="money-bill-wave" size={16} color={COLORS.success} /><Text style={[styles.inputLabel, { color: COLORS.text }]}>{fr ? 'Prix de vente ($) *' : 'Selling Price ($) *'}</Text></View>
        <View style={styles.priceWrapper}>
          <View style={styles.priceInputContainer}>
            <View style={[styles.currencySymbol, { backgroundColor: COLORS.currencyBg, borderColor: COLORS.currencyBorder }]}><Text style={[styles.currencyText, { color: COLORS.success }]}>$</Text></View>
            <TextInput style={[styles.priceInput, { backgroundColor: COLORS.inputBg, borderColor: formErrors.price ? COLORS.error : COLORS.inputBorder, color: COLORS.inputText }]} keyboardType="numeric" value={formData.price} onChangeText={(text) => handleInputChange('price', text)} placeholder="0.00" placeholderTextColor={COLORS.placeholder} />
          </View>
          {formData.price && (<View style={[styles.priceDisplay, { backgroundColor: COLORS.priceDisplayBg, borderColor: COLORS.priceDisplayBorder }]}><Text style={[styles.priceDisplayText, { color: COLORS.success }]}>{formatPrice(formData.price)}</Text></View>)}
        </View>
        {formErrors.price && <Text style={[styles.errorText, { color: COLORS.error }]}>{formErrors.price}</Text>}
      </View>
      <TouchableOpacity style={[styles.promoContainer, { backgroundColor: COLORS.promoBg, borderColor: COLORS.promoBorder }]} onPress={() => { setIsPromo(!isPromo); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}>
        <View style={styles.promoHeader}>
          <View style={[styles.promoIcon, { backgroundColor: COLORS.promoIconBg, borderColor: COLORS.promoIconBorder }]}>{isPromo ? <FontAwesome name="fire" size={20} color={COLORS.warning} /> : <FontAwesome name="tag" size={20} color={COLORS.textSecondary} />}</View>
          <Text style={[styles.promoTitle, { color: COLORS.text }]}>{isPromo ? (fr ? 'Produit en promotion' : 'Product on Sale') : (fr ? 'Mettre en promotion' : 'Put on Sale')}</Text>
          <View style={[styles.toggle, isPromo && { backgroundColor: COLORS.warning }, { backgroundColor: COLORS.toggleOff }]}><View style={[styles.toggleButton, { backgroundColor: COLORS.white }, isPromo && styles.toggleButtonActive]} /></View>
        </View>
        {isPromo && (
          <View style={[styles.promoInputContainer, { borderTopColor: COLORS.promoBorder }]}>
            <View style={styles.inputHeader}><FontAwesome name="history" size={16} color={COLORS.warning} /><Text style={[styles.inputLabel, { color: COLORS.text }]}>{fr ? 'Prix original ($) *' : 'Original Price ($) *'}</Text></View>
            <View style={styles.priceInputContainer}>
              <View style={[styles.currencySymbol, { backgroundColor: COLORS.currencyBg, borderColor: COLORS.currencyBorder }]}><Text style={[styles.currencyText, { color: COLORS.success }]}>$</Text></View>
              <TextInput style={[styles.priceInput, { backgroundColor: COLORS.inputBg, borderColor: formErrors.originalPrice ? COLORS.error : COLORS.inputBorder, color: COLORS.inputText }]} keyboardType="numeric" value={formData.originalPrice} onChangeText={(text) => handleInputChange('originalPrice', text)} placeholder="0.00" placeholderTextColor={COLORS.placeholder} />
            </View>
            {formData.originalPrice && formData.price && (<View style={[styles.discountTag, { backgroundColor: COLORS.warning }]}><Text style={styles.discountText}>-{Math.round((1 - parseFloat(formData.price) / parseFloat(formData.originalPrice)) * 100)}%</Text></View>)}
            {formErrors.originalPrice && <Text style={[styles.errorText, { color: COLORS.error }]}>{formErrors.originalPrice}</Text>}
          </View>
        )}
      </TouchableOpacity>
      <View style={[styles.inputContainer, { backgroundColor: COLORS.surface, borderColor: COLORS.border }]}>
        <View style={styles.inputHeader}><FontAwesome name="boxes" size={16} color={COLORS.accent} /><Text style={[styles.inputLabel, { color: COLORS.text }]}>{fr ? 'Quantité disponible *' : 'Available Quantity *'}</Text></View>
        <View style={styles.quantityWrapper}>
          <TouchableOpacity style={[styles.quantityButton, { backgroundColor: COLORS.qtyBtnBg, borderColor: COLORS.qtyBtnBorder }]} onPress={() => { const current = parseInt(formData.stock) || 1; if (current > 1) handleInputChange('stock', (current - 1).toString()); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}><Ionicons name="remove" size={24} color={COLORS.accent} /></TouchableOpacity>
          <TextInput style={[styles.quantityInput, { backgroundColor: COLORS.inputBg, borderColor: COLORS.inputBorder, color: COLORS.inputText }]} keyboardType="numeric" value={formData.stock} onChangeText={(text) => handleInputChange('stock', text)} textAlign="center" />
          <TouchableOpacity style={[styles.quantityButton, { backgroundColor: COLORS.qtyBtnBg, borderColor: COLORS.qtyBtnBorder }]} onPress={() => { const current = parseInt(formData.stock) || 1; handleInputChange('stock', (current + 1).toString()); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}><Ionicons name="add" size={24} color={COLORS.accent} /></TouchableOpacity>
        </View>
        {formErrors.stock && <Text style={[styles.errorText, { color: COLORS.error }]}>{formErrors.stock}</Text>}
      </View>
      <View style={[styles.inputContainer, { backgroundColor: COLORS.surface, borderColor: COLORS.border }]}>
        <View style={styles.locationHeader}>
          <View style={styles.inputHeader}><Ionicons name="location" size={16} color={COLORS.accent} /><Text style={[styles.inputLabel, { color: COLORS.text }]}>{fr ? 'Localisation' : 'Location'}</Text></View>
          <TouchableOpacity style={[styles.locationToggle, { backgroundColor: COLORS.locationToggleBg, borderColor: COLORS.locationToggleBorder }]} onPress={toggleLocation}>
            <Ionicons name={useLocation ? "location" : "location-outline"} size={20} color={useLocation ? COLORS.success : COLORS.accent} />
            <Text style={[styles.locationToggleText, { color: COLORS.accent }]}>{useLocation ? (fr ? 'Désactiver GPS' : 'Disable GPS') : (fr ? 'Utiliser GPS' : 'Use GPS')}</Text>
          </TouchableOpacity>
        </View>
        {useLocation ? (
          <View style={[styles.locationContainer, { backgroundColor: COLORS.locationBg, borderColor: COLORS.locationBorder }]}>
            {formData.location ? (<><Ionicons name="checkmark-circle" size={20} color={COLORS.success} /><Text style={[styles.locationText, { color: COLORS.success }]}>{formData.location}</Text></>) : (<View style={styles.locationLoading}><ActivityIndicator size="small" color={COLORS.accent} /><Text style={[styles.locationLoadingText, { color: COLORS.accent }]}>{fr ? 'Détection en cours...' : 'Detecting...'}</Text></View>)}
          </View>
        ) : (<TextInput style={[styles.input, { backgroundColor: COLORS.inputBg, borderColor: COLORS.inputBorder, color: COLORS.inputText }]} value={formData.location} onChangeText={(text) => handleInputChange('location', text)} placeholder={fr ? 'Ville, région, pays' : 'City, region, country'} placeholderTextColor={COLORS.placeholder} />)}
      </View>
      <View style={[styles.inputContainer, { backgroundColor: COLORS.surface, borderColor: COLORS.border }]}>
        <View style={styles.inputHeader}><FontAwesome name="shipping-fast" size={16} color={COLORS.accent} /><Text style={[styles.inputLabel, { color: COLORS.text }]}>{fr ? 'Options de livraison' : 'Delivery Options'}</Text></View>
        <View style={styles.deliveryOptionsGrid}>
          {deliveryOptions.map((option) => (
            <TouchableOpacity key={option.value} style={[styles.deliveryOption, { backgroundColor: COLORS.deliveryBg, borderColor: formData.deliveryOptions.includes(option.value) ? COLORS.accent : COLORS.border }, formData.deliveryOptions.includes(option.value) && { backgroundColor: COLORS.deliverySelectedBg }]} onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); const currentOptions = [...formData.deliveryOptions]; if (currentOptions.includes(option.value)) { if (currentOptions.length > 1) { const index = currentOptions.indexOf(option.value); currentOptions.splice(index, 1); } } else { currentOptions.push(option.value); } setFormData(prev => ({ ...prev, deliveryOptions: currentOptions })); }}>
              <FontAwesome name={option.icon as any} size={20} color={formData.deliveryOptions.includes(option.value) ? COLORS.accent : COLORS.textSecondary} />
              <Text style={[styles.deliveryOptionText, { color: formData.deliveryOptions.includes(option.value) ? COLORS.accent : COLORS.textSecondary }, formData.deliveryOptions.includes(option.value) && { fontWeight: '600' }]}>{option.label}</Text>
              {formData.deliveryOptions.includes(option.value) && (<View style={[styles.deliveryCheck, { backgroundColor: COLORS.accent }]}><Ionicons name="checkmark" size={16} color={COLORS.white} /></View>)}
            </TouchableOpacity>
          ))}
        </View>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: COLORS.background }]}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}>
        <View style={[styles.header, { backgroundColor: COLORS.headerBg, borderBottomColor: COLORS.headerBorder }]}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}><Ionicons name="chevron-back" size={28} color={COLORS.accent} /></TouchableOpacity>
          <View style={styles.headerCenter}>
            <Text style={[styles.headerTitle, { color: COLORS.accent }]}>SHOPNET</Text>
            <View style={[styles.vipBadge, { backgroundColor: COLORS.vipBg, borderColor: COLORS.vipBorder }]}><FontAwesome name="crown" size={12} color={COLORS.gold} /><Text style={[styles.vipText, { color: COLORS.gold }]}>PRO</Text></View>
          </View>
          <View style={styles.headerRight}><Text style={[styles.stepCounter, { color: COLORS.textSecondary }]}>{fr ? 'Étape' : 'Step'} {activeStep}/3</Text></View>
        </View>
        {showSuccess && (<View style={[styles.successNotification, { backgroundColor: COLORS.success }]}><Ionicons name="checkmark-circle" size={24} color={COLORS.white} /><Text style={[styles.successNotificationText, { color: COLORS.white }]}>{fr ? 'Produit publié avec succès !' : 'Product published successfully!'}</Text></View>)}
        {renderStepIndicator()}
        <ScrollView ref={scrollViewRef} contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          {activeStep === 1 && renderStep1()}
          {activeStep === 2 && renderStep2()}
          {activeStep === 3 && renderStep3()}
          {submitError && (<View style={[styles.errorAlert, { backgroundColor: COLORS.errorBg, borderColor: COLORS.errorBorder }]}><Ionicons name="alert-circle" size={24} color={COLORS.error} /><Text style={[styles.errorAlertText, { color: COLORS.error }]}>{submitError}</Text></View>)}
          <View style={[styles.navigationButtons, activeStep === 1 ? { justifyContent: 'flex-end' } : { justifyContent: 'space-between' }]}>
            {activeStep > 1 && (<TouchableOpacity style={[styles.secondaryButton, { backgroundColor: COLORS.secBtnBg, borderColor: COLORS.secBtnBorder }]} onPress={handlePrevStep}><Ionicons name="arrow-back" size={20} color={COLORS.accent} /><Text style={[styles.secondaryButtonText, { color: COLORS.accent }]}>{fr ? 'Précédent' : 'Previous'}</Text></TouchableOpacity>)}
            {activeStep < 3 && (<TouchableOpacity style={[styles.primaryButton, { backgroundColor: COLORS.accent }, activeStep === 1 ? { flex: 1 } : { width: width / 2 - 30 }]} onPress={handleNextStep}><Text style={styles.primaryButtonText}>{fr ? 'Continuer' : 'Continue'}</Text><Ionicons name="arrow-forward" size={20} color={COLORS.white} /></TouchableOpacity>)}
            {activeStep === 3 && (<TouchableOpacity style={[styles.primaryButton, { backgroundColor: COLORS.accent }, isSubmitting && styles.buttonDisabled]} onPress={handleSubmit} disabled={isSubmitting}>{isSubmitting ? <ActivityIndicator color={COLORS.white} /> : <><FontAwesome name="rocket" size={20} color={COLORS.white} /><Text style={styles.primaryButtonText}>{fr ? 'Publier maintenant' : 'Publish Now'}</Text></>}</TouchableOpacity>)}
          </View>
          <View style={[styles.footer, { borderTopColor: COLORS.footerBorder }]}><Text style={[styles.footerText, { color: COLORS.gold }]}>{fr ? '💎 Publication VIP • Visibilité maximale • Support prioritaire' : '💎 VIP Publication • Maximum Visibility • Priority Support'}</Text></View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  flex: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 1 },
  backButton: { padding: 4 },
  headerCenter: { alignItems: 'center', flexDirection: 'row' },
  headerTitle: { fontSize: 28, fontWeight: '900', marginRight: 8, letterSpacing: 1 },
  vipBadge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, borderWidth: 1 },
  vipText: { fontSize: 12, fontWeight: '800', marginLeft: 4 },
  headerRight: {},
  stepCounter: { fontSize: 14, fontWeight: '600' },
  successNotification: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, marginHorizontal: 20, marginTop: 10, borderRadius: 8 },
  successNotificationText: { fontSize: 16, fontWeight: '600', marginLeft: 12 },
  stepIndicatorContainer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 40, paddingVertical: 20, marginHorizontal: 20, marginTop: 10, borderRadius: 16, borderWidth: 1 },
  stepRow: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  stepCircle: { width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center', zIndex: 1, borderWidth: 2 },
  stepNumber: { fontSize: 16, fontWeight: '700' },
  stepLabel: { fontSize: 12, fontWeight: '600', marginTop: 6, textAlign: 'center' },
  stepConnector: { flex: 1, height: 3, marginHorizontal: 4 },
  container: { paddingHorizontal: 20, paddingBottom: 40 },
  stepContainer: { marginTop: 20 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 24 },
  sectionIconContainer: { width: 56, height: 56, borderRadius: 28, justifyContent: 'center', alignItems: 'center', marginRight: 16, borderWidth: 1 },
  sectionTitle: { fontSize: 22, fontWeight: '700', marginBottom: 4 },
  sectionSubtitle: { fontSize: 14 },
  errorContainer: { flexDirection: 'row', alignItems: 'center', padding: 16, borderRadius: 12, marginBottom: 20, borderWidth: 1 },
  errorText: { fontSize: 14, fontWeight: '600', marginLeft: 12, flex: 1 },
  imageScroll: { flexDirection: 'row', marginBottom: 20 },
  imageContainer: { position: 'relative', marginRight: 12, width: 140, height: 140, borderRadius: 12 },
  image: { width: '100%', height: '100%', borderRadius: 12, backgroundColor: '#2C3A4A' },
  deleteImageButton: { position: 'absolute', top: -8, right: -8, borderRadius: 20, width: 32, height: 32, justifyContent: 'center', alignItems: 'center', zIndex: 10, borderWidth: 2 },
  imageBadge: { position: 'absolute', top: 8, left: 8, borderRadius: 10, width: 24, height: 24, justifyContent: 'center', alignItems: 'center' },
  imageBadgeText: { color: '#FFFFFF', fontSize: 12, fontWeight: '800' },
  addImageContainer: { width: 140, height: 140, borderRadius: 12, borderWidth: 2, borderStyle: 'dashed', justifyContent: 'center', alignItems: 'center' },
  addImageIconContainer: { marginBottom: 8 },
  addImageText: { fontSize: 14, fontWeight: '600', textAlign: 'center' },
  addImageSubtext: { fontSize: 12, marginTop: 4 },
  tipsContainer: { flexDirection: 'row', alignItems: 'center', padding: 16, borderRadius: 12, borderWidth: 1 },
  tipsText: { fontSize: 14, marginLeft: 12, flex: 1, fontWeight: '500' },
  inputContainer: { borderRadius: 12, padding: 16, marginBottom: 16, borderWidth: 1 },
  inputHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  inputHeaderRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  inputLabel: { fontSize: 16, fontWeight: '600', marginLeft: 8 },
  input: { paddingHorizontal: 16, paddingVertical: 12, borderRadius: 8, fontSize: 16, borderWidth: 1 },
  textArea: { minHeight: 120, textAlignVertical: 'top' },
  charCount: { marginTop: 8 },
  charCountText: { fontSize: 12 },
  row: { flexDirection: 'row', justifyContent: 'space-between' },
  pickerWrapper: { borderRadius: 8, borderWidth: 1 },
  picker: { height: 50 },
  priceWrapper: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  priceInputContainer: { flexDirection: 'row', alignItems: 'center', flex: 1, marginRight: 12 },
  currencySymbol: { paddingHorizontal: 16, paddingVertical: 12, borderTopLeftRadius: 8, borderBottomLeftRadius: 8, borderWidth: 1 },
  currencyText: { fontSize: 18, fontWeight: '800' },
  priceInput: { flex: 1, paddingHorizontal: 16, paddingVertical: 12, borderTopRightRadius: 8, borderBottomRightRadius: 8, fontSize: 16, borderWidth: 1, borderLeftWidth: 0 },
  priceDisplay: { paddingHorizontal: 16, paddingVertical: 12, borderRadius: 8, borderWidth: 1 },
  priceDisplayText: { fontSize: 16, fontWeight: '700' },
  promoContainer: { borderRadius: 12, padding: 16, marginBottom: 16, borderWidth: 1 },
  promoHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  promoIcon: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center', borderWidth: 1 },
  promoTitle: { flex: 1, fontSize: 16, fontWeight: '600', marginLeft: 12 },
  toggle: { width: 52, height: 28, borderRadius: 14, padding: 2, justifyContent: 'center' },
  toggleButton: { width: 24, height: 24, borderRadius: 12, backgroundColor: '#FFFFFF' },
  toggleButtonActive: { alignSelf: 'flex-end' },
  promoInputContainer: { marginTop: 16, paddingTop: 16, borderTopWidth: 1 },
  discountTag: { position: 'absolute', top: 16, right: 16, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 6 },
  discountText: { color: '#FFFFFF', fontSize: 14, fontWeight: '800' },
  quantityWrapper: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  quantityButton: { width: 48, height: 48, borderRadius: 24, justifyContent: 'center', alignItems: 'center', borderWidth: 1 },
  quantityInput: { flex: 1, fontSize: 24, fontWeight: '700', padding: 12, marginHorizontal: 12, borderRadius: 8, borderWidth: 1, textAlign: 'center' },
  locationHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  locationToggle: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, borderWidth: 1 },
  locationToggleText: { fontSize: 14, fontWeight: '600', marginLeft: 6 },
  locationContainer: { flexDirection: 'row', alignItems: 'center', padding: 16, borderRadius: 8, borderWidth: 1 },
  locationText: { fontSize: 16, fontWeight: '600', marginLeft: 12, flex: 1 },
  locationLoading: { flexDirection: 'row', alignItems: 'center' },
  locationLoadingText: { fontSize: 14, marginLeft: 12, fontStyle: 'italic' },
  deliveryOptionsGrid: { flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: -4 },
  deliveryOption: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, borderRadius: 8, margin: 4, flex: 1, minWidth: width / 2 - 40, borderWidth: 1 },
  deliveryOptionText: { fontSize: 14, marginLeft: 8, flex: 1 },
  deliveryCheck: { width: 20, height: 20, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  errorAlert: { flexDirection: 'row', alignItems: 'center', padding: 16, borderRadius: 12, marginVertical: 16, borderWidth: 1 },
  errorAlertText: { fontSize: 14, fontWeight: '600', marginLeft: 12, flex: 1 },
  navigationButtons: { flexDirection: 'row', marginTop: 32, marginBottom: 20 },
  primaryButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24, paddingVertical: 16, borderRadius: 12 },
  primaryButtonText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700', marginHorizontal: 8 },
  secondaryButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24, paddingVertical: 16, borderRadius: 12, borderWidth: 1, flex: 1, marginRight: 12 },
  secondaryButtonText: { fontSize: 16, fontWeight: '700', marginLeft: 8 },
  buttonDisabled: { opacity: 0.7 },
  footer: { alignItems: 'center', paddingVertical: 16, borderTopWidth: 1, marginTop: 16 },
  footerText: { fontSize: 12, fontWeight: '600', textAlign: 'center' },
  aiButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 6,
  },
  aiButtonText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
});

export default ProductForm;