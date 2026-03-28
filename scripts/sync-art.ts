/**
 * Sync card art from Firebase Storage to local public/art/ folder.
 * Run: npx tsx scripts/sync-art.ts
 *
 * Downloads all images from the Firestore cardArt collection URLs
 * to public/art/{cardId}.png for use in the game.
 */

import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs } from 'firebase/firestore';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const firebaseConfig = {
  apiKey: "AIzaSyCeaipUe5l93DTozhrRICqPklaP5BSErUc",
  authDomain: "fantasy-realms-web.firebaseapp.com",
  projectId: "fantasy-realms-web",
  storageBucket: "fantasy-realms-web.firebasestorage.app",
  messagingSenderId: "590470785583",
  appId: "1:590470785583:web:f7555850d8a417de2f74da",
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const ART_DIR = path.resolve(__dirname, '..', 'public', 'art');

async function syncArt() {
  console.log('Syncing card art from Firebase to public/art/...\n');

  // Ensure art directory exists
  if (!fs.existsSync(ART_DIR)) {
    fs.mkdirSync(ART_DIR, { recursive: true });
  }

  // Fetch all cardArt docs from Firestore
  const snapshot = await getDocs(collection(db, 'cardArt'));
  const cards: { id: string; url: string }[] = [];

  snapshot.forEach(doc => {
    const data = doc.data();
    const url = data.url || data.dataUrl;
    if (url && url.startsWith('http')) {
      cards.push({ id: doc.id, url });
    }
  });

  console.log(`Found ${cards.length} card art entries in Firestore\n`);

  let downloaded = 0;
  let skipped = 0;
  let failed = 0;

  for (const card of cards) {
    const filePath = path.join(ART_DIR, `${card.id}.png`);

    // Skip if file already exists and is non-empty
    if (fs.existsSync(filePath) && fs.statSync(filePath).size > 1000) {
      // Check if --force flag is set
      if (!process.argv.includes('--force')) {
        skipped++;
        continue;
      }
    }

    try {
      const response = await fetch(card.url);
      if (!response.ok) {
        console.log(`  ✗ ${card.id} — HTTP ${response.status}`);
        failed++;
        continue;
      }

      const buffer = Buffer.from(await response.arrayBuffer());
      fs.writeFileSync(filePath, buffer);
      const sizeKb = Math.round(buffer.length / 1024);
      console.log(`  ✓ ${card.id} (${sizeKb} KB)`);
      downloaded++;
    } catch (err) {
      console.log(`  ✗ ${card.id} — ${err instanceof Error ? err.message : 'Unknown error'}`);
      failed++;
    }
  }

  console.log(`\nDone! Downloaded: ${downloaded}, Skipped: ${skipped}, Failed: ${failed}`);
  console.log(`Art directory: ${ART_DIR}`);

  if (skipped > 0) {
    console.log(`\nTip: Use --force to re-download existing files`);
  }

  process.exit(0);
}

syncArt().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
