

// app/(tabs)/Auth/Profiles/PaymentProof.tsx
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
import { Picker } from '@react-native-picker/picker';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const SHOPNET_BLUE = "#00182A";
const PRO_BLUE = "#42A5F5";
const SUCCESS_GREEN = "#4CAF50";
const ERROR_RED = "#F44336";
const WARNING_ORANGE = "#FF9800";
const BOOST_ORANGE = "#FA7921";

// Configuration Backend SHOPNET
const BACKEND_CONFIG = {
  apiUrl: "http://100.64.134.89:5000/api",
};

export default function PaymentProof() {
  const params = useLocalSearchParams();
  const router = useRouter();
  
  const [processing, setProcessing] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [userToken, setUserToken] = useState<string | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  
  // États du formulaire
  const [formData, setFormData] = useState({
    operator: '',
    transactionCode: '',
    amountPaid: '',
    currency: 'USD' as 'USD' | 'CDF',
    paymentMethod: 'mobile_money',
    screenshot: null as string | null,
  });

  // États pour les messages
  const [messageVisible, setMessageVisible] = useState(false);
  const [messageTitle, setMessageTitle] = useState("");
  const [messageText, setMessageText] = useState("");
  const [messageType, setMessageType] = useState<"success" | "error" | "warning" | "info">("info");

  const fadeAnim = React.useRef(new Animated.Value(0)).current;
  const slideAnim = React.useRef(new Animated.Value(20)).current;
  const messageAnim = React.useRef(new Animated.Value(0)).current;
  const formFadeAnim = React.useRef(new Animated.Value(0)).current;

  // Charger le token utilisateur depuis AsyncStorage
  useEffect(() => {
    const loadUserToken = async () => {
      try {
        const token = await AsyncStorage.getItem('userToken');
        console.log("🔑 Token chargé depuis AsyncStorage:", token ? "Oui" : "Non");
        
        if (token) {
          setUserToken(token);
          setIsAuthenticated(true);
        } else {
          setIsAuthenticated(false);
          showMessage(
            "❌ Non authentifié",
            "Vous devez vous connecter pour envoyer une preuve de paiement.",
            "error"
          );
          
          setTimeout(() => {
            router.replace('/Auth/Login');
          }, 3000);
        }
      } catch (error) {
        console.error("Erreur chargement token:", error);
        setIsAuthenticated(false);
      }
    };

    loadUserToken();
  }, []);

  // DEBUG: Afficher tous les paramètres reçus
  useEffect(() => {
    console.log("🔍 DEBUG - Tous les paramètres reçus:", params);
    console.log("🔍 DEBUG - BoostId reçu:", params.boostId);
    console.log("🔍 DEBUG - ProductId reçu:", params.productId);
  }, [params]);

  // Récupération des données de campagne
  const campaignData = React.useMemo(() => {
    try {
      const currency = String(params.currency || "USD") as "USD" | "CDF";
      
      // Formater le montant selon la devise
      const formatAmount = (amount: number, curr: "USD" | "CDF") => {
        if (curr === "CDF") {
          return `${amount.toLocaleString('fr-FR')} CDF`;
        } else {
          return `$${amount.toFixed(2)} USD`;
        }
      };

      const budget = parseFloat(String(params.budget || "10")) || 10;
      const views = parseInt(String(params.views || "1000")) || 1000;
      const costPerView = currency === "CDF" 
        ? (budget / views).toFixed(2)
        : (budget / views).toFixed(4);

      // Conversion USD → CDF
      const USD_TO_CDF = 2000;
      const amountInCDF = currency === "USD" ? budget * USD_TO_CDF : budget;

      return {
        product: {
          id: String(params.productId || ""),
          title: String(params.title || "Produit sans titre"),
          image: String(params.productImage || ""),
        },
        budget: budget,
        currency: currency,
        views: views,
        days: parseInt(String(params.days || "1")) || 1,
        location: String(params.location || "Kinshasa, RDC"),
        costPerView: costPerView,
        amountInCDF: amountInCDF,
        formatAmount: formatAmount,
        boostId: String(params.boostId || ""), // Important: récupérer le boostId
        userId: String(params.userId || "")
      };
    } catch (error) {
      console.error("Erreur parsing campaign data:", error);
      return {
        product: {
          id: "0",
          title: "Produit de démonstration",
          image: "https://via.placeholder.com/60x60.png?text=Produit",
        },
        budget: 10,
        currency: "USD" as "USD" | "CDF",
        views: 1000,
        days: 1,
        location: "Kinshasa, RDC",
        costPerView: "0.01",
        amountInCDF: 20000,
        formatAmount: (amount: number, curr: "USD" | "CDF") => 
          curr === "CDF" ? `${amount} CDF` : `$${amount} USD`,
        boostId: "",
        userId: ""
      };
    }
  }, [params]);

  // Gestion du bouton retour Android
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

  // Démarrer les animations
  React.useEffect(() => {
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
  }, []);

  // Fonction pour afficher les messages
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

  // Choisir une image depuis la galerie
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

    if (!result.canceled) {
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

  // Prendre une photo
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

    if (!result.canceled) {
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

  // Valider le formulaire
  const validateForm = (): boolean => {
    // Vérifier l'authentification
    if (!isAuthenticated || !userToken) {
      showMessage(
        "❌ Non authentifié",
        "Veuillez vous connecter pour envoyer une preuve de paiement.",
        "error"
      );
      return false;
    }

    // Vérifier l'opérateur
    if (!formData.operator) {
      showMessage(
        "❌ Opérateur requis",
        "Veuillez sélectionner votre opérateur Mobile Money",
        "error"
      );
      return false;
    }

    // Vérifier le code de transaction
    if (!formData.transactionCode.trim()) {
      showMessage(
        "❌ Code de transaction requis",
        "Veuillez entrer le code de transaction reçu par SMS",
        "error"
      );
      return false;
    }

    // Vérifier le montant
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

    // Vérifier la preuve de paiement (obligatoire)
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

  // ✅ FONCTION CORRIGÉE : Soumettre la preuve de paiement
  const submitProof = async (forceSubmit: boolean = false) => {
    if (!forceSubmit && !validateForm()) return;

    console.log("🚀 Début de submitProof");
    console.log("📦 BoostId reçu:", params.boostId);
    console.log("📦 CampaignData boostId:", campaignData.boostId);

    // Tenter de trouver le boostId par plusieurs méthodes
    let boostIdToUse = params.boostId || campaignData.boostId;

    // Si toujours pas de boostId, essayer de récupérer le dernier boost de l'utilisateur
    if (!boostIdToUse && isAuthenticated && userToken) {
      try {
        console.log("🔍 Tentative de récupération du dernier boost...");
        const response = await fetch(
          `${BACKEND_CONFIG.apiUrl}/manual-payment/user-last-boost`,
          {
            method: 'GET',
            headers: {
              Authorization: `Bearer ${userToken}`,
            },
          }
        );

        if (response.ok) {
          const result = await response.json();
          if (result.boostId) {
            boostIdToUse = result.boostId;
            console.log("✅ Dernier boost trouvé:", boostIdToUse);
          }
        }
      } catch (error) {
        console.error("❌ Erreur récupération dernier boost:", error);
      }
    }

    // Si toujours pas de boostId, montrer une erreur
    if (!boostIdToUse || boostIdToUse.trim() === '') {
      showMessage(
        "❌ Boost non trouvé",
        "Impossible d'envoyer la preuve sans boost. Veuillez retourner à l'étape précédente.",
        "error"
      );
      return;
    }

    console.log("✅ BoostId à utiliser:", boostIdToUse);

    setProcessing(true);
    setUploading(true);

    try {
      const formDataToSend = new FormData();

      // ✅ ID du boost - CORRECTEMENT formaté
      formDataToSend.append('boostId', String(boostIdToUse));

      // ✅ Champs EXACTEMENT attendus par le backend
      formDataToSend.append('amount', formData.amountPaid.replace(/\s/g, ''));
      formDataToSend.append('currency', formData.currency);
      formDataToSend.append('transaction_id', formData.transactionCode);
      formDataToSend.append('operator', formData.operator);
      formDataToSend.append('product_id', campaignData.product.id);

      // ✅ Capture d'écran
      if (formData.screenshot) {
        const filename = formData.screenshot.split('/').pop() || `payment_proof_${Date.now()}.jpg`;
        const match = filename.match(/\.(\w+)$/);
        const fileType = match ? `image/${match[1]}` : 'image/jpeg';

        formDataToSend.append('payment_url', {
          uri: formData.screenshot,
          name: filename,
          type: fileType,
        } as any);
      }

      console.log("📤 Envoi des données au backend...");
      console.log("📤 boostId:", boostIdToUse);
      console.log("📤 amount:", formData.amountPaid);
      console.log("📤 currency:", formData.currency);

      // ✅ NOUVELLE ROUTE BACKEND
      const response = await fetch(
        `${BACKEND_CONFIG.apiUrl}/manual-payment/submit-proof`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${userToken}`,
          },
          body: formDataToSend,
        }
      );

      const responseText = await response.text();
      console.log("📨 Réponse backend brute:", responseText);

      let result: any;
      try {
        result = JSON.parse(responseText);
        console.log("📨 Réponse backend parsée:", result);
      } catch (parseError) {
        console.error("❌ Erreur parsing réponse:", parseError);
        throw new Error("Réponse invalide du serveur: " + responseText);
      }

      if (response.ok && result.success) {
        setUploading(false);

        showMessage(
          "✅ Preuve envoyée !",
          result.message || "Votre preuve a été soumise avec succès.",
          "success"
        );

        // Stocker les informations dans AsyncStorage
        await AsyncStorage.setItem('lastPaymentProof', JSON.stringify({
          boostId: boostIdToUse,
          amount: formData.amountPaid,
          currency: formData.currency,
          transactionCode: formData.transactionCode,
          timestamp: new Date().toISOString(),
        }));

        setTimeout(() => {
          router.push({
            pathname: '/Auth/Profiles/PaymentStatus',
            params: {
              boostId: boostIdToUse,
              productId: result.data?.productId || campaignData.product.id,
              productTitle: result.data?.productTitle || campaignData.product.title,
              amount: formData.amountPaid,
              currency: formData.currency,
              status: result.data?.status || 'pending',
              preuveUrl: result.data?.payment_url || '',
              transactionCode: formData.transactionCode,
            },
          });
        }, 3000);

      } else if (response.status === 401) {
        await AsyncStorage.removeItem('userToken');
        setUserToken(null);
        setIsAuthenticated(false);

        showMessage(
          "🔒 Session expirée",
          "Veuillez vous reconnecter.",
          "error"
        );

        setTimeout(() => router.replace('/Auth/Login'), 2000);
      } else {
        throw new Error(result?.message || "Erreur lors de l'envoi de la preuve");
      }

    } catch (error: any) {
      console.error("❌ Erreur complète:", error);
      setUploading(false);

      showMessage(
        "❌ Erreur d'envoi",
        error.message || "Impossible d'envoyer la preuve. Veuillez réessayer.",
        "error"
      );
    } finally {
      setProcessing(false);
    }
  };

  // Formater le montant pendant la saisie
  const formatAmountInput = (text: string) => {
    // Supprimer tous les caractères non numériques
    const numericValue = text.replace(/[^0-9]/g, '');
    
    // Formater avec des séparateurs de milliers
    if (numericValue) {
      const numberValue = parseInt(numericValue);
      const formatted = isNaN(numberValue) ? '' : numberValue.toLocaleString('fr-FR');
      setFormData({...formData, amountPaid: formatted});
    } else {
      setFormData({...formData, amountPaid: ''});
    }
  };

  // Déconnexion
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
            router.replace('/Auth/Login');
          }
        }
      ]
    );
  };

  // Composant Message
  const CustomMessage = () => {
    if (!messageVisible) return null;

    const getMessageStyles = () => {
      switch (messageType) {
        case "success":
          return {
            container: styles.successMessageContainer,
            icon: "check-circle",
            iconColor: SUCCESS_GREEN
          };
        case "error":
          return {
            container: styles.errorMessageContainer,
            icon: "error",
            iconColor: ERROR_RED
          };
        case "warning":
          return {
            container: styles.warningMessageContainer,
            icon: "warning",
            iconColor: WARNING_ORANGE
          };
        default:
          return {
            container: styles.infoMessageContainer,
            icon: "info",
            iconColor: PRO_BLUE
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
            name={stylesConfig.icon as any} 
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

  // Fonction pour créer un nouveau boost si nécessaire
  const createNewBoost = async () => {
    if (!isAuthenticated || !userToken) {
      showMessage("❌ Non authentifié", "Veuillez vous connecter", "error");
      return;
    }

    setProcessing(true);
    try {
      const response = await fetch(`${BACKEND_CONFIG.apiUrl}/manual-payment/create-boost`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${userToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          productId: campaignData.product.id,
          amount: campaignData.budget,
          duration_hours: campaignData.days * 24,
        }),
      });

      const result = await response.json();
      
      if (result.success) {
        showMessage(
          "✅ Boost créé !",
          "Un nouveau boost a été créé. Vous pouvez maintenant envoyer la preuve.",
          "success"
        );

        // Mettre à jour les paramètres avec le nouveau boostId
        const newParams = {
          ...params,
          boostId: result.data.boostId,
        };

        // Recharger la page avec le nouveau boostId
        router.setParams(newParams);
      } else {
        showMessage("❌ Erreur", result.message || "Impossible de créer le boost", "error");
      }
    } catch (error) {
      console.error("❌ Erreur création boost:", error);
      showMessage("❌ Erreur", "Impossible de créer le boost", "error");
    } finally {
      setProcessing(false);
    }
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
          {/* Header Section */}
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
            
            <Text style={styles.headerTitle}>Preuve de Paiement</Text>
            <Text style={styles.headerSubtitle}>
              {isAuthenticated 
                ? "Remplissez ce formulaire après avoir effectué le paiement"
                : "Veuillez vous connecter pour continuer"}
            </Text>
            
            {/* Afficher le boostId pour debug */}
            {isAuthenticated && campaignData.boostId && (
              <View style={styles.debugInfo}>
                <Text style={styles.debugText}>
                  Boost ID: {campaignData.boostId.substring(0, 20)}...
                </Text>
              </View>
            )}

            {!isAuthenticated && (
              <TouchableOpacity 
                style={styles.loginButton}
                onPress={() => router.replace('/Auth/Login')}
              >
                <Text style={styles.loginButtonText}>Se connecter</Text>
              </TouchableOpacity>
            )}
          </Animated.View>

          {isAuthenticated ? (
            <>
              {/* Section Résumé Commande */}
              <Animated.View 
                style={[
                  styles.section,
                  { 
                    opacity: fadeAnim,
                    transform: [{ translateY: slideAnim }]
                  }
                ]}
              >
                <Text style={styles.sectionTitle}>📋 Résumé de votre commande</Text>
                <View style={styles.summaryCard}>
                  <Image 
                    source={{ uri: campaignData.product.image }} 
                    style={styles.summaryImage}
                    resizeMode="cover"
                  />
                  <View style={styles.summaryInfo}>
                    <Text style={styles.summaryTitle} numberOfLines={2}>
                      {campaignData.product.title}
                    </Text>
                    <View style={styles.summaryDetails}>
                      <View style={styles.summaryDetail}>
                        <FontAwesome5 name="money-bill-wave" size={12} color={BOOST_ORANGE} />
                        <Text style={styles.summaryDetailText}>
                          {campaignData.formatAmount(campaignData.budget, campaignData.currency)}
                        </Text>
                      </View>
                      <View style={styles.summaryDetail}>
                        <FontAwesome5 name="eye" size={12} color={BOOST_ORANGE} />
                        <Text style={styles.summaryDetailText}>
                          {campaignData.views.toLocaleString()} vues
                        </Text>
                      </View>
                      <View style={styles.summaryDetail}>
                        <FontAwesome5 name="calendar" size={12} color={BOOST_ORANGE} />
                        <Text style={styles.summaryDetailText}>
                          {campaignData.days} jour(s)
                        </Text>
                      </View>
                    </View>
                    <Text style={styles.expectedAmount}>
                      Montant attendu : {campaignData.amountInCDF.toLocaleString('fr-FR')} CDF
                    </Text>
                  </View>
                </View>
              </Animated.View>

              {/* Bouton de création de boost si nécessaire */}
              {(!campaignData.boostId || campaignData.boostId.trim() === '') && (
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
                      <Text style={styles.warningTitle}>⚠️ Boost non détecté</Text>
                      <Text style={styles.warningText}>
                        Aucun boost n'a été trouvé pour ce produit. Cliquez ci-dessous pour en créer un nouveau.
                      </Text>
                      <TouchableOpacity 
                        style={styles.createBoostButton}
                        onPress={createNewBoost}
                        disabled={processing}
                      >
                        <MaterialIcons name="add-circle" size={20} color="#fff" />
                        <Text style={styles.createBoostButtonText}>Créer un nouveau boost</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                </Animated.View>
              )}

              {/* Formulaire de Preuve */}
              <Animated.View 
                style={[
                  styles.formSection,
                  { 
                    opacity: formFadeAnim,
                    transform: [{ translateY: slideAnim }]
                  }
                ]}
              >
                <Text style={styles.formTitle}>📝 Détails du paiement</Text>

                {/* Devise */}
                <View style={styles.formGroup}>
                  <Text style={styles.formLabel}>
                    Devise du paiement <Text style={styles.required}>*</Text>
                  </Text>
                  <View style={styles.currencyButtons}>
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
                      ]}>USD</Text>
                    </TouchableOpacity>
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
                      ]}>CDF</Text>
                    </TouchableOpacity>
                  </View>
                </View>

                {/* Sélecteur d'opérateur */}
                <View style={styles.formGroup}>
                  <Text style={styles.formLabel}>
                    Opérateur utilisé <Text style={styles.required}>*</Text>
                  </Text>
                  <View style={styles.pickerContainer}>
                    <Picker
                      selectedValue={formData.operator}
                      onValueChange={(itemValue) => 
                        setFormData({...formData, operator: itemValue})
                      }
                      style={styles.picker}
                      dropdownIconColor="#fff"
                      enabled={!processing}
                    >
                      <Picker.Item 
                        label="-- Sélectionnez votre opérateur --" 
                        value="" 
                        color="rgba(255,255,255,0.5)"
                      />
                      <Picker.Item 
                        label="Airtel Money" 
                        value="airtel_money" 
                        color="#fff"
                      />
                      <Picker.Item 
                        label="Orange Money" 
                        value="orange_money" 
                        color="#fff"
                      />
                      <Picker.Item 
                        label="Vodacom M-Pesa" 
                        value="vodacom_mpesa" 
                        color="#fff"
                      />
                      <Picker.Item 
                        label="Mobile Money par Banque" 
                        value="bank_mobile" 
                        color="#fff"
                      />
                      <Picker.Item 
                        label="Espèce" 
                        value="cash" 
                        color="#fff"
                      />
                    </Picker>
                  </View>
                </View>

                {/* Code de transaction */}
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

                {/* Montant payé */}
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
                      placeholder={`Ex: ${campaignData.budget.toLocaleString('fr-FR')}`}
                      placeholderTextColor="rgba(255,255,255,0.5)"
                      value={formData.amountPaid}
                      onChangeText={formatAmountInput}
                      keyboardType="numeric"
                      editable={!processing}
                    />
                  </View>
                  <Text style={styles.formHint}>
                    Entrez le montant exact que vous avez envoyé
                    {formData.currency === 'USD' && ` (Taux de conversion: 1 USD = 2000 CDF)`}
                  </Text>
                </View>

                {/* Capture d'écran */}
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

                {/* Informations importantes */}
                <View style={styles.infoBox}>
                  <MaterialIcons name="info" size={20} color={PRO_BLUE} />
                  <View style={styles.infoContent}>
                    <Text style={styles.infoTitle}>⚠️ Informations importantes</Text>
                    <Text style={styles.infoText}>
                      • La preuve de paiement est obligatoire{'\n'}
                      • Votre paiement sera vérifié manuellement{'\n'}
                      • La validation prend généralement 15-30 minutes{'\n'}
                      • Statuts possibles: En attente ✓ Validé ✗ Rejeté{'\n'}
                      • Vous recevrez une notification de confirmation
                    </Text>
                  </View>
                </View>

                {/* Boutons d'action */}
                <View style={styles.actionButtons}>
                  <TouchableOpacity 
                    style={[
                      styles.submitButton,
                      (processing || !formData.screenshot || !campaignData.boostId) && styles.submitButtonDisabled
                    ]}
                    onPress={() => submitProof()}
                    disabled={processing || !formData.screenshot || !campaignData.boostId}
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
                          Envoyer la preuve
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
                </View>
              </Animated.View>
            </>
          ) : (
            /* Section d'authentification requise */
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
                  Vous devez être connecté pour envoyer une preuve de paiement.
                </Text>
                <TouchableOpacity 
                  style={styles.authButton}
                  onPress={() => router.replace('/Auth/Login')}
                >
                  <Text style={styles.authButtonText}>Se connecter</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={styles.registerLink}
                  onPress={() => router.push('/Auth/Register')}
                >
                  <Text style={styles.registerLinkText}>Créer un compte</Text>
                </TouchableOpacity>
              </View>
            </Animated.View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Message flottant */}
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
  },
  debugText: {
    color: PRO_BLUE,
    fontSize: 10,
    fontFamily: 'monospace',
  },
  loginButton: {
    marginTop: 15,
    backgroundColor: PRO_BLUE,
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
    color: PRO_BLUE,
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
    backgroundColor: "rgba(66, 165, 245, 0.1)",
    borderRadius: 12,
    padding: 16,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(66, 165, 245, 0.3)",
  },
  summaryImage: {
    width: 50,
    height: 50,
    borderRadius: 8,
    marginRight: 12,
  },
  summaryInfo: {
    flex: 1,
  },
  summaryTitle: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 8,
  },
  summaryDetails: {
    flexDirection: "row",
    gap: 8,
    flexWrap: 'wrap',
    marginBottom: 8,
  },
  summaryDetail: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.1)",
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 4,
  },
  summaryDetailText: {
    color: BOOST_ORANGE,
    fontSize: 10,
    fontWeight: "600",
    marginLeft: 4,
  },
  expectedAmount: {
    color: SUCCESS_GREEN,
    fontSize: 12,
    fontWeight: "600",
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
  },
  currencyButtons: {
    flexDirection: 'row',
    gap: 10,
  },
  currencyButton: {
    flex: 1,
    backgroundColor: "rgba(255,255,255,0.1)",
    padding: 12,
    borderRadius: 8,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.2)",
  },
  currencyButtonActive: {
    backgroundColor: PRO_BLUE,
    borderColor: PRO_BLUE,
  },
  currencyButtonText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
  },
  currencyButtonTextActive: {
    color: "#fff",
    fontWeight: "700",
  },
  pickerContainer: {
    backgroundColor: "rgba(255,255,255,0.1)",
    borderRadius: 8,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.2)",
  },
  picker: {
    color: "#fff",
    height: 50,
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
    backgroundColor: "rgba(66, 165, 245, 0.2)",
    padding: 14,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
    borderWidth: 1,
    borderColor: "rgba(66, 165, 245, 0.3)",
  },
  imageButtonText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "500",
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
    backgroundColor: "rgba(66, 165, 245, 0.1)",
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 24,
    borderWidth: 1,
    borderColor: "rgba(66, 165, 245, 0.3)",
  },
  infoContent: {
    flex: 1,
    marginLeft: 12,
  },
  infoTitle: {
    color: PRO_BLUE,
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
    borderLeftColor: PRO_BLUE,
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