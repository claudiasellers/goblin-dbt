// ============================================================
// INCREMENTAL UPDATE - Activation Pattern Layer
// Run this against existing Neo4j database
// 
// Source: Goblin DBT Neural Activation Pattern Definitions
// Synthesized Expert Deliverable (February 2026)
// 
// This file contains ONLY the new Activation Pattern layer
// additions from the domain expert synthesis.
// ============================================================


// ============================================================
// STEP 1: CREATE MISSING BRAIN STRUCTURE NODES
// These structures are referenced by activation patterns but
// don't exist in the base schema
// ============================================================

// PAG Subdivisions (existing pag is too general for pattern specificity)
CREATE (dlpag:BrainStructure {
  id: "dlpag",
  name: "Dorsolateral Periaqueductal Gray",
  description: "Active defense component of PAG; involved in fight/flight responses and emotional flooding",
  aliases: ["dlPAG"],
  level: "brainstem",
  parent_structure: "pag"
});

CREATE (vlpag:BrainStructure {
  id: "vlpag",
  name: "Ventrolateral Periaqueductal Gray",
  description: "Passive defense coordinator; mediates freezing, immobility, and conservation responses",
  aliases: ["vlPAG"],
  level: "brainstem",
  parent_structure: "pag"
});

// Inferior Frontal Gyrus (behavioral inhibition in social threat)
CREATE (ifg:BrainStructure {
  id: "ifg",
  name: "Inferior Frontal Gyrus",
  description: "Involved in response inhibition, language processing, and behavioral inhibition (urge to hide in shame)",
  aliases: ["IFG", "Broca's area (pars opercularis)"],
  level: "cortical"
});

// Premotor Cortex (behavioral inhibition)
CREATE (premotor:BrainStructure {
  id: "premotor_cortex",
  name: "Premotor Cortex",
  description: "Motor planning and preparation; involved in behavioral inhibition during social threat",
  aliases: ["PMC", "premotor area"],
  level: "cortical"
});

// Dorsal Striatum (separate from NAc for goal initiation)
CREATE (dorsal_striatum:BrainStructure {
  id: "dorsal_striatum",
  name: "Dorsal Striatum",
  description: "Caudate and putamen; action selection, goal initiation, and habit formation",
  aliases: ["caudate-putamen"],
  level: "subcortical"
});

// Precuneus (DMN core, depersonalization)
CREATE (precuneus:BrainStructure {
  id: "precuneus",
  name: "Precuneus",
  description: "Medial parietal cortex; self-referential processing, autobiographical memory, DMN hub",
  aliases: ["medial parietal cortex"],
  level: "cortical"
});

// Frontal Eye Fields (attentional orienting in chronic vigilance)
// Note: fef already exists in base schema, but verify it has proper properties

// Intraparietal Sulcus (attentional orienting in chronic vigilance)
// Note: ips already exists in base schema


// ============================================================
// STEP 2: LINK NEW STRUCTURES TO EXISTING HIERARCHY
// ============================================================

MATCH (dlpag:BrainStructure {id: "dlpag"}), (pag:BrainStructure {id: "pag"})
CREATE (dlpag)-[:PART_OF]->(pag);

MATCH (vlpag:BrainStructure {id: "vlpag"}), (pag:BrainStructure {id: "pag"})
CREATE (vlpag)-[:PART_OF]->(pag);

MATCH (dorsal:BrainStructure {id: "dorsal_striatum"}), (bg:BrainStructure {id: "basal_ganglia"})
CREATE (dorsal)-[:PART_OF]->(bg);

MATCH (precuneus:BrainStructure {id: "precuneus"}), (dmn:FunctionalNetwork {id: "dmn"})
CREATE (precuneus)-[:PARTICIPATES_IN]->(dmn);


// ============================================================
// STEP 3: CREATE ACTIVATION PATTERN NODES (8 Core Patterns)
// Evidence Grades: Strong | Moderate | Emerging
// ============================================================

// Pattern 1: Acute Alarm
CREATE (acute_alarm:ActivationPattern {
  id: "acute_alarm",
  userFacingLabel: "Your brain's alarm system is activated right now",
  description: "Phasic/immediate threat response with amygdala-driven arousal and suppressed prefrontal regulation",
  evidenceGrade: "Strong",
  expertConsensus: "4/4",
  keyCitations: ["Shin & Liberzon (2010)", "LeDoux (2016)", "Rauch/Shin/Phelps (2006)", "Reyes et al. (2025, LC-NE)"],
  clinicalNotes: "BNST involvement scales with sustained/uncertain threat. LC-NE amplifies arousal. Hippocampus suppression = contextual safety signaling less effective.",
  safetyConstraints: ["Do not say 'amygdala hijacking'", "Frame as current state not trait", "Use 'right now' not 'you tend to'"]
});

// Pattern 2: Chronic Vigilance
CREATE (chronic_vigilance:ActivationPattern {
  id: "chronic_vigilance",
  userFacingLabel: "Your attention is locked onto what could go wrong",
  description: "Sustained/anticipatory threat processing with BNST as primary driver; radar stuck on mode",
  evidenceGrade: "Moderate-Strong",
  expertConsensus: "4/4 confirmed as distinct from acute alarm",
  keyCitations: ["Somerville et al. (BNST threat proximity)", "Klumpers et al. (BNST vs amygdala)", "Shackman & Fox (extended amygdala)", "Petranu et al. (BNST in PTSD)"],
  clinicalNotes: "BNST specialized for defensive distance. Treatment levers: attentional retraining and safety-signal conditioning vs autonomic downshift for acute alarm.",
  safetyConstraints: ["Superior colliculus REJECTED as core node - sparse human fMRI evidence"]
});

