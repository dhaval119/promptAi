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
      >
        <svg viewBox="0 0 24 24">
          <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
        </svg>
      </div>
      <style jsx>{`
        .nav-pill {
          display: flex;
          align-items: center;
          gap: 24px;
          border: 1px solid #fff;
          border-radius: 50px;
          padding: 6px 24px;
          background: #020202;
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
        .user-icon svg {
          width: 24px;
          height: 24px;
          fill: #fff;
          stroke: none;
        }
      `}</style>
    </nav>
  );
}
