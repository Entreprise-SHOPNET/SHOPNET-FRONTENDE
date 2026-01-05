

// services/notificationService.ts - VERSION CORRIGÉE
import { Audio } from 'expo-av';
import io, { Socket } from 'socket.io-client';
import { getCurrentUser, getValidToken } from '../app/(tabs)/Auth/authService';

// const API_URL = 'http://100.64.134.89:5000'; // Serveur LOCAL (commenté)
const API_URL = 'https://shopnet-backend.onrender.com'; // Serveur Render (production)


// 🔥 CORRECTION : Interface alignée avec le backend
interface Notification {
  id: number;
  titre: string;
  contenu: string;
  date_notification: string;
  type?: string;
  priorite?: string;
  lien?: string | null;
  read?: boolean;
}

type Listener = (notif: Notification) => void;

class NotificationService {
  private static instance: NotificationService;
  private socket: Socket | null = null;
  private sound: Audio.Sound | null = null;
  private listeners: Listener[] = [];

  private constructor() {}

  static getInstance(): NotificationService {
    if (!NotificationService.instance) {
      NotificationService.instance = new NotificationService();
    }
    return NotificationService.instance;
  }

  async initSocket() {
    if (this.socket && this.socket.connected) {
      console.log('ℹ️ Socket déjà connecté');
      return;
    }

    const token = await getValidToken();
    if (!token) {
      console.warn('⚠️ Aucun token valide — connexion socket annulée');
      return;
    }

    this.socket = io(API_URL, {
      transports: ['websocket'],
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 2000,
      auth: { token: `Bearer ${token}` },
    });

    this.socket.on('connect', async () => {
      console.log('✅ Socket connecté avec ID:', this.socket?.id);
      const user = await getCurrentUser();
      if (user?.id) {
        this.socket?.emit('registerUser', user.id);
        console.log(`🔹 Utilisateur enregistré côté serveur: ${user.id}`);
      }
    });

    // 🔥 CORRECTION : Gestion correcte des notifications globales
    this.socket.on('globalNotification', (payload: any) => {
      console.log('📢 Notification globale reçue:', payload);
      
      // Transformation des données pour correspondre à l'interface
      const normalizedNotification: Notification = {
        id: payload.id || Date.now(),
        titre: payload.titre || 'Notification',
        contenu: payload.contenu || 'Nouvelle notification',
        date_notification: payload.date_notification || new Date().toISOString(),
        type: payload.type || 'info',
        priorite: payload.priorite || 'normale',
        read: false
      };

      console.log('📋 Notification normalisée:', normalizedNotification);
      this.handleNotification(normalizedNotification);
    });

    this.socket.on('disconnect', (reason) => {
      console.warn('🚫 Socket déconnecté:', reason);
    });

    this.socket.on('connect_error', (err) => {
      console.error('❌ Erreur de connexion Socket.IO:', err.message);
    });

    await this.loadSound();
  }

  private handleNotification(notif: Notification) {
    console.log('🔔 Notification traitée:', notif);
    this.playSound();
    
    // 🔥 CORRECTION : Passage de l'objet Notification complet
    this.listeners.forEach((listener) => listener(notif));
    
    if (globalThis.triggerBanner) {
      globalThis.triggerBanner(notif.titre, notif.contenu);
    }
  }

  subscribe(listener: Listener) {
    if (!this.listeners.includes(listener)) {
      this.listeners.push(listener);
      console.log('➕ Listener ajouté. Total:', this.listeners.length);
    }
  }

  unsubscribe(listener: Listener) {
    this.listeners = this.listeners.filter((l) => l !== listener);
    console.log('➖ Listener supprimé. Total:', this.listeners.length);
  }

  async loadSound() {
    try {
      const { sound } = await Audio.Sound.createAsync(
        require('@/assets/sounds/success-sound.mp3')
      );
      this.sound = sound;
      console.log('🎵 Son de notification chargé');
    } catch (error) {
      console.error('❌ Erreur chargement son:', error);
    }
  }

  playSound() {
    this.sound?.replayAsync().catch((err) => console.error('❌ Erreur son:', err));
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      console.log('⚡ Socket déconnecté manuellement');
      this.socket = null;
    }
  }
}

export const notificationService = NotificationService.getInstance();