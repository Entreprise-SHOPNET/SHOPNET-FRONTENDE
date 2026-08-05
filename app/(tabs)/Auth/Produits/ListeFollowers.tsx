import React, { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Modal,
  StyleSheet,
  Alert,
  Linking,
  RefreshControl,
} from "react-native";
import { useRouter } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";
import { Ionicons } from "@expo/vector-icons";

const BASE_URL = "https://shopnet-backend.onrender.com";
const CACHE_KEY = "cached_followers";
const PRO_BLUE = "#42A5F5";
const SHOPNET_BLUE = "#00182A";

type Follower = {
  id: number;
  fullName: string;
  phone?: string | null;
  profilePhoto: string | null;
  role: string;
  followedAt: string;
};

const formatDate = (dateStr: string) => {
  const date = new Date(dateStr);
  return date.toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
};

const getCallingCodeForCountry = (country: string | undefined): string => {
  if (!country) return "+243";
  const countryLower = country.toLowerCase().trim();
  const codes: { [key: string]: string } = {
    "rdc": "+243",
    "congo": "+242",
    "cameroun": "+237",
    "angola": "+244",
    "gabon": "+241",
    "tchad": "+235",
    "centrafrique": "+236",
  };
  return codes[countryLower] || "+243";
};

const formatPhoneForWhatsApp = (phone: string, defaultCountryCode: string): string => {
  let cleaned = phone.replace(/[^\d+]/g, "");
  if (cleaned.startsWith("+")) return cleaned;
  if (cleaned.startsWith("00")) return "+" + cleaned.substring(2);
  if (cleaned.startsWith("0")) return defaultCountryCode + cleaned.substring(1);
  if (/^\d{8,9}$/.test(cleaned)) return defaultCountryCode + cleaned;
  return defaultCountryCode + cleaned;
};

