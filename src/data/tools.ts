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
}

export const tools: Tool[] = [
  // Distress Tolerance
  {
    id: 'cool-down',
    name: 'Circuit Breaker',
    tagline: 'Use temperature to calm fast',
    description: 'Cold water or ice can quickly shift your body out of crisis mode by triggering your dive reflex.',
    whenToUse: 'When your body is too loud to think.',
    module: 'distress-tolerance',
    dbtBasis: 'TIP - Temperature',
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
    name: 'Urge Surfing',
    tagline: 'Ride the wave without acting',
    description: 'Observe your urges like waves that rise, peak, and fall—without needing to act on them.',
    whenToUse: 'When you have a strong urge to do something harmful or unhelpful.',
    module: 'distress-tolerance',
    dbtBasis: 'Urge Surfing / Distress Tolerance',
    emoji: '🌊',
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
}

/**
 * Every intent, in the order the Tools page shows them. An intent whose tool is unlisted waits: Cope Ahead's
 * (*Something's coming up that I'm dreading*) shows once its tool is listed, when its screens ship.
 */
export const allIntents: Intent[] = [
  { id: 'cant-tell', label: 'I can\'t tell what I\'m feeling', toolId: 'find-the-feeling', emoji: '🫧' },
  { id: 'hurt', label: 'Recover from a hurtful moment', toolId: 'recovering-from-invalidation', emoji: '💬' },
  { id: 'calm-fast', label: 'Calm down fast', toolId: 'cool-down', emoji: '🧊' },
  { id: 'pause', label: 'Pause before reacting', toolId: 'pause', emoji: '✋' },
  { id: 'ground', label: 'Ground myself', toolId: 'five-senses', emoji: '👁️' },
  { id: 'urge', label: 'Ride out an urge', toolId: 'urge-surfing', emoji: '🌊' },
  { id: 'blow-it-up', label: 'I want to blow it all up', toolId: 'alternate-rebellion', emoji: '🎸' },
  { id: 'shift', label: 'Shift a feeling that isn\'t helping', toolId: 'opposite-action', emoji: '🔄' },
  { id: 'problem', label: 'Work through a problem', toolId: 'problem-solve', emoji: '🛠️' },
  { id: 'ask', label: 'Ask someone for what I need', toolId: 'dear-man', emoji: '🗣️' },
  { id: 'dreading', label: 'Something\'s coming up that I\'m dreading', toolId: 'cope-ahead', emoji: '🧭' },
  { id: 'torn', label: 'I\'m torn about what to do', toolId: 'wise-mind', emoji: '🪨' },
  { id: 'overreacting', label: 'I can\'t tell if I\'m overreacting', toolId: 'check-the-facts', emoji: '🔍' },
  { id: 'not-working', label: 'My skills aren\'t working', toolId: 'er-troubleshoot', emoji: '🧩' },
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
