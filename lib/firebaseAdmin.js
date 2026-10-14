// lib/firebaseAdmin.js  (server side only)
// Firebase Admin SDK - used ONLY by pages/api/wake-dev.js to grant Premium safely from the server.
//
// Setup (one time):
//  1. Firebase Console -> Project settings -> Service accounts -> "Generate new private key"
//  2. Vercel -> Settings -> Environment Variables -> FIREBASE_SERVICE_ACCOUNT = the whole JSON file contents
//     (or the same JSON converted to base64)

import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';

function parseServiceAccount() {
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (!raw) return null;
  let sa;
  try {
    sa = JSON.parse(raw);
  } catch {
    try {
      sa = JSON.parse(Buffer.from(raw, 'base64').toString('utf8'));
    } catch {
      return null;
    }
  }
  if (sa && typeof sa.private_key === 'string') sa.private_key = sa.private_key.replace(/\\n/g, '\n');
  return sa;
}

function getAdminApp() {
  if (getApps().length) return getApps()[0];
  const sa = parseServiceAccount();
  if (!sa) return null;
  return initializeApp({ credential: cert(sa) });
}

export function adminConfigured() {
  return !!getAdminApp();
}

export function getAdminAuth() {
  const app = getAdminApp();
  return app ? getAuth(app) : null;
}

export function getAdminDb() {
  const app = getAdminApp();
  return app ? getFirestore(app) : null;
}

export { FieldValue };
