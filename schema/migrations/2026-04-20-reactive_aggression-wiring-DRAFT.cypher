// Proposal: reactive_aggression wiring — DRAFT for clinical review
// Generated: 2026-04-20
// Author: knowledge-graph authoring agent (Claude)
// Reviewer: DO NOT merge until clinical sign-off
//
// ---------------------------------------------------------------------------
// SCOPE
// ---------------------------------------------------------------------------
// The `reactive_aggression` ActivationPattern currently has ONLY narrative
// properties and a single CAN_ESCALATE_TO edge (→ social_threat_shame,
// weight: weak). No INVOLVES, ASSOCIATED_WITH, EVIDENCE_FOR, DOMINANT_NETWORK,
// CORRESPONDS_TO_ANS_STATE, MAPS_TO_WOT_ZONE, or MODULATED_BY edges exist yet.
//
// This file proposes the full relational wiring, modeled after `acute_alarm`'s
// shape. Reactive aggression shares the hyperarousal/sympathetic substrate of
// acute_alarm but with key differences: (a) hypothalamic-PAG attack circuit
// engagement (dorsolateral PAG / medial hypothalamus), (b) OFC/vmPFC top-down
// control failure as the defining deficit, (c) serotonergic (raphe) modulation
// as a well-replicated trait-level moderator, (d) motor/premotor engagement for
// approach-to-threat rather than flight.
//
// NB: this pattern's properties already flag "Proactive/instrumental
// aggression REJECTED for all releases. Only reactive aggression modeled."
// All edges below assume REACTIVE (impulsive, provocation-triggered)
// aggression only.
//
// ---------------------------------------------------------------------------
// OPEN QUESTIONS FOR REVIEWER
// ---------------------------------------------------------------------------
// 1. The pattern's clinicalNotes explicitly says "High association with hostile
//    attribution bias." There is no StateModulator node for this yet. Should we
//    (a) add a new StateModulator `hostile_attribution_bias`, or (b) leave it
//    to the narrative and not wire it? Proposal below proposes option (a) as a
//    commented-out stub so reviewer can approve node creation separately.
//
// 2. Emotion ASSOCIATED_WITH: anger/angry/furious/infuriated/hostility are all
//    present as Emotion nodes. Proposing anger (parent, strong), furious/
//    infuriated (strong), hostile/hostility (strong), resentful (moderate —
//    more chronic than acute reactive), provoked (strong), frustrated/
//    frustration (moderate — frustration-aggression link is classic but most
//    frustration does NOT escalate), indignant (moderate). Reviewer: is
//    `resentful` appropriate here or does that belong under a chronic
//    rumination/grievance pattern? Punting to moderate.
//
// 3. QuestionResponse / EVIDENCE_FOR: the existing QuestionResponse set has no
//    anger-specific item (no `hu_exp_anger` or `hu_body_heat_arms`). The only
//    currently-present responses that could evidence reactive_aggression are
//    `hu_body_tense` and `hu_exp_alarm` (weak) and possibly `hu_body_racing`
//    (weak — sympathetic overlap). I strongly recommend adding at least two
//    new QuestionResponses (`hu_exp_anger_urge`, `hu_body_heat_motor`) before
//    this pattern can score reliably. Those additions are out of scope for
//    this file but flagged at the bottom as `TODO-FOR-REVIEWER`.
//
// 4. CO_OCCURS_WITH: reactive_aggression + acute_alarm (fight branch of
//    fight-or-flight) is clinically common. Reactive_aggression +
//    emotional_flooding is also common (dysregulated anger). Proposing both
//    as `occasional` co-occurrence; reviewer please confirm primary pattern
//    and sequencingNote wording — I have used conservative wording.
//
// 5. CAN_ESCALATE_TO: an existing edge reactive_aggression → social_threat_shame
//    (weak) exists. I am ADDING a reverse-direction note is out of scope
//    (agent rule: additions only). I am proposing a new CAN_ESCALATE_TO →
//    emotional_flooding (moderate) because unregulated fight activation often
//    tips into full dysregulation.
//
// 6. Tools: this graph does not model Tool nodes directly; patterns reference
//    tool IDs through `escalation_suggested_tool` string properties. I have
//    therefore NOT proposed IMPLEMENTS edges. If the reviewer wants
//    pattern→tool edges added as a new convention, that's a schema change
//    request outside this proposal.
//
// 7. Serotonergic modulation (5-HT / raphe nuclei) is one of the most robust
//    trait-level correlates of reactive aggression (Siever 2008; Coccaro et
//    al. 2011). I propose INVOLVES (raphe_nuclei, direction: hypofunction,
//    evidenceGrade: Strong) but flag this as TRAIT-level, not state-level —
//    reviewer may prefer to omit, since other INVOLVES edges are state-level.
//    Marked LOW CONFIDENCE.
//
// ---------------------------------------------------------------------------
// KEY CITATIONS (cited inline below)
// ---------------------------------------------------------------------------
// - Blair, R. J. R. (2016). "The Neurobiology of Impulsive Aggression."
//   J Child Adolesc Psychopharmacol 26(1): 4–9. [amygdala hyper-reactivity;
//   vmPFC/OFC failure to modulate; basic circuit]
// - Siever, L. J. (2008). "Neurobiology of aggression and violence." Am J
//   Psychiatry 165(4): 429–442. [serotonergic hypofunction; OFC; amygdala]
// - Coccaro, E. F., Sripada, C. S., Yanowitch, R. N., & Phan, K. L. (2011).
//   "Corticolimbic function in impulsive aggressive behavior." Biol Psychiatry
//   69(12): 1153–1159. [amygdala–OFC functional disconnection in IED]
// - Gregg, T. R., & Siegel, A. (2001). "Brain structures and neurotransmitters
//   regulating aggression in cats: implications for human aggression." Prog
//   Neuropsychopharmacol Biol Psychiatry 25(1): 91–140. [hypothalamus → dlPAG
//   attack circuit]
// - Lin, D., Boyle, M. P., Dollar, P., et al. (2011). "Functional identification
//   of an aggression locus in the mouse hypothalamus." Nature 470: 221–226.
//   [VMHvl as the canonical attack-initiating hypothalamic locus]
// - da Cunha-Bang, S., & Knudsen, G. M. (2021). "The Modulatory Role of
//   Serotonin on Human Impulsive Aggression." Biol Psychiatry 90(7): 447–457.
// - Buades-Rotger, M., et al. (2016). "Endogenous testosterone is associated
//   with lower amygdala reactivity to angry faces and reduced aggressive
//   behavior in healthy young women." Psychoneuroendocrinology. [amygdala
//   responsivity + aggression]
// - Davidson, R. J., Putnam, K. M., Larson, C. L. (2000). "Dysfunction in the
//   neural circuitry of emotion regulation — a possible prelude to violence."
//   Science 289: 591–594. [PFC top-down control failure]
// - Porges, S. W. (2011). Polyvagal Theory — sympathetic mobilization branch.
// - Ogden, P., Minton, K., Pain, C. (2006). Trauma and the Body. [Window of
//   Tolerance — hyperarousal zone]
//
// ---------------------------------------------------------------------------
// FILE IS IDEMPOTENT: uses MERGE throughout. Safe to re-run after edits.
// ---------------------------------------------------------------------------


