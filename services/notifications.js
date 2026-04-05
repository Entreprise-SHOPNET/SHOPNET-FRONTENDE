// services/notifications.jsimport messaging from "@react-native-firebase/messaging";
i// services/notifications.js

import messaging from "@react-native-firebase/messaging";
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

    // ✅ ANDROID 13+
    if (Platform.OS === "android" && Platform.Version >= 33) {
      const alreadyGranted = await PermissionsAndroid.check(
        PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS
      );

      if (alreadyGranted) {
        permissionGranted = true;
      } else {
        const result = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS
        );

        permissionGranted =
          result === PermissionsAndroid.RESULTS.GRANTED;
      }
    }

    // ✅ iOS + Android < 13
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
      console.log("❌ Token FCM introuvable");
      return null;
    }

    console.log("🔥 FCM TOKEN SHOPNET :", fcmToken);

    // 📡 Backend
    await sendTokenToBackend(fcmToken, userId);

    // 🔄 Refresh token
    messaging().onTokenRefresh(async (newToken) => {
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
 * 📡 ENVOI TOKEN BACKEND
 */
async function sendTokenToBackend(token, userId) {
  try {
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
    console.log("📡 Backend:", data);

  } catch (error) {
    console.error("❌ Backend error:", error);
  }
}

/**
 * 🔔 LISTENER NOTIFICATIONS
 */
export function listenNotifications(onMessage, onOpen) {
  try {
    // 📩 FOREGROUND
    const unsubscribe = messaging().onMessage(async (remoteMessage) => {
      console.log("🔔 FOREGROUND:", remoteMessage);

      if (onMessage) {
        onMessage(remoteMessage);
      }
    });

    // 📲 BACKGROUND CLICK
    messaging().onNotificationOpenedApp((remoteMessage) => {
      console.log("📲 BACKGROUND OPEN:", remoteMessage);

      if (onOpen) {
        onOpen(remoteMessage);
      }
    });

    // 🚀 APP KILLED
    messaging()
      .getInitialNotification()
      .then((remoteMessage) => {
        if (remoteMessage) {
          console.log("🚀 OPEN FROM KILLED:", remoteMessage);

          if (onOpen) {
            onOpen(remoteMessage);
          }
        }
      });

    return unsubscribe;

  } catch (error) {
    console.error("❌ listen error:", error);
  }
}
