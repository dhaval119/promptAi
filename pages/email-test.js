import { useEffect, useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useAuth } from '../lib/AuthContext';

export default function EmailTestPage() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState(null);

  useEffect(() => {
    if (!loading && !user) router.replace('/login');
  }, [loading, user, router]);

  async function sendTestEmail() {
    if (!user || sending) return;
    setSending(true);
    setResult(null);
    try {
      const idToken = await user.getIdToken();
      const response = await fetch('/api/email-test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idToken }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        setResult({ ok: false, message: payload.message || payload.error || `Email check failed (HTTP ${response.status}).` });
      } else {
        setResult({ ok: true, message: payload.message, recipient: payload.recipient, emailId: payload.emailId });
      }
    } catch (error) {
      setResult({ ok: false, message: error?.message || 'Could not reach the email test endpoint. Check your connection and retry.' });
    } finally {
      setSending(false);
    }
  }

  return (
    <>
      <Head>
        <title>PromptAI · Email Delivery Check</title>
        <meta name="robots" content="noindex,nofollow" />
      </Head>
      <main style={{ minHeight: '100vh', background: '#050505', color: '#f5f5f5', padding: '32px 18px', fontFamily: 'Arial, sans-serif' }}>
        <div style={{ width: '100%', maxWidth: 680, margin: '0 auto' }}>
          <Link href="/" style={{ color: '#aaa', textDecoration: 'none', fontSize: 14 }}>← Back to PromptAI</Link>
          <p style={{ marginTop: 42, color: '#aaa', letterSpacing: 2, fontSize: 12, textTransform: 'uppercase' }}>Diagnostics / Email</p>
          <h1 style={{ fontSize: 'clamp(32px, 6vw, 54px)', lineHeight: 1, letterSpacing: -2, margin: '12px 0 16px', fontWeight: 900 }}>EMAIL CHECK.</h1>
          <p style={{ color: '#c7c7c7', maxWidth: 560, lineHeight: 1.7 }}>
            This sends a small test message only to the email address on your currently signed-in Firebase account. It does not change the welcome email design or its content.
          </p>

          <div style={{ borderTop: '1px solid #444', borderBottom: '1px solid #444', padding: '22px 0', margin: '28px 0' }}>
            <div style={{ color: '#888', textTransform: 'uppercase', fontSize: 11, letterSpacing: 1.5, marginBottom: 8 }}>Signed-in account</div>
            <div style={{ fontSize: 16, overflowWrap: 'anywhere' }}>{loading ? 'Checking sign-in…' : (user?.email || 'Not signed in')}</div>
          </div>

          {!loading && !user ? (
            <p>Please sign in first. <Link href="/login" style={{ color: '#fff' }}>Go to login</Link>.</p>
          ) : (
            <button
              type="button"
              onClick={sendTestEmail}
              disabled={loading || !user || sending}
              style={{ background: '#f5f5f5', color: '#050505', border: 0, borderRadius: 4, padding: '14px 20px', fontSize: 14, fontWeight: 800, cursor: sending ? 'wait' : 'pointer', opacity: sending ? 0.65 : 1 }}
            >
              {sending ? 'SENDING TEST EMAIL…' : 'SEND TEST EMAIL'}
            </button>
          )}

          {result ? (
            <section role="status" style={{ marginTop: 24, padding: 18, border: `1px solid ${result.ok ? '#5a8f63' : '#ba6262'}`, borderRadius: 6 }}>
              <h2 style={{ fontSize: 16, margin: '0 0 10px', color: result.ok ? '#a8e0af' : '#ffb5b5' }}>{result.ok ? 'REQUEST ACCEPTED' : 'EMAIL NOT SENT'}</h2>
              <p style={{ margin: 0, lineHeight: 1.7, overflowWrap: 'anywhere' }}>{result.message}</p>
              {result.ok && result.recipient ? <p style={{ color: '#aaa', fontSize: 12, marginBottom: 0 }}>Recipient: {result.recipient}</p> : null}
              {result.ok && result.emailId ? <p style={{ color: '#888', fontSize: 11, overflowWrap: 'anywhere' }}>Resend email ID: {result.emailId}</p> : null}
            </section>
          ) : null}

          <div style={{ marginTop: 34, color: '#969696', fontSize: 13, lineHeight: 1.8 }}>
            <p>1. If the check reports missing environment variables, add <code>RESEND_API_KEY</code> and <code>EMAIL_FROM</code> in Vercel and redeploy.</p>
            <p>2. If the provider rejects the sender, verify your domain under Resend → Domains and use an address from that verified domain.</p>
            <p>3. If Resend accepts the message but it does not arrive, open Resend → Emails and inspect its final status. Then check Spam/Junk.</p>
          </div>
        </div>
      </main>
    </>
  );
}
