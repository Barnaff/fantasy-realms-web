import { create } from 'zustand';
import type { User } from 'firebase/auth';
import { onAuthChange, signInAsGuest, signInWithGoogle, upgradeToGoogle, signOutUser } from '../firebase/auth.ts';
import { initPlayerStats, loadPlayerStats, type PlayerStats } from '../firebase/saveload.ts';

interface AuthState {
  user: User | null;
  stats: PlayerStats | null;
  loading: boolean;
  error: string | null;

  /** Initialize auth listener — call once at app start */
  init: () => () => void;

  /** Sign in as guest (anonymous) */
  loginAsGuest: () => Promise<void>;

  /** Sign in with Google */
  loginWithGoogle: () => Promise<void>;

  /** Upgrade anonymous account to Google */
  upgradeAccount: () => Promise<void>;

  /** Sign out */
  logout: () => Promise<void>;

  /** Refresh stats from Firestore */
  refreshStats: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  stats: null,
  loading: true,
  error: null,

  init() {
    return onAuthChange(async (user) => {
      if (user) {
        set({ user, loading: false });
        try {
          await initPlayerStats(user.uid, user.displayName);
          const stats = await loadPlayerStats(user.uid);
          set({ stats });
        } catch (err) {
          console.warn('[Auth] Failed to init/load stats:', err);
        }
      } else {
        // No user — auto sign in as anonymous
        try {
          await signInAsGuest();
          // onAuthChange will fire again with the new anonymous user
        } catch (err) {
          console.warn('[Auth] Failed to auto-sign-in as guest:', err);
          set({ loading: false, stats: null });
        }
      }
    });
  },

  async loginAsGuest() {
    set({ loading: true, error: null });
    try {
      await signInAsGuest();
    } catch (err: unknown) {
      set({ error: (err as Error).message, loading: false });
    }
  },

  async loginWithGoogle() {
    set({ loading: true, error: null });
    try {
      await signInWithGoogle();
    } catch (err: unknown) {
      set({ error: (err as Error).message, loading: false });
    }
  },

  async upgradeAccount() {
    set({ error: null });
    try {
      await upgradeToGoogle();
      // Refresh user state
      const { user } = get();
      if (user) {
        const stats = await loadPlayerStats(user.uid);
        set({ stats });
      }
    } catch (err: unknown) {
      set({ error: (err as Error).message });
    }
  },

  async logout() {
    try {
      await signOutUser();
      set({ user: null, stats: null });
    } catch (err: unknown) {
      set({ error: (err as Error).message });
    }
  },

  async refreshStats() {
    const { user } = get();
    if (!user) return;
    try {
      const stats = await loadPlayerStats(user.uid);
      set({ stats });
    } catch (err) {
      console.warn('[Auth] Failed to refresh stats:', err);
    }
  },
}));
