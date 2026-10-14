// lib/firestoreRest.js  (server side only)
// Tiny helpers to read a Firestore document through the REST API using the CALLER'S Firebase ID token.
// Your Firestore security rules still apply, so this needs no admin credentials.

export const fv = (doc, key) => {
  const f = doc?.fields?.[key];
  if (!f) return undefined;
  if ('stringValue' in f) return f.stringValue;
  if ('booleanValue' in f) return f.booleanValue;
  if ('integerValue' in f) return Number(f.integerValue);
  return undefined;
};

export async function readUserDoc(projectId, uid, idToken) {
  const url = `https://firestore.googleapis.com/v1/projects/${encodeURIComponent(projectId)}/databases/(default)/documents/users/${encodeURIComponent(uid)}`;
  const r = await fetch(url, { headers: { Authorization: `Bearer ${idToken}` } });
  if (!r.ok) return null;
  return r.json();
}

/** Real display names from the user's own Firestore document (falls back to Firebase Auth / email). */
export function namesFromDoc(doc, authUser) {
  const first = String(fv(doc, 'first_name') || fv(doc, 'firstName') || '').trim();
  const last = String(fv(doc, 'last_name') || fv(doc, 'lastName') || '').trim();
  const display = String(authUser?.displayName || '').trim();
  const emailLocal = String(authUser?.email || fv(doc, 'email') || '').split('@')[0] || 'friend';
  const firstName = first || display.split(/\s+/)[0] || emailLocal;
  const fullName = [first, last].filter(Boolean).join(' ') || display || firstName;
  return { firstName, fullName };
}
