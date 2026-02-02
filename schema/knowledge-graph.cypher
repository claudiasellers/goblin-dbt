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
// ============================================================


// ============================================================
// BRAIN STRUCTURES - CORTICAL
// ============================================================

CREATE (pfc:BrainStructure {
  id: "pfc",
  name: "Prefrontal Cortex",
  description: "Anterior part of the frontal lobes; executive control center",
  aliases: ["PFC"],
  level: "cortical"
})

CREATE (dlpfc:BrainStructure {
  id: "dlpfc",
  name: "Dorsolateral Prefrontal Cortex",
  description: "Lateral portion of Brodmann areas 9 and 46; working memory, cognitive flexibility",
  aliases: ["dlPFC", "BA9/46"],
  level: "cortical"
})

CREATE (vmpfc:BrainStructure {
  id: "vmpfc",
  name: "Ventromedial Prefrontal Cortex",
  description: "Medial surface of PFC; emotion regulation, value-based decision making, fear extinction",
  aliases: ["vmPFC"],
  level: "cortical"
})

CREATE (ofc:BrainStructure {
  id: "ofc",
  name: "Orbitofrontal Cortex",
  description: "Above the orbits; reward processing, impulse control, social behavior",
  aliases: ["OFC"],
  level: "cortical"
})

CREATE (mpfc:BrainStructure {
  id: "mpfc",
  name: "Medial Prefrontal Cortex",
  description: "Medial surface of PFC; self-referential processing, social cognition, self-conscious emotions",
  aliases: ["mPFC"],
  level: "cortical"
})

CREATE (acc:BrainStructure {
  id: "acc",
  name: "Anterior Cingulate Cortex",
  description: "Frontal part of cingulate cortex; error detection, conflict monitoring, emotion",
  aliases: ["ACC"],
  level: "cortical"
})

CREATE (dacc:BrainStructure {
  id: "dacc",
  name: "Dorsal Anterior Cingulate Cortex",
  description: "Cognitive division of ACC; error monitoring, cognitive control",
  aliases: ["dACC"],
  level: "cortical"
})

CREATE (vacc:BrainStructure {
  id: "vacc",
  name: "Ventral Anterior Cingulate Cortex",
  description: "Affective division of ACC; emotional processing, autonomic regulation",
  aliases: ["vACC", "subgenual ACC", "sgACC"],
  level: "cortical"
})

CREATE (pcc:BrainStructure {
  id: "pcc",
  name: "Posterior Cingulate Cortex",
  description: "Posterior part of cingulate cortex; self-referential thought, autobiographical memory, DMN hub",
  aliases: ["PCC"],
  level: "cortical"
})

CREATE (insula:BrainStructure {
  id: "insula",
  name: "Insula",
  description: "Deep within lateral sulcus; interoception, emotional awareness, empathy",
  aliases: ["insular cortex", "Island of Reil"],
  level: "cortical"
})

CREATE (anterior_insula:BrainStructure {
  id: "anterior_insula",
  name: "Anterior Insula",
  description: "Rostral insula; emotional awareness, subjective feelings, empathy, disgust",
  aliases: ["AI"],
  level: "cortical"
})

CREATE (posterior_insula:BrainStructure {
  id: "posterior_insula",
  name: "Posterior Insula",
  description: "Caudal insula; basic interoception, pain processing, temperature",
  aliases: ["PI"],
  level: "cortical"
})

CREATE (temporal_cortex:BrainStructure {
  id: "temporal_cortex",
  name: "Temporal Cortex",
  description: "Lateral brain region; auditory processing, language comprehension, semantic memory",
  aliases: ["temporal lobe"],
  level: "cortical"
})

CREATE (angular_gyrus:BrainStructure {
  id: "angular_gyrus",
  name: "Angular Gyrus",
  description: "Posterior parietal region; semantic processing, theory of mind, DMN component",
  aliases: ["AG", "BA39"],
  level: "cortical"
})

CREATE (parietal_cortex:BrainStructure {
  id: "parietal_cortex",
  name: "Parietal Cortex",
  description: "Superior brain region; spatial processing, attention, body awareness",
  aliases: ["parietal lobe"],
  level: "cortical"
})

CREATE (somatosensory_cortex:BrainStructure {
  id: "somatosensory_cortex",
  name: "Somatosensory Cortex",
  description: "Postcentral gyrus; body sensation, touch, proprioception, body map",
  aliases: ["S1", "primary somatosensory"],
  level: "cortical"
})

CREATE (motor_cortex:BrainStructure {
  id: "motor_cortex",
  name: "Motor Cortex",
  description: "Precentral gyrus; voluntary movement initiation and control",
  aliases: ["M1", "primary motor"],
  level: "cortical"
})

CREATE (fef:BrainStructure {
  id: "fef",
  name: "Frontal Eye Fields",
  description: "Prefrontal region controlling voluntary eye movements and visual attention",
  aliases: ["FEF"],
  level: "cortical"
})

CREATE (ips:BrainStructure {
  id: "ips",
  name: "Intraparietal Sulcus",
  description: "Parietal region for attention, eye movements, reaching",
  aliases: ["IPS"],
  level: "cortical"
})

CREATE (tpj:BrainStructure {
  id: "tpj",
  name: "Temporoparietal Junction",
  description: "Junction of temporal and parietal lobes; theory of mind, attention reorienting",
  aliases: ["TPJ"],
  level: "cortical"
})


// ============================================================
// BRAIN STRUCTURES - SUBCORTICAL
// ============================================================

CREATE (amygdala:BrainStructure {
  id: "amygdala",
  name: "Amygdala",
  description: "Almond-shaped nuclei in temporal lobes; fear, threat detection, emotional memory",
  aliases: ["amygdaloid complex"],
  level: "subcortical"
})

CREATE (bla:BrainStructure {
  id: "bla",
  name: "Basolateral Amygdala",
  description: "Receives sensory input; fear learning and memory consolidation",
  aliases: ["BLA"],
  level: "subcortical"
})

CREATE (cea:BrainStructure {
  id: "cea",
  name: "Central Amygdala",
  description: "Output nucleus; orchestrates fear responses via brainstem",
  aliases: ["CeA"],
  level: "subcortical"
})

CREATE (hippocampus:BrainStructure {
  id: "hippocampus",
  name: "Hippocampus",
  description: "Seahorse-shaped structure; memory formation, spatial navigation, contextual processing",
  aliases: ["hippo"],
  level: "subcortical"
})

CREATE (hypothalamus:BrainStructure {
  id: "hypothalamus",
  name: "Hypothalamus",
  description: "Below thalamus; homeostasis, stress response (HPA axis), autonomic control",
  aliases: [],
  level: "subcortical"
})

CREATE (thalamus:BrainStructure {
  id: "thalamus",
  name: "Thalamus",
  description: "Relay station for sensory and motor signals to cortex; attentional gating",
  aliases: [],
  level: "subcortical"
})

CREATE (basal_ganglia:BrainStructure {
  id: "basal_ganglia",
  name: "Basal Ganglia",
  description: "Group of nuclei; motor control, habit formation, procedural learning, reward",
  aliases: ["striatum complex"],
  level: "subcortical"
})

CREATE (nucleus_accumbens:BrainStructure {
  id: "nucleus_accumbens",
  name: "Nucleus Accumbens",
  description: "Ventral striatum; reward, motivation, pleasure, addiction",
  aliases: ["NAcc", "NAc"],
  level: "subcortical"
})

CREATE (bed_nucleus:BrainStructure {
  id: "bnst",
  name: "Bed Nucleus of the Stria Terminalis",
  description: "Extended amygdala; sustained/anticipatory anxiety (vs acute fear in amygdala)",
  aliases: ["BNST"],
  level: "subcortical"
})


// ============================================================
// BRAIN STRUCTURES - BRAINSTEM
// ============================================================

CREATE (vta:BrainStructure {
  id: "vta",
  name: "Ventral Tegmental Area",
  description: "Midbrain dopamine source; reward, motivation, reinforcement learning",
  aliases: ["VTA"],
  level: "brainstem"
})

CREATE (periaqueductal_gray:BrainStructure {
  id: "pag",
  name: "Periaqueductal Gray",
  description: "Midbrain; pain modulation, defensive behaviors, panic responses, autonomic control",
  aliases: ["PAG"],
  level: "brainstem"
})

CREATE (locus_coeruleus:BrainStructure {
  id: "locus_coeruleus",
  name: "Locus Coeruleus",
  description: "Brainstem norepinephrine source; arousal, attention, stress response, vigilance",
  aliases: ["LC"],
  level: "brainstem"
})

CREATE (raphe_nuclei:BrainStructure {
  id: "raphe_nuclei",
  name: "Raphe Nuclei",
  description: "Brainstem serotonin source; mood, sleep, anxiety regulation",
  aliases: ["raphe"],
  level: "brainstem"
})


// ============================================================
// FUNCTIONAL NETWORKS
// ============================================================

CREATE (dmn:FunctionalNetwork {
  id: "dmn",
  name: "Default Mode Network",
  description: "Active during rest, self-referential thought, mind-wandering, autobiographical memory",
  aliases: ["DMN", "task-negative network"]
})

CREATE (salience:FunctionalNetwork {
  id: "salience_network",
  name: "Salience Network",
  description: "Detects and filters salient stimuli, switches between DMN and CEN",
  aliases: ["SN"]
})

CREATE (cen:FunctionalNetwork {
  id: "cen",
  name: "Central Executive Network",
  description: "Goal-directed behavior, working memory, decision making, cognitive control",
  aliases: ["CEN", "frontoparietal network", "task-positive network"]
})

CREATE (limbic_network:FunctionalNetwork {
  id: "limbic_network",
  name: "Limbic Network",
  description: "Emotional processing, memory, motivation",
  aliases: ["affective network"]
})

CREATE (sensorimotor_network:FunctionalNetwork {
  id: "sensorimotor_network",
  name: "Sensorimotor Network",
  description: "Motor execution and sensory processing",
  aliases: ["SMN"]
})

CREATE (dan:FunctionalNetwork {
  id: "dan",
  name: "Dorsal Attention Network",
  description: "Top-down attentional control, goal-directed attention",
  aliases: ["DAN"]
})

CREATE (van:FunctionalNetwork {
  id: "van",
  name: "Ventral Attention Network",
  description: "Bottom-up attention, detecting unexpected/salient stimuli",
  aliases: ["VAN"]
})


// ============================================================
// NEUROCHEMICAL SYSTEMS
// (Renamed from NeurotransmitterSystem for accuracy)
// ============================================================

CREATE (dopamine:NeurochemicalSystem {
  id: "dopamine",
  name: "Dopamine System",
  molecule: "Dopamine",
  type: "monoamine_neurotransmitter",
  abbreviation: "DA",
  functions: ["reward", "motivation", "movement", "learning", "salience"]
})

CREATE (serotonin:NeurochemicalSystem {
  id: "serotonin",
  name: "Serotonin System",
  molecule: "Serotonin",
  type: "monoamine_neurotransmitter",
  abbreviation: "5-HT",
  functions: ["mood", "anxiety", "sleep", "appetite", "impulse control"]
})

CREATE (norepinephrine:NeurochemicalSystem {
  id: "norepinephrine",
  name: "Norepinephrine System",
  molecule: "Norepinephrine",
  type: "monoamine_neurotransmitter",
  abbreviation: "NE",
  functions: ["arousal", "attention", "stress response", "fight-or-flight"]
})

CREATE (gaba:NeurochemicalSystem {
  id: "gaba",
  name: "GABA System",
  molecule: "Gamma-Aminobutyric Acid",
  type: "inhibitory_neurotransmitter",
  abbreviation: "GABA",
  functions: ["inhibition", "anxiety reduction", "sleep", "muscle relaxation"]
})

CREATE (glutamate:NeurochemicalSystem {
  id: "glutamate",
  name: "Glutamate System",
  molecule: "Glutamate",
  type: "excitatory_neurotransmitter",
  abbreviation: "Glu",
  functions: ["excitation", "learning", "memory", "synaptic plasticity", "LTP"]
})

CREATE (acetylcholine:NeurochemicalSystem {
  id: "acetylcholine",
  name: "Acetylcholine System",
  molecule: "Acetylcholine",
  type: "neurotransmitter",
  abbreviation: "ACh",
  functions: ["attention", "memory", "arousal", "muscle activation", "REM sleep"]
})

CREATE (endorphin:NeurochemicalSystem {
  id: "endorphin",
  name: "Endorphin System",
  molecule: "Beta-Endorphin",
  type: "opioid_peptide",
  abbreviation: "β-endorphin",
  functions: ["pain relief", "pleasure", "stress reduction", "reward", "runners high"]
})

CREATE (oxytocin:NeurochemicalSystem {
  id: "oxytocin",
  name: "Oxytocin System",
  molecule: "Oxytocin",
  type: "neuropeptide",
  abbreviation: "OT",
  functions: ["social bonding", "trust", "attachment", "stress reduction", "lactation"]
})

CREATE (cortisol:NeurochemicalSystem {
  id: "cortisol",
  name: "HPA Axis / Cortisol",
  molecule: "Cortisol",
  type: "glucocorticoid_hormone",
  abbreviation: "CORT",
  functions: ["stress response", "metabolism", "immune modulation", "arousal", "memory consolidation"]
})


// ============================================================
// EMOTIONS / AFFECTIVE STATES
// ============================================================

// --- High Energy Unpleasant ---
CREATE (fear:Emotion {
  id: "fear",
  name: "Fear",
  description: "Response to perceived immediate threat or danger",
  valence: "negative",
  arousal: "high",
  quadrant: "high-unpleasant"
})

CREATE (anxiety:Emotion {
  id: "anxiety",
  name: "Anxiety",
  description: "Apprehension about future uncertain threat",
  valence: "negative",
  arousal: "high",
  quadrant: "high-unpleasant"
})

