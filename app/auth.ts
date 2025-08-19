


/**
 * auth.ts
 * Gestion du token JWT dans AsyncStorage
 * 
 * Permet de sauvegarder, récupérer et supprimer le token
 * d’authentification de l’utilisateur dans le stockage local.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Sauvegarde le token JWT dans AsyncStorage
 * @param token Le token JWT à sauvegarder
 */
export const saveAuthToken = async (token: string): Promise<void> => {
  try {
    await AsyncStorage.setItem('auth_token', token);
  } catch (error) {
    console.error("Erreur en sauvegardant le token :", error);
  }
};

/**
 * Récupère le token JWT depuis AsyncStorage
 * @returns Le token JWT ou null s'il n'existe pas
 */
export const getAuthToken = async (): Promise<string | null> => {
  try {
    const token = await AsyncStorage.getItem('auth_token');
    return token;
  } catch (error) {
    console.error("Erreur en récupérant le token :", error);
    return null;
  }
};

/**
 * Supprime le token JWT du stockage local (logout)
 */
export const removeAuthToken = async (): Promise<void> => {
  try {
    await AsyncStorage.removeItem('auth_token');
  } catch (error) {
    console.error("Erreur en supprimant le token :", error);
  }
};
