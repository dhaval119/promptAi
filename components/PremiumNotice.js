// components/PremiumNotice.js
// In-app notification: shows once when the user receives Premium (from the admin OR from "Wake the Dev").
// Zero dependencies. Mounted once in pages/_app.js.

import { useEffect, useState } from 'react';
import { useAuth } from '../lib/AuthContext';

function toMillis(ts) {
  if (!ts) return 0;
  try {
    if (typeof ts.toMillis === 'function') return ts.toMillis();
    if (typeof ts.seconds === 'number') return ts.seconds * 1000;
    const n = new Date(ts).getTime();
    return Number.isFinite(n) ? n : 0;
  } catch {
    return 0;
  }
}

export default function PremiumNotice() {
  const { user, profile } = useAuth();
  const [notice, setNotice] = useState(null);

  const uid = user?.uid;
  const grantedMs = toMillis(profile?.premium_granted_at);
  const isPremium = !!(profile?.is_premium || profile?.isPremium);
  const source = profile?.premium_source || 'admin';

  useEffect(() => {
    if (!uid || !isPremium || !grantedMs) return;
    const key = `promptai_premium_seen_${uid}`;
    let seen = 0;
    try {
      seen = parseInt(window.localStorage.getItem(key), 10) || 0;
    } catch {}
    if (grantedMs > seen) {
      setNotice({
        key,
        grantedMs,
        title: source === 'wake_dev' ? 'The dev woke up.' : 'You got Premium.',
        text:
          source === 'wake_dev'
            ? 'Premium is ON. No more daily limit.'
            : 'The admin just gave you Premium. No more daily limit.',
      });
    }
  }, [uid, isPremium, grantedMs, source]);

  useEffect(() => {
    if (!notice) return;
    const t = setTimeout(() => close(), 9000);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [notice]);

  function close() {
    if (notice) {
      try {
        window.localStorage.setItem(notice.key, String(notice.grantedMs));
      } catch {}
    }
    setNotice(null);
  }

  if (!notice) return null;

  return (
    <div className="pn-wrap" role="status" aria-live="polite">
      <div className="pn-card">
        <div className="pn-bar">PREMIUM / STATUS UPDATE</div>
        <div className="pn-body">
          <div className="pn-title">{notice.title}</div>
          <div className="pn-text">{notice.text}</div>
          <div className="pn-sub">3/3 &rarr; &infin; (yes, really)</div>
        </div>
        <button type="button" className="pn-close" onClick={close} aria-label="Close">
          &times;
        </button>
      </div>
      <style jsx>{`
        .pn-wrap {
          position: fixed;
          top: 18px;
          right: 18px;
          z-index: 99999;
          max-width: calc(100vw - 36px);
          animation: pnIn 0.35s cubic-bezier(0.2, 0.9, 0.2, 1);
        }
        @keyframes pnIn {
          from { transform: translateY(-18px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
        .pn-card {
          position: relative;
          width: 340px;
          max-width: 100%;
          background: #050505;
          color: #e8e6df;
          border: 3px solid #e8e6df;
          box-shadow: 8px 8px 0 #7c3aed;
          font-family: 'Inter', system-ui, sans-serif;
        }
        .pn-bar {
          background: #7c3aed;
          color: #fff;
          font-family: 'Courier New', monospace;
          font-weight: 700;
          font-size: 11px;
          letter-spacing: 1.5px;
          padding: 7px 12px;
        }
        .pn-body { padding: 14px 16px 16px; }
        .pn-title {
          font-size: 24px;
          font-weight: 900;
          letter-spacing: -0.8px;
          text-transform: uppercase;
          line-height: 1;
        }
        .pn-text { margin-top: 8px; font-size: 14px; line-height: 1.45; color: #cfcfcf; }
        .pn-sub {
          margin-top: 10px;
          font-family: 'Courier New', monospace;
          font-size: 11px;
          font-weight: 700;
          letter-spacing: 1px;
          color: #a78bfa;
          text-transform: uppercase;
        }
        .pn-close {
          position: absolute;
          top: 2px;
          right: 6px;
          background: transparent;
          border: 0;
          color: #fff;
          font-size: 22px;
          line-height: 1;
          cursor: pointer;
        }
      `}</style>
    </div>
  );
}
