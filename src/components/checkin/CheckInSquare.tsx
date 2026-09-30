import { useEffect, useRef, useState } from 'react';
import { FeelingSquare } from './FeelingSquare';
import type { SquarePoint } from '../../lib/feelingSquare';

interface CheckInSquareProps {
  point: SquarePoint | null;
  onMove: (p: SquarePoint) => void;
  /** The touch landed: move on to picking a word. */
  onPlace: (p: SquarePoint) => void;
  onHelpNow: () => void;
  onCantTell: () => void;
  onStartWithBody: () => void;
}

/** How long the dot sits in place (and the room takes its colour) before the words screen. */
const SETTLE_MS = 380;

/**
 * First screen of a check-in: one question, one square, two ways out.
 * "I can't tell" is lavender (shift it) and "Start with my body" is teal (get through it),
 * the same family colours the tools use.
 */
export function CheckInSquare({ point, onMove, onPlace, onHelpNow, onCantTell, onStartWithBody }: CheckInSquareProps) {
  const [settling, setSettling] = useState(false);
  const timer = useRef<number | undefined>(undefined);

  useEffect(() => () => window.clearTimeout(timer.current), []);

  function commit(p: SquarePoint) {
    window.clearTimeout(timer.current);
    setSettling(true);
    timer.current = window.setTimeout(() => onPlace(p), SETTLE_MS);
  }

  return (
    <div className="max-w-md mx-auto flex flex-col">
      <div className="flex items-start justify-between gap-4">
        <h1 className="text-[2.5rem] leading-[1.04] text-[var(--color-text-primary)] m-0 [text-wrap:balance]">
          How is it in there?
        </h1>
        <button type="button" className="help-now shrink-0 mt-2" onClick={onHelpNow}>
          Help now
        </button>
      </div>

      <div className="mt-7 w-full max-w-[340px] md:max-w-[392px] self-center">
        <FeelingSquare
          point={point}
          onMove={(p) => {
            if (settling) return;
            onMove(p);
          }}
          onCommit={(p) => {
            if (!settling) commit(p);
          }}
        />
      </div>

      <p className="mt-5 text-center text-[15px] text-[var(--color-text-secondary)]" aria-live="polite">
        {settling ? 'Got it.' : 'Touch where it sits. Close is enough.'}
      </p>

      <div className="mt-5 grid grid-cols-2 gap-2.5">
        <button type="button" className="den-chip den-chip--er" onClick={onCantTell}>
          <span className="gd" aria-hidden="true" />I can’t tell
        </button>
        <button type="button" className="den-chip den-chip--dt" onClick={onStartWithBody}>
          <span className="gd" aria-hidden="true" />Start with my body
        </button>
      </div>
    </div>
  );
}
