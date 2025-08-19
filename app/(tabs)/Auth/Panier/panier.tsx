


import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Image,
  Alert,
  ActivityIndicator,
  SafeAreaView,
  RefreshControl,
  Animated,
  Dimensions,
  Linking
} from 'react-native';
import { Ionicons, Feather, MaterialCommunityIcons, MaterialIcons } from '@expo/vector-icons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import axios from 'axios';

const API_BASE_URL = 'http://100.64.134.89:5000';
const userId = 24;
const CART_ENDPOINT = `/api/cart/${userId}`;

const COLORS = {
  primary: '#202A36',
  secondary: '#4CB050',
  background: '#F8F9FA',
  text: '#333333',
  lightText: '#757575',
  danger: '#FF5252',
  white: '#FFFFFF',
  border: '#E0E0E0',
  warning: '#FFA000',
  success: '#4CAF50'
};

interface CartItem {
  id: string;
  product_id: string;
  title: string;
  price: number;
  original_price?: number;
  quantity: number;
  stock: number;
  images: string[];
  seller: {
    id: string;
    name: string;
    phone?: string;
    rating: number;
  };
  delivery_options: string[];
  condition: string;
  location: string;
}

export default function PremiumCartScreen() {
  const navigation = useNavigation();
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const fadeAnim = useState(new Animated.Value(0))[0];
  const { width } = Dimensions.get('window');

  const fetchCartItems = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const resp = await axios.get(`${API_BASE_URL}${CART_ENDPOINT}`);
      const data = Array.isArray(resp.data.data) ? resp.data.data : [];
      const items: CartItem[] = data.map((i: any) => ({
        id: (i.cart_id || i.id).toString(),
        product_id: i.product_id.toString(),
        title: i.title,
        price: parseFloat(i.price),
        original_price: i.original_price ? parseFloat(i.original_price) : undefined,
        quantity: parseInt(i.quantity),
        stock: parseInt(i.stock),
        images: Array.isArray(i.images) ? i.images : [],
        seller: {
          id: i.seller_id.toString(),
          name: i.seller_name,
          phone: i.seller_phone,
          rating: parseFloat(i.seller_rating) || 0
        },
        delivery_options: Array.isArray(i.delivery_options) ? i.delivery_options : [],
        condition: i.condition || 'new',
        location: i.location || 'Inconnue'
      }));
      setCartItems(items);
      Animated.timing(fadeAnim, {
        toValue: 1, duration: 500, useNativeDriver: true
      }).start();
    } catch (err) {
      console.error(err);
      setError("Impossible de charger le panier.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [fadeAnim]);

  useFocusEffect(useCallback(() => {
    fetchCartItems();
  }, [fetchCartItems]));

  const onRefresh = () => {
    setRefreshing(true);
    fetchCartItems();
  };

  const handleQuantityChange = async (id: string, qty: number) => {
    if (qty < 1) return;
    setCartItems(prev => prev.map(i => i.id === id ? { ...i, quantity: qty } : i));
    try {
      await axios.put(`${API_BASE_URL}${CART_ENDPOINT}/${id}`, { quantity: qty });
    } catch {
      fetchCartItems();
    }
  };

  const removeItem = (id: string) => {
    Alert.alert(
      'Supprimer',
      'Voulez‑vous vraiment retirer cet article ?',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Supprimer', style: 'destructive',
          onPress: async () => {
            try {
              await axios.delete(`${API_BASE_URL}${CART_ENDPOINT}/${id}`);
              setCartItems(prev => prev.filter(i => i.id !== id));
              setSelectedItems(prev => prev.filter(x => x !== id));
            } catch (err) {
              console.error(err);
            }
          }
        }
      ]
    );
  };

  const toggleSelectItem = (id: string) => {
    setSelectedItems(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const callWhatsApp = (phone?: string, title?: string) => {
    if (!phone) return Alert.alert('Pas de numéro WhatsApp dispo');
    const cleaned = phone.replace(/\D/g,'').replace(/^0/,'243');
    const url = `https://wa.me/${cleaned}?text=${encodeURIComponent(`Bonjour, je suis intéressé par "${title}"`)}`;
    Linking.openURL(url).catch(() => Alert.alert('Impossible d\'ouvrir WhatsApp'));
  };

  const goToBuy = (productId: string) => {
    // route to ProductDetail screen
    navigation.navigate('ProductDetail', { productId });
  };

  const calculateTotals = () => {
    const sel = cartItems.filter(i => selectedItems.includes(i.id));
    const subtotal = sel.reduce((s,i) => s + i.price * i.quantity, 0);
    const savings = sel.reduce((s,i) =>
      s + ((i.original_price||i.price) - i.price) * i.quantity
    ,0);
    const hasExp = sel.some(i => i.delivery_options.includes('express'));
    const delivery = hasExp ? 9.99 : 0;
    const total = subtotal + delivery;
    return {
      subtotal: subtotal.toFixed(2),
      savings: savings.toFixed(2),
      delivery: delivery.toFixed(2),
      total: total.toFixed(2)
    };
  };

  const proceedToCheckout = () => {
    if (selectedItems.length===0)
      return Alert.alert('Sélectionnez au moins un article');
    navigation.navigate('Checkout', {
      items: cartItems.filter(i => selectedItems.includes(i.id)),
      totals: calculateTotals()
    });
  };

  if (loading && !refreshing) {
    return <View style={[styles.container,{justifyContent:'center'}]}>
      <ActivityIndicator size="large" color={COLORS.secondary}/>
    </View>;
  }
  if (error) {
    return <View style={[styles.container,{justifyContent:'center',alignItems:'center'}]}>
      <MaterialCommunityIcons name="alert-circle" size={48} color={COLORS.danger}/>
      <Text style={styles.errorText}>{error}</Text>
      <TouchableOpacity style={styles.retryButton} onPress={fetchCartItems}>
        <Text style={styles.retryButtonText}>Réessayer</Text>
      </TouchableOpacity>
    </View>;
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={COLORS.white}/>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Mon Panier Premium</Text>
        <View style={{width:24}}/>
      </View>

      {/* Liste */}
      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[COLORS.secondary]}/>
        }
      >
        {cartItems.length===0 ? (
          <View style={styles.emptyCart}>
            <MaterialCommunityIcons name="cart-off" size={72} color={COLORS.lightText}/>
            <Text style={styles.emptyText}>Votre panier est vide</Text>
            <TouchableOpacity style={styles.shopButton} onPress={()=>navigation.navigate('Home')}>
              <Text style={styles.shopButtonText}>Découvrir nos produits</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <Animated.View style={{opacity:fadeAnim}}>
            {/* Tout sélectionner */}
            <TouchableOpacity style={styles.selectAllContainer} onPress={()=>{
              setSelectedItems(sel=> sel.length===cartItems.length?[]:cartItems.map(i=>i.id));
            }}>
              <Ionicons
                name={selectedItems.length===cartItems.length?'checkbox':'square-outline'}
                size={24}
                color={selectedItems.length===cartItems.length?COLORS.secondary:COLORS.lightText}
              />
              <Text style={styles.selectAllText}>
                {selectedItems.length===cartItems.length?'Tout désélectionner':'Tout sélectionner'}
              </Text>
            </TouchableOpacity>

            {/* Items */}
            {cartItems.map(item => (
              <View
                key={item.id}
                style={[styles.card, selectedItems.includes(item.id)&&styles.selectedCard]}
              >
                <TouchableOpacity style={styles.checkbox} onPress={()=>toggleSelectItem(item.id)}>
                  <Ionicons
                    name={selectedItems.includes(item.id)?'checkbox':'square-outline'}
                    size={24}
                    color={selectedItems.includes(item.id)?COLORS.secondary:COLORS.lightText}
                  />
                </TouchableOpacity>

                <Image
                  source={{uri:item.images[0]||'https://via.placeholder.com/150'}}
                  style={styles.productImage}
                />

                <View style={styles.productDetails}>
                  <Text style={styles.productTitle} numberOfLines={2}>{item.title}</Text>

                  <View style={styles.sellerInfo}>
                    <Text style={styles.sellerName}>{item.seller.name}</Text>
                    <View style={styles.rating}>
                      <Ionicons name="star" size={16} color="#FFC107"/>
                      <Text style={styles.ratingText}>{item.seller.rating.toFixed(1)}</Text>
                    </View>
                  </View>

                  {/* Whatsapp & Acheter */}
                  <View style={styles.actionsRow}>
                    <TouchableOpacity
                      style={styles.whatsappBtn}
                      onPress={()=>callWhatsApp(item.seller.phone, item.title)}
                    >
                      <FontAwesome name="whatsapp" size={20} color={COLORS.white}/>
                      <Text style={styles.actionText}>Contacter</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.buyBtn}
                      onPress={()=>goToBuy(item.product_id)}
                    >
                      <FontAwesome name="shopping-cart" size={20} color={COLORS.white}/>
                      <Text style={styles.actionText}>Acheter</Text>
                    </TouchableOpacity>
                  </View>

                  {/* Quantité & prix */}
                  <View style={styles.priceRow}>
                    <View style={styles.priceContainer}>
                      <Text style={styles.price}>${item.price.toFixed(2)}</Text>
                      {item.original_price && (
                        <Text style={styles.originalPrice}>${item.original_price.toFixed(2)}</Text>
                      )}
                    </View>

                    <View style={styles.quantityContainer}>
                      <TouchableOpacity
                        onPress={()=>handleQuantityChange(item.id,item.quantity-1)}
                        disabled={item.quantity<=1}
                      >
                        <Feather
                          name="minus-circle" size={24}
                          color={item.quantity<=1?COLORS.border:COLORS.secondary}
                        />
                      </TouchableOpacity>
                      <Text style={styles.quantity}>{item.quantity}</Text>
                      <TouchableOpacity
                        onPress={()=>handleQuantityChange(item.id,item.quantity+1)}
                        disabled={item.quantity>=item.stock}
                      >
                        <Feather
                          name="plus-circle" size={24}
                          color={item.quantity>=item.stock?COLORS.border:COLORS.secondary}
                        />
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>

                <TouchableOpacity style={styles.deleteButton} onPress={()=>removeItem(item.id)}>
                  <Ionicons name="trash-outline" size={20} color={COLORS.danger}/>
                </TouchableOpacity>
              </View>
            ))}
          </Animated.View>
        )}
      </ScrollView>

      {/* Footer résumé + checkout */}
      {cartItems.length>0 && (
        <View style={styles.footer}>
          <View style={styles.summarySection}>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Articles ({selectedItems.length}):</Text>
              <Text style={styles.summaryValue}>${calculateTotals().subtotal}</Text>
            </View>
            {!!parseFloat(calculateTotals().savings) && (
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Économies:</Text>
                <Text style={[styles.summaryValue,{color:COLORS.success}]}>
                  -${calculateTotals().savings}
                </Text>
              </View>
            )}
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Livraison:</Text>
              <Text style={styles.summaryValue}>${calculateTotals().delivery}</Text>
            </View>
            <View style={styles.divider}/>
            <View style={[styles.summaryRow,{marginTop:8}]}>
              <Text style={styles.totalLabel}>Total:</Text>
              <Text style={styles.totalValue}>${calculateTotals().total}</Text>
            </View>
          </View>
          <TouchableOpacity
            style={[styles.checkoutButton,selectedItems.length===0&&styles.disabledButton]}
            onPress={proceedToCheckout}
            disabled={selectedItems.length===0}
          >
            <Text style={styles.checkoutButtonText}>Passer commande</Text>
            <Feather name="arrow-right" size={20} color={COLORS.white}/>
          </TouchableOpacity>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {flex:1,backgroundColor:COLORS.background},
  header: {
    flexDirection:'row',justifyContent:'space-between',
    alignItems:'center',padding:16,backgroundColor:COLORS.primary
  },
  headerTitle:{fontSize:20,fontWeight:'bold',color:COLORS.white},
  scrollView:{flex:1,paddingHorizontal:16,paddingTop:16},
  emptyCart:{flex:1,justifyContent:'center',alignItems:'center',paddingVertical:100},
  emptyText:{fontSize:18,color:COLORS.lightText,marginVertical:16},
  shopButton:{backgroundColor:COLORS.secondary,padding:12, borderRadius:8,marginTop:16},
  shopButtonText:{color:COLORS.white,fontWeight:'bold',fontSize:16},
  errorText:{fontSize:16,color:COLORS.danger,textAlign:'center',margin:16},
  retryButton:{backgroundColor:COLORS.secondary,padding:12,borderRadius:8,marginTop:16},
  retryButtonText:{color:COLORS.white,fontWeight:'bold',fontSize:16},
  selectAllContainer:{flexDirection:'row',alignItems:'center',paddingVertical:12,marginBottom:8},
  selectAllText:{marginLeft:12,fontSize:16,color:COLORS.text},
  card:{
    backgroundColor:COLORS.white,borderRadius:12,padding:16,marginBottom:12,
    flexDirection:'row',alignItems:'center',borderWidth:1,borderColor:COLORS.border
  },
  selectedCard:{borderColor:COLORS.secondary,backgroundColor:'#F0F9F0'},
  checkbox:{marginRight:12},
  productImage:{width:80,height:80,borderRadius:8,marginRight:12},
  productDetails:{flex:1},
  productTitle:{fontSize:16,fontWeight:'bold',color:COLORS.text,marginBottom:4},
  sellerInfo:{flexDirection:'row',alignItems:'center',marginBottom:4},
  sellerName:{fontSize:14,color:COLORS.primary,marginRight:8,maxWidth:'60%'},
  rating:{flexDirection:'row',alignItems:'center'},
  ratingText:{fontSize:14,color:COLORS.text,marginLeft:4},
  actionsRow:{flexDirection:'row',marginVertical:6},
  whatsappBtn:{
    flexDirection:'row',alignItems:'center',backgroundColor:'#25D366',
    padding:6, borderRadius:20,marginRight:8
  },
  buyBtn:{
    flexDirection:'row',alignItems:'center',backgroundColor:COLORS.secondary,
    padding:6,borderRadius:20
  },
  actionText:{color:COLORS.white,marginLeft:6,fontSize:14,fontWeight:'600'},
  priceRow:{flexDirection:'row',justifyContent:'space-between',alignItems:'center'},
  priceContainer:{flexDirection:'row',alignItems:'center'},
  price:{fontSize:16,fontWeight:'bold',color:COLORS.secondary},
  originalPrice:{fontSize:14,color:COLORS.lightText,textDecorationLine:'line-through',marginLeft:8},
  quantityContainer:{flexDirection:'row',alignItems:'center',backgroundColor:'#F5F5F5',borderRadius:20,padding:4},
  quantity:{marginHorizontal:12,fontSize:16,color:COLORS.text},
  deleteButton:{position:'absolute',top:16,right:16},
  footer:{padding:16,backgroundColor:COLORS.white,borderTopWidth:1,borderTopColor:COLORS.border},
  summarySection:{marginBottom:16},
  summaryRow:{flexDirection:'row',justifyContent:'space-between',marginBottom:8},
  summaryLabel:{fontSize:14,color:COLORS.lightText},
  summaryValue:{fontSize:14,color:COLORS.text,fontWeight:'500'},
  divider:{height:1,backgroundColor:COLORS.border,marginVertical:8},
  totalLabel:{fontSize:16,color:COLORS.text,fontWeight:'bold'},
  totalValue:{fontSize:16,color:COLORS.primary,fontWeight:'bold'},
  checkoutButton:{flexDirection:'row',justifyContent:'center',alignItems:'center',backgroundColor:COLORS.secondary,padding:16,borderRadius:8},
  disabledButton:{backgroundColor:'#BDBDBD',opacity:0.7},
  checkoutButtonText:{color:COLORS.white,fontWeight:'bold',fontSize:16,marginRight:8}
});
