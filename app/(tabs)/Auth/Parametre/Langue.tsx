

import React, { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  ScrollView,
  Dimensions,
  Platform,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons, MaterialIcons, FontAwesome5 } from "@expo/vector-icons";
import { useLanguage } from "../../../../context/LanguageContext";

const { width } = Dimensions.get("window");

// Couleurs
const COLORS = {
  background: "#00182A",
  card: "rgba(30, 42, 59, 0.95)",
  border: "rgba(66, 165, 245, 0.15)",
  primary: "#42A5F5",
  white: "#FFFFFF",
  gray: "#A0AEC0",
  grayLight: "#718096",
  success: "#4CAF50",
  french: "#0055A4",
  english: "#C8102E",
  accentBg: "rgba(66, 165, 245, 0.08)",
  toggleOff: "rgba(255, 255, 255, 0.1)",
};

// Types
type Language = "fr" | "en";

const LanguageScreen = () => {
  const router = useRouter();
  const { language, setLanguage } = useLanguage();
  const [loading, setLoading] = useState(false);

  const handleLanguageChange = async (lang: Language) => {
    if (lang === language || loading) return;
    setLoading(true);
    await setLanguage(lang);
    setLoading(false);
  };

  const isFrench = language === "fr";
  const isEnglish = language === "en";

  const handleConfirm = () => {
    router.back();
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar backgroundColor={COLORS.background} barStyle="light-content" />

      {/* Header fixe */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
          activeOpacity={0.7}
        >
          <Ionicons name="arrow-back" size={24} color={COLORS.white} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          {isFrench ? "Langue" : "Language"}
        </Text>
        <View style={styles.headerRight} />
      </View>

      {/* Contenu défilant */}
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        bounces={true}
      >
        {/* Hero Section */}
        <View style={styles.heroSection}>
          <View style={styles.heroIconContainer}>
            <FontAwesome5 name="globe-americas" size={40} color={COLORS.primary} />
          </View>
          <Text style={styles.heroTitle}>
            {isFrench ? "Choisissez votre langue" : "Choose your language"}
          </Text>
          <Text style={styles.heroSubtitle}>
            {isFrench
              ? "Sélectionnez la langue dans laquelle vous souhaitez utiliser SHOPNET"
              : "Select the language you want to use SHOPNET in"}
          </Text>
        </View>

        {/* Cartes de langues */}
        <View style={styles.languagesContainer}>
          {/* 🇫🇷 Français */}
          <TouchableOpacity
            style={[styles.languageCard, isFrench && styles.languageCardActive]}
            onPress={() => handleLanguageChange("fr")}
            activeOpacity={0.8}
            disabled={loading}
          >
            {/* En-tête avec drapeau */}
            <View style={styles.languageHeader}>
              <View style={styles.flagWrapper}>
                <View style={[styles.flagContainer, { backgroundColor: COLORS.french }]}>
                  <View style={[styles.flagStripeVertical, { backgroundColor: "#FFFFFF" }]} />
                  <View style={[styles.flagStripeVertical, { backgroundColor: "#EF4135" }]} />
                </View>
              </View>
              <View style={styles.languageInfo}>
                <Text style={styles.languageName}>Français</Text>
                <Text style={styles.languageNative}>Français</Text>
              </View>
            </View>

            {/* Détails */}
            <View style={styles.languageDetails}>
              <View style={styles.detailRow}>
                <Ionicons name="location-outline" size={16} color={COLORS.gray} />
                <Text style={styles.detailText}>France</Text>
              </View>
              <View style={styles.detailRow}>
                <Ionicons name="people-outline" size={16} color={COLORS.gray} />
                <Text style={styles.detailText}>+321 millions de locuteurs</Text>
              </View>
            </View>

            {/* Toggle ON/OFF */}
            <View style={styles.toggleContainer}>
              <TouchableOpacity
                style={[styles.toggleButton, isFrench && styles.toggleButtonActive]}
                onPress={() => handleLanguageChange("fr")}
                activeOpacity={0.9}
              >
                <View style={[styles.toggleCircle, isFrench && styles.toggleCircleActive]} />
              </TouchableOpacity>
              <Text style={[styles.toggleLabel, isFrench && styles.toggleLabelActive]}>
                {isFrench ? "Activé" : "Désactivé"}
              </Text>
              {isFrench && (
                <View style={styles.activeBadge}>
                  <MaterialIcons name="check-circle" size={16} color={COLORS.success} />
                  <Text style={styles.activeBadgeText}>Actif</Text>
                </View>
              )}
            </View>
          </TouchableOpacity>

          {/* 🇬🇧 Anglais */}
          <TouchableOpacity
            style={[styles.languageCard, isEnglish && styles.languageCardActive]}
            onPress={() => handleLanguageChange("en")}
            activeOpacity={0.8}
            disabled={loading}
          >
            {/* En-tête avec drapeau */}
            <View style={styles.languageHeader}>
              <View style={styles.flagWrapper}>
                <View style={[styles.flagContainer, { backgroundColor: COLORS.english }]}>
                  <View style={styles.ukFlagCenter}>
                    <Text style={styles.ukFlagEmoji}>🇬🇧</Text>
                  </View>
                </View>
              </View>
              <View style={styles.languageInfo}>
                <Text style={styles.languageName}>English</Text>
                <Text style={styles.languageNative}>Anglais</Text>
              </View>
            </View>

            {/* Détails */}
            <View style={styles.languageDetails}>
              <View style={styles.detailRow}>
                <Ionicons name="location-outline" size={16} color={COLORS.gray} />
                <Text style={styles.detailText}>United States</Text>
              </View>
              <View style={styles.detailRow}>
                <Ionicons name="people-outline" size={16} color={COLORS.gray} />
                <Text style={styles.detailText}>+1.5 billion speakers</Text>
              </View>
            </View>

            {/* Toggle ON/OFF */}
            <View style={styles.toggleContainer}>
              <TouchableOpacity
                style={[styles.toggleButton, isEnglish && styles.toggleButtonActive]}
                onPress={() => handleLanguageChange("en")}
                activeOpacity={0.9}
              >
                <View style={[styles.toggleCircle, isEnglish && styles.toggleCircleActive]} />
              </TouchableOpacity>
              <Text style={[styles.toggleLabel, isEnglish && styles.toggleLabelActive]}>
                {isEnglish ? "Activated" : "Disabled"}
              </Text>
              {isEnglish && (
                <View style={styles.activeBadge}>
                  <MaterialIcons name="check-circle" size={16} color={COLORS.success} />
                  <Text style={styles.activeBadgeText}>Active</Text>
                </View>
              )}
            </View>
          </TouchableOpacity>
        </View>

        {/* Section Info */}
        <View style={styles.infoSection}>
          <View style={styles.infoCard}>
            <View style={styles.infoIconContainer}>
              <MaterialIcons name="info-outline" size={22} color={COLORS.primary} />
            </View>
            <Text style={styles.infoText}>
              {isFrench
                ? "La langue sélectionnée sera appliquée à l'ensemble de l'application. Vous pourrez la modifier à tout moment dans les paramètres."
                : "The selected language will be applied to the entire application. You can change it at any time in the settings."}
            </Text>
          </View>
        </View>

        {/* Espace supplémentaire pour le scroll */}
        <View style={styles.bottomSpacer} />
      </ScrollView>

      {/* Bouton de confirmation fixé en bas */}
      <View style={styles.bottomContainer}>
        <TouchableOpacity
          style={styles.confirmButton}
          onPress={handleConfirm}
          activeOpacity={0.9}
        >
          <Ionicons name="checkmark-circle" size={22} color={COLORS.white} />
          <Text style={styles.confirmButtonText}>
            {isFrench ? "Confirmer et continuer" : "Confirm and continue"}
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },

  // Header
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.05)",
    justifyContent: "center",
    alignItems: "center",
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: COLORS.white,
    letterSpacing: 0.5,
  },
  headerRight: {
    width: 40,
  },

  // ScrollView
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 100,
  },

  // Hero Section
  heroSection: {
    alignItems: "center",
    paddingVertical: 30,
    paddingHorizontal: 20,
  },
  heroIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: COLORS.accentBg,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  heroTitle: {
    fontSize: 24,
    fontWeight: "800",
    color: COLORS.white,
    marginBottom: 8,
    textAlign: "center",
  },
  heroSubtitle: {
    fontSize: 15,
    color: COLORS.gray,
    textAlign: "center",
    lineHeight: 22,
    paddingHorizontal: 10,
  },

  // Langues
  languagesContainer: {
    paddingHorizontal: 20,
    gap: 16,
  },
  languageCard: {
    backgroundColor: COLORS.card,
    borderRadius: 20,
    padding: 20,
    borderWidth: 2,
    borderColor: COLORS.border,
  },
  languageCardActive: {
    borderColor: COLORS.primary,
    backgroundColor: "rgba(66, 165, 245, 0.08)",
  },

  // En-tête de carte
  languageHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },
  flagWrapper: {
    marginRight: 16,
    borderRadius: 10,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  flagContainer: {
    width: 56,
    height: 38,
    borderRadius: 8,
    overflow: "hidden",
    flexDirection: "row",
  },
  flagStripeVertical: {
    flex: 1,
    height: "100%",
  },
  ukFlagCenter: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#1B3A61",
  },
  ukFlagEmoji: {
    fontSize: 26,
  },
  languageInfo: {
    flex: 1,
  },
  languageName: {
    fontSize: 20,
    fontWeight: "700",
    color: COLORS.white,
    marginBottom: 2,
  },
  languageNative: {
    fontSize: 14,
    color: COLORS.gray,
  },

  // Détails
  languageDetails: {
    marginBottom: 16,
    gap: 8,
    paddingLeft: 4,
  },
  detailRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  detailText: {
    fontSize: 14,
    color: COLORS.gray,
  },

  // Toggle
  toggleContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  toggleButton: {
    width: 52,
    height: 28,
    borderRadius: 14,
    backgroundColor: COLORS.toggleOff,
    justifyContent: "center",
    paddingHorizontal: 3,
  },
  toggleButtonActive: {
    backgroundColor: COLORS.success,
  },
  toggleCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: COLORS.white,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 3,
  },
  toggleCircleActive: {
    alignSelf: "flex-end",
  },
  toggleLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: COLORS.grayLight,
    flex: 1,
  },
  toggleLabelActive: {
    color: COLORS.success,
  },
  activeBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "rgba(76, 175, 80, 0.1)",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  activeBadgeText: {
    fontSize: 12,
    fontWeight: "600",
    color: COLORS.success,
  },

  // Info
  infoSection: {
    paddingHorizontal: 20,
    marginTop: 24,
  },
  infoCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: COLORS.accentBg,
    borderRadius: 16,
    padding: 16,
    gap: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  infoIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(66, 165, 245, 0.15)",
    justifyContent: "center",
    alignItems: "center",
    marginTop: 2,
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    color: COLORS.gray,
    lineHeight: 20,
  },

  // Espaceur bas
  bottomSpacer: {
    height: 20,
  },

  // Bouton confirmer fixé en bas
  bottomContainer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 20,
    paddingBottom: Platform.OS === "ios" ? 30 : 20,
    paddingTop: 12,
    backgroundColor: COLORS.background,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  confirmButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.primary,
    paddingVertical: 16,
    borderRadius: 16,
    gap: 8,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  confirmButtonText: {
    fontSize: 17,
    fontWeight: "700",
    color: COLORS.white,
  },
});

export default LanguageScreen;