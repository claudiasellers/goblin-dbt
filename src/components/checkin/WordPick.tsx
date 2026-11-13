import { useMemo, useState } from 'react';
import { FeelingSquare } from './FeelingSquare';
import { RelatedRow, WordChip } from './WordChips';
import { getEmotionByName } from '../../data/emotions';
import { MAX_SPOTS, QUADRANT_ABBR, allWords, describePlace, listWords, ownWordsFirst, wordsNear, type SquarePoint, type Spot } from '../../lib/feelingSquare';

interface WordPickProps {
  spots: Spot[];
  active: number;
  /** Pick or unpick a word for the active spot. */
  onToggleWord: (name: string) => void;
  /** Take a word off another spot (removing the spot if it was its last word). */
  onRemoveWord: (spot: number, name: string) => void;
  onContinue: () => void;
  /** Continue is working: the button says so and can't be tapped again. */
  continuing?: boolean;
  /** Tap the little square to move the active point. */
  onMovePoint: () => void;
  /** Keep this spot and place another on the square. */
  onAddSpot: () => void;
  onNoneFit: () => void;
  onHelpNow: () => void;
  /** The person's own words (Emotion ids, most used first): near ones lead the list (ER-10 part 3). */
  ownWords?: readonly string[];
}

const PAGE = 8;
const NO_WORDS: readonly string[] = [];

/**
 * The full word list for the active spot: nearest first, as big pressable chips in their quadrant
 * colours. Words already picked for other spots sit above as small removable pills. After a pick,
 * the graph's related words appear as "+" chips. "More words" pages outward, "Add another spot"
 * goes back to the square for a second or third place, "None of these fit" opens Find the feeling.
 */
export function WordPick({ spots, active, onToggleWord, onRemoveWord, onContinue, continuing = false, onMovePoint, onAddSpot, onNoneFit, onHelpNow, ownWords = NO_WORDS }: WordPickProps) {
  const [shown, setShown] = useState(PAGE);
  const spot = spots[active];
  const point = spot.point as SquarePoint;
  const everyWord = allWords(spots);
  const elsewhereKey = spots.flatMap((s, i) => (i === active ? [] : s.words)).join('|');

  const ranked = useMemo(() => {
    const elsewhere = elsewhereKey.split('|');
    return ownWordsFirst(wordsNear(point), ownWords).map((e) => e.name).filter((n) => !elsewhere.includes(n));
  }, [point, elsewhereKey, ownWords]);
  const words = useMemo(() => {
    const near = ranked.slice(0, shown);
    // Words picked from the related row stay visible even when they are not near the point.
    return [...near, ...spot.words.filter((w) => !near.includes(w))];
  }, [ranked, shown, spot.words]);

  const others = spots
    .map((s, i) => ({ s, i }))
    .filter(({ s, i }) => i !== active && s.point)
    .map(({ s }) => ({ point: s.point as SquarePoint }));
  const otherSpots = spots.map((s, i) => ({ s, i })).filter(({ s, i }) => i !== active && s.words.length > 0);
  const canAddSpot = spot.words.length > 0 && spots.length < MAX_SPOTS;
  const lastPick = spot.words[spot.words.length - 1];

  return (
    <div className="max-w-md mx-auto flex flex-col">
      <div className="flex items-center gap-4">
        <button
          type="button"
          onClick={onMovePoint}
          className="shrink-0 w-[76px] rounded-[18px] cursor-pointer bg-transparent border-none p-0"
          aria-label="Move the point on the square"
        >
          <FeelingSquare point={point} others={others} small />
        </button>
        <p className="m-0 font-serif text-[17px] leading-[1.35] text-[var(--color-text-secondary)]">{describePlace(point)}</p>
      </div>

      {otherSpots.length > 0 && (
        <div className="mt-5 flex flex-col gap-2" aria-label="Words from your other spots">
          {otherSpots.map(({ s, i }, n) => (
            <div key={i} className="flex flex-wrap items-center gap-2 px-3.5 py-2.5 rounded-2xl bg-[var(--color-bg-elevated)]">
              <span className="text-[13px] font-bold text-[var(--color-text-secondary)] mr-1">Spot {n + 1}</span>
              {s.words.map((w) => (
                <button
                  key={w}
                  type="button"
                  className="den-chip den-chip--small"
                  aria-label={`Remove ${w}`}
                  style={{ ['--chip-on' as string]: `var(--color-q-${QUADRANT_ABBR[getEmotionByName(w)?.quadrant ?? 'high-unpleasant']}-fill)` }}
                  onClick={() => onRemoveWord(i, w)}
                >
                  {w}
                  <span aria-hidden="true">×</span>
                </button>
              ))}
            </div>
          ))}
        </div>
      )}

      <div className="mt-7 flex items-start justify-between gap-4">
        <h1 className="text-[2rem] leading-[1.08] text-[var(--color-text-primary)] m-0 [text-wrap:balance]">
          {otherSpots.length ? 'And this part?' : 'Which word is closest?'}
        </h1>
        <button type="button" className="help-now shrink-0 mt-1" onClick={onHelpNow}>
          Help now
        </button>
      </div>
      <p className="mt-2 text-[15px] text-[var(--color-text-secondary)]">Pick one or a few. “Sort of” counts.</p>

      <div className="mt-4 grid grid-cols-2 gap-3" role="group" aria-label="Feeling words">
        {words.map((name) => (
          <WordChip key={name} name={name} on={spot.words.includes(name)} onClick={() => onToggleWord(name)} />
        ))}
      </div>

      <RelatedRow to={lastPick} exclude={[...everyWord, ...words]} onAdd={onToggleWord} />

      <div className="mt-4 flex flex-wrap items-center justify-center gap-x-6 gap-y-1">
        {shown < ranked.length && (
          <button
            type="button"
            className="min-h-11 px-2 text-[15px] font-semibold text-[var(--color-accent)] bg-transparent border-none cursor-pointer"
            onClick={() => setShown((n) => n + PAGE)}
          >
            More words
          </button>
        )}
        <button
          type="button"
          className="min-h-11 px-2 text-[15px] text-[var(--color-text-secondary)] underline underline-offset-4 bg-transparent border-none cursor-pointer"
          onClick={onNoneFit}
        >
          None of these fit
        </button>
      </div>

      {canAddSpot && (
        <button type="button" className="add-spot mt-4" onClick={onAddSpot}>
          <span className="add-spot__plus" aria-hidden="true">+</span>
          <span className="flex flex-col gap-0.5 text-left">
            <span className="text-[15.5px] font-bold text-[var(--color-text-primary)]">Something else in there too?</span>
            <span className="text-[13.5px] text-[var(--color-text-secondary)]">Add another spot on the square</span>
          </span>
        </button>
      )}

      <div className="action-dock">
        <button
          type="button"
          onClick={onContinue}
          disabled={continuing}
          aria-busy={continuing}
          className="w-full min-h-[60px] rounded-[18px] text-[17px] font-bold bg-[var(--color-accent-fill)] text-[var(--color-on-accent)] border-none cursor-pointer disabled:cursor-wait disabled:opacity-80 lift-primary"
        >
          {continuing ? 'One moment…' : everyWord.length > 0 ? `Continue with ${listWords(everyWord)}` : 'Continue without a word'}
        </button>
      </div>
    </div>
  );
}
