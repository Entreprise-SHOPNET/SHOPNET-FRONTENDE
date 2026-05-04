


import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Animated,
  SafeAreaView,
  StatusBar,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Picker } from "@react-native-picker/picker";

// ================= COLORS =================
const COLORS = {
  bg: "#00182A",
  card: "#1E2A3B",
  primary: "#42A5F5",
  white: "#FFFFFF",
  gray: "#A0AEC0",
  success: "#4CAF50",
  error: "#FF6B6B",
};

// ================= TYPES =================
type FormType = {
  titre: string;
  type_bien: string;
  type_offre: string;
  prix: string;
  devise: string;
  ville: string;
  commune: string;
  quartier: string;
  reference: string;
  description: string;
  whatsapp: string;
  telephone: string;
};

// ================= API =================
const API_BASE = "https://shopnet-immo-backend.onrender.com";
const GET_URL = (id: string) => `${API_BASE}/api/biens/${id}`;
const UPDATE_URL = (id: string) => `${API_BASE}/api/biens/update/${id}`;

export default function EditBienScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const fade = useRef(new Animated.Value(0)).current;

  const [form, setForm] = useState<FormType>({
    titre: "",
    type_bien: "Maison",
    type_offre: "Vente",
    prix: "",
    devise: "USD",
    ville: "",
    commune: "",
    quartier: "",
    reference: "",
    description: "",
    whatsapp: "",
    telephone: "",
  });

  const [toast, setToast] = useState("");
  const [toastType, setToastType] = useState<"success" | "error">("success");

  const typesBien = ["Maison", "Appartement", "Parcelle", "Bureau", "Entrepôt", "Ferme"];
  const typesOffre = ["Vente", "Location"];
  const devises = ["USD", "CDF"];

  const showToast = (message: string, type: "success" | "error" = "success") => {
    setToast(message);
    setToastType(type);
    setTimeout(() => setToast(""), 2500);
  };

  // ================= LOAD DATA =================
  useEffect(() => {
    loadData();
  }, [id]);

  const loadData = async () => {
    try {
      const token = await AsyncStorage.getItem("userToken");
      if (!token) {
        showToast("Session expirée, reconnectez-vous", "error");
        router.back();
        return;
      }

      const res = await fetch(GET_URL(id!), {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();

      if (!data.success) {
        showToast(data.message || "Bien introuvable", "error");
        router.back();
        return;
      }

      const b = data.bien;
      setForm({
        titre: b.titre || "",
        type_bien: b.type_bien || "Maison",
        type_offre: b.type_offre || "Vente",
        prix: b.prix ? String(b.prix) : "",
        devise: b.devise || "USD",
        ville: b.ville || "",
        commune: b.commune || "",
        quartier: b.quartier || "",
        reference: b.reference || "",
        description: b.description || "",
        whatsapp: b.whatsapp || "",
        telephone: b.telephone || "",
      });

      Animated.timing(fade, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }).start();
    } catch (err) {
      console.error(err);
      showToast("Erreur de connexion", "error");
    } finally {
      setLoading(false);
    }
  };

  // ================= VALIDATION =================
  const validateForm = (): boolean => {
    if (!form.titre.trim()) {
      showToast("Le titre est requis", "error");
      return false;
    }
    if (!form.prix || isNaN(Number(form.prix)) || Number(form.prix) <= 0) {
      showToast("Prix invalide", "error");
      return false;
    }
    if (!form.ville.trim()) {
      showToast("La ville est requise", "error");
      return false;
    }
    if (!form.commune.trim()) {
      showToast("La commune est requise", "error");
      return false;
    }
    if (!form.quartier.trim()) {
      showToast("Le quartier est requis", "error");
      return false;
    }
    if (!form.reference.trim()) {
      showToast("La référence est requise", "error");
      return false;
    }
    if (!form.description.trim()) {
      showToast("La description est requise", "error");
      return false;
    }
    if (!form.whatsapp.trim()) {
      showToast("Le numéro WhatsApp est requis", "error");
      return false;
    }
    return true;
  };

  // ================= SAVE =================
  const handleSave = async () => {
    if (!validateForm()) return;
    setSaving(true);

    try {
      const token = await AsyncStorage.getItem("userToken");
      if (!token) {
        showToast("Session expirée", "error");
        router.back();
        return;
      }

      const payload = {
        titre: form.titre.trim(),
        type_bien: form.type_bien,
        type_offre: form.type_offre,
        prix: Number(form.prix),
        devise: form.devise,
        ville: form.ville.trim(),
        commune: form.commune.trim(),
        quartier: form.quartier.trim(),
        reference: form.reference.trim(),
        description: form.description.trim(),
        whatsapp: form.whatsapp.trim(),
        telephone: form.telephone.trim() || null,
      };

      const res = await fetch(UPDATE_URL(id!), {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (data.success) {
        showToast("✅ Bien modifié avec succès (en attente de validation)", "success");
        setTimeout(() => router.back(), 1500);
      } else {
        showToast(data.message || "Erreur lors de la modification", "error");
      }
    } catch (err) {
      console.error(err);
      showToast("Erreur réseau", "error");
    } finally {
      setSaving(false);
    }
  };

  // ================= RENDER =================
  if (loading) {
    return (
      <SafeAreaView style={styles.center}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Chargement du bien...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.bg} />

      {/* HEADER */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={COLORS.primary} />
        </TouchableOpacity>
        <Text style={styles.title}>Modifier le bien</Text>
        <View style={{ width: 24 }} />
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={{ flex: 1 }}
        keyboardVerticalOffset={Platform.OS === "ios" ? 90 : 0}
      >
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <Animated.View style={{ opacity: fade }}>
            <View style={styles.card}>
              {/* Titre */}
              <Text style={styles.label}>Titre *</Text>
              <TextInput style={styles.input} value={form.titre} onChangeText={(t) => setForm({ ...form, titre: t })} />

              {/* Type de bien & Offre (côte à côte) */}
              <View style={styles.row}>
                <View style={[styles.half, { marginRight: 8 }]}>
                  <Text style={styles.label}>Type de bien *</Text>
                  <View style={styles.pickerWrapper}>
                    <Picker selectedValue={form.type_bien} onValueChange={(v) => setForm({ ...form, type_bien: v })} style={styles.picker}>
                      {typesBien.map((t) => <Picker.Item key={t} label={t} value={t} />)}
                    </Picker>
                  </View>
                </View>
                <View style={[styles.half, { marginLeft: 8 }]}>
                  <Text style={styles.label}>Offre *</Text>
                  <View style={styles.pickerWrapper}>
                    <Picker selectedValue={form.type_offre} onValueChange={(v) => setForm({ ...form, type_offre: v })} style={styles.picker}>
                      {typesOffre.map((o) => <Picker.Item key={o} label={o} value={o} />)}
                    </Picker>
                  </View>
                </View>
              </View>

              {/* Prix & Devise */}
              <View style={styles.row}>
                <View style={[styles.half, { marginRight: 8 }]}>
                  <Text style={styles.label}>Prix *</Text>
                  <TextInput style={styles.input} value={form.prix} keyboardType="numeric" onChangeText={(t) => setForm({ ...form, prix: t })} />
                </View>
                <View style={[styles.half, { marginLeft: 8 }]}>
                  <Text style={styles.label}>Devise</Text>
                  <View style={styles.pickerWrapper}>
                    <Picker selectedValue={form.devise} onValueChange={(v) => setForm({ ...form, devise: v })} style={styles.picker}>
                      {devises.map((d) => <Picker.Item key={d} label={d} value={d} />)}
                    </Picker>
                  </View>
                </View>
              </View>

              {/* Localisation */}
              <Text style={styles.label}>Ville *</Text>
              <TextInput style={styles.input} value={form.ville} onChangeText={(t) => setForm({ ...form, ville: t })} />

              <Text style={styles.label}>Commune *</Text>
              <TextInput style={styles.input} value={form.commune} onChangeText={(t) => setForm({ ...form, commune: t })} />

              <Text style={styles.label}>Quartier *</Text>
              <TextInput style={styles.input} value={form.quartier} onChangeText={(t) => setForm({ ...form, quartier: t })} />

              <Text style={styles.label}>Référence *</Text>
              <TextInput style={styles.input} value={form.reference} onChangeText={(t) => setForm({ ...form, reference: t })} />

              <Text style={styles.label}>Description *</Text>
              <TextInput style={[styles.input, styles.textArea]} multiline numberOfLines={4} value={form.description} onChangeText={(t) => setForm({ ...form, description: t })} />

              {/* Contacts */}
              <Text style={styles.label}>WhatsApp *</Text>
              <TextInput style={styles.input} value={form.whatsapp} onChangeText={(t) => setForm({ ...form, whatsapp: t })} placeholder="+243XXXXXXXXX" keyboardType="phone-pad" />

              <Text style={styles.label}>Téléphone (optionnel)</Text>
              <TextInput style={styles.input} value={form.telephone} onChangeText={(t) => setForm({ ...form, telephone: t })} placeholder="+243XXXXXXXXX" keyboardType="phone-pad" />
            </View>

            {/* BOUTON */}
            <TouchableOpacity style={styles.button} onPress={handleSave} disabled={saving}>
              {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Enregistrer</Text>}
            </TouchableOpacity>
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* TOAST */}
      {toast !== "" && <View style={[styles.toast, toastType === "error" && styles.toastError]}><Text style={styles.toastText}>{toast}</Text></View>}
    </SafeAreaView>
  );
}

// ================= STYLES =================
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  center: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: COLORS.bg },
  loadingText: { color: COLORS.white, marginTop: 12 },
  header: { flexDirection: "row", justifyContent: "space-between", padding: 16, alignItems: "center" },
  title: { color: COLORS.white, fontSize: 18, fontWeight: "bold" },
  content: { padding: 16, paddingBottom: 40 },
  card: { backgroundColor: COLORS.card, padding: 16, borderRadius: 16 },
  label: { color: COLORS.gray, marginTop: 10, marginBottom: 4 },
  input: { backgroundColor: "#0F1C2E", padding: 12, borderRadius: 8, color: COLORS.white, borderWidth: 0 },
  textArea: { minHeight: 100, textAlignVertical: "top" },
  row: { flexDirection: "row", justifyContent: "space-between" },
  half: { flex: 1 },
  pickerWrapper: { backgroundColor: "#0F1C2E", borderRadius: 8, overflow: "hidden" },
  picker: { height: 50, width: "100%", color: COLORS.white },
  button: { marginTop: 24, backgroundColor: COLORS.primary, paddingVertical: 14, borderRadius: 12, alignItems: "center" },
  buttonText: { color: "#fff", fontWeight: "bold", fontSize: 16 },
  toast: { position: "absolute", bottom: 40, alignSelf: "center", backgroundColor: COLORS.success, paddingHorizontal: 20, paddingVertical: 10, borderRadius: 30, zIndex: 1000 },
  toastError: { backgroundColor: COLORS.error },
  toastText: { color: "#fff", fontWeight: "500" },
});