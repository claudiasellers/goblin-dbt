// ============================================================
// INCREMENTAL UPDATE - Run this against existing Neo4j database
// This file contains ONLY the new additions from the domain expert audit
// ============================================================


// ============================================================
// STEP 1: UPDATE EXISTING NODES (run these first)
// Using MATCH + SET to update properties on existing nodes
// ============================================================

// Update IFS Self with neurochemical properties
MATCH (self:TherapyConcept {id: "ifs_self"})
SET self.description = "Core, undamaged essence characterized by the 8 C's; neurobiologically corresponds to mPFC activation and ventral vagal tone",
    self.neurochemical_markers = ["serotonin", "oxytocin"],
    self.physiological_correlate = "ventral_vagal_tone",
    self.neural_hub = "mPFC",
    self.mechanism = "mPFC sends inhibitory signals to amygdala, quieting alarm system and enabling CEN activation";

// Update Cold Shame with trait vulnerability marker
MATCH (cs:Emotion {id: "cold_shame"})
SET cs.description = "Internalized shame with low arousal - collapse, withdrawal, worthlessness; global negative self-evaluation",
    cs.evaluative_focus = "Global Self ('I am defective')",
    cs.action_tendency = "hiding, withdrawal, submission",
    cs.trait_vulnerability_marker = true,
    cs.clinical_note = "Hypersensitivity persists even in MDD remission - trait marker for depression";

// Update Guilt with other-oriented properties
MATCH (g:Emotion {id: "guilt"})
SET g.description = "Feeling of responsibility for wrongdoing; behavior-specific and other-oriented",
    g.evaluative_focus = "Specific Behavior ('I did something wrong')",
    g.action_tendency = "reparation, apology, prosocial behavior",
    g.social_orientation = "other-focused",
    g.clinical_note = "Often adaptive; increases empathic concern; maladaptive when ruminative";


// ============================================================
// STEP 2: CREATE NEW HITOP FRAMEWORK NODES
// ============================================================

CREATE (p_factor:HiTOPConstruct {
  id: "hitop_p_factor",
  name: "P-Factor (General Psychopathology)",
  level: "superordinate",
  description: "General factor underlying all mental disorder symptoms; correlates with mPFC dysregulation of subcortical arousal",
  neural_correlates: ["mPFC dysfunction", "subcortical arousal dysregulation"],
  evidence_base: "Caspi & Moffitt (2018); Lahey et al. (2012)"
});

CREATE (internalizing_spectrum:HiTOPConstruct {
  id: "hitop_internalizing",
  name: "Internalizing Spectrum",
  level: "spectrum",
  description: "Captures shared genetic diathesis, environmental risk factors, and neural substrates common to distress and fear-based conditions",
  subfactors: ["Distress", "Fear"],
  rdoc_domain: "Negative Valence Systems",
  key_neural_circuitry: ["amygdala", "mPFC", "dACC", "insula"]
});

CREATE (externalizing_spectrum:HiTOPConstruct {
  id: "hitop_externalizing",
  name: "Externalizing Spectrum",
  level: "spectrum",
  description: "Disinhibited and antagonistic behavioral patterns",
  subfactors: ["Disinhibited Externalizing", "Antagonistic Externalizing"],
  rdoc_domain: "Positive Valence / Cognitive Systems",
  key_neural_circuitry: ["ventral_striatum", "dlPFC", "OFC"]
});

CREATE (thought_disorder_spectrum:HiTOPConstruct {
  id: "hitop_thought_disorder",
  name: "Thought Disorder Spectrum",
  level: "spectrum",
  description: "Psychotic and schizotypal presentations",
  subfactors: ["Psychoticism", "Detachment"],
  rdoc_domain: "Cognitive / Social Processes",
  key_neural_circuitry: ["thalamus", "cerebellum", "TPJ", "mPFC"]
});

CREATE (somatoform_spectrum:HiTOPConstruct {
  id: "hitop_somatoform",
  name: "Somatoform Spectrum",
  level: "spectrum",
  description: "Somatic symptom presentations and illness anxiety",
  rdoc_domain: "Arousal and Regulatory Systems",
  key_neural_circuitry: ["posterior_insula", "somatosensory_cortex"]
});

CREATE (detachment_spectrum:HiTOPConstruct {
  id: "hitop_detachment",
  name: "Detachment Spectrum",
  level: "spectrum",
  description: "Social withdrawal, anhedonia, restricted affect",
  key_neural_circuitry: ["nucleus_accumbens", "mPFC"]
});

CREATE (hitop_distress:HiTOPConstruct {
  id: "hitop_distress",
  name: "Distress Subfactor",
  level: "subfactor",
  parent_spectrum: "internalizing",
  description: "Depressive, dysthymic, anxious-misery presentations",
  clinical_manifestations: ["MDD", "Dysthymia", "GAD"]
});

CREATE (hitop_fear:HiTOPConstruct {
  id: "hitop_fear",
  name: "Fear Subfactor",
  level: "subfactor",
  parent_spectrum: "internalizing",
  description: "Phobic and panic presentations",
  clinical_manifestations: ["Panic Disorder", "Specific Phobias", "Social Anxiety"]
});


