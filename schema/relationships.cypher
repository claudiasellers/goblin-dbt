// ============================================================
// RELATIONSHIPS FILE
// Run AFTER all nodes have been created
// Uses MATCH to find existing nodes by their id property
// MERGE on (start, TYPE, end), FELT_AS also on region; other properties via SET r += {…} (A1-4)
// ============================================================


// ============================================================
// BRAIN STRUCTURE HIERARCHY
// ============================================================

MATCH (dlpfc:BrainStructure {id: "dlpfc"}), (pfc:BrainStructure {id: "pfc"})
MERGE (dlpfc)-[:PART_OF]->(pfc);

MATCH (vmpfc:BrainStructure {id: "vmpfc"}), (pfc:BrainStructure {id: "pfc"})
MERGE (vmpfc)-[:PART_OF]->(pfc);

MATCH (ofc:BrainStructure {id: "ofc"}), (pfc:BrainStructure {id: "pfc"})
MERGE (ofc)-[:PART_OF]->(pfc);

MATCH (mpfc:BrainStructure {id: "mpfc"}), (pfc:BrainStructure {id: "pfc"})
MERGE (mpfc)-[:PART_OF]->(pfc);

MATCH (dacc:BrainStructure {id: "dacc"}), (acc:BrainStructure {id: "acc"})
MERGE (dacc)-[:PART_OF]->(acc);

MATCH (vacc:BrainStructure {id: "vacc"}), (acc:BrainStructure {id: "acc"})
MERGE (vacc)-[:PART_OF]->(acc);

MATCH (anterior_insula:BrainStructure {id: "anterior_insula"}), (insula:BrainStructure {id: "insula"})
MERGE (anterior_insula)-[:PART_OF]->(insula);

MATCH (posterior_insula:BrainStructure {id: "posterior_insula"}), (insula:BrainStructure {id: "insula"})
MERGE (posterior_insula)-[:PART_OF]->(insula);

MATCH (bla:BrainStructure {id: "bla"}), (amygdala:BrainStructure {id: "amygdala"})
MERGE (bla)-[:PART_OF]->(amygdala);

MATCH (cea:BrainStructure {id: "cea"}), (amygdala:BrainStructure {id: "amygdala"})
MERGE (cea)-[:PART_OF]->(amygdala);

MATCH (nacc:BrainStructure {id: "nucleus_accumbens"}), (bg:BrainStructure {id: "basal_ganglia"})
MERGE (nacc)-[:PART_OF]->(bg);


// ============================================================
// NETWORK MEMBERSHIP
// ============================================================

// Default Mode Network
MATCH (mpfc:BrainStructure {id: "mpfc"}), (dmn:FunctionalNetwork {id: "dmn"})
MERGE (mpfc)-[:PARTICIPATES_IN]->(dmn);

MATCH (pcc:BrainStructure {id: "pcc"}), (dmn:FunctionalNetwork {id: "dmn"})
MERGE (pcc)-[:PARTICIPATES_IN]->(dmn);

MATCH (hippo:BrainStructure {id: "hippocampus"}), (dmn:FunctionalNetwork {id: "dmn"})
MERGE (hippo)-[:PARTICIPATES_IN]->(dmn);

MATCH (ag:BrainStructure {id: "angular_gyrus"}), (dmn:FunctionalNetwork {id: "dmn"})
MERGE (ag)-[:PARTICIPATES_IN]->(dmn);

// Salience Network
MATCH (ai:BrainStructure {id: "anterior_insula"}), (sn:FunctionalNetwork {id: "salience_network"})
MERGE (ai)-[:PARTICIPATES_IN]->(sn);

MATCH (dacc:BrainStructure {id: "dacc"}), (sn:FunctionalNetwork {id: "salience_network"})
MERGE (dacc)-[:PARTICIPATES_IN]->(sn);

MATCH (amyg:BrainStructure {id: "amygdala"}), (sn:FunctionalNetwork {id: "salience_network"})
MERGE (amyg)-[:PARTICIPATES_IN]->(sn);

// Central Executive Network
MATCH (dlpfc:BrainStructure {id: "dlpfc"}), (cen:FunctionalNetwork {id: "cen"})
MERGE (dlpfc)-[:PARTICIPATES_IN]->(cen);

MATCH (pc:BrainStructure {id: "parietal_cortex"}), (cen:FunctionalNetwork {id: "cen"})
MERGE (pc)-[:PARTICIPATES_IN]->(cen);

// Limbic Network
MATCH (amyg:BrainStructure {id: "amygdala"}), (ln:FunctionalNetwork {id: "limbic_network"})
MERGE (amyg)-[:PARTICIPATES_IN]->(ln);

MATCH (hippo:BrainStructure {id: "hippocampus"}), (ln:FunctionalNetwork {id: "limbic_network"})
MERGE (hippo)-[:PARTICIPATES_IN]->(ln);

MATCH (hypo:BrainStructure {id: "hypothalamus"}), (ln:FunctionalNetwork {id: "limbic_network"})
MERGE (hypo)-[:PARTICIPATES_IN]->(ln);

MATCH (ofc:BrainStructure {id: "ofc"}), (ln:FunctionalNetwork {id: "limbic_network"})
MERGE (ofc)-[:PARTICIPATES_IN]->(ln);

// Sensorimotor Network
MATCH (mc:BrainStructure {id: "motor_cortex"}), (smn:FunctionalNetwork {id: "sensorimotor_network"})
MERGE (mc)-[:PARTICIPATES_IN]->(smn);

MATCH (sc:BrainStructure {id: "somatosensory_cortex"}), (smn:FunctionalNetwork {id: "sensorimotor_network"})
MERGE (sc)-[:PARTICIPATES_IN]->(smn);

MATCH (bg:BrainStructure {id: "basal_ganglia"}), (smn:FunctionalNetwork {id: "sensorimotor_network"})
MERGE (bg)-[:PARTICIPATES_IN]->(smn);

// Dorsal Attention Network
MATCH (fef:BrainStructure {id: "fef"}), (dan:FunctionalNetwork {id: "dan"})
MERGE (fef)-[:PARTICIPATES_IN]->(dan);

MATCH (ips:BrainStructure {id: "ips"}), (dan:FunctionalNetwork {id: "dan"})
MERGE (ips)-[:PARTICIPATES_IN]->(dan);

// Ventral Attention Network
MATCH (tpj:BrainStructure {id: "tpj"}), (van:FunctionalNetwork {id: "van"})
MERGE (tpj)-[:PARTICIPATES_IN]->(van);

MATCH (ai:BrainStructure {id: "anterior_insula"}), (van:FunctionalNetwork {id: "van"})
MERGE (ai)-[:PARTICIPATES_IN]->(van);


// ============================================================
// BRAIN-FUNCTION LINKS
// ============================================================

// Amygdala
MATCH (amyg:BrainStructure {id: "amygdala"}), (fc:Function {id: "fear_conditioning"})
MERGE (amyg)-[r:IMPLICATED_IN]->(fc)
SET r += {role: "primary", evidence: "strong"};

MATCH (amyg:BrainStructure {id: "amygdala"}), (td:Function {id: "threat_detection"})
MERGE (amyg)-[r:IMPLICATED_IN]->(td)
SET r += {role: "primary", evidence: "strong"};

MATCH (amyg:BrainStructure {id: "amygdala"}), (mc:Function {id: "memory_consolidation"})
MERGE (amyg)-[r:IMPLICATED_IN]->(mc)
SET r += {role: "primary"};

// PFC
MATCH (pfc:BrainStructure {id: "pfc"}), (er:Function {id: "emotion_regulation"})
MERGE (pfc)-[r:IMPLICATED_IN]->(er)
SET r += {role: "regulatory", evidence: "strong"};

MATCH (vmpfc:BrainStructure {id: "vmpfc"}), (fe:Function {id: "fear_extinction"})
MERGE (vmpfc)-[r:IMPLICATED_IN]->(fe)
SET r += {role: "regulatory", evidence: "strong"};

MATCH (dlpfc:BrainStructure {id: "dlpfc"}), (wm:Function {id: "working_memory"})
MERGE (dlpfc)-[r:IMPLICATED_IN]->(wm)
SET r += {role: "primary", evidence: "strong"};

MATCH (dlpfc:BrainStructure {id: "dlpfc"}), (cc:Function {id: "cognitive_control"})
MERGE (dlpfc)-[r:IMPLICATED_IN]->(cc)
SET r += {role: "primary", evidence: "strong"};

MATCH (dlpfc:BrainStructure {id: "dlpfc"}), (ef:Function {id: "executive_function"})
MERGE (dlpfc)-[r:IMPLICATED_IN]->(ef)
SET r += {role: "primary"};

// ACC
MATCH (acc:BrainStructure {id: "acc"}), (cc:Function {id: "cognitive_control"})
MERGE (acc)-[r:IMPLICATED_IN]->(cc)
SET r += {role: "monitoring"};

MATCH (dacc:BrainStructure {id: "dacc"}), (er:Function {id: "emotion_regulation"})
MERGE (dacc)-[r:IMPLICATED_IN]->(er)
SET r += {role: "primary"};

// Insula
MATCH (ins:BrainStructure {id: "insula"}), (int:Function {id: "interoception"})
MERGE (ins)-[r:IMPLICATED_IN]->(int)
SET r += {role: "primary", evidence: "strong"};

MATCH (ai:BrainStructure {id: "anterior_insula"}), (er:Function {id: "emotion_regulation"})
MERGE (ai)-[r:IMPLICATED_IN]->(er)
SET r += {role: "primary"};

MATCH (ai:BrainStructure {id: "anterior_insula"}), (sc:Function {id: "social_cognition"})
MERGE (ai)-[r:IMPLICATED_IN]->(sc)
SET r += {role: "primary"};

MATCH (pi:BrainStructure {id: "posterior_insula"}), (ba:Function {id: "body_awareness"})
MERGE (pi)-[r:IMPLICATED_IN]->(ba)
SET r += {role: "primary"};

MATCH (ss:BrainStructure {id: "somatosensory_cortex"}), (ba:Function {id: "body_awareness"})
MERGE (ss)-[r:IMPLICATED_IN]->(ba)
SET r += {role: "primary"};

// Hippocampus
MATCH (hippo:BrainStructure {id: "hippocampus"}), (mc:Function {id: "memory_consolidation"})
MERGE (hippo)-[r:IMPLICATED_IN]->(mc)
SET r += {role: "primary", evidence: "strong"};

MATCH (hippo:BrainStructure {id: "hippocampus"}), (fc:Function {id: "fear_conditioning"})
MERGE (hippo)-[r:IMPLICATED_IN]->(fc)
SET r += {role: "contextual", evidence: "strong"};

MATCH (hippo:BrainStructure {id: "hippocampus"}), (fe:Function {id: "fear_extinction"})
MERGE (hippo)-[r:IMPLICATED_IN]->(fe)
SET r += {role: "contextual", evidence: "strong"};

// OFC
MATCH (ofc:BrainStructure {id: "ofc"}), (ic:Function {id: "impulse_control"})
MERGE (ofc)-[r:IMPLICATED_IN]->(ic)
SET r += {role: "primary"};

MATCH (ofc:BrainStructure {id: "ofc"}), (rp:Function {id: "reward_processing"})
MERGE (ofc)-[r:IMPLICATED_IN]->(rp)
SET r += {role: "primary"};

// Reward system
MATCH (nacc:BrainStructure {id: "nucleus_accumbens"}), (rp:Function {id: "reward_processing"})
MERGE (nacc)-[r:IMPLICATED_IN]->(rp)
SET r += {role: "primary"};

MATCH (nacc:BrainStructure {id: "nucleus_accumbens"}), (m:Function {id: "motivation"})
MERGE (nacc)-[r:IMPLICATED_IN]->(m)
SET r += {role: "primary"};

MATCH (vta:BrainStructure {id: "vta"}), (rp:Function {id: "reward_processing"})
MERGE (vta)-[r:IMPLICATED_IN]->(rp)
SET r += {role: "primary"};

MATCH (vta:BrainStructure {id: "vta"}), (m:Function {id: "motivation"})
MERGE (vta)-[r:IMPLICATED_IN]->(m)
SET r += {role: "primary"};

// Self-referential
MATCH (mpfc:BrainStructure {id: "mpfc"}), (sr:Function {id: "self_referential"})
MERGE (mpfc)-[r:IMPLICATED_IN]->(sr)
SET r += {role: "primary"};

MATCH (mpfc:BrainStructure {id: "mpfc"}), (sc:Function {id: "social_cognition"})
MERGE (mpfc)-[r:IMPLICATED_IN]->(sc)
SET r += {role: "primary"};

// Stress
MATCH (hypo:BrainStructure {id: "hypothalamus"}), (stress:Function {id: "stress_response"})
MERGE (hypo)-[r:IMPLICATED_IN]->(stress)
SET r += {role: "primary"};

MATCH (lc:BrainStructure {id: "locus_coeruleus"}), (stress:Function {id: "stress_response"})
MERGE (lc)-[r:IMPLICATED_IN]->(stress)
SET r += {role: "modulatory"};

// Thalamus
MATCH (thal:BrainStructure {id: "thalamus"}), (att:Function {id: "attention"})
MERGE (thal)-[r:IMPLICATED_IN]->(att)
SET r += {role: "gating"};

// Basal ganglia
MATCH (bg:BrainStructure {id: "basal_ganglia"}), (hf:Function {id: "habit_formation"})
MERGE (bg)-[r:IMPLICATED_IN]->(hf)
SET r += {role: "primary"};

// Temporal cortex
MATCH (tc:BrainStructure {id: "temporal_cortex"}), (lp:Function {id: "language_processing"})
MERGE (tc)-[r:IMPLICATED_IN]->(lp)
SET r += {role: "primary"};


// ============================================================
// BRAIN-EMOTION LINKS
// ============================================================

MATCH (amyg:BrainStructure {id: "amygdala"}), (fear:Emotion {id: "fear"})
MERGE (amyg)-[r:ACTIVATES_DURING]->(fear)
SET r += {direction: "increases", evidence: "strong"};

MATCH (amyg:BrainStructure {id: "amygdala"}), (anger:Emotion {id: "anger"})
MERGE (amyg)-[r:ACTIVATES_DURING]->(anger)
SET r += {direction: "increases"};

MATCH (amyg:BrainStructure {id: "amygdala"}), (anx:Emotion {id: "anxiety"})
MERGE (amyg)-[r:ACTIVATES_DURING]->(anx)
SET r += {direction: "increases"};

MATCH (amyg:BrainStructure {id: "amygdala"}), (hs:Emotion {id: "hot_shame"})
MERGE (amyg)-[r:ACTIVATES_DURING]->(hs)
SET r += {direction: "increases"};

MATCH (bnst:BrainStructure {id: "bnst"}), (anx:Emotion {id: "anxiety"})
MERGE (bnst)-[r:ACTIVATES_DURING]->(anx)
SET r += {direction: "increases", notes: "sustained/anticipatory anxiety"};

MATCH (ai:BrainStructure {id: "anterior_insula"}), (disg:Emotion {id: "disgust"})
MERGE (ai)-[r:ACTIVATES_DURING]->(disg)
SET r += {direction: "increases"};

MATCH (ai:BrainStructure {id: "anterior_insula"}), (anx:Emotion {id: "anxiety"})
MERGE (ai)-[r:ACTIVATES_DURING]->(anx)
SET r += {direction: "increases"};

MATCH (ai:BrainStructure {id: "anterior_insula"}), (comp:Emotion {id: "compassion"})
MERGE (ai)-[r:ACTIVATES_DURING]->(comp)
SET r += {direction: "increases"};

MATCH (mpfc:BrainStructure {id: "mpfc"}), (hs:Emotion {id: "hot_shame"})
MERGE (mpfc)-[r:ACTIVATES_DURING]->(hs)
SET r += {direction: "increases"};

MATCH (mpfc:BrainStructure {id: "mpfc"}), (cs:Emotion {id: "cold_shame"})
MERGE (mpfc)-[r:ACTIVATES_DURING]->(cs)
SET r += {direction: "increases"};

MATCH (mpfc:BrainStructure {id: "mpfc"}), (guilt:Emotion {id: "guilt"})
MERGE (mpfc)-[r:ACTIVATES_DURING]->(guilt)
SET r += {direction: "increases"};

