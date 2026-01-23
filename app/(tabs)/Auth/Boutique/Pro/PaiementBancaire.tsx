


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

export default function PaiementBancairePro() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  
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
      if (!cardNumber || !expiryDate || !cvv || !cardholderName) {
        Alert.alert("Erreur", "Veuillez remplir tous les champs de la carte");
        setLoading(false);
        return;
      }
      
      const cleanCardNumber = cardNumber.replace(/\s/g, '');
      if (cleanCardNumber.length !== 16) {
        Alert.alert("Erreur", "Le numéro de carte doit contenir 16 chiffres");
        setLoading(false);
        return;
      }

      // Validation de la date d'expiration
      if (!expiryDate.match(/^\d{2}\/\d{2}$/)) {
        Alert.alert("Erreur", "La date d'expiration doit être au format MM/AA");
        setLoading(false);
        return;
      }

      // Validation du CVV
      if (!cvv.match(/^\d{3}$/)) {
        Alert.alert("Erreur", "Le CVV doit contenir 3 chiffres");
        setLoading(false);
        return;
      }

      // Validation du nom du titulaire
      if (cardholderName.trim().length < 2) {
        Alert.alert("Erreur", "Veuillez entrer le nom complet du titulaire");
        setLoading(false);
        return;
      }

      // Préparer les données pour l'API
      const paymentData = {
        method: "card",
        cardNumber: cleanCardNumber,
        expiryDate: expiryDate,
        cvv: cvv,
        cardholderName: cardholderName.trim(),
        amount: 24.99,
        currency: "USD",
        plan: "pro"
      };

      // Simulation de traitement de paiement
      await processCardPayment(paymentData);

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

  // Fonction simulée pour le paiement par carte
  const processCardPayment = async (paymentData: any) => {
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        // Simulation de succès - Dans la réalité, vous appelleriez votre API ici
        console.log("Paiement carte Pro envoyé:", {
          ...paymentData,
          cardNumber: "**** **** **** " + paymentData.cardNumber.slice(-4) // Masquer le numéro pour la sécurité
        });
        
        resolve({ 
          success: true, 
          transactionId: "PRO_CARD_TX_" + Date.now(),
          status: "completed",
          message: "Paiement carte Pro traité avec succès"
        });
      }, 2000);
    });
  };

  const formatCardNumber = (text: string) => {
    const cleaned = text.replace(/\s/g, '').replace(/\D/g, '');
    const formatted = cleaned.replace(/(.{4})/g, '$1 ').trim();
    return formatted.substring(0, 19);
  };

  const formatExpiryDate = (text: string) => {
    const cleaned = text.replace(/\D/g, '');
    if (cleaned.length >= 3) {
      return cleaned.substring(0, 2) + '/' + cleaned.substring(2, 4);
    }
    return cleaned;
  };

  const handleExpiryDateChange = (text: string) => {
    const formatted = formatExpiryDate(text);
    setExpiryDate(formatted);
  };

  const handleCvvChange = (text: string) => {
    // N'autoriser que les chiffres et limiter à 3
    const cleaned = text.replace(/\D/g, '').substring(0, 3);
    setCvv(cleaned);
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={SHOPNET_BLUE} />
      
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
        <Text style={styles.headerTitle}>Paiement Carte Bancaire</Text>
        <View style={styles.amountContainer}>
          <Text style={styles.amountLabel}>Montant à payer</Text>
          <Text style={styles.amount}>$24.99</Text>
        </View>
        <Text style={styles.headerSubtitle}>
          Saisissez vos informations de carte en toute sécurité
        </Text>
      </Animated.View>

      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Formulaire Carte Bancaire */}
        <Animated.View 
          style={[
            styles.section,
            { 
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }]
            }
          ]}
        >
          <View style={styles.form}>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Titulaire de la carte</Text>
              <TextInput
                style={styles.input}
                placeholder="Nom comme sur la carte"
                placeholderTextColor="rgba(255,255,255,0.4)"
                value={cardholderName}
                onChangeText={setCardholderName}
                autoCapitalize="words"
                returnKeyType="next"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Numéro de carte</Text>
              <TextInput
                style={styles.input}
                placeholder="1234 5678 9012 3456"
                placeholderTextColor="rgba(255,255,255,0.4)"
                value={cardNumber}
                onChangeText={(text) => setCardNumber(formatCardNumber(text))}
                keyboardType="numeric"
                maxLength={19}
                returnKeyType="next"
              />
              <View style={styles.cardIcons}>
                <FontAwesome name="cc-visa" size={24} color="rgba(255,255,255,0.6)" />
                <FontAwesome name="cc-mastercard" size={24} color="rgba(255,255,255,0.6)" />
              </View>
            </View>

            <View style={styles.row}>
              <View style={[styles.inputGroup, { flex: 1, marginRight: 12 }]}>
                <Text style={styles.label}>Date d'expiration</Text>
                <TextInput
                  style={styles.input}
                  placeholder="MM/AA"
                  placeholderTextColor="rgba(255,255,255,0.4)"
                  value={expiryDate}
                  onChangeText={handleExpiryDateChange}
                  keyboardType="numeric"
                  maxLength={5}
                  returnKeyType="next"
                />
              </View>

              <View style={[styles.inputGroup, { flex: 1 }]}>
                <Text style={styles.label}>CVV</Text>
                <TextInput
                  style={styles.input}
                  placeholder="123"
                  placeholderTextColor="rgba(255,255,255,0.4)"
                  value={cvv}
                  onChangeText={handleCvvChange}
                  keyboardType="numeric"
                  maxLength={3}
                  secureTextEntry
                />
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Montant</Text>
              <View style={styles.amountInput}>
                <Text style={styles.currencySymbol}>$</Text>
                <Text style={styles.amountValue}>24.99</Text>
              </View>
            </View>

            {/* Informations de sécurité */}
            <View style={styles.securityNote}>
              <MaterialIcons name="info" size={16} color={PRO_BLUE} />
              <Text style={styles.securityNoteText}>
                Vos informations de carte sont cryptées et sécurisées
              </Text>
            </View>
          </View>
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
                  Payer $24.99 - Activer Pro
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
  row: {
    flexDirection: "row",
  },
  cardIcons: {
    position: "absolute",
    right: 16,
    top: 40,
    flexDirection: "row",
    gap: 8,
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
  securityNote: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(66, 165, 245, 0.1)",
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: "rgba(66, 165, 245, 0.3)",
  },
  securityNoteText: {
    color: PRO_BLUE,
    fontSize: 12,
    fontWeight: "500",
    marginLeft: 8,
    flex: 1,
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
