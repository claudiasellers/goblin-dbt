import { quickExit } from '../../lib/quickExit';

/**
 * The Quick exit button (src/lib/quickExit.ts): fixed to the top corner of the screen on every step of a skill that
 * declares `quickExit`, above the page's own header, so it is one tap from anywhere on the page. Plain words, no
 * icon that could read as anything else. Above every overlay, including the too-much overlay (`TooMuchLink`,
 * `z-50`), so the way out is never covered.
 */
export function QuickExit() {
  return (
    <button
      type="button"
      onClick={() => quickExit()}
      data-testid="quick-exit"
      className="fixed z-[60] right-3 top-[max(0.75rem,env(safe-area-inset-top))] min-h-11 px-4 rounded-full text-sm font-medium bg-[var(--color-bg-elevated)] text-[var(--color-text-primary)] border border-[var(--color-border)] hover:border-[var(--color-border-accent)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]"
    >
      Quick exit
    </button>
  );
}
