// lib/chatStorage.js
// Conversations are stored under a stable key derived from the user's email
// so that Google login and Email/Password login for the SAME email share the same chat history.
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

/** Normalize email for use as document path (Firestore paths cannot contain @ or .) */
function emailKey(email) {
  if (!email || typeof email !== 'string') return null;
  return email.trim().toLowerCase().replace(/[^a-z0-9]/g, '_');
}

function convosColByEmail(email) {
  if (!db || !email) return null;
  const key = emailKey(email);
  if (!key) return null;
  return collection(db, 'conversations_by_email', key, 'items');
}

function convosColByUid(uid) {
  if (!db || !uid) return null;
  return collection(db, 'users', uid, 'conversations');
}

/**
 * List conversations for a user.
 * Prefer email-based collection so Google + manual same-email share history.
 * Fallback to uid-based then localStorage.
 */
export async function listConversations(uid, email) {
  // 1. Email-based (shared across providers)
  if (email && db) {
    try {
      const col = convosColByEmail(email);
      if (col) {
        const snap = await getDocs(query(col, orderBy('updatedAt', 'desc')));
        if (!snap.empty) {
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
        }
      }
    } catch (err) {
      console.warn('[chatStorage] email list orderBy failed', err);
      try {
        const col = convosColByEmail(email);
        if (col) {
          const snap = await getDocs(col);
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
        }
      } catch (e2) {
        console.warn('[chatStorage] email list plain failed', e2);
      }
    }
  }

  // 2. UID-based (legacy)
  if (uid && db) {
    try {
      const snap = await getDocs(query(convosColByUid(uid), orderBy('updatedAt', 'desc')));
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
      console.warn('[chatStorage] uid list orderBy failed, trying plain', err);
      try {
        const snap = await getDocs(convosColByUid(uid));
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
        console.warn('[chatStorage] uid list failed, local fallback', err2);
      }
    }
  }

  return readLocal().sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
}

export async function getConversation(uid, id, email) {
  if (!id) return null;

  if (email && db) {
    try {
      const key = emailKey(email);
      const snap = await getDoc(doc(db, 'conversations_by_email', key, 'items', String(id)));
      if (snap.exists()) {
        const data = snap.data();
        return shapeConversation(snap.id, data);
      }
    } catch (err) {
      console.warn('[chatStorage] get by email failed', err);
    }
  }

  if (uid && db) {
    try {
      const snap = await getDoc(doc(db, 'users', uid, 'conversations', String(id)));
      if (snap.exists()) {
        const data = snap.data();
        return shapeConversation(snap.id, data);
      }
    } catch (err) {
      console.warn('[chatStorage] get by uid failed', err);
    }
  }

  const local = readLocal().find((c) => String(c.id) === String(id));
  return local ? shapeConversation(local.id, local) : null;
}

function shapeConversation(id, data) {
  // Prefer request; fall back to title so user bubble never goes missing
  const request = (data.request || data.title || '').trim();
  const response = (data.response || '').trim();
  let messages = Array.isArray(data.messages) ? data.messages : [];
  const hasUser = messages.some((m) => m && m.sender === 'user' && (m.text || '').trim());
  const hasAi = messages.some((m) => m && m.sender === 'ai' && (m.text || '').trim());
  if (!hasUser && request) {
    messages = [{ sender: 'user', text: request }, ...messages];
  }
  if (!hasAi && response) {
    messages = [...messages, { sender: 'ai', text: response }];
  }
  if (messages.length === 0 && request) {
    messages = [
      { sender: 'user', text: request },
      ...(response ? [{ sender: 'ai', text: response }] : []),
    ];
  }
  return {
    id,
    title: data.title || '',
    request,
    response,
    messages,
    createdAt: data.createdAt ?? null,
    updatedAt: data.updatedAt ?? 0,
  };
}

