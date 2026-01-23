

import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
  TextInput,
  Alert,
  StatusBar,
  Dimensions,
  Animated,
} from "react-native";
import { useRouter } from "expo-router";
import { MaterialIcons, FontAwesome5, Ionicons, FontAwesome } from "@expo/vector-icons";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const SHOPNET_BLUE = "#00182A";
const PRO_BLUE = "#42A5F5";
const SUCCESS_GREEN = "#4CAF50";

type PaymentMethod = "mobile" | "card";

export default function PaiementPro() {
  const router = useRouter();
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod>("mobile");
  const [loading, setLoading] = useState(false);
  
  // États pour Mobile Money
  const [phoneNumber, setPhoneNumber] = useState("");
  const [mobileOperator, setMobileOperator] = useState("orange");
  
  // États pour Carte Bancaire
  const [cardNumber, setCardNumber] = useState("");
  const [expiryDate, setExpiryDate] = useState("");
  const [cvv, setCvv] = useState("");
  const [cardholderName, setCardholderName] = useState("");

  const fadeAnim = React.useRef(new Animated.Value(0)).current;
  const slideAnim = React.useRef(new Animated.Value(20)).current;

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

  const handlePayment = async () => {
    setLoading(true);
    
    try {
      // Validation des champs
      if (selectedMethod === "mobile") {
        const cleanPhoneNumber = phoneNumber.replace(/\D/g, '');
        if (!cleanPhoneNumber || cleanPhoneNumber.length !== 10) {
          Alert.alert("Erreur", "Veuillez entrer un numéro de téléphone valide (10 chiffres)");
          setLoading(false);
          return;
        }

        // Vérifier que le numéro commence par 09, 08, 07, etc.
        if (!cleanPhoneNumber.match(/^(09|08|07|06)/)) {
          Alert.alert("Erreur", "Le numéro doit commencer par 09, 08, 07 ou 06");
          setLoading(false);
          return;
        }

        // Préparer les données pour l'API
        const paymentData = {
          method: "mobile_money",
          operator: mobileOperator,
          phoneNumber: cleanPhoneNumber,
          amount: 24.99,
          currency: "USD",
          plan: "pro"
        };

        // Ici vous appelleriez votre API réelle
        await processMobileMoneyPayment(paymentData);
        
      } else {
        // Redirection vers la page de paiement bancaire
        router.push("/(tabs)/Auth/Boutique/Pro/PaiementBancaire");
        setLoading(false);
        return;
      }

      // Si on arrive ici, le paiement mobile money a réussi
      setLoading(false);
      Alert.alert(
        "Paiement Réussi!",
        "Votre abonnement Pro a été activé avec succès!",
        [
          {
            text: "OK",
            onPress: () => router.replace("/(tabs)/Auth/Boutique/Pro/Dashboard"),
          },
        ]
      );
    } catch (error) {
      setLoading(false);
      Alert.alert(
        "Erreur de Paiement",
        "Une erreur est survenue lors du traitement. Veuillez réessayer."
      );
    }
  };

  // Fonction simulée pour le paiement Mobile Money
  const processMobileMoneyPayment = async (paymentData: any) => {
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        // Simulation de succès - Dans la réalité, vous appelleriez votre API ici
        console.log("Paiement Pro Mobile Money envoyé:", paymentData);
        
        // Simulation d'une réponse API réussie
        resolve({ 
          success: true, 
          transactionId: "PRO_TX_" + Date.now(),
          status: "completed",
          message: "Paiement Pro traité avec succès"
        });
      }, 2000);
    });
  };

  const formatPhoneNumber = (text: string) => {
    // Supprimer tous les caractères non numériques
    const cleaned = text.replace(/\D/g, '');
    
    // Limiter à 10 chiffres (format 0978727791)
    const limited = cleaned.substring(0, 10);
    
    return limited;
  };

  const PaymentMethodButton = ({ 
    method, 
    title, 
    icon, 
    description 
  }: { 
    method: PaymentMethod; 
    title: string; 
    icon: React.ReactNode; 
    description: string; 
  }) => (
    <TouchableOpacity
      style={[
        styles.paymentMethodButton,
        selectedMethod === method && styles.paymentMethodButtonSelected,
      ]}
      onPress={() => setSelectedMethod(method)}
    >
      <View style={styles.paymentMethodHeader}>
        <View style={styles.paymentMethodIconContainer}>
          {icon}
        </View>
        <View style={styles.paymentMethodTextContainer}>
          <Text style={styles.paymentMethodTitle}>{title}</Text>
          <Text style={styles.paymentMethodDescription}>{description}</Text>
        </View>
        <View style={[
          styles.radioButton,
          selectedMethod === method && styles.radioButtonSelected,
        ]}>
          {selectedMethod === method && (
            <View style={styles.radioButtonInner} />
          )}
        </View>
      </View>
    </TouchableOpacity>
  );

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
          <Text style={styles.headerTitle}>Paiement Pro</Text>
          <View style={styles.amountContainer}>
            <Text style={styles.amountLabel}>Montant à payer</Text>
            <Text style={styles.amount}>$24.99</Text>
          </View>
          <Text style={styles.headerSubtitle}>
            Débloquez toutes les fonctionnalités Pro
          </Text>
        </Animated.View>

        {/* Choix du mode de paiement */}
        <Animated.View 
          style={[
            styles.section,
            { 
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }]
            }
          ]}
        >
          <Text style={styles.sectionTitle}>Moyen de Paiement</Text>
          
          <PaymentMethodButton
            method="mobile"
            title="Mobile Money"
            icon={<FontAwesome5 name="mobile-alt" size={20} color={PRO_BLUE} />}
            description="Airtel Money, Orange Money, M-Pesa"
          />
          
          <PaymentMethodButton
            method="card"
            title="Carte Bancaire"
            icon={<FontAwesome5 name="credit-card" size={20} color={PRO_BLUE} />}
            description="Visa, MasterCard, Carte prépayée"
          />
        </Animated.View>

        {/* Formulaire de paiement dynamique */}
        <Animated.View 
          style={[
            styles.section,
            { 
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }]
            }
          ]}
        >
          <Text style={styles.sectionTitle}>
            {selectedMethod === "mobile" ? "Paiement Mobile Money" : "Paiement Carte Bancaire"}
          </Text>

          {selectedMethod === "mobile" ? (
            // Formulaire Mobile Money
            <View style={styles.form}>
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Opérateur Mobile</Text>
                <View style={styles.operatorButtons}>
                  {[
                    { id: "orange", name: "Orange Money", icon: "sim-card" },
                    { id: "airtel", name: "Airtel Money", icon: "sim-card" },
                    { id: "vodacom", name: "M-Pesa", icon: "sim-card" },
                  ].map((operator) => (
                    <TouchableOpacity
                      key={operator.id}
                      style={[
                        styles.operatorButton,
                        mobileOperator === operator.id && styles.operatorButtonSelected,
                      ]}
                      onPress={() => setMobileOperator(operator.id)}
                    >
                      <MaterialIcons 
                        name={operator.icon as any} 
                        size={16} 
                        color={mobileOperator === operator.id ? "#fff" : PRO_BLUE} 
                      />
                      <Text style={[
                        styles.operatorButtonText,
                        mobileOperator === operator.id && styles.operatorButtonTextSelected,
                      ]}>
                        {operator.name}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Numéro de Téléphone</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Ex: 0978727791"
                  placeholderTextColor="rgba(255,255,255,0.4)"
                  value={phoneNumber}
                  onChangeText={(text) => setPhoneNumber(formatPhoneNumber(text))}
                  keyboardType="phone-pad"
                  maxLength={10}
                />
                <Text style={styles.helperText}>
                  Format: 0978727791 (10 chiffres sans espaces)
                </Text>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Montant</Text>
                <View style={styles.amountInput}>
                  <Text style={styles.currencySymbol}>$</Text>
                  <Text style={styles.amountValue}>24.99</Text>
                </View>
                <Text style={styles.helperText}>
                  Vous recevrez une demande de confirmation sur votre mobile
                </Text>
              </View>

              {/* Informations sur le format */}
              <View style={styles.infoBox}>
                <MaterialIcons name="info" size={16} color={PRO_BLUE} />
                <Text style={styles.infoText}>
                  Format accepté: 0978727791, 0876543210, 0771234567
                </Text>
              </View>
            </View>
          ) : (
            // Formulaire Carte Bancaire - Version simplifiée avec redirection
            <View style={styles.form}>
              <View style={styles.cardRedirectInfo}>
                <MaterialIcons name="credit-card" size={48} color={PRO_BLUE} />
                <Text style={styles.cardRedirectTitle}>
                  Paiement par Carte Bancaire
                </Text>
                <Text style={styles.cardRedirectDescription}>
                  Vous serez redirigé vers une page sécurisée pour saisir vos informations de carte bancaire.
                </Text>
                
                <View style={styles.supportedCards}>
                  <FontAwesome name="cc-visa" size={32} color="rgba(255,255,255,0.8)" />
                  <FontAwesome name="cc-mastercard" size={32} color="rgba(255,255,255,0.8)" />
                  <MaterialIcons name="sim-card" size={32} color="rgba(255,255,255,0.8)" />
                </View>
              </View>
            </View>
          )}
        </Animated.View>

        {/* Informations de sécurité */}
        <Animated.View 
          style={[
            styles.securitySection,
            { 
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }]
            }
          ]}
        >
          <View style={styles.securityInfo}>
            <MaterialIcons name="security" size={20} color={SUCCESS_GREEN} />
            <Text style={styles.securityText}>
              Paiement 100% sécurisé et crypté. Vos données sont protégées.
            </Text>
          </View>
        </Animated.View>

        {/* Bouton de paiement */}
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
            style={[
              styles.paymentButton,
              loading && styles.paymentButtonDisabled
            ]}
            onPress={handlePayment}
            disabled={loading}
          >
            {loading ? (
              <View style={styles.loadingContainer}>
                <Text style={styles.paymentButtonText}>Traitement...</Text>
              </View>
            ) : (
              <>
                <MaterialIcons name="lock" size={20} color="#fff" />
                <Text style={styles.paymentButtonText}>
                  {selectedMethod === "mobile" ? "Payer $24.99 - Activer Pro" : "Continuer vers le Paiement"}
                </Text>
              </>
            )}
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.cancelButton}
            onPress={() => router.back()}
            disabled={loading}
          >
            <Text style={styles.cancelButtonText}>Annuler</Text>
          </TouchableOpacity>
        </Animated.View>
      </ScrollView>
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
    color: PRO_BLUE,
    fontSize: 36,
    fontWeight: "900",
  },
  headerSubtitle: {
    color: "rgba(255,255,255,0.6)",
    fontSize: 14,
    textAlign: "center",
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
  paymentMethodButton: {
    backgroundColor: "rgba(30, 42, 59, 0.9)",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 2,
    borderColor: "transparent",
  },
  paymentMethodButtonSelected: {
    borderColor: PRO_BLUE,
    backgroundColor: "rgba(66, 165, 245, 0.1)",
  },
  paymentMethodHeader: {
    flexDirection: "row",
    alignItems: "center",
  },
  paymentMethodIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(66, 165, 245, 0.1)",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  paymentMethodTextContainer: {
    flex: 1,
  },
  paymentMethodTitle: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 2,
  },
  paymentMethodDescription: {
    color: "rgba(255,255,255,0.6)",
    fontSize: 12,
  },
  radioButton: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.3)",
    justifyContent: "center",
    alignItems: "center",
  },
  radioButtonSelected: {
    borderColor: PRO_BLUE,
    backgroundColor: PRO_BLUE,
  },
  radioButtonInner: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#fff",
  },
  form: {
    gap: 16,
  },
  inputGroup: {
    position: "relative",
  },
  label: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 8,
  },
  input: {
    backgroundColor: "rgba(255,255,255,0.1)",
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 14,
    color: "#fff",
    fontSize: 16,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.2)",
  },
  operatorButtons: {
    flexDirection: "row",
    gap: 8,
  },
  operatorButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(66, 165, 245, 0.1)",
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderWidth: 1,
    borderColor: "rgba(66, 165, 245, 0.3)",
  },
  operatorButtonSelected: {
    backgroundColor: PRO_BLUE,
    borderColor: PRO_BLUE,
  },
  operatorButtonText: {
    color: PRO_BLUE,
    fontSize: 12,
    fontWeight: "600",
    marginLeft: 4,
    textAlign: "center",
  },
  operatorButtonTextSelected: {
    color: "#00182A",
    fontWeight: "700",
  },
  amountInput: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(66, 165, 245, 0.1)",
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: "rgba(66, 165, 245, 0.3)",
  },
  currencySymbol: {
    color: PRO_BLUE,
    fontSize: 18,
    fontWeight: "700",
    marginRight: 4,
  },
  amountValue: {
    color: PRO_BLUE,
    fontSize: 18,
    fontWeight: "700",
  },
  helperText: {
    color: "rgba(255,255,255,0.5)",
    fontSize: 12,
    marginTop: 4,
    fontStyle: "italic",
  },
  infoBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(66, 165, 245, 0.1)",
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: "rgba(66, 165, 245, 0.3)",
  },
  infoText: {
    color: PRO_BLUE,
    fontSize: 12,
    fontWeight: "500",
    marginLeft: 8,
    flex: 1,
  },
  cardRedirectInfo: {
    alignItems: "center",
    backgroundColor: "rgba(30, 42, 59, 0.9)",
    borderRadius: 16,
    padding: 24,
    marginVertical: 16,
  },
  cardRedirectTitle: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "700",
    textAlign: "center",
    marginTop: 16,
    marginBottom: 8,
  },
  cardRedirectDescription: {
    color: "rgba(255,255,255,0.7)",
    fontSize: 14,
    textAlign: "center",
    lineHeight: 20,
    marginBottom: 20,
  },
  supportedCards: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 16,
    marginTop: 8,
  },
  securitySection: {
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  securityInfo: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(76, 175, 80, 0.1)",
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: "rgba(76, 175, 80, 0.3)",
  },
  securityText: {
    color: "rgba(255,255,255,0.8)",
    fontSize: 12,
    marginLeft: 8,
    flex: 1,
  },
  ctaSection: {
    paddingHorizontal: 20,
    alignItems: "center",
  },
  paymentButton: {
    backgroundColor: PRO_BLUE,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 18,
    paddingHorizontal: 24,
    borderRadius: 12,
    width: "100%",
    marginBottom: 12,
    shadowColor: PRO_BLUE,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
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
  loadingContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  cancelButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
  },
  cancelButtonText: {
    color: "rgba(255,255,255,0.6)",
    fontSize: 16,
    fontWeight: "500",
  },
});
