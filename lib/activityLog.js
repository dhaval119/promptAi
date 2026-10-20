// lib/activityLog.js
// Writes a small activity trail to users/{uid}/activity (shown in Admin → User Activity).
import { collection, addDoc } from 'firebase/firestore';
import { db } from './firebase';

const recent = new Map();

export async function logActivity(uid, type, detail = {}) {
  try {
    if (!uid || !db || !type) return;
    const key = `${uid}|${type}|${detail.chatId || detail.title || ''}`;
    const now = Date.now();
    if (recent.has(key) && now - recent.get(key) < 20000) return; // de-duplicate bursts
    recent.set(key, now);
    const clean = {};
    Object.entries(detail).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== '') clean[k] = String(v).slice(0, 200);
    });
    await addDoc(collection(db, 'users', uid, 'activity'), { type, ...clean, at: now });
  } catch {
    // activity logging must never break the app
  }
}
