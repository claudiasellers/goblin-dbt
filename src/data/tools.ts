import type { ModuleId } from './modules';

export interface Tool {
  id: string;
  name: string;
  tagline: string;
  description: string;
  whenToUse: string;
  module: ModuleId;
  dbtBasis?: string;
  emoji: string;
  /** The tool's own screen carries the instructions: the page skips the tagline and "When to use this". */
  bare?: boolean;
  /**
   * Absent: listed for everyone. `'parts'`: listed only for a person with parts on whose copy for the tool
   * has shipped (Meet a part: Tools.tsx passes `parts` from the same gate ToolPage opens it with,
   * useToolGate); always reachable by its links (Me, Settings, an offer) under that gate. `false`: reached
   * only by a link. Neither is ever in the intents or recommended by routing.
   */
  listed?: false | 'parts';
  /**
   * Persist-nothing (plan C3a R15): the visit's session isn't started when the page opens; the tool's skill starts
   * it, or never does (its `persist`). Ending a relationship: its safety branch saves nothing unless chosen.
   */
  deferSession?: boolean;
  /**
   * More cards for the same tool in its module's list on the Tools page, each opening one of its modes by query
   * (My crisis kit's *Make it*; Claudia, 12 Nov: both under Distress Tolerance). Same module, same tool id.
   */
  moreCards?: ToolModeCard[];
}

export interface ToolModeCard {
  key: string;
  name: string;
  tagline: string;
  emoji: string;
  /** The query the card opens the tool with, e.g. `frame=build`. */
  query: string;
}

