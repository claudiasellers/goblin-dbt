/**
 * Parts types (docs/design/parts.md). Pure, no imports.
 * The entry gate mirrors functions/src/parts/; each mirrored block's server text appears here unchanged
 * (the tests assert it). The angry-part card's types are the client's own: the shape of the parts content
 * it reads (tests/fixtures/parts-content.json, scripts/parts/fixture.py); its copy lives in the graph
 * (scripts/parts/content.py), never here.
 */

// --- Entry gate: mirror of functions/src/parts/types.ts (tests/parts-entry.test.mjs) ---
/** What the client opens first. Every outcome lets the person continue: none of them locks. */
export type PartsEntryOpen = 'p2' | 'far_away' | 'clear';

/** Why, as ids, for logging and tests; never shown. */
export type PartsEntryReason = 'checkin_flooding' | 'checkin_crisis' | 'recover_loud' | 'dissociation_history';

export type PartsEntry = (
  /** The P2 body hand-off first (Keep going anyway stays), with the crisis banner alongside when `crisis`. */
  | { open: 'p2'; band: 'flooded'; crisis: boolean; reasons: PartsEntryReason[] }
  /** The far-away heads-up, then the choice. */
  | { open: 'far_away'; reasons: PartsEntryReason[] }
  | { open: 'clear'; reasons: PartsEntryReason[] }
) & {
  /**
   * Present (true) only when the caller made PartsPolicy.tooManyPartsCount parts or more within
   * tooManyPartsDays: Meet a part says "You don't need to get to know everyone at once." once. Never blocks.
   */
  tooMany?: true;
  /**
   * Present (true) only when the request named one of the caller's own parts and its pausedUntil (set
   * when the next-day check-back said Louder) is still ahead: Meet a part goes gently. Never blocks.
   */
  paused?: true;
};

// --- Meet a part's session: mirror of functions/src/parts/sessionTypes.ts (tests/parts-entry.test.mjs) ---
/** Where the visit came from (parts.md "Entries"). */
export type TrailheadKind = 'offer' | 'me' | 'candidate' | 'settings' | 'angry_card' | 'problem_solve';
export const TRAILHEAD_KINDS: readonly TrailheadKind[] = ['offer', 'me', 'candidate', 'settings', 'angry_card', 'problem_solve'];

/** The steps table's ids, plus the tender path's one screen and the "nothing there" branch. */
export type PartStepId =
  | 'find' | 'where' | 'shape' | 'age' | 'voice' | 'feel_toward' | 'unblend' | 'job' | 'job_like' | 'guards'
  | 'fear' | 'update' | 'thanks' | 'would_rather' | 'name' | 'keep' | 'tender' | 'nothing';
export const PART_STEP_IDS: readonly PartStepId[] = [
  'find', 'where', 'shape', 'age', 'voice', 'feel_toward', 'unblend', 'job', 'job_like', 'guards',
  'fear', 'update', 'thanks', 'would_rather', 'name', 'keep', 'tender', 'nothing',
];

/** Where the visit ended: a step, the blending check, or before the first step. */
export type PartExitStep = PartStepId | 'blend' | 'entry';

/** The blending check (ask-fresh). */
export type BlendCheck = 'notice' | 'running' | 'not_sure';
export const BLEND_CHECKS: readonly BlendCheck[] = ['notice', 'running', 'not_sure'];

export type PartStopReason = 'tender' | 'own_words' | 'danger' | 'not_self' | 'nothing' | 'later' | 'done';
export const PART_STOP_REASONS: readonly PartStopReason[] = ['tender', 'own_words', 'danger', 'not_self', 'nothing', 'later', 'done'];

/** One P2 hand-off entry, exactly as DEAR MAN stores them in `ext.er.handoffs` (≤ 4). */
export interface PartHandoffEntry {
  primitiveId?: string;
  completed?: boolean;
  durationSec?: number;
  thenVsNow?: string;
  resumed?: boolean;
  overridden?: boolean;
}

export interface StartPartSessionRequest {
  id: string;
  trailheadKind: TrailheadKind;
  partId?: string;
  candidateId?: string;
  moveIds?: string[];
}

/**
 * What a save may set. Every key is optional; a key that is present replaces the stored value
 * (`stepIds` merges per step; `null` or '' clears an own-words field).
 */
