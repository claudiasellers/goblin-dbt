/**
 * Crisis resources as a non-blocking banner (A0-1, ruling R12, decision D-01).
 *
 * Rendered at the top of the normal check-in result when the result carries a
 * crisis safety flag. The pattern, tool cards, Done, "too much right now"
 * micro-steps and bailout all render below it: resources sit alongside the
 * tools, never instead of them.
 *
 * Same trigger conditions and resources as the old full-screen crisis screen.
 * The only content change: the user reads CRISIS_BANNER_LINE instead of the
 * clinician-facing `SafetyFlag.action` text (which is still in the payload).
 * Visual changes (emoji, palette, SMS pre-fill) wait for the safety batch.
 *
 * Interim frontend copy (D-06). The safety batch's `safety.open` wraps this.
 */

// Must work for someone who is flooded but not suicidal: every
// emotional_flooding result reaches this banner.
const CRISIS_BANNER_LINE =
  "When it gets this intense, you don't have to carry it alone. You can talk to someone right now, any time.";

export function CrisisBanner() {
  return (
    <section
      aria-label="Support right now"
      className="mb-6 p-4 rounded-2xl text-center bg-[var(--color-q-hu-bg)] border border-[var(--color-q-hu-border)]"
    >
      <span className="text-3xl mb-3 block" aria-hidden="true">🆘</span>
      <h2 className="text-xl font-bold text-[var(--color-q-hu-text)] mb-2">
        We hear you
      </h2>
      <p className="text-[var(--color-q-hu-text)] mb-4">
        {CRISIS_BANNER_LINE}
      </p>
      <a
        href="tel:988"
        className="inline-block w-full py-3 px-4 rounded-lg bg-[var(--color-danger)] hover:opacity-90 text-[var(--color-on-danger)] font-medium transition-colors mb-3"
      >
        Call 988 (Suicide & Crisis Lifeline)
      </a>
      <a
        href="sms:741741?body=HELLO"
        className="inline-block w-full py-3 px-4 rounded-lg border border-[var(--color-q-hu-border)] text-[var(--color-q-hu-text)] font-medium hover:bg-[var(--color-q-hu-bg)] transition-colors"
      >
        Text HOME to 741741
      </a>
    </section>
  );
}
