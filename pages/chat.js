import { useEffect, useRef, useState, useCallback } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import {
  listConversations,
  getConversation,
  upsertConversation,
  deleteConversation,
} from '../lib/chatStorage';
import { useAuth } from '../lib/AuthContext';
import NavPill from '../components/NavPill';

const DAILY_FREE_LIMIT = 3;

function getTodayKey() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function getUsageKey(uid) {
  return `chat_daily_usage_${uid || 'guest'}_${getTodayKey()}`;
}

function getTodayUsage(uid) {
  if (typeof window === 'undefined') return 0;
  try {
    const raw = localStorage.getItem(getUsageKey(uid));
    const n = parseInt(raw, 10);
    return Number.isFinite(n) && n >= 0 ? n : 0;
  } catch {
    return 0;
  }
}

function incrementTodayUsage(uid) {
  if (typeof window === 'undefined') return;
  try {
    const current = getTodayUsage(uid);
    localStorage.setItem(getUsageKey(uid), String(current + 1));
  } catch {}
}

// ChatGPT-style word-by-word typewriter
async function typeWriter(fullText, onUpdate, signal) {
  const words = fullText.split(/(\s+)/);
  let current = '';
  for (let i = 0; i < words.length; i++) {
    if (signal?.aborted) return;
    current += words[i];
    onUpdate(current);
    await new Promise((r) => setTimeout(r, words[i].trim() ? 28 : 8));
  }
}

