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

  // No account -> send to login, same as the old PHP session check.
  useEffect(() => {
    if (!loading && !user) router.replace('/login');
  }, [loading, user, router]);

  // Fill the form from the logged-in user's Firestore profile.
  useEffect(() => {
    if (user) {
      setFirstName(profile?.firstName || '');
      setLastName(profile?.lastName || '');
      setEmail(profile?.email || user.email || '');
    }
  }, [user, profile]);

  async function handleSubmit(e) {
    e.preventDefault();
    setMessage('');
    setErrorMsg('');
    setBusy(true);
    try {
      await setDoc(
        doc(db, 'users', user.uid),
        { firstName, lastName, email },
        { merge: true }
      );

      if (email && email !== user.email) {
        await updateEmail(auth.currentUser, email);
      }
      if (password) {
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
    // Local chat cache was the guest/offline fallback - clear it on logout too.
    window.localStorage.removeItem('promptai_conversations');
    await logout();
    router.push('/login');
  }

  if (loading || !user) return null;

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
          {errorMsg ? <div className="success-msg error-variant">{errorMsg}</div> : null}
          <h1 className="page-title">My Account</h1>
          <div className="section-divider" />
          <section className="section-block">
            <h2 className="section-title">Account</h2>
            <p className="section-subtitle">View and edit your personal info below.</p>
          </section>
          <div className="section-divider" />
          <section className="section-block">
            <h2 className="section-title">Personal info</h2>
            <p className="section-subtitle">Signed in with Firebase - changes are saved to your account.</p>
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
