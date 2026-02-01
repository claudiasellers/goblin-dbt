// ============================================================
// RELATIONSHIPS FILE
// Run AFTER all nodes have been created
// Uses MATCH to find existing nodes by their id property
// ============================================================


// ============================================================
// BRAIN STRUCTURE HIERARCHY
// ============================================================

MATCH (dlpfc:BrainStructure {id: "dlpfc"}), (pfc:BrainStructure {id: "pfc"})
CREATE (dlpfc)-[:PART_OF]->(pfc);

MATCH (vmpfc:BrainStructure {id: "vmpfc"}), (pfc:BrainStructure {id: "pfc"})
CREATE (vmpfc)-[:PART_OF]->(pfc);

MATCH (ofc:BrainStructure {id: "ofc"}), (pfc:BrainStructure {id: "pfc"})
CREATE (ofc)-[:PART_OF]->(pfc);

MATCH (mpfc:BrainStructure {id: "mpfc"}), (pfc:BrainStructure {id: "pfc"})
CREATE (mpfc)-[:PART_OF]->(pfc);

MATCH (dacc:BrainStructure {id: "dacc"}), (acc:BrainStructure {id: "acc"})
CREATE (dacc)-[:PART_OF]->(acc);

MATCH (vacc:BrainStructure {id: "vacc"}), (acc:BrainStructure {id: "acc"})
CREATE (vacc)-[:PART_OF]->(acc);

MATCH (anterior_insula:BrainStructure {id: "anterior_insula"}), (insula:BrainStructure {id: "insula"})
CREATE (anterior_insula)-[:PART_OF]->(insula);

MATCH (posterior_insula:BrainStructure {id: "posterior_insula"}), (insula:BrainStructure {id: "insula"})
CREATE (posterior_insula)-[:PART_OF]->(insula);

MATCH (bla:BrainStructure {id: "bla"}), (amygdala:BrainStructure {id: "amygdala"})
CREATE (bla)-[:PART_OF]->(amygdala);

MATCH (cea:BrainStructure {id: "cea"}), (amygdala:BrainStructure {id: "amygdala"})
CREATE (cea)-[:PART_OF]->(amygdala);

MATCH (nacc:BrainStructure {id: "nucleus_accumbens"}), (bg:BrainStructure {id: "basal_ganglia"})
CREATE (nacc)-[:PART_OF]->(bg);


// ============================================================
// NETWORK MEMBERSHIP
// ============================================================

// Default Mode Network
MATCH (mpfc:BrainStructure {id: "mpfc"}), (dmn:FunctionalNetwork {id: "dmn"})
CREATE (mpfc)-[:PARTICIPATES_IN]->(dmn);

MATCH (pcc:BrainStructure {id: "pcc"}), (dmn:FunctionalNetwork {id: "dmn"})
CREATE (pcc)-[:PARTICIPATES_IN]->(dmn);

MATCH (hippo:BrainStructure {id: "hippocampus"}), (dmn:FunctionalNetwork {id: "dmn"})
CREATE (hippo)-[:PARTICIPATES_IN]->(dmn);

MATCH (ag:BrainStructure {id: "angular_gyrus"}), (dmn:FunctionalNetwork {id: "dmn"})
CREATE (ag)-[:PARTICIPATES_IN]->(dmn);

// Salience Network
MATCH (ai:BrainStructure {id: "anterior_insula"}), (sn:FunctionalNetwork {id: "salience_network"})
CREATE (ai)-[:PARTICIPATES_IN]->(sn);

MATCH (dacc:BrainStructure {id: "dacc"}), (sn:FunctionalNetwork {id: "salience_network"})
CREATE (dacc)-[:PARTICIPATES_IN]->(sn);

MATCH (amyg:BrainStructure {id: "amygdala"}), (sn:FunctionalNetwork {id: "salience_network"})
CREATE (amyg)-[:PARTICIPATES_IN]->(sn);

// Central Executive Network
MATCH (dlpfc:BrainStructure {id: "dlpfc"}), (cen:FunctionalNetwork {id: "cen"})
CREATE (dlpfc)-[:PARTICIPATES_IN]->(cen);

MATCH (pc:BrainStructure {id: "parietal_cortex"}), (cen:FunctionalNetwork {id: "cen"})
CREATE (pc)-[:PARTICIPATES_IN]->(cen);

// Limbic Network
MATCH (amyg:BrainStructure {id: "amygdala"}), (ln:FunctionalNetwork {id: "limbic_network"})
CREATE (amyg)-[:PARTICIPATES_IN]->(ln);

MATCH (hippo:BrainStructure {id: "hippocampus"}), (ln:FunctionalNetwork {id: "limbic_network"})
CREATE (hippo)-[:PARTICIPATES_IN]->(ln);

MATCH (hypo:BrainStructure {id: "hypothalamus"}), (ln:FunctionalNetwork {id: "limbic_network"})
CREATE (hypo)-[:PARTICIPATES_IN]->(ln);

MATCH (ofc:BrainStructure {id: "ofc"}), (ln:FunctionalNetwork {id: "limbic_network"})
CREATE (ofc)-[:PARTICIPATES_IN]->(ln);

// Sensorimotor Network
MATCH (mc:BrainStructure {id: "motor_cortex"}), (smn:FunctionalNetwork {id: "sensorimotor_network"})
CREATE (mc)-[:PARTICIPATES_IN]->(smn);

MATCH (sc:BrainStructure {id: "somatosensory_cortex"}), (smn:FunctionalNetwork {id: "sensorimotor_network"})
CREATE (sc)-[:PARTICIPATES_IN]->(smn);

MATCH (bg:BrainStructure {id: "basal_ganglia"}), (smn:FunctionalNetwork {id: "sensorimotor_network"})
CREATE (bg)-[:PARTICIPATES_IN]->(smn);

// Dorsal Attention Network
MATCH (fef:BrainStructure {id: "fef"}), (dan:FunctionalNetwork {id: "dan"})
CREATE (fef)-[:PARTICIPATES_IN]->(dan);

MATCH (ips:BrainStructure {id: "ips"}), (dan:FunctionalNetwork {id: "dan"})
CREATE (ips)-[:PARTICIPATES_IN]->(dan);

// Ventral Attention Network
MATCH (tpj:BrainStructure {id: "tpj"}), (van:FunctionalNetwork {id: "van"})
CREATE (tpj)-[:PARTICIPATES_IN]->(van);

MATCH (ai:BrainStructure {id: "anterior_insula"}), (van:FunctionalNetwork {id: "van"})
CREATE (ai)-[:PARTICIPATES_IN]->(van);


// ============================================================
// BRAIN-FUNCTION LINKS
// ============================================================

// Amygdala
MATCH (amyg:BrainStructure {id: "amygdala"}), (fc:Function {id: "fear_conditioning"})
CREATE (amyg)-[:IMPLICATED_IN {role: "primary", evidence: "strong"}]->(fc);

MATCH (amyg:BrainStructure {id: "amygdala"}), (td:Function {id: "threat_detection"})
CREATE (amyg)-[:IMPLICATED_IN {role: "primary", evidence: "strong"}]->(td);

MATCH (amyg:BrainStructure {id: "amygdala"}), (mc:Function {id: "memory_consolidation"})
CREATE (amyg)-[:IMPLICATED_IN {role: "primary"}]->(mc);

// PFC
MATCH (pfc:BrainStructure {id: "pfc"}), (er:Function {id: "emotion_regulation"})
CREATE (pfc)-[:IMPLICATED_IN {role: "regulatory", evidence: "strong"}]->(er);

MATCH (vmpfc:BrainStructure {id: "vmpfc"}), (fe:Function {id: "fear_extinction"})
CREATE (vmpfc)-[:IMPLICATED_IN {role: "regulatory", evidence: "strong"}]->(fe);

MATCH (dlpfc:BrainStructure {id: "dlpfc"}), (wm:Function {id: "working_memory"})
CREATE (dlpfc)-[:IMPLICATED_IN {role: "primary", evidence: "strong"}]->(wm);

MATCH (dlpfc:BrainStructure {id: "dlpfc"}), (cc:Function {id: "cognitive_control"})
CREATE (dlpfc)-[:IMPLICATED_IN {role: "primary", evidence: "strong"}]->(cc);

MATCH (dlpfc:BrainStructure {id: "dlpfc"}), (ef:Function {id: "executive_function"})
CREATE (dlpfc)-[:IMPLICATED_IN {role: "primary"}]->(ef);

// ACC
MATCH (acc:BrainStructure {id: "acc"}), (cc:Function {id: "cognitive_control"})
CREATE (acc)-[:IMPLICATED_IN {role: "monitoring"}]->(cc);

