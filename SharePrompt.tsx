

import React, { useEffect, useState } from "react";
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  Share,
  StyleSheet,
  useWindowDimensions,
} from "react-native";
import { Ionicons, MaterialCommunityIcons, MaterialIcons } from "@expo/vector-icons";

const GOOGLE_PLAY_LINK = "https://entreprise-shopnet.github.io/SHOPNET-CONDITION/";

// Couleurs avec bleu Facebook
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
  const { width: SCREEN_WIDTH } = useWindowDimensions();

  // Afficher après 10 secondes
  useEffect(() => {
    const timer = setTimeout(() => {
      setVisible(true);
    }, 10000);

    return () => clearTimeout(timer);
  }, []);

  const closeModal = () => {
    setVisible(false);
  };

  const handleShare = async () => {
    try {
      await Share.share({
        message: `🛍️ SHOPNET - L'application shopping ultime !

✨ Découvre une nouvelle façon de shopper :
✅ Produits tendance et exclusifs
✅ Commandes sécurisées et rapides
✅ Interface intuitive et moderne
✅ Support réactif

📱 Télécharge l'application ici :
${GOOGLE_PLAY_LINK}

#SHOPNET #Shopping #Mode #Tech #Application`,
      });
    } catch (error) {
      console.log("Erreur de partage:", error);
    }
    closeModal();
  };

  // Composant Badge de Vérification (identique à BoutiquePremium)
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
      statusBarTranslucent={true}
    >
      <View style={styles.overlay}>
        <View style={[styles.container, { width: Math.min(SCREEN_WIDTH * 0.85, 400) }]}>
          
          {/* En-tête avec coins arrondis en haut */}
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

          {/* Contenu principal */}
          <View style={styles.content}>
            <View style={styles.iconContainer}>
              <Ionicons name="share-social" size={48} color={COLORS.secondary} />
            </View>

            <Text style={styles.title}>Partagez SHOPNET</Text>
            <Text style={styles.subtitle}>
              Partagez SHOPNET avec vos amis, clients ou partenaires et bénéficiez d'avantages exclusifs
            </Text>

            {/* Liste des avantages */}
            <View style={styles.benefits}>
              <View style={styles.benefitItem}>
                <View style={styles.checkmarkCircle}>
                  <Ionicons name="checkmark" size={14} color={COLORS.secondary} />
                </View>
                <Text style={styles.benefitText}>Interface intuitive et moderne</Text>
              </View>
              <View style={styles.benefitItem}>
                <View style={styles.checkmarkCircle}>
                  <Ionicons name="checkmark" size={14} color={COLORS.secondary} />
                </View>
                <Text style={styles.benefitText}>Produits sélectionnés avec soin</Text>
              </View>
              <View style={styles.benefitItem}>
                <View style={styles.checkmarkCircle}>
                  <Ionicons name="checkmark" size={14} color={COLORS.secondary} />
                </View>
                <Text style={styles.benefitText}>Expérience shopping fluide</Text>
              </View>
              <View style={styles.benefitItem}>
                <View style={styles.checkmarkCircle}>
                  <Ionicons name="checkmark" size={14} color={COLORS.secondary} />
                </View>
                <Text style={styles.benefitText}>Application officielle vérifiée</Text>
              </View>
            </View>
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

          {/* Pied de page simplifié sans badge */}
          <View style={[styles.footer, styles.footerRadius]}>
            <Text style={styles.footerText}>
              Rejoignez des millions d'utilisateurs satisfaits
            </Text>
          </View>
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
    maxWidth: 400,
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
  // Style du badge de vérification (uniquement en haut)
  verificationBadge: {
    justifyContent: "center",
    alignItems: "center",
    marginLeft: 6,
  },
  closeButton: {
    padding: 4,
    borderRadius: 20,
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
  benefits: {
    width: "100%",
    marginBottom: 10,
  },
  benefitItem: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
    paddingHorizontal: 4,
  },
  checkmarkCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: "rgba(66, 165, 245, 0.1)",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 10,
  },
  benefitText: {
    fontSize: 14,
    color: COLORS.text,
    flex: 1,
    lineHeight: 18,
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