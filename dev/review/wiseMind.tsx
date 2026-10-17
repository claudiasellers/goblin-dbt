/**
 * Wise mind on the review page (lane 1). Not a parts surface: Wise mind's content isn't gated on the parts
 * sign-off and it ships visible to everyone, so it reads the shipped src/data/content/wise-mind.json (the
 * app's own file, through the page's real loader), not the parts fixture or `surfaceReady`. One surface,
 * every screen of the minds form and every branch, each reached by tapping through the real page from the
 * first screen (./driver.ts, by label). The parts form's branches are lane 4's own block.
 */
import { useState, type ReactNode } from 'react';
import { MotionConfig } from 'motion/react';
import { useLocation } from 'react-router-dom';
import WM from '../../src/data/content/wise-mind.json';
import type { WiseMindContent } from '../../src/data/wiseMindTypes';
import { getToolById } from '../../src/data/tools';
import { ToolSessionProvider } from '../../src/contexts/ToolSessionContext';
import { WiseMind } from '../../src/pages/tools/WiseMind';
import { answers } from './backend';
import type { DriveStep } from './driver';
import type { Branch, Surface } from './surfaces';

const C = WM.content as unknown as WiseMindContent;
const copy = C.copy as Record<string, Record<string, unknown>>;
const t = (screen: string, key: string) => String(copy[screen][key]);
const feel = (k: 'calm' | 'pushed' | 'unsure') => String((copy.feel.options as Record<string, string>)[k]);
const q = (id: string) => C.questions.find((x) => x.id === id)!;
const a = (id: string) => C.answers.find((x) => x.id === id)!.label;
const p = (kind: string) => C.practices.find((x) => x.kind === kind)!;
const tap = (label: string): DriveStep => ({ tap: label });
const toolChip = (id: string) => { const tool = getToolById(id)!; return `${tool.emoji} ${tool.name}`; };

/** The way to screen 4 that every later branch takes: no question, the default practice, *I'm here*. */
const toComes: DriveStep[] = [tap(t('chrome', 'skip')), tap(t('dropIn', 'start')), tap(t('dropIn', 'here'))];
const toFeel = (answerId: string): DriveStep[] => [...toComes, tap(a(answerId))];
const toNext = (answerId: string): DriveStep[] => [...toFeel(answerId), tap(feel('calm')), tap(t('chrome', 'next'))];
const practice = (kind: string): DriveStep[] => [tap(t('chrome', 'skip')), tap(p(kind).name), tap(t('dropIn', 'start'))];

