// lib/AuthContext.js
import { createContext, useContext, useEffect, useRef, useState } from 'react';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { doc, getDoc, onSnapshot } from 'firebase/firestore';
import { auth, db } from './firebase';
import { trackVisit } from './geoDevice';
import { sendWelcomeEmail } from './welcomeEmail';

const AuthContext = createContext({
  user: null,
  profile: null,
  loading: true,
  isAdmin: false,
  logout: async () => {},
  refreshProfile: async () => {},
});

// Only this email is treated as bootstrap admin if role field is missing.
// Once you set role: 'admin' in Firestore for this user, the field is the source of truth.
const BOOTSTRAP_ADMIN_EMAIL = 'sonidhaval2468@gmail.com';

// Same mapping for the one-time load AND the realtime listener
function mapProfile(raw) {
  return {
    ...raw,
    firstName: raw.firstName || raw.first_name || '',
    lastName: raw.lastName || raw.last_name || '',
    email: raw.email || '',
    signupMethod: raw.signupMethod || raw.signup_method || '',
    role: raw.role || 'user',
    is_premium: !!(raw.is_premium || raw.isPremium),
    is_blocked: !!(raw.is_blocked || raw.isBlocked),
    soft_deleted: !!(raw.soft_deleted || raw.softDeleted),
    usage_count: typeof raw.usage_count === 'number' ? raw.usage_count : 0,
    last_reset: raw.last_reset || null,
  };
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const profileUnsub = useRef(null);

  async function loadProfile(uid) {
    if (!db) {
      setProfile(null);
      return null;
    }
    try {
      const snap = await getDoc(doc(db, 'users', uid));
      if (!snap.exists()) {
        setProfile(null);
        return null;
      }
      const mapped = mapProfile(snap.data());
      setProfile(mapped);
      return mapped;
    } catch (err) {
      console.warn('[AuthContext] loadProfile failed', err);
      setProfile(null);
      return null;
    }
  }

  useEffect(() => {
    if (!auth) {
      setUser(null);
      setProfile(null);
      setLoading(false);
      return;
    }

    const unsub = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);
      if (profileUnsub.current) {
        profileUnsub.current();
        profileUnsub.current = null;
      }
      if (firebaseUser) {
        await loadProfile(firebaseUser.uid);
        // Realtime: Premium / block / role changes show up instantly (powers the in-app Premium notice)
        if (db) {
          profileUnsub.current = onSnapshot(
            doc(db, 'users', firebaseUser.uid),
            (snap) => {
              if (snap.exists()) setProfile(mapProfile(snap.data()));
            },
            () => {}
          );
        }
        // country + device (once per session)
        trackVisit(firebaseUser.uid);
        // Safety net: if the welcome email never went out (e.g. Google signup navigated away
        // mid-request), retry once per session. Already-sent users are skipped automatically.
        try {
          const k = `promptai_welcome_check_${firebaseUser.uid}`;
          if (typeof window !== 'undefined' && !window.sessionStorage.getItem(k)) {
            window.sessionStorage.setItem(k, '1');
            setTimeout(() => sendWelcomeEmail(firebaseUser), 4000);
          }
        } catch {}
      } else {
        setProfile(null);
      }
      setLoading(false);
    });
    return () => {
      unsub();
      if (profileUnsub.current) profileUnsub.current();
    };
  }, []);

  async function logout() {
    if (auth) await signOut(auth);
  }

  async function refreshProfile() {
    if (auth?.currentUser) return await loadProfile(auth.currentUser.uid);
    return null;
  }

  // Bootstrap admin email is ALWAYS admin (profile.role defaults to 'user', which used to block it).
  const adminEmail = String(profile?.email || user?.email || '').trim().toLowerCase();
  const isAdmin =
    !!profile && (profile.role === 'admin' || adminEmail === BOOTSTRAP_ADMIN_EMAIL);

  return (
    <AuthContext.Provider
      value={{ user, profile, loading, isAdmin, logout, refreshProfile }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
