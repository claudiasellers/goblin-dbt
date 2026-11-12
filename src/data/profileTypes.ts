/**
 * Profile layer types and the per-tool read declaration (PR-P1, plan §5.4). Pure, no imports.
 * Mirror of functions/src/profile/types.ts (tests/profile-layer.test.mjs asserts they stay identical
 * after the header).
 *
 * PROFILE_NEEDS is code, reviewed per PR: a content load can never widen what a tool reads.
 * Copy and revisit policy live in the graph (ProfileKind).
 */
export type ProfileAreaId = 'about_me' | 'my_people' | 'my_body' | 'my_words' | 'my_plans' | 'my_patterns' | 'my_parts' | 'my_progress';
export const PROFILE_AREAS: readonly ProfileAreaId[] = ['about_me', 'my_people', 'my_body', 'my_words', 'my_plans', 'my_patterns', 'my_parts', 'my_progress'];

/** Phase A slices, then reserved ones (their resolvers return empty until the owner ships). */
export const SLICE_IDS = [
  'name', 'quietHours', 'patterns', 'ownLines', 'savedLines',
  'people', 'bodyFlags', 'values', 'goals', 'copeAheadPlans', 'boundaryLines', 'practicePrefs',
  'fadeLevels', 'ownWords', 'thingsILike', 'thingsILikePicks', 'crisisKit', 'safetyPlan', 'country',
  'parts', 'partDetail', 'partAnchors', 'den', 'prosCons',
] as const;
export type SliceId = (typeof SLICE_IDS)[number];

export type ItemPrompt = 'none' | 'quiet' | 'ask';
export type ProfileItemStatus = 'active' | 'resting' | 'set_aside';
export interface ProfileItemMeta {
  id: string;
  kind: string;
  area: ProfileAreaId;
  /** resting: a part gone quiet (still live, not set aside: "parts go quiet, not gone"). */
  status: ProfileItemStatus;
  source: string;
  confirmedAt: string | null;
  revisitAt: string | null;
  /** ask = past revisitAt → render "still true?"; quiet = fresh and pre-filling; none = no policy. */
  prompt: ItemPrompt;
}

export interface QuietHours { start: string; end: string }

