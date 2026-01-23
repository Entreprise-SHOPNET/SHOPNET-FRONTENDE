


import React, { useState, useRef, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Animated,
  Dimensions,
  SafeAreaView,
  StatusBar,
  ActivityIndicator,
  Alert,
  Switch,
  Platform,
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import * as Notifications from 'expo-notifications';
import { authApi, getValidToken } from "../authService";

const { width, height } = Dimensions.get("window");

// Couleurs SHOPNET PRO Premium
const SHOPNET_BLUE = "#00182A";
const PRO_BLUE = "#42A5F5";
const PREMIUM_GOLD = "#FFD700";
const CARD_BG = "#1E2A3B";
const TEXT_WHITE = "#FFFFFF";
const TEXT_SECONDARY = "#A0AEC0";
const SUCCESS_GREEN = "#4CAF50";
const ERROR_RED = "#FF6B6B";
const WARNING_ORANGE = "#FFA726";

// Configuration des notifications
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

const Promotion = () => {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { id, title, price } = params as {
    id: string;
    title?: string;
    price?: string;
  };

  const [formData, setFormData] = useState({
    promoPrice: "",
    description: "",
    duration: "7", // Durée en jours par défaut
  });
  const [notificationSettings, setNotificationSettings] = useState({
    notifyFollowers: true,
    notifyRegion: true,
  });
  const [loading, setLoading] = useState(false);

  // Animations
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;
  const toastAnim = useRef(new Animated.Value(-100)).current;

  // États notification
  const [toastMessage, setToastMessage] = useState("");
  const [toastVisible, setToastVisible] = useState(false);
  const [toastType, setToastType] = useState<"success" | "error">("success");

  useEffect(() => {
    startEntranceAnimation();
    registerForPushNotifications();
  }, []);

  const startEntranceAnimation = () => {
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
  };

  // Configuration des notifications push
  const registerForPushNotifications = async () => {
    try {
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;
      
      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }
      
      if (finalStatus !== 'granted') {
        console.log('Permission notifications refusée');
        return;
      }

      // Configuration du canal (Android)
      if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('promotions', {
          name: 'Promotions',
          importance: Notifications.AndroidImportance.MAX,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#FF231F7C',
        });
      }
    } catch (error) {
      console.error('Erreur configuration notifications:', error);
    }
  };

  const showToast = (message: string, type: "success" | "error" = "success") => {
    setToastMessage(message);
    setToastType(type);
    setToastVisible(true);

    Animated.sequence([
      Animated.timing(toastAnim, {
        toValue: 50,
        duration: 400,
        useNativeDriver: true,
      }),
      Animated.delay(2000),
      Animated.timing(toastAnim, {
        toValue: -100,
        duration: 400,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setToastVisible(false);
    });
  };

  const updateField = (field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const updateNotificationSetting = (field: string, value: boolean) => {
    setNotificationSettings(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const calculateDiscount = () => {
    if (!price || !formData.promoPrice) return 0;
    const originalPrice = Number(price);
    const promoPrice = Number(formData.promoPrice);
    if (originalPrice <= 0 || promoPrice <= 0) return 0;
    
    return Math.round(((originalPrice - promoPrice) / originalPrice) * 100);
  };

  const validateForm = () => {
    if (!formData.promoPrice) {
      showToast("💰 Prix promotionnel requis", "error");
      return false;
    }

    const originalPrice = Number(price);
    const promoPrice = Number(formData.promoPrice);

    if (isNaN(promoPrice) || promoPrice <= 0) {
      showToast("💰 Prix promotionnel invalide", "error");
      return false;
    }

    if (promoPrice >= originalPrice) {
      showToast("💰 Le prix promo doit être inférieur au prix normal", "error");
      return false;
    }

    if (!formData.duration || isNaN(Number(formData.duration)) || Number(formData.duration) <= 0) {
      showToast("⏱️ Durée de promotion invalide", "error");
      return false;
    }

    return true;
  };

  // Fonction pour envoyer les notifications
  const sendNotifications = async () => {
    try {
      const token = await getValidToken();
      const discount = calculateDiscount();
      
      // Préparer les données de notification
      const notificationData = {
        product_id: id,
        product_title: title,
        original_price: Number(price),
        promo_price: Number(formData.promoPrice),
        discount_percentage: discount,
        promotion_description: formData.description,
        duration_days: Number(formData.duration)
      };

      // Envoyer les notifications selon les paramètres
      if (notificationSettings.notifyFollowers) {
        await authApi.post('/notifications/to-followers', notificationData, {
          headers: { Authorization: `Bearer ${token}` },
        });
      }

      if (notificationSettings.notifyRegion) {
        await authApi.post('/notifications/to-region', notificationData, {
          headers: { Authorization: `Bearer ${token}` },
        });
      }

      console.log('Notifications envoyées avec succès');
    } catch (error) {
      console.error('Erreur envoi notifications:', error);
      // On continue même si les notifications échouent
    }
  };

  const handleSavePromotion = async () => {
    if (!validateForm()) return;

    try {
      setLoading(true);
      const token = await getValidToken();
      if (!token) {
        showToast("🔐 Utilisateur non connecté", "error");
        return;
      }

      // Payload compatible avec votre backend existant
      const payload = {
        id,
        title,
        price,
        promoPrice: formData.promoPrice,
        description: formData.description,
        duration: formData.duration,
        notify_followers: notificationSettings.notifyFollowers,
        notify_region: notificationSettings.notifyRegion
      };

      await authApi.post("/promotions", payload, {
        headers: { Authorization: `Bearer ${token}` },
      });

      // Envoyer les notifications après création réussie
      await sendNotifications();

      showToast("🎉 Promotion créée avec succès !", "success");
      
      setTimeout(() => {
        router.back();
      }, 1500);
    } catch (error: any) {
      console.error("Erreur création promotion:", error);
      showToast(
        error.response?.data?.message || "❌ Erreur lors de la création de la promotion",
        "error"
      );
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    Alert.alert(
      "Annuler la promotion",
      "Voulez-vous vraiment annuler ? Toutes les informations seront perdues.",
      [
        { text: "Non", style: "cancel" },
        { text: "Oui", onPress: () => router.back() }
      ]
    );
  };

  const discount = calculateDiscount();
  const originalPrice = Number(price) || 0;
  const promoPrice = Number(formData.promoPrice) || 0;

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar backgroundColor={SHOPNET_BLUE} barStyle="light-content" />

      {/* Header Premium */}
      <Animated.View 
        style={[
          styles.header,
          {
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }],
          }
        ]}
      >
        <TouchableOpacity
          style={styles.backButton}
          onPress={handleCancel}
        >
          <Ionicons name="arrow-back" size={24} color={PRO_BLUE} />
          <Text style={styles.backText}>Retour</Text>
        </TouchableOpacity>

        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Créer Promotion</Text>
          <Text style={styles.headerSubtitle}>ID: {id}</Text>
        </View>

        <View style={styles.headerRight}>
          <Ionicons name="pricetag" size={24} color={PRO_BLUE} />
        </View>
      </Animated.View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContainer}
        showsVerticalScrollIndicator={false}
      >
        {/* Section Informations Produit */}
        <Animated.View
          style={[
            styles.section,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }],
            },
          ]}
        >
          <View style={styles.sectionHeader}>
            <Ionicons name="cube-outline" size={24} color={PRO_BLUE} />
            <Text style={styles.sectionTitle}>Produit</Text>
          </View>

          <View style={styles.productInfoContainer}>
            <Text style={styles.productTitle} numberOfLines={2}>
              {title || "Produit sans titre"}
            </Text>
            <View style={styles.priceContainer}>
              <Text style={styles.originalPrice}>
                ${originalPrice.toFixed(2)}
              </Text>
              {discount > 0 && (
                <View style={styles.discountBadge}>
                  <Text style={styles.discountText}>-{discount}%</Text>
                </View>
              )}
            </View>
          </View>
        </Animated.View>

        {/* Section Prix Promotionnel */}
        <Animated.View
          style={[
            styles.section,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }],
            },
          ]}
        >
          <View style={styles.sectionHeader}>
            <Ionicons name="flash" size={24} color={PREMIUM_GOLD} />
            <Text style={styles.sectionTitle}>Prix Promotionnel</Text>
          </View>

          <View style={styles.formContainer}>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>
                Prix promotionnel <Text style={styles.required}>*</Text>
              </Text>
              <View style={styles.inputContainer}>
                <Ionicons name="pricetag" size={20} color={PREMIUM_GOLD} style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  value={formData.promoPrice}
                  onChangeText={(value) => updateField("promoPrice", value)}
                  placeholder="0.00"
                  placeholderTextColor={TEXT_SECONDARY}
                  keyboardType="decimal-pad"
                />
                <Text style={styles.currency}>$</Text>
              </View>
              
              {discount > 0 && (
                <View style={styles.discountInfo}>
                  <Ionicons name="trending-down" size={16} color={SUCCESS_GREEN} />
                  <Text style={styles.discountInfoText}>
                    Économie de {discount}% (${(originalPrice - promoPrice).toFixed(2)})
                  </Text>
                </View>
              )}
            </View>

            {/* Nouveau Prix */}
            {promoPrice > 0 && (
              <View style={styles.newPriceContainer}>
                <Text style={styles.newPriceLabel}>Nouveau prix affiché :</Text>
                <View style={styles.priceComparison}>
                  <Text style={styles.oldPrice}>${originalPrice.toFixed(2)}</Text>
                  <Ionicons name="arrow-forward" size={16} color={TEXT_SECONDARY} />
                  <Text style={styles.newPrice}>${promoPrice.toFixed(2)}</Text>
                </View>
              </View>
            )}
          </View>
        </Animated.View>

        {/* Section Durée de Promotion */}
        <Animated.View
          style={[
            styles.section,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }],
            },
          ]}
        >
          <View style={styles.sectionHeader}>
            <Ionicons name="time-outline" size={24} color={PRO_BLUE} />
            <Text style={styles.sectionTitle}>Durée de Promotion</Text>
          </View>

          <View style={styles.durationContainer}>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>
                Durée (en jours) <Text style={styles.required}>*</Text>
              </Text>
              <View style={styles.inputContainer}>
                <Ionicons name="calendar" size={20} color={PRO_BLUE} style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  value={formData.duration}
                  onChangeText={(value) => updateField("duration", value)}
                  placeholder="7"
                  placeholderTextColor={TEXT_SECONDARY}
                  keyboardType="numeric"
                />
                <Text style={styles.durationUnit}>jours</Text>
              </View>
              
              {/* Suggestions de durée */}
              <View style={styles.durationSuggestions}>
                <Text style={styles.suggestionsLabel}>Suggestions rapides:</Text>
                <View style={styles.suggestionButtons}>
                  {['1', '3', '7', '14', '30'].map((days) => (
                    <TouchableOpacity
                      key={days}
                      style={[
                        styles.suggestionButton,
                        formData.duration === days && styles.suggestionButtonActive
                      ]}
                      onPress={() => updateField("duration", days)}
                    >
                      <Text style={[
                        styles.suggestionText,
                        formData.duration === days && styles.suggestionTextActive
                      ]}>
                        {days} jour{days !== '1' ? 's' : ''}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            </View>
          </View>
        </Animated.View>

        {/* Section Description */}
        <Animated.View
          style={[
            styles.section,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }],
            },
          ]}
        >
          <View style={styles.sectionHeader}>
            <Ionicons name="document-text" size={24} color={PRO_BLUE} />
            <Text style={styles.sectionTitle}>Conditions Promotionnelles</Text>
          </View>

          <View style={styles.textAreaContainer}>
            <TextInput
              style={styles.textArea}
              value={formData.description}
              onChangeText={(value) => updateField("description", value)}
              placeholder="Ex: '-10% ce week-end seulement' ou 'Offre spéciale été 2024'"
              placeholderTextColor={TEXT_SECONDARY}
              multiline
              numberOfLines={3}
              textAlignVertical="top"
              maxLength={200}
            />
            <View style={styles.charCountContainer}>
              <Text style={styles.charCount}>
                {formData.description.length}/200
              </Text>
            </View>
          </View>
        </Animated.View>

        {/* Section Notifications */}
        <Animated.View
          style={[
            styles.section,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }],
            },
          ]}
        >
          <View style={styles.sectionHeader}>
            <Ionicons name="notifications" size={24} color={PRO_BLUE} />
            <Text style={styles.sectionTitle}>Notifications</Text>
          </View>

          <View style={styles.notificationsContainer}>
            {/* Notification aux followers */}
            <View style={styles.notificationItem}>
              <View style={styles.notificationLeft}>
                <View style={[styles.notificationIcon, { backgroundColor: 'rgba(66, 165, 245, 0.1)' }]}>
                  <Ionicons name="people" size={20} color={PRO_BLUE} />
                </View>
                <View style={styles.notificationTextContainer}>
                  <Text style={styles.notificationTitle}>Notifier mes followers</Text>
                  <Text style={styles.notificationDescription}>
                    Envoyer une notification à tous vos followers
                  </Text>
                </View>
              </View>
              <Switch
                value={notificationSettings.notifyFollowers}
                onValueChange={(value) => updateNotificationSetting('notifyFollowers', value)}
                trackColor={{ false: '#767577', true: PRO_BLUE }}
                thumbColor={notificationSettings.notifyFollowers ? TEXT_WHITE : '#f4f3f4'}
              />
            </View>

            {/* Notification région */}
            <View style={styles.notificationItem}>
              <View style={styles.notificationLeft}>
                <View style={[styles.notificationIcon, { backgroundColor: 'rgba(76, 175, 80, 0.1)' }]}>
                  <Ionicons name="location" size={20} color={SUCCESS_GREEN} />
                </View>
                <View style={styles.notificationTextContainer}>
                  <Text style={styles.notificationTitle}>Notifier la région</Text>
                  <Text style={styles.notificationDescription}>
                    Utilisateurs dans un rayon de 50km
                  </Text>
                </View>
              </View>
              <Switch
                value={notificationSettings.notifyRegion}
                onValueChange={(value) => updateNotificationSetting('notifyRegion', value)}
                trackColor={{ false: '#767577', true: SUCCESS_GREEN }}
                thumbColor={notificationSettings.notifyRegion ? TEXT_WHITE : '#f4f3f4'}
              />
            </View>

            {/* Info notifications */}
            <View style={styles.notificationInfo}>
              <Ionicons name="information-circle" size={16} color={TEXT_SECONDARY} />
              <Text style={styles.notificationInfoText}>
                Les notifications seront envoyées immédiatement après activation de la promotion
              </Text>
            </View>
          </View>
        </Animated.View>

        {/* Boutons d'Action */}
        <Animated.View
          style={[
            styles.actionsSection,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }],
            },
          ]}
        >
          <TouchableOpacity
            style={[styles.cancelButton, loading && styles.buttonDisabled]}
            onPress={handleCancel}
            disabled={loading}
          >
            <Ionicons name="close-circle" size={20} color={TEXT_SECONDARY} />
            <Text style={styles.cancelButtonText}>Annuler</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.saveButton, loading && styles.buttonDisabled]}
            onPress={handleSavePromotion}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator size="small" color={TEXT_WHITE} />
            ) : (
              <Ionicons name="flash" size={20} color={TEXT_WHITE} />
            )}
            <Text style={styles.saveButtonText}>
              {loading ? "Création..." : "Activer Promotion"}
            </Text>
          </TouchableOpacity>
        </Animated.View>

        {/* Espace en bas pour le scroll */}
        <View style={styles.bottomSpacer} />
      </ScrollView>

      {/* Toast Notification */}
      {toastVisible && (
        <Animated.View
          style={[
            styles.toastContainer,
            { 
              transform: [{ translateY: toastAnim }],
              backgroundColor: toastType === "success" ? SUCCESS_GREEN : ERROR_RED,
            },
          ]}
        >
          <View style={styles.toastContent}>
            <Ionicons 
              name={toastType === "success" ? "checkmark-circle" : "alert-circle"} 
              size={24} 
              color={TEXT_WHITE} 
            />
            <Text style={styles.toastText}>{toastMessage}</Text>
          </View>
        </Animated.View>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: SHOPNET_BLUE,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: SHOPNET_BLUE,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(66, 165, 245, 0.1)",
  },
  backButton: {
    flexDirection: "row",
    alignItems: "center",
    padding: 8,
  },
  backText: {
    color: PRO_BLUE,
    fontSize: 16,
    fontWeight: "600",
    marginLeft: 8,
  },
  headerCenter: {
    alignItems: "center",
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: TEXT_WHITE,
  },
  headerSubtitle: {
    fontSize: 12,
    color: TEXT_SECONDARY,
    marginTop: 2,
  },
  headerRight: {
    width: 40,
    alignItems: "flex-end",
  },
  scrollView: {
    flex: 1,
  },
  scrollContainer: {
    paddingBottom: 40,
  },
  section: {
    marginHorizontal: 20,
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: TEXT_WHITE,
    marginLeft: 12,
  },
  productInfoContainer: {
    backgroundColor: CARD_BG,
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: "rgba(66, 165, 245, 0.1)",
  },
  productTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: TEXT_WHITE,
    marginBottom: 12,
  },
  priceContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  originalPrice: {
    fontSize: 20,
    fontWeight: "700",
    color: TEXT_SECONDARY,
  },
  discountBadge: {
    backgroundColor: SUCCESS_GREEN,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  discountText: {
    color: TEXT_WHITE,
    fontSize: 14,
    fontWeight: "700",
  },
  formContainer: {
    backgroundColor: CARD_BG,
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: "rgba(66, 165, 245, 0.1)",
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: "600",
    color: TEXT_WHITE,
    marginBottom: 8,
  },
  required: {
    color: ERROR_RED,
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(30, 42, 59, 0.8)",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(66, 165, 245, 0.2)",
    paddingHorizontal: 16,
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    color: TEXT_WHITE,
    fontSize: 16,
    paddingVertical: 14,
  },
  currency: {
    color: PREMIUM_GOLD,
    fontSize: 16,
    fontWeight: "600",
    marginLeft: 8,
  },
  discountInfo: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 8,
    padding: 8,
    backgroundColor: "rgba(76, 175, 80, 0.1)",
    borderRadius: 8,
  },
  discountInfoText: {
    color: SUCCESS_GREEN,
    fontSize: 14,
    fontWeight: "600",
    marginLeft: 6,
  },
  newPriceContainer: {
    backgroundColor: "rgba(255, 215, 0, 0.1)",
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(255, 215, 0, 0.3)",
  },
  newPriceLabel: {
    color: PREMIUM_GOLD,
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 8,
  },
  priceComparison: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  oldPrice: {
    color: TEXT_SECONDARY,
    fontSize: 18,
    fontWeight: "600",
    textDecorationLine: "line-through",
    marginRight: 8,
  },
  newPrice: {
    color: PREMIUM_GOLD,
    fontSize: 24,
    fontWeight: "800",
    marginLeft: 8,
  },
  durationContainer: {
    backgroundColor: CARD_BG,
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: "rgba(66, 165, 245, 0.1)",
  },
  durationUnit: {
    color: PRO_BLUE,
    fontSize: 16,
    fontWeight: "600",
    marginLeft: 8,
  },
  durationSuggestions: {
    marginTop: 16,
  },
  suggestionsLabel: {
    color: TEXT_SECONDARY,
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 8,
  },
  suggestionButtons: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  suggestionButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: "rgba(66, 165, 245, 0.1)",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "rgba(66, 165, 245, 0.3)",
  },
  suggestionButtonActive: {
    backgroundColor: PRO_BLUE,
    borderColor: PRO_BLUE,
  },
  suggestionText: {
    color: PRO_BLUE,
    fontSize: 14,
    fontWeight: "600",
  },
  suggestionTextActive: {
    color: TEXT_WHITE,
  },
  textAreaContainer: {
    backgroundColor: CARD_BG,
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: "rgba(66, 165, 245, 0.1)",
    position: "relative",
  },
  textArea: {
    color: TEXT_WHITE,
    fontSize: 16,
    paddingVertical: 14,
    minHeight: 100,
    textAlignVertical: "top",
  },
  charCountContainer: {
    position: "absolute",
    bottom: 12,
    right: 12,
  },
  charCount: {
    color: TEXT_SECONDARY,
    fontSize: 12,
  },
  notificationsContainer: {
    backgroundColor: CARD_BG,
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: "rgba(66, 165, 245, 0.1)",
  },
  notificationItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(66, 165, 245, 0.1)",
  },
  notificationLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  notificationIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  notificationTextContainer: {
    flex: 1,
  },
  notificationTitle: {
    color: TEXT_WHITE,
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 4,
  },
  notificationDescription: {
    color: TEXT_SECONDARY,
    fontSize: 14,
  },
  notificationInfo: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginTop: 16,
    padding: 12,
    backgroundColor: "rgba(66, 165, 245, 0.1)",
    borderRadius: 8,
  },
  notificationInfoText: {
    color: TEXT_SECONDARY,
    fontSize: 14,
    marginLeft: 8,
    flex: 1,
  },
  actionsSection: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginHorizontal: 20,
    marginTop: 8,
  },
  cancelButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(66, 165, 245, 0.1)",
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: PRO_BLUE,
    flex: 1,
    marginRight: 8,
  },
  saveButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: PREMIUM_GOLD,
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 12,
    flex: 1,
    marginLeft: 8,
    elevation: 4,
    shadowColor: PREMIUM_GOLD,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  cancelButtonText: {
    color: TEXT_SECONDARY,
    fontSize: 16,
    fontWeight: "600",
    marginLeft: 8,
  },
  saveButtonText: {
    color: SHOPNET_BLUE,
    fontSize: 16,
    fontWeight: "700",
    marginLeft: 8,
  },
  bottomSpacer: {
    height: 20,
  },
  toastContainer: {
    position: "absolute",
    top: 0,
    left: 20,
    right: 20,
    backgroundColor: SUCCESS_GREEN,
    borderRadius: 12,
    padding: 16,
    zIndex: 1001,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  toastContent: {
    flexDirection: "row",
    alignItems: "center",
  },
  toastText: {
    marginLeft: 12,
    fontSize: 16,
    fontWeight: "600",
    color: TEXT_WHITE,
    flex: 1,
  },
});

export default Promotion;