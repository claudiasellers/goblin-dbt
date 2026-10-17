/**
 * getPartStory (docs/design/parts.md, "The part card"): one read for one of the caller's own active or
 * resting parts, its story built in storyBuild.ts. Someone else's part, a set-aside one or an unknown id:
 * the same not-found. Parts off: nothing at all.
 *
 * The profile parts (the part, the den slice) and the log aggregates (still-true answers, the stats'
 * tags and visits) are read here, in the callable, the way getDen reads recency: a profile slice resolver
 * never reads a `:LogRecord`. Every match starts at the caller's User and goes through their own edges.
 */
import { HttpsError } from 'firebase-functions/v2/https';
import type { ManagedTransaction } from 'neo4j-driver';
import { ValidationError, obj, uuid } from '../shared/validate';
import { readProfileSlices } from '../profile/slices';
import { userKey } from '../userdata/ownership';
import { partStats } from './stats';
import { readStatsRows } from './statsQueries';
import { buildPartStory, type StoryRows } from './storyBuild';
import type { GetPartStoryRequest, GetPartStoryResponse } from './storyTypes';

export const STORY_PART_QUERY = `
  MATCH (u:User {id: $uid})-[:HAS_PART]->(pt:Part {key: $partKey})
  WHERE coalesce(u.partsEnabled, false) AND pt.status IN ['active', 'resting']
  RETURN pt.id AS id, toString(pt.createdAt) AS createdAt, coalesce(pt.tender, false) AS tender, pt.status AS status,
         pt.jobIds AS jobIds, pt.ownJob AS ownJob, pt.jobHistoryJson AS jobHistoryJson
`;

/** The part's still-true answers: when, and which answer (never anything typed). */
export const STORY_REVISITS_QUERY = `
  MATCH (u:User {id: $uid})-[:HAS_PART_REVISIT]->(r:PartRevisit)-[:OF_PART]->(pt:Part {key: $partKey})
  WHERE coalesce(u.partsEnabled, false) AND (u)-[:HAS_PART]->(pt)
  RETURN toString(r.createdAt) AS at, r.answer AS answer
  ORDER BY r.createdAt LIMIT 200
`;

/** The caller's den snapshots (one a day at most): when, and the layout. */
export const STORY_SNAPSHOTS_QUERY = `
  MATCH (u:User {id: $uid})-[:HAS_DEN_SNAPSHOT]->(s:DenSnapshot)
  WHERE coalesce(u.partsEnabled, false)
  RETURN toString(s.takenAt) AS takenAt, s.layoutJson AS layoutJson
  ORDER BY s.takenAt LIMIT 400
`;

export interface StoryDeps {
  /** Parts on, and the rows for this part (null when it isn't the caller's active or resting part). */
  story(partId: string): Promise<{ partsOn: false } | { partsOn: true; rows: StoryRows | null }>;
}

export function validateStoryRef(raw: unknown): GetPartStoryRequest {
  const o = obj(raw);
  for (const k of Object.keys(o)) if (k !== 'partId') throw new ValidationError(`${k}: not accepted`);
  return { partId: uuid(o.partId) };
}

/** One part's story. Parts off: nothing. Not the caller's active or resting part: not found. */
export async function getPartStoryHandler(input: GetPartStoryRequest, deps: StoryDeps, now: Date = new Date()): Promise<GetPartStoryResponse> {
  const st = await deps.story(input.partId);
  if (!st.partsOn) return { moments: [], helped: [], links: [] };
  if (!st.rows) throw new HttpsError('not-found', 'Part not found');
  return buildPartStory(st.rows, now);
}

const str = (v: unknown): string | null => (typeof v === 'string' && v.length > 0 ? v : null);
const strs = (v: unknown): string[] => (Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : []);

export function storyDeps(tx: ManagedTransaction, uid: string): StoryDeps {
  return {
    async story(partId) {
      const stats = await readStatsRows(tx, uid);
      if (!stats.partsOn) return { partsOn: false };
      const partKey = userKey(uid, partId);
      const p = (await tx.run(STORY_PART_QUERY, { uid, partKey })).records[0];
      if (!p) return { partsOn: true, rows: null };
      const revisits = (await tx.run(STORY_REVISITS_QUERY, { uid, partKey })).records
        .map((r) => ({ at: str(r.get('at')) ?? '', answer: str(r.get('answer')) ?? '' }))
        .filter((r) => r.at && r.answer);
      const snapshots = (await tx.run(STORY_SNAPSHOTS_QUERY, { uid })).records
        .map((r) => ({ takenAt: str(r.get('takenAt')) ?? '', layoutJson: str(r.get('layoutJson')) }))
        .filter((s) => s.takenAt);
      const { den } = await readProfileSlices(tx, uid, 'me');
      const id = String(p.get('id'));
      return {
        partsOn: true,
        rows: {
          timeZone: stats.timeZone,
          part: {
            id, createdAt: str(p.get('createdAt')), tender: p.get('tender') === true,
            status: p.get('status') === 'resting' ? 'resting' : 'active',
            jobIds: strs(p.get('jobIds')), ownJob: str(p.get('ownJob')), jobHistoryJson: str(p.get('jobHistoryJson')),
          },
          revisits,
          snapshots,
          room: {
            parts: den.parts.map((x) => ({
              id: x.id, name: x.name, status: x.status, tender: x.tender, shapeSig: x.shapeSig, mapX: x.mapX, mapY: x.mapY, safety: x.safety,
            })),
            links: den.links,
          },
          stats: partStats(stats.tags.filter((t) => t.partId === id), stats.sessions.filter((s) => s.partId === id), stats.timeZone),
        },
      };
    },
  };
}
