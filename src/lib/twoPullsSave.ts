/**
 * Two pulls in the app: what the page needs around the step machine (src/lib/twoPulls.ts). Pure, so every
 * rule is tested (tests/two-pulls.test.mjs):
 * - readiness: `TWO_PULLS_REQUIRED` (ToolPage's gate and the page show nothing until every line ships);
 * - the entry: `?a=<partId>&b=<partId>` (two kept parts, from the den) or `?pair=<pairId>[&offer=<offerId>]`
 *   (a rule C trail's More than one), resolved against the parts slice and the shipped pairs;
 * - the two sides: names (a kept part's own, else "the part that {move}") and figures;
 * - the session: the machine's state as savePullsSession's patch, the start request, the candidate;
 * - the keepsake as the server builds it, the close's check-back, the Wise mind link.
 */
import type { HandoffResult } from '../data/capacityTypes';
import type { PartsContent, PartsOption, PartsPair } from '../data/partsContentTypes';
import type {
  PullsExitStep, PullsSessionPatch, PullsSide, QueuePartCandidateRequest, StartPullsSessionRequest,
} from '../data/partsTypes';
import { handoffExt } from './bandStore';
import { HOLD_HINT } from '../data/partsTypes';
import { HEADS_UP_GO_ON, HEADS_UP_LOOK, HEADS_UP_PROMPT, MEET_CHROME, optionsFor } from './meetAPartSave';
import { promptCopy, stepOptions, surfaceReady, type SurfaceIds } from './partsContent';
import { dueAtFor } from './spine/windows';
import type { PullsEntry } from './twoPullsLink';
import type { PullsContext, PullsState, PullsStep } from './twoPulls';

export const TWO_PULLS_TOOL = 'two-pulls';

/** The prompts the flow shows (reused ids from Meet a part where the step is the same). */
export const PULLS_PROMPTS = {
  blend: 'gate_blend_check_pulls',
  place: 'pulls_place',
  feel: 'pulls_feel',
  unblend: 'meet_unblend',
  needsTime: 'pulls_needs_time',
  stepBack: 'pulls_step_back',
  hold: 'meet_thank_hold',
  worry: 'pulls_worry',
  bothWant: 'pulls_both_want',
  pairName: 'pulls_pair_name',
  keepsakeBothWant: 'keepsake_both_want',
  keepsakeChoose: 'keepsake_choose',
  stopTitle: 'meet_stop_title',
  stopBody: 'meet_stop_body',
  stopTherapist: 'meet_stop_therapist',
  done: 'meet_done',
} as const;

/** Option ids the screens or the machine read by id. */
export const PULLS_OPTIONS = {
  blendNotice: 'blend_pulls_notice', blendRunning: 'blend_pulls_running', blendNotSure: 'blend_pulls_not_sure',
  keep: 'pulls_keep', notNow: 'pulls_not_now', anotherTime: 'pulls_another_time', needsTimeNotNow: 'pulls_needs_time_not_now',
  worryNotSure: 'pulls_worry_not_sure', bothWantNotSure: 'pulls_both_want_not_sure', ownWords: 'own_words',
} as const;

/**
 * Everything a visit needs by id: the entry gate's far-away heads-up, the hold's hint and Meet a part's
 * house controls (Back, Next, Done) included, as in Meet a part.
 */
export const TWO_PULLS_REQUIRED: SurfaceIds = {
  prompts: [HEADS_UP_PROMPT, ...Object.values(PULLS_PROMPTS), HOLD_HINT],
  options: [HEADS_UP_LOOK, HEADS_UP_GO_ON, ...Object.values(PULLS_OPTIONS), ...Object.values(MEET_CHROME)],
};

/** The steps it borrows from Meet a part need at least one signed-off chip each (feel: both kinds). */
export const PULLS_OPTION_STEPS: readonly (readonly [string, string])[] = [['meet', 'feel'], ['meet', 'unblend'], ['meet', 'stop']];

