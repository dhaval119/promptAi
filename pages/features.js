import Head from 'next/head';
import { useRouter } from 'next/router';

export default function Features() {
  const router = useRouter();

  return (
    <>
      <Head>
        <title>Features - PromptMagic</title>
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;700;900&display=swap" rel="stylesheet" />
      </Head>
      
      <div className="nav">
          <a href="/">Home</a> 
          <a href="/features" style={{color: '#fff', textShadow: '0 0 8px rgba(255,255,255,0.6)'}}>Features</a> 
          <a href="/#about-section">About Us</a> 
          <a href="/#faq-section">FAQ</a> 
          <div className="user-icon" onClick={() => router.push('/details')}>
              <svg viewBox="0 0 24 24">
                  <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
              </svg>
          </div>
      </div>
          
      <div className="btn-top" onClick={() => router.push('/chat')}>GET STARTED</div>
      <div className="logo" onClick={() => router.push('/')}></div>

      <div className="features-container">
          <h1 className="main-heading">Powerful Features</h1>
          <p className="sub-text">Everything you need to generate production-ready AI prompts.</p>
          
          <div className="grid">
              <div className="card">
                  <h3>Advanced AI Models</h3>
                  <p>Powered by Gemini 1.5 Flash and Groq for blazing fast, high-quality prompt engineering.</p>
              </div>
              <div className="card">
                  <h3>History & Saving</h3>
                  <p>Never lose a good prompt again. Automatically save your best generated prompts to your profile.</p>
              </div>
              <div className="card">
                  <h3>Stripe Integration</h3>
                  <p>Seamlessly upgrade your tier using our secure Stripe checkout for unlimited prompt generations.</p>
              </div>
              <div className="card">
                  <h3>Copy in 1-Click</h3>
                  <p>Instantly copy your generated prompts and paste them into ChatGPT, Claude, or Midjourney.</p>
              </div>
          </div>
      </div>

      <style jsx>{`
        :root { --color-white: #ffffff; }
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: 'Inter', sans-serif; background: #020202; color: white; }
        .logo { height: 50px; width: 50px; display: block; position: fixed; left: 26px; top: 23px; z-index: 999; background: url("/assets/ailogo.png") center/contain no-repeat; cursor: pointer;}
        .nav { position: fixed; top: 31px; right: 240px; display: flex; align-items: center; gap: 24px; border: 1px solid var(--color-white); border-radius: 50px; padding: 6px 24px; background: #020202; z-index: 999; }
        .nav a { color: var(--color-white); text-decoration: none; font-weight: 500; font-size: 16px; transition: color 0.3s, text-shadow 0.3s; }
        .nav a:hover { color: #f0f0f0; text-shadow: 0 0 8px rgba(255, 255, 255, 0.6); }
        .user-icon { display: flex; align-items: center; justify-content: center; margin-left: 5px; cursor: pointer; }
        .user-icon svg { width: 24px; height: 24px; fill: var(--color-white); stroke: none; }
        .btn-top { position: fixed; top: 31px; right: 55px; width: 144px; height: 37px; background: black; border: 1px solid white; border-radius: 50px; display: flex; align-items: center; justify-content: center; font-weight: bold; font-size: 15px; cursor: pointer; transition: 0.3s; z-index: 999; }
        .btn-top:hover { background: white; color: black; }
        
        .features-container { padding: 150px 10%; text-align: center; }
        .main-heading { font-size: 60px; font-weight: 900; margin-bottom: 20px; }
        .sub-text { font-size: 20px; color: #aaa; margin-bottom: 80px; }
        
        .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 40px; }
        .card { background: #111; border: 1px solid #333; border-radius: 20px; padding: 40px; text-align: left; transition: transform 0.3s ease; }
        .card:hover { transform: translateY(-10px); border-color: #666; }
        .card h3 { font-size: 24px; font-weight: 700; margin-bottom: 15px; }
        .card p { font-size: 16px; color: #ccc; line-height: 1.6; }
      `}</style>
    </>
  );
}