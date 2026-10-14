// lib/sendEmail.js (server side only)
// Shared PromptAI email sender powered by Resend. No API key is exposed to the browser.
// Required server environment variables: RESEND_API_KEY and EMAIL_FROM.
// Optional: EMAIL_REPLY_TO.

const RESEND_ENDPOINT = 'https://api.resend.com/emails';

export function emailConfigured() {
  return Boolean(
    String(process.env.RESEND_API_KEY || '').trim() &&
    String(process.env.EMAIL_FROM || '').trim()
  );
}

export async function sendEmail({ to, subject, html, text }) {
  const apiKey = String(process.env.RESEND_API_KEY || '').trim();
  const from = String(process.env.EMAIL_FROM || '').trim();
  const replyTo = String(process.env.EMAIL_REPLY_TO || '').trim();
  const recipient = String(to || '').trim();

  // Fail closed when the server configuration or message is incomplete.
  if (!apiKey || !from || !recipient || !subject || (!html && !text)) return false;

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

    if (!response.ok) {
      // Do not log the API key or provider response body (which may include user data).
      console.error(`Resend email request failed with HTTP ${response.status}.`);
      return false;
    }

    return true;
  } catch {
    // Keep secret values and message contents out of application logs.
    console.error('Resend email request failed before completion.');
    return false;
  }
}
