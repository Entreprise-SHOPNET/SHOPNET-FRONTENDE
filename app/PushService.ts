

// app/PushService.ts
// app/PushService.ts
import * as Notifications from 'expo-notifications';
import { Platform, Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { router } from 'expo-router';

const EXPO_PROJECT_ID = 'f0e964ca-ce24-40ca-ada6-666e86e898f6';
const SAVE_EXPO_TOKEN_URL =
  'https://shopnet-backend.onrender.com/api/save-expo-token';

export class PushService {
  static async register() {
    try {
      // Récupération du user depuis AsyncStorage
      const userStr = await AsyncStorage.getItem('user');
      if (!userStr) return;

      const user = JSON.parse(userStr);
      if (!user?.id) return;

      // Permissions notifications
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
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

      // Création du channel Android obligatoire en build APK/AAB
      if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('default', {
          name: 'default',
          importance: Notifications.AndroidImportance.MAX,
          sound: 'default',
        });
      }

      // Récupération du token Expo avec projectId forcé
      const tokenObj = await Notifications.getExpoPushTokenAsync({
        projectId: EXPO_PROJECT_ID,
      });

      const expoPushToken = tokenObj.data;
      if (!expoPushToken) {
        console.warn('⚠️ Token Expo NON généré');
        return;
      }

      console.log('✅ Expo Push Token généré:', expoPushToken);

      // Sauvegarde backend
      await axios.post(SAVE_EXPO_TOKEN_URL, {
        userId: user.id,
        expoPushToken,
      });

      console.log('✅ Token envoyé au backend');

      // Sauvegarde locale (optionnel)
      await AsyncStorage.setItem('expoPushToken', expoPushToken);

      return expoPushToken;
    } catch (err) {
      console.error('❌ PushService.register ERROR:', err);
    }
  }

  // Listeners notifications foreground + clic
  static listen() {
    Notifications.addNotificationReceivedListener(notification => {
      console.log('📩 Notification reçue (foreground):', notification);
    });

    Notifications.addNotificationResponseReceivedListener(response => {
      console.log('👉 Notification cliquée:', response);

      const data = response.notification.request.content.data;

      // Exemple : redirection vers un produit
      if (data?.type === 'product' && data.productId) {
        router.push(`/Auth/Produits/Detail?id=${data.productId}`);
      }
    });
  }
}
