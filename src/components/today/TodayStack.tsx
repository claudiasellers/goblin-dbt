import { useState, type ReactNode } from 'react';
import { useToday } from '../../hooks/useToday';
import { useOppositeActionFollowUpsContext } from '../../hooks/useOppositeActionFollowUps';
import { OppositeActionFollowUpCard } from '../tools/oppositeAction/OppositeActionFollowUpCard';
import { TodayCard } from './TodayCard';
import { PatternOfferCard } from '../me/PatternOfferCard';
import type { TodayItem } from '../../services/spine';

/** The number of cards shown before "N more". */
const VISIBLE = 3;

/**
 * The Today stack on the check-in screen (PR-S5, D-09): at most three cards, the rest one tap
 * away. Opposite Action plans render through OA's own card (it resolves on OA's screen). Rendered
 * only before a check-in starts, so never beside a result or the crisis banner. A flooded band
 * collapses it: "Your plans will keep", nothing hidden.
 *
 * Pattern offers (PR-P2) render as PatternOfferCard. `renderItem` lets other modules draw new kinds;
 * unknown kinds are skipped.
 */
export function TodayStack({ renderItem }: { renderItem?: (item: TodayItem, done: (id: string) => void) => ReactNode | null }) {
  const today = useToday();
  const oa = useOppositeActionFollowUpsContext();
  const [expanded, setExpanded] = useState(false);
  const [openHolding, setOpenHolding] = useState(false);

  const done = (id: string) => { today.drop(id); today.refresh(); };
  const draw = (item: TodayItem) => {
    const custom = renderItem?.(item, done);
    if (custom !== undefined && custom !== null) return <div key={item.id}>{custom}</div>;
    if (item.kind === 'follow_up' || item.kind === 'tool_outcome') return <TodayCard key={item.id} item={item} onDone={done} />;
    if (item.kind === 'pattern_offer') {
      return (
        <PatternOfferCard key={item.id} id={item.id} statement={item.copy.title} offerCopy={item.copy.body}
          toolId={item.source?.toolId} choices={item.choices} onDone={() => done(item.id)} />
      );
    }
    return null;
  };

  const showOa = oa.ready && oa.pending.length > 0;
  const cards = [...today.items, ...today.more].filter((i) => i.type !== 'oa_plan');
  if (!showOa && cards.length === 0) return null;

  if (today.holding && !openHolding) {
    return (
      <div className="mb-6 flex items-center justify-between gap-3 px-4 py-2 rounded-xl border border-[var(--color-border-subtle)]">
        <p className="text-sm text-[var(--color-text-secondary)]">Your plans will keep.</p>
        <button type="button" onClick={() => setOpenHolding(true)}
          className="min-h-11 text-sm text-[var(--color-text-secondary)] underline underline-offset-2">
          Show them
        </button>
      </div>
    );
  }

  const room = VISIBLE - (showOa ? 1 : 0);
  const visible = cards.slice(0, room);
  const rest = cards.slice(room);
  return (
    <div className="mb-6 space-y-3" aria-label="Today">
      {showOa && <OppositeActionFollowUpCard pending={oa.pending} copy={oa.copy} />}
      {visible.map(draw)}
      {rest.length > 0 && (
        <>
          <button type="button" onClick={() => setExpanded((v) => !v)} aria-expanded={expanded}
            className="min-h-11 text-sm text-[var(--color-text-secondary)] underline underline-offset-2">
            {expanded ? 'Show less' : `${rest.length} more`}
          </button>
          {expanded && rest.map(draw)}
        </>
      )}
    </div>
  );
}
