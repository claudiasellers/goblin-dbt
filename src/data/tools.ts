export interface Tool {
  id: string;
  name: string;
  tagline: string;
  description: string;
  whenToUse: string;
  categoryId: string;
  subcategoryId: string;
  dbtBasis?: string; // Optional: the DBT skill this is based on
  emoji: string;
}

export const tools: Tool[] = [
  // === I need help right now ===
  
  // Quick calming techniques
  {
    id: 'cool-down',
    name: 'Cool Down',
    tagline: 'Use temperature to calm fast',
    description: 'Cold water or ice can quickly shift your body out of crisis mode by triggering your dive reflex.',
    whenToUse: 'When emotions are at a 7+ out of 10 and you need fast relief.',
    categoryId: 'help-right-now',
    subcategoryId: 'quick-calming',
    dbtBasis: 'TIP - Temperature',
    emoji: '🧊',
  },
  
  // Grounding exercises
  {
    id: 'five-senses',
    name: '5-4-3-2-1',
    tagline: 'Ground yourself through your senses',
    description: 'Notice things around you using each of your five senses to anchor yourself in the present moment.',
    whenToUse: 'When you feel disconnected, anxious, or caught up in racing thoughts.',
    categoryId: 'help-right-now',
    subcategoryId: 'grounding',
    dbtBasis: '5-4-3-2-1 Grounding',
    emoji: '👁️',
  },
  
  // Emergency coping strategies
  {
    id: 'pause',
    name: 'Pause',
    tagline: 'Stop before you act',
    description: 'A quick mental checklist to interrupt impulsive reactions and give yourself space to choose your response.',
    whenToUse: 'When you\'re about to say or do something you might regret.',
    categoryId: 'help-right-now',
    subcategoryId: 'emergency-coping',
    dbtBasis: 'STOP Skill',
    emoji: '✋',
  },
  
  // Ride-out-the-wave tools
  {
    id: 'urge-surfing',
    name: 'Urge Surfing',
    tagline: 'Ride the wave without acting',
    description: 'Observe your urges like waves that rise, peak, and fall—without needing to act on them.',
    whenToUse: 'When you have a strong urge to do something harmful or unhelpful.',
    categoryId: 'help-right-now',
    subcategoryId: 'ride-the-wave',
    dbtBasis: 'Urge Surfing / Distress Tolerance',
    emoji: '🌊',
  },
  
  // === I want to feel better ===
  
  // Understanding emotions
  {
    id: 'name-it',
    name: 'Name It',
    tagline: 'Identify what you\'re feeling',
    description: 'Naming your emotion precisely can reduce its intensity. "Name it to tame it."',
    whenToUse: 'When you\'re feeling something intense but aren\'t sure exactly what.',
    categoryId: 'feel-better',
    subcategoryId: 'understanding-emotions',
    dbtBasis: 'Emotion Labeling',
    emoji: '🏷️',
  },
  
  // Changing how I feel
  {
    id: 'opposite-action',
    name: 'Do the Opposite',
    tagline: 'Act opposite to unhelpful urges',
    description: 'When an emotion\'s action urge isn\'t helpful, doing the opposite can shift how you feel.',
    whenToUse: 'When your emotion is pushing you toward something that won\'t help.',
    categoryId: 'feel-better',
    subcategoryId: 'changing-feelings',
    dbtBasis: 'Opposite Action',
    emoji: '🔄',
  },
  
  // Accepting what I can't change
  {
    id: 'let-it-be',
    name: 'Let It Be',
    tagline: 'Accept this moment as it is',
    description: 'Sometimes fighting reality causes more suffering than the reality itself. This tool helps you practice acceptance.',
    whenToUse: 'When you\'re struggling against something you cannot change.',
    categoryId: 'feel-better',
    subcategoryId: 'accepting',
    dbtBasis: 'Radical Acceptance',
    emoji: '🍃',
  },
  
  // Building positive experiences
  {
    id: 'one-good-thing',
    name: 'One Good Thing',
    tagline: 'Add a small positive to your day',
    description: 'Intentionally doing one pleasant activity, no matter how small, builds positive emotions over time.',
    whenToUse: 'When you need a mood boost or want to build more joy into your life.',
    categoryId: 'feel-better',
    subcategoryId: 'positive-experiences',
    dbtBasis: 'Pleasant Activities / Accumulate Positives',
    emoji: '✨',
  },
];

export function getToolById(id: string): Tool | undefined {
  return tools.find(t => t.id === id);
}

export function getToolsByCategory(categoryId: string): Tool[] {
  return tools.filter(t => t.categoryId === categoryId);
}

export function getToolsBySubcategory(categoryId: string, subcategoryId: string): Tool[] {
  return tools.filter(t => t.categoryId === categoryId && t.subcategoryId === subcategoryId);
}
