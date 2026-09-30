import { useEffect, useRef, useState } from 'react';
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
  // Closing the overlay returns the user to the same step (the host stayed mounted): not a leave,
  // so P2 must not write the draft to the device. Navigating away with it open still does.
  const dismissed = useRef(false);
  const openP2 = () => { dismissed.current = false; setOpen({ draft: resume?.() }); };
  const close = () => { dismissed.current = true; setOpen(null); };
  useEffect(() => { if (open) band.load(); }, [open, band]);
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') close(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  const label = band.content?.handoff.tooMuchLink ?? 'This is too much right now';
  return (
    <>
      <button type="button" data-testid="too-much-link" onClick={openP2}
        className={className ?? 'min-h-11 px-2 text-sm text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)] transition-colors'}>
        {label}
      </button>
      {open && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-[var(--color-bg-primary)]" role="dialog" aria-modal="true" aria-label={label}>
          <div className="max-w-md mx-auto px-4 py-6 space-y-4">
            <div className="flex justify-end">
              <button type="button" onClick={close} aria-label="Close"
                className="min-h-11 min-w-11 rounded-full text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]">
                <span aria-hidden="true">✕</span>
              </button>
            </div>
            <BreakdownHandoff host={host} band={band.current()?.value ?? 'stirred'} blank={blank} resume={open.draft} dismissedRef={dismissed}
              onScheduleLater={onScheduleLater}
              onResume={(r) => { close(); onResult?.(r); }}
              onLater={(r) => { onResult?.(r); }} />
          </div>
        </div>
      )}
    </>
  );
}
