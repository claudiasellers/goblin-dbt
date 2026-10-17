/**
 * Cope Ahead's after card on Today (lane 4, cope-ahead-after; docs/design/cope-ahead.md, "Today,
 * afterwards"): the app's real CopeAheadAfterCard on src/data/content/cope-ahead.json (what ships, not the
 * parts fixture), with the item getToday would send (the visit's plan ids). Not a parts surface: the one
 * parts write, PartTag {source: 'cope_ahead'}, is the server's on "Used it, it helped" with parts on and a
 * part picked in the visit, so the parts branch lists it under the frame as the server would write it.
 * Kept in its own file so other lanes' blocks in ./surfaces.tsx and ../parts-review.tsx don't collide.
 */
import { useEffect, useRef, useState } from 'react';
import type { TodayItem, CopeAheadPlanIds } from '../../src/services/spine';
import { CopeAheadAfterCard } from '../../src/components/today/CopeAheadAfterCard';
import { afterCardCopy } from '../../src/lib/copeAheadAfter';
import type { CopeAheadContent } from '../../src/data/copeAheadTypes';
import ca from '../../src/data/content/cope-ahead.json';
import spine from '../../src/data/content/spine.json';
import { answers, logEvent } from './backend';
import { PART_IDS } from './data';
import type { Branch, Surface } from './surfaces';

const CONTENT = (ca as unknown as { content: CopeAheadContent }).content;
const TYPE = (spine as unknown as { content: { followUpTypes: Array<{ id: string; choices: TodayItem['choices']; copy: TodayItem['copy'] }> } })
  .content.followUpTypes.find((t) => t.id === 'cope_ahead_after');
const mockNote = 'text-[11px] uppercase tracking-wide text-[var(--color-text-tertiary)]';
const TOOL_SESSION = '00000000-0000-4000-8000-000000000a01';
/** The invented person's own words for the hard moment (the If's own-words slot). */
const OWN_MOMENT = 'Mum asks about work';

const plan = (o: Partial<CopeAheadPlanIds>): CopeAheadPlanIds => ({
  situationId: 'conversation', hardMomentId: 'go_blank', hardMomentOwn: null, ifFrom: 'moment', pullIds: [], moveIds: ['long_out', 'give_minute'], moveOwn: null, ...o,
});
/** Each branch's visit: what screen 1 to 4 stored in ext.ca, as getToday sends the ids. */
const PLANS: Record<string, CopeAheadPlanIds> = {
  own_situation: plan({ situationId: 'other' }),
  own_moment: plan({ situationId: 'someone', hardMomentId: null, hardMomentOwn: OWN_MOMENT, moveIds: ['step_out'] }),
  pull: plan({ situationId: 'place_event', ifFrom: 'pull', pullIds: ['blank'], moveIds: ['feet'] }),
  parts: plan({ situationId: 'work_school', hardMomentId: 'go_blank', moveIds: ['long_out'] }),
};
const planFor = (branch: string) => PLANS[branch] ?? plan({});

const A = CONTENT.after;
const BRANCHES: Branch[] = [
  { id: 'how', label: 'How did the conversation go? (a situation chosen)' },
  { id: 'two_moves', label: 'Better than I feared → Did your plan help? (two moves in the plan line)', steps: [{ tap: A.after_better }] },
  { id: 'helped', label: 'Better than I feared → Used it, it helped: one resolve, both answers', steps: [{ tap: A.after_better }, { tap: A.after_plan_helped }] },
  { id: 'unsure', label: 'About what I expected → Used it, not sure', steps: [{ tap: A.after_expected }, { tap: A.after_plan_unsure }] },
  { id: 'unused', label: 'Harder than I expected → Didn’t use it', steps: [{ tap: A.after_harder }, { tap: A.after_plan_unused }] },
  { id: 'skip', label: 'Harder than I expected → Skip (the first answer alone)', steps: [{ tap: A.after_harder }, { tap: A.after_skip }] },
  { id: 'not_yet', label: 'It hasn’t happened yet: back in 24 hours, nothing stored', steps: [{ tap: A.after_not_yet }] },
  { id: 'own_situation', label: 'A situation in their own words: “How did it go?” (their words never shown)' },
  { id: 'own_moment', label: 'A hard moment in their own words, one move', steps: [{ tap: A.after_expected }] },
  { id: 'pull', label: 'Plan for the pull (“If I start to shut down”)', steps: [{ tap: A.after_better }] },
  { id: 'parts', label: 'Parts on, a part picked in the visit: Used it, it helped tags the part (server)', steps: [{ tap: A.after_better }, { tap: A.after_plan_helped }] },
];

