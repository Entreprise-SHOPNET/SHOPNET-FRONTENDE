

// app/services/notifications.ts
// app/services/notifications.ts

import * as Notifications from 'expo-notifications';
import { Platform, Alert } from 'react-native';
import Constants from 'expo-constants';
import { router } from 'expo-router';

// 🔔 Configuration globale d’affichage des notifications
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

// ✅ Génération DU token Expo (fonctionne Expo Go + APK + AAB)
export async function registerForPushNotificationsAsync(): Promise<string | undefined> {
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

    // 🚨 LIGNE CRITIQUE (CAUSE DU PROBLÈME AVANT)
    const tokenResponse = await Notifications.getExpoPushTokenAsync({
      projectId:
        Constants.expoConfig?.extra?.eas?.projectId ||
        Constants.easConfig?.projectId,
    });

    const expoPushToken = tokenResponse.data;

    console.log('✅ Expo Push Token (APK/AAB):', expoPushToken);

    return expoPushToken;
  } catch (error) {
    console.error('❌ Erreur génération Expo Push Token:', error);
  }
}

// 👂 Écoute des notifications (optionnel mais propre)
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
