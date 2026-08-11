import Head from 'next/head';
import { useEffect } from 'react';
import { useRouter } from 'next/router';

export default function Login() {
  const router = useRouter();
  
  useEffect(() => {
      // Firebase dynamically load for client side only
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

  const googleLogin = () => {
      const provider = new window.firebase.auth.GoogleAuthProvider();
      window.firebase.auth().signInWithPopup(provider).then(result => {
          // Send data to Next.js API to set cookie
          fetch('/api/auth', {
              method: 'POST',
              body: JSON.stringify({ uid: result.user.uid, email: result.user.email, name: result.user.displayName }),
              headers: { 'Content-Type': 'application/json' }
          }).then(() => router.push('/'));
      }).catch(err => alert("Google Error: " + err.message));
  };

  return (
    <div className="v492_121">
      <Head>
          <title>Login</title>
          <link href="https://fonts.googleapis.com/css?family=Inter&display=swap" rel="stylesheet" />
      </Head>
      <div className="custom-logo"><img src="/assets/ailogo.png" alt="AI Logo" /></div>
      <div className="zoom-wrapper">
          <div className="v545_33"></div>
          <div className="v494_25">
              <form method="POST" action="/api/auth">
                  <span className="v492_148">Hello there,<br/>welcome back</span>
                  <span className="v494_15">Email</span>
                  <div className="v494_16"><input type="email" name="email" placeholder="eg. soni@gmail.com" required /></div>
                  <span className="v494_18">Password</span>
                  <div className="v494_19"><input type="password" name="password" placeholder="Enter your password" required /></div>
                  <span className="v494_21">Must be at least 8 characters</span>
                  <button type="submit" name="login_submit" className="v494_22">Sign In</button>
              </form>

              <div className="firebase-divider">— OR —</div>
              <div className="firebase-options">
                  <button className="firebase-btn" onClick={googleLogin}>
                      <img src="/assets/google.png" style={{width:'22px', height:'22px'}} /> 
                      Continue with Google
                  </button>
              </div>
              <div className="v494_24"><a href="/signup">Don't have an account? Sign up</a></div>
          </div>
      </div> 
      <style jsx>{`
        /* EXACT CSS FROM YOUR login.php */
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: 'Inter', sans-serif; background: #020202; color: white; overflow: hidden; height: 100vh; width: 100vw; }
        .v492_121 { width: 100%; height: 100vh; background: #020202; position: relative; display: flex; justify-content: center; align-items: center; }
        .zoom-wrapper { display: flex; justify-content: center; align-items: center; gap: 120px; transform: scale(0.8); transform-origin: center center; width: 100%; }
        .custom-logo { position: absolute; left: 26px; top: 23px; z-index: 100; }
        .custom-logo img { height: 50px; width: 50px; display: block; }
        .v545_33 { width: 703px; height: 719px; background: url("/assets/signup.png") center/cover no-repeat; border-radius: 30px; flex-shrink: 0; box-shadow: 0 0 50px rgba(255, 255, 255, 0.05); }
        .v494_25 { width: 489px; height: 620px; position: relative; flex-shrink: 0; }
        .v492_148 { position: absolute; top: 0; left: 0; font-weight: bold; font-size: 45px; color: white; width: 100%; text-align: left; line-height: 1.2; }
        .v494_15 { position: absolute; top: 150px; left: 0; font-weight: bold; font-size: 16px; color: white; }
        .v494_16 { width: 484px; top: 180px; left: 0; position: absolute; background: #1a1a1a; border-radius: 8px; padding: 0 18px; display: flex; align-items: center; height: 52px; }
        .v494_16 input { width: 100%; height: 100%; background: transparent; border: none; outline: none; color: white; font-weight: bold; font-size: 15px; }
        .v494_18 { position: absolute; top: 255px; left: 0; font-weight: bold; font-size: 16px; color: white; }
        .v494_19 { width: 484px; top: 289px; left: 0; position: absolute; background: #1a1a1a; border-radius: 8px; padding: 0 18px; display: flex; align-items: center; height: 52px; }
        .v494_19 input { width: 100%; height: 100%; background: transparent; border: none; outline: none; color: white; font-weight: bold; font-size: 15px; }
        .v494_21 { position: absolute; top: 350px; left: 0; font-weight: bold; font-size: 13px; color: rgba(255,255,255,0.75); }
        .v494_22 { width: 484px; height: 53px; background: #1a1a1a; color: white; border-radius: 15px; position: absolute; top: 400px; left: 0; display: flex; align-items: center; justify-content: center; cursor: pointer; transition: all 0.3s ease; font-weight: bold; font-size: 18px; border: none; outline: none; }
        .v494_22:hover { background: white; color: black; }
        .v494_24 { position: absolute; top: 580px; width: 100%; text-align: center; font-weight: bold; font-size: 13px; color: white; }
        .v494_24 a { color: white; text-decoration: none; }
        .firebase-divider { position: absolute; top: 470px; left: 0; width: 484px; text-align: center; color: #666; font-size: 13px; }
        .firebase-options { position: absolute; top: 500px; left: 0; width: 100%; }
        .firebase-btn { width: 484px; height: 53px; margin: 8px auto; display: block; background: #1a1a1a; color: white; border-radius: 15px; border: 1px solid #333; font-weight: bold; font-size: 16px; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 10px; }
        .firebase-btn:hover { background: white; color: black; }
      `}</style>
    </div>
  );
}