/**
 * Body map content types (docs/design/body-map.md). Pure, no imports.
 * Mirror of functions/src/bodyMap/types.ts; tests/body-map-content.test.mjs asserts the two stay identical.
 */

/** A quarter of the feeling square: more / less intense × unpleasant / pleasant. A word's first zone is its home (its mark colour). */
export type PadZone = 'hu' | 'lu' | 'hp' | 'lp';
/** A sensation's arousal: more energy or less (kept for the mirror; the colour comes from the home zone). */
export type BodyEnergy = 'more' | 'less';

/** A chip on the sensation pad (a SensationType). `regions` empty means anywhere. */
export interface PadWord {
  id: string;
  label: string;
  zones: PadZone[];
  regions: string[];
  energy: BodyEnergy;
}

/** One typical place on a body-mirror map. */
export interface BodyMapPlace {
  region: string;
  sensationId: string;
  label: string;
  energy: BodyEnergy;
  weight: number;
}

/** A body-mirror map reached from the check-in's words, in the order the words were sent. */
export interface BodyMirrorMap {
  id: string;
  label: string;
  /** The sent words this map mirrors, in the order they were sent. */
  emotionIds: string[];
  /** Strongest first. */
  places: BodyMapPlace[];
}

export interface BodyMapContent {
  version: string;
  /** The place ids the graph and the figure share. */
  regions: string[];
  /** Signed-off pad words, in pad order. */
  padWords: PadWord[];
  /** Signed-off maps for the sent words (none when no words were sent). */
  maps: BodyMirrorMap[];
}

/** A marked place sent for body-first suggestions. */
export interface BodySuggestMark {
  region: string;
  sensationIds: string[];
}

/** A body-mirror map the marks look like, with its grid words and the places that matched. */
export interface BodySuggestion {
  mapId: string;
  label: string;
  wordIds: string[];
  score: number;
  because: Array<{ region: string; label: string }>;
}
