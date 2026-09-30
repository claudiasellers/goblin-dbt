/**
 * The single read path into the profile layer (PR-P1, plan §5.4). A tool gets only the slices
 * PROFILE_NEEDS declares for it, resolved in one read transaction.
 *
 * Resolvers may touch only :ProfileItem labels, profile edges, User fields and graph content, never
 * a :LogRecord (the log is never used to pre-fill a live flow). tests/profile-layer.test.mjs lints
 * SLICE_QUERIES for that.
 */
import type { ManagedTransaction } from 'neo4j-driver';
import { int } from '../shared/values';
import { metaFrom } from './meta';
import { PROFILE_NEEDS, type ProfileConsumer, type ProfileSlices, type SliceId } from './types';

/** The Cypher each resolver runs (params: $uid). Reserved slices have none. */
export const SLICE_QUERIES: Partial<Record<SliceId, string>> = {
  name: `MATCH (u:User {id: $uid}) RETURN u.displayName AS displayName`,
  quietHours: `MATCH (:User {id: $uid})-[:HAS_PROFILE_FACT]->(p:ProfileFact {kind: 'quiet_hours', status: 'active'})
    RETURN p {.id, .kind, .area, .status, .source, .valueJson,
              confirmedAt: toString(p.confirmedAt), revisitAt: toString(p.revisitAt)} AS p`,
  patterns: `MATCH (:User {id: $uid})-[:HAS_PATTERN]->(m:MyPattern {status: 'active'})
    RETURN m {.id, .kind, .area, .status, .source, .patternKind, .toolId, .patternId,
              confirmedAt: toString(m.confirmedAt), revisitAt: toString(m.revisitAt)} AS m`,
};

type Resolver<K extends SliceId> = (tx: ManagedTransaction, uid: string, now: number) => Promise<ProfileSlices[K]>;

const EMPTY: { [K in SliceId]?: () => ProfileSlices[K] } = {
  ownLines: () => [], savedLines: () => [],
  people: () => [], bodyFlags: () => null, values: () => [], goals: () => [], copeAheadPlans: () => [],
  boundaryLines: () => [], practicePrefs: () => null, fadeLevels: () => ({}), ownWords: () => [],
  thingsILike: () => [], crisisKit: () => null, safetyPlan: () => null, country: () => null,
};

const RESOLVERS: { [K in SliceId]?: Resolver<K> } = {
  name: async (tx, uid) => {
    const r = await tx.run(SLICE_QUERIES.name!, { uid });
    const dn = r.records[0]?.get('displayName') as string | null | undefined;
    return { firstName: dn?.trim().split(/\s+/)[0] || null };
  },
  quietHours: async (tx, uid, now) => {
    const r = await tx.run(SLICE_QUERIES.quietHours!, { uid });
    const p = r.records[0]?.get('p') as Record<string, unknown> | undefined;
    if (!p) return null;
    try {
      const v = JSON.parse(String(p.valueJson)) as { start: string; end: string };
      return { start: v.start, end: v.end, meta: metaFrom(p, now) };
    } catch {
      return null;
    }
  },
  patterns: async (tx, uid, now) => {
    const r = await tx.run(SLICE_QUERIES.patterns!, { uid });
    return r.records.map((rec) => {
      const m = rec.get('m') as Record<string, unknown>;
      return { id: String(m.id), patternKind: 'what_helps' as const, toolId: (m.toolId as string | null) ?? null,
        patternId: (m.patternId as string | null) ?? null, meta: metaFrom(m, now) };
    });
  },
};

/** Register a resolver for a reserved slice (its owner's PR, e.g. A5-2 ownLines / savedLines). */
export function registerSliceResolver<K extends SliceId>(id: K, r: Resolver<K>): void {
  (RESOLVERS as Record<string, unknown>)[id] = r;
}

/** Resolve the declared slices for a consumer inside an open read transaction. */
export async function readProfileSlices<T extends ProfileConsumer>(
  tx: ManagedTransaction, uid: string, consumer: T, now: number = Date.now(),
): Promise<Pick<ProfileSlices, (typeof PROFILE_NEEDS)[T][number]>> {
  const out: Record<string, unknown> = {};
  for (const id of PROFILE_NEEDS[consumer] as readonly SliceId[]) {
    const r = RESOLVERS[id] as Resolver<SliceId> | undefined;
    out[id] = r ? await r(tx, uid, now) : EMPTY[id]!();
  }
  return out as Pick<ProfileSlices, (typeof PROFILE_NEEDS)[T][number]>;
}

/** User.profileVersion (0 before any profile write). */
export async function readProfileVersion(tx: ManagedTransaction, uid: string): Promise<number> {
  const r = await tx.run(`MATCH (u:User {id: $uid}) RETURN coalesce(u.profileVersion, 0) AS v`, { uid });
  const v = r.records[0]?.get('v');
  return v == null ? 0 : int(v);
}
