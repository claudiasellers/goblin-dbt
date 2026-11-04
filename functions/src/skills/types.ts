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
  /** The own-words escape hatch: `hint` is its label / placeholder; `open` shows the box at once (else behind a chip). */
  own?: { hint: string; countsAsPick: boolean; open?: boolean };
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
  next: Array<{ to: string; when: Cond | null }>;
  /** kind 'handoff'. */
  lines?: Array<{ when: Cond; key: string }>;
  offers: Array<{ exit: string; when: Cond }>;
  done?: string;
  /** Reaching this step marks the visit complete. */
  complete?: boolean;
}

export interface ExitDef { id: string; toolId: string | null; query: Record<string, string>; carry: string[]; done: boolean }

export interface OptionDef { value: string; label: string; for?: string; [prop: string]: unknown }

export interface DeriveDef { name: string; from: string; table: string; default?: string; keep?: 'key' | 'value' }

export interface SkillDef {
  id: string;
  /** The spine's and src/data/tools.ts's id. */
  toolId: string;
  version: string;
  start: string;
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