CREATE (anger:Emotion {
  id: "anger",
  name: "Anger",
  description: "Response to perceived threat, injustice, or blocked goals",
  valence: "negative",
  arousal: "high",
  quadrant: "high-unpleasant"
})

CREATE (panic:Emotion {
  id: "panic",
  name: "Panic",
  description: "Intense fear with strong physiological arousal",
  valence: "negative",
  arousal: "very_high",
  quadrant: "high-unpleasant"
})

CREATE (frustration:Emotion {
  id: "frustration",
  name: "Frustration",
  description: "Feeling of being upset due to blocked goals",
  valence: "negative",
  arousal: "high",
  quadrant: "high-unpleasant"
})

CREATE (overwhelm:Emotion {
  id: "overwhelm",
  name: "Overwhelm",
  description: "Feeling of being unable to cope with demands",
  valence: "negative",
  arousal: "high",
  quadrant: "high-unpleasant"
})

CREATE (irritation:Emotion {
  id: "irritation",
  name: "Irritation",
  description: "Mild anger or annoyance",
  valence: "negative",
  arousal: "moderate_high",
  quadrant: "high-unpleasant"
})

CREATE (stress:Emotion {
  id: "stress",
  name: "Stress",
  description: "Mental or emotional strain from demanding circumstances",
  valence: "negative",
  arousal: "high",
  quadrant: "high-unpleasant"
})

CREATE (hot_shame:Emotion {
  id: "hot_shame",
  name: "Hot Shame",
  description: "Acute shame with high arousal - flushing, wanting to flee or hide",
  valence: "negative",
  arousal: "high",
  quadrant: "high-unpleasant"
})

CREATE (rejection:Emotion {
  id: "rejection",
  name: "Rejection",
  description: "Painful feeling of being excluded or unwanted",
  valence: "negative",
  arousal: "moderate_high",
  quadrant: "high-unpleasant"
})

// --- Low Energy Unpleasant ---
CREATE (sadness:Emotion {
  id: "sadness",
  name: "Sadness",
  description: "Response to loss, disappointment, or helplessness",
  valence: "negative",
  arousal: "low",
  quadrant: "low-unpleasant"
})

CREATE (cold_shame:Emotion {
  id: "cold_shame",
  name: "Cold Shame",
  description: "Internalized shame with low arousal - collapse, withdrawal, worthlessness; global negative self-evaluation",
  valence: "negative",
  arousal: "low",
  quadrant: "low-unpleasant",
  evaluative_focus: "Global Self ('I am defective')",
  action_tendency: "hiding, withdrawal, submission",
  trait_vulnerability_marker: true,
  clinical_note: "Hypersensitivity persists even in MDD remission - trait marker for depression"
})

CREATE (guilt:Emotion {
  id: "guilt",
  name: "Guilt",
  description: "Feeling of responsibility for wrongdoing; behavior-specific and other-oriented",
  valence: "negative",
  arousal: "low_to_moderate",
  quadrant: "low-unpleasant",
  evaluative_focus: "Specific Behavior ('I did something wrong')",
  action_tendency: "reparation, apology, prosocial behavior",
  social_orientation: "other-focused",
  clinical_note: "Often adaptive; increases empathic concern; maladaptive when ruminative"
})

CREATE (loneliness:Emotion {
  id: "loneliness",
  name: "Loneliness",
  description: "Painful feeling of social disconnection",
  valence: "negative",
  arousal: "low",
  quadrant: "low-unpleasant"
})

CREATE (hopelessness:Emotion {
  id: "hopelessness",
  name: "Hopelessness",
  description: "Feeling that nothing will improve",
  valence: "negative",
  arousal: "low",
  quadrant: "low-unpleasant"
})

CREATE (emptiness:Emotion {
  id: "emptiness",
  name: "Emptiness",
  description: "Feeling of void or meaninglessness",
  valence: "negative",
  arousal: "low",
  quadrant: "low-unpleasant"
})

CREATE (numbness:Emotion {
  id: "numbness",
  name: "Numbness",
  description: "Emotional blunting or disconnection from feelings",
  valence: "negative",
  arousal: "low",
  quadrant: "low-unpleasant"
})

CREATE (disgust:Emotion {
  id: "disgust",
  name: "Disgust",
  description: "Revulsion response to offensive stimuli",
  valence: "negative",
  arousal: "moderate",
  quadrant: "low-unpleasant"
})

CREATE (boredom:Emotion {
  id: "boredom",
  name: "Boredom",
  description: "Restless dissatisfaction from lack of engagement",
  valence: "negative",
  arousal: "low",
  quadrant: "low-unpleasant"
})

CREATE (disappointment:Emotion {
  id: "disappointment",
  name: "Disappointment",
  description: "Sadness from unmet expectations",
  valence: "negative",
  arousal: "low_to_moderate",
  quadrant: "low-unpleasant"
})

// --- High Energy Pleasant ---
CREATE (joy:Emotion {
  id: "joy",
  name: "Joy",
  description: "Intense happiness and delight",
  valence: "positive",
  arousal: "high",
  quadrant: "high-pleasant"
})

CREATE (excitement:Emotion {
  id: "excitement",
  name: "Excitement",
  description: "Eager anticipation and enthusiasm",
  valence: "positive",
  arousal: "high",
  quadrant: "high-pleasant"
})

CREATE (curiosity:Emotion {
  id: "curiosity",
  name: "Curiosity",
  description: "Desire to learn or know more",
  valence: "positive",
  arousal: "moderate_high",
  quadrant: "high-pleasant"
})

CREATE (pride:Emotion {
  id: "pride",
  name: "Pride",
  description: "Satisfaction from one's achievements",
  valence: "positive",
  arousal: "moderate_high",
  quadrant: "high-pleasant"
})

CREATE (enthusiasm:Emotion {
  id: "enthusiasm",
  name: "Enthusiasm",
  description: "Intense enjoyment and interest",
  valence: "positive",
  arousal: "high",
  quadrant: "high-pleasant"
})

CREATE (hope:Emotion {
  id: "hope",
  name: "Hope",
  description: "Expectation of positive future outcomes",
  valence: "positive",
  arousal: "moderate_high",
  quadrant: "high-pleasant"
})

CREATE (inspiration:Emotion {
  id: "inspiration",
  name: "Inspiration",
  description: "Feeling mentally stimulated to create or act",
  valence: "positive",
  arousal: "high",
  quadrant: "high-pleasant"
})

CREATE (amusement:Emotion {
  id: "amusement",
  name: "Amusement",
  description: "Light-hearted pleasure, often with laughter",
  valence: "positive",
  arousal: "moderate_high",
  quadrant: "high-pleasant"
})

// --- Low Energy Pleasant ---
CREATE (calm:Emotion {
  id: "calm",
  name: "Calm",
  description: "Peaceful, untroubled state",
  valence: "positive",
  arousal: "low",
  quadrant: "low-pleasant"
})

CREATE (contentment:Emotion {
  id: "contentment",
  name: "Contentment",
  description: "Satisfied acceptance of circumstances",
  valence: "positive",
  arousal: "low",
  quadrant: "low-pleasant"
})

CREATE (gratitude:Emotion {
  id: "gratitude",
  name: "Gratitude",
  description: "Appreciation for what one has received",
  valence: "positive",
  arousal: "low_to_moderate",
  quadrant: "low-pleasant"
})

CREATE (love:Emotion {
  id: "love",
  name: "Love",
  description: "Deep affection and attachment",
  valence: "positive",
  arousal: "variable",
  quadrant: "low-pleasant"
})

CREATE (compassion:Emotion {
  id: "compassion",
  name: "Compassion",
  description: "Concern for others' suffering with desire to help",
  valence: "positive",
  arousal: "low_to_moderate",
  quadrant: "low-pleasant"
})

CREATE (serenity:Emotion {
  id: "serenity",
  name: "Serenity",
  description: "Deep peace and tranquility",
  valence: "positive",
  arousal: "low",
  quadrant: "low-pleasant"
})

CREATE (safety:Emotion {
  id: "safety",
  name: "Safety",
  description: "Feeling of security and protection",
  valence: "positive",
  arousal: "low",
  quadrant: "low-pleasant"
})

CREATE (relief:Emotion {
  id: "relief",
  name: "Relief",
  description: "Removal of distress or anxiety",
  valence: "positive",
  arousal: "decreasing",
  quadrant: "low-pleasant"
})

CREATE (trust:Emotion {
  id: "trust",
  name: "Trust",
  description: "Confident reliance on others",
  valence: "positive",
  arousal: "low",
  quadrant: "low-pleasant"
})


// ============================================================
// BODY REGIONS
// ============================================================

CREATE (head_region:BodyRegion {
  id: "head",
  name: "Head",
  includes: ["forehead", "temples", "scalp", "face"]
})

CREATE (throat_region:BodyRegion {
  id: "throat",
  name: "Throat/Neck",
  includes: ["throat", "neck", "jaw"]
})

CREATE (chest_region:BodyRegion {
  id: "chest",
  name: "Chest",
  includes: ["heart area", "lungs", "sternum"]
})

CREATE (stomach_region:BodyRegion {
  id: "stomach",
  name: "Stomach/Gut",
  includes: ["stomach", "solar plexus", "abdomen", "gut"]
})

CREATE (shoulders_region:BodyRegion {
  id: "shoulders",
  name: "Shoulders",
  includes: ["shoulders", "upper back"]
})

CREATE (arms_region:BodyRegion {
  id: "arms",
  name: "Arms/Hands",
  includes: ["arms", "hands", "fingers"]
})

CREATE (legs_region:BodyRegion {
  id: "legs",
  name: "Legs/Feet",
  includes: ["legs", "knees", "feet", "toes"]
})

CREATE (back_region:BodyRegion {
  id: "back",
  name: "Back",
  includes: ["lower back", "mid back", "spine"]
})


// ============================================================
// SENSATION TYPES
// (Removed related_emotions property - using graph edges instead)
// ============================================================

CREATE (tension:SensationType {
  id: "tension",
  name: "Tension/Tightness",
  description: "Muscular contraction or constriction"
})

CREATE (heaviness:SensationType {
  id: "heaviness",
  name: "Heaviness",
  description: "Feeling of weight or burden"
})

CREATE (lightness:SensationType {
  id: "lightness",
  name: "Lightness",
  description: "Feeling of weightlessness or ease"
})

CREATE (heat:SensationType {
  id: "heat",
  name: "Heat/Warmth",
  description: "Sensation of increased temperature"
})

CREATE (cold_sensation:SensationType {
  id: "cold_sensation",
  name: "Cold/Chills",
  description: "Sensation of decreased temperature"
})

CREATE (numbness_sensation:SensationType {
  id: "numbness_sensation",
  name: "Numbness/Tingling",
  description: "Reduced sensation or pins-and-needles"
})

CREATE (pressure:SensationType {
  id: "pressure",
  name: "Pressure",
  description: "Sensation of being pressed upon"
})

CREATE (butterflies:SensationType {
  id: "butterflies",
  name: "Butterflies/Fluttering",
  description: "Light, fluttery sensation often in stomach"
})

CREATE (racing_heart:SensationType {
  id: "racing_heart",
  name: "Racing Heart",
  description: "Rapid or pounding heartbeat"
})

CREATE (constriction:SensationType {
  id: "constriction",
  name: "Constriction",
  description: "Feeling of narrowing or closing"
})

CREATE (expansion:SensationType {
  id: "expansion",
  name: "Expansion/Openness",
  description: "Feeling of opening or broadening"
})

CREATE (shaking:SensationType {
  id: "shaking",
  name: "Shaking/Trembling",
  description: "Involuntary tremors"
})

CREATE (weakness:SensationType {
  id: "weakness",
  name: "Weakness",
  description: "Feeling of reduced strength or stability"
})

CREATE (restlessness:SensationType {
  id: "restlessness",
  name: "Restlessness",
  description: "Inability to be still, urge to move"
})

CREATE (groundedness:SensationType {
  id: "groundedness",
  name: "Groundedness",
  description: "Feeling of stability and connection to ground"
})


// ============================================================
// THERAPEUTIC MODALITIES
// ============================================================

CREATE (ifs:TherapyModality {
  id: "ifs",
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
})

CREATE (dbt:TherapyModality {
  id: "dbt",
  name: "Dialectical Behavior Therapy",
  abbreviation: "DBT",
  founder: "Marsha Linehan",
  description: "Cognitive-behavioral treatment combining change and acceptance strategies",
  modules: ["Mindfulness", "Distress Tolerance", "Emotion Regulation", "Interpersonal Effectiveness"]
})

CREATE (cbt:TherapyModality {
  id: "cbt",
  name: "Cognitive Behavioral Therapy",
  abbreviation: "CBT",
  founder: "Aaron Beck",
  description: "Structured therapy focusing on relationship between thoughts, feelings, behaviors"
})

CREATE (act:TherapyModality {
  id: "act",
  name: "Acceptance and Commitment Therapy",
  abbreviation: "ACT",
  founder: "Steven Hayes",
  description: "Uses acceptance and mindfulness strategies alongside commitment to values-based action"
})

CREATE (emdr:TherapyModality {
  id: "emdr",
  name: "Eye Movement Desensitization and Reprocessing",
  abbreviation: "EMDR",
  founder: "Francine Shapiro",
  description: "Therapy using bilateral stimulation to process traumatic memories"
})

CREATE (somatic_experiencing:TherapyModality {
  id: "se",
  name: "Somatic Experiencing",
  abbreviation: "SE",
  founder: "Peter Levine",
  description: "Body-oriented approach to healing trauma by completing defensive responses"
})

CREATE (cpt:TherapyModality {
  id: "cpt",
  name: "Cognitive Processing Therapy",
  abbreviation: "CPT",
  founder: "Patricia Resick",
  description: "Trauma-focused therapy addressing stuck points and cognitive distortions about trauma"
})

