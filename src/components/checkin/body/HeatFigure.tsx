import { useId, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react';
import { glowLook } from '../../../lib/bodyMark';
import { FIGURE_VIEWBOX, REGIONS, REGION_IDS, SILHOUETTE, glowFor, regionAt, type HitShape, type RegionId, type Side } from '../../../data/bodyFigure';

export interface FigureMark {
  region: RegionId;
  side: Side;
  /** CSS colour of the glow. */
  colour: string;
  /** 0–1 from the strength bar (bigger and brighter); null / absent = a middle glow. */
  strength?: number | null;
}

/** What is under the finger during a drag (null when off the body). */
export interface FigureHover {
  region: RegionId | null;
}

interface HeatFigureProps {
  marks: FigureMark[];
  /** The place being edited (outlined). */
  selected?: RegionId | null;
  /** Choosing a place: lifting a finger (or the mouse) on it, or Enter / Space on a focused place.
   *  Omit for a picture only. */
  onPick?: (region: RegionId) => void;
  /** The place under the finger while it moves, for a live read-back; null when it lifts. */
  onHover?: (hover: FigureHover | null) => void;
  /** Colour of the glow that follows the finger. */
  fingerColour?: string;
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
 * The heat figure (canvas row Y): a soft silhouette; each mark glows inside it, clipped to the body,
 * warm or cool from its words and as big and bright as its strength. Facing you: the person's left is on the figure's right.
 *
 * Drag (step 3): press anywhere on the figure and move; a glow follows the finger, the place under
 * it is outlined and reported through `onHover`, and lifting chooses it (a plain tap still works).
 * Lifting off the body chooses nothing. Keyboard: each place is a button (Enter / Space).
 */
export function HeatFigure({ marks, selected = null, onPick, onHover, fingerColour, className = '' }: HeatFigureProps) {
  const uid = useId().replace(/:/g, '');
  const clip = `fig-${uid}`;
  const blur = `blur-${uid}`;
  const svgRef = useRef<SVGSVGElement>(null);
  const [finger, setFinger] = useState<{ x: number; y: number; region: RegionId | null } | null>(null);
  const [hover, setHover] = useState<RegionId | null>(null);
  const interactive = Boolean(onPick);

  const silhouette = (
    <>
      <ellipse cx={SILHOUETTE.head.cx} cy={SILHOUETTE.head.cy} rx={SILHOUETTE.head.rx} ry={SILHOUETTE.head.ry} />
      <rect x={SILHOUETTE.neck.x} y={SILHOUETTE.neck.y} width={SILHOUETTE.neck.w} height={SILHOUETTE.neck.h} rx={SILHOUETTE.neck.r} />
      <path d={SILHOUETTE.torso} />
      {SILHOUETTE.limbs.map((d) => <path key={d} d={d} />)}
      {SILHOUETTE.joints.map((j) => <circle key={`${j.cx}-${j.cy}`} cx={j.cx} cy={j.cy} r={j.r} />)}
    </>
  );

  function toFigure(e: ReactPointerEvent<SVGSVGElement>) {
    const svg = svgRef.current;
    const m = svg?.getScreenCTM();
    if (!svg || !m) return null;
    const pt = new DOMPoint(e.clientX, e.clientY).matrixTransform(m.inverse());
    return { x: pt.x, y: pt.y, region: regionAt(pt.x, pt.y) };
  }

  function track(e: ReactPointerEvent<SVGSVGElement>) {
    const f = toFigure(e);
    setFinger(f);
    if (f && f.region !== finger?.region) onHover?.({ region: f.region });
  }

  function handleDown(e: ReactPointerEvent<SVGSVGElement>) {
    if (!interactive || e.button !== 0) return;
    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);
    const f = toFigure(e);
    setFinger(f);
    onHover?.({ region: f?.region ?? null });
  }

  function handleMove(e: ReactPointerEvent<SVGSVGElement>) {
    if (finger) { track(e); return; }
    // Mouse hover (no button): outline what a click would choose.
    if (interactive && e.pointerType === 'mouse') {
      const f = toFigure(e);
      if ((f?.region ?? null) !== hover) setHover(f?.region ?? null);
    }
  }

  function handleUp(e: ReactPointerEvent<SVGSVGElement>) {
    if (!finger) return;
    const f = toFigure(e) ?? finger;
    setFinger(null);
    onHover?.(null);
    if (f.region) onPick?.(f.region);
  }

  function cancel() {
    if (!finger) return;
    setFinger(null);
    onHover?.(null);
  }

  const outlined = finger ? finger.region : hover;

  return (
    <svg ref={svgRef} viewBox={FIGURE_VIEWBOX}
      className={`heat-figure${interactive ? ' is-interactive' : ''}${finger ? ' is-dragging' : ''} ${className}`}
      role={interactive ? 'group' : 'img'}
      aria-label={interactive ? 'Your body. Touch and drag to a place, then lift.' : 'Your body'}
      {...(interactive ? {
        onPointerDown: handleDown,
        onPointerMove: handleMove,
        onPointerUp: handleUp,
        onPointerCancel: cancel,
        onPointerLeave: () => { if (!finger) setHover(null); },
      } : {})}>
      <defs>
        <clipPath id={clip}>{silhouette}</clipPath>
        <filter id={blur} x="-100%" y="-100%" width="300%" height="300%">
          <feGaussianBlur stdDeviation="9" />
        </filter>
      </defs>
      <g className="heat-figure__body">{silhouette}</g>
      <g clipPath={`url(#${clip})`}>
        <g filter={`url(#${blur})`}>
          {marks.flatMap((m) => {
            const look = glowLook(m.strength);
            const opacity = FAINT.has(m.region) ? look.opacity / 2 : look.opacity;
            return glowFor(m.region, m.side).map((g, i) => (
              <ellipse key={`${m.region}-${i}`} cx={g.cx} cy={g.cy} rx={g.rx * look.scale} ry={g.ry * look.scale}
                style={{ fill: m.colour }} opacity={opacity} />
            ));
          })}
          {finger && (
            <circle className="heat-figure__finger" cx={finger.x} cy={finger.y} r={20}
              style={{ fill: fingerColour }} opacity={finger.region ? 0.95 : 0.5} />
          )}
        </g>
      </g>
      {interactive && REGION_IDS.flatMap((id) => REGIONS[id].hits.map((s, i) => (
        <Shape key={`${id}-${i}`} s={s}
          className={`heat-figure__hit${selected === id ? ' is-selected' : ''}${outlined === id ? ' is-hover' : ''}`}
          role="button" tabIndex={i === 0 ? 0 : -1} aria-label={REGIONS[id].label}
          aria-pressed={selected === id}
          // Pointer input reaches the svg (hits have pointer-events: none); this is for assistive tech.
          onClick={() => onPick?.(id)}
          onKeyDown={(e: React.KeyboardEvent) => {
            if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onPick?.(id); }
          }} />
      )))}
    </svg>
  );
}
