import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Linking,
  LayoutAnimation,
  Platform,
  UIManager,
} from "react-native";
import { LifeBuoy, Mail, MessageCircle } from "lucide-react-native";

// Enable LayoutAnimation on Android
if (Platform.OS === "android") {
  UIManager.setLayoutAnimationEnabledExperimental?.(true);
}

// SHOPNET color palette
const SHOPNET_BLUE = "#00182A";
const PRO_BLUE = "#42A5F5";
const TEXT_WHITE = "#FFFFFF";
const TEXT_SECONDARY = "#A0AEC0";
const CARD_BG = "#1E2A3B";

const Support = () => {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  const faqData = [
    {
      question: "Comment booster un produit ?",
      answer:
        "Allez dans votre produit, cliquez sur Booster et suivez les instructions de paiement.",
    },
    {
      question: "Comment créer une boutique Premium ?",
      answer:
        "Rendez-vous dans l’onglet Boutique et activez l’option Boutique Premium.",
    },
    {
      question: "Comment publier un produit ?",
      answer:
        "Cliquez sur le bouton Publier et remplissez les informations demandées.",
    },
    {
      question: "Comment contacter un vendeur ?",
      answer:
        "Cliquez sur le produit puis utilisez le bouton WhatsApp pour discuter directement.",
    },
  ];

  const toggleFAQ = (index: number) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setActiveIndex(activeIndex === index ? null : index);
  };

  const openWhatsApp = (phone: string) => {
    const message = `
Bonjour SHOPNET,

Nom :
Email :
Problème rencontré :

Merci.
`;
    const url = `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
    Linking.openURL(url);
  };

  const sendEmail = (email: string) => {
    const subject = "Support SHOPNET";
    const body = `
Bonjour SHOPNET,

Nom :
Problème rencontré :

Merci.
`;
    const url = `mailto:${email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    Linking.openURL(url);
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
    >
      {/* Header */}
      <View style={styles.header}>
        <LifeBuoy size={40} color={PRO_BLUE} />
        <Text style={styles.title}>Aide & Support</Text>
        <Text style={styles.subtitle}>
          Besoin d’assistance ? Notre équipe est là pour vous aider.
        </Text>
      </View>

      {/* FAQ Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Questions fréquentes</Text>
        {faqData.map((item, index) => (
          <View key={index} style={styles.faqItem}>
            <TouchableOpacity onPress={() => toggleFAQ(index)}>
              <Text style={styles.question}>{item.question}</Text>
            </TouchableOpacity>
            {activeIndex === index && (
              <Text style={styles.answer}>{item.answer}</Text>
            )}
          </View>
        ))}
      </View>

      {/* Contact Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Contacter le Support</Text>

        {/* WhatsApp Button */}
        <TouchableOpacity
          style={styles.whatsappButton}
          onPress={() => openWhatsApp("243896037137")} // 0896037137 sans le 0
          activeOpacity={0.8}
        >
          <MessageCircle size={20} color={TEXT_WHITE} />
          <Text style={styles.buttonText}>Contacter par WhatsApp</Text>
        </TouchableOpacity>

        {/* Email Button */}
        <TouchableOpacity
          style={styles.emailButton}
          onPress={() => sendEmail("entrepriseshopia@gmail.com")}
          activeOpacity={0.8}
        >
          <Mail size={20} color={TEXT_WHITE} />
          <Text style={styles.buttonText}>Contacter par Email</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
};

export default Support;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: SHOPNET_BLUE,
  },
  contentContainer: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  header: {
    alignItems: "center",
    marginVertical: 30,
  },
  title: {
    fontSize: 22,
    fontWeight: "bold",
    marginTop: 10,
    color: TEXT_WHITE,
  },
  subtitle: {
    textAlign: "center",
    color: TEXT_SECONDARY,
    marginTop: 5,
  },
  section: {
    marginTop: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 10,
    color: TEXT_WHITE,
  },
  faqItem: {
    backgroundColor: CARD_BG,
    padding: 15,
    borderRadius: 8,
    marginBottom: 10,
  },
  question: {
    fontWeight: "600",
    color: TEXT_WHITE,
  },
  answer: {
    marginTop: 8,
    color: TEXT_SECONDARY,
  },
  whatsappButton: {
    backgroundColor: "#25D366", // WhatsApp green
    padding: 15,
    borderRadius: 10,
    alignItems: "center",
    marginTop: 10,
    flexDirection: "row",
    justifyContent: "center",
    gap: 8,
  },
  emailButton: {
    backgroundColor: PRO_BLUE,
    padding: 15,
    borderRadius: 10,
    alignItems: "center",
    marginTop: 10,
    flexDirection: "row",
    justifyContent: "center",
    gap: 8,
  },
  buttonText: {
    color: TEXT_WHITE,
    fontWeight: "bold",
    fontSize: 16,
  },
});
