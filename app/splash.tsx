



import React, { useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Animated } from 'react-native';
import { useRouter } from 'expo-router';

export default function Index() {
  const router = useRouter();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const zoomAnim = useRef(new Animated.Value(0.8)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 1200,
        useNativeDriver: true,
      }),
      Animated.timing(zoomAnim, {
        toValue: 1,
        duration: 900,
        useNativeDriver: true,
      })
    ]).start();
  }, []);

  return (
    <View style={styles.container}>

      {/* LOGO */}
      <Animated.View style={[
        styles.logo,
        {
          transform: [{ scale: zoomAnim }],
          opacity: fadeAnim
        }
      ]}>
        <Text style={styles.logoText}>S</Text>
      </Animated.View>

      {/* CONTENT */}
      <Animated.View style={{ width: '100%', opacity: fadeAnim }}>

        <Text style={styles.title}>
          Bienvenue sur <Text style={styles.highlight}>SHOPNET</Text>
        </Text>

        <Text style={styles.subtitle}>
          Achetez, vendez et trouvez des clients près de vous en quelques secondes.
        </Text>

        <Text style={styles.description}>
          Transformez votre téléphone en une source de revenus en Afrique et en RDC.
        </Text>

      </Animated.View>

      {/* BUTTONS */}
      <View style={styles.buttons}>

        <TouchableOpacity
          style={[styles.btn, styles.primary]}
          onPress={() => router.push('/Auth/Inscription/Connexion')}
        >
          <Text style={styles.btnText}>Se connecter</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.btn, styles.secondary]}
          onPress={() => router.push('/Auth/Inscription/inscription')}
        >
          <Text style={styles.btnText}>Créer un compte</Text>
        </TouchableOpacity>

      </View>

      {/* TRUST */}
      <Text style={styles.trust}>
        Déjà utilisé par des milliers d’utilisateurs en RDC et en Afrique
      </Text>

    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1f3b57',
    justifyContent: 'center',
    alignItems: 'flex-start',
    padding: 22,
  },

  logo: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: 'white',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 25,
  },

  logoText: {
    fontSize: 46,
    fontWeight: 'bold',
    color: '#1f3b57',
  },

  title: {
    fontSize: 26,
    color: 'white',
    fontWeight: 'bold',
    textAlign: 'left',
    marginBottom: 10,
  },

  highlight: {
    color: '#00c2ff',
  },

  subtitle: {
    fontSize: 16,
    color: 'white',
    textAlign: 'left',
    marginBottom: 10,
    lineHeight: 22,
  },

  description: {
    fontSize: 14,
    color: '#cbd5e1',
    textAlign: 'left',
    marginBottom: 25,
    lineHeight: 20,
  },

  buttons: {
    width: '100%',
    alignItems: 'center',
    marginTop: 10,
  },

  btn: {
    padding: 14,
    borderRadius: 30,
    width: '100%',
    alignItems: 'center',
    marginVertical: 8,
  },

  primary: {
    backgroundColor: '#00c2ff',
  },

  secondary: {
    borderWidth: 2,
    borderColor: '#00c2ff',
  },

  btnText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },

  trust: {
    marginTop: 20,
    fontSize: 12,
    color: '#94a3b8',
    textAlign: 'center',
    width: '100%',
  },
});