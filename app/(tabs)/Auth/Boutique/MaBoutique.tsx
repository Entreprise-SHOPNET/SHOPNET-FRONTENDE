


import React, { useEffect, useState, useRef } from "react";
import { 
  View, 
  Text, 
  StyleSheet, 
  ActivityIndicator, 
  TouchableOpacity, 
  ScrollView, 
  Alert,
  Animated,
  Dimensions,
  Image,
  SafeAreaView,
  StatusBar
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter } from "expo-router";
import { FontAwesome5, Ionicons, Feather } from "@expo/vector-icons";

const { width } = Dimensions.get('window');
const SHOPNET_BLUE = '#00182A';
const SHOPNET_GREEN = '#4DB14E';
const API_URL = 'https://shopnet-backend.onrender.com/api/all-products';

export default function MaBoutique() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [boutique, setBoutique] = useState<any>(null);
  const [products, setProducts] = useState<any[]>([]);
  const scrollY = useRef(new Animated.Value(0)).current;
  
  // Header fade animation
  const headerOpacity = scrollY.interpolate({
    inputRange: [0, 80],
    outputRange: [1, 0],
    extrapolate: "clamp"
  });

  const fixedHeaderOpacity = scrollY.interpolate({
    inputRange: [0, 80],
    outputRange: [0, 1],
    extrapolate: "clamp"
  });

  useEffect(() => {
    const fetchBoutiqueAndProducts = async () => {
      try {
        const token = await AsyncStorage.getItem("userToken");
        if (!token) {
          Alert.alert("Erreur", "Veuillez vous reconnecter.");
          router.replace("/splash");
          return;
        }

        // Fetch boutique
        const resBoutique = await fetch("https://shopnet-backend.onrender.com/api/boutiques/check", {
          headers: { Authorization: `Bearer ${token}` }
        });
        const dataBoutique = await resBoutique.json();
        if (!resBoutique.ok) throw new Error(dataBoutique.message || "Erreur boutique");
        setBoutique(dataBoutique.boutique);

        // Fetch products
        const resProducts = await fetch(API_URL, {
          headers: { Authorization: `Bearer ${token}` }
        });
        const dataProducts = await resProducts.json();
        if (resProducts.ok) {
          const userProducts = dataProducts.products.filter((p: any) => p.userId === dataBoutique.boutique.userId);
          setProducts(userProducts.slice(0, 10)); // max 10 produits
        }

      } catch (err: any) {
        console.log(err);
        Alert.alert("Erreur", err.message || "Problème serveur");
      } finally {
        setLoading(false);
      }
    };

    fetchBoutiqueAndProducts();
  }, []);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={SHOPNET_GREEN} />
        <Text style={styles.loadingText}>Chargement de votre boutique...</Text>
      </View>
    );
  }

  if (!boutique) {
    return (
      <View style={styles.emptyContainer}>
        <FontAwesome5 name="store-slash" size={80} color="rgba(255,255,255,0.3)" />
        <Text style={styles.emptyTitle}>Aucune boutique trouvée</Text>
        <TouchableOpacity
          style={styles.createButton}
          onPress={() => router.push("/(tabs)/Auth/Boutique/CreerBoutique")}
        >
          <FontAwesome5 name="plus" size={20} color="#fff" />
          <Text style={styles.createButtonText}>Créer ma boutique</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={SHOPNET_BLUE} />

      {/* Fixed header on top when scroll */}
      <Animated.View style={[styles.fixedHeader, { opacity: fixedHeaderOpacity }]}>
        <FontAwesome5 name="store" size={28} color={SHOPNET_GREEN} />
        <Text style={styles.fixedHeaderText}>{boutique.nom} • Standard activé</Text>
        <TouchableOpacity 
          style={styles.premiumButton} 
          onPress={() => router.push("/passer-premium")}
        >
          <Text style={styles.premiumButtonText}>Passer Pro</Text>
        </TouchableOpacity>
      </Animated.View>

      <Animated.ScrollView
        contentContainerStyle={{ paddingBottom: 100 }}
        scrollEventThrottle={16}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
          { useNativeDriver: false }
        )}
      >
        {/* Header boutique */}
        <Animated.View style={[styles.header, { opacity: headerOpacity }]}>
          <FontAwesome5 name="store" size={80} color={SHOPNET_GREEN} />
          <Text style={styles.storeName}>{boutique.nom}</Text>
          <Text style={styles.storeType}>Standard activé</Text>
          <TouchableOpacity 
            style={styles.premiumButton} 
            onPress={() => router.push("/passer-premium")}
          >
            <Text style={styles.premiumButtonText}>Passer Pro</Text>
          </TouchableOpacity>
        </Animated.View>

        {/* Products grid */}
        <View style={styles.productsGrid}>
          {products.map((p, idx) => (
            <TouchableOpacity 
              key={p.id} 
              style={styles.productCard}
              onPress={() => router.push(`/produit/${p.id}`)}
            >
              <Image source={{ uri: p.image }} style={styles.productImage} />
              <Text style={styles.productName}>{p.name}</Text>
              <Text style={styles.productPrice}>{p.price} $</Text>
            </TouchableOpacity>
          ))}
        </View>
      </Animated.ScrollView>

      {/* Bottom fixed buttons */}
      <View style={styles.bottomBar}>
        <TouchableOpacity style={styles.bottomButton} onPress={() => router.push("/vendre")}>
          <Ionicons name="add-circle-outline" size={28} color="#fff" />
          <Text style={styles.bottomText}>Vendre</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.bottomButton} onPress={() => router.push("/commandes")}>
          <Ionicons name="cart-outline" size={28} color="#fff" />
          <Text style={styles.bottomText}>Commandes</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.bottomButton} onPress={() => router.push("/profile")}>
          <Ionicons name="person-outline" size={28} color="#fff" />
          <Text style={styles.bottomText}>Profil</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.bottomButton} onPress={() => router.push("/infos")}>
          <Feather name="info" size={28} color="#fff" />
          <Text style={styles.bottomText}>Infos</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: SHOPNET_BLUE },
  loadingContainer: { flex:1, justifyContent:'center', alignItems:'center', backgroundColor: SHOPNET_BLUE },
  loadingText: { color:'#fff', marginTop:16 },
  emptyContainer: { flex:1, justifyContent:'center', alignItems:'center', backgroundColor: SHOPNET_BLUE },
  emptyTitle: { color:'#fff', fontSize:22, marginVertical:20 },
  createButton: { backgroundColor:SHOPNET_GREEN, padding:14, borderRadius:12, flexDirection:'row', alignItems:'center' },
  createButtonText: { color:'#fff', marginLeft:8, fontWeight:'600' },
  header: { alignItems:'center', paddingVertical:30 },
  storeName: { color:'#fff', fontSize:28, fontWeight:'700', marginTop:8 },
  storeType: { color:'rgba(255,255,255,0.7)', fontSize:16, marginTop:4 },
  premiumButton: { marginTop:12, backgroundColor:'#FFAA00', paddingVertical:6, paddingHorizontal:14, borderRadius:12 },
  premiumButtonText: { color:'#00182A', fontWeight:'700' },
  fixedHeader: { 
    position:'absolute', top:0, left:0, right:0, height:60, backgroundColor:SHOPNET_BLUE, flexDirection:'row', alignItems:'center', paddingHorizontal:16, zIndex:10 
  },
  fixedHeaderText: { color:'#fff', fontWeight:'700', fontSize:16, marginLeft:8, flex:1 },
  productsGrid: { flexDirection:'row', flexWrap:'wrap', justifyContent:'space-between', padding:12 },
  productCard: { width:(width/2)-18, backgroundColor:'rgba(30,42,59,0.9)', borderRadius:12, marginBottom:12, padding:8 },
  productImage: { width:'100%', height:120, borderRadius:8 },
  productName: { color:'#fff', fontWeight:'600', marginTop:8 },
  productPrice: { color:SHOPNET_GREEN, fontWeight:'700', marginTop:4 },
  bottomBar: { position:'absolute', bottom:0, left:0, right:0, height:70, backgroundColor:SHOPNET_BLUE, flexDirection:'row', justifyContent:'space-around', alignItems:'center', borderTopWidth:1, borderTopColor:'rgba(255,255,255,0.2)' },
  bottomButton: { alignItems:'center' },
  bottomText: { color:'#fff', fontSize:12, marginTop:2 },
});