// ============================================================
// STEP 3: CREATE NEW RDOC FRAMEWORK NODES
// ============================================================

CREATE (rdoc_negative_valence:RDoCDomain {
  id: "rdoc_negative_valence",
  name: "Negative Valence Systems",
  description: "Systems for responses to aversive situations/contexts including fear, anxiety, and loss",
  constructs: ["Acute Threat (Fear)", "Potential Threat (Anxiety)", "Sustained Threat", "Loss", "Frustrative Nonreward"]
});

CREATE (rdoc_positive_valence:RDoCDomain {
  id: "rdoc_positive_valence",
  name: "Positive Valence Systems",
  description: "Systems for responses to positive motivational situations",
  constructs: ["Reward Responsiveness", "Reward Learning", "Reward Valuation", "Approach Motivation"]
});

CREATE (rdoc_cognitive:RDoCDomain {
  id: "rdoc_cognitive",
  name: "Cognitive Systems",
  description: "Systems responsible for various cognitive processes",
  constructs: ["Attention", "Perception", "Declarative Memory", "Working Memory", "Cognitive Control", "Language"]
});

CREATE (rdoc_social:RDoCDomain {
  id: "rdoc_social",
  name: "Systems for Social Processes",
  description: "Systems for mediating responses to interpersonal settings",
  constructs: ["Affiliation and Attachment", "Social Communication", "Perception and Understanding of Self", "Perception and Understanding of Others"]
});

CREATE (rdoc_arousal:RDoCDomain {
  id: "rdoc_arousal",
  name: "Arousal and Regulatory Systems",
  description: "Systems responsible for activation of neural systems and homeostatic regulation",
  constructs: ["Arousal", "Circadian Rhythms", "Sleep-Wakefulness"]
});

CREATE (rdoc_sensorimotor:RDoCDomain {
  id: "rdoc_sensorimotor",
  name: "Sensorimotor Systems",
  description: "Systems responsible for motor behavior control",
  constructs: ["Motor Actions", "Agency and Ownership"]
});

CREATE (rdoc_acute_threat:RDoCConstruct {
  id: "rdoc_acute_threat",
  name: "Acute Threat (Fear)",
  domain: "Negative Valence Systems",
  description: "Activation of the brain's defensive motivational system to promote behaviors that protect from perceived danger",
  neural_circuit: ["amygdala", "BNST", "PAG", "hypothalamus"],
  therapeutic_targets: ["exposure", "EMDR", "SE"]
});

CREATE (rdoc_potential_threat:RDoCConstruct {
  id: "rdoc_potential_threat",
  name: "Potential Threat (Anxiety)",
  domain: "Negative Valence Systems",
  description: "Sustained activation of defensive system in response to uncertain threat",
  neural_circuit: ["BNST", "hippocampus", "mPFC"],
  therapeutic_targets: ["DBT", "ACT", "CBT"]
});

CREATE (rdoc_loss:RDoCConstruct {
  id: "rdoc_loss",
  name: "Loss",
  domain: "Negative Valence Systems",
  description: "Response to loss of access to reward or anticipated loss",
  neural_circuit: ["vACC", "amygdala", "nucleus_accumbens"],
  therapeutic_targets: ["behavioral_activation", "CPT", "MBCT"]
});

CREATE (rdoc_self_perception:RDoCConstruct {
  id: "rdoc_self_perception",
  name: "Perception and Understanding of Self",
  domain: "Systems for Social Processes",
  description: "Processes involved in perceiving, knowing about, and understanding the self",
  neural_circuit: ["mPFC", "PCC", "insula"],
  notes: "Neurobiological anchor for IFS Self-energy, ACT Observing Self, DBT Wise Mind"
});

CREATE (rdoc_affiliation:RDoCConstruct {
  id: "rdoc_affiliation",
  name: "Affiliation and Attachment",
  domain: "Systems for Social Processes",
  description: "Engagement in positive social interactions and formation of social bonds",
  neural_circuit: ["hypothalamus", "mPFC", "nucleus_accumbens"],
  neurochemical: ["oxytocin", "dopamine"],
  therapeutic_targets: ["IFS", "Polyvagal co-regulation"]
});


// ============================================================
// STEP 4: CREATE WINDOW OF TOLERANCE NODES
// ============================================================

CREATE (window_of_tolerance:TherapyConcept {
  id: "window_of_tolerance",
  name: "Window of Tolerance",
  description: "Range of optimal arousal within which a person can function effectively; integrates Siegel's interpersonal neurobiology with Polyvagal Theory",
  modality: "cross_modality",
  founder: "Dan Siegel",
  zones: ["Optimal Zone", "Hyperarousal", "Hypoarousal"]
});

