

import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { useRouter } from 'expo-router';
import { getToken } from './(tabs)/Auth/authService';
import { registerForPushNotificationsAsync, listenNotifications } from '../services/notifications';

export default function Index() {
  const router = useRouter();
  const fadeAnim = useRef(new Animated.Value(0)).current;

  // 🎬 Animation splash
  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 1500,
      useNativeDriver: true,
    }).start();

    const timer = setTimeout(async () => {
      const token = await getToken();
      if (token) router.replace('/Auth/Produits/Fil');
      else router.replace('/splash');
    }, 2500);

    return () => clearTimeout(timer);
  }, []);

  // 🔔 Notifications
  useEffect(() => {
    const setupNotifications = async () => {
      const userId = await getToken(); // ou user.id selon ton backend
      if (userId) {
        console.log('⚡️ Demande permission notifications pour userId:', userId);
        await registerForPushNotificationsAsync(userId);
      }
    };

    setupNotifications();

    // Écoute notifications reçues et cliquées
    const unsubscribe = listenNotifications(
      (notification) => console.log('🔔 Notification reçue:', notification),
      (response) => {
        console.log('📱 Notification cliquée:', response);
        const data = response.notification.request.content.data;
        if (data?.type === 'commande' && data?.commandeId) {
          router.push(`/(tabs)/Auth/Panier/id`);
        }
      }
    );

    return unsubscribe; // nettoyage
  }, []);

  return (
    <View style={styles.container}>
      <Animated.View style={[styles.logoContainer, { opacity: fadeAnim }]}>
        <Text style={styles.logo}>S</Text>
      </Animated.View>
      <Text style={styles.title}>SHOPNET</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#324A62',
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoContainer: {
    backgroundColor: '#FFF',
    width: 100,
    height: 100,
    borderRadius: 50,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  logo: {
    fontSize: 40,
    fontWeight: 'bold',
    color: '#324A62',
  },
  title: {
    fontSize: 24,
    color: '#FFF',
    fontWeight: 'bold',
  },
});
