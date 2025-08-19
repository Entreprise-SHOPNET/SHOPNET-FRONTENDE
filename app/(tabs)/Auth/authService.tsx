


// src/services/AuthService.ts
import AsyncStorage from '@react-native-async-storage/async-storage';
import { jwtDecode } from 'jwt-decode';
import axios from 'axios';

const API_BASE_URL = 'https://shopnet-backend.onrender.com/api';

interface DecodedToken {
  id: number;
  iat: number;
  exp: number;
  role?: string;
  // Ajoutez d'autres champs selon votre besoin
}

// Configuration Axios globale
const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  }
});

// Intercepteur pour ajouter le token aux requêtes
api.interceptors.request.use(async (config) => {
  const token = await getValidToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Gestion des erreurs API
api.interceptors.response.use(
  response => response,
  async (error) => {
    if (error.response?.status === 401) {
      await removeToken();
    }
    return Promise.reject(error);
  }
);

/**
 * Sauvegarde le token JWT dans AsyncStorage
 * @param token Le token JWT à sauvegarder
 * @throws {Error} Si le token est vide ou la sauvegarde échoue
 */
export const saveToken = async (token: string): Promise<void> => {
  if (!token?.trim()) {
    throw new Error('Token invalide: vide ou null');
  }

  try {
    await AsyncStorage.setItem('userToken', token);
    console.log('🔑 Token sauvegardé');
  } catch (error) {
    console.error('Erreur sauvegarde token:', error);
    throw new Error('Échec de la sauvegarde du token');
  }
};

/**
 * Récupère le token depuis AsyncStorage
 * @returns Le token JWT ou null si inexistant/erreur
 */
export const getToken = async (): Promise<string | null> => {
  try {
    return await AsyncStorage.getItem('userToken');
  } catch (error) {
    console.error('Erreur récupération token:', error);
    return null;
  }
};

/**
 * Supprime le token (déconnexion)
 */
export const removeToken = async (): Promise<void> => {
  try {
    await AsyncStorage.removeItem('userToken');
    console.log('🧹 Token supprimé');
  } catch (error) {
    console.error('Erreur suppression token:', error);
    throw error;
  }
};

/**
 * Vérifie si un token JWT est expiré
 * @param token Le token à vérifier
 * @returns true si expiré, false si valide
 */
export const isTokenExpired = (token: string): boolean => {
  try {
    const { exp } = jwtDecode<DecodedToken>(token);
    return Date.now() >= exp * 1000;
  } catch (error) {
    console.error('Erreur décodage token:', error);
    return true;
  }
};

/**
 * Rafraîchit le token expiré
 * @returns Nouveau token ou null en cas d'échec
 */
export const refreshAuthToken = async (): Promise<string | null> => {
  try {
    const oldToken = await getToken();
    if (!oldToken) return null;

    const { data } = await api.post<{ token: string }>('/auth/refresh-token', { 
      token: oldToken 
    });

    if (!data.token) {
      throw new Error('Réponse invalide: token manquant');
    }

    await saveToken(data.token);
    return data.token;
  } catch (error) {
    console.error('Erreur rafraîchissement token:', error);
    await removeToken();
    return null;
  }
};

/**
 * Récupère un token valide (vérifie expiration et rafraîchit si besoin)
 * @returns Token valide ou null
 */
export const getValidToken = async (): Promise<string | null> => {
  const token = await getToken();
  if (!token) return null;

  return isTokenExpired(token) 
    ? await refreshAuthToken() 
    : token;
};

/**
 * Récupère les infos utilisateur depuis le token
 * @returns Les données décodées ou null
 */
export const getCurrentUser = async (): Promise<DecodedToken | null> => {
  const token = await getToken();
  if (!token) return null;

  try {
    return jwtDecode<DecodedToken>(token);
  } catch (error) {
    console.error('Erreur décodage token:', error);
    return null;
  }
};

/**
 * Vérifie si l'utilisateur est authentifié
 * @returns Promise<boolean>
 */
export const checkAuthState = async (): Promise<boolean> => {
  try {
    const token = await getValidToken();
    if (!token) return false;

    // Vérification optionnelle côté serveur
    const { data } = await api.get<{ valid: boolean }>('/auth/verify');
    return data?.valid ?? false;
  } catch (error) {
    console.error('Erreur vérification auth:', error);
    return false;
  }
};

// Exportez l'instance axios configurée
export { api as authApi };