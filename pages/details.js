import { useEffect, useState } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { updateEmail, updatePassword } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import NavPill from '../components/NavPill';
import Logo from '../components/Logo';
import { auth, db } from '../lib/firebase';
import { useAuth } from '../lib/AuthContext';

export default function Details() {
  const router = useRouter();
  const { user, profile, loading, logout, refreshProfile } = useAuth();

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!loading && !user) router.replace('/login');
  }, [loading, user, router]);

  useEffect(() => {
    if (!user) return;
    const fn =
      (profile && (profile.firstName || profile.first_name)) ||
      (user.displayName ? user.displayName.split(' ')[0] : '') ||
      '';
    const ln =
      (profile && (profile.lastName || profile.last_name)) ||
      (user.displayName ? user.displayName.split(' ').slice(1).join(' ') : '') ||
      '';
    const em = (profile && profile.email) || user.email || '';
    setFirstName(fn);
    setLastName(ln);
    setEmail(em);
  }, [user, profile]);

  async function handleSubmit(e) {
    e.preventDefault();
    setMessage('');
    setErrorMsg('');
    setBusy(true);
    try {
      if (!db || !user) {
        setErrorMsg('Not signed in or Firebase not configured.');
        return;
      }

      await setDoc(
        doc(db, 'users', user.uid),
        {
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          first_name: firstName.trim(),
          last_name: lastName.trim(),
          email: email.trim(),
        },
        { merge: true }
      );

      if (email && email !== user.email && auth?.currentUser) {
        await updateEmail(auth.currentUser, email.trim());
      }
      if (password && auth?.currentUser) {
        await updatePassword(auth.currentUser, password);
      }

      await refreshProfile();
      setPassword('');
      setMessage('Profile updated successfully!');
      setTimeout(() => setMessage(''), 3000);
    } catch (err) {
      if (err.code === 'auth/requires-recent-login') {
        setErrorMsg('Please log out and log back in before changing your email or password.');
      } else {
        setErrorMsg(err.message || 'Something went wrong.');
      }
    } finally {
      setBusy(false);
    }
  }

  async function handleLogout() {
    window.localStorage.removeItem('promptai_conversations');
    await logout();
    router.push('/login');
  }

  function handleCancel() {
    router.push('/chat');
  }

  if (loading || !user) return null;

  return (
    <>
      <Head>
        <title>My Account</title>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1" />
      </Head>
      <div className="container">
        <Logo />
        
        {/* Desktop NavPill */}
        <div className="nav-fixed">
          <NavPill />
        </div>

        {/* Mobile Top-Right Icon Button */}
        <button type="button" className="mobile-cancel-btn" onClick={handleCancel}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
            <path d="M3 3v5h5" />
          </svg>
        </button>

        <main>
          {message ? <div className="success-msg">{message}</div> : null}
          {errorMsg ? <div className="success-msg error-variant">{errorMsg}</div> : null}

          <h1 className="page-title">My Account</h1>
          <div className="section-divider" />

          <section className="section-block desktop-only">
            <h2 className="section-title">Account</h2>
            <p className="section-subtitle">View and edit your personal info below.</p>
          </section>
          <div className="section-divider desktop-only" />

          <section className="section-block">
            <h2 className="section-title">Personal info</h2>
            <p className="section-subtitle mobile-subtitle">Update your personal information.</p>
            <div className="section-divider mobile-only" />
            <p className="section-subtitle desktop-subtitle">Signed in with Firebase - changes are saved to your account.</p>

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
                  <label htmlFor="password" className="desktop-password-label">
                    Password (Leave blank to keep current)
                  </label>
                  <label htmlFor="password" className="mobile-password-label">
                    Password
                  </label>
                  <input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                </div>
              </div>

              <div className="submit-container">
                <button type="button" onClick={handleLogout} className="logout-btn">
                  Logout
                </button>
                <button type="submit" className="submit-btn" disabled={busy}>
                  {busy ? 'Saving...' : 'Submit'}
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
        .mobile-only {
          display: none;
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
        .mobile-subtitle {
          display: none;
        }
        .desktop-subtitle {
          display: block;
        }
        .mobile-password-label {
          display: none;
        }
        .desktop-password-label {
          display: block;
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
        button.submit-btn:disabled {
          opacity: 0.7;
          cursor: default;
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
        .success-msg.error-variant {
          color: #ff4d4d;
        }
        .mobile-cancel-btn {
          display: none;
        }
        .desktop-only {
          display: block;
        }

        /* ==================== MOBILE LAYOUT ==================== */
        @media (max-width: 780px) {
          .container {
            padding: 0 20px;
            max-width: 100%;
            overflow-x: hidden;
          }

          /* Hide NavPill entirely on mobile per requirement */
          .nav-fixed {
            display: none;
          }

          /* Replaced Cancel text with Top-Right Icon */
          .mobile-cancel-btn {
            display: flex;
            align-items: center;
            justify-content: center;
            position: absolute;
            top: 28px;
            right: 20px;
            left: auto;
            z-index: 30;
            background: transparent;
            border: none;
            color: #fff;
            padding: 0;
            cursor: pointer;
          }

          main {
            padding-top: 80px;
            padding-bottom: 40px;
          }

          h1.page-title {
            text-align: center;
            font-size: 20px !important;
            font-weight: 700;
            margin-bottom: 24px;
            letter-spacing: 0;
          }

          .section-divider {
            border-top: 1px solid #444;
            margin: 0 0 24px 0;
          }

          .mobile-only {
            display: block;
            margin-top: 16px;
            margin-bottom: 24px;
          }

          .desktop-only {
            display: none !important;
          }

          .section-block {
            padding: 0;
          }

          h2.section-title {
            font-size: 18px;
            font-weight: 700;
            margin-bottom: 6px;
          }

          .mobile-subtitle {
            display: block;
            font-size: 12px;
            font-weight: 500;
            color: #b0b0b0;
            margin-bottom: 0;
            opacity: 0.9;
          }

          .desktop-subtitle {
            display: none;
          }

          .form-grid {
            grid-template-columns: 1fr;
            gap: 0;
            margin-top: 8px;
          }

          .form-group {
            margin-bottom: 20px;
          }

          label {
            font-size: 14px;
            font-weight: 700;
            margin-bottom: 8px;
          }

          .desktop-password-label {
            display: none;
          }

          .mobile-password-label {
            display: block;
          }

          input[type='text'],
          input[type='email'],
          input[type='password'] {
            height: 44px;
            padding: 0 18px;
            border-radius: 50px;
            font-size: 15px;
            border: 1px solid #fff;
            background-color: transparent;
          }

          .submit-container {
            margin-top: 32px;
            padding-bottom: 40px;
            flex-direction: row;
            justify-content: center;
            gap: 12px;
          }

          button.logout-btn,
          button.submit-btn {
            width: 120px;
            min-width: 120px;
            height: 42px;
            padding: 0;
            font-size: 14px;
            font-weight: 700;
            border-radius: 50px;
            background-color: transparent;
            color: #fff;
            border: 1px solid #fff;
          }
        }

        @media (max-width: 480px) {
          .container {
            padding: 0 16px;
          }
          main {
            padding-top: 75px;
          }
          .mobile-cancel-btn {
            top: 26px;
            right: 16px;
          }
        }
      `}</style>
    </>
  );
}