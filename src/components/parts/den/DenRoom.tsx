import { useId, useLayoutEffect, useRef, useState, type KeyboardEvent, type PointerEvent, type ReactElement } from 'react';
import type { DenLink, DenRecency } from '../../../data/partsTypes';
import { PartFigure } from '../PartFigure';
import { FIGURE_BOX } from '../../../lib/partFigure';
import { clamp, denKey, figureLight, type DenCopy, type Held, type Spot } from '../../../lib/den';

/** A part as the room draws it. `recency` null: a past layout, everyone in the same even light. */
export interface RoomPart {
  id: string;
  name: string;
  tender: boolean;
  resting: boolean;
  shapeSig: number[] | null;
  recency: DenRecency | null;
}

const FIGURE = 52;
/** A small room (a part's story): smaller figures, no names. */
const FIGURE_SMALL = 24;
/** Further than this (px) between press and lift is a drag, not a tap. */
const DRAG_PX = 6;

/**
 * The den seen from above (docs/design/parts.md, "The den"): the room's wall colour, a warm pool of light
 * in the middle that is the person (no label, not a node, not tappable), and each part where the person
 * put it. Light on a figure says how recently they spent time with it; tender parts sit under a soft
 * cover; resting parts a little dimmer. Confirmed threads only. No motion on entry; while dragging, the
 * figure lifts a little (instantly, never eased, so reduced motion has nothing to stop).
 *
 * Interactive (`onMove` given): drag with a pointer, or focus a figure and use Enter / Space to pick it up,
 * the arrow keys to move it and Enter / Space to put it down (Escape puts it back). A press and lift in the
 * same place is a tap (`onTap`), as is a click from assistive tech, or putting a figure down where it was picked up. A past layout passes no handlers and nothing in it can be moved or tapped.
 * `small` (a part's story): a thumbnail, never interactive, no names; `selected` marks the story's part.
 */
