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
      return snap.docs.map((d) => {
        const data = d.data();
        return {
          id: d.id,
          title: data.title || '',
          request: data.request || '',
          response: data.response || '',
          createdAt: data.createdAt ?? null,
          updatedAt: data.updatedAt ?? 0,
        };
      });
    } catch (err) {
      console.warn('[chatStorage] list orderBy failed, trying plain getDocs', err);
      try {
        const snap = await getDocs(convosCol(uid));
        return snap.docs
          .map((d) => {
            const data = d.data();
            return {
              id: d.id,
              title: data.title || '',
              request: data.request || '',
              response: data.response || '',
              createdAt: data.createdAt ?? null,
              updatedAt: data.updatedAt ?? 0,
            };
          })
          .sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
      } catch (err2) {
        console.warn('[chatStorage] list Firestore failed, local fallback', err2);
        return readLocal().sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
      }
    }
  }
  return readLocal().sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
}

export async function getConversation(uid, id) {
  if (!id) return null;
  if (uid && db) {
    try {
      const snap = await getDoc(doc(db, 'users', uid, 'conversations', String(id)));
      if (!snap.exists()) return null;
      const data = snap.data();
      return {
        id: snap.id,
        title: data.title || '',
        request: data.request || '',
        response: data.response || '',
        createdAt: data.createdAt ?? null,
        updatedAt: data.updatedAt ?? 0,
      };
    } catch (err) {
      console.warn('[chatStorage] getConversation failed', err);
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
      const ref = doc(db, 'users', uid, 'conversations', convId);

      let createdAt = now;
      if (id) {
        try {
          const existing = await getDoc(ref);
          if (existing.exists()) {
            createdAt = existing.data().createdAt ?? now;
          }
        } catch {}
      }

      const data = {
        title: title || '',
        request: request || '',
        response: response || '',
        createdAt,
        updatedAt: now,
      };

      await setDoc(ref, data, { merge: true });
      console.log('[chatStorage] saved to Firestore', convId);

      return {
        id: convId,
        title: data.title,
        request: data.request,
        response: data.response,
        createdAt,
        updatedAt: now,
      };
    } catch (err) {
      console.error('[chatStorage] upsert Firestore FAILED', err.code, err.message);
    }
  } else {
    console.warn('[chatStorage] no uid or db — using localStorage. uid=', uid, 'db=', !!db);
  }

  const list = readLocal();
  const idx = list.findIndex((c) => String(c.id) === String(id));
  if (idx === -1) {
    const newConv = {
      id: id || String(now),
      title: title || '',
      request: request || '',
      response: response || '',
      createdAt: now,
      updatedAt: now,
    };
    list.push(newConv);
    writeLocal(list);
    return newConv;
  }
  list[idx] = {
    ...list[idx],
    title: title || list[idx].title,
    request: request || list[idx].request,
    response: response || list[idx].response,
    updatedAt: now,
  };
  writeLocal(list);
  return list[idx];
}

export async function deleteConversation(uid, id) {
  if (uid && db) {
    try {
      await deleteDoc(doc(db, 'users', uid, 'conversations', String(id)));
      return;
    } catch (err) {
      console.warn('[chatStorage] delete failed', err);
    }
  }
  writeLocal(readLocal().filter((c) => String(c.id) !== String(id)));
}