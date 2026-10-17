/**
 * Follow-up types that only exist for parts (they arrive with the check-back flows). No imports, so
 * spine can refuse them while parts are off without depending on the rest of parts/.
 */
export const PARTS_FOLLOW_UP_TYPES: readonly string[] = ['part_checkback', 'two_pulls_checkback'];

export const isPartsFollowUpType = (t: unknown): boolean => typeof t === 'string' && PARTS_FOLLOW_UP_TYPES.includes(t);
