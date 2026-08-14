// lib/AuthContext.js
// App-wide auth state, wired up once in pages/_app.js.
// Any page/component can call useAuth() to get { user, profile, loading, logout }
// instead of re-wiring onAuthStateChanged everywhere (login.js, signup.js,
// details.js and NavPill's profile icon all use this).

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
    try {
      const snap = await getDoc(doc(db, 'users', uid));
      setProfile(snap.exists() ? snap.data() : null);
    } catch {
      setProfile(null);
    }
  }

  useEffect(() => {
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
    await signOut(auth);
  }

  async function refreshProfile() {
    if (auth.currentUser) await loadProfile(auth.currentUser.uid);
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
