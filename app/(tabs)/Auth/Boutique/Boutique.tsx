

// BoutiqueScreen.tsx
import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  Alert,
  RefreshControl,
  ScrollView,
  Linking,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { useRouter, useFocusEffect } from 'expo-router';
import { FontAwesome5, MaterialIcons, Ionicons, Feather } from '@expo/vector-icons';

// 🔹 Serveur Render en production
const LOCAL_API = 'https://shopnet-backend.onrender.com/api';

// 🔹 Serveur local pour développement (commenté)
// const LOCAL_API = 'http://100.64.134.89:5000/api';



const SHOPNET_BLUE = "#00182A";
const PREMIUM_ORANGE = "#FFA726";
const VALID_GREEN = "#4DB14E";
const PENDING_ORANGE = "#FFA726";
const REJECTED_RED = "#FF6B6B";
const PENDING_BLUE = "#42A5F5";

interface BoutiqueInfo {
  success: boolean;
  hasBoutique: boolean;
  boutique?: {
    id: number;
    nom: string;
    type: 'premium';
    statut: 'pending_payment' | 'pending_validation' | 'validé' | 'rejeté';
    type_boutique?: string;
    categorie?: string;
    logo?: string;
    prix?: number;
    devise?: string;
    date_creation?: string;
    date_expiration?: string;
    jours_restants?: number;
  };
  message?: string;
}