MATCH (dacc:BrainStructure {id: "dacc"}), (er:Function {id: "emotion_regulation"})
CREATE (dacc)-[:IMPLICATED_IN {role: "primary"}]->(er);

// Insula
MATCH (ins:BrainStructure {id: "insula"}), (int:Function {id: "interoception"})
CREATE (ins)-[:IMPLICATED_IN {role: "primary", evidence: "strong"}]->(int);

MATCH (ai:BrainStructure {id: "anterior_insula"}), (er:Function {id: "emotion_regulation"})
CREATE (ai)-[:IMPLICATED_IN {role: "primary"}]->(er);

MATCH (ai:BrainStructure {id: "anterior_insula"}), (sc:Function {id: "social_cognition"})
CREATE (ai)-[:IMPLICATED_IN {role: "primary"}]->(sc);

MATCH (pi:BrainStructure {id: "posterior_insula"}), (ba:Function {id: "body_awareness"})
CREATE (pi)-[:IMPLICATED_IN {role: "primary"}]->(ba);

MATCH (ss:BrainStructure {id: "somatosensory_cortex"}), (ba:Function {id: "body_awareness"})
CREATE (ss)-[:IMPLICATED_IN {role: "primary"}]->(ba);

// Hippocampus
MATCH (hippo:BrainStructure {id: "hippocampus"}), (mc:Function {id: "memory_consolidation"})
CREATE (hippo)-[:IMPLICATED_IN {role: "primary", evidence: "strong"}]->(mc);

MATCH (hippo:BrainStructure {id: "hippocampus"}), (fc:Function {id: "fear_conditioning"})
CREATE (hippo)-[:IMPLICATED_IN {role: "contextual", evidence: "strong"}]->(fc);

MATCH (hippo:BrainStructure {id: "hippocampus"}), (fe:Function {id: "fear_extinction"})
CREATE (hippo)-[:IMPLICATED_IN {role: "contextual", evidence: "strong"}]->(fe);

// OFC
MATCH (ofc:BrainStructure {id: "ofc"}), (ic:Function {id: "impulse_control"})
CREATE (ofc)-[:IMPLICATED_IN {role: "primary"}]->(ic);

MATCH (ofc:BrainStructure {id: "ofc"}), (rp:Function {id: "reward_processing"})
CREATE (ofc)-[:IMPLICATED_IN {role: "primary"}]->(rp);

// Reward system
MATCH (nacc:BrainStructure {id: "nucleus_accumbens"}), (rp:Function {id: "reward_processing"})
CREATE (nacc)-[:IMPLICATED_IN {role: "primary"}]->(rp);

MATCH (nacc:BrainStructure {id: "nucleus_accumbens"}), (m:Function {id: "motivation"})
CREATE (nacc)-[:IMPLICATED_IN {role: "primary"}]->(m);

MATCH (vta:BrainStructure {id: "vta"}), (rp:Function {id: "reward_processing"})
CREATE (vta)-[:IMPLICATED_IN {role: "primary"}]->(rp);

MATCH (vta:BrainStructure {id: "vta"}), (m:Function {id: "motivation"})
CREATE (vta)-[:IMPLICATED_IN {role: "primary"}]->(m);

// Self-referential
MATCH (mpfc:BrainStructure {id: "mpfc"}), (sr:Function {id: "self_referential"})
CREATE (mpfc)-[:IMPLICATED_IN {role: "primary"}]->(sr);

MATCH (mpfc:BrainStructure {id: "mpfc"}), (sc:Function {id: "social_cognition"})
CREATE (mpfc)-[:IMPLICATED_IN {role: "primary"}]->(sc);

// Stress
MATCH (hypo:BrainStructure {id: "hypothalamus"}), (stress:Function {id: "stress_response"})
CREATE (hypo)-[:IMPLICATED_IN {role: "primary"}]->(stress);

MATCH (lc:BrainStructure {id: "locus_coeruleus"}), (stress:Function {id: "stress_response"})
CREATE (lc)-[:IMPLICATED_IN {role: "modulatory"}]->(stress);

// Thalamus
MATCH (thal:BrainStructure {id: "thalamus"}), (att:Function {id: "attention"})
CREATE (thal)-[:IMPLICATED_IN {role: "gating"}]->(att);

// Basal ganglia
MATCH (bg:BrainStructure {id: "basal_ganglia"}), (hf:Function {id: "habit_formation"})
CREATE (bg)-[:IMPLICATED_IN {role: "primary"}]->(hf);

// Temporal cortex
MATCH (tc:BrainStructure {id: "temporal_cortex"}), (lp:Function {id: "language_processing"})
CREATE (tc)-[:IMPLICATED_IN {role: "primary"}]->(lp);


// ============================================================
// BRAIN-EMOTION LINKS
// ============================================================

MATCH (amyg:BrainStructure {id: "amygdala"}), (fear:Emotion {id: "fear"})
CREATE (amyg)-[:ACTIVATES_DURING {direction: "increases", evidence: "strong"}]->(fear);

MATCH (amyg:BrainStructure {id: "amygdala"}), (anger:Emotion {id: "anger"})
CREATE (amyg)-[:ACTIVATES_DURING {direction: "increases"}]->(anger);

MATCH (amyg:BrainStructure {id: "amygdala"}), (anx:Emotion {id: "anxiety"})
CREATE (amyg)-[:ACTIVATES_DURING {direction: "increases"}]->(anx);

MATCH (amyg:BrainStructure {id: "amygdala"}), (hs:Emotion {id: "hot_shame"})
CREATE (amyg)-[:ACTIVATES_DURING {direction: "increases"}]->(hs);

MATCH (bnst:BrainStructure {id: "bnst"}), (anx:Emotion {id: "anxiety"})
CREATE (bnst)-[:ACTIVATES_DURING {direction: "increases", notes: "sustained/anticipatory anxiety"}]->(anx);

MATCH (ai:BrainStructure {id: "anterior_insula"}), (disg:Emotion {id: "disgust"})
CREATE (ai)-[:ACTIVATES_DURING {direction: "increases"}]->(disg);

MATCH (ai:BrainStructure {id: "anterior_insula"}), (anx:Emotion {id: "anxiety"})
CREATE (ai)-[:ACTIVATES_DURING {direction: "increases"}]->(anx);

MATCH (ai:BrainStructure {id: "anterior_insula"}), (comp:Emotion {id: "compassion"})
CREATE (ai)-[:ACTIVATES_DURING {direction: "increases"}]->(comp);

MATCH (mpfc:BrainStructure {id: "mpfc"}), (hs:Emotion {id: "hot_shame"})
CREATE (mpfc)-[:ACTIVATES_DURING {direction: "increases"}]->(hs);

MATCH (mpfc:BrainStructure {id: "mpfc"}), (cs:Emotion {id: "cold_shame"})
CREATE (mpfc)-[:ACTIVATES_DURING {direction: "increases"}]->(cs);

MATCH (mpfc:BrainStructure {id: "mpfc"}), (guilt:Emotion {id: "guilt"})
CREATE (mpfc)-[:ACTIVATES_DURING {direction: "increases"}]->(guilt);

MATCH (vacc:BrainStructure {id: "vacc"}), (sad:Emotion {id: "sadness"})
CREATE (vacc)-[:ACTIVATES_DURING {direction: "increases"}]->(sad);

MATCH (nacc:BrainStructure {id: "nucleus_accumbens"}), (joy:Emotion {id: "joy"})
CREATE (nacc)-[:ACTIVATES_DURING {direction: "increases"}]->(joy);

MATCH (nacc:BrainStructure {id: "nucleus_accumbens"}), (exc:Emotion {id: "excitement"})
CREATE (nacc)-[:ACTIVATES_DURING {direction: "increases"}]->(exc);

MATCH (pag:BrainStructure {id: "pag"}), (panic:Emotion {id: "panic"})
CREATE (pag)-[:ACTIVATES_DURING {direction: "increases"}]->(panic);


// ============================================================
// NEUROCHEMICAL PRODUCTION
// ============================================================

MATCH (vta:BrainStructure {id: "vta"}), (da:NeurochemicalSystem {id: "dopamine"})
CREATE (vta)-[:PRODUCES]->(da);

MATCH (raphe:BrainStructure {id: "raphe_nuclei"}), (ser:NeurochemicalSystem {id: "serotonin"})
CREATE (raphe)-[:PRODUCES]->(ser);

MATCH (lc:BrainStructure {id: "locus_coeruleus"}), (ne:NeurochemicalSystem {id: "norepinephrine"})
CREATE (lc)-[:PRODUCES]->(ne);