function Host({ branch }: { branch: string }) {
  const [gone, setGone] = useState(false);
  const next = useRef<HTMLParagraphElement>(null);
  useEffect(() => { if (gone) next.current?.focus({ preventScroll: true }); }, [gone]);
  const item: TodayItem = {
    id: '00000000-0000-4000-8000-000000000a02', kind: 'follow_up', type: 'cope_ahead_after', tier: 'practice', state: 'due',
    dueAt: '2026-10-17T19:00:00.000Z', resolveMode: 'inline', deepLink: null,
    choices: TYPE?.choices ?? [], copy: TYPE?.copy ?? { title: '' },
    source: { toolId: 'cope-ahead', toolSessionId: TOOL_SESSION }, plan: planFor(branch),
  };
  return (
    <section className="space-y-2">
      <p className={mockNote}>Today, after the time the person picked on Cope Ahead’s first screen</p>
      {gone
        ? <p ref={next} tabIndex={-1} className={`${mockNote} focus:outline-none`}>The card leaves Today.</p>
        : <CopeAheadAfterCard item={item} onDone={() => setGone(true)} />}
    </section>
  );
}

export const COPE_AHEAD_AFTER_PACK = { id: 'cope_ahead_after', title: 'Cope Ahead: how did it go? (not parts: cope-ahead.json, no sign-off gate)', where: 'Today' };

export const COPE_AHEAD_AFTER_SURFACE: Surface = {
  id: 'cope-ahead-after', pack: COPE_AHEAD_AFTER_PACK.id, title: 'Cope Ahead: the after card (Today)',
  who: 'Everyone who said yes to “Want me to ask how it went?” on Cope Ahead’s keep screen: on Today from the time they picked. Copy from src/data/content/cope-ahead.json.',
  branches: BRANCHES,
  setup: (branch) => answers({
    resolveFollowUp: (d) => {
      const { planHelped } = d as { planHelped?: string };
      // The server's own write (functions/src/spine/followUp.ts tagCopeAheadPart): parts on, the visit's part.
      if (branch === 'parts' && planHelped === 'helped') {
        logEvent('PartTag (server)', { source: 'cope_ahead', toolSessionId: TOOL_SESSION, partId: PART_IDS.chase });
      }
      return { next: null, status: 'done' };
    },
  }),
  render: ({ branch }) => <Host key={branch} branch={branch} />,
};

const copy = (p: CopeAheadPlanIds) => afterCardCopy(CONTENT, p)!;
const leaves = 'The card leaves Today.';
/** The line each branch is there to show (dev/review/check.mjs reads it from the page), from cope-ahead.json. */
export const COPE_AHEAD_AFTER_EXPECT: Record<string, string> = Object.fromEntries(([
  ['how', copy(planFor('how')).question],
  ['two_moves', copy(planFor('two_moves')).planLine!],
  ['helped', leaves], ['unsure', leaves], ['unused', leaves], ['skip', leaves], ['not_yet', leaves], ['parts', leaves],
  ['own_situation', copy(PLANS.own_situation).question],
  ['own_moment', copy(PLANS.own_moment).planLine!],
  ['pull', copy(PLANS.pull).planLine!],
] as [string, string][]).map(([b, line]) => [`cope-ahead-after/${b}`, line]));

/** Lines a branch must not show: the first question is gone once answered. */
export const COPE_AHEAD_AFTER_ABSENT: Record<string, string> = {
  'cope-ahead-after/two_moves': copy(planFor('two_moves')).question,
};