CREATE (optimal_zone:TherapyConcept {
  id: "wot_optimal_zone",
  name: "Optimal Arousal Zone",
  description: "Ventral Vagal state; emotional/physiological equilibrium; CEN active; adaptable, flexible thinking",
  modality: "Window of Tolerance",
  autonomic_state: "ventral_vagal",
  characteristics: ["emotional equilibrium", "adaptability", "flexible thinking", "social engagement"]
});

CREATE (hyperarousal_zone:TherapyConcept {
  id: "wot_hyperarousal",
  name: "Hyperarousal Zone",
  description: "Sympathetic/Fight-Flight activation; amygdala distress signals; PFC deactivation; inhibited speech and rational decision-making",
  modality: "Window of Tolerance",
  autonomic_state: "sympathetic",
  characteristics: ["panic", "rage", "hypervigilance", "racing thoughts", "impulsivity"]
});

CREATE (hypoarousal_zone:TherapyConcept {
  id: "wot_hypoarousal",
  name: "Hypoarousal Zone",
  description: "Dorsal Vagal/Freeze-Shutdown; emotional numbing, dissociation, flat affect, reduced heart rate",
  modality: "Window of Tolerance",
  autonomic_state: "dorsal_vagal",
  characteristics: ["numbness", "dissociation", "flat affect", "collapse", "shutdown"]
});

CREATE (frozen_flight:TherapyConcept {
  id: "wot_frozen_flight",
  name: "Frozen Flight State",
  description: "Co-activation of high SNS + high PNS; 'deer in headlights' presentation with muscle rigidity",
  modality: "Window of Tolerance",
  autonomic_state: "mixed",
  characteristics: ["muscle rigidity", "frozen terror", "immobility with high arousal"]
});


// ============================================================
// STEP 5: CREATE NEW BRAIN STRUCTURES
// ============================================================

CREATE (atl:BrainStructure {
  id: "atl",
  name: "Anterior Temporal Lobe",
  description: "Anterior temporal cortex; social semantic knowledge, conceptual processing, guilt-related cognition",
  aliases: ["ATL", "anterior temporal cortex"],
  level: "cortical",
  functions: ["social_semantic_knowledge", "conceptual_processing"]
});

CREATE (visual_cortex:BrainStructure {
  id: "visual_cortex",
  name: "Visual Cortex",
  description: "Occipital cortex; visual processing; involved in mental imagery of critical observers (shame)",
  aliases: ["V1", "occipital cortex"],
  level: "cortical"
});

CREATE (cerebellum:BrainStructure {
  id: "cerebellum",
  name: "Cerebellum",
  description: "Coordination, motor learning, cognitive functions; involved in fear extinction",
  level: "subcortical"
});


// ============================================================
// STEP 6: CREATE EMDR CONSOLIDATION MECHANISMS
// ============================================================

CREATE (emdr_consolidation:TherapyConcept {
  id: "emdr_consolidation",
  name: "Memory Consolidation Process",
  description: "Transfer of traumatic memories from hippocampus-amygdala complex to neocortex; shifts from implicit to explicit memory",
  modality: "EMDR",
  mechanism: "hippocampal_cortical_transfer"
});

CREATE (gamma_oscillations:TherapyConcept {
  id: "emdr_gamma",
  name: "Gamma Band Oscillations (40 Hz)",
  description: "Neural oscillations that solve the 'binding problem' by synchronizing neuronal assemblies across sensory and emotional areas",
  modality: "EMDR",
  frequency: "40 Hz",
  function: "Unbinding memory from limbic system, linking with mPFC"
});

CREATE (memory_reconsolidation:TherapyConcept {
  id: "emdr_reconsolidation",
  name: "Memory Reconsolidation",
  description: "Process by which reactivated memories become labile and can be modified before re-storage",
  modality: "EMDR",
  mechanism: "reactivation_modification_restabilization"
});


// ============================================================
// STEP 7: CREATE NEURAL SIGNATURES (Shame/Guilt Differentiation)
// ============================================================

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
});

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
});

CREATE (social_pain:NeuralSignature {
  id: "social_pain_neural",
  name: "Social Pain Neural Signature",
  description: "Neural response to social exclusion/rejection",
  primary_hubs: ["dACC", "anterior_insula", "thalamus"],
  overlap_with: ["physical_pain"],
  related_emotions: ["shame", "rejection", "loneliness"]
});


// ============================================================
// STEP 8: CREATE CPT NEURAL DISSOCIATION CONCEPTS
// ============================================================

CREATE (cpt_retrieval_demand:TherapyConcept {
  id: "cpt_retrieval",
  name: "Memory Retrieval Demand",
  description: "Left PFC (BA 9/46) activity reflecting effort to retrieve adaptive thoughts; decreases as therapy progresses",
  modality: "CPT",
  neural_hub: "left_dlPFC",
  change_direction: "decreases with treatment",
  notes: "Reflects 'ease of retrieval' for balanced beliefs"
});

CREATE (cpt_control_demand:TherapyConcept {
  id: "cpt_control",
  name: "Goal-Relevant Control Demand",
  description: "Left ACC (BA 24/32) activity reflecting monitoring required to override traumatic schemas; may increase with skill refinement",
  modality: "CPT",
  neural_hub: "left_ACC",
  change_direction: "may increase with skill refinement",
  notes: "High-level monitoring to override deeply ingrained schemas"
});


