/**
 * The properties that hold a person's own words (free text) on the records and parts trails sit
 * next to. Nothing in trails/ reads one (test-enforced against TRAIL_READ_PROPERTIES and the query
 * text); lane 2's harm report can share this list.
 */
export const OWN_WORDS_PROPERTIES = [
  // CheckIn
  'note',
  // DearManSession
  'barriersCustom', 'describeCustom', 'assertCustom', 'assertDetailsJson', 'anchorPhrase',
  'middleGroundCustom', 'walkAwayCustom',
  // Part (profile) and OwnLine
  'name', 'ownVoice', 'ownJob', 'ownFear', 'anchorOwn', 'text',
  // User
  'displayName', 'email',
] as const;
