/**
 * Fixture content for the parts harness (dev/parts.html). Draft copy from docs/design/parts.md, not
 * signed off. When the feature is built this moves to scripts/parts/content.py → schema/parts.cypher and
 * the harness reads a generated fixture, like the other harnesses. Nothing here is served by the app.
 */
import type { RegionId } from '../src/data/bodyFigure';

export type MoveId = 'hit_back' | 'chase' | 'hide' | 'keep_the_peace' | 'turn_on_myself' | 'take_less_room' | 'keep_watch' | 'put_it_off';
export type Quadrant = 'hu' | 'hp' | 'lu' | 'lp';
export type Flag = 'tender' | 'danger' | null;

export interface Move { id: MoveId; label: string; unblendPhrase: string; nameHint: string; safetyLine?: boolean }
export interface Option { id: string; label: string; flag?: Flag; selfLike?: boolean | null }

export const MOVES: Record<MoveId, Move> = {
  hit_back: { id: 'hit_back', label: 'Hit back', unblendPhrase: 'wants to hit back', nameHint: 'the one who hits back' },
  chase: { id: 'chase', label: 'Chase it, fix it now', unblendPhrase: 'wants to chase this down', nameHint: 'the one who chases' },
  hide: { id: 'hide', label: 'Hide', unblendPhrase: 'wants to hide', nameHint: 'the one who hides' },
  keep_the_peace: { id: 'keep_the_peace', label: 'Keep the peace', unblendPhrase: 'wants to keep the peace', nameHint: 'the one who keeps the peace' },
  turn_on_myself: { id: 'turn_on_myself', label: 'Turn on myself', unblendPhrase: 'is turning on you', nameHint: 'the one who turns on me', safetyLine: true },
  take_less_room: { id: 'take_less_room', label: 'Take up less room', unblendPhrase: 'wants you to take up less room', nameHint: 'the one who makes me small' },
  keep_watch: { id: 'keep_watch', label: 'Keep watch', unblendPhrase: 'is keeping watch', nameHint: 'the one who keeps watch' },
  put_it_off: { id: 'put_it_off', label: 'Put it off', unblendPhrase: 'wants to put this off', nameHint: 'the one who puts it off' },
};

export const PROMPTS = {
  find: 'What’s showing up?',
  where: 'Where do you notice it?',
  whereNone: 'Nowhere I can find',
  shape: 'Which is closer to it?',
  shapeCantTell: 'Can’t tell',
  age: 'How old does it seem?',
  youngOffer: 'It sounds young. Want to keep it gentle?',
  voice: 'Does it say anything?',
  feel: 'How do you feel toward it right now?',
  unblend: 'That reaction is a part too. Can it give you some room, for now?',
  unblendEnd: 'That’s enough for today. The part that’s worried about it counts too.',
  unblendLater: 'Want to get to know that one another time?',
  nothing: 'Sometimes there’s nothing there yet. That’s fine.',
  job: 'What’s it trying to do for you?',
  likes: 'Does it like this job?',
  fear: 'What’s it afraid would happen if it stopped?',
  stopTitle: 'It’s guarding something tender.',
  stopBody: 'We’ll leave that be. You found the guard, and that counts.',
  stopTherapist: 'If you see a therapist, this is a good thing to bring.',
  dangerNote: 'If things get loud: call or text 988, or text HOME to 741741.',
  update: 'Does it know how old you are now?',
  updateShow: 'Show it something you can do now.',
  thank: 'Thank it for trying to protect you.',
  hold: 'Press and hold',
  thanked: 'Thanked',
  rather: 'If it didn’t have to do this, what would it rather do?',
  name: 'Want to give it a name?',
  keep: 'Keep it in Parts of me?',
  tender: 'Can you let it know you’re here?',
  tenderSub: 'You don’t need to do anything else.',
  close: 'Compared to when you started, you feel…',
  ownWords: 'In my words',
};

export const AGES: Option[] = [
  { id: 'school', label: 'school age' }, { id: 'teen', label: 'teenage' }, { id: 'now', label: 'about your age' },
  { id: 'older', label: 'older' }, { id: 'cant', label: 'can’t tell' }, { id: 'little', label: 'little' },
];

export const FEEL_TOWARD: Option[] = [
  { id: 'curious', label: 'curious', selfLike: true }, { id: 'steady', label: 'steady', selfLike: true },
  { id: 'warm', label: 'warm toward it', selfLike: true }, { id: 'open', label: 'open', selfLike: true },
  { id: 'annoyed', label: 'annoyed', selfLike: false }, { id: 'scared', label: 'scared of it', selfLike: false },
  { id: 'gone', label: 'want it gone', selfLike: false }, { id: 'ashamed', label: 'ashamed of it', selfLike: false },
  { id: 'tired', label: 'tired of it', selfLike: false },
  { id: 'not_sure', label: 'not sure', selfLike: null }, { id: 'nothing', label: 'nothing', selfLike: null },
];

