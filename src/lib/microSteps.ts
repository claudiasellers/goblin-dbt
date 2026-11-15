/**
 * The micro-steps (DT-01 part 2, docs/design/first-the-body.md): the lowest-difficulty interventions in the app,
 * served on *That feels like too much right now* (StateResult, LowEnergyStateResult), on Help me now's first screen
 * and in Do the Opposite's old page. Keyed by the activation pattern the check-in found, because different states
 * need different interventions (scripts/micro-steps/content.py says which and why).
 *
 * The content is graph content (schema/micro-steps.cypher: `Intervention` ROUTES_TO from each `ActivationPattern` or
 * `CrisisState`), shipped as the generated src/data/content/micro-steps.json. It's imported statically, not lazily:
 * these screens are the ones that must never wait on a chunk.
 */
import file from '../data/content/micro-steps.json';

export const MICRO_STEPS_VERSION = 'micro-steps-v1';

export interface MicroStep {
  id: string;
  /** The instruction, at most 8 words. */
  text: string;
  /** A gentle follow-up, shown smaller beneath. */
  subtext?: string;
  /** Why it works for its state (never shown): sensory, proprioceptive, autonomic or attentional. */
  modality: 'sensory' | 'proprioceptive' | 'autonomic' | 'attentional';
  /** Needs an object or a place (cold water, a wall): *show me something else* can skip these. */
  requiresEnvironment?: boolean;
}

interface Row { id: string; text: string; subtext: string | null; modality: MicroStep['modality']; requiresEnvironment: boolean }

const SETS: Record<string, MicroStep[]> = Object.fromEntries(
  Object.entries((file.content as unknown as { sets: Record<string, Row[]> }).sets).map(([k, rows]) => [k, rows.map((r) => ({
    id: r.id, text: r.text, modality: r.modality,
    ...(r.subtext ? { subtext: r.subtext } : {}),
    ...(r.requiresEnvironment ? { requiresEnvironment: true } : {}),
  }))]),
);

/** The steps for a pattern; the universally safe `fallback` set when the pattern has none. */
export function getMicroStepsForPattern(patternId: string): MicroStep[] {
  return SETS[patternId] ?? SETS.fallback;
}

/**
 * One step for a pattern. `skipIndex`: *show me something else* passes the current index for the next one;
 * `skipEnvironmental`: leave out steps that need an object or a place (when any are left).
 */
export function getMicroStep(patternId: string, skipIndex?: number, skipEnvironmental?: boolean): { step: MicroStep; index: number } {
  let steps = getMicroStepsForPattern(patternId);
  if (skipEnvironmental) {
    const filtered = steps.filter((s) => !s.requiresEnvironment);
    if (filtered.length > 0) steps = filtered;
  }
  const index = skipIndex !== undefined ? (skipIndex + 1) % steps.length : Math.floor(Math.random() * steps.length);
  return { step: steps[index], index };
}
