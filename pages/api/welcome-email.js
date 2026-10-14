// pages/api/welcome-email.js
// Sends the PromptAI welcome email to a brand-new user (manual signup OR first-time Google signup).
//
// No firebase-admin needed:
//  - the Firebase ID token is verified through Google's Identity Toolkit REST API
//  - the user's real name is read from THEIR OWN users/{uid} Firestore document
//  - the email goes out through Brevo or Resend (see lib/sendEmail.js)
//
// Env: NEXT_PUBLIC_FIREBASE_API_KEY, NEXT_PUBLIC_FIREBASE_PROJECT_ID, EMAIL_FROM, BREVO_API_KEY or RESEND_API_KEY
// Optional: NEXT_PUBLIC_SITE_URL

import { renderWelcomeEmail } from '../../lib/welcomeEmailTemplate';
import { sendEmail, emailConfigured } from '../../lib/sendEmail';
import { readUserDoc, namesFromDoc } from '../../lib/firestoreRest';

const DEFAULT_SITE_URL = 'https://prompt-ai-teal.vercel.app';
const NEW_ACCOUNT_WINDOW_MS = 15 * 60 * 1000; // only accounts created in the last 15 min get a welcome mail

const ipHits = new Map();
const sentUids = new Map();
const IP_WINDOW_MS = 10 * 60 * 1000;
const IP_MAX = 6;

function getClientIp(req) {
  const fwd = req.headers['x-forwarded-for'];
  if (typeof fwd === 'string' && fwd.length > 0) return fwd.split(',')[0].trim();
  return req.socket?.remoteAddress || 'unknown';
}

function ipLimited(ip) {
  const now = Date.now();
  if (ipHits.size > 5000) {
    for (const [k, v] of ipHits) if (now - v.start > IP_WINDOW_MS * 2) ipHits.delete(k);
  }
  const e = ipHits.get(ip);
  if (!e || now - e.start > IP_WINDOW_MS) {
    ipHits.set(ip, { start: now, count: 1 });
    return false;
  }
  e.count += 1;
  return e.count > IP_MAX;
}

export default async function handler(req, res) {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('Referrer-Policy', 'no-referrer');

  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'method_not_allowed' });
  }
  if (!(req.headers['content-type'] || '').toLowerCase().includes('application/json')) {
    return res.status(415).json({ error: 'unsupported_media_type' });
  }
  if (ipLimited(getClientIp(req))) return res.status(429).json({ error: 'rate_limited' });

  const idToken = req.body?.idToken;
  if (typeof idToken !== 'string' || idToken.length < 20 || idToken.length > 4096) {
    return res.status(400).json({ error: 'invalid_token' });
  }

  const fbKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
  const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
  if (!fbKey || !emailConfigured()) return res.status(503).json({ error: 'email_not_configured' });

  try {
    // 1) Verify the token + read the REAL email from Firebase (never trust the browser)
    const lookup = await fetch(
      `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${encodeURIComponent(fbKey)}`,
      { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ idToken }) }
    );
    if (!lookup.ok) return res.status(401).json({ error: 'invalid_token' });
    const user = (await lookup.json())?.users?.[0];
    if (!user || !user.email) return res.status(400).json({ error: 'no_email' });

    // 2) Only brand-new accounts, and only once
    const createdAt = Number(user.createdAt);
    if (!createdAt || Date.now() - createdAt > NEW_ACCOUNT_WINDOW_MS) {
      return res.status(409).json({ error: 'account_not_new' });
    }
    if (sentUids.has(user.localId)) return res.status(409).json({ error: 'already_sent' });

    // 3) The name that is saved on the user's account (users/{uid}.first_name / last_name)
    const doc = projectId ? await readUserDoc(projectId, user.localId, idToken) : null;
    const { firstName, fullName } = namesFromDoc(doc, user);

    // 4) Build + send
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || DEFAULT_SITE_URL;
    const { subject, html, text } = renderWelcomeEmail({ firstName, fullName, siteUrl });
    const ok = await sendEmail({ to: user.email, toName: fullName, subject, html, text });
    if (!ok) return res.status(502).json({ error: 'send_failed' });

    sentUids.set(user.localId, Date.now());
    return res.status(200).json({ ok: true });
  } catch (err) {
    return res.status(500).json({ error: 'server_error' });
  }
}