export interface PartSessionPatch {
  stepIds?: Partial<Record<PartStepId, string[]>>;
  /** In the order asked. Ask-fresh: never pre-filled. */
  feelTowardIds?: string[];
  blendCheck?: BlendCheck;
  handoffs?: PartHandoffEntry[];
  steppedBack?: boolean;
  stopReason?: PartStopReason;
  exitStep?: PartExitStep;
  /** The person's own words: kept as written, never linted, parsed or logged. */
  ownVoice?: string | null;
  ownJob?: string | null;
  ownFear?: string | null;
  ownUpdate?: string | null;
  /** Body figure place ids, at most 3. */
  bodyPlaces?: string[];
  /** Shape it's five values, each 0–1. */
  shapeSig?: number[];
  /** Tune it's four values, each 0–1. */
  soundSig?: number[];
}

export interface SavePartSessionRequest {
  id: string;
  patch: PartSessionPatch;
  /** Finalise: the record is frozen after this. */
  final?: boolean;
}

export interface PartSessionResponse { id: string; status: 'open' | 'saved' }

// --- Keeping a part and queueing a candidate: mirror of functions/src/parts/keepTypes.ts (tests/parts-entry.test.mjs) ---

/** 9b's yes. Only ids and the name: the part itself is built from the stored session. */
export interface KeepPartRequest {
  sessionId: string;
  /** A new client UUID for a new part; the visited part's id on a revisit. */
  partId: string;
  /** Up to PartsPolicy.nameMaxChars (40); null or absent is "Not yet" (a revisit keeps the old name). */
  name?: string | null;
}
export interface KeepPartResponse { partId: string; created: boolean }

/** Where a candidate came from. */
export type CandidateOrigin = 'new_one' | 'worried_part' | 'split' | 'ps_ambivalence' | 'angry_card';
export const CANDIDATE_ORIGINS: readonly CandidateOrigin[] = ['new_one', 'worried_part', 'split', 'ps_ambivalence', 'angry_card'];

/** Written only on a yes. */
export interface QueuePartCandidateRequest {
  id: string;
  origin: CandidateOrigin;
  /** ProtectiveMove ids (at most 4), every one of which must exist. */
  moveIds: string[];
  /** The Meet a part visit it came from, when there is one. */
  sessionId?: string;
  /**
   * The caller's own closed ToolSession it came from ("A new one" on the tag row). The server adds the
   * moves that session's urge / pull ids express (approved EXPRESSES edges) to `moveIds`, up to 4.
   */
  toolSessionId?: string;
}
export interface QueuePartCandidateResponse { id: string }

/** Me's "Not any more" on a candidate (functions/src/parts/candidateAnswer.ts). */
export interface AnswerPartCandidateRequest { candidateId: string; answer: 'dismiss' }
/** `dismissed`, or `accepted` when keepPart got there first (nothing written). */
export interface AnswerPartCandidateResponse { id: string; status: string }

/** Every change to a kept part answers with the new profile version (the client cache key). */
export interface PartWriteResponse { version: number }

/** Rename: up to PartsPolicy.nameMaxChars (40), trimmed; '' or null is "Not yet". Never linted. */
export interface RenamePartRequest { partId: string; name: string | null }
/** true: active → resting; false: resting → active. A set-aside part is restored, not woken. */
export interface RestPartRequest { partId: string; resting: boolean }
/** Set aside, restore, mark tender. */
export interface PartRefRequest { partId: string }

/** The 30-day still-true for a part: an active part's answers, then a resting part's. */
export type PartRevisitAnswer = 'same' | 'less' | 'new' | 'resting' | 'still_quiet' | 'back';
export const ACTIVE_REVISIT_ANSWERS: readonly PartRevisitAnswer[] = ['same', 'less', 'new', 'resting'];
export const RESTING_REVISIT_ANSWERS: readonly PartRevisitAnswer[] = ['still_quiet', 'back'];
/** `new` takes 1 to 3 of the meet flow's `rather` option ids (the part's new job). */
export const RATHER_IDS_MAX = 3;
export interface AnswerPartRevisitRequest {
  /** A client UUID: the logged answer's id, so a repeat call applies nothing twice. */
  id: string;
  partId: string;
  answer: PartRevisitAnswer;
  ratherIds?: string[];
}

