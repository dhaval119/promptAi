import { useRouter } from 'next/router';
import Head from 'next/head';

export default function Details() {
  const router = useRouter();

  const handleLogout = () => {
    router.push('/login');
  };

  return (
    <>
      <Head><title>My Account - PromptMagic</title></Head>
      <div className="container">
        <div className="logo" onClick={() => router.push('/')}>
          <img src="/assets/ailogo.png" alt="AI Logo" />
        </div>
        <nav className="nav-pill">
          <a href="/">Home</a>
          <a href="/features">Features</a>
          <a href="/#about-section">About Us</a>
          <a href="/#faq-section">FAQ</a>
          <div className="user-icon" onClick={() => router.push('/details')}>
            <svg viewBox="0 0 24 24"><path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/></svg>
          </div>
        </nav>

        <main>
          <h1 className="page-title">My Account</h1>
          <div className="section-divider"></div>
          <section className="section-block">
            <h2 className="section-title">Account</h2>
            <p className="section-subtitle">View and edit your personal info below.</p>
          </section>
          <div className="section-divider"></div>
          <section className="section-block">
            <h2 className="section-title">Personal info</h2>
            <p className="section-subtitle">Update your personal information.</p>
            <form onSubmit={(e) => { e.preventDefault(); alert('Profile updated (demo)'); }}>
              <div className="form-grid">
                <div className="form-group">
                  <label>First name</label>
                  <input type="text" defaultValue="User" required />
                </div>
                <div className="form-group">
                  <label>Last name</label>
                  <input type="text" defaultValue="" />
                </div>
                <div className="form-group">
                  <label>Email</label>
                  <input type="email" defaultValue="user@example.com" required />
                </div>
                <div className="form-group">
                  <label>Password (Leave blank to keep current)</label>
                  <input type="password" placeholder="Enter new password" />
                </div>
              </div>
              <div className="submit-container">
                <button type="button" onClick={handleLogout} className="logout-btn">Logout</button>
                <button type="submit" className="submit-btn">Submit</button>
              </div>
            </form>
          </section>
        </main>
      </div>

      <style jsx>{`
        :root {
          --color-black: #000000; --color-white: #ffffff;
          --color-subtitle: #b0b0b0; --color-divider: #333333;
        }
        * { box-sizing: border-box; margin: 0; padding: 0; }
        .container {
          width: 100%; min-height: 100vh; position: relative;
          padding: 0 40px; background: #000; color: white;
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
        }
        .logo {
          height: 50px; width: 50px; position: absolute;
          left: 26px; top: 23px; z-index: 100; cursor: pointer;
        }
        .logo img { width: 100%; height: 100%; object-fit: contain; }
        .nav-pill {
          position: absolute; top: 31px; right: 86px;
          display: flex; align-items: center; gap: 25px;
          border: 1px solid white; border-radius: 50px;
          background: #000; padding: 6px 25px; z-index: 20;
        }
        .nav-pill a {
          color: white; text-decoration: none; font-weight: 500; font-size: 16px;
        }
        .user-icon { display: flex; align-items: center; margin-left: 5px; cursor: pointer; }
        .user-icon svg { width: 24px; height: 24px; fill: white; }

        main {
          width: 100%; max-width: 1350px; margin: 0 auto;
          padding-top: 120px;
        }
        .page-title {
          text-align: center; font-size: 32px; font-weight: 700;
          margin-bottom: 50px; letter-spacing: -0.5px;
        }
        .section-divider {
          border: 0; border-top: 1px solid #333; margin: 30px 0; width: 100%;
        }
        .section-title { font-size: 24px; font-weight: 700; margin-bottom: 8px; }
        .section-subtitle {
          color: #b0b0b0; font-size: 16px; font-weight: 500; margin-bottom: 20px;
        }
        .form-grid {
          display: grid; grid-template-columns: 1fr 1fr;
          column-gap: 60px; row-gap: 20px; margin-top: 40px;
        }
        .form-group { display: flex; flex-direction: column; }
        label {
          font-size: 14px; font-weight: 700; margin-bottom: 10px; display: block;
        }
        input {
          background: transparent; border: 1px solid white; border-radius: 50px;
          padding: 12px 20px; font-size: 14px; color: white; width: 100%; outline: none;
        }
        input:focus { border-color: #ccc; }
        .submit-container {
          display: flex; justify-content: flex-end; gap: 20px;
          margin-top: 60px; padding-bottom: 60px;
        }
        .submit-btn, .logout-btn {
          background: black; color: white; border: 1px solid white;
          border-radius: 50px; padding: 14px 40px; font-size: 16px;
          font-weight: 700; cursor: pointer; min-width: 140px;
          transition: 0.2s;
        }
        .submit-btn:hover { background: white; color: black; }
        .logout-btn:hover { background: #ff4444; border-color: #ff4444; }

        @media (max-width: 768px) {
          .form-grid { grid-template-columns: 1fr; }
          .nav-pill { right: 12px; gap: 10px; padding: 4px 12px; }
          .nav-pill a { font-size: 13px; }
          .page-title { font-size: 26px; }
          main { padding-top: 100px; }
        }
      `}</style>
    </>
  );
}
