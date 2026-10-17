/**
 * Cope Ahead content (docs/design/cope-ahead.md): what getCopeAheadContent returns and cope-ahead.json ships.
 * Mirror of functions/src/copeAhead/types.ts (tests/cope-ahead-content.test.mjs asserts they stay identical).
 */
/** Find the feeling's four pulls (the same as Urge Surfing's "What does it want to do?"). */
export type CopePull = 'fight' | 'chase' | 'hide' | 'blank';
export type CopeMoveKind = 'body' | 'words' | 'action' | 'tool';
/** Screen 1's "When is it?": also the cope_ahead_after window chip. */
export type CopeWhen = 'today' | 'tomorrow' | 'this_week' | 'later';

export interface CopeSituationItem {
  id: string;
  label: string;
  /** How the after card names it ("How did {afterName} go?"). */
  afterName: string;
  /** Four check-in grid word ids (screen 2). */
  likelyFeelings: string[];
  /** HardMoment ids, in order (screen 3); danger moments last. */
  hardMoments: string[];
  /** The danger moments among hardMoments: CrisisBanner compact alongside, and the flow goes on. */
  dangerMomentIds: string[];
  order: number;
}

export interface HardMomentItem {
  id: string;
  /** The chip. */
  label: string;
  /** Follows "If" in the plan line. */
  ifText: string;
  order: number;
}

export interface CopeMoveItem {
  id: string;
  kind: CopeMoveKind;
  /** The chip (a tool move's is the tool's name in src/data/tools.ts). */
  label: string;
  /** Follows "I'll" in the plan line. */
  line: string;
  /** Shown for these screen-2 pulls. */
  forPulls: CopePull[];
  /** Shown when no pull was picked, or Not sure. */
  general: boolean;
  /** A tool move: its app tool id. */
  appToolId: string | null;
  /** Shown only for these moments, first (the danger moments' first move). */
  forMoments: string[];
  order: number;
}

export interface RehearsalBeatItem {
  id: string;
  /** {moment} and {plan} are filled by the app. */
  text: string;
  /** 1-7. */
  order: number;
}

export interface CopeAheadContent {
  version: string;
  /** Own words for the situation and the hardest moment: length-checked only, never linted. */
  ownMax: number;
  /** Own words for a move. */
  moveOwnMax: number;
  /** Screen 1's when chips, in order, each with its copy key. */
  when: Array<{ id: CopeWhen; key: string }>;
  /** Every screen line, keyed as the doc's table. */
  copy: Record<string, string>;
  /** The pull as the "If", by pull id. */
  pullIf: Record<CopePull, string>;
  /** The after card's lines (cope_ahead_after). */
  after: Record<string, string>;
  situations: CopeSituationItem[];
  hardMoments: HardMomentItem[];
  moves: CopeMoveItem[];
  beats: RehearsalBeatItem[];
}
