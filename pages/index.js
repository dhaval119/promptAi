import { useState } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import NavPill from '../components/NavPill';
import Logo from '../components/Logo';

const FAQS = [
  {
    q: 'How does Prompt AI work?',
    a: 'Simply type your situation or requirement in any language. Our system sends it to the AI model, processes it, and returns a refined, structured, and high-quality prompt that you can directly copy and use with any AI.',
  },
  {
    q: 'Do I need to write my input in English?',
    a: 'No. You can write in any language - English, Hindi, Hinglish, or mixed. Prompt AI automatically transforms it into a professional English prompt.',
  },
  {
    q: 'Can I use the refined prompts directly in AI tools?',
    a: 'Yes. Every refined prompt is fully optimized and ready to be pasted into any AI model without modification.',
  },
];

const FEATURES = [
  { n: '01', title: 'FEATURE 1', body: 'Ready-to-use prompts.', tone: 'white' },
  { n: '02', title: 'FEATURE 2', body: 'Your ideas stay private.', tone: 'dark' },
  { n: '03', title: 'FEATURE 3', body: 'Instant, quality results.', tone: 'white' },
  { n: '04', title: 'FEATURE 4', body: 'Keep and reuse your best ones.', tone: 'dark' },
  { n: '05', title: 'FEATURE 5', body: 'Think ideas, not words.', tone: 'white' },
  { n: '06', title: 'FEATURE 6', body: 'Copy & use anywhere fast.', tone: 'dark' },
];

function FaqAccordion() {
  const [openIndex, setOpenIndex] = useState(0);
  return (
    <div className="faq-wrapper" id="faq-section">
      <h2 className="faq-heading">
        Frequently asked
        <br />
        questions
      </h2>
      {FAQS.map((item, i) => (
        <div key={i} className={`faq-item ${openIndex === i ? 'active' : ''}`}>
          <div className="faq-question" onClick={() => setOpenIndex(openIndex === i ? -1 : i)}>
            {item.q}
            <svg className="faq-icon" viewBox="0 0 24 24">
              <polyline points="6 9 12 15 18 9"></polyline>
            </svg>
          </div>
          {/* grid-rows collapse trick: always sized to real content, so it
              can never clip or overlap the next question. */}
          <div className="faq-answer-grid">
            <div className="faq-answer">{item.a}</div>
          </div>
        </div>
      ))}
      <style jsx>{`
        .faq-wrapper {
          width: 100%;
          max-width: 1000px;
          margin: 0 auto;
        }
        .faq-heading {
          font-size: clamp(32px, 5vw, 60px);
          font-weight: 900;
          line-height: 1.1;
          margin-bottom: clamp(30px, 5vw, 60px);
          letter-spacing: -1px;
          color: #fff;
        }
        .faq-item {
          border-bottom: 1px solid #333;
          padding: clamp(18px, 2.5vw, 30px) 0;
        }
        .faq-question {
          font-size: clamp(16px, 1.6vw, 24px);
          font-weight: 700;
          cursor: pointer;
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 16px;
          user-select: none;
          color: #fff;
        }
        .faq-question:hover {
          opacity: 0.9;
        }
        .faq-icon {
          width: 22px;
          height: 22px;
          fill: none;
          stroke: white;
          stroke-width: 2;
          stroke-linecap: round;
          stroke-linejoin: round;
          transition: transform 0.3s ease;
          flex-shrink: 0;
        }
        .faq-answer-grid {
          display: grid;
          grid-template-rows: 0fr;
          transition: grid-template-rows 0.4s ease;
        }
        .faq-item.active .faq-answer-grid {
          grid-template-rows: 1fr;
        }
        .faq-answer {
          overflow: hidden;
          min-height: 0;
          font-size: clamp(14px, 1vw, 18px);
          line-height: 1.6;
          color: #e0e0e0;
          padding-right: 30px;
        }
        .faq-item.active .faq-answer {
          padding-top: 18px;
        }
        .faq-item.active .faq-icon {
          transform: rotate(180deg);
        }
      `}</style>
    </div>
  );
}

