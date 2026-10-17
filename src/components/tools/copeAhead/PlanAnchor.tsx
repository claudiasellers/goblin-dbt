import { useEffect, useRef, useState } from 'react';
import type { PartsContent } from '../../../data/partsContentTypes';
import type { ProfileSlices } from '../../../data/profileTypes';
import { setPartAnchor } from '../../../services/parts';
import { anchorLead, COPE_OWN_MAX, copeChips, ownAnchor, setAnchorLine, type KeptLine } from '../../../lib/copeAhead';
import { promptCopy } from '../../../lib/partsContent';
import { useStepFocus } from '../../parts/stepFocus';

const chip = 'min-h-11 px-3 py-2 rounded-full border transition-colors disabled:opacity-50';
const chipOff = 'border-[var(--color-border)] text-[var(--color-text-secondary)] hover:border-[var(--color-border-accent)] hover:text-[var(--color-text-primary)]';
const chipOn = 'bg-[var(--color-accent-fill)] text-[var(--color-on-accent)] border-transparent';

/**
 * Screen 4, parts on with a part chosen on screen 2 (docs/design/cope-ahead.md): the part's anchor under the
 * plan, "If {name} shows up:" with the anchor on its own line in the serif, and Change it. Without one, or
 * changing it: "What would help if {name} shows up?", their kept lines and In my words, then Save, through
 * DEAR MAN's setPartAnchor. Every word is DEAR MAN's signed-off cope copy (COPE_REQUIRED) or the person's
 * own; the page renders this only when the cope step's gate holds.
 */
export function PlanAnchor({ content, part, anchor, lines, onAnchor }: {
  content: PartsContent;
  part: ProfileSlices['parts'][number];
  anchor: string | null;
  lines: KeptLine[];
  onAnchor: (partId: string, text: string, version: number) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [lineId, setLineId] = useState<string | null>(null);
  const [ownOpen, setOwnOpen] = useState(false);
  const [ownText, setOwnText] = useState('');
  const [saving, setSaving] = useState(false);
  const [failed, setFailed] = useState(false);
  const panel = useRef<HTMLDivElement>(null);
  const ownRef = useRef<HTMLInputElement>(null);
  useEffect(() => { if (ownOpen) ownRef.current?.focus({ preventScroll: true }); }, [ownOpen]);
  const c = copeChips(content);
  const own = ownAnchor(ownText);
  const ready = lineId !== null || (ownOpen && own !== null);
  const view = anchor && !editing ? 'anchor' : 'set';
  useStepFocus(panel, view);

  const save = async () => {
    if (saving || !ready) return;
    const line = lineId ? lines.find((l) => l.lineId === lineId) ?? null : null;
    const text = line ? line.text : own;
    if (!text) return;
    setSaving(true);
    setFailed(false);
    try {
      const res = await setPartAnchor(line ? { partId: part.id, lineId: line.lineId } : { partId: part.id, own: text });
      onAnchor(part.id, text, res.version);
      setEditing(false); setLineId(null); setOwnOpen(false); setOwnText('');
    } catch {
      setFailed(true);
    } finally {
      setSaving(false);
    }
  };

  if (view === 'anchor') {
    return (
      <div ref={panel} tabIndex={-1} className="p-4 rounded-xl border border-[var(--color-border-subtle)] bg-[var(--color-bg-elevated)] focus:outline-none" data-testid="ca-anchor">
        <p className="text-sm text-[var(--color-text-secondary)]">{anchorLead(content, part.name)}</p>
        <p className="mt-1 font-serif text-lg text-[var(--color-text-primary)] break-words">{anchor}</p>
        {c.cope_change && (
          <button type="button" onClick={() => setEditing(true)}
            className="mt-2 min-h-11 text-sm text-[var(--color-text-secondary)] underline underline-offset-2 hover:text-[var(--color-text-primary)]">
            {c.cope_change.label}
          </button>
        )}
      </div>
    );
  }
  return (
    <div ref={panel} tabIndex={-1} className="space-y-3 focus:outline-none" data-testid="ca-set-anchor">
      <p className="font-medium text-[var(--color-text-primary)]">{setAnchorLine(content, part.name)}</p>
      {lines.length > 0 && (
        <div className="flex flex-col gap-2">
          {lines.map((l) => {
            const on = l.lineId === lineId;
            return (
              <button key={l.lineId} type="button" aria-pressed={on} onClick={() => { setLineId(on ? null : l.lineId); setOwnOpen(false); }}
                className={`min-h-11 w-full text-left px-4 py-3 rounded-xl border font-serif break-words transition-colors ${on ? chipOn : chipOff}`}>
                {l.text}
              </button>
            );
          })}
        </div>
      )}
      {c.cope_own && (ownOpen ? (
        <input type="text" value={ownText} maxLength={COPE_OWN_MAX} aria-label={c.cope_own.label}
          ref={ownRef}
          onChange={(e) => setOwnText(e.target.value)}
          className="w-full p-3 rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-input)] font-serif text-[var(--color-text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]" />
      ) : (
        <button type="button" onClick={() => { setOwnOpen(true); setLineId(null); }} className={`${chip} ${chipOff} text-sm`}>{c.cope_own.label}</button>
      ))}
      {c.cope_save && (
        <button type="button" disabled={!ready} aria-disabled={saving || undefined} onClick={() => void save()}
          className="w-full min-h-11 py-3 px-4 rounded-lg bg-[var(--color-accent-fill)] text-[var(--color-on-accent)] font-medium lift-primary disabled:opacity-50 aria-disabled:opacity-50">
          {c.cope_save.label}
        </button>
      )}
      <div role="status">
        {failed && <p className="text-sm text-[var(--color-text-secondary)]">{promptCopy(content, 'cope_save_failed')}</p>}
      </div>
    </div>
  );
}
