

// app/(tabs)/Auth/HelpCenter/HelpCenter.tsx
import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  ScrollView,
  StatusBar,
  TextInput,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Keyboard,
  Alert,
  Animated,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons, MaterialIcons, FontAwesome5 } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTheme } from '../../../../app/theme/ThemeContext';
import { useLanguage } from '../../../../context/LanguageContext';

const SHOPNET_BLUE = "#00182A";
const ACCENT = "#42A5F5";
const TEXT_PRIMARY = "#FFFFFF";
const TEXT_SECONDARY = "#A0AEC0";
const CARD_BACKGROUND = "rgba(30, 42, 59, 0.9)";
const BORDER_COLOR = "rgba(66, 165, 245, 0.1)";

// URL de l'API (à adapter selon votre serveur)
const API_URL = 'https://shopnet-backend.onrender.com/api/ai/help-center';

// Catégories et questions pré-remplies
const HELP_CATEGORIES = [
  {
    id: 'account',
    icon: 'person-circle',
    label: 'Compte & Profil',
    questions: [
      'Comment créer un compte SHOPNET ?',
      'Comment modifier mes informations personnelles ?',
      'Comment changer mon mot de passe ?',
      'Comment supprimer mon compte ?',
    ],
  },
  {
    id: 'orders',
    icon: 'cart',
    label: 'Commandes',
    questions: [
      'Comment passer une commande ?',
      'Comment suivre ma commande ?',
      'Que faire si je ne reçois pas ma commande ?',
      'Puis-je annuler une commande ?',
    ],
  },
  {
    id: 'payments',
    icon: 'card',
    label: 'Paiements',
    questions: [
      'Quels moyens de paiement sont acceptés ?',
      'Comment ajouter une carte de paiement ?',
      'Comment obtenir un remboursement ?',
      'Le paiement est sécurisé ?',
    ],
  },
  {
    id: 'selling',
    icon: 'storefront',
    label: 'Vente & Boutique',
    questions: [
      'Comment publier un produit ?',
      'Comment booster un produit ?',
      'Comment gérer mes stocks ?',
      'Comment devenir vendeur premium ?',
    ],
  },
  {
    id: 'delivery',
    icon: 'truck',
    label: 'Livraison',
    questions: [
      'Quels sont les délais de livraison ?',
      'Comment suivre ma livraison ?',
      'Que faire en cas de problème de livraison ?',
    ],
  },
  {
    id: 'security',
    icon: 'shield-checkmark',
    label: 'Sécurité & Confidentialité',
    questions: [
      'Comment sécuriser mon compte ?',
      'Que faire en cas de tentative de fraude ?',
      'SHOPNET protège-t-il mes données ?',
    ],
  },
  {
    id: 'general',
    icon: 'help-circle',
    label: 'Général',
    questions: [
      'Qu’est-ce que SHOPNET ?',
      'Comment contacter le support ?',
      'Où trouver les conditions d’utilisation ?',
      'Comment signaler un problème ?',
    ],
  },
];

