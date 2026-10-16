/**
 * Meet a part's session input, pure (no firebase imports). Ids only, closed sets, own words
 * length-checked and nothing else: the witness own-line rule (never linted, parsed or logged).
 * Messages name the rule, never the value.
 */
import { GRAPH_ID, UUID, ValidationError, graphId, obj, oneOf, uuid } from '../shared/validate';
import { checkExtField } from '../spine/extSchemas';
import { TRAIL_OFFER_ID } from './offers/blocked';
import {
  BLEND_CHECKS, PART_STEP_IDS, PART_STOP_REASONS, TRAILHEAD_KINDS,
  type PartExitStep, type PartSessionPatch, type PartStepId, type TrailheadKind,
} from './sessionTypes';

/** Own words (voice, job, fear, update): a sentence, not an essay. Names have their own 40 (PartsPolicy). */
export const OWN_WORDS_MAX = 200;
/** feelTowardIds holds the non-Self-like answers allowed (PartsPolicy.maxNonSelfAnswers) plus two. */
export const FEEL_TOWARD_EXTRA = 2;
export const DEFAULT_MAX_NON_SELF = 2;
const MAX_STEP_OPTIONS = 8;
const MAX_MOVES = 4;
const MAX_PLACES = 3;
const EXIT_STEPS: readonly PartExitStep[] = [...PART_STEP_IDS, 'blend', 'entry'];

const fail = (m: string): never => { throw new ValidationError(m); };

function ids(v: unknown, max: number, what: string): string[] {
  if (!Array.isArray(v) || v.length > max) return fail(`${what}: expected up to ${max} ids`);
  const out = v.map((x) => (typeof x === 'string' && GRAPH_ID.test(x) ? x : fail(`${what}: expected ids`)));
  if (new Set(out).size !== out.length) fail(`${what}: duplicate ids`);
  return out;
}

/** n numbers, each 0 to 1 (a stored signature); exported for setPartShape (editPlan.ts). */
export function unit(v: unknown, n: number, what: string): number[] {
  if (!Array.isArray(v) || v.length !== n) return fail(`${what}: expected ${n} numbers`);
  return v.map((x) => (typeof x === 'number' && Number.isFinite(x) && x >= 0 && x <= 1 ? x : fail(`${what}: expected 0 to 1`)));
}

/** Trimmed own words, '' / null → null (clears), over OWN_WORDS_MAX → refused. */
function ownWords(v: unknown, what: string): string | null {
  if (v === null || v === undefined) return null;
  if (typeof v !== 'string') return fail(`${what}: expected text`);
  const t = v.trim();
  if (t.length > OWN_WORDS_MAX) fail(`${what}: over ${OWN_WORDS_MAX} characters`);
  return t || null;
}

export interface StartInput {
  id: string;
  trailheadKind: TrailheadKind;
  partId: string | null;
  candidateId: string | null;
  /** A trail offer answered Yes (trailheadKind 'offer' only, and required there). */
  offerId: string | null;
  moveIds: string[];
}

/**
 * getPartsEntry's input: nothing (older clients send `{}`), or `partId`, the part this visit opens on.
 * Lenient on purpose: the gate carries the flood signal, so a bad request must never cost it. Anything
 * but a well-formed id is ignored (no `paused`), other keys too (the uid is never read from data);
 * whether the id is the caller's own part is the query's job.
 */
export function readPartsEntryInput(raw: unknown): { partId: string | null } {
  const v = raw && typeof raw === 'object' ? (raw as Record<string, unknown>).partId : undefined;
  return { partId: typeof v === 'string' && v.length === 36 && UUID.test(v) ? v : null };
}

export function validateStartPartSession(raw: unknown): StartInput {
  const o = obj(raw);
  for (const k of Object.keys(o)) if (!['id', 'trailheadKind', 'partId', 'candidateId', 'offerId', 'moveIds'].includes(k)) fail(`${k}: not accepted`);
  const opt = (v: unknown) => (v === undefined || v === null ? null : uuid(v));
  const trailheadKind = oneOf(o.trailheadKind, TRAILHEAD_KINDS);
  // A trail offer's trailhead names its offer, and only that trailhead does.
  const offerId = o.offerId === undefined || o.offerId === null ? null
    : typeof o.offerId === 'string' && o.offerId.length <= 400 && TRAIL_OFFER_ID.test(o.offerId) ? o.offerId : fail('offerId: expected an offer id');
  if ((trailheadKind === 'offer') !== (offerId !== null)) fail('offerId: with the offer trailhead only, and required there');
  return {
    id: uuid(o.id),
    trailheadKind,
    partId: opt(o.partId),
    candidateId: opt(o.candidateId),
    offerId,
    moveIds: o.moveIds === undefined || o.moveIds === null ? [] : ids(o.moveIds, MAX_MOVES, 'moveIds'),
  };
}