// ============================================================================
// 1. BrainStructure INVOLVES edges
// ============================================================================

// --- amygdala (overactive) ---
// Rationale: Central to reactive aggression. Meta-analytic evidence shows
// amygdala hyper-reactivity to provocation/threat cues in impulsive aggressive
// individuals (Coccaro et al. 2011; Blair 2016). Pattern's own mechanism_narrative
// cites "Your amygdala is activating motor-preparation circuits while suppressing
// vulnerability signals."
// Citation: Coccaro et al. 2011; Blair 2016.
MATCH (p:ActivationPattern {id: 'reactive_aggression'}), (b:BrainStructure {id: 'amygdala'})
MERGE (p)-[r:INVOLVES]->(b)
SET r.direction = 'overactive', r.evidenceGrade = 'Strong',
    r.role = 'threat_detection_attack_trigger';

// --- hypothalamus (overactive) ---
// Rationale: Pattern's own description names the "amygdala-hypothalamus-PAG
// attack circuit." Canonical aggression-initiating locus (VMHvl) in mammals
// (Lin et al. 2011). Gregg & Siegel 2001 review: medial hypothalamus drives
// defensive/affective attack.
// Citation: Lin et al. 2011; Gregg & Siegel 2001; pattern's own description.
MATCH (p:ActivationPattern {id: 'reactive_aggression'}), (b:BrainStructure {id: 'hypothalamus'})
MERGE (p)-[r:INVOLVES]->(b)
SET r.direction = 'overactive', r.evidenceGrade = 'Strong',
    r.role = 'attack_circuit_initiation',
    r.notes = 'VMHvl / medial hypothalamus as conserved attack-initiating locus';

// --- dlpag (overactive) ---
// Rationale: Dorsolateral PAG mediates active defense / fight output (distinct
// from vlPAG which mediates freezing). Pattern's own description explicitly
// names PAG. Using dlpag over generic pag node for anatomical precision.
// Citation: Gregg & Siegel 2001; Bandler & Keay 1996 (columnar PAG organization).
MATCH (p:ActivationPattern {id: 'reactive_aggression'}), (b:BrainStructure {id: 'dlpag'})
MERGE (p)-[r:INVOLVES]->(b)
SET r.direction = 'overactive', r.evidenceGrade = 'Strong',
    r.role = 'active_defense_attack_output';

