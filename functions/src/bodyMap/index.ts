/**
 * Body map content (docs/design/body-map.md, schema/body-map.cypher). Public content, no user data:
 * the sensation pad's words and the body-mirror maps for the check-in's words. Only signed-off
 * content (status "live") is served.
 */
import { HttpsError } from 'firebase-functions/v2/https';
import { callable } from '../shared/callable';
import { readTx } from '../shared/neo4j';
import { toNumber } from '../shared/values';
import { ValidationError, graphId, obj, str, strArray } from '../shared/validate';
import type { BodyEnergy, BodyMapContent, BodyMapPlace, BodyMirrorMap, BodySuggestion, BodySuggestMark, PadWord, PadZone } from './types';
import { scoreBodyMaps, type ScorableMap } from './suggest';

export const BODY_MAP_VERSION = 'body-map-v1';

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
          `MATCH (m:BodyMap {status: 'live'}) WHERE any(w IN m.wordIds WHERE w IN $ids)
           MATCH (m)-[:SHOWS]->(p:BodyMapPlace)-[:FEELS_AS]->(s:SensationType)
           RETURN m.id AS id, m.label AS label, m.wordIds AS wordIds,
                  collect({region: p.region, sensationId: s.id, label: s.padLabel, energy: s.energy, weight: p.weight}) AS places`,
          { ids: emotionIds });
        const first = (wordIds: string[]) => Math.min(...wordIds.map((w) => emotionIds.indexOf(w)).filter((i) => i >= 0));
        maps = res.records
          .map((r) => {
            const wordIds = (r.get('wordIds') ?? []) as string[];
            const places = (r.get('places') as Array<Record<string, unknown>>).map((p): BodyMapPlace => ({
              region: p.region as string,
              sensationId: p.sensationId as string,
              label: p.label as string,
              energy: p.energy as BodyEnergy,
              weight: toNumber(p.weight) ?? 0,
            }));
            places.sort((a, b) => b.weight - a.weight || a.region.localeCompare(b.region));
            const map: BodyMirrorMap = {
              id: r.get('id') as string,
              label: r.get('label') as string,
              emotionIds: emotionIds.filter((w) => wordIds.includes(w)),
              places,
            };
            return { map, order: first(wordIds) };
          })
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
        `MATCH (m:BodyMap {status: 'live'})-[:SHOWS]->(p:BodyMapPlace)-[:FEELS_AS]->(s:SensationType)
         RETURN m.id AS id, m.label AS label, m.wordIds AS wordIds,
                collect({region: p.region, sensationId: s.id, label: s.padLabel, weight: p.weight}) AS places`);
      return res.records.map((r): ScorableMap => ({
        id: r.get('id') as string,
        label: r.get('label') as string,
        wordIds: (r.get('wordIds') ?? []) as string[],
        places: (r.get('places') as Array<Record<string, unknown>>).map((p) => ({
          region: p.region as string, sensationId: p.sensationId as string, label: p.label as string,
          weight: toNumber(p.weight) ?? 0,
        })),
      }));
    });
    return { suggestions: scoreBodyMaps(marks, maps) };
  },
);
