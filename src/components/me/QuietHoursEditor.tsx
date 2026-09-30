import { useState } from 'react';
import type { QuietHours } from '../../data/profileTypes';

/** Quiet hours (My body): no reminders between start and end. HH:MM, 24 h. None until set (D-10). */
export function QuietHoursEditor({ value, onSave, onCancel }: {
  value: QuietHours | null;
  onSave: (v: QuietHours) => Promise<void>;
  onCancel?: () => void;
}) {
  const [start, setStart] = useState(value?.start ?? '22:00');
  const [end, setEnd] = useState(value?.end ?? '07:00');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const save = async () => {
    if (start === end) { setError('Pick a start and an end that differ.'); return; }
    setSaving(true);
    setError(null);
    try { await onSave({ start, end }); } catch { setError("Couldn't save. Try again?"); } finally { setSaving(false); }
  };
  return (
    <div className="mt-2 space-y-3">
      <div className="flex flex-wrap items-end gap-3">
        <label className="text-xs text-[var(--color-text-tertiary)]">
          From
          <input type="time" value={start} onChange={(e) => setStart(e.target.value)}
            className="block mt-1 min-h-11 px-3 rounded-lg bg-[var(--color-bg-elevated)] border border-[var(--color-border)] text-sm text-[var(--color-text-primary)]" />
        </label>
        <label className="text-xs text-[var(--color-text-tertiary)]">
          To
          <input type="time" value={end} onChange={(e) => setEnd(e.target.value)}
            className="block mt-1 min-h-11 px-3 rounded-lg bg-[var(--color-bg-elevated)] border border-[var(--color-border)] text-sm text-[var(--color-text-primary)]" />
        </label>
      </div>
      {error && <p role="alert" className="text-sm text-[var(--color-danger)]">{error}</p>}
      <div className="flex gap-2">
        <button type="button" disabled={saving} onClick={save}
          className="min-h-11 px-4 rounded-lg bg-[var(--color-accent-fill)] text-[var(--color-on-accent)] text-sm font-medium lift-primary disabled:opacity-50">
          {saving ? 'Saving…' : 'Save'}
        </button>
        {onCancel && (
          <button type="button" onClick={onCancel}
            className="min-h-11 px-4 rounded-lg border border-[var(--color-border)] text-sm text-[var(--color-text-secondary)]">
            Cancel
          </button>
        )}
      </div>
    </div>
  );
}
