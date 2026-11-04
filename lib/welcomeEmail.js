// lib/welcomeEmail.js (client side)
// Requests a welcome email for the signed-in Firebase user. The server verifies
// the ID token and chooses the recipient from Firebase, never from the browser.

import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from './firebase';

const wait = (ms) => new Promise((r) => setTimeout(r, ms));

async function markSent(uid) {
  try {
    if (db) await setDoc(doc(db, 'users', uid), { welcome_email_sent: true }, { merge: true });
  } catch {}
}

export async function sendWelcomeEmail(fbUser, opts = {}) {
  try {
    if (!fbUser || typeof window === 'undefined') return false;

    // Most users already received their welcome email. Avoid calling the API
    // on every login. Brand-new signups (opts.fresh) skip this lookup so the email leaves sooner.
    if (db && !opts.fresh) {
      try {
        const profile = await getDoc(doc(db, 'users', fbUser.uid));
        if (profile.exists() && profile.data()?.welcome_email_sent === true) return true;
      } catch {
        // Continue to the authenticated endpoint if this optional pre-check fails.
      }
    }

    // Up to 3 attempts. A brand-new Google account can need a second for the profile doc to exist,
    // and a provider hiccup should not mean "never sent".
    for (let attempt = 0; attempt < 3; attempt++) {
      const idToken = await fbUser.getIdToken(attempt > 0);
      const res = await fetch('/api/welcome-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idToken }),
        keepalive: true,
      });
      const data = await res.json().catch(() => ({}));

      // Truly already sent (server saw the flag, or it finished sending earlier).
      if (res.status === 409 && data.error === 'already_sent') {
        await markSent(fbUser.uid);
        return true;
      }
      // Another request is still sending right now - do NOT mark as sent (it can still fail).
      if (res.status === 202) return true;

      if (res.ok) {
        await markSent(fbUser.uid);
        return true;
      }

      console.warn('[PromptAI email] Welcome email was not sent:', data.error || `HTTP ${res.status}`);
      // Config problems will not fix themselves; only retry transient errors.
      if (res.status === 503 || res.status === 401 || res.status === 400 || res.status === 429) return false;
      await wait(1500 * (attempt + 1));
    }
    return false;
  } catch (err) {
    console.warn('[PromptAI email] Welcome email request failed:', err?.message || 'unknown_error');
    return false;
  }
}
