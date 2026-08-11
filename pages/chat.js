import Head from 'next/head';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';

export default function Chat() {
    const router = useRouter();
    const [messages, setMessages] = useState([]);
    const [input, setInput] = useState("");
    const [loading, setLoading] = useState(false);
    const [sidebarHidden, setSidebarHidden] = useState(false);
    
    // Stripe Callback Handler
    useEffect(() => {
        const urlParams = new URLSearchParams(window.location.search);
        if (urlParams.get('session_id')) {
            window.history.replaceState({}, document.title, "/chat");
            // Server ko inform karne ki API call yaha daal sakte ho
        }
    }, []);

    const sendMessage = async () => {
        if (!input.trim()) return;
        const userMsg = input;
        setMessages([...messages, { sender: 'user', text: userMsg }]);
        setInput("");
        setLoading(true);

        try {
            const res = await fetch('/api/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ msg: userMsg })
            });
            const data = await res.json();
            
            if (data.aiText) {
                setMessages(prev => [...prev, { sender: 'ai', text: data.aiText }]);
            }
        } catch(err) {
            console.error(err);
        }
        setLoading(false);
    };

    const copyPrompt = (text) => {
        navigator.clipboard.writeText(text);
        alert("Copied!");
    };

    return (
        <div className="desktop">
            <nav className="nav-pill">
                <a href="/">Home</a>
                <a href="/features">Features</a>
                <a href="/#about-section">About Us</a>
                <a href="/#faq-section">FAQ</a>
                <div className="user-icon" onClick={() => router.push('/details')}>
                    <svg viewBox="0 0 24 24"><path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/></svg>
                </div>
            </nav>
            <img src="/assets/ailogo.png" alt="AI Logo" className="logo-main" onClick={() => setSidebarHidden(!sidebarHidden)} />

            <aside className={`sidebar ${sidebarHidden ? 'hide' : ''}`}>
                <nav className="sidebar-nav">
                    <button className="new-chat" onClick={() => setMessages([])}>New chat</button>
                    <h2 className="chats-heading">Recent</h2>
                    <ul className="sidebar-list">
                        <li className="sidebar-item" style={{opacity:0.5, color:'#fff', fontSize:'14px'}}>Chat History Here</li>
                    </ul>
                </nav>
            </aside>

            <main className={`main-content ${sidebarHidden ? 'no-sidebar' : ''} ${messages.length === 0 ? 'view-landing' : 'view-chat'}`}>
                {messages.length === 0 && (
                    <div className="landing-content">
                        <h1 className="main-heading">Where should we begin?</h1>
                        <div className="suggestion-buttons">
                            <button className="suggestion-button" onClick={() => setInput('Leave application email')}><span>Leave application email</span><img src="/assets/arrow.png" className="suggestion-arrow" /></button>
                            <button className="suggestion-button" onClick={() => setInput('Professional resume for')}><span>Professional resume for</span><img src="/assets/arrow.png" className="suggestion-arrow" /></button>
                        </div>
                    </div>
                )}

                <article className="conversation-thread">
                    {messages.map((m, i) => (
                        m.sender === 'user' ? (
                            <div key={i} className="user-message">{m.text}</div>
                        ) : (
                            <section key={i} className="ai-group">
                                <h2 className="ai-heading">Generated Prompt:</h2>
                                <p className="ai-prompt">{m.text}</p>
                                <div className="copy-container" onClick={() => copyPrompt(m.text)}>
                                    <span className="copy-text">copy</span><img src="/assets/copy.png" className="copy-icon" />
                                </div>
                            </section>
                        )
                    ))}
                    {loading && <div className="ai-group loading"><p>Generating optimized prompt...</p></div>}
                </article>

                <div className="chat-input-form">
                    <div className="chat-input-wrapper">
                        <input type="text" className="chat-input" value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && sendMessage()} placeholder="Ask anything..." />
                        <button className="chat-submit-button" onClick={sendMessage}><img src="/assets/send.png" alt="Send" className="chat-submit-icon" /></button>
                    </div>
                </div>
            </main>

            <style jsx>{`
               /* COPY YOUR EXACT chat.php CSS HERE */
               @import url("https://cdnjs.cloudflare.com/ajax/libs/meyer-reset/2.0/reset.min.css");
               @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
               :root { --color-white: #ffffff; --sidebar-width: 250px; --content-width: 700px; }
               .desktop { position: relative; width: 100%; height: 100vh; background: #000000; overflow: hidden; font-family: "Inter", sans-serif;}
               .nav-pill { position: fixed; top: 31px; right: 86px; display: flex; align-items: center; gap: 25px; background-color: #000000; border: 1px solid var(--color-white); border-radius: 50px; padding: 6px 25px; z-index: 20; }
               .nav-pill a { color: var(--color-white); text-decoration: none; font-weight: 500; font-size: 16px; }
               .user-icon { display: flex; align-items: center; justify-content: center; margin-left: 5px; cursor: pointer; }
               .user-icon svg { width: 24px; height: 24px; fill: var(--color-white); stroke: none; }
               .logo-main { height: 50px; width: 50px; display: block; position: fixed; left: 26px; top: 23px; z-index: 100; cursor: pointer; }
               .sidebar { position: fixed; top: 0; left: 0; width: var(--sidebar-width); height: 100%; background: #0e0e0e; transition: transform 0.4s ease; z-index: 10; }
               .sidebar.hide { transform: translateX(calc(0px - var(--sidebar-width))); }
               .sidebar-nav { position: absolute; top: 120px; left: 25px; right: 10px; bottom: 20px; overflow-y: auto; }
               .new-chat { color: #fff; font-weight: 700; font-size: 18px; background: none; border: none; cursor: pointer; margin-bottom: 40px; text-align: left; padding: 0; }
               .chats-heading { color: #fff; opacity: 0.75; font-weight: 700; font-size: 20px; margin: 0 0 25px 0; }
               .main-content { position: fixed; top: 0; left: 0; width: 100%; height: 100vh; display: flex; flex-direction: column; transition: transform 0.4s ease, width 0.4s ease; transform: translateX(var(--sidebar-width)); width: calc(100% - var(--sidebar-width)); }
               .main-content.no-sidebar { transform: translateX(0); width: 100%; }
               .view-landing .conversation-thread { display: none; }
               .view-landing .chat-input-form { position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); width: var(--content-width); max-width: 90%; }
               .view-chat .conversation-thread { display: flex; }
               .view-chat .chat-input-form { position: fixed; bottom: 30px; left: 50%; transform: translateX(-50%); width: 750px; max-width: 90%; }
               .landing-content { position: absolute; top: calc(50% - 150px); left: 50%; transform: translateX(-50%); width: var(--content-width); text-align: center; }
               .main-heading { color: #fff; font-weight: 700; font-size: 40px; margin-bottom: 30px; white-space: nowrap; }
               .suggestion-buttons { display: flex; gap: 30px; width: 100%; justify-content: space-between; margin-bottom: 30px; }
               .suggestion-button { width: 32%; height: 32px; background: #000; border: 1px solid #fff; border-radius: 50px; color: #fff; font-weight: 600; font-size: 13px; display: flex; align-items: center; justify-content: space-between; cursor: pointer; padding: 0 15px;}
               .conversation-thread { flex: 1; width: 100%; padding: 120px 40px 120px 40px; overflow-y: auto; overflow-x: hidden; display: flex; flex-direction: column; gap: 50px; background: #000; }
               .user-message, .ai-group { max-width: 750px; width: 100%; margin: 0 auto; }
               .user-message { align-self: flex-end; text-align: right; font-weight: 700; color: #fff; font-size: 16px; }
               .ai-group { align-self: flex-start; display: flex; flex-direction: column; gap: 8px; }
               .ai-heading { font-weight: 700; color: #fff; font-size: 16px; }
               .ai-prompt { font-weight: 400; color: #ececec; font-size: 15px; line-height: 1.5; background-color: #111111; padding: 20px; border-radius: 12px; border: 1px solid #222; }
               .copy-container { display: flex; align-items: center; gap: 6px; cursor: pointer; width: fit-content; }
               .copy-text { color: #fff; font-size: 12px; font-weight: 700; opacity: 0.8; }
               .copy-icon { width: 14px; height: 14px; opacity: 0.8; }
               .chat-input-wrapper { position: relative; width: 100%; }
               .chat-input { width: 100%; height: 50px; background: #0e0e0e; border-radius: 50px; border: none; padding: 0 65px 0 35px; font-size: 18px; color: #fff; outline: none; } 
               .chat-submit-button { position: absolute; top: 50%; right: 10px; transform: translateY(-50%); width: 42px; height: 42px; background: transparent; border: none; cursor: pointer; } 
               .chat-submit-icon { width: 30px; height: 30px; }
               .loading p { color: #888; font-style: italic; margin: 0; font-size: 14px; }
            `}</style>
        </div>
    )
}