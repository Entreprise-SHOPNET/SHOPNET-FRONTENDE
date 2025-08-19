


import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Image,
  TouchableOpacity,
  ActivityIndicator,
  SafeAreaView,
  RefreshControl,
  Animated,
  Modal,
  Pressable
} from 'react-native';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';

const API_BASE_URL = 'https://shopnet-backend.onrender.com';
const CART_ENDPOINT = '/api/cart';


interface CartItem {
  cart_id: number;
  product_id: number;
  title: string;
  price: string | number;
  quantity: number;
  images: string[];
}

export default function CartListScreen() {
  const router = useRouter();
  const [items, setItems] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [discoverLoading, setDiscoverLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedCartId, setSelectedCartId] = useState<number | null>(null);
  const fadeAnim = useRef(new Animated.Value(0)).current;

  const fetchItems = useCallback(async () => {
    try {
      setLoading(true);
      const token = await AsyncStorage.getItem('userToken');
      if (!token) {
        console.error('Token manquant');
        setLoading(false);
        return;
      }

      const resp = await axios.get(`${API_BASE_URL}${CART_ENDPOINT}`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      setItems(Array.isArray(resp.data.cart) ? resp.data.cart : []);
    } catch (err) {
      console.error('Cart fetch error', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchItems();
    }, [fetchItems])
  );

  const onRefresh = () => {
    setRefreshing(true);
    fetchItems();
  };

  const handleDiscover = () => {
    setDiscoverLoading(true);
    setTimeout(() => {
      setDiscoverLoading(false);
      router.push('/(tabs)/Auth/Produits/Fil');
    }, 1000);
  };

  const openDeleteModal = (cart_id: number) => {
    setSelectedCartId(cart_id);
    setModalVisible(true);
  };

  const handleDelete = async () => {
    if (!selectedCartId) return;

    try {
      const token = await AsyncStorage.getItem('userToken');
      if (!token) return;

      const resp = await axios.delete(`${API_BASE_URL}${CART_ENDPOINT}/${selectedCartId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (resp.data.success) {
        setItems(prev => prev.filter(i => i.cart_id !== selectedCartId));
      }
    } catch (err) {
      console.error('Erreur suppression', err);
    } finally {
      setModalVisible(false);
      setSelectedCartId(null);
    }
  };

  useEffect(() => {
    if (items.length === 0 && !loading) {
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true
      }).start();
    }
  }, [items, loading]);

  const renderRow = ({ item }: { item: CartItem }) => {
    const imageUrl =
      Array.isArray(item.images) && item.images.length
        ? item.images[0]
        : 'https://via.placeholder.com/80';

    return (
      <View style={styles.row}>
        <Image source={{ uri: imageUrl }} style={styles.thumb} />
        <View style={styles.info}>
          <Text style={styles.title} numberOfLines={1}>
            {item.title}
          </Text>
          <Text style={styles.price}>${parseFloat(item.price.toString()).toFixed(2)}</Text>
          <Text style={styles.qty}>Quantité : {item.quantity}</Text>
        </View>
        <View style={styles.actions}>
          <TouchableOpacity
            style={styles.btn}
            onPress={() =>
              router.push(`/(tabs)/Auth/Panier/DetailId?id=${item.product_id}`)
            }
          >
            <Text style={styles.btnText}>Détail</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.btn, { backgroundColor: '#d9534f' }]}
            onPress={() => openDeleteModal(item.cart_id)}
          >
            <Text style={styles.btnText}>Supprimer</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.center}>
        <ActivityIndicator size="large" color="#4CB050" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <FlatList
        data={items}
        keyExtractor={(i) => i.cart_id?.toString() || i.product_id?.toString()}
        renderItem={renderRow}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#4CB050"
          />
        }
        ListEmptyComponent={() => (
          <Animated.View style={[styles.empty, { opacity: fadeAnim }]}>
            <Ionicons name="cart" size={64} color="#ccc" />
            <Text style={styles.emptyText}>Votre panier est vide</Text>
            <Text style={styles.discoverText}>Découvrez les nouveaux produits</Text>

            <TouchableOpacity
              style={[
                styles.discoverBtn,
                discoverLoading && { opacity: 0.7 }
              ]}
              onPress={handleDiscover}
              disabled={discoverLoading}
            >
              {discoverLoading ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={styles.discoverBtnText}>Découvrir</Text>
              )}
            </TouchableOpacity>
          </Animated.View>
        )}
      />

      <Modal
        visible={modalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalContainer}>
            <Text style={styles.modalTitle}>Supprimer le produit ?</Text>
            <Text style={styles.modalMessage}>
              Voulez-vous vraiment supprimer ce produit de votre panier ?
            </Text>

            <View style={styles.modalButtons}>
              <Pressable
                style={[styles.modalBtn, styles.modalCancel]}
                onPress={() => setModalVisible(false)}
              >
                <Text style={[styles.modalBtnText, { color: '#4CB050' }]}>Annuler</Text>
              </Pressable>

              <Pressable
                style={[styles.modalBtn, styles.modalDelete]}
                onPress={handleDelete}
              >
                <Text style={[styles.modalBtnText, { color: '#fff' }]}>Supprimer</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F9FA' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  row: {
    flexDirection: 'row',
    padding: 12,
    marginHorizontal: 16,
    marginVertical: 8,
    backgroundColor: '#fff',
    borderRadius: 8,
    elevation: 2,
    alignItems: 'center'
  },
  thumb: {
    width: 80,
    height: 80,
    borderRadius: 6,
    marginRight: 12
  },
  info: { flex: 1, justifyContent: 'center' },
  title: { fontSize: 16, fontWeight: '600', color: '#333' },
  price: { fontSize: 14, color: '#4CB050', marginTop: 4 },
  qty: { fontSize: 13, color: '#757575', marginTop: 2 },
  actions: { justifyContent: 'space-between' },
  btn: {
    backgroundColor: '#202A36',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 4,
    marginVertical: 2
  },
  btnText: { color: '#fff', fontSize: 12, fontWeight: '600' },
  empty: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingTop: 80 },
  emptyText: { marginTop: 16, fontSize: 16, color: '#999' },
  discoverText: { marginTop: 8, fontSize: 14, color: '#666' },
  discoverBtn: {
    marginTop: 16,
    backgroundColor: '#4CB050',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8
  },
  discoverBtnText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center'
  },
  modalContainer: {
    width: '80%',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    alignItems: 'center'
  },
  modalTitle: { fontSize: 18, fontWeight: '600', marginBottom: 8 },
  modalMessage: { fontSize: 14, color: '#666', textAlign: 'center', marginBottom: 20 },
  modalButtons: { flexDirection: 'row', justifyContent: 'space-between', width: '100%' },
  modalBtn: {
    flex: 1,
    paddingVertical: 10,
    marginHorizontal: 5,
    borderRadius: 6,
    alignItems: 'center'
  },
  modalCancel: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#4CB050' },
  modalDelete: { backgroundColor: '#4CB050' },
  modalBtnText: { fontSize: 14, fontWeight: '600' }
});
