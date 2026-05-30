


import React, { createContext, useContext, useState, useEffect } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

// 2 langues seulement
type LanguageType = "fr" | "en";

// type du context
type LanguageContextType = {
  language: LanguageType;
  setLanguage: (lang: LanguageType) => Promise<void>;
};

// création du context
const LanguageContext = createContext<LanguageContextType>({
  language: "fr",
  setLanguage: async () => {},
});

// PROVIDER GLOBAL
export const LanguageProvider = ({ children }: { children: React.ReactNode }) => {
  const [language, setLanguageState] = useState<LanguageType>("fr");

  // 🔄 charger langue sauvegardée
  useEffect(() => {
    const loadLanguage = async () => {
      try {
        const saved = await AsyncStorage.getItem("SHOPNET_LANGUAGE");

        if (saved === "fr" || saved === "en") {
          setLanguageState(saved);
        }
      } catch (error) {
        console.log("Erreur chargement langue:", error);
      }
    };

    loadLanguage();
  }, []);

  // 💾 changer langue
  const setLanguage = async (lang: LanguageType) => {
    try {
      setLanguageState(lang);
      await AsyncStorage.setItem("SHOPNET_LANGUAGE", lang);
    } catch (error) {
      console.log("Erreur sauvegarde langue:", error);
    }
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage }}>
      {children}
    </LanguageContext.Provider>
  );
};

// hook facile à utiliser partout
export const useLanguage = () => useContext(LanguageContext);