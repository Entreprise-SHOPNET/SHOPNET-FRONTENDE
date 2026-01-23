// app/(tabs)/Auth/Inscription.tsx
/// app/(tabs)/Auth/Inscription.tsx
// app/(tabs)/Auth/Inscription.tsx
import React, { useState } from "react";
import {
  View,
  TextInput,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  Vibration,
} from "react-native";
import axios from "axios";
import { useRouter } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { saveToken } from "../authService";

// ⚡️ Import notifications
import { registerForPushNotificationsAsync } from "../../../../services/notifications";

// URL API
const API_URL = "https://shopnet-backend.onrender.com/api/auth";

export default function Inscription() {
  const router = useRouter();
  const [step, setStep] = useState(1);

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [nif, setNif] = useState("");
  const [address, setAddress] = useState("");

  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const validateEmail = (email: string) =>
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.toLowerCase());

  const validatePhone = (phone: string) => /^\d{10,15}$/.test(phone);

  const validateStep1 = () => {
    if (!fullName.trim()) {
      setErrorMessage("Le nom complet est obligatoire");
      Vibration.vibrate(500);
      return false;
    }
    if (!validateEmail(email)) {
      setErrorMessage("Email invalide");
      Vibration.vibrate(500);
      return false;
    }
    if (!validatePhone(phone)) {
      setErrorMessage("Numéro de téléphone invalide (10 à 15 chiffres)");
      Vibration.vibrate(500);
      return false;
    }
    if (password.length < 6) {
      setErrorMessage("Le mot de passe doit contenir au moins 6 caractères");
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

  const handleRegister = async () => {
    setErrorMessage("");
    setSuccessMessage("");
    setIsLoading(true);

    try {
      const response = await axios.post(`${API_URL}/register`, {
        fullName,
        email,
        phone,
        password,
        companyName: companyName.trim() || null,
        nif: nif.trim() || null,
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

      if (user) {
        await AsyncStorage.setItem("user", JSON.stringify(user));
      }
      if (authToken) {
        await saveToken(authToken);
      }

      // 🔔 Demande permission notifications après inscription
      if (userId) {
        console.log("⚡️ Demande permission notifications pour userId:", userId);
        await registerForPushNotificationsAsync(userId);
      }

      router.push({
        pathname: "/Auth/Inscription/CodeConfirmation",
        params: {
          email,
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

  return (
    <ScrollView contentContainerStyle={styles.container}>
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
            placeholder="Email *"
            placeholderTextColor="#BCCCDC"
            value={email}
            keyboardType="email-address"
            autoCapitalize="none"
            onChangeText={setEmail}
          />
          <TextInput
            style={styles.input}
            placeholder="Numéro de téléphone *"
            placeholderTextColor="#BCCCDC"
            value={phone}
            keyboardType="phone-pad"
            onChangeText={setPhone}
          />
          <TextInput
            style={styles.input}
            placeholder="Mot de passe *"
            placeholderTextColor="#BCCCDC"
            value={password}
            secureTextEntry
            onChangeText={setPassword}
          />
          <TouchableOpacity style={styles.button} onPress={nextStep}>
            <Text style={styles.buttonText}>Suivant</Text>
          </TouchableOpacity>
        </>
      )}

      {step === 2 && (
        <>
          <TextInput
            style={styles.input}
            placeholder="Nom de la société"
            placeholderTextColor="#BCCCDC"
            value={companyName}
            onChangeText={setCompanyName}
          />
          <TextInput
            style={styles.input}
            placeholder="NIF (optionnel)"
            placeholderTextColor="#BCCCDC"
            value={nif}
            onChangeText={setNif}
          />
          <TextInput
            style={styles.input}
            placeholder="Adresse"
            placeholderTextColor="#BCCCDC"
            value={address}
            onChangeText={setAddress}
          />

          <View style={styles.buttonRow}>
            <TouchableOpacity
              style={[styles.button, styles.buttonSecondary]}
              onPress={prevStep}
            >
              <Text style={styles.buttonText}>Précédent</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.button, { flex: 1, marginLeft: 10 }]}
              onPress={handleRegister}
              disabled={isLoading}
            >
              {isLoading ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.buttonText}>S'inscrire</Text>
              )}
            </TouchableOpacity>
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
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#2B3E4F",
    padding: 20,
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
  button: {
    backgroundColor: "#4F657C",
    padding: 15,
    borderRadius: 10,
    alignItems: "center",
  },
  buttonSecondary: {
    backgroundColor: "#35526A",
    flex: 1,
    marginRight: 10,
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
