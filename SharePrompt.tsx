

import React, { useEffect, useState } from "react";
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  Share,
  StyleSheet,
  useWindowDimensions,
  ScrollView,
} from "react-native";
import { Ionicons, MaterialCommunityIcons, MaterialIcons } from "@expo/vector-icons";

// ✅ Nouveau lien Play Store
const PLAY_STORE_LINK = "https://play.google.com/store/apps/details?id=com.shopai.app";

const COLORS = {
  primary: "#00182A",
  secondary: "#42A5F5", // Bleu clair pour le badge de vérification
  accent: "#42A5F5",
  background: "#FFFFFF",
  text: "#1A1A1A",
  textSecondary: "#666666",
  border: "#DDDDDD",
  facebookBlue: "#1877F2",
  white: "#FFFFFF",
};

const SharePrompt = () => {
  const [visible, setVisible] = useState(false);
  const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = useWindowDimensions();

  // Afficher après 10 secondes
  useEffect(() => {
    const timer = setTimeout(() => {
      setVisible(true);
    }, 10000);
    return () => clearTimeout(timer);
  }, []);

  const closeModal = () => setVisible(false);

  const handleShare = async () => {
    try {
      await Share.share({
        message: `💰 Gagnez des récompenses avec SHOPNET – Boosts d’une valeur totale jusqu’à 100$ !
Invitez vos amis à rejoindre SHOPNET et boostez vos ventes dès maintenant.

🎯 5 invitations = 1 Boost de 20$ gratuit
🔥 10 invitations = 2 Boosts de 20$ chacun (total 40$)
👑 20 invitations = Badge Vendeur VIP + Boosts gratuits

📱 Invitez vos contacts à rejoindre SHOPNET dès maintenant et bénéficiez
d’une visibilité accrue ainsi que d’avantages exclusifs. Plus vous invitez,
plus vous gagnez, plus votre business grandit. !

Télécharge l'application : ${PLAY_STORE_LINK}`,
      });
    } catch (error) {
      console.log("Erreur de partage:", error);
    }
    closeModal();
  };

  // Badge de vérification (inchangé)
  const VerificationBadge = ({ size = 16 }: { size?: number }) => (
    <View style={[styles.verificationBadge, { width: size, height: size }]}>
      <MaterialIcons name="verified" size={size * 0.9} color="#42A5F5" />
    </View>
  );

  return (
    <Modal
      transparent
      visible={visible}
      onRequestClose={closeModal}
      animationType="fade"
      statusBarTranslucent
    >
      <View style={styles.overlay}>
        <View
          style={[
            styles.container,
            {
              width: Math.min(SCREEN_WIDTH * 0.85, 400),
              maxHeight: SCREEN_HEIGHT * 0.8, // Limite la hauteur à 80% de l'écran
            },
          ]}
        >
          {/* En-tête avec badge de vérification (inchangé) */}
          <View style={[styles.header, styles.headerRadius]}>
            <View style={styles.logoContainer}>
              <View style={styles.logo}>
                <MaterialCommunityIcons name="shopping" size={24} color={COLORS.secondary} />
              </View>
              <View style={styles.titleContainer}>
                <View style={styles.shopNameRow}>
                  <Text style={styles.appName}>SHOPNET</Text>
                  <VerificationBadge size={18} />
                </View>
              </View>
            </View>
            <TouchableOpacity onPress={closeModal} style={styles.closeButton}>
              <Ionicons name="close" size={22} color={COLORS.textSecondary} />
            </TouchableOpacity>
          </View>

          {/* Contenu scrollable pour les petits écrans */}
          <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
            <View style={styles.content}>
              <View style={styles.iconContainer}>
                <Ionicons name="share-social" size={48} color={COLORS.secondary} />
              </View>

              {/* Nouveau texte motivant */}
              <Text style={styles.title}>💰 Gagne des récompenses avec SHOPNET !</Text>
              <Text style={styles.subtitle}>
                Invite tes amis à rejoindre SHOPNET et booste tes ventes dès maintenant.
              </Text>

              {/* Récompenses en style AliExpress */}
              <View style={styles.rewardsContainer}>
                <View style={styles.rewardItem}>
                  <Text style={styles.rewardEmoji}>🎯</Text>
                  <Text style={styles.rewardText}>
                    <Text style={styles.rewardBold}>5 invitations</Text> = 1 Boost de 20$ gratuit
                  </Text>
                </View>
                <View style={styles.rewardItem}>
                  <Text style={styles.rewardEmoji}>🔥</Text>
                  <Text style={styles.rewardText}>
                    <Text style={styles.rewardBold}>10 invitations</Text> = 2 Boosts de 20$ chacun (total 40$)
                  </Text>
                </View>
                <View style={styles.rewardItem}>
                  <Text style={styles.rewardEmoji}>👑</Text>
                  <Text style={styles.rewardText}>
                    <Text style={styles.rewardBold}>20 invitations</Text> = Badge Vendeur VIP + Boosts gratuits
                  </Text>
                </View>
              </View>

              <Text style={styles.motivationText}>
                📱 Partage maintenant et augmente ta visibilité !{"\n"}
                Plus tu invites, plus tu gagnes, plus ton business grandit !
              </Text>
            </View>

            {/* Boutons d'action */}
            <View style={styles.actions}>
              <TouchableOpacity style={styles.primaryButton} onPress={handleShare}>
                <Ionicons name="share-outline" size={18} color={COLORS.white} />
                <Text style={styles.primaryButtonText}>Partager SHOPNET</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.secondaryButton} onPress={closeModal}>
                <Text style={styles.secondaryButtonText}>Plus tard</Text>
              </TouchableOpacity>
            </View>

            {/* Pied de page adapté */}
            <View style={[styles.footer, styles.footerRadius]}>
              <Text style={styles.footerText}>
                Rejoins le programme de parrainage maintenant !
              </Text>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

const BORDER_RADIUS = 16;

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  container: {
    backgroundColor: COLORS.background,
    borderRadius: BORDER_RADIUS,
    borderWidth: 1,
    borderColor: COLORS.border,
    overflow: "hidden",
    elevation: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  headerRadius: {
    borderTopLeftRadius: BORDER_RADIUS,
    borderTopRightRadius: BORDER_RADIUS,
  },
  logoContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  logo: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: "rgba(66, 165, 245, 0.1)",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 10,
  },
  titleContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  shopNameRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  appName: {
    fontSize: 18,
    fontWeight: "700",
    color: COLORS.primary,
    letterSpacing: 0.5,
  },
  verificationBadge: {
    justifyContent: "center",
    alignItems: "center",
    marginLeft: 6,
  },
  closeButton: {
    padding: 4,
    borderRadius: 20,
  },
  scrollContent: {
    flexGrow: 1,
  },
  content: {
    padding: 20,
    alignItems: "center",
    backgroundColor: COLORS.white,
  },
  iconContainer: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: "rgba(66, 165, 245, 0.1)",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "rgba(66, 165, 245, 0.2)",
  },
  title: {
    fontSize: 22,
    fontWeight: "700",
    color: COLORS.text,
    textAlign: "center",
    marginBottom: 8,
    letterSpacing: 0.5,
  },
  subtitle: {
    fontSize: 14,
    color: COLORS.textSecondary,
    textAlign: "center",
    marginBottom: 20,
    lineHeight: 20,
  },
  rewardsContainer: {
    width: "100%",
    marginBottom: 16,
    backgroundColor: "#F8F9FA",
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  rewardItem: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
  },
  rewardEmoji: {
    fontSize: 20,
    marginRight: 10,
    width: 30,
    textAlign: "center",
  },
  rewardText: {
    fontSize: 14,
    color: COLORS.text,
    flex: 1,
    lineHeight: 18,
  },
  rewardBold: {
    fontWeight: "700",
    color: COLORS.primary,
  },
  motivationText: {
    fontSize: 13,
    color: COLORS.textSecondary,
    textAlign: "center",
    lineHeight: 18,
    fontStyle: "italic",
  },
  actions: {
    paddingHorizontal: 20,
    paddingBottom: 20,
    backgroundColor: COLORS.white,
  },
  primaryButton: {
    backgroundColor: COLORS.facebookBlue,
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 20,
    marginBottom: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    elevation: 3,
    shadowColor: COLORS.facebookBlue,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
  },
  primaryButtonText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: "600",
    marginLeft: 8,
  },
  secondaryButton: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: "center",
    backgroundColor: COLORS.white,
  },
  secondaryButtonText: {
    color: COLORS.textSecondary,
    fontSize: 15,
    fontWeight: "500",
  },
  footer: {
    padding: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    backgroundColor: "#F8F9FA",
  },
  footerRadius: {
    borderBottomLeftRadius: BORDER_RADIUS,
    borderBottomRightRadius: BORDER_RADIUS,
  },
  footerText: {
    fontSize: 12,
    color: COLORS.textSecondary,
    textAlign: "center",
    fontWeight: "500",
  },
});

export default SharePrompt;