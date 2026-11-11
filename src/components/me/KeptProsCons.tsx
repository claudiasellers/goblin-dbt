import { useEffect, useState } from 'react';
import type { SkillDef } from '../../data/skillTypes';
import { keptLines, keptPull, type KeptCard } from '../../lib/prosConsCard';
import { getSkillsContent, peekSkillsContent } from '../../services/skills';

/**
 * A kept pros & cons card in Me (docs/design/pros-cons.md): which pull it's for and its reasons not to, named
 * through the card's own skill, so two cards can be told apart and an own-words card (which Hold to wait can't
 * match) can still be read. No pro line here: Me is a list, not the card. Renders nothing until the skill loads.
 */
export function KeptProsCons({ value }: { value: Record<string, unknown> }) {
  const [skill, setSkill] = useState<SkillDef | null>(() => peekSkillsContent()?.skills.find((s) => s.id === 'pros_cons') ?? null);
  useEffect(() => {
    if (skill) return;
    let live = true;
    getSkillsContent().then((c) => { if (live) setSkill(c.skills.find((s) => s.id === 'pros_cons') ?? null); }).catch(() => {});
    return () => { live = false; };
  }, [skill]);
  if (!skill) return null;
  const card = { id: '', ...value } as KeptCard;
  const pull = keptPull(card, skill);
  const { reasons } = keptLines(card, skill, '');
  return (
    <div className="text-sm text-[var(--color-text-secondary)]" data-kept-pros-cons="">
      {pull && <p>{pull}</p>}
      {reasons.map((r, i) => <p key={i} className="font-serif text-[var(--color-text-primary)]">{r}</p>)}
    </div>
  );
}
