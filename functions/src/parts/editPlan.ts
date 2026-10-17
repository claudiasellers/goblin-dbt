/**
 * The part-card writers' input and the pure half of their decisions (docs/design/parts.md, "Parts of
 * me (Me)" and "Still true? = checking back with protectors"). keep.ts reads the part, asks these,
 * then runs one guarded write.
 */
import { GRAPH_ID, ValidationError, obj, oneOf, uuid } from '../shared/validate';
import { NON_ANSWER } from './keepPlan';
import { unit } from './validation';
import {
  ACTIVE_REVISIT_ANSWERS, ANCHOR_MAX_CHARS, JOB_HISTORY_MAX, RATHER_IDS_MAX, RESTING_REVISIT_ANSWERS,
  type PartJobHistoryEntry, type PartRevisitAnswer,
} from './keepTypes';
import { PART_LAYOUT_MAX, type PartLayoutPosition } from './denTypes';

const fail = (m: string): never => { throw new ValidationError(m); };

function only(o: Record<string, unknown>, keys: string[]) {
  for (const k of Object.keys(o)) if (!keys.includes(k)) fail(`${k}: not accepted`);
}

export interface PartRef { partId: string }
export interface RenameInput extends PartRef { name: string | null }
export interface RestInput extends PartRef { resting: boolean }
export interface RevisitInput extends PartRef { id: string; answer: PartRevisitAnswer; ratherIds: string[] }
/** Find the feeling's "Use this shape for {name}?": the part, and the visit whose shape it takes. */
export interface ShapeInput extends PartRef { toolSessionId: string }
/** Exactly one of the two is set. */
export interface AnchorInput extends PartRef { lineId: string | null; own: string | null }

/** The den's drop: where the person put each part (0..1 across and down). */
export interface LayoutInput { positions: PartLayoutPosition[] }

/** 1 to PART_LAYOUT_MAX positions, one per part, each 0..1. Nothing else on a part is accepted. */
export function validateLayout(raw: unknown): LayoutInput {
  const o = obj(raw);
  only(o, ['positions']);
  if (!Array.isArray(o.positions) || o.positions.length < 1 || o.positions.length > PART_LAYOUT_MAX) {
    fail(`positions: 1 to ${PART_LAYOUT_MAX}`);
  }
  const positions = (o.positions as unknown[]).map((x) => {
    const q = obj(x);
    only(q, ['partId', 'mapX', 'mapY']);
    const [mapX, mapY] = unit([q.mapX, q.mapY], 2, 'mapX, mapY');
    return { partId: uuid(q.partId), mapX, mapY };
  });
  if (new Set(positions.map((x) => x.partId.toLowerCase())).size !== positions.length) fail('positions: one per part');
  return { positions };
}

export function validatePartRef(raw: unknown): PartRef {
  const o = obj(raw);
  only(o, ['partId']);
  return { partId: uuid(o.partId) };
}

export function validateRename(raw: unknown): RenameInput {
  const o = obj(raw);
  only(o, ['partId', 'name']);
  if (o.name !== null && typeof o.name !== 'string') fail('name: expected text or null');
  return { partId: uuid(o.partId), name: o.name as string | null };
}

export function validateRest(raw: unknown): RestInput {
  const o = obj(raw);
  only(o, ['partId', 'resting']);
  if (typeof o.resting !== 'boolean') fail('resting: expected true or false');
  return { partId: uuid(o.partId), resting: o.resting as boolean };
}

/** `ratherIds` only with `new` (1 to 3, the meet flow's `rather` chips; "Not sure yet" is no job). */
export function validateRevisit(raw: unknown): RevisitInput {
  const o = obj(raw);
  only(o, ['id', 'partId', 'answer', 'ratherIds']);
  const answer = oneOf(o.answer, [...ACTIVE_REVISIT_ANSWERS, ...RESTING_REVISIT_ANSWERS]);
  const given = o.ratherIds ?? [];
  if (!Array.isArray(given)) fail('ratherIds: expected ids');
  const ratherIds = (given as unknown[]).map((x) => (typeof x === 'string' && GRAPH_ID.test(x) && !NON_ANSWER.test(x) ? x : fail('ratherIds: expected option ids')));
  if (new Set(ratherIds).size !== ratherIds.length) fail('ratherIds: duplicate ids');
  if (answer === 'new' && (ratherIds.length < 1 || ratherIds.length > RATHER_IDS_MAX)) fail(`ratherIds: 1 to ${RATHER_IDS_MAX} with "new"`);
  if (answer !== 'new' && ratherIds.length > 0) fail('ratherIds: only with "new"');
  return { id: uuid(o.id), partId: uuid(o.partId), answer, ratherIds };
}

