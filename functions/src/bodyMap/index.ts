/**
 * Body map content (docs/design/body-map.md, schema/body-map.cypher). Public content, no user data:
 * the sensation words and the body-mirror maps for the check-in's words. A map's places come from
 * FELT_AS (the one source of where each emotion is felt) through the emotions it GROUPS; the grid
 * words it answers are the Emotion nodes it MIRRORS. Only signed-off content (status "live") is served.
 */
import { HttpsError } from 'firebase-functions/v2/https';
import { callable } from '../shared/callable';
import { readTx } from '../shared/neo4j';
import { toNumber } from '../shared/values';
import { ValidationError, graphId, obj, str, strArray } from '../shared/validate';
import type { BodyEnergy, BodyMapContent, BodyMirrorMap, BodySuggestion, BodySuggestMark, PadWord, PadZone } from './types';
import { scoreBodyMaps, type ScorableMap } from './suggest';
import { placesFromFelt, type FeltRow } from './places';

export const BODY_MAP_VERSION = 'body-map-v2';

/** The live FELT_AS rows of a map's emotions, collected per map (all-null rows when it has none). */
const MAP_FELT = `OPTIONAL MATCH (m)-[:GROUPS]->(e:Emotion)-[f:FELT_AS {status: 'live'}]->(s:SensationType {padStatus: 'live'})
       RETURN m.id AS id, m.label AS label, m.rank AS rank, wordIds,
              collect({emotionId: e.id, region: f.region, sensationId: s.id, label: s.padLabel, energy: s.energy, weight: f.weight}) AS felt`;

function feltRows(raw: unknown): FeltRow[] {
  return ((raw ?? []) as Array<Record<string, unknown>>).map((f) => ({
    emotionId: (f.emotionId as string | null) ?? null,
    region: (f.region as string | null) ?? null,
    sensationId: (f.sensationId as string | null) ?? null,
    label: (f.label as string | null) ?? null,
    energy: (f.energy as BodyEnergy | null) ?? null,
    weight: f.weight === null || f.weight === undefined ? null : toNumber(f.weight),
  }));
}

/** `emotionIds`: the check-in's grid word ids (optional, at most 20). */
export function validateBodyMapRequest(raw: unknown): { emotionIds: string[] } {
  const d = raw && typeof raw === 'object' && !Array.isArray(raw) ? (raw as Record<string, unknown>) : {};
  if (d.emotionIds === undefined || d.emotionIds === null) return { emotionIds: [] };
  const ids = strArray(d.emotionIds, { max: 20, item: graphId });
  return { emotionIds: [...new Set(ids)] };
}

export const getBodyMapContent = callable<unknown, BodyMapContent>(
  { auth: 'public', label: 'getBodyMapContent', errorMessage: 'Could not load content' },
  async ({ data }) => {
    const { emotionIds } = validateBodyMapRequest(data);
    return readTx(async (tx) => {
      const head = await tx.run(
        `MATCH (c:BodyMapContent {id: 'body_map'}) RETURN c.version AS version, c.regions AS regions`);
      const rec = head.records[0];
      if (!rec || rec.get('version') !== BODY_MAP_VERSION) {
        throw new HttpsError('failed-precondition', 'Body map content migration is required');
      }
      const words = await tx.run(
        `MATCH (s:SensationType) WHERE s.padStatus = 'live'
         RETURN s.id AS id, s.padLabel AS label, s.zones AS zones, s.regions AS regions, s.energy AS energy
         ORDER BY s.padRank`);
      const padWords: PadWord[] = words.records.map((r) => ({
        id: r.get('id'),
        label: r.get('label'),
        zones: (r.get('zones') ?? []) as PadZone[],
        regions: (r.get('regions') ?? []) as string[],
        energy: r.get('energy') as BodyEnergy,
      }));

      let maps: BodyMirrorMap[] = [];
      if (emotionIds.length > 0) {
        const res = await tx.run(
          `MATCH (m:BodyMap {status: 'live'})-[:MIRRORS]->(w:Emotion) WHERE w.id IN $ids
           WITH DISTINCT m
           MATCH (m)-[:MIRRORS]->(mw:Emotion)
           WITH m, collect(DISTINCT mw.id) AS wordIds
           ${MAP_FELT}`,
          { ids: emotionIds });
        const first = (wordIds: string[]) => Math.min(...wordIds.map((w) => emotionIds.indexOf(w)).filter((i) => i >= 0));
        maps = res.records
          .map((r) => {
            const wordIds = (r.get('wordIds') ?? []) as string[];
            const map: BodyMirrorMap = {
              id: r.get('id') as string,
              label: r.get('label') as string,
              emotionIds: emotionIds.filter((w) => wordIds.includes(w)),
              places: placesFromFelt(feltRows(r.get('felt'))),
            };
            return { map, order: first(wordIds) };
          })
          .filter((x) => x.map.places.length > 0)
          .sort((a, b) => a.order - b.order)
          .map((x) => x.map);
      }
      return { version: BODY_MAP_VERSION, regions: (rec.get('regions') ?? []) as string[], padWords, maps };
    });
  },
);

const REGION = /^[a-z][a-z_]{0,31}$/;

/** `marks`: the check-in's marked places (place id + picked sensation ids), at most 20. */
export function validateSuggestRequest(raw: unknown): { marks: BodySuggestMark[] } {
  const d = obj(raw ?? {});
  if (!Array.isArray(d.marks)) return { marks: [] };
  if (d.marks.length > 20) throw new ValidationError('Expected at most 20 items');
  return {
    marks: d.marks.map((m) => {
      const o = obj(m);
      return {
        region: str(o.region, { max: 32, pattern: REGION }),
        sensationIds: o.sensationIds === undefined ? [] : strArray(o.sensationIds, { max: 20, item: graphId }),
      };
    }),
  };
}

/**
 * Body-first entry ("Start with my body"): the signed-off body-mirror maps the marked places look like,
 * strongest first (at most 3), each with its grid words. Replaces src/data/sensationMappings.ts.
 */
export const suggestEmotionsFromBody = callable<unknown, { suggestions: BodySuggestion[] }>(
  { auth: 'public', label: 'suggestEmotionsFromBody', errorMessage: 'Could not load suggestions' },
  async ({ data }) => {
    const { marks } = validateSuggestRequest(data);
    if (marks.length === 0) return { suggestions: [] };
    const maps = await readTx(async (tx) => {
      const res = await tx.run(
        `MATCH (m:BodyMap {status: 'live'})
         OPTIONAL MATCH (m)-[:MIRRORS]->(mw:Emotion)
         WITH m, collect(DISTINCT mw.id) AS wordIds
         ${MAP_FELT}`);
      return res.records.map((r): ScorableMap => ({
        id: r.get('id') as string,
        label: r.get('label') as string,
        wordIds: (r.get('wordIds') ?? []) as string[],
        places: placesFromFelt(feltRows(r.get('felt'))),
      }));
    });
    return { suggestions: scoreBodyMaps(marks, maps) };
  },
);
