import React, { createContext, useContext, useEffect, useState } from 'react';
import { GoogleAuthProvider, onAuthStateChanged, signInWithPopup, signOut, User } from 'firebase/auth';
import { auth, googleProvider } from '../firebase';
import { firestoreService, isBootstrappedAdminEmail } from '../services/firestoreService';
import { AppUserAccount, UserRole } from '../types/rewinding';

// Strictly in-memory OAuth access token cache (never stored in localStorage/sessionStorage)
let cachedSheetsAccessToken: string | null = null;

interface FirebaseContextValue {
  user: User | null;
  userAccount: AppUserAccount | null;
  authReady: boolean;
  dbReady: boolean;
  isAdmin: boolean;
  isActualAdmin: boolean;
  isBootstrappedAdmin: boolean;
  effectiveRole: UserRole;
  isSuspended: boolean;
  previewAsUser: boolean;
  setPreviewAsUser: (preview: boolean) => void;
  authError: string | null;
  sheetsAccessToken: string | null;
  signInWithGoogle: () => Promise<void>;
  connectGoogleSheets: () => Promise<string>;
  clearSheetsToken: () => void;
  signOutUser: () => Promise<void>;
}

const FirebaseContext = createContext<FirebaseContextValue | undefined>(undefined);

export const FirebaseProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [userAccount, setUserAccount] = useState<AppUserAccount | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [dbReady, setDbReady] = useState(false);
  const [previewAsUser, setPreviewAsUser] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [sheetsAccessToken, setSheetsAccessToken] = useState<string | null>(cachedSheetsAccessToken);

  useEffect(() => {
    let cancelled = false;
    let unsubAccount: (() => void) | null = null;

    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (cancelled) return;
      if (unsubAccount) {
        unsubAccount();
        unsubAccount = null;
      }

      setUser(currentUser);
      setAuthReady(true);

      if (!currentUser) {
        cachedSheetsAccessToken = null;
        setSheetsAccessToken(null);
        setUserAccount(null);
        setPreviewAsUser(false);
        setDbReady(false);
        return;
      }

      try {
        setAuthError(null);
        await firestoreService.ensureUserBootstrap(currentUser);
        if (!cancelled) {
          unsubAccount = firestoreService.subscribeUserAccount(currentUser, (acc) => {
            if (!cancelled) setUserAccount(acc);
          });
        }
        await firestoreService.seedInitialWorkshopDataIfEmpty(currentUser);
        if (!cancelled) {
          setDbReady(true);
        }
      } catch (err) {
        if (!cancelled) {
          const msg = err instanceof Error ? err.message : 'Gagal inisialisasi database Firestore.';
          setAuthError(msg);
          setDbReady(true);
        }
      }
    });

    return () => {
      cancelled = true;
      if (unsubAccount) unsubAccount();
      unsubscribe();
    };
  }, []);

  const signInWithGoogle = async () => {
    setAuthError(null);
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const credential = GoogleAuthProvider.credentialFromResult(result);
      if (credential?.accessToken) {
        cachedSheetsAccessToken = credential.accessToken;
        setSheetsAccessToken(credential.accessToken);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Login Google dibatalkan atau gagal.';
      setAuthError(msg);
      throw err;
    }
  };

  const connectGoogleSheets = async (): Promise<string> => {
    const result = await signInWithPopup(auth, googleProvider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    if (!credential?.accessToken) {
      throw new Error('Gagal mendapatkan izin akses Google Sheets dari akun Google.');
    }
    cachedSheetsAccessToken = credential.accessToken;
    setSheetsAccessToken(credential.accessToken);
    return credential.accessToken;
  };

  const clearSheetsToken = () => {
    cachedSheetsAccessToken = null;
    setSheetsAccessToken(null);
  };

  const signOutUser = async () => {
    cachedSheetsAccessToken = null;
    setSheetsAccessToken(null);
    setUserAccount(null);
    setPreviewAsUser(false);
    setDbReady(false);
    await signOut(auth);
  };

  const isBootstrappedAdmin = isBootstrappedAdminEmail(user);
  const isActualAdmin =
    isBootstrappedAdmin ||
    Boolean(userAccount?.isAdminRecord) ||
    userAccount?.role === 'admin';
  const isAdmin = isActualAdmin && !previewAsUser;
  const effectiveRole: UserRole = previewAsUser
    ? 'operator'
    : userAccount?.role || (isActualAdmin ? 'admin' : 'operator');
  const isSuspended = !isBootstrappedAdmin && userAccount?.status === 'suspended';

  return (
    <FirebaseContext.Provider
      value={{
        user,
        userAccount,
        authReady,
        dbReady,
        isAdmin,
        isActualAdmin,
        isBootstrappedAdmin,
        effectiveRole,
        isSuspended,
        previewAsUser,
        setPreviewAsUser,
        authError,
        sheetsAccessToken,
        signInWithGoogle,
        connectGoogleSheets,
        clearSheetsToken,
        signOutUser,
      }}
    >
      {children}
    </FirebaseContext.Provider>
  );
};

export const useFirebase = () => {
  const ctx = useContext(FirebaseContext);
  if (!ctx) {
    throw new Error('useFirebase must be used inside FirebaseProvider');
  }
  return ctx;
};
