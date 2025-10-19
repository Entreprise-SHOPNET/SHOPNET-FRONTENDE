import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  ActivityIndicator,
  Alert,
  TouchableOpacity,
  Linking,
  Dimensions,
  StatusBar,
  Animated,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons, MaterialIcons, FontAwesome5 } from "@expo/vector-icons";
import { authApi, getValidToken } from "../authService";

const { width } = Dimensions.get("window");

// Couleurs SHOPNET PRO VIP
const SHOPNET_BLUE = "#00182A";
const PRO_BLUE = "#42A5F5";
const PREMIUM_GOLD = "#FFD700";
const CARD_BG = "#1E2A3B";
const TEXT_WHITE = "#FFFFFF";
const TEXT_SECONDARY = "#A0AEC0";
const SUCCESS_GREEN = "#4CAF50";
const ERROR_RED = "#FF6B6B";
const WARNING_ORANGE = "#FFA726";

// Fonction pour formater le numéro au format international sans +
function formatPhoneForWhatsApp(phone: string): string {
  let cleaned = phone.replace(/[^\d+]/g, "");

  if (cleaned.startsWith("+")) {
    return cleaned.substring(1).replace(/\D/g, "");
  }

  if (cleaned.startsWith("0")) {
    cleaned = cleaned.substring(1);
  }

  return "243" + cleaned;
}

