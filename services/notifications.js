// services/notifications.js
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
 * 🔥 CONFIGURATION ANDROID
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
 * 📲 Enregistrer l'appareil et envoyer le token Expo
 */
export async function registerForPushNotificationsAsync(userId) {
  try {

    console.log("🔎 Vérification configuration notifications");

    // 🔍 Vérifier Project ID
    const projectId =
      Constants?.expoConfig?.extra?.eas?.projectId ??
      Constants?.easConfig?.projectId;

    console.log("📦 Project ID détecté :", projectId);

    if (!projectId) {
      console.log("❌ ERREUR : aucun Project ID trouvé → ExpoPushToken impossible");
      return null;
    } else {
      console.log("✅ Project ID valide → ExpoPushToken sera généré en APK");
    }

    // 🔍 Vérifier environnement
    if (Constants.appOwnership === "expo") {
      console.log("⚠️ Environnement actuel : Expo Go");
      console.log("ℹ️ Expo Go génère seulement : ExponentPushToken");
      console.log("🚀 En APK/AAB la valeur deviendra : ExpoPushToken");
    }

    if (Constants.appOwnership === "standalone") {
      console.log("✅ Application en mode PRODUCTION (APK / Play Store)");
    }

    console.log("📱 Appareil réel :", Device.isDevice);

    if (!Device.isDevice) {
      console.log("❌ Notifications nécessitent un appareil réel");
      return null;
    }

    console.log("⚡️ Demande permission notifications pour userId:", userId);

    // 🔥 Créer le channel Android
    await configureAndroidChannel();

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

    console.log("✅ Permission notifications accordée");

    // 🔥 Génération du token Expo
    const tokenResponse = await Notifications.getExpoPushTokenAsync({
      projectId,
    });

    const expoPushToken = tokenResponse.data;

    console.log("🚀 TOKEN GÉNÉRÉ :", expoPushToken);

    if (expoPushToken.startsWith("ExponentPushToken")) {
      console.log("⚠️ Token Expo Go détecté");
    }

    if (expoPushToken.startsWith("ExpoPushToken")) {
      console.log("✅ Token PRODUCTION détecté");
    }

    // 📡 Envoi au backend
    await sendTokenToBackend(expoPushToken, userId);

    return expoPushToken;

  } catch (error) {
    console.error("❌ Erreur register notifications:", error);
    return null;
  }
}

/**
 * 📡 Envoi du token au backend
 */
async function sendTokenToBackend(token, userId) {

  if (!token || !userId) {
    console.log("⚠️ Token ou userId manquant");
    return;
  }

  try {

    console.log("📡 Envoi token au backend...");

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
 * 🔔 Écoute des notifications
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