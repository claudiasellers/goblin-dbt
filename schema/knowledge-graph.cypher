// ============================================================
// GOBLIN DBT - KNOWLEDGE GRAPH SCHEMA v2
// A neuroscience-informed mental health knowledge base
// 
// Fixes applied from audit:
// - Fixed broken references (pcc, angular_gyrus, mindfulness)
// - Promoted inline nodes to top-level (motivation, rejection)
// - Renamed NeurotransmitterSystem → NeurochemicalSystem
// - Fixed DBT skill hierarchies
// - Connected orphaned nodes
// - Added cross-modality bridges
// - Restructured body sensation model
// - Added therapy modality concepts (EMDR, SE, MBCT, CPT)
//
// NODES ONLY. Converted to MERGE (A1-4): each node is `MERGE (v:Label {id})` + `SET v += {…}`,
// one self-contained statement, safe to re-run. Relationships live in relationships.cypher;
// constraints and indexes in constraints.cypher (loaded first). Never load this file alone
// (`--only knowledge-graph` refuses without --force): later files override some properties.
// ============================================================


// ============================================================
// BRAIN STRUCTURES - CORTICAL
// ============================================================

MERGE (pfc:BrainStructure {id: "pfc"})
SET pfc += {
  name: "Prefrontal Cortex",
  description: "Anterior part of the frontal lobes; executive control center",
  aliases: ["PFC"],
  level: "cortical"
};

MERGE (dlpfc:BrainStructure {id: "dlpfc"})
SET dlpfc += {
  name: "Dorsolateral Prefrontal Cortex",
  description: "Lateral portion of Brodmann areas 9 and 46; working memory, cognitive flexibility",
  aliases: ["dlPFC", "BA9/46"],
  level: "cortical"
};

MERGE (vmpfc:BrainStructure {id: "vmpfc"})
SET vmpfc += {
  name: "Ventromedial Prefrontal Cortex",
  description: "Medial surface of PFC; emotion regulation, value-based decision making, fear extinction",
  aliases: ["vmPFC"],
  level: "cortical"
};

MERGE (ofc:BrainStructure {id: "ofc"})
SET ofc += {
  name: "Orbitofrontal Cortex",
  description: "Above the orbits; reward processing, impulse control, social behavior",
  aliases: ["OFC"],
  level: "cortical"
};

MERGE (mpfc:BrainStructure {id: "mpfc"})
SET mpfc += {
  name: "Medial Prefrontal Cortex",
  description: "Medial surface of PFC; self-referential processing, social cognition, self-conscious emotions",
  aliases: ["mPFC"],
  level: "cortical"
};

MERGE (acc:BrainStructure {id: "acc"})
SET acc += {
  name: "Anterior Cingulate Cortex",
  description: "Frontal part of cingulate cortex; error detection, conflict monitoring, emotion",
  aliases: ["ACC"],
  level: "cortical"
};

MERGE (dacc:BrainStructure {id: "dacc"})
SET dacc += {
  name: "Dorsal Anterior Cingulate Cortex",
  description: "Cognitive division of ACC; error monitoring, cognitive control",
  aliases: ["dACC"],
  level: "cortical"
};

MERGE (vacc:BrainStructure {id: "vacc"})
SET vacc += {
  name: "Ventral Anterior Cingulate Cortex",
  description: "Affective division of ACC; emotional processing, autonomic regulation",
  aliases: ["vACC", "subgenual ACC", "sgACC"],
  level: "cortical"
};

MERGE (pcc:BrainStructure {id: "pcc"})
SET pcc += {
  name: "Posterior Cingulate Cortex",
  description: "Posterior part of cingulate cortex; self-referential thought, autobiographical memory, DMN hub",
  aliases: ["PCC"],
  level: "cortical"
};

MERGE (insula:BrainStructure {id: "insula"})
SET insula += {
  name: "Insula",
  description: "Deep within lateral sulcus; interoception, emotional awareness, empathy",
  aliases: ["insular cortex", "Island of Reil"],
  level: "cortical"
};

MERGE (anterior_insula:BrainStructure {id: "anterior_insula"})
SET anterior_insula += {
  name: "Anterior Insula",
  description: "Rostral insula; emotional awareness, subjective feelings, empathy, disgust",
  aliases: ["AI"],
  level: "cortical"
};

MERGE (posterior_insula:BrainStructure {id: "posterior_insula"})
SET posterior_insula += {
  name: "Posterior Insula",
  description: "Caudal insula; basic interoception, pain processing, temperature",
  aliases: ["PI"],
  level: "cortical"
};

MERGE (temporal_cortex:BrainStructure {id: "temporal_cortex"})
SET temporal_cortex += {
  name: "Temporal Cortex",
  description: "Lateral brain region; auditory processing, language comprehension, semantic memory",
  aliases: ["temporal lobe"],
  level: "cortical"
};

MERGE (angular_gyrus:BrainStructure {id: "angular_gyrus"})
SET angular_gyrus += {
  name: "Angular Gyrus",
  description: "Posterior parietal region; semantic processing, theory of mind, DMN component",
  aliases: ["AG", "BA39"],
  level: "cortical"
};

MERGE (parietal_cortex:BrainStructure {id: "parietal_cortex"})
SET parietal_cortex += {
  name: "Parietal Cortex",
  description: "Superior brain region; spatial processing, attention, body awareness",
  aliases: ["parietal lobe"],
  level: "cortical"
};

MERGE (somatosensory_cortex:BrainStructure {id: "somatosensory_cortex"})
SET somatosensory_cortex += {
  name: "Somatosensory Cortex",
  description: "Postcentral gyrus; body sensation, touch, proprioception, body map",
  aliases: ["S1", "primary somatosensory"],
  level: "cortical"
};

MERGE (motor_cortex:BrainStructure {id: "motor_cortex"})
SET motor_cortex += {
  name: "Motor Cortex",
  description: "Precentral gyrus; voluntary movement initiation and control",
  aliases: ["M1", "primary motor"],
  level: "cortical"
};

MERGE (fef:BrainStructure {id: "fef"})
SET fef += {
  name: "Frontal Eye Fields",
  description: "Prefrontal region controlling voluntary eye movements and visual attention",
  aliases: ["FEF"],
  level: "cortical"
};

MERGE (ips:BrainStructure {id: "ips"})
SET ips += {
  name: "Intraparietal Sulcus",
  description: "Parietal region for attention, eye movements, reaching",
  aliases: ["IPS"],
  level: "cortical"
};

MERGE (tpj:BrainStructure {id: "tpj"})
SET tpj += {
  name: "Temporoparietal Junction",
  description: "Junction of temporal and parietal lobes; theory of mind, attention reorienting",
  aliases: ["TPJ"],
  level: "cortical"
};


// ============================================================
// BRAIN STRUCTURES - SUBCORTICAL
// ============================================================

MERGE (amygdala:BrainStructure {id: "amygdala"})
SET amygdala += {
  name: "Amygdala",
  description: "Almond-shaped nuclei in temporal lobes; fear, threat detection, emotional memory",
  aliases: ["amygdaloid complex"],
  level: "subcortical"
};

MERGE (bla:BrainStructure {id: "bla"})
SET bla += {
  name: "Basolateral Amygdala",
  description: "Receives sensory input; fear learning and memory consolidation",
  aliases: ["BLA"],
  level: "subcortical"
};

MERGE (cea:BrainStructure {id: "cea"})
SET cea += {
  name: "Central Amygdala",
  description: "Output nucleus; orchestrates fear responses via brainstem",
  aliases: ["CeA"],
  level: "subcortical"
};

MERGE (hippocampus:BrainStructure {id: "hippocampus"})
SET hippocampus += {
  name: "Hippocampus",
  description: "Seahorse-shaped structure; memory formation, spatial navigation, contextual processing",
  aliases: ["hippo"],
  level: "subcortical"
};

MERGE (hypothalamus:BrainStructure {id: "hypothalamus"})
SET hypothalamus += {
  name: "Hypothalamus",
  description: "Below thalamus; homeostasis, stress response (HPA axis), autonomic control",
  aliases: [],
  level: "subcortical"
};

MERGE (thalamus:BrainStructure {id: "thalamus"})
SET thalamus += {
  name: "Thalamus",
  description: "Relay station for sensory and motor signals to cortex; attentional gating",
  aliases: [],
  level: "subcortical"
};

MERGE (basal_ganglia:BrainStructure {id: "basal_ganglia"})
SET basal_ganglia += {
  name: "Basal Ganglia",
  description: "Group of nuclei; motor control, habit formation, procedural learning, reward",
  aliases: ["striatum complex"],
  level: "subcortical"
};

MERGE (nucleus_accumbens:BrainStructure {id: "nucleus_accumbens"})
SET nucleus_accumbens += {
  name: "Nucleus Accumbens",
  description: "Ventral striatum; reward, motivation, pleasure, addiction",
  aliases: ["NAcc", "NAc"],
  level: "subcortical"
};

MERGE (bed_nucleus:BrainStructure {id: "bnst"})
SET bed_nucleus += {
  name: "Bed Nucleus of the Stria Terminalis",
  description: "Extended amygdala; sustained/anticipatory anxiety (vs acute fear in amygdala)",
  aliases: ["BNST"],
  level: "subcortical"
};


// ============================================================
// BRAIN STRUCTURES - BRAINSTEM
// ============================================================

MERGE (vta:BrainStructure {id: "vta"})
SET vta += {
  name: "Ventral Tegmental Area",
  description: "Midbrain dopamine source; reward, motivation, reinforcement learning",
  aliases: ["VTA"],
  level: "brainstem"
};

MERGE (periaqueductal_gray:BrainStructure {id: "pag"})
SET periaqueductal_gray += {
  name: "Periaqueductal Gray",
  description: "Midbrain; pain modulation, defensive behaviors, panic responses, autonomic control",
  aliases: ["PAG"],
  level: "brainstem"
};

MERGE (locus_coeruleus:BrainStructure {id: "locus_coeruleus"})
SET locus_coeruleus += {
  name: "Locus Coeruleus",
  description: "Brainstem norepinephrine source; arousal, attention, stress response, vigilance",
  aliases: ["LC"],
  level: "brainstem"
};

MERGE (raphe_nuclei:BrainStructure {id: "raphe_nuclei"})
SET raphe_nuclei += {
  name: "Raphe Nuclei",
  description: "Brainstem serotonin source; mood, sleep, anxiety regulation",
  aliases: ["raphe"],
  level: "brainstem"
};


// ============================================================
// FUNCTIONAL NETWORKS
// ============================================================

MERGE (dmn:FunctionalNetwork {id: "dmn"})
SET dmn += {
  name: "Default Mode Network",
  description: "Active during rest, self-referential thought, mind-wandering, autobiographical memory",
  aliases: ["DMN", "task-negative network"]
};

MERGE (salience:FunctionalNetwork {id: "salience_network"})
SET salience += {
  name: "Salience Network",
  description: "Detects and filters salient stimuli, switches between DMN and CEN",
  aliases: ["SN"]
};

MERGE (cen:FunctionalNetwork {id: "cen"})
SET cen += {
  name: "Central Executive Network",
  description: "Goal-directed behavior, working memory, decision making, cognitive control",
  aliases: ["CEN", "frontoparietal network", "task-positive network"]
};

MERGE (limbic_network:FunctionalNetwork {id: "limbic_network"})
SET limbic_network += {
  name: "Limbic Network",
  description: "Emotional processing, memory, motivation",
  aliases: ["affective network"]
};

MERGE (sensorimotor_network:FunctionalNetwork {id: "sensorimotor_network"})
SET sensorimotor_network += {
  name: "Sensorimotor Network",
  description: "Motor execution and sensory processing",
  aliases: ["SMN"]
};

MERGE (dan:FunctionalNetwork {id: "dan"})
SET dan += {
  name: "Dorsal Attention Network",
  description: "Top-down attentional control, goal-directed attention",
  aliases: ["DAN"]
};

MERGE (van:FunctionalNetwork {id: "van"})
SET van += {
  name: "Ventral Attention Network",
  description: "Bottom-up attention, detecting unexpected/salient stimuli",
  aliases: ["VAN"]
};


// ============================================================
// NEUROCHEMICAL SYSTEMS
// (Renamed from NeurotransmitterSystem for accuracy)
// ============================================================

MERGE (dopamine:NeurochemicalSystem {id: "dopamine"})
SET dopamine += {
  name: "Dopamine System",
  molecule: "Dopamine",
  type: "monoamine_neurotransmitter",
  abbreviation: "DA",
  functions: ["reward", "motivation", "movement", "learning", "salience"]
};

MERGE (serotonin:NeurochemicalSystem {id: "serotonin"})
SET serotonin += {
  name: "Serotonin System",
  molecule: "Serotonin",
  type: "monoamine_neurotransmitter",
  abbreviation: "5-HT",
  functions: ["mood", "anxiety", "sleep", "appetite", "impulse control"]
};

MERGE (norepinephrine:NeurochemicalSystem {id: "norepinephrine"})
SET norepinephrine += {
  name: "Norepinephrine System",
  molecule: "Norepinephrine",
  type: "monoamine_neurotransmitter",
  abbreviation: "NE",
  functions: ["arousal", "attention", "stress response", "fight-or-flight"]
};

MERGE (gaba:NeurochemicalSystem {id: "gaba"})
SET gaba += {
  name: "GABA System",
  molecule: "Gamma-Aminobutyric Acid",
  type: "inhibitory_neurotransmitter",
  abbreviation: "GABA",
  functions: ["inhibition", "anxiety reduction", "sleep", "muscle relaxation"]
};

