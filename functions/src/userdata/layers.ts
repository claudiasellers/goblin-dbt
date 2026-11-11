/**
 * The three data layers, as code (plan §5.1, E2 §1). Pure: no firebase imports, so tests load it directly.
 *
 * - ask-fresh: fields on a log record only (ASK_FRESH_FIELDS). Never a node, never on User, never on
 *   a ProfileItem, never in a profile slice.
 * - log:      `:<Label>:UserData:LogRecord`, finalise-once (./lifecycle.ts). Read in aggregate only,
 *             never used to pre-fill a live flow.
 * - profile:  `:<Label>:UserData:ProfileItem` (or a profile edge to graph content carrying
 *             `confirmedAt` + `source`). Read through getProfileContext(toolId) and the Me surface only.
 * - system:   `:<Label>:UserData:System`. App infrastructure; deleted with the user, never exported.
 *
 * Every :UserData node carries `id`, `ownerId` (Firebase uid), `key = ownerId + ':' + id` (unique per
 * label; writes MERGE on key, never on id), `createdAt`, `schemaVersion`. Ownership edges run
 * User → UserData and UserData → UserData only; user data may point at graph content, graph content
 * never points at user data.
 *
 * A new user-data label is registered here (with its `exportAs`), gets a `<label>_key` constraint in
 * schema/constraints.cypher, and is covered by export/delete automatically (./exportDelete.ts).
 * tests/user-data-layers.test.mjs enforces all of this.
 */
export type Layer = 'log' | 'profile' | 'system';

export interface UserDataLabel {
  layer: Layer;
  /** User → node relationship (children hang off their parent instead: `parentRel`). */
  rel: string;
  /** Pre-convention label: labels/ownerId/key backfilled by schema/migrations/2026-10-user-data-backfill.cypher. */
  legacy?: true;
  /** Owned child labels (deleted and exported with the parent). */
  children?: string[];
  /** Key in the export's `records` map. Required for every non-system label. */
  exportAs?: string;
}

/** The layer label a node of each layer carries next to `:UserData`. */
export const LAYER_LABEL: Record<Layer, 'LogRecord' | 'ProfileItem' | 'System'> = {
  log: 'LogRecord',
  profile: 'ProfileItem',
  system: 'System',
};

