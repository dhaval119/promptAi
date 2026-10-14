// pages/api/email-test.js
// Authenticated delivery diagnostic. It can send ONLY to the email address
// returned by Firebase for the caller's own ID token; the browser cannot choose a recipient.

import { emailConfigured, sendEmailDetailed } from '../../lib/sendEmail';

const recentTests = new Map();
const TEST_COOLDOWN_MS = 60 * 1000;

function setSecurityHeaders(res) {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Cache-Control', 'no-store, max-age=0');
  res.setHeader('Referrer-Policy', 'no-referrer');
}

function userFacingDeliveryError(result) {
  if (result.code === 'missing_configuration') {
    return 'Vercel is missing RESEND_API_KEY or EMAIL_FROM. Add both under Project → Settings → Environment Variables, select Production, then redeploy.';
  }
  if (result.status === 401) {
    return 'Resend rejected the API key (HTTP 401). Create a fresh Resend sending key, update RESEND_API_KEY in Vercel, and redeploy.';
  }
  const detail = `${result.code || ''} ${result.message || ''}`.toLowerCase();
  if (result.status === 403 && /domain|verify|sender|testing/.test(detail)) {
    return `Resend rejected the sender. Verify the sending domain in Resend and ensure EMAIL_FROM uses that verified domain. Provider detail: ${result.message || 'HTTP 403'}`;
  }
  if (result.status === 400 || result.status === 422) {
    return `Resend rejected the email fields. Check EMAIL_FROM spelling/format and that the sender domain is verified. Provider detail: ${result.message || `HTTP ${result.status}`}`;
  }
  if (result.status === 429) {
    return 'Resend rate limit reached. Wait a moment and try again.';
  }
  if (result.status === 0) {
    return result.message || 'The email server could not complete the request.';
  }
  return `Resend rejected the email (HTTP ${result.status || 'unknown'}). Provider detail: ${result.message || result.code || 'No details returned.'}`;
}

export default async function handler(req, res) {
  setSecurityHeaders(res);

  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'method_not_allowed' });
  }
  if (!(req.headers['content-type'] || '').toLowerCase().includes('application/json')) {
    return res.status(415).json({ error: 'unsupported_media_type' });
  }

  const idToken = req.body?.idToken;
  if (typeof idToken !== 'string' || idToken.length < 20 || idToken.length > 4096) {
    return res.status(400).json({ error: 'invalid_token', message: 'Please sign in again and retry.' });
  }

  const firebaseApiKey = String(process.env.NEXT_PUBLIC_FIREBASE_API_KEY || '').trim();
  if (!firebaseApiKey) {
    return res.status(503).json({
      error: 'firebase_not_configured',
      message: 'Vercel is missing NEXT_PUBLIC_FIREBASE_API_KEY. Add the existing Firebase environment variables and redeploy.',
    });
  }

  try {
    const lookup = await fetch(
      `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${encodeURIComponent(firebaseApiKey)}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idToken }),
      }
    );
    if (!lookup.ok) {
      return res.status(401).json({ error: 'invalid_token', message: 'Your login token expired. Sign out, sign in again, and retry.' });
    }

    const user = (await lookup.json())?.users?.[0];
    if (!user?.localId || !user?.email) {
      return res.status(400).json({ error: 'no_email', message: 'Firebase did not return an email address for this account.' });
    }

    const lastTestAt = recentTests.get(user.localId) || 0;
    if (Date.now() - lastTestAt < TEST_COOLDOWN_MS) {
      return res.status(429).json({ error: 'test_cooldown', message: 'A test was just requested. Wait 60 seconds before sending another.' });
    }

    if (!emailConfigured()) {
      return res.status(503).json({
        error: 'email_not_configured',
        message: 'Vercel is missing RESEND_API_KEY or EMAIL_FROM. Add both under Project → Settings → Environment Variables, select Production, then redeploy.',
      });
    }

    const result = await sendEmailDetailed({
      to: user.email,
      subject: 'PromptAI email delivery test',
      html: '<div style="font-family:Arial,sans-serif;line-height:1.6"><h2>PromptAI email test</h2><p>Resend accepted this test message for your signed-in account.</p><p>This confirms API acceptance only. Check Resend → Emails for final delivery status.</p></div>',
      text: 'PromptAI email test. Resend accepted this test message for your signed-in account. This confirms API acceptance only; check Resend → Emails for final delivery status.',
    });

    if (!result.ok) {
      return res.status(result.code === 'missing_configuration' ? 503 : 502).json({
        error: 'send_failed',
        providerStatus: result.status || null,
        providerCode: result.code || null,
        message: userFacingDeliveryError(result),
      });
    }

    recentTests.set(user.localId, Date.now());
    if (recentTests.size > 2000) {
      const cutoff = Date.now() - TEST_COOLDOWN_MS * 3;
      for (const [uid, timestamp] of recentTests) if (timestamp < cutoff) recentTests.delete(uid);
    }

    return res.status(200).json({
      ok: true,
      recipient: user.email,
      message: 'Resend accepted the test email. Check Inbox and Spam; open Resend → Emails to confirm Delivered, Bounced, or Suppressed status.',
      emailId: result.id || null,
    });
  } catch (error) {
    console.error('[email-test] Diagnostic endpoint failed.', { errorName: error?.name || 'Error' });
    return res.status(500).json({ error: 'server_error', message: 'The diagnostic request failed. Open Vercel → Logs and check the latest /api/email-test function log.' });
  }
}
