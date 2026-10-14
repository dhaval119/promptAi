// pages/api/email-test.js
// Authenticated delivery diagnostic.
// GET  → config status only (no email sent, no secrets)
// POST → send a test email ONLY to the signed-in Firebase user's own email

import { emailConfigured, emailConfigStatus, sendEmailDetailed } from '../../lib/sendEmail';

const recentTests = new Map();
const TEST_COOLDOWN_MS = 45 * 1000;

function setSecurityHeaders(res) {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Cache-Control', 'no-store, max-age=0');
  res.setHeader('Referrer-Policy', 'no-referrer');
}

function userFacingDeliveryError(result) {
  if (result.code === 'missing_configuration') {
    return 'Vercel is missing RESEND_API_KEY or EMAIL_FROM. Add both under Project → Settings → Environment Variables, select Production (and Preview if needed), then Redeploy.';
  }
  if (result.status === 401) {
    return 'Resend rejected the API key (HTTP 401). Create a new API key in Resend → API Keys, update RESEND_API_KEY in Vercel, and Redeploy.';
  }
  const detail = `${result.code || ''} ${result.message || ''}`.toLowerCase();
  if (
    result.status === 403 ||
    /only send testing emails|verify a domain|not authorized|restricted/.test(detail)
  ) {
    return (
      'Resend free plan restriction: without a verified domain you can ONLY send to the email of your Resend account. ' +
      'Fix options: (1) Sign in to PromptAI with the SAME email you used on Resend, OR (2) Verify a domain in Resend → Domains and set EMAIL_FROM to an address on that domain (e.g. PromptAI <hello@yourdomain.com>). ' +
      `Provider: ${result.message || 'HTTP ' + result.status}`
    );
  }
  if (result.status === 400 || result.status === 422) {
    return `Resend rejected the email fields. Check EMAIL_FROM format (use: PromptAI <onboarding@resend.dev>). Provider: ${result.message || 'HTTP ' + result.status}`;
  }
  if (result.status === 429) {
    return 'Resend rate limit reached. Wait a minute and try again.';
  }
  if (result.status === 0) {
    return result.message || 'The email server could not complete the request.';
  }
  return `Resend rejected the email (HTTP ${result.status || 'unknown'}). Provider: ${result.message || result.code || 'No details'}`;
}

export default async function handler(req, res) {
  setSecurityHeaders(res);

  // GET = config check only (no auth required for basic status, no secrets leaked)
  if (req.method === 'GET') {
    const status = emailConfigStatus();
    return res.status(200).json({
      ok: true,
      configured: status.ready,
      hasApiKey: status.hasApiKey,
      apiKeyPrefix: status.apiKeyPrefix,
      hasFrom: status.hasFrom,
      fromPreview: status.fromPreview,
      hasSiteUrl: status.hasSiteUrl,
      siteUrl: status.siteUrl,
      tip: status.ready
        ? 'Config looks OK. Sign in and use POST / Send Test Email to actually send.'
        : 'Add RESEND_API_KEY (Secret) and EMAIL_FROM (Config) in Vercel, then Redeploy.',
    });
  }

  if (req.method !== 'POST') {
    res.setHeader('Allow', 'GET, POST');
    return res.status(405).json({ error: 'method_not_allowed' });
  }
  if (!(req.headers['content-type'] || '').toLowerCase().includes('application/json')) {
    return res.status(415).json({ error: 'unsupported_media_type', message: 'Content-Type must be application/json' });
  }

  const idToken = req.body?.idToken;
  if (typeof idToken !== 'string' || idToken.length < 20 || idToken.length > 4096) {
    return res.status(400).json({ error: 'invalid_token', message: 'Please sign in again and retry.' });
  }

  const firebaseApiKey = String(process.env.NEXT_PUBLIC_FIREBASE_API_KEY || '').trim();
  if (!firebaseApiKey) {
    return res.status(503).json({
      error: 'firebase_not_configured',
      message: 'Vercel is missing NEXT_PUBLIC_FIREBASE_API_KEY. Add Firebase env vars and redeploy.',
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
      return res.status(401).json({
        error: 'invalid_token',
        message: 'Your login token expired. Sign out, sign in again, and retry.',
      });
    }

    const user = (await lookup.json())?.users?.[0];
    if (!user?.localId || !user?.email) {
      return res.status(400).json({
        error: 'no_email',
        message: 'Firebase did not return an email address for this account.',
      });
    }

    const lastTestAt = recentTests.get(user.localId) || 0;
    if (Date.now() - lastTestAt < TEST_COOLDOWN_MS) {
      return res.status(429).json({
        error: 'test_cooldown',
        message: 'A test was just requested. Wait ~45 seconds before sending another.',
      });
    }

    if (!emailConfigured()) {
      const status = emailConfigStatus();
      return res.status(503).json({
        error: 'email_not_configured',
        message:
          'Vercel is missing RESEND_API_KEY or EMAIL_FROM. Add both under Project → Settings → Environment Variables, select Production, then Redeploy.',
        hasApiKey: status.hasApiKey,
        hasFrom: status.hasFrom,
      });
    }

    const result = await sendEmailDetailed({
      to: user.email,
      subject: 'PromptAI email delivery test ✓',
      html: `<div style="font-family:Arial,sans-serif;line-height:1.6;background:#050505;color:#e8e6df;padding:24px">
        <h2 style="margin:0 0 12px;color:#a78bfa">PromptAI email test</h2>
        <p>Resend accepted this test message for your signed-in account (<b>${user.email}</b>).</p>
        <p style="color:#aaa;font-size:13px">If you received this, welcome + premium emails will also work.</p>
      </div>`,
      text: `PromptAI email test. Resend accepted this for ${user.email}. If you got this, welcome + premium emails work.`,
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
      message:
        'Resend accepted the test email. Check Inbox AND Spam. Also open Resend dashboard → Emails to see Delivered / Bounced / Suppressed.',
      emailId: result.id || null,
    });
  } catch (error) {
    console.error('[email-test] Diagnostic endpoint failed.', { errorName: error?.name || 'Error' });
    return res.status(500).json({
      error: 'server_error',
      message: 'The diagnostic request failed. Open Vercel → Logs and check the latest /api/email-test function log.',
    });
  }
}