// --- vmpfc (suppressed) ---
// Rationale: Reduced vmPFC top-down modulation of amygdala is the defining
// regulatory deficit in reactive aggression. Davidson et al. 2000 — "prelude
// to violence" framework. Coccaro et al. 2011 show amygdala–OFC functional
// disconnection in IED. Pattern's mechanism_narrative explicitly says
// "prefrontal cortex comes back online" as the return-to-baseline.
// Citation: Davidson et al. 2000; Coccaro et al. 2011; Blair 2016.
MATCH (p:ActivationPattern {id: 'reactive_aggression'}), (b:BrainStructure {id: 'vmpfc'})
MERGE (p)-[r:INVOLVES]->(b)
SET r.direction = 'suppressed', r.evidenceGrade = 'Strong',
    r.role = 'top_down_inhibition_failure';

// --- ofc (suppressed) ---
// Rationale: OFC suppression specifically implicated in impulsive aggression
// as distinct from generalized PFC effects. Siever 2008 review. Lesion data:
// orbitofrontal damage produces acquired sociopathy / impulsive aggression.
// Citation: Siever 2008; Coccaro et al. 2011.
MATCH (p:ActivationPattern {id: 'reactive_aggression'}), (b:BrainStructure {id: 'ofc'})
MERGE (p)-[r:INVOLVES]->(b)
SET r.direction = 'suppressed', r.evidenceGrade = 'Strong',
    r.role = 'impulse_control_value_weighting';

// --- dlpfc (suppressed) ---
// Rationale: State-dependent suppression under high sympathetic arousal
// (Arnsten 2009, catecholamines degrade PFC). Mirrors acute_alarm wiring. Once
// sympathetic charge drops, dlPFC comes back online — pattern's narrative
// explicitly models this recovery.
// Citation: Arnsten 2009; mirrors acute_alarm template.
MATCH (p:ActivationPattern {id: 'reactive_aggression'}), (b:BrainStructure {id: 'dlpfc'})
MERGE (p)-[r:INVOLVES]->(b)
SET r.direction = 'suppressed', r.evidenceGrade = 'Strong',
    r.role = 'executive_offline_under_arousal';

// --- dacc (overactive) ---
// Rationale: Conflict/threat salience. dACC is part of the salience network
// and is consistently engaged in provocation paradigms. Mirrors acute_alarm.
// Citation: Shackman et al. 2011; acute_alarm template.
MATCH (p:ActivationPattern {id: 'reactive_aggression'}), (b:BrainStructure {id: 'dacc'})
MERGE (p)-[r:INVOLVES]->(b)
SET r.direction = 'overactive', r.evidenceGrade = 'Strong',
    r.role = 'threat_salience_conflict_monitoring';

// --- anterior_insula (overactive) ---
// Rationale: Interoceptive component of salience network; signals "bodily
// heat/tension" that pattern's somatic narrative names ("Heat, jaw tension,
// energy in the arms"). Anterior insula also implicated in aggression via
// empathy-for-pain/embodied-anger work.
// Citation: Craig 2009; acute_alarm template.
MATCH (p:ActivationPattern {id: 'reactive_aggression'}), (b:BrainStructure {id: 'anterior_insula'})
MERGE (p)-[r:INVOLVES]->(b)
SET r.direction = 'overactive', r.evidenceGrade = 'Strong',
    r.role = 'interoceptive_amplification';

// --- locus_coeruleus (overactive) ---
// Rationale: Sympathetic/noradrenergic arousal amplifier. Pattern is
// explicitly sympathetic-mobilized (see CORRESPONDS_TO_ANS_STATE below).
// Mirrors acute_alarm. NE surge further degrades PFC control.
// Citation: Arnsten 2009; acute_alarm template.
MATCH (p:ActivationPattern {id: 'reactive_aggression'}), (b:BrainStructure {id: 'locus_coeruleus'})
MERGE (p)-[r:INVOLVES]->(b)
SET r.direction = 'overactive', r.evidenceGrade = 'Strong',
    r.role = 'arousal_amplifier';

// --- motor_cortex (overactive) ---
// Rationale: Pattern's own narrative: "energy in the arms," "hypothalamus is
// activating motor preparation circuits." Motor readiness for approach-to-
// threat is a defining somatic feature distinguishing reactive aggression
// from acute_alarm's flight-readiness.
// Citation: pattern's somatic_narrative; Kozlowska et al. 2015 (defense cascade).
MATCH (p:ActivationPattern {id: 'reactive_aggression'}), (b:BrainStructure {id: 'motor_cortex'})
MERGE (p)-[r:INVOLVES]->(b)
SET r.direction = 'overactive', r.evidenceGrade = 'Moderate',
    r.role = 'motor_preparation_for_attack';

// --- premotor_cortex (overactive) ---
// Rationale: Same rationale as motor_cortex — action preparation. Premotor
// engagement precedes overt motor discharge, mapping onto the "urge to act"
// phase the pattern targets.
// Citation: pattern's somatic_narrative; Graziano 2006 (action-planning in PMC).
// LOW CONFIDENCE — reviewer please confirm whether both motor + premotor are
// needed or whether one suffices.
MATCH (p:ActivationPattern {id: 'reactive_aggression'}), (b:BrainStructure {id: 'premotor_cortex'})
MERGE (p)-[r:INVOLVES]->(b)
SET r.direction = 'overactive', r.evidenceGrade = 'Moderate',
    r.role = 'action_planning_urge_to_act';

