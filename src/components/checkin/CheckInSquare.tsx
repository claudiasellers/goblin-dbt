import { FeelingSquare } from './FeelingSquare';
import { describePlace, type SquarePoint } from '../../lib/feelingSquare';

interface CheckInSquareProps {
  point: SquarePoint | null;
  onMove: (p: SquarePoint) => void;
  /** "That's about right": move on to picking a word. */
  onPlace: (p: SquarePoint) => void;
  onHelpNow: () => void;
  onCantTell: () => void;
  onStartWithBody: () => void;
}

/**
 * First screen of a check-in: one question, one square, two ways out.
 *
 * Touching places the dot and it stays there; touch or drag again to move it, as many times as
 * needed. The caption reads the place back as it moves, and "That's about right" commits.
 * The button's space is reserved from the start so nothing below it jumps when it appears.
 * "I can't tell" is lavender (shift it) and "Start with my body" is teal (get through it),
 * the same family colours the tools use.
 */
export function CheckInSquare({ point, onMove, onPlace, onHelpNow, onCantTell, onStartWithBody }: CheckInSquareProps) {
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
        <FeelingSquare point={point} onMove={onMove} onCommit={onPlace} />
      </div>

      <p
        className={`mt-5 min-h-[48px] text-center ${point ? 'font-serif text-[17px] leading-[1.35] text-[var(--color-text-primary)]' : 'text-[15px] text-[var(--color-text-secondary)]'}`}
        aria-live="polite"
      >
        {point ? describePlace(point) : 'Touch where it sits. Close is enough.'}
      </p>

      <button
        type="button"
        onClick={() => point && onPlace(point)}
        className={`mt-2 w-full min-h-[60px] rounded-[18px] text-[17px] font-bold bg-[var(--color-accent-fill)] text-[var(--color-on-accent)] border-none cursor-pointer lift-primary transition-opacity duration-200 ${point ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
        aria-hidden={!point}
        tabIndex={point ? 0 : -1}
      >
        That’s about right
      </button>

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