export default function CommandeDetailFacebook() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [commande, setCommande] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const fadeAnim = useState(new Animated.Value(0))[0];
  const slideAnim = useState(new Animated.Value(30))[0];

  useEffect(() => {
    if (id) fetchCommandeDetails(id);
  }, [id]);

  useEffect(() => {
    if (!loading && commande) {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 600,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 500,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [loading, commande]);

  const fetchCommandeDetails = async (commandeId: string) => {
    try {
      const token = await getValidToken();
      const { data } = await authApi.get(`/commandes/${commandeId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (data.success) setCommande(data.commande);
    } catch {
      Alert.alert(
        "Erreur",
        "Impossible de charger les détails de la commande.",
      );
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateStatus = async (status: string) => {
    try {
      const token = await getValidToken();
      const { data } = await authApi.put(
        `/commandes/${id}/status`,
        { status },
        { headers: { Authorization: `Bearer ${token}` } },
      );
      if (data.success) {
        Alert.alert("Succès", `Statut mis à jour : ${statutLabels[status]}`);
        setCommande((prev: any) => ({ ...prev, statut: status }));
      }
    } catch {
      Alert.alert("Erreur", "Échec de la mise à jour du statut.");
    }
  };

  const handlePrint = () => {
    Alert.alert("Impression", "Fonction d'impression bientôt disponible.");
  };

  const handleCall = (phone: string) => {
    Linking.openURL(`tel:${phone}`);
  };

  const handleWhatsApp = (client: any, commandeId: string, produits: any[]) => {
    const produitNoms = produits.map((p: any) => p.nom).join(", ");
    const message = `Bonjour ${client.nom} 👋,\n\nJ'ai bien reçu votre commande n°${commandeId} pour le(s) produit(s) : ${produitNoms}.\n\nÊtes-vous disponible pour finaliser l'achat ? N'hésitez pas à me faire savoir si vous avez des questions.\n\nMerci !`;
    const encodedMessage = encodeURIComponent(message);
    const phoneForWhatsApp = formatPhoneForWhatsApp(client.telephone);
    const whatsappUrl = `https://wa.me/${phoneForWhatsApp}?text=${encodedMessage}`;
    Linking.openURL(whatsappUrl);
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <StatusBar backgroundColor={SHOPNET_BLUE} barStyle="light-content" />
        <ActivityIndicator size="large" color={PRO_BLUE} />
        <Text style={styles.loadingText}>Chargement des détails...</Text>
      </View>
    );
  }

  if (!commande) {
    return (
      <View style={styles.errorContainer}>
        <StatusBar backgroundColor={SHOPNET_BLUE} barStyle="light-content" />
        <Ionicons name="alert-circle" size={64} color={ERROR_RED} />
        <Text style={styles.errorText}>Commande non trouvée</Text>
        <TouchableOpacity
          style={styles.retryButton}
          onPress={() => router.back()}
        >
          <Text style={styles.retryButtonText}>Retour</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const {
    commandeId,
    client,
    produits,
    statut,
    total,
    date_commande,
    mode_paiement,
  } = commande;

  const formatDate = (dateStr: string) =>
    new Date(dateStr).toLocaleString("fr-FR", {
      dateStyle: "full",
      timeStyle: "short",
    });

  const getStatusColor = (status: string) => {
    switch (status) {
      case "en_attente":
        return WARNING_ORANGE;
      case "confirmee":
        return SUCCESS_GREEN;
      case "annulee":
        return ERROR_RED;
      case "livree":
        return PRO_BLUE;
      default:
        return TEXT_SECONDARY;
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar backgroundColor={SHOPNET_BLUE} barStyle="light-content" />

      {/* Header PRO VIP */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Ionicons name="chevron-back" size={28} color={PRO_BLUE} />
        </TouchableOpacity>

        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Détails Commande</Text>
          <Text style={styles.headerSubtitle}>SHOPNET PRO</Text>
        </View>

        <View style={styles.headerBadge}>
          <Ionicons name="diamond" size={16} color={PREMIUM_GOLD} />
          <Text style={styles.headerBadgeText}>VIP</Text>
        </View>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Carte Principale Commande */}
        <Animated.View
          style={[
            styles.mainCard,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }],
            },
          ]}
        >
          {/* En-tête Commande */}
          <View style={styles.orderHeader}>
            <View style={styles.orderIcon}>
              <Ionicons name="receipt" size={32} color={PRO_BLUE} />
            </View>
            <View style={styles.orderInfo}>
              <Text style={styles.orderId}>Commande #{commandeId}</Text>
              <Text style={styles.orderDate}>{formatDate(date_commande)}</Text>
            </View>
          </View>

          {/* Statut Commande */}
          <View
            style={[
              styles.statusBadge,
              { backgroundColor: getStatusColor(statut) },
            ]}
          >
            <Ionicons
              name={
                statut === "confirmee"
                  ? "checkmark-circle"
                  : statut === "annulee"
                    ? "close-circle"
                    : statut === "livree"
                      ? "cube"
                      : "time"
              }
              size={20}
              color={TEXT_WHITE}
            />
            <Text style={styles.statusText}>{statutLabels[statut]}</Text>
          </View>

          {/* Section Client */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Ionicons name="person" size={20} color={PRO_BLUE} />
              <Text style={styles.sectionTitle}>Informations Client</Text>
            </View>

            <View style={styles.clientInfo}>
              <View style={styles.infoRow}>
                <Ionicons
                  name="person-outline"
                  size={18}
                  color={TEXT_SECONDARY}
                />
                <Text style={styles.infoText}>{client.nom}</Text>
              </View>

              <View style={styles.infoRow}>
                <Ionicons
                  name="call-outline"
                  size={18}
                  color={TEXT_SECONDARY}
                />
                <Text style={styles.infoText}>{client.telephone}</Text>
              </View>

              {client.email && (
                <View style={styles.infoRow}>
                  <Ionicons
                    name="mail-outline"
                    size={18}
                    color={TEXT_SECONDARY}
                  />
                  <Text style={styles.infoText}>{client.email}</Text>
                </View>
              )}

              {client.adresse && (
                <View style={styles.infoRow}>
                  <Ionicons
                    name="location-outline"
                    size={18}
                    color={TEXT_SECONDARY}
                  />
                  <Text style={styles.infoText}>{client.adresse}</Text>
                </View>
              )}
            </View>

            {/* Actions Contact */}
            <View style={styles.contactActions}>
              <TouchableOpacity
                style={[styles.contactButton, styles.callButton]}
                onPress={() => handleCall(client.telephone)}
              >
                <Ionicons name="call" size={20} color={TEXT_WHITE} />
                <Text style={styles.contactButtonText}>Appeler</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.contactButton, styles.whatsappButton]}
                onPress={() => handleWhatsApp(client, commandeId, produits)}
              >
                <Ionicons name="logo-whatsapp" size={20} color={TEXT_WHITE} />
                <Text style={styles.contactButtonText}>WhatsApp</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Section Produits */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Ionicons name="cube" size={20} color={PRO_BLUE} />
              <Text style={styles.sectionTitle}>Produits Commandés</Text>
            </View>

            {produits.map((produit: any, index: number) => (
              <View key={index} style={styles.productCard}>
                <Image
                  source={{ uri: produit.image }}
                  style={styles.productImage}
                  defaultSource={{ uri: "https://via.placeholder.com/80" }}
                />

                <View style={styles.productDetails}>
                  <Text style={styles.productName} numberOfLines={2}>
                    {produit.nom}
                  </Text>

                  <View style={styles.productMeta}>
                    <Text style={styles.productQuantity}>
                      Quantité: {produit.quantite}
                    </Text>
                    <Text style={styles.productPrice}>
                      ${produit.prix_unitaire}
                    </Text>
                  </View>

                  <Text style={styles.productTotal}>
                    Total: $
                    {(produit.prix_unitaire * produit.quantite).toFixed(2)}
                  </Text>
                </View>
              </View>
            ))}
          </View>

          {/* Section Paiement */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Ionicons name="card" size={20} color={PRO_BLUE} />
              <Text style={styles.sectionTitle}>Informations Paiement</Text>
            </View>

            <View style={styles.paymentInfo}>
              <View style={styles.paymentRow}>
                <Text style={styles.paymentLabel}>Mode de paiement:</Text>
                <Text style={styles.paymentValue}>{mode_paiement}</Text>
              </View>

              <View style={styles.paymentRow}>
                <Text style={styles.paymentLabel}>Statut:</Text>
                <Text
                  style={[
                    styles.paymentValue,
                    { color: getStatusColor(statut) },
                  ]}
                >
                  {statutLabels[statut]}
                </Text>
              </View>
            </View>
          </View>

          {/* Actions Statut */}
          {statut === "en_attente" && (
            <View style={styles.actionsSection}>
              <View style={styles.sectionHeader}>
                <Ionicons name="settings" size={20} color={PRO_BLUE} />
                <Text style={styles.sectionTitle}>Actions</Text>
              </View>

              <View style={styles.statusActions}>
                <TouchableOpacity
                  style={[styles.statusButton, styles.confirmButton]}
                  onPress={() => handleUpdateStatus("confirmee")}
                >
                  <Ionicons name="checkmark" size={20} color={TEXT_WHITE} />
                  <Text style={styles.statusButtonText}>Accepter</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.statusButton, styles.cancelButton]}
                  onPress={() => handleUpdateStatus("annulee")}
                >
                  <Ionicons name="close" size={20} color={TEXT_WHITE} />
                  <Text style={styles.statusButtonText}>Refuser</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.statusButton, styles.printButton]}
                  onPress={handlePrint}
                >
                  <Ionicons name="print" size={20} color={TEXT_WHITE} />
                  <Text style={styles.statusButtonText}>Imprimer</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* Total */}
          <View style={styles.totalSection}>
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Total de la commande</Text>
              <Text style={styles.totalAmount}>
                ${parseFloat(total).toFixed(2)}
              </Text>
            </View>
          </View>
        </Animated.View>
      </ScrollView>
    </View>
  );
}

