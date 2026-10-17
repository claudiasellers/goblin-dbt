import { useEffect, useState } from 'react';
import { useUserProfile } from '../contexts/UserProfileContext';

export type ToolGate = 'open' | 'loading' | 'closed';

/**
 * The tools behind the parts switch and their own signed-off copy. Two pulls also needs its address to
 * resolve (two kept parts, or a shipped pair): anything else is "not found", never a blank page.
 */
const GATED: Record<string, (search: string) => Promise<boolean>> = {
  // Fetched only here, with parts on: each tool's content check (and its step machine) stays out of the entry.
  'meet-a-part': () => import('../services/meetAPart').then((m) => m.loadMeetAPartContent()).then((c) => c !== null),
  'two-pulls': (search) => import('../services/twoPulls').then((m) => m.twoPullsOpens(search)),
};

/**
 * Whether a tool may open. Most tools always may; Meet a part and Two pulls only with parts on and all
 * their copy signed off, else ToolPage shows its "Tool not found." (never half a flow, never a hint that
 * it exists).
 */
export function useToolGate(toolId: string | undefined, search = ''): ToolGate {
  const check = toolId ? GATED[toolId] : undefined;
  const gated = !!check;
  const { profile, loading } = useUserProfile();
  const on = profile.partsEnabled;
  /** The check's answer, for the address it was asked about. */
  const [ready, setReady] = useState<{ search: string; ok: boolean } | null>(null);
  useEffect(() => {
    if (!gated || !on) return;
    let live = true;
    check!(search).then((ok) => { if (live) setReady({ search, ok }); }).catch(() => { if (live) setReady({ search, ok: false }); });
    return () => { live = false; };
  }, [gated, on, check, search]);
  if (!gated) return 'open';
  if (!on) return loading ? 'loading' : 'closed';
  if (ready === null || ready.search !== search) return 'loading';
  return ready.ok ? 'open' : 'closed';
}
