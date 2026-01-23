

import React, { useEffect, useState, useRef, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Animated,
  ActivityIndicator,
  SafeAreaView,
  StatusBar,
} from 'react-native';
import { Audio } from 'expo-av';
import io from 'socket.io-client';
import { Ionicons } from '@expo/vector-icons';
import { getCurrentUser, getValidToken, authApi } from '../authService';
import { router } from 'expo-router';

// 🔹 Serveur Render en production
const API_URL = 'https://shopnet-backend.onrender.com';
const SOCKET_URL = API_URL;

interface Commande {
  id: number;
  commandeId?: number;
  numero_commande: string;
  message: string;
  produit_id: number;
  date: string;
  date_commande: string;
  statut?: string;
  client_id?: number;
}

export default function VendeurNotificationsScreen() {
  const [commandes, setCommandes] = useState<Commande[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [badgeCount, setBadgeCount] = useState(0);
  const [vendeurId, setVendeurId] = useState<number | null>(null);
  const [notificationVisible, setNotificationVisible] = useState(false);
  const [notificationMessage, setNotificationMessage] = useState('');

  const notificationAnim = useRef(new Animated.Value(-100)).current;
  const soundObject = useRef<Audio.Sound | null>(null);
  const socketRef = useRef<any>(null);
  const notificationTimeout = useRef<NodeJS.Timeout | null>(null);

  // Charger le son
  useEffect(() => {
    const loadSound = async () => {
      try {
        const { sound } = await Audio.Sound.createAsync(
          require('../../../../assets/sounds/success-sound.mp3')
        );
        soundObject.current = sound;
      } catch (error) {
        console.error('Erreur chargement son:', error);
      }
    };
    loadSound();

    return () => {
      if (soundObject.current) {
        soundObject.current.unloadAsync();
      }
      if (notificationTimeout.current) {
        clearTimeout(notificationTimeout.current);
      }
    };
  }, []);

  // Charger le vendeur et les commandes
  const loadVendeur = useCallback(async () => {
    try {
      const user = await getCurrentUser();
      if (user?.id) {
        setVendeurId(user.id);
        await fetchCommandes();
        await setupSocket(user.id);
      } else {
        Alert.alert('Erreur', 'Impossible de récupérer les infos vendeur.');
        setLoading(false);
      }
    } catch (error) {
      console.error('Erreur chargement vendeur:', error);
      Alert.alert('Erreur', 'Impossible de charger les informations.');
      setLoading(false);
    }
  }, []);

  // Récupérer les commandes depuis l'API (même endpoint que votre version)
  const fetchCommandes = async () => {
    setLoading(true);
    try {
      const token = await getValidToken();
      if (!token) {
        Alert.alert('Erreur', 'Token d\'authentification manquant.');
        setLoading(false);
        return;
      }

      const { data } = await authApi.get(`/commandes?role=vendeur`);
      if (data.success && Array.isArray(data.commandes)) {
        const commandesData = data.commandes as Commande[];
        setCommandes(commandesData);
        // Calculer le badge basé sur les nouvelles commandes
        const nouvellesCommandes = commandesData.filter(
          (cmd: Commande) => cmd.statut === 'nouvelle' || !cmd.statut
        ).length;
        setBadgeCount(nouvellesCommandes);
      } else {
        setCommandes([]);
      }
    } catch (err: any) {
      console.error('Erreur fetchCommandes:', err);
      // Si l'erreur est 404, on essaie un endpoint alternatif (au cas où)
      if (err.response?.status === 404) {
        try {
          const token = await getValidToken();
          const { data } = await authApi.get(`/commandes?vendeurId=${vendeurId}`);
          if (data.success && Array.isArray(data.commandes)) {
            setCommandes(data.commandes);
          }
        } catch (fallbackErr) {
          console.error('Fallback error:', fallbackErr);
        }
      } else {
        Alert.alert('Erreur', 'Échec de chargement des commandes.');
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Configurer WebSocket pour les nouvelles commandes en temps réel
  const setupSocket = async (uid: number) => {
    try {
      const token = await getValidToken();
      if (!token) return;

      socketRef.current = io(SOCKET_URL, {
        transports: ['websocket'],
        reconnection: true,
        auth: { token: `Bearer ${token}` },
      });

      socketRef.current.on('connect', () => {
        console.log('✅ Socket connecté');
        socketRef.current.emit('registerVendor', uid);
      });

      socketRef.current.on('newOrder', (payload: Commande) => {
        if (payload) {
          const nouvelleCommande: Commande = {
            ...payload,
            id: payload.commandeId || Date.now(),
            date: new Date().toISOString(),
            statut: 'nouvelle',
          };
          setCommandes((prev) => [nouvelleCommande, ...prev]);
          setBadgeCount((prev) => prev + 1);
          playSound();
          showNotification(payload.message || 'Nouvelle commande reçue !');
        }
      });

      socketRef.current.on('disconnect', () => {
        console.log('🚫 Socket déconnecté');
      });

      socketRef.current.on('error', (error: any) => {
        console.error('Socket error:', error);
      });
    } catch (error) {
      console.error('Erreur setupSocket:', error);
    }
  };

  // Jouer le son de notification
  const playSound = async () => {
    try {
      if (soundObject.current) {
        await soundObject.current.replayAsync();
      }
    } catch (error) {
      console.error('Erreur playSound:', error);
    }
  };

  // Afficher la notification temporaire
  const showNotification = useCallback((message: string) => {
    if (notificationTimeout.current) {
      clearTimeout(notificationTimeout.current);
    }
    setNotificationMessage(message);
    setNotificationVisible(true);
    Animated.sequence([
      Animated.timing(notificationAnim, {
        toValue: 40,
        duration: 500,
        useNativeDriver: true,
      }),
      Animated.delay(3000),
      Animated.timing(notificationAnim, {
        toValue: -100,
        duration: 500,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setNotificationVisible(false);
    });
  }, []);

  // Ouvrir le détail d'une commande
  const openCommandeDetail = useCallback((commandeId: number) => {
    if (badgeCount > 0) {
      setBadgeCount(0);
    }
    router.push({
      pathname: '/(tabs)/Auth/Panier/id',
      params: { id: commandeId.toString() },
    });
  }, [badgeCount]);

  // Refresh manuel
  const handleRefresh = useCallback(async () => {
    if (!refreshing) {
      setRefreshing(true);
      await fetchCommandes();
    }
  }, [refreshing]);

  // Effet initial
  useEffect(() => {
    loadVendeur();
    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
    };
  }, [loadVendeur]);

  // Écran de chargement
  if (loading && commandes.length === 0) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <StatusBar barStyle="light-content" backgroundColor="#00182A" />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#4CB050" />
          <Text style={styles.loadingText}>Chargement des commandes...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor="#00182A" />

      {/* Bannière de notification animée */}
      {notificationVisible && (
        <Animated.View
          style={[styles.notificationBanner, { transform: [{ translateY: notificationAnim }] }]}
        >
          <Ionicons name="notifications" size={24} color="#fff" />
          <Text style={styles.notificationText}>{notificationMessage}</Text>
        </Animated.View>
      )}

      {/* En-tête */}
      <View style={styles.header}>
        <Text style={styles.headerText}>Commandes</Text>
        {badgeCount > 0 && (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{badgeCount > 99 ? '99+' : badgeCount}</Text>
          </View>
        )}
      </View>

      {/* Liste des commandes */}
      <FlatList
        data={commandes}
        keyExtractor={(item, index) =>
          `${item.id}-${item.commandeId || ''}-${index}`
        }
        renderItem={({ item }) => {
          const commandeId = item.commandeId || item.id;
          const numeroCommande = item.numero_commande || `CMD-${commandeId}`;
          const messageText = item.message || `Produit commandé: ${item.produit_id || 'N/A'}`;
          const dateText = item.date || item.date_commande;
          const formattedDate = dateText
            ? new Date(dateText).toLocaleString('fr-FR', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              })
            : null;

          return (
            <TouchableOpacity
              style={styles.card}
              onPress={() => openCommandeDetail(commandeId)}
            >
              <View style={styles.cardContent}>
                <View style={styles.cardHeader}>
                  <Text style={styles.cardTitle}>📦 Commande #{numeroCommande}</Text>
                  <Ionicons name="chevron-forward" size={20} color="#ccc" />
                </View>
                <Text style={styles.cardMessage}>{messageText}</Text>
                {formattedDate && <Text style={styles.cardDate}>{formattedDate}</Text>}
              </View>
            </TouchableOpacity>
          );
        }}
        contentContainerStyle={[
          styles.listContent,
          commandes.length === 0 && styles.emptyListContent,
        ]}
        showsVerticalScrollIndicator={false}
        refreshing={refreshing}
        onRefresh={handleRefresh}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <View style={styles.emptyIconContainer}>
              <Ionicons name="cart-outline" size={64} color="#4CB050" />
            </View>
            <Text style={styles.emptyTitle}>Aucune commande</Text>
            <Text style={styles.emptyMessage}>
              Vous n'avez pas encore reçu de commande
            </Text>
            <TouchableOpacity
              style={styles.refreshButton}
              onPress={handleRefresh}
              disabled={refreshing}
            >
              {refreshing ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Text style={styles.refreshButtonText}>Actualiser</Text>
              )}
            </TouchableOpacity>
          </View>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#00182A',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    color: '#4CB050',
    fontSize: 16,
    marginTop: 16,
    fontWeight: '500',
  },
  notificationBanner: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    backgroundColor: '#4CB050',
    padding: 15,
    flexDirection: 'row',
    alignItems: 'center',
    zIndex: 1,
  },
  notificationText: {
    color: '#fff',
    marginLeft: 10,
    fontWeight: '600',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 20,
    paddingHorizontal: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#0A2235',
  },
  headerText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
  },
  badge: {
    backgroundColor: 'red',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
    minWidth: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 12,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 20,
  },
  emptyListContent: {
    flex: 1,
  },
  card: {
    backgroundColor: '#0A2235',
    borderRadius: 8,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#4CB05033',
    overflow: 'hidden',
  },
  cardContent: {
    padding: 16,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  cardTitle: {
    fontWeight: 'bold',
    fontSize: 16,
    color: '#fff',
  },
  cardMessage: {
    color: '#A9B6C5',
    fontSize: 14,
    marginBottom: 8,
  },
  cardDate: {
    color: '#7A8C99',
    fontSize: 12,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 80,
    paddingHorizontal: 20,
  },
  emptyIconContainer: {
    marginBottom: 24,
  },
  emptyTitle: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 8,
    textAlign: 'center',
  },
  emptyMessage: {
    color: '#A9B6C5',
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
  },
  refreshButton: {
    backgroundColor: '#4CB050',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    minWidth: 120,
    alignItems: 'center',
  },
  refreshButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});