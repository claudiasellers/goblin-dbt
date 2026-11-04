import type { ComponentType } from 'react';
import { PartsLine } from './PartsLine';

/**
 * The skill runtime's embeds (docs/design/skill-runtime.md, "Embeds"): a name the graph can place in a step
 * (a slot) or hand a whole screen to (a step of kind `embed`) → the component that renders it. Where an
 * embed sits and when it shows is data; what it is, is code. scripts/skills/content.py EMBEDS lists the
 * same names (tests/skill-runtime.test.mjs keeps them equal), so a skill can't name one the player lacks.
 *
 * An embed gets its props from the skill and reports back: `onShown` once it has rendered something (the
 * run records it under the slot's `record`), and, for a whole-screen embed, `onDone(output)` with the
 * option ids it produced (they become the step's answers).
 */
export interface EmbedProps {
  props: Record<string, unknown>;
  onShown: () => void;
  onDone?: (output: { ids: string[]; own?: string | null }) => void;
}

export const EMBEDS: Record<string, ComponentType<EmbedProps>> = {
  partsLine: PartsLine,
};
