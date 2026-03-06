// ============================================
// Insight Narratives — formulation + escalation content
// Adds narrative properties to existing ActivationPattern nodes,
// CO_OCCURS_WITH relationships, and CAN_ESCALATE_TO relationships.
// Safe to re-run (MERGE + SET).
// ============================================

// ── ActivationPattern narrative properties ──

MATCH (p:ActivationPattern {id: 'acute_alarm'})
SET p.formulation_headline = "Your alarm system is working overtime",
    p.formulation_body = "Your nervous system has been firing its threat-detection circuits repeatedly. This isn't anxiety as a personality trait — it's a specific neural pattern where your amygdala is triggering fight-or-flight responses, even when the danger isn't immediate.",
    p.mechanism_narrative = "Your amygdala is sending urgent signals to your body before your prefrontal cortex can evaluate whether the threat is real. Body-based tools work here because they interrupt this circuit at the physiological level.";

MATCH (p:ActivationPattern {id: 'chronic_vigilance'})
SET p.formulation_headline = "Your threat-scanner is stuck on",
    p.formulation_body = "Your system has been maintaining a sustained state of alertness — scanning for what could go wrong. This pattern taxes your prefrontal cortex and keeps cortisol elevated, which is why it feels so exhausting even when nothing specific is happening.",
    p.mechanism_narrative = "Your anterior cingulate cortex is locked in monitoring mode, burning cognitive resources on threat detection. Grounding tools help by giving your attention a concrete anchor, breaking the scanning loop.";

MATCH (p:ActivationPattern {id: 'emotional_flooding'})
SET p.formulation_headline = "Your system is overwhelmed right now",
    p.formulation_body = "Your brain's regulatory circuits are getting more input than they can process. When the amygdala fires faster than the prefrontal cortex can modulate, everything feels like too much at once. This is neurological, not a failure of willpower.",
    p.mechanism_narrative = "Your prefrontal cortex is temporarily offline — too much amygdala activation has overwhelmed top-down regulation. Sensory and breathing tools work because they activate the vagus nerve, which calms the system from the bottom up.";

MATCH (p:ActivationPattern {id: 'reactive_aggression'})
SET p.formulation_headline = "Your protection system is running hot",
    p.formulation_body = "Your nervous system is converting overwhelm into a fight response. Anger can feel more manageable than the vulnerability underneath it — that's your brain choosing the emotion that feels most actionable right now.",
    p.mechanism_narrative = "Your amygdala is activating motor-preparation circuits while suppressing vulnerability signals. Cool-down tools work by activating the parasympathetic nervous system, creating space between the impulse and the action.";

MATCH (p:ActivationPattern {id: 'conservation_freeze'})
SET p.formulation_headline = "Your system has pulled the emergency brake",
    p.formulation_body = "Your nervous system has shifted into conservation mode — reducing energy output to protect you. This isn't laziness or giving up. It's a deep protective response from the oldest part of your nervous system.",
    p.mechanism_narrative = "Your dorsal vagal system is dominant, pulling energy inward. Gentle movement tools work because they send safety signals through proprioception — telling your nervous system it's safe to come back online gradually.";

MATCH (p:ActivationPattern {id: 'dissociation_overmodulation'})
SET p.formulation_headline = "Your mind is creating distance to protect you",
    p.formulation_body = "Your brain is turning down the volume on overwhelming input by creating a sense of disconnection. This is a sophisticated protective mechanism — your system decided that feeling less was safer than feeling everything.",
    p.mechanism_narrative = "Your prefrontal cortex is over-suppressing limbic signals, creating emotional numbness. Sensory grounding tools work by providing safe, manageable input that helps reconnect body awareness without overwhelming the system.";

MATCH (p:ActivationPattern {id: 'rumination_loop'})
SET p.formulation_headline = "Your mind is stuck on replay",
    p.formulation_body = "Your brain's default mode network is looping — replaying events or rehearsing worries. The loop feels productive because it mimics problem-solving, but it's actually keeping you stuck in the same emotional place without generating new solutions.",
    p.mechanism_narrative = "Your default mode network is running unchecked, recycling the same thought patterns. Attention-redirect tools work by engaging task-positive networks, which naturally suppress the default mode loop.";

MATCH (p:ActivationPattern {id: 'reward_drive_low'})
SET p.formulation_headline = "Your motivation system is running quiet",
    p.formulation_body = "Your brain's reward circuitry isn't generating the usual signals that make things feel worthwhile. This is a dopaminergic state, not a character flaw — the neurochemistry that drives wanting and anticipation is temporarily muted.",
    p.mechanism_narrative = "Your ventral striatum and dopamine pathways are underactive. Behavioral activation tools work by creating small, achievable wins that gradually re-engage the reward circuit from the outside in.";

// ── CAN_ESCALATE_TO narrative properties ──

// social_threat_shame → reactive_aggression (existing)
MATCH (p1:ActivationPattern {id: 'social_threat_shame'})-[r:CAN_ESCALATE_TO]->(p2:ActivationPattern {id: 'reactive_aggression'})
SET r.escalation_narrative = "When social threat stays intense, your system can flip from shame into anger — it feels more powerful than vulnerability. A self-compassion practice now can ease the pressure before it converts.",
    r.escalation_suggested_tool = "self-compassion-break";