MATCH (hypo:BrainStructure {id: "hypothalamus"}), (cort:NeurochemicalSystem {id: "cortisol"})
CREATE (hypo)-[:PRODUCES]->(cort);

MATCH (hypo:BrainStructure {id: "hypothalamus"}), (oxy:NeurochemicalSystem {id: "oxytocin"})
CREATE (hypo)-[:PRODUCES]->(oxy);


// ============================================================
// NEUROCHEMICAL MODULATION
// ============================================================

MATCH (da:NeurochemicalSystem {id: "dopamine"}), (rp:Function {id: "reward_processing"})
CREATE (da)-[:MODULATES]->(rp);

MATCH (da:NeurochemicalSystem {id: "dopamine"}), (m:Function {id: "motivation"})
CREATE (da)-[:MODULATES]->(m);

MATCH (ser:NeurochemicalSystem {id: "serotonin"}), (er:Function {id: "emotion_regulation"})
CREATE (ser)-[:MODULATES]->(er);

MATCH (ser:NeurochemicalSystem {id: "serotonin"}), (anx:Emotion {id: "anxiety"})
CREATE (ser)-[:MODULATES {direction: "reduces"}]->(anx);

MATCH (ne:NeurochemicalSystem {id: "norepinephrine"}), (att:Function {id: "attention"})
CREATE (ne)-[:MODULATES]->(att);

MATCH (ne:NeurochemicalSystem {id: "norepinephrine"}), (stress:Function {id: "stress_response"})
CREATE (ne)-[:MODULATES]->(stress);

MATCH (gaba:NeurochemicalSystem {id: "gaba"}), (anx:Emotion {id: "anxiety"})
CREATE (gaba)-[:MODULATES {direction: "inhibits"}]->(anx);

MATCH (gaba:NeurochemicalSystem {id: "gaba"}), (amyg:BrainStructure {id: "amygdala"})
CREATE (gaba)-[:MODULATES {direction: "inhibits"}]->(amyg);

MATCH (glu:NeurochemicalSystem {id: "glutamate"}), (mc:Function {id: "memory_consolidation"})
CREATE (glu)-[:MODULATES]->(mc);

MATCH (glu:NeurochemicalSystem {id: "glutamate"}), (fc:Function {id: "fear_conditioning"})
CREATE (glu)-[:MODULATES]->(fc);

MATCH (ach:NeurochemicalSystem {id: "acetylcholine"}), (att:Function {id: "attention"})
CREATE (ach)-[:MODULATES]->(att);

MATCH (ach:NeurochemicalSystem {id: "acetylcholine"}), (mc:Function {id: "memory_consolidation"})
CREATE (ach)-[:MODULATES]->(mc);

MATCH (endo:NeurochemicalSystem {id: "endorphin"}), (stress:Function {id: "stress_response"})
CREATE (endo)-[:MODULATES {direction: "reduces"}]->(stress);

MATCH (endo:NeurochemicalSystem {id: "endorphin"}), (rp:Function {id: "reward_processing"})
CREATE (endo)-[:MODULATES]->(rp);

MATCH (cort:NeurochemicalSystem {id: "cortisol"}), (stress:Function {id: "stress_response"})
CREATE (cort)-[:MODULATES]->(stress);

MATCH (cort:NeurochemicalSystem {id: "cortisol"}), (mc:Function {id: "memory_consolidation"})
CREATE (cort)-[:MODULATES]->(mc);

MATCH (oxy:NeurochemicalSystem {id: "oxytocin"}), (trust:Emotion {id: "trust"})
CREATE (oxy)-[:MODULATES]->(trust);

MATCH (oxy:NeurochemicalSystem {id: "oxytocin"}), (sc:Function {id: "social_cognition"})
CREATE (oxy)-[:MODULATES]->(sc);


// ============================================================
// THERAPY MODALITY HIERARCHY
// ============================================================

// IFS
MATCH (c:TherapyConcept {id: "ifs_exile"}), (m:TherapyModality {id: "ifs"})
CREATE (c)-[:BELONGS_TO]->(m);

MATCH (c:TherapyConcept {id: "ifs_firefighter"}), (m:TherapyModality {id: "ifs"})
CREATE (c)-[:BELONGS_TO]->(m);

MATCH (c:TherapyConcept {id: "ifs_manager"}), (m:TherapyModality {id: "ifs"})
CREATE (c)-[:BELONGS_TO]->(m);

MATCH (c:TherapyConcept {id: "ifs_self"}), (m:TherapyModality {id: "ifs"})
CREATE (c)-[:BELONGS_TO]->(m);

MATCH (c:TherapyConcept {id: "ifs_protector"}), (m:TherapyModality {id: "ifs"})
CREATE (c)-[:BELONGS_TO]->(m);

MATCH (c:TherapyConcept {id: "ifs_unburdening"}), (m:TherapyModality {id: "ifs"})
CREATE (c)-[:BELONGS_TO]->(m);

MATCH (c:TherapyConcept {id: "ifs_blending"}), (m:TherapyModality {id: "ifs"})
CREATE (c)-[:BELONGS_TO]->(m);

MATCH (c:TherapyConcept {id: "ifs_unblending"}), (m:TherapyModality {id: "ifs"})
CREATE (c)-[:BELONGS_TO]->(m);

MATCH (c:TherapyConcept {id: "ifs_trailhead"}), (m:TherapyModality {id: "ifs"})
CREATE (c)-[:BELONGS_TO]->(m);

// IFS part hierarchy
MATCH (ff:TherapyConcept {id: "ifs_firefighter"}), (p:TherapyConcept {id: "ifs_protector"})
CREATE (ff)-[:TYPE_OF]->(p);

MATCH (mgr:TherapyConcept {id: "ifs_manager"}), (p:TherapyConcept {id: "ifs_protector"})
CREATE (mgr)-[:TYPE_OF]->(p);

// DBT Modules -> DBT
MATCH (c:TherapyConcept {id: "dbt_mindfulness_module"}), (m:TherapyModality {id: "dbt"})
CREATE (c)-[:BELONGS_TO]->(m);

MATCH (c:TherapyConcept {id: "dbt_distress_tolerance"}), (m:TherapyModality {id: "dbt"})
CREATE (c)-[:BELONGS_TO]->(m);

MATCH (c:TherapyConcept {id: "dbt_emotion_regulation_module"}), (m:TherapyModality {id: "dbt"})
CREATE (c)-[:BELONGS_TO]->(m);

MATCH (c:TherapyConcept {id: "dbt_interpersonal_effectiveness"}), (m:TherapyModality {id: "dbt"})
CREATE (c)-[:BELONGS_TO]->(m);

// DBT Mindfulness Skills -> Module
MATCH (c:TherapyConcept {id: "dbt_wise_mind"}), (mod:TherapyConcept {id: "dbt_mindfulness_module"})
CREATE (c)-[:PART_OF]->(mod);

MATCH (c:TherapyConcept {id: "dbt_emotional_mind"}), (mod:TherapyConcept {id: "dbt_mindfulness_module"})
CREATE (c)-[:PART_OF]->(mod);

MATCH (c:TherapyConcept {id: "dbt_reasonable_mind"}), (mod:TherapyConcept {id: "dbt_mindfulness_module"})
CREATE (c)-[:PART_OF]->(mod);

MATCH (c:TherapyConcept {id: "dbt_observe"}), (mod:TherapyConcept {id: "dbt_mindfulness_module"})
CREATE (c)-[:PART_OF]->(mod);

MATCH (c:TherapyConcept {id: "dbt_describe"}), (mod:TherapyConcept {id: "dbt_mindfulness_module"})
CREATE (c)-[:PART_OF]->(mod);

MATCH (c:TherapyConcept {id: "dbt_participate"}), (mod:TherapyConcept {id: "dbt_mindfulness_module"})
CREATE (c)-[:PART_OF]->(mod);

MATCH (c:TherapyConcept {id: "dbt_nonjudgmental"}), (mod:TherapyConcept {id: "dbt_mindfulness_module"})
CREATE (c)-[:PART_OF]->(mod);

MATCH (c:TherapyConcept {id: "dbt_one_mindfully"}), (mod:TherapyConcept {id: "dbt_mindfulness_module"})
CREATE (c)-[:PART_OF]->(mod);

MATCH (c:TherapyConcept {id: "dbt_effectively"}), (mod:TherapyConcept {id: "dbt_mindfulness_module"})
CREATE (c)-[:PART_OF]->(mod);