export function DenRoom({ parts, spots, links, copy, selected = [], onMove, onTap, onUnlink, label, small = false }: {
  parts: RoomPart[];
  spots: Map<string, Spot>;
  links: DenLink[];
  /** The den's copy: the interactive room's help line and remove label. */
  copy?: DenCopy;
  small?: boolean;
  /** Figures chosen for a thread (one, then two). */
  selected?: readonly string[];
  /** Put down somewhere new: save it. */
  onMove?: (id: string, at: Spot) => void;
  onTap?: (id: string) => void;
  onUnlink?: (link: DenLink) => void;
  /** The room's accessible name. */
  label: string;
}) {
  const roomRef = useRef<HTMLDivElement>(null);
  const dragged = useRef(false);
  const help = useId();
  /** For url(#…) inside the SVG: useId's characters aren't all safe there. */
  const uid = `den${help.replace(/[^A-Za-z0-9_-]/g, '')}`;
  const [held, setHeld] = useState<Held | null>(null);
  const [drag, setDrag] = useState<{ id: string; x0: number; y0: number; at: Spot | null } | null>(null);
  const interactive = !!onMove && !small;
  /** The controls' keys in reading order, measured after layout (null until then: the source order). */
  const [order, setOrder] = useState<string[] | null>(null);
  /** A control that had focus when the order changed: moving a node in the DOM drops its focus, so it is given back. */
  const refocus = useRef<string | null>(null);
  useLayoutEffect(() => {
    const root = roomRef.current;
    if (!root || !interactive) return;
    if (refocus.current) {
      root.querySelector<HTMLElement>(`:scope > [data-den-focus="${refocus.current}"]`)?.focus({ preventScroll: true });
      refocus.current = null;
    }
    // Never while a figure is held or dragged: it stays where it is in the order until it is put down.
    if (held || drag) return;
    const next = readingOrder([...root.querySelectorAll<HTMLElement>(':scope > [data-den-focus]')]);
    if (order && order.join('|') === next.join('|')) return;
    const active = document.activeElement as HTMLElement | null;
    if (active && root.contains(active)) refocus.current = active.dataset.denFocus ?? null;
    setOrder(next);
  }, [interactive, held, drag, order, spots, parts, links]);
  const fig = small ? FIGURE_SMALL : FIGURE;
  const named = new Map(parts.map((p) => [p.id, p.name]));

  const spotOf = (id: string): Spot | undefined => {
    if (drag?.id === id && drag.at) return drag.at;
    if (held?.id === id) return held.at;
    return spots.get(id);
  };

  const fromPointer = (e: PointerEvent): Spot | null => {
    const r = roomRef.current?.getBoundingClientRect();
    if (!r || r.width === 0 || r.height === 0) return null;
    return { x: clamp((e.clientX - r.left) / r.width), y: clamp((e.clientY - r.top) / r.height) };
  };

  const onKey = (id: string) => (e: KeyboardEvent) => {
    const spot = spotOf(id);
    if (!spot) return;
    const r = denKey(e.key, id, spot, held);
    if (r.kind === 'none') return;
    e.preventDefault();
    if (r.kind === 'pick' || r.kind === 'move') setHeld(r.held);
    else {
      setHeld(null);
      if (r.kind === 'drop') onMove?.(id, r.at);
      if (r.kind === 'tap') onTap?.(id);
    }
  };

  // Lines first (under the figures), then the glows, all in one SVG over the floor.
  const lines = links.flatMap((l) => {
    const a = spotOf(l.aId);
    const b = spotOf(l.bId);
    return a && b ? [{ l, a, b }] : [];
  });

  return (
    <div className="w-full">
      <div ref={roomRef} role="group" aria-label={label} aria-describedby={interactive ? help : undefined}
        className={`relative w-full ${small ? 'max-w-[220px] rounded-xl' : 'max-w-[560px] rounded-2xl'} mx-auto aspect-square overflow-hidden border border-[var(--color-border-subtle)]`}
        style={{ background: 'var(--color-wall)' }} data-den-room="">
        <svg className="absolute inset-0 w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
          <defs>
            <radialGradient id={`${uid}-lamp`}>
              <stop offset="0%" stopColor="var(--color-accent-glow)" stopOpacity={0.5} />
              <stop offset="55%" stopColor="var(--color-accent-glow)" stopOpacity={0.14} />
              <stop offset="100%" stopColor="var(--color-accent-glow)" stopOpacity={0} />
            </radialGradient>
            <radialGradient id={`${uid}-dusk`} cx="50%" cy="50%" r="72%">
              <stop offset="45%" stopColor="#000" stopOpacity={0} />
              <stop offset="100%" stopColor="#000" stopOpacity={0.32} />
            </radialGradient>
            <radialGradient id={`${uid}-glow`}>
              <stop offset="0%" stopColor="var(--color-accent-glow)" stopOpacity={0.7} />
              <stop offset="100%" stopColor="var(--color-accent-glow)" stopOpacity={0} />
            </radialGradient>
          </defs>
          <rect x="0" y="0" width="100" height="100" fill={`url(#${uid}-dusk)`} />
          {/* The light is the person: no label, no node, nothing to tap. */}
          <circle cx="50" cy="50" r="30" fill={`url(#${uid}-lamp)`} data-den-light="" />
          {lines.map(({ l, a, b }) => (l.kind === 'covers_for'
            // From the one in front (wider) to the one behind (narrower).
            ? <polygon key={l.id} points={taper(a, b)} style={{ fill: 'var(--color-text-primary)' }} opacity={0.28} data-den-thread="covers_for" />
            : <line key={l.id} x1={a.x * 100} y1={a.y * 100} x2={b.x * 100} y2={b.y * 100} strokeDasharray="2 1.6" strokeLinecap="round"
                style={{ stroke: 'var(--color-text-primary)' }} strokeWidth={0.7} opacity={0.32} vectorEffect="non-scaling-stroke" data-den-thread="two_pulls" />))}
          {parts.map((p) => {
            const s = spotOf(p.id);
            const glow = p.recency ? figureLight(p.recency, p.resting).glow : 0;
            return s && glow > 0 ? <circle key={p.id} cx={s.x * 100} cy={s.y * 100} r={10} fill={`url(#${uid}-glow)`} opacity={glow} /> : null;
          })}
        </svg>

        {/* Figures and thread removes in reading order (top to bottom, left to right, as measured), so Tab
            follows the room; the DOM order never changes where anything is drawn. */}
        {inReadingOrder([
          ...(parts.map((p) => {
          const s = spotOf(p.id);
          if (!s) return null;
          const light = p.recency ? figureLight(p.recency, p.resting) : { glow: 0, opacity: p.resting ? 0.8 : 1 };
          const lifted = drag?.id === p.id && !!drag.at || held?.id === p.id;
          const chosen = selected.includes(p.id);
          const body = (
            <>
              {/* Picked: a soft ring round the figure only, never a box over the name (it would cover a neighbour's). */}
              <span className={`block mx-auto rounded-full ${chosen ? 'ring-2 ring-offset-2 ring-offset-transparent ring-[var(--color-border-accent)] shadow-[0_0_10px_2px_var(--color-border-accent)]' : ''}`} style={{ width: fig, height: fig, opacity: light.opacity }}>
                {p.tender ? <TenderCover size={fig} /> : <PartFigure shapeSig={p.shapeSig} size={fig} still />}
              </span>
              {!small && (
                <span className="block max-w-[6.5rem] mx-auto font-serif text-[13px] leading-tight text-[var(--color-text-primary)] break-words line-clamp-2"
                  style={{ opacity: Math.max(light.opacity, 0.8) }}>
                  {p.name}
                </span>
              )}
            </>
          );
          // Higher in the room paints above lower: a name hangs down toward the figures below it, so it is
          // never under a neighbour's figure or ring. A part being moved is above everything.
          const place = { left: `${s.x * 100}%`, top: `${s.y * 100}%`, zIndex: lifted ? 20 : 1 + Math.round((1 - s.y) * 10) };
          if (!interactive) {
            return (
              <div key={p.id} style={place} data-den-figure={p.id} data-selected={chosen ? '' : undefined}
                className="absolute -translate-x-1/2 -translate-y-1/2 text-center pointer-events-none rounded-lg">
                {body}
              </div>
            );
          }
          return (
            <button key={p.id} data-den-focus={p.id} type="button" aria-label={p.name} aria-pressed={held?.id === p.id}
              data-den-figure={p.id} data-selected={chosen ? '' : undefined}
              className={`absolute -translate-x-1/2 -translate-y-1/2 text-center min-w-11 min-h-11 p-1 rounded-xl touch-none select-none cursor-grab
                focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--color-border-accent)]
                ${lifted ? 'scale-105 cursor-grabbing drop-shadow-lg' : ''}`}
              style={place}
              onKeyDown={onKey(p.id)}
              onBlur={() => { if (held?.id === p.id) setHeld(null); }}
              onPointerDown={(e) => {
                if (e.button !== 0) return;
                e.currentTarget.setPointerCapture?.(e.pointerId);
                setDrag({ id: p.id, x0: e.clientX, y0: e.clientY, at: null });
              }}
              onPointerMove={(e) => {
                if (drag?.id !== p.id) return;
                if (!drag.at && Math.hypot(e.clientX - drag.x0, e.clientY - drag.y0) < DRAG_PX) return;
                const at = fromPointer(e);
                if (at) setDrag({ ...drag, at });
              }}
              onPointerUp={() => {
                if (drag?.id !== p.id) return;
                const at = drag.at;
                setDrag(null);
                // A drag is not a tap: the click the browser sends after it is swallowed.
                if (at) { dragged.current = true; onMove?.(p.id, at); }
              }}
              onPointerCancel={() => setDrag(null)}
              onClick={() => {
                if (dragged.current) { dragged.current = false; return; }
                onTap?.(p.id);
              }}>
              {body}
            </button>
          );
        })).flatMap((n) => (n ? [n] : [])),
          ...((interactive && onUnlink && lines.map(({ l, a, b }) => (
          <button key={`x-${l.id}`} data-den-focus={`x-${l.id}`} type="button"
            aria-label={`${copy?.den_remove ?? ''}: ${named.get(l.aId) ?? ''}, ${named.get(l.bId) ?? ''}`}
            className="absolute z-[15] -translate-x-1/2 -translate-y-1/2 min-w-11 min-h-11 flex items-center justify-center rounded-full text-base text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
            style={{ left: `${((a.x + b.x) / 2) * 100}%`, top: `${((a.y + b.y) / 2) * 100}%` }}
            onClick={() => onUnlink(l)} data-den-unlink={l.id}>
            <span aria-hidden="true">×</span>
          </button>
        ))) || []),
        ], order)}
      </div>
      {interactive && copy && (
        <p id={help} className="mt-2 text-xs text-center text-[var(--color-text-secondary)]">
          {copy.den_move_help}<span className="sr-only"> {copy.den_move_keys}</span>
        </p>
      )}
    </div>
  );
}

