// app/_layout.tsx

// app/_layout.tsx

import FontAwesome from "@expo/vector-icons/FontAwesome";
import {
  DarkTheme,
  DefaultTheme,
  ThemeProvider,
} from "@react-navigation/native";
import { useFonts } from "expo-font";
import { Stack, useRouter } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import React, { useEffect, useState } from "react";
import { View, Text } from "react-native";
import "react-native-reanimated";
import { useColorScheme } from "../components/useColorScheme";
import * as Device from "expo-device";
import {
  registerForPushNotificationsAsync,
  listenNotifications,
} from "../services/notifications";
import SharePrompt from "../SharePrompt";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";

export { ErrorBoundary } from "expo-router";

export const unstable_settings = {
  initialRouteName: "index",
};

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [loaded, error] = useFonts({
    SpaceMono: require("../assets/fonts/SpaceMono-Regular.ttf"),
    ...FontAwesome.font,
  });

  useEffect(() => {
    if (error) throw error;
  }, [error]);

  useEffect(() => {
    if (loaded) SplashScreen.hideAsync();
  }, [loaded]);

  if (!loaded) return null;

  return <RootLayoutNav />;
}

function RootLayoutNav() {
  const colorScheme = useColorScheme();
  const router = useRouter();

  const [notifVisible, setNotifVisible] = useState(false);
  const [notifMessage, setNotifMessage] = useState("");

  useEffect(() => {
    let unsubscribe: any;

    const initNotifications = async () => {
      if (!Device.isDevice) {
        console.log("ℹ️ Pas un vrai appareil");
        return;
      }

      // 🔥 attendre user
      const interval = setInterval(async () => {
        if (globalThis.currentUser?.id) {
          clearInterval(interval);

          const userId = globalThis.currentUser.id;

          console.log("👤 User détecté:", userId);

          // 🔐 permission + token
          await registerForPushNotificationsAsync(userId);

          // 🔔 écouter notifications FCM
          unsubscribe = listenNotifications(
            // 📩 FOREGROUND
            (remoteMessage) => {
              console.log("🔔 FCM FOREGROUND:", remoteMessage);

              const message =
                remoteMessage?.notification?.body ||
                remoteMessage?.data?.body ||
                "Nouvelle notification";

              setNotifMessage(message);
              setNotifVisible(true);

              setTimeout(() => {
                setNotifVisible(false);
              }, 4000);
            },

            // 📲 CLICK NOTIFICATION
            (remoteMessage) => {
              console.log("📲 Notification ouverte:", remoteMessage);

              const data = remoteMessage?.data || {};
              const productId = data.productId;

              if (productId) {
                router.push(`/(tabs)/Auth/Produits/Detail?productId=${productId}`);
              } else {
                router.push("/Auth/Produits/Fil");
              }
            }
          );
        }
      }, 500);
    };

    initNotifications();

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, []);

  return (
    <SafeAreaProvider>
      <SafeAreaView style={{ flex: 1 }} edges={["top", "bottom"]}>
        <ThemeProvider
          value={colorScheme === "dark" ? DarkTheme : DefaultTheme}
        >
          {/* 🔔 POPUP NOTIFICATION */}
          {notifVisible && (
            <View
              style={{
                position: "absolute",
                top: 60,
                left: 20,
                right: 20,
                backgroundColor: "#4CB050",
                padding: 15,
                borderRadius: 10,
                zIndex: 999,
                flexDirection: "row",
                alignItems: "center",
                elevation: 5,
              }}
            >
              <FontAwesome name="bell" size={20} color="#fff" />
              <Text
                style={{
                  color: "#fff",
                  marginLeft: 10,
                  fontWeight: "600",
                  flex: 1,
                }}
              >
                {notifMessage}
              </Text>
            </View>
          )}

          <SharePrompt />

          <Stack
            initialRouteName="index"
            screenOptions={{ headerShown: false }}
          >
            <Stack.Screen name="index" />
            <Stack.Screen name="splash" />
            <Stack.Screen name="Auth/Produits/Fil" />
            <Stack.Screen name="Auth/Produits/Detail" />
            <Stack.Screen name="(tabs)" />
            <Stack.Screen name="modal" options={{ presentation: "modal" }} />
            <Stack.Screen
              name="Auth/Questionnaire"
              options={{
                title: "Questionnaire",
                presentation: "card",
                headerBackTitle: "Retour",
              }}
            />
            <Stack.Screen name="Auth" options={{ presentation: "modal" }} />
          </Stack>
        </ThemeProvider>
      </SafeAreaView>
    </SafeAreaProvider>
  );
}
