import { useRef, useState, type KeyboardEvent, type PointerEvent } from 'react';
import { clamp01, placeLabel, type SquarePoint } from '../../lib/feelingSquare';

const round3 = (n: number) => Math.round(n * 1000) / 1000;

interface FeelingSquareProps {
  point: SquarePoint | null;
  /** Called while the finger or cursor moves (and on arrow keys). */
  onMove?: (p: SquarePoint) => void;
  /** Called when the touch lifts, or on Enter / Space. */
  onCommit?: (p: SquarePoint) => void;
  /** Small, label-free version used as a reminder on later screens. */
  small?: boolean;
  className?: string;
}

/**
 * The feeling square: one continuous field instead of four boxes. Pleasantness runs left to
 * right, energy bottom to top, and the colours are the room's own quadrant fills blended across
 * the whole surface, so there are no borders to be on the wrong side of.
 *
 * Pointer: press, drag to adjust, lift to commit. Keyboard: arrows move (Shift for bigger steps),
 * Enter or Space commits. The per-room look (halo, centre shade, Tinted's glaze, dot) comes from
 * the --square-* tokens in src/index.css.
 */
export function FeelingSquare({ point, onMove, onCommit, small = false, className = '' }: FeelingSquareProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [dragging, setDragging] = useState(false);
  const interactive = Boolean(onCommit);

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
    const p = pointFromEvent(e);
    onMove?.(p);
    onCommit?.(p);
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
    else if ((e.key === 'Enter' || e.key === ' ') && point) {
      e.preventDefault();
      onCommit?.(point);
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
            'aria-label': point
              ? `Feeling square, marked at ${placeLabel(point)}. Arrow keys move, Enter chooses.`
              : 'Feeling square. Up is more energy, right is more pleasant. Arrow keys move, Enter chooses.',
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
          <span className="fs-axis fs-axis--top">more energy</span>
          <span className="fs-axis fs-axis--bottom">less energy</span>
          <span className="fs-axis fs-axis--left">unpleasant</span>
          <span className="fs-axis fs-axis--right">pleasant</span>
        </>
      )}
      {point && (
        <span
          className="fs-dot"
          style={{ left: `${point.x * 100}%`, top: `${(1 - point.y) * 100}%` }}
        />
      )}
    </div>
  );
}
