// One shared script so the three directions differ only in how they're delivered.
// Principle: recognise, don't rate. No numeric scales anywhere.

export type Band = 'steady' | 'stirred' | 'flooded';
export type Pull = 'chase' | 'fight' | 'hide' | 'blank';

export interface Scenario { id: string; question: string; short: string; phrase: string; words: string[]; need: string }

/** Asked one at a time, stop at the first yes. Concrete, observable, externally oriented. */
export const SCENARIOS: Scenario[] = [
  { id: 'brushed', question: 'Did they brush off something you said?', short: 'brushed off', phrase: 'brushed off', words: ['hurt', 'dismissed', 'frustrated'], need: 'them to actually listen' },
  { id: 'mocked', question: 'Did they laugh at you or twist your words?', short: 'mocked', phrase: 'made fun of', words: ['humiliated', 'embarrassed', 'furious'], need: 'to be taken seriously' },
  { id: 'left-out', question: 'Were you left out or ignored?', short: 'left out', phrase: 'left out', words: ['excluded', 'lonely', 'invisible'], need: 'to be included' },
  { id: 'pulled-away', question: 'Did someone go quiet or pull away from you?', short: 'pulled away', phrase: 'left hanging', words: ['scared', 'abandoned', 'anxious'], need: 'to know they’re still there' },
  { id: 'small', question: 'Did they make you feel small or stupid?', short: 'made small', phrase: 'made to feel small', words: ['ashamed', 'small', 'worthless'], need: 'to be treated as someone who matters' },
];

/** Capacity instead of intensity: what could you actually do right now? Maps to the three clinical bands. */
export const CAPACITY = {
  prompt: 'If they texted you right now, you’d…',
  incoming: 'hey, can we talk?',
  options: [
    { band: 'steady' as Band, reply: 'Reply like normal', example: '“sure, what’s up?”' },
    { band: 'stirred' as Band, reply: 'Reply with an edge', example: '“oh NOW you want to talk”' },
    { band: 'flooded' as Band, reply: 'Couldn’t reply, or would regret it', example: '…' },
  ],
};

export const PULLS: { id: Pull; label: string; detail: string }[] = [
  { id: 'chase', label: 'Text them a lot', detail: 'explain, fix it, now' },
  { id: 'fight', label: 'Say something sharp', detail: 'prove them wrong' },
  { id: 'hide', label: 'Disappear', detail: 'cancel, go quiet' },
  { id: 'blank', label: 'Nothing. I’m blank', detail: 'numb, heavy, far away' },
];

export function validationFor(s: Scenario) {
  return `Of course that got to you. You got ${s.phrase}, and that stings for anyone.`;
}
export const VALIDATION_FOLLOW = 'The feeling makes sense, even before we know the whole story.';

export const EXITS = {
  steady: { title: 'Ask them to hear you', body: 'One clear message. We’ll build it together.' },
  land: { title: 'Let it land', body: 'You don’t need them to get it for the need to be met.' },
  opposite: {
    chase: { title: 'Wait instead of chasing', body: 'An hour. Then, if you still want to, one calm message.' },
    fight: { title: 'Step back instead of hitting back', body: 'You can still raise it later, once it’s quieter.' },
    hide: { title: 'One small visible step', body: 'Say hi to one person. No explanation needed.' },
    blank: { title: 'Come back into the room', body: 'Stand up, look around, name three things.' },
  },
};

export const CLOSE = {
  prompt: 'Compared to when you opened this, it’s…',
  options: [
    { id: 'louder', label: 'Louder' },
    { id: 'same', label: 'About the same' },
    { id: 'quieter', label: 'Quieter' },
    { id: 'much', label: 'A lot quieter' },
  ],
};

/** Feelings vocabulary as the game: each accepted word joins the collection (emotional granularity). */
export const STARTING_WORDS = ['frustrated', 'lonely', 'anxious', 'tired'];