MATCH (vacc:BrainStructure {id: "vacc"}), (sad:Emotion {id: "sadness"})
MERGE (vacc)-[r:ACTIVATES_DURING]->(sad)
SET r += {direction: "increases"};

MATCH (nacc:BrainStructure {id: "nucleus_accumbens"}), (joy:Emotion {id: "joy"})
MERGE (nacc)-[r:ACTIVATES_DURING]->(joy)
SET r += {direction: "increases"};

MATCH (nacc:BrainStructure {id: "nucleus_accumbens"}), (exc:Emotion {id: "excitement"})
MERGE (nacc)-[r:ACTIVATES_DURING]->(exc)
SET r += {direction: "increases"};

MATCH (pag:BrainStructure {id: "pag"}), (panic:Emotion {id: "panic"})
MERGE (pag)-[r:ACTIVATES_DURING]->(panic)
SET r += {direction: "increases"};


// ============================================================
// NEUROCHEMICAL PRODUCTION
// ============================================================

MATCH (vta:BrainStructure {id: "vta"}), (da:NeurochemicalSystem {id: "dopamine"})
MERGE (vta)-[:PRODUCES]->(da);

MATCH (raphe:BrainStructure {id: "raphe_nuclei"}), (ser:NeurochemicalSystem {id: "serotonin"})
MERGE (raphe)-[:PRODUCES]->(ser);

MATCH (lc:BrainStructure {id: "locus_coeruleus"}), (ne:NeurochemicalSystem {id: "norepinephrine"})
MERGE (lc)-[:PRODUCES]->(ne);

MATCH (hypo:BrainStructure {id: "hypothalamus"}), (cort:NeurochemicalSystem {id: "cortisol"})
MERGE (hypo)-[:PRODUCES]->(cort);

MATCH (hypo:BrainStructure {id: "hypothalamus"}), (oxy:NeurochemicalSystem {id: "oxytocin"})
MERGE (hypo)-[:PRODUCES]->(oxy);


// ============================================================
// NEUROCHEMICAL MODULATION
// ============================================================

MATCH (da:NeurochemicalSystem {id: "dopamine"}), (rp:Function {id: "reward_processing"})
MERGE (da)-[:MODULATES]->(rp);

MATCH (da:NeurochemicalSystem {id: "dopamine"}), (m:Function {id: "motivation"})
MERGE (da)-[:MODULATES]->(m);

MATCH (ser:NeurochemicalSystem {id: "serotonin"}), (er:Function {id: "emotion_regulation"})
MERGE (ser)-[:MODULATES]->(er);

MATCH (ser:NeurochemicalSystem {id: "serotonin"}), (anx:Emotion {id: "anxiety"})
MERGE (ser)-[r:MODULATES]->(anx)
SET r += {direction: "reduces"};

MATCH (ne:NeurochemicalSystem {id: "norepinephrine"}), (att:Function {id: "attention"})
MERGE (ne)-[:MODULATES]->(att);

MATCH (ne:NeurochemicalSystem {id: "norepinephrine"}), (stress:Function {id: "stress_response"})
MERGE (ne)-[:MODULATES]->(stress);

MATCH (gaba:NeurochemicalSystem {id: "gaba"}), (anx:Emotion {id: "anxiety"})
MERGE (gaba)-[r:MODULATES]->(anx)
SET r += {direction: "inhibits"};

MATCH (gaba:NeurochemicalSystem {id: "gaba"}), (amyg:BrainStructure {id: "amygdala"})
MERGE (gaba)-[r:MODULATES]->(amyg)
SET r += {direction: "inhibits"};

MATCH (glu:NeurochemicalSystem {id: "glutamate"}), (mc:Function {id: "memory_consolidation"})
MERGE (glu)-[:MODULATES]->(mc);

MATCH (glu:NeurochemicalSystem {id: "glutamate"}), (fc:Function {id: "fear_conditioning"})
MERGE (glu)-[:MODULATES]->(fc);

MATCH (ach:NeurochemicalSystem {id: "acetylcholine"}), (att:Function {id: "attention"})
MERGE (ach)-[:MODULATES]->(att);

MATCH (ach:NeurochemicalSystem {id: "acetylcholine"}), (mc:Function {id: "memory_consolidation"})
MERGE (ach)-[:MODULATES]->(mc);

MATCH (endo:NeurochemicalSystem {id: "endorphin"}), (stress:Function {id: "stress_response"})
MERGE (endo)-[r:MODULATES]->(stress)
SET r += {direction: "reduces"};

MATCH (endo:NeurochemicalSystem {id: "endorphin"}), (rp:Function {id: "reward_processing"})
MERGE (endo)-[:MODULATES]->(rp);

MATCH (cort:NeurochemicalSystem {id: "cortisol"}), (stress:Function {id: "stress_response"})
MERGE (cort)-[:MODULATES]->(stress);

MATCH (cort:NeurochemicalSystem {id: "cortisol"}), (mc:Function {id: "memory_consolidation"})
MERGE (cort)-[:MODULATES]->(mc);

MATCH (oxy:NeurochemicalSystem {id: "oxytocin"}), (trust:Emotion {id: "trust"})
MERGE (oxy)-[:MODULATES]->(trust);

MATCH (oxy:NeurochemicalSystem {id: "oxytocin"}), (sc:Function {id: "social_cognition"})
MERGE (oxy)-[:MODULATES]->(sc);


// ============================================================
// THERAPY MODALITY HIERARCHY
// ============================================================

// IFS
MATCH (c:TherapyConcept {id: "ifs_exile"}), (m:TherapyModality {id: "ifs"})
MERGE (c)-[:BELONGS_TO]->(m);

MATCH (c:TherapyConcept {id: "ifs_firefighter"}), (m:TherapyModality {id: "ifs"})
MERGE (c)-[:BELONGS_TO]->(m);

MATCH (c:TherapyConcept {id: "ifs_manager"}), (m:TherapyModality {id: "ifs"})
MERGE (c)-[:BELONGS_TO]->(m);

MATCH (c:TherapyConcept {id: "ifs_self"}), (m:TherapyModality {id: "ifs"})
MERGE (c)-[:BELONGS_TO]->(m);

MATCH (c:TherapyConcept {id: "ifs_protector"}), (m:TherapyModality {id: "ifs"})
MERGE (c)-[:BELONGS_TO]->(m);

MATCH (c:TherapyConcept {id: "ifs_unburdening"}), (m:TherapyModality {id: "ifs"})
MERGE (c)-[:BELONGS_TO]->(m);

MATCH (c:TherapyConcept {id: "ifs_blending"}), (m:TherapyModality {id: "ifs"})
MERGE (c)-[:BELONGS_TO]->(m);

MATCH (c:TherapyConcept {id: "ifs_unblending"}), (m:TherapyModality {id: "ifs"})
MERGE (c)-[:BELONGS_TO]->(m);

MATCH (c:TherapyConcept {id: "ifs_trailhead"}), (m:TherapyModality {id: "ifs"})
MERGE (c)-[:BELONGS_TO]->(m);

// IFS part hierarchy
MATCH (ff:TherapyConcept {id: "ifs_firefighter"}), (p:TherapyConcept {id: "ifs_protector"})
MERGE (ff)-[:TYPE_OF]->(p);

MATCH (mgr:TherapyConcept {id: "ifs_manager"}), (p:TherapyConcept {id: "ifs_protector"})
MERGE (mgr)-[:TYPE_OF]->(p);

// DBT Modules -> DBT
MATCH (c:TherapyConcept {id: "dbt_mindfulness_module"}), (m:TherapyModality {id: "dbt"})
MERGE (c)-[:BELONGS_TO]->(m);

MATCH (c:TherapyConcept {id: "dbt_distress_tolerance"}), (m:TherapyModality {id: "dbt"})
MERGE (c)-[:BELONGS_TO]->(m);

MATCH (c:TherapyConcept {id: "dbt_emotion_regulation_module"}), (m:TherapyModality {id: "dbt"})
MERGE (c)-[:BELONGS_TO]->(m);

MATCH (c:TherapyConcept {id: "dbt_interpersonal_effectiveness"}), (m:TherapyModality {id: "dbt"})
MERGE (c)-[:BELONGS_TO]->(m);

// DBT Mindfulness Skills -> Module
MATCH (c:TherapyConcept {id: "dbt_wise_mind"}), (mod:TherapyConcept {id: "dbt_mindfulness_module"})
MERGE (c)-[:PART_OF]->(mod);

MATCH (c:TherapyConcept {id: "dbt_emotional_mind"}), (mod:TherapyConcept {id: "dbt_mindfulness_module"})
MERGE (c)-[:PART_OF]->(mod);

MATCH (c:TherapyConcept {id: "dbt_reasonable_mind"}), (mod:TherapyConcept {id: "dbt_mindfulness_module"})
MERGE (c)-[:PART_OF]->(mod);

MATCH (c:TherapyConcept {id: "dbt_observe"}), (mod:TherapyConcept {id: "dbt_mindfulness_module"})
MERGE (c)-[:PART_OF]->(mod);

MATCH (c:TherapyConcept {id: "dbt_describe"}), (mod:TherapyConcept {id: "dbt_mindfulness_module"})
MERGE (c)-[:PART_OF]->(mod);

MATCH (c:TherapyConcept {id: "dbt_participate"}), (mod:TherapyConcept {id: "dbt_mindfulness_module"})
MERGE (c)-[:PART_OF]->(mod);

MATCH (c:TherapyConcept {id: "dbt_nonjudgmental"}), (mod:TherapyConcept {id: "dbt_mindfulness_module"})
MERGE (c)-[:PART_OF]->(mod);

MATCH (c:TherapyConcept {id: "dbt_one_mindfully"}), (mod:TherapyConcept {id: "dbt_mindfulness_module"})
MERGE (c)-[:PART_OF]->(mod);

MATCH (c:TherapyConcept {id: "dbt_effectively"}), (mod:TherapyConcept {id: "dbt_mindfulness_module"})
MERGE (c)-[:PART_OF]->(mod);

// DBT Distress Tolerance Skills -> Module
MATCH (c:TherapyConcept {id: "dbt_tipp"}), (mod:TherapyConcept {id: "dbt_distress_tolerance"})
MERGE (c)-[:PART_OF]->(mod);

MATCH (c:TherapyConcept {id: "dbt_stop"}), (mod:TherapyConcept {id: "dbt_distress_tolerance"})
MERGE (c)-[:PART_OF]->(mod);

MATCH (c:TherapyConcept {id: "dbt_accepts"}), (mod:TherapyConcept {id: "dbt_distress_tolerance"})
MERGE (c)-[:PART_OF]->(mod);

MATCH (c:TherapyConcept {id: "dbt_improve"}), (mod:TherapyConcept {id: "dbt_distress_tolerance"})
MERGE (c)-[:PART_OF]->(mod);

MATCH (c:TherapyConcept {id: "dbt_pros_cons"}), (mod:TherapyConcept {id: "dbt_distress_tolerance"})
MERGE (c)-[:PART_OF]->(mod);

MATCH (c:TherapyConcept {id: "dbt_radical_acceptance"}), (mod:TherapyConcept {id: "dbt_distress_tolerance"})
MERGE (c)-[:PART_OF]->(mod);

MATCH (c:TherapyConcept {id: "dbt_self_soothe"}), (mod:TherapyConcept {id: "dbt_distress_tolerance"})
MERGE (c)-[:PART_OF]->(mod);

MATCH (c:TherapyConcept {id: "dbt_values_priorities"}), (mod:TherapyConcept {id: "dbt_emotion_regulation_module"})
MERGE (c)-[:PART_OF]->(mod);

MATCH (c:TherapyConcept {id: "dbt_mindfulness_current_thoughts"}), (mod:TherapyConcept {id: "dbt_distress_tolerance"})
MERGE (c)-[:PART_OF]->(mod);

MATCH (c:TherapyConcept {id: "dbt_dialectical_abstinence"}), (mod:TherapyConcept {id: "dbt_distress_tolerance"})
MERGE (c)-[:PART_OF]->(mod);

MATCH (c:TherapyConcept {id: "dbt_crisis_survival_kit"}), (mod:TherapyConcept {id: "dbt_distress_tolerance"})
MERGE (c)-[:PART_OF]->(mod);

MATCH (c:TherapyConcept {id: "dbt_turning_mind"}), (mod:TherapyConcept {id: "dbt_distress_tolerance"})
MERGE (c)-[:PART_OF]->(mod);

MATCH (c:TherapyConcept {id: "dbt_willingness"}), (mod:TherapyConcept {id: "dbt_distress_tolerance"})
MERGE (c)-[:PART_OF]->(mod);

MATCH (c:TherapyConcept {id: "dbt_half_smile"}), (mod:TherapyConcept {id: "dbt_distress_tolerance"})
MERGE (c)-[:PART_OF]->(mod);

MATCH (c:TherapyConcept {id: "dbt_willing_hands"}), (mod:TherapyConcept {id: "dbt_distress_tolerance"})
MERGE (c)-[:PART_OF]->(mod);

MATCH (c:TherapyConcept {id: "dbt_alternate_rebellion"}), (mod:TherapyConcept {id: "dbt_distress_tolerance"})
MERGE (c)-[:PART_OF]->(mod);

// DBT Emotion Regulation Skills -> Module
MATCH (c:TherapyConcept {id: "dbt_reducing_vulnerability"}), (mod:TherapyConcept {id: "dbt_emotion_regulation_module"})
MERGE (c)-[:PART_OF]->(mod);

MATCH (c:TherapyConcept {id: "dbt_check_facts"}), (mod:TherapyConcept {id: "dbt_emotion_regulation_module"})
MERGE (c)-[:PART_OF]->(mod);

MATCH (c:TherapyConcept {id: "dbt_troubleshooting"}), (mod:TherapyConcept {id: "dbt_emotion_regulation_module"})
MERGE (c)-[:PART_OF]->(mod);

MATCH (c:TherapyConcept {id: "dbt_nightmare_protocol"}), (mod:TherapyConcept {id: "dbt_emotion_regulation_module"})
MERGE (c)-[:PART_OF]->(mod);

MATCH (c:TherapyConcept {id: "dbt_opposite_action"}), (mod:TherapyConcept {id: "dbt_emotion_regulation_module"})
MERGE (c)-[:PART_OF]->(mod);

MATCH (c:TherapyConcept {id: "dbt_problem_solving"}), (mod:TherapyConcept {id: "dbt_emotion_regulation_module"})
MERGE (c)-[:PART_OF]->(mod);

// Reducing Vulnerability sub-skills
MATCH (c:TherapyConcept {id: "dbt_abc_please"}), (rv:TherapyConcept {id: "dbt_reducing_vulnerability"})
MERGE (c)-[:PART_OF]->(rv);

MATCH (c:TherapyConcept {id: "dbt_accumulate_positives"}), (rv:TherapyConcept {id: "dbt_reducing_vulnerability"})
MERGE (c)-[:PART_OF]->(rv);

MATCH (c:TherapyConcept {id: "dbt_build_mastery"}), (rv:TherapyConcept {id: "dbt_reducing_vulnerability"})
MERGE (c)-[:PART_OF]->(rv);

MATCH (c:TherapyConcept {id: "dbt_cope_ahead"}), (rv:TherapyConcept {id: "dbt_reducing_vulnerability"})
MERGE (c)-[:PART_OF]->(rv);

MATCH (c:TherapyConcept {id: "dbt_please"}), (rv:TherapyConcept {id: "dbt_reducing_vulnerability"})
MERGE (c)-[:PART_OF]->(rv);

// DBT IE Skills -> Module
MATCH (c:TherapyConcept {id: "dbt_dear_man"}), (mod:TherapyConcept {id: "dbt_interpersonal_effectiveness"})
MERGE (c)-[:PART_OF]->(mod);

MATCH (c:TherapyConcept {id: "dbt_give"}), (mod:TherapyConcept {id: "dbt_interpersonal_effectiveness"})
MERGE (c)-[:PART_OF]->(mod);

MATCH (c:TherapyConcept {id: "dbt_fast"}), (mod:TherapyConcept {id: "dbt_interpersonal_effectiveness"})
MERGE (c)-[:PART_OF]->(mod);