/** Optional: the close's check-back (two kept parts) and the Wise mind link. Each shows only when it ships. */
export const PULLS_CHECKBACK_PROMPT = 'pulls_close_checkback';
export const PULLS_CHECKBACK_YES = 'pulls_close_checkback_yes';
export const PULLS_CHECKBACK_NO = 'pulls_close_checkback_no';
export const PULLS_CHECKBACK_REQUIRED: SurfaceIds = { prompts: [PULLS_CHECKBACK_PROMPT], options: [PULLS_CHECKBACK_YES, PULLS_CHECKBACK_NO] };
export const PULLS_WISE_MIND = 'pulls_wise_mind';
export const PULLS_WISE_MIND_REQUIRED: SurfaceIds = { prompts: [PULLS_WISE_MIND], options: [] };

/** True only when the whole visit can be shown. */
export function twoPullsReady(content: PartsContent): boolean {
  if (!surfaceReady(content, TWO_PULLS_REQUIRED)) return false;
  if (!PULLS_OPTION_STEPS.every(([flow, step]) => stepOptions(content, flow, step).length > 0)) return false;
  const feel = stepOptions(content, 'meet', 'feel');
  return feel.some((o) => o.selfLike === true) && feel.some((o) => o.branch === 'unblend' || o.selfLike === false);
}

/* ───────── entry ───────── */

export type { PullsEntry } from './twoPullsLink';
export { twoPullsPath } from './twoPullsLink';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const GRAPH_ID = /^[a-z0-9][a-z0-9_-]{0,99}$/;
const OFFER_ID = /^[a-z0-9_]{1,60}:[a-z0-9_]{1,60}(\+[a-z0-9_]{1,60}){0,7}:[a-z0-9_]{1,60}(:[0-9a-f-]{36})?$/;

/** The entry from the address's query (`location.search`); anything malformed is no entry (null). */
export function parsePullsEntry(search: string): PullsEntry | null {
  const q = new URLSearchParams(search);
  const a = q.get('a');
  const b = q.get('b');
  if (a && b && UUID.test(a) && UUID.test(b) && a.toLowerCase() !== b.toLowerCase()) return { kind: 'parts', aId: a, bId: b };
  const pair = q.get('pair');
  if (pair && GRAPH_ID.test(pair) && !a && !b) {
    const offer = q.get('offer');
    return { kind: 'pair', pairId: pair, offerId: offer && OFFER_ID.test(offer) ? offer : null };
  }
  return null;
}

/** A kept part as the parts slice has it. */
export interface PullsKnownPart {
  id: string; name: string | null; tender: boolean; moveIds: string[]; shapeSig: number[] | null; safety?: boolean;
}

export interface PullsSideView {
  side: PullsSide;
  /** The kept part, or null (a pair's side). */
  part: PullsKnownPart | null;
  move: string;
  /** What the screens call it: the part's own name, else "the part that {move}". */
  name: string;
  /** The person's own name for it (kept as written), not a generated one. */
  own: boolean;
}

export interface PullsVisit {
  entry: PullsEntry;
  pair: PartsPair | null;
  a: PullsSideView;
  b: PullsSideView;
}

const pairs = (content: PartsContent): PartsPair[] => content.pairs ?? [];

/** A side's name: the part's own, else the pair-only name with its move's phrase; null when neither ships. */
export function sideName(content: PartsContent, part: PullsKnownPart | null, move: string): { name: string; own: boolean } | null {
  const own = part?.name?.trim();
  if (own) return { name: own, own: true };
  const tpl = promptCopy(content, PULLS_PROMPTS.pairName);
  const phrase = content.moves.find((m) => m.id === move)?.unblendPhrase;
  return tpl && phrase ? { name: tpl.replace('{move}', phrase), own: false } : null;
}

/**
 * Who the visit is with. Two kept parts: both must be in the slice; when their moves form a shipped pair
 * the sides follow the pair's order (so the worries are each side's own), else the route's order with
 * each part's first move. A pair: its two moves. Null when it can't be said (a part not kept, an unknown
 * pair, one move for both): the page then shows nothing.
 */
