


import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Animated, TouchableOpacity, Platform, PermissionsAndroid } from 'react-native';
import { useRouter } from 'expo-router';
import * as Location from 'expo-location';

const fetchLocalProducts = async (lat: number, lon: number) => {
  await new Promise(resolve => setTimeout(resolve, 1500));
  return [
    { id: 1, name: 'Produit local 1', distance: '0.5km' },
    { id: 2, name: 'Produit local 2', distance: '1.2km' }
  ];
};

const SplashScreen = () => {
  const router = useRouter();
  const [status, setStatus] = useState<'loading' | 'error' | 'success'>('loading');
  const [errorMessage, setErrorMessage] = useState('');
  const fadeAnim = new Animated.Value(0);
  const dotAnimations = Array(7).fill(0).map(() => new Animated.Value(0));

  const requestLocationPermission = async () => {
    if (Platform.OS === 'android') {
      try {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
          {
            title: 'Permission de localisation',
            message: 'L\'application a besoin d\'accéder à votre position pour trouver des produits locaux.',
            buttonNeutral: 'Demander plus tard',
            buttonNegative: 'Annuler',
            buttonPositive: 'OK',
          }
        );
        return granted === PermissionsAndroid.RESULTS.GRANTED;
      } catch (err) {
        console.warn(err);
        return false;
      }
    } else {
      const { status } = await Location.requestForegroundPermissionsAsync();
      return status === 'granted';
    }
  };

  const loadData = async () => {
    try {
      setStatus('loading');

      const hasPermission = await requestLocationPermission();
      if (!hasPermission) {
        throw new Error('Permission de localisation refusée');
      }

      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });

      const products = await fetchLocalProducts(
        location.coords.latitude,
        location.coords.longitude
      );

      router.replace({
        pathname: '/(tabs)/Auth/Produits/Fil',
        params: { products: JSON.stringify(products) }
      });

    } catch (error) {
      setStatus('error');
      setErrorMessage(error.message || 'Erreur inconnue');
      console.error('Erreur de localisation:', error);
    }
  };

  useEffect(() => {
    Animated.timing(fadeAnim, { toValue: 1, duration: 1000, useNativeDriver: true }).start();

    dotAnimations.forEach((anim, index) => {
      Animated.sequence([
        Animated.delay(index * 200),
        Animated.timing(anim, { toValue: 1, duration: 1000, useNativeDriver: true }),
        Animated.timing(anim, { toValue: 0, duration: 1000, useNativeDriver: true }),
      ]).start();
    });

    loadData();
  }, []);

  const handleRetry = () => {
    loadData();
  };

  const handleContinueWithoutLocation = () => {
    router.replace('/(tabs)/Auth/Produits/Fil');
  };

  return (
    <View style={styles.container}>
      <View style={styles.topBar}>
        <View style={styles.logo}>
          <Text style={styles.logoText}>S</Text>
        </View>
        <Text style={styles.title}>VENTE ACHAT</Text>
      </View>

      <View style={styles.loadingContainer}>
        {status === 'loading' && (
          <>
            <View style={styles.letters}>
              {dotAnimations.map((anim, index) => (
                <Animated.Text
                  key={index}
                  style={[
                    styles.dot,
                    {
                      opacity: anim,
                      transform: [{
                        translateX: anim.interpolate({
                          inputRange: [0, 1],
                          outputRange: [50, 0]
                        })
                      }]
                    }
                  ]}
                >
                  .
                </Animated.Text>
              ))}
            </View>
            <Text style={styles.loadingText}>
              Recherche de produits près de chez vous...
            </Text>
          </>
        )}

        {status === 'error' && (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>⚠️ Erreur</Text>
            <Text style={styles.errorMessage}>{errorMessage}</Text>
            <TouchableOpacity
              style={styles.retryButton}
              onPress={handleRetry}
            >
              <Text style={styles.retryText}>Réessayer</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.continueButton}
              onPress={handleContinueWithoutLocation}
            >
              <Text style={styles.continueText}>Continuer sans localisation</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      <Text style={styles.footerText}>Bienvenue sur SHOPNet Inc.</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#324A62',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#2B3E4F',
    width: '100%',
    paddingVertical: 15,
  },
  logo: {
    backgroundColor: '#FFF',
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  logoText: {
    color: '#324A62',
    fontWeight: 'bold',
    fontSize: 20,
  },
  title: {
    color: 'white',
    fontSize: 20,
    fontWeight: 'bold',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  letters: {
    flexDirection: 'row',
    height: 50,
    alignItems: 'center',
  },
  dot: {
    fontSize: 40,
    color: 'white',
    marginHorizontal: 2,
  },
  loadingText: {
    fontSize: 16,
    color: 'white',
    marginTop: 20,
    textAlign: 'center',
  },
  footerText: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.3)',
    marginBottom: 20,
  },
  errorContainer: {
    alignItems: 'center',
    width: '100%',
  },
  errorText: {
    color: '#FF6B6B',
    fontSize: 24,
    marginBottom: 10,
  },
  errorMessage: {
    color: 'white',
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 20,
  },
  retryButton: {
    backgroundColor: '#FFF',
    paddingVertical: 12,
    paddingHorizontal: 30,
    borderRadius: 25,
    marginBottom: 15,
    width: '80%',
    alignItems: 'center',
  },
  retryText: {
    color: '#324A62',
    fontWeight: 'bold',
  },
  continueButton: {
    paddingVertical: 12,
    paddingHorizontal: 30,
    borderRadius: 25,
    borderWidth: 1,
    borderColor: '#FFF',
    width: '80%',
    alignItems: 'center',
  },
  continueText: {
    color: '#FFF',
    fontWeight: 'bold',
  },
});

export default SplashScreen;
