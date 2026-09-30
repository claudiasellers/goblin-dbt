import type { ReactNode } from 'react';
import { useAuth } from './AuthContext';
import { BandProvider } from './BandContext';

/** The app's band provider: owned by the signed-in user (mounted inside AuthProvider in main.tsx). */
export function AuthBandProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  return <BandProvider owner={user?.uid ?? null}>{children}</BandProvider>;
}
