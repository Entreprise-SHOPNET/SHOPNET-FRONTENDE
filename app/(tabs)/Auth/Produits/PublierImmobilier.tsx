


import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Platform,
  Dimensions,
  Animated,
} from 'react-native';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { Picker } from '@react-native-picker/picker';

const { width } = Dimensions.get('window');

// === COULEURS REPRENANT EXACTEMENT LE STYLE PRODUIT ===
const PRIMARY_COLOR = "#00182A";
const SECONDARY_COLOR = "#42A5F5";
const TEXT_WHITE = "#FFFFFF";
const TEXT_SECONDARY = "#A0AEC0";
const ERROR_RED = "#FF6B6B";
const SUCCESS_GREEN = "#4CAF50";
const PREMIUM_GOLD = "#FFD700";
const WARNING_ORANGE = "#FFA726";

const API_BASE = 'https://shopnet-immo-backend.onrender.com/api/biens/create';

type FormData = {
  titre: string;
  type_bien: string;
  type_offre: string;
  prix: string;
  devise: string;
  ville: string;
  commune: string;
  quartier: string;
  reference: string;
  superficie: string;
  chambres: string;
  salles_bain: string;
  accessibilite: string;
  description: string;
  whatsapp: string;
  telephone: string;
  latitude: string;
  longitude: string;
};