/** A job the part did before it took up a new one (`Part.jobHistoryJson`, newest last, at most 10). */
export interface PartJobHistoryEntry { jobIds: string[]; ownJob: string | null; until: string }
export const JOB_HISTORY_MAX = 10;

/**
 * DEAR MAN's cope ahead: the part's anchor, exactly one of a kept line (an OwnLine of theirs or a
 * ValidationLine they kept) or their own words (trimmed, 1 to 90 characters, never linted).
 */
export interface SetPartAnchorRequest { partId: string; lineId?: string; own?: string }
export const ANCHOR_MAX_CHARS = 90;

// --- "Was this a part you know?": mirror of functions/src/parts/tagTypes.ts (tests/parts-entry.test.mjs) ---
/**
 * Where a tag comes from: `close` (the tag row after a better close; the default) or `debrief` (DEAR MAN's
 * debrief, "who showed up?").
 */
export type TagSource = 'close' | 'debrief';
export const TAG_SOURCES: readonly TagSource[] = ['close', 'debrief'];
/** A debrief tag's answer: Yes or A bit (No and Skip write nothing). */
export type TagStrength = 'yes' | 'a_bit';
export const TAG_STRENGTHS: readonly TagStrength[] = ['yes', 'a_bit'];

/** One tap on the tag row after a better close, or a Yes / A bit in DEAR MAN's debrief. */
export interface TagPartRequest {
  /** A new client UUID for the tag. */
  id: string;
  /** The caller's kept part (active or resting). */
  partId: string;
  /** close: the caller's closed ToolSession with a better close. debrief: the caller's DEAR MAN ToolSession, open or closed. */
  toolSessionId: string;
  /** Absent is `close`. */
  source?: TagSource;
  /** debrief only (required there). */
  strength?: TagStrength;
}
/** The tag for that session and source: this one, or the first one if it was already tagged. */
export interface TagPartResponse { id: string; created: boolean }

// --- The next-day check-back: mirror of functions/src/parts/checkbackTypes.ts (tests/parts-entry.test.mjs) ---

/** The FollowUpType id (scripts/practice-spine/content.py). */
export const PART_CHECKBACK_TYPE = 'part_checkback';

/** On the close's yes ("Check back with it tomorrow?"), for the part this visit kept. */
export interface SchedulePartCheckbackRequest {
  /** A client UUID for the follow-up. */
  id: string;
  /** The Meet a part visit (its PartSession) that kept the part. */
  sessionId: string;
  /** Tomorrow at 10:00 local (the type's window), computed on the device. */
  dueAt: string;
}
/** The open check-back's id: this one, or the one already open for that part (at most one). */
export interface SchedulePartCheckbackResponse { id: string | null }

/** "How's {name} today?": Settled · Same · Louder · Skip. */
export type PartCheckbackAnswer = 'settled' | 'same' | 'louder' | 'skip';
export const PART_CHECKBACK_ANSWERS: readonly PartCheckbackAnswer[] = ['settled', 'same', 'louder', 'skip'];
export interface AnswerPartCheckbackRequest { id: string; answer: PartCheckbackAnswer }
/** `aftercare`: Louder was saved, so the card shows aftercare_louder (the part is paused). */
export interface AnswerPartCheckbackResponse { status: string; aftercare: boolean }

/** What a check-back card carries about its part (name and tenderness from the profile slice). */
export interface TodayPartRef { id: string; name: string | null; tender: boolean }

// --- The angry-part card (src/lib/angryPart.ts, src/components/parts/AngryPartCard.tsx) ---

/** The angry card's lines. Each exists twice in the content: `id` (parts on) and `id_plain` (parts off). */
export const ANGRY_LINES = [
  'angry_unblend', 'angry_unblend_sub', 'angry_protects',
  'angry_vote', 'angry_vote_noname', 'angry_vote_unsure', 'angry_vote_unsure_noname',
  'angry_vote_2', 'angry_vote_3', 'angry_vote_3_noname', 'angry_hold',
  'angry_speak', 'angry_speak_unsure', 'angry_speak_line',
] as const;
export type AngryLineId = (typeof ANGRY_LINES)[number];

