// lib/AuthContext.js
import { createContext, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from './firebase';

const AuthContext = createContext({
  user: null,
  profile: null,
  loading: true,
  logout: async () => {},
  refreshProfile: async () => {},
});

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  async function loadProfile(uid) {
    if (!db) {
      setProfile(null);
      return;
    }
    try {
      const snap = await getDoc(doc(db, 'users', uid));
      if (!snap.exists()) {
        setProfile(null);
        return;
      }
      const raw = snap.data();
      setProfile({
        ...raw,
        firstName: raw.firstName || raw.first_name || '',
        lastName: raw.lastName || raw.last_name || '',
        email: raw.email || '',
        signupMethod: raw.signupMethod || raw.signup_method || '',
      });
    } catch (err) {
      console.warn('[AuthContext] loadProfile failed', err);
      setProfile(null);
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
    if (auth?.currentUser) await loadProfile(auth.currentUser.uid);
  }

  return (
    <AuthContext.Provider value={{ user, profile, loading, logout, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}