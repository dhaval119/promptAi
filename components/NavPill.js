import { useRouter } from 'next/router';
import { useAuth } from '../lib/AuthContext';

export default function NavPill() {
  const router = useRouter();
  const { user } = useAuth();

  return (
    <nav className="nav-pill">
      <a href="/">Home</a>
      <a href="/features">Features</a>
      <a href="/#about-section">About Us</a>
      <a href="/#faq-section">FAQ</a>
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
          right: 86px;
          display: flex;
          align-items: center;
          gap: 25px;
          background-color: #000;
          border: 1px solid #fff;
          border-radius: 50px;
          padding: 6px 25px;
          z-index: 20;
          white-space: nowrap;
        }

        .nav-pill a {
          color: #fff;
          text-decoration: none;
          font-weight: 500;
          font-size: 16px;
          transition: color 0.3s, text-shadow 0.3s;
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
            top: 18px;
            right: 16px;
            gap: 14px;
            padding: 6px 16px;
            transform: scale(0.85);
            transform-origin: top right;
          }
        }
      `}</style>
    </nav>
  );
}