CREATE (mbct:TherapyModality {
  id: "mbct",
  name: "Mindfulness-Based Cognitive Therapy",
  abbreviation: "MBCT",
  founder: "Zindel Segal, Mark Williams, John Teasdale",
  description: "Combines mindfulness meditation with cognitive therapy for depression relapse prevention"
})

CREATE (polyvagal:TherapyModality {
  id: "polyvagal",
  name: "Polyvagal Theory",
  abbreviation: "PVT",
  founder: "Stephen Porges",
  description: "Framework for understanding the autonomic nervous system and its role in safety and connection"
})


// ============================================================
// IFS CONCEPTS
// ============================================================

CREATE (exile:TherapyConcept {
  id: "ifs_exile",
  name: "Exile",
  description: "Young parts carrying pain, trauma, shame—often hidden away by protectors",
  modality: "IFS",
  role: "wounded_part"
})

CREATE (firefighter:TherapyConcept {
  id: "ifs_firefighter",
  name: "Firefighter",
  description: "Reactive protector parts that act impulsively to extinguish emotional pain",
  modality: "IFS",
  role: "reactive_protector",
  common_behaviors: ["substance use", "self-harm", "binge eating", "dissociation", "rage"]
})

CREATE (manager_ifs:TherapyConcept {
  id: "ifs_manager",
  name: "Manager",
  description: "Proactive protector parts that try to control and prevent pain",
  modality: "IFS",
  role: "proactive_protector",
  common_behaviors: ["perfectionism", "people-pleasing", "overworking", "controlling", "caretaking"]
})

CREATE (self_energy:TherapyConcept {
  id: "ifs_self",
  name: "Self",
  description: "Core, undamaged essence characterized by the 8 C's; neurobiologically corresponds to mPFC activation and ventral vagal tone",
  modality: "IFS",
  role: "core_self",
  qualities: ["Curiosity", "Calm", "Clarity", "Compassion", "Confidence", "Courage", "Creativity", "Connectedness"],
  neurochemical_markers: ["serotonin", "oxytocin"],
  physiological_correlate: "ventral_vagal_tone",
  neural_hub: "mPFC",
  mechanism: "mPFC sends inhibitory signals to amygdala, quieting alarm system and enabling CEN activation"
})

CREATE (protector:TherapyConcept {
  id: "ifs_protector",
  name: "Protector",
  description: "Parts that protect the system from exile pain (managers and firefighters)",
  modality: "IFS",
  role: "protector"
})

CREATE (unburdening:TherapyConcept {
  id: "ifs_unburdening",
  name: "Unburdening",
  description: "Process of releasing extreme beliefs and emotions from exiled parts",
  modality: "IFS",
  process_type: "healing"
})

CREATE (blending:TherapyConcept {
  id: "ifs_blending",
  name: "Blending",
  description: "When a part's feelings or beliefs take over, and we lose Self-leadership",
  modality: "IFS"
})

CREATE (unblending:TherapyConcept {
  id: "ifs_unblending",
  name: "Unblending",
  description: "Creating separation between Self and parts to restore perspective",
  modality: "IFS"
})

CREATE (trailhead:TherapyConcept {
  id: "ifs_trailhead",
  name: "Trailhead",
  description: "Entry point for accessing parts—a feeling, thought, sensation, or image",
  modality: "IFS"
})


// ============================================================
// DBT CONCEPTS - MODULE CONTAINERS
// ============================================================

CREATE (dbt_mindfulness:TherapyConcept {
  id: "dbt_mindfulness_module",
  name: "Mindfulness Module",
  description: "Core DBT module teaching present-moment awareness and wise mind",
  modality: "DBT",
  module_type: "core"
})

CREATE (distress_tolerance:TherapyConcept {
  id: "dbt_distress_tolerance",
  name: "Distress Tolerance Module",
  description: "Skills for surviving crisis without making it worse",
  modality: "DBT",
  module_type: "core"
})

CREATE (emotion_regulation_module:TherapyConcept {
  id: "dbt_emotion_regulation_module",
  name: "Emotion Regulation Module",
  description: "Skills for understanding and changing emotional responses",
  modality: "DBT",
  module_type: "core"
})

CREATE (interpersonal_effectiveness:TherapyConcept {
  id: "dbt_interpersonal_effectiveness",
  name: "Interpersonal Effectiveness Module",
  description: "Skills for maintaining relationships while meeting needs",
  modality: "DBT",
  module_type: "core"
})


// ============================================================
// DBT CONCEPTS - MINDFULNESS SKILLS
// ============================================================

CREATE (wise_mind:TherapyConcept {
  id: "dbt_wise_mind",
  name: "Wise Mind",
  description: "Integration of emotional mind and reasonable mind; intuitive knowing",
  modality: "DBT",
  module: "Mindfulness",
  skill_type: "state"
})

CREATE (emotional_mind:TherapyConcept {
  id: "dbt_emotional_mind",
  name: "Emotional Mind",
  description: "State where emotions control thoughts and behavior",
  modality: "DBT",
  module: "Mindfulness",
  skill_type: "state"
})

CREATE (reasonable_mind:TherapyConcept {
  id: "dbt_reasonable_mind",
  name: "Reasonable Mind",
  description: "State of cool, rational, task-focused thinking",
  modality: "DBT",
  module: "Mindfulness",
  skill_type: "state"
})

CREATE (observe:TherapyConcept {
  id: "dbt_observe",
  name: "Observe",
  description: "Notice without getting caught up; wordless watching",
  modality: "DBT",
  module: "Mindfulness",
  skill_type: "what_skill"
})

CREATE (describe:TherapyConcept {
  id: "dbt_describe",
  name: "Describe",
  description: "Put words on experience; label what is observed",
  modality: "DBT",
  module: "Mindfulness",
  skill_type: "what_skill"
})

CREATE (participate:TherapyConcept {
  id: "dbt_participate",
  name: "Participate",
  description: "Enter into experience fully; become one with the activity",
  modality: "DBT",
  module: "Mindfulness",
  skill_type: "what_skill"
})

CREATE (nonjudgmental:TherapyConcept {
  id: "dbt_nonjudgmental",
  name: "Non-judgmentally",
  description: "See without evaluating as good or bad; stick to facts",
  modality: "DBT",
  module: "Mindfulness",
  skill_type: "how_skill"
})

CREATE (one_mindfully:TherapyConcept {
  id: "dbt_one_mindfully",
  name: "One-Mindfully",
  description: "Do one thing at a time; focus attention on present moment",
  modality: "DBT",
  module: "Mindfulness",
  skill_type: "how_skill"
})

CREATE (effectively:TherapyConcept {
  id: "dbt_effectively",
  name: "Effectively",
  description: "Focus on what works; play by the rules; let go of being right",
  modality: "DBT",
  module: "Mindfulness",
  skill_type: "how_skill"
})


// ============================================================
// DBT CONCEPTS - DISTRESS TOLERANCE SKILLS
// ============================================================

CREATE (tipp:TherapyConcept {
  id: "dbt_tipp",
  name: "TIPP",
  description: "Temperature, Intense exercise, Paced breathing, Paired muscle relaxation",
  modality: "DBT",
  module: "Distress Tolerance",
  skill_type: "crisis_survival",
  mechanism: "changes body chemistry to reduce extreme emotion quickly"
})

CREATE (stop_skill:TherapyConcept {
  id: "dbt_stop",
  name: "STOP",
  description: "Stop, Take a step back, Observe, Proceed mindfully",
  modality: "DBT",
  module: "Distress Tolerance",
  skill_type: "crisis_survival"
})

CREATE (accepts:TherapyConcept {
  id: "dbt_accepts",
  name: "ACCEPTS",
  description: "Activities, Contributing, Comparisons, Emotions, Pushing away, Thoughts, Sensations",
  modality: "DBT",
  module: "Distress Tolerance",
  skill_type: "distraction"
})

CREATE (improve:TherapyConcept {
  id: "dbt_improve",
  name: "IMPROVE",
  description: "Imagery, Meaning, Prayer, Relaxation, One thing, Vacation, Encouragement",
  modality: "DBT",
  module: "Distress Tolerance",
  skill_type: "self_soothing"
})

CREATE (pros_cons:TherapyConcept {
  id: "dbt_pros_cons",
  name: "Pros and Cons",
  description: "Weighing pros and cons of tolerating vs not tolerating distress",
  modality: "DBT",
  module: "Distress Tolerance",
  skill_type: "decision_making"
})

CREATE (radical_acceptance:TherapyConcept {
  id: "dbt_radical_acceptance",
  name: "Radical Acceptance",
  description: "Fully accepting reality as it is, without approval or resignation",
  modality: "DBT",
  module: "Distress Tolerance",
  skill_type: "reality_acceptance"
})

CREATE (turning_the_mind:TherapyConcept {
  id: "dbt_turning_mind",
  name: "Turning the Mind",
  description: "Choosing to accept reality over and over",
  modality: "DBT",
  module: "Distress Tolerance",
  skill_type: "reality_acceptance"
})

CREATE (willingness:TherapyConcept {
  id: "dbt_willingness",
  name: "Willingness",
  description: "Doing just what is needed in each situation; opposite of willfulness",
  modality: "DBT",
  module: "Distress Tolerance",
  skill_type: "reality_acceptance"
})

CREATE (half_smile:TherapyConcept {
  id: "dbt_half_smile",
  name: "Half-Smile",
  description: "Relaxing face with slight smile to influence mood",
  modality: "DBT",
  module: "Distress Tolerance",
  skill_type: "body_based"
})

CREATE (willing_hands:TherapyConcept {
  id: "dbt_willing_hands",
  name: "Willing Hands",
  description: "Relaxing hands with palms up to signal acceptance",
  modality: "DBT",
  module: "Distress Tolerance",
  skill_type: "body_based"
})


// ============================================================
// DBT CONCEPTS - EMOTION REGULATION SKILLS
// ============================================================

CREATE (reducing_vulnerability:TherapyConcept {
  id: "dbt_reducing_vulnerability",
  name: "Reducing Vulnerability",
  description: "Skills for reducing vulnerability to negative emotions",
  modality: "DBT",
  module: "Emotion Regulation",
  skill_type: "container"
})

CREATE (abc_please:TherapyConcept {
  id: "dbt_abc_please",
  name: "ABC PLEASE",
  description: "Accumulate positives, Build mastery, Cope ahead + treat PhysicaL illness, balance Eating, avoid mood-Altering drugs, balance Sleep, get Exercise",
  modality: "DBT",
  module: "Emotion Regulation",
  skill_type: "reducing_vulnerability"
})

CREATE (accumulate_positives:TherapyConcept {
  id: "dbt_accumulate_positives",
  name: "Accumulate Positive Experiences",
  description: "Build a life worth living through pleasant activities and long-term goals",
  modality: "DBT",
  module: "Emotion Regulation",
  skill_type: "reducing_vulnerability"
})

CREATE (build_mastery:TherapyConcept {
  id: "dbt_build_mastery",
  name: "Build Mastery",
  description: "Doing things that make you feel competent and effective",
  modality: "DBT",
  module: "Emotion Regulation",
  skill_type: "reducing_vulnerability"
})

CREATE (cope_ahead:TherapyConcept {
  id: "dbt_cope_ahead",
  name: "Cope Ahead",
  description: "Planning and rehearsing for difficult situations before they occur",
  modality: "DBT",
  module: "Emotion Regulation",
  skill_type: "reducing_vulnerability"
})

CREATE (please_skills:TherapyConcept {
  id: "dbt_please",
  name: "PLEASE Skills",
  description: "Physical self-care: treat illness, balanced eating, avoid drugs, balanced sleep, exercise",
  modality: "DBT",
  module: "Emotion Regulation",
  skill_type: "reducing_vulnerability"
})

CREATE (check_the_facts:TherapyConcept {
  id: "dbt_check_facts",
  name: "Check the Facts",
  description: "Examining whether emotional response fits the facts of the situation",
  modality: "DBT",
  module: "Emotion Regulation",
  skill_type: "changing_response"
})

CREATE (opposite_action:TherapyConcept {
  id: "dbt_opposite_action",
  name: "Opposite Action",
  description: "Acting opposite to emotion urge when emotion doesn't fit facts or isn't effective",
  modality: "DBT",
  module: "Emotion Regulation",
  skill_type: "changing_response"
})

CREATE (problem_solving:TherapyConcept {
  id: "dbt_problem_solving",
  name: "Problem Solving",
  description: "Changing the situation when emotion fits the facts",
  modality: "DBT",
  module: "Emotion Regulation",
  skill_type: "changing_response"
})


// ============================================================
// DBT CONCEPTS - INTERPERSONAL EFFECTIVENESS SKILLS
// ============================================================

CREATE (dear_man:TherapyConcept {
  id: "dbt_dear_man",
  name: "DEAR MAN",
  description: "Describe, Express, Assert, Reinforce, Mindful, Appear confident, Negotiate",
  modality: "DBT",
  module: "Interpersonal Effectiveness",
  skill_type: "objectives_effectiveness"
})

CREATE (give:TherapyConcept {
  id: "dbt_give",
  name: "GIVE",
  description: "Gentle, Interested, Validate, Easy manner",
  modality: "DBT",
  module: "Interpersonal Effectiveness",
  skill_type: "relationship_effectiveness"
})

CREATE (fast:TherapyConcept {
  id: "dbt_fast",
  name: "FAST",
  description: "Fair, no excessive Apologies, Stick to values, Truthful",
  modality: "DBT",
  module: "Interpersonal Effectiveness",
  skill_type: "self_respect_effectiveness"
})


// ============================================================
// MINDFULNESS AS CROSS-MODALITY CONCEPT
// ============================================================

CREATE (mindfulness:TherapyConcept {
  id: "mindfulness",
  name: "Mindfulness",
  description: "Present-moment, non-judgmental awareness; core to DBT, ACT, MBCT, and contemplative traditions",
  modality: "cross_modality",
  skill_type: "foundational"
})


// ============================================================
// CBT CONCEPTS
// ============================================================