export default function ListeFollowers() {
  const router = useRouter();
  const [followers, setFollowers] = useState<Follower[]>([]);
  const [loading, setLoading] = useState(true); // vrai uniquement au premier montage
  const [refreshing, setRefreshing] = useState(false);
  const [userName, setUserName] = useState("");
  const [userCountry, setUserCountry] = useState<string | undefined>(undefined);
  const [selectedFollower, setSelectedFollower] = useState<Follower | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [token, setToken] = useState<string | null>(null);

  // Initialisation du token et du profil utilisateur
  useEffect(() => {
    const init = async () => {
      const savedToken = await AsyncStorage.getItem("userToken");
      if (!savedToken) {
        router.push("/splash");
        return;
      }
      setToken(savedToken);
      try {
        const res = await axios.get(`${BASE_URL}/api/user/profile`, {
          headers: { Authorization: `Bearer ${savedToken}` },
        });
        if (res.data.success) {
          const userData = res.data.user;
          setUserName(userData.fullName);
          setUserCountry(userData.pays || userData.country || undefined);
        }
      } catch (error) {
        console.error("Erreur chargement profil utilisateur", error);
      }
    };
    init();
  }, []);

  // Chargement des abonnés avec cache
  const loadFollowers = useCallback(async () => {
    try {
      // 1. Afficher d'abord le cache local
      const cached = await AsyncStorage.getItem(CACHE_KEY);
      if (cached) {
        const parsed = JSON.parse(cached);
        setFollowers(parsed);
        setLoading(false); // cache dispo => plus de spinner
      } else {
        setLoading(true);
      }

      if (!token) return;

      // 2. Rafraîchir depuis l'API en arrière‑plan
      const res = await axios.get(`${BASE_URL}/api/followers/list`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.data.success) {
        const fresh = res.data.followers;
        setFollowers(fresh);
        await AsyncStorage.setItem(CACHE_KEY, JSON.stringify(fresh));
      }
    } catch (error) {
      console.error("Erreur chargement abonnés", error);
      // Si pas de cache du tout, on affiche une erreur
      const cached = await AsyncStorage.getItem(CACHE_KEY);
      if (!cached) {
        Alert.alert("Erreur", "Impossible de charger vos abonnés.");
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [token]);

  useEffect(() => {
    loadFollowers();
  }, [loadFollowers]);

  const onRefresh = () => {
    setRefreshing(true);
    loadFollowers();
  };

  const openModal = (follower: Follower) => {
    setSelectedFollower(follower);
    setModalVisible(true);
  };

  const handleUnfollow = async () => {
    if (!selectedFollower || !token) return;
    try {
      await axios.delete(`${BASE_URL}/api/followers/${selectedFollower.id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      // Mise à jour locale + cache
      const updated = followers.filter((f) => f.id !== selectedFollower.id);
      setFollowers(updated);
      await AsyncStorage.setItem(CACHE_KEY, JSON.stringify(updated));
      Alert.alert("Succès", `${selectedFollower.fullName} ne verra plus vos produits.`);
    } catch (error) {
      console.error("Erreur lors du retrait", error);
      Alert.alert("Erreur", "Impossible de retirer cet abonné.");
    } finally {
      setModalVisible(false);
    }
  };

  const handleWhatsApp = async () => {
    if (!selectedFollower) return;
    const rawPhone = selectedFollower.phone;
    if (!rawPhone) {
      Alert.alert("Information", "Numéro de téléphone non disponible.");
      setModalVisible(false);
      return;
    }

    const defaultCode = getCallingCodeForCountry(userCountry);
    const formattedPhone = formatPhoneForWhatsApp(rawPhone, defaultCode);

    const sellerName = userName || "le vendeur";
    const message = encodeURIComponent(
      `Bonjour ${selectedFollower.fullName},\n\n` +
      `Je suis ${sellerName}, votre vendeur sur SHOPNET. 🛍️\n` +
      `J’ai pensé à vous et je voulais savoir si vous aviez besoin de quelque chose aujourd’hui ?\n` +
      `N’hésitez pas à me dire ce que vous recherchez, je peux vous aider à trouver les meilleurs produits ! 😊\n\n` +
      `Bonne journée et à bientôt sur SHOPNET !`
    );

    const url = `https://wa.me/${formattedPhone}?text=${message}`;

    try {
      const supported = await Linking.canOpenURL(url);
      if (supported) {
        await Linking.openURL(url);
      } else {
        Alert.alert("WhatsApp non installé", "Veuillez installer WhatsApp.");
      }
    } catch {
      Alert.alert("Erreur", "Impossible d'ouvrir WhatsApp.");
    } finally {
      setModalVisible(false);
    }
  };

  const handleViewProducts = () => {
    if (!selectedFollower) return;
    setModalVisible(false);
    router.push({
      pathname: "/(tabs)/Auth/Profiles/SellerProfile",
      params: { id: selectedFollower.id.toString() },
    });
  };

  const renderFollower = ({ item }: { item: Follower }) => (
    <View style={styles.followerItem}>
      <TouchableOpacity
        style={styles.followerLeft}
        onPress={() => openModal(item)}
      >
        <View style={styles.avatarContainer}>
          {item.profilePhoto ? (
            <Image
              source={{
                uri: item.profilePhoto.startsWith("http")
                  ? item.profilePhoto
                  : `${BASE_URL}${item.profilePhoto}`,
              }}
              style={styles.avatar}
            />
          ) : (
            <View style={styles.avatarPlaceholder}>
              <Ionicons name="person" size={24} color="#A0AEC0" />
            </View>
          )}
        </View>
        <View style={styles.followerInfo}>
          <Text style={styles.followerName}>{item.fullName}</Text>
          <Text style={styles.followedAt}>
            Suit depuis le {formatDate(item.followedAt)}
          </Text>
        </View>
      </TouchableOpacity>
      <TouchableOpacity
        style={styles.moreButton}
        onPress={() => openModal(item)}
      >
        <Ionicons name="ellipsis-horizontal" size={24} color="#A0AEC0" />
      </TouchableOpacity>
    </View>
  );

  const ListHeader = () => (
    <Text style={styles.countText}>
      {followers.length} Abonné{followers.length > 1 ? "s" : ""}
    </Text>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>
          {userName ? userName : "Abonnés"}
        </Text>
        <View style={styles.placeholder} />
      </View>
      <View style={styles.divider} />

      {loading && followers.length === 0 ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={PRO_BLUE} />
          <Text style={styles.loadingText}>Chargement...</Text>
        </View>
      ) : (
        <FlatList
          data={followers}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderFollower}
          ListHeaderComponent={ListHeader}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={[PRO_BLUE]}
              tintColor={PRO_BLUE}
            />
          }
        />
      )}

      <Modal
        visible={modalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setModalVisible(false)}
      >
        <TouchableOpacity
          style={styles.modalBackdrop}
          activeOpacity={1}
          onPress={() => setModalVisible(false)}
        />
        <View style={styles.bottomSheet}>
          <TouchableOpacity style={styles.option} onPress={handleWhatsApp}>
            <Ionicons name="logo-whatsapp" size={22} color="#25D366" />
            <Text style={styles.optionText}>Envoyer un message via WhatsApp</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.option} onPress={handleViewProducts}>
            <Ionicons name="cube-outline" size={22} color={PRO_BLUE} />
            <Text style={styles.optionText}>Voir ses produits</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.option} onPress={handleUnfollow}>
            <Ionicons name="person-remove-outline" size={22} color="#FF3B30" />
            <Text style={[styles.optionText, { color: "#FF3B30" }]}>Retirer des abonnés</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.cancelButton}
            onPress={() => setModalVisible(false)}
          >
            <Text style={styles.cancelText}>Annuler</Text>
          </TouchableOpacity>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: SHOPNET_BLUE,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingTop: 50,
    paddingBottom: 12,
    backgroundColor: SHOPNET_BLUE,
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#FFFFFF",
    flex: 1,
    textAlign: "center",
  },
  placeholder: {
    width: 32,
  },
  divider: {
    height: 1,
    backgroundColor: "rgba(255,255,255,0.1)",
  },
  listContent: {
    paddingBottom: 40,
  },
  countText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#FFFFFF",
    paddingHorizontal: 16,
    paddingTop: 20,
    paddingBottom: 12,
  },
  followerItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.05)",
    justifyContent: "space-between",
  },
  followerLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  avatarContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    overflow: "hidden",
    backgroundColor: "#2C3A4A",
  },
  avatar: {
    width: "100%",
    height: "100%",
  },
  avatarPlaceholder: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  followerInfo: {
    marginLeft: 12,
    flex: 1,
  },
  followerName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#FFFFFF",
    marginBottom: 2,
  },
  followedAt: {
    fontSize: 13,
    color: "#A0AEC0",
  },
  moreButton: {
    padding: 8,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    color: PRO_BLUE,
    marginTop: 12,
    fontSize: 16,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  bottomSheet: {
    backgroundColor: "#1a2530",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 30,
  },
  option: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.06)",
  },
  optionText: {
    fontSize: 16,
    color: "#FFFFFF",
    marginLeft: 14,
    fontWeight: "500",
  },
  cancelButton: {
    marginTop: 12,
    alignItems: "center",
    paddingVertical: 14,
  },
  cancelText: {
    fontSize: 16,
    color: PRO_BLUE,
    fontWeight: "600",
  },
});