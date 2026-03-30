/**
 * Firebase Cards Admin Script
 *
 * CLI tool for Claude (or developers) to read and update card data
 * directly in Firestore — the single source of truth.
 *
 * Setup (one-time):
 *   1. Go to Firebase Console → Project Settings → Service Accounts
 *   2. Click "Generate new private key"
 *   3. Save it as `firebase-service-account.json` in the project root
 *      (this file is .gitignored)
 *
 * Usage:
 *   npx tsx scripts/firebase-cards.ts list                    List all cards (id, name, tags, baseValue)
 *   npx tsx scripts/firebase-cards.ts get <id>                Get full card JSON
 *   npx tsx scripts/firebase-cards.ts update <id> <json>      Update card fields (partial merge)
 *   npx tsx scripts/firebase-cards.ts set-effects <id> <json> Replace scoring effects array
 *   npx tsx scripts/firebase-cards.ts add <json>              Add a new card (full JSON)
 *   npx tsx scripts/firebase-cards.ts delete <id>             Delete a card by ID
 *   npx tsx scripts/firebase-cards.ts dump                    Dump all cards as JSON to stdout
 */

import { initializeApp, cert, type ServiceAccount } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { readFileSync, existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// ── Init Firebase Admin ──────────────────────────────────────────
const saPath = resolve(__dirname, '..', 'firebase-service-account.json');
if (!existsSync(saPath)) {
  console.error(
    'ERROR: firebase-service-account.json not found in project root.\n' +
    'Download it from Firebase Console → Project Settings → Service Accounts → Generate new private key.\n' +
    'Save it as firebase-service-account.json (it is .gitignored).'
  );
  process.exit(1);
}
const sa: ServiceAccount = JSON.parse(readFileSync(saPath, 'utf-8'));
initializeApp({ credential: cert(sa) });
const db = getFirestore();
const CARDS_DOC = db.doc('gameData/cards');

// ── Helpers ──────────────────────────────────────────────────────
interface Card {
  id: string;
  name: string;
  tags: string[];
  baseValue: number;
  rarity: string;
  flavor: string;
  scoringEffects: any[];
  discardEffect: any;
  artUrl?: string;
  [key: string]: unknown;
}

async function getCards(): Promise<Card[]> {
  const snap = await CARDS_DOC.get();
  if (!snap.exists) throw new Error('No cards document found in Firestore');
  return (snap.data()!.items || []) as Card[];
}

async function saveCards(cards: Card[]): Promise<void> {
  await CARDS_DOC.set({ items: cards });
}

function findCard(cards: Card[], id: string): { card: Card; index: number } {
  const index = cards.findIndex(c => c.id === id);
  if (index === -1) throw new Error(`Card "${id}" not found. Use "list" to see all IDs.`);
  return { card: cards[index], index };
}

// ── Commands ─────────────────────────────────────────────────────
const [,, command, ...args] = process.argv;

async function main() {
  switch (command) {
    case 'list': {
      const cards = await getCards();
      console.log(`\n${cards.length} cards in Firestore:\n`);
      const maxName = Math.max(...cards.map(c => c.name.length));
      for (const c of cards) {
        const tags = c.tags.join(', ');
        const effects = (c.scoringEffects || []).length;
        console.log(
          `  ${c.id.padEnd(25)} ${c.name.padEnd(maxName + 2)} base:${String(c.baseValue).padStart(3)}  [${tags}]  ${effects} effects  (${c.rarity})`
        );
      }
      break;
    }

    case 'get': {
      const id = args[0];
      if (!id) { console.error('Usage: get <card-id>'); process.exit(1); }
      const cards = await getCards();
      const { card } = findCard(cards, id);
      console.log(JSON.stringify(card, null, 2));
      break;
    }

    case 'update': {
      const id = args[0];
      const jsonStr = args.slice(1).join(' ');
      if (!id || !jsonStr) { console.error('Usage: update <card-id> <json-fields>'); process.exit(1); }
      const updates = JSON.parse(jsonStr);
      const cards = await getCards();
      const { card, index } = findCard(cards, id);
      // Merge — don't allow changing the id
      delete updates.id;
      const updated = { ...card, ...updates };
      cards[index] = updated;
      await saveCards(cards);
      console.log(`Updated "${updated.name}" (${id}):`);
      console.log(JSON.stringify(updated, null, 2));
      break;
    }

    case 'set-effects': {
      const id = args[0];
      const jsonStr = args.slice(1).join(' ');
      if (!id || !jsonStr) { console.error('Usage: set-effects <card-id> <effects-json-array>'); process.exit(1); }
      const effects = JSON.parse(jsonStr);
      if (!Array.isArray(effects)) { console.error('Effects must be a JSON array'); process.exit(1); }
      const cards = await getCards();
      const { card, index } = findCard(cards, id);
      card.scoringEffects = effects;
      cards[index] = card;
      await saveCards(cards);
      console.log(`Updated effects for "${card.name}" (${id}):`);
      console.log(JSON.stringify(card.scoringEffects, null, 2));
      break;
    }

    case 'add': {
      const jsonStr = args.join(' ');
      if (!jsonStr) { console.error('Usage: add <full-card-json>'); process.exit(1); }
      const newCard = JSON.parse(jsonStr) as Card;
      if (!newCard.id || !newCard.name) { console.error('Card must have at least id and name'); process.exit(1); }
      const cards = await getCards();
      if (cards.find(c => c.id === newCard.id)) {
        console.error(`Card "${newCard.id}" already exists. Use "update" instead.`);
        process.exit(1);
      }
      cards.push(newCard);
      await saveCards(cards);
      console.log(`Added "${newCard.name}" (${newCard.id}). Total: ${cards.length} cards.`);
      break;
    }

    case 'delete': {
      const id = args[0];
      if (!id) { console.error('Usage: delete <card-id>'); process.exit(1); }
      const cards = await getCards();
      findCard(cards, id); // throws if not found
      const filtered = cards.filter(c => c.id !== id);
      await saveCards(filtered);
      console.log(`Deleted "${id}". ${filtered.length} cards remaining.`);
      break;
    }

    case 'dump': {
      const cards = await getCards();
      console.log(JSON.stringify(cards, null, 2));
      break;
    }

    default:
      console.log(`
Firebase Cards Admin — CLI for managing card data in Firestore

Commands:
  list                    List all cards (id, name, tags, baseValue)
  get <id>                Get full card JSON
  update <id> <json>      Update card fields (partial merge)
  set-effects <id> <json> Replace scoring effects array
  add <json>              Add a new card (full JSON)
  delete <id>             Delete a card by ID
  dump                    Dump all cards as JSON to stdout

Examples:
  npx tsx scripts/firebase-cards.ts list
  npx tsx scripts/firebase-cards.ts get ghoul-pack
  npx tsx scripts/firebase-cards.ts update ghoul-pack '{"baseValue": 7}'
  npx tsx scripts/firebase-cards.ts set-effects ghoul-pack '[{"description":"+5 for each Army in discard","effectId":"bonusPerTagInDiscard","params":{"tags":["Army"],"bonus":5}}]'
`);
  }
}

main()
  .then(() => process.exit(0))
  .catch(err => { console.error('Error:', err.message); process.exit(1); });