CREATE (cognitive_distortion:TherapyConcept {
  id: "cbt_cognitive_distortion",
  name: "Cognitive Distortion",
  description: "Biased or irrational thought patterns",
  modality: "CBT"
})

CREATE (catastrophizing:TherapyConcept {
  id: "cbt_catastrophizing",
  name: "Catastrophizing",
  description: "Assuming the worst possible outcome will occur",
  modality: "CBT",
  distortion_type: "cognitive_distortion"
})

CREATE (black_white:TherapyConcept {
  id: "cbt_black_white",
  name: "All-or-Nothing Thinking",
  description: "Seeing things in black and white with no middle ground",
  modality: "CBT",
  distortion_type: "cognitive_distortion",
  aliases: ["black-and-white thinking", "splitting", "dichotomous thinking"]
})

CREATE (mind_reading:TherapyConcept {
  id: "cbt_mind_reading",
  name: "Mind Reading",
  description: "Assuming you know what others are thinking without evidence",
  modality: "CBT",
  distortion_type: "cognitive_distortion"
})

CREATE (fortune_telling:TherapyConcept {
  id: "cbt_fortune_telling",
  name: "Fortune Telling",
  description: "Predicting negative outcomes without evidence",
  modality: "CBT",
  distortion_type: "cognitive_distortion"
})

CREATE (should_statements:TherapyConcept {
  id: "cbt_should_statements",
  name: "Should Statements",
  description: "Rigid rules about how self or others must behave",
  modality: "CBT",
  distortion_type: "cognitive_distortion"
})

CREATE (personalization:TherapyConcept {
  id: "cbt_personalization",
  name: "Personalization",
  description: "Taking excessive responsibility for external events",
  modality: "CBT",
  distortion_type: "cognitive_distortion"
})

CREATE (labeling:TherapyConcept {
  id: "cbt_labeling",
  name: "Labeling",
  description: "Attaching a fixed label to self or others based on single event",
  modality: "CBT",
  distortion_type: "cognitive_distortion"
})

CREATE (emotional_reasoning:TherapyConcept {
  id: "cbt_emotional_reasoning",
  name: "Emotional Reasoning",
  description: "Believing something is true because it feels true",
  modality: "CBT",
  distortion_type: "cognitive_distortion"
})

CREATE (mental_filter:TherapyConcept {
  id: "cbt_mental_filter",
  name: "Mental Filter",
  description: "Focusing on negatives while filtering out positives",
  modality: "CBT",
  distortion_type: "cognitive_distortion"
})

CREATE (thought_record:TherapyConcept {
  id: "cbt_thought_record",
  name: "Thought Record",
  description: "Tool for identifying and challenging automatic thoughts",
  modality: "CBT",
  skill_type: "cognitive_restructuring"
})

CREATE (behavioral_activation:TherapyConcept {
  id: "cbt_behavioral_activation",
  name: "Behavioral Activation",
  description: "Scheduling pleasurable and mastery activities to improve mood",
  modality: "CBT",
  skill_type: "behavioral"
})

CREATE (exposure:TherapyConcept {
  id: "cbt_exposure",
  name: "Exposure",
  description: "Gradually facing feared situations to reduce anxiety through extinction learning",
  modality: "CBT",
  skill_type: "behavioral"
})


// ============================================================
// ACT CONCEPTS
// ============================================================

CREATE (psychological_flexibility:TherapyConcept {
  id: "act_psych_flexibility",
  name: "Psychological Flexibility",
  description: "Ability to be present, open, and do what matters; core aim of ACT",
  modality: "ACT"
})

CREATE (defusion:TherapyConcept {
  id: "act_defusion",
  name: "Cognitive Defusion",
  description: "Changing relationship with thoughts rather than content; seeing thoughts as thoughts",
  modality: "ACT"
})

CREATE (acceptance_act:TherapyConcept {
  id: "act_acceptance",
  name: "Acceptance",
  description: "Making room for unwanted thoughts and feelings without struggle",
  modality: "ACT"
})

CREATE (present_moment:TherapyConcept {
  id: "act_present_moment",
  name: "Present Moment Awareness",
  description: "Flexible attention to here and now",
  modality: "ACT"
})

CREATE (self_as_context:TherapyConcept {
  id: "act_self_context",
  name: "Self-as-Context",
  description: "Sense of self as observer/container distinct from experiences and stories",
  modality: "ACT"
})

CREATE (values_act:TherapyConcept {
  id: "act_values",
  name: "Values",
  description: "Chosen life directions that provide meaning and vitality",
  modality: "ACT"
})

CREATE (committed_action:TherapyConcept {
  id: "act_committed_action",
  name: "Committed Action",
  description: "Values-guided action despite obstacles; doing what matters",
  modality: "ACT"
})


// ============================================================
// EMDR CONCEPTS
// ============================================================

CREATE (aip_model:TherapyConcept {
  id: "emdr_aip",
  name: "Adaptive Information Processing Model",
  description: "Theory that trauma overwhelms natural processing, leaving memories maladaptively stored",
  modality: "EMDR"
})

CREATE (bilateral_stimulation:TherapyConcept {
  id: "emdr_bilateral",
  name: "Bilateral Stimulation",
  description: "Alternating left-right stimulation (eye movements, taps, tones) during memory processing",
  modality: "EMDR"
})

CREATE (target_memory:TherapyConcept {
  id: "emdr_target",
  name: "Target Memory",
  description: "Specific traumatic memory being processed, including image, cognition, emotion, sensation",
  modality: "EMDR"
})

CREATE (negative_cognition:TherapyConcept {
  id: "emdr_nc",
  name: "Negative Cognition",
  description: "Irrational self-belief associated with trauma (e.g., 'I am not safe')",
  modality: "EMDR"
})

CREATE (positive_cognition:TherapyConcept {
  id: "emdr_pc",
  name: "Positive Cognition",
  description: "Desired adaptive belief to replace negative cognition (e.g., 'I am safe now')",
  modality: "EMDR"
})

CREATE (suds:TherapyConcept {
  id: "emdr_suds",
  name: "SUDS",
  description: "Subjective Units of Disturbance Scale (0-10) measuring emotional distress",
  modality: "EMDR"
})

CREATE (voc:TherapyConcept {
  id: "emdr_voc",
  name: "VOC",
  description: "Validity of Cognition scale (1-7) measuring belief in positive cognition",
  modality: "EMDR"
})

CREATE (emdr_phases:TherapyConcept {
  id: "emdr_phases",
  name: "Eight Phases of EMDR",
  description: "History, preparation, assessment, desensitization, installation, body scan, closure, reevaluation",
  modality: "EMDR"
})


// ============================================================
// SOMATIC EXPERIENCING CONCEPTS
// ============================================================

CREATE (felt_sense:TherapyConcept {
  id: "se_felt_sense",
  name: "Felt Sense",
  description: "Bodily awareness of experience; holistic sense of how something feels in the body",
  modality: "SE"
})

CREATE (titration:TherapyConcept {
  id: "se_titration",
  name: "Titration",
  description: "Accessing trauma in small, manageable amounts to prevent overwhelm",
  modality: "SE"
})

CREATE (pendulation:TherapyConcept {
  id: "se_pendulation",
  name: "Pendulation",
  description: "Natural rhythm of moving between activation/distress and settling/calm",
  modality: "SE"
})

CREATE (discharge:TherapyConcept {
  id: "se_discharge",
  name: "Discharge",
  description: "Release of stored survival energy through trembling, heat, breathing, movement",
  modality: "SE"
})

CREATE (resourcing:TherapyConcept {
  id: "se_resourcing",
  name: "Resourcing",
  description: "Building internal and external resources for safety and regulation",
  modality: "SE"
})

CREATE (orienting:TherapyConcept {
  id: "se_orienting",
  name: "Orienting",
  description: "Natural scanning of environment that was interrupted during trauma",
  modality: "SE"
})

CREATE (defensive_responses:TherapyConcept {
  id: "se_defensive",
  name: "Defensive Responses",
  description: "Fight, flight, freeze responses that may need completion",
  modality: "SE"
})


// ============================================================
// CPT CONCEPTS
// ============================================================

CREATE (stuck_point:TherapyConcept {
  id: "cpt_stuck_point",
  name: "Stuck Point",
  description: "Distorted belief about self, others, or world resulting from trauma",
  modality: "CPT"
})

CREATE (assimilation:TherapyConcept {
  id: "cpt_assimilation",
  name: "Assimilation",
  description: "Altering trauma memory to fit prior beliefs (denial, self-blame)",
  modality: "CPT"
})

CREATE (overaccommodation:TherapyConcept {
  id: "cpt_overaccommodation",
  name: "Over-accommodation",
  description: "Overgeneralizing trauma to all situations ('no one can be trusted')",
  modality: "CPT"
})

CREATE (accommodation:TherapyConcept {
  id: "cpt_accommodation",
  name: "Accommodation",
  description: "Healthy modification of beliefs to integrate trauma realistically",
  modality: "CPT"
})

CREATE (abc_worksheet:TherapyConcept {
  id: "cpt_abc",
  name: "ABC Worksheet",
  description: "Activating event, Belief, Consequence - identifying stuck points",
  modality: "CPT"
})

CREATE (challenging_questions:TherapyConcept {
  id: "cpt_challenging",
  name: "Challenging Questions",
  description: "Socratic questions to examine evidence for stuck points",
  modality: "CPT"
})

CREATE (trauma_themes:TherapyConcept {
  id: "cpt_themes",
  name: "Trauma Themes",
  description: "Safety, trust, power/control, esteem, intimacy - areas impacted by trauma",
  modality: "CPT"
})


// ============================================================
// MBCT CONCEPTS
// ============================================================

CREATE (decentering:TherapyConcept {
  id: "mbct_decentering",
  name: "Decentering",
  description: "Seeing thoughts as mental events rather than facts or reflections of self",
  modality: "MBCT"
})

CREATE (body_scan:TherapyConcept {
  id: "mbct_body_scan",
  name: "Body Scan",
  description: "Systematic attention to sensations throughout the body",
  modality: "MBCT"
})

CREATE (sitting_meditation:TherapyConcept {
  id: "mbct_sitting",
  name: "Sitting Meditation",
  description: "Formal mindfulness practice with breath and body awareness",
  modality: "MBCT"
})

CREATE (mindful_movement:TherapyConcept {
  id: "mbct_movement",
  name: "Mindful Movement",
  description: "Yoga and stretching with present-moment awareness",
  modality: "MBCT"
})

CREATE (three_minute_breathing:TherapyConcept {
  id: "mbct_3min",
  name: "Three-Minute Breathing Space",
  description: "Brief practice: awareness, gathering, expanding - used as coping tool",
  modality: "MBCT"
})

CREATE (depression_relapse:TherapyConcept {
  id: "mbct_relapse",
  name: "Depression Relapse Prevention",
  description: "Primary goal of MBCT - breaking the rumination-depression cycle",
  modality: "MBCT"
})


// ============================================================
// POLYVAGAL CONCEPTS
// ============================================================

CREATE (ventral_vagal:TherapyConcept {
  id: "pv_ventral_vagal",
  name: "Ventral Vagal State",
  description: "Social engagement system; safety, connection, calm presence",
  modality: "Polyvagal",
  autonomic_state: "parasympathetic_social"
})

CREATE (sympathetic_state:TherapyConcept {
  id: "pv_sympathetic",
  name: "Sympathetic State",
  description: "Mobilization for fight or flight; anxiety, anger, action",
  modality: "Polyvagal",
  autonomic_state: "sympathetic"
})

CREATE (dorsal_vagal:TherapyConcept {
  id: "pv_dorsal_vagal",
  name: "Dorsal Vagal State",
  description: "Immobilization; shutdown, collapse, dissociation, depression",
  modality: "Polyvagal",
  autonomic_state: "parasympathetic_immobilization"
})

CREATE (neuroception:TherapyConcept {
  id: "pv_neuroception",
  name: "Neuroception",
  description: "Subconscious detection of safety or threat that shapes autonomic state",
  modality: "Polyvagal"
})

CREATE (co_regulation:TherapyConcept {
  id: "pv_coregulation",
  name: "Co-regulation",
  description: "Regulating through safe connection with others; borrowing another's ventral vagal",
  modality: "Polyvagal"
})

CREATE (vagal_brake:TherapyConcept {
  id: "pv_vagal_brake",
  name: "Vagal Brake",
  description: "Ventral vagal inhibition of heart rate allowing calm engagement without shutdown",
  modality: "Polyvagal"
})

CREATE (social_engagement:TherapyConcept {
  id: "pv_social_engagement",
  name: "Social Engagement System",
  description: "Face-heart connection; facial expression, vocalization, listening in ventral vagal",
  modality: "Polyvagal"
})


// ============================================================
// CLINICAL CONSTRUCTS
// ============================================================

CREATE (ptsd:ClinicalConstruct {
  id: "ptsd",
  name: "Post-Traumatic Stress Disorder",
  abbreviation: "PTSD",
  source: "DSM-5-TR",
  code: "309.81",
  symptom_clusters: ["intrusion", "avoidance", "negative_cognitions", "hyperarousal"]
})

CREATE (cptsd:ClinicalConstruct {
  id: "cptsd",
  name: "Complex PTSD",
  abbreviation: "C-PTSD",
  source: "ICD-11",
  description: "PTSD plus disturbances in self-organization",
  additional_features: ["affect_dysregulation", "negative_self_concept", "relationship_difficulties"]
})

CREATE (bpd:ClinicalConstruct {
  id: "bpd",
  name: "Borderline Personality Disorder",
  abbreviation: "BPD",
  source: "DSM-5-TR",
  code: "301.83",
  core_features: ["identity_disturbance", "abandonment_fear", "emotional_instability", "impulsivity", "self_harm"]
})

CREATE (gad:ClinicalConstruct {
  id: "gad",
  name: "Generalized Anxiety Disorder",
  abbreviation: "GAD",
  source: "DSM-5-TR",
  code: "300.02"
})