const BRANCHES: (Branch & { reduce?: boolean })[] = [
  { id: 'question', label: '1. The question' },
  ...C.questions.map((x) => ({ id: `q_${x.id.replace(/^wm_q_/, '')}`, label: `2. ${x.label}: emotion mind's chips`, steps: [tap(x.label), tap(t('minds', 'emotion'))] })),
  { id: 'reason', label: '2. Reasonable mind opens next', steps: [tap(q('wm_q_say').label), tap(t('minds', 'emotion')), tap(q('wm_q_say').voices.emotion[0].label)] },
  { id: 'heard', label: '2. Both heard (one chip, one Nothing comes): the witness line', steps: [tap(q('wm_q_say').label), tap(t('minds', 'reason')), tap(q('wm_q_say').voices.reason[1].label), tap(t('minds', 'nothingComes'))] },
  { id: 'own_question', label: '1. Something else: own words', steps: [tap(t('question', 'own')), { type: 'Whether to move flats this year' }] },
  { id: 'own_mind', label: '2. Something else for a mind', steps: [tap(q('wm_q_next').label), tap(t('minds', 'emotion')), tap(t('minds', 'own')), { type: 'Get out of here today' }] },
  { id: 'drop_in', label: '3. Choose a way in (Ask and listen highlighted)', steps: [tap(q('wm_q_next').label), tap(t('chrome', 'skip'))] },
  { id: 'drop_in_settle', label: '3. Nothing in particular: the stone highlighted', steps: [tap(q('wm_q_settle').label), tap(t('chrome', 'skip'))] },
  { id: 'stone', label: '3. Stone on the lake', steps: practice('drift') },
  { id: 'stone_reduced', label: '3. Stone on the lake, reduced motion (stills)', steps: practice('drift'), reduce: true },
  { id: 'breath', label: '3. Wise in, mind out', steps: practice('hold') },
  { id: 'breath_reduced', label: '3. Wise in, mind out, reduced motion', steps: practice('hold'), reduce: true },
  { id: 'ask', label: '3. Ask and listen (with a question)', steps: [tap(q('wm_q_let_go').label), tap(t('chrome', 'skip')), tap(t('dropIn', 'start'))] },
  { id: 'ask_reduced', label: '3. Ask and listen, reduced motion', steps: [tap(q('wm_q_let_go').label), tap(t('chrome', 'skip')), tap(t('dropIn', 'start'))], reduce: true },
  { id: 'comes', label: '4. What does wise mind say?', steps: toComes },
  ...C.answers.filter((x) => x.kind !== 'quiet').map((x) => ({ id: `a_${x.id.replace(/^wm_a_/, '')}`, label: `5. ${x.label}`, steps: toFeel(x.id) })),
  { id: 'a_own', label: '5. Something else: own words', steps: [...toComes, tap(t('comes', 'own')), { type: 'Sleep on it first' }, tap(t('chrome', 'next'))] },
  { id: 'quiet', label: '4. Nothing yet: the quiet line', steps: [...toComes, tap(a('wm_a_nothing'))] },
  { id: 'quiet_close', label: '4. Nothing yet, then the close', steps: [...toComes, tap(a('wm_a_nothing')), tap(t('chrome', 'next'))] },
  { id: 'calm', label: '5. Calm, settled', steps: [...toFeel('wm_a_wait'), tap(feel('calm'))] },
  { id: 'pushed', label: '5. Pushed, urgent: once more or keep it', steps: [...toFeel('wm_a_say'), tap(feel('pushed'))] },
  { id: 'once_more', label: '5. Drop in once more: back to the practice', steps: [...toFeel('wm_a_say'), tap(feel('pushed')), tap(t('feel', 'onceMore'))] },
  { id: 'pushed_again', label: '5. Pushed again after once more: only Keep it anyway', steps: [...toFeel('wm_a_say'), tap(feel('pushed')), tap(t('feel', 'onceMore')), tap(t('dropIn', 'start')), tap(t('dropIn', 'here')), tap(a('wm_a_say')), tap(feel('pushed'))] },
  { id: 'unsure', label: '5. Not sure', steps: [...toFeel('wm_a_wait'), tap(feel('unsure'))] },
  { id: 'next', label: '6. One next step (Look after myself first: two tools)', steps: toNext('wm_a_care') },
  { id: 'keep_anyway', label: '6. After Keep it anyway', steps: [...toFeel('wm_a_say'), tap(feel('pushed')), tap(t('feel', 'keepAnyway'))] },
  { id: 'keep', label: '6. Keep what wise mind said: kept in My words', steps: [...toNext('wm_a_wait'), tap(t('next', 'keep'))] },
  { id: 'keep_own', label: '6. Keep own words', steps: [...toComes, tap(t('comes', 'own')), { type: 'Sleep on it first' }, tap(t('chrome', 'next')), tap(feel('calm')), tap(t('chrome', 'next')), tap(t('next', 'keep'))] },
  { id: 'handoff', label: '6. A hand-off (Say it, kindly → Ask for what you need)', steps: [...toNext('wm_a_say'), tap(toolChip('dear-man'))] },
  { id: 'close', label: 'The close: This is enough for now', steps: [...toNext('wm_a_let_go'), tap(t('next', 'enough'))] },
];

