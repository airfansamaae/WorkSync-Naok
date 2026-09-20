import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getAuth,
  signInWithPopup,
  GoogleAuthProvider,
  onAuthStateChanged,
  User,
  signOut,
} from 'firebase/auth';
import firebaseConfig from '../../firebase-applet-config.json';

// OAuth Scopes strictly configured for this application
export const SCOPES = [
  'https://www.googleapis.com/auth/drive',
  'https://www.googleapis.com/auth/drive.file',
];

// Initialize Firebase App
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
export const auth = getAuth(app);

// Configure Google Auth Provider with Drive scopes
const provider = new GoogleAuthProvider();
SCOPES.forEach((scope) => provider.addScope(scope));
provider.setCustomParameters({
  prompt: 'select_account',
});

// Flag to track ongoing sign-in process
let isSigningIn = false;
// In-memory cache for OAuth access token (strictly never stored in localStorage / sessionStorage)
let cachedAccessToken: string | null = null;
let cachedGoogleUser: User | null = null;

// Listeners for auth state changes
type AuthListener = (user: User | null, token: string | null) => void;
const authListeners = new Set<AuthListener>();

export const addAuthListener = (listener: AuthListener) => {
  authListeners.add(listener);
  return () => {
    authListeners.delete(listener);
  };
};

const notifyListeners = () => {
  authListeners.forEach((fn) => {
    try {
      fn(cachedGoogleUser, cachedAccessToken);
    } catch (e) {
      console.warn('[googleAuth] Listener error:', e);
    }
  });
};

/**
 * Initialize Google Auth State Listener on app load
 */
export const initAuth = (
  onAuthSuccess?: (user: User, token: string) => void,
  onAuthFailure?: () => void
) => {
  return onAuthStateChanged(auth, async (user: User | null) => {
    if (user) {
      cachedGoogleUser = user;
      if (cachedAccessToken) {
        if (onAuthSuccess) onAuthSuccess(user, cachedAccessToken);
        notifyListeners();
      } else if (!isSigningIn) {
        // User is signed in to Firebase, but access token needs interactive refresh for Drive API
        if (onAuthFailure) onAuthFailure();
        notifyListeners();
      }
    } else {
      cachedGoogleUser = null;
      cachedAccessToken = null;
      if (onAuthFailure) onAuthFailure();
      notifyListeners();
    }
  });
};

/**
 * Trigger Google Sign-in popup with Google Drive scopes
 */
export const googleSignIn = async (): Promise<{ user: User; accessToken: string } | null> => {
  try {
    isSigningIn = true;
    const result = await signInWithPopup(auth, provider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    if (!credential?.accessToken) {
      throw new Error('ไม่สามารถดึง Access Token จาก Google ได้');
    }

    cachedAccessToken = credential.accessToken;
    cachedGoogleUser = result.user;
    notifyListeners();
    return { user: result.user, accessToken: cachedAccessToken };
  } catch (error: any) {
    console.error('[Google Auth] Sign in error:', error);
    throw error;
  } finally {
    isSigningIn = false;
  }
};

/**
 * Retrieve current active access token (or prompt if needed)
 */
export const getAccessToken = async (): Promise<string | null> => {
  return cachedAccessToken;
};

/**
 * Get cached Google user profile
 */
export const getCachedGoogleUser = (): User | null => {
  return cachedGoogleUser;
};

/**
 * Check if Google Drive is currently connected
 */
export const isGoogleDriveConnected = (): boolean => {
  return !!cachedAccessToken;
};

/**
 * Sign out from Google Auth
 */
export const googleLogout = async () => {
  await signOut(auth);
  cachedAccessToken = null;
  cachedGoogleUser = null;
  notifyListeners();
};