CREATE (mdd:ClinicalConstruct {
  id: "mdd",
  name: "Major Depressive Disorder",
  abbreviation: "MDD",
  source: "DSM-5-TR",
  code: "296.2x"
})

CREATE (panic_disorder:ClinicalConstruct {
  id: "panic_disorder",
  name: "Panic Disorder",
  source: "DSM-5-TR",
  code: "300.01"
})

CREATE (social_anxiety:ClinicalConstruct {
  id: "social_anxiety",
  name: "Social Anxiety Disorder",
  abbreviation: "SAD",
  source: "DSM-5-TR",
  code: "300.23"
})

CREATE (ocd:ClinicalConstruct {
  id: "ocd",
  name: "Obsessive-Compulsive Disorder",
  abbreviation: "OCD",
  source: "DSM-5-TR",
  code: "300.3"
})

CREATE (adhd:ClinicalConstruct {
  id: "adhd",
  name: "Attention-Deficit/Hyperactivity Disorder",
  abbreviation: "ADHD",
  source: "DSM-5-TR",
  code: "314.0x"
})

CREATE (dissociation:ClinicalConstruct {
  id: "dissociation",
  name: "Dissociation",
  description: "Disconnection from thoughts, feelings, surroundings, identity",
  construct_type: "symptom_dimension"
})

CREATE (emotional_dysregulation:ClinicalConstruct {
  id: "emotional_dysregulation",
  name: "Emotional Dysregulation",
  description: "Difficulty modulating emotional responses",
  construct_type: "symptom_dimension"
})

CREATE (hypervigilance:ClinicalConstruct {
  id: "hypervigilance",
  name: "Hypervigilance",
  description: "Heightened state of sensory sensitivity and scanning for threat",
  construct_type: "symptom"
})

CREATE (flashback:ClinicalConstruct {
  id: "flashback",
  name: "Flashback",
  description: "Vivid re-experiencing of traumatic event as if happening now",
  construct_type: "symptom"
})

CREATE (avoidance_symptom:ClinicalConstruct {
  id: "avoidance",
  name: "Avoidance",
  description: "Avoiding reminders of trauma or distressing experiences",
  construct_type: "symptom"
})

CREATE (rumination:ClinicalConstruct {
  id: "rumination",
  name: "Rumination",
  description: "Repetitive, passive focus on symptoms, causes, and consequences",
  construct_type: "symptom"
})


// ============================================================
// COGNITIVE/PSYCHOLOGICAL FUNCTIONS
// ============================================================

CREATE (emotion_regulation:Function {
  id: "emotion_regulation",
  name: "Emotion Regulation",
  description: "Ability to modulate emotional experience and expression"
})

CREATE (fear_conditioning:Function {
  id: "fear_conditioning",
  name: "Fear Conditioning",
  description: "Learning to associate neutral stimuli with threat"
})

CREATE (fear_extinction:Function {
  id: "fear_extinction",
  name: "Fear Extinction",
  description: "Learning that conditioned stimulus no longer predicts threat; context-dependent"
})

CREATE (working_memory:Function {
  id: "working_memory",
  name: "Working Memory",
  description: "Temporary storage and manipulation of information"
})

CREATE (interoception:Function {
  id: "interoception",
  name: "Interoception",
  description: "Perception of internal bodily states"
})

CREATE (executive_function:Function {
  id: "executive_function",
  name: "Executive Function",
  description: "Higher-order cognitive processes: planning, inhibition, flexibility"
})

CREATE (attention_function:Function {
  id: "attention",
  name: "Attention",
  description: "Selective focus on relevant stimuli; top-down and bottom-up"
})

CREATE (cognitive_control:Function {
  id: "cognitive_control",
  name: "Cognitive Control",
  description: "Ability to regulate thoughts and actions in service of goals"
})

CREATE (memory_consolidation:Function {
  id: "memory_consolidation",
  name: "Memory Consolidation",
  description: "Process of stabilizing memories for long-term storage"
})

CREATE (threat_detection:Function {
  id: "threat_detection",
  name: "Threat Detection",
  description: "Rapid identification of potentially dangerous stimuli"
})

CREATE (reward_processing:Function {
  id: "reward_processing",
  name: "Reward Processing",
  description: "Evaluation and learning from rewards"
})

CREATE (self_referential:Function {
  id: "self_referential",
  name: "Self-Referential Processing",
  description: "Thinking about oneself, autobiographical memory, self-reflection"
})

CREATE (social_cognition:Function {
  id: "social_cognition",
  name: "Social Cognition",
  description: "Understanding others' mental states, theory of mind, empathy"
})

CREATE (impulse_control:Function {
  id: "impulse_control",
  name: "Impulse Control",
  description: "Ability to inhibit prepotent responses"
})

CREATE (stress_response:Function {
  id: "stress_response",
  name: "Stress Response",
  description: "Physiological and psychological reaction to stressors"
})

CREATE (motivation:Function {
  id: "motivation",
  name: "Motivation",
  description: "Drive toward goals and rewards"
})

CREATE (habit_formation:Function {
  id: "habit_formation",
  name: "Habit Formation",
  description: "Automatization of repeated behaviors"
})

CREATE (language_processing:Function {
  id: "language_processing",
  name: "Language Processing",
  description: "Comprehension and production of language"
})

CREATE (body_awareness:Function {
  id: "body_awareness",
  name: "Body Awareness",
  description: "Conscious perception of body position and sensations"
})


// ============================================================
// RELATIONSHIPS - BRAIN STRUCTURE HIERARCHY
// ============================================================

CREATE (dlpfc)-[:PART_OF]->(pfc)
CREATE (vmpfc)-[:PART_OF]->(pfc)
CREATE (ofc)-[:PART_OF]->(pfc)
CREATE (mpfc)-[:PART_OF]->(pfc)
CREATE (dacc)-[:PART_OF]->(acc)
CREATE (vacc)-[:PART_OF]->(acc)
CREATE (anterior_insula)-[:PART_OF]->(insula)
CREATE (posterior_insula)-[:PART_OF]->(insula)
CREATE (bla)-[:PART_OF]->(amygdala)
CREATE (cea)-[:PART_OF]->(amygdala)
CREATE (nucleus_accumbens)-[:PART_OF]->(basal_ganglia)


// ============================================================
// RELATIONSHIPS - NETWORK MEMBERSHIP
// ============================================================

// Default Mode Network
CREATE (mpfc)-[:PARTICIPATES_IN]->(dmn)
CREATE (pcc)-[:PARTICIPATES_IN]->(dmn)
CREATE (hippocampus)-[:PARTICIPATES_IN]->(dmn)
CREATE (angular_gyrus)-[:PARTICIPATES_IN]->(dmn)

// Salience Network
CREATE (anterior_insula)-[:PARTICIPATES_IN]->(salience)
CREATE (dacc)-[:PARTICIPATES_IN]->(salience)
CREATE (amygdala)-[:PARTICIPATES_IN]->(salience)

// Central Executive Network
CREATE (dlpfc)-[:PARTICIPATES_IN]->(cen)
CREATE (parietal_cortex)-[:PARTICIPATES_IN]->(cen)

// Limbic Network
CREATE (amygdala)-[:PARTICIPATES_IN]->(limbic_network)
CREATE (hippocampus)-[:PARTICIPATES_IN]->(limbic_network)
CREATE (hypothalamus)-[:PARTICIPATES_IN]->(limbic_network)
CREATE (ofc)-[:PARTICIPATES_IN]->(limbic_network)

// Sensorimotor Network
CREATE (motor_cortex)-[:PARTICIPATES_IN]->(sensorimotor_network)
CREATE (somatosensory_cortex)-[:PARTICIPATES_IN]->(sensorimotor_network)
CREATE (basal_ganglia)-[:PARTICIPATES_IN]->(sensorimotor_network)

// Dorsal Attention Network
CREATE (fef)-[:PARTICIPATES_IN]->(dan)
CREATE (ips)-[:PARTICIPATES_IN]->(dan)

// Ventral Attention Network
CREATE (tpj)-[:PARTICIPATES_IN]->(van)
CREATE (anterior_insula)-[:PARTICIPATES_IN]->(van)


// ============================================================
// RELATIONSHIPS - BRAIN-FUNCTION LINKS
// ============================================================

// Amygdala
CREATE (amygdala)-[:IMPLICATED_IN {role: "primary", evidence: "strong"}]->(fear_conditioning)
CREATE (amygdala)-[:IMPLICATED_IN {role: "primary", evidence: "strong"}]->(threat_detection)
CREATE (amygdala)-[:IMPLICATED_IN {role: "primary"}]->(memory_consolidation)

// Prefrontal Cortex
CREATE (pfc)-[:IMPLICATED_IN {role: "regulatory", evidence: "strong"}]->(emotion_regulation)
CREATE (vmpfc)-[:IMPLICATED_IN {role: "regulatory", evidence: "strong"}]->(fear_extinction)
CREATE (dlpfc)-[:IMPLICATED_IN {role: "primary", evidence: "strong"}]->(working_memory)
CREATE (dlpfc)-[:IMPLICATED_IN {role: "primary", evidence: "strong"}]->(cognitive_control)
CREATE (dlpfc)-[:IMPLICATED_IN {role: "primary"}]->(executive_function)

// ACC
CREATE (acc)-[:IMPLICATED_IN {role: "monitoring"}]->(cognitive_control)
CREATE (dacc)-[:IMPLICATED_IN {role: "primary"}]->(emotion_regulation)

// Insula
CREATE (insula)-[:IMPLICATED_IN {role: "primary", evidence: "strong"}]->(interoception)
CREATE (anterior_insula)-[:IMPLICATED_IN {role: "primary"}]->(emotion_regulation)
CREATE (anterior_insula)-[:IMPLICATED_IN {role: "primary"}]->(social_cognition)
CREATE (posterior_insula)-[:IMPLICATED_IN {role: "primary"}]->(body_awareness)
CREATE (somatosensory_cortex)-[:IMPLICATED_IN {role: "primary"}]->(body_awareness)

// Hippocampus
CREATE (hippocampus)-[:IMPLICATED_IN {role: "primary", evidence: "strong"}]->(memory_consolidation)
CREATE (hippocampus)-[:IMPLICATED_IN {role: "contextual", evidence: "strong"}]->(fear_conditioning)
CREATE (hippocampus)-[:IMPLICATED_IN {role: "contextual", evidence: "strong"}]->(fear_extinction)

// OFC
CREATE (ofc)-[:IMPLICATED_IN {role: "primary"}]->(impulse_control)
CREATE (ofc)-[:IMPLICATED_IN {role: "primary"}]->(reward_processing)

// Reward system
CREATE (nucleus_accumbens)-[:IMPLICATED_IN {role: "primary"}]->(reward_processing)
CREATE (nucleus_accumbens)-[:IMPLICATED_IN {role: "primary"}]->(motivation)
CREATE (vta)-[:IMPLICATED_IN {role: "primary"}]->(reward_processing)
CREATE (vta)-[:IMPLICATED_IN {role: "primary"}]->(motivation)

// Self-referential
CREATE (mpfc)-[:IMPLICATED_IN {role: "primary"}]->(self_referential)
CREATE (mpfc)-[:IMPLICATED_IN {role: "primary"}]->(social_cognition)

// Stress
CREATE (hypothalamus)-[:IMPLICATED_IN {role: "primary"}]->(stress_response)
CREATE (locus_coeruleus)-[:IMPLICATED_IN {role: "modulatory"}]->(stress_response)

// Thalamus
CREATE (thalamus)-[:IMPLICATED_IN {role: "gating"}]->(attention_function)

// Basal ganglia
CREATE (basal_ganglia)-[:IMPLICATED_IN {role: "primary"}]->(habit_formation)

// Temporal cortex
CREATE (temporal_cortex)-[:IMPLICATED_IN {role: "primary"}]->(language_processing)

// BNST
CREATE (bed_nucleus)-[:IMPLICATED_IN {role: "primary"}]->(anxiety)


// ============================================================
// RELATIONSHIPS - BRAIN-EMOTION LINKS
// ============================================================

// Amygdala activations
CREATE (amygdala)-[:ACTIVATES_DURING {direction: "increases", evidence: "strong"}]->(fear)
CREATE (amygdala)-[:ACTIVATES_DURING {direction: "increases"}]->(anger)
CREATE (amygdala)-[:ACTIVATES_DURING {direction: "increases"}]->(anxiety)
CREATE (amygdala)-[:ACTIVATES_DURING {direction: "increases"}]->(hot_shame)

// BNST - sustained anxiety (vs acute fear in amygdala)
CREATE (bed_nucleus)-[:ACTIVATES_DURING {direction: "increases", notes: "sustained/anticipatory anxiety"}]->(anxiety)

// Insula
CREATE (anterior_insula)-[:ACTIVATES_DURING {direction: "increases"}]->(disgust)
CREATE (anterior_insula)-[:ACTIVATES_DURING {direction: "increases"}]->(anxiety)
CREATE (anterior_insula)-[:ACTIVATES_DURING {direction: "increases"}]->(compassion)

// mPFC - self-conscious emotions
CREATE (mpfc)-[:ACTIVATES_DURING {direction: "increases"}]->(hot_shame)
CREATE (mpfc)-[:ACTIVATES_DURING {direction: "increases"}]->(cold_shame)
CREATE (mpfc)-[:ACTIVATES_DURING {direction: "increases"}]->(guilt)

// ACC
CREATE (vacc)-[:ACTIVATES_DURING {direction: "increases"}]->(sadness)

// Reward system
CREATE (nucleus_accumbens)-[:ACTIVATES_DURING {direction: "increases"}]->(joy)
CREATE (nucleus_accumbens)-[:ACTIVATES_DURING {direction: "increases"}]->(excitement)

// PAG - panic
CREATE (periaqueductal_gray)-[:ACTIVATES_DURING {direction: "increases"}]->(panic)


