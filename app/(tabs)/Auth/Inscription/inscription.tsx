


import React, { useState } from 'react';
import {
  View,
  TextInput,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  Vibration,
} from 'react-native';
import axios from 'axios';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { saveToken } from '../authService'; // 🆕 Import du token service

import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';



// const EXPO_TOKEN_URL = 'http://100.64.134.89:5000/api/save-expo-token'; // Serveur LOCAL (commenté)
const EXPO_TOKEN_URL = 'https://shopnet-backend.onrender.com/api/save-expo-token'; // Serveur Render (production)



async function registerExpoToken(userId: string) {
  try {
    if (!Device.isDevice) return;

    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') return;

    const expoToken = (await Notifications.getExpoPushTokenAsync({
      projectId: Constants.expoConfig?.extra?.eas?.projectId || Constants.easConfig?.projectId,
    })).data;

    await fetch(EXPO_TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, expoPushToken: expoToken }),
    });

    console.log(`✅ Token Expo envoyé pour l’utilisateur ${userId}`);
  } catch (err) {
    console.error('❌ Erreur lors de l’envoi du token Expo:', err);
  }
}



// const API_URL = 'http://100.64.134.89:5000/api/auth'; // Serveur LOCAL (commenté)
const API_URL = 'https://shopnet-backend.onrender.com/api/auth'; // Serveur Render (production)




export default function Inscription() {
  const router = useRouter();
  const [step, setStep] = useState(1);

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [nif, setNif] = useState('');
  const [address, setAddress] = useState('');

  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const validateEmail = (email: string) => {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email.toLowerCase());
  };

  const validatePhone = (phone: string) => {
    const re = /^\d{10,15}$/;
    return re.test(phone);
  };

  const validateStep1 = () => {
    if (!fullName.trim()) {
      setErrorMessage('Le nom complet est obligatoire');
      Vibration.vibrate(500);
      return false;
    }
    if (!validateEmail(email)) {
      setErrorMessage('Email invalide');
      Vibration.vibrate(500);
      return false;
    }
    if (!validatePhone(phone)) {
      setErrorMessage('Numéro de téléphone invalide (10 à 15 chiffres)');
      Vibration.vibrate(500);
      return false;
    }
    if (password.length < 6) {
      setErrorMessage('Le mot de passe doit contenir au moins 6 caractères');
      Vibration.vibrate(500);
      return false;
    }
    return true;
  };

  const nextStep = () => {
    setErrorMessage('');
    if (validateStep1()) {
      setStep(2);
    }
  };

  const prevStep = () => {
    setErrorMessage('');
    setStep(1);
  };
const handleRegister = async () => {
  setErrorMessage('');
  setSuccessMessage('');
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

    if (response.data.success) {
      const registrationId = response.data.userId.toString();

      // Stockage user/token local
      const user = response.data.user || null;
      const token = response.data.token || null;
      if (user) await AsyncStorage.setItem('user', JSON.stringify(user));
      if (token) await saveToken(token);

      // ✅ Envoyer le token Expo automatiquement
      await registerExpoToken(registrationId);

      // Redirection vers CodeConfirmation
      router.push({
        pathname: '/Auth/Inscription/CodeConfirmation',
        params: {
          email,
          phone,
          registrationId,
          otp: response.data.otp,
        },
      });

      setSuccessMessage('Compte créé avec succès!');
    } else {
      setErrorMessage(response.data.message || 'Erreur inconnue');
      Vibration.vibrate(500);
    }
  } catch (error: any) {
    setErrorMessage(
      error.response?.data?.message ||
      error.message ||
      'Erreur lors de l\'inscription'
    );
    Vibration.vibrate(500);
  } finally {
    setIsLoading(false);
  }
};

// ---------------------------
// Fonction pour envoyer le token Expo au serveur
const registerExpoToken = async (userId: string) => {
  try {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') return;

    const expoToken = (await Notifications.getExpoPushTokenAsync({
      projectId: Constants.expoConfig?.extra?.eas?.projectId || Constants.easConfig?.projectId,
    })).data;

    if (expoToken) {
      // await axios.post('http://100.64.134.89:5000/api/save-expo-token', { // Serveur LOCAL (commenté)
      await axios.post('https://shopnet-backend.onrender.com/api/save-expo-token', { // Serveur Render (production)
        userId,
        expoPushToken: expoToken,
      });

      console.log('✅ Expo Token enregistré pour l’utilisateur', userId);
    }
  } catch (err) {
    console.error('❌ Erreur en envoyant le token Expo:', err);
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
              onPress={prevStep}>
              <Text style={styles.buttonText}>Précédent</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.button, { flex: 1, marginLeft: 10 }]}
              onPress={handleRegister}
              disabled={isLoading}>
              {isLoading ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.buttonText}>S'inscrire</Text>
              )}
            </TouchableOpacity>
          </View>
        </>
      )}

      {errorMessage ? <Text style={styles.errorText}>{errorMessage}</Text> : null}
      {successMessage ? <Text style={styles.successText}>{successMessage}</Text> : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#2B3E4F',
    padding: 20,
  },
  title: {
    fontSize: 26,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 20,
  },
  input: {
    width: '100%',
    padding: 15,
    marginBottom: 15,
    borderRadius: 10,
    fontSize: 16,
    backgroundColor: '#3A526A',
    color: '#FFFFFF',
  },
  button: {
    backgroundColor: '#4F657C',
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
  },
  buttonSecondary: {
    backgroundColor: '#35526A',
    flex: 1,
    marginRight: 10,
  },
  buttonText: {
    fontSize: 16,
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
  buttonRow: {
    flexDirection: 'row',
    width: '100%',
    marginTop: 10,
  },
  errorText: {
    color: 'red',
    fontSize: 16,
    marginTop: 10,
  },
  successText: {
    color: 'limegreen',
    fontSize: 16,
    marginTop: 10,
  },
});
