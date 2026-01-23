// app/_layout.tsx
import FontAwesome from "@expo/vector-icons/FontAwesome";
import {
  DarkTheme,
  DefaultTheme,
  ThemeProvider,
} from "@react-navigation/native";
import { useFonts } from "expo-font";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import React, { useEffect, useState } from "react";
import { View, Text } from "react-native";
import "react-native-reanimated";
import { useColorScheme } from "../components/useColorScheme";
import { notificationService } from "./notificationService";
import SharePrompt from "../SharePrompt";

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

  const [notifVisible, setNotifVisible] = useState(false);
  const [notifMessage, setNotifMessage] = useState("");

  useEffect(() => {
    // 🔹 Initialisation globale du socket
    notificationService.initSocket();

    // 🔹 Bannière globale pour toutes notifications internes
    globalThis.triggerBanner = (msg: string) => {
      setNotifMessage(msg);
      setNotifVisible(true);

      // Masquer automatiquement après 4 secondes
      setTimeout(() => setNotifVisible(false), 4000);
    };

    return () => {
      notificationService.disconnect();
    };
  }, []);

  return (
    <ThemeProvider value={colorScheme === "dark" ? DarkTheme : DefaultTheme}>
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
          <Text style={{ color: "#fff", marginLeft: 10, fontWeight: "600" }}>
            {notifMessage}
          </Text>
        </View>
      )}

      {/* SharePrompt sur toutes les pages */}
      <SharePrompt />

      {/* Navigation stack */}
      <Stack
        initialRouteName="index"
        screenOptions={{
          headerShown: false,
        }}
      >
        <Stack.Screen name="index" />
        <Stack.Screen name="splash" />
        <Stack.Screen name="Auth/Produits/Fil" />
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
        <Stack.Screen
          name="Auth"
          options={{
            presentation: "modal",
          }}
        />
      </Stack>
    </ThemeProvider>
  );
}
