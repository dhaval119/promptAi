// lib/geoDevice.js  (client side)
// Saves "where from" and "which device" on the user's own document once per browser session.
//   users/{uid}.last_country  -> "IN", "US", ...
//   users/{uid}.last_device   -> "mobile" | "pc"
//   users/{uid}.last_seen_at  -> server timestamp
// The admin panel reads these fields for the country graph and the Device / Country columns.

import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from './firebase';

export function detectDevice() {
  if (typeof navigator === 'undefined') return 'pc';
  const ua = navigator.userAgent || '';
  const touchMac = /Macintosh/i.test(ua) && (navigator.maxTouchPoints || 0) > 1; // iPad on desktop-mode Safari
  return /Android|iPhone|iPad|iPod|Mobile|Windows Phone/i.test(ua) || touchMac ? 'mobile' : 'pc';
}

export async function trackVisit(uid) {
  try {
    if (!uid || !db || typeof window === 'undefined') return;
    const key = `promptai_tracked_${uid}`;
    if (window.sessionStorage.getItem(key)) return;
    window.sessionStorage.setItem(key, '1');

    const data = { last_device: detectDevice(), last_seen_at: serverTimestamp() };
    try {
      const r = await fetch('/api/geo');
      if (r.ok) {
        const j = await r.json();
        if (j && j.country && j.country !== 'XX') data.last_country = j.country;
      }
    } catch {}
    await updateDoc(doc(db, 'users', uid), data);
  } catch (err) {
    console.warn('[track] failed', err && err.message);
  }
}
