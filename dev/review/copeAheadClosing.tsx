/**
 * Cope Ahead's closing screens on the review page (lane 3): Rehearse it, Settle and Keep it, each on its own,
 * in every state, as the page (lane 1) mounts them. Not a parts surface: Cope Ahead ships with its own
 * content, so this reads the app's src/data/content/cope-ahead.json, not the parts fixture. The anchor line
 * under the plan is parts copy (anchorLead on the served parts content). What each screen reports to the
 * page is listed under the frame. Lane 1's full-flow block reuses COPE_AHEAD_PACK.
 */
import { useEffect, useState, type ReactNode } from 'react';
import { MotionConfig } from 'motion/react';
import CA from '../../src/data/content/cope-ahead.json';
import type { CopeAheadContent } from '../../src/data/copeAheadTypes';
import type { PartsContent } from '../../src/data/partsContentTypes';
import { anchorLead } from '../../src/lib/copeAhead';
import { getPartsContent } from '../../src/services/partsContent';
import { Rehearse } from '../../src/components/tools/copeAhead/Rehearse';
import { Settle } from '../../src/components/tools/copeAhead/Settle';
import { KeepCard, type KeepCardProps } from '../../src/components/tools/copeAhead/KeepCard';
import type { PlanParts } from '../../src/components/tools/copeAhead/PlanSentence';
import { logEvent } from './backend';
import type { DriveStep } from './driver';
import type { Branch, Surface } from './surfaces';

const C = CA.content as unknown as CopeAheadContent;
const copy = (k: string) => C.copy[k] ?? '';
const beat = (order: number) => C.beats.find((b) => b.order === order)!.text;
const ifOf = (id: string) => C.hardMoments.find((m) => m.id === id)!.ifText;
const lineOf = (id: string) => C.moves.find((m) => m.id === id)!.line;

/** The plan as lane 4's planLine composes it (src/lib/copeAheadPlan.ts): If {ifText}, I'll {move}[ and {move}]. */
function plan(ifText: string, moves: string[]): PlanParts {
  return { ifText, moves, text: `${copy('plan_if')} ${ifText}, ${copy('plan_ill')} ${moves.join(` ${copy('plan_and')} `)}.` };
}
/** Own words for the hardest moment at the full 140 characters (ownMax). */
const LONG_MOMENT = 'my sister brings up the money from last spring in front of everyone at the table and I feel my face go hot before I can say anything at all.';
const ONE = plan(ifOf('go_blank'), [lineOf('long_out')]);
const TWO = plan(ifOf('voice_raised'), [lineOf('long_out'), lineOf('give_minute')]);
/** As planLine keeps own words: a closing full stop dropped, so the sentence reads once. */
const LONG_IF = LONG_MOMENT.replace(/\.$/, '');
const LONG = plan(LONG_IF, [lineOf('feet'), lineOf('step_out')]);

const next = (n: number): DriveStep[] => Array.from({ length: n }, () => ({ tap: copy('rehearse_next') }));

type Kind = 'rehearse' | 'settle' | 'keep';
interface Row extends Branch {
  kind: Kind; reduce?: boolean;
  /** Rehearse */ pass?: 1 | 2; moment?: string; plan?: PlanParts;
  /** Keep it */ keep?: KeepCardProps['keep']; anchor?: boolean; askAfter?: boolean | null; failNext?: boolean;
  /** The line the branch is there to show (dev/review/check.mjs), and one it must not. */
  expect: string; absent?: string;
}

