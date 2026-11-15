/**
 * The Practice home's words (MF-02, MF-B3, docs/design/practice-home.md): presentation only. Which skills there are,
 * their order and which tools practise them come from the graph (`PracticeSkill.mfOrder`, through getPracticeHome);
 * the setup's ids are pinned to functions/src/profile/kinds.ts (PRACTICE_TIMES, PRACTICE_CUES, PRACTICE_BREATH).
 */
export const PRACTICE_TIMES = [
  { id: 'morning', label: 'Morning' },
  { id: 'midday', label: 'Midday' },
  { id: 'evening', label: 'Evening' },
] as const;

/** An implementation intention: *when X, I'll do one minute* (PRD MF-02 setup). `own` takes the person's words. */
export const PRACTICE_CUES = [
  { id: 'teeth', label: 'After I brush my teeth' },
  { id: 'kettle', label: 'When the kettle\'s on' },
  { id: 'commute', label: 'On the bus or train' },
  { id: 'desk', label: 'When I sit down at my desk' },
  { id: 'own', label: 'My own' },
] as const;

export const PRACTICE_BREATH = [
  { id: 'yes', label: 'Yes' },
  { id: 'not_sure', label: 'Not sure' },
  { id: 'no', label: 'No' },
] as const;

/** MF Worksheet 1's structure (practising or not), as chips the person taps if they fit. Nothing is saved from them. */
export const WHY_CHIPS = [
  { id: 'reach', label: 'I want this to be there on hard days' },
  { id: 'busy', label: 'My days are busy' },
  { id: 'forget', label: 'I forget to practise' },
  { id: 'calm', label: 'A calm minute sounds good' },
] as const;

export const PRACTICE_COPY = {
  title: 'Practice',
  intro: 'A minute at a time, while it\'s calm.',
  whyTitle: 'Skills practised when it\'s calm are the ones you can reach when it\'s loud.',
  whyHint: 'Tap any that fit.',
  whenTitle: 'When would a minute fit?',
  whenHint: 'A time of day brings a quiet card on Today. A cue is your own reminder.',
  timeHeading: 'A time of day',
  cueHeading: 'Or after something you already do',
  cueOwnHint: 'When I…',
  noneLabel: 'No reminder',
  breathTitle: 'Is it okay if some practices use your breath?',
  breathHint: 'Not sure counts as no. Your eyes stay open in every practice.',
  next: 'Next',
  done: 'Done',
  notNow: 'Not now',
  todayTitle: 'Today\'s practice',
  swap: 'A different kind',
  start: 'Start',
  floodedFirst: 'First, the body',
  floodedLine: 'Your body\'s loud right now. Practice works better once it has settled.',
  floodedLabel: 'Your body first',
  floodedPractice: 'Or try today\'s practice anyway. It\'s still here.',
  catchTitle: 'Caught one on your own?',
  catchJudgment: 'Caught a judgment',
  catchOffPhone: 'Did one without the app',
  catchDone: { judgment: 'Noticed. That\'s the skill.', off_phone: 'One without the app, noted.' },
  catchError: 'That didn\'t save. Try again in a moment.',
  unpack: 'Unpack it, if it\'s still there',
  weekTitle: 'This week',
  weekLabel: 'Practice this week',
  weekNone: 'Reps count whenever they happen.',
  weekSome: 'Reps count whenever they happen. Levels never go down.',
  /** The ring in words for a screen reader: never a number. */
  weekRing: (fraction: number) => (fraction <= 0 ? 'Nothing yet this week' : fraction >= 1 ? 'A full week' : 'Some practice this week'),
  skillsTitle: 'Your skills',
  skillLevel: (level: number) => (level === 0 ? 'Not tried yet' : level >= 5 ? 'Well practised' : `Level ${level}`),
  offPhoneLine: 'Some of your practice happens without the app now.',
  libraryTitle: 'All practices',
  libraryHint: 'Any of these, any time. Nothing is locked.',
  changeWhen: 'Change my reminder',
  signedOut: 'Sign in to keep your practice and get a quiet daily reminder.',
  loadError: 'Practice didn\'t load. Your reps are safe.',
  retry: 'Try again',
  loading: 'Loading',
  ownMissing: 'Add a few words, or pick another.',
} as const;
