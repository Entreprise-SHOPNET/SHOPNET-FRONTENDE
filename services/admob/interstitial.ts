

import {
  InterstitialAd,
  AdEventType,
  TestIds,
} from 'react-native-google-mobile-ads';

// Utilise une annonce de test en développement et ton bloc réel en production.
const adUnitId = __DEV__
  ? TestIds.INTERSTITIAL
  : 'ca-app-pub-8075684020069689/2669851749';

let interstitial: InterstitialAd | null = null;
let isLoaded = false;

export function loadInterstitialAd() {
  interstitial = InterstitialAd.createForAdRequest(adUnitId, {
    requestNonPersonalizedAdsOnly: false,
  });

  interstitial.addAdEventListener(AdEventType.LOADED, () => {
    isLoaded = true;
    console.log('AdMob interstitiel chargé');
  });

  interstitial.addAdEventListener(AdEventType.ERROR, (error) => {
    isLoaded = false;
    console.log('Erreur AdMob interstitiel :', error);
  });

  interstitial.addAdEventListener(AdEventType.CLOSED, () => {
    isLoaded = false;
    // Précharge automatiquement la prochaine annonce
    loadInterstitialAd();
  });

  interstitial.load();
}

export async function showInterstitialAd(): Promise<boolean> {
  if (interstitial && isLoaded) {
    try {
      await interstitial.show();
      return true;
    } catch (e) {
      console.log('Erreur affichage interstitiel :', e);
      return false;
    }
  }

  console.log('Interstitiel non prêt');
  return false;
}

