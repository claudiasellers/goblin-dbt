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
import { partSafetyCypher } from '../safety/partSafetyFlag';
import { ownDecrypter } from '../shared/crypto';
import { metaFrom } from './meta';
import { PERSON_RISK, PERSON_SAFE, planContacts } from './kinds';
import { PROFILE_NEEDS, type ProfileConsumer, type ProfileSlices, type SliceId } from './types';

/** Words everywhere: own words come first once there are this many distinct ones (PRD ER-10 part 3), and at most this many. */
export const OWN_WORDS_MIN = 5;
export const OWN_WORDS_MAX = 12;

/** The Cypher each resolver runs (params: $uid). Reserved slices have none. */
export const SLICE_QUERIES: Partial<Record<SliceId, string>> = {
  // The person's words (ER-10 part 3): FOUND_WORD, the log aggregate of accepted words, read here for ordering only
  // (never pre-selected, never a node of the log). Most used first, then most recent. A safety-screen word
  // (`Emotion.safetyScreen`: worthless, empty, despair, …) is never moved up: it keeps its place on the square.
  ownWords: `MATCH (:User {id: $uid})-[w:FOUND_WORD]->(e:Emotion)
    WHERE coalesce(e.safetyScreen, false) = false
    WITH e.id AS id, coalesce(w.count, 0) AS n, w.lastAt AS lastAt ORDER BY n DESC, lastAt DESC
    WITH collect(id) AS ids
    RETURN CASE WHEN size(ids) >= ${OWN_WORDS_MIN} THEN ids[0..${OWN_WORDS_MAX}] ELSE [] END AS ids`,
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
    RETURN l.id AS lineId, l.text AS text, toString(k.confirmedAt) AS confirmedAt ORDER BY k.lastAt DESC LIMIT 50`,
  // People (IE-03): active only (a set-aside person is never offered), the most recently used first.
  people: `MATCH (:User {id: $uid})-[:HAS_PERSON]->(p:Person {status: 'active'})
    WITH p ORDER BY coalesce(p.lastUsedAt, p.updatedAt, p.createdAt) DESC, p.id LIMIT 30
    RETURN p {.id, .kind, .area, .status, .source, .valueJson, .refusalsValidation, .safetyRecheckAt,
              confirmedAt: toString(p.confirmedAt), revisitAt: toString(p.revisitAt)} AS p`,
  // Parts off (absent = off) returns no rows at all; set-aside parts are never read by a tool.
  // Nulls sort first under DESC in Cypher, hence the IS NULL keys: never-visited parts go last.
  parts: `MATCH (u:User {id: $uid}) WHERE coalesce(u.partsEnabled, false)
    MATCH (u)-[:HAS_PART]->(p:Part) WHERE p.status IN ['active', 'resting']
    OPTIONAL MATCH (p)-[:USES]->(m:ProtectiveMove)
    WITH p, collect(m.id) AS moveIds
    ORDER BY p.lastVisitedAt IS NULL, p.lastVisitedAt DESC, p.confirmedAt IS NULL, p.confirmedAt DESC, p.id LIMIT 50
    RETURN p {.id, .kind, .area, .status, .source, .name, .tender, .shapeSig, firstPlace: head(coalesce(p.places, [])),
              confirmedAt: toString(p.confirmedAt), revisitAt: toString(p.revisitAt),
              lastVisitedAt: toString(p.lastVisitedAt), pausedUntil: toString(p.pausedUntil)} AS p, moveIds,
           ${partSafetyCypher('p')} AS safety`,
  partDetail: `MATCH (u:User {id: $uid}) WHERE coalesce(u.partsEnabled, false)
    MATCH (u)-[:HAS_PART]->(p:Part) WHERE p.status IN ['active', 'resting']
    OPTIONAL MATCH (p)-[:GUARDS]->(h:ProtectedHurt)
    WITH p, collect(h.id) AS hurtIds
    ORDER BY p.lastVisitedAt IS NULL, p.lastVisitedAt DESC, p.confirmedAt IS NULL, p.confirmedAt DESC, p.id LIMIT 50
    RETURN p {.id, .ageId, .voiceIds, .ownVoice, .jobIds, .ownJob, .fearIds, .ownFear, .preferredRoleIds,
              .anchorLineId, .places, .shapeSig} AS p, hurtIds`,
  // The anchor's text: own words first, else the line it points at, read only through the caller's
  // own edges (an active OwnLine, a ValidationLine they still keep). No text → no entry.
  partAnchors: `MATCH (u:User {id: $uid}) WHERE coalesce(u.partsEnabled, false)
    MATCH (u)-[:HAS_PART]->(p:Part) WHERE p.status IN ['active', 'resting']
    OPTIONAL MATCH (u)-[:HAS_OWN_LINE]->(o:OwnLine {status: 'active'}) WHERE o.id = p.anchorLineId
    OPTIONAL MATCH (u)-[:SAVED_LINE]->(l:ValidationLine) WHERE l.id = p.anchorLineId
    WITH p, coalesce(p.anchorOwn, head(collect(o.text)), head(collect(l.text))) AS text
    ORDER BY p.lastVisitedAt IS NULL, p.lastVisitedAt DESC, p.confirmedAt IS NULL, p.confirmedAt DESC, p.id LIMIT 50
    RETURN p.id AS partId, text`,
  // The den (Me only): the room's parts, the links whose two parts are both in it, the snapshot list.
  // Profile only: how recently each part was spent time with comes from the log in getDen, not here.
  den: `MATCH (u:User {id: $uid}) WHERE coalesce(u.partsEnabled, false)
    OPTIONAL MATCH (u)-[:HAS_PART]->(p:Part) WHERE p.status IN ['active', 'resting']
    WITH u, p ORDER BY p.lastVisitedAt IS NULL, p.lastVisitedAt DESC, p.confirmedAt IS NULL, p.confirmedAt DESC, p.id
    WITH u, collect(p {.id, .name, .status, .tender, .shapeSig, .mapX, .mapY, lastVisitedAt: toString(p.lastVisitedAt),
      safety: ${partSafetyCypher('p')}})[..50] AS parts
    OPTIONAL MATCH (u)-[:HAS_PART_LINK]->(l:PartLink)
    WHERE EXISTS { MATCH (u)-[:HAS_PART]->(la:Part) WHERE la.id = l.aId AND la.status IN ['active', 'resting'] }
      AND EXISTS { MATCH (u)-[:HAS_PART]->(lb:Part) WHERE lb.id = l.bId AND lb.status IN ['active', 'resting'] }
    WITH u, parts, l ORDER BY l.id
    WITH u, parts, collect(l {.id, .kind, .aId, .bId, .bothWantId})[..100] AS links
    OPTIONAL MATCH (u)-[:HAS_DEN_SNAPSHOT]->(s:DenSnapshot)
    WITH parts, links, s ORDER BY s.takenAt DESC
    RETURN parts, links, collect(s {.id, takenAt: toString(s.takenAt)})[..36] AS snapshots`,
  // The kept crisis kit (DT-03), one per person (its id is the kind), active only; own words decrypted in the resolver.
  crisisKit: `MATCH (:User {id: $uid})-[:HAS_PROFILE_FACT]->(p:ProfileFact {kind: 'crisis_kit', status: 'active'})
    RETURN p {.id, .kind, .area, .status, .source, .valueJson,
              confirmedAt: toString(p.confirmedAt), revisitAt: toString(p.revisitAt)} AS p LIMIT 1`,
  // The kept safety plan (CORE-02), one per person, active only; own words (and the contact lists) decrypted in the resolver.
  safetyPlan: `MATCH (:User {id: $uid})-[:HAS_PROFILE_FACT]->(p:ProfileFact {kind: 'safety_plan', status: 'active'})
    RETURN p {.id, .kind, .area, .status, .source, .valueJson,
              confirmedAt: toString(p.confirmedAt), revisitAt: toString(p.revisitAt)} AS p LIMIT 1`,
  // Kept pros & cons cards (DT-10), active only, newest first; own words decrypted in the resolver.
  prosCons: `MATCH (:User {id: $uid})-[:HAS_PROFILE_FACT]->(p:ProfileFact {kind: 'pros_cons', status: 'active'})
    WITH p ORDER BY p.confirmedAt DESC, p.id LIMIT 12
    RETURN p {.id, .kind, .area, .status, .source, .valueJson,
              confirmedAt: toString(p.confirmedAt), revisitAt: toString(p.revisitAt)} AS p`,
  // Things I like (ER-04), active only, newest first; own words decrypted and ids named in the resolver.
  thingsILike: `MATCH (:User {id: $uid})-[:HAS_PROFILE_FACT]->(p:ProfileFact {kind: 'thing_i_like', status: 'active'})
    WITH p ORDER BY p.confirmedAt DESC, p.id LIMIT 60
    RETURN p {.id, .kind, .area, .status, .source, .valueJson,
              confirmedAt: toString(p.confirmedAt), revisitAt: toString(p.revisitAt)} AS p`,
  // What matters to me (ER-09): the one sort (one per person), active only.
  values: `MATCH (:User {id: $uid})-[:HAS_PROFILE_FACT]->(p:ProfileFact {kind: 'values', status: 'active'})
    RETURN p {.id, .kind, .area, .status, .source, .valueJson,
              confirmedAt: toString(p.confirmedAt), revisitAt: toString(p.revisitAt)} AS p LIMIT 1`,
  // The same rows; the resolver keeps only the catalogue id a good thing done was kept as.
  thingsILikePicks: `MATCH (:User {id: $uid})-[:HAS_PROFILE_FACT]->(p:ProfileFact {kind: 'thing_i_like', status: 'active'})
    RETURN p {.id, .valueJson} AS p`,
  // Build mastery (ER-11): the ladder steps already on the I can list, so a done step isn't offered for keeping twice.
  // The general rungs of an area in the person's own words (`own_1`..`own_3`) are left out: each one means something
  // different per area (Spend five minutes on it: the garden, the guitar), so it's always offered.
  iCanRungs: `MATCH (:User {id: $uid})-[:HAS_PROFILE_FACT]->(p:ProfileFact {kind: 'i_can', status: 'active'})
    RETURN p {.id, .valueJson} AS p`,
};

/** A kept thing's picked ids, named by Good things' own options (graph content: `SkillOption`, never a copy). */
export const THING_LABELS = `MATCH (o:SkillOption) WHERE o.id IN $ids RETURN o.id AS id, o.label AS label`;
/** The `SkillOption` id a kept thing's field names (scripts/skills/good_things.py: `kind` chips, `pick` → `activity`). */
export const THING_OPTION: Record<'kind' | 'pick', string> = { kind: 'good_things:kind:', pick: 'good_things:activity:' };
/** The `SkillOption` id prefix a kept value names (scripts/skills/values.py: the `value` cards). */
export const VALUE_OPTION = 'values:value:';
/** The `SkillOption` id prefix a kept I can step names (scripts/skills/build_mastery.py: the `rung` ladders). */
export const RUNG_OPTION = 'build_mastery:rung:';

/**
 * A stored person's value (profile/kinds.ts `person`), its label decrypted; null when it can't be read (a label that
 * no longer decrypts is a person the picker can't name, so it is left out rather than shown blank).
 */
export function personValue(valueJson: unknown, decrypt: (v: unknown) => string | null): {
  label: string; role: string; safe: ProfileSlices['people'][number]['safe']; risk: ProfileSlices['people'][number]['risk'];
  safeAskedAt: string | null;
} | null {
  let v: Record<string, unknown>;
  try { v = JSON.parse(String(valueJson)) as Record<string, unknown>; } catch { return null; }
  const label = decrypt(v.label);
  if (!label || !label.trim()) return null;
  const pick = <T extends string>(x: unknown, allowed: readonly T[]): T | null =>
    (typeof x === 'string' && (allowed as readonly string[]).includes(x) ? x as T : null);
  return {
    label, role: typeof v.role === 'string' ? v.role : 'other',
    safe: pick(v.safe, PERSON_SAFE), risk: pick(v.risk, PERSON_RISK),
    safeAskedAt: typeof v.safeAskedAt === 'string' ? v.safeAskedAt : null,
  };
}

/** A list property or collected ids: absent → [], nulls dropped, sorted when `sorted`. */
function strings(v: unknown, sorted = false): string[] {
  const out = Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : [];
  return sorted ? [...new Set(out)].sort() : out;
}
const strOrNull = (v: unknown): string | null => (typeof v === 'string' ? v : null);
/** A stored `shapeSig` (five numbers) or null. */
const sig = (v: unknown): number[] | null => (Array.isArray(v) ? v.map((x) => (typeof x === 'number' ? x : int(x))) : null);
/** A stored map coordinate (0..1) or null. */
const coord = (v: unknown): number | null => (typeof v === 'number' && Number.isFinite(v) && v >= 0 && v <= 1 ? v : null);
const objs = (v: unknown): Record<string, unknown>[] =>
  (Array.isArray(v) ? v.filter((x): x is Record<string, unknown> => !!x && typeof x === 'object') : []);

type Resolver<K extends SliceId> = (tx: ManagedTransaction, uid: string, now: number) => Promise<ProfileSlices[K]>;

const EMPTY: { [K in SliceId]?: () => ProfileSlices[K] } = {
  bodyFlags: () => null, goals: () => [], copeAheadPlans: () => [],
  boundaryLines: () => [], practicePrefs: () => null, fadeLevels: () => ({}),
  crisisKit: () => null, country: () => null,
};

const RESOLVERS: { [K in SliceId]?: Resolver<K> } = {
  ownWords: async (tx, uid) => {
    const r = await tx.run(SLICE_QUERIES.ownWords!, { uid });
    return strings(r.records[0]?.get('ids'));
  },
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
    return r.records.map((rec) => ({
      lineId: String(rec.get('lineId')), text: String(rec.get('text') ?? ''), confirmedAt: (rec.get('confirmedAt') as string | null) ?? null,
    }));
  },
  people: async (tx, uid, now) => {
    const r = await tx.run(SLICE_QUERIES.people!, { uid });
    if (!r.records.length) return [];
    const decrypt = await ownDecrypter(tx, uid);
    return r.records.flatMap((rec) => {
      const p = rec.get('p') as Record<string, unknown>;
      const v = personValue(p.valueJson, decrypt);
      // DEAR MAN's debrief counts refused asks to be heard (dearMan/debriefProjection.ts); the prep offers Let go at 1.
      const refusals = Number(p.refusalsValidation ?? 0);
      return v ? [{ id: String(p.id), ...v, refusalsValidation: Number.isFinite(refusals) ? Math.max(0, Math.floor(refusals)) : 0,
        safetyRecheckAt: typeof p.safetyRecheckAt === 'string' ? p.safetyRecheckAt : null, meta: metaFrom(p, now) }] : [];
    });
  },
  parts: async (tx, uid, now) => {
    const r = await tx.run(SLICE_QUERIES.parts!, { uid });
    return r.records.map((rec) => {
      const p = rec.get('p') as Record<string, unknown>;
      const meta = metaFrom(p, now);
      return {
        id: String(p.id), name: strOrNull(p.name), status: meta.status === 'resting' ? 'resting' as const : 'active' as const,
        tender: p.tender === true, moveIds: strings(rec.get('moveIds'), true), firstPlace: strOrNull(p.firstPlace),
        shapeSig: sig(p.shapeSig), lastVisitedAt: strOrNull(p.lastVisitedAt), pausedUntil: strOrNull(p.pausedUntil),
        safety: rec.has('safety') && rec.get('safety') === true, meta,
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
        shapeSig: sig(p.shapeSig),
        hurtIds: strings(rec.get('hurtIds'), true),
      };
    });
  },
  partAnchors: async (tx, uid) => {
    const r = await tx.run(SLICE_QUERIES.partAnchors!, { uid });
    const out: Record<string, string> = {};
    for (const rec of r.records) {
      const text = rec.get('text');
      if (typeof text === 'string' && text.trim()) out[String(rec.get('partId'))] = text;
    }
    return out;
  },
  den: async (tx, uid) => {
    const r = (await tx.run(SLICE_QUERIES.den!, { uid })).records[0];
    if (!r) return { parts: [], links: [], snapshots: [] };
    return {
      parts: objs(r.get('parts')).filter((p) => typeof p.id === 'string').map((p) => ({
        id: p.id as string, name: strOrNull(p.name), status: p.status === 'resting' ? 'resting' as const : 'active' as const,
        tender: p.tender === true, shapeSig: sig(p.shapeSig), mapX: coord(p.mapX), mapY: coord(p.mapY),
        lastVisitedAt: strOrNull(p.lastVisitedAt), safety: p.safety === true,
      })),
      links: objs(r.get('links'))
        .filter((l) => typeof l.id === 'string' && typeof l.aId === 'string' && typeof l.bId === 'string'
          && (l.kind === 'covers_for' || l.kind === 'two_pulls'))
        .map((l) => ({
          id: l.id as string, kind: l.kind as 'covers_for' | 'two_pulls', aId: l.aId as string, bId: l.bId as string,
          bothWantId: strOrNull(l.bothWantId),
        })),
      snapshots: objs(r.get('snapshots'))
        .filter((x) => typeof x.id === 'string' && typeof x.takenAt === 'string')
        .map((x) => ({ id: x.id as string, takenAt: x.takenAt as string })),
    };
  },
  thingsILike: async (tx, uid, now) => {
    const r = await tx.run(SLICE_QUERIES.thingsILike!, { uid });
    if (!r.records.length) return [];
    const decrypt = await ownDecrypter(tx, uid);
    const rows = r.records.flatMap((rec) => {
      const p = rec.get('p') as Record<string, unknown>;
      try { return [{ p, v: JSON.parse(String(p.valueJson)) as Record<string, unknown> }]; } catch { return []; }
    });
    // Own words first (what the person called it), then the good thing they did. A thing found and kept only as a
    // chip ("A colour") is no good thing to do today: it stays in Me, out of the pick list.
    const optionIds = (v: Record<string, unknown>) => strings(v.pickIds).slice(0, 1).map((id) => THING_OPTION.pick + id);
    const ids = [...new Set(rows.flatMap(({ v }) => optionIds(v)))];
    const labels = new Map<string, string>();
    if (ids.length) for (const rec of (await tx.run(THING_LABELS, { ids })).records) labels.set(String(rec.get('id')), String(rec.get('label')));
    const out: ProfileSlices['thingsILike'] = [];
    for (const { p, v } of rows) {
      const own = (['kindOwn', 'pickOwn'] as const).map((k) => (typeof v[k] === 'string' ? decrypt(v[k]) : null)).find((x) => x && x.trim());
      const label = own?.trim() || optionIds(v).map((id) => labels.get(id)).find((x) => !!x);
      if (label) out.push({ id: String(p.id), label, meta: metaFrom(p, now) });
    }
    return out;
  },
  values: async (tx, uid, now) => {
    const r = await tx.run(SLICE_QUERIES.values!, { uid });
    if (!r.records.length) return [];
    const p = r.records[0].get('p') as Record<string, unknown>;
    let v: Record<string, unknown>;
    try { v = JSON.parse(String(p.valueJson)) as Record<string, unknown>; } catch { return []; }
    const ids = strings(v.keptIds).slice(0, 3);
    const labels = new Map<string, string>();
    if (ids.length) for (const rec of (await tx.run(THING_LABELS, { ids: ids.map((id) => VALUE_OPTION + id) })).records) labels.set(String(rec.get('id')), String(rec.get('label')));
    const meta = metaFrom(p, now);
    const out: ProfileSlices['values'] = [];
    for (const id of ids) { const label = labels.get(VALUE_OPTION + id); if (label) out.push({ id, label, meta }); }
    if (typeof v.keptOwn === 'string') {
      const own = (await ownDecrypter(tx, uid))(v.keptOwn)?.trim();
      if (own) out.push({ id: 'own', label: own, meta });
    }
    return out;
  },
  thingsILikePicks: async (tx, uid) => {
    const r = await tx.run(SLICE_QUERIES.thingsILikePicks!, { uid });
    const ids = new Set<string>();
    for (const rec of r.records) {
      try { for (const id of strings((JSON.parse(String((rec.get('p') as Record<string, unknown>).valueJson)) as Record<string, unknown>).pickIds).slice(0, 1)) ids.add(id); } catch { /* unreadable: skip */ }
    }
    return [...ids].map((id) => ({ id }));
  },
  iCanRungs: async (tx, uid) => {
    const r = await tx.run(SLICE_QUERIES.iCanRungs!, { uid });
    const ids = new Set<string>();
    for (const rec of r.records) {
      try { for (const id of strings((JSON.parse(String((rec.get('p') as Record<string, unknown>).valueJson)) as Record<string, unknown>).rungIds).slice(0, 1)) if (!id.startsWith('own_')) ids.add(id); } catch { /* unreadable: skip */ }
    }
    return [...ids].map((id) => ({ id }));
  },
  crisisKit: async (tx, uid, now) => {
    const r = await tx.run(SLICE_QUERIES.crisisKit!, { uid });
    if (!r.records.length) return null;
    const p = r.records[0].get('p') as Record<string, unknown>;
    let v: Record<string, unknown>;
    try { v = JSON.parse(String(p.valueJson)) as Record<string, unknown>; } catch { return null; }
    const decrypt = await ownDecrypter(tx, uid);
    const own = (k: string) => (typeof v[k] === 'string' ? decrypt(v[k]) : null);
    return {
      id: String(p.id), bodyIds: strings(v.bodyIds), bodyOwn: own('bodyOwn'), handsIds: strings(v.handsIds), handsOwn: own('handsOwn'),
      sootheIds: strings(v.sootheIds), sootheOwn: own('sootheOwn'), wordsIds: strings(v.wordsIds), wordsOwn: own('wordsOwn'),
      placeIds: strings(v.placeIds), placeOwn: own('placeOwn'), reasonsIds: strings(v.reasonsIds), reasonsOwn: own('reasonsOwn'),
      meta: metaFrom(p, now),
    };
  },
  safetyPlan: async (tx, uid, now) => {
    const r = await tx.run(SLICE_QUERIES.safetyPlan!, { uid });
    if (!r.records.length) return null;
    const p = r.records[0].get('p') as Record<string, unknown>;
    let v: Record<string, unknown>;
    try { v = JSON.parse(String(p.valueJson)) as Record<string, unknown>; } catch { return null; }
    const decrypt = await ownDecrypter(tx, uid);
    const own = (k: string) => (typeof v[k] === 'string' ? decrypt(v[k]) : null);
    // A list that won't decrypt or parse reads as empty: the rest of the plan still opens.
    const list = <T>(k: string, which: 'people' | 'pros'): T[] => {
      const raw = own(k);
      if (!raw) return [];
      try { return planContacts(raw, which as 'people') as unknown as T[]; } catch { return []; }
    };
    return {
      id: String(p.id), signsIds: strings(v.signsIds), signsOwn: own('signsOwn'), copingIds: strings(v.copingIds), copingOwn: own('copingOwn'),
      kit: v.kit === true, distractIds: strings(v.distractIds), distractOwn: own('distractOwn'),
      people: list('peopleOwn', 'people'), pros: list('prosOwn', 'pros'),
      saferIds: strings(v.saferIds), saferOwn: own('saferOwn'), reasonsIds: strings(v.reasonsIds), reasonsOwn: own('reasonsOwn'),
      hearOwn: own('hearOwn'), meta: metaFrom(p, now),
    };
  },
  prosCons: async (tx, uid, now) => {
    const r = await tx.run(SLICE_QUERIES.prosCons!, { uid });
    if (!r.records.length) return [];
    const decrypt = await ownDecrypter(tx, uid);
    const out: ProfileSlices['prosCons'] = [];
    for (const rec of r.records) {
      const p = rec.get('p') as Record<string, unknown>;
      let v: Record<string, unknown>;
      try { v = JSON.parse(String(p.valueJson)) as Record<string, unknown>; } catch { continue; }
      const own = (k: string) => (typeof v[k] === 'string' ? decrypt(v[k]) : null);
      out.push({
        id: String(p.id), pullIds: strings(v.pullIds), pullOwn: own('pullOwn'), longIds: strings(v.longIds), longOwn: own('longOwn'),
        givesIds: strings(v.givesIds), givesOwn: own('givesOwn'), costIds: strings(v.costIds), costOwn: own('costOwn'),
        keepsIds: strings(v.keepsIds), keepsOwn: own('keepsOwn'), meta: metaFrom(p, now),
      });
    }
    return out;
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

/** The name slice alone (Me's greeting): Me reads every kept item through getMe, never a tool's slices. */
export async function readNameSlice(tx: ManagedTransaction, uid: string): Promise<ProfileSlices['name']> {
  return RESOLVERS.name!(tx, uid, Date.now());
}

/** User.profileVersion (0 before any profile write). */
export async function readProfileVersion(tx: ManagedTransaction, uid: string): Promise<number> {
  const r = await tx.run(`MATCH (u:User {id: $uid}) RETURN coalesce(u.profileVersion, 0) AS v`, { uid });
  const v = r.records[0]?.get('v');
  return v == null ? 0 : int(v);
}