/** Where a hand-off went (harness chrome): the page's real `linkTo` navigates inside the frame's router. */
function Went() {
  const loc = useLocation();
  const [first] = useState(loc.pathname);
  return loc.pathname === first ? null : <p data-testid="went" className="text-xs text-[var(--color-text-tertiary)]">Opened {loc.pathname}</p>;
}

/** A reduced-motion branch forces the practices' stills (they read MotionConfig before the device setting). */
function Host({ reduce, children }: { reduce: boolean; children: ReactNode }) {
  return <MotionConfig reducedMotion={reduce ? 'always' : 'user'}>{children}</MotionConfig>;
}

export const WISE_MIND_PACK = { id: 'wise_mind', title: 'Wise mind (not parts: ships with its own content, no sign-off gate)', where: 'Tools → Mindfulness' };

export const WISE_MIND_SURFACE: Surface = {
  id: 'wise-mind', pack: WISE_MIND_PACK.id, title: 'Wise mind: the two minds form',
  who: 'Everyone: Tools → Mindfulness, or "I\'m torn about what to do". Copy from src/data/content/wise-mind.json (what ships). The parts form (2p) is lane 4\'s block.',
  branches: BRANCHES.map(({ id, label, steps }) => ({ id, label, ...(steps ? { steps } : {}) })),
  setup: () => answers({
    recordWitnessBeat: (d) => ({ logged: true, ownLineId: (d as { ownLine?: { id: string } }).ownLine?.id, profileVersion: 2 }),
  }),
  render: ({ branch }) => (
    <Host reduce={BRANCHES.find((b) => b.id === branch)?.reduce === true}>
      <ToolSessionProvider toolId="wise-mind">
        <WiseMind />
        <Went />
      </ToolSessionProvider>
    </Host>
  ),
};

/** The line each branch is there to show (dev/review/check.mjs reads it from the page), as wise-mind.json has it. */
export const WISE_MIND_EXPECT: Record<string, string> = Object.fromEntries(([
  ['question', t('question', 'prompt')],
  ...C.questions.map((x) => [`q_${x.id.replace(/^wm_q_/, '')}`, t('minds', 'emotionSays')]),
  ['reason', t('minds', 'reasonSays')], ['heard', t('minds', 'witness')], ['own_question', t('chrome', 'back')],
  ['own_mind', t('minds', 'emotionSays')], ['drop_in', t('dropIn', 'prompt')], ['drop_in_settle', t('dropIn', 'prompt')],
  ['stone', p('drift').lines[0]], ['stone_reduced', p('drift').lines[0]], ['breath', p('hold').lines[0]], ['breath_reduced', p('hold').lines[0]],
  ['ask', p('ask').lines[0]], ['ask_reduced', p('ask').lines[0]], ['comes', t('comes', 'prompt')],
  ...C.answers.filter((x) => x.kind !== 'quiet').map((x) => [`a_${x.id.replace(/^wm_a_/, '')}`, t('feel', 'prompt')]),
  ['a_own', t('feel', 'prompt')], ['quiet', t('comes', 'quiet')], ['calm', String((copy.feel.lines as Record<string, string>).calm)],
  ['pushed', String((copy.feel.lines as Record<string, string>).pushed)], ['once_more', t('dropIn', 'prompt')],
  ['pushed_again', t('feel', 'keepAnyway')], ['unsure', String((copy.feel.lines as Record<string, string>).unsure)],
  ['next', t('next', 'enough')], ['keep_anyway', t('next', 'prompt')], ['keep', t('next', 'keptDone')], ['keep_own', t('next', 'keptDone')],
  ['handoff', t('next', 'done')], ['close', t('next', 'done')], ['quiet_close', t('next', 'done')],
] as [string, string][]).map(([b, line]) => [`wise-mind/${b}`, line]));

/** Lines a branch must not show: *Drop in once more* is offered once. */
export const WISE_MIND_ABSENT: Record<string, string> = { 'wise-mind/pushed_again': t('feel', 'onceMore') };