// DBT Distress Tolerance Skills -> Module
MATCH (c:TherapyConcept {id: "dbt_tipp"}), (mod:TherapyConcept {id: "dbt_distress_tolerance"})
CREATE (c)-[:PART_OF]->(mod);

MATCH (c:TherapyConcept {id: "dbt_stop"}), (mod:TherapyConcept {id: "dbt_distress_tolerance"})
CREATE (c)-[:PART_OF]->(mod);

MATCH (c:TherapyConcept {id: "dbt_accepts"}), (mod:TherapyConcept {id: "dbt_distress_tolerance"})
CREATE (c)-[:PART_OF]->(mod);

MATCH (c:TherapyConcept {id: "dbt_improve"}), (mod:TherapyConcept {id: "dbt_distress_tolerance"})
CREATE (c)-[:PART_OF]->(mod);

MATCH (c:TherapyConcept {id: "dbt_pros_cons"}), (mod:TherapyConcept {id: "dbt_distress_tolerance"})
CREATE (c)-[:PART_OF]->(mod);

MATCH (c:TherapyConcept {id: "dbt_radical_acceptance"}), (mod:TherapyConcept {id: "dbt_distress_tolerance"})
CREATE (c)-[:PART_OF]->(mod);

MATCH (c:TherapyConcept {id: "dbt_turning_mind"}), (mod:TherapyConcept {id: "dbt_distress_tolerance"})
CREATE (c)-[:PART_OF]->(mod);

MATCH (c:TherapyConcept {id: "dbt_willingness"}), (mod:TherapyConcept {id: "dbt_distress_tolerance"})
CREATE (c)-[:PART_OF]->(mod);

MATCH (c:TherapyConcept {id: "dbt_half_smile"}), (mod:TherapyConcept {id: "dbt_distress_tolerance"})
CREATE (c)-[:PART_OF]->(mod);

MATCH (c:TherapyConcept {id: "dbt_willing_hands"}), (mod:TherapyConcept {id: "dbt_distress_tolerance"})
CREATE (c)-[:PART_OF]->(mod);

// DBT Emotion Regulation Skills -> Module
MATCH (c:TherapyConcept {id: "dbt_reducing_vulnerability"}), (mod:TherapyConcept {id: "dbt_emotion_regulation_module"})
CREATE (c)-[:PART_OF]->(mod);

MATCH (c:TherapyConcept {id: "dbt_check_facts"}), (mod:TherapyConcept {id: "dbt_emotion_regulation_module"})
CREATE (c)-[:PART_OF]->(mod);

MATCH (c:TherapyConcept {id: "dbt_opposite_action"}), (mod:TherapyConcept {id: "dbt_emotion_regulation_module"})
CREATE (c)-[:PART_OF]->(mod);

MATCH (c:TherapyConcept {id: "dbt_problem_solving"}), (mod:TherapyConcept {id: "dbt_emotion_regulation_module"})
CREATE (c)-[:PART_OF]->(mod);

// Reducing Vulnerability sub-skills
MATCH (c:TherapyConcept {id: "dbt_abc_please"}), (rv:TherapyConcept {id: "dbt_reducing_vulnerability"})
CREATE (c)-[:PART_OF]->(rv);

MATCH (c:TherapyConcept {id: "dbt_accumulate_positives"}), (rv:TherapyConcept {id: "dbt_reducing_vulnerability"})
CREATE (c)-[:PART_OF]->(rv);

MATCH (c:TherapyConcept {id: "dbt_build_mastery"}), (rv:TherapyConcept {id: "dbt_reducing_vulnerability"})
CREATE (c)-[:PART_OF]->(rv);

MATCH (c:TherapyConcept {id: "dbt_cope_ahead"}), (rv:TherapyConcept {id: "dbt_reducing_vulnerability"})
CREATE (c)-[:PART_OF]->(rv);

MATCH (c:TherapyConcept {id: "dbt_please"}), (rv:TherapyConcept {id: "dbt_reducing_vulnerability"})
CREATE (c)-[:PART_OF]->(rv);

// DBT IE Skills -> Module
MATCH (c:TherapyConcept {id: "dbt_dear_man"}), (mod:TherapyConcept {id: "dbt_interpersonal_effectiveness"})
CREATE (c)-[:PART_OF]->(mod);

MATCH (c:TherapyConcept {id: "dbt_give"}), (mod:TherapyConcept {id: "dbt_interpersonal_effectiveness"})
CREATE (c)-[:PART_OF]->(mod);

MATCH (c:TherapyConcept {id: "dbt_fast"}), (mod:TherapyConcept {id: "dbt_interpersonal_effectiveness"})
CREATE (c)-[:PART_OF]->(mod);

// CBT
MATCH (c:TherapyConcept {id: "cbt_cognitive_distortion"}), (m:TherapyModality {id: "cbt"})
CREATE (c)-[:BELONGS_TO]->(m);

MATCH (c:TherapyConcept {id: "cbt_thought_record"}), (m:TherapyModality {id: "cbt"})
CREATE (c)-[:BELONGS_TO]->(m);

MATCH (c:TherapyConcept {id: "cbt_behavioral_activation"}), (m:TherapyModality {id: "cbt"})
CREATE (c)-[:BELONGS_TO]->(m);

MATCH (c:TherapyConcept {id: "cbt_exposure"}), (m:TherapyModality {id: "cbt"})
CREATE (c)-[:BELONGS_TO]->(m);

// Cognitive distortion types
MATCH (c:TherapyConcept {id: "cbt_catastrophizing"}), (cd:TherapyConcept {id: "cbt_cognitive_distortion"})
CREATE (c)-[:TYPE_OF]->(cd);

MATCH (c:TherapyConcept {id: "cbt_black_white"}), (cd:TherapyConcept {id: "cbt_cognitive_distortion"})
CREATE (c)-[:TYPE_OF]->(cd);

MATCH (c:TherapyConcept {id: "cbt_mind_reading"}), (cd:TherapyConcept {id: "cbt_cognitive_distortion"})
CREATE (c)-[:TYPE_OF]->(cd);

MATCH (c:TherapyConcept {id: "cbt_fortune_telling"}), (cd:TherapyConcept {id: "cbt_cognitive_distortion"})
CREATE (c)-[:TYPE_OF]->(cd);

MATCH (c:TherapyConcept {id: "cbt_should_statements"}), (cd:TherapyConcept {id: "cbt_cognitive_distortion"})
CREATE (c)-[:TYPE_OF]->(cd);

MATCH (c:TherapyConcept {id: "cbt_personalization"}), (cd:TherapyConcept {id: "cbt_cognitive_distortion"})
CREATE (c)-[:TYPE_OF]->(cd);

MATCH (c:TherapyConcept {id: "cbt_labeling"}), (cd:TherapyConcept {id: "cbt_cognitive_distortion"})
CREATE (c)-[:TYPE_OF]->(cd);

MATCH (c:TherapyConcept {id: "cbt_emotional_reasoning"}), (cd:TherapyConcept {id: "cbt_cognitive_distortion"})
CREATE (c)-[:TYPE_OF]->(cd);

MATCH (c:TherapyConcept {id: "cbt_mental_filter"}), (cd:TherapyConcept {id: "cbt_cognitive_distortion"})
CREATE (c)-[:TYPE_OF]->(cd);

// ACT
MATCH (c:TherapyConcept {id: "act_psych_flexibility"}), (m:TherapyModality {id: "act"})
CREATE (c)-[:BELONGS_TO]->(m);

MATCH (c:TherapyConcept {id: "act_defusion"}), (m:TherapyModality {id: "act"})
CREATE (c)-[:BELONGS_TO]->(m);

MATCH (c:TherapyConcept {id: "act_acceptance"}), (m:TherapyModality {id: "act"})
CREATE (c)-[:BELONGS_TO]->(m);

MATCH (c:TherapyConcept {id: "act_present_moment"}), (m:TherapyModality {id: "act"})
CREATE (c)-[:BELONGS_TO]->(m);

MATCH (c:TherapyConcept {id: "act_self_context"}), (m:TherapyModality {id: "act"})
CREATE (c)-[:BELONGS_TO]->(m);

MATCH (c:TherapyConcept {id: "act_values"}), (m:TherapyModality {id: "act"})
CREATE (c)-[:BELONGS_TO]->(m);

MATCH (c:TherapyConcept {id: "act_committed_action"}), (m:TherapyModality {id: "act"})
CREATE (c)-[:BELONGS_TO]->(m);

// EMDR
MATCH (c:TherapyConcept {id: "emdr_aip"}), (m:TherapyModality {id: "emdr"})
CREATE (c)-[:BELONGS_TO]->(m);

