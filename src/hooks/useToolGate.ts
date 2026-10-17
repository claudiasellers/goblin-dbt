import { useEffect, useState } from 'react';
import { useUserProfile } from '../contexts/UserProfileContext';

export type ToolGate = 'open' | 'loading' | 'closed';

/** The tools behind the parts switch and their own signed-off copy. */
const GATED: Record<string, () => Promise<boolean>> = {
  // Fetched only here, with parts on: each tool's content check (and its step machine) stays out of the entry.
  'meet-a-part': () => import('../services/meetAPart').then((m) => m.loadMeetAPartContent()).then((c) => c !== null),
  'two-pulls': () => import('../services/twoPulls').then((m) => m.loadTwoPullsContent()).then((c) => c !== null),
};

/**
 * Whether a tool may open. Most tools always may; Meet a part and Two pulls only with parts on and all
 * their copy signed off, else ToolPage shows its "Tool not found." (never half a flow, never a hint that
 * it exists).
 */
export function useToolGate(toolId: string | undefined): ToolGate {
  const check = toolId ? GATED[toolId] : undefined;
  const gated = !!check;
  const { profile, loading } = useUserProfile();
  const on = profile.partsEnabled;
  const [ready, setReady] = useState<boolean | null>(null);
  useEffect(() => {
    if (!gated || !on) return;
    let live = true;
    check!().then((ok) => { if (live) setReady(ok); }).catch(() => { if (live) setReady(false); });
    return () => { live = false; };
  }, [gated, on, check]);
  if (!gated) return 'open';
  if (!on) return loading ? 'loading' : 'closed';
  if (ready === null) return 'loading';
  return ready ? 'open' : 'closed';
}
