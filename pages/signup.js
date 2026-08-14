import { useEffect, useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { createUserWithEmailAndPassword, signInWithPopup, updateProfile } from 'firebase/auth';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db, googleProvider } from '../lib/firebase';
import { useAuth } from '../lib/AuthContext';

function friendlyError(code) {
  switch (code) {
    case 'auth/email-already-in-use':
      return 'Email already registered. Please login.';
    case 'auth/invalid-email':
      return 'Invalid email format.';
    case 'auth/weak-password':
      return 'Password must be at least 8 characters.';
    default:
      return 'Something went wrong. Please try again.';
  }
}

export default function Signup() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!loading && user) router.replace('/');
  }, [loading, user, router]);

  async function ensureUserDoc(fbUser) {
    if (!db) return;
    const ref = doc(db, 'users', fbUser.uid);
    const snap = await getDoc(ref);
    if (!snap.exists()) {
      const names = (fbUser.displayName || 'User').trim().split(' ');
      await setDoc(ref, {
        firstName: names[0] || 'User',
        lastName: names.slice(1).join(' ') || '',
        email: fbUser.email || '',
        signupMethod: 'google',
        createdAt: serverTimestamp(),
      });
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setErrorMsg('');

    if (!firstName.trim() || !lastName.trim() || !email.trim() || !password) {
      setErrorMsg('Please fill in all fields.');
      return;
    }
    if (password.length < 8) {
      setErrorMsg('Password must be at least 8 characters.');
      return;
    }

    setBusy(true);
    try {
      if (!auth || !db) {
        setErrorMsg('Firebase is not configured. Add NEXT_PUBLIC_FIREBASE_* keys in .env.local');
        return;
      }
      const cred = await createUserWithEmailAndPassword(auth, email.trim(), password);
      await updateProfile(cred.user, { displayName: `${firstName.trim()} ${lastName.trim()}` });
      await setDoc(doc(db, 'users', cred.user.uid), {
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        email: email.trim(),
        signupMethod: 'manual',
        createdAt: serverTimestamp(),
      });
      router.push('/');
    } catch (err) {
      setErrorMsg(friendlyError(err.code));
    } finally {
      setBusy(false);
    }
  }

  async function handleGoogleSignup() {
    setErrorMsg('');
    setBusy(true);
    try {
      if (!auth || !googleProvider) {
        setErrorMsg('Firebase is not configured. Add NEXT_PUBLIC_FIREBASE_* keys in .env.local');
        return;
      }
      const result = await signInWithPopup(auth, googleProvider);
      await ensureUserDoc(result.user);
      router.push('/');
    } catch (err) {
      setErrorMsg('Google Error: ' + (err.message || 'Something went wrong.'));
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <Head>
        <title>Sign Up Account</title>
      </Head>
      <div className="v492_121">
        <div className="custom-logo">
          <img src="/assets/ailogo.png" alt="AI Logo" />
        </div>
        <div className="zoom-wrapper">
          <div className="v545_33" />
          <div className="v494_25">
            <form onSubmit={handleSubmit}>
              <span className="v492_148">
                Let&apos;s Begin <br />
                Something New
              </span>

              <span className="v494_9">First Name</span>
              <div className="input-group v494_11">
                <input
                  type="text"
                  name="firstname"
                  placeholder="eg. Dhaval"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  required
                />
              </div>

              <span className="v494_10">Last Name</span>
              <div className="input-group v494_12">
                <input
                  type="text"
                  name="lastname"
                  placeholder="eg. Soni"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  required
                />
              </div>

              <span className="v494_15">Email</span>
              <div className="input-group v494_16">
                <input
                  type="email"
                  name="email"
                  placeholder="eg. soni@gmail.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>

              <span className="v494_18">Password</span>
              <div className="input-group v494_19">
                <input
                  type="password"
                  name="password"
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>

              <span className="v494_21">Must be at least 8 characters</span>
              <button type="submit" name="signup_submit" className="v494_22" disabled={busy}>
                {busy ? 'Please wait...' : 'Sign Up'}
              </button>

              {errorMsg ? <div className="error-message">{errorMsg}</div> : null}
            </form>

            <div className="firebase-divider">— OR —</div>

            <div className="firebase-options">
              <button type="button" className="firebase-btn" onClick={handleGoogleSignup} disabled={busy}>
                <img src="/assets/google.png" style={{ width: 22, height: 22 }} alt="Google" />
                Continue with Google
              </button>
            </div>

            <div className="v494_24">
              <Link href="/login">Already have an account? Log in</Link>
            </div>
          </div>
        </div>
      </div>

      <style jsx global>{`
        html,
        body {
          font-family: 'Inter', sans-serif;
          background: #000000ff;
          color: white;
          overflow: hidden;
          font-size: 14px;
          height: 100vh;
          width: 100vw;
        }
        input:-webkit-autofill,
        input:-webkit-autofill:hover,
        input:-webkit-autofill:focus,
        input:-webkit-autofill:active {
          -webkit-box-shadow: 0 0 0 30px #1a1a1a inset !important;
          -webkit-text-fill-color: white !important;
        }
      `}</style>

      <style jsx>{`
        .v492_121 {
          width: 100%;
          height: 100%;
          background: #020202;
          position: relative;
          display: flex;
          justify-content: center;
          align-items: center;
        }
        .zoom-wrapper {
          display: flex;
          justify-content: center;
          align-items: center;
          gap: 120px;
          transform: scale(0.8);
          transform-origin: center center;
          width: 100%;
        }
        .custom-logo {
          position: absolute;
          left: 26px;
          top: 23px;
          z-index: 100;
        }
        .custom-logo img {
          height: 50px;
          width: 50px;
          display: block;
        }
        .v545_33 {
          width: 703px;
          height: 719px;
          background: url('/assets/signup.png') center/cover no-repeat;
          border-radius: 30px;
          flex-shrink: 0;
          box-shadow: 0 0 50px rgba(255, 255, 255, 0.05);
        }
        .v494_25 {
          width: 489px;
          height: 720px;
          position: relative;
          flex-shrink: 0;
        }
        .v492_148 {
          position: absolute;
          top: 0;
          left: 0px;
          font-weight: bold;
          font-size: 42px;
          color: white;
          line-height: 1.2;
        }
        .input-group {
          position: absolute;
          background: #1a1a1a;
          border-radius: 8px;
          padding: 0 18px;
          display: flex;
          align-items: center;
          height: 52px;
        }
        .input-group :global(input) {
          width: 100%;
          height: 100%;
          background: transparent;
          border: none;
          outline: none;
          color: white;
          font-weight: bold;
          font-size: 15px;
          font-family: 'Inter', sans-serif;
        }
        .v494_9 {
          position: absolute;
          top: 150px;
          left: 0;
          font-weight: bold;
          font-size: 16px;
          color: white;
        }
        .v494_11 {
          width: 231px;
          top: 180px;
          left: 0;
        }
        .v494_10 {
          position: absolute;
          top: 150px;
          left: 250px;
          font-weight: bold;
          font-size: 16px;
          color: white;
        }
        .v494_12 {
          width: 231px;
          top: 180px;
          left: 253px;
        }
        .v494_15 {
          position: absolute;
          top: 255px;
          left: 0;
          font-weight: bold;
          font-size: 16px;
          color: white;
        }
        .v494_16 {
          width: 484px;
          top: 289px;
          left: 0;
        }
        .v494_18 {
          position: absolute;
          top: 360px;
          left: 0;
          font-weight: bold;
          font-size: 16px;
          color: white;
        }
        .v494_19 {
          width: 484px;
          top: 395px;
          left: 0;
        }
        .v494_21 {
          position: absolute;
          top: 475px;
          left: 0;
          font-weight: bold;
          font-size: 13px;
          color: rgba(255, 255, 255, 0.75);
        }
        .v494_22 {
          width: 484px;
          height: 53px;
          background: #1a1a1a;
          color: white;
          border-radius: 15px;
          position: absolute;
          top: 525px;
          left: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: all 0.3s ease;
          font-weight: bold;
          font-size: 18px;
          border: none;
          outline: none;
          font-family: 'Inter', sans-serif;
        }
        .v494_22:hover {
          background: white;
          color: black;
        }
        .v494_22:disabled {
          opacity: 0.7;
          cursor: default;
        }
        .v494_24 {
          position: absolute;
          top: 710px;
          width: 100%;
          text-align: center;
          font-weight: bold;
          font-size: 13px;
          color: white;
        }
        .v494_24 :global(a) {
          color: white;
          text-decoration: none;
        }
        .error-message {
          position: absolute;
          top: 480px;
          left: 0;
          width: 484px;
          text-align: center;
          color: #ff4d4d;
          font-weight: bold;
          font-size: 13px;
          background: rgba(0, 0, 0, 0.8);
          padding: 8px 15px;
          border-radius: 8px;
          z-index: 10;
        }
        .firebase-divider {
          position: absolute;
          top: 590px;
          left: 0;
          width: 484px;
          text-align: center;
          color: #666;
          font-size: 13px;
        }
        .firebase-options {
          position: absolute;
          top: 620px;
          left: 0;
          width: 100%;
        }
        .firebase-btn {
          width: 484px;
          height: 53px;
          margin: 8px auto;
          background: #1a1a1a;
          color: white;
          border-radius: 15px;
          border: 1px solid #333;
          font-weight: bold;
          font-size: 16px;
          cursor: pointer;
          transition: all 0.3s;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
          font-family: 'Inter', sans-serif;
        }
        .firebase-btn:hover {
          background: white;
          color: black;
        }
        .firebase-btn:disabled {
          opacity: 0.7;
          cursor: default;
        }
      `}</style>
    </>
  );
}