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
}

export const tools: Tool[] = [
  // Distress Tolerance
  {
    id: 'cool-down',
    name: 'Cool Down',
    tagline: 'Use temperature to calm fast',
    description: 'Cold water or ice can quickly shift your body out of crisis mode by triggering your dive reflex.',
    whenToUse: 'When emotions are at a 7+ out of 10 and you need fast relief.',
    module: 'distress-tolerance',
    dbtBasis: 'TIP - Temperature',
    emoji: '🧊',
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
    name: 'DEAR MAN',
    tagline: 'Ask for what you need effectively',
    description: 'A step-by-step framework: Describe the situation, Express feelings, Assert your need, Reinforce why it matters. Stay Mindful, Appear confident, Negotiate if needed.',
    whenToUse: 'When you need to ask for something important and want to be heard.',
    module: 'interpersonal-effectiveness',
    dbtBasis: 'DEAR MAN',
    emoji: '🗣️',
  },
];

export function getToolById(id: string): Tool | undefined {
  return tools.find(t => t.id === id);
}

export function getToolsByModule(moduleId: string): Tool[] {
  return tools.filter(t => t.module === moduleId);
}
