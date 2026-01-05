
import React, { useEffect } from 'react';
import { View, Text, Alert } from 'react-native';
import io from 'socket.io-client';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getValidToken } from '../authService';


// Production (Render)
const SOCKET_URL = 'https://shopnet-backend.onrender.com';

// Local (développement)
// const SOCKET_URL = 'http://100.64.134.89:5000';

export default function VendeurDashboard() {
  useEffect(() => {
    const setupSocket = async () => {
      const token = await getValidToken();
      if (!token) return;

      // Décoder le token pour récupérer le vendeur_id
      const payload = JSON.parse(atob(token.split('.')[1]));
      const vendeur_id = payload.id;

      const socket = io(SOCKET_URL, {
        transports: ['websocket'],
      });

      socket.on('connect', () => {
        console.log('✅ Connecté à Socket.IO');
        // Rejoindre la room correspondant à ce vendeur
        socket.emit('joinRoom', `user_${vendeur_id}`);
      });

      socket.on('nouvelle_commande', (data) => {
        console.log('📦 Nouvelle commande :', data);
        Alert.alert(
          'Nouvelle commande',
          data.message || 'Vous avez reçu une nouvelle commande'
        );
      });

      socket.on('disconnect', () => {
        console.log('❌ Déconnecté de Socket.IO');
      });

      return () => {
        socket.disconnect();
      };
    };

    setupSocket();
  }, []);

  return (
    <View>
      <Text style={{ color: '#fff' }}>Bienvenue sur votre Dashboard Vendeur</Text>
    </View>
  );
}
