

import React, { useState, useEffect, useRef } from "react";
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
import { authApi, getValidToken } from "../authService"; // <-- adapte le chemin

const categories = ["Tendance", "Mode", "Tech", "Maison", "Beauté"];

const EditProduct = () => {
  const router = useRouter();
  const { id } = useLocalSearchParams(); // ID du produit

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [category, setCategory] = useState("");
  const [loading, setLoading] = useState(false);

  // Notification state
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
    }, 2000); // durée affichage 2s
  };

  const handleSave = async () => {
    try {
      setLoading(true);
      const token = await getValidToken();
      if (!token) {
        showNotification("Utilisateur non connecté");
        setLoading(false);
        return;
      }

      await authApi.put(
        `/products/${id}`,
        {
          title,
          description,
          price: Number(price),
          category,
        },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      showNotification("Produit modifié avec succès !");
      setTimeout(() => router.back(), 2000); // retourne après notification
    } catch (error: any) {
      console.error(error);
      showNotification(error.response?.data?.message || "Impossible de modifier le produit");
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={{ flex: 1 }}>
      <ScrollView style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <FontAwesome name="arrow-left" size={18} color="#fff" />
            <Text style={styles.backText}>Retour</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Modifier le produit</Text>
        </View>

        {/* Formulaire */}
        <View style={styles.form}>
          <Text style={styles.label}>Titre</Text>
          <TextInput
            style={styles.input}
            value={title}
            onChangeText={setTitle}
            placeholder="Titre du produit"
            placeholderTextColor="#aaa"
          />

          <Text style={styles.label}>Description</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            value={description}
            onChangeText={setDescription}
            placeholder="Description du produit"
            placeholderTextColor="#aaa"
            multiline
          />

          <Text style={styles.label}>Prix ($)</Text>
          <TextInput
            style={styles.input}
            value={price}
            onChangeText={setPrice}
            keyboardType="numeric"
            placeholder="Ex: 25.99"
            placeholderTextColor="#aaa"
          />

          <Text style={styles.label}>Catégorie</Text>
          <View style={styles.categoryContainer}>
            {categories.map((cat) => (
              <TouchableOpacity
                key={cat}
                style={[
                  styles.categoryButton,
                  category === cat && styles.categorySelected,
                ]}
                onPress={() => setCategory(cat)}
              >
                <Text
                  style={[
                    styles.categoryText,
                    category === cat && styles.categoryTextSelected,
                  ]}
                >
                  {cat}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Bouton Enregistrer */}
        <TouchableOpacity
          style={[styles.saveBtn, loading && { opacity: 0.6 }]}
          onPress={handleSave}
          disabled={loading}
        >
          <FontAwesome name="save" size={20} color="#fff" />
          <Text style={styles.saveText}>
            {loading ? "Enregistrement..." : "Enregistrer les modifications"}
          </Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Notification style WhatsApp */}
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

export default EditProduct;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#202A36" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#2b3645",
    padding: 15,
  },
  backBtn: { flexDirection: "row", alignItems: "center", marginRight: 15 },
  backText: { color: "#fff", marginLeft: 6, fontWeight: "600" },
  headerTitle: { color: "#fff", fontSize: 18, fontWeight: "700" },
  form: { padding: 20 },
  label: { color: "#fff", marginBottom: 6, fontWeight: "600" },
  input: {
    backgroundColor: "#2b3645",
    color: "#fff",
    padding: 10,
    borderRadius: 8,
    marginBottom: 15,
  },
  textArea: { height: 80, textAlignVertical: "top" },
  categoryContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginTop: 8,
  },
  categoryButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: "#2b3645",
    borderRadius: 8,
    marginRight: 10,
    marginBottom: 10,
  },
  categorySelected: {
    backgroundColor: "#4CB050",
  },
  categoryText: {
    color: "#fff",
    fontWeight: "500",
  },
  categoryTextSelected: {
    color: "#fff",
    fontWeight: "700",
  },
  saveBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#4CB050",
    padding: 15,
    borderRadius: 10,
    margin: 20,
  },
  saveText: { color: "#fff", marginLeft: 10, fontWeight: "700" },
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
  notificationText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 16,
    textAlign: "center",
  },
});
