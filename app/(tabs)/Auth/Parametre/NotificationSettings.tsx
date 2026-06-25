


// app/(tabs)/Auth/Profiles/NotificationSettings.tsx
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  ScrollView,
  StatusBar,
  Switch,
  Dimensions,
} from 'react-native';
import { useRouter } from 'expo-router';
import {
  Ionicons,
  MaterialIcons,
  Feather,
  FontAwesome5,
  MaterialCommunityIcons,
} from '@expo/vector-icons';
import { useTheme } from '../../../../app/theme/ThemeContext';
import { useLanguage } from '../../../../context/LanguageContext';

const { width } = Dimensions.get('window');
const SHOPNET_BLUE = "#00182A";
const ACCENT = "#42A5F5";
const TEXT_PRIMARY = "#FFFFFF";
const TEXT_SECONDARY = "#A0AEC0";
const CARD_BACKGROUND = "rgba(30, 42, 59, 0.9)";
const BORDER_COLOR = "rgba(66, 165, 245, 0.1)";

// Types de notification avec leurs catégories
interface NotificationCategory {
  id: string;
  title: string;
  icon: React.ReactNode;
  description: string;
  color: string;
  notifications: NotificationItem[];
}

interface NotificationItem {
  id: string;
  label: string;
  key: string;
}

