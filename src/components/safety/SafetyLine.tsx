/**
 * The calm 988 line (Oct 2026, schema/checkin-safety.cypher).
 *
 * Shown in the crisis banner's place when the result is flooding but the person didn't report
 * thoughts of hurting themselves or ending their life (No or Skip on the spiral path's question).
 * The number stays on screen; the suicide-crisis framing is kept for an explicit yes or not sure,
 * which gets the full CrisisBanner. Non-blocking, like the banner: everything else renders below it.
 *
 * Interim frontend copy beside CrisisBanner's; the safety batch's `safety.open` wraps both.
 */

export const SAFETY_LINE = 'If it starts to feel unsafe, you can call or text 988, any time.';

export function SafetyLine() {
  return (
    <section
      aria-label="Support if you need it"
      className="mb-6 px-4 py-3 rounded-xl border border-[var(--color-border-subtle)] text-left"
    >
      <p className="text-[15px] leading-relaxed text-[var(--color-text-secondary)]">{SAFETY_LINE}</p>
      <div className="mt-2 flex gap-4 text-[15px] font-medium">
        <a href="tel:988" className="text-[var(--color-text-primary)] underline underline-offset-2">Call 988</a>
        <a href="sms:988" className="text-[var(--color-text-primary)] underline underline-offset-2">Text 988</a>
      </div>
    </section>
  );
}
