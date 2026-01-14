

// app/services/notifications.ts
// app/services/notifications.ts
// app/services/notifications.ts

import * as Notifications from 'expo-notifications';
import { Platform, Alert } from 'react-native';
import Constants from 'expo-constants';
import { router } from 'expo-router';
import axios from 'axios';

// URL backend pour sauvegarder le token
const SAVE_EXPO_TOKEN_URL = 'https://shopnet-backend.onrender.com/api/save-expo-token';

// 🔔 Configuration globale d’affichage des notifications
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

/**
 * ✅ Génère le token Expo et l'envoie au backend si userId fourni
 * @param userId Id de l'utilisateur pour lier le token sur le backend
 */
export async function registerForPushNotificationsAsync(userId?: string): Promise<string | undefined> {
  try {
    // 👉 Android : channel obligatoire
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'default',
        importance: Notifications.AndroidImportance.MAX,
      });
    }

    // 👉 Permissions
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      Alert.alert(
        'Notifications désactivées',
        'Vous devez autoriser les notifications pour recevoir les alertes.'
      );
      return;
    }

    // 🚨 Récupération du token Expo
    const tokenResponse = await Notifications.getExpoPushTokenAsync({
      projectId:
        Constants.expoConfig?.extra?.eas?.projectId ||
        Constants.easConfig?.projectId,
    });

    const expoPushToken = tokenResponse.data;

    console.log('✅ Expo Push Token (APK/AAB):', expoPushToken);

    // 🔥 Envoi du token au backend si userId fourni
    if (userId && expoPushToken) {
      try {
        await axios.post(SAVE_EXPO_TOKEN_URL, {
          userId,
          expoPushToken,
        });
        console.log('✅ Token envoyé au backend pour userId:', userId);
      } catch (err) {
        console.error('❌ Erreur envoi token au backend:', err);
      }
    }

    return expoPushToken;
  } catch (error) {
    console.error('❌ Erreur génération Expo Push Token:', error);
  }
}

// 👂 Écoute des notifications (optionnel)
export function listenNotifications() {
  Notifications.addNotificationReceivedListener(notification => {
    console.log('📩 Notification reçue (foreground):', notification);
  });

  Notifications.addNotificationResponseReceivedListener(response => {
    console.log('👉 Notification cliquée:', response);

    const data = response.notification.request.content.data;

    if (data?.type === 'product' && data.productId) {
      router.push(`/Auth/Produits/Detail?id=${data.productId}`);
    }
  });
}
