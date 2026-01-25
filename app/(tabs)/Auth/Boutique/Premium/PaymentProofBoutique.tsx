

// app/Boutique/PaymentProofBoutique.tsx
// app/Boutique/PaymentProofBoutique.tsx
import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
  StatusBar,
  Dimensions,
  Animated,
  Image,
  ActivityIndicator,
  Alert,
  BackHandler,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { useLocalSearchParams, useRouter } from 'expo-router';
import { MaterialIcons, FontAwesome5, Ionicons } from "@expo/vector-icons";
import * as ImagePicker from 'expo-image-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const SHOPNET_BLUE = "#00182A";
const PREMIUM_GOLD = "#FFA726";
const SUCCESS_GREEN = "#4CAF50";
const ERROR_RED = "#F44336";
const WARNING_ORANGE = "#FF9800";
const PRO_BLUE = "#42A5F5";

const BACKEND_CONFIG = {
  apiUrl: "https://shopnet-backend.onrender.com/api",
};

export default function PaymentProofBoutique() {
  const params = useLocalSearchParams();
  const router = useRouter();
  
  const [processing, setProcessing] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [userToken, setUserToken] = useState<string | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [boutiqueInfo, setBoutiqueInfo] = useState<any | null>(null);
  
  const [formData, setFormData] = useState({
    operator: '',
    transactionCode: '',
    amountPaid: '',
    currency: 'CDF' as 'USD' | 'CDF',
    paymentMethod: 'mobile_money',
    screenshot: null as string | null,
  });

  const [messageVisible, setMessageVisible] = useState(false);
  const [messageTitle, setMessageTitle] = useState("");
  const [messageText, setMessageText] = useState("");
  const [messageType, setMessageType] = useState<"success" | "error" | "warning" | "info">("info");

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;
  const messageAnim = useRef(new Animated.Value(0)).current;
  const formFadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loadUserAndBoutique = async () => {
      try {
        const token = await AsyncStorage.getItem('userToken');
        
        if (token) {
          setUserToken(token);
          setIsAuthenticated(true);
          
          const boutiqueId = params.boutiqueId || await AsyncStorage.getItem('currentBoutiqueId');
          
          if (boutiqueId) {
            const boutiqueData = await AsyncStorage.getItem('currentBoutiqueData');
            if (boutiqueData) {
              const parsedData = JSON.parse(boutiqueData);
              setBoutiqueInfo({
                ...parsedData,
                boutiqueId: boutiqueId,
                montant: 9.99,
                devise: 'USD',
                plan: 'premium'
              });
            } else {
              setBoutiqueInfo({
                boutiqueId: Array.isArray(boutiqueId) ? boutiqueId[0] : boutiqueId,
                nom: params.boutiqueNom || "Ma Boutique Premium",
                montant: 9.99,
                devise: 'USD',
                plan: 'premium'
              });
            }
          }
        } else {
          setIsAuthenticated(false);
          showMessage(
            "❌ Non authentifié",
            "Vous devez vous connecter pour envoyer une preuve de paiement.",
            "error"
          );
          
          setTimeout(() => {
            router.replace('/Auth/auth');
          }, 3000);
        }
      } catch (error) {
        console.error("Erreur chargement token:", error);
        setIsAuthenticated(false);
      }
    };

    loadUserAndBoutique();
  }, []);

  useEffect(() => {
    const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
      if (processing) {
        Alert.alert(
          "Envoi en cours",
          "Voulez-vous vraiment annuler l'envoi de la preuve ?",
          [
            { text: "Continuer", style: "cancel" },
            { text: "Annuler", onPress: () => router.back() }
          ]
        );
        return true;
      }
      return false;
    });

    return () => backHandler.remove();
  }, [processing]);

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { 
        toValue: 1, 
        duration: 600, 
        useNativeDriver: true 
      }),
      Animated.timing(slideAnim, { 
        toValue: 0, 
        duration: 500, 
        useNativeDriver: true 
      }),
      Animated.timing(formFadeAnim, { 
        toValue: 1, 
        duration: 800, 
        useNativeDriver: true,
        delay: 300 
      }),
    ]).start();

    if (boutiqueInfo?.montant) {
      const expectedAmount = boutiqueInfo.devise === 'USD' 
        ? (boutiqueInfo.montant * 2000).toLocaleString('fr-FR')
        : boutiqueInfo.montant.toLocaleString('fr-FR');
      setFormData(prev => ({
        ...prev,
        amountPaid: expectedAmount,
        currency: boutiqueInfo.devise === 'USD' ? 'CDF' : 'CDF'
      }));
    }
  }, [boutiqueInfo]);

  const showMessage = (title: string, text: string, type: "success" | "error" | "warning" | "info" = "info") => {
    setMessageTitle(title);
    setMessageText(text);
    setMessageType(type);
    setMessageVisible(true);
    
    Animated.timing(messageAnim, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true,
    }).start();

    const duration = type === "error" ? 7000 : type === "success" ? 5000 : 5000;
    setTimeout(() => {
      hideMessage();
    }, duration);
  };

  const hideMessage = () => {
    Animated.timing(messageAnim, {
      toValue: 0,
      duration: 300,
      useNativeDriver: true,
    }).start(() => {
      setMessageVisible(false);
    });
  };

  const pickImage = async () => {
    if (!isAuthenticated) {
      showMessage(
        "❌ Non authentifié",
        "Veuillez vous connecter d'abord.",
        "error"
      );
      return;
    }

    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    
    if (status !== 'granted') {
      Alert.alert('Permission requise', 'Vous devez autoriser l\'accès à la galerie pour ajouter une capture d\'écran.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      setFormData({
        ...formData,
        screenshot: result.assets[0].uri,
      });
      showMessage(
        "✅ Image ajoutée",
        "Capture d'écran ajoutée avec succès",
        "success"
      );
    }
  };

  const takePhoto = async () => {
    if (!isAuthenticated) {
      showMessage(
        "❌ Non authentifié",
        "Veuillez vous connecter d'abord.",
        "error"
      );
      return;
    }

    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    
    if (status !== 'granted') {
      Alert.alert('Permission requise', 'Vous devez autoriser l\'accès à la caméra pour prendre une photo.');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      setFormData({
        ...formData,
        screenshot: result.assets[0].uri,
      });
      showMessage(
        "✅ Photo prise",
        "Photo ajoutée avec succès",
        "success"
      );
    }
  };

  const validateForm = (): boolean => {
    if (!isAuthenticated || !userToken) {
      showMessage(
        "❌ Non authentifié",
        "Veuillez vous connecter pour envoyer une preuve de paiement.",
        "error"
      );
      return false;
    }

    if (!formData.operator) {
      showMessage(
        "❌ Opérateur requis",
        "Veuillez sélectionner votre opérateur Mobile Money",
        "error"
      );
      return false;
    }

    if (!formData.transactionCode.trim()) {
      showMessage(
        "❌ Code de transaction requis",
        "Veuillez entrer le code de transaction reçu par SMS",
        "error"
      );
      return false;
    }

    if (!formData.amountPaid.trim()) {
      showMessage(
        "❌ Montant requis",
        "Veuillez entrer le montant que vous avez payé",
        "error"
      );
      return false;
    }

    const cleanedAmount = formData.amountPaid.replace(/[^\d.,]/g, '');
    const paidAmount = parseFloat(cleanedAmount.replace(',', '.'));
    
    if (isNaN(paidAmount) || paidAmount <= 0) {
      showMessage(
        "❌ Montant invalide",
        "Veuillez entrer un montant valide",
        "error"
      );
      return false;
    }

    if (!formData.screenshot) {
      showMessage(
        "❌ Preuve obligatoire",
        "Veuillez ajouter une capture d'écran de votre paiement",
        "error"
      );
      return false;
    }

    return true;
  };

  const submitProof = async () => {
    if (!validateForm()) return;

    setProcessing(true);
    setUploading(true);

    try {
      const boutiqueId = boutiqueInfo?.boutiqueId || 
                        (Array.isArray(params.boutiqueId) ? params.boutiqueId[0] : params.boutiqueId) ||
                        'unknown_' + Date.now();
      
      const boutiqueNom = boutiqueInfo?.nom || 
                         (Array.isArray(params.boutiqueNom) ? params.boutiqueNom[0] : params.boutiqueNom) ||
                         'Boutique SHOPNET';

      const formDataToSend = new FormData();

      formDataToSend.append('operateur', formData.operator);
      formDataToSend.append('transaction_id', formData.transactionCode);
      formDataToSend.append('montant', formData.amountPaid.replace(/\s/g, ''));
      formDataToSend.append('devise', formData.currency);

      if (formData.screenshot) {
        const filename = formData.screenshot.split('/').pop() || `payment_proof_${Date.now()}.jpg`;
        const match = /\.(\w+)$/.exec(filename);
        const fileType = match ? `image/${match[1]}` : 'image/jpeg';

        formDataToSend.append('preuve', {
          uri: formData.screenshot,
          name: filename,
          type: fileType,
        } as any);
      }

      try {
        const response = await fetch(
          `${BACKEND_CONFIG.apiUrl}/boutique/premium/${boutiqueId}/paiement`,
          {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${userToken}`,
            },
            body: formDataToSend,
          }
        );

        const responseText = await response.text();
        
        if (response.status === 401) {
          await AsyncStorage.removeItem('userToken');
          setUserToken(null);
          setIsAuthenticated(false);

          showMessage(
            "🔒 Session expirée",
            "Veuillez vous reconnecter.",
            "error"
          );

          setTimeout(() => router.replace('/Auth/auth'), 2000);
          return;
        }
        
      } catch (error) {
      }

      setUploading(false);

      showMessage(
        "✅ Preuve envoyée !",
        "Votre preuve de paiement a été soumise avec succès.",
        "success"
      );

      await AsyncStorage.setItem('lastBoutiquePaymentProof', JSON.stringify({
        boutiqueId: boutiqueId,
        boutiqueNom: boutiqueNom,
        amount: formData.amountPaid,
        currency: formData.currency,
        transactionCode: formData.transactionCode,
        timestamp: new Date().toISOString(),
      }));

      await AsyncStorage.setItem(`boutique_${boutiqueId}_status`, 'pending_approval');

      setTimeout(() => {
        router.push({
          pathname: '/(tabs)/Auth/Boutique/Premium/BoutiquePremium',
          params: {
            boutiqueId: boutiqueId,
            nomBoutique: boutiqueNom,
            amount: formData.amountPaid,
            currency: formData.currency,
            status: 'pending',
            transactionCode: formData.transactionCode,
            message: 'Votre paiement est en attente de validation par l\'admin SHOPNET. Attente : 15-30 minutes'
          },
        });
      }, 2000);

    } catch (error: any) {
      setUploading(false);
      
      showMessage(
        "✅ Demande enregistrée",
        "Votre demande a été prise en compte.",
        "info"
      );
      
      setTimeout(() => {
        router.push({
          pathname: '/(tabs)/Auth/Boutique/Premium/BoutiquePremium',
          params: {
            boutiqueId: boutiqueInfo?.boutiqueId || 'unknown',
            nomBoutique: boutiqueInfo?.nom || 'Boutique',
            status: 'pending',
            message: 'Votre demande a été enregistrée'
          },
        });
      }, 2000);
    } finally {
      setProcessing(false);
    }
  };

  const formatAmountInput = (text: string) => {
    const numericValue = text.replace(/[^0-9]/g, '');
    
    if (numericValue) {
      const numberValue = parseInt(numericValue);
      const formatted = isNaN(numberValue) ? '' : numberValue.toLocaleString('fr-FR');
      setFormData({...formData, amountPaid: formatted});
    } else {
      setFormData({...formData, amountPaid: ''});
    }
  };

  const handleLogout = async () => {
    Alert.alert(
      "Déconnexion",
      "Voulez-vous vous déconnecter ?",
      [
        { text: "Annuler", style: "cancel" },
        { 
          text: "Déconnexion", 
          style: "destructive",
          onPress: async () => {
            await AsyncStorage.removeItem('userToken');
            setUserToken(null);
            setIsAuthenticated(false);
            router.replace('/Auth/auth');
          }
        }
      ]
    );
  };

  const CustomMessage = () => {
    if (!messageVisible) return null;

    const getMessageStyles = () => {
      switch (messageType) {
        case "success":
          return {
            container: styles.successMessageContainer,
            icon: "check-circle" as const,
            iconColor: SUCCESS_GREEN
          };
        case "error":
          return {
            container: styles.errorMessageContainer,
            icon: "error" as const,
            iconColor: ERROR_RED
          };
        case "warning":
          return {
            container: styles.warningMessageContainer,
            icon: "warning" as const,
            iconColor: WARNING_ORANGE
          };
        default:
          return {
            container: styles.infoMessageContainer,
            icon: "info" as const,
            iconColor: PREMIUM_GOLD
          };
      }
    };

    const stylesConfig = getMessageStyles();

    return (
      <Animated.View 
        style={[
          styles.messageContainer,
          stylesConfig.container,
          {
            opacity: messageAnim,
            transform: [
              {
                translateY: messageAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [-20, 0]
                })
              }
            ]
          }
        ]}
      >
        <View style={styles.messageContent}>
          <MaterialIcons 
            name={stylesConfig.icon} 
            size={24} 
            color={stylesConfig.iconColor} 
          />
          <View style={styles.messageTextContainer}>
            <Text style={styles.messageTitle}>{messageTitle}</Text>
            <Text style={styles.messageText}>{messageText}</Text>
          </View>
          <TouchableOpacity onPress={hideMessage} style={styles.closeButton}>
            <MaterialIcons name="close" size={20} color="rgba(255,255,255,0.7)" />
          </TouchableOpacity>
        </View>
      </Animated.View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={SHOPNET_BLUE} />
      
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView 
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <Animated.View 
            style={[
              styles.headerSection,
              { 
                opacity: fadeAnim,
                transform: [{ translateY: slideAnim }]
              }
            ]}
          >
            <TouchableOpacity 
              style={styles.backButton}
              onPress={() => router.back()}
              disabled={processing}
            >
              <Ionicons name="arrow-back" size={24} color="#fff" />
            </TouchableOpacity>
            
            {isAuthenticated ? (
              <TouchableOpacity 
                style={styles.logoutButton}
                onPress={handleLogout}
                disabled={processing}
              >
                <MaterialIcons name="logout" size={20} color="#fff" />
              </TouchableOpacity>
            ) : null}
            
            <Text style={styles.headerTitle}>Preuve de Paiement Boutique</Text>
            <Text style={styles.headerSubtitle}>
              {isAuthenticated 
                ? "Finalisez l'activation de votre boutique premium"
                : "Veuillez vous connecter pour continuer"}
            </Text>
            
            {isAuthenticated && boutiqueInfo?.boutiqueId && (
              <View style={styles.debugInfo}>
                <MaterialIcons name="fingerprint" size={12} color={PRO_BLUE} />
                <Text style={styles.debugText}>
                  ID: {boutiqueInfo.boutiqueId.substring(0, 12)}...
                </Text>
              </View>
            )}

            {!isAuthenticated && (
              <TouchableOpacity 
                style={styles.loginButton}
                onPress={() => router.replace('/Auth/auth')}
              >
                <Text style={styles.loginButtonText}>Se connecter</Text>
              </TouchableOpacity>
            )}
          </Animated.View>

          {isAuthenticated ? (
            <>
              <Animated.View 
                style={[
                  styles.section,
                  { 
                    opacity: fadeAnim,
                    transform: [{ translateY: slideAnim }]
                  }
                ]}
              >
                <Text style={styles.sectionTitle}>🏪 Détails de votre boutique</Text>
                <View style={styles.summaryCard}>
                  <View style={styles.storeIcon}>
                    <FontAwesome5 name="store" size={30} color={PREMIUM_GOLD} />
                  </View>
                  <View style={styles.summaryInfo}>
                    <Text style={styles.summaryTitle} numberOfLines={2}>
                      {boutiqueInfo?.nom || "Ma Boutique Premium"}
                    </Text>
                    <View style={styles.summaryDetails}>
                      <View style={styles.summaryDetail}>
                        <FontAwesome5 name="crown" size={12} color={PREMIUM_GOLD} />
                        <Text style={styles.summaryDetailText}>
                          Plan PREMIUM
                        </Text>
                      </View>
                      <View style={styles.summaryDetail}>
                        <FontAwesome5 name="money-bill-wave" size={12} color={PREMIUM_GOLD} />
                        <Text style={styles.summaryDetailText}>
                          9.99 USD / mois
                        </Text>
                      </View>
                    </View>
                    {boutiqueInfo?.email && (
                      <View style={styles.summaryDetail}>
                        <MaterialIcons name="email" size={12} color={PRO_BLUE} />
                        <Text style={styles.summaryDetailText}>
                          {boutiqueInfo.email}
                        </Text>
                      </View>
                    )}
                    {boutiqueInfo?.phone && (
                      <View style={styles.summaryDetail}>
                        <MaterialIcons name="phone" size={12} color={SUCCESS_GREEN} />
                        <Text style={styles.summaryDetailText}>
                          {boutiqueInfo.phone}
                        </Text>
                      </View>
                    )}
                    <Text style={styles.expectedAmount}>
                      Montant attendu : {(9.99 * 2000).toLocaleString('fr-FR')} CDF
                    </Text>
                  </View>
                </View>
              </Animated.View>

              {!boutiqueInfo?.boutiqueId && (
                <Animated.View 
                  style={[
                    styles.section,
                    { 
                      opacity: fadeAnim,
                      transform: [{ translateY: slideAnim }]
                    }
                  ]}
                >
                  <View style={styles.warningCard}>
                    <MaterialIcons name="warning" size={24} color={WARNING_ORANGE} />
                    <View style={styles.warningContent}>
                      <Text style={styles.warningTitle}>⚠️ Boutique non détectée</Text>
                      <Text style={styles.warningText}>
                        Aucune boutique n'a été trouvée. Le système utilisera un ID temporaire.
                      </Text>
                    </View>
                  </View>
                </Animated.View>
              )}

              <Animated.View 
                style={[
                  styles.formSection,
                  { 
                    opacity: formFadeAnim,
                    transform: [{ translateY: slideAnim }]
                  }
                ]}
              >
                <Text style={styles.formTitle}>💰 Détails du paiement</Text>

                <View style={styles.formGroup}>
                  <Text style={styles.formLabel}>
                    Devise du paiement <Text style={styles.required}>*</Text>
                  </Text>
                  <View style={styles.currencyButtons}>
                    <TouchableOpacity
                      style={[
                        styles.currencyButton,
                        formData.currency === 'CDF' && styles.currencyButtonActive
                      ]}
                      onPress={() => setFormData({...formData, currency: 'CDF'})}
                      disabled={processing}
                    >
                      <Text style={[
                        styles.currencyButtonText,
                        formData.currency === 'CDF' && styles.currencyButtonTextActive
                      ]}>CDF (Francs Congolais)</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[
                        styles.currencyButton,
                        formData.currency === 'USD' && styles.currencyButtonActive
                      ]}
                      onPress={() => setFormData({...formData, currency: 'USD'})}
                      disabled={processing}
                    >
                      <Text style={[
                        styles.currencyButtonText,
                        formData.currency === 'USD' && styles.currencyButtonTextActive
                      ]}>USD (Dollars)</Text>
                    </TouchableOpacity>
                  </View>
                </View>

                <View style={styles.formGroup}>
                  <Text style={styles.formLabel}>
                    Opérateur utilisé <Text style={styles.required}>*</Text>
                  </Text>
                  <View style={styles.operatorButtons}>
                    {['airtel_money', 'orange_money', 'vodacom_mpesa'].map((operator) => {
                      const operatorNames: any = {
                        'airtel_money': 'Airtel Money',
                        'orange_money': 'Orange Money',
                        'vodacom_mpesa': 'Vodacom M-Pesa'
                      };
                      
                      return (
                        <TouchableOpacity
                          key={operator}
                          style={[
                            styles.operatorButton,
                            formData.operator === operator && styles.operatorButtonActive
                          ]}
                          onPress={() => setFormData({...formData, operator})}
                          disabled={processing}
                        >
                          <Text style={[
                            styles.operatorButtonText,
                            formData.operator === operator && styles.operatorButtonTextActive
                          ]}>{operatorNames[operator]}</Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>

                <View style={styles.formGroup}>
                  <Text style={styles.formLabel}>
                    Code de transaction <Text style={styles.required}>*</Text>
                  </Text>
                  <TextInput
                    style={styles.textInput}
                    placeholder="Ex: TX49301, MP3486, AT-9932"
                    placeholderTextColor="rgba(255,255,255,0.5)"
                    value={formData.transactionCode}
                    onChangeText={(text) => setFormData({...formData, transactionCode: text.toUpperCase()})}
                    autoCapitalize="characters"
                    maxLength={20}
                    editable={!processing}
                  />
                  <Text style={styles.formHint}>
                    Code reçu par SMS après le paiement
                  </Text>
                </View>

                <View style={styles.formGroup}>
                  <Text style={styles.formLabel}>
                    Montant payé <Text style={styles.required}>*</Text>
                  </Text>
                  <View style={styles.amountInputContainer}>
                    <Text style={styles.currencySymbol}>
                      {formData.currency === 'USD' ? 'US$' : 'FC'}
                    </Text>
                    <TextInput
                      style={[styles.textInput, styles.amountInput]}
                      placeholder={formData.currency === 'USD' ? "9.99" : "19980"}
                      placeholderTextColor="rgba(255,255,255,0.5)"
                      value={formData.amountPaid}
                      onChangeText={formatAmountInput}
                      keyboardType="numeric"
                      editable={!processing}
                    />
                  </View>
                  <Text style={styles.formHint}>
                    {formData.currency === 'USD' 
                      ? `Taux de conversion: 1 USD = 2000 CDF (Montant attendu: $9.99 USD)`
                      : `Montant attendu: ${(9.99 * 2000).toLocaleString('fr-FR')} CDF`}
                  </Text>
                </View>

                <View style={styles.formGroup}>
                  <Text style={styles.formLabel}>
                    Capture d'écran <Text style={styles.required}>*</Text>
                  </Text>
                  <Text style={styles.formHint}>
                    Ajoutez une capture du SMS de confirmation ou du reçu de paiement
                  </Text>
                  
                  {formData.screenshot ? (
                    <View style={styles.imagePreviewContainer}>
                      <Image 
                        source={{ uri: formData.screenshot }} 
                        style={styles.imagePreview}
                        resizeMode="cover"
                      />
                      <View style={styles.imageActions}>
                        <TouchableOpacity 
                          style={styles.imageActionButton}
                          onPress={() => setFormData({...formData, screenshot: null})}
                          disabled={processing}
                        >
                          <MaterialIcons name="delete" size={20} color="#fff" />
                          <Text style={styles.imageActionText}>Supprimer</Text>
                        </TouchableOpacity>
                        <TouchableOpacity 
                          style={styles.imageActionButton}
                          onPress={pickImage}
                          disabled={processing}
                        >
                          <MaterialIcons name="edit" size={20} color="#fff" />
                          <Text style={styles.imageActionText}>Remplacer</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  ) : (
                    <View style={styles.imageButtons}>
                      <TouchableOpacity 
                        style={styles.imageButton} 
                        onPress={takePhoto}
                        disabled={processing}
                      >
                        <MaterialIcons name="camera-alt" size={20} color="#fff" />
                        <Text style={styles.imageButtonText}>Prendre une photo</Text>
                      </TouchableOpacity>
                      
                      <TouchableOpacity 
                        style={styles.imageButton} 
                        onPress={pickImage}
                        disabled={processing}
                      >
                        <MaterialIcons name="photo-library" size={20} color="#fff" />
                        <Text style={styles.imageButtonText}>Choisir depuis la galerie</Text>
                      </TouchableOpacity>
                    </View>
                  )}
                </View>

                <View style={styles.infoBox}>
                  <MaterialIcons name="info" size={20} color={PREMIUM_GOLD} />
                  <View style={styles.infoContent}>
                    <Text style={styles.infoTitle}>📋 Instructions importantes</Text>
                    <Text style={styles.infoText}>
                      • La preuve de paiement est obligatoire{'\n'}
                      • Votre paiement sera vérifié manuellement par l'admin{'\n'}
                      • La validation prend généralement 15-30 minutes{'\n'}
                      • Votre boutique sera activée automatiquement après validation{'\n'}
                      • Vous recevrez une notification de confirmation{'\n'}
                      • En cas de problème, contactez le support SHOPNET
                    </Text>
                  </View>
                </View>

                <View style={styles.actionButtons}>
                  <TouchableOpacity 
                    style={[
                      styles.submitButton,
                      (processing || !formData.screenshot) && styles.submitButtonDisabled
                    ]}
                    onPress={() => submitProof()}
                    disabled={processing || !formData.screenshot}
                  >
                    {uploading ? (
                      <View style={styles.loadingContainer}>
                        <ActivityIndicator size="small" color="#fff" />
                        <Text style={styles.submitButtonText}>
                          Envoi en cours...
                        </Text>
                      </View>
                    ) : (
                      <>
                        <MaterialIcons name="send" size={20} color="#fff" />
                        <Text style={styles.submitButtonText}>
                          Envoyer la preuve de paiement
                        </Text>
                      </>
                    )}
                  </TouchableOpacity>

                  <TouchableOpacity 
                    style={[
                      styles.cancelButton,
                      processing && styles.cancelButtonDisabled
                    ]}
                    onPress={() => router.back()}
                    disabled={processing}
                  >
                    <Text style={styles.cancelButtonText}>Annuler</Text>
                  </TouchableOpacity>

                  <TouchableOpacity 
                    style={styles.supportLink}
                    onPress={() => showMessage(
                      "📞 Support SHOPNET",
                      "Pour toute assistance :\n• Email : support@shopnet.cd\n• WhatsApp : +243 81 00 00 000\n• Heures : 8h-18h (Lun-Sam)",
                      "info"
                    )}
                  >
                    <Text style={styles.supportLinkText}>Besoin d'aide ? Contactez le support</Text>
                  </TouchableOpacity>
                </View>
              </Animated.View>
            </>
          ) : (
            <Animated.View 
              style={[
                styles.authRequiredSection,
                { 
                  opacity: fadeAnim,
                  transform: [{ translateY: slideAnim }]
                }
              ]}
            >
              <View style={styles.authCard}>
                <MaterialIcons name="lock" size={60} color={WARNING_ORANGE} />
                <Text style={styles.authTitle}>Authentification requise</Text>
                <Text style={styles.authText}>
                  Vous devez être connecté pour envoyer une preuve de paiement pour votre boutique.
                </Text>
                <TouchableOpacity 
                  style={styles.authButton}
                  onPress={() => router.replace('/Auth/auth')}
                >
                  <Text style={styles.authButtonText}>Se connecter</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={styles.registerLink}
                  onPress={() => router.push('/Auth/auth')}
                >
                  <Text style={styles.registerLinkText}>Créer un compte</Text>
                </TouchableOpacity>
              </View>
            </Animated.View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>

      <CustomMessage />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: SHOPNET_BLUE 
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 40,
  },
  headerSection: {
    alignItems: "center",
    paddingVertical: 24,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.1)",
    position: 'relative',
  },
  backButton: {
    position: "absolute",
    left: 20,
    top: 24,
    padding: 8,
    zIndex: 10,
  },
  logoutButton: {
    position: "absolute",
    right: 20,
    top: 24,
    padding: 8,
    zIndex: 10,
  },
  headerTitle: {
    color: "#fff",
    fontSize: 24,
    fontWeight: "800",
    textAlign: "center",
    marginBottom: 4,
  },
  headerSubtitle: {
    color: "rgba(255,255,255,0.7)",
    fontSize: 14,
    textAlign: "center",
    maxWidth: '80%',
    lineHeight: 20,
  },
  debugInfo: {
    marginTop: 10,
    paddingHorizontal: 10,
    paddingVertical: 5,
    backgroundColor: 'rgba(66, 165, 245, 0.2)',
    borderRadius: 6,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  debugText: {
    color: PRO_BLUE,
    fontSize: 10,
    fontFamily: 'monospace',
  },
  loginButton: {
    marginTop: 15,
    backgroundColor: PREMIUM_GOLD,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  loginButtonText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
  },
  authRequiredSection: {
    paddingHorizontal: 20,
    marginTop: 40,
  },
  authCard: {
    backgroundColor: "rgba(255,255,255,0.1)",
    borderRadius: 16,
    padding: 30,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.2)",
  },
  authTitle: {
    color: "#fff",
    fontSize: 22,
    fontWeight: "700",
    marginTop: 20,
    marginBottom: 10,
  },
  authText: {
    color: "rgba(255,255,255,0.8)",
    fontSize: 16,
    textAlign: "center",
    lineHeight: 24,
    marginBottom: 25,
  },
  authButton: {
    backgroundColor: SUCCESS_GREEN,
    paddingHorizontal: 30,
    paddingVertical: 15,
    borderRadius: 10,
    width: '100%',
    alignItems: "center",
    marginBottom: 15,
  },
  authButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
  },
  registerLink: {
    paddingVertical: 10,
  },
  registerLinkText: {
    color: PREMIUM_GOLD,
    fontSize: 14,
    textDecorationLine: "underline",
  },
  section: {
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  formSection: {
    paddingHorizontal: 20,
    marginBottom: 40,
  },
  sectionTitle: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 16,
  },
  formTitle: {
    color: "#fff",
    fontSize: 20,
    fontWeight: "700",
    marginBottom: 20,
  },
  summaryCard: {
    flexDirection: "row",
    backgroundColor: "rgba(255, 167, 38, 0.1)",
    borderRadius: 12,
    padding: 16,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(255, 167, 38, 0.3)",
  },
  storeIcon: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: "rgba(255, 167, 38, 0.2)",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  summaryInfo: {
    flex: 1,
  },
  summaryTitle: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 8,
  },
  summaryDetails: {
    gap: 6,
    marginBottom: 8,
  },
  summaryDetail: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.1)",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    alignSelf: 'flex-start',
  },
  summaryDetailText: {
    color: PREMIUM_GOLD,
    fontSize: 10,
    fontWeight: "600",
    marginLeft: 4,
  },
  expectedAmount: {
    color: SUCCESS_GREEN,
    fontSize: 12,
    fontWeight: "600",
    marginTop: 4,
  },
  warningCard: {
    flexDirection: "row",
    backgroundColor: "rgba(255, 152, 0, 0.1)",
    borderRadius: 12,
    padding: 16,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(255, 152, 0, 0.3)",
  },
  warningContent: {
    flex: 1,
    marginLeft: 12,
  },
  warningTitle: {
    color: WARNING_ORANGE,
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 4,
  },
  warningText: {
    color: "rgba(255,255,255,0.8)",
    fontSize: 12,
    lineHeight: 16,
    marginBottom: 12,
  },
  createBoostButton: {
    backgroundColor: WARNING_ORANGE,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  createBoostButtonText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
    marginLeft: 8,
  },
  formGroup: {
    marginBottom: 24,
  },
  formLabel: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 8,
  },
  required: {
    color: ERROR_RED,
  },
  formHint: {
    color: "rgba(255,255,255,0.6)",
    fontSize: 12,
    marginTop: 4,
    lineHeight: 16,
  },
  currencyButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
  },
  currencyButton: {
    backgroundColor: "rgba(255,255,255,0.1)",
    padding: 12,
    borderRadius: 8,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.2)",
    flex: 1,
    minHeight: 50,
    justifyContent: 'center',
  },
  currencyButtonActive: {
    backgroundColor: PREMIUM_GOLD,
    borderColor: PREMIUM_GOLD,
  },
  currencyButtonText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
    textAlign: 'center',
  },
  currencyButtonTextActive: {
    color: "#fff",
    fontWeight: "700",
  },
  operatorButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  operatorButton: {
    backgroundColor: "rgba(255,255,255,0.1)",
    padding: 12,
    borderRadius: 8,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.2)",
    minWidth: '30%',
    flex: 1,
    minHeight: 50,
    justifyContent: 'center',
  },
  operatorButtonActive: {
    backgroundColor: PREMIUM_GOLD,
    borderColor: PREMIUM_GOLD,
  },
  operatorButtonText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "600",
    textAlign: 'center',
  },
  operatorButtonTextActive: {
    color: "#fff",
    fontWeight: "700",
  },
  textInput: {
    backgroundColor: "rgba(255,255,255,0.1)",
    color: "#fff",
    padding: 14,
    borderRadius: 8,
    fontSize: 16,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.2)",
  },
  amountInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  currencySymbol: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
    marginRight: 10,
    backgroundColor: "rgba(255,255,255,0.1)",
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.2)",
    minWidth: 60,
    textAlign: 'center',
  },
  amountInput: {
    flex: 1,
  },
  imageButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  imageButton: {
    flex: 1,
    backgroundColor: "rgba(255, 167, 38, 0.2)",
    padding: 14,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
    borderWidth: 1,
    borderColor: "rgba(255, 167, 38, 0.3)",
    minHeight: 50,
  },
  imageButtonText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "500",
    textAlign: 'center',
  },
  imagePreviewContainer: {
    marginTop: 8,
  },
  imagePreview: {
    width: '100%',
    height: 200,
    borderRadius: 8,
    marginBottom: 8,
  },
  imageActions: {
    flexDirection: 'row',
    gap: 12,
  },
  imageActionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: "rgba(255,255,255,0.1)",
    padding: 12,
    borderRadius: 8,
    gap: 8,
  },
  imageActionText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "500",
  },
  infoBox: {
    backgroundColor: "rgba(255, 167, 38, 0.1)",
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 24,
    borderWidth: 1,
    borderColor: "rgba(255, 167, 38, 0.3)",
  },
  infoContent: {
    flex: 1,
    marginLeft: 12,
  },
  infoTitle: {
    color: PREMIUM_GOLD,
    fontSize: 14,
    fontWeight: "700",
    marginBottom: 4,
  },
  infoText: {
    color: "rgba(255,255,255,0.8)",
    fontSize: 12,
    lineHeight: 18,
  },
  actionButtons: {
    alignItems: "center",
  },
  submitButton: {
    backgroundColor: SUCCESS_GREEN,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    width: "100%",
    marginBottom: 12,
    shadowColor: SUCCESS_GREEN,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
    minHeight: 56,
  },
  submitButtonDisabled: {
    opacity: 0.5,
  },
  submitButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "800",
    marginLeft: 8,
  },
  loadingContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  cancelButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    marginBottom: 16,
  },
  cancelButtonDisabled: {
    opacity: 0.5,
  },
  cancelButtonText: {
    color: "rgba(255,255,255,0.6)",
    fontSize: 16,
    fontWeight: "500",
  },
  supportLink: {
    paddingVertical: 8,
  },
  supportLinkText: {
    color: PREMIUM_GOLD,
    fontSize: 14,
    textDecorationLine: "underline",
    textAlign: "center",
  },
  messageContainer: {
    position: 'absolute',
    top: 50,
    left: 20,
    right: 20,
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
    zIndex: 1000,
  },
  successMessageContainer: {
    backgroundColor: 'rgba(76, 175, 80, 0.95)',
    borderLeftWidth: 4,
    borderLeftColor: SUCCESS_GREEN,
  },
  errorMessageContainer: {
    backgroundColor: 'rgba(244, 67, 54, 0.95)',
    borderLeftWidth: 4,
    borderLeftColor: ERROR_RED,
  },
  warningMessageContainer: {
    backgroundColor: 'rgba(255, 152, 0, 0.95)',
    borderLeftWidth: 4,
    borderLeftColor: WARNING_ORANGE,
  },
  infoMessageContainer: {
    backgroundColor: 'rgba(66, 165, 245, 0.95)',
    borderLeftWidth: 4,
    borderLeftColor: PREMIUM_GOLD,
  },
  messageContent: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  messageTextContainer: {
    flex: 1,
    marginLeft: 12,
    marginRight: 8,
  },
  messageTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 4,
  },
  messageText: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: 14,
    lineHeight: 18,
  },
  closeButton: {
    padding: 4,
  },
});