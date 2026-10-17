/**
 * Cope Ahead on the review page (lane 1). Not a parts surface: Cope Ahead's own copy ships visible to everyone
 * in src/data/content/cope-ahead.json (read here through the page's real loader), so its lines are checked
 * from the page's map, not the parts fixture. The parts step (DEAR MAN's CopeAheadStep) and the anchor under
 * the plan are parts copy, and show only in the `parts_*` branches; every other branch runs as a person with
 * no kept parts. Each branch is reached by tapping through the real page from screen 1 (./driver.ts).
 */
import { useState, type ReactNode } from 'react';
import { MotionConfig } from 'motion/react';
import { useLocation } from 'react-router-dom';
import CA from '../../src/data/content/cope-ahead.json';
import FTF from '../../src/data/content/find-the-feeling.json';
import PARTS_FIXTURE from '../../tests/fixtures/parts-content.json';
import type { CopeAheadContent } from '../../src/data/copeAheadTypes';
import { ToolSessionProvider } from '../../src/contexts/ToolSessionContext';
import { planLine, type PlanCa } from '../../src/lib/copeAheadPlan';
import { profileCache } from '../../src/lib/profileCache';
import { CopeAhead } from '../../src/pages/tools/CopeAhead';
import { PARTS } from '../parts-example';
import { answers } from './backend';
import { COPE_AHEAD_PACK } from './copeAheadClosing'; // lane 3's pack: one Cope Ahead entry in the sign-off list
import { PART_IDS, slices } from './data';
import type { DriveStep } from './driver';
import type { Branch, Surface } from './surfaces';

const C = CA.content as unknown as CopeAheadContent;
const t = (k: string) => C.copy[k];
const S = (id: string) => C.situations.find((x) => x.id === id)!.label;
const M = (id: string) => C.hardMoments.find((x) => x.id === id)!.label;
const MV = (id: string) => C.moves.find((x) => x.id === id)!.label;
const pull = (id: string) => (FTF.content.urges as { id: string; label: string }[]).find((u) => u.id === id)!.label;
const beat = (order: number) => C.beats.find((b) => b.order === order)!.text;
const plan = (ca: PlanCa) => planLine(C, ca).text;
const tap = (label: string): DriveStep => ({ tap: label });
const next = tap(t('rehearse_next'));
const nexts = (n: number): DriveStep[] => Array.from({ length: n }, () => next);
const partName = (id: string) => PARTS.find((p) => p.id === id)!.name;
const CHASE_ANCHOR = slices().partAnchors[Object.keys(slices().partAnchors)[0]];
const KEPT_LINE = slices().savedLines[0].text;
const copeTitle = (PARTS_FIXTURE.prompts as Record<string, { copy: string }>).cope_title_any.copy;

/** Own words at each slot's full length: the situation and the moment (140), a move (90). */
const LONG_SITUATION = 'My sister is coming to stay for the whole weekend and we have not really talked properly since the funeral in the spring, not once, honestly';
const LONG_MOMENT = 'she mentions the house and what should happen to it, and everyone at the table goes quiet and looks at me as though it is mine to decide now';
const LONG_MOVE = 'put my fork down, breathe out slowly, and say we can talk about the house tomorrow morning';

const toFeel = (sit: string): DriveStep[] => [tap(S(sit)), tap(t('when_tomorrow')), next];
const toMoment = (sit: string, p?: string): DriveStep[] => [...toFeel(sit), ...(p ? [tap(pull(p))] : []), next];
const toPlan = (sit: string, moment: string, p?: string): DriveStep[] => [...toMoment(sit, p), tap(M(moment)), next];
/** The plan every later branch rehearses: "If I go blank, I'll feel my feet on the floor." */
const BASE: PlanCa = { hardMomentId: 'go_blank', moveIds: ['feet'] };
const withMove: DriveStep[] = [...toPlan('conversation', 'go_blank'), tap(MV('feet'))];
const toRehearse: DriveStep[] = [...withMove, next];
/** Pass 1 is six screens (beat 7 joins beat 6). */
const toAgain: DriveStep[] = [...toRehearse, ...nexts(6)];
const toSettle: DriveStep[] = [...toAgain, tap(t('rehearse_again_no'))];
const toKeep: DriveStep[] = [...toSettle, tap(t('settle_ok'))];
const ownMax: DriveStep[] = [
  tap(S('other')), { type: LONG_SITUATION }, tap(t('when_week')), next, next,
  tap(t('moment_own_hint')), { type: LONG_MOMENT }, next,
  tap(t('plan_own_hint')), { type: LONG_MOVE },
];
/** Once more: go_blank's two other (never danger) moments in "A conversation", the first of them. */
const NEW_MOMENT = 'voice_raised';
const toNewMoment: DriveStep[] = [...toAgain, tap(t('rehearse_again_yes'))];
const changed: DriveStep[] = [...toNewMoment, tap(M(NEW_MOMENT)), tap(t('rehearse_change_move')), tap(MV('step_out')), next];
const kept: DriveStep[] = [...toKeep, tap(t('keep_yes'))];
const partsToPlan = (part: string): DriveStep[] => [...toFeel('conversation'), tap(partName(part)), next, tap(M('go_blank')), next, tap(MV('feet'))];
const clause = (s: string) => s.replace(/[\s.,]+$/u, '');

