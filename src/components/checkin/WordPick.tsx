import { useEffect, useMemo, useState } from 'react';
import { FeelingSquare } from './FeelingSquare';
import {
  QUADRANT_ABBR,
  describePlace,
  formatEmotionName,
  rankRelatedEmotions,
  wordsNear,
  type SquarePoint,
} from '../../lib/feelingSquare';
import { getEmotionById, getEmotionByName, getOppositeEmotionIds, getRelatedEmotionIds } from '../../data/emotions';
import { getRelatedEmotions, type RelatedEmotion } from '../../services/neo4j';

interface WordPickProps {
  point: SquarePoint;
  selected: string[];
  onChange: (words: string[]) => void;
  onContinue: () => void;
  /** Tap the little square to move the point. */
  onMovePoint: () => void;
  onNoneFit: () => void;
  onHelpNow: () => void;
}

const PAGE = 8;

function listWords(words: string[]): string {
  const lower = words.map((w) => w.toLowerCase());
  if (lower.length <= 2) return lower.join(' and ');
  return `${lower[0]}, ${lower[1]} and ${lower.length - 2} more`;
}

/**
 * Second screen: the words nearest where the touch landed, as big pressable chips. A picked chip
 * takes its own quadrant's colour. After the first pick, the graph's related words are offered as
 * small "+" chips. "More words" pages outward; "None of these fit" goes to Find the feeling.
 */
export function WordPick({ point, selected, onChange, onContinue, onMovePoint, onNoneFit, onHelpNow }: WordPickProps) {
  const [shown, setShown] = useState(PAGE);
  const [related, setRelated] = useState<RelatedEmotion[]>([]);

  const ranked = useMemo(() => wordsNear(point), [point]);
  const words = useMemo(() => {
    const near = ranked.slice(0, shown).map((e) => e.name);
    // Words picked from the related row stay visible even when they are not near the point.
    const extra = selected.filter((w) => !near.includes(w));
    return [...near, ...extra];
  }, [ranked, shown, selected]);

  const first = selected[0];
  useEffect(() => {
    if (!first) {
      setRelated([]);
      return;
    }
    let live = true;
    const e = getEmotionByName(first);
    const id = e?.id ?? first.toLowerCase().replace(/\s+/g, '_');
    const local = [
      ...getRelatedEmotionIds(id).map((rid) => ({ id: rid, name: getEmotionById(rid)?.name ?? rid, reason: 'related feeling' })),
      ...getOppositeEmotionIds(id).map((rid) => ({ id: rid, name: getEmotionById(rid)?.name ?? rid, reason: 'opposite emotion' })),
    ];
    getRelatedEmotions(id)
      .then((graph) => live && setRelated(rankRelatedEmotions([...graph, ...local], selected)))
      .catch(() => live && setRelated(rankRelatedEmotions(local, selected)));
    return () => {
      live = false;
    };
    // Re-rank only when the first word changes; later picks just filter the list below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [first]);

  const relatedToShow = related.filter((r) => !selected.includes(formatEmotionName(r.name)) && !words.includes(formatEmotionName(r.name)));

  function toggle(name: string) {
    onChange(selected.includes(name) ? selected.filter((w) => w !== name) : [...selected, name]);
  }

  return (
    <div className="max-w-md mx-auto flex flex-col">
      <div className="flex items-center gap-4">
        <button
          type="button"
          onClick={onMovePoint}
          className="shrink-0 w-[76px] rounded-[18px] cursor-pointer bg-transparent border-none p-0"
          aria-label="Move the point on the square"
        >
          <FeelingSquare point={point} small />
        </button>
        <p className="m-0 font-serif text-[17px] leading-[1.35] text-[var(--color-text-secondary)]">
          {describePlace(point)}
        </p>
      </div>

      <div className="mt-7 flex items-start justify-between gap-4">
        <h1 className="text-[2rem] leading-[1.08] text-[var(--color-text-primary)] m-0 [text-wrap:balance]">Which word is closest?</h1>
        <button type="button" className="help-now shrink-0 mt-1" onClick={onHelpNow}>
          Help now
        </button>
      </div>
      <p className="mt-2 text-[15px] text-[var(--color-text-secondary)]">Pick one or a few. “Sort of” counts.</p>

      <div className="mt-4 grid grid-cols-2 gap-3" role="group" aria-label="Feeling words">
        {words.map((name) => {
          const e = getEmotionByName(name);
          const abbr = e ? QUADRANT_ABBR[e.quadrant] : 'hu';
          const on = selected.includes(name);
          return (
            <button
              key={name}
              type="button"
              aria-pressed={on}
              className="den-chip"
              style={{ ['--chip-on' as string]: `var(--color-q-${abbr}-fill)` }}
              onClick={() => toggle(name)}
            >
              {name}
            </button>
          );
        })}
      </div>

      {relatedToShow.length > 0 && (
        <div className="mt-5">
          <p className="m-0 mb-2 font-serif italic text-[16px] text-[var(--color-text-secondary)]">
            Often alongside {first.toLowerCase()}
          </p>
          <div className="flex flex-wrap gap-2">
            {relatedToShow.map((r) => {
              const name = formatEmotionName(r.name);
              const e = getEmotionByName(name) || getEmotionById(r.id);
              const abbr = e ? QUADRANT_ABBR[e.quadrant] : 'hu';
              return (
                <button
                  key={r.id}
                  type="button"
                  className="den-chip den-chip--small"
                  onClick={() => onChange([...selected, e?.name ?? name])}
                >
                  <span className="qd" style={{ background: `var(--color-q-${abbr}-fill)` }} aria-hidden="true" />
                  {e?.name ?? name}
                  <span aria-hidden="true" className="text-[var(--color-text-tertiary)]">+</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

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

      <div className="action-dock">
        <button
          type="button"
          onClick={onContinue}
          className="w-full min-h-[60px] rounded-[18px] text-[17px] font-bold bg-[var(--color-accent-fill)] text-[var(--color-on-accent)] border-none cursor-pointer lift-primary"
        >
          {selected.length > 0 ? `Continue with ${listWords(selected)}` : 'Continue without a word'}
        </button>
      </div>
    </div>
  );
}
