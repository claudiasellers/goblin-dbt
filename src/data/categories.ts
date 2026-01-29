export interface Subcategory {
  id: string;
  name: string;
  description: string;
}

export interface Category {
  id: string;
  name: string;
  tagline: string;
  description: string;
  emoji: string;
  color: string; // Tailwind color class
  subcategories: Subcategory[];
}

export const categories: Category[] = [
  {
    id: 'help-right-now',
    name: 'I need help right now',
    tagline: 'Crisis support',
    description: 'Quick tools for when you\'re overwhelmed and need immediate relief',
    emoji: '🆘',
    color: 'rose',
    subcategories: [
      {
        id: 'quick-calming',
        name: 'Quick calming techniques',
        description: 'Fast ways to bring down intense emotions',
      },
      {
        id: 'grounding',
        name: 'Grounding exercises',
        description: 'Come back to the present moment',
      },
      {
        id: 'emergency-coping',
        name: 'Emergency coping strategies',
        description: 'Pause and regain control',
      },
      {
        id: 'ride-the-wave',
        name: 'Ride-out-the-wave tools',
        description: 'Let intense feelings pass without acting on them',
      },
    ],
  },
  {
    id: 'feel-better',
    name: 'I want to feel better',
    tagline: 'Emotional regulation',
    description: 'Understand, shift, or accept your emotions',
    emoji: '💚',
    color: 'emerald',
    subcategories: [
      {
        id: 'understanding-emotions',
        name: 'Understanding my emotions',
        description: 'Name and make sense of what you\'re feeling',
      },
      {
        id: 'changing-feelings',
        name: 'Changing how I feel',
        description: 'Shift emotions when they\'re not helping',
      },
      {
        id: 'accepting',
        name: 'Accepting what I can\'t change',
        description: 'Find peace with difficult realities',
      },
      {
        id: 'positive-experiences',
        name: 'Building positive experiences',
        description: 'Create moments of joy and meaning',
      },
    ],
  },
  {
    id: 'better-relationships',
    name: 'I want better relationships',
    tagline: 'Interpersonal skills',
    description: 'Communicate effectively and maintain connections',
    emoji: '🤝',
    color: 'sky',
    subcategories: [
      {
        id: 'asking-needs',
        name: 'Asking for what I need',
        description: 'Express yourself clearly and effectively',
      },
      {
        id: 'setting-boundaries',
        name: 'Setting boundaries',
        description: 'Say no while maintaining self-respect',
      },
      {
        id: 'handling-conflict',
        name: 'Handling conflict',
        description: 'Navigate disagreements constructively',
      },
      {
        id: 'staying-connected',
        name: 'Staying connected while disagreeing',
        description: 'Preserve relationships through differences',
      },
    ],
  },
  {
    id: 'understand-myself',
    name: 'I want to understand myself',
    tagline: 'Self-awareness',
    description: 'Explore your patterns, thoughts, and inner world',
    emoji: '🔍',
    color: 'violet',
    subcategories: [
      {
        id: 'why-react',
        name: 'Why do I react this way?',
        description: 'Uncover patterns and triggers',
      },
      {
        id: 'tuning-in',
        name: 'Tuning into myself',
        description: 'Connect with your inner wisdom',
      },
      {
        id: 'being-kinder',
        name: 'Being kinder to myself',
        description: 'Practice self-compassion and reduce self-judgment',
      },
    ],
  },
  {
    id: 'build-better-life',
    name: 'I want to build a better life',
    tagline: 'Long-term growth',
    description: 'Develop habits and pursue what matters to you',
    emoji: '🌱',
    color: 'amber',
    subcategories: [
      {
        id: 'daily-habits',
        name: 'Daily habits that help',
        description: 'Sleep, eating, exercise, and physical health',
      },
      {
        id: 'living-values',
        name: 'Living by my values',
        description: 'Clarify and act on what matters most',
      },
      {
        id: 'building-confidence',
        name: 'Building confidence and skills',
        description: 'Grow through small accomplishments',
      },
      {
        id: 'creating-meaning',
        name: 'Creating meaning',
        description: 'Find purpose and contribution',
      },
    ],
  },
];

export function getCategoryById(id: string): Category | undefined {
  return categories.find(c => c.id === id);
}

export function getSubcategoryById(categoryId: string, subcategoryId: string): Subcategory | undefined {
  const category = getCategoryById(categoryId);
  return category?.subcategories.find(s => s.id === subcategoryId);
}
