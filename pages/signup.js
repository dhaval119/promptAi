import Head from 'next/head';
import { useEffect } from 'react';
import { useRouter } from 'next/router';

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
      const provider = new window.firebase.auth.GoogleAuthProvider();
      window.firebase.auth().signInWithPopup(provider).then(result => {
          fetch('/api/auth', {
              method: 'POST',
              body: JSON.stringify({ uid: result.user.uid, email: result.user.email, name: result.user.displayName }),
              headers: { 'Content-Type': 'application/json' }
          }).then(() => router.push('/chat'));
      }).catch(err => alert("Google Error: " + err.message));
  };

  return (
    <div className="v492_121">
      <Head>
          <title>Sign Up - PromptMagic</title>
          <link href="https://fonts.googleapis.com/css?family=Inter&display=swap" rel="stylesheet" />
      </Head>
      <div className="custom-logo" onClick={() => router.push('/')} style={{cursor: 'pointer'}}>
          <img src="/assets/ailogo.png" alt="AI Logo" />
      </div>
      <div className="zoom-wrapper">
          <div className="v545_33"></div>
          <div className="v494_25">
              <form method="POST" action="/api/auth">
                  <span className="v492_148">Create an<br/>Account</span>
                  
                  <span className="v494_10" style={{position: 'absolute', top: '120px', fontWeight: 'bold', fontSize: '16px'}}>Full Name</span>
                  <div className="v494_11" style={{width: '484px', top: '150px', position: 'absolute', background: '#1a1a1a', borderRadius: '8px', padding: '0 18px', display: 'flex', alignItems: 'center', height: '52px'}}>
                      <input type="text" name="name" placeholder="John Doe" required style={{width: '100%', background: 'transparent', border: 'none', outline: 'none', color: 'white', fontWeight: 'bold'}} />
                  </div>

                  <span className="v494_15" style={{top: '220px'}}>Email</span>
                  <div className="v494_16" style={{top: '250px'}}><input type="email" name="email" placeholder="eg. soni@gmail.com" required /></div>
                  
                  <span className="v494_18" style={{top: '320px'}}>Password</span>
                  <div className="v494_19" style={{top: '350px'}}><input type="password" name="password" placeholder="Create a password" required /></div>
                  
                  <button type="submit" name="signup_submit" className="v494_22" style={{top: '430px'}}>Sign Up</button>
              </form>

              <div className="firebase-divider" style={{top: '500px'}}>— OR —</div>
              <div className="firebase-options" style={{top: '530px'}}>
                  <button className="firebase-btn" onClick={googleSignup}>
                      <img src="/assets/google.png" style={{width:'22px', height:'22px'}} /> 
                      Sign up with Google
                  </button>
              </div>
              <div className="v494_24" style={{top: '610px'}}><a href="/login">Already have an account? Log in</a></div>
          </div>
      </div> 
      <style jsx>{`
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: 'Inter', sans-serif; background: #020202; color: white; overflow: hidden; height: 100vh; width: 100vw; }
        .v492_121 { width: 100%; height: 100vh; background: #020202; position: relative; display: flex; justify-content: center; align-items: center; }
        .zoom-wrapper { display: flex; justify-content: center; align-items: center; gap: 120px; transform: scale(0.8); transform-origin: center center; width: 100%; }
        .custom-logo { position: absolute; left: 26px; top: 23px; z-index: 100; }
        .custom-logo img { height: 50px; width: 50px; display: block; }
        .v545_33 { width: 703px; height: 719px; background: url("/assets/signup.png") center/cover no-repeat; border-radius: 30px; flex-shrink: 0; box-shadow: 0 0 50px rgba(255, 255, 255, 0.05); }
        .v494_25 { width: 489px; height: 650px; position: relative; flex-shrink: 0; }
        .v492_148 { position: absolute; top: 0; left: 0; font-weight: bold; font-size: 45px; color: white; width: 100%; text-align: left; line-height: 1.2; }
        .v494_15, .v494_18 { position: absolute; left: 0; font-weight: bold; font-size: 16px; color: white; }
        .v494_16, .v494_19 { width: 484px; left: 0; position: absolute; background: #1a1a1a; border-radius: 8px; padding: 0 18px; display: flex; align-items: center; height: 52px; }
        .v494_16 input, .v494_19 input { width: 100%; height: 100%; background: transparent; border: none; outline: none; color: white; font-weight: bold; font-size: 15px; }
        .v494_22 { width: 484px; height: 53px; background: #1a1a1a; color: white; border-radius: 15px; position: absolute; left: 0; display: flex; align-items: center; justify-content: center; cursor: pointer; transition: all 0.3s ease; font-weight: bold; font-size: 18px; border: none; outline: none; }
        .v494_22:hover { background: white; color: black; }
        .v494_24 { position: absolute; width: 100%; text-align: center; font-weight: bold; font-size: 13px; color: white; }
        .v494_24 a { color: white; text-decoration: none; }
        .firebase-divider { position: absolute; left: 0; width: 484px; text-align: center; color: #666; font-size: 13px; }
        .firebase-options { position: absolute; left: 0; width: 100%; }
        .firebase-btn { width: 484px; height: 53px; margin: 8px auto; display: block; background: #1a1a1a; color: white; border-radius: 15px; border: 1px solid #333; font-weight: bold; font-size: 16px; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 10px; }
        .firebase-btn:hover { background: white; color: black; }
      `}</style>
    </div>
  );
}