export interface ProfileSlices {
  name: { firstName: string | null };
  quietHours: (QuietHours & { meta: ProfileItemMeta }) | null;
  patterns: Array<{ id: string; patternKind: 'what_helps'; toolId: string | null; patternId: string | null; meta: ProfileItemMeta }>;
  /** "Say it my way" lines (A5-2): stored as written, never linted or interpreted. */
  ownLines: Array<{
    id: string; text: string; emotionIds: string[]; situationId: string | null; moment: string | null;
    uses: number; lastUsedAt: string | null; meta: ProfileItemMeta;
  }>;
  /** Witness lines the user kept (SAVED_LINE), newest first; `text` as the corpus has it. */
  savedLines: Array<{ lineId: string; text: string; confirmedAt: string | null }>;
  /**
   * People (IE-03): the people the person named (active only), most recently used first. `label` is their own words,
   * decrypted for them. `safe` / `risk` / `safeAskedAt`: the last answer to "Is it safe to bring hard things up with
   * them?" (src/lib/people.ts decides when to ask again); null when never answered.
   */
  people: Array<{
    id: string; label: string; role: string;
    safe: 'yes' | 'no' | 'unsure' | null;
    risk: 'none' | 'invalidating' | 'harm' | 'unstated' | null;
    safeAskedAt: string | null;
    /** Asks to be heard that the person's DEAR MAN debriefs said went unheard, since the last one that landed (IE-B2). */
    refusalsValidation: number;
    /** Set when a debrief said *I don't feel safe with them*: the safety question is asked again (needsSafetyAsk). */
    safetyRecheckAt: string | null;
    meta: ProfileItemMeta;
  }>;
  bodyFlags: null;
  values: never[];
  goals: never[];
  copeAheadPlans: never[];
  boundaryLines: never[];
  practicePrefs: null;
  fadeLevels: Record<string, 0 | 1 | 2 | 3>;
  ownWords: never[];
  /**
   * Things I like (ER-04, kind `thing_i_like`), active only, newest first: the id and what to call it (the person's own
   * words, else the chip or catalogue option's label from the graph). Good things offers them first on its pick step.
   */
  thingsILike: Array<{ id: string; label: string; meta: ProfileItemMeta }>;
  /** The catalogue ids of the things kept from a good thing done (`pickIds`): Good things drops their catalogue copy. */
  thingsILikePicks: Array<{ id: string }>;
  /**
   * The kept crisis kit (DT-03, kind `crisis_kit`, one per person), active only, or null: per section the option ids
   * and the person's own words as written (decrypted for them). The kit plays it one card at a time.
   */
  crisisKit: {
    id: string; bodyIds: string[]; bodyOwn: string | null; handsIds: string[]; handsOwn: string | null;
    sootheIds: string[]; sootheOwn: string | null; wordsIds: string[]; wordsOwn: string | null;
    placeIds: string[]; placeOwn: string | null; reasonsIds: string[]; reasonsOwn: string | null; meta: ProfileItemMeta;
  } | null;
  safetyPlan: null;
  country: null;
  /**
   * Kept parts (Phase 2), active and resting only; nothing at all while parts are off
   * (User.partsEnabled). `tender`: every consumer that speaks to a part stays gentle with it.
   */
  parts: Array<{
    id: string; name: string | null; status: 'active' | 'resting'; tender: boolean; moveIds: string[];
    /** The part's first body place id (src/data/bodyFigure.ts), for "The one in your {place}" when it has no name. */
    firstPlace: string | null;
    /** Shape it's five numbers (PartFigure draws it; null is the plain round figure). */
    shapeSig: number[] | null;
    /** The last Meet a part visit (keepPart sets it); trails' Rule D counts episodes after it. */
    lastVisitedAt: string | null;
    /** Set when the next-day check-back said Louder (PartsPolicy.louderPauseHours ahead); trails skip a paused part. */
    pausedUntil: string | null;
    /**
     * The part safety flag (functions/src/safety/partSafetyFlag.ts): a safetyLine move or a danger fear.
     * Show CrisisBanner alongside, never instead; computed on the server, so no fears are needed here.
     */
    safety: boolean;
    meta: ProfileItemMeta;
  }>;
  /** The rest of a kept part (Meet a part reads it); `hurtIds` from GUARDS. Own-words fields as written. */
  partDetail: Array<{
    id: string; ageId: string | null; voiceIds: string[]; ownVoice: string | null; jobIds: string[]; ownJob: string | null;
    fearIds: string[]; ownFear: string | null; preferredRoleIds: string[]; anchorLineId: string | null; places: string[];
    shapeSig: number[] | null; hurtIds: string[];
  }>;
  /**
   * DEAR MAN's cope ahead: part id → its anchor, the person's own words (`anchorOwn`) or the text of
   * the kept line it points at (`anchorLineId`). Parts without one, or whose line is no longer kept, are absent.
   */
  partAnchors: Record<string, string>;
  /**
   * The den (Me only, read through getDen): every active and resting part as the room draws it, the
   * person's confirmed links between two parts in the room, and the snapshot list (newest first).
   * `lastVisitedAt` stays on the server: getDen turns it, with the log's touches, into a recency bucket.
   */
  den: {
    parts: Array<{
      id: string; name: string | null; status: 'active' | 'resting'; tender: boolean; shapeSig: number[] | null;
      mapX: number | null; mapY: number | null; lastVisitedAt: string | null; safety: boolean;
    }>;
    links: Array<{ id: string; kind: 'covers_for' | 'two_pulls'; aId: string; bId: string; bothWantId: string | null }>;
    snapshots: Array<{ id: string; takenAt: string }>;
  };
  /**
   * Kept pros & cons cards (DT-10, kind `pros_cons`), active only, newest first: ids and the person's own words as
   * written (decrypted for them). Hold to wait replays the one for the pull picked in the visit.
   */
  prosCons: Array<{
    id: string; pullIds: string[]; pullOwn: string | null; longIds: string[]; longOwn: string | null;
    givesIds: string[]; givesOwn: string | null; costIds: string[]; costOwn: string | null;
    keepsIds: string[]; keepsOwn: string | null; meta: ProfileItemMeta;
  }>;
}

