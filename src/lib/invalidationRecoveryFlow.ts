/**
 * Step machine for "Recover from a hurtful moment". Pure, so routing is unit-testable.
 * History is a stack of {step, data} snapshots: Back restores the data too, so
 * re-ratings, skills and unlock targets never leak from an abandoned branch.
 */
import type { ExitId, Gate, Pull, InvalidationEvent, RecoveryGates, Zone } from '../data/invalidationRecoveryTypes';

export type Step =
  | 'what' | 'loud' | 'stop' | 'cold' | 'breathe' | 'orient' | 'rerate' | 'angry' | 'secure'
  | 'label' | 'validate' | 'compassion' | 'need' | 'certainty' | 'them'
  | 'route' | 'unlock' | 'exit' | 'close' | 'follow';

export interface FlowData {
  stateId: string | null;
  intensity: number | null;   // at start
  pull: Pull | null;
  urge: number | null;        // pull strength at start
  gate: Gate;
  now: number | null;         // latest intensity rating
  mids: number[];             // re-ratings between start and close
  emotionId: string | null;
  needId: string | null;
  zone: Zone | null;
  safe: 'yes' | 'no' | null;
  asks: 0 | 1 | 2 | null;
  exitId: ExitId | null;
  skills: string[];           // PracticeSkill ids, deduped on save
  rerateTo: 'label' | 'route';
}

export const EMPTY_FLOW: FlowData = {
  stateId: null, intensity: null, pull: null, urge: null, gate: 'none', now: null, mids: [],
  emotionId: null, needId: null, zone: null, safe: null, asks: null, exitId: null, skills: [], rerateTo: 'label',
};

export const PHASES: { key: string; steps: Step[] }[] = [
  { key: 'settle', steps: ['what', 'loud', 'stop', 'cold', 'breathe', 'orient', 'rerate'] },
  { key: 'name', steps: ['angry', 'label'] },
  { key: 'validate', steps: ['secure', 'validate', 'compassion'] },
  { key: 'need', steps: ['need', 'certainty', 'them'] },
  { key: 'move', steps: ['route', 'unlock', 'exit'] },
  { key: 'close', steps: ['close', 'follow'] },
];
export const phaseIndex = (s: Step) => PHASES.findIndex(p => p.steps.includes(s));

const isAttachment = (st: Pick<InvalidationEvent, 'protocol' | 'secondaryProtocol'>) =>
  st.protocol === 'attachment_alarm' || st.secondaryProtocol === 'attachment_alarm';

/**
 * Whether the angry-part card is offered next (src/components/parts/AngryPartCard.tsx): the pull is
 * fight back, the latest reading is under the downshift line (never while flooded: after the body
 * steps only if the re-rating came under it), its copy is complete for the person's wording (`ready`),
 * and it hasn't been offered in this visit (`offered`; going Back into it is a different thing).
 */
export function offerAngryCard(d: Pick<FlowData, 'pull' | 'now'>, g: Pick<RecoveryGates, 'downshiftAt'>, ready: boolean, offered: boolean): boolean {
  return d.pull === 'fight' && d.now !== null && d.now < g.downshiftAt && ready && !offered;
}

/**
 * The step after `from`, given the data already collected. `angry`: offerAngryCard's answer, so the
 * card sits between settling and naming; leaving it goes on exactly as settling would have.
 */
export function nextStep(from: Step, d: FlowData, st: Pick<InvalidationEvent, 'protocol' | 'secondaryProtocol'>, angry = false): Step {
  switch (from) {
    case 'what': return 'loud';
    case 'loud':
      if (d.gate === 'downshift' || d.gate === 'downshift-cold') return 'stop';
      if (d.gate === 'orient') return 'orient';
      if (angry) return 'angry';
      return isAttachment(st) ? 'secure' : 'label';
    case 'stop': return d.gate === 'downshift-cold' ? 'cold' : 'breathe';
    case 'cold': return 'breathe';
    case 'breathe': case 'orient': case 'unlock': return 'rerate';
    case 'rerate':
      if (d.rerateTo === 'route') return 'route';
      if (angry) return 'angry';
      return isAttachment(st) && !d.skills.includes('secure') ? 'secure' : 'label';
    // From loud the skills are still empty, so this is loud's own rule there too.
    case 'angry': return isAttachment(st) && !d.skills.includes('secure') ? 'secure' : 'label';
    case 'secure': return 'label';
    case 'label': return 'validate';
    case 'validate': return st.protocol === 'diminished_self' ? 'compassion' : 'need';
    case 'compassion': return 'need';
    case 'need': return st.protocol === 'not_received' ? 'certainty' : 'them';
    case 'certainty': return 'them';
    case 'them': return 'route';
    case 'route': return 'exit';
    case 'exit': return 'close';
    case 'close': return 'follow';
    case 'follow': return 'follow';
  }
}

export interface FlowHistory {
  stack: { step: Step; data: FlowData }[];
  /** After Back: the abandoned entry's data, used only to prefill the screen's controls. */
  prefill: FlowData | null;
}
export type FlowAction =
  | { type: 'go'; step: Step; patch?: Partial<FlowData> }
  | { type: 'back' }
  | { type: 'reset' };

export function flowReducer(h: FlowHistory, a: FlowAction): FlowHistory {
  if (a.type === 'reset') return { stack: [{ step: 'what', data: EMPTY_FLOW }], prefill: null };
  if (a.type === 'back') {
    return h.stack.length > 1 ? { stack: h.stack.slice(0, -1), prefill: h.stack[h.stack.length - 1].data } : h;
  }
  const top = h.stack[h.stack.length - 1];
  // A step never follows itself: a repeat push is a double tap on an auto-advancing screen.
  if (top.step === a.step) return h;
  return { stack: [...h.stack, { step: a.step, data: { ...top.data, ...a.patch } }], prefill: null };
}

export const initialHistory = (): FlowHistory => ({ stack: [{ step: 'what', data: EMPTY_FLOW }], prefill: null });

/** The saved-session readings: start, each re-rate, end. Capped at 8 points, always keeping the start. */
export function readingsFor(d: FlowData, end: number): number[] {
  const all = [d.intensity ?? end, ...d.mids, end];
  return all.length > 8 ? [all[0], ...all.slice(-7)] : all;
}
