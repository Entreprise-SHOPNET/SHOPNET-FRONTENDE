



import React, { useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Animated } from 'react-native';
import { useRouter } from 'expo-router';

export default function Index() {
  const router = useRouter();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const zoomAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 1500,
        useNativeDriver: true,
      }),
      Animated.timing(zoomAnim, {
        toValue: 1,
        duration: 1000,
        useNativeDriver: true,
      })
    ]).start();
  }, []);

  return (
    <View style={styles.container}>
      <Animated.View style={[styles.logo, { 
        transform: [{ scale: zoomAnim }], 
        opacity: fadeAnim 
      }]}>
        <Text style={styles.logoText}>S</Text>
      </Animated.View>
      
      <Animated.Text style={[styles.title, { opacity: fadeAnim }]}>
        Bienvenue sur <Text style={styles.highlight}>SHOPNet</Text>
      </Animated.Text>
      
      <Animated.Text style={[styles.subtitle, { opacity: fadeAnim }]}>
        Achetez et vendez en toute sécurité.
      </Animated.Text>

      <View style={styles.buttons}>
        <TouchableOpacity 
          style={styles.btn} 
          onPress={() => router.push('/Auth/Inscription/Connexion')}
        >
          <Text style={styles.btnText}>Connexion</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.btn} 
          onPress={() => router.push('/Auth/Inscription/inscription')}
        >
          <Text style={styles.btnText}>Inscription</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#324A62',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  logo: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'white',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  logoText: {
    fontSize: 50,
    fontWeight: 'bold',
    color: '#324A62',
  },
  title: {
    fontSize: 24,
    color: 'white',
    marginBottom: 10,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  highlight: {
    color: '#007AFF',
  },
  subtitle: {
    fontSize: 16,
    color: 'white',
    marginBottom: 20,
    textAlign: 'center',
  },
  buttons: {
    width: '100%',
    alignItems: 'center',
  },
  btn: {
    backgroundColor: '#007AFF',
    padding: 12,
    borderRadius: 5,
    width: 200,
    alignItems: 'center',
    marginVertical: 10,
  },
  btnText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
