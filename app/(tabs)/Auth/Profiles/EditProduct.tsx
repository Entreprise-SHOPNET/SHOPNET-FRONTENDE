


import React, { useState, useEffect, useRef } from "react";
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
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { Ionicons, MaterialIcons } from "@expo/vector-icons";
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

const categories = [
  { name: "Tendance", icon: "trending-up" },
  { name: "Mode", icon: "shirt-outline" },
  { name: "Tech", icon: "phone-portrait-outline" },
  { name: "Maison", icon: "home-outline" },
  { name: "Beauté", icon: "sparkles-outline" },
  { name: "Sport", icon: "basketball-outline" },
  { name: "Auto", icon: "car-sport-outline" },
  { name: "Autre", icon: "grid-outline" },
];

const EditProduct = () => {
  const router = useRouter();
  const { id } = useLocalSearchParams();

  const [formData, setFormData] = useState({
    title: "",
    description: "",
    price: "",
    category: "",
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Animations
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;
  const toastAnim = useRef(new Animated.Value(-100)).current;

  // États notification
  const [toastMessage, setToastMessage] = useState("");
  const [toastVisible, setToastVisible] = useState(false);
  const [toastType, setToastType] = useState<"success" | "error">("success");

  // Charger les données du produit
  useEffect(() => {
    loadProductData();
  }, [id]);

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

  const loadProductData = async () => {
    try {
      setLoading(true);
      const token = await getValidToken();
      if (!token) {
        showToast("🔐 Utilisateur non connecté", "error");
        router.back();
        return;
      }

      const response = await authApi.get(`/products/${id}`);
      
      if (response.data.success) {
        const product = response.data.product;
        
        setFormData({
          title: product.title || "",
          description: product.description || "",
          price: product.price ? String(product.price) : "",
          category: product.category || "",
        });
        
        // Démarrer l'animation après le chargement des données
        setTimeout(() => {
          startEntranceAnimation();
        }, 100);
      }
    } catch (error: any) {
      console.error("Erreur chargement produit:", error);
      showToast("❌ Erreur lors du chargement du produit", "error");
    } finally {
      setLoading(false);
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

  const handleSave = async () => {
    // Validation
    if (!formData.title.trim()) {
      showToast("📝 Le titre est requis", "error");
      return;
    }
    if (!formData.price || isNaN(Number(formData.price)) || Number(formData.price) <= 0) {
      showToast("💰 Prix invalide", "error");
      return;
    }

    try {
      setSaving(true);
      const token = await getValidToken();
      if (!token) {
        showToast("🔐 Utilisateur non connecté", "error");
        return;
      }

      await authApi.put(`/products/edit/${id}`, {
        title: formData.title.trim(),
        description: formData.description.trim(),
        price: Number(formData.price),
        category: formData.category,
      });

      showToast("✅ Produit modifié avec succès !", "success");
      
      setTimeout(() => {
        router.back();
      }, 1500);
    } catch (error: any) {
      console.error("Erreur modification produit:", error);
      showToast(
        error.response?.data?.message || "❌ Impossible de modifier le produit",
        "error"
      );
    } finally {
      setSaving(false);
    }
  };

  const updateField = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleCancel = () => {
    Alert.alert(
      "Annuler les modifications",
      "Voulez-vous vraiment annuler ? Toutes les modifications seront perdues.",
      [
        { text: "Non", style: "cancel" },
        { text: "Oui", onPress: () => router.back() }
      ]
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <StatusBar backgroundColor={SHOPNET_BLUE} barStyle="light-content" />
        <View style={styles.loadingContent}>
          <ActivityIndicator size="large" color={PRO_BLUE} />
          <Text style={styles.loadingText}>Chargement du produit...</Text>
        </View>
      </SafeAreaView>
    );
  }

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
          <Text style={styles.headerTitle}>Modifier Produit</Text>
          <Text style={styles.headerSubtitle}>ID: {id}</Text>
        </View>

        <View style={styles.headerRight}>
          <Ionicons name="cube-outline" size={24} color={PRO_BLUE} />
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
            <Ionicons name="information-circle" size={24} color={PRO_BLUE} />
            <Text style={styles.sectionTitle}>Informations Produit</Text>
          </View>

          <View style={styles.formContainer}>
            {/* Titre */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>
                Titre du produit <Text style={styles.required}>*</Text>
              </Text>
              <View style={styles.inputContainer}>
                <Ionicons name="text" size={20} color={PRO_BLUE} style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  value={formData.title}
                  onChangeText={(value) => updateField("title", value)}
                  placeholder="Nom de votre produit"
                  placeholderTextColor={TEXT_SECONDARY}
                  maxLength={100}
                />
                <Text style={styles.charCount}>
                  {formData.title.length}/100
                </Text>
              </View>
            </View>

            {/* Description */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Description</Text>
              <View style={styles.textAreaContainer}>
                <Ionicons 
                  name="document-text" 
                  size={20} 
                  color={PRO_BLUE} 
                  style={styles.textAreaIcon} 
                />
                <TextInput
                  style={styles.textArea}
                  value={formData.description}
                  onChangeText={(value) => updateField("description", value)}
                  placeholder="Décrivez votre produit en détail..."
                  placeholderTextColor={TEXT_SECONDARY}
                  multiline
                  numberOfLines={4}
                  textAlignVertical="top"
                  maxLength={500}
                />
                <View style={styles.charCountContainer}>
                  <Text style={styles.charCount}>
                    {formData.description.length}/500
                  </Text>
                </View>
              </View>
            </View>

            {/* Prix */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>
                Prix ($) <Text style={styles.required}>*</Text>
              </Text>
              <View style={styles.inputContainer}>
                <Ionicons name="pricetag" size={20} color={PRO_BLUE} style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  value={formData.price}
                  onChangeText={(value) => updateField("price", value)}
                  placeholder="0.00"
                  placeholderTextColor={TEXT_SECONDARY}
                  keyboardType="decimal-pad"
                />
                <Text style={styles.currency}>$</Text>
              </View>
            </View>
          </View>
        </Animated.View>

        {/* Section Catégorie */}
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
            <Ionicons name="apps" size={24} color={PRO_BLUE} />
            <Text style={styles.sectionTitle}>Catégorie</Text>
          </View>

          <View style={styles.categoriesGrid}>
            {categories.map((cat) => (
              <TouchableOpacity
                key={cat.name}
                style={[
                  styles.categoryCard,
                  formData.category === cat.name && styles.categoryCardSelected,
                ]}
                onPress={() => updateField("category", cat.name)}
              >
                <View
                  style={[
                    styles.categoryIcon,
                    formData.category === cat.name && styles.categoryIconSelected,
                  ]}
                >
                  <Ionicons
                    name={cat.icon as any}
                    size={20}
                    color={formData.category === cat.name ? TEXT_WHITE : PRO_BLUE}
                  />
                </View>
                <Text
                  style={[
                    styles.categoryText,
                    formData.category === cat.name && styles.categoryTextSelected,
                  ]}
                >
                  {cat.name}
                </Text>
                {formData.category === cat.name && (
                  <View style={styles.selectedIndicator}>
                    <Ionicons name="checkmark" size={16} color={TEXT_WHITE} />
                  </View>
                )}
              </TouchableOpacity>
            ))}
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
            style={[styles.cancelButton, saving && styles.buttonDisabled]}
            onPress={handleCancel}
            disabled={saving}
          >
            <Ionicons name="close-circle" size={20} color={TEXT_SECONDARY} />
            <Text style={styles.cancelButtonText}>Annuler</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.saveButton, saving && styles.buttonDisabled]}
            onPress={handleSave}
            disabled={saving}
          >
            {saving ? (
              <ActivityIndicator size="small" color={TEXT_WHITE} />
            ) : (
              <Ionicons name="save" size={20} color={TEXT_WHITE} />
            )}
            <Text style={styles.saveButtonText}>
              {saving ? "Enregistrement..." : "Enregistrer"}
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
  loadingContainer: {
    flex: 1,
    backgroundColor: SHOPNET_BLUE,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingContent: {
    alignItems: "center",
  },
  loadingText: {
    color: PRO_BLUE,
    fontSize: 16,
    fontWeight: "600",
    marginTop: 12,
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
    color: PRO_BLUE,
    fontSize: 16,
    fontWeight: "600",
    marginLeft: 8,
  },
  charCount: {
    color: TEXT_SECONDARY,
    fontSize: 12,
  },
  charCountContainer: {
    position: "absolute",
    bottom: 8,
    right: 12,
  },
  textAreaContainer: {
    backgroundColor: "rgba(30, 42, 59, 0.8)",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(66, 165, 245, 0.2)",
    position: "relative",
    minHeight: 120,
  },
  textAreaIcon: {
    position: "absolute",
    top: 16,
    left: 16,
    zIndex: 1,
  },
  textArea: {
    color: TEXT_WHITE,
    fontSize: 16,
    paddingVertical: 14,
    paddingHorizontal: 16,
    paddingLeft: 48,
    minHeight: 120,
    textAlignVertical: "top",
  },
  categoriesGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },
  categoryCard: {
    width: "48%",
    backgroundColor: CARD_BG,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(66, 165, 245, 0.1)",
    position: "relative",
  },
  categoryCardSelected: {
    backgroundColor: PRO_BLUE,
    borderColor: PRO_BLUE,
  },
  categoryIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "rgba(66, 165, 245, 0.1)",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 8,
  },
  categoryIconSelected: {
    backgroundColor: "rgba(255, 255, 255, 0.2)",
  },
  categoryText: {
    color: TEXT_SECONDARY,
    fontSize: 14,
    fontWeight: "600",
    textAlign: "center",
  },
  categoryTextSelected: {
    color: TEXT_WHITE,
  },
  selectedIndicator: {
    position: "absolute",
    top: 8,
    right: 8,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: SUCCESS_GREEN,
    justifyContent: "center",
    alignItems: "center",
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
    backgroundColor: PRO_BLUE,
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 12,
    flex: 1,
    marginLeft: 8,
    elevation: 4,
    shadowColor: PRO_BLUE,
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
    color: TEXT_WHITE,
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

export default EditProduct;