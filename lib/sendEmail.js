// lib/sendEmail.js (server-side only)
// Shared PromptAI email sender powered by Resend. Never expose RESEND_API_KEY to the browser.
// Required server environment variables: RESEND_API_KEY and EMAIL_FROM.
// Optional: EMAIL_REPLY_TO.

const RESEND_ENDPOINT = 'https://api.resend.com/emails';

const cleanProviderText = (value) =>
  String(value || '')
    .replace(/[\r\n\t]+/g, ' ')
    .replace(/\s{2,}/g, ' ')
    .trim()
    .slice(0, 240);

export function emailConfigured() {
  return Boolean(
    String(process.env.RESEND_API_KEY || '').trim() &&
    String(process.env.EMAIL_FROM || '').trim()
  );
}

/**
 * Detailed server-only result used by API routes for useful diagnostics.
 * Never return the API key or request headers in errors/logs.
 */
export async function sendEmailDetailed({ to, subject, html, text }) {
  const apiKey = String(process.env.RESEND_API_KEY || '').trim();
  const from = String(process.env.EMAIL_FROM || '').trim();
  const replyTo = String(process.env.EMAIL_REPLY_TO || '').trim();
  const recipient = String(to || '').trim();

  if (!apiKey || !from) {
    console.error('[PromptAI email] Missing RESEND_API_KEY or EMAIL_FROM environment variable.');
    return {
      ok: false,
      status: 0,
      code: 'missing_configuration',
      message: 'Missing RESEND_API_KEY or EMAIL_FROM in the server environment.',
      id: null,
    };
  }
  if (!recipient || !subject || (!html && !text)) {
    console.error('[PromptAI email] Refusing to send an incomplete email payload.');
    return {
      ok: false,
      status: 0,
      code: 'invalid_email_payload',
      message: 'The email recipient, subject, or body is missing.',
      id: null,
    };
  }

  const payload = {
    from,
    to: [recipient],
    subject: String(subject),
  };
  if (html) payload.html = html;
  if (text) payload.text = text;
  if (replyTo) payload.reply_to = replyTo;

  try {
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
      const code = cleanProviderText(data?.name || data?.code || `http_${response.status}`);
      const message = cleanProviderText(data?.message || data?.error || 'Resend rejected the email request.');
      console.error('[PromptAI email] Resend rejected the email request.', {
        status: response.status,
        code,
        message,
      });
      return { ok: false, status: response.status, code, message, id: null };
    }

    return {
      ok: true,
      status: response.status,
      code: null,
      message: 'Resend accepted the email request.',
      id: typeof data?.id === 'string' ? data.id : null,
    };
  } catch (error) {
    // Do not log arbitrary error objects; they can include request internals.
    console.error('[PromptAI email] Could not reach Resend.', {
      errorName: cleanProviderText(error?.name || 'Error'),
    });
    return {
      ok: false,
      status: 0,
      code: 'network_error',
      message: 'The server could not reach Resend. Check the Vercel Function Logs.',
      id: null,
    };
  }
}

// Keep the original boolean interface for all existing Premium/wake-dev callers.
export async function sendEmail(args) {
  const result = await sendEmailDetailed(args);
  return result.ok;
}
