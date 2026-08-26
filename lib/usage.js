// lib/usage.js
// Daily free-prompt usage tracking (localStorage + Firestore).
// Used by pages/chat.js:
//   import { DAILY_FREE_LIMIT, getTodayUsage, incrementTodayUsage, isOverLimit } from '../lib/usage';

import { doc, getDoc, updateDoc, increment, serverTimestamp } from 'firebase/firestore';
import { db } from './firebase';

export const DAILY_FREE_LIMIT = 3;

function getTodayKey() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function localKey(uid) {
  return `chat_daily_usage_${uid || 'guest'}_${getTodayKey()}`;
}

function readLocal(uid) {
  if (typeof window === 'undefined') return 0;
  try {
    const n = parseInt(window.localStorage.getItem(localKey(uid)), 10);
    return Number.isFinite(n) && n >= 0 ? n : 0;
  } catch {
    return 0;
  }
}

function writeLocal(uid, count) {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(localKey(uid), String(count));
  } catch {}
}

function dateKeyFromTimestamp(ts) {
  if (!ts) return null;
  try {
    const d =
      typeof ts?.toDate === 'function'
        ? ts.toDate()
        : typeof ts === 'number'
          ? new Date(ts)
          : new Date(ts);
    if (Number.isNaN(d.getTime())) return null;
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  } catch {
    return null;
  }
}

/**
 * Get today's usage count for a user.
 * Prefer Firestore users/{uid}.usage_count (reset if day changed).
 * Fallback to localStorage.
 */
export async function getTodayUsage(uid) {
  if (!uid || !db) {
    return readLocal(uid);
  }
  try {
    const ref = doc(db, 'users', uid);
    const snap = await getDoc(ref);
    if (!snap.exists()) {
      return readLocal(uid);
    }
    const data = snap.data();
    const today = getTodayKey();
    const lastKey = dateKeyFromTimestamp(data.last_reset);

    if (lastKey !== today) {
      // New day → reset
      try {
        await updateDoc(ref, {
          usage_count: 0,
          last_reset: serverTimestamp(),
        });
      } catch (e) {
        console.warn('[usage] reset failed', e);
      }
      writeLocal(uid, 0);
      return 0;
    }

    const count =
      typeof data.usage_count === 'number' && data.usage_count >= 0
        ? data.usage_count
        : 0;
    writeLocal(uid, count);
    return count;
  } catch (err) {
    console.warn('[usage] getTodayUsage firestore failed', err);
    return readLocal(uid);
  }
}

/**
 * Increment today's usage by 1. Returns the new count.
 */
export async function incrementTodayUsage(uid) {
  const current = await getTodayUsage(uid);
  const next = current + 1;

  if (uid && db) {
    try {
      await updateDoc(doc(db, 'users', uid), {
        usage_count: increment(1),
      });
    } catch (err) {
      console.warn('[usage] increment firestore failed', err);
    }
  }

  writeLocal(uid, next);
  return next;
}

/**
 * True when free user has exhausted daily limit.
 */
export function isOverLimit(count) {
  const n = typeof count === 'number' ? count : 0;
  return n >= DAILY_FREE_LIMIT;
}