MATCH (c:TherapyConcept {id: "emdr_bilateral"}), (m:TherapyModality {id: "emdr"})
CREATE (c)-[:BELONGS_TO]->(m);

MATCH (c:TherapyConcept {id: "emdr_target"}), (m:TherapyModality {id: "emdr"})
CREATE (c)-[:BELONGS_TO]->(m);

MATCH (c:TherapyConcept {id: "emdr_nc"}), (m:TherapyModality {id: "emdr"})
CREATE (c)-[:BELONGS_TO]->(m);

MATCH (c:TherapyConcept {id: "emdr_pc"}), (m:TherapyModality {id: "emdr"})
CREATE (c)-[:BELONGS_TO]->(m);

MATCH (c:TherapyConcept {id: "emdr_suds"}), (m:TherapyModality {id: "emdr"})
CREATE (c)-[:BELONGS_TO]->(m);

MATCH (c:TherapyConcept {id: "emdr_voc"}), (m:TherapyModality {id: "emdr"})
CREATE (c)-[:BELONGS_TO]->(m);

MATCH (c:TherapyConcept {id: "emdr_phases"}), (m:TherapyModality {id: "emdr"})
CREATE (c)-[:BELONGS_TO]->(m);

// Somatic Experiencing
MATCH (c:TherapyConcept {id: "se_felt_sense"}), (m:TherapyModality {id: "se"})
CREATE (c)-[:BELONGS_TO]->(m);

MATCH (c:TherapyConcept {id: "se_titration"}), (m:TherapyModality {id: "se"})
CREATE (c)-[:BELONGS_TO]->(m);

MATCH (c:TherapyConcept {id: "se_pendulation"}), (m:TherapyModality {id: "se"})
CREATE (c)-[:BELONGS_TO]->(m);

MATCH (c:TherapyConcept {id: "se_discharge"}), (m:TherapyModality {id: "se"})
CREATE (c)-[:BELONGS_TO]->(m);

MATCH (c:TherapyConcept {id: "se_resourcing"}), (m:TherapyModality {id: "se"})
CREATE (c)-[:BELONGS_TO]->(m);

MATCH (c:TherapyConcept {id: "se_orienting"}), (m:TherapyModality {id: "se"})
CREATE (c)-[:BELONGS_TO]->(m);

MATCH (c:TherapyConcept {id: "se_defensive"}), (m:TherapyModality {id: "se"})
CREATE (c)-[:BELONGS_TO]->(m);

// CPT
MATCH (c:TherapyConcept {id: "cpt_stuck_point"}), (m:TherapyModality {id: "cpt"})
CREATE (c)-[:BELONGS_TO]->(m);

MATCH (c:TherapyConcept {id: "cpt_assimilation"}), (m:TherapyModality {id: "cpt"})
CREATE (c)-[:BELONGS_TO]->(m);

MATCH (c:TherapyConcept {id: "cpt_overaccommodation"}), (m:TherapyModality {id: "cpt"})
CREATE (c)-[:BELONGS_TO]->(m);

MATCH (c:TherapyConcept {id: "cpt_accommodation"}), (m:TherapyModality {id: "cpt"})
CREATE (c)-[:BELONGS_TO]->(m);

MATCH (c:TherapyConcept {id: "cpt_abc"}), (m:TherapyModality {id: "cpt"})
CREATE (c)-[:BELONGS_TO]->(m);

MATCH (c:TherapyConcept {id: "cpt_challenging"}), (m:TherapyModality {id: "cpt"})
CREATE (c)-[:BELONGS_TO]->(m);

MATCH (c:TherapyConcept {id: "cpt_themes"}), (m:TherapyModality {id: "cpt"})
CREATE (c)-[:BELONGS_TO]->(m);

// MBCT
MATCH (c:TherapyConcept {id: "mbct_decentering"}), (m:TherapyModality {id: "mbct"})
CREATE (c)-[:BELONGS_TO]->(m);

MATCH (c:TherapyConcept {id: "mbct_body_scan"}), (m:TherapyModality {id: "mbct"})
CREATE (c)-[:BELONGS_TO]->(m);

MATCH (c:TherapyConcept {id: "mbct_sitting"}), (m:TherapyModality {id: "mbct"})
CREATE (c)-[:BELONGS_TO]->(m);

MATCH (c:TherapyConcept {id: "mbct_movement"}), (m:TherapyModality {id: "mbct"})
CREATE (c)-[:BELONGS_TO]->(m);

MATCH (c:TherapyConcept {id: "mbct_3min"}), (m:TherapyModality {id: "mbct"})
CREATE (c)-[:BELONGS_TO]->(m);

MATCH (c:TherapyConcept {id: "mbct_relapse"}), (m:TherapyModality {id: "mbct"})
CREATE (c)-[:BELONGS_TO]->(m);

// Polyvagal
MATCH (c:TherapyConcept {id: "pv_ventral_vagal"}), (m:TherapyModality {id: "polyvagal"})
CREATE (c)-[:BELONGS_TO]->(m);

MATCH (c:TherapyConcept {id: "pv_sympathetic"}), (m:TherapyModality {id: "polyvagal"})
CREATE (c)-[:BELONGS_TO]->(m);

MATCH (c:TherapyConcept {id: "pv_dorsal_vagal"}), (m:TherapyModality {id: "polyvagal"})
CREATE (c)-[:BELONGS_TO]->(m);

MATCH (c:TherapyConcept {id: "pv_neuroception"}), (m:TherapyModality {id: "polyvagal"})
CREATE (c)-[:BELONGS_TO]->(m);

MATCH (c:TherapyConcept {id: "pv_coregulation"}), (m:TherapyModality {id: "polyvagal"})
CREATE (c)-[:BELONGS_TO]->(m);

MATCH (c:TherapyConcept {id: "pv_vagal_brake"}), (m:TherapyModality {id: "polyvagal"})
CREATE (c)-[:BELONGS_TO]->(m);

MATCH (c:TherapyConcept {id: "pv_social_engagement"}), (m:TherapyModality {id: "polyvagal"})
CREATE (c)-[:BELONGS_TO]->(m);


// ============================================================
// THERAPY -> CLINICAL TARGETS
// ============================================================

MATCH (m:TherapyModality {id: "dbt"}), (c:ClinicalConstruct {id: "bpd"})
CREATE (m)-[:DEVELOPED_FOR]->(c);

MATCH (m:TherapyModality {id: "dbt"}), (c:ClinicalConstruct {id: "emotional_dysregulation"})
CREATE (m)-[:TREATS]->(c);

MATCH (m:TherapyModality {id: "dbt"}), (c:ClinicalConstruct {id: "ptsd"})
CREATE (m)-[:TREATS]->(c);

MATCH (m:TherapyModality {id: "cbt"}), (c:ClinicalConstruct {id: "mdd"})
CREATE (m)-[:TREATS]->(c);

MATCH (m:TherapyModality {id: "cbt"}), (c:ClinicalConstruct {id: "gad"})
CREATE (m)-[:TREATS]->(c);

MATCH (m:TherapyModality {id: "cbt"}), (c:ClinicalConstruct {id: "panic_disorder"})
CREATE (m)-[:TREATS]->(c);

MATCH (m:TherapyModality {id: "cbt"}), (c:ClinicalConstruct {id: "social_anxiety"})
CREATE (m)-[:TREATS]->(c);

MATCH (m:TherapyModality {id: "cbt"}), (c:ClinicalConstruct {id: "ocd"})
CREATE (m)-[:TREATS]->(c);

MATCH (m:TherapyModality {id: "act"}), (c:ClinicalConstruct {id: "mdd"})
CREATE (m)-[:TREATS]->(c);

MATCH (m:TherapyModality {id: "act"}), (c:ClinicalConstruct {id: "gad"})
CREATE (m)-[:TREATS]->(c);

MATCH (m:TherapyModality {id: "emdr"}), (c:ClinicalConstruct {id: "ptsd"})
CREATE (m)-[:TREATS]->(c);

MATCH (m:TherapyModality {id: "emdr"}), (c:ClinicalConstruct {id: "cptsd"})
CREATE (m)-[:TREATS]->(c);

MATCH (m:TherapyModality {id: "cpt"}), (c:ClinicalConstruct {id: "ptsd"})
CREATE (m)-[:TREATS]->(c);

MATCH (m:TherapyModality {id: "ifs"}), (c:ClinicalConstruct {id: "cptsd"})
CREATE (m)-[:TREATS]->(c);

MATCH (m:TherapyModality {id: "ifs"}), (c:ClinicalConstruct {id: "dissociation"})
CREATE (m)-[:TREATS]->(c);

