import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { checkFactsLink } from '../../lib/checkFactsEntry';
import { getSkillsContent } from '../../services/skills';

/**
 * A quiet way into Check the Facts from another tool (docs/design/check-the-facts.md, *Where it starts*):
 * Do the Opposite's fits step, under its detail, carrying the emotion. The label is the skill's own copy
 * (`entry_oa`), loaded with skills.json's chunk; until it is there (or if it never ships) nothing shows.
 */
export function CheckFactsEntryLink({ emotionId, copyKey = 'entry_oa' }: { emotionId?: string; copyKey?: string }) {
  const [label, setLabel] = useState<string | null>(null);
  useEffect(() => {
    let live = true;
    getSkillsContent()
      .then((c) => { if (live) setLabel(c.skills.find((s) => s.toolId === 'check-the-facts')?.copy[copyKey]?.trim() || null); })
      .catch(() => { /* no link */ });
    return () => { live = false; };
  }, [copyKey]);
  if (!label) return null;
  return (
    <Link to={checkFactsLink({ emotionId })} data-check-facts-entry={copyKey}
      className="flex items-center justify-center w-full min-h-11 text-sm text-[var(--color-text-tertiary)] hover:text-[var(--color-text-secondary)] transition-colors">
      {label}
    </Link>
  );
}
