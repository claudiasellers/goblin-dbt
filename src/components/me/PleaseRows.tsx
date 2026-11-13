import { useEffect, useId, useRef, useState } from 'react';
import { PLEASE_HIDEABLE_ROWS, PLEASE_ROWS_COPY as C, pleaseRowsOf, type PleaseRow } from '../../lib/pleaseRows';

/** The rows Running low leaves out, in Me → My body (ER-07, kind `please_rows`, docs/design/running-low.md). */
export function KeptPleaseRows({ value }: { value: unknown }) {
  const hidden = pleaseRowsOf(value);
  return (
    <p className="text-sm text-[var(--color-text-secondary)]" data-kept-please-rows="">
      {hidden.length ? hidden.map((r) => C.names[r]).join(', ') : C.none}
    </p>
  );
}

/** Nothing set yet: a quiet link in My body that opens the editor. */
export function PleaseRowsNew({ onSave }: { onSave: (hidden: string[]) => Promise<void> }) {
  const [open, setOpen] = useState(false);
  const link = useRef<HTMLButtonElement>(null);
  const close = () => { setOpen(false); requestAnimationFrame(() => link.current?.focus()); };
  return open ? <PleaseRowsEditor value={null} fresh onSave={onSave} onCancel={close} /> : (
    <button ref={link} type="button" onClick={() => setOpen(true)}
      className="block min-h-11 text-sm text-[var(--color-text-secondary)] underline underline-offset-2">
      {C.set}
    </button>
  );
}

/**
 * Choosing the rows (the tap on Save is the person's yes): food, body, alcohol or drugs, moving, each a toggle; a
 * picked row is left out. Sleep is never offered: it is the opening screen, and like every row it can be skipped there.
 * `fresh` (nothing kept yet): Save waits for a pick, so an empty setting is never kept.
 */
export function PleaseRowsEditor({ value, fresh = false, onSave, onCancel }: {
  value: unknown;
  fresh?: boolean;
  onSave: (hidden: string[]) => Promise<void>;
  onCancel: () => void;
}) {
  const id = useId();
  const hint = useRef<HTMLParagraphElement>(null);
  const [hidden, setHidden] = useState<PleaseRow[]>(() => pleaseRowsOf(value));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(false);
  // Opened from a link that unmounts: focus goes to what the editor asks, never to <body>.
  useEffect(() => { hint.current?.focus(); }, []);
  const toggle = (r: PleaseRow) => setHidden((h) => (h.includes(r) ? h.filter((x) => x !== r) : [...h, r]));
  const save = async () => {
    setSaving(true);
    setError(false);
    // In the rows' own order, so the same choice is always stored the same way.
    try { await onSave(PLEASE_HIDEABLE_ROWS.filter((r) => hidden.includes(r))); } catch { setError(true); } finally { setSaving(false); }
  };
  return (
    <div className="mt-2 space-y-3" data-please-rows-editor="">
      <p id={`${id}-hint`} ref={hint} tabIndex={-1} className="text-sm text-[var(--color-text-secondary)] outline-none">{C.hint}</p>
      <div role="group" aria-labelledby={`${id}-hint`} className="flex flex-wrap gap-2">
        {PLEASE_HIDEABLE_ROWS.map((r) => {
          const on = hidden.includes(r);
          return (
            <button key={r} type="button" aria-pressed={on} onClick={() => toggle(r)}
              className={`min-h-11 px-4 rounded-full border-2 text-sm ${on
                ? 'border-[var(--color-border-accent)] bg-[var(--color-bg-elevated)] text-[var(--color-text-primary)] font-medium'
                : 'border-[var(--color-border)] text-[var(--color-text-secondary)]'}`}>
              {on && <span aria-hidden="true">✓ </span>}{C.names[r]}
            </button>
          );
        })}
      </div>
      {hidden.includes('body') && <p className="text-sm text-[var(--color-text-secondary)]" aria-live="polite">{C.body}</p>}
      {error && <p role="alert" className="text-sm text-[var(--color-danger)]">Couldn't save. Try again?</p>}
      <div className="flex gap-2">
        <button type="button" disabled={saving || (fresh && hidden.length === 0)} onClick={save}
          className="min-h-11 px-4 rounded-lg bg-[var(--color-accent-fill)] text-[var(--color-on-accent)] text-sm font-medium lift-primary disabled:opacity-50">
          {saving ? 'Saving…' : 'Save'}
        </button>
        <button type="button" onClick={onCancel}
          className="min-h-11 px-4 rounded-lg border border-[var(--color-border)] text-sm text-[var(--color-text-secondary)]">
          Cancel
        </button>
      </div>
    </div>
  );
}
