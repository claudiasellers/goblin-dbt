import type { ReactNode } from 'react';
import { m } from 'motion/react';

const buzz = () => { try { navigator.vibrate?.(6); } catch { /* not supported */ } };

/** An instrument key: the room's button. */
export function Key({ children, onClick, primary, led, className = '', disabled, ariaLabel, pressed }: {
  children: ReactNode; onClick: () => void; primary?: boolean; led?: boolean; className?: string;
  disabled?: boolean; ariaLabel?: string; pressed?: boolean;
}) {
  return (
    <m.button type="button" whileTap={disabled ? undefined : { scale: 0.96, y: 1 }} disabled={disabled} aria-label={ariaLabel}
      aria-pressed={pressed}
      onClick={() => { buzz(); onClick(); }}
      className={`tune-key relative min-h-12 px-4 rounded-[14px] border text-[15px] font-medium flex items-center justify-center gap-2 transition-colors disabled:opacity-40 ${className}`}
      style={primary
        ? { background: 'var(--t-ink)', color: 'var(--t-bg)', borderColor: 'var(--t-ink)' }
        : { background: 'var(--t-key)', borderColor: 'var(--t-key-line)', color: 'var(--t-ink)' }}>
      {led && <span className="tune-led shrink-0" aria-hidden />}
      {children}
    </m.button>
  );
}

/** A choice card with a main line and an optional quieter line. */
export function Choice({ label, sub, onClick, selected, children, disabled }: {
  label: string; sub?: string; onClick: () => void; selected?: boolean; children?: ReactNode; disabled?: boolean;
}) {
  return (
    <m.button type="button" whileTap={disabled ? undefined : { scale: 0.98 }} disabled={disabled}
      onClick={() => { buzz(); onClick(); }}
      className="tune-key min-h-[52px] w-full rounded-[14px] border px-4 py-2.5 text-left flex flex-col justify-center"
      style={{
        background: 'var(--t-key)', color: 'var(--t-ink)',
        borderColor: selected ? 'var(--t-accent)' : 'var(--t-key-line)', boxShadow: selected ? '0 0 0 1px var(--t-accent)' : undefined,
      }}>
      {children}
      <span className="text-[15px] font-medium leading-snug">{label}</span>
      {sub && <span className="text-[13px] leading-snug" style={{ color: 'var(--t-ink-2)' }}>{sub}</span>}
    </m.button>
  );
}

/** A quiet text link-button (still a 44px target). */
export function Quiet({ children, onClick }: { children: ReactNode; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className="min-h-11 px-3 text-[14px] underline underline-offset-4 decoration-1"
      style={{ color: 'var(--t-ink-2)', textDecorationColor: 'var(--t-key-line)' }}>{children}</button>
  );
}

export function Head({ title, sub, eyebrow }: { title: ReactNode; sub?: ReactNode; eyebrow?: ReactNode }) {
  return (
    <div className="px-6 pt-1">
      {eyebrow && <p className="mb-2 text-[12px] uppercase tracking-[0.2em] font-semibold" style={{ color: 'var(--t-ink-2)' }}>{eyebrow}</p>}
      <h2 className="text-[24px] leading-[1.2] font-medium tracking-[-0.015em]" style={{ textWrap: 'balance' }}>{title}</h2>
      {sub && <p className="mt-2 text-[15px] leading-snug" style={{ color: 'var(--t-ink-2)' }}>{sub}</p>}
    </div>
  );
}

export function SoundGlyph({ on }: { on: boolean }) {
  return (
    <svg width="18" height="14" viewBox="0 0 18 14" aria-hidden fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
      <path d="M1 5v4h3l4 3V2L4 5H1z" fill="currentColor" stroke="none" />
      {on ? <><path d="M11 4.5c1 1.4 1 3.6 0 5" /><path d="M13.5 2.5c2 2.6 2 6.4 0 9" /></> : <path d="M11.5 4.5l5 5M16.5 4.5l-5 5" />}
    </svg>
  );
}

/** A small track-and-thumb switch drawing (state is announced by role="switch"). */
export function SwitchTrack({ on }: { on: boolean }) {
  return (
    <span aria-hidden className="relative inline-block w-9 h-5 rounded-full border shrink-0 transition-colors"
      style={{ background: on ? 'var(--t-accent)' : 'transparent', borderColor: on ? 'var(--t-accent)' : 'var(--t-key-line)' }}>
      <span className="absolute top-[2px] size-[14px] rounded-full transition-[left]"
        style={{ left: on ? 18 : 2, background: on ? 'var(--t-bg)' : 'var(--t-ink-2)' }} />
    </span>
  );
}

/**
 * Page-owned slot content (orient, next, save status) sits on an app-token card so its own styles
 * stay legible whatever the room's palette.
 */
export function SlotCard({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-2xl border p-4 text-[var(--color-text-primary)] bg-[var(--color-bg-card)] border-[var(--color-border)] shadow-[0_12px_30px_-18px_rgba(0,0,0,.45)]">
      {children}
    </div>
  );
}

/** Progress as filled beads (breaths, plucks). */
export function Beads({ n, of, label }: { n: number; of: number; label: string }) {
  return (
    <div role="progressbar" aria-label={label} aria-valuemin={0} aria-valuemax={of} aria-valuenow={Math.min(n, of)} className="flex gap-2 justify-center py-1">
      {Array.from({ length: of }, (_, i) => (
        <span key={i} className="size-2.5 rounded-full border transition-colors"
          style={{ background: i < n ? 'var(--t-accent)' : 'transparent', borderColor: i < n ? 'var(--t-accent)' : 'var(--t-ink-2)' }} />
      ))}
    </div>
  );
}
