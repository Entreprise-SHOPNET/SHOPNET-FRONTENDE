

// app/(tabs)/Auth/Report/ReportScreen.tsx
import React, { useState, useEffect, useRef } from 'react';
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
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Animated,
  Image,
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
const SUCCESS = "#4CAF50";
const DANGER = "#FF3B30";
const WARNING = "#FFA726";

// 🔥 URLs DIRECTES
const URL_REPORT = 'https://shopnet-backend.onrender.com/api/Profile/statistiques/report';
const URL_MY_REPORTS = 'https://shopnet-backend.onrender.com/api/Profile/statistiques/reports/my';
const URL_USERS_SEARCH = 'https://shopnet-backend.onrender.com/api/Profile/statistiques/users/search';
const URL_PRODUCTS_SEARCH = 'https://shopnet-backend.onrender.com/api/Profile/statistiques/products/search';

// Types de signalement
const REPORT_TYPES = [
  { value: 'fake_product', label: '🛑 Produit contrefait', icon: 'alert-octagon' },
  { value: 'wrong_product', label: '❌ Mauvais produit', icon: 'close-circle' },
  { value: 'damaged_product', label: '💔 Produit endommagé', icon: 'heart-broken' },
  { value: 'prohibited_product', label: '🚫 Produit interdit', icon: 'ban' },
  { value: 'misleading_description', label: '📝 Description trompeuse', icon: 'file-question' },
  { value: 'counterfeit', label: '🔍 Contrefaçon', icon: 'copyright' },
  { value: 'expired_product', label: '⏳ Produit expiré', icon: 'clock' },
  { value: 'delivery_delay', label: '🚚 Retard de livraison', icon: 'truck-clock' },
  { value: 'product_not_received', label: '📦 Produit non reçu', icon: 'package-variant-closed' },
  { value: 'delivery_problem', label: '⚠️ Problème de livraison', icon: 'truck-alert' },
  { value: 'payment_issue', label: '💳 Problème de paiement', icon: 'credit-card-off' },
  { value: 'refund_issue', label: '💰 Problème de remboursement', icon: 'cash-refund' },
  { value: 'scam', label: '🎣 Arnaque', icon: 'phishing' },
  { value: 'abuse', label: '🚷 Comportement abusif', icon: 'account-off' },
  { value: 'harassment', label: '😡 Harcèlement', icon: 'emoticon-angry' },
  { value: 'spam', label: '📧 Spam', icon: 'email-alert' },
  { value: 'fake_account', label: '👤 Faux compte', icon: 'account-alert' },
  { value: 'impersonation', label: '🎭 Usurpation d\'identité', icon: 'mask' },
  { value: 'bug', label: '🐛 Bug', icon: 'bug' },
  { value: 'security_issue', label: '🔒 Problème de sécurité', icon: 'shield-alert' },
  { value: 'app_problem', label: '📱 Dysfonctionnement application', icon: 'cellphone-off' },
  { value: 'other', label: '📌 Autre', icon: 'dots-horizontal' },
];

type Report = {
  id: number;
  type: string;
  title: string;
  description: string;
  status: 'pending' | 'resolved' | 'rejected';
  created_at: string;
  status_message: string;
};

type SelectedTarget = {
  id: string;
  name: string;
  type: 'user' | 'product';
  image?: string;
  price?: number;
  email?: string;
};