// ============================================================
// STEP 9: CREATE ALL NEW RELATIONSHIPS
// ============================================================

// --- HiTOP Hierarchy ---
MATCH (pf:HiTOPConstruct {id: "hitop_p_factor"}), (int:HiTOPConstruct {id: "hitop_internalizing"})
CREATE (int)-[:CONTRIBUTES_TO]->(pf);

MATCH (pf:HiTOPConstruct {id: "hitop_p_factor"}), (ext:HiTOPConstruct {id: "hitop_externalizing"})
CREATE (ext)-[:CONTRIBUTES_TO]->(pf);

MATCH (pf:HiTOPConstruct {id: "hitop_p_factor"}), (td:HiTOPConstruct {id: "hitop_thought_disorder"})
CREATE (td)-[:CONTRIBUTES_TO]->(pf);

MATCH (pf:HiTOPConstruct {id: "hitop_p_factor"}), (som:HiTOPConstruct {id: "hitop_somatoform"})
CREATE (som)-[:CONTRIBUTES_TO]->(pf);

MATCH (pf:HiTOPConstruct {id: "hitop_p_factor"}), (det:HiTOPConstruct {id: "hitop_detachment"})
CREATE (det)-[:CONTRIBUTES_TO]->(pf);

MATCH (pf:HiTOPConstruct {id: "hitop_p_factor"}), (mpfc:BrainStructure {id: "mpfc"})
CREATE (pf)-[:ASSOCIATED_WITH {finding: "dysregulation"}]->(mpfc);

MATCH (dist:HiTOPConstruct {id: "hitop_distress"}), (int:HiTOPConstruct {id: "hitop_internalizing"})
CREATE (dist)-[:PART_OF]->(int);

MATCH (fear:HiTOPConstruct {id: "hitop_fear"}), (int:HiTOPConstruct {id: "hitop_internalizing"})
CREATE (fear)-[:PART_OF]->(int);

// Clinical to HiTOP
MATCH (mdd:ClinicalConstruct {id: "mdd"}), (dist:HiTOPConstruct {id: "hitop_distress"})
CREATE (mdd)-[:MAPS_TO]->(dist);

MATCH (gad:ClinicalConstruct {id: "gad"}), (dist:HiTOPConstruct {id: "hitop_distress"})
CREATE (gad)-[:MAPS_TO]->(dist);

MATCH (ptsd:ClinicalConstruct {id: "ptsd"}), (int:HiTOPConstruct {id: "hitop_internalizing"})
CREATE (ptsd)-[:MAPS_TO]->(int);

MATCH (panic:ClinicalConstruct {id: "panic_disorder"}), (fear:HiTOPConstruct {id: "hitop_fear"})
CREATE (panic)-[:MAPS_TO]->(fear);

MATCH (sad:ClinicalConstruct {id: "social_anxiety"}), (fear:HiTOPConstruct {id: "hitop_fear"})
CREATE (sad)-[:MAPS_TO]->(fear);

MATCH (adhd:ClinicalConstruct {id: "adhd"}), (ext:HiTOPConstruct {id: "hitop_externalizing"})
CREATE (adhd)-[:MAPS_TO]->(ext);

// HiTOP to Neural
MATCH (int:HiTOPConstruct {id: "hitop_internalizing"}), (amyg:BrainStructure {id: "amygdala"})
CREATE (int)-[:KEY_CIRCUIT]->(amyg);

MATCH (int:HiTOPConstruct {id: "hitop_internalizing"}), (mpfc:BrainStructure {id: "mpfc"})
CREATE (int)-[:KEY_CIRCUIT]->(mpfc);

MATCH (int:HiTOPConstruct {id: "hitop_internalizing"}), (dacc:BrainStructure {id: "dacc"})
CREATE (int)-[:KEY_CIRCUIT]->(dacc);

MATCH (int:HiTOPConstruct {id: "hitop_internalizing"}), (ins:BrainStructure {id: "insula"})
CREATE (int)-[:KEY_CIRCUIT]->(ins);

MATCH (ext:HiTOPConstruct {id: "hitop_externalizing"}), (nacc:BrainStructure {id: "nucleus_accumbens"})
CREATE (ext)-[:KEY_CIRCUIT]->(nacc);

MATCH (ext:HiTOPConstruct {id: "hitop_externalizing"}), (dlpfc:BrainStructure {id: "dlpfc"})
CREATE (ext)-[:KEY_CIRCUIT]->(dlpfc);

MATCH (ext:HiTOPConstruct {id: "hitop_externalizing"}), (ofc:BrainStructure {id: "ofc"})
CREATE (ext)-[:KEY_CIRCUIT]->(ofc);

// --- RDoC Relationships ---
MATCH (at:RDoCConstruct {id: "rdoc_acute_threat"}), (nv:RDoCDomain {id: "rdoc_negative_valence"})
CREATE (at)-[:BELONGS_TO]->(nv);

