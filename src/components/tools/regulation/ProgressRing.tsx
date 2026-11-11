import { m, useReducedMotion } from 'motion/react';
import type { ReactNode } from 'react';

/**
 * One ring used by the stop lock, wait lock, cold timer, reps counter and the skill player's holdRing. `smooth`
 * eases each change over 700 ms (for values that step); a value updated every frame (a hold) passes false, or the
 * transition restarts each frame and the ring trails far behind the hold.
 */
export function ProgressRing({ value, size = 120, stroke = 6, children, label, smooth = true }: {
  value: number; size?: number; stroke?: number; children?: ReactNode; label?: string; smooth?: boolean;
}) {
  const r = 50 - stroke;
  const c = 2 * Math.PI * r;
  return (
    <div className="relative grid place-items-center shrink-0" style={{ width: size, height: size }}
      role={label ? 'progressbar' : undefined} aria-label={label}
      aria-valuemin={label ? 0 : undefined} aria-valuemax={label ? 100 : undefined}
      aria-valuenow={label ? Math.round(value * 100) : undefined}>
      <svg viewBox="0 0 100 100" className="absolute inset-0 -rotate-90" aria-hidden="true">
        <circle cx="50" cy="50" r={r} fill="none" stroke="var(--color-border)" strokeWidth={stroke} />
        <circle cx="50" cy="50" r={r} fill="none" stroke="var(--color-accent)" strokeWidth={stroke} strokeLinecap="round"
          strokeDasharray={c} strokeDashoffset={c * (1 - Math.max(0, Math.min(1, value)))}
          className={smooth ? 'motion-safe:transition-[stroke-dashoffset] motion-safe:duration-700' : undefined} />
      </svg>
      <div className="relative">{children}</div>
    </div>
  );
}

export function Padlock({ closed, size = 36 }: { closed: boolean; size?: number }) {
  const reduce = useReducedMotion();
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" aria-hidden="true">
      <m.path d="M15 22 V15 a9 9 0 0 1 18 0 V22" fill="none" stroke="var(--color-text-primary)" strokeWidth="3.5" strokeLinecap="round"
        initial={false} animate={{ y: closed ? 0 : -6 }}
        transition={reduce ? { duration: 0 } : { type: 'spring', stiffness: 500, damping: 18 }} />
      <rect x="10" y="21" width="28" height="21" rx="6" fill={closed ? 'var(--color-accent-fill)' : 'var(--color-text-primary)'} />
      <circle cx="24" cy="31" r="3" fill="var(--color-bg-elevated)" />
    </svg>
  );
}
