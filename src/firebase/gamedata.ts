import { doc, getDoc } from 'firebase/firestore';
import { db } from './config.ts';
import { CARD_DEFS } from '../data/cards.ts';
import { RELIC_DEFS } from '../data/relics.ts';
import { EVENT_DEFS } from '../data/events.ts';
import type { EventDef } from '../data/events.ts';
import { ENCOUNTER_THEMES } from '../data/encounterThemes.ts';
import type { EncounterTheme } from '../data/encounterThemes.ts';
import type { CardDef } from '../types/card.ts';
import type { RelicDef } from '../types/relic.ts';

const CACHE_KEY = 'fr_gamedata_cache';

interface GameDataCache {
  cards: CardDef[];
  relics: RelicDef[];
  events: EventDef[];
  encounterThemes: EncounterTheme[];
  timestamp: number;
}

function buildMap<T extends { id: string }>(items: T[]): Map<string, T> {
  const map = new Map<string, T>();
  for (const item of items) {
    map.set(item.id, item);
  }
  return map;
}

class GameDataStore {
  private cards: CardDef[] = [];
  private relics: RelicDef[] = [];
  private events: EventDef[] = [];
  private encounterThemes: EncounterTheme[] = [];
  private initialized = false;

  cardDefMap: Map<string, CardDef> = new Map();
  relicDefMap: Map<string, RelicDef> = new Map();
  eventDefMap: Map<string, EventDef> = new Map();

  async load(): Promise<void> {
    if (this.initialized) return;

    // Try loading from Firestore
    try {
      const [cardsSnap, relicsSnap, eventsSnap, themesSnap] = await Promise.all([
        getDoc(doc(db, 'gameData', 'cards')),
        getDoc(doc(db, 'gameData', 'relics')),
        getDoc(doc(db, 'gameData', 'events')),
        getDoc(doc(db, 'gameData', 'encounterThemes')),
      ]);

      const hasAll =
        cardsSnap.exists() && relicsSnap.exists() && eventsSnap.exists() && themesSnap.exists();

      if (hasAll) {
        this.cards = cardsSnap.data()!.items as CardDef[];
        this.relics = relicsSnap.data()!.items as RelicDef[];
        this.events = eventsSnap.data()!.items as EventDef[];
        this.encounterThemes = themesSnap.data()!.items as EncounterTheme[];

        // Cache to localStorage
        try {
          const cache: GameDataCache = {
            cards: this.cards,
            relics: this.relics,
            events: this.events,
            encounterThemes: this.encounterThemes,
            timestamp: Date.now(),
          };
          localStorage.setItem(CACHE_KEY, JSON.stringify(cache));
        } catch {
          // localStorage may be unavailable or full; ignore
        }

        this.rebuildMaps();
        this.initialized = true;
        console.log('[GameData] Loaded from Firestore');
        return;
      }
    } catch (err) {
      console.warn('[GameData] Firestore fetch failed, trying cache...', err);
    }

    // Try loading from localStorage cache
    try {
      const raw = localStorage.getItem(CACHE_KEY);
      if (raw) {
        const cache: GameDataCache = JSON.parse(raw);
        if (cache.cards?.length && cache.relics?.length && cache.events?.length && cache.encounterThemes?.length) {
          this.cards = cache.cards;
          this.relics = cache.relics;
          this.events = cache.events;
          this.encounterThemes = cache.encounterThemes;
          this.rebuildMaps();
          this.initialized = true;
          console.log('[GameData] Loaded from localStorage cache');
          return;
        }
      }
    } catch {
      // cache corrupt or unavailable
    }

    // Fall back to static imports
    this.cards = CARD_DEFS;
    this.relics = RELIC_DEFS;
    this.events = EVENT_DEFS;
    this.encounterThemes = ENCOUNTER_THEMES;
    this.rebuildMaps();
    this.initialized = true;
    console.log('[GameData] Loaded from static imports (fallback)');
  }

  private rebuildMaps(): void {
    this.cardDefMap = buildMap(this.cards);
    this.relicDefMap = buildMap(this.relics);
    this.eventDefMap = buildMap(this.events);
  }

  getCards(): CardDef[] {
    return this.cards;
  }

  getRelics(): RelicDef[] {
    return this.relics;
  }

  getEvents(): EventDef[] {
    return this.events;
  }

  getThemes(): EncounterTheme[] {
    return this.encounterThemes;
  }
}

/** Singleton instance holding live game data. */
export const gameData = new GameDataStore();

/** Convenience re-exports for map access. */
export const CARD_DEF_MAP = (): Map<string, CardDef> => gameData.cardDefMap;
export const RELIC_DEF_MAP = (): Map<string, RelicDef> => gameData.relicDefMap;
export const EVENT_DEF_MAP = (): Map<string, EventDef> => gameData.eventDefMap;

/**
 * Initialise the game data store.  Must be awaited before the game starts.
 * Safe to call multiple times; subsequent calls are no-ops.
 */
export async function loadGameData(): Promise<void> {
  await gameData.load();
}
