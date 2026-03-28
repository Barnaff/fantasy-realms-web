import type { User } from 'firebase/auth';
import { signInAsGuest, signInWithGoogle, upgradeToGoogle, onAuthChange, getCurrentUser } from '../../firebase/auth.ts';
import { saveGameState, loadGameState, deleteSave, initPlayerStats, updateStatsAfterRun, createAutoSaver } from '../../firebase/saveload.ts';
import { GameManager } from './GameManager.ts';
import type { GameState } from '../../types/game.ts';

/**
 * Singleton that manages Firebase auth + auto-save/restore.
 *
 * Flow:
 *  1. BootScene calls AuthManager.init() — signs in anonymously
 *  2. TitleScene checks AuthManager.savedState for a restore
 *  3. GameManager state changes trigger auto-save
 *  4. TitleScene shows Google sign-in button
 */
export class AuthManager {
  private static instance: AuthManager | null = null;

  user: User | null = null;
  savedState: GameState | null = null;
  ready = false;

  private autoSaver: ReturnType<typeof createAutoSaver> | null = null;
  private unsubAuth: (() => void) | null = null;
  private unsubState: (() => void) | null = null;

  private constructor() {}

  static getInstance(): AuthManager {
    if (!AuthManager.instance) AuthManager.instance = new AuthManager();
    return AuthManager.instance;
  }

  /** Called once from BootScene. Signs in and loads saved state. */
  async init(): Promise<void> {
    if (this.ready) return;

    // Subscribe to auth changes
    this.unsubAuth = onAuthChange((user) => {
      this.user = user;
    });

    // Auto sign-in as anonymous guest
    try {
      this.user = getCurrentUser();
      if (!this.user) {
        this.user = await signInAsGuest();
      }
    } catch (e) {
      console.warn('Auth failed, playing offline:', e);
    }

    // Load saved game if logged in
    if (this.user) {
      try {
        await initPlayerStats(this.user.uid, this.user.displayName ?? undefined);
        this.savedState = await loadGameState(this.user.uid);
      } catch (e) {
        console.warn('Failed to load save:', e);
      }
    }

    // Start auto-saver (listens to GameManager state changes)
    this.startAutoSave();

    this.ready = true;
  }

  /** Sign in with Google (upgrade anonymous or fresh sign-in). */
  async signInGoogle(): Promise<User | null> {
    try {
      if (this.user?.isAnonymous) {
        this.user = await upgradeToGoogle();
      } else {
        this.user = await signInWithGoogle();
      }
      if (this.user) {
        await initPlayerStats(this.user.uid, this.user.displayName ?? undefined);
      }
      return this.user;
    } catch (e) {
      console.warn('Google sign-in failed:', e);
      return null;
    }
  }

  get isAnonymous(): boolean {
    return this.user?.isAnonymous ?? true;
  }

  get displayName(): string {
    return this.user?.displayName ?? 'Guest';
  }

  /** Save current game state immediately. */
  async saveNow(): Promise<void> {
    if (!this.user) return;
    const gm = GameManager.getInstance();
    if (!gm.state.run) return;
    try {
      await saveGameState(this.user.uid, gm.state);
    } catch (e) {
      console.warn('Save failed:', e);
    }
  }

  /** Delete current save (called after run ends). */
  async clearSave(): Promise<void> {
    if (!this.user) return;
    try {
      await deleteSave(this.user.uid);
      this.savedState = null;
    } catch (e) {
      console.warn('Delete save failed:', e);
    }
  }

  /** Update player stats after a run ends. */
  async recordRunEnd(opts: { encountersCleared: number; bestScoreThisRun: number; goldEarned: number; won: boolean }): Promise<void> {
    if (!this.user) return;
    try {
      await updateStatsAfterRun(this.user.uid, opts);
    } catch (e) {
      console.warn('Stats update failed:', e);
    }
  }

  /** Start listening to GameManager for auto-save. */
  private startAutoSave(): void {
    if (!this.user) return;
    this.autoSaver = createAutoSaver(this.user.uid, 3000);

    const gm = GameManager.getInstance();
    const handler = () => {
      if (!gm.state.run) return; // don't save if no active run
      this.autoSaver?.queueSave(gm.state);
    };

    // Listen to state changes
    gm.events.on('stateChanged', handler);
    this.unsubState = () => gm.events.off('stateChanged', handler);
  }

  /** Get the scene to navigate to based on saved state. */
  getRestoreScene(): string | null {
    if (!this.savedState?.run) return null;
    const phase = this.savedState.phase;
    switch (phase) {
      case 'map': return 'MapScene';
      case 'player_turn':
      case 'encounter_start':
      case 'hand_finalization': return 'EncounterScene';
      case 'scoring': return 'ScoringScene';
      case 'post_encounter': return 'PostEncounterScene';
      case 'merchant': return 'MerchantScene';
      case 'event': return 'EventScene';
      case 'rest': return 'RestScene';
      case 'boss_intro': return 'BossIntroScene';
      case 'game_over':
      case 'victory': return 'GameOverScene';
      default: return null;
    }
  }

  destroy(): void {
    this.unsubAuth?.();
    this.unsubState?.();
    this.autoSaver?.cancel();
  }
}
