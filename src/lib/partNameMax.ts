/**
 * PartsPolicy.nameMaxChars until the policy ships its `limits` (the server's DEFAULT_NAME_MAX). Its own
 * module so Me's eager gate reads it without pulling in Meet a part's step machine.
 */
export const MEET_NAME_MAX = 40;
