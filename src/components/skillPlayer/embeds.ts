import type { ComponentType } from 'react';
import type { EmbedOutput } from '../../data/skillTypes';
import { PartsLine } from './PartsLine';

/**
 * The skill runtime's embeds (docs/design/skill-runtime.md, "Embeds"): a name the graph can place in a step
 * (a slot) or hand a whole screen to (a step of kind `embed`) → the component that renders it. Where an
 * embed sits and when it shows is data; what it is, is code. scripts/skills/content.py EMBEDS lists the
 * same names (tests/skill-runtime.test.mjs keeps them equal), so a skill can't name one the player lacks.
 *
 * An embed gets its props from the skill and the run's context in (`ctx`: ids only), and reports back:
 * `onShown` once it has rendered something (the run records it under the slot's `record`), and, for a
 * whole-screen embed, `onDone(output)`: the option ids it produced (the step's `answerAs` answer), own words if
 * it takes any, and measurements (seconds, counts; never a rating). Each embed declares the shape of what it
 * reports in EMBED_OUTPUTS, which tests/skill-contracts.test.mjs reads (docs/design/dbt-modules-plan.md C3b).
 */
export interface EmbedProps {
  props: Record<string, unknown>;
  ctx?: Readonly<Record<string, string>>;
  onShown: () => void;
  onDone?: (output: EmbedOutput) => void;
}

/**
 * What each embed may report through `onDone`: the option ids it can produce, whether it takes own words
 * (`ownText`: encrypted at rest, never counted or filtered on), and which measurements. A slot-only embed
 * reports nothing.
 */
export interface EmbedOutputSchema {
  ids?: readonly string[];
  ownText?: boolean;
  measures?: ReadonlyArray<'durationSec' | 'doneCount' | 'earlyCount'>;
}

export const EMBEDS: Record<string, ComponentType<EmbedProps>> = {
  partsLine: PartsLine,
};

export const EMBED_OUTPUTS: Record<keyof typeof EMBEDS, EmbedOutputSchema> = {
  partsLine: {},
};
