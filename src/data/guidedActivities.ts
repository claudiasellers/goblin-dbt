/**
 * Guided Activity Definitions
 *
 * These are pattern-specific guided activities for the low-unpleasant quadrant.
 * Each activity targets the underlying neural mechanism of a specific activation
 * pattern — they are NOT interchangeable.
 *
 * - conservation_freeze → gentle-movement (proprioceptive up-regulation)
 * - dissociation_overmodulation → sensory-anchor (interoceptive reconnection)
 * - rumination_loop → attention-shift (external focus to engage task-positive network)
 * - reward_drive_low → micro-win (tiniest behavioral activation for dopamine priming)
 *
 * Rendered by a single GuidedActivity component (data-driven, not 4 components).
 */

export type ActivityVisual =
  | 'pulse'
  | 'breathing_circle'
  | 'color_shift'
  | 'ripple'
  | 'count_down'
  | 'completion_bloom'
  | 'none';

export interface ActivityStep {
  instruction: string;
  guidance?: string;
  durationSeconds?: number;
  waitForTap?: boolean;
  visual: ActivityVisual;
}

export interface ActivityDefinition {
  id: string;
  patternId: string;
  type: 'proprioceptive' | 'sensory' | 'attentional' | 'behavioral';
  title: string;
  introMessage: string;
  steps: ActivityStep[];
  completionMessage: string;
  estimatedSeconds: number;
}

/**
 * Copy table — one context sentence per pattern, shown on LowEnergyStateResult.
 */
export const PATTERN_CONTEXT: Record<string, string> = {
  conservation_freeze: 'Your system has gone still to protect you.',
  dissociation_overmodulation: 'Your mind pulled away to shield you from too much.',
  rumination_loop: 'Your mind is caught in a loop, replaying the same thoughts.',
  reward_drive_low: 'Your motivation system is running on empty right now.',
};

