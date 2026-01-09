




import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, Platform, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { getToken } from './(tabs)/Auth/authService';
import { jwtDecode } from 'jwt-decode'; // ✅ CORRECTION ICI
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

  // 🎬 Animation + redirection
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

  // 🔔 Notifications + enregistrement token Expo
  useEffect(() => {
    (async () => {
      const expoToken = await registerForPushNotificationsAsync();
      console.log('📨 Expo Push Token:', expoToken);

      if (expoToken) {
        try {
          const token = await getToken();

          if (token) {
            // ✅ CORRECTION jwt-decode
            const decoded = jwtDecode<DecodedToken>(token);
            const userId = decoded.id;

            if (!userId) {
              console.warn('⚠️ userId introuvable dans le JWT');
              return;
            }

            await fetch(
              'https://shopnet-backend.onrender.com/api/save-expo-token',
              {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  userId,
                  expoPushToken: expoToken,
                }),
              }
            );

            console.log('✅ Token Expo enregistré sur le serveur');
          }
        } catch (err) {
          console.error(
            '❌ Erreur en envoyant le token au serveur:',
            err
          );
        }
      }

      // 🔔 Notification reçue
      const subscriptionReceived =
        Notifications.addNotificationReceivedListener(notification => {
          console.log('🔔 Notification reçue:', notification);
        });

      // 📱 Clic sur notification
      const subscriptionResponse =
        Notifications.addNotificationResponseReceivedListener(response => {
          console.log('📱 Réponse notification:', response);

          const data = response.notification.request.content.data;

          if (data?.type === 'commande' && data?.commandeId) {
            router.push(`/(tabs)/Auth/Panier/id`);
          }
        });

      // 📦 Notification cliquée app fermée
      const checkInitialNotification = async () => {
        const response =
          await Notifications.getLastNotificationResponseAsync();

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
      <Animated.View
        style={[styles.logoContainer, { opacity: fadeAnim }]}
      >
        <Text style={styles.logo}>S</Text>
      </Animated.View>
      <Text style={styles.title}>SHOPNET</Text>
    </View>
  );
}

// 🔧 Enregistrement notifications
async function registerForPushNotificationsAsync() {
  let token: string | undefined;

  if (Device.isDevice) {
    const { status: existingStatus } =
      await Notifications.getPermissionsAsync();

    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } =
        await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      Alert.alert(
        '🚫 Permission refusée',
        'Impossible de recevoir des notifications.'
      );
      return;
    }

    token = (
      await Notifications.getExpoPushTokenAsync({
        projectId:
          Constants.expoConfig?.extra?.eas?.projectId ||
          Constants.easConfig?.projectId,
      })
    ).data;
  } else {
    Alert.alert(
      '⚠️ Appareil non supporté',
      'Les notifications ne fonctionnent pas sur un émulateur.'
    );
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