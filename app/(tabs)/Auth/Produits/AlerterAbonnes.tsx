import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Dimensions,
  SafeAreaView,
  StatusBar,
  Image,
  FlatList,
  Animated,
  Modal,
} from 'react-native';
import { useRouter } from 'expo-router';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';

// Couleurs
const SHOPNET_BLUE = '#00182A';
const PRO_BLUE = '#42A5F5';
const WHITE = '#FFFFFF';
const LIGHT_BORDER = '#2A3A4A';
const CARD_BG = '#1A2530';
const TEXT_SECONDARY = '#A0AEC0';
const SUCCESS = '#4CAF50';
const WARNING = '#FFC107';
const { width, height } = Dimensions.get('window');

// Types
type Product = {
  id: number;
  title: string;
  price: string | number;
  images: string[];
  category?: string;
  description?: string;
};

type AICampaign = {
  title: string;
  message: string;
  type: string;
};

type AlertType = 'promotion' | 'nouveau_produit' | 'vente_flash' | 'information';

const BASE_URL = 'https://shopnet-backend.onrender.com';
const CACHE_PRODUCTS_KEY = 'cached_products';
const CACHE_FOLLOWERS_KEY = 'cached_followers_count';
const CACHE_DURATION = 10 * 60 * 1000;

// Cache helpers
const getCachedData = async (key: string) => {
  try {
    const cached = await AsyncStorage.getItem(key);
    if (cached) {
      const { data, timestamp } = JSON.parse(cached);
      if (Date.now() - timestamp < CACHE_DURATION) return data;
    }
  } catch {}
  return null;
};

const setCachedData = async (key: string, data: any) => {
  try {
    await AsyncStorage.setItem(key, JSON.stringify({ data, timestamp: Date.now() }));
  } catch {}
};

// Composant Toast (notification in-app)
const Toast = ({ message, type, visible, onHide }: { message: string; type: 'success' | 'error' | 'info'; visible: boolean; onHide: () => void }) => {
  const translateY = useRef(new Animated.Value(-100)).current;

  useEffect(() => {
    if (visible) {
      Animated.sequence([
        Animated.timing(translateY, { toValue: 0, duration: 300, useNativeDriver: true }),
        Animated.delay(2000),
        Animated.timing(translateY, { toValue: -100, duration: 300, useNativeDriver: true }),
      ]).start(() => onHide());
    }
  }, [visible]);

  if (!visible) return null;

  const backgroundColor = type === 'success' ? SUCCESS : type === 'error' ? '#FF6B6B' : PRO_BLUE;
  const icon = type === 'success' ? 'checkmark-circle' : type === 'error' ? 'alert-circle' : 'information-circle';

  return (
    <Animated.View style={[styles.toastContainer, { transform: [{ translateY }], backgroundColor }]}>
      <Ionicons name={icon} size={20} color={WHITE} />
      <Text style={styles.toastText}>{message}</Text>
    </Animated.View>
  );
};

// Composant de confirmation (modal bottom sheet)
const ConfirmDialog = ({ visible, message, onCancel, onConfirm }: { visible: boolean; message: string; onCancel: () => void; onConfirm: () => void }) => (
  <Modal visible={visible} transparent animationType="fade">
    <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={onCancel}>
      <View style={styles.confirmContainer}>
        <Text style={styles.confirmMessage}>{message}</Text>
        <View style={styles.confirmButtons}>
          <TouchableOpacity style={styles.confirmCancel} onPress={onCancel}>
            <Text style={styles.confirmCancelText}>Annuler</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.confirmSend} onPress={onConfirm}>
            <Text style={styles.confirmSendText}>Envoyer</Text>
          </TouchableOpacity>
        </View>
      </View>
    </TouchableOpacity>
  </Modal>
);