MERGE (glutamate:NeurochemicalSystem {id: "glutamate"})
SET glutamate += {
  name: "Glutamate System",
  molecule: "Glutamate",
  type: "excitatory_neurotransmitter",
  abbreviation: "Glu",
  functions: ["excitation", "learning", "memory", "synaptic plasticity", "LTP"]
};

MERGE (acetylcholine:NeurochemicalSystem {id: "acetylcholine"})
SET acetylcholine += {
  name: "Acetylcholine System",
  molecule: "Acetylcholine",
  type: "neurotransmitter",
  abbreviation: "ACh",
  functions: ["attention", "memory", "arousal", "muscle activation", "REM sleep"]
};

MERGE (endorphin:NeurochemicalSystem {id: "endorphin"})
SET endorphin += {
  name: "Endorphin System",
  molecule: "Beta-Endorphin",
  type: "opioid_peptide",
  abbreviation: "β-endorphin",
  functions: ["pain relief", "pleasure", "stress reduction", "reward", "runners high"]
};

MERGE (oxytocin:NeurochemicalSystem {id: "oxytocin"})
SET oxytocin += {
  name: "Oxytocin System",
  molecule: "Oxytocin",
  type: "neuropeptide",
  abbreviation: "OT",
  functions: ["social bonding", "trust", "attachment", "stress reduction", "lactation"]
};

MERGE (cortisol:NeurochemicalSystem {id: "cortisol"})
SET cortisol += {
  name: "HPA Axis / Cortisol",
  molecule: "Cortisol",
  type: "glucocorticoid_hormone",
  abbreviation: "CORT",
  functions: ["stress response", "metabolism", "immune modulation", "arousal", "memory consolidation"]
};


// ============================================================
// EMOTIONS / AFFECTIVE STATES
// ============================================================

// --- High Energy Unpleasant ---
MERGE (fear:Emotion {id: "fear"})
SET fear += {
  name: "Fear",
  description: "Response to perceived immediate threat or danger",
  valence: "negative",
  arousal: "high",
  quadrant: "high-unpleasant"
};

MERGE (anxiety:Emotion {id: "anxiety"})
SET anxiety += {
  name: "Anxiety",
  description: "Apprehension about future uncertain threat",
  valence: "negative",
  arousal: "high",
  quadrant: "high-unpleasant"
};

MERGE (anger:Emotion {id: "anger"})
SET anger += {
  name: "Anger",
  description: "Response to perceived threat, injustice, or blocked goals",
  valence: "negative",
  arousal: "high",
  quadrant: "high-unpleasant"
};

MERGE (panic:Emotion {id: "panic"})
SET panic += {
  name: "Panic",
  description: "Intense fear with strong physiological arousal",
  valence: "negative",
  arousal: "very_high",
  quadrant: "high-unpleasant"
};

MERGE (frustration:Emotion {id: "frustration"})
SET frustration += {
  name: "Frustration",
  description: "Feeling of being upset due to blocked goals",
  valence: "negative",
  arousal: "high",
  quadrant: "high-unpleasant"
};

MERGE (overwhelm:Emotion {id: "overwhelm"})
SET overwhelm += {
  name: "Overwhelm",
  description: "Feeling of being unable to cope with demands",
  valence: "negative",
  arousal: "high",
  quadrant: "high-unpleasant"
};

MERGE (irritation:Emotion {id: "irritation"})
SET irritation += {
  name: "Irritation",
  description: "Mild anger or annoyance",
  valence: "negative",
  arousal: "moderate_high",
  quadrant: "high-unpleasant"
};

MERGE (stress:Emotion {id: "stress"})
SET stress += {
  name: "Stress",
  description: "Mental or emotional strain from demanding circumstances",
  valence: "negative",
  arousal: "high",
  quadrant: "high-unpleasant"
};

MERGE (hot_shame:Emotion {id: "hot_shame"})
SET hot_shame += {
  name: "Hot Shame",
  description: "Acute shame with high arousal - flushing, wanting to flee or hide",
  valence: "negative",
  arousal: "high",
  quadrant: "high-unpleasant"
};

MERGE (rejection:Emotion {id: "rejection"})
SET rejection += {
  name: "Rejection",
  description: "Painful feeling of being excluded or unwanted",
  valence: "negative",
  arousal: "moderate_high",
  quadrant: "high-unpleasant"
};

MERGE (angsty:Emotion {id: "angsty"})
SET angsty += {
  name: "Angsty",
  description: "Restless dissatisfaction, feeling rebellious or contrary, wanting to push against expectations or constraints",
  valence: "negative",
  arousal: "moderate_high",
  quadrant: "high-unpleasant"
};

// --- Low Energy Unpleasant ---
MERGE (sadness:Emotion {id: "sadness"})
SET sadness += {
  name: "Sadness",
  description: "Response to loss, disappointment, or helplessness",
  valence: "negative",
  arousal: "low",
  quadrant: "low-unpleasant"
};

MERGE (cold_shame:Emotion {id: "cold_shame"})
SET cold_shame += {
  name: "Cold Shame",
  description: "Internalized shame with low arousal - collapse, withdrawal, worthlessness; global negative self-evaluation",
  valence: "negative",
  arousal: "low",
  quadrant: "low-unpleasant",
  evaluative_focus: "Global Self ('I am defective')",
  action_tendency: "hiding, withdrawal, submission",
  trait_vulnerability_marker: true,
  clinical_note: "Hypersensitivity persists even in MDD remission - trait marker for depression"
};

MERGE (guilt:Emotion {id: "guilt"})
SET guilt += {
  name: "Guilt",
  description: "Feeling of responsibility for wrongdoing; behavior-specific and other-oriented",
  valence: "negative",
  arousal: "low_to_moderate",
  quadrant: "low-unpleasant",
  evaluative_focus: "Specific Behavior ('I did something wrong')",
  action_tendency: "reparation, apology, prosocial behavior",
  social_orientation: "other-focused",
  clinical_note: "Often adaptive; increases empathic concern; maladaptive when ruminative"
};

MERGE (loneliness:Emotion {id: "loneliness"})
SET loneliness += {
  name: "Loneliness",
  description: "Painful feeling of social disconnection",
  valence: "negative",
  arousal: "low",
  quadrant: "low-unpleasant"
};

MERGE (hopelessness:Emotion {id: "hopelessness"})
SET hopelessness += {
  name: "Hopelessness",
  description: "Feeling that nothing will improve",
  valence: "negative",
  arousal: "low",
  quadrant: "low-unpleasant"
};

MERGE (emptiness:Emotion {id: "emptiness"})
SET emptiness += {
  name: "Emptiness",
  description: "Feeling of void or meaninglessness",
  valence: "negative",
  arousal: "low",
  quadrant: "low-unpleasant"
};

MERGE (numbness:Emotion {id: "numbness"})
SET numbness += {
  name: "Numbness",
  description: "Emotional blunting or disconnection from feelings",
  valence: "negative",
  arousal: "low",
  quadrant: "low-unpleasant"
};

MERGE (disgust:Emotion {id: "disgust"})
SET disgust += {
  name: "Disgust",
  description: "Revulsion response to offensive stimuli",
  valence: "negative",
  arousal: "moderate",
  quadrant: "low-unpleasant"
};

MERGE (boredom:Emotion {id: "boredom"})
SET boredom += {
  name: "Boredom",
  description: "Restless dissatisfaction from lack of engagement",
  valence: "negative",
  arousal: "low",
  quadrant: "low-unpleasant"
};

MERGE (disappointment:Emotion {id: "disappointment"})
SET disappointment += {
  name: "Disappointment",
  description: "Sadness from unmet expectations",
  valence: "negative",
  arousal: "low_to_moderate",
  quadrant: "low-unpleasant"
};

// --- High Energy Pleasant ---
MERGE (joy:Emotion {id: "joy"})
SET joy += {
  name: "Joy",
  description: "Intense happiness and delight",
  valence: "positive",
  arousal: "high",
  quadrant: "high-pleasant"
};

MERGE (excitement:Emotion {id: "excitement"})
SET excitement += {
  name: "Excitement",
  description: "Eager anticipation and enthusiasm",
  valence: "positive",
  arousal: "high",
  quadrant: "high-pleasant"
};

MERGE (curiosity:Emotion {id: "curiosity"})
SET curiosity += {
  name: "Curiosity",
  description: "Desire to learn or know more",
  valence: "positive",
  arousal: "moderate_high",
  quadrant: "high-pleasant"
};

MERGE (pride:Emotion {id: "pride"})
SET pride += {
  name: "Pride",
  description: "Satisfaction from one's achievements",
  valence: "positive",
  arousal: "moderate_high",
  quadrant: "high-pleasant"
};

MERGE (enthusiasm:Emotion {id: "enthusiasm"})
SET enthusiasm += {
  name: "Enthusiasm",
  description: "Intense enjoyment and interest",
  valence: "positive",
  arousal: "high",
  quadrant: "high-pleasant"
};

MERGE (hope:Emotion {id: "hope"})
SET hope += {
  name: "Hope",
  description: "Expectation of positive future outcomes",
  valence: "positive",
  arousal: "moderate_high",
  quadrant: "high-pleasant"
};

MERGE (inspiration:Emotion {id: "inspiration"})
SET inspiration += {
  name: "Inspiration",
  description: "Feeling mentally stimulated to create or act",
  valence: "positive",
  arousal: "high",
  quadrant: "high-pleasant"
};

MERGE (amusement:Emotion {id: "amusement"})
SET amusement += {
  name: "Amusement",
  description: "Light-hearted pleasure, often with laughter",
  valence: "positive",
  arousal: "moderate_high",
  quadrant: "high-pleasant"
};

// --- Low Energy Pleasant ---
MERGE (calm:Emotion {id: "calm"})
SET calm += {
  name: "Calm",
  description: "Peaceful, untroubled state",
  valence: "positive",
  arousal: "low",
  quadrant: "low-pleasant"
};

MERGE (contentment:Emotion {id: "contentment"})
SET contentment += {
  name: "Contentment",
  description: "Satisfied acceptance of circumstances",
  valence: "positive",
  arousal: "low",
  quadrant: "low-pleasant"
};

MERGE (gratitude:Emotion {id: "gratitude"})
SET gratitude += {
  name: "Gratitude",
  description: "Appreciation for what one has received",
  valence: "positive",
  arousal: "low_to_moderate",
  quadrant: "low-pleasant"
};

MERGE (love:Emotion {id: "love"})
SET love += {
  name: "Love",
  description: "Deep affection and attachment",
  valence: "positive",
  arousal: "variable",
  quadrant: "low-pleasant"
};

MERGE (compassion:Emotion {id: "compassion"})
SET compassion += {
  name: "Compassion",
  description: "Concern for others' suffering with desire to help",
  valence: "positive",
  arousal: "low_to_moderate",
  quadrant: "low-pleasant"
};

MERGE (serenity:Emotion {id: "serenity"})
SET serenity += {
  name: "Serenity",
  description: "Deep peace and tranquility",
  valence: "positive",
  arousal: "low",
  quadrant: "low-pleasant"
};

MERGE (safety:Emotion {id: "safety"})
SET safety += {
  name: "Safety",
  description: "Feeling of security and protection",
  valence: "positive",
  arousal: "low",
  quadrant: "low-pleasant"
};

MERGE (relief:Emotion {id: "relief"})
SET relief += {
  name: "Relief",
  description: "Removal of distress or anxiety",
  valence: "positive",
  arousal: "decreasing",
  quadrant: "low-pleasant"
};

MERGE (trust:Emotion {id: "trust"})
SET trust += {
  name: "Trust",
  description: "Confident reliance on others",
  valence: "positive",
  arousal: "low",
  quadrant: "low-pleasant"
};


// ============================================================
// BODY REGIONS: moved to scripts/body-map/content.py (REGION_NAMES) → schema/body-map.cypher, on the
// 15 places the body step uses (Oct 2026).
// ============================================================

// ============================================================
// SENSATION TYPES
// (Removed related_emotions property - using graph edges instead)
// ============================================================

MERGE (tension:SensationType {id: "tension"})
SET tension += {
  name: "Tension/Tightness",
  description: "Muscular contraction or constriction"
};

MERGE (heaviness:SensationType {id: "heaviness"})
SET heaviness += {
  name: "Heaviness",
  description: "Feeling of weight or burden"
};

MERGE (lightness:SensationType {id: "lightness"})
SET lightness += {
  name: "Lightness",
  description: "Feeling of weightlessness or ease"
};

MERGE (heat:SensationType {id: "heat"})
SET heat += {
  name: "Heat/Warmth",
  description: "Sensation of increased temperature"
};

MERGE (cold_sensation:SensationType {id: "cold_sensation"})
SET cold_sensation += {
  name: "Cold/Chills",
  description: "Sensation of decreased temperature"
};

MERGE (numbness_sensation:SensationType {id: "numbness_sensation"})
SET numbness_sensation += {
  name: "Numbness/Tingling",
  description: "Reduced sensation or pins-and-needles"
};

MERGE (pressure:SensationType {id: "pressure"})
SET pressure += {
  name: "Pressure",
  description: "Sensation of being pressed upon"
};

MERGE (butterflies:SensationType {id: "butterflies"})
SET butterflies += {
  name: "Butterflies/Fluttering",
  description: "Light, fluttery sensation often in stomach"
};

MERGE (racing_heart:SensationType {id: "racing_heart"})
SET racing_heart += {
  name: "Racing Heart",
  description: "Rapid or pounding heartbeat"
};

MERGE (constriction:SensationType {id: "constriction"})
SET constriction += {
  name: "Constriction",
  description: "Feeling of narrowing or closing"
};

