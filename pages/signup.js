import { useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';

export default function Signup() {
  const router = useRouter();

  useEffect(() => {
    import('firebase/compat/app').then(firebase => {
      import('firebase/compat/auth').then(() => {
        if (!firebase.default.apps.length) {
          firebase.default.initializeApp({
            apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
            authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
            projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
            storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
            messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
            appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID
          });
        }
        window.firebase = firebase.default;
      });
    });
  }, []);

  const googleSignup = () => {
    if (!window.firebase) return alert('Firebase loading...');
    const provider = new window.firebase.auth.GoogleAuthProvider();
    window.firebase.auth().signInWithPopup(provider)
      .then(() => router.push('/chat'))
      .catch(err => alert('Google Error: ' + err.message));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    router.push('/chat');
  };

  return (
    <div className="v492_121">
      <Head><title>Sign Up - PromptMagic</title></Head>
      <div className="custom-logo" onClick={() => router.push('/')} style={{ cursor: 'pointer' }}>
        <img src="/assets/ailogo.png" alt="AI Logo" />
      </div>
      <div className="zoom-wrapper">
        <div className="v545_33"></div>
        <div className="v494_25">
          <form onSubmit={handleSubmit}>
            <span className="v492_148">Let&apos;s Begin <br />Something New</span>

            <span className="label" style={{ top: 120 }}>First Name</span>
            <div className="input-box" style={{ top: 150, width: 231, left: 0 }}>
              <input type="text" name="firstname" placeholder="eg. Dhaval" required />
            </div>
            <span className="label" style={{ top: 120, left: 250 }}>Last Name</span>
            <div className="input-box" style={{ top: 150, width: 231, left: 253 }}>
              <input type="text" name="lastname" placeholder="eg. Soni" required />
            </div>

            <span className="label" style={{ top: 220 }}>Email</span>
            <div className="input-box" style={{ top: 250 }}>
              <input type="email" name="email" placeholder="eg. soni@gmail.com" required />
            </div>

            <span className="label" style={{ top: 320 }}>Password</span>
            <div className="input-box" style={{ top: 350 }}>
              <input type="password" name="password" placeholder="Create a password" required />
            </div>

            <button type="submit" className="submit-btn" style={{ top: 430 }}>Sign Up</button>
          </form>

          <div className="firebase-divider" style={{ top: 500 }}>— OR —</div>
          <div className="firebase-options" style={{ top: 530 }}>
            <button className="firebase-btn" onClick={googleSignup}>
              <img src="/assets/google.png" style={{ width: 22, height: 22 }} alt="" />
              Sign up with Google
            </button>
          </div>
          <div className="bottom-link" style={{ top: 610 }}>
            <a href="/login">Already have an account? Log in</a>
          </div>
        </div>
      </div>

      <style jsx>{`
        * { box-sizing: border-box; margin: 0; padding: 0; }
        .v492_121 {
          width: 100%; height: 100vh; background: #020202;
          position: relative; display: flex; justify-content: center; align-items: center;
          font-family: 'Inter', sans-serif; color: white; overflow: hidden;
        }
        .zoom-wrapper {
          display: flex; justify-content: center; align-items: center;
          gap: 120px; transform: scale(0.8); transform-origin: center center; width: 100%;
        }
        .custom-logo { position: absolute; left: 26px; top: 23px; z-index: 100; }
        .custom-logo img { height: 50px; width: 50px; display: block; }
        .v545_33 {
          width: 703px; height: 719px;
          background: url("/assets/signup.png") center/cover no-repeat;
          border-radius: 30px; flex-shrink: 0;
          box-shadow: 0 0 50px rgba(255,255,255,0.05);
        }
        .v494_25 { width: 489px; height: 650px; position: relative; flex-shrink: 0; }
        .v492_148 {
          position: absolute; top: 0; left: 0;
          font-weight: bold; font-size: 42px; color: white; line-height: 1.2;
        }
        .label {
          position: absolute; left: 0; font-weight: bold; font-size: 16px; color: white;
        }
        .input-box {
          position: absolute; left: 0; width: 484px;
          background: #1a1a1a; border-radius: 8px; padding: 0 18px;
          display: flex; align-items: center; height: 52px;
        }
        .input-box input {
          width: 100%; height: 100%; background: transparent; border: none;
          outline: none; color: white; font-weight: bold; font-size: 15px;
        }
        .submit-btn {
          width: 484px; height: 53px; background: #1a1a1a; color: white;
          border-radius: 15px; position: absolute; left: 0;
          display: flex; align-items: center; justify-content: center;
          cursor: pointer; transition: all 0.3s ease;
          font-weight: bold; font-size: 18px; border: none; outline: none;
        }
        .submit-btn:hover { background: white; color: black; }
        .firebase-divider {
          position: absolute; left: 0; width: 484px;
          text-align: center; color: #666; font-size: 13px;
        }
        .firebase-options { position: absolute; left: 0; width: 100%; }
        .firebase-btn {
          width: 484px; height: 53px; margin: 8px auto; display: flex;
          background: #1a1a1a; color: white; border-radius: 15px;
          border: 1px solid #333; font-weight: bold; font-size: 16px;
          cursor: pointer; align-items: center; justify-content: center; gap: 10px;
        }
        .firebase-btn:hover { background: white; color: black; }
        .bottom-link {
          position: absolute; width: 100%; text-align: center;
          font-weight: bold; font-size: 13px;
        }
        .bottom-link a { color: white; text-decoration: none; }

        @media (max-width: 1100px) {
          .zoom-wrapper { gap: 40px; transform: scale(0.7); }
          .v545_33 { width: 400px; height: 450px; }
        }
        @media (max-width: 700px) {
          .zoom-wrapper { flex-direction: column; transform: scale(0.9); }
          .v545_33 { display: none; }
          .v494_25 { width: 90vw; max-width: 400px; }
          .input-box, .submit-btn, .firebase-btn, .firebase-divider { width: 100% !important; left: 0 !important; }
          .v492_148 { font-size: 32px; }
        }
      `}</style>
    </div>
  );
}
