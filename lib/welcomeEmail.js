// lib/welcomeEmail.js  (client side)
// Fire-and-forget: asks the server to send the welcome email for the user who just signed up.
// The server verifies the Firebase ID token itself, so the browser can never choose the recipient.

import { doc, setDoc } from 'firebase/firestore';
import { db } from './firebase';

export async function sendWelcomeEmail(fbUser) {
  try {
    if (!fbUser || typeof window === 'undefined') return false;
    const idToken = await fbUser.getIdToken();
    const res = await fetch('/api/welcome-email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ idToken }),
    });
    if (!res.ok) return false;
    if (db) {
      await setDoc(doc(db, 'users', fbUser.uid), { welcome_email_sent: true }, { merge: true });
    }
    return true;
  } catch (err) {
    console.log('Welcome email error:', err && err.message);
    return false;
  }
}
