


// app/(tabs)/Auth/Profiles/SecuritySettings.tsx
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  ScrollView,
  StatusBar,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { useTheme } from '../../../../app/theme/ThemeContext';
import { useLanguage } from '../../../../context/LanguageContext';

const SHOPNET_BLUE = "#00182A";
const ACCENT = "#42A5F5";
const TEXT_PRIMARY = "#FFFFFF";
const TEXT_SECONDARY = "#A0AEC0";
const CARD_BACKGROUND = "rgba(30, 42, 59, 0.9)";
const BORDER_COLOR = "rgba(66, 165, 245, 0.1)";

export default function SecuritySettings() {
  const router = useRouter();
  const { language } = useLanguage();
  const fr = language === 'fr';
  const { isDark } = useTheme();

  const handleChangePassword = () => {
    // Naviguer vers l'écran de changement de mot de passe
    router.push('/(tabs)/Auth/Parametre/ChangePassword');
  };

  const handleAddEmail = () => {
    // Naviguer vers l'écran d'ajout d'email
    router.push('/Auth/Parametre/AjoutEmail');
  };

  const COLORS = {
    background: isDark ? '#0D0D0D' : SHOPNET_BLUE,
    surface: isDark ? '#1A1A1A' : CARD_BACKGROUND,
    border: isDark ? '#2E2E2E' : BORDER_COLOR,
    text: isDark ? '#F5F5F5' : TEXT_PRIMARY,
    textSecondary: isDark ? '#B0B0B0' : TEXT_SECONDARY,
    accent: ACCENT,
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
          {fr ? 'Sécurité' : 'Security'}
        </Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        {/* Section Sécurité */}
        <View style={[styles.sectionCard, { backgroundColor: COLORS.surface, borderColor: COLORS.border }]}>
          <Text style={[styles.sectionTitle, { color: COLORS.textSecondary }]}>
            {fr ? 'Paramètres de sécurité' : 'Security Settings'}
          </Text>

          {/* Option 1 : Changer le mot de passe */}
          <TouchableOpacity
            style={[styles.menuItem, { borderBottomColor: COLORS.border }]}
            onPress={handleChangePassword}
            activeOpacity={0.7}
          >
            <View style={styles.menuItemLeft}>
              <View style={[styles.iconContainer, { backgroundColor: `${COLORS.accent}20` }]}>
                <Ionicons name="key-outline" size={22} color={COLORS.accent} />
              </View>
              <View>
                <Text style={[styles.menuTitle, { color: COLORS.text }]}>
                  {fr ? 'Changer le mot de passe' : 'Change Password'}
                </Text>
                <Text style={[styles.menuSubtitle, { color: COLORS.textSecondary }]}>
                  {fr ? 'Modifiez votre mot de passe actuel' : 'Update your current password'}
                </Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={20} color={COLORS.textSecondary} />
          </TouchableOpacity>

          {/* Option 2 : Ajouter un email */}
          <TouchableOpacity
            style={styles.menuItem}
            onPress={handleAddEmail}
            activeOpacity={0.7}
          >
            <View style={styles.menuItemLeft}>
              <View style={[styles.iconContainer, { backgroundColor: `${COLORS.accent}20` }]}>
                <MaterialIcons name="email" size={22} color={COLORS.accent} />
              </View>
              <View>
                <Text style={[styles.menuTitle, { color: COLORS.text }]}>
                  {fr ? 'Ajouter un email' : 'Add Email'}
                </Text>
                <Text style={[styles.menuSubtitle, { color: COLORS.textSecondary }]}>
                  {fr ? 'Associez un email à votre compte' : 'Link an email to your account'}
                </Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={20} color={COLORS.textSecondary} />
          </TouchableOpacity>
        </View>

        {/* Petit message informatif (optionnel) */}
        <View style={styles.infoContainer}>
          <Ionicons name="information-circle-outline" size={20} color={COLORS.textSecondary} />
          <Text style={[styles.infoText, { color: COLORS.textSecondary }]}>
            {fr
              ? 'Ces actions renforcent la sécurité de votre compte.'
              : 'These actions strengthen your account security.'}
          </Text>
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
  sectionCard: {
    borderRadius: 16,
    borderWidth: 1,
    paddingVertical: 8,
    overflow: 'hidden',
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  menuItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  menuTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
  },
  menuSubtitle: {
    fontSize: 13,
  },
  infoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 20,
    paddingHorizontal: 8,
    gap: 8,
  },
  infoText: {
    fontSize: 13,
    flex: 1,
  },
});