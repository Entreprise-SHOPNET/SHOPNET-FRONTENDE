// services/notifications.js
// services/notifications.js

// services/notifications.js

import messaging from "@react-native-firebase/messaging";
import { Platform } from "react-native";

/**
 * 🔥 INITIALISATION + PERMISSION + TOKEN FCM
 */
export async function registerForPushNotificationsAsync(userId) {
  try {
    console.log("🔥 SHOPNET FCM INIT...");

    if (!userId) {
      console.log("❌ userId manquant");
      return null;
    }

    // 🔐 Demander permission notifications
    const authStatus = await messaging().requestPermission();

    const enabled =
      authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
      authStatus === messaging.AuthorizationStatus.PROVISIONAL;

    if (!enabled) {
      console.log("❌ Permission notifications refusée");
      return null;
    }

    console.log("✅ Permission notifications accordée");

    // 🚀 Récupérer le TOKEN FCM
    const fcmToken = await messaging().getToken();

    if (!fcmToken) {
      console.log("❌ Impossible de récupérer le token FCM");
      return null;
    }

    console.log("🔥 FCM TOKEN SHOPNET :", fcmToken);

    // 📡 Envoyer au backend
    await sendTokenToBackend(fcmToken, userId);

    return fcmToken;
  } catch (error) {
    console.error("❌ Erreur FCM register:", error);
    return null;
  }
}

/**
 * 📡 ENVOI TOKEN AU BACKEND (MySQL)
 */
async function sendTokenToBackend(token, userId) {
  try {
    console.log("📡 Envoi token FCM backend SHOPNET...");

    const response = await fetch(
      "https://shopnet-backend.onrender.com/api/save-fcm-token",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userId,
          fcmToken: token,
          device: Platform.OS,
        }),
      }
    );

    const data = await response.json();

    console.log("📡 Backend response:", data);
  } catch (error) {
    console.error("❌ Erreur envoi backend:", error);
  }
}

/**
 * 🔔 ÉCOUTER NOTIFICATIONS (APP OUVERTE)
 */
export function listenNotifications(onMessage, onOpen) {
  try {
    // 📩 App ouverte (foreground)
    const unsubscribe = messaging().onMessage(async remoteMessage => {
      console.log("🔔 Notification reçue:", remoteMessage);

      if (onMessage) {
        onMessage(remoteMessage);
      }
    });

    // 📲 App ouverte via notification
    messaging().onNotificationOpenedApp(remoteMessage => {
      console.log("📲 Notification ouverte:", remoteMessage);

      if (onOpen) {
        onOpen(remoteMessage);
      }
    });

    // 🔥 App kill -> ouverture directe
    messaging()
      .getInitialNotification()
      .then(remoteMessage => {
        if (remoteMessage) {
          console.log("🚀 App ouverte depuis notification:", remoteMessage);
          if (onOpen) onOpen(remoteMessage);
        }
      });

    return unsubscribe;
  } catch (error) {
    console.error("❌ listenNotifications error:", error);
  }
}