import { useEffect, useRef, type ReactNode } from 'react';

/**
 * The square paper: the only shadow in the app. Two pulls' keepsake and Cope Ahead's plan card share it,
 * so neither tool's chunk carries the other's code (it lives outside src/components/parts/). Square at
 * least: longer words (own words at full length) make it taller, never overflow it.
 * `label` is the whole card's text, read as one group (leave it out when the card's own text reads well as it is); `focusOnMount` gives it focus as it appears.
 * `data` sets the hosts' own data attributes (`data-keepsake`, `data-plan-card`) for their checks.
 * `compact` drops the square and some padding, for a card shown inside another task's screen (the pros & cons
 * replay in Hold to wait), where the screen's own choice must stay near the top.
 */
export function PaperCard({ label, focusOnMount = false, compact = false, data, children }: {
  label?: string; focusOnMount?: boolean; compact?: boolean; data?: Record<`data-${string}`, string>; children: ReactNode;
}) {
  const paper = useRef<HTMLDivElement>(null);
  useEffect(() => { if (focusOnMount) paper.current?.focus({ preventScroll: true }); }, [focusOnMount]);
  return (
    <div ref={paper} tabIndex={-1} role="group" aria-label={label} {...data}
      className={compact
        ? 'mx-auto w-full max-w-[20rem] rounded-md bg-[var(--color-bg-elevated)] px-5 py-4 flex flex-col justify-center gap-3 [overflow-wrap:anywhere] focus:outline-none'
        : 'mx-auto w-full max-w-[20rem] aspect-square rounded-md bg-[var(--color-bg-elevated)] p-7 flex flex-col justify-center gap-4 [overflow-wrap:anywhere] focus:outline-none'}
      style={{ boxShadow: '0 18px 40px -18px color-mix(in oklab, var(--color-text-primary) 45%, transparent), 0 2px 6px -2px color-mix(in oklab, var(--color-text-primary) 20%, transparent)' }}>
      {children}
    </div>
  );
}

/** A line on the paper: the serif, the page's primary ink. */
export const paperLine = 'font-serif text-xl leading-snug text-[var(--color-text-primary)] text-balance';
