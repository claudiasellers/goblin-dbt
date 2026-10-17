import { useEffect, useState } from 'react';
import { useUserProfile } from '../../contexts/UserProfileContext';
import { getPartsContent } from '../../services/partsContent';
import { getToolById } from '../../data/tools';
import type { PartsContent } from '../../data/partsContentTypes';
import type { PartReflect } from '../../data/partsTypes';
import { hasStatLine, monthName, partStatLines, reflectPartsReady } from '../../lib/partStats';
import { partChipLabel } from '../../lib/partTag';
import { PartFigure } from '../parts/PartFigure';

const toolName = (id: string) => getToolById(id)?.name ?? null;
const month = (m: string) => monthName(m);

/**
 * Reflect's parts section (docs/design/parts.md, the integration readout): after Reflect's own
 * sections, one quiet block per part the person knows that has a line past its threshold (the server
 * decides: functions/src/parts/stats.ts). Words only from the shipped parts copy, the part's own name
 * as they kept it, tool names from src/data/tools.ts. No numbers but the counts the copy carries, no
 * part count, no chart. Parts off, no part with a line, or any line not shipped: nothing at all.
 */
export function PartsReflect({ parts, delay = 0 }: { parts: PartReflect[]; delay?: number }) {
  const partsOn = useUserProfile().profile.partsEnabled;
  const [content, setContent] = useState<PartsContent | null>(null);
  const wanted = partsOn && parts.length > 0;
  useEffect(() => {
    if (!wanted || content) return;
    let live = true;
    getPartsContent().then((c) => { if (live) setContent(c); }).catch(() => { /* no section */ });
    return () => { live = false; };
  }, [wanted, content]);

  if (!wanted || !content || !reflectPartsReady(content)) return null;
  const blocks = parts
    .map((p) => ({ p, lines: partStatLines(p.stats, content, { toolName, monthName: month }) }))
    .filter((b) => hasStatLine(b.lines));
  if (blocks.length === 0) return null;
  const title = content.prompts.reflect_title.copy;

  return (
    <section
      aria-label={title}
      className="rounded-xl bg-[var(--color-bg-card)] border border-[var(--color-border-subtle)] p-6"
      style={{ animation: `fadeIn 0.5s var(--ease-default) ${delay}s both` }}
    >
      <h3 className="text-xs font-semibold uppercase tracking-wider text-[var(--color-text-tertiary)] mb-4">{title}</h3>
      <ul className="divide-y divide-[var(--color-border-subtle)]">
        {blocks.map(({ p, lines }) => (
          <li key={p.id} className="flex items-start gap-3 py-4 first:pt-0 last:pb-0">
            <PartFigure shapeSig={p.shapeSig} size={44} className="flex-shrink-0" />
            <div className="min-w-0 flex-1 space-y-2">
              <p className={p.name?.trim() ? 'font-serif text-lg text-[var(--color-text-primary)]' : 'text-sm text-[var(--color-text-primary)]'}>
                {partChipLabel(p, content)}
              </p>
              {lines.when && <p className="text-sm text-[var(--color-text-secondary)]">{lines.when}</p>}
              {lines.helped && (
                <div>
                  <p className="text-xs text-[var(--color-text-tertiary)]">{lines.helped.title}</p>
                  <ul className="mt-0.5 space-y-0.5">
                    {lines.helped.lines.map((l) => <li key={l} className="text-sm text-[var(--color-text-secondary)]">{l}</li>)}
                  </ul>
                </div>
              )}
              {lines.steps && <p className="text-sm text-[var(--color-text-secondary)] break-words">{lines.steps}</p>}
              {lines.felt && (
                <div>
                  <p className="text-xs text-[var(--color-text-tertiary)]">{lines.felt.title}</p>
                  <p className="mt-0.5 text-sm text-[var(--color-text-secondary)]">{lines.felt.line}</p>
                </div>
              )}
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
