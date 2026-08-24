import { useEffect, useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { 
  signInWithEmailAndPassword, 
  signInWithPopup, 
  sendPasswordResetEmail 
} from 'firebase/auth';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db, googleProvider } from '../lib/firebase';
import { useAuth } from '../lib/AuthContext';

function friendlyError(code) {
  switch (code) {
    case 'auth/invalid-email':
      return 'Invalid email format.';
    case 'auth/user-not-found':
      return 'No account found with this email. Try Google login if you signed up with Google.';
    case 'auth/wrong-password':
      return 'Incorrect password. Please try again.';
    case 'auth/invalid-credential':
      return 'Incorrect email or password. If you signed up with Google, please use the Google button instead.';
    case 'auth/too-many-requests':
      return 'Too many attempts. Please try again later.';
    case 'auth/account-exists-with-different-credential':
      return 'An account already exists with this email using a different sign-in method. Try Google login.';
    default:
      return 'Something went wrong. Please try again.';
  }
}

export default function Login() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [busy, setBusy] = useState(false);
  const [showForgot, setShowForgot] = useState(false);

  // Mobile → /chat | Desktop → /
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
    } else {
      await setDoc(
        ref,
        { last_login_at: serverTimestamp() },
        { merge: true }
      );
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    if (!email || !password) {
      setErrorMsg('Please fill in all fields.');
      return;
    }

    setBusy(true);

    try {
      if (!auth) {
        setErrorMsg(
          'Firebase is not configured. Add NEXT_PUBLIC_FIREBASE_* keys in .env.local'
        );
        return;
      }

      const cred = await signInWithEmailAndPassword(auth, email, password);

      if (db && cred.user) {
        await setDoc(
          doc(db, 'users', cred.user.uid),
          { last_login_at: serverTimestamp() },
          { merge: true }
        );
      }

      router.push(getTargetRoute());
    } catch (err) {
      setErrorMsg(friendlyError(err.code));
    } finally {
      setBusy(false);
    }
  }

  async function handleGoogleLogin() {
    setErrorMsg('');
    setSuccessMsg('');
    setBusy(true);

    try {
      if (!auth || !googleProvider) {
        setErrorMsg(
          'Firebase is not configured. Add NEXT_PUBLIC_FIREBASE_* keys in .env.local'
        );
        return;
      }

      const result = await signInWithPopup(auth, googleProvider);
      await ensureUserDoc(result.user);
      router.push(getTargetRoute());
    } catch (err) {
      setErrorMsg(
        'Google Error: ' + (err.message || 'Something went wrong.')
      );
    } finally {
      setBusy(false);
    }
  }

  async function handleForgotPassword() {
    setErrorMsg('');
    setSuccessMsg('');

    if (!email) {
      setErrorMsg('Please enter your email first.');
      return;
    }

    setBusy(true);
    try {
      if (!auth) {
        setErrorMsg('Firebase is not configured.');
        return;
      }
      await sendPasswordResetEmail(auth, email);
      setSuccessMsg('Password reset email sent! Check your inbox.');
      setShowForgot(false);
    } catch (err) {
      setErrorMsg(friendlyError(err.code) || 'Failed to send reset email.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <Head>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1" />
        <title>Login</title>
      </Head>

      {/* ===================== DESKTOP LAYOUT ===================== */}
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
                Hello there,
                <br />
                welcome back
              </span>

              <span className="v494_15">Email</span>

              <div className="v494_16">
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

              <div className="v494_19">
                <input
                  type="password"
                  name="password"
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>

              <span className="v494_21">
                Must be at least 8 characters
              </span>

              {/* Forgot Password Link */}
              <div style={{ position: 'absolute', top: 370, left: 0, width: 484, textAlign: 'right' }}>
                <button
                  type="button"
                  onClick={() => setShowForgot(true)}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: 'rgba(255,255,255,0.75)',
                    fontSize: 13,
                    fontWeight: 'bold',
                    cursor: 'pointer',
                    padding: 0,
                    fontFamily: 'Inter, sans-serif'
                  }}
                >
                  Forgot password?
                </button>
              </div>

              <button
                type="submit"
                name="login_submit"
                className="v494_22"
                disabled={busy}
              >
                {busy ? 'Please wait...' : 'Sign In'}
              </button>

              {errorMsg ? (
                <div className="error-message">{errorMsg}</div>
              ) : null}
              {successMsg ? (
                <div className="error-message" style={{ color: '#4caf50' }}>{successMsg}</div>
              ) : null}
            </form>

            {/* Forgot Password Modal (simple overlay) */}
            {showForgot && (
              <div style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: '100%',
                background: 'rgba(0,0,0,0.85)',
                zIndex: 50,
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                alignItems: 'center',
                borderRadius: 8,
                padding: 20
              }}>
                <p style={{ color: 'white', fontWeight: 'bold', marginBottom: 15, textAlign: 'center' }}>
                  Enter your email to receive a password reset link
                </p>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Your email"
                  style={{
                    width: '90%',
                    padding: '12px 15px',
                    background: '#1a1a1a',
                    border: 'none',
                    borderRadius: 8,
                    color: 'white',
                    marginBottom: 15,
                    fontWeight: 'bold'
                  }}
                />
                <div style={{ display: 'flex', gap: 10 }}>
                  <button
                    type="button"
                    onClick={handleForgotPassword}
                    disabled={busy}
                    style={{
                      padding: '10px 20px',
                      background: 'white',
                      color: 'black',
                      border: 'none',
                      borderRadius: 8,
                      fontWeight: 'bold',
                      cursor: 'pointer'
                    }}
                  >
                    {busy ? 'Sending...' : 'Send Reset Link'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowForgot(false)}
                    style={{
                      padding: '10px 20px',
                      background: '#333',
                      color: 'white',
                      border: 'none',
                      borderRadius: 8,
                      fontWeight: 'bold',
                      cursor: 'pointer'
                    }}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}

            <div className="firebase-divider">— OR —</div>

            <div className="firebase-options">
              <button
                type="button"
                className="firebase-btn"
                onClick={handleGoogleLogin}
                disabled={busy}
              >
                <img
                  src="/assets/google.png"
                  style={{ width: 22, height: 22 }}
                  alt="Google"
                />
                Continue with Google
              </button>
            </div>

            <div className="v494_24">
              <Link href="/signup">
                Don&apos;t have an account? Sign up
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* ===================== MOBILE LAYOUT ===================== */}
      <div className="mobile-layout">
        <div className="mobile-bg-wrapper">
          <div className="mobile-video-background" />
        </div>
        <div className="mobile-container">
          <img src="/assets/ailogo.png" alt="AI Logo" className="mobile-logo" />

          <h1 className="mobile-title">
            Hello there,
            <br />
            welcome back
          </h1>

          <form onSubmit={handleSubmit} className="mobile-form">
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

            {/* Mobile Forgot Password */}
            <div style={{ textAlign: 'right', marginTop: -8, marginBottom: 8 }}>
              <button
                type="button"
                onClick={() => setShowForgot(true)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'rgba(255,255,255,0.75)',
                  fontSize: 12,
                  fontWeight: 700,
                  cursor: 'pointer',
                  padding: 0
                }}
              >
                Forgot password?
              </button>
            </div>

            {errorMsg && <div className="mobile-error">{errorMsg}</div>}
            {successMsg && <div className="mobile-error" style={{ color: '#4caf50', background: 'rgba(76,175,80,0.2)' }}>{successMsg}</div>}

            <button type="submit" className="mobile-btn-signin" disabled={busy}>
              {busy ? 'Please wait...' : 'Sign In'}
            </button>
          </form>

          {/* Mobile Forgot Modal */}
          {showForgot && (
            <div style={{
              position: 'fixed',
              top: 0,
              left: 0,
              width: '100%',
              height: '100%',
              background: 'rgba(0,0,0,0.9)',
              zIndex: 100,
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              alignItems: 'center',
              padding: 20
            }}>
              <p style={{ color: 'white', fontWeight: 700, marginBottom: 15, textAlign: 'center' }}>
                Enter your email to receive a password reset link
              </p>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Your email"
                style={{
                  width: '100%',
                  maxWidth: 320,
                  padding: '14px',
                  background: '#1a1a1a',
                  border: 'none',
                  borderRadius: 8,
                  color: 'white',
                  marginBottom: 15,
                  fontWeight: 700
                }}
              />
              <div style={{ display: 'flex', gap: 10, width: '100%', maxWidth: 320 }}>
                <button
                  type="button"
                  onClick={handleForgotPassword}
                  disabled={busy}
                  style={{
                    flex: 1,
                    padding: '12px',
                    background: 'white',
                    color: 'black',
                    border: 'none',
                    borderRadius: 50,
                    fontWeight: 800,
                    cursor: 'pointer'
                  }}
                >
                  {busy ? 'Sending...' : 'Send Link'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowForgot(false)}
                  style={{
                    flex: 1,
                    padding: '12px',
                    background: '#333',
                    color: 'white',
                    border: 'none',
                    borderRadius: 50,
                    fontWeight: 700,
                    cursor: 'pointer'
                  }}
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          <div className="mobile-divider">
            <span></span>
            <p>OR</p>
            <span></span>
          </div>

          <button
            type="button"
            className="mobile-btn-google"
            onClick={handleGoogleLogin}
            disabled={busy}
          >
            <img src="/assets/google.png" alt="Google Logo" />
            Continue with Google
          </button>

          <div className="mobile-footer">
            Don&apos;t have an account? <Link href="/signup">Sign up</Link>
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
          height: 620px;
          position: relative;
          flex-shrink: 0;
        }
        .v492_148 {
          position: absolute;
          top: 0;
          left: 0;
          font-weight: bold;
          font-size: 45px;
          color: white;
          width: 100%;
          text-align: left;
          line-height: 1.2;
        }
        .v494_15 {
          position: absolute;
          top: 150px;
          left: 0;
          font-weight: bold;
          font-size: 16px;
          color: white;
        }
        .v494_16 {
          width: 484px;
          top: 180px;
          left: 0;
          position: absolute;
          background: #1a1a1a;
          border-radius: 8px;
          padding: 0 18px;
          display: flex;
          align-items: center;
          height: 52px;
        }
        .v494_16 :global(input) {
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
        .v494_18 {
          position: absolute;
          top: 255px;
          left: 0;
          font-weight: bold;
          font-size: 16px;
          color: white;
        }
        .v494_19 {
          width: 484px;
          top: 289px;
          left: 0;
          position: absolute;
          background: #1a1a1a;
          border-radius: 8px;
          padding: 0 18px;
          display: flex;
          align-items: center;
          height: 52px;
        }
        .v494_19 :global(input) {
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
        .v494_21 {
          position: absolute;
          top: 350px;
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
          top: 400px;
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
          top: 580px;
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
          top: 370px;
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
          top: 470px;
          left: 0;
          width: 484px;
          text-align: center;
          color: #666;
          font-size: 13px;
        }
        .firebase-options {
          position: absolute;
          top: 500px;
          left: 0;
          width: 100%;
        }
        .firebase-btn {
          width: 484px;
          height: 53px;
          margin: 8px auto;
          display: flex;
          background: #1a1a1a;
          color: white;
          border-radius: 15px;
          border: 1px solid #333;
          font-weight: bold;
          font-size: 16px;
          cursor: pointer;
          transition: all 0.3s;
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

        /* ================= MOBILE CSS ================= */
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

          .mobile-field {
            display: flex;
            flex-direction: column;
            gap: 8px;
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

          .mobile-btn-signin {
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

          .mobile-btn-signin:disabled {
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