


import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Platform,
  StatusBar,
  SafeAreaView,
  ScrollView,
  Image,
  ActivityIndicator,
  Animated,
  Dimensions,
  Modal,
  KeyboardAvoidingView,
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import {
  Ionicons,
  MaterialIcons,
  FontAwesome5,
  Feather,
  MaterialCommunityIcons,
} from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";
import * as ImagePicker from "expo-image-picker";

const { width, height } = Dimensions.get("window");
const SHOPNET_BLUE = "#00182A";
const PRO_BLUE = "#42A5F5";
const PRO_GREEN = "#4CAF50";
const NOTIFICATION_RED = "#FF3B30";
const CARD_BG = "rgba(30, 42, 59, 0.9)";
const BORDER_COLOR = "rgba(66, 165, 245, 0.1)";


// 🔹 Serveur Render en production
const BASE_URL = "https://shopnet-backend.onrender.com";

// 🔹 Serveur local pour développement (commenté)
// const BASE_URL = "http://100.64.134.89:5000";


interface UserProfile {
  id: number;
  fullName: string;
  email: string;
  phone: string;
  companyName: string;
  nif: string;
  address: string;
  description: string;
  profile_photo: string | null;
  cover_photo: string | null;
  role: string;
  date_inscription: string;
  productsCount: number;
  salesCount: number;
  rating: number;
  ordersCount: number;
}