MATCH (c:TherapyConcept {id: "dbt_ending_relationships"}), (mod:TherapyConcept {id: "dbt_interpersonal_effectiveness"})
MERGE (c)-[:PART_OF]->(mod);

MATCH (c:TherapyConcept {id: "dbt_saying_no"}), (mod:TherapyConcept {id: "dbt_interpersonal_effectiveness"})
MERGE (c)-[:PART_OF]->(mod);

MATCH (c:TherapyConcept {id: "dbt_building_relationships"}), (mod:TherapyConcept {id: "dbt_interpersonal_effectiveness"})
MERGE (c)-[:PART_OF]->(mod);

// CBT
MATCH (c:TherapyConcept {id: "cbt_cognitive_distortion"}), (m:TherapyModality {id: "cbt"})
MERGE (c)-[:BELONGS_TO]->(m);

MATCH (c:TherapyConcept {id: "cbt_thought_record"}), (m:TherapyModality {id: "cbt"})
MERGE (c)-[:BELONGS_TO]->(m);

MATCH (c:TherapyConcept {id: "cbt_behavioral_activation"}), (m:TherapyModality {id: "cbt"})
MERGE (c)-[:BELONGS_TO]->(m);

MATCH (c:TherapyConcept {id: "cbt_exposure"}), (m:TherapyModality {id: "cbt"})
MERGE (c)-[:BELONGS_TO]->(m);

// Cognitive distortion types
MATCH (c:TherapyConcept {id: "cbt_catastrophizing"}), (cd:TherapyConcept {id: "cbt_cognitive_distortion"})
MERGE (c)-[:TYPE_OF]->(cd);

MATCH (c:TherapyConcept {id: "cbt_black_white"}), (cd:TherapyConcept {id: "cbt_cognitive_distortion"})
MERGE (c)-[:TYPE_OF]->(cd);

MATCH (c:TherapyConcept {id: "cbt_mind_reading"}), (cd:TherapyConcept {id: "cbt_cognitive_distortion"})
MERGE (c)-[:TYPE_OF]->(cd);

MATCH (c:TherapyConcept {id: "cbt_fortune_telling"}), (cd:TherapyConcept {id: "cbt_cognitive_distortion"})
MERGE (c)-[:TYPE_OF]->(cd);

MATCH (c:TherapyConcept {id: "cbt_should_statements"}), (cd:TherapyConcept {id: "cbt_cognitive_distortion"})
MERGE (c)-[:TYPE_OF]->(cd);

MATCH (c:TherapyConcept {id: "cbt_personalization"}), (cd:TherapyConcept {id: "cbt_cognitive_distortion"})
MERGE (c)-[:TYPE_OF]->(cd);

MATCH (c:TherapyConcept {id: "cbt_labeling"}), (cd:TherapyConcept {id: "cbt_cognitive_distortion"})
MERGE (c)-[:TYPE_OF]->(cd);

MATCH (c:TherapyConcept {id: "cbt_emotional_reasoning"}), (cd:TherapyConcept {id: "cbt_cognitive_distortion"})
MERGE (c)-[:TYPE_OF]->(cd);

MATCH (c:TherapyConcept {id: "cbt_mental_filter"}), (cd:TherapyConcept {id: "cbt_cognitive_distortion"})
MERGE (c)-[:TYPE_OF]->(cd);

// ACT
MATCH (c:TherapyConcept {id: "act_psych_flexibility"}), (m:TherapyModality {id: "act"})
MERGE (c)-[:BELONGS_TO]->(m);

MATCH (c:TherapyConcept {id: "act_defusion"}), (m:TherapyModality {id: "act"})
MERGE (c)-[:BELONGS_TO]->(m);

MATCH (c:TherapyConcept {id: "act_acceptance"}), (m:TherapyModality {id: "act"})
MERGE (c)-[:BELONGS_TO]->(m);

MATCH (c:TherapyConcept {id: "act_present_moment"}), (m:TherapyModality {id: "act"})
MERGE (c)-[:BELONGS_TO]->(m);

MATCH (c:TherapyConcept {id: "act_self_context"}), (m:TherapyModality {id: "act"})
MERGE (c)-[:BELONGS_TO]->(m);

MATCH (c:TherapyConcept {id: "act_values"}), (m:TherapyModality {id: "act"})
MERGE (c)-[:BELONGS_TO]->(m);

MATCH (c:TherapyConcept {id: "act_committed_action"}), (m:TherapyModality {id: "act"})
MERGE (c)-[:BELONGS_TO]->(m);

// EMDR
MATCH (c:TherapyConcept {id: "emdr_aip"}), (m:TherapyModality {id: "emdr"})
MERGE (c)-[:BELONGS_TO]->(m);

MATCH (c:TherapyConcept {id: "emdr_bilateral"}), (m:TherapyModality {id: "emdr"})
MERGE (c)-[:BELONGS_TO]->(m);

MATCH (c:TherapyConcept {id: "emdr_target"}), (m:TherapyModality {id: "emdr"})
MERGE (c)-[:BELONGS_TO]->(m);

MATCH (c:TherapyConcept {id: "emdr_nc"}), (m:TherapyModality {id: "emdr"})
MERGE (c)-[:BELONGS_TO]->(m);

MATCH (c:TherapyConcept {id: "emdr_pc"}), (m:TherapyModality {id: "emdr"})
MERGE (c)-[:BELONGS_TO]->(m);

MATCH (c:TherapyConcept {id: "emdr_suds"}), (m:TherapyModality {id: "emdr"})
MERGE (c)-[:BELONGS_TO]->(m);

MATCH (c:TherapyConcept {id: "emdr_voc"}), (m:TherapyModality {id: "emdr"})
MERGE (c)-[:BELONGS_TO]->(m);

MATCH (c:TherapyConcept {id: "emdr_phases"}), (m:TherapyModality {id: "emdr"})
MERGE (c)-[:BELONGS_TO]->(m);

// Somatic Experiencing
MATCH (c:TherapyConcept {id: "se_felt_sense"}), (m:TherapyModality {id: "se"})
MERGE (c)-[:BELONGS_TO]->(m);

MATCH (c:TherapyConcept {id: "se_titration"}), (m:TherapyModality {id: "se"})
MERGE (c)-[:BELONGS_TO]->(m);

MATCH (c:TherapyConcept {id: "se_pendulation"}), (m:TherapyModality {id: "se"})
MERGE (c)-[:BELONGS_TO]->(m);

MATCH (c:TherapyConcept {id: "se_discharge"}), (m:TherapyModality {id: "se"})
MERGE (c)-[:BELONGS_TO]->(m);

MATCH (c:TherapyConcept {id: "se_resourcing"}), (m:TherapyModality {id: "se"})
MERGE (c)-[:BELONGS_TO]->(m);

MATCH (c:TherapyConcept {id: "se_orienting"}), (m:TherapyModality {id: "se"})
MERGE (c)-[:BELONGS_TO]->(m);

MATCH (c:TherapyConcept {id: "se_defensive"}), (m:TherapyModality {id: "se"})
MERGE (c)-[:BELONGS_TO]->(m);

// CPT
MATCH (c:TherapyConcept {id: "cpt_stuck_point"}), (m:TherapyModality {id: "cpt"})
MERGE (c)-[:BELONGS_TO]->(m);

MATCH (c:TherapyConcept {id: "cpt_assimilation"}), (m:TherapyModality {id: "cpt"})
MERGE (c)-[:BELONGS_TO]->(m);

MATCH (c:TherapyConcept {id: "cpt_overaccommodation"}), (m:TherapyModality {id: "cpt"})
MERGE (c)-[:BELONGS_TO]->(m);

MATCH (c:TherapyConcept {id: "cpt_accommodation"}), (m:TherapyModality {id: "cpt"})
MERGE (c)-[:BELONGS_TO]->(m);

MATCH (c:TherapyConcept {id: "cpt_abc"}), (m:TherapyModality {id: "cpt"})
MERGE (c)-[:BELONGS_TO]->(m);

MATCH (c:TherapyConcept {id: "cpt_challenging"}), (m:TherapyModality {id: "cpt"})
MERGE (c)-[:BELONGS_TO]->(m);

MATCH (c:TherapyConcept {id: "cpt_themes"}), (m:TherapyModality {id: "cpt"})
MERGE (c)-[:BELONGS_TO]->(m);

// MBCT
MATCH (c:TherapyConcept {id: "mbct_decentering"}), (m:TherapyModality {id: "mbct"})
MERGE (c)-[:BELONGS_TO]->(m);

MATCH (c:TherapyConcept {id: "mbct_body_scan"}), (m:TherapyModality {id: "mbct"})
MERGE (c)-[:BELONGS_TO]->(m);

MATCH (c:TherapyConcept {id: "mbct_sitting"}), (m:TherapyModality {id: "mbct"})
MERGE (c)-[:BELONGS_TO]->(m);

MATCH (c:TherapyConcept {id: "mbct_movement"}), (m:TherapyModality {id: "mbct"})
MERGE (c)-[:BELONGS_TO]->(m);

MATCH (c:TherapyConcept {id: "mbct_3min"}), (m:TherapyModality {id: "mbct"})
MERGE (c)-[:BELONGS_TO]->(m);

MATCH (c:TherapyConcept {id: "mbct_relapse"}), (m:TherapyModality {id: "mbct"})
MERGE (c)-[:BELONGS_TO]->(m);

// Polyvagal
MATCH (c:TherapyConcept {id: "pv_ventral_vagal"}), (m:TherapyModality {id: "polyvagal"})
MERGE (c)-[:BELONGS_TO]->(m);

MATCH (c:TherapyConcept {id: "pv_sympathetic"}), (m:TherapyModality {id: "polyvagal"})
MERGE (c)-[:BELONGS_TO]->(m);

MATCH (c:TherapyConcept {id: "pv_dorsal_vagal"}), (m:TherapyModality {id: "polyvagal"})
MERGE (c)-[:BELONGS_TO]->(m);

MATCH (c:TherapyConcept {id: "pv_neuroception"}), (m:TherapyModality {id: "polyvagal"})
MERGE (c)-[:BELONGS_TO]->(m);

MATCH (c:TherapyConcept {id: "pv_coregulation"}), (m:TherapyModality {id: "polyvagal"})
MERGE (c)-[:BELONGS_TO]->(m);

MATCH (c:TherapyConcept {id: "pv_vagal_brake"}), (m:TherapyModality {id: "polyvagal"})
MERGE (c)-[:BELONGS_TO]->(m);

MATCH (c:TherapyConcept {id: "pv_social_engagement"}), (m:TherapyModality {id: "polyvagal"})
MERGE (c)-[:BELONGS_TO]->(m);


// ============================================================
// THERAPY -> CLINICAL TARGETS
// ============================================================

MATCH (m:TherapyModality {id: "dbt"}), (c:ClinicalConstruct {id: "bpd"})
MERGE (m)-[:DEVELOPED_FOR]->(c);

MATCH (m:TherapyModality {id: "dbt"}), (c:ClinicalConstruct {id: "emotional_dysregulation"})
MERGE (m)-[:TREATS]->(c);

MATCH (m:TherapyModality {id: "dbt"}), (c:ClinicalConstruct {id: "ptsd"})
MERGE (m)-[:TREATS]->(c);

MATCH (m:TherapyModality {id: "cbt"}), (c:ClinicalConstruct {id: "mdd"})
MERGE (m)-[:TREATS]->(c);

MATCH (m:TherapyModality {id: "cbt"}), (c:ClinicalConstruct {id: "gad"})
MERGE (m)-[:TREATS]->(c);

MATCH (m:TherapyModality {id: "cbt"}), (c:ClinicalConstruct {id: "panic_disorder"})
MERGE (m)-[:TREATS]->(c);

MATCH (m:TherapyModality {id: "cbt"}), (c:ClinicalConstruct {id: "social_anxiety"})
MERGE (m)-[:TREATS]->(c);

MATCH (m:TherapyModality {id: "cbt"}), (c:ClinicalConstruct {id: "ocd"})
MERGE (m)-[:TREATS]->(c);

MATCH (m:TherapyModality {id: "act"}), (c:ClinicalConstruct {id: "mdd"})
MERGE (m)-[:TREATS]->(c);

MATCH (m:TherapyModality {id: "act"}), (c:ClinicalConstruct {id: "gad"})
MERGE (m)-[:TREATS]->(c);

MATCH (m:TherapyModality {id: "emdr"}), (c:ClinicalConstruct {id: "ptsd"})
MERGE (m)-[:TREATS]->(c);

MATCH (m:TherapyModality {id: "emdr"}), (c:ClinicalConstruct {id: "cptsd"})
MERGE (m)-[:TREATS]->(c);

MATCH (m:TherapyModality {id: "cpt"}), (c:ClinicalConstruct {id: "ptsd"})
MERGE (m)-[:TREATS]->(c);

MATCH (m:TherapyModality {id: "ifs"}), (c:ClinicalConstruct {id: "cptsd"})
MERGE (m)-[r:TREATS]->(c)
SET r += {evidenceGrade: "Preliminary", evidenceNote: "Small pilot studies only (Hodgdon et al. 2021 PTSD pilot; PARTS online group RCT 2026)."};

MATCH (m:TherapyModality {id: "ifs"}), (c:ClinicalConstruct {id: "dissociation"})
MERGE (m)-[r:TREATS]->(c)
SET r += {evidenceGrade: "Preliminary", evidenceNote: "Clinical writing (Twombly; Anderson), no controlled trials; dissociation trainers advise care with parts work."};

MATCH (m:TherapyModality {id: "ifs"}), (c:ClinicalConstruct {id: "bpd"})
MERGE (m)-[r:TREATS]->(c)
SET r += {evidenceGrade: "Preliminary", evidenceNote: "No IFS studies in BPD (Francis, Fino & Heym 2026 systematic review). Kept only so the edge is graded, not claimed."};

MATCH (m:TherapyModality {id: "se"}), (c:ClinicalConstruct {id: "ptsd"})
MERGE (m)-[:TREATS]->(c);

MATCH (m:TherapyModality {id: "se"}), (c:ClinicalConstruct {id: "cptsd"})
MERGE (m)-[:TREATS]->(c);

MATCH (m:TherapyModality {id: "mbct"}), (c:ClinicalConstruct {id: "mdd"})
MERGE (m)-[:DEVELOPED_FOR]->(c);

MATCH (m:TherapyModality {id: "mbct"}), (c:ClinicalConstruct {id: "rumination"})
MERGE (m)-[:TREATS]->(c);


// ============================================================
// SKILL -> SYMPTOM TARGETS
// ============================================================

MATCH (c:TherapyConcept {id: "dbt_distress_tolerance"}), (t:ClinicalConstruct {id: "emotional_dysregulation"})
MERGE (c)-[:TARGETS]->(t);

MATCH (c:TherapyConcept {id: "dbt_tipp"}), (t:ClinicalConstruct {id: "emotional_dysregulation"})
MERGE (c)-[r:TARGETS]->(t)
SET r += {mechanism: "activates parasympathetic via dive reflex"};

MATCH (c:TherapyConcept {id: "dbt_tipp"}), (t:Emotion {id: "panic"})
MERGE (c)-[:TARGETS]->(t);

MATCH (c:TherapyConcept {id: "dbt_opposite_action"}), (t:ClinicalConstruct {id: "avoidance"})
MERGE (c)-[:TARGETS]->(t);

MATCH (c:TherapyConcept {id: "cbt_exposure"}), (t:ClinicalConstruct {id: "avoidance"})
MERGE (c)-[:TARGETS]->(t);

MATCH (c:TherapyConcept {id: "cbt_exposure"}), (t:Emotion {id: "fear"})
MERGE (c)-[:TARGETS]->(t);

MATCH (c:TherapyConcept {id: "dbt_radical_acceptance"}), (t:ClinicalConstruct {id: "rumination"})
MERGE (c)-[:TARGETS]->(t);

MATCH (c:TherapyConcept {id: "act_defusion"}), (t:ClinicalConstruct {id: "rumination"})
MERGE (c)-[:TARGETS]->(t);

MATCH (c:TherapyConcept {id: "cbt_behavioral_activation"}), (t:ClinicalConstruct {id: "mdd"})
MERGE (c)-[:TARGETS]->(t);

