import { useRef, useState, type KeyboardEvent, type PointerEvent } from 'react';
import { clamp01, placeLabel, type SquarePoint } from '../../lib/feelingSquare';

const round3 = (n: number) => Math.round(n * 1000) / 1000;

interface FeelingSquareProps {
  point: SquarePoint | null;
  /** Called when the point is placed or moved: press, drag, lift, and arrow keys. */
  onMove?: (p: SquarePoint) => void;
  /** Enter / Space on the focused square once a point is down (the screen opens the full word
   *  list). Lifting a finger does not commit, so the point can be nudged as many times as needed. */
  onCommit?: (p: SquarePoint) => void;
  /** Other spots already on the square (dimmer), each optionally tagged with its first word. */
  others?: Array<{ point: SquarePoint; label?: string }>;
  /** Small, label-free version used as a reminder on later screens. */
  small?: boolean;
  /** Axis words (top, bottom, left, right); the check-in's energy / pleasantness by default. */
  axes?: readonly [string, string, string, string];
  /** Spoken name, for a square used for something other than the check-in (the sensation pad). */
  label?: string;
  className?: string;
}

const CHECKIN_AXES = ['more energy', 'less energy', 'unpleasant', 'pleasant'] as const;

/**
 * The feeling square: one continuous field instead of four boxes. Pleasantness runs left to
 * right, energy bottom to top, and the colours are the room's own quadrant fills blended across
 * the whole surface, so there are no borders to be on the wrong side of.
 *
 * Pointer: press or drag to place the dot; lifting leaves it there, and a new press moves it.
 * Keyboard: arrows move (Shift for bigger steps), Enter or Space places the dot in the middle, then chooses. The per-room look (halo, centre shade, Tinted's glaze, dot) comes from
 * the --square-* tokens in src/index.css.
 */
export function FeelingSquare({ point, onMove, onCommit, others = [], small = false, axes = CHECKIN_AXES, label, className = '' }: FeelingSquareProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [dragging, setDragging] = useState(false);
  const interactive = Boolean(onMove);

  function pointFromEvent(e: PointerEvent<HTMLDivElement>): SquarePoint {
    const r = ref.current!.getBoundingClientRect();
    return { x: round3(clamp01((e.clientX - r.left) / r.width)), y: round3(clamp01(1 - (e.clientY - r.top) / r.height)) };
  }

  function handleDown(e: PointerEvent<HTMLDivElement>) {
    if (!interactive || e.button !== 0) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    setDragging(true);
    onMove?.(pointFromEvent(e));
  }

  function handleMove(e: PointerEvent<HTMLDivElement>) {
    if (!dragging) return;
    onMove?.(pointFromEvent(e));
  }

  function handleUp(e: PointerEvent<HTMLDivElement>) {
    if (!dragging) return;
    setDragging(false);
    onMove?.(pointFromEvent(e));
  }

  function handleKey(e: KeyboardEvent<HTMLDivElement>) {
    if (!interactive) return;
    const step = e.shiftKey ? 0.15 : 0.05;
    const p = point ?? { x: 0.5, y: 0.5 };
    let next: SquarePoint | null = null;
    if (e.key === 'ArrowLeft') next = { x: round3(clamp01(p.x - step)), y: p.y };
    else if (e.key === 'ArrowRight') next = { x: round3(clamp01(p.x + step)), y: p.y };
    else if (e.key === 'ArrowUp') next = { x: p.x, y: round3(clamp01(p.y + step)) };
    else if (e.key === 'ArrowDown') next = { x: p.x, y: round3(clamp01(p.y - step)) };
    else if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      // No dot yet: place it in the middle; with one, choose it.
      if (point) onCommit?.(point);
      else onMove?.(p);
      return;
    }
    if (next) {
      e.preventDefault();
      onMove?.(next);
    }
  }

  return (
    <div
      ref={ref}
      className={`feeling-square${small ? ' is-small' : ''}${dragging ? ' is-dragging' : ''} ${className}`}
      {...(interactive
        ? {
            role: 'application',
            tabIndex: 0,
            'aria-roledescription': 'feeling square',
            'aria-label': label
              ?? (point
                ? `Feeling square, marked at ${placeLabel(point)}. Arrow keys move, Enter chooses.`
                : 'Feeling square. Up is more energy, right is more pleasant. Arrow keys move, Enter chooses.'),
            onPointerDown: handleDown,
            onPointerMove: handleMove,
            onPointerUp: handleUp,
            onPointerCancel: () => setDragging(false),
            onKeyDown: handleKey,
          }
        : { 'aria-hidden': true })}
    >
      <i className="fs-halo" />
      <i className="fs-halo fs-halo--low" />
      <i className="fs-lo" />
      <i className="fs-hi" />
      <i className="fs-shade" />
      <i className="fs-art" />
      {!small && (
        <>
          <span className="fs-axis fs-axis--top">{axes[0]}</span>
          <span className="fs-axis fs-axis--bottom">{axes[1]}</span>
          <span className="fs-axis fs-axis--left">{axes[2]}</span>
          <span className="fs-axis fs-axis--right">{axes[3]}</span>
        </>
      )}
      {others.map((o, i) => (
        <span key={i}>
          <span className="fs-dot fs-dot--other" style={{ left: `${o.point.x * 100}%`, top: `${(1 - o.point.y) * 100}%` }} />
          {o.label && !small && (
            <span className={`fs-tag${o.point.x > 0.6 ? ' fs-tag--left' : ''}`} style={{ left: `${o.point.x * 100}%`, top: `${(1 - o.point.y) * 100}%` }}>
              {o.label}
            </span>
          )}
        </span>
      ))}
      {point && (
        <span
          className="fs-dot"
          style={{ left: `${point.x * 100}%`, top: `${(1 - point.y) * 100}%` }}
        />
      )}
    </div>
  );
}
