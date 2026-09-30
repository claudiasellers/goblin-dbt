import { useState } from 'react';
import { Link } from 'react-router-dom';
import { getToolById } from '../../data/tools';
import type { TodayItem } from '../../services/spine';
import { answerToolOutcome, dismissFollowUp, resolveFollowUp, snoozeFollowUp } from '../../services/spine';
import { fillToolName, LATER_HOURS, outcomeAnswer } from '../../lib/spine/todayCard';

/**
 * One Today card (PR-S5): a follow-up resolved in place (inline types), a deep link (resume), or the
 * "did it help?" for a tool session closed without an answer. One tap; nothing is a number.
 */
export function TodayCard({ item, onDone }: { item: TodayItem; onDone: (id: string) => void }) {
  const [busy, setBusy] = useState(false);
  const toolName = item.source?.toolId ? getToolById(item.source.toolId)?.name : null;
  const title = fillToolName(item.copy.title, toolName);
  const body = item.copy.body ? fillToolName(item.copy.body, toolName) : null;

  const run = async (fn: () => Promise<unknown>) => {
    setBusy(true);
    try { await fn(); } catch { /* the card comes back on the next fetch */ }
    onDone(item.id);
  };

  const choose = (choiceId: string) => {
    if (item.kind === 'tool_outcome') {
      const answer = outcomeAnswer(choiceId);
      if (answer && item.source?.toolSessionId) void run(() => answerToolOutcome(item.source!.toolSessionId!, answer));
      return;
    }
    void run(() => resolveFollowUp(item.id, choiceId));
  };
  const later = () => void run(() => snoozeFollowUp(item.id, new Date(Date.now() + LATER_HOURS * 3_600_000)));
  const notNow = () => {
    if (item.kind === 'tool_outcome' && item.source?.toolSessionId) {
      void run(() => answerToolOutcome(item.source!.toolSessionId!, { dismissed: true }));
    } else {
      void run(() => dismissFollowUp(item.id));
    }
  };

  return (
    <section aria-label={title} className="p-4 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-elevated)]">
      <p className="font-medium text-[var(--color-text-primary)]">{title}</p>
      {body && <p className="mt-1 text-sm text-[var(--color-text-secondary)]">{body}</p>}
      {item.resolveMode === 'deeplink' && item.deepLink ? (
        <Link
          to={item.deepLink}
          className="mt-3 flex items-center justify-center w-full min-h-11 px-4 rounded-lg bg-[var(--color-accent-fill)] text-[var(--color-on-accent)] font-medium lift-primary"
        >
          Open
        </Link>
      ) : (
        <div className="mt-3 grid grid-cols-2 gap-2">
          {item.choices.map((c) => (
            <button
              key={c.id}
              type="button"
              disabled={busy}
              onClick={() => (c.snoozeHours ? void run(() => resolveFollowUp(item.id, c.id)) : choose(c.id))}
              className="min-h-11 px-3 py-2 rounded-lg border border-[var(--color-border)] text-sm text-[var(--color-text-secondary)] hover:border-[var(--color-border-accent)] hover:text-[var(--color-text-primary)] disabled:opacity-50 transition-colors"
            >
              {c.label}
            </button>
          ))}
        </div>
      )}
      <div className="mt-1 flex justify-end gap-4">
        {item.kind === 'follow_up' && (
          <button type="button" disabled={busy} onClick={later}
            className="min-h-11 text-sm text-[var(--color-text-tertiary)] hover:text-[var(--color-text-secondary)]">
            Later
          </button>
        )}
        <button type="button" disabled={busy} onClick={notNow}
          className="min-h-11 text-sm text-[var(--color-text-tertiary)] hover:text-[var(--color-text-secondary)]">
          {item.kind === 'tool_outcome' ? 'Skip' : 'Not any more'}
        </button>
      </div>
    </section>
  );
}
