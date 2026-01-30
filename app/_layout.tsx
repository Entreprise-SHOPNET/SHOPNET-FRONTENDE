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
import { View, Text, Platform } from "react-native";
import "react-native-reanimated";
import { useColorScheme } from "../components/useColorScheme";
import * as Device from "expo-device";
import * as Notifications from "expo-notifications";
import {
  registerForPushNotificationsAsync,
  listenNotifications,
} from "../services/notifications";
import SharePrompt from "../SharePrompt";

// ✅ Ajout SafeArea pour tous les écrans
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
    const initNotifications = async () => {
      if (!Device.isDevice) {
        console.log("ℹ️ Pas un vrai appareil → notifications désactivées");
        return;
      }

      if (globalThis.currentUser?.id) {
        await registerForPushNotificationsAsync(globalThis.currentUser.id);
      }

      if (Platform.OS === "android") {
        await Notifications.setNotificationChannelAsync("default", {
          name: "default",
          importance: Notifications.AndroidImportance.MAX,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: "#FF231F7C",
        });
      }

      listenNotifications(
        (notification) => {
          const message = notification.request.content.body || "";
          setNotifMessage(message);
          setNotifVisible(true);
          setTimeout(() => setNotifVisible(false), 4000);
        },
        (response) => {
          const data = response.notification.request.content.data || {};
          const productId = data.productId;

          if (productId) {
            router.push(`/(tabs)/Auth/Panier/DetailId`);
          } else {
            router.push("/Auth/Produits/Fil");
          }
        },
      );
    };

    initNotifications();
  }, []);

  return (
    // ✅ SafeAreaProvider pour toute l'app
    <SafeAreaProvider>
      {/* SafeAreaView avec flex:1 et edges top/bottom */}
      <SafeAreaView style={{ flex: 1 }} edges={["top", "bottom"]}>
        <ThemeProvider
          value={colorScheme === "dark" ? DarkTheme : DefaultTheme}
        >
          {/* Bannière notification */}
          {notifVisible && (
            <View
              style={{
                position: "absolute",
                top: 50,
                left: 20,
                right: 20,
                backgroundColor: "#4CB050",
                padding: 15,
                borderRadius: 8,
                zIndex: 999,
                flexDirection: "row",
                alignItems: "center",
              }}
            >
              <FontAwesome name="bell" size={20} color="#fff" />
              <Text
                style={{ color: "#fff", marginLeft: 10, fontWeight: "600" }}
              >
                {notifMessage}
              </Text>
            </View>
          )}

          {/* SharePrompt sur toutes les pages */}
          <SharePrompt />

          {/* Navigation stack */}
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
