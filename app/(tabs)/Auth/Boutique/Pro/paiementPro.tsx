import React, { useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  SafeAreaView,
  ScrollView,
  Dimensions,
  StatusBar,
  ActivityIndicator,
  Alert,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter } from "expo-router";
import {
  MaterialCommunityIcons,
  MaterialIcons,
  FontAwesome5,
  Ionicons,
} from "@expo/vector-icons";

const SCREEN_WIDTH = Dimensions.get("window").width;
const SHOPNET_BLUE = "#00182A";
const PRO_BLUE = "#42A5F5";

export default function PayerPro() {
  const router = useRouter();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;
  const [loading, setLoading] = useState(true);
  const [boutique, setBoutique] = useState<any | null>(null);

  useEffect(() => {
    const checkBoutique = async () => {
      try {
        const token = await AsyncStorage.getItem("userToken");
        if (!token) {
          router.replace("/splash");
          return;
        }

        const res = await fetch(
          "https://shopnet-backend.onrender.com/api/boutiques/check",
          {
            headers: { Authorization: `Bearer ${token}` },
          },
        );
        const data = await res.json();
        setBoutique(data.boutique || null);

        Animated.parallel([
          Animated.timing(fadeAnim, {
            toValue: 1,
            duration: 800,
            useNativeDriver: true,
          }),
          Animated.timing(slideAnim, {
            toValue: 0,
            duration: 600,
            useNativeDriver: true,
          }),
        ]).start();
      } catch (err) {
        console.warn("Erreur boutique:", err);
        Alert.alert(
          "Erreur",
          "Impossible de charger les informations de la boutique",
        );
      } finally {
        setLoading(false);
      }
    };

    checkBoutique();
  }, []);

  const handlePayment = () => {
    router.push("/MisAjour");
  };

  const proFeatures = [
    {
      icon: "rocket",
      title: "Produits Illimités",
      description: "Publiez autant de produits que vous voulez",
    },
    {
      icon: "ai",
      title: "Recommandations IA",
      description: "Système d'intelligence artificielle intégré",
    },
    {
      icon: "trending-up",
      title: "Marketing Avancé",
      description: "Outils marketing et publicités intégrés",
    },
    {
      icon: "analytics",
      title: "Analytics Pro",
      description: "Statistiques avancées et prédictions",
    },
    {
      icon: "support-agent",
      title: "Support 24/7",
      description: "Support prioritaire 24 heures sur 24",
    },
    {
      icon: "star",
      title: "Mise en Avant",
      description: "Positionnement premium dans les résultats",
    },
    {
      icon: "dashboard",
      title: "Tableau de Bord Pro",
      description: "Interface de gestion professionnelle",
    },
    {
      icon: "bolt",
      title: "Performances Max",
      description: "Vitesse et performances optimisées",
    },
    {
      icon: "security",
      title: "Sécurité Renforcée",
      description: "Protection avancée des données",
    },
    {
      icon: "group",
      title: "Gestion d'Équipe",
      description: "Ajoutez des collaborateurs à votre boutique",
    },
    {
      icon: "inventory",
      title: "Gestion de Stock",
      description: "Système de stock avancé avec alertes",
    },
    {
      icon: "payments",
      title: "Paiements Multiples",
      description: "Tous les moyens de paiement acceptés",
    },
  ];

  if (loading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={PRO_BLUE} />
        <Text style={styles.loadingText}>Chargement...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={SHOPNET_BLUE} />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Hero Section */}
        <Animated.View
          style={[
            styles.heroSection,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }],
            },
          ]}
        >
          <View style={styles.rocketContainer}>
            <Ionicons name="rocket" size={60} color={PRO_BLUE} />
          </View>
          <Text style={styles.heroTitle}>Passer au Pro</Text>
          <Text style={styles.heroSubtitle}>
            La solution ultime pour les professionnels
          </Text>

          <View style={styles.priceContainer}>
            <Text style={styles.price}>$24.99</Text>
            <Text style={styles.pricePeriod}>/ mois</Text>
          </View>
          <Text style={styles.priceNote}>
            Facturation mensuelle • Annulation à tout moment
          </Text>

          <View style={styles.badgePro}>
            <Ionicons name="star" size={14} color="#fff" />
            <Text style={styles.badgeText}>RECOMMANDÉ POUR LES PROS</Text>
          </View>
        </Animated.View>

        {/* Boutique Info */}
        {boutique && (
          <Animated.View
            style={[
              styles.boutiqueCard,
              {
                opacity: fadeAnim,
                transform: [{ translateY: slideAnim }],
              },
            ]}
          >
            <View style={styles.boutiqueHeader}>
              <FontAwesome5 name="store" size={20} color={PRO_BLUE} />
              <Text style={styles.boutiqueName}>{boutique.nom}</Text>
            </View>
            <Text style={styles.boutiqueText}>
              Votre boutique sera mise à niveau vers le plan Pro avec toutes les
              fonctionnalités avancées
            </Text>
          </Animated.View>
        )}

        {/* Comparison Table */}
        <Animated.View
          style={[
            styles.comparisonSection,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }],
            },
          ]}
        >
          <Text style={styles.sectionTitle}>Comparez les Formules</Text>

          <View style={styles.comparisonTable}>
            <View style={styles.comparisonHeader}>
              <Text style={styles.comparisonHeaderText}>Fonctionnalités</Text>
              <Text style={styles.comparisonHeaderText}>Standard</Text>
              <Text style={styles.comparisonHeaderText}>Premium</Text>
              <Text style={[styles.comparisonHeaderText, styles.proHeader]}>
                Pro
              </Text>
            </View>

            {[
              {
                feature: "Produits",
                standard: "10",
                premium: "200",
                pro: "Illimité",
              },
              {
                feature: "Analytics",
                standard: "Basique",
                premium: "Avancé",
                pro: "Professionnel",
              },
              {
                feature: "Support",
                standard: "Email",
                premium: "Prioritaire",
                pro: "24/7",
              },
              { feature: "IA", standard: "❌", premium: "❌", pro: "✅" },
              {
                feature: "Marketing",
                standard: "❌",
                premium: "Basique",
                pro: "Avancé",
              },
              {
                feature: "Sécurité",
                standard: "Standard",
                premium: "Standard",
                pro: "Renforcée",
              },
            ].map((item, index) => (
              <View key={index} style={styles.comparisonRow}>
                <Text style={styles.featureName}>{item.feature}</Text>
                <Text style={styles.standardValue}>{item.standard}</Text>
                <Text style={styles.premiumValue}>{item.premium}</Text>
                <Text style={styles.proValue}>{item.pro}</Text>
              </View>
            ))}
          </View>
        </Animated.View>

        {/* Features Grid */}
        <Animated.View
          style={[
            styles.featuresSection,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }],
            },
          ]}
        >
          <Text style={styles.sectionTitle}>
            Fonctionnalités Pro Exclusives
          </Text>

          <View style={styles.featuresGrid}>
            {proFeatures.map((feature, index) => (
              <View key={index} style={styles.featureCard}>
                <View style={styles.featureIcon}>
                  <MaterialIcons
                    name={feature.icon as any}
                    size={24}
                    color={PRO_BLUE}
                  />
                </View>
                <Text style={styles.featureTitle}>{feature.title}</Text>
                <Text style={styles.featureDescription}>
                  {feature.description}
                </Text>
              </View>
            ))}
          </View>
        </Animated.View>

        {/* Benefits Section */}
        <Animated.View
          style={[
            styles.benefitsSection,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }],
            },
          ]}
        >
          <Text style={styles.sectionTitle}>Avantages Pro</Text>

          <View style={styles.benefitsList}>
            <View style={styles.benefitItem}>
              <Ionicons name="checkmark-circle" size={20} color={PRO_BLUE} />
              <Text style={styles.benefitText}>
                Augmentation moyenne de 300% des ventes
              </Text>
            </View>
            <View style={styles.benefitItem}>
              <Ionicons name="checkmark-circle" size={20} color={PRO_BLUE} />
              <Text style={styles.benefitText}>
                Gestion professionnelle de votre business
              </Text>
            </View>
            <View style={styles.benefitItem}>
              <Ionicons name="checkmark-circle" size={20} color={PRO_BLUE} />
              <Text style={styles.benefitText}>Outils marketing intégrés</Text>
            </View>
            <View style={styles.benefitItem}>
              <Ionicons name="checkmark-circle" size={20} color={PRO_BLUE} />
              <Text style={styles.benefitText}>Support dédié 24/7</Text>
            </View>
          </View>
        </Animated.View>

        {/* CTA Section */}
        <Animated.View
          style={[
            styles.ctaSection,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }],
            },
          ]}
        >
          <View style={styles.ctaCard}>
            <Text style={styles.ctaTitle}>
              Prêt à Passer au Niveau Supérieur ?
            </Text>
            <Text style={styles.ctaDescription}>
              Rejoignez les boutiques professionnelles qui multiplient leurs
              ventes
            </Text>

            <TouchableOpacity
              style={styles.paymentButton}
              onPress={handlePayment}
            >
              <Ionicons name="rocket" size={24} color="#fff" />
              <Text style={styles.paymentButtonText}>Débloquer le Pro</Text>
            </TouchableOpacity>

            <View style={styles.guaranteeBadge}>
              <MaterialIcons name="verified" size={16} color={PRO_BLUE} />
              <Text style={styles.guaranteeText}>
                Satisfait ou remboursé sous 30 jours
              </Text>
            </View>

            <TouchableOpacity
              style={styles.secondaryButton}
              onPress={() => router.back()}
            >
              <Text style={styles.secondaryButtonText}>
                Comparer avec Premium
              </Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </ScrollView>
    </SafeAreaView>
  );
}

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
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: SHOPNET_BLUE,
  },
  loadingText: {
    color: "#fff",
    marginTop: 12,
    fontSize: 16,
  },
  heroSection: {
    alignItems: "center",
    paddingVertical: 40,
    paddingHorizontal: 20,
  },
  rocketContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: "rgba(66, 165, 245, 0.1)",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 20,
    borderWidth: 2,
    borderColor: "rgba(66, 165, 245, 0.3)",
  },
  heroTitle: {
    color: "#fff",
    fontSize: 36,
    fontWeight: "900",
    textAlign: "center",
    marginBottom: 8,
  },
  heroSubtitle: {
    color: "rgba(255,255,255,0.8)",
    fontSize: 18,
    textAlign: "center",
    marginBottom: 24,
    lineHeight: 24,
  },
  priceContainer: {
    flexDirection: "row",
    alignItems: "baseline",
    marginBottom: 8,
  },
  price: {
    color: PRO_BLUE,
    fontSize: 52,
    fontWeight: "900",
  },
  pricePeriod: {
    color: "rgba(255,255,255,0.7)",
    fontSize: 18,
    fontWeight: "600",
    marginLeft: 4,
  },
  priceNote: {
    color: "rgba(255,255,255,0.5)",
    fontSize: 14,
    textAlign: "center",
    marginBottom: 16,
  },
  badgePro: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: PRO_BLUE,
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 20,
    marginTop: 8,
  },
  badgeText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "800",
    marginLeft: 4,
  },
  boutiqueCard: {
    backgroundColor: "rgba(30, 42, 59, 0.9)",
    marginHorizontal: 20,
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
  },
  boutiqueHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  boutiqueName: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "700",
    marginLeft: 12,
  },
  boutiqueText: {
    color: "rgba(255,255,255,0.7)",
    fontSize: 14,
    lineHeight: 20,
  },
  comparisonSection: {
    paddingHorizontal: 20,
    marginBottom: 32,
  },
  sectionTitle: {
    color: "#fff",
    fontSize: 24,
    fontWeight: "700",
    marginBottom: 20,
    textAlign: "center",
  },
  comparisonTable: {
    backgroundColor: "rgba(30, 42, 59, 0.9)",
    borderRadius: 16,
    overflow: "hidden",
  },
  comparisonHeader: {
    flexDirection: "row",
    backgroundColor: "rgba(66, 165, 245, 0.2)",
    paddingVertical: 16,
    paddingHorizontal: 12,
  },
  comparisonHeaderText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "700",
    flex: 1,
    textAlign: "center",
  },
  proHeader: {
    color: PRO_BLUE,
  },
  comparisonRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.1)",
  },
  featureName: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "500",
    flex: 1,
  },
  standardValue: {
    color: "rgba(255,255,255,0.4)",
    fontSize: 12,
    fontWeight: "500",
    flex: 1,
    textAlign: "center",
  },
  premiumValue: {
    color: "#FFA726",
    fontSize: 12,
    fontWeight: "500",
    flex: 1,
    textAlign: "center",
  },
  proValue: {
    color: PRO_BLUE,
    fontSize: 12,
    fontWeight: "700",
    flex: 1,
    textAlign: "center",
  },
  featuresSection: {
    paddingHorizontal: 20,
    marginBottom: 32,
  },
  featuresGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },
  featureCard: {
    width: (SCREEN_WIDTH - 60) / 2,
    backgroundColor: "rgba(30, 42, 59, 0.9)",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    alignItems: "center",
  },
  featureIcon: {
    width: 50,
    height: 50,
    borderRadius: 25,
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
    marginBottom: 4,
  },
  featureDescription: {
    color: "rgba(255,255,255,0.6)",
    fontSize: 11,
    textAlign: "center",
    lineHeight: 14,
  },
  benefitsSection: {
    paddingHorizontal: 20,
    marginBottom: 32,
  },
  benefitsList: {
    backgroundColor: "rgba(30, 42, 59, 0.9)",
    borderRadius: 16,
    padding: 20,
  },
  benefitItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 12,
  },
  benefitText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "500",
    marginLeft: 12,
    flex: 1,
    lineHeight: 20,
  },
  ctaSection: {
    paddingHorizontal: 20,
  },
  ctaCard: {
    backgroundColor: "rgba(30, 42, 59, 0.9)",
    borderRadius: 20,
    padding: 24,
    alignItems: "center",
  },
  ctaTitle: {
    color: "#fff",
    fontSize: 20,
    fontWeight: "700",
    textAlign: "center",
    marginBottom: 8,
  },
  ctaDescription: {
    color: "rgba(255,255,255,0.7)",
    fontSize: 14,
    textAlign: "center",
    marginBottom: 24,
    lineHeight: 20,
  },
  paymentButton: {
    backgroundColor: PRO_BLUE,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 18,
    paddingHorizontal: 32,
    borderRadius: 16,
    width: "100%",
    marginBottom: 16,
    shadowColor: PRO_BLUE,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  paymentButtonText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "800",
    marginLeft: 8,
  },
  guaranteeBadge: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },
  guaranteeText: {
    color: "rgba(255,255,255,0.6)",
    fontSize: 12,
    marginLeft: 4,
  },
  secondaryButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
  },
  secondaryButtonText: {
    color: "rgba(255,255,255,0.6)",
    fontSize: 14,
    fontWeight: "500",
  },
});
