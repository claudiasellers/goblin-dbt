import { useEffect, useRef, useState, type ReactNode } from 'react';
import { linkButton, primaryButton, secondaryText } from '../oppositeAction/styles';

/**
 * Wise mind's small pieces (docs/design/wise-mind.md). Presentation only: every string arrives from the
 * page (wise-mind.json's copy and chips, or the person's own words).
 */

/** A screen's question. Takes focus as its screen opens, so keyboard and screen-reader users land on it. */
export function Prompt({ children, serif = false }: { children: ReactNode; serif?: boolean }) {
  const ref = useRef<HTMLHeadingElement>(null);
  useEffect(() => { ref.current?.focus({ preventScroll: true }); }, []);
  return (
    <h2 ref={ref} tabIndex={-1}
      className={`${serif ? 'font-serif text-2xl leading-snug' : 'text-lg font-medium'} text-[var(--color-text-primary)] text-balance focus:outline-none focus-visible:outline-none`}>
      {children}
    </h2>
  );
}

/** A line to sit with (serif), or a quiet note. `focus`: it takes focus as it appears (the control that led here went away). */
export function Line({ children, serif = false, status = false, focus = false }: { children: ReactNode; serif?: boolean; status?: boolean; focus?: boolean }) {
  const ref = useFocusOnMount<HTMLParagraphElement>(focus);
  return (
    <p ref={ref} tabIndex={focus ? -1 : undefined} role={status ? 'status' : undefined}
      className={`${serif ? 'font-serif text-xl text-[var(--color-text-secondary)]' : secondaryText} focus:outline-none`}>{children}</p>
  );
}

/** A sub-question inside a screen (what one mind says): takes focus as it opens. */
export function SubPrompt({ id, children }: { id: string; children: ReactNode }) {
  const ref = useFocusOnMount<HTMLHeadingElement>(true);
  return <h3 ref={ref} id={id} tabIndex={-1} className="font-medium text-[var(--color-text-primary)] focus:outline-none">{children}</h3>;
}

function useFocusOnMount<T extends HTMLElement>(on: boolean) {
  const ref = useRef<T>(null);
  useEffect(() => { if (on) ref.current?.focus({ preventScroll: true }); }, [on]);
  return ref;
}

export function Chip({ label, pressed, onClick, own = false }: { label: ReactNode; pressed?: boolean; onClick: () => void; own?: boolean }) {
  return (
    <button type="button" aria-pressed={pressed ? 'true' : 'false'} onClick={onClick}
      className={`den-chip den-chip--small ${own ? 'font-serif' : ''} ${pressed ? '!text-[var(--color-on-accent)]' : ''}`}>{label}</button>
  );
}

/** One decision: chips, then "Something else" when the screen takes own words. */
export function ChipRow({ options, picked, onPick, ownLabel, onOwn, ownPressed = false, children }: {
  options: readonly { id: string; label: string }[]; picked?: string | null; onPick: (id: string) => void;
  /** `ownPressed`: the current pick is their own words (a heard circle reopened). */
  ownLabel?: string; onOwn?: () => void; ownPressed?: boolean; children?: ReactNode;
}) {
  return (
    <div className="flex flex-wrap gap-2.5">
      {options.map((o) => <Chip key={o.id} label={o.label} pressed={picked === o.id} onClick={() => onPick(o.id)} />)}
      {children}
      {ownLabel && onOwn && <Chip label={ownLabel} pressed={ownPressed} onClick={onOwn} />}
    </div>
  );
}

/** A quiet way past a screen. */
export function QuietLink({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <div className="flex justify-center">
      <button type="button" className={linkButton} onClick={onClick}>{label}</button>
    </div>
  );
}

/**
 * The person's own words: a plain field, ≤ `max` characters, kept as written (never linted, parsed or
 * shown back outside this visit and My words).
 */
export function OwnWords({ label, fieldLabel, backLabel, nextLabel, max, onDone, onBack, initial = '' }: {
  label: string; fieldLabel: string; backLabel: string; nextLabel: string; max: number; onDone: (text: string) => void; onBack: () => void;
  /** What they wrote before, when they come back to change it. */
  initial?: string;
}) {
  const [text, setText] = useState(initial.slice(0, max));
  return (
    <div className="space-y-4">
      <button type="button" onClick={onBack}
        className="inline-flex items-center gap-1 min-h-11 px-2 -ml-2 rounded-lg text-sm text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]">
        <span aria-hidden="true">←</span>
        <span>{backLabel}</span>
      </button>
      <Prompt>{label}</Prompt>
      <textarea value={text} onChange={(e) => setText(e.target.value.slice(0, max))} maxLength={max} rows={3} aria-label={fieldLabel}
        className="w-full p-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-input)] text-[var(--color-text-primary)] font-serif text-lg focus:ring-2 focus:ring-[var(--color-accent)]" />
      <button type="button" className={primaryButton} disabled={!text.trim()} onClick={() => onDone(text.trim())}>{nextLabel}</button>
    </div>
  );
}
