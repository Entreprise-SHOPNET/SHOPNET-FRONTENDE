

// app/(tabs)/Auth/AssistantIA/AssistantIA.tsx
import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  SafeAreaView,
  Keyboard,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useLanguage } from '../../../../context/LanguageContext';
import { useTheme } from '../../../../app/theme/ThemeContext';

const API_URL = 'https://shopnet-backend.onrender.com/api/ai/assistant';
const STORAGE_KEY = 'SHOPNET_ASSISTANT_MESSAGES';
const CACHE_DURATION_MS = 24 * 60 * 60 * 1000; // 24 heures

interface Message {
  id: string;
  text: string;
  isUser: boolean;
  timestamp: number;
}

export default function AssistantAI() {
  const router = useRouter();
  const { language } = useLanguage();
  const fr = language === 'fr';
  const { isDark } = useTheme();

  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const flatListRef = useRef<FlatList>(null);
  const [token, setToken] = useState<string | null>(null);

  const getWelcomeMessage = (): Message => ({
    id: 'welcome',
    text: fr
      ? '👋 Bonjour ! Je suis l\'assistant SHOPNET. Je peux vous aider à vendre ou acheter sur notre marketplace. Posez-moi votre question !'
      : '👋 Hello! I am SHOPNET assistant. I can help you sell or buy on our marketplace. Ask me your question!',
    isUser: false,
    timestamp: Date.now(),
  });

  useEffect(() => {
    const loadMessages = async () => {
      try {
        const stored = await AsyncStorage.getItem(STORAGE_KEY);
        if (stored) {
          const parsed: Message[] = JSON.parse(stored);
          const now = Date.now();
          const lastMessageTimestamp = parsed[parsed.length - 1]?.timestamp || 0;
          const isValid = now - lastMessageTimestamp < CACHE_DURATION_MS;
          if (isValid && parsed.length > 0) {
            setMessages(parsed);
            return;
          }
        }
        setMessages([getWelcomeMessage()]);
      } catch (error) {
        console.error('Erreur chargement cache:', error);
        setMessages([getWelcomeMessage()]);
      }
    };
    loadMessages();
  }, []);

  useEffect(() => {
    if (messages.length > 0) {
      AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(messages)).catch(console.error);
    }
  }, [messages]);

  useEffect(() => {
    const getToken = async () => {
      try {
        const storedToken = await AsyncStorage.getItem('userToken');
        if (storedToken) setToken(storedToken);
      } catch (error) {
        console.error('Erreur token:', error);
      }
    };
    getToken();
  }, []);

  useEffect(() => {
    if (flatListRef.current && messages.length > 0) {
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [messages]);

  const sendMessage = async () => {
    if (!inputText.trim()) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      text: inputText.trim(),
      isUser: true,
      timestamp: Date.now(),
    };
    setMessages((prev) => [...prev, userMessage]);
    setInputText('');
    Keyboard.dismiss();

    setIsLoading(true);

    try {
      if (!token) {
        throw new Error(fr ? 'Non authentifié' : 'Not authenticated');
      }

      const response = await fetch(API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ message: inputText.trim() }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || data.message || 'Erreur IA');
      }

      const botMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: data.response,
        isUser: false,
        timestamp: Date.now(),
      };
      setMessages((prev) => [...prev, botMessage]);
    } catch (error: any) {
      console.error('Erreur assistant:', error);
      Alert.alert(
        fr ? 'Erreur' : 'Error',
        fr
          ? 'Impossible de contacter l\'assistant. Vérifiez votre connexion.'
          : 'Unable to reach the assistant. Check your connection.'
      );
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: fr
          ? '❌ Désolé, une erreur est survenue. Veuillez réessayer plus tard.'
          : '❌ Sorry, an error occurred. Please try again later.',
        isUser: false,
        timestamp: Date.now(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const formatTime = (timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const renderMessage = ({ item }: { item: Message }) => (
    <View
      style={[
        styles.messageRow,
        item.isUser ? styles.userRow : styles.botRow,
      ]}
    >
      {!item.isUser && (
        <View style={styles.botAvatar}>
          <MaterialCommunityIcons name="robot" size={20} color="#FFFFFF" />
        </View>
      )}
      <View
        style={[
          styles.messageBubble,
          item.isUser ? styles.userBubble : styles.botBubble,
        ]}
      >
        <Text style={[styles.messageText, item.isUser && styles.userText]}>
          {item.text}
        </Text>
        <Text style={styles.timestamp}>{formatTime(item.timestamp)}</Text>
      </View>
      {item.isUser && (
        <View style={styles.userAvatar}>
          <Ionicons name="person" size={18} color="#FFFFFF" />
        </View>
      )}
    </View>
  );

  const COLORS = {
    background: isDark ? '#0D0D0D' : '#00182A',
    surface: isDark ? '#1A1A1A' : 'rgba(30, 42, 59, 0.9)',
    inputBg: isDark ? '#222222' : 'rgba(30, 42, 59, 0.5)',
    inputBorder: isDark ? '#2E2E2E' : 'rgba(66, 165, 245, 0.1)',
    text: isDark ? '#F5F5F5' : '#FFFFFF',
    textSecondary: isDark ? '#B0B0B0' : '#A0AEC0',
    accent: '#42A5F5',
    userBubble: '#42A5F5',
    botBubble: isDark ? '#2C3A4A' : 'rgba(30, 42, 59, 0.8)',
    botAvatar: '#FFA726',
    userAvatar: '#4CAF50',
    border: isDark ? '#2E2E2E' : 'rgba(66, 165, 245, 0.1)',
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: COLORS.background }]}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        {/* Header */}
        <View style={[styles.header, { borderBottomColor: COLORS.border }]}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="chevron-back" size={28} color={COLORS.accent} />
          </TouchableOpacity>
          <View style={styles.headerCenter}>
            <MaterialCommunityIcons name="robot" size={24} color={COLORS.accent} />
            <Text style={[styles.headerTitle, { color: COLORS.text }]}>
              {fr ? 'Assistant IA SHOPNET' : 'SHOPNET AI Assistant'}
            </Text>
          </View>
          <View style={styles.headerRight} />
        </View>

        {/* Messages */}
        <FlatList
          ref={flatListRef}
          data={messages}
          renderItem={renderMessage}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.messagesList}
          showsVerticalScrollIndicator={false}
          initialNumToRender={15}
        />

        {/* Zone de saisie */}
        <View style={[styles.inputContainer, { borderTopColor: COLORS.border }]}>
          <View style={[styles.inputWrapper, { backgroundColor: COLORS.inputBg, borderColor: COLORS.inputBorder }]}>
            <TextInput
              style={[styles.input, { color: COLORS.text }]}
              placeholder={fr ? 'Posez votre question...' : 'Ask your question...'}
              placeholderTextColor={COLORS.textSecondary}
              value={inputText}
              onChangeText={setInputText}
              multiline
              maxLength={500}
            />
            <TouchableOpacity
              style={[styles.sendButton, (!inputText.trim() || isLoading) && styles.sendButtonDisabled]}
              onPress={sendMessage}
              disabled={!inputText.trim() || isLoading}
            >
              {isLoading ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Ionicons name="send" size={20} color="#FFFFFF" />
              )}
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  flex: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerCenter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  headerRight: {
    width: 40,
  },
  messagesList: {
    paddingBottom: 20,
    // Supprimer le padding horizontal pour que les messages IA prennent toute la largeur
  },
  messageRow: {
    flexDirection: 'row',
    marginBottom: 16,
    alignItems: 'flex-end',
    // Pas de padding horizontal pour que l'IA occupe 100%
  },
  userRow: {
    justifyContent: 'flex-end',
    paddingRight: 12, // petit retrait pour aérer à droite
  },
  botRow: {
    justifyContent: 'flex-start',
    // L'IA occupera toute la largeur, donc pas de marge gauche
  },
  messageBubble: {
    padding: 12,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  // Message utilisateur : largeur max 80%, aligné à droite
  userBubble: {
    backgroundColor: '#42A5F5',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 4,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    maxWidth: '80%',
  },
  // Message IA : occupe toute la largeur restante (sans marge)
  botBubble: {
    backgroundColor: 'rgba(30, 42, 59, 0.8)',
    borderTopLeftRadius: 4,
    borderTopRightRadius: 20,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    flex: 1, // Prend tout l'espace disponible
    marginRight: 12, // Petit retrait à droite pour ne pas coller au bord
  },
  messageText: {
    fontSize: 15,
    lineHeight: 20,
    color: '#FFFFFF',
  },
  userText: {
    color: '#FFFFFF',
  },
  timestamp: {
    fontSize: 10,
    color: 'rgba(255,255,255,0.6)',
    marginTop: 4,
    alignSelf: 'flex-end',
  },
  userAvatar: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#4CAF50',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  botAvatar: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#FFA726',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  inputContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 30,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 6,
  },
  input: {
    flex: 1,
    fontSize: 16,
    maxHeight: 100,
    paddingVertical: 8,
  },
  sendButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#42A5F5',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  sendButtonDisabled: {
    opacity: 0.5,
  },
});