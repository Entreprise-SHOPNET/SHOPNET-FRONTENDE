

// app/(tabs)/Auth/Profiles/ChangePassword.tsx
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

export default function ChangePassword() {
  const router = useRouter();
  const { language } = useLanguage();
  const fr = language === 'fr';
  const { isDark } = useTheme();

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
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

  const validate = (): boolean => {
    setError(null);
    setSuccess(null);

    if (!currentPassword.trim()) {
      setError(fr ? 'Veuillez saisir votre mot de passe actuel' : 'Please enter your current password');
      return false;
    }
    if (!newPassword.trim()) {
      setError(fr ? 'Veuillez saisir un nouveau mot de passe' : 'Please enter a new password');
      return false;
    }
    if (newPassword.length < 6) {
      setError(fr ? 'Le nouveau mot de passe doit contenir au moins 6 caractères' : 'New password must be at least 6 characters');
      return false;
    }
    if (newPassword !== confirmPassword) {
      setError(fr ? 'Les mots de passe ne correspondent pas' : 'Passwords do not match');
      return false;
    }
    return true;
  };

  const handleChangePassword = async () => {
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

      const response = await fetch('https://shopnet-backend.onrender.com/api/auth/change-password', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          currentPassword,
          newPassword,
          confirmPassword,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || (fr ? 'Erreur lors du changement' : 'Error changing password'));
      }

      setSuccess(data.message || fr ? 'Mot de passe modifié avec succès' : 'Password changed successfully');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');

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
          {fr ? 'Changer le mot de passe' : 'Change Password'}
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
            {fr ? 'Saisissez vos informations' : 'Enter your information'}
          </Text>

          {/* Champ Mot de passe actuel */}
          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: COLORS.textSecondary }]}>
              {fr ? 'Mot de passe actuel *' : 'Current password *'}
            </Text>
            <View style={[styles.inputWrapper, { backgroundColor: COLORS.inputBg, borderColor: COLORS.inputBorder }]}>
              <TextInput
                style={[styles.input, { color: COLORS.inputText }]}
                placeholder={fr ? 'Entrez votre mot de passe actuel' : 'Enter your current password'}
                placeholderTextColor={COLORS.placeholder}
                secureTextEntry={!showCurrent}
                value={currentPassword}
                onChangeText={setCurrentPassword}
              />
              <TouchableOpacity onPress={() => setShowCurrent(!showCurrent)} style={styles.eyeIcon}>
                <Ionicons
                  name={showCurrent ? 'eye' : 'eye-off'}
                  size={22}
                  color={COLORS.textSecondary}
                />
              </TouchableOpacity>
            </View>
          </View>

          {/* Champ Nouveau mot de passe */}
          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: COLORS.textSecondary }]}>
              {fr ? 'Nouveau mot de passe *' : 'New password *'}
            </Text>
            <View style={[styles.inputWrapper, { backgroundColor: COLORS.inputBg, borderColor: COLORS.inputBorder }]}>
              <TextInput
                style={[styles.input, { color: COLORS.inputText }]}
                placeholder={fr ? 'Entrez votre nouveau mot de passe' : 'Enter your new password'}
                placeholderTextColor={COLORS.placeholder}
                secureTextEntry={!showNew}
                value={newPassword}
                onChangeText={setNewPassword}
              />
              <TouchableOpacity onPress={() => setShowNew(!showNew)} style={styles.eyeIcon}>
                <Ionicons
                  name={showNew ? 'eye' : 'eye-off'}
                  size={22}
                  color={COLORS.textSecondary}
                />
              </TouchableOpacity>
            </View>
            <Text style={[styles.hint, { color: COLORS.textSecondary }]}>
              {fr ? 'Minimum 6 caractères' : 'Minimum 6 characters'}
            </Text>
          </View>

          {/* Champ Confirmation */}
          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: COLORS.textSecondary }]}>
              {fr ? 'Confirmer le mot de passe *' : 'Confirm password *'}
            </Text>
            <View style={[styles.inputWrapper, { backgroundColor: COLORS.inputBg, borderColor: COLORS.inputBorder }]}>
              <TextInput
                style={[styles.input, { color: COLORS.inputText }]}
                placeholder={fr ? 'Confirmez votre nouveau mot de passe' : 'Confirm your new password'}
                placeholderTextColor={COLORS.placeholder}
                secureTextEntry={!showConfirm}
                value={confirmPassword}
                onChangeText={setConfirmPassword}
              />
              <TouchableOpacity onPress={() => setShowConfirm(!showConfirm)} style={styles.eyeIcon}>
                <Ionicons
                  name={showConfirm ? 'eye' : 'eye-off'}
                  size={22}
                  color={COLORS.textSecondary}
                />
              </TouchableOpacity>
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
            onPress={handleChangePassword}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#FFFFFF" size="small" />
            ) : (
              <Text style={styles.submitText}>
                {fr ? 'Changer le mot de passe' : 'Change password'}
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
    borderRadius: 12, // Ajout
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
    borderRadius: 8, // Ajout
  },
  input: {
    flex: 1,
    fontSize: 16,
    paddingVertical: 12,
  },
  eyeIcon: {
    padding: 4,
  },
  hint: {
    fontSize: 12,
    marginTop: 4,
  },
  messageBox: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderWidth: 1,
    marginBottom: 16,
    gap: 8,
    borderRadius: 8, // Ajout
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
    borderRadius: 10, // Ajout
  },
  submitText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
});