// services/notifications.jsimport messaging from "@react-native-firebase/messaging";
// services/notifications.js
// services/notifications.js (EXPO GO VERSION)

import * as Notifications from "expo-notifications";
import { Platform } from "react-native";

/**
 * 🔔 INITIALISATION + TOKEN (EXPO GO)
 */
export async function registerForPushNotificationsAsync(userId) {
  try {
    console.log("🔥 EXPO NOTIFICATIONS INIT...");

    if (!userId) {
      console.log("❌ userId manquant");
      return null;
    }

    // 📱 Permission notifications
    const { status } = await Notifications.requestPermissionsAsync();

    if (status !== "granted") {
      console.log("❌ Permission notifications refusée");
      return null;
    }

    // 🔔 Expo Push Token
    const token = (await Notifications.getExpoPushTokenAsync()).data;

    console.log("🔔 EXPO PUSH TOKEN :", token);

    // 📡 Envoyer au backend (tu gardes TON backend identique)
    await sendTokenToBackend(token, userId);

    return token;

  } catch (error) {
    console.error("❌ Error notifications:", error);
    return null;
  }
}

/**
 * 📡 ENVOI BACKEND (IDENTIQUE À TON SYSTÈME)
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
 * 🔔 LISTENER NOTIFICATIONS (EXPO GO)
 */
export function listenNotifications(onMessage, onOpen) {
  try {
    // 📩 FOREGROUND
    const subscription = Notifications.addNotificationReceivedListener(
      (notification) => {
        console.log("🔔 FOREGROUND:", notification);

        if (onMessage) {
          onMessage(notification);
        }
      }
    );

    // 📲 CLICK NOTIFICATION
    const responseSub =
      Notifications.addNotificationResponseReceivedListener((response) => {
        console.log("📲 OPEN:", response);

        if (onOpen) {
          onOpen(response);
        }
      });

    return () => {
      subscription.remove();
      responseSub.remove();
    };

  } catch (error) {
    console.error("❌ listen error:", error);
  }
}