

import { useRouter } from 'expo-router';
import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  TextInput, Image, Alert, KeyboardAvoidingView,
  ActivityIndicator, Platform, Dimensions, SafeAreaView,
} from 'react-native';
import { FontAwesome, Ionicons, Feather } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { Picker } from '@react-native-picker/picker';
import * as Location from 'expo-location';
import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width } = Dimensions.get('window');
const API_URL = 'https://shopnet-backend.onrender.com/api/boutique/products';

interface ProductFormData {
  title: string;
  description: string;
  price: string;
  category: string;
  stock: string;
  location: string;
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
    category: 'mode',
    stock: '1',
    location: '',
  });

  const [images, setImages] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [activeStep, setActiveStep] = useState(1);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [useLocation, setUseLocation] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [authToken, setAuthToken] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const scrollViewRef = useRef<ScrollView>(null);

  const categories = [
    { label: '✨ Tendance', value: 'trending' },
    { label: '👗 Mode', value: 'mode' },
    { label: '📱 Tech', value: 'tech' },
    { label: '🏠 Maison', value: 'home' },
    { label: '💄 Beauté', value: 'beauty' },
    { label: 'Autre', value: 'autre' },
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
    if (images.length >= 5) {
      Alert.alert('Maximum atteint', 'Vous ne pouvez ajouter que 5 images maximum');
      return;
    }

    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.7,
      });

      if (!result.canceled && result.assets?.[0]?.uri) {
        setImages(prev => [...prev, result.assets[0].uri]);
      }
    } catch (error) {
      console.error('Erreur lors de la sélection de l\'image:', error);
      Alert.alert('Erreur', 'Impossible de sélectionner l\'image');
    }
  };

  const removeImage = (index: number) => {
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
        const country = place.country === 'Democratic Republic of the Congo' ? 'RDC' : place.country;
        const locationString = `${city}, ${country}`;
        setFormData(prev => ({
          ...prev,
          location: locationString,
        }));
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
  };

  const validateStep = (step: number): boolean => {
    const errors: Record<string, string> = {};

    if (step === 1) {
      if (images.length === 0) errors.images = 'Ajoutez au moins une photo';
    }

    if (step === 2) {
      if (!formData.title.trim()) errors.title = 'Titre requis';
      else if (formData.title.length < 3) errors.title = 'Titre trop court (min 3 caractères)';

      if (!formData.description.trim()) errors.description = 'Description requise';
      else if (formData.description.length < 10) errors.description = 'Description trop courte (min 10 caractères)';
    }

    if (step === 3) {
      if (!formData.price) errors.price = 'Prix requis';
      else if (isNaN(parseFloat(formData.price)) || parseFloat(formData.price) <= 0) errors.price = 'Prix invalide';

      if (!formData.stock) errors.stock = 'Quantité requise';
      else if (isNaN(parseInt(formData.stock)) || parseInt(formData.stock) < 0) errors.stock = 'Quantité invalide';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleNextStep = () => {
    if (validateStep(activeStep)) {
      setActiveStep(prev => prev + 1);
      scrollViewRef.current?.scrollTo({ y: 0 });
    }
  };

  const formatPrice = (price: string) => {
    if (!price) return '';
    const numericValue = parseFloat(price);
    if (isNaN(numericValue)) return '';
    return `$${numericValue.toFixed(2)}`;
  };

  // Prépare et compresse l'image, retourne un objet compatible FormData
  const prepareImageForUpload = async (uri: string, index: number): Promise<ImageInfo> => {
    try {
      // Manipuler l'image: resize + compression
      const manipResult = await manipulateAsync(
        uri,
        [{ resize: { width: 800 } }],
        { compress: 0.7, format: SaveFormat.JPEG }
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

    setIsLoading(true);
    setSubmitError(null);

    try {
      const formDataToSend = new FormData();

      // Champs texte selon votre backend
      formDataToSend.append('title', formData.title.trim());
      formDataToSend.append('description', formData.description);
      formDataToSend.append('price', formData.price);
      formDataToSend.append('category', formData.category);
      formDataToSend.append('stock', formData.stock);
      formDataToSend.append('location', formData.location || '');

      // Ajout des images préparées
      for (let i = 0; i < images.length; i++) {
        const imageInfo = await prepareImageForUpload(images[i], i);

        if (Platform.OS === 'web') {
          // Web: fetch blob
          const response = await fetch(imageInfo.uri);
          const blob = await response.blob();
          formDataToSend.append('images', blob, imageInfo.name);
        } else {
          // iOS / Android: ajouter l'objet
          formDataToSend.append('images', {
            uri: imageInfo.uri,
            name: imageInfo.name,
            type: imageInfo.type,
          } as any);
        }
      }

      console.log('Envoi des données au backend...');
      console.log('Données envoyées:', {
        title: formData.title,
        description: formData.description,
        price: formData.price,
        category: formData.category,
        stock: formData.stock,
        location: formData.location,
        imagesCount: images.length
      });

      const response = await fetch(API_URL, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Accept': 'application/json',
          // Note: Ne pas mettre 'Content-Type' pour FormData, le navigateur le gère automatiquement
        },
        body: formDataToSend,
      });

      const responseData = await response.json();
      console.log('Réponse du serveur:', responseData);

      if (!response.ok) {
        throw new Error(responseData.error || responseData.message || `Erreur ${response.status} lors de la publication`);
      }

      if (responseData.success) {
        setSuccessMessage('✅ Produit publié avec succès!');
        setFormData({
          title: '',
          description: '',
          price: '',
          category: 'mode',
          stock: '1',
          location: '',
        });
        setImages([]);
        setActiveStep(1);

        setTimeout(() => {
          setSuccessMessage(null);
          router.push('/(tabs)/Auth/Produits/Fil');
        }, 2000);
      } else {
        throw new Error(responseData.message || 'Erreur lors de la publication');
      }
    } catch (error: any) {
      console.error('Erreur de soumission:', error);
      setSubmitError(error.message || 'Échec de la publication. Veuillez réessayer.');

      if (error.message.includes('401') || error.message.includes('token')) {
        Alert.alert('Session expirée', 'Veuillez vous reconnecter');
        await AsyncStorage.removeItem('userToken');
        router.push('/splash');
      }
    } finally {
      setIsLoading(false);
    }
  };

  // UI rendering des étapes (1 à 3)

  const renderStep1 = () => (
    <View style={styles.stepContainer}>
      <Text style={styles.stepTitle}>📸 Photos du produit</Text>
      <Text style={styles.stepSubtitle}>Ajoutez jusqu'à 5 photos de votre produit</Text>
      
      {formErrors.images && <Text style={styles.errorText}>{formErrors.images}</Text>}

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.imageScroll}>
        {images.map((uri, index) => (
          <View key={index} style={styles.imageContainer}>
            <Image source={{ uri }} style={styles.image} />
            <TouchableOpacity
              style={styles.deleteImageButton}
              onPress={() => removeImage(index)}>
              <Ionicons name="close" size={16} color="white" />
            </TouchableOpacity>
          </View>
        ))}

        {images.length < 5 && (
          <TouchableOpacity style={styles.addImageButton} onPress={pickImage}>
            <Feather name="plus" size={32} color="#42A5F5" />
            <Text style={styles.addImageText}>Ajouter une photo</Text>
            <Text style={styles.addImageSubtext}>({5 - images.length} restantes)</Text>
          </TouchableOpacity>
        )}
      </ScrollView>
    </View>
  );

  const renderStep2 = () => (
    <View style={styles.stepContainer}>
      <Text style={styles.stepTitle}>📝 Détails du produit</Text>
      <Text style={styles.stepSubtitle}>Renseignez les informations de base</Text>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>Titre du produit *</Text>
        <TextInput
          style={[styles.input, formErrors.title && styles.inputError]}
          value={formData.title}
          onChangeText={text => handleInputChange('title', text)}
          placeholder="Ex: T-shirt coton premium"
          placeholderTextColor="#A0AEC0"
          autoCapitalize="sentences"
        />
        {formErrors.title && <Text style={styles.errorText}>{formErrors.title}</Text>}
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>Description *</Text>
        <TextInput
          style={[styles.input, styles.textArea, formErrors.description && styles.inputError]}
          multiline
          numberOfLines={4}
          value={formData.description}
          onChangeText={text => handleInputChange('description', text)}
          placeholder="Décrivez votre produit en détail (matière, taille, état, etc.)"
          placeholderTextColor="#A0AEC0"
          textAlignVertical="top"
        />
        {formErrors.description && <Text style={styles.errorText}>{formErrors.description}</Text>}
      </View>

      <View style={styles.row}>
        <View style={[styles.inputGroup, { flex: 1, marginRight: 8 }]}>
          <Text style={styles.label}>Catégorie</Text>
          <View style={styles.pickerContainer}>
            <Picker
              selectedValue={formData.category}
              onValueChange={(itemValue) => handleInputChange('category', itemValue)}
              mode="dropdown"
              dropdownIconColor="#42A5F5"
              style={{ color: 'white' }}
            >
              {categories.map(item => (
                <Picker.Item 
                  key={item.value} 
                  label={item.label} 
                  value={item.value} 
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
      <Text style={styles.stepTitle}>💰 Prix et localisation</Text>
      <Text style={styles.stepSubtitle}>Définissez le prix et l'emplacement</Text>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>Prix (USD) *</Text>
        <View style={styles.priceInputContainer}>
          <Text style={styles.currencySymbol}>$</Text>
          <TextInput
            style={[styles.input, styles.priceInput, formErrors.price && styles.inputError]}
            keyboardType="numeric"
            value={formData.price}
            onChangeText={(text) => handleInputChange('price', text)}
            placeholder="0.00"
            placeholderTextColor="#A0AEC0"
          />
        </View>
        {formData.price && <Text style={styles.formattedPrice}>{formatPrice(formData.price)}</Text>}
        {formErrors.price && <Text style={styles.errorText}>{formErrors.price}</Text>}
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>Quantité disponible *</Text>
        <TextInput
          style={[styles.input, formErrors.stock && styles.inputError]}
          keyboardType="numeric"
          value={formData.stock}
          onChangeText={(text) => handleInputChange('stock', text)}
          placeholder="1"
          placeholderTextColor="#A0AEC0"
        />
        {formErrors.stock && <Text style={styles.errorText}>{formErrors.stock}</Text>}
      </View>

      <View style={styles.inputGroup}>
        <View style={styles.locationHeader}>
          <Text style={styles.label}>Localisation</Text>
          <TouchableOpacity onPress={toggleLocation} style={styles.locationToggleButton}>
            <Ionicons 
              name={useLocation ? "location" : "location-outline"} 
              size={20} 
              color="#42A5F5" 
            />
            <Text style={styles.locationToggle}>
              {useLocation ? 'Utiliser ma position' : 'Position manuelle'}
            </Text>
          </TouchableOpacity>
        </View>

        {useLocation ? (
          <View style={styles.locationContainer}>
            {formData.location ? (
              <View style={styles.locationTextContainer}>
                <Ionicons name="checkmark-circle" size={16} color="#4CAF50" />
                <Text style={styles.locationText}>Position: {formData.location}</Text>
              </View>
            ) : (
              <View style={styles.locationLoading}>
                <ActivityIndicator size="small" color="#42A5F5" />
                <Text style={styles.locationLoadingText}>Détection de la position...</Text>
              </View>
            )}
          </View>
        ) : (
          <TextInput
            style={styles.input}
            value={formData.location}
            onChangeText={(text) => handleInputChange('location', text)}
            placeholder="Entrez votre ville ou adresse"
            placeholderTextColor="#A0AEC0"
          />
        )}
      </View>
    </View>
  );

  const renderNavigationButtons = () => (
    <View style={[
      styles.navigationButtons, 
      { justifyContent: activeStep === 1 ? 'flex-end' : 'space-between' }
    ]}>
      {activeStep > 1 && (
        <TouchableOpacity
          style={styles.buttonSecondary}
          onPress={() => setActiveStep(prev => prev - 1)}
          disabled={isLoading}
        >
          <Ionicons name="arrow-back" size={18} color="#42A5F5" />
          <Text style={styles.buttonTextSecondary}>Précédent</Text>
        </TouchableOpacity>
      )}

      {activeStep < 3 && (
        <TouchableOpacity
          style={styles.buttonPrimary}
          onPress={handleNextStep}
          disabled={isLoading}
        >
          <Text style={styles.buttonTextPrimary}>Continuer</Text>
          <Ionicons name="arrow-forward" size={18} color="white" />
        </TouchableOpacity>
      )}

      {activeStep === 3 && (
        <TouchableOpacity
          style={[styles.buttonPrimary, isLoading && styles.buttonDisabled]}
          onPress={handleSubmit}
          disabled={isLoading}
        >
          {isLoading ? (
            <ActivityIndicator color="white" size="small" />
          ) : (
            <>
              <Ionicons name="cloud-upload" size={18} color="white" />
              <Text style={styles.buttonTextPrimary}>Publier le produit</Text>
            </>
          )}
        </TouchableOpacity>
      )}
    </View>
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#42A5F5" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Publier un produit</Text>
          <View style={styles.stepIndicator}>
            <Text style={styles.stepIndicatorText}>Étape {activeStep}/3</Text>
          </View>
        </View>

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
            <View style={styles.errorContainer}>
              <Ionicons name="alert-circle" size={20} color="#FF6B6B" />
              <Text style={styles.errorTextCenter}>{submitError}</Text>
            </View>
          )}
          
          {successMessage && (
            <View style={styles.successContainer}>
              <Ionicons name="checkmark-circle" size={20} color="#4CAF50" />
              <Text style={styles.successTextCenter}>{successMessage}</Text>
            </View>
          )}

          {renderNavigationButtons()}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#00182A',
  },
  flex: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#00182A',
    borderBottomWidth: 1,
    borderBottomColor: '#1E2A3B',
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: 'white',
  },
  stepIndicator: {
    backgroundColor: '#1E2A3B',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  stepIndicatorText: {
    color: '#42A5F5',
    fontSize: 12,
    fontWeight: '600',
  },
  container: {
    padding: 16,
    paddingBottom: 40,
  },
  stepContainer: {
    marginBottom: 30,
  },
  stepTitle: {
    fontSize: 24,
    fontWeight: '800',
    marginBottom: 8,
    color: 'white',
  },
  stepSubtitle: {
    fontSize: 14,
    color: '#A0AEC0',
    marginBottom: 20,
  },
  imageScroll: {
    flexDirection: 'row',
  },
  imageContainer: {
    position: 'relative',
    marginRight: 12,
  },
  image: {
    width: 120,
    height: 120,
    borderRadius: 12,
    backgroundColor: '#1E2A3B',
  },
  deleteImageButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: '#FF6B6B',
    borderRadius: 10,
    width: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  addImageButton: {
    width: 120,
    height: 120,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#42A5F5',
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(66, 165, 245, 0.1)',
  },
  addImageText: {
    marginTop: 8,
    fontSize: 14,
    color: '#42A5F5',
    fontWeight: '600',
  },
  addImageSubtext: {
    fontSize: 11,
    color: '#A0AEC0',
    marginTop: 2,
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    color: 'white',
    marginBottom: 8,
    fontWeight: '600',
    fontSize: 16,
  },
  input: {
    backgroundColor: '#1E2A3B',
    color: 'white',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#2A3748',
  },
  textArea: {
    minHeight: 100,
    textAlignVertical: 'top',
  },
  inputError: {
    borderColor: '#FF6B6B',
  },
  errorText: {
    marginTop: 6,
    color: '#FF6B6B',
    fontSize: 13,
    fontWeight: '500',
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 107, 107, 0.1)',
    padding: 12,
    borderRadius: 12,
    marginVertical: 10,
    gap: 8,
  },
  successContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(76, 175, 80, 0.1)',
    padding: 12,
    borderRadius: 12,
    marginVertical: 10,
    gap: 8,
  },
  errorTextCenter: {
    color: '#FF6B6B',
    fontSize: 14,
    fontWeight: '500',
    flex: 1,
  },
  successTextCenter: {
    color: '#4CAF50',
    fontSize: 14,
    fontWeight: '500',
    flex: 1,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  pickerContainer: {
    backgroundColor: '#1E2A3B',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#2A3748',
    overflow: 'hidden',
  },
  priceInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1E2A3B',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#2A3748',
    paddingLeft: 16,
  },
  currencySymbol: {
    color: '#42A5F5',
    fontWeight: 'bold',
    fontSize: 16,
    marginRight: 8,
  },
  priceInput: {
    flex: 1,
    borderWidth: 0,
    paddingLeft: 0,
  },
  formattedPrice: {
    marginTop: 6,
    color: '#42A5F5',
    fontSize: 14,
    fontWeight: '600',
  },
  locationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  locationToggleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  locationToggle: {
    color: '#42A5F5',
    fontWeight: '600',
    fontSize: 14,
  },
  locationContainer: {
    minHeight: 48,
    justifyContent: 'center',
  },
  locationTextContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 12,
  },
  locationText: {
    color: '#4CAF50',
    fontSize: 14,
    fontWeight: '500',
  },
  locationLoading: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 12,
  },
  locationLoadingText: {
    color: '#A0AEC0',
    fontSize: 14,
  },
  navigationButtons: {
    flexDirection: 'row',
    marginTop: 20,
    gap: 12,
  },
  buttonPrimary: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#42A5F5',
    paddingVertical: 16,
    borderRadius: 12,
    gap: 8,
  },
  buttonTextPrimary: {
    color: 'white',
    fontWeight: '700',
    fontSize: 16,
  },
  buttonSecondary: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(66, 165, 245, 0.1)',
    paddingVertical: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#42A5F5',
    gap: 8,
  },
  buttonTextSecondary: {
    color: '#42A5F5',
    fontWeight: '700',
    fontSize: 16,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
});

export default ProductForm;