export default function Chat() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const uid = user?.uid ?? null;
  const email = user?.email ?? null;

  const [chats, setChats] = useState([]);
  const [currentChatId, setCurrentChatId] = useState(0);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [sidebarHidden, setSidebarHidden] = useState(false);
  const [copiedIdx, setCopiedIdx] = useState(-1);
  const [chatsReady, setChatsReady] = useState(false);
  const [showLimitModal, setShowLimitModal] = useState(false);
  const [todayUsage, setTodayUsage] = useState(0);
  const [kbOffset, setKbOffset] = useState(0);
  const [sharedIdx, setSharedIdx] = useState(-1);

  const threadRef = useRef(null);
  const inputRef = useRef(null);
  const abortRef = useRef(null);

  useEffect(() => {
    if (typeof window === 'undefined' || !window.visualViewport) return;
    const vv = window.visualViewport;
    const update = () => {
      const offset = Math.max(0, window.innerHeight - vv.height - (vv.offsetTop || 0));
      setKbOffset(offset > 40 ? offset : 0);
    };
    vv.addEventListener('resize', update);
    vv.addEventListener('scroll', update);
    update();
    return () => {
      vv.removeEventListener('resize', update);
      vv.removeEventListener('scroll', update);
    };
  }, []);

  useEffect(() => {
    if (authLoading) return;
    setTodayUsage(getTodayUsage(uid));
  }, [uid, authLoading]);

  const refreshChats = useCallback(async () => {
    try {
      const list = await listConversations(uid, email);
      setChats(Array.isArray(list) ? list : []);
    } catch (err) {
      console.error('[chat] listConversations failed', err);
      setChats([]);
    } finally {
      setChatsReady(true);
    }
  }, [uid, email]);

  useEffect(() => {
    if (authLoading) return;
    refreshChats();
    if (typeof window !== 'undefined' && window.innerWidth <= 900) {
      setSidebarHidden(true);
    }
  }, [authLoading, refreshChats]);

  useEffect(() => {
    if (!router.isReady || authLoading) return;

    const idParam = router.query.chat_id;
    if (!idParam) {
      setCurrentChatId(0);
      setMessages([]);
      return;
    }

    let cancelled = false;
    (async () => {
      try {
        const conv = await getConversation(uid, idParam, email);
        if (cancelled) return;
        if (!conv) {
          setCurrentChatId(0);
          setMessages([]);
          return;
        }
        setCurrentChatId(conv.id);
        // Multi-turn: if history stored as messages array use it, else fall back to single pair
        if (Array.isArray(conv.messages) && conv.messages.length > 0) {
          setMessages(conv.messages);
        } else {
          setMessages([
            { sender: 'user', text: conv.request },
            ...(conv.response ? [{ sender: 'ai', text: conv.response }] : []),
          ]);
        }
      } catch (err) {
        console.error('[chat] getConversation failed', err);
        setMessages([]);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [router.isReady, router.query.chat_id, uid, email, authLoading]);

  useEffect(() => {
    if (threadRef.current) {
      threadRef.current.scrollTop = threadRef.current.scrollHeight;
    }
  }, [messages, loading]);

  useEffect(() => {
    if (showLimitModal) {
      inputRef.current?.blur();
      setKbOffset(0);
    }
  }, [showLimitModal]);

  function startNewChat() {
    if (abortRef.current) abortRef.current.abort();
    setCurrentChatId(0);
    setMessages([]);
    router.replace('/chat', undefined, { shallow: true });
    setTimeout(() => inputRef.current?.focus(), 50);
  }

  async function openChat(id) {
    try {
      const conv = await getConversation(uid, id, email);
      if (!conv) return;

      setCurrentChatId(conv.id);
      if (Array.isArray(conv.messages) && conv.messages.length > 0) {
        setMessages(conv.messages);
      } else {
        setMessages([
          { sender: 'user', text: conv.request },
          ...(conv.response ? [{ sender: 'ai', text: conv.response }] : []),
        ]);
      }
      router.replace(`/chat?chat_id=${conv.id}`, undefined, { shallow: true });
    } catch (err) {
      console.error('[chat] openChat failed', err);
    }
  }

  async function handleDeleteChat(e, id) {
    e.preventDefault();
    e.stopPropagation();
    if (!window.confirm('Delete this chat?')) return;
    try {
      await deleteConversation(uid, id, email);
      if (String(currentChatId) === String(id)) {
        startNewChat();
      }
      await refreshChats();
    } catch (err) {
      console.error('[chat] delete failed', err);
    }
  }

  function sharePrompt(text, idx) {
    const url =
      typeof window !== 'undefined'
        ? `${window.location.origin}/chat?chat_id=${currentChatId || ''}`
        : '';
    const shareText = text + (url ? `\n\n${url}` : '');
    if (navigator.share) {
      navigator.share({ text: shareText }).catch(() => {
        navigator.clipboard.writeText(shareText);
        setSharedIdx(idx);
        setTimeout(() => setSharedIdx(-1), 2000);
      });
    } else {
      navigator.clipboard.writeText(shareText);
      setSharedIdx(idx);
      setTimeout(() => setSharedIdx(-1), 2000);
    }
  }

  function exportAsTxt() {
    if (messages.length === 0) return;
    let content = 'Chat Export\n' + '='.repeat(40) + '\n\n';
    messages.forEach((m) => {
      content += (m.sender === 'user' ? 'You: ' : 'AI: ') + m.text + '\n\n';
    });
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `chat-${currentChatId || 'new'}-${Date.now()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const MAX_MESSAGE_LENGTH = 2000;

  async function sendMessage(overrideText) {
    const text = (overrideText ?? input).trim().slice(0, MAX_MESSAGE_LENGTH);
    if (!text || loading) return;

    const used = getTodayUsage(uid);
    if (used >= DAILY_FREE_LIMIT) {
      setTodayUsage(used);
      inputRef.current?.blur();
      setShowLimitModal(true);
      return;
    }

    // Multi-turn: append user message, keep previous history
    setMessages((prev) => [...prev, { sender: 'user', text }]);
    setInput('');
    setLoading(true);
    inputRef.current?.blur();

    // Abort previous typewriter if any
    if (abortRef.current) abortRef.current.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ msg: text }),
      });

      const data = await res.json();
      const aiText = data.text || 'Something went wrong. Please try again.';

      // Add empty AI message then typewriter into it
      setMessages((prev) => [...prev, { sender: 'ai', text: '' }]);
      setLoading(false);

      await typeWriter(
        aiText,
        (partial) => {
          setMessages((prev) => {
            const next = [...prev];
            const last = next[next.length - 1];
            if (last && last.sender === 'ai') {
              next[next.length - 1] = { ...last, text: partial };
            }
            return next;
          });
        },
        controller.signal
      );

      incrementTodayUsage(uid);
      setTodayUsage((prev) => prev + 1);

      // Build full messages for multi-turn persistence
      const finalMessages = [
        ...messages,
        { sender: 'user', text },
        { sender: 'ai', text: aiText },
      ];

      const saved = await upsertConversation(
        uid,
        {
          id: currentChatId || null,
          title: data.title || text.slice(0, 45),
          request: text,
          response: aiText,
          messages: finalMessages, // multi-turn history
        },
        email
      );

      setCurrentChatId(saved.id);
      await refreshChats();
      router.replace(`/chat?chat_id=${saved.id}`, undefined, { shallow: true });
    } catch (err) {
      if (err.name === 'AbortError') return;
      console.error('[chat] sendMessage failed', err);
      setMessages((prev) => [
        ...prev,
        { sender: 'ai', text: 'Network error. Please try again.' },
      ]);
      setLoading(false);
    }
  }

  function copyPrompt(text, idx) {
    navigator.clipboard.writeText(text).then(() => {
      setCopiedIdx(idx);
      setTimeout(() => setCopiedIdx(-1), 2000);
    });
  }

  const isLanding = messages.length === 0;

  return (
    <>
      <Head>
        <title>AI Chat Interface</title>
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1, maximum-scale=1, viewport-fit=cover"
        />
      </Head>

      <div className="desktop">
        <div className="nav-desktop-only">
          <NavPill />
        </div>

        <img
          src="/assets/ailogo.png"
          alt="AI Logo"
          className="logo-main"
          onClick={() => setSidebarHidden((h) => !h)}
        />

        <img
          src="/assets/login.png"
          alt="Profile"
          className="login-icon-mobile"
          onClick={() => router.push('/details')}
        />

        <aside className={`sidebar ${sidebarHidden ? 'hide' : ''}`}>
          <nav className="sidebar-nav">
            <button className="new-chat" onClick={startNewChat}>
              New chat
            </button>

            <h2 className="chats-heading">Recent</h2>

            <ul className="sidebar-list">
              {!chatsReady ? (
                <li className="sidebar-item empty">Loading...</li>
              ) : chats.length === 0 ? (
                <li className="sidebar-item empty">No recent chats</li>
              ) : (
                chats.map((c) => (
                  <li className="sidebar-item" key={c.id}>
                    <a
                      className={`sidebar-link ${
                        String(currentChatId) === String(c.id) ? 'active' : ''
                      }`}
                      onClick={(e) => {
                        e.preventDefault();
                        openChat(c.id);
                      }}
                      href={`/chat?chat_id=${c.id}`}
                    >
                      <span className="sidebar-title">{c.title}</span>
                      <button
                        className="sidebar-delete"
                        title="Delete chat"
                        onClick={(e) => handleDeleteChat(e, c.id)}
                      >
                        ×
                      </button>
                    </a>
                  </li>
                ))
              )}
            </ul>
          </nav>
        </aside>

        <main
          className={`main-content ${
            isLanding ? 'view-landing' : 'view-chat'
          } ${sidebarHidden ? 'no-sidebar' : ''}`}
        >
          <div className="landing-content">
            <h1 className="main-heading">Where should we begin?</h1>

            <div className="suggestion-buttons">
              <button
                className="suggestion-button"
                onClick={() => sendMessage('Leave application email')}
              >
                <span>Leave application email</span>
                <img
                  src="/assets/arrow2.png"
                  className="suggestion-arrow arrow-normal"
                  alt=""
                />
                <img
                  src="/assets/arrow.png"
                  className="suggestion-arrow arrow-hover"
                  alt=""
                />
              </button>

              <button
                className="suggestion-button suggestion-middle"
                onClick={() => sendMessage('Professional resume for')}
              >
                <span>Professional resume for</span>
                <img
                  src="/assets/arrow2.png"
                  className="suggestion-arrow arrow-normal"
                  alt=""
                />
                <img
                  src="/assets/arrow.png"
                  className="suggestion-arrow arrow-hover"
                  alt=""
                />
              </button>

              <button
                className="suggestion-button"
                onClick={() => sendMessage('Make website for Store')}
              >
                <span>Make website for Store</span>
                <img
                  src="/assets/arrow2.png"
                  className="suggestion-arrow arrow-normal"
                  alt=""
                />
                <img
                  src="/assets/arrow.png"
                  className="suggestion-arrow arrow-hover"
                  alt=""
                />
              </button>
            </div>
          </div>

          <article className="conversation-thread" ref={threadRef}>
            {messages.map((m, i) =>
              m.sender === 'user' ? (
                <div className="user-message" key={i}>
                  {m.text}
                </div>
              ) : (
                <section className="ai-group" key={i}>
                  <h2 className="ai-heading">Generated Prompt:</h2>

                  <p className="ai-prompt">{m.text}</p>

                  {m.text ? (
                    <div className="action-row">
                      <button
                        className="action-btn"
                        onClick={() => copyPrompt(m.text, i)}
                        title="Copy Prompt"
                      >
                        <span className="action-text">
                          {copiedIdx === i ? 'Copied!' : 'copy'}
                        </span>
                        <img
                          src="/assets/copy.png"
                          className="action-icon"
                          alt="copy"
                        />
                      </button>

                      <button
                        className="action-btn"
                        title="Share prompt"
                        onClick={() => sharePrompt(m.text, i)}
                      >
                        <span className="action-text">
                          {sharedIdx === i ? 'Shared!' : 'share'}
                        </span>
                      </button>

                      <button
                        className="action-btn"
                        title="Export as TXT"
                        onClick={exportAsTxt}
                      >
                        <span className="action-text">export</span>
                      </button>

                      <button
                        className="action-btn"
                        title="Open in ChatGPT"
                        onClick={() => {
                          navigator.clipboard.writeText(m.text).then(() => {
                            const url =
                              'https://chatgpt.com/?q=' +
                              encodeURIComponent(m.text);
                            window.open(url, '_blank', 'noopener,noreferrer');
                          });
                        }}
                      >
                        <span className="action-text">Open in</span>
                        <img
                          src="/assets/chatgpt.png"
                          className="action-icon"
                          alt="ChatGPT"
                        />
                      </button>

                      <button
                        className="action-btn"
                        title="Open in Claude"
                        onClick={() => {
                          navigator.clipboard.writeText(m.text).then(() => {
                            window.open(
                              'https://claude.ai/new',
                              '_blank',
                              'noopener,noreferrer'
                            );
                          });
                        }}
                      >
                        <span className="action-text">Open in</span>
                        <img
                          src="/assets/claude.svg"
                          className="action-icon"
                          alt="Claude"
                        />
                      </button>
                    </div>
                  ) : null}
                </section>
              )
            )}

            {/* Skeleton loading effect */}
            {loading ? (
              <div className="ai-group skeleton-group">
                <div className="skeleton-line sk-title" />
                <div className="skeleton-box">
                  <div className="skeleton-line" />
                  <div className="skeleton-line" />
                  <div className="skeleton-line sk-short" />
                </div>
              </div>
            ) : null}
          </article>

          <div
            className="chat-input-form"
            style={
              kbOffset > 0
                ? { bottom: `${kbOffset + 6}px`, top: 'auto' }
                : undefined
            }
          >
            <div className="chat-input-wrapper">
              <input
                type="text"
                className="chat-input"
                placeholder="Ask anything..."
                autoComplete="off"
                ref={inputRef}
                value={input}
                maxLength={MAX_MESSAGE_LENGTH}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    sendMessage();
                  }
                }}
                disabled={loading}
              />

              <button
                className="chat-submit-button"
                onClick={() => sendMessage()}
              >
                <img
                  src="/assets/send.png"
                  alt="Send"
                  className="chat-submit-icon"
                />
              </button>
            </div>
          </div>
        </main>

        {showLimitModal && (
          <div className="limit-fullscreen">
            <button
              className="limit-close-btn"
              onClick={() => setShowLimitModal(false)}
              aria-label="Close"
            >
              ×
            </button>

            <div className="limit-badge">
              <span className="limit-red-dot" />
              <span className="limit-badge-text">
                Free Limit Exhausted ({DAILY_FREE_LIMIT}/{DAILY_FREE_LIMIT})
              </span>
            </div>

            <div className="limit-content limit-content-desktop">
              <div className="limit-left">
                <img
                  src="/assets/dog1.png"
                  alt="Doge"
                  className="limit-dog"
                />
              </div>

              <div className="limit-right">
                <h1 className="limit-title">
                  Wow. Much Limit.
                  <br />
                  Very Exhausted.
                </h1>

                <p className="limit-desc">
                  Limit Reached! Much sad. Ready to upgrade? Well,
                  joke&apos;s on you! The developer spent all his time
                  making this UI look pixel-perfect and completely
                  forgot to build a payment gateway. The &apos;Premium&apos;
                  version is still cooking.
                </p>

                <p className="limit-hint">
                  Patience is a virtue. But if you have zero patience,
                  <br />
                  go bother the dev for a bypass code.
                </p>

                <button
                  className="limit-btn"
                  onClick={() => {
                    window.open(
                      'mailto:dev@example.com?subject=Bypass%20Code%20Please',
                      '_blank'
                    );
                  }}
                >
                  Wake the Dev
                </button>
              </div>
            </div>

            <div className="limit-content-mobile">
              <div className="limit-mobile-inner">
                <div className="limit-mobile-img-wrap">
                  <img
                    src="/assets/dog1.png"
                    alt="Doge"
                    className="limit-mobile-dog"
                  />
                </div>

                <h1 className="limit-mobile-title">
                  Wow. Much Limit.
                  <br />
                  Very Exhausted.
                </h1>

                <p className="limit-mobile-desc">
                  Limit Reached! Much sad. Ready to upgrade? Well, joke&apos;s
                  on you! The developer spent all his time making this UI look
                  pixel-perfect and completely forgot to build a payment
                  gateway. The &apos;Premium&apos; version is still cooking.
                </p>

                <p className="limit-mobile-hint">
                  Patience is a virtue. But if you have zero patience,
                  <br />
                  go bother the dev for a bypass code.
                </p>

                <button
                  className="limit-mobile-btn"
                  onClick={() => {
                    window.open(
                      'mailto:dev@example.com?subject=Bypass%20Code%20Please',
                      '_blank'
                    );
                  }}
                >
                  Wake the Dev
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      <style jsx global>{`
        html,
        body {
          background: #000;
          overflow: hidden;
          margin: 0;
          padding: 0;
        }
      `}</style>

      <style jsx>{`
        .desktop {
          position: relative;
          width: 100%;
          height: 100vh;
          height: 100dvh;
          background: #000;
          overflow: hidden;
        }

        .nav-desktop-only {
          display: block;
        }

        .logo-main {
          height: 50px;
          width: 50px;
          display: block;
          position: fixed;
          left: 26px;
          top: 23px;
          z-index: 100;
          cursor: pointer;
        }

        .login-icon-mobile {
          display: none;
        }

        .sidebar {
          position: fixed;
          top: 0;
          left: 0;
          width: 250px;
          height: 100%;
          background: #0e0e0e;
          transition: transform 0.4s ease;
          z-index: 30;
        }

        .sidebar.hide {
          transform: translateX(-250px);
        }

        .sidebar-nav {
          position: absolute;
          top: 120px;
          left: 25px;
          right: 10px;
          bottom: 20px;
          overflow-y: auto;
          -webkit-overflow-scrolling: touch;
        }

        .new-chat {
          color: #fff;
          font-weight: 700;
          font-size: 18px;
          background: none;
          border: none;
          cursor: pointer;
          margin-bottom: 40px;
          text-align: left;
          padding: 0;
        }

        .chats-heading {
          color: #fff;
          opacity: 0.75;
          font-weight: 700;
          font-size: 20px;
          margin: 0 0 25px 0;
        }

        .sidebar-list {
          list-style: none;
          padding: 0;
          margin: 0;
        }

        .sidebar-item {
          margin-bottom: 15px;
        }

        .sidebar-item.empty {
          opacity: 0.5;
          color: #fff;
          font-size: 14px;
        }

        .sidebar-link {
          color: #fff;
          font-weight: 500;
          font-size: 15px;
          background: none;
          border: none;
          cursor: pointer;
          text-align: left;
          opacity: 0.7;
          transition: opacity 0.3s;
          width: 100%;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 8px;
          padding: 5px 0;
          text-decoration: none;
        }

        .sidebar-title {
          flex: 1;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .sidebar-delete {
          flex-shrink: 0;
          background: transparent;
          border: none;
          color: #666;
          font-size: 18px;
          line-height: 1;
          cursor: pointer;
          padding: 0 4px;
          opacity: 0;
          transition: opacity 0.2s, color 0.2s;
        }

        .sidebar-link:hover .sidebar-delete,
        .sidebar-link.active .sidebar-delete {
          opacity: 1;
        }

        .sidebar-delete:hover {
          color: #ff4d4d;
        }

        .sidebar-link:hover {
          opacity: 1;
        }

        .sidebar-link.active {
          opacity: 1;
          color: #a9a9a9;
          font-weight: 700;
        }

        .main-content {
          position: fixed;
          top: 0;
          left: 0;
          width: calc(100% - 250px);
          height: 100vh;
          height: 100dvh;
          display: flex;
          flex-direction: column;
          transition: transform 0.4s ease, width 0.4s ease;
          transform: translateX(250px);
          background: #000;
          overflow: hidden;
          z-index: 1;
        }

        .main-content.no-sidebar {
          transform: translateX(0);
          width: 100%;
        }

        .view-landing .conversation-thread {
          display: none;
        }

        .view-landing .chat-input-form {
          position: absolute;
          top: 58%;
          left: 50%;
          transform: translateX(-50%);
          width: 700px;
          max-width: 90%;
          z-index: 30;
          pointer-events: auto;
          bottom: auto;
        }

        .view-landing .landing-content {
          display: block;
        }

        .view-chat .conversation-thread {
          display: flex;
        }

        .view-chat .chat-input-form {
          position: fixed;
          bottom: 30px;
          left: 50%;
          transform: translateX(-50%);
          width: 750px;
          max-width: 90%;
          z-index: 40;
        }

        .main-content:not(.no-sidebar) .view-chat .chat-input-form {
          left: calc(50% + 125px);
          transform: translateX(-50%);
        }

        .main-content.no-sidebar .view-chat .chat-input-form {
          left: 50%;
          transform: translateX(-50%);
        }

        .view-chat .landing-content {
          display: none;
        }

        .landing-content {
          position: absolute;
          top: 42%;
          left: 50%;
          transform: translate(-50%, -50%);
          width: 700px;
          max-width: 90%;
          text-align: center;
          z-index: 20;
          pointer-events: auto;
        }

        .main-heading {
          color: #fff;
          font-weight: 700;
          font-size: 40px;
          margin-bottom: 30px;
          white-space: nowrap;
        }

        .suggestion-buttons {
          display: flex;
          gap: 30px;
          width: 100%;
          justify-content: space-between;
          margin-bottom: 30px;
        }

        .suggestion-button {
          width: 32%;
          max-width: 220px;
          height: 32px;
          background: #000;
          border: 1px solid #fff;
          border-radius: 50px;
          color: #fff;
          font-weight: 600;
          font-size: 13px;
          padding-left: 15px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          cursor: pointer;
          position: relative;
          transition: all 0.3s ease;
        }

        .suggestion-button:hover {
          background: #fff;
          color: #000;
        }

        .suggestion-button span {
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          max-width: 80%;
        }

        .suggestion-button :global(.suggestion-arrow) {
          position: absolute;
          right: 10px;
          width: 10px;
          height: 9px;
          transition: opacity 0.3s ease;
        }

        .suggestion-button :global(.arrow-normal) {
          opacity: 1;
        }

        .suggestion-button :global(.arrow-hover) {
          opacity: 0;
          position: absolute;
          top: 50%;
          right: 10px;
          transform: translateY(-50%);
        }

        .suggestion-button:hover :global(.arrow-normal) {
          opacity: 0;
        }

        .suggestion-button:hover :global(.arrow-hover) {
          opacity: 1;
        }

        .conversation-thread {
          flex: 1;
          width: 100%;
          padding: 120px 40px 140px 40px;
          overflow-y: auto;
          overflow-x: hidden;
          -webkit-overflow-scrolling: touch;
          display: flex;
          flex-direction: column;
          gap: 50px;
          background: #000;
        }

        .user-message,
        .ai-group {
          max-width: 750px;
          width: 100%;
          margin: 0 auto;
        }

        .user-message {
          align-self: flex-end;
          text-align: right;
          font-weight: 700;
          color: #fff;
          font-size: 16px;
        }

        .ai-group {
          align-self: flex-start;
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .ai-heading {
          font-weight: 700;
          color: #fff;
          font-size: 16px;
          white-space: nowrap;
          margin-bottom: 5px;
        }

        .ai-prompt {
          font-weight: 400;
          color: #ececec;
          font-size: 15px;
          line-height: 1.5;
          background-color: #111;
          padding: 20px;
          border-radius: 12px;
          border: 1px solid #222;
          white-space: pre-wrap;
          min-height: 24px;
        }

        .action-row {
          display: flex;
          align-items: center;
          gap: 20px;
          flex-wrap: wrap;
          margin-top: 10px;
        }

        .action-btn {
          display: flex;
          align-items: center;
          gap: 6px;
          cursor: pointer;
          user-select: none;
          background: transparent;
          border: none;
          padding: 0;
          outline: none;
        }

        .action-text {
          color: #fff;
          font-size: 13px;
          font-weight: 700;
          opacity: 0.7;
          transition: opacity 0.2s ease;
          font-family: inherit;
        }

        .action-icon {
          width: 22px;
          height: 22px;
          object-fit: contain;
          border-radius: 4px;
        }

        .action-btn:hover .action-text,
        .action-btn:hover .action-icon {
          opacity: 1;
        }

        /* Skeleton */
        .skeleton-group {
          gap: 12px;
        }

        .skeleton-box {
          background: #111;
          border: 1px solid #222;
          border-radius: 12px;
          padding: 20px;
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .skeleton-line {
          height: 14px;
          border-radius: 6px;
          background: linear-gradient(
            90deg,
            #1a1a1a 25%,
            #2a2a2a 50%,
            #1a1a1a 75%
          );
          background-size: 200% 100%;
          animation: skeletonShimmer 1.4s ease-in-out infinite;
        }

        .skeleton-line.sk-title {
          width: 140px;
          height: 16px;
          margin-bottom: 4px;
        }

        .skeleton-line.sk-short {
          width: 55%;
        }

        @keyframes skeletonShimmer {
          0% {
            background-position: 200% 0;
          }
          100% {
            background-position: -200% 0;
          }
        }

        .chat-input-form {
          z-index: 40;
          transition: bottom 0.12s ease;
        }

        .chat-input-wrapper {
          position: relative;
          width: 100%;
        }

        .chat-input {
          width: 100%;
          height: 50px;
          background: #0e0e0e;
          border-radius: 50px;
          border: none;
          padding: 0 65px 0 35px;
          font-size: 18px;
          color: #fff;
          outline: none;
        }

        .chat-input::placeholder {
          color: #a2a2a2;
        }

        .chat-submit-button {
          position: absolute;
          top: 50%;
          right: 10px;
          transform: translateY(-50%);
          width: 42px;
          height: 42px;
          background: transparent;
          border: none;
          cursor: pointer;
        }

        .chat-submit-icon {
          width: 30px;
          height: 30px;
        }

        /* Limit popup */
        .limit-fullscreen {
          position: fixed;
          inset: 0;
          width: 100%;
          height: 100%;
          height: 100dvh;
          background: #000000;
          z-index: 99999;
          overflow: hidden;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
        }

        .limit-close-btn {
          position: absolute;
          top: 22px;
          left: 28px;
          background: transparent;
          border: none;
          color: #888;
          font-size: 38px;
          line-height: 1;
          cursor: pointer;
          z-index: 20;
          padding: 0;
          width: 44px;
          height: 44px;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: color 0.2s ease;
        }

        .limit-close-btn:hover {
          color: #ffffff;
        }

        .limit-badge {
          position: absolute;
          top: 36px;
          left: 50%;
          transform: translateX(-50%);
          display: flex;
          align-items: center;
          gap: 10px;
          border: 1.5px solid #ffffff;
          border-radius: 100px;
          padding: 10px 22px 10px 16px;
          background: rgba(0, 0, 0, 0.6);
          backdrop-filter: blur(6px);
          -webkit-backdrop-filter: blur(6px);
          white-space: nowrap;
          z-index: 15;
        }

        .limit-red-dot {
          width: 10px;
          height: 10px;
          border-radius: 50%;
          background: #ff2d2d;
          flex-shrink: 0;
          animation: redDotBlink 2.4s ease-in-out infinite;
        }

        @keyframes redDotBlink {
          0%,
          100% {
            opacity: 1;
            box-shadow: 0 0 0 0 rgba(255, 45, 45, 0.55);
          }
          50% {
            opacity: 0.25;
            box-shadow: 0 0 0 8px rgba(255, 45, 45, 0);
          }
        }

        .limit-badge-text {
          color: #ffffff;
          font-size: 15px;
          font-weight: 500;
          letter-spacing: 0.2px;
        }

        .limit-content-desktop {
          width: 100%;
          max-width: 1200px;
          height: 100%;
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0 60px;
          box-sizing: border-box;
        }

        .limit-left {
          flex: 0 0 46%;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          position: relative;
          height: 100%;
        }

        .limit-dog {
          width: 100%;
          max-width: 520px;
          height: auto;
          max-height: 75vh;
          object-fit: contain;
          object-position: center bottom;
          display: block;
          user-select: none;
          pointer-events: none;
        }

        .limit-right {
          flex: 1;
          display: flex;
          flex-direction: column;
          justify-content: center;
          padding-left: 40px;
          max-width: 520px;
        }

        .limit-title {
          color: #ffffff;
          font-size: 38px;
          font-weight: 700;
          line-height: 1.2;
          margin: 0 0 22px 0;
        }

        .limit-desc {
          color: #e8e8e8;
          font-size: 15px;
          line-height: 1.55;
          margin: 0 0 18px 0;
        }

        .limit-hint {
          color: #c8c8c8;
          font-size: 14px;
          line-height: 1.5;
          margin: 0 0 32px 0;
        }

        .limit-btn {
          align-self: flex-start;
          background: #d0d0d0;
          color: #111;
          border: none;
          border-radius: 100px;
          padding: 14px 36px;
          font-size: 16px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.22s ease;
        }

        .limit-btn:hover {
          background: #ffffff;
          transform: translateY(-1px);
          box-shadow: 0 8px 24px rgba(255, 255, 255, 0.15);
        }

        .limit-btn:active {
          transform: translateY(0);
        }

        .limit-content-mobile {
          display: none;
        }

        /* Mobile */
        @media (max-width: 900px) {
          .nav-desktop-only {
            display: none !important;
          }

          .logo-main {
            left: 16px;
            top: 16px;
            width: 40px;
            height: 40px;
            z-index: 100;
          }

          .login-icon-mobile {
            display: block;
            position: fixed;
            right: 16px;
            top: 16px;
            width: 36px;
            height: 36px;
            object-fit: contain;
            z-index: 100;
            cursor: pointer;
          }

          .sidebar {
            width: 82vw;
            max-width: 300px;
            box-shadow: 4px 0 30px rgba(0, 0, 0, 0.6);
            z-index: 90;
          }

          .sidebar.hide {
            transform: translateX(-105%);
          }

          .sidebar-delete {
            opacity: 0.7;
          }

          .main-content {
            width: 100% !important;
            transform: translateX(0) !important;
            left: 0 !important;
          }

          .main-content:not(.no-sidebar) .view-chat .chat-input-form {
            left: 50%;
          }

          .landing-content {
            position: absolute;
            top: 42%;
            left: 50%;
            transform: translate(-50%, -50%);
            width: 100%;
            max-width: 100%;
            padding: 0 20px;
            box-sizing: border-box;
            text-align: center;
            z-index: 20;
          }

          .main-heading {
            font-size: 24px;
            font-weight: 700;
            white-space: normal;
            margin-bottom: 16px;
            padding: 0;
            line-height: 1.3;
          }

          .suggestion-buttons {
            display: flex;
            flex-direction: row;
            flex-wrap: nowrap;
            justify-content: center;
            align-items: center;
            gap: 10px;
            width: 100%;
            margin-bottom: 0;
            max-width: 100%;
          }

          .suggestion-middle {
            display: none !important;
          }

          .suggestion-button {
            flex: 1;
            width: auto;
            max-width: none;
            height: auto;
            min-height: 36px;
            padding: 8px 12px;
            font-size: 11px;
            font-weight: 600;
            justify-content: center;
            gap: 6px;
            box-shadow: 0px 4px 4px #00000040;
            border-radius: 50px;
          }

          .suggestion-button span {
            max-width: none;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
            font-size: 11px;
            font-weight: 600;
          }

          .suggestion-button :global(.suggestion-arrow) {
            position: static;
            width: 10px;
            height: 8px;
            transform: none;
            top: auto;
            right: auto;
            flex-shrink: 0;
          }

          .suggestion-button :global(.arrow-hover) {
            display: none;
          }

          .suggestion-button:hover {
            background: #000;
            color: #fff;
          }

          .view-landing .chat-input-form {
            position: absolute;
            top: calc(42% + 78px);
            left: 50%;
            transform: translateX(-50%);
            width: calc(100% - 40px);
            max-width: 100%;
            z-index: 30;
            bottom: auto;
          }

          .view-landing .chat-input-form[style*='bottom'] {
            top: auto !important;
          }

          .view-landing .chat-input {
            height: 46px;
            padding: 0 48px 0 18px;
            font-size: 16px;
            border-radius: 50px;
          }

          .view-landing .chat-submit-button {
            width: 40px;
            height: 40px;
            right: 4px;
            top: 50%;
            transform: translateY(-50%);
          }

          .view-landing .chat-submit-icon {
            width: 24px;
            height: 24px;
          }

          .view-chat .chat-input-form {
            position: fixed;
            bottom: calc(12px + env(safe-area-inset-bottom, 0px));
            left: 50%;
            transform: translateX(-50%);
            width: calc(100% - 24px);
            max-width: 100%;
            z-index: 50;
          }

          .conversation-thread {
            padding: 80px 14px 100px;
          }

          .user-message {
            max-width: 88%;
            font-size: 14px;
          }

          .ai-group {
            max-width: 100%;
          }

          .ai-heading {
            font-size: 15px;
          }

          .ai-prompt {
            font-size: 14px;
            line-height: 1.55;
            padding: 16px;
          }

          .action-row {
            flex-wrap: wrap;
            gap: 12px;
          }

          .action-btn {
            padding: 4px 0;
          }

          .action-icon {
            width: 18px;
            height: 18px;
          }

          .chat-input-wrapper {
            padding: 0;
          }

          .chat-input {
            font-size: 16px;
            height: 48px;
          }

          .limit-close-btn {
            top: 14px;
            left: 14px;
            font-size: 30px;
            color: #aaa;
          }

          .limit-badge {
            top: 48px;
            padding: 7px 14px 7px 11px;
          }

          .limit-badge-text {
            font-size: 12px;
          }

          .limit-red-dot {
            width: 8px;
            height: 8px;
          }

          .limit-content-desktop {
            display: none !important;
          }

          .limit-content-mobile {
            display: flex;
            flex-direction: column;
            width: 100%;
            height: 100%;
            max-height: 100dvh;
            overflow-y: auto;
            overflow-x: hidden;
            -webkit-overflow-scrolling: touch;
            background: #000000;
            padding: 80px 0 20px;
            box-sizing: border-box;
          }

          .limit-mobile-inner {
            display: flex;
            flex-direction: column;
            align-items: center;
            width: 100%;
            padding: 0 22px 16px;
            box-sizing: border-box;
          }

          .limit-mobile-img-wrap {
            position: relative;
            width: 100%;
            display: flex;
            justify-content: center;
            align-items: center;
            margin-bottom: 8px;
          }

          .limit-mobile-dog {
            width: 72%;
            max-width: 280px;
            height: auto;
            max-height: 38vh;
            object-fit: contain;
            object-position: center;
            display: block;
            user-select: none;
            pointer-events: none;
          }

          .limit-mobile-title {
            color: #ffffff;
            font-size: 22px;
            font-weight: 700;
            line-height: 1.25;
            margin: 6px 0 12px 0;
            text-align: left;
            width: 100%;
            max-width: 320px;
          }

          .limit-mobile-desc {
            color: #e0e0e0;
            font-size: 13px;
            line-height: 1.5;
            margin: 0 0 10px 0;
            text-align: left;
            width: 100%;
            max-width: 320px;
          }

          .limit-mobile-hint {
            color: #b0b0b0;
            font-size: 12px;
            line-height: 1.45;
            margin: 0 0 22px 0;
            text-align: left;
            width: 100%;
            max-width: 320px;
          }

          .limit-mobile-btn {
            width: 100%;
            max-width: 320px;
            display: flex;
            align-items: center;
            justify-content: center;
            background: #d9d9d9;
            color: #000;
            border: none;
            border-radius: 100px;
            padding: 13px 24px;
            font-size: 15px;
            font-weight: 600;
            cursor: pointer;
            text-align: center;
          }
        }

        @media (max-width: 480px) {
          .main-heading {
            font-size: 22px;
          }

          .suggestion-button {
            padding: 7px 10px;
            min-height: 34px;
          }

          .suggestion-button span {
            font-size: 10px;
          }

          .action-text {
            font-size: 12px;
          }

          .conversation-thread {
            padding: 72px 12px 90px;
          }

          .limit-mobile-dog {
            max-height: 34vh;
            max-width: 240px;
          }

          .limit-mobile-title {
            font-size: 20px;
          }

          .limit-mobile-desc {
            font-size: 12.5px;
          }

          .limit-mobile-hint {
            font-size: 11.5px;
          }
        }
      `}</style>
    </>
  );
}