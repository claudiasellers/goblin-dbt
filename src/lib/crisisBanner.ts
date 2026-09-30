/**
 * Check-in result layout with the crisis banner (Wave-0 harm patch A0-1, ruling R12).
 *
 * Crisis resources used to replace the whole result (no tools, no Done, no
 * bailout): a dead end. They now render as a non-blocking banner at the top of
 * the normal result, and everything the user would otherwise see renders below
 * it. The trigger is unchanged: the server's `TRIGGERS_SAFETY` flag with
 * `type === 'crisis'` (skipped for low-unpleasant server-side).
 *
 * Both result screens ask this module what to render, so the "banner never
 * hides the way forward" rule is tested without a React test setup.
 */

export interface SafetyFlagLike {
  type?: string | null;
}

export type ResultVariant = 'standard' | 'low_energy';

export type ResultSection =
  | 'crisis_banner'
  | 'pattern'
  | 'clinical_note'
  | 'guided_activity'
  | 'tools'
  | 'done'
  | 'add_detail'
  | 'bailout';

export type BailoutSection = 'crisis_banner' | 'micro_step';

export interface ResultLayoutInput {
  variant: ResultVariant;
  safetyFlag?: SafetyFlagLike | null;
  patternId: string;
  toolCount: number;
  hasGuidedActivity?: boolean;
  canAddMoreDetail?: boolean;
}

export function isCrisisFlag(flag?: SafetyFlagLike | null): boolean {
  return !!flag && flag.type === 'crisis';
}

/** Sections of the main result screen, top to bottom. */
export function resultSections(input: ResultLayoutInput): ResultSection[] {
  const { variant, safetyFlag, patternId, toolCount, hasGuidedActivity, canAddMoreDetail } = input;
  const sections: ResultSection[] = [];
  if (isCrisisFlag(safetyFlag)) sections.push('crisis_banner');
  sections.push('pattern');

  // Positive state: label and Done only (standard screen).
  if (variant === 'standard' && patternId === 'positive_state') {
    sections.push('done');
    return sections;
  }

  if (safetyFlag?.type === 'clinical_referral') sections.push('clinical_note');
  if (variant === 'low_energy' && hasGuidedActivity) sections.push('guided_activity');
  if (toolCount > 0) sections.push('tools');
  sections.push('done');
  if (canAddMoreDetail) sections.push('add_detail');

  const bailoutAvailable = variant === 'low_energy' ? toolCount > 0 || !!hasGuidedActivity : toolCount > 0;
  if (bailoutAvailable) sections.push('bailout');
  return sections;
}

/** Sections of the "too much right now" micro-step screen. The banner stays on top. */
export function bailoutSections(safetyFlag?: SafetyFlagLike | null): BailoutSection[] {
  return isCrisisFlag(safetyFlag) ? ['crisis_banner', 'micro_step'] : ['micro_step'];
}
