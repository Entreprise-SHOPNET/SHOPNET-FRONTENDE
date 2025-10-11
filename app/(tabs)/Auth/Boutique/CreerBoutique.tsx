

import { StyleSheet, View, Text, TouchableOpacity, ScrollView, ActivityIndicator, Animated, Dimensions, Platform } from 'react-native';
import React, { useState, useEffect, useRef } from 'react';
import { FontAwesome5, MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';

const SHOPNET_BLUE = '#00182A';
const SHOPNET_GREEN = '#4DB14E';
const { width, height } = Dimensions.get('window');

export default function CreerBoutique() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [hasAccount, setHasAccount] = useState(false);

  const scrollY = useRef(new Animated.Value(0)).current;
  const titleScale = useRef(new Animated.Value(1)).current;
  const titleTranslateX = useRef(new Animated.Value(0)).current;
  const titleTranslateY = useRef(new Animated.Value(0)).current;

  const headerHeight = scrollY.interpolate({
    inputRange: [0, 100],
    outputRange: [180, 100],
    extrapolate: 'clamp',
  });

  const titleFontSize = scrollY.interpolate({
    inputRange: [0, 100],
    outputRange: [28, 20],
    extrapolate: 'clamp',
  });

  const titleMarginTop = scrollY.interpolate({
    inputRange: [0, 100],
    outputRange: [10, 0],
    extrapolate: 'clamp',
  });

  const subtitleOpacity = scrollY.interpolate({
    inputRange: [0, 80],
    outputRange: [1, 0],
    extrapolate: 'clamp',
  });

  useEffect(() => {
    Animated.parallel([
      Animated.spring(titleScale, {
        toValue: 1,
        speed: 10,
        bounciness: 8,
        useNativeDriver: true,
      }),
      Animated.spring(titleTranslateX, {
        toValue: 0,
        speed: 10,
        bounciness: 8,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  useEffect(() => {
    const checkUserAccount = async () => {
      try {
        const token = await AsyncStorage.getItem('token');
        if (!token) {
          setIsLoading(false);
          return;
        }

        const response = await fetch('http://100.64.134.89:5000/api/boutiques/check', {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        });

        const data = await response.json();
        setHasAccount(response.ok && data.hasBoutique);
      } catch (error) {
        console.error('Erreur vérification boutique:', error);
        setHasAccount(false);
      } finally {
        setIsLoading(false);
      }
    };

    checkUserAccount();
  }, []);

  const boutiques = [
    {
      type: 'Standard',
      iconComponent: <FontAwesome5 name="store" size={32} color={SHOPNET_GREEN} />,
      description: 'Parfait pour commencer à vendre en ligne',
      price: 'Gratuit / $0',
      features: [
        'Publier et gérer jusqu\'à 50 produits',
        'Gérer les commandes (confirmation, expédition)',
        'Voir les avis clients sur ses produits',
        'Gestion simple du profil vendeur',
        'Support de base par email'
      ],
      limitations: [
        'Pas de statistiques détaillées',
        'Pas d\'historique complet des ventes',
        'Pas de mise en avant des produits'
      ],
      color: SHOPNET_GREEN,
    },
    {
      type: 'Premium',
      iconComponent: <MaterialCommunityIcons name="crown" size={32} color="#FFA726" />,
      description: 'Solution avancée pour développer votre business',
      price: '$9.99/mois',
      features: [
        'Toutes les fonctionnalités Standard',
        'Modifier photo de profil et couverture',
        'Statistiques détaillées (ventes, vues, produits populaires)',
        'Historique complet des commandes et retours',
        'Gestion des avis clients et réponses',
        'Navigation rapide avec boutons dédiés',
        'Jusqu\'à 200 produits'
      ],
      limitations: [
        'Pas de promotions avancées',
        'Pas de recommandations IA'
      ],
      color: '#FFA726',
    },
    {
      type: 'Pro VIP',
      iconComponent: <Ionicons name="rocket" size={32} color="#42A5F5" />,
      description: 'Solution complète avec marketing et IA',
      price: '$24.99/mois',
      features: [
        'Toutes les fonctionnalités Premium',
        'Mise en avant des produits (top listing)',
        'Gestion de promotions, remises et coupons',
        'Recommandations IA pour les clients',
        'Rapports avancés (ventes, clients, tendances)',
        'Outils marketing intégrés',
        'Accès prioritaire aux nouvelles fonctionnalités',
        'Produits illimités',
        'Support prioritaire 24/7'
      ],
      limitations: [],
      color: '#42A5F5',
    }
  ];

  if (hasAccount) {
    router.replace('/splash');
    return (
      <View style={[styles.container, styles.centerContent]}>
        <ActivityIndicator size="large" color={SHOPNET_GREEN} />
        <Text style={styles.loadingText}>Redirection vers votre boutique...</Text>
      </View>
    );
  }

  if (isLoading) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <ActivityIndicator size="large" color={SHOPNET_GREEN} />
        <Text style={styles.loadingText}>Vérification de votre compte...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Animated.View style={[styles.header, { height: headerHeight }]}>
        <Animated.View style={[styles.titleContainer, { marginTop: titleMarginTop }]}>
          <Animated.Text style={[styles.title, { fontSize: titleFontSize }]}>
            Créez Votre Boutique
          </Animated.Text>
          <Animated.Text style={[styles.subtitle, { opacity: subtitleOpacity }]}>
            Choisissez la formule qui correspond à vos ambitions commerciales
          </Animated.Text>
        </Animated.View>
      </Animated.View>

      <ScrollView
        contentContainerStyle={styles.scrollContainer}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
          { useNativeDriver: false }
        )}
        scrollEventThrottle={16}
        showsVerticalScrollIndicator={false}
      >
        {boutiques.map((boutique, index) => (
          <View key={index} style={[styles.card, { borderLeftColor: boutique.color }]}>
            <View style={styles.cardHeader}>
              <View style={styles.iconTitleContainer}>
                <View style={styles.iconContainer}>{boutique.iconComponent}</View>
                <View>
                  <Text style={[styles.boutiqueType, { color: boutique.color }]}>{boutique.type}</Text>
                  <Text style={styles.price}>{boutique.price}</Text>
                </View>
              </View>
              <Text style={styles.description}>{boutique.description}</Text>
            </View>

            <View style={styles.featuresContainer}>
              <Text style={styles.sectionTitle}>Fonctionnalités incluses:</Text>
              {boutique.features.map((feature, i) => (
                <View key={i} style={styles.featureItem}>
                  <FontAwesome5 name="check-circle" size={16} color={SHOPNET_GREEN} />
                  <Text style={styles.featureText}>{feature}</Text>
                </View>
              ))}
            </View>

            {boutique.limitations.length > 0 && (
              <View style={styles.limitationsContainer}>
                <Text style={styles.sectionTitle}>Limitations:</Text>
                {boutique.limitations.map((limitation, i) => (
                  <View key={i} style={styles.limitationItem}>
                    <FontAwesome5 name="times-circle" size={16} color="#ff6b6b" />
                    <Text style={styles.limitationText}>{limitation}</Text>
                  </View>
                ))}
              </View>
            )}

            <TouchableOpacity
              style={[styles.button, { backgroundColor: boutique.color }]}
              onPress={() => {
                if (boutique.type === 'Standard') router.push('/(tabs)/Auth/Boutique/FormulaireStandard');
                if (boutique.type === 'Premium') router.push('/MisAjour');
                if (boutique.type === 'Pro VIP') router.push('/MisAjour');
              }}
            >
              <Text style={styles.buttonText}>Choisir {boutique.type}</Text>
              <FontAwesome5 name="arrow-right" size={16} color="#fff" style={styles.buttonIcon} />
            </TouchableOpacity>
          </View>
        ))}

        <View style={styles.footer}>
          <Text style={styles.footerText}>
            Vous pouvez changer de formule à tout moment
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: SHOPNET_BLUE,
  },
  scrollContainer: {
    padding: 20,
    paddingTop: 180,
  },
  centerContent: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 20,
    color: '#fff',
    fontSize: 16,
  },
  header: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    backgroundColor: SHOPNET_BLUE,
    zIndex: 1000,
    padding: 20,
    justifyContent: 'flex-end',
    paddingBottom: 15,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
      },
      android: {
        elevation: 5,
      },
    }),
  },
  titleContainer: { alignItems: 'center' },
  title: {
    fontWeight: '800',
    color: '#fff',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.8)',
    textAlign: 'center',
    paddingHorizontal: 20,
    lineHeight: 20,
  },
  card: {
    backgroundColor: 'rgba(30, 42, 59, 0.9)',
    borderRadius: 12,
    padding: 20,
    marginBottom: 24,
    borderLeftWidth: 4,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4 },
      android: { elevation: 3 },
    }),
  },
  cardHeader: { marginBottom: 20 },
  iconTitleContainer: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  iconContainer: { marginRight: 12 },
  boutiqueType: { fontSize: 22, fontWeight: '800', marginBottom: 4 },
  price: { fontSize: 18, fontWeight: '700', color: '#fff' },
  description: { fontSize: 16, color: 'rgba(255, 255, 255, 0.8)', lineHeight: 22 },
  featuresContainer: { marginBottom: 20 },
  limitationsContainer: { marginBottom: 20 },
  sectionTitle: { fontSize: 18, fontWeight: '700', color: '#fff', marginBottom: 12 },
  featureItem: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 10 },
  limitationItem: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 10 },
  featureText: { fontSize: 15, color: 'rgba(255, 255, 255, 0.9)', marginLeft: 10, flex: 1, lineHeight: 20 },
  limitationText: { fontSize: 15, color: 'rgba(255, 255, 255, 0.6)', marginLeft: 10, flex: 1, lineHeight: 20, textDecorationLine: 'line-through' },
  button: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 14, paddingHorizontal: 20, borderRadius: 8 },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '700', marginRight: 8 },
  buttonIcon: { marginTop: 2 },
  footer: { marginTop: 10, padding: 15, backgroundColor: 'rgba(255, 255, 255, 0.05)', borderRadius: 8 },
  footerText: { color: 'rgba(255, 255, 255, 0.7)', fontSize: 14, textAlign: 'center' },
});
