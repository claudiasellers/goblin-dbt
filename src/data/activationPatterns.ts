/**
 * Activation pattern display metadata.
 * Same join pattern as tools.ts: the graph owns clinical knowledge
 * (relationships, safety constraints, tool mappings), the frontend
 * owns presentation (emojis, labels, dashboard copy).
 */

export interface ActivationPatternMeta {
  id: string;
  emoji: string;
  userFacingLabel: string;
  dashboardSummary: string;
  systemDescription: string;
}

export const activationPatterns: Record<string, ActivationPatternMeta> = {
  acute_alarm: {
    id: 'acute_alarm',
    emoji: '⚡',
    userFacingLabel: "Your brain's alarm system is activated right now",
    dashboardSummary: 'alarm activation',
    systemDescription:
      "Your nervous system is responding to something it reads as an immediate threat — that's your alarm circuit doing its job, even when there's no physical danger.",
  },
  chronic_vigilance: {
    id: 'chronic_vigilance',
    emoji: '🔍',
    userFacingLabel: 'Your attention is locked onto what could go wrong',
    dashboardSummary: 'vigilance mode',
    systemDescription:
      "Your system is stuck scanning for threats — like a radar that won't turn off. That sustained alertness is exhausting, even when nothing specific is happening.",
  },
  emotional_flooding: {
    id: 'emotional_flooding',
    emoji: '🌊',
    userFacingLabel: 'Your feelings are hitting all at once',
    dashboardSummary: 'emotional flooding',
    systemDescription:
      "Your system is overwhelmed — too many signals at once for your brain's regulatory circuits to manage. This is when thinking tools stop working and body-based tools matter most.",
  },
  conservation_freeze: {
    id: 'conservation_freeze',
    emoji: '🧊',
    userFacingLabel: 'Your system is conserving energy right now',
    dashboardSummary: 'energy conservation',
    systemDescription:
      "Your nervous system has pulled the emergency brake — shutting things down to protect you. This isn't laziness, it's a deep protective response.",
  },
  dissociation_overmodulation: {
    id: 'dissociation_overmodulation',
    emoji: '🌫️',
    userFacingLabel: 'Your mind is protecting you by disconnecting',
    dashboardSummary: 'disconnection',
    systemDescription:
      "Your brain is turning down the volume on overwhelming feelings by creating distance. It's a protective response, but it can leave you feeling unreal or far away.",
  },
  rumination_loop: {
    id: 'rumination_loop',
    emoji: '🔄',
    userFacingLabel: 'Your mind is stuck on replay',
    dashboardSummary: 'rumination',
    systemDescription:
      "Your brain's default network is looping — replaying events or rehearsing worries. The loop feels productive but it's actually keeping you stuck in the same emotional place.",
  },
  reward_drive_low: {
    id: 'reward_drive_low',
    emoji: '🪫',
    userFacingLabel: 'Your motivation system is idling right now',
    dashboardSummary: 'low motivation',
    systemDescription:
      "Your brain's reward system is running quiet — things that usually feel worthwhile aren't registering. This is a neurochemical state, not a character flaw.",
  },
  social_threat_shame: {
    id: 'social_threat_shame',
    emoji: '🫣',
    userFacingLabel: 'Your brain is treating social evaluation like danger',
    dashboardSummary: 'social threat',
    systemDescription:
      "Your system is modeling how others see you and treating that evaluation as a threat. The urge to hide or withdraw is your nervous system trying to protect you.",
  },
  grief_yearning: {
    id: 'grief_yearning',
    emoji: '💔',
    userFacingLabel: 'Your attachment system is reaching for who is gone',
    dashboardSummary: 'grief and yearning',
    systemDescription:
      "Your brain's attachment circuits are active, reaching for a connection that isn't there anymore. That longing is love with nowhere to go right now.",
  },
  reactive_aggression: {
    id: 'reactive_aggression',
    emoji: '🔥',
    userFacingLabel: 'Your protection system is translating stress into anger',
    dashboardSummary: 'reactive protection',
    systemDescription:
      "Your nervous system is converting overwhelm into a fight response — anger can feel more manageable than vulnerability. The heat is real, and it's protecting something underneath.",
  },
};

/** Escalation paths: pattern → what it can escalate to. Only 3 exist in the graph. */
export const escalationPaths: Record<string, string> = {
  conservation_freeze: 'acute_alarm',
  acute_alarm: 'emotional_flooding',
  social_threat_shame: 'reactive_aggression',
};

/** Quadrant display labels for fallback when no pattern data exists */
export const quadrantLabels: Record<string, string> = {
  'high-unpleasant': 'high-energy distress',
  'high-pleasant': 'high-energy positive states',
  'low-unpleasant': 'low-energy difficult states',
  'low-pleasant': 'low-energy calm states',
};
