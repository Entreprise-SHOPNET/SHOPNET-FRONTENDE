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
  const [email, setEmail] = useState("");

  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);

  // Animations
  const shakeAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const termsHighlightAnim = useRef(new Animated.Value(0)).current;

  const validateEmail = (email: string) => {
    if (email === "") return true;
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.toLowerCase());
  };

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

    if (email.trim() !== "" && !validateEmail(email)) {
      setErrorMessage("Email invalide");
      Vibration.vibrate(500);
      return;
    }

    setIsLoading(true);

    try {
      const response = await axios.post(`${API_URL}/register`, {
        fullName,
        email: email.trim() || null,
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
          email: email.trim() || "",
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

  const registerButtonColor = termsAccepted ? "#00C851" : "#6FBF6F";
  const termsBackgroundColor = termsHighlightAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ["transparent", "rgba(76, 175, 80, 0.3)"],
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
        <Text style={styles.title}>Inscription • SHOPNet</Text>

        {step === 1 && (
          <>
            <TextInput
              style={styles.input}
              placeholder="Nom complet *"
              placeholderTextColor="#BCCCDC"
              value={fullName}
              onChangeText={setFullName}
            />
            <TextInput
              style={styles.input}
              placeholder="Numéro de téléphone *"
              placeholderTextColor="#BCCCDC"
              value={phone}
              keyboardType="phone-pad"
              onChangeText={setPhone}
            />
            <View style={styles.passwordContainer}>
              <TextInput
                style={styles.passwordInput}
                placeholder="Mot de passe * (6 caractères)"
                placeholderTextColor="#BCCCDC"
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
                  color="#BCCCDC"
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
              placeholder="Nom d’activité   (facultatif)"
              placeholderTextColor="#BCCCDC"
              value={companyName}
              onChangeText={setCompanyName}
            />
            <TextInput
              style={styles.input}
              placeholder="Adresse (facultatif)"
              placeholderTextColor="#BCCCDC"
              value={address}
              onChangeText={setAddress}
            />
            <TextInput
              style={styles.input}
              placeholder="Email (non obligatoire)"
              placeholderTextColor="#BCCCDC"
              value={email}
              keyboardType="email-address"
              autoCapitalize="none"
              onChangeText={setEmail}
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
                thumbColor={termsAccepted ? "#00C851" : "#BCCCDC"}
                trackColor={{ false: "#3A526A", true: "#34c759" }}
              />
              <TouchableOpacity onPress={toggleTerms} activeOpacity={0.7}>
                <Text style={styles.termsTextGreen}>
                  En utilisant SHOPNET, vous acceptez les{" "}
                  <Text
                    style={styles.linkTextGreen}
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
    backgroundColor: "#2B3E4F",
    padding: 20,
    paddingBottom: 40,
  },
  title: {
    fontSize: 26,
    fontWeight: "bold",
    color: "#FFFFFF",
    marginBottom: 20,
  },
  input: {
    width: "100%",
    padding: 15,
    marginBottom: 15,
    borderRadius: 10,
    fontSize: 16,
    backgroundColor: "#3A526A",
    color: "#FFFFFF",
  },
  passwordContainer: {
    flexDirection: "row",
    backgroundColor: "#3A526A",
    borderRadius: 10,
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
    backgroundColor: "#4F657C",
    padding: 15,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 55,
  },
  buttonSecondary: {
    backgroundColor: "#35526A",
    flex: 1,
    marginRight: 10,
  },
  buttonRegister: {
    borderRadius: 10,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 5,
  },
  buttonRegisterPressed: {
    backgroundColor: "#00A844",
  },
  registerInner: {
    paddingVertical: 15,
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
    borderRadius: 8,
  },
  termsTextGreen: {
    color: "#4CAF50",
    fontSize: 14,
    marginLeft: 10,
    flexWrap: "wrap",
  },
  linkTextGreen: {
    color: "#4CAF50",
    textDecorationLine: "underline",
    fontWeight: "bold",
  },
  errorText: {
    color: "red",
    fontSize: 16,
    marginTop: 10,
  },
  successText: {
    color: "limegreen",
    fontSize: 16,
    marginTop: 10,
  },
});