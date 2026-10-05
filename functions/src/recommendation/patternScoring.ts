/**
 * Pattern selection for the check-in result (plan E4-1). Pure: the callable runs the queries and
 * passes their rows in; tests run the same functions over tests/fixtures/recommendation-graph.json.
 * Moved from getStateAndTools' phases 1–3 without behaviour change.
 */
import type { ActivationPatternResult, CoOccurrence, EmotionEvidenceRow, PatternDetail, ResponseEvidenceRow } from './types';

/** Candidate patterns per quadrant. Pleasant quadrants (and unknown ones) have none. */
export const QUADRANT_CANDIDATES: Readonly<Record<string, readonly string[]>> = {
  'high-unpleasant': ['acute_alarm', 'chronic_vigilance', 'emotional_flooding', 'social_threat_shame'],
  'low-unpleasant': ['conservation_freeze', 'dissociation_overmodulation', 'rumination_loop', 'reward_drive_low'],
  'high-pleasant': [],
  'low-pleasant': [],
};

/**
 * Patterns that are candidates only while RoutingPolicy is on (Oct 2026 review): Ready to fight is
 * where the plain anger words go, and it has no crisis flag. Off, the kill switch keeps today's four.
 */
export const ROUTED_CANDIDATES: Readonly<Record<string, readonly string[]>> = {
  'high-unpleasant': ['reactive_aggression'],
};

export function candidatesFor(quadrant: string, routed = false): string[] {
  return [...(QUADRANT_CANDIDATES[quadrant] ?? []), ...(routed ? ROUTED_CANDIDATES[quadrant] ?? [] : [])];
}

/** How the check-in's words become graph ids: display name lower-cased, whitespace runs → `_`. */
export function normaliseEmotionId(name: string): string {
  return name.toLowerCase().replace(/\s+/g, '_');
}

export const BASE_SCORE = 0.25;
/** A pattern needs more than this to be considered co-occurring (runner-up). */
export const CO_OCCURRENCE_MIN = 0.35;
/** The graph's primary wins a co-occurrence only when the runner-up scored ≥ 60% of the leader. */
export const CO_OCCURRENCE_SWAP_RATIO = 0.6;

function strengthBonus(strengths: Array<string | null>): number {
  if (strengths.includes('strong')) return 0.3;
  if (strengths.includes('moderate')) return 0.2;
  return 0.1;
}

/** How much each discriminating answer counts: its EVIDENCE_FOR weight × this. Pre-rf-v2.1 (and the kill switch). */
export const DEFAULT_ANSWER_WEIGHT = 2.0;

/** Two scores this close are a tie (they're sums of decimal weights, so == would miss some). */
export const SCORE_EPSILON = 1e-9;

export interface PatternScores {
  /** Total per candidate (the confidence before clipping). */
  scores: Record<string, number>;
  /** The part that came from the person's words (or the no-word intensity heuristic). */
  wordScores: Record<string, number>;
}

/**
 * Per-pattern confidence, with the words' share kept apart. Emotions: each candidate gets (words that
 * reach it / words sent) × 0.4 plus a strength bonus (strongest matched edge). No emotions: the
 * intensity heuristic. Then the discriminating answers' summed evidence weights × `answerWeight`
 * (2 before rf-v2.1; the RoutingPolicy sets it). Insertion order = candidate order.
 */
export function scorePatternParts(o: {
  candidates: readonly string[];
  emotionIds: readonly string[];
  intensityY?: number;
  emotionRows: readonly EmotionEvidenceRow[];
  responseRows: readonly ResponseEvidenceRow[];
  answerWeight?: number;
}): PatternScores {
  const wordScores: Record<string, number> = {};
  for (const pid of o.candidates) wordScores[pid] = 0;

  if (o.emotionIds.length > 0) {
    const byPattern = new Map<string, { words: Set<string>; strengths: Array<string | null> }>();
    for (const r of o.emotionRows) {
      if (!o.candidates.includes(r.patternId)) continue;
      const e = byPattern.get(r.patternId) ?? { words: new Set<string>(), strengths: [] };
      e.words.add(r.emotionId);
      e.strengths.push(r.strength);
      byPattern.set(r.patternId, e);
    }
    for (const [pid, e] of byPattern) {
      wordScores[pid] += (e.words.size / o.emotionIds.length) * 0.4 + strengthBonus(e.strengths);
    }
  } else {
    const y = o.intensityY ?? 0.5;
    for (const pid of o.candidates) {
      if (y > 0.7 && ['acute_alarm', 'emotional_flooding'].includes(pid)) wordScores[pid] += 0.3;
      else if (y > 0.7 && ['chronic_vigilance', 'social_threat_shame'].includes(pid)) wordScores[pid] += 0.15;
      else if (y < 0.3 && ['conservation_freeze', 'reward_drive_low'].includes(pid)) wordScores[pid] += 0.3;
      else if (y < 0.3 && ['dissociation_overmodulation', 'rumination_loop'].includes(pid)) wordScores[pid] += 0.15;
    }
  }

  const scores: Record<string, number> = {};
  for (const pid of o.candidates) scores[pid] = BASE_SCORE + wordScores[pid];
  const w = o.answerWeight ?? DEFAULT_ANSWER_WEIGHT;
  for (const r of o.responseRows) {
    if (!o.candidates.includes(r.patternId)) continue;
    scores[r.patternId] += r.weight * w;
  }
  return { scores, wordScores };
}