const ROWS: Row[] = [
  { id: 'rehearse_1', label: '5. Rehearse: beat 1, the intro (pass 1)', kind: 'rehearse', pass: 1, plan: ONE, expect: beat(1) },
  { id: 'rehearse_moment', label: '5. Beat 3: the hardest moment', kind: 'rehearse', pass: 1, plan: ONE, steps: next(2), expect: beat(3).replace('{moment}', ifOf('go_blank')) },
  { id: 'rehearse_plan', label: '5. Beat 5: the plan (the panel brightens)', kind: 'rehearse', pass: 1, plan: ONE, steps: next(4), expect: beat(5).split('{plan}')[0].trim() },
  { id: 'rehearse_end', label: '5. Beats 6 and 7 together (still bright)', kind: 'rehearse', pass: 1, plan: ONE, steps: next(5), expect: beat(7) },
  { id: 'rehearse_done', label: '5. After the last Next: onDone', kind: 'rehearse', pass: 1, plan: ONE, steps: next(6), expect: 'rehearse.onDone' },
  { id: 'rehearse_2', label: '5. Once more: something you didn’t plan for (pass 2, beat 3)', kind: 'rehearse', pass: 2, moment: ifOf('not_heard'), plan: TWO, expect: copy('rehearse_new_problem') },
  { id: 'rehearse_2_plan', label: '5. Pass 2, the plan beat, two moves', kind: 'rehearse', pass: 2, moment: ifOf('not_heard'), plan: TWO, steps: next(2), expect: copy('plan_and') },
  { id: 'rehearse_long', label: '5. A 140-character moment in own words (beat 3)', kind: 'rehearse', pass: 1, moment: LONG_MOMENT, plan: LONG, steps: next(2), expect: LONG_MOMENT },
  { id: 'rehearse_long_plan', label: '5. The 140-character moment as the plan’s If, two moves', kind: 'rehearse', pass: 1, moment: LONG_MOMENT, plan: LONG, steps: next(4), expect: lineOf('step_out') },
  { id: 'rehearse_reduced', label: '5. The plan beat, reduced motion (no transition)', kind: 'rehearse', pass: 1, plan: ONE, steps: next(4), reduce: true, expect: lineOf('long_out') },
  { id: 'settle', label: '6. Settle: three choices', kind: 'settle', expect: copy('settle_title') },
  { id: 'settle_breath', label: '6. Three long breaths out: the holds', kind: 'settle', steps: [{ tap: copy('settle_breath') }], expect: copy('settle_breath') },
  { id: 'settle_breath_reduced', label: '6. The holds, reduced motion', kind: 'settle', steps: [{ tap: copy('settle_breath') }], reduce: true, expect: copy('settle_breath') },
  { id: 'settle_five', label: '6. 5-4-3-2-1: onChoose at once', kind: 'settle', steps: [{ tap: copy('settle_five') }], expect: 'five_senses' },
  { id: 'settle_ok', label: '6. I’m OK: onChoose at once', kind: 'settle', steps: [{ tap: copy('settle_ok') }], expect: 'settle.onChoose' },
  { id: 'keep_idle', label: '7. Keep it: one move, no anchor', kind: 'keep', plan: ONE, keep: 'idle', expect: copy('keep_title'), absent: copy('ask_after_q') },
  { id: 'keep_two_anchor', label: '7. Two moves, with a part’s anchor (parts on)', kind: 'keep', plan: TWO, keep: 'idle', anchor: true, expect: 'shows up:' },
  { id: 'keep_long', label: '7. The 140-character If, two moves and an anchor', kind: 'keep', plan: LONG, keep: 'idle', anchor: true, expect: LONG_IF },
  { id: 'keep_saving', label: '7. Saving', kind: 'keep', plan: ONE, keep: 'saving', expect: copy('keep_yes') },
  { id: 'keep_kept', label: '7. Kept: then Want me to ask how it went?', kind: 'keep', plan: ONE, keep: 'kept', expect: copy('ask_after_q'), absent: copy('keep_no') },
  { id: 'keep_failed', label: '7. The save failed: the line, the buttons stay', kind: 'keep', plan: ONE, keep: 'failed', failNext: true, expect: "Couldn't save that. Try again." },
  { id: 'keep_not_now', label: '7. Not now: Keep this stays for a change of mind', kind: 'keep', plan: ONE, keep: 'idle', steps: [{ tap: copy('keep_no') }], expect: copy('ask_after_q') },
  { id: 'keep_ask_yes', label: '7. Ask after: Yes, then Done', kind: 'keep', plan: TWO, keep: 'kept', anchor: true, askAfter: true, expect: copy('done') },
  { id: 'keep_ask_no', label: '7. Ask after: No thanks, then Done', kind: 'keep', plan: ONE, keep: 'kept', askAfter: false, expect: copy('done') },
  { id: 'keep_done', label: '7. Done: onDone', kind: 'keep', plan: ONE, keep: 'kept', askAfter: false, steps: [{ tap: copy('done') }], expect: 'keep.onDone' },
];

