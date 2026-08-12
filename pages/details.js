import { useEffect, useState } from 'react';
import Head from 'next/head';
import NavPill from '../components/NavPill';
import Logo from '../components/Logo';

const PROFILE_KEY = 'promptai_profile';

export default function Details() {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(PROFILE_KEY);
      if (raw) {
        const p = JSON.parse(raw);
        setFirstName(p.firstName || '');
        setLastName(p.lastName || '');
        setEmail(p.email || '');
      }
    } catch {}
  }, []);

  function handleSubmit(e) {
    e.preventDefault();
    window.localStorage.setItem(
      PROFILE_KEY,
      JSON.stringify({ firstName, lastName, email })
    );
    // Note: there's no backend/auth anymore, so password is not stored anywhere.
    setPassword('');
    setMessage('Profile updated successfully!');
    setTimeout(() => setMessage(''), 3000);
  }

  function handleReset() {
    window.localStorage.removeItem(PROFILE_KEY);
    window.localStorage.removeItem('promptai_conversations');
    setFirstName('');
    setLastName('');
    setEmail('');
    setPassword('');
    setMessage('Local data cleared.');
    setTimeout(() => setMessage(''), 3000);
  }

  return (
    <>
      <Head>
        <title>My Account</title>
      </Head>
      <div className="container">
        <Logo />
        <div className="nav-fixed">
          <NavPill />
        </div>
        <main>
          {message ? <div className="success-msg">{message}</div> : null}
          <h1 className="page-title">My Account</h1>
          <div className="section-divider" />
          <section className="section-block">
            <h2 className="section-title">Account</h2>
            <p className="section-subtitle">View and edit your personal info below.</p>
          </section>
          <div className="section-divider" />
          <section className="section-block">
            <h2 className="section-title">Personal info</h2>
            <p className="section-subtitle">
              Saved locally in your browser - this build has no login/database.
            </p>
            <form onSubmit={handleSubmit}>
              <div className="form-grid">
                <div className="form-group">
                  <label htmlFor="first_name">First name</label>
                  <input
                    id="first_name"
                    type="text"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    required
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="last_name">Last name</label>
                  <input
                    id="last_name"
                    type="text"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    required
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="email">E mail</label>
                  <input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="password">Password (Leave blank to keep current)</label>
                  <input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter new password"
                  />
                </div>
              </div>
              <div className="submit-container">
                <button type="button" onClick={handleReset} className="logout-btn">
                  Reset
                </button>
                <button type="submit" className="submit-btn">
                  Submit
                </button>
              </div>
            </form>
          </section>
        </main>
      </div>

      <style jsx global>{`
        html,
        body {
          background: #000;
        }
      `}</style>

      <style jsx>{`
        .container {
          width: 100%;
          min-height: 100vh;
          position: relative;
          padding: 0 40px;
        }
        .nav-fixed {
          position: fixed;
          top: 31px;
          right: 86px;
          z-index: 20;
        }
        main {
          width: 100%;
          max-width: 1350px;
          margin: 0 auto;
          padding-top: 110px;
        }
        h1.page-title {
          text-align: center;
          font-size: 32px;
          font-weight: 700;
          margin-bottom: 50px;
          letter-spacing: -0.5px;
          color: #fff;
        }
        .section-divider {
          border: 0;
          border-top: 1px solid #333;
          margin: 30px 0;
          width: 100%;
        }
        h2.section-title {
          font-size: 24px;
          font-weight: 700;
          margin-bottom: 8px;
          color: #fff;
        }
        p.section-subtitle {
          color: #b0b0b0;
          font-size: 16px;
          font-weight: 500;
          margin-bottom: 20px;
        }
        .form-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          column-gap: 60px;
          row-gap: 20px;
          margin-top: 40px;
        }
        .form-group {
          display: flex;
          flex-direction: column;
        }
        label {
          font-size: 14px;
          font-weight: 700;
          margin-bottom: 10px;
          display: block;
          color: #fff;
        }
        input[type='text'],
        input[type='email'],
        input[type='password'] {
          background-color: transparent;
          border: 1px solid #fff;
          border-radius: 50px;
          padding: 12px 20px;
          font-size: 14px;
          color: #fff;
          width: 100%;
          outline: none;
          transition: border-color 0.2s;
        }
        input:focus {
          border-color: #ccc;
        }
        .submit-container {
          display: flex;
          justify-content: flex-end;
          gap: 20px;
          margin-top: 60px;
          padding-bottom: 60px;
        }
        button.submit-btn {
          background-color: #000;
          color: #fff;
          border: 1px solid #fff;
          border-radius: 50px;
          padding: 14px 40px;
          font-size: 16px;
          font-weight: 700;
          cursor: pointer;
          min-width: 140px;
          transition: background-color 0.2s, color 0.2s;
        }
        button.submit-btn:hover {
          background-color: #fff;
          color: #000;
        }
        button.logout-btn {
          background-color: #000;
          color: #fff;
          border: 1px solid #fff;
          border-radius: 50px;
          padding: 14px 40px;
          font-size: 16px;
          font-weight: 700;
          cursor: pointer;
          min-width: 140px;
          transition: background-color 0.2s, color 0.2s, border-color 0.2s;
        }
        button.logout-btn:hover {
          background-color: #ff4444;
          color: #fff;
          border-color: #ff4444;
        }
        .success-msg {
          text-align: center;
          color: #4caf50;
          margin-bottom: 20px;
          font-weight: bold;
        }

        @media (max-width: 780px) {
          .container {
            padding: 0 20px;
          }
          .nav-fixed {
            right: 16px;
            transform: scale(0.8);
            transform-origin: top right;
          }
          main {
            padding-top: 100px;
          }
          .form-grid {
            grid-template-columns: 1fr;
          }
          .submit-container {
            flex-direction: column-reverse;
          }
          button.submit-btn,
          button.logout-btn {
            width: 100%;
          }
        }
      `}</style>
    </>
  );
}
