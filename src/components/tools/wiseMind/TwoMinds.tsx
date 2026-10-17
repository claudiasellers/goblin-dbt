import { useId } from 'react';
import type { MindSide } from '../../../lib/wiseMind';

/**
 * DBT's states-of-mind diagram drawn as light (docs/design/wise-mind.md, screen 2): two overlapping soft
 * circles in the room's colours, warm on the left (emotion mind), cool on the right (reasonable mind),
 * the overlap barely lit. A circle that has been heard glows a little brighter; neither is ever marked as
 * wrong. The circles are two real buttons over the drawing (the drawing itself is hidden from readers).
 * Reduced motion: the glow changes without a transition (`motion-safe:` only).
 */
export function TwoMinds({ labels, open, heard, onSide }: {
  labels: Record<MindSide, string>;
  open: MindSide | null;
  heard: Record<MindSide, boolean>;
  onSide: (side: MindSide) => void;
}) {
  const id = useId().replace(/[^\w-]/g, '');
  const glow = (side: MindSide) => (open === side ? 0.75 : heard[side] ? 0.6 : 0.4);
  const both = heard.emotion && heard.reason;
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
        {/* The overlap: barely lit, a touch more once both have been heard. */}
        <circle cx="122" cy="95" r="72" clipPath={`url(#${id}-clip)`} style={{ fill: 'var(--color-accent)' }}
          opacity={both ? 0.28 : 0.12} className="motion-safe:transition-opacity motion-safe:duration-700" />
      </svg>
      <div className="absolute inset-0 grid grid-cols-2">
        {(['emotion', 'reason'] as const).map((side) => (
          <button key={side} type="button" aria-pressed={open === side ? 'true' : 'false'} onClick={() => onSide(side)}
            className={`flex items-center ${side === 'emotion' ? 'justify-start pl-[12%]' : 'justify-end pr-[12%]'} rounded-3xl focus-visible:ring-2 focus-visible:ring-[var(--color-accent)] focus:outline-none`}>
            <span className="max-w-[6.5rem] text-center text-sm font-medium leading-tight text-[var(--color-text-primary)]">{labels[side]}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
