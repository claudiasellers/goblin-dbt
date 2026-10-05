import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from './AuthContext';
import { TodayContext, type TodayValue } from '../hooks/useToday';
import { getToday, type GetTodayResponse } from '../services/spine';
import { useBand } from '../hooks/useBand';
import { useProfileContext } from '../hooks/useProfileContext';
import { inQuietHours } from '../lib/quietHours';

const FOCUS_REFETCH_MS = 5 * 60_000;
const MAX_NOTIFY_DELAY_MS = 24 * 3_600_000;
const NOTIFICATION_TITLE = 'Quick check-in';

/**
 * Today stack state (PR-S5), mounted once in DashboardLayout so the desktop side panel and the
 * header's Today button (below lg) read the same items. Fetches per signed-in user, again on focus (5-min throttle) and
 * after refresh(). Schedules one content-free in-tab reminder for `nextInTab`, only when permission
 * is already granted (never prompts; push is PR-S8). OA plans keep their own reminder.
 */
export function TodayProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const uid = user?.uid ?? null;
  // A fresh band (client-only, R1) goes to getToday so a `flooded` answer collapses the stack to
  // "Your plans will keep" (E2 GetTodayRequest). Refetched when the current band changes.
  const bandValue = useBand().current()?.value;
  // Quiet hours from Me (PROFILE_NEEDS.today): no in-tab reminder inside the window (Codex, #20).
  const quiet = useProfileContext('today').slices?.quietHours ?? null;
  const [data, setData] = useState<{ uid: string; res: GetTodayResponse } | null>(null);
  const [dropped, setDropped] = useState<Set<string>>(new Set());
  const [reloadKey, setReloadKey] = useState(0);
  const [hidden, setHidden] = useState(false);
  const lastFetch = useRef(0);

  useEffect(() => {
    if (!uid) return;
    let live = true;
    lastFetch.current = Date.now();
    getToday(bandValue)
      .then((res) => { if (live) { setData({ uid, res }); setDropped(new Set()); } })
      .catch(() => { if (live) setData({ uid, res: { items: [], more: [], holding: false, nextInTab: null } }); });
    return () => { live = false; };
  }, [uid, reloadKey, bandValue]);

  const refresh = useCallback(() => setReloadKey((k) => k + 1), []);
  const drop = useCallback((id: string) => setDropped((prev) => new Set(prev).add(id)), []);

  useEffect(() => {
    if (!uid) return;
    const onVisible = () => {
      if (document.visibilityState === 'visible' && Date.now() - lastFetch.current >= FOCUS_REFETCH_MS) refresh();
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, [uid, refresh]);

  const current = data && data.uid === uid ? data.res : null;
  const next = current?.nextInTab ?? null;
  useEffect(() => {
    if (!next) return;
    const delay = Date.parse(next.at) - Date.now();
    if (!Number.isFinite(delay) || delay < 0 || delay > MAX_NOTIFY_DELAY_MS) return;
    const timer = window.setTimeout(() => {
      refresh();
      if (!('Notification' in window) || Notification.permission !== 'granted' || !next.body) return;
      if (inQuietHours(new Date(), quiet)) return;
      const show = async () => {
        // Android Chrome only allows notifications through a service worker registration.
        const reg = 'serviceWorker' in navigator ? await navigator.serviceWorker.getRegistration() : undefined;
        if (reg) {
          await reg.showNotification(NOTIFICATION_TITLE, { body: next.body, tag: `today-${next.at}` });
          return;
        }
        const n = new Notification(NOTIFICATION_TITLE, { body: next.body, tag: `today-${next.at}` });
        n.onclick = () => { window.focus(); navigate(next.deepLink); n.close(); };
      };
      show().catch(() => { /* notifications are best effort */ });
    }, Math.max(0, delay));
    return () => window.clearTimeout(timer);
  }, [next, navigate, refresh, quiet]);

  const value = useMemo<TodayValue>(() => ({
    items: (current?.items ?? []).filter((i) => !dropped.has(i.id)),
    more: (current?.more ?? []).filter((i) => !dropped.has(i.id)),
    holding: current?.holding ?? false,
    ready: !!current,
    refresh,
    drop,
    hidden,
    setHidden,
  }), [current, dropped, refresh, drop, hidden]);

  return <TodayContext.Provider value={value}>{children}</TodayContext.Provider>;
}
