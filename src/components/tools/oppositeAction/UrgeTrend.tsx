import { useEffect, useState } from 'react';
import { useAuth } from '../../../contexts/AuthContext';
import { getOppositeActionSessions } from '../../../services/neo4j';
import type { SavedOppositeActionSession } from '../../../data/oppositeActionTypes';

interface Props {
  urgeId: string;
  /** The session just completed; included once it has been saved. */
  currentSessionId: string;
}

interface Point {
  id: string;
  before: number;
  after: number;
}

const MAX_POINTS = 6;
const BAR_H = 28;
const BAR_W = 6;

function clamp(n: number): number {
  return Math.max(0, Math.min(10, n));
}

function pointsFor(sessions: SavedOppositeActionSession[], urgeId: string): Point[] {
  return sessions
    .filter((s) => s.urgeId === urgeId && s.status === 'practiced' && s.urgeAfter !== null)
    .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
    .slice(-MAX_POINTS)
    .map((s) => ({ id: s.id, before: clamp(s.urgeBefore), after: clamp(s.urgeAfter as number) }));
}

/** Two tiny bars: before (outline) and after (filled). Heights are 0–10 scaled. */
function PairBars({ before, after }: { before: number; after: number }) {
  const h = (v: number) => Math.max(1, (v / 10) * BAR_H);
  return (
    <svg width={BAR_W * 2 + 3} height={BAR_H} viewBox={`0 0 ${BAR_W * 2 + 3} ${BAR_H}`} aria-hidden="true" focusable="false">
      <rect
        x={0.5}
        y={BAR_H - h(before) + 0.5}
        width={BAR_W - 1}
        height={Math.max(0, h(before) - 1)}
        rx={1}
        fill="none"
        stroke="var(--color-text-secondary)"
        strokeWidth={1}
      />
      <rect x={BAR_W + 3} y={BAR_H - h(after)} width={BAR_W} height={h(after)} rx={1} fill="var(--color-accent-fill)" />
    </svg>
  );
}

/**
 * Per-urge history: the pull before → after for the last few practices.
 * Signed-in only. Renders nothing until there are at least two practices to compare.
 */
export function UrgeTrend({ urgeId, currentSessionId }: Props) {
  const { user } = useAuth();
  const uid = user?.uid ?? null;
  const [loaded, setLoaded] = useState<{ key: string; sessions: SavedOppositeActionSession[] } | null>(null);
  // Refetch when the current session changes (it may have just been saved).
  const key = `${uid}:${currentSessionId}`;

  useEffect(() => {
    if (!uid) return;
    let cancelled = false;
    getOppositeActionSessions(50)
      .then((sessions) => {
        if (!cancelled) setLoaded({ key, sessions });
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        console.warn('Could not load urge history', err);
        setLoaded({ key, sessions: [] });
      });
    return () => {
      cancelled = true;
    };
  }, [uid, key]);

  if (!uid || !loaded || loaded.key !== key) return null;
  const points = pointsFor(loaded.sessions, urgeId);
  if (points.length < 2) return null;

  const summary = points.map((p) => `${p.before} to ${p.after}`).join(', ');

  return (
    <figure className="mt-4 p-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-elevated)]">
      <p className="sr-only">
        Pull before and after, last {points.length} practices, oldest first: {summary}.
      </p>
      <ol className="flex flex-wrap items-end gap-3" aria-hidden="true">
        {points.map((p) => (
          <li key={p.id} className="flex flex-col items-center gap-1">
            <PairBars before={p.before} after={p.after} />
            <span
              className={`text-xs tabular-nums ${
                p.id === currentSessionId ? 'font-semibold text-[var(--color-text-primary)]' : 'text-[var(--color-text-secondary)]'
              }`}
            >
              {p.before}→{p.after}
            </span>
          </li>
        ))}
      </ol>
      <figcaption className="mt-2 text-xs text-[var(--color-text-secondary)]" aria-hidden="true">
        Pull before → after, last {points.length} practices
      </figcaption>
    </figure>
  );
}