export const USER_DATA: Record<string, UserDataLabel> = {
  // ---- log (legacy, adopted in PR-S1) ----
  CheckIn: { layer: 'log', rel: 'LOGGED', legacy: true, children: ['BodySensation'], exportAs: 'checkIns' },
  BodySensation: { layer: 'log', rel: 'SENSED', legacy: true, exportAs: 'bodySensations' },
  ToolUsage: { layer: 'log', rel: 'USED_TOOL', legacy: true, exportAs: 'toolUsage' },
  OppositeActionSession: { layer: 'log', rel: 'COMPLETED_SESSION', legacy: true, exportAs: 'oppositeActionSessions' },
  InvalidationRecoverySession: { layer: 'log', rel: 'COMPLETED_SESSION', legacy: true, exportAs: 'invalidationRecoverySessions' },
  DearManSession: { layer: 'log', rel: 'COMPLETED_SESSION', legacy: true, exportAs: 'dearManSessions' },
  FindTheFeelingSession: { layer: 'log', rel: 'COMPLETED_SESSION', legacy: true, exportAs: 'findTheFeelingSessions' },
  // ---- log (Phase A spine) ----
  ToolSession: { layer: 'log', rel: 'HAS_TOOL_SESSION', exportAs: 'toolSessions' },
  SkillPractice: { layer: 'log', rel: 'HAS_SKILL_PRACTICE', exportAs: 'skillPractice' },
  FollowUp: { layer: 'log', rel: 'HAS_FOLLOW_UP', exportAs: 'followUps' },
  PatternOffer: { layer: 'log', rel: 'HAS_PATTERN_OFFER', exportAs: 'patternOffers' },
  // ---- log (parts, docs/design/parts.md: Data model → User data) ----
  PartSession: { layer: 'log', rel: 'HAS_PART_SESSION', exportAs: 'partSessions' }, // Meet a part; finalise-once
  PullsSession: { layer: 'log', rel: 'HAS_PULLS_SESSION', exportAs: 'pullsSessions' }, // Two pulls; finalise-once
  PartCandidate: { layer: 'log', rel: 'HAS_PART_CANDIDATE', exportAs: 'partCandidates' }, // written only on a yes
  PartTag: { layer: 'log', rel: 'HAS_PART_TAG', exportAs: 'partTags' }, // "Was this a part you know?": edges out of it only
  PartRevisit: { layer: 'log', rel: 'HAS_PART_REVISIT', exportAs: 'partRevisits' }, // a part's 30-day still-true answer; create only
  PartMessage: { layer: 'log', rel: 'HAS_PART_MESSAGE', exportAs: 'partMessages' }, // "Say something to it": sayToPart, create only; edges out of it only
  TrailOffer: { layer: 'log', rel: 'HAS_TRAIL_OFFER', exportAs: 'trailOffers' }, // Phase 4: writeTrailOffer is its one writer; edges out of it only
  // ---- log (IE, docs/design/dear-man-debrief.md) ----
  // One conversation's outcome (IE-03's interaction log), written by DEAR MAN's debrief projection; WITH its Person.
  Interaction: { layer: 'log', rel: 'HAS_INTERACTION', exportAs: 'interactions' },
  // ---- profile ----
  ProfileFact: { layer: 'profile', rel: 'HAS_PROFILE_FACT', exportAs: 'profileFacts' },
  MyPattern: { layer: 'profile', rel: 'HAS_PATTERN', exportAs: 'myPatterns' },
  OwnLine: { layer: 'profile', rel: 'HAS_OWN_LINE', exportAs: 'ownLines' }, // A5-2 (R16): say it my way
  Part: { layer: 'profile', rel: 'HAS_PART', exportAs: 'parts' }, // keepPart is its only writer (9b's yes)
  // The den: parts/links.ts is PartLink's only writer (on a yes; id derived from kind + pair, one per pair
  // and kind), parts/denSnapshot.ts DenSnapshot's (the server's, `den_<UTC day>`, one per day).
  PartLink: { layer: 'profile', rel: 'HAS_PART_LINK', exportAs: 'partLinks' },
  DenSnapshot: { layer: 'profile', rel: 'HAS_DEN_SNAPSHOT', exportAs: 'denSnapshots' },
  // People (IE-03, docs/design/people.md): someone the person named, kept on the picker's tap (profile/items.ts).
  Person: { layer: 'profile', rel: 'HAS_PERSON', exportAs: 'people' },
  // ---- system ----
  PushToken: { layer: 'system', rel: 'HAS_PUSH_TOKEN' },
};

/**
 * Profile edges from User to graph content (not nodes). They carry `confirmedAt` + `source`.
 * FOUND_WORD is NOT one: it accumulates without the user's yes, so it is a log aggregate (D-10),
 * shown read-only in Me → My words and exported under `links`.
 */
export const PROFILE_EDGES: readonly string[] = ['SAVED_LINE']; // A5-2 (R16): User → ValidationLine on an explicit keep

/** User → graph-content edges that are log aggregates (exported under `links`, deleted with the user). */
export const LOG_AGGREGATE_EDGES: readonly string[] = ['FOUND_WORD'];

/**
 * Ask-fresh field names (plan §5.1, R1, R3). They may appear on log records only: never on a
 * ProfileItem, never on User, never as a profile slice key. Prefixed families (`band*`,
 * `bandAtStart*`, `bandAtEnd*`) are matched by prefix.
 */
export const ASK_FRESH_FIELDS = [
  'band', 'bandAtStart', 'bandAtEnd', 'thenVsNow', 'thenVsNowDir', 'actedOnUrge',
  'urgeIds', 'fitsFacts', 'wiseMindAnswer', 'readiness', 'eventIds',
  // Parts (Meet a part): how the person feels toward a part, and the blending check. Both change
  // within minutes and are never pre-filled or carried to another flow.
  'feelTowardIds', 'blendCheck',
] as const;

/** True when `field` is ask-fresh (exact name, or a `band…` / `bandAtStart…` / `bandAtEnd…` variant). */
export function isAskFreshField(field: string): boolean {
  if ((ASK_FRESH_FIELDS as readonly string[]).includes(field)) return true;
  return /^band[A-Z]/.test(field) && !/^bandIntensity$/.test(field);
}

/** Every registered label of a layer. */
export function labelsOf(layer: Layer): string[] {
  return Object.entries(USER_DATA).filter(([, d]) => d.layer === layer).map(([l]) => l);
}

/** `exportAs` for a node's labels (first registered label wins), or null (unregistered / system). */
export function exportKeyFor(labels: string[]): string | null {
  for (const l of labels) {
    const d = USER_DATA[l];
    if (d) return d.layer === 'system' ? null : d.exportAs ?? null;
  }
  return null;
}