const ModifierInfos = () => {
  const router = useRouter();
  const params = useLocalSearchParams();
  const scrollY = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;

  // États pour les données utilisateur
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [token, setToken] = useState<string | null>(null);

  // États pour le formulaire
  const [formData, setFormData] = useState({
    fullName: "",
    phone: "",
    companyName: "",
    nif: "",
    address: "",
    description: "",
  });

  // États pour les modales de photos
  const [photoModalVisible, setPhotoModalVisible] = useState(false);
  const [photoModalType, setPhotoModalType] = useState<"profile" | "cover" | null>(null);
  const [viewingPhoto, setViewingPhoto] = useState(false);

  // Animation au chargement
  useEffect(() => {
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

    loadTokenAndUser();
  }, []);

  // Charger le token et les données utilisateur
  const loadTokenAndUser = useCallback(async () => {
    try {
      const savedToken = await AsyncStorage.getItem("userToken");
      if (!savedToken) {
        router.push("/splash");
        return;
      }
      setToken(savedToken);
      await fetchUserProfile(savedToken);
    } catch (error) {
      console.error("Erreur chargement token/profil:", error);
      Alert.alert("Erreur", "Impossible de charger les données du profil");
    }
  }, []);

  // Récupérer les données du profil
  const fetchUserProfile = async (token: string) => {
    try {
      setLoading(true);
      const response = await axios.get(`${BASE_URL}/api/user/profile`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.data.success) {
        const userData = response.data.user;
        setUser(userData);
        
        // Initialiser le formulaire avec les données actuelles
        setFormData({
          fullName: userData.fullName || "",
          phone: userData.phone || "",
          companyName: userData.companyName || "",
          nif: userData.nif || "",
          address: userData.address || "",
          description: userData.description || "",
        });
      }
    } catch (error) {
      console.error("Erreur fetchUserProfile:", error);
      Alert.alert("Erreur", "Erreur lors du chargement du profil");
    } finally {
      setLoading(false);
    }
  };

  // Gérer les changements dans le formulaire
  const handleInputChange = (field: keyof typeof formData, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value,
    }));
  };

  // Sauvegarder les modifications
  const handleSaveProfile = async () => {
    if (!token || !user) return;

    // Validation basique
    if (!formData.fullName.trim()) {
      Alert.alert("Erreur", "Le nom complet est requis");
      return;
    }

    try {
      setSaving(true);
      
      const response = await axios.put(
        `${BASE_URL}/api/user/profile`,
        formData,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (response.data.success) {
        // Mettre à jour les données locales
        await fetchUserProfile(token);
        
        Alert.alert("Succès", "Profil mis à jour avec succès", [
          {
            text: "OK",
            onPress: () => router.back(),
          },
        ]);
      } else {
        throw new Error(response.data.message || "Erreur lors de la mise à jour");
      }
    } catch (error: any) {
      console.error("Erreur sauvegarde profil:", error);
      Alert.alert(
        "Erreur",
        error.response?.data?.message || error.message || "Échec de la mise à jour du profil"
      );
    } finally {
      setSaving(false);
    }
  };

  // Gérer l'ouverture du modal de photo
  const handlePhotoAction = (type: "profile" | "cover") => {
    setPhotoModalType(type);
    setPhotoModalVisible(true);
  };

  // Fermer le modal de photo
  const closePhotoModal = () => {
    setPhotoModalVisible(false);
    setPhotoModalType(null);
    setViewingPhoto(false);
  };

  // Voir la photo actuelle
  const handleViewPhoto = () => {
    if (!photoModalType || !user) return;
    
    const photoField = photoModalType === "profile" ? "profile_photo" : "cover_photo";
    if (!user[photoField]) {
      Alert.alert(
        "Aucune photo",
        `Aucune photo de ${photoModalType === "profile" ? "profil" : "couverture"} disponible`
      );
      return;
    }
    
    setViewingPhoto(true);
  };

  // Choisir une nouvelle photo
  const handleChoosePhoto = async () => {
    if (!token || !photoModalType || !user) return;
    
    try {
      // Demander la permission d'accéder à la galerie
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== "granted") {
        Alert.alert("Permission requise", "L'accès à la galerie est nécessaire pour changer la photo");
        return;
      }

      // Ouvrir la galerie
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: photoModalType === "profile" ? [1, 1] : [16, 9],
        quality: 0.8,
      });

      if (result.canceled || !result.assets[0]) return;

      const imageUri = result.assets[0].uri;
      setUploading(true);

      // Préparer le form data pour l'upload
      const formData = new FormData();
      const filename = imageUri.split('/').pop() || `photo_${Date.now()}.jpg`;
      const match = /\.(\w+)$/.exec(filename);
      const type = match ? `image/${match[1]}` : 'image/jpeg';

      formData.append(
        photoModalType === "profile" ? "profile_photo" : "cover_photo",
        {
          uri: imageUri,
          name: filename,
          type,
        } as any
      );

      // Déterminer l'endpoint
      const endpoint = photoModalType === "profile" 
        ? `${BASE_URL}/api/user/profile/photo`
        : `${BASE_URL}/api/user/cover/photo`;

      // Upload vers le backend
      const response = await axios.put(endpoint, formData, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "multipart/form-data",
        },
      });

      if (response.data.success) {
        // Mettre à jour les données locales
        await fetchUserProfile(token);
        
        Alert.alert(
          "Succès",
          `Photo ${photoModalType === "profile" ? "de profil" : "de couverture"} mise à jour`
        );
      }
    } catch (error: any) {
      console.error("Erreur upload photo:", error);
      Alert.alert(
        "Erreur",
        error.response?.data?.message || error.message || "Échec du téléchargement de l'image"
      );
    } finally {
      setUploading(false);
      closePhotoModal();
    }
  };

  // Formater la date
  const formatDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleDateString("fr-FR", {
        year: "numeric",
        month: "long",
        day: "numeric",
      });
    } catch {
      return dateString;
    }
  };

  // Effets d'animation pour le header
  const headerHeight = scrollY.interpolate({
    inputRange: [0, 100],
    outputRange: [180, 100],
    extrapolate: "clamp",
  });

  const headerOpacity = scrollY.interpolate({
    inputRange: [0, 80],
    outputRange: [1, 0.9],
    extrapolate: "clamp",
  });

  if (loading && !user) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={PRO_BLUE} />
        <Text style={styles.loadingText}>Chargement du profil...</Text>
      </View>
    );
  }

  if (!user) {
    return (
      <View style={styles.errorContainer}>
        <MaterialIcons name="error-outline" size={64} color={NOTIFICATION_RED} />
        <Text style={styles.errorTitle}>Profil non disponible</Text>
        <Text style={styles.errorSubtitle}>Impossible de charger vos informations</Text>
        <TouchableOpacity style={styles.retryButton} onPress={loadTokenAndUser}>
          <Text style={styles.retryButtonText}>Réessayer</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Text style={styles.backButtonText}>Retour</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Header animé */}
      <Animated.View
        style={[
          styles.headerContainer,
          {
            height: headerHeight,
            opacity: headerOpacity,
          },
        ]}
      >
        <View style={styles.headerBackground}>
          <View style={styles.glowCircle1} />
          <View style={styles.glowCircle2} />
        </View>

        <View style={styles.headerContent}>
          <View style={styles.headerTop}>
            <TouchableOpacity
              style={styles.backButtonHeader}
              onPress={() => router.back()}
            >
              <Ionicons name="arrow-back" size={24} color="#fff" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Modifier le profil</Text>
            <TouchableOpacity
              style={styles.saveButtonHeader}
              onPress={handleSaveProfile}
              disabled={saving}
            >
              {saving ? (
                <ActivityIndicator size="small" color={PRO_BLUE} />
              ) : (
                <Text style={styles.saveButtonText}>Sauvegarder</Text>
              )}
            </TouchableOpacity>
          </View>

          {/* Photo de couverture */}
          <TouchableOpacity
            style={styles.coverPhotoContainer}
            activeOpacity={0.8}
            onPress={() => handlePhotoAction("cover")}
          >
            {user.cover_photo ? (
              <Image
                source={{ uri: user.cover_photo }}
                style={styles.coverPhoto}
              />
            ) : (
              <View style={styles.coverPlaceholder}>
                <MaterialCommunityIcons
                  name="image-edit"
                  size={40}
                  color={PRO_BLUE}
                />
                <Text style={styles.coverPlaceholderText}>
                  Photo de couverture
                </Text>
              </View>
            )}
            <View style={styles.coverOverlay} />
            <View style={styles.coverEditBadge}>
              <Ionicons name="camera" size={16} color="#fff" />
            </View>
          </TouchableOpacity>
        </View>
      </Animated.View>

      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? 90 : 0}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          onScroll={Animated.event(
            [{ nativeEvent: { contentOffset: { y: scrollY } } }],
            { useNativeDriver: false }
          )}
          scrollEventThrottle={16}
        >
          {/* Section photo de profil */}
          <Animated.View
            style={[
              styles.profileSection,
              {
                opacity: fadeAnim,
                transform: [{ translateY: slideAnim }],
              },
            ]}
          >
            <View style={styles.profilePhotoWrapper}>
              <TouchableOpacity
                style={styles.profilePhotoContainer}
                activeOpacity={0.8}
                onPress={() => handlePhotoAction("profile")}
              >
                {user.profile_photo ? (
                  <Image
                    source={{ uri: user.profile_photo }}
                    style={styles.profilePhoto}
                  />
                ) : (
                  <View style={styles.profilePlaceholder}>
                    <FontAwesome5 name="user-tie" size={40} color={PRO_BLUE} />
                  </View>
                )}
                <View style={styles.profileEditBadge}>
                  <Ionicons name="camera" size={16} color="#fff" />
                </View>
              </TouchableOpacity>
              <View style={styles.profileInfo}>
                <Text style={styles.profileName}>{user.fullName}</Text>
                <Text style={styles.profileEmail}>{user.email}</Text>
                <Text style={styles.profileRole}>
                  <Ionicons name="briefcase" size={12} color={PRO_BLUE} />{" "}
                  {user.role}
                </Text>
                <Text style={styles.profileSince}>
                  <Ionicons name="calendar" size={12} color={PRO_BLUE} /> Membre
                  depuis {formatDate(user.date_inscription)}
                </Text>
              </View>
            </View>
          </Animated.View>

          {/* Section informations personnelles */}
          <Animated.View
            style={[
              styles.formSection,
              {
                opacity: fadeAnim,
                transform: [{ translateY: slideAnim }],
              },
            ]}
          >
            <Text style={styles.sectionTitle}>Informations personnelles</Text>

            <View style={styles.inputGroup}>
              <View style={styles.inputLabelContainer}>
                <Ionicons name="person" size={18} color={PRO_BLUE} />
                <Text style={styles.inputLabel}>Nom complet *</Text>
              </View>
              <TextInput
                style={styles.textInput}
                value={formData.fullName}
                onChangeText={(value) => handleInputChange("fullName", value)}
                placeholder="Votre nom complet"
                placeholderTextColor="#718096"
                autoCapitalize="words"
              />
            </View>

            <View style={styles.inputGroup}>
              <View style={styles.inputLabelContainer}>
                <Ionicons name="call" size={18} color={PRO_BLUE} />
                <Text style={styles.inputLabel}>Téléphone</Text>
              </View>
              <TextInput
                style={styles.textInput}
                value={formData.phone}
                onChangeText={(value) => handleInputChange("phone", value)}
                placeholder="Votre numéro de téléphone"
                placeholderTextColor="#718096"
                keyboardType="phone-pad"
              />
            </View>

            <View style={styles.inputGroup}>
              <View style={styles.inputLabelContainer}>
                <MaterialIcons name="location-on" size={18} color={PRO_BLUE} />
                <Text style={styles.inputLabel}>Adresse</Text>
              </View>
              <TextInput
                style={[styles.textInput, styles.textArea]}
                value={formData.address}
                onChangeText={(value) => handleInputChange("address", value)}
                placeholder="Votre adresse complète"
                placeholderTextColor="#718096"
                multiline
                numberOfLines={3}
              />
            </View>

            <View style={styles.inputGroup}>
              <View style={styles.inputLabelContainer}>
                <Ionicons name="business" size={18} color={PRO_BLUE} />
                <Text style={styles.inputLabel}>Description</Text>
              </View>
              <TextInput
                style={[styles.textInput, styles.textArea]}
                value={formData.description}
                onChangeText={(value) =>
                  handleInputChange("description", value)
                }
                placeholder="Décrivez-vous ou votre entreprise..."
                placeholderTextColor="#718096"
                multiline
                numberOfLines={4}
                textAlignVertical="top"
              />
            </View>
          </Animated.View>

          {/* Section informations entreprise */}
          <Animated.View
            style={[
              styles.formSection,
              {
                opacity: fadeAnim,
                transform: [{ translateY: slideAnim }],
              },
            ]}
          >
            <Text style={styles.sectionTitle}>Informations entreprise</Text>

            <View style={styles.inputGroup}>
              <View style={styles.inputLabelContainer}>
                <FontAwesome5 name="building" size={18} color={PRO_BLUE} />
                <Text style={styles.inputLabel}>Nom de l'entreprise</Text>
              </View>
              <TextInput
                style={styles.textInput}
                value={formData.companyName}
                onChangeText={(value) =>
                  handleInputChange("companyName", value)
                }
                placeholder="Nom de votre entreprise"
                placeholderTextColor="#718096"
                autoCapitalize="words"
              />
            </View>

            <View style={styles.inputGroup}>
              <View style={styles.inputLabelContainer}>
                <MaterialIcons name="badge" size={18} color={PRO_BLUE} />
                <Text style={styles.inputLabel}>Numéro NIF</Text>
              </View>
              <TextInput
                style={styles.textInput}
                value={formData.nif}
                onChangeText={(value) => handleInputChange("nif", value)}
                placeholder="Numéro d'identification fiscale"
                placeholderTextColor="#718096"
              />
            </View>
          </Animated.View>

          {/* Statistiques */}
          <Animated.View
            style={[
              styles.statsSection,
              {
                opacity: fadeAnim,
                transform: [{ translateY: slideAnim }],
              },
            ]}
          >
            <Text style={styles.sectionTitle}>Statistiques</Text>
            <View style={styles.statsGrid}>
              <View style={styles.statCard}>
                <View style={styles.statIconContainer}>
                  <Ionicons name="cube-outline" size={24} color={PRO_BLUE} />
                </View>
                <Text style={styles.statNumber}>{user.productsCount || 0}</Text>
                <Text style={styles.statLabel}>Produits</Text>
              </View>

              <View style={styles.statCard}>
                <View style={styles.statIconContainer}>
                  <Ionicons name="trending-up" size={24} color={PRO_GREEN} />
                </View>
                <Text style={styles.statNumber}>{user.salesCount || 0}</Text>
                <Text style={styles.statLabel}>Ventes</Text>
              </View>

              <View style={styles.statCard}>
                <View style={styles.statIconContainer}>
                  <Ionicons name="star" size={24} color="#FFA726" />
                </View>
                <Text style={styles.statNumber}>
                  {Number(user.rating || 0).toFixed(1)}
                </Text>
                <Text style={styles.statLabel}>Note</Text>
              </View>

              <View style={styles.statCard}>
                <View style={styles.statIconContainer}>
                  <Ionicons name="cart" size={24} color={PRO_BLUE} />
                </View>
                <Text style={styles.statNumber}>{user.ordersCount || 0}</Text>
                <Text style={styles.statLabel}>Commandes</Text>
              </View>
            </View>
          </Animated.View>

          {/* Boutons d'action */}
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
              style={styles.saveButton}
              onPress={handleSaveProfile}
              disabled={saving}
            >
              {saving ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <>
                  <Ionicons name="save" size={20} color="#fff" />
                  <Text style={styles.saveButtonText}>Sauvegarder les modifications</Text>
                </>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.cancelButton}
              onPress={() => router.back()}
              disabled={saving}
            >
              <Ionicons name="close" size={20} color={PRO_BLUE} />
              <Text style={styles.cancelButtonText}>Annuler</Text>
            </TouchableOpacity>
          </Animated.View>

          {/* Espace en bas */}
          <View style={styles.spacer} />
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Modal pour les actions de photo */}
      <Modal
        visible={photoModalVisible && !viewingPhoto}
        transparent
        animationType="fade"
        onRequestClose={closePhotoModal}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>
              {photoModalType === "profile"
                ? "Photo de profil"
                : "Photo de couverture"}
            </Text>

            <TouchableOpacity
              style={[
                styles.modalButton,
                !user[photoModalType === "profile" ? "profile_photo" : "cover_photo"] &&
                  styles.disabledButton,
              ]}
              onPress={handleViewPhoto}
              disabled={
                uploading ||
                !user[photoModalType === "profile" ? "profile_photo" : "cover_photo"]
              }
            >
              <Ionicons name="eye" size={20} color="#fff" />
              <Text style={styles.modalButtonText}>Voir la photo</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.modalButton}
              onPress={handleChoosePhoto}
              disabled={uploading}
            >
              {uploading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <>
                  <Ionicons name="image" size={20} color="#fff" />
                  <Text style={styles.modalButtonText}>Changer la photo</Text>
                </>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.modalButton, styles.cancelModalButton]}
              onPress={closePhotoModal}
              disabled={uploading}
            >
              <Text style={styles.cancelModalButtonText}>Annuler</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Modal pour voir la photo en plein écran */}
      <Modal
        visible={viewingPhoto}
        transparent={false}
        animationType="fade"
        onRequestClose={closePhotoModal}
      >
        <View style={styles.fullscreenPhotoContainer}>
          <TouchableOpacity
            style={styles.closeFullscreenButton}
            onPress={closePhotoModal}
          >
            <Ionicons name="close" size={30} color="#fff" />
          </TouchableOpacity>

          {photoModalType === "profile" && user.profile_photo && (
            <Image
              source={{ uri: user.profile_photo }}
              style={styles.fullscreenPhoto}
              resizeMode="contain"
            />
          )}

          {photoModalType === "cover" && user.cover_photo && (
            <Image
              source={{ uri: user.cover_photo }}
              style={styles.fullscreenPhoto}
              resizeMode="cover"
            />
          )}
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: SHOPNET_BLUE,
    paddingTop: Platform.OS === "android" ? StatusBar.currentHeight : 0,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: SHOPNET_BLUE,
  },
  loadingText: {
    color: PRO_BLUE,
    fontSize: 16,
    marginTop: 12,
    fontWeight: "600",
  },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: SHOPNET_BLUE,
    padding: 20,
  },
  errorTitle: {
    color: "#fff",
    fontSize: 22,
    fontWeight: "700",
    marginTop: 16,
    marginBottom: 8,
  },
  errorSubtitle: {
    color: "#A0AEC0",
    fontSize: 16,
    textAlign: "center",
    marginBottom: 24,
  },
  retryButton: {
    backgroundColor: PRO_BLUE,
    paddingHorizontal: 32,
    paddingVertical: 12,
    borderRadius: 8,
    marginBottom: 12,
  },
  retryButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  backButton: {
    paddingHorizontal: 32,
    paddingVertical: 12,
  },
  backButtonText: {
    color: PRO_BLUE,
    fontSize: 16,
    fontWeight: "600",
  },
  container: {
    flex: 1,
    backgroundColor: "transparent",
  },
  headerContainer: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
    backgroundColor: SHOPNET_BLUE,
    overflow: "hidden",
  },
  headerBackground: {
    ...StyleSheet.absoluteFillObject,
  },
  glowCircle1: {
    position: "absolute",
    top: -50,
    right: -50,
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: "rgba(66, 165, 245, 0.03)",
  },
  glowCircle2: {
    position: "absolute",
    bottom: -50,
    left: -50,
    width: 150,
    height: 150,
    borderRadius: 75,
    backgroundColor: "rgba(66, 165, 245, 0.02)",
  },
  headerContent: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 10,
    justifyContent: "space-between",
  },
  headerTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: 10,
  },
  backButtonHeader: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: "#fff",
    letterSpacing: 0.5,
  },
  saveButtonHeader: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: CARD_BG,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: BORDER_COLOR,
  },
  saveButtonText: {
    color: PRO_BLUE,
    fontSize: 14,
    fontWeight: "700",
  },
  coverPhotoContainer: {
    height: 120,
    borderRadius: 12,
    overflow: "hidden",
    marginBottom: 20,
    position: "relative",
  },
  coverPhoto: {
    width: "100%",
    height: "100%",
  },
  coverPlaceholder: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(26, 38, 51, 0.8)",
  },
  coverPlaceholderText: {
    color: PRO_BLUE,
    marginTop: 8,
    fontSize: 12,
    fontWeight: "500",
  },
  coverOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0, 0, 0, 0.3)",
  },
  coverEditBadge: {
    position: "absolute",
    bottom: 10,
    right: 10,
    backgroundColor: PRO_BLUE,
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: SHOPNET_BLUE,
  },
  scrollContent: {
    paddingTop: 180,
    paddingBottom: 40,
  },
  profileSection: {
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  profilePhotoWrapper: {
    flexDirection: "row",
    alignItems: "center",
  },
  profilePhotoContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 4,
    borderColor: SHOPNET_BLUE,
    backgroundColor: "#1a2530",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
    position: "relative",
  },
  profilePhoto: {
    width: "100%",
    height: "100%",
    borderRadius: 50,
  },
  profilePlaceholder: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#1a2530",
  },
  profileEditBadge: {
    position: "absolute",
    bottom: 0,
    right: 0,
    backgroundColor: PRO_BLUE,
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: SHOPNET_BLUE,
  },
  profileInfo: {
    flex: 1,
    marginLeft: 16,
  },
  profileName: {
    fontSize: 22,
    fontWeight: "800",
    color: "#fff",
    marginBottom: 4,
  },
  profileEmail: {
    fontSize: 14,
    color: PRO_BLUE,
    marginBottom: 6,
  },
  profileRole: {
    fontSize: 13,
    color: "#A0AEC0",
    marginBottom: 4,
  },
  profileSince: {
    fontSize: 12,
    color: "#718096",
  },
  formSection: {
    backgroundColor: CARD_BG,
    borderRadius: 16,
    marginHorizontal: 20,
    marginBottom: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: BORDER_COLOR,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#fff",
    marginBottom: 20,
    letterSpacing: 0.5,
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputLabelContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  inputLabel: {
    color: "#E2E8F0",
    fontSize: 15,
    fontWeight: "600",
    marginLeft: 8,
  },
  textInput: {
    backgroundColor: "rgba(26, 38, 51, 0.8)",
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 14,
    color: "#fff",
    fontSize: 16,
    borderWidth: 1,
    borderColor: "rgba(66, 165, 245, 0.1)",
  },
  textArea: {
    minHeight: 100,
    textAlignVertical: "top",
  },
  statsSection: {
    backgroundColor: CARD_BG,
    borderRadius: 16,
    marginHorizontal: 20,
    marginBottom: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: BORDER_COLOR,
  },
  statsGrid: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  statCard: {
    alignItems: "center",
    backgroundColor: "rgba(26, 38, 51, 0.8)",
    borderRadius: 12,
    padding: 16,
    flex: 1,
    marginHorizontal: 4,
  },
  statIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "rgba(66, 165, 245, 0.1)",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 8,
  },
  statNumber: {
    fontSize: 20,
    fontWeight: "800",
    color: "#fff",
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: "#A0AEC0",
    fontWeight: "500",
  },
  actionsSection: {
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  saveButton: {
    flexDirection: "row",
    backgroundColor: PRO_BLUE,
    borderRadius: 12,
    padding: 18,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 12,
  },
  cancelButton: {
    flexDirection: "row",
    backgroundColor: CARD_BG,
    borderRadius: 12,
    padding: 18,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: BORDER_COLOR,
  },
  cancelButtonText: {
    color: PRO_BLUE,
    fontSize: 16,
    fontWeight: "700",
    marginLeft: 8,
  },
  spacer: {
    height: 20,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0, 0, 0, 0.8)",
  },
  modalContent: {
    backgroundColor: CARD_BG,
    borderRadius: 16,
    padding: 24,
    width: "80%",
    borderWidth: 1,
    borderColor: BORDER_COLOR,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#fff",
    marginBottom: 20,
    textAlign: "center",
  },
  modalButton: {
    flexDirection: "row",
    backgroundColor: PRO_BLUE,
    padding: 16,
    borderRadius: 12,
    alignItems: "center",
    marginBottom: 12,
  },
  disabledButton: {
    backgroundColor: "#3A4A5A",
    opacity: 0.6,
  },
  cancelModalButton: {
    backgroundColor: "#3A4A5A",
  },
  modalButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
    marginLeft: 8,
    flex: 1,
    textAlign: "center",
  },
  cancelModalButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
    textAlign: "center",
  },
  fullscreenPhotoContainer: {
    flex: 1,
    backgroundColor: "black",
    justifyContent: "center",
    alignItems: "center",
    position: "relative",
  },
  fullscreenPhoto: {
    width: "100%",
    height: "100%",
  },
  closeFullscreenButton: {
    position: "absolute",
    top: 50,
    right: 20,
    zIndex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    borderRadius: 20,
    padding: 8,
  },
});

export default ModifierInfos;