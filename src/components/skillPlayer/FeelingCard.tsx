import { useEffect, type ReactNode } from 'react';
import { primaryButton } from '../tools/oppositeAction/styles';
import type { FeelingRow } from '../../data/skillTypes';
import type { EmbedProps } from './embeds';

/**
 * The feeling card (ER-10, docs/design/emotion-guide.md; plan C3b `feelingCard`, ER-owned): a feeling the person has
 * just named, as a known thing. Its family, what it's for, what often sets it off, where it often shows up in the body
 * and the pull it can bring, each part only when the graph has it. Recognition, never criteria: nothing here asks
 * the person to match a list, and the pull is framed as something that comes with the feeling, not something to do.
 *
 * Props (EMBED_PROPS): `guide`, a `row` prop (the guide's feelingOf row, resolved by the player from a ref);
 * the words as resolved copy: `familyLine` (with `{family}`), `forLabel`, `promptsLabel`, `bodyLabel`, `urgesLabel`,
 * `urgeNote` and `next`. With no row (content drift) the card shows only the way on, so no one is stranded.
 *
 * Output: `read`.
 */
const isRow = (v: unknown): v is FeelingRow =>
  !!v && typeof v === 'object' && typeof (v as FeelingRow).label === 'string' && Array.isArray((v as FeelingRow).prompts);

export function FeelingCard({ props, onShown, onDone }: EmbedProps) {
  const text = (k: string) => (typeof props[k] === 'string' ? (props[k] as string) : '');
  const row = isRow(props.guide) ? props.guide : null;
  useEffect(() => { if (row) onShown(); }, [row, onShown]);
  const next = <button type="button" className={primaryButton} onClick={() => onDone?.({ ids: ['read'] })}>{text('next')}</button>;
  if (!row) return <div className="flex justify-center">{next}</div>;

  const family = text('familyLine').replace('{family}', row.label.toLowerCase());
  const part = (label: string, body: ReactNode) => (
    <section className="space-y-1.5">
      <h3 className="text-sm font-semibold uppercase tracking-wide text-[var(--color-text-secondary)]">{label}</h3>
      {body}
    </section>
  );
  const list = (items: string[]) => (
    <ul role="list" className="space-y-1 text-base leading-snug text-[var(--color-text-primary)]">
      {items.map((x) => <li key={x} className="flex gap-2"><span aria-hidden="true">·</span><span>{x}</span></li>)}
    </ul>
  );
  // One chip per place (a place can carry two words: *Chest · heavy, closing up*), in the row's order.
  const places: Array<{ region: string; labels: string[] }> = [];
  for (const b of row.body) {
    const at = places.find((p) => p.region === b.region);
    if (at) at.labels.push(b.label.toLowerCase()); else places.push({ region: b.region, labels: [b.label.toLowerCase()] });
  }
  return (
    <div className="space-y-5" data-testid="feeling-card">
      <div className="space-y-4 rounded-2xl border-2 border-[var(--color-fam-er-lip)] bg-[var(--color-bg-card)] p-4">
        {family && <p className="text-base text-[var(--color-text-secondary)]">{family}</p>}
        {row.functionLine && part(text('forLabel'), <p className="text-base leading-snug text-[var(--color-text-primary)]">{row.functionLine}</p>)}
        {row.prompts.length > 0 && part(text('promptsLabel'), list(row.prompts))}
        {row.body.length > 0 && part(text('bodyLabel'), (
          <ul role="list" className="flex flex-wrap gap-2">
            {places.map((p) => (
              <li key={p.region} className="rounded-full bg-[var(--color-fam-er)] px-3 py-1 text-sm text-[var(--color-text-primary)]">
                <span className="font-semibold">{p.region}</span><span aria-hidden="true"> · </span>
                <span className="sr-only">: </span>{p.labels.join(', ')}
              </li>
            ))}
          </ul>
        ))}
        {row.urges.length > 0 && part(text('urgesLabel'), (
          <div className="space-y-2">
            {list(row.urges)}
            {text('urgeNote') && <p className="text-sm text-[var(--color-text-secondary)]">{text('urgeNote')}</p>}
          </div>
        ))}
      </div>
      {next}
    </div>
  );
}
