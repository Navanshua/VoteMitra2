/**
 * Firebase / Google Identity Platform auth helpers.
 * Reads config from VITE_ env vars.
 *
 * Uses signInWithPopup (primary) with signInWithRedirect as fallback.
 * The Vite dev server is configured with COOP: same-origin-allow-popups
 * to support popup-based auth without browser security issues.
 */
import { initializeApp } from 'firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  signOut,
  onAuthStateChanged,
} from 'firebase/auth';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_GCP_API_KEY,
  authDomain: import.meta.env.VITE_AUTH_DOMAIN
    || `${import.meta.env.VITE_GCP_PROJECT_ID}.firebaseapp.com`,
  projectId: import.meta.env.VITE_GCP_PROJECT_ID,
  storageBucket: `${import.meta.env.VITE_GCP_PROJECT_ID}.appspot.com`,
  messagingSenderId: import.meta.env.VITE_MESSAGING_SENDER_ID || '',
  appId: import.meta.env.VITE_APP_ID || '',
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const provider = new GoogleAuthProvider();

/**
 * Sign in with Google — uses popup (works with COOP header set in vite.config).
 * Falls back to redirect if popup is blocked.
 */
export const signInWithGoogle = async () => {
  try {
    const result = await signInWithPopup(auth, provider);
    return result;
  } catch (err) {
    // If popup was blocked or failed with COOP error, fall back to redirect
    if (
      err.code === 'auth/popup-blocked' ||
      err.code === 'auth/popup-closed-by-user' ||
      err.code === 'auth/cancelled-popup-request'
    ) {
      console.warn('⚠️ Popup blocked/closed, falling back to redirect...');
      return signInWithRedirect(auth, provider);
    }
    throw err;
  }
};

// Helper to handle the redirect result when the app reloads (fallback path)
export const handleRedirectResult = () => getRedirectResult(auth);

export const signOutUser = () => signOut(auth);
export const onAuthChange = (cb) => onAuthStateChanged(auth, cb);
export const getIdToken = async () => {
  if (!auth.currentUser) return null;
  return auth.currentUser.getIdToken(true);
};

export { auth };