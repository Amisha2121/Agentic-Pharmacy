import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';

interface User {
  initials: string;
  name: string;
}

interface AuthContextType {
  user: User | null;
  login: (username: string, password: string) => Promise<boolean>;
  logout: () => void;
  updateProfile: (newName: string) => void;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

// Single shared credential for all users
const SHARED_USERNAME = 'rxai';
const SHARED_PASSWORD = 'pharma2026';

const SESSION_KEY = 'rx_ai_session';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const saved = localStorage.getItem(SESSION_KEY);
    const savedName = localStorage.getItem('rx_ai_username') || 'Pharmacist';
    if (saved === 'true') setUser({ initials: savedName.substring(0, 2).toUpperCase(), name: savedName });
    setIsLoading(false);
  }, []);

  const login = async (username: string, password: string): Promise<boolean> => {
    if (username.toLowerCase() !== SHARED_USERNAME || password !== SHARED_PASSWORD) return false;
    const formattedName = username.charAt(0).toUpperCase() + username.slice(1);
    setUser({ initials: formattedName.substring(0, 2).toUpperCase(), name: formattedName });
    localStorage.setItem(SESSION_KEY, 'true');
    localStorage.setItem('rx_ai_username', formattedName);
    return true;
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem(SESSION_KEY);
    localStorage.removeItem('rx_ai_username');
  };

  const updateProfile = (newName: string) => {
    setUser({ initials: newName.substring(0, 2).toUpperCase(), name: newName });
    localStorage.setItem('rx_ai_username', newName);
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, updateProfile, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}
