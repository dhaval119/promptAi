// lib/welcomeEmail.js (client side)
// Requests a welcome email for the signed-in Firebase user. The server verifies
// the ID token and chooses the recipient from Firebase, never from the browser.

import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from './firebase';

export async function sendWelcomeEmail(fbUser, opts = {}) {
  try {
    if (!fbUser || typeof window === 'undefined') return false;

    // Most users already received their welcome email. Avoid calling the API
    // on every login; if this lookup fails, still let the server decide safely.
    // Brand-new signups (opts.fresh) skip this lookup so the email leaves ~300ms sooner.
    if (db && !opts.fresh) {
      try {
        const profile = await getDoc(doc(db, 'users', fbUser.uid));
        if (profile.exists() && profile.data()?.welcome_email_sent === true) return true;
      } catch {
        // Continue to the authenticated endpoint if this optional pre-check fails.
      }
    }

    const idToken = await fbUser.getIdToken();
    const res = await fetch('/api/welcome-email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ idToken }),
      keepalive: true,
    });
    const data = await res.json().catch(() => ({}));

    // The server can report this if another request already sent the message.
    if (res.status === 409 && data.error === 'already_sent') {
      if (db) {
        await setDoc(doc(db, 'users', fbUser.uid), { welcome_email_sent: true }, { merge: true });
      }
      return true;
    }

    if (!res.ok) {
      console.warn('[PromptAI email] Welcome email was not sent:', data.error || `HTTP ${res.status}`);
      return false;
    }

    if (db) {
      await setDoc(doc(db, 'users', fbUser.uid), { welcome_email_sent: true }, { merge: true });
    }
    return true;
  } catch (err) {
    console.warn('[PromptAI email] Welcome email request failed:', err?.message || 'unknown_error');
    return false;
  }
}
