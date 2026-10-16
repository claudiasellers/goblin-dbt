import { LazyMotion, domAnimation, m, useReducedMotion } from 'motion/react';
import { FIGURE_BOX, figureFill, figurePath } from '../../lib/partFigure';

/**
 * A part's figure: the shape the person gave it (Shape it's five numbers, the stored `shapeSig`, each
 * 0–1), drawn as a still outline in the room's colours. `null` draws a plain round figure. Decorative
 * (aria-hidden): what the part is called is always said in words beside it. With motion allowed it
 * breathes very slowly; reduced motion holds it still. Meet a part and Me draw parts with it.
 */
export function PartFigure({ shapeSig, size = 96, hue, className }: {
  shapeSig: readonly number[] | null;
  size?: number;
  /** A CSS colour (a room token) to draw it in; otherwise its heat leans it warm or cool. */
  hue?: string;
  className?: string;
}) {
  const reduce = useReducedMotion();
  const d = figurePath(shapeSig);
  const fill = figureFill(shapeSig, hue);
  return (
    <svg width={size} height={size} viewBox={`0 0 ${FIGURE_BOX} ${FIGURE_BOX}`} className={className} aria-hidden="true" data-part-figure="">
      <ellipse cx={FIGURE_BOX / 2} cy={86} rx={26} ry={3.5} style={{ fill: 'var(--color-text-primary)' }} opacity={0.08} />
      <LazyMotion features={domAnimation}>
        <m.path d={d} style={{ fill, stroke: 'color-mix(in oklab, var(--color-text-primary) 18%, transparent)', strokeWidth: 0.8, transformOrigin: '50% 86%' }}
          animate={reduce ? undefined : { scale: [1, 1.025, 1] }}
          transition={reduce ? undefined : { duration: 5, repeat: Infinity, ease: 'easeInOut' }} />
      </LazyMotion>
    </svg>
  );
}