MATCH (c:TherapyConcept {id: "dbt_check_facts"}), (t:TherapyConcept {id: "cbt_catastrophizing"})
MERGE (c)-[:TARGETS]->(t);

MATCH (c:TherapyConcept {id: "cbt_thought_record"}), (t:TherapyConcept {id: "cbt_cognitive_distortion"})
MERGE (c)-[:TARGETS]->(t);


// ============================================================
// IFS PARTS -> EMOTIONS
// ============================================================

MATCH (c:TherapyConcept {id: "ifs_exile"}), (e:Emotion {id: "cold_shame"})
MERGE (c)-[:CARRIES]->(e);

MATCH (c:TherapyConcept {id: "ifs_exile"}), (e:Emotion {id: "fear"})
MERGE (c)-[:CARRIES]->(e);

MATCH (c:TherapyConcept {id: "ifs_exile"}), (e:Emotion {id: "loneliness"})
MERGE (c)-[:CARRIES]->(e);

MATCH (c:TherapyConcept {id: "ifs_exile"}), (e:Emotion {id: "sadness"})
MERGE (c)-[:CARRIES]->(e);

MATCH (c:TherapyConcept {id: "ifs_firefighter"}), (e:Emotion {id: "fear"})
MERGE (c)-[:RESPONDS_TO]->(e);

MATCH (c:TherapyConcept {id: "ifs_firefighter"}), (e:Emotion {id: "cold_shame"})
MERGE (c)-[:RESPONDS_TO]->(e);

MATCH (c:TherapyConcept {id: "ifs_firefighter"}), (e:Emotion {id: "overwhelm"})
MERGE (c)-[:RESPONDS_TO]->(e);

MATCH (c:TherapyConcept {id: "ifs_manager"}), (e:Emotion {id: "cold_shame"})
MERGE (c)-[:PREVENTS]->(e);

MATCH (c:TherapyConcept {id: "ifs_manager"}), (e:Emotion {id: "fear"})
MERGE (c)-[:PREVENTS]->(e);

MATCH (c:TherapyConcept {id: "ifs_manager"}), (e:Emotion {id: "rejection"})
MERGE (c)-[:PREVENTS]->(e);


// ============================================================
// DBT SKILLS -> EMOTIONS
// ============================================================

MATCH (c:TherapyConcept {id: "dbt_opposite_action"}), (e:Emotion {id: "fear"})
MERGE (c)-[:ADDRESSES]->(e);

MATCH (c:TherapyConcept {id: "dbt_opposite_action"}), (e:Emotion {id: "cold_shame"})
MERGE (c)-[:ADDRESSES]->(e);

MATCH (c:TherapyConcept {id: "dbt_opposite_action"}), (e:Emotion {id: "sadness"})
MERGE (c)-[:ADDRESSES]->(e);

MATCH (c:TherapyConcept {id: "dbt_opposite_action"}), (e:Emotion {id: "anger"})
MERGE (c)-[:ADDRESSES]->(e);

MATCH (c:TherapyConcept {id: "dbt_tipp"}), (e:Emotion {id: "panic"})
MERGE (c)-[:REDUCES]->(e);

MATCH (c:TherapyConcept {id: "dbt_tipp"}), (e:Emotion {id: "overwhelm"})
MERGE (c)-[:REDUCES]->(e);

MATCH (c:TherapyConcept {id: "dbt_tipp"}), (e:Emotion {id: "anger"})
MERGE (c)-[:REDUCES]->(e);

// Alternate Rebellion - channel rebellious urges into non-destructive outlets
MATCH (c:TherapyConcept {id: "dbt_alternate_rebellion"}), (e:Emotion {id: "angsty"})
MERGE (c)-[:ADDRESSES]->(e);

MATCH (c:TherapyConcept {id: "dbt_alternate_rebellion"}), (e:Emotion {id: "anger"})
MERGE (c)-[:ADDRESSES]->(e);

MATCH (c:TherapyConcept {id: "dbt_alternate_rebellion"}), (e:Emotion {id: "frustration"})
MERGE (c)-[:ADDRESSES]->(e);

MATCH (c:TherapyConcept {id: "dbt_alternate_rebellion"}), (e:Emotion {id: "irritation"})
MERGE (c)-[:ADDRESSES]->(e);


// ============================================================
// SKILL -> BRAIN/FUNCTION
// ============================================================

MATCH (c:TherapyConcept {id: "dbt_tipp"}), (b:BrainStructure {id: "amygdala"})
MERGE (c)-[r:MODULATES]->(b)
SET r += {direction: "down-regulates", mechanism: "dive reflex, vagal activation"};

MATCH (c:TherapyConcept {id: "cbt_exposure"}), (f:Function {id: "fear_extinction"})
MERGE (c)-[r:MODULATES]->(f)
SET r += {direction: "promotes", mechanism: "extinction learning"};

MATCH (c:TherapyConcept {id: "mindfulness"}), (b:BrainStructure {id: "insula"})
MERGE (c)-[r:MODULATES]->(b)
SET r += {direction: "strengthens"};

MATCH (c:TherapyConcept {id: "mindfulness"}), (b:BrainStructure {id: "pfc"})
MERGE (c)-[r:MODULATES]->(b)
SET r += {direction: "strengthens"};

MATCH (c:TherapyConcept {id: "mindfulness"}), (f:Function {id: "interoception"})
MERGE (c)-[r:MODULATES]->(f)
SET r += {direction: "increases"};

MATCH (c:TherapyConcept {id: "cbt_behavioral_activation"}), (n:NeurochemicalSystem {id: "dopamine"})
MERGE (c)-[r:MODULATES]->(n)
SET r += {direction: "increases"};


// ============================================================
// POLYVAGAL -> EMOTION
// ============================================================

MATCH (c:TherapyConcept {id: "pv_ventral_vagal"}), (e:Emotion {id: "safety"})
MERGE (c)-[:ASSOCIATED_WITH]->(e);

MATCH (c:TherapyConcept {id: "pv_ventral_vagal"}), (e:Emotion {id: "calm"})
MERGE (c)-[:ASSOCIATED_WITH]->(e);

MATCH (c:TherapyConcept {id: "pv_ventral_vagal"}), (coreg:TherapyConcept {id: "pv_coregulation"})
MERGE (c)-[:ENABLES]->(coreg);

MATCH (c:TherapyConcept {id: "pv_sympathetic"}), (e:Emotion {id: "fear"})
MERGE (c)-[:ASSOCIATED_WITH]->(e);

MATCH (c:TherapyConcept {id: "pv_sympathetic"}), (e:Emotion {id: "anger"})
MERGE (c)-[:ASSOCIATED_WITH]->(e);

MATCH (c:TherapyConcept {id: "pv_sympathetic"}), (e:Emotion {id: "anxiety"})
MERGE (c)-[:ASSOCIATED_WITH]->(e);

MATCH (c:TherapyConcept {id: "pv_dorsal_vagal"}), (e:Emotion {id: "numbness"})
MERGE (c)-[:ASSOCIATED_WITH]->(e);

MATCH (c:TherapyConcept {id: "pv_dorsal_vagal"}), (e:Emotion {id: "hopelessness"})
MERGE (c)-[:ASSOCIATED_WITH]->(e);

MATCH (c:TherapyConcept {id: "pv_dorsal_vagal"}), (cc:ClinicalConstruct {id: "dissociation"})
MERGE (c)-[:ASSOCIATED_WITH]->(cc);

MATCH (c:TherapyConcept {id: "pv_neuroception"}), (b:BrainStructure {id: "amygdala"})
MERGE (c)-[:INVOLVES]->(b);

MATCH (c:TherapyConcept {id: "pv_neuroception"}), (b:BrainStructure {id: "insula"})
MERGE (c)-[:INVOLVES]->(b);


// ============================================================
// BODY SENSATION MODEL
// (moved) FELT_AS now lives in scripts/body-map/content.py (FELT) → schema/body-map.cypher:
// the one source of where each emotion is felt (Oct 2026).
// ============================================================


// ============================================================
// CROSS-MODALITY BRIDGES
// ============================================================

// Self/Observer parallels. Parallels, not equivalents: Wise Mind and self-as-context are reached by
// practice; IFS posits Self as innate (docs/design/parts.md, Fix while here).
MATCH (a:TherapyConcept {id: "ifs_self"}), (b:TherapyConcept {id: "dbt_wise_mind"})
MERGE (a)-[r:CONCEPTUALLY_RELATED_TO]->(b)
SET r += {type: "functional_parallel"};

MATCH (a:TherapyConcept {id: "ifs_self"}), (b:TherapyConcept {id: "pv_ventral_vagal"})
MERGE (a)-[r:CONCEPTUALLY_RELATED_TO]->(b)
SET r += {type: "functional_parallel"};

MATCH (a:TherapyConcept {id: "act_self_context"}), (b:TherapyConcept {id: "ifs_self"})
MERGE (a)-[r:CONCEPTUALLY_RELATED_TO]->(b)
SET r += {type: "functional_parallel"};

MATCH (a:TherapyConcept {id: "act_self_context"}), (b:TherapyConcept {id: "dbt_wise_mind"})
MERGE (a)-[r:CONCEPTUALLY_RELATED_TO]->(b)
SET r += {type: "functional_equivalent"};

// Acceptance parallels
MATCH (a:TherapyConcept {id: "dbt_radical_acceptance"}), (b:TherapyConcept {id: "act_acceptance"})
MERGE (a)-[r:CONCEPTUALLY_RELATED_TO]->(b)
SET r += {type: "functional_equivalent"};

// Defusion/Unblending/Decentering
MATCH (a:TherapyConcept {id: "ifs_unblending"}), (b:TherapyConcept {id: "act_defusion"})
MERGE (a)-[r:CONCEPTUALLY_RELATED_TO]->(b)
SET r += {type: "functional_equivalent"};

MATCH (a:TherapyConcept {id: "mbct_decentering"}), (b:TherapyConcept {id: "act_defusion"})
MERGE (a)-[r:CONCEPTUALLY_RELATED_TO]->(b)
SET r += {type: "functional_equivalent"};

MATCH (a:TherapyConcept {id: "mbct_decentering"}), (b:TherapyConcept {id: "ifs_unblending"})
MERGE (a)-[r:CONCEPTUALLY_RELATED_TO]->(b)
SET r += {type: "functional_equivalent"};

// Present moment/Mindfulness parallels
MATCH (a:TherapyConcept {id: "act_present_moment"}), (b:TherapyConcept {id: "dbt_observe"})
MERGE (a)-[r:CONCEPTUALLY_RELATED_TO]->(b)
SET r += {type: "functional_equivalent"};

MATCH (a:TherapyConcept {id: "act_present_moment"}), (b:TherapyConcept {id: "mindfulness"})
MERGE (a)-[r:CONCEPTUALLY_RELATED_TO]->(b)
SET r += {type: "functional_equivalent"};

// Mindfulness as shared foundation
MATCH (a:TherapyConcept {id: "mindfulness"}), (b:TherapyConcept {id: "dbt_mindfulness_module"})
MERGE (a)-[r:CONCEPTUALLY_RELATED_TO]->(b)
SET r += {type: "shared_foundation"};

MATCH (a:TherapyConcept {id: "mindfulness"}), (b:TherapyModality {id: "mbct"})
MERGE (a)-[r:CONCEPTUALLY_RELATED_TO]->(b)
SET r += {type: "shared_foundation"};

MATCH (a:TherapyConcept {id: "mindfulness"}), (b:TherapyModality {id: "act"})
MERGE (a)-[r:CONCEPTUALLY_RELATED_TO]->(b)
SET r += {type: "shared_foundation"};

// Parts/States parallels
MATCH (a:TherapyConcept {id: "ifs_exile"}), (b:TherapyConcept {id: "pv_dorsal_vagal"})
MERGE (a)-[r:CONCEPTUALLY_RELATED_TO]->(b)
SET r += {type: "state_parallel"};

MATCH (a:TherapyConcept {id: "ifs_firefighter"}), (b:TherapyConcept {id: "pv_sympathetic"})
MERGE (a)-[r:CONCEPTUALLY_RELATED_TO]->(b)
SET r += {type: "state_parallel"};

MATCH (a:TherapyConcept {id: "ifs_manager"}), (b:FunctionalNetwork {id: "cen"})
MERGE (a)-[r:CONCEPTUALLY_RELATED_TO]->(b)
SET r += {type: "functional_parallel"};

// Trailhead/Neuroception
MATCH (a:TherapyConcept {id: "pv_neuroception"}), (b:TherapyConcept {id: "ifs_trailhead"})
MERGE (a)-[r:CONCEPTUALLY_RELATED_TO]->(b)
SET r += {type: "functional_parallel"};

// Co-regulation/IE
MATCH (a:TherapyConcept {id: "pv_coregulation"}), (b:TherapyConcept {id: "dbt_interpersonal_effectiveness"})
MERGE (a)-[r:CONCEPTUALLY_RELATED_TO]->(b)
SET r += {type: "functional_parallel"};

// Cognitive restructuring tools
MATCH (a:TherapyConcept {id: "dbt_check_facts"}), (b:TherapyConcept {id: "cbt_thought_record"})
MERGE (a)-[r:CONCEPTUALLY_RELATED_TO]->(b)
SET r += {type: "functional_equivalent"};

MATCH (a:TherapyConcept {id: "cpt_challenging"}), (b:TherapyConcept {id: "cbt_thought_record"})
MERGE (a)-[r:CONCEPTUALLY_RELATED_TO]->(b)
SET r += {type: "functional_equivalent"};

// Action despite emotion
MATCH (a:TherapyConcept {id: "act_committed_action"}), (b:TherapyConcept {id: "dbt_opposite_action"})
MERGE (a)-[r:CONCEPTUALLY_RELATED_TO]->(b)
SET r += {type: "functional_parallel"};

// Emotional dysregulation
MATCH (a:TherapyConcept {id: "ifs_exile"}), (b:ClinicalConstruct {id: "emotional_dysregulation"})
MERGE (a)-[r:CONCEPTUALLY_RELATED_TO]->(b)
SET r += {type: "overlapping_construct"};

// Body awareness
MATCH (a:TherapyConcept {id: "se_felt_sense"}), (b:Function {id: "interoception"})
MERGE (a)-[r:CONCEPTUALLY_RELATED_TO]->(b)
SET r += {type: "functional_equivalent"};

MATCH (a:TherapyConcept {id: "mbct_body_scan"}), (b:Function {id: "interoception"})
MERGE (a)-[r:CONCEPTUALLY_RELATED_TO]->(b)
SET r += {type: "develops"};


// ============================================================
// CLINICAL -> BRAIN
// ============================================================

MATCH (c:ClinicalConstruct {id: "ptsd"}), (b:BrainStructure {id: "amygdala"})
MERGE (c)-[r:ASSOCIATED_WITH]->(b)
SET r += {finding: "hyperactivation", evidence: "strong"};

MATCH (c:ClinicalConstruct {id: "ptsd"}), (b:BrainStructure {id: "pfc"})
MERGE (c)-[r:ASSOCIATED_WITH]->(b)
SET r += {finding: "hypoactivation", evidence: "moderate"};

MATCH (c:ClinicalConstruct {id: "ptsd"}), (b:BrainStructure {id: "hippocampus"})
MERGE (c)-[r:ASSOCIATED_WITH]->(b)
SET r += {finding: "reduced_volume", evidence: "strong"};

MATCH (c:ClinicalConstruct {id: "bpd"}), (b:BrainStructure {id: "amygdala"})
MERGE (c)-[r:ASSOCIATED_WITH]->(b)
SET r += {finding: "hyperactivation"};

MATCH (c:ClinicalConstruct {id: "bpd"}), (b:BrainStructure {id: "pfc"})
MERGE (c)-[r:ASSOCIATED_WITH]->(b)
SET r += {finding: "reduced_connectivity"};

MATCH (c:ClinicalConstruct {id: "mdd"}), (n:FunctionalNetwork {id: "dmn"})
MERGE (c)-[r:ASSOCIATED_WITH]->(n)
SET r += {finding: "hyperactivation"};

MATCH (c:ClinicalConstruct {id: "mdd"}), (b:BrainStructure {id: "dlpfc"})
MERGE (c)-[r:ASSOCIATED_WITH]->(b)
SET r += {finding: "hypoactivation"};

