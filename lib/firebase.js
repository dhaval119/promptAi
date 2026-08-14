// lib/firebase.js
// One central Firebase init for the whole app - Auth + Firestore.
// Safe during Next.js build / SSR when env vars are not yet available.

import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
};

const hasValidConfig =
  typeof firebaseConfig.apiKey === 'string' &&
  firebaseConfig.apiKey.length > 0 &&
  firebaseConfig.apiKey !== 'your_gemini_key_here' &&
  !firebaseConfig.apiKey.includes('your_');

let app = null;
let auth = null;
let db = null;
let googleProvider = null;

if (hasValidConfig) {
  app = getApps().length ? getApp() : initializeApp(firebaseConfig);
  auth = getAuth(app);
  db = getFirestore(app);
  googleProvider = new GoogleAuthProvider();
} else if (typeof window !== 'undefined') {
  console.warn(
    '[Firebase] NEXT_PUBLIC_FIREBASE_* env vars are missing or invalid. Auth will not work.'
  );
}

export { auth, db, googleProvider };
export default app;