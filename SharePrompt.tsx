

// SharePrompt.tsx
import React, { useEffect, useState } from "react";
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  Share,
  StyleSheet,
  Dimensions,
  Animated,
} from "react-native";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const GOOGLE_PLAY_LINK =
  "https://entreprise-shopnet.github.io/SHOPNET-CONDITION/";

// Couleurs ShopNet officielles
const SHOPNET_COLORS = {
  primary: "#00182A", // Bleu ShopNet foncé
  secondary: "#4DB14E", // Vert ShopNet
  accent: "#42A5F5", // Bleu clair
  background: "#FFFFFF", // Fond blanc style Apple
  surface: "#F8F9FA", // Surface légère
  text: "#1A1A1A", // Texte principal
  textSecondary: "#6B7280", // Texte secondaire
  border: "#E5E7EB", // Bordures
};

const SharePrompt = () => {
  const [visible, setVisible] = useState(false);
  const [showCount, setShowCount] = useState(0);

  // Animations style Apple
  const scaleAnim = new Animated.Value(0.9);
  const opacityAnim = new Animated.Value(0);
  const slideAnim = new Animated.Value(50);

  useEffect(() => {
    const timer = setTimeout(() => {
      triggerSharePrompt();
    }, 10000);

    const interval = setInterval(
      () => {
        triggerSharePrompt();
      },
      6 * 60 * 60 * 1000,
    );

    return () => {
      clearTimeout(timer);
      clearInterval(interval);
    };
  }, []);

  const triggerSharePrompt = () => {
    setShowCount((prev) => {
      if (prev < 3) {
        setVisible(true);
        return prev + 1;
      }
      return prev;
    });
  };

  useEffect(() => {
    if (visible) {
      // Animation d'entrée style Apple
      Animated.parallel([
        Animated.spring(scaleAnim, {
          toValue: 1,
          tension: 60,
          friction: 8,
          useNativeDriver: true,
        }),
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: 250,
          useNativeDriver: true,
        }),
        Animated.spring(slideAnim, {
          toValue: 0,
          tension: 60,
          friction: 8,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible]);

  const closeModal = () => {
    // Animation de sortie fluide
    Animated.parallel([
      Animated.timing(scaleAnim, {
        toValue: 0.9,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(opacityAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 50,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start(() => setVisible(false));
  };

  const handleShare = async () => {
    try {
      await Share.share({
        message: `🛍️ **SHOPNET** - L'application shopping ultime !

✨ Découvre une nouvelle façon de shopper :
✅ Produits tendance et exclusifs
✅ Commandes sécurisées et rapides
✅ Interface intuitive et moderne
✅ Support réactif

📱 Télécharge l'application ici :
${GOOGLE_PLAY_LINK}

#Shopnet #Shopping #Mode #Tech`,
      });
    } catch (error) {
      console.log(error);
    }
    closeModal();
  };

  return (
    <Modal
      transparent
      visible={visible}
      animationType="fade"
      onRequestClose={closeModal}
    >
      <View style={styles.overlay}>
        <Animated.View
          style={[
            styles.container,
            {
              opacity: opacityAnim,
              transform: [{ scale: scaleAnim }, { translateY: slideAnim }],
            },
          ]}
        >
          {/* Header élégant */}
          <View style={styles.header}>
            <View style={styles.logoContainer}>
              <View style={styles.logo}>
                <MaterialCommunityIcons
                  name="shopping"
                  size={28}
                  color={SHOPNET_COLORS.secondary}
                />
              </View>
              <View style={styles.titleContainer}>
                <Text style={styles.appName}>SHOPNET</Text>
                <View style={styles.proBadge}>
                  <Text style={styles.proText}>PRO</Text>
                </View>
              </View>
            </View>
            <TouchableOpacity
              style={styles.closeButton}
              onPress={closeModal}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Ionicons
                name="close"
                size={22}
                color={SHOPNET_COLORS.textSecondary}
              />
            </TouchableOpacity>
          </View>

          {/* Contenu principal */}
          <View style={styles.content}>
            {/* Icône animée */}
            <View style={styles.iconWrapper}>
              <Animated.View
                style={[
                  styles.iconCircle,
                  {
                    transform: [
                      {
                        scale: opacityAnim.interpolate({
                          inputRange: [0, 1],
                          outputRange: [0.8, 1],
                        }),
                      },
                    ],
                  },
                ]}
              >
                <Ionicons
                  name="share-social"
                  size={36}
                  color={SHOPNET_COLORS.primary}
                />
              </Animated.View>
            </View>

            {/* Titre et description */}
            <Text style={styles.title}>Partagez ShopNet 🚀</Text>

            <Text style={styles.subtitle}>
              Faites découvrir l'expérience à vos proches
            </Text>

            {/* Points forts */}
            <View style={styles.features}>
              <View style={styles.featureItem}>
                <Ionicons
                  name="checkmark-circle"
                  size={20}
                  color={SHOPNET_COLORS.secondary}
                />
                <Text style={styles.featureText}>
                  Interface intuitive et moderne
                </Text>
              </View>
              <View style={styles.featureItem}>
                <Ionicons
                  name="checkmark-circle"
                  size={20}
                  color={SHOPNET_COLORS.secondary}
                />
                <Text style={styles.featureText}>
                  Produits sélectionnés avec soin
                </Text>
              </View>
              <View style={styles.featureItem}>
                <Ionicons
                  name="checkmark-circle"
                  size={20}
                  color={SHOPNET_COLORS.secondary}
                />
                <Text style={styles.featureText}>
                  Expérience shopping fluide
                </Text>
              </View>
            </View>

            {/* Message d'invitation */}
            <View style={styles.invitationCard}>
              <Ionicons
                name="people"
                size={18}
                color={SHOPNET_COLORS.accent}
                style={styles.invitationIcon}
              />
              <Text style={styles.invitationText}>
                Recommandez SHOPNET à vos amis, clients ou partenaires
              </Text>
            </View>
          </View>

          {/* Actions */}
          <View style={styles.actions}>
            <TouchableOpacity
              style={styles.primaryButton}
              onPress={handleShare}
              activeOpacity={0.8}
            >
              <Ionicons name="share-outline" size={20} color="#FFFFFF" />
              <Text style={styles.primaryButtonText}>
                Partager l'application
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.secondaryButton}
              onPress={closeModal}
              activeOpacity={0.7}
            >
              <Text style={styles.secondaryButtonText}>Plus tard</Text>
            </TouchableOpacity>
          </View>

          {/* Footer léger */}
          <View style={styles.footer}>
            <Text style={styles.footerText}>
              Plus d’1M de shoppers dans le monde nous font confiance. SHOPNET
              le coeur de vos achats.
            </Text>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.4)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  container: {
    width: SCREEN_WIDTH * 0.85,
    maxWidth: 380,
    backgroundColor: SHOPNET_COLORS.background,
    borderRadius: 20,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 10,
    },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 10,
    borderWidth: 1,
    borderColor: SHOPNET_COLORS.border,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 20,
    paddingBottom: 16,
    backgroundColor: SHOPNET_COLORS.surface,
    borderBottomWidth: 1,
    borderBottomColor: SHOPNET_COLORS.border,
  },
  logoContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  logo: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: "rgba(77, 177, 78, 0.1)",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  titleContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  appName: {
    fontSize: 18,
    fontWeight: "700",
    color: SHOPNET_COLORS.primary,
    letterSpacing: 0.5,
  },
  proBadge: {
    backgroundColor: SHOPNET_COLORS.secondary,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
    marginLeft: 8,
  },
  proText: {
    fontSize: 10,
    fontWeight: "800",
    color: "#FFFFFF",
    letterSpacing: 0.5,
  },
  closeButton: {
    padding: 4,
    borderRadius: 12,
  },
  content: {
    padding: 24,
    alignItems: "center",
  },
  iconWrapper: {
    marginBottom: 20,
  },
  iconCircle: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: "rgba(66, 165, 245, 0.1)",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(66, 165, 245, 0.2)",
  },
  title: {
    fontSize: 22,
    fontWeight: "700",
    color: SHOPNET_COLORS.text,
    textAlign: "center",
    marginBottom: 6,
    lineHeight: 28,
  },
  subtitle: {
    fontSize: 15,
    color: SHOPNET_COLORS.textSecondary,
    textAlign: "center",
    marginBottom: 24,
    fontWeight: "500",
    lineHeight: 20,
  },
  features: {
    width: "100%",
    marginBottom: 20,
  },
  featureItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  featureText: {
    fontSize: 14,
    color: SHOPNET_COLORS.text,
    marginLeft: 10,
    fontWeight: "500",
    flex: 1,
    lineHeight: 18,
  },
  invitationCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(66, 165, 245, 0.05)",
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(66, 165, 245, 0.1)",
    width: "100%",
  },
  invitationIcon: {
    marginRight: 10,
  },
  invitationText: {
    fontSize: 14,
    color: SHOPNET_COLORS.text,
    fontWeight: "500",
    flex: 1,
    lineHeight: 18,
  },
  actions: {
    paddingHorizontal: 24,
    paddingBottom: 20,
  },
  primaryButton: {
    backgroundColor: SHOPNET_COLORS.primary,
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 20,
    marginBottom: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: SHOPNET_COLORS.primary,
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  primaryButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
    marginLeft: 8,
  },
  secondaryButton: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: SHOPNET_COLORS.border,
    backgroundColor: "transparent",
  },
  secondaryButtonText: {
    color: SHOPNET_COLORS.textSecondary,
    fontSize: 15,
    fontWeight: "500",
    textAlign: "center",
  },
  footer: {
    padding: 16,
    paddingTop: 12,
    backgroundColor: SHOPNET_COLORS.surface,
    borderTopWidth: 1,
    borderTopColor: SHOPNET_COLORS.border,
  },
  footerText: {
    fontSize: 12,
    color: SHOPNET_COLORS.textSecondary,
    textAlign: "center",
    fontWeight: "500",
  },
});

export default SharePrompt;
