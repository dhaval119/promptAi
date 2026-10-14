// lib/sendEmail.js (server-side only)
// Priority: Brevo  →  EmailJS  →  Gmail  →  Resend
//
// === EmailJS (no domain, often no phone, Google signup) ===
// 1. https://www.emailjs.com → Sign up with Google
// 2. Email Services → Add Service → choose Gmail (connect once) OR "Custom SMTP" skip
//    Easiest: Add Service → Gmail → Connect account
// 3. Email Templates → Create New Template
//    Subject: {{subject}}
//    Content (HTML): {{{html_body}}}
//    To Email: {{to_email}}
//    From Name: PromptAI
//    Save → copy Template ID (e.g. template_xxxxx)
// 4. Account → General → copy Public Key
//    Account → Security → allow non-browser / private keys → create Private Access Token (optional but better)
// 5. Vercel env:
//      EMAILJS_SERVICE_ID   = service_xxxxx
//      EMAILJS_TEMPLATE_ID  = template_xxxxx
//      EMAILJS_PUBLIC_KEY   = xxxxxxxx
//      EMAILJS_PRIVATE_KEY  = xxxxxxxx   (recommended)
//      EMAIL_FROM           = PromptAI <anything@emailjs.com>  (display only)
//      NEXT_PUBLIC_SITE_URL = https://your-site.vercel.app
// 6. Redeploy
//
// Free: 200 emails/month. No domain. Sends to any address.

const EMAILJS_ENDPOINT = 'https://api.emailjs.com/api/v1.0/email/send';
const BREVO_ENDPOINT = 'https://api.brevo.com/v3/smtp/email';
const RESEND_ENDPOINT = 'https://api.resend.com/emails';

const clean = (v) =>
  String(v || '')
    .replace(/[\r\n\t]+/g, ' ')
    .replace(/\s{2,}/g, ' ')
    .trim()
    .slice(0, 300);

function parseFrom(raw) {
  const s = String(raw || '').trim();
  if (!s) return { name: 'PromptAI', email: '' };
  const m = s.match(/^(.+?)\s*<([^>]+)>$/);
  if (m) return { name: m[1].trim() || 'PromptAI', email: m[2].trim().toLowerCase() };
  if (/^[^<>@\s]+@[^<>@\s]+$/.test(s)) return { name: 'PromptAI', email: s.toLowerCase() };
  return { name: 'PromptAI', email: s };
}

function normalizeFromString(raw) {
  const { name, email } = parseFrom(raw);
  if (!email) return name ? `${name}` : '';
  return `${name} <${email}>`;
}

function emailjsConfigured() {
  return Boolean(
    String(process.env.EMAILJS_SERVICE_ID || '').trim() &&
      String(process.env.EMAILJS_TEMPLATE_ID || '').trim() &&
      String(process.env.EMAILJS_PUBLIC_KEY || '').trim()
  );
}

function gmailConfigured() {
  const user = String(process.env.GMAIL_USER || '').trim();
  const pass = String(process.env.GMAIL_APP_PASSWORD || '').replace(/\s+/g, '');
  return user.includes('@') && pass.length >= 12;
}

export function emailConfigured() {
  if (String(process.env.BREVO_API_KEY || '').trim()) return true;
  if (emailjsConfigured()) return true;
  if (gmailConfigured()) return true;
  const from = String(process.env.EMAIL_FROM || '').trim();
  if (!from) return false;
  if (String(process.env.RESEND_API_KEY || '').trim()) return true;
  return false;
}

