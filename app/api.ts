


/**
 * api.ts
 * Client HTTP Axios configuré pour ajouter automatiquement
 * le token JWT dans les headers Authorization de chaque requête.
 */

import axios from 'axios';
import { getAuthToken } from './auth'; // Assure-toi que le chemin est correct

// Crée un client axios avec la base URL de ton backend
const api = axios.create({
  baseURL: 'http://100.64.134.89:5000/api', // Remplace par l’URL de ton backend
});

// Intercepteur qui ajoute le token JWT à chaque requête HTTP si disponible
api.interceptors.request.use(
  async (config) => {
    const token = await getAuthToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

export default api;
