import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { getOppositeActionFollowUps } from '../services/neo4j';
import type { SavedOppositeActionSession } from '../data/oppositeActionTypes';
import { followUpState, type FollowUpState } from '../lib/oppositeActionFollowUp';

export interface PendingFollowUp {
  session: SavedOppositeActionSession;
  state: FollowUpState;
}

export interface OppositeActionFollowUpsValue {
  /** Planned "try it later" sessions: due first, then stale, then upcoming. */
  pending: PendingFollowUp[];
  loading: boolean;
  error: string | null;
  /** Graph copy for the card/reminder (followUpCardDue, notificationBody, ...); null until loaded or on error. */
  copy: Record<string, string> | null;
  /** True once the first fetch for this user has finished (success or failure). */
  ready: boolean;
  /** Re-fetch now (e.g. after the user reflects on a plan). */
  refresh: () => void;
}

const DAY = 24 * 60 * 60 * 1000;
/** We only schedule a reminder within the next day. */
const MAX_NOTIFY_DELAY_MS = DAY;
/** Re-fetch on tab focus at most this often. */
const FOCUS_REFETCH_MS = 5 * 60 * 1000;

/** Neutral, content-free fallback (no emotion, urge, or action text). */
const FALLBACK_NOTIFICATION_BODY = 'You made a plan earlier. 20-second check-in?';
const NOTIFICATION_TITLE = 'Quick check-in';

const STATE_ORDER: Record<FollowUpState, number> = { due: 0, stale: 1, upcoming: 2 };

export function followUpPath(sessionId: string): string {
  return `/tool/opposite-action?followUp=${encodeURIComponent(sessionId)}`;
}

function pendingFrom(sessions: SavedOppositeActionSession[], now: Date): PendingFollowUp[] {
  return sessions
    .filter((s) => s.status === 'planned' && !!s.dueAt)
    .map((session) => ({ session, state: followUpState(session.dueAt, now) }))
    .sort((a, b) => {
      const byState = STATE_ORDER[a.state] - STATE_ORDER[b.state];
      if (byState !== 0) return byState;
      const ta = new Date(a.session.dueAt).getTime();
      const tb = new Date(b.session.dueAt).getTime();
      // Stale: most recent first. Due/upcoming: soonest first.
      return a.state === 'stale' ? tb - ta : ta - tb;
    });
}

interface FetchResult {
  uid: string;
  sessions: SavedOppositeActionSession[];
  copy: Record<string, string> | null;
  error: string | null;
}

/**
 * App-level state for pending Opposite Action follow-ups. Mount once (via
 * OppositeActionFollowUpProvider in DashboardLayout); consumers read it with
 * useOppositeActionFollowUpsContext().
 *
 * - Fetches once per signed-in user, and again on tab focus (throttled to 5 min).
 * - Schedules one content-free in-tab notification for the earliest upcoming plan,
 *   only if notification permission is already granted (never prompts).
 */
export function useOppositeActionFollowUpsState(): OppositeActionFollowUpsValue {
  const { user } = useAuth();
  const navigate = useNavigate();
  const uid = user?.uid ?? null;

  const [result, setResult] = useState<FetchResult | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [now, setNow] = useState(() => new Date());
  const lastFetchRef = useRef(0);

  useEffect(() => {
    if (!uid) return;
    let cancelled = false;
    lastFetchRef.current = Date.now();
    getOppositeActionFollowUps()
      .then(({ sessions, copy }) => {
        if (cancelled) return;
        setNow(new Date());
        setResult({ uid, sessions: sessions ?? [], copy: copy ?? null, error: null });
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        console.warn('Could not load Opposite Action follow-ups', err);
        setResult({ uid, sessions: [], copy: null, error: 'Could not load your planned steps.' });
      });
    return () => {
      cancelled = true;
    };
  }, [uid, reloadKey]);

  const refresh = useCallback(() => setReloadKey((k) => k + 1), []);

  // A plan saved or reflected on in another tab should show up / disappear on return.
  useEffect(() => {
    if (!uid) return;
    const onVisible = () => {
      if (document.visibilityState !== 'visible') return;
      setNow(new Date());
      if (Date.now() - lastFetchRef.current >= FOCUS_REFETCH_MS) refresh();
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, [uid, refresh]);

  const current = result && result.uid === uid ? result : null;
  const loading = !!uid && !current;
  const error = current?.error ?? null;
  const copy = current?.copy ?? null;

  const pending = useMemo(
    () => (uid && current ? pendingFrom(current.sessions, now) : []),
    [uid, current, now],
  );

  const notificationBody = copy?.notificationBody || FALLBACK_NOTIFICATION_BODY;

  // In-tab reminder for the earliest upcoming plan while the app is open.
  const nextUpcoming = pending
    .filter((p) => p.state === 'upcoming')
    .reduce<PendingFollowUp | null>(
      (best, p) =>
        !best || new Date(p.session.dueAt).getTime() < new Date(best.session.dueAt).getTime() ? p : best,
      null,
    );
  const nextId = nextUpcoming?.session.id ?? null;
  const nextDueAt = nextUpcoming?.session.dueAt ?? null;

  useEffect(() => {
    if (!nextId || !nextDueAt) return;
    const delay = new Date(nextDueAt).getTime() - Date.now();
    if (!Number.isFinite(delay) || delay < 0 || delay > MAX_NOTIFY_DELAY_MS) return;

    const timer = window.setTimeout(() => {
      setNow(new Date());
      if (!('Notification' in window) || Notification.permission !== 'granted') return;
      try {
        const n = new Notification(NOTIFICATION_TITLE, {
          body: notificationBody,
          icon: '/favicon.ico',
          tag: `oa-followup-${nextId}`,
        });
        n.onclick = () => {
          window.focus();
          navigate(followUpPath(nextId));
          n.close();
        };
      } catch (err) {
        // Some platforms (e.g. Android Chrome) only allow notifications via a service worker.
        console.warn('Could not show follow-up notification', err);
      }
    }, Math.max(0, delay));

    return () => window.clearTimeout(timer);
  }, [nextId, nextDueAt, notificationBody, navigate]);

  return useMemo(
    () => ({ pending, loading, error, copy, ready: !!current, refresh }),
    [pending, loading, error, copy, current, refresh],
  );
}

export const OppositeActionFollowUpContext = createContext<OppositeActionFollowUpsValue | null>(null);

const noop = () => {};
const EMPTY: OppositeActionFollowUpsValue = {
  pending: [],
  loading: false,
  error: null,
  copy: null,
  ready: false,
  refresh: noop,
};

/**
 * Null-safe access to app-level follow-ups. Without a provider (tests, pages outside
 * DashboardLayout) it returns an empty list and a no-op refresh.
 */
export function useOppositeActionFollowUpsContext(): OppositeActionFollowUpsValue {
  return useContext(OppositeActionFollowUpContext) ?? EMPTY;
}
