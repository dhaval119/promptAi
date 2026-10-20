import { useEffect, useState, useCallback } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { useAuth } from '../lib/AuthContext';
import { sendPremiumEmail } from '../lib/premiumEmail';
import {
  collection,
  getDocs,
  doc,
  updateDoc,
  deleteDoc,
  query,
  orderBy,
  limit,
  collectionGroup,
  onSnapshot,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from '../lib/firebase';

/** Same key as lib/chatStorage.js – Firestore path safe email */
function emailKey(email) {
  if (!email || typeof email !== 'string') return null;
  return email.trim().toLowerCase().replace(/[^a-z0-9]/g, '_');
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


/** Date of a user's account / last activity (used by the calendar) */
function userDate(u) {
  const ts = u.created_at || u.createdAt || u.last_login_at || u.lastLoginAt;
  if (!ts) return null;
  try {
    const d = typeof ts?.toDate === 'function' ? ts.toDate() : new Date(ts);
    return Number.isNaN(d.getTime()) ? null : d;
  } catch {
    return null;
  }
}

/** "IN" -> "India" */
function countryName(code) {
  try {
    return new Intl.DisplayNames(['en'], { type: 'region' }).of(code) || code;
  } catch {
    return code;
  }
}

/** "IN" -> flag emoji (shows as letters on Windows, that is fine) */
function flagEmoji(code) {
  if (!code || code.length !== 2) return '';
  return String.fromCodePoint(...code.toUpperCase().split('').map((c) => 127397 + c.charCodeAt(0)));
}

function deviceLabel(d) {
  if (d === 'mobile') return 'Mobile';
  if (d === 'pc') return 'PC';
  return '—';
}

/** City + country text, no emoji */
function locationLabel(u) {
  const city = String(u.last_city || '').trim();
  const code = String(u.last_country || '').toUpperCase();
  const country = /^[A-Z]{2}$/.test(code) ? countryName(code) : '';
  if (city && country) return `${city}, ${country}`;
  if (city) return city;
  if (country) return country;
  return '—';
}

const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

export default function AdminPage() {
  const router = useRouter();
  const { user, profile, loading, isAdmin } = useAuth();
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
  const [sidebarHidden, setSidebarHidden] = useState(false);
  const [selectedDay, setSelectedDay] = useState(null); // 1-31 of the month shown in the calendar
  const [calMonth, setCalMonth] = useState(() => {
    const n = new Date();
    return { y: n.getFullYear(), m: n.getMonth() };
  });
  const [selectedChat, setSelectedChat] = useState(null); // chat opened in the detail popup
  const [chatDraft, setChatDraft] = useState(null); // admin edit mode for the open chat
  const [activityUserId, setActivityUserId] = useState(null); // user opened in "User Activity"
  const [activityLog, setActivityLog] = useState([]);

  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.replace('/login');
      return;
    }
    // Wait for profile so isAdmin is accurate
    if (profile && !isAdmin) {
      router.replace('/');
    }
  }, [user, profile, isAdmin, loading, router]);

  const loadData = useCallback(async () => {
    if (!user || !isAdmin || !db) return;
    setLoadError('');
    let list = [];
    let allChats = [];
    const warnings = [];

    // Users – independent try so one failure does not kill the whole dashboard
    try {
      const snap = await getDocs(collection(db, 'users'));
      list = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      setUsers(list);
    } catch (err) {
      console.warn('admin users load', err);
      const msg = err?.code === 'permission-denied' || /permission|insufficient/i.test(err?.message || '')
        ? 'Users: Firestore rules block read on "users". Allow admin read in Firebase Console → Firestore → Rules.'
        : (err?.message || 'Failed to load users');
      warnings.push(msg);
      setUsers([]);
    }

    // Conversations: load per-user (no collectionGroup / no parent list needed)
    // Paths used by chatStorage: conversations_by_email/{emailKey}/items and users/{uid}/conversations
    const seen = new Set();
    let chatErrors = 0;

    async function pullCol(colRef, meta) {
      if (!colRef) return;
      try {
        let snap;
        try {
          snap = await getDocs(query(colRef, orderBy('updatedAt', 'desc'), limit(40)));
        } catch {
          snap = await getDocs(query(colRef, limit(40)));
        }
        snap.docs.forEach((d) => {
          const key = d.ref.path;
          if (seen.has(key)) return;
          seen.add(key);
          allChats.push({
            id: d.id,
            path: key,
            ...d.data(),
            ...meta,
          });
        });
      } catch (e) {
        chatErrors += 1;
        console.warn('chat col failed', meta, e?.message || e);
      }
    }

    // From each known user
    for (const u of list) {
      const key = emailKey(u.email);
      if (key) {
        await pullCol(collection(db, 'conversations_by_email', key, 'items'), {
          emailKey: key,
          userEmail: u.email || '',
        });
      }
      if (u.id) {
        await pullCol(collection(db, 'users', u.id, 'conversations'), {
          uid: u.id,
          userEmail: u.email || '',
        });
      }
    }

    // Also try collectionGroup as optional boost (works only if rules allow)
    if (allChats.length === 0) {
      try {
        const cg = await getDocs(
          query(collectionGroup(db, 'items'), limit(100))
        );
        cg.docs.forEach((d) => {
          const key = d.ref.path;
          if (seen.has(key)) return;
          // only conversation-like paths
          if (!key.includes('conversations_by_email') && !key.includes('/conversations/')) return;
          seen.add(key);
          allChats.push({ id: d.id, path: key, ...d.data() });
        });
      } catch (e) {
        console.warn('collectionGroup optional failed', e?.message || e);
      }
    }

    // Sort newest first
    allChats.sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
    setConversations(allChats);

    if (list.length > 0 && allChats.length === 0 && chatErrors > 0) {
      warnings.push(
        'Chats: Firestore rules blocked conversation reads. Allow admin read on conversations_by_email/{email}/items and users/{uid}/conversations (see CHANGES_README).'
      );
    }

    const blocked = list.filter((u) => u.is_blocked || u.isBlocked).length;
    const premium = list.filter((u) => u.is_premium || u.isPremium).length;
    setStats({
      active: Math.max(0, list.length - blocked),
      totalUsers: list.length,
      blocked,
      chats: allChats.length,
      revenue: premium * 9.99,
    });

    if (warnings.length) setLoadError(warnings.join(' '));
  }, [user, isAdmin]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // LIVE: new signups / profile changes show up instantly + chats re-sync every 12s (no manual refresh)
  useEffect(() => {
    if (!user || !isAdmin || !db) return undefined;
    const unsub = onSnapshot(
      collection(db, 'users'),
      (snap) => {
        const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        setUsers(list);
        const blocked = list.filter((u) => u.is_blocked || u.isBlocked).length;
        const premium = list.filter((u) => u.is_premium || u.isPremium).length;
        setStats((st) => ({
          ...st,
          totalUsers: list.length,
          blocked,
          active: Math.max(0, list.length - blocked),
          revenue: premium * 9.99,
        }));
      },
      () => {}
    );
    const t = setInterval(() => {
      if (typeof document === 'undefined' || !document.hidden) loadData();
    }, 12000);
    return () => {
      unsub();
      clearInterval(t);
    };
  }, [user, isAdmin, loadData]);

  // Live activity timeline of the user opened in "User Activity"
  useEffect(() => {
    setActivityLog([]);
    if (!activityUserId || !db) return undefined;
    const unsub = onSnapshot(
      query(collection(db, 'users', activityUserId, 'activity'), orderBy('at', 'desc'), limit(200)),
      (snap) => setActivityLog(snap.docs.map((d) => ({ id: d.id, ...d.data() }))),
      () => {}
    );
    return () => unsub();
  }, [activityUserId]);

  useEffect(() => {
    setChatDraft(null);
  }, [selectedChat]);

  // Close the chat popup with Escape
  useEffect(() => {
    if (!selectedChat) return;
    const onKey = (e) => {
      if (e.key === 'Escape') setSelectedChat(null);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [selectedChat]);

  async function adminDeleteChat(c) {
    if (!db || busy || !c?.path) return;
    if (!window.confirm(`Delete this chat permanently?\n\n${c.title || c.request || c.id}`)) return;
    setBusy(true);
    try {
      // The same chat can exist in both the email-based and uid-based collection – delete every copy.
      const copies = conversations.filter(
        (x) => x.path === c.path || (x.id === c.id && (x.userEmail || '') === (c.userEmail || ''))
      );
      const paths = Array.from(new Set([c.path, ...copies.map((x) => x.path)]));
      for (const pth of paths) await deleteDoc(doc(db, pth));
      setConversations((prev) => prev.filter((x) => !paths.includes(x.path)));
      setSelectedChat(null);
    } catch (e) {
      console.error(e);
      alert('Delete failed. Check Firestore rules (admin must be allowed to delete chats).');
    } finally {
      setBusy(false);
    }
  }

  async function adminSaveChat(c, draft) {
    if (!db || busy || !c?.path || !draft) return;
    setBusy(true);
    try {
      const msgs = draft.msgs
        .map((m) => ({ sender: m.sender === 'user' ? 'user' : 'ai', text: String(m.text || '') }))
        .filter((m) => m.text.trim());
      const firstUser = msgs.find((m) => m.sender === 'user');
      const lastAi = [...msgs].reverse().find((m) => m.sender === 'ai');
      const payload = {
        title: draft.title || '',
        messages: msgs,
        request: firstUser ? firstUser.text : '',
        response: lastAi ? lastAi.text : '',
        updatedAt: Date.now(),
      };
      await updateDoc(doc(db, c.path), payload);
      const updated = { ...c, ...payload };
      setConversations((prev) => prev.map((x) => (x.path === c.path ? updated : x)));
      setSelectedChat(updated);
      setChatDraft(null);
    } catch (e) {
      console.error(e);
      alert('Save failed. Check Firestore rules (admin must be allowed to write chats).');
    } finally {
      setBusy(false);
    }
  }

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
      await updateDoc(
        doc(db, 'users', uid),
        current
          ? { is_premium: false }
          : { is_premium: true, premium_granted_at: serverTimestamp(), premium_source: 'admin' }
      );
      // Granting Premium -> tell the user (fire-and-forget)
      if (!current) sendPremiumEmail(user, uid);
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

  async function resetUsage(uid) {
    if (!db || busy) return;
    setBusy(true);
    try {
      await updateDoc(doc(db, 'users', uid), {
        usage_count: 0,
        last_reset: serverTimestamp(),
      });
      setUsers((prev) =>
        prev.map((u) => (u.id === uid ? { ...u, usage_count: 0 } : u))
      );
      alert('Daily usage reset to 0.');
    } catch (e) {
      console.error(e);
      alert('Reset failed. Check Firestore rules.');
    } finally {
      setBusy(false);
    }
  }

  async function deleteUser(uid, email) {
    if (!db || busy) return;
    const ok = window.confirm(
      `Permanently delete this user?\n\n${email || uid}\n\nThis cannot be undone.`
    );
    if (!ok) return;
    setBusy(true);
    try {
      await deleteDoc(doc(db, 'users', uid));
      setUsers((prev) => prev.filter((u) => u.id !== uid));
      setStats((s) => ({
        ...s,
        totalUsers: Math.max(0, (s.totalUsers || 1) - 1),
        active: Math.max(0, (s.active || 1) - 1),
      }));
    } catch (e) {
      console.error(e);
      alert('Delete failed. Check Firestore rules (admin must be allowed to delete users/{uid}).');
    } finally {
      setBusy(false);
    }
  }

  async function setUserRole(uid, role) {
    if (!db || busy) return;
    if (role !== 'admin' && role !== 'user') return;
    setBusy(true);
    try {
      await updateDoc(doc(db, 'users', uid), { role });
      setUsers((prev) =>
        prev.map((u) => (u.id === uid ? { ...u, role } : u))
      );
    } catch (e) {
      console.error(e);
      alert('Role update failed. Check Firestore rules.');
    } finally {
      setBusy(false);
    }
  }

  if (loading || !user || !profile || !isAdmin) {
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

  // Country graph data (from users.last_country, saved by lib/geoDevice.js)
  const countryCounts = {};
  let countryUnknown = 0;
  users.forEach((u) => {
    const c = String(u.last_country || '').toUpperCase();
    if (/^[A-Z]{2}$/.test(c)) countryCounts[c] = (countryCounts[c] || 0) + 1;
    else countryUnknown += 1;
  });
  const countryList = Object.entries(countryCounts).sort((a, b) => b[1] - a[1]);
  const topCountries = countryList.slice(0, 6);
  const maxCountry = topCountries.length ? topCountries[0][1] : 1;

  return (
    <>
      <Head>
        <title>PromptAI – Admin</title>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1" />
        <meta name="robots" content="noindex, nofollow" />
      </Head>

      <div className={`admin-root ${sidebarHidden ? "no-sidebar" : ""}`}>
        {sidebarHidden && (
          <button
            type="button"
            className="sidebar-open-btn"
            onClick={() => setSidebarHidden(false)}
            title="Open sidebar"
          >
            <img src="/assets/ailogo.png" alt="Open" />
          </button>
        )}
        {/* Sidebar */}
        <aside className={`admin-sidebar ${sidebarHidden ? 'hide' : ''}`}>
          <button
            type="button"
            className="sidebar-collapse-btn"
            onClick={() => setSidebarHidden(true)}
            title="Close sidebar"
            aria-label="Close sidebar"
          >
            ×
          </button>
          <img
            src="/assets/ailogo.png"
            alt="Logo"
            className="sidebar-logo"
            onClick={() => setSidebarHidden((h) => !h)}
            style={{ cursor: 'pointer' }}
          />
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
          <button
            type="button"
            className={`sidebar-link ${tab === 'activity' ? 'active' : ''}`}
            style={{ marginTop: 'auto' }}
            onClick={() => {
              setTab('activity');
              setActivityUserId(null);
            }}
          >
            User Activity
          </button>
        </aside>

        {/* Main */}
        <main className="admin-main">
          <h1 className="page-title">
            {tab === 'dashboard' && 'Dashboard'}
            {tab === 'users' && 'Users'}
            {tab === 'chats' && 'Chats'}
            {tab === 'payments' && 'Payments'}
                        {tab === 'logs' && 'User Profile Logs'}
            {tab === 'activity' && (activityUserId ? 'User Details' : 'User Activity')}
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
                  <span className="section-title">Visitors by Country</span>
                  <div className="revenue-amount">
                    {countryList.length} {countryList.length === 1 ? 'country' : 'countries'}
                  </div>
                  <p className="muted">
                    Based on where users last opened PromptAI from
                    {countryUnknown > 0 ? ` · ${countryUnknown} not tracked yet` : ''}
                  </p>
                  {topCountries.length === 0 ? (
                    <p className="muted" style={{ marginTop: 28 }}>
                      No country data yet. It fills in as users open the site.
                    </p>
                  ) : (
                    <>
                      <div className="bar-chart">
                        {topCountries.map(([code, count]) => (
                          <div key={code} className="bar-col" title={countryName(code) + ': ' + count}>
                            <span className="bar-count">{count}</span>
                            <div className="bar" style={{ height: Math.max(40, (count / maxCountry) * 120) }} />
                          </div>
                        ))}
                      </div>
                      <div className="country-labels">
                        {topCountries.map(([code]) => (
                          <span key={code} title={countryName(code)}>
                            {code}
                          </span>
                        ))}
                      </div>
                    </>
                  )}
                </div>

                {(() => {
                  const now = new Date();
                  const curY = now.getFullYear();
                  const curM = now.getMonth();
                  const year = calMonth.y;
                  const month = calMonth.m;
                  const isCurrent = year === curY && month === curM;
                  const daysInMonth = new Date(year, month + 1, 0).getDate();
                  const firstDow = new Date(year, month, 1).getDay();
                  const today = isCurrent ? now.getDate() : -1;

                  // oldest year that has any user (so you can jump back to it)
                  let minYear = curY - 1;
                  users.forEach((u) => {
                    const d = userDate(u);
                    if (d && d.getFullYear() < minYear) minYear = d.getFullYear();
                  });
                  const years = [];
                  for (let y = curY; y >= minYear; y--) years.push(y);

                  const counts = {};
                  users.forEach((u) => {
                    const d = userDate(u);
                    if (!d || d.getFullYear() !== year || d.getMonth() !== month) return;
                    counts[d.getDate()] = (counts[d.getDate()] || 0) + 1;
                  });
                  const dayUsers =
                    selectedDay != null
                      ? users.filter((u) => {
                          const d = userDate(u);
                          return d && d.getFullYear() === year && d.getMonth() === month && d.getDate() === selectedDay;
                        })
                      : [];

                  const goPrev = () => {
                    setSelectedDay(null);
                    setCalMonth((c) => (c.m === 0 ? { y: c.y - 1, m: 11 } : { y: c.y, m: c.m - 1 }));
                  };
                  const goNext = () => {
                    if (isCurrent) return; // past months only - no future
                    setSelectedDay(null);
                    setCalMonth((c) => (c.m === 11 ? { y: c.y + 1, m: 0 } : { y: c.y, m: c.m + 1 }));
                  };
                  const pickMonth = (m) => {
                    setSelectedDay(null);
                    setCalMonth((c) => ({ y: c.y, m }));
                  };
                  const pickYear = (y) => {
                    setSelectedDay(null);
                    setCalMonth((c) => ({ y, m: y === curY && c.m > curM ? curM : c.m }));
                  };

                  const cells = [];
                  for (let i = 0; i < firstDow; i++) {
                    cells.push(<span key={'e' + i} className="cal-cell empty" />);
                  }
                  for (let d = 1; d <= daysInMonth; d++) {
                    const c = counts[d] || 0;
                    const active = selectedDay === d;
                    cells.push(
                      <button
                        type="button"
                        key={d}
                        className={`cal-cell ${d === today ? 'today' : ''} ${active ? 'selected' : ''}`}
                        onClick={() => setSelectedDay(active ? null : d)}
                        title={c ? c + ' user(s)' : 'No users'}
                      >
                        <span className="cal-num">{d}</span>
                        {c > 0 && <span className="cal-count">{c}</span>}
                      </button>
                    );
                  }

                  return (
                    <div className="calendar-card">
                      <div className="cal-nav">
                        <button type="button" className="cal-arrow" onClick={goPrev} aria-label="Previous month">
                          &#8249;
                        </button>
                        <div className="cal-title-wrap">
                          <select className="cal-select" value={month} onChange={(e) => pickMonth(Number(e.target.value))} aria-label="Month">
                            {MONTH_NAMES.map((n, i) => (
                              <option key={n} value={i} disabled={year === curY && i > curM}>
                                {n}
                              </option>
                            ))}
                          </select>
                          <select className="cal-select" value={year} onChange={(e) => pickYear(Number(e.target.value))} aria-label="Year">
                            {years.map((y) => (
                              <option key={y} value={y}>
                                {y}
                              </option>
                            ))}
                          </select>
                        </div>
                        <button type="button" className="cal-arrow" onClick={goNext} disabled={isCurrent} aria-label="Next month">
                          &#8250;
                        </button>
                      </div>
                      {!isCurrent && (
                        <button
                          type="button"
                          className="cal-today"
                          onClick={() => {
                            setSelectedDay(null);
                            setCalMonth({ y: curY, m: curM });
                          }}
                        >
                          Back to this month
                        </button>
                      )}
                      <div className="cal-days">
                        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => (
                          <span key={d} className="cal-head">{d}</span>
                        ))}
                        {cells}
                      </div>
                      {selectedDay != null && (
                        <div className="cal-day-detail">
                          <strong>
                            {selectedDay} {MONTH_NAMES[month]} {year}
                          </strong>
                          <span> — {dayUsers.length} user(s)</span>
                          <ul className="cal-user-list">
                            {dayUsers.map((u) => (
                              <li key={u.id}>
                                {safeStr(
                                  [u.first_name || u.firstName, u.last_name || u.lastName].filter(Boolean).join(' ') || u.email,
                                  u.email || u.id
                                )}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  );
                })()}
              </div>
            </>
          )}

          {tab === 'users' && (
            <div className="table-wrap">
              <p className="scroll-hint">Swipe to see more →</p>
              <table>
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Name</th>
                    <th>Email</th>
                    <th>Premium</th>
                    <th>Status</th>
                    <th>Usage</th>
                    <th>Device</th>
                    <th>Location</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {users.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="empty">No users found</td>
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
                          <td>{deviceLabel(u.last_device)}</td>
                          <td>{locationLabel(u)}</td>
                          <td className="actions">
                            <button
                              type="button"
                              disabled={busy}
                              className="btn btn-premium"
                              onClick={() => togglePremium(u.id, premium)}
                            >
                              {premium ? 'Remove Premium' : 'Make Premium'}
                            </button>
                            <button
                              type="button"
                              disabled={busy}
                              className="btn btn-block"
                              onClick={() => toggleBlock(u.id, blocked)}
                            >
                              {blocked ? 'Unblock' : 'Block'}
                            </button>
                            <button
                              type="button"
                              disabled={busy}
                              className="btn btn-delete"
                              onClick={() => deleteUser(u.id, u.email)}
                            >
                              Delete
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

          {tab === 'chats' && (
            <div className="table-wrap">
              <p className="scroll-hint">Swipe to see more →</p>
              <p className="muted" style={{ margin: '4px 12px 10px' }}>Click any chat to see the full request and response.</p>
              <table>
                <thead>
                  <tr>
                    <th>User</th>
                    <th>Title</th>
                    <th>Request</th>
                    <th>Response preview</th>
                    <th>Updated</th>
                  </tr>
                </thead>
                <tbody>
                  {conversations.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="empty">
                        No conversations found in Firebase
                      </td>
                    </tr>
                  ) : (
                    conversations.map((c) => {
                      const userLabel =
                        c.userEmail ||
                        c.ownerEmail ||
                        c.email ||
                        c.userName ||
                        (c.uid ? String(c.uid).slice(0, 8) : '—');
                      return (
                        <tr
                          key={(c.path || '') + c.id}
                          className="row-click"
                          onClick={() => setSelectedChat(c)}
                          title="Click to open the full chat"
                        >
                          <td>{safeStr(userLabel)}</td>
                          <td>{safeStr(c.title)}</td>
                          <td className="clip">{safeStr(c.request).slice(0, 80)}</td>
                          <td className="clip">{safeStr(c.response).slice(0, 80)}</td>
                          <td>{formatDate(c.updatedAt || c.createdAt)}</td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          )}


          {selectedChat &&
            (() => {
              const c = selectedChat;
              const msgs = Array.isArray(c.messages) ? c.messages.filter((m) => m && (m.text || '').trim()) : [];
              const lastUser = [...msgs].reverse().find((m) => m.sender === 'user');
              const lastAi = [...msgs].reverse().find((m) => m.sender === 'ai');
              const reqText = (c.request || (lastUser && lastUser.text) || c.title || '').toString();
              const resText = (c.response || (lastAi && lastAi.text) || '').toString();
              const who = c.userEmail || c.ownerEmail || c.email || c.userName || (c.uid ? String(c.uid).slice(0, 8) : '—');
              const copy = (t) => {
                try {
                  navigator.clipboard.writeText(t);
                } catch {}
              };
              return (
                <div className="modal-back" onClick={() => setSelectedChat(null)}>
                  <div className="modal-card" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
                    <div className="modal-head">
                      <div style={{ minWidth: 0 }}>
                        <div className="modal-title">{safeStr(c.title, 'Untitled chat')}</div>
                        <div className="modal-sub">
                          {who} · {formatDate(c.updatedAt || c.createdAt)}
                        </div>
                      </div>
                      <button type="button" className="modal-x" onClick={() => setSelectedChat(null)} aria-label="Close">
                        &times;
                      </button>
                    </div>
                    <div className="modal-body">
                      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
                        {!chatDraft ? (
                          <button
                            type="button"
                            className="copy-btn"
                            onClick={() =>
                              setChatDraft({
                                title: c.title || '',
                                msgs: (msgs.length
                                  ? msgs
                                  : [
                                      { sender: 'user', text: reqText },
                                      { sender: 'ai', text: resText },
                                    ]
                                ).map((m) => ({ sender: m.sender, text: m.text || '' })),
                              })
                            }
                          >
                            Edit chat
                          </button>
                        ) : (
                          <>
                            <button type="button" className="copy-btn" disabled={busy} onClick={() => adminSaveChat(c, chatDraft)}>
                              Save changes
                            </button>
                            <button type="button" className="copy-btn" onClick={() => setChatDraft(null)}>
                              Cancel
                            </button>
                          </>
                        )}
                        <button type="button" className="copy-btn" disabled={busy} onClick={() => adminDeleteChat(c)} style={{ color: '#ff6b6b' }}>
                          Delete chat
                        </button>
                      </div>

                      {chatDraft && (
                        <div style={{ marginBottom: 16 }}>
                          <div className="modal-label"><span>Title</span></div>
                          <input
                            value={chatDraft.title}
                            onChange={(e) => setChatDraft({ ...chatDraft, title: e.target.value })}
                            style={{ width: '100%', boxSizing: 'border-box', padding: 10, borderRadius: 8, border: '1px solid #333', background: '#0d0d0d', color: '#fff', marginBottom: 12 }}
                          />
                          {chatDraft.msgs.map((m, i) => (
                            <div key={i} style={{ marginBottom: 10 }}>
                              <div className="modal-label">
                                <span>{m.sender === 'user' ? 'USER' : 'AI'} message {i + 1}</span>
                                <button
                                  type="button"
                                  className="copy-btn"
                                  onClick={() => setChatDraft({ ...chatDraft, msgs: chatDraft.msgs.filter((_, j) => j !== i) })}
                                >
                                  Remove
                                </button>
                              </div>
                              <textarea
                                value={m.text}
                                rows={4}
                                onChange={(e) => {
                                  const next = chatDraft.msgs.slice();
                                  next[i] = { ...next[i], text: e.target.value };
                                  setChatDraft({ ...chatDraft, msgs: next });
                                }}
                                style={{ width: '100%', boxSizing: 'border-box', padding: 10, borderRadius: 8, border: '1px solid #333', background: '#0d0d0d', color: '#fff', fontFamily: 'inherit' }}
                              />
                            </div>
                          ))}
                          <div style={{ display: 'flex', gap: 8 }}>
                            <button type="button" className="copy-btn" onClick={() => setChatDraft({ ...chatDraft, msgs: [...chatDraft.msgs, { sender: 'user', text: '' }] })}>+ User message</button>
                            <button type="button" className="copy-btn" onClick={() => setChatDraft({ ...chatDraft, msgs: [...chatDraft.msgs, { sender: 'ai', text: '' }] })}>+ AI message</button>
                          </div>
                        </div>
                      )}

                      {!chatDraft && (<>
                      <div className="modal-label">
                        <span>Request</span>
                        <button type="button" className="copy-btn" onClick={() => copy(reqText)}>Copy</button>
                      </div>
                      <pre className="modal-pre">{reqText || '—'}</pre>

                      <div className="modal-label">
                        <span>Response</span>
                        <button type="button" className="copy-btn" onClick={() => copy(resText)}>Copy</button>
                      </div>
                      <pre className="modal-pre">{resText || '—'}</pre>

                      {msgs.length > 2 && (
                        <>
                          <div className="modal-label">
                            <span>Full conversation ({msgs.length} messages)</span>
                          </div>
                          {msgs.map((m, i) => (
                            <div key={i} className={`modal-msg ${m.sender === 'user' ? 'from-user' : 'from-ai'}`}>
                              <span className="modal-who">{m.sender === 'user' ? 'USER' : 'AI'}</span>
                              <pre className="modal-pre small">{m.text}</pre>
                            </div>
                          ))}
                        </>
                      )}
                      </>)}
                    </div>
                  </div>
                </div>
              );
            })()}

          {tab === 'activity' && (() => {
            const fmt = (n) => (n ? new Date(n).toLocaleString() : '—');
            const chatsOf = (u) => conversations.filter((c) => (u.email && c.userEmail === u.email) || c.uid === u.id);
            const nameOf = (u) => [u.first_name || u.firstName, u.last_name || u.lastName].filter(Boolean).join(' ') || '—';
            const au = activityUserId ? users.find((x) => x.id === activityUserId) : null;
            if (!au) {
              const sorted = [...users].sort((a, b) => {
                const ta = a.last_seen_at?.toMillis ? a.last_seen_at.toMillis() : 0;
                const tb = b.last_seen_at?.toMillis ? b.last_seen_at.toMillis() : 0;
                return tb - ta;
              });
              return (
                <div className="table-wrap">
                  <p className="muted" style={{ margin: '4px 12px 10px' }}>Click a user to see everything about them. Updates live.</p>
                  <table>
                    <thead>
                      <tr><th>Name</th><th>Email</th><th>Location</th><th>Device</th><th>Last seen</th><th>Chats</th></tr>
                    </thead>
                    <tbody>
                      {sorted.length === 0 ? (
                        <tr><td colSpan={6} className="empty">No users yet</td></tr>
                      ) : (
                        sorted.map((u) => (
                          <tr key={u.id} className="row-click" onClick={() => setActivityUserId(u.id)}>
                            <td>{nameOf(u)}</td>
                            <td>{safeStr(u.email)}</td>
                            <td>{locationLabel(u)}</td>
                            <td>{deviceLabel(u.last_device)}</td>
                            <td>{formatDate(u.last_seen_at)}</td>
                            <td>{chatsOf(u).length}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              );
            }
            const uc = chatsOf(au);
            const icon = { login: 'LOGIN', chat_opened: 'OPENED', chat_deleted: 'DELETED', prompt_generated: 'PROMPT' };
            const sentence = (a) => {
              const t = a.title ? `"${a.title}"` : 'a chat';
              if (a.type === 'login') return `Logged in${[a.city, a.region, a.country].filter(Boolean).length ? ' from ' + [a.city, a.region, a.country].filter(Boolean).join(', ') : ''}${a.device ? ' (' + a.device + ')' : ''}`;
              if (a.type === 'chat_opened') return `Viewed chat ${t}`;
              if (a.type === 'chat_deleted') return `Deleted chat ${t}`;
              if (a.type === 'prompt_generated') return `Generated a prompt ${t}`;
              return a.type;
            };
            const box = { background: '#141414', border: '1px solid #262626', borderRadius: 12, padding: 14, minWidth: 180 };
            const lab = { fontSize: 11, letterSpacing: 1, color: '#888', textTransform: 'uppercase', marginBottom: 4 };
            return (
              <div style={{ padding: '0 4px 40px' }}>
                <button type="button" className="copy-btn" onClick={() => setActivityUserId(null)} style={{ marginBottom: 16 }}>← All users</button>
                <h2 style={{ margin: '0 0 4px' }}>{nameOf(au)}</h2>
                <p className="muted" style={{ marginTop: 0 }}>{safeStr(au.email)}</p>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, margin: '16px 0 24px' }}>
                  {[
                    ['Joined', formatDate(au.created_at || au.createdAt)],
                    ['Last seen', formatDate(au.last_seen_at)],
                    ['Last login', formatDate(au.last_login_at)],
                    ['Location', locationLabel(au)],
                    ['Device', deviceLabel(au.last_device)],
                    ['Signed up via', safeStr(au.signup_method || 'manual')],
                    ['Premium', (au.is_premium || au.isPremium) ? 'Yes' : 'No'],
                    ['Blocked', (au.is_blocked || au.isBlocked) ? 'Yes' : 'No'],
                    ['Usage today', String(au.usage_count ?? 0)],
                    ['Total chats', String(uc.length)],
                  ].map(([k, v]) => (
                    <div key={k} style={box}><div style={lab}>{k}</div><div style={{ fontWeight: 700 }}>{v}</div></div>
                  ))}
                </div>

                <h3>Chats ({uc.length})</h3>
                <div className="table-wrap" style={{ marginBottom: 24 }}>
                  <table>
                    <thead><tr><th>Title</th><th>Request</th><th>Updated</th></tr></thead>
                    <tbody>
                      {uc.length === 0 ? (
                        <tr><td colSpan={3} className="empty">No chats</td></tr>
                      ) : (
                        uc.map((c) => (
                          <tr key={(c.path || '') + c.id} className="row-click" onClick={() => setSelectedChat(c)}>
                            <td>{safeStr(c.title)}</td>
                            <td className="clip">{safeStr(c.request).slice(0, 90)}</td>
                            <td>{formatDate(c.updatedAt || c.createdAt)}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>

                <h3>Activity timeline (live)</h3>
                {activityLog.length === 0 ? (
                  <p className="muted">No activity recorded yet. Logins, chats opened, prompts and deletions appear here from now on.</p>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {activityLog.map((a) => (
                      <div key={a.id} style={{ ...box, display: 'flex', gap: 12, alignItems: 'center', padding: '10px 14px' }}>
                        <span style={{ fontSize: 11, fontWeight: 800, letterSpacing: 1, color: a.type === 'chat_deleted' ? '#ff6b6b' : '#a78bfa', minWidth: 74 }}>{icon[a.type] || 'EVENT'}</span>
                        <span style={{ flex: 1 }}>{sentence(a)}</span>
                        <span style={{ color: '#888', fontSize: 12 }}>{fmt(a.at)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })()}

          {tab === 'payments' && (
            <div className="table-wrap">
              <p className="muted" style={{ marginBottom: 16 }}>
                Payments are derived from premium flags on user documents. Connect a
                real payments collection when available.
              </p>
              <p className="scroll-hint">Swipe to see more →</p>
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
              <p className="scroll-hint">Swipe to see more →</p>
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
          position: sticky;
          top: 0;
          height: 100vh;
          overflow-y: auto;
          z-index: 40;
        }
        .admin-sidebar.hide {
          display: none;
        }
        .admin-root.no-sidebar .admin-main {
          width: 100%;
        }
        .sidebar-collapse-btn {
          position: absolute;
          top: 12px;
          right: 12px;
          background: transparent;
          border: none;
          color: #888;
          font-size: 22px;
          cursor: pointer;
          line-height: 1;
        }
        .sidebar-collapse-btn:hover {
          color: #fff;
        }
        .sidebar-open-btn {
          position: fixed;
          top: 16px;
          left: 16px;
          z-index: 50;
          width: 44px;
          height: 44px;
          border-radius: 50%;
          border: none;
          background: #141414;
          padding: 6px;
          cursor: pointer;
          box-shadow: 0 2px 12px rgba(0,0,0,0.5);
        }
        .sidebar-open-btn img {
          width: 100%;
          height: 100%;
          object-fit: contain;
        }
        .sidebar-logo {
          width: 50px;
          height: 50px;
          object-fit: contain;
          margin: 12px auto 80px;
          display: block;
          background: transparent;
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
        .bar-col {
          flex: 1;
          min-width: 28px;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: flex-end;
        }
        .bar-col .bar {
          width: 100%;
          flex: none;
        }
        .bar-count {
          color: #fff;
          font-size: 13px;
          font-weight: 800;
          margin-bottom: 6px;
        }
        .country-labels {
          display: flex;
          gap: 18px;
          color: #fff;
          font-size: 13px;
          font-weight: 700;
        }
        .country-labels span {
          flex: 1;
          min-width: 28px;
          text-align: center;
          white-space: nowrap;
        }
        .cal-nav {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
          margin-bottom: 14px;
        }
        .cal-title-wrap {
          display: flex;
          gap: 6px;
          align-items: center;
          justify-content: center;
          flex-wrap: wrap;
        }
        .cal-select {
          background: transparent;
          color: #fff;
          border: 0;
          font-size: 22px;
          font-weight: 800;
          font-family: inherit;
          cursor: pointer;
          outline: none;
          appearance: none;
          -webkit-appearance: none;
          padding: 2px 2px;
        }
        .cal-select option {
          background: #141414;
          color: #fff;
          font-size: 15px;
        }
        .cal-select option:disabled {
          color: #555;
        }
        .cal-arrow {
          width: 38px;
          height: 38px;
          border-radius: 50%;
          border: 1px solid #333;
          background: #1d1d1d;
          color: #fff;
          font-size: 22px;
          line-height: 1;
          cursor: pointer;
          flex: none;
        }
        .cal-arrow:hover:not(:disabled) {
          background: #fff;
          color: #000;
        }
        .cal-arrow:disabled {
          opacity: 0.25;
          cursor: not-allowed;
        }
        .cal-today {
          display: block;
          margin: -4px auto 12px;
          background: transparent;
          border: 1px solid #333;
          color: #ccc;
          font-size: 12px;
          font-weight: 700;
          border-radius: 50px;
          padding: 6px 14px;
          cursor: pointer;
        }
        .cal-today:hover {
          background: #fff;
          color: #000;
        }
        tr.row-click {
          cursor: pointer;
        }
        tr.row-click:hover td {
          background: #1b1b1b;
        }
        .modal-back {
          position: fixed;
          inset: 0;
          z-index: 9999;
          background: rgba(0, 0, 0, 0.72);
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 20px;
        }
        .modal-card {
          width: 760px;
          max-width: 100%;
          max-height: 88vh;
          display: flex;
          flex-direction: column;
          background: #141414;
          border: 1px solid #2a2a2a;
          border-radius: 24px;
          overflow: hidden;
        }
        .modal-head {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 16px;
          padding: 22px 26px 16px;
          border-bottom: 1px solid #2a2a2a;
        }
        .modal-title {
          font-size: 22px;
          font-weight: 800;
          color: #fff;
          word-break: break-word;
        }
        .modal-sub {
          margin-top: 4px;
          font-size: 13px;
          color: #888;
          word-break: break-all;
        }
        .modal-x {
          background: #1d1d1d;
          border: 1px solid #333;
          color: #fff;
          width: 36px;
          height: 36px;
          border-radius: 50%;
          font-size: 22px;
          line-height: 1;
          cursor: pointer;
          flex: none;
        }
        .modal-body {
          padding: 18px 26px 26px;
          overflow: auto;
        }
        .modal-label {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin: 16px 0 8px;
          font-size: 12px;
          font-weight: 800;
          letter-spacing: 1px;
          text-transform: uppercase;
          color: #a78bfa;
        }
        .copy-btn {
          background: transparent;
          border: 1px solid #333;
          color: #ccc;
          font-size: 12px;
          font-weight: 700;
          border-radius: 50px;
          padding: 4px 12px;
          cursor: pointer;
        }
        .copy-btn:hover {
          background: #fff;
          color: #000;
        }
        .modal-pre {
          margin: 0;
          padding: 14px 16px;
          background: #0c0c0c;
          border: 1px solid #222;
          border-radius: 14px;
          color: #e8e8e8;
          font-family: inherit;
          font-size: 14px;
          line-height: 1.55;
          white-space: pre-wrap;
          word-break: break-word;
          max-height: 300px;
          overflow: auto;
        }
        .modal-pre.small {
          max-height: 220px;
          font-size: 13px;
        }
        .modal-msg {
          margin-top: 10px;
        }
        .modal-who {
          display: inline-block;
          margin-bottom: 4px;
          font-size: 11px;
          font-weight: 800;
          letter-spacing: 1px;
          color: #888;
        }
        .modal-msg.from-user .modal-who {
          color: #a78bfa;
        }
        .table-wrap {
          background: #141414;
          border-radius: 24px;
          overflow: auto;
          -webkit-overflow-scrolling: touch;
          padding: 8px;
        }
        .scroll-hint {
          display: none;
          color: #888;
          font-size: 12px;
          font-weight: 600;
          margin: -6px 4px 10px;
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
          background: #2a2a2a;
          transition: background 0.2s, color 0.2s;
        }
        .btn:hover:not(:disabled) {
          background: #3a3a3a;
        }
        .btn.btn-premium {
          background: #2a2a2a;
          color: #e5e5e5;
        }
        .btn.btn-premium:hover:not(:disabled) {
          background: #2563eb;
          color: #fff;
        }
        .btn.btn-block {
          background: #2a2a2a;
          color: #e5e5e5;
        }
        .btn.btn-block:hover:not(:disabled) {
          background: #dc2626;
          color: #fff;
        }
        .btn.btn-delete {
          background: #2a2a2a;
          color: #e5e5e5;
        }
        .btn.btn-delete:hover:not(:disabled) {
          background: #b91c1c;
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
          .scroll-hint {
            display: block;
          }
          table {
            font-size: 12px;
            min-width: 560px;
          }
          th,
          td {
            padding: 10px 8px;
          }
          .actions {
            flex-direction: column;
            gap: 6px;
          }
          .btn {
            width: 100%;
            padding: 9px 12px;
            min-height: 34px;
            font-size: 12px;
          }
        }
      .cal-cell {
          border: none;
          background: transparent;
          color: #fff;
          cursor: pointer;
          position: relative;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          min-height: 36px;
          border-radius: 8px;
          font: inherit;
        }
        .cal-cell:hover {
          background: #222;
        }
        .cal-cell.selected {
          background: #333;
          outline: 1px solid #555;
        }
        .cal-cell.today {
          outline: 1px solid #666;
        }
        .cal-cell.empty {
          pointer-events: none;
        }
        .cal-count {
          font-size: 10px;
          color: #8cf;
          font-weight: 700;
        }
        .cal-day-detail {
          margin-top: 16px;
          padding-top: 12px;
          border-top: 1px solid #333;
          font-size: 14px;
        }
        .cal-user-list {
          margin: 8px 0 0;
          padding-left: 18px;
          color: #ccc;
        }
        .admin-sidebar {
          /* relative for collapse btn positioning */
        }
      `}</style>
    </>
  );
}
