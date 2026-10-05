import { useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useToday } from '../../hooks/useToday';
import { useTodayCount } from '../../hooks/useTodayCount';
import { TodayStack } from './TodayStack';

/**
 * Today below lg (no side panel there): a quiet button in the header that opens the stack in a
 * sheet (bottom sheet on a phone, centred on a tablet). Nothing renders when Today is empty or
 * hidden (a check-in in progress). A flooded band drops the count, so the button doesn't press.
 *
 * The sheet is open only for the path it was opened on, so a deep link (Open, OA's card) closes it,
 * and it closes itself once the last card is answered.
 */
export function TodayButton() {
  const today = useToday();
  const count = useTodayCount();
  const { pathname } = useLocation();
  const [openedAt, setOpenedAt] = useState<string | null>(null);
  const dialog = useRef<HTMLDialogElement>(null);

  const show = !today.hidden && count > 0;
  const open = show && openedAt === pathname;

  useEffect(() => {
    const d = dialog.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);

  if (!show) return null;

  const label = today.holding ? 'Today' : `Today, ${count} to look at`;
  return (
    <>
      <button
        type="button"
        onClick={() => setOpenedAt(pathname)}
        aria-haspopup="dialog"
        aria-label={label}
        className="lg:hidden inline-flex items-center gap-2 min-h-11 pl-3.5 pr-2 rounded-full border border-[var(--color-border)] bg-[var(--color-bg-card)] text-sm font-medium text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:border-[var(--color-border-accent)] transition-colors"
      >
        <span>Today</span>
        {today.holding ? (
          <span aria-hidden="true" className="w-1.5 h-1.5 mr-1.5 rounded-full bg-[var(--color-text-tertiary)]" />
        ) : (
          <span aria-hidden="true" className="min-w-6 h-6 px-1.5 rounded-full bg-[var(--color-accent-fill)] text-[var(--color-on-accent)] text-xs font-semibold flex items-center justify-center">
            {count}
          </span>
        )}
      </button>

      <dialog
        ref={dialog}
        aria-labelledby="today-sheet-heading"
        onClose={() => setOpenedAt(null)}
        onClick={(e) => { if (e.target === e.currentTarget) setOpenedAt(null); }}
        className="lg:hidden m-0 mt-auto md:m-auto w-full max-w-none md:max-w-md max-h-[85dvh] p-0 bg-transparent text-[var(--color-text-primary)] backdrop:bg-black/40"
      >
        <div className="rounded-t-2xl md:rounded-2xl bg-[var(--color-bg-primary)] border border-[var(--color-border-subtle)] px-4 pt-2 pb-[calc(1rem_+_env(safe-area-inset-bottom))] md:pb-4">
          <div className="flex items-center justify-between mb-2">
            <h2 id="today-sheet-heading" className="font-sans-heading text-base font-semibold">Today</h2>
            <button
              type="button"
              onClick={() => setOpenedAt(null)}
              aria-label="Close"
              className="min-h-11 min-w-11 -mr-2 rounded-full text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
            >
              <span aria-hidden="true">✕</span>
            </button>
          </div>
          {open && <TodayStack />}
        </div>
      </dialog>
    </>
  );
}
