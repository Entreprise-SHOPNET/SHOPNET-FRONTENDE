

import React, { useState, useRef } from "react";
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Animated,
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { FontAwesome } from "@expo/vector-icons";
import { authApi, getValidToken } from "../authService"; // adapte le chemin

const Promotion = () => {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { id, title, price } = params as {
    id: string;
    title?: string;
    price?: string;
  };

  const [promoPrice, setPromoPrice] = useState("");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);

  // Notifications animées style WhatsApp
  const [message, setMessage] = useState("");
  const scaleAnim = useRef(new Animated.Value(0.5)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  const showNotification = (msg: string) => {
    setMessage(msg);
    Animated.parallel([
      Animated.spring(scaleAnim, { toValue: 1, friction: 5, useNativeDriver: true }),
      Animated.timing(opacityAnim, { toValue: 1, duration: 200, useNativeDriver: true }),
    ]).start();

    setTimeout(() => {
      Animated.parallel([
        Animated.timing(opacityAnim, { toValue: 0, duration: 200, useNativeDriver: true }),
        Animated.timing(scaleAnim, { toValue: 0.5, duration: 200, useNativeDriver: true }),
      ]).start(() => setMessage(""));
    }, 2000);
  };

  const handleSavePromotion = async () => {
    if (!promoPrice) {
      showNotification("Veuillez saisir un prix promotionnel");
      return;
    }

    try {
      setLoading(true);
      const token = await getValidToken();
      if (!token) {
        showNotification("Utilisateur non connecté");
        setLoading(false);
        return;
      }

      const payload = { id, title, price, promoPrice, description };
      await authApi.post("/promotions", payload, {
        headers: { Authorization: `Bearer ${token}` },
      });

      showNotification("✅ Promotion appliquée !");
      setTimeout(() => router.back(), 2000);
    } catch (error: any) {
      console.error(error);
      showNotification("❌ Erreur lors de l’application de la promotion");
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: "#202A36" }}>
      <ScrollView contentContainerStyle={{ padding: 20 }}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <FontAwesome name="arrow-left" size={18} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Mettre en promotion</Text>
        </View>

        {/* Infos produit */}
        <View style={styles.infoBox}>
          <FontAwesome name="tag" size={22} color="#FA7921" />
          <Text style={styles.infoText}>{title}</Text>
        </View>
        <View style={styles.infoBox}>
          <FontAwesome name="dollar" size={22} color="#4CB050" />
          <Text style={styles.infoText}>
            Prix actuel : {price ? Number(price).toFixed(2) : "0"} $
          </Text>
        </View>

        {/* Prix promotionnel */}
        <View style={styles.inputBox}>
          <FontAwesome name="percent" size={20} color="#FA7921" style={styles.inputIcon} />
          <TextInput
            placeholder="Prix promotionnel"
            placeholderTextColor="#aaa"
            style={styles.input}
            keyboardType="numeric"
            value={promoPrice}
            onChangeText={setPromoPrice}
          />
        </View>

        {/* Description */}
        <View style={[styles.inputBox, { height: 100, alignItems: "flex-start" }]}>
          <FontAwesome name="info-circle" size={20} color="#FA7921" style={styles.inputIcon} />
          <TextInput
            placeholder="Description / Conditions"
            placeholderTextColor="#aaa"
            style={[styles.input, { height: 100, textAlignVertical: "top" }]}
            multiline
            value={description}
            onChangeText={setDescription}
          />
        </View>

        {/* Bouton valider */}
        <TouchableOpacity
          style={[styles.saveBtn, loading && { opacity: 0.6 }]}
          onPress={handleSavePromotion}
          disabled={loading}
        >
          <FontAwesome name="check" size={20} color="#fff" />
          <Text style={styles.saveText}>{loading ? "Enregistrement..." : "Valider la promotion"}</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Notification animée */}
      {message !== "" && (
        <View style={styles.notificationWrapper}>
          <Animated.View
            style={[
              styles.notification,
              { opacity: opacityAnim, transform: [{ scale: scaleAnim }] },
            ]}
          >
            <Text style={styles.notificationText}>{message}</Text>
          </Animated.View>
        </View>
      )}
    </View>
  );
};

export default Promotion;

const styles = StyleSheet.create({
  header: { flexDirection: "row", alignItems: "center", marginBottom: 20 },
  backBtn: { marginRight: 10, backgroundColor: "#FA7921", padding: 8, borderRadius: 10 },
  headerTitle: { color: "#fff", fontSize: 20, fontWeight: "700" },
  infoBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#2B3642",
    padding: 12,
    borderRadius: 12,
    marginBottom: 12,
  },
  infoText: { color: "#fff", marginLeft: 10, fontSize: 16 },
  inputBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#2B3642",
    paddingHorizontal: 12,
    borderRadius: 12,
    marginBottom: 12,
  },
  inputIcon: { marginRight: 10 },
  input: { flex: 1, color: "#fff", fontSize: 16, paddingVertical: 10 },
  saveBtn: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#4CB050",
    padding: 14,
    borderRadius: 12,
    marginTop: 20,
  },
  saveText: { color: "#fff", fontSize: 16, fontWeight: "600", marginLeft: 8 },
  notificationWrapper: {
    position: "absolute",
    top: "40%",
    left: 0,
    right: 0,
    alignItems: "center",
    zIndex: 100,
  },
  notification: {
    backgroundColor: "#25D366",
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 25,
    minWidth: "60%",
    alignItems: "center",
    justifyContent: "center",
  },
  notificationText: { color: "#fff", fontWeight: "600", fontSize: 16, textAlign: "center" },
});