const mockNote = 'text-[11px] tracking-wide text-[var(--color-text-tertiary)]';

/** What the screen reported to the page, as the page would get it (harness chrome). */
function useReported(): [string[], (s: string, data?: unknown) => void] {
  const [said, setSaid] = useState<string[]>([]);
  return [said, (s, data) => { logEvent(s, data ?? {}); setSaid((x) => [...x, s + (data ? ` ${JSON.stringify(data)}` : '')]); }];
}
function Reported({ said }: { said: string[] }) {
  return said.length ? <p data-testid="reported" className={mockNote}>Reported: {said.join(' · ')}</p> : null;
}

function KeepHost({ row }: { row: Row }) {
  const [parts, setParts] = useState<PartsContent | null>(null);
  useEffect(() => { getPartsContent().then(setParts).catch(() => { /* stays empty */ }); }, []);
  const [keep, setKeep] = useState<KeepCardProps['keep']>(row.keep ?? 'idle');
  const [askAfter, setAskAfter] = useState<boolean | null>(row.askAfter ?? null);
  const [said, report] = useReported();
  const name = 'the one who hides';
  const anchor = row.anchor ? { name, line: 'notice my feet and stay', lead: parts ? anchorLead(parts, name) : undefined } : null;
  if (row.anchor && !parts) return null;
  return (
    <div className="space-y-3">
      <KeepCard content={C} plan={row.plan!} anchor={anchor} keep={keep} askAfter={askAfter}
        onKeep={() => { report('keep.onKeep'); setKeep('saving'); setTimeout(() => setKeep(row.failNext ? 'failed' : 'kept'), 600); }}
        onNotNow={() => report('keep.onNotNow')}
        onAskAfter={(yes) => { report('keep.onAskAfter', { yes }); setAskAfter(yes); }}
        onDone={() => report('keep.onDone')} />
      <Reported said={said} />
    </div>
  );
}

function RehearseHost({ row }: { row: Row }) {
  const [said, report] = useReported();
  return (
    <div className="space-y-3">
      <Rehearse content={C} moment={row.moment ?? row.plan!.ifText} plan={row.plan!} pass={row.pass ?? 1} onDone={() => report('rehearse.onDone')} />
      <Reported said={said} />
    </div>
  );
}

function SettleHost() {
  const [said, report] = useReported();
  return (
    <div className="space-y-3">
      <Settle content={C} onChoose={(s) => report('settle.onChoose', { s })} />
      <Reported said={said} />
    </div>
  );
}

function Host({ reduce, children }: { reduce: boolean; children: ReactNode }) {
  return <MotionConfig reducedMotion={reduce ? 'always' : 'user'}>{children}</MotionConfig>;
}

export const COPE_AHEAD_PACK = { id: 'cope_ahead', title: 'Cope Ahead (not parts: ships with its own content, no sign-off gate)', where: 'Tools → Emotion Regulation' };

export const COPE_CLOSING_SURFACE: Surface = {
  id: 'cope-ahead-closing', pack: COPE_AHEAD_PACK.id, title: 'Cope Ahead: Rehearse, Settle, Keep it (screens 5–7)',
  who: 'Everyone, at the end of Cope Ahead. Each screen on its own, as the page mounts it; copy from src/data/content/cope-ahead.json. What each reports to the page shows under it.',
  branches: ROWS.map(({ id, label, steps }) => ({ id, label, ...(steps ? { steps } : {}) })),
  render: ({ branch }) => {
    const row = ROWS.find((r) => r.id === branch) ?? ROWS[0];
    return (
      <Host reduce={row.reduce === true}>
        {row.kind === 'rehearse' ? <RehearseHost row={row} /> : row.kind === 'settle' ? <SettleHost /> : <KeepHost row={row} />}
      </Host>
    );
  },
};

/** The line each branch is there to show, and one it must not (dev/review/check.mjs). */
export const COPE_CLOSING_EXPECT: Record<string, string> = Object.fromEntries(ROWS.map((r) => [`cope-ahead-closing/${r.id}`, r.expect]));
export const COPE_CLOSING_ABSENT: Record<string, string> = Object.fromEntries(ROWS.filter((r) => r.absent).map((r) => [`cope-ahead-closing/${r.id}`, r.absent!]));
