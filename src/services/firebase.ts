import { initializeApp } from 'firebase/app';
import { 
  getAuth, 
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  type User
} from 'firebase/auth';
import { getFunctions } from 'firebase/functions';
import { initializeAppCheck, ReCaptchaEnterpriseProvider } from 'firebase/app-check';

// Firebase configuration
// Replace these with your actual Firebase project credentials
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "your-api-key",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "your-project.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "your-project-id",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "your-project.appspot.com",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "your-sender-id",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "your-app-id"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// App Check (docs/design/user-profile.md §8 #3): once VITE_APP_CHECK_SITE_KEY (a reCAPTCHA Enterprise
// site key registered for this app in the Firebase console) is set at build time, every callable
// request carries an App Check token. The server only starts refusing requests without one when
// functions/src/shared/callOptions.ts APP_CHECK_ENFORCED is flipped, after this build is live.
const appCheckSiteKey = import.meta.env.VITE_APP_CHECK_SITE_KEY;
if (appCheckSiteKey && typeof window !== 'undefined') {
  try {
    initializeAppCheck(app, { provider: new ReCaptchaEnterpriseProvider(appCheckSiteKey), isTokenAutoRefreshEnabled: true });
  } catch (e) {
    console.warn('App Check did not start', e instanceof Error ? e.name : 'error');
  }
}

export const auth = getAuth(app);

// Initialize Cloud Functions
export const functions = getFunctions(app);

// Auth functions
export async function signUp(email: string, password: string) {
  return createUserWithEmailAndPassword(auth, email, password);
}

export async function logIn(email: string, password: string) {
  return signInWithEmailAndPassword(auth, email, password);
}

export async function logOut() {
  return signOut(auth);
}

export function onAuthChange(callback: (user: User | null) => void) {
  return onAuthStateChanged(auth, callback);
}

export type { User };