MATCH (c:ClinicalConstruct {id: "mdd"}), (n:NeurochemicalSystem {id: "serotonin"})
MERGE (c)-[r:ASSOCIATED_WITH]->(n)
SET r += {finding: "dysregulation"};

MATCH (c:ClinicalConstruct {id: "gad"}), (b:BrainStructure {id: "amygdala"})
MERGE (c)-[r:ASSOCIATED_WITH]->(b)
SET r += {finding: "hyperactivation"};

MATCH (c:ClinicalConstruct {id: "gad"}), (b:BrainStructure {id: "bnst"})
MERGE (c)-[r:ASSOCIATED_WITH]->(b)
SET r += {finding: "hyperactivation"};

MATCH (c:ClinicalConstruct {id: "adhd"}), (b:BrainStructure {id: "pfc"})
MERGE (c)-[r:ASSOCIATED_WITH]->(b)
SET r += {finding: "hypoactivation"};

MATCH (c:ClinicalConstruct {id: "adhd"}), (n:NeurochemicalSystem {id: "dopamine"})
MERGE (c)-[r:ASSOCIATED_WITH]->(n)
SET r += {finding: "dysregulation"};

MATCH (c:ClinicalConstruct {id: "ocd"}), (b:BrainStructure {id: "acc"})
MERGE (c)-[r:ASSOCIATED_WITH]->(b)
SET r += {finding: "hyperactivation", notes: "error signal that won't turn off"};

MATCH (c:ClinicalConstruct {id: "ocd"}), (b:BrainStructure {id: "ofc"})
MERGE (c)-[r:ASSOCIATED_WITH]->(b)
SET r += {finding: "hyperactivation", notes: "OFC-striatal loop"};

MATCH (c:ClinicalConstruct {id: "panic_disorder"}), (b:BrainStructure {id: "amygdala"})
MERGE (c)-[r:ASSOCIATED_WITH]->(b)
SET r += {finding: "hyperactivation"};

MATCH (c:ClinicalConstruct {id: "panic_disorder"}), (b:BrainStructure {id: "pag"})
MERGE (c)-[r:ASSOCIATED_WITH]->(b)
SET r += {finding: "hyperactivation", notes: "suffocation alarm theory"};

MATCH (c:ClinicalConstruct {id: "social_anxiety"}), (b:BrainStructure {id: "amygdala"})
MERGE (c)-[r:ASSOCIATED_WITH]->(b)
SET r += {finding: "hyperactivation"};

MATCH (c:ClinicalConstruct {id: "dissociation"}), (b:BrainStructure {id: "insula"})
MERGE (c)-[r:ASSOCIATED_WITH]->(b)
SET r += {finding: "altered_connectivity"};


// ============================================================
// HiTOP FRAMEWORK RELATIONSHIPS
// ============================================================

// P-Factor to Spectra
MATCH (pf:HiTOPConstruct {id: "hitop_p_factor"}), (int:HiTOPConstruct {id: "hitop_internalizing"})
MERGE (int)-[:CONTRIBUTES_TO]->(pf);

MATCH (pf:HiTOPConstruct {id: "hitop_p_factor"}), (ext:HiTOPConstruct {id: "hitop_externalizing"})
MERGE (ext)-[:CONTRIBUTES_TO]->(pf);

MATCH (pf:HiTOPConstruct {id: "hitop_p_factor"}), (td:HiTOPConstruct {id: "hitop_thought_disorder"})
MERGE (td)-[:CONTRIBUTES_TO]->(pf);

MATCH (pf:HiTOPConstruct {id: "hitop_p_factor"}), (som:HiTOPConstruct {id: "hitop_somatoform"})
MERGE (som)-[:CONTRIBUTES_TO]->(pf);

MATCH (pf:HiTOPConstruct {id: "hitop_p_factor"}), (det:HiTOPConstruct {id: "hitop_detachment"})
MERGE (det)-[:CONTRIBUTES_TO]->(pf);

// P-Factor Neural Correlates
MATCH (pf:HiTOPConstruct {id: "hitop_p_factor"}), (mpfc:BrainStructure {id: "mpfc"})
MERGE (pf)-[r:ASSOCIATED_WITH]->(mpfc)
SET r += {finding: "dysregulation"};

// Subfactors to Spectra
MATCH (dist:HiTOPConstruct {id: "hitop_distress"}), (int:HiTOPConstruct {id: "hitop_internalizing"})
MERGE (dist)-[:PART_OF]->(int);

MATCH (fear:HiTOPConstruct {id: "hitop_fear"}), (int:HiTOPConstruct {id: "hitop_internalizing"})
MERGE (fear)-[:PART_OF]->(int);

// Clinical Constructs to HiTOP Spectra
MATCH (mdd:ClinicalConstruct {id: "mdd"}), (dist:HiTOPConstruct {id: "hitop_distress"})
MERGE (mdd)-[:MAPS_TO]->(dist);

MATCH (gad:ClinicalConstruct {id: "gad"}), (dist:HiTOPConstruct {id: "hitop_distress"})
MERGE (gad)-[:MAPS_TO]->(dist);

MATCH (ptsd:ClinicalConstruct {id: "ptsd"}), (int:HiTOPConstruct {id: "hitop_internalizing"})
MERGE (ptsd)-[:MAPS_TO]->(int);

MATCH (panic:ClinicalConstruct {id: "panic_disorder"}), (fear:HiTOPConstruct {id: "hitop_fear"})
MERGE (panic)-[:MAPS_TO]->(fear);

MATCH (sad:ClinicalConstruct {id: "social_anxiety"}), (fear:HiTOPConstruct {id: "hitop_fear"})
MERGE (sad)-[:MAPS_TO]->(fear);

MATCH (adhd:ClinicalConstruct {id: "adhd"}), (ext:HiTOPConstruct {id: "hitop_externalizing"})
MERGE (adhd)-[:MAPS_TO]->(ext);

// HiTOP Spectra to Neural Circuitry
MATCH (int:HiTOPConstruct {id: "hitop_internalizing"}), (amyg:BrainStructure {id: "amygdala"})
MERGE (int)-[:KEY_CIRCUIT]->(amyg);

MATCH (int:HiTOPConstruct {id: "hitop_internalizing"}), (mpfc:BrainStructure {id: "mpfc"})
MERGE (int)-[:KEY_CIRCUIT]->(mpfc);

MATCH (int:HiTOPConstruct {id: "hitop_internalizing"}), (dacc:BrainStructure {id: "dacc"})
MERGE (int)-[:KEY_CIRCUIT]->(dacc);

MATCH (int:HiTOPConstruct {id: "hitop_internalizing"}), (ins:BrainStructure {id: "insula"})
MERGE (int)-[:KEY_CIRCUIT]->(ins);

MATCH (ext:HiTOPConstruct {id: "hitop_externalizing"}), (nacc:BrainStructure {id: "nucleus_accumbens"})
MERGE (ext)-[:KEY_CIRCUIT]->(nacc);

MATCH (ext:HiTOPConstruct {id: "hitop_externalizing"}), (dlpfc:BrainStructure {id: "dlpfc"})
MERGE (ext)-[:KEY_CIRCUIT]->(dlpfc);

MATCH (ext:HiTOPConstruct {id: "hitop_externalizing"}), (ofc:BrainStructure {id: "ofc"})
MERGE (ext)-[:KEY_CIRCUIT]->(ofc);


// ============================================================
// RDoC FRAMEWORK RELATIONSHIPS
// ============================================================

// Constructs to Domains
MATCH (at:RDoCConstruct {id: "rdoc_acute_threat"}), (nv:RDoCDomain {id: "rdoc_negative_valence"})
MERGE (at)-[:BELONGS_TO]->(nv);

MATCH (pt:RDoCConstruct {id: "rdoc_potential_threat"}), (nv:RDoCDomain {id: "rdoc_negative_valence"})
MERGE (pt)-[:BELONGS_TO]->(nv);

MATCH (loss:RDoCConstruct {id: "rdoc_loss"}), (nv:RDoCDomain {id: "rdoc_negative_valence"})
MERGE (loss)-[:BELONGS_TO]->(nv);

MATCH (sp:RDoCConstruct {id: "rdoc_self_perception"}), (soc:RDoCDomain {id: "rdoc_social"})
MERGE (sp)-[:BELONGS_TO]->(soc);

MATCH (aff:RDoCConstruct {id: "rdoc_affiliation"}), (soc:RDoCDomain {id: "rdoc_social"})
MERGE (aff)-[:BELONGS_TO]->(soc);

// RDoC Constructs to Neural Circuits
MATCH (at:RDoCConstruct {id: "rdoc_acute_threat"}), (amyg:BrainStructure {id: "amygdala"})
MERGE (at)-[:PRIMARY_CIRCUIT]->(amyg);

MATCH (at:RDoCConstruct {id: "rdoc_acute_threat"}), (pag:BrainStructure {id: "pag"})
MERGE (at)-[:PRIMARY_CIRCUIT]->(pag);

MATCH (pt:RDoCConstruct {id: "rdoc_potential_threat"}), (bnst:BrainStructure {id: "bnst"})
MERGE (pt)-[:PRIMARY_CIRCUIT]->(bnst);

MATCH (sp:RDoCConstruct {id: "rdoc_self_perception"}), (mpfc:BrainStructure {id: "mpfc"})
MERGE (sp)-[:PRIMARY_CIRCUIT]->(mpfc);

MATCH (sp:RDoCConstruct {id: "rdoc_self_perception"}), (pcc:BrainStructure {id: "pcc"})
MERGE (sp)-[:PRIMARY_CIRCUIT]->(pcc);

MATCH (sp:RDoCConstruct {id: "rdoc_self_perception"}), (ins:BrainStructure {id: "insula"})
MERGE (sp)-[:PRIMARY_CIRCUIT]->(ins);

// RDoC to Therapy Concepts (Self-perception as anchor for Self/Wise Mind/Observer Self)
MATCH (sp:RDoCConstruct {id: "rdoc_self_perception"}), (self:TherapyConcept {id: "ifs_self"})
MERGE (sp)-[:NEUROBIOLOGICAL_ANCHOR_FOR]->(self);

MATCH (sp:RDoCConstruct {id: "rdoc_self_perception"}), (wm:TherapyConcept {id: "dbt_wise_mind"})
MERGE (sp)-[:NEUROBIOLOGICAL_ANCHOR_FOR]->(wm);

MATCH (sp:RDoCConstruct {id: "rdoc_self_perception"}), (sac:TherapyConcept {id: "act_self_context"})
MERGE (sp)-[:NEUROBIOLOGICAL_ANCHOR_FOR]->(sac);

// RDoC-HiTOP Cross-references
MATCH (int:HiTOPConstruct {id: "hitop_internalizing"}), (nv:RDoCDomain {id: "rdoc_negative_valence"})
MERGE (int)-[:RDOC_DOMAIN_ASSOCIATION]->(nv);

MATCH (ext:HiTOPConstruct {id: "hitop_externalizing"}), (pv:RDoCDomain {id: "rdoc_positive_valence"})
MERGE (ext)-[:RDOC_DOMAIN_ASSOCIATION]->(pv);

MATCH (td:HiTOPConstruct {id: "hitop_thought_disorder"}), (cog:RDoCDomain {id: "rdoc_cognitive"})
MERGE (td)-[:RDOC_DOMAIN_ASSOCIATION]->(cog);

MATCH (som:HiTOPConstruct {id: "hitop_somatoform"}), (ar:RDoCDomain {id: "rdoc_arousal"})
MERGE (som)-[:RDOC_DOMAIN_ASSOCIATION]->(ar);


// ============================================================
// WINDOW OF TOLERANCE RELATIONSHIPS
// ============================================================

// Zone to Polyvagal State
MATCH (opt:TherapyConcept {id: "wot_optimal_zone"}), (vv:TherapyConcept {id: "pv_ventral_vagal"})
MERGE (opt)-[:CORRESPONDS_TO]->(vv);

MATCH (hyper:TherapyConcept {id: "wot_hyperarousal"}), (symp:TherapyConcept {id: "pv_sympathetic"})
MERGE (hyper)-[:CORRESPONDS_TO]->(symp);

MATCH (hypo:TherapyConcept {id: "wot_hypoarousal"}), (dv:TherapyConcept {id: "pv_dorsal_vagal"})
MERGE (hypo)-[:CORRESPONDS_TO]->(dv);

// Zones to Neural Activity
MATCH (opt:TherapyConcept {id: "wot_optimal_zone"}), (cen:FunctionalNetwork {id: "cen"})
MERGE (opt)-[:ACTIVATES]->(cen);

MATCH (opt:TherapyConcept {id: "wot_optimal_zone"}), (mpfc:BrainStructure {id: "mpfc"})
MERGE (opt)-[:ENGAGES]->(mpfc);

MATCH (hyper:TherapyConcept {id: "wot_hyperarousal"}), (amyg:BrainStructure {id: "amygdala"})
MERGE (hyper)-[:ACTIVATES]->(amyg);

MATCH (hyper:TherapyConcept {id: "wot_hyperarousal"}), (pfc:BrainStructure {id: "pfc"})
MERGE (hyper)-[:DEACTIVATES]->(pfc);

MATCH (hypo:TherapyConcept {id: "wot_hypoarousal"}), (thal:BrainStructure {id: "thalamus"})
MERGE (hypo)-[:DEACTIVATES]->(thal);

// Zones to Emotions
MATCH (opt:TherapyConcept {id: "wot_optimal_zone"}), (cur:Emotion {id: "curiosity"})
MERGE (opt)-[:ENABLES]->(cur);

MATCH (opt:TherapyConcept {id: "wot_optimal_zone"}), (calm:Emotion {id: "calm"})
MERGE (opt)-[:ENABLES]->(calm);

MATCH (hyper:TherapyConcept {id: "wot_hyperarousal"}), (panic:Emotion {id: "panic"})
MERGE (hyper)-[:ASSOCIATED_WITH]->(panic);

MATCH (hyper:TherapyConcept {id: "wot_hyperarousal"}), (anger:Emotion {id: "anger"})
MERGE (hyper)-[:ASSOCIATED_WITH]->(anger);

MATCH (hypo:TherapyConcept {id: "wot_hypoarousal"}), (numb:Emotion {id: "numbness"})
MERGE (hypo)-[:ASSOCIATED_WITH]->(numb);

MATCH (hypo:TherapyConcept {id: "wot_hypoarousal"}), (diss:ClinicalConstruct {id: "dissociation"})
MERGE (hypo)-[:ASSOCIATED_WITH]->(diss);

// Window of Tolerance as container
MATCH (wot:TherapyConcept {id: "window_of_tolerance"}), (opt:TherapyConcept {id: "wot_optimal_zone"})
MERGE (opt)-[:PART_OF]->(wot);

MATCH (wot:TherapyConcept {id: "window_of_tolerance"}), (hyper:TherapyConcept {id: "wot_hyperarousal"})
MERGE (hyper)-[:PART_OF]->(wot);

MATCH (wot:TherapyConcept {id: "window_of_tolerance"}), (hypo:TherapyConcept {id: "wot_hypoarousal"})
MERGE (hypo)-[:PART_OF]->(wot);

MATCH (wot:TherapyConcept {id: "window_of_tolerance"}), (ff:TherapyConcept {id: "wot_frozen_flight"})
MERGE (ff)-[:PART_OF]->(wot);


// ============================================================
// EMDR CONSOLIDATION MECHANISM RELATIONSHIPS
// ============================================================

MATCH (consol:TherapyConcept {id: "emdr_consolidation"}), (aip:TherapyConcept {id: "emdr_aip"})
MERGE (consol)-[:MECHANISM_OF]->(aip);

MATCH (gamma:TherapyConcept {id: "emdr_gamma"}), (consol:TherapyConcept {id: "emdr_consolidation"})
MERGE (gamma)-[:MEDIATES]->(consol);

MATCH (recon:TherapyConcept {id: "emdr_reconsolidation"}), (consol:TherapyConcept {id: "emdr_consolidation"})
MERGE (recon)-[:ENABLES]->(consol);

// Consolidation to Brain Structures
MATCH (consol:TherapyConcept {id: "emdr_consolidation"}), (hippo:BrainStructure {id: "hippocampus"})
MERGE (consol)-[r:INVOLVES]->(hippo)
SET r += {role: "source"};