const BoutiqueScreen = () => {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [hasBoutique, setHasBoutique] = useState(false);
  const [boutiqueStatus, setBoutiqueStatus] = useState<'pending_payment' | 'pending_validation' | 'validé' | 'rejeté' | ''>('');
  const [boutiqueName, setBoutiqueName] = useState<string>('');
  const [boutiqueId, setBoutiqueId] = useState<number | null>(null);
  const [joursRestants, setJoursRestants] = useState<number | null>(null);
  const [token, setToken] = useState<string | null>(null);

  useFocusEffect(
    React.useCallback(() => {
      checkPremiumBoutique();
    }, [])
  );

  const checkPremiumBoutique = async () => {
    try {
      setLoading(true);
      
      const storedToken = await AsyncStorage.getItem('userToken');
      
      if (!storedToken) {
        setLoading(false);
        setToken(null);
        return;
      }
      
      setToken(storedToken);

      console.log('Vérification boutique premium...');
      
      const premiumRes = await axios.get(`${LOCAL_API}/boutique/premium/check`, {
        headers: { Authorization: `Bearer ${storedToken}` }
      });

      console.log('Réponse API boutique premium:', JSON.stringify(premiumRes.data, null, 2));

      if (premiumRes.data.success && premiumRes.data.hasBoutique && premiumRes.data.boutique) {
        const boutique = premiumRes.data.boutique;
        setHasBoutique(true);
        setBoutiqueStatus(boutique.statut || '');
        setBoutiqueName(boutique.nom || 'Boutique Premium');
        setBoutiqueId(boutique.id);
        setJoursRestants(boutique.jours_restants || null);
        
        // Rediriger automatiquement selon le statut
        handleAutoRedirect(boutique.statut, boutique.id);
      } else {
        setHasBoutique(false);
        setBoutiqueStatus('');
        setBoutiqueName('');
        setBoutiqueId(null);
        setJoursRestants(null);
      }

    } catch (err: any) {
      console.error('Erreur vérification boutique premium:', {
        message: err.message,
        response: err.response?.data,
        status: err.response?.status
      });
      
      if (err.response?.status === 401) {
        // Token invalide ou expiré
        await AsyncStorage.removeItem('userToken');
        setToken(null);
        Alert.alert(
          "Session expirée",
          "Votre session a expiré. Veuillez vous reconnecter.",
          [{ text: "Se connecter", onPress: () => router.push('/splash') }]
        );
      }
      
      setHasBoutique(false);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleAutoRedirect = (status: string, id: number) => {
    const normalizedStatus = status.toLowerCase();
    
    // Si l'utilisateur revient sur cette page, ne pas rediriger automatiquement
    // Laissez-le cliquer manuellement
    console.log('Statut boutique pour redirection:', normalizedStatus);
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await checkPremiumBoutique();
  };

  const handleCreerBoutique = () => {
    if (!token) {
      Alert.alert(
        "Connexion requise",
        "Veuillez vous connecter pour créer une boutique",
        [
          {
            text: "Se connecter",
            onPress: () => router.push('/splash'),
          },
          { text: "Annuler", style: "cancel" },
        ]
      );
      return;
    }

    if (hasBoutique) {
      Alert.alert(
        "Boutique existante",
        "Vous avez déjà une boutique premium.",
        [{ text: "OK" }]
      );
      return;
    }

    router.push('/(tabs)/Auth/Boutique/CreerBoutique');
  };

  // MODIFICATION CRITIQUE : Gestion du statut pending_validation
  const handleMaBoutique = () => {
    if (!token) {
      Alert.alert(
        "Connexion requise",
        "Veuillez vous connecter pour accéder à votre boutique",
        [
          {
            text: "Se connecter",
            onPress: () => router.push('/splash'),
          },
          { text: "Annuler", style: "cancel" },
        ]
      );
      return;
    }

    if (!hasBoutique || !boutiqueId) {
      Alert.alert(
        "Aucune boutique",
        "Vous n'avez pas encore de boutique premium. Voulez-vous en créer une?",
        [
          {
            text: "Créer une boutique",
            onPress: () => router.push('/(tabs)/Auth/Boutique/CreerBoutique'),
          },
          { text: "Annuler", style: "cancel" },
        ]
      );
      return;
    }

    // Navigation selon le statut
    switch (boutiqueStatus) {
      case 'pending_payment':
        router.push({
          pathname: '/(tabs)/Auth/Boutique/Premium/PaymentProofBoutique',
          params: { 
            boutiqueId: boutiqueId.toString(),
            boutiqueNom: boutiqueName
          }
        });
        break;
        
      case 'pending_validation':
        // IMPORTANT : Redirection vers la page de preuve de paiement pour modification
        router.push({
          pathname: '/(tabs)/Auth/Boutique/Premium/PaymentProofBoutique',
          params: { 
            boutiqueId: boutiqueId.toString(),
            boutiqueNom: boutiqueName,
            isModification: 'true',
            status: 'pending_validation'
          }
        });
        break;
        
      case 'validé':
        router.push({
          pathname: '/(tabs)/Auth/Boutique/Premium/BoutiquePremium',
          params: { boutiqueId: boutiqueId.toString() }
        });
        break;
        
      case 'rejeté':
        Alert.alert(
          "Boutique rejetée",
          "Votre boutique a été rejetée. Veuillez contacter le support pour plus d'informations.",
          [
            { 
              text: "Contacter le support", 
              onPress: () => contactSupport() 
            },
            { 
              text: "Modifier la preuve", 
              onPress: () => {
                router.push({
                  pathname: '/(tabs)/Auth/Boutique/Premium/PaymentProofBoutique',
                  params: { 
                    boutiqueId: boutiqueId.toString(),
                    boutiqueNom: boutiqueName,
                    isModification: 'true',
                    status: 'rejeté'
                  }
                });
              }
            },
            { text: "OK", style: "cancel" }
          ]
        );
        break;
        
      default:
        Alert.alert(
          "Statut inconnu",
          "Le statut de votre boutique est inconnu. Contactez le support.",
          [
            { text: "Contacter le support", onPress: () => contactSupport() },
            { text: "OK", style: "cancel" }
          ]
        );
    }
  };

  // Fonction pour contacter le support
  const contactSupport = async () => {
    Alert.alert(
      "Contactez le support",
      "Choisissez un moyen de contact",
      [
        {
          text: "Email",
          onPress: async () => {
            try {
              const email = 'Entrepriseshopia@gmail.com';
              const subject = encodeURIComponent('Support Boutique Premium');
              const body = encodeURIComponent(`Bonjour,\n\nJ'ai besoin d'assistance pour ma boutique premium.\n\nBoutique: ${boutiqueName}\nID: ${boutiqueId}\nStatut: ${boutiqueStatus}\n\nMerci.`);
              await Linking.openURL(`mailto:${email}?subject=${subject}&body=${body}`);
            } catch (error) {
              Alert.alert("Erreur", "Impossible d'ouvrir l'application email");
            }
          }
        },
        {
          text: "WhatsApp",
          onPress: async () => {
            try {
              const phone = '243896037137';
              const message = encodeURIComponent('Bonjour, j\'ai besoin d\'assistance pour ma boutique premium.');
              await Linking.openURL(`https://wa.me/${phone}?text=${message}`);
            } catch (error) {
              Alert.alert("Erreur", "Impossible d'ouvrir WhatsApp");
            }
          }
        },
        { text: "Annuler", style: "cancel" }
      ]
    );
  };

  const getStatusColor = () => {
    switch (boutiqueStatus) {
      case 'validé':
        return VALID_GREEN;
      case 'pending_payment':
        return PENDING_ORANGE;
      case 'pending_validation':
        return PENDING_BLUE;
      case 'rejeté':
        return REJECTED_RED;
      default:
        return PREMIUM_ORANGE;
    }
  };

  const getStatusText = () => {
    switch (boutiqueStatus) {
      case 'validé':
        return 'Validée ✓';
      case 'pending_payment':
        return 'Paiement en attente';
      case 'pending_validation':
        return 'Validation en cours';
      case 'rejeté':
        return 'Rejetée';
      default:
        return 'Statut inconnu';
    }
  };

  const getStatusIcon = () => {
    switch (boutiqueStatus) {
      case 'validé':
        return 'check-circle';
      case 'pending_payment':
        return 'credit-card';
      case 'pending_validation':
        return 'clock';
      case 'rejeté':
        return 'times-circle';
      default:
        return 'crown';
    }
  };

  const getStatusDescription = () => {
    switch (boutiqueStatus) {
      case 'validé':
        return `Votre boutique premium est active${joursRestants !== null ? ` pour encore ${joursRestants} jours` : ''}.`;
      case 'pending_payment':
        return 'Créez votre boutique premium et effectuez le paiement de 9.99 USD pour l\'activer.';
      case 'pending_validation':
        return 'Votre preuve de paiement est en cours de validation. Vous pouvez modifier votre preuve en cliquant ci-dessous.';
      case 'rejeté':
        return 'Votre preuve de paiement a été rejetée. Vous pouvez en soumettre une nouvelle.';
      default:
        return '';
    }
  };

  const getActionButtonText = () => {
    switch (boutiqueStatus) {
      case 'pending_payment':
        return 'Effectuer le paiement';
      case 'pending_validation':
        return 'Modifier la preuve de paiement';
      case 'validé':
        return 'Accéder à ma boutique';
      case 'rejeté':
        return 'Soumettre une nouvelle preuve';
      default:
        return 'Accéder';
    }
  };

  const getActionButtonIcon = () => {
    switch (boutiqueStatus) {
      case 'pending_payment':
        return 'credit-card';
      case 'pending_validation':
        return 'edit';
      case 'validé':
        return 'store';
      case 'rejeté':
        return 'redo';
      default:
        return 'store';
    }
  };

  const handleGestionProduits = () => {
    if (boutiqueStatus === 'validé' && boutiqueId) {
      router.push({
        pathname: '/(tabs)/Auth/Boutique/Premium/BoutiquePremium',
        params: { boutiqueId: boutiqueId.toString() }
      });
    } else {
      Alert.alert(
        "Boutique non active",
        "Votre boutique doit être validée pour gérer les produits.",
        [{ text: "OK" }]
      );
    }
  };

  // Fonction pour gérer le bouton d'urgence
  const handleUrgentSupport = () => {
    Alert.alert(
      "Support urgent",
      "Besoin d'aide immédiate ? Contactez-nous directement :",
      [
        {
          text: "WhatsApp",
          onPress: async () => {
            try {
              const phone = '243896037137';
              const message = encodeURIComponent('URGENT - Support Boutique Premium');
              await Linking.openURL(`https://wa.me/${phone}?text=${message}`);
            } catch (error) {
              Alert.alert("Erreur", "Impossible d'ouvrir WhatsApp");
            }
          }
        },
        {
          text: "Email",
          onPress: async () => {
            try {
              const email = 'Entrepriseshopia@gmail.com';
              const subject = encodeURIComponent('URGENT - Support Boutique Premium');
              const body = encodeURIComponent(`URGENT\n\nBoutique: ${boutiqueName}\nID: ${boutiqueId}\nStatut: ${boutiqueStatus}\n\nProblème: `);
              await Linking.openURL(`mailto:${email}?subject=${subject}&body=${body}`);
            } catch (error) {
              Alert.alert("Erreur", "Impossible d'ouvrir l'application email");
            }
          }
        },
        { text: "Annuler", style: "cancel" }
      ]
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar backgroundColor={SHOPNET_BLUE} barStyle="light-content" />
        <View style={styles.centerContent}>
          <View style={styles.loadingAnimation}>
            <FontAwesome5 name="crown" size={50} color={PREMIUM_ORANGE} />
            <ActivityIndicator size="large" color={PREMIUM_ORANGE} style={styles.loadingIndicator} />
          </View>
          <Text style={styles.loadingText}>
            Vérification de votre boutique...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar backgroundColor={SHOPNET_BLUE} barStyle="light-content" />
      
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[PREMIUM_ORANGE]}
            tintColor={PREMIUM_ORANGE}
          />
        }
      >
        <View style={styles.header}>
          <View style={styles.titleContainer}>
            <FontAwesome5 name="crown" size={32} color={PREMIUM_ORANGE} style={styles.titleIcon} />
            <Text style={styles.title}>Boutique Premium</Text>
          </View>
          <Text style={styles.subtitle}>
            {hasBoutique 
              ? 'Gérez votre boutique premium' 
              : 'Créez votre boutique premium'
            }
          </Text>
        </View>

        {/* Carte d'état améliorée */}
        <View style={styles.statusCard}>
          <View style={styles.statusCardHeader}>
            <View style={[styles.statusIconContainer, { backgroundColor: getStatusColor() + '20' }]}>
              <FontAwesome5 
                name={hasBoutique ? getStatusIcon() : 'crown'} 
                size={40} 
                color={hasBoutique ? getStatusColor() : "rgba(255, 255, 255, 0.3)"} 
              />
            </View>
            
            <Text style={styles.statusTitle}>
              {hasBoutique ? boutiqueName : 'Aucune boutique premium'}
            </Text>
            
            {hasBoutique && (
              <View style={[styles.statusBadge, { backgroundColor: getStatusColor() + '20' }]}>
                <FontAwesome5 
                  name={getStatusIcon()} 
                  size={14} 
                  color={getStatusColor()} 
                  style={styles.statusIcon}
                />
                <Text style={[styles.statusText, { color: getStatusColor() }]}>
                  {getStatusText()}
                </Text>
              </View>
            )}
          </View>
          
          {hasBoutique && (
            <>
              {joursRestants !== null && boutiqueStatus === 'validé' && (
                <View style={styles.joursRestantsContainer}>
                  <View style={styles.joursRestants}>
                    <Ionicons name="calendar" size={20} color="#4DB14E" />
                    <Text style={styles.joursRestantsText}>
                      {joursRestants > 0 ? `${joursRestants} jours restants` : 'Expire aujourd\'hui'}
                    </Text>
                  </View>
                  <View style={styles.progressBar}>
                    <View 
                      style={[
                        styles.progressFill,
                        { 
                          width: `${Math.min(100, (joursRestants / 30) * 100)}%`,
                          backgroundColor: joursRestants <= 7 ? '#FF6B6B' : '#4DB14E'
                        }
                      ]}
                    />
                  </View>
                </View>
              )}
              
              <Text style={styles.statusDescription}>
                {getStatusDescription()}
              </Text>

              {/* Informations supplémentaires pour pending_validation */}
              {boutiqueStatus === 'pending_validation' && (
                <View style={styles.pendingInfo}>
                  <View style={styles.infoRow}>
                    <Ionicons name="information-circle" size={18} color={PENDING_BLUE} />
                    <Text style={styles.infoText}>
                      Temps de validation : 24h maximum
                    </Text>
                  </View>
                  <View style={styles.infoRow}>
                    <Ionicons name="alert-circle" size={18} color={PENDING_BLUE} />
                    <Text style={styles.infoText}>
                      Vous pouvez modifier votre preuve si nécessaire
                    </Text>
                  </View>
                </View>
              )}

              {/* Informations pour rejeté */}
              {boutiqueStatus === 'rejeté' && (
                <View style={styles.rejectedInfo}>
                  <View style={styles.infoRow}>
                    <Ionicons name="close-circle" size={18} color={REJECTED_RED} />
                    <Text style={styles.rejectedText}>
                      Votre preuve a été rejetée. Veuillez en soumettre une nouvelle.
                    </Text>
                  </View>
                </View>
              )}
            </>
          )}
          
          {!hasBoutique && (
            <View style={styles.noBoutiqueContainer}>
              <Text style={styles.noBoutiqueMessage}>
                Créez une boutique premium pour bénéficier de :
              </Text>
              <View style={styles.featuresList}>
                <View style={styles.featureItem}>
                  <MaterialIcons name="check" size={18} color="#4DB14E" />
                  <Text style={styles.featureText}>Jusqu'à 200 produits</Text>
                </View>
                <View style={styles.featureItem}>
                  <MaterialIcons name="check" size={18} color="#4DB14E" />
                  <Text style={styles.featureText}>Statistiques avancées</Text>
                </View>
                <View style={styles.featureItem}>
                  <MaterialIcons name="check" size={18} color="#4DB14E" />
                  <Text style={styles.featureText}>Outils marketing intégrés</Text>
                </View>
                <View style={styles.featureItem}>
                  <MaterialIcons name="check" size={18} color="#4DB14E" />
                  <Text style={styles.featureText}>Support prioritaire 24/7</Text>
                </View>
              </View>
            </View>
          )}
        </View>

        {/* Boutons d'action principaux */}
        <View style={styles.actionsContainer}>
          {/* Bouton principal selon statut */}
          {hasBoutique ? (
            <TouchableOpacity
              style={[
                styles.actionButton,
                { backgroundColor: getStatusColor() }
              ]}
              onPress={handleMaBoutique}
              activeOpacity={0.8}
            >
              <View style={styles.buttonContent}>
                <FontAwesome5 
                  name={getActionButtonIcon()} 
                  size={22} 
                  color="#fff" 
                />
                <Text style={styles.actionButtonText}>
                  {getActionButtonText()}
                </Text>
              </View>
              <Ionicons name="arrow-forward" size={20} color="#fff" />
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={[styles.createButton, (!token) && styles.buttonDisabled]}
              onPress={handleCreerBoutique}
              disabled={!token}
              activeOpacity={0.8}
            >
              <View style={styles.buttonContent}>
                <FontAwesome5 name="plus-circle" size={22} color="#fff" />
                <View>
                  <Text style={styles.createButtonText}>
                    Créer une boutique premium
                  </Text>
                  <Text style={styles.createButtonSubtext}>
                    9.99 USD / 30 jours
                  </Text>
                </View>
              </View>
              <Ionicons name="arrow-forward" size={20} color="#fff" />
            </TouchableOpacity>
          )}

          {/* Bouton secondaire pour produits (si boutique validée) */}
          {hasBoutique && boutiqueStatus === 'validé' && (
            <TouchableOpacity
              style={[styles.actionButton, styles.secondaryButton]}
              onPress={handleGestionProduits}
              activeOpacity={0.8}
            >
              <View style={styles.buttonContent}>
                <FontAwesome5 name="box-open" size={22} color="#fff" />
                <Text style={styles.actionButtonText}>
                  Gérer mes produits
                </Text>
              </View>
              <Ionicons name="arrow-forward" size={20} color="#fff" />
            </TouchableOpacity>
          )}

          {/* Bouton de rafraîchissement */}
          <TouchableOpacity
            style={styles.refreshButton}
            onPress={onRefresh}
            activeOpacity={0.7}
          >
            <Feather name="refresh-cw" size={18} color={PREMIUM_ORANGE} />
            <Text style={styles.refreshButtonText}>Actualiser</Text>
          </TouchableOpacity>
        </View>

        {/* Section support améliorée */}
        <View style={styles.supportSection}>
          <View style={styles.supportHeader}>
            <Ionicons name="help-circle" size={24} color={PREMIUM_ORANGE} />
            <Text style={styles.supportTitle}>Besoin d'aide ?</Text>
          </View>
          
          <Text style={styles.supportSubtitle}>
            Notre équipe est disponible pour vous aider
          </Text>

          <View style={styles.contactCards}>
            {/* Carte Email */}
            <TouchableOpacity
              style={styles.contactCard}
              onPress={async () => {
                try {
                  const email = 'Entrepriseshopia@gmail.com';
                  const subject = encodeURIComponent('Support Boutique Premium');
                  const body = encodeURIComponent(`Bonjour,\n\nJ'ai besoin d'assistance pour ma boutique premium.\n\nBoutique: ${boutiqueName}\nID: ${boutiqueId}\nStatut: ${boutiqueStatus}\n\nMerci.`);
                  await Linking.openURL(`mailto:${email}?subject=${subject}&body=${body}`);
                } catch (error) {
                  Alert.alert("Erreur", "Impossible d'ouvrir l'application email");
                }
              }}
              activeOpacity={0.7}
            >
              <View style={[styles.contactIcon, { backgroundColor: '#E8F5E9' }]}>
                <MaterialIcons name="email" size={28} color="#4DB14E" />
              </View>
              <View style={styles.contactInfo}>
                <Text style={styles.contactLabel}>Email</Text>
                <Text style={styles.contactValue}>Entrepriseshopia@gmail.com</Text>
                <Text style={styles.contactHint}>Réponse sous 24h</Text>
              </View>
              <Ionicons name="open-outline" size={20} color="rgba(255,255,255,0.5)" />
            </TouchableOpacity>

            {/* Carte WhatsApp */}
            <TouchableOpacity
              style={styles.contactCard}
              onPress={async () => {
                try {
                  const phone = '243896037137';
                  const message = encodeURIComponent('Bonjour, j\'ai besoin d\'assistance pour ma boutique premium.');
                  await Linking.openURL(`https://wa.me/${phone}?text=${message}`);
                } catch (error) {
                  Alert.alert("Erreur", "Impossible d'ouvrir WhatsApp");
                }
              }}
              activeOpacity={0.7}
            >
              <View style={[styles.contactIcon, { backgroundColor: '#E8F5E9' }]}>
                <FontAwesome5 name="whatsapp" size={28} color="#25D366" />
              </View>
              <View style={styles.contactInfo}>
                <Text style={styles.contactLabel}>WhatsApp</Text>
                <Text style={styles.contactValue}>+243 89 603 71 37</Text>
                <Text style={styles.contactHint}>Réponse rapide</Text>
              </View>
              <Ionicons name="open-outline" size={20} color="rgba(255,255,255,0.5)" />
            </TouchableOpacity>
          </View>

          {/* Bouton support urgent */}
          {(boutiqueStatus === 'pending_validation' || boutiqueStatus === 'rejeté') && (
            <TouchableOpacity
              style={styles.urgentSupportButton}
              onPress={handleUrgentSupport}
              activeOpacity={0.7}
            >
              <View style={styles.urgentContent}>
                <Ionicons name="warning" size={20} color="#FF6B6B" />
                <Text style={styles.urgentText}>
                  Support urgent pour problèmes de validation
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#FF6B6B" />
            </TouchableOpacity>
          )}

          {/* Informations générales */}
          <View style={styles.generalInfo}>
            <Text style={styles.infoTitle}>Informations importantes</Text>
            <View style={styles.infoItem}>
              <Ionicons name="time" size={16} color={PREMIUM_ORANGE} />
              <Text style={styles.infoText}>
                Temps de validation : 24h maximum
              </Text>
            </View>
            <View style={styles.infoItem}>
              <Ionicons name="shield-checkmark" size={16} color={PREMIUM_ORANGE} />
              <Text style={styles.infoText}>
                Paiement sécurisé et garantie de remboursement
              </Text>
            </View>
            <View style={styles.infoItem}>
              <Ionicons name="document-text" size={16} color={PREMIUM_ORANGE} />
              <Text style={styles.infoText}>
                Assurez-vous que votre preuve de paiement est lisible
              </Text>
            </View>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: SHOPNET_BLUE,
  },
  scrollContent: {
    flexGrow: 1,
    padding: 20,
    paddingBottom: 40,
  },
  centerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingAnimation: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingIndicator: {
    position: 'absolute',
  },
  loadingText: {
    marginTop: 20,
    color: '#fff',
    fontSize: 16,
    fontWeight: '500',
  },
  header: {
    alignItems: 'center',
    marginBottom: 30,
    marginTop: 10,
  },
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  titleIcon: {
    marginRight: 12,
  },
  title: {
    fontSize: 32,
    fontWeight: '800',
    color: '#fff',
  },
  subtitle: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.8)',
    textAlign: 'center',
  },
  statusCard: {
    backgroundColor: 'rgba(30, 42, 59, 0.95)',
    padding: 25,
    borderRadius: 20,
    alignItems: 'center',
    marginBottom: 25,
    width: '100%',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  statusCardHeader: {
    alignItems: 'center',
    width: '100%',
  },
  statusIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  statusTitle: {
    color: '#fff',
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 12,
    textAlign: 'center',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginBottom: 16,
  },
  statusIcon: {
    marginRight: 6,
  },
  statusText: {
    fontSize: 14,
    fontWeight: '700',
  },
  joursRestantsContainer: {
    width: '100%',
    marginBottom: 16,
  },
  joursRestants: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  joursRestantsText: {
    color: '#4DB14E',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 8,
  },
  progressBar: {
    height: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
  },
  statusDescription: {
    color: 'rgba(255, 255, 255, 0.9)',
    fontSize: 15,
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 22,
    fontWeight: '500',
  },
  pendingInfo: {
    backgroundColor: 'rgba(66, 165, 245, 0.1)',
    padding: 12,
    borderRadius: 12,
    marginTop: 16,
    width: '100%',
  },
  rejectedInfo: {
    backgroundColor: 'rgba(255, 107, 107, 0.1)',
    padding: 12,
    borderRadius: 12,
    marginTop: 16,
    width: '100%',
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 6,
  },
  infoText: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 13,
    marginLeft: 8,
    flex: 1,
    lineHeight: 18,
  },
  rejectedText: {
    color: '#FF6B6B',
    fontSize: 13,
    marginLeft: 8,
    flex: 1,
    lineHeight: 18,
    fontWeight: '500',
  },
  noBoutiqueContainer: {
    width: '100%',
  },
  noBoutiqueMessage: {
    color: 'rgba(255, 255, 255, 0.9)',
    fontSize: 16,
    textAlign: 'center',
    marginTop: 15,
    marginBottom: 20,
    fontWeight: '500',
  },
  featuresList: {
    width: '100%',
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    paddingHorizontal: 10,
  },
  featureText: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 14,
    marginLeft: 10,
  },
  actionsContainer: {
    width: '100%',
    marginBottom: 25,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 18,
    paddingHorizontal: 24,
    borderRadius: 16,
    marginBottom: 12,
    width: '100%',
  },
  secondaryButton: {
    backgroundColor: '#2C3E50',
  },
  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '700',
    marginLeft: 12,
    flex: 1,
  },
  createButton: {
    backgroundColor: PREMIUM_ORANGE,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 20,
    paddingHorizontal: 24,
    borderRadius: 16,
    marginBottom: 12,
    width: '100%',
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  createButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
    marginLeft: 12,
  },
  createButtonSubtext: {
    color: 'rgba(255, 255, 255, 0.9)',
    fontSize: 14,
    marginLeft: 12,
    marginTop: 2,
  },
  refreshButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 12,
    marginTop: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  refreshButtonText: {
    color: PREMIUM_ORANGE,
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 8,
  },
  supportSection: {
    backgroundColor: 'rgba(30, 42, 59, 0.95)',
    padding: 20,
    borderRadius: 20,
    width: '100%',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  supportHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  supportTitle: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '700',
    marginLeft: 10,
  },
  supportSubtitle: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 14,
    marginBottom: 20,
  },
  contactCards: {
    marginBottom: 20,
  },
  contactCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(42, 58, 82, 0.8)',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
  },
  contactIcon: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  contactInfo: {
    flex: 1,
  },
  contactLabel: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 2,
  },
  contactValue: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 2,
  },
  contactHint: {
    color: 'rgba(255, 255, 255, 0.5)',
    fontSize: 11,
  },
  urgentSupportButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(255, 107, 107, 0.1)',
    padding: 16,
    borderRadius: 12,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 107, 107, 0.3)',
  },
  urgentContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  urgentText: {
    color: '#FF6B6B',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 10,
    flex: 1,
  },
  generalInfo: {
    marginTop: 10,
  },
  infoTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  infoText: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 13,
    marginLeft: 10,
    flex: 1,
    lineHeight: 18,
  },
});

export default BoutiqueScreen;