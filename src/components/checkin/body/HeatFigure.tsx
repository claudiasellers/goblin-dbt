import { useEffect, useId, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react';
import { glowLook } from '../../../lib/bodyMark';
import { FIGURE_VIEWBOX, FIGURE_BOX, REGIONS, REGION_IDS, SILHOUETTE, glowFor, regionAt, type HitShape, type RegionId, type Side } from '../../../data/bodyFigure';

interface Finger { x: number; y: number; region: RegionId | null }

export interface FigureMark {
  region: RegionId;
  side: Side;
  /** CSS colour of the glow. */
  colour: string;
  /** 0–1 from the strength bar (bigger and brighter); null / absent = a middle glow. */
  strength?: number | null;
}

/** A typical place from the body mirror: hatched and dashed, never a mark. Two colours stripe it
 *  (a place two feelings share, the Together tab). */
export interface FigureGhost {
  region: RegionId;
  /** CSS colours: one per map that draws this place. */
  colours: string[];
}

/** What is under the finger during a drag (null when off the body). */
export interface FigureHover {
  region: RegionId | null;
}

interface HeatFigureProps {
  marks: FigureMark[];
  /** The body mirror's typical places (step 4), drawn over the glows; omit for none. */
  ghosts?: FigureGhost[];
  /** The place being edited (aria-pressed on its button; nothing is drawn round it). */
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

/** A ghost's line colour: the square colour pulled a little toward the text colour, so pale (pastel,
 *  light-room) quarters still read as lines on the figure. */
const ink = (c: string) => `color-mix(in oklab, ${c} 72%, var(--color-text-primary))`;

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
 * in its words' square colour and as big and bright as its strength. The body mirror's typical places
 * (`ghosts`) sit on top, hatched and dashed, so they never read as yours. Facing you: the person's left is on the figure's right.
 *
 * Drag (step 3): press anywhere on the figure and move; a glow follows the finger, the place under
 * it is reported through `onHover` (the step names it above the figure), and lifting chooses it (a plain tap still works).
 * Lifting off the body chooses nothing. Keyboard: each place is a button (Enter / Space).
 */
export function HeatFigure({ marks, ghosts = [], selected = null, onPick, onHover, fingerColour, className = '' }: HeatFigureProps) {
  const uid = useId().replace(/:/g, '');
  const clip = `fig-${uid}`;
  const blur = `blur-${uid}`;
  const svgRef = useRef<SVGSVGElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const [finger, setFinger] = useState<Finger | null>(null);
  // The live drag, read by the handlers: state alone can be one event behind (a quick tap's lift
  // arriving before the press has re-rendered).
  const drag = useRef<Finger | null>(null);
  const interactive = Boolean(onPick);

  // iOS Safari can still start a page scroll from a finger on the figure; while a drag is on, stop it.
  useEffect(() => {
    const el = wrapRef.current;
    if (!el || !interactive) return;
    const stop = (e: TouchEvent) => { if (drag.current) e.preventDefault(); };
    el.addEventListener('touchmove', stop, { passive: false });
    return () => el.removeEventListener('touchmove', stop);
  }, [interactive]);

  const silhouette = (
    <>
      <ellipse cx={SILHOUETTE.head.cx} cy={SILHOUETTE.head.cy} rx={SILHOUETTE.head.rx} ry={SILHOUETTE.head.ry} />
      <rect x={SILHOUETTE.neck.x} y={SILHOUETTE.neck.y} width={SILHOUETTE.neck.w} height={SILHOUETTE.neck.h} rx={SILHOUETTE.neck.r} />
      <path d={SILHOUETTE.torso} />
      {SILHOUETTE.limbs.map((d) => <path key={d} d={d} />)}
      {SILHOUETTE.joints.map((j) => <circle key={`${j.cx}-${j.cy}`} cx={j.cx} cy={j.cy} r={j.r} />)}
    </>
  );

  /** The pointer in figure units, from the svg's box (its aspect ratio is the viewBox's, so the
   *  mapping is exact; getScreenCTM has been unreliable in scrolled containers on Safari). */
  function toFigure(e: ReactPointerEvent<HTMLDivElement>): Finger | null {
    const r = svgRef.current?.getBoundingClientRect();
    if (!r || !r.width || !r.height) return null;
    const x = FIGURE_BOX.x + ((e.clientX - r.left) / r.width) * FIGURE_BOX.w;
    const y = FIGURE_BOX.y + ((e.clientY - r.top) / r.height) * FIGURE_BOX.h;
    return { x, y, region: regionAt(x, y) };
  }

  function set(f: Finger | null) {
    drag.current = f;
    setFinger(f);
  }

  function handleDown(e: ReactPointerEvent<HTMLDivElement>) {
    if (!interactive || (e.pointerType === 'mouse' && e.button !== 0)) return;
    e.preventDefault();
    try { e.currentTarget.setPointerCapture(e.pointerId); } catch { /* not capturable: moves still bubble here */ }
    const f = toFigure(e);
    if (!f) return;
    set(f);
    onHover?.({ region: f.region });
  }

  function handleMove(e: ReactPointerEvent<HTMLDivElement>) {
    const prev = drag.current;
    if (prev) {
      const f = toFigure(e);
      if (!f) return;
      set(f);
      if (f.region !== prev.region) onHover?.({ region: f.region });
    }
  }

  function handleUp(e: ReactPointerEvent<HTMLDivElement>) {
    const prev = drag.current;
    if (!prev) return;
    const f = toFigure(e) ?? prev;
    set(null);
    onHover?.(null);
    if (f.region) onPick?.(f.region);
  }

  function cancel() {
    if (!drag.current) return;
    set(null);
    onHover?.(null);
  }


  return (
    <div ref={wrapRef} className={`heat-figure-wrap${interactive ? ' is-interactive' : ''}`}
      {...(interactive ? {
        onPointerDown: handleDown,
        onPointerMove: handleMove,
        onPointerUp: handleUp,
        onPointerCancel: cancel,
      } : {})}>
    <svg ref={svgRef} viewBox={FIGURE_VIEWBOX}
      className={`heat-figure${interactive ? ' is-interactive' : ''}${finger ? ' is-dragging' : ''} ${className}`}
      role={interactive ? 'group' : 'img'}
      aria-label={interactive ? 'Your body. Touch and drag to a place, then lift.' : 'Your body'}>
      <defs>
        <clipPath id={clip}>{silhouette}</clipPath>
        <filter id={blur} x="-100%" y="-100%" width="300%" height="300%">
          <feGaussianBlur stdDeviation="9" />
        </filter>
        {ghosts.map((g, i) => (
          <pattern key={`p-${g.region}`} id={`${uid}-h${i}`} width={g.colours.length > 1 ? 8 : 6} height={g.colours.length > 1 ? 8 : 6}
            patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
            {g.colours.length > 1
              ? g.colours.slice(0, 2).map((c, k) => <rect key={k} x={k * 4} width={4} height={8} style={{ fill: ink(c) }} opacity={0.55} />)
              : <line x1={0} y1={0} x2={0} y2={6} style={{ stroke: ink(g.colours[0]) }} strokeWidth={1.6} opacity={0.8} />}
          </pattern>
        ))}
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
        {ghosts.flatMap((g, i) => glowFor(g.region).map((e, k) => (
          <ellipse key={`ghost-${g.region}-${k}`} className="heat-figure__ghost" cx={e.cx} cy={e.cy}
            rx={Math.max(9, e.rx * 0.8)} ry={Math.max(9, e.ry * 0.8)} fill={`url(#${uid}-h${i})`}
            style={{ stroke: g.colours.length > 1 ? 'var(--color-text-primary)' : ink(g.colours[0]) }}
            strokeWidth={1.2} strokeDasharray="3 3" opacity={FAINT.has(g.region) ? 0.5 : 0.9} />
        )))}
      </g>
      {interactive && REGION_IDS.flatMap((id) => REGIONS[id].hits.map((s, i) => (
        <Shape key={`${id}-${i}`} s={s}
          className="heat-figure__hit"
          role="button" tabIndex={i === 0 ? 0 : -1} aria-label={REGIONS[id].label}
          aria-pressed={selected === id}
          // Pointer input reaches the svg (hits have pointer-events: none); this is for assistive tech.
          onClick={() => onPick?.(id)}
          onKeyDown={(e: React.KeyboardEvent) => {
            if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onPick?.(id); }
          }} />
      )))}
    </svg>
    </div>
  );
}