export function resolveVisit(content: PartsContent, entry: PullsEntry, known: readonly PullsKnownPart[]): PullsVisit | null {
  const view = (side: PullsSide, part: PullsKnownPart | null, move: string): PullsSideView | null => {
    const n = sideName(content, part, move);
    return n ? { side, part, move, ...n } : null;
  };
  if (entry.kind === 'pair') {
    const pair = pairs(content).find((p) => p.id === entry.pairId);
    if (!pair) return null;
    const a = view('a', null, pair.a);
    const b = view('b', null, pair.b);
    return a && b ? { entry, pair, a, b } : null;
  }
  const pa = known.find((p) => p.id === entry.aId);
  const pb = known.find((p) => p.id === entry.bId);
  if (!pa || !pb) return null;
  for (const pair of pairs(content)) {
    const order = pa.moveIds.includes(pair.a) && pb.moveIds.includes(pair.b) ? [pa, pb]
      : pa.moveIds.includes(pair.b) && pb.moveIds.includes(pair.a) ? [pb, pa] : null;
    if (!order) continue;
    const a = view('a', order[0], pair.a);
    const b = view('b', order[1], pair.b);
    if (a && b) return { entry: { kind: 'parts', aId: order[0].id, bId: order[1].id }, pair, a, b };
  }
  const shipped = new Set(content.moves.map((m) => m.id));
  const first = (p: PullsKnownPart, not?: string) =>
    p.moveIds.find((m) => shipped.has(m) && m !== not) ?? p.moveIds.find((m) => m !== not) ?? null;
  const moveA = first(pa);
  const moveB = moveA ? first(pb, moveA) : null;
  if (!moveA || !moveB) return null;
  const a = view('a', pa, moveA);
  const b = view('b', pb, moveB);
  return a && b ? { entry, pair: null, a, b } : null;
}

/** The machine's context for this visit. */
export function pullsContext(content: PartsContent, visit: PullsVisit, p2OnEntry: boolean): PullsContext {
  const safety = new Set(content.moves.filter((m) => m.safetyLine).map((m) => m.id));
  return {
    hasPair: visit.pair !== null,
    blendCheck: true,
    safetyLine: safety.has(visit.a.move) || safety.has(visit.b.move) || visit.a.part?.safety === true || visit.b.part?.safety === true,
    ...(p2OnEntry ? { p2OnEntry: true, p2Band: 'flooded' as const } : {}),
  };
}

/* ───────── what a screen shows ───────── */

const byIds = (content: PartsContent, flow: string, step: string, ids: readonly string[]): PartsOption[] => {
  const all = stepOptions(content, flow, step);
  return ids.map((id) => all.find((o) => o.id === id)).filter((o): o is PartsOption => !!o);
};

/** A side's worry chips (the pair's, that side's), then "Not sure". Without a pair, "Not sure" alone. */
export function worryOptions(content: PartsContent, visit: PullsVisit, side: PullsSide): PartsOption[] {
  const own = visit.pair ? byIds(content, 'pulls', 'worry', side === 'a' ? visit.pair.worryA : visit.pair.worryB) : [];
  return [...own, ...byIds(content, 'pulls', 'worry', [PULLS_OPTIONS.worryNotSure])];
}

/** What they both want: the pair's chips, then "Not sure". */
export function bothWantOptions(content: PartsContent, visit: PullsVisit): PartsOption[] {
  const want = visit.pair ? byIds(content, 'pulls', 'both_want', visit.pair.bothWant) : [];
  return [...want, ...byIds(content, 'pulls', 'both_want', [PULLS_OPTIONS.bothWantNotSure])];
}

/** The step-4 chips, the same for both sides (never "nothing": that's Meet a part's own grounding step). */
export function feelOptions(content: PartsContent): PartsOption[] {
  return stepOptions(content, 'meet', 'feel').filter((o) => o.branch !== 'grounding');
}

