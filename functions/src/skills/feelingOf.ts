/**
 * The skill runtime's feeling guide tables (ER-10, docs/design/emotion-guide.md), shaped from the graph's rows. Pure:
 * getSkillContent (./index.ts) and the content snapshot (scripts/content-snapshot/build.mjs) both call it, and
 * scripts/skills/graph_tables.py does the same for the fixture (tests/skill-runtime.test.mjs pins the three).
 *
 * The card shows at most FEELING_CARD_URGES of its parent's emotion urges (by `order`, then id; never one the guide
 * holds and never a DT behaviour urge, `kind: 'behaviour'`) and FEELING_CARD_PLACES of its body map's places,
 * computed from signed-off FELT_AS exactly as getBodyMapContent does (placesFromFelt), strongest first.
 */
import { placesFromFelt, type FeltRow } from '../bodyMap/places';
import type { FeelingRow } from './types';

export const FEELING_CARD_URGES = 3;
export const FEELING_CARD_PLACES = 3;

/** One FeelingGuide row as the query returns it (urges and felt as collected; all-null entries are dropped). */
export interface GuideRow {
  id: string;
  label: string;
  contentJson: string | null;
  ladder: string[] | null;
  urgesHeld: string[] | null;
  urges: Array<{ id: string | null; label: string | null; order: number | null; kind: string | null }>;
  felt: Array<FeltRow & { regionName: string | null }>;
}

const cmp = (a: string, b: string) => (a < b ? -1 : a > b ? 1 : 0);

export function feelingRow(g: GuideRow): FeelingRow {
  const doc = (g.contentJson ? JSON.parse(g.contentJson) : {}) as { function?: string; prompts?: string[] };
  const held = new Set(g.urgesHeld ?? []);
  const seen = new Set<string>();
  const urges = g.urges
    .filter((u): u is { id: string; label: string; order: number | null; kind: string | null } =>
      typeof u.id === 'string' && typeof u.label === 'string' && u.kind !== 'behaviour' && !held.has(u.id))
    .filter((u) => (seen.has(u.id) ? false : (seen.add(u.id), true)))
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0) || cmp(a.id, b.id))
    .slice(0, FEELING_CARD_URGES)
    .map((u) => u.label);
  const names = new Map(g.felt.filter((f) => f.region && f.regionName).map((f) => [f.region as string, f.regionName as string]));
  const body = placesFromFelt(g.felt).slice(0, FEELING_CARD_PLACES).map((p) => ({ region: names.get(p.region) ?? p.region, label: p.label }));
  return { label: g.label, functionLine: doc.function ?? '', prompts: doc.prompts ?? [], urges, body, ladder: g.ladder ?? [] };
}

export function feelingOf(rows: GuideRow[]): Record<string, FeelingRow> {
  const out: Record<string, FeelingRow> = {};
  for (const g of [...rows].sort((a, b) => cmp(a.id, b.id))) out[g.id] = feelingRow(g);
  return out;
}
