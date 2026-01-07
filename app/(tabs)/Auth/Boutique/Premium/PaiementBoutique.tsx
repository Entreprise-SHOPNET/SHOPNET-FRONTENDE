

// app/Boutique/PaiementBoutique.tsx
import React, { useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  SafeAreaView,
  ScrollView,
  Dimensions,
  StatusBar,
  ActivityIndicator,
  Alert,
  Clipboard,
  BackHandler,
  Image,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter, useLocalSearchParams } from "expo-router";
import {
  MaterialCommunityIcons,
  MaterialIcons,
  FontAwesome5,
  Ionicons,
} from "@expo/vector-icons";

const SCREEN_WIDTH = Dimensions.get("window").width;
const SHOPNET_BLUE = "#00182A";
const PREMIUM_GOLD = "#FFA726";
const SUCCESS_GREEN = "#4CAF50";
const ERROR_RED = "#F44336";
const WARNING_ORANGE = "#FF9800";

// Numéros SHOPNET PAYE
const SHOPNET_PAYMENT_NUMBERS = {
  AIRTEL: '+243 97 87 27 791',
  ORANGE: '+243 89 60 37 137',
  VODACOM: '+243 83 86 94 364',
};

export default function PaiementBoutique() {
  const router = useRouter();
  const params = useLocalSearchParams();
  
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;
  const [loading, setLoading] = useState(true);
  const [processingPayment, setProcessingPayment] = useState(false);
  const [boutique, setBoutique] = useState<any | null>(null);
  const [paymentStatus, setPaymentStatus] = useState<'idle' | 'pending' | 'validated' | 'rejected'>('idle');
  
  // États pour les messages
  const [messageVisible, setMessageVisible] = useState(false);
  const [messageTitle, setMessageTitle] = useState("");
  const [messageText, setMessageText] = useState("");
  const [messageType, setMessageType] = useState<"success" | "error" | "warning" | "info">("info");
  const messageAnim = useRef(new Animated.Value(0)).current;

  // Récupération des données de la boutique depuis les paramètres ou l'API
  useEffect(() => {
    const fetchBoutiqueData = async () => {
      try {
        const token = await AsyncStorage.getItem("userToken");
        if (!token) {
          router.replace("/splash");
          return;
        }

        // Si des paramètres sont passés, les utiliser
        if (params.boutiqueId) {
          const res = await fetch(
            `https://shopnet-backend.onrender.com/api/boutiques/${params.boutiqueId}`,
            {
              headers: { Authorization: `Bearer ${token}` },
            },
          );
          const data = await res.json();
          setBoutique(data.boutique || data);
        } else {
          // Sinon, vérifier si l'utilisateur a déjà une boutique en attente
          const res = await fetch(
            "https://shopnet-backend.onrender.com/api/boutiques/check",
            {
              headers: { Authorization: `Bearer ${token}` },
            },
          );
          const data = await res.json();
          setBoutique(data.boutique || null);
        }

        // Vérifier le statut de paiement si la boutique existe
        if (boutique?._id) {
          checkPaymentStatus();
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
        ]).start();
      } catch (err) {
        console.warn("Erreur boutique:", err);
        Alert.alert(
          "Erreur",
          "Impossible de charger les informations de la boutique",
        );
      } finally {
        setLoading(false);
      }
    };

    fetchBoutiqueData();
  }, [params.boutiqueId]);

  // Vérifier le statut de paiement
  const checkPaymentStatus = async () => {
    try {
      const token = await AsyncStorage.getItem("userToken");
      if (!token || !boutique?._id) return;

      const res = await fetch(
        `https://shopnet-backend.onrender.com/api/boutiques/${boutique._id}/payment-status`,
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );
      
      const data = await res.json();
      if (data.status === 'active') {
        setPaymentStatus('validated');
        // Rediriger vers la boutique après 2 secondes si activée
        setTimeout(() => {
          router.replace(`/Boutique/${boutique._id}`);
        }, 2000);
      } else if (data.status === 'pending_payment') {
        setPaymentStatus('pending');
      } else if (data.status === 'payment_rejected') {
        setPaymentStatus('rejected');
      }
    } catch (err) {
      console.warn("Erreur vérification paiement:", err);
    }
  };

  // Gestion du bouton retour Android
  useEffect(() => {
    const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
      if (paymentStatus === 'pending') {
        Alert.alert(
          "Paiement en cours",
          "Votre paiement est en cours de validation. Voulez-vous vraiment quitter ?",
          [
            { text: "Rester", style: "cancel" },
            { text: "Quitter", onPress: () => router.back() }
          ]
        );
        return true;
      }
      return false;
    });

    return () => backHandler.remove();
  }, [paymentStatus]);

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

  // Copier un numéro dans le presse-papier
  const copyToClipboard = (text: string, operator: string) => {
    Clipboard.setString(text);
    showMessage(
      "✅ Copié !",
      `Numéro ${operator} copié dans le presse-papier`,
      "success"
    );
  };

  // Navigation vers la page de preuve de paiement
