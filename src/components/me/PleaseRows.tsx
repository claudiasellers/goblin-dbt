import { useEffect, useState } from 'react';
import type { SkillDef } from '../../data/skillTypes';
import { PLEASE_HIDEABLE_ROWS, pleaseRowNames, pleaseRowsOf } from '../../lib/pleaseRows';
import { getSkillsContent, peekSkillsContent } from '../../services/skills';

/** Running low's own skill (its copy names the rows): every word on these screens is graph copy. */
function usePleaseSkill(): SkillDef | null {
  const [skill, setSkill] = useState<SkillDef | null>(() => peekSkillsContent()?.skills.find((s) => s.id === 'please_skill') ?? null);
  useEffect(() => {
    if (skill) return;
    let live = true;
    getSkillsContent().then((c) => { if (live) setSkill(c.skills.find((s) => s.id === 'please_skill') ?? null); }).catch(() => {});
    return () => { live = false; };
  }, [skill]);
  return skill;
}

/**
 * The rows Running low leaves out, in Me → My body (ER-07, kind `please_rows`, docs/design/running-low.md): named from
 * the skill's copy. Renders nothing until the skill loads.
 */
export function KeptPleaseRows({ value }: { value: unknown }) {
  const skill = usePleaseSkill();
  if (!skill) return null;
  const names = pleaseRowNames(skill.copy);
  const hidden = pleaseRowsOf(value);
  return (
    <p className="text-sm text-[var(--color-text-secondary)]" data-kept-please-rows="">
      {hidden.length ? hidden.map((r) => names[r]).join(', ') : skill.copy.me_rows_none}
    </p>
  );
}

/** No rows left out yet (or the setting set aside): a quiet link in My body that opens the editor. */
export function PleaseRowsNew({ onSave }: { onSave: (hidden: string[]) => Promise<void> }) {
  const skill = usePleaseSkill();
  const [open, setOpen] = useState(false);
  if (!skill) return null;
  return open ? <PleaseRowsEditor value={null} onSave={onSave} onCancel={() => setOpen(false)} /> : (
    <button type="button" onClick={() => setOpen(true)}
      className="block min-h-11 text-sm text-[var(--color-text-secondary)] underline underline-offset-2">
      {skill.copy.me_rows_set}
    </button>
  );
}

/**
 * Choosing the rows (the tap on Save is the person's yes): food, body, alcohol or drugs, moving, each a toggle.
 * Sleep is never offered: it is the opening screen, and like every row it can be skipped there.
 */
export function PleaseRowsEditor({ value, onSave, onCancel }: {
  value: unknown;
  onSave: (hidden: string[]) => Promise<void>;
  onCancel: () => void;
}) {
  const skill = usePleaseSkill();
  const [hidden, setHidden] = useState<string[]>(() => pleaseRowsOf(value));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(false);
  if (!skill) return null;
  const names = pleaseRowNames(skill.copy);
  const toggle = (r: string) => setHidden((h) => (h.includes(r) ? h.filter((x) => x !== r) : [...h, r]));
  const save = async () => {
    setSaving(true);
    setError(false);
    // In the rows' own order, so the same choice is always stored the same way.
    try { await onSave(PLEASE_HIDEABLE_ROWS.filter((r) => hidden.includes(r))); } catch { setError(true); } finally { setSaving(false); }
  };
  return (
    <div className="mt-2 space-y-3" data-please-rows-editor="">
      <p className="text-sm text-[var(--color-text-secondary)]">{skill.copy.me_rows_hint}</p>
      <div className="flex flex-wrap gap-2">
        {PLEASE_HIDEABLE_ROWS.map((r) => (
          <button key={r} type="button" aria-pressed={hidden.includes(r)} onClick={() => toggle(r)}
            className={`min-h-11 px-4 rounded-full border text-sm ${hidden.includes(r)
              ? 'border-[var(--color-border-accent)] bg-[var(--color-bg-elevated)] text-[var(--color-text-primary)] font-medium'
              : 'border-[var(--color-border)] text-[var(--color-text-secondary)]'}`}>
            {names[r]}
          </button>
        ))}
      </div>
      {error && <p role="alert" className="text-sm text-[var(--color-danger)]">Couldn't save. Try again?</p>}
      <div className="flex gap-2">
        <button type="button" disabled={saving} onClick={save}
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
