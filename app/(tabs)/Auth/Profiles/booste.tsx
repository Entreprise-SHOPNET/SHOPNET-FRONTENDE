
// Booste.tsx
// Booste.tsx
// Booste.tsx
import { getValidToken } from "../authService"; // le chemin exact selon ton projet
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
  FlatList,
  Dimensions,
  Modal,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { FontAwesome } from "@expo/vector-icons";
import * as Location from 'expo-location';

const { width, height } = Dimensions.get('window');

// Taux de change
const EXCHANGE_RATE = 2500; // 1 USD = 2500 CDF

// Villes par pays avec devises
const citiesByCountry: Record<string, {cities: Array<{name: string, address: string, latitude: number, longitude: number}>, currency: string}> = {
  "RDC": {
    currency: "CDF",
    cities: [
      { 
        name: "Kinshasa", 
        address: "Kinshasa, Province de Kinshasa, RDC",
        latitude: -4.4419, 
        longitude: 15.2663 
      },
      { 
        name: "Lubumbashi", 
        address: "Lubumbashi, Province du Haut-Katanga, RDC",
        latitude: -11.6642, 
        longitude: 27.4825 
      },
      { 
        name: "Mbuji-Mayi", 
        address: "Mbuji-Mayi, Province du Kasaï-Oriental, RDC",
        latitude: -6.1500, 
        longitude: 23.6000 
      },
      { 
        name: "Kananga", 
        address: "Kananga, Province du Kasaï-Central, RDC",
        latitude: -5.8961, 
        longitude: 22.4167 
      },
      { 
        name: "Kisangani", 
        address: "Kisangani, Province de la Tshopo, RDC",
        latitude: 0.5153, 
        longitude: 25.1911 
      },
      { 
        name: "Bukavu", 
        address: "Bukavu, Province du Sud-Kivu, RDC",
        latitude: -2.5000, 
        longitude: 28.8667 
      },
      { 
        name: "Goma", 
        address: "Goma, Province du Nord-Kivu, RDC",
        latitude: -1.6792, 
        longitude: 29.2217 
      },
      { 
        name: "Kolwezi", 
        address: "Kolwezi, Province du Lualaba, RDC",
        latitude: -10.7167, 
        longitude: 25.4667 
      },
      { 
        name: "Likasi", 
        address: "Likasi, Province du Haut-Katanga, RDC",
        latitude: -10.9833, 
        longitude: 26.7333 
      },
      { 
        name: "Matadi", 
        address: "Matadi, Province du Kongo-Central, RDC",
        latitude: -5.8167, 
        longitude: 13.4833 
      }
    ]
  },
  "Cameroun": {
    currency: "USD",
    cities: [
      { 
        name: "Yaoundé", 
        address: "Yaoundé, Région du Centre, Cameroun",
        latitude: 3.8667, 
        longitude: 11.5167 
      },
      { 
        name: "Douala", 
        address: "Douala, Région du Littoral, Cameroun",
        latitude: 4.0500, 
        longitude: 9.7000 
      }
    ]
  },
  "Nigeria": {
    currency: "USD",
    cities: [
      { 
        name: "Lagos", 
        address: "Lagos, État de Lagos, Nigeria",
        latitude: 6.5244, 
        longitude: 3.3792 
      },
      { 
        name: "Abuja", 
        address: "Abuja, Territoire de la capitale fédérale, Nigeria",
        latitude: 9.0579, 
        longitude: 7.4951 
      }
    ]
  },
  "Côte d'Ivoire": {
    currency: "USD",
    cities: [
      { 
        name: "Abidjan", 
        address: "Abidjan, District Autonome d'Abidjan, Côte d'Ivoire",
        latitude: 5.3600, 
        longitude: -4.0083 
      }
    ]
  },
  "Sénégal": {
    currency: "USD",
    cities: [
      { 
        name: "Dakar", 
        address: "Dakar, Région de Dakar, Sénégal",
        latitude: 14.7167, 
        longitude: -17.4677 
      }
    ]
  }
};

