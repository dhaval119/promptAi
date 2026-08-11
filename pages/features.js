import { useRouter } from 'next/router';
import Head from 'next/head';

export default function Features() {
  const router = useRouter();

  const toggleFeature = (e) => {
    const el = e.currentTarget;
    const isActive = el.classList.contains('active');
    document.querySelectorAll('.feature-row').forEach(r => r.classList.remove('active'));
    if (!isActive) el.classList.add('active');
  };

  return (
    <>
      <Head><title>Features - PromptMagic</title></Head>
      <div className="desktop">
        <img src="/assets/ailogo.png" alt="AI Logo" className="logo-main" onClick={() => router.push('/')} />
        <nav className="nav-pill">
          <a href="/">Home</a>
          <a href="/features">Features</a>
          <a href="/#about-section">About Us</a>
          <a href="/#faq-section">FAQ</a>
          <div className="user-icon" onClick={() => router.push('/details')}>
            <svg viewBox="0 0 24 24"><path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/></svg>
          </div>
        </nav>

        <div className="container">
          <div className="title">Why Prompt AI Stands Out</div>
          <div className="features-list-wrapper">
            <div className="features-top-line"></div>

            <div className="feature-row feature-row-odd active" onClick={toggleFeature}>
              <div className="row-number">01</div>
              <div className="row-title">Natural Language Input Support</div>
              <div className="row-description">Users can enter their thoughts, questions, or situations in any language. The system understands context and converts it into professional prompts.</div>
              <div className="row-line"></div>
            </div>

            <div className="feature-row feature-row-even" onClick={toggleFeature}>
              <div className="row-number">02</div>
              <div className="row-title">Clean & User-Friendly Output</div>
              <div className="row-description">The output is formatted perfectly so you can copy-paste directly into ChatGPT, Claude, Midjourney or any AI tool.</div>
              <div className="row-line"></div>
            </div>

            <div className="feature-row feature-row-odd" onClick={toggleFeature}>
              <div className="row-number">03</div>
              <div className="row-title">Multilingual Compatibility</div>
              <div className="row-description">Communicate in your preferred language — English, Hindi, Hinglish or mixed. We handle the rest.</div>
              <div className="row-line"></div>
            </div>

            <div className="feature-row feature-row-even" onClick={toggleFeature}>
              <div className="row-number">04</div>
              <div className="row-title">Situation-to-Prompt Conversion</div>
              <div className="row-description">Simply describe a scenario and get a production-ready prompt optimized for the best results.</div>
              <div className="row-line"></div>
            </div>

            <div className="feature-row feature-row-odd" onClick={toggleFeature}>
              <div className="row-number">05</div>
              <div className="row-title">Time-Saving Workflow</div>
              <div className="row-description">Streamline your daily tasks. Stop writing long prompts from scratch — let AI do the heavy lifting.</div>
              <div className="row-line"></div>
            </div>
          </div>
        </div>
      </div>

      <style jsx>{`
        * { box-sizing: border-box; }
        :root { --color-white: #ffffff; }
        .desktop {
          position: relative; width: 100%; height: 100vh;
          background: #000000; overflow-y: auto; overflow-x: hidden;
          font-family: "Inter", sans-serif;
        }
        .desktop::-webkit-scrollbar { display: none; }
        .nav-pill {
          position: fixed; top: 31px; right: 86px;
          display: flex; align-items: center; gap: 25px;
          background-color: #000000; border: 1px solid var(--color-white);
          border-radius: 50px; padding: 6px 25px; z-index: 20;
        }
        .nav-pill a {
          color: var(--color-white); text-decoration: none;
          font-weight: 500; font-size: 16px;
        }
        .user-icon { display: flex; align-items: center; margin-left: 5px; cursor: pointer; }
        .user-icon svg { width: 24px; height: 24px; fill: var(--color-white); }
        .logo-main {
          height: 50px; width: 50px; display: block;
          position: fixed; left: 26px; top: 23px; z-index: 100; cursor: pointer;
        }
        .container {
          width: 87.5vw; max-width: 1680px; min-height: 1500px;
          position: relative; background: black; margin: 0 auto;
          padding-bottom: 10vw;
        }
        .title {
          width: 47.8vw; left: 4.22vw; top: 7.96vw;
          position: absolute; color: white; font-size: 3.0vw;
        }
        .features-list-wrapper { position: absolute; top: 16.32vw; left: 0; width: 100%; }
        .features-top-line {
          width: 79.78vw; height: 0; position: absolute; top: 0; left: 3.89vw;
          outline: 1px rgba(169,169,169,0.75) solid;
        }
        .feature-row {
          position: relative; width: 100%; height: 13vw;
          overflow: hidden; transition: height 0.5s ease-in-out, background-color 0.3s;
          cursor: pointer;
        }
        .feature-row.active { height: 29vw; background-color: #050505; }
        .row-line {
          width: 79.78vw; height: 0; position: absolute; bottom: 0; left: 3.89vw;
          outline: 1px rgba(169,169,169,0.75) solid;
        }
        .row-number {
          position: absolute; color: white; font-size: 21.1vw;
          width: 29.3vw; top: 0.46vw; left: 3.89vw;
          pointer-events: none; clip-path: inset(0 0 50% 0);
          transition: clip-path 0.5s ease-in-out;
        }
        .feature-row.active .row-number { clip-path: inset(0 0 0% 0); }
        .row-title {
          position: absolute; color: white; font-size: 2.1vw;
          width: 47.8vw; top: 8vw; left: 34.74vw; pointer-events: none;
        }
        .row-description {
          position: absolute; color: white; font-size: 1.31vw;
          line-height: 2.1vw; width: 26.76vw; top: 12vw; left: 34.74vw;
          opacity: 0; transition: opacity 0.3s ease 0.2s;
        }
        .feature-row.active .row-description { opacity: 1; }
        .feature-row-odd { background: black; }
        .feature-row-even { background: #030303; }

        @media (max-width: 768px) {
          .title { font-size: 28px; position: relative; top: 100px; left: 20px; width: 90%; }
          .features-list-wrapper { position: relative; top: 120px; padding: 0 16px; }
          .feature-row { height: auto; min-height: 80px; padding: 20px 0; }
          .feature-row.active { height: auto; padding-bottom: 30px; }
          .row-number { font-size: 48px; position: relative; left: 0; top: 0; width: auto; clip-path: none; }
          .row-title { position: relative; left: 0; top: 8px; font-size: 18px; width: 100%; }
          .row-description { position: relative; left: 0; top: 12px; font-size: 14px; width: 100%; line-height: 1.5; opacity: 1; }
          .nav-pill { right: 12px; gap: 10px; padding: 4px 12px; }
          .nav-pill a { font-size: 13px; }
        }
      `}</style>
    </>
  );
}
