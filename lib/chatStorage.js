// lib/chatStorage.js
// Replaces the MySQL `conversations` table with browser localStorage.
// Every chat lives only in the visitor's own browser - no backend, no login.

const KEY = 'promptai_conversations';

function readAll() {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function writeAll(list) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(KEY, JSON.stringify(list));
}

export function listConversations() {
  return readAll().sort((a, b) => b.updatedAt - a.updatedAt);
}

export function getConversation(id) {
  return readAll().find((c) => c.id === id) || null;
}

export function upsertConversation({ id, title, request, response }) {
  const list = readAll();
  const now = Date.now();
  const idx = list.findIndex((c) => c.id === id);

  if (idx === -1) {
    const newConv = { id: id || now, title, request, response, updatedAt: now };
    list.push(newConv);
    writeAll(list);
    return newConv;
  }

  list[idx] = { ...list[idx], title, request, response, updatedAt: now };
  writeAll(list);
  return list[idx];
}
