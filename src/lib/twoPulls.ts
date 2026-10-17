/**
 * Two pulls' step machine (docs/design/parts.md, "Two pulls (polarities)"). Pure, like Meet a part's
 * (src/lib/meetAPart.ts): the screens report events, `pullsNext` says where the flow goes, and the save
 * (src/lib/twoPullsSave.ts) reads the session. The dev harness and the page run the same rules
 * (tests/two-pulls.test.mjs).
 *
 * The two sides are equal: the same questions, the same size, the same time. The flow never names a winner
 * and never asks either part to stop. The machine never reads copy: chips arrive as the content's options
 * (`id`, `branch`, `flag`, `selfLike`), and own words are never read, only taken as the conservative case.
 */
import type { HandoffResult } from '../data/capacityTypes';
import type { PullsSide, PullsStopReason } from '../data/partsTypes';
import { BLEND_ANSWERS, type BlendAnswer, type PickedOption } from './meetAPart';

export const PULLS_STEPS = [
  'blend', 'blendBody', 'place', 'feel', 'unblend', 'needsTime', 'stepBack', 'worryA', 'worryB', 'stop', 'bothWant',
  'keepsake', 'close', 'done',
] as const;
export type PullsStep = (typeof PULLS_STEPS)[number];

/** Held breaths at Step back: each zooms the stage out a step (the server's STEP_BACK_MAX). */
export const STEP_BACK_MAX = 5;

/** The 1–7 of parts.md's steps, for the progress track; the gate's screens and done have none. */
export const PULLS_TRACK: Partial<Record<PullsStep, number>> = {
  place: 1, feel: 2, unblend: 2, needsTime: 2, stepBack: 3, worryA: 4, worryB: 4, stop: 4, bothWant: 5, keepsake: 6, close: 7,
};

export interface PullsContext {
  /** What both want has chips (the pair's, or the general ones): the visit can end with a keepsake. */
  hasWants: boolean;
  /** Ask the blending check first. Always true in the app; the harness can turn it off. */
  blendCheck: boolean;
  /** A move of either side has a safety line: crisis resources alongside from the start. */
  safetyLine: boolean;
  /** P2 already ran on entry: "running things" offers only P2's last two choices. */
  p2OnEntry?: boolean;
  p2Band?: 'stirred' | 'flooded';
}

export interface PullsSession {
  /** Where the person put their light on the stage, x then y, 0–1. Log only. */
  lightAt: [number, number] | null;
  /** Ask-fresh: in the order asked, each with its side. */
  feelTowardIds: string[];
  feelTowardSides: PullsSide[];
  /** The side being asked about at Feel / Unblend. */
  side: PullsSide;
  /** Sides that already had their one unblend. */
  unblended: PullsSide[];
  steppedBack: boolean;
  /** The side that needs its own time first (still non-Self after its unblend). */
  needsTimeSide: PullsSide | null;
  /** "Meet it another time" answered yes. */
  anotherTime: boolean;
  stepBackHolds: number;
  worryA: string | null;
  worryB: string | null;
  ownWorryA: string | null;
  ownWorryB: string | null;
  bothWantId: string | null;
  /** The keepsake's answer: true on "Keep this", false on "Not now", null while not asked. */
  kept: boolean | null;
  danger: boolean;
  stopReason: PullsStopReason | null;
  blendCheck?: BlendAnswer;
  handoffs: HandoffResult[];
  /** The orienting close's choice; unset when skipped or not asked. */
  closeId?: string;
  exitStep?: PullsStep;
}

export interface PullsState {
  step: PullsStep;
  session: PullsSession;
  resumeNote: boolean;
  /** P2 ended on "come back later": its message stays until the person goes on, then done. */
  later: boolean;
  /** Crisis resources alongside (never instead): a safety-line move or a danger answer. */
  crisis: boolean;
  p2: { band: 'stirred' | 'flooded'; start: 'card' | 'later' } | null;
}

export type PullsEvent =
  | { type: 'option'; option: PickedOption & { selfLike?: boolean | null } }
  /** Set them out: Continue with the light where it is. */
  | { type: 'place'; at: [number, number] }
  /** "In my words" at a worry. Stored, never read. */
  | { type: 'ownWords'; text: string }
  | { type: 'p2'; outcome: 'resume' | 'override' | 'later'; result?: HandoffResult }
  /** Step back: one held breath. */
  | { type: 'breath' }
  /** Step back: on to the worries. */
  | { type: 'next' }
  | { type: 'close'; choiceId: string | null }
  | { type: 'continue' };


export function initialPulls(ctx: PullsContext): PullsState {
  const session: PullsSession = {
    lightAt: null, feelTowardIds: [], feelTowardSides: [], side: 'a', unblended: [], steppedBack: false, needsTimeSide: null,
    anotherTime: false, stepBackHolds: 0, worryA: null, worryB: null, ownWorryA: null, ownWorryB: null, bothWantId: null,
    kept: null, danger: false, stopReason: null, handoffs: [],
  };
  return { step: ctx.blendCheck ? 'blend' : 'place', session, resumeNote: false, later: false, crisis: ctx.safetyLine, p2: null };
}

/**
 * The next state for an event from the current screen. An event the step doesn't take returns the state
 * unchanged, so a stale tap can never skip a screen.
 */
