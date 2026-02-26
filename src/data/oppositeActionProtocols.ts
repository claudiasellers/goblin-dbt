import type { DBTParentEmotion } from './dbt-parent-mapping';
import { getMapping } from './dbt-parent-mapping';

export interface OppositeActionProtocol {
  parent: DBTParentEmotion;
  label: string;
  actionUrge: string;
  oppositeActions: string[];
  bodyOpposite: string;
  allTheWay: string;
  whyItWorks: string;
  fitsFactsGuidance: string;
}

const protocols: OppositeActionProtocol[] = [
  {
    parent: 'fear',
    label: 'Fear',
    actionUrge: 'Avoid, run away, freeze, or escape from the situation.',
    oppositeActions: [
      'Approach what you\'re afraid of — gradually, step by step',
      'Stay in the situation until the fear naturally decreases',
      'Do what you\'ve been avoiding because of fear',
      'Repeat approach behaviors until fear subsides',
    ],
    bodyOpposite: 'Relax your body. Unclench your jaw and hands. Open your posture. Breathe slowly and deeply. Speak in a steady voice.',
    allTheWay: 'Don\'t just approach halfway or with one foot out the door. Throw yourself into it completely. No safety behaviors, no escape plans. Stay until the fear drops on its own.',
    whyItWorks: 'Fear tells you something is dangerous when it may not be. By approaching instead of avoiding, your brain learns the situation is actually safe. The fear has to come down — it always does.',
    fitsFactsGuidance: 'If there\'s a real threat, listen to the fear. Remove yourself from danger, problem-solve, or ask for help. Fear that fits the facts is protecting you.',
  },
  {
    parent: 'anger',
    label: 'Anger',
    actionUrge: 'Attack, lash out, criticize, or shut the other person out.',
    oppositeActions: [
      'Gently avoid the person instead of attacking',
      'Do something kind for the person you\'re angry at',
      'Try to see the situation from their perspective',
      'Imagine their reasons with compassion',
    ],
    bodyOpposite: 'Relax your face, unclench your fists, drop your shoulders. Speak softly and slowly. Half-smile. Keep your hands open and visible.',
    allTheWay: 'Don\'t be "nice" on the outside while seething inside. Actually try to feel sympathy or empathy. Let go of the righteous anger completely — not because they deserve it, but because you do.',
    whyItWorks: 'Anger narrows your focus to attack. Kindness and perspective-taking widen it. When you act gently, your brain starts to match — the anger can\'t sustain itself against genuine compassion.',
    fitsFactsGuidance: 'If someone actually violated your rights or crossed a boundary, anger is valid. Use it to assert yourself effectively (try DEAR MAN), set boundaries, or problem-solve.',
  },
  {
    parent: 'sadness',
    label: 'Sadness',
    actionUrge: 'Withdraw, isolate, go to bed, stop doing things, give up.',
    oppositeActions: [
      'Get active — move your body, even a short walk',
      'Approach people instead of pulling away',
      'Do one thing that gives you a sense of accomplishment',
      'Engage in activities even when you don\'t feel like it',
    ],
    bodyOpposite: 'Stand or sit upright. Look up, not down. Move with energy and purpose even if you have to fake it. Speak at a normal volume. Keep your face lifted.',
    allTheWay: 'Don\'t just go through the motions while mentally checked out. Actually engage with the activity and the people. Pay attention to what\'s happening around you. Throw yourself in.',
    whyItWorks: 'Sadness tells you to withdraw, which makes sense short-term but keeps you stuck. Activity and connection generate experiences that sadness can\'t account for. Movement changes brain chemistry.',
    fitsFactsGuidance: 'If you\'ve experienced a real loss, sadness is appropriate. Allow yourself to grieve. Reach out for support rather than isolating, but don\'t force yourself to "get over it."',
  },
  {
    parent: 'disgust',
    label: 'Disgust',
    actionUrge: 'Push away, reject, avoid, or withdraw from what disgusts you.',
    oppositeActions: [
      'Move toward what you\'re pushing away, not away from it',
      'Find one thing to appreciate about the person or situation',
      'Challenge the "contamination" feeling — is it based in reality?',
      'Stay present instead of leaving or shutting down',
    ],
    bodyOpposite: 'Relax your upper lip and nose. Open your hands instead of pushing away. Lean in slightly rather than recoiling. Keep a neutral or open facial expression.',
    allTheWay: 'Don\'t just tolerate from a distance. Actually engage. Stay in the conversation. Let yourself experience it fully without the disgust filter.',
    whyItWorks: 'Disgust evolved to protect from contamination, but it often fires in social situations where there\'s no real threat. Approaching teaches your brain the "contamination" isn\'t real.',
    fitsFactsGuidance: 'If something genuinely threatens your health or deeply violates your core values, disgust is protective. Remove yourself and problem-solve instead.',
  },
  {
    parent: 'shame',
    label: 'Shame',
    actionUrge: 'Hide, avoid eye contact, disappear, make yourself small, keep secrets.',
    oppositeActions: [
      'Tell someone you trust what happened — don\'t keep it secret',
      'Make eye contact during conversations',
      'Stand tall with shoulders back — take up space',
      'Repeat the behavior you\'re ashamed of (if it\'s not harmful) without hiding',
    ],
    bodyOpposite: 'Stand up straight, shoulders back. Lift your chin. Make eye contact. Speak clearly and at full volume. Take up space — don\'t shrink. Use a "proud" posture.',
    allTheWay: 'Don\'t mumble a confession while staring at the floor. Tell someone clearly, looking them in the eye, with your head held high. Own your full self — imperfections included.',
    whyItWorks: 'Shame thrives in secrecy and hiding. When you disclose and the world doesn\'t end — when people still accept you — shame\'s lie is exposed. You learn that you are not defective.',
    fitsFactsGuidance: 'If you actually violated your own deeply-held values, that may be guilt, not shame. Guilt says "I did something bad"; shame says "I am bad." If it\'s guilt, repair is the right move.',
  },
  {
    parent: 'guilt',
    label: 'Guilt',
    actionUrge: 'Avoid the person you wronged, over-apologize, punish yourself, or hide what you did.',
    oppositeActions: [
      'Do the behavior again mindfully, without hiding (if guilt doesn\'t fit)',
      'Validate that your actions were reasonable',
      'Let go of excessive apologizing — once is enough',
      'Stop punishing yourself — that\'s not the same as making amends',
    ],
    bodyOpposite: 'Stand normally — don\'t hunch or grovel. Keep a calm, steady voice. Don\'t wring your hands or bow your head excessively.',
    allTheWay: 'If the guilt doesn\'t fit the facts, act as if you did nothing wrong — because you didn\'t. No hedging, no seeking reassurance, no "I\'m sorry but..." Just live freely.',
    whyItWorks: 'Unjustified guilt is a false alarm. When you keep acting as if you did something wrong, you reinforce the belief. Acting freely teaches your brain that no harm was done.',
    fitsFactsGuidance: 'If you genuinely violated your own values: apologize sincerely, make amends where possible, commit to doing differently, and then — critically — let it go. Ongoing self-punishment isn\'t repair.',
  },
  {
    parent: 'jealousy',
    label: 'Jealousy',
    actionUrge: 'Control, check up on, monitor, interrogate, or cling to the person.',
    oppositeActions: [
      'Let go of checking, monitoring, or snooping behaviors',
      'Stop interrogating — ask once, then accept the answer',
      'Give the person freedom and space',
      'Share rather than hoarding their attention',
    ],
    bodyOpposite: 'Relax your grip — literally and figuratively. Open hands, soft face. Stop reaching for your phone to check. Let your body be at ease.',
    allTheWay: 'Don\'t just stop checking while anxiously wondering. Actually let go of the need to know. Trust fully, not halfway. If they\'re going out, say "have fun" and mean it.',
    whyItWorks: 'Jealousy\'s control behaviors push people away — the opposite of what you want. Letting go of control paradoxically builds the trust and closeness jealousy craves.',
    fitsFactsGuidance: 'If trust has actually been broken, jealousy may be warranted. Address it directly through honest conversation, not surveillance. Consider whether the relationship can be rebuilt.',
  },
  {
    parent: 'envy',
    label: 'Envy',
    actionUrge: 'Tear down what others have, compare obsessively, sabotage, or give up.',
    oppositeActions: [
      'Count your own blessings — literally list them',
      'Genuinely compliment or celebrate what you envy in others',
      'Use envy as information: what does it tell you about what YOU want?',
      'Inhibit urges to undermine or diminish others\' success',
    ],
    bodyOpposite: 'Soften your face. Let go of the tight jaw and narrowed eyes. Smile genuinely when acknowledging others\' success. Open your posture.',
    allTheWay: 'Don\'t just fake a congratulations while seething inside. Actually practice feeling happy for them. Cheer them on as if their success were your own.',
    whyItWorks: 'Envy focuses you on scarcity — what you don\'t have. Celebrating others and counting blessings shifts your brain to abundance. Envy can\'t survive genuine gratitude.',
    fitsFactsGuidance: 'If envy points to something you genuinely want and can pursue, use it as motivation. Channel it into action toward your own goals rather than tearing others down.',
  },
  {
    parent: 'love',
    label: 'Love (when it doesn\'t fit the facts)',
    actionUrge: 'Pursue the person, idealize them, stay close, make contact, ignore red flags.',
    oppositeActions: [
      'Avoid unnecessary contact with the person',
      'Distract yourself when you want to reach out',
      'Remind yourself of the realistic negatives, not just the idealized positives',
      'Stop looking at their social media or asking about them',
    ],
    bodyOpposite: 'When you feel the pull to reach out, put your hands in your lap. Turn away from your phone. Take a breath and ground yourself before acting.',
    allTheWay: 'Don\'t half-distance. Actually go no-contact if needed. Delete the draft text. Unfollow. Stop "accidentally" going places they\'ll be. Every approach resets the clock.',
    whyItWorks: 'Love that doesn\'t fit the facts — someone unavailable, harmful, or gone — keeps you stuck through intermittent reinforcement. Each contact resets the clock. Distance lets the attachment fade.',
    fitsFactsGuidance: 'If the love is for someone available, mutual, and healthy — lean into it. Approach with vulnerability. Express your feelings. Love that fits the facts is worth pursuing.',
  },
];

// --- Lookup ---

const protocolByParent = new Map(protocols.map(p => [p.parent, p]));

export function getProtocol(parent: DBTParentEmotion): OppositeActionProtocol | undefined {
  return protocolByParent.get(parent);
}

export function lookupEmotion(emotionId: string): {
  mapping: ReturnType<typeof getMapping>;
  protocol: OppositeActionProtocol | undefined;
} {
  const mapping = getMapping(emotionId);
  const protocol = mapping?.primary ? protocolByParent.get(mapping.primary) : undefined;
  return { mapping, protocol };
}
