


// ...imports
import React, { useEffect, useState } from 'react';
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
} from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { FontAwesome5 } from '@expo/vector-icons';
import { authApi, getValidToken } from '../authService';

const { width } = Dimensions.get('window');

// Fonction pour formater le numéro au format international sans +
function formatPhoneForWhatsApp(phone: string): string {
  // Retire tout sauf chiffres et +
  let cleaned = phone.replace(/[^\d+]/g, '');

  if (cleaned.startsWith('+')) {
    // Retirer le + car wa.me ne veut pas de +
    return cleaned.substring(1).replace(/\D/g, '');
  }

  // Si commence par 0, on l'enlève (ex: 0994043643 -> 994043643)
  if (cleaned.startsWith('0')) {
    cleaned = cleaned.substring(1);
  }

  // Ajouter indicatif pays RDC = 243 (sans +)
  return '243' + cleaned;
}

export default function CommandeDetailFacebook() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [commande, setCommande] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id) fetchCommandeDetails(id);
  }, [id]);

  const fetchCommandeDetails = async (commandeId: string) => {
    try {
      const token = await getValidToken();
      const { data } = await authApi.get(`/commandes/${commandeId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (data.success) setCommande(data.commande);
    } catch {
      Alert.alert('Erreur', 'Impossible de charger la commande.');
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
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (data.success) {
        Alert.alert('Succès', `Statut changé : ${status}`);
        setCommande((prev: any) => ({ ...prev, statut: status }));
      }
    } catch {
      Alert.alert('Erreur', 'Échec de la mise à jour du statut.');
    }
  };

  const handlePrint = () => {
    Alert.alert('Imprimer', "Fonction d'impression en cours de développement.");
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#4CB050" />
      </View>
    );
  }

  if (!commande) return null;

  const { commandeId, client, produits, statut, total, date_commande, mode_paiement } = commande;

  const formatDate = (dateStr: string) =>
    new Date(dateStr).toLocaleString('fr-FR', {
      dateStyle: 'medium',
      timeStyle: 'short',
    });

  // Construire message WhatsApp prérempli
  const produitNoms = produits.map((p: any) => p.nom).join(', ');
  const message = `Bonjour ${client.nom} 👋,\n\nJ’ai bien reçu votre commande n°${commandeId} pour le(s) produit(s) : ${produitNoms}.\n\nÊtes-vous disponible pour finaliser l’achat ? N’hésitez pas à me faire savoir si vous avez des questions.\n\nMerci !`;
  const encodedMessage = encodeURIComponent(message);
  const phoneForWhatsApp = formatPhoneForWhatsApp(client.telephone);
  const whatsappUrl = `https://wa.me/${phoneForWhatsApp}?text=${encodedMessage}`;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.scroll}>
      <View style={styles.card}>
        <View style={styles.header}>
          <FontAwesome5 name="shopping-bag" size={28} color="#4CB050" />
          <Text style={styles.title}>Commande #{commandeId}</Text>
        </View>

        <Text style={[styles.statut, statutStyles[statut]]}>
          {statutLabels[statut] || statut}
        </Text>
        <Text style={styles.date}>{formatDate(date_commande)}</Text>

        {/* Bloc Client */}
        <View style={styles.flatCard}>
          <Text style={styles.sectionTitle}>Client</Text>
          <Text style={styles.text}><FontAwesome5 name="user" /> {client?.nom}</Text>
          <Text style={styles.text}><FontAwesome5 name="phone" /> {client?.telephone}</Text>
          <Text style={styles.text}><FontAwesome5 name="envelope" /> {client?.email}</Text>
          <Text style={styles.text}><FontAwesome5 name="map-marker-alt" /> {client?.adresse}</Text>
        </View>

        {/* Boutons Appel / WhatsApp */}
        <View style={[styles.flatCard, styles.rowBetween]}>
          <TouchableOpacity
            style={styles.flatBtn}
            onPress={() => Linking.openURL(`tel:${client.telephone}`)}
          >
            <FontAwesome5 name="phone" size={16} color="#4CB050" />
            <Text style={styles.flatBtnText}>Appel</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.flatBtn}
            onPress={() => {
              Linking.openURL(whatsappUrl);
            }}
          >
            <FontAwesome5 name="whatsapp" size={16} color="#4CB050" />
            <Text style={styles.flatBtnText}>Contacter</Text>
          </TouchableOpacity>
        </View>

        {/* Produits commandés */}
        <View style={styles.block}>
          <Text style={styles.sectionTitle}>Produits</Text>
          {produits.map((p: any, i: number) => (
            <View key={i} style={styles.produit}>
              <Image source={{ uri: p.image }} style={styles.produitImg} />
              <View style={{ marginLeft: 10 }}>
                <Text style={styles.textBold}>{p.nom}</Text>
                <Text style={styles.text}>Quantité: {p.quantite}</Text>
                <Text style={styles.text}>{p.prix_unitaire} $</Text>
              </View>
            </View>
          ))}
        </View>

        {/* Paiement */}
        <View style={styles.block}>
          <Text style={styles.sectionTitle}>Paiement</Text>
          <Text style={styles.text}><FontAwesome5 name="credit-card" /> {mode_paiement}</Text>
        </View>

        {/* Boutons de statut */}
        {statut === 'en_attente' && (
          <View style={styles.flatCardRow}>
            <TouchableOpacity
              style={[styles.actionBtn, { backgroundColor: '#4CB050' }]}
              onPress={() => handleUpdateStatus('confirmee')}
            >
              <FontAwesome5 name="check" size={16} color="#fff" />
              <Text style={styles.btnText}>Accepter</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionBtn, { backgroundColor: '#dc3545' }]}
              onPress={() => handleUpdateStatus('annulee')}
            >
              <FontAwesome5 name="times" size={16} color="#fff" />
              <Text style={styles.btnText}>Refuser</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionBtn, { backgroundColor: '#17a2b8' }]}
              onPress={handlePrint}
            >
              <FontAwesome5 name="print" size={16} color="#fff" />
              <Text style={styles.btnText}>Imprimer</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Total en bas */}
        <View style={styles.totalContainer}>
          <Text style={styles.total}>Total : {total} $</Text>
        </View>
      </View>
    </ScrollView>
  );
}

