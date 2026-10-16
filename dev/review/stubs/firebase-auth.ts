/**
 * Review harness stub for firebase/auth (aliased in dev/vite.harness.config.ts): always signed in as the
 * invented reviewer, so the real AuthProvider, profile and tool-session code run unchanged.
 */
import { REVIEW_USER } from '../backend';

export type User = typeof REVIEW_USER;
export function getAuth(...args: unknown[]): Record<string, never> {
  void args;
  return {};
}
export function onAuthStateChanged(_auth: unknown, cb: (u: User | null) => void): () => void {
  const t = setTimeout(() => cb(REVIEW_USER), 0);
  return () => clearTimeout(t);
}
export async function createUserWithEmailAndPassword(): Promise<{ user: User }> { return { user: REVIEW_USER }; }
export async function signInWithEmailAndPassword(): Promise<{ user: User }> { return { user: REVIEW_USER }; }
export async function signOut(): Promise<void> {}