// --- raphe_nuclei (hypofunction) ---
// Rationale: Central serotonergic source. Low 5-HT turnover is one of the
// most replicated biological correlates of impulsive aggression (Siever 2008;
// da Cunha-Bang & Knudsen 2021).
// Citation: Siever 2008; Coccaro et al. 2011; da Cunha-Bang & Knudsen 2021.
// LOW CONFIDENCE — reviewer please confirm: this is TRAIT-level vulnerability,
// not an acute state-change during a single episode. Other INVOLVES edges on
// this pattern are state-level. Option: leave as INVOLVES with a `scope:
// 'trait'` tag (proposed below), or omit. Proposing with scope tag so reviewer
// can easily remove.
MATCH (p:ActivationPattern {id: 'reactive_aggression'}), (b:BrainStructure {id: 'raphe_nuclei'})
MERGE (p)-[r:INVOLVES]->(b)
SET r.direction = 'hypofunction', r.evidenceGrade = 'Strong',
    r.role = 'serotonergic_tone_trait_vulnerability',
    r.scope = 'trait';


// ============================================================================
// 2. Emotion ASSOCIATED_WITH edges
// ============================================================================

// --- anger (parent DBT emotion, strong) ---
// Rationale: Reactive aggression is the behavioral arm of acute anger. Direct
// mapping.
MATCH (p:ActivationPattern {id: 'reactive_aggression'}), (e:Emotion {id: 'anger'})
MERGE (p)-[r:ASSOCIATED_WITH]->(e)
SET r.strength = 'strong';

// --- angry (synonym, strong) ---
MATCH (p:ActivationPattern {id: 'reactive_aggression'}), (e:Emotion {id: 'angry'})
MERGE (p)-[r:ASSOCIATED_WITH]->(e)
SET r.strength = 'strong';

// --- furious (high-intensity anger, strong) ---
// Rationale: High-intensity anger variant, most likely to produce reactive
// aggression behaviors.
MATCH (p:ActivationPattern {id: 'reactive_aggression'}), (e:Emotion {id: 'furious'})
MERGE (p)-[r:ASSOCIATED_WITH]->(e)
SET r.strength = 'strong';

// --- infuriated (strong) ---
MATCH (p:ActivationPattern {id: 'reactive_aggression'}), (e:Emotion {id: 'infuriated'})
MERGE (p)-[r:ASSOCIATED_WITH]->(e)
SET r.strength = 'strong';

// --- hostile (strong) ---
// Rationale: Hostility captures the attributional/affective stance. Pattern's
// clinicalNotes cites "high association with hostile attribution bias."
MATCH (p:ActivationPattern {id: 'reactive_aggression'}), (e:Emotion {id: 'hostile'})
MERGE (p)-[r:ASSOCIATED_WITH]->(e)
SET r.strength = 'strong';

// --- hostility (strong) ---
MATCH (p:ActivationPattern {id: 'reactive_aggression'}), (e:Emotion {id: 'hostility'})
MERGE (p)-[r:ASSOCIATED_WITH]->(e)
SET r.strength = 'strong';

// --- aggressive (strong) ---
MATCH (p:ActivationPattern {id: 'reactive_aggression'}), (e:Emotion {id: 'aggressive'})
MERGE (p)-[r:ASSOCIATED_WITH]->(e)
SET r.strength = 'strong';

// --- provoked (strong) ---
// Rationale: Provocation is the canonical trigger class for reactive
// aggression (Berkowitz 1993 cognitive-neoassociationist model).
MATCH (p:ActivationPattern {id: 'reactive_aggression'}), (e:Emotion {id: 'provoked'})
MERGE (p)-[r:ASSOCIATED_WITH]->(e)
SET r.strength = 'strong';

// --- mad (moderate) ---
// Rationale: Colloquial anger; lower-intensity than furious/infuriated but
// still maps. Moderate rather than strong because `mad` is non-specific.
MATCH (p:ActivationPattern {id: 'reactive_aggression'}), (e:Emotion {id: 'mad'})
MERGE (p)-[r:ASSOCIATED_WITH]->(e)
SET r.strength = 'moderate';

// --- indignant (moderate) ---
// Rationale: Anger-at-injustice; commonly underlies reactive aggression when
// person feels wronged. Moderate because indignation can also resolve without
// aggression.
MATCH (p:ActivationPattern {id: 'reactive_aggression'}), (e:Emotion {id: 'indignant'})
MERGE (p)-[r:ASSOCIATED_WITH]->(e)
SET r.strength = 'moderate';

// --- frustrated (moderate) ---
// Rationale: Classic frustration-aggression hypothesis (Dollard et al. 1939;
// Berkowitz 1989 revision). Most frustration does not escalate; relationship
// is probabilistic.
MATCH (p:ActivationPattern {id: 'reactive_aggression'}), (e:Emotion {id: 'frustrated'})
MERGE (p)-[r:ASSOCIATED_WITH]->(e)
SET r.strength = 'moderate';

