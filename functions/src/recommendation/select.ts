/**
 * The check-in result's tool step, by pattern × band (plan E4-3; E4 §2.3). Pure: no queries, no
 * firebase. Order of evaluation (Index §5.1 #8):
 *
 *   rows for the primary pattern whose `bands` include the band (active only)
 *   → emotion gates (`addresses`: a user word is in the concept's set; `none_named`: no words;
 *     `words`: a user word is one the row names, the reviewed per-word rules)
 *   → HARD_FILTERS in order: band (flooded → body / orient only), direction (blank → nothing
 *     `down`), contraindication (hook: CONTRAINDICATED_FOR → primary/secondary pattern or a
 *     medical flag; nothing is authored in Phase A)
 *   → rank: priority, then the user's words the concept addresses, then the pattern's emotions it
 *     addresses (today's signal, now a tie-break), then app tool id (deterministic)
 *   → primary: the first without `requiresPrior`
 *   → swap: the first remaining with a different skillKind and not change + change (diversity), except
 *     a tool with a row reviewed to sit `beside` the first card's tool (12 Nov 2026: the review's "Say no
 *     beside Problem Solve"), which skips both checks, and only when the result is neither blank nor has a
 *     co-occurring pattern (those keep the orienting backup); a `requiresPrior` row may only fill this slot,
 *     marked `after_primary`
 *   → fallback: RoutingPolicy.fallbackConceptId (5-4-3-2-1) when nothing survives
 *   → applyMiddlePath (WMP-04 v0): labels only; `receiveFirst` = the first card is a change skill.
 * Nothing clinical is decided here: every row, tag and gate is graph content (content.py).
 */
import type {
  Band, Direction, PatternSlice, RejectReason, RoutingConcept, RoutingPolicy, RoutingRow, Side, SkillKind, Slot,
} from './types';

export interface SelectInput {
  primary: PatternSlice;
  /** Co-occurring pattern: contributes to the contraindication hook only (blank is resolved by the caller). */
  secondary?: PatternSlice | null;
  band: Band;
  blank: boolean;
  /** The user's words as graph ids (normalised). */
  userEmotionIds: readonly string[];
  policy: Pick<RoutingPolicy, 'maxCards'>;
  fallback: RoutingConcept | null;
  /** Safety batch: filled from the profile's body flags. Always [] in Phase A. */
  medicalFlags?: readonly string[];
}

export interface RoutingPick {
  concept: RoutingConcept;
  ruleId: string;
  slot: Slot;
  side: Side;
  direction: Direction;
  skillKind: SkillKind;
  sequence?: 'after_primary';
  reason: 'pattern_band' | 'emotion_gate' | 'fallback';
}

export interface Rejection {
  toolId: string;
  ruleId: string;
  reason: RejectReason;
}

export interface SelectOutput {
  picks: RoutingPick[];
  filtered: Rejection[];
  receiveFirst: boolean;
}

interface Candidate {
  row: RoutingRow;
  concept: RoutingConcept;
  side: Side;
  direction: Direction;
  userOverlap: number;
  patternOverlap: number;
}

type HardFilter = (c: Candidate, ctx: SelectInput) => RejectReason | null;

const BODY_FIRST: readonly SkillKind[] = ['body', 'orient'];

export const HARD_FILTERS: ReadonlyArray<{ id: string; test: HardFilter }> = [
  { id: 'band', test: (c, ctx) => (ctx.band === 'flooded' && !BODY_FIRST.includes(c.concept.skillKind) ? 'band' : null) },
  { id: 'direction', test: (c, ctx) => (ctx.blank && (c.direction === 'down' || c.concept.direction === 'down') ? 'direction' : null) },
  {
    id: 'contraindication',
    test: (c, ctx) => {
      const patterns = [ctx.primary.id, ctx.secondary?.id].filter(Boolean) as string[];
      if (c.concept.contraPatterns.some((p) => patterns.includes(p))) return 'contraindicated';
      if (c.concept.contraFlags.some((f) => (ctx.medicalFlags ?? []).includes(f))) return 'contraindicated';
      return null;
    },
  },
];

const overlap = (a: readonly string[], b: readonly string[]) => a.filter((x) => b.includes(x)).length;

