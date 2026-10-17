import { Suspense, lazy, useEffect, useRef, useState, type ComponentProps, type FocusEvent, type ReactNode } from 'react';
import { todayCards, useToday, visibleOaPending } from '../../hooks/useToday';
import { useOppositeActionFollowUpsContext } from '../../hooks/useOppositeActionFollowUps';
import { OppositeActionFollowUpCard } from '../tools/oppositeAction/OppositeActionFollowUpCard';
import { TodayCard } from './TodayCard';
import { CopeAheadAfterCard } from './CopeAheadAfterCard';
import { COPE_AHEAD_AFTER_TYPE } from '../../lib/copeAheadAfter';
import { PatternOfferCard } from '../me/PatternOfferCard';
import { PART_CHECKBACK_TYPE, TWO_PULLS_CHECKBACK_TYPE } from '../../lib/partCheckback';
import { TRAIL_OFFER_KIND } from '../../lib/trailOffer';
import type { TodayItem } from '../../services/spine';
import { afterRemoval, focusLost, focusStepStart } from '../../lib/focusStart';
import { useFocusFallback } from '../../hooks/useFocusFallback';

// Parts cards are fetched only when TodayProvider keeps one (parts on, copy signed off), so nobody else
// downloads them. Each waits in its own Suspense with nothing in its place: no card shows half-drawn.
const LazyCheckback = lazy(() => import('../parts/PartCheckbackCard').then((m) => ({ default: m.PartCheckbackCard })));
const LazyTrailOffer = lazy(() => import('../parts/TrailOfferCard').then((m) => ({ default: m.TrailOfferCard })));
function PartCheckbackCard(p: ComponentProps<typeof LazyCheckback>) { return <Suspense fallback={null}><LazyCheckback {...p} /></Suspense>; }
function TrailOfferCard(p: ComponentProps<typeof LazyTrailOffer>) { return <Suspense fallback={null}><LazyTrailOffer {...p} /></Suspense>; }

/** The number of cards shown before "N more". */
const VISIBLE = 3;

/** The stack's cards (its children but the "N more" toggle), in order. */
const cardsIn = (el: HTMLElement): HTMLElement[] => Array.from(el.children).filter((c): c is HTMLElement => c.tagName !== 'BUTTON');

/** Today's own heading (the side panel's or the sheet's) while it is on screen, else the page's main content. */
const todayHeading = (): HTMLElement | null =>
  [document.getElementById('today-panel-heading'), document.getElementById('today-sheet-heading')]
    .find((h): h is HTMLElement => !!h && h.getClientRects().length > 0)
  ?? document.querySelector<HTMLElement>('main');

/**
 * The Today stack (PR-S5, D-09): at most three cards, the rest one tap away. Opposite Action plans
 * render through OA's own card (it resolves on OA's screen). It lives off the check-in screen (Oct
 * 2026: it pushed the square down): in the desktop side panel (`TodayPanel`) and, below lg, in the
 * sheet behind the header's Today button (`TodayButton`). Both hide while a check-in is in progress
 * (`useHideToday`), so it is never beside a result or the crisis banner. A flooded band collapses
 * it: "Your plans will keep", nothing hidden.
 *
 * Pattern offers (PR-P2) render as PatternOfferCard, parts trail offers as TrailOfferCard, Cope Ahead's
 * after card as CopeAheadAfterCard. `renderItem` lets other modules draw new kinds;
 * unknown kinds are skipped. `compact` is the side panel's narrow column.
 */
export function TodayStack({ renderItem, compact = false, className = '' }: {
  renderItem?: (item: TodayItem, done: (id: string) => void) => ReactNode | null;
  compact?: boolean;
  className?: string;
}) {
  const today = useToday();
  const oa = useOppositeActionFollowUpsContext();
  const [expanded, setExpanded] = useState(false);
  const [openHolding, setOpenHolding] = useState(false);

  // An answered card leaves the stack: when it took keyboard focus with it, focus goes to the card that
  // takes its place (its heading or first line), else Today's heading, never the top of the page.
  const root = useRef<HTMLDivElement>(null);
  // And the last card gone: the panel and the sheet close with the stack (it unmounts in the same commit),
  // so Today's place is the page's.
  const fallback = useFocusFallback(todayHeading);
  /** The card that last had focus, by its place in the stack. */
  const [focusedAt, setFocusedAt] = useState(-1);
  const [leaving, setLeaving] = useState<{ id: string; at: number } | null>(null);
  const onFocus = (e: FocusEvent<HTMLDivElement>) => { fallback.onFocus(); setFocusedAt(cardsIn(e.currentTarget).findIndex((c) => c.contains(e.target))); };
  const done = (id: string) => { setLeaving({ id, at: focusedAt }); today.drop(id); today.refresh(); };
  const cards = todayCards(today);
  const gone = leaving !== null && !cards.some((c) => c.id === leaving.id);
  useEffect(() => {
    if (!gone || !leaving || !focusLost()) return; // not gone yet, or focus is still somewhere
    const left = root.current ? cardsIn(root.current) : [];
    const i = afterRemoval(leaving.at, left.length);
    focusStepStart(i === null ? todayHeading() : left[i]);
  }, [gone, leaving]);
  const draw = (item: TodayItem) => {
    const custom = renderItem?.(item, done);
    if (custom !== undefined && custom !== null) return <div key={item.id}>{custom}</div>;
    // Parts check-backs: TodayProvider keeps them only while the card can show (parts on, copy signed off).
    if (item.type === PART_CHECKBACK_TYPE || item.type === TWO_PULLS_CHECKBACK_TYPE) return <PartCheckbackCard key={item.id} item={item} content={today.partsContent} onDone={done} />;
    // Trail offers: the server sends at most one, never with a flooded band; TodayProvider keeps it only while the card can show.
    if (item.kind === TRAIL_OFFER_KIND) return <TrailOfferCard key={item.id} item={item} content={today.partsContent} onDone={done} />;
    // Cope Ahead's after card: two questions, one resolve (its words from cope-ahead.json, the plan from the visit's ids).
    if (item.type === COPE_AHEAD_AFTER_TYPE) return <CopeAheadAfterCard key={item.id} item={item} onDone={done} compact={compact} />;
    if (item.kind === 'follow_up' || item.kind === 'tool_outcome') return <TodayCard key={item.id} item={item} onDone={done} compact={compact} />;
    if (item.kind === 'pattern_offer') {
      return (
        <PatternOfferCard key={item.id} id={item.id} statement={item.copy.title} offerCopy={item.copy.body}
          toolId={item.source?.toolId} choices={item.choices} onDone={() => done(item.id)} />
      );
    }
    return null;
  };

  const oaPending = oa.ready ? visibleOaPending(oa.pending, today.oaHidden) : [];
  const showOa = oaPending.length > 0;
  if (!showOa && cards.length === 0) return null;

  if (today.holding && !openHolding) {
    return (
      <div className={`flex items-center justify-between gap-3 px-4 py-2 rounded-xl border border-[var(--color-border-subtle)] ${className}`}>
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
    <div ref={root} onFocus={onFocus} onBlur={fallback.onBlur} className={`space-y-3 ${className}`} aria-label="Today">
      {showOa && (
        <OppositeActionFollowUpCard pending={oaPending} copy={oa.copy}
          onDismiss={() => today.hideOa(oaPending.map((p) => p.session.id))} />
      )}
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
