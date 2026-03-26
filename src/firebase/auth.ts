import {
  signInAnonymously,
  signInWithPopup,
  GoogleAuthProvider,
  linkWithPopup,
  onAuthStateChanged,
  signOut as firebaseSignOut,
  type User,
} from 'firebase/auth';
import { auth } from './config.ts';

const googleProvider = new GoogleAuthProvider();

/** Sign in anonymously — creates a temporary account */
export async function signInAsGuest(): Promise<User> {
  const result = await signInAnonymously(auth);
  return result.user;
}

/** Sign in with Google popup */
export async function signInWithGoogle(): Promise<User> {
  const result = await signInWithPopup(auth, googleProvider);
  return result.user;
}

/**
 * Upgrade an anonymous account to Google.
 * Links the anonymous user to Google credentials so progress is preserved.
 * If linking fails (e.g. Google account already used), falls back to regular sign-in.
 */
export async function upgradeToGoogle(): Promise<User> {
  const currentUser = auth.currentUser;
  if (currentUser?.isAnonymous) {
    try {
      const result = await linkWithPopup(currentUser, googleProvider);
      return result.user;
    } catch (err: unknown) {
      // If the Google account is already linked to another user,
      // sign in with Google directly (progress from anon may be lost)
      const error = err as { code?: string };
      if (error.code === 'auth/credential-already-in-use') {
        return signInWithGoogle();
      }
      throw err;
    }
  }
  return signInWithGoogle();
}

/** Sign out */
export async function signOutUser(): Promise<void> {
  await firebaseSignOut(auth);
}

/** Subscribe to auth state changes */
export function onAuthChange(callback: (user: User | null) => void): () => void {
  return onAuthStateChanged(auth, callback);
}

/** Get current user (may be null) */
export function getCurrentUser(): User | null {
  return auth.currentUser;
}
