

import React, { createContext, useState, useEffect, useContext } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

type ThemeColors = {
  background: string;
  card: string;
  text: string;
  textSecondary: string;
  border: string;
  placeholder: string;
  primary: string;
};

type ThemeContextType = {
  theme: {
    colors: ThemeColors;
  };
  isDark: boolean;
  toggleTheme: () => void;
};

// 🎨 Couleurs du thème CLAIR (ultra propre, fond blanc pur)
const LIGHT_THEME: ThemeColors = {
  background: '#F5F6FA',      // Fond très légèrement grisé (plus doux que blanc pur)
  card: '#FFFFFF',             // Cartes blanches
  text: '#1A1A2E',             // Texte presque noir, excellent contraste
  textSecondary: '#6C6C80',    // Texte secondaire gris foncé bien lisible
  border: '#E8E8EC',           // Bordures subtiles
  placeholder: '#F0F0F4',      // Fond placeholder léger
  primary: '#4CAF50',          // Vert SHOPNET
};

// 🎨 Couleurs du thème SOMBRE (ultra sombre, contraste élevé)
const DARK_THEME: ThemeColors = {
  background: '#0D0D0D',       // Fond très sombre (presque noir)
  card: '#1A1A1A',             // Cartes légèrement plus claires que le fond
  text: '#F5F5F5',             // Texte blanc presque pur
  textSecondary: '#B0B0B0',    // Texte secondaire gris clair
  border: '#2E2E2E',           // Bordures subtiles
  placeholder: '#222222',      // Fond placeholder sombre
  primary: '#4CAF50',          // Vert SHOPNET
};

const ThemeContext = createContext<ThemeContextType>({
  theme: { colors: LIGHT_THEME },
  isDark: false,
  toggleTheme: () => {},
});

export const ThemeProvider = ({ children }: { children: React.ReactNode }) => {
  const [isDark, setIsDark] = useState(false);
  const [theme, setTheme] = useState({ colors: LIGHT_THEME });

  // 🔄 Charger le thème sauvegardé
  useEffect(() => {
    const loadTheme = async () => {
      try {
        const savedTheme = await AsyncStorage.getItem("SHOPNET_THEME");
        if (savedTheme === "dark") {
          setIsDark(true);
          setTheme({ colors: DARK_THEME });
        } else {
          setIsDark(false);
          setTheme({ colors: LIGHT_THEME });
        }
      } catch (error) {
        console.warn("⚠️ Erreur chargement thème:", error);
      }
    };
    loadTheme();
  }, []);

  // 💾 Changer et sauvegarder le thème
  const toggleTheme = async () => {
    try {
      const newIsDark = !isDark;
      setIsDark(newIsDark);
      setTheme({ colors: newIsDark ? DARK_THEME : LIGHT_THEME });
      await AsyncStorage.setItem("SHOPNET_THEME", newIsDark ? "dark" : "light");
    } catch (error) {
      console.error("❌ Erreur sauvegarde thème:", error);
    }
  };

  return (
    <ThemeContext.Provider value={{ theme, isDark, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => useContext(ThemeContext);