export const UNBLEND: Option[] = [{ id: 'eased', label: 'It eased off' }, { id: 'still', label: 'It’s still here' }, { id: 'unsure', label: 'Not sure' }];
export const LIKES: Option[] = [{ id: 'tired', label: 'It’s tired' }, { id: 'proud', label: 'It’s proud of it' }, { id: 'unsure', label: 'Not sure' }];
export const UPDATE: Option[] = [{ id: 'yes', label: 'Yes' }, { id: 'no', label: 'It doesn’t seem to' }, { id: 'unsure', label: 'Not sure' }];
export const CAN_NOW: Option[] = [
  { id: 'leave', label: 'I can leave a room' }, { id: 'ask', label: 'I can ask for help' },
  { id: 'people', label: 'I have people now' }, { id: 'no', label: 'I can say no' },
];
export const CLOSE: Option[] = [
  { id: 'further', label: 'Further away' }, { id: 'same', label: 'About the same' },
  { id: 'here', label: 'More here' }, { id: 'more_here', label: 'More here, and steadier' },
];

/** Per-move chips (PartOption rows). */
export const BY_MOVE: Record<MoveId, { voice: Option[]; job: Option[]; fear: Option[]; rather: Option[] }> = {
  hide: {
    voice: [{ id: 'v1', label: 'Don’t let them see' }, { id: 'v2', label: 'Get out before they leave' }, { id: 'v3', label: 'It’s safer alone' }],
    job: [{ id: 'j1', label: 'Keep me out of sight' }, { id: 'j2', label: 'Keep me from being pushed out' }, { id: 'j3', label: 'Keep me from making it worse' }],
    fear: [
      { id: 'f1', label: 'I’d be too much and they’d leave' }, { id: 'f2', label: 'I’d say something I regret' },
      { id: 'f3', label: 'I’d feel the old hurt', flag: 'tender' }, { id: 'f4', label: 'Something would come up I can’t handle', flag: 'tender' },
    ],
    rather: [{ id: 'r1', label: 'Let me know when I need someone' }, { id: 'r2', label: 'Help me take a break, then come back' }],
  },
  chase: {
    voice: [{ id: 'v1', label: 'Fix it now' }, { id: 'v2', label: 'Make sure they’re not angry' }, { id: 'v3', label: 'Don’t let them go' }],
    job: [{ id: 'j1', label: 'Make sure they don’t leave' }, { id: 'j2', label: 'Get an answer so I can breathe' }],
    fear: [
      { id: 'f1', label: 'I’d be left and not know why' }, { id: 'f2', label: 'The waiting would be unbearable' },
      { id: 'f3', label: 'I’d feel the old hurt', flag: 'tender' },
    ],
    rather: [{ id: 'r1', label: 'Tell me when I need reassurance, so I can ask' }, { id: 'r2', label: 'Help me wait a little' }],
  },
  hit_back: {
    voice: [{ id: 'v1', label: 'They can’t talk to you like that' }, { id: 'v2', label: 'Don’t let it slide' }],
    job: [{ id: 'j1', label: 'Make sure I’m taken seriously' }, { id: 'j2', label: 'Stop them before it gets worse' }],
    fear: [
      { id: 'f1', label: 'They’d walk all over me' }, { id: 'f2', label: 'I’d disappear' },
      { id: 'f3', label: 'I’d do something I can’t take back', flag: 'danger' },
    ],
    rather: [{ id: 'r1', label: 'Tell me when something matters' }, { id: 'r2', label: 'Help me stand up for myself, steady and out loud' }],
  },
  keep_the_peace: {
    voice: [{ id: 'v1', label: 'Just agree' }, { id: 'v2', label: 'Don’t make it a thing' }],
    job: [{ id: 'j1', label: 'Keep everyone calm' }, { id: 'j2', label: 'Make sure nobody gets angry' }],
    fear: [{ id: 'f1', label: 'They’d get angry and I couldn’t handle it' }, { id: 'f2', label: 'I’d be a burden' }],
    rather: [{ id: 'r1', label: 'Help me notice when I’m agreeing too fast' }],
  },
  turn_on_myself: {
    voice: [{ id: 'v1', label: 'You always do this' }, { id: 'v2', label: 'It’s your fault' }],
    job: [{ id: 'j1', label: 'Stop me from doing that again' }, { id: 'j2', label: 'Get there before anyone else does' }],
    fear: [{ id: 'f1', label: 'I’d turn into someone who hurts people' }, { id: 'f2', label: 'It would hurt me', flag: 'danger' }],
    rather: [{ id: 'r1', label: 'Point out what I want to do differently, kindly' }],
  },
  take_less_room: { voice: [{ id: 'v1', label: 'Don’t ask' }], job: [{ id: 'j1', label: 'Keep me from being too much' }], fear: [{ id: 'f1', label: 'I’d be a burden' }], rather: [{ id: 'r1', label: 'Help me ask for small things first' }] },
  keep_watch: { voice: [{ id: 'v1', label: 'What if…' }], job: [{ id: 'j1', label: 'See trouble coming' }], fear: [{ id: 'f1', label: 'I’d be caught off guard' }], rather: [{ id: 'r1', label: 'Keep watch, then let me rest' }] },
  put_it_off: { voice: [{ id: 'v1', label: 'Later' }], job: [{ id: 'j1', label: 'Keep me from failing at it' }], fear: [{ id: 'f1', label: 'I’d find out I can’t do it' }], rather: [{ id: 'r1', label: 'Help me start small' }] },
};

