

// app/(tabs)/Auth/Inscription/MotsPasseOublier.tsx
import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Vibration,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { useRouter } from "expo-router";
import axios from "axios";

// URL API

// 🔴 Serveur Render (production)
 const API_URL = "https://shopnet-backend.onrender.com/api/auth";

// 🟢 Serveur local via Tailscale (développement)
//const API_URL = "http://100.64.134.89:5000/api/auth";



export default function MotsPasseOublier() {
  const router = useRouter();

  const [identifier, setIdentifier] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  // validation email ou téléphone
  const validateIdentifier = (input: string) => {
    const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input);
    const isPhone = /^\d{9,15}$/.test(input);
    return isEmail || isPhone;
  };

  const handleForgotPassword = async () => {
    setErrorMessage("");
    setSuccessMessage("");
    setIsLoading(true);

    if (!identifier) {
      setErrorMessage("Veuillez entrer votre email ou téléphone.");
      Vibration.vibrate(300);
      setIsLoading(false);
      return;
    }

    if (!validateIdentifier(identifier)) {
      setErrorMessage("Email ou numéro de téléphone");
      Vibration.vibrate(300);
      setIsLoading(false);
      return;
    }

    try {
        const response = await axios.post(`${API_URL}/forgot-password`, {
          identifier: identifier,
        });
      const token = response.data.token;
      
      setSuccessMessage("Compte vérifié. Continuez.");

      setTimeout(() => {
        router.push({
          pathname: "/(tabs)/Auth/Inscription/ResetPassword",
          params: {
            token: token,
          },
        });
      }, 700);
    } catch (err: any) {
      setErrorMessage(
        err.response?.data?.message ||
          err.message ||
          "Erreur lors de la vérification."
      );
      Vibration.vibrate(500);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.select({ ios: "padding", android: undefined })}
    >
      <Text style={styles.title}>Mot de passe oublié</Text>

      <TextInput
        style={styles.input}
        placeholder="Email ou numéro de téléphone"
        placeholderTextColor="#BCCCDC"
        value={identifier}
        onChangeText={setIdentifier}
        autoCapitalize="none"
      />

      <TouchableOpacity
        style={styles.button}
        onPress={handleForgotPassword}
        disabled={isLoading}
      >
        {isLoading ? (
          <ActivityIndicator color="#FFFFFF" />
        ) : (
          <Text style={styles.buttonText}>Suivant</Text>
        )}
      </TouchableOpacity>

      {errorMessage ? (
        <Text style={styles.errorText}>{errorMessage}</Text>
      ) : null}

      {successMessage ? (
        <Text style={styles.successText}>{successMessage}</Text>
      ) : null}
    </KeyboardAvoidingView>
  );
}

// styles identiques à Connexion
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#202A36",
    paddingHorizontal: 20,
    justifyContent: "center",
  },
  title: {
    fontSize: 26,
    fontWeight: "bold",
    color: "#FFFFFF",
    marginBottom: 25,
    textAlign: "center",
  },
  input: {
    backgroundColor: "#3A526A",
    color: "#FFFFFF",
    padding: 15,
    borderRadius: 10,
    marginBottom: 15,
    fontSize: 16,
  },
  button: {
    backgroundColor: "#4CB050",
    paddingVertical: 15,
    borderRadius: 10,
    alignItems: "center",
    marginTop: 5,
  },
  buttonText: {
    fontSize: 16,
    color: "#FFFFFF",
    fontWeight: "bold",
  },
  errorText: {
    color: "red",
    textAlign: "center",
    marginTop: 10,
    fontSize: 15,
  },
  successText: {
    color: "#4CB050",
    textAlign: "center",
    marginTop: 10,
    fontSize: 15,
  },
});