export default function NotificationSettings() {
  const router = useRouter();
  const { language } = useLanguage();
  const fr = language === 'fr';
  const { isDark } = useTheme();

  // État des switchs (tous activés par défaut)
  const [notifStates, setNotifStates] = useState<Record<string, boolean>>({
    // 🛒 Commerciales
    new_order: true,
    order_confirmed: true,
    order_processing: true,
    order_shipped: true,
    order_delivered: true,
    payment_success: true,
    payment_pending: true,
    cart_abandoned: true,
    // 🔥 Marketing
    trending_products: true,
    recommended_products: true,
    promotions: true,
    flash_sales: true,
    new_products: true,
    personalized_suggestions: true,
    retargeting: true,
    // 💬 Sociales
    product_like: true,
    product_comment: true,
    comment_reply: true,
    new_follower: true,
    new_message: true,
    product_review: true,
    mention: true,
    // 🏪 Boutique
    new_shop_order: true,
    new_customer: true,
    weekly_stats: true,
    product_performance: true,
    boost_approved: true,
    product_rejected: true,
    premium_expiry: true,
    // 📦 Produits
    product_added: true,
    product_approved: true,
    product_rejected_item: true,
    product_trending: true,
    out_of_stock: true,
    low_stock: true,
    product_modified: true,
    // 🧠 IA
    ai_suggestion: true,
    ai_behavior_analysis: true,
    ai_recommendation: true,
    ai_purchase_alert: true,
    ai_cart_analysis: true,
    ai_interest_score: true,
    // ⚙️ Système
    login_success: true,
    suspicious_login: true,
    password_changed: true,
    profile_updated: true,
    account_verified: true,
    security_alert: true,
    account_suspended: true,
    // 🎯 Engagement
    return_reminder: true,
    daily_summary: true,
    weekly_summary: true,
    pending_products: true,
    shop_traffic: true,
  });

  const toggleSwitch = (key: string) => {
    setNotifStates(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const toggleAllInCategory = (categoryNotifications: NotificationItem[], value: boolean) => {
    setNotifStates(prev => {
      const newState = { ...prev };
      categoryNotifications.forEach(item => {
        newState[item.key] = value;
      });
      return newState;
    });
  };

  const COLORS = {
    background: isDark ? '#0D0D0D' : SHOPNET_BLUE,
    surface: isDark ? '#1A1A1A' : CARD_BACKGROUND,
    border: isDark ? '#2E2E2E' : BORDER_COLOR,
    text: isDark ? '#F5F5F5' : TEXT_PRIMARY,
    textSecondary: isDark ? '#B0B0B0' : TEXT_SECONDARY,
    accent: ACCENT,
    switchTrackOn: ACCENT,
    switchTrackOff: isDark ? '#3A3A3A' : 'rgba(255,255,255,0.2)',
    switchThumb: '#FFFFFF',
  };

  const notificationCategories: NotificationCategory[] = [
    {
      id: 'commercial',
      title: fr ? '🛒 Commerciales' : '🛒 Commercial',
      icon: <Ionicons name="cart" size={22} color="#4CAF50" />,
      description: fr ? 'Suivi des achats et ventes' : 'Purchase and sales tracking',
      color: '#4CAF50',
      notifications: [
        { id: 'new_order', label: fr ? 'Nouvelle commande reçue' : 'New order received', key: 'new_order' },
        { id: 'order_confirmed', label: fr ? 'Commande confirmée' : 'Order confirmed', key: 'order_confirmed' },
        { id: 'order_processing', label: fr ? 'Commande en traitement' : 'Order processing', key: 'order_processing' },
        { id: 'order_shipped', label: fr ? 'Commande expédiée' : 'Order shipped', key: 'order_shipped' },
        { id: 'order_delivered', label: fr ? 'Commande livrée' : 'Order delivered', key: 'order_delivered' },
        { id: 'payment_success', label: fr ? 'Paiement réussi' : 'Payment successful', key: 'payment_success' },
        { id: 'payment_pending', label: fr ? 'Paiement en attente' : 'Payment pending', key: 'payment_pending' },
        { id: 'cart_abandoned', label: fr ? 'Panier abandonné' : 'Cart abandoned', key: 'cart_abandoned' },
      ],
    },
    {
      id: 'marketing',
      title: fr ? '🔥 Marketing' : '🔥 Marketing',
      icon: <MaterialIcons name="trending-up" size={22} color="#FF9800" />,
      description: fr ? 'Promotions et recommandations' : 'Promotions and recommendations',
      color: '#FF9800',
      notifications: [
        { id: 'trending_products', label: fr ? 'Produits tendances' : 'Trending products', key: 'trending_products' },
        { id: 'recommended_products', label: fr ? 'Produits recommandés' : 'Recommended products', key: 'recommended_products' },
        { id: 'promotions', label: fr ? 'Promotions et réductions' : 'Promotions and discounts', key: 'promotions' },
        { id: 'flash_sales', label: fr ? 'Offres limitées' : 'Limited offers', key: 'flash_sales' },
        { id: 'new_products', label: fr ? 'Nouveaux produits' : 'New products', key: 'new_products' },
        { id: 'personalized_suggestions', label: fr ? 'Suggestions personnalisées' : 'Personalized suggestions', key: 'personalized_suggestions' },
        { id: 'retargeting', label: fr ? 'Rappels d\'achat' : 'Retargeting reminders', key: 'retargeting' },
      ],
    },
    {
      id: 'social',
      title: fr ? '💬 Sociales' : '💬 Social',
      icon: <Ionicons name="chatbubbles" size={22} color="#9C27B0" />,
      description: fr ? 'Interactions entre utilisateurs' : 'User interactions',
      color: '#9C27B0',
      notifications: [
        { id: 'product_like', label: fr ? 'Nouveau like sur produit' : 'New product like', key: 'product_like' },
        { id: 'product_comment', label: fr ? 'Nouveau commentaire' : 'New comment', key: 'product_comment' },
        { id: 'comment_reply', label: fr ? 'Réponse à un commentaire' : 'Reply to comment', key: 'comment_reply' },
        { id: 'new_follower', label: fr ? 'Nouveau follower' : 'New follower', key: 'new_follower' },
        { id: 'new_message', label: fr ? 'Message reçu' : 'New message', key: 'new_message' },
        { id: 'product_review', label: fr ? 'Avis sur produit' : 'Product review', key: 'product_review' },
        { id: 'mention', label: fr ? 'Mention dans une discussion' : 'Mention in discussion', key: 'mention' },
      ],
    },
    {
      id: 'shop',
      title: fr ? '🏪 Boutique' : '🏪 Shop',
      icon: <MaterialIcons name="store" size={22} color="#2196F3" />,
      description: fr ? 'Gestion business vendeur' : 'Seller business management',
      color: '#2196F3',
      notifications: [
        { id: 'new_shop_order', label: fr ? 'Nouvelle commande boutique' : 'New shop order', key: 'new_shop_order' },
        { id: 'new_customer', label: fr ? 'Nouveau client' : 'New customer', key: 'new_customer' },
        { id: 'weekly_stats', label: fr ? 'Statistiques hebdomadaires' : 'Weekly statistics', key: 'weekly_stats' },
        { id: 'product_performance', label: fr ? 'Performance des produits' : 'Product performance', key: 'product_performance' },
        { id: 'boost_approved', label: fr ? 'Produit boosté approuvé' : 'Boost approved', key: 'boost_approved' },
        { id: 'product_rejected', label: fr ? 'Produit refusé / modéré' : 'Product rejected', key: 'product_rejected' },
        { id: 'premium_expiry', label: fr ? 'Expiration boutique premium' : 'Premium shop expiry', key: 'premium_expiry' },
      ],
    },
    {
      id: 'product',
      title: fr ? '📦 Produits' : '📦 Products',
      icon: <Ionicons name="cube" size={22} color="#607D8B" />,
      description: fr ? 'Gestion catalogue' : 'Catalog management',
      color: '#607D8B',
      notifications: [
        { id: 'product_added', label: fr ? 'Produit ajouté avec succès' : 'Product added successfully', key: 'product_added' },
        { id: 'product_approved', label: fr ? 'Produit approuvé' : 'Product approved', key: 'product_approved' },
        { id: 'product_rejected_item', label: fr ? 'Produit rejeté' : 'Product rejected', key: 'product_rejected_item' },
        { id: 'product_trending', label: fr ? 'Produit en tendance' : 'Product trending', key: 'product_trending' },
        { id: 'out_of_stock', label: fr ? 'Produit en rupture de stock' : 'Out of stock', key: 'out_of_stock' },
        { id: 'low_stock', label: fr ? 'Stock faible' : 'Low stock', key: 'low_stock' },
        { id: 'product_modified', label: fr ? 'Produit modifié' : 'Product modified', key: 'product_modified' },
      ],
    },
    {
      id: 'ai',
      title: fr ? '🧠 IA / Smart' : '🧠 AI / Smart',
      icon: <MaterialCommunityIcons name="brain" size={22} color="#E91E63" />,
      description: fr ? 'Intelligence automatique' : 'Automatic intelligence',
      color: '#E91E63',
      notifications: [
        { id: 'ai_suggestion', label: fr ? 'Suggestion IA personnalisée' : 'Personalized AI suggestion', key: 'ai_suggestion' },
        { id: 'ai_behavior_analysis', label: fr ? 'Analyse comportement' : 'Behavior analysis', key: 'ai_behavior_analysis' },
        { id: 'ai_recommendation', label: fr ? 'Produits recommandés' : 'Recommended products', key: 'ai_recommendation' },
        { id: 'ai_purchase_alert', label: fr ? 'Alerte opportunité d\'achat' : 'Purchase opportunity alert', key: 'ai_purchase_alert' },
        { id: 'ai_cart_analysis', label: fr ? 'Analyse panier' : 'Cart analysis', key: 'ai_cart_analysis' },
        { id: 'ai_interest_score', label: fr ? 'Score d\'intérêt produit' : 'Product interest score', key: 'ai_interest_score' },
      ],
    },
    {
      id: 'system',
      title: fr ? '⚙️ Système & Compte' : '⚙️ System & Account',
      icon: <Ionicons name="settings" size={22} color="#78909C" />,
      description: fr ? 'Sécurité et gestion compte' : 'Security and account management',
      color: '#78909C',
      notifications: [
        { id: 'login_success', label: fr ? 'Connexion réussie' : 'Login successful', key: 'login_success' },
        { id: 'suspicious_login', label: fr ? 'Nouvelle connexion suspecte' : 'Suspicious login', key: 'suspicious_login' },
        { id: 'password_changed', label: fr ? 'Changement de mot de passe' : 'Password changed', key: 'password_changed' },
        { id: 'profile_updated', label: fr ? 'Mise à jour profil' : 'Profile updated', key: 'profile_updated' },
        { id: 'account_verified', label: fr ? 'Vérification compte' : 'Account verified', key: 'account_verified' },
        { id: 'security_alert', label: fr ? 'Avertissement sécurité' : 'Security alert', key: 'security_alert' },
        { id: 'account_suspended', label: fr ? 'Compte suspendu / réactivé' : 'Account suspended/ reactivated', key: 'account_suspended' },
      ],
    },
    {
      id: 'engagement',
      title: fr ? '🎯 Engagement & Retention' : '🎯 Engagement & Retention',
      icon: <Ionicons name="heart" size={22} color="#FF5722" />,
      description: fr ? 'Garder l\'utilisateur actif' : 'Keep user active',
      color: '#FF5722',
      notifications: [
        { id: 'return_reminder', label: fr ? 'Retour sur application' : 'Return to app reminder', key: 'return_reminder' },
        { id: 'daily_summary', label: fr ? 'Résumé activité quotidienne' : 'Daily activity summary', key: 'daily_summary' },
        { id: 'weekly_summary', label: fr ? 'Résumé hebdomadaire' : 'Weekly summary', key: 'weekly_summary' },
        { id: 'pending_products', label: fr ? 'Produits en attente' : 'Pending products', key: 'pending_products' },
        { id: 'shop_traffic', label: fr ? 'Trafic boutique' : 'Shop traffic', key: 'shop_traffic' },
      ],
    },
  ];

  const isAllEnabled = (items: NotificationItem[]): boolean => {
    return items.every(item => notifStates[item.key] === true);
  };

  const isAllDisabled = (items: NotificationItem[]): boolean => {
    return items.every(item => notifStates[item.key] === false);
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
          {fr ? 'Notifications' : 'Notifications'}
        </Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        {/* En-tête avec description */}
        <View style={styles.headerDescription}>
          <Ionicons name="notifications" size={24} color={COLORS.accent} />
          <Text style={[styles.descriptionText, { color: COLORS.textSecondary }]}>
            {fr
              ? 'Activez ou désactivez les types de notifications que vous souhaitez recevoir'
              : 'Enable or disable the notification types you want to receive'}
          </Text>
        </View>

        {/* Liste des catégories */}
        {notificationCategories.map((category) => {
          const allEnabled = isAllEnabled(category.notifications);
          const allDisabled = isAllDisabled(category.notifications);

          return (
            <View key={category.id} style={[styles.categoryCard, { backgroundColor: COLORS.surface, borderColor: COLORS.border }]}>
              {/* En-tête de catégorie */}
              <View style={styles.categoryHeader}>
                <View style={styles.categoryHeaderLeft}>
                  <View style={[styles.categoryIcon, { backgroundColor: `${category.color}20` }]}>
                    {category.icon}
                  </View>
                  <View>
                    <Text style={[styles.categoryTitle, { color: COLORS.text }]}>
                      {category.title}
                    </Text>
                    <Text style={[styles.categoryDescription, { color: COLORS.textSecondary }]}>
                      {category.description}
                    </Text>
                  </View>
                </View>
                <View style={styles.categoryActions}>
                  {!allEnabled && !allDisabled ? (
                    <TouchableOpacity
                      style={[styles.selectAllButton, { borderColor: category.color }]}
                      onPress={() => toggleAllInCategory(category.notifications, true)}
                    >
                      <Text style={[styles.selectAllText, { color: category.color }]}>
                        {fr ? 'Tout' : 'All'}
                      </Text>
                    </TouchableOpacity>
                  ) : null}
                  <TouchableOpacity
                    style={[styles.toggleAllButton, { backgroundColor: allEnabled ? category.color : 'rgba(255,255,255,0.1)' }]}
                    onPress={() => toggleAllInCategory(category.notifications, !allEnabled)}
                  >
                    <Text style={[styles.toggleAllText, { color: allEnabled ? '#FFFFFF' : COLORS.textSecondary }]}>
                      {allEnabled ? (fr ? '✔ Actif' : '✔ On') : (fr ? 'Tout désactiver' : 'Off all')}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>

              {/* Liste des notifications de la catégorie */}
              <View style={styles.notificationsList}>
                {category.notifications.map((item) => (
                  <View key={item.id} style={[styles.notificationItem, { borderBottomColor: COLORS.border }]}>
                    <Text style={[styles.notificationLabel, { color: COLORS.text }]}>
                      {item.label}
                    </Text>
                    <Switch
                      trackColor={{ false: COLORS.switchTrackOff, true: COLORS.switchTrackOn }}
                      thumbColor={COLORS.switchThumb}
                      value={notifStates[item.key] ?? true}
                      onValueChange={() => toggleSwitch(item.key)}
                    />
                  </View>
                ))}
              </View>
            </View>
          );
        })}

        {/* Pied de page */}
        <View style={styles.footer}>
          <Text style={[styles.footerText, { color: COLORS.textSecondary }]}>
            {fr
              ? 'Les paramètres sont sauvegardés automatiquement'
              : 'Settings are saved automatically'}
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
  },
  scrollView: {
    flex: 1,
  },
  contentContainer: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    paddingBottom: 40,
  },
  headerDescription: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 20,
    paddingHorizontal: 4,
  },
  descriptionText: {
    fontSize: 14,
    flex: 1,
    lineHeight: 20,
  },
  categoryCard: {
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 16,
    overflow: 'hidden',
  },
  categoryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.05)',
  },
  categoryHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  categoryIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  categoryTitle: {
    fontSize: 15,
    fontWeight: '600',
  },
  categoryDescription: {
    fontSize: 11,
  },
  categoryActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  selectAllButton: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
  },
  selectAllText: {
    fontSize: 11,
    fontWeight: '600',
  },
  toggleAllButton: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  toggleAllText: {
    fontSize: 11,
    fontWeight: '600',
  },
  notificationsList: {
    paddingHorizontal: 16,
    paddingVertical: 4,
  },
  notificationItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  notificationLabel: {
    fontSize: 14,
    flex: 1,
    marginRight: 12,
  },
  footer: {
    alignItems: 'center',
    paddingVertical: 16,
  },
  footerText: {
    fontSize: 12,
  },
});

