
// app/_layout.tsx
// app/_layout.tsx

import FontAwesome from '@expo/vector-icons/FontAwesome';
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import React, { useEffect, useState } from 'react';
import 'react-native-reanimated';
import { useColorScheme } from '../components/useColorScheme';

// ✅ Import du service de notification socket.io
import { notificationService } from './notificationService'; // ajuste si besoin
// ✅ Import SharePrompt
import SharePrompt from '../SharePrompt'; // ajuste le chemin si nécessaire

export { ErrorBoundary } from 'expo-router';

export const unstable_settings = {
  initialRouteName: 'index',
};

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [loaded, error] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
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

  // ✅ État pour afficher la bannière de notification
  const [notifVisible, setNotifVisible] = useState(false);
  const [notifMessage, setNotifMessage] = useState('');

  // ✅ Initialisation du socket + liaison globale pour les notifications
  useEffect(() => {
    notificationService.initSocket();

    globalThis.triggerBanner = (msg: string) => {
      setNotifMessage(msg);
      setNotifVisible(true);
    };

    return () => {
      notificationService.disconnect();
    };
  }, []);

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      {/* 👇 SharePrompt sera monté sur toutes les pages */}
      <SharePrompt />

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
        <Stack.Screen name="modal" options={{ presentation: 'modal' }} />
        <Stack.Screen
          name="Auth/Questionnaire"
          options={{
            title: 'Questionnaire',
            presentation: 'card',
            headerBackTitle: 'Retour',
          }}
        />
        <Stack.Screen
          name="Auth"
          options={{
            presentation: 'modal',
          }}
        />
      </Stack>
    </ThemeProvider>
  );
}
