/**
 * Capacity band and then-vs-now types (ER-01, plan A4-1, rulings R1 and R3). Pure, no imports.
 * Mirrored in src/data/capacityTypes.ts; tests/capacity.test.mjs asserts the two stay identical.
 */
export type Band = 'steady' | 'stirred' | 'flooded';
export const BANDS: readonly Band[] = ['steady', 'stirred', 'flooded'];

/**
 * Canonical then-vs-now (R3): direction-relative, so "better" means quieter for down-regulating tools
 * and more here for orienting ones. Every record that asks it stores `thenVsNow` + `thenVsNowDir`.
 */
export type ThenVsNow = 'worse' | 'same' | 'better' | 'much_better';
export const THEN_VS_NOW: readonly ThenVsNow[] = ['worse', 'same', 'better', 'much_better'];
/** `up` is reserved until a tool needs it (DT authors its wording). */
export type ThenVsNowDir = 'down' | 'orient' | 'up';
export const THEN_VS_NOW_DIRS: readonly ThenVsNowDir[] = ['down', 'orient', 'up'];

export type BandSource = 'probe' | 'ftf' | 'carried' | 'handoff' | 'diary_recall' | 'chain_link';
export const BAND_SOURCES: readonly BandSource[] = ['probe', 'ftf', 'carried', 'handoff', 'diary_recall', 'chain_link'];
export type BandFraming = 'now' | 'hardest_today' | 'at_that_moment';
export const BAND_FRAMINGS: readonly BandFraming[] = ['now', 'hardest_today', 'at_that_moment'];
export type ProbeWording = 'default' | 'relational';
export const PROBE_WORDINGS: readonly ProbeWording[] = ['default', 'relational'];

/**
 * One answer to the probe. A validated value object, never a node (R1): the server flattens it onto
 * the log record that asked (`readingProps`). `band.current()` is client-only.
 */
export interface CapacityReading {
  id: string;                  // client uuid
  value: Band;
  viaCantTell: boolean;        // "I can't tell" → stirred
  source: BandSource;
  framing: BandFraming;        // only 'now' readings are ever "current"
  wording: ProbeWording;
  context: string;             // 'checkin' | app tool id
  hostSessionId?: string;
  probeVersion: string;        // 'capacity-v1'
  at: string;                  // ISO, client clock (server bounds-checks)
  carriedFrom?: { readingId: string; context: string; at: string }; // source 'carried' | 'handoff'
}

export interface ProbeWordingCopy {
  prompt: string;
  incoming: string;
  someone?: string;
  options: Record<Band, string>;
}

export interface HandoffPrimitive {
  id: string;                          // 'sigh' | 'orient' (interim); DT-01 ids later
  component: 'breath_orb' | 'orient';  // later: 'dt.regulate'
  direction: 'calm' | 'orient' | 'activate';
  bands: Band[];
  blank: 'any' | 'yes' | 'no';
  rank: number;
  conceptId: string;                   // cyclic_sighing | se_orienting
  copy: Record<string, unknown>;       // BreathOrb {title, sub, phases, cycles, start, skip, done} | Orient {...}
}

export type BandMode = 'full' | 'short' | 'handoff' | 'notOffered';
export interface BandRule { skillId: string; band: Band; mode: BandMode; headsUp?: string }

export interface CapacityContent {
  version: 'capacity-v1';
  freshMinutes: number;                       // 20
  bandIntensity: Record<Band, number>;        // CheckIn.intensityY compatibility
  bandLabels: Record<Band, string>;           // display word for a stored band (History)
  probe: {
    wordings: Record<ProbeWording, ProbeWordingCopy>;
    cantTell: string;
  };
  handoff: {
    card: { body: string; start: string; keepGoing: string; keepGoingHeadsUp: string };
    reread: { prompt: string; options: Record<ThenVsNow, string> };
    resumeLine: string;
    secondLead: string;
    resumeStale: string;
    later: { offer: string; options: Array<{ id: '1h' | 'evening' | 'tomorrow'; label: string }>; scheduled: string; holding: string };
    tooMuchLink: string;
  };
  primitives: HandoffPrimitive[];
  bandRules: BandRule[];
}

/** P2 resume token. Device-local only (localStorage), never sent to the server. */
export interface ResumeToken {
  v: 1;
  toolId: string;
  hostSessionId: string;
  stepId: string;
  draft: unknown;              // host JSON, ≤16 KB serialised; may hold free text, so it stays on the device
  band: Band;
  createdAt: string;
  expiresAt: string;           // +24 h
}

export interface HandoffResult {
  resumed: boolean;
  overridden: boolean;         // "Keep going anyway"
  thenVsNow: ThenVsNow | null; // direction 'down' (the reread after a primitive)
  primitivesRun: Array<{ id: string; completed: boolean; durationSec: number }>;
  deferredFollowUpId?: string;
}
