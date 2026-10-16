/**
 * The properties that hold a person's own words (free text) on the records and parts trails sit
 * next to. Nothing in trails/ reads one (test-enforced against TRAIL_READ_PROPERTIES and the query
 * text). It holds the harm report's list (tests/parts-harm-report.test.mjs keeps it inline) plus
 * DEAR MAN's free-text fields; the trails test also derives every `own*` field from the parts session
 * and keep code, so a new one is caught without editing this list.
 */
export const OWN_WORDS_PROPERTIES = [
  // CheckIn
  'note',
  // DearManSession
  'barriersCustom', 'describeCustom', 'assertCustom', 'assertDetailsJson', 'anchorPhrase',
  'middleGroundCustom', 'walkAwayCustom',
  // Part (profile), PartSession, OwnLine, ProfileFact, FollowUp
  'name', 'keptName', 'ownVoice', 'ownJob', 'ownFear', 'ownUpdate', 'anchorOwn', 'anchorLineId', 'text', 'textNamed',
  'valueJson', 'outcomeNote',
  // User
  'displayName', 'email',
] as const;