// Pattern 3: Emotional Flooding
CREATE (emotional_flooding:ActivationPattern {
  id: "emotional_flooding",
  userFacingLabel: "Your feelings are hitting all at once",
  description: "PFC essentially offline; salience network overloaded; cognitive tools will fail in this state",
  evidenceGrade: "Moderate-Strong",
  expertConsensus: "4/4 confirmed as clinically distinct from acute alarm",
  keyCitations: ["Shin & Liberzon (2010)", "SN hyperreactivity literature", "PAG-insula disinhibition (emerging)"],
  clinicalNotes: "OFC suppression is key differentiator - cannot reason about emotion. MUST recommend bottom-up autonomic tools: cold water, paced breathing, PMR. dlPAG involvement (active defense) included with moderate evidence.",
  safetyConstraints: ["Screen for self-harm risk when 'out of control' reported", "Emergency state - present tools immediately with minimal cognitive demand", "No browsing, 1-2 options max"]
});

// Pattern 4: Conservation/Freeze
CREATE (conservation_freeze:ActivationPattern {
  id: "conservation_freeze",
  userFacingLabel: "Your system is conserving energy right now",
  description: "PAG-centered shutdown/freeze; global dampening with no single dominant network",
  evidenceGrade: "Moderate",
  expertConsensus: "3/4 on PAG-centered mechanism; polyvagal framing contested",
  keyCitations: ["Roelofs (2017, freezing model)", "Kozlowska et al. (defense cascade)", "human freezing/bradycardia PAG literature"],
  subtype: ["freeze_high_arousal", "collapse_low_arousal"],
  clinicalNotes: "Model PAG as coordinator NOT 'Dorsal Vagal Complex'. Use neutral ANS terminology. Thalamic suppression reduces sensory bandwidth contributing to dissociative experiences.",
  safetyConstraints: ["CRITICAL: Traditional calming tools may worsen state", "Do NOT recommend deep breathing or meditation", "Favor gentle up-regulation: cold water, proprioceptive input, micro-movements", "Pulling out too quickly can trigger rebound panic"]
});

// Pattern 5: Dissociation/Overmodulation
CREATE (dissociation_overmodulation:ActivationPattern {
  id: "dissociation_overmodulation",
  userFacingLabel: "Your mind is protecting you by disconnecting",
  description: "PFC OVER-active suppressing limbic response; distinct from global dampening of conservation_freeze",
  evidenceGrade: "Strong within PTSD-dissociative subtype; Moderate for broader DPDR",
  expertConsensus: "3/4 explicitly separated from shutdown",
  keyCitations: ["Lanius (2010, 2012, dissociative PTSD)", "Modesti et al. (2022 review)", "Murphy et al. (2023 DPDR overview)"],
  clinicalNotes: "Control tower actively silencing alarms. Needs interoceptive reconnection - slowly re-establishing contact with suppressed body signals. Amygdala SUPPRESSION is defining feature.",
  safetyConstraints: ["Dissociation + suicidal ideation = escalation pathway", "Do NOT suggest heavy interoceptive exposure without titration", "Somatic Experiencing and gentle proprioceptive input are safer entry points"]
});

// Pattern 6: Rumination Loop
CREATE (rumination_loop:ActivationPattern {
  id: "rumination_loop",
  userFacingLabel: "Your mind is stuck on replay",
  description: "DMN hyperactivity with sgACC coupling; self-referential processing infused with negative valence",
  evidenceGrade: "Strong for depressive rumination; Moderate for anxious worry",
  expertConsensus: "4/4 confirmed core DMN hyperactivity model",
  keyCitations: ["Hamilton et al. (2015, DMN-rumination meta-analytic)", "Zhou et al. (2020, rumination meta-analysis)", "Menon (2023, DMN review)"],
  subtype: ["depressive_brooding", "anxious_worry"],
  clinicalNotes: "DMN and sgPFC create caustic compound when functionally linked. dlPFC suppression NOT universal - may be active but failing in anxious worry. Break the link via task-positive activities requiring external focus. Mindfulness can backfire by increasing internal focus.",
  safetyConstraints: ["If ruminative content involves suicidal ideation trigger crisis pathways", "Do not use 'brain is broken' framing"]
});

// Pattern 7: Reward Drive Low
CREATE (reward_drive_low:ActivationPattern {
  id: "reward_drive_low",
  userFacingLabel: "Your motivation system is idling right now",
  description: "Ventral striatal blunting with reduced dopamine signaling; positive valence system under-engaged",
  evidenceGrade: "Strong for ventral striatal blunting; Moderate for inflammation mechanism",
  expertConsensus: "4/4 on core, 2/4 on inflammation mechanism",
  keyCitations: ["Keren et al. (2018, reward meta-analysis)", "Ng et al. (2019)", "Halahakoon et al. (2020)", "inflammation-DA convergence reviews"],
  clinicalNotes: "Frame as 'reward system under-engaged' not single-cause. Inflammation→dopamine suppression is emerging evidence only - NOT inferable from self-report. High-effort goal setting may backfire. Recommend low-friction behavioral activation with small immediate sensory rewards.",
  safetyConstraints: ["Screen for MDE if anhedonia pervasive across multiple check-ins", "Consider fatigue/inflammation screening if persistent", "Do NOT imply 'not trying hard enough'"]
});

// Pattern 8: Social Threat/Shame
CREATE (social_threat_shame:ActivationPattern {
  id: "social_threat_shame",
  userFacingLabel: "Your brain is treating social evaluation like danger",
  description: "Self-evaluation-forward rather than amygdala-forward; intense Theory-of-Mind engagement modeling negative gaze of others",
  evidenceGrade: "Moderate-Strong",
  expertConsensus: "4/4 confirmed as distinct from general anxiety",
  keyCitations: ["Eisenberger (2012, social pain)", "Piretti et al. (2023 meta-analysis)", "Eslinger (2021, social feelings review)", "voxel-based shame/embarrassment analyses"],
  subtype: ["shame", "social_rejection", "guilt"],
  clinicalNotes: "Shame activates behavioral inhibition (hide/freeze). Guilt activates TPJ/reparative action. Social rejection activates dACC/insula pain. vmPFC suppression is state-dependent. Can trigger reactive aggression to regain social status.",
  safetyConstraints: ["Emphasize self-compassion and common humanity", "Avoid tools that increase self-focus (journaling may amplify shame)", "Do not suggest hopelessness/worthlessness as co-occurring without extreme care"]
});


