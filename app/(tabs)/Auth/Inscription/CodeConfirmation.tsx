



import React, { useState } from 'react';
import { 
  View, 
  Text, 
  TextInput, 
  TouchableOpacity, 
  StyleSheet, 
  Vibration,
  ActivityIndicator,
  Alert
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import axios from 'axios';
import { saveToken } from '../authService';
import AsyncStorage from '@react-native-async-storage/async-storage';

const API_URL = 'https://shopnet-backend.onrender.com/api/auth';

export default function CodeConfirmation() {
  const router = useRouter();
  const params = useLocalSearchParams();

  const email = typeof params.email === 'string' ? params.email : '';
  const registrationId = typeof params.registrationId === 'string' ? params.registrationId : '';
  
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleVerifyCode = async () => {
    if (!/^\d{6}$/.test(code)) {
      setError('Le code doit contenir 6 chiffres');
      Vibration.vibrate(500);
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const response = await axios.post(`${API_URL}/verify-otp`, {
        userId: registrationId,
        otp: code
      });

      if (response.data.success && response.data.token) {
        // Sauvegarde du token et des infos utilisateur
        await Promise.all([
          saveToken(response.data.token),
          AsyncStorage.setItem('user', JSON.stringify(response.data.user))
        ]);

        console.log('[AUTH] Token saved, user data:', response.data.user);
        
        // Redirection vers le questionnaire
        router.replace('/(tabs)/Auth/Inscription/Questionaire');
      } else {
        throw new Error(response.data.message || 'Validation failed');
      }
    } catch (error: any) {
      console.error('[VERIFICATION ERROR]', error);
      setError(error.response?.data?.message || error.message || 'Erreur de validation');
      Vibration.vibrate(500);
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendCode = async () => {
    Alert.alert('Code renvoyé', 'Un nouveau code a été envoyé à votre email');
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Confirmation du Compte</Text>
      
      <Text style={styles.subtitle}>
        Entrez le code envoyé à {' '}
        <Text style={styles.highlight}>{email}</Text>
      </Text>

      <TextInput
        style={styles.input}
        placeholder="123456"
        placeholderTextColor="#BCCCDC"
        keyboardType="number-pad"
        maxLength={6}
        value={code}
        onChangeText={setCode}
        editable={!isLoading}
      />

      {error ? <Text style={styles.errorText}>{error}</Text> : null}

      <TouchableOpacity
        style={[styles.button, isLoading && styles.disabledButton]}
        onPress={handleVerifyCode}
        disabled={isLoading}
      >
        {isLoading ? (
          <ActivityIndicator color="#FFFFFF" />
        ) : (
          <Text style={styles.buttonText}>Valider</Text>
        )}
      </TouchableOpacity>

      <TouchableOpacity 
        style={styles.resendContainer} 
        onPress={handleResendCode}
        disabled={isLoading}
      >
        <Text style={styles.resendText}>Vous n'avez pas reçu de code ? </Text>
        <Text style={styles.resendLink}>Renvoyer</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#202A36',
    padding: 24,
    justifyContent: 'center',
  },
  title: {
    fontSize: 26,
    fontWeight: 'bold',
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 16,
  },
  subtitle: {
    fontSize: 16,
    color: '#BCCCDC',
    textAlign: 'center',
    marginBottom: 32,
  },
  highlight: {
    color: '#4CB050',
    fontWeight: '600',
  },
  input: {
    backgroundColor: '#3A526A',
    color: '#FFFFFF',
    borderRadius: 10,
    padding: 16,
    fontSize: 18,
    textAlign: 'center',
    marginBottom: 24,
  },
  errorText: {
    color: '#FF5252',
    textAlign: 'center',
    marginBottom: 16,
  },
  button: {
    backgroundColor: '#4CB050',
    borderRadius: 10,
    padding: 16,
    alignItems: 'center',
  },
  disabledButton: {
    opacity: 0.7,
  },
  buttonText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 16,
  },
  resendContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 24,
  },
  resendText: {
    color: '#BCCCDC',
  },
  resendLink: {
    color: '#4CB050',
    fontWeight: 'bold',
  },
});