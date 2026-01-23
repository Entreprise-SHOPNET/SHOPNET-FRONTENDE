

import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Animated,
  Easing,
} from "react-native";
import { useRouter } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { FontAwesome } from "@expo/vector-icons";

// --- TOAST ANIMATION ---
const Toast = ({ message, visible }: { message: string; visible: boolean }) => {
  const [fadeAnim] = useState(new Animated.Value(0));

  React.useEffect(() => {
    if (visible) {
      Animated.sequence([
        Animated.timing(fadeAnim, { toValue: 1, duration: 400, easing: Easing.ease, useNativeDriver: true }),
        Animated.delay(2000),
        Animated.timing(fadeAnim, { toValue: 0, duration: 400, easing: Easing.ease, useNativeDriver: true }),
      ]).start();
    }
  }, [visible]);

  return (
    <Animated.View style={[styles.toastContainer, { opacity: fadeAnim, bottom: visible ? 80 : -100 }]}>
      <Text style={styles.toastText}>{message}</Text>
    </Animated.View>
  );
};

// --- EMAIL VALIDATION STRICTE ---
const isValidEmail = (email: string) => /^[^\s@]+@gmail\.com$/.test(email);

// --- TELEPHONE VALIDATION ---
const isValidPhone = (phone: string) => /^(0|243)\d{8,12}$/.test(phone);

