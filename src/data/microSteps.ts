/**
 * State-Mapped Micro-Steps
 * 
 * These are the absolute lowest-difficulty interventions in the app.
 * They are served when a user presses "That feels like too much right now"
 * on the StateResult screen — meaning even the recommended DBT tools
 * feel overwhelming.
 * 
 * CRITICAL: These are NOT random. They are keyed by the activation pattern ID
 * returned by the knowledge graph, because different neural states require
 * fundamentally different interventions:
 * 
 * - High arousal (acute_alarm, emotional_flooding, reactive_aggression):
 *   Bottom-up autonomic/sensory input. PFC is compromised — no thinking tasks.
 *   Based on: TIP skills (Linehan), dive reflex, isometric discharge.
 * 
 * - Freeze/shutdown (conservation_freeze):
 *   Gentle proprioceptive up-regulation. Calming tools WORSEN this state.
 *   Based on: Roelofs (2017), defense cascade literature, micro-movement titration.
 * 
 * - Dissociation (dissociation_overmodulation):
 *   Gentle sensory anchoring to reconnect body signals.
 *   Based on: Lanius (2010, 2012), Somatic Experiencing principles.
 * 
 * - Vigilance (chronic_vigilance):
 *   Present-moment anchoring to disengage threat-scanning loop.
 *   Based on: BNST/attentional retraining literature.
 * 
 * - Rumination (rumination_loop):
 *   External focus tasks to engage task-positive network (reciprocally inhibits DMN).
 *   Based on: Hamilton et al. (2015), DMN-rumination meta-analytic evidence.
 * 
 * - Social threat/shame (social_threat_shame):
 *   Outward focus + self-compassion touch. NOT self-reflection.
 *   Based on: Neff & Germer (self-compassion touch), behavioral inhibition literature.
 * 
 * - Low reward drive (reward_drive_low):
 *   Tiniest possible behavioral activation. The enemy is inertia.
 *   Based on: Behavioral activation literature, NAc/dopamine pathways.
 * 
 * Content rules for every micro-step:
 * 1. ≤ 8 words in the main instruction (parseable in one glance)
 * 2. No failure mode (doing the thing at all = success)
 * 3. Accessible in any physical context unless tagged otherwise
 * 4. Zero cognitive load — sensory/motor/autonomic only where possible
 */

export interface MicroStep {
  id: string;
  /** The primary instruction. Must be ≤ 8 words. */
  text: string;
  /** Optional gentle follow-up. Shown smaller beneath the main text. */
  subtext?: string;
  /** 
   * Internal classification of WHY this step works for its target state.
   * Not shown to the user — exists to keep contributors clinically honest.
   * 
   * sensory: Engages exteroception (sight, sound, touch, taste, smell)
   * proprioceptive: Engages body position/movement awareness
   * autonomic: Directly shifts ANS state (cold, breathing, muscle tension)
   * attentional: Redirects attentional focus externally
   */
  modality: 'sensory' | 'proprioceptive' | 'autonomic' | 'attentional';
  /**
   * If true, this step requires a specific object or environment
   * (e.g., cold water, a wall to push against). The "show me something else"
   * option should cycle past these if the user can't do them.
   */
  requiresEnvironment?: boolean;
}

/**
 * Micro-steps keyed by activation pattern ID.
 * 
 * The pattern ID comes from result.pattern.id in the StateResult component,
 * which is returned by the getStateAndTools cloud function.
 * 
 * Each pattern has 3-5 steps to allow rotation without repetition.
 * Steps are ordered from most universally accessible to least.
 */
