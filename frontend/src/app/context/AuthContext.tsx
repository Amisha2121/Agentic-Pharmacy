import {
  createContext,
  useContext,
  useState,
  useEffect,
  useRef,
  type ReactNode,
} from 'react';
import {
  onAuthStateChanged,
  signOut,
  type User as FirebaseUser,
  type ConfirmationResult,
} from 'firebase/auth';
import {
  auth,
  googleProvider,
  RecaptchaVerifier,
  signInWithPhoneNumber,
  signInWithPopup,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  updateProfile,
} from '../firebase';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface AppUser {
  uid: string;
  name: string;
  email: string | null;
  photoURL: string | null;
  initials: string;
  provider: 'google' | 'email' | 'phone' | 'legacy';
}

interface AuthContextType {
  user: AppUser | null;
  isLoading: boolean;
  // Google
  loginWithGoogle: () => Promise<void>;
  // Email / Password
  loginWithEmail: (email: string, password: string) => Promise<void>;
  signupWithEmail: (name: string, email: string, password: string) => Promise<void>;
  // Phone OTP
  sendOtp: (phone: string, recaptchaContainerId: string) => Promise<void>;
  confirmOtp: (code: string) => Promise<void>;
  // Legacy
  login: (username: string, password: string) => Promise<boolean>;
  // Shared
  logout: () => Promise<void>;
  updateDisplayName: (newName: string) => Promise<void>;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function toInitials(name: string | null | undefined): string {
  if (!name) return 'RX';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function firebaseUserToApp(fb: FirebaseUser, provider: AppUser['provider'] = 'email'): AppUser {
  const name = fb.displayName || fb.email?.split('@')[0] || 'User';
  return {
    uid: fb.uid,
    name,
    email: fb.email,
    photoURL: fb.photoURL,
    initials: toInitials(name),
    provider,
  };
}

// Legacy shared credential (kept for backward compat)
const LEGACY_USERNAME = 'rxai';
const LEGACY_PASSWORD = 'pharma2026';

// ─── Context ──────────────────────────────────────────────────────────────────

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AppUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const confirmationRef = useRef<ConfirmationResult | null>(null);
  const recaptchaRef = useRef<InstanceType<typeof RecaptchaVerifier> | null>(null);

  // ── Sync Firebase auth state ──────────────────────────────────────────────
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (fb) => {
      if (fb) {
        // Determine provider from providerData
        const providerId = fb.providerData[0]?.providerId ?? 'password';
        let provider: AppUser['provider'] = 'email';
        if (providerId === 'google.com') provider = 'google';
        else if (providerId === 'phone') provider = 'phone';
        setUser(firebaseUserToApp(fb, provider));
      } else {
        // Check legacy session fallback
        const legacy = localStorage.getItem('rx_ai_session');
        const legacyName = localStorage.getItem('rx_ai_username') || 'Pharmacist';
        if (legacy === 'true') {
          setUser({
            uid: 'legacy',
            name: legacyName,
            email: null,
            photoURL: null,
            initials: toInitials(legacyName),
            provider: 'legacy',
          });
        } else {
          setUser(null);
        }
      }
      setIsLoading(false);
    });
    return unsub;
  }, []);

  // ── Google ────────────────────────────────────────────────────────────────
  const loginWithGoogle = async () => {
    const result = await signInWithPopup(auth, googleProvider);
    setUser(firebaseUserToApp(result.user, 'google'));
  };

  // ── Email / Password ──────────────────────────────────────────────────────
  const loginWithEmail = async (email: string, password: string) => {
    const result = await signInWithEmailAndPassword(auth, email, password);
    setUser(firebaseUserToApp(result.user, 'email'));
  };

  const signupWithEmail = async (name: string, email: string, password: string) => {
    const result = await createUserWithEmailAndPassword(auth, email, password);
    await updateProfile(result.user, { displayName: name });
    setUser(firebaseUserToApp({ ...result.user, displayName: name }, 'email'));
  };

  // ── Phone OTP ─────────────────────────────────────────────────────────────
  const sendOtp = async (phone: string, recaptchaContainerId: string) => {
    // Clear previous verifier
    if (recaptchaRef.current) {
      recaptchaRef.current.clear();
      recaptchaRef.current = null;
    }
    const verifier = new RecaptchaVerifier(auth, recaptchaContainerId, { size: 'invisible' });
    recaptchaRef.current = verifier;
    confirmationRef.current = await signInWithPhoneNumber(auth, phone, verifier);
  };

  const confirmOtp = async (code: string) => {
    if (!confirmationRef.current) throw new Error('No OTP session — call sendOtp first.');
    const result = await confirmationRef.current.confirm(code);
    setUser(firebaseUserToApp(result.user, 'phone'));
  };

  // ── Legacy username/password ──────────────────────────────────────────────
  const login = async (username: string, password: string): Promise<boolean> => {
    if (username.toLowerCase() !== LEGACY_USERNAME || password !== LEGACY_PASSWORD) return false;
    const name = 'Pharmacist';
    localStorage.setItem('rx_ai_session', 'true');
    localStorage.setItem('rx_ai_username', name);
    setUser({ uid: 'legacy', name, email: null, photoURL: null, initials: 'PH', provider: 'legacy' });
    return true;
  };

  // ── Logout ────────────────────────────────────────────────────────────────
  const logout = async () => {
    localStorage.removeItem('rx_ai_session');
    localStorage.removeItem('rx_ai_username');
    await signOut(auth);
    setUser(null);
  };

  // ── Update display name ───────────────────────────────────────────────────
  const updateDisplayName = async (newName: string) => {
    if (auth.currentUser) {
      await updateProfile(auth.currentUser, { displayName: newName });
    }
    setUser((prev) =>
      prev ? { ...prev, name: newName, initials: toInitials(newName) } : prev
    );
    localStorage.setItem('rx_ai_username', newName);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        loginWithGoogle,
        loginWithEmail,
        signupWithEmail,
        sendOtp,
        confirmOtp,
        login,
        logout,
        updateDisplayName,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}
