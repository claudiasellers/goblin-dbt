/**
 * "Say something to it" on the review page (lane 1): the card's button and its panel in Parts of me (the
 * usual chips, the gentle set for a tender part, own words at full length), the quiet "You told it: …" line
 * (a chip, their own words), and Meet a part's step after Thanks on a visit to a kept part (the usual set,
 * and the tender path's gentle one). Every branch is reached by tapping through the real components.
 */
import { useEffect, useState } from 'react';
import type { PartsContent } from '../../src/data/partsContentTypes';
import { getPartsContent } from '../../src/services/partsContent';
import { partsOfMeCopy } from '../../src/lib/partsOfMe';
import { PartsOfMe } from '../../src/components/me/PartsOfMe';
import { ToolSessionProvider } from '../../src/contexts/ToolSessionContext';
import { MeetAPart } from '../../src/pages/tools/MeetAPart';
import { answers } from './backend';
import { ME_ITEMS, PART_IDS } from './data';
import type { DriveStep } from './driver';
import type { Branch, Surface } from './surfaces';

const OWN_140 = 'I know you have been carrying this for years and I want you to know I see it, and I am here now, and we can take this slowly, okay, together';

/** Parts of me: the chase part told a chip, the tender one their own words, the resting one nothing yet. */
const ITEMS = ME_ITEMS.map((i) => {
  if (!i.part) return i;
  if (i.meta.id === PART_IDS.chase) return { ...i, part: { ...i.part, told: { chipId: 'say_thanks', own: null, at: '2026-10-12T19:00:00.000Z' } } };
  if (i.meta.id === PART_IDS.little) return { ...i, part: { ...i.part, told: { chipId: null, own: 'I am not going anywhere', at: '2026-10-10T19:00:00.000Z' } } };
  return i;
});

/** The first card's button (the chase part). */
const OPEN: DriveStep[] = [{ prompt: 'say_open' }];
const meetToThanks: DriveStep[] = [
  { opt: 'blend_notice' }, { opt: 'where_nowhere' }, { shape: true }, { opt: 'age_now' }, { opt: 'chase_voice_fix_now' }, { opt: 'feel_curious' },
  { opt: 'chase_job_dont_leave' }, { opt: 'likes_tired' }, { opt: 'guards_not_sure' }, { opt: 'front_not_sure' }, { opt: 'chase_fear_waiting' },
  { opt: 'update_yes' }, { press: 'meet_thank_hold' }, { tap: 'Next' },
];
const meetTender: DriveStep[] = [
  { opt: 'blend_notice' }, { opt: 'where_nowhere' }, { shape: true }, { opt: 'age_little' }, { opt: 'young_gentle' }, { press: 'meet_thank_hold' }, { tap: 'Next' },
];

interface SayBranch extends Branch { meet?: boolean }
const BRANCHES: SayBranch[] = [
  { id: 'cards', label: 'The cards: "You told it: …" (a chip, their own words), a button on each active or resting card' },
  { id: 'open', label: 'Say something to it: the usual chips', steps: OPEN },
  { id: 'said', label: 'A chip said: the line shows it, the panel folds', steps: [...OPEN, { opt: 'say_got_this' }] },
  { id: 'own', label: 'In my words at 140 characters', steps: [...OPEN, { opt: 'say_own' }, { type: OWN_140 }] },
  { id: 'own_said', label: 'Own words said: the line in the serif', steps: [...OPEN, { opt: 'say_own' }, { type: OWN_140 }, { prompt: 'say_send' }] },
  { id: 'meet', label: 'Meet a part, a kept part: after Thanks', steps: meetToThanks, meet: true },
  { id: 'meet_own', label: 'Meet a part: In my words', steps: [...meetToThanks, { opt: 'say_own' }], meet: true },
  { id: 'meet_after', label: 'Meet a part: said, then on to Would rather', steps: [...meetToThanks, { opt: 'say_listening' }], meet: true },
  { id: 'meet_tender', label: 'Meet a part, the tender path: after the hold, the gentle set', steps: meetTender, meet: true },
];

function useParts(): PartsContent | null {
  const [c, setC] = useState<PartsContent | null>(null);
  useEffect(() => { getPartsContent().then(setC).catch(() => { /* stays empty */ }); }, []);
  return c;
}

/** Parts of me with the say copy; tender card second ("the little one": the gentle set). */
function MeHost() {
  const content = useParts();
  const copy = partsOfMeCopy(content);
  if (!content || !copy) return null;
  return <PartsOfMe items={ITEMS} candidates={[]} content={content} copy={copy} onWrite={(p) => p.then(() => undefined)} onDismiss={async () => {}} />;
}

export const SAY_SURFACE: Surface = {
  id: 'say', pack: 'say', title: 'Say something to it',
  who: 'Parts on: each active or resting card in Parts of me, and Meet a part after Thanks on a visit to a kept part. Writes a PartMessage (listed under the frame, own words hidden).',
  branches: BRANCHES.map(({ id, label, steps }) => ({ id, label, ...(steps ? { steps } : {}) })),
  routeState: (b) => (BRANCHES.find((x) => x.id === b)?.meet ? { parts: { trailheadKind: 'me', partId: b === 'meet_tender' ? PART_IDS.hide : PART_IDS.chase } } : undefined),
  setup: () => answers({ sayToPart: (d) => ({ id: (d as { id: string }).id, created: true }) }),
  render: ({ branch }) => (BRANCHES.find((x) => x.id === branch)?.meet
    ? <ToolSessionProvider toolId="meet-a-part"><MeetAPart /></ToolSessionProvider>
    : <MeHost />),
};
