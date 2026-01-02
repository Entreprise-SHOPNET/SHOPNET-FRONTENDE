

// app/(tabs)/Auth/Boutique/Premium/PayerPremium.tsx
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
import { useRouter, useLocalSearchParams } from "expo-router";
import {
  MaterialCommunityIcons,
  MaterialIcons,
  FontAwesome5,
  Ionicons,
} from "@expo/vector-icons";

const SCREEN_WIDTH = Dimensions.get("window").width;
const SHOPNET_BLUE = "#00182A";
const PREMIUM_GOLD = "#FFA726";
const SUCCESS_GREEN = "#4CAF50";
const PRO_BLUE = "#42A5F5";

export default function PayerPremium() {
  const router = useRouter();
  const params = useLocalSearchParams();
  
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;
  const [loading, setLoading] = useState(true);
  const [boutique, setBoutique] = useState<any | null>(null);
  const [boutiqueId, setBoutiqueId] = useState<string | null>(null);
  const [isNewBoutique, setIsNewBoutique] = useState(false);

  useEffect(() => {
    const initializeData = async () => {
      try {
        setLoading(true);
        
        console.log("🔍 Params reçus:", params);
        
        // 1. Vérifier d'abord les paramètres de navigation (depuis CreerBoutique)
        if (params.boutiqueId) {
          const id = Array.isArray(params.boutiqueId) 
            ? params.boutiqueId[0] 
            : params.boutiqueId;
          
          setBoutiqueId(id);
          setIsNewBoutique(params.isNewBoutique === 'true');
          
          // Créer l'objet boutique à partir des paramètres
          const boutiqueData: any = {
            _id: id,
            id: id,
            nom: params.boutiqueNom 
              ? (Array.isArray(params.boutiqueNom) ? params.boutiqueNom[0] : params.boutiqueNom)
              : "Ma Boutique",
            type_boutique: params.boutiqueType
              ? (Array.isArray(params.boutiqueType) ? params.boutiqueType[0] : params.boutiqueType)
              : "Premium",
            categorie: params.boutiqueCategorie
              ? (Array.isArray(params.boutiqueCategorie) ? params.boutiqueCategorie[0] : params.boutiqueCategorie)
              : "",
            email: params.boutiqueEmail
              ? (Array.isArray(params.boutiqueEmail) ? params.boutiqueEmail[0] : params.boutiqueEmail)
              : "",
            phone: params.boutiquePhone
              ? (Array.isArray(params.boutiquePhone) ? params.boutiquePhone[0] : params.boutiquePhone)
              : "",
            ville: params.boutiqueVille
              ? (Array.isArray(params.boutiqueVille) ? params.boutiqueVille[0] : params.boutiqueVille)
              : "",
            pays: params.boutiquePays
              ? (Array.isArray(params.boutiquePays) ? params.boutiquePays[0] : params.boutiquePays)
              : "RDC",
            adresse: params.boutiqueAdresse
              ? (Array.isArray(params.boutiqueAdresse) ? params.boutiqueAdresse[0] : params.boutiqueAdresse)
              : "",
          };
          
          setBoutique(boutiqueData);
          
          // Stocker les données dans AsyncStorage
          await AsyncStorage.setItem("currentBoutiqueId", id);
          await AsyncStorage.setItem("currentBoutiqueData", JSON.stringify(boutiqueData));
          
          console.log("✅ Boutique créée à partir des params:", boutiqueData);
        } 
        // 2. Sinon, vérifier dans AsyncStorage
        else {
          console.log("🔄 Aucun paramètre, vérification AsyncStorage...");
          
          const storedBoutiqueData = await AsyncStorage.getItem("currentBoutiqueData");
          const storedBoutiqueId = await AsyncStorage.getItem("currentBoutiqueId");
          
          if (storedBoutiqueData) {
            const boutiqueData = JSON.parse(storedBoutiqueData);
            setBoutique(boutiqueData);
            setBoutiqueId(boutiqueData.id || boutiqueData._id || storedBoutiqueId);
            console.log("✅ Boutique récupérée depuis AsyncStorage:", boutiqueData);
          } 
          // 3. Dernier recours: vérifier via l'API
          else if (storedBoutiqueId) {
            setBoutiqueId(storedBoutiqueId);
            await fetchBoutiqueById(storedBoutiqueId);
          }
          else {
            console.log("⚠️ Aucune donnée de boutique trouvée");
            // Si aucune boutique n'est trouvée, on peut rediriger ou afficher un message
          }
        }

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
        console.warn("❌ Erreur initialisation boutique:", err);
        Alert.alert(
          "Erreur",
          "Impossible de charger les informations de la boutique",
        );
      } finally {
        setLoading(false);
      }
    };

    initializeData();
  }, []); // Empty dependency array to run only once

  // Fonction pour récupérer une boutique par ID
  const fetchBoutiqueById = async (id: string) => {
    try {
      const token = await AsyncStorage.getItem("userToken");
      if (!token) return;

      const response = await fetch(
        `https://shopnet-backend.onrender.com/api/boutiques/${id}`,
        {
          headers: { 
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
        },
      );

      if (response.ok) {
        const data = await response.json();
        if (data.success && data.boutique) {
          setBoutique(data.boutique);
          await AsyncStorage.setItem("currentBoutiqueData", JSON.stringify(data.boutique));
        }
      }
    } catch (err) {
      console.warn("Erreur récupération boutique par ID:", err);
    }
  };

  const handlePayment = async () => {
    if (!boutiqueId) {
      Alert.alert(
        "Erreur",
        "ID de boutique manquant. Veuillez d'abord créer une boutique.",
        [
          {
            text: "OK",
            onPress: () => router.push("/(tabs)/Auth/Boutique/CreerBoutique"),
          },
        ]
      );
      return;
    }

    // Stocker l'ID de la boutique pour la page de paiement
    await AsyncStorage.setItem("premiumBoutiqueId", boutiqueId);
    
    // Préparer les données à passer à la page suivante
    const paymentParams: any = { 
      boutiqueId: boutiqueId,
    };
    
    // Ajouter les informations de la boutique si disponibles
    if (boutique) {
      paymentParams.boutiqueNom = boutique.nom || "Ma Boutique";
      paymentParams.boutiqueType = boutique.type || boutique.type_boutique || "premium";
      paymentParams.boutiqueCategorie = boutique.categorie || "";
      paymentParams.boutiqueVille = boutique.ville || "";
      paymentParams.boutiquePays = boutique.pays || "RDC";
      paymentParams.boutiqueEmail = boutique.email || "";
      paymentParams.boutiquePhone = boutique.phone || "";
      paymentParams.boutiqueAdresse = boutique.adresse || "";
      
      // Stocker les données pour la page suivante
      await AsyncStorage.setItem("boutiqueForPayment", JSON.stringify(boutique));
    }
    
    console.log("🚀 Redirection vers paiement avec params:", paymentParams);
    
    // Rediriger vers la page de paiement
    router.push({
      pathname: "/(tabs)/Auth/Boutique/Premium/PaiementBoutique",
      params: paymentParams
    });
  };

  const handleBack = () => {
    router.push("/(tabs)/Auth/Boutique");
  };

  const premiumFeatures = [
    {
      icon: "analytics",
      title: "Analytics Avancés",
      description: "Statistiques détaillées de vos ventes et performances",
    },
    {
      icon: "trending-up",
      title: "Produits en Vedette",
      description: "Mettez vos produits en avant dans les recherches",
    },
    {
      icon: "people",
      title: "Gestion Clients",
      description: "Base de données clients et historique des achats",
    },
    {
      icon: "support-agent",
      title: "Support Prioritaire",
      description: "Réponse garantie sous 2 heures",
    },
    {
      icon: "inventory",
      title: "200 Produits",
      description: "Jusqu'à 200 produits dans votre boutique",
    },
    {
      icon: "local-offer",
      title: "Promotions Avancées",
      description: "Créez des coupons et réductions personnalisées",
    },
    {
      icon: "bar-chart",
      title: "Rapports Détaillés",
      description: "Rapports de vente et analyses de tendances",
    },
    {
      icon: "visibility",
      title: "Visibilité Accrue",
      description: "Positionnement amélioré dans les résultats",
    },
  ];

  if (loading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={PREMIUM_GOLD} />
        <Text style={styles.loadingText}>Chargement de votre boutique...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={SHOPNET_BLUE} />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={handleBack}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Abonnement Premium</Text>
          <Text style={styles.headerSubtitle}>9.99 USD / mois</Text>
        </View>
        <View style={styles.headerRight}>
          {boutiqueId && (
            <View style={styles.idBadge}>
              <Text style={styles.idText}>
                {isNewBoutique ? "NOUVEAU" : "ID: " + boutiqueId.substring(0, 6)}
              </Text>
            </View>
          )}
        </View>
      </View>

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
          <View style={styles.crownContainer}>
            <MaterialCommunityIcons
              name="crown"
              size={60}
              color={PREMIUM_GOLD}
            />
          </View>
          <Text style={styles.heroTitle}>Passer au Premium</Text>
          <Text style={styles.heroSubtitle}>
            Débloquez tout le potentiel de votre boutique
          </Text>

          <View style={styles.priceContainer}>
            <Text style={styles.price}>$9.99</Text>
            <Text style={styles.pricePeriod}>/ mois</Text>
          </View>
          <Text style={styles.priceNote}>
            Facturation mensuelle • Annulation à tout moment
          </Text>
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
              <FontAwesome5 name="store" size={20} color={PREMIUM_GOLD} />
              <Text style={styles.boutiqueName}>{boutique.nom}</Text>
            </View>
            
            {/* Détails de la boutique */}
            <View style={styles.boutiqueDetails}>
              {boutique.type_boutique && (
                <View style={styles.boutiqueDetailRow}>
                  <MaterialIcons name="category" size={16} color={PRO_BLUE} />
                  <Text style={styles.boutiqueDetailText}>
                    {boutique.type_boutique}
                  </Text>
                </View>
              )}
              
              {boutique.categorie && (
                <View style={styles.boutiqueDetailRow}>
                  <MaterialIcons name="label" size={16} color={SUCCESS_GREEN} />
                  <Text style={styles.boutiqueDetailText}>
                    {boutique.categorie}
                  </Text>
                </View>
              )}
              
              {boutique.ville && (
                <View style={styles.boutiqueDetailRow}>
                  <MaterialIcons name="location-on" size={16} color="#FF6B8B" />
                  <Text style={styles.boutiqueDetailText}>
                    {boutique.ville}, {boutique.pays || "RDC"}
                  </Text>
                </View>
              )}
              
              {boutiqueId && (
                <View style={styles.boutiqueDetailRow}>
                  <MaterialIcons name="fingerprint" size={16} color="rgba(255,255,255,0.5)" />
                  <Text style={styles.idFullText}>
                    ID: {boutiqueId}
                  </Text>
                </View>
              )}
            </View>
            
            <View style={styles.upgradeStatus}>
              <MaterialIcons name="upgrade" size={18} color={PREMIUM_GOLD} />
              <Text style={styles.upgradeText}>
                {isNewBoutique 
                  ? "Votre nouvelle boutique sera activée avec le plan Premium" 
                  : "Votre boutique sera mise à niveau vers le plan Premium"}
              </Text>
            </View>
          </Animated.View>
        )}

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
          <Text style={styles.sectionTitle}>Fonctionnalités Premium</Text>

          <View style={styles.featuresGrid}>
            {premiumFeatures.map((feature, index) => (
              <View key={index} style={styles.featureCard}>
                <View style={styles.featureIcon}>
                  <MaterialIcons
                    name={feature.icon as any}
                    size={24}
                    color={PREMIUM_GOLD}
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

        {/* Comparison Section */}
        <Animated.View
          style={[
            styles.comparisonSection,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }],
            },
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
              transform: [{ translateY: slideAnim }],
            },
          ]}
        >
          {/* Info Card */}
          <View style={styles.infoCard}>
            <MaterialIcons name="info" size={20} color={PRO_BLUE} />
            <Text style={styles.infoText}>
              Après le paiement, votre boutique sera immédiatement activée avec toutes les fonctionnalités premium.
            </Text>
          </View>

          {/* Payment Button */}
          <TouchableOpacity
            style={styles.paymentButton}
            onPress={handlePayment}
            disabled={!boutiqueId}
          >
            <MaterialCommunityIcons name="lock-open" size={24} color="#00182A" />
            <Text style={styles.paymentButtonText}>Débloquer le Premium</Text>
            <MaterialIcons name="arrow-forward" size={20} color="#00182A" />
          </TouchableOpacity>

          {/* Secondary Buttons */}
          <View style={styles.secondaryButtons}>
            <TouchableOpacity
              style={styles.helpButton}
              onPress={() => router.push("/faq")}
            >
              <MaterialIcons name="help" size={18} color="#fff" />
              <Text style={styles.helpButtonText}>Questions fréquentes</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.backButtonSecondary}
              onPress={handleBack}
            >
              <Text style={styles.backButtonText}>Revenir plus tard</Text>
            </TouchableOpacity>
          </View>

          {/* Security Badge */}
          <View style={styles.securityBadge}>
            <MaterialIcons
              name="security"
              size={18}
              color="rgba(255,255,255,0.6)"
            />
            <Text style={styles.securityText}>Paiement 100% sécurisé</Text>
          </View>

          {/* Guarantee Card */}
          <View style={styles.guaranteeCard}>
            <MaterialIcons name="verified" size={20} color={SUCCESS_GREEN} />
            <Text style={styles.guaranteeText}>
              Garantie satisfait ou remboursé sous 7 jours
            </Text>
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
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.1)",
  },
  backButton: {
    padding: 8,
  },
  headerCenter: {
    alignItems: "center",
  },
  headerTitle: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "700",
  },
  headerSubtitle: {
    color: PREMIUM_GOLD,
    fontSize: 12,
    fontWeight: "600",
    marginTop: 2,
  },
  headerRight: {
    width: 80,
    alignItems: "flex-end",
  },
  idBadge: {
    backgroundColor: "rgba(66, 165, 245, 0.2)",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "rgba(66, 165, 245, 0.4)",
  },
  idText: {
    color: PRO_BLUE,
    fontSize: 10,
    fontWeight: "700",
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
    fontSize: 16,
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
    marginBottom: 12,
  },
  boutiqueName: {
    color: "#fff",
    fontSize: 20,
    fontWeight: "700",
    marginLeft: 12,
  },
  boutiqueDetails: {
    backgroundColor: "rgba(0, 0, 0, 0.2)",
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  boutiqueDetailRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
  },
  boutiqueDetailText: {
    color: "rgba(255,255,255,0.8)",
    fontSize: 14,
    marginLeft: 12,
    flex: 1,
  },
  idFullText: {
    color: "rgba(255,255,255,0.5)",
    fontSize: 12,
    marginLeft: 12,
    fontFamily: "monospace",
  },
  upgradeStatus: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255, 167, 38, 0.1)",
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(255, 167, 38, 0.3)",
  },
  upgradeText: {
    color: PREMIUM_GOLD,
    fontSize: 14,
    fontWeight: "600",
    marginLeft: 8,
    flex: 1,
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
  infoCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: "rgba(66, 165, 245, 0.1)",
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
    width: "100%",
  },
  infoText: {
    color: "rgba(255,255,255,0.9)",
    fontSize: 14,
    marginLeft: 12,
    flex: 1,
    lineHeight: 20,
  },
  paymentButton: {
    backgroundColor: PREMIUM_GOLD,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 18,
    paddingHorizontal: 24,
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
    flex: 1,
  },
  secondaryButtons: {
    flexDirection: "row",
    justifyContent: "space-between",
    width: "100%",
    marginBottom: 16,
  },
  helpButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 20,
    backgroundColor: "rgba(66, 165, 245, 0.2)",
    borderRadius: 12,
  },
  helpButtonText: {
    color: PRO_BLUE,
    fontSize: 14,
    fontWeight: "600",
    marginLeft: 8,
  },
  backButtonSecondary: {
    paddingVertical: 12,
    paddingHorizontal: 20,
  },
  backButtonText: {
    color: "rgba(255,255,255,0.6)",
    fontSize: 14,
    fontWeight: "500",
  },
  securityBadge: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },
  securityText: {
    color: "rgba(255,255,255,0.6)",
    fontSize: 14,
    marginLeft: 8,
  },
  guaranteeCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(76, 175, 80, 0.1)",
    borderRadius: 12,
    padding: 16,
    width: "100%",
  },
  guaranteeText: {
    color: "rgba(255,255,255,0.8)",
    fontSize: 14,
    marginLeft: 12,
    flex: 1,
  },
});