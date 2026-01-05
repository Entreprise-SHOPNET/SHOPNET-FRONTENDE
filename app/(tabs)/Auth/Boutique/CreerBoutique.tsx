import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Animated,
  Dimensions,
  Platform,
  Alert,
} from "react-native";
import React, { useState, useEffect, useRef } from "react";
import {
  FontAwesome5,
  MaterialCommunityIcons,
  Ionicons,
} from "@expo/vector-icons";
import { useRouter } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";

const SHOPNET_BLUE = "#00182A";
const SHOPNET_GREEN = "#4DB14E";
const PREMIUM_ORANGE = "#FFA726";
const PRO_BLUE = "#42A5F5";
const { width, height } = Dimensions.get("window");

// URL des API de vérification (SEULEMENT Premium)
// 🔹 Serveur Render en production
const PREMIUM_CHECK_URL = "https://shopnet-backend.onrender.com/api/boutique/premium/check";

// 🔹 Serveur local pour développement (commenté)
// const PREMIUM_CHECK_URL = "http://100.64.134.89:5000/api/boutique/premium/check";


// Type pour les informations de boutique
interface BoutiqueInfo {
  hasBoutique: boolean;
  type: string;
  statut: string;
  boutiqueId: number | null;
  boutique: any;
  message: string | null;
  success: boolean;
}

// Fonction pour normaliser les réponses des APIs
const normalizeBoutiqueResponse = (data: any, type: string): BoutiqueInfo | null => {
  if (!data) return null;
  
  console.log(`Normalisation ${type}:`, data);

  // Si l'API retourne un succès mais n'a pas de boutique
  if (data.success && data.hasBoutique === false) {
    return {
      hasBoutique: false,
      type: type.toLowerCase(),
      statut: '',
      boutiqueId: null,
      boutique: null,
      message: data.message || null,
      success: data.success
    };
  }

  // Format de l'API Premium (avec objet boutique)
  if (data.boutique && data.hasBoutique === true) {
    return {
      hasBoutique: true,
      type: 'premium',
      statut: (data.boutique.statut || '')?.toLowerCase(),
      boutiqueId: data.boutique.id || null,
      boutique: data.boutique,
      message: data.message || null,
      success: data.success || true
    };
  }

  // Aucune boutique ou format inconnu
  return {
    hasBoutique: false,
    type: type.toLowerCase(),
    statut: '',
    boutiqueId: null,
    boutique: null,
    message: data.message || null,
    success: data.success || false
  };
};