// --- frustration (moderate) ---
MATCH (p:ActivationPattern {id: 'reactive_aggression'}), (e:Emotion {id: 'frustration'})
MERGE (p)-[r:ASSOCIATED_WITH]->(e)
SET r.strength = 'moderate';

// --- resentful (moderate) ---
// Rationale: Resentment is more chronic/accumulated than acute reactive.
// Including at moderate to support cases where accumulated resentment flashes
// into reactive aggression. LOW CONFIDENCE — reviewer may prefer to remove
// if this belongs to a chronic-grievance pattern.
MATCH (p:ActivationPattern {id: 'reactive_aggression'}), (e:Emotion {id: 'resentful'})
MERGE (p)-[r:ASSOCIATED_WITH]->(e)
SET r.strength = 'moderate';

// --- bitter (weak) ---
// Rationale: Bitterness is largely chronic; weak acute-state association.
// LOW CONFIDENCE — reviewer may prefer to drop.
MATCH (p:ActivationPattern {id: 'reactive_aggression'}), (e:Emotion {id: 'bitter'})
MERGE (p)-[r:ASSOCIATED_WITH]->(e)
SET r.strength = 'weak';

// --- out_of_control (moderate) ---
// Rationale: Subjective experience of the sympathetic-driven attack urge
// overriding top-down control. Captures the phenomenology the pattern is
// designed to scaffold around.
MATCH (p:ActivationPattern {id: 'reactive_aggression'}), (e:Emotion {id: 'out_of_control'})
MERGE (p)-[r:ASSOCIATED_WITH]->(e)
SET r.strength = 'moderate';

// --- annoyed / irritation / peeved (weak) ---
// Rationale: Low-intensity anger states rarely escalate to reactive aggression
// but represent early warnings. Weak evidence relationship so scoring does not
// misfire on everyday irritation.
MATCH (p:ActivationPattern {id: 'reactive_aggression'}), (e:Emotion {id: 'annoyed'})
MERGE (p)-[r:ASSOCIATED_WITH]->(e)
SET r.strength = 'weak';

MATCH (p:ActivationPattern {id: 'reactive_aggression'}), (e:Emotion {id: 'irritation'})
MERGE (p)-[r:ASSOCIATED_WITH]->(e)
SET r.strength = 'weak';

MATCH (p:ActivationPattern {id: 'reactive_aggression'}), (e:Emotion {id: 'peeved'})
MERGE (p)-[r:ASSOCIATED_WITH]->(e)
SET r.strength = 'weak';


// ============================================================================
// 3. FunctionalNetwork DOMINANT_NETWORK
// ============================================================================

// --- salience_network (hyper_engaged) ---
// Rationale: Same as acute_alarm — SN drives threat detection and recruitment
// of motor/autonomic response. dACC + anterior insula hubs already wired above.
// Citation: Seeley et al. 2007; acute_alarm template.
MATCH (p:ActivationPattern {id: 'reactive_aggression'}), (n:FunctionalNetwork {id: 'salience_network'})
MERGE (p)-[r:DOMINANT_NETWORK]->(n)
SET r.state = 'hyper_engaged', r.evidenceGrade = 'Strong';

// --- cen (suppressed) — LOW CONFIDENCE ---
// Rationale: Central executive network is reciprocally suppressed when SN is
// dominant under high arousal. dlPFC already marked suppressed above. This
// edge is network-level restatement.
// Reviewer: acute_alarm does NOT currently have a CEN edge. If we want to add
// one here we should consider adding it to acute_alarm too for consistency,
// or drop here. Proposing as LOW CONFIDENCE.
MATCH (p:ActivationPattern {id: 'reactive_aggression'}), (n:FunctionalNetwork {id: 'cen'})
MERGE (p)-[r:DOMINANT_NETWORK]->(n)
SET r.state = 'suppressed', r.evidenceGrade = 'Moderate';

// --- sensorimotor_network (hyper_engaged) ---
// Rationale: Distinguishes reactive_aggression from acute_alarm: motor
// preparation for attack. Pattern's somatic narrative emphasizes motor
// readiness ("energy in the arms"). Sensorimotor engagement is a defining
// somatic feature.
// LOW CONFIDENCE — no direct meta-analytic citation in-hand; proposed from
// pattern's own narrative + motor_cortex INVOLVES edge.
MATCH (p:ActivationPattern {id: 'reactive_aggression'}), (n:FunctionalNetwork {id: 'sensorimotor_network'})
MERGE (p)-[r:DOMINANT_NETWORK]->(n)
SET r.state = 'hyper_engaged', r.evidenceGrade = 'Preliminary';


// ============================================================================
// 4. CORRESPONDS_TO_ANS_STATE (polyvagal)
// ============================================================================

// --- pv_sympathetic (Strong) ---
// Rationale: Reactive aggression is a sympathetic-mobilization ("fight" branch)
// response. Pattern's narrative explicitly names sympathetic activation and
// parasympathetic-engagement tools as the regulatory path.
// Citation: Porges 2011; pattern's mechanism_narrative.
MATCH (p:ActivationPattern {id: 'reactive_aggression'}), (tc:TherapyConcept {id: 'pv_sympathetic'})
MERGE (p)-[r:CORRESPONDS_TO_ANS_STATE]->(tc)
SET r.evidence = 'Strong';