/** Rows of controls whose tops sit within ROW_PX of the row's first, top to bottom; left to right in a row. */
const ROW_PX = 8;
function readingOrder(els: readonly HTMLElement[]): string[] {
  const boxes = els.map((e) => ({ key: e.dataset.denFocus ?? '', r: e.getBoundingClientRect() })).sort((a, b) => a.r.top - b.r.top);
  const rows: Array<typeof boxes> = [];
  for (const b of boxes) {
    const row = rows[rows.length - 1];
    if (row && b.r.top - row[0].r.top <= ROW_PX) row.push(b); else rows.push([b]);
  }
  return rows.flatMap((row) => row.sort((a, b) => a.r.left - b.r.left).map((b) => b.key));
}

/** The elements in the measured order (any not measured yet keep their place at the end). */
function inReadingOrder(nodes: ReactElement[], order: readonly string[] | null): ReactElement[] {
  if (!order) return nodes;
  const at = new Map(order.map((k, i) => [k, i]));
  const rank = (n: ReactElement) => at.get(String(n.key)) ?? order.length;
  return [...nodes].sort((a, b) => rank(a) - rank(b));
}

/** A soft wedge from `a` (wide) to `b` (narrow), in the room's 0..100 box. */
function taper(a: Spot, b: Spot): string {
  const ax = a.x * 100, ay = a.y * 100, bx = b.x * 100, by = b.y * 100;
  const len = Math.hypot(bx - ax, by - ay) || 1;
  const nx = -(by - ay) / len, ny = (bx - ax) / len;
  const wa = 1.1, wb = 0.3;
  const f = (n: number) => n.toFixed(2);
  return `${f(ax + nx * wa)},${f(ay + ny * wa)} ${f(bx + nx * wb)},${f(by + ny * wb)} ${f(bx - nx * wb)},${f(by - ny * wb)} ${f(ax - nx * wa)},${f(ay - ny * wa)}`;
}

/** A tender part, never shown uncovered: a soft cover where the figure would be. */
export function TenderCover({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox={`0 0 ${FIGURE_BOX} ${FIGURE_BOX}`} aria-hidden="true" data-den-tender="">
      <ellipse cx={FIGURE_BOX / 2} cy={86} rx={28} ry={3.5} style={{ fill: 'var(--color-text-primary)' }} opacity={0.08} />
      <path d="M20 86 C20 52 34 34 50 34 C66 34 80 52 80 86 Z"
        style={{ fill: 'color-mix(in oklab, var(--color-text-primary) 16%, transparent)', stroke: 'color-mix(in oklab, var(--color-text-primary) 26%, transparent)', strokeWidth: 0.8 }} />
      <path d="M28 70 C40 64 60 64 72 70" fill="none" style={{ stroke: 'color-mix(in oklab, var(--color-text-primary) 22%, transparent)', strokeWidth: 0.8 }} />
    </svg>
  );
}