// ============================================================
// STEP 4: CREATE STATE MODULATOR NODES (3 Modulators)
// These attach to any pattern via MODULATED_BY relationship
// ============================================================

CREATE (sleep_loss:StateModulator {
  id: "sleep_loss_sensitization",
  userFacingLabel: "Poor sleep is turning up the volume on your emotions",
  description: "Increases amygdala reactivity, decreases PFC-amygdala coupling, increases SN bias",
  evidenceGrade: "Strong",
  expertConsensus: "4/4",
  keyCitations: ["Yoo et al. (2007) + replications"],
  duration: "hours_to_days",
  effectOnPatterns: "Amygdala reactivity increases; PFC-amygdala coupling decreases; SN bias increases",
  toolSequencing: "Address sleep first before expecting cognitive tools to work",
  safetyConstraints: ["Insomnia with significant impairment should route to clinical referral"]
});

CREATE (acute_stress_catecholamine:StateModulator {
  id: "acute_stress_catecholamine",
  userFacingLabel: "Stress is switching off your planning circuits right now",
  description: "dlPFC working memory and top-down control degraded; habit/limbic circuits gain dominance",
  evidenceGrade: "Strong",
  expertConsensus: "3/4 explicit, 1/4 implicit",
  keyCitations: ["Arnsten 2015", "Gamo & Arnsten 2015"],
  duration: "minutes_to_hours",
  effectOnPatterns: "dlPFC working memory degraded; habit/limbic circuits dominant",
  toolSequencing: "Reduce stress load before attempting executive-function-dependent tools (reappraisal, planning)",
  safetyConstraints: ["Model as state node not trait - this is reversible"]
});

CREATE (interoceptive_threat_bias:StateModulator {
  id: "interoceptive_threat_bias",
  userFacingLabel: "Your body signals feel noisy or threatening right now",
  description: "Anterior insula and dACC hyperprecision; body signals interpreted as threats; worsens panic and health anxiety",
  evidenceGrade: "Moderate-Strong",
  expertConsensus: "2/4 explicit",
  keyCitations: ["Khalsa et al. (2018)", "Paulus et al. (2019)", "Kleckner et al. (2017)"],
  duration: "variable",
  effectOnPatterns: "Body signals interpreted as threats; worsens panic, health anxiety; distinguishes from externally-focused Patterns 1-2",
  toolSequencing: "Interoceptive recalibration tools",
  safetyConstraints: ["Avoid deterministic claims", "Do NOT say 'your insula is broken'"]
});


// ============================================================
// STEP 5: CREATE PHASE-2 ACTIVATION PATTERNS
// Approved for future implementation, not for v1
// ============================================================

CREATE (grief_yearning:ActivationPattern {
  id: "grief_yearning",
  userFacingLabel: "Your attachment system is reaching for who is gone",
  description: "NAc/ventral striatum yearning/craving, PCC autobiographical memory, amygdala distress",
  evidenceGrade: "Moderate",
  expertConsensus: "2/4 include in core, 1/4 phase-2, 1/4 reject",
  keyCitations: ["O'Connor et al. (2008)", "Kakarala et al. (2020)"],
  phaseRelease: "phase_2",
  clinicalNotes: "NAc findings specific to PROLONGED/COMPLICATED grief. Do not generalize to all grief.",
  safetyConstraints: ["Never use 'moving on' language", "Focus on integrated memory and meaning-making", "Do not pathologize normal grief trajectories"]
});

CREATE (reactive_aggression:ActivationPattern {
  id: "reactive_aggression",
  userFacingLabel: "Your protection system is translating stress into anger",
  description: "Amygdala-hypothalamus-PAG attack circuit with suppressed regulatory PFC nodes",
  evidenceGrade: "Moderate-Strong",
  expertConsensus: "3/4 include, 1/4 omit from initial release",
  keyCitations: ["hypothalamic-limbic attack circuit literature", "amygdala/PAG meta-analytic evidence"],
  phaseRelease: "phase_2",
  clinicalNotes: "Higher safety complexity. Tools must discharge sympathetic energy safely before cognitive tools. Affect labeling re-engages vlPFC. High association with hostile attribution bias.",
  safetyConstraints: ["Proactive/instrumental aggression REJECTED for all releases", "Only reactive aggression modeled", "Requires careful tool sequencing to avoid escalation"]
});


// ============================================================
// STEP 6: CREATE SAFETY FLAG NODES
// For crisis escalation triggers
// ============================================================

CREATE (crisis_suicidal:SafetyFlag {
  id: "crisis_suicidal",
  type: "crisis",
  trigger: "Suicidal ideation in any pattern",
  action: "Immediate cessation of tool recommendation; present safety resources",
  doNot: "Attempt to 'modulate' or offer coping tools"
});

CREATE (crisis_self_harm:SafetyFlag {
  id: "crisis_self_harm",
  type: "crisis",
  trigger: "Self-harm urges + 'out of control'",
  action: "Safety anchor (crisis line, emergency contact) BEFORE any tool",
  doNot: "Recommend distress tolerance tools as primary response"
});

