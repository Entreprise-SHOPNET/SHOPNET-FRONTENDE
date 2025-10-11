

import React, { useEffect, useState } from "react";
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
  SafeAreaView,
  StatusBar
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter } from "expo-router";
import { FontAwesome5, MaterialIcons, Feather, Ionicons } from "@expo/vector-icons";

const { width, height } = Dimensions.get('window');
const SHOPNET_BLUE = '#00182A';
const SHOPNET_GREEN = '#4DB14E';

export default function MaBoutique() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [boutique, setBoutique] = useState<any>(null);
  const fadeAnim = useState(new Animated.Value(0))[0];
  const slideAnim = useState(new Animated.Value(30))[0];

  useEffect(() => {
    const fetchBoutique = async () => {
      try {
        const token = await AsyncStorage.getItem("userToken");
        if (!token) {
          Alert.alert("Erreur", "Veuillez vous reconnecter.");
          router.replace("/splash");
          return;
        }

        const response = await fetch("https://shopnet-backend.onrender.com/api/boutiques/check", {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        });

        const data = await response.json();

        if (response.ok) {
          setBoutique(data.boutique);
          // Animation lorsque les données sont chargées
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
        } else {
          Alert.alert("Erreur", data.message || "Impossible de récupérer la boutique.");
        }
      } catch (error) {
        console.error("Erreur chargement boutique :", error);
        Alert.alert("Erreur", "Problème de connexion au serveur.");
      } finally {
        setLoading(false);
      }
    };

    fetchBoutique();
  }, []);

  const handleDeleteBoutique = async () => {
    Alert.alert(
      "Supprimer la boutique",
      "Êtes-vous sûr de vouloir supprimer définitivement votre boutique ? Cette action est irréversible.",
      [
        { 
          text: "Annuler", 
          style: "cancel" 
        },
        {
          text: "Supprimer",
          style: "destructive",
          onPress: async () => {
            try {
              const token = await AsyncStorage.getItem("userToken");
              const response = await fetch("https://shopnet-backend.onrender.com/api/boutiques/delete", {
                method: "DELETE",
                headers: {
                  Authorization: `Bearer ${token}`,
                  "Content-Type": "application/json",
                },
              });

              if (response.ok) {
                Alert.alert("Succès", "Votre boutique a été supprimée avec succès.");
                router.replace("/(tabs)/Auth/Boutique/CreerBoutique");
              } else {
                Alert.alert("Erreur", "Impossible de supprimer la boutique.");
              }
            } catch {
              Alert.alert("Erreur", "Problème de connexion lors de la suppression.");
            }
          },
        },
      ]
    );
  };

  const handleEditBoutique = () => {
    router.push({
      pathname: "/modifier-boutique",
      params: { boutique: JSON.stringify(boutique) }
    });
  };

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
        <Animated.View style={[styles.emptyIcon, { opacity: fadeAnim }]}>
          <FontAwesome5 name="store-slash" size={80} color="rgba(255,255,255,0.3)" />
        </Animated.View>
        <Text style={styles.emptyTitle}>Aucune boutique trouvée</Text>
        <Text style={styles.emptySubtitle}>
          Créez votre première boutique et commencez à vendre dès aujourd'hui
        </Text>
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
      
      <ScrollView 
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Header avec icône et nom */}
        <Animated.View 
          style={[
            styles.header,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }]
            }
          ]}
        >
          <View style={styles.storeIcon}>
            <FontAwesome5 name="store" size={40} color={SHOPNET_GREEN} />
          </View>
          <Text style={styles.storeName}>{boutique.nom}</Text>
          <Text style={styles.storeType}>{boutique.type} • Active</Text>
        </Animated.View>

        {/* Carte d'informations principales */}
        <Animated.View 
          style={[
            styles.infoCard,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }]
            }
          ]}
        >
          <Text style={styles.cardTitle}>Informations de la boutique</Text>
          
          <View style={styles.infoGrid}>
            <View style={styles.infoItem}>
              <MaterialIcons name="person" size={20} color={SHOPNET_GREEN} />
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>Propriétaire</Text>
                <Text style={styles.infoValue}>{boutique.proprietaire}</Text>
              </View>
            </View>

            <View style={styles.infoItem}>
              <MaterialIcons name="email" size={20} color={SHOPNET_GREEN} />
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>Email</Text>
                <Text style={styles.infoValue}>{boutique.email}</Text>
              </View>
            </View>

            <View style={styles.infoItem}>
              <FontAwesome5 name="whatsapp" size={20} color={SHOPNET_GREEN} />
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>WhatsApp</Text>
                <Text style={styles.infoValue}>{boutique.whatsapp}</Text>
              </View>
            </View>

            <View style={styles.infoItem}>
              <Feather name="map-pin" size={20} color={SHOPNET_GREEN} />
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>Adresse</Text>
                <Text style={styles.infoValue}>{boutique.adresse}</Text>
              </View>
            </View>

            <View style={styles.infoItem}>
              <FontAwesome5 name="tags" size={20} color={SHOPNET_GREEN} />
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>Catégorie</Text>
                <Text style={styles.infoValue}>{boutique.categorie}</Text>
              </View>
            </View>
          </View>
        </Animated.View>

        {/* Carte description */}
        <Animated.View 
          style={[
            styles.descriptionCard,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }]
            }
          ]}
        >
          <View style={styles.descriptionHeader}>
            <Ionicons name="document-text" size={24} color={SHOPNET_GREEN} />
            <Text style={styles.cardTitle}>Description</Text>
          </View>
          <Text style={styles.descriptionText}>{boutique.description}</Text>
        </Animated.View>

        {/* Statistiques rapides */}
        <Animated.View 
          style={[
            styles.statsCard,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }]
            }
          ]}
        >
          <Text style={styles.cardTitle}>Aperçu</Text>
          <View style={styles.statsGrid}>
            <View style={styles.statItem}>
              <FontAwesome5 name="box-open" size={24} color={SHOPNET_GREEN} />
              <Text style={styles.statNumber}>0</Text>
              <Text style={styles.statLabel}>Produits</Text>
            </View>
            <View style={styles.statItem}>
              <FontAwesome5 name="shopping-cart" size={24} color={SHOPNET_GREEN} />
              <Text style={styles.statNumber}>0</Text>
              <Text style={styles.statLabel}>Commandes</Text>
            </View>
            <View style={styles.statItem}>
              <FontAwesome5 name="star" size={24} color={SHOPNET_GREEN} />
              <Text style={styles.statNumber}>0</Text>
              <Text style={styles.statLabel}>Avis</Text>
            </View>
          </View>
        </Animated.View>

        {/* Actions */}
        <Animated.View 
          style={[
            styles.actionsContainer,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }]
            }
          ]}
        >
          <TouchableOpacity 
            style={styles.editButton}
            onPress={handleEditBoutique}
          >
            <Feather name="edit-3" size={20} color="#fff" />
            <Text style={styles.editButtonText}>Modifier la boutique</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.deleteButton}
            onPress={handleDeleteBoutique}
          >
            <Feather name="trash-2" size={20} color="#fff" />
            <Text style={styles.deleteButtonText}>Supprimer la boutique</Text>
          </TouchableOpacity>
        </Animated.View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: SHOPNET_BLUE,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 40,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: SHOPNET_BLUE,
  },
  loadingText: {
    color: "#fff",
    marginTop: 16,
    fontSize: 16,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: SHOPNET_BLUE,
    paddingHorizontal: 40,
  },
  emptyIcon: {
    marginBottom: 24,
  },
  emptyTitle: {
    color: "#fff",
    fontSize: 24,
    fontWeight: "700",
    marginBottom: 8,
    textAlign: "center",
  },
  emptySubtitle: {
    color: "rgba(255,255,255,0.7)",
    fontSize: 16,
    textAlign: "center",
    lineHeight: 22,
    marginBottom: 32,
  },
  createButton: {
    backgroundColor: SHOPNET_GREEN,
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    minWidth: 200,
    justifyContent: "center",
  },
  createButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
    marginLeft: 8,
  },
  header: {
    alignItems: "center",
    paddingVertical: 32,
    paddingHorizontal: 20,
  },
  storeIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "rgba(77, 177, 78, 0.1)",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
    borderWidth: 2,
    borderColor: "rgba(77, 177, 78, 0.3)",
  },
  storeName: {
    color: "#fff",
    fontSize: 28,
    fontWeight: "700",
    textAlign: "center",
    marginBottom: 4,
  },
  storeType: {
    color: "rgba(255,255,255,0.7)",
    fontSize: 16,
    textAlign: "center",
  },
  infoCard: {
    backgroundColor: "rgba(30, 42, 59, 0.9)",
    marginHorizontal: 20,
    borderRadius: 16,
    padding: 24,
    marginBottom: 16,
  },
  descriptionCard: {
    backgroundColor: "rgba(30, 42, 59, 0.9)",
    marginHorizontal: 20,
    borderRadius: 16,
    padding: 24,
    marginBottom: 16,
  },
  statsCard: {
    backgroundColor: "rgba(30, 42, 59, 0.9)",
    marginHorizontal: 20,
    borderRadius: 16,
    padding: 24,
    marginBottom: 16,
  },
  cardTitle: {
    color: "#fff",
    fontSize: 20,
    fontWeight: "700",
    marginBottom: 16,
  },
  descriptionHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  descriptionText: {
    color: "rgba(255,255,255,0.9)",
    fontSize: 16,
    lineHeight: 24,
  },
  infoGrid: {
    gap: 16,
  },
  infoItem: {
    flexDirection: "row",
    alignItems: "flex-start",
  },
  infoContent: {
    flex: 1,
    marginLeft: 12,
  },
  infoLabel: {
    color: "rgba(255,255,255,0.6)",
    fontSize: 14,
    marginBottom: 2,
  },
  infoValue: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "500",
  },
  statsGrid: {
    flexDirection: "row",
    justifyContent: "space-around",
  },
  statItem: {
    alignItems: "center",
  },
  statNumber: {
    color: "#fff",
    fontSize: 24,
    fontWeight: "700",
    marginVertical: 4,
  },
  statLabel: {
    color: "rgba(255,255,255,0.6)",
    fontSize: 14,
  },
  actionsContainer: {
    paddingHorizontal: 20,
    gap: 12,
  },
  editButton: {
    backgroundColor: SHOPNET_GREEN,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 16,
    borderRadius: 12,
  },
  editButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
    marginLeft: 8,
  },
  deleteButton: {
    backgroundColor: "rgba(244, 67, 54, 0.9)",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 16,
    borderRadius: 12,
  },
  deleteButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
    marginLeft: 8,
  },
});