export async function upsertConversation(uid, { id, title, request, response, messages }, email) {
  const now = Date.now();
  // Only write fields that are actually provided — never wipe request/response with ""
  const payload = { updatedAt: now };
  if (typeof title === 'string') payload.title = title;
  if (typeof request === 'string' && request.length > 0) payload.request = request;
  if (typeof response === 'string' && response.length > 0) payload.response = response;

  let msgs = Array.isArray(messages) ? messages : null;
  if (msgs) {
    const req = (typeof request === 'string' && request) || '';
    const res = (typeof response === 'string' && response) || '';
    if (!msgs.some((m) => m && m.sender === 'user') && req) {
      msgs = [{ sender: 'user', text: req }, ...msgs];
    }
    if (!msgs.some((m) => m && m.sender === 'ai' && (m.text || '').trim()) && res) {
      msgs = [...msgs, { sender: 'ai', text: res }];
    }
    if (msgs.length > 0) payload.messages = msgs;
  }

  // Prefer email-based storage for sharing
  if (email && db) {
    try {
      const key = emailKey(email);
      const col = collection(db, 'conversations_by_email', key, 'items');
      const convId = id ? String(id) : doc(col).id;
      const ref = doc(db, 'conversations_by_email', key, 'items', convId);

      let createdAt = now;
      if (id) {
        try {
          const existing = await getDoc(ref);
          if (existing.exists()) createdAt = existing.data().createdAt ?? now;
        } catch {}
      }

      const data = { ...payload, createdAt, ownerUid: uid || null, ownerEmail: email };
      await setDoc(ref, data, { merge: true });
      console.log('[chatStorage] saved to email collection', convId);

      // Also write a copy under uid for backward compatibility / admin
      if (uid) {
        try {
          await setDoc(doc(db, 'users', uid, 'conversations', convId), data, { merge: true });
        } catch {}
      }

      return shapeConversation(convId, data);
    } catch (err) {
      console.error('[chatStorage] email upsert FAILED', err.code, err.message);
    }
  }

  // Fallback UID
  if (uid && db) {
    try {
      const col = convosColByUid(uid);
      const convId = id ? String(id) : doc(col).id;
      const ref = doc(db, 'users', uid, 'conversations', convId);

      let createdAt = now;
      if (id) {
        try {
          const existing = await getDoc(ref);
          if (existing.exists()) createdAt = existing.data().createdAt ?? now;
        } catch {}
      }

      const data = { ...payload, createdAt };
      await setDoc(ref, data, { merge: true });
      return shapeConversation(convId, data);
    } catch (err) {
      console.error('[chatStorage] uid upsert FAILED', err.code, err.message);
    }
  }

  // Local fallback
  const list = readLocal();
  const idx = list.findIndex((c) => String(c.id) === String(id));
  if (idx === -1) {
    const newConv = {
      id: id || String(now),
      title: payload.title || '',
      request: payload.request || '',
      response: payload.response || '',
      messages: payload.messages || [],
      createdAt: now,
      updatedAt: now,
    };
    list.push(newConv);
    writeLocal(list);
    return shapeConversation(newConv.id, newConv);
  }
  list[idx] = {
    ...list[idx],
    ...payload,
    title: payload.title !== undefined ? payload.title : list[idx].title,
    request: payload.request || list[idx].request,
    response: payload.response || list[idx].response,
    messages: payload.messages || list[idx].messages,
    updatedAt: now,
  };
  writeLocal(list);
  return shapeConversation(list[idx].id, list[idx]);
}

export async function deleteConversation(uid, id, email) {
  if (email && db) {
    try {
      const key = emailKey(email);
      await deleteDoc(doc(db, 'conversations_by_email', key, 'items', String(id)));
    } catch (err) {
      console.warn('[chatStorage] email delete failed', err);
    }
  }
  if (uid && db) {
    try {
      await deleteDoc(doc(db, 'users', uid, 'conversations', String(id)));
    } catch (err) {
      console.warn('[chatStorage] uid delete failed', err);
    }
  }
  writeLocal(readLocal().filter((c) => String(c.id) !== String(id)));
}
