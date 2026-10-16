import { useState } from 'react';
import { useProfileContext } from '../../hooks/useProfileContext';
import { queuePartCandidate, tagPart } from '../../services/parts';
import { newId } from '../../lib/spine/ids';
import { tagChips, tagRowCopy, type TagRowTool } from '../../lib/partTag';
import type { PartsContent } from '../../data/partsContentTypes';
import { PartFigure } from '../parts/PartFigure';

const chip = 'min-h-11 px-4 py-2 rounded-full border border-[var(--color-border)] text-[var(--color-text-primary)] hover:border-[var(--color-border-accent)] transition-colors';
const quiet = 'min-h-11 px-3 text-sm text-[var(--color-text-tertiary)] hover:text-[var(--color-text-secondary)]';

/**
 * "Was this a part you know?" (docs/design/parts.md, "the stronger signal"): one quiet, skippable row
 * under a better or much better close. SessionClose mounts it only once its gate holds (src/lib/partTag.ts
 * tagRowGate), so the person's parts are read (the host tool's `parts` slice) only then. No parts kept:
 * nothing. One tap and it folds away with nothing more said; every write is fire and forget, so it
 * never blocks or delays leaving the tool. Skip and "No thanks" write nothing.
 */
export function PartTagRow({ toolId, toolSessionId, content }: { toolId: TagRowTool; toolSessionId: string; content: PartsContent }) {
  const profile = useProfileContext(toolId);
  const [state, setState] = useState<'ask' | 'later' | 'gone'>('ask');
  if (state === 'gone' || !profile.slices) return null;
  const chips = tagChips(profile.slices.parts, content);
  if (chips.length === 0) return null;
  const copy = tagRowCopy(content);

  const tag = (partId: string) => {
    setState('gone');
    tagPart({ id: newId(), partId, toolSessionId }).catch(() => { /* a missed tag is only a missed signal */ });
  };
  const later = (yes: boolean) => {
    setState('gone');
    if (yes) queuePartCandidate({ id: newId(), origin: 'new_one', moveIds: [], toolSessionId }).catch(() => { /* as above */ });
  };

  if (state === 'later') {
    return (
      <section aria-label={copy.later} className="mt-4 space-y-3">
        <p className="text-sm text-[var(--color-text-secondary)]">{copy.later}</p>
        <div className="flex flex-wrap items-center gap-2">
          <button type="button" className={chip} onClick={() => later(true)}>{copy.yes}</button>
          <button type="button" className={quiet} onClick={() => later(false)}>{copy.no}</button>
        </div>
      </section>
    );
  }

  return (
    <section aria-label={copy.question} className="mt-4 space-y-3">
      <p className="text-sm text-[var(--color-text-secondary)]">{copy.question}</p>
      <div className="flex flex-wrap items-center gap-2">
        {chips.map((c) => (
          <button key={c.id} type="button" className={`${chip} inline-flex items-center gap-2 pl-2`} onClick={() => tag(c.id)}>
            <PartFigure shapeSig={c.shapeSig} size={28} />
            <span className={c.named ? 'font-serif text-base' : 'text-sm'}>{c.label}</span>
          </button>
        ))}
        <button type="button" className={chip} onClick={() => setState('later')}>
          <span className="text-sm">{copy.newOne}</span>
        </button>
        <button type="button" className={quiet} onClick={() => setState('gone')}>{copy.skip}</button>
      </div>
    </section>
  );
}
