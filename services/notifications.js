// services/notifications.js

import * as Notifications from "expo-notifications";
import * as Device from "expo-device";
import Constants from "expo-constants";
import { Platform } from "react-native";

// 🔔 Comportement des notifications quand l'app est au premier plan
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

/**
 * 🔥 CONFIGURATION ANDROID (OBLIGATOIRE EN PRODUCTION)
 * Crée le Notification Channel pour Android 8+
 */
export async function configureAndroidChannel() {
  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync("default", {
      name: "default",
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: "#4CB050",
    });

    console.log("✅ Notification Channel Android configuré");
  }
}

/**
 * Enregistrer l'appareil et envoyer le token Expo au backend
 * ✅ COMPATIBLE EXPO GO
 * ✅ COMPATIBLE APK / AAB (PRODUCTION)
 */
export async function registerForPushNotificationsAsync(userId) {
  try {
    console.log("⚡️ Demande permission notifications pour userId:", userId);

    // 🔥 Important : créer le channel Android avant tout
    await configureAndroidChannel();

    // ❌ Notifications uniquement sur vrai appareil
    if (!Device.isDevice) {
      console.log("ℹ️ Pas un vrai appareil → notifications désactivées");
      return null;
    }

    // 🔐 Vérification permissions
    const { status: existingStatus } =
      await Notifications.getPermissionsAsync();

    let finalStatus = existingStatus;

    if (existingStatus !== "granted") {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== "granted") {
      console.log("❌ Permission notifications refusée");
      return null;
    }

    // 🔥 OBLIGATOIRE EN PROD (APK / AAB)
    const tokenResponse = await Notifications.getExpoPushTokenAsync({
      projectId: Constants.expoConfig.extra.eas.projectId,
    });

    const expoPushToken = tokenResponse.data;

    console.log("✅ Expo Push Token:", expoPushToken);

    // 📡 Envoi backend
    await sendTokenToBackend(expoPushToken, userId);

    return expoPushToken;
  } catch (error) {
    console.error("❌ Erreur register notifications:", error);
    return null;
  }
}

/**
 * Envoi du token Expo au backend
 */
async function sendTokenToBackend(token, userId) {
  if (!token || !userId) {
    console.log("⚠️ Token ou userId manquant");
    return;
  }

  try {
    const response = await fetch(
      "https://shopnet-backend.onrender.com/api/save-expo-token",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userId,
          expoPushToken: token,
        }),
      }
    );

    const data = await response.json();
    console.log("📡 Token sauvegardé:", data?.message ?? data);
  } catch (error) {
    console.error("❌ Erreur envoi token backend:", error);
  }
}

/**
 * Écoute des notifications reçues et cliquées
 */
export function listenNotifications(onNotification, onResponse) {
  const receivedSub =
    Notifications.addNotificationReceivedListener(onNotification);

  const responseSub =
    Notifications.addNotificationResponseReceivedListener(onResponse);

  return () => {
    receivedSub.remove();
    responseSub.remove();
  };
}