const navigateToPaymentProof = () => {
  if (!boutique) {
    showMessage(
      "❌ Erreur",
      "Informations de boutique manquantes",
      "error"
    );
    return;
  }

  const paymentData = {
    boutiqueId: boutique.id, // ou boutique.boutiqueId selon ton backend
    nomBoutique: boutique.nom,
    montant: boutique.montant_abonnement || 9.99,
    devise: boutique.devise || "USD",
    plan: "premium",
    userId: boutique.utilisateur_id
  };

  // 🔥 Navigation correcte Expo Router
  router.push({
    pathname: "/Auth/Boutique/Premium/PaymentProofBoutique",
    params: paymentData
  });
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

  // Composant Statut Paiement
  const PaymentStatusIndicator = () => {
    if (paymentStatus === 'idle') return null;

    const statusConfig = {
      pending: {
        color: WARNING_ORANGE,
        icon: 'schedule',
        text: '⏳ Paiement en attente',
        description: "Votre paiement est en cours de validation par l'admin SHOPNET. Attente : 15-30 min"
      },
      validated: {
        color: SUCCESS_GREEN,
        icon: 'check-circle',
        text: '✅ Paiement validé',
        description: 'Votre boutique est maintenant activée ! Redirection...'
      },
      rejected: {
        color: ERROR_RED,
        icon: 'error',
        text: '❌ Paiement refusé',
        description: 'Votre preuve de paiement n\'a pas été acceptée. Veuillez réessayer.'
      }
    };

    const config = statusConfig[paymentStatus];

    return (
      <Animated.View 
        style={[
          styles.statusContainer,
          { 
            borderLeftColor: config.color,
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }]
          }
        ]}
      >
        <View style={styles.statusHeader}>
          <MaterialIcons name={config.icon as any} size={24} color={config.color} />
          <Text style={[styles.statusText, { color: config.color }]}>{config.text}</Text>
        </View>
        <Text style={styles.statusDescription}>{config.description}</Text>
      </Animated.View>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={PREMIUM_GOLD} />
        <Text style={styles.loadingText}>Chargement...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={SHOPNET_BLUE} />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header Section */}
        <Animated.View
          style={[
            styles.heroSection,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }],
            },
          ]}
        >
          <View style={styles.crownContainer}>
            <MaterialCommunityIcons
              name="store-check"
              size={60}
              color={PREMIUM_GOLD}
            />
          </View>
          <Text style={styles.heroTitle}>Activer votre boutique</Text>
          <Text style={styles.heroSubtitle}>
            Finalisez votre paiement pour débloquer toutes les fonctionnalités
          </Text>

          <View style={styles.priceContainer}>
            <Text style={styles.price}>$9.99</Text>
            <Text style={styles.pricePeriod}>/ mois</Text>
          </View>
          <Text style={styles.priceNote}>
            Premier mois • Renouvellement automatique
          </Text>
        </Animated.View>

        {/* Indicateur de statut */}
        <PaymentStatusIndicator />

        {/* Boutique Info */}
        {boutique && (
          <Animated.View
            style={[
              styles.boutiqueCard,
              {
                opacity: fadeAnim,
                transform: [{ translateY: slideAnim }],
              },
            ]}
          >
            <View style={styles.boutiqueHeader}>
              <FontAwesome5 name="store" size={20} color={PREMIUM_GOLD} />
              <Text style={styles.boutiqueName}>{boutique.nom}</Text>
            </View>
            <Text style={styles.boutiqueText}>
              Votre boutique sera activée immédiatement après validation du paiement
            </Text>
            
            <View style={styles.boutiqueDetails}>
              <View style={styles.detailRow}>
                <MaterialIcons name="calendar-today" size={16} color="rgba(255,255,255,0.7)" />
                <Text style={styles.detailText}>Activation après validation</Text>
              </View>
              <View style={styles.detailRow}>
                <MaterialIcons name="update" size={16} color="rgba(255,255,255,0.7)" />
                <Text style={styles.detailText}>Délai de vérification : 15-30 min</Text>
              </View>
              <View style={styles.detailRow}>
                <MaterialIcons name="notifications-active" size={16} color="rgba(255,255,255,0.7)" />
                <Text style={styles.detailText}>Notification dès validation</Text>
              </View>
            </View>
          </Animated.View>
        )}

        {/* Numéros SHOPNET PAYE */}
        <Animated.View
          style={[
            styles.paymentSection,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }],
            },
          ]}
        >
          <Text style={styles.sectionTitle}>📱 Numéros SHOPNET PAYE</Text>
          <Text style={styles.sectionSubtitle}>
            Envoyez $9.99 USD (≈ 19,980 CDF) à l'un de ces numéros
          </Text>
          
          <View style={styles.paymentNumbersContainer}>
            {/* Airtel */}
            <View style={styles.paymentNumberCard}>
              <View style={styles.operatorHeader}>
                <View style={[styles.operatorIcon, { backgroundColor: '#E41F25' }]}>
                  <Text style={styles.operatorIconText}>A</Text>
                </View>
                <View>
                  <Text style={styles.operatorName}>Airtel Money</Text>
                  <Text style={styles.operatorHint}>SHOPNET PAYE</Text>
                </View>
              </View>
              <TouchableOpacity 
                style={styles.copyButton}
                onPress={() => copyToClipboard(SHOPNET_PAYMENT_NUMBERS.AIRTEL, 'Airtel')}
              >
                <Text style={styles.paymentNumber}>{SHOPNET_PAYMENT_NUMBERS.AIRTEL}</Text>
                <MaterialIcons name="content-copy" size={18} color={PREMIUM_GOLD} />
              </TouchableOpacity>
            </View>

            {/* Orange */}
            <View style={styles.paymentNumberCard}>
              <View style={styles.operatorHeader}>
                <View style={[styles.operatorIcon, { backgroundColor: '#FF6600' }]}>
                  <Text style={styles.operatorIconText}>O</Text>
                </View>
                <View>
                  <Text style={styles.operatorName}>Orange Money</Text>
                  <Text style={styles.operatorHint}>SHOPNET PAYE</Text>
                </View>
              </View>
              <TouchableOpacity 
                style={styles.copyButton}
                onPress={() => copyToClipboard(SHOPNET_PAYMENT_NUMBERS.ORANGE, 'Orange')}
              >
                <Text style={styles.paymentNumber}>{SHOPNET_PAYMENT_NUMBERS.ORANGE}</Text>
                <MaterialIcons name="content-copy" size={18} color={PREMIUM_GOLD} />
              </TouchableOpacity>
            </View>

            {/* Vodacom */}
            <View style={styles.paymentNumberCard}>
              <View style={styles.operatorHeader}>
                <View style={[styles.operatorIcon, { backgroundColor: '#E41F25' }]}>
                  <Text style={styles.operatorIconText}>V</Text>
                </View>
                <View>
                  <Text style={styles.operatorName}>Vodacom M-Pesa</Text>
                  <Text style={styles.operatorHint}>SHOPNET PAYE</Text>
                </View>
              </View>
              <TouchableOpacity 
                style={styles.copyButton}
                onPress={() => copyToClipboard(SHOPNET_PAYMENT_NUMBERS.VODACOM, 'Vodacom')}
              >
                <Text style={styles.paymentNumber}>{SHOPNET_PAYMENT_NUMBERS.VODACOM}</Text>
                <MaterialIcons name="content-copy" size={18} color={PREMIUM_GOLD} />
              </TouchableOpacity>
            </View>
          </View>
        </Animated.View>

        {/* Instructions */}
        <Animated.View
          style={[
            styles.instructionsSection,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }],
            },
          ]}
        >
          <Text style={styles.sectionTitle}>📋 Comment procéder ?</Text>
          <View style={styles.instructions}>
            <View style={styles.instructionStep}>
              <View style={styles.stepNumber}>
                <Text style={styles.stepNumberText}>1</Text>
              </View>
              <Text style={styles.instructionText}>
                Envoyez 19,980 CDF (équivalent $9.99 USD) à l'un des numéros SHOPNET PAYE
              </Text>
            </View>
            <View style={styles.instructionStep}>
              <View style={styles.stepNumber}>
                <Text style={styles.stepNumberText}>2</Text>
              </View>
              <Text style={styles.instructionText}>
                Sauvegardez le code de confirmation (ex: TX49301, MP3486, AT-9932)
              </Text>
            </View>
            <View style={styles.instructionStep}>
              <View style={styles.stepNumber}>
                <Text style={styles.stepNumberText}>3</Text>
              </View>
              <Text style={styles.instructionText}>
                Cliquez sur "J'ai payé" pour envoyer votre preuve de paiement
              </Text>
            </View>
            <View style={styles.instructionStep}>
              <View style={styles.stepNumber}>
                <Text style={styles.stepNumberText}>4</Text>
              </View>
              <Text style={styles.instructionText}>
                Attendez la validation par l'admin (15-30 minutes)
              </Text>
            </View>
          </View>
        </Animated.View>

        {/* Fonctionnalités Premium */}
        <Animated.View
          style={[
            styles.featuresSection,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }],
            },
          ]}
        >
          <Text style={styles.sectionTitle}>🎯 Ce que vous débloquez</Text>
          <View style={styles.featuresGrid}>
            <View style={styles.featureCard}>
              <MaterialCommunityIcons name="shopping" size={24} color={PREMIUM_GOLD} />
              <Text style={styles.featureTitle}>Boutique Premium</Text>
              <Text style={styles.featureDescription}>Statut Premium pendant 30 jours</Text>
            </View>
            <View style={styles.featureCard}>
              <MaterialIcons name="inventory" size={24} color={PREMIUM_GOLD} />
              <Text style={styles.featureTitle}>200 Produits</Text>
              <Text style={styles.featureDescription}>Limite de 200 produits en boutique</Text>
            </View>
            <View style={styles.featureCard}>
              <MaterialIcons name="analytics" size={24} color={PREMIUM_GOLD} />
              <Text style={styles.featureTitle}>Analytics</Text>
              <Text style={styles.featureDescription}>Statistiques détaillées</Text>
            </View>
            <View style={styles.featureCard}>
              <MaterialIcons name="support-agent" size={24} color={PREMIUM_GOLD} />
              <Text style={styles.featureTitle}>Support</Text>
              <Text style={styles.featureDescription}>Support prioritaire</Text>
            </View>
          </View>
        </Animated.View>

        {/* Boutons d'action */}
        <Animated.View
          style={[
            styles.ctaSection,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }],
            },
          ]}
        >
          <TouchableOpacity
            style={styles.paymentButton}
            onPress={navigateToPaymentProof}
            disabled={paymentStatus === 'pending' || paymentStatus === 'validated'}
          >
            <MaterialIcons name="check-circle" size={20} color="#fff" />
            <Text style={styles.paymentButtonText}>
              {paymentStatus === 'pending' ? 'Paiement en attente...' : 'J\'ai payé via Mobile Money'}
            </Text>
          </TouchableOpacity>

          {paymentStatus === 'rejected' && (
            <TouchableOpacity
              style={styles.retryButton}
              onPress={() => setPaymentStatus('idle')}
            >
              <MaterialIcons name="refresh" size={20} color={PREMIUM_GOLD} />
              <Text style={styles.retryButtonText}>Réessayer le paiement</Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity
            style={styles.cancelButton}
            onPress={() => router.back()}
          >
            <Text style={styles.cancelButtonText}>Annuler</Text>
          </TouchableOpacity>

          {/* Support */}
          <TouchableOpacity 
            style={styles.supportLink}
            onPress={() => showMessage(
              "📞 Support SHOPNET",
              "Pour toute assistance :\n• Email : support@shopnet.cd\n• WhatsApp : +243 81 00 00 000\n• Heures : 8h-18h (Lun-Sam)",
              "info"
            )}
          >
            <Text style={styles.supportLinkText}>
              Besoin d'aide ? Contactez le support
            </Text>
          </TouchableOpacity>
        </Animated.View>
      </ScrollView>

      {/* Message flottant */}
      <CustomMessage />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: SHOPNET_BLUE,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 40,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: SHOPNET_BLUE,
  },
  loadingText: {
    color: "#fff",
    marginTop: 12,
    fontSize: 16,
  },
  heroSection: {
    alignItems: "center",
    paddingVertical: 40,
    paddingHorizontal: 20,
  },
  crownContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: "rgba(255, 167, 38, 0.1)",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 20,
    borderWidth: 2,
    borderColor: "rgba(255, 167, 38, 0.3)",
  },
  heroTitle: {
    color: "#fff",
    fontSize: 32,
    fontWeight: "800",
    textAlign: "center",
    marginBottom: 8,
  },
  heroSubtitle: {
    color: "rgba(255,255,255,0.8)",
    fontSize: 18,
    textAlign: "center",
    marginBottom: 24,
    lineHeight: 24,
  },
  priceContainer: {
    flexDirection: "row",
    alignItems: "baseline",
    marginBottom: 8,
  },
  price: {
    color: PREMIUM_GOLD,
    fontSize: 48,
    fontWeight: "900",
  },
  pricePeriod: {
    color: "rgba(255,255,255,0.7)",
    fontSize: 18,
    fontWeight: "600",
    marginLeft: 4,
  },
  priceNote: {
    color: "rgba(255,255,255,0.5)",
    fontSize: 14,
    textAlign: "center",
  },
  statusContainer: {
    backgroundColor: "rgba(255,255,255,0.05)",
    marginHorizontal: 20,
    marginBottom: 20,
    padding: 16,
    borderRadius: 12,
    borderLeftWidth: 4,
  },
  statusHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  statusText: {
    fontSize: 16,
    fontWeight: "700",
    marginLeft: 8,
  },
  statusDescription: {
    color: "rgba(255,255,255,0.8)",
    fontSize: 14,
    marginBottom: 12,
    lineHeight: 20,
  },
  boutiqueCard: {
    backgroundColor: "rgba(30, 42, 59, 0.9)",
    marginHorizontal: 20,
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
  },
  boutiqueHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  boutiqueName: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "700",
    marginLeft: 12,
  },
  boutiqueText: {
    color: "rgba(255,255,255,0.7)",
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 16,
  },
  boutiqueDetails: {
    gap: 8,
  },
  detailRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 4,
  },
  detailText: {
    color: "rgba(255,255,255,0.6)",
    fontSize: 12,
    marginLeft: 8,
  },
  paymentSection: {
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  sectionTitle: {
    color: "#fff",
    fontSize: 20,
    fontWeight: "700",
    marginBottom: 8,
  },
  sectionSubtitle: {
    color: "rgba(255,255,255,0.7)",
    fontSize: 14,
    marginBottom: 16,
  },
  paymentNumbersContainer: {
    gap: 12,
  },
  paymentNumberCard: {
    backgroundColor: "rgba(255, 167, 38, 0.1)",
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: "rgba(255, 167, 38, 0.3)",
  },
  operatorHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  operatorIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  operatorIconText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
  },
  operatorName: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  operatorHint: {
    color: "rgba(255,255,255,0.7)",
    fontSize: 12,
  },
  copyButton: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: "rgba(255,255,255,0.05)",
    borderRadius: 8,
  },
  paymentNumber: {
    color: PREMIUM_GOLD,
    fontSize: 16,
    fontWeight: "700",
    letterSpacing: 0.5,
  },
  instructionsSection: {
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  instructions: {
    gap: 12,
  },
  instructionStep: {
    flexDirection: "row",
    alignItems: "flex-start",
  },
  stepNumber: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: PREMIUM_GOLD,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
    marginTop: 2,
  },
  stepNumberText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "700",
  },
  instructionText: {
    color: "rgba(255,255,255,0.9)",
    fontSize: 14,
    flex: 1,
    lineHeight: 20,
  },
  featuresSection: {
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  featuresGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    gap: 12,
  },
  featureCard: {
    width: (SCREEN_WIDTH - 60) / 2,
    backgroundColor: "rgba(30, 42, 59, 0.9)",
    borderRadius: 12,
    padding: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  featureTitle: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "700",
    textAlign: "center",
    marginTop: 8,
    marginBottom: 4,
  },
  featureDescription: {
    color: "rgba(255,255,255,0.6)",
    fontSize: 12,
    textAlign: "center",
    lineHeight: 16,
  },
  ctaSection: {
    paddingHorizontal: 20,
    alignItems: "center",
  },
  paymentButton: {
    backgroundColor: SUCCESS_GREEN,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 18,
    paddingHorizontal: 32,
    borderRadius: 16,
    width: "100%",
    marginBottom: 12,
    shadowColor: SUCCESS_GREEN,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  paymentButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
    marginLeft: 8,
  },
  retryButton: {
    backgroundColor: "rgba(255, 167, 38, 0.1)",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
    width: "100%",
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "rgba(255, 167, 38, 0.3)",
  },
  retryButtonText: {
    color: PREMIUM_GOLD,
    fontSize: 14,
    fontWeight: "600",
    marginLeft: 8,
  },
  cancelButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    marginBottom: 16,
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