export default function AlerterAbonnes() {
  const router = useRouter();
  const [token, setToken] = useState<string | null>(null);
  const [userId, setUserId] = useState<number | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [followerCount, setFollowerCount] = useState<number>(0);

  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [alertType, setAlertType] = useState<AlertType>('promotion');

  const [isGeneratingAI, setIsGeneratingAI] = useState(false);
  const [aiCampaign, setAiCampaign] = useState<AICampaign | null>(null);
  const [isSending, setIsSending] = useState(false);
  const [initializing, setInitializing] = useState(true);
  const [loadingProducts, setLoadingProducts] = useState(false);

  // Toast
  const [toast, setToast] = useState({ visible: false, message: '', type: 'info' as 'success' | 'error' | 'info' });
  const showToast = (msg: string, type: 'success' | 'error' | 'info' = 'info') => setToast({ visible: true, message: msg, type });

  // Confirmation dialog
  const [confirmVisible, setConfirmVisible] = useState(false);

  useEffect(() => {
    initialize();
  }, []);

  const initialize = async () => {
    try {
      const savedToken = await AsyncStorage.getItem('userToken');
      if (!savedToken) {
        router.replace('/splash');
        return;
      }
      setToken(savedToken);
      loadProductsWithCache(savedToken);
      loadFollowerCountWithCache(savedToken);
    } catch (error) {
      showToast('Impossible de charger les données.', 'error');
    } finally {
      setInitializing(false);
    }
  };

  const loadProductsWithCache = async (authToken: string) => {
    setLoadingProducts(true);
    try {
      const cached = await getCachedData(CACHE_PRODUCTS_KEY);
      if (cached) setProducts(cached);
      const res = await axios.get(`${BASE_URL}/api/user/my-products`, {
        headers: { Authorization: `Bearer ${authToken}` },
      });
      if (res.data.success) {
        setProducts(res.data.products);
        await setCachedData(CACHE_PRODUCTS_KEY, res.data.products);
      }
    } catch (error: any) {
      if (error.response?.status === 401) {
        await AsyncStorage.removeItem('userToken');
        router.replace('/splash');
      } else if (!products.length) {
        showToast('Erreur chargement produits.', 'error');
      }
    } finally {
      setLoadingProducts(false);
    }
  };

  const loadFollowerCountWithCache = async (authToken: string) => {
    try {
      const cachedCount = await getCachedData(CACHE_FOLLOWERS_KEY);
      if (cachedCount !== null) setFollowerCount(cachedCount);
      const profileRes = await axios.get(`${BASE_URL}/api/user/profile`, {
        headers: { Authorization: `Bearer ${authToken}` },
      });
      if (profileRes.data.success) {
        const id = profileRes.data.user.id;
        setUserId(id);
        const res = await axios.get(`${BASE_URL}/api/followers/count/${id}`);
        if (res.data.success) {
          setFollowerCount(res.data.followersCount);
          await setCachedData(CACHE_FOLLOWERS_KEY, res.data.followersCount);
        }
      }
    } catch (error: any) {
      if (error.response?.status === 401) {
        await AsyncStorage.removeItem('userToken');
        router.replace('/splash');
      }
    }
  };

  const generateAICampaign = async () => {
    if (!selectedProduct) {
      showToast('Veuillez sélectionner un produit.', 'error');
      return;
    }
    setIsGeneratingAI(true);
    try {
      const payload = {
        productName: selectedProduct.title,
        category: selectedProduct.category || '',
        price: selectedProduct.price,
        productDescription: selectedProduct.description || '',
        targetCustomer: 'Tous les clients SHOPNET',
        objective: alertType === 'promotion' ? 'Augmenter les ventes' : 'Informer les abonnés',
      };
      const res = await axios.post(`${BASE_URL}/api/ai/marketing-campaign`, payload, {
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      });
      if (res.data.success) {
        const campaign: AICampaign = res.data.campaign;
        setTitle(campaign.title.substring(0, 100));
        setMessage(campaign.message.substring(0, 1000));
        setAlertType(campaign.type as AlertType || 'promotion');
        setAiCampaign(campaign);
        showToast('Campagne générée avec succès.', 'success');
      } else {
        showToast(res.data.message || 'Échec génération IA.', 'error');
      }
    } catch (error) {
      showToast('Échec communication IA.', 'error');
    } finally {
      setIsGeneratingAI(false);
    }
  };

  const handleSend = () => {
    if (!title.trim() || !message.trim()) {
      showToast('Veuillez remplir le titre et le message.', 'error');
      return;
    }
    if (followerCount === 0) {
      showToast('Aucun abonné pour le moment.', 'info');
      return;
    }
    setConfirmVisible(true);
  };

  const sendAlert = async () => {
    setConfirmVisible(false);
    setIsSending(true);
    try {
      const payload = {
        title: title.trim(),
        message: message.trim(),
        type: alertType,
        product_id: selectedProduct ? selectedProduct.id : null,
      };
      await axios.post(`${BASE_URL}/api/seller-alerts/alert`, payload, {
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      });
      showToast(`Alerte envoyée à ${followerCount} abonné(s).`, 'success');
      setTitle('');
      setMessage('');
      setSelectedProduct(null);
      setAiCampaign(null);
    } catch (error: any) {
      if (error.response?.status === 401) {
        showToast('Session expirée, reconnectez-vous.', 'error');
        await AsyncStorage.removeItem('userToken');
        router.replace('/splash');
      } else {
        showToast('Échec de l\'envoi.', 'error');
      }
    } finally {
      setIsSending(false);
    }
  };

  const renderProductCard = (product: Product) => {
    const isSelected = selectedProduct?.id === product.id;
    const imageUrl = product.images?.[0] || 'https://via.placeholder.com/100';
    return (
      <TouchableOpacity
        key={product.id}
        style={[styles.productCard, isSelected && styles.productCardSelected]}
        onPress={() => setSelectedProduct(isSelected ? null : product)}
        activeOpacity={0.8}
      >
        <Image source={{ uri: imageUrl }} style={styles.productImage} />
        <Text style={styles.productTitle} numberOfLines={2}>{product.title}</Text>
        <Text style={styles.productPrice}>${Number(product.price).toFixed(2)}</Text>
        {isSelected && (
          <View style={styles.selectedCheckmark}>
            <Ionicons name="checkmark-circle" size={24} color={PRO_BLUE} />
          </View>
        )}
      </TouchableOpacity>
    );
  };

  if (initializing) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor={SHOPNET_BLUE} />
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" color={PRO_BLUE} />
          <Text style={{ color: WHITE, marginTop: 12 }}>Chargement...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={SHOPNET_BLUE} />
      <Toast
        visible={toast.visible}
        message={toast.message}
        type={toast.type}
        onHide={() => setToast(prev => ({ ...prev, visible: false }))}
      />
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={WHITE} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Créer une campagne IA</Text>
        <View style={{ width: 32 }} />
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Assistant IA */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Ionicons name="hardware-chip-outline" size={22} color={PRO_BLUE} />
            <Text style={styles.cardTitle}>Assistant marketing IA SHOPNET</Text>
          </View>
          <Text style={styles.cardSubtitle}>
            Laissez l'IA générer une notification professionnelle pour votre produit.
          </Text>
          <TouchableOpacity
            style={[styles.button, styles.aiButton]}
            onPress={generateAICampaign}
            disabled={isGeneratingAI || !selectedProduct}
            activeOpacity={0.8}
          >
            {isGeneratingAI ? (
              <ActivityIndicator color={WHITE} />
            ) : (
              <>
                <Ionicons name="flash-outline" size={18} color={WHITE} />
                <Text style={styles.buttonText}>Générer avec SHOPNET AI</Text>
              </>
            )}
          </TouchableOpacity>
          {!selectedProduct && (
            <Text style={styles.hintText}>Sélectionnez d'abord un produit ci-dessous.</Text>
          )}
        </View>

        {/* Sélection du produit */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Ionicons name="cube-outline" size={22} color={PRO_BLUE} />
            <Text style={styles.cardTitle}>Choisir un produit</Text>
          </View>
          {loadingProducts ? (
            <ActivityIndicator color={PRO_BLUE} style={{ margin: 20 }} />
          ) : products.length > 0 ? (
            <FlatList
              data={products}
              renderItem={({ item }) => renderProductCard(item)}
              keyExtractor={(item) => item.id.toString()}
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.productsList}
            />
          ) : (
            <Text style={styles.noProductText}>Aucun produit trouvé.</Text>
          )}
          {selectedProduct && (
            <TouchableOpacity style={styles.removeProductButton} onPress={() => setSelectedProduct(null)}>
              <Text style={styles.removeProductText}>Retirer la sélection</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Type d'alerte */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Type d'alerte</Text>
          <View style={styles.typeSelector}>
            {([
              { value: 'promotion', label: 'Promotion', icon: 'pricetag-outline' },
              { value: 'nouveau_produit', label: 'Nouveau produit', icon: 'cube-outline' },
              { value: 'vente_flash', label: 'Vente Flash', icon: 'flash-outline' },
              { value: 'information', label: 'Information', icon: 'information-circle-outline' },
            ] as const).map((item) => (
              <TouchableOpacity
                key={item.value}
                style={[styles.typeButton, alertType === item.value && styles.typeButtonActive]}
                onPress={() => setAlertType(item.value)}
              >
                <Ionicons name={item.icon} size={18} color={alertType === item.value ? WHITE : TEXT_SECONDARY} />
                <Text style={[styles.typeButtonText, alertType === item.value && styles.typeButtonTextActive]}>
                  {item.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Champs d'édition */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Votre message</Text>
          <Text style={styles.fieldLabel}>Titre de l'alerte</Text>
          <TextInput
            style={styles.input}
            value={title}
            onChangeText={(t) => setTitle(t.substring(0, 100))}
            placeholder="Ex: 🔥 Vente Flash SHOPNET"
            placeholderTextColor={TEXT_SECONDARY}
            maxLength={100}
          />
          <Text style={styles.charCount}>{title.length}/100</Text>
          <Text style={styles.fieldLabel}>Message de l'alerte</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            value={message}
            onChangeText={(t) => setMessage(t.substring(0, 1000))}
            placeholder="Écrivez votre message pour vos abonnés..."
            placeholderTextColor={TEXT_SECONDARY}
            multiline
            numberOfLines={6}
            maxLength={1000}
          />
          <Text style={styles.charCount}>{message.length}/1000</Text>
        </View>

        {/* Bouton régénérer si campagne déjà générée */}
        {aiCampaign && (
          <TouchableOpacity style={styles.regenerateButton} onPress={generateAICampaign}>
            <Ionicons name="refresh-outline" size={16} color={PRO_BLUE} />
            <Text style={styles.regenerateText}>Régénérer une autre campagne</Text>
          </TouchableOpacity>
        )}

        {/* Aperçu */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Aperçu de la notification</Text>
          <View style={styles.previewCard}>
            <View style={styles.previewHeader}>
              <Text style={styles.previewAppName}>SHOPNET</Text>
              <Text style={styles.previewTime}>À l'instant</Text>
            </View>
            <Text style={styles.previewTitle}>{title || 'Titre de l\'alerte'}</Text>
            <Text style={styles.previewMessage}>{message || 'Message de l\'alerte...'}</Text>
            {selectedProduct && (
              <View style={styles.previewProduct}>
                <Image
                  source={{ uri: selectedProduct.images?.[0] || 'https://via.placeholder.com/40' }}
                  style={styles.previewProductImage}
                />
                <View>
                  <Text style={styles.previewProductName}>{selectedProduct.title}</Text>
                  <Text style={styles.previewProductPrice}>${Number(selectedProduct.price).toFixed(2)}</Text>
                </View>
              </View>
            )}
          </View>
        </View>

        {/* Bouton Envoyer */}
        <TouchableOpacity
          style={[styles.sendButton, isSending && styles.disabledButton]}
          onPress={handleSend}
          disabled={isSending}
          activeOpacity={0.8}
        >
          {isSending ? (
            <ActivityIndicator color={WHITE} />
          ) : (
            <>
              <Ionicons name="send-outline" size={20} color={WHITE} />
              <Text style={styles.sendButtonText}>📢 Envoyer à mes abonnés ({followerCount})</Text>
            </>
          )}
        </TouchableOpacity>
        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Dialogue de confirmation */}
      <ConfirmDialog
        visible={confirmVisible}
        message={`Cette alerte sera envoyée à tous vos abonnés (${followerCount}). Continuer ?`}
        onCancel={() => setConfirmVisible(false)}
        onConfirm={sendAlert}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: SHOPNET_BLUE,
  },
  toastContainer: {
    position: 'absolute',
    top: 50,
    left: 20,
    right: 20,
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 12,
    zIndex: 1000,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  toastText: {
    color: WHITE,
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 8,
    flex: 1,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  confirmContainer: {
    backgroundColor: CARD_BG,
    borderRadius: 16,
    padding: 24,
    width: width * 0.85,
    borderWidth: 1,
    borderColor: LIGHT_BORDER,
  },
  confirmMessage: {
    color: WHITE,
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 24,
    textAlign: 'center',
  },
  confirmButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  confirmCancel: {
    flex: 1,
    paddingVertical: 12,
    marginRight: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: LIGHT_BORDER,
    alignItems: 'center',
  },
  confirmCancelText: {
    color: WHITE,
    fontWeight: '600',
    fontSize: 16,
  },
  confirmSend: {
    flex: 1,
    paddingVertical: 12,
    marginLeft: 8,
    borderRadius: 8,
    backgroundColor: PRO_BLUE,
    alignItems: 'center',
  },
  confirmSendText: {
    color: WHITE,
    fontWeight: '700',
    fontSize: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 50,
    paddingBottom: 12,
    backgroundColor: SHOPNET_BLUE,
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: WHITE,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
  },
  card: {
    backgroundColor: CARD_BG,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: LIGHT_BORDER,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: WHITE,
    marginLeft: 8,
  },
  cardSubtitle: {
    fontSize: 14,
    color: TEXT_SECONDARY,
    marginBottom: 12,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: PRO_BLUE,
    paddingVertical: 14,
    borderRadius: 10,
  },
  buttonText: {
    color: WHITE,
    fontWeight: '600',
    fontSize: 16,
    marginLeft: 8,
  },
  aiButton: {
    backgroundColor: '#6C5CE7',
  },
  hintText: {
    fontSize: 13,
    color: TEXT_SECONDARY,
    marginTop: 12,
    textAlign: 'center',
  },
  productsList: {
    paddingRight: 8,
  },
  productCard: {
    width: width * 0.4,
    backgroundColor: SHOPNET_BLUE,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: LIGHT_BORDER,
    padding: 10,
    marginRight: 12,
    alignItems: 'center',
  },
  productCardSelected: {
    borderColor: PRO_BLUE,
    borderWidth: 2,
  },
  productImage: {
    width: '100%',
    height: 100,
    borderRadius: 8,
    backgroundColor: LIGHT_BORDER,
  },
  productTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: WHITE,
    marginTop: 8,
    textAlign: 'center',
  },
  productPrice: {
    fontSize: 14,
    fontWeight: '700',
    color: PRO_BLUE,
    marginTop: 4,
  },
  selectedCheckmark: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: WHITE,
    borderRadius: 12,
  },
  removeProductButton: {
    marginTop: 12,
    alignItems: 'center',
  },
  removeProductText: {
    color: PRO_BLUE,
    fontWeight: '600',
    fontSize: 14,
  },
  noProductText: {
    color: TEXT_SECONDARY,
    textAlign: 'center',
    marginVertical: 20,
  },
  typeSelector: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 8,
  },
  typeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: LIGHT_BORDER,
  },
  typeButtonActive: {
    backgroundColor: PRO_BLUE,
    borderColor: PRO_BLUE,
  },
  typeButtonText: {
    fontSize: 13,
    color: TEXT_SECONDARY,
    marginLeft: 6,
    fontWeight: '600',
  },
  typeButtonTextActive: {
    color: WHITE,
  },
  fieldLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: WHITE,
    marginTop: 12,
    marginBottom: 6,
  },
  input: {
    backgroundColor: SHOPNET_BLUE,
    borderWidth: 1,
    borderColor: LIGHT_BORDER,
    borderRadius: 8,
    padding: 12,
    color: WHITE,
    fontSize: 14,
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  charCount: {
    fontSize: 12,
    color: TEXT_SECONDARY,
    textAlign: 'right',
    marginTop: 4,
  },
  regenerateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: LIGHT_BORDER,
    marginBottom: 16,
  },
  regenerateText: {
    color: PRO_BLUE,
    fontSize: 14,
    marginLeft: 6,
  },
  previewCard: {
    backgroundColor: '#2C3E50',
    borderRadius: 12,
    padding: 16,
    marginTop: 8,
  },
  previewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  previewAppName: {
    fontWeight: '700',
    color: PRO_BLUE,
  },
  previewTime: {
    fontSize: 12,
    color: TEXT_SECONDARY,
  },
  previewTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: WHITE,
    marginBottom: 4,
  },
  previewMessage: {
    fontSize: 14,
    color: TEXT_SECONDARY,
    marginBottom: 8,
  },
  previewProduct: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: SHOPNET_BLUE,
    borderRadius: 8,
    padding: 8,
    marginTop: 8,
  },
  previewProductImage: {
    width: 40,
    height: 40,
    borderRadius: 4,
    marginRight: 8,
  },
  previewProductName: {
    fontSize: 13,
    fontWeight: '600',
    color: WHITE,
  },
  previewProductPrice: {
    fontSize: 12,
    color: PRO_BLUE,
  },
  sendButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: PRO_BLUE,
    paddingVertical: 16,
    borderRadius: 12,
    marginTop: 8,
  },
  sendButtonText: {
    color: WHITE,
    fontWeight: '700',
    fontSize: 16,
    marginLeft: 8,
  },
  disabledButton: {
    opacity: 0.6,
  },
});