// Composant de message style WhatsApp
const WhatsAppMessage = ({ type, message, onClose }: { type: 'success' | 'error' | 'info', message: string, onClose: () => void }) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose();
    }, 4000);

    return () => clearTimeout(timer);
  }, []);

  const getBackgroundColor = () => {
    switch (type) {
      case 'success': return '#25D366';
      case 'error': return '#FF3B30';
      case 'info': return '#128C7E';
      default: return '#128C7E';
    }
  };

  const getIcon = () => {
    switch (type) {
      case 'success': return 'check-circle';
      case 'error': return 'exclamation-circle';
      case 'info': return 'info-circle';
      default: return 'info-circle';
    }
  };

  return (
    <View style={[styles.messageContainer, { backgroundColor: getBackgroundColor() }]}>
      <FontAwesome name={getIcon()} size={16} color="#fff" />
      <Text style={styles.messageText}>{message}</Text>
      <TouchableOpacity onPress={onClose}>
        <FontAwesome name="times" size={16} color="#fff" />
      </TouchableOpacity>
    </View>
  );
};

// Composant de carte simplifiée
const SimpleMap = ({ cities, selectedCity, onCitySelect, currentLocation }: any) => {
  return (
    <View style={styles.simpleMapContainer}>
      <Text style={styles.mapTitle}>📍 Choisissez votre ville de ciblage</Text>
      
      <ScrollView style={styles.citiesGrid}>
        <View style={styles.gridContainer}>
          {cities.map((city: any, index: number) => (
            <TouchableOpacity
              key={city.name}
              style={[
                styles.cityCard,
                selectedCity === city.name && styles.cityCardSelected
              ]}
              onPress={() => onCitySelect(city)}
            >
              <View style={[
                styles.cityDot,
                selectedCity === city.name && styles.cityDotSelected
              ]}>
                <FontAwesome 
                  name="map-marker" 
                  size={20} 
                  color={selectedCity === city.name ? "#fff" : "#FA7921"} 
                />
              </View>
              <Text style={[
                styles.cityName,
                selectedCity === city.name && styles.cityNameSelected
              ]}>
                {city.name}
              </Text>
              <Text style={styles.cityAddress}>{city.address}</Text>
              {currentLocation?.city === city.name && (
                <View style={styles.currentLocationBadge}>
                  <FontAwesome name="location-arrow" size={10} color="#fff" />
                </View>
              )}
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>

      <View style={styles.legend}>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, styles.legendDotCurrent]} />
          <Text style={styles.legendText}>Votre position</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, styles.legendDotSelected]} />
          <Text style={styles.legendText}>Sélectionnée</Text>
        </View>
      </View>
    </View>
  );
};

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

  const [currency, setCurrency] = useState<"USD" | "CDF">("CDF");
  const [budget, setBudget] = useState<number>(2500);
  const [manualBudget, setManualBudget] = useState<string>("");
  const [views, setViews] = useState<number>(1000);
  const [days, setDays] = useState<number>(1);
  const [country, setCountry] = useState<string>("RDC");
  const [city, setCity] = useState<string>("Kinshasa");
  const [loading, setLoading] = useState<boolean>(false);
  const [countryDropdownOpen, setCountryDropdownOpen] = useState(false);
  const [cityDropdownOpen, setCityDropdownOpen] = useState(false);
  const [mapModalVisible, setMapModalVisible] = useState(false);
  const [userLocation, setUserLocation] = useState<{latitude: number, longitude: number, city: string, address: string} | null>(null);
  const [selectedLocation, setSelectedLocation] = useState<{latitude: number, longitude: number, address: string} | null>(null);
  const [locationLoading, setLocationLoading] = useState(false);
  const [message, setMessage] = useState<{type: 'success' | 'error' | 'info', text: string} | null>(null);

  // Options de budget selon la devise
  const budgetOptions = useMemo(() => {
    if (currency === "CDF") {
      return [2500, 5000, 10000, 25000, 50000, 100000];
    } else {
      return [1, 5, 10, 25, 50, 100];
    }
  }, [currency]);

  // Convertir le montant entre devises
  const convertAmount = (amount: number, from: "USD" | "CDF", to: "USD" | "CDF"): number => {
    if (from === to) return amount;
    if (from === "USD" && to === "CDF") return amount * EXCHANGE_RATE;
    if (from === "CDF" && to === "USD") return amount / EXCHANGE_RATE;
    return amount;
  };

  // Formater le montant pour l'affichage
  const formatAmount = (amount: number, curr: "USD" | "CDF"): string => {
    if (curr === "CDF") {
      return `${amount.toLocaleString('fr-FR')} CDF`;
    } else {
      return `$${amount.toFixed(2)} USD`;
    }
  };

  // Calculer les vues estimées
  const calculateViews = (amount: number, curr: "USD" | "CDF"): number => {
    const amountInUSD = curr === "CDF" ? convertAmount(amount, "CDF", "USD") : amount;
    return Math.round(amountInUSD * 1000);
  };

  // Afficher un message style WhatsApp
  const showMessage = (type: 'success' | 'error' | 'info', text: string) => {
    setMessage({ type, text });
  };

  // Obtenir la localisation actuelle de l'utilisateur
  const getUserLocation = async () => {
    try {
      setLocationLoading(true);
      
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        showMessage('info', '📍 Activez la localisation pour cibler votre publicité');
        return;
      }

      let location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });
      
      const { latitude, longitude } = location.coords;
      
      let addressResponse = await Location.reverseGeocodeAsync({
        latitude,
        longitude
      });

      if (addressResponse.length > 0) {
        const address = addressResponse[0];
        const cityName = address.city || address.region || "Ville inconnue";
        const countryName = address.country || "Pays inconnu";
        const fullAddress = `${address.street || ''} ${address.name || ''}, ${cityName}, ${countryName}`.trim();
        
        setUserLocation({ 
          latitude, 
          longitude, 
          city: cityName,
          address: fullAddress
        });
        
        setSelectedLocation({ 
          latitude, 
          longitude,
          address: fullAddress
        });
        
        setCity(cityName);
        setCountry(countryName === "Congo" ? "RDC" : countryName);
        
        const countryData = citiesByCountry[countryName === "Congo" ? "RDC" : countryName];
        if (countryData) {
          setCurrency(countryData.currency as "USD" | "CDF");
        }
        
        showMessage('success', `📍 Position détectée: ${cityName}, ${countryName}`);
      }
      
    } catch (error) {
      console.error('Erreur de localisation:', error);
      showMessage('error', '❌ Impossible de détecter votre position');
    } finally {
      setLocationLoading(false);
    }
  };

  // Sélectionner une ville depuis la carte
  const selectCityFromMap = (cityObj: {name: string, address: string, latitude: number, longitude: number}) => {
    setCity(cityObj.name);
    setSelectedLocation({
      latitude: cityObj.latitude,
      longitude: cityObj.longitude,
      address: cityObj.address
    });
    setMapModalVisible(false);
    showMessage('success', `📍 Ville sélectionnée: ${cityObj.name}`);
  };

  // Mettre à jour les vues estimées
  useEffect(() => {
    setViews(calculateViews(budget, currency));
  }, [budget, currency]);

  // Gérer le changement de devise
  const handleCurrencyChange = (newCurrency: "USD" | "CDF") => {
    if (newCurrency !== currency) {
      const convertedBudget = convertAmount(budget, currency, newCurrency);
      setBudget(Math.round(convertedBudget));
      setCurrency(newCurrency);
      showMessage('info', `💱 Devise changée: ${newCurrency}`);
    }
  };

  // Gérer le changement de pays
  const handleCountryChange = (newCountry: string) => {
    setCountry(newCountry);
    const countryData = citiesByCountry[newCountry];
    if (countryData) {
      setCurrency(countryData.currency as "USD" | "CDF");
      setCity(countryData.cities[0]?.name || "Kinshasa");
      setSelectedLocation({
        latitude: countryData.cities[0]?.latitude || -4.4419,
        longitude: countryData.cities[0]?.longitude || 15.2663,
        address: countryData.cities[0]?.address || "Kinshasa, RDC"
      });
    }
    setCountryDropdownOpen(false);
  };

  // Gérer le changement de budget manuel
  const handleManualBudgetChange = (text: string) => {
    const cleaned = text.replace(/[^\d.,]/g, '');
    setManualBudget(cleaned);
    
    if (cleaned) {
      const numericValue = parseFloat(cleaned.replace(',', '.'));
      if (!isNaN(numericValue)) {
        const minBudget = currency === "CDF" ? 1000 : 1;
        const maxBudget = currency === "CDF" ? 500000 : 500;
        const clamped = Math.max(minBudget, Math.min(maxBudget, numericValue));
        setBudget(currency === "CDF" ? Math.round(clamped) : clamped);
      }
    }
  };

  // Gérer la sélection d'un budget prédéfini
  const handlePickBudget = (val: number) => {
    setManualBudget("");
    setBudget(val);
    showMessage('info', `💰 Budget défini: ${formatAmount(val, currency)}`);
  };

  const handleSubmit = async () => {
  if (!product.id) {
    showMessage('error', '❌ Produit invalide');
    return;
  }

  if (!selectedLocation) {
    showMessage('error', '❌ Veuillez sélectionner une localisation');
    return;
  }

  const minBudget = currency === "CDF" ? 1000 : 1;
  if (budget < minBudget) {
    showMessage('error', `❌ Le budget doit être d'au moins ${formatAmount(minBudget, currency)}`);
    return;
  }

  try {
    setLoading(true);
    showMessage('info', '📡 Enregistrement du boost en attente...');

      const boostData = {
        productId: product.id,
        amount: budget,
        duration_hours: days * 24,
        views: views,
        country: country,
        city: city,
        address: selectedLocation?.address,
      };


// Récupération du token directement depuis AsyncStorage
const token = await getValidToken(); // ✅ token récupéré comme dans les autres pages
if (!token) {
  showMessage('error', '❌ Vous devez être connecté pour effectuer cette action');
  setLoading(false);
  return;
}

// POST avec token
  const response = await fetch(
    'https://shopnet-backend.onrender.com/api/manual-payment/create-boost', // ✅ Production Render
    // 'http://100.64.134.89:5000/api/manual-payment/create-boost', // Serveur local (commenté)
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify(boostData),
    }
  );


    const result = await response.json();

    if (result.success) {
      showMessage('success', '✅ Boost enregistré en attente !');
      
      // Redirection vers l'écran de paiement si nécessaire
router.push({ 
  pathname: "/(tabs)/Auth/Profiles/ConfirmationPaiement", 
  params: {
    productId: product.id,
    title: product.title,
    price: product.price,
    imageUrl: product.image,
    budget: budget,
    currency: currency,
    views: views,
    days: days,
    country: country,
    city: city,
    address: selectedLocation?.address
  } 
});

    } else {
      showMessage('error', '❌ Impossible d’enregistrer le boost');
    }

  } catch (err: any) {
    console.error("Erreur:", err);
    showMessage('error', '❌ Erreur lors de l’enregistrement du boost');
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
        <Text style={[styles.budgetPillText, selected && styles.budgetPillTextSelected]}>
          {currency === "CDF" ? 
            `${(item/1000) >= 1 ? `${(item/1000)}k` : item} CDF` : 
            `$${item} USD`
          }
        </Text>
      </TouchableOpacity>
    );
  };

  const currentCities = citiesByCountry[country]?.cities || [];

  return (
    <View style={styles.container}>
      {/* Message style WhatsApp */}
      {message && (
        <WhatsAppMessage 
          type={message.type} 
          message={message.text} 
          onClose={() => setMessage(null)} 
        />
      )}

      <ScrollView contentContainerStyle={{ paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
        <Text style={styles.header}>🎯 Créer votre publicité</Text>

        {/* Produit */}
        <View style={styles.imageWrap}>
          <Image 
            source={{ uri: product.image }} 
            style={styles.image}
            defaultSource={{ uri: 'https://via.placeholder.com/800x450.png?text=ShopNet+Product' }}
          />
          <View style={styles.viewsOverlay}>
            <FontAwesome name="eye" size={16} color="#fff" />
            <Text style={styles.viewsOverlayText}>{views.toLocaleString()} vues</Text>
          </View>
        </View>

        <View style={styles.row}>
          <Text numberOfLines={1} style={styles.productTitle}>{product.title}</Text>
          <Text style={styles.productPrice}>{String(product.price)} $</Text>
        </View>

        {/* Sélection de devise */}
        <Text style={styles.label}>💱 Choisissez votre devise</Text>
        <View style={styles.currencySelector}>
          <TouchableOpacity
            style={[styles.currencyOption, currency === "CDF" && styles.currencyOptionSelected]}
            onPress={() => handleCurrencyChange("CDF")}
          >
            <Text style={[styles.currencyOptionText, currency === "CDF" && styles.currencyOptionTextSelected]}>
              CDF (Franc Congolais)
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.currencyOption, currency === "USD" && styles.currencyOptionSelected]}
            onPress={() => handleCurrencyChange("USD")}
          >
            <Text style={[styles.currencyOptionText, currency === "USD" && styles.currencyOptionTextSelected]}>
              USD (Dollar US)
            </Text>
          </TouchableOpacity>
        </View>

        {/* Taux de change */}
        <View style={styles.exchangeRate}>
          <Text style={styles.exchangeRateText}>
            💱 Taux: 1 USD = {EXCHANGE_RATE.toLocaleString()} CDF
          </Text>
        </View>

        {/* Budget */}
        <Text style={styles.label}>
          💰 Choisissez votre budget {currency === "CDF" ? "(1,000 - 500,000 CDF)" : "(1 - 500 USD)"}
        </Text>
        
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

        <Text style={styles.subLabel}>Ou entrez un montant personnalisé</Text>
        <TextInput
          style={styles.input}
          keyboardType="decimal-pad"
          value={manualBudget !== "" ? manualBudget : budget.toString()}
          onChangeText={handleManualBudgetChange}
          placeholder={currency === "CDF" ? "Montant en CDF" : "Montant en USD"}
          placeholderTextColor="#999"
        />

        <View style={styles.rowSmall}>
          <Text style={styles.smallInfo}>👁️ Vues estimées :</Text>
          <Text style={styles.smallInfoBold}>{views.toLocaleString()}</Text>
        </View>

        {/* Conversion de devise */}
        <View style={styles.conversionBox}>
          <Text style={styles.conversionText}>
            💱 Equivalent: {formatAmount(convertAmount(budget, currency, currency === "CDF" ? "USD" : "CDF"), currency === "CDF" ? "USD" : "CDF")}
          </Text>
        </View>

        {/* Durée */}
        <Text style={styles.label}>📅 Durée de la campagne</Text>
        <View style={styles.rowSmall}>
          {[1, 3, 7].map((d) => (
            <TouchableOpacity
              key={d}
              style={[styles.optionChip, days === d && styles.optionChipSelected]}
              onPress={() => {
                setDays(d);
                showMessage('info', `⏱️ Durée: ${d} jour${d > 1 ? 's' : ''}`);
              }}
            >
              <Text style={[styles.optionChipText, days === d && styles.optionChipTextSelected]}>
                {d} {d === 1 ? "jour" : "jours"}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Localisation */}
        <Text style={styles.label}>📍 Ciblez votre audience</Text>
        
        {/* Bouton de localisation automatique */}
        <TouchableOpacity 
          style={styles.locationButton}
          onPress={getUserLocation}
          disabled={locationLoading}
        >
          {locationLoading ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <FontAwesome name="location-arrow" size={16} color="#fff" />
          )}
          <Text style={styles.locationButtonText}>
            {locationLoading ? "Détection en cours..." : "Utiliser ma position actuelle"}
          </Text>
        </TouchableOpacity>

        {/* Bouton pour ouvrir la carte */}
        <TouchableOpacity 
          style={styles.mapButton}
          onPress={() => setMapModalVisible(true)}
        >
          <FontAwesome name="map" size={16} color="#202A36" />
          <Text style={styles.mapButtonText}>Choisir sur la carte</Text>
        </TouchableOpacity>

        {/* Pays */}
        <Text style={styles.label}>🌍 Pays de ciblage</Text>
        <TouchableOpacity
          style={styles.dropdown}
          onPress={() => {
            setCountryDropdownOpen(!countryDropdownOpen);
            setCityDropdownOpen(false);
          }}
        >
          <Text style={styles.dropdownText}>{country} ({citiesByCountry[country]?.currency})</Text>
          <FontAwesome name="chevron-down" size={14} color="#fff" />
        </TouchableOpacity>
        {countryDropdownOpen && (
          <View style={styles.dropdownList}>
            {Object.keys(citiesByCountry).map((c) => (
              <TouchableOpacity
                key={c}
                style={styles.dropdownItem}
                onPress={() => handleCountryChange(c)}
              >
                <View>
                  <Text style={styles.dropdownItemText}>
                    {c} ({citiesByCountry[c].currency})
                  </Text>
                  <Text style={styles.dropdownItemAddress}>
                    {citiesByCountry[c].cities.length} villes
                  </Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Ville */}
        <Text style={styles.label}>🏙️ Ville de ciblage</Text>
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
          <View style={[styles.dropdownList, { maxHeight: 200 }]}>
            <ScrollView showsVerticalScrollIndicator={false}>
              {currentCities.map((cityObj) => (
                <TouchableOpacity
                  key={cityObj.name}
                  style={styles.dropdownItem}
                  onPress={() => {
                    setCity(cityObj.name);
                    setSelectedLocation({
                      latitude: cityObj.latitude,
                      longitude: cityObj.longitude,
                      address: cityObj.address
                    });
                    setCityDropdownOpen(false);
                    showMessage('info', `🏙️ Ville changée: ${cityObj.name}`);
                  }}
                >
                  <View>
                    <Text style={styles.dropdownItemText}>{cityObj.name}</Text>
                    <Text style={styles.dropdownItemAddress}>{cityObj.address}</Text>
                  </View>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}

        {/* Aperçu de la localisation */}
        <View style={styles.mapPreview}>
          <Text style={styles.mapPreviewText}>
            📍 {selectedLocation?.address || `${city}, ${country}`}
          </Text>
          {userLocation && (
            <Text style={styles.gpsInfo}>
              ✅ Localisation GPS active
            </Text>
          )}
        </View>

        {/* Résumé du paiement */}
        <View style={styles.paymentSummary}>
          <Text style={styles.paymentSummaryTitle}>📋 Récapitulatif</Text>
          <View style={styles.paymentRow}>
            <Text style={styles.paymentLabel}>Budget publicitaire:</Text>
            <Text style={styles.paymentValue}>{formatAmount(budget, currency)}</Text>
          </View>
          <View style={styles.paymentRow}>
            <Text style={styles.paymentLabel}>Vues estimées:</Text>
            <Text style={styles.paymentValue}>{views.toLocaleString()}</Text>
          </View>
          <View style={styles.paymentRow}>
            <Text style={styles.paymentLabel}>Durée:</Text>
            <Text style={styles.paymentValue}>{days} jour{days > 1 ? 's' : ''}</Text>
          </View>
          <View style={styles.paymentRow}>
            <Text style={styles.paymentLabel}>Zone de ciblage:</Text>
            <Text style={styles.paymentValue}>{city}, {country}</Text>
          </View>
        </View>

        {/* Bouton de soumission */}
        <TouchableOpacity 
          style={[styles.cta, loading && styles.ctaDisabled]} 
          onPress={handleSubmit} 
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#202A36" />
          ) : (
            <Text style={styles.ctaText}>
              🚀 Payer {formatAmount(budget, currency)}
            </Text>
          )}
        </TouchableOpacity>
      </ScrollView>

      {/* Modal de la carte simplifiée */}
      <Modal
        visible={mapModalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setMapModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>🗺️ Sélectionnez une ville</Text>
            <TouchableOpacity 
              style={styles.closeButton}
              onPress={() => setMapModalVisible(false)}
            >
              <FontAwesome name="close" size={20} color="#fff" />
            </TouchableOpacity>
          </View>
          
          <SimpleMap 
            cities={currentCities}
            selectedCity={city}
            onCitySelect={selectCityFromMap}
            currentLocation={userLocation}
          />
        </View>
      </Modal>
    </View>
  );
}

/* ---------- Styles ---------- */
const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: "#202A36" 
  },
  messageContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    marginHorizontal: 12,
    marginTop: 8,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  messageText: {
    color: '#fff',
    marginLeft: 8,
    marginRight: 12,
    flex: 1,
    fontWeight: '600',
    fontSize: 14,
  },
  header: { 
    color: "#fff", 
    fontSize: 20, 
    fontWeight: "700", 
    textAlign: "center", 
    paddingVertical: 14 
  },
  imageWrap: { 
    position: "relative", 
    width: "100%" 
  },
  image: { 
    width: "100%", 
    height: 260, 
    resizeMode: "cover" 
  },
  viewsOverlay: { 
    position: "absolute", 
    right: 12, 
    bottom: 12, 
    backgroundColor: "rgba(0,0,0,0.55)", 
    paddingHorizontal: 10, 
    paddingVertical: 6, 
    borderRadius: 20, 
    flexDirection: "row", 
    alignItems: "center" 
  },
  viewsOverlayText: { 
    color: "#fff", 
    marginLeft: 8, 
    fontWeight: "600" 
  },
  row: { 
    flexDirection: "row", 
    justifyContent: "space-between", 
    alignItems: "center", 
    paddingHorizontal: 14, 
    paddingVertical: 12 
  },
  productTitle: { 
    color: "#fff", 
    fontSize: 18, 
    fontWeight: "600", 
    flex: 1, 
    marginRight: 8 
  },
  productPrice: { 
    color: "#FA7921", 
    fontSize: 18, 
    fontWeight: "700" 
  },
  currencySelector: {
    flexDirection: "row",
    marginHorizontal: 14,
    marginTop: 8,
    gap: 8,
  },
  currencyOption: {
    flex: 1,
    backgroundColor: "#2B3642",
    padding: 12,
    borderRadius: 10,
    alignItems: "center",
  },
  currencyOptionSelected: {
    backgroundColor: "#FA7921",
  },
  currencyOptionText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 14,
  },
  currencyOptionTextSelected: {
    color: "#202A36",
    fontWeight: "700",
  },
  exchangeRate: {
    backgroundColor: "#2B3642",
    marginHorizontal: 14,
    marginTop: 8,
    padding: 10,
    borderRadius: 8,
    alignItems: "center",
  },
  exchangeRateText: {
    color: "#FA7921",
    fontWeight: "600",
    fontSize: 14,
  },
  label: { 
    color: "#fff", 
    marginLeft: 14, 
    marginTop: 14, 
    fontSize: 15, 
    fontWeight: "600" 
  },
  subLabel: { 
    color: "#ddd", 
    marginLeft: 14, 
    marginTop: 8, 
    fontSize: 13 
  },
  budgetPill: { 
    minWidth: 80, 
    height: 40, 
    borderRadius: 10, 
    backgroundColor: "#2B3642", 
    marginRight: 8, 
    alignItems: "center", 
    justifyContent: "center", 
    paddingHorizontal: 8 
  },
  budgetPillSelected: { 
    backgroundColor: "#FA7921" 
  },
  budgetPillText: { 
    color: "#fff", 
    fontWeight: "600",
    fontSize: 12
  },
  budgetPillTextSelected: { 
    color: "#202A36",
    fontWeight: "700"
  },
  input: { 
    backgroundColor: "#2B3642", 
    color: "#fff", 
    marginHorizontal: 14, 
    marginTop: 8, 
    paddingVertical: 10, 
    paddingHorizontal: 12, 
    borderRadius: 10, 
    fontSize: 16 
  },
  rowSmall: { 
    flexDirection: "row", 
    justifyContent: "space-between", 
    marginHorizontal: 14, 
    marginTop: 8, 
    alignItems: "center" 
  },
  smallInfo: { 
    color: "#ccc" 
  },
  smallInfoBold: { 
    color: "#fff", 
    fontWeight: "700" 
  },
  conversionBox: {
    backgroundColor: "#1a472a",
    marginHorizontal: 14,
    marginTop: 8,
    padding: 10,
    borderRadius: 8,
    alignItems: "center"
  },
  conversionText: {
    color: "#4CAF50",
    fontWeight: "600",
    fontSize: 14
  },
  optionChip: { 
    backgroundColor: "#2B3642", 
    paddingVertical: 8, 
    paddingHorizontal: 14, 
    borderRadius: 8, 
    marginRight: 10 
  },
  optionChipSelected: { 
    backgroundColor: "#FA7921" 
  },
  optionChipText: { 
    color: "#fff", 
    fontWeight: "600" 
  },
  optionChipTextSelected: { 
    color: "#202A36", 
    fontWeight: "700" 
  },
  dropdown: { 
    backgroundColor: "#2B3642", 
    marginHorizontal: 14, 
    padding: 12, 
    borderRadius: 10, 
    flexDirection: "row", 
    justifyContent: "space-between", 
    alignItems: "center", 
    marginTop: 8 
  },
  dropdownText: { 
    color: "#fff" 
  },
  dropdownList: { 
    backgroundColor: "#1f2930", 
    marginHorizontal: 14, 
    borderRadius: 8, 
    marginTop: 6, 
    overflow: "hidden"
  },
  dropdownItem: { 
    paddingVertical: 12, 
    paddingHorizontal: 14, 
    borderBottomWidth: 1, 
    borderBottomColor: "#2b3740" 
  },
  dropdownItemText: { 
    color: "#fff",
    fontWeight: "600"
  },
  dropdownItemAddress: {
    color: "#ccc",
    fontSize: 11,
    marginTop: 2
  },
  locationButton: {
    backgroundColor: "#2B3642",
    marginHorizontal: 14,
    marginTop: 8,
    padding: 12,
    borderRadius: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center"
  },
  locationButtonText: {
    color: "#fff",
    marginLeft: 8,
    fontWeight: "600"
  },
  mapButton: {
    backgroundColor: "#FA7921",
    marginHorizontal: 14,
    marginTop: 8,
    padding: 12,
    borderRadius: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center"
  },
  mapButtonText: {
    color: "#202A36",
    marginLeft: 8,
    fontWeight: "700"
  },
  mapPreview: {
    backgroundColor: "#2B3642",
    marginHorizontal: 14,
    marginTop: 12,
    padding: 12,
    borderRadius: 10,
    alignItems: "center"
  },
  mapPreviewText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 14,
    textAlign: "center"
  },
  gpsInfo: {
    color: "#4CAF50",
    fontSize: 11,
    marginTop: 4,
    fontWeight: "600"
  },
  paymentSummary: {
    backgroundColor: "#2B3642",
    marginHorizontal: 14,
    marginTop: 20,
    padding: 16,
    borderRadius: 10,
    borderLeftWidth: 4,
    borderLeftColor: "#FA7921"
  },
  paymentSummaryTitle: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 12,
    textAlign: "center"
  },
  paymentRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8
  },
  paymentLabel: {
    color: "#ccc",
    fontSize: 14
  },
  paymentValue: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600"
  },
  cta: { 
    backgroundColor: "#FA7921", 
    marginHorizontal: 14, 
    marginTop: 20, 
    paddingVertical: 14, 
    borderRadius: 10, 
    alignItems: "center", 
    marginBottom: 30 
  },
  ctaDisabled: {
    backgroundColor: "#3A4551",
    opacity: 0.6
  },
  ctaText: { 
    color: "#202A36", 
    fontWeight: "800", 
    fontSize: 16 
  },
  modalContainer: {
    flex: 1,
    backgroundColor: "#202A36"
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#2B3642"
  },
  modalTitle: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "700"
  },
  closeButton: {
    padding: 4
  },
  simpleMapContainer: {
    flex: 1,
    padding: 16
  },
  mapTitle: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
    textAlign: "center",
    marginBottom: 16
  },
  citiesGrid: {
    flex: 1
  },
  gridContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between"
  },
  cityCard: {
    width: '48%',
    backgroundColor: "#2B3642",
    padding: 12,
    borderRadius: 10,
    alignItems: "center",
    marginBottom: 12,
    position: "relative"
  },
  cityCardSelected: {
    backgroundColor: "#FA7921"
  },
  cityDot: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#2B3642",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8
  },
  cityDotSelected: {
    backgroundColor: "#FF9800"
  },
  cityName: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 12,
    textAlign: "center"
  },
  cityNameSelected: {
    color: "#202A36",
    fontWeight: "700"
  },
  cityAddress: {
    color: "#ccc",
    fontSize: 10,
    textAlign: "center",
    marginTop: 4
  },
  currentLocationBadge: {
    position: "absolute",
    top: 8,
    right: 8,
    backgroundColor: "#4CAF50",
    width: 16,
    height: 16,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center"
  },
  legend: {
    flexDirection: "row",
    justifyContent: "space-around",
    padding: 16,
    backgroundColor: "#2B3642",
    borderRadius: 10,
    marginTop: 16
  },
  legendItem: {
    flexDirection: "row",
    alignItems: "center"
  },
  legendDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 8
  },
  legendDotCurrent: {
    backgroundColor: "#4CAF50"
  },
  legendDotSelected: {
    backgroundColor: "#FA7921"
  },
  legendText: {
    color: "#fff",
    fontSize: 12
  }
});