export default function CreerBoutique() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [boutiqueInfo, setBoutiqueInfo] = useState<BoutiqueInfo | null>(null);
  const [shouldShowCreatePage, setShouldShowCreatePage] = useState(false);
  const [redirecting, setRedirecting] = useState(false);
  const [checkAttempts, setCheckAttempts] = useState(0);

  const scrollY = useRef(new Animated.Value(0)).current;
  const titleScale = useRef(new Animated.Value(1)).current;
  const titleTranslateX = useRef(new Animated.Value(0)).current;
  const titleTranslateY = useRef(new Animated.Value(0)).current;

  const headerHeight = scrollY.interpolate({
    inputRange: [0, 100],
    outputRange: [180, 100],
    extrapolate: "clamp",
  });

  const titleFontSize = scrollY.interpolate({
    inputRange: [0, 100],
    outputRange: [28, 20],
    extrapolate: "clamp",
  });

  const titleMarginTop = scrollY.interpolate({
    inputRange: [0, 100],
    outputRange: [10, 0],
    extrapolate: "clamp",
  });

  const subtitleOpacity = scrollY.interpolate({
    inputRange: [0, 80],
    outputRange: [1, 0],
    extrapolate: "clamp",
  });

  useEffect(() => {
    Animated.parallel([
      Animated.spring(titleScale, {
        toValue: 1,
        speed: 10,
        bounciness: 8,
        useNativeDriver: true,
      }),
      Animated.spring(titleTranslateX, {
        toValue: 0,
        speed: 10,
        bounciness: 8,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  // Fonction pour effectuer une redirection sécurisée
  const safeRedirect = (path: string) => {
    console.log("🚀 Redirection vers:", path);
    setRedirecting(true);
    setTimeout(() => {
      router.replace(path);
    }, 100);
  };

  // Fonction pour rediriger vers la page splash avec message
  const redirectToSplash = (message: string, status: string, type: string) => {
    console.log("🎯 Redirection vers splash:", message);
    setRedirecting(true);
    setTimeout(() => {
      router.replace({
        pathname: "/splash",
        params: { 
          message: message,
          status: status,
          type: type 
        }
      });
    }, 100);
  };

  // Fonction pour vérifier la boutique Premium
  const checkPremiumBoutique = async (token: string): Promise<BoutiqueInfo | null> => {
    try {
      console.log(`🔍 Vérification boutique premium...`);
      
      const response = await fetch(PREMIUM_CHECK_URL, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      if (response.ok) {
        const data = await response.json();
        console.log(`✅ Réponse API premium:`, data);
        return normalizeBoutiqueResponse(data, 'premium');
      }
      
      console.log(`❌ API premium erreur: ${response.status}`);
      return null;
    } catch (error) {
      console.error(`⚠️ Erreur vérification boutique premium:`, error);
      return null;
    }
  };

  // Fonction pour gérer la logique de redirection
  const handleBoutiqueRedirect = (info: BoutiqueInfo) => {
    console.log("🎯 Gestion redirection boutique:", info);
    
    if (!info.hasBoutique) {
      // Aucune boutique → Afficher la page création
      console.log("📭 Aucune boutique premium trouvée");
      setBoutiqueInfo(info);
      setIsLoading(false);
      setShouldShowCreatePage(true);
      return;
    }

    // Normaliser le statut
    const normalizedStatut = info.statut?.toLowerCase();

    console.log(`📊 Statut: ${normalizedStatut}`);

    // Liste des statuts valides (avec et sans accents)
    const validStatuses = ["validé", "valide", "active", "actif"];
    const isBoutiqueValid = validStatuses.includes(normalizedStatut);

    // Si la boutique n'est pas validée
    if (!isBoutiqueValid) {
      console.log(`⏳ Boutique non validée: ${normalizedStatut}`);
      
      switch (normalizedStatut) {
        case "pending_payment":
          console.log("💰 Redirection vers paiement");
          safeRedirect("/(tabs)/Auth/Boutique/Premium/paiementPremium");
          return;
          
        case "pending_validation":
          console.log("⏱️ Redirection vers attente validation");
          redirectToSplash(
            "Votre boutique est en attente de validation par notre équipe",
            normalizedStatut,
            'premium'
          );
          return;
          
        case "rejeté":
        case "rejete":
        case "refusé":
        case "refuse":
          console.log("❌ Boutique rejetée");
          redirectToSplash(
            "Votre boutique a été rejetée. Veuillez contacter le support",
            normalizedStatut,
            'premium'
          );
          return;
          
        default:
          console.log("ℹ️ Statut inconnu, redirection générique");
          redirectToSplash(
            "Votre boutique est en attente de validation",
            normalizedStatut,
            'premium'
          );
          return;
      }
    }

    // Boutique validée → Redirection vers la page Premium
    console.log(`✅ Boutique premium validée, redirection...`);
    safeRedirect("/(tabs)/Auth/Boutique/Premium/BoutiquePremium");
  };

  // Vérifier la boutique Premium
  const checkBoutique = async () => {
    try {
      console.log("🔄 Début vérification boutique premium...");
      setIsLoading(true);
      
      const token = await AsyncStorage.getItem("token");
      console.log("🔐 Token:", token ? "Présent" : "Absent");
      
      if (!token) {
        console.log("🔓 Pas de token, création possible");
        setIsLoading(false);
        setShouldShowCreatePage(true);
        return;
      }

      // Vérifier la boutique Premium
      const result = await checkPremiumBoutique(token);
      
      if (result && result.hasBoutique === true) {
        console.log("🎉 Boutique premium trouvée!");
        setBoutiqueInfo(result);
        handleBoutiqueRedirect(result);
      } else {
        // Aucune boutique trouvée
        console.log("📭 Aucune boutique premium trouvée");
        setBoutiqueInfo({
          hasBoutique: false,
          type: '',
          statut: '',
          boutiqueId: null,
          boutique: null,
          message: null,
          success: false
        });
        setIsLoading(false);
        setShouldShowCreatePage(true);
      }

    } catch (error) {
      console.error("💥 Erreur générale vérification boutique:", error);
      
      // En cas d'erreur, permettre à l'utilisateur d'accéder à la page de création
      setIsLoading(false);
      setShouldShowCreatePage(true);
      
      // Afficher une alerte pour informer l'utilisateur
      Alert.alert(
        "Erreur de connexion",
        "Impossible de vérifier votre boutique. Vous pouvez toujours créer une nouvelle boutique.",
        [{ text: "OK" }]
      );
    }
  };

  useEffect(() => {
    if (checkAttempts === 0) {
      checkBoutique();
      setCheckAttempts(1);
    }
  }, [checkAttempts]);

  // Si on est en train de rediriger
  if (redirecting) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <ActivityIndicator size="large" color={PREMIUM_ORANGE} />
        <Text style={styles.loadingText}>
          Redirection vers votre boutique...
        </Text>
      </View>
    );
  }

  // Si on est en train de charger
  if (isLoading) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <ActivityIndicator size="large" color={PREMIUM_ORANGE} />
        <Text style={styles.loadingText}>
          Vérification de votre boutique...
        </Text>
      </View>
    );
  }

  // Si on doit afficher la page de création
  if (shouldShowCreatePage) {
    // Logique pour gérer le clic sur un type de boutique
    const handleBoutiqueSelection = (boutiqueType: string) => {
      // Vérifier d'abord si l'utilisateur a déjà une boutique
      if (boutiqueInfo?.hasBoutique) {
        Alert.alert(
          "Boutique existante",
          `Vous avez déjà une boutique premium. Vous ne pouvez pas en créer une nouvelle tant que l'actuelle est active.`,
          [{ text: "OK" }]
        );
        return;
      }

      // Rediriger vers le formulaire correspondant
      switch (boutiqueType) {
        case "Premium":
          router.push("/(tabs)/Auth/Boutique/Premium/InscriptionBoutique");
          break;
        case "Pro VIP":
          router.push("/(tabs)/Auth/Boutique/Pro/paiementPro");
          break;
        default:
          console.log(`Type de boutique non reconnu: ${boutiqueType}`);
      }
    };

    const boutiques = [
      {
        type: "Premium",
        iconComponent: (
          <MaterialCommunityIcons name="crown" size={32} color={PREMIUM_ORANGE} />
        ),
        description: "Solution avancée pour développer votre business",
        price: "$9.99/mois",
        features: [
          "Modifier photo de profil et couverture",
          "Statistiques détaillées (ventes, vues, produits populaires)",
          "Historique complet des commandes et retours",
          "Gestion des avis clients et réponses",
          "Navigation rapide avec boutons dédiés",
          "Jusqu'à 200 produits",
          "Analytics avancés",
          "Produits en vedette",
        ],
        limitations: ["Pas de promotions avancées", "Pas de recommandations IA"],
        color: PREMIUM_ORANGE,
      },
      {
        type: "Pro VIP",
        iconComponent: <Ionicons name="rocket" size={32} color={PRO_BLUE} />,
        description: "Solution complète avec marketing et IA",
        price: "$24.99/mois",
        features: [
          "Toutes les fonctionnalités Premium",
          "Mise en avant des produits (top listing)",
          "Gestion de promotions, remises et coupons",
          "Recommandations IA pour les clients",
          "Rapports avancés (ventes, clients, tendances)",
          "Outils marketing intégrés",
          "Accès prioritaire aux nouvelles fonctionnalités",
          "Produits illimités",
          "Support prioritaire 24/7",
          "Certification officielle",
          "Analytics IA avancés",
        ],
        limitations: [],
        color: PRO_BLUE,
      }
    ];

    return (
      <View style={styles.container}>
        <Animated.View style={[styles.header, { height: headerHeight }]}>
          <Animated.View
            style={[styles.titleContainer, { marginTop: titleMarginTop }]}
          >
            <Animated.Text style={[styles.title, { fontSize: titleFontSize }]}>
              Créez Votre Boutique
            </Animated.Text>
            <Animated.Text
              style={[styles.subtitle, { opacity: subtitleOpacity }]}
            >
              Choisissez la formule premium qui correspond à vos ambitions
            </Animated.Text>
          </Animated.View>
        </Animated.View>

        <ScrollView
          contentContainerStyle={styles.scrollContainer}
          onScroll={Animated.event(
            [{ nativeEvent: { contentOffset: { y: scrollY } } }],
            { useNativeDriver: false }
          )}
          scrollEventThrottle={16}
          showsVerticalScrollIndicator={false}
        >
          {boutiques.map((boutique, index) => {
            // Désactiver le bouton si l'utilisateur a déjà une boutique
            const isDisabled = boutiqueInfo?.hasBoutique === true;
            
            return (
              <View
                key={index}
                style={[
                  styles.card, 
                  { borderLeftColor: boutique.color },
                  isDisabled && styles.disabledCard
                ]}
              >
                <View style={styles.cardHeader}>
                  <View style={styles.iconTitleContainer}>
                    <View style={styles.iconContainer}>
                      {boutique.iconComponent}
                    </View>
                    <View>
                      <Text
                        style={[styles.boutiqueType, { 
                          color: isDisabled ? "rgba(255, 255, 255, 0.5)" : boutique.color 
                        }]}
                      >
                        {boutique.type}
                      </Text>
                      <Text style={[styles.price, isDisabled && styles.disabledText]}>
                        {boutique.price}
                      </Text>
                    </View>
                  </View>
                  <Text style={[styles.description, isDisabled && styles.disabledText]}>
                    {boutique.description}
                  </Text>
                </View>

                <View style={styles.featuresContainer}>
                  <Text style={[styles.sectionTitle, isDisabled && styles.disabledText]}>
                    Fonctionnalités incluses:
                  </Text>
                  {boutique.features.map((feature, i) => (
                    <View key={i} style={styles.featureItem}>
                      <FontAwesome5
                        name="check-circle"
                        size={16}
                        color={isDisabled ? "rgba(255, 255, 255, 0.3)" : SHOPNET_GREEN}
                      />
                      <Text style={[styles.featureText, isDisabled && styles.disabledText]}>
                        {feature}
                      </Text>
                    </View>
                  ))}
                </View>

                {boutique.limitations.length > 0 && (
                  <View style={styles.limitationsContainer}>
                    <Text style={[styles.sectionTitle, isDisabled && styles.disabledText]}>
                      Limitations:
                    </Text>
                    {boutique.limitations.map((limitation, i) => (
                      <View key={i} style={styles.limitationItem}>
                        <FontAwesome5
                          name="times-circle"
                          size={16}
                          color="#ff6b6b"
                        />
                        <Text style={[styles.limitationText, isDisabled && styles.disabledText]}>
                          {limitation}
                        </Text>
                      </View>
                    ))}
                  </View>
                )}

                <TouchableOpacity
                  style={[
                    styles.button, 
                    { backgroundColor: isDisabled ? "rgba(255, 255, 255, 0.1)" : boutique.color }
                  ]}
                  onPress={() => handleBoutiqueSelection(boutique.type)}
                  disabled={isDisabled}
                >
                  <Text style={styles.buttonText}>
                    {isDisabled ? "Boutique existante" : `Choisir ${boutique.type}`}
                  </Text>
                  {!isDisabled && (
                    <FontAwesome5
                      name="arrow-right"
                      size={16}
                      color="#fff"
                      style={styles.buttonIcon}
                    />
                  )}
                </TouchableOpacity>
              </View>
            );
          })}

          <View style={styles.footer}>
            <Text style={styles.footerText}>
              Vous pouvez changer de formule à tout moment
            </Text>
            {boutiqueInfo?.hasBoutique && (
              <Text style={[styles.footerText, { color: "#ff6b6b", marginTop: 10, fontWeight: "bold" }]}>
                ⚠️ Vous avez déjà une boutique Premium ({boutiqueInfo.statut})
              </Text>
            )}
            {!boutiqueInfo?.hasBoutique && (
              <Text style={[styles.footerText, { color: SHOPNET_GREEN, marginTop: 10 }]}>
                ✅ Aucune boutique active - Vous pouvez en créer une
              </Text>
            )}
          </View>
        </ScrollView>
      </View>
    );
  }

  // Par défaut, retourner le loader
  return (
    <View style={[styles.container, styles.centerContent]}>
      <ActivityIndicator size="large" color={PREMIUM_ORANGE} />
      <Text style={styles.loadingText}>
        Chargement...
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: SHOPNET_BLUE,
  },
  scrollContainer: {
    padding: 20,
    paddingTop: 180,
  },
  centerContent: {
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: 20,
    color: "#fff",
    fontSize: 16,
    textAlign: "center",
  },
  checkStatusContainer: {
    marginTop: 20,
    alignItems: "center",
  },
  checkStatusText: {
    color: "rgba(255, 255, 255, 0.7)",
    fontSize: 14,
    marginBottom: 10,
  },
  checkStatusRow: {
    flexDirection: "row",
    justifyContent: "space-around",
    width: "80%",
  },
  checkStatusItem: {
    color: "rgba(255, 255, 255, 0.5)",
    fontSize: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.3)",
  },
  checkStatusComplete: {
    color: SHOPNET_GREEN,
    borderColor: SHOPNET_GREEN,
    backgroundColor: "rgba(77, 177, 78, 0.1)",
  },
  header: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    backgroundColor: SHOPNET_BLUE,
    zIndex: 1000,
    padding: 20,
    justifyContent: "flex-end",
    paddingBottom: 15,
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
      },
      android: {
        elevation: 5,
      },
    }),
  },
  titleContainer: { alignItems: "center" },
  title: {
    fontWeight: "800",
    color: "#fff",
    textAlign: "center",
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: "rgba(255, 255, 255, 0.8)",
    textAlign: "center",
    paddingHorizontal: 20,
    lineHeight: 20,
  },
  card: {
    backgroundColor: "rgba(30, 42, 59, 0.9)",
    borderRadius: 12,
    padding: 20,
    marginBottom: 24,
    borderLeftWidth: 4,
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      android: { elevation: 3 },
    }),
  },
  disabledCard: {
    opacity: 0.6,
  },
  cardHeader: { marginBottom: 20 },
  iconTitleContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  iconContainer: { marginRight: 12 },
  boutiqueType: { fontSize: 22, fontWeight: "800", marginBottom: 4 },
  price: { fontSize: 18, fontWeight: "700", color: "#fff" },
  description: {
    fontSize: 16,
    color: "rgba(255, 255, 255, 0.8)",
    lineHeight: 22,
  },
  featuresContainer: { marginBottom: 20 },
  limitationsContainer: { marginBottom: 20 },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#fff",
    marginBottom: 12,
  },
  featureItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 10,
  },
  limitationItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 10,
  },
  featureText: {
    fontSize: 15,
    color: "rgba(255, 255, 255, 0.9)",
    marginLeft: 10,
    flex: 1,
    lineHeight: 20,
  },
  limitationText: {
    fontSize: 15,
    color: "rgba(255, 255, 255, 0.6)",
    marginLeft: 10,
    flex: 1,
    lineHeight: 20,
    textDecorationLine: "line-through",
  },
  disabledText: {
    color: "rgba(255, 255, 255, 0.4)",
  },
  button: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 8,
  },
  buttonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
    marginRight: 8,
  },
  buttonIcon: { marginTop: 2 },
  footer: {
    marginTop: 10,
    padding: 15,
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    borderRadius: 8,
  },
  footerText: {
    color: "rgba(255, 255, 255, 0.7)",
    fontSize: 14,
    textAlign: "center",
  },
});