/**
 * Skill families: the plain-language grouping tools are colour-coded by.
 * Presentation metadata only (label + which --color-fam-* tokens to use); which tool is
 * recommended still comes from the graph.
 *
 *   dt  teal      Get through it      (distress tolerance)
 *   er  lavender  Shift it            (emotion regulation)
 *   ie  rose      With other people   (interpersonal effectiveness)
 *
 * Mindfulness has no family colour yet; its tools use the neutral surface.
 */
import { getToolById } from './tools';
import type { ModuleId } from './modules';

export type FamilyKey = 'dt' | 'er' | 'ie';

export interface SkillFamily {
  key: FamilyKey | null;
  label: string;
}

const FAMILIES: Record<ModuleId, SkillFamily> = {
  'distress-tolerance': { key: 'dt', label: 'Get through it' },
  'emotion-regulation': { key: 'er', label: 'Shift it' },
  'interpersonal-effectiveness': { key: 'ie', label: 'With other people' },
  mindfulness: { key: null, label: 'Notice it' },
};

export function familyForModule(module: ModuleId): SkillFamily {
  return FAMILIES[module];
}

export function familyForTool(toolId: string): SkillFamily | null {
  const tool = getToolById(toolId);
  return tool ? FAMILIES[tool.module] : null;
}
