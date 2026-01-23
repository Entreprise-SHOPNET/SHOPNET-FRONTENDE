// app/(tabs)/Auth/Connexion.tsx
// app/(tabs)/Auth/Connexion.tsx
import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  Vibration,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { FontAwesome } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";
import { saveToken } from "../authService";

// ⚡️ Import notifications
import { registerForPushNotificationsAsync } from "../../../../services/notifications";

// URL API
const API_URL = "https://shopnet-backend.onrender.com/api/auth";

export default function Connexion() {
  const router = useRouter();

  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // -------------------
  // Validation
  const validateIdentifier = (input: string) => {
    const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input);
    const isPhone = /^\d{9,15}$/.test(input);
    return isEmail || isPhone;
  };

  // -------------------
  // LOGIN
  const handleLogin = async () => {
    setIsLoading(true);
    setErrorMessage("");
    setSuccessMessage("");

    if (!identifier || !password) {
      setErrorMessage("Veuillez remplir tous les champs.");
      Vibration.vibrate(300);
      setIsLoading(false);
      return;
    }

    if (!validateIdentifier(identifier)) {
      setErrorMessage("Email ou numéro de téléphone invalide.");
      Vibration.vibrate(300);
      setIsLoading(false);
      return;
    }

    try {
      const response = await axios.post(`${API_URL}/login`, {
        identifier,
        password,
      });

      if (!response.data?.success) {
        setErrorMessage(response.data?.message || "Erreur de connexion.");
        Vibration.vibrate(500);
        setIsLoading(false);
        return;
      }

      const user = response.data.user;
      const authToken = response.data.token;

      if (!user || !authToken) {
        setErrorMessage("Données utilisateur invalides.");
        setIsLoading(false);
        return;
      }

      // 🔐 Sauvegarde session
      await saveToken(authToken);
      await AsyncStorage.setItem("user", JSON.stringify(user));
      setSuccessMessage("Connexion réussie !");

      // 🔔 Demande permission notifications après connexion
      if (user.id) { // ou userId selon ton backend
        console.log("⚡️ Demande permission notifications pour userId:", user.id);
        await registerForPushNotificationsAsync(user.id);
      }

      // 🚀 Navigation
      setTimeout(() => {
        router.replace({
          pathname: "/(tabs)/Auth/Inscription/Chargement",
          params: {
            user: JSON.stringify(user),
            company: user.companyName,
            nif: user.nif,
          },
        });
      }, 600);
    } catch (err: any) {
      setErrorMessage(
        err.response?.data?.message || err.message || "Erreur de connexion.",
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
      <Text style={styles.title}>Connexion • SHOPNet</Text>

      <TextInput
        style={styles.input}
        placeholder="Email ou téléphone"
        placeholderTextColor="#BCCCDC"
        value={identifier}
        onChangeText={setIdentifier}
        keyboardType="email-address"
        autoCapitalize="none"
      />

      <View style={styles.passwordContainer}>
        <TextInput
          style={styles.passwordInput}
          placeholder="Mot de passe"
          placeholderTextColor="#BCCCDC"
          secureTextEntry={!showPassword}
          value={password}
          onChangeText={setPassword}
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

      <TouchableOpacity
        style={styles.button}
        onPress={handleLogin}
        disabled={isLoading}
      >
        {isLoading ? (
          <ActivityIndicator color="#FFFFFF" />
        ) : (
          <Text style={styles.buttonText}>Se connecter</Text>
        )}
      </TouchableOpacity>

      {errorMessage ? (
        <Text style={styles.errorText}>{errorMessage}</Text>
      ) : null}
      {successMessage ? (
        <Text style={styles.successText}>{successMessage}</Text>
      ) : null}

      <TouchableOpacity>
        <Text style={styles.forgotPasswordText}>Mot de passe oublié ?</Text>
      </TouchableOpacity>
    </KeyboardAvoidingView>
  );
}

// -------------------
// STYLES
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
  passwordContainer: {
    flexDirection: "row",
    backgroundColor: "#3A526A",
    borderRadius: 10,
    alignItems: "center",
    paddingRight: 10,
    marginBottom: 15,
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
  forgotPasswordText: {
    color: "#BCCCDC",
    fontSize: 16,
    textAlign: "center",
    marginTop: 20,
    textDecorationLine: "underline",
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
