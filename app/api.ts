



/**
 * api.ts
 * Client HTTP Axios configuré pour ajouter automatiquement
 * le token JWT dans les headers Authorization de chaque requête.
 */

import axios from 'axios';
import { getAuthToken } from './auth';

// Determine the base URL from environment or use default
const getBaseURL = () => {
  // For Expo web, we can use process.env
  if (typeof process !== 'undefined' && process.env.EXPO_PUBLIC_API_URL) {
    return process.env.EXPO_PUBLIC_API_URL;
  }
  // Default backend URL
  return 'https://shopnet-backend.onrender.com/api';
};

// Crée un client axios avec la base URL de ton backend
const api = axios.create({
  baseURL: getBaseURL(),
});

// Intercepteur qui ajoute le token JWT à chaque requête HTTP si disponible
api.interceptors.request.use(
  async (config: any) => {
    const token = await getAuthToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error: any) => {
    return Promise.reject(error);
  }
);

export default api;