export const tools: Tool[] = [
  // Distress Tolerance
  {
    id: 'cool-down',
    name: 'First, the body',
    tagline: 'Bring your body down first, one tap at a time',
    description: 'Say what it\'s like with one tap, and get one thing for your body: cold on your face (Circuit Breaker), a squeeze, a long breath out, a press, or eyes open.',
    whenToUse: 'When your body is too loud to think.',
    module: 'distress-tolerance',
    dbtBasis: 'TIP skills',
    emoji: '🧊',
    bare: true,
  },
  {
    id: 'pause',
    name: 'Hold to wait',
    tagline: 'Hold off on the urge for a moment',
    description: 'Name the pull, hold the ring until it eases a little, step back, then pick what to do with it.',
    whenToUse: 'When you\'re about to say or do something you might regret.',
    module: 'distress-tolerance',
    dbtBasis: 'STOP Skill',
    emoji: '✋',
  },
  {
    id: 'five-senses',
    name: '5-4-3-2-1',
    tagline: 'Ground yourself through your senses',
    description: 'Notice things around you using each of your five senses to anchor yourself in the present moment.',
    whenToUse: 'When you feel disconnected, anxious, or caught up in racing thoughts.',
    module: 'distress-tolerance',
    dbtBasis: '5-4-3-2-1 Grounding',
    emoji: '👁️',
  },
  {
    id: 'urge-surfing',
    name: 'Ride it out',
    tagline: 'Watch the urge rise and fall without acting on it',
    description: 'The urge as a wave on the screen. Every so often, a one-tap check: still here, fading, gone or bigger. Tell it "not now" whenever you want, with something else to do instead.',
    whenToUse: 'When an urge won\'t settle and you need to get through the next stretch.',
    module: 'distress-tolerance',
    dbtBasis: 'Urge surfing; adaptive denial (DT Handout 21)',
    emoji: '🌊',
    bare: true,
  },
  {
    id: 'let-it-be',
    name: 'Let it be',
    tagline: 'Stop fighting what you can\'t change, a little at a time',
    description: 'For something you\'ve checked and can\'t change right now: notice the fight with it, let your hands practise letting go, find words for it, and see what\'s still in your hands.',
    whenToUse: 'When you keep fighting something that already happened, or someone who won\'t change.',
    module: 'distress-tolerance',
    dbtBasis: 'Radical acceptance, turning the mind, willingness (DT Handouts 10-14)',
    emoji: '🍃',
    bare: true,
  },
  {
    id: 'mind-job',
    name: 'Give your mind a job',
    tagline: 'Something small for your mind to do while it settles',
    description: 'When your mind won\'t stop: small things to find around you that get warmer as you go, a break with a time to come back, or a lid to put it under for later.',
    whenToUse: 'When a loop keeps going and there\'s nothing to do about it right now.',
    module: 'distress-tolerance',
    dbtBasis: 'Distract with Wise Mind ACCEPTS (DT Handouts 7, 9)',
    emoji: '🫙',
    bare: true,
  },
  {
    id: 'soothe',
    name: 'Held',
    tagline: 'A minute of being looked after, by your own hands',
    description: 'A hand on your heart (or something warm or soft to hold instead), warmth, one thing for your senses, or kind words in your own voice. A minute, then how it feels.',
    whenToUse: 'When you feel raw, worn out or alone, or at the end of a bad night.',
    module: 'distress-tolerance',
    dbtBasis: 'Self-soothe with the five senses (DT Handouts 8, 8a)',
    emoji: '🫶',
    bare: true,
  },
  {
    id: 'thoughts-passing',
    name: 'Thoughts passing through',
    tagline: 'A thought is a thought, not a fact',
    description: 'Catch the thought, see what kind it is, and hold it a little further off: on a leaf, on a screen, or with "I\'m having the thought that…" in front. Then back to the room.',
    whenToUse: 'When a thought feels like a fact or an order, and you\'re steady enough to watch it.',
    module: 'distress-tolerance',
    dbtBasis: 'Mindfulness of current thoughts (DT Handout 15)',
    emoji: '🍂',
    bare: true,
  },
  {
    id: 'alternate-rebellion',
    name: 'Rebel without the wreckage',
    tagline: 'Push back without paying for it tomorrow',
    description: 'When you want to blow it all up, name what\'s squeezing you and pick a rebellion built not to cost you tomorrow.',
    whenToUse: 'When you feel stuck or controlled and want to quit, walk out or blow up something big.',
    module: 'distress-tolerance',
    dbtBasis: 'Alternate rebellion (DT Handout 21)',
    emoji: '🎸',
    bare: true,
  },
  {
    // DT-10 on the skill runtime (docs/design/pros-cons.md): made while steady, for one pull that keeps coming back;
    // kept in Me, Hold to wait shows it when the same pull comes up.
    id: 'pros-cons',
    name: 'Pros & cons card',
    tagline: 'Your reasons, ready for a harder moment',
    description: 'For a pull that keeps coming back: your reasons not to, what doing it gives you, and what holding off costs and gives, on one card you can keep.',
    whenToUse: 'When things are calm enough to think it through, before the next time it pulls.',
    module: 'distress-tolerance',
    dbtBasis: 'Pros and cons (DT Handout 5)',
    emoji: '⚖️',
    bare: true,
  },
  {
    // DT-09 on the skill runtime (docs/design/habit-plan.md): dialectical abstinence for one behaviour, with a lapse
    // plan; the habit_renew card checks in when the stretch ends.
    id: 'habit-plan',
    name: 'When it\'s a habit',
    tagline: 'All in, with a plan for a slip',
    description: 'For something you keep going back to: commit for a stretch you can keep, make it harder to get to, pick what you\'ll turn to when a craving comes, and plan what you\'ll do if you slip.',
    whenToUse: 'When things are calm enough to plan, for drinking, using, bingeing, gambling, spending, scrolling or anything else you keep doing.',
    module: 'distress-tolerance',
    dbtBasis: 'Dialectical abstinence (DT Handouts 16–21)',
    emoji: '🌉',
    bare: true,
  },
  {
    // DT-03 on the skill runtime (docs/design/crisis-kit.md): two skills under one id. Opening it plays the kit one
    // card at a time (a starter kit until the person makes their own); `?frame=build` makes it.
    id: 'crisis-kit',
    name: 'My crisis kit',
    tagline: 'What helps, one card at a time',
    description: 'Your own ideas from a calmer day, handed back when you can\'t think straight: something for your body, something to keep your hands busy, something soothing, words for you, a safe place and your reasons to get through. One card at a time.',
    whenToUse: 'On a hard night when you can\'t remember what helps. Make it on a calmer day so it\'s ready.',
    module: 'distress-tolerance',
    dbtBasis: 'Crisis survival skills (DT Handouts 6–9a)',
    emoji: '🧰',
    bare: true,
    moreCards: [{ key: 'build', name: 'Make my crisis kit for hard nights', tagline: 'On a calmer day, so it\'s ready for a hard night', emoji: '🧰', query: 'frame=build' }],
  },
  // Emotion Regulation
  {
    id: 'opposite-action',
    name: 'Do the Opposite',
    tagline: 'Act opposite to unhelpful urges',
    description: 'When an emotion\'s action urge isn\'t helpful, doing the opposite can shift how you feel.',
    whenToUse: 'When your emotion is pushing you toward something that won\'t help.',
    module: 'emotion-regulation',
    dbtBasis: 'Opposite Action',
    emoji: '🔄',
    // The doors ask their own question first; the tagline and "When to use" box pushed them off a phone's first screen.
    bare: true,
  },
  {
    id: 'find-the-feeling',
    name: 'Find the feeling',
    tagline: 'When something\'s there but you can\'t tell what',
    description: 'No words needed to start. Match what\'s inside to a shape you can see, or a sound you can hear, and the word comes to you as a guess you can keep or refuse.',
    whenToUse: 'When you feel something but can\'t name it, or everything feels like one big blur.',
    module: 'emotion-regulation',
    dbtBasis: 'Observing, describing and naming emotions',
    emoji: '🫧',
  },
  {
    id: 'problem-solve',
    name: 'Problem Solve',
    tagline: 'Address the cause of distress',
    description: 'When the emotion fits the facts and the situation can be changed, problem-solving is the right move. Break the problem into steps and take action.',
    whenToUse: 'When your distress is about a real problem that has a solution.',
    module: 'emotion-regulation',
    dbtBasis: 'Problem Solving',
    emoji: '🛠️',
    bare: true,
  },
  {
    id: 'cope-ahead',
    name: 'Cope Ahead',
    tagline: 'Plan for something hard that\'s coming',
    description: 'Name what\'s coming and what might show up, pick what you\'ll do at the hardest moment, and rehearse it once in your mind.',
    whenToUse: 'When something hard is coming and you want to be ready for it.',
    module: 'emotion-regulation',
    dbtBasis: 'DBT ER Handout 19',
    emoji: '🧭',
    bare: true,
  },
  {
    // The first skill on the skill runtime (docs/design/skill-runtime.md): its screens are graph data.
    id: 'check-the-facts',
    name: 'Check the Facts',
    tagline: 'See if a feeling fits what happened',
    description: 'Name the feeling, set down what happened, notice the story you\'re telling about it and other ways to see it, then check whether the feeling fits the facts.',
    whenToUse: 'When a feeling is strong and you\'re not sure it matches what happened.',
    module: 'emotion-regulation',
    dbtBasis: 'DBT ER Handout 8',
    emoji: '🔍',
    bare: true,
  },
  {
    // ER-14 on the skill runtime (docs/design/er-troubleshoot.md): for when a skill was done and didn't help.
    id: 'er-troubleshoot',
    name: 'It Isn\'t Working',
    tagline: 'Find what got in the way of a skill',
    description: 'When you used a skill and it didn\'t help, go through the usual reasons one tap at a time, and find one thing to try next.',
    whenToUse: 'When you did a skill and nothing changed.',
    module: 'emotion-regulation',
    dbtBasis: 'DBT ER Handout 24',
    emoji: '🧩',
    bare: true,
  },
  {
    // ER-15 on the skill runtime (docs/design/nightmare-rescript.md): a nightmare that keeps coming back, changed
    // while awake. Not for one that replays something real (a clinician's), never from the check-in or night mode.
    id: 'nightmare-rescript',
    name: 'Rewrite the Nightmare',
    tagline: 'Write a new version of a recurring nightmare, while you\'re awake',
    description: 'Pick a nightmare that keeps coming back, change it before the bad part, give it a new ending, and read the new version through. Stop at any point.',
    whenToUse: 'When the same nightmare keeps coming back. Best in the daytime.',
    module: 'emotion-regulation',
    dbtBasis: 'DBT ER Handout 20a',
    emoji: '🌙',
    bare: true,
  },
  {
    // ER-07 on the skill runtime (docs/design/running-low.md): PLEASE, for a day when everything is too loud.
    id: 'please-skill',
    name: 'Running Low',
    tagline: 'Check what your body is running on today',
    description: 'Sleep, food, your body, last night and moving, one tap each. See which one is turning the volume up, and pick one small thing for it today.',
    whenToUse: 'When everything feels like too much today and you don\'t know why.',
    module: 'emotion-regulation',
    dbtBasis: 'DBT ER Handout 20 (PLEASE)',
    emoji: '🔋',
    bare: true,
  },
  {
    // ER-13 on the skill runtime (docs/design/sleep-reset.md): sleep hygiene, the wake-time anchor and the night.
    id: 'sleep-reset',
    name: 'Sleep Reset',
    tagline: 'For a night you can\'t sleep, or to set up your sleep times',
    description: 'Awake at night: put the thought down, breathe slowly, and get up for a bit instead of lying there. Or pick one time to get up every day and one thing to wind down with, and check in the next morning.',
    whenToUse: 'When you can\'t sleep, or when sleep has been all over the place and everything feels louder for it.',
    module: 'emotion-regulation',
    dbtBasis: 'DBT ER Handout 20b (sleep hygiene)',
    emoji: '🛌',
    bare: true,
  },
  {
    // ER-04 on the skill runtime (docs/design/good-things.md): accumulating positives, and the things I like list.
    id: 'good-things',
    name: 'Good Things',
    tagline: 'Find one okay thing, or plan one good thing for today',
    description: 'Notice one thing that\'s even a little okay and stay with it for a moment, or pick one small good thing to do today. Keep what helped in Things I like.',
    whenToUse: 'When nothing sounds good, or when something is good and you want to keep it.',
    module: 'emotion-regulation',
    dbtBasis: 'DBT ER Handouts 15–16 (accumulating positives)',
    emoji: '🌼',
    bare: true,
  },
  {
    // ER-09 on the skill runtime (docs/design/values.md): values and priorities, and one small step for one.
    id: 'values-clarification',
    name: 'What Matters to Me',
    tagline: 'Find what matters to you, then take one small step for it',
    description: 'Sort plain-word value cards, keep up to three for now, and pick one small step this week for one of them. Not sure yet is a full answer.',
    whenToUse: 'When you\'re not sure what you care about, or a choice feels hard and you want a direction.',
    module: 'emotion-regulation',
    dbtBasis: 'DBT ER Handouts 17–18 (values and priorities)',
    emoji: '🧭',
    bare: true,
  },
  {
    // ER-11 on the skill runtime (docs/design/build-mastery.md): the "I can" ladder, one thing that's hard but doable.
    id: 'build-mastery',
    name: 'Build Mastery',
    tagline: 'One thing that\'s a stretch you can manage today',
    description: 'Pick a part of life and one step on a three-rung ladder, from easier to harder. Done beats done well, and smaller is still mastery.',
    whenToUse: 'When you want proof you can do hard things, or a big goal feels like too much.',
    module: 'emotion-regulation',
    dbtBasis: 'DBT ER Handout 19 (build mastery)',
    emoji: '🪜',
    bare: true,
  },
  {
    // ER-10 on the skill runtime (docs/design/emotion-guide.md): the feeling card and its family ladder; `?frame=myths`
    // plays the myth cards (part 4), its second skill.
    id: 'emotion-guide',
    name: 'Know This Feeling',
    tagline: 'What a feeling is for, and a closer word for it',
    description: 'Pick a feeling to see what it\'s for, what often sets it off, where it shows up in the body and the pull it can bring. Then find the word in its family that\'s closest.',
    whenToUse: 'When you\'ve named a feeling and want to understand it, or the word you have feels too big or too vague.',
    module: 'emotion-regulation',
    dbtBasis: 'DBT ER Handouts 3–6 (what emotions do, the model of emotions, describing emotions)',
    emoji: '🔎',
    bare: true,
    moreCards: [
      { key: 'wave', name: 'Walk the wave', tagline: 'Lay out one feeling from start to finish', emoji: '🌊', query: 'frame=wave' },
      { key: 'myths', name: 'Beliefs about feelings', tagline: 'Look at a belief that makes feelings harder', emoji: '🪞', query: 'frame=myths' },
    ],
  },
  {
    // ER-08 on the skill runtime (docs/design/mindfulness-emotions.md): mindfulness of current emotion; savouring for
    // a good feeling.
    id: 'mindfulness-emotions',
    name: 'Let it be a wave',
    tagline: 'Let a feeling rise and fall without fighting it',
    description: 'Name the feeling, find where it sits in your body, and watch it rise and fall without pushing it away or holding on. For a good feeling, let it be here without needing it to last.',
    whenToUse: 'When a feeling fits and can\'t be fixed right now, and you\'re fighting it. Or when something good is here and you can\'t let yourself have it.',
    module: 'emotion-regulation',
    dbtBasis: 'Mindfulness of current emotion (DBT ER Handout 22)',
    emoji: '🫧',
    bare: true,
  },
  // Interpersonal Effectiveness
  {
    id: 'dear-man',
    name: 'Ask for what you need',
    tagline: 'A step-by-step script for hard conversations (DEAR MAN)',
    description: 'A step-by-step framework: Describe the situation, Express feelings, Assert your need, Reinforce why it matters. Stay Mindful, Appear confident, Negotiate if needed.',
    whenToUse: 'When you need to ask for something important and want to be heard.',
    module: 'interpersonal-effectiveness',
    dbtBasis: 'DEAR MAN',
    emoji: '🗣️',
  },
  {
    id: 'recovering-from-invalidation',
    name: 'Recover from a hurtful moment',
    tagline: 'When someone brushed you off, mocked you, left you out, or pulled away',
    description: 'Settle your body first, name what hit, give yourself the validation you didn\'t get, then choose: ask them, let it land, or do the opposite of the urge.',
    whenToUse: 'Right after someone dismissed you, made you feel small, left you out, or pulled away.',
    module: 'interpersonal-effectiveness',
    dbtBasis: 'Walking the Middle Path: recovering from invalidation (with STOP, TIPP, Opposite Action and DEAR MAN)',
    emoji: '💬',
  },
  {
    // On the skill runtime (docs/design/fast.md): the review and the Let go route are graph data.
    id: 'fast',
    name: 'Keep your self-respect',
    tagline: 'Look at how you handled it, and pick one thing to keep next time',
    description: 'Name what slipped (an extra sorry, going along, bending the truth, dropping your ask), pick the move you\'d make next time, and copy the line. After a no, hold your ground with one line and let it go.',
    whenToUse: 'When you gave up more of yourself than you meant to, or they said no and you want to let it go with your self-respect.',
    module: 'interpersonal-effectiveness',
    dbtBasis: 'DBT IE Handout 7 (FAST)',
    emoji: '🪶',
    bare: true,
  },
  {
    // On the skill runtime (docs/design/say-no.md): who's asking first, then the skill.
    id: 'say-no',
    name: 'Say no',
    tagline: 'Size it, word it, and have a line ready for when they push',
    description: 'Name what they\'re asking and what you\'re worried happens if you refuse. Size how firm to be, put the no together (one reason at most, no extra sorry), and copy it. Afterwards, look at whether it held.',
    whenToUse: 'When someone wants something you don\'t want to give, or you said yes and want to take it back.',
    module: 'interpersonal-effectiveness',
    dbtBasis: 'DBT IE Handouts 5 and 8 (DEAR MAN for saying no, how firm to be)',
    emoji: '🙅',
    bare: true,
  },
  {
    // On the skill runtime (docs/design/give.md): who it's with first, then the skill.
    id: 'give',
    name: 'Keep it warm',
    tagline: 'Their side first, a repair after a fight, or a break you come back from',
    description: 'When someone brings something to you, start with their side, then yours. After a fight, own your part in one clear line. When it heats up, take a break and say when you\'ll be back. Before an ask, add a little warmth.',
    whenToUse: 'When you\'re right and it keeps coming out as an attack, when someone came to you upset, or after a fight you want to repair.',
    module: 'interpersonal-effectiveness',
    dbtBasis: 'DBT IE Handouts 6 and 6a (GIVE)',
    emoji: '🤝',
    bare: true,
  },
  {
    // IE-09 on the skill runtime (docs/design/find-your-people.md): one small step towards people, with a guess and a check.
    id: 'finding-connection',
    name: 'Find your people',
    tagline: 'One small step towards people, with a guess first and a check after',
    description: 'Pick where to start: being around people, finding people like you, a conversation, a friendship, or joining something. Then one small step, a guess at how it\'ll go, and a check afterwards against what actually happened.',
    whenToUse: 'When you feel cut off, or you\'re sure nobody would want to hear from you.',
    module: 'interpersonal-effectiveness',
    dbtBasis: 'DBT IE Handouts 10–11 (finding and keeping friends)',
    emoji: '🌱',
    bare: true,
  },
  {
    // IE-10 on the skill runtime (docs/design/notice-them.md): mindfulness of others, after the person picker.
    id: 'mindfulness-of-others',
    name: 'Notice them',
    tagline: 'What they did, what you added, and noticing them with curiosity',
    description: 'Pick who it\'s about. Then notice them next time with curiosity, do one thing with them fully, or look again at something that happened: what they actually did, what you added, and what might have been going on for them.',
    whenToUse: 'When you were sure they meant it, or you\'re planning your comeback instead of listening.',
    module: 'interpersonal-effectiveness',
    dbtBasis: 'DBT IE Handout 12 (mindfulness of others)',
    emoji: '🌤️',
    bare: true,
  },
  {
    // IE-02 on the skill runtime (docs/design/rehearse.md): practise a hard conversation, after the person picker.
    id: 'rehearse',
    name: 'Rehearse it',
    tagline: 'Practise a hard conversation, with them pushing back as much as you choose',
    description: 'Pick who it\'s with and what you\'ll say. Then practise it on a little stage: they reply the easy way, the realistic way or the hardest likely way, and you pick your move. Stopping always counts.',
    whenToUse: 'When you know what you want to say and you\'re scared you\'ll freeze or cave when they push back.',
    module: 'interpersonal-effectiveness',
    dbtBasis: 'DBT IE Handouts 5, 6 and 8 (behavioural rehearsal)',
    emoji: '🎭',
    bare: true,
  },
  {
    // On the skill runtime (docs/design/ending-relationships.md). Safety first: nothing is saved before the
    // safety answer, and nothing at all in the safety branch unless the person saves it.
    id: 'ending-relationships',
    name: 'Ending a relationship that\'s hurting you',
    tagline: 'Safety first, then what\'s going on, and what you want to do',
    description: 'Check your safety first. Then name what this relationship is doing to you, decide from a steady place (end it, step back, or not yet), and, if it\'s safe, plan how to say it.',
    whenToUse: 'When you keep going back, or can\'t tell whether this is normal-hard or bad for you.',
    module: 'interpersonal-effectiveness',
    dbtBasis: 'DBT IE Handout 13 (Ending relationships)',
    emoji: '🚪',
    bare: true,
    deferSession: true,
    // Listed under Interpersonal Effectiveness (Claudia, 11 Nov: list now; a clinician reviews the safety branch
    // after, PRD IE-08, plan D14).
  },
  // Mindfulness
  {
    id: 'wise-mind',
    name: 'Wise mind',
    tagline: 'Find the quieter answer when you\'re torn',
    description: 'Hear what your feelings say and what your thinking says, drop in for a few breaths, and listen for the quieter answer underneath.',
    whenToUse: 'When you\'re torn about what to do, or want to settle before you choose.',
    module: 'mindfulness',
    dbtBasis: 'DBT Mindfulness: wise mind (states of mind; ideas for practising wise mind)',
    emoji: '🪨',
    bare: true,
  },
  // Mindfulness (parts, docs/design/parts.md: listed and opened only with the parts switch on and its copy signed off)
  {
    id: 'meet-a-part',
    name: 'Meet a part',
    tagline: 'Get to know a part of you that steps in',
    description: 'Notice a part of you, where it sits and what it does for you, and thank it. You can keep it, so you can come back to it.',
    whenToUse: 'When a part of you keeps stepping in and you want to know it better.',
    module: 'mindfulness',
    emoji: '🕯️',
    bare: true,
    listed: 'parts',
  },
  {
    id: 'two-pulls',
    name: 'Two pulls',
    tagline: 'Two parts of you pulling different ways',
    description: 'Set two parts of you out side by side, notice how you feel toward each, hear what each one worries about, and find what they both want for you.',
    whenToUse: 'When two parts of you want different things and both are trying to help.',
    module: 'mindfulness',
    emoji: '🪢',
    bare: true,
    listed: false,
  },
];