export default function Home() {
  const router = useRouter();

  return (
    <>
      <Head>
        <title>PromptAi - AI Prompt Generator</title>
      </Head>

      {/* fixed chrome */}
      <Logo onClick={() => router.push('/')} />
      <div className="nav-fixed">
        <NavPill />
      </div>
      <div className="btn-top" onClick={() => router.push('/chat')}>
        GET STARTED
      </div>

      <main className="page">
        {/* ---------- HERO ---------- */}
        <section className="hero">
          <div className="hero-bg" />
          <h1 className="main-heading">Get AI-generated</h1>
          <p className="sub-heading">production-ready prompts in seconds</p>
          <div className="btn-big" onClick={() => router.push('/chat')}>
            <span>GET STARTED</span>
            <img src="/assets/arrow.png" alt="" className="arrow-img" />
          </div>
        </section>

        {/* ---------- FEATURES ---------- */}
        <section className="features-section">
          <h2 className="section-title">A Seamless User Experience</h2>
          <div className="features-grid">
            {FEATURES.map((f) => (
              <div className="feature-card" key={f.n}>
                <div className="card-bg-number">{f.n}</div>
                <div className="card-header">{f.title}</div>
                <div className={`card-body ${f.tone}`}>{f.body}</div>
              </div>
            ))}
          </div>

          <h2 className="section-title">Built by Professionals, for Professionals</h2>
          <p className="description">
            This is the place where you simply write your imagination, and AI transforms it into a fully AI-ready prompt.
            <br />
            <br />
            Whether you're writing blogs, creating social media posts, or working on any creative project — AI helps you
            express your thoughts clearly and professionally.
            <br />
            <br />
            See how your simple ideas become "AI-ready prompts" — ready to use instantly with Gemini or any other model.
            Your words, our intelligence — together, we craft the perfect prompt.
          </p>
        </section>

        {/* ---------- SECOND CTA ---------- */}
        <section className="second-hero" id="about-section">
          <div className="second-hero-bg" />
          <h1 className="second-heading">Get All the Type of prompt You Need In a Single Platform</h1>
          <div className="second-btn" onClick={() => router.push('/chat')}>
            GET STARTED
            <img src="/assets/arrow.png" alt="" className="arrow-img small" />
          </div>
        </section>

        {/* ---------- FAQ ---------- */}
        <section className="faq-section">
          <FaqAccordion />
        </section>
      </main>

      <style jsx global>{`
        html,
        body {
          background: #020202;
          margin: 0;
          padding: 0;
        }
        /* hide the login/profile icon from NavPill - no auth on this build */
        .nav-fixed svg,
        .nav-fixed img[alt*='user' i],
        .nav-fixed img[alt*='login' i] {
          display: none !important;
        }
      `}</style>

      <style jsx>{`
        .nav-fixed {
          position: fixed;
          top: 24px;
          right: 130px;
          z-index: 999;
        }
        .btn-top {
          position: fixed;
          top: 24px;
          right: 24px;
          padding: 10px 24px;
          background: black;
          border: 1px solid white;
          border-radius: 50px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: bold;
          font-size: 14px;
          cursor: pointer;
          transition: 0.3s;
          z-index: 999;
        }
        .btn-top:hover {
          background: white;
          color: black;
        }

        .page {
          width: 100%;
          overflow: hidden;
        }

        /* ---------------- HERO ---------------- */
        .hero {
          position: relative;
          width: 100%;
          min-height: min(90vh, 720px);
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          text-align: center;
          padding: 140px 24px 60px;
          overflow: hidden;
        }
        .hero-bg {
          position: absolute;
          inset: 0;
          background: url('/assets/video.gif') center/cover no-repeat;
          filter: blur(35px);
          z-index: 0;
        }
        .main-heading {
          position: relative;
          z-index: 1;
          font-size: clamp(34px, 7vw, 120px);
          font-weight: 900;
          color: #fff;
          line-height: 1.05;
          margin-bottom: clamp(14px, 2vw, 26px);
        }
        .sub-heading {
          position: relative;
          z-index: 1;
          font-size: clamp(14px, 1.2vw, 22px);
          font-weight: bold;
          color: #fff;
          margin-bottom: clamp(20px, 3vw, 34px);
        }
        .btn-big {
          position: relative;
          z-index: 1;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 12px;
          background: white;
          border-radius: 50px;
          padding: 14px 30px;
          font-weight: bold;
          font-size: clamp(14px, 1vw, 18px);
          color: black;
          cursor: pointer;
          transition: 0.3s;
        }
        .btn-big:hover {
          background: #e0e0e0;
        }
        .arrow-img {
          width: 22px;
          height: 22px;
        }
        .arrow-img.small {
          width: 16px;
          height: 16px;
        }

        /* ---------------- FEATURES ---------------- */
        .features-section {
          width: 100%;
          max-width: 1400px;
          margin: 0 auto;
          padding: 40px 24px 20px;
        }
        .section-title {
          font-weight: 900;
          font-size: clamp(24px, 3.6vw, 50px);
          color: #fff;
          margin: 60px 0 36px;
        }
        .features-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
          gap: 24px;
        }
        .feature-card {
          position: relative;
          border-radius: 20px;
          overflow: hidden;
        }
        .card-bg-number {
          position: absolute;
          right: -10px;
          bottom: -30px;
          font-size: 110px;
          font-weight: 900;
          color: rgba(128, 128, 128, 0.15);
          z-index: 0;
          pointer-events: none;
          user-select: none;
        }
        .card-header {
          position: relative;
          z-index: 1;
          background: #1e1e1e;
          padding: 16px 24px;
          font-size: 16px;
          font-weight: bold;
          color: white;
        }
        .card-body {
          position: relative;
          z-index: 1;
          padding: 24px;
          font-size: clamp(16px, 1.4vw, 22px);
          font-weight: bold;
          min-height: 80px;
          display: flex;
          align-items: center;
        }
        .card-body.white {
          background: white;
          color: black;
        }
        .card-body.dark {
          background: #0e0e0e;
          color: white;
        }
        .description {
          max-width: 780px;
          font-size: clamp(15px, 1.3vw, 22px);
          font-weight: 600;
          line-height: 1.8;
          color: #fff;
        }

        /* ---------------- SECOND CTA ---------------- */
        .second-hero {
          position: relative;
          width: 100%;
          padding: 120px 24px;
          text-align: center;
          overflow: hidden;
        }
        .second-hero-bg {
          position: absolute;
          inset: 0;
          background: url('/assets/video.gif') center/cover no-repeat;
          filter: blur(35px);
          z-index: 0;
        }
        .second-heading {
          position: relative;
          z-index: 1;
          font-size: clamp(24px, 4vw, 58px);
          font-weight: 900;
          color: #fff;
          line-height: 1.35;
          max-width: 1000px;
          margin: 0 auto 34px;
        }
        .second-btn {
          position: relative;
          z-index: 1;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
          background: white;
          border-radius: 50px;
          padding: 13px 26px;
          font-weight: bold;
          font-size: 15px;
          color: black;
          cursor: pointer;
        }
        .second-btn:hover {
          background: #e0e0e0;
        }

        /* ---------------- FAQ ---------------- */
        .faq-section {
          width: 100%;
          max-width: 1400px;
          margin: 0 auto;
          padding: 20px 24px 100px;
        }

        /* ---------------- MOBILE ---------------- */
        @media (max-width: 640px) {
          .nav-fixed {
            top: 16px;
            right: 90px;
            transform: scale(0.8);
            transform-origin: top right;
          }
          .btn-top {
            top: 16px;
            right: 16px;
            padding: 8px 18px;
            font-size: 12px;
          }
          .hero {
            min-height: auto;
            padding: 100px 20px 50px;
          }
          .features-section,
          .faq-section {
            padding-left: 20px;
            padding-right: 20px;
          }
          .section-title {
            margin: 44px 0 24px;
          }
          .second-hero {
            padding: 70px 20px;
          }
        }
      `}</style>
    </>
  );
}