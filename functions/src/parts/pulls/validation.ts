/**
 * Two pulls' input, pure (no firebase imports). Ids only, closed sets, own words length-checked and
 * nothing else (the witness own-line rule: never linted, parsed or logged). Messages name the rule,
 * never the value.
 */
import { GRAPH_ID, ValidationError, graphId, intIn, obj, oneOf, uuid } from '../../shared/validate';
import { checkExtField } from '../../spine/extSchemas';
import { validateScheduleItem, type ScheduleInput } from '../../spine/validation';
import { TRAIL_OFFER_ID } from '../offers/blocked';
import { BLEND_CHECKS } from '../sessionTypes';
import { OWN_WORDS_MAX, unit } from '../validation';
import { PULLS_EXIT_STEPS, PULLS_STOP_REASONS, TWO_PULLS_CHECKBACK_TYPE, type PullsSide } from './types';

/** feelTowardIds: each side once, one unblend each, asked again once each. */
export const PULLS_FEEL_MAX = 6;
/** Step back's held breaths. */
export const STEP_BACK_MAX = 5;
const SIDES: readonly PullsSide[] = ['a', 'b'];

const fail = (m: string): never => { throw new ValidationError(m); };
const optUuid = (v: unknown) => (v === undefined || v === null ? null : uuid(v));
const moveId = (v: unknown, what: string) => (typeof v === 'string' && GRAPH_ID.test(v) ? v : fail(`${what}: expected a move id`));

export interface PullsStartInput {
  id: string;
  aId: string | null;
  bId: string | null;
  pairId: string | null;
  offerId: string | null;
  moveA: string;
  moveB: string;
}

/**
 * Two kept parts (from the den), or a pair (from a rule C trail, with its offer): exactly one entry. Two
 * parts may name the pair their moves form (`pairId`, sides in order: `moveA` is the pair's `a`), so the
 * worries and what both want have their chips; a pair alone always does.
 */
export function validateStartPulls(raw: unknown): PullsStartInput {
  const o = obj(raw);
  for (const k of Object.keys(o)) if (!['id', 'aId', 'bId', 'pairId', 'offerId', 'moveA', 'moveB'].includes(k)) fail(`${k}: not accepted`);
  const aId = optUuid(o.aId);
  const bId = optUuid(o.bId);
  const pairId = o.pairId === undefined || o.pairId === null ? null : graphId(o.pairId);
  const offerId = o.offerId === undefined || o.offerId === null ? null
    : typeof o.offerId === 'string' && o.offerId.length <= 400 && TRAIL_OFFER_ID.test(o.offerId) ? o.offerId : fail('offerId: expected an offer id');
  const parts = aId !== null || bId !== null;
  if (parts && (!aId || !bId)) fail('aId, bId: two parts, or neither');
  if (parts && aId === bId) fail('aId, bId: two different parts');
  if (!parts && pairId === null) fail('two parts or a pair');
  if (offerId && (!pairId || parts)) fail('offerId: with a pair only');
  const moveA = moveId(o.moveA, 'moveA');
  const moveB = moveId(o.moveB, 'moveB');
  if (moveA === moveB) fail('moveA, moveB: two different moves');
  return { id: uuid(o.id), aId, bId, pairId, offerId, moveA, moveB };
}

/** Trimmed own words, '' / null → null (clears), over OWN_WORDS_MAX → refused. */
function ownWords(v: unknown, what: string): string | null {
  if (v === null || v === undefined) return null;
  if (typeof v !== 'string') return fail(`${what}: expected text`);
  const t = v.trim();
  if (t.length > OWN_WORDS_MAX) fail(`${what}: over ${OWN_WORDS_MAX} characters`);
  return t || null;
}

/** The stored properties a patch sets, by name (`null` removes the property). */
export type PullsProps = Record<string, string | boolean | number | string[] | number[] | null>;

export interface PullsSaveInput { id: string; props: PullsProps; final: boolean }

export function validateSavePulls(raw: unknown): PullsSaveInput {
  const o = obj(raw);
  for (const k of Object.keys(o)) if (!['id', 'patch', 'final'].includes(k)) fail(`${k}: not accepted`);
  if (o.final !== undefined && typeof o.final !== 'boolean') fail('final: expected a boolean');
  const p = obj(o.patch ?? {});
  const props: PullsProps = {};
  for (const [k, v] of Object.entries(p)) {
    if (v === undefined) continue;
    switch (k) {
      case 'lightAt': props.lightAt = unit(v, 2, 'lightAt'); break;
      case 'feelTowardIds': {
        if (!Array.isArray(v) || v.length > PULLS_FEEL_MAX) fail(`feelTowardIds: expected up to ${PULLS_FEEL_MAX} ids`);
        props.feelTowardIds = (v as unknown[]).map((x) => graphId(x));
        break;
      }
      case 'feelTowardSides': {
        if (!Array.isArray(v) || v.length > PULLS_FEEL_MAX) fail(`feelTowardSides: expected up to ${PULLS_FEEL_MAX}`);
        props.feelTowardSides = (v as unknown[]).map((x) => oneOf(x, SIDES));
        break;
      }
      case 'blendCheck': props.blendCheck = oneOf(v, BLEND_CHECKS); break;
      case 'handoffs': {
        const checked = checkExtField('er', 'handoffs', v) as unknown[];
        props.handoffsJson = checked.length ? JSON.stringify(checked) : null;
        break;
      }
      case 'steppedBack':
        if (typeof v !== 'boolean') fail('steppedBack: expected a boolean');
        props.steppedBack = v as boolean;
        break;
      case 'needsTimeSide': props.needsTimeSide = v === null ? null : oneOf(v, SIDES); break;
      case 'stepBackHolds': props.stepBackHolds = intIn(v, { min: 0, max: STEP_BACK_MAX }); break;
      case 'worryA': case 'worryB': case 'bothWantId':
        props[k] = v === null ? null : graphId(v);
        break;
      case 'ownWorryA': case 'ownWorryB': props[k] = ownWords(v, k); break;
      case 'stopReason': props.stopReason = oneOf(v, PULLS_STOP_REASONS); break;
      case 'exitStep': props.exitStep = oneOf(v, PULLS_EXIT_STEPS); break;
      default: fail(`patch.${k}: not accepted`);
    }
  }
  if (Array.isArray(props.feelTowardIds) !== Array.isArray(props.feelTowardSides)
    || (Array.isArray(props.feelTowardIds) && props.feelTowardIds.length !== (props.feelTowardSides as string[]).length)) {
    fail('feelTowardIds, feelTowardSides: one side per answer');
  }
  return { id: uuid(o.id), props, final: o.final === true };
}

export function validateKeepsake(raw: unknown): { sessionId: string; lineId: string } {
  const o = obj(raw);
  for (const k of Object.keys(o)) if (!['sessionId', 'lineId'].includes(k)) fail(`${k}: not accepted`);
  return { sessionId: uuid(o.sessionId), lineId: uuid(o.lineId) };
}

export interface PullsCheckbackInput { sessionId: string; item: ScheduleInput }

export function validatePullsCheckback(raw: unknown, now: Date): PullsCheckbackInput {
  const o = obj(raw);
  for (const k of Object.keys(o)) if (!['id', 'sessionId', 'dueAt'].includes(k)) fail(`${k}: not accepted`);
  return { sessionId: uuid(o.sessionId), item: validateScheduleItem({ id: o.id, type: TWO_PULLS_CHECKBACK_TYPE, dueAt: o.dueAt }, now) };
}
