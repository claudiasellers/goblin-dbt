import { useId } from 'react';
import type { MindSide, MindWords } from '../../../lib/wiseMind';

/**
 * DBT's states-of-mind diagram drawn as light (docs/design/wise-mind.md, screen 2): two overlapping soft
 * circles in the room's colours, warm on the left (emotion mind), cool on the right (reasonable mind),
 * the overlap barely lit. A circle that has been heard glows a little brighter and holds what it said
 * under its name (the chip's label, or their own words clamped to two lines, in the serif; *Nothing
 * comes* is a quiet "…"), so both sit side by side before dropping in; neither is ever marked as wrong.
 * Once both are heard the overlap is a step brighter (static: no transition at all). The circles are two
 * real buttons over the drawing (the drawing itself is hidden from readers); tapping a heard one reopens
 * its chips. Reduced motion: the glow changes without a transition (`motion-safe:` only).
 */
export function TwoMinds({ labels, open, said, onSide }: {
  labels: Record<MindSide, string>;
  open: MindSide | null;
  /** What each circle has said (null: not heard yet). */
  said: Record<MindSide, MindWords | null>;
  onSide: (side: MindSide) => void;
}) {
  const id = useId().replace(/[^\w-]/g, '');
  const glow = (side: MindSide) => (open === side ? 0.75 : said[side] ? 0.6 : 0.4);
  const both = said.emotion !== null && said.reason !== null;
  return (
    <div className="relative">
      <svg viewBox="0 0 320 190" className="block w-full h-auto rounded-3xl bg-[var(--color-bg-secondary)]" aria-hidden="true" data-testid="two-minds">
        <defs>
          <radialGradient id={`${id}-e`}>
            <stop offset="0" style={{ stopColor: 'var(--color-q-hu-fill)', stopOpacity: 0.9 }} />
            <stop offset="1" style={{ stopColor: 'var(--color-q-hu-fill)', stopOpacity: 0.15 }} />
          </radialGradient>
          <radialGradient id={`${id}-r`}>
            <stop offset="0" style={{ stopColor: 'var(--color-q-lu-fill)', stopOpacity: 0.9 }} />
            <stop offset="1" style={{ stopColor: 'var(--color-q-lu-fill)', stopOpacity: 0.15 }} />
          </radialGradient>
          <clipPath id={`${id}-clip`}><circle cx="198" cy="95" r="72" /></clipPath>
        </defs>
        <circle cx="122" cy="95" r="72" fill={`url(#${id}-e)`} opacity={glow('emotion')} className="motion-safe:transition-opacity motion-safe:duration-500" />
        <circle cx="198" cy="95" r="72" fill={`url(#${id}-r)`} opacity={glow('reason')} className="motion-safe:transition-opacity motion-safe:duration-500" />
        {/* The overlap: barely lit, one static step brighter once both have been heard. */}
        <circle cx="122" cy="95" r="72" clipPath={`url(#${id}-clip)`} style={{ fill: 'var(--color-accent)' }}
          opacity={both ? 0.2 : 0.12} data-both={both ? 'true' : 'false'} />
      </svg>
      <div className="absolute inset-0 grid grid-cols-2">
        {(['emotion', 'reason'] as const).map((side) => {
          const w = said[side];
          return (
            <button key={side} type="button" aria-pressed={open === side ? 'true' : 'false'} onClick={() => onSide(side)}
              className={`flex min-w-0 items-center justify-center ${side === 'emotion' ? 'pl-[10%]' : 'pr-[10%]'} rounded-3xl focus-visible:ring-2 focus-visible:ring-[var(--color-accent)] focus:outline-none`}>
              <span className="flex w-[8rem] max-w-full flex-col items-center gap-1 text-center">
                <span className="text-sm font-medium leading-tight text-[var(--color-text-primary)]">{labels[side]}</span>
                {w?.kind === 'words' && (
                  <span data-testid={`said-${side}`}
                    className={`w-full font-serif text-sm leading-snug text-[var(--color-text-primary)] break-words ${w.own ? 'line-clamp-2' : ''}`}>
                    {w.text}
                  </span>
                )}
                {w?.kind === 'nothing' && <span aria-hidden="true" data-testid={`said-${side}`} className="text-sm leading-none text-[var(--color-text-secondary)]">…</span>}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
