import { useState } from 'react';
import Head from 'next/head';
import NavPill from '../components/NavPill';
import Logo from '../components/Logo';

const ROWS = [
  {
    n: '01',
    title: 'Any Language, Any Mess',
    desc: 'Type in English, Hindi, Hinglish or pure chaos. Broken grammar? Typos? We have seen worse. Honestly.',
  },
  {
    n: '02',
    title: 'Clean, Paste-Ready Output',
    desc: 'Clear, structured and ready to paste into any AI. No editing, no sighing, no "make it better".',
  },
  {
    n: '03',
    title: 'One-Click Launch',
    desc: 'Open the finished prompt straight in ChatGPT, Gemini or Claude. Your clipboard can finally retire.',
  },
  {
    n: '04',
    title: 'Chat History That Remembers',
    desc: 'Rename, pin and delete your chats, so your best prompts never vanish into the void like your motivation.',
  },
  {
    n: '05',
    title: 'Situation-to-Prompt Magic',
    desc: 'Describe a scenario and get a precise, high-quality prompt. Prompt engineering without the engineering.',
  },
  {
    n: '06',
    title: 'Google or Email Login',
    desc: 'Sign in with Google in two clicks, or use email and password if you enjoy typing them.',
  },
  {
    n: '07',
    title: 'Works On Your Phone Too',
    desc: 'Fully mobile-friendly, with swipe gestures for the sidebar. Yes, we thought of the couch.',
  },
  {
    n: '08',
    title: '3 Free Prompts A Day',
    desc: 'Free daily prompts, no card, no catch. The dev spent the rest of the budget on emails.',
  },
];

