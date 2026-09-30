import { useState } from 'react';
import type { ProfileItemMeta } from '../../data/profileTypes';

/**
 * "Still true?" for a profile item (PR-P2). `ask` (past its revisit date): yes · not any more ·
 * change. `quiet` (fresh): a small "change" link. "Not any more" sets the item aside; it is never
 * deleted silently and can be restored from Me.
 */
export function StillTrue({ meta, question, onYes, onNotAnyMore, onChange }: {
  meta: ProfileItemMeta;
  question: string;
  onYes: () => Promise<void>;
  onNotAnyMore: () => Promise<void>;
  onChange?: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const run = async (fn: () => Promise<void>) => {
    setBusy(true);
    try { await fn(); } catch { /* unchanged; Me reloads on the next visit */ } finally { setBusy(false); }
  };
  if (meta.status !== 'active') return null;
  if (meta.prompt === 'ask') {
    return (
      <div className="mt-2 p-3 rounded-lg bg-[var(--color-bg-elevated)] border border-[var(--color-border-subtle)]">
        <p className="text-sm text-[var(--color-text-primary)] mb-2">{question || 'Still true?'}</p>
        <div className="flex flex-wrap gap-2">
          <button type="button" disabled={busy} onClick={() => run(onYes)}
            className="min-h-11 px-3 rounded-lg border border-[var(--color-border)] text-sm text-[var(--color-text-secondary)] hover:border-[var(--color-border-accent)] disabled:opacity-50">
            Yes
          </button>
          <button type="button" disabled={busy} onClick={() => run(onNotAnyMore)}
            className="min-h-11 px-3 rounded-lg border border-[var(--color-border)] text-sm text-[var(--color-text-secondary)] hover:border-[var(--color-border-accent)] disabled:opacity-50">
            Not any more
          </button>
          {onChange && (
            <button type="button" disabled={busy} onClick={onChange}
              className="min-h-11 px-3 rounded-lg border border-[var(--color-border)] text-sm text-[var(--color-text-secondary)] hover:border-[var(--color-border-accent)] disabled:opacity-50">
              Change
            </button>
          )}
        </div>
      </div>
    );
  }
  return onChange ? (
    <button type="button" onClick={onChange}
      className="min-h-11 text-sm text-[var(--color-text-tertiary)] underline underline-offset-2 hover:text-[var(--color-text-secondary)]">
      Change
    </button>
  ) : null;
}
