// services/notifications.jsimport messaging from "@react-native-firebase/messaging";
import { Platform, PermissionsAndroid } from "react-native";

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

    let permissionGranted = false;

    // 📱 ANDROID 13+
    if (Platform.OS === "android" && Platform.Version >= 33) {
      const result = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS
      );

      permissionGranted = result === PermissionsAndroid.RESULTS.GRANTED;
    }

    // 🍎 iOS + Android < 13
    else {
      const authStatus = await messaging().requestPermission();

      permissionGranted =
        authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
        authStatus === messaging.AuthorizationStatus.PROVISIONAL;
    }

    if (!permissionGranted) {
      console.log("❌ Permission notifications refusée");
      return null;
    }

    console.log("✅ Permission notifications accordée");

    // 🔥 TOKEN FCM
    const fcmToken = await messaging().getToken();

    if (!fcmToken) {
      console.log("❌ Impossible de récupérer le token FCM");
      return null;
    }

    console.log("🔥 FCM TOKEN SHOPNET :", fcmToken);

    // 📡 Envoyer au backend
    await sendTokenToBackend(fcmToken, userId);

    // 🔄 Écouter changement token (IMPORTANT)
    messaging().onTokenRefresh(async newToken => {
      console.log("🔄 Nouveau token FCM :", newToken);
      await sendTokenToBackend(newToken, userId);
    });

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
 * 🔔 ÉCOUTER NOTIFICATIONS (APP OUVERTE / BACKGROUND / KILLED)
 */
export function listenNotifications(onMessage, onOpen) {
  try {
    // 📩 APP OUVERTE (foreground)
    const unsubscribe = messaging().onMessage(async remoteMessage => {
      console.log("🔔 Notification reçue (foreground):", remoteMessage);

      if (onMessage) {
        onMessage(remoteMessage);
      }
    });

    // 📲 APP EN BACKGROUND → ouverture
    messaging().onNotificationOpenedApp(remoteMessage => {
      console.log("📲 Notification ouverte (background):", remoteMessage);

      if (onOpen) {
        onOpen(remoteMessage);
      }
    });

    // 🚀 APP FERMÉE → ouverture directe
    messaging()
      .getInitialNotification()
      .then(remoteMessage => {
        if (remoteMessage) {
          console.log("🚀 App ouverte depuis notification (killed):", remoteMessage);

          if (onOpen) {
            onOpen(remoteMessage);
          }
        }
      });

    return unsubscribe;

  } catch (error) {
    console.error("❌ listenNotifications error:", error);
  }
}
