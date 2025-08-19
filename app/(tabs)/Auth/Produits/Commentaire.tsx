


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
} from 'react-native';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { FontAwesome } from '@expo/vector-icons';
import { useLocalSearchParams } from 'expo-router';



// Consta
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
};

const EMOJIS = ['👍', '❤️', '😂', '😮', '😢', '🙏'];

const Commentaire: React.FC = () => {
  const { productId } = useLocalSearchParams<{ productId?: string }>();
  const parsedProductId = productId ? parseInt(productId) : null;

  const [comments, setComments] = useState<CommentType[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [text, setText] = useState<string>('');
  const [replyTo, setReplyTo] = useState<number | null>(null);
  const [sending, setSending] = useState<boolean>(false);
  const [openReplies, setOpenReplies] = useState<Record<number, boolean>>({});

  if (!parsedProductId || isNaN(parsedProductId)) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <Text style={{ color: 'white', fontSize: 16 }}>
          Produit non spécifié. Impossible de charger les commentaires.
        </Text>
      </View>
    );
  }

  const getToken = async () => {
    const token = await AsyncStorage.getItem('userToken');
    return token;
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
    { comment: text.trim(), parent_id: replyTo },
    { headers: { Authorization: `Bearer ${token}` } }
  );

      if (res.data.success) {
        setText('');
        setReplyTo(null);
        loadComments();
      } else {
        alert(res.data.message || 'Erreur envoi commentaire');
      }
    } catch (error) {
      console.error('Erreur envoi commentaire', error);
      alert('Erreur serveur');
    }
    setSending(false);
  };

  const addEmoji = (emoji: string) => {
    setText(prev => prev + emoji);
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return (
      date.toLocaleDateString() +
      ' ' +
      date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    );
  };

  const renderCommentItem = ({ item }: { item: CommentType }) => {
    const repliesCount = item.children?.length || 0;
    const isOpen = openReplies[item.id];

    return (
      <View key={item.id} style={styles.commentContainer}>
        <View style={styles.commentHeader}>
          <FontAwesome name="user-circle" size={35} color="#FFFFFF" />
          <View style={styles.userInfo}>
            <View style={styles.nameDateRow}>
              <Text style={styles.userName}>{item.user_fullname ?? 'Utilisateur'}</Text>
              <Text style={styles.commentDate}>{formatDate(item.created_at)}</Text>
            </View>
          </View>
        </View>

        <Text style={styles.commentText}>{item.comment}</Text>

        <View style={styles.commentFooter}>
          <TouchableOpacity onPress={() => setReplyTo(item.id)} style={styles.replyButton}>
            <FontAwesome name="reply" size={16} color="#FFFFFF" />
            <Text style={styles.replyText}>Répondre</Text>
          </TouchableOpacity>

          {repliesCount > 0 && (
            <TouchableOpacity
              onPress={() => setOpenReplies(prev => ({ ...prev, [item.id]: !prev[item.id] }))}
              style={styles.showRepliesButton}
            >
              <Text style={styles.showRepliesText}>
                {isOpen ? 'Masquer' : `Voir ${repliesCount} réponse${repliesCount > 1 ? 's' : ''}`}
              </Text>
            </TouchableOpacity>
          )}
        </View>

        {isOpen && item.children && item.children.length > 0 && (
          <View style={styles.repliesContainer}>
            {item.children.map(reply => (
              <View key={reply.id} style={styles.replyItem}>
                <View style={styles.replyLine} />
                <View style={styles.replyContent}>
                  <View style={styles.commentHeader}>
                    <FontAwesome name="user-circle" size={30} color="#FFFFFF" />
                    <View style={styles.userInfo}>
                      <View style={styles.nameDateRow}>
                        <Text style={styles.userName}>{reply.user_fullname ?? 'Utilisateur'}</Text>
                        <Text style={styles.commentDate}>{formatDate(reply.created_at)}</Text>
                      </View>
                    </View>
                  </View>
                  <Text style={styles.commentText}>{reply.comment}</Text>
                  <View style={styles.commentFooter}>
                    <TouchableOpacity
                      onPress={() => setReplyTo(reply.id)}
                      style={styles.replyButton}
                    >
                      <FontAwesome name="reply" size={14} color="#FFFFFF" />
                      <Text style={styles.replyText}>Répondre</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            ))}
          </View>
        )}
      </View>
    );
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.select({ ios: 'padding', android: undefined })}
      style={styles.container}
      keyboardVerticalOffset={100}
    >
      <View style={styles.commentsList}>
        {loading ? (
          <ActivityIndicator size="large" color="#FFFFFF" />
        ) : comments.length === 0 ? (
          <Text style={styles.noComments}>Pas encore de commentaires</Text>
        ) : (
          <FlatList
            data={comments}
            keyExtractor={item => item.id.toString()}
            renderItem={renderCommentItem}
            contentContainerStyle={{ paddingBottom: 10 }}
          />
        )}
      </View>

      {replyTo && (
        <View style={styles.replyInfo}>
          <Text style={{ color: '#eee' }}>Répondre au commentaire #{replyTo}</Text>
          <TouchableOpacity onPress={() => setReplyTo(null)}>
            <Text style={styles.cancelReply}>Annuler</Text>
          </TouchableOpacity>
        </View>
      )}

      <View style={styles.inputContainer}>
        <View style={styles.emojiContainer}>
          {EMOJIS.map(e => (
            <TouchableOpacity key={e} onPress={() => addEmoji(e)} style={styles.emojiButton}>
              <Text style={styles.emoji}>{e}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.inputRow}>
          <TextInput
            style={styles.textInput}
            placeholder="Écrire un commentaire..."
            placeholderTextColor="#999"
            multiline
            value={text}
            onChangeText={setText}
            editable={!sending}
          />
          <TouchableOpacity
            style={[styles.sendButton, sending && { backgroundColor: '#ccc' }]}
            onPress={sendComment}
            disabled={sending}
          >
            {sending ? (
              <ActivityIndicator color="#202A36" />
            ) : (
              <FontAwesome name="send" size={22} color="#202A36" />
            )}
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#202A36',
    padding: 10,
  },
  commentsList: {
    flex: 1,
  },
  noComments: {
    color: '#999',
    textAlign: 'center',
    marginTop: 20,
    fontSize: 16,
  },
  commentContainer: {
    backgroundColor: '#2E3A50',
    borderRadius: 12,
    padding: 12,
    marginVertical: 6,
  },
  commentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  userInfo: {
    flex: 1,
    marginLeft: 10,
    justifyContent: 'center',
  },
  nameDateRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  userName: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 15,
  },
  commentDate: {
    color: '#7C8CA1',
    fontSize: 11,
    marginLeft: 10,
    alignSelf: 'center',
  },
  commentText: {
    color: '#EEE',
    fontSize: 15,
    marginTop: 6,
  },
  commentFooter: {
    flexDirection: 'row',
    marginTop: 8,
  },
  replyButton: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  replyText: {
    color: '#FFFFFF',
    marginLeft: 6,
    fontWeight: '600',
    fontSize: 14,
  },
  showRepliesButton: {
    marginLeft: 15,
    justifyContent: 'center',
  },
  showRepliesText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 14,
  },
  repliesContainer: {
    marginTop: 10,
    paddingLeft: 20,
  },
  replyItem: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  replyLine: {
    width: 3,
    backgroundColor: '#FFFFFF',
    marginRight: 10,
    borderRadius: 1.5,
  },
  replyContent: {
    flex: 1,
  },
  replyInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
    paddingVertical: 10,
    backgroundColor: '#33415C',
    borderRadius: 8,
    marginBottom: 10,
  },
  cancelReply: {
    color: '#FF5252',
    fontWeight: 'bold',
    fontSize: 14,
  },
  inputContainer: {
    borderTopWidth: 1,
    borderColor: '#38455B',
    paddingVertical: 8,
    backgroundColor: '#1B2433',
    borderRadius: 12,
  },
  emojiContainer: {
    flexDirection: 'row',
    marginBottom: 8,
    paddingHorizontal: 8,
  },
  emojiButton: {
    marginHorizontal: 6,
  },
  emoji: {
    fontSize: 26,
    color: '#FFFFFF',
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
  },
  textInput: {
    flex: 1,
    minHeight: 40,
    maxHeight: 90,
    backgroundColor: '#2E3A50',
    borderRadius: 25,
    paddingHorizontal: 16,
    color: 'white',
    fontSize: 15,
  },
  sendButton: {
    marginLeft: 8,
    backgroundColor: '#FFFFFF',
    padding: 10,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    width: 44,
    height: 44,
  },
});

export default Commentaire;