export default function PublierImmobilier() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [images, setImages] = useState<string[]>([]);
  const [imageUris, setImageUris] = useState<string[]>([]);
  const [toastVisible, setToastVisible] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [toastType, setToastType] = useState<'success' | 'error'>('success');
  const fadeAnim = useState(new Animated.Value(0))[0];

  const [form, setForm] = useState<FormData>({
    titre: '',
    type_bien: '',
    type_offre: '',
    prix: '',
    devise: 'USD',
    ville: '',
    commune: '',
    quartier: '',
    reference: '',
    superficie: '',
    chambres: '0',
    salles_bain: '0',
    accessibilite: '',
    description: '',
    whatsapp: '',
    telephone: '',
    latitude: '',
    longitude: '',
  });
  const [errors, setErrors] = useState<Partial<FormData>>({});

  useEffect(() => {
    (async () => {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        showToast('Permission requise pour accéder à la galerie', 'error');
      }
    })();
  }, []);

  const showToast = (message: string, type: 'success' | 'error') => {
    setToastMessage(message);
    setToastType(type);
    setToastVisible(true);
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true,
    }).start();
    setTimeout(() => {
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }).start(() => setToastVisible(false));
    }, 3000);
  };

  const updateField = (field: keyof FormData, value: string) => {
    setForm(prev => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors(prev => ({ ...prev, [field]: undefined }));
  };

  const pickImages = async () => {
    if (imageUris.length >= 8) {
      showToast('Vous ne pouvez ajouter que 8 photos maximum', 'error');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: true,
      quality: 0.8,
    });
    if (!result.canceled && result.assets) {
      const newImages = result.assets.map(asset => asset.uri);
      const combined = [...imageUris, ...newImages].slice(0, 8);
      setImageUris(combined);
    }
  };

  const removeImage = (index: number) => {
    const newUris = [...imageUris];
    newUris.splice(index, 1);
    setImageUris(newUris);
  };

  const validateStep = (step: number): boolean => {
    const newErrors: Partial<FormData> = {};
    if (step === 0) {
      if (!form.titre.trim()) newErrors.titre = 'Titre requis';
      if (!form.type_bien) newErrors.type_bien = 'Type de bien requis';
      if (!form.type_offre) newErrors.type_offre = 'Offre requise';
      if (!form.prix.trim() || isNaN(Number(form.prix))) newErrors.prix = 'Prix valide requis';
      if (!form.devise) newErrors.devise = 'Devise requise';
      if (!form.whatsapp.trim()) newErrors.whatsapp = 'WhatsApp requis';
    } else if (step === 1) {
      if (!form.ville) newErrors.ville = 'Ville requise';
      if (!form.commune.trim()) newErrors.commune = 'Commune requise';
      if (!form.quartier.trim()) newErrors.quartier = 'Quartier requis';
      if (!form.reference.trim()) newErrors.reference = 'Référence requise';
      if (!form.description.trim()) newErrors.description = 'Description requise';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const nextStep = () => {
    if (validateStep(currentStep)) {
      setCurrentStep(prev => prev + 1);
    } else {
      showToast('Veuillez remplir tous les champs obligatoires', 'error');
    }
  };

  const prevStep = () => {
    setCurrentStep(prev => prev - 1);
  };

  const submitForm = async () => {
    if (!validateStep(1)) {
      showToast('Veuillez remplir tous les champs', 'error');
      return;
    }
    if (imageUris.length === 0) {
      showToast('Ajoutez au moins une photo du bien', 'error');
      return;
    }

    setLoading(true);
    try {
      const token = await AsyncStorage.getItem('userToken');
      if (!token) {
        showToast('Session expirée, veuillez vous reconnecter', 'error');
        router.push('/splash');
        return;
      }

      const formData = new FormData();
      for (const [key, value] of Object.entries(form)) {
        if (value !== undefined && value !== '') {
          formData.append(key, value);
        }
      }
      imageUris.forEach((uri, index) => {
        const filename = uri.split('/').pop() || `photo_${index}.jpg`;
        formData.append('images', { uri, name: filename, type: 'image/jpeg' } as any);
      });

      const response = await fetch(API_BASE, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: formData,
      });
      const result = await response.json();
      if (response.ok && result.success) {
        showToast('Bien publié avec succès !', 'success');
        setTimeout(() => router.back(), 2000);
      } else {
        showToast(result.message || 'Erreur lors de la publication', 'error');
      }
    } catch (error) {
      console.error(error);
      showToast('Erreur réseau, vérifiez votre connexion', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Indicateur d'étape (fixe)
  const renderStepIndicator = () => {
    const steps = ['Infos', 'Localisation', 'Photos'];
    return (
      <View style={styles.stepIndicatorContainer}>
        {steps.map((label, idx) => (
          <View key={idx} style={styles.stepItem}>
            <View style={[styles.stepCircle, currentStep >= idx ? styles.stepCircleActive : styles.stepCircleInactive]}>
              <Text style={styles.stepNumber}>{idx + 1}</Text>
            </View>
            <Text style={[styles.stepLabel, currentStep >= idx ? styles.stepLabelActive : styles.stepLabelInactive]}>
              {label}
            </Text>
            {idx < steps.length - 1 && (
              <View style={[styles.stepConnector, currentStep > idx ? styles.stepConnectorActive : styles.stepConnectorInactive]} />
            )}
          </View>
        ))}
      </View>
    );
  };

  // Contenu des étapes (inchangé)
  const renderStep0 = () => (
    <View style={styles.stepContainer}>
      <View style={styles.inputContainer}>
        <View style={styles.inputHeader}>
          <Ionicons name="pricetag" size={24} color={SECONDARY_COLOR} />
          <Text style={styles.inputLabel}>Titre du bien *</Text>
        </View>
        <TextInput
          style={[styles.input, errors.titre && styles.inputError]}
          placeholder="Ex: Villa de luxe avec piscine"
          placeholderTextColor={TEXT_SECONDARY}
          value={form.titre}
          onChangeText={val => updateField('titre', val)}
        />
        {errors.titre && <Text style={styles.errorText}>{errors.titre}</Text>}
      </View>

      <View style={styles.row}>
        <View style={[styles.inputContainer, { flex: 1, marginRight: 8 }]}>
          <Text style={styles.inputLabel}>Type de bien *</Text>
          <View style={styles.pickerWrapper}>
            <Picker
              selectedValue={form.type_bien}
              onValueChange={val => updateField('type_bien', val)}
              style={styles.picker}
              dropdownIconColor={SECONDARY_COLOR}
            >
              <Picker.Item label="-- Sélectionnez --" value="" />
              <Picker.Item label="Maison" value="Maison" />
              <Picker.Item label="Appartement" value="Appartement" />
              <Picker.Item label="Parcelle" value="Parcelle" />
              <Picker.Item label="Bureau" value="Bureau" />
              <Picker.Item label="Entrepôt" value="Entrepot" />
              <Picker.Item label="Ferme" value="Ferme" />
            </Picker>
          </View>
          {errors.type_bien && <Text style={styles.errorText}>{errors.type_bien}</Text>}
        </View>

        <View style={[styles.inputContainer, { flex: 1, marginLeft: 8 }]}>
          <Text style={styles.inputLabel}>Offre *</Text>
          <View style={styles.pickerWrapper}>
            <Picker
              selectedValue={form.type_offre}
              onValueChange={val => updateField('type_offre', val)}
              style={styles.picker}
            >
              <Picker.Item label="-- Sélectionnez --" value="" />
              <Picker.Item label="Vente" value="Vente" />
              <Picker.Item label="Location" value="Location" />
            </Picker>
          </View>
          {errors.type_offre && <Text style={styles.errorText}>{errors.type_offre}</Text>}
        </View>
      </View>

      <View style={styles.inputContainer}>
        <Text style={styles.inputLabel}>Prix *</Text>
        <View style={styles.priceWrapper}>
          <View style={styles.priceInputContainer}>
            <View style={styles.currencySymbol}>
              <Text style={styles.currencyText}>{form.devise === 'USD' ? '$' : 'FC'}</Text>
            </View>
            <TextInput
              style={styles.priceInput}
              placeholder={form.devise === 'USD' ? '0.00' : '0'}
              keyboardType="numeric"
              value={form.prix}
              onChangeText={val => updateField('prix', val)}
            />
          </View>
          <View style={styles.pickerWrapper}>
            <Picker
              selectedValue={form.devise}
              onValueChange={val => updateField('devise', val)}
              style={[styles.picker, { width: 100 }]}
            >
              <Picker.Item label="USD" value="USD" />
              <Picker.Item label="CDF" value="CDF" />
            </Picker>
          </View>
        </View>
        {errors.prix && <Text style={styles.errorText}>{errors.prix}</Text>}
      </View>

      <View style={styles.inputContainer}>
        <View style={styles.inputHeader}>
          <Ionicons name="logo-whatsapp" size={24} color={SUCCESS_GREEN} />
          <Text style={styles.inputLabel}>WhatsApp *</Text>
        </View>
        <TextInput
          style={styles.input}
          placeholder="+243XXXXXXXXX"
          keyboardType="phone-pad"
          value={form.whatsapp}
          onChangeText={val => updateField('whatsapp', val)}
        />
        <Text style={styles.helperText}>Numéro pour recevoir les demandes (obligatoire)</Text>
        {errors.whatsapp && <Text style={styles.errorText}>{errors.whatsapp}</Text>}
      </View>

      <View style={styles.inputContainer}>
        <View style={styles.inputHeader}>
          <Ionicons name="call-outline" size={24} color={SECONDARY_COLOR} />
          <Text style={styles.inputLabel}>Téléphone (optionnel)</Text>
        </View>
        <TextInput
          style={styles.input}
          placeholder="+243XXXXXXXXX"
          keyboardType="phone-pad"
          value={form.telephone}
          onChangeText={val => updateField('telephone', val)}
        />
      </View>
    </View>
  );

  const renderStep1 = () => (
    <View style={styles.stepContainer}>
      <View style={styles.row}>
        <View style={[styles.inputContainer, { flex: 1, marginRight: 8 }]}>
          <Text style={styles.inputLabel}>Ville *</Text>
          <View style={styles.pickerWrapper}>
            <Picker
              selectedValue={form.ville}
              onValueChange={val => updateField('ville', val)}
              style={styles.picker}
            >
              <Picker.Item label="-- Choisir --" value="" />
              <Picker.Item label="Lubumbashi" value="Lubumbashi" />
              <Picker.Item label="Likasi" value="Likasi" />
              <Picker.Item label="Kolwezi" value="Kolwezi" />
              <Picker.Item label="Kasumbalesa" value="Kasumbalesa" />
            </Picker>
          </View>
          {errors.ville && <Text style={styles.errorText}>{errors.ville}</Text>}
        </View>

        <View style={[styles.inputContainer, { flex: 1, marginLeft: 8 }]}>
          <Text style={styles.inputLabel}>Commune *</Text>
          <TextInput
            style={styles.input}
            placeholder="Ex: Golf"
            value={form.commune}
            onChangeText={val => updateField('commune', val)}
          />
          {errors.commune && <Text style={styles.errorText}>{errors.commune}</Text>}
        </View>
      </View>

      <View style={styles.row}>
        <View style={[styles.inputContainer, { flex: 1, marginRight: 8 }]}>
          <Text style={styles.inputLabel}>Quartier *</Text>
          <TextInput
            style={styles.input}
            placeholder="Ex: Bel-Air"
            value={form.quartier}
            onChangeText={val => updateField('quartier', val)}
          />
          {errors.quartier && <Text style={styles.errorText}>{errors.quartier}</Text>}
        </View>

        <View style={[styles.inputContainer, { flex: 1, marginLeft: 8 }]}>
          <Text style={styles.inputLabel}>Référence *</Text>
          <TextInput
            style={styles.input}
            placeholder="Point de repère"
            value={form.reference}
            onChangeText={val => updateField('reference', val)}
          />
          {errors.reference && <Text style={styles.errorText}>{errors.reference}</Text>}
        </View>
      </View>

      <View style={styles.row}>
        <View style={[styles.inputContainer, { flex: 1, marginRight: 8 }]}>
          <Text style={styles.inputLabel}>Superficie (m²)</Text>
          <TextInput
            style={styles.input}
            placeholder="Ex: 250"
            keyboardType="numeric"
            value={form.superficie}
            onChangeText={val => updateField('superficie', val)}
          />
        </View>

        <View style={[styles.inputContainer, { flex: 1, marginLeft: 8 }]}>
          <Text style={styles.inputLabel}>Chambres</Text>
          <TextInput
            style={styles.input}
            keyboardType="numeric"
            value={form.chambres}
            onChangeText={val => updateField('chambres', val)}
          />
        </View>
      </View>

      <View style={styles.row}>
        <View style={[styles.inputContainer, { flex: 1, marginRight: 8 }]}>
          <Text style={styles.inputLabel}>Salles de bain</Text>
          <TextInput
            style={styles.input}
            keyboardType="numeric"
            value={form.salles_bain}
            onChangeText={val => updateField('salles_bain', val)}
          />
        </View>

        <View style={[styles.inputContainer, { flex: 1, marginLeft: 8 }]}>
          <Text style={styles.inputLabel}>Accessibilité</Text>
          <TextInput
            style={styles.input}
            placeholder="Proche route, transports..."
            value={form.accessibilite}
            onChangeText={val => updateField('accessibilite', val)}
          />
        </View>
      </View>

      <View style={styles.inputContainer}>
        <Text style={styles.inputLabel}>Description détaillée *</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          multiline
          numberOfLines={4}
          placeholder="Décrivez le bien (caractéristiques, environnement...)"
          placeholderTextColor={TEXT_SECONDARY}
          value={form.description}
          onChangeText={val => updateField('description', val)}
        />
        {errors.description && <Text style={styles.errorText}>{errors.description}</Text>}
      </View>

      <View style={styles.row}>
        <View style={[styles.inputContainer, { flex: 1, marginRight: 8 }]}>
          <Text style={styles.inputLabel}>Latitude</Text>
          <TextInput
            style={styles.input}
            placeholder="-10.123456"
            value={form.latitude}
            onChangeText={val => updateField('latitude', val)}
          />
        </View>
        <View style={[styles.inputContainer, { flex: 1, marginLeft: 8 }]}>
          <Text style={styles.inputLabel}>Longitude</Text>
          <TextInput
            style={styles.input}
            placeholder="26.123456"
            value={form.longitude}
            onChangeText={val => updateField('longitude', val)}
          />
        </View>
      </View>
    </View>
  );

  const renderStep2 = () => (
    <View style={styles.stepContainer}>
      <View style={styles.inputContainer}>
        <Text style={styles.inputLabel}>Photos du bien (max 8) *</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.imageScroll}>
          {imageUris.map((uri, idx) => (
            <View key={idx} style={styles.imageContainer}>
              <Image source={{ uri }} style={styles.image} />
              <TouchableOpacity style={styles.deleteImageButton} onPress={() => removeImage(idx)}>
                <Ionicons name="close-circle" size={28} color={ERROR_RED} />
              </TouchableOpacity>
              <View style={styles.imageBadge}>
                <Text style={styles.imageBadgeText}>{idx + 1}</Text>
              </View>
            </View>
          ))}
          {imageUris.length < 8 && (
            <TouchableOpacity style={styles.addImageContainer} onPress={pickImages}>
              <View style={styles.addImageIconContainer}>
                <Ionicons name="camera" size={32} color={SECONDARY_COLOR} />
              </View>
              <Text style={styles.addImageText}>Ajouter photo</Text>
            </TouchableOpacity>
          )}
        </ScrollView>
        {imageUris.length === 0 && <Text style={styles.errorText}>Au moins une photo requise</Text>}
        <View style={styles.tipsContainer}>
          <Ionicons name="bulb-outline" size={20} color={PREMIUM_GOLD} />
          <Text style={styles.tipsText}>Les premières photos seront celles mises en avant.</Text>
        </View>
      </View>
    </View>
  );

  const renderStep = () => {
    switch (currentStep) {
      case 0: return renderStep0();
      case 1: return renderStep1();
      case 2: return renderStep2();
      default: return null;
    }
  };

  return (
    <KeyboardAvoidingView style={styles.safeArea} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={styles.flex}>
        {/* HEADER FIXE */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={TEXT_WHITE} />
          </TouchableOpacity>
          <View style={styles.headerCenter}>
            <Text style={styles.headerTitle}>SHOPNET</Text>
            <View style={styles.vipBadge}>
              <Ionicons name="diamond" size={12} color={PREMIUM_GOLD} />
              <Text style={styles.vipText}>SN Immobilier</Text>
            </View>
          </View>
          <View style={styles.headerRight}>
            <Text style={styles.stepCounter}>{currentStep + 1}/3</Text>
          </View>
        </View>

        {/* INDICATEUR D'ÉTAPE FIXE */}
        {renderStepIndicator()}

        {/* SCROLLVIEW POUR LE CONTENU */}
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {renderStep()}

          <View style={styles.navigationButtons}>
            {currentStep > 0 && (
              <TouchableOpacity style={styles.secondaryButton} onPress={prevStep}>
                <Ionicons name="arrow-back" size={20} color={SECONDARY_COLOR} />
                <Text style={styles.secondaryButtonText}>Précédent</Text>
              </TouchableOpacity>
            )}
            {currentStep < 2 ? (
              <TouchableOpacity style={[styles.primaryButton, { flex: 1 }]} onPress={nextStep}>
                <Text style={styles.primaryButtonText}>Suivant</Text>
                <Ionicons name="arrow-forward" size={20} color={TEXT_WHITE} />
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={[styles.primaryButton, { flex: 1 }, loading && styles.buttonDisabled]}
                onPress={submitForm}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color={TEXT_WHITE} />
                ) : (
                  <>
                    <Ionicons name="cloud-upload-outline" size={20} color={TEXT_WHITE} />
                    <Text style={styles.primaryButtonText}>Publier</Text>
                  </>
                )}
              </TouchableOpacity>
            )}
          </View>

          <View style={styles.footer}>
            <Text style={styles.footerText}>
              SHOPNET Immobilier — Construire l’avenir, une propriété à la fois.
            </Text>
          </View>
        </ScrollView>
      </View>

      {toastVisible && (
        <Animated.View style={[styles.toast, { opacity: fadeAnim }, toastType === 'error' && styles.toastError]}>
          <Ionicons name={toastType === 'success' ? 'checkmark-circle' : 'alert-circle'} size={24} color={TEXT_WHITE} />
          <Text style={styles.toastText}>{toastMessage}</Text>
        </Animated.View>
      )}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: PRIMARY_COLOR },
  flex: { flex: 1 },
  // Header fixe (identique au modèle ProductForm)
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: PRIMARY_COLOR,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(66, 165, 245, 0.1)',
    zIndex: 10,
  },
  backButton: { padding: 4 },
  headerCenter: { alignItems: 'center', flexDirection: 'row' },
  headerTitle: { fontSize: 28, fontWeight: '900', color: SECONDARY_COLOR, marginRight: 8, letterSpacing: 1 },
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
  vipText: { color: PREMIUM_GOLD, fontSize: 12, fontWeight: '800', marginLeft: 4 },
  headerRight: {},
  stepCounter: { color: TEXT_SECONDARY, fontSize: 14, fontWeight: '600' },
  // Indicateur d'étape fixe
  stepIndicatorContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 20,
    marginHorizontal: 16,
    marginVertical: 10,
    borderRadius: 16,
    backgroundColor: 'rgba(30, 42, 59, 0.5)',
    borderWidth: 1,
    borderColor: 'rgba(66, 165, 245, 0.1)',
    zIndex: 9,
  },
  stepItem: { flex: 1, alignItems: 'center', flexDirection: 'row' },
  stepCircle: { width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center', marginBottom: 4 },
  stepCircleActive: { backgroundColor: SECONDARY_COLOR },
  stepCircleInactive: { backgroundColor: 'rgba(160, 174, 192, 0.2)', borderWidth: 2, borderColor: 'rgba(160, 174, 192, 0.3)' },
  stepNumber: { color: TEXT_WHITE, fontSize: 16, fontWeight: '700' },
  stepLabel: { fontSize: 10, fontWeight: '600', marginTop: 4, textAlign: 'center' },
  stepLabelActive: { color: SECONDARY_COLOR },
  stepLabelInactive: { color: TEXT_SECONDARY },
  stepConnector: { flex: 1, height: 2, marginHorizontal: 8, backgroundColor: 'rgba(160, 174, 192, 0.2)' },
  stepConnectorActive: { backgroundColor: SECONDARY_COLOR },
  // ScrollView content
  scrollContent: { paddingHorizontal: 20, paddingBottom: 40 },
  stepContainer: { marginTop: 20 },
  inputContainer: {
    backgroundColor: 'rgba(30, 42, 59, 0.5)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(66, 165, 245, 0.1)',
  },
  inputHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  inputLabel: { fontSize: 16, fontWeight: '600', color: TEXT_WHITE, marginLeft: 8 },
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
  textArea: { minHeight: 100, textAlignVertical: 'top' },
  inputError: { borderColor: ERROR_RED },
  errorText: { color: ERROR_RED, fontSize: 12, marginTop: 4 },
  helperText: { color: TEXT_SECONDARY, fontSize: 12, marginTop: 4 },
  row: { flexDirection: 'row', justifyContent: 'space-between' },
  pickerWrapper: {
    backgroundColor: 'rgba(30, 42, 59, 0.5)',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(66, 165, 245, 0.1)',
    overflow: 'hidden',
  },
  picker: { height: 50, color: TEXT_WHITE },
  priceWrapper: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  priceInputContainer: { flexDirection: 'row', alignItems: 'center', flex: 1, marginRight: 12 },
  currencySymbol: {
    backgroundColor: 'rgba(76, 175, 80, 0.1)',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopLeftRadius: 8,
    borderBottomLeftRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(76, 175, 80, 0.3)',
  },
  currencyText: { color: SUCCESS_GREEN, fontSize: 18, fontWeight: '800' },
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
  imageScroll: { flexDirection: 'row', marginBottom: 20, paddingVertical: 8 },
  imageContainer: { position: 'relative', marginRight: 12, width: 100, height: 100, borderRadius: 12 },
  image: { width: '100%', height: '100%', borderRadius: 12, backgroundColor: '#2C3A4A' },
  deleteImageButton: { position: 'absolute', top: -8, right: -8, zIndex: 10 },
  imageBadge: { position: 'absolute', top: 8, left: 8, backgroundColor: SECONDARY_COLOR, borderRadius: 10, width: 24, height: 24, justifyContent: 'center', alignItems: 'center' },
  imageBadgeText: { color: TEXT_WHITE, fontSize: 12, fontWeight: '800' },
  addImageContainer: {
    width: 100,
    height: 100,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: SECONDARY_COLOR,
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(66, 165, 245, 0.05)',
  },
  addImageIconContainer: { marginBottom: 4 },
  addImageText: { fontSize: 12, fontWeight: '600', color: SECONDARY_COLOR, textAlign: 'center' },
  tipsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 215, 0, 0.1)',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 215, 0, 0.2)',
    marginTop: 8,
  },
  tipsText: { color: PREMIUM_GOLD, fontSize: 14, marginLeft: 12, flex: 1, fontWeight: '500' },
  navigationButtons: { flexDirection: 'row', marginTop: 32, marginBottom: 20, gap: 12 },
  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: SECONDARY_COLOR,
    paddingVertical: 16,
    borderRadius: 12,
    gap: 8,
  },
  primaryButtonText: { color: TEXT_WHITE, fontSize: 16, fontWeight: '700' },
  secondaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(30, 42, 59, 0.5)',
    paddingVertical: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(66, 165, 245, 0.3)',
    gap: 8,
  },
  secondaryButtonText: { color: SECONDARY_COLOR, fontSize: 16, fontWeight: '700' },
  buttonDisabled: { opacity: 0.7 },
  footer: { alignItems: 'center', paddingVertical: 16, borderTopWidth: 1, borderTopColor: 'rgba(66, 165, 245, 0.1)', marginTop: 16 },
  footerText: { color: PREMIUM_GOLD, fontSize: 12, fontWeight: '600', textAlign: 'center' },
  toast: {
    position: 'absolute',
    bottom: 40,
    left: 20,
    right: 20,
    backgroundColor: SUCCESS_GREEN,
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  toastError: { backgroundColor: ERROR_RED },
  toastText: { color: TEXT_WHITE, fontSize: 14, fontWeight: '600', marginLeft: 12, flex: 1 },
});

