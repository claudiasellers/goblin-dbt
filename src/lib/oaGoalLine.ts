/**
 * Do the Opposite's goal line (docs/design/parts.md, the Do the Opposite row): with parts on, on the
 * check's effectiveness card, above its question, two quiet lines that set the protector's pull beside the
 * person's own goal, "A part of you {move}, and it's trying to help." / "You want to {goal}.", right
 * before the question that weighs them. Pure.
 *
 * {move} is the move's `unblendPhrase` (the unblend line's phrase), found by the unblend line's own lookup
 * (`expressedMove`: an approved EXPRESSES edge from the picked ActionUrge to a move that ships, so an
 * offerable one). {goal} is OA's goal
 * choice label (OA's content, passed in by the host), first letter lower-cased. No {hurt}: nothing in the
 * visit says what this part fears. Never for "My urge is different", a safety-line move (no "A part of you
 * is turning on you, and it's trying to help"), or no goal. Hosts decide when (parts on, the
 * effectiveness card, never while P2 or the too-much overlay is open).
 */
import type { PartsContent } from '../data/partsContentTypes';
import { promptCopy, surfaceReady, type SurfaceIds } from './partsContent';
import { expressedMove } from './unblendLine';

export const OA_GOAL_PART = 'oa_goal_part';
export const OA_GOAL_YOU = 'oa_goal_you';
/** Both lines ship or neither shows (the move's unblendPhrase and its EXPRESSES edge come from the vocabulary). */
export const OA_GOAL_LINE_REQUIRED: SurfaceIds = { prompts: [OA_GOAL_PART, OA_GOAL_YOU], options: [] };

/** OA's own goal label as it reads after "You want to": "Stay connected" → "stay connected". */
export function goalPhrase(label: string): string {
  const t = label.trim();
  return t ? t[0].toLowerCase() + t.slice(1) : '';
}

/** What the host knows: OA's urge id ("custom" for My urge is different) and the picked goal's label. */
export interface OaGoalLineInput {
  urgeId: string | null;
  goalLabel: string | null;
}

/** The two filled lines, or null. */
export function oaGoalLine(content: PartsContent | null, input: OaGoalLineInput): [part: string, you: string] | null {
  if (!content || !surfaceReady(content, OA_GOAL_LINE_REQUIRED)) return null;
  if (!input.urgeId || input.urgeId === 'custom') return null;
  const move = expressedMove(content, 'oa', input.urgeId);
  if (!move || move.safetyLine || !move.unblendPhrase) return null;
  const goal = goalPhrase(input.goalLabel ?? '');
  if (!goal) return null;
  const part = promptCopy(content, OA_GOAL_PART);
  const you = promptCopy(content, OA_GOAL_YOU);
  if (!part?.includes('{move}') || !you?.includes('{goal}')) return null;
  return [part.replace('{move}', move.unblendPhrase), you.replace('{goal}', goal)];
}
