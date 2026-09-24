/** Shared Tailwind class strings for the Opposite Action flow (presentation only). */
export const choiceButton =
  "min-h-12 w-full p-3 rounded-xl border border-[var(--color-border)] text-left text-[var(--color-text-primary)] lift-secondary disabled:opacity-50";
/** Selected: filled accent background (not just a border) so the choice is unmistakable. */
export const choiceSelected =
  "!border-[var(--color-accent)] !bg-[var(--color-accent-fill)] !text-[var(--color-on-accent)] ring-2 ring-[var(--color-accent)]";
export const primaryButton =
  "min-h-12 w-full p-3 rounded-xl bg-[var(--color-accent-fill)] text-[var(--color-on-accent)] font-medium lift-primary disabled:opacity-50";
export const inputField =
  "w-full p-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-input)] text-[var(--color-text-primary)] focus:ring-2 focus:ring-[var(--color-accent)]";
export const linkButton =
  "min-h-11 px-2 text-sm underline underline-offset-4 text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] disabled:opacity-50";
export const secondaryText = "text-sm text-[var(--color-text-secondary)]";
/** Subtle enter animation; Tailwind's motion-safe variant skips it for reduced motion. */
export const enterAnimation = "motion-safe:animate-[stepEnter_300ms_ease-out]";