/** Meet a part's chips at a borrowed step (unblend, stop). */
export const meetOptions = (content: PartsContent, step: string): PartsOption[] => optionsFor(content, 'meet', step, '');

const fill = (tpl: string, slots: Record<string, string>): string | null => {
  let missing = false;
  const out = tpl.replace(/\{(\w+)\}/g, (_, k: string) => {
    if (k in slots) return slots[k];
    missing = true;
    return '';
  });
  return missing ? null : out;
};
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

/** "If {B} gets its way, what's {A} afraid of?" for a side: {A} is the side asked about. */
export function worryPrompt(content: PartsContent, visit: PullsVisit, side: PullsSide): string | null {
  const tpl = promptCopy(content, PULLS_PROMPTS.worry);
  if (!tpl) return null;
  const [me, them] = side === 'a' ? [visit.a, visit.b] : [visit.b, visit.a];
  const out = fill(tpl, { A: me.name, B: them.name });
  return out && tpl.startsWith('{') && !(tpl.startsWith('{A}') ? me : them).own ? cap(out) : out;
}

/**
 * The keepsake exactly as keepPullsKeepsake builds it (functions/src/parts/pulls/keepsake.ts): the
 * two lines, a generated lead name capitalised, the person's own names as they wrote them.
 */
export function keepsakeLines(content: PartsContent, visit: PullsVisit, wantLabel: string): [string, string] | null {
  const both = promptCopy(content, PULLS_PROMPTS.keepsakeBothWant);
  const choose = promptCopy(content, PULLS_PROMPTS.keepsakeChoose);
  if (!both || !choose) return null;
  const first = fill(both, { A: visit.a.name, B: visit.b.name, want: wantLabel });
  if (!first) return null;
  return [both.startsWith('{A}') && !visit.a.own ? cap(first) : first, choose];
}
export const keepsakeText = (lines: [string, string]): string => `${lines[0]} ${lines[1]}`;

/* ───────── the session ───────── */

export const STEP_EXIT: Record<PullsStep, PullsExitStep> = {
  blend: 'blend', blendBody: 'blend', place: 'place', feel: 'feel', unblend: 'unblend', needsTime: 'needs_time',
  stepBack: 'step_back', worryA: 'worry_a', worryB: 'worry_b', stop: 'stop', bothWant: 'both_want', keepsake: 'keepsake',
  close: 'close', done: 'close',
};

export function startRequest(id: string, visit: PullsVisit): StartPullsSessionRequest {
  const e = visit.entry;
  return {
    id, moveA: visit.a.move, moveB: visit.b.move,
    ...(e.kind === 'parts' ? { aId: e.aId, bId: e.bId, ...(visit.pair ? { pairId: visit.pair.id } : {}) }
      : { pairId: e.pairId, ...(e.offerId ? { offerId: e.offerId } : {}) }),
  };
}

/**
 * The save after an event: the whole visit so far. `extraHandoffs` are the P2 runs outside the machine
 * (on entry, the too-much link). Ask-fresh fields (feelTowardIds, blendCheck, handoffs) live here only.
 */
export function toPatch(state: PullsState, extraHandoffs: readonly HandoffResult[] = []): PullsSessionPatch {
  const s = state.session;
  const patch: PullsSessionPatch = { steppedBack: s.steppedBack, stepBackHolds: s.stepBackHolds };
  if (s.lightAt) patch.lightAt = [...s.lightAt];
  if (s.feelTowardIds.length) { patch.feelTowardIds = [...s.feelTowardIds]; patch.feelTowardSides = [...s.feelTowardSides]; }
  if (s.blendCheck) patch.blendCheck = s.blendCheck;
  const runs = [...extraHandoffs, ...s.handoffs];
  if (runs.length) patch.handoffs = handoffExt(runs);
  if (s.needsTimeSide) patch.needsTimeSide = s.needsTimeSide;
  if (s.worryA) patch.worryA = s.worryA;
  if (s.worryB) patch.worryB = s.worryB;
  if (s.ownWorryA) patch.ownWorryA = s.ownWorryA;
  if (s.ownWorryB) patch.ownWorryB = s.ownWorryB;
  if (s.bothWantId) patch.bothWantId = s.bothWantId;
  const reason = state.later ? 'later' : s.stopReason;
  if (reason) patch.stopReason = reason;
  patch.exitStep = STEP_EXIT[s.exitStep ?? state.step];
  return patch;
}