/**
 * Plain-language entry points. Each intent leads directly to an existing,
 * appropriate tool — no assessment required. Presentation metadata only.
 */
export interface Intent {
  id: string;
  label: string;
  toolId: string;
  emoji: string;
  /** A mode of the tool the intent opens (`mode=one`: DEAR MAN's One message). */
  query?: string;
}

/**
 * Every intent, in the order the Tools page shows them. An intent whose tool is unlisted waits: Cope Ahead's
 * (*Something's coming up that I'm dreading*) shows once its tool is listed, when its screens ship.
 */
export const allIntents: Intent[] = [
  { id: 'cant-tell', label: 'I can\'t tell what I\'m feeling', toolId: 'find-the-feeling', emoji: '🫧' },
  { id: 'hurt', label: 'Recover from a hurtful moment', toolId: 'recovering-from-invalidation', emoji: '💬' },
  { id: 'calm-fast', label: 'My body\'s too loud', toolId: 'cool-down', emoji: '🧊' },
  { id: 'pause', label: 'Pause before reacting', toolId: 'pause', emoji: '✋' },
  { id: 'ground', label: 'Ground myself', toolId: 'five-senses', emoji: '👁️' },
  { id: 'urge', label: 'Ride out an urge', toolId: 'urge-surfing', emoji: '🌊' },
  { id: 'let-it-be', label: 'Stop fighting something I can\'t change', toolId: 'let-it-be', emoji: '🍃' },
  { id: 'mind-job', label: 'My mind won\'t stop', toolId: 'mind-job', emoji: '🫙' },
  { id: 'soothe', label: 'Be kind to myself for a minute', toolId: 'soothe', emoji: '🫶' },
  { id: 'thoughts-passing', label: 'A thought feels like a fact', toolId: 'thoughts-passing', emoji: '🍂' },
  { id: 'blow-it-up', label: 'I want to blow it all up', toolId: 'alternate-rebellion', emoji: '🎸' },
  { id: 'reasons', label: 'Make a card for a pull that keeps coming back', toolId: 'pros-cons', emoji: '⚖️' },
  { id: 'habit-plan', label: 'Something I keep doing', toolId: 'habit-plan', emoji: '🌉' },
  { id: 'crisis-kit', label: 'Open my crisis kit', toolId: 'crisis-kit', emoji: '🧰' },
  { id: 'make-kit', label: 'Make my crisis kit for hard nights', toolId: 'crisis-kit', query: 'frame=build', emoji: '🧰' },
  { id: 'shift', label: 'Shift a feeling that isn\'t helping', toolId: 'opposite-action', emoji: '🔄' },
  { id: 'problem', label: 'Work through a problem', toolId: 'problem-solve', emoji: '🛠️' },
  { id: 'ask', label: 'Ask someone for what I need', toolId: 'dear-man', emoji: '🗣️' },
  { id: 'one_message', label: 'Send someone one clear message', toolId: 'dear-man', query: 'mode=one', emoji: '✉️' },
  { id: 'dreading', label: 'Something\'s coming up that I\'m dreading', toolId: 'cope-ahead', emoji: '🧭' },
  { id: 'torn', label: 'I\'m torn about what to do', toolId: 'wise-mind', emoji: '🪨' },
  { id: 'say-no', label: 'Say no to someone', toolId: 'say-no', emoji: '🙅' },
  { id: 'give', label: 'Repair things after a fight, or keep it warm', toolId: 'give', emoji: '🤝' },
  { id: 'less-alone', label: 'Feel less alone', toolId: 'finding-connection', emoji: '🌱' },
  { id: 'look-again', label: 'I was sure they meant it', toolId: 'mindfulness-of-others', emoji: '🌤️' },
  { id: 'practise-conversation', label: 'Practise a hard conversation', toolId: 'rehearse', emoji: '🎭' },
  { id: 'overreacting', label: 'I can\'t tell if I\'m overreacting', toolId: 'check-the-facts', emoji: '🔍' },
  { id: 'not-working', label: 'My skills aren\'t working', toolId: 'er-troubleshoot', emoji: '🧩' },
  { id: 'running-low', label: 'Everything feels like too much today', toolId: 'please-skill', emoji: '🔋' },
  { id: 'cant-sleep', label: 'I can\'t sleep', toolId: 'sleep-reset', emoji: '🛌' },
  { id: 'find-good', label: 'Find something good', toolId: 'good-things', emoji: '🌼' },
  { id: 'what-matters', label: 'Work out what matters to me', toolId: 'values-clarification', emoji: '🧭' },
  { id: 'one-thing', label: 'Get one thing done', toolId: 'build-mastery', emoji: '🪜' },
  { id: 'let-feeling-be', label: 'Let a feeling be', toolId: 'mindfulness-emotions', emoji: '🫧' },
  { id: 'know-feeling', label: 'Get to know a feeling', toolId: 'emotion-guide', emoji: '🔎' },
  { id: 'feeling-wave', label: 'Look back at a feeling, start to finish', toolId: 'emotion-guide', query: 'frame=wave', emoji: '🌊' },
  { id: 'feeling-myths', label: 'A belief about feelings is in the way', toolId: 'emotion-guide', query: 'frame=myths', emoji: '🪞' },
  { id: 'nightmares', label: 'The same nightmare keeps coming back', toolId: 'nightmare-rescript', emoji: '🌙' },
];