const BRANCHES: (Branch & { reduce?: boolean; noParts?: boolean; keepFails?: boolean; search?: string })[] = [
  { id: 'what', label: '1. What\'s coming up? and When' },
  { id: 'first_linked', label: '1. From a link (?first=alone): that chip first, not pressed', search: '?first=alone' },
  { id: 'what_own', label: '1. Something else: own words (140)', steps: [tap(S('other')), { type: LONG_SITUATION }] },
  { id: 'feel', label: '2. What might you feel / want to do (A conversation I\'m dreading)', steps: toFeel('conversation') },
  { id: 'feel_more', label: '2. Something else: the full word list', steps: [...toFeel('hard_day'), tap(t('feel_more'))] },
  ...C.situations.map((x) => ({ id: `moments_${x.id}`, label: `3. ${x.label}: its moments`, steps: toMoment(x.id) })),
  { id: 'danger_moment', label: '3. A danger moment (They might hurt me): 911 and the domestic violence line alongside, 988 last', steps: [...toMoment('someone'), tap(M('might_hurt'))] },
  { id: 'danger_moment_self', label: '3. A danger moment (I might hurt myself): the crisis line alongside', steps: [...toMoment('alone'), tap(M('might_hurt_self'))] },
  { id: 'danger_hurt', label: '4. They might hurt me: the safe move first, the crisis line alongside', steps: toPlan('someone', 'might_hurt') },
  { id: 'danger_self', label: '4. I might hurt myself: the help move first, the crisis line alongside', steps: toPlan('alone', 'might_hurt_self') },
  { id: 'plan', label: '4. The plan, read back as it is built', steps: withMove },
  { id: 'plan_empty', label: '4. No move yet (general moves: no pull)', steps: toPlan('conversation', 'go_blank') },
  { id: 'plan_pull', label: '4. Plan for the pull (Say something sharp): moves for the pull', steps: [...toPlan('conversation', 'go_blank', 'fight'), tap(t('plan_use_pull')), tap(MV('give_minute'))] },
  { id: 'plan_two', label: '4. Add one more: two moves, no third offered', steps: [...withMove, tap(t('plan_add')), tap(MV('give_minute'))] },
  { id: 'own_max', label: '4. Own words in every slot at full length', steps: ownMax },
  { id: 'rehearse', label: '5. Rehearse it: the first beat', steps: toRehearse },
  { id: 'rehearse_plan', label: '5. The plan beat (the panel brightens)', steps: [...toRehearse, ...nexts(4)] },
  { id: 'rehearse_reduced', label: '5. The plan beat, reduced motion', steps: [...toRehearse, ...nexts(4)], reduce: true },
  { id: 'rehearse_over', label: '5. It\'s still hard / Then it\'s over', steps: [...toRehearse, ...nexts(5)] },
  { id: 'again', label: '5. Once more, with something you didn\'t expect?', steps: toAgain },
  { id: 'new_moment', label: '5. Once more: something you didn\'t plan for', steps: toNewMoment },
  { id: 'new_moment_own', label: '5. Once more in own words (140), keeping the plan', steps: [...toNewMoment, tap(t('feel_more')), { type: LONG_MOMENT }, tap(t('rehearse_keep_move'))] },
  { id: 'once_more_same', label: '5. Pass 2, same plan: its plan beat', steps: [...toNewMoment, tap(M(NEW_MOMENT)), tap(t('rehearse_keep_move')), next, ...nexts(2)] },
  { id: 'once_more_changed', label: '5. Pass 2 with a changed move: starts at beat 3', steps: changed },
  { id: 'once_more_end', label: '6. After pass 2: straight to Settle (not offered again)', steps: [...changed, ...nexts(4)] },
  { id: 'settle', label: '6. Settle', steps: toSettle },
  { id: 'settle_breath', label: '6. Three long breaths out', steps: [...toSettle, tap(t('settle_breath'))] },
  { id: 'settle_five', label: '6. 5-4-3-2-1: saved, then handed off', steps: [...toSettle, tap(t('settle_five'))] },
  { id: 'keep', label: '7. Here\'s your plan (after I\'m OK)', steps: toKeep },
  { id: 'keep_kept', label: '7. Keep this: kept in My words, then the ask', steps: kept },
  { id: 'keep_failed', label: '7. Keep this, and the save fails', steps: [...toKeep, tap(t('keep_yes'))], keepFails: true },
  { id: 'keep_not_now', label: '7. Not now: Keep this stays, then the ask', steps: [...toKeep, tap(t('keep_no'))] },
  { id: 'ask_yes', label: '7. Ask how it went: Yes (the after card is scheduled)', steps: [...kept, tap(t('ask_after_yes'))] },
  { id: 'ask_no', label: '7. Ask how it went: No thanks', steps: [...kept, tap(t('ask_after_no'))] },
  { id: 'done', label: '7. Done: back to Tools', steps: [...kept, tap(t('ask_after_no')), tap(t('done'))] },
  { id: 'own_max_keep', label: '7. The plan card with own words at full length', steps: [...ownMax, next, ...nexts(6), tap(t('rehearse_again_no')), tap(t('settle_ok'))] },
  { id: 'parts_step', label: 'Parts on: Who might show up? on screen 2 (DEAR MAN\'s step, as is)', steps: toFeel('conversation') },
  { id: 'parts_anchor', label: 'Parts on: a part with an anchor, under the plan', steps: partsToPlan('chase') },
  { id: 'parts_set', label: 'Parts on: a part with no anchor: set one under the plan', steps: partsToPlan('hide') },
  { id: 'parts_set_saved', label: 'Parts on: a kept line saved as its anchor', steps: [...partsToPlan('hide'), tap(KEPT_LINE), { opt: 'cope_save' }] },
  { id: 'parts_preset', label: 'Parts on: from DEAR MAN\'s link (?part=): the part preset, changeable', steps: toFeel('conversation'), search: `?first=conversation&part=${PART_IDS.chase}` },
  { id: 'parts_keep', label: 'Parts on: the plan card with the part\'s anchor', steps: [...partsToPlan('chase'), next, ...nexts(6), tap(t('rehearse_again_no')), tap(t('settle_ok'))] },
].map((b) => ({ ...b, noParts: !b.id.startsWith('parts_') }));

