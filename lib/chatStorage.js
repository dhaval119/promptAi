// lib/chatStorage.js
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
  try {
    window.localStorage.setItem(LOCAL_KEY, JSON.stringify(list));
  } catch {}
}

function convosCol(uid) {
  if (!db) return null;
  return collection(db, 'users', uid, 'conversations');
}

export async function listConversations(uid) {
  if (uid && db) {
    try {
      const snap = await getDocs(query(convosCol(uid), orderBy('updatedAt', 'desc')));
      return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    } catch (err) {
      console.warn('[chatStorage] listConversations Firestore failed, falling back to local', err);
      return readLocal().sort((a, b) => b.updatedAt - a.updatedAt);
    }
  }
  return readLocal().sort((a, b) => b.updatedAt - a.updatedAt);
}

export async function getConversation(uid, id) {
  if (!id) return null;
  if (uid && db) {
    try {
      const snap = await getDoc(doc(db, 'users', uid, 'conversations', String(id)));
      return snap.exists() ? { id: snap.id, ...snap.data() } : null;
    } catch (err) {
      console.warn('[chatStorage] getConversation Firestore failed', err);
      return readLocal().find((c) => String(c.id) === String(id)) || null;
    }
  }
  return readLocal().find((c) => String(c.id) === String(id)) || null;
}

export async function upsertConversation(uid, { id, title, request, response }) {
  const now = Date.now();

  if (uid && db) {
    try {
      const col = convosCol(uid);
      const convId = id ? String(id) : doc(col).id;
      const data = { title, request, response, updatedAt: now };
      await setDoc(doc(db, 'users', uid, 'conversations', convId), data, { merge: true });
      return { id: convId, ...data };
    } catch (err) {
      console.warn('[chatStorage] upsertConversation Firestore failed, using local', err);
    }
  }

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
  if (uid && db) {
    try {
      await deleteDoc(doc(db, 'users', uid, 'conversations', String(id)));
      return;
    } catch (err) {
      console.warn('[chatStorage] deleteConversation Firestore failed', err);
    }
  }
  const list = readLocal().filter((c) => String(c.id) !== String(id));
  writeLocal(list);
}