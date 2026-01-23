

// apiUtils.ts

// ✅ URL de base du backend
// apiUtils.ts - VERSION CORRIGÉE
export const RENDER_API = 'https://shopnet-backend.onrender.com/api';

export function getApiUrl(feedType?: 'latest' | 'popular' | 'feed' | 'all') {
  switch (feedType) {
    case 'latest':
      return `${RENDER_API}/products/latest`;    // ✅ Endpoint standard
    case 'popular':
      return `${RENDER_API}/products/popular`;   // ✅ Endpoint standard
    case 'feed':
      return `${RENDER_API}/products/feed`;      // ✅ Endpoint standard
    case 'all':
    default:
      return `${RENDER_API}/products`;           // ✅ Endpoint standard
  }
}