/** P2 on entry ended on "come back later": the visit stops at the entry. */
export function entryLaterPatch(handoffs: readonly HandoffResult[]): PullsSessionPatch {
  return { ...(handoffs.length ? { handoffs: handoffExt([...handoffs]) } : {}), stopReason: 'later', exitStep: 'entry' };
}

/**
 * "Meet it another time" on a pair's side: a PartCandidate (origin `two_pulls`) with that side's move. A
 * kept part's side is a link to Meet a part for it instead, so nothing is queued.
 */
export function candidateRequest(state: PullsState, visit: PullsVisit, id: string): QueuePartCandidateRequest | null {
  const s = state.session;
  if (!s.anotherTime || !s.needsTimeSide) return null;
  const side = s.needsTimeSide === 'a' ? visit.a : visit.b;
  if (side.part) return null;
  return { id, origin: 'two_pulls', moveIds: [side.move] };
}

/** The kept part a "Meet it another time" link opens Meet a part for (router state, as Me's links). */
export function meetLinkFor(state: PullsState, visit: PullsVisit): { partId: string; moveId: string } | null {
  const side = state.session.needsTimeSide === 'a' ? visit.a : state.session.needsTimeSide === 'b' ? visit.b : null;
  return side?.part ? { partId: side.part.id, moveId: side.move } : null;
}

/** The spine's follow-up type the check-back question needs (src/data/content/spine.json). */
export interface PullsCheckbackType { id: string; enabled: boolean; window: Record<string, unknown> }
export const TWO_PULLS_CHECKBACK_TYPE = 'two_pulls_checkback';

/**
 * Whether the close asks "Check back with both of them in a week?": two kept parts, the visit opened on
 * the server, the orienting close reached (not after P2's later or danger), the copy ships and the type is
 * enabled.
 */
export function offerCheckback(state: PullsState, visit: PullsVisit, o: { content: PartsContent; type: PullsCheckbackType | null; opened: boolean }): boolean {
  if (state.step !== 'done' || state.later || state.session.danger || !o.opened) return false;
  if (visit.entry.kind !== 'parts' || !visit.a.part || !visit.b.part) return false;
  if (!o.type || o.type.id !== TWO_PULLS_CHECKBACK_TYPE || !o.type.enabled) return false;
  return surfaceReady(o.content, PULLS_CHECKBACK_REQUIRED);
}

export function checkbackRequest(type: PullsCheckbackType, id: string, sessionId: string, now: Date): { id: string; sessionId: string; dueAt: string } | null {
  const due = dueAtFor(type.window, now);
  return due ? { id, sessionId, dueAt: due.toISOString() } : null;
}

/**
 * The quiet link after the keepsake (kept, or Not now): "Ask wise mind what's next". Only when Wise mind
 * is a tool (`hasWiseMind`: getToolById('wise-mind')) and its line ships. Two kept parts carry their ids.
 */
export function wiseMindLink(content: PartsContent, visit: PullsVisit, state: PullsState, hasWiseMind: boolean): { to: string; label: string } | null {
  if (!hasWiseMind || state.session.kept === null) return null;
  const label = promptCopy(content, PULLS_WISE_MIND);
  if (!label) return null;
  const e = visit.entry;
  return { to: e.kind === 'parts' ? `/tool/wise-mind?a=${e.aId}&b=${e.bId}` : '/tool/wise-mind', label };
}
