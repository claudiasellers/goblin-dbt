import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { onAuthChange, logIn, logOut, signUp, type User } from '../services/firebase';
import { ensureUserExists } from '../services/neo4j';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  signUp: (email: string, password: string) => Promise<void>;
  logIn: (email: string, password: string) => Promise<void>;
  logOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const ensured = useRef<string | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthChange((user) => {
      setUser(user);
      setLoading(false);
      // The graph User exists before any write (F4). Once per uid per page load; the onUserCreated
      // trigger covers new accounts and every write MERGEs the user, so a failure here is harmless.
      if (user && ensured.current !== user.uid) {
        ensured.current = user.uid;
        ensureUserExists().catch(() => { ensured.current = null; });
      }
      if (!user) ensured.current = null;
    });

    return unsubscribe;
  }, []);

  async function handleSignUp(email: string, password: string) {
    await signUp(email, password);
  }

  async function handleLogIn(email: string, password: string) {
    await logIn(email, password);
  }

  async function handleLogOut() {
    await logOut();
  }

  const value: AuthContextType = {
    user,
    loading,
    signUp: handleSignUp,
    logIn: handleLogIn,
    logOut: handleLogOut,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}
