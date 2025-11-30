

// app/services/notifications.ts
import * as Notifications from 'expo-notifications';
import { Platform, Alert } from 'react-native';

// Configurer l'affichage des notifications
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

// Fonction pour récupérer le token Expo Push
export async function registerForPushNotificationsAsync(): Promise<string | undefined> {
  try {
    // Config Android channel
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'default',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#FF231F7C',
      });
    }

    // Permissions
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      Alert.alert('Permission refusée', 'Impossible de recevoir les notifications push.');
      return;
    }

    // Récupérer le token
    const tokenData = await Notifications.getExpoPushTokenAsync();
    console.log('Expo Push Token:', tokenData.data);
    return tokenData.data;
  } catch (error) {
    console.error('Erreur notifications :', error);
  }
}
