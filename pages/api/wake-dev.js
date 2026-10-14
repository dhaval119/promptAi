// pages/api/wake-dev.js
// "Wake the Dev" -> user hit free daily limit -> Premium ON automatically + premium email.

import { getAdminAuth, getAdminDb, FieldValue } from '../../lib/firebaseAdmin';
import { sendEmailDetailed, emailConfigured } from '../../lib/sendEmail';
import { renderPremiumEmail } from '../../lib/premiumEmailTemplate';

const DAILY_FREE_LIMIT = 3;
const DEFAULT_SITE_URL = 'https://prompt-ai-teal.vercel.app';

const ipHits = new Map();
const WINDOW_MS = 10 * 60 * 1000;
const IP_MAX = 10;

function getClientIp(req) {
  const fwd = req.headers['x-forwarded-for'];
  if (typeof fwd === 'string' && fwd.length > 0) return fwd.split(',')[0].trim();
  return req.socket?.remoteAddress || 'unknown';
}
function ipLimited(ip) {
  const now = Date.now();
  const e = ipHits.get(ip);
  if (!e || now - e.start > WINDOW_MS) {
    ipHits.set(ip, { start: now, count: 1 });
    return false;
  }
  e.count += 1;
  return e.count > IP_MAX;
}

export default async function handler(req, res) {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Cache-Control', 'no-store');

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

  const adminAuth = getAdminAuth();
  const adminDb = getAdminDb();
  if (!adminAuth || !adminDb) {
    return res.status(503).json({ error: 'admin_not_configured' });
  }

  try {
    const decoded = await adminAuth.verifyIdToken(idToken);
    const ref = adminDb.collection('users').doc(decoded.uid);
    const snap = await ref.get();
    if (!snap.exists) return res.status(404).json({ error: 'user_not_found' });
    const u = snap.data() || {};

    if (u.is_premium === true || u.isPremium === true) {
      return res.status(200).json({ ok: true, already: true });
    }
    if (
      u.is_blocked === true ||
      u.isBlocked === true ||
      u.soft_deleted === true ||
      u.softDeleted === true
    ) {
      return res.status(403).json({ error: 'not_allowed' });
    }
    const used = typeof u.usage_count === 'number' ? u.usage_count : 0;
    if (used < DAILY_FREE_LIMIT) return res.status(409).json({ error: 'limit_not_reached' });

    await ref.update({
      is_premium: true,
      premium_granted_at: FieldValue.serverTimestamp(),
      premium_source: 'wake_dev',
    });

    let emailed = false;
    let emailId = null;
    try {
      const email = u.email || decoded.email;
      if (email && emailConfigured()) {
        const firstName =
          String(u.first_name || u.firstName || '').trim() || String(email).split('@')[0];
        const fullName =
          [u.first_name || u.firstName, u.last_name || u.lastName].filter(Boolean).join(' ').trim() ||
          firstName;
        const { subject, html, text } = renderPremiumEmail({
          firstName,
          fullName,
          siteUrl: process.env.NEXT_PUBLIC_SITE_URL || DEFAULT_SITE_URL,
        });
        const result = await sendEmailDetailed({ to: email, subject, html, text });
        emailed = result.ok;
        emailId = result.id || null;
        if (!result.ok) {
          console.error('[wake-dev] Premium email failed.', {
            status: result.status,
            code: result.code,
            message: result.message,
          });
        }
      }
    } catch (e) {
      emailed = false;
    }

    return res.status(200).json({ ok: true, emailed, emailId });
  } catch (err) {
    return res.status(401).json({ error: 'invalid_token' });
  }
}
