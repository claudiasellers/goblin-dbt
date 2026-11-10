import type { ComponentType } from 'react';
import type { EmbedOutput, EmbedOutputSchema } from '../../data/skillTypes';
import { PartsLine } from './PartsLine';

/**
 * The skill runtime's embeds (docs/design/skill-runtime.md, "Embeds"): a name the graph can place in a step
 * (a slot) or hand a whole screen to (a step of kind `embed`) → the component that renders it. Where an
 * embed sits and when it shows is data; what it is, is code. scripts/skills/content.py EMBEDS lists the
 * same names (tests/skill-runtime.test.mjs keeps them equal), so a skill can't name one the player lacks.
 *
 * An embed gets its props from the skill, the run's context in (`ctx`: ids only) and the run's answers as labels
 * (`picked`), and reports back:
 * `onShown` once it has rendered something (the run records it under the slot's `record`), and, for a
 * whole-screen embed, `onDone(output)`: the option ids it produced (the step's `answerAs` answer), own words if
 * it takes any, and measurements (seconds, counts; never a rating). Each embed declares the shape of what it
 * reports in EMBED_OUTPUTS (`EmbedOutputSchema`); the machine drops anything undeclared, and
 * tests/skill-contracts.test.mjs keeps it equal to content.py (docs/design/dbt-modules-plan.md C3b).
 */
export interface EmbedProps {
  props: Record<string, unknown>;
  ctx?: Readonly<Record<string, string>>;
  /** The run's answers as the person saw them: each answered field's labels in pick order, own words last. */
  picked?: Readonly<Record<string, readonly string[]>>;
  onShown: () => void;
  onDone?: (output: EmbedOutput) => void;
}

export const EMBEDS: Record<string, ComponentType<EmbedProps>> = {
  partsLine: PartsLine,
};

export const EMBED_OUTPUTS: Record<keyof typeof EMBEDS, EmbedOutputSchema> = {
  partsLine: {},
};
