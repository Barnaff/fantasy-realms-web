import { collection, getDocs, doc, getDoc } from 'firebase/firestore';
import { db } from '../../firebase/config.ts';

const CACHE_KEY = 'fr_card_art_urls';
const CACHE_TTL = 1000 * 60 * 60; // 1 hour

interface CachedArt {
  urls: Record<string, string>;
  timestamp: number;
}

/** Map of cardId → Firebase Storage URL */
let artUrls: Record<string, string> = {};

/**
 * Fetch card art URLs from Firestore (with localStorage cache).
 * Must be called BEFORE Phaser game is created so URLs are available in preload().
 */
export async function loadCardArtUrls(): Promise<Record<string, string>> {
  // Check localStorage cache
  try {
    const cached = localStorage.getItem(CACHE_KEY);
    if (cached) {
      const data: CachedArt = JSON.parse(cached);
      if (Date.now() - data.timestamp < CACHE_TTL && Object.keys(data.urls).length > 0) {
        artUrls = data.urls;
        console.log(`[ArtLoader] ${Object.keys(artUrls).length} URLs from cache`);
        return artUrls;
      }
    }
  } catch { /* ignore */ }

  // Fetch from Firestore
  try {
    const urls: Record<string, string> = {};

    // Source 1: cardArt collection
    const snapshot = await getDocs(collection(db, 'cardArt'));
    snapshot.forEach(d => {
      const data = d.data();
      const url = data.url || data.dataUrl;
      if (url && url.startsWith('http')) {
        urls[d.id] = url;
      }
    });

    // Source 2: card data art field
    try {
      const cardsDoc = await getDoc(doc(db, 'gameData', 'cards'));
      if (cardsDoc.exists()) {
        const items = cardsDoc.data().items as { id: string; art?: string }[];
        for (const card of items) {
          if (card.art && card.art.startsWith('http') && !urls[card.id]) {
            urls[card.id] = card.art;
          }
        }
      }
    } catch { /* ignore */ }

    artUrls = urls;
    console.log(`[ArtLoader] ${Object.keys(artUrls).length} URLs from Firestore`);

    // Cache
    try {
      localStorage.setItem(CACHE_KEY, JSON.stringify({ urls: artUrls, timestamp: Date.now() }));
    } catch { /* ignore */ }
  } catch (err) {
    console.warn('[ArtLoader] Failed to fetch:', err);
  }

  return artUrls;
}

/**
 * Get the map of cardId → URL. Available after loadCardArtUrls() resolves.
 */
export function getArtUrls(): Record<string, string> {
  return artUrls;
}
