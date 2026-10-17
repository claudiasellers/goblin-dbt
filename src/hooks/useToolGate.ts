import { useEffect, useState } from 'react';
import { useUserProfile } from '../contexts/UserProfileContext';

export type ToolGate = 'open' | 'loading' | 'closed';

/**
 * Whether a tool may open. Most tools always may; Meet a part only with parts on and all its copy signed
 * off, else ToolPage shows its "Tool not found." (never half a flow, never a hint that it exists).
 */
export function useToolGate(toolId: string | undefined): ToolGate {
  const gated = toolId === 'meet-a-part';
  const { profile, loading } = useUserProfile();
  const on = profile.partsEnabled;
  const [ready, setReady] = useState<boolean | null>(null);
  useEffect(() => {
    if (!gated || !on) return;
    let live = true;
    // Fetched only here, with parts on: Meet a part's content check (and its step machine) stays out of the entry.
    import('../services/meetAPart').then((m) => m.loadMeetAPartContent())
      .then((c) => { if (live) setReady(c !== null); }).catch(() => { if (live) setReady(false); });
    return () => { live = false; };
  }, [gated, on]);
  if (!gated) return 'open';
  if (!on) return loading ? 'loading' : 'closed';
  if (ready === null) return 'loading';
  return ready ? 'open' : 'closed';
}