MERGE (expansion:SensationType {id: "expansion"})
SET expansion += {
  name: "Expansion/Openness",
  description: "Feeling of opening or broadening"
};

MERGE (shaking:SensationType {id: "shaking"})
SET shaking += {
  name: "Shaking/Trembling",
  description: "Involuntary tremors"
};

MERGE (weakness:SensationType {id: "weakness"})
SET weakness += {
  name: "Weakness",
  description: "Feeling of reduced strength or stability"
};

MERGE (restlessness:SensationType {id: "restlessness"})
SET restlessness += {
  name: "Restlessness",
  description: "Inability to be still, urge to move"
};

MERGE (groundedness:SensationType {id: "groundedness"})
SET groundedness += {
  name: "Groundedness",
  description: "Feeling of stability and connection to ground"
};


// ============================================================
// THERAPEUTIC MODALITIES
// ============================================================

MERGE (ifs:TherapyModality {id: "ifs"})
SET ifs += {
  name: "Internal Family Systems",
  abbreviation: "IFS",
  founder: "Richard Schwartz",
  description: "Model of psychotherapy based on subpersonalities or 'parts'",
  core_assumptions: [
    "The mind is naturally multiple",
    "Everyone has a Self",
    "All parts have good intentions",
    "Parts take on extreme roles to protect"
  ]
};

MERGE (dbt:TherapyModality {id: "dbt"})
SET dbt += {
  name: "Dialectical Behavior Therapy",
  abbreviation: "DBT",
  founder: "Marsha Linehan",
  description: "Cognitive-behavioral treatment combining change and acceptance strategies",
  modules: ["Mindfulness", "Distress Tolerance", "Emotion Regulation", "Interpersonal Effectiveness"]
};

MERGE (cbt:TherapyModality {id: "cbt"})
SET cbt += {
  name: "Cognitive Behavioral Therapy",
  abbreviation: "CBT",
  founder: "Aaron Beck",
  description: "Structured therapy focusing on relationship between thoughts, feelings, behaviors"
};

MERGE (act:TherapyModality {id: "act"})
SET act += {
  name: "Acceptance and Commitment Therapy",
  abbreviation: "ACT",
  founder: "Steven Hayes",
  description: "Uses acceptance and mindfulness strategies alongside commitment to values-based action"
};

MERGE (emdr:TherapyModality {id: "emdr"})
SET emdr += {
  name: "Eye Movement Desensitization and Reprocessing",
  abbreviation: "EMDR",
  founder: "Francine Shapiro",
  description: "Therapy using bilateral stimulation to process traumatic memories"
};

MERGE (somatic_experiencing:TherapyModality {id: "se"})
SET somatic_experiencing += {
  name: "Somatic Experiencing",
  abbreviation: "SE",
  founder: "Peter Levine",
  description: "Body-oriented approach to healing trauma by completing defensive responses"
};

MERGE (cpt:TherapyModality {id: "cpt"})
SET cpt += {
  name: "Cognitive Processing Therapy",
  abbreviation: "CPT",
  founder: "Patricia Resick",
  description: "Trauma-focused therapy addressing stuck points and cognitive distortions about trauma"
};

MERGE (mbct:TherapyModality {id: "mbct"})
SET mbct += {
  name: "Mindfulness-Based Cognitive Therapy",
  abbreviation: "MBCT",
  founder: "Zindel Segal, Mark Williams, John Teasdale",
  description: "Combines mindfulness meditation with cognitive therapy for depression relapse prevention"
};

MERGE (polyvagal:TherapyModality {id: "polyvagal"})
SET polyvagal += {
  name: "Polyvagal Theory",
  abbreviation: "PVT",
  founder: "Stephen Porges",
  description: "Framework for understanding the autonomic nervous system and its role in safety and connection"
};


// ============================================================
// IFS CONCEPTS
// ============================================================

MERGE (exile:TherapyConcept {id: "ifs_exile"})
SET exile += {
  name: "Exile",
  description: "Young parts carrying pain, trauma, shame—often hidden away by protectors",
  modality: "IFS",
  role: "wounded_part"
};

MERGE (firefighter:TherapyConcept {id: "ifs_firefighter"})
SET firefighter += {
  name: "Firefighter",
  description: "Reactive protector parts that act impulsively to extinguish emotional pain",
  modality: "IFS",
  role: "reactive_protector",
  common_behaviors: ["substance use", "self-harm", "binge eating", "dissociation", "rage"]
};

MERGE (manager_ifs:TherapyConcept {id: "ifs_manager"})
SET manager_ifs += {
  name: "Manager",
  description: "Proactive protector parts that try to control and prevent pain",
  modality: "IFS",
  role: "proactive_protector",
  common_behaviors: ["perfectionism", "people-pleasing", "overworking", "controlling", "caretaking"]
};

MERGE (self_energy:TherapyConcept {id: "ifs_self"})
SET self_energy += {
  name: "Self",
  description: "Core, undamaged essence characterized by the 8 C's; neurobiologically corresponds to mPFC activation and ventral vagal tone",
  modality: "IFS",
  role: "core_self",
  qualities: ["Curiosity", "Calm", "Clarity", "Compassion", "Confidence", "Courage", "Creativity", "Connectedness"],
  neurochemical_markers: ["serotonin", "oxytocin"],
  physiological_correlate: "ventral_vagal_tone",
  neural_hub: "mPFC",
  mechanism: "mPFC sends inhibitory signals to amygdala, quieting alarm system and enabling CEN activation"
};

MERGE (protector:TherapyConcept {id: "ifs_protector"})
SET protector += {
  name: "Protector",
  description: "Parts that protect the system from exile pain (managers and firefighters)",
  modality: "IFS",
  role: "protector"
};

MERGE (unburdening:TherapyConcept {id: "ifs_unburdening"})
SET unburdening += {
  name: "Unburdening",
  description: "Process of releasing extreme beliefs and emotions from exiled parts",
  modality: "IFS",
  process_type: "healing"
};

MERGE (blending:TherapyConcept {id: "ifs_blending"})
SET blending += {
  name: "Blending",
  description: "When a part's feelings or beliefs take over, and we lose Self-leadership",
  modality: "IFS"
};

MERGE (unblending:TherapyConcept {id: "ifs_unblending"})
SET unblending += {
  name: "Unblending",
  description: "Creating separation between Self and parts to restore perspective",
  modality: "IFS"
};

MERGE (trailhead:TherapyConcept {id: "ifs_trailhead"})
SET trailhead += {
  name: "Trailhead",
  description: "Entry point for accessing parts—a feeling, thought, sensation, or image",
  modality: "IFS"
};


// ============================================================
// DBT CONCEPTS - MODULE CONTAINERS
// ============================================================

MERGE (dbt_mindfulness:TherapyConcept {id: "dbt_mindfulness_module"})
SET dbt_mindfulness += {
  name: "Mindfulness Module",
  description: "Core DBT module teaching present-moment awareness and wise mind",
  modality: "DBT",
  module_type: "core"
};

MERGE (distress_tolerance:TherapyConcept {id: "dbt_distress_tolerance"})
SET distress_tolerance += {
  name: "Distress Tolerance Module",
  description: "Skills for surviving crisis without making it worse",
  modality: "DBT",
  module_type: "core"
};

MERGE (emotion_regulation_module:TherapyConcept {id: "dbt_emotion_regulation_module"})
SET emotion_regulation_module += {
  name: "Emotion Regulation Module",
  description: "Skills for understanding and changing emotional responses",
  modality: "DBT",
  module_type: "core"
};

MERGE (interpersonal_effectiveness:TherapyConcept {id: "dbt_interpersonal_effectiveness"})
SET interpersonal_effectiveness += {
  name: "Interpersonal Effectiveness Module",
  description: "Skills for maintaining relationships while meeting needs",
  modality: "DBT",
  module_type: "core"
};


// ============================================================
// DBT CONCEPTS - MINDFULNESS SKILLS
// ============================================================

MERGE (wise_mind:TherapyConcept {id: "dbt_wise_mind"})
SET wise_mind += {
  name: "Wise Mind",
  description: "Integration of emotional mind and reasonable mind; intuitive knowing",
  modality: "DBT",
  module: "Mindfulness",
  skill_type: "state"
};

MERGE (emotional_mind:TherapyConcept {id: "dbt_emotional_mind"})
SET emotional_mind += {
  name: "Emotional Mind",
  description: "State where emotions control thoughts and behavior",
  modality: "DBT",
  module: "Mindfulness",
  skill_type: "state"
};

MERGE (reasonable_mind:TherapyConcept {id: "dbt_reasonable_mind"})
SET reasonable_mind += {
  name: "Reasonable Mind",
  description: "State of cool, rational, task-focused thinking",
  modality: "DBT",
  module: "Mindfulness",
  skill_type: "state"
};

MERGE (observe:TherapyConcept {id: "dbt_observe"})
SET observe += {
  name: "Observe",
  description: "Notice without getting caught up; wordless watching",
  modality: "DBT",
  module: "Mindfulness",
  skill_type: "what_skill"
};

MERGE (describe:TherapyConcept {id: "dbt_describe"})
SET describe += {
  name: "Describe",
  description: "Put words on experience; label what is observed",
  modality: "DBT",
  module: "Mindfulness",
  skill_type: "what_skill"
};

MERGE (participate:TherapyConcept {id: "dbt_participate"})
SET participate += {
  name: "Participate",
  description: "Enter into experience fully; become one with the activity",
  modality: "DBT",
  module: "Mindfulness",
  skill_type: "what_skill"
};

MERGE (nonjudgmental:TherapyConcept {id: "dbt_nonjudgmental"})
SET nonjudgmental += {
  name: "Non-judgmentally",
  description: "See without evaluating as good or bad; stick to facts",
  modality: "DBT",
  module: "Mindfulness",
  skill_type: "how_skill"
};

MERGE (one_mindfully:TherapyConcept {id: "dbt_one_mindfully"})
SET one_mindfully += {
  name: "One-Mindfully",
  description: "Do one thing at a time; focus attention on present moment",
  modality: "DBT",
  module: "Mindfulness",
  skill_type: "how_skill"
};

MERGE (effectively:TherapyConcept {id: "dbt_effectively"})
SET effectively += {
  name: "Effectively",
  description: "Focus on what works; play by the rules; let go of being right",
  modality: "DBT",
  module: "Mindfulness",
  skill_type: "how_skill"
};


// ============================================================
// DBT CONCEPTS - DISTRESS TOLERANCE SKILLS
// ============================================================

MERGE (tipp:TherapyConcept {id: "dbt_tipp"})
SET tipp += {
  name: "TIPP",
  description: "Temperature, Intense exercise, Paced breathing, Paired muscle relaxation",
  modality: "DBT",
  module: "Distress Tolerance",
  skill_type: "crisis_survival",
  mechanism: "changes body chemistry to reduce extreme emotion quickly"
};

MERGE (stop_skill:TherapyConcept {id: "dbt_stop"})
SET stop_skill += {
  name: "STOP",
  description: "Stop, Take a step back, Observe, Proceed mindfully",
  modality: "DBT",
  module: "Distress Tolerance",
  skill_type: "crisis_survival"
};

MERGE (accepts:TherapyConcept {id: "dbt_accepts"})
SET accepts += {
  name: "ACCEPTS",
  description: "Activities, Contributing, Comparisons, Emotions, Pushing away, Thoughts, Sensations",
  modality: "DBT",
  module: "Distress Tolerance",
  skill_type: "distraction"
};

MERGE (improve:TherapyConcept {id: "dbt_improve"})
SET improve += {
  name: "IMPROVE",
  description: "Imagery, Meaning, Prayer, Relaxation, One thing, Vacation, Encouragement",
  modality: "DBT",
  module: "Distress Tolerance",
  skill_type: "self_soothing"
};

MERGE (pros_cons:TherapyConcept {id: "dbt_pros_cons"})
SET pros_cons += {
  name: "Pros and Cons",
  description: "Weighing pros and cons of tolerating vs not tolerating distress",
  modality: "DBT",
  module: "Distress Tolerance",
  skill_type: "decision_making"
};

MERGE (radical_acceptance:TherapyConcept {id: "dbt_radical_acceptance"})
SET radical_acceptance += {
  name: "Radical Acceptance",
  description: "Fully accepting reality as it is, without approval or resignation",
  modality: "DBT",
  module: "Distress Tolerance",
  skill_type: "reality_acceptance"
};

MERGE (turning_the_mind:TherapyConcept {id: "dbt_turning_mind"})
SET turning_the_mind += {
  name: "Turning the Mind",
  description: "Choosing to accept reality over and over",
  modality: "DBT",
  module: "Distress Tolerance",
  skill_type: "reality_acceptance"
};

MERGE (willingness:TherapyConcept {id: "dbt_willingness"})
SET willingness += {
  name: "Willingness",
  description: "Doing just what is needed in each situation; opposite of willfulness",
  modality: "DBT",
  module: "Distress Tolerance",
  skill_type: "reality_acceptance"
};

MERGE (half_smile:TherapyConcept {id: "dbt_half_smile"})
SET half_smile += {
  name: "Half-Smile",
  description: "Relaxing face with slight smile to influence mood",
  modality: "DBT",
  module: "Distress Tolerance",
  skill_type: "body_based"
};

MERGE (willing_hands:TherapyConcept {id: "dbt_willing_hands"})
SET willing_hands += {
  name: "Willing Hands",
  description: "Relaxing hands with palms up to signal acceptance",
  modality: "DBT",
  module: "Distress Tolerance",
  skill_type: "body_based"
};

