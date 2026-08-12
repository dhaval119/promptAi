import { useRouter } from 'next/router';

export default function Logo({ onClick }) {
  const router = useRouter();
  return (
    <div
      className="logo"
      onClick={onClick || (() => router.push('/'))}
    >
      <style jsx>{`
        .logo {
          height: 50px;
          width: 50px;
          display: block;
          position: fixed;
          left: 26px;
          top: 23px;
          z-index: 999;
          background: url('/assets/ailogo.png') center/contain no-repeat;
          cursor: pointer;
        }
      `}</style>
    </div>
  );
}