// ============================================================
// RELATIONSHIPS - NEUROCHEMICAL PRODUCTION
// ============================================================

CREATE (vta)-[:PRODUCES]->(dopamine)
CREATE (raphe_nuclei)-[:PRODUCES]->(serotonin)
CREATE (locus_coeruleus)-[:PRODUCES]->(norepinephrine)
CREATE (hypothalamus)-[:PRODUCES]->(cortisol)
CREATE (hypothalamus)-[:PRODUCES]->(oxytocin)


// ============================================================
// RELATIONSHIPS - NEUROCHEMICAL MODULATION
// ============================================================

CREATE (dopamine)-[:MODULATES]->(reward_processing)
CREATE (dopamine)-[:MODULATES]->(motivation)

CREATE (serotonin)-[:MODULATES]->(emotion_regulation)
CREATE (serotonin)-[:MODULATES {direction: "reduces"}]->(anxiety)

CREATE (norepinephrine)-[:MODULATES]->(attention_function)
CREATE (norepinephrine)-[:MODULATES]->(stress_response)

CREATE (gaba)-[:MODULATES {direction: "inhibits"}]->(anxiety)
CREATE (gaba)-[:MODULATES {direction: "inhibits"}]->(amygdala)

CREATE (glutamate)-[:MODULATES]->(memory_consolidation)
CREATE (glutamate)-[:MODULATES]->(fear_conditioning)

CREATE (acetylcholine)-[:MODULATES]->(attention_function)
CREATE (acetylcholine)-[:MODULATES]->(memory_consolidation)

CREATE (endorphin)-[:MODULATES {direction: "reduces"}]->(stress_response)
CREATE (endorphin)-[:MODULATES]->(reward_processing)

CREATE (cortisol)-[:MODULATES]->(stress_response)
CREATE (cortisol)-[:MODULATES]->(memory_consolidation)

CREATE (oxytocin)-[:MODULATES]->(trust)
CREATE (oxytocin)-[:MODULATES]->(social_cognition)


// ============================================================
// RELATIONSHIPS - THERAPY MODALITY HIERARCHY
// ============================================================

// IFS
CREATE (exile)-[:BELONGS_TO]->(ifs)
CREATE (firefighter)-[:BELONGS_TO]->(ifs)
CREATE (manager_ifs)-[:BELONGS_TO]->(ifs)
CREATE (self_energy)-[:BELONGS_TO]->(ifs)
CREATE (protector)-[:BELONGS_TO]->(ifs)
CREATE (unburdening)-[:BELONGS_TO]->(ifs)
CREATE (blending)-[:BELONGS_TO]->(ifs)
CREATE (unblending)-[:BELONGS_TO]->(ifs)
CREATE (trailhead)-[:BELONGS_TO]->(ifs)

// DBT Modules
CREATE (dbt_mindfulness)-[:BELONGS_TO]->(dbt)
CREATE (distress_tolerance)-[:BELONGS_TO]->(dbt)
CREATE (emotion_regulation_module)-[:BELONGS_TO]->(dbt)
CREATE (interpersonal_effectiveness)-[:BELONGS_TO]->(dbt)

// DBT Mindfulness Skills (correct hierarchy - siblings under module)
CREATE (wise_mind)-[:PART_OF]->(dbt_mindfulness)
CREATE (emotional_mind)-[:PART_OF]->(dbt_mindfulness)
CREATE (reasonable_mind)-[:PART_OF]->(dbt_mindfulness)
CREATE (observe)-[:PART_OF]->(dbt_mindfulness)
CREATE (describe)-[:PART_OF]->(dbt_mindfulness)
CREATE (participate)-[:PART_OF]->(dbt_mindfulness)
CREATE (nonjudgmental)-[:PART_OF]->(dbt_mindfulness)
CREATE (one_mindfully)-[:PART_OF]->(dbt_mindfulness)
CREATE (effectively)-[:PART_OF]->(dbt_mindfulness)

// DBT Distress Tolerance Skills
CREATE (tipp)-[:PART_OF]->(distress_tolerance)
CREATE (stop_skill)-[:PART_OF]->(distress_tolerance)
CREATE (accepts)-[:PART_OF]->(distress_tolerance)
CREATE (improve)-[:PART_OF]->(distress_tolerance)
CREATE (pros_cons)-[:PART_OF]->(distress_tolerance)
CREATE (radical_acceptance)-[:PART_OF]->(distress_tolerance)
CREATE (turning_the_mind)-[:PART_OF]->(distress_tolerance)
CREATE (willingness)-[:PART_OF]->(distress_tolerance)
CREATE (half_smile)-[:PART_OF]->(distress_tolerance)
CREATE (willing_hands)-[:PART_OF]->(distress_tolerance)

// DBT Emotion Regulation Skills (correct hierarchy - siblings)
CREATE (reducing_vulnerability)-[:PART_OF]->(emotion_regulation_module)
CREATE (abc_please)-[:PART_OF]->(reducing_vulnerability)
CREATE (accumulate_positives)-[:PART_OF]->(reducing_vulnerability)
CREATE (build_mastery)-[:PART_OF]->(reducing_vulnerability)
CREATE (cope_ahead)-[:PART_OF]->(reducing_vulnerability)
CREATE (please_skills)-[:PART_OF]->(reducing_vulnerability)
CREATE (check_the_facts)-[:PART_OF]->(emotion_regulation_module)
CREATE (opposite_action)-[:PART_OF]->(emotion_regulation_module)
CREATE (problem_solving)-[:PART_OF]->(emotion_regulation_module)

// DBT IE Skills
CREATE (dear_man)-[:PART_OF]->(interpersonal_effectiveness)
CREATE (give)-[:PART_OF]->(interpersonal_effectiveness)
CREATE (fast)-[:PART_OF]->(interpersonal_effectiveness)

// CBT
CREATE (cognitive_distortion)-[:BELONGS_TO]->(cbt)
CREATE (catastrophizing)-[:TYPE_OF]->(cognitive_distortion)
CREATE (black_white)-[:TYPE_OF]->(cognitive_distortion)
CREATE (mind_reading)-[:TYPE_OF]->(cognitive_distortion)
CREATE (fortune_telling)-[:TYPE_OF]->(cognitive_distortion)
CREATE (should_statements)-[:TYPE_OF]->(cognitive_distortion)
CREATE (personalization)-[:TYPE_OF]->(cognitive_distortion)
CREATE (labeling)-[:TYPE_OF]->(cognitive_distortion)
CREATE (emotional_reasoning)-[:TYPE_OF]->(cognitive_distortion)
CREATE (mental_filter)-[:TYPE_OF]->(cognitive_distortion)
CREATE (thought_record)-[:BELONGS_TO]->(cbt)
CREATE (behavioral_activation)-[:BELONGS_TO]->(cbt)
CREATE (exposure)-[:BELONGS_TO]->(cbt)

// ACT
CREATE (psychological_flexibility)-[:BELONGS_TO]->(act)
CREATE (defusion)-[:BELONGS_TO]->(act)
CREATE (acceptance_act)-[:BELONGS_TO]->(act)
CREATE (present_moment)-[:BELONGS_TO]->(act)
CREATE (self_as_context)-[:BELONGS_TO]->(act)
CREATE (values_act)-[:BELONGS_TO]->(act)
CREATE (committed_action)-[:BELONGS_TO]->(act)

// EMDR
CREATE (aip_model)-[:BELONGS_TO]->(emdr)
CREATE (bilateral_stimulation)-[:BELONGS_TO]->(emdr)
CREATE (target_memory)-[:BELONGS_TO]->(emdr)
CREATE (negative_cognition)-[:BELONGS_TO]->(emdr)
CREATE (positive_cognition)-[:BELONGS_TO]->(emdr)
CREATE (suds)-[:BELONGS_TO]->(emdr)
CREATE (voc)-[:BELONGS_TO]->(emdr)
CREATE (emdr_phases)-[:BELONGS_TO]->(emdr)

// Somatic Experiencing
CREATE (felt_sense)-[:BELONGS_TO]->(somatic_experiencing)
CREATE (titration)-[:BELONGS_TO]->(somatic_experiencing)
CREATE (pendulation)-[:BELONGS_TO]->(somatic_experiencing)
CREATE (discharge)-[:BELONGS_TO]->(somatic_experiencing)
CREATE (resourcing)-[:BELONGS_TO]->(somatic_experiencing)
CREATE (orienting)-[:BELONGS_TO]->(somatic_experiencing)
CREATE (defensive_responses)-[:BELONGS_TO]->(somatic_experiencing)

// CPT
CREATE (stuck_point)-[:BELONGS_TO]->(cpt)
CREATE (assimilation)-[:BELONGS_TO]->(cpt)
CREATE (overaccommodation)-[:BELONGS_TO]->(cpt)
CREATE (accommodation)-[:BELONGS_TO]->(cpt)
CREATE (abc_worksheet)-[:BELONGS_TO]->(cpt)
CREATE (challenging_questions)-[:BELONGS_TO]->(cpt)
CREATE (trauma_themes)-[:BELONGS_TO]->(cpt)

// MBCT
CREATE (decentering)-[:BELONGS_TO]->(mbct)
CREATE (body_scan)-[:BELONGS_TO]->(mbct)
CREATE (sitting_meditation)-[:BELONGS_TO]->(mbct)
CREATE (mindful_movement)-[:BELONGS_TO]->(mbct)
CREATE (three_minute_breathing)-[:BELONGS_TO]->(mbct)
CREATE (depression_relapse)-[:BELONGS_TO]->(mbct)

// Polyvagal
CREATE (ventral_vagal)-[:BELONGS_TO]->(polyvagal)
CREATE (sympathetic_state)-[:BELONGS_TO]->(polyvagal)
CREATE (dorsal_vagal)-[:BELONGS_TO]->(polyvagal)
CREATE (neuroception)-[:BELONGS_TO]->(polyvagal)
CREATE (co_regulation)-[:BELONGS_TO]->(polyvagal)
CREATE (vagal_brake)-[:BELONGS_TO]->(polyvagal)
CREATE (social_engagement)-[:BELONGS_TO]->(polyvagal)

// IFS part hierarchy
CREATE (firefighter)-[:TYPE_OF]->(protector)
CREATE (manager_ifs)-[:TYPE_OF]->(protector)


// ============================================================
// RELATIONSHIPS - THERAPY -> CLINICAL TARGETS
// ============================================================

// DBT
CREATE (dbt)-[:DEVELOPED_FOR]->(bpd)
CREATE (dbt)-[:TREATS]->(emotional_dysregulation)
CREATE (dbt)-[:TREATS]->(ptsd)

// CBT
CREATE (cbt)-[:TREATS]->(mdd)
CREATE (cbt)-[:TREATS]->(gad)
CREATE (cbt)-[:TREATS]->(panic_disorder)
CREATE (cbt)-[:TREATS]->(social_anxiety)
CREATE (cbt)-[:TREATS]->(ocd)

// ACT
CREATE (act)-[:TREATS]->(mdd)
CREATE (act)-[:TREATS]->(gad)

// EMDR
CREATE (emdr)-[:TREATS]->(ptsd)
CREATE (emdr)-[:TREATS]->(cptsd)

// CPT
CREATE (cpt)-[:TREATS]->(ptsd)

// IFS
CREATE (ifs)-[:TREATS]->(cptsd)
CREATE (ifs)-[:TREATS]->(dissociation)
CREATE (ifs)-[:TREATS]->(bpd)

// SE
CREATE (somatic_experiencing)-[:TREATS]->(ptsd)
CREATE (somatic_experiencing)-[:TREATS]->(cptsd)

// MBCT
CREATE (mbct)-[:DEVELOPED_FOR]->(mdd)
CREATE (mbct)-[:TREATS]->(rumination)


// ============================================================
// RELATIONSHIPS - SKILL -> SYMPTOM TARGETS
// ============================================================

CREATE (distress_tolerance)-[:TARGETS]->(emotional_dysregulation)
CREATE (tipp)-[:TARGETS {mechanism: "activates parasympathetic via dive reflex"}]->(emotional_dysregulation)
CREATE (tipp)-[:TARGETS]->(panic)
CREATE (opposite_action)-[:TARGETS]->(avoidance_symptom)
CREATE (exposure)-[:TARGETS]->(avoidance_symptom)
CREATE (exposure)-[:TARGETS]->(fear)
CREATE (radical_acceptance)-[:TARGETS]->(rumination)
CREATE (defusion)-[:TARGETS]->(rumination)
CREATE (behavioral_activation)-[:TARGETS]->(mdd)
CREATE (check_the_facts)-[:TARGETS]->(catastrophizing)
CREATE (thought_record)-[:TARGETS]->(cognitive_distortion)


// ============================================================
// RELATIONSHIPS - SKILL -> EMOTION
// ============================================================

// IFS
CREATE (exile)-[:CARRIES]->(cold_shame)
CREATE (exile)-[:CARRIES]->(fear)
CREATE (exile)-[:CARRIES]->(loneliness)
CREATE (exile)-[:CARRIES]->(sadness)
CREATE (firefighter)-[:RESPONDS_TO]->(fear)
CREATE (firefighter)-[:RESPONDS_TO]->(cold_shame)
CREATE (firefighter)-[:RESPONDS_TO]->(overwhelm)
CREATE (manager_ifs)-[:PREVENTS]->(cold_shame)
CREATE (manager_ifs)-[:PREVENTS]->(fear)
CREATE (manager_ifs)-[:PREVENTS]->(rejection)

// DBT
CREATE (opposite_action)-[:ADDRESSES]->(fear)
CREATE (opposite_action)-[:ADDRESSES]->(cold_shame)
CREATE (opposite_action)-[:ADDRESSES]->(sadness)
CREATE (opposite_action)-[:ADDRESSES]->(anger)
CREATE (tipp)-[:REDUCES]->(panic)
CREATE (tipp)-[:REDUCES]->(overwhelm)
CREATE (tipp)-[:REDUCES]->(anger)


