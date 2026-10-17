/**
 * Trails (docs/design/parts.md, "Discovery: trails"): the types the evaluator and its query layer
 * share. Built switched off: every `TrailRule.enabled` and `PartsPolicy.offersEnabled` is false, and
 * nothing here writes. The offer task (TrailOffer, answerTrailOffer, the card) consumes these.
 */

/** One move-bearing log record, already reduced to ids by the query layer. Never any text. */
export interface TrailRecord {
  /** The record's key (evidence points at keys, never text). */
  key: string;
  /** ISO instant: a ToolSession's start, a check-in's timestamp, a detail session's createdAt. */
  at: string;
  /** 'opposite-action' | 'find-the-feeling' | 'recovering-from-invalidation' | 'dear-man' | 'problem-solve' | 'checkin' | 'urge-surfing' | … */
  toolId: string;
  /** The graph sources that expressed a counted move, e.g. { label: 'ActionUrge', id: 'anger-lash' }. */
  sources: { label: string; id: string }[];
  /** The moves those sources express through counted (approved, or with the dry run's flag draft) EXPRESSES edges. */
  moveIds: string[];
  /** Only values a TrailContext row can phrase. */
  contexts: { trigger?: string; event?: string };
  /** PartTags on this record (TAGS → it), any source. */
  taggedPartIds: string[];
}

export type TrailContextKey = 'trigger' | 'event' | 'timeBand';
/** The order ties break in: the person's own situation first, the clock last. */
export const CONTEXT_KEYS: readonly TrailContextKey[] = ['trigger', 'event', 'timeBand'];
/** TrailContext timeBand values (stats.ts's bands, singular). */
export type TrailTimeBand = 'morning' | 'afternoon' | 'evening' | 'night';

export interface Episode {
  at: string;
  endAt: string;
  moveIds: string[];
  contexts: { trigger?: string; event?: string; timeBand: TrailTimeBand };
  /** Every record's tool, in time order. */
  toolIds: string[];
  /** Move id → the tools whose records expressed it (Rule A's tool count reads this, not toolIds). */
  moveToolIds: Record<string, string[]>;
  recordKeys: string[];
  taggedPartIds: string[];
  sources: TrailRecord['sources'];
}

export interface EpisodeBuild {
  episodes: Episode[];
  /** Records whose context disagreed with the episode's first value for that key (kept the first). */
  conflicts: number;
}

export type TrailShape = 'A' | 'B' | 'C' | 'D';

/** A TrailRule node's fields (scripts/parts/content.py TRAIL_RULES); thresholds are never constants. */
export interface TrailRule {
  id: string;
  shape: TrailShape;
  minEpisodes: number;
  windowDays: number | null;
  minSpanDays: number | null;
  minTools: number | null;
  contextShare: number | null;
  withinHours: number | null;
  lift: number | null;
  cooldownDays: number;
  enabled: boolean;
  /** Signed off (reviewStatus approved, nothing pending): with `enabled`, the rule is live (`ruleLive`). */
  approved: boolean;
  statementTemplate: string;
}

export interface TrailContextRow { id: string; key: TrailContextKey; value: string; phrase: string }
export interface TrailMove { id: string; offerable: boolean; safetyLine: boolean; trailPhrase?: string | null }
export interface TrailPair { id: string; a: string; b: string }

/** A claimed part as the profile `parts` slice gives it (never a direct Part read). */
export interface ClaimedPart {
  id: string;
  status: 'active' | 'resting' | 'set_aside' | string;
  moveIds: string[];
  lastVisitedAt: string | null;
  pausedUntil: string | null;
  confirmedAt?: string | null;
}

/** What the offer task will build from TrailOffers: Not me (null), Not now (cooldown), accepted (null). */
export interface BlockedKey {
  ruleId: string;
  moveIds: string[];
  contextId: string | null;
  partId: string | null;
  until: string | null;
  /**
   * Rule D only (Reflect's review batch): the records the person said No to for this part. An episode
   * holding any of them never counts for the part again, whatever `until` says (until only blocks the part).
   */
  recordKeys?: string[];
}

export interface TrailPolicy { episodeMergeHours: number; louderPauseHours: number }

export interface TrailCtx {
  moves: TrailMove[];
  pairs: TrailPair[];
  contexts: TrailContextRow[];
  parts: ClaimedPart[];
  blocked: BlockedKey[];
}

export interface TrailEvidence { at: string; toolIds: string[]; recordKeys: string[]; moveIds: string[]; contextIds: string[] }

export interface TrailCandidate {
  ruleId: string;
  shape: TrailShape;
  /** A: [m]; B: [first, then]; C: [a, b]; D: the part's matching moves. */
  moveIds: string[];
  /** A TrailContext id (A, C). */
  contextId: string | null;
  /** C. */
  pairId: string | null;
  /** D (the name is the offer task's to read through the profile slice). */
  partId: string | null;
  evidence: TrailEvidence[];
  /** `lift: null` on B means a zero baseline: unbounded. */
  strength: { episodes: number; spanDays: number; tools: number; share?: number; lift?: number | null };
  /** A only: the move is a safety-line move (turn_on_myself); the offer task decides how it shows. */
  safetyLine: boolean;
}