export default function HelpCenter() {
  const router = useRouter();
  const { language } = useLanguage();
  const fr = language === 'fr';
  const { isDark } = useTheme();

  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [response, setResponse] = useState<string | null>(null);
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const scrollViewRef = useRef<ScrollView>(null);
  const fadeAnim = useRef(new Animated.Value(0)).current;

  const COLORS = {
    background: isDark ? '#0D0D0D' : SHOPNET_BLUE,
    surface: isDark ? '#1A1A1A' : CARD_BACKGROUND,
    border: isDark ? '#2E2E2E' : BORDER_COLOR,
    text: isDark ? '#F5F5F5' : TEXT_PRIMARY,
    textSecondary: isDark ? '#B0B0B0' : TEXT_SECONDARY,
    accent: ACCENT,
    inputBg: isDark ? '#222222' : 'rgba(30, 42, 59, 0.5)',
    inputBorder: isDark ? '#2E2E2E' : 'rgba(66, 165, 245, 0.1)',
    placeholder: isDark ? '#888888' : '#A0AEC0',
    card: isDark ? '#1A1A1A' : 'rgba(30, 42, 59, 0.9)',
  };

  useEffect(() => {
    AsyncStorage.getItem('userToken').then(t => setToken(t));
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 500,
      useNativeDriver: true,
    }).start();
  }, []);

  const sendQuestion = async (question: string) => {
    if (!question.trim()) return;
    Keyboard.dismiss();

    setLoading(true);
    setResponse(null);

    try {
      if (!token) {
        Alert.alert(fr ? 'Erreur' : 'Error', fr ? 'Vous devez être connecté' : 'You must be logged in');
        setLoading(false);
        return;
      }

      const payload = {
        message: question.trim(),
        userContext: { language: fr ? 'fr' : 'en' },
      };

      const res = await fetch(API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || data.message || 'Erreur IA');
      }

      setResponse(data.response);
      // Réinitialiser la recherche pour afficher la réponse
      setSearchQuery('');
    } catch (error: any) {
      Alert.alert(
        fr ? 'Erreur' : 'Error',
        error.message || fr ? 'Impossible de contacter le centre d’aide' : 'Unable to reach help center'
      );
    } finally {
      setLoading(false);
    }
  };

  const toggleCategory = (id: string) => {
    setExpandedCategory(prev => (prev === id ? null : id));
  };

  const renderCategory = (category: typeof HELP_CATEGORIES[0]) => {
    const isExpanded = expandedCategory === category.id;
    return (
      <View key={category.id} style={[styles.categoryContainer, { backgroundColor: COLORS.surface, borderColor: COLORS.border }]}>
        <TouchableOpacity
          style={styles.categoryHeader}
          onPress={() => toggleCategory(category.id)}
          activeOpacity={0.7}
        >
          <View style={styles.categoryHeaderLeft}>
            <Ionicons name={category.icon as any} size={24} color={COLORS.accent} />
            <Text style={[styles.categoryLabel, { color: COLORS.text }]}>{category.label}</Text>
          </View>
          <Ionicons
            name={isExpanded ? 'chevron-up' : 'chevron-down'}
            size={22}
            color={COLORS.textSecondary}
          />
        </TouchableOpacity>

        {isExpanded && (
          <View style={styles.questionsList}>
            {category.questions.map((q, idx) => (
              <TouchableOpacity
                key={idx}
                style={[styles.questionItem, { borderBottomColor: COLORS.border }]}
                onPress={() => sendQuestion(q)}
              >
                <Text style={[styles.questionText, { color: COLORS.text }]}>{q}</Text>
                <Ionicons name="arrow-forward" size={18} color={COLORS.accent} />
              </TouchableOpacity>
            ))}
          </View>
        )}
      </View>
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: COLORS.background }]}>
      <StatusBar backgroundColor={COLORS.background} barStyle="light-content" />

      {/* Header */}
      <View style={[styles.header, { borderBottomColor: COLORS.border }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: COLORS.text }]}>
          {fr ? 'Centre d\'aide' : 'Help Center'}
        </Text>
        <View style={{ width: 40 }} />
      </View>

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        <ScrollView
          ref={scrollViewRef}
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Zone de saisie */}
          <View style={[styles.inputContainer, { backgroundColor: COLORS.surface, borderColor: COLORS.border }]}>
            <Text style={[styles.inputLabel, { color: COLORS.textSecondary }]}>
              {fr ? 'Posez votre question ici' : 'Ask your question here'}
            </Text>
            <View style={[styles.inputWrapper, { backgroundColor: COLORS.inputBg, borderColor: COLORS.inputBorder }]}>
              <TextInput
                style={[styles.input, { color: COLORS.text }]}
                placeholder={fr ? 'Ex: Comment passer une commande ?' : 'Ex: How to place an order?'}
                placeholderTextColor={COLORS.placeholder}
                value={searchQuery}
                onChangeText={setSearchQuery}
                onSubmitEditing={() => sendQuestion(searchQuery)}
                returnKeyType="send"
              />
              <TouchableOpacity
                style={[styles.sendButton, { backgroundColor: COLORS.accent }]}
                onPress={() => sendQuestion(searchQuery)}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Ionicons name="send" size={20} color="#FFFFFF" />
                )}
              </TouchableOpacity>
            </View>
          </View>

          {/* Réponse de l'IA */}
          {response && (
            <Animated.View style={[styles.responseContainer, { opacity: fadeAnim, backgroundColor: COLORS.card, borderColor: COLORS.border }]}>
              <View style={styles.responseHeader}>
                <FontAwesome5 name="robot" size={20} color={COLORS.accent} />
                <Text style={[styles.responseTitle, { color: COLORS.text }]}>
                  {fr ? 'Réponse' : 'Answer'}
                </Text>
              </View>
              <Text style={[styles.responseText, { color: COLORS.text }]}>{response}</Text>
              <TouchableOpacity
                style={[styles.clearResponseButton, { borderColor: COLORS.border }]}
                onPress={() => setResponse(null)}
              >
                <Text style={[styles.clearResponseText, { color: COLORS.textSecondary }]}>
                  {fr ? 'Effacer la réponse' : 'Clear answer'}
                </Text>
              </TouchableOpacity>
            </Animated.View>
          )}

          {/* Catégories et questions */}
          <Text style={[styles.sectionTitle, { color: COLORS.text }]}>
            {fr ? 'Catégories d’aide' : 'Help categories'}
          </Text>
          <View style={styles.categoriesWrapper}>
            {HELP_CATEGORIES.map(renderCategory)}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  flex: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  backButton: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },
  headerTitle: { fontSize: 20, fontWeight: '700' },
  scrollView: { flex: 1 },
  scrollContent: { paddingHorizontal: 16, paddingVertical: 20, paddingBottom: 40 },
  inputContainer: {
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 8,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 12,
  },
  input: {
    flex: 1,
    fontSize: 16,
    paddingVertical: 12,
  },
  sendButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  responseContainer: {
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    marginBottom: 20,
  },
  responseHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 8,
  },
  responseTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  responseText: {
    fontSize: 15,
    lineHeight: 22,
  },
  clearResponseButton: {
    alignSelf: 'flex-start',
    marginTop: 12,
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: 20,
    borderWidth: 1,
  },
  clearResponseText: {
    fontSize: 13,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 16,
    letterSpacing: 0.5,
  },
  categoriesWrapper: {
    gap: 12,
  },
  categoryContainer: {
    borderRadius: 12,
    borderWidth: 1,
    overflow: 'hidden',
  },
  categoryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  categoryHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  categoryLabel: {
    fontSize: 16,
    fontWeight: '600',
  },
  questionsList: {
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  questionItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  questionText: {
    fontSize: 14,
    flex: 1,
    marginRight: 12,
  },
});