// ============================================================================
// 5. MAPS_TO_WOT_ZONE (Window of Tolerance)
// ============================================================================

// --- wot_hyperarousal (primary) ---
// Rationale: Reactive aggression sits firmly in the hyperarousal zone of the
// Window of Tolerance — sympathetic mobilization above the upper threshold.
// Mirrors acute_alarm.
// Citation: Ogden, Minton, Pain 2006; Siegel 1999.
MATCH (p:ActivationPattern {id: 'reactive_aggression'}), (tc:TherapyConcept {id: 'wot_hyperarousal'})
MERGE (p)-[r:MAPS_TO_WOT_ZONE]->(tc)
SET r.correspondence = 'primary';


// ============================================================================
// 6. StateModulator MODULATED_BY
// ============================================================================

// --- acute_stress_catecholamine (degrades_top_down_control) ---
// Rationale: Identical mechanism to acute_alarm. Catecholamine surge further
// disables vmPFC/OFC/dlPFC. For reactive aggression this has an ADDITIONAL
// consequence: loss of inhibition over amygdala-hypothalamus-PAG attack
// circuit. Sequencing note: reduce arousal before attempting cognitive tools.
// Citation: Arnsten 2009; acute_alarm template.
MATCH (p:ActivationPattern {id: 'reactive_aggression'}), (s:StateModulator {id: 'acute_stress_catecholamine'})
MERGE (p)-[r:MODULATED_BY]->(s)
SET r.effect = 'degrades_top_down_control',
    r.toolSequencingChange = 'discharge_sympathetic_before_cognitive_tools';

// --- sleep_loss_sensitization (amplifies_pattern) ---
// Rationale: Sleep deprivation robustly increases amygdala reactivity and
// reduces PFC connectivity (Yoo et al. 2007), lowering the threshold for
// reactive aggression (Krizan & Herlache 2016 — sleep loss and hostility).
// Citation: Yoo et al. 2007; Krizan & Herlache 2016.
MATCH (p:ActivationPattern {id: 'reactive_aggression'}), (s:StateModulator {id: 'sleep_loss_sensitization'})
MERGE (p)-[r:MODULATED_BY]->(s)
SET r.effect = 'amplifies_pattern',
    r.toolSequencingChange = 'address_sleep_first';

// --- interoceptive_threat_bias ---
// Rationale: Not as canonical here as in acute_alarm, but interoceptive
// amplification (heat, tension, racing heart) can feed hostile attribution
// ("my body says danger → the other person IS the threat"). Anterior insula
// already marked overactive.
// LOW CONFIDENCE — reviewer may prefer to drop; the mechanism for
// reactive_aggression is more about provocation-perception than
// interoceptive misattribution.
MATCH (p:ActivationPattern {id: 'reactive_aggression'}), (s:StateModulator {id: 'interoceptive_threat_bias'})
MERGE (p)-[r:MODULATED_BY]->(s)
SET r.effect = 'body_signals_feed_hostile_attribution',
    r.toolSequencingChange = 'interoceptive_recalibration';


// ============================================================================
// 7. QuestionResponse EVIDENCE_FOR rules
// ============================================================================
// NOTE: the current QuestionResponse set is oriented toward alarm/flooding/
// social-shame/low-arousal. There is no explicit anger-urge or heat/motor-
// readiness response. The edges below use the best-available responses; see
// TODO-FOR-REVIEWER at bottom for proposed new QuestionResponses.

// --- hu_body_tense (moderate) ---
// Rationale: Jaw/body tension is part of pattern's somatic_narrative ("Heat,
// jaw tension, energy in the arms"). Also fits acute_alarm and
// emotional_flooding, so scoring is moderate, not strong.
// Weight: 0.45 (moderate positive evidence; not discriminative alone).
MATCH (p:ActivationPattern {id: 'reactive_aggression'}), (q:QuestionResponse {id: 'hu_body_tense'})
MERGE (q)-[r:EVIDENCE_FOR]->(p)
SET r.strength = 'moderate', r.weight = 0.45,
    r.rationale = 'Jaw/body tension and motor readiness match the pattern\'s somatic narrative. Non-discriminative alone — also fits acute_alarm and emotional_flooding.';

// --- hu_body_racing (weak) ---
// Rationale: Sympathetic surge (racing heart) is shared with acute_alarm but
// DOES occur in reactive aggression. Weak because acute_alarm is the better
// explanation for racing without motor/heat features.
MATCH (p:ActivationPattern {id: 'reactive_aggression'}), (q:QuestionResponse {id: 'hu_body_racing'})
MERGE (q)-[r:EVIDENCE_FOR]->(p)
SET r.strength = 'weak', r.weight = 0.2,
    r.rationale = 'Sympathetic arousal overlaps with acute_alarm. Racing heart alone is not discriminative for fight vs. flight branch.';

