




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
import * as FileSystem from 'expo-file-system';

const { width } = Dimensions.get('window');
const API_URL = 'https://shopnet-backend.onrender.com/api/products';


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
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const scrollViewRef = useRef<ScrollView>(null);

  const categories = [
    { label: '✨ Tendance', value: 'trending' },
    { label: '👗 Mode', value: 'mode' },
    { label: '📱 Tech', value: 'tech' },
    { label: '🏠 Maison', value: 'home' },
    { label: '💄 Beauté', value: 'beauty' },
  ];

  const conditions = [
    { label: 'Neuf', value: 'new' },
    { label: 'Comme neuf', value: 'like_new' },
    { label: 'Bon état', value: 'good' },
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
          const country =
            place.country === 'Democratic Republic of the Congo' ? 'RDC' : place.country;
          const locationString = `${city} ${country}`;
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

      // Extraire l'extension (forcée jpeg)
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

      // Champs texte
      formDataToSend.append('title', formData.title);
      formDataToSend.append('description', formData.description);
      formDataToSend.append('price', formData.price);
      formDataToSend.append('original_price', formData.originalPrice || '');
      formDataToSend.append('category', formData.category);
      formDataToSend.append('condition', formData.condition);
      formDataToSend.append('stock', formData.stock);
      formDataToSend.append('location', formData.location || '');
      formDataToSend.append('deliveryOptions', JSON.stringify(formData.deliveryOptions));

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

      setSuccessMessage('Produit publié avec succès!');
      setFormData({
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
      setImages([]);
      setActiveStep(1);

      setTimeout(() => {
        setSuccessMessage(null);
        router.push('/(tabs)/Auth/Produits/Fil');
      }, 2000);
    } catch (error: any) {
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
      <Text style={styles.stepTitle}>Photos du produit</Text>
      {formErrors.images && <Text style={styles.errorText}>{formErrors.images}</Text>}

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.imageScroll}>
        {images.map((uri, index) => (
          <View key={index} style={styles.imageContainer}>
            <Image source={{ uri }} style={styles.image} />
            <TouchableOpacity
              style={styles.deleteImageButton}
              onPress={() => removeImage(index)}>
              <Ionicons name="close" size={20} color="white" />
            </TouchableOpacity>
          </View>
        ))}

        {images.length < 5 && (
          <TouchableOpacity style={styles.addImageButton} onPress={pickImage}>
            <Feather name="plus" size={24} color="#4CAF50" />
            <Text style={styles.addImageText}>Ajouter une photo</Text>
          </TouchableOpacity>
        )}
      </ScrollView>
    </View>
  );

  const renderStep2 = () => (
    <View style={styles.stepContainer}>
      <Text style={styles.stepTitle}>Détails du produit</Text>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>Titre *</Text>
        <TextInput
          style={[styles.input, formErrors.title && styles.inputError]}
          value={formData.title}
          onChangeText={text => handleInputChange('title', text)}
          placeholder="Nom du produit"
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
          placeholder="Décrivez votre produit en détail..."
          textAlignVertical="top"
        />
        {formErrors.description && <Text style={styles.errorText}>{formErrors.description}</Text>}
      </View>

      <View style={styles.row}>
        <View style={[styles.inputGroup, { flex: 1 }]}>
          <Text style={styles.label}>Catégorie</Text>
          <View style={styles.pickerContainer}>
            <Picker
              selectedValue={formData.category}
              onValueChange={(itemValue) => handleInputChange('category', itemValue)}
              mode="dropdown"
            >
              {categories.map(item => (
                <Picker.Item key={item.value} label={item.label} value={item.value} />
              ))}
            </Picker>
          </View>
        </View>

        <View style={[styles.inputGroup, { flex: 1 }]}>
          <Text style={styles.label}>État</Text>
          <View style={styles.pickerContainer}>
            <Picker
              selectedValue={formData.condition}
              onValueChange={(itemValue) => handleInputChange('condition', itemValue)}
              mode="dropdown"
            >
              {conditions.map(item => (
                <Picker.Item key={item.value} label={item.label} value={item.value} />
              ))}
            </Picker>
          </View>
        </View>
      </View>
    </View>
  );

  const renderStep3 = () => (
    <View style={styles.stepContainer}>
      <Text style={styles.stepTitle}>Prix et livraison</Text>

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
          />
        </View>
        {formData.price && <Text style={styles.formattedPrice}>{formatPrice(formData.price)}</Text>}
        {formErrors.price && <Text style={styles.errorText}>{formErrors.price}</Text>}
      </View>

      <TouchableOpacity
        style={styles.promoSwitchContainer}
        onPress={() => setIsPromo(prev => !prev)}
      >
        <View style={[styles.promoSwitch, isPromo && styles.promoSwitchActive]}>
          <View style={[styles.promoSwitchDot, isPromo && styles.promoSwitchDotActive]} />
        </View>
        <Text style={styles.promoText}>Ce produit est en promotion</Text>
      </TouchableOpacity>

      {isPromo && (
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Prix original (USD) *</Text>
          <View style={styles.priceInputContainer}>
            <Text style={styles.currencySymbol}>$</Text>
            <TextInput
              style={[styles.input, styles.priceInput, formErrors.originalPrice && styles.inputError]}
              keyboardType="numeric"
              value={formData.originalPrice}
              onChangeText={(text) => handleInputChange('originalPrice', text)}
              placeholder="0.00"
            />
          </View>
          {formData.originalPrice && <Text style={styles.formattedPrice}>{formatPrice(formData.originalPrice)}</Text>}
          {formErrors.originalPrice && <Text style={styles.errorText}>{formErrors.originalPrice}</Text>}
        </View>
      )}

      <View style={styles.inputGroup}>
        <Text style={styles.label}>Quantité disponible *</Text>
        <TextInput
          style={[styles.input, formErrors.stock && styles.inputError]}
          keyboardType="numeric"
          value={formData.stock}
          onChangeText={(text) => handleInputChange('stock', text)}
          placeholder="1"
        />
        {formErrors.stock && <Text style={styles.errorText}>{formErrors.stock}</Text>}
      </View>

      <View style={styles.inputGroup}>
        <View style={styles.locationHeader}>
          <Text style={styles.label}>Localisation</Text>
          <TouchableOpacity onPress={toggleLocation}>
            <Text style={styles.locationToggle}>{useLocation ? 'Désactiver' : 'Activer'}</Text>
          </TouchableOpacity>
        </View>

        {useLocation ? (
          <>
            {formData.location ? (
              <Text style={styles.locationText}>Position: {formData.location}</Text>
            ) : (
              <ActivityIndicator size="small" color="#4CAF50" />
            )}
          </>
        ) : (
          <TextInput
            style={styles.input}
            value={formData.location}
            onChangeText={(text) => handleInputChange('location', text)}
            placeholder="Entrez votre localisation"
          />
        )}
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          ref={scrollViewRef}
          contentContainerStyle={styles.container}
          keyboardShouldPersistTaps="handled"
        >
          {activeStep === 1 && renderStep1()}
          {activeStep === 2 && renderStep2()}
          {activeStep === 3 && renderStep3()}

          {submitError && <Text style={styles.errorTextCenter}>{submitError}</Text>}
          {successMessage && <Text style={styles.successTextCenter}>{successMessage}</Text>}

          <View style={styles.navigationButtons}>
            {activeStep > 1 && (
              <TouchableOpacity
                style={styles.buttonSecondary}
                onPress={() => setActiveStep(prev => prev - 1)}
              >
                <Text style={styles.buttonTextSecondary}>Précédent</Text>
              </TouchableOpacity>
            )}

            {activeStep < 3 && (
              <TouchableOpacity
                style={styles.buttonPrimary}
                onPress={handleNextStep}
              >
                <Text style={styles.buttonTextPrimary}>Suivant</Text>
              </TouchableOpacity>
            )}

            {activeStep === 3 && (
              <TouchableOpacity
                style={[styles.buttonPrimary, isLoading && styles.buttonDisabled]}
                onPress={handleSubmit}
                disabled={isLoading}
              >
                {isLoading ? (
                  <ActivityIndicator color="white" />
                ) : (
                  <Text style={styles.buttonTextPrimary}>Publier</Text>
                )}
              </TouchableOpacity>
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#202A36',
  },
  flex: {
    flex: 1,
  },
  container: {
    padding: 16,
    paddingBottom: 40,
  },
  stepContainer: {
    marginBottom: 30,
  },
  stepTitle: {
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 15,
    color: 'white',
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
    height: 90,
    borderRadius: 8,
  },
  deleteImageButton: {
    position: 'absolute',
    top: 5,
    right: 5,
    backgroundColor: '#4CAF50',
    borderRadius: 12,
    padding: 2,
    zIndex: 10,
  },
  addImageButton: {
    width: 120,
    height: 90,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#4CAF50',
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
  },
  addImageText: {
    marginTop: 4,
    fontSize: 12,
    color: '#4CAF50',
  },
  inputGroup: {
    marginBottom: 15,
  },
  label: {
    color: '#eee',
    marginBottom: 6,
    fontWeight: '600',
  },
  input: {
    backgroundColor: '#2A3648',
    color: 'white',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    fontSize: 16,
  },
  textArea: {
    minHeight: 90,
  },
  inputError: {
    borderColor: '#FF5252',
    borderWidth: 1,
  },
  errorText: {
    marginTop: 4,
    color: '#FF5252',
    fontSize: 13,
  },
  errorTextCenter: {
    color: '#FF5252',
    fontSize: 15,
    textAlign: 'center',
    marginVertical: 10,
  },
  successTextCenter: {
    color: '#4CAF50',
    fontSize: 15,
    textAlign: 'center',
    marginVertical: 10,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  pickerContainer: {
    backgroundColor: '#2A3648',
    borderRadius: 8,
  },
  priceInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  currencySymbol: {
    color: '#4CAF50',
    fontWeight: 'bold',
    fontSize: 18,
    paddingRight: 4,
  },
  priceInput: {
    flex: 1,
    paddingLeft: 0,
  },
  formattedPrice: {
    marginTop: 4,
    fontStyle: 'italic',
    color: '#A5D6A7',
  },
  promoSwitchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 12,
  },
  promoSwitch: {
    width: 40,
    height: 22,
    borderRadius: 12,
    backgroundColor: '#555',
    justifyContent: 'center',
    padding: 2,
    marginRight: 10,
  },
  promoSwitchActive: {
    backgroundColor: '#4CAF50',
  },
  promoSwitchDot: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: 'white',
    alignSelf: 'flex-start',
  },
  promoSwitchDotActive: {
    alignSelf: 'flex-end',
  },
  promoText: {
    color: 'white',
    fontWeight: '600',
  },
  locationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  locationToggle: {
    color: '#4CAF50',
    fontWeight: '600',
  },
  locationText: {
    color: '#A5D6A7',
  },
  navigationButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  buttonPrimary: {
    flex: 1,
    backgroundColor: '#4CAF50',
    paddingVertical: 14,
    borderRadius: 8,
    marginLeft: 8,
    alignItems: 'center',
  },
  buttonTextPrimary: {
    color: 'white',
    fontWeight: '700',
    fontSize: 16,
  },
  buttonSecondary: {
    flex: 1,
    backgroundColor: '#374151',
    paddingVertical: 14,
    borderRadius: 8,
    marginRight: 8,
    alignItems: 'center',
  },
  buttonTextSecondary: {
    color: 'white',
    fontWeight: '700',
    fontSize: 16,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
});

export default ProductForm;