/** The stored properties a patch sets, by name (`null` removes the property). */
export type PatchProps = Record<string, string | boolean | string[] | number[] | null>;

export interface SaveInput {
  id: string;
  /** Step id → option ids, to merge into the stored map. */
  stepIds: Partial<Record<PartStepId, string[]>> | null;
  props: PatchProps;
  final: boolean;
}

/**
 * A save. `maxNonSelfAnswers` is PartsPolicy's (default 2): feelTowardIds holds at most that plus two.
 * Unknown keys are refused, like validateExt.
 */
export function validateSavePartSession(raw: unknown, maxNonSelfAnswers: number = DEFAULT_MAX_NON_SELF): SaveInput {
  const o = obj(raw);
  for (const k of Object.keys(o)) if (!['id', 'patch', 'final'].includes(k)) fail(`${k}: not accepted`);
  if (o.final !== undefined && typeof o.final !== 'boolean') fail('final: expected a boolean');
  const p = obj(o.patch ?? {}) as Record<string, unknown>;
  const props: PatchProps = {};
  let stepIds: SaveInput['stepIds'] = null;
  for (const [k, v] of Object.entries(p)) {
    if (v === undefined) continue;
    switch (k as keyof PartSessionPatch) {
      case 'stepIds': {
        const m = obj(v);
        stepIds = {};
        for (const [step, chosen] of Object.entries(m)) {
          const s = oneOf(step, PART_STEP_IDS);
          stepIds[s] = ids(chosen, MAX_STEP_OPTIONS, `stepIds.${s}`);
        }
        break;
      }
      case 'feelTowardIds': {
        // In order asked; the same answer may come twice (asked again after "give it some room").
        const max = maxNonSelfAnswers + FEEL_TOWARD_EXTRA;
        if (!Array.isArray(v) || v.length > max) fail(`feelTowardIds: expected up to ${max} ids`);
        props.feelTowardIds = (v as unknown[]).map((x) => graphId(x));
        break;
      }
      case 'blendCheck': props.blendCheck = oneOf(v, BLEND_CHECKS); break;
      case 'handoffs': {
        // DEAR MAN's validator for the same shape (ext.er.handoffs): ≤ 4, ids / booleans / *Sec only.
        const checked = checkExtField('er', 'handoffs', v) as unknown[];
        props.handoffsJson = checked.length ? JSON.stringify(checked) : null;
        break;
      }
      case 'steppedBack':
        if (typeof v !== 'boolean') fail('steppedBack: expected a boolean');
        props.steppedBack = v as boolean;
        break;
      case 'stopReason': props.stopReason = oneOf(v, PART_STOP_REASONS); break;
      case 'exitStep': props.exitStep = oneOf(v, EXIT_STEPS); break;
      case 'ownVoice': case 'ownJob': case 'ownFear': case 'ownUpdate':
        props[k] = ownWords(v, k);
        break;
      case 'bodyPlaces': props.bodyPlaces = ids(v, MAX_PLACES, 'bodyPlaces'); break;
      case 'shapeSig': props.shapeSig = unit(v, 5, 'shapeSig'); break;
      case 'soundSig': props.soundSig = v === null ? null : unit(v, 4, 'soundSig'); break;
      default: fail(`patch.${k}: not accepted`);
    }
  }
  return { id: uuid(o.id), stepIds, props, final: o.final === true };
}

/** The stored step map with a patch merged in (later answers to a step replace earlier ones). */
export function mergeStepIds(storedJson: unknown, patch: SaveInput['stepIds']): string | null {
  let stored: Record<string, string[]> = {};
  if (typeof storedJson === 'string') {
    try { stored = JSON.parse(storedJson) as Record<string, string[]>; } catch { stored = {}; }
  }
  if (!patch) return typeof storedJson === 'string' ? storedJson : null;
  const merged = { ...stored, ...patch };
  return Object.keys(merged).length ? JSON.stringify(merged) : null;
}