MERGE (alternate_rebellion:TherapyConcept {id: "dbt_alternate_rebellion"})
SET alternate_rebellion += {
  name: "Alternate Rebellion",
  description: "Finding non-destructive ways to rebel when feeling controlled or wanting to act against expectations; channel rebellious urges into harmless or even positive actions",
  modality: "DBT",
  module: "Distress Tolerance",
  skill_type: "crisis_survival",
  whenToUse: "When feeling controlled, wanting to defy expectations, or having urges to do something destructive just to rebel"
};


// ============================================================
// DBT CONCEPTS - EMOTION REGULATION SKILLS
// ============================================================

MERGE (reducing_vulnerability:TherapyConcept {id: "dbt_reducing_vulnerability"})
SET reducing_vulnerability += {
  name: "Reducing Vulnerability",
  description: "Skills for reducing vulnerability to negative emotions",
  modality: "DBT",
  module: "Emotion Regulation",
  skill_type: "container"
};

MERGE (abc_please:TherapyConcept {id: "dbt_abc_please"})
SET abc_please += {
  name: "ABC PLEASE",
  description: "Accumulate positives, Build mastery, Cope ahead + treat PhysicaL illness, balance Eating, avoid mood-Altering drugs, balance Sleep, get Exercise",
  modality: "DBT",
  module: "Emotion Regulation",
  skill_type: "reducing_vulnerability"
};

MERGE (accumulate_positives:TherapyConcept {id: "dbt_accumulate_positives"})
SET accumulate_positives += {
  name: "Accumulate Positive Experiences",
  description: "Build a life worth living through pleasant activities and long-term goals",
  modality: "DBT",
  module: "Emotion Regulation",
  skill_type: "reducing_vulnerability"
};

MERGE (build_mastery:TherapyConcept {id: "dbt_build_mastery"})
SET build_mastery += {
  name: "Build Mastery",
  description: "Doing things that make you feel competent and effective",
  modality: "DBT",
  module: "Emotion Regulation",
  skill_type: "reducing_vulnerability"
};

MERGE (cope_ahead:TherapyConcept {id: "dbt_cope_ahead"})
SET cope_ahead += {
  name: "Cope Ahead",
  description: "Planning and rehearsing for difficult situations before they occur",
  modality: "DBT",
  module: "Emotion Regulation",
  skill_type: "reducing_vulnerability"
};

MERGE (please_skills:TherapyConcept {id: "dbt_please"})
SET please_skills += {
  name: "PLEASE Skills",
  description: "Physical self-care: treat illness, balanced eating, avoid drugs, balanced sleep, exercise",
  modality: "DBT",
  module: "Emotion Regulation",
  skill_type: "reducing_vulnerability"
};

// ER Handout 20b (PRD ER-13): sleep hygiene, a fixed wake time and what to do when you can't sleep; Sleep reset
// (docs/design/sleep-reset.md).
MERGE (sleep_hygiene:TherapyConcept {id: "dbt_sleep_hygiene"})
SET sleep_hygiene += {
  name: "Sleep Hygiene Protocol",
  description: "One wake time every day, an hour to wind down, and getting up for a while instead of lying awake; at night, resting counts and problems wait for the morning",
  modality: "DBT",
  module: "Emotion Regulation",
  skill_type: "reducing_vulnerability"
};

MERGE (check_the_facts:TherapyConcept {id: "dbt_check_facts"})
SET check_the_facts += {
  name: "Check the Facts",
  description: "Examining whether emotional response fits the facts of the situation",
  modality: "DBT",
  module: "Emotion Regulation",
  skill_type: "changing_response"
};

// ER Handout 24 (PRD ER-14): troubleshooting when a skill was used and didn't help.
MERGE (troubleshooting:TherapyConcept {id: "dbt_troubleshooting"})
SET troubleshooting += {
  name: "Troubleshooting Emotion Regulation Skills",
  description: "Checking what got in the way when an emotion regulation skill was used and didn't help: body vulnerability, skill fit, practising it fully, reinforcers, willingness, overload and emotion myths",
  modality: "DBT",
  module: "Emotion Regulation",
  skill_type: "troubleshooting"
};

// ER Handout 20a (PRD ER-15): the nightmare protocol, imagery rehearsal for a nightmare that keeps coming back.
MERGE (nightmare_protocol:TherapyConcept {id: "dbt_nightmare_protocol"})
SET nightmare_protocol += {
  name: "Nightmare Protocol",
  description: "Changing a recurring nightmare while awake: choosing a change before the bad part and a new ending, then rehearsing the new version daily. Not for nightmares that replay a real event, which belong with a clinician",
  modality: "DBT",
  module: "Emotion Regulation",
  skill_type: "reducing_vulnerability"
};

MERGE (opposite_action:TherapyConcept {id: "dbt_opposite_action"})
SET opposite_action += {
  name: "Opposite Action",
  description: "Acting opposite to emotion urge when emotion doesn't fit facts or isn't effective",
  modality: "DBT",
  module: "Emotion Regulation",
  skill_type: "changing_response"
};

MERGE (problem_solving:TherapyConcept {id: "dbt_problem_solving"})
SET problem_solving += {
  name: "Problem Solving",
  description: "Changing the situation when emotion fits the facts",
  modality: "DBT",
  module: "Emotion Regulation",
  skill_type: "changing_response"
};


// ============================================================
// DBT CONCEPTS - INTERPERSONAL EFFECTIVENESS SKILLS
// ============================================================

MERGE (dear_man:TherapyConcept {id: "dbt_dear_man"})
SET dear_man += {
  name: "DEAR MAN",
  description: "Describe, Express, Assert, Reinforce, Mindful, Appear confident, Negotiate",
  modality: "DBT",
  module: "Interpersonal Effectiveness",
  skill_type: "objectives_effectiveness"
};

MERGE (give:TherapyConcept {id: "dbt_give"})
SET give += {
  name: "GIVE",
  description: "Gentle, Interested, Validate, Easy manner",
  modality: "DBT",
  module: "Interpersonal Effectiveness",
  skill_type: "relationship_effectiveness"
};

// IE Handouts 10-11 (PRD IE-09): finding and keeping friends; Find your people (docs/design/find-your-people.md).
MERGE (building_relationships:TherapyConcept {id: "dbt_building_relationships"})
SET building_relationships += {
  name: "Building Relationships",
  description: "Finding people and keeping friendships going, one small step at a time, with a prediction checked against what happened",
  modality: "DBT",
  module: "Interpersonal Effectiveness",
  skill_type: "relationship_building"
};

// IE Handouts 5, 6 and 8 (PRD IE-02): behavioural rehearsal of a hard conversation; Rehearse it (docs/design/rehearse.md).
MERGE (behavioral_rehearsal:TherapyConcept {id: "dbt_behavioral_rehearsal"})
SET behavioral_rehearsal += {
  name: "Behavioural Rehearsal",
  description: "Practising a hard conversation before it happens: saying the line out loud, meeting the pushback you choose, and trying a move that keeps you on track",
  modality: "DBT",
  module: "Interpersonal Effectiveness",
  skill_type: "interpersonal_practice"
};

// IE Handout 12 (PRD IE-10): mindfulness of others; Notice them (docs/design/notice-them.md).
MERGE (mindfulness_of_others:TherapyConcept {id: "dbt_mindfulness_of_others"})
SET mindfulness_of_others += {
  name: "Mindfulness of Others",
  description: "Noticing other people with curiosity: what they actually did, what you added, and what might have been going on for them",
  modality: "DBT",
  module: "Interpersonal Effectiveness",
  skill_type: "relationship_mindfulness"
};

MERGE (fast:TherapyConcept {id: "dbt_fast"})
SET fast += {
  name: "FAST",
  description: "Fair, no excessive Apologies, Stick to values, Truthful",
  modality: "DBT",
  module: "Interpersonal Effectiveness",
  skill_type: "self_respect_effectiveness"
};

// IE Handout 13 (PRD IE-08): ending a relationship that's hurting you; safety first (docs/design/ending-relationships.md).
MERGE (ending:TherapyConcept {id: "dbt_ending_relationships"})
SET ending += {
  name: "Ending relationships",
  description: "Deciding whether to end a relationship that is harmful, interferes with your goals, or is hard to fix, and doing it safely and clearly",
  modality: "DBT",
  module: "Interpersonal Effectiveness",
  skill_type: "relationship_effectiveness"
};


// IE Handouts 5 and 8 (PRD IE-04): saying no, apart from asking, so Problem Solve and routing can target refusals
// (docs/design/say-no.md).
MERGE (saying_no:TherapyConcept {id: "dbt_saying_no"})
SET saying_no += {
  name: "Saying no",
  description: "Refusing a request clearly and kindly, sized by the facts, with a line ready for when they push",
  modality: "DBT",
  module: "Interpersonal Effectiveness",
  skill_type: "objectives_effectiveness"
};


// ER Handouts 3-6 (PRD ER-10): what emotions do, the model of emotions, describing them; Know this feeling
// (docs/design/emotion-guide.md).
MERGE (model_of_emotions:TherapyConcept {id: "dbt_model_of_emotions"})
SET model_of_emotions += {
  name: "Understanding and Naming Emotions",
  description: "Knowing what a feeling is for, what sets it off, how it shows up and what it pulls toward, and finding a closer word for it",
  modality: "DBT",
  module: "Emotion Regulation",
  skill_type: "emotion_knowledge"
};


// ER Handout 22 (PRD ER-08): mindfulness of current emotion, letting a feeling rise and fall without blocking or
// amplifying it; Let it be a wave (docs/design/mindfulness-emotions.md).
MERGE (current_emotion:TherapyConcept {id: "dbt_mindfulness_current_emotion"})
SET current_emotion += {
  name: "Mindfulness of Current Emotion",
  description: "Letting a feeling be as big as it is, noticing it in the body as it rises and falls, without pushing it away or holding on to it",
  modality: "DBT",
  module: "Emotion Regulation",
  skill_type: "emotion_acceptance"
};


// ER Handouts 17-18 (PRD ER-09): values and priorities; What matters to me (docs/design/values.md).
MERGE (values_priorities:TherapyConcept {id: "dbt_values_priorities"})
SET values_priorities += {
  name: "Values and Priorities",
  description: "Naming what matters to you, keeping a few for now, and taking one small step in that direction",
  modality: "DBT",
  module: "Emotion Regulation",
  skill_type: "values"
};


// DT Handouts 8 and 8a (PRD DT-07): self-soothing with the five senses, hand on heart; Held (docs/design/held.md).
MERGE (self_soothe:TherapyConcept {id: "dbt_self_soothe"})
SET self_soothe += {
  name: "Self-Soothe",
  description: "Comforting yourself through the five senses and kind touch, so a hard moment is met with care",
  modality: "DBT",
  module: "Distress Tolerance",
  skill_type: "self_soothing"
};


// DT Handout 15 (PRD DT-08): mindfulness of current thoughts, observing a thought as a thought; Thoughts passing
// through (docs/design/thoughts-passing.md).
MERGE (current_thoughts:TherapyConcept {id: "dbt_mindfulness_current_thoughts"})
SET current_thoughts += {
  name: "Mindfulness of Current Thoughts",
  description: "Observing a thought as a thought, an event that comes and goes, not a fact or a command",
  modality: "DBT",
  module: "Distress Tolerance",
  skill_type: "reality_acceptance"
};


// DT Handouts 16–21 (PRD DT-09): dialectical abstinence, the DBT-SUD skills; When it's a habit
// (docs/design/habit-plan.md).
MERGE (dialectical_abstinence:TherapyConcept {id: "dbt_dialectical_abstinence"})
SET dialectical_abstinence += {
  name: "Dialectical Abstinence",
  description: "Full commitment to not doing a behaviour, for a stretch you can keep, together with a plan for a slip so one slip doesn't become giving up",
  modality: "DBT",
  module: "Distress Tolerance",
  skill_type: "crisis_survival"
};

// DT crisis survival skills gathered ahead of time (PRD DT-03; the coping step of Stanley–Brown's safety plan);
// My crisis kit (docs/design/crisis-kit.md).
MERGE (crisis_kit:TherapyConcept {id: "dbt_crisis_survival_kit"})
SET crisis_kit += {
  name: "Crisis Survival Kit",
  description: "The person's own crisis survival skills, picked on a calmer day and handed back one card at a time when they can't think straight: body, distraction, self-soothe, encouragement, a safe place and reasons to get through",
  modality: "DBT",
  module: "Distress Tolerance",
  skill_type: "crisis_survival"
};


// ============================================================
// MINDFULNESS AS CROSS-MODALITY CONCEPT
// ============================================================

MERGE (mindfulness:TherapyConcept {id: "mindfulness"})
SET mindfulness += {
  name: "Mindfulness",
  description: "Present-moment, non-judgmental awareness; core to DBT, ACT, MBCT, and contemplative traditions",
  modality: "cross_modality",
  skill_type: "foundational"
};


// ============================================================
// CBT CONCEPTS
// ============================================================

MERGE (cognitive_distortion:TherapyConcept {id: "cbt_cognitive_distortion"})
SET cognitive_distortion += {
  name: "Cognitive Distortion",
  description: "Biased or irrational thought patterns",
  modality: "CBT"
};

MERGE (catastrophizing:TherapyConcept {id: "cbt_catastrophizing"})
SET catastrophizing += {
  name: "Catastrophizing",
  description: "Assuming the worst possible outcome will occur",
  modality: "CBT",
  distortion_type: "cognitive_distortion"
};

MERGE (black_white:TherapyConcept {id: "cbt_black_white"})
SET black_white += {
  name: "All-or-Nothing Thinking",
  description: "Seeing things in black and white with no middle ground",
  modality: "CBT",
  distortion_type: "cognitive_distortion",
  aliases: ["black-and-white thinking", "splitting", "dichotomous thinking"]
};