// ============================================================
// RELATIONSHIPS - SKILL -> BRAIN/FUNCTION
// ============================================================

CREATE (tipp)-[:MODULATES {direction: "down-regulates", mechanism: "dive reflex, vagal activation"}]->(amygdala)

CREATE (exposure)-[:MODULATES {direction: "promotes", mechanism: "extinction learning"}]->(fear_extinction)

CREATE (mindfulness)-[:MODULATES {direction: "strengthens"}]->(insula)
CREATE (mindfulness)-[:MODULATES {direction: "strengthens"}]->(pfc)
CREATE (mindfulness)-[:MODULATES {direction: "increases"}]->(interoception)

CREATE (behavioral_activation)-[:MODULATES {direction: "increases"}]->(dopamine)


// ============================================================
// RELATIONSHIPS - POLYVAGAL -> EMOTION/BRAIN
// ============================================================

CREATE (ventral_vagal)-[:ASSOCIATED_WITH]->(safety)
CREATE (ventral_vagal)-[:ASSOCIATED_WITH]->(calm)
CREATE (ventral_vagal)-[:ENABLES]->(co_regulation)

CREATE (sympathetic_state)-[:ASSOCIATED_WITH]->(fear)
CREATE (sympathetic_state)-[:ASSOCIATED_WITH]->(anger)
CREATE (sympathetic_state)-[:ASSOCIATED_WITH]->(anxiety)

CREATE (dorsal_vagal)-[:ASSOCIATED_WITH]->(numbness)
CREATE (dorsal_vagal)-[:ASSOCIATED_WITH]->(hopelessness)
CREATE (dorsal_vagal)-[:ASSOCIATED_WITH]->(dissociation)

CREATE (neuroception)-[:INVOLVES]->(amygdala)
CREATE (neuroception)-[:INVOLVES]->(insula)


// ============================================================
// RELATIONSHIPS - BODY SENSATION MODEL (Restructured)
// Using Emotion -[:FELT_AS]-> Sensation with region property
// ============================================================

// Anxiety body sensations
CREATE (anxiety)-[:FELT_AS {region: "chest"}]->(constriction)
CREATE (anxiety)-[:FELT_AS {region: "chest"}]->(racing_heart)
CREATE (anxiety)-[:FELT_AS {region: "stomach"}]->(butterflies)
CREATE (anxiety)-[:FELT_AS {region: "shoulders"}]->(tension)
CREATE (anxiety)-[:FELT_AS {region: "throat"}]->(constriction)

// Fear body sensations
CREATE (fear)-[:FELT_AS {region: "chest"}]->(racing_heart)
CREATE (fear)-[:FELT_AS {region: "stomach"}]->(heaviness)
CREATE (fear)-[:FELT_AS {region: "body"}]->(cold_sensation)
CREATE (fear)-[:FELT_AS {region: "legs"}]->(weakness)
CREATE (fear)-[:FELT_AS {region: "body"}]->(shaking)

// Panic body sensations
CREATE (panic)-[:FELT_AS {region: "chest"}]->(racing_heart)
CREATE (panic)-[:FELT_AS {region: "chest"}]->(constriction)
CREATE (panic)-[:FELT_AS {region: "body"}]->(shaking)
CREATE (panic)-[:FELT_AS {region: "hands"}]->(numbness_sensation)

// Anger body sensations
CREATE (anger)-[:FELT_AS {region: "head"}]->(pressure)
CREATE (anger)-[:FELT_AS {region: "head"}]->(heat)
CREATE (anger)-[:FELT_AS {region: "chest"}]->(heat)
CREATE (anger)-[:FELT_AS {region: "arms"}]->(tension)
CREATE (anger)-[:FELT_AS {region: "jaw"}]->(tension)

// Sadness body sensations
CREATE (sadness)-[:FELT_AS {region: "chest"}]->(heaviness)
CREATE (sadness)-[:FELT_AS {region: "throat"}]->(constriction)
CREATE (sadness)-[:FELT_AS {region: "body"}]->(heaviness)

// Shame body sensations
CREATE (hot_shame)-[:FELT_AS {region: "face"}]->(heat)
CREATE (hot_shame)-[:FELT_AS {region: "chest"}]->(heat)
CREATE (cold_shame)-[:FELT_AS {region: "stomach"}]->(heaviness)
CREATE (cold_shame)-[:FELT_AS {region: "body"}]->(weakness)

// Joy body sensations
CREATE (joy)-[:FELT_AS {region: "chest"}]->(expansion)
CREATE (joy)-[:FELT_AS {region: "chest"}]->(lightness)
CREATE (joy)-[:FELT_AS {region: "body"}]->(lightness)

// Calm body sensations
CREATE (calm)-[:FELT_AS {region: "body"}]->(lightness)
CREATE (calm)-[:FELT_AS {region: "shoulders"}]->(lightness)
CREATE (calm)-[:FELT_AS {region: "legs"}]->(groundedness)

// Love/compassion body sensations
CREATE (love)-[:FELT_AS {region: "chest"}]->(expansion)
CREATE (compassion)-[:FELT_AS {region: "chest"}]->(expansion)

// Stress body sensations
CREATE (stress)-[:FELT_AS {region: "shoulders"}]->(tension)
CREATE (stress)-[:FELT_AS {region: "neck"}]->(tension)
CREATE (stress)-[:FELT_AS {region: "back"}]->(tension)

// Excitement body sensations
CREATE (excitement)-[:FELT_AS {region: "stomach"}]->(butterflies)
CREATE (excitement)-[:FELT_AS {region: "chest"}]->(racing_heart)
CREATE (excitement)-[:FELT_AS {region: "body"}]->(restlessness)


// ============================================================
// RELATIONSHIPS - CROSS-MODALITY BRIDGES
// (High-value connections showing conceptual parallels)
// ============================================================

// Self/Observer Self parallels
CREATE (self_energy)-[:CONCEPTUALLY_RELATED_TO {type: "functional_equivalent"}]->(wise_mind)
CREATE (self_energy)-[:CONCEPTUALLY_RELATED_TO {type: "functional_equivalent"}]->(ventral_vagal)
CREATE (self_as_context)-[:CONCEPTUALLY_RELATED_TO {type: "functional_equivalent"}]->(self_energy)
CREATE (self_as_context)-[:CONCEPTUALLY_RELATED_TO {type: "functional_equivalent"}]->(wise_mind)

// Acceptance parallels
CREATE (radical_acceptance)-[:CONCEPTUALLY_RELATED_TO {type: "functional_equivalent"}]->(acceptance_act)

// Defusion/Unblending parallels
CREATE (unblending)-[:CONCEPTUALLY_RELATED_TO {type: "functional_equivalent"}]->(defusion)
CREATE (decentering)-[:CONCEPTUALLY_RELATED_TO {type: "functional_equivalent"}]->(defusion)
CREATE (decentering)-[:CONCEPTUALLY_RELATED_TO {type: "functional_equivalent"}]->(unblending)

// Present moment parallels
CREATE (present_moment)-[:CONCEPTUALLY_RELATED_TO {type: "functional_equivalent"}]->(observe)
CREATE (present_moment)-[:CONCEPTUALLY_RELATED_TO {type: "functional_equivalent"}]->(mindfulness)

// Mindfulness connections
CREATE (mindfulness)-[:CONCEPTUALLY_RELATED_TO {type: "shared_foundation"}]->(dbt_mindfulness)
CREATE (mindfulness)-[:CONCEPTUALLY_RELATED_TO {type: "shared_foundation"}]->(mbct)
CREATE (mindfulness)-[:CONCEPTUALLY_RELATED_TO {type: "shared_foundation"}]->(act)

// Parts/States parallels
CREATE (exile)-[:CONCEPTUALLY_RELATED_TO {type: "state_parallel"}]->(dorsal_vagal)
CREATE (firefighter)-[:CONCEPTUALLY_RELATED_TO {type: "state_parallel"}]->(sympathetic_state)
CREATE (manager_ifs)-[:CONCEPTUALLY_RELATED_TO {type: "functional_parallel"}]->(cen)

// Trailhead/Neuroception parallel
CREATE (neuroception)-[:CONCEPTUALLY_RELATED_TO {type: "functional_parallel"}]->(trailhead)

// Co-regulation/IE parallel
CREATE (co_regulation)-[:CONCEPTUALLY_RELATED_TO {type: "functional_parallel"}]->(interpersonal_effectiveness)

// Cognitive restructuring parallels
CREATE (check_the_facts)-[:CONCEPTUALLY_RELATED_TO {type: "functional_equivalent"}]->(thought_record)
CREATE (challenging_questions)-[:CONCEPTUALLY_RELATED_TO {type: "functional_equivalent"}]->(thought_record)

// Action despite emotion
CREATE (committed_action)-[:CONCEPTUALLY_RELATED_TO {type: "functional_parallel"}]->(opposite_action)

// Emotional dysregulation
CREATE (exile)-[:CONCEPTUALLY_RELATED_TO {type: "overlapping_construct"}]->(emotional_dysregulation)

// Body awareness
CREATE (felt_sense)-[:CONCEPTUALLY_RELATED_TO {type: "functional_equivalent"}]->(interoception)
CREATE (body_scan)-[:CONCEPTUALLY_RELATED_TO {type: "develops"}]->(interoception)


// ============================================================
// RELATIONSHIPS - CLINICAL -> BRAIN
// ============================================================

// PTSD
CREATE (ptsd)-[:ASSOCIATED_WITH {finding: "hyperactivation", evidence: "strong"}]->(amygdala)
CREATE (ptsd)-[:ASSOCIATED_WITH {finding: "hypoactivation", evidence: "moderate"}]->(pfc)
CREATE (ptsd)-[:ASSOCIATED_WITH {finding: "reduced_volume", evidence: "strong"}]->(hippocampus)

// BPD
CREATE (bpd)-[:ASSOCIATED_WITH {finding: "hyperactivation"}]->(amygdala)
CREATE (bpd)-[:ASSOCIATED_WITH {finding: "reduced_connectivity"}]->(pfc)

// MDD
CREATE (mdd)-[:ASSOCIATED_WITH {finding: "hyperactivation"}]->(dmn)
CREATE (mdd)-[:ASSOCIATED_WITH {finding: "hypoactivation"}]->(dlpfc)
CREATE (mdd)-[:ASSOCIATED_WITH {finding: "dysregulation"}]->(serotonin)

// GAD
CREATE (gad)-[:ASSOCIATED_WITH {finding: "hyperactivation"}]->(amygdala)
CREATE (gad)-[:ASSOCIATED_WITH {finding: "hyperactivation"}]->(bed_nucleus)

// ADHD
CREATE (adhd)-[:ASSOCIATED_WITH {finding: "hypoactivation"}]->(pfc)
CREATE (adhd)-[:ASSOCIATED_WITH {finding: "dysregulation"}]->(dopamine)

// OCD
CREATE (ocd)-[:ASSOCIATED_WITH {finding: "hyperactivation", notes: "error signal that won't turn off"}]->(acc)
CREATE (ocd)-[:ASSOCIATED_WITH {finding: "hyperactivation", notes: "OFC-striatal loop"}]->(ofc)

// Panic
CREATE (panic_disorder)-[:ASSOCIATED_WITH {finding: "hyperactivation"}]->(amygdala)
CREATE (panic_disorder)-[:ASSOCIATED_WITH {finding: "hyperactivation", notes: "suffocation alarm theory"}]->(periaqueductal_gray)

// Social anxiety
CREATE (social_anxiety)-[:ASSOCIATED_WITH {finding: "hyperactivation"}]->(amygdala)

// Dissociation
CREATE (dissociation)-[:ASSOCIATED_WITH {finding: "altered_connectivity"}]->(insula)


// ============================================================
// INDEXES & CONSTRAINTS
// (Run these separately for performance)
// ============================================================

// CREATE CONSTRAINT brain_id IF NOT EXISTS FOR (b:BrainStructure) REQUIRE b.id IS UNIQUE;
// CREATE CONSTRAINT emotion_id IF NOT EXISTS FOR (e:Emotion) REQUIRE e.id IS UNIQUE;
// CREATE CONSTRAINT therapy_modality_id IF NOT EXISTS FOR (t:TherapyModality) REQUIRE t.id IS UNIQUE;
// CREATE CONSTRAINT therapy_concept_id IF NOT EXISTS FOR (c:TherapyConcept) REQUIRE c.id IS UNIQUE;
// CREATE CONSTRAINT clinical_id IF NOT EXISTS FOR (c:ClinicalConstruct) REQUIRE c.id IS UNIQUE;
// CREATE CONSTRAINT function_id IF NOT EXISTS FOR (f:Function) REQUIRE f.id IS UNIQUE;
// CREATE CONSTRAINT network_id IF NOT EXISTS FOR (n:FunctionalNetwork) REQUIRE n.id IS UNIQUE;
// CREATE CONSTRAINT neurochemical_id IF NOT EXISTS FOR (n:NeurochemicalSystem) REQUIRE n.id IS UNIQUE;
// CREATE INDEX emotion_quadrant IF NOT EXISTS FOR (e:Emotion) ON (e.quadrant);
// CREATE INDEX therapy_concept_modality IF NOT EXISTS FOR (c:TherapyConcept) ON (c.modality);


// ============================================================
// HiTOP FRAMEWORK - HIERARCHICAL TAXONOMY OF PSYCHOPATHOLOGY
// Per domain expert: "The fundamental structure of the knowledge
// graph must move beyond categorical constraints of DSM-5-TR/ICD-11
// to reflect the dimensional reality of psychopathology"
// ============================================================

// P-Factor: General factor of psychopathology
CREATE (p_factor:HiTOPConstruct {
  id: "hitop_p_factor",
  name: "P-Factor (General Psychopathology)",
  level: "superordinate",
  description: "General factor underlying all mental disorder symptoms; correlates with mPFC dysregulation of subcortical arousal",
  neural_correlates: ["mPFC dysfunction", "subcortical arousal dysregulation"],
  evidence_base: "Caspi & Moffitt (2018); Lahey et al. (2012)"
})

