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
      // Matches old MySQL users table (password stays only in Firebase Auth)
      await setDoc(doc(db, 'users', cred.user.uid), {
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        email: email.trim(),
        signup_method: 'manual',
        usage_count: 0,
        last_reset: serverTimestamp(),
        last_login_at: serverTimestamp(),
        created_at: serverTimestamp(),
      });
      router.push('/');
    } catch (err) {
      setErrorMsg(friendlyError(err.code));
    } finally {
      setBusy(false);
    }
  }

  async function handleGoogleSignup(e) {
    if (e && e.preventDefault) e.preventDefault();
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
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1" />
        <title>Sign Up Account</title>
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

      {/* ===================== NEW MOBILE LAYOUT ===================== */}
      <div className="mobile-layout">
        <div style={{ display: 'flex', flexDirection: 'column', background: '#FFFFFF', minHeight: '100vh' }}>
          <div style={{ overflow: 'hidden', alignSelf: 'stretch', display: 'flex', flexDirection: 'column', background: '#00000000' }}>
            <div style={{ alignSelf: 'stretch' }}>
              <div style={{ alignSelf: 'stretch', display: 'flex', flexDirection: 'column', alignItems: 'flex-start', background: '#D9D9D900', paddingBottom: '60px' }}>
                <img
                  src="https://storage.googleapis.com/tagjs-prod.appspot.com/v1/SdTkzsvVdg/fn8jki3s_expires_30_days.png"
                  style={{ width: '104px', height: '104px', marginBottom: '157px', objectFit: 'fill' }}
                  alt="Top Decor"
                />
                <div style={{ alignSelf: 'stretch', display: 'flex', flexDirection: 'column', alignItems: 'flex-start', marginLeft: '23px', marginRight: '23px' }}>
                  
                  <span style={{ color: '#FFFFFF', fontSize: '35px', fontWeight: 'bold', marginBottom: '31px', marginLeft: '1px', width: '268px' }}>
                    Let&apos;s Begin <br />Something New
                  </span>
                  
                  <div style={{ alignSelf: 'stretch', display: 'flex', flexDirection: 'column', alignItems: 'flex-start', marginBottom: '18px', gap: '12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', marginLeft: '1px' }}>
                      <span style={{ color: '#FFFFFF', fontSize: '16px', fontWeight: 'bold', marginRight: '98px' }}>
                        First Name
                      </span>
                      <span style={{ color: '#FFFFFF', fontSize: '16px', fontWeight: 'bold' }}>
                        Last Name
                      </span>
                    </div>
                    
                    <div style={{ alignSelf: 'stretch', display: 'flex', alignItems: 'center', gap: '18px' }}>
                      <input
                        type="text"
                        placeholder="eg.Dhaval"
                        value={firstName}
                        onChange={(e) => setFirstName(e.target.value)}
                        style={{ color: '#FFFFFF', fontSize: '13px', fontWeight: 'bold', flex: 1, alignSelf: 'stretch', background: '#1A1A1A', borderRadius: '5px', border: 'none', padding: '12px' }}
                      />
                      <input
                        type="text"
                        placeholder="eg.Soni"
                        value={lastName}
                        onChange={(e) => setLastName(e.target.value)}
                        style={{ color: '#FFFFFF', fontSize: '13px', fontWeight: 'bold', flex: 1, alignSelf: 'stretch', background: '#1A1A1A', borderRadius: '5px', border: 'none', padding: '12px 13px' }}
                      />
                    </div>
                  </div>
                  
                  <span style={{ color: '#FFFFFF', fontSize: '16px', fontWeight: 'bold', marginBottom: '14px', marginLeft: '1px' }}>
                    Email
                  </span>
                  <input
                    type="email"
                    placeholder="eg.soni@gmail.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    style={{ color: '#FFFFFF', fontSize: '13px', fontWeight: 'bold', marginBottom: '18px', alignSelf: 'stretch', background: '#1A1A1A', borderRadius: '5px', border: 'none', padding: '12px' }}
                  />
                  
                  <span style={{ color: '#FFFFFF', fontSize: '16px', fontWeight: 'bold', marginBottom: '14px', marginLeft: '1px' }}>
                    Password
                  </span>
                  <input
                    type="password"
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    style={{ color: '#FFFFFF', fontSize: '13px', fontWeight: 'bold', marginBottom: '24px', alignSelf: 'stretch', background: '#1A1A1A', borderRadius: '5px', border: 'none', padding: '12px' }}
                  />
                  
                  <span style={{ color: '#FFFFFF', fontSize: '13px', fontWeight: 'bold', marginBottom: '23px' }}>
                    Must be at least 8 characters
                  </span>
                  
                  {errorMsg && (
                    <div style={{ color: '#ff4d4d', fontWeight: 'bold', fontSize: '13px', marginBottom: '15px', background: 'rgba(0,0,0,0.5)', padding: '8px', borderRadius: '5px', width: '100%', textAlign: 'center' }}>
                      {errorMsg}
                    </div>
                  )}

                  <button 
                    onClick={handleSubmit}
                    disabled={busy}
                    style={{ alignSelf: 'stretch', display: 'flex', flexDirection: 'column', alignItems: 'center', background: '#FFFFFF', borderRadius: '50px', border: 'none', paddingTop: '11px', paddingBottom: '11px', marginBottom: '22px', textAlign: 'left', cursor: 'pointer' }}
                  >
                    <span style={{ color: '#000000', fontSize: '18px', fontWeight: 'bold' }}>
                      {busy ? 'Please wait...' : 'Sign Up'}
                    </span>
                  </button>
                  
                  <div style={{ alignSelf: 'stretch', display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '18px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <div style={{ width: '20px', height: '1px', background: '#FFFFFF80' }}></div>
                      <span style={{ color: '#FFFFFF', fontSize: '13px', fontWeight: 'bold' }}>OR</span>
                      <div style={{ width: '20px', height: '1px', background: '#FFFFFF80' }}></div>
                    </div>
                  </div>
                  
                  <button 
                    onClick={handleGoogleSignup}
                    disabled={busy}
                    style={{ alignSelf: 'stretch', display: 'flex', flexDirection: 'column', alignItems: 'center', background: '#1A1A1A', borderRadius: '50px', border: '1px solid #FFFFFF80', paddingTop: '9px', paddingBottom: '9px', marginBottom: '17px', textAlign: 'left', cursor: 'pointer' }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '11px' }}>
                      <img
                        src="https://storage.googleapis.com/tagjs-prod.appspot.com/v1/SdTkzsvVdg/egkej8s3_expires_30_days.png"
                        style={{ width: '21px', height: '21px', objectFit: 'fill' }}
                        alt="Google"
                      />
                      <span style={{ color: '#FFFFFF', fontSize: '18px', fontWeight: 'bold' }}>
                        Continue with Google
                      </span>
                    </div>
                  </button>
                  
                  <div style={{ alignSelf: 'stretch', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    <Link href="/login" style={{ color: '#FFFFFF', fontSize: '13px', fontWeight: 'bold', textDecoration: 'none' }}>
                      Already have an account? Log in
                    </Link>
                  </div>
                </div>
              </div>
            </div>
            
            <img
              src="https://storage.googleapis.com/tagjs-prod.appspot.com/v1/SdTkzsvVdg/kfcmlkpq_expires_30_days.png"
              style={{ flex: 1, alignSelf: 'stretch', objectFit: 'fill', width: '100%' }}
              alt="Bottom Decor"
            />
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
        /* DISPLAY TOGGLE LOGIC */
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

        /* ------------------ ORIGINAL DESKTOP CSS ------------------ */
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

        /* ------------------ MOBILE MEDIA QUERY TOGGLE ------------------ */
        @media (max-width: 900px) {
          .desktop-layout {
            display: none !important;
          }
          .mobile-layout {
            display: block !important;
            width: 100%;
          }
        }
      `}</style>
    </>
  );
}