const PATTERN_MICRO_STEPS: Record<string, MicroStep[]> = {

  // =====================================================
  // HIGH AROUSAL STATES
  // PFC compromised. Only bottom-up, autonomic/sensory input.
  // Cognitive tasks (naming, counting, listing) will FAIL here.
  // =====================================================

  acute_alarm: [
    {
      id: 'aa-1',
      text: 'Push your feet into the floor.',
      subtext: 'Press down hard. Feel the pressure.',
      modality: 'proprioceptive',
    },
    {
      id: 'aa-2',
      text: 'Hold something cold.',
      subtext: 'A glass, a can, ice \u2014 anything cool.',
      modality: 'autonomic',
      requiresEnvironment: true,
    },
    {
      id: 'aa-3',
      text: 'Press your palms against the wall.',
      subtext: 'Push hard. Hold it there.',
      modality: 'proprioceptive',
      requiresEnvironment: true,
    },
    {
      id: 'aa-4',
      text: 'Squeeze your hands into fists.',
      subtext: 'Hold tight. Then let go.',
      modality: 'autonomic',
    },
    {
      id: 'aa-5',
      text: 'Splash cold water on your face.',
      subtext: 'Even a few drops will do.',
      modality: 'autonomic',
      requiresEnvironment: true,
    },
  ],

  emotional_flooding: [
    // MOST compromised state. Even simpler than acute_alarm.
    // Safety constraint: "present tools immediately with minimal cognitive demand"
    // These are purely physical — zero thought required.
    {
      id: 'ef-1',
      text: 'Squeeze your hands tight.',
      subtext: "That\u2019s it. Just squeeze.",
      modality: 'autonomic',
    },
    {
      id: 'ef-2',
      text: 'Hold something cold.',
      subtext: 'Ice, cold water, a cold can.',
      modality: 'autonomic',
      requiresEnvironment: true,
    },
    {
      id: 'ef-3',
      text: 'Push your feet into the floor.',
      subtext: 'Press down. Feel the ground.',
      modality: 'proprioceptive',
    },
    {
      id: 'ef-4',
      text: 'Put your hands under cold water.',
      subtext: 'Just let it run over them.',
      modality: 'autonomic',
      requiresEnvironment: true,
    },
  ],

  reactive_aggression: [
    // Need to safely discharge sympathetic energy.
    // Isometric muscle engagement is key.
    {
      id: 'ra-1',
      text: 'Push your palms together hard.',
      subtext: 'Hold it. Feel the effort.',
      modality: 'autonomic',
    },
    {
      id: 'ra-2',
      text: 'Squeeze your hands into fists.',
      subtext: 'Tight as you can. Then release.',
      modality: 'autonomic',
    },
    {
      id: 'ra-3',
      text: 'Press your palms against the wall.',
      subtext: 'Push hard. Hold it.',
      modality: 'proprioceptive',
      requiresEnvironment: true,
    },
    {
      id: 'ra-4',
      text: 'Push your feet into the floor.',
      subtext: 'Hard. Feel the resistance.',
      modality: 'proprioceptive',
    },
    {
      id: 'ra-5',
      text: 'Hold something cold.',
      subtext: 'Cold can, ice \u2014 anything.',
      modality: 'autonomic',
      requiresEnvironment: true,
    },
  ],

  // =====================================================
  // FREEZE / SHUTDOWN
  // CRITICAL: Calming tools WORSEN this state.
  // Do NOT recommend breathing exercises or meditation.
  // Need gentle UP-regulation via proprioceptive micro-movements.
  // "Pulling out too quickly can trigger rebound panic."
  // =====================================================

  conservation_freeze: [
    {
      id: 'cf-1',
      text: 'Wiggle your toes.',
      subtext: "Just your toes. That\u2019s all.",
      modality: 'proprioceptive',
    },
    {
      id: 'cf-2',
      text: 'Rub your hands together slowly.',
      subtext: 'Feel the warmth build.',
      modality: 'proprioceptive',
    },
    {
      id: 'cf-3',
      text: 'Press your feet into the floor.',
      subtext: 'Gently. Notice the pressure.',
      modality: 'proprioceptive',
    },
    {
      id: 'cf-4',
      text: 'Move your fingers one at a time.',
      subtext: "Slowly. There\u2019s no rush.",
      modality: 'proprioceptive',
    },
    {
      id: 'cf-5',
      text: 'Tap your knees gently.',
      subtext: 'Left, right, left, right.',
      modality: 'proprioceptive',
    },
  ],

  // =====================================================
  // DISSOCIATION / OVERMODULATION
  // PFC is OVER-active suppressing the body.
  // Need gentle sensory reconnection — titrated, not intense.
  // "Somatic Experiencing and gentle proprioceptive input are safer entry points"
  // =====================================================

  dissociation_overmodulation: [
    {
      id: 'do-1',
      text: 'Touch the surface nearest to you.',
      subtext: 'What does it feel like?',
      modality: 'sensory',
    },
    {
      id: 'do-2',
      text: 'Take a sip of something.',
      subtext: 'Notice the temperature in your mouth.',
      modality: 'sensory',
      requiresEnvironment: true,
    },
    {
      id: 'do-3',
      text: 'Rub your thumb across your fingertips.',
      subtext: 'Slowly. Feel each one.',
      modality: 'sensory',
    },
    {
      id: 'do-4',
      text: 'Feel the weight of your hands.',
      subtext: 'Just notice them resting.',
      modality: 'proprioceptive',
    },
    {
      id: 'do-5',
      text: 'Press your feet into the floor.',
      subtext: 'Notice the feeling of being here.',
      modality: 'proprioceptive',
    },
  ],

  // =====================================================
  // CHRONIC VIGILANCE
  // Attention is locked onto threat scanning (BNST-driven).
  // Need present-moment anchoring to disengage the scan.
  // NOT the same as rumination — this is external/environmental threat focus.
  // =====================================================

  chronic_vigilance: [
    {
      id: 'cv-1',
      text: 'Feel your feet on the ground.',
      subtext: "You\u2019re here. Right here.",
      modality: 'proprioceptive',
    },
    {
      id: 'cv-2',
      text: 'Name one thing you can hear.',
      subtext: "Just one. That\u2019s enough.",
      modality: 'attentional',
    },
    {
      id: 'cv-3',
      text: 'Touch the surface nearest to you.',
      subtext: 'Notice how it feels.',
      modality: 'sensory',
    },
    {
      id: 'cv-4',
      text: 'Look around. Find something soft.',
      subtext: "Just notice it\u2019s there.",
      modality: 'attentional',
    },
  ],

  // =====================================================
  // RUMINATION LOOP
  // DMN hyperactivity — stuck in self-referential processing.
  // Need external focus tasks to engage task-positive network.
  // "Break the link via task-positive activities requiring external focus."
  // "Mindfulness can backfire by increasing internal focus."
  // =====================================================

  rumination_loop: [
    {
      id: 'rl-1',
      text: 'Look around. Find something blue.',
      subtext: 'Any shade counts.',
      modality: 'attentional',
    },
    {
      id: 'rl-2',
      text: "Listen. What\u2019s the farthest sound?",
      subtext: 'Just notice it.',
      modality: 'attentional',
    },
    {
      id: 'rl-3',
      text: 'Count backwards from ten.',
      subtext: 'Out loud or in your head.',
      modality: 'attentional',
    },
    {
      id: 'rl-4',
      text: 'Name three things you can see.',
      subtext: 'Anything at all.',
      modality: 'attentional',
    },
    {
      id: 'rl-5',
      text: 'Touch something nearby. Describe it.',
      subtext: 'Smooth? Rough? Cool? Warm?',
      modality: 'sensory',
    },
  ],

  // =====================================================
  // SOCIAL THREAT / SHAME
  // Behavioral inhibition system active (urge to hide).
  // Self-focused attention makes it WORSE.
  // Need outward-directed sensory contact + self-compassion.
  // "Avoid tools that increase self-focus (journaling may amplify shame)"
  // =====================================================

  social_threat_shame: [
    {
      id: 'ss-1',
      text: 'Put your hand on your chest.',
      subtext: 'Just hold it there. Gently.',
      modality: 'proprioceptive',
    },
    {
      id: 'ss-2',
      text: 'Feel your feet on the ground.',
      subtext: "You\u2019re here. That\u2019s enough.",
      modality: 'proprioceptive',
    },
    {
      id: 'ss-3',
      text: 'Look out a window if you can.',
      subtext: 'Just look. Nothing else.',
      modality: 'attentional',
      requiresEnvironment: true,
    },
    {
      id: 'ss-4',
      text: 'Touch the surface nearest to you.',
      subtext: 'Feel something outside yourself.',
      modality: 'sensory',
    },
    {
      id: 'ss-5',
      text: 'Wrap your arms around yourself.',
      subtext: "Hold gently. You\u2019re okay.",
      modality: 'proprioceptive',
    },
  ],

  // =====================================================
  // LOW REWARD DRIVE
  // NAc/dopamine pathways underactive. The enemy is inertia.
  // Need the tiniest possible behavioral activation.
  // =====================================================

  reward_drive_low: [
    {
      id: 'rd-1',
      text: 'Stretch your arms above your head.',
      subtext: 'Just for a second.',
      modality: 'proprioceptive',
    },
    {
      id: 'rd-2',
      text: 'Take a sip of water.',
      subtext: "That\u2019s one thing you did.",
      modality: 'sensory',
      requiresEnvironment: true,
    },
    {
      id: 'rd-3',
      text: 'Move one part of your body.',
      subtext: 'Anything. A finger. Your head.',
      modality: 'proprioceptive',
    },
    {
      id: 'rd-4',
      text: 'Look at something nearby.',
      subtext: 'Just let your eyes rest on it.',
      modality: 'attentional',
    },
  ],

  // =====================================================
  // GRIEF / YEARNING (Phase 2 pattern)
  // Attachment system reaching. Needs grounding + gentle compassion.
  // "Never use 'moving on' language"
  // =====================================================

  grief_yearning: [
    {
      id: 'gy-1',
      text: 'Put your hand on your chest.',
      subtext: "Feel your heartbeat. You\u2019re here.",
      modality: 'proprioceptive',
    },
    {
      id: 'gy-2',
      text: 'Feel the weight of your body.',
      subtext: 'Wherever you are. Just notice.',
      modality: 'proprioceptive',
    },
    {
      id: 'gy-3',
      text: 'Touch something soft.',
      subtext: 'A sleeve, a blanket, anything.',
      modality: 'sensory',
    },
  ],

  // =====================================================
  // FALLBACK
  // Used when no pattern ID matches (shouldn't happen in practice,
  // but safety net for edge cases). These are universally safe,
  // low-cognitive-load, environment-independent steps.
  // =====================================================

  fallback: [
    {
      id: 'fb-1',
      text: 'Press your feet into the floor.',
      subtext: 'Feel the ground under you.',
      modality: 'proprioceptive',
    },
    {
      id: 'fb-2',
      text: 'Squeeze your hands, then let go.',
      subtext: 'Notice the difference.',
      modality: 'autonomic',
    },
    {
      id: 'fb-3',
      text: 'Touch the surface nearest to you.',
      subtext: 'Just feel it.',
      modality: 'sensory',
    },
    {
      id: 'fb-4',
      text: 'Take one breath. Just one.',
      subtext: "You don\u2019t have to do it a special way.",
      modality: 'autonomic',
    },
  ],
};


/**
 * Get the micro-steps array for a given activation pattern.
 * Falls back to universal safe steps if the pattern is unknown.
 */
export function getMicroStepsForPattern(patternId: string): MicroStep[] {
  return PATTERN_MICRO_STEPS[patternId] ?? PATTERN_MICRO_STEPS.fallback;
}

/**
 * Get a single micro-step for a given pattern, optionally skipping
 * steps that require specific environments.
 * 
 * @param patternId - The activation pattern ID from the graph
 * @param skipIndex - If the user tapped "show me something else", 
 *                    pass the current index to get the next one
 * @param skipEnvironmental - If true, skip steps that need objects/environment
 */
export function getMicroStep(
  patternId: string,
  skipIndex?: number,
  skipEnvironmental?: boolean,
): { step: MicroStep; index: number } {
  let steps = getMicroStepsForPattern(patternId);

  if (skipEnvironmental) {
    const filtered = steps.filter(s => !s.requiresEnvironment);
    if (filtered.length > 0) {
      steps = filtered;
    }
  }

  let index: number;
  if (skipIndex !== undefined) {
    index = (skipIndex + 1) % steps.length;
  } else {
    index = Math.floor(Math.random() * steps.length);
  }

  return { step: steps[index], index };
}
