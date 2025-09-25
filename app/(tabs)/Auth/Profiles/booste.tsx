

// Booste.tsx
import React, { useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Alert,
  FlatList,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { FontAwesome } from "@expo/vector-icons";

/**
 * CHANGE ICI pour pointer vers TON API
 */
const API_URL = "http://localhost:3000/api/boost";

export default function Booste() {
  const params = useLocalSearchParams();
  const router = useRouter();

  const parsedProduct = useMemo(() => {
    if ((params as any).product) {
      const p = (params as any).product;
      try {
        if (typeof p === "string") return JSON.parse(p);
        return p;
      } catch {
        return null;
      }
    }
    const id = (params as any).id ?? (params as any).productId ?? null;
    if (!id && Object.keys(params).length === 0) return null;
    return {
      id,
      title: (params as any).title ?? (params as any).productTitle ?? "Produit",
      price: (params as any).price ?? (params as any).productPrice ?? "0",
      image: (params as any).imageUrl ?? (params as any).image ?? (params as any).productImage ?? null,
    };
  }, [params]);

  const product = parsedProduct ?? {
    id: "0",
    title: "Produit de démonstration",
    price: "0",
    image: "https://via.placeholder.com/800x450.png?text=ShopNet+Product",
  };

  const [budget, setBudget] = useState<number>(() => {
    const b = Number((params as any).budget ?? 1);
    return isNaN(b) ? 1 : Math.max(1, Math.min(100, b));
  });
  const [manualBudget, setManualBudget] = useState<string>("");
  const [views, setViews] = useState<number>(budget * 1000);
  const [days, setDays] = useState<number>(1);
  const [country, setCountry] = useState<string>("Mon pays");
  const [city, setCity] = useState<string>("Ma ville");
  const [loading, setLoading] = useState<boolean>(false);
  const [countryDropdownOpen, setCountryDropdownOpen] = useState(false);
  const [cityDropdownOpen, setCityDropdownOpen] = useState(false);

  const citiesByCountry: Record<string, string[]> = {
    "Mon pays": ["Ma ville"],
    Nigeria: ["Lagos", "Abuja", "Kano"],
    Cameroun: ["Yaoundé", "Douala", "Garoua"],
    Ouganda: ["Kampala", "Entebbe", "Gulu"],
    Ghana: ["Accra", "Kumasi", "Tamale"],
    Kenya: ["Nairobi", "Mombasa", "Kisumu"],
    "Côte d'Ivoire": ["Abidjan", "Yamoussoukro", "Bouaké"],
  };

  const budgetOptions = useMemo(() => Array.from({ length: 100 }, (_, i) => i + 1), []);

  useEffect(() => {
    setViews(budget * 1000);
  }, [budget]);

  useEffect(() => {
    if (manualBudget.trim() === "") return;
    const n = parseInt(manualBudget.replace(/\D/g, ""), 10);
    if (isNaN(n)) return;
    const clamped = Math.max(1, Math.min(100, n));
    setBudget(clamped);
  }, [manualBudget]);

  const handlePickBudget = (val: number) => {
    setManualBudget("");
    setBudget(val);
  };

  const handleSubmit = async () => {
    if (!product.id) {
      Alert.alert("Erreur", "Produit invalide.");
      return;
    }

    const payload = {
      productId: product.id,
      title: String(product.title),
      price: parseFloat(String(product.price)) || 0,
      imageUrl: product.image ?? null,
      budget,
      views,
      days,
      country,
      city,
    };

    try {
      setLoading(true);
      const res = await fetch(API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const json = await res.json().catch(() => null);

      if (!res.ok) {
        const msg = (json && json.message) || `Erreur serveur (${res.status})`;
        throw new Error(msg);
      }

      Alert.alert("Succès", "Votre publicité a été enregistrée ✅");
      router.push({ pathname: "/(tabs)/Auth/Profiles/confirmation", params: payload as any });
    } catch (err: any) {
      console.error("Boost submit error:", err);
      Alert.alert("Erreur", err.message || "Impossible d'enregistrer la publicité.");
    } finally {
      setLoading(false);
    }
  };

  const renderBudgetItem = ({ item }: { item: number }) => {
    const selected = item === budget;
    return (
      <TouchableOpacity
        style={[styles.budgetPill, selected && styles.budgetPillSelected]}
        onPress={() => handlePickBudget(item)}
      >
        <Text style={[styles.budgetPillText, selected && styles.budgetPillTextSelected]}>{item}</Text>
      </TouchableOpacity>
    );
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 40 }}>
      <Text style={styles.header}>Créer votre publicité</Text>

      <View style={styles.imageWrap}>
        <Image source={{ uri: product.image }} style={styles.image} />
        <View style={styles.viewsOverlay}>
          <FontAwesome name="eye" size={16} color="#fff" />
          <Text style={styles.viewsOverlayText}>{views.toLocaleString()} vues</Text>
        </View>
      </View>

      <View style={styles.row}>
        <Text numberOfLines={1} style={styles.productTitle}>{product.title}</Text>
        <Text style={styles.productPrice}>{String(product.price)} $</Text>
      </View>

      <Text style={styles.label}>Choisissez votre budget (max 100$)</Text>
      <View style={{ height: 56, marginBottom: 10 }}>
        <FlatList
          data={budgetOptions}
          keyExtractor={(i) => String(i)}
          renderItem={renderBudgetItem}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 12, alignItems: "center" }}
        />
      </View>

      <Text style={styles.subLabel}>Ou entrez un montant</Text>
      <TextInput
        style={styles.input}
        keyboardType="numeric"
        value={manualBudget !== "" ? manualBudget : String(budget)}
        onChangeText={(t) => setManualBudget(t.replace(/[^\d]/g, ""))}
        placeholder="Montant en $"
        placeholderTextColor="#999"
      />

      <View style={styles.rowSmall}>
        <Text style={styles.smallInfo}>Vues estimées :</Text>
        <Text style={styles.smallInfoBold}>{views.toLocaleString()}</Text>
      </View>

      <Text style={styles.label}>Durée de la campagne</Text>
      <View style={styles.rowSmall}>
        {[1, 3, 7].map((d) => (
          <TouchableOpacity
            key={d}
            style={[styles.optionChip, days === d && styles.optionChipSelected]}
            onPress={() => setDays(d)}
          >
            <Text style={[styles.optionChipText, days === d && styles.optionChipTextSelected]}>
              {d} {d === 1 ? "jour" : "jours"}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={styles.label}>Ciblez votre audience - Pays</Text>
      <TouchableOpacity
        style={styles.dropdown}
        onPress={() => {
          setCountryDropdownOpen(!countryDropdownOpen);
          setCityDropdownOpen(false);
        }}
      >
        <Text style={styles.dropdownText}>{country}</Text>
        <FontAwesome name="chevron-down" size={14} color="#fff" />
      </TouchableOpacity>
      {countryDropdownOpen && (
        <View style={styles.dropdownList}>
          {Object.keys(citiesByCountry).map((c) => (
            <TouchableOpacity
              key={c}
              style={styles.dropdownItem}
              onPress={() => {
                setCountry(c);
                setCity(citiesByCountry[c][0]);
                setCountryDropdownOpen(false);
              }}
            >
              <Text style={styles.dropdownItemText}>{c}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      <Text style={styles.label}>Ciblez votre audience - Ville</Text>
      <TouchableOpacity
        style={styles.dropdown}
        onPress={() => {
          setCityDropdownOpen(!cityDropdownOpen);
          setCountryDropdownOpen(false);
        }}
      >
        <Text style={styles.dropdownText}>{city}</Text>
        <FontAwesome name="chevron-down" size={14} color="#fff" />
      </TouchableOpacity>
      {cityDropdownOpen && (
        <View style={styles.dropdownList}>
          {(citiesByCountry[country] || ["Ma ville"]).map((v) => (
            <TouchableOpacity
              key={v}
              style={styles.dropdownItem}
              onPress={() => {
                setCity(v);
                setCityDropdownOpen(false);
              }}
            >
              <Text style={styles.dropdownItemText}>{v}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      <TouchableOpacity style={styles.cta} onPress={handleSubmit} disabled={loading}>
        {loading ? <ActivityIndicator color="#202A36" /> : <Text style={styles.ctaText}>Suivante</Text>}
      </TouchableOpacity>
    </ScrollView>
  );
}

/* ---------- Styles ---------- */
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#202A36" },
  header: { color: "#fff", fontSize: 20, fontWeight: "700", textAlign: "center", paddingVertical: 14 },
  imageWrap: { position: "relative", width: "100%" },
  image: { width: "100%", height: 260, resizeMode: "cover" },
  viewsOverlay: { position: "absolute", right: 12, bottom: 12, backgroundColor: "rgba(0,0,0,0.55)", paddingHorizontal: 10, paddingVertical: 6, borderRadius: 20, flexDirection: "row", alignItems: "center" },
  viewsOverlayText: { color: "#fff", marginLeft: 8, fontWeight: "600" },

  row: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 14, paddingVertical: 12 },
  productTitle: { color: "#fff", fontSize: 18, fontWeight: "600", flex: 1, marginRight: 8 },
  productPrice: { color: "#FA7921", fontSize: 18, fontWeight: "700" },

  label: { color: "#fff", marginLeft: 14, marginTop: 14, fontSize: 15, fontWeight: "600" },
  subLabel: { color: "#ddd", marginLeft: 14, marginTop: 8, fontSize: 13 },

  budgetPill: { minWidth: 44, height: 40, borderRadius: 10, backgroundColor: "#2B3642", marginRight: 8, alignItems: "center", justifyContent: "center", paddingHorizontal: 8 },
  budgetPillSelected: { backgroundColor: "#FA7921" },
  budgetPillText: { color: "#fff", fontWeight: "600" },
  budgetPillTextSelected: { color: "#202A36" },

  input: { backgroundColor: "#2B3642", color: "#fff", marginHorizontal: 14, marginTop: 8, paddingVertical: 10, paddingHorizontal: 12, borderRadius: 10, fontSize: 16 },

  rowSmall: { flexDirection: "row", justifyContent: "space-between", marginHorizontal: 14, marginTop: 8, alignItems: "center" },
  smallInfo: { color: "#ccc" },
  smallInfoBold: { color: "#fff", fontWeight: "700" },

  optionChip: { backgroundColor: "#2B3642", paddingVertical: 8, paddingHorizontal: 14, borderRadius: 8, marginRight: 10 },
  optionChipSelected: { backgroundColor: "#FA7921" },
  optionChipText: { color: "#fff", fontWeight: "600" },
  optionChipTextSelected: { color: "#202A36", fontWeight: "700" },

  dropdown: { backgroundColor: "#2B3642", marginHorizontal: 14, padding: 12, borderRadius: 10, flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 8 },
  dropdownText: { color: "#fff" },
  dropdownList: { backgroundColor: "#1f2930", marginHorizontal: 14, borderRadius: 8, marginTop: 6, overflow: "hidden" },
  dropdownItem: { paddingVertical: 12, paddingHorizontal: 14, borderBottomWidth: 1, borderBottomColor: "#2b3740" },
  dropdownItemText: { color: "#fff" },

  cta: { backgroundColor: "#FA7921", marginHorizontal: 14, marginTop: 20, paddingVertical: 14, borderRadius: 10, alignItems: "center", marginBottom: 30 },
  ctaText: { color: "#202A36", fontWeight: "800", fontSize: 16 },
});