// conservation_freeze → acute_alarm (existing)
MATCH (p1:ActivationPattern {id: 'conservation_freeze'})-[r:CAN_ESCALATE_TO]->(p2:ActivationPattern {id: 'acute_alarm'})
SET r.escalation_narrative = "When freeze builds pressure, your system can rebound into alarm as it tries to break free. Gentle movement now helps your nervous system come back online gradually instead of snapping into overdrive.",
    r.escalation_suggested_tool = "gentle-movement";

// acute_alarm → emotional_flooding (existing)
MATCH (p1:ActivationPattern {id: 'acute_alarm'})-[r:CAN_ESCALATE_TO]->(p2:ActivationPattern {id: 'emotional_flooding'})
SET r.escalation_narrative = "When alarm stays activated, the signals can pile up faster than your brain can process them, tipping into overwhelm. A cool-down or paced breathing now can prevent that tipping point.",
    r.escalation_suggested_tool = "paced-breathing";

// conservation_freeze → dissociation_overmodulation (NEW escalation path)
MATCH (p1:ActivationPattern {id: 'conservation_freeze'})
MATCH (p2:ActivationPattern {id: 'dissociation_overmodulation'})
MERGE (p1)-[r:CAN_ESCALATE_TO]->(p2)
SET r.mechanism = "deepening_shutdown",
    r.weight = "moderate",
    r.escalation_narrative = "When freeze deepens, your system can start disconnecting further — numbness replacing the heaviness. Gentle sensory input now can help keep you present before the distance grows.",
    r.escalation_suggested_tool = "five-senses";

// ── CO_OCCURS_WITH narrative properties ──
// Add combined formulation content to existing co-occurrence relationships

MATCH (p1:ActivationPattern {id: 'acute_alarm'})-[r:CO_OCCURS_WITH]-(p2:ActivationPattern {id: 'emotional_flooding'})
SET r.combined_formulation_headline = "Your alarm system is firing into overwhelm",
    r.combined_formulation_body = "Your threat detection and emotional processing circuits are both maxed out — alarm signals are coming in faster than your system can regulate them. This is the neural equivalent of too many browser tabs open during a fire drill.",
    r.combined_mechanism_narrative = "Both amygdala activation and prefrontal overwhelm are present simultaneously. Start with body-based regulation (breathing, cold) to calm the alarm, which will reduce the flooding.";

MATCH (p1:ActivationPattern {id: 'chronic_vigilance'})-[r:CO_OCCURS_WITH]-(p2:ActivationPattern {id: 'rumination_loop'})
SET r.combined_formulation_headline = "Your scanning and looping systems are feeding each other",
    r.combined_formulation_body = "Your threat-monitoring circuits and default mode network are in a feedback loop — scanning for danger fuels the worry loop, and the worry loop finds more things to scan for. Breaking either circuit helps break both.",
    r.combined_mechanism_narrative = "The anterior cingulate (monitoring) and default mode network (ruminating) are co-activating. Grounding tools interrupt the scanning; attention-redirect tools interrupt the loop.";

MATCH (p1:ActivationPattern {id: 'conservation_freeze'})-[r:CO_OCCURS_WITH]-(p2:ActivationPattern {id: 'dissociation_overmodulation'})
SET r.combined_formulation_headline = "Your system is shutting down and disconnecting",
    r.combined_formulation_body = "Your nervous system is both conserving energy and creating emotional distance — a deep protective response where the body goes quiet and the mind goes far away. This is your system's most extreme form of self-protection.",
    r.combined_mechanism_narrative = "Dorsal vagal shutdown combined with prefrontal over-suppression. Gentle sensory input (touch, warmth, movement) works by providing safe signals that invite the system back without overwhelming it.";

MATCH (p1:ActivationPattern {id: 'social_threat_shame'})-[r:CO_OCCURS_WITH]-(p2:ActivationPattern {id: 'conservation_freeze'})
SET r.combined_formulation_headline = "Shame has triggered your system to shut down",
    r.combined_formulation_body = "Social threat activated your freeze response — when the pain of being seen feels too intense, your system pulls inward and goes quiet. The withdrawal isn't avoidance, it's protection.",
    r.combined_mechanism_narrative = "Social evaluation circuits activated dorsal vagal shutdown. Self-compassion combined with gentle movement addresses both the shame and the freeze simultaneously.";

MATCH (p1:ActivationPattern {id: 'rumination_loop'})-[r:CO_OCCURS_WITH]-(p2:ActivationPattern {id: 'reward_drive_low'})
SET r.combined_formulation_headline = "Your mind is looping while your motivation is offline",
    r.combined_formulation_body = "Your default mode network is churning through thoughts while your reward system stays quiet — you're thinking a lot but nothing feels worth doing about it. The loop feels like processing but it's actually maintaining the stuck feeling.",
    r.combined_mechanism_narrative = "Default mode overactivity combined with dopaminergic underactivity. Behavioral activation breaks the loop by engaging task-positive networks and generating small reward signals.";

MATCH (p1:ActivationPattern {id: 'social_threat_shame'})-[r:CO_OCCURS_WITH]-(p2:ActivationPattern {id: 'rumination_loop'})
SET r.combined_formulation_headline = "Your mind is replaying social threat on loop",
    r.combined_formulation_body = "Your brain is stuck reviewing social interactions through a threat lens — replaying what you said, how others reacted, what they might think. The rumination feels like it's solving a social problem, but it's deepening the shame.",
    r.combined_mechanism_narrative = "Self-referential processing (medial PFC) is feeding the default mode loop with shame-colored content. Self-compassion interrupts the shame; urge-surfing helps you notice the loop without feeding it.";
