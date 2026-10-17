import { useId, useRef, type KeyboardEvent, type PointerEvent } from 'react';
import { useReducedMotion } from 'motion/react';
import { PartFigure } from '../PartFigure';

/**
 * Two pulls' 2D stage (docs/design/parts.md, "Two pulls"; Stage can take over later): two figures face
 * each other at the same size, and a soft light (the person) sits wherever they put it. Presentation only:
 * the page owns the light's position and the zoom. Decorative but for the light, which is a 2D slider when
 * `onMove` is given (drag it; arrow keys move it a step, Home centres it). Each Step back breath zooms the
 * stage out a step (`zoom` 0–5); reduced motion steps without animating.
 */

export interface StageSide { name: string; shapeSig: readonly number[] | null }

const W = 320;
const H = 200;
const STEP = 0.05;
const clamp = (n: number) => Math.min(1, Math.max(0, n));

/** Where the light is, in words, for a screen reader (never a judgement: nearer one, or between). */
function lightText(at: readonly [number, number], a: string, b: string): string {
  const [x, y] = at;
  const side = x < 0.4 ? `nearer ${a}` : x > 0.6 ? `nearer ${b}` : 'between them';
  const height = y < 0.35 ? ', up high' : y > 0.65 ? ', down low' : '';
  return `Your light: ${side}${height}`;
}

export function PullsStage({ a, b, light, zoom = 0, onMove, label }: {
  a: StageSide; b: StageSide; light: readonly [number, number]; zoom?: number;
  onMove?: (at: [number, number]) => void; label?: string;
}) {
  const reduce = useReducedMotion();
  const id = `pulls-light-${useId().replace(/[^\w-]/g, '')}`;
  const svg = useRef<SVGSVGElement>(null);
  const dragging = useRef(false);
  const scale = 1 - Math.min(5, Math.max(0, zoom)) * 0.09;
  const lx = light[0] * W;
  const ly = 30 + light[1] * (H - 60);

  const fromPointer = (e: PointerEvent<SVGSVGElement>) => {
    const r = svg.current?.getBoundingClientRect();
    if (!r || !onMove || r.width === 0 || r.height === 0) return;
    // The zoomed group is scaled about the centre: undo it so the light lands under the finger.
    const px = ((e.clientX - r.left) / r.width) * W;
    const py = ((e.clientY - r.top) / r.height) * H;
    const x = (px - W / 2) / scale + W / 2;
    const y = (py - H / 2) / scale + H / 2;
    onMove([+clamp(x / W).toFixed(3), +clamp((y - 30) / (H - 60)).toFixed(3)]);
  };
  const onKey = (e: KeyboardEvent<HTMLDivElement>) => {
    if (!onMove) return;
    const [x, y] = light;
    const to: Record<string, [number, number]> = {
      ArrowLeft: [x - STEP, y], ArrowRight: [x + STEP, y], ArrowUp: [x, y - STEP], ArrowDown: [x, y + STEP], Home: [0.5, 0.5],
    };
    const next = to[e.key];
    if (!next) return;
    e.preventDefault();
    onMove([+clamp(next[0]).toFixed(3), +clamp(next[1]).toFixed(3)]);
  };

  const fig = (side: StageSide, x: number, mirror: boolean) => (
    <g transform={`translate(${x} 62)${mirror ? ' translate(96 0) scale(-1 1)' : ''}`}>
      <PartFigure shapeSig={side.shapeSig} size={96} />
    </g>
  );

  return (
    <div className="space-y-2">
      <div className="relative">
        <svg ref={svg} viewBox={`0 0 ${W} ${H}`} aria-hidden="true" data-pulls-stage=""
          className={`block w-full h-auto rounded-3xl bg-[var(--color-bg-secondary)] ${onMove ? 'touch-none' : ''}`}
          onPointerDown={(e) => { if (!onMove) return; dragging.current = true; (e.target as Element).setPointerCapture?.(e.pointerId); fromPointer(e); }}
          onPointerMove={(e) => { if (dragging.current) fromPointer(e); }}
          onPointerUp={() => { dragging.current = false; }} onPointerCancel={() => { dragging.current = false; }}>
          <defs>
            <radialGradient id={id}>
              <stop offset="0" style={{ stopColor: 'var(--color-accent)', stopOpacity: 0.55 }} />
              <stop offset="1" style={{ stopColor: 'var(--color-accent)', stopOpacity: 0 }} />
            </radialGradient>
          </defs>
          <g style={{ transform: `scale(${scale})`, transformOrigin: '50% 50%', transition: reduce ? 'none' : 'transform 900ms ease-out' }}>
            {fig(a, 22, false)}
            {fig(b, W - 22 - 96, true)}
            <circle cx={lx} cy={ly} r={34} fill={`url(#${id})`} />
            <circle cx={lx} cy={ly} r={7} style={{ fill: 'var(--color-accent)' }} opacity={0.9} />
          </g>
        </svg>
        {onMove && (
          // The light, for keyboards and screen readers: the stage itself is decorative.
          <div role="slider" tabIndex={0} aria-label={label ?? 'Your light'} aria-valuemin={0} aria-valuemax={100}
            aria-valuenow={Math.round(light[0] * 100)} aria-valuetext={lightText(light, a.name, b.name)} onKeyDown={onKey}
            className="absolute rounded-full pointer-events-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--color-accent)]"
            style={{ left: `${((lx - W / 2) * scale + W / 2) / W * 100}%`, top: `${((ly - H / 2) * scale + H / 2) / H * 100}%`, width: 44, height: 44, transform: 'translate(-50%, -50%)' }} />
        )}
      </div>
      {/* Equal size, equal weight: the two names side by side, neither first in importance. */}
      <div className="grid grid-cols-2 gap-3 text-center">
        <p className="font-serif text-lg text-[var(--color-text-primary)] text-balance">{a.name}</p>
        <p className="font-serif text-lg text-[var(--color-text-primary)] text-balance">{b.name}</p>
      </div>
    </div>
  );
}
