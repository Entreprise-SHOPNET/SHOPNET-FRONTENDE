

// app/services/notifications.ts
// app/services/notifications.ts
// app/services/notifications.ts

import * as Notifications from 'expo-notifications';
import { Platform, Alert } from 'react-native';
import { router } from 'expo-router';
import axios from 'axios';

// 🔥 PROJECT ID FORCÉ (OBLIGATOIRE POUR APK / AAB)
const EXPO_PROJECT_ID = 'f0e964ca-ce24-40ca-ada6-666e86e898f6';

// 🌐 URL backend pour sauvegarder le token
const SAVE_EXPO_TOKEN_URL =
  'https://shopnet-backend.onrender.com/api/save-expo-token';

// 🔔 Configuration globale des notifications (APK + foreground)
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

/**
 * ✅ Génère le token Expo (APK/AAB/Expo Go)
 * ✅ Force le projectId
 * ✅ Envoie automatiquement le token au backend
 */
export async function registerForPushNotificationsAsync(
  userId?: string
): Promise<string | undefined> {
  try {
    // 👉 ANDROID : channel OBLIGATOIRE en build
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'default',
        importance: Notifications.AndroidImportance.MAX,
        sound: 'default',
      });
    }

    // 👉 Permissions notifications
    const { status: existingStatus } =
      await Notifications.getPermissionsAsync();

    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      Alert.alert(
        'Notifications désactivées',
        'Autorisez les notifications pour recevoir les alertes SHOPNET.'
      );
      return;
    }

    // 🔥🔥🔥 TOKEN EXPO FORCÉ (LA CLÉ DU PROBLÈME)
    const { data: expoPushToken } =
      await Notifications.getExpoPushTokenAsync({
        projectId: EXPO_PROJECT_ID,
      });

    if (!expoPushToken) {
      console.warn('⚠️ Token Expo NON généré');
      return;
    }

    console.log('✅ Expo Push Token (APK OK):', expoPushToken);

    // 🚀 Envoi vers le backend
    if (userId) {
      await axios.post(SAVE_EXPO_TOKEN_URL, {
        userId,
        expoPushToken,
      });

      console.log('✅ Token envoyé au backend pour userId:', userId);
    } else {
      console.warn('⚠️ userId manquant — token non envoyé');
    }

    return expoPushToken;
  } catch (error) {
    console.error(
      '❌ ERREUR CRITIQUE notifications / token Expo:',
      error
    );
  }
}

// 👂 Écoute notifications (foreground + clic)
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