function passesGate(row: RoutingRow, concept: RoutingConcept, words: readonly string[]): boolean {
  if (row.emotionGate === 'addresses') return overlap(words, concept.addresses) > 0;
  if (row.emotionGate === 'none_named') return words.length === 0;
  if (row.emotionGate === 'words') return overlap(words, row.words) > 0;
  return true;
}

export function rank(a: Candidate, b: Candidate): number {
  return a.row.priority - b.row.priority
    || b.userOverlap - a.userOverlap
    || b.patternOverlap - a.patternOverlap
    || (a.concept.appToolId < b.concept.appToolId ? -1 : a.concept.appToolId > b.concept.appToolId ? 1 : 0);
}

function pick(c: Candidate, slot: Slot, sequence?: 'after_primary'): RoutingPick {
  return {
    concept: c.concept, ruleId: c.row.id, slot, side: c.side, direction: c.direction, skillKind: c.concept.skillKind,
    ...(sequence ? { sequence } : {}),
    reason: c.row.emotionGate ? 'emotion_gate' : 'pattern_band',
  };
}

/** WMP-04 v0: order unchanged; the first card being a change skill means "receive first". */
export function applyMiddlePath(picks: RoutingPick[]): { picks: RoutingPick[]; receiveFirst: boolean } {
  return { picks, receiveFirst: picks[0]?.side === 'change' };
}

export function selectRecommendations(ctx: SelectInput): SelectOutput {
  const filtered: Rejection[] = [];
  const reject = (c: { row: RoutingRow; concept: RoutingConcept }, reason: RejectReason) =>
    filtered.push({ toolId: c.concept.appToolId, ruleId: c.row.id, reason });

  const candidates: Candidate[] = [];
  for (const { row, concept } of ctx.primary.rows) {
    if (row.active === false || !row.bands.includes(ctx.band)) continue;
    if (!passesGate(row, concept, ctx.userEmotionIds)) { reject({ row, concept }, 'emotion_gate'); continue; }
    const c: Candidate = {
      row, concept,
      side: row.side ?? concept.side,
      direction: row.direction ?? concept.direction,
      userOverlap: overlap(ctx.userEmotionIds, concept.addresses),
      patternOverlap: overlap(ctx.primary.emotions, concept.addresses),
    };
    const failed = HARD_FILTERS.map((f) => f.test(c, ctx)).find((r) => r !== null);
    if (failed) { reject(c, failed); continue; }
    candidates.push(c);
  }
  candidates.sort(rank);

  // One card per tool: the best-ranked row wins.
  const seen = new Set<string>();
  // A tool's reviewed pairs: the union of `beside` over every row of it that survived, so a better-ranked
  // row without `beside` doesn't hide the pairing.
  const besideByTool = new Map<string, Set<string>>();
  for (const c of candidates) {
    const set = besideByTool.get(c.concept.appToolId) ?? new Set<string>();
    for (const t of c.row.beside ?? []) set.add(t);
    besideByTool.set(c.concept.appToolId, set);
  }
  // Pairs only on a plain result: blank or a co-occurring pattern keeps the orienting backup (Gate 2, 12 Nov).
  const pairsAllowed = !ctx.blank && !ctx.secondary;
  const ranked = candidates.filter((c) => (seen.has(c.concept.appToolId) ? false : (seen.add(c.concept.appToolId), true)));

  const picks: RoutingPick[] = [];
  const first = ranked.find((c) => !c.row.requiresPrior);
  if (first) {
    picks.push(pick(first, 'primary'));
    if (ctx.policy.maxCards > 1) {
      for (const c of ranked) {
        if (c === first) continue;
        const bothChange = c.side === 'change' && first.side === 'change';
        const reviewedPair = pairsAllowed && (besideByTool.get(c.concept.appToolId)?.has(first.concept.appToolId) ?? false);
        if (!reviewedPair && (c.concept.skillKind === first.concept.skillKind || bothChange)) { reject(c, 'diversity'); continue; }
        picks.push(pick(c, 'swap', c.row.requiresPrior ? 'after_primary' : undefined));
        break;
      }
    }
  } else if (ctx.fallback) {
    const f = ctx.fallback;
    picks.push({ concept: f, ruleId: 'fallback', slot: 'primary', side: f.side, direction: f.direction, skillKind: f.skillKind, reason: 'fallback' });
  }
  const mp = applyMiddlePath(picks);
  return { picks: mp.picks, filtered, receiveFirst: mp.receiveFirst };
}
