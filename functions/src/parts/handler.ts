/**
 * getPartsEntry as a function of an injected query layer (the insights / recommendation shape):
 * the callable passes graphDeps(uid) (queries.ts), tests pass plain functions. The uid lives in the
 * query layer, so nothing here can read another user's records.
 */
import { entryGate, resolveEntryPolicy, type PartsEntryPolicy } from './gate';
import type { PartsEntry } from './types';

export interface PartsEntryDeps {
  /** PartsPolicy's numbers and Recover's downshiftAt, raw (null when the nodes are missing). */
  policy(): Promise<Partial<Record<keyof PartsEntryPolicy, unknown>> | null>;
  /** The caller's check-ins and Recover sessions in the last `hours`. */
  recent(hours: number, recoverDownshiftAt: number): Promise<{ checkinFlooding: boolean; checkinCrisis: boolean; recoverLoud: boolean }>;
  /** The caller's dissociation / freeze check-ins in the last `days`. */
  dissociation(days: number): Promise<number>;
  /** Parts the caller made in the last `days` (0 while parts are off). */
  partsMade(days: number): Promise<number>;
}

export async function getPartsEntryHandler(deps: PartsEntryDeps): Promise<PartsEntry> {
  const policy = resolveEntryPolicy(await deps.policy());
  const [recent, dissociationCount, made] = await Promise.all([
    deps.recent(policy.floodGateHours, policy.recoverDownshiftAt),
    deps.dissociation(policy.dissociationDays),
    deps.partsMade(policy.tooManyPartsDays),
  ]);
  const gate = entryGate({ ...recent, dissociationCount }, policy);
  return made >= policy.tooManyPartsCount ? { ...gate, tooMany: true } : gate;
}