MATCH (m:TherapyModality {id: "ifs"}), (c:ClinicalConstruct {id: "bpd"})
CREATE (m)-[:TREATS]->(c);

MATCH (m:TherapyModality {id: "se"}), (c:ClinicalConstruct {id: "ptsd"})
CREATE (m)-[:TREATS]->(c);

MATCH (m:TherapyModality {id: "se"}), (c:ClinicalConstruct {id: "cptsd"})
CREATE (m)-[:TREATS]->(c);

MATCH (m:TherapyModality {id: "mbct"}), (c:ClinicalConstruct {id: "mdd"})
CREATE (m)-[:DEVELOPED_FOR]->(c);

MATCH (m:TherapyModality {id: "mbct"}), (c:ClinicalConstruct {id: "rumination"})
CREATE (m)-[:TREATS]->(c);


// ============================================================
// SKILL -> SYMPTOM TARGETS
// ============================================================

MATCH (c:TherapyConcept {id: "dbt_distress_tolerance"}), (t:ClinicalConstruct {id: "emotional_dysregulation"})
CREATE (c)-[:TARGETS]->(t);

MATCH (c:TherapyConcept {id: "dbt_tipp"}), (t:ClinicalConstruct {id: "emotional_dysregulation"})
CREATE (c)-[:TARGETS {mechanism: "activates parasympathetic via dive reflex"}]->(t);

MATCH (c:TherapyConcept {id: "dbt_tipp"}), (t:Emotion {id: "panic"})
CREATE (c)-[:TARGETS]->(t);

MATCH (c:TherapyConcept {id: "dbt_opposite_action"}), (t:ClinicalConstruct {id: "avoidance"})
CREATE (c)-[:TARGETS]->(t);

MATCH (c:TherapyConcept {id: "cbt_exposure"}), (t:ClinicalConstruct {id: "avoidance"})
CREATE (c)-[:TARGETS]->(t);

MATCH (c:TherapyConcept {id: "cbt_exposure"}), (t:Emotion {id: "fear"})
CREATE (c)-[:TARGETS]->(t);

MATCH (c:TherapyConcept {id: "dbt_radical_acceptance"}), (t:ClinicalConstruct {id: "rumination"})
CREATE (c)-[:TARGETS]->(t);

MATCH (c:TherapyConcept {id: "act_defusion"}), (t:ClinicalConstruct {id: "rumination"})
CREATE (c)-[:TARGETS]->(t);

MATCH (c:TherapyConcept {id: "cbt_behavioral_activation"}), (t:ClinicalConstruct {id: "mdd"})
CREATE (c)-[:TARGETS]->(t);

MATCH (c:TherapyConcept {id: "dbt_check_facts"}), (t:TherapyConcept {id: "cbt_catastrophizing"})
CREATE (c)-[:TARGETS]->(t);

MATCH (c:TherapyConcept {id: "cbt_thought_record"}), (t:TherapyConcept {id: "cbt_cognitive_distortion"})
CREATE (c)-[:TARGETS]->(t);


// ============================================================
// IFS PARTS -> EMOTIONS
// ============================================================

MATCH (c:TherapyConcept {id: "ifs_exile"}), (e:Emotion {id: "cold_shame"})
CREATE (c)-[:CARRIES]->(e);

MATCH (c:TherapyConcept {id: "ifs_exile"}), (e:Emotion {id: "fear"})
CREATE (c)-[:CARRIES]->(e);

MATCH (c:TherapyConcept {id: "ifs_exile"}), (e:Emotion {id: "loneliness"})
CREATE (c)-[:CARRIES]->(e);

MATCH (c:TherapyConcept {id: "ifs_exile"}), (e:Emotion {id: "sadness"})
CREATE (c)-[:CARRIES]->(e);

MATCH (c:TherapyConcept {id: "ifs_firefighter"}), (e:Emotion {id: "fear"})
CREATE (c)-[:RESPONDS_TO]->(e);

MATCH (c:TherapyConcept {id: "ifs_firefighter"}), (e:Emotion {id: "cold_shame"})
CREATE (c)-[:RESPONDS_TO]->(e);

MATCH (c:TherapyConcept {id: "ifs_firefighter"}), (e:Emotion {id: "overwhelm"})
CREATE (c)-[:RESPONDS_TO]->(e);

MATCH (c:TherapyConcept {id: "ifs_manager"}), (e:Emotion {id: "cold_shame"})
CREATE (c)-[:PREVENTS]->(e);

MATCH (c:TherapyConcept {id: "ifs_manager"}), (e:Emotion {id: "fear"})
CREATE (c)-[:PREVENTS]->(e);

MATCH (c:TherapyConcept {id: "ifs_manager"}), (e:Emotion {id: "rejection"})
CREATE (c)-[:PREVENTS]->(e);


// ============================================================
// DBT SKILLS -> EMOTIONS
// ============================================================

MATCH (c:TherapyConcept {id: "dbt_opposite_action"}), (e:Emotion {id: "fear"})
CREATE (c)-[:ADDRESSES]->(e);

MATCH (c:TherapyConcept {id: "dbt_opposite_action"}), (e:Emotion {id: "cold_shame"})
CREATE (c)-[:ADDRESSES]->(e);

MATCH (c:TherapyConcept {id: "dbt_opposite_action"}), (e:Emotion {id: "sadness"})
CREATE (c)-[:ADDRESSES]->(e);

MATCH (c:TherapyConcept {id: "dbt_opposite_action"}), (e:Emotion {id: "anger"})
CREATE (c)-[:ADDRESSES]->(e);

MATCH (c:TherapyConcept {id: "dbt_tipp"}), (e:Emotion {id: "panic"})
CREATE (c)-[:REDUCES]->(e);

MATCH (c:TherapyConcept {id: "dbt_tipp"}), (e:Emotion {id: "overwhelm"})
CREATE (c)-[:REDUCES]->(e);

MATCH (c:TherapyConcept {id: "dbt_tipp"}), (e:Emotion {id: "anger"})
CREATE (c)-[:REDUCES]->(e);


// ============================================================
// SKILL -> BRAIN/FUNCTION
// ============================================================

MATCH (c:TherapyConcept {id: "dbt_tipp"}), (b:BrainStructure {id: "amygdala"})
CREATE (c)-[:MODULATES {direction: "down-regulates", mechanism: "dive reflex, vagal activation"}]->(b);

MATCH (c:TherapyConcept {id: "cbt_exposure"}), (f:Function {id: "fear_extinction"})
CREATE (c)-[:MODULATES {direction: "promotes", mechanism: "extinction learning"}]->(f);

MATCH (c:TherapyConcept {id: "mindfulness"}), (b:BrainStructure {id: "insula"})
CREATE (c)-[:MODULATES {direction: "strengthens"}]->(b);

MATCH (c:TherapyConcept {id: "mindfulness"}), (b:BrainStructure {id: "pfc"})
CREATE (c)-[:MODULATES {direction: "strengthens"}]->(b);

MATCH (c:TherapyConcept {id: "mindfulness"}), (f:Function {id: "interoception"})
CREATE (c)-[:MODULATES {direction: "increases"}]->(f);

MATCH (c:TherapyConcept {id: "cbt_behavioral_activation"}), (n:NeurochemicalSystem {id: "dopamine"})
CREATE (c)-[:MODULATES {direction: "increases"}]->(n);


// ============================================================
// POLYVAGAL -> EMOTION
// ============================================================

MATCH (c:TherapyConcept {id: "pv_ventral_vagal"}), (e:Emotion {id: "safety"})
CREATE (c)-[:ASSOCIATED_WITH]->(e);

MATCH (c:TherapyConcept {id: "pv_ventral_vagal"}), (e:Emotion {id: "calm"})
CREATE (c)-[:ASSOCIATED_WITH]->(e);

MATCH (c:TherapyConcept {id: "pv_ventral_vagal"}), (coreg:TherapyConcept {id: "pv_coregulation"})
CREATE (c)-[:ENABLES]->(coreg);

MATCH (c:TherapyConcept {id: "pv_sympathetic"}), (e:Emotion {id: "fear"})
CREATE (c)-[:ASSOCIATED_WITH]->(e);

MATCH (c:TherapyConcept {id: "pv_sympathetic"}), (e:Emotion {id: "anger"})
CREATE (c)-[:ASSOCIATED_WITH]->(e);

MATCH (c:TherapyConcept {id: "pv_sympathetic"}), (e:Emotion {id: "anxiety"})
CREATE (c)-[:ASSOCIATED_WITH]->(e);

MATCH (c:TherapyConcept {id: "pv_dorsal_vagal"}), (e:Emotion {id: "numbness"})
CREATE (c)-[:ASSOCIATED_WITH]->(e);

