


import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Linking, Alert } from 'react-native';
import { FontAwesome, MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

// On calcule la date cible à 150 jours à partir d'aujourd'hui (5 mois environ)
const getCountdownTargetDate = () => {
  const now = new Date();
  const target = new Date(now);
  target.setDate(target.getDate() + 150); // Ajoute 150 jours
  return target;
};

const ComingSoonPage = () => {
  const router = useRouter();
  const [countdownTargetDate] = useState(getCountdownTargetDate());
  const [timeLeft, setTimeLeft] = useState(getTimeLeft(countdownTargetDate));

  function getTimeLeft(targetDate: Date) {
    const now = new Date();
    const difference = targetDate.getTime() - now.getTime();

    if (difference <= 0) return null;

    return {
      days: Math.floor(difference / (1000 * 60 * 60 * 24)),
      hours: Math.floor((difference / (1000 * 60 * 60)) % 24),
      minutes: Math.floor((difference / (1000 * 60)) % 60),
      seconds: Math.floor((difference / 1000) % 60),
    };
  }

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft(getTimeLeft(countdownTargetDate));
    }, 1000);
    return () => clearInterval(timer);
  }, [countdownTargetDate]);

  const handleContactSupport = async () => {
    const phoneNumber = '243896037137';
    const message = "Bonjour, je souhaite avoir plus d'informations sur la fonctionnalité à venir dans SHOPNET.";
    const url = `https://wa.me/${phoneNumber}?text=${encodeURIComponent(message)}`;

    const supported = await Linking.canOpenURL(url);
    if (supported) await Linking.openURL(url);
    else Alert.alert('Erreur', 'Impossible d’ouvrir WhatsApp. Veuillez vérifier que vous avez WhatsApp installé.');
  };

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <View style={styles.iconContainer}>
          <FontAwesome name="rocket" size={40} color="#4CB050" />
        </View>

        <Text style={styles.title}>Fonctionnalité à venir!</Text>

        <Text style={styles.message}>
          Cette fonctionnalité passionnante est en cours de développement et sera disponible dans la prochaine version de SHOPNET.
        </Text>

        {timeLeft ? (
          <View style={styles.countdownContainer}>
            <View style={styles.timeBox}>
              <Text style={styles.timeValue}>{timeLeft.days}</Text>
              <Text style={styles.timeLabel}>Jours</Text>
            </View>
            <View style={styles.timeBox}>
              <Text style={styles.timeValue}>{timeLeft.hours}</Text>
              <Text style={styles.timeLabel}>Heures</Text>
            </View>
            <View style={styles.timeBox}>
              <Text style={styles.timeValue}>{timeLeft.minutes}</Text>
              <Text style={styles.timeLabel}>Minutes</Text>
            </View>
            <View style={styles.timeBox}>
              <Text style={styles.timeValue}>{timeLeft.seconds}</Text>
              <Text style={styles.timeLabel}>Secondes</Text>
            </View>
          </View>
        ) : (
          <Text style={styles.launchedText}>La version 2 est maintenant disponible ! 🎉</Text>
        )}

        <View style={styles.featureIcons}>
          <View style={styles.featureIconItem}>
            <FontAwesome name="bolt" size={24} color="#4CB050" />
            <Text style={styles.featureText}>Performances améliorées</Text>
          </View>
          <View style={styles.featureIconItem}>
            <FontAwesome name="magic" size={24} color="#4CB050" />
            <Text style={styles.featureText}>Nouvelles fonctionnalités</Text>
          </View>
          <View style={styles.featureIconItem}>
            <FontAwesome name="smile-o" size={24} color="#4CB050" />
            <Text style={styles.featureText}>Expérience optimisée</Text>
          </View>
        </View>

        <TouchableOpacity style={styles.contactButton} onPress={handleContactSupport}>
          <MaterialIcons name="contact-support" size={24} color="white" />
          <Text style={styles.contactButtonText}>Contacter le support</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Text style={styles.backButtonText}>Retour à l'accueil</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.footer}>
        <Text style={styles.footerText}>SHOPNET v2.0 - Bientôt disponible</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#202A36',
    justifyContent: 'space-between',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 30,
  },
  iconContainer: {
    backgroundColor: 'rgba(76, 192, 80, 0.15)',
    width: 90,
    height: 90,
    borderRadius: 100,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#4CB050',
    textAlign: 'center',
    marginBottom: 15,
  },
  message: {
    fontSize: 14,
    color: '#b0bec5',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 20,
  },
  countdownContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
    marginBottom: 30,
  },
  timeBox: {
    alignItems: 'center',
    paddingHorizontal: 6,
  },
  timeValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#4CB050',
  },
  timeLabel: {
    fontSize: 10,
    color: '#cfd8dc',
    marginTop: 2,
  },
  launchedText: {
    fontSize: 16,
    color: '#4CB050',
    fontWeight: '600',
    marginBottom: 30,
    textAlign: 'center',
  },
  featureIcons: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
    marginBottom: 30,
  },
  featureIconItem: {
    alignItems: 'center',
    width: '30%',
  },
  featureText: {
    marginTop: 6,
    textAlign: 'center',
    color: '#cfd8dc',
    fontSize: 12,
  },
  contactButton: {
    flexDirection: 'row',
    backgroundColor: '#4CB050',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 50,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  contactButtonText: {
    color: 'white',
    fontSize: 15,
    fontWeight: '600',
    marginLeft: 10,
  },
  backButton: {
    padding: 15,
  },
  backButtonText: {
    color: '#4CB050',
    fontSize: 14,
    fontWeight: '500',
    textDecorationLine: 'underline',
  },
  footer: {
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#37474f',
    alignItems: 'center',
  },
  footerText: {
    color: '#78909c',
    fontStyle: 'italic',
  },
});

export default ComingSoonPage;
