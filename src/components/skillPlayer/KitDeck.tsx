import { useEffect, useRef, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import type { SkillDef } from '../../data/skillTypes';
import { deckOutput, kitCards, playDeck, type KeptKit, type KeptRebellion, type KitCard, type KitCopy } from '../../lib/crisisKit';
import type { KeptCard } from '../../lib/prosConsCard';
import { getSkillsContent, peekSkillsContent } from '../../services/skills';
import { PaperCard, paperLine } from '../shared/PaperCard';
import { choiceButton, primaryButton } from '../tools/oppositeAction/styles';
import type { EmbedProps } from './embeds';

/**
 * My crisis kit, one card at a time (DT-03, the `kitDeck` embed; docs/design/crisis-kit.md). The person's kept kit
 * (the tool's `crisisKit` slice) or the starter cards, ordered so each *Another card* changes the kind of card; a
 * carried flooded reading (`ctx.band`) gets body cards only, one and one swap (src/lib/crisisKit.ts, pure).
 *
 * Labels come from the make-it skill (`fromSkill`), a kept pros & cons card's from its own skill (`prosSkill`) and a
 * kept rebellion card's from Rebel's (`rebelSkill`), never a copy. Opened from a crisis route (`ctx.frame` `crisis`),
 * the rebellion cards stay out: that kit is for getting through the next minutes, not a squeeze. Reports the kinds of card shown, how many and how long it was open: measurements, never a rating.
 * Every word arrives from the skill (copy props) or what the person kept. Presentation only.
 */
const text = (props: Record<string, unknown>, k: string) => (typeof props[k] === 'string' ? (props[k] as string) : '');
const skillIn = (id: string) => peekSkillsContent()?.skills.find((s) => s.id === id) ?? null;
/** Signed in, the kit can take a moment to arrive; after this the starter cards show rather than nothing. */
const PROFILE_WAIT_MS = 2500;

function useSkill(id: string): SkillDef | null {
  const [skill, setSkill] = useState<SkillDef | null>(() => (id ? skillIn(id) : null));
  useEffect(() => {
    if (!id || skill) return;
    let live = true;
    getSkillsContent().then((c) => { if (live) setSkill(c.skills.find((s) => s.id === id) ?? null); }).catch(() => {});
    return () => { live = false; };
  }, [id, skill]);
  return skill;
}

export function KitDeck({ props, ctx, profile, onShown, onDone }: EmbedProps) {
  const { user } = useAuth();
  const build = useSkill(text(props, 'fromSkill'));
  const prosSkill = useSkill(text(props, 'prosSkill'));
  const rebelSkill = useSkill(text(props, 'rebelSkill'));
  const [waited, setWaited] = useState(false);
  useEffect(() => {
    if (!user || profile) return;
    const t = setTimeout(() => setWaited(true), PROFILE_WAIT_MS);
    return () => clearTimeout(t);
  }, [user, profile]);
  const ready = !!build && (!user || !!profile || waited);
  const flooded = ctx?.band === 'flooded';

  // The deck is made once, when it's first ready, and never changes under the person: a profile that arrives after
  // the starter cards showed is left for next time (WCAG 3.2.2).
  const [deck, setDeck] = useState<{ order: KitCard[]; starter: boolean } | null>(null);
  if (!deck && build && ready) {
    const copy: KitCopy = {
      secReasons: text(props, 'secReasons'), secProsCons: text(props, 'secProsCons'), placeHow: text(props, 'placeHow'),
      wordsHow: text(props, 'wordsHow'), reasonsLabel: text(props, 'reasonsLabel'), rebellionFor: text(props, 'rebellionFor'),
      copy: build.copy,
    };
    const kit = (profile?.crisisKit ?? null) as KeptKit | null;
    const pros = Array.isArray(profile?.prosCons) ? (profile!.prosCons as KeptCard[]) : [];
    const rebels = ctx?.frame !== 'crisis' && Array.isArray(profile?.rebellionCards) ? (profile!.rebellionCards as KeptRebellion[]) : [];
    // Set during render, once (React's "adjusting state while rendering"): no effect, no flash of an empty deck.
    setDeck(playDeck(kitCards(kit, build, copy, { cards: pros, skill: prosSkill }, { cards: rebels, skill: rebelSkill }),
      kitCards(null, build, copy).cards, flooded));
  }

  const [at, setAt] = useState(0);
  const [openedAt] = useState(() => Date.now());
  const shown = useRef(false);
  useEffect(() => { if (deck && !shown.current) { shown.current = true; onShown(); } }, [deck, onShown]);

  if (!deck) {
    return (
      <div className="py-8 flex justify-center" aria-busy="true" data-kit-loading="">
        <span className="inline-block w-6 h-6 border-4 border-[var(--color-border)] border-t-[var(--color-accent)] rounded-full motion-safe:animate-spin" aria-hidden="true" />
      </div>
    );
  }
  const card: KitCard | undefined = deck.order[Math.min(at, deck.order.length - 1)];
  const more = at < deck.order.length - 1;
  const finish = () => onDone?.({
    ids: deckOutput(deck.order.slice(0, at + 1), deck.starter),
    doneCount: Math.min(deck.order.length, at + 1),
    durationSec: Math.min(3600, Math.round((Date.now() - openedAt) / 1000)),
  });
  const section = card ? text(props, `sec${card.section === 'pros_cons' ? 'ProsCons' : card.section[0].toUpperCase() + card.section.slice(1)}`) : '';
  // A list card's title is its section: read once. The instruction line introduces the list, so it comes first.
  const listCard = !!card?.lines;
  const label = card ? [section, listCard ? '' : card.title, listCard ? card.how ?? '' : '', ...(card.lines ?? []),
    listCard ? '' : card.how ?? '', card.caution ?? ''].filter(Boolean).join('. ') : '';

  return (
    <section className="space-y-6" data-testid="kit-deck" data-starter={deck.starter ? '' : undefined}>
      {deck.starter && <p className="text-center text-sm text-[var(--color-text-secondary)] text-balance" data-kit-starter="">{text(props, 'starter')}</p>}
      {card && (
        <div className="-rotate-1" key={card.id}>
          <PaperCard label={label} focusOnMount={at > 0} data={{ 'data-kit-card': card.id }}>
            <p className="font-sans text-sm text-[var(--color-text-secondary)]" data-kit-section={card.section}>{section}</p>
            {!listCard && <h3 className={paperLine}>{card.title}</h3>}
            {listCard && card.how && <p className="font-sans text-base text-[var(--color-text-secondary)] text-balance" data-kit-how="">{card.how}</p>}
            {card.lines && (
              <ul role="list" className="space-y-1 list-none p-0 m-0">
                {card.lines.map((l, i) => <li key={i} className={paperLine} data-kit-line={i}>{l}</li>)}
              </ul>
            )}
            {!listCard && card.how && <p className="font-sans text-base text-[var(--color-text-secondary)] text-balance" data-kit-how="">{card.how}</p>}
            {card.caution && <p className="font-sans text-sm text-[var(--color-text-secondary)] text-balance" data-kit-caution="">{card.caution}</p>}
          </PaperCard>
        </div>
      )}
      <div className="space-y-2">
        {more && (
          <button type="button" className={primaryButton} data-kit-another=""
            onClick={() => setAt((i) => i + 1)}>
            {text(props, 'another')}
          </button>
        )}
        <button type="button" className={more ? choiceButton : primaryButton} data-kit-enough="" onClick={finish}>
          {text(props, 'enough')}
        </button>
      </div>
    </section>
  );
}