MATCH (c:TherapyConcept {id: "pv_dorsal_vagal"}), (e:Emotion {id: "hopelessness"})
CREATE (c)-[:ASSOCIATED_WITH]->(e);

MATCH (c:TherapyConcept {id: "pv_dorsal_vagal"}), (cc:ClinicalConstruct {id: "dissociation"})
CREATE (c)-[:ASSOCIATED_WITH]->(cc);

MATCH (c:TherapyConcept {id: "pv_neuroception"}), (b:BrainStructure {id: "amygdala"})
CREATE (c)-[:INVOLVES]->(b);

MATCH (c:TherapyConcept {id: "pv_neuroception"}), (b:BrainStructure {id: "insula"})
CREATE (c)-[:INVOLVES]->(b);


// ============================================================
// BODY SENSATION MODEL
// ============================================================

// Anxiety
MATCH (e:Emotion {id: "anxiety"}), (s:SensationType {id: "constriction"})
CREATE (e)-[:FELT_AS {region: "chest"}]->(s);

MATCH (e:Emotion {id: "anxiety"}), (s:SensationType {id: "racing_heart"})
CREATE (e)-[:FELT_AS {region: "chest"}]->(s);

MATCH (e:Emotion {id: "anxiety"}), (s:SensationType {id: "butterflies"})
CREATE (e)-[:FELT_AS {region: "stomach"}]->(s);

MATCH (e:Emotion {id: "anxiety"}), (s:SensationType {id: "tension"})
CREATE (e)-[:FELT_AS {region: "shoulders"}]->(s);

// Fear
MATCH (e:Emotion {id: "fear"}), (s:SensationType {id: "racing_heart"})
CREATE (e)-[:FELT_AS {region: "chest"}]->(s);

MATCH (e:Emotion {id: "fear"}), (s:SensationType {id: "heaviness"})
CREATE (e)-[:FELT_AS {region: "stomach"}]->(s);

MATCH (e:Emotion {id: "fear"}), (s:SensationType {id: "cold_sensation"})
CREATE (e)-[:FELT_AS {region: "body"}]->(s);

MATCH (e:Emotion {id: "fear"}), (s:SensationType {id: "weakness"})
CREATE (e)-[:FELT_AS {region: "legs"}]->(s);

MATCH (e:Emotion {id: "fear"}), (s:SensationType {id: "shaking"})
CREATE (e)-[:FELT_AS {region: "body"}]->(s);

// Panic
MATCH (e:Emotion {id: "panic"}), (s:SensationType {id: "racing_heart"})
CREATE (e)-[:FELT_AS {region: "chest"}]->(s);

MATCH (e:Emotion {id: "panic"}), (s:SensationType {id: "constriction"})
CREATE (e)-[:FELT_AS {region: "chest"}]->(s);

MATCH (e:Emotion {id: "panic"}), (s:SensationType {id: "shaking"})
CREATE (e)-[:FELT_AS {region: "body"}]->(s);

MATCH (e:Emotion {id: "panic"}), (s:SensationType {id: "numbness_sensation"})
CREATE (e)-[:FELT_AS {region: "hands"}]->(s);

// Anger
MATCH (e:Emotion {id: "anger"}), (s:SensationType {id: "pressure"})
CREATE (e)-[:FELT_AS {region: "head"}]->(s);

MATCH (e:Emotion {id: "anger"}), (s:SensationType {id: "heat"})
CREATE (e)-[:FELT_AS {region: "head"}]->(s);

MATCH (e:Emotion {id: "anger"}), (s:SensationType {id: "heat"})
CREATE (e)-[:FELT_AS {region: "chest"}]->(s);

MATCH (e:Emotion {id: "anger"}), (s:SensationType {id: "tension"})
CREATE (e)-[:FELT_AS {region: "arms"}]->(s);

// Sadness
MATCH (e:Emotion {id: "sadness"}), (s:SensationType {id: "heaviness"})
CREATE (e)-[:FELT_AS {region: "chest"}]->(s);

MATCH (e:Emotion {id: "sadness"}), (s:SensationType {id: "constriction"})
CREATE (e)-[:FELT_AS {region: "throat"}]->(s);

// Shame
MATCH (e:Emotion {id: "hot_shame"}), (s:SensationType {id: "heat"})
CREATE (e)-[:FELT_AS {region: "face"}]->(s);

MATCH (e:Emotion {id: "hot_shame"}), (s:SensationType {id: "heat"})
CREATE (e)-[:FELT_AS {region: "chest"}]->(s);

MATCH (e:Emotion {id: "cold_shame"}), (s:SensationType {id: "heaviness"})
CREATE (e)-[:FELT_AS {region: "stomach"}]->(s);

MATCH (e:Emotion {id: "cold_shame"}), (s:SensationType {id: "weakness"})
CREATE (e)-[:FELT_AS {region: "body"}]->(s);

// Joy
MATCH (e:Emotion {id: "joy"}), (s:SensationType {id: "expansion"})
CREATE (e)-[:FELT_AS {region: "chest"}]->(s);

MATCH (e:Emotion {id: "joy"}), (s:SensationType {id: "lightness"})
CREATE (e)-[:FELT_AS {region: "chest"}]->(s);

// Calm
MATCH (e:Emotion {id: "calm"}), (s:SensationType {id: "lightness"})
CREATE (e)-[:FELT_AS {region: "body"}]->(s);

MATCH (e:Emotion {id: "calm"}), (s:SensationType {id: "groundedness"})
CREATE (e)-[:FELT_AS {region: "legs"}]->(s);

// Love/compassion
MATCH (e:Emotion {id: "love"}), (s:SensationType {id: "expansion"})
CREATE (e)-[:FELT_AS {region: "chest"}]->(s);

MATCH (e:Emotion {id: "compassion"}), (s:SensationType {id: "expansion"})
CREATE (e)-[:FELT_AS {region: "chest"}]->(s);

// Stress
MATCH (e:Emotion {id: "stress"}), (s:SensationType {id: "tension"})
CREATE (e)-[:FELT_AS {region: "shoulders"}]->(s);

MATCH (e:Emotion {id: "stress"}), (s:SensationType {id: "tension"})
CREATE (e)-[:FELT_AS {region: "back"}]->(s);

// Excitement
MATCH (e:Emotion {id: "excitement"}), (s:SensationType {id: "butterflies"})
CREATE (e)-[:FELT_AS {region: "stomach"}]->(s);

MATCH (e:Emotion {id: "excitement"}), (s:SensationType {id: "racing_heart"})
CREATE (e)-[:FELT_AS {region: "chest"}]->(s);

MATCH (e:Emotion {id: "excitement"}), (s:SensationType {id: "restlessness"})
CREATE (e)-[:FELT_AS {region: "body"}]->(s);


// ============================================================
// CROSS-MODALITY BRIDGES
// ============================================================

// Self/Observer parallels
MATCH (a:TherapyConcept {id: "ifs_self"}), (b:TherapyConcept {id: "dbt_wise_mind"})
CREATE (a)-[:CONCEPTUALLY_RELATED_TO {type: "functional_equivalent"}]->(b);

MATCH (a:TherapyConcept {id: "ifs_self"}), (b:TherapyConcept {id: "pv_ventral_vagal"})
CREATE (a)-[:CONCEPTUALLY_RELATED_TO {type: "functional_equivalent"}]->(b);

MATCH (a:TherapyConcept {id: "act_self_context"}), (b:TherapyConcept {id: "ifs_self"})
CREATE (a)-[:CONCEPTUALLY_RELATED_TO {type: "functional_equivalent"}]->(b);

MATCH (a:TherapyConcept {id: "act_self_context"}), (b:TherapyConcept {id: "dbt_wise_mind"})
CREATE (a)-[:CONCEPTUALLY_RELATED_TO {type: "functional_equivalent"}]->(b);

// Acceptance parallels
MATCH (a:TherapyConcept {id: "dbt_radical_acceptance"}), (b:TherapyConcept {id: "act_acceptance"})
CREATE (a)-[:CONCEPTUALLY_RELATED_TO {type: "functional_equivalent"}]->(b);

// Defusion/Unblending/Decentering
MATCH (a:TherapyConcept {id: "ifs_unblending"}), (b:TherapyConcept {id: "act_defusion"})
CREATE (a)-[:CONCEPTUALLY_RELATED_TO {type: "functional_equivalent"}]->(b);

MATCH (a:TherapyConcept {id: "mbct_decentering"}), (b:TherapyConcept {id: "act_defusion"})
CREATE (a)-[:CONCEPTUALLY_RELATED_TO {type: "functional_equivalent"}]->(b);

