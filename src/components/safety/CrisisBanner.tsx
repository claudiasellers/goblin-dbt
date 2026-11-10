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
 *
 * `compact`: the same resources, quieter, for inside a card (a safety-line or danger part's card,
 * check-back; functions/src/safety/partSafetyFlag.ts): no emoji or heading, the line and the two links.
 * Still alongside the card's own content, never instead of it.
 *
 * `variant="other_person"`: danger from another person (Cope Ahead's *They might hurt me*), where a suicide
 * and crisis line is the wrong first call. 911 first, then the National Domestic Violence Hotline (call or
 * text), and 988 kept as the last option. Same placement rules: compact or full, alongside, never blocking.
 *
 * Outside the US (decision D5 of docs/design/dbt-modules-plan.md, until CORE-01's helpline list): a quiet
 * *Outside the US?* list under the crisis variant, with a few national lines. Closed by default so the US
 * numbers stay first.
 */

// Must work for someone who is flooded but not suicidal: every
// emotional_flooding result reaches this banner.
const CRISIS_BANNER_LINE =
  "When it gets this intense, you don't have to carry it alone. You can talk to someone right now, any time.";

/** Danger from another person: the line, and its resources in order (988 last). */
const OTHER_PERSON_LINE = "If you're in danger now, call 911.";
const OTHER_PERSON_LINKS = [
  { href: 'tel:911', label: 'Call 911', primary: true },
  { href: 'tel:18007997233', label: 'Call 1-800-799-7233 (National Domestic Violence Hotline)' },
  { href: 'sms:88788?body=START', label: 'Text START to 88788 (National Domestic Violence Hotline)' },
  { href: 'tel:988', label: 'Call 988 (Suicide & Crisis Lifeline)' },
] as const;

export type CrisisBannerVariant = 'crisis' | 'other_person';

/** National crisis lines outside the US: country, then each line. */
const OUTSIDE_US = [
  { country: 'UK and Ireland', links: [{ href: 'tel:116123', label: 'Call 116 123 (Samaritans)' }] },
  { country: 'Canada', links: [{ href: 'tel:988', label: 'Call or text 988' }] },
  { country: 'Australia', links: [{ href: 'tel:131114', label: 'Call 13 11 14 (Lifeline)' }] },
  { country: 'New Zealand', links: [{ href: 'tel:1737', label: 'Call or text 1737' }] },
] as const;

function OutsideUs({ compact }: { compact: boolean }) {
  return (
    <details className={`${compact ? 'mt-2 text-sm' : 'mt-4 text-left'} text-[var(--color-q-hu-text)]`} data-testid="crisis-outside-us">
      <summary className="cursor-pointer min-h-11 flex items-center font-medium">Outside the US?</summary>
      <ul className="mt-2 space-y-2">
        {OUTSIDE_US.map((c) => (
          <li key={c.country}>
            <span className="block">{c.country}</span>
            {c.links.map((l) => (
              <a key={l.href + c.country} href={l.href} className="inline-flex items-center min-h-11 underline">{l.label}</a>
            ))}
          </li>
        ))}
      </ul>
    </details>
  );
}

function OtherPersonBanner({ compact }: { compact: boolean }) {
  const link = compact
    ? 'inline-flex items-center min-h-11 py-2 px-3 rounded-lg text-sm font-medium transition-colors'
    : 'block w-full min-h-11 py-3 px-4 rounded-lg font-medium transition-colors';
  const primary = 'bg-[var(--color-danger)] hover:opacity-90 text-[var(--color-on-danger)]';
  const quiet = 'border border-[var(--color-q-hu-border)] text-[var(--color-q-hu-text)]';
  return (
    <section
      aria-label="Support right now"
      data-testid={compact ? 'crisis-banner-compact' : undefined}
      data-variant="other_person"
      className={compact ? 'p-3 rounded-xl bg-[var(--color-q-hu-bg)] border border-[var(--color-q-hu-border)]' : 'mb-6 p-4 rounded-2xl text-center bg-[var(--color-q-hu-bg)] border border-[var(--color-q-hu-border)]'}
    >
      <p className={`${compact ? 'text-sm mb-2' : 'mb-4'} text-[var(--color-q-hu-text)]`}>{OTHER_PERSON_LINE}</p>
      <div className={compact ? 'flex flex-wrap gap-2' : 'space-y-3'}>
        {OTHER_PERSON_LINKS.map((l) => (
          <a key={l.href} href={l.href} className={`${link} ${'primary' in l && l.primary ? primary : quiet}`}>{l.label}</a>
        ))}
      </div>
    </section>
  );
}

export function CrisisBanner({ compact = false, variant = 'crisis' }: { compact?: boolean; variant?: CrisisBannerVariant } = {}) {
  if (variant === 'other_person') return <OtherPersonBanner compact={compact} />;
  if (compact) {
    return (
      <section
        aria-label="Support right now"
        data-testid="crisis-banner-compact"
        className="p-3 rounded-xl bg-[var(--color-q-hu-bg)] border border-[var(--color-q-hu-border)]"
      >
        <p className="text-sm text-[var(--color-q-hu-text)] mb-2">{CRISIS_BANNER_LINE}</p>
        <div className="flex flex-wrap gap-2">
          <a href="tel:988"
            className="inline-flex items-center min-h-11 py-2 px-3 rounded-lg bg-[var(--color-danger)] hover:opacity-90 text-[var(--color-on-danger)] text-sm font-medium transition-colors">
            Call 988 (Suicide & Crisis Lifeline)
          </a>
          <a href="sms:741741?body=HELLO"
            className="inline-flex items-center min-h-11 py-2 px-3 rounded-lg border border-[var(--color-q-hu-border)] text-[var(--color-q-hu-text)] text-sm font-medium transition-colors">
            Text HOME to 741741
          </a>
        </div>
        <OutsideUs compact />
      </section>
    );
  }
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
      <OutsideUs compact={false} />
    </section>
  );
}
