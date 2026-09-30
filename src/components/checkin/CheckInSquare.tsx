import { FeelingSquare } from './FeelingSquare';
import { RelatedRow, WordChip } from './WordChips';
import {
  MAX_SPOTS,
  allWords,
  describePlace,
  listWords,
  wordsNear,
  type SquarePoint,
  type Spot,
} from '../../lib/feelingSquare';

interface CheckInSquareProps {
  spots: Spot[];
  /** Which spot the square is placing right now. */
  active: number;
  onMove: (p: SquarePoint) => void;
  /** Pick or unpick a word for the active spot. */
  onToggleWord: (name: string) => void;
  /** The full word list for the active spot. */
  onSeeMore: () => void;
  /** Done: carry on with every picked word. */
  onContinue: () => void;
  /** Keep this spot and place another. */
  onAddSpot: () => void;
  /** Leave a spot that was just added (shown from the second spot on). */
  onCancelSpot: () => void;
  onHelpNow: () => void;
  onCantTell: () => void;
  onStartWithBody: () => void;
}

/** How many nearest words to offer under the square. */
const PEEK = 3;

/**
 * First screen of a check-in: one question, one square.
 *
 * Touching places the dot; touch or drag again to move it. Once it is down, the nearest few words
 * appear under the square and can be picked right there, and each pick brings up the words the
 * graph relates to it. From here: "View more words" (the full list), "Add another spot" (a second
 * or third place on the square, for mixed feelings) or continue.
 * "I can't tell" (lavender) and "Start with my body" (teal) are the two other ways in.
 */
export function CheckInSquare({
  spots,
  active,
  onMove,
  onToggleWord,
  onSeeMore,
  onContinue,
  onAddSpot,
  onCancelSpot,
  onHelpNow,
  onCantTell,
  onStartWithBody,
}: CheckInSquareProps) {
  const spot = spots[active];
  const point = spot.point;
  const everyWord = allWords(spots);
  const elsewhere = spots.flatMap((s, i) => (i === active ? [] : s.words));
  const others = spots
    .filter((s, i) => i !== active && s.point)
    .map((s) => ({ point: s.point as SquarePoint, label: s.words[0]?.toLowerCase() }));

  // The nearest few stay put as you pick (a picked chip just changes colour); words added from the
  // related row join after them.
  const nearest = point
    ? wordsNear(point)
        .map((e) => e.name)
        .filter((n) => !elsewhere.includes(n))
        .slice(0, PEEK)
    : [];
  const peek = [...nearest, ...spot.words.filter((w) => !nearest.includes(w))];
  const lastPick = spot.words[spot.words.length - 1];
  const canAddSpot = spot.words.length > 0 && spots.length < MAX_SPOTS;
  const isExtra = active > 0;

  return (
    <div className="max-w-md mx-auto flex flex-col">
      {isExtra && (
        <button
          type="button"
          onClick={onCancelSpot}
          className="self-start flex items-center gap-1 min-h-11 -ml-1.5 mb-1 text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] bg-transparent border-none cursor-pointer"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M15 5l-7 7 7 7" /></svg>
          <span className="text-[15px] font-semibold">{spot.words.length ? 'Back' : 'Never mind'}</span>
        </button>
      )}
      <div className="flex items-start justify-between gap-4">
        <h1 className="text-[2.25rem] sm:text-[2.5rem] leading-[1.04] text-[var(--color-text-primary)] m-0 [text-wrap:balance]">
          {isExtra ? 'And the other part?' : 'How is it in there?'}
        </h1>
        <button type="button" className="help-now shrink-0 mt-2" onClick={onHelpNow}>
          Help now
        </button>
      </div>

      <div className="mt-6 w-full max-w-[300px] min-[400px]:max-w-[340px] md:max-w-[392px] self-center">
        <FeelingSquare point={point} onMove={onMove} onCommit={onSeeMore} others={others} />
      </div>

      <p
        className={`mt-5 text-center ${point ? 'font-serif text-[17px] leading-[1.35] text-[var(--color-text-primary)]' : 'text-[15px] text-[var(--color-text-secondary)]'}`}
        aria-live="polite"
      >
        {point
          ? describePlace(point)
          : isExtra
            ? 'Touch where the other part sits. Mixed is normal.'
            : 'Touch where it sits. Close is enough.'}
      </p>

      {point && (
        <div className="mt-4">
          <p className="m-0 mb-2 text-[13px] font-bold text-[var(--color-text-secondary)] text-center">
            {spot.words.length ? 'Your words here' : 'Near here'}
          </p>
          <div className="flex flex-wrap justify-center gap-2" role="group" aria-label="Words near the dot">
            {peek.map((w) => (
              <WordChip key={w} name={w} on={spot.words.includes(w)} small onClick={() => onToggleWord(w)} />
            ))}
          </div>

          <RelatedRow to={lastPick} exclude={[...everyWord, ...peek]} onAdd={onToggleWord} />

          <div className="mt-3 flex flex-wrap items-center justify-center gap-x-6 gap-y-1">
            <button
              type="button"
              className="min-h-11 px-2 text-[15px] font-semibold text-[var(--color-accent)] bg-transparent border-none cursor-pointer"
              onClick={onSeeMore}
            >
              View more words
            </button>
            {canAddSpot && (
              <button
                type="button"
                className="min-h-11 px-2 text-[15px] font-semibold text-[var(--color-accent)] bg-transparent border-none cursor-pointer"
                onClick={onAddSpot}
              >
                + Add another spot
              </button>
            )}
          </div>
        </div>
      )}

      {point && (
        <div className="action-dock">
          <button
            type="button"
            onClick={spot.words.length ? onContinue : onSeeMore}
            className="w-full min-h-[60px] rounded-[18px] text-[17px] font-bold bg-[var(--color-accent-fill)] text-[var(--color-on-accent)] border-none cursor-pointer lift-primary"
          >
            {spot.words.length ? `Continue with ${listWords(everyWord)}` : 'That’s about right'}
          </button>
        </div>
      )}

      {!isExtra && (
        <div className="mt-5 grid grid-cols-2 gap-2.5">
          <button type="button" className="den-chip den-chip--er" onClick={onCantTell}>
            <span className="gd" aria-hidden="true" />I can’t tell
          </button>
          <button type="button" className="den-chip den-chip--dt" onClick={onStartWithBody}>
            <span className="gd" aria-hidden="true" />Start with my body
          </button>
        </div>
      )}
    </div>
  );
}