MATCH (consol:TherapyConcept {id: "emdr_consolidation"}), (amyg:BrainStructure {id: "amygdala"})
MERGE (consol)-[r:INVOLVES]->(amyg)
SET r += {role: "unbinding_from"};

MATCH (consol:TherapyConcept {id: "emdr_consolidation"}), (mpfc:BrainStructure {id: "mpfc"})
MERGE (consol)-[r:INVOLVES]->(mpfc)
SET r += {role: "linking_to"};

// Gamma oscillations to memory consolidation
MATCH (gamma:TherapyConcept {id: "emdr_gamma"}), (mc:Function {id: "memory_consolidation"})
MERGE (gamma)-[:MODULATES]->(mc);

// EMDR modality connections
MATCH (consol:TherapyConcept {id: "emdr_consolidation"}), (emdr:TherapyModality {id: "emdr"})
MERGE (consol)-[:BELONGS_TO]->(emdr);

MATCH (gamma:TherapyConcept {id: "emdr_gamma"}), (emdr:TherapyModality {id: "emdr"})
MERGE (gamma)-[:BELONGS_TO]->(emdr);

MATCH (recon:TherapyConcept {id: "emdr_reconsolidation"}), (emdr:TherapyModality {id: "emdr"})
MERGE (recon)-[:BELONGS_TO]->(emdr);


// ============================================================
// SE-SPECIFIC NEURAL MAPPINGS
// ============================================================

// Titration to mPFC-Amygdala modulation
MATCH (tit:TherapyConcept {id: "se_titration"}), (mpfc:BrainStructure {id: "mpfc"})
MERGE (tit)-[r:ENGAGES]->(mpfc)
SET r += {mechanism: "maintains mPFC online during trauma processing"};

MATCH (tit:TherapyConcept {id: "se_titration"}), (amyg:BrainStructure {id: "amygdala"})
MERGE (tit)-[r:MODULATES]->(amyg)
SET r += {direction: "prevents_overwhelm"};

// Titration keeps client in Window of Tolerance
MATCH (tit:TherapyConcept {id: "se_titration"}), (opt:TherapyConcept {id: "wot_optimal_zone"})
MERGE (tit)-[:MAINTAINS]->(opt);

// Pendulation to Insula (interoceptive awareness)
MATCH (pend:TherapyConcept {id: "se_pendulation"}), (ins:BrainStructure {id: "insula"})
MERGE (pend)-[r:MEDIATED_BY]->(ins)
SET r += {mechanism: "insular interoceptive awareness"};

// Pendulation to Vagal Brake
MATCH (pend:TherapyConcept {id: "se_pendulation"}), (vb:TherapyConcept {id: "pv_vagal_brake"})
MERGE (pend)-[:UTILIZES]->(vb);

// Pendulation to Salience Network
MATCH (pend:TherapyConcept {id: "se_pendulation"}), (sn:FunctionalNetwork {id: "salience_network"})
MERGE (pend)-[:REWIRES]->(sn);

// Resourcing to Reward System
MATCH (res:TherapyConcept {id: "se_resourcing"}), (nacc:BrainStructure {id: "nucleus_accumbens"})
MERGE (res)-[:ACTIVATES]->(nacc);

MATCH (res:TherapyConcept {id: "se_resourcing"}), (oxy:NeurochemicalSystem {id: "oxytocin"})
MERGE (res)-[:PROMOTES]->(oxy);

// Discharge to Motor System
MATCH (disch:TherapyConcept {id: "se_discharge"}), (mc:BrainStructure {id: "motor_cortex"})
MERGE (disch)-[r:INVOLVES]->(mc)
SET r += {mechanism: "motor system completion"};

// Felt Sense to Interoception
MATCH (fs:TherapyConcept {id: "se_felt_sense"}), (int:Function {id: "interoception"})
MERGE (fs)-[:ENGAGES]->(int);

MATCH (fs:TherapyConcept {id: "se_felt_sense"}), (ai:BrainStructure {id: "anterior_insula"})
MERGE (fs)-[:PRIMARY_CIRCUIT]->(ai);


// ============================================================
// SHAME/GUILT NEURAL SIGNATURE RELATIONSHIPS
// ============================================================

// Shame Neural Signature connections
MATCH (sns:NeuralSignature {id: "shame_neural"}), (dlpfc:BrainStructure {id: "dlpfc"})
MERGE (sns)-[:PRIMARY_HUB]->(dlpfc);

MATCH (sns:NeuralSignature {id: "shame_neural"}), (pcc:BrainStructure {id: "pcc"})
MERGE (sns)-[:PRIMARY_HUB]->(pcc);

MATCH (sns:NeuralSignature {id: "shame_neural"}), (dacc:BrainStructure {id: "dacc"})
MERGE (sns)-[:PRIMARY_HUB]->(dacc);

MATCH (sns:NeuralSignature {id: "shame_neural"}), (sc:BrainStructure {id: "somatosensory_cortex"})
MERGE (sns)-[:PRIMARY_HUB]->(sc);

MATCH (sns:NeuralSignature {id: "shame_neural"}), (amyg:BrainStructure {id: "amygdala"})
MERGE (sns)-[r:SUBCORTICAL_ACTIVATION]->(amyg)
SET r += {finding: "hypersensitivity in MDD"};

MATCH (sns:NeuralSignature {id: "shame_neural"}), (pi:BrainStructure {id: "posterior_insula"})
MERGE (sns)-[:SUBCORTICAL_ACTIVATION]->(pi);

// Link shame neural signature to shame emotions
MATCH (sns:NeuralSignature {id: "shame_neural"}), (hs:Emotion {id: "hot_shame"})
MERGE (sns)-[:SIGNATURE_OF]->(hs);

MATCH (sns:NeuralSignature {id: "shame_neural"}), (cs:Emotion {id: "cold_shame"})
MERGE (sns)-[:SIGNATURE_OF]->(cs);

// Guilt Neural Signature connections
MATCH (gns:NeuralSignature {id: "guilt_neural"}), (tpj:BrainStructure {id: "tpj"})
MERGE (gns)-[r:PRIMARY_HUB]->(tpj)
SET r += {function: "theory of mind, other perspective"};

MATCH (gns:NeuralSignature {id: "guilt_neural"}), (atl:BrainStructure {id: "atl"})
MERGE (gns)-[r:PRIMARY_HUB]->(atl)
SET r += {function: "social semantic knowledge"};

MATCH (gns:NeuralSignature {id: "guilt_neural"}), (mpfc:BrainStructure {id: "mpfc"})
MERGE (gns)-[:PRIMARY_HUB]->(mpfc);

// Shared core for both shame and guilt
MATCH (gns:NeuralSignature {id: "guilt_neural"}), (ai:BrainStructure {id: "anterior_insula"})
MERGE (gns)-[r:SHARED_CORE]->(ai)
SET r += {notes: "emotional awareness"};

MATCH (gns:NeuralSignature {id: "guilt_neural"}), (dacc:BrainStructure {id: "dacc"})
MERGE (gns)-[r:SHARED_CORE]->(dacc)
SET r += {notes: "negative affect/conflict"};

// Link guilt neural signature to guilt emotion
MATCH (gns:NeuralSignature {id: "guilt_neural"}), (guilt:Emotion {id: "guilt"})
MERGE (gns)-[:SIGNATURE_OF]->(guilt);

// Social Pain signature connections
MATCH (sp:NeuralSignature {id: "social_pain_neural"}), (dacc:BrainStructure {id: "dacc"})
MERGE (sp)-[:PRIMARY_HUB]->(dacc);

MATCH (sp:NeuralSignature {id: "social_pain_neural"}), (ai:BrainStructure {id: "anterior_insula"})
MERGE (sp)-[:PRIMARY_HUB]->(ai);

MATCH (sp:NeuralSignature {id: "social_pain_neural"}), (thal:BrainStructure {id: "thalamus"})
MERGE (sp)-[:PRIMARY_HUB]->(thal);

MATCH (sp:NeuralSignature {id: "social_pain_neural"}), (rej:Emotion {id: "rejection"})
MERGE (sp)-[:SIGNATURE_OF]->(rej);


// ============================================================
// CPT NEURAL DISSOCIATION RELATIONSHIPS
// ============================================================

MATCH (ret:TherapyConcept {id: "cpt_retrieval"}), (dlpfc:BrainStructure {id: "dlpfc"})
MERGE (ret)-[r:NEURAL_HUB]->(dlpfc)
SET r += {side: "left", brodmann_area: "9/46"};

MATCH (ctrl:TherapyConcept {id: "cpt_control"}), (acc:BrainStructure {id: "acc"})
MERGE (ctrl)-[r:NEURAL_HUB]->(acc)
SET r += {side: "left", brodmann_area: "24/32"};

// CPT concepts belong to CPT modality
MATCH (ret:TherapyConcept {id: "cpt_retrieval"}), (cpt:TherapyModality {id: "cpt"})
MERGE (ret)-[:BELONGS_TO]->(cpt);

MATCH (ctrl:TherapyConcept {id: "cpt_control"}), (cpt:TherapyModality {id: "cpt"})
MERGE (ctrl)-[:BELONGS_TO]->(cpt);

// Link to stuck points
MATCH (ret:TherapyConcept {id: "cpt_retrieval"}), (sp:TherapyConcept {id: "cpt_stuck_point"})
MERGE (ret)-[:ADDRESSES]->(sp);

MATCH (ctrl:TherapyConcept {id: "cpt_control"}), (sp:TherapyConcept {id: "cpt_stuck_point"})
MERGE (ctrl)-[:ADDRESSES]->(sp);


// ============================================================
// IFS SELF NEURAL MAPPINGS (Enhanced)
// ============================================================

// Self to mPFC (primary hub)
MATCH (self:TherapyConcept {id: "ifs_self"}), (mpfc:BrainStructure {id: "mpfc"})
MERGE (self)-[r:NEURAL_HUB]->(mpfc)
SET r += {mechanism: "metacognitive magic, balances neurochemicals"};

// Self to neurochemicals
MATCH (self:TherapyConcept {id: "ifs_self"}), (ser:NeurochemicalSystem {id: "serotonin"})
MERGE (self)-[r:ASSOCIATED_WITH]->(ser)
SET r += {role: "calm stabilizer"};

MATCH (self:TherapyConcept {id: "ifs_self"}), (oxy:NeurochemicalSystem {id: "oxytocin"})
MERGE (self)-[r:ASSOCIATED_WITH]->(oxy)
SET r += {role: "trust between Self and parts"};

// Self inhibits amygdala
MATCH (self:TherapyConcept {id: "ifs_self"}), (amyg:BrainStructure {id: "amygdala"})
MERGE (self)-[r:INHIBITS]->(amyg)
SET r += {mechanism: "inhibitory signals quiet alarm system"};

// Unblending engages mPFC-ACC axis
MATCH (unb:TherapyConcept {id: "ifs_unblending"}), (mpfc:BrainStructure {id: "mpfc"})
MERGE (unb)-[:ACTIVATES]->(mpfc);

MATCH (unb:TherapyConcept {id: "ifs_unblending"}), (acc:BrainStructure {id: "acc"})
MERGE (unb)-[r:ACTIVATES]->(acc)
SET r += {role: "conflict manager, releases serotonin"};


// ============================================================
// ATL (ANTERIOR TEMPORAL LOBE) RELATIONSHIPS
// ============================================================

MATCH (atl:BrainStructure {id: "atl"}), (sc:Function {id: "social_cognition"})
MERGE (atl)-[r:IMPLICATED_IN]->(sc)
SET r += {role: "social semantic knowledge"};

MATCH (atl:BrainStructure {id: "atl"}), (tc:BrainStructure {id: "temporal_cortex"})
MERGE (atl)-[:PART_OF]->(tc);


// ============================================================
// FEAR EXTINCTION ENHANCED RELATIONSHIPS
// Per expert: vmPFC as human homologue of rodent infralimbic cortex
// ============================================================

MATCH (vmpfc:BrainStructure {id: "vmpfc"}), (fe:Function {id: "fear_extinction"})
MERGE (vmpfc)-[r:HOMOLOGUE_OF]->(fe)
SET r += {rodent_structure: "infralimbic cortex", evidence: "translational research"};

MATCH (fe:Function {id: "fear_extinction"}), (da:NeurochemicalSystem {id: "dopamine"})
MERGE (fe)-[r:MEDIATED_BY]->(da)
SET r += {role: "reward learning"};

MATCH (fe:Function {id: "fear_extinction"}), (hippo:BrainStructure {id: "hippocampus"})
MERGE (fe)-[:CONTEXT_DEPENDENT_ON]->(hippo);

MATCH (fe:Function {id: "fear_extinction"}), (cereb:BrainStructure {id: "cerebellum"})
MERGE (fe)-[:INVOLVES]->(cereb);


// ============================================================
// ACTIVATION PATTERN LAYER RELATIONSHIPS
// Source: Goblin DBT Neural Activation Pattern Definitions
// Synthesized Expert Deliverable (February 2026)
// ============================================================


// ============================================================
// NEW BRAIN STRUCTURE HIERARCHY
// ============================================================

MATCH (dlpag:BrainStructure {id: "dlpag"}), (pag:BrainStructure {id: "pag"})
MERGE (dlpag)-[:PART_OF]->(pag);

MATCH (vlpag:BrainStructure {id: "vlpag"}), (pag:BrainStructure {id: "pag"})
MERGE (vlpag)-[:PART_OF]->(pag);

MATCH (dorsal:BrainStructure {id: "dorsal_striatum"}), (bg:BrainStructure {id: "basal_ganglia"})
MERGE (dorsal)-[:PART_OF]->(bg);

MATCH (precuneus:BrainStructure {id: "precuneus"}), (dmn:FunctionalNetwork {id: "dmn"})
MERGE (precuneus)-[:PARTICIPATES_IN]->(dmn);


// ============================================================
// PATTERN 1: ACUTE ALARM - INVOLVES RELATIONSHIPS
// ============================================================

MATCH (p:ActivationPattern {id: "acute_alarm"}), (b:BrainStructure {id: "amygdala"})
MERGE (p)-[r:INVOLVES]->(b)
SET r += {direction: "overactive", evidenceGrade: "Strong"};

MATCH (p:ActivationPattern {id: "acute_alarm"}), (b:BrainStructure {id: "anterior_insula"})
MERGE (p)-[r:INVOLVES]->(b)
SET r += {direction: "overactive", evidenceGrade: "Strong"};

MATCH (p:ActivationPattern {id: "acute_alarm"}), (b:BrainStructure {id: "dacc"})
MERGE (p)-[r:INVOLVES]->(b)
SET r += {direction: "overactive", evidenceGrade: "Strong"};

MATCH (p:ActivationPattern {id: "acute_alarm"}), (b:BrainStructure {id: "locus_coeruleus"})
MERGE (p)-[r:INVOLVES]->(b)
SET r += {direction: "overactive", evidenceGrade: "Strong", role: "arousal_amplifier"};

MATCH (p:ActivationPattern {id: "acute_alarm"}), (b:BrainStructure {id: "bnst"})
MERGE (p)-[r:INVOLVES]->(b)
SET r += {direction: "overactive", evidenceGrade: "Strong", conditional: "increases with sustained/uncertain threat"};

MATCH (p:ActivationPattern {id: "acute_alarm"}), (b:BrainStructure {id: "dlpfc"})
MERGE (p)-[r:INVOLVES]->(b)
SET r += {direction: "suppressed", evidenceGrade: "Strong"};

MATCH (p:ActivationPattern {id: "acute_alarm"}), (b:BrainStructure {id: "vmpfc"})
MERGE (p)-[r:INVOLVES]->(b)
SET r += {direction: "suppressed", evidenceGrade: "Strong"};

MATCH (p:ActivationPattern {id: "acute_alarm"}), (b:BrainStructure {id: "hippocampus"})
MERGE (p)-[r:INVOLVES]->(b)
SET r += {direction: "suppressed", evidenceGrade: "Strong", notes: "contextual safety signaling less effective"};


// ============================================================
// PATTERN 2: CHRONIC VIGILANCE - INVOLVES RELATIONSHIPS
// ============================================================

