/**
 * getPartsEntry as a function of an injected query layer (the insights / recommendation shape):
 * the callable passes graphDeps(uid) (queries.ts), tests pass plain functions. The uid lives in the
 * query layer, so nothing here can read another user's records.
 */
import { entryGate, resolveEntryPolicy, type PartsEntryPolicy } from './gate';
import type { PartsEntry } from './types';

export interface PartsEntryDeps {
  /** The caller's parts setting. Off: the gate reads nothing and answers clear. */
  partsOn(): Promise<boolean>;
  /** PartsPolicy's numbers and Recover's downshiftAt, raw (null when the nodes are missing). */
  policy(): Promise<Partial<Record<keyof PartsEntryPolicy, unknown>> | null>;
  /** The caller's check-ins and Recover sessions in the last `hours`. */
  recent(hours: number, recoverDownshiftAt: number): Promise<{ checkinFlooding: boolean; checkinCrisis: boolean; recoverLoud: boolean }>;
  /** The caller's dissociation / freeze check-ins in the last `days`. */
  dissociation(days: number): Promise<number>;
  /** Parts the caller made in the last `days` (0 while parts are off). */
  partsMade(days: number): Promise<number>;
  /** Whether the caller's own part `partId` is paused now (false for an unknown or someone else's id). */
  partPaused(partId: string): Promise<boolean>;
}

/** What the caller may send: nothing, or one of their own part ids (a visit to a kept part). */
export interface PartsEntryInput {
  partId: string | null;
}

/** What the gate answers with parts off: nothing to say, and nothing read. */
export const PARTS_OFF_ENTRY: PartsEntry = { open: 'clear', reasons: [] };

export async function getPartsEntryHandler(deps: PartsEntryDeps, input: PartsEntryInput = { partId: null }): Promise<PartsEntry> {
  // Parts off: no parts flow can open, so none of the caller's records is read (not an error: nothing).
  if (!(await deps.partsOn())) return { ...PARTS_OFF_ENTRY, reasons: [] };
  const policy = resolveEntryPolicy(await deps.policy());
  const [recent, dissociationCount, made, paused] = await Promise.all([
    deps.recent(policy.floodGateHours, policy.recoverDownshiftAt),
    deps.dissociation(policy.dissociationDays),
    deps.partsMade(policy.tooManyPartsDays),
    input.partId ? deps.partPaused(input.partId) : Promise.resolve(false),
  ]);
  const gate: PartsEntry = entryGate({ ...recent, dissociationCount }, policy);
  return {
    ...gate,
    ...(made >= policy.tooManyPartsCount ? { tooMany: true as const } : {}),
    ...(paused ? { paused: true as const } : {}),
  };
}
