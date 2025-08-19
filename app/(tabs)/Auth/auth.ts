

// auth.ts
import AsyncStorage from '@react-native-async-storage/async-storage';

export const saveUserId = async (id: string) => {
  try {
    await AsyncStorage.setItem('user_id', id);
  } catch (error) {
    console.error("Erreur en sauvegardant l'ID :", error);
  }
};

export const getUserId = async () => {
  try {
    const id = await AsyncStorage.getItem('user_id');
    return id;
  } catch (error) {
    console.error("Erreur en récupérant l'ID :", error);
    return null;
  }
};

export const removeUserId = async () => {
  try {
    await AsyncStorage.removeItem('user_id');
  } catch (error) {
    console.error("Erreur en supprimant l'ID :", error);
  }
};
