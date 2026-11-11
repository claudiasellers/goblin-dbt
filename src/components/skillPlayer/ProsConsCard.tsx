import { useEffect, useRef, useState } from 'react';
import type { SkillDef } from '../../data/skillTypes';
import { answerOf, cardFor, cardLabel, cardLines, keptLines, type ProsConsLines } from '../../lib/prosConsCard';
import { getSkillsContent, peekSkillsContent } from '../../services/skills';
import { PaperCard, paperLine } from '../shared/PaperCard';
import { primaryButton } from '../tools/oppositeAction/styles';
import type { EmbedProps } from './embeds';

/**
 * The pros & cons card (DT-10, PRD step 6; docs/design/pros-cons.md): two reasons not to, in the person's own words
 * first, and one acknowledged pro, on the paper (src/components/shared/PaperCard.tsx), readable in 20 seconds.
 * The lines are src/lib/prosConsCard.ts (pure).
 *
 * Two embeds share it:
 * - `prosConsCard`, the whole screen in Pros & cons: the card from this run's answers (`picked`: labels, own words
 *   last), on the square paper, read through once, then *Next* (`read`, with the seconds it was open: a
 *   measurement, never a rating).
 * - `prosConsReplay`, a slot in Hold to wait: the card the person kept (`pros_cons`, the tool's `prosCons` slice)
 *   for the pull picked in this run, if there is one; nothing at all otherwise, so its record only says it showed
 *   when it did. Compact paper, so the moves stay near the top. Its labels come from the card's own skill
 *   (`fromSkill`, already loaded by the player, so it never arrives late), never a copy. A card for `noProFor`
 *   (hurt myself) shows its reasons only (C6.7); one for `noteFor` (leave) says `note` above them.
 *
 * Every word arrives from the skill (copy props), the run, or what the person kept. Presentation only.
 */
function Paper({ lines, showPro, reasonsLabel, proLabel, label, compact, marker }: {
  lines: ProsConsLines; showPro: boolean; reasonsLabel: string; proLabel: string; label: string; compact: boolean; marker: `data-${string}`;
}) {
  const line = compact ? 'font-serif text-base leading-snug text-[var(--color-text-primary)] text-balance' : paperLine;
  return (
    <div className="-rotate-1">
      <PaperCard label={label} compact={compact} data={{ [marker]: '' }}>
        <div className={compact ? 'space-y-1' : 'space-y-2'}>
          <p className="font-sans text-sm text-[var(--color-text-secondary)]">{reasonsLabel}</p>
          {lines.reasons.map((r, i) => <p key={i} className={line} data-reason={i}>{r}</p>)}
        </div>
        {showPro && (
          <div className="space-y-1">
            <p className="font-sans text-sm text-[var(--color-text-secondary)]">{proLabel}</p>
            <p className={`font-serif ${compact ? 'text-base' : 'text-lg'} leading-snug text-[var(--color-text-secondary)] text-balance`} data-pro="">{lines.pro}</p>
          </div>
        )}
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
  const reasonsLabel = text(props, 'reasonsLabel');
  const proLabel = text(props, 'proLabel');
  return (
    <section className="space-y-6" data-testid="pros-cons-card">
      <Paper lines={lines} showPro reasonsLabel={reasonsLabel} proLabel={proLabel} compact={false} marker="data-pros-cons-paper"
        label={cardLabel({ reasonsLabel, reasons: lines.reasons, proLabel, pro: lines.pro })} />
      <button type="button" className={primaryButton} data-next=""
        onClick={() => onDone?.({ ids: ['read'], durationSec: Math.min(3600, Math.round((Date.now() - openedAt) / 1000)) })}>
        {text(props, 'next')}
      </button>
    </section>
  );
}

const skillIn = (id: string) => peekSkillsContent()?.skills.find((s) => s.id === id) ?? null;

export function ProsConsReplay({ props, answerIds = {}, profile, onShown }: EmbedProps) {
  const pullId = (answerIds[text(props, 'pullField')] ?? [])[0];
  const card = cardFor(profile?.prosCons, pullId);
  const fromSkill = text(props, 'fromSkill');
  const [skill, setSkill] = useState<SkillDef | null>(() => skillIn(fromSkill));
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
  const showPro = !text(props, 'noProFor') || pullId !== text(props, 'noProFor');
  const note = text(props, 'noteFor') && pullId === text(props, 'noteFor') ? text(props, 'note') : '';
  const title = text(props, 'title');
  const reasonsLabel = text(props, 'reasonsLabel');
  const proLabel = text(props, 'proLabel');
  return (
    <section className="space-y-2 py-1" data-testid="pros-cons-replay">
      <p className="text-center text-sm text-[var(--color-text-secondary)] text-balance">{title}</p>
      {note && <p className="text-center text-sm text-[var(--color-text-secondary)] text-balance" data-replay-note="">{note}</p>}
      <Paper lines={lines} showPro={showPro} reasonsLabel={reasonsLabel} proLabel={proLabel} compact marker="data-pros-cons-replay-paper"
        label={cardLabel({ title, reasonsLabel, reasons: lines.reasons, proLabel: showPro ? proLabel : undefined, pro: showPro ? lines.pro : null })} />
    </section>
  );
}
