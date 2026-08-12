import { useState } from 'react';
import Head from 'next/head';
import NavPill from '../components/NavPill';
import Logo from '../components/Logo';

const ROWS = [
  {
    n: '01',
    title: 'Natural Language Input Support',
    desc: 'Users can enter their thoughts, questions, or situations in any language, in whatever way feels natural to them.',
  },
  {
    n: '02',
    title: 'Clean & User-Friendly Output',
    desc: 'The output is formatted perfectly - clear, structured, and ready to paste straight into any AI model.',
  },
  {
    n: '03',
    title: 'Multilingual Compatibility',
    desc: 'Communicate in your preferred language and still get a polished, professional English prompt back.',
  },
  {
    n: '04',
    title: 'Situation-to-Prompt Conversion',
    desc: 'Simply describe a scenario and Prompt AI turns it into a precise, high-quality prompt automatically.',
  },
  {
    n: '05',
    title: 'Time-Saving Workflow',
    desc: 'Streamline your daily tasks - stop rewriting prompts by hand and let Prompt AI do the heavy lifting.',
  },
];

export default function Features() {
  const [active, setActive] = useState(0);

  return (
    <>
      <Head>
        <title>Why Prompt AI Stands Out</title>
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
          outline: 1px rgba(169, 169, 169, 0.75) solid;
          outline-offset: -0.5px;
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
        .row-line {
          width: 79.78vw;
          height: 0;
          position: absolute;
          bottom: 0;
          left: 3.89vw;
          outline: 1px rgba(169, 169, 169, 0.75) solid;
          outline-offset: -0.5px;
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
            right: 16px;
            transform: scale(0.8);
            transform-origin: top right;
          }
          .container {
            width: 92vw;
            min-height: 0;
            padding-bottom: 60px;
          }
          .title {
            width: 84vw;
            left: 4vw;
            top: 110px;
            font-size: clamp(26px, 8vw, 34px);
          }
          .features-list-wrapper {
            top: 190px;
          }
          .features-top-line,
          .row-line {
            width: 92vw;
            left: 4vw;
          }
          .feature-row {
            min-height: 90px;
          }
          .feature-row.active {
            min-height: 230px;
          }
          .row-number {
            font-size: 60px;
            width: auto;
            top: 14px;
            left: 4vw;
          }
          .row-title {
            width: 60vw;
            top: 20px;
            left: 30vw;
            font-size: 16px;
          }
          .row-description {
            width: 84vw;
            top: 65px;
            left: 4vw;
            font-size: 13px;
            line-height: 1.6;
          }
        }
      `}</style>
    </>
  );
}