// HiTOP Spectra
CREATE (internalizing_spectrum:HiTOPConstruct {
  id: "hitop_internalizing",
  name: "Internalizing Spectrum",
  level: "spectrum",
  description: "Captures shared genetic diathesis, environmental risk factors, and neural substrates common to distress and fear-based conditions",
  subfactors: ["Distress", "Fear"],
  rdoc_domain: "Negative Valence Systems",
  key_neural_circuitry: ["amygdala", "mPFC", "dACC", "insula"]
})

CREATE (externalizing_spectrum:HiTOPConstruct {
  id: "hitop_externalizing",
  name: "Externalizing Spectrum",
  level: "spectrum",
  description: "Disinhibited and antagonistic behavioral patterns",
  subfactors: ["Disinhibited Externalizing", "Antagonistic Externalizing"],
  rdoc_domain: "Positive Valence / Cognitive Systems",
  key_neural_circuitry: ["ventral_striatum", "dlPFC", "OFC"]
})

CREATE (thought_disorder_spectrum:HiTOPConstruct {
  id: "hitop_thought_disorder",
  name: "Thought Disorder Spectrum",
  level: "spectrum",
  description: "Psychotic and schizotypal presentations",
  subfactors: ["Psychoticism", "Detachment"],
  rdoc_domain: "Cognitive / Social Processes",
  key_neural_circuitry: ["thalamus", "cerebellum", "TPJ", "mPFC"]
})

CREATE (somatoform_spectrum:HiTOPConstruct {
  id: "hitop_somatoform",
  name: "Somatoform Spectrum",
  level: "spectrum",
  description: "Somatic symptom presentations and illness anxiety",
  rdoc_domain: "Arousal and Regulatory Systems",
  key_neural_circuitry: ["posterior_insula", "somatosensory_cortex"]
})

CREATE (detachment_spectrum:HiTOPConstruct {
  id: "hitop_detachment",
  name: "Detachment Spectrum",
  level: "spectrum",
  description: "Social withdrawal, anhedonia, restricted affect",
  key_neural_circuitry: ["nucleus_accumbens", "mPFC"]
})

// HiTOP Subfactors
CREATE (hitop_distress:HiTOPConstruct {
  id: "hitop_distress",
  name: "Distress Subfactor",
  level: "subfactor",
  parent_spectrum: "internalizing",
  description: "Depressive, dysthymic, anxious-misery presentations",
  clinical_manifestations: ["MDD", "Dysthymia", "GAD"]
})

CREATE (hitop_fear:HiTOPConstruct {
  id: "hitop_fear",
  name: "Fear Subfactor",
  level: "subfactor",
  parent_spectrum: "internalizing",
  description: "Phobic and panic presentations",
  clinical_manifestations: ["Panic Disorder", "Specific Phobias", "Social Anxiety"]
})


// ============================================================
// RDoC FRAMEWORK - RESEARCH DOMAIN CRITERIA
// Provides granular "units of analysis" for HiTOP spectra
// ============================================================

// RDoC Domains
CREATE (rdoc_negative_valence:RDoCDomain {
  id: "rdoc_negative_valence",
  name: "Negative Valence Systems",
  description: "Systems for responses to aversive situations/contexts including fear, anxiety, and loss",
  constructs: ["Acute Threat (Fear)", "Potential Threat (Anxiety)", "Sustained Threat", "Loss", "Frustrative Nonreward"]
})

CREATE (rdoc_positive_valence:RDoCDomain {
  id: "rdoc_positive_valence",
  name: "Positive Valence Systems",
  description: "Systems for responses to positive motivational situations",
  constructs: ["Reward Responsiveness", "Reward Learning", "Reward Valuation", "Approach Motivation"]
})

CREATE (rdoc_cognitive:RDoCDomain {
  id: "rdoc_cognitive",
  name: "Cognitive Systems",
  description: "Systems responsible for various cognitive processes",
  constructs: ["Attention", "Perception", "Declarative Memory", "Working Memory", "Cognitive Control", "Language"]
})

CREATE (rdoc_social:RDoCDomain {
  id: "rdoc_social",
  name: "Systems for Social Processes",
  description: "Systems for mediating responses to interpersonal settings",
  constructs: ["Affiliation and Attachment", "Social Communication", "Perception and Understanding of Self", "Perception and Understanding of Others"]
})

CREATE (rdoc_arousal:RDoCDomain {
  id: "rdoc_arousal",
  name: "Arousal and Regulatory Systems",
  description: "Systems responsible for activation of neural systems and homeostatic regulation",
  constructs: ["Arousal", "Circadian Rhythms", "Sleep-Wakefulness"]
})

CREATE (rdoc_sensorimotor:RDoCDomain {
  id: "rdoc_sensorimotor",
  name: "Sensorimotor Systems",
  description: "Systems responsible for motor behavior control",
  constructs: ["Motor Actions", "Agency and Ownership"]
})

// Key RDoC Constructs (most relevant to therapy modalities)
CREATE (rdoc_acute_threat:RDoCConstruct {
  id: "rdoc_acute_threat",
  name: "Acute Threat (Fear)",
  domain: "Negative Valence Systems",
  description: "Activation of the brain's defensive motivational system to promote behaviors that protect from perceived danger",
  neural_circuit: ["amygdala", "BNST", "PAG", "hypothalamus"],
  therapeutic_targets: ["exposure", "EMDR", "SE"]
})

CREATE (rdoc_potential_threat:RDoCConstruct {
  id: "rdoc_potential_threat",
  name: "Potential Threat (Anxiety)",
  domain: "Negative Valence Systems",
  description: "Sustained activation of defensive system in response to uncertain threat",
  neural_circuit: ["BNST", "hippocampus", "mPFC"],
  therapeutic_targets: ["DBT", "ACT", "CBT"]
})

CREATE (rdoc_loss:RDoCConstruct {
  id: "rdoc_loss",
  name: "Loss",
  domain: "Negative Valence Systems",
  description: "Response to loss of access to reward or anticipated loss",
  neural_circuit: ["vACC", "amygdala", "nucleus_accumbens"],
  therapeutic_targets: ["behavioral_activation", "CPT", "MBCT"]
})

CREATE (rdoc_self_perception:RDoCConstruct {
  id: "rdoc_self_perception",
  name: "Perception and Understanding of Self",
  domain: "Systems for Social Processes",
  description: "Processes involved in perceiving, knowing about, and understanding the self",
  neural_circuit: ["mPFC", "PCC", "insula"],
  notes: "Neurobiological anchor for IFS Self-energy, ACT Observing Self, DBT Wise Mind"
})

CREATE (rdoc_affiliation:RDoCConstruct {
  id: "rdoc_affiliation",
  name: "Affiliation and Attachment",
  domain: "Systems for Social Processes",
  description: "Engagement in positive social interactions and formation of social bonds",
  neural_circuit: ["hypothalamus", "mPFC", "nucleus_accumbens"],
  neurochemical: ["oxytocin", "dopamine"],
  therapeutic_targets: ["IFS", "Polyvagal co-regulation"]
})


// ============================================================
// WINDOW OF TOLERANCE
// Per domain expert: "Serves as the overarching physiological
// model for the knowledge graph"
// ============================================================

CREATE (window_of_tolerance:TherapyConcept {
  id: "window_of_tolerance",
  name: "Window of Tolerance",
  description: "Range of optimal arousal within which a person can function effectively; integrates Siegel's interpersonal neurobiology with Polyvagal Theory",
  modality: "cross_modality",
  founder: "Dan Siegel",
  zones: ["Optimal Zone", "Hyperarousal", "Hypoarousal"]
})

CREATE (optimal_zone:TherapyConcept {
  id: "wot_optimal_zone",
  name: "Optimal Arousal Zone",
  description: "Ventral Vagal state; emotional/physiological equilibrium; CEN active; adaptable, flexible thinking",
  modality: "Window of Tolerance",
  autonomic_state: "ventral_vagal",
  characteristics: ["emotional equilibrium", "adaptability", "flexible thinking", "social engagement"]
})

CREATE (hyperarousal_zone:TherapyConcept {
  id: "wot_hyperarousal",
  name: "Hyperarousal Zone",
  description: "Sympathetic/Fight-Flight activation; amygdala distress signals; PFC deactivation; inhibited speech and rational decision-making",
  modality: "Window of Tolerance",
  autonomic_state: "sympathetic",
  characteristics: ["panic", "rage", "hypervigilance", "racing thoughts", "impulsivity"]
})

CREATE (hypoarousal_zone:TherapyConcept {
  id: "wot_hypoarousal",
  name: "Hypoarousal Zone",
  description: "Dorsal Vagal/Freeze-Shutdown; emotional numbing, dissociation, flat affect, reduced heart rate",
  modality: "Window of Tolerance",
  autonomic_state: "dorsal_vagal",
  characteristics: ["numbness", "dissociation", "flat affect", "collapse", "shutdown"]
})

CREATE (frozen_flight:TherapyConcept {
  id: "wot_frozen_flight",
  name: "Frozen Flight State",
  description: "Co-activation of high SNS + high PNS; 'deer in headlights' presentation with muscle rigidity",
  modality: "Window of Tolerance",
  autonomic_state: "mixed",
  characteristics: ["muscle rigidity", "frozen terror", "immobility with high arousal"]
})


// ============================================================
// ADDITIONAL BRAIN STRUCTURES (Required by Expert)
// ============================================================

CREATE (atl:BrainStructure {
  id: "atl",
  name: "Anterior Temporal Lobe",
  description: "Anterior temporal cortex; social semantic knowledge, conceptual processing, guilt-related cognition",
  aliases: ["ATL", "anterior temporal cortex"],
  level: "cortical",
  functions: ["social_semantic_knowledge", "conceptual_processing"]
})

CREATE (visual_cortex:BrainStructure {
  id: "visual_cortex",
  name: "Visual Cortex",
  description: "Occipital cortex; visual processing; involved in mental imagery of critical observers (shame)",
  aliases: ["V1", "occipital cortex"],
  level: "cortical"
})

CREATE (cerebellum:BrainStructure {
  id: "cerebellum",
  name: "Cerebellum",
  description: "Coordination, motor learning, cognitive functions; involved in fear extinction",
  level: "subcortical"
})


// ============================================================
// EMDR CONSOLIDATION MECHANISMS
// Per expert: "Link AIP model to hippocampal-cortical transfer
// mediated by 40 Hz Gamma Band oscillations"
// ============================================================

CREATE (emdr_consolidation:TherapyConcept {
  id: "emdr_consolidation",
  name: "Memory Consolidation Process",
  description: "Transfer of traumatic memories from hippocampus-amygdala complex to neocortex; shifts from implicit to explicit memory",
  modality: "EMDR",
  mechanism: "hippocampal_cortical_transfer"
})

CREATE (gamma_oscillations:TherapyConcept {
  id: "emdr_gamma",
  name: "Gamma Band Oscillations (40 Hz)",
  description: "Neural oscillations that solve the 'binding problem' by synchronizing neuronal assemblies across sensory and emotional areas",
  modality: "EMDR",
  frequency: "40 Hz",
  function: "Unbinding memory from limbic system, linking with mPFC"
})

CREATE (memory_reconsolidation:TherapyConcept {
  id: "emdr_reconsolidation",
  name: "Memory Reconsolidation",
  description: "Process by which reactivated memories become labile and can be modified before re-storage",
  modality: "EMDR",
  mechanism: "reactivation_modification_restabilization"
})


// ============================================================
// ENHANCED SELF-CONSCIOUS AFFECT MODEL
// Per expert: "Shame and guilt possess distinct cognitive
// structures, neural signatures, and action tendencies"
// ============================================================

// Note: Enhancing existing shame/guilt with more specific properties
// The base nodes exist; adding supplementary detail nodes

CREATE (shame_neural_signature:NeuralSignature {
  id: "shame_neural",
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
})

CREATE (guilt_neural_signature:NeuralSignature {
  id: "guilt_neural",
  name: "Guilt Neural Signature",
  emotion: "guilt",
  primary_hubs: ["TPJ", "ATL", "dmPFC"],
  shared_core: ["anterior_insula", "dACC"],
  evaluative_focus: "Specific Behavior ('I did something wrong')",
  action_tendency: "reparation, prosocial behavior, empathy",
  clinical_implication: "Often adaptive; maladaptive if ruminative",
  notes: "Increases empathic concern and prosociality (other-oriented)"
})

CREATE (social_pain:NeuralSignature {
  id: "social_pain_neural",
  name: "Social Pain Neural Signature",
  description: "Neural response to social exclusion/rejection",
  primary_hubs: ["dACC", "anterior_insula", "thalamus"],
  overlap_with: ["physical_pain"],
  related_emotions: ["shame", "rejection", "loneliness"]
})


// ============================================================
// CPT NEURAL DISSOCIATION
// Per expert: "Clear dissociation between left PFC (retrieval
// demand) and left ACC (goal-relevant control demand)"
// ============================================================

CREATE (cpt_retrieval_demand:TherapyConcept {
  id: "cpt_retrieval",
  name: "Memory Retrieval Demand",
  description: "Left PFC (BA 9/46) activity reflecting effort to retrieve adaptive thoughts; decreases as therapy progresses",
  modality: "CPT",
  neural_hub: "left_dlPFC",
  change_direction: "decreases with treatment",
  notes: "Reflects 'ease of retrieval' for balanced beliefs"
})

CREATE (cpt_control_demand:TherapyConcept {
  id: "cpt_control",
  name: "Goal-Relevant Control Demand",
  description: "Left ACC (BA 24/32) activity reflecting monitoring required to override traumatic schemas; may increase with skill refinement",
  modality: "CPT",
  neural_hub: "left_ACC",
  change_direction: "may increase with skill refinement",
  notes: "High-level monitoring to override deeply ingrained schemas"
})