MATCH (a:TherapyConcept {id: "mbct_decentering"}), (b:TherapyConcept {id: "ifs_unblending"})
CREATE (a)-[:CONCEPTUALLY_RELATED_TO {type: "functional_equivalent"}]->(b);

// Present moment/Mindfulness parallels
MATCH (a:TherapyConcept {id: "act_present_moment"}), (b:TherapyConcept {id: "dbt_observe"})
CREATE (a)-[:CONCEPTUALLY_RELATED_TO {type: "functional_equivalent"}]->(b);

MATCH (a:TherapyConcept {id: "act_present_moment"}), (b:TherapyConcept {id: "mindfulness"})
CREATE (a)-[:CONCEPTUALLY_RELATED_TO {type: "functional_equivalent"}]->(b);

// Mindfulness as shared foundation
MATCH (a:TherapyConcept {id: "mindfulness"}), (b:TherapyConcept {id: "dbt_mindfulness_module"})
CREATE (a)-[:CONCEPTUALLY_RELATED_TO {type: "shared_foundation"}]->(b);

MATCH (a:TherapyConcept {id: "mindfulness"}), (b:TherapyModality {id: "mbct"})
CREATE (a)-[:CONCEPTUALLY_RELATED_TO {type: "shared_foundation"}]->(b);

MATCH (a:TherapyConcept {id: "mindfulness"}), (b:TherapyModality {id: "act"})
CREATE (a)-[:CONCEPTUALLY_RELATED_TO {type: "shared_foundation"}]->(b);

// Parts/States parallels
MATCH (a:TherapyConcept {id: "ifs_exile"}), (b:TherapyConcept {id: "pv_dorsal_vagal"})
CREATE (a)-[:CONCEPTUALLY_RELATED_TO {type: "state_parallel"}]->(b);

MATCH (a:TherapyConcept {id: "ifs_firefighter"}), (b:TherapyConcept {id: "pv_sympathetic"})
CREATE (a)-[:CONCEPTUALLY_RELATED_TO {type: "state_parallel"}]->(b);

MATCH (a:TherapyConcept {id: "ifs_manager"}), (b:FunctionalNetwork {id: "cen"})
CREATE (a)-[:CONCEPTUALLY_RELATED_TO {type: "functional_parallel"}]->(b);

// Trailhead/Neuroception
MATCH (a:TherapyConcept {id: "pv_neuroception"}), (b:TherapyConcept {id: "ifs_trailhead"})
CREATE (a)-[:CONCEPTUALLY_RELATED_TO {type: "functional_parallel"}]->(b);

// Co-regulation/IE
MATCH (a:TherapyConcept {id: "pv_coregulation"}), (b:TherapyConcept {id: "dbt_interpersonal_effectiveness"})
CREATE (a)-[:CONCEPTUALLY_RELATED_TO {type: "functional_parallel"}]->(b);

// Cognitive restructuring tools
MATCH (a:TherapyConcept {id: "dbt_check_facts"}), (b:TherapyConcept {id: "cbt_thought_record"})
CREATE (a)-[:CONCEPTUALLY_RELATED_TO {type: "functional_equivalent"}]->(b);

MATCH (a:TherapyConcept {id: "cpt_challenging"}), (b:TherapyConcept {id: "cbt_thought_record"})
CREATE (a)-[:CONCEPTUALLY_RELATED_TO {type: "functional_equivalent"}]->(b);

// Action despite emotion
MATCH (a:TherapyConcept {id: "act_committed_action"}), (b:TherapyConcept {id: "dbt_opposite_action"})
CREATE (a)-[:CONCEPTUALLY_RELATED_TO {type: "functional_parallel"}]->(b);

// Emotional dysregulation
MATCH (a:TherapyConcept {id: "ifs_exile"}), (b:ClinicalConstruct {id: "emotional_dysregulation"})
CREATE (a)-[:CONCEPTUALLY_RELATED_TO {type: "overlapping_construct"}]->(b);

// Body awareness
MATCH (a:TherapyConcept {id: "se_felt_sense"}), (b:Function {id: "interoception"})
CREATE (a)-[:CONCEPTUALLY_RELATED_TO {type: "functional_equivalent"}]->(b);

MATCH (a:TherapyConcept {id: "mbct_body_scan"}), (b:Function {id: "interoception"})
CREATE (a)-[:CONCEPTUALLY_RELATED_TO {type: "develops"}]->(b);


// ============================================================
// CLINICAL -> BRAIN
// ============================================================

MATCH (c:ClinicalConstruct {id: "ptsd"}), (b:BrainStructure {id: "amygdala"})
CREATE (c)-[:ASSOCIATED_WITH {finding: "hyperactivation", evidence: "strong"}]->(b);

MATCH (c:ClinicalConstruct {id: "ptsd"}), (b:BrainStructure {id: "pfc"})
CREATE (c)-[:ASSOCIATED_WITH {finding: "hypoactivation", evidence: "moderate"}]->(b);

MATCH (c:ClinicalConstruct {id: "ptsd"}), (b:BrainStructure {id: "hippocampus"})
CREATE (c)-[:ASSOCIATED_WITH {finding: "reduced_volume", evidence: "strong"}]->(b);

MATCH (c:ClinicalConstruct {id: "bpd"}), (b:BrainStructure {id: "amygdala"})
CREATE (c)-[:ASSOCIATED_WITH {finding: "hyperactivation"}]->(b);

MATCH (c:ClinicalConstruct {id: "bpd"}), (b:BrainStructure {id: "pfc"})
CREATE (c)-[:ASSOCIATED_WITH {finding: "reduced_connectivity"}]->(b);

MATCH (c:ClinicalConstruct {id: "mdd"}), (n:FunctionalNetwork {id: "dmn"})
CREATE (c)-[:ASSOCIATED_WITH {finding: "hyperactivation"}]->(n);

MATCH (c:ClinicalConstruct {id: "mdd"}), (b:BrainStructure {id: "dlpfc"})
CREATE (c)-[:ASSOCIATED_WITH {finding: "hypoactivation"}]->(b);

MATCH (c:ClinicalConstruct {id: "mdd"}), (n:NeurochemicalSystem {id: "serotonin"})
CREATE (c)-[:ASSOCIATED_WITH {finding: "dysregulation"}]->(n);

MATCH (c:ClinicalConstruct {id: "gad"}), (b:BrainStructure {id: "amygdala"})
CREATE (c)-[:ASSOCIATED_WITH {finding: "hyperactivation"}]->(b);

MATCH (c:ClinicalConstruct {id: "gad"}), (b:BrainStructure {id: "bnst"})
CREATE (c)-[:ASSOCIATED_WITH {finding: "hyperactivation"}]->(b);

MATCH (c:ClinicalConstruct {id: "adhd"}), (b:BrainStructure {id: "pfc"})
CREATE (c)-[:ASSOCIATED_WITH {finding: "hypoactivation"}]->(b);

MATCH (c:ClinicalConstruct {id: "adhd"}), (n:NeurochemicalSystem {id: "dopamine"})
CREATE (c)-[:ASSOCIATED_WITH {finding: "dysregulation"}]->(n);

MATCH (c:ClinicalConstruct {id: "ocd"}), (b:BrainStructure {id: "acc"})
CREATE (c)-[:ASSOCIATED_WITH {finding: "hyperactivation", notes: "error signal that won't turn off"}]->(b);

MATCH (c:ClinicalConstruct {id: "ocd"}), (b:BrainStructure {id: "ofc"})
CREATE (c)-[:ASSOCIATED_WITH {finding: "hyperactivation", notes: "OFC-striatal loop"}]->(b);

MATCH (c:ClinicalConstruct {id: "panic_disorder"}), (b:BrainStructure {id: "amygdala"})
CREATE (c)-[:ASSOCIATED_WITH {finding: "hyperactivation"}]->(b);

MATCH (c:ClinicalConstruct {id: "panic_disorder"}), (b:BrainStructure {id: "pag"})
CREATE (c)-[:ASSOCIATED_WITH {finding: "hyperactivation", notes: "suffocation alarm theory"}]->(b);

MATCH (c:ClinicalConstruct {id: "social_anxiety"}), (b:BrainStructure {id: "amygdala"})
CREATE (c)-[:ASSOCIATED_WITH {finding: "hyperactivation"}]->(b);

MATCH (c:ClinicalConstruct {id: "dissociation"}), (b:BrainStructure {id: "insula"})
CREATE (c)-[:ASSOCIATED_WITH {finding: "altered_connectivity"}]->(b);
