

// app/PushService.ts
import * as Notifications from 'expo-notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';

const EXPO_PROJECT_ID = 'f0e964ca-ce24-40ca-ada6-666e86e898f6';
const SAVE_EXPO_TOKEN_URL =
  'https://shopnet-backend.onrender.com/api/save-expo-token';

class PushService {
  static async register() {
    try {
      const userStr = await AsyncStorage.getItem('user');
      if (!userStr) return;

      const user = JSON.parse(userStr);
      if (!user?.id) return;

      // 🔔 Vérifier ou demander permission
      let { status } = await Notifications.getPermissionsAsync();
      if (status !== 'granted') {
        const req = await Notifications.requestPermissionsAsync();
        if (req.status !== 'granted') return;
        status = req.status;
      }

      // 🔑 Récupérer token
      const tokenObj = await Notifications.getExpoPushTokenAsync({
        projectId: EXPO_PROJECT_ID,
      });

      const expoPushToken = tokenObj.data;
      if (!expoPushToken) return;

      console.log('✅ Expo Push Token:', expoPushToken);

      // 🔄 Envoi au backend
      await axios.post(SAVE_EXPO_TOKEN_URL, {
        userId: user.id,
        expoPushToken,
      });

      console.log('✅ Token envoyé au backend avec succès');
    } catch (err) {
      console.error('❌ Erreur PushService.register:', err);
    }
  }
}

export default PushService;
