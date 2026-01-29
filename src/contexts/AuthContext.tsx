import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { onAuthChange, logIn, logOut, signUp, type User } from '../services/firebase';

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

  useEffect(() => {
    const unsubscribe = onAuthChange((user) => {
      setUser(user);
      setLoading(false);
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
