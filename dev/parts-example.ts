/**
 * An invented person for the parts harness (dev/parts.html): their parts, the den's snapshots and the
 * evidence behind a trail offer. Demo data, not graph content: every move, prompt and option the harness
 * shows comes from tests/fixtures/parts-content.json (python3 scripts/parts/fixture.py). Nothing here is
 * served by the app.
 */
import type { RegionId } from '../src/data/bodyFigure';

export type MoveId = string;
export type Quadrant = 'hu' | 'hp' | 'lu' | 'lp';

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

/**
 * The trail this person's offer is about: which rule fired, in which context, for which moves. The
 * statement itself is the rule's template filled from the content fixture; the rows are what the app saw.
 */
export const OFFER = {
  ruleId: 'trail_two_pulls',
  contextId: 'ctx_event_leaving',
  pull: 'chase',
  pull2: 'hide',
  evidence: [
    ['Tue 14 Sep', 'Recover', 'They pulled away', 'Chase them'],
    ['Sat 18 Sep', 'Find the feeling', 'Something with someone', 'Chase it'],
    ['Wed 22 Sep', 'Recover', 'They pulled away', 'Hide'],
    ['Mon 27 Sep', 'Ask for what you need', 'Partner', 'I went quiet'],
    ['Fri 1 Oct', 'Find the feeling', 'Something with someone', 'Disappear'],
  ],
};
