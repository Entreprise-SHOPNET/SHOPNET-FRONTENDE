

// SharePrompt.tsx
import React, { useEffect, useState } from 'react';
import { Modal, View, Text, TouchableOpacity, Share, StyleSheet } from 'react-native';
import { FontAwesome } from '@expo/vector-icons';

const GOOGLE_PLAY_LINK = "https://play.google.com/store/apps/details?id=com.shopnet"; // ✅ mets ton vrai ID ici

const SharePrompt = () => {
  const [visible, setVisible] = useState(false);
  const [showCount, setShowCount] = useState(0);

  useEffect(() => {
    // Affiche après 10 secondes
    const timer = setTimeout(() => {
      triggerSharePrompt();
    }, 10000);

    // Puis toutes les 6h
    const interval = setInterval(() => {
      triggerSharePrompt();
    }, 6 * 60 * 60 * 1000);

    return () => {
      clearTimeout(timer);
      clearInterval(interval);
    };
  }, []);

  const triggerSharePrompt = () => {
    setShowCount((prev) => {
      if (prev < 3) { // max 3 fois par jour
        setVisible(true);
        return prev + 1;
      }
      return prev;
    });
  };

  const handleShare = async () => {
    try {
      await Share.share({
        message: `🚀 Découvre SHOPNET, l'application qui simplifie ton shopping et te connecte aux meilleurs produits 🔥  
Télécharge-la maintenant sur Google Play 👉 ${GOOGLE_PLAY_LINK}`,
      });
    } catch (error) {
      console.log(error);
    }
    setVisible(false);
  };

  return (
    <Modal
      transparent
      visible={visible}
      animationType="fade"
      onRequestClose={() => setVisible(false)}
    >
      <View style={styles.overlay}>
        <View style={styles.box}>
          <FontAwesome name="bullhorn" size={40} color="#ff6600" style={{ marginBottom: 15 }} />
          <Text style={styles.title}>📢 Fais connaître SHOPNET !</Text>
          <Text style={styles.message}>
            Partage SHOPNET avec tes amis et aide-nous à grandir 🙌
          </Text>

          <View style={styles.buttons}>
            <TouchableOpacity style={styles.shareBtn} onPress={handleShare}>
              <FontAwesome name="share-alt" size={18} color="#fff" />
              <Text style={styles.shareText}>Partager</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.cancelBtn} onPress={() => setVisible(false)}>
              <Text style={styles.cancelText}>Pas maintenant</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

export default SharePrompt;

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  box: {
    width: '80%',
    backgroundColor: '#fff',
    borderRadius: 15,
    padding: 20,
    alignItems: 'center',
    elevation: 10,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 10,
    textAlign: 'center',
  },
  message: {
    textAlign: 'center',
    fontSize: 15,
    marginBottom: 20,
    color: '#444',
  },
  buttons: {
    flexDirection: 'row',
    justifyContent: 'center',
    width: '100%',
  },
  shareBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ff6600',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 10,
  },
  shareText: {
    color: '#fff',
    marginLeft: 8,
    fontWeight: '600',
    fontSize: 16,
  },
  cancelBtn: {
    marginLeft: 15,
    paddingVertical: 10,
    paddingHorizontal: 15,
  },
  cancelText: {
    color: '#555',
    fontWeight: '500',
    fontSize: 15,
  },
});
