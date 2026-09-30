import { useState } from 'react';
import { getToolById } from '../../data/tools';
import { answerPatternOffer } from '../../services/profile';
import { profileCache } from '../../lib/profileCache';
import { fillToolName } from '../../lib/spine/todayCard';

const ANSWERS = ['yes', 'not_now', 'no'] as const;
const DEFAULT_LABELS = { yes: 'Yes, keep it', not_now: 'Not now', no: 'No' } as const;

/**
 * A pattern the app noticed, offered (never promoted) to My patterns (rule 4). Yes keeps it;
 * not now asks again after a cooldown; no means never for this pattern.
 */
export function PatternOfferCard({ id, statement, offerCopy, toolId, choices, onDone }: {
  id: string; statement: string; offerCopy?: string; toolId?: string | null;
  /** Graph copy for the answers (FollowUpType pattern_offer); defaults below. */
  choices?: Array<{ id: string; label: string }>;
  onDone?: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const toolName = toolId ? getToolById(toolId)?.name : null;
  const answer = async (a: 'yes' | 'not_now' | 'no') => {
    setBusy(true);
    try {
      const r = await answerPatternOffer(id, a);
      if (r.version != null) profileCache.bump(r.version);
    } catch { /* the offer comes back on the next load */ }
    onDone?.();
  };
  return (
    <section aria-label="Something we noticed" className="p-4 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-elevated)]">
      <p className="font-medium text-[var(--color-text-primary)]">{fillToolName(statement, toolName)}</p>
      {offerCopy && <p className="mt-1 text-sm text-[var(--color-text-secondary)]">{offerCopy}</p>}
      <div className="mt-3 flex flex-wrap gap-2">
        {ANSWERS.map((a) => [a, choices?.find((c) => c.id === a)?.label ?? DEFAULT_LABELS[a]] as const).map(([a, label]) => (
          <button key={a} type="button" disabled={busy} onClick={() => answer(a)}
            className="min-h-11 px-3 rounded-lg border border-[var(--color-border)] text-sm text-[var(--color-text-secondary)] hover:border-[var(--color-border-accent)] disabled:opacity-50">
            {label}
          </button>
        ))}
      </div>
    </section>
  );
}
