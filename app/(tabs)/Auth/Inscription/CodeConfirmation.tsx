

import React, { useState, useEffect, useRef } from 'react';
import { 
  View, 
  Text, 
  TextInput, 
  TouchableOpacity, 
  StyleSheet, 
  Vibration,
  ActivityIndicator,
  Modal,
  Animated,
  Easing
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import axios from 'axios';
import { saveToken } from '../authService';
import AsyncStorage from '@react-native-async-storage/async-storage';


// const API_URL = 'http://100.64.134.89:5000/api/auth'; // Serveur LOCAL (commenté)
const API_URL = 'https://shopnet-backend.onrender.com/api/auth'; // Serveur Render (production)


export default function CodeConfirmation() {
  const router = useRouter();
  const params = useLocalSearchParams();

  const phone = typeof params.phone === 'string' ? params.phone : '';
  const registrationId = typeof params.registrationId === 'string' ? params.registrationId : '';
  const initialOtp = typeof params.otp === 'string' ? params.otp : '';

  const [code, setCode] = useState('');
  const [otp, setOtp] = useState(initialOtp); // OTP reçu du backend
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showOtpModal, setShowOtpModal] = useState(false);
  const scaleAnim = useRef(new Animated.Value(0)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  // Pré-remplir et lancer animation après 2,5 secondes
  useEffect(() => {
    if (otp) {
      const timer = setTimeout(() => {
        setCode(otp);
        setShowOtpModal(true);
        Animated.parallel([
          Animated.timing(scaleAnim, {
            toValue: 1,
            duration: 800,
            easing: Easing.out(Easing.back(1)),
            useNativeDriver: true,
          }),
          Animated.timing(opacityAnim, {
            toValue: 1,
            duration: 800,
            useNativeDriver: true,
          }),
        ]).start();
      }, 2500);
      return () => clearTimeout(timer);
    }
  }, [otp]);

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
        await saveToken(response.data.token);

        if (response.data.user) {
          await AsyncStorage.setItem('user', JSON.stringify(response.data.user));
        }

        router.replace('/(tabs)/Auth/Inscription/Questionaire');
      } else {
        throw new Error(response.data.message || 'Validation échouée');
      }
    } catch (error: any) {
      console.error('[VERIFICATION ERROR]', error);
      setError(error.response?.data?.message || error.message || 'Erreur de validation');
      Vibration.vibrate(500);
    } finally {
      setIsLoading(false);
    }
  };

  const handleShowOtp = () => {
    if (otp) {
      setShowOtpModal(true);
      scaleAnim.setValue(0);
      opacityAnim.setValue(0);
      Animated.parallel([
        Animated.timing(scaleAnim, {
          toValue: 1,
          duration: 800,
          easing: Easing.out(Easing.back(1)),
          useNativeDriver: true,
        }),
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      setError('OTP non disponible pour le moment');
      Vibration.vibrate(500);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Confirmation du Compte</Text>
      
      <Text style={styles.subtitle}>
        Entrez le code envoyé à <Text style={styles.highlight}>{phone}</Text>
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
        onPress={handleShowOtp}
        disabled={isLoading}
      >
        <Text style={styles.resendText}>Vous n'avez pas reçu de code ? </Text>
        <Text style={styles.resendLink}>Afficher le code</Text>
      </TouchableOpacity>

      {/* Modal avec animation */}
      <Modal
        visible={showOtpModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowOtpModal(false)}
      >
        <View style={styles.modalBackground}>
          <Animated.View style={[styles.modalContainer, {
            transform: [{ scale: scaleAnim }],
            opacity: opacityAnim
          }]}>
            <Text style={styles.modalTitle}>Votre code de Confirmation SHOPNET est :</Text>
            <Text style={styles.modalCode}>{otp}</Text>
            <TouchableOpacity
              style={styles.modalButton}
              onPress={() => setShowOtpModal(false)}
            >
              <Text style={styles.modalButtonText}>OK</Text>
            </TouchableOpacity>
          </Animated.View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#202A36', padding: 24, justifyContent: 'center' },
  title: { fontSize: 26, fontWeight: 'bold', color: '#FFFFFF', textAlign: 'center', marginBottom: 16 },
  subtitle: { fontSize: 16, color: '#BCCCDC', textAlign: 'center', marginBottom: 16 },
  highlight: { color: '#4CB050', fontWeight: '600' },
  input: { backgroundColor: '#3A526A', color: '#FFFFFF', borderRadius: 10, padding: 16, fontSize: 18, textAlign: 'center', marginBottom: 24 },
  errorText: { color: '#FF5252', textAlign: 'center', marginBottom: 16 },
  button: { backgroundColor: '#4CB050', borderRadius: 10, padding: 16, alignItems: 'center' },
  disabledButton: { opacity: 0.7 },
  buttonText: { color: '#FFFFFF', fontWeight: 'bold', fontSize: 16 },
  resendContainer: { flexDirection: 'row', justifyContent: 'center', marginTop: 24 },
  resendText: { color: '#BCCCDC' },
  resendLink: { color: '#4CB050', fontWeight: 'bold' },
  modalBackground: { flex:1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent:'center', alignItems:'center' },
  modalContainer: { width: '80%', backgroundColor:'#fff', borderRadius:10, padding:20, alignItems:'center' },
  modalTitle: { fontSize:20, fontWeight:'bold', marginBottom:10 },
  modalCode: { fontSize:24, fontWeight:'bold', color:'#4CB050', marginBottom:20 },
  modalButton: { backgroundColor:'#4CB050', paddingVertical:10, paddingHorizontal:20, borderRadius:10 },
  modalButtonText: { color:'#fff', fontWeight:'bold', fontSize:16 },
});
