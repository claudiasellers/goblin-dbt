import { useId } from 'react';
import { FIGURE_VIEWBOX, REGIONS, REGION_IDS, SILHOUETTE, glowFor, type HitShape, type RegionId, type Side } from '../../../data/bodyFigure';

export interface FigureMark {
  region: RegionId;
  side: Side;
  /** CSS colour of the glow. */
  colour: string;
}

interface HeatFigureProps {
  marks: FigureMark[];
  /** The place being edited (outlined). */
  selected?: RegionId | null;
  /** Tapping a place on the figure. Omit for a picture only. */
  onPick?: (region: RegionId) => void;
  className?: string;
}

/** Places behind the front view (and the whole body) glow fainter so front marks stay readable. */
const FAINT = new Set<RegionId>(['body', 'upper_back', 'lower_back', 'neck']);

function Shape({ s, ...rest }: { s: HitShape } & React.SVGProps<SVGElement>) {
  const p = rest as Record<string, unknown>;
  if (s.kind === 'ellipse') return <ellipse cx={s.cx} cy={s.cy} rx={s.rx} ry={s.ry} {...p} />;
  if (s.kind === 'rect') return <rect x={s.x} y={s.y} width={s.w} height={s.h} rx={s.r ?? 0} {...p} />;
  return <path d={s.d} {...p} />;
}

/**
 * The heat figure (canvas row Y): a soft silhouette; each mark glows inside it, clipped to the body.
 * Warm and cool come from the mark's colour (the pad, from step 3). Facing you: the person's left
 * is on the figure's right.
 */
export function HeatFigure({ marks, selected = null, onPick, className = '' }: HeatFigureProps) {
  const uid = useId().replace(/:/g, '');
  const clip = `fig-${uid}`;
  const blur = `blur-${uid}`;
  const silhouette = (
    <>
      <ellipse cx={SILHOUETTE.head.cx} cy={SILHOUETTE.head.cy} rx={SILHOUETTE.head.rx} ry={SILHOUETTE.head.ry} />
      <rect x={SILHOUETTE.neck.x} y={SILHOUETTE.neck.y} width={SILHOUETTE.neck.w} height={SILHOUETTE.neck.h} rx={SILHOUETTE.neck.r} />
      <path d={SILHOUETTE.torso} />
      {SILHOUETTE.limbs.map((d) => <path key={d} d={d} />)}
      {SILHOUETTE.joints.map((j) => <circle key={`${j.cx}-${j.cy}`} cx={j.cx} cy={j.cy} r={j.r} />)}
    </>
  );

  return (
    <svg viewBox={FIGURE_VIEWBOX} className={`heat-figure ${className}`} role={onPick ? 'group' : 'img'}
      aria-label={onPick ? 'Your body. Tap a place.' : 'Your body'}>
      <defs>
        <clipPath id={clip}>{silhouette}</clipPath>
        <filter id={blur} x="-100%" y="-100%" width="300%" height="300%">
          <feGaussianBlur stdDeviation="9" />
        </filter>
      </defs>
      <g className="heat-figure__body">{silhouette}</g>
      <g clipPath={`url(#${clip})`}>
        <g filter={`url(#${blur})`}>
          {marks.flatMap((m) => glowFor(m.region, m.side).map((g, i) => (
            <ellipse key={`${m.region}-${i}`} cx={g.cx} cy={g.cy} rx={g.rx} ry={g.ry} fill={m.colour}
              opacity={FAINT.has(m.region) ? 0.45 : 0.9} />
          )))}
        </g>
      </g>
      {onPick && REGION_IDS.flatMap((id) => REGIONS[id].hits.map((s, i) => (
        <Shape key={`${id}-${i}`} s={s}
          className={`heat-figure__hit${selected === id ? ' is-selected' : ''}`}
          role="button" tabIndex={i === 0 ? 0 : -1} aria-label={REGIONS[id].label}
          aria-pressed={selected === id}
          onClick={() => onPick(id)}
          onKeyDown={(e: React.KeyboardEvent) => {
            if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onPick(id); }
          }} />
      )))}
    </svg>
  );
}
