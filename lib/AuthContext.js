// lib/AuthContext.js
import { createContext, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from './firebase';

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

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

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
      const raw = snap.data();
      const mapped = {
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
      if (firebaseUser) {
        await loadProfile(firebaseUser.uid);
      } else {
        setProfile(null);
      }
      setLoading(false);
    });
    return unsub;
  }, []);

  async function logout() {
    if (auth) await signOut(auth);
  }

  async function refreshProfile() {
    if (auth?.currentUser) return await loadProfile(auth.currentUser.uid);
    return null;
  }

  const isAdmin =
    !!profile &&
    (profile.role === 'admin' ||
      (profile.email &&
        profile.email.trim().toLowerCase() === BOOTSTRAP_ADMIN_EMAIL &&
        profile.role !== 'user'));

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