MATCH (pt:RDoCConstruct {id: "rdoc_potential_threat"}), (nv:RDoCDomain {id: "rdoc_negative_valence"})
CREATE (pt)-[:BELONGS_TO]->(nv);

MATCH (loss:RDoCConstruct {id: "rdoc_loss"}), (nv:RDoCDomain {id: "rdoc_negative_valence"})
CREATE (loss)-[:BELONGS_TO]->(nv);

MATCH (sp:RDoCConstruct {id: "rdoc_self_perception"}), (soc:RDoCDomain {id: "rdoc_social"})
CREATE (sp)-[:BELONGS_TO]->(soc);

MATCH (aff:RDoCConstruct {id: "rdoc_affiliation"}), (soc:RDoCDomain {id: "rdoc_social"})
CREATE (aff)-[:BELONGS_TO]->(soc);

MATCH (at:RDoCConstruct {id: "rdoc_acute_threat"}), (amyg:BrainStructure {id: "amygdala"})
CREATE (at)-[:PRIMARY_CIRCUIT]->(amyg);

MATCH (at:RDoCConstruct {id: "rdoc_acute_threat"}), (pag:BrainStructure {id: "pag"})
CREATE (at)-[:PRIMARY_CIRCUIT]->(pag);

MATCH (pt:RDoCConstruct {id: "rdoc_potential_threat"}), (bnst:BrainStructure {id: "bnst"})
CREATE (pt)-[:PRIMARY_CIRCUIT]->(bnst);

MATCH (sp:RDoCConstruct {id: "rdoc_self_perception"}), (mpfc:BrainStructure {id: "mpfc"})
CREATE (sp)-[:PRIMARY_CIRCUIT]->(mpfc);

MATCH (sp:RDoCConstruct {id: "rdoc_self_perception"}), (pcc:BrainStructure {id: "pcc"})
CREATE (sp)-[:PRIMARY_CIRCUIT]->(pcc);

MATCH (sp:RDoCConstruct {id: "rdoc_self_perception"}), (ins:BrainStructure {id: "insula"})
CREATE (sp)-[:PRIMARY_CIRCUIT]->(ins);

// RDoC as anchor for therapy concepts
MATCH (sp:RDoCConstruct {id: "rdoc_self_perception"}), (self:TherapyConcept {id: "ifs_self"})
CREATE (sp)-[:NEUROBIOLOGICAL_ANCHOR_FOR]->(self);

MATCH (sp:RDoCConstruct {id: "rdoc_self_perception"}), (wm:TherapyConcept {id: "dbt_wise_mind"})
CREATE (sp)-[:NEUROBIOLOGICAL_ANCHOR_FOR]->(wm);

MATCH (sp:RDoCConstruct {id: "rdoc_self_perception"}), (sac:TherapyConcept {id: "act_self_context"})
CREATE (sp)-[:NEUROBIOLOGICAL_ANCHOR_FOR]->(sac);

// HiTOP-RDoC Cross-references
MATCH (int:HiTOPConstruct {id: "hitop_internalizing"}), (nv:RDoCDomain {id: "rdoc_negative_valence"})
CREATE (int)-[:RDOC_DOMAIN_ASSOCIATION]->(nv);

MATCH (ext:HiTOPConstruct {id: "hitop_externalizing"}), (pv:RDoCDomain {id: "rdoc_positive_valence"})
CREATE (ext)-[:RDOC_DOMAIN_ASSOCIATION]->(pv);

MATCH (td:HiTOPConstruct {id: "hitop_thought_disorder"}), (cog:RDoCDomain {id: "rdoc_cognitive"})
CREATE (td)-[:RDOC_DOMAIN_ASSOCIATION]->(cog);

MATCH (som:HiTOPConstruct {id: "hitop_somatoform"}), (ar:RDoCDomain {id: "rdoc_arousal"})
CREATE (som)-[:RDOC_DOMAIN_ASSOCIATION]->(ar);

// --- Window of Tolerance Relationships ---
MATCH (opt:TherapyConcept {id: "wot_optimal_zone"}), (vv:TherapyConcept {id: "pv_ventral_vagal"})
CREATE (opt)-[:CORRESPONDS_TO]->(vv);

MATCH (hyper:TherapyConcept {id: "wot_hyperarousal"}), (symp:TherapyConcept {id: "pv_sympathetic"})
CREATE (hyper)-[:CORRESPONDS_TO]->(symp);

MATCH (hypo:TherapyConcept {id: "wot_hypoarousal"}), (dv:TherapyConcept {id: "pv_dorsal_vagal"})
CREATE (hypo)-[:CORRESPONDS_TO]->(dv);

MATCH (opt:TherapyConcept {id: "wot_optimal_zone"}), (cen:FunctionalNetwork {id: "cen"})
CREATE (opt)-[:ACTIVATES]->(cen);

MATCH (opt:TherapyConcept {id: "wot_optimal_zone"}), (mpfc:BrainStructure {id: "mpfc"})
CREATE (opt)-[:ENGAGES]->(mpfc);

