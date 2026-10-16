/**
 * The part-card writers' input and the pure half of their decisions (docs/design/parts.md, "Parts of
 * me (Me)" and "Still true? = checking back with protectors"). keep.ts reads the part, asks these,
 * then runs one guarded write.
 */
import { GRAPH_ID, ValidationError, obj, oneOf, uuid } from '../shared/validate';
import { NON_ANSWER } from './keepPlan';
import {
  ACTIVE_REVISIT_ANSWERS, JOB_HISTORY_MAX, RATHER_IDS_MAX, RESTING_REVISIT_ANSWERS,
  type PartJobHistoryEntry, type PartRevisitAnswer,
} from './keepTypes';

const fail = (m: string): never => { throw new ValidationError(m); };

function only(o: Record<string, unknown>, keys: string[]) {
  for (const k of Object.keys(o)) if (!keys.includes(k)) fail(`${k}: not accepted`);
}

export interface PartRef { partId: string }
export interface RenameInput extends PartRef { name: string | null }
export interface RestInput extends PartRef { resting: boolean }
export interface RevisitInput extends PartRef { id: string; answer: PartRevisitAnswer; ratherIds: string[] }

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
