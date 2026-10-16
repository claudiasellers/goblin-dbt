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
  ownLines: `MATCH (:User {id: $uid})-[:HAS_OWN_LINE]->(o:OwnLine {status: 'active'})
    WITH o ORDER BY o.createdAt DESC LIMIT 50
    RETURN o {.id, .kind, .area, .status, .source, .text, .emotionIds, .situationId, .moment, .uses,
              lastUsedAt: toString(o.lastUsedAt), confirmedAt: toString(o.confirmedAt), revisitAt: toString(o.revisitAt)} AS o`,
  savedLines: `MATCH (:User {id: $uid})-[k:SAVED_LINE]->(l:ValidationLine)
    RETURN l.id AS lineId, toString(k.confirmedAt) AS confirmedAt ORDER BY k.lastAt DESC LIMIT 50`,
  // Parts off (absent = off) returns no rows at all; set-aside parts are never read by a tool.
  // Nulls sort first under DESC in Cypher, hence the IS NULL keys: never-visited parts go last.
  parts: `MATCH (u:User {id: $uid}) WHERE coalesce(u.partsEnabled, false)
    MATCH (u)-[:HAS_PART]->(p:Part) WHERE p.status IN ['active', 'resting']
    OPTIONAL MATCH (p)-[:USES]->(m:ProtectiveMove)
    WITH p, collect(m.id) AS moveIds
    ORDER BY p.lastVisitedAt IS NULL, p.lastVisitedAt DESC, p.confirmedAt IS NULL, p.confirmedAt DESC, p.id LIMIT 50
    RETURN p {.id, .kind, .area, .status, .source, .name, .tender,
              confirmedAt: toString(p.confirmedAt), revisitAt: toString(p.revisitAt)} AS p, moveIds`,
  partDetail: `MATCH (u:User {id: $uid}) WHERE coalesce(u.partsEnabled, false)
    MATCH (u)-[:HAS_PART]->(p:Part) WHERE p.status IN ['active', 'resting']
    OPTIONAL MATCH (p)-[:GUARDS]->(h:ProtectedHurt)
    WITH p, collect(h.id) AS hurtIds
    ORDER BY p.lastVisitedAt IS NULL, p.lastVisitedAt DESC, p.confirmedAt IS NULL, p.confirmedAt DESC, p.id LIMIT 50
    RETURN p {.id, .ageId, .voiceIds, .ownVoice, .jobIds, .ownJob, .fearIds, .ownFear, .preferredRoleIds,
              .anchorLineId, .places, .shapeSig} AS p, hurtIds`,
};

/** A list property or collected ids: absent → [], nulls dropped, sorted when `sorted`. */
function strings(v: unknown, sorted = false): string[] {
  const out = Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : [];
  return sorted ? [...new Set(out)].sort() : out;
}
const strOrNull = (v: unknown): string | null => (typeof v === 'string' ? v : null);

type Resolver<K extends SliceId> = (tx: ManagedTransaction, uid: string, now: number) => Promise<ProfileSlices[K]>;

const EMPTY: { [K in SliceId]?: () => ProfileSlices[K] } = {
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
  ownLines: async (tx, uid, now) => {
    const r = await tx.run(SLICE_QUERIES.ownLines!, { uid });
    return r.records.map((rec) => {
      const o = rec.get('o') as Record<string, unknown>;
      return {
        id: String(o.id), text: String(o.text ?? ''), emotionIds: (o.emotionIds as string[] | null) ?? [],
        situationId: (o.situationId as string | null) ?? null, moment: (o.moment as string | null) ?? null,
        uses: o.uses == null ? 0 : int(o.uses), lastUsedAt: (o.lastUsedAt as string | null) ?? null, meta: metaFrom(o, now),
      };
    });
  },
  savedLines: async (tx, uid) => {
    const r = await tx.run(SLICE_QUERIES.savedLines!, { uid });
    return r.records.map((rec) => ({ lineId: String(rec.get('lineId')), confirmedAt: (rec.get('confirmedAt') as string | null) ?? null }));
  },
  parts: async (tx, uid, now) => {
    const r = await tx.run(SLICE_QUERIES.parts!, { uid });
    return r.records.map((rec) => {
      const p = rec.get('p') as Record<string, unknown>;
      const meta = metaFrom(p, now);
      return {
        id: String(p.id), name: strOrNull(p.name), status: meta.status === 'resting' ? 'resting' as const : 'active' as const,
        tender: p.tender === true, moveIds: strings(rec.get('moveIds'), true), meta,
      };
    });
  },
  partDetail: async (tx, uid) => {
    const r = await tx.run(SLICE_QUERIES.partDetail!, { uid });
    return r.records.map((rec) => {
      const p = rec.get('p') as Record<string, unknown>;
      return {
        id: String(p.id), ageId: strOrNull(p.ageId),
        voiceIds: strings(p.voiceIds), ownVoice: strOrNull(p.ownVoice),
        jobIds: strings(p.jobIds), ownJob: strOrNull(p.ownJob),
        fearIds: strings(p.fearIds), ownFear: strOrNull(p.ownFear),
        preferredRoleIds: strings(p.preferredRoleIds), anchorLineId: strOrNull(p.anchorLineId),
        places: strings(p.places),
        shapeSig: Array.isArray(p.shapeSig) ? p.shapeSig.map((x) => (typeof x === 'number' ? x : int(x))) : null,
        hurtIds: strings(rec.get('hurtIds'), true),
      };
    });
  },
};

/** Register a resolver for a reserved slice (its owner's PR; A5-2's ownLines / savedLines live above). */
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
