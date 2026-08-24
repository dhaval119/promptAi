import { useEffect, useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { 
  createUserWithEmailAndPassword, 
  signInWithPopup, 
  updateProfile,
  sendEmailVerification 
} from 'firebase/auth';
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
  const [successMsg, setSuccessMsg] = useState('');
  const [busy, setBusy] = useState(false);

  // Helper to check if current view is mobile or desktop based on window width
  const getTargetRoute = () => {
    if (typeof window !== 'undefined' && window.innerWidth <= 900) {
      return '/chat';
    }
    return '/';
  };

  useEffect(() => {
    if (!loading && user) router.replace(getTargetRoute());
  }, [loading, user, router]);

  async function ensureUserDoc(fbUser) {
    if (!db) return;
    const ref = doc(db, 'users', fbUser.uid);
    const snap = await getDoc(ref);
    if (!snap.exists()) {
      const names = (fbUser.displayName || 'User').trim().split(' ');
      await setDoc(ref, {
        first_name: names[0] || 'User',
        last_name: names.slice(1).join(' ') || '',
        email: fbUser.email || '',
        signup_method: 'google',
        usage_count: 0,
        last_reset: serverTimestamp(),
        last_login_at: serverTimestamp(),
        created_at: serverTimestamp(),
      });
    }
  }

  async function handleSubmit(e) {
    if (e && e.preventDefault) e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

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
      
      await updateProfile(cred.user, {
        displayName: `${firstName.trim()} ${lastName.trim()}`,
      });

      // Send Email Verification (Free Firebase method)
      await sendEmailVerification(cred.user);

      await setDoc(doc(db, 'users', cred.user.uid), {
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        email: email.trim(),
        signup_method: 'manual',
        usage_count: 0,
        last_reset: serverTimestamp(),
        last_login_at: serverTimestamp(),
        created_at: serverTimestamp(),
        email_verified: false,
      });

      setSuccessMsg('Account created! Verification email sent. Please check your inbox.');
      
      // Optional: redirect after short delay
      setTimeout(() => {
        router.push(getTargetRoute());
      }, 2500);

    } catch (err) {
      setErrorMsg(friendlyError(err.code));
    } finally {
      setBusy(false);
    }
  }

  async function handleGoogleSignup(e) {
    if (e && e.preventDefault) e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');
    setBusy(true);
    try {
      if (!auth || !googleProvider) {
        setErrorMsg('Firebase is not configured. Add NEXT_PUBLIC_FIREBASE_* keys in .env.local');
        return;
      }
      const result = await signInWithPopup(auth, googleProvider);
      await ensureUserDoc(result.user);
      router.push(getTargetRoute());
    } catch (err) {
      setErrorMsg('Google Error: ' + (err.message || 'Something went wrong.'));
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <Head>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1" />
        <title>Sign Up Account</title>
      </Head>

      {/* ===================== DESKTOP LAYOUT (Unchanged Logic & UI) ===================== */}
      <div className="desktop-layout v492_121">
        <div className="custom-logo">
          <img src="/assets/ailogo.png" alt="AI Logo" />
        </div>
        <div className="zoom-wrapper">
          <div className="v545_33">
            <div className="video-background" />
          </div>
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
              {successMsg ? (
                <div className="error-message" style={{ color: '#4caf50' }}>{successMsg}</div>
              ) : null}
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

      {/* ===================== MOBILE LAYOUT (With rotated & blurred video.gif background) ===================== */}
      <div className="mobile-layout">
        <div className="mobile-bg-wrapper">
          <div className="mobile-video-background" />
        </div>
        <div className="mobile-container">
          <img src="/assets/ailogo.png" alt="AI Logo" className="mobile-logo" />
          
          <h1 className="mobile-title">
            Let&apos;s Begin <br />
            Something New
          </h1>

          <form onSubmit={handleSubmit} className="mobile-form">
            <div className="mobile-row">
              <div className="mobile-field">
                <label>First Name</label>
                <input
                  type="text"
                  placeholder="eg.Dhaval"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  required
                />
              </div>
              <div className="mobile-field">
                <label>Last Name</label>
                <input
                  type="text"
                  placeholder="eg.Soni"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="mobile-field">
              <label>Email</label>
              <input
                type="email"
                placeholder="eg.soni@gmail.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            <div className="mobile-field mobile-password-field">
              <label>Password</label>
              <input
                type="password"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
              <span className="mobile-hint">Must be at least 8 characters</span>
            </div>

            {errorMsg && <div className="mobile-error">{errorMsg}</div>}
            {successMsg && (
              <div className="mobile-error" style={{ color: '#4caf50', background: 'rgba(76,175,80,0.2)' }}>
                {successMsg}
              </div>
            )}

            <button type="submit" className="mobile-btn-signup" disabled={busy}>
              {busy ? 'Please wait...' : 'Sign Up'}
            </button>
          </form>

          <div className="mobile-divider">
            <span></span>
            <p>OR</p>
            <span></span>
          </div>

          <button type="button" className="mobile-btn-google" onClick={handleGoogleSignup} disabled={busy}>
            <img src="/assets/google.png" alt="Google Logo" />
            Continue with Google
          </button>

          <div className="mobile-footer">
            Already have an account? <Link href="/login">Log in</Link>
          </div>
        </div>
      </div>

      <style jsx global>{`
        html,
        body {
          font-family: 'Inter', system-ui, sans-serif;
          background: #000000ff;
          color: white;
          overflow: hidden;
          font-size: 14px;
          height: 100vh;
          width: 100vw;
          margin: 0;
          padding: 0;
        }
        @media (max-width: 900px) {
          html, body {
            overflow-x: hidden;
            overflow-y: auto;
            height: auto;
            min-height: 100vh;
          }
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
        /* ================= DISPLAY TOGGLE ================= */
        .desktop-layout {
          display: flex;
          width: 100%;
          height: 100%;
          background: #020202;
          position: relative;
          justify-content: center;
          align-items: center;
        }
        .mobile-layout {
          display: none;
        }

        /* ================= DESKTOP CSS ================= */
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
          border-radius: 30px;
          flex-shrink: 0;
          box-shadow: 0 0 50px rgba(255, 255, 255, 0.05);
          position: relative;
          overflow: hidden;
        }
        .video-background {
          position: absolute;
          top: 50%;
          left: 50%;
          width: 145%;
          height: 145%;
          background: url('/assets/video.gif') center/cover no-repeat;
          filter: blur(35px);
          transform: translate(-50%, -50%) rotate(45deg) scale(1.45);
          transform-origin: center center;
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

        /* ================= MOBILE CSS (Rotated & Blurred video.gif background) ================= */
        @media (max-width: 900px) {
          .desktop-layout {
            display: none !important;
          }
          .mobile-layout {
            display: block !important;
            width: 100%;
            position: relative;
            background: #000000;
            overflow: hidden;
          }

          .mobile-bg-wrapper {
            position: fixed;
            top: 0;
            left: 0;
            width: 100vw;
            height: 100vh;
            overflow: hidden;
            z-index: 0;
            pointer-events: none;
          }

          .mobile-video-background {
            position: absolute;
            top: 50%;
            left: 50%;
            width: 180%;
            height: 180%;
            background: url('/assets/video.gif') center/cover no-repeat;
            filter: blur(45px);
            opacity: 0.85;
            transform: translate(-50%, -50%) rotate(45deg) scale(1.5);
            transform-origin: center center;
          }

          .mobile-container {
            position: relative;
            z-index: 1;
            min-height: 100vh;
            width: 100%;
            padding: 28px 22px 40px;
            box-sizing: border-box;
            display: flex;
            flex-direction: column;
            color: white;
            background: linear-gradient(
              to bottom,
              rgba(0, 0, 0, 0.25) 0%,
              rgba(0, 0, 0, 0.55) 40%,
              rgba(0, 0, 0, 0.85) 100%
            );
          }

          .mobile-logo {
            width: 42px;
            height: auto;
            margin-bottom: 42px;
            object-fit: contain;
          }

          .mobile-title {
            font-size: 28px;
            font-weight: 800;
            line-height: 1.15;
            margin: 0 0 28px 0;
            letter-spacing: -0.4px;
          }

          .mobile-form {
            display: flex;
            flex-direction: column;
            gap: 16px;
          }

          .mobile-row {
            display: flex;
            gap: 12px;
            width: 100%;
          }

          .mobile-field {
            display: flex;
            flex-direction: column;
            gap: 8px;
            flex: 1;
          }

          .mobile-field label {
            font-size: 13px;
            font-weight: 700;
          }

          .mobile-field input {
            background: #1a1a1a;
            border: none;
            border-radius: 8px;
            padding: 14px;
            color: white;
            font-size: 13px;
            font-weight: 700;
            font-family: 'Inter', sans-serif;
            outline: none;
            width: 100%;
            box-sizing: border-box;
          }

          .mobile-field input::placeholder {
            color: rgba(255, 255, 255, 0.42);
            font-weight: 600;
          }

          .mobile-password-field {
            margin-bottom: 10px;
          }

          .mobile-hint {
            font-size: 11px;
            font-weight: 700;
            color: #dcdcdc;
            margin-top: -2px;
          }

          .mobile-error {
            background: rgba(255, 0, 0, 0.2);
            color: #ff4d4d;
            padding: 10px;
            border-radius: 8px;
            font-size: 12px;
            font-weight: 700;
            text-align: center;
          }

          .mobile-btn-signup {
            background: white;
            color: black;
            font-weight: 800;
            font-size: 15px;
            padding: 14px;
            border-radius: 50px;
            border: none;
            cursor: pointer;
            font-family: 'Inter', sans-serif;
            width: 100%;
            display: flex;
            justify-content: center;
            align-items: center;
            transition: opacity 0.2s;
          }
          
          .mobile-btn-signup:disabled {
            opacity: 0.7;
          }

          .mobile-divider {
            display: flex;
            align-items: center;
            gap: 12px;
            margin: 22px 0;
            padding: 0 30px;
          }

          .mobile-divider span {
            flex: 1;
            height: 1px;
            background: rgba(255, 255, 255, 0.3);
          }

          .mobile-divider p {
            margin: 0;
            font-size: 12px;
            font-weight: 700;
            color: rgba(255, 255, 255, 0.8);
          }

          .mobile-btn-google {
            background: #1a1a1a;
            border: 1px solid #333;
            color: white;
            padding: 13px;
            border-radius: 50px;
            font-size: 15px;
            font-weight: 700;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 10px;
            cursor: pointer;
            font-family: 'Inter', sans-serif;
            width: 100%;
            box-sizing: border-box;
            transition: all 0.3s ease;
          }
          
          .mobile-btn-google:hover,
          .mobile-btn-google:active {
            background: white;
            color: black;
            border-color: white;
          }
          
          .mobile-btn-google img {
            width: 20px;
            height: 20px;
          }
          
          .mobile-btn-google:disabled {
            opacity: 0.7;
          }

          .mobile-footer {
            text-align: center;
            margin-top: 26px;
            font-size: 13px;
            font-weight: 600;
            color: rgba(255, 255, 255, 0.9);
            margin-bottom: 16px;
          }

          .mobile-footer a {
            color: white;
            text-decoration: none;
            font-weight: 800;
            margin-left: 4px;
          }
        }
      `}</style>
    </>
  );
}