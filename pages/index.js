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
          {/* grid-rows collapse trick: always sized to real content height,
              so it can never clip or overlap the next question no matter
              how long the answer text is. */}
          <div className="faq-answer-grid">
            <div className="faq-answer">{item.a}</div>
          </div>
        </div>
      ))}
      <style jsx>{`
        .faq-heading {
          font-size: 70px;
          font-weight: 900;
          line-height: 1.1;
          margin-bottom: 60px;
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
          font-size: 18px;
          line-height: 1.6;
          color: #e0e0e0;
          padding-right: 50px;
        }
        .faq-item.active .faq-answer {
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
        <title>PromptAi - AI Prompt Generator</title>
      </Head>

      {/* FIXED NAVBAR & BUTTONS */}
      <Logo onClick={() => router.push('/')} />
      <div className="nav-fixed">
        <NavPill />
      </div>
      <div className="btn-top" onClick={() => router.push('/chat')}>
        GET STARTED
      </div>

      {/* DESKTOP LAYOUT (>=901px) */}
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
                  <div className="card-bg-number">01</div>
                  <div className="card-header">FEATURE 1</div>
                  <div className="card-body white">Ready-to-use prompts.</div>
                </div>
                <div className="feature-card">
                  <div className="card-bg-number">02</div>
                  <div className="card-header">FEATURE 2</div>
                  <div className="card-body dark">Your ideas stay private.</div>
                </div>
                <div className="feature-card">
                  <div className="card-bg-number">03</div>
                  <div className="card-header">FEATURE 3</div>
                  <div className="card-body white">Instant, quality results.</div>
                </div>
              </div>
              <div className="feature-row" ref={row2Ref} style={{ marginTop: 52 }}>
                <div className="feature-card">
                  <div className="card-bg-number">04</div>
                  <div className="card-header">FEATURE 4</div>
                  <div className="card-body dark">Keep and reuse your best ones.</div>
                </div>
                <div className="feature-card">
                  <div className="card-bg-number">05</div>
                  <div className="card-header">FEATURE 5</div>
                  <div className="card-body white">Think ideas, not words.</div>
                </div>
                <div className="feature-card">
                  <div className="card-bg-number">06</div>
                  <div className="card-header">FEATURE 6</div>
                  <div className="card-body dark">Copy & use anywhere fast.</div>
                </div>
              </div>
            </div>

            {/* Main Showcase Image GIF (Blurred into a background glow) */}
            <div className="main-img" />

            {/* Second Hero Background */}
            <div className="second-hero" id="about-section" />

            <h1 className="second-heading">
              Get All the Type of prompt You Need <br />
              In a Single Platform
            </h1>
            <div className="second-btn" onClick={() => router.push('/chat')}>
              GET STARTED
              <img src="/assets/arrow.png" alt="Arrow" className="arrow-img" style={{ width: 18, height: 18 }} />
            </div>

            {/* Desktop FAQ Wrapper */}
            <div className="desktop-faq-wrapper">
              <FaqAccordion />
            </div>

            {/*
              Flow "spacer" - this is the actual fix for the container-height
              bug. Every element above is position:absolute, which means
              (per normal CSS rules) none of them count toward this div's
              own height - so without something in normal document flow,
              .container would collapse close to 0px tall and everything
              below the very top would get clipped/overlap the fixed navbar.
              This 1px div sits in normal flow and is pushed down past the
              lowest possible point of the FAQ section (even fully expanded),
              which forces .container to always be exactly as tall as it
              needs to be - no magic hardcoded height number required.
            */}
            <div style={{ marginTop: 4550, height: 1 }} aria-hidden="true" />
          </div>
        </ScaleFit>
      </div>

      {/* MOBILE LAYOUT (<901px) */}
      <div className="mobile-only">
        <div className="m-hero-bg" />
        <div className="m-hero">
          <h1 className="m-heading">Get AI-generated</h1>
          <div className="m-hero-sub-row">
            <p className="m-subtext">production-ready prompts in seconds</p>
            <div className="m-btn-small" onClick={() => router.push('/chat')}>
              GET STARTED
            </div>
          </div>
        </div>

        <h2 className="m-section-title">A Seamless User Experience</h2>
        <p className="m-description">
          This is the place where you simply write your imagination, and AI transforms it into a fully AI-ready prompt. Whether you're writing blogs, social posts, or any creative project — AI helps you express your thoughts clearly and professionally.
        </p>

        <div className="m-feature-grid">
          <div className="feature-card">
            <div className="card-bg-number">01</div>
            <div className="card-header">FEATURE 1</div>
            <div className="card-body white">Ready-to-use prompts.</div>
          </div>
          <div className="feature-card">
            <div className="card-bg-number">02</div>
            <div className="card-header">FEATURE 2</div>
            <div className="card-body dark">Your ideas stay private.</div>
          </div>
          <div className="feature-card">
            <div className="card-bg-number">03</div>
            <div className="card-header">FEATURE 3</div>
            <div className="card-body white">Instant, quality results.</div>
          </div>
          <div className="feature-card">
            <div className="card-bg-number">04</div>
            <div className="card-header">FEATURE 4</div>
            <div className="card-body dark">Keep and reuse your best ones.</div>
          </div>
          <div className="feature-card">
            <div className="card-bg-number">05</div>
            <div className="card-header">FEATURE 5</div>
            <div className="card-body white">Think ideas, not words.</div>
          </div>
          <div className="feature-card">
            <div className="card-bg-number">06</div>
            <div className="card-header">FEATURE 6</div>
            <div className="card-body dark">Copy & use anywhere fast.</div>
          </div>
        </div>

        {/* Mobile Showcase Glow (Replaces sharp image with ambient blur) */}
        <div className="m-ambient-glow" />

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
          margin: 0;
          padding: 0;
        }

        /* Hack to hide the login/profile icon from the NavPill component */
        .nav-fixed svg, 
        .nav-fixed img[alt*="user" i], 
        .nav-fixed img[alt*="login" i],
        .nav-fixed a:last-of-type svg {
          display: none !important;
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

        /* ---------- DESKTOP CONTAINER ---------- */
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
          z-index: 0;
        }
        .main-heading {
          position: absolute;
          top: 328px;
          left: 369px;
          font-size: 130px;
          font-weight: 900;
          color: #fff;
          z-index: 2;
        }
        .sub-heading {
          position: absolute;
          top: 827px;
          left: 1184px;
          font-size: 22px;
          font-weight: bold;
          color: #fff;
          z-index: 2;
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
          z-index: 2;
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
          z-index: 2;
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
          z-index: 2;
        }
        .features-container {
          position: absolute;
          top: 1229px;
          left: 107px;
          width: 1650px;
          z-index: 2;
        }
        .feature-row {
          display: flex;
          gap: 35px;
          transition: transform 0.1s ease-out;
        }
        .feature-card {
          position: relative;
          width: 502px;
          height: 176px;
          border-radius: 25px;
          overflow: hidden;
          flex-shrink: 0;
        }
        .card-bg-number {
          position: absolute;
          right: -15px;
          bottom: -40px;
          font-size: 160px;
          font-weight: 900;
          color: rgba(128, 128, 128, 0.15);
          z-index: 0;
          pointer-events: none;
          user-select: none;
        }
        .card-header {
          position: relative;
          z-index: 1;
          height: 66px;
          background: #1e1e1e;
          padding: 21px 32px;
          font-size: 20px;
          font-weight: bold;
          color: white;
        }
        .card-body {
          position: relative;
          z-index: 1;
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

        /* FIXED MAIN IMAGE VISIBILITY & BLUR */
        .main-img {
          position: absolute;
          top: 1700px;
          left: 750px;
          width: 1300px;
          height: 1300px;
          background: url('/assets/main12.gif') center/cover no-repeat;
          border-radius: 50%;
          z-index: 0; 
          filter: blur(45px);
          opacity: 0.7;
        }

        .second-hero {
          position: absolute;
          top: 2680px;
          left: 0;
          width: 100%;
          height: 906px;
          background: url('/assets/video.gif') center/cover no-repeat;
          filter: blur(35px);
          z-index: 0;
        }
        .second-heading {
          position: absolute;
          top: 3100px;
          left: 130px;
          font-size: 60px;
          font-weight: 900;
          width: 1650px;
          line-height: 1.4;
          color: #fff;
          z-index: 2;
        }
        .second-btn {
          position: absolute;
          top: 3300px;
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
          z-index: 2;
        }
        .second-btn:hover {
          background: #e0e0e0;
        }

        .desktop-faq-wrapper {
          position: absolute;
          top: 3500px;
          left: 130px;
          width: 1650px;
          z-index: 2;
          padding-bottom: 50px;
        }

        .desktop-only {
          display: block;
        }
        .mobile-only {
          display: none;
        }

        /* ---------- MOBILE RESPONSIVE LAYOUT (<901px) ---------- */
        @media (max-width: 900px) {
          .desktop-only {
            display: none;
          }
          .mobile-only {
            display: block;
            position: relative;
            padding: 100px 20px 80px;
            overflow: hidden;
          }
          .nav-fixed {
            right: 20px;
            transform: scale(0.82);
            transform-origin: top right;
          }
          .btn-top {
            display: none;
          }

          .m-hero-bg {
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 450px;
            background: url('/assets/video.gif') center/cover no-repeat;
            filter: blur(25px);
            opacity: 0.7;
            z-index: 0;
          }

          .m-hero {
            position: relative;
            z-index: 1;
            text-align: center;
            padding: 20px 0 40px;
          }
          .m-heading {
            font-size: clamp(28px, 8vw, 42px);
            font-weight: 900;
            color: #fff;
            line-height: 1.15;
            margin-bottom: 14px;
          }
          .m-hero-sub-row {
            display: flex;
            align-items: center;
            justify-content: center;
            flex-wrap: wrap;
            gap: 10px;
          }
          .m-subtext {
            font-size: 13px;
            font-weight: 600;
            color: #d8d8d8;
            white-space: nowrap;
          }
          .m-btn-small {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            background: #fff;
            color: #000;
            font-weight: bold;
            font-size: 11px;
            letter-spacing: 0.3px;
            border-radius: 50px;
            padding: 9px 16px;
            cursor: pointer;
            white-space: nowrap;
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
            position: relative;
            z-index: 1;
            font-size: clamp(24px, 7vw, 32px);
            font-weight: 900;
            color: #fff;
            margin: 50px 0 16px;
          }
          .m-description {
            position: relative;
            z-index: 1;
            font-size: 16px;
            font-weight: 500;
            line-height: 1.7;
            color: #d8d8d8;
          }

          .m-feature-grid {
            position: relative;
            z-index: 1;
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
            position: relative;
          }
          .m-feature-grid .card-header {
            height: auto;
            padding: 14px 20px;
            font-size: 15px;
            position: relative;
            z-index: 1;
          }
          .m-feature-grid .card-body {
            height: auto;
            padding: 22px 20px;
            font-size: 18px;
            position: relative;
            z-index: 1;
          }

          /* MOBILE MAIN IMAGE SHOWCASE (Blurred Ambient Glow) */
          .m-ambient-glow {
            position: absolute;
            top: 40%;
            left: -10%;
            width: 120%;
            height: 500px;
            background: url('/assets/main12.gif') center/cover no-repeat;
            filter: blur(40px);
            z-index: 0;
            opacity: 0.6;
            pointer-events: none;
          }

          .m-second-heading {
            position: relative;
            z-index: 1;
            font-size: clamp(26px, 7vw, 36px);
            font-weight: 900;
            color: #fff;
            line-height: 1.3;
            margin-bottom: 24px;
            margin-top: 50px;
          }
          .m-faq {
            position: relative;
            z-index: 1;
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