MATCH (hyper:TherapyConcept {id: "wot_hyperarousal"}), (amyg:BrainStructure {id: "amygdala"})
CREATE (hyper)-[:ACTIVATES]->(amyg);

MATCH (hyper:TherapyConcept {id: "wot_hyperarousal"}), (pfc:BrainStructure {id: "pfc"})
CREATE (hyper)-[:DEACTIVATES]->(pfc);

MATCH (hypo:TherapyConcept {id: "wot_hypoarousal"}), (thal:BrainStructure {id: "thalamus"})
CREATE (hypo)-[:DEACTIVATES]->(thal);

MATCH (opt:TherapyConcept {id: "wot_optimal_zone"}), (cur:Emotion {id: "curiosity"})
CREATE (opt)-[:ENABLES]->(cur);

MATCH (opt:TherapyConcept {id: "wot_optimal_zone"}), (calm:Emotion {id: "calm"})
CREATE (opt)-[:ENABLES]->(calm);

MATCH (hyper:TherapyConcept {id: "wot_hyperarousal"}), (panic:Emotion {id: "panic"})
CREATE (hyper)-[:ASSOCIATED_WITH]->(panic);

MATCH (hyper:TherapyConcept {id: "wot_hyperarousal"}), (anger:Emotion {id: "anger"})
CREATE (hyper)-[:ASSOCIATED_WITH]->(anger);

MATCH (hypo:TherapyConcept {id: "wot_hypoarousal"}), (numb:Emotion {id: "numbness"})
CREATE (hypo)-[:ASSOCIATED_WITH]->(numb);

MATCH (hypo:TherapyConcept {id: "wot_hypoarousal"}), (diss:ClinicalConstruct {id: "dissociation"})
CREATE (hypo)-[:ASSOCIATED_WITH]->(diss);

MATCH (wot:TherapyConcept {id: "window_of_tolerance"}), (opt:TherapyConcept {id: "wot_optimal_zone"})
CREATE (opt)-[:PART_OF]->(wot);

MATCH (wot:TherapyConcept {id: "window_of_tolerance"}), (hyper:TherapyConcept {id: "wot_hyperarousal"})
CREATE (hyper)-[:PART_OF]->(wot);

MATCH (wot:TherapyConcept {id: "window_of_tolerance"}), (hypo:TherapyConcept {id: "wot_hypoarousal"})
CREATE (hypo)-[:PART_OF]->(wot);

MATCH (wot:TherapyConcept {id: "window_of_tolerance"}), (ff:TherapyConcept {id: "wot_frozen_flight"})
CREATE (ff)-[:PART_OF]->(wot);

// --- EMDR Consolidation Relationships ---
MATCH (consol:TherapyConcept {id: "emdr_consolidation"}), (aip:TherapyConcept {id: "emdr_aip"})
CREATE (consol)-[:MECHANISM_OF]->(aip);

MATCH (gamma:TherapyConcept {id: "emdr_gamma"}), (consol:TherapyConcept {id: "emdr_consolidation"})
CREATE (gamma)-[:MEDIATES]->(consol);

MATCH (recon:TherapyConcept {id: "emdr_reconsolidation"}), (consol:TherapyConcept {id: "emdr_consolidation"})
CREATE (recon)-[:ENABLES]->(consol);

MATCH (consol:TherapyConcept {id: "emdr_consolidation"}), (hippo:BrainStructure {id: "hippocampus"})
CREATE (consol)-[:INVOLVES {role: "source"}]->(hippo);

MATCH (consol:TherapyConcept {id: "emdr_consolidation"}), (amyg:BrainStructure {id: "amygdala"})
CREATE (consol)-[:INVOLVES {role: "unbinding_from"}]->(amyg);

MATCH (consol:TherapyConcept {id: "emdr_consolidation"}), (mpfc:BrainStructure {id: "mpfc"})
CREATE (consol)-[:INVOLVES {role: "linking_to"}]->(mpfc);

MATCH (gamma:TherapyConcept {id: "emdr_gamma"}), (mc:Function {id: "memory_consolidation"})
CREATE (gamma)-[:MODULATES]->(mc);

MATCH (consol:TherapyConcept {id: "emdr_consolidation"}), (emdr:TherapyModality {id: "emdr"})
CREATE (consol)-[:BELONGS_TO]->(emdr);

MATCH (gamma:TherapyConcept {id: "emdr_gamma"}), (emdr:TherapyModality {id: "emdr"})
CREATE (gamma)-[:BELONGS_TO]->(emdr);

MATCH (recon:TherapyConcept {id: "emdr_reconsolidation"}), (emdr:TherapyModality {id: "emdr"})
CREATE (recon)-[:BELONGS_TO]->(emdr);

// --- SE Neural Mappings ---
MATCH (tit:TherapyConcept {id: "se_titration"}), (mpfc:BrainStructure {id: "mpfc"})
CREATE (tit)-[:ENGAGES {mechanism: "maintains mPFC online during trauma processing"}]->(mpfc);

