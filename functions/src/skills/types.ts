/**
 * The skill runtime's content (docs/design/skill-runtime.md; schema/skills.cypher from scripts/skills/).
 * Mirrored in src/data/skillTypes.ts (tests/skill-runtime.test.mjs keeps the two equal).
 */

/** One condition in the runtime's JSON language (src/lib/skillRuntime/conditions.ts). */
export type Cond =
  | { set: string }
  | { own: string }
  | { eq: [string, unknown] }
  | { in: [string, unknown[]] }
  | { has: [string, unknown] }
  | { some: [string, Cond] }
  | { all: Cond[] }
  | { any: Cond[] }
  | { not: Cond };

/** Context keys a skill may accept from the page that opens it (`SkillDef.accepts`, refs `$ctx.<key>`). */
export type CtxKey = 'urgeId' | 'personId' | 'frame' | 'enterAt' | 'situationId' | 'partId' | 'band' | 'returnTo';

/** Copy: a key into the skill's copy, or keys under conditions (first match wins; the last has no `when`). */
export type CopyRef = string | Array<{ when?: Cond; key: string }>;

export interface OptionsSource {
  /** A list from the skill's options. */
  list?: string;
  /** Only the options this holds for (`$opt.*` bound to each). */
  where?: Cond;
  /** One group per pick of this field (an option's `for` names the pick); `ownGroup` for that field's own words. */
  groupBy?: string;
  ownGroup?: string;
  /** Put this option first (never selected): a `$ctx.<key>` ref, e.g. Cope Ahead's `?first=`. */
  firstFrom?: string;
  /** Grid words (src/data/emotions.ts ids), in order; carried emotions first; `moreKey` opens the full list. */
  emotions?: string[];
  carriedFirst?: boolean;
  moreKey?: string;
}

export interface FieldDef {
  id: string;
  label?: string;
  options: OptionsSource;
  /** Picks allowed (own words count as one when `own.countsAsPick`). */
  max: number;
  /** Past `max`, a tap swaps out the oldest pick. */
  swap?: boolean;
  /**
   * The own-words escape hatch: `hint` is its label / placeholder; `open` shows the box at once (else behind a
   * chip); `max` caps it below the skill's `ownMax`. Own words are encrypted at rest and are never data: nothing
   * counts, filters or routes on them (docs/design/dbt-modules-plan.md C1 rule 7).
   */
  own?: { hint: string; countsAsPick: boolean; open?: boolean; max?: number };
  showWhen?: Cond;
  required?: boolean;
  /** The answer is also this ask-fresh field on the session (functions/src/userdata/layers.ts). */
  askFresh?: 'fitsFacts';
  /** A table read shown above the chips (e.g. fitsWhen for the derived parent). */
  list?: { table: string; key: string };
  /** The picked word is one of the session's emotions. */
  emotion?: boolean;
  links?: Array<{ exit: string; label: string; when: Cond }>;
}

export interface SlotDef { after: string; embed: string; props?: Record<string, unknown>; showWhen: Cond; record: string }

/**
 * Crisis resources above a step while `when` holds (CrisisBanner, compact); a step lists them, the first that holds
 * shows. An option with a `danger` prop (`self` / `other`) needs a slot of the matching variant on its step.
 */
export interface CrisisSlot { variant: 'crisis' | 'other_person'; when: Cond }

/** What a whole-screen embed may report (functions/src/spine/extSchemas.ts `run.out`). Measurements, never ratings. */
export interface EmbedOutput {
  /** Option ids it produced: they become the answer of the step's `answerAs` field. */
  ids: string[];
  /** The person's own words, if the embed takes any (encrypted at rest like every own-words value). */
  own?: string | null;
  durationSec?: number;
  doneCount?: number;
  earlyCount?: number;
}

export interface StepDef {
  id: string;
  kind: 'ask' | 'handoff' | 'embed';
  title?: CopyRef;
  titleSlots?: Record<string, { labelOf: string }>;
  hint?: string;
  note?: string;
  fields?: FieldDef[];
  slots?: SlotDef[];
  /** kind 'embed': the registered embed that runs the whole screen, and its props. */
  embed?: string;
  props?: Record<string, unknown>;
  /** kind 'embed': the field id the embed's output ids are answered as (transitions read `$a.<answerAs>`). */
  answerAs?: string;
  crisis?: CrisisSlot[];
  next: Array<{ to: string; when: Cond | null }>;
  /** kind 'handoff'. */
  lines?: Array<{ when: Cond; key: string }>;
  offers: Array<{ exit: string; when: Cond }>;
  done?: string;
  /** Reaching this step marks the visit complete. */
  complete?: boolean;
}

/**
 * A hand-on. `planned`: the tool isn't built yet; the exit is written (so the edge exists) but never shown.
 * `safety`: the reserved `safety.open` exit, opening the crisis resources over the skill (it doesn't end the run).
 */
export interface ExitDef { id: string; toolId: string | null; query: Record<string, string>; carry: string[]; done: boolean; planned?: boolean; safety?: boolean }

export interface OptionDef { value: string; label: string; for?: string; [prop: string]: unknown }

/**
 * A derived value. `lookup` (the default): `from` (a ref) looked up in `table`. `count`: the picks of the `fields`
 * summed (`weights` by option value, else 1 each), then the table row with the largest numeric key ≤ the total.
 */
export interface DeriveDef {
  name: string; kind?: 'lookup' | 'count'; from?: string; fields?: string[]; weights?: Record<string, number>;
  table: string; default?: string; keep?: 'key' | 'value';
}

export interface SkillDef {
  id: string;
  /** The spine's and src/data/tools.ts's id. */
  toolId: string;
  version: string;
  start: string;
  /** Context keys the skill takes from the page that opens it; an exit carrying any other key fails the contract test. */
  accepts: CtxKey[];
  ownMax: number;
  emotionFields: string[];
  copy: Record<string, string>;
  tables: Record<string, Record<string, unknown>>;
  derive: DeriveDef[];
  steps: StepDef[];
  exits: ExitDef[];
  options: Record<string, OptionDef[]>;
}

export interface SkillsContent {
  version: string;
  /** Emotion id → DBT parent (HAS_REGULATION_CONTENT). */
  parentOf: Record<string, string>;
  /** DBT parent → its EmotionRegulationContent label and fitsTheFactsWhen, unchanged. */
  fitsWhen: Record<string, { label: string | null; lines: string[] }>;
  skills: SkillDef[];
}
