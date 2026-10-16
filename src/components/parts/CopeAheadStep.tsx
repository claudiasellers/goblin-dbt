import { useState } from 'react';
import type { PartsContent } from '../../data/partsContentTypes';
import type { ProfileSlices } from '../../data/profileTypes';
import { setPartAnchor } from '../../services/parts';
import {
  anchorLead, COPE_OWN_MAX, copeChips, ownAnchor, partChipLabel, setAnchorLine, type KeptLine,
} from '../../lib/copeAhead';
import { promptCopy } from '../../lib/partsContent';
import { PartFigure } from './PartFigure';

const chip = 'min-h-11 px-3 py-2 rounded-full border transition-colors disabled:opacity-50';
const chipOff = 'border-[var(--color-border)] text-[var(--color-text-secondary)] hover:border-[var(--color-border-accent)] hover:text-[var(--color-text-primary)]';
const chipOn = 'bg-[var(--color-accent-fill)] text-[var(--color-on-accent)] border-transparent';

/**
 * DEAR MAN's cope ahead (docs/design/parts.md, the DEAR MAN row): "Who might show up in this
 * conversation?" Up to four kept parts, then Not sure and Skip; one pick. A part with an anchor shows
 * it ("If {name} shows up:" with the anchor under it, in the serif) and Change it. Without one: "What
 * would help if {name} shows up?", their kept lines (at most four, newest first) and In my words, then
 * Save (setPartAnchor). Not sure / Skip go on and write nothing. Every word is signed-off parts content
 * or the person's own; the host renders this only when `showCopeAhead` says so. A failed save keeps the
 * form, answerable (as the check-back card does).
 */
export function CopeAheadStep({ content, parts, anchors, lines, picked, onPick, onAnchor, onGoOn }: {
  content: PartsContent;
  /** The part chips (copeParts: slice order, at most four). */
  parts: ProfileSlices['parts'];
  /** Part id → anchor text (the slice, with this visit's saves over it). */
  anchors: Readonly<Record<string, string>>;
  /** keptLines(): at most four, newest first. */
  lines: KeptLine[];
  picked: string | null;
  onPick: (partId: string | null) => void;
  /** A saved anchor: its text, and the new profile version (the cache key). */
  onAnchor: (partId: string, text: string, version: number) => void;
  /** Not sure / Skip: on to the script. */
  onGoOn: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [lineId, setLineId] = useState<string | null>(null);
  const [ownOpen, setOwnOpen] = useState(false);
  const [ownText, setOwnText] = useState('');
  const [saving, setSaving] = useState(false);

  const title = promptCopy(content, 'cope_title') ?? '';
  const c = copeChips(content);
  const part = parts.find((p) => p.id === picked) ?? null;
  const anchor = part ? anchors[part.id] ?? null : null;
  const own = ownAnchor(ownText);
  const canSave = !saving && (lineId !== null || (ownOpen && own !== null));

  const clearForm = () => { setEditing(false); setLineId(null); setOwnOpen(false); setOwnText(''); };
  const pick = (id: string) => { clearForm(); onPick(id); };
  const goOn = () => { clearForm(); onPick(null); onGoOn(); };

  const save = async () => {
    if (!part || !canSave) return;
    const line = lineId ? lines.find((l) => l.lineId === lineId) ?? null : null;
    const text = line ? line.text : own;
    if (!text) return;
    setSaving(true);
    try {
      const res = await setPartAnchor(line ? { partId: part.id, lineId: line.lineId } : { partId: part.id, own: text });
      onAnchor(part.id, text, res.version);
      clearForm();
    } catch {
      // Not saved: the form stays, answerable.
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-5" data-testid="cope-ahead">
      <h3 className="text-lg font-semibold text-[var(--color-text-primary)]">{title}</h3>
      <div className="flex flex-wrap gap-2" role="group" aria-label={title}>
        {parts.map((p) => {
          const label = partChipLabel(content, p);
          const on = p.id === picked;
          return (
            <button key={p.id} type="button" aria-pressed={on} onClick={() => pick(p.id)}
              className={`${chip} ${on ? chipOn : chipOff} inline-flex items-center gap-2 pl-1.5`}>
              <PartFigure shapeSig={p.shapeSig} size={28} />
              <span className={label.named ? 'font-serif text-base' : 'text-sm'}>{label.text}</span>
            </button>
          );
        })}
        {c.cope_not_sure && (
          <button type="button" onClick={goOn} className={`${chip} ${chipOff} text-sm`}>{c.cope_not_sure.label}</button>
        )}
        {c.cope_skip && (
          <button type="button" onClick={goOn} className={`${chip} ${chipOff} text-sm`}>{c.cope_skip.label}</button>
        )}
      </div>

      {part && anchor && !editing && (
        <div className="p-4 rounded-xl border border-[var(--color-border-subtle)] bg-[var(--color-bg-elevated)]" data-testid="cope-anchor">
          <p className="text-sm text-[var(--color-text-secondary)]">{anchorLead(content, part.name)}</p>
          <p className="mt-1 font-serif text-lg text-[var(--color-text-primary)] break-words">{anchor}</p>
          {c.cope_change && (
            <button type="button" onClick={() => setEditing(true)}
              className="mt-2 min-h-11 text-sm text-[var(--color-text-secondary)] underline underline-offset-2 hover:text-[var(--color-text-primary)]">
              {c.cope_change.label}
            </button>
          )}
        </div>
      )}

      {part && (!anchor || editing) && (
        <div className="space-y-3" data-testid="cope-set-anchor">
          <p className="font-medium text-[var(--color-text-primary)]">{setAnchorLine(content, part.name)}</p>
          {lines.length > 0 && (
            <div className="flex flex-col gap-2">
              {lines.map((l) => {
                const on = l.lineId === lineId;
                return (
                  <button key={l.lineId} type="button" aria-pressed={on}
                    onClick={() => { setLineId(on ? null : l.lineId); setOwnOpen(false); }}
                    className={`min-h-11 w-full text-left px-4 py-3 rounded-xl border font-serif break-words transition-colors ${on ? chipOn : chipOff}`}>
                    {l.text}
                  </button>
                );
              })}
            </div>
          )}
          {c.cope_own && (
            ownOpen ? (
              <input type="text" value={ownText} maxLength={COPE_OWN_MAX} aria-label={c.cope_own.label} autoFocus
                onChange={(e) => setOwnText(e.target.value)}
                className="w-full p-3 rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-input)] font-serif text-[var(--color-text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]" />
            ) : (
              <button type="button" onClick={() => { setOwnOpen(true); setLineId(null); }} className={`${chip} ${chipOff} text-sm`}>
                {c.cope_own.label}
              </button>
            )
          )}
          {c.cope_save && (
            <button type="button" disabled={!canSave} onClick={() => void save()}
              className="w-full min-h-11 py-3 px-4 rounded-lg bg-[var(--color-accent-fill)] text-[var(--color-on-accent)] font-medium lift-primary disabled:opacity-50">
              {c.cope_save.label}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
