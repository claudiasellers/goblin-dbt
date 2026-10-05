import { useState } from 'react';
import { Link } from 'react-router-dom';
import type { PendingFollowUp } from '../../../hooks/useOppositeActionFollowUps';
import { followUpPath } from '../../../hooks/useOppositeActionFollowUps';

interface Props {
  pending: PendingFollowUp[];
  /** Flow copy from the graph (flow.copy); null falls back to neutral chrome. */
  copy: Record<string, string> | null;
  /** "Hide for now": the owner (Today) hides these plans, so its count and every stack agree. */
  onDismiss: () => void;
}

const FALLBACK_HEADLINE = 'You planned a step earlier.';

function headlineFor(item: PendingFollowUp, copy: Record<string, string> | null): string {
  const key =
    item.state === 'due' ? 'followUpCardDue' : item.state === 'stale' ? 'followUpCardStale' : 'followUpCardUpcoming';
  return copy?.[key] || FALLBACK_HEADLINE;
}

/** "around 4 PM", or "tomorrow around 9 AM" when not today. */
function relativeTime(dueAt: string, now: Date = new Date()): string {
  const d = new Date(dueAt);
  if (!Number.isFinite(d.getTime())) return '';
  const time = d.toLocaleTimeString(undefined, {
    hour: 'numeric',
    ...(d.getMinutes() !== 0 ? { minute: '2-digit' } : {}),
  });
  const tomorrow = new Date(now);
  tomorrow.setDate(now.getDate() + 1);
  if (d.toDateString() === now.toDateString()) return `around ${time}`;
  if (d.toDateString() === tomorrow.toDateString()) return `tomorrow around ${time}`;
  return `${d.toLocaleDateString(undefined, { weekday: 'short' })} around ${time}`;
}

function DismissButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label="Hide for now"
      className="-mr-2 -mt-2 min-w-[44px] min-h-[44px] flex items-center justify-center rounded-lg text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors"
    >
      <span aria-hidden="true">×</span>
    </button>
  );
}

/**
 * Home-screen card for Opposite Action plans made for later.
 * Works with notifications off: the next time the app opens, the plan is here.
 */
export function OppositeActionFollowUpCard({ pending, copy, onDismiss }: Props) {
  const [expanded, setExpanded] = useState(false);

  if (pending.length === 0) return null;

  const [top, ...rest] = pending;
  const { session, state } = top;
  const headline = headlineFor(top, copy);
  const isUpcoming = state === 'upcoming';

  const moreList = rest.length > 0 && (
    <div className="mt-2">
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        aria-expanded={expanded}
        className="min-h-[44px] text-xs text-[var(--color-text-secondary)] underline underline-offset-2"
      >
        {expanded ? 'Show less' : `+${rest.length} more`}
      </button>
      {expanded && (
        <ul className="mt-1 space-y-1">
          {rest.map((item) => (
            <li key={item.session.id}>
              <Link
                to={followUpPath(item.session.id)}
                className="flex items-center justify-between gap-3 min-h-[44px] px-3 py-2 rounded-lg border border-[var(--color-border)] text-sm text-[var(--color-text-primary)]"
              >
                <span className="min-w-0 truncate">{item.session.action || headlineFor(item, copy)}</span>
                <span className="flex-shrink-0 text-xs text-[var(--color-text-secondary)]">
                  {item.state === 'upcoming' ? relativeTime(item.session.dueAt) : 'Check in'}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );

  if (isUpcoming) {
    const when = relativeTime(session.dueAt);
    return (
      <section
        aria-label="Planned step"
        className="px-4 py-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-elevated)]"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-sm text-[var(--color-text-secondary)]">
              {headline}
              {when && <> <span className="whitespace-nowrap">({when})</span></>}
            </p>
            {session.action && (
              <p className="text-sm text-[var(--color-text-primary)] mt-1">{session.action}</p>
            )}
          </div>
          <DismissButton onClick={onDismiss} />
        </div>
        <Link
          to={followUpPath(session.id)}
          className="inline-flex items-center min-h-[44px] text-sm font-medium text-[var(--color-text-secondary)] underline underline-offset-2 hover:text-[var(--color-text-primary)]"
        >
          Check in now
        </Link>
        {moreList}
      </section>
    );
  }

  return (
    <section
      aria-label="Check in on a planned step"
      className="p-4 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-elevated)]"
    >
      <div className="flex items-start justify-between gap-3">
        <p className="font-medium text-[var(--color-text-primary)]">{headline}</p>
        <DismissButton onClick={onDismiss} />
      </div>
      {session.action && (
        <p className="mt-1 text-sm text-[var(--color-text-secondary)]">{session.action}</p>
      )}
      <Link
        to={followUpPath(session.id)}
        className="mt-3 flex items-center justify-center w-full min-h-[44px] px-4 rounded-lg bg-[var(--color-accent-fill)] text-[var(--color-on-accent)] font-medium lift-primary"
      >
        Check in — 20 seconds
      </Link>
      {moreList}
    </section>
  );
}
