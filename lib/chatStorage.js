// lib/chatStorage.js
//
// Replaces the old MySQL `conversations` table:
//  - Logged in (pass a Firebase uid)  -> stored in Firestore under
//    users/{uid}/conversations/{id}, so history follows the account
//    across devices, same as your original MySQL version did.
//  - Not logged in (uid is null/undefined) -> falls back to the visitor's
//    own browser localStorage, same as the guest-mode Next.js version did.
//
// IMPORTANT - signature change from the old guest-only version:
// every function now takes `uid` as the first argument, and every function
// is now async (returns a Promise) because Firestore reads/writes are
// async. If your /pages/chat.js still calls these the old synchronous
// way (e.g. `const list = listConversations()`), update those call sites
// to `const list = await listConversations(user?.uid ?? null)` - send me
// that file and I'll wire it up for you directly.

import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  deleteDoc,
  query,
  orderBy,
} from 'firebase/firestore';
import { db } from './firebase';

const LOCAL_KEY = 'promptai_conversations';

function readLocal() {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(LOCAL_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function writeLocal(list) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(LOCAL_KEY, JSON.stringify(list));
}

function convosCol(uid) {
  return collection(db, 'users', uid, 'conversations');
}

export async function listConversations(uid) {
  if (uid) {
    const snap = await getDocs(query(convosCol(uid), orderBy('updatedAt', 'desc')));
    return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  }
  return readLocal().sort((a, b) => b.updatedAt - a.updatedAt);
}

export async function getConversation(uid, id) {
  if (!id) return null;
  if (uid) {
    const snap = await getDoc(doc(db, 'users', uid, 'conversations', String(id)));
    return snap.exists() ? { id: snap.id, ...snap.data() } : null;
  }
  return readLocal().find((c) => String(c.id) === String(id)) || null;
}

export async function upsertConversation(uid, { id, title, request, response }) {
  const now = Date.now();

  if (uid) {
    const convId = id ? String(id) : doc(convosCol(uid)).id;
    const data = { title, request, response, updatedAt: now };
    await setDoc(doc(db, 'users', uid, 'conversations', convId), data, { merge: true });
    return { id: convId, ...data };
  }

  // Guest fallback - same behaviour as the original localStorage-only version.
  const list = readLocal();
  const idx = list.findIndex((c) => String(c.id) === String(id));
  if (idx === -1) {
    const newConv = { id: id || now, title, request, response, updatedAt: now };
    list.push(newConv);
    writeLocal(list);
    return newConv;
  }
  list[idx] = { ...list[idx], title, request, response, updatedAt: now };
  writeLocal(list);
  return list[idx];
}

export async function deleteConversation(uid, id) {
  if (uid) {
    await deleteDoc(doc(db, 'users', uid, 'conversations', String(id)));
    return;
  }
  const list = readLocal().filter((c) => String(c.id) !== String(id));
  writeLocal(list);
}
