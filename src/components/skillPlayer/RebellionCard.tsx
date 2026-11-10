import { useEffect, useRef } from 'react';
import { PaperCard, paperLine } from '../shared/PaperCard';
import { Chip } from '../tools/wiseMind/bits';
import type { EmbedProps } from './embeds';

/**
 * Rebel without the wreckage's card (DT-11, PRD step 5; docs/design/alternate-rebellion.md): the rebellion on the
 * square paper (src/components/shared/PaperCard.tsx, the keepsake Two pulls and Cope Ahead use), *against* what's
 * squeezing and *for* what blowing it up would have given, then *When?*: now, later today or this week. A whole-screen
 * embed: it reports the one id (`now` · `today` · `week`), which the skill answers as `when`. The step's title is the
 * question (*When will you do it?*); the three answers are the player's chips, so the flow keeps one option style.
 *
 * Every word on it arrives from the skill (its declared copy props, resolved to graph copy by the player) or the run (`picked`: the display labels of
 * the run's answers, own words last). Without `picked` the card reads the skill's fallback line, so it never shows
 * an empty paper. Presentation only: nothing is kept here (the rebellion menu is a later keep, plan C2).
 */
export const REBELLION_WHEN = ['now', 'today', 'week'] as const;

export function RebellionCard({ props, picked = {}, onShown, onDone }: EmbedProps) {
  const text = (k: string) => (typeof props[k] === 'string' ? (props[k] as string) : undefined);
  const copy = { against: text('against'), for: text('for'), fallback: text('fallback'), whenLabel: text('whenLabel') };
  const field = (k: string) => (typeof props[k] === 'string' ? picked[props[k] as string] ?? [] : []);
  const squeeze = field('squeezeField');
  const fn = field('functionField')[0];
  const rebellion = field('pickField')[0] ?? copy.fallback ?? '';

  const shown = useRef(false);
  useEffect(() => { if (!shown.current) { shown.current = true; onShown(); } }, [onShown]);

  const label = [rebellion, squeeze.length ? `${copy.against}: ${squeeze.join(', ')}` : null, fn ? `${copy.for}: ${fn}` : null]
    .filter(Boolean).join('. ');
  // The player already brings the step in; the tilt is still, so it isn't motion and stays for everyone.
  return (
    <section className="space-y-6" data-testid="rebellion-card">
      <div className="-rotate-1">
        <PaperCard label={label} data={{ 'data-rebellion-card': '' }}>
          <p className={paperLine} data-rebellion="">{rebellion}</p>
          {squeeze.length > 0 && (
            <div className="font-serif text-lg leading-snug text-[var(--color-text-secondary)] text-balance" data-against="">
              <p className="font-sans text-sm">{copy.against}</p>
              {squeeze.map((s, i) => <p key={i}>{s}</p>)}
            </div>
          )}
          {fn && (
            <div className="font-serif text-lg leading-snug text-[var(--color-text-secondary)] text-balance" data-for="">
              <p className="font-sans text-sm">{copy.for}</p>
              <p>{fn}</p>
            </div>
          )}
        </PaperCard>
      </div>
      <div className="flex flex-wrap gap-2.5" role="group" aria-label={copy.whenLabel}>
        {REBELLION_WHEN.map((id) => (
          <span key={id} data-when={id} className="contents">
            <Chip label={text(id) ?? id} onClick={() => onDone?.({ ids: [id] })} />
          </span>
        ))}
      </div>
    </section>
  );
}