MATCH (tit:TherapyConcept {id: "se_titration"}), (amyg:BrainStructure {id: "amygdala"})
CREATE (tit)-[:MODULATES {direction: "prevents_overwhelm"}]->(amyg);

MATCH (tit:TherapyConcept {id: "se_titration"}), (opt:TherapyConcept {id: "wot_optimal_zone"})
CREATE (tit)-[:MAINTAINS]->(opt);

MATCH (pend:TherapyConcept {id: "se_pendulation"}), (ins:BrainStructure {id: "insula"})
CREATE (pend)-[:MEDIATED_BY {mechanism: "insular interoceptive awareness"}]->(ins);

MATCH (pend:TherapyConcept {id: "se_pendulation"}), (vb:TherapyConcept {id: "pv_vagal_brake"})
CREATE (pend)-[:UTILIZES]->(vb);

MATCH (pend:TherapyConcept {id: "se_pendulation"}), (sn:FunctionalNetwork {id: "salience_network"})
CREATE (pend)-[:REWIRES]->(sn);

MATCH (res:TherapyConcept {id: "se_resourcing"}), (nacc:BrainStructure {id: "nucleus_accumbens"})
CREATE (res)-[:ACTIVATES]->(nacc);

MATCH (res:TherapyConcept {id: "se_resourcing"}), (oxy:NeurochemicalSystem {id: "oxytocin"})
CREATE (res)-[:PROMOTES]->(oxy);

MATCH (disch:TherapyConcept {id: "se_discharge"}), (mc:BrainStructure {id: "motor_cortex"})
CREATE (disch)-[:INVOLVES {mechanism: "motor system completion"}]->(mc);

MATCH (fs:TherapyConcept {id: "se_felt_sense"}), (int:Function {id: "interoception"})
CREATE (fs)-[:ENGAGES]->(int);

MATCH (fs:TherapyConcept {id: "se_felt_sense"}), (ai:BrainStructure {id: "anterior_insula"})
CREATE (fs)-[:PRIMARY_CIRCUIT]->(ai);

// --- Shame/Guilt Neural Signature Relationships ---
MATCH (sns:NeuralSignature {id: "shame_neural"}), (dlpfc:BrainStructure {id: "dlpfc"})
CREATE (sns)-[:PRIMARY_HUB]->(dlpfc);

MATCH (sns:NeuralSignature {id: "shame_neural"}), (pcc:BrainStructure {id: "pcc"})
CREATE (sns)-[:PRIMARY_HUB]->(pcc);

MATCH (sns:NeuralSignature {id: "shame_neural"}), (dacc:BrainStructure {id: "dacc"})
CREATE (sns)-[:PRIMARY_HUB]->(dacc);

MATCH (sns:NeuralSignature {id: "shame_neural"}), (sc:BrainStructure {id: "somatosensory_cortex"})
CREATE (sns)-[:PRIMARY_HUB]->(sc);

MATCH (sns:NeuralSignature {id: "shame_neural"}), (amyg:BrainStructure {id: "amygdala"})
CREATE (sns)-[:SUBCORTICAL_ACTIVATION {finding: "hypersensitivity in MDD"}]->(amyg);

MATCH (sns:NeuralSignature {id: "shame_neural"}), (pi:BrainStructure {id: "posterior_insula"})
CREATE (sns)-[:SUBCORTICAL_ACTIVATION]->(pi);

MATCH (sns:NeuralSignature {id: "shame_neural"}), (hs:Emotion {id: "hot_shame"})
CREATE (sns)-[:SIGNATURE_OF]->(hs);

MATCH (sns:NeuralSignature {id: "shame_neural"}), (cs:Emotion {id: "cold_shame"})
CREATE (sns)-[:SIGNATURE_OF]->(cs);

MATCH (gns:NeuralSignature {id: "guilt_neural"}), (tpj:BrainStructure {id: "tpj"})
CREATE (gns)-[:PRIMARY_HUB {function: "theory of mind, other perspective"}]->(tpj);

MATCH (gns:NeuralSignature {id: "guilt_neural"}), (atl:BrainStructure {id: "atl"})
CREATE (gns)-[:PRIMARY_HUB {function: "social semantic knowledge"}]->(atl);

MATCH (gns:NeuralSignature {id: "guilt_neural"}), (mpfc:BrainStructure {id: "mpfc"})
CREATE (gns)-[:PRIMARY_HUB]->(mpfc);

MATCH (gns:NeuralSignature {id: "guilt_neural"}), (ai:BrainStructure {id: "anterior_insula"})
CREATE (gns)-[:SHARED_CORE {notes: "emotional awareness"}]->(ai);

MATCH (gns:NeuralSignature {id: "guilt_neural"}), (dacc:BrainStructure {id: "dacc"})
CREATE (gns)-[:SHARED_CORE {notes: "negative affect/conflict"}]->(dacc);