/**
 * What each consumer may read. `witness` is read server-side only (readProfileSlices, R16); the Me
 * surface reads everything through getMe, not here.
 */
export const PROFILE_NEEDS = {
  'recovering-from-invalidation': ['name'],   // later + 'people'
  'find-the-feeling': ['name', 'parts'],     // parts: the tag row on its close
  'opposite-action': ['parts'],               // the tag row on its close (ER-B3 port); later 'values', 'patterns'
  'cool-down': ['parts'],                     // parts: the tag row on its close; DT-01: 'bodyFlags'
  'checkin': ['patterns'],                    // the router's tie-break (E4)
  'today': ['quietHours', 'parts'],          // parts: the check-back card's name (Phase 2, parts on only)
  'witness': ['name', 'ownLines', 'savedLines'],
  'meet-a-part': ['name', 'parts', 'partDetail'], // Phase 2 (parts on only: the slices are empty while off)
  'two-pulls': ['parts'], // Phase 5: the two parts' names, figures, tenderness (parts on only)
  'dear-man': ['parts', 'ownLines', 'savedLines', 'partAnchors', 'people'], // Phase 3 cope ahead (parts slices empty while off); never partDetail. people: the picker (IE-03)
  'cope-ahead': ['parts', 'ownLines', 'savedLines', 'partAnchors'], // DEAR MAN's cope ahead step on screen 2, the anchor under the plan (parts on only); never partDetail
  // "Was this a part you know?" after a better close (PartTagSlot, in SessionClose or the tool's own
  // close): every tool whose close asks then-vs-now or about the urge (src/lib/partTag.ts TAG_ROW_TOOLS)
  // reads `parts`.
  'five-senses': ['parts'],
  'pause': ['parts', 'prosCons'],              // prosCons: the kept card for the pull (DT-10's replay, on proceed)
  'crisis-kit': ['crisisKit', 'prosCons'],     // the kept kit and pros & cons cards, one card at a time (DT-03)
  'urge-surfing': ['parts'],
  'let-it-be': ['parts'],                    // the tag row on its in-flow close (docs/design/let-it-be.md)
  'mind-job': ['parts'],                     // the tag row on its in-flow close (docs/design/mind-job.md)
  'soothe': ['parts'],                       // the tag row on its in-flow close (docs/design/held.md)
  'thoughts-passing': ['parts'],             // the tag row on its in-flow close (docs/design/thoughts-passing.md)
  'alternate-rebellion': ['parts'],          // the tag row on its urge close (DT-11, Held off)
  'check-the-facts': ['parts'],              // the tag row on its close (docs/design/check-the-facts.md, screen 3)
  'fast': ['parts'],                         // the tag row on its close (docs/design/fast.md)
  'say-no': ['people'],                      // the picker (IE-03), before the skill (docs/design/say-no.md)
  'good-things': ['thingsILike', 'thingsILikePicks'],             // its pick step: the person's own things first (docs/design/good-things.md)
  'give': ['people'],                        // the picker (IE-03), before the skill (docs/design/give.md)
  // Wise mind's step back (parts on only): the person's parts in the room, with their names, shapes,
  // tender and safety flags. Empty while parts are off, so the tool shows its two-minds form.
  'wise-mind': ['parts'],
  // Me → Parts of me → See them together (the den). Server-side only: getDen reads it and adds recency.
  'me': ['den'],
  // Other tools declare 'parts' in the phase that renders them, never before.
} as const satisfies Record<string, readonly SliceId[]>;

export type ProfileConsumer = keyof typeof PROFILE_NEEDS;
/** Consumers the client may ask for (witness and the den's `me` are server-side only). */
export type ClientProfileConsumer = Exclude<ProfileConsumer, 'witness' | 'me'>;
export const SERVER_ONLY_CONSUMERS: readonly ProfileConsumer[] = ['witness', 'me'];
export type NeedsOf<T extends ProfileConsumer> = (typeof PROFILE_NEEDS)[T][number];

export interface GetProfileContextResponse<T extends ProfileConsumer = ProfileConsumer> {
  toolId: T;
  /** User.profileVersion: bumped by every profile write (cache key). */
  version: number;
  slices: Pick<ProfileSlices, NeedsOf<T>>;
}

export type PatternOfferAnswer = 'yes' | 'not_now' | 'no';
