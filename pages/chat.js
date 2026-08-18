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
import NavPill from '../components/navphil'; 

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

  const threadRef = useRef(null);
  const inputRef = useRef(null);

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

  async function sendMessage(overrideText) {
    const text = (overrideText ?? input).trim();
    if (!text || loading) return;

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

      const saved = await upsertConversation(uid, {
        id: currentChatId || null,
        title: data.title || text.slice(0, 45),
        request: text,
        response: aiText,
      }, email);

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
                    {/* COPY BUTTON */}
                    <button
                      className="action-btn"
                      onClick={() => copyPrompt(m.text, i)}
                      title="Copy Prompt"
                    >
                      <span className="action-text">
                        {copiedIdx === i ? 'Copied!' : 'copy'}
                      </span>
                      <img src="/assets/copy.png" className="action-icon" alt="copy" />
                    </button>
                    
                    {/* CHATGPT BUTTON */}
                    <button
                      className="action-btn"
                      title="Paste in ChatGPT"
                      onClick={() => {
                        navigator.clipboard.writeText(m.text).then(() => {
                          const url = 'https://chatgpt.com/?q=' + encodeURIComponent(m.text);
                          window.open(url, '_blank', 'noopener,noreferrer');
                        });
                      }}
                    >
                      <span className="action-text">Paste in</span>
                      <img src="/assets/chatgpt.png" className="action-icon" alt="ChatGPT" />
                    </button>
                    
                    {/* GEMINI BUTTON */}
                    <button
                      className="action-btn"
                      title="Paste in Gemini"
                      onClick={() => {
                        navigator.clipboard.writeText(m.text).then(() => {
                          window.open('https://gemini.google.com/app', '_blank', 'noopener,noreferrer');
                        });
                      }}
                    >
                      <span className="action-text">Paste in</span>
                      <svg className="action-icon" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <path fill="currentColor" d="M12 0C11.5 6.5 6.5 11.5 0 12C6.5 12.5 11.5 17.5 12 24C12.5 17.5 17.5 12.5 24 12C17.5 11.5 12.5 6.5 12 0Z"/>
                      </svg>
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
          /* Padding top badha di hai taaki text NavPill ke peeche na chhupe */
          padding: 120px 40px 140px 40px;
          overflow-y: auto;
          overflow-x: hidden;
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

        /* ACTIONS BUTTONS CSS (ALL 3 EXACT SAME DESIGN) */
        .action-row {
          display: flex;
          align-items: center;
          gap: 25px; /* Copy, ChatGPT, aur Gemini ke beech gap */
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
          width: 15px;
          height: 15px;
          opacity: 0.7;
          transition: opacity 0.2s ease;
          object-fit: contain;
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

        @media (max-width: 900px) {
          .logo-main {
            left: 16px;
            top: 18px;
          }

          .sidebar {
            width: 78vw;
            max-width: 280px;
            box-shadow: 4px 0 30px rgba(0, 0, 0, 0.6);
          }

          .sidebar.hide {
            transform: translateX(-100%);
          }

          .main-content {
            width: 100% !important;
            transform: translateX(0) !important;
          }

          .main-content:not(.no-sidebar) .view-chat .chat-input-form {
            left: 50%;
          }

          .main-heading {
            font-size: 26px;
            white-space: normal;
          }

          .landing-content {
            width: 90%;
            top: 45%;
          }

          .suggestion-buttons {
            flex-direction: column;
            gap: 12px;
          }

          .suggestion-button {
            width: 100%;
            max-width: none;
          }

          .conversation-thread {
            padding: 90px 16px 140px;
          }

          .view-chat .chat-input-form {
            bottom: 16px;
            width: 92%;
          }

          .view-landing .chat-input-form {
            width: 90%;
          }
        }
      `}</style>
    </>
  );
}