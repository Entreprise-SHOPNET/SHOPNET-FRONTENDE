


// app/splash.tsx
import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { useRouter } from 'expo-router';
import { getToken } from './(tabs)/Auth/authService'; // Vérifie bien ce chemin

export default function Index() {
  const router = useRouter();
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Animation du logo
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 1500,
      useNativeDriver: true,
    }).start();

    // Vérification du token après une courte pause
    const timer = setTimeout(async () => {
      const token = await getToken();

      if (token) {
        // Rediriger vers la page principale
        router.replace('/Auth/Produits/Fil');
      } else {
        // Rediriger vers l’accueil (ex-index)
        router.replace('/splash');
      }
    }, 2500); // délai total : animation + vérif

    return () => clearTimeout(timer);
  }, []);

  return (
    <View style={styles.container}>
      <Animated.View style={[styles.logoContainer, { opacity: fadeAnim }]}>
        <Text style={styles.logo}>S</Text>
      </Animated.View>
      <Text style={styles.title}>SHOPNET</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#324A62',
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoContainer: {
    backgroundColor: '#FFF',
    width: 100,
    height: 100,
    borderRadius: 50,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  logo: {
    fontSize: 40,
    fontWeight: 'bold',
    color: '#324A62',
  },
  title: {
    fontSize: 24,
    color: '#FFF',
    fontWeight: 'bold',
  },
});