CREATE (clinical_referral_shutdown:SafetyFlag {
  id: "clinical_referral_shutdown",
  type: "clinical_referral",
  trigger: "Persistent shutdown (7+ consecutive days of numb/empty)",
  action: "Flag potential chronic dysfunction; recommend professional evaluation",
  doNot: "Continue offering app-based tools as if they're sufficient"
});

CREATE (clinical_referral_psychosis:SafetyFlag {
  id: "clinical_referral_psychosis",
  type: "clinical_referral",
  trigger: "Psychotic symptoms (hallucinations, delusions)",
  action: "Acknowledge experience without validating; offer referral",
  doNot: "Attempt reality testing or reappraisal"
});

CREATE (clinical_referral_severe_dissociation:SafetyFlag {
  id: "clinical_referral_severe_dissociation",
  type: "clinical_referral",
  trigger: "Severe dissociation (user cannot orient to present)",
  action: "Gentle grounding only; redirect to professional support",
  doNot: "Push interoceptive exposure or trauma processing"
});


// ============================================================
// STEP 7: CREATE INVOLVES RELATIONSHIPS
// (Pattern)-[:INVOLVES {direction, evidenceGrade, conditional, confidence}]->(BrainStructure)
// ============================================================

// --- Pattern 1: Acute Alarm INVOLVES relationships ---
MATCH (p:ActivationPattern {id: "acute_alarm"}), (b:BrainStructure {id: "amygdala"})
CREATE (p)-[:INVOLVES {direction: "overactive", evidenceGrade: "Strong"}]->(b);

MATCH (p:ActivationPattern {id: "acute_alarm"}), (b:BrainStructure {id: "anterior_insula"})
CREATE (p)-[:INVOLVES {direction: "overactive", evidenceGrade: "Strong"}]->(b);

MATCH (p:ActivationPattern {id: "acute_alarm"}), (b:BrainStructure {id: "dacc"})
CREATE (p)-[:INVOLVES {direction: "overactive", evidenceGrade: "Strong"}]->(b);

MATCH (p:ActivationPattern {id: "acute_alarm"}), (b:BrainStructure {id: "locus_coeruleus"})
CREATE (p)-[:INVOLVES {direction: "overactive", evidenceGrade: "Strong", role: "arousal_amplifier"}]->(b);

MATCH (p:ActivationPattern {id: "acute_alarm"}), (b:BrainStructure {id: "bnst"})
CREATE (p)-[:INVOLVES {direction: "overactive", evidenceGrade: "Strong", conditional: "increases with sustained/uncertain threat"}]->(b);

MATCH (p:ActivationPattern {id: "acute_alarm"}), (b:BrainStructure {id: "dlpfc"})
CREATE (p)-[:INVOLVES {direction: "suppressed", evidenceGrade: "Strong"}]->(b);

MATCH (p:ActivationPattern {id: "acute_alarm"}), (b:BrainStructure {id: "vmpfc"})
CREATE (p)-[:INVOLVES {direction: "suppressed", evidenceGrade: "Strong"}]->(b);

MATCH (p:ActivationPattern {id: "acute_alarm"}), (b:BrainStructure {id: "hippocampus"})
CREATE (p)-[:INVOLVES {direction: "suppressed", evidenceGrade: "Strong", notes: "contextual safety signaling less effective"}]->(b);


// --- Pattern 2: Chronic Vigilance INVOLVES relationships ---
MATCH (p:ActivationPattern {id: "chronic_vigilance"}), (b:BrainStructure {id: "bnst"})
CREATE (p)-[:INVOLVES {direction: "overactive", evidenceGrade: "Strong", role: "primary_driver"}]->(b);

MATCH (p:ActivationPattern {id: "chronic_vigilance"}), (b:BrainStructure {id: "amygdala"})
CREATE (p)-[:INVOLVES {direction: "overactive", evidenceGrade: "Strong", role: "sustained_support"}]->(b);

MATCH (p:ActivationPattern {id: "chronic_vigilance"}), (b:BrainStructure {id: "ips"})
CREATE (p)-[:INVOLVES {direction: "overactive", evidenceGrade: "Strong", network: "DAN"}]->(b);

MATCH (p:ActivationPattern {id: "chronic_vigilance"}), (b:BrainStructure {id: "fef"})
CREATE (p)-[:INVOLVES {direction: "overactive", evidenceGrade: "Strong", network: "DAN"}]->(b);

MATCH (p:ActivationPattern {id: "chronic_vigilance"}), (b:BrainStructure {id: "locus_coeruleus"})
CREATE (p)-[:INVOLVES {direction: "overactive", evidenceGrade: "Strong", role: "tonic_arousal"}]->(b);


// --- Pattern 3: Emotional Flooding INVOLVES relationships ---
MATCH (p:ActivationPattern {id: "emotional_flooding"}), (b:BrainStructure {id: "amygdala"})
CREATE (p)-[:INVOLVES {direction: "overactive", evidenceGrade: "Strong"}]->(b);

MATCH (p:ActivationPattern {id: "emotional_flooding"}), (b:BrainStructure {id: "anterior_insula"})
CREATE (p)-[:INVOLVES {direction: "overactive", evidenceGrade: "Strong"}]->(b);

MATCH (p:ActivationPattern {id: "emotional_flooding"}), (b:BrainStructure {id: "dacc"})
CREATE (p)-[:INVOLVES {direction: "overactive", evidenceGrade: "Strong"}]->(b);

MATCH (p:ActivationPattern {id: "emotional_flooding"}), (b:BrainStructure {id: "dlpag"})
CREATE (p)-[:INVOLVES {direction: "overactive", evidenceGrade: "Moderate", role: "active_defense_component"}]->(b);

MATCH (p:ActivationPattern {id: "emotional_flooding"}), (b:BrainStructure {id: "dlpfc"})
CREATE (p)-[:INVOLVES {direction: "suppressed", evidenceGrade: "Strong", notes: "essentially_offline"}]->(b);

