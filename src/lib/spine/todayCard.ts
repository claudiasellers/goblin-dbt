/**
 * Today card helpers (PR-S5). Pure.
 */
import type { ThenVsNow } from '../../data/capacityTypes';
import type { ActedOnUrge } from '../../data/spineTypes';

const TVN = new Set(['worse', 'same', 'better', 'much_better']);
const ACTED = new Set(['no', 'partly', 'yes', 'not_yet']);

/** A tool_outcome choice as the answerToolOutcome payload (its id says which question it answers). */
export function outcomeAnswer(choiceId: string): { thenVsNow?: ThenVsNow; actedOnUrge?: ActedOnUrge } | null {
  if (TVN.has(choiceId)) return { thenVsNow: choiceId as ThenVsNow };
  if (ACTED.has(choiceId)) return { actedOnUrge: choiceId as ActedOnUrge };
  return null;
}

/** Fill {toolName} (display names live in src/data/tools.ts, never in the graph copy). */
export function fillToolName(text: string, toolName: string | null | undefined): string {
  return text.replace(/\{toolName\}/g, toolName || 'A tool');
}

/** "Later" on a Today card: three hours from now. */
export const LATER_HOURS = 3;
