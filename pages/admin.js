import { useEffect, useState } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { useAuth } from '../lib/AuthContext';
import { collection, getDocs, doc, updateDoc, query, orderBy, limit } from 'firebase/firestore';
import { db } from '../lib/firebase';

// Only this email (or contains "dhaval") can access admin. Change as needed.
const ADMIN_EMAILS = ['sonidhaval2468@gmail.com', 'dhaval@gmai.com', 'dhaval123@gmai.com'];

function isAdminEmail(email) {
  if (!email) return false;
  const e = email.toLowerCase();
  if (ADMIN_EMAILS.some((a) => a.toLowerCase() === e)) return true;
  return e.includes('dhaval');
}

export default function AdminPage() {
  const router = useRouter();
  const { user, profile, loading } = useAuth();
  const [users, setUsers] = useState([]);
  const [tab, setTab] = useState('dashboard');
  const [stats, setStats] = useState({ revenue: 9.99, active: 0, newUsers: 0, chats: 0, blocked: 0 });
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.replace('/login');
      return;
    }
    if (!isAdminEmail(user.email)) {
      alert('Access denied. Only admin can view this page.');
      router.replace('/');
    }
  }, [user, loading, router]);

  useEffect(() => {
    if (!user || !isAdminEmail(user.email) || !db) return;
    (async () => {
      try {
        const snap = await getDocs(collection(db, 'users'));
        const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        setUsers(list);
        const blocked = list.filter((u) => u.is_blocked || u.isBlocked).length;
        const premium = list.filter((u) => u.is_premium || u.isPremium).length;
        setStats((s) => ({
          ...s,
          active: list.length - blocked,
          newUsers: 0,
          blocked,
          revenue: premium * 9.99,
        }));
      } catch (err) {
        console.warn('admin load users', err);
      }
    })();
  }, [user]);

  async function toggleBlock(uid, current) {
    if (!db) return;
    setBusy(true);
    try {
      await updateDoc(doc(db, 'users', uid), { is_blocked: !current });
      setUsers((prev) =>
        prev.map((u) => (u.id === uid ? { ...u, is_blocked: !current } : u))
      );
    } catch (e) {
      console.error(e);
    } finally {
      setBusy(false);
    }
  }

  async function togglePremium(uid, current) {
    if (!db) return;
    setBusy(true);
    try {
      await updateDoc(doc(db, 'users', uid), { is_premium: !current });
      setUsers((prev) =>
        prev.map((u) => (u.id === uid ? { ...u, is_premium: !current } : u))
      );
    } catch (e) {
      console.error(e);
    } finally {
      setBusy(false);
    }
  }

  if (loading || !user || !isAdminEmail(user?.email)) {
    return (
      <div style={{ background: '#0a0a0a', color: '#fff', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        Loading admin...
      </div>
    );
  }

  return (
    <>
      <Head>
        <title>Admin Dashboard - Prompt AI</title>
      </Head>
      <div style={{ display: 'flex', minHeight: '100vh', background: '#f5f6fa', fontFamily: 'Inter, sans-serif' }}>
        {/* Sidebar - matching screenshot light style */}
        <aside style={{ width: 240, background: '#fff', borderRight: '1px solid #e5e7eb', padding: '24px 16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 32 }}>
            <img src="/assets/ailogo.png" alt="" style={{ width: 32, height: 32 }} />
            <strong style={{ fontSize: 18 }}>Prompt AI</strong>
          </div>
          {[
            { id: 'dashboard', label: 'Dashboard' },
            { id: 'users', label: `Users (${users.length})` },
            { id: 'chats', label: 'All Chats (0)' },
            { id: 'api', label: 'API Settings' },
            { id: 'payments', label: 'Payments' },
            { id: 'logs', label: 'API Logs' },
          ].map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              style={{
                display: 'block',
                width: '100%',
                textAlign: 'left',
                padding: '12px 16px',
                marginBottom: 4,
                border: 'none',
                borderRadius: 24,
                background: tab === t.id ? '#111' : 'transparent',
                color: tab === t.id ? '#fff' : '#333',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              {t.label}
            </button>
          ))}
        </aside>

        <main style={{ flex: 1, padding: 32 }}>
          <h1 style={{ fontSize: 28, marginBottom: 24, color: '#111' }}>Admin Dashboard</h1>

          {tab === 'dashboard' && (
            <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
              <div style={{ background: '#111', color: '#fff', borderRadius: 16, padding: '24px 32px', minWidth: 160 }}>
                <div style={{ fontSize: 13, opacity: 0.8 }}>Total Revenue</div>
                <div style={{ fontSize: 32, fontWeight: 700 }}>${stats.revenue.toFixed(2)}</div>
              </div>
              <div style={{ background: '#fff', borderRadius: 16, padding: '24px 32px', minWidth: 140, boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
                <div style={{ fontSize: 13, color: '#666' }}>Active Users</div>
                <div style={{ fontSize: 32, fontWeight: 700 }}>{stats.active}</div>
              </div>
              <div style={{ background: '#fff', borderRadius: 16, padding: '24px 32px', minWidth: 140, boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
                <div style={{ fontSize: 13, color: '#666' }}>New Users</div>
                <div style={{ fontSize: 32, fontWeight: 700 }}>{stats.newUsers}</div>
              </div>
              <div style={{ background: '#fff', borderRadius: 16, padding: '24px 32px', minWidth: 140, boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
                <div style={{ fontSize: 13, color: '#666' }}>Total Chats</div>
                <div style={{ fontSize: 32, fontWeight: 700 }}>{stats.chats}</div>
              </div>
              <div style={{ background: '#ef4444', color: '#fff', borderRadius: 16, padding: '24px 32px', minWidth: 140 }}>
                <div style={{ fontSize: 13, opacity: 0.9 }}>Blocked Users</div>
                <div style={{ fontSize: 32, fontWeight: 700 }}>{stats.blocked}</div>
              </div>
            </div>
          )}

          {tab === 'users' && (
            <div>
              <h2 style={{ marginBottom: 16 }}>All Users</h2>
              <div style={{ background: '#fff', borderRadius: 12, overflow: 'auto', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
                  <thead>
                    <tr style={{ background: '#f9fafb', textAlign: 'left' }}>
                      <th style={{ padding: 12 }}>ID</th>
                      <th style={{ padding: 12 }}>Name</th>
                      <th style={{ padding: 12 }}>Email</th>
                      <th style={{ padding: 12 }}>Premium</th>
                      <th style={{ padding: 12 }}>Blocked</th>
                      <th style={{ padding: 12 }}>Usage</th>
                      <th style={{ padding: 12 }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map((u) => (
                      <tr key={u.id} style={{ borderTop: '1px solid #eee' }}>
                        <td style={{ padding: 12 }}>{u.id.slice(0, 6)}</td>
                        <td style={{ padding: 12 }}>{(u.first_name || u.firstName || '') + ' ' + (u.last_name || u.lastName || '')}</td>
                        <td style={{ padding: 12 }}>{u.email}</td>
                        <td style={{ padding: 12 }}>
                          <span style={{ background: (u.is_premium || u.isPremium) ? '#d1fae5' : '#f3f4f6', padding: '4px 10px', borderRadius: 12, fontSize: 12 }}>
                            {(u.is_premium || u.isPremium) ? 'PREMIUM' : 'Free'}
                          </span>
                        </td>
                        <td style={{ padding: 12 }}>
                          <span style={{ background: (u.is_blocked || u.isBlocked) ? '#fee2e2' : '#d1fae5', padding: '4px 10px', borderRadius: 12, fontSize: 12 }}>
                            {(u.is_blocked || u.isBlocked) ? 'Blocked' : 'Active'}
                          </span>
                        </td>
                        <td style={{ padding: 12 }}>{u.usage_count || u.usageCount || 0}</td>
                        <td style={{ padding: 12, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                          <button disabled={busy} onClick={() => togglePremium(u.id, u.is_premium || u.isPremium)} style={{ background: '#2563eb', color: '#fff', border: 'none', padding: '6px 10px', borderRadius: 6, cursor: 'pointer', fontSize: 12 }}>Premium</button>
                          <button disabled={busy} onClick={() => toggleBlock(u.id, u.is_blocked || u.isBlocked)} style={{ background: '#ef4444', color: '#fff', border: 'none', padding: '6px 10px', borderRadius: 6, cursor: 'pointer', fontSize: 12 }}>Block</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {tab === 'api' && (
            <div>
              <h2>API Settings (Gemini + Groq Backup)</h2>
              <p style={{ color: '#666', marginTop: 12 }}>API keys are managed via environment variables on the server (.env.local / Vercel env):</p>
              <ul style={{ marginTop: 12, lineHeight: 1.8 }}>
                <li>GEMINI_API_KEY</li>
                <li>GROQ_API_KEY</li>
                <li>GROQ_MODEL (e.g. llama-3.3-70b-versatile)</li>
                <li>PRIMARY_API (gemini or groq)</li>
              </ul>
              <p style={{ marginTop: 16, color: '#666' }}>For production, store keys only in server env, never in client or Firestore.</p>
            </div>
          )}

          {(tab === 'chats' || tab === 'payments' || tab === 'logs') && (
            <div style={{ color: '#666' }}>
              <p>This section is ready for connection to Firestore collections matching your original MySQL tables (chats, payments, api_logs).</p>
              <p>Collections suggested: <code>conversations_by_email</code>, <code>api_logs</code>, <code>payments</code>.</p>
            </div>
          )}
        </main>
      </div>
    </>
  );
}
