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

function FaqAccordion({ sectionId }) {
  const [openIndex, setOpenIndex] = useState(0);

  return (
    <section className="faq-wrapper" id={sectionId}>
      <h2 className="faq-heading">
        Frequently asked
        <br />
        questions
      </h2>

      <div className="faq-list">
        {FAQS.map((item, i) => {
          const open = openIndex === i;

          return (
            <div key={item.q} className={`faq-item ${open ? 'active' : ''}`}>
              <button
                type="button"
                className="faq-question"
                aria-expanded={open}
                onClick={() => setOpenIndex(open ? -1 : i)}
              >
                <span>{item.q}</span>
                <svg className="faq-icon" viewBox="0 0 24 24" aria-hidden="true">
                  <polyline points="6 9 12 15 18 9" />
                </svg>
              </button>

              <div className="faq-answer-grid">
                <div className="faq-answer">{item.a}</div>
              </div>
            </div>
          );
        })}
      </div>

      <style jsx>{`
        .faq-wrapper {
          width: 100%;
          scroll-margin-top: 110px;
        }

        .faq-heading {
          margin: 0 0 48px;
          color: #fff;
          font-size: 68px;
          line-height: 0.98;
          font-weight: 900;
          letter-spacing: -2.5px;
        }

        .faq-list {
          width: 100%;
        }

        .faq-item {
          width: 100%;
          border-bottom: 1px solid rgba(255, 255, 255, 0.16);
        }

        .faq-question {
          width: 100%;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 30px;
          padding: 26px 0;
          border: 0;
          background: transparent;
          color: #fff;
          font: inherit;
          font-size: 22px;
          font-weight: 700;
          line-height: 1.35;
          text-align: left;
          cursor: pointer;
        }

        .faq-question:hover {
          opacity: 0.92;
        }

        .faq-icon {
          width: 22px;
          height: 22px;
          flex: 0 0 22px;
          fill: none;
          stroke: #fff;
          stroke-width: 2;
          stroke-linecap: round;
          stroke-linejoin: round;
          transition: transform 0.25s ease;
        }

        .faq-item.active .faq-icon {
          transform: rotate(180deg);
        }

        .faq-answer-grid {
          display: grid;
          grid-template-rows: 0fr;
          transition: grid-template-rows 0.34s ease;
        }

        .faq-answer {
          min-height: 0;
          overflow: hidden;
          padding-right: 48px;
          color: #d9d9d9;
          font-size: 17px;
          line-height: 1.65;
        }

        .faq-item.active .faq-answer-grid {
          grid-template-rows: 1fr;
        }

        .faq-item.active .faq-answer {
          padding-bottom: 28px;
        }

        @media (max-width: 900px) {
          .faq-wrapper {
            scroll-margin-top: 90px;
          }

          .faq-heading {
            margin-bottom: 28px;
            font-size: clamp(38px, 11vw, 52px);
            line-height: 0.98;
            letter-spacing: -1.5px;
          }

          .faq-question {
            padding: 20px 0;
            gap: 16px;
            font-size: 17px;
            line-height: 1.4;
          }

          .faq-icon {
            width: 18px;
            height: 18px;
            flex-basis: 18px;
          }

          .faq-answer {
            padding-right: 2px;
            font-size: 14px;
            line-height: 1.6;
          }

          .faq-item.active .faq-answer {
            padding-bottom: 20px;
          }
        }
      `}</style>
    </section>
  );
}

