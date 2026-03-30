/**
 * Live card data – Firestore is the single source of truth.
 *
 * On startup, gameData.load() fetches cards from Firestore and calls
 * _setLiveCardData() to populate these exports.  Until that call,
 * the archive/fallback data is used so early-access at module scope
 * (e.g. BootScene preloading art) still works.
 *
 * DO NOT add card definitions here — edit them in the admin dashboard
 * or via `scripts/firebase-cards.ts`.
 *
 * The static archive lives in cards.archive.ts for reference only.
 */
import type { CardDef } from '../types/card.ts';
import { CARD_DEFS as ARCHIVE_CARDS } from './cards.archive.ts';

// ── Mutable live data ──────────────────────────────────────────────
// Starts with archive fallback; swapped to Firestore data after load.

export let CARD_DEFS: CardDef[] = ARCHIVE_CARDS;
export let CARD_DEF_MAP: Map<string, CardDef> = new Map(
  ARCHIVE_CARDS.map((c) => [c.id, c]),
);

/**
 * Called by GameDataStore.load() after successfully fetching from Firestore.
 * Replaces the live card data so every module importing CARD_DEFS / CARD_DEF_MAP
 * sees the Firestore version (ES module live bindings).
 */
export function _setLiveCardData(cards: CardDef[]): void {
  CARD_DEFS = cards;
  CARD_DEF_MAP = new Map(cards.map((c) => [c.id, c]));
}
