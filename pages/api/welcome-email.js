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
import { escapeHtml } from '../../lib/welcomeEmailTemplate';

const DEFAULT_SITE_URL = 'https://prompt-ai-teal.vercel.app';
// New-user alert goes here (override with ADMIN_NOTIFY_EMAIL in Vercel env).
const ADMIN_NOTIFY_EMAIL = (process.env.ADMIN_NOTIFY_EMAIL || 'sonidhaval2468@gmail.com').trim();
const ipHits = new Map();
const sentUids = new Map();
const IP_WINDOW_MS = 10 * 60 * 1000;
const IP_MAX = 8;

function getClientIp(req) {
  const fwd = req.headers['x-forwarded-for'];
  if (typeof fwd === 'string' && fwd.length > 0) return fwd.split(',')[0].trim();
  return req.socket?.remoteAddress || 'unknown';
}

// uid straight from the ID token payload (only used to start the Firestore read in parallel;
// the real, verified uid still comes from Google's lookup and must match).
function uidFromToken(idToken) {
  try {
    const part = idToken.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
    const json = JSON.parse(Buffer.from(part, 'base64').toString('utf8'));
    return json.user_id || json.sub || null;
  } catch {
    return null;
  }
}

function headerText(req, name) {
  const raw = req.headers[name];
  if (!raw) return '';
  const v = Array.isArray(raw) ? raw[0] : raw;
  try {
    return decodeURIComponent(String(v)).trim();
  } catch {
    return String(v).trim();
  }
}

function describeLocation(req) {
  const city = headerText(req, 'x-vercel-ip-city');
  const region = headerText(req, 'x-vercel-ip-country-region');
  const country = headerText(req, 'x-vercel-ip-country');
  const parts = [city, region, country].filter(Boolean);
  return parts.length ? parts.join(', ') : 'Unknown';
}

function describeDevice(req) {
  const ua = String(req.headers['user-agent'] || '');
  const kind = /Android|iPhone|iPad|iPod|Mobile/i.test(ua) ? 'Mobile' : 'PC';
  const os = /Windows/i.test(ua)
    ? 'Windows'
    : /Android/i.test(ua)
      ? 'Android'
      : /iPhone|iPad|iPod/i.test(ua)
        ? 'iOS'
        : /Mac OS X|Macintosh/i.test(ua)
          ? 'macOS'
          : /Linux/i.test(ua)
            ? 'Linux'
            : 'Unknown OS';
  const browser = /Edg\//i.test(ua)
    ? 'Edge'
    : /OPR\/|Opera/i.test(ua)
      ? 'Opera'
      : /Chrome\//i.test(ua)
        ? 'Chrome'
        : /Firefox\//i.test(ua)
          ? 'Firefox'
          : /Safari\//i.test(ua)
            ? 'Safari'
            : 'Browser';
  return `${kind} · ${os} · ${browser}`;
}

function buildAdminAlert({ fullName, email, method, location, device, ip }) {
  const when = new Date().toLocaleString('en-IN', {
    timeZone: 'Asia/Kolkata',
    dateStyle: 'medium',
    timeStyle: 'short',
  });
  const row = (k, v) =>
    `<tr><td style="padding:8px 14px;border-bottom:1px solid #e5e5e5;font:bold 12px 'Courier New',monospace;letter-spacing:1px;color:#777;text-transform:uppercase;width:120px;">${k}</td><td style="padding:8px 14px;border-bottom:1px solid #e5e5e5;font:15px Arial,sans-serif;color:#111;">${escapeHtml(v)}</td></tr>`;
  const subject = `New PromptAI user: ${fullName} (${location})`;
  const html = `<!doctype html><html><body style="margin:0;padding:24px;background:#f4f4f4;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:520px;margin:0 auto;background:#ffffff;border:3px solid #111;">
<tr><td style="background:#7c3aed;padding:12px 14px;font:bold 12px 'Courier New',monospace;letter-spacing:1.5px;color:#ffffff;">NEW SIGNUP &middot; ANOTHER ONE FELL FOR IT</td></tr>
<tr><td style="padding:16px 14px 6px 14px;font:900 22px 'Arial Black',Arial,sans-serif;color:#111;">${escapeHtml(fullName)} just joined PromptAI.</td></tr>
<tr><td><table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
${row('Name', fullName)}${row('Email', email)}${row('Location', location)}${row('Signed up via', method)}${row('Device', device)}${row('IP', ip)}${row('Time (IST)', when)}
</table></td></tr>
<tr><td style="padding:14px;font:italic 13px Georgia,serif;color:#777;">Welcome email already sent. You owe them nothing. (Except a working product.)</td></tr>
</table></body></html>`;
  const text = [
    `New PromptAI user: ${fullName}`,
    `Email: ${email}`,
    `Location: ${location}`,
    `Signed up via: ${method}`,
    `Device: ${device}`,
    `IP: ${ip}`,
    `Time (IST): ${when}`,
  ].join('\n');
  return { subject, html, text };
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
    // 1) Verify the token (Google) and read the user doc IN PARALLEL (was sequential = slower)
    const guessedUid = uidFromToken(idToken);
    const [lookup, profileGuess] = await Promise.all([
      fetch(
        `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${encodeURIComponent(fbKey)}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ idToken }),
        }
      ),
      projectId && guessedUid
        ? readUserDoc(projectId, guessedUid, idToken).catch(() => null)
        : Promise.resolve(null),
    ]);
    if (!lookup.ok) return res.status(401).json({ error: 'invalid_token' });
    const user = (await lookup.json())?.users?.[0];
    if (!user || !user.email) return res.status(400).json({ error: 'no_email' });

    // 2) Retry-safe: skip if already sent (client marker + short in-memory guard)
    let profile = guessedUid && guessedUid === user.localId ? profileGuess : null;
    if (!profile && projectId) {
      try {
        profile = await readUserDoc(projectId, user.localId, idToken);
      } catch {
        profile = null;
      }
    }
    if (fv(profile, 'welcome_email_sent') === true || sentUids.has(user.localId)) {
      return res.status(409).json({ error: 'already_sent' });
    }
    // Block double-sends from two quick requests (signup + auth listener) right away.
    sentUids.set(user.localId, Date.now());

    // 3) Name: Firestore first_name/last_name → Auth displayName → email local-part
    const { firstName, fullName } = namesFromDoc(profile, user);

    // 4) Build + send (template unchanged)
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || DEFAULT_SITE_URL;
    const { subject, html, text } = renderWelcomeEmail({ firstName, fullName, siteUrl });
    // Welcome email + admin alert go out at the same time (alert never blocks / breaks the welcome).
    const method =
      fv(profile, 'signup_method') === 'manual' || fv(profile, 'signupMethod') === 'manual'
        ? 'Email + password'
        : (user.providerUserInfo || []).some((p) => p.providerId === 'google.com')
          ? 'Google'
          : 'Email + password';
    const alertMail = ADMIN_NOTIFY_EMAIL
      ? buildAdminAlert({
          fullName,
          email: user.email,
          method,
          location: describeLocation(req),
          device: describeDevice(req),
          ip: getClientIp(req),
        })
      : null;
    const [result] = await Promise.all([
      sendEmailDetailed({ to: user.email, subject, html, text }),
      alertMail
        ? sendEmailDetailed({ to: ADMIN_NOTIFY_EMAIL, ...alertMail }).catch((e) => {
            console.error('[welcome-email] Admin alert failed.', { errorName: e?.name || 'Error' });
          })
        : Promise.resolve(null),
    ]);
    if (!result.ok) {
      sentUids.delete(user.localId); // allow a retry later
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
