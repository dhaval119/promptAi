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
            right: 12px;
            transform: scale(0.78);
            transform-origin: top right;
          }
          .container {
            width: 100%;
            min-height: 0;
            padding: 0 0 80px;
            overflow-x: hidden;
          }
          .title {
            width: 90%;
            left: 5%;
            top: 100px;
            font-size: clamp(24px, 7vw, 32px);
            line-height: 1.2;
          }
          .features-list-wrapper {
            top: 180px;
            width: 100%;
          }
          .features-top-line,
          .row-line {
            width: 92%;
            left: 4%;
          }
          .feature-row {
            min-height: 88px;
            padding-bottom: 8px;
          }
          .feature-row.active {
            min-height: auto;
            padding-bottom: 24px;
          }
          .row-number {
            font-size: 48px;
            width: auto;
            top: 12px;
            left: 4%;
          }
          .row-title {
            width: 58%;
            top: 18px;
            left: 28%;
            font-size: 15px;
            line-height: 1.3;
          }
          .row-description {
            width: 90%;
            top: 60px;
            left: 5%;
            font-size: 13px;
            line-height: 1.55;
            position: relative;
            margin-top: 8px;
          }
        }

        @media (max-width: 480px) {
          .title {
            font-size: 22px;
            top: 90px;
          }
          .row-number {
            font-size: 40px;
          }
          .row-title {
            font-size: 14px;
            left: 26%;
            width: 65%;
          }
        }
      `}</style>
    </>
  );
}
