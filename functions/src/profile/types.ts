/**
 * Profile layer types and the per-tool read declaration (PR-P1, plan §5.4). Pure, no imports.
 * Mirrored in src/data/profileTypes.ts (tests/profile-layer.test.mjs asserts they stay identical
 * after the header).
 *
 * PROFILE_NEEDS is code, reviewed per PR: a content load can never widen what a tool reads.
 * Copy and revisit policy live in the graph (ProfileKind).
 */
export type ProfileAreaId = 'about_me' | 'my_people' | 'my_body' | 'my_words' | 'my_plans' | 'my_patterns' | 'my_progress';
export const PROFILE_AREAS: readonly ProfileAreaId[] = ['about_me', 'my_people', 'my_body', 'my_words', 'my_plans', 'my_patterns', 'my_progress'];

/** Phase A slices, then reserved ones (their resolvers return empty until the owner ships). */
export const SLICE_IDS = [
  'name', 'quietHours', 'patterns', 'ownLines', 'savedLines',
  'people', 'bodyFlags', 'values', 'goals', 'copeAheadPlans', 'boundaryLines', 'practicePrefs',
  'fadeLevels', 'ownWords', 'thingsILike', 'crisisKit', 'safetyPlan', 'country',
] as const;
export type SliceId = (typeof SLICE_IDS)[number];

export type ItemPrompt = 'none' | 'quiet' | 'ask';
export interface ProfileItemMeta {
  id: string;
  kind: string;
  area: ProfileAreaId;
  status: 'active' | 'set_aside';
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
  ownLines: Array<{ id: string; text: string; meta: ProfileItemMeta }>;
  savedLines: Array<{ lineId: string; confirmedAt: string | null }>;
  people: never[];
  bodyFlags: null;
  values: never[];
  goals: never[];
  copeAheadPlans: never[];
  boundaryLines: never[];
  practicePrefs: null;
  fadeLevels: Record<string, 0 | 1 | 2 | 3>;
  ownWords: never[];
  thingsILike: never[];
  crisisKit: null;
  safetyPlan: null;
  country: null;
}

/**
 * What each consumer may read. `witness` is read server-side only (readProfileSlices, R16); the Me
 * surface reads everything through getMe, not here.
 */
export const PROFILE_NEEDS = {
  'recovering-from-invalidation': ['name'],   // later + 'people'
  'find-the-feeling': ['name'],
  'opposite-action': [],                      // later 'values', 'patterns'
  'cool-down': [],                            // DT-01: 'bodyFlags'
  'checkin': ['patterns'],                    // the router's tie-break (E4)
  'today': ['quietHours'],
  'witness': ['name', 'ownLines', 'savedLines'],
} as const satisfies Record<string, readonly SliceId[]>;

export type ProfileConsumer = keyof typeof PROFILE_NEEDS;
/** Consumers the client may ask for (witness is server-side only). */
export type ClientProfileConsumer = Exclude<ProfileConsumer, 'witness'>;
export const SERVER_ONLY_CONSUMERS: readonly ProfileConsumer[] = ['witness'];
export type NeedsOf<T extends ProfileConsumer> = (typeof PROFILE_NEEDS)[T][number];

export interface GetProfileContextResponse<T extends ProfileConsumer = ProfileConsumer> {
  toolId: T;
  /** User.profileVersion: bumped by every profile write (cache key). */
  version: number;
  slices: Pick<ProfileSlices, NeedsOf<T>>;
}

export type PatternOfferAnswer = 'yes' | 'not_now' | 'no';