/** Where a hand-off went (harness chrome): the page's real `linkTo` navigates inside the frame's router. */
function Went() {
  const loc = useLocation();
  const [first] = useState(loc.pathname);
  return loc.pathname === first ? null : <p data-testid="went" className="text-xs text-[var(--color-text-tertiary)]">Opened {loc.pathname}</p>;
}

/** A reduced-motion branch forces the rehearsal panel's stills (it reads MotionConfig before the device setting). */
function Host({ reduce, children }: { reduce: boolean; children: ReactNode }) {
  return <MotionConfig reducedMotion={reduce ? 'always' : 'user'}>{children}</MotionConfig>;
}

const byId = (id: string) => BRANCHES.find((b) => b.id === id);

export const COPE_AHEAD_SURFACE: Surface = {
  id: 'cope-ahead', pack: COPE_AHEAD_PACK.id, title: 'Cope Ahead: plan for something hard, then rehearse it',
  who: 'Everyone: Tools → Emotion regulation. Copy from src/data/content/cope-ahead.json (what ships). The parts_* branches run as a person with kept parts (parts copy from the fixture); every other branch as a person with none.',
  branches: BRANCHES.map(({ id, label, steps }) => ({ id, label, ...(steps ? { steps } : {}) })),
  routeSearch: (branch) => byId(branch)?.search ?? '',
  setup: (branch) => {
    const b = byId(branch);
    // In-page navigation keeps the app's profile cache: a branch with no kept parts must not hand its empty
    // slices to the next branch (or the reverse).
    profileCache.clear();
    answers({
      recordWitnessBeat: (d) => {
        if (b?.keepFails) throw new Error('unavailable');
        return { logged: true, ownLineId: (d as { ownLine?: { id: string } }).ownLine?.id, profileVersion: 2 };
      },
      scheduleFollowUp: (d) => ({ ids: ((d as { items?: { id: string }[] }).items ?? []).map((i) => i.id) }),
      ...(b?.noParts !== false ? {
        getProfileContext: (d) => ({ toolId: (d as { toolId: string }).toolId, version: 1, slices: { ...slices(), parts: [], partDetail: [], partAnchors: {} } }),
      } : {}),
    });
  },
  render: ({ branch }) => (
    <Host reduce={byId(branch)?.reduce === true}>
      <ToolSessionProvider toolId="cope-ahead">
        <CopeAhead />
        <Went />
      </ToolSessionProvider>
    </Host>
  ),
};

