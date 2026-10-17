import { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { getProfileContext } from '../services/profile';
import { profileCache } from '../lib/profileCache';
import type { ClientProfileConsumer, NeedsOf, ProfileSlices } from '../data/profileTypes';

type SlicesOf<T extends ClientProfileConsumer> = Pick<ProfileSlices, NeedsOf<T>>;
export interface ProfileContextState<T extends ClientProfileConsumer> {
  status: 'loading' | 'ready' | 'error' | 'signed-out';
  slices: SlicesOf<T> | null;
  version: number;
}

/**
 * The profile slices a tool declared (PROFILE_NEEDS), through the single read path. Tools render
 * their fallback while `slices` is null (loading, error or signed out). `enabled: false` reads
 * nothing (stays 'loading'): a tool whose only use for the profile is behind a setting (DEAR MAN's
 * cope ahead, parts on) makes no call while it's off.
 */
export function useProfileContext<T extends ClientProfileConsumer>(toolId: T, { enabled = true }: { enabled?: boolean } = {}): ProfileContextState<T> {
  const { user } = useAuth();
  const uid = user?.uid ?? null;
  const [state, setState] = useState<{ key: string; value: ProfileContextState<T> } | null>(null);
  const key = `${uid ?? '-'}:${toolId}`;

  useEffect(() => {
    profileCache.setUser(uid);
    if (!uid || !enabled) return;
    const cached = profileCache.get(toolId, Date.now()) as { version: number; slices: unknown } | null;
    let live = true;
    const load = cached ? Promise.resolve(cached) : getProfileContext(toolId).then((r) => {
      profileCache.set(toolId, r.version, { version: r.version, slices: r.slices }, Date.now());
      return { version: r.version, slices: r.slices as unknown };
    });
    load
      .then((r) => { if (live) setState({ key, value: { status: 'ready', slices: r.slices as SlicesOf<T>, version: r.version } }); })
      .catch(() => { if (live) setState({ key, value: { status: 'error', slices: null, version: 0 } }); });
    return () => { live = false; };
  }, [uid, toolId, key, enabled]);

  if (!uid) return { status: 'signed-out', slices: null, version: 0 };
  if (!enabled) return { status: 'loading', slices: null, version: 0 };
  if (!state || state.key !== key) return { status: 'loading', slices: null, version: 0 };
  return state.value;
}
