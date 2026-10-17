/**
 * Witness voice types (WMP-01, plan A5-2). Pure: no firebase imports.
 * Mirrored in src/data/witnessTypes.ts (tests/witness-rank.test.mjs asserts the two stay
 * identical after this 10-line header).
 *
 * getWitnessLines serves ValidationLine content (live only) plus, from fade stage 2, the user's own
 * lines. recordWitnessBeat logs what was shown on the host record (SHOWED_LINE, R17) and writes the
 * two profile items the beat can create: an OwnLine ("say it my way") and SAVED_LINE ("keep").
 */
import type { Band } from '../capacity/types';

export const WITNESS_VERSION = 'witness-v1';

export const WITNESS_MOMENTS = [
  'checkin_result', 'recover_validate', 'oa_start', 'ps_define', 'dearman_describe',
  'debrief_turning_point', 'missed_followup', 'urge_louder', 'crisis',
  // Wise mind's "Keep what wise mind said" (an own line only: no ToolMoment, no line is ever served for it).
  'wise_mind',
] as const;
export type WitnessMoment = (typeof WITNESS_MOMENTS)[number];

export type LineKind = 'receive' | 'urge' | 'both' | 'after_miss' | 'after_louder' | 'self' | 'function';
export const LANDED = ['yes', 'sort_of', 'no'] as const;
export type Landed = (typeof LANDED)[number];
export type WitnessLevel = 1 | 2 | 3 | 4 | 5 | 6;
export type FadeStage = 0 | 1 | 2 | 3;

/** Levels the server serves per band (the echo, level 2, is the client's own words). */
export const LEVELS_BY_BAND: Record<Band, readonly WitnessLevel[]> = {
  flooded: [1, 2],
  stirred: [4, 5],
  steady: [3, 4, 5, 6],
};

/** Own lines ("say it my way"): at most 140 characters, stored as written, never linted or interpreted. */
export const OWN_LINE_MAX = 140;
/** A flooded beat is one line merged into the header: at most 8 words. */
export const FLOODED_MAX_WORDS = 8;

export interface GetWitnessLinesRequest {
  hostToolId: string;            // 'checkin' | app tool id
  moment: WitnessMoment;
  band: Band;
  emotionIds?: string[];         // ≤5 graph Emotion ids
  situationId?: string;
  urgeId?: string;
  forOther?: boolean;            // IE-06 later
  excludeIds?: string[];
  max?: 1 | 2 | 3;               // default 2: primary + one alternate at a different level
}

export interface WitnessLine {
  id: string;
  source: 'graph' | 'own';
  /** Unfilled templates ({word} {phrase} {need}; {N} only in textNamed); the client fills slots. */
  text: string;
  textNamed?: string;
  level: WitnessLevel | null;    // own lines: null
  kind: LineKind;
  voice: 'you' | 'name' | 'none';
  tentative: boolean;
  underneathEmotionId?: string;
}

export interface GetWitnessLinesResponse {
  version: typeof WITNESS_VERSION;
  /** Derived server-side from the user's history (never trusted from the client). */
  fadeStage: FadeStage;
  /** Whether to ask "Did that land?" (never at flooded; after 10 answers only every 5th beat). */
  askLanded: boolean;
  /** The user's first name when the voice may use it (null: use "you"). */
  firstName: string | null;
  lines: WitnessLine[];
}

export interface RecordWitnessBeatRequest {
  hostKind: 'checkin' | 'tool_session';
  hostId: string;                // must belong to request.auth.uid
  moment: WitnessMoment;
  /** Required when a line was shown (it is stored on SHOWED_LINE); a beat that only keeps an own line may leave it out. */
  band?: Band;
  shown: Array<{ lineId: string; landed: Landed | null }>;
  ownLineShownId?: string;
  skipped: boolean;
  noneFit: boolean;
  /** "Say it my way": ≤140 characters, the client's id (UUID). */
  ownLine?: { id: string; text: string; emotionIds: string[]; situationId?: string };
  /** Explicit keep → SAVED_LINE (never on landed: yes; D-04). */
  keepLineId?: string;
}

export interface RecordWitnessBeatResponse {
  ownLineId?: string;
  /** False when the host record was already final: the beat's log edges were not written (R2). */
  logged: boolean;
  /** User.profileVersion after a profile write (own line or keep), for the client cache. */
  profileVersion?: number;
}
