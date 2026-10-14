// pages/api/premium-email.js
// Sends the "Dev jaag gaya" email when an ADMIN grants Premium to a user.
//
// Security (no firebase-admin needed):
//  1. the caller's Firebase ID token is verified (Identity Toolkit REST)
//  2. the caller's own Firestore profile is read WITH their token -> must be an admin
//  3. the target user's document is read -> must really have is_premium === true
//  4. the recipient email comes from that document, never from the request body

import { renderPremiumEmail } from '../../lib/premiumEmailTemplate';
import { sendEmail, emailConfigured } from '../../lib/sendEmail';
import { fv, readUserDoc, namesFromDoc } from '../../lib/firestoreRest';

const DEFAULT_SITE_URL = 'https://prompt-ai-teal.vercel.app';
const BOOTSTRAP_ADMIN = (process.env.ADMIN_BOOTSTRAP_EMAIL || 'sonidhaval2468@gmail.com').toLowerCase();

const ipHits = new Map();
const sentUids = new Map();
const WINDOW_MS = 10 * 60 * 1000;
const IP_MAX = 30;

function getClientIp(req) {
  const fwd = req.headers['x-forwarded-for'];
  if (typeof fwd === 'string' && fwd.length > 0) return fwd.split(',')[0].trim();
  return req.socket?.remoteAddress || 'unknown';
}
function ipLimited(ip) {
  const now = Date.now();
  const e = ipHits.get(ip);
  if (!e || now - e.start > WINDOW_MS) { ipHits.set(ip, { start: now, count: 1 }); return false; }
  e.count += 1;
  return e.count > IP_MAX;
}

export default async function handler(req, res) {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Cache-Control', 'no-store');

  if (req.method !== 'POST') { res.setHeader('Allow', 'POST'); return res.status(405).json({ error: 'method_not_allowed' }); }
  if (!(req.headers['content-type'] || '').toLowerCase().includes('application/json')) return res.status(415).json({ error: 'unsupported_media_type' });
  if (ipLimited(getClientIp(req))) return res.status(429).json({ error: 'rate_limited' });

  const { idToken, uid } = req.body || {};
  if (typeof idToken !== 'string' || idToken.length < 20 || idToken.length > 4096) return res.status(400).json({ error: 'invalid_token' });
  if (typeof uid !== 'string' || !/^[A-Za-z0-9_-]{6,128}$/.test(uid)) return res.status(400).json({ error: 'invalid_uid' });

  const fbKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
  const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
  if (!fbKey || !projectId || !emailConfigured()) return res.status(503).json({ error: 'email_not_configured' });

  try {
    // 1) who is calling?
    const lookup = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${encodeURIComponent(fbKey)}`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ idToken }),
    });
    if (!lookup.ok) return res.status(401).json({ error: 'invalid_token' });
    const caller = (await lookup.json())?.users?.[0];
    if (!caller?.localId) return res.status(401).json({ error: 'invalid_token' });

    // 2) are they an admin? (same rule as lib/AuthContext.js)
    const callerDoc = await readUserDoc(projectId, caller.localId, idToken);
    const role = fv(callerDoc, 'role');
    const callerEmail = String(fv(callerDoc, 'email') || caller.email || '').trim().toLowerCase();
    const isAdmin = role === 'admin' || (callerEmail === BOOTSTRAP_ADMIN && role !== 'user');
    if (!isAdmin) return res.status(403).json({ error: 'forbidden' });

    // 3) target must really be premium now
    const target = await readUserDoc(projectId, uid, idToken);
    if (!target) return res.status(404).json({ error: 'user_not_found' });
    const premium = fv(target, 'is_premium') === true || fv(target, 'isPremium') === true;
    if (!premium) return res.status(409).json({ error: 'not_premium' });
    const email = fv(target, 'email');
    if (!email) return res.status(400).json({ error: 'no_email' });

    // 4) once per grant (best-effort)
    const last = sentUids.get(uid);
    if (last && Date.now() - last < WINDOW_MS) return res.status(409).json({ error: 'already_sent' });

    const { firstName, fullName } = namesFromDoc(target, { email });
    const { subject, html, text } = renderPremiumEmail({ firstName, fullName, siteUrl: process.env.NEXT_PUBLIC_SITE_URL || DEFAULT_SITE_URL });
    const ok = await sendEmail({ to: email, toName: fullName, subject, html, text });
    if (!ok) return res.status(502).json({ error: 'send_failed' });

    sentUids.set(uid, Date.now());
    return res.status(200).json({ ok: true });
  } catch (err) {
    return res.status(500).json({ error: 'server_error' });
  }
}