export default function ReportScreen() {
  const router = useRouter();
  const { language } = useLanguage();
  const fr = language === 'fr';
  const { isDark } = useTheme();

  // États du formulaire
  const [selectedType, setSelectedType] = useState<string>('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [targetType, setTargetType] = useState<'user' | 'product' | null>(null);
  
  // 🔥 État pour la cible sélectionnée (affiché en bas)
  const [selectedTarget, setSelectedTarget] = useState<SelectedTarget | null>(null);

  // États de recherche
  const [searchTargetQuery, setSearchTargetQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearchingTarget, setIsSearchingTarget] = useState(false);

  // État des signalements
  const [reports, setReports] = useState<Report[]>([]);
  const [loadingReports, setLoadingReports] = useState(false);

  // État d'envoi
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Onglet actif
  const [activeTab, setActiveTab] = useState<'new' | 'history'>('new');

  const [token, setToken] = useState<string | null>(null);
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
    success: SUCCESS,
    danger: DANGER,
    warning: WARNING,
  };

  useEffect(() => {
    AsyncStorage.getItem('userToken').then(t => {
      setToken(t);
      if (t) fetchMyReports(t);
    });
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 400,
      useNativeDriver: true,
    }).start();
  }, []);

  // Récupérer les signalements de l'utilisateur
  const fetchMyReports = async (tk?: string) => {
    const authToken = tk || token;
    if (!authToken) return;
    setLoadingReports(true);
    try {
      const res = await fetch(URL_MY_REPORTS, {
        headers: { Authorization: `Bearer ${authToken}` },
      });
      const data = await res.json();
      if (data.success && data.reports) {
        setReports(data.reports);
      }
    } catch (error) {
      console.error('Erreur récupération signalements:', error);
    } finally {
      setLoadingReports(false);
    }
  };

  // 🔥 RECHERCHE DE CIBLE (@mention)
  const searchTarget = async (query: string) => {
    if (!query.trim() || query.length < 1) {
      setSearchResults([]);
      return;
    }
    setIsSearchingTarget(true);
    try {
      let url = '';
      if (targetType === 'user') {
        url = `${URL_USERS_SEARCH}?q=${encodeURIComponent(query)}`;
      } else if (targetType === 'product') {
        url = `${URL_PRODUCTS_SEARCH}?q=${encodeURIComponent(query)}`;
      } else {
        setSearchResults([]);
        setIsSearchingTarget(false);
        return;
      }

      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success) {
        setSearchResults(data.results || []);
      } else {
        setSearchResults([]);
      }
    } catch (error) {
      console.error('Erreur recherche cible:', error);
      setSearchResults([]);
    } finally {
      setIsSearchingTarget(false);
    }
  };

  // Sélection d'une cible
  const handleTargetSelect = (item: any) => {
    const isUser = targetType === 'user';
    const selected: SelectedTarget = {
      id: item.id.toString(),
      name: isUser ? item.fullName : item.title,
      type: targetType!,
    };
    if (isUser) {
      selected.email = item.email;
      selected.image = item.avatar || null;
    } else {
      selected.price = item.price;
      selected.image = item.image || null;
    }
    setSelectedTarget(selected);
    setSearchTargetQuery('');
    setSearchResults([]);
    // On garde le targetType déjà défini
  };

  // Supprimer la cible sélectionnée
  const clearSelectedTarget = () => {
    setSelectedTarget(null);
    setTargetType(null);
  };

  const handleSubmit = async () => {
    // Validation
    if (!selectedType) {
      setErrorMessage(fr ? 'Veuillez sélectionner un type de signalement' : 'Please select a report type');
      return;
    }
    if (!title.trim()) {
      setErrorMessage(fr ? 'Veuillez saisir un titre' : 'Please enter a title');
      return;
    }
    if (!description.trim()) {
      setErrorMessage(fr ? 'Veuillez saisir une description' : 'Please enter a description');
      return;
    }
    if (!selectedTarget) {
      setErrorMessage(fr ? 'Veuillez sélectionner une cible' : 'Please select a target');
      return;
    }

    setErrorMessage(null);
    setSuccessMessage(null);
    setIsSubmitting(true);

    try {
      const payload: any = {
        type: selectedType,
        title: title.trim(),
        description: description.trim(),
      };
      if (selectedTarget.type === 'user') {
        payload.reported_user_id = parseInt(selectedTarget.id);
      } else {
        payload.product_id = parseInt(selectedTarget.id);
      }

      const res = await fetch(URL_REPORT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || data.message || 'Erreur');
      }
      setSuccessMessage(data.message || fr ? '✅ Signalement envoyé avec succès' : '✅ Report sent successfully');
      // Réinitialiser le formulaire
      setSelectedType('');
      setTitle('');
      setDescription('');
      setSelectedTarget(null);
      setTargetType(null);
      await fetchMyReports();
      setTimeout(() => setSuccessMessage(null), 5000);
    } catch (error: any) {
      setErrorMessage(error.message || fr ? '❌ Erreur lors de l\'envoi' : '❌ Error sending report');
      setTimeout(() => setErrorMessage(null), 5000);
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderTypeChip = (type: typeof REPORT_TYPES[0]) => {
    const isSelected = selectedType === type.value;
    return (
      <TouchableOpacity
        key={type.value}
        style={[
          styles.typeChip,
          {
            backgroundColor: isSelected ? COLORS.accent : COLORS.inputBg,
            borderColor: isSelected ? COLORS.accent : COLORS.border,
          },
        ]}
        onPress={() => setSelectedType(type.value)}
      >
        <MaterialIcons name={type.icon as any} size={16} color={isSelected ? '#FFF' : COLORS.textSecondary} />
        <Text style={[styles.typeChipText, { color: isSelected ? '#FFF' : COLORS.text }]}>{type.label}</Text>
      </TouchableOpacity>
    );
  };

  const getStatusColor = (status: string) => {
    if (status === 'resolved') return COLORS.success;
    if (status === 'rejected') return COLORS.danger;
    return COLORS.warning;
  };

  const getStatusLabel = (status: string) => {
    const map: Record<string, string> = {
      pending: fr ? 'En attente' : 'Pending',
      resolved: fr ? 'Résolu' : 'Resolved',
      rejected: fr ? 'Rejeté' : 'Rejected',
    };
    return map[status] || status;
  };

  const renderReportItem = ({ item }: { item: Report }) => (
    <View style={[styles.reportItem, { backgroundColor: COLORS.card, borderColor: COLORS.border }]}>
      <View style={styles.reportItemHeader}>
        <View style={styles.reportTypeBadge}>
          <Text style={styles.reportTypeText}>{item.type}</Text>
        </View>
        <View style={[styles.reportStatusBadge, { backgroundColor: getStatusColor(item.status) + '20' }]}>
          <Text style={[styles.reportStatusText, { color: getStatusColor(item.status) }]}>
            {getStatusLabel(item.status)}
          </Text>
        </View>
      </View>
      <Text style={[styles.reportItemTitle, { color: COLORS.text }]}>{item.title}</Text>
      <Text style={[styles.reportItemDesc, { color: COLORS.textSecondary }]} numberOfLines={2}>{item.description}</Text>
      <Text style={[styles.reportItemDate, { color: COLORS.textSecondary }]}>
        {new Date(item.created_at).toLocaleDateString(fr ? 'fr-FR' : 'en-US', {
          day: '2-digit', month: 'short', year: 'numeric',
        })}
      </Text>
      {item.status_message && (
        <Text style={[styles.reportStatusMessage, { color: COLORS.textSecondary }]}>
          {item.status_message}
        </Text>
      )}
    </View>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: COLORS.background }]}>
      <StatusBar backgroundColor={COLORS.background} barStyle="light-content" />

      {/* Header */}
      <View style={[styles.header, { borderBottomColor: COLORS.border }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: COLORS.text }]}>
          {fr ? 'Signaler un problème' : 'Report a problem'}
        </Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Onglets */}
      <View style={[styles.tabsContainer, { backgroundColor: COLORS.surface, borderColor: COLORS.border }]}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'new' && styles.tabActive]}
          onPress={() => setActiveTab('new')}
        >
          <Text style={[styles.tabText, { color: activeTab === 'new' ? COLORS.accent : COLORS.textSecondary }]}>
            {fr ? '📝 Nouveau' : '📝 New'}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'history' && styles.tabActive]}
          onPress={() => setActiveTab('history')}
        >
          <Text style={[styles.tabText, { color: activeTab === 'history' ? COLORS.accent : COLORS.textSecondary }]}>
            {fr ? '📋 Historique' : '📋 History'}
          </Text>
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
          {activeTab === 'new' ? (
            <Animated.View style={{ opacity: fadeAnim }}>
              {/* Messages de succès/erreur */}
              {successMessage && (
                <View style={[styles.messageBanner, { backgroundColor: COLORS.success + '20', borderColor: COLORS.success }]}>
                  <Text style={[styles.messageText, { color: COLORS.success }]}>{successMessage}</Text>
                </View>
              )}
              {errorMessage && (
                <View style={[styles.messageBanner, { backgroundColor: COLORS.danger + '20', borderColor: COLORS.danger }]}>
                  <Text style={[styles.messageText, { color: COLORS.danger }]}>{errorMessage}</Text>
                </View>
              )}

              {/* Type de signalement */}
              <View style={[styles.card, { backgroundColor: COLORS.card, borderColor: COLORS.border }]}>
                <Text style={[styles.cardLabel, { color: COLORS.textSecondary }]}>
                  {fr ? 'Type de signalement *' : 'Report type *'}
                </Text>
                <View style={styles.typeChipsContainer}>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                    {REPORT_TYPES.map(renderTypeChip)}
                  </ScrollView>
                </View>
              </View>

              {/* Titre */}
              <View style={[styles.card, { backgroundColor: COLORS.card, borderColor: COLORS.border }]}>
                <Text style={[styles.cardLabel, { color: COLORS.textSecondary }]}>
                  {fr ? 'Titre *' : 'Title *'}
                </Text>
                <TextInput
                  style={[styles.input, { backgroundColor: COLORS.inputBg, borderColor: COLORS.inputBorder, color: COLORS.text }]}
                  placeholder={fr ? 'Ex: Produit non conforme' : 'Ex: Product not conform'}
                  placeholderTextColor={COLORS.placeholder}
                  value={title}
                  onChangeText={setTitle}
                />
              </View>

              {/* Description */}
              <View style={[styles.card, { backgroundColor: COLORS.card, borderColor: COLORS.border }]}>
                <Text style={[styles.cardLabel, { color: COLORS.textSecondary }]}>
                  {fr ? 'Description *' : 'Description *'}
                </Text>
                <TextInput
                  style={[styles.input, styles.textArea, { backgroundColor: COLORS.inputBg, borderColor: COLORS.inputBorder, color: COLORS.text }]}
                  placeholder={fr ? 'Décrivez le problème en détail...' : 'Describe the problem in detail...'}
                  placeholderTextColor={COLORS.placeholder}
                  multiline
                  numberOfLines={6}
                  textAlignVertical="top"
                  value={description}
                  onChangeText={setDescription}
                />
              </View>

              {/* Cible */}
              <View style={[styles.card, { backgroundColor: COLORS.card, borderColor: COLORS.border }]}>
                <Text style={[styles.cardLabel, { color: COLORS.textSecondary }]}>
                  {fr ? 'Cible du signalement *' : 'Report target *'}
                </Text>
                <View style={styles.targetTypeSelector}>
                  <TouchableOpacity
                    style={[styles.targetTypeBtn, targetType === 'user' && { backgroundColor: COLORS.accent, borderColor: COLORS.accent }]}
                    onPress={() => { setTargetType('user'); setSearchTargetQuery(''); setSearchResults([]); }}
                  >
                    <Text style={[styles.targetTypeText, { color: targetType === 'user' ? '#FFF' : COLORS.text }]}>
                      👤 {fr ? 'Utilisateur' : 'User'}
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.targetTypeBtn, targetType === 'product' && { backgroundColor: COLORS.accent, borderColor: COLORS.accent }]}
                    onPress={() => { setTargetType('product'); setSearchTargetQuery(''); setSearchResults([]); }}
                  >
                    <Text style={[styles.targetTypeText, { color: targetType === 'product' ? '#FFF' : COLORS.text }]}>
                      📦 {fr ? 'Produit' : 'Product'}
                    </Text>
                  </TouchableOpacity>
                </View>

                {targetType && (
                  <View style={styles.targetSearchWrapper}>
                    <Text style={[styles.targetHint, { color: COLORS.textSecondary }]}>
                      {fr ? `Tapez @ pour rechercher un ${targetType === 'user' ? 'utilisateur' : 'produit'}` :
                        `Type @ to search for a ${targetType === 'user' ? 'user' : 'product'}`}
                    </Text>
                    <View style={[styles.targetInputWrapper, { backgroundColor: COLORS.inputBg, borderColor: COLORS.inputBorder }]}>
                      <TextInput
                        style={[styles.input, { color: COLORS.text }]}
                        placeholder={fr ? `Rechercher un ${targetType === 'user' ? 'utilisateur' : 'produit'}...` :
                          `Search for a ${targetType === 'user' ? 'user' : 'product'}...`}
                        placeholderTextColor={COLORS.placeholder}
                        value={searchTargetQuery}
                        onChangeText={(text) => {
                          setSearchTargetQuery(text);
                          if (text.startsWith('@')) {
                            const query = text.slice(1);
                            searchTarget(query);
                          } else {
                            setSearchResults([]);
                          }
                        }}
                      />
                    </View>
                    {isSearchingTarget && <ActivityIndicator size="small" color={COLORS.accent} style={{ marginTop: 8 }} />}
                    {searchResults.length > 0 && (
                      <FlatList
                        data={searchResults}
                        keyExtractor={(item) => item.id.toString()}
                        renderItem={({ item }) => (
                          <TouchableOpacity
                            style={[styles.searchResultItem, { borderBottomColor: COLORS.border }]}
                            onPress={() => handleTargetSelect(item)}
                          >
                            <View style={styles.searchResultLeft}>
                              {targetType === 'product' && item.image ? (
                                <Image source={{ uri: item.image }} style={styles.searchResultImage} />
                              ) : targetType === 'user' && item.avatar ? (
                                <Image source={{ uri: item.avatar }} style={styles.searchResultImage} />
                              ) : (
                                <View style={styles.searchResultImagePlaceholder}>
                                  <Ionicons name="person" size={20} color={COLORS.textSecondary} />
                                </View>
                              )}
                              <View>
                                <Text style={[styles.searchResultName, { color: COLORS.text }]}>
                                  {targetType === 'user' ? item.fullName : item.title}
                                </Text>
                                <Text style={[styles.searchResultSub, { color: COLORS.textSecondary }]}>
                                  {targetType === 'user' ? item.email : `${item.price} $`}
                                </Text>
                              </View>
                            </View>
                            <Ionicons name="add-circle" size={24} color={COLORS.accent} />
                          </TouchableOpacity>
                        )}
                        style={styles.searchResultsList}
                      />
                    )}
                  </View>
                )}

                {/* 🔥 AFFICHAGE DE LA CIBLE SÉLECTIONNÉE (en bas) */}
                {selectedTarget && (
                  <View style={[styles.selectedTargetCard, { backgroundColor: COLORS.card, borderColor: COLORS.accent }]}>
                    <View style={styles.selectedTargetContent}>
                      {selectedTarget.image ? (
                        <Image source={{ uri: selectedTarget.image }} style={styles.selectedTargetImage} />
                      ) : (
                        <View style={styles.selectedTargetImagePlaceholder}>
                          <Ionicons name={selectedTarget.type === 'user' ? 'person' : 'cube'} size={24} color={COLORS.textSecondary} />
                        </View>
                      )}
                      <View style={styles.selectedTargetInfo}>
                        <Text style={[styles.selectedTargetName, { color: COLORS.text }]}>
                          {selectedTarget.name}
                        </Text>
                        <Text style={[styles.selectedTargetSub, { color: COLORS.textSecondary }]}>
                          {selectedTarget.type === 'user'
                            ? selectedTarget.email || fr ? 'Utilisateur' : 'User'
                            : `${selectedTarget.price || 0} $`}
                        </Text>
                      </View>
                      <TouchableOpacity onPress={clearSelectedTarget} style={styles.removeTargetButton}>
                        <Ionicons name="close-circle" size={24} color={COLORS.danger} />
                      </TouchableOpacity>
                    </View>
                  </View>
                )}
              </View>

              {/* Bouton d'envoi */}
              <TouchableOpacity
                style={[styles.submitButton, { backgroundColor: COLORS.accent }, isSubmitting && { opacity: 0.6 }]}
                onPress={handleSubmit}
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text style={styles.submitButtonText}>
                    {fr ? '📤 Envoyer le signalement' : '📤 Send report'}
                  </Text>
                )}
              </TouchableOpacity>
            </Animated.View>
          ) : (
            <Animated.View style={{ opacity: fadeAnim }}>
              {loadingReports ? (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator size="large" color={COLORS.accent} />
                  <Text style={[styles.loadingText, { color: COLORS.textSecondary }]}>
                    {fr ? 'Chargement des signalements...' : 'Loading reports...'}
                  </Text>
                </View>
              ) : reports.length === 0 ? (
                <View style={styles.emptyContainer}>
                  <MaterialIcons name="report-off" size={60} color={COLORS.textSecondary} />
                  <Text style={[styles.emptyText, { color: COLORS.text }]}>
                    {fr ? 'Aucun signalement envoyé' : 'No reports sent'}
                  </Text>
                  <Text style={[styles.emptySubtext, { color: COLORS.textSecondary }]}>
                    {fr ? 'Vous n\'avez encore signalé aucun problème.' : 'You haven\'t reported any problem yet.'}
                  </Text>
                </View>
              ) : (
                <FlatList
                  data={reports}
                  renderItem={renderReportItem}
                  keyExtractor={(item) => item.id.toString()}
                  scrollEnabled={false}
                  contentContainerStyle={{ gap: 12 }}
                />
              )}
            </Animated.View>
          )}
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
  tabsContainer: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 4,
    borderRadius: 12,
    borderWidth: 1,
    overflow: 'hidden',
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
  },
  tabActive: {
    backgroundColor: 'rgba(66, 165, 245, 0.15)',
  },
  tabText: {
    fontSize: 15,
    fontWeight: '600',
  },
  scrollView: { flex: 1 },
  scrollContent: { paddingHorizontal: 16, paddingVertical: 16, paddingBottom: 40 },
  messageBanner: {
    padding: 14,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 16,
    alignItems: 'center',
  },
  messageText: {
    fontSize: 15,
    fontWeight: '600',
  },
  card: {
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    marginBottom: 16,
  },
  cardLabel: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 10,
  },
  typeChipsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  typeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    marginRight: 8,
    marginBottom: 8,
    gap: 6,
  },
  typeChipText: {
    fontSize: 13,
    fontWeight: '500',
  },
  input: {
    fontSize: 16,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
  },
  textArea: {
    minHeight: 120,
    textAlignVertical: 'top',
  },
  targetTypeSelector: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  targetTypeBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(66, 165, 245, 0.2)',
    alignItems: 'center',
  },
  targetTypeText: {
    fontSize: 15,
    fontWeight: '600',
  },
  targetSearchWrapper: {
    marginTop: 4,
  },
  targetHint: {
    fontSize: 12,
    marginBottom: 6,
  },
  targetInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 12,
  },
  searchResultsList: {
    maxHeight: 150,
    marginTop: 8,
  },
  searchResultItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  searchResultLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  searchResultImage: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
    backgroundColor: '#2C3A4A',
  },
  searchResultImagePlaceholder: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#2C3A4A',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  searchResultName: {
    fontSize: 15,
    fontWeight: '500',
  },
  searchResultSub: {
    fontSize: 13,
  },
  selectedTargetCard: {
    marginTop: 12,
    borderRadius: 12,
    borderWidth: 2,
    padding: 12,
  },
  selectedTargetContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  selectedTargetImage: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginRight: 12,
    backgroundColor: '#2C3A4A',
  },
  selectedTargetImagePlaceholder: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#2C3A4A',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  selectedTargetInfo: {
    flex: 1,
  },
  selectedTargetName: {
    fontSize: 16,
    fontWeight: '600',
  },
  selectedTargetSub: {
    fontSize: 14,
  },
  removeTargetButton: {
    padding: 8,
  },
  submitButton: {
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 8,
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '700',
  },
  loadingContainer: {
    paddingVertical: 40,
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
  },
  emptyContainer: {
    paddingVertical: 60,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 15,
    marginTop: 8,
    textAlign: 'center',
  },
  reportItem: {
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
  },
  reportItemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  reportTypeBadge: {
    backgroundColor: 'rgba(66, 165, 245, 0.15)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  reportTypeText: {
    color: '#42A5F5',
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  reportStatusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  reportStatusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  reportItemTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  reportItemDesc: {
    fontSize: 14,
    marginBottom: 6,
  },
  reportItemDate: {
    fontSize: 12,
    marginBottom: 4,
  },
  reportStatusMessage: {
    fontSize: 13,
    fontStyle: 'italic',
    marginTop: 4,
  },
});

