import { useEffect, useId } from 'react';
import { PaperCard } from '../shared/PaperCard';
import { primaryButton } from '../tools/oppositeAction/styles';
import type { EmbedProps } from './embeds';

/**
 * The two columns (IE-10 Notice them, docs/design/notice-them.md; the Wound PRD's primitive, plan C3b `twoColumns`):
 * what they did and what I added, side by side on the keepsake paper, the person's own picks in the order they made
 * them (own words last). An optional pick under them with its label (*Maybe: They were tired*). Read once, no input;
 * reports `read`.
 *
 * Props (EMBED_PROPS): `left`, `right` (fields), `leftLabel`, `rightLabel` (copy), optional `foot` (a field) and
 * `footLabel` (copy), `next` (copy).
 */
export function TwoColumns({ props, picked, onShown, onDone }: EmbedProps) {
  const text = (k: string) => (typeof props[k] === 'string' ? (props[k] as string) : '');
  const items = (k: string) => {
    const f = props[k];
    return typeof f === 'string' ? (picked?.[f] ?? []).filter((l) => l.trim().length > 0) : [];
  };
  const left = items('left');
  const right = items('right');
  const foot = items('foot');
  const any = left.length + right.length > 0;
  const uid = useId();
  useEffect(() => { if (any) onShown(); }, [any, onShown]);
  const next = <button type="button" className={primaryButton} onClick={() => onDone?.({ ids: any ? ['read'] : [] })}>{text('next')}</button>;
  // Nothing to show (content drift): never strand the person on a whole-screen embed.
  if (!any) return <div className="flex justify-center">{next}</div>;

  // A short name for the group; each list is named by its heading, so nothing is read twice (Gate 2).
  const label = `${text('leftLabel')} and ${text('rightLabel')}`;
  const column = (side: string, heading: string, lines: readonly string[]) => (
    <div className="min-w-0 space-y-2">
      <p id={`${uid}-${side}`} className="text-sm text-[var(--color-text-secondary)]">{heading}</p>
      <ul aria-labelledby={`${uid}-${side}`} className="divide-y divide-[var(--color-border)]">
        {lines.map((l, i) => (
          <li key={i} className="py-2 font-serif text-base leading-snug text-[var(--color-text-primary)] [overflow-wrap:anywhere] first:pt-0 last:pb-0">{l}</li>
        ))}
      </ul>
    </div>
  );

  return (
    <div className="space-y-5" data-testid="two-columns">
      <PaperCard label={label} compact>
        <div className="grid grid-cols-2 gap-4">
          {column('left', text('leftLabel'), left)}
          {column('right', text('rightLabel'), right)}
        </div>
        {foot.length > 0 && text('footLabel') ? (
          <p className="border-t border-[var(--color-border)] pt-3 font-serif text-base leading-snug text-[var(--color-text-primary)]">
            <span className="font-sans text-sm text-[var(--color-text-secondary)]">{text('footLabel')}: </span>{foot.join(', ')}
          </p>
        ) : null}
      </PaperCard>
      <div className="flex justify-center">{next}</div>
    </div>
  );
}
