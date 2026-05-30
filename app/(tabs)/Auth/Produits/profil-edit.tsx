

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
import { useTheme } from "../../../../app/theme/ThemeContext";
import { useLanguage } from "../../../../context/LanguageContext";

const { width, height } = Dimensions.get("window");
const PRO_BLUE = "#42A5F5";
const PRO_GREEN = "#4CAF50";
const NOTIFICATION_RED = "#FF3B30";

const BASE_URL = "https://shopnet-backend.onrender.com";

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

// Hook couleurs dynamiques
const useDynamicColors = () => {
  const { isDark } = useTheme();
  return {
    background: isDark ? '#0D0D0D' : '#00182A',
    surface: isDark ? '#1A1A1A' : 'rgba(30, 42, 59, 0.9)',
    cardAlt: isDark ? '#222222' : 'rgba(26, 38, 51, 0.8)',
    border: isDark ? '#2E2E2E' : 'rgba(66, 165, 245, 0.1)',
    text: isDark ? '#F5F5F5' : '#FFFFFF',
    textSecondary: isDark ? '#B0B0B0' : '#A0AEC0',
    textMuted: isDark ? '#888888' : '#718096',
    accent: '#42A5F5',
    success: '#4CAF50',
    danger: '#FF3B30',
    headerBg: isDark ? '#1A1A1A' : '#00182A',
    inputBg: isDark ? '#222222' : 'rgba(26, 38, 51, 0.8)',
    inputBorder: isDark ? '#2E2E2E' : 'rgba(66, 165, 245, 0.1)',
    inputText: isDark ? '#F5F5F5' : '#FFFFFF',
    placeholder: isDark ? '#666666' : '#718096',
    statBg: isDark ? '#222222' : 'rgba(26, 38, 51, 0.8)',
    statIconBg: isDark ? 'rgba(66, 165, 245, 0.15)' : 'rgba(66, 165, 245, 0.1)',
    modalBg: isDark ? '#1A1A1A' : 'rgba(30, 42, 59, 0.9)',
    overlay: 'rgba(0, 0, 0, 0.8)',
    statusBar: isDark ? '#0D0D0D' : '#00182A',
    barStyle: 'light-content' as const,
    coverPlaceholderBg: isDark ? '#222222' : 'rgba(26, 38, 51, 0.8)',
    profilePlaceholderBg: isDark ? '#1A1A1A' : '#1a2530',
    profileBorder: isDark ? '#1A1A1A' : '#00182A',
    cancelBg: isDark ? '#1A1A1A' : 'rgba(30, 42, 59, 0.9)',
    white: '#FFFFFF',
  };
};

