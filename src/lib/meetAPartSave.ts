/**
 * Meet a part in the app: what the page needs around the step machine (src/lib/meetAPart.ts). Pure, so
 * every rule is tested (tests/meet-a-part-page.test.mjs):
 * - readiness: the page (and ToolPage, before it mounts the tool) shows nothing until every prompt and
 *   option the flow can reach is signed off;
 * - the entry: router state, and what `getPartsEntry` says opens first (P2, the far-away heads-up, or
 *   the first step; a failed call is clear, nothing locks);
 * - the session: the machine's `whatToSave` mapped onto lane 2's stored field names (one function,
 *   `toPatch`), the start request, and the keep / candidate requests (ids and the name only).
 */
import type { HandoffResult } from '../data/capacityTypes';
import type { PartsContent } from '../data/partsContentTypes';
import {
  TRAILHEAD_KINDS,
  type KeepPartRequest, type PartExitStep, type PartSessionPatch, type PartStepId, type PartStopReason, type PartsEntry,
  type QueuePartCandidateRequest, type StartPartSessionRequest, type TrailheadKind,
} from '../data/partsTypes';
import { handoffExt } from './bandStore';
import { stepOptions, surfaceReady, type SurfaceIds } from './partsContent';
import { BLEND_ANSWERS, MEET_OPTION_STEP, MEET_PROMPTS, SHAPE_ROUNDS, UPDATE_NOT_YET, whatToSave, type MeetContext, type MeetSession, type MeetState, type MeetStep } from './meetAPart';
import { vecToSig } from './partFigure';
import { dueAtFor } from './spine/windows';

/** Own words (voice, job, fear): the server's OWN_WORDS_MAX. */
export const MEET_OWN_WORDS_MAX = 200;
/** PartsPolicy.nameMaxChars until the policy ships its `limits` (the server's DEFAULT_NAME_MAX). */
export const MEET_NAME_MAX = 40;
/** PartsPolicy.maxNonSelfAnswers until the policy ships its `limits` (the server's DEFAULT_MAX_NON_SELF). */
export const MEET_MAX_NON_SELF = 2;

/** The shipped limits when the policy is signed off, else the pinned defaults. */
export function meetLimits(content: Pick<PartsContent, 'limits'>): { nameMaxChars: number; maxNonSelfAnswers: number } {
  const l = content.limits;
  const n = (v: unknown, d: number) => (typeof v === 'number' && Number.isInteger(v) && v > 0 ? v : d);
  return { nameMaxChars: n(l?.nameMaxChars, MEET_NAME_MAX), maxNonSelfAnswers: n(l?.maxNonSelfAnswers, MEET_MAX_NON_SELF) };
}

/** The far-away heads-up (parts.md "The entry gate"): its prompt and its two choices. */
export const HEADS_UP_PROMPT = 'gate_far_away';
export const HEADS_UP_LOOK = 'far_away_look';
export const HEADS_UP_GO_ON = 'far_away_go_on';

/** Option ids the screens or the machine read by id, not only by branch. */
export const MEET_REQUIRED_OPTIONS: readonly string[] = [
  'own_words', ...Object.keys(BLEND_ANSWERS).filter((id) => !id.startsWith('blend_pulls')), UPDATE_NOT_YET,
  HEADS_UP_LOOK, HEADS_UP_GO_ON,
];

/** The paused part's line (a kept part whose next-day check-back said Louder): shown only when paused. */
export const PAUSED_PROMPT = 'paused_heads_up';

/** Every prompt the visit can show, the heads-up included; the paused line only for a paused visit. */
export const meetPromptIds = (opts: { paused?: boolean } = {}): string[] =>
  [HEADS_UP_PROMPT, ...(opts.paused ? [PAUSED_PROMPT] : []), ...Object.values(MEET_PROMPTS).flat()];

/** What a visit's gate requires by id (the paused line only for a paused visit; scripts/parts/review.mjs reads it). */
export const meetRequired = (opts: { paused?: boolean } = {}): SurfaceIds => ({ prompts: meetPromptIds(opts), options: MEET_REQUIRED_OPTIONS });

/** The option steps a visit needs at least one signed-off option in (flow, step). */
export const MEET_OPTION_STEPS: readonly (readonly [string, string])[] = [
  ...Object.values(MEET_OPTION_STEP).filter((st): st is readonly [string, string] => !!st), ['gate', 'dissociation'],
];

/** Shape it's forced choices take their two words a round from Find the feeling's signed-off copy. */
export type ShapeRoundLabels = readonly (readonly [string, string])[];

