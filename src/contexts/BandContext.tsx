import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { BandContext, type BandApi, type BandContentStatus } from '../hooks/useBand';
import type { CapacityContent, CapacityReading } from '../data/capacityTypes';
import {
  DEFAULT_FRESH_MINUTES, carryReading, clearStored, freshest, makeReading, readStored, sessionStore, writeStored,
  type RecordInput,
} from '../lib/bandStore';
import { clearResumeTokens } from '../lib/resumeToken';
import { PLAN_BUILD_KEY, PLAN_KEY, deviceOwnedBy } from '../lib/safetyPlan';

/** A safety plan kept on this device under an account that just signed out (CORE-02): it goes with them. */
function clearDevicePlanOf(uid: string): void {
  try {
    const v = localStorage.getItem(PLAN_KEY);
    if (v && deviceOwnedBy(JSON.parse(v), uid)) localStorage.removeItem(PLAN_KEY);
  } catch { /* private mode */ }
  // A plan being built in this tab goes too, whoever made it (it may hold names and numbers).
  try { sessionStorage.removeItem(PLAN_BUILD_KEY); } catch { /* private mode */ }
}
import { newId } from '../lib/spine/ids';
import { isCurrent } from '../lib/band';

/**
 * The band store (E3 §A4.2.5). `owner` is the signed-in uid (null when signed out): a reading
 * belongs to one owner, and when the owner changes from a signed-in uid (sign-out, another
 * account) the reading and every P2 resume token on the device are cleared.
 *
 * `content` / `loader` let the dev harness and tests run without Firebase.
 */
export function BandProvider({ owner, children, content: initial, loader }: {
  owner: string | null;
  children: ReactNode;
  content?: CapacityContent;
  loader?: () => Promise<CapacityContent>;
}) {
  const [content, setContent] = useState<CapacityContent | null>(initial ?? null);
  const [status, setStatus] = useState<BandContentStatus>(initial ? 'ready' : 'idle');
  const [version, setVersion] = useState(0);
  const memory = useRef<CapacityReading | null>(null);
  const inflight = useRef<Promise<unknown> | null>(null);
  const prevOwner = useRef<string | null>(owner);

  // Sign-out (or a different account): forget the band, the resume drafts and that account's device plan copy.
  useEffect(() => {
    const prev = prevOwner.current;
    prevOwner.current = owner;
    if (prev !== null && prev !== owner) {
      memory.current = null;
      clearStored(sessionStore());
      clearResumeTokens();
      clearDevicePlanOf(prev);
      setVersion((v) => v + 1);
    }
  }, [owner]);

  const load = useCallback(() => {
    if (content || inflight.current) return;
    const get = loader ?? (() => import('../services/capacity').then((m) => m.getCapacityContent()));
    setStatus('loading');
    inflight.current = get()
      .then((c) => { setContent(c); setStatus('ready'); })
      .catch(() => { setStatus('error'); })
      .finally(() => { inflight.current = null; });
  }, [content, loader]);

  const fresh = content?.freshMinutes ?? DEFAULT_FRESH_MINUTES;

  const current = useCallback((now: number = Date.now()) => {
    const r = freshest(memory.current, readStored(sessionStore(), owner), now, fresh);
    return r && isCurrent(r, now, fresh) ? r : null;
  }, [owner, fresh]);

  const record = useCallback((input: RecordInput) => {
    const r = makeReading(input, newId(), new Date());
    if (r.framing === 'now') {
      memory.current = r;
      writeStored(sessionStore(), owner, r);
      setVersion((v) => v + 1);
    }
    return r;
  }, [owner]);

  const carry = useCallback((context: string, hostSessionId?: string) => {
    const r = current();
    return r ? carryReading(r, { context, hostSessionId }, newId(), new Date()) : null;
  }, [current]);

  const clear = useCallback(() => {
    memory.current = null;
    clearStored(sessionStore());
    setVersion((v) => v + 1);
  }, []);

  // `version` re-renders consumers when the reading changes (current() reads the ref).
  const api = useMemo<BandApi>(() => ({ content, status, load, current, record, carry, clear }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [content, status, load, current, record, carry, clear, version]);
  return <BandContext.Provider value={api}>{children}</BandContext.Provider>;
}
