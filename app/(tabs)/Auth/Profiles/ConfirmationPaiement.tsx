

// app/(tabs)/Auth/Profiles/ConfirmationPaiement.tsx
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
  Linking,
  Alert,
  BackHandler,
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

// Configuration Backend PawaPay
const BACKEND_CONFIG = {
  apiUrl: "http://100.64.134.89:5000/api/boost",
};

export default function ConfirmationPaiement() {
  const params = useLocalSearchParams();
  const router = useRouter();
  
  const [processingPayment, setProcessingPayment] = useState(false);
  const [generatingLink, setGeneratingLink] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState<'idle' | 'pending' | 'success' | 'failed'>('idle');
  const [boostId, setBoostId] = useState<string | null>(null);

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
        formatAmount: formatAmount
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
          curr === "CDF" ? `${amount} CDF` : `$${amount} USD`
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

  // Vérifier le statut du paiement
  const checkPaymentStatus = async (id: string) => {
    try {
      const response = await fetch(`${BACKEND_CONFIG.apiUrl}/status/${id}`);
      const result = await response.json();
      
      if (result.success && result.boost) {
        if (result.boost.status === 'active' || result.boost.status === 'completed') {
          setPaymentStatus('success');
          showMessage(
            "✅ Paiement Réussi !",
            "Votre campagne de boost a été activée avec succès !",
            "success"
          );
          return true;
        } else if (result.boost.status === 'failed') {
          setPaymentStatus('failed');
          showMessage(
            "❌ Paiement Échoué",
            "Le paiement a échoué. Veuillez réessayer.",
            "error"
          );
          return true;
        }
      }
      return false;
    } catch (error) {
      console.error("Erreur vérification statut:", error);
      return false;
    }
  };

  // Fonction pour initier le paiement PawaPay
  const initiatePawaPayPayment = async () => {
    try {
      setProcessingPayment(true);
      setGeneratingLink(true);
      setPaymentStatus('pending');

      // Préparer les données pour le backend
      const paymentData = {
        productId: campaignData.product.id,
        userId: campaignData.userId,
        budget: campaignData.budget,
        currency: campaignData.currency,
        views: campaignData.views,
        days: campaignData.days,
        country: campaignData.country,
        city: campaignData.city,
        address: campaignData.location
      };

      console.log("🔄 Envoi demande paiement au backend:", paymentData);

      // Appeler le backend pour créer le Payment Link PawaPay
      const response = await fetch(`${BACKEND_CONFIG.apiUrl}/create`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(paymentData),
      });

      const result = await response.json();

      console.log("✅ Réponse backend:", result);

      if (response.ok && result.success && result.link) {
        setBoostId(result.boostId);
        
        // Ouvrir le Payment Link PawaPay dans le navigateur
        const canOpen = await Linking.canOpenURL(result.link);
        if (canOpen) {
          await Linking.openURL(result.link);
          showMessage(
            "🔗 Redirection vers PawaPay",
            `Ouverture de la page de paiement sécurisée PawaPay...\nMontant: ${campaignData.formatAmount(campaignData.budget, campaignData.currency)}`,
            "info"
          );

          // Démarrer la vérification périodique du statut
          const statusInterval = setInterval(async () => {
            const isCompleted = await checkPaymentStatus(result.boostId);
            if (isCompleted) {
              clearInterval(statusInterval);
            }
          }, 5000);

          // Arrêter la vérification après 10 minutes
          setTimeout(() => {
            clearInterval(statusInterval);
            if (paymentStatus === 'pending') {
              showMessage(
                "⏱️ Vérification expirée",
                "Le délai de vérification est écoulé. Vérifiez manuellement le statut de votre paiement.",
                "warning"
              );
            }
          }, 10 * 60 * 1000);

        } else {
          throw new Error("Impossible d'ouvrir le lien de paiement PawaPay");
        }
      } else {
        throw new Error(result.message || "Erreur lors de la génération du lien de paiement PawaPay");
      }

    } catch (error: any) {
      console.error("❌ Erreur paiement PawaPay:", error);
      setPaymentStatus('failed');
      showMessage(
        "❌ Erreur de Paiement",
        error.message || "Une erreur est survenue lors de la connexion à PawaPay. Veuillez réessayer.",
        "error"
      );
    } finally {
      setProcessingPayment(false);
      setGeneratingLink(false);
    }
  };

  // Ouvrir le lien PawaPay manuellement
  const openPawaPayLink = async () => {
    if (!boostId) return;
    
    try {
      const response = await fetch(`${BACKEND_CONFIG.apiUrl}/status/${boostId}`);
      const result = await response.json();
      
      if (result.success && result.boost.payment_url) {
        await Linking.openURL(result.boost.payment_url);
      }
    } catch (error) {
      showMessage(
        "❌ Lien indisponible",
        "Le lien de paiement n'est plus disponible. Veuillez recréer la commande.",
        "error"
      );
    }
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

  // Composant Statut Paiement
  const PaymentStatusIndicator = () => {
    if (paymentStatus === 'idle') return null;

    const statusConfig = {
      pending: {
        color: WARNING_ORANGE,
        icon: 'schedule',
        text: 'Paiement en attente',
        description: 'En attente de confirmation PawaPay...'
      },
      success: {
        color: SUCCESS_GREEN,
        icon: 'check-circle',
        text: 'Paiement confirmé',
        description: 'Votre boost est maintenant actif !'
      },
      failed: {
        color: ERROR_RED,
        icon: 'error',
        text: 'Paiement échoué',
        description: 'Le paiement n\'a pas abouti'
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
        
        {paymentStatus === 'pending' && boostId && (
          <TouchableOpacity style={styles.retryButton} onPress={openPawaPayLink}>
            <Text style={styles.retryButtonText}>Ouvrir PawaPay à nouveau</Text>
          </TouchableOpacity>
        )}
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
            disabled={processingPayment}
          >
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Paiement PawaPay</Text>
          <View style={styles.amountContainer}>
            <Text style={styles.amountLabel}>Montant à payer</Text>
            <Text style={styles.amount}>
              {campaignData.formatAmount(campaignData.budget, campaignData.currency)}
            </Text>
          </View>
          <Text style={styles.headerSubtitle}>
            Paiement sécurisé via PawaPay
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

        {/* Informations de paiement PawaPay */}
        <Animated.View 
          style={[
            styles.section,
            { 
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }]
            }
          ]}
        >
          <Text style={styles.sectionTitle}>🔒 Paiement Sécurisé PawaPay</Text>

          <View style={styles.paymentInfo}>
            <View style={styles.paymentHeader}>
              <Image 
                source={{ uri: 'https://pawapay.app/images/logo.png' }}
                style={styles.pawaPayLogo}
                resizeMode="contain"
              />
              <Text style={styles.paymentInfoTitle}>PawaPay Payment</Text>
            </View>
            
            <Text style={styles.paymentInfoText}>
              • Paiement 100% sécurisé et crypté{'\n'}
              • Support mobile money et cartes{'\n'}
              • Transactions instantanées{'\n'}
              • Support client 24h/24{'\n'}
              • Reçu électronique immédiat
            </Text>

            <View style={styles.securityBadges}>
              <View style={styles.badge}>
                <MaterialIcons name="security" size={16} color={SUCCESS_GREEN} />
                <Text style={styles.badgeText}>SSL Sécurisé</Text>
              </View>
              <View style={styles.badge}>
                <MaterialIcons name="verified-user" size={16} color={PRO_BLUE} />
                <Text style={styles.badgeText}>Certifié</Text>
              </View>
              <View style={styles.badge}>
                <MaterialIcons name="lock" size={16} color={WARNING_ORANGE} />
                <Text style={styles.badgeText}>Crypté</Text>
              </View>
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
                Cliquez sur "Payer avec PawaPay"
              </Text>
            </View>
            <View style={styles.instructionStep}>
              <View style={styles.stepNumber}>
                <Text style={styles.stepNumberText}>2</Text>
              </View>
              <Text style={styles.instructionText}>
                Vous serez redirigé vers la page sécurisée PawaPay
              </Text>
            </View>
            <View style={styles.instructionStep}>
              <View style={styles.stepNumber}>
                <Text style={styles.stepNumberText}>3</Text>
              </View>
              <Text style={styles.instructionText}>
                Complétez le paiement avec votre mobile money ou carte
              </Text>
            </View>
            <View style={styles.instructionStep}>
              <View style={styles.stepNumber}>
                <Text style={styles.stepNumberText}>4</Text>
              </View>
              <Text style={styles.instructionText}>
                Retour automatique et activation du boost
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
          {paymentStatus !== 'success' && (
            <TouchableOpacity 
              style={[
                styles.paymentButton,
                processingPayment && styles.paymentButtonDisabled,
                paymentStatus === 'pending' && styles.paymentButtonPending
              ]}
              onPress={initiatePawaPayPayment}
              disabled={processingPayment || paymentStatus === 'pending'}
            >
              {generatingLink ? (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator size="small" color="#fff" />
                  <Text style={styles.paymentButtonText}>
                    Génération du Payment Link...
                  </Text>
                </View>
              ) : paymentStatus === 'pending' ? (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator size="small" color="#fff" />
                  <Text style={styles.paymentButtonText}>
                    Paiement en cours...
                  </Text>
                </View>
              ) : (
                <>
                  <MaterialIcons name="payment" size={20} color="#fff" />
                  <Text style={styles.paymentButtonText}>
                    Payer {campaignData.formatAmount(campaignData.budget, campaignData.currency)} avec PawaPay
                  </Text>
                </>
              )}
            </TouchableOpacity>
          )}

          {paymentStatus === 'success' && (
            <TouchableOpacity 
              style={styles.successButton}
              onPress={() => router.push('/(tabs)/HomeScreen')}
            >
              <MaterialIcons name="check-circle" size={20} color="#fff" />
              <Text style={styles.successButtonText}>
                Retour à l'accueil
              </Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity 
            style={[
              styles.cancelButton,
              (processingPayment || paymentStatus === 'pending') && styles.cancelButtonDisabled
            ]}
            onPress={() => {
              if (paymentStatus === 'success') {
                router.push('/(tabs)/HomeScreen');
              } else {
                router.back();
              }
            }}
            disabled={processingPayment || paymentStatus === 'pending'}
          >
            <Text style={styles.cancelButtonText}>
              {paymentStatus === 'success' ? 'Terminer' : 'Annuler'}
            </Text>
          </TouchableOpacity>

          {/* Lien support */}
          <TouchableOpacity 
            style={styles.supportLink}
            onPress={() => Linking.openURL('https://pawapay.app/support')}
          >
            <Text style={styles.supportLinkText}>
              Besoin d'aide ? Contactez le support PawaPay
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
  },
  retryButton: {
    backgroundColor: "rgba(255,255,255,0.1)",
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
    alignSelf: 'flex-start',
  },
  retryButtonText: {
    color: PRO_BLUE,
    fontSize: 12,
    fontWeight: "600",
  },
  section: {
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  sectionTitle: {
    color: "#fff",
    fontSize: 20,
    fontWeight: "700",
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
  paymentInfo: {
    backgroundColor: "rgba(66, 165, 245, 0.1)",
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: "rgba(66, 165, 245, 0.3)",
  },
  paymentHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  pawaPayLogo: {
    width: 24,
    height: 24,
    marginRight: 8,
  },
  paymentInfoTitle: {
    color: PRO_BLUE,
    fontSize: 18,
    fontWeight: "700",
  },
  paymentInfoText: {
    color: "rgba(255,255,255,0.9)",
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 12,
  },
  securityBadges: {
    flexDirection: "row",
    justifyContent: "space-around",
  },
  badge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.1)",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  badgeText: {
    color: "rgba(255,255,255,0.8)",
    fontSize: 10,
    marginLeft: 4,
    fontWeight: "500",
  },
  instructions: {
    gap: 12,
  },
  instructionStep: {
    flexDirection: "row",
    alignItems: "center",
  },
  stepNumber: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: BOOST_ORANGE,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
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
  },
  ctaSection: {
    paddingHorizontal: 20,
    alignItems: "center",
  },
  paymentButton: {
    backgroundColor: BOOST_ORANGE,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 18,
    paddingHorizontal: 24,
    borderRadius: 12,
    width: "100%",
    marginBottom: 12,
    shadowColor: BOOST_ORANGE,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  paymentButtonPending: {
    backgroundColor: WARNING_ORANGE,
  },
  paymentButtonDisabled: {
    opacity: 0.7,
  },
  paymentButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "800",
    marginLeft: 8,
  },
  successButton: {
    backgroundColor: SUCCESS_GREEN,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 18,
    paddingHorizontal: 24,
    borderRadius: 12,
    width: "100%",
    marginBottom: 12,
  },
  successButtonText: {
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