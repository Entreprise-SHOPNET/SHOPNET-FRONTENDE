

// app/_layout.tsx
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import React, { useEffect, useState } from 'react';
import { View, Text } from 'react-native';
import 'react-native-reanimated';
import { useColorScheme } from '../components/useColorScheme';
import AsyncStorage from '@react-native-async-storage/async-storage';

import * as Notifications from 'expo-notifications';
import axios from 'axios';

import { notificationService } from './notificationService';
import SharePrompt from '../SharePrompt';

export { ErrorBoundary } from 'expo-router';

export const unstable_settings = {
  initialRouteName: 'index',
};

SplashScreen.preventAutoHideAsync();

// 🔥 PROJECT ID EXPO (OBLIGATOIRE EN BUILD)
const EXPO_PROJECT_ID = 'f0e964ca-ce24-40ca-ada6-666e86e898f6';

// 🌐 BACKEND
const SAVE_EXPO_TOKEN_URL =
  'https://shopnet-backend.onrender.com/api/save-expo-token';

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

  const [notifVisible, setNotifVisible] = useState(false);
  const [notifMessage, setNotifMessage] = useState('');

  // 🔔 CONFIG NOTIFICATIONS
  useEffect(() => {
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
      }),
    });
  }, []);

  // 🚀 GÉNÉRATION TOKEN EXPO (UNIQUE)
  useEffect(() => {
    const registerPushToken = async () => {
      try {
        const userStr = await AsyncStorage.getItem('user');
        if (!userStr) return;

        const user = JSON.parse(userStr);
        if (!user?.id) return;

        const { status } = await Notifications.getPermissionsAsync();
        if (status !== 'granted') {
          const req = await Notifications.requestPermissionsAsync();
          if (req.status !== 'granted') return;
        }

        const { data: expoPushToken } =
          await Notifications.getExpoPushTokenAsync({
            projectId: EXPO_PROJECT_ID,
          });

        if (!expoPushToken) return;

        // 🚀 ENVOI BACKEND
        await axios.post(SAVE_EXPO_TOKEN_URL, {
          userId: user.id,
          expoPushToken,
        });

        console.log('✅ Expo Push Token enregistré:', expoPushToken);
      } catch (err) {
        console.error('❌ Erreur push token:', err);
      }
    };

    registerPushToken();
  }, []);

  // 🔔 SOCKET + BANNIÈRE
  useEffect(() => {
    notificationService.initSocket();

    globalThis.triggerBanner = (msg: string) => {
      setNotifMessage(msg);
      setNotifVisible(true);
      setTimeout(() => setNotifVisible(false), 4000);
    };

    return () => {
      notificationService.disconnect();
    };
  }, []);

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      {notifVisible && (
        <View
          style={{
            position: 'absolute',
            top: 50,
            left: 20,
            right: 20,
            backgroundColor: '#4CB050',
            padding: 15,
            borderRadius: 8,
            zIndex: 999,
            flexDirection: 'row',
            alignItems: 'center',
          }}
        >
          <FontAwesome name="bell" size={20} color="#fff" />
          <Text style={{ color: '#fff', marginLeft: 10, fontWeight: '600' }}>
            {notifMessage}
          </Text>
        </View>
      )}

      <SharePrompt />

      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="splash" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="modal" options={{ presentation: 'modal' }} />
        <Stack.Screen name="Auth" options={{ presentation: 'modal' }} />
      </Stack>
    </ThemeProvider>
  );
}