MATCH (p:ActivationPattern {id: "chronic_vigilance"}), (b:BrainStructure {id: "bnst"})
MERGE (p)-[r:INVOLVES]->(b)
SET r += {direction: "overactive", evidenceGrade: "Strong", role: "primary_driver"};

MATCH (p:ActivationPattern {id: "chronic_vigilance"}), (b:BrainStructure {id: "amygdala"})
MERGE (p)-[r:INVOLVES]->(b)
SET r += {direction: "overactive", evidenceGrade: "Strong", role: "sustained_support"};

MATCH (p:ActivationPattern {id: "chronic_vigilance"}), (b:BrainStructure {id: "ips"})
MERGE (p)-[r:INVOLVES]->(b)
SET r += {direction: "overactive", evidenceGrade: "Strong", network: "DAN"};

MATCH (p:ActivationPattern {id: "chronic_vigilance"}), (b:BrainStructure {id: "fef"})
MERGE (p)-[r:INVOLVES]->(b)
SET r += {direction: "overactive", evidenceGrade: "Strong", network: "DAN"};

MATCH (p:ActivationPattern {id: "chronic_vigilance"}), (b:BrainStructure {id: "locus_coeruleus"})
MERGE (p)-[r:INVOLVES]->(b)
SET r += {direction: "overactive", evidenceGrade: "Strong", role: "tonic_arousal"};


// ============================================================
// PATTERN 3: EMOTIONAL FLOODING - INVOLVES RELATIONSHIPS
// ============================================================

MATCH (p:ActivationPattern {id: "emotional_flooding"}), (b:BrainStructure {id: "amygdala"})
MERGE (p)-[r:INVOLVES]->(b)
SET r += {direction: "overactive", evidenceGrade: "Strong"};

MATCH (p:ActivationPattern {id: "emotional_flooding"}), (b:BrainStructure {id: "anterior_insula"})
MERGE (p)-[r:INVOLVES]->(b)
SET r += {direction: "overactive", evidenceGrade: "Strong"};

MATCH (p:ActivationPattern {id: "emotional_flooding"}), (b:BrainStructure {id: "dacc"})
MERGE (p)-[r:INVOLVES]->(b)
SET r += {direction: "overactive", evidenceGrade: "Strong"};

MATCH (p:ActivationPattern {id: "emotional_flooding"}), (b:BrainStructure {id: "dlpag"})
MERGE (p)-[r:INVOLVES]->(b)
SET r += {direction: "overactive", evidenceGrade: "Moderate", role: "active_defense_component"};

MATCH (p:ActivationPattern {id: "emotional_flooding"}), (b:BrainStructure {id: "dlpfc"})
MERGE (p)-[r:INVOLVES]->(b)
SET r += {direction: "suppressed", evidenceGrade: "Strong", notes: "essentially_offline"};

MATCH (p:ActivationPattern {id: "emotional_flooding"}), (b:BrainStructure {id: "ofc"})
MERGE (p)-[r:INVOLVES]->(b)
SET r += {direction: "suppressed", evidenceGrade: "Moderate-Strong", role: "key_differentiator"};

MATCH (p:ActivationPattern {id: "emotional_flooding"}), (b:BrainStructure {id: "vmpfc"})
MERGE (p)-[r:INVOLVES]->(b)
SET r += {direction: "suppressed", evidenceGrade: "Strong"};


// ============================================================
// PATTERN 4: CONSERVATION/FREEZE - INVOLVES RELATIONSHIPS
// ============================================================

MATCH (p:ActivationPattern {id: "conservation_freeze"}), (b:BrainStructure {id: "vlpag"})
MERGE (p)-[r:INVOLVES]->(b)
SET r += {direction: "overactive", evidenceGrade: "Moderate", role: "passive_defense_coordinator"};

MATCH (p:ActivationPattern {id: "conservation_freeze"}), (b:BrainStructure {id: "thalamus"})
MERGE (p)-[r:INVOLVES]->(b)
SET r += {direction: "suppressed", evidenceGrade: "Moderate", role: "sensory_relay_reduced"};

MATCH (p:ActivationPattern {id: "conservation_freeze"}), (b:BrainStructure {id: "motor_cortex"})
MERGE (p)-[r:INVOLVES]->(b)
SET r += {direction: "suppressed", evidenceGrade: "Moderate"};


// ============================================================
// PATTERN 5: DISSOCIATION/OVERMODULATION - INVOLVES RELATIONSHIPS
// ============================================================

MATCH (p:ActivationPattern {id: "dissociation_overmodulation"}), (b:BrainStructure {id: "vmpfc"})
MERGE (p)-[r:INVOLVES]->(b)
SET r += {direction: "overactive", evidenceGrade: "Strong", role: "over_inhibitory_control"};

MATCH (p:ActivationPattern {id: "dissociation_overmodulation"}), (b:BrainStructure {id: "pcc"})
MERGE (p)-[r:INVOLVES]->(b)
SET r += {direction: "overactive", evidenceGrade: "Strong", notes: "depersonalization"};

MATCH (p:ActivationPattern {id: "dissociation_overmodulation"}), (b:BrainStructure {id: "precuneus"})
MERGE (p)-[r:INVOLVES]->(b)
SET r += {direction: "overactive", evidenceGrade: "Strong", notes: "depersonalization"};

MATCH (p:ActivationPattern {id: "dissociation_overmodulation"}), (b:BrainStructure {id: "amygdala"})
MERGE (p)-[r:INVOLVES]->(b)
SET r += {direction: "suppressed", evidenceGrade: "Strong", notes: "emotional_numbing_via_top_down"};

MATCH (p:ActivationPattern {id: "dissociation_overmodulation"}), (b:BrainStructure {id: "thalamus"})
MERGE (p)-[r:INVOLVES]->(b)
SET r += {direction: "suppressed", evidenceGrade: "Moderate"};


// ============================================================
// PATTERN 6: RUMINATION LOOP - INVOLVES RELATIONSHIPS
// ============================================================

MATCH (p:ActivationPattern {id: "rumination_loop"}), (b:BrainStructure {id: "mpfc"})
MERGE (p)-[r:INVOLVES]->(b)
SET r += {direction: "overactive", evidenceGrade: "Strong", role: "DMN_core"};

MATCH (p:ActivationPattern {id: "rumination_loop"}), (b:BrainStructure {id: "pcc"})
MERGE (p)-[r:INVOLVES]->(b)
SET r += {direction: "overactive", evidenceGrade: "Strong", role: "DMN_core"};

MATCH (p:ActivationPattern {id: "rumination_loop"}), (b:BrainStructure {id: "precuneus"})
MERGE (p)-[r:INVOLVES]->(b)
SET r += {direction: "overactive", evidenceGrade: "Strong", role: "DMN_core"};

MATCH (p:ActivationPattern {id: "rumination_loop"}), (b:BrainStructure {id: "vacc"})
MERGE (p)-[r:INVOLVES]->(b)
SET r += {direction: "overactive", evidenceGrade: "Strong", role: "affective_coloring", notes: "sgACC coupling creates caustic compound with DMN"};

MATCH (p:ActivationPattern {id: "rumination_loop"}), (b:BrainStructure {id: "dlpfc"})
MERGE (p)-[r:INVOLVES]->(b)
SET r += {direction: "suppressed", evidenceGrade: "Strong", conditional: "stronger in depressive rumination; variable in anxious worry"};

MATCH (p:ActivationPattern {id: "rumination_loop"}), (b:BrainStructure {id: "hippocampus"})
MERGE (p)-[r:INVOLVES]->(b)
SET r += {direction: "suppressed", evidenceGrade: "Strong"};


// ============================================================
// PATTERN 7: REWARD DRIVE LOW - INVOLVES RELATIONSHIPS
// ============================================================

MATCH (p:ActivationPattern {id: "reward_drive_low"}), (b:BrainStructure {id: "vacc"})
MERGE (p)-[r:INVOLVES]->(b)
SET r += {direction: "overactive", evidenceGrade: "Moderate", role: "overlap_with_rumination", confidence: "low"};

MATCH (p:ActivationPattern {id: "reward_drive_low"}), (b:BrainStructure {id: "nucleus_accumbens"})
MERGE (p)-[r:INVOLVES]->(b)
SET r += {direction: "suppressed", evidenceGrade: "Strong", notes: "blunted_reactivity"};

MATCH (p:ActivationPattern {id: "reward_drive_low"}), (b:BrainStructure {id: "vta"})
MERGE (p)-[r:INVOLVES]->(b)
SET r += {direction: "suppressed", evidenceGrade: "Strong", notes: "DA_signaling_reduced"};

MATCH (p:ActivationPattern {id: "reward_drive_low"}), (b:BrainStructure {id: "dorsal_striatum"})
MERGE (p)-[r:INVOLVES]->(b)
SET r += {direction: "suppressed", evidenceGrade: "Moderate", notes: "goal_initiation"};


// ============================================================
// PATTERN 8: SOCIAL THREAT/SHAME - INVOLVES RELATIONSHIPS
// ============================================================

MATCH (p:ActivationPattern {id: "social_threat_shame"}), (b:BrainStructure {id: "dacc"})
MERGE (p)-[r:INVOLVES]->(b)
SET r += {direction: "overactive", evidenceGrade: "Strong", role: "social_pain_alarm"};

MATCH (p:ActivationPattern {id: "social_threat_shame"}), (b:BrainStructure {id: "anterior_insula"})
MERGE (p)-[r:INVOLVES]->(b)
SET r += {direction: "overactive", evidenceGrade: "Strong"};

MATCH (p:ActivationPattern {id: "social_threat_shame"}), (b:BrainStructure {id: "mpfc"})
MERGE (p)-[r:INVOLVES]->(b)
SET r += {direction: "overactive", evidenceGrade: "Strong", role: "self_evaluation"};

MATCH (p:ActivationPattern {id: "social_threat_shame"}), (b:BrainStructure {id: "tpj"})
MERGE (p)-[r:INVOLVES]->(b)
SET r += {direction: "overactive", evidenceGrade: "Moderate", role: "mentalizing_guilt_specific"};

MATCH (p:ActivationPattern {id: "social_threat_shame"}), (b:BrainStructure {id: "premotor_cortex"})
MERGE (p)-[r:INVOLVES]->(b)
SET r += {direction: "overactive", evidenceGrade: "Moderate", role: "behavioral_inhibition_hide"};

MATCH (p:ActivationPattern {id: "social_threat_shame"}), (b:BrainStructure {id: "ifg"})
MERGE (p)-[r:INVOLVES]->(b)
SET r += {direction: "overactive", evidenceGrade: "Moderate", role: "behavioral_inhibition_hide"};

MATCH (p:ActivationPattern {id: "social_threat_shame"}), (b:BrainStructure {id: "vmpfc"})
MERGE (p)-[r:INVOLVES]->(b)
SET r += {direction: "suppressed", evidenceGrade: "Strong", conditional: "state-dependent, not a fixed deficit"};

MATCH (p:ActivationPattern {id: "social_threat_shame"}), (b:BrainStructure {id: "pcc"})
MERGE (p)-[r:INVOLVES]->(b)
SET r += {direction: "suppressed", evidenceGrade: "Moderate", notes: "reduced_in_shame_vs_active_in_guilt"};


// ============================================================
// DOMINANT_NETWORK RELATIONSHIPS
// ============================================================

MATCH (p:ActivationPattern {id: "acute_alarm"}), (n:FunctionalNetwork {id: "salience_network"})
MERGE (p)-[r:DOMINANT_NETWORK]->(n)
SET r += {state: "hyper_engaged", evidenceGrade: "Strong"};

MATCH (p:ActivationPattern {id: "chronic_vigilance"}), (n:FunctionalNetwork {id: "dan"})
MERGE (p)-[r:DOMINANT_NETWORK]->(n)
SET r += {evidenceGrade: "Strong"};

MATCH (p:ActivationPattern {id: "chronic_vigilance"}), (n:FunctionalNetwork {id: "salience_network"})
MERGE (p)-[r:DOMINANT_NETWORK]->(n)
SET r += {evidenceGrade: "Strong"};

MATCH (p:ActivationPattern {id: "emotional_flooding"}), (n:FunctionalNetwork {id: "salience_network"})
MERGE (p)-[r:DOMINANT_NETWORK]->(n)
SET r += {state: "overloaded_high_gain", evidenceGrade: "Strong"};

// conservation_freeze: "Global dampening — no single dominant network" - intentionally no edge

MATCH (p:ActivationPattern {id: "dissociation_overmodulation"}), (n:FunctionalNetwork {id: "dmn"})
MERGE (p)-[r:DOMINANT_NETWORK]->(n)
SET r += {state: "altered", evidenceGrade: "Strong"};

MATCH (p:ActivationPattern {id: "rumination_loop"}), (n:FunctionalNetwork {id: "dmn"})
MERGE (p)-[r:DOMINANT_NETWORK]->(n)
SET r += {state: "dominant_with_altered_CEN_coupling", evidenceGrade: "Strong"};


// ============================================================
// PATTERN -> EMOTION ASSOCIATIONS
// ============================================================

// Acute Alarm emotions
MATCH (p:ActivationPattern {id: "acute_alarm"}), (e:Emotion {id: "anxiety"})
MERGE (p)-[r:ASSOCIATED_WITH]->(e)
SET r += {strength: "strong"};

MATCH (p:ActivationPattern {id: "acute_alarm"}), (e:Emotion {id: "panic"})
MERGE (p)-[r:ASSOCIATED_WITH]->(e)
SET r += {strength: "strong"};

MATCH (p:ActivationPattern {id: "acute_alarm"}), (e:Emotion {id: "overwhelm"})
MERGE (p)-[r:ASSOCIATED_WITH]->(e)
SET r += {strength: "strong"};

MATCH (p:ActivationPattern {id: "acute_alarm"}), (e:Emotion {id: "fear"})
MERGE (p)-[r:ASSOCIATED_WITH]->(e)
SET r += {strength: "strong"};

// Chronic Vigilance emotions
MATCH (p:ActivationPattern {id: "chronic_vigilance"}), (e:Emotion {id: "anxiety"})
MERGE (p)-[r:ASSOCIATED_WITH]->(e)
SET r += {strength: "strong", quality: "watchful"};

MATCH (p:ActivationPattern {id: "chronic_vigilance"}), (e:Emotion {id: "stress"})
MERGE (p)-[r:ASSOCIATED_WITH]->(e)
SET r += {strength: "strong"};

// Emotional Flooding emotions
MATCH (p:ActivationPattern {id: "emotional_flooding"}), (e:Emotion {id: "overwhelm"})
MERGE (p)-[r:ASSOCIATED_WITH]->(e)
SET r += {strength: "strong"};

MATCH (p:ActivationPattern {id: "emotional_flooding"}), (e:Emotion {id: "anger"})
MERGE (p)-[r:ASSOCIATED_WITH]->(e)
SET r += {strength: "moderate", quality: "explosive"};

MATCH (p:ActivationPattern {id: "emotional_flooding"}), (e:Emotion {id: "sadness"})
MERGE (p)-[r:ASSOCIATED_WITH]->(e)
SET r += {strength: "moderate", quality: "cant_stop_crying"};

// Conservation/Freeze emotions
MATCH (p:ActivationPattern {id: "conservation_freeze"}), (e:Emotion {id: "numbness"})
MERGE (p)-[r:ASSOCIATED_WITH]->(e)
SET r += {strength: "strong"};

MATCH (p:ActivationPattern {id: "conservation_freeze"}), (e:Emotion {id: "emptiness"})
MERGE (p)-[r:ASSOCIATED_WITH]->(e)
SET r += {strength: "strong"};

// Dissociation emotions
MATCH (p:ActivationPattern {id: "dissociation_overmodulation"}), (e:Emotion {id: "numbness"})
MERGE (p)-[r:ASSOCIATED_WITH]->(e)
SET r += {strength: "strong", quality: "numb_but_alert"};

// Rumination Loop emotions
MATCH (p:ActivationPattern {id: "rumination_loop"}), (e:Emotion {id: "sadness"})
MERGE (p)-[r:ASSOCIATED_WITH]->(e)
SET r += {strength: "strong", subtype: "depressive_brooding"};

