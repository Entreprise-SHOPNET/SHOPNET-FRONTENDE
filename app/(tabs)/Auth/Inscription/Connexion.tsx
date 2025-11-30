


// app/(tabs)/Auth/connexion.tsx
import React, { useState } from 'react';
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
} from 'react-native';
import { FontAwesome } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { saveToken } from '../authService';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';

const API_URL = 'http://100.64.134.89:5000/api/auth';
const EXPO_TOKEN_URL = 'http://100.64.134.89:5000/api/save-expo-token';

// Fonction pour récupérer et envoyer le token Expo
const registerExpoToken = async (userId: string) => {
  try {
    if (!Device.isDevice) return;

    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') return;

    const expoPushToken = (await Notifications.getExpoPushTokenAsync()).data;

    await axios.post(EXPO_TOKEN_URL, {
      userId,
      expoPushToken,
    });

    console.log('✅ Token Expo envoyé avec succès:', expoPushToken);
  } catch (error) {
    console.error('❌ Erreur lors de l’envoi du token Expo:', error);
  }
};

export default function Connexion() {
  const router = useRouter();
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const validateIdentifier = (input: string) => {
    const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input);
    const isPhone = /^\d{9,15}$/.test(input);
    return isEmail || isPhone;
  };

  const handleLogin = async () => {
    setIsLoading(true);
    setErrorMessage('');
    setSuccessMessage('');

    if (!identifier || !password) {
      setErrorMessage("Veuillez remplir tous les champs.");
      Vibration.vibrate(300);
      setIsLoading(false);
      return;
    }

    if (!validateIdentifier(identifier)) {
      setErrorMessage('Email ou numéro de téléphone invalide.');
      Vibration.vibrate(300);
      setIsLoading(false);
      return;
    }

    try {
      const response = await axios.post(`${API_URL}/login`, {
        identifier,
        password,
      });

      if (response.data.success) {
        const token = response.data.token;
        const user = response.data.user;

        if (token && user) {
          await saveToken(token);
          await AsyncStorage.setItem('user', JSON.stringify(user));
          setSuccessMessage('Connexion réussie !');

          // Envoyer le token Expo pour notifications
          await registerExpoToken(user.id.toString());

          setTimeout(() => {
            router.push({
              pathname: '/(tabs)/Auth/Inscription/Chargement',
              params: {
                user: JSON.stringify(user),
                company: user.companyName,
                nif: user.nif,
              },
            });
          }, 1000);
        }
      }
    } catch (error: any) {
      const msg =
        error.response?.data?.message ||
        error.message ||
        'Erreur de connexion.';
      setErrorMessage(msg);
      Vibration.vibrate(500);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.select({ ios: 'padding', android: undefined })}
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
            name={showPassword ? 'eye-slash' : 'eye'}
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

      {errorMessage ? <Text style={styles.errorText}>{errorMessage}</Text> : null}
      {successMessage ? <Text style={styles.successText}>{successMessage}</Text> : null}

      <TouchableOpacity>
        <Text style={styles.forgotPasswordText}>Mot de passe oublié ?</Text>
      </TouchableOpacity>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#202A36',
    paddingHorizontal: 20,
    justifyContent: 'center',
  },
  title: {
    fontSize: 26,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 25,
    textAlign: 'center',
  },
  input: {
    backgroundColor: '#3A526A',
    color: '#FFFFFF',
    padding: 15,
    borderRadius: 10,
    marginBottom: 15,
    fontSize: 16,
  },
  passwordContainer: {
    flexDirection: 'row',
    backgroundColor: '#3A526A',
    borderRadius: 10,
    alignItems: 'center',
    paddingRight: 10,
    marginBottom: 15,
  },
  passwordInput: {
    flex: 1,
    padding: 15,
    fontSize: 16,
    color: '#FFFFFF',
  },
  eyeIcon: {
    paddingHorizontal: 5,
  },
  button: {
    backgroundColor: '#4CB050',
    paddingVertical: 15,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 5,
  },
  buttonText: {
    fontSize: 16,
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
  forgotPasswordText: {
    color: '#BCCCDC',
    fontSize: 16,
    textAlign: 'center',
    marginTop: 20,
    textDecorationLine: 'underline',
  },
  errorText: {
    color: 'red',
    textAlign: 'center',
    marginTop: 10,
    fontSize: 15,
  },
  successText: {
    color: '#4CB050',
    textAlign: 'center',
    marginTop: 10,
    fontSize: 15,
  },
});
