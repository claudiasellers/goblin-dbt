import { useEffect, useRef, type ReactNode } from 'react';
import { choiceButton, choiceSelected } from '../oppositeAction/styles';
import { buzz } from '../regulation/hooks';

/** Step heading. Takes focus on mount so keyboard and screen-reader users land on each new step. */
export function StepTitle({ eyebrow, title, sub }: { eyebrow?: string; title: string; sub?: string }) {
  const ref = useRef<HTMLHeadingElement>(null);
  useEffect(() => { ref.current?.focus({ preventScroll: true }); }, []);
  return (
    <header className="space-y-1.5">
      {eyebrow && <p className="text-xs font-semibold uppercase tracking-wider text-[var(--color-text-secondary)]">{eyebrow}</p>}
      <h2 ref={ref} tabIndex={-1} className="text-2xl font-semibold leading-tight text-balance text-[var(--color-text-primary)] focus:outline-none">{title}</h2>
      {sub && <p className="text-[var(--color-text-secondary)] max-w-prose">{sub}</p>}
    </header>
  );
}

export function Choice({ selected, onClick, children, sub }: { selected?: boolean; onClick: () => void; children: ReactNode; sub?: ReactNode }) {
  return (
    <button type="button" aria-pressed={selected} onClick={() => { buzz(8); onClick(); }}
      className={`${choiceButton} ${selected ? choiceSelected : ''}`}>
      <span className="font-medium">{children}</span>
      {sub && <span className="block text-sm mt-0.5 opacity-80">{sub}</span>}
    </button>
  );
}

export function Pill({ selected, onClick, children }: { selected?: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button type="button" aria-pressed={selected} onClick={() => { buzz(8); onClick(); }}
      className={`min-h-11 px-4 rounded-full border text-[15px] font-medium motion-safe:transition-colors ${
        selected
          ? 'border-[var(--color-accent)] bg-[var(--color-accent-fill)] text-[var(--color-on-accent)]'
          : 'border-[var(--color-border)] bg-[var(--color-bg-elevated)] text-[var(--color-text-primary)] lift-secondary'}`}>
      {children}
    </button>
  );
}
