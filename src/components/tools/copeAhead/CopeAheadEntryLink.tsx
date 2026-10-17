import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { copeAheadLink, type CopeAheadEntryInput, type CopeEntryKey } from '../../../lib/copeAheadEntry';
import { getCopeAheadContent } from '../../../services/copeAhead';

/**
 * A quiet way into Cope Ahead from another tool's screen (docs/design/cope-ahead.md, *Where it starts*):
 * DEAR MAN's summary (`entry_dear_man`, *Rehearse it*) and Today's *Rehearse the next time* card
 * (`entry_recover`, *Walk through it with Cope Ahead*). The label is cope-ahead.json's line, loaded with
 * the content's own chunk; until it is there (or if it never ships) nothing shows. The href is
 * src/lib/copeAheadEntry.ts `copeAheadLink`.
 */
export function CopeAheadEntryLink({ copyKey, className, ...entry }: CopeAheadEntryInput & { copyKey: CopeEntryKey; className?: string }) {
  const [label, setLabel] = useState<string | null>(null);
  useEffect(() => {
    let live = true;
    getCopeAheadContent().then((c) => { if (live) setLabel(c.copy[copyKey]?.trim() || null); }).catch(() => { /* no link */ });
    return () => { live = false; };
  }, [copyKey]);
  if (!label) return null;
  return (
    <Link to={copeAheadLink(entry)} data-cope-entry={copyKey}
      className={className ?? 'flex items-center justify-center w-full min-h-11 text-sm text-[var(--color-text-tertiary)] hover:text-[var(--color-text-secondary)] transition-colors'}>
      {label}
    </Link>
  );
}
