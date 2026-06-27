'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import {
  User,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
} from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
import { useRouter } from 'next/navigation';

interface AuthContextType {
  user: User | null;
  isAdmin: boolean;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  isAdmin: false,
  loading: true,
  signIn: async () => {},
  signOut: async () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        console.log('[Auth] User signed in:', firebaseUser.email);
        // Verify admin access by checking /admins/{uid} or /admin/{email} in Firestore
        try {
          const uidDocRef = doc(db, 'admins', firebaseUser.uid);
          const emailDocRef = firebaseUser.email ? doc(db, 'admin', firebaseUser.email) : null;

          const [uidDoc, emailDoc] = await Promise.all([
            getDoc(uidDocRef),
            emailDocRef ? getDoc(emailDocRef) : Promise.resolve(null)
          ]);

          const hasAdminAccess = (uidDoc && uidDoc.exists()) || (emailDoc ? emailDoc.exists() : false);
          setIsAdmin(hasAdminAccess);
          if (hasAdminAccess) {
            console.log('[Auth] Authentication success — Admin access confirmed');
          } else {
            console.warn('[Auth] User logged in but NOT found in admins collection. Write operations will be denied.');
          }
        } catch (err) {
          console.error('[Auth] Error checking admin status:', err);
          setIsAdmin(false);
        }
        setUser(firebaseUser);
      } else {
        console.log('[Auth] User signed out');
        setUser(null);
        setIsAdmin(false);
      }
      setLoading(false);
    });
    return unsub;
  }, []);

  const signIn = async (email: string, password: string) => {
    await signInWithEmailAndPassword(auth, email, password);
  };

  const signOut = async () => {
    await firebaseSignOut(auth);
    router.push('/login');
  };

  return (
    <AuthContext.Provider value={{ user, isAdmin, loading, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
