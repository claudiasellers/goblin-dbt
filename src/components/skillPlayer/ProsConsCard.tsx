import { useEffect, useRef, useState } from 'react';
import type { SkillDef } from '../../data/skillTypes';
import { answerOf, cardFor, cardLines, keptLines, type ProsConsLines } from '../../lib/prosConsCard';
import { getSkillsContent } from '../../services/skills';
import { PaperCard, paperLine } from '../shared/PaperCard';
import { primaryButton } from '../tools/oppositeAction/styles';
import type { EmbedProps } from './embeds';

/**
 * The pros & cons card (DT-10, PRD step 6; docs/design/pros-cons.md): two reasons not to, in the person's own words
 * first, and one acknowledged pro, on the square paper (src/components/shared/PaperCard.tsx), readable in 20 seconds.
 * The lines are src/lib/prosConsCard.ts (pure).
 *
 * Two embeds share it:
 * - `prosConsCard`, the whole screen in Pros & cons: the card from this run's answers (`picked`: labels, own words
 *   last), read through once, then *Next* (`read`, with the seconds it was open: a measurement, never a rating).
 * - `prosConsReplay`, a slot in Hold to wait: the card the person kept (`pros_cons`, the tool's `prosCons` slice)
 *   for the pull picked in this run, if there is one; nothing at all otherwise, so its record only says it showed
 *   when it did. Its labels come from the card's own skill (`fromSkill`), never a copy.
 *
 * Every word arrives from the skill (copy props), the run, or what the person kept. Presentation only.
 */
function Paper({ lines, reasonsLabel, proLabel, marker }: { lines: ProsConsLines; reasonsLabel: string; proLabel: string; marker: `data-${string}` }) {
  const label = `${reasonsLabel}: ${lines.reasons.join('. ')}. ${proLabel}: ${lines.pro}`;
  return (
    <div className="-rotate-1">
      <PaperCard label={label} data={{ [marker]: '' }}>
        <div className="space-y-2">
          <p className="font-sans text-sm text-[var(--color-text-secondary)]">{reasonsLabel}</p>
          {lines.reasons.map((r, i) => <p key={i} className={paperLine} data-reason={i}>{r}</p>)}
        </div>
        <div className="space-y-1">
          <p className="font-sans text-sm text-[var(--color-text-secondary)]">{proLabel}</p>
          <p className="font-serif text-lg leading-snug text-[var(--color-text-secondary)] text-balance" data-pro="">{lines.pro}</p>
        </div>
      </PaperCard>
    </div>
  );
}

const text = (props: Record<string, unknown>, k: string) => (typeof props[k] === 'string' ? (props[k] as string) : '');

export function ProsConsCard({ props, picked = {}, answerIds = {}, onShown, onDone }: EmbedProps) {
  const field = (k: string) => answerOf(picked, answerIds, text(props, k));
  const lines = cardLines([field('reasonsField'), field('moreField')], field('proField'), text(props, 'fallback'));
  const shown = useRef(false);
  useEffect(() => { if (!shown.current) { shown.current = true; onShown(); } }, [onShown]);
  const [openedAt] = useState(() => Date.now());
  return (
    <section className="space-y-6" data-testid="pros-cons-card">
      <Paper lines={lines} reasonsLabel={text(props, 'reasonsLabel')} proLabel={text(props, 'proLabel')} marker="data-pros-cons-paper" />
      <button type="button" className={primaryButton} data-next=""
        onClick={() => onDone?.({ ids: ['read'], durationSec: Math.min(3600, Math.round((Date.now() - openedAt) / 1000)) })}>
        {text(props, 'next')}
      </button>
    </section>
  );
}

export function ProsConsReplay({ props, answerIds = {}, profile, onShown }: EmbedProps) {
  const pullId = (answerIds[text(props, 'pullField')] ?? [])[0];
  const card = cardFor(profile?.prosCons, pullId);
  const fromSkill = text(props, 'fromSkill');
  const [skill, setSkill] = useState<SkillDef | null>(null);
  useEffect(() => {
    if (!card || skill) return;
    let live = true;
    getSkillsContent().then((c) => { if (live) setSkill(c.skills.find((s) => s.id === fromSkill) ?? null); }).catch(() => {});
    return () => { live = false; };
  }, [card, skill, fromSkill]);
  const lines = card && skill ? keptLines(card, skill, text(props, 'fallback')) : null;
  const ready = !!lines && lines.reasons.length > 0;
  const shown = useRef(false);
  useEffect(() => { if (ready && !shown.current) { shown.current = true; onShown(); } }, [ready, onShown]);
  if (!lines || !ready) return null;
  return (
    <section className="space-y-3 py-2" data-testid="pros-cons-replay">
      <p className="text-center text-[var(--color-text-secondary)] text-balance">{text(props, 'title')}</p>
      <Paper lines={lines} reasonsLabel={text(props, 'reasonsLabel')} proLabel={text(props, 'proLabel')} marker="data-pros-cons-replay-paper" />
    </section>
  );
}
