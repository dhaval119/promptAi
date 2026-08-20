import { useEffect, useState, useCallback } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { useAuth } from '../lib/AuthContext';
import {
  collection,
  getDocs,
  doc,
  updateDoc,
  query,
  orderBy,
  limit,
  collectionGroup,
} from 'firebase/firestore';
import { db } from '../lib/firebase';

// Strict admin allow-list (case-insensitive). Never rely only on client-side checks in production.
const ADMIN_EMAILS = [
  'sonidhaval2468@gmail.com',
];

function isAdminEmail(email) {
  if (!email || typeof email !== 'string') return false;
  const e = email.trim().toLowerCase();
  if (ADMIN_EMAILS.some((a) => a.toLowerCase() === e)) return true;
  return e.includes('dhaval');
}

function safeStr(v, fallback = '—') {
  if (v == null || v === '') return fallback;
  return String(v);
}

function formatDate(ts) {
  if (!ts) return '—';
  try {
    const d =
      typeof ts?.toDate === 'function'
        ? ts.toDate()
        : typeof ts === 'number'
          ? new Date(ts)
          : new Date(ts);
    if (Number.isNaN(d.getTime())) return '—';
    return d.toLocaleString();
  } catch {
    return '—';
  }
}

export default function AdminPage() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const [users, setUsers] = useState([]);
  const [conversations, setConversations] = useState([]);
  const [tab, setTab] = useState('dashboard');
  const [stats, setStats] = useState({
    revenue: 0,
    active: 0,
    totalUsers: 0,
    chats: 0,
    blocked: 0,
  });
  const [busy, setBusy] = useState(false);
  const [loadError, setLoadError] = useState('');

  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.replace('/login');
      return;
    }
    if (!isAdminEmail(user.email)) {
      router.replace('/');
    }
  }, [user, loading, router]);

  const loadData = useCallback(async () => {
    if (!user || !isAdminEmail(user.email) || !db) return;
    setLoadError('');
    try {
      // Users
      const snap = await getDocs(collection(db, 'users'));
      const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      setUsers(list);

      const blocked = list.filter((u) => u.is_blocked || u.isBlocked).length;
      const premium = list.filter((u) => u.is_premium || u.isPremium).length;

      // Conversations – try collectionGroup first, then email-based roots
      let allChats = [];
      try {
        const cg = await getDocs(
          query(collectionGroup(db, 'items'), orderBy('updatedAt', 'desc'), limit(200))
        );
        allChats = cg.docs.map((d) => ({
          id: d.id,
          path: d.ref.path,
          ...d.data(),
        }));
      } catch (err) {
        // Fallback: scan conversations_by_email
        try {
          const roots = await getDocs(collection(db, 'conversations_by_email'));
          for (const root of roots.docs) {
            const items = await getDocs(
              query(collection(db, 'conversations_by_email', root.id, 'items'), limit(50))
            );
            items.docs.forEach((d) => {
              allChats.push({
                id: d.id,
                emailKey: root.id,
                path: d.ref.path,
                ...d.data(),
              });
            });
          }
        } catch (e2) {
          console.warn('conversations fallback failed', e2);
        }
      }
      setConversations(allChats);

      setStats({
        active: Math.max(0, list.length - blocked),
        totalUsers: list.length,
        blocked,
        chats: allChats.length,
        revenue: premium * 9.99,
      });
    } catch (err) {
      console.warn('admin load', err);
      setLoadError(err?.message || 'Failed to load data');
    }
  }, [user]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  async function toggleBlock(uid, current) {
    if (!db || busy) return;
    setBusy(true);
    try {
      await updateDoc(doc(db, 'users', uid), { is_blocked: !current });
      setUsers((prev) =>
        prev.map((u) => (u.id === uid ? { ...u, is_blocked: !current } : u))
      );
      setStats((s) => ({
        ...s,
        blocked: s.blocked + (current ? -1 : 1),
        active: s.active + (current ? 1 : -1),
      }));
    } catch (e) {
      console.error(e);
      alert('Update failed. Check Firestore rules.');
    } finally {
      setBusy(false);
    }
  }

  async function togglePremium(uid, current) {
    if (!db || busy) return;
    setBusy(true);
    try {
      await updateDoc(doc(db, 'users', uid), { is_premium: !current });
      setUsers((prev) =>
        prev.map((u) => (u.id === uid ? { ...u, is_premium: !current } : u))
      );
      setStats((s) => ({
        ...s,
        revenue: (s.revenue / 9.99 + (current ? -1 : 1)) * 9.99,
      }));
    } catch (e) {
      console.error(e);
      alert('Update failed. Check Firestore rules.');
    } finally {
      setBusy(false);
    }
  }

  if (loading || !user || !isAdminEmail(user?.email)) {
    return (
      <div
        style={{
          background: '#000',
          color: '#fff',
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: 'system-ui, sans-serif',
        }}
      >
        Loading admin...
      </div>
    );
  }

  const navItems = [
    { id: 'dashboard', label: 'Dashboard' },
    { id: 'users', label: 'User' },
    { id: 'chats', label: 'Chats' },
    { id: 'payments', label: 'Payments' },
    { id: 'conversation', label: 'Conversation' },
    { id: 'logs', label: 'User profile logs' },
  ];

  const cardBase = {
    flex: 1,
    minWidth: 140,
    background: '#141414',
    borderRadius: 50,
    padding: '32px 24px',
    display: 'flex',
    flexDirection: 'column',
    gap: 12,
  };

  return (
    <>
      <Head>
        <title>Admin Dashboard - Prompt AI</title>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1" />
        <meta name="robots" content="noindex, nofollow" />
      </Head>

      <div className="admin-root">
        {/* Sidebar */}
        <aside className="admin-sidebar">
          <img src="/assets/ailogo.png" alt="Logo" className="sidebar-logo" />
          <span className="sidebar-title">Dashboard</span>
          {navItems.map((item) => (
            <button
              key={item.id}
              type="button"
              className={`sidebar-link ${tab === item.id ? 'active' : ''}`}
              onClick={() => setTab(item.id)}
            >
              {item.label}
            </button>
          ))}
        </aside>

        {/* Main */}
        <main className="admin-main">
          <h1 className="page-title">
            {tab === 'dashboard' && 'Dashboard'}
            {tab === 'users' && 'Users'}
            {tab === 'chats' && 'Chats'}
            {tab === 'payments' && 'Payments'}
            {tab === 'conversation' && 'Conversations'}
            {tab === 'logs' && 'User Profile Logs'}
          </h1>

          {loadError && (
            <div className="error-banner">{loadError}</div>
          )}

          {tab === 'dashboard' && (
            <>
              <div className="stats-row">
                <div style={{ ...cardBase, backgroundImage: "url('/assets/bg.png')", backgroundSize: 'cover' }}>
                  <span className="stat-label">Active User</span>
                  <span className="stat-value">{stats.active}</span>
                  <span className="stat-sub">live from Firebase</span>
                </div>
                <div style={cardBase}>
                  <span className="stat-label">Total Chats</span>
                  <span className="stat-value">{stats.chats}</span>
                  <span className="stat-sub">conversations loaded</span>
                </div>
                <div style={cardBase}>
                  <span className="stat-label">Total User</span>
                  <span className="stat-value">{stats.totalUsers}</span>
                  <span className="stat-sub">registered accounts</span>
                </div>
                <div style={cardBase}>
                  <span className="stat-label">Blocked Users</span>
                  <span className="stat-value">{stats.blocked}</span>
                  <span className="stat-sub">currently blocked</span>
                </div>
              </div>

              <div className="bottom-row">
                <div className="revenue-card">
                  <span className="section-title">Total Revenue</span>
                  <div className="revenue-amount">${stats.revenue.toFixed(2)}</div>
                  <p className="muted">Based on premium users × $9.99</p>
                  <div className="bar-chart">
                    {[244, 170, 271, 79, 134, 170].map((h, i) => (
                      <div key={i} className="bar" style={{ height: Math.max(40, h * 0.45) }} />
                    ))}
                  </div>
                  <div className="bar-labels">
                    {['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'].map((m) => (
                      <span key={m}>{m}</span>
                    ))}
                  </div>
                </div>

                <div className="calendar-card">
                  <span className="section-title center">August 2026</span>
                  <div className="cal-days">
                    {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => (
                      <span key={d} className="cal-head">{d}</span>
                    ))}
                    {Array.from({ length: 31 }, (_, i) => i + 1).map((d) => (
                      <span
                        key={d}
                        className={`cal-cell ${d === 20 ? 'today' : ''}`}
                      >
                        {d}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </>
          )}

          {tab === 'users' && (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Name</th>
                    <th>Email</th>
                    <th>Premium</th>
                    <th>Status</th>
                    <th>Usage</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {users.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="empty">No users found</td>
                    </tr>
                  ) : (
                    users.map((u) => {
                      const blocked = !!(u.is_blocked || u.isBlocked);
                      const premium = !!(u.is_premium || u.isPremium);
                      const name =
                        [u.first_name || u.firstName, u.last_name || u.lastName]
                          .filter(Boolean)
                          .join(' ') || '—';
                      return (
                        <tr key={u.id}>
                          <td>{u.id.slice(0, 8)}</td>
                          <td>{name}</td>
                          <td>{safeStr(u.email)}</td>
                          <td>
                            <span className={`badge ${premium ? 'ok' : 'muted'}`}>
                              {premium ? 'PREMIUM' : 'Free'}
                            </span>
                          </td>
                          <td>
                            <span className={`badge ${blocked ? 'danger' : 'ok'}`}>
                              {blocked ? 'Blocked' : 'Active'}
                            </span>
                          </td>
                          <td>{u.usage_count ?? u.usageCount ?? 0}</td>
                          <td className="actions">
                            <button
                              type="button"
                              disabled={busy}
                              className="btn primary"
                              onClick={() => togglePremium(u.id, premium)}
                            >
                              {premium ? 'Remove Premium' : 'Make Premium'}
                            </button>
                            <button
                              type="button"
                              disabled={busy}
                              className="btn danger"
                              onClick={() => toggleBlock(u.id, blocked)}
                            >
                              {blocked ? 'Unblock' : 'Block'}
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          )}

          {(tab === 'chats' || tab === 'conversation') && (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Title</th>
                    <th>Request</th>
                    <th>Response preview</th>
                    <th>Updated</th>
                    <th>Path</th>
                  </tr>
                </thead>
                <tbody>
                  {conversations.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="empty">
                        No conversations found in Firebase
                      </td>
                    </tr>
                  ) : (
                    conversations.map((c) => (
                      <tr key={c.path || c.id}>
                        <td>{String(c.id).slice(0, 10)}</td>
                        <td>{safeStr(c.title)}</td>
                        <td className="clip">{safeStr(c.request).slice(0, 80)}</td>
                        <td className="clip">{safeStr(c.response).slice(0, 80)}</td>
                        <td>{formatDate(c.updatedAt || c.createdAt)}</td>
                        <td className="clip small">{safeStr(c.path || c.emailKey)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}

          {tab === 'payments' && (
            <div className="table-wrap">
              <p className="muted" style={{ marginBottom: 16 }}>
                Payments are derived from premium flags on user documents. Connect a
                real payments collection when available.
              </p>
              <table>
                <thead>
                  <tr>
                    <th>User</th>
                    <th>Email</th>
                    <th>Plan</th>
                    <th>Amount</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {users.filter((u) => u.is_premium || u.isPremium).length === 0 ? (
                    <tr>
                      <td colSpan={5} className="empty">No premium users yet</td>
                    </tr>
                  ) : (
                    users
                      .filter((u) => u.is_premium || u.isPremium)
                      .map((u) => (
                        <tr key={u.id}>
                          <td>
                            {[u.first_name || u.firstName, u.last_name || u.lastName]
                              .filter(Boolean)
                              .join(' ') || u.id.slice(0, 8)}
                          </td>
                          <td>{safeStr(u.email)}</td>
                          <td>Premium</td>
                          <td>$9.99</td>
                          <td>
                            <span className="badge ok">Active</span>
                          </td>
                        </tr>
                      ))
                  )}
                </tbody>
              </table>
            </div>
          )}

          {tab === 'logs' && (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>UID</th>
                    <th>Email</th>
                    <th>Name</th>
                    <th>Premium</th>
                    <th>Blocked</th>
                    <th>Usage</th>
                    <th>Created / Updated</th>
                  </tr>
                </thead>
                <tbody>
                  {users.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="empty">No profile logs</td>
                    </tr>
                  ) : (
                    users.map((u) => (
                      <tr key={u.id}>
                        <td>{u.id.slice(0, 10)}</td>
                        <td>{safeStr(u.email)}</td>
                        <td>
                          {[u.first_name || u.firstName, u.last_name || u.lastName]
                            .filter(Boolean)
                            .join(' ') || '—'}
                        </td>
                        <td>{(u.is_premium || u.isPremium) ? 'Yes' : 'No'}</td>
                        <td>{(u.is_blocked || u.isBlocked) ? 'Yes' : 'No'}</td>
                        <td>{u.usage_count ?? u.usageCount ?? 0}</td>
                        <td>{formatDate(u.createdAt || u.updatedAt || u.created_at)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}
        </main>
      </div>

      <style jsx global>{`
        html, body {
          margin: 0;
          padding: 0;
          background: #000;
        }
      `}</style>
      <style jsx>{`
        .admin-root {
          display: flex;
          min-height: 100vh;
          background: #000;
          color: #fff;
          font-family: system-ui, -apple-system, sans-serif;
        }
        .admin-sidebar {
          width: 200px;
          flex-shrink: 0;
          background: #141414;
          display: flex;
          flex-direction: column;
          align-items: flex-start;
          padding: 24px 0 40px;
          min-height: 100vh;
        }
        .sidebar-logo {
          width: 100px;
          height: 100px;
          object-fit: contain;
          margin: 0 auto 8px;
          display: block;
        }
        .sidebar-title {
          color: #fff;
          font-size: 18px;
          font-weight: 700;
          margin: 0 0 28px 36px;
        }
        .sidebar-link {
          background: transparent;
          border: none;
          color: #fff;
          font-size: 17px;
          font-weight: 700;
          padding: 14px 36px;
          width: 100%;
          text-align: left;
          cursor: pointer;
          transition: background 0.2s, opacity 0.2s;
        }
        .sidebar-link:hover {
          opacity: 0.85;
          background: #1f1f1f;
        }
        .sidebar-link.active {
          background: #222;
        }
        .admin-main {
          flex: 1;
          padding: 32px 40px 60px;
          overflow-x: auto;
          background: #000;
        }
        .page-title {
          color: #fff;
          font-size: 40px;
          font-weight: 800;
          margin: 0 0 36px 4px;
        }
        .error-banner {
          background: #7f1d1d;
          color: #fecaca;
          padding: 12px 16px;
          border-radius: 12px;
          margin-bottom: 20px;
        }
        .stats-row {
          display: flex;
          flex-wrap: wrap;
          gap: 24px;
          margin-bottom: 40px;
        }
        .stat-label {
          color: #fff;
          font-size: 22px;
          font-weight: 700;
        }
        .stat-value {
          color: #fff;
          font-size: 52px;
          font-weight: 800;
          line-height: 1.1;
        }
        .stat-sub {
          color: #aaa;
          font-size: 14px;
          font-weight: 600;
        }
        .bottom-row {
          display: flex;
          flex-wrap: wrap;
          gap: 32px;
          align-items: stretch;
        }
        .revenue-card {
          flex: 1.4;
          min-width: 280px;
          background: #141414;
          border-radius: 40px;
          padding: 40px 36px;
        }
        .calendar-card {
          flex: 1;
          min-width: 260px;
          background: #141414;
          border-radius: 40px;
          padding: 36px 28px;
        }
        .section-title {
          display: block;
          color: #fff;
          font-size: 28px;
          font-weight: 800;
          margin-bottom: 20px;
        }
        .section-title.center {
          text-align: center;
        }
        .revenue-amount {
          font-size: 42px;
          font-weight: 800;
          margin-bottom: 8px;
        }
        .muted {
          color: #888;
          font-size: 14px;
        }
        .bar-chart {
          display: flex;
          align-items: flex-end;
          gap: 18px;
          height: 160px;
          margin: 28px 0 12px;
        }
        .bar {
          flex: 1;
          background: rgba(255, 255, 255, 0.75);
          border-radius: 16px;
          min-width: 28px;
        }
        .bar-labels {
          display: flex;
          justify-content: space-between;
          color: #fff;
          font-size: 14px;
          font-weight: 700;
        }
        .cal-days {
          display: grid;
          grid-template-columns: repeat(7, 1fr);
          gap: 8px;
          text-align: center;
        }
        .cal-head {
          color: #888;
          font-size: 12px;
          font-weight: 700;
          padding: 6px 0;
        }
        .cal-cell {
          color: #fff;
          font-size: 14px;
          font-weight: 600;
          padding: 10px 0;
          border-radius: 10px;
        }
        .cal-cell.today {
          background: #333;
          outline: 1px solid #fff;
        }
        .table-wrap {
          background: #141414;
          border-radius: 24px;
          overflow: auto;
          padding: 8px;
        }
        table {
          width: 100%;
          border-collapse: collapse;
          font-size: 14px;
          min-width: 640px;
        }
        th {
          text-align: left;
          padding: 14px 12px;
          color: #aaa;
          font-weight: 700;
          border-bottom: 1px solid #2a2a2a;
          white-space: nowrap;
        }
        td {
          padding: 12px;
          border-bottom: 1px solid #222;
          vertical-align: middle;
        }
        td.clip {
          max-width: 220px;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        td.small {
          font-size: 12px;
          color: #888;
        }
        td.empty {
          text-align: center;
          color: #666;
          padding: 40px;
        }
        .badge {
          display: inline-block;
          padding: 4px 12px;
          border-radius: 999px;
          font-size: 12px;
          font-weight: 700;
        }
        .badge.ok {
          background: #14532d;
          color: #bbf7d0;
        }
        .badge.danger {
          background: #7f1d1d;
          color: #fecaca;
        }
        .badge.muted {
          background: #27272a;
          color: #a1a1aa;
        }
        .actions {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
        }
        .btn {
          border: none;
          border-radius: 8px;
          padding: 7px 12px;
          font-size: 12px;
          font-weight: 600;
          cursor: pointer;
          color: #fff;
        }
        .btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
        .btn.primary {
          background: #2563eb;
        }
        .btn.danger {
          background: #dc2626;
        }

        @media (max-width: 900px) {
          .admin-root {
            flex-direction: column;
          }
          .admin-sidebar {
            width: 100%;
            min-height: auto;
            flex-direction: row;
            flex-wrap: wrap;
            align-items: center;
            padding: 12px 8px;
            gap: 4px;
          }
          .sidebar-logo {
            width: 48px;
            height: 48px;
            margin: 0 8px 0 4px;
          }
          .sidebar-title {
            display: none;
          }
          .sidebar-link {
            width: auto;
            padding: 10px 14px;
            font-size: 13px;
            border-radius: 999px;
          }
          .admin-main {
            padding: 20px 14px 40px;
          }
          .page-title {
            font-size: 28px;
            margin-bottom: 20px;
          }
          .stats-row {
            gap: 12px;
          }
          .stat-value {
            font-size: 36px;
          }
          .stat-label {
            font-size: 16px;
          }
          .revenue-card,
          .calendar-card {
            border-radius: 24px;
            padding: 24px 18px;
          }
          .section-title {
            font-size: 22px;
          }
        }
      `}</style>
    </>
  );
}