/** `{ partId, lineId }` or `{ partId, own }`: exactly one. Own words are trimmed, 1–90 characters, never linted. */
export function validateAnchor(raw: unknown): AnchorInput {
  const o = obj(raw);
  only(o, ['partId', 'lineId', 'own']);
  const hasLine = o.lineId !== undefined && o.lineId !== null;
  const hasOwn = o.own !== undefined && o.own !== null;
  if (hasLine === hasOwn) fail('expected exactly one of lineId or own');
  const lineId = hasLine ? (typeof o.lineId === 'string' && GRAPH_ID.test(o.lineId) ? o.lineId : fail('lineId: expected an id')) : null;
  let own: string | null = null;
  if (hasOwn) {
    if (typeof o.own !== 'string') fail('own: expected text');
    own = (o.own as string).trim();
    if (!own || own.length > ANCHOR_MAX_CHARS) fail(`own: 1 to ${ANCHOR_MAX_CHARS} characters`);
  }
  return { partId: uuid(o.partId), lineId, own };
}

/** `{ partId, toolSessionId }` only: the shape itself is never taken from the client. */
export function validateShape(raw: unknown): ShapeInput {
  const o = obj(raw);
  only(o, ['partId', 'toolSessionId']);
  return { partId: uuid(o.partId), toolSessionId: uuid(o.toolSessionId) };
}

/**
 * The part's `shapeSig` from a stored Find the feeling session (its `dataJson`, as saveFindTheFeelingSession
 * wrote it), or null when it carries no shape: a Tune it visit, an unreadable record, a vector that isn't
 * five numbers from -1 to 1, or one never moved from neutral (all zero: Meet a part keeps no shape then
 * either). Shape it's -1..1 vector becomes the stored 0–1 signature, two decimals (the client's
 * src/lib/partFigure.ts `vecToSig`), checked as Meet a part's keep checks a `shapeSig`.
 */
export function shapeSigFromFtf(dataJson: unknown): number[] | null {
  if (typeof dataJson !== 'string' || !dataJson) return null;
  let vec: unknown;
  try {
    vec = (JSON.parse(dataJson) as { shape?: unknown } | null)?.shape;
  } catch {
    return null;
  }
  if (!Array.isArray(vec) || vec.length !== 5) return null;
  if (!vec.every((x) => typeof x === 'number' && Number.isFinite(x) && x >= -1 && x <= 1)) return null;
  if ((vec as number[]).every((x) => x === 0)) return null;
  try {
    return unit((vec as number[]).map((x) => +((x + 1) / 2).toFixed(2)), 5, 'shapeSig');
  } catch {
    return null;
  }
}

export type PartStatus = 'active' | 'resting' | 'set_aside';

/**
 * The status a still-true answer moves a part to, or null when the answer doesn't fit the status
 * (an active part's four answers; a resting part's two; a set-aside part has no still-true).
 */
export function revisitTransition(status: string | null, answer: PartRevisitAnswer): PartStatus | null {
  if (status === 'active' && ACTIVE_REVISIT_ANSWERS.includes(answer)) return answer === 'resting' ? 'resting' : 'active';
  if (status === 'resting' && RESTING_REVISIT_ANSWERS.includes(answer)) return answer === 'back' ? 'active' : 'resting';
  return null;
}

const strs = (v: unknown): string[] => (Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : []);

function history(json: unknown): PartJobHistoryEntry[] {
  if (typeof json !== 'string' || !json) return [];
  try {
    const a = JSON.parse(json) as unknown;
    return Array.isArray(a) ? (a.filter((x) => x && typeof x === 'object') as PartJobHistoryEntry[]) : [];
  } catch {
    return [];
  }
}

/**
 * "It's doing something new": the old job goes to the history (newest last, the newest
 * JOB_HISTORY_MAX kept; an empty job isn't recorded), the rather ids become the job, and they leave
 * `preferredRoleIds` (it now does what it would rather). The one place a part's ids are removed,
 * and only because the person said so.
 */
export function newJob(part: Record<string, unknown>, ratherIds: string[], until: string) {
  const jobIds = strs(part.jobIds);
  const ownJob = typeof part.ownJob === 'string' && part.ownJob ? part.ownJob : null;
  const past = history(part.jobHistoryJson);
  if (jobIds.length > 0 || ownJob) past.push({ jobIds, ownJob, until });
  return {
    jobIds: [...ratherIds],
    ownJob: null,
    jobHistoryJson: JSON.stringify(past.slice(-JOB_HISTORY_MAX)),
    preferredRoleIds: strs(part.preferredRoleIds).filter((x) => !ratherIds.includes(x)),
  };
}