// --- hu_exp_alarm (weak) ---
// Rationale: Identifiable trigger is consistent, but "alarm quality" is more
// fear-flavored than anger-flavored. Weak positive.
MATCH (p:ActivationPattern {id: 'reactive_aggression'}), (q:QuestionResponse {id: 'hu_exp_alarm'})
MERGE (q)-[r:EVIDENCE_FOR]->(p)
SET r.strength = 'weak', r.weight = 0.15,
    r.rationale = 'Identifiable provocation is consistent with reactive aggression\'s phasic trigger, but the alarm/fear framing suggests acute_alarm is more likely.';

// --- hu_exp_flooding (weak) ---
// Rationale: Reactive aggression can emerge FROM flooding when anger becomes
// the "most actionable" emotion (pattern's formulation_body). Weak positive
// for co-occurrence routing.
MATCH (p:ActivationPattern {id: 'reactive_aggression'}), (q:QuestionResponse {id: 'hu_exp_flooding'})
MERGE (q)-[r:EVIDENCE_FOR]->(p)
SET r.strength = 'weak', r.weight = 0.15,
    r.rationale = 'Flooding can escalate to reactive aggression when anger becomes the most actionable emotion. Weak discriminative value.';


// ============================================================================
// 8. CAN_ESCALATE_TO (additions only — existing edge to social_threat_shame preserved)
// ============================================================================

// --- reactive_aggression → emotional_flooding (moderate) ---
// Rationale: Unregulated reactive aggression often tips into full emotional
// dysregulation — rage + tears + overwhelm simultaneously. This is a common
// sequential trajectory when the attack urge cannot be discharged safely.
// Suggested tool: cool-down (temperature TIPP — already aligned with
// pattern's safety constraint of discharging sympathetic energy first).
MATCH (p1:ActivationPattern {id: 'reactive_aggression'}), (p2:ActivationPattern {id: 'emotional_flooding'})
MERGE (p1)-[r:CAN_ESCALATE_TO]->(p2)
SET r.weight = 'moderate',
    r.mechanism = 'unregulated_fight_activation_overwhelms_system',
    r.escalation_suggested_tool = 'cool-down',
    r.escalation_narrative = 'When reactive anger can\'t discharge safely, the system can tip from focused fight into full dysregulation — rage, tears, and overwhelm at once. A fast sympathetic down-regulation (cold water, hard exhale) now can keep the signal from flooding everything.';


// ============================================================================
// 9. CO_OCCURS_WITH (bidirectional by convention; MERGE deduplicates)
// ============================================================================

// --- reactive_aggression <-> acute_alarm (occasional) ---
// Rationale: Fight and flight are the two sympathetic branches; co-occurrence
// in the same episode is common (person is terrified AND enraged). Primary
// pattern depends on dominant urge (attack vs. escape).
// Citation: Porges 2011; Kozlowska et al. 2015 defense cascade.
MATCH (p1:ActivationPattern {id: 'reactive_aggression'}), (p2:ActivationPattern {id: 'acute_alarm'})
MERGE (p1)-[r:CO_OCCURS_WITH]->(p2)
SET r.frequency = 'occasional',
    r.clinicalLabel = 'mixed_fight_flight',
    r.combinedUserFacingLabel = 'Your system is activated to both fight and flee — that\'s a full sympathetic mobilization',
    r.sharedMechanism = 'Both are sympathetic-mobilization branches driven by amygdala-hypothalamus-LC activation. Attack vs. escape output depends on threat proximity and perceived controllability.',
    r.differentiator = 'Attack urge with heat/motor-readiness → reactive_aggression primary. Escape urge with racing heart/narrowing → acute_alarm primary.',
    r.sequencingNote = 'Discharge sympathetic energy safely first (per reactive_aggression safety constraints). Once parasympathetic tone returns, the underlying fear/hurt typically becomes accessible.',
    r.evidenceGrade = 'Moderate',
    r.primaryPatternId = 'reactive_aggression',
    r.primaryRule = 'route_by_dominant_urge';

// --- reactive_aggression <-> emotional_flooding (occasional) ---
// Rationale: Pattern's formulation_body says "anger can feel more manageable
// than the vulnerability underneath." Flooding + anger-as-defense is the
// clinical picture. Different from CAN_ESCALATE_TO above (temporal) — this
// is simultaneous.
MATCH (p1:ActivationPattern {id: 'reactive_aggression'}), (p2:ActivationPattern {id: 'emotional_flooding'})
MERGE (p1)-[r:CO_OCCURS_WITH]->(p2)
SET r.frequency = 'occasional',
    r.clinicalLabel = 'dysregulated_anger',
    r.combinedUserFacingLabel = 'Your system is flooded AND converting the overwhelm into anger — the anger is doing protective work',
    r.sharedMechanism = 'Flooding generates vulnerability signals the system cannot tolerate; reactive anger reorganizes the overwhelm into a more actionable output. Underlying affect is often hurt/fear/helplessness.',
    r.differentiator = 'If the dominant urge is to attack/defend → reactive_aggression primary. If the dominant experience is being swept under by multiple signals → emotional_flooding primary.',
    r.sequencingNote = 'Address the physiological charge first (sympathetic discharge). Do NOT attempt to access the vulnerability underneath while the attack urge is active — it can feel like exposure and intensify the aggression. Name the protective function of the anger before deconstructing it.',
    r.evidenceGrade = 'Moderate',
    r.primaryPatternId = 'reactive_aggression',
    r.primaryRule = 'discharge_first_then_access_underneath';