/** The angry card's options shared by both wordings (none of them names a part). */
export const ANGRY_OPTIONS = ['angry_next', 'angry_not_sure', 'angry_done'] as const;
export type AngryOptionId = (typeof ANGRY_OPTIONS)[number];

/**
 * The card's own way past on its first screen, one per wording (the card is offered, never imposed;
 * its host shows it as the skip link). Both read "Not now" today; each wording is reviewed on its own.
 */
export const ANGRY_NOT_NOW = 'angry_not_now';
export type AngryNotNowId = typeof ANGRY_NOT_NOW | `${typeof ANGRY_NOT_NOW}_plain`;

/**
 * The card's last screen, parts on only (no `_plain` twin): `angry_later` (an option, "Spend a minute
 * with it later?") is the yes that queues a PartCandidate (origin angry_card); `angry_later_done` (a
 * prompt) replaces it once queued. Never opens a flow.
 */
export const ANGRY_LATER = 'angry_later';
export const ANGRY_LATER_DONE = 'angry_later_done';
/** The later line as the card shows it, when it may. */
export interface AngryLaterCopy { ask: string; done: string }

/** Every prompt and option of the angry flow (both wordings), by id, as plain strings. */
export type AngryCardCopy = Record<AngryLineId | `${AngryLineId}_plain` | AngryOptionId | AngryNotNowId, string>;

export type AngryStep = 'unblend' | 'protects' | 'vote' | 'speak';

/** A hurt chip as the card shows it, in the order to offer. */
export interface AngryHurt { id: string; label: string; matters: string; feltPhrase: string }

/** What the card hands back to its host. Nothing is saved by the card itself. */
export interface AngryCardResult {
  /** The hurt picked at "What it protects"; null for "Not sure". */
  hurtId: string | null;
  /** True only when the 4 s hold completed. */
  voteHeld: boolean;
  exitStep: AngryStep;
}

/**
 * A ProtectedHurt as the card reads it (the fixture's and parts.json's `hurts`; PartsHurt in
 * partsContentTypes.ts fits). A hurt without its label, matters or feltPhrase is never offered.
 */
export interface AngryContentHurt {
  id: string; label: string; feltPhrase: string; matters?: string; order: number;
  /** OFTEN_GUARDS: the moves that may guard it, with the hurt's rank in each move's chip order. */
  guardedBy: { moveId: string; rank: number }[];
}

/** The slice of the parts content the angry card is built from (the fixture's shape; the harness reads it). */
export interface AngryCardContent {
  prompts: Record<string, { flow: string; step: string; copy: string }>;
  options: Record<string, Record<string, { id: string; label: string }[]>>;
  hurts: AngryContentHurt[];
}

// --- The parts stats: mirror of functions/src/parts/statsTypes.ts (tests/parts-entry.test.mjs) ---

/** The time-of-day bands of `when`, in the person's time zone: 05–12, 12–17, 17–22, 22–05. */
export type PartWhen = 'mornings' | 'afternoons' | 'evenings' | 'nights';
export const PART_WHENS: readonly PartWhen[] = ['mornings', 'afternoons', 'evenings', 'nights'];

/**
 * A part's lines, each null below its threshold (functions/src/parts/stats.ts STATS_THRESHOLDS).
 * Counts and ids only: the app words them from the shipped parts copy (common/stats).
 */
export interface PartStats {
  /** Tools whose better closes the person tagged with this part, most first (ties: most recent), ≤ 3. */
  helped: { toolId: string; n: number }[] | null;
  /**
   * How they've felt toward it: the most common first feel-toward answer (a meet/feel option id) in the
   * earlier and the later half of their visits. `then` is null when the two are the same ("Since …").
   * `month` is the earlier half's first visit, `YYYY-MM` in the person's time zone.
   */
  felt: { month: string; then: string | null; now: string } | null;
  /** The band more than half of the tags fall in. */
  when: PartWhen | null;
}

/** One part's block in Reflect: who it is (as the person kept it) and its lines (at least one is set). */
export interface PartReflect {
  id: string;
  name: string | null;
  /** The first body place id, for "The one in your {place}" when it has no name. */
  firstPlace: string | null;
  /** Shape it's five numbers (PartFigure); null is the plain round figure. */
  shapeSig: number[] | null;
  stats: PartStats;
}
