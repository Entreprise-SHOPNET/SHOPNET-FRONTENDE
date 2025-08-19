


// services/notificationService.ts
import { Audio } from 'expo-av';
import io from 'socket.io-client';
import { getCurrentUser, getValidToken } from '../app/(tabs)/Auth/authService';

const API_URL = 'http://100.64.134.89:5000';

class NotificationService {
  private static instance: NotificationService;
  private socket: any = null;
  private sound: Audio.Sound | null = null;

  private constructor() {}

  static getInstance() {
    if (!NotificationService.instance) {
      NotificationService.instance = new NotificationService();
    }
    return NotificationService.instance;
  }

  async initSocket() {
    const user = await getCurrentUser();
    if (!user?.id) return;

    const token = await getValidToken();

    this.socket = io(API_URL, {
      transports: ['websocket'],
      auth: {
        token: `Bearer ${token}`,
      },
    });

    this.socket.on('connect', () => {
      console.log('✅ Global socket connecté');
      this.socket.emit('registerVendor', user.id);
    });

    this.socket.on('newOrder', (payload: any) => {
      console.log('📦 Nouvelle commande reçue :', payload);
      this.playSound();
      this.showSystemNotification(payload.message || "Nouvelle commande reçue !");
    });

    this.socket.on('disconnect', () => {
      console.log('🚫 Socket global déconnecté');
    });

    await this.loadSound();
  }

  async loadSound() {
    try {
      const { sound } = await Audio.Sound.createAsync(
        require('@/assets/sounds/success-sound.mp3')
      );
      this.sound = sound;
    } catch (error) {
      console.error("Erreur lors du chargement du son :", error);
    }
  }

  playSound() {
    if (this.sound) {
      this.sound.replayAsync();
    }
  }

  showSystemNotification(message: string) {
    // Remplace l'alerte classique par la bannière visuelle iPhone
    if (globalThis?.triggerBanner && typeof globalThis.triggerBanner === 'function') {
      globalThis.triggerBanner(message);
    } else {
      console.warn("⚠️ triggerBanner n'est pas défini dans globalThis.");
    }
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
    }
  }
}

export const notificationService = NotificationService.getInstance();
