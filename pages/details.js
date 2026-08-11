import Head from 'next/head';
import { useRouter } from 'next/router';

export default function Details() {
  const router = useRouter();

  const handleLogout = async () => {
      // Clear cookie route call
      await fetch('/api/logout', { method: 'POST' });
      router.push('/login');
  };

  return (
    <>
      <Head>
        <title>Account Details - PromptMagic</title>
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;700&display=swap" rel="stylesheet" />
      </Head>

      <div className="nav">
          <a href="/">Home</a> 
          <a href="/chat">Chat</a> 
      </div>
      <div className="logo" onClick={() => router.push('/')}></div>

      <div className="profile-container">
          <div className="profile-card">
              <div className="avatar">
                  <svg viewBox="0 0 24 24"><path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/></svg>
              </div>
              <h2>My Account</h2>
              
              <div className="info-group">
                  <label>Current Plan</label>
                  <div className="plan-badge">Free Tier</div>
              </div>
              
              <button className="upgrade-btn" onClick={() => alert("Stripe checkout logic here")}>
                  Upgrade to Pro
              </button>

              <button className="logout-btn" onClick={handleLogout}>
                  Log Out
              </button>
          </div>
      </div>

      <style jsx>{`
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: 'Inter', sans-serif; background: #020202; color: white; display: flex; justify-content: center; align-items: center; min-height: 100vh; }
        .logo { height: 50px; width: 50px; display: block; position: fixed; left: 26px; top: 23px; background: url("/assets/ailogo.png") center/contain no-repeat; cursor: pointer; }
        .nav { position: fixed; top: 31px; right: 55px; display: flex; align-items: center; gap: 24px; border: 1px solid white; border-radius: 50px; padding: 6px 24px; background: #020202; }
        .nav a { color: white; text-decoration: none; font-weight: 500; font-size: 16px; }
        
        .profile-container { width: 100%; max-width: 500px; padding: 20px; }
        .profile-card { background: #111; border: 1px solid #333; border-radius: 20px; padding: 50px; text-align: center; }
        .avatar { width: 80px; height: 80px; background: #222; border-radius: 50%; display: flex; justify-content: center; align-items: center; margin: 0 auto 20px; }
        .avatar svg { width: 40px; height: 40px; fill: white; }
        .profile-card h2 { font-size: 28px; margin-bottom: 40px; font-weight: 700; }
        
        .info-group { text-align: left; margin-bottom: 30px; }
        .info-group label { display: block; font-size: 14px; color: #888; margin-bottom: 8px; }
        .plan-badge { display: inline-block; background: #333; color: white; padding: 8px 16px; border-radius: 8px; font-weight: bold; }
        
        .upgrade-btn { width: 100%; height: 50px; background: white; color: black; font-weight: bold; font-size: 16px; border: none; border-radius: 12px; cursor: pointer; margin-bottom: 15px; transition: 0.3s; }
        .upgrade-btn:hover { background: #e0e0e0; }
        
        .logout-btn { width: 100%; height: 50px; background: transparent; color: #ff4a4a; font-weight: bold; font-size: 16px; border: 1px solid #ff4a4a; border-radius: 12px; cursor: pointer; transition: 0.3s; }
        .logout-btn:hover { background: #ff4a4a; color: white; }
      `}</style>
    </>
  );
}