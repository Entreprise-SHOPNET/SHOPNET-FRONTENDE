

// app/(tabs)/Auth/Profiles/AddEmail.tsx
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  ScrollView,
  StatusBar,
  TextInput,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../../../app/theme/ThemeContext';
import { useLanguage } from '../../../../context/LanguageContext';
import AsyncStorage from '@react-native-async-storage/async-storage';

const SHOPNET_BLUE = "#00182A";
const ACCENT = "#42A5F5";
const TEXT_PRIMARY = "#FFFFFF";
const TEXT_SECONDARY = "#A0AEC0";
const CARD_BACKGROUND = "rgba(30, 42, 59, 0.9)";
const BORDER_COLOR = "rgba(66, 165, 245, 0.1)";
const ERROR_COLOR = "#FF6B6B";
const SUCCESS_COLOR = "#4CAF50";

export default function AddEmail() {
  const router = useRouter();
  const { language } = useLanguage();
  const fr = language === 'fr';
  const { isDark } = useTheme();

  const [email, setEmail] = useState('');
  const [confirmEmail, setConfirmEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const COLORS = {
    background: isDark ? '#0D0D0D' : SHOPNET_BLUE,
    surface: isDark ? '#1A1A1A' : CARD_BACKGROUND,
    border: isDark ? '#2E2E2E' : BORDER_COLOR,
    text: isDark ? '#F5F5F5' : TEXT_PRIMARY,
    textSecondary: isDark ? '#B0B0B0' : TEXT_SECONDARY,
    inputBg: isDark ? '#222222' : 'rgba(30, 42, 59, 0.5)',
    inputBorder: isDark ? '#2E2E2E' : 'rgba(66, 165, 245, 0.1)',
    inputText: isDark ? '#F5F5F5' : '#FFFFFF',
    placeholder: isDark ? '#888888' : '#A0AEC0',
    accent: ACCENT,
    error: ERROR_COLOR,
    success: SUCCESS_COLOR,
  };

  const validateEmail = (email: string): boolean => {
    const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return regex.test(email);
  };

  const validate = (): boolean => {
    setError(null);
    setSuccess(null);

    if (!email.trim()) {
      setError(fr ? 'Veuillez saisir une adresse email' : 'Please enter an email address');
      return false;
    }
    if (!validateEmail(email)) {
      setError(fr ? 'Adresse email invalide' : 'Invalid email address');
      return false;
    }
    if (email !== confirmEmail) {
      setError(fr ? 'Les emails ne correspondent pas' : 'Emails do not match');
      return false;
    }
    return true;
  };

  const handleAddEmail = async () => {
    if (!validate()) return;

    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const token = await AsyncStorage.getItem('userToken');
      if (!token) {
        Alert.alert(fr ? 'Erreur' : 'Error', fr ? 'Vous devez être connecté' : 'You must be logged in');
        router.push('/splash');
        return;
      }

      const response = await fetch('https://shopnet-backend.onrender.com/api/auth/change-email', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || (fr ? 'Erreur lors de l\'ajout' : 'Error adding email'));
      }

      setSuccess(data.message || fr ? 'Email ajouté avec succès' : 'Email added successfully');
      setEmail('');
      setConfirmEmail('');

      setTimeout(() => {
        router.back();
      }, 2000);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: COLORS.background }]}>
      <StatusBar backgroundColor={COLORS.background} barStyle="light-content" />

      {/* Header */}
      <View style={[styles.header, { borderBottomColor: COLORS.border }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: COLORS.text }]}>
          {fr ? 'Ajouter un email' : 'Add Email'}
        </Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.card, { backgroundColor: COLORS.surface, borderColor: COLORS.border }]}>
          <Text style={[styles.cardTitle, { color: COLORS.text }]}>
            {fr ? 'Associez un email à votre compte' : 'Link an email to your account'}
          </Text>

          {/* Champ Email */}
          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: COLORS.textSecondary }]}>
              {fr ? 'Nouvel email *' : 'New email *'}
            </Text>
            <View style={[styles.inputWrapper, { backgroundColor: COLORS.inputBg, borderColor: COLORS.inputBorder }]}>
              <TextInput
                style={[styles.input, { color: COLORS.inputText }]}
                placeholder={fr ? 'exemple@email.com' : 'example@email.com'}
                placeholderTextColor={COLORS.placeholder}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                value={email}
                onChangeText={setEmail}
              />
            </View>
          </View>

          {/* Champ Confirmation email */}
          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: COLORS.textSecondary }]}>
              {fr ? 'Confirmer l\'email *' : 'Confirm email *'}
            </Text>
            <View style={[styles.inputWrapper, { backgroundColor: COLORS.inputBg, borderColor: COLORS.inputBorder }]}>
              <TextInput
                style={[styles.input, { color: COLORS.inputText }]}
                placeholder={fr ? 'Confirmez l\'email' : 'Confirm email'}
                placeholderTextColor={COLORS.placeholder}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                value={confirmEmail}
                onChangeText={setConfirmEmail}
              />
            </View>
          </View>

          {/* Messages d'erreur ou succès */}
          {error && (
            <View style={[styles.messageBox, { backgroundColor: `${COLORS.error}20`, borderColor: COLORS.error }]}>
              <Ionicons name="alert-circle" size={20} color={COLORS.error} />
              <Text style={[styles.messageText, { color: COLORS.error }]}>{error}</Text>
            </View>
          )}
          {success && (
            <View style={[styles.messageBox, { backgroundColor: `${COLORS.success}20`, borderColor: COLORS.success }]}>
              <Ionicons name="checkmark-circle" size={20} color={COLORS.success} />
              <Text style={[styles.messageText, { color: COLORS.success }]}>{success}</Text>
            </View>
          )}

          {/* Bouton de soumission */}
          <TouchableOpacity
            style={[styles.submitButton, { backgroundColor: COLORS.accent }]}
            onPress={handleAddEmail}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#FFFFFF" size="small" />
            ) : (
              <Text style={styles.submitText}>
                {fr ? 'Ajouter l\'email' : 'Add email'}
              </Text>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
  },
  scrollView: {
    flex: 1,
  },
  contentContainer: {
    paddingHorizontal: 16,
    paddingVertical: 24,
    paddingBottom: 40,
  },
  card: {
    borderWidth: 1,
    padding: 20,
    borderRadius: 12,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 20,
  },
  inputGroup: {
    marginBottom: 18,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 6,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  input: {
    flex: 1,
    fontSize: 16,
    paddingVertical: 12,
  },
  messageBox: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderWidth: 1,
    marginBottom: 16,
    gap: 8,
    borderRadius: 8,
  },
  messageText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '500',
  },
  submitButton: {
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
    borderRadius: 10,
  },
  submitText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
});