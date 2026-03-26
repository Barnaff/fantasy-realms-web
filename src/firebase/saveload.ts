import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from './config.ts';
import type { GameState } from '../types/game.ts';

/* ─────────────────────────────────────────────
   Player stats — aggregated lifetime stats
   ───────────────────────────────────────────── */

export interface PlayerStats {
  totalRuns: number;
  totalEncountersCleared: number;
  bestScore: number;
  bestRunEncounters: number;
  totalGoldEarned: number;
  victories: number;
  defeats: number;
  favoriteTag: string | null;
  lastPlayedAt: unknown; // Firestore Timestamp
}

const defaultStats: Omit<PlayerStats, 'lastPlayedAt'> = {
  totalRuns: 0,
  totalEncountersCleared: 0,
  bestScore: 0,
  bestRunEncounters: 0,
  totalGoldEarned: 0,
  victories: 0,
  defeats: 0,
  favoriteTag: null,
};

/* ─────────────────────────────────────────────
   Save / Load game state
   ───────────────────────────────────────────── */

function userDocRef(uid: string) {
  return doc(db, 'players', uid);
}

function saveDocRef(uid: string) {
  return doc(db, 'players', uid, 'saves', 'current');
}

/** Save the current game state to Firestore */
export async function saveGameState(uid: string, state: GameState): Promise<void> {
  // Only save if there's an active run
  if (!state.run) return;

  const saveData = {
    state: JSON.parse(JSON.stringify(state)), // strip non-serializable data
    savedAt: serverTimestamp(),
    version: 1,
  };

  await setDoc(saveDocRef(uid), saveData);
}

/** Load the saved game state from Firestore */
export async function loadGameState(uid: string): Promise<GameState | null> {
  const snap = await getDoc(saveDocRef(uid));
  if (!snap.exists()) return null;

  const data = snap.data();
  if (!data?.state) return null;

  return data.state as GameState;
}

/** Delete save data (on run end or new game) */
export async function deleteSave(uid: string): Promise<void> {
  const { deleteDoc } = await import('firebase/firestore');
  await deleteDoc(saveDocRef(uid));
}

/* ─────────────────────────────────────────────
   Player stats
   ───────────────────────────────────────────── */

/** Load player stats */
export async function loadPlayerStats(uid: string): Promise<PlayerStats | null> {
  const snap = await getDoc(userDocRef(uid));
  if (!snap.exists()) return null;
  return snap.data() as PlayerStats;
}

/** Initialize stats for a new player */
export async function initPlayerStats(uid: string, displayName?: string | null): Promise<void> {
  const snap = await getDoc(userDocRef(uid));
  if (snap.exists()) return; // already exists

  await setDoc(userDocRef(uid), {
    ...defaultStats,
    displayName: displayName || 'Anonymous Adventurer',
    createdAt: serverTimestamp(),
    lastPlayedAt: serverTimestamp(),
  });
}

/** Update stats after a run ends */
export async function updateStatsAfterRun(
  uid: string,
  opts: {
    encountersCleared: number;
    bestScoreThisRun: number;
    goldEarned: number;
    won: boolean;
  },
): Promise<void> {
  const current = await loadPlayerStats(uid);
  const prev = current ?? { ...defaultStats, lastPlayedAt: null };

  await updateDoc(userDocRef(uid), {
    totalRuns: (prev.totalRuns ?? 0) + 1,
    totalEncountersCleared: (prev.totalEncountersCleared ?? 0) + opts.encountersCleared,
    bestScore: Math.max(prev.bestScore ?? 0, opts.bestScoreThisRun),
    bestRunEncounters: Math.max(prev.bestRunEncounters ?? 0, opts.encountersCleared),
    totalGoldEarned: (prev.totalGoldEarned ?? 0) + opts.goldEarned,
    victories: (prev.victories ?? 0) + (opts.won ? 1 : 0),
    defeats: (prev.defeats ?? 0) + (opts.won ? 0 : 1),
    lastPlayedAt: serverTimestamp(),
  });
}

/** Auto-save debouncer — saves at most once per interval */
export function createAutoSaver(uid: string, intervalMs = 5000) {
  let timeout: ReturnType<typeof setTimeout> | null = null;
  let lastState: GameState | null = null;

  return {
    /** Queue a save — will debounce to at most once per interval */
    queueSave(state: GameState) {
      lastState = state;
      if (timeout) return; // already scheduled
      timeout = setTimeout(async () => {
        timeout = null;
        if (lastState) {
          try {
            await saveGameState(uid, lastState);
          } catch (err) {
            console.warn('[AutoSave] Failed:', err);
          }
        }
      }, intervalMs);
    },

    /** Force an immediate save */
    async flush() {
      if (timeout) {
        clearTimeout(timeout);
        timeout = null;
      }
      if (lastState) {
        try {
          await saveGameState(uid, lastState);
        } catch (err) {
          console.warn('[AutoSave] Flush failed:', err);
        }
      }
    },

    /** Cancel pending save */
    cancel() {
      if (timeout) {
        clearTimeout(timeout);
        timeout = null;
      }
    },
  };
}
