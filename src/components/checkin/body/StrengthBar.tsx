import { useRef, useState, type KeyboardEvent, type PointerEvent } from 'react';
import { strengthAt, strengthWord } from '../../../lib/bodyMark';

interface StrengthBarProps {
  /** 0–1; null = not set for this place yet (the thumb waits in the middle, softer). */
  value: number | null;
  onChange: (v: number) => void;
  /** No place chosen: the bar shows but can't be used. */
  disabled?: boolean;
  /** Spoken name, e.g. "How strong in your chest". */
  label: string;
}

/**
 * The optional strength bar beside the body (canvas row AA): as tall as the figure, strong at the
 * top, faint at the bottom. Press or drag anywhere on it; arrow keys move it (Shift for bigger
 * steps), Home / End go to the ends.
 */
export function StrengthBar({ value, onChange, disabled = false, label }: StrengthBarProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [dragging, setDragging] = useState(false);

  function at(e: PointerEvent<HTMLDivElement>) {
    const track = ref.current?.querySelector('.strength-bar__track');
    const r = (track ?? e.currentTarget).getBoundingClientRect();
    return strengthAt(e.clientY - r.top, r.height);
  }

  function down(e: PointerEvent<HTMLDivElement>) {
    if (disabled || e.button !== 0) return;
    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);
    setDragging(true);
    onChange(at(e));
  }

  function key(e: KeyboardEvent<HTMLDivElement>) {
    if (disabled) return;
    const step = e.shiftKey ? 0.15 : 0.05;
    const v = value ?? 0.5;
    let next: number | null = null;
    if (e.key === 'ArrowUp' || e.key === 'ArrowRight') next = v + step;
    else if (e.key === 'ArrowDown' || e.key === 'ArrowLeft') next = v - step;
    else if (e.key === 'Home') next = 0;
    else if (e.key === 'End') next = 1;
    if (next === null) return;
    e.preventDefault();
    onChange(Math.round(Math.max(0, Math.min(1, next)) * 100) / 100);
  }

  return (
    <div ref={ref}
      className={`strength-bar${disabled ? ' is-disabled' : ''}${dragging ? ' is-dragging' : ''}`}
      role="slider" tabIndex={disabled ? -1 : 0} aria-orientation="vertical" aria-label={label}
      aria-disabled={disabled || undefined}
      aria-valuemin={0} aria-valuemax={100} aria-valuenow={value === null ? undefined : Math.round(value * 100)}
      aria-valuetext={value === null ? 'Not set' : strengthWord(value) ?? undefined}
      onPointerDown={down}
      onPointerMove={(e) => { if (dragging) onChange(at(e)); }}
      onPointerUp={(e) => { if (dragging) { setDragging(false); onChange(at(e)); } }}
      onPointerCancel={() => setDragging(false)}
      onKeyDown={key}>
      <span className="strength-bar__end" aria-hidden="true">strong</span>
      <span className="strength-bar__track" aria-hidden="true">
        <span className={`strength-bar__thumb${value === null || disabled ? ' is-unset' : ''}`}
          style={{ top: `${(1 - (disabled || value === null ? 0.5 : value)) * 100}%` }} />
      </span>
      <span className="strength-bar__end" aria-hidden="true">faint</span>
    </div>
  );
}