/** The intents the Tools page lists: those whose tool is listed for everyone. */
export const intents: Intent[] = allIntents.filter(i => tools.find(t => t.id === i.toolId)?.listed === undefined);

export function getToolById(id: string): Tool | undefined {
  return tools.find(t => t.id === id);
}

/**
 * Address names that differ from the tool id. The id stays the stable key (graph appToolId,
 * saved sessions, routing); only the address the user sees changes. /tool/<id> redirects here.
 */
export const TOOL_URL_SLUGS: Record<string, string> = {
  'cool-down': 'circuit-breaker',
};

/** The tool id for an address segment (a slug or the id itself). */
export function toolIdFromUrl(segment: string): string {
  return Object.entries(TOOL_URL_SLUGS).find(([, slug]) => slug === segment)?.[0] ?? segment;
}

/** Who is looking: `parts` is true only with parts on and the parts tools' copy shipped (useToolGate). */
export interface ListedFor { parts?: boolean }

/** The tools a module lists (unlisted tools are reached only by link; parts tools only with `parts`). */
export function getToolsByModule(moduleId: string, who: ListedFor = {}): Tool[] {
  return listedTools(who).filter(t => t.module === moduleId);
}

/** Every tool a list, picker or search may show. */
export function listedTools({ parts = false }: ListedFor = {}): Tool[] {
  return tools.filter(t => t.listed === undefined || (t.listed === 'parts' && parts));
}
