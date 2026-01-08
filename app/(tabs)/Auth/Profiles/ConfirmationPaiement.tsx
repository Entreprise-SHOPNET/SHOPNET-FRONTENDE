// app/(tabs)/Auth/Profiles/ConfirmationPaiement.tsx
import React, { useState, useMemo, useEffect } from 'react';
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
  Clipboard,
} from "react-native";
import { useLocalSearchParams, useRouter } from 'expo-router';
import { MaterialIcons, FontAwesome5, Ionicons, FontAwesome } from "@expo/vector-icons";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const SHOPNET_BLUE = "#00182A";
const PRO_BLUE = "#42A5F5";
const SUCCESS_GREEN = "#4CAF50";
const ERROR_RED = "#F44336";
const WARNING_ORANGE = "#FF9800";
const BOOST_ORANGE = "#FA7921";

// Numéros SHOPNET PAYE
const SHOPNET_PAYMENT_NUMBERS = {
  AIRTEL: '+243 97 87 27 791',
  ORANGE: '+243 89 60 37 137',
  VODACOM:'+243 83 86 94 364',
};

export default function ConfirmationPaiement() {
  const params = useLocalSearchParams();
  const router = useRouter();
  
  const [processingPayment, setProcessingPayment] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState<'idle' | 'pending' | 'validated' | 'rejected'>('idle');
  const [transactionId, setTransactionId] = useState<string | null>(null);

  // États pour les messages
  const [messageVisible, setMessageVisible] = useState(false);
  const [messageTitle, setMessageTitle] = useState("");
  const [messageText, setMessageText] = useState("");
  const [messageType, setMessageType] = useState<"success" | "error" | "warning" | "info">("info");

  const fadeAnim = React.useRef(new Animated.Value(0)).current;
  const slideAnim = React.useRef(new Animated.Value(20)).current;
  const messageAnim = React.useRef(new Animated.Value(0)).current;

  // Gestion du bouton retour Android
  useEffect(() => {
    const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
      if (processingPayment) {
        Alert.alert(
          "Paiement en cours",
          "Voulez-vous vraiment annuler le paiement ?",
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
  }, [processingPayment]);

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
    ]).start();
  }, []);

  // Récupération des données de campagne
  const campaignData = useMemo(() => {
    try {
      const currency = String(params.currency || "CDF") as "USD" | "CDF";
      
      // Formater le montant selon la devise
      const formatAmount = (amount: number, curr: "USD" | "CDF") => {
        if (curr === "CDF") {
          return `${amount.toLocaleString('fr-FR')} CDF`;
        } else {
          return `$${amount.toFixed(2)} USD`;
        }
      };

      const budget = parseFloat(String(params.budget || "2500")) || 2500;
      const views = parseInt(String(params.views || "1000")) || 1000;
      const costPerView = currency === "CDF" 
        ? (budget / views).toFixed(2)
        : (budget / views).toFixed(4);

      const displayLocation = params.address 
        ? String(params.address)
        : `${params.city || ""}, ${params.country || ""}`.trim();

      return {
        product: {
          id: String(params.productId || ""),
          title: String(params.title || "Produit sans titre"),
          price: parseFloat(String(params.price || "0")) || 0,
          image: String(params.imageUrl || ""),
        },
        budget: budget,
        currency: currency,
        views: views,
        days: parseInt(String(params.days || "1")) || 1,
        location: displayLocation,
        country: String(params.country || "RDC"),
        city: String(params.city || "Kinshasa"),
        userId: String(params.userId || "1"),
        costPerView: costPerView,
        formatAmount: formatAmount,
        boostId: String(params.boostId || ""), // Ajout du boostId
      };
    } catch (error) {
      console.error("Erreur parsing campaign data:", error);
      return {
        product: {
          id: "0",
          title: "Produit de démonstration",
          price: 0,
          image: "https://via.placeholder.com/60x60.png?text=Produit",
        },
        budget: 2500,
        currency: "CDF" as "USD" | "CDF",
        views: 1000,
        days: 1,
        location: "Kinshasa, RDC",
        country: "RDC",
        city: "Kinshasa",
        userId: "1",
        costPerView: "2.50",
        formatAmount: (amount: number, curr: "USD" | "CDF") => 
          curr === "CDF" ? `${amount} CDF` : `$${amount} USD`,
        boostId: "",
      };
    }
  }, [params]);

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

  // Navigation vers la page de preuve de paiement - CORRECTION ICI
  const navigateToPaymentProof = () => {
    const paymentData = {
      boostId: campaignData.boostId, // Utilisation de campaignData.boostId
      productId: campaignData.product.id,
      userId: campaignData.userId,
      budget: campaignData.budget,
      currency: campaignData.currency,
      views: campaignData.views,
      days: campaignData.days,
      location: campaignData.location,
      country: campaignData.country,
      city: campaignData.city,
      productTitle: campaignData.product.title,
      productImage: campaignData.product.image,
      amountInCDF: campaignData.budget * (campaignData.currency === "USD" ? 2000 : 1)
    };

    // Naviguer vers la page de preuve de paiement avec les données
    router.push({
      pathname: '/Auth/Profiles/PaymentProof',
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

  // Composant Statut Paiement (simplifié)
  const PaymentStatusIndicator = () => {
    if (paymentStatus === 'idle') return null;

    const statusConfig = {
      pending: {
        color: WARNING_ORANGE,
        icon: 'schedule',
        text: 'En attente de validation',
        description: "Votre paiement est en cours de validation par l'admin SHOPNET"
      },
      validated: {
        color: SUCCESS_GREEN,
        icon: 'check-circle',
        text: 'Paiement validé ✅',
        description: 'Votre boost/boutique est maintenant actif !'
      },
      rejected: {
        color: ERROR_RED,
        icon: 'error',
        text: 'Paiement refusé',
        description: 'Votre preuve de paiement n\'a pas été acceptée'
      }
    };

    const config = statusConfig[paymentStatus];

    return (
      <View style={[styles.statusContainer, { borderLeftColor: config.color }]}>
        <View style={styles.statusHeader}>
          <MaterialIcons name={config.icon as any} size={24} color={config.color} />
          <Text style={[styles.statusText, { color: config.color }]}>{config.text}</Text>
        </View>
        <Text style={styles.statusDescription}>{config.description}</Text>
      </View>
    );
  };

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
          >
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Paiement SHOPNET</Text>
          <View style={styles.amountContainer}>
            <Text style={styles.amountLabel}>Montant à payer</Text>
            <Text style={styles.amount}>
              {campaignData.formatAmount(campaignData.budget, campaignData.currency)}
            </Text>
            <Text style={styles.convertedAmount}>
              ≈ {campaignData.formatAmount(campaignData.budget * 2000, "CDF")}
            </Text>
          </View>
          <Text style={styles.headerSubtitle}>
            Paiement manuel via Mobile Money
          </Text>
        </Animated.View>

        {/* Indicateur de statut */}
        <PaymentStatusIndicator />

        {/* Section Produit */}
        <Animated.View 
          style={[
            styles.section,
            { 
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }]
            }
          ]}
        >
          <Text style={styles.sectionTitle}>📊 Détails de la campagne</Text>
          <View style={styles.productCard}>
            <Image 
              source={{ 
                uri: campaignData.product.image || "https://via.placeholder.com/60x60.png?text=Produit"
              }} 
              style={styles.productImage}
              resizeMode="cover"
            />
            <View style={styles.productInfo}>
              <Text style={styles.productTitle} numberOfLines={2}>
                {campaignData.product.title}
              </Text>
              <Text style={styles.productPrice}>
                {campaignData.formatAmount(campaignData.product.price, "USD")}
              </Text>
              <Text style={styles.productLocation}>
                📍 {campaignData.location}
              </Text>
              <View style={styles.boostDetails}>
                <View style={styles.boostDetail}>
                  <FontAwesome5 name="eye" size={12} color={BOOST_ORANGE} />
                  <Text style={styles.boostDetailText}>
                    {campaignData.views.toLocaleString()} vues
                  </Text>
                </View>
                <View style={styles.boostDetail}>
                  <FontAwesome5 name="calendar" size={12} color={BOOST_ORANGE} />
                  <Text style={styles.boostDetailText}>
                    {campaignData.days} jour(s)
                  </Text>
                </View>
                <View style={styles.boostDetail}>
                  <FontAwesome name="money" size={12} color={BOOST_ORANGE} />
                  <Text style={styles.boostDetailText}>
                    {campaignData.costPerView} {campaignData.currency}/vue
                  </Text>
                </View>
              </View>
            </View>
          </View>
        </Animated.View>

        {/* Numéros SHOPNET PAYE */}
        <Animated.View 
          style={[
            styles.section,
            { 
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }]
            }
          ]}
        >
          <Text style={styles.sectionTitle}>📱 Numéros SHOPNET PAYE</Text>
          <Text style={styles.sectionSubtitle}>
            Envoyez le paiement à l'un de ces numéros
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
                <MaterialIcons name="content-copy" size={18} color={PRO_BLUE} />
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
                <MaterialIcons name="content-copy" size={18} color={PRO_BLUE} />
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
                <MaterialIcons name="content-copy" size={18} color={PRO_BLUE} />
              </TouchableOpacity>
            </View>
          </View>
        </Animated.View>

        {/* Instructions */}
        <Animated.View 
          style={[
            styles.section,
            { 
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }]
            }
          ]}
        >
          <Text style={styles.sectionTitle}>📋 Comment procéder ?</Text>
          <View style={styles.instructions}>
            <View style={styles.instructionStep}>
              <View style={styles.stepNumber}>
                <Text style={styles.stepNumberText}>1</Text>
              </View>
              <Text style={styles.instructionText}>
                Envoyez {campaignData.formatAmount(campaignData.budget * 2000, "CDF")} à l'un des numéros SHOPNET PAYE ci-dessus
              </Text>
            </View>
            <View style={styles.instructionStep}>
              <View style={styles.stepNumber}>
                <Text style={styles.stepNumberText}>2</Text>
              </View>
              <Text style={styles.instructionText}>
                Sauvegardez le code de confirmation reçu par SMS (ex: TX49301, MP3486, AT-9932)
              </Text>
            </View>
            <View style={styles.instructionStep}>
              <View style={styles.stepNumber}>
                <Text style={styles.stepNumberText}>3</Text>
              </View>
              <Text style={styles.instructionText}>
                Cliquez sur "J'ai payé" ci-dessous pour envoyer votre preuve de paiement
              </Text>
            </View>
            <View style={styles.instructionStep}>
              <View style={styles.stepNumber}>
                <Text style={styles.stepNumberText}>4</Text>
              </View>
              <Text style={styles.instructionText}>
                Attendez la validation par l'admin SHOPNET (quelques minutes)
              </Text>
            </View>
          </View>
        </Animated.View>

        {/* Récapitulatif coût */}
        <Animated.View 
          style={[
            styles.section,
            { 
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }]
            }
          ]}
        >
          <Text style={styles.sectionTitle}>💰 Récapitulatif</Text>
          <View style={styles.summaryGrid}>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>Budget</Text>
              <Text style={styles.summaryValue}>
                {campaignData.formatAmount(campaignData.budget, campaignData.currency)}
              </Text>
            </View>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>Vues estimées</Text>
              <Text style={styles.summaryValue}>{campaignData.views.toLocaleString()}</Text>
            </View>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>Durée</Text>
              <Text style={styles.summaryValue}>{campaignData.days} jour(s)</Text>
            </View>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>Coût/vue</Text>
              <Text style={styles.summaryValue}>
                {campaignData.costPerView} {campaignData.currency}
              </Text>
            </View>
          </View>
        </Animated.View>

        {/* Boutons d'action */}
        <Animated.View 
          style={[
            styles.ctaSection,
            { 
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }]
            }
          ]}
        >
          <TouchableOpacity 
            style={styles.paymentButton}
            onPress={navigateToPaymentProof} // Appel de la fonction corrigée
            disabled={paymentStatus === 'pending'}
          >
            <MaterialIcons name="check-circle" size={20} color="#fff" />
            <Text style={styles.paymentButtonText}>
              J'ai payé via Mobile Money
            </Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.cancelButton}
            onPress={() => router.back()}
          >
            <Text style={styles.cancelButtonText}>
              Annuler
            </Text>
          </TouchableOpacity>

          {/* Support */}
          <TouchableOpacity 
            style={styles.supportLink}
            onPress={() => showMessage(
              "📞 Support SHOPNET",
              "Pour toute assistance :\n• Email : entrepriseshopia@gmail.com\n• WhatsApp : +243 89 60 37 137\n• Heures : 8h-18h (Lun-Sam)",
              "info"
            )}
          >
            <Text style={styles.supportLinkText}>
              Besoin d'aide ? Contactez le support SHOPNET
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
    paddingVertical: 32,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.1)",
  },
  backButton: {
    position: "absolute",
    left: 20,
    top: 32,
    padding: 8,
    zIndex: 10,
  },
  headerTitle: {
    color: "#fff",
    fontSize: 28,
    fontWeight: "800",
    textAlign: "center",
    marginBottom: 8,
  },
  amountContainer: {
    alignItems: "center",
    marginBottom: 8,
  },
  amountLabel: {
    color: "rgba(255,255,255,0.7)",
    fontSize: 16,
    marginBottom: 4,
  },
  amount: {
    color: BOOST_ORANGE,
    fontSize: 36,
    fontWeight: "900",
  },
  convertedAmount: {
    color: "rgba(255,255,255,0.6)",
    fontSize: 14,
    marginTop: 4,
  },
  headerSubtitle: {
    color: "rgba(255,255,255,0.6)",
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
  section: {
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
  productCard: {
    flexDirection: "row",
    backgroundColor: "rgba(30, 42, 59, 0.9)",
    borderRadius: 12,
    padding: 16,
    alignItems: "center",
  },
  productImage: {
    width: 60,
    height: 60,
    borderRadius: 8,
    marginRight: 12,
  },
  productInfo: {
    flex: 1,
  },
  productTitle: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 4,
  },
  productPrice: {
    color: BOOST_ORANGE,
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 4,
  },
  productLocation: {
    color: "rgba(255,255,255,0.7)",
    fontSize: 12,
    marginBottom: 8,
  },
  boostDetails: {
    flexDirection: "row",
    gap: 8,
    flexWrap: 'wrap',
  },
  boostDetail: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(250, 121, 33, 0.1)",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  boostDetailText: {
    color: BOOST_ORANGE,
    fontSize: 10,
    fontWeight: "600",
    marginLeft: 4,
  },
  paymentNumbersContainer: {
    gap: 12,
  },
  paymentNumberCard: {
    backgroundColor: "rgba(66, 165, 245, 0.1)",
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: "rgba(66, 165, 245, 0.3)",
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
    color: PRO_BLUE,
    fontSize: 16,
    fontWeight: "700",
    letterSpacing: 0.5,
  },
  summaryGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    gap: 12,
  },
  summaryItem: {
    backgroundColor: "rgba(255,255,255,0.05)",
    padding: 12,
    borderRadius: 8,
    minWidth: "48%",
    alignItems: "center",
  },
  summaryLabel: {
    color: "rgba(255,255,255,0.7)",
    fontSize: 12,
    marginBottom: 4,
  },
  summaryValue: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
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
    backgroundColor: BOOST_ORANGE,
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
  paymentButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "800",
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
    color: PRO_BLUE,
    fontSize: 14,
    textDecorationLine: "underline",
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