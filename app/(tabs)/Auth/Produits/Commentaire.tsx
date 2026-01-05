import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Modal,
  Animated,
  Dimensions,
  Alert,
} from 'react-native';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { FontAwesome, Ionicons, MaterialIcons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// Couleurs VIP Premium
const VIP_COLORS = {
  primary: "#00182A",
  secondary: "#4DB14E",
  accent: "#8B5CF6",
  gold: "#FFD700",
  background: "#0F172A",
  surface: "#1E293B",
  surfaceLight: "#334155",
  text: "#FFFFFF",
  textSecondary: "rgba(255,255,255,0.7)",
  textTertiary: "rgba(255,255,255,0.5)",
  border: "rgba(255,255,255,0.1)",
  success: "#10B981",
  warning: "#F59E0B",
  error: "#EF4444",
};

const BASE_URL = 'https://shopnet-backend.onrender.com';

type CommentType = {
  id: number;
  product_id: number;
  user_id: number;
  parent_id: number | null;
  comment: string;
  created_at: string;
  children?: CommentType[];
  user_fullname?: string;
  user_avatar?: string;
};

const QUICK_REPLIES = [
  '💎 Produit premium !',
  '🚀 Livraison express disponible',
  '⭐ Qualité exceptionnelle',
  '💰 Prix compétitif',
  '📦 Stock disponible',
  '🔒 Paiement sécurisé'
];

export default function CommentaireVIP() {
  const { productId } = useLocalSearchParams<{ productId?: string }>();
  const router = useRouter();
  const parsedProductId = productId ? parseInt(productId) : null;

  const [comments, setComments] = useState<CommentType[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [text, setText] = useState<string>('');
  const [replyTo, setReplyTo] = useState<number | null>(null);
  const [sending, setSending] = useState<boolean>(false);
  const [openReplies, setOpenReplies] = useState<Record<number, boolean>>({});
  const [actionMenu, setActionMenu] = useState<{ visible: boolean; comment: CommentType | null; position: { x: number; y: number } }>({
    visible: false,
    comment: null,
    position: { x: 0, y: 0 }
  });
  const [editMode, setEditMode] = useState<{ active: boolean; comment: CommentType | null }>({
    active: false,
    comment: null
  });

  // Animations
  const fadeAnim = React.useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 600,
      useNativeDriver: true,
    }).start();
  }, []);

  if (!parsedProductId || isNaN(parsedProductId)) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <Ionicons name="document-text-outline" size={64} color={VIP_COLORS.textTertiary} />
        <Text style={styles.errorText}>Produit non spécifié</Text>
      </View>
    );
  }

  const getToken = async () => {
    return await AsyncStorage.getItem('userToken');
  };

  const loadComments = async () => {
    setLoading(true);
    try {
      const token = await getToken();
      const res = await axios.get(
        `${BASE_URL}/api/products/${parsedProductId}/comments`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (res.data.success) {
        setComments(res.data.comments);
      } else {
        setComments([]);
      }
    } catch (error: any) {
      console.error('Erreur chargement commentaires', error?.response?.data || error.message);
      setComments([]);
    }
    setLoading(false);
  };

  useEffect(() => {
    if (parsedProductId) loadComments();
  }, [parsedProductId]);

  const sendComment = async () => {
    if (text.trim() === '') return;
    setSending(true);
    try {
      const token = await getToken();
      const res = await axios.post(
        `${BASE_URL}/api/products/${parsedProductId}/comment`,
        { 
          comment: text.trim(), 
          parent_id: replyTo 
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (res.data.success) {
        setText('');
        setReplyTo(null);
        setEditMode({ active: false, comment: null });
        loadComments();
      } else {
        Alert.alert('Erreur', res.data.message || 'Erreur envoi commentaire');
      }
    } catch (error) {
      console.error('Erreur envoi commentaire', error);
      Alert.alert('Erreur', 'Erreur serveur');
    }
    setSending(false);
  };

  const updateComment = async (commentId: number, newText: string) => {
    try {
      const token = await getToken();
      const res = await axios.put(
        `${BASE_URL}/api/products/${parsedProductId}/comments/${commentId}`,
        { comment: newText },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (res.data.success) {
        setEditMode({ active: false, comment: null });
        loadComments();
      }
    } catch (error) {
      Alert.alert('Erreur', 'Impossible de modifier le commentaire');
    }
  };

  const deleteComment = async (commentId: number) => {
    Alert.alert(
      'Supprimer le commentaire',
      'Êtes-vous sûr de vouloir supprimer ce commentaire ?',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Supprimer',
          style: 'destructive',
          onPress: async () => {
            try {
              const token = await getToken();
              const res = await axios.delete(
                `${BASE_URL}/api/products/${parsedProductId}/comments/${commentId}`,
                { headers: { Authorization: `Bearer ${token}` } }
              );

              if (res.data.success) {
                loadComments();
              }
            } catch (error) {
              Alert.alert('Erreur', 'Impossible de supprimer le commentaire');
            }
          },
        },
      ]
    );
  };

  const addQuickReply = (reply: string) => {
    setText(reply);
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'À l\'instant';
    if (diffMins < 60) return `Il y a ${diffMins} min`;
    if (diffHours < 24) return `Il y a ${diffHours} h`;
    if (diffDays < 7) return `Il y a ${diffDays} j`;
    
    return date.toLocaleDateString('fr-FR', { 
      day: 'numeric', 
      month: 'short',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const showActionMenu = (comment: CommentType, event: any) => {
    const { pageX, pageY } = event.nativeEvent;
    setActionMenu({
      visible: true,
      comment,
      position: { x: pageX, y: pageY }
    });
  };

  const handleAction = (action: string, comment: CommentType) => {
    setActionMenu({ visible: false, comment: null, position: { x: 0, y: 0 } });
    
    switch (action) {
      case 'edit':
        setEditMode({ active: true, comment });
        setText(comment.comment);
        break;
      case 'delete':
        deleteComment(comment.id);
        break;
      case 'report':
        Alert.alert('Signaler', 'Commentaire signalé avec succès');
        break;
      case 'profile':
        router.push(`/(tabs)/Auth/Profiles/SellerProfile`);
        break;
    }
  };

  const CommentItem = ({ item, level = 0 }: { item: CommentType; level?: number }) => {
    const repliesCount = item.children?.length || 0;
    const isOpen = openReplies[item.id];
    const isReply = level > 0;

    return (
      <Animated.View 
        style={[
          styles.commentContainer,
          isReply && styles.replyContainer,
          { opacity: fadeAnim }
        ]}
      >
        {/* Avatar */}
        <View style={styles.avatarContainer}>
          <TouchableOpacity onPress={() => router.push(`/(tabs)/Auth/Profiles/SellerProfile`)}>
            <Ionicons name="person-circle" size={40} color={VIP_COLORS.accent} />
          </TouchableOpacity>
        </View>

        {/* Contenu du commentaire */}
        <View style={styles.commentContent}>
          {/* Header avec bulle style Facebook */}
          <View style={styles.commentBubble}>
            <View style={styles.commentHeader}>
              <Text style={styles.userName}>{item.user_fullname || 'Utilisateur VIP'}</Text>
              <Text style={styles.commentDate}>{formatDate(item.created_at)}</Text>
            </View>

            {/* Contenu du commentaire */}
            {editMode.active && editMode.comment?.id === item.id ? (
              <View style={styles.editContainer}>
                <TextInput
                  style={styles.editInput}
                  value={text}
                  onChangeText={setText}
                  multiline
                  autoFocus
                />
                <View style={styles.editActions}>
                  <TouchableOpacity 
                    style={styles.cancelEditButton}
                    onPress={() => setEditMode({ active: false, comment: null })}
                  >
                    <Text style={styles.cancelEditText}>Annuler</Text>
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={styles.saveEditButton}
                    onPress={() => updateComment(item.id, text)}
                  >
                    <Text style={styles.saveEditText}>Sauvegarder</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ) : (
              <Text style={styles.commentText}>{item.comment}</Text>
            )}
          </View>

          {/* Actions du commentaire style Facebook */}
          <View style={styles.commentActions}>
            <TouchableOpacity style={styles.facebookActionButton}>
              <Text style={styles.facebookActionText}>J'aime</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.facebookActionButton}
              onPress={() => setReplyTo(item.id)}
            >
              <Text style={styles.facebookActionText}>Répondre</Text>
            </TouchableOpacity>

            <Text style={styles.actionTime}>{formatDate(item.created_at)}</Text>

            {repliesCount > 0 && (
              <TouchableOpacity
                style={styles.facebookActionButton}
                onPress={() => setOpenReplies(prev => ({ ...prev, [item.id]: !prev[item.id] }))}
              >
                <Text style={styles.facebookActionText}>
                  {isOpen ? 'Masquer' : `${repliesCount} réponse${repliesCount > 1 ? 's' : ''}`}
                </Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity 
              style={styles.menuButton}
              onPress={(e) => showActionMenu(item, e)}
            >
              <Ionicons name="ellipsis-horizontal" size={16} color={VIP_COLORS.textTertiary} />
            </TouchableOpacity>
          </View>

          {/* Réponses */}
          {isOpen && item.children && item.children.length > 0 && (
            <View style={styles.repliesContainer}>
              {item.children.map(reply => (
                <CommentItem key={reply.id} item={reply} level={level + 1} />
              ))}
            </View>
          )}
        </View>
      </Animated.View>
    );
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.select({ ios: 'padding', android: undefined })}
      style={styles.container}
      keyboardVerticalOffset={90}
    >
      {/* Header VIP */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="chevron-back" size={24} color={VIP_COLORS.text} />
        </TouchableOpacity>
        <View style={styles.headerTitleContainer}>
          <Text style={styles.headerTitle}>Commentaires</Text>
          <View style={styles.headerVIPBadge}>
            <Ionicons name="diamond" size={12} color={VIP_COLORS.gold} />
            <Text style={styles.headerVIPText}>PREMIUM</Text>
          </View>
        </View>
        <View style={styles.headerSpacer} />
      </View>

      {/* Liste des commentaires */}
      <Animated.View style={[styles.commentsList, { opacity: fadeAnim }]}>
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={VIP_COLORS.accent} />
            <Text style={styles.loadingText}>Chargement des commentaires...</Text>
          </View>
        ) : comments.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="chatbubble-ellipses-outline" size={80} color={VIP_COLORS.textTertiary} />
            <Text style={styles.emptyTitle}>Aucun commentaire</Text>
            <Text style={styles.emptySubtitle}>
              Soyez le premier à commenter ce produit
            </Text>
          </View>
        ) : (
          <FlatList
            data={comments}
            keyExtractor={item => item.id.toString()}
            renderItem={({ item }) => <CommentItem item={item} />}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.listContent}
          />
        )}
      </Animated.View>

      {/* Indicateur de réponse */}
      {replyTo && (
        <View style={styles.replyIndicator}>
          <View style={styles.replyIndicatorContent}>
            <Ionicons name="return-up-forward" size={16} color={VIP_COLORS.accent} />
            <Text style={styles.replyIndicatorText}>Réponse en cours</Text>
            <TouchableOpacity 
              style={styles.cancelReplyButton}
              onPress={() => setReplyTo(null)}
            >
              <Ionicons name="close" size={16} color={VIP_COLORS.textTertiary} />
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Zone de saisie style Facebook */}
      <View style={styles.inputSection}>
        {/* Input principal */}
        <View style={styles.inputContainer}>
          <View style={styles.inputAvatar}>
            <Ionicons name="person-circle" size={36} color={VIP_COLORS.accent} />
          </View>
          <TextInput
            style={styles.textInput}
            placeholder={replyTo ? "Écrire une réponse..." : "Écrire un commentaire..."}
            placeholderTextColor={VIP_COLORS.textTertiary}
            multiline
            value={text}
            onChangeText={setText}
            editable={!sending}
          />
          <TouchableOpacity
            style={[styles.sendButton, (!text.trim() || sending) && styles.sendButtonDisabled]}
            onPress={sendComment}
            disabled={!text.trim() || sending}
          >
            {sending ? (
              <ActivityIndicator size="small" color={VIP_COLORS.text} />
            ) : (
              <Ionicons 
                name="send" 
                size={20} 
                color={text.trim() ? VIP_COLORS.accent : VIP_COLORS.textTertiary} 
              />
            )}
          </TouchableOpacity>
        </View>

        {/* Réponses rapides */}
        <View style={styles.quickRepliesContainer}>
          <FlatList
            horizontal
            showsHorizontalScrollIndicator={false}
            data={QUICK_REPLIES}
            keyExtractor={(item, index) => index.toString()}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={styles.quickReplyButton}
                onPress={() => addQuickReply(item)}
              >
                <Text style={styles.quickReplyText}>{item}</Text>
              </TouchableOpacity>
            )}
            contentContainerStyle={styles.quickRepliesContent}
          />
        </View>
      </View>

      {/* Menu d'actions */}
      <Modal
        visible={actionMenu.visible}
        transparent
        animationType="fade"
        onRequestClose={() => setActionMenu({ visible: false, comment: null, position: { x: 0, y: 0 } })}
      >
        <TouchableOpacity 
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setActionMenu({ visible: false, comment: null, position: { x: 0, y: 0 } })}
        >
          <View style={[styles.actionMenu, { top: actionMenu.position.y - 100, left: actionMenu.position.x - 120 }]}>
            <TouchableOpacity 
              style={styles.actionMenuItem}
              onPress={() => handleAction('profile', actionMenu.comment!)}
            >
              <Ionicons name="person-outline" size={18} color={VIP_COLORS.text} />
              <Text style={styles.actionMenuText}>Voir le profil</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.actionMenuItem}
              onPress={() => handleAction('edit', actionMenu.comment!)}
            >
              <Ionicons name="pencil-outline" size={18} color={VIP_COLORS.text} />
              <Text style={styles.actionMenuText}>Modifier</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.actionMenuItem}
              onPress={() => handleAction('report', actionMenu.comment!)}
            >
              <Ionicons name="flag-outline" size={18} color={VIP_COLORS.warning} />
              <Text style={[styles.actionMenuText, { color: VIP_COLORS.warning }]}>Signaler</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.actionMenuItem}
              onPress={() => handleAction('delete', actionMenu.comment!)}
            >
              <Ionicons name="trash-outline" size={18} color={VIP_COLORS.error} />
              <Text style={[styles.actionMenuText, { color: VIP_COLORS.error }]}>Supprimer</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: VIP_COLORS.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 60,
    paddingBottom: 16,
    backgroundColor: VIP_COLORS.surface,
    borderBottomWidth: 1,
    borderBottomColor: VIP_COLORS.border,
  },
  backButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  headerTitleContainer: {
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: VIP_COLORS.text,
    marginBottom: 4,
  },
  headerVIPBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 215, 0, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  headerVIPText: {
    fontSize: 10,
    fontWeight: '800',
    color: VIP_COLORS.gold,
    marginLeft: 4,
    letterSpacing: 1,
  },
  headerSpacer: {
    width: 40,
  },
  commentsList: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: VIP_COLORS.textSecondary,
    fontWeight: '500',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: VIP_COLORS.text,
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 16,
    color: VIP_COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
  },
  listContent: {
    padding: 16,
  },
  commentContainer: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  replyContainer: {
    marginLeft: 16,
    paddingLeft: 16,
    borderLeftWidth: 2,
    borderLeftColor: 'rgba(139, 92, 246, 0.3)',
  },
  avatarContainer: {
    marginRight: 12,
  },
  commentContent: {
    flex: 1,
  },
  commentBubble: {
    backgroundColor: VIP_COLORS.surfaceLight,
    borderRadius: 18,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 4,
  },
  commentHeader: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: 6,
  },
  userName: {
    fontSize: 15,
    fontWeight: '700',
    color: VIP_COLORS.text,
    marginRight: 8,
  },
  commentDate: {
    fontSize: 12,
    color: VIP_COLORS.textTertiary,
  },
  commentText: {
    fontSize: 15,
    color: VIP_COLORS.text,
    lineHeight: 20,
  },
  commentActions: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 8,
    gap: 16,
  },
  facebookActionButton: {
    paddingVertical: 4,
  },
  facebookActionText: {
    fontSize: 13,
    color: VIP_COLORS.textSecondary,
    fontWeight: '500',
  },
  actionTime: {
    fontSize: 12,
    color: VIP_COLORS.textTertiary,
    flex: 1,
  },
  menuButton: {
    padding: 4,
  },
  editContainer: {
    marginTop: 8,
  },
  editInput: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 12,
    padding: 12,
    color: VIP_COLORS.text,
    fontSize: 15,
    minHeight: 80,
    textAlignVertical: 'top',
  },
  editActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 8,
    gap: 8,
  },
  cancelEditButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  cancelEditText: {
    color: VIP_COLORS.text,
    fontWeight: '600',
  },
  saveEditButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: VIP_COLORS.accent,
  },
  saveEditText: {
    color: VIP_COLORS.text,
    fontWeight: '600',
  },
  repliesContainer: {
    marginTop: 12,
  },
  replyIndicator: {
    backgroundColor: 'rgba(139, 92, 246, 0.1)',
    padding: 12,
    borderLeftWidth: 3,
    borderLeftColor: VIP_COLORS.accent,
  },
  replyIndicatorContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  replyIndicatorText: {
    flex: 1,
    color: VIP_COLORS.accent,
    fontWeight: '600',
  },
  cancelReplyButton: {
    padding: 4,
  },
  inputSection: {
    borderTopWidth: 1,
    borderTopColor: VIP_COLORS.border,
    backgroundColor: VIP_COLORS.surface,
    padding: 16,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
    marginBottom: 12,
  },
  inputAvatar: {
    marginRight: 8,
  },
  textInput: {
    flex: 1,
    backgroundColor: VIP_COLORS.surfaceLight,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 12,
    color: VIP_COLORS.text,
    fontSize: 15,
    maxHeight: 100,
    textAlignVertical: 'center',
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(139, 92, 246, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  sendButtonDisabled: {
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  quickRepliesContainer: {
    marginTop: 8,
  },
  quickRepliesContent: {
    paddingHorizontal: 4,
  },
  quickReplyButton: {
    backgroundColor: 'rgba(139, 92, 246, 0.1)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    marginRight: 8,
    borderWidth: 1,
    borderColor: 'rgba(139, 92, 246, 0.3)',
  },
  quickReplyText: {
    color: VIP_COLORS.accent,
    fontSize: 13,
    fontWeight: '500',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  actionMenu: {
    position: 'absolute',
    backgroundColor: VIP_COLORS.surface,
    borderRadius: 12,
    padding: 8,
    borderWidth: 1,
    borderColor: VIP_COLORS.border,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
    minWidth: 160,
  },
  actionMenuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    gap: 12,
  },
  actionMenuText: {
    fontSize: 15,
    color: VIP_COLORS.text,
    fontWeight: '500',
  },
  errorText: {
    color: VIP_COLORS.text,
    fontSize: 16,
    marginTop: 12,
  },
});