MERGE (mind_reading:TherapyConcept {id: "cbt_mind_reading"})
SET mind_reading += {
  name: "Mind Reading",
  description: "Assuming you know what others are thinking without evidence",
  modality: "CBT",
  distortion_type: "cognitive_distortion"
};

MERGE (fortune_telling:TherapyConcept {id: "cbt_fortune_telling"})
SET fortune_telling += {
  name: "Fortune Telling",
  description: "Predicting negative outcomes without evidence",
  modality: "CBT",
  distortion_type: "cognitive_distortion"
};

MERGE (should_statements:TherapyConcept {id: "cbt_should_statements"})
SET should_statements += {
  name: "Should Statements",
  description: "Rigid rules about how self or others must behave",
  modality: "CBT",
  distortion_type: "cognitive_distortion"
};

MERGE (personalization:TherapyConcept {id: "cbt_personalization"})
SET personalization += {
  name: "Personalization",
  description: "Taking excessive responsibility for external events",
  modality: "CBT",
  distortion_type: "cognitive_distortion"
};

MERGE (labeling:TherapyConcept {id: "cbt_labeling"})
SET labeling += {
  name: "Labeling",
  description: "Attaching a fixed label to self or others based on single event",
  modality: "CBT",
  distortion_type: "cognitive_distortion"
};

MERGE (emotional_reasoning:TherapyConcept {id: "cbt_emotional_reasoning"})
SET emotional_reasoning += {
  name: "Emotional Reasoning",
  description: "Believing something is true because it feels true",
  modality: "CBT",
  distortion_type: "cognitive_distortion"
};

MERGE (mental_filter:TherapyConcept {id: "cbt_mental_filter"})
SET mental_filter += {
  name: "Mental Filter",
  description: "Focusing on negatives while filtering out positives",
  modality: "CBT",
  distortion_type: "cognitive_distortion"
};

MERGE (thought_record:TherapyConcept {id: "cbt_thought_record"})
SET thought_record += {
  name: "Thought Record",
  description: "Tool for identifying and challenging automatic thoughts",
  modality: "CBT",
  skill_type: "cognitive_restructuring"
};

MERGE (behavioral_activation:TherapyConcept {id: "cbt_behavioral_activation"})
SET behavioral_activation += {
  name: "Behavioral Activation",
  description: "Scheduling pleasurable and mastery activities to improve mood",
  modality: "CBT",
  skill_type: "behavioral"
};

MERGE (exposure:TherapyConcept {id: "cbt_exposure"})
SET exposure += {
  name: "Exposure",
  description: "Gradually facing feared situations to reduce anxiety through extinction learning",
  modality: "CBT",
  skill_type: "behavioral"
};


// ============================================================
// ACT CONCEPTS
// ============================================================

MERGE (psychological_flexibility:TherapyConcept {id: "act_psych_flexibility"})
SET psychological_flexibility += {
  name: "Psychological Flexibility",
  description: "Ability to be present, open, and do what matters; core aim of ACT",
  modality: "ACT"
};

MERGE (defusion:TherapyConcept {id: "act_defusion"})
SET defusion += {
  name: "Cognitive Defusion",
  description: "Changing relationship with thoughts rather than content; seeing thoughts as thoughts",
  modality: "ACT"
};

MERGE (acceptance_act:TherapyConcept {id: "act_acceptance"})
SET acceptance_act += {
  name: "Acceptance",
  description: "Making room for unwanted thoughts and feelings without struggle",
  modality: "ACT"
};

MERGE (present_moment:TherapyConcept {id: "act_present_moment"})
SET present_moment += {
  name: "Present Moment Awareness",
  description: "Flexible attention to here and now",
  modality: "ACT"
};

MERGE (self_as_context:TherapyConcept {id: "act_self_context"})
SET self_as_context += {
  name: "Self-as-Context",
  description: "Sense of self as observer/container distinct from experiences and stories",
  modality: "ACT"
};

MERGE (values_act:TherapyConcept {id: "act_values"})
SET values_act += {
  name: "Values",
  description: "Chosen life directions that provide meaning and vitality",
  modality: "ACT"
};

MERGE (committed_action:TherapyConcept {id: "act_committed_action"})
SET committed_action += {
  name: "Committed Action",
  description: "Values-guided action despite obstacles; doing what matters",
  modality: "ACT"
};


// ============================================================
// EMDR CONCEPTS
// ============================================================

MERGE (aip_model:TherapyConcept {id: "emdr_aip"})
SET aip_model += {
  name: "Adaptive Information Processing Model",
  description: "Theory that trauma overwhelms natural processing, leaving memories maladaptively stored",
  modality: "EMDR"
};

MERGE (bilateral_stimulation:TherapyConcept {id: "emdr_bilateral"})
SET bilateral_stimulation += {
  name: "Bilateral Stimulation",
  description: "Alternating left-right stimulation (eye movements, taps, tones) during memory processing",
  modality: "EMDR"
};

MERGE (target_memory:TherapyConcept {id: "emdr_target"})
SET target_memory += {
  name: "Target Memory",
  description: "Specific traumatic memory being processed, including image, cognition, emotion, sensation",
  modality: "EMDR"
};

MERGE (negative_cognition:TherapyConcept {id: "emdr_nc"})
SET negative_cognition += {
  name: "Negative Cognition",
  description: "Irrational self-belief associated with trauma (e.g., 'I am not safe')",
  modality: "EMDR"
};

MERGE (positive_cognition:TherapyConcept {id: "emdr_pc"})
SET positive_cognition += {
  name: "Positive Cognition",
  description: "Desired adaptive belief to replace negative cognition (e.g., 'I am safe now')",
  modality: "EMDR"
};

MERGE (suds:TherapyConcept {id: "emdr_suds"})
SET suds += {
  name: "SUDS",
  description: "Subjective Units of Disturbance Scale (0-10) measuring emotional distress",
  modality: "EMDR"
};

MERGE (voc:TherapyConcept {id: "emdr_voc"})
SET voc += {
  name: "VOC",
  description: "Validity of Cognition scale (1-7) measuring belief in positive cognition",
  modality: "EMDR"
};

MERGE (emdr_phases:TherapyConcept {id: "emdr_phases"})
SET emdr_phases += {
  name: "Eight Phases of EMDR",
  description: "History, preparation, assessment, desensitization, installation, body scan, closure, reevaluation",
  modality: "EMDR"
};


// ============================================================
// SOMATIC EXPERIENCING CONCEPTS
// ============================================================

MERGE (felt_sense:TherapyConcept {id: "se_felt_sense"})
SET felt_sense += {
  name: "Felt Sense",
  description: "Bodily awareness of experience; holistic sense of how something feels in the body",
  modality: "SE"
};

MERGE (titration:TherapyConcept {id: "se_titration"})
SET titration += {
  name: "Titration",
  description: "Accessing trauma in small, manageable amounts to prevent overwhelm",
  modality: "SE"
};

MERGE (pendulation:TherapyConcept {id: "se_pendulation"})
SET pendulation += {
  name: "Pendulation",
  description: "Natural rhythm of moving between activation/distress and settling/calm",
  modality: "SE"
};

MERGE (discharge:TherapyConcept {id: "se_discharge"})
SET discharge += {
  name: "Discharge",
  description: "Release of stored survival energy through trembling, heat, breathing, movement",
  modality: "SE"
};

MERGE (resourcing:TherapyConcept {id: "se_resourcing"})
SET resourcing += {
  name: "Resourcing",
  description: "Building internal and external resources for safety and regulation",
  modality: "SE"
};

MERGE (orienting:TherapyConcept {id: "se_orienting"})
SET orienting += {
  name: "Orienting",
  description: "Natural scanning of environment that was interrupted during trauma",
  modality: "SE"
};

MERGE (defensive_responses:TherapyConcept {id: "se_defensive"})
SET defensive_responses += {
  name: "Defensive Responses",
  description: "Fight, flight, freeze responses that may need completion",
  modality: "SE"
};


// ============================================================
// CPT CONCEPTS
// ============================================================

MERGE (stuck_point:TherapyConcept {id: "cpt_stuck_point"})
SET stuck_point += {
  name: "Stuck Point",
  description: "Distorted belief about self, others, or world resulting from trauma",
  modality: "CPT"
};

MERGE (assimilation:TherapyConcept {id: "cpt_assimilation"})
SET assimilation += {
  name: "Assimilation",
  description: "Altering trauma memory to fit prior beliefs (denial, self-blame)",
  modality: "CPT"
};

MERGE (overaccommodation:TherapyConcept {id: "cpt_overaccommodation"})
SET overaccommodation += {
  name: "Over-accommodation",
  description: "Overgeneralizing trauma to all situations ('no one can be trusted')",
  modality: "CPT"
};

MERGE (accommodation:TherapyConcept {id: "cpt_accommodation"})
SET accommodation += {
  name: "Accommodation",
  description: "Healthy modification of beliefs to integrate trauma realistically",
  modality: "CPT"
};

MERGE (abc_worksheet:TherapyConcept {id: "cpt_abc"})
SET abc_worksheet += {
  name: "ABC Worksheet",
  description: "Activating event, Belief, Consequence - identifying stuck points",
  modality: "CPT"
};

MERGE (challenging_questions:TherapyConcept {id: "cpt_challenging"})
SET challenging_questions += {
  name: "Challenging Questions",
  description: "Socratic questions to examine evidence for stuck points",
  modality: "CPT"
};

MERGE (trauma_themes:TherapyConcept {id: "cpt_themes"})
SET trauma_themes += {
  name: "Trauma Themes",
  description: "Safety, trust, power/control, esteem, intimacy - areas impacted by trauma",
  modality: "CPT"
};


// ============================================================
// MBCT CONCEPTS
// ============================================================

MERGE (decentering:TherapyConcept {id: "mbct_decentering"})
SET decentering += {
  name: "Decentering",
  description: "Seeing thoughts as mental events rather than facts or reflections of self",
  modality: "MBCT"
};

MERGE (body_scan:TherapyConcept {id: "mbct_body_scan"})
SET body_scan += {
  name: "Body Scan",
  description: "Systematic attention to sensations throughout the body",
  modality: "MBCT"
};

MERGE (sitting_meditation:TherapyConcept {id: "mbct_sitting"})
SET sitting_meditation += {
  name: "Sitting Meditation",
  description: "Formal mindfulness practice with breath and body awareness",
  modality: "MBCT"
};

MERGE (mindful_movement:TherapyConcept {id: "mbct_movement"})
SET mindful_movement += {
  name: "Mindful Movement",
  description: "Yoga and stretching with present-moment awareness",
  modality: "MBCT"
};

MERGE (three_minute_breathing:TherapyConcept {id: "mbct_3min"})
SET three_minute_breathing += {
  name: "Three-Minute Breathing Space",
  description: "Brief practice: awareness, gathering, expanding - used as coping tool",
  modality: "MBCT"
};

MERGE (depression_relapse:TherapyConcept {id: "mbct_relapse"})
SET depression_relapse += {
  name: "Depression Relapse Prevention",
  description: "Primary goal of MBCT - breaking the rumination-depression cycle",
  modality: "MBCT"
};


// ============================================================
// POLYVAGAL CONCEPTS
// ============================================================

MERGE (ventral_vagal:TherapyConcept {id: "pv_ventral_vagal"})
SET ventral_vagal += {
  name: "Ventral Vagal State",
  description: "Social engagement system; safety, connection, calm presence",
  modality: "Polyvagal",
  autonomic_state: "parasympathetic_social"
};

MERGE (sympathetic_state:TherapyConcept {id: "pv_sympathetic"})
SET sympathetic_state += {
  name: "Sympathetic State",
  description: "Mobilization for fight or flight; anxiety, anger, action",
  modality: "Polyvagal",
  autonomic_state: "sympathetic"
};

MERGE (dorsal_vagal:TherapyConcept {id: "pv_dorsal_vagal"})
SET dorsal_vagal += {
  name: "Dorsal Vagal State",
  description: "Immobilization; shutdown, collapse, dissociation, depression",
  modality: "Polyvagal",
  autonomic_state: "parasympathetic_immobilization"
};

MERGE (neuroception:TherapyConcept {id: "pv_neuroception"})
SET neuroception += {
  name: "Neuroception",
  description: "Subconscious detection of safety or threat that shapes autonomic state",
  modality: "Polyvagal"
};

MERGE (co_regulation:TherapyConcept {id: "pv_coregulation"})
SET co_regulation += {
  name: "Co-regulation",
  description: "Regulating through safe connection with others; borrowing another's ventral vagal",
  modality: "Polyvagal"
};

MERGE (vagal_brake:TherapyConcept {id: "pv_vagal_brake"})
SET vagal_brake += {
  name: "Vagal Brake",
  description: "Ventral vagal inhibition of heart rate allowing calm engagement without shutdown",
  modality: "Polyvagal"
};

MERGE (social_engagement:TherapyConcept {id: "pv_social_engagement"})
SET social_engagement += {
  name: "Social Engagement System",
  description: "Face-heart connection; facial expression, vocalization, listening in ventral vagal",
  modality: "Polyvagal"
};


// ============================================================
// CLINICAL CONSTRUCTS
// ============================================================

MERGE (ptsd:ClinicalConstruct {id: "ptsd"})
SET ptsd += {
  name: "Post-Traumatic Stress Disorder",
  abbreviation: "PTSD",
  source: "DSM-5-TR",
  code: "309.81",
  symptom_clusters: ["intrusion", "avoidance", "negative_cognitions", "hyperarousal"]
};