MATCH (p:ActivationPattern {id: "rumination_loop"}), (e:Emotion {id: "anxiety"})
MERGE (p)-[r:ASSOCIATED_WITH]->(e)
SET r += {strength: "moderate", subtype: "anxious_worry"};

MATCH (p:ActivationPattern {id: "rumination_loop"}), (e:Emotion {id: "guilt"})
MERGE (p)-[r:ASSOCIATED_WITH]->(e)
SET r += {strength: "moderate"};

// Reward Drive Low emotions
MATCH (p:ActivationPattern {id: "reward_drive_low"}), (e:Emotion {id: "boredom"})
MERGE (p)-[r:ASSOCIATED_WITH]->(e)
SET r += {strength: "strong"};

MATCH (p:ActivationPattern {id: "reward_drive_low"}), (e:Emotion {id: "emptiness"})
MERGE (p)-[r:ASSOCIATED_WITH]->(e)
SET r += {strength: "strong"};

// Social Threat/Shame emotions
MATCH (p:ActivationPattern {id: "social_threat_shame"}), (e:Emotion {id: "hot_shame"})
MERGE (p)-[r:ASSOCIATED_WITH]->(e)
SET r += {strength: "strong"};

MATCH (p:ActivationPattern {id: "social_threat_shame"}), (e:Emotion {id: "cold_shame"})
MERGE (p)-[r:ASSOCIATED_WITH]->(e)
SET r += {strength: "strong"};

MATCH (p:ActivationPattern {id: "social_threat_shame"}), (e:Emotion {id: "guilt"})
MERGE (p)-[r:ASSOCIATED_WITH]->(e)
SET r += {strength: "strong", subtype: "guilt"};

MATCH (p:ActivationPattern {id: "social_threat_shame"}), (e:Emotion {id: "rejection"})
MERGE (p)-[r:ASSOCIATED_WITH]->(e)
SET r += {strength: "strong", subtype: "social_rejection"};


// ============================================================
// MODULATED_BY RELATIONSHIPS
// State modulators affect pattern intensity and tool selection
// ============================================================

// Sleep Loss affects arousal-related patterns
MATCH (p:ActivationPattern {id: "acute_alarm"}), (m:StateModulator {id: "sleep_loss_sensitization"})
MERGE (p)-[r:MODULATED_BY]->(m)
SET r += {effect: "amplifies_pattern", toolSequencingChange: "address_sleep_first"};

MATCH (p:ActivationPattern {id: "chronic_vigilance"}), (m:StateModulator {id: "sleep_loss_sensitization"})
MERGE (p)-[r:MODULATED_BY]->(m)
SET r += {effect: "amplifies_pattern", toolSequencingChange: "address_sleep_first"};

MATCH (p:ActivationPattern {id: "emotional_flooding"}), (m:StateModulator {id: "sleep_loss_sensitization"})
MERGE (p)-[r:MODULATED_BY]->(m)
SET r += {effect: "amplifies_pattern", toolSequencingChange: "address_sleep_first"};

MATCH (p:ActivationPattern {id: "rumination_loop"}), (m:StateModulator {id: "sleep_loss_sensitization"})
MERGE (p)-[r:MODULATED_BY]->(m)
SET r += {effect: "amplifies_pattern", toolSequencingChange: "address_sleep_first"};

MATCH (p:ActivationPattern {id: "social_threat_shame"}), (m:StateModulator {id: "sleep_loss_sensitization"})
MERGE (p)-[r:MODULATED_BY]->(m)
SET r += {effect: "amplifies_pattern", toolSequencingChange: "address_sleep_first"};

// Acute Stress affects prefrontal-dependent patterns
MATCH (p:ActivationPattern {id: "acute_alarm"}), (m:StateModulator {id: "acute_stress_catecholamine"})
MERGE (p)-[r:MODULATED_BY]->(m)
SET r += {effect: "degrades_top_down_control", toolSequencingChange: "reduce_stress_before_cognitive_tools"};

MATCH (p:ActivationPattern {id: "emotional_flooding"}), (m:StateModulator {id: "acute_stress_catecholamine"})
MERGE (p)-[r:MODULATED_BY]->(m)
SET r += {effect: "degrades_top_down_control", toolSequencingChange: "reduce_stress_before_cognitive_tools"};

MATCH (p:ActivationPattern {id: "rumination_loop"}), (m:StateModulator {id: "acute_stress_catecholamine"})
MERGE (p)-[r:MODULATED_BY]->(m)
SET r += {effect: "degrades_top_down_control", toolSequencingChange: "reduce_stress_before_cognitive_tools"};

// Interoceptive Threat Bias affects body-signal-sensitive patterns
MATCH (p:ActivationPattern {id: "acute_alarm"}), (m:StateModulator {id: "interoceptive_threat_bias"})
MERGE (p)-[r:MODULATED_BY]->(m)
SET r += {effect: "body_signals_interpreted_as_threats", toolSequencingChange: "interoceptive_recalibration"};

MATCH (p:ActivationPattern {id: "conservation_freeze"}), (m:StateModulator {id: "interoceptive_threat_bias"})
MERGE (p)-[r:MODULATED_BY]->(m)
SET r += {effect: "body_signals_interpreted_as_threats", toolSequencingChange: "interoceptive_recalibration"};

MATCH (p:ActivationPattern {id: "dissociation_overmodulation"}), (m:StateModulator {id: "interoceptive_threat_bias"})
MERGE (p)-[r:MODULATED_BY]->(m)
SET r += {effect: "body_signals_interpreted_as_threats", toolSequencingChange: "interoceptive_recalibration"};


// ============================================================
// TRIGGERS_SAFETY RELATIONSHIPS
// ============================================================

MATCH (p:ActivationPattern {id: "emotional_flooding"}), (s:SafetyFlag {id: "crisis_self_harm"})
MERGE (p)-[r:TRIGGERS_SAFETY]->(s)
SET r += {condition: "out_of_control_with_intent_language", threshold: "immediate"};

MATCH (p:ActivationPattern {id: "dissociation_overmodulation"}), (s:SafetyFlag {id: "crisis_suicidal"})
MERGE (p)-[r:TRIGGERS_SAFETY]->(s)
SET r += {condition: "dissociation_plus_suicidal_ideation", threshold: "immediate"};

MATCH (p:ActivationPattern {id: "dissociation_overmodulation"}), (s:SafetyFlag {id: "clinical_referral_severe_dissociation"})
MERGE (p)-[r:TRIGGERS_SAFETY]->(s)
SET r += {condition: "cannot_orient_to_present", threshold: "immediate"};

MATCH (p:ActivationPattern {id: "conservation_freeze"}), (s:SafetyFlag {id: "clinical_referral_shutdown"})
MERGE (p)-[r:TRIGGERS_SAFETY]->(s)
SET r += {condition: "7_plus_consecutive_days", threshold: "persistent"};

MATCH (p:ActivationPattern {id: "rumination_loop"}), (s:SafetyFlag {id: "crisis_suicidal"})
MERGE (p)-[r:TRIGGERS_SAFETY]->(s)
SET r += {condition: "ruminative_content_involves_suicidal_ideation", threshold: "immediate"};

MATCH (p:ActivationPattern {id: "reward_drive_low"}), (s:SafetyFlag {id: "clinical_referral_shutdown"})
MERGE (p)-[r:TRIGGERS_SAFETY]->(s)
SET r += {condition: "pervasive_anhedonia_multiple_checkins", threshold: "persistent"};


// ============================================================
// CAN_ESCALATE_TO RELATIONSHIPS
// ============================================================

// Social threat can escalate to reactive aggression
MATCH (p1:ActivationPattern {id: "social_threat_shame"}), (p2:ActivationPattern {id: "reactive_aggression"})
MERGE (p1)-[r:CAN_ESCALATE_TO]->(p2)
SET r += {mechanism: "regain_social_status", weight: "weak"};

// Conservation freeze rebound
MATCH (p1:ActivationPattern {id: "conservation_freeze"}), (p2:ActivationPattern {id: "acute_alarm"})
MERGE (p1)-[r:CAN_ESCALATE_TO]->(p2)
SET r += {mechanism: "rebound_from_pulling_out_too_quickly", weight: "moderate"};

// Acute alarm to flooding
MATCH (p1:ActivationPattern {id: "acute_alarm"}), (p2:ActivationPattern {id: "emotional_flooding"})
MERGE (p1)-[r:CAN_ESCALATE_TO]->(p2)
SET r += {mechanism: "regulatory_failure", weight: "moderate"};


// ============================================================
// WINDOW OF TOLERANCE CROSS-REFERENCES
// ============================================================

MATCH (p:ActivationPattern {id: "acute_alarm"}), (wot:TherapyConcept {id: "wot_hyperarousal"})
MERGE (p)-[r:MAPS_TO_WOT_ZONE]->(wot)
SET r += {correspondence: "primary"};

MATCH (p:ActivationPattern {id: "chronic_vigilance"}), (wot:TherapyConcept {id: "wot_hyperarousal"})
MERGE (p)-[r:MAPS_TO_WOT_ZONE]->(wot)
SET r += {correspondence: "primary"};

MATCH (p:ActivationPattern {id: "emotional_flooding"}), (wot:TherapyConcept {id: "wot_hyperarousal"})
MERGE (p)-[r:MAPS_TO_WOT_ZONE]->(wot)
SET r += {correspondence: "extreme"};

MATCH (p:ActivationPattern {id: "conservation_freeze"}), (wot:TherapyConcept {id: "wot_hypoarousal"})
MERGE (p)-[r:MAPS_TO_WOT_ZONE]->(wot)
SET r += {correspondence: "primary"};

MATCH (p:ActivationPattern {id: "conservation_freeze"}), (wot:TherapyConcept {id: "wot_frozen_flight"})
MERGE (p)-[r:MAPS_TO_WOT_ZONE]->(wot)
SET r += {correspondence: "subtype_freeze_high_arousal"};

MATCH (p:ActivationPattern {id: "dissociation_overmodulation"}), (wot:TherapyConcept {id: "wot_hypoarousal"})
MERGE (p)-[r:MAPS_TO_WOT_ZONE]->(wot)
SET r += {correspondence: "distinct_mechanism"};


// ============================================================
// POLYVAGAL STATE CROSS-REFERENCES
// ============================================================

MATCH (p:ActivationPattern {id: "acute_alarm"}), (pv:TherapyConcept {id: "pv_sympathetic"})
MERGE (p)-[r:CORRESPONDS_TO_ANS_STATE]->(pv)
SET r += {evidence: "Strong"};

MATCH (p:ActivationPattern {id: "chronic_vigilance"}), (pv:TherapyConcept {id: "pv_sympathetic"})
MERGE (p)-[r:CORRESPONDS_TO_ANS_STATE]->(pv)
SET r += {evidence: "Strong", notes: "sustained_mobilization"};

MATCH (p:ActivationPattern {id: "emotional_flooding"}), (pv:TherapyConcept {id: "pv_sympathetic"})
MERGE (p)-[r:CORRESPONDS_TO_ANS_STATE]->(pv)
SET r += {evidence: "Strong", notes: "extreme_mobilization"};

// Note: conservation_freeze linked to PAG, NOT "dorsal vagal" per expert consensus
MATCH (p:ActivationPattern {id: "conservation_freeze"}), (pv:TherapyConcept {id: "pv_dorsal_vagal"})
MERGE (p)-[r:CORRESPONDS_TO_ANS_STATE]->(pv)
SET r += {evidence: "Moderate", notes: "use_PAG_centered_framing_not_polyvagal_language", caveat: "polyvagal_framing_contested_4_of_4_experts"};


// ============================================================
// OPPOSITE EMOTION RELATIONSHIPS
// Mapped via Circumplex Model (valence + arousal flip) and
// Action Tendency inversion. Enables programmatic traversal
// for the DBT Opposite Action skill.
// ============================================================

// --- High-Unpleasant <-> Low-Pleasant (arousal flip) ---

MATCH (fear:Emotion {id: "fear"}), (safety:Emotion {id: "safety"})
MERGE (fear)-[:OPPOSITE_OF]->(safety) MERGE (safety)-[:OPPOSITE_OF]->(fear);

MATCH (anxiety:Emotion {id: "anxiety"}), (calm:Emotion {id: "calm"})
MERGE (anxiety)-[:OPPOSITE_OF]->(calm) MERGE (calm)-[:OPPOSITE_OF]->(anxiety);

MATCH (panic:Emotion {id: "panic"}), (serenity:Emotion {id: "serenity"})
MERGE (panic)-[:OPPOSITE_OF]->(serenity) MERGE (serenity)-[:OPPOSITE_OF]->(panic);

MATCH (anger:Emotion {id: "anger"}), (compassion:Emotion {id: "compassion"})
MERGE (anger)-[:OPPOSITE_OF]->(compassion) MERGE (compassion)-[:OPPOSITE_OF]->(anger);

MATCH (stress:Emotion {id: "stress"}), (relief:Emotion {id: "relief"})
MERGE (stress)-[:OPPOSITE_OF]->(relief) MERGE (relief)-[:OPPOSITE_OF]->(stress);

// --- Low-Unpleasant <-> High-Pleasant (arousal flip) ---

MATCH (sadness:Emotion {id: "sadness"}), (joy:Emotion {id: "joy"})
MERGE (sadness)-[:OPPOSITE_OF]->(joy) MERGE (joy)-[:OPPOSITE_OF]->(sadness);

MATCH (hopelessness:Emotion {id: "hopelessness"}), (hope:Emotion {id: "hope"})
MERGE (hopelessness)-[:OPPOSITE_OF]->(hope) MERGE (hope)-[:OPPOSITE_OF]->(hopelessness);

MATCH (loneliness:Emotion {id: "loneliness"}), (love:Emotion {id: "love"})
MERGE (loneliness)-[:OPPOSITE_OF]->(love) MERGE (love)-[:OPPOSITE_OF]->(loneliness);

MATCH (boredom:Emotion {id: "boredom"}), (excitement:Emotion {id: "excitement"})
MERGE (boredom)-[:OPPOSITE_OF]->(excitement) MERGE (excitement)-[:OPPOSITE_OF]->(boredom);

MATCH (emptiness:Emotion {id: "emptiness"}), (contentment:Emotion {id: "contentment"})
MERGE (emptiness)-[:OPPOSITE_OF]->(contentment) MERGE (contentment)-[:OPPOSITE_OF]->(emptiness);

// --- Self-Conscious / Social Emotions ---

MATCH (hot_shame:Emotion {id: "hot_shame"}), (pride:Emotion {id: "pride"})
MERGE (hot_shame)-[:OPPOSITE_OF]->(pride) MERGE (pride)-[:OPPOSITE_OF]->(hot_shame);

MATCH (cold_shame:Emotion {id: "cold_shame"}), (humility:Emotion {id: "humility"})
MERGE (cold_shame)-[:OPPOSITE_OF]->(humility) MERGE (humility)-[:OPPOSITE_OF]->(cold_shame);

MATCH (disgust:Emotion {id: "disgust"}), (gratitude:Emotion {id: "gratitude"})
MERGE (disgust)-[:OPPOSITE_OF]->(gratitude) MERGE (gratitude)-[:OPPOSITE_OF]->(disgust);

MATCH (rejection:Emotion {id: "rejection"}), (trust:Emotion {id: "trust"})
MERGE (rejection)-[:OPPOSITE_OF]->(trust) MERGE (trust)-[:OPPOSITE_OF]->(rejection);

// --- Functional / Cognitive States ---

MATCH (inspiration:Emotion {id: "inspiration"}), (apathy:Emotion {id: "apathy"})
MERGE (inspiration)-[:OPPOSITE_OF]->(apathy) MERGE (apathy)-[:OPPOSITE_OF]->(inspiration);

MATCH (frustration:Emotion {id: "frustration"}), (amusement:Emotion {id: "amusement"})
MERGE (frustration)-[:OPPOSITE_OF]->(amusement) MERGE (amusement)-[:OPPOSITE_OF]->(frustration);


// ============================================================
// MOVED FROM knowledge-graph.cypher (relationships only it declared; A1-4)
// ============================================================

MATCH (bed_nucleus:BrainStructure {id: "bnst"}), (anxiety:Emotion {id: "anxiety"})
MERGE (bed_nucleus)-[r:IMPLICATED_IN]->(anxiety)
SET r += {role: "primary"};
