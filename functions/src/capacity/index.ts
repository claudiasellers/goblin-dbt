/**
 * Capacity band content (ER-01, plan A4-1). Public content, no user data.
 */
import { HttpsError } from 'firebase-functions/v2/https';
import { callable } from '../shared/callable';
import { readTx } from '../shared/neo4j';
import { int } from '../shared/values';
import type { Band, BandMode, BandRule, CapacityContent, HandoffPrimitive } from './types';

export const CAPACITY_VERSION = 'capacity-v1';

/** Probe copy, hand-off copy, primitives and band rules in one call (the client caches it per page load). */
export const getCapacityContent = callable<unknown, CapacityContent>(
  { auth: 'public', label: 'getCapacityContent', errorMessage: 'Could not load content' },
  async () => readTx(async (tx) => {
    const probe = await tx.run(
      `MATCH (p:CapacityProbe {id: 'capacity_probe'}) RETURN p.version AS version, p.contentJson AS content`);
    const rec = probe.records[0];
    if (!rec || rec.get('version') !== CAPACITY_VERSION) {
      throw new HttpsError('failed-precondition', 'Capacity content migration is required');
    }
    const content = JSON.parse(rec.get('content') as string) as Omit<CapacityContent, 'primitives' | 'bandRules'>;
    const prims = await tx.run(
      `MATCH (h:HandoffPrimitive)
       RETURN h.id AS id, h.component AS component, h.direction AS direction, h.bands AS bands,
              h.blank AS blank, h.rank AS rank, h.conceptId AS conceptId, h.copyJson AS copy
       ORDER BY h.rank`);
    const rules = await tx.run(
      `MATCH (r:BandRule) RETURN r.skillId AS skillId, r.band AS band, r.mode AS mode, r.copyJson AS copy
       ORDER BY r.skillId, r.band`);
    const primitives: HandoffPrimitive[] = prims.records.map((r) => ({
      id: r.get('id'),
      component: r.get('component'),
      direction: r.get('direction'),
      bands: r.get('bands') as Band[],
      blank: r.get('blank'),
      rank: int(r.get('rank')),
      conceptId: r.get('conceptId'),
      copy: JSON.parse((r.get('copy') as string | null) ?? '{}'),
    }));
    const bandRules: BandRule[] = rules.records.map((r) => {
      const copy = JSON.parse((r.get('copy') as string | null) ?? '{}') as { headsUp?: string };
      const rule: BandRule = { skillId: r.get('skillId'), band: r.get('band') as Band, mode: r.get('mode') as BandMode };
      if (copy.headsUp) rule.headsUp = copy.headsUp;
      return rule;
    });
    return { ...content, version: CAPACITY_VERSION, primitives, bandRules } as CapacityContent;
  }),
);
