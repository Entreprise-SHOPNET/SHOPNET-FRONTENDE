import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Linking,
  Alert,
  Animated,
  Dimensions,
  ScrollView,
} from "react-native";
import {
  MaterialIcons,
  Ionicons,
  Feather,
} from "@expo/vector-icons";
import { useRouter } from "expo-router";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const PRO_BLUE = "#42A5F5";
const SHOPNET_BLUE = "#00182A";

// Compte à rebours de 30 jours (1 mois)
const getCountdownTargetDate = () => {
  const now = new Date();
  const target = new Date(now);
  target.setDate(target.getDate() + 30);
  return target;
};

const ComingSoonPage = () => {
  const router = useRouter();
  const [countdownTargetDate] = useState(getCountdownTargetDate());
  const [timeLeft, setTimeLeft] = useState(getTimeLeft(countdownTargetDate));

  const fadeAnim = useState(new Animated.Value(0))[0];
  const slideAnim = useState(new Animated.Value(50))[0];
  const scaleAnim = useState(new Animated.Value(0.8))[0];
  const pulseAnim = useState(new Animated.Value(1))[0];

  function getTimeLeft(targetDate: Date) {
    const now = new Date();
    const difference = targetDate.getTime() - now.getTime();
    if (difference <= 0) return null;
    return {
      days: Math.floor(difference / (1000 * 60 * 60 * 24)),
      hours: Math.floor((difference / (1000 * 60 * 60)) % 24),
      minutes: Math.floor((difference / (1000 * 60)) % 60),
      seconds: Math.floor((difference / 1000) % 60),
    };
  }

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft(getTimeLeft(countdownTargetDate));
    }, 1000);

    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 1000, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 800, useNativeDriver: true }),
      Animated.spring(scaleAnim, { toValue: 1, tension: 50, friction: 7, useNativeDriver: true }),
    ]).start();

    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.1, duration: 1500, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 1500, useNativeDriver: true }),
      ]),
    ).start();

    return () => clearInterval(timer);
  }, [countdownTargetDate]);

  const handleContactSupport = async () => {
    const phoneNumber = "+243896037137";
    const message = "Bonjour l'équipe SHOPNET, je souhaite avoir plus d'informations sur SHOPNET 10.2.4 et les fonctionnalités VIP à venir.";
    const formattedNumber = phoneNumber.replace(/\D/g, '');
    const appUrl = `whatsapp://send?phone=${formattedNumber}&text=${encodeURIComponent(message)}`;
    const webUrl = `https://wa.me/${formattedNumber}?text=${encodeURIComponent(message)}`;

    try {
      const canOpen = await Linking.canOpenURL(appUrl);
      if (canOpen) {
        await Linking.openURL(appUrl);
      } else {
        Alert.alert(
          "Ouvrir WhatsApp",
          "Vous allez être redirigé vers WhatsApp pour contacter notre équipe.",
          [
            { text: "Annuler", style: "cancel" },
            {
              text: "Continuer",
              onPress: async () => {
                try {
                  await Linking.openURL(webUrl);
                } catch (webError) {
                  Alert.alert("Redirection Impossible", "Veuillez contacter directement le support SHOPNET au +243 896 037 137.");
                }
              }
            }
          ]
        );
      }
    } catch {
      try {
        await Linking.openURL(webUrl);
      } catch {
        Alert.alert("Service Indisponible", "Veuillez nous joindre au +243 896 037 137.");
      }
    }
  };

  const premiumFeatures = [
    { icon: "ai", title: "IA Avancée", description: "Intelligence artificielle intégrée pour optimiser vos ventes" },
    { icon: "analytics", title: "Analytics Pro", description: "Statistiques détaillées et prédictions de tendances" },
    { icon: "rocket", title: "Performance Max", description: "Vitesse et performances ultra-rapides" },
    { icon: "security", title: "Sécurité VIP", description: "Protection de niveau entreprise" },
    { icon: "auto-graph", title: "Marketing Auto", description: "Campagnes marketing automatisées" },
    { icon: "inventory", title: "Stock Intelligent", description: "Gestion de stock avec IA prédictive" },
    { icon: "notifications-active", title: "Notifications IA", description: "Alertez automatiquement vos abonnés de vos nouveaux produits, même en votre absence" },
    { icon: "assessment", title: "Rapports Pro", description: "Suivi détaillé de votre activité (journalier, hebdomadaire, mensuel, annuel)" },
    { icon: "local-shipping", title: "Suivi de colis", description: "Gérez vos expéditions en temps réel et informez vos clients" },
    { icon: "groups", title: "Communauté", description: "Créez et animez votre communauté d'acheteurs fidèles" },
    { icon: "visibility", title: "Visibilité Boost", description: "Outils premium pour augmenter votre visibilité et vendre plus" },
    { icon: "support-agent", title: "Assistant Vendeur IA", description: "Conseils personnalisés et stratégies de vente optimisées" },
  ];

  return (
    <View style={styles.container}>
      <View style={styles.backgroundEffects}>
        <View style={styles.glowCircle1} />
        <View style={styles.glowCircle2} />
        <View style={styles.glowCircle3} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <Animated.View style={[styles.headerSection, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
          <View style={styles.vipBadgeContainer}>
            <Animated.View style={[styles.vipBadge, { transform: [{ scale: pulseAnim }] }]}>
              <Ionicons name="diamond" size={20} color="#FFD700" />
              <Text style={styles.vipText}>VIP PRO</Text>
            </Animated.View>
          </View>
          <Animated.View style={[styles.mainIconContainer, { transform: [{ scale: scaleAnim }] }]}>
            <View style={styles.iconGlow}>
              <Ionicons name="rocket" size={60} color={PRO_BLUE} />
            </View>
          </Animated.View>
          <Text style={styles.title}>SHOPNET 10.2.4</Text>
          <Text style={styles.subtitle}>La Révolution Pro Arrive</Text>
          <View style={styles.exclusiveBadge}>
            <Feather name="star" size={14} color="#FFD700" />
            <Text style={styles.exclusiveText}>EXCLUSIVITÉ ENTREPRISE</Text>
          </View>
        </Animated.View>

        <Animated.View style={[styles.messageSection, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
          <Text style={styles.messageTitle}>Une Expérience Réinventée</Text>
          <Text style={styles.message}>
            Nous préparons une révolution complète de votre expérience boutique.
            La version 10.2.4 apporte des technologies de pointe et des fonctionnalités exclusives réservées aux professionnels.
          </Text>
        </Animated.View>

        {timeLeft ? (
          <Animated.View style={[styles.countdownSection, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
            <Text style={styles.countdownTitle}>Lancement dans</Text>
            <View style={styles.countdownGrid}>
              <View style={styles.timeCard}>
                <Text style={styles.timeValue}>{timeLeft.days}</Text>
                <Text style={styles.timeLabel}>JOURS</Text>
              </View>
              <View style={styles.timeCard}>
                <Text style={styles.timeValue}>{timeLeft.hours}</Text>
                <Text style={styles.timeLabel}>HEURES</Text>
              </View>
              <View style={styles.timeCard}>
                <Text style={styles.timeValue}>{timeLeft.minutes}</Text>
                <Text style={styles.timeLabel}>MINUTES</Text>
              </View>
              <View style={styles.timeCard}>
                <Text style={styles.timeValue}>{timeLeft.seconds}</Text>
                <Text style={styles.timeLabel}>SECONDES</Text>
              </View>
            </View>
          </Animated.View>
        ) : (
          <View style={styles.launchedSection}>
            <Text style={styles.launchedTitle}>🎉 C'EST MAINTENANT !</Text>
            <Text style={styles.launchedText}>La révolution SHOPNET 10.2.4 est lancée</Text>
          </View>
        )}

        <Animated.View style={[styles.featuresSection, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
          <Text style={styles.sectionTitle}>Fonctionnalités Exclusives SHOPNET 10.2.4</Text>
          <View style={styles.featuresGrid}>
            {premiumFeatures.map((feature, index) => (
              <View key={index} style={styles.featureCard}>
                <View style={styles.featureIconContainer}>
                  <MaterialIcons name={feature.icon as any} size={28} color={PRO_BLUE} />
                </View>
                <Text style={styles.featureTitle}>{feature.title}</Text>
                <Text style={styles.featureDescription}>{feature.description}</Text>
              </View>
            ))}
          </View>
        </Animated.View>

        <Animated.View style={[styles.benefitsSection, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
          <Text style={styles.sectionTitle}>Avantages Réservés VIP</Text>
          <View style={styles.benefitsList}>
            {[
              "Support dédié 24/7 avec manager attitré",
              "Accès anticipé à toutes les nouvelles fonctionnalités",
              "Formations exclusives et webinaires VIP",
              "Rapports personnalisés et conseils stratégiques",
              "Limites étendues et priorité absolue",
            ].map((benefit, index) => (
              <View key={index} style={styles.benefitItem}>
                <Ionicons name="shield-checkmark" size={20} color={PRO_BLUE} />
                <Text style={styles.benefitText}>{benefit}</Text>
              </View>
            ))}
          </View>
        </Animated.View>

        <Animated.View style={[styles.infoSection, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
          <Ionicons name="information-circle" size={28} color={PRO_BLUE} style={styles.infoIcon} />
          <View style={styles.infoContent}>
            <Text style={styles.infoTitle}>Service VIP - Contact Direct</Text>
            <Text style={styles.infoText}>
              Notre équipe d'experts SHOPNET vous répond en priorité via le lien officiel WhatsApp pour une prise en charge immédiate et personnalisée.
            </Text>
            <View style={styles.featureList}>
              <Text style={styles.featureItem}>✓ Réponse garantie sous 15 minutes</Text>
              <Text style={styles.featureItem}>✓ Support technique dédié VIP</Text>
              <Text style={styles.featureItem}>✓ Conseil personnalisé pour votre business</Text>
              <Text style={styles.featureItem}>✓ Compatible WhatsApp & WhatsApp Business</Text>
            </View>
          </View>
        </Animated.View>

        <Animated.View style={[styles.ctaSection, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
          <View style={styles.ctaCard}>
            <Text style={styles.ctaTitle}>Prêt pour la Révolution ?</Text>
            <Text style={styles.ctaDescription}>
              Rejoignez l'élite des boutiques professionnelles et soyez parmi les premiers à découvrir SHOPNET 10.2.4.
            </Text>
            <TouchableOpacity style={styles.contactButton} onPress={handleContactSupport} activeOpacity={0.8}>
              <Ionicons name="logo-whatsapp" size={24} color="#fff" />
              <Text style={styles.contactButtonText}>Contacter l'équipe SHOPNET</Text>
              <View style={styles.buttonBadge}>
                <Text style={styles.buttonBadgeText}>VIP</Text>
              </View>
            </TouchableOpacity>
            <View style={styles.noteBox}>
              <Ionicons name="time-outline" size={14} color="#FFD700" />
              <Text style={styles.noteText}>
                Cette fonctionnalité utilise le lien officiel WhatsApp. Si l'application n'est pas détectée, vous serez redirigé vers WhatsApp Web.
              </Text>
            </View>
            <View style={styles.guaranteeSection}>
              <Ionicons name="diamond" size={16} color="#FFD700" />
              <Text style={styles.guaranteeText}>Accès Garanti • Support Premium • Satisfaction 100%</Text>
            </View>
            <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
              <Ionicons name="arrow-back" size={18} color={PRO_BLUE} />
              <Text style={styles.backButtonText}>Retour à l'Accueil</Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </ScrollView>

      {/* Footer sans les icônes diamant */}
      <View style={styles.footer}>
        <Text style={styles.footerText}>
          SHOPNET – L'intelligence au cœur du e-commerce africain.
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: SHOPNET_BLUE,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 40,
  },
  backgroundEffects: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  glowCircle1: {
    position: "absolute",
    top: "10%",
    right: "10%",
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: "rgba(66, 165, 245, 0.05)",
  },
  glowCircle2: {
    position: "absolute",
    bottom: "20%",
    left: "5%",
    width: 150,
    height: 150,
    borderRadius: 75,
    backgroundColor: "rgba(66, 165, 245, 0.03)",
  },
  glowCircle3: {
    position: "absolute",
    top: "40%",
    left: "20%",
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: "rgba(66, 165, 245, 0.02)",
  },
  headerSection: {
    alignItems: "center",
    paddingVertical: 50,
    paddingHorizontal: 20,
  },
  vipBadgeContainer: {
    marginBottom: 20,
  },
  vipBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255, 215, 0, 0.15)",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(255, 215, 0, 0.3)",
  },
  vipText: {
    color: "#FFD700",
    fontSize: 12,
    fontWeight: "800",
    marginLeft: 6,
    letterSpacing: 1,
  },
  mainIconContainer: {
    marginBottom: 20,
  },
  iconGlow: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: "rgba(66, 165, 245, 0.1)",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "rgba(66, 165, 245, 0.3)",
    shadowColor: PRO_BLUE,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 10,
  },
  title: {
    fontSize: 42,
    fontWeight: "900",
    color: "#fff",
    textAlign: "center",
    marginBottom: 8,
    letterSpacing: 2,
  },
  subtitle: {
    fontSize: 18,
    color: PRO_BLUE,
    textAlign: "center",
    fontWeight: "600",
    marginBottom: 16,
    letterSpacing: 1,
  },
  exclusiveBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255, 215, 0, 0.1)",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(255, 215, 0, 0.2)",
  },
  exclusiveText: {
    color: "#FFD700",
    fontSize: 10,
    fontWeight: "700",
    marginLeft: 4,
    letterSpacing: 0.5,
  },
  messageSection: {
    paddingHorizontal: 30,
    marginBottom: 40,
  },
  messageTitle: {
    fontSize: 24,
    fontWeight: "700",
    color: "#fff",
    textAlign: "center",
    marginBottom: 16,
  },
  message: {
    fontSize: 16,
    color: "rgba(255,255,255,0.8)",
    textAlign: "center",
    lineHeight: 24,
  },
  countdownSection: {
    paddingHorizontal: 20,
    marginBottom: 40,
  },
  countdownTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: PRO_BLUE,
    textAlign: "center",
    marginBottom: 20,
    letterSpacing: 1,
  },
  countdownGrid: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  timeCard: {
    alignItems: "center",
    backgroundColor: "rgba(30, 42, 59, 0.9)",
    borderRadius: 16,
    padding: 16,
    minWidth: 70,
    borderWidth: 1,
    borderColor: "rgba(66, 165, 245, 0.2)",
  },
  timeValue: {
    fontSize: 24,
    fontWeight: "800",
    color: PRO_BLUE,
    marginBottom: 4,
  },
  timeLabel: {
    fontSize: 10,
    color: "rgba(255,255,255,0.6)",
    fontWeight: "600",
    letterSpacing: 0.5,
  },
  launchedSection: {
    alignItems: "center",
    padding: 30,
    backgroundColor: "rgba(76, 175, 80, 0.1)",
    borderRadius: 20,
    marginHorizontal: 20,
    marginBottom: 40,
    borderWidth: 1,
    borderColor: "rgba(76, 175, 80, 0.3)",
  },
  launchedTitle: {
    fontSize: 24,
    fontWeight: "800",
    color: "#4CAF50",
    marginBottom: 8,
  },
  launchedText: {
    fontSize: 16,
    color: "rgba(255,255,255,0.8)",
    textAlign: "center",
  },
  featuresSection: {
    paddingHorizontal: 20,
    marginBottom: 40,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: "700",
    color: "#fff",
    textAlign: "center",
    marginBottom: 24,
  },
  featuresGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },
  featureCard: {
    width: (SCREEN_WIDTH - 60) / 2,
    backgroundColor: "rgba(30, 42, 59, 0.9)",
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(66, 165, 245, 0.1)",
  },
  featureIconContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "rgba(66, 165, 245, 0.1)",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 12,
  },
  featureTitle: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "700",
    textAlign: "center",
    marginBottom: 6,
  },
  featureDescription: {
    color: "rgba(255,255,255,0.6)",
    fontSize: 11,
    textAlign: "center",
    lineHeight: 14,
  },
  benefitsSection: {
    paddingHorizontal: 20,
    marginBottom: 40,
  },
  benefitsList: {
    backgroundColor: "rgba(30, 42, 59, 0.9)",
    borderRadius: 16,
    padding: 24,
    borderWidth: 1,
    borderColor: "rgba(66, 165, 245, 0.1)",
  },
  benefitItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 16,
  },
  benefitText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "500",
    marginLeft: 12,
    flex: 1,
    lineHeight: 20,
  },
  infoSection: {
    flexDirection: 'row',
    backgroundColor: 'rgba(66, 165, 245, 0.08)',
    borderRadius: 16,
    padding: 20,
    marginHorizontal: 20,
    marginBottom: 30,
    borderWidth: 1,
    borderColor: 'rgba(66, 165, 245, 0.2)',
  },
  infoIcon: {
    marginRight: 12,
    marginTop: 2,
  },
  infoContent: {
    flex: 1,
  },
  infoTitle: {
    color: PRO_BLUE,
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 8,
  },
  infoText: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 12,
  },
  featureList: {
    marginLeft: 4,
  },
  featureItem: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 12,
    lineHeight: 16,
    marginBottom: 4,
  },
  ctaSection: {
    paddingHorizontal: 20,
  },
  ctaCard: {
    backgroundColor: "rgba(30, 42, 59, 0.9)",
    borderRadius: 24,
    padding: 30,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(66, 165, 245, 0.2)",
  },
  ctaTitle: {
    color: "#fff",
    fontSize: 24,
    fontWeight: "700",
    textAlign: "center",
    marginBottom: 12,
  },
  ctaDescription: {
    color: "rgba(255,255,255,0.7)",
    fontSize: 14,
    textAlign: "center",
    marginBottom: 24,
    lineHeight: 20,
  },
  contactButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#25D366",
    paddingVertical: 18,
    paddingHorizontal: 32,
    borderRadius: 16,
    width: "100%",
    marginBottom: 16,
    shadowColor: "#25D366",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
    position: "relative",
  },
  contactButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "800",
    marginLeft: 8,
    flex: 1,
    textAlign: "center",
  },
  buttonBadge: {
    position: "absolute",
    top: -8,
    right: 20,
    backgroundColor: "#FFD700",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  buttonBadgeText: {
    color: "#00182A",
    fontSize: 8,
    fontWeight: "900",
    letterSpacing: 0.5,
  },
  noteBox: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255, 215, 0, 0.1)',
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
    width: '100%',
    borderWidth: 1,
    borderColor: 'rgba(255, 215, 0, 0.2)',
  },
  noteText: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 11,
    marginLeft: 8,
    flex: 1,
    lineHeight: 14,
  },
  guaranteeSection: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 20,
  },
  guaranteeText: {
    color: "rgba(255,255,255,0.6)",
    fontSize: 12,
    marginLeft: 6,
    fontWeight: "500",
  },
  backButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 20,
  },
  backButtonText: {
    color: PRO_BLUE,
    fontSize: 14,
    fontWeight: "600",
    marginLeft: 6,
  },
  footer: {
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: "rgba(66, 165, 245, 0.2)",
    backgroundColor: "rgba(0, 24, 42, 0.95)",
    alignItems: "center",
  },
  footerText: {
    color: PRO_BLUE,
    fontSize: 13,
    fontWeight: "600",
    textAlign: "center",
    letterSpacing: 0.5,
  },
});

export default ComingSoonPage;