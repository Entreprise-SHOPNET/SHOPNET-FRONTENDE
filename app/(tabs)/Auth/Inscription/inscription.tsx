// app/(tabs)/Auth/Inscription.tsx
// app/(tabs)/Auth/Inscription.tsx
// app/(tabs)/Auth/Inscription.tsx
import React, { useState, useRef, useEffect } from "react";
import {
  View,
  TextInput,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  Vibration,
  Linking,
  Switch,
  Animated,
  Pressable,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { FontAwesome } from "@expo/vector-icons";
import axios from "axios";
import { useRouter } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { saveToken } from "../authService";
import { registerForPushNotificationsAsync } from "../../../../services/notifications";

const API_URL = "https://shopnet-backend.onrender.com/api/auth";

export default function Inscription() {
  const router = useRouter();
  const [step, setStep] = useState(1);

  // Step 1
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  // Step 2
  const [companyName, setCompanyName] = useState("");
  const [address, setAddress] = useState("");

  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);

  // Animations
  const shakeAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const termsHighlightAnim = useRef(new Animated.Value(0)).current;

  const validatePhone = (phone: string) => /^\d{10,15}$/.test(phone);

  const validateStep1 = () => {
    if (!fullName.trim()) {
      setErrorMessage("Le nom complet est obligatoire");
      Vibration.vibrate(500);
      return false;
    }
    if (!validatePhone(phone)) {
      setErrorMessage("Numéro de téléphone invalide (10 à 15 chiffres)");
      Vibration.vibrate(500);
      return false;
    }
    if (password.length !== 6) {
      setErrorMessage("Le mot de passe doit contenir exactement 6 caractères");
      Vibration.vibrate(500);
      return false;
    }
    return true;
  };

  const nextStep = () => {
    setErrorMessage("");
    if (validateStep1()) setStep(2);
  };

  const prevStep = () => {
    setErrorMessage("");
    setStep(1);
  };

  const animateButtonShake = () => {
    Animated.sequence([
      Animated.timing(shakeAnim, { toValue: 10, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -10, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 5, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -5, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 0, duration: 50, useNativeDriver: true }),
    ]).start();

    Animated.sequence([
      Animated.timing(pulseAnim, { toValue: 1.1, duration: 100, useNativeDriver: true }),
      Animated.timing(pulseAnim, { toValue: 1, duration: 100, useNativeDriver: true }),
      Animated.timing(pulseAnim, { toValue: 1.05, duration: 100, useNativeDriver: true }),
      Animated.timing(pulseAnim, { toValue: 1, duration: 100, useNativeDriver: true }),
    ]).start();

    Animated.sequence([
      Animated.timing(termsHighlightAnim, { toValue: 1, duration: 200, useNativeDriver: false }),
      Animated.timing(termsHighlightAnim, { toValue: 0, duration: 200, useNativeDriver: false }),
      Animated.timing(termsHighlightAnim, { toValue: 1, duration: 200, useNativeDriver: false }),
      Animated.timing(termsHighlightAnim, { toValue: 0, duration: 200, useNativeDriver: false }),
    ]).start();

    Vibration.vibrate(300);
  };

  const handleRegister = async () => {
    setErrorMessage("");
    setSuccessMessage("");

    if (!termsAccepted) {
      setErrorMessage("Veuillez accepter les conditions d'utilisation");
      animateButtonShake();
      return;
    }

    setIsLoading(true);

    try {
      const response = await axios.post(`${API_URL}/register`, {
        fullName,
        email: null,
        phone,
        password,
        companyName: companyName.trim() || null,
        address: address.trim() || null,
      });

      if (!response.data.success) {
        setErrorMessage(response.data.message || "Erreur inconnue");
        Vibration.vibrate(500);
        return;
      }

      const userId = response.data.userId?.toString();
      const user = response.data.user || null;
      const authToken = response.data.token || null;

      if (user) await AsyncStorage.setItem("user", JSON.stringify(user));
      if (authToken) await saveToken(authToken);

      if (userId) {
        console.log("⚡️ Demande permission notifications pour userId:", userId);
        await registerForPushNotificationsAsync(userId);
      }

      router.push({
        pathname: "/Auth/Inscription/CodeConfirmation",
        params: {
          email: "",
          phone,
          registrationId: userId,
          otp: response.data.otp,
        },
      });

      setSuccessMessage("Compte créé avec succès !");
    } catch (err: any) {
      setErrorMessage(
        err.response?.data?.message ||
          err.message ||
          "Erreur lors de l'inscription",
      );
      Vibration.vibrate(500);
    } finally {
      setIsLoading(false);
    }
  };

  const registerButtonColor = termsAccepted ? "#00c2ff" : "#5a8bb3";
  const termsBackgroundColor = termsHighlightAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ["transparent", "rgba(0, 194, 255, 0.2)"],
  });

  const toggleTerms = () => setTermsAccepted(!termsAccepted);

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 20}
    >
      <ScrollView
        contentContainerStyle={styles.container}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Titre et sous-titre alignés à gauche */}
        <Text style={styles.title}>Créer un compte</Text>
        <Text style={styles.subtitle}>
          Rejoignez SHOPNET et commencez à vendre et gagner de l'argent
        </Text>

        {step === 1 && (
          <>
            <TextInput
              style={styles.input}
              placeholder="Nom complet"
              placeholderTextColor="#b0c4de"
              value={fullName}
              onChangeText={setFullName}
            />
            <TextInput
              style={styles.input}
              placeholder="Numéro de téléphone"
              placeholderTextColor="#b0c4de"
              value={phone}
              keyboardType="phone-pad"
              onChangeText={setPhone}
            />
            <View style={styles.passwordContainer}>
              <TextInput
                style={styles.passwordInput}
                placeholder="Mot de passe (6 caractères)"
                placeholderTextColor="#b0c4de"
                secureTextEntry={!showPassword}
                value={password}
                onChangeText={setPassword}
                maxLength={6}
              />
              <TouchableOpacity
                onPress={() => setShowPassword(!showPassword)}
                style={styles.eyeIcon}
              >
                <FontAwesome
                  name={showPassword ? "eye-slash" : "eye"}
                  size={22}
                  color="#b0c4de"
                />
              </TouchableOpacity>
            </View>

            <TouchableOpacity style={styles.button} onPress={nextStep}>
              <Text style={styles.buttonText}>Suivant</Text>
            </TouchableOpacity>
          </>
        )}

        {step === 2 && (
          <>
            <TextInput
              style={styles.input}
              placeholder="Nom d’activité (ex: Boutique, Restaurant)"
              placeholderTextColor="#b0c4de"
              value={companyName}
              onChangeText={setCompanyName}
            />
            <TextInput
              style={styles.input}
              placeholder="Ville (ex: Kinshasa)"
              placeholderTextColor="#b0c4de"
              value={address}
              onChangeText={setAddress}
            />

            <Animated.View
              style={[
                styles.termsContainer,
                { backgroundColor: termsBackgroundColor },
              ]}
            >
              <Switch
                value={termsAccepted}
                onValueChange={setTermsAccepted}
                thumbColor={termsAccepted ? "#00c2ff" : "#b0c4de"}
                trackColor={{ false: "#3A526A", true: "#00c2ff" }}
              />
              <TouchableOpacity onPress={toggleTerms} activeOpacity={0.7}>
                <Text style={styles.termsText}>
                  En utilisant SHOPNET, vous acceptez les{" "}
                  <Text
                    style={styles.linkText}
                    onPress={() =>
                      Linking.openURL(
                        "https://entreprise-shopnet.github.io/SHOPNET-CONDITION/"
                      )
                    }
                  >
                    conditions d'utilisation
                  </Text>
                  .
                </Text>
              </TouchableOpacity>
            </Animated.View>

            <View style={styles.buttonRow}>
              <TouchableOpacity
                style={[styles.button, styles.buttonSecondary]}
                onPress={prevStep}
              >
                <Text style={styles.buttonText}>Précédent</Text>
              </TouchableOpacity>

              <Animated.View
                style={[
                  { flex: 1, marginLeft: 10, transform: [{ translateX: shakeAnim }] },
                ]}
              >
                <Pressable
                  style={({ pressed }) => [
                    styles.buttonRegister,
                    { backgroundColor: registerButtonColor },
                    pressed && styles.buttonRegisterPressed,
                  ]}
                  onPress={handleRegister}
                  disabled={isLoading}
                  android_ripple={{ color: "rgba(255,255,255,0.3)" }}
                >
                  {({ pressed }) => (
                    <Animated.View
                      style={[
                        styles.registerInner,
                        {
                          transform: [{ scale: pressed ? 0.97 : pulseAnim }],
                        },
                      ]}
                    >
                      {isLoading ? (
                        <ActivityIndicator color="#FFFFFF" />
                      ) : (
                        <Text style={styles.buttonText}>S'inscrire</Text>
                      )}
                    </Animated.View>
                  )}
                </Pressable>
              </Animated.View>
            </View>
          </>
        )}

        {errorMessage ? (
          <Text style={styles.errorText}>{errorMessage}</Text>
        ) : null}
        {successMessage ? (
          <Text style={styles.successText}>{successMessage}</Text>
        ) : null}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#1f3b57",
    padding: 20,
    paddingBottom: 40,
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#FFFFFF",
    marginBottom: 8,
    textAlign: "left",       // aligné à gauche
    alignSelf: "flex-start", // pour rester à gauche dans le conteneur centré
  },
  subtitle: {
    fontSize: 14,
    color: "#cbd5e1",
    textAlign: "left",       // aligné à gauche
    alignSelf: "flex-start", // pour rester à gauche
    marginBottom: 30,
    paddingHorizontal: 0,    // plus de padding horizontal pour ne pas créer de décalage
  },
  input: {
    width: "100%",
    padding: 15,
    marginBottom: 15,
    borderRadius: 16,
    fontSize: 16,
    backgroundColor: "#2a4a6e",
    color: "#FFFFFF",
  },
  passwordContainer: {
    flexDirection: "row",
    backgroundColor: "#2a4a6e",
    borderRadius: 16,
    alignItems: "center",
    paddingRight: 10,
    marginBottom: 15,
    width: "100%",
  },
  passwordInput: {
    flex: 1,
    padding: 15,
    fontSize: 16,
    color: "#FFFFFF",
  },
  eyeIcon: {
    paddingHorizontal: 5,
  },
  button: {
    backgroundColor: "#2a4a6e",
    padding: 14,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 55,
    width: "100%",
  },
  buttonSecondary: {
    backgroundColor: "transparent",
    borderWidth: 2,
    borderColor: "#00c2ff",
    marginRight: 10,
    flex: 1,
  },
  buttonRegister: {
    borderRadius: 16,
    overflow: "hidden",
    flex: 1,
  },
  buttonRegisterPressed: {
    backgroundColor: "#0099cc",
  },
  registerInner: {
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 55,
  },
  buttonText: {
    fontSize: 16,
    color: "#FFFFFF",
    fontWeight: "bold",
  },
  buttonRow: {
    flexDirection: "row",
    width: "100%",
    marginTop: 10,
    alignItems: "center",
  },
  termsContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 15,
    padding: 8,
    borderRadius: 16,
  },
  termsText: {
    color: "#cbd5e1",
    fontSize: 14,
    marginLeft: 10,
    flexWrap: "wrap",
  },
  linkText: {
    color: "#00c2ff",
    textDecorationLine: "underline",
    fontWeight: "bold",
  },
  errorText: {
    color: "#ff6b6b",
    fontSize: 16,
    marginTop: 10,
  },
  successText: {
    color: "#00c2ff",
    fontSize: 16,
    marginTop: 10,
  },
});