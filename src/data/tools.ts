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
    name: 'Pause',
    tagline: 'Stop before you act',
    description: 'A quick mental checklist to interrupt impulsive reactions and give yourself space to choose your response.',
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

export const intents: Intent[] = [
  { id: 'cant-tell', label: 'I can\'t tell what I\'m feeling', toolId: 'find-the-feeling', emoji: '🫧' },
  { id: 'hurt', label: 'Recover from a hurtful moment', toolId: 'recovering-from-invalidation', emoji: '💬' },
  { id: 'calm-fast', label: 'Calm down fast', toolId: 'cool-down', emoji: '🧊' },
  { id: 'pause', label: 'Pause before reacting', toolId: 'pause', emoji: '✋' },
  { id: 'ground', label: 'Ground myself', toolId: 'five-senses', emoji: '👁️' },
  { id: 'urge', label: 'Ride out an urge', toolId: 'urge-surfing', emoji: '🌊' },
  { id: 'shift', label: 'Shift a feeling that isn\'t helping', toolId: 'opposite-action', emoji: '🔄' },
  { id: 'problem', label: 'Work through a problem', toolId: 'problem-solve', emoji: '🛠️' },
  { id: 'ask', label: 'Ask someone for what I need', toolId: 'dear-man', emoji: '🗣️' },
];

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

export function getToolsByModule(moduleId: string): Tool[] {
  return tools.filter(t => t.module === moduleId);
}