const BASE_PLAN = plan(BASE);
/** CrisisBanner compact's text line (the app's own, alongside a danger moment). */
const CRISIS = 'Text HOME to 741741';
/** CrisisBanner's other_person resources (danger from another person: They might hurt me). */
const OTHER_PERSON = 'Text START to 88788';
const planBeat = (p: string) => beat(5).replace('{plan}', p.replace(/\.$/, ''));
const momentBeat = (m: string) => beat(3).replace('{moment}', clause(m));
const ifText = (id: string) => C.hardMoments.find((x) => x.id === id)!.ifText;

/** The line each branch is there to show (dev/review/check.mjs reads it from the page), as cope-ahead.json has it. */
export const COPE_AHEAD_EXPECT: Record<string, string> = Object.fromEntries(([
  ['what', t('when_title')], ['what_own', t('when_title')], ['feel', t('pull_title')], ['feel_more', t('feel_title')],
  ...C.situations.map((x) => [`moments_${x.id}`, M(x.hardMoments[x.hardMoments.length - 1])]),
  ['danger_moment', OTHER_PERSON], ['danger_moment_self', CRISIS],
  ['danger_hurt', plan({ hardMomentId: 'might_hurt', moveIds: ['leave_safe'] })],
  ['danger_self', plan({ hardMomentId: 'might_hurt_self', moveIds: ['reach_help'] })],
  ['plan', BASE_PLAN], ['plan_empty', MV('feet')],
  ['plan_pull', plan({ hardMomentId: 'go_blank', ifFrom: 'pull', pullIds: ['fight'], moveIds: ['give_minute'] })],
  ['plan_two', plan({ hardMomentId: 'go_blank', moveIds: ['feet', 'give_minute'] })],
  ['own_max', plan({ hardMomentOwn: LONG_MOMENT, moveOwn: LONG_MOVE })],
  ['rehearse', beat(1)], ['rehearse_plan', planBeat(BASE_PLAN)], ['rehearse_reduced', planBeat(BASE_PLAN)], ['rehearse_over', beat(7)],
  ['again', t('rehearse_again_q')], ['new_moment', t('rehearse_new_problem')], ['new_moment_own', t('rehearse_keep_move')],
  ['once_more_same', planBeat(plan({ hardMomentId: NEW_MOMENT, moveIds: ['feet'] }))],
  ['once_more_changed', momentBeat(ifText(NEW_MOMENT))], ['once_more_end', t('settle_title')],
  ['settle', t('settle_five')], ['settle_breath', t('settle_title')], ['settle_five', 'Opened /tool/five-senses'],
  ['keep', BASE_PLAN], ['keep_kept', t('keep_done')], ['keep_failed', t('keep_yes')],
  ['keep_not_now', t('ask_after_q')], ['ask_yes', t('done')], ['ask_no', t('done')], ['done', 'Opened /tools'],
  ['own_max_keep', plan({ hardMomentOwn: LONG_MOMENT, moveOwn: LONG_MOVE })],
  ['parts_step', copeTitle], ['parts_anchor', CHASE_ANCHOR], ['parts_set', KEPT_LINE], ['parts_set_saved', KEPT_LINE],
  ['parts_preset', CHASE_ANCHOR], ['parts_keep', CHASE_ANCHOR], ['first_linked', S('alone')],
] as [string, string][]).map(([b, line]) => [`cope-ahead/${b}`, line]));

/** Lines a branch must not show: once more is offered once; no parts step without kept parts. */
export const COPE_AHEAD_ABSENT: Record<string, string> = {
  'cope-ahead/once_more_end': t('rehearse_again_q'),
  'cope-ahead/feel': copeTitle,
  'cope-ahead/parts_step': CHASE_ANCHOR,
  'cope-ahead/plan_two': t('plan_add'),
  'cope-ahead/keep_kept': t('keep_no'),
  'cope-ahead/keep_failed': t('ask_after_q'),
  'cope-ahead/moments_someone': CRISIS,
  'cope-ahead/plan': CRISIS,
  'cope-ahead/danger_moment': CRISIS,
  'cope-ahead/danger_hurt': CRISIS,
  'cope-ahead/danger_moment_self': OTHER_PERSON,
};