export function emailConfigStatus() {
  const ejs = emailjsConfigured();
  const gmail = gmailConfigured();
  const brevo = String(process.env.BREVO_API_KEY || '').trim();
  const resend = String(process.env.RESEND_API_KEY || '').trim();
  const fromRaw = String(process.env.EMAIL_FROM || process.env.GMAIL_USER || 'PromptAI').trim();
  const site = String(process.env.NEXT_PUBLIC_SITE_URL || '').trim();
  const provider = brevo
    ? 'brevo'
    : ejs
      ? 'emailjs'
      : gmail
        ? 'gmail'
        : resend
          ? 'resend'
          : 'none';
  return {
    provider,
    hasEmailjs: ejs,
    hasGmail: gmail,
    hasBrevo: brevo.length > 10,
    hasResend: resend.length > 10,
    hasApiKey: ejs || gmail || brevo.length > 10 || resend.length > 10,
    apiKeyPrefix: ejs
      ? String(process.env.EMAILJS_SERVICE_ID || '').slice(0, 12) + '…'
      : gmail
        ? 'gmail'
        : brevo
          ? brevo.slice(0, 8) + '…'
          : resend
            ? resend.slice(0, 5) + '…'
            : null,
    hasFrom: true,
    fromPreview: fromRaw ? normalizeFromString(fromRaw) || fromRaw : null,
    hasSiteUrl: site.length > 5,
    siteUrl: site || null,
    ready: emailConfigured(),
  };
}

async function sendViaEmailjs({ to, subject, html, text }) {
  const serviceId = String(process.env.EMAILJS_SERVICE_ID || '').trim();
  const templateId = String(process.env.EMAILJS_TEMPLATE_ID || '').trim();
  const publicKey = String(process.env.EMAILJS_PUBLIC_KEY || '').trim();
  const privateKey = String(process.env.EMAILJS_PRIVATE_KEY || '').trim();

  const payload = {
    service_id: serviceId,
    template_id: templateId,
    user_id: publicKey,
    template_params: {
      to_email: to,
      subject: String(subject),
      html_body: html || text || '',
      message: text || '',
      from_name: 'PromptAI',
    },
  };
  if (privateKey) payload.accessToken = privateKey;

  const response = await fetch(EMAILJS_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify(payload),
  });

  const rawText = await response.text().catch(() => '');
  let data = null;
  try {
    data = rawText ? JSON.parse(rawText) : null;
  } catch {
    data = { text: rawText };
  }

  if (!response.ok) {
    const message = clean(
      data?.text || data?.message || data?.error || rawText || `EmailJS HTTP ${response.status}`
    );
    return {
      ok: false,
      status: response.status,
      code: `emailjs_${response.status}`,
      message:
        response.status === 412 || /template|variable/i.test(message)
          ? 'EmailJS template issue. Template must have: To = {{to_email}}, Subject = {{subject}}, Body HTML = {{{html_body}}}'
          : message || 'EmailJS rejected the request.',
      id: null,
      provider: 'emailjs',
    };
  }

  return {
    ok: true,
    status: response.status,
    code: null,
    message: 'EmailJS accepted the email request.',
    id: null,
    provider: 'emailjs',
  };
}

async function sendViaGmail({ from, to, subject, html, text, replyTo }) {
  let nodemailer;
  try {
    nodemailer = require('nodemailer');
  } catch {
    return {
      ok: false,
      status: 0,
      code: 'nodemailer_missing',
      message: 'npm install nodemailer then redeploy (only needed for Gmail).',
      id: null,
      provider: 'gmail',
    };
  }
  const user = String(process.env.GMAIL_USER || '').trim();
  const pass = String(process.env.GMAIL_APP_PASSWORD || '').replace(/\s+/g, '');
  const { name, email: fromEmail } = parseFrom(from || user);
  const transporter = nodemailer.createTransport({ service: 'gmail', auth: { user, pass } });
  try {
    const info = await transporter.sendMail({
      from: `"${name}" <${fromEmail || user}>`,
      to,
      subject: String(subject),
      html: html || undefined,
      text: text || undefined,
      replyTo: replyTo || undefined,
    });
    return {
      ok: true,
      status: 200,
      code: null,
      message: 'Gmail accepted the email.',
      id: info?.messageId || null,
      provider: 'gmail',
    };
  } catch (err) {
    return {
      ok: false,
      status: 0,
      code: 'gmail_smtp_error',
      message: clean(err?.message) || 'Gmail SMTP failed',
      id: null,
      provider: 'gmail',
    };
  }
}

