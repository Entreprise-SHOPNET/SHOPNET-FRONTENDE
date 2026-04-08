

import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { useRouter } from 'expo-router';
import { getToken } from './(tabs)/Auth/authService';
import {
  registerForPushNotificationsAsync,
  listenNotifications
} from '../services/notifications';

export default function Index() {
  const router = useRouter();
  const fadeAnim = useRef(new Animated.Value(0)).current;

  // 🎬 SPLASH ANIMATION
  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 1500,
      useNativeDriver: true,
    }).start();

    const timer = setTimeout(async () => {
      const token = await getToken();

      if (token) {
        router.replace('/Auth/Produits/Fil');
      } else {
        router.replace('/splash');
      }
    }, 2500);

    return () => clearTimeout(timer);
  }, []);

  // 🔔 NOTIFICATIONS SYSTEM
  useEffect(() => {
    const setupNotifications = async () => {
      const userId = await getToken();

      if (userId) {
        console.log('⚡️ Activation notifications pour userId:', userId);
        await registerForPushNotificationsAsync(userId);
      }
    };

    setupNotifications();

    const unsubscribe = listenNotifications(
      (notification) => {
        console.log('🔔 Notification reçue:', notification);
      },

      (response) => {
        console.log('📱 Notification cliquée:', response);

        const data =
          response?.notification?.request?.content?.data;

        if (!data) {
          router.push('/(tabs)/Auth/Produits/Fil');
          return;
        }

        // 🛒 COMMANDE
        if (data.type === 'commande' && data.commandeId) {
          router.push({
            pathname: '/(tabs)/Auth/Panier/DetailId',
            params: {
              id: data.commandeId,
            },
          });
          return;
        }

        // 📦 PRODUIT (likes, boost, promo, IA)
        if (data.type === 'product' && data.productId) {
          router.push({
            pathname: '/(tabs)/Auth/Produits/DetailId',
            params: {
              id: data.productId,
            },
          });
          return;
        }

        // 💬 COMMENTAIRE
        if (data.type === 'comment' && data.productId) {
          router.push({
            pathname: '/(tabs)/Auth/Produits/DetailId',
            params: {
              id: data.productId,
              openComments: 'true',
            },
          });
          return;
        }

        // 🔥 PROMO / IA MARKETING
        if (data.type === 'promo') {
          router.push('/(tabs)/Auth/Produits/Fil');
          return;
        }

        // 🧠 FALLBACK (sécurité)
        router.push('/(tabs)/Auth/Produits/Fil');
      }
    );

    return unsubscribe;
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
