import { useEffect, useState } from 'react';
import type { HandoffResult } from '../../data/capacityTypes';
import { useBand } from '../../hooks/useBand';
import { BreakdownHandoff, type HandoffResumeDraft, type LaterChip } from './BreakdownHandoff';

/**
 * A quiet "This is too much right now" (ER-01). Opens P2 at any band as an overlay, so the host's
 * state stays mounted underneath and the user comes back to the same step.
 */
export function TooMuchLink({ host, blank, resume, onResult, onScheduleLater, className }: {
  host: string;
  blank?: boolean;
  /** The host's step + draft at the moment the link is tapped (for "come back to this later"). */
  resume?: () => HandoffResumeDraft | undefined;
  onResult?: (r: HandoffResult) => void;
  onScheduleLater?: (chip: LaterChip) => Promise<string | null>;
  className?: string;
}) {
  const band = useBand();
  const [open, setOpen] = useState<{ draft?: HandoffResumeDraft } | null>(null);
  useEffect(() => { if (open) band.load(); }, [open, band]);
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(null); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  const label = band.content?.handoff.tooMuchLink ?? 'This is too much right now';
  return (
    <>
      <button type="button" data-testid="too-much-link" onClick={() => setOpen({ draft: resume?.() })}
        className={className ?? 'min-h-11 px-2 text-sm text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)] transition-colors'}>
        {label}
      </button>
      {open && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-[var(--color-bg-primary)]" role="dialog" aria-modal="true" aria-label={label}>
          <div className="max-w-md mx-auto px-4 py-6 space-y-4">
            <div className="flex justify-end">
              <button type="button" onClick={() => setOpen(null)} aria-label="Close"
                className="min-h-11 min-w-11 rounded-full text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]">
                <span aria-hidden="true">✕</span>
              </button>
            </div>
            <BreakdownHandoff host={host} band={band.current()?.value ?? 'stirred'} blank={blank} resume={open.draft}
              onScheduleLater={onScheduleLater}
              onResume={(r) => { setOpen(null); onResult?.(r); }}
              onLater={(r) => { onResult?.(r); }} />
          </div>
        </div>
      )}
    </>
  );
}
