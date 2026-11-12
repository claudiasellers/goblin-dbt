import type { AuthPhase } from './authPhase';

/**
 * The Tools page's intro line. "No account needed" tells signed-out people the tools work without signing
 * in. It reads as confusing to someone signed in, so it shows only once auth has settled with no user
 * (never while it resolves, so a signed-in reload doesn't flash it).
 */
export function toolsIntro(phase: AuthPhase): string {
  return phase === 'signed_out' ? 'Skills you can use right now. No account needed.' : 'Skills you can use right now.';
}