export function shapeRoundsReady(rounds: unknown): rounds is ShapeRoundLabels {
  return Array.isArray(rounds) && rounds.length >= SHAPE_ROUNDS
    && rounds.slice(0, SHAPE_ROUNDS).every((r) => Array.isArray(r) && r.length === 2 && r.every((x) => typeof x === 'string' && x.trim() !== ''));
}

/**
 * True only when the whole visit can be shown: every prompt, every option step with at least one
 * option, the ids read directly, at least one move, a "Keep it" yes, and Shape it's words.
 */
export function meetReady(content: PartsContent, rounds: unknown, opts: { paused?: boolean } = {}): boolean {
  if (!surfaceReady(content, meetRequired(opts))) return false;
  if (content.moves.length === 0 || !shapeRoundsReady(rounds)) return false;
  if (!MEET_OPTION_STEPS.every(([flow, step]) => stepOptions(content, flow, step).length > 0)) return false;
  return stepOptions(content, 'meet', 'keep').some((o) => o.branch === 'keep');
}

/* ───────── entry ───────── */

/** Router state a link into Meet a part carries: `{ parts: MeetEntry }`. */
export interface MeetEntry {
  trailheadKind: TrailheadKind;
  partId: string | null;
  candidateId: string | null;
  moveId: string | null;
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const GRAPH_ID = /^[a-z0-9][a-z0-9_-]{0,99}$/;

/** The entry from router state; anything malformed is dropped (default: from Me, nothing named). */
export function parseMeetEntry(state: unknown): MeetEntry {
  const p = (state && typeof state === 'object' ? (state as { parts?: unknown }).parts : null) as Record<string, unknown> | null;
  const o = p && typeof p === 'object' ? p : {};
  const str = (v: unknown, re: RegExp) => (typeof v === 'string' && re.test(v) ? v : null);
  return {
    trailheadKind: TRAILHEAD_KINDS.includes(o.trailheadKind as TrailheadKind) ? o.trailheadKind as TrailheadKind : 'me',
    partId: str(o.partId, UUID),
    candidateId: str(o.candidateId, UUID),
    moveId: str(o.moveId, GRAPH_ID),
  };
}

/** What opens first. P2 and the heads-up never lock: each leads on into the flow. */
export type EntryPlan =
  | { open: 'p2'; band: 'flooded'; blank: boolean; crisis: boolean }
  | { open: 'heads_up' }
  | { open: 'flow' };

/** `getPartsEntry`'s answer as the page's first screen; null (the call failed) is clear. */
export function entryPlan(entry: PartsEntry | null): EntryPlan {
  if (entry?.open === 'p2') {
    // Dissociation in the history: P2 leads with orienting, never the breath (planHandoff's blank rule).
    return { open: 'p2', band: 'flooded', blank: entry.reasons.includes('dissociation_history'), crisis: entry.crisis };
  }
  if (entry?.open === 'far_away') return { open: 'heads_up' };
  return { open: 'flow' };
}

/** The machine's context for this visit. A P2 on entry makes "running things" offer only P2's last two choices. */
export function meetContext(content: PartsContent, plan: EntryPlan, namedEntry: boolean): MeetContext {
  return {
    safetyLineMoves: content.moves.filter((m) => m.safetyLine).map((m) => m.id),
    maxNonSelfAnswers: meetLimits(content).maxNonSelfAnswers,
    namedEntry,
    blendCheck: true,
    ...(plan.open === 'p2' ? { p2OnEntry: true, p2Band: 'flooded' as const } : {}),
  };
}

/**
 * The move the visit starts from: the entry's, else the visited part's first, else the first signed-off
 * move. `named` when the entry already says what's there (Find is answered).
 */
export function startingMove(content: PartsContent, entry: MeetEntry, partMoveIds: readonly string[] = []): { move: string; named: boolean } {
  const known = new Set(content.moves.map((m) => m.id));
  const named = [entry.moveId, ...partMoveIds].find((m): m is string => !!m && known.has(m));
  return named ? { move: named, named: true } : { move: content.moves[0]?.id ?? '', named: false };
}

/* ───────── the session ───────── */

/** Each screen's stored step id (`exitStep`); the close and done are not steps of the part. */
export const STEP_PART: Record<MeetStep, PartExitStep | null> = {
  find: 'find', blend: 'blend', blendBody: 'blend', where: 'where', shape: 'shape', age: 'age', young: 'age', voice: 'voice',
  feel: 'feel_toward', unblend: 'unblend', unblendEnd: 'unblend', nothing: 'nothing', job: 'job', likes: 'job_like',
  guards: 'guards', fear: 'fear', stop: 'fear', update: 'update', canNow: 'update', thank: 'thanks', tender: 'tender',
  rather: 'would_rather', name: 'name', keep: 'keep', close: null, done: null,
};

/**
 * Where each field of `whatToSave(state).partSession` is stored: `start:<field>` on startPartSession,
 * else the PartSessionPatch key (`stepIds.<step>` for a chip). Tested against lane 2's validators.
 */
export const SESSION_FIELD: Record<keyof ReturnType<typeof whatToSave>['partSession'], string> = {
  move: 'start:moveIds', partId: 'start:partId', trailheadKind: 'start:trailheadKind',
  findId: 'stepIds.find', place: 'bodyPlaces', shape: 'shapeSig', ageId: 'stepIds.age', youngId: 'stepIds.age',
  voiceId: 'stepIds.voice', ownVoice: 'ownVoice', feelTowardIds: 'feelTowardIds', steppedBack: 'steppedBack',
  jobId: 'stepIds.job', ownJob: 'ownJob', likesId: 'stepIds.job_like', guardsId: 'stepIds.guards', hurtId: 'stepIds.guards',
  fearId: 'stepIds.fear', ownFear: 'ownFear', updateId: 'stepIds.update', canNowId: 'stepIds.update',
  ratherId: 'stepIds.would_rather', tender: 'stopReason', danger: 'stopReason', stopReason: 'stopReason',
  blendCheck: 'blendCheck', handoffs: 'handoffs', exitStep: 'exitStep',
};

/** The visit's PartSession, opened when its first real screen (or, at Find, its answer) is in. */
export function startRequest(id: string, session: Pick<MeetSession, 'move' | 'partId'>, entry: MeetEntry): StartPartSessionRequest {
  return {
    id, trailheadKind: entry.trailheadKind,
    ...(session.partId ? { partId: session.partId } : {}),
    ...(entry.candidateId ? { candidateId: entry.candidateId } : {}),
    moveIds: session.move ? [session.move] : [],
  };
}

/** Why the visit stopped, in the stored set; null while it is still going. */
export function stopReasonOf(state: MeetState): PartStopReason | null {
  const s = state.session;
  if (s.danger) return 'danger';
  if (s.stopReason === 'worried_part') return 'not_self';
  if (s.stopReason) return s.stopReason;
  if (s.tender) return 'tender';
  if (state.later) return 'later';
  return state.step === 'done' ? 'done' : null;
}

const ids = (...xs: (string | undefined)[]) => xs.filter((x): x is string => !!x);

/**
 * The save after an event: the whole visit so far, in lane 2's names. `extraHandoffs` are the P2 runs
 * outside the machine (on entry, the too-much link, a body aside); they ride with the machine's own.
 * Ask-fresh fields (feelTowardIds, blendCheck, handoffs) go here, never to keepPart.
 */
export function toPatch(state: MeetState, extraHandoffs: readonly HandoffResult[] = []): PartSessionPatch {
  const s = whatToSave(state).partSession;
  const patch: PartSessionPatch = {};
  const stepIds: Partial<Record<PartStepId, string[]>> = {
    find: ids(s.findId), age: ids(s.ageId, s.youngId), voice: ids(s.voiceId), job: ids(s.jobId), job_like: ids(s.likesId),
    guards: ids(s.guardsId), fear: ids(s.fearId), update: ids(s.updateId, s.canNowId), would_rather: ids(s.ratherId),
  };
  for (const k of Object.keys(stepIds) as PartStepId[]) if (!stepIds[k]?.length) delete stepIds[k];
  if (Object.keys(stepIds).length) patch.stepIds = stepIds;
  if (s.feelTowardIds.length) patch.feelTowardIds = [...s.feelTowardIds];
  if (s.blendCheck) patch.blendCheck = s.blendCheck;
  const runs = [...extraHandoffs, ...s.handoffs];
  if (runs.length) patch.handoffs = handoffExt(runs);
  patch.steppedBack = s.steppedBack > 0;
  const reason = stopReasonOf(state);
  if (reason) patch.stopReason = reason;
  const exit = s.exitStep ? STEP_PART[s.exitStep] : STEP_PART[state.step];
  if (exit) patch.exitStep = exit;
  if (s.ownVoice) patch.ownVoice = s.ownVoice;
  if (s.ownJob) patch.ownJob = s.ownJob;
  if (s.ownFear) patch.ownFear = s.ownFear;
  if (s.place) patch.bodyPlaces = [s.place];
  // All zeros is "Can't tell" every round: nothing is said about the shape.
  if (s.shape.some((n) => n !== 0)) patch.shapeSig = vecToSig(s.shape);
  return patch;
}

/** 9b's yes: the session, the part (new, or the one visited) and the name. Nothing else, ever. */
export function keepRequest(state: MeetState, sessionId: string, newPartId: string): KeepPartRequest | null {
  const s = state.session;
  if (s.kept !== true) return null;
  return { sessionId, partId: s.partId ?? newPartId, name: s.name ?? null };
}

/** "Want to get to know that one another time?" answered yes: a candidate, nothing more. */
export function candidateRequest(state: MeetState, id: string, sessionId: string): QueuePartCandidateRequest | null {
  const c = whatToSave(state).candidate;
  return c ? { id, origin: c.origin, moveIds: c.moveIds.slice(0, 4), sessionId } : null;
}

/**
 * P2 on entry ended on "come back later" before any step: the visit is recorded as stopping at the
 * entry, with the hand-offs it ran. Nothing else was asked.
 */
export function entryLaterPatch(handoffs: readonly HandoffResult[]): PartSessionPatch {
  return { ...(handoffs.length ? { handoffs: handoffExt([...handoffs]) } : {}), steppedBack: false, stopReason: 'later', exitStep: 'entry' };
}

/* ───────── what a screen offers ───────── */

/** A step's chips for a move: the move's own first, then the ones offered for every move (content order). */
export function optionsFor(content: PartsContent, flow: string, step: string, move: string) {
  return stepOptions(content, flow, step)
    .filter((o) => o.moves.length === 0 || o.moves.includes(move))
    .sort((a, b) => Number(a.moves.length === 0) - Number(b.moves.length === 0) || a.order - b.order);
}

/** What a move may be guarding, in its OFTEN_GUARDS rank order (a category, never a memory). */
export function guardsFor(content: PartsContent, move: string) {
  return content.hurts
    .flatMap((h) => h.guardedBy.filter((g) => g.moveId === move).map((g) => ({ h, rank: g.rank })))
    .sort((a, b) => a.rank - b.rank).map(({ h }) => h);
}

/** "You don't need to get to know everyone at once.": the prompt, shown when it ships. */
export const TOO_MANY_PROMPT = 'aftercare_too_many';

/**
 * The too-many line (parts.md, Safety): once, on the first real screen, when the gate says the person
 * made several parts lately and this visit isn't to a part they already keep. It never blocks.
 */
export function showTooMany(gate: PartsEntry | null, entry: MeetEntry): boolean {
  return gate?.tooMany === true && !entry.partId;
}

/**
 * A visit to a paused part (getPartsEntry's `paused`, only ever for the part this visit opens on):
 * the paused line on the first real screen, and no check-back question at the close. Never a lock.
 */
export function isPaused(gate: PartsEntry | null, entry: MeetEntry): boolean {
  return gate?.paused === true && entry.partId !== null;
}

/** Where the last screen's Done goes: back to Me when the visit came from there, else home. */
export function doneTarget(entry: MeetEntry): string {
  return entry.trailheadKind === 'me' || entry.trailheadKind === 'settings' ? '/profile' : '/';
}

/* ───────── the check-back question at the close ───────── */

/** "Check back with it tomorrow?" (lane 2's part_checkback) and its two answers. */
export const CHECKBACK_PROMPT = 'close_checkback';
export const CHECKBACK_YES = 'close_checkback_yes';
export const CHECKBACK_NO = 'close_checkback_no';
export const CHECKBACK_TYPE = 'part_checkback';
/** What the close's "Check back with it tomorrow?" requires. */
export const CLOSE_CHECKBACK_REQUIRED: SurfaceIds = { prompts: [CHECKBACK_PROMPT], options: [CHECKBACK_YES, CHECKBACK_NO] };

/** The bit of the spine's follow-up type the question needs (src/data/content/spine.json). */
export interface CheckbackType { id: string; enabled: boolean; window: Record<string, unknown> }

/**
 * Whether the close asks "Check back with it tomorrow?": after the orienting close, when the visit kept
 * a part or opened on one it already keeps (the server checks back with the session's part), its record
 * is on the server, the copy ships and the follow-up type is enabled. Never after P2's "later", a danger
 * ending, or for a paused part (the server refuses those anyway).
 */
export function offerCheckback(state: MeetState, o: { content: PartsContent; type: CheckbackType | null; opened: boolean; paused: boolean }): boolean {
  if (state.step !== 'done' || state.later || state.session.danger || o.paused || !o.opened) return false;
  if (state.session.kept !== true && !state.session.partId) return false;
  if (!o.type || o.type.id !== CHECKBACK_TYPE || !o.type.enabled) return false;
  return surfaceReady(o.content, CLOSE_CHECKBACK_REQUIRED);
}

/** The yes: lane 2's schedulePartCheckback for this visit's session, due in the type's window (tomorrow 10:00 local). */
export function checkbackRequest(type: CheckbackType, id: string, sessionId: string, now: Date): { id: string; sessionId: string; dueAt: string } | null {
  const due = dueAtFor(type.window, now);
  return due ? { id, sessionId, dueAt: due.toISOString() } : null;
}
