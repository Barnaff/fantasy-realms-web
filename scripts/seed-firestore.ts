/**
 * Seed Firestore with static game data.
 *
 * Usage:
 *   npx tsx scripts/seed-firestore.ts
 */

import { doc, setDoc } from 'firebase/firestore';
import { db } from '../src/firebase/config.ts';
import { CARD_DEFS } from '../src/data/cards.archive.ts';
import { RELIC_DEFS } from '../src/data/relics.ts';
import { EVENT_DEFS } from '../src/data/events.ts';
import { ENCOUNTER_THEMES } from '../src/data/encounterThemes.ts';

async function seed() {
  console.log('Seeding Firestore gameData collection...');

  await setDoc(doc(db, 'gameData', 'cards'), { items: CARD_DEFS });
  console.log(`  cards        — ${CARD_DEFS.length} items written`);

  await setDoc(doc(db, 'gameData', 'relics'), { items: RELIC_DEFS });
  console.log(`  relics       — ${RELIC_DEFS.length} items written`);

  await setDoc(doc(db, 'gameData', 'events'), { items: EVENT_DEFS });
  console.log(`  events       — ${EVENT_DEFS.length} items written`);

  await setDoc(doc(db, 'gameData', 'encounterThemes'), { items: ENCOUNTER_THEMES });
  console.log(`  encounterThemes — ${ENCOUNTER_THEMES.length} items written`);

  console.log('Done!');
  process.exit(0);
}

seed().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