const ACTIVITIES: Record<string, ActivityDefinition> = {

  // =====================================================
  // CONSERVATION FREEZE → GENTLE MOVEMENT
  // Proprioceptive up-regulation. Calming tools WORSEN freeze.
  // Start from extremities, work inward. Titrated. Slow.
  // Based on: Roelofs (2017), defense cascade, SE principles.
  // =====================================================
  'gentle-movement': {
    id: 'gentle-movement',
    patternId: 'conservation_freeze',
    type: 'proprioceptive',
    title: 'Gentle movement',
    introMessage: "Let's wake your body up — slowly, at your pace.",
    steps: [
      {
        instruction: 'Wiggle your toes.',
        guidance: 'Just your toes. Small movements.',
        durationSeconds: 10,
        visual: 'pulse',
      },
      {
        instruction: 'Now move your fingers.',
        guidance: 'Open and close, one at a time if you like.',
        durationSeconds: 12,
        visual: 'pulse',
      },
      {
        instruction: 'Roll your ankles in a circle.',
        guidance: 'One direction, then the other.',
        durationSeconds: 12,
        visual: 'ripple',
      },
      {
        instruction: 'Rub your hands together.',
        guidance: 'Feel the warmth building between your palms.',
        durationSeconds: 12,
        visual: 'pulse',
      },
      {
        instruction: 'Gently roll your shoulders.',
        guidance: 'Forward a few times, then backward.',
        durationSeconds: 15,
        visual: 'ripple',
      },
      {
        instruction: 'Take a stretch — any direction.',
        guidance: "Whatever your body wants. There's no wrong way.",
        durationSeconds: 16,
        visual: 'breathing_circle',
      },
    ],
    completionMessage: 'Your body is starting to come back online.',
    estimatedSeconds: 77,
  },

  // =====================================================
  // DISSOCIATION → SENSORY ANCHOR
  // Gentle interoceptive reconnection. Titrated sensory input.
  // NOT intense — PFC is over-suppressing, need gentle signal.
  // Based on: Lanius (2010, 2012), SE (Levine).
  // =====================================================
  'sensory-anchor': {
    id: 'sensory-anchor',
    patternId: 'dissociation_overmodulation',
    type: 'sensory',
    title: 'Sensory anchor',
    introMessage: "Let's gently reconnect you — one sense at a time.",
    steps: [
      {
        instruction: 'Touch the surface nearest to you.',
        guidance: 'What does it feel like? Cool? Smooth? Rough?',
        waitForTap: true,
        visual: 'ripple',
      },
      {
        instruction: 'Press your feet into the floor.',
        guidance: 'Feel the pressure. Feel the ground holding you.',
        durationSeconds: 12,
        visual: 'pulse',
      },
      {
        instruction: 'Rub your thumb across your fingertips.',
        guidance: 'Slowly. Notice each texture.',
        durationSeconds: 15,
        visual: 'ripple',
      },
      {
        instruction: 'Put your hand on your chest.',
        guidance: "Feel the warmth of your hand. You're here.",
        durationSeconds: 15,
        visual: 'breathing_circle',
      },
      {
        instruction: 'Take one breath and feel where it lands.',
        guidance: "Chest? Belly? Nose? Just notice — that's your body checking in.",
        waitForTap: true,
        visual: 'breathing_circle',
      },
    ],
    completionMessage: "You're a little more here now. That's real.",
    estimatedSeconds: 64,
  },

  // =====================================================
  // RUMINATION → ATTENTION SHIFT
  // External focus to engage task-positive network.
  // Reciprocally inhibits DMN. NOT mindfulness (increases
  // internal focus). Interactive elements to hold attention.
  // Based on: Hamilton et al. (2015), DMN-CEN reciprocity.
  // =====================================================
  'attention-shift': {
    id: 'attention-shift',
    patternId: 'rumination_loop',
    type: 'attentional',
    title: 'Attention shift',
    introMessage: "Let's give your mind something else to land on.",
    steps: [
      {
        instruction: 'Look around. Find something blue.',
        guidance: 'Any shade — sky, denim, a pen.',
        waitForTap: true,
        visual: 'color_shift',
      },
      {
        instruction: 'Now find something with a texture you can feel.',
        guidance: 'Touch it. Is it rough? Smooth? Cold?',
        waitForTap: true,
        visual: 'ripple',
      },
      {
        instruction: 'Listen. What\'s the farthest sound you can hear?',
        guidance: 'Give it a few seconds. Let your ears reach out.',
        durationSeconds: 15,
        visual: 'ripple',
      },
      {
        instruction: 'Count backwards from 10.',
        guidance: 'Out loud or in your head. Take your time.',
        durationSeconds: 15,
        visual: 'count_down',
      },
      {
        instruction: 'Name three things you can see right now.',
        guidance: "Anything at all. Say them to yourself.",
        waitForTap: true,
        visual: 'none',
      },
    ],
    completionMessage: 'Your attention moved. The loop loosened a little.',
    estimatedSeconds: 75,
  },

  // =====================================================
  // REWARD DRIVE LOW → MICRO WIN
  // Tiniest possible behavioral activation. The enemy is inertia.
  // Every step is a win by completion. No failure mode.
  // Based on: Behavioral activation (Martell et al.), NAc priming.
  // =====================================================
  'micro-win': {
    id: 'micro-win',
    patternId: 'reward_drive_low',
    type: 'behavioral',
    title: 'Micro win',
    introMessage: "One tiny thing. That's all.",
    steps: [
      {
        instruction: 'Move one part of your body.',
        guidance: 'A finger. Your head. Anything at all counts.',
        waitForTap: true,
        visual: 'pulse',
      },
      {
        instruction: "Now do one thing you can see from where you are.",
        guidance: 'Pick up a cup. Straighten something. Flip a page.',
        waitForTap: true,
        visual: 'ripple',
      },
      {
        instruction: 'Take a sip of something, or splash water on your face.',
        guidance: "If nothing's nearby, just rub your hands together.",
        waitForTap: true,
        visual: 'pulse',
      },
    ],
    completionMessage: "Three things done. Your brain noticed. That's how momentum starts.",
    estimatedSeconds: 30,
  },
};

/**
 * Get an activity definition by ID.
 */
export function getActivityDefinition(activityId: string): ActivityDefinition | undefined {
  return ACTIVITIES[activityId];
}

/**
 * Get the activity definition for a given pattern ID.
 */
export function getActivityForPattern(patternId: string): ActivityDefinition | undefined {
  return Object.values(ACTIVITIES).find(a => a.patternId === patternId);
}
