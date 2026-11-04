// lib/geoDevice.js  (client side)
// Saves device + location on the user's own document once per browser session.
//   users/{uid}.last_country  -> "IN", "US", ...
//   users/{uid}.last_city     -> "Mumbai", ...
//   users/{uid}.last_region   -> "MH", ...
//   users/{uid}.last_device   -> "mobile" | "pc"
//   users/{uid}.last_seen_at  -> server timestamp

import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from './firebase';
import { logActivity } from './activityLog';

export function detectDevice() {
  if (typeof navigator === 'undefined') return 'pc';
  const ua = navigator.userAgent || '';
  const touchMac = /Macintosh/i.test(ua) && (navigator.maxTouchPoints || 0) > 1;
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
        if (j && j.city) data.last_city = String(j.city).slice(0, 80);
        if (j && j.region) data.last_region = String(j.region).slice(0, 40);
      }
    } catch {}
    // Right after a brand-new signup the users/{uid} doc may not exist yet (signup page creates it a moment
    // later). updateDoc would fail with not-found and the location/device would be lost for the whole session.
    let saved = false;
    for (let i = 0; i < 5 && !saved; i++) {
      try {
        await updateDoc(doc(db, 'users', uid), data);
        saved = true;
      } catch (e) {
        if (e && e.code === 'not-found') await new Promise((r) => setTimeout(r, 1500));
        else break;
      }
    }
    if (!saved) window.sessionStorage.removeItem(key); // try again on the next page load
    logActivity(uid, 'login', {
      city: data.last_city,
      region: data.last_region,
      country: data.last_country,
      device: data.last_device,
    });
  } catch (err) {
    console.warn('[track] failed', err && err.message);
  }
}
