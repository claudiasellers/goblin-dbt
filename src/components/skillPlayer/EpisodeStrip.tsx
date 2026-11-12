import { useEffect, useId } from 'react';
import { PaperCard } from '../shared/PaperCard';
import { primaryButton } from '../tools/oppositeAction/styles';
import type { EmbedProps } from './embeds';

/**
 * The episode strip (ER-10 part 2, Walk the wave; docs/design/emotion-guide.md; plan C3b `episodeStrip`): one feeling's
 * wave on the keepsake paper, the model of emotions' slots in order (before → what happened → what my mind said → my
 * body → the urge → what I did → after), each with the person's picks in the order they made them (own words last),
 * a slot they skipped named as skipped, and the guess under them (*Maybe: frustrated*). Read once, no input; reports
 * `read`. CORE-08's chain analysis embeds it later.
 *
 * Props (EMBED_PROPS): `fields` (the slots, in order), `names` (copy, split on " · "), `blank` (copy), optional
 * `nameField` (a field) and `nameLabel` (copy), `next` (copy).
 */
export function EpisodeStrip({ props, picked, onShown, onDone }: EmbedProps) {
  const text = (k: string) => (typeof props[k] === 'string' ? (props[k] as string) : '');
  const fields = Array.isArray(props.fields) ? (props.fields as unknown[]).filter((f): f is string => typeof f === 'string') : [];
  const names = text('names').split(' · ');
  const items = (f: string) => (picked?.[f] ?? []).filter((l) => l.trim().length > 0);
  const rows = fields.map((f, i) => ({ f, name: names[i] ?? '', lines: items(f) }));
  const guess = typeof props.nameField === 'string' ? items(props.nameField as string) : [];
  const any = rows.some((r) => r.lines.length > 0) || guess.length > 0;
  const uid = useId();
  useEffect(() => { if (any) onShown(); }, [any, onShown]);
  const next = <button type="button" className={primaryButton} onClick={() => onDone?.({ ids: any ? ['read'] : [] })}>{text('next')}</button>;
  // Nothing walked at all: never strand the person on a whole-screen embed.
  if (!any) return <div className="flex justify-center">{next}</div>;

  return (
    <div className="space-y-5" data-testid="episode-strip">
      <PaperCard label={rows.map((r) => r.name).join(', ')} compact>
        <ol className="space-y-3">
          {rows.map((r) => (
            <li key={r.f} className="grid grid-cols-[minmax(0,7rem)_minmax(0,1fr)] gap-3">
              <span id={`${uid}-${r.f}`} className="text-sm text-[var(--color-text-secondary)]">{r.name}</span>
              {r.lines.length ? (
                <span aria-labelledby={`${uid}-${r.f}`} className="font-serif text-base leading-snug text-[var(--color-text-primary)] [overflow-wrap:anywhere]">
                  {r.lines.join(', ')}
                </span>
              ) : (
                <span className="text-sm italic text-[var(--color-text-secondary)]">{text('blank')}</span>
              )}
            </li>
          ))}
        </ol>
        {guess.length > 0 && text('nameLabel') ? (
          <p className="mt-3 border-t border-[var(--color-border)] pt-3 font-serif text-base leading-snug text-[var(--color-text-primary)]">
            <span className="font-sans text-sm text-[var(--color-text-secondary)]">{text('nameLabel')}: </span>{guess.join(', ')}
          </p>
        ) : null}
      </PaperCard>
      <div className="flex justify-center">{next}</div>
    </div>
  );
}
