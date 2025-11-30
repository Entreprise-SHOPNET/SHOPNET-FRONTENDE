

import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, Platform, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { getToken } from './(tabs)/Auth/authService';
import jwt_decode from 'jwt-decode';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';

// ✅ Structure du token JWT
interface DecodedToken {
  id: number;
  iat?: number;
  exp?: number;
}

// 🔔 Configuration du comportement des notifications
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export default function Index() {
  const router = useRouter();
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Animation du logo
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 1500,
      useNativeDriver: true,
    }).start();

    // Redirection après 2.5 secondes selon présence du token utilisateur
    const timer = setTimeout(async () => {
      const token = await getToken();
      if (token) router.replace('/Auth/Produits/Fil');
      else router.replace('/splash');
    }, 2500);

    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    (async () => {
      const expoToken = await registerForPushNotificationsAsync();
      console.log('Expo Push Token:', expoToken);

      if (expoToken) {
        try {
          const token = await getToken();
          if (token) {
            const decoded: DecodedToken = jwt_decode(token);
            const userId = decoded.id;

            // ✅ Envoi automatique du token Expo au serveur
            await fetch("http://100.64.134.89:5000/api/save-expo-token", {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ userId, expoPushToken: expoToken }),
            });

            console.log('✅ Token Expo enregistré sur le serveur');
          }
        } catch (err) {
          console.error('❌ Erreur en envoyant le token au serveur:', err);
        }
      }

      // Écoute notifications reçues
      const subscriptionReceived = Notifications.addNotificationReceivedListener(notification => {
        console.log('🔔 Notification reçue:', notification);
      });

      // Écoute réponse de l’utilisateur (clic sur notification)
      const subscriptionResponse = Notifications.addNotificationResponseReceivedListener(response => {
        console.log('📱 Réponse à la notification:', response);

        const data = response.notification.request.content.data;

        if (data?.type === 'commande' && data?.commandeId) {
          router.push(`/(tabs)/Auth/Panier/id`);
        }
      });

      // Vérifier si l’app était fermée et une notification a été cliquée
      const checkInitialNotification = async () => {
        const response = await Notifications.getLastNotificationResponseAsync();
        if (response) {
          const data = response.notification.request.content.data;
          if (data?.type === 'commande' && data?.commandeId) {
            router.push(`/(tabs)/Auth/Panier/id`);
          }
        }
      };
      checkInitialNotification();

      return () => {
        subscriptionReceived.remove();
        subscriptionResponse.remove();
      };
    })();
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

// 🧩 Fonction pour obtenir le token Expo et gérer les permissions
async function registerForPushNotificationsAsync() {
  let token;

  if (Device.isDevice) {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      Alert.alert('🚫 Permission refusée', 'Impossible de recevoir des notifications.');
      return;
    }

    token = (
      await Notifications.getExpoPushTokenAsync({
        projectId: Constants.expoConfig?.extra?.eas?.projectId || Constants.easConfig?.projectId,
      })
    ).data;
  } else {
    Alert.alert('⚠️ Notifications non supportées sur l’émulateur.');
  }

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#FF231F7C',
      sound: 'default',
    });
  }

  return token;
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