/** An invented person's parts, for the den and the card. */
export interface ExamplePart {
  id: string; name: string; move: MoveId; hue: Quadrant; shape: [number, number, number, number, number];
  places: RegionId[]; sub: string; job: string; fear: string; rather: string; helped: string; feel: string;
  tender?: boolean; resting?: boolean;
}

export const PARTS: ExamplePart[] = [
  { id: 'chase', name: 'the one who chases', move: 'chase', hue: 'hu', shape: [0.6, 0.7, -0.2, 0.8, 0.3], places: ['chest', 'hands'],
    sub: 'Shows up when someone pulls away, mostly evenings', job: 'make sure they don’t leave', fear: 'I’d be left and not know why',
    rather: 'tell me when I need reassurance, so I can ask', helped: 'Pause helped 3 of the 4 times', feel: 'In August: annoyed. Lately: warm toward it.' },
  { id: 'hide', name: 'the one who hides', move: 'hide', hue: 'lu', shape: [-0.4, -0.5, 0.5, -0.3, -0.6], places: ['throat', 'stomach'],
    sub: 'Shows up when someone pulls away, and after hard conversations', job: 'keep me from being pushed out', fear: 'I’d be too much and they’d leave',
    rather: 'let me know when I need someone', helped: 'Recover helped 2 of the 3 times', feel: 'In August: tired of it. Lately: curious.' },
  { id: 'critic', name: 'the critic at night', move: 'turn_on_myself', hue: 'hu', shape: [0.9, 0.2, 0.1, 0.2, 0.9], places: ['jaw', 'head'],
    sub: 'Often comes the morning after a fight', job: 'stop me from doing that again', fear: 'I’d turn into someone who hurts people',
    rather: 'Not sure yet', helped: 'Not enough tagged closes yet', feel: 'Not enough answers yet to compare.' },
  { id: 'peace', name: 'the one who keeps the peace', move: 'keep_the_peace', hue: 'lp', shape: [-0.7, -0.2, 0.2, -0.6, 0.4], places: ['shoulders', 'jaw'],
    sub: 'Showed up in conversations with your boss', job: 'keep everyone calm', fear: 'they’d get angry and I couldn’t handle it',
    rather: 'help me notice when I’m agreeing too fast', helped: 'Ask for what you need helped 3 of the 4 times', feel: 'In July: scared of it. Lately: steady.', resting: true },
  { id: 'little', name: 'the little one', move: 'hide', hue: 'lu', shape: [-0.8, 0.1, -0.4, -0.8, -0.2], places: [],
    sub: '', job: '', fear: '', rather: '', helped: '', feel: '', tender: true },
];

/** Den snapshots: x / y in 0–1 of the room, light 0–1 = how recently visited. */
export const SNAPSHOTS: Record<'july' | 'now', { at: Record<string, { x: number; y: number; light: number }>; links: [string, string, 'two_pulls' | 'covers_for'][] }> = {
  now: {
    at: { chase: { x: 0.28, y: 0.36, light: 0.95 }, hide: { x: 0.7, y: 0.37, light: 0.9 }, critic: { x: 0.24, y: 0.74, light: 0.55 },
      peace: { x: 0.8, y: 0.76, light: 0.3 }, little: { x: 0.58, y: 0.68, light: 0.6 } },
    links: [['chase', 'hide', 'two_pulls'], ['hide', 'little', 'covers_for']],
  },
  july: {
    at: { chase: { x: 0.12, y: 0.2, light: 0.25 }, hide: { x: 0.88, y: 0.18, light: 0.2 }, critic: { x: 0.32, y: 0.64, light: 0.65 },
      peace: { x: 0.64, y: 0.7, light: 0.85 }, little: { x: 0.86, y: 0.86, light: 0.08 } },
    links: [],
  },
};

export const OFFER = {
  eyebrow: 'Something keeps showing up',
  statement: 'When someone pulls away, two pulls: to chase it, and to hide.',
  ask: 'Want to take a look?',
  evidenceTitle: 'What the app saw',
  evidence: [
    ['Tue 14 Sep', 'Recover', 'They pulled away', 'Chase them'],
    ['Sat 18 Sep', 'Find the feeling', 'Something with someone', 'Chase it'],
    ['Wed 22 Sep', 'Recover', 'They pulled away', 'Hide'],
    ['Mon 27 Sep', 'Ask for what you need', 'Partner', 'I went quiet'],
    ['Fri 1 Oct', 'Find the feeling', 'Something with someone', 'Disappear'],
  ],
  question: 'Does this feel like a part of you?',
  answers: ['Yes, a part of me', 'More than one', 'It’s just what happens', 'Not me'],
};