export default function Home() {
  const router = useRouter();

  const row1Ref = useRef(null);
  const row2Ref = useRef(null);
  const featuresWrapRef = useRef(null);

  const scrollToSection = (desktopId, mobileId) => {
    if (typeof window === 'undefined') return;

    const isMobile = window.innerWidth <= 900;
    const targetId = isMobile ? mobileId : desktopId;
    const target = document.getElementById(targetId);

    if (!target) return;

    const offset = isMobile ? 84 : 105;
    const top = target.getBoundingClientRect().top + window.scrollY - offset;

    window.scrollTo({
      top,
      behavior: 'smooth',
    });
  };

  useEffect(() => {
    const onScroll = () => {
      const wrap = featuresWrapRef.current;
      const row1 = row1Ref.current;
      const row2 = row2Ref.current;

      if (!wrap || !row1 || !row2) return;

      const rect = wrap.getBoundingClientRect();
      const viewport = window.innerHeight;
      const progress = Math.max(
        0,
        Math.min(1, (viewport - rect.top) / (rect.height + viewport))
      );

      const moveAmount = progress * 360;

      row1.style.transform = `translate3d(${moveAmount}px, 0, 0)`;
      row2.style.transform = `translate3d(-${moveAmount}px, 0, 0)`;
    };

    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    onScroll();

    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
    };
  }, []);

  useEffect(() => {
    // Works even when NavPill doesn't expose a custom FAQ callback prop.
    const nav = document.querySelector('.nav-fixed');
    if (!nav) return;

    const onNavClick = (event) => {
      const item = event.target.closest('a, button');
      if (!item || !nav.contains(item)) return;

      const label = (item.textContent || '').trim().toLowerCase();
      const href = item.getAttribute('href') || '';

      if (label === 'faq' || href.includes('#faq-section')) {
        event.preventDefault();
        event.stopPropagation();
        scrollToSection('faq-section', 'faq-section-mobile');
      }
    };

    nav.addEventListener('click', onNavClick, true);

    return () => nav.removeEventListener('click', onNavClick, true);
  }, []);

  return (
    <>
      <Head>
        <title>Prompt AI</title>
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=0"
        />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <Logo onClick={() => router.push('/')} />

      <div className="nav-fixed">
        <NavPill />
      </div>

      <div
        className="btn-top"
        onClick={() => router.push('/chat')}
        role="button"
        tabIndex={0}
      >
        GET STARTED
      </div>

      {/* ================= DESKTOP ================= */}

      <div className="desktop-only">
        <ScaleFit baseWidth={1920}>
          <main className="desktop-page">
            <div className="hero-bg" />

            <section className="hero-section">
              <h1 className="main-heading">Get AI-generated</h1>
              <p className="sub-heading">production-ready prompts in seconds</p>

              <div className="btn-big" onClick={() => router.push('/chat')}>
                <span>GET STARTED</span>
                <img src="/assets/arrow.png" alt="Arrow" />
              </div>
            </section>

            <section className="experience-section">
              <h2 className="section-title experience-title">
                A Seamless User Experience
              </h2>

              <div className="features-container" ref={featuresWrapRef}>
                <div className="feature-row" ref={row1Ref}>
                  <FeatureCard number="01" header="FEATURE 1" body="Ready-to-use prompts." light />
                  <FeatureCard number="02" header="FEATURE 2" body="Your ideas stay private." />
                  <FeatureCard number="03" header="FEATURE 3" body="Instant, quality results." light />
                </div>

                <div className="feature-row row-two" ref={row2Ref}>
                  <FeatureCard number="04" header="FEATURE 4" body="Keep and reuse your best ones." />
                  <FeatureCard number="05" header="FEATURE 5" body="Think ideas, not words." light />
                  <FeatureCard number="06" header="FEATURE 6" body="Copy & use anywhere fast." />
                </div>
              </div>
            </section>

            <section className="professional-section">
              <h2 className="section-title professional-title">
                Built by Professionals, for Professionals
              </h2>

              <p className="description">
                This is the place where you simply write your imagination,
                and AI transforms it into a fully AI-ready prompt.
                <br /><br />
                Whether you're writing blogs, creating social media posts,
                or working on any creative project — AI helps you express
                your thoughts clearly and professionally.
                <br /><br />
                See how your simple ideas become "AI-ready prompts" —
                ready to use instantly with Gemini or any other model.
                Your words, our intelligence — together, we craft the
                perfect prompt.
              </p>
            </section>

            <div className="main-img" />

            <section className="showcase-section">
              <div className="second-hero" />

              <h1 className="second-heading">
                Get All the Type of prompt You Need
                <br />
                In a Single Platform
              </h1>

              <div
                className="second-btn"
                onClick={() => router.push('/chat')}
              >
                <span>GET STARTED</span>
                <img src="/assets/arrow.png" alt="Arrow" />
              </div>
            </section>

            <section className="desktop-faq-wrapper">
              <FaqAccordion sectionId="faq-section" />
            </section>
          </main>
        </ScaleFit>
      </div>

      {/* ================= MOBILE ================= */}

      <main className="mobile-only">
        <div className="m-hero-bg" />

        <section className="m-hero">
          <h1 className="m-heading">
            Get AI-generated production-ready prompts in seconds
          </h1>

          <div className="m-btn-big" onClick={() => router.push('/chat')}>
            <span>GET STARTED</span>
            <img src="/assets/arrow.png" alt="Arrow" />
          </div>
        </section>

        <section className="m-content-section">
          <h2 className="m-section-title">
            A Seamless User Experience
          </h2>

          <p className="m-description">
            This is the place where you simply write your imagination,
            and AI transforms it into a fully AI-ready prompt.
            Whether you're writing blogs, social posts, or any creative
            project — AI helps you express your thoughts clearly and
            professionally.
          </p>

          <div className="m-feature-grid">
            <FeatureCard number="01" header="FEATURE 1" body="Ready-to-use prompts." light />
            <FeatureCard number="02" header="FEATURE 2" body="Your ideas stay private." />
            <FeatureCard number="03" header="FEATURE 3" body="Instant, quality results." light />
            <FeatureCard number="04" header="FEATURE 4" body="Keep and reuse your best ones." />
            <FeatureCard number="05" header="FEATURE 5" body="Think ideas, not words." light />
            <FeatureCard number="06" header="FEATURE 6" body="Copy & use anywhere fast." />
          </div>
        </section>

        <div className="m-ambient-glow" />

        <section className="m-content-section m-professional">
          <h2 className="m-section-title">
            Built by Professionals, for Professionals
          </h2>

          <p className="m-description">
            This is the place where you simply write your imagination,
            and AI transforms it into a fully AI-ready prompt.
            <br /><br />
            Whether you're writing blogs, creating social media posts,
            or working on any creative project — AI helps you express
            your thoughts clearly and professionally.
            <br /><br />
            See how your simple ideas become "AI-ready prompts" —
            ready to use instantly with Gemini or any other model.
          </p>

          <h1 className="m-second-heading">
            Get All the Type of prompt You Need In a Single Platform
          </h1>

          <div className="m-btn-big" onClick={() => router.push('/chat')}>
            <span>GET STARTED</span>
            <img src="/assets/arrow.png" alt="Arrow" />
          </div>
        </section>

        <section className="m-faq">
          <FaqAccordion sectionId="faq-section-mobile" />
        </section>
      </main>

      <style jsx global>{`
        html,
        body {
          margin: 0;
          padding: 0;
          background: #020202;
          color: #fff;
          scroll-behavior: smooth;
          overflow-x: hidden;
        }

        *,
        *::before,
        *::after {
          box-sizing: border-box;
        }

        .nav-fixed svg,
        .nav-fixed img[alt*='user' i],
        .nav-fixed img[alt*='login' i],
        .nav-fixed a:last-of-type svg {
          display: none !important;
        }
      `}</style>

      <style jsx>{`
        .nav-fixed {
          position: fixed;
          top: 31px;
          right: 240px;
          z-index: 9999;
        }

        .btn-top {
          position: fixed;
          top: 31px;
          right: 55px;
          width: 144px;
          height: 37px;
          display: flex;
          align-items: center;
          justify-content: center;
          border: 1px solid #fff;
          border-radius: 50px;
          background: #000;
          color: #fff;
          font-size: 15px;
          font-weight: 700;
          cursor: pointer;
          z-index: 9999;
          transition: background 0.25s ease, color 0.25s ease;
        }

        .btn-top:hover {
          background: #fff;
          color: #000;
        }

        .desktop-only {
          display: block;
        }

        .mobile-only {
          display: none;
        }

        /* ---------------- DESKTOP PAGE ---------------- */

        .desktop-page {
          position: relative;
          width: 1920px;
          min-height: 3520px;
          overflow: hidden;
          background: #020202;
        }

        .hero-bg {
          position: absolute;
          inset: 0 0 auto;
          height: 900px;
          background: url('/assets/video.gif') center / cover no-repeat;
          filter: blur(35px);
          opacity: 0.92;
          z-index: 0;
        }

        .hero-section {
          position: relative;
          height: 900px;
          z-index: 1;
        }

        .main-heading {
          position: absolute;
          top: 328px;
          left: 369px;
          margin: 0;
          color: #fff;
          font-size: 130px;
          font-weight: 900;
          line-height: 0.95;
          letter-spacing: -4px;
        }

        .sub-heading {
          position: absolute;
          top: 827px;
          left: 1184px;
          margin: 0;
          color: #fff;
          font-size: 22px;
          font-weight: 700;
        }

        .btn-big {
          position: absolute;
          top: 814px;
          left: 1630px;
          width: 204px;
          height: 53px;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 12px;
          border-radius: 50px;
          background: #fff;
          color: #000;
          font-size: 18px;
          font-weight: 800;
          cursor: pointer;
          z-index: 2;
          transition: transform 0.25s ease, background 0.25s ease;
        }

        .btn-big:hover,
        .second-btn:hover,
        .m-btn-big:hover {
          transform: translateY(-2px);
        }

        .btn-big img,
        .second-btn img,
        .m-btn-big img {
          width: 20px;
          height: 20px;
          object-fit: contain;
        }

        .experience-section {
          position: relative;
          height: 720px;
          z-index: 2;
        }

        .section-title {
          margin: 0;
          color: #fff;
          font-size: 50px;
          line-height: 1.08;
          font-weight: 900;
          letter-spacing: -1.5px;
        }

        .experience-title {
          position: absolute;
          top: 145px;
          left: 107px;
        }

        .features-container {
          position: absolute;
          top: 325px;
          left: 107px;
          width: 1700px;
        }

        .feature-row {
          display: flex;
          gap: 35px;
          will-change: transform;
          transition: transform 0.12s linear;
        }

        .row-two {
          margin-top: 52px;
        }

        .feature-card {
          position: relative;
          width: 502px;
          height: 176px;
          flex: 0 0 502px;
          overflow: hidden;
          border-radius: 25px;
        }

        .card-bg-number {
          position: absolute;
          right: -15px;
          bottom: -42px;
          color: rgba(128, 128, 128, 0.15);
          font-size: 160px;
          line-height: 1;
          font-weight: 900;
          pointer-events: none;
        }

        .card-header {
          position: relative;
          z-index: 1;
          height: 66px;
          padding: 21px 32px;
          background: #1e1e1e;
          color: #fff;
          font-size: 20px;
          line-height: 1;
          font-weight: 700;
        }

        .card-body {
          position: relative;
          z-index: 1;
          height: 110px;
          padding: 32px;
          font-size: 25px;
          line-height: 1.1;
          font-weight: 800;
        }

        .white {
          background: #fff;
          color: #000;
        }

        .dark {
          background: #0e0e0e;
          color: #fff;
        }

        /* ---------------- PROFESSIONAL SECTION ---------------- */

        .professional-section {
          position: relative;
          height: 610px;
          z-index: 2;
        }

        .professional-title {
          position: absolute;
          top: 42px;
          left: 107px;
        }

        .description {
          position: absolute;
          top: 145px;
          left: 107px;
          width: 755px;
          margin: 0;
          color: #fff;
          font-size: 25px;
          line-height: 1.7;
          font-weight: 600;
        }

        .main-img {
          position: absolute;
          top: 1430px;
          left: 760px;
          width: 1250px;
          height: 1250px;
          border-radius: 50%;
          background: url('/assets/main12.gif') center / cover no-repeat;
          filter: blur(45px);
          opacity: 0.72;
          pointer-events: none;
          z-index: 0;
        }

        /* ---------------- SECOND SHOWCASE ---------------- */

        .showcase-section {
          position: relative;
          height: 655px;
          z-index: 2;
        }

        .second-hero {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 655px;
          background: url('/assets/video.gif') center / cover no-repeat;
          filter: blur(35px);
          opacity: 0.88;
          z-index: 0;
        }

        .second-heading {
          position: absolute;
          top: 95px;
          left: 130px;
          width: 1650px;
          margin: 0;
          color: #fff;
          font-size: 60px;
          line-height: 1.15;
          font-weight: 900;
          letter-spacing: -1.5px;
          z-index: 1;
        }

        .second-btn {
          position: absolute;
          top: 315px;
          left: 130px;
          width: 170px;
          height: 50px;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
          border-radius: 50px;
          background: #fff;
          color: #000;
          font-size: 14px;
          font-weight: 800;
          cursor: pointer;
          z-index: 1;
          transition: transform 0.25s ease;
        }

        /* ---------------- FAQ ---------------- */

        .desktop-faq-wrapper {
          position: relative;
          z-index: 4;
          width: 1650px;
          margin-left: 130px;
          padding-top: 105px;
          padding-bottom: 90px;
        }

        @media (max-width: 900px) {
          .desktop-only {
            display: none;
          }

          .mobile-only {
            display: block;
            position: relative;
            width: 100%;
            min-height: 100vh;
            padding: 94px 20px 80px;
            overflow: hidden;
          }

          .nav-fixed {
            top: 18px;
            right: 16px;
            transform: scale(0.82);
            transform-origin: top right;
          }

          .btn-top {
            display: none;
          }

          .m-hero-bg {
            position: absolute;
            top: 0;
            left: -15%;
            width: 130%;
            height: 450px;
            background: url('/assets/video.gif') center / cover no-repeat;
            filter: blur(25px);
            opacity: 0.72;
            z-index: 0;
          }

          .m-hero {
            position: relative;
            z-index: 1;
            padding: 28px 0 38px;
            text-align: center;
          }

          .m-heading {
            margin: 0 auto 24px;
            max-width: 620px;
            color: #fff;
            font-size: clamp(30px, 8vw, 44px);
            line-height: 1.12;
            font-weight: 900;
            letter-spacing: -0.8px;
          }

          .m-btn-big {
            width: fit-content;
            min-height: 46px;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 9px;
            margin: 0 auto;
            padding: 13px 23px;
            border-radius: 50px;
            background: #fff;
            color: #000;
            font-size: 14px;
            font-weight: 800;
            cursor: pointer;
            transition: transform 0.25s ease;
          }

          .m-content-section {
            position: relative;
            z-index: 2;
          }

          .m-section-title {
            margin: 52px 0 16px;
            color: #fff;
            font-size: clamp(26px, 7vw, 34px);
            line-height: 1.12;
            font-weight: 900;
            letter-spacing: -0.6px;
          }

          .m-description {
            margin: 0;
            color: #d8d8d8;
            font-size: 15px;
            line-height: 1.7;
            font-weight: 500;
          }

          .m-feature-grid {
            position: relative;
            z-index: 2;
            display: grid;
            grid-template-columns: 1fr;
            gap: 14px;
            margin-top: 28px;
          }

          .m-feature-grid :global(.feature-card) {
            width: 100%;
            height: auto;
            min-height: 116px;
            flex: none;
            border-radius: 18px;
          }

          .m-feature-grid :global(.card-header) {
            height: auto;
            padding: 13px 18px;
            font-size: 14px;
          }

          .m-feature-grid :global(.card-body) {
            height: auto;
            min-height: 70px;
            padding: 21px 18px;
            font-size: 18px;
            line-height: 1.18;
          }

          .m-feature-grid :global(.card-bg-number) {
            right: -8px;
            bottom: -28px;
            font-size: 100px;
          }

          .m-ambient-glow {
            position: absolute;
            top: 39%;
            left: -25%;
            width: 150%;
            height: 520px;
            background: url('/assets/main12.gif') center / cover no-repeat;
            filter: blur(42px);
            opacity: 0.58;
            z-index: 0;
            pointer-events: none;
          }

          .m-professional {
            margin-top: 62px;
          }

          .m-second-heading {
            position: relative;
            z-index: 2;
            margin: 42px 0 22px;
            color: #fff;
            font-size: clamp(28px, 7.5vw, 40px);
            line-height: 1.22;
            font-weight: 900;
            letter-spacing: -0.7px;
          }

          .m-faq {
            position: relative;
            z-index: 3;
            width: 100%;
            margin-top: 72px;
            padding-bottom: 20px;
          }
        }

        @media (max-width: 480px) {
          .mobile-only {
            padding-left: 16px;
            padding-right: 16px;
          }

          .m-heading {
            font-size: 30px;
          }

          .m-section-title {
            font-size: 27px;
          }

          .m-description {
            font-size: 14px;
          }

          .m-second-heading {
            font-size: 28px;
          }

          .m-faq {
            margin-top: 60px;
          }
        }
      `}</style>
    </>
  );
}

function FeatureCard({ number, header, body, light = false }) {
  return (
    <div className="feature-card">
      <div className="card-bg-number">{number}</div>
      <div className="card-header">{header}</div>
      <div className={`card-body ${light ? 'white' : 'dark'}`}>{body}</div>
    </div>
  );
}