const statutLabels: any = {
  en_attente: "En attente",
  confirmee: "Confirmée",
  annulee: "Annulée",
  livree: "Livrée",
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: SHOPNET_BLUE,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: SHOPNET_BLUE,
  },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: SHOPNET_BLUE,
    padding: 20,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: SHOPNET_BLUE,
  },
  backButton: {
    padding: 4,
  },
  headerCenter: {
    alignItems: "center",
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: TEXT_WHITE,
  },
  headerSubtitle: {
    fontSize: 12,
    color: PRO_BLUE,
    fontWeight: "600",
    marginTop: 2,
  },
  headerBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255, 215, 0, 0.1)",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: PREMIUM_GOLD,
    gap: 4,
  },
  headerBadgeText: {
    color: PREMIUM_GOLD,
    fontSize: 12,
    fontWeight: "800",
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 20,
  },
  mainCard: {
    backgroundColor: CARD_BG,
    marginHorizontal: 20,
    marginTop: 10,
    borderRadius: 16,
    padding: 20,
  },
  orderHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },
  orderIcon: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "rgba(66, 165, 245, 0.1)",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 16,
  },
  orderInfo: {
    flex: 1,
  },
  orderId: {
    fontSize: 22,
    fontWeight: "800",
    color: TEXT_WHITE,
    marginBottom: 4,
  },
  orderDate: {
    fontSize: 14,
    color: TEXT_SECONDARY,
    fontWeight: "500",
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginBottom: 20,
    gap: 6,
  },
  statusText: {
    color: TEXT_WHITE,
    fontSize: 14,
    fontWeight: "700",
  },
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
    gap: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: TEXT_WHITE,
  },
  clientInfo: {
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
    gap: 8,
  },
  infoText: {
    fontSize: 16,
    color: TEXT_WHITE,
    fontWeight: "500",
    flex: 1,
  },
  contactActions: {
    flexDirection: "row",
    gap: 12,
  },
  contactButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    borderRadius: 12,
    gap: 8,
  },
  callButton: {
    backgroundColor: PRO_BLUE,
  },
  whatsappButton: {
    backgroundColor: "#25D366",
  },
  contactButtonText: {
    color: TEXT_WHITE,
    fontSize: 16,
    fontWeight: "600",
  },
  productCard: {
    flexDirection: "row",
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
  },
  productImage: {
    width: 80,
    height: 80,
    borderRadius: 8,
    backgroundColor: "#2C3A4A",
  },
  productDetails: {
    flex: 1,
    marginLeft: 12,
    justifyContent: "space-between",
  },
  productName: {
    fontSize: 16,
    fontWeight: "600",
    color: TEXT_WHITE,
    marginBottom: 8,
  },
  productMeta: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  productQuantity: {
    fontSize: 14,
    color: TEXT_SECONDARY,
    fontWeight: "500",
  },
  productPrice: {
    fontSize: 16,
    fontWeight: "700",
    color: PRO_BLUE,
  },
  productTotal: {
    fontSize: 15,
    fontWeight: "800",
    color: PREMIUM_GOLD,
  },
  paymentInfo: {
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    borderRadius: 12,
    padding: 16,
  },
  paymentRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  paymentLabel: {
    fontSize: 16,
    color: TEXT_SECONDARY,
    fontWeight: "500",
  },
  paymentValue: {
    fontSize: 16,
    fontWeight: "600",
    color: TEXT_WHITE,
  },
  actionsSection: {
    marginBottom: 24,
  },
  statusActions: {
    flexDirection: "row",
    gap: 12,
  },
  statusButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
  },
  confirmButton: {
    backgroundColor: SUCCESS_GREEN,
  },
  cancelButton: {
    backgroundColor: ERROR_RED,
  },
  printButton: {
    backgroundColor: PRO_BLUE,
  },
  statusButtonText: {
    color: TEXT_WHITE,
    fontSize: 14,
    fontWeight: "700",
  },
  totalSection: {
    borderTopWidth: 1,
    borderTopColor: "rgba(66, 165, 245, 0.2)",
    paddingTop: 20,
  },
  totalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  totalLabel: {
    fontSize: 18,
    fontWeight: "600",
    color: TEXT_WHITE,
  },
  totalAmount: {
    fontSize: 28,
    fontWeight: "800",
    color: PREMIUM_GOLD,
  },
  loadingText: {
    color: PRO_BLUE,
    fontSize: 16,
    marginTop: 12,
    fontWeight: "500",
  },
  errorText: {
    color: ERROR_RED,
    fontSize: 18,
    fontWeight: "600",
    marginTop: 16,
    marginBottom: 24,
    textAlign: "center",
  },
  retryButton: {
    backgroundColor: PRO_BLUE,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
  },
  retryButtonText: {
    color: TEXT_WHITE,
    fontSize: 16,
    fontWeight: "600",
  },
});
