

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
  Alert
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter } from "expo-router";
import { MaterialCommunityIcons, MaterialIcons, FontAwesome5, Ionicons } from "@expo/vector-icons";

const SCREEN_WIDTH = Dimensions.get("window").width;
const SHOPNET_BLUE = "#00182A";
const PREMIUM_GOLD = "#FFA726";

export default function PayerPremium() {
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

        const res = await fetch("https://shopnet-backend.onrender.com/api/boutiques/check", {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        setBoutique(data.boutique || null);

        Animated.parallel([
          Animated.timing(fadeAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
          Animated.timing(slideAnim, { toValue: 0, duration: 600, useNativeDriver: true }),
        ]).start();
      } catch (err) {
        console.warn("Erreur boutique:", err);
        Alert.alert("Erreur", "Impossible de charger les informations de la boutique");
      } finally {
        setLoading(false);
      }
    };

    checkBoutique();
  }, []);

  const handlePayment = () => {
    // Rediriger vers la page de paiement
    router.push("/(tabs)/Auth/Boutique/Premium/BoutiquePremium");
  };

  const premiumFeatures = [
    {
      icon: "analytics",
      title: "Analytics Avancés",
      description: "Statistiques détaillées de vos ventes et performances"
    },
    {
      icon: "trending-up",
      title: "Produits en Vedette",
      description: "Mettez vos produits en avant dans les recherches"
    },
    {
      icon: "people",
      title: "Gestion Clients",
      description: "Base de données clients et historique des achats"
    },
    {
      icon: "support-agent",
      title: "Support Prioritaire",
      description: "Réponse garantie sous 2 heures"
    },
    {
      icon: "inventory",
      title: "200 Produits",
      description: "Jusqu'à 200 produits dans votre boutique"
    },
    {
      icon: "local-offer",
      title: "Promotions Avancées",
      description: "Créez des coupons et réductions personnalisées"
    },
    {
      icon: "bar-chart",
      title: "Rapports Détaillés",
      description: "Rapports de vente et analyses de tendances"
    },
    {
      icon: "visibility",
      title: "Visibilité Accrue",
      description: "Positionnement amélioré dans les résultats"
    }
  ];

  if (loading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={PREMIUM_GOLD} />
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
              transform: [{ translateY: slideAnim }]
            }
          ]}
        >
          <View style={styles.crownContainer}>
            <MaterialCommunityIcons name="crown" size={60} color={PREMIUM_GOLD} />
          </View>
          <Text style={styles.heroTitle}>Passer au Premium</Text>
          <Text style={styles.heroSubtitle}>
            Débloquez tout le potentiel de votre boutique
          </Text>

          <View style={styles.priceContainer}>
            <Text style={styles.price}>$9.99</Text>
            <Text style={styles.pricePeriod}>/ mois</Text>
          </View>
          <Text style={styles.priceNote}>Facturation mensuelle • Annulation à tout moment</Text>
        </Animated.View>

        {/* Boutique Info */}
        {boutique && (
          <Animated.View 
            style={[
              styles.boutiqueCard,
              { 
                opacity: fadeAnim,
                transform: [{ translateY: slideAnim }]
              }
            ]}
          >
            <View style={styles.boutiqueHeader}>
              <FontAwesome5 name="store" size={20} color={PREMIUM_GOLD} />
              <Text style={styles.boutiqueName}>{boutique.nom}</Text>
            </View>
            <Text style={styles.boutiqueText}>
              Votre boutique sera mise à niveau vers le plan Premium
            </Text>
          </Animated.View>
        )}

        {/* Features Grid */}
        <Animated.View 
          style={[
            styles.featuresSection,
            { 
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }]
            }
          ]}
        >
          <Text style={styles.sectionTitle}>Fonctionnalités Premium</Text>
          
          <View style={styles.featuresGrid}>
            {premiumFeatures.map((feature, index) => (
              <View key={index} style={styles.featureCard}>
                <View style={styles.featureIcon}>
                  <MaterialIcons name={feature.icon as any} size={24} color={PREMIUM_GOLD} />
                </View>
                <Text style={styles.featureTitle}>{feature.title}</Text>
                <Text style={styles.featureDescription}>{feature.description}</Text>
              </View>
            ))}
          </View>
        </Animated.View>

        {/* Comparison Section */}
        <Animated.View 
          style={[
            styles.comparisonSection,
            { 
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }]
            }
          ]}
        >
          <Text style={styles.sectionTitle}>Standard vs Premium</Text>
          
          <View style={styles.comparisonTable}>
            <View style={styles.comparisonRow}>
              <Text style={styles.featureName}>Nombre de produits</Text>
              <View style={styles.comparisonValues}>
                <Text style={styles.standardValue}>10</Text>
                <Text style={styles.premiumValue}>200</Text>
              </View>
            </View>
            
            <View style={styles.comparisonRow}>
              <Text style={styles.featureName}>Analytics</Text>
              <View style={styles.comparisonValues}>
                <Text style={styles.standardValue}>Basique</Text>
                <Text style={styles.premiumValue}>Avancé</Text>
              </View>
            </View>
            
            <View style={styles.comparisonRow}>
              <Text style={styles.featureName}>Support</Text>
              <View style={styles.comparisonValues}>
                <Text style={styles.standardValue}>Email</Text>
                <Text style={styles.premiumValue}>Prioritaire</Text>
              </View>
            </View>
            
            <View style={styles.comparisonRow}>
              <Text style={styles.featureName}>Promotions</Text>
              <View style={styles.comparisonValues}>
                <MaterialIcons name="close" size={16} color="#ff6b6b" />
                <MaterialIcons name="check" size={16} color={PREMIUM_GOLD} />
              </View>
            </View>
          </View>
        </Animated.View>

        {/* CTA Section */}
        <Animated.View 
          style={[
            styles.ctaSection,
            { 
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }]
            }
          ]}
        >
          <TouchableOpacity 
            style={styles.paymentButton}
            onPress={handlePayment}
          >
            <MaterialCommunityIcons name="lock-open" size={24} color="#fff" />
            <Text style={styles.paymentButtonText}>Débloquer le Premium</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.secondaryButton}
            onPress={() => router.back()}
          >
            <Text style={styles.secondaryButtonText}>Plus tard</Text>
          </TouchableOpacity>

          <View style={styles.securityBadge}>
            <MaterialIcons name="security" size={16} color="rgba(255,255,255,0.6)" />
            <Text style={styles.securityText}>Paiement 100% sécurisé</Text>
          </View>
        </Animated.View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: SHOPNET_BLUE 
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
  crownContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: "rgba(255, 167, 38, 0.1)",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 20,
    borderWidth: 2,
    borderColor: "rgba(255, 167, 38, 0.3)",
  },
  heroTitle: {
    color: "#fff",
    fontSize: 32,
    fontWeight: "800",
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
    color: PREMIUM_GOLD,
    fontSize: 48,
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
  featuresSection: {
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  sectionTitle: {
    color: "#fff",
    fontSize: 24,
    fontWeight: "700",
    marginBottom: 20,
    textAlign: "center",
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
    backgroundColor: "rgba(255, 167, 38, 0.1)",
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
    fontSize: 12,
    textAlign: "center",
    lineHeight: 16,
  },
  comparisonSection: {
    paddingHorizontal: 20,
    marginBottom: 32,
  },
  comparisonTable: {
    backgroundColor: "rgba(30, 42, 59, 0.9)",
    borderRadius: 16,
    padding: 20,
  },
  comparisonRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.1)",
  },
  featureName: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "500",
    flex: 1,
  },
  comparisonValues: {
    flexDirection: "row",
    alignItems: "center",
    gap: 20,
  },
  standardValue: {
    color: "rgba(255,255,255,0.4)",
    fontSize: 14,
    fontWeight: "500",
    width: 60,
    textAlign: "center",
  },
  premiumValue: {
    color: PREMIUM_GOLD,
    fontSize: 14,
    fontWeight: "700",
    width: 60,
    textAlign: "center",
  },
  ctaSection: {
    paddingHorizontal: 20,
    alignItems: "center",
  },
  paymentButton: {
    backgroundColor: PREMIUM_GOLD,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 18,
    paddingHorizontal: 32,
    borderRadius: 16,
    width: "100%",
    marginBottom: 16,
    shadowColor: PREMIUM_GOLD,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  paymentButtonText: {
    color: "#00182A",
    fontSize: 18,
    fontWeight: "800",
    marginLeft: 8,
  },
  secondaryButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
  },
  secondaryButtonText: {
    color: "rgba(255,255,255,0.6)",
    fontSize: 16,
    fontWeight: "500",
  },
  securityBadge: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 16,
  },
  securityText: {
    color: "rgba(255,255,255,0.6)",
    fontSize: 12,
    marginLeft: 4,
  },
});