/** Totals only (the pre-rf-v2.1 shape; tests and the legacy path use it). */
export function scorePatterns(o: Parameters<typeof scorePatternParts>[0]): Record<string, number> {
  return scorePatternParts(o).scores;
}

export interface RankedPatterns {
  primaryId: string;
  primaryScore: number;
  secondaryId: string | null;
  secondaryScore: number;
}

/**
 * Highest score first. A tie (within SCORE_EPSILON) goes to whichever the person's words favour, when
 * `tieBreak` is given (rf-v2.1: the RoutingPolicy's tieBreak "words"); otherwise, or when the words
 * tie too, to candidate order (the stable sort), as before.
 */
export function rankPatterns(scores: Record<string, number>, tieBreak?: Record<string, number>): RankedPatterns {
  const sorted = Object.entries(scores).sort(([pa, a], [pb, b]) => {
    if (Math.abs(b - a) > SCORE_EPSILON) return b - a;
    if (!tieBreak) return 0;
    const d = (tieBreak[pb] ?? 0) - (tieBreak[pa] ?? 0);
    return Math.abs(d) > SCORE_EPSILON ? d : 0;
  });
  return {
    primaryId: sorted[0][0],
    primaryScore: sorted[0][1],
    secondaryId: sorted.length > 1 ? sorted[1][0] : null,
    secondaryScore: sorted.length > 1 ? sorted[1][1] : 0,
  };
}

export function withConfidence(detail: PatternDetail, score: number): ActivationPatternResult {
  return {
    id: detail.id,
    userFacingLabel: detail.userFacingLabel,
    description: detail.description,
    evidenceGrade: detail.evidenceGrade,
    safetyConstraints: detail.safetyConstraints || [],
    clinicalNotes: detail.clinicalNotes || '',
    confidence: Math.min(score, 1.0),
  };
}

/** Whether the runner-up is strong enough to look for a CO_OCCURS_WITH edge at all. */
export function wantsCoOccurrence(r: RankedPatterns): boolean {
  return Boolean(r.secondaryId) && r.secondaryScore > CO_OCCURRENCE_MIN;
}

/**
 * With a CO_OCCURS_WITH edge between the top two: attach its label, and make the graph's
 * `primaryPatternId` the primary when it isn't already and the runner-up scored ≥ 60% of the leader.
 */
export function applyCoOccurrence(
  r: RankedPatterns,
  primary: ActivationPatternResult,
  secondary: ActivationPatternResult | undefined,
  co: CoOccurrence,
): { pattern: ActivationPatternResult; secondaryPattern?: ActivationPatternResult } {
  const ratio = r.secondaryScore / r.primaryScore;
  if (co.primaryPatternId !== r.primaryId && secondary && ratio >= CO_OCCURRENCE_SWAP_RATIO) {
    return {
      pattern: { ...secondary, confidence: Math.min(r.primaryScore, 1.0) },
      secondaryPattern: { ...primary, confidence: Math.min(r.secondaryScore, 1.0) },
    };
  }
  return { pattern: primary, secondaryPattern: secondary };
}

/** Low-unpleasant guided activities (frontend presentation content keyed by pattern). */
export const GUIDED_ACTIVITY: Readonly<Record<string, string>> = {
  conservation_freeze: 'gentle-movement',
  dissociation_overmodulation: 'sensory-anchor',
  rumination_loop: 'attention-shift',
  reward_drive_low: 'micro-win',
};

export const POSITIVE_STATE: ActivationPatternResult = {
  id: 'positive_state',
  userFacingLabel: "You're in a good place right now",
  description: 'Your system is balanced and regulated',
  evidenceGrade: 'N/A',
  safetyConstraints: [],
  clinicalNotes: '',
  confidence: 1.0,
};
