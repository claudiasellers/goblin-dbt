/**
 * Deterministic ranking for getWitnessLines (E3 §A5.2.2). Pure: no firebase or driver imports,
 * so tests load it directly (tests/witness-rank.test.mjs).
 *
 * Order:
 *   1. the user's own lines matching the moment's emotion / situation, from fade stage 2;
 *   2. lines this user said landed (yes), from fade stage 1, and lines they kept, when not shown in
 *      the last 3 host records (so a landed line comes back, but not every time);
 *   3. band-allowed level (a filter), then specificity: situation 4 > urge 3 > word 2 > family 1 > generic 0;
 *   4. not shown in the user's last 3 host records;
 *   5. `order`, then `id`.
 * The alternate is the best line at a different level (the "No → another level" answer without a
 * round trip). A flooded beat is one line, at most 8 words.
 */
import type { Band } from '../capacity/types';
import {
  FLOODED_MAX_WORDS, LEVELS_BY_BAND,
  type FadeStage, type LineKind, type WitnessLevel, type WitnessLine,
} from './types';

export interface GraphCandidate {
  id: string;
  text: string;
  textNamed: string | null;
  level: WitnessLevel;
  kind: LineKind;
  voice: 'you' | 'name' | 'none';
  tentative: boolean;
  order: number;
  underneath: string | null;
  /** 4 situation · 3 urge · 2 word · 1 family · 0 generic */
  specificity: number;
}

export interface OwnCandidate {
  id: string;
  text: string;
  emotionIds: string[];
  situationId: string | null;
  moment: string | null;
  /** ISO time the line was last shown back; the least recently used matching line comes first. */
  lastUsedAt: string | null;
}

export interface UserHistory {
  /** Line ids answered landed: yes (one entry per answer). */
  landedYes: string[];
  /** SHOWED_LINE edges with any landed answer. */
  answers: number;
  /** Beats served so far (host records with a SHOWED_LINE). */
  serves: number;
  /** Line ids shown on the user's last 3 host records. */
  recentIds: string[];
  /** Lines the user kept (SAVED_LINE): landed-first whatever the fade stage. */
  savedIds: string[];
  /** Own lines (active) and how often they've been shown back. */
  ownLineCount: number;
  ownLineUses: number;
}

export interface RankInput {
  band: Band;
  moment: string;
  emotionIds: string[];
  situationId: string | null;
  candidates: GraphCandidate[];
  own: OwnCandidate[];
  history: UserHistory | null;   // null: signed out
  excludeIds: string[];
  max: 1 | 2 | 3;
}

/** Phase A fade: 0 default; 1 after 3 landed yes; 2 after the first own line or 8 landed yes; 3 after 5 own-line uses. */
export function fadeStageOf(h: UserHistory | null): FadeStage {
  if (!h) return 0;
  const yes = h.landedYes.length;
  if (h.ownLineUses >= 5) return 3;
  if (h.ownLineCount >= 1 || yes >= 8) return 2;
  if (yes >= 3) return 1;
  return 0;
}

/** "Did that land?": never at flooded; always for the first 10 answers; then on every 5th beat. */
export function askLandedOf(band: Band, h: UserHistory | null): boolean {
  if (band === 'flooded') return false;
  if (!h || h.answers < 10) return true;
  return (h.serves + 1) % 5 === 0;
}

const wordCount = (t: string) => t.trim().split(/\s+/).filter(Boolean).length;

/** Own lines that fit this beat: same situation, or a shared emotion, or (no target) the same moment. */
function ownMatches(o: OwnCandidate, input: RankInput): boolean {
  if (input.band === 'flooded' && wordCount(o.text) > FLOODED_MAX_WORDS) return false;
  if (input.excludeIds.includes(o.id)) return false;
  if (input.situationId && o.situationId === input.situationId) return true;
  if (o.emotionIds.some((e) => input.emotionIds.includes(e))) return true;
  return o.emotionIds.length === 0 && !o.situationId && o.moment === input.moment;
}

const cmp = (a: Array<number | string>, b: Array<number | string>): number => {
  for (let i = 0; i < a.length; i++) {
    if (a[i] < b[i]) return -1;
    if (a[i] > b[i]) return 1;
  }
  return 0;
};

export function toLine(c: GraphCandidate): WitnessLine {
  return {
    id: c.id, source: 'graph', text: c.text, ...(c.textNamed ? { textNamed: c.textNamed } : {}),
    level: c.level, kind: c.kind, voice: c.voice, tentative: c.tentative,
    ...(c.underneath ? { underneathEmotionId: c.underneath } : {}),
  };
}

function ownLine(o: OwnCandidate): WitnessLine {
  return { id: o.id, source: 'own', text: o.text, level: null, kind: 'self', voice: 'none', tentative: false };
}

/** Graph candidates in serve order (band-allowed levels only, excluded ids removed). */
export function orderGraph(input: RankInput): GraphCandidate[] {
  const levels = LEVELS_BY_BAND[input.band];
  const stage = fadeStageOf(input.history);
  const recent = new Set(input.history?.recentIds ?? []);
  const landed = new Set([...(stage >= 1 ? input.history?.landedYes ?? [] : []), ...(input.history?.savedIds ?? [])]);
  const key = (c: GraphCandidate): Array<number | string> => [
    landed.has(c.id) && !recent.has(c.id) ? 0 : 1,
    -c.specificity,
    recent.has(c.id) ? 1 : 0,
    c.order,
    c.id,
  ];
  return input.candidates
    .filter((c) => levels.includes(c.level) && !input.excludeIds.includes(c.id))
    .filter((c) => input.band !== 'flooded' || wordCount(c.text) <= FLOODED_MAX_WORDS)
    .sort((a, b) => cmp(key(a), key(b)));
}

/** The beat's lines: primary, then alternates at levels not yet used, up to `max` (1 at flooded). */
export function rankWitnessLines(input: RankInput): WitnessLine[] {
  const max = input.band === 'flooded' ? 1 : input.max;
  const out: WitnessLine[] = [];
  if (fadeStageOf(input.history) >= 2) {
    const own = input.own.filter((o) => ownMatches(o, input))
      .sort((a, b) => cmp([a.lastUsedAt ?? '', a.id], [b.lastUsedAt ?? '', b.id]));
    if (own[0]) out.push(ownLine(own[0]));
  }
  const usedLevels = new Set<number>();
  for (const c of orderGraph(input)) {
    if (out.length >= max) break;
    if (usedLevels.has(c.level)) continue;
    usedLevels.add(c.level);
    out.push(toLine(c));
  }
  return out;
}
