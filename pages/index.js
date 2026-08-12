import { useEffect, useRef, useState } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import ScaleFit from '../components/ScaleFit';
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
          <div className="faq-answer">{item.a}</div>
        </div>
      ))}
      <style jsx>{`
        .faq-heading {
          font-size: 70px;
          font-weight: 900;
          line-height: 1.1;
          margin-bottom: 80px;
          letter-spacing: -1px;
          color: #fff;
        }
        .faq-item {
          border-bottom: 1px solid #333;
          padding: 30px 0;
        }
        .faq-question {
          font-size: 24px;
          font-weight: 700;
          cursor: pointer;
          display: flex;
          justify-content: space-between;
          align-items: center;
          user-select: none;
          color: #fff;
        }
        .faq-question:hover {
          opacity: 0.9;
        }
        .faq-icon {
          width: 24px;
          height: 24px;
          fill: none;
          stroke: white;
          stroke-width: 2;
          stroke-linecap: round;
          stroke-linejoin: round;
          transition: transform 0.3s ease;
          flex-shrink: 0;
        }
        .faq-answer {
          max-height: 0;
          overflow: hidden;
          transition: max-height 0.4s ease, padding 0.4s ease;
          font-size: 18px;
          line-height: 1.6;
          color: #e0e0e0;
          padding-right: 50px;
        }
        .faq-item.active .faq-answer {
          max-height: 260px;
          padding-top: 20px;
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
  const row1Ref = useRef(null);
  const row2Ref = useRef(null);
  const featuresWrapRef = useRef(null);

  useEffect(() => {
    function onScroll() {
      const wrap = featuresWrapRef.current;
      const row1 = row1Ref.current;
      const row2 = row2Ref.current;
      if (!wrap || !row1 || !row2) return;

      const rect = wrap.getBoundingClientRect();
      const vh = window.innerHeight;
      // progress: 0 when section top hits bottom of viewport, 1 when section fully scrolled past
      const total = rect.height + vh;
      const scrolled = vh - rect.top;
      const progress = Math.max(0, Math.min(1, scrolled / total));
      const moveAmount = progress * 400;
      row1.style.transform = `translateX(${moveAmount}px)`;
      row2.style.transform = `translateX(-${moveAmount}px)`;
    }
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <>
      <Head>
        <title>PromptMagic - AI Prompt Generator</title>
      </Head>

      {/* ===================== FIXED CHROME (same on every screen size) ===================== */}
      <Logo onClick={() => router.push('/')} />
      <div className="nav-fixed">
        <NavPill />
      </div>
      <div className="btn-top" onClick={() => router.push('/chat')}>
        GET STARTED
      </div>

      {/* ===================== DESKTOP / LAPTOP / TABLET (>=901px) - pixel identical to the original design, scaled to fit ===================== */}
      <div className="desktop-only">
        <ScaleFit baseWidth={1920}>
          <div className="container">
            <div className="hero-bg" />
            <h1 className="main-heading">Get AI-generated</h1>
            <p className="sub-heading">production-ready prompts in seconds</p>

            <div className="btn-big" onClick={() => router.push('/chat')}>
              <span>GET STARTED</span>
              <img src="/assets/arrow.png" alt="Arrow" className="arrow-img" />
            </div>
            <h2 className="section-title title1">A Seamless User Experience</h2>
            <h2 className="section-title title2">Built by Professionals, for Professionals</h2>
            <p className="description">
              This is the place where you simply write your imagination, and AI transforms it into a fully AI-ready prompt.
              <br />
              <br />
              Whether you're writing blogs, creating social media posts, or working on any creative project — AI helps you express your thoughts clearly and professionally.
              <br />
              <br />
              See how your simple ideas become "AI-ready prompts" — ready to use instantly with Gemini or any other model. Your words, our intelligence — together, we craft the perfect prompt.
            </p>
            <div className="features-container" ref={featuresWrapRef}>
              <div className="feature-row" ref={row1Ref}>
                <div className="feature-card">
                  <div className="card-header">FEATURE 1</div>
                  <div className="card-body white">Ready-to-use prompts.</div>
                </div>
                <div className="feature-card">
                  <div className="card-header">FEATURE 2</div>
                  <div className="card-body dark">Your ideas stay private.</div>
                </div>
                <div className="feature-card">
                  <div className="card-header">FEATURE 3</div>
                  <div className="card-body white">Instant, quality results.</div>
                </div>
              </div>
              <div className="feature-row" ref={row2Ref} style={{ marginTop: 52 }}>
                <div className="feature-card">
                  <div className="card-header">FEATURE 4</div>
                  <div className="card-body dark">Keep and reuse your best ones.</div>
                </div>
                <div className="feature-card">
                  <div className="card-header">FEATURE 5</div>
                  <div className="card-body white">Think ideas, not words.</div>
                </div>
                <div className="feature-card">
                  <div className="card-header">FEATURE 6</div>
                  <div className="card-body dark">Copy & use anywhere fast.</div>
                </div>
              </div>
            </div>
            <div className="main-img" />

            <div className="second-hero" id="about-section" />

            <h1 className="second-heading">
              Get All the Type of prompt You Need <br />
              In a Single Platform
            </h1>
            <div className="second-btn" onClick={() => router.push('/chat')}>
              GET STARTED
              <img src="/assets/arrow.png" alt="Arrow" className="arrow-img" style={{ width: 18, height: 18 }} />
            </div>

            <FaqAccordion />
          </div>
        </ScaleFit>
      </div>

      {/* ===================== MOBILE (<901px) - same visual language, reflowed to a single column ===================== */}
      <div className="mobile-only">
        <div className="m-hero">
          <h1 className="m-heading">Get AI-generated production-ready prompts in seconds</h1>
          <div className="m-btn-big" onClick={() => router.push('/chat')}>
            <span>GET STARTED</span>
            <img src="/assets/arrow.png" alt="Arrow" />
          </div>
        </div>

        <h2 className="m-section-title">A Seamless User Experience</h2>
        <p className="m-description">
          This is the place where you simply write your imagination, and AI transforms it into a fully AI-ready prompt. Whether you're writing blogs, social posts, or any creative project — AI helps you express your thoughts clearly and professionally.
        </p>

        <div className="m-feature-grid">
          <div className="feature-card">
            <div className="card-header">FEATURE 1</div>
            <div className="card-body white">Ready-to-use prompts.</div>
          </div>
          <div className="feature-card">
            <div className="card-header">FEATURE 2</div>
            <div className="card-body dark">Your ideas stay private.</div>
          </div>
          <div className="feature-card">
            <div className="card-header">FEATURE 3</div>
            <div className="card-body white">Instant, quality results.</div>
          </div>
          <div className="feature-card">
            <div className="card-header">FEATURE 4</div>
            <div className="card-body dark">Keep and reuse your best ones.</div>
          </div>
          <div className="feature-card">
            <div className="card-header">FEATURE 5</div>
            <div className="card-body white">Think ideas, not words.</div>
          </div>
          <div className="feature-card">
            <div className="card-header">FEATURE 6</div>
            <div className="card-body dark">Copy & use anywhere fast.</div>
          </div>
        </div>

        <h2 className="m-section-title" id="about-section">
          Built by Professionals, for Professionals
        </h2>
        <h1 className="m-second-heading">Get All the Type of prompt You Need In a Single Platform</h1>
        <div className="m-btn-big" onClick={() => router.push('/chat')}>
          <span>GET STARTED</span>
          <img src="/assets/arrow.png" alt="Arrow" />
        </div>

        <div className="m-faq">
          <FaqAccordion />
        </div>
      </div>

      <style jsx global>{`
        html,
        body {
          background: #020202;
        }
      `}</style>

      <style jsx>{`
        .nav-fixed {
          position: fixed;
          top: 31px;
          right: 240px;
          z-index: 999;
        }
        .btn-top {
          position: fixed;
          top: 31px;
          right: 55px;
          width: 144px;
          height: 37px;
          background: black;
          border: 1px solid white;
          border-radius: 50px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: bold;
          font-size: 15px;
          cursor: pointer;
          transition: 0.3s;
          z-index: 999;
        }
        .btn-top:hover {
          background: white;
          color: black;
        }

        /* ---------- desktop: (near) verbatim copy of main.php ---------- */
        .container {
          width: 1920px;
          position: relative;
          background: #020202;
        }
        .hero-bg {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 906px;
          background: url('/assets/video.gif') center/cover no-repeat;
          filter: blur(35px);
        }
        .main-heading {
          position: absolute;
          top: 328px;
          left: 369px;
          font-size: 130px;
          font-weight: 900;
          color: #fff;
        }
        .sub-heading {
          position: absolute;
          top: 827px;
          left: 1184px;
          font-size: 22px;
          font-weight: bold;
          color: #fff;
        }
        .btn-big {
          position: absolute;
          top: 814px;
          left: 1630px;
          width: 204px;
          height: 53px;
          background: white;
          border-radius: 50px;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 12px;
          font-weight: bold;
          font-size: 18px;
          color: black;
          cursor: pointer;
          transition: 0.4s;
        }
        .btn-big:hover {
          background: #e0e0e0;
        }
        .arrow-img {
          width: 24px;
          height: 24px;
          transition: 0.4s;
        }
        .section-title {
          position: absolute;
          font-weight: 900;
          font-size: 50px;
          color: #fff;
        }
        .title1 {
          top: 1049px;
          left: 107px;
        }
        .title2 {
          top: 1943px;
          left: 107px;
        }
        .description {
          position: absolute;
          top: 2083px;
          left: 107px;
          width: 755px;
          font-size: 25px;
          font-weight: bold;
          line-height: 1.8;
          color: #fff;
        }
        .features-container {
          position: absolute;
          top: 1229px;
          left: 107px;
          width: 1650px;
        }
        .feature-row {
          display: flex;
          gap: 35px;
          transition: transform 0.1s ease-out;
        }
        .feature-card {
          width: 502px;
          height: 176px;
          border-radius: 25px;
          overflow: hidden;
          flex-shrink: 0;
        }
        .card-header {
          height: 66px;
          background: #1e1e1e;
          padding: 21px 32px;
          font-size: 20px;
          font-weight: bold;
          color: white;
        }
        .card-body {
          height: 110px;
          padding: 32px;
          font-size: 25px;
          font-weight: bold;
        }
        .white {
          background: white;
          color: black;
        }
        .dark {
          background: #0e0e0e;
          color: white;
        }
        .main-img {
          position: absolute;
          top: 1700px;
          left: 750px;
          width: 1300px;
          height: 1300px;
          background: url('/assets/main12.gif') center/cover no-repeat;
          border-radius: 20px;
          z-index: -1;
          filter: blur(25px);
        }
        .second-hero {
          position: absolute;
          top: 2680px;
          left: 0;
          width: 100%;
          height: 906px;
          background: url('/assets/video.gif') center/cover no-repeat;
          filter: blur(35px);
        }
        .second-heading {
          position: absolute;
          top: 3200px;
          left: 130px;
          font-size: 60px;
          font-weight: 900;
          width: 1650px;
          line-height: 1.4;
          color: #fff;
        }
        .second-btn {
          position: absolute;
          top: 3400px;
          left: 130px;
          width: 170px;
          height: 50px;
          background: white;
          border-radius: 50px;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
          font-weight: bold;
          color: black;
          cursor: pointer;
        }
        .second-btn:hover {
          background: #e0e0e0;
        }
        .faq-wrapper {
          position: absolute;
          top: 3700px;
          left: 130px;
          width: 1650px;
          padding-bottom: 120px;
        }

        .desktop-only {
          display: block;
        }
        .mobile-only {
          display: none;
        }

        @media (max-width: 900px) {
          .desktop-only {
            display: none;
          }
          .mobile-only {
            display: block;
            padding: 100px 20px 60px;
          }
          .nav-fixed {
            right: 20px;
            transform: scale(0.82);
            transform-origin: top right;
          }
          .btn-top {
            display: none;
          }

          .m-hero {
            text-align: center;
            padding: 20px 0 40px;
          }
          .m-heading {
            font-size: clamp(28px, 8vw, 42px);
            font-weight: 900;
            color: #fff;
            line-height: 1.15;
            margin-bottom: 24px;
          }
          .m-btn-big {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            gap: 10px;
            background: #fff;
            color: #000;
            font-weight: bold;
            font-size: 16px;
            border-radius: 50px;
            padding: 14px 26px;
            cursor: pointer;
            margin: 0 auto;
          }
          .m-btn-big img {
            width: 18px;
            height: 18px;
          }
          .m-section-title {
            font-size: clamp(24px, 7vw, 32px);
            font-weight: 900;
            color: #fff;
            margin: 50px 0 16px;
          }
          .m-description {
            font-size: 16px;
            font-weight: 500;
            line-height: 1.7;
            color: #d8d8d8;
          }
          .m-feature-grid {
            display: grid;
            grid-template-columns: 1fr;
            gap: 16px;
            margin-top: 30px;
          }
          .m-feature-grid .feature-card {
            width: 100%;
            height: auto;
            border-radius: 18px;
            overflow: hidden;
          }
          .m-feature-grid .card-header {
            height: auto;
            padding: 14px 20px;
            font-size: 15px;
          }
          .m-feature-grid .card-body {
            height: auto;
            padding: 22px 20px;
            font-size: 18px;
          }
          .m-second-heading {
            font-size: clamp(26px, 7vw, 36px);
            font-weight: 900;
            color: #fff;
            line-height: 1.3;
            margin-bottom: 24px;
          }
          .m-faq {
            margin-top: 60px;
          }
          .m-faq :global(.faq-heading) {
            font-size: clamp(32px, 9vw, 44px) !important;
            margin-bottom: 30px !important;
          }
          .m-faq :global(.faq-question) {
            font-size: 17px !important;
          }
          .m-faq :global(.faq-answer) {
            font-size: 15px !important;
            padding-right: 10px !important;
          }
        }
      `}</style>
    </>
  );
}