async function sendViaBrevo({ apiKey, from, to, subject, html, text, replyTo }) {
  const { name, email: senderEmail } = parseFrom(from);
  const body = {
    sender: { name, email: senderEmail },
    to: [{ email: to }],
    subject: String(subject),
  };
  if (html) body.htmlContent = html;
  if (text) body.textContent = text;
  if (replyTo) body.replyTo = { email: replyTo };
  const response = await fetch(BREVO_ENDPOINT, {
    method: 'POST',
    headers: { 'api-key': apiKey, 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify(body),
  });
  const data = await response.json().catch(() => null);
  if (!response.ok) {
    return {
      ok: false,
      status: response.status,
      code: clean(data?.code || `http_${response.status}`),
      message: clean(data?.message || 'Brevo rejected'),
      id: null,
      provider: 'brevo',
    };
  }
  return {
    ok: true,
    status: response.status,
    code: null,
    message: 'Brevo accepted.',
    id: data?.messageId || null,
    provider: 'brevo',
  };
}

async function sendViaResend({ apiKey, from, to, subject, html, text, replyTo }) {
  const payload = { from: normalizeFromString(from), to: [to], subject: String(subject) };
  if (html) payload.html = html;
  if (text) payload.text = text;
  if (replyTo) payload.reply_to = replyTo;
  const response = await fetch(RESEND_ENDPOINT, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify(payload),
  });
  const data = await response.json().catch(() => null);
  if (!response.ok) {
    return {
      ok: false,
      status: response.status,
      code: clean(data?.name || data?.code || `http_${response.status}`),
      message: clean(data?.message || 'Resend rejected'),
      id: null,
      provider: 'resend',
    };
  }
  return {
    ok: true,
    status: response.status,
    code: null,
    message: 'Resend accepted.',
    id: data?.id || null,
    provider: 'resend',
  };
}

export async function sendEmailDetailed({ to, subject, html, text }) {
  const from =
    String(process.env.EMAIL_FROM || '').trim() ||
    (process.env.GMAIL_USER ? `PromptAI <${String(process.env.GMAIL_USER).trim()}>` : 'PromptAI');
  const replyTo = String(process.env.EMAIL_REPLY_TO || '').trim();
  const recipient = String(to || '').trim().toLowerCase();

  if (!emailConfigured()) {
    return {
      ok: false,
      status: 0,
      code: 'missing_configuration',
      message:
        'No email provider configured. Set BREVO_API_KEY + EMAIL_FROM (verified sender Gmail in Brevo). Redeploy.',
      id: null,
    };
  }
  if (!recipient || !subject || (!html && !text)) {
    return {
      ok: false,
      status: 0,
      code: 'invalid_email_payload',
      message: 'Recipient, subject, or body missing.',
      id: null,
    };
  }

  const args = { from, to: recipient, subject, html, text, replyTo: replyTo || undefined };

  try {
    const brevoKey = String(process.env.BREVO_API_KEY || '').trim();
    if (brevoKey) {
      const r = await sendViaBrevo({ apiKey: brevoKey, ...args });
      if (!r.ok) console.error('[PromptAI email] Brevo failed', r);
      return r;
    }
    if (emailjsConfigured()) {
      const r = await sendViaEmailjs(args);
      if (!r.ok) console.error('[PromptAI email] EmailJS failed', r);
      return r;
    }
    if (gmailConfigured()) {
      const r = await sendViaGmail(args);
      if (!r.ok) console.error('[PromptAI email] Gmail failed', r);
      return r;
    }
    const resendKey = String(process.env.RESEND_API_KEY || '').trim();
    if (resendKey) {
      const r = await sendViaResend({ apiKey: resendKey, ...args });
      if (!r.ok) console.error('[PromptAI email] Resend failed', r);
      return r;
    }
    return { ok: false, status: 0, code: 'missing_configuration', message: 'No provider.', id: null };
  } catch (error) {
    return {
      ok: false,
      status: 0,
      code: 'network_error',
      message: 'Could not reach email provider.',
      id: null,
    };
  }
}

export async function sendEmail(args) {
  return (await sendEmailDetailed(args)).ok;
}