const statutLabels: any = {
  en_attente: '🕒 En attente',
  confirmee: '✅ Confirmée',
  annulee: '❌ Annulée',
  livree: '📦 Livrée',
};

const statutStyles: any = {
  en_attente: { color: '#ffc107' },
  confirmee: { color: '#4CB050' },
  annulee: { color: '#dc3545' },
  livree: { color: '#17a2b8' },
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#121212',
  },
  scroll: {
    alignItems: 'center',
    padding: 16,
  },
  card: {
    width: '100%',
    borderRadius: 12,
    padding: 20,
    backgroundColor: 'rgba(255,255,255,0.02)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
    marginLeft: 10,
  },
  date: {
    color: '#bbb',
    marginBottom: 10,
  },
  statut: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 18,
    color: '#4CB050',
    fontWeight: 'bold',
    marginBottom: 8,
  },
  block: {
    marginVertical: 12,
  },
  text: {
    color: '#ddd',
    marginBottom: 4,
    fontSize: 15,
  },
  textBold: {
    fontWeight: 'bold',
    color: '#fff',
  },
  produit: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 12,
    padding: 8,
  },
  produitImg: {
    width: 60,
    height: 60,
    borderRadius: 12,
    backgroundColor: '#333',
  },
  flatCard: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    borderRadius: 12,
    padding: 12,
    marginVertical: 10,
  },
  flatCardRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    borderRadius: 12,
    padding: 10,
    marginVertical: 10,
  },
  rowBetween: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 20,
  },
  flatBtn: {
    flex: 1,
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#4CB050',
  },
  flatBtnText: {
    color: '#4CB050',
    fontWeight: '600',
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginHorizontal: 6,
    flex: 1,
    justifyContent: 'center',
  },
  btnText: {
    color: '#fff',
    fontWeight: 'bold',
    marginLeft: 8,
  },
  totalContainer: {
    marginTop: 20,
    alignItems: 'center',
  },
  total: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#3ca740ff',
  },
  center: {
    flex: 1,
    backgroundColor: '#121212',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