MATCH (p:ActivationPattern {id: "emotional_flooding"}), (b:BrainStructure {id: "ofc"})
CREATE (p)-[:INVOLVES {direction: "suppressed", evidenceGrade: "Moderate-Strong", role: "key_differentiator"}]->(b);

MATCH (p:ActivationPattern {id: "emotional_flooding"}), (b:BrainStructure {id: "vmpfc"})
CREATE (p)-[:INVOLVES {direction: "suppressed", evidenceGrade: "Strong"}]->(b);


// --- Pattern 4: Conservation/Freeze INVOLVES relationships ---
MATCH (p:ActivationPattern {id: "conservation_freeze"}), (b:BrainStructure {id: "vlpag"})
CREATE (p)-[:INVOLVES {direction: "overactive", evidenceGrade: "Moderate", role: "passive_defense_coordinator"}]->(b);

MATCH (p:ActivationPattern {id: "conservation_freeze"}), (b:BrainStructure {id: "thalamus"})
CREATE (p)-[:INVOLVES {direction: "suppressed", evidenceGrade: "Moderate", role: "sensory_relay_reduced"}]->(b);

MATCH (p:ActivationPattern {id: "conservation_freeze"}), (b:BrainStructure {id: "motor_cortex"})
CREATE (p)-[:INVOLVES {direction: "suppressed", evidenceGrade: "Moderate"}]->(b);


// --- Pattern 5: Dissociation/Overmodulation INVOLVES relationships ---
MATCH (p:ActivationPattern {id: "dissociation_overmodulation"}), (b:BrainStructure {id: "vmpfc"})
CREATE (p)-[:INVOLVES {direction: "overactive", evidenceGrade: "Strong", role: "over_inhibitory_control"}]->(b);

MATCH (p:ActivationPattern {id: "dissociation_overmodulation"}), (b:BrainStructure {id: "pcc"})
CREATE (p)-[:INVOLVES {direction: "overactive", evidenceGrade: "Strong", notes: "depersonalization"}]->(b);

MATCH (p:ActivationPattern {id: "dissociation_overmodulation"}), (b:BrainStructure {id: "precuneus"})
CREATE (p)-[:INVOLVES {direction: "overactive", evidenceGrade: "Strong", notes: "depersonalization"}]->(b);

MATCH (p:ActivationPattern {id: "dissociation_overmodulation"}), (b:BrainStructure {id: "amygdala"})
CREATE (p)-[:INVOLVES {direction: "suppressed", evidenceGrade: "Strong", notes: "emotional_numbing_via_top_down"}]->(b);

MATCH (p:ActivationPattern {id: "dissociation_overmodulation"}), (b:BrainStructure {id: "thalamus"})
CREATE (p)-[:INVOLVES {direction: "suppressed", evidenceGrade: "Moderate"}]->(b);


// --- Pattern 6: Rumination Loop INVOLVES relationships ---
MATCH (p:ActivationPattern {id: "rumination_loop"}), (b:BrainStructure {id: "mpfc"})
CREATE (p)-[:INVOLVES {direction: "overactive", evidenceGrade: "Strong", role: "DMN_core"}]->(b);

MATCH (p:ActivationPattern {id: "rumination_loop"}), (b:BrainStructure {id: "pcc"})
CREATE (p)-[:INVOLVES {direction: "overactive", evidenceGrade: "Strong", role: "DMN_core"}]->(b);

MATCH (p:ActivationPattern {id: "rumination_loop"}), (b:BrainStructure {id: "precuneus"})
CREATE (p)-[:INVOLVES {direction: "overactive", evidenceGrade: "Strong", role: "DMN_core"}]->(b);

MATCH (p:ActivationPattern {id: "rumination_loop"}), (b:BrainStructure {id: "vacc"})
CREATE (p)-[:INVOLVES {direction: "overactive", evidenceGrade: "Strong", role: "affective_coloring", notes: "sgACC coupling creates caustic compound with DMN"}]->(b);

MATCH (p:ActivationPattern {id: "rumination_loop"}), (b:BrainStructure {id: "dlpfc"})
CREATE (p)-[:INVOLVES {direction: "suppressed", evidenceGrade: "Strong", conditional: "stronger in depressive rumination; variable in anxious worry"}]->(b);

MATCH (p:ActivationPattern {id: "rumination_loop"}), (b:BrainStructure {id: "hippocampus"})
CREATE (p)-[:INVOLVES {direction: "suppressed", evidenceGrade: "Strong"}]->(b);


// --- Pattern 7: Reward Drive Low INVOLVES relationships ---
MATCH (p:ActivationPattern {id: "reward_drive_low"}), (b:BrainStructure {id: "vacc"})
CREATE (p)-[:INVOLVES {direction: "overactive", evidenceGrade: "Moderate", role: "overlap_with_rumination", confidence: "low"}]->(b);

MATCH (p:ActivationPattern {id: "reward_drive_low"}), (b:BrainStructure {id: "nucleus_accumbens"})
CREATE (p)-[:INVOLVES {direction: "suppressed", evidenceGrade: "Strong", notes: "blunted_reactivity"}]->(b);

MATCH (p:ActivationPattern {id: "reward_drive_low"}), (b:BrainStructure {id: "vta"})
CREATE (p)-[:INVOLVES {direction: "suppressed", evidenceGrade: "Strong", notes: "DA_signaling_reduced"}]->(b);

MATCH (p:ActivationPattern {id: "reward_drive_low"}), (b:BrainStructure {id: "dorsal_striatum"})
CREATE (p)-[:INVOLVES {direction: "suppressed", evidenceGrade: "Moderate", notes: "goal_initiation"}]->(b);