export function pullsNext(state: PullsState, event: PullsEvent, ctx: PullsContext): PullsState {
  const s = state.session;
  const at = state.step;
  let session = s;
  let next: PullsStep = at;
  let extra: Partial<PullsState> = {};
  const set = (p: Partial<PullsSession>) => { session = { ...session, ...p }; };
  const o = event.type === 'option' ? event.option : null;
  /** After a worry: own words or a tender chip take the conservative stop; a danger chip, danger. */
  const worry = (side: PullsSide, then: PullsStep) => {
    const id = side === 'a' ? 'worryA' : 'worryB';
    const own = side === 'a' ? 'ownWorryA' : 'ownWorryB';
    if (event.type === 'ownWords') {
      set({ [own]: event.text.trim() || null, stopReason: 'own_words' });
      next = 'stop';
    } else if (o) {
      set({ [id]: o.id });
      if (o.flag === 'danger' || o.branch === 'danger') { set({ danger: true, stopReason: 'danger' }); next = 'close'; }
      else if (o.flag === 'tender' || o.branch === 'conservative') { set({ stopReason: 'tender' }); next = 'stop'; }
      else next = then;
    }
  };

  switch (at) {
    case 'blend': {
      const answer = o ? BLEND_ANSWERS[o.id] : undefined;
      if (!o || !answer) break;
      set({ blendCheck: answer });
      if (o.branch === 'body_first') {
        next = 'blendBody';
        extra = { p2: { band: ctx.p2Band ?? 'stirred', start: ctx.p2OnEntry ? 'later' : 'card' } };
      } else next = 'place';
      break;
    }
    case 'blendBody':
      if (event.type === 'p2' && !state.later) {
        if (event.result) set({ handoffs: [...session.handoffs, event.result] });
        if (event.outcome === 'later') { set({ exitStep: 'blend', stopReason: 'later' }); extra = { later: true }; }
        else { next = 'place'; extra = { resumeNote: event.outcome === 'resume', p2: null }; }
      } else if (event.type === 'continue' && state.later) {
        next = 'done';
        extra = { p2: null };
      }
      break;
    case 'place':
      if (event.type === 'place') {
        const c = (n: number) => Math.min(1, Math.max(0, Number.isFinite(n) ? n : 0.5));
        set({ lightAt: [+c(event.at[0]).toFixed(3), +c(event.at[1]).toFixed(3)], side: 'a' });
        next = 'feel';
      }
      break;
    case 'feel': {
      if (!o) break;
      const side = session.side;
      set({ feelTowardIds: [...session.feelTowardIds, o.id], feelTowardSides: [...session.feelTowardSides, side] });
      if (o.branch === 'unblend' || o.selfLike === false) {
        // One unblend a side; still non-Self after it: that side needs its own time first.
        if (session.unblended.includes(side)) { set({ needsTimeSide: side, stopReason: 'not_self' }); next = 'needsTime'; }
        else { set({ unblended: [...session.unblended, side], steppedBack: true }); next = 'unblend'; }
      } else if (side === 'a') { set({ side: 'b' }); next = 'feel'; extra = { resumeNote: false }; }
      else next = 'stepBack';
      break;
    }
    case 'unblend':
      if (!o) break;
      if (o.branch === 'unblend') { set({ needsTimeSide: session.side, stopReason: 'not_self' }); next = 'needsTime'; }
      else next = 'feel'; // asked again about the same side, once
      break;
    case 'needsTime':
      if (!o) break;
      set({ anotherTime: o.branch === 'candidate' });
      next = 'close';
      break;
    case 'stepBack':
      if (event.type === 'breath') {
        if (session.stepBackHolds < STEP_BACK_MAX) set({ stepBackHolds: session.stepBackHolds + 1 });
      } else if (event.type === 'next') next = 'worryA';
      break;
    case 'worryA': worry('a', 'worryB'); break;
    case 'worryB': worry('b', ctx.hasWants ? 'bothWant' : 'close'); break;
    case 'stop':
      // The conservative stop: nothing offers to go further. On to the close.
      if (o || event.type === 'continue') next = 'close';
      break;
    case 'bothWant':
      if (!o) break;
      if (o.branch === 'end') { set({ bothWantId: null }); next = 'close'; } // "Not sure": no keepsake
      else { set({ bothWantId: o.id }); next = 'keepsake'; }
      break;
    case 'keepsake':
      if (o) { set({ kept: o.branch === 'keep' }); next = 'close'; }
      break;
    case 'close':
      if (event.type === 'close') { set({ closeId: event.choiceId ?? undefined }); next = 'done'; }
      break;
    case 'done':
      break;
  }

  if (session === s && next === at && Object.keys(extra).length === 0) return state;
  const moved = next !== at;
  if (next === 'done' && !session.stopReason) session = { ...session, stopReason: 'done' };
  return {
    ...state,
    session,
    step: next,
    resumeNote: moved ? false : state.resumeNote,
    crisis: ctx.safetyLine || session.danger,
    ...extra,
  };
}

/** The keepsake can be offered: a both-want was picked and nothing stopped the visit. */
export const keepsakeOpen = (st: PullsState): boolean =>
  st.session.bothWantId !== null && !st.session.danger && !['own_words', 'tender', 'not_self'].includes(st.session.stopReason ?? '');
