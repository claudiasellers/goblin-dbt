/**
 * People (IE-03): the role chips, presentation only (what a person is to you, in the picker and on Me). The ids are
 * functions/src/profile/kinds.ts `PERSON_ROLES` (tests/people.test.mjs keeps them equal); DEAR MAN's older
 * relationship ids (partner, boss, friend, parent, roommate, coworker, other) are a subset, so a plan's
 * `relationshipType` is still the role.
 */
export const PERSON_ROLES = [
  { id: 'partner', label: 'Partner' },
  { id: 'parent', label: 'Parent' },
  { id: 'family', label: 'Family' },
  { id: 'friend', label: 'Friend' },
  { id: 'boss', label: 'Boss' },
  { id: 'coworker', label: 'Coworker' },
  { id: 'roommate', label: 'Roommate' },
  { id: 'ex', label: 'Ex' },
  { id: 'other', label: 'Someone else' },
] as const;

export type PersonRoleId = (typeof PERSON_ROLES)[number]['id'];

export function roleLabel(id: string | null | undefined): string | null {
  return PERSON_ROLES.find((r) => r.id === id)?.label ?? null;
}