// --- Pattern 8: Social Threat/Shame INVOLVES relationships ---
MATCH (p:ActivationPattern {id: "social_threat_shame"}), (b:BrainStructure {id: "dacc"})
CREATE (p)-[:INVOLVES {direction: "overactive", evidenceGrade: "Strong", role: "social_pain_alarm"}]->(b);

MATCH (p:ActivationPattern {id: "social_threat_shame"}), (b:BrainStructure {id: "anterior_insula"})
CREATE (p)-[:INVOLVES {direction: "overactive", evidenceGrade: "Strong"}]->(b);

MATCH (p:ActivationPattern {id: "social_threat_shame"}), (b:BrainStructure {id: "mpfc"})
CREATE (p)-[:INVOLVES {direction: "overactive", evidenceGrade: "Strong", role: "self_evaluation"}]->(b);

MATCH (p:ActivationPattern {id: "social_threat_shame"}), (b:BrainStructure {id: "tpj"})
CREATE (p)-[:INVOLVES {direction: "overactive", evidenceGrade: "Moderate", role: "mentalizing_guilt_specific"}]->(b);

MATCH (p:ActivationPattern {id: "social_threat_shame"}), (b:BrainStructure {id: "premotor_cortex"})
CREATE (p)-[:INVOLVES {direction: "overactive", evidenceGrade: "Moderate", role: "behavioral_inhibition_hide"}]->(b);

MATCH (p:ActivationPattern {id: "social_threat_shame"}), (b:BrainStructure {id: "ifg"})
CREATE (p)-[:INVOLVES {direction: "overactive", evidenceGrade: "Moderate", role: "behavioral_inhibition_hide"}]->(b);

MATCH (p:ActivationPattern {id: "social_threat_shame"}), (b:BrainStructure {id: "vmpfc"})
CREATE (p)-[:INVOLVES {direction: "suppressed", evidenceGrade: "Strong", conditional: "state-dependent, not a fixed deficit"}]->(b);

MATCH (p:ActivationPattern {id: "social_threat_shame"}), (b:BrainStructure {id: "pcc"})
CREATE (p)-[:INVOLVES {direction: "suppressed", evidenceGrade: "Moderate", notes: "reduced_in_shame_vs_active_in_guilt"}]->(b);


// ============================================================
// STEP 8: CREATE DOMINANT_NETWORK RELATIONSHIPS
// ============================================================

MATCH (p:ActivationPattern {id: "acute_alarm"}), (n:FunctionalNetwork {id: "salience_network"})
CREATE (p)-[:DOMINANT_NETWORK {state: "hyper_engaged", evidenceGrade: "Strong"}]->(n);

MATCH (p:ActivationPattern {id: "chronic_vigilance"}), (n:FunctionalNetwork {id: "dan"})
CREATE (p)-[:DOMINANT_NETWORK {evidenceGrade: "Strong"}]->(n);

MATCH (p:ActivationPattern {id: "chronic_vigilance"}), (n:FunctionalNetwork {id: "salience_network"})
CREATE (p)-[:DOMINANT_NETWORK {evidenceGrade: "Strong"}]->(n);

MATCH (p:ActivationPattern {id: "emotional_flooding"}), (n:FunctionalNetwork {id: "salience_network"})
CREATE (p)-[:DOMINANT_NETWORK {state: "overloaded_high_gain", evidenceGrade: "Strong"}]->(n);

// conservation_freeze: "Global dampening — no single dominant network" - no DOMINANT_NETWORK edge

MATCH (p:ActivationPattern {id: "dissociation_overmodulation"}), (n:FunctionalNetwork {id: "dmn"})
CREATE (p)-[:DOMINANT_NETWORK {state: "altered", evidenceGrade: "Strong"}]->(n);

MATCH (p:ActivationPattern {id: "rumination_loop"}), (n:FunctionalNetwork {id: "dmn"})
CREATE (p)-[:DOMINANT_NETWORK {state: "dominant_with_altered_CEN_coupling", evidenceGrade: "Strong"}]->(n);


// ============================================================
// STEP 9: CREATE ASSOCIATED_WITH RELATIONSHIPS (Pattern to Emotions)
// ============================================================

// Acute Alarm emotions
MATCH (p:ActivationPattern {id: "acute_alarm"}), (e:Emotion {id: "anxiety"})
CREATE (p)-[:ASSOCIATED_WITH {strength: "strong"}]->(e);

MATCH (p:ActivationPattern {id: "acute_alarm"}), (e:Emotion {id: "panic"})
CREATE (p)-[:ASSOCIATED_WITH {strength: "strong"}]->(e);

MATCH (p:ActivationPattern {id: "acute_alarm"}), (e:Emotion {id: "overwhelm"})
CREATE (p)-[:ASSOCIATED_WITH {strength: "strong"}]->(e);

MATCH (p:ActivationPattern {id: "acute_alarm"}), (e:Emotion {id: "fear"})
CREATE (p)-[:ASSOCIATED_WITH {strength: "strong"}]->(e);

// Chronic Vigilance emotions
MATCH (p:ActivationPattern {id: "chronic_vigilance"}), (e:Emotion {id: "anxiety"})
CREATE (p)-[:ASSOCIATED_WITH {strength: "strong", quality: "watchful"}]->(e);

MATCH (p:ActivationPattern {id: "chronic_vigilance"}), (e:Emotion {id: "stress"})
CREATE (p)-[:ASSOCIATED_WITH {strength: "strong"}]->(e);

// Emotional Flooding emotions
MATCH (p:ActivationPattern {id: "emotional_flooding"}), (e:Emotion {id: "overwhelm"})
CREATE (p)-[:ASSOCIATED_WITH {strength: "strong"}]->(e);

MATCH (p:ActivationPattern {id: "emotional_flooding"}), (e:Emotion {id: "anger"})
CREATE (p)-[:ASSOCIATED_WITH {strength: "moderate", quality: "explosive"}]->(e);

MATCH (p:ActivationPattern {id: "emotional_flooding"}), (e:Emotion {id: "sadness"})
CREATE (p)-[:ASSOCIATED_WITH {strength: "moderate", quality: "cant_stop_crying"}]->(e);

// Conservation/Freeze emotions
MATCH (p:ActivationPattern {id: "conservation_freeze"}), (e:Emotion {id: "numbness"})
CREATE (p)-[:ASSOCIATED_WITH {strength: "strong"}]->(e);

MATCH (p:ActivationPattern {id: "conservation_freeze"}), (e:Emotion {id: "emptiness"})
CREATE (p)-[:ASSOCIATED_WITH {strength: "strong"}]->(e);

// Dissociation emotions
MATCH (p:ActivationPattern {id: "dissociation_overmodulation"}), (e:Emotion {id: "numbness"})
CREATE (p)-[:ASSOCIATED_WITH {strength: "strong", quality: "numb_but_alert"}]->(e);

// Rumination Loop emotions
MATCH (p:ActivationPattern {id: "rumination_loop"}), (e:Emotion {id: "sadness"})
CREATE (p)-[:ASSOCIATED_WITH {strength: "strong", subtype: "depressive_brooding"}]->(e);

MATCH (p:ActivationPattern {id: "rumination_loop"}), (e:Emotion {id: "anxiety"})
CREATE (p)-[:ASSOCIATED_WITH {strength: "moderate", subtype: "anxious_worry"}]->(e);

MATCH (p:ActivationPattern {id: "rumination_loop"}), (e:Emotion {id: "guilt"})
CREATE (p)-[:ASSOCIATED_WITH {strength: "moderate"}]->(e);

// Reward Drive Low emotions
MATCH (p:ActivationPattern {id: "reward_drive_low"}), (e:Emotion {id: "boredom"})
CREATE (p)-[:ASSOCIATED_WITH {strength: "strong"}]->(e);

MATCH (p:ActivationPattern {id: "reward_drive_low"}), (e:Emotion {id: "emptiness"})
CREATE (p)-[:ASSOCIATED_WITH {strength: "strong"}]->(e);

// Social Threat/Shame emotions
MATCH (p:ActivationPattern {id: "social_threat_shame"}), (e:Emotion {id: "hot_shame"})
CREATE (p)-[:ASSOCIATED_WITH {strength: "strong"}]->(e);

MATCH (p:ActivationPattern {id: "social_threat_shame"}), (e:Emotion {id: "cold_shame"})
CREATE (p)-[:ASSOCIATED_WITH {strength: "strong"}]->(e);

MATCH (p:ActivationPattern {id: "social_threat_shame"}), (e:Emotion {id: "guilt"})
CREATE (p)-[:ASSOCIATED_WITH {strength: "strong", subtype: "guilt"}]->(e);

MATCH (p:ActivationPattern {id: "social_threat_shame"}), (e:Emotion {id: "rejection"})
CREATE (p)-[:ASSOCIATED_WITH {strength: "strong", subtype: "social_rejection"}]->(e);


// ============================================================
// STEP 10: CREATE MODULATED_BY RELATIONSHIPS
// Any pattern can be modulated by any modulator
// ============================================================

// Sleep Loss affects all patterns
MATCH (p:ActivationPattern), (m:StateModulator {id: "sleep_loss_sensitization"})
WHERE p.id IN ["acute_alarm", "chronic_vigilance", "emotional_flooding", "rumination_loop", "social_threat_shame"]
CREATE (p)-[:MODULATED_BY {effect: "amplifies_pattern", toolSequencingChange: "address_sleep_first"}]->(m);

// Acute Stress affects prefrontal-dependent patterns
MATCH (p:ActivationPattern), (m:StateModulator {id: "acute_stress_catecholamine"})
WHERE p.id IN ["acute_alarm", "emotional_flooding", "rumination_loop"]
CREATE (p)-[:MODULATED_BY {effect: "degrades_top_down_control", toolSequencingChange: "reduce_stress_before_cognitive_tools"}]->(m);

// Interoceptive Threat Bias affects body-signal-sensitive patterns
MATCH (p:ActivationPattern), (m:StateModulator {id: "interoceptive_threat_bias"})
WHERE p.id IN ["acute_alarm", "conservation_freeze", "dissociation_overmodulation"]
CREATE (p)-[:MODULATED_BY {effect: "body_signals_interpreted_as_threats", toolSequencingChange: "interoceptive_recalibration"}]->(m);


// ============================================================
// STEP 11: CREATE TRIGGERS_SAFETY RELATIONSHIPS
// ============================================================

MATCH (p:ActivationPattern {id: "emotional_flooding"}), (s:SafetyFlag {id: "crisis_self_harm"})
CREATE (p)-[:TRIGGERS_SAFETY {condition: "out_of_control_with_intent_language", threshold: "immediate"}]->(s);

MATCH (p:ActivationPattern {id: "dissociation_overmodulation"}), (s:SafetyFlag {id: "crisis_suicidal"})
CREATE (p)-[:TRIGGERS_SAFETY {condition: "dissociation_plus_suicidal_ideation", threshold: "immediate"}]->(s);

MATCH (p:ActivationPattern {id: "dissociation_overmodulation"}), (s:SafetyFlag {id: "clinical_referral_severe_dissociation"})
CREATE (p)-[:TRIGGERS_SAFETY {condition: "cannot_orient_to_present", threshold: "immediate"}]->(s);

MATCH (p:ActivationPattern {id: "conservation_freeze"}), (s:SafetyFlag {id: "clinical_referral_shutdown"})
CREATE (p)-[:TRIGGERS_SAFETY {condition: "7_plus_consecutive_days", threshold: "persistent"}]->(s);

MATCH (p:ActivationPattern {id: "rumination_loop"}), (s:SafetyFlag {id: "crisis_suicidal"})
CREATE (p)-[:TRIGGERS_SAFETY {condition: "ruminative_content_involves_suicidal_ideation", threshold: "immediate"}]->(s);

MATCH (p:ActivationPattern {id: "reward_drive_low"}), (s:SafetyFlag {id: "clinical_referral_shutdown"})
CREATE (p)-[:TRIGGERS_SAFETY {condition: "pervasive_anhedonia_multiple_checkins", threshold: "persistent"}]->(s);


// ============================================================
// STEP 12: CREATE CAN_ESCALATE_TO RELATIONSHIPS
// ============================================================

// Social threat can escalate to reactive aggression
MATCH (p1:ActivationPattern {id: "social_threat_shame"}), (p2:ActivationPattern {id: "reactive_aggression"})
CREATE (p1)-[:CAN_ESCALATE_TO {mechanism: "regain_social_status", weight: "weak"}]->(p2);

// Conservation freeze rebound
MATCH (p1:ActivationPattern {id: "conservation_freeze"}), (p2:ActivationPattern {id: "acute_alarm"})
CREATE (p1)-[:CAN_ESCALATE_TO {mechanism: "rebound_from_pulling_out_too_quickly", weight: "moderate"}]->(p2);

// Acute alarm to flooding
MATCH (p1:ActivationPattern {id: "acute_alarm"}), (p2:ActivationPattern {id: "emotional_flooding"})
CREATE (p1)-[:CAN_ESCALATE_TO {mechanism: "regulatory_failure", weight: "moderate"}]->(p2);


// ============================================================
// STEP 13: LINK PATTERNS TO WINDOW OF TOLERANCE ZONES
// Cross-reference with existing WoT concepts
// ============================================================

MATCH (p:ActivationPattern {id: "acute_alarm"}), (wot:TherapyConcept {id: "wot_hyperarousal"})
CREATE (p)-[:MAPS_TO_WOT_ZONE {correspondence: "primary"}]->(wot);

MATCH (p:ActivationPattern {id: "chronic_vigilance"}), (wot:TherapyConcept {id: "wot_hyperarousal"})
CREATE (p)-[:MAPS_TO_WOT_ZONE {correspondence: "primary"}]->(wot);

MATCH (p:ActivationPattern {id: "emotional_flooding"}), (wot:TherapyConcept {id: "wot_hyperarousal"})
CREATE (p)-[:MAPS_TO_WOT_ZONE {correspondence: "extreme"}]->(wot);

MATCH (p:ActivationPattern {id: "conservation_freeze"}), (wot:TherapyConcept {id: "wot_hypoarousal"})
CREATE (p)-[:MAPS_TO_WOT_ZONE {correspondence: "primary"}]->(wot);

MATCH (p:ActivationPattern {id: "conservation_freeze"}), (wot:TherapyConcept {id: "wot_frozen_flight"})
CREATE (p)-[:MAPS_TO_WOT_ZONE {correspondence: "subtype_freeze_high_arousal"}]->(wot);

MATCH (p:ActivationPattern {id: "dissociation_overmodulation"}), (wot:TherapyConcept {id: "wot_hypoarousal"})
CREATE (p)-[:MAPS_TO_WOT_ZONE {correspondence: "distinct_mechanism"}]->(wot);


// ============================================================
// STEP 14: LINK PATTERNS TO POLYVAGAL STATES
// Cross-reference with existing Polyvagal concepts
// ============================================================

MATCH (p:ActivationPattern {id: "acute_alarm"}), (pv:TherapyConcept {id: "pv_sympathetic"})
CREATE (p)-[:CORRESPONDS_TO_ANS_STATE {evidence: "Strong"}]->(pv);

MATCH (p:ActivationPattern {id: "chronic_vigilance"}), (pv:TherapyConcept {id: "pv_sympathetic"})
CREATE (p)-[:CORRESPONDS_TO_ANS_STATE {evidence: "Strong", notes: "sustained_mobilization"}]->(pv);

MATCH (p:ActivationPattern {id: "emotional_flooding"}), (pv:TherapyConcept {id: "pv_sympathetic"})
CREATE (p)-[:CORRESPONDS_TO_ANS_STATE {evidence: "Strong", notes: "extreme_mobilization"}]->(pv);

// Note: conservation_freeze linked to PAG, NOT "dorsal vagal" per expert consensus
MATCH (p:ActivationPattern {id: "conservation_freeze"}), (pv:TherapyConcept {id: "pv_dorsal_vagal"})
CREATE (p)-[:CORRESPONDS_TO_ANS_STATE {evidence: "Moderate", notes: "use_PAG_centered_framing_not_polyvagal_language", caveat: "polyvagal_framing_contested_4_of_4_experts"}]->(pv);


// ============================================================
// STEP 15: CREATE UNIQUE CONSTRAINTS AND INDEXES
// Run these separately if needed
// ============================================================

// CREATE CONSTRAINT activation_pattern_id IF NOT EXISTS FOR (a:ActivationPattern) REQUIRE a.id IS UNIQUE;
// CREATE CONSTRAINT state_modulator_id IF NOT EXISTS FOR (s:StateModulator) REQUIRE s.id IS UNIQUE;
// CREATE CONSTRAINT safety_flag_id IF NOT EXISTS FOR (s:SafetyFlag) REQUIRE s.id IS UNIQUE;
// CREATE INDEX activation_pattern_evidence IF NOT EXISTS FOR (a:ActivationPattern) ON (a.evidenceGrade);
// CREATE INDEX activation_pattern_phase IF NOT EXISTS FOR (a:ActivationPattern) ON (a.phaseRelease);


// ============================================================
// END OF ACTIVATION PATTERN LAYER INCREMENTAL UPDATE
// ============================================================
