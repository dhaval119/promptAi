// pages/api/welcome-email.js
// Sends the PromptAI welcome email to a brand-new user (manual signup OR first-time Google signup).
//
// No firebase-admin needed:
//  - the Firebase ID token is verified through Google's Identity Toolkit REST API
//  - the user's real name is read from THEIR OWN users/{uid} Firestore document (best effort)
//  - the email goes out through Resend (see lib/sendEmail.js)
//
// Env: NEXT_PUBLIC_FIREBASE_API_KEY, NEXT_PUBLIC_FIREBASE_PROJECT_ID, EMAIL_FROM, RESEND_API_KEY
// Optional: NEXT_PUBLIC_SITE_URL

import { renderWelcomeEmail } from '../../lib/welcomeEmailTemplate';
import { sendEmailDetailed, emailConfigured } from '../../lib/sendEmail';
import { fv, readUserDoc, namesFromDoc } from '../../lib/firestoreRest';

const DEFAULT_SITE_URL = 'https://prompt-ai-teal.vercel.app';
const ipHits = new Map();
const sentUids = new Map();
const IP_WINDOW_MS = 10 * 60 * 1000;
const IP_MAX = 8;

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
  if (!fbKey || !emailConfigured()) {
    return res.status(503).json({ error: 'email_not_configured' });
  }

  try {
    // 1) Verify the token + read the REAL email from Firebase (never trust the browser)
    const lookup = await fetch(
      `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${encodeURIComponent(fbKey)}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idToken }),
      }
    );
    if (!lookup.ok) return res.status(401).json({ error: 'invalid_token' });
    const user = (await lookup.json())?.users?.[0];
    if (!user || !user.email) return res.status(400).json({ error: 'no_email' });

    // 2) Retry-safe: skip if already sent (client marker + short in-memory guard)
    let profile = null;
    if (projectId) {
      try {
        profile = await readUserDoc(projectId, user.localId, idToken);
      } catch {
        profile = null;
      }
    }
    if (fv(profile, 'welcome_email_sent') === true || sentUids.has(user.localId)) {
      return res.status(409).json({ error: 'already_sent' });
    }

    // 3) Name: Firestore first_name/last_name → Auth displayName → email local-part
    const { firstName, fullName } = namesFromDoc(profile, user);

    // 4) Build + send (template unchanged)
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || DEFAULT_SITE_URL;
    const { subject, html, text } = renderWelcomeEmail({ firstName, fullName, siteUrl });
    const result = await sendEmailDetailed({ to: user.email, subject, html, text });
    if (!result.ok) {
      console.error('[welcome-email] Delivery failed.', {
        status: result.status,
        code: result.code,
        message: result.message,
        to: user.email,
      });
      if (result.code === 'missing_configuration') {
        return res.status(503).json({ error: 'email_not_configured' });
      }
      return res.status(502).json({
        error: 'send_failed',
        reason: result.code || 'provider_error',
        detail: result.message || null,
      });
    }

    sentUids.set(user.localId, Date.now());
    if (sentUids.size > 3000) {
      const cutoff = Date.now() - 30 * 60 * 1000;
      for (const [k, t] of sentUids) if (t < cutoff) sentUids.delete(k);
    }

    return res.status(200).json({ ok: true, emailId: result.id || undefined });
  } catch (err) {
    console.error('[welcome-email] Handler failed.', { errorName: err?.name || 'Error' });
    return res.status(500).json({ error: 'server_error' });
  }
}
