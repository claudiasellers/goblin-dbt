import { useEffect, useState } from 'react';
import { useProfileContext } from '../../hooks/useProfileContext';
import { getSkillsContent } from '../../services/skills';
import type { SkillDef } from '../../data/skillTypes';
import type { ActedOnUrge } from '../../data/spineTypes';
import { ACTED, LAPSE_SLOT_TOOLS, lapseSlotFor } from '../../lib/lapseSlot';

type SlotTool = (typeof LAPSE_SLOT_TOOLS)[number];

/**
 * The lapse plan after an acted *yes* (DT-09 part 2): under an urge tool's saved close, when the person acted on the
 * pull and kept a habit plan for the same behaviour, the plan they wrote for a slip (src/lib/lapseSlot.ts). Read-only,
 * nothing to tap: it's their own plan, said back once. The kept plans are read only once the close says they acted.
 */
export function LapsePlanSlot({ toolId, acted, urgeIds }: { toolId: string; acted: ActedOnUrge | null; urgeIds: readonly string[] }) {
  const wants = (LAPSE_SLOT_TOOLS as readonly string[]).includes(toolId) && !!acted && ACTED.includes(acted) && urgeIds.length > 0;
  const profile = useProfileContext((wants ? toolId : 'pause') as SlotTool, { enabled: wants });
  const [habit, setHabit] = useState<SkillDef | null>(null);
  useEffect(() => {
    if (!wants) return;
    let live = true;
    getSkillsContent().then((c) => { if (live) setHabit(c.skills.find((s) => s.id === 'habit_plan') ?? null); }).catch(() => { /* optional */ });
    return () => { live = false; };
  }, [wants]);
  if (!wants || profile.status !== 'ready' || !habit) return null;
  const slot = lapseSlotFor(toolId, acted, urgeIds, profile.slices?.abstinencePlans, habit);
  if (!slot) return null;
  return (
    <section aria-label={slot.title} className="mt-4 p-4 rounded-xl bg-[var(--color-bg-elevated)] border border-[var(--color-border-subtle)]">
      <p className="text-sm font-medium text-[var(--color-text-primary)]">{slot.title}</p>
      <ul className="mt-2 space-y-1 list-disc pl-5 text-sm text-[var(--color-text-secondary)]">
        {slot.items.map((t) => <li key={t}>{t}</li>)}
      </ul>
      {slot.afterUse && (
        <div className="mt-3 text-sm text-[var(--color-text-secondary)]">
          <p className="font-medium text-[var(--color-text-primary)]">{slot.afterUse.title}</p>
          <p className="mt-1">{slot.afterUse.hint}</p>
        </div>
      )}
    </section>
  );
}
