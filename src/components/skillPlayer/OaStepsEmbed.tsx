import { useEffect } from 'react';
import type { EmbedProps } from './embeds';

/**
 * Do the Opposite's step card (the `oaSteps` slot, ER-B3; the hand-built page's try screen showed the step): each
 * feeling's chosen step, in the order the feelings were picked, so the person sees what they're about to do (or did)
 * on *When will you try it?*, *Try it now* and *Did you get to try it?*. Reads the run's answers as labels only
 * (`picked`: `feel`, and `size@<word>` per feeling); a feeling that didn't reach its step isn't listed. Reports nothing.
 */
export function OaStepsEmbed({ picked, answerIds, onShown }: EmbedProps) {
  const ids = answerIds?.feel ?? [];
  const names = picked?.feel ?? [];
  const rows = ids
    .map((id, i) => ({ id, feeling: names[i] ?? id, step: picked?.[`size@${id}`]?.[0] ?? null }))
    .filter((r): r is { id: string; feeling: string; step: string } => !!r.step);
  useEffect(() => { if (rows.length) onShown(); }, [rows.length, onShown]);
  if (!rows.length) return null;
  return (
    <ul className="m-0 p-4 list-none space-y-3 rounded-2xl bg-[var(--color-bg-elevated)] border border-[var(--color-border-subtle)]" data-testid="oa-steps">
      {rows.map((r) => (
        <li key={r.id} className="space-y-1">
          {rows.length > 1 && <p className="m-0 text-sm text-[var(--color-text-secondary)] first-letter:uppercase">{r.feeling}</p>}
          <p className="m-0 text-base text-[var(--color-text-primary)]">{r.step}</p>
        </li>
      ))}
    </ul>
  );
}
