

// app/(tabs)/Auth/Inscription/ResetPassword.tsx

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
import { FontAwesome } from "@expo/vector-icons";
import { useRouter, useLocalSearchParams } from "expo-router";
import axios from "axios";

// 🔴 Serveur Render (production)
const API_URL = "https://shopnet-backend.onrender.com/api/auth";

// 🟢 Serveur local
// const API_URL = "http://100.64.134.89:5000/api/auth";

export default function ResetPassword() {
  const router = useRouter();
  const { token } = useLocalSearchParams();

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleResetPassword = async () => {
    setErrorMessage("");
    setSuccessMessage("");
    setIsLoading(true);

    if (!password || !confirmPassword) {
      setErrorMessage("Veuillez remplir tous les champs.");
      Vibration.vibrate(300);
      setIsLoading(false);
      return;
    }

    if (password.length < 6) {
      setErrorMessage("Le mot de passe doit contenir au moins 6 caractères.");
      Vibration.vibrate(300);
      setIsLoading(false);
      return;
    }

    if (password !== confirmPassword) {
      setErrorMessage("Les mots de passe ne correspondent pas.");
      Vibration.vibrate(300);
      setIsLoading(false);
      return;
    }

    try {
      const response = await axios.post(`${API_URL}/reset-password`, {
        token,
        newPassword: password,
      });

      if (!response.data.success) {
        setErrorMessage(response.data.message || "Erreur.");
        Vibration.vibrate(500);
        setIsLoading(false);
        return;
      }

      setSuccessMessage("Mot de passe changé avec succès !");

      setTimeout(() => {
        router.replace("/(tabs)/Auth/Inscription/Connexion");
      }, 1200);
    } catch (err: any) {
      setErrorMessage(
        err.response?.data?.message ||
          err.message ||
          "Erreur lors de la réinitialisation."
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
      <Text style={styles.title}>Nouveau mot de passe</Text>

      {/* Nouveau mot de passe */}
      <View style={styles.passwordContainer}>
        <TextInput
          style={styles.passwordInput}
          placeholder="Nouveau mot de passe"
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

      {/* Confirmer mot de passe */}
      <View style={styles.passwordContainer}>
        <TextInput
          style={styles.passwordInput}
          placeholder="Confirmer le mot de passe"
          placeholderTextColor="#BCCCDC"
          secureTextEntry={!showConfirmPassword}
          value={confirmPassword}
          onChangeText={setConfirmPassword}
        />

        <TouchableOpacity
          onPress={() => setShowConfirmPassword(!showConfirmPassword)}
          style={styles.eyeIcon}
        >
          <FontAwesome
            name={showConfirmPassword ? "eye-slash" : "eye"}
            size={22}
            color="#BCCCDC"
          />
        </TouchableOpacity>
      </View>

      {/* Bouton */}
      <TouchableOpacity
        style={styles.button}
        onPress={handleResetPassword}
        disabled={isLoading}
      >
        {isLoading ? (
          <ActivityIndicator color="#FFFFFF" />
        ) : (
          <Text style={styles.buttonText}>Changer le mot de passe</Text>
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