export default function Features() {
  const [active, setActive] = useState(0);

  return (
    <>
      <Head>
        <title>Why Prompt AI Stands Out</title>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1" />
      </Head>
      <div className="desktop">
        <Logo />
        <div className="nav-fixed">
          <NavPill />
        </div>

        <div className="container">
          <div className="title">Why Prompt AI Stands Out</div>
          <div className="features-list-wrapper">
            <div className="features-top-line" />
            {ROWS.map((row, i) => (
              <div
                key={row.n}
                className={`feature-row ${i % 2 === 0 ? 'odd' : 'even'} ${active === i ? 'active' : ''}`}
                onClick={() => setActive(active === i ? -1 : i)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    setActive(active === i ? -1 : i);
                  }
                }}
                role="button"
                tabIndex={0}
                aria-expanded={active === i}
              >
                <div className="row-number">{row.n}</div>
                <div className="row-title">{row.title}</div>
                <div className="row-description">{row.desc}</div>
                <div className="row-line" />
              </div>
            ))}
          </div>
        </div>
      </div>

      <style jsx global>{`
        html,
        body {
          background: #020202;
        }
      `}</style>

      <style jsx>{`
        .desktop {
          position: relative;
          width: 100%;
          min-height: 100vh;
          background: #000;
        }
        .nav-fixed {
          position: fixed;
          top: 31px;
          right: 86px;
          z-index: 20;
        }
        .container {
          width: 87.5vw;
          max-width: 1680px;
          min-height: 60vw;
          position: relative;
          background: black;
          margin: 0 auto;
          padding: 0 0 10vw;
        }
        .title {
          width: 47.8vw;
          left: 4.22vw;
          top: 7.96vw;
          position: absolute;
          color: white;
          font-size: clamp(28px, 3vw, 58px);
        }
        .features-list-wrapper {
          position: absolute;
          top: 16.32vw;
          left: 0;
          width: 100%;
        }
        .features-top-line {
          width: 79.78vw;
          height: 0;
          position: absolute;
          top: 0;
          left: 3.89vw;
          border-top: 1px solid rgba(169, 169, 169, 0.55);
          box-sizing: border-box;
        }
        .feature-row {
          position: relative;
          width: 100%;
          min-height: 13vw;
          overflow: hidden;
          transition: min-height 0.5s ease-in-out, background-color 0.3s;
          cursor: pointer;
        }
        .feature-row.active {
          min-height: 29vw;
          background-color: #050505;
        }
        .feature-row:focus-visible {
          outline: 1px solid rgba(255, 255, 255, 0.7);
          outline-offset: -3px;
        }
        .row-line {
          width: 79.78vw;
          height: 1px;
          position: absolute;
          bottom: 0;
          left: 3.89vw;
          background: rgba(169, 169, 169, 0.55);
        }
        .row-number {
          position: absolute;
          color: white;
          font-size: clamp(60px, 21.1vw, 320px);
          width: 29.3vw;
          top: 0.46vw;
          left: 3.89vw;
          pointer-events: none;
          clip-path: inset(0 0 50% 0);
          transition: clip-path 0.5s ease-in-out;
        }
        .feature-row.active .row-number {
          clip-path: inset(0 0 0% 0);
        }
        .row-title {
          position: absolute;
          color: white;
          font-size: clamp(18px, 2.1vw, 34px);
          width: 47.8vw;
          top: 8vw;
          left: 34.74vw;
          pointer-events: none;
          font-weight: 600;
        }
        .row-description {
          position: absolute;
          color: white;
          font-size: clamp(13px, 1.31vw, 18px);
          line-height: 1.7;
          letter-spacing: 0.02vw;
          width: 26.76vw;
          top: 12vw;
          left: 34.74vw;
          opacity: 0;
          transition: opacity 0.3s ease 0.2s;
        }
        .feature-row.active .row-description {
          opacity: 1;
        }
        .feature-row.odd {
          background: black;
        }
        .feature-row.even {
          background: #030303;
        }

        @media (max-width: 900px) {
          .nav-fixed {
            right: 12px;
            transform: scale(0.78);
            transform-origin: top right;
          }
          .container {
            width: 100%;
            max-width: none;
            min-height: calc(100vh + 350px);
            padding: 0 0 80px;
            overflow-x: hidden;
          }
          .title {
            width: 90%;
            left: 4%;
            top: 84px;
            font-size: clamp(24px, 5vw, 32px);
            line-height: 1.2;
          }
          .features-list-wrapper {
            top: 158px;
            width: 100%;
          }
          .features-top-line,
          .row-line {
            width: 94%;
            left: 3%;
          }
          .feature-row {
            min-height: clamp(112px, 18.7vw, 150px);
            padding: 0;
          }
          .feature-row.active {
            min-height: clamp(205px, 31.5vw, 250px);
            padding: 0;
          }
          .row-number {
            font-size: clamp(135px, 26vw, 200px);
            line-height: 0.9;
            width: 36%;
            top: 0;
            left: 3%;
            clip-path: inset(0 0 36% 0);
          }
          .feature-row.active .row-number {
            clip-path: inset(0 0 0 0);
          }
          .row-title {
            width: 57%;
            top: 6vw;
            left: 39%;
            font-size: clamp(14px, 2.2vw, 18px);
            line-height: 1.3;
          }
          .row-description {
            width: 54%;
            top: 11vw;
            left: 39%;
            font-size: clamp(11px, 1.8vw, 14px);
            line-height: 1.45;
            letter-spacing: 0;
            padding-right: 2%;
            box-sizing: border-box;
          }
        }

        @media (max-width: 480px) {
          .title {
            top: 76px;
            font-size: 22px;
          }
          .features-list-wrapper {
            top: 143px;
          }
          .feature-row {
            min-height: 112px;
          }
          .feature-row.active {
            min-height: 218px;
          }
          .row-number {
            font-size: clamp(118px, 31vw, 145px);
            width: 36%;
            left: 2.5%;
          }
          .row-title {
            top: 23px;
            left: 39%;
            width: 57%;
            font-size: 13px;
          }
          .row-description {
            top: 62px;
            left: 39%;
            width: 56%;
            font-size: 10.5px;
            line-height: 1.35;
          }
        }
      `}</style>
    </>
  );
}