export default function FormulaireStandard() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [toastVisible, setToastVisible] = useState(false);
  const [toastMsg, setToastMsg] = useState("");

  const [form, setForm] = useState({
    nom: "",
    proprietaire: "",
    email: "",
    whatsapp: "",
    adresse: "",
    categorie: "",
    description: "",
  });

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setToastVisible(true);
    setTimeout(() => setToastVisible(false), 2500);
  };

  const nextStep = () => {
    if (step === 1 && (!form.nom || !form.proprietaire)) {
      showToast("Veuillez remplir tous les champs requis !");
      return;
    }
    if (step === 2) {
      if (!form.email || !form.whatsapp || !form.categorie) {
        showToast("Veuillez remplir tous les champs requis !");
        return;
      }
      if (!isValidEmail(form.email)) {
        showToast("Email invalide. L'email doit se terminer par @gmail.com");
        return;
      }
      if (!isValidPhone(form.whatsapp)) {
        showToast("Numéro invalide. Commencez par 0 ou 243 et utilisez uniquement des chiffres.");
        return;
      }
    }
    setStep(step + 1);
  };

  const prevStep = () => setStep(step - 1);

  const handleSubmit = async () => {
  if (!form.adresse || !form.description) {
    showToast("Veuillez remplir tous les champs avant de valider !");
    return;
  }
  if (form.description.length < 70) {
    showToast("La description doit contenir au moins 70 caractères !");
    return;
  }

  setLoading(true);
  const token = await AsyncStorage.getItem("userToken");

  if (!token) {
    setLoading(false);
    showToast("Token introuvable. Veuillez vous reconnecter.");
    return;
  }

  try {
const response = await fetch(
  "https://shopnet-backend.onrender.com/api/boutiques/create",
  {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ ...form, type: "Standard" }),
  }
);


    const data = await response.json();
    setLoading(false);

    if (response.ok) {
      showToast("✅ Boutique créée avec succès !");
      setTimeout(() => router.replace("/(tabs)/Auth/Produits/Fil"), 1500);
    } else {
      // Si le backend renvoie une erreur d'unicité
      if (data.message.includes("existe déjà")) {
        showToast(data.message); // Affiche le message exact
        return; // reste sur la page et empêche la navigation
      }

      showToast(data.message || "Erreur lors de la création.");
    }
  } catch (error) {
    setLoading(false);
    showToast("Erreur de connexion au serveur.");
  }
};

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={{ paddingBottom: 100 }}>
        {/* HEADER */}
        <View style={styles.header}>
          <TouchableOpacity onPress={step > 1 ? prevStep : () => router.back()}>
            <FontAwesome name="arrow-left" size={22} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Créer ma boutique</Text>
          <View style={{ width: 22 }} />
        </View>

        {/* FORM */}
        <View style={styles.formContainer}>
          {step === 1 && (
            <>
              <Text style={styles.stepTitle}>Étape 1/3 - Informations de base</Text>
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Nom de la boutique</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Ex : Chez Nathalie Mode"
                  placeholderTextColor="#aaa"
                  value={form.nom}
                  onChangeText={(t) => setForm({ ...form, nom: t })}
                />
              </View>
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Nom du propriétaire</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Votre nom complet"
                  placeholderTextColor="#aaa"
                  value={form.proprietaire}
                  onChangeText={(t) => setForm({ ...form, proprietaire: t })}
                />
              </View>
              <TouchableOpacity style={styles.nextBtn} onPress={nextStep}>
                <Text style={styles.nextBtnText}>Suivant</Text>
              </TouchableOpacity>
            </>
          )}

          {step === 2 && (
            <>
              <Text style={styles.stepTitle}>Étape 2/3 - Contact & Catégorie</Text>
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Email professionnel</Text>
                <TextInput
                  style={styles.input}
                  placeholder="exemple@gmail.com"
                  placeholderTextColor="#aaa"
                  keyboardType="email-address"
                  value={form.email}
                  onChangeText={(t) => setForm({ ...form, email: t })}
                />
              </View>
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Numéro WhatsApp</Text>
                <TextInput
                  style={styles.input}
                  placeholder="243970000000"
                  placeholderTextColor="#aaa"
                  keyboardType="phone-pad"
                  value={form.whatsapp}
                  onChangeText={(t) => setForm({ ...form, whatsapp: t })}
                />
              </View>
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Catégorie principale</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Mode, Beauté, Électronique..."
                  placeholderTextColor="#aaa"
                  value={form.categorie}
                  onChangeText={(t) => setForm({ ...form, categorie: t })}
                />
              </View>
              <TouchableOpacity style={styles.nextBtn} onPress={nextStep}>
                <Text style={styles.nextBtnText}>Suivant</Text>
              </TouchableOpacity>
            </>
          )}

          {step === 3 && (
            <>
              <Text style={styles.stepTitle}>Étape 3/3 - Description</Text>
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Adresse complète</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Kinshasa, Gombe"
                  placeholderTextColor="#aaa"
                  value={form.adresse}
                  onChangeText={(t) => setForm({ ...form, adresse: t })}
                />
              </View>
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Description</Text>
                <TextInput
                  style={[styles.input, { height: 80 }]}
                  placeholder="Décrivez votre boutique (min 70 caractères)..."
                  placeholderTextColor="#aaa"
                  multiline
                  value={form.description}
                  onChangeText={(t) => setForm({ ...form, description: t })}
                />
              </View>
              <TouchableOpacity style={styles.validateBtn} onPress={handleSubmit} disabled={loading}>
                <Text style={styles.validateText}>{loading ? "Création en cours..." : "Valider et créer"}</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      </ScrollView>
      <Toast message={toastMsg} visible={toastVisible} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#192E46" },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 20, paddingTop: 60, paddingBottom: 15 },
  headerTitle: { color: "#fff", fontSize: 20, fontWeight: "bold" },
  formContainer: { padding: 20 },
  stepTitle: { fontSize: 18, fontWeight: "600", color: "#fff", marginBottom: 20 },
  inputGroup: { marginBottom: 20 },
  label: { fontSize: 14, color: "#fff", fontWeight: "600", marginBottom: 5 },
  input: { borderBottomWidth: 1.5, borderColor: "#ccc", fontSize: 16, paddingVertical: 6, color: "#fff" },
  nextBtn: { backgroundColor: "#fff", paddingVertical: 12, borderRadius: 8, marginTop: 10 },
  nextBtnText: { color: "#192E46", textAlign: "center", fontWeight: "bold", fontSize: 16 },
  validateBtn: { backgroundColor: "#fff", paddingVertical: 14, borderRadius: 10, marginTop: 20 },
  validateText: { color: "#192E46", textAlign: "center", fontSize: 17, fontWeight: "bold" },
  toastContainer: { position: "absolute", alignSelf: "center", backgroundColor: "#333", paddingHorizontal: 20, paddingVertical: 10, borderRadius: 30 },
  toastText: { color: "#fff", fontSize: 14 },
});
