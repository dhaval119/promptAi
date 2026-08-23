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

  const threadRef = useRef(null);
  const inputRef = useRef(null);

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
    inputRef.current?.focus();
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
        setMessages([
          { sender: 'user', text: conv.request },
          ...(conv.response ? [{ sender: 'ai', text: conv.response }] : []),
        ]);
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

  function startNewChat() {
    setCurrentChatId(0);
    setMessages([]);
    router.replace('/chat', undefined, { shallow: true });
    inputRef.current?.focus();
  }

  async function openChat(id) {
    try {
      const conv = await getConversation(uid, id, email);
      if (!conv) return;

      setCurrentChatId(conv.id);
      setMessages([
        { sender: 'user', text: conv.request },
        ...(conv.response ? [{ sender: 'ai', text: conv.response }] : []),
      ]);
      router.replace(`/chat?chat_id=${conv.id}`, undefined, { shallow: true });
    } catch (err) {
      console.error('[chat] openChat failed', err);
    }
  }

  const MAX_MESSAGE_LENGTH = 2000;

  async function sendMessage(overrideText) {
    const text = (overrideText ?? input).trim().slice(0, MAX_MESSAGE_LENGTH);
    if (!text || loading) return;

    const used = getTodayUsage(uid);
    if (used >= DAILY_FREE_LIMIT) {
      setTodayUsage(used);
      setShowLimitModal(true);
      return;
    }

    setMessages((prev) => [...prev, { sender: 'user', text }]);
    setInput('');
    setLoading(true);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ msg: text }),
      });

      const data = await res.json();
      const aiText = data.text || 'Something went wrong. Please try again.';

      setMessages((prev) => [...prev, { sender: 'ai', text: aiText }]);

      incrementTodayUsage(uid);
      setTodayUsage((prev) => prev + 1);

      const saved = await upsertConversation(
        uid,
        {
          id: currentChatId || null,
          title: data.title || text.slice(0, 45),
          request: text,
          response: aiText,
        },
        email
      );

      setCurrentChatId(saved.id);
      await refreshChats();
      router.replace(`/chat?chat_id=${saved.id}`, undefined, { shallow: true });
    } catch (err) {
      console.error('[chat] sendMessage failed', err);
      setMessages((prev) => [
        ...prev,
        { sender: 'ai', text: 'Network error. Please try again.' },
      ]);
    } finally {
      setLoading(false);
      inputRef.current?.focus();
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
        <NavPill />

        <img
          src="/assets/ailogo.png"
          alt="AI Logo"
          className="logo-main"
          onClick={() => setSidebarHidden((h) => !h)}
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
                      {c.title}
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
                className="suggestion-button"
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
                </section>
              )
            )}

            {loading ? (
              <div className="ai-group loading">
                <p>Generating optimized prompt...</p>
              </div>
            ) : null}
          </article>

          <div className="chat-input-form">
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

        {/* ===================== FULL SCREEN LIMIT POPUP (exact match) ===================== */}
        {showLimitModal && (
          <div className="limit-fullscreen">
            {/* Close button - top left */}
            <button
              className="limit-close-btn"
              onClick={() => setShowLimitModal(false)}
              aria-label="Close"
            >
              ×
            </button>

            {/* Top center badge */}
            <div className="limit-badge">
              <span className="limit-red-dot" />
              <span className="limit-badge-text">
                Free Limit Exhausted ({DAILY_FREE_LIMIT}/{DAILY_FREE_LIMIT})
              </span>
            </div>

            <div className="limit-content">
              {/* LEFT - Dog + OOPS */}
              <div className="limit-left">
                <div className="oops-text">
                  OOPS!
                  <span className="oops-quotes">’’</span>
                </div>
                <img
                  src="/assets/dog1.png"
                  alt="Doge"
                  className="limit-dog"
                />
              </div>

              {/* RIGHT - Text */}
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
          </div>
        )}
      </div>

      <style jsx global>{`
        html,
        body {
          background: #000;
          overflow: hidden;
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
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          padding: 5px 0;
          display: block;
          text-decoration: none;
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
        }

        .action-row {
          display: flex;
          align-items: center;
          gap: 25px;
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

        .chat-input-form {
          z-index: 10;
          transition: all 0.5s cubic-bezier(0.25, 0.8, 0.25, 1);
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

        .loading p {
          color: #888;
          font-style: italic;
          margin: 0;
          padding: 10px 0;
          font-size: 14px;
        }

        /* ===================== FULL SCREEN LIMIT POPUP ===================== */
        .limit-fullscreen {
          position: fixed;
          inset: 0;
          width: 100vw;
          height: 100vh;
          height: 100dvh;
          background: #000000;
          z-index: 99999;
          overflow: hidden;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
        }

        /* Close button - top left */
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

        /* Top center badge */
        .limit-badge {
          position: absolute;
          top: 28px;
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

        .limit-content {
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

        .oops-text {
          position: absolute;
          top: 18%;
          left: 8%;
          color: #9b6dff;
          font-size: 42px;
          font-weight: 800;
          font-style: italic;
          letter-spacing: 1px;
          z-index: 5;
          transform: rotate(-8deg);
          line-height: 1;
          text-shadow: 0 0 20px rgba(155, 109, 255, 0.4);
        }

        .oops-quotes {
          display: block;
          font-size: 28px;
          margin-top: -4px;
          margin-left: 8px;
          opacity: 0.9;
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
          font-size: 42px;
          font-weight: 700;
          line-height: 1.2;
          margin: 0 0 28px 0;
        }

        .limit-desc {
          color: #e8e8e8;
          font-size: 17px;
          line-height: 1.55;
          margin: 0 0 22px 0;
        }

        .limit-hint {
          color: #c8c8c8;
          font-size: 16px;
          line-height: 1.5;
          margin: 0 0 36px 0;
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

        /* Mobile */
        @media (max-width: 900px) {
          .logo-main {
            left: 12px;
            top: 14px;
            width: 40px;
            height: 40px;
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

          .main-content {
            width: 100% !important;
            transform: translateX(0) !important;
            left: 0 !important;
          }

          .main-content:not(.no-sidebar) .view-chat .chat-input-form {
            left: 50%;
          }

          .main-heading {
            font-size: 24px;
            white-space: normal;
            padding: 0 8px;
            line-height: 1.25;
          }

          .landing-content {
            width: 92%;
            top: 42%;
            padding: 0 4px;
          }

          .suggestion-buttons {
            flex-direction: row;
            flex-wrap: wrap;
            justify-content: center;
            gap: 10px;
            width: 100%;
          }

          .suggestion-button {
            width: auto;
            flex: 0 0 auto;
            max-width: 100%;
            font-size: 13px;
            padding: 0 35px 0 15px;
            height: 38px;
          }

          .suggestion-button span {
            max-width: none;
          }

          .conversation-thread {
            padding: 88px 12px 150px;
          }

          .user-message {
            max-width: 88%;
            font-size: 14px;
          }

          .ai-group {
            max-width: 100%;
          }

          .ai-heading {
            font-size: 16px;
          }

          .ai-prompt {
            font-size: 14px;
            line-height: 1.55;
          }

          .action-row {
            flex-wrap: wrap;
            gap: 10px;
          }

          .action-btn {
            padding: 6px 10px;
            font-size: 12px;
          }

          .action-icon {
            width: 18px;
            height: 18px;
          }

          .view-chat .chat-input-form {
            bottom: calc(12px + env(safe-area-inset-bottom));
            width: 94%;
            left: 50%;
            transform: translateX(-50%);
          }

          .view-landing .chat-input-form {
            width: 92%;
            left: 50%;
            transform: translateX(-50%);
          }

          .chat-input-wrapper {
            padding: 8px 12px;
          }

          .chat-input {
            font-size: 16px;
          }

          /* Limit popup mobile */
          .limit-close-btn {
            top: 16px;
            left: 16px;
            font-size: 32px;
          }

          .limit-badge {
            top: 18px;
            padding: 8px 16px 8px 12px;
          }

          .limit-badge-text {
            font-size: 13px;
          }

          .limit-red-dot {
            width: 9px;
            height: 9px;
          }

          .limit-content {
            flex-direction: column;
            padding: 80px 20px 40px;
            justify-content: flex-start;
            overflow-y: auto;
          }

          .limit-left {
            flex: none;
            height: auto;
            min-height: 280px;
            margin-bottom: 10px;
          }

          .oops-text {
            top: 6%;
            left: 5%;
            font-size: 28px;
          }

          .oops-quotes {
            font-size: 20px;
          }

          .limit-dog {
            max-width: 280px;
            max-height: 260px;
          }

          .limit-right {
            flex: none;
            padding-left: 0;
            max-width: 100%;
            text-align: left;
          }

          .limit-title {
            font-size: 26px;
            margin-bottom: 16px;
          }

          .limit-desc {
            font-size: 15px;
            margin-bottom: 14px;
          }

          .limit-hint {
            font-size: 14px;
            margin-bottom: 24px;
          }

          .limit-btn {
            width: 100%;
            text-align: center;
            padding: 14px 24px;
            font-size: 15px;
          }
        }

        @media (max-width: 480px) {
          .main-heading {
            font-size: 20px;
          }
          .action-text {
            display: none;
          }
          .action-btn {
            padding: 8px;
            min-width: 40px;
            justify-content: center;
          }
          .conversation-thread {
            padding: 80px 10px 140px;
          }

          .limit-title {
            font-size: 22px;
          }
          .limit-desc {
            font-size: 14px;
          }
          .limit-hint {
            font-size: 13px;
          }
        }
      `}</style>
    </>
  );
}