




import React, { useEffect, useState, useRef } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, Alert, Animated, ActivityIndicator } from 'react-native';
import { Audio } from 'expo-av';
import io from 'socket.io-client';
import { Ionicons } from '@expo/vector-icons';
import { getCurrentUser, getValidToken, authApi } from '../authService'; // adapte ton chemin si besoin
import { router } from 'expo-router';

const API_URL = 'https://shopnet-backend.onrender.com';
const SOCKET_URL = API_URL;


export default function VendeurNotificationsScreen() {
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [badge, setBadge] = useState(0);
  const [vendeurId, setVendeurId] = useState<number | null>(null);

  const notificationAnim = useRef(new Animated.Value(-100)).current;
  const soundObject = useRef<Audio.Sound | null>(null);
  const socketRef = useRef<any>(null);

  useEffect(() => {
    const loadSound = async () => {
      const { sound } = await Audio.Sound.createAsync(
        require('../../../../assets/sounds/success-sound.mp3') // place bien le fichier ici
      );
      soundObject.current = sound;
    };
    loadSound();

    return () => {
      if (soundObject.current) soundObject.current.unloadAsync();
    };
  }, []);

  const loadVendeur = async () => {
    const user = await getCurrentUser();
    if (user?.id) {
      setVendeurId(user.id);
      fetchNotifications(user.id);
      setupSocket(user.id);
    } else {
      Alert.alert('Erreur', 'Impossible de récupérer les infos vendeur.');
    }
  };

  const fetchNotifications = async (uid: number) => {
    setLoading(true);
    try {
      const token = await getValidToken();
      const { data } = await authApi.get(`/commandes?role=vendeur`);
      if (data.success) {
        setNotifications(data.commandes);
      }
    } catch (err) {
      console.error(err);
      Alert.alert('Erreur', 'Échec de chargement des commandes.');
    } finally {
      setLoading(false);
    }
  };

  const setupSocket = (uid: number) => {
    socketRef.current = io(SOCKET_URL, {
      transports: ['websocket'],
      reconnection: true,
      auth: { token: `Bearer ${getValidToken()}` },
    });

    socketRef.current.on('connect', () => {
      console.log('✅ Socket connecté');
      socketRef.current.emit('registerVendor', uid);
    });

    socketRef.current.on('newOrder', (payload: any) => {
      setNotifications((prev) => [payload, ...prev]);
      setBadge((b) => b + 1);
      playSound();
      showNotification(payload.message);
    });

    socketRef.current.on('disconnect', () => {
      console.log('🚫 Socket déconnecté');
    });
  };

  const playSound = () => {
    if (soundObject.current) soundObject.current.replayAsync();
  };

  const showNotification = (message: string) => {
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
    ]).start();
  };

  const openCommandeDetail = (commandeId: number) => {
    router.push({
      pathname: '/(tabs)/Auth/Panier/id',
      params: { id: commandeId.toString() },
    });
  };

  useEffect(() => {
    loadVendeur();
    return () => {
      socketRef.current?.disconnect();
    };
  }, []);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#4CB050" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* notification en haut */}
      <Animated.View
        style={[styles.notificationBanner, { transform: [{ translateY: notificationAnim }] }]}
      >
        <Ionicons name="notifications" size={24} color="#fff" />
        <Text style={styles.notificationText}>Nouvelle commande reçue !</Text>
      </Animated.View>

      {/* en-tête */}
      <View style={styles.header}>
        <Text style={styles.headerText}>Commandes</Text>
        {badge > 0 && (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{badge}</Text>
          </View>
        )}
      </View>

      <FlatList
        data={notifications}
        keyExtractor={(item, index) => (item.commandeId?.toString() || item.id?.toString() || index.toString())}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.card}
            onPress={() => openCommandeDetail(item.commandeId || item.id)}
          >
            <View>
              {/* Affichage numéro de commande vendeur */}
              <Text style={styles.title}>📦 Commande #{item.numero_commande || item.commandeId || item.id}</Text>
              <Text style={styles.subtitle}>{item.message || `Produit commandez: ${item.produit_id}`}</Text>
              <Text style={styles.date}>
                {item.date
                  ? new Date(item.date).toLocaleString()
                  : item.date_commande
                  ? new Date(item.date_commande).toLocaleString()
                  : ''}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#ccc" />
          </TouchableOpacity>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#00182A',
    paddingTop: 50,
    paddingHorizontal: 10,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#00182A',
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
    marginBottom: 10,
  },
  headerText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
  },
  badge: {
    backgroundColor: 'red',
    borderRadius: 12,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  badgeText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  card: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: '#0A2235',
    padding: 15,
    borderRadius: 8,
    marginBottom: 10,
    borderColor: '#4CB05033',
    borderWidth: 1,
  },
  title: {
    fontWeight: 'bold',
    fontSize: 16,
    color: '#fff',
  },
  subtitle: {
    color: '#A9B6C5',
  },
  date: {
    color: '#7A8C99',
    fontSize: 12,
    marginTop: 4,
  },
});