// ============================================================================
// 10. (Stretch / optional) TherapyConcept MODULATES edges
// ============================================================================
// NOTE: acute_alarm does NOT currently have MODULATES edges from TherapyConcepts
// either, so these are only proposed as optional additions if the reviewer
// wants to start wiring tool-concept routing at the pattern level. Left
// commented out; reviewer to uncomment if desired.
//
// // Paced breathing / vagal brake → activates parasympathetic recovery from fight
// MATCH (tc:TherapyConcept {id: 'pv_vagal_brake'}), (p:ActivationPattern {id: 'reactive_aggression'})
// MERGE (tc)-[r:MODULATES]->(p)
// SET r.direction = 'downregulates', r.evidenceGrade = 'Moderate',
//     r.rationale = 'Vagal brake engagement counters sympathetic dominance. Use AFTER initial sympathetic discharge.';
//
// // Somatic discharge (SE)
// MATCH (tc:TherapyConcept {id: 'se_discharge'}), (p:ActivationPattern {id: 'reactive_aggression'})
// MERGE (tc)-[r:MODULATES]->(p)
// SET r.direction = 'downregulates', r.evidenceGrade = 'Moderate',
//     r.rationale = 'Safe motor discharge channels the attack-preparation energy without interpersonal harm. Explicitly named in pattern\'s somatic_narrative (push palms, ice, hard walk).';
//
// // DBT TIPP — temperature down-regulation
// MATCH (tc:TherapyConcept {id: 'dbt_tipp'}), (p:ActivationPattern {id: 'reactive_aggression'})
// MERGE (tc)-[r:MODULATES]->(p)
// SET r.direction = 'downregulates', r.evidenceGrade = 'Strong',
//     r.rationale = 'TIPP/dive-reflex rapidly shifts autonomic state; first-line for 7+ intensity.';
//
// // DBT STOP — impulse pause
// MATCH (tc:TherapyConcept {id: 'dbt_stop'}), (p:ActivationPattern {id: 'reactive_aggression'})
// MERGE (tc)-[r:MODULATES]->(p)
// SET r.direction = 'interrupts', r.evidenceGrade = 'Moderate',
//     r.rationale = 'Interrupts the impulse-to-action loop; re-engages minimal PFC bandwidth. Use BEFORE cognitive tools, AFTER or DURING sympathetic discharge.';
//
// // Urge surfing
// MATCH (tc:TherapyConcept {id: 'dbt_distress_tolerance'}), (p:ActivationPattern {id: 'reactive_aggression'})
// MERGE (tc)-[r:MODULATES]->(p)
// SET r.direction = 'tolerates', r.evidenceGrade = 'Moderate',
//     r.rationale = 'Observes the attack urge without acting. Requires enough PFC function to be online — sequence AFTER acute discharge.';
//
// // Opposite action
// MATCH (tc:TherapyConcept {id: 'dbt_opposite_action'}), (p:ActivationPattern {id: 'reactive_aggression'})
// MERGE (tc)-[r:MODULATES]->(p)
// SET r.direction = 'reverses_urge', r.evidenceGrade = 'Moderate',
//     r.rationale = 'Gently avoiding the person + unclenched posture + soft voice is the opposite action for anger when anger does NOT fit the facts. Cognitive tool — sequence LAST.';


// ============================================================================
// TODO-FOR-REVIEWER (separate schema work, NOT included in this proposal)
// ============================================================================
// (A) Add new QuestionResponse nodes:
//     - hu_exp_anger_urge: "I felt a sudden urge to yell, hit, or push back."
//     - hu_body_heat_motor: "My body felt hot, my jaw clenched, energy in my
//       arms/hands."
//   These should have EVIDENCE_FOR → reactive_aggression with weight 0.75–0.85
//   each and would let the diagnostic engine actually route to this pattern
//   reliably. Without them, reactive_aggression will under-trigger.
//
// (B) Consider new StateModulator `hostile_attribution_bias` (pattern
//     explicitly cites this in clinicalNotes).
//
// (C) Consider StateModulator `alcohol_disinhibition` — robust moderator
//     of reactive aggression; not currently in the graph.
//
// (D) Reviewer: decide on the `scope: 'trait'` convention for raphe_nuclei
//     INVOLVES edge. If approved, the same convention could apply to other
//     trait-level vulnerabilities (e.g., sleep_loss_sensitization is arguably
//     also dispositional).
//
// END OF PROPOSAL