MATCH (gns:NeuralSignature {id: "guilt_neural"}), (guilt:Emotion {id: "guilt"})
CREATE (gns)-[:SIGNATURE_OF]->(guilt);

MATCH (sp:NeuralSignature {id: "social_pain_neural"}), (dacc:BrainStructure {id: "dacc"})
CREATE (sp)-[:PRIMARY_HUB]->(dacc);

MATCH (sp:NeuralSignature {id: "social_pain_neural"}), (ai:BrainStructure {id: "anterior_insula"})
CREATE (sp)-[:PRIMARY_HUB]->(ai);

MATCH (sp:NeuralSignature {id: "social_pain_neural"}), (thal:BrainStructure {id: "thalamus"})
CREATE (sp)-[:PRIMARY_HUB]->(thal);

MATCH (sp:NeuralSignature {id: "social_pain_neural"}), (rej:Emotion {id: "rejection"})
CREATE (sp)-[:SIGNATURE_OF]->(rej);

// --- CPT Neural Dissociation ---
MATCH (ret:TherapyConcept {id: "cpt_retrieval"}), (dlpfc:BrainStructure {id: "dlpfc"})
CREATE (ret)-[:NEURAL_HUB {side: "left", brodmann_area: "9/46"}]->(dlpfc);

MATCH (ctrl:TherapyConcept {id: "cpt_control"}), (acc:BrainStructure {id: "acc"})
CREATE (ctrl)-[:NEURAL_HUB {side: "left", brodmann_area: "24/32"}]->(acc);

MATCH (ret:TherapyConcept {id: "cpt_retrieval"}), (cpt:TherapyModality {id: "cpt"})
CREATE (ret)-[:BELONGS_TO]->(cpt);

MATCH (ctrl:TherapyConcept {id: "cpt_control"}), (cpt:TherapyModality {id: "cpt"})
CREATE (ctrl)-[:BELONGS_TO]->(cpt);

MATCH (ret:TherapyConcept {id: "cpt_retrieval"}), (sp:TherapyConcept {id: "cpt_stuck_point"})
CREATE (ret)-[:ADDRESSES]->(sp);

MATCH (ctrl:TherapyConcept {id: "cpt_control"}), (sp:TherapyConcept {id: "cpt_stuck_point"})
CREATE (ctrl)-[:ADDRESSES]->(sp);

// --- IFS Self Enhanced Mappings ---
MATCH (self:TherapyConcept {id: "ifs_self"}), (mpfc:BrainStructure {id: "mpfc"})
CREATE (self)-[:NEURAL_HUB {mechanism: "metacognitive magic, balances neurochemicals"}]->(mpfc);

MATCH (self:TherapyConcept {id: "ifs_self"}), (ser:NeurochemicalSystem {id: "serotonin"})
CREATE (self)-[:ASSOCIATED_WITH {role: "calm stabilizer"}]->(ser);

MATCH (self:TherapyConcept {id: "ifs_self"}), (oxy:NeurochemicalSystem {id: "oxytocin"})
CREATE (self)-[:ASSOCIATED_WITH {role: "trust between Self and parts"}]->(oxy);

MATCH (self:TherapyConcept {id: "ifs_self"}), (amyg:BrainStructure {id: "amygdala"})
CREATE (self)-[:INHIBITS {mechanism: "inhibitory signals quiet alarm system"}]->(amyg);

MATCH (unb:TherapyConcept {id: "ifs_unblending"}), (mpfc:BrainStructure {id: "mpfc"})
CREATE (unb)-[:ACTIVATES]->(mpfc);

MATCH (unb:TherapyConcept {id: "ifs_unblending"}), (acc:BrainStructure {id: "acc"})
CREATE (unb)-[:ACTIVATES {role: "conflict manager, releases serotonin"}]->(acc);

// --- ATL Relationships ---
MATCH (atl:BrainStructure {id: "atl"}), (sc:Function {id: "social_cognition"})
CREATE (atl)-[:IMPLICATED_IN {role: "social semantic knowledge"}]->(sc);

MATCH (atl:BrainStructure {id: "atl"}), (tc:BrainStructure {id: "temporal_cortex"})
CREATE (atl)-[:PART_OF]->(tc);

// --- Fear Extinction Enhanced ---
MATCH (vmpfc:BrainStructure {id: "vmpfc"}), (fe:Function {id: "fear_extinction"})
CREATE (vmpfc)-[:HOMOLOGUE_OF {rodent_structure: "infralimbic cortex", evidence: "translational research"}]->(fe);

MATCH (fe:Function {id: "fear_extinction"}), (da:NeurochemicalSystem {id: "dopamine"})
CREATE (fe)-[:MEDIATED_BY {role: "reward learning"}]->(da);

MATCH (fe:Function {id: "fear_extinction"}), (hippo:BrainStructure {id: "hippocampus"})
CREATE (fe)-[:CONTEXT_DEPENDENT_ON]->(hippo);

MATCH (fe:Function {id: "fear_extinction"}), (cereb:BrainStructure {id: "cerebellum"})
CREATE (fe)-[:INVOLVES]->(cereb);
