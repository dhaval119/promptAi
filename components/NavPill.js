import { useRouter } from 'next/router';
import { useAuth } from '../lib/AuthContext';

export default function NavPill() {
  const router = useRouter();
  const { user } = useAuth();
   const isChat = router.pathname === '/chat';
  const isHome = router.pathname === '/';

  function goToSection(hash) {
    // Agar already home pe ho to direct scroll, warna pehle home pe jao
    if (router.pathname === '/') {
      window.location.hash = hash;
      // force re-trigger
      window.dispatchEvent(new HashChangeEvent('hashchange'));
    } else {
      router.push('/' + hash);
    }
  }

  return (
      <nav className={`nav-pill ${isHome ? 'on-home' : isChat ? 'on-chat' : 'on-other'}`}>
      <a href="/">Home</a>
      <a href="/features">Features</a>
      <a
        href="/#about-section"
        onClick={(e) => {
          e.preventDefault();
          goToSection('#about-section');
        }}
      >
        About Us
      </a>
      <a
        href="/#faq-section"
        onClick={(e) => {
          e.preventDefault();
          goToSection('#faq-section');
        }}
      >
        FAQ
      </a>
      <div
        className="user-icon"
        onClick={() => router.push(user ? '/details' : '/login')}
        title={user ? 'My Account' : 'Login'}
      >
        <img src="/assets/login.png" alt="Account" />
      </div>

      <style jsx>{`
        .nav-pill {
          position: fixed;
          top: 31px;
          height: 37px;
          display: flex;
          align-items: center;
          gap: 25px;
          background-color: #000;
          border: 1px solid #fff;
          border-radius: 50px;
          padding: 6px 25px;
          z-index: 100;
          white-space: nowrap;
        }

               .nav-pill.on-home {
          right: 250px;
        }

        .nav-pill.on-other {
          right: 55px;
        }

        .nav-pill.on-chat {
          right: 55px;
        }

        .nav-pill a {
          color: #fff;
          text-decoration: none;
          font-weight: 500;
          font-size: 16px;
          transition: color 0.3s, text-shadow 0.3s;
          cursor: pointer;
        }

        .nav-pill a:hover {
          color: #f0f0f0;
          text-shadow: 0 0 8px rgba(255, 255, 255, 0.6);
        }

        .user-icon {
          display: flex;
          align-items: center;
          justify-content: center;
          margin-left: 5px;
          cursor: pointer;
        }

        .user-icon img {
          width: 28px;
          height: 28px;
          object-fit: contain;
          display: block;
          border-radius: 50%;
        }

        @media (max-width: 900px) {
          .nav-pill {
            top: 14px;
            right: 12px !important;
            gap: 10px;
            padding: 5px 12px;
            transform: scale(0.78);
            transform-origin: top right;
            height: 34px;
          }
          .nav-pill a {
            font-size: 13px;
          }
          .user-icon img {
            width: 22px;
            height: 22px;
          }
        }

        @media (max-width: 480px) {
          .nav-pill {
            gap: 8px;
            padding: 4px 10px;
            transform: scale(0.72);
          }
          .nav-pill a {
            font-size: 12px;
          }
        }
      `}</style>
    </nav>
  );
}