MERGE (cptsd:ClinicalConstruct {id: "cptsd"})
SET cptsd += {
  name: "Complex PTSD",
  abbreviation: "C-PTSD",
  source: "ICD-11",
  description: "PTSD plus disturbances in self-organization",
  additional_features: ["affect_dysregulation", "negative_self_concept", "relationship_difficulties"]
};

MERGE (bpd:ClinicalConstruct {id: "bpd"})
SET bpd += {
  name: "Borderline Personality Disorder",
  abbreviation: "BPD",
  source: "DSM-5-TR",
  code: "301.83",
  core_features: ["identity_disturbance", "abandonment_fear", "emotional_instability", "impulsivity", "self_harm"]
};

MERGE (gad:ClinicalConstruct {id: "gad"})
SET gad += {
  name: "Generalized Anxiety Disorder",
  abbreviation: "GAD",
  source: "DSM-5-TR",
  code: "300.02"
};

MERGE (mdd:ClinicalConstruct {id: "mdd"})
SET mdd += {
  name: "Major Depressive Disorder",
  abbreviation: "MDD",
  source: "DSM-5-TR",
  code: "296.2x"
};

MERGE (panic_disorder:ClinicalConstruct {id: "panic_disorder"})
SET panic_disorder += {
  name: "Panic Disorder",
  source: "DSM-5-TR",
  code: "300.01"
};

MERGE (social_anxiety:ClinicalConstruct {id: "social_anxiety"})
SET social_anxiety += {
  name: "Social Anxiety Disorder",
  abbreviation: "SAD",
  source: "DSM-5-TR",
  code: "300.23"
};

MERGE (ocd:ClinicalConstruct {id: "ocd"})
SET ocd += {
  name: "Obsessive-Compulsive Disorder",
  abbreviation: "OCD",
  source: "DSM-5-TR",
  code: "300.3"
};

MERGE (adhd:ClinicalConstruct {id: "adhd"})
SET adhd += {
  name: "Attention-Deficit/Hyperactivity Disorder",
  abbreviation: "ADHD",
  source: "DSM-5-TR",
  code: "314.0x"
};

MERGE (dissociation:ClinicalConstruct {id: "dissociation"})
SET dissociation += {
  name: "Dissociation",
  description: "Disconnection from thoughts, feelings, surroundings, identity",
  construct_type: "symptom_dimension"
};

MERGE (emotional_dysregulation:ClinicalConstruct {id: "emotional_dysregulation"})
SET emotional_dysregulation += {
  name: "Emotional Dysregulation",
  description: "Difficulty modulating emotional responses",
  construct_type: "symptom_dimension"
};

MERGE (hypervigilance:ClinicalConstruct {id: "hypervigilance"})
SET hypervigilance += {
  name: "Hypervigilance",
  description: "Heightened state of sensory sensitivity and scanning for threat",
  construct_type: "symptom"
};

MERGE (flashback:ClinicalConstruct {id: "flashback"})
SET flashback += {
  name: "Flashback",
  description: "Vivid re-experiencing of traumatic event as if happening now",
  construct_type: "symptom"
};

MERGE (avoidance_symptom:ClinicalConstruct {id: "avoidance"})
SET avoidance_symptom += {
  name: "Avoidance",
  description: "Avoiding reminders of trauma or distressing experiences",
  construct_type: "symptom"
};

MERGE (rumination:ClinicalConstruct {id: "rumination"})
SET rumination += {
  name: "Rumination",
  description: "Repetitive, passive focus on symptoms, causes, and consequences",
  construct_type: "symptom"
};


// ============================================================
// COGNITIVE/PSYCHOLOGICAL FUNCTIONS
// ============================================================

MERGE (emotion_regulation:Function {id: "emotion_regulation"})
SET emotion_regulation += {
  name: "Emotion Regulation",
  description: "Ability to modulate emotional experience and expression"
};

MERGE (fear_conditioning:Function {id: "fear_conditioning"})
SET fear_conditioning += {
  name: "Fear Conditioning",
  description: "Learning to associate neutral stimuli with threat"
};

MERGE (fear_extinction:Function {id: "fear_extinction"})
SET fear_extinction += {
  name: "Fear Extinction",
  description: "Learning that conditioned stimulus no longer predicts threat; context-dependent"
};

MERGE (working_memory:Function {id: "working_memory"})
SET working_memory += {
  name: "Working Memory",
  description: "Temporary storage and manipulation of information"
};

MERGE (interoception:Function {id: "interoception"})
SET interoception += {
  name: "Interoception",
  description: "Perception of internal bodily states"
};

MERGE (executive_function:Function {id: "executive_function"})
SET executive_function += {
  name: "Executive Function",
  description: "Higher-order cognitive processes: planning, inhibition, flexibility"
};

MERGE (attention_function:Function {id: "attention"})
SET attention_function += {
  name: "Attention",
  description: "Selective focus on relevant stimuli; top-down and bottom-up"
};

MERGE (cognitive_control:Function {id: "cognitive_control"})
SET cognitive_control += {
  name: "Cognitive Control",
  description: "Ability to regulate thoughts and actions in service of goals"
};

MERGE (memory_consolidation:Function {id: "memory_consolidation"})
SET memory_consolidation += {
  name: "Memory Consolidation",
  description: "Process of stabilizing memories for long-term storage"
};

MERGE (threat_detection:Function {id: "threat_detection"})
SET threat_detection += {
  name: "Threat Detection",
  description: "Rapid identification of potentially dangerous stimuli"
};

MERGE (reward_processing:Function {id: "reward_processing"})
SET reward_processing += {
  name: "Reward Processing",
  description: "Evaluation and learning from rewards"
};

MERGE (self_referential:Function {id: "self_referential"})
SET self_referential += {
  name: "Self-Referential Processing",
  description: "Thinking about oneself, autobiographical memory, self-reflection"
};

MERGE (social_cognition:Function {id: "social_cognition"})
SET social_cognition += {
  name: "Social Cognition",
  description: "Understanding others' mental states, theory of mind, empathy"
};

MERGE (impulse_control:Function {id: "impulse_control"})
SET impulse_control += {
  name: "Impulse Control",
  description: "Ability to inhibit prepotent responses"
};

MERGE (stress_response:Function {id: "stress_response"})
SET stress_response += {
  name: "Stress Response",
  description: "Physiological and psychological reaction to stressors"
};

MERGE (motivation:Function {id: "motivation"})
SET motivation += {
  name: "Motivation",
  description: "Drive toward goals and rewards"
};

MERGE (habit_formation:Function {id: "habit_formation"})
SET habit_formation += {
  name: "Habit Formation",
  description: "Automatization of repeated behaviors"
};

MERGE (language_processing:Function {id: "language_processing"})
SET language_processing += {
  name: "Language Processing",
  description: "Comprehension and production of language"
};

MERGE (body_awareness:Function {id: "body_awareness"})
SET body_awareness += {
  name: "Body Awareness",
  description: "Conscious perception of body position and sensations"
};


// ============================================================
// HiTOP FRAMEWORK - HIERARCHICAL TAXONOMY OF PSYCHOPATHOLOGY
// Per domain expert: "The fundamental structure of the knowledge
// graph must move beyond categorical constraints of DSM-5-TR/ICD-11
// to reflect the dimensional reality of psychopathology"
// ============================================================

// P-Factor: General factor of psychopathology
MERGE (p_factor:HiTOPConstruct {id: "hitop_p_factor"})
SET p_factor += {
  name: "P-Factor (General Psychopathology)",
  level: "superordinate",
  description: "General factor underlying all mental disorder symptoms; correlates with mPFC dysregulation of subcortical arousal",
  neural_correlates: ["mPFC dysfunction", "subcortical arousal dysregulation"],
  evidence_base: "Caspi & Moffitt (2018); Lahey et al. (2012)"
};

// HiTOP Spectra
MERGE (internalizing_spectrum:HiTOPConstruct {id: "hitop_internalizing"})
SET internalizing_spectrum += {
  name: "Internalizing Spectrum",
  level: "spectrum",
  description: "Captures shared genetic diathesis, environmental risk factors, and neural substrates common to distress and fear-based conditions",
  subfactors: ["Distress", "Fear"],
  rdoc_domain: "Negative Valence Systems",
  key_neural_circuitry: ["amygdala", "mPFC", "dACC", "insula"]
};

MERGE (externalizing_spectrum:HiTOPConstruct {id: "hitop_externalizing"})
SET externalizing_spectrum += {
  name: "Externalizing Spectrum",
  level: "spectrum",
  description: "Disinhibited and antagonistic behavioral patterns",
  subfactors: ["Disinhibited Externalizing", "Antagonistic Externalizing"],
  rdoc_domain: "Positive Valence / Cognitive Systems",
  key_neural_circuitry: ["ventral_striatum", "dlPFC", "OFC"]
};

MERGE (thought_disorder_spectrum:HiTOPConstruct {id: "hitop_thought_disorder"})
SET thought_disorder_spectrum += {
  name: "Thought Disorder Spectrum",
  level: "spectrum",
  description: "Psychotic and schizotypal presentations",
  subfactors: ["Psychoticism", "Detachment"],
  rdoc_domain: "Cognitive / Social Processes",
  key_neural_circuitry: ["thalamus", "cerebellum", "TPJ", "mPFC"]
};

MERGE (somatoform_spectrum:HiTOPConstruct {id: "hitop_somatoform"})
SET somatoform_spectrum += {
  name: "Somatoform Spectrum",
  level: "spectrum",
  description: "Somatic symptom presentations and illness anxiety",
  rdoc_domain: "Arousal and Regulatory Systems",
  key_neural_circuitry: ["posterior_insula", "somatosensory_cortex"]
};

MERGE (detachment_spectrum:HiTOPConstruct {id: "hitop_detachment"})
SET detachment_spectrum += {
  name: "Detachment Spectrum",
  level: "spectrum",
  description: "Social withdrawal, anhedonia, restricted affect",
  key_neural_circuitry: ["nucleus_accumbens", "mPFC"]
};

// HiTOP Subfactors
MERGE (hitop_distress:HiTOPConstruct {id: "hitop_distress"})
SET hitop_distress += {
  name: "Distress Subfactor",
  level: "subfactor",
  parent_spectrum: "internalizing",
  description: "Depressive, dysthymic, anxious-misery presentations",
  clinical_manifestations: ["MDD", "Dysthymia", "GAD"]
};

MERGE (hitop_fear:HiTOPConstruct {id: "hitop_fear"})
SET hitop_fear += {
  name: "Fear Subfactor",
  level: "subfactor",
  parent_spectrum: "internalizing",
  description: "Phobic and panic presentations",
  clinical_manifestations: ["Panic Disorder", "Specific Phobias", "Social Anxiety"]
};


// ============================================================
// RDoC FRAMEWORK - RESEARCH DOMAIN CRITERIA
// Provides granular "units of analysis" for HiTOP spectra
// ============================================================

// RDoC Domains
MERGE (rdoc_negative_valence:RDoCDomain {id: "rdoc_negative_valence"})
SET rdoc_negative_valence += {
  name: "Negative Valence Systems",
  description: "Systems for responses to aversive situations/contexts including fear, anxiety, and loss",
  constructs: ["Acute Threat (Fear)", "Potential Threat (Anxiety)", "Sustained Threat", "Loss", "Frustrative Nonreward"]
};

MERGE (rdoc_positive_valence:RDoCDomain {id: "rdoc_positive_valence"})
SET rdoc_positive_valence += {
  name: "Positive Valence Systems",
  description: "Systems for responses to positive motivational situations",
  constructs: ["Reward Responsiveness", "Reward Learning", "Reward Valuation", "Approach Motivation"]
};

MERGE (rdoc_cognitive:RDoCDomain {id: "rdoc_cognitive"})
SET rdoc_cognitive += {
  name: "Cognitive Systems",
  description: "Systems responsible for various cognitive processes",
  constructs: ["Attention", "Perception", "Declarative Memory", "Working Memory", "Cognitive Control", "Language"]
};

MERGE (rdoc_social:RDoCDomain {id: "rdoc_social"})
SET rdoc_social += {
  name: "Systems for Social Processes",
  description: "Systems for mediating responses to interpersonal settings",
  constructs: ["Affiliation and Attachment", "Social Communication", "Perception and Understanding of Self", "Perception and Understanding of Others"]
};

MERGE (rdoc_arousal:RDoCDomain {id: "rdoc_arousal"})
SET rdoc_arousal += {
  name: "Arousal and Regulatory Systems",
  description: "Systems responsible for activation of neural systems and homeostatic regulation",
  constructs: ["Arousal", "Circadian Rhythms", "Sleep-Wakefulness"]
};

MERGE (rdoc_sensorimotor:RDoCDomain {id: "rdoc_sensorimotor"})
SET rdoc_sensorimotor += {
  name: "Sensorimotor Systems",
  description: "Systems responsible for motor behavior control",
  constructs: ["Motor Actions", "Agency and Ownership"]
};

// Key RDoC Constructs (most relevant to therapy modalities)
MERGE (rdoc_acute_threat:RDoCConstruct {id: "rdoc_acute_threat"})
SET rdoc_acute_threat += {
  name: "Acute Threat (Fear)",
  domain: "Negative Valence Systems",
  description: "Activation of the brain's defensive motivational system to promote behaviors that protect from perceived danger",
  neural_circuit: ["amygdala", "BNST", "PAG", "hypothalamus"],
  therapeutic_targets: ["exposure", "EMDR", "SE"]
};

MERGE (rdoc_potential_threat:RDoCConstruct {id: "rdoc_potential_threat"})
SET rdoc_potential_threat += {
  name: "Potential Threat (Anxiety)",
  domain: "Negative Valence Systems",
  description: "Sustained activation of defensive system in response to uncertain threat",
  neural_circuit: ["BNST", "hippocampus", "mPFC"],
  therapeutic_targets: ["DBT", "ACT", "CBT"]
};

MERGE (rdoc_loss:RDoCConstruct {id: "rdoc_loss"})
SET rdoc_loss += {
  name: "Loss",
  domain: "Negative Valence Systems",
  description: "Response to loss of access to reward or anticipated loss",
  neural_circuit: ["vACC", "amygdala", "nucleus_accumbens"],
  therapeutic_targets: ["behavioral_activation", "CPT", "MBCT"]
};

MERGE (rdoc_self_perception:RDoCConstruct {id: "rdoc_self_perception"})
SET rdoc_self_perception += {
  name: "Perception and Understanding of Self",
  domain: "Systems for Social Processes",
  description: "Processes involved in perceiving, knowing about, and understanding the self",
  neural_circuit: ["mPFC", "PCC", "insula"],
  notes: "Neurobiological anchor for IFS Self-energy, ACT Observing Self, DBT Wise Mind"
};

MERGE (rdoc_affiliation:RDoCConstruct {id: "rdoc_affiliation"})
SET rdoc_affiliation += {
  name: "Affiliation and Attachment",
  domain: "Systems for Social Processes",
  description: "Engagement in positive social interactions and formation of social bonds",
  neural_circuit: ["hypothalamus", "mPFC", "nucleus_accumbens"],
  neurochemical: ["oxytocin", "dopamine"],
  therapeutic_targets: ["IFS", "Polyvagal co-regulation"]
};


// ============================================================
// WINDOW OF TOLERANCE
// Per domain expert: "Serves as the overarching physiological
// model for the knowledge graph"
// ============================================================

MERGE (window_of_tolerance:TherapyConcept {id: "window_of_tolerance"})
SET window_of_tolerance += {
  name: "Window of Tolerance",
  description: "Range of optimal arousal within which a person can function effectively; integrates Siegel's interpersonal neurobiology with Polyvagal Theory",
  modality: "cross_modality",
  founder: "Dan Siegel",
  zones: ["Optimal Zone", "Hyperarousal", "Hypoarousal"]
};

MERGE (optimal_zone:TherapyConcept {id: "wot_optimal_zone"})
SET optimal_zone += {
  name: "Optimal Arousal Zone",
  description: "Ventral Vagal state; emotional/physiological equilibrium; CEN active; adaptable, flexible thinking",
  modality: "Window of Tolerance",
  autonomic_state: "ventral_vagal",
  characteristics: ["emotional equilibrium", "adaptability", "flexible thinking", "social engagement"]
};

MERGE (hyperarousal_zone:TherapyConcept {id: "wot_hyperarousal"})
SET hyperarousal_zone += {
  name: "Hyperarousal Zone",
  description: "Sympathetic/Fight-Flight activation; amygdala distress signals; PFC deactivation; inhibited speech and rational decision-making",
  modality: "Window of Tolerance",
  autonomic_state: "sympathetic",
  characteristics: ["panic", "rage", "hypervigilance", "racing thoughts", "impulsivity"]
};

MERGE (hypoarousal_zone:TherapyConcept {id: "wot_hypoarousal"})
SET hypoarousal_zone += {
  name: "Hypoarousal Zone",
  description: "Dorsal Vagal/Freeze-Shutdown; emotional numbing, dissociation, flat affect, reduced heart rate",
  modality: "Window of Tolerance",
  autonomic_state: "dorsal_vagal",
  characteristics: ["numbness", "dissociation", "flat affect", "collapse", "shutdown"]
};

MERGE (frozen_flight:TherapyConcept {id: "wot_frozen_flight"})
SET frozen_flight += {
  name: "Frozen Flight State",
  description: "Co-activation of high SNS + high PNS; 'deer in headlights' presentation with muscle rigidity",
  modality: "Window of Tolerance",
  autonomic_state: "mixed",
  characteristics: ["muscle rigidity", "frozen terror", "immobility with high arousal"]
};


// ============================================================
// ADDITIONAL BRAIN STRUCTURES (Required by Expert)
// ============================================================

MERGE (atl:BrainStructure {id: "atl"})
SET atl += {
  name: "Anterior Temporal Lobe",
  description: "Anterior temporal cortex; social semantic knowledge, conceptual processing, guilt-related cognition",
  aliases: ["ATL", "anterior temporal cortex"],
  level: "cortical",
  functions: ["social_semantic_knowledge", "conceptual_processing"]
};

MERGE (visual_cortex:BrainStructure {id: "visual_cortex"})
SET visual_cortex += {
  name: "Visual Cortex",
  description: "Occipital cortex; visual processing; involved in mental imagery of critical observers (shame)",
  aliases: ["V1", "occipital cortex"],
  level: "cortical"
};

MERGE (cerebellum:BrainStructure {id: "cerebellum"})
SET cerebellum += {
  name: "Cerebellum",
  description: "Coordination, motor learning, cognitive functions; involved in fear extinction",
  level: "subcortical"
};


// ============================================================
// EMDR CONSOLIDATION MECHANISMS
// Per expert: "Link AIP model to hippocampal-cortical transfer
// mediated by 40 Hz Gamma Band oscillations"
// ============================================================

MERGE (emdr_consolidation:TherapyConcept {id: "emdr_consolidation"})
SET emdr_consolidation += {
  name: "Memory Consolidation Process",
  description: "Transfer of traumatic memories from hippocampus-amygdala complex to neocortex; shifts from implicit to explicit memory",
  modality: "EMDR",
  mechanism: "hippocampal_cortical_transfer"
};

MERGE (gamma_oscillations:TherapyConcept {id: "emdr_gamma"})
SET gamma_oscillations += {
  name: "Gamma Band Oscillations (40 Hz)",
  description: "Neural oscillations that solve the 'binding problem' by synchronizing neuronal assemblies across sensory and emotional areas",
  modality: "EMDR",
  frequency: "40 Hz",
  function: "Unbinding memory from limbic system, linking with mPFC"
};

MERGE (memory_reconsolidation:TherapyConcept {id: "emdr_reconsolidation"})
SET memory_reconsolidation += {
  name: "Memory Reconsolidation",
  description: "Process by which reactivated memories become labile and can be modified before re-storage",
  modality: "EMDR",
  mechanism: "reactivation_modification_restabilization"
};


// ============================================================
// ENHANCED SELF-CONSCIOUS AFFECT MODEL
// Per expert: "Shame and guilt possess distinct cognitive
// structures, neural signatures, and action tendencies"
// ============================================================

// Note: Enhancing existing shame/guilt with more specific properties
// The base nodes exist; adding supplementary detail nodes

MERGE (shame_neural_signature:NeuralSignature {id: "shame_neural"})
SET shame_neural_signature += {
  name: "Shame Neural Signature",
  emotion: "shame",
  primary_hubs: ["dlPFC", "PCC", "dACC", "sensory_motor_cortex", "visual_cortex"],
  subcortical: ["amygdala", "posterior_insula"],
  evaluative_focus: "Global Self ('I am defective')",
  action_tendency: "behavioral_inhibition, hiding, submission",
  autonomic_shift: "dorsal_vagal_collapse",
  clinical_implication: "High risk for Depression, BPD, Suicidality",
  trait_vulnerability: true,
  notes: "Hypersensitivity persists even in remission (trait marker for depression)"
};

MERGE (guilt_neural_signature:NeuralSignature {id: "guilt_neural"})
SET guilt_neural_signature += {
  name: "Guilt Neural Signature",
  emotion: "guilt",
  primary_hubs: ["TPJ", "ATL", "dmPFC"],
  shared_core: ["anterior_insula", "dACC"],
  evaluative_focus: "Specific Behavior ('I did something wrong')",
  action_tendency: "reparation, prosocial behavior, empathy",
  clinical_implication: "Often adaptive; maladaptive if ruminative",
  notes: "Increases empathic concern and prosociality (other-oriented)"
};

MERGE (social_pain:NeuralSignature {id: "social_pain_neural"})
SET social_pain += {
  name: "Social Pain Neural Signature",
  description: "Neural response to social exclusion/rejection",
  primary_hubs: ["dACC", "anterior_insula", "thalamus"],
  overlap_with: ["physical_pain"],
  related_emotions: ["shame", "rejection", "loneliness"]
};


// ============================================================
// CPT NEURAL DISSOCIATION
// Per expert: "Clear dissociation between left PFC (retrieval
// demand) and left ACC (goal-relevant control demand)"
// ============================================================

MERGE (cpt_retrieval_demand:TherapyConcept {id: "cpt_retrieval"})
SET cpt_retrieval_demand += {
  name: "Memory Retrieval Demand",
  description: "Left PFC (BA 9/46) activity reflecting effort to retrieve adaptive thoughts; decreases as therapy progresses",
  modality: "CPT",
  neural_hub: "left_dlPFC",
  change_direction: "decreases with treatment",
  notes: "Reflects 'ease of retrieval' for balanced beliefs"
};

MERGE (cpt_control_demand:TherapyConcept {id: "cpt_control"})
SET cpt_control_demand += {
  name: "Goal-Relevant Control Demand",
  description: "Left ACC (BA 24/32) activity reflecting monitoring required to override traumatic schemas; may increase with skill refinement",
  modality: "CPT",
  neural_hub: "left_ACC",
  change_direction: "may increase with skill refinement",
  notes: "High-level monitoring to override deeply ingrained schemas"
};


// ============================================================
// ADDITIONAL BRAIN STRUCTURES FOR ACTIVATION PATTERNS
// These structures are referenced by patterns but weren't in base schema
// ============================================================

// PAG Subdivisions (base pag is too general for pattern specificity)
MERGE (dlpag:BrainStructure {id: "dlpag"})
SET dlpag += {
  name: "Dorsolateral Periaqueductal Gray",
  description: "Active defense component of PAG; involved in fight/flight responses and emotional flooding",
  aliases: ["dlPAG"],
  level: "brainstem",
  parent_structure: "pag"
};

MERGE (vlpag:BrainStructure {id: "vlpag"})
SET vlpag += {
  name: "Ventrolateral Periaqueductal Gray",
  description: "Passive defense coordinator; mediates freezing, immobility, and conservation responses",
  aliases: ["vlPAG"],
  level: "brainstem",
  parent_structure: "pag"
};

// Inferior Frontal Gyrus (behavioral inhibition in social threat)
MERGE (ifg:BrainStructure {id: "ifg"})
SET ifg += {
  name: "Inferior Frontal Gyrus",
  description: "Involved in response inhibition, language processing, and behavioral inhibition (urge to hide in shame)",
  aliases: ["IFG", "Broca's area (pars opercularis)"],
  level: "cortical"
};

// Premotor Cortex (behavioral inhibition)
MERGE (premotor:BrainStructure {id: "premotor_cortex"})
SET premotor += {
  name: "Premotor Cortex",
  description: "Motor planning and preparation; involved in behavioral inhibition during social threat",
  aliases: ["PMC", "premotor area"],
  level: "cortical"
};

// Dorsal Striatum (separate from NAc for goal initiation)
MERGE (dorsal_striatum:BrainStructure {id: "dorsal_striatum"})
SET dorsal_striatum += {
  name: "Dorsal Striatum",
  description: "Caudate and putamen; action selection, goal initiation, and habit formation",
  aliases: ["caudate-putamen"],
  level: "subcortical"
};

// Precuneus (DMN core, depersonalization)
MERGE (precuneus:BrainStructure {id: "precuneus"})
SET precuneus += {
  name: "Precuneus",
  description: "Medial parietal cortex; self-referential processing, autobiographical memory, DMN hub",
  aliases: ["medial parietal cortex"],
  level: "cortical"
};


// ============================================================
// ACTIVATION PATTERNS (8 Core + 2 Phase-2)
// Evidence Grades: Strong | Moderate-Strong | Moderate | Emerging
// ============================================================

// Pattern 1: Acute Alarm
MERGE (acute_alarm:ActivationPattern {id: "acute_alarm"})
SET acute_alarm += {
  userFacingLabel: "Your brain's alarm system is activated right now",
  description: "Phasic/immediate threat response with amygdala-driven arousal and suppressed prefrontal regulation",
  evidenceGrade: "Strong",
  expertConsensus: "4/4",
  keyCitations: ["Shin & Liberzon (2010)", "LeDoux (2016)", "Rauch/Shin/Phelps (2006)", "Reyes et al. (2025, LC-NE)"],
  clinicalNotes: "BNST involvement scales with sustained/uncertain threat. LC-NE amplifies arousal. Hippocampus suppression = contextual safety signaling less effective.",
  safetyConstraints: ["Do not say 'amygdala hijacking'", "Frame as current state not trait", "Use 'right now' not 'you tend to'"]
};

// Pattern 2: Chronic Vigilance
MERGE (chronic_vigilance:ActivationPattern {id: "chronic_vigilance"})
SET chronic_vigilance += {
  userFacingLabel: "Your attention is locked onto what could go wrong",
  description: "Sustained/anticipatory threat processing with BNST as primary driver; radar stuck on mode",
  evidenceGrade: "Moderate-Strong",
  expertConsensus: "4/4 confirmed as distinct from acute alarm",
  keyCitations: ["Somerville et al. (BNST threat proximity)", "Klumpers et al. (BNST vs amygdala)", "Shackman & Fox (extended amygdala)", "Petranu et al. (BNST in PTSD)"],
  clinicalNotes: "BNST specialized for defensive distance. Treatment levers: attentional retraining and safety-signal conditioning vs autonomic downshift for acute alarm.",
  safetyConstraints: ["Superior colliculus REJECTED as core node - sparse human fMRI evidence"]
};

// Pattern 3: Emotional Flooding
MERGE (emotional_flooding:ActivationPattern {id: "emotional_flooding"})
SET emotional_flooding += {
  userFacingLabel: "Your feelings are hitting all at once",
  description: "PFC essentially offline; salience network overloaded; cognitive tools will fail in this state",
  evidenceGrade: "Moderate-Strong",
  expertConsensus: "4/4 confirmed as clinically distinct from acute alarm",
  keyCitations: ["Shin & Liberzon (2010)", "SN hyperreactivity literature", "PAG-insula disinhibition (emerging)"],
  clinicalNotes: "OFC suppression is key differentiator - cannot reason about emotion. MUST recommend bottom-up autonomic tools: cold water, paced breathing, PMR. dlPAG involvement (active defense) included with moderate evidence.",
  safetyConstraints: ["Screen for self-harm risk when 'out of control' reported", "Emergency state - present tools immediately with minimal cognitive demand", "No browsing, 1-2 options max"]
};

// Pattern 4: Conservation/Freeze
MERGE (conservation_freeze:ActivationPattern {id: "conservation_freeze"})
SET conservation_freeze += {
  userFacingLabel: "Your system is conserving energy right now",
  description: "PAG-centered shutdown/freeze; global dampening with no single dominant network",
  evidenceGrade: "Moderate",
  expertConsensus: "3/4 on PAG-centered mechanism; polyvagal framing contested",
  keyCitations: ["Roelofs (2017, freezing model)", "Kozlowska et al. (defense cascade)", "human freezing/bradycardia PAG literature"],
  subtype: ["freeze_high_arousal", "collapse_low_arousal"],
  clinicalNotes: "Model PAG as coordinator NOT 'Dorsal Vagal Complex'. Use neutral ANS terminology. Thalamic suppression reduces sensory bandwidth contributing to dissociative experiences.",
  safetyConstraints: ["CRITICAL: Traditional calming tools may worsen state", "Do NOT recommend deep breathing or meditation", "Favor gentle up-regulation: cold water, proprioceptive input, micro-movements", "Pulling out too quickly can trigger rebound panic"]
};

// Pattern 5: Dissociation/Overmodulation
MERGE (dissociation_overmodulation:ActivationPattern {id: "dissociation_overmodulation"})
SET dissociation_overmodulation += {
  userFacingLabel: "Your mind is protecting you by disconnecting",
  description: "PFC OVER-active suppressing limbic response; distinct from global dampening of conservation_freeze",
  evidenceGrade: "Strong within PTSD-dissociative subtype; Moderate for broader DPDR",
  expertConsensus: "3/4 explicitly separated from shutdown",
  keyCitations: ["Lanius (2010, 2012, dissociative PTSD)", "Modesti et al. (2022 review)", "Murphy et al. (2023 DPDR overview)"],
  clinicalNotes: "Control tower actively silencing alarms. Needs interoceptive reconnection - slowly re-establishing contact with suppressed body signals. Amygdala SUPPRESSION is defining feature.",
  safetyConstraints: ["Dissociation + suicidal ideation = escalation pathway", "Do NOT suggest heavy interoceptive exposure without titration", "Somatic Experiencing and gentle proprioceptive input are safer entry points"]
};

// Pattern 6: Rumination Loop
MERGE (rumination_loop:ActivationPattern {id: "rumination_loop"})
SET rumination_loop += {
  userFacingLabel: "Your mind is stuck on replay",
  description: "DMN hyperactivity with sgACC coupling; self-referential processing infused with negative valence",
  evidenceGrade: "Strong for depressive rumination; Moderate for anxious worry",
  expertConsensus: "4/4 confirmed core DMN hyperactivity model",
  keyCitations: ["Hamilton et al. (2015, DMN-rumination meta-analytic)", "Zhou et al. (2020, rumination meta-analysis)", "Menon (2023, DMN review)"],
  subtype: ["depressive_brooding", "anxious_worry"],
  clinicalNotes: "DMN and sgPFC create caustic compound when functionally linked. dlPFC suppression NOT universal - may be active but failing in anxious worry. Break the link via task-positive activities requiring external focus. Mindfulness can backfire by increasing internal focus.",
  safetyConstraints: ["If ruminative content involves suicidal ideation trigger crisis pathways", "Do not use 'brain is broken' framing"]
};

// Pattern 7: Reward Drive Low
MERGE (reward_drive_low:ActivationPattern {id: "reward_drive_low"})
SET reward_drive_low += {
  userFacingLabel: "Your motivation system is idling right now",
  description: "Ventral striatal blunting with reduced dopamine signaling; positive valence system under-engaged",
  evidenceGrade: "Strong for ventral striatal blunting; Moderate for inflammation mechanism",
  expertConsensus: "4/4 on core, 2/4 on inflammation mechanism",
  keyCitations: ["Keren et al. (2018, reward meta-analysis)", "Ng et al. (2019)", "Halahakoon et al. (2020)", "inflammation-DA convergence reviews"],
  clinicalNotes: "Frame as 'reward system under-engaged' not single-cause. Inflammation→dopamine suppression is emerging evidence only - NOT inferable from self-report. High-effort goal setting may backfire. Recommend low-friction behavioral activation with small immediate sensory rewards.",
  safetyConstraints: ["Screen for MDE if anhedonia pervasive across multiple check-ins", "Consider fatigue/inflammation screening if persistent", "Do NOT imply 'not trying hard enough'"]
};

// Pattern 8: Social Threat/Shame
MERGE (social_threat_shame:ActivationPattern {id: "social_threat_shame"})
SET social_threat_shame += {
  userFacingLabel: "Your brain is treating social evaluation like danger",
  description: "Self-evaluation-forward rather than amygdala-forward; intense Theory-of-Mind engagement modeling negative gaze of others",
  evidenceGrade: "Moderate-Strong",
  expertConsensus: "4/4 confirmed as distinct from general anxiety",
  keyCitations: ["Eisenberger (2012, social pain)", "Piretti et al. (2023 meta-analysis)", "Eslinger (2021, social feelings review)", "voxel-based shame/embarrassment analyses"],
  subtype: ["shame", "social_rejection", "guilt"],
  clinicalNotes: "Shame activates behavioral inhibition (hide/freeze). Guilt activates TPJ/reparative action. Social rejection activates dACC/insula pain. vmPFC suppression is state-dependent. Can trigger reactive aggression to regain social status.",
  safetyConstraints: ["Emphasize self-compassion and common humanity", "Avoid tools that increase self-focus (journaling may amplify shame)", "Do not suggest hopelessness/worthlessness as co-occurring without extreme care"]
};

// Phase-2 Pattern A: Grief/Yearning
MERGE (grief_yearning:ActivationPattern {id: "grief_yearning"})
SET grief_yearning += {
  userFacingLabel: "Your attachment system is reaching for who is gone",
  description: "NAc/ventral striatum yearning/craving, PCC autobiographical memory, amygdala distress",
  evidenceGrade: "Moderate",
  expertConsensus: "2/4 include in core, 1/4 phase-2, 1/4 reject",
  keyCitations: ["O'Connor et al. (2008)", "Kakarala et al. (2020)"],
  phaseRelease: "phase_2",
  clinicalNotes: "NAc findings specific to PROLONGED/COMPLICATED grief. Do not generalize to all grief.",
  safetyConstraints: ["Never use 'moving on' language", "Focus on integrated memory and meaning-making", "Do not pathologize normal grief trajectories"]
};

// Phase-2 Pattern B: Reactive Aggression
MERGE (reactive_aggression:ActivationPattern {id: "reactive_aggression"})
SET reactive_aggression += {
  userFacingLabel: "Your protection system is translating stress into anger",
  description: "Amygdala-hypothalamus-PAG attack circuit with suppressed regulatory PFC nodes",
  evidenceGrade: "Moderate-Strong",
  expertConsensus: "3/4 include, 1/4 omit from initial release",
  keyCitations: ["hypothalamic-limbic attack circuit literature", "amygdala/PAG meta-analytic evidence"],
  phaseRelease: "phase_2",
  clinicalNotes: "Higher safety complexity. Tools must discharge sympathetic energy safely before cognitive tools. Affect labeling re-engages vlPFC. High association with hostile attribution bias.",
  safetyConstraints: ["Proactive/instrumental aggression REJECTED for all releases", "Only reactive aggression modeled", "Requires careful tool sequencing to avoid escalation"]
};


// ============================================================
// STATE MODULATORS
// Attach to any pattern via MODULATED_BY relationship
// Explain why same pattern feels different on different days
// ============================================================

MERGE (sleep_loss:StateModulator {id: "sleep_loss_sensitization"})
SET sleep_loss += {
  userFacingLabel: "Poor sleep is turning up the volume on your emotions",
  description: "Increases amygdala reactivity, decreases PFC-amygdala coupling, increases SN bias",
  evidenceGrade: "Strong",
  expertConsensus: "4/4",
  keyCitations: ["Yoo et al. (2007) + replications"],
  duration: "hours_to_days",
  effectOnPatterns: "Amygdala reactivity increases; PFC-amygdala coupling decreases; SN bias increases",
  toolSequencing: "Address sleep first before expecting cognitive tools to work",
  safetyConstraints: ["Insomnia with significant impairment should route to clinical referral"]
};

MERGE (acute_stress_catecholamine:StateModulator {id: "acute_stress_catecholamine"})
SET acute_stress_catecholamine += {
  userFacingLabel: "Stress is switching off your planning circuits right now",
  description: "dlPFC working memory and top-down control degraded; habit/limbic circuits gain dominance",
  evidenceGrade: "Strong",
  expertConsensus: "3/4 explicit, 1/4 implicit",
  keyCitations: ["Arnsten 2015", "Gamo & Arnsten 2015"],
  duration: "minutes_to_hours",
  effectOnPatterns: "dlPFC working memory degraded; habit/limbic circuits dominant",
  toolSequencing: "Reduce stress load before attempting executive-function-dependent tools (reappraisal, planning)",
  safetyConstraints: ["Model as state node not trait - this is reversible"]
};

MERGE (interoceptive_threat_bias:StateModulator {id: "interoceptive_threat_bias"})
SET interoceptive_threat_bias += {
  userFacingLabel: "Your body signals feel noisy or threatening right now",
  description: "Anterior insula and dACC hyperprecision; body signals interpreted as threats; worsens panic and health anxiety",
  evidenceGrade: "Moderate-Strong",
  expertConsensus: "2/4 explicit",
  keyCitations: ["Khalsa et al. (2018)", "Paulus et al. (2019)", "Kleckner et al. (2017)"],
  duration: "variable",
  effectOnPatterns: "Body signals interpreted as threats; worsens panic, health anxiety; distinguishes from externally-focused Patterns 1-2",
  toolSequencing: "Interoceptive recalibration tools",
  safetyConstraints: ["Avoid deterministic claims", "Do NOT say 'your insula is broken'"]
};


// ============================================================
// SAFETY FLAGS
// Crisis escalation triggers for pattern-safety integration
// ============================================================

MERGE (crisis_suicidal:SafetyFlag {id: "crisis_suicidal"})
SET crisis_suicidal += {
  type: "crisis",
  trigger: "Suicidal ideation in any pattern",
  action: "Immediate cessation of tool recommendation; present safety resources",
  doNot: "Attempt to 'modulate' or offer coping tools"
};

MERGE (crisis_self_harm:SafetyFlag {id: "crisis_self_harm"})
SET crisis_self_harm += {
  type: "crisis",
  trigger: "Self-harm urges + 'out of control'",
  action: "Safety anchor (crisis line, emergency contact) BEFORE any tool",
  doNot: "Recommend distress tolerance tools as primary response"
};

MERGE (clinical_referral_shutdown:SafetyFlag {id: "clinical_referral_shutdown"})
SET clinical_referral_shutdown += {
  type: "clinical_referral",
  trigger: "Persistent shutdown (7+ consecutive days of numb/empty)",
  action: "Flag potential chronic dysfunction; recommend professional evaluation",
  doNot: "Continue offering app-based tools as if they're sufficient"
};

MERGE (clinical_referral_psychosis:SafetyFlag {id: "clinical_referral_psychosis"})
SET clinical_referral_psychosis += {
  type: "clinical_referral",
  trigger: "Psychotic symptoms (hallucinations, delusions)",
  action: "Acknowledge experience without validating; offer referral",
  doNot: "Attempt reality testing or reappraisal"
};

MERGE (clinical_referral_severe_dissociation:SafetyFlag {id: "clinical_referral_severe_dissociation"})
SET clinical_referral_severe_dissociation += {
  type: "clinical_referral",
  trigger: "Severe dissociation (user cannot orient to present)",
  action: "Gentle grounding only; redirect to professional support",
  doNot: "Push interoceptive exposure or trauma processing"
};


// ============================================================
// ADDITIONAL EMOTIONS (for Opposite Emotion mapping)
// ============================================================

MERGE (apathy:Emotion {id: "apathy"})
SET apathy += {
  name: "Apathy",
  description: "Lack of interest, enthusiasm, or concern; flat affect",
  valence: "negative",
  arousal: "low",
  quadrant: "low-unpleasant"
};

MERGE (hostility:Emotion {id: "hostility"})
SET hostility += {
  name: "Hostility",
  description: "Antagonistic state involving opposition or resistance",
  valence: "negative",
  arousal: "high",
  quadrant: "high-unpleasant"
};

MERGE (humility:Emotion {id: "humility"})
SET humility += {
  name: "Humility",
  description: "Modest view of one's importance; freedom from pride or arrogance",
  valence: "positive",
  arousal: "low",
  quadrant: "low-pleasant"
};
