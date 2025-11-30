

// app/services/notifications.ts
import * as Notifications from 'expo-notifications';
import { Platform, Alert } from 'react-native';
import { router } from 'expo-router'; // si tu utilises expo-router

// 1️⃣ Configurer l'affichage des notifications
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

// 2️⃣ Fonction pour récupérer le token Expo Push
export async function registerForPushNotificationsAsync(): Promise<string | undefined> {
  try {
    // Android: config du channel
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

// 3️⃣ Écoute les notifications reçues quand l'app est en foreground
export function listenNotifications() {
  Notifications.addNotificationReceivedListener(notification => {
    console.log('Notification reçue en foreground :', notification);
    // Ici tu peux mettre à jour ton état local pour afficher un badge ou message en temps réel
  });

  Notifications.addNotificationResponseReceivedListener(response => {
    console.log('Notification cliquée :', response);
    // Navigation vers la page de détail de la notification
    const data = response.notification.request.content.data;
    if (data?.type === 'product') {
      router.push(`/Auth/Produits/Detail?id=${data.productId}`);
    }
  });
}