const ModifierInfos = () => {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { language } = useLanguage();
  const fr = language === 'fr';
  const COLORS = useDynamicColors();
  
  const scrollY = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;

  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [token, setToken] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    fullName: "", phone: "", companyName: "", nif: "", address: "", description: "",
  });

  const [photoModalVisible, setPhotoModalVisible] = useState(false);
  const [photoModalType, setPhotoModalType] = useState<"profile" | "cover" | null>(null);
  const [viewingPhoto, setViewingPhoto] = useState(false);

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 600, useNativeDriver: true }),
    ]).start();
    loadTokenAndUser();
  }, []);

  const loadTokenAndUser = useCallback(async () => {
    try {
      const savedToken = await AsyncStorage.getItem("userToken");
      if (!savedToken) { router.push("/splash"); return; }
      setToken(savedToken);
      await fetchUserProfile(savedToken);
    } catch (error) {
      console.error("Erreur chargement token/profil:", error);
      Alert.alert(fr ? "Erreur" : "Error", fr ? "Impossible de charger les données du profil" : "Unable to load profile data");
    }
  }, [fr]);

  const fetchUserProfile = async (token: string) => {
    try {
      setLoading(true);
      const response = await axios.get(`${BASE_URL}/api/user/profile`, { headers: { Authorization: `Bearer ${token}` } });
      if (response.data.success) {
        const userData = response.data.user;
        setUser(userData);
        setFormData({
          fullName: userData.fullName || "", phone: userData.phone || "",
          companyName: userData.companyName || "", nif: userData.nif || "",
          address: userData.address || "", description: userData.description || "",
        });
      }
    } catch (error) {
      console.error("Erreur fetchUserProfile:", error);
      Alert.alert(fr ? "Erreur" : "Error", fr ? "Erreur lors du chargement du profil" : "Error loading profile");
    } finally { setLoading(false); }
  };

  const handleInputChange = (field: keyof typeof formData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSaveProfile = async () => {
    if (!token || !user) return;
    if (!formData.fullName.trim()) {
      Alert.alert(fr ? "Erreur" : "Error", fr ? "Le nom complet est requis" : "Full name is required");
      return;
    }
    try {
      setSaving(true);
      const response = await axios.put(`${BASE_URL}/api/user/profile`, formData, { headers: { Authorization: `Bearer ${token}` } });
      if (response.data.success) {
        await fetchUserProfile(token);
        Alert.alert(fr ? "Succès" : "Success", fr ? "Profil mis à jour avec succès" : "Profile updated successfully", [{ text: "OK", onPress: () => router.back() }]);
      } else throw new Error(response.data.message || (fr ? "Erreur lors de la mise à jour" : "Update error"));
    } catch (error: any) {
      Alert.alert(fr ? "Erreur" : "Error", error.response?.data?.message || error.message || (fr ? "Échec de la mise à jour du profil" : "Profile update failed"));
    } finally { setSaving(false); }
  };

  const handlePhotoAction = (type: "profile" | "cover") => { setPhotoModalType(type); setPhotoModalVisible(true); };
  const closePhotoModal = () => { setPhotoModalVisible(false); setPhotoModalType(null); setViewingPhoto(false); };

  const handleViewPhoto = () => {
    if (!photoModalType || !user) return;
    const photoField = photoModalType === "profile" ? "profile_photo" : "cover_photo";
    if (!user[photoField]) {
      Alert.alert(fr ? "Aucune photo" : "No Photo", fr ? `Aucune photo de ${photoModalType === "profile" ? "profil" : "couverture"} disponible` : `No ${photoModalType === "profile" ? "profile" : "cover"} photo available`);
      return;
    }
    setViewingPhoto(true);
  };

  const handleChoosePhoto = async () => {
    if (!token || !photoModalType || !user) return;
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== "granted") { Alert.alert(fr ? "Permission requise" : "Permission Required", fr ? "L'accès à la galerie est nécessaire" : "Gallery access is required"); return; }
      const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, allowsEditing: true, aspect: photoModalType === "profile" ? [1, 1] : [16, 9], quality: 0.8 });
      if (result.canceled || !result.assets[0]) return;
      const imageUri = result.assets[0].uri;
      setUploading(true);
      const formDataUpload = new FormData();
      const filename = imageUri.split('/').pop() || `photo_${Date.now()}.jpg`;
      const match = /\.(\w+)$/.exec(filename);
      const type = match ? `image/${match[1]}` : 'image/jpeg';
      formDataUpload.append(photoModalType === "profile" ? "profile_photo" : "cover_photo", { uri: imageUri, name: filename, type } as any);
      const endpoint = photoModalType === "profile" ? `${BASE_URL}/api/user/profile/photo` : `${BASE_URL}/api/user/cover/photo`;
      const response = await axios.put(endpoint, formDataUpload, { headers: { Authorization: `Bearer ${token}`, "Content-Type": "multipart/form-data" } });
      if (response.data.success) {
        await fetchUserProfile(token);
        Alert.alert(fr ? "Succès" : "Success", fr ? `Photo ${photoModalType === "profile" ? "de profil" : "de couverture"} mise à jour` : `${photoModalType === "profile" ? "Profile" : "Cover"} photo updated`);
      }
    } catch (error: any) {
      Alert.alert(fr ? "Erreur" : "Error", error.response?.data?.message || error.message || (fr ? "Échec du téléchargement" : "Upload failed"));
    } finally { setUploading(false); closePhotoModal(); }
  };

  const formatDate = (dateString: string) => {
    try { return new Date(dateString).toLocaleDateString(fr ? "fr-FR" : "en-US", { year: "numeric", month: "long", day: "numeric" }); }
    catch { return dateString; }
  };

  const headerHeight = scrollY.interpolate({ inputRange: [0, 100], outputRange: [180, 100], extrapolate: "clamp" });
  const headerOpacity = scrollY.interpolate({ inputRange: [0, 80], outputRange: [1, 0.9], extrapolate: "clamp" });

  if (loading && !user) {
    return (
      <SafeAreaView style={[styles.loadingContainer, { backgroundColor: COLORS.background }]}>
        <StatusBar backgroundColor={COLORS.statusBar} barStyle={COLORS.barStyle} />
        <ActivityIndicator size="large" color={COLORS.accent} />
        <Text style={[styles.loadingText, { color: COLORS.accent }]}>{fr ? "Chargement du profil..." : "Loading profile..."}</Text>
      </SafeAreaView>
    );
  }

  if (!user) {
    return (
      <SafeAreaView style={[styles.errorContainer, { backgroundColor: COLORS.background }]}>
        <StatusBar backgroundColor={COLORS.statusBar} barStyle={COLORS.barStyle} />
        <MaterialIcons name="error-outline" size={64} color={COLORS.danger} />
        <Text style={[styles.errorTitle, { color: COLORS.text }]}>{fr ? "Profil non disponible" : "Profile Unavailable"}</Text>
        <Text style={[styles.errorSubtitle, { color: COLORS.textSecondary }]}>{fr ? "Impossible de charger vos informations" : "Unable to load your information"}</Text>
        <TouchableOpacity style={[styles.retryButton, { backgroundColor: COLORS.accent }]} onPress={loadTokenAndUser}><Text style={styles.retryButtonText}>{fr ? "Réessayer" : "Retry"}</Text></TouchableOpacity>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}><Text style={[styles.backButtonText, { color: COLORS.accent }]}>{fr ? "Retour" : "Back"}</Text></TouchableOpacity>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: COLORS.background }]}>
      <StatusBar backgroundColor={COLORS.statusBar} barStyle={COLORS.barStyle} />
      <Animated.View style={[styles.headerContainer, { height: headerHeight, opacity: headerOpacity, backgroundColor: COLORS.headerBg }]}>
        <View style={styles.headerContent}>
          <View style={styles.headerTop}>
            <TouchableOpacity style={styles.backButtonHeader} onPress={() => router.back()}><Ionicons name="arrow-back" size={24} color={COLORS.text} /></TouchableOpacity>
            <Text style={[styles.headerTitle, { color: COLORS.text }]}>{fr ? "Modifier le profil" : "Edit Profile"}</Text>
            <TouchableOpacity style={[styles.saveButtonHeader, { backgroundColor: COLORS.surface, borderColor: COLORS.border }]} onPress={handleSaveProfile} disabled={saving}>
              {saving ? <ActivityIndicator size="small" color={COLORS.accent} /> : <Text style={[styles.saveButtonText, { color: COLORS.accent }]}>{fr ? "Sauvegarder" : "Save"}</Text>}
            </TouchableOpacity>
          </View>
          <TouchableOpacity style={styles.coverPhotoContainer} activeOpacity={0.8} onPress={() => handlePhotoAction("cover")}>
            {user.cover_photo ? (<Image source={{ uri: user.cover_photo }} style={styles.coverPhoto} />) : (
              <View style={[styles.coverPlaceholder, { backgroundColor: COLORS.coverPlaceholderBg }]}><MaterialCommunityIcons name="image-edit" size={40} color={COLORS.accent} /><Text style={[styles.coverPlaceholderText, { color: COLORS.accent }]}>{fr ? "Photo de couverture" : "Cover Photo"}</Text></View>
            )}
            <View style={styles.coverOverlay} /><View style={[styles.coverEditBadge, { backgroundColor: COLORS.accent, borderColor: COLORS.background }]}><Ionicons name="camera" size={16} color={COLORS.white} /></View>
          </TouchableOpacity>
        </View>
      </Animated.View>

      <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === "ios" ? "padding" : "height"} keyboardVerticalOffset={Platform.OS === "ios" ? 90 : 0}>
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false} onScroll={Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], { useNativeDriver: false })} scrollEventThrottle={16}>
          <Animated.View style={[styles.profileSection, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
            <View style={styles.profilePhotoWrapper}>
              <TouchableOpacity style={[styles.profilePhotoContainer, { borderColor: COLORS.profileBorder }]} activeOpacity={0.8} onPress={() => handlePhotoAction("profile")}>
                {user.profile_photo ? (<Image source={{ uri: user.profile_photo }} style={styles.profilePhoto} />) : (
                  <View style={[styles.profilePlaceholder, { backgroundColor: COLORS.profilePlaceholderBg }]}><FontAwesome5 name="user-tie" size={40} color={COLORS.accent} /></View>
                )}
                <View style={[styles.profileEditBadge, { backgroundColor: COLORS.accent, borderColor: COLORS.profileBorder }]}><Ionicons name="camera" size={16} color={COLORS.white} /></View>
              </TouchableOpacity>
              <View style={styles.profileInfo}>
                <Text style={[styles.profileName, { color: COLORS.text }]}>{user.fullName}</Text>
                <Text style={[styles.profileEmail, { color: COLORS.accent }]}>{user.email}</Text>
                <Text style={[styles.profileRole, { color: COLORS.textSecondary }]}><Ionicons name="briefcase" size={12} color={COLORS.accent} /> {user.role}</Text>
                <Text style={[styles.profileSince, { color: COLORS.textMuted }]}><Ionicons name="calendar" size={12} color={COLORS.accent} /> {fr ? "Membre depuis" : "Member since"} {formatDate(user.date_inscription)}</Text>
              </View>
            </View>
          </Animated.View>

          <Animated.View style={[styles.formSection, { backgroundColor: COLORS.surface, borderColor: COLORS.border, opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
            <Text style={[styles.sectionTitle, { color: COLORS.text }]}>{fr ? "Informations personnelles" : "Personal Information"}</Text>
            <View style={styles.inputGroup}><View style={styles.inputLabelContainer}><Ionicons name="person" size={18} color={COLORS.accent} /><Text style={[styles.inputLabel, { color: COLORS.text }]}>{fr ? "Nom complet *" : "Full Name *"}</Text></View><TextInput style={[styles.textInput, { backgroundColor: COLORS.inputBg, borderColor: COLORS.inputBorder, color: COLORS.inputText }]} value={formData.fullName} onChangeText={(value) => handleInputChange("fullName", value)} placeholder={fr ? "Votre nom complet" : "Your full name"} placeholderTextColor={COLORS.placeholder} autoCapitalize="words" /></View>
            <View style={styles.inputGroup}><View style={styles.inputLabelContainer}><Ionicons name="call" size={18} color={COLORS.accent} /><Text style={[styles.inputLabel, { color: COLORS.text }]}>{fr ? "Téléphone" : "Phone"}</Text></View><TextInput style={[styles.textInput, { backgroundColor: COLORS.inputBg, borderColor: COLORS.inputBorder, color: COLORS.inputText }]} value={formData.phone} onChangeText={(value) => handleInputChange("phone", value)} placeholder={fr ? "Votre numéro de téléphone" : "Your phone number"} placeholderTextColor={COLORS.placeholder} keyboardType="phone-pad" /></View>
            <View style={styles.inputGroup}><View style={styles.inputLabelContainer}><MaterialIcons name="location-on" size={18} color={COLORS.accent} /><Text style={[styles.inputLabel, { color: COLORS.text }]}>{fr ? "Adresse" : "Address"}</Text></View><TextInput style={[styles.textInput, styles.textArea, { backgroundColor: COLORS.inputBg, borderColor: COLORS.inputBorder, color: COLORS.inputText }]} value={formData.address} onChangeText={(value) => handleInputChange("address", value)} placeholder={fr ? "Votre adresse complète" : "Your full address"} placeholderTextColor={COLORS.placeholder} multiline numberOfLines={3} /></View>
            <View style={styles.inputGroup}><View style={styles.inputLabelContainer}><Ionicons name="business" size={18} color={COLORS.accent} /><Text style={[styles.inputLabel, { color: COLORS.text }]}>{fr ? "Description" : "Description"}</Text></View><TextInput style={[styles.textInput, styles.textArea, { backgroundColor: COLORS.inputBg, borderColor: COLORS.inputBorder, color: COLORS.inputText }]} value={formData.description} onChangeText={(value) => handleInputChange("description", value)} placeholder={fr ? "Décrivez-vous ou votre entreprise..." : "Describe yourself or your business..."} placeholderTextColor={COLORS.placeholder} multiline numberOfLines={4} textAlignVertical="top" /></View>
          </Animated.View>

          <Animated.View style={[styles.formSection, { backgroundColor: COLORS.surface, borderColor: COLORS.border, opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
            <Text style={[styles.sectionTitle, { color: COLORS.text }]}>{fr ? "Informations entreprise" : "Company Information"}</Text>
            <View style={styles.inputGroup}><View style={styles.inputLabelContainer}><FontAwesome5 name="building" size={18} color={COLORS.accent} /><Text style={[styles.inputLabel, { color: COLORS.text }]}>{fr ? "Nom de l'entreprise" : "Company Name"}</Text></View><TextInput style={[styles.textInput, { backgroundColor: COLORS.inputBg, borderColor: COLORS.inputBorder, color: COLORS.inputText }]} value={formData.companyName} onChangeText={(value) => handleInputChange("companyName", value)} placeholder={fr ? "Nom de votre entreprise" : "Your company name"} placeholderTextColor={COLORS.placeholder} autoCapitalize="words" /></View>
            <View style={styles.inputGroup}><View style={styles.inputLabelContainer}><MaterialIcons name="badge" size={18} color={COLORS.accent} /><Text style={[styles.inputLabel, { color: COLORS.text }]}>{fr ? "Numéro NIF" : "Tax ID"}</Text></View><TextInput style={[styles.textInput, { backgroundColor: COLORS.inputBg, borderColor: COLORS.inputBorder, color: COLORS.inputText }]} value={formData.nif} onChangeText={(value) => handleInputChange("nif", value)} placeholder={fr ? "Numéro d'identification fiscale" : "Tax identification number"} placeholderTextColor={COLORS.placeholder} /></View>
          </Animated.View>

          <Animated.View style={[styles.statsSection, { backgroundColor: COLORS.surface, borderColor: COLORS.border, opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
            <Text style={[styles.sectionTitle, { color: COLORS.text }]}>{fr ? "Statistiques" : "Statistics"}</Text>
            <View style={styles.statsGrid}>
              {[{ value: user.productsCount || 0, label: fr ? "Produits" : "Products", icon: "cube-outline", color: COLORS.accent },
                { value: user.salesCount || 0, label: fr ? "Ventes" : "Sales", icon: "trending-up", color: COLORS.success },
                { value: (Number(user.rating || 0)).toFixed(1), label: fr ? "Note" : "Rating", icon: "star", color: "#FFA726" },
                { value: user.ordersCount || 0, label: fr ? "Commandes" : "Orders", icon: "cart", color: COLORS.accent }].map((stat, i) => (
                <View key={i} style={[styles.statCard, { backgroundColor: COLORS.statBg }]}>
                  <View style={[styles.statIconContainer, { backgroundColor: COLORS.statIconBg }]}><Ionicons name={stat.icon as any} size={24} color={stat.color} /></View>
                  <Text style={[styles.statNumber, { color: COLORS.text }]}>{stat.value}</Text>
                  <Text style={[styles.statLabel, { color: COLORS.textSecondary }]}>{stat.label}</Text>
                </View>
              ))}
            </View>
          </Animated.View>

          <Animated.View style={[styles.actionsSection, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
            <TouchableOpacity style={[styles.saveButtonMain, { backgroundColor: COLORS.accent }]} onPress={handleSaveProfile} disabled={saving}>
              {saving ? <ActivityIndicator size="small" color={COLORS.white} /> : <><Ionicons name="save" size={20} color={COLORS.white} /><Text style={[styles.saveButtonMainText, { color: COLORS.white }]}>{fr ? "Sauvegarder les modifications" : "Save Changes"}</Text></>}
            </TouchableOpacity>
            <TouchableOpacity style={[styles.cancelButtonMain, { backgroundColor: COLORS.cancelBg, borderColor: COLORS.border }]} onPress={() => router.back()} disabled={saving}>
              <Ionicons name="close" size={20} color={COLORS.accent} /><Text style={[styles.cancelButtonMainText, { color: COLORS.accent }]}>{fr ? "Annuler" : "Cancel"}</Text>
            </TouchableOpacity>
          </Animated.View>
          <View style={styles.spacer} />
        </ScrollView>
      </KeyboardAvoidingView>

      <Modal visible={photoModalVisible && !viewingPhoto} transparent animationType="fade" onRequestClose={closePhotoModal}>
        <View style={[styles.modalOverlay, { backgroundColor: COLORS.overlay }]}>
          <View style={[styles.modalContent, { backgroundColor: COLORS.modalBg, borderColor: COLORS.border }]}>
            <Text style={[styles.modalTitle, { color: COLORS.text }]}>{photoModalType === "profile" ? (fr ? "Photo de profil" : "Profile Photo") : (fr ? "Photo de couverture" : "Cover Photo")}</Text>
            <TouchableOpacity style={[styles.modalButton, { backgroundColor: COLORS.accent }, !user[photoModalType === "profile" ? "profile_photo" : "cover_photo"] && styles.disabledButton]} onPress={handleViewPhoto} disabled={uploading || !user[photoModalType === "profile" ? "profile_photo" : "cover_photo"]}><Ionicons name="eye" size={20} color={COLORS.white} /><Text style={styles.modalButtonText}>{fr ? "Voir la photo" : "View Photo"}</Text></TouchableOpacity>
            <TouchableOpacity style={[styles.modalButton, { backgroundColor: COLORS.accent }]} onPress={handleChoosePhoto} disabled={uploading}>{uploading ? <ActivityIndicator color={COLORS.white} /> : <><Ionicons name="image" size={20} color={COLORS.white} /><Text style={styles.modalButtonText}>{fr ? "Changer la photo" : "Change Photo"}</Text></>}</TouchableOpacity>
            <TouchableOpacity style={[styles.modalButton, styles.cancelModalButton]} onPress={closePhotoModal} disabled={uploading}><Text style={styles.cancelModalButtonText}>{fr ? "Annuler" : "Cancel"}</Text></TouchableOpacity>
          </View>
        </View>
      </Modal>

      <Modal visible={viewingPhoto} transparent={false} animationType="fade" onRequestClose={closePhotoModal}>
        <View style={styles.fullscreenPhotoContainer}>
          <TouchableOpacity style={styles.closeFullscreenButton} onPress={closePhotoModal}><Ionicons name="close" size={30} color={COLORS.white} /></TouchableOpacity>
          {photoModalType === "profile" && user.profile_photo && <Image source={{ uri: user.profile_photo }} style={styles.fullscreenPhoto} resizeMode="contain" />}
          {photoModalType === "cover" && user.cover_photo && <Image source={{ uri: user.cover_photo }} style={styles.fullscreenPhoto} resizeMode="cover" />}
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: { flex: 1, paddingTop: Platform.OS === "android" ? StatusBar.currentHeight : 0 },
  loadingContainer: { flex: 1, justifyContent: "center", alignItems: "center" },
  loadingText: { fontSize: 16, marginTop: 12, fontWeight: "600" },
  errorContainer: { flex: 1, justifyContent: "center", alignItems: "center", padding: 20 },
  errorTitle: { fontSize: 22, fontWeight: "700", marginTop: 16, marginBottom: 8 },
  errorSubtitle: { fontSize: 16, textAlign: "center", marginBottom: 24 },
  retryButton: { paddingHorizontal: 32, paddingVertical: 12, borderRadius: 8, marginBottom: 12 },
  retryButtonText: { color: "#FFFFFF", fontSize: 16, fontWeight: "600" },
  backButton: { paddingHorizontal: 32, paddingVertical: 12 },
  backButtonText: { fontSize: 16, fontWeight: "600" },
  container: { flex: 1, backgroundColor: "transparent" },
  headerContainer: { position: "absolute", top: 0, left: 0, right: 0, zIndex: 10, overflow: "hidden" },
  headerContent: { flex: 1, paddingHorizontal: 20, paddingTop: 10, justifyContent: "space-between" },
  headerTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingTop: 10 },
  backButtonHeader: { padding: 8 },
  headerTitle: { fontSize: 20, fontWeight: "800", letterSpacing: 0.5 },
  saveButtonHeader: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8, borderWidth: 1 },
  saveButtonText: { fontSize: 14, fontWeight: "700" },
  coverPhotoContainer: { height: 120, borderRadius: 12, overflow: "hidden", marginBottom: 20, position: "relative" },
  coverPhoto: { width: "100%", height: "100%" },
  coverPlaceholder: { flex: 1, justifyContent: "center", alignItems: "center" },
  coverPlaceholderText: { marginTop: 8, fontSize: 12, fontWeight: "500" },
  coverOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(0, 0, 0, 0.3)" },
  coverEditBadge: { position: "absolute", bottom: 10, right: 10, width: 32, height: 32, borderRadius: 16, justifyContent: "center", alignItems: "center", borderWidth: 2 },
  scrollContent: { paddingTop: 180, paddingBottom: 40 },
  profileSection: { paddingHorizontal: 20, marginBottom: 20 },
  profilePhotoWrapper: { flexDirection: "row", alignItems: "center" },
  profilePhotoContainer: { width: 100, height: 100, borderRadius: 50, borderWidth: 4, shadowColor: "#000", shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.4, shadowRadius: 12, elevation: 8, position: "relative" },
  profilePhoto: { width: "100%", height: "100%", borderRadius: 50 },
  profilePlaceholder: { flex: 1, justifyContent: "center", alignItems: "center" },
  profileEditBadge: { position: "absolute", bottom: 0, right: 0, width: 28, height: 28, borderRadius: 14, justifyContent: "center", alignItems: "center", borderWidth: 2 },
  profileInfo: { flex: 1, marginLeft: 16 },
  profileName: { fontSize: 22, fontWeight: "800", marginBottom: 4 },
  profileEmail: { fontSize: 14, marginBottom: 6 },
  profileRole: { fontSize: 13, marginBottom: 4 },
  profileSince: { fontSize: 12 },
  formSection: { borderRadius: 16, marginHorizontal: 20, marginBottom: 20, padding: 20, borderWidth: 1 },
  sectionTitle: { fontSize: 18, fontWeight: "800", marginBottom: 20, letterSpacing: 0.5 },
  inputGroup: { marginBottom: 16 },
  inputLabelContainer: { flexDirection: "row", alignItems: "center", marginBottom: 8 },
  inputLabel: { fontSize: 15, fontWeight: "600", marginLeft: 8 },
  textInput: { borderRadius: 10, paddingHorizontal: 16, paddingVertical: 14, fontSize: 16, borderWidth: 1 },
  textArea: { minHeight: 100, textAlignVertical: "top" },
  statsSection: { borderRadius: 16, marginHorizontal: 20, marginBottom: 20, padding: 20, borderWidth: 1 },
  statsGrid: { flexDirection: "row", justifyContent: "space-between" },
  statCard: { alignItems: "center", borderRadius: 12, padding: 16, flex: 1, marginHorizontal: 4 },
  statIconContainer: { width: 48, height: 48, borderRadius: 24, justifyContent: "center", alignItems: "center", marginBottom: 8 },
  statNumber: { fontSize: 20, fontWeight: "800", marginBottom: 4 },
  statLabel: { fontSize: 12, fontWeight: "500" },
  actionsSection: { paddingHorizontal: 20, marginBottom: 20 },
  saveButtonMain: { flexDirection: "row", borderRadius: 12, padding: 18, justifyContent: "center", alignItems: "center", marginBottom: 12 },
  saveButtonMainText: { fontSize: 16, fontWeight: "700", marginLeft: 8 },
  cancelButtonMain: { flexDirection: "row", borderRadius: 12, padding: 18, justifyContent: "center", alignItems: "center", borderWidth: 1 },
  cancelButtonMainText: { fontSize: 16, fontWeight: "700", marginLeft: 8 },
  spacer: { height: 20 },
  modalOverlay: { flex: 1, justifyContent: "center", alignItems: "center" },
  modalContent: { borderRadius: 16, padding: 24, width: "80%", borderWidth: 1 },
  modalTitle: { fontSize: 18, fontWeight: "700", marginBottom: 20, textAlign: "center" },
  modalButton: { flexDirection: "row", padding: 16, borderRadius: 12, alignItems: "center", marginBottom: 12 },
  disabledButton: { backgroundColor: "#3A4A5A", opacity: 0.6 },
  cancelModalButton: { backgroundColor: "#3A4A5A" },
  modalButtonText: { color: "#FFFFFF", fontSize: 16, fontWeight: "600", marginLeft: 8, flex: 1, textAlign: "center" },
  cancelModalButtonText: { color: "#FFFFFF", fontSize: 16, fontWeight: "600", textAlign: "center" },
  fullscreenPhotoContainer: { flex: 1, backgroundColor: "black", justifyContent: "center", alignItems: "center", position: "relative" },
  fullscreenPhoto: { width: "100%", height: "100%" },
  closeFullscreenButton: { position: "absolute", top: 50, right: 20, zIndex: 1, backgroundColor: "rgba(0, 0, 0, 0.5)", borderRadius: 20, padding: 8 },
});

export default ModifierInfos;