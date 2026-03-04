// ============================================================
// PATTERN CO-OCCURRENCE SCHEMA
// schema/pattern-co-occurrence.cypher
//
// PURPOSE:
// Activation patterns frequently co-occur within a single check-in.
// The existing CAN_ESCALATE_TO relationship models TEMPORAL
// progression (pattern A becomes pattern B over time). This schema
// adds CO_OCCURS_WITH to model SIMULTANEOUS presentation — two
// patterns active in the same moment — and provides the sequencing
// logic the cloud function needs to determine which pattern drives
// primary tool selection and which adjusts framing/sequencing.
//
// ARCHITECTURE:
//   (ActivationPattern)-[:CO_OCCURS_WITH {properties}]->(ActivationPattern)
//
// The relationship is BIDIRECTIONAL in meaning but UNIDIRECTIONAL
// in storage (Neo4j convention). The primaryRule property on the
// relationship specifies which pattern should drive tool selection
// when both are detected. This is always the pattern that must be
// addressed FIRST for the other to become tractable.
//
// DISTINCTION FROM EXISTING RELATIONSHIPS:
//   CAN_ESCALATE_TO: Temporal. A → B over minutes/hours/days.
//     "If you don't address A, it may become B."
//     Already exists: freeze → alarm rebound, alarm → flooding,
//     social_threat → reactive_aggression.
//
//   CO_OCCURS_WITH: Simultaneous. A + B in the same check-in.
//     "The person is experiencing both right now."
//     This is what we're adding.
//
//   MODULATED_BY: External factor changes pattern expression.
//     Already exists: sleep_loss, acute_stress, interoceptive_threat_bias.
//     These are contextual modulators, not pattern pairings.
//
// CLINICAL FRAMEWORK:
// Co-occurrence is the norm, not the exception, in clinical
// presentations. The DSM comorbidity problem is well-documented —
// dimensional/transdiagnostic approaches (HiTOP, RDoC) explicitly
// model this. Our activation patterns are already dimensional, so
// co-occurrence is architecturally expected.
//
// The clinical question is always: "Which pattern do I address
// first so that addressing the second becomes possible?"
//
// This maps to a simple principle:
//   1. Arousal regulation before cognitive intervention
//      (can't think clearly until the body is regulated)
//   2. Body reconnection before emotional processing
//      (can't process emotions you can't feel)
//   3. Reward engagement before rumination redirection
//      (rumination diminishes when something rewarding is available)
//   4. Safety before everything
//      (if either pattern triggers safety flags, that overrides sequencing)
//
// CONVENTIONS:
// - MERGE for idempotency (safe to re-run)
// - Properties overwritten via SET after MERGE
// - Each chunk is self-contained (Aura requirement)
// - Relationship direction: p1 → p2 where p1 is the PRIMARY
//   pattern (the one to address first) unless otherwise specified
//   by primaryRule
//
// LAST UPDATED: 2026-03-02
// ============================================================


// ============================================================
// SECTION 1: LOW-UNPLEASANT CO-OCCURRENCES
//
// These are the most clinically critical co-occurrences because
// the low-unpleasant quadrant contains patterns with the most
// overlap in self-report phenomenology AND the most divergent
// intervention requirements. Getting sequencing wrong here
// means recommending tools that worsen the primary state.
// ============================================================


// --------------------------------------------------------
// 1a. RUMINATION + FREEZE ("Ruminative Collapse")
//
// Prevalence: COMMON — core feature of severe MDD
//
// The person is mentally looping AND physically immobilized.
// DMN is hyperactive (producing repetitive self-referential
// thought) while motor/reward systems are suppressed (PAG-
// mediated global dampening). This is the classic "lying in
// bed ruminating" presentation.
//
// Neural mechanism: DMN hyperactivity can persist even during
// global dampening because the DMN is a resting-state network —
// it doesn't require arousal or motor engagement to sustain
// activity. In fact, PAG-mediated suppression of the CEN
// (which normally reciprocally inhibits DMN) may AMPLIFY
// rumination by removing its natural antagonist.
//
// Sequencing rationale: Address freeze FIRST.
// External-focus tasks (the standard rumination intervention)
// require CEN engagement, which requires baseline arousal.
// During freeze, the motor system and CEN are suppressed —
// asking someone to "count backwards from 10" or "find
// something blue" demands resources they don't have.
// Proprioceptive up-regulation gradually brings the motor
// system back online, which in turn restores enough CEN
// capacity for attention-redirection tasks.
//
// Evidence: Martell et al. (behavioral activation for
// depression); Roelofs (2017, freeze/motor suppression);
// Hamilton et al. (2015, DMN-CEN reciprocal inhibition)
// --------------------------------------------------------

MATCH (p1:ActivationPattern {id: "rumination_loop"})
MATCH (p2:ActivationPattern {id: "conservation_freeze"})
MERGE (p1)-[r:CO_OCCURS_WITH]->(p2)
SET r.frequency = "common",
    r.clinicalLabel = "ruminative_collapse",
    r.combinedUserFacingLabel = "Your mind is stuck on replay, and your body has gone still to protect you",
    r.primaryRule = "address_freeze_first",
    r.primaryPatternId = "conservation_freeze",
    r.sequencingNote = "Proprioceptive up-regulation first (restore motor system and baseline CEN capacity), then external-focus attention tasks (rumination protocol). CEN engagement requires arousal that freeze suppresses.",
    r.sharedMechanism = "PAG-mediated CEN suppression may amplify DMN by removing its reciprocal inhibitor — freeze enables rumination",
    r.differentiator = "Freeze contributes body heaviness and motor inhibition; rumination contributes the mental looping. If the person reports heaviness + replay, both are active.",
    r.evidenceGrade = "Strong",
    r.evidenceNote = "Core feature of severe MDD. Well-documented in behavioral activation literature (Martell et al.) — physical inertia + cognitive rumination is the signature depressive presentation.",
    r.safetyNote = "Monitor for suicidal ideation — ruminative collapse is a high-risk state for progression to hopelessness. Both patterns independently trigger safety flags; combined risk is elevated.",
    r.contraindicatedTools = ["meditation", "journaling_about_feelings", "deep_breathing", "goal_setting"];


// --------------------------------------------------------
// 1b. REWARD DRIVE LOW + RUMINATION ("Anhedonic Rumination")
//
// Prevalence: COMMON — another core MDD feature
//
// The person is anhedonic AND mentally looping about it.
// NAc/VTA suppression removes the reward signal, and the
// DMN generates repetitive thought about the absence of
// pleasure/meaning. The rumination here is SECONDARY — it's
// the brain's attempt to problem-solve the anhedonia.
//
// Neural mechanism: When the reward system is blunted, the
// DMN's default problem-solving mode activates: "Why don't
// I care about anything? What's wrong with me? Will this
// ever get better?" This is qualitatively different from
// primary depressive brooding (which loops on loss/failure)
// and from anxious worry (which loops on future threat).
// The content is specifically about the absence of motivation.
//
// Sequencing rationale: Address reward drive FIRST.
// The rumination will diminish when something rewarding
// is available to engage with. Trying to redirect attention
// (standard rumination protocol) fails because there's
// nothing salient enough to redirect TO. Micro-behavioral-
// activation creates a small dopamine signal, which both
// primes further action AND gives the DMN something to
// process other than its own futility loop.
//
// Evidence: Behavioral activation theory (Martell et al.);
// Keren et al. (2018, reward blunting); Nolen-Hoeksema
// (rumination as failed problem-solving)
// --------------------------------------------------------

MATCH (p1:ActivationPattern {id: "reward_drive_low"})
MATCH (p2:ActivationPattern {id: "rumination_loop"})
MERGE (p1)-[r:CO_OCCURS_WITH]->(p2)
SET r.frequency = "common",
    r.clinicalLabel = "anhedonic_rumination",
    r.combinedUserFacingLabel = "Your motivation system is idling, and your mind is trying to figure out why",
    r.primaryRule = "address_reward_first",
    r.primaryPatternId = "reward_drive_low",
    r.sequencingNote = "Micro-behavioral-activation first (tiniest possible rewarding action to generate dopamine signal), then attention redirection if rumination persists. Rumination diminishes when something rewarding is available. Do NOT start with external-focus tasks — nothing is salient enough to redirect to.",
    r.sharedMechanism = "DMN problem-solving mode activated by absence of reward signal — rumination is the brain attempting to solve anhedonia",
    r.differentiator = "Content of rumination is specifically about absence of motivation/pleasure ('why don't I care about anything') rather than loss/failure (depressive brooding) or future threat (anxious worry)",
    r.evidenceGrade = "Strong",
    r.evidenceNote = "Core feature of MDD anhedonia. Behavioral activation literature demonstrates that restoring reward engagement reduces rumination without directly targeting it (Martell et al.; Dimidjian et al. 2006).",
    r.safetyNote = "Pervasive anhedonia + rumination about meaninglessness is a risk factor for suicidal ideation. Monitor content of ruminative loop.",
    r.contraindicatedTools = ["goal_setting", "motivational_framing", "meditation", "journaling_about_feelings"];


// --------------------------------------------------------
// 1c. CONSERVATION FREEZE + DISSOCIATION ("Shutdown with Disconnection")
//
// Prevalence: OCCASIONAL — more common in trauma populations
//
// The person is physically immobilized AND disconnected from
// body/self. They report both heaviness (freeze) and unreality
// (dissociation). This is the deepest end of the defense
// cascade — beyond simple freeze into peri-shutdown.
//
// Neural mechanism: These share a phenomenological boundary
// at the thalamic level. Freeze involves PAG-mediated global
// dampening including thalamic suppression (reduced sensory
// bandwidth). Dissociation involves PFC over-regulation of
// limbic/interoceptive signals. When both are active, the
// person experiences BOTH bottom-up suppression (freeze:
// signals not arriving) AND top-down suppression (dissociation:
// signals being actively blocked). Double suppression.
//
// The differentiator is subtle but clinically important:
// freeze alone feels HEAVY (body very present, just immobilized);
// dissociation alone feels ABSENT (body not quite there).
// Both together feels heavy AND unreal — "a heavy ghost."
//
// Sequencing rationale: Address freeze FIRST.
// Proprioceptive grounding (micro-movements, warmth, gentle
// bilateral input) addresses the bottom-up suppression.
// Once the motor system begins to re-engage and sensory
// signals start arriving at the thalamus, you can then
// work on the top-down disconnection through titrated
// interoceptive reconnection (dissociation protocol).
// Starting with dissociation tools (which ask the person
// to notice body sensations) is counterproductive during
// freeze because the sensory signals aren't getting through.
//
// Evidence: Kozlowska et al. (defense cascade); Lanius
// (2010, 2012 dissociative subtype); Roelofs (2017, freeze);
// Levine (Somatic Experiencing — titrated body reconnection)
// --------------------------------------------------------

MATCH (p1:ActivationPattern {id: "conservation_freeze"})
MATCH (p2:ActivationPattern {id: "dissociation_overmodulation"})
MERGE (p1)-[r:CO_OCCURS_WITH]->(p2)
SET r.frequency = "occasional",
    r.clinicalLabel = "shutdown_with_disconnection",
    r.combinedUserFacingLabel = "Your system has gone very still, and your connection to your body is faint right now",
    r.primaryRule = "address_freeze_first",
    r.primaryPatternId = "conservation_freeze",
    r.sequencingNote = "Proprioceptive grounding first (micro-movements, warmth, bilateral input) to restore bottom-up sensory signals through thalamus. Only then titrated interoceptive reconnection (dissociation protocol). Asking someone to 'notice body sensations' during freeze fails because signals aren't getting through.",
    r.sharedMechanism = "Shared thalamic suppression boundary — freeze dampens signals from below (PAG-mediated), dissociation blocks signals from above (PFC over-regulation). Double suppression produces 'heavy ghost' phenomenology.",
    r.differentiator = "Freeze alone = heavy. Dissociation alone = absent. Both = heavy AND unreal. Look for immobility + depersonalization together.",
    r.evidenceGrade = "Moderate",
    r.evidenceNote = "Defense cascade literature (Kozlowska et al.) models this as deepest immobility stage. Dissociative PTSD subtype (Lanius 2010, 2012) often co-presents with freeze. Somatic Experiencing (Levine) explicitly sequences body mobilization before emotional processing.",
    r.safetyNote = "This is the deepest shutdown state. Extended duration (multiple check-ins) should trigger clinical referral. Do NOT push hard interoceptive exposure — risk of flooding/rebound panic if pulled out too quickly.",
    r.contraindicatedTools = ["deep_breathing", "meditation", "heavy_interoceptive_exposure", "trauma_processing", "goal_setting"];


// --------------------------------------------------------
// 1d. DISSOCIATION + RUMINATION ("Depersonalized Rumination")
//
// Prevalence: LESS COMMON — seen in depersonalization disorder
// and some presentations of dissociative depression
//
// The person describes "watching myself think" — observing
// their own thought loops from a disconnected vantage point.
// There's active DMN content (repetitive self-referential
// thought) but it's experienced as if happening to someone
// else or viewed through glass.
//
// Neural mechanism: PFC over-regulation (dissociation) is
// partially suppressing the emotional valence of the DMN
// content while allowing the cognitive loop to persist.
// The person is ruminating but without the full emotional
// weight — which sounds like it might be adaptive, but
// actually prevents the normal resolution mechanisms
// (emotional processing, habituation) from engaging.
// The rumination becomes "cold" and self-perpetuating.
//
// Sequencing rationale: Address dissociation FIRST.
// The disconnection is preventing the person from fully
// experiencing (and therefore processing/habituating to)
// the emotional content of the rumination. Sensory
// reconnection re-establishes the body-brain signal path,
// which may briefly intensify the emotional experience of
// the ruminative content — but this is necessary for
// resolution. Once reconnected, standard rumination
// redirection (external-focus tasks) becomes effective.
//
// Evidence: Sierra & Berrios (2001, depersonalization-
// rumination link); Lanius (dissociative subtype);
// Holmes et al. (2005, depersonalization maintaining factors)
// --------------------------------------------------------

MATCH (p1:ActivationPattern {id: "dissociation_overmodulation"})
MATCH (p2:ActivationPattern {id: "rumination_loop"})
MERGE (p1)-[r:CO_OCCURS_WITH]->(p2)
SET r.frequency = "less_common",
    r.clinicalLabel = "depersonalized_rumination",
    r.combinedUserFacingLabel = "Your mind is looping, but it feels like you're watching it from a distance",
    r.primaryRule = "address_dissociation_first",
    r.primaryPatternId = "dissociation_overmodulation",
    r.sequencingNote = "Gentle sensory reconnection first (dissociation protocol) to re-establish body-brain signal path. This may briefly intensify emotional experience of ruminative content — that is expected and necessary. Once reconnected, external-focus tasks (rumination protocol) become effective. Do NOT start with attention redirection — person is already 'distant' from experience.",
    r.sharedMechanism = "PFC over-regulation suppresses emotional valence of DMN content while allowing cognitive loop to persist — 'cold rumination' that resists normal habituation/processing",
    r.differentiator = "Person reports 'watching myself think' or thoughts feeling unreal/distant. Rumination content present but emotionally muted. Distinct from pure rumination (emotionally engaged with content) and pure dissociation (minimal cognitive content).",
    r.evidenceGrade = "Moderate",
    r.evidenceNote = "Depersonalization disorder literature documents rumination as maintaining factor (Sierra & Berrios 2001; Holmes et al. 2005). Disconnection from emotional content prevents habituation, perpetuating the loop.",
    r.safetyNote = "The emotional muting can mask suicidal content. If ruminative content involves self-harm or hopelessness, the dissociative buffer may make it feel 'philosophical' rather than urgent — but the risk is real.",
    r.contraindicatedTools = ["meditation", "mindfulness_of_thoughts", "journaling_about_feelings", "heavy_interoceptive_exposure"];


// ============================================================
// SECTION 2: HIGH-UNPLEASANT CO-OCCURRENCES
//
// These are less common as TRUE co-occurrences because
// high-arousal states tend to be more unitary — the
// sympathetic activation is so dominant that it overrides
// secondary patterns. However, two important co-occurrences
// exist, both involving chronic_vigilance (which is tonic
// rather than phasic, allowing space for a second pattern).
// ============================================================


// --------------------------------------------------------
// 2a. CHRONIC VIGILANCE + RUMINATION ("Worried Rumination")
//
// Prevalence: VERY COMMON — the signature of GAD
//
// Sustained anticipatory threat processing (BNST-driven
// vigilance) co-occurring with repetitive self-referential
// thought about potential threats (DMN-mediated worry).
// This is what GAD looks like neurologically: the threat
// detection system is stuck ON, and the DMN is generating
// elaborate scenarios about what could go wrong.
//
// Neural mechanism: BNST maintains tonic threat detection,
// which keeps the salience network biased toward threat.
// The DMN, rather than defaulting to neutral self-referential
// processing, couples with the threat-biased SN to produce
// worry — future-oriented repetitive thought about potential
// negative outcomes. Unlike depressive rumination (past-
// focused), this is anticipatory and future-focused.
//
// Sequencing rationale: Address vigilance FIRST.
// The worry content is being generated by the threat-
// monitoring system. Trying to redirect attention (standard
// rumination protocol) fails because the threat detection
// keeps pulling attention back. Autonomic down-regulation
// (reducing the tonic sympathetic activation) lowers the
// SN's threat bias, which starves the worry loop of new
// threat material. Once the body is calmer, attention
// redirection becomes possible.
//
// Note: Unlike freeze+rumination (where calming tools
// worsen freeze), calming tools are APPROPRIATE here
// because vigilance is a high-arousal state. This is an
// important distinction.
//
// Evidence: Borkovec et al. (worry as cognitive avoidance);
// Shackman & Fox (BNST and sustained anxiety);
// Paulesu et al. (1997, DMN-worry); Newman et al. (GAD model)
// --------------------------------------------------------

MATCH (p1:ActivationPattern {id: "chronic_vigilance"})
MATCH (p2:ActivationPattern {id: "rumination_loop"})
MERGE (p1)-[r:CO_OCCURS_WITH]->(p2)
SET r.frequency = "very_common",
    r.clinicalLabel = "worried_rumination",
    r.combinedUserFacingLabel = "Your alarm system is scanning for threats, and your mind is building worst-case scenarios",
    r.primaryRule = "address_vigilance_first",
    r.primaryPatternId = "chronic_vigilance",
    r.sequencingNote = "Autonomic down-regulation first (grounding, paced breathing, safety-signal conditioning) to reduce tonic sympathetic activation. This lowers SN threat bias and starves the worry loop. Then attention redirection (rumination protocol). Note: calming tools ARE appropriate here — vigilance is high-arousal, unlike freeze.",
    r.sharedMechanism = "BNST-maintained tonic threat detection biases SN toward threat, which couples with DMN to produce future-oriented worry scenarios rather than neutral self-referential processing",
    r.differentiator = "Ruminative content is FUTURE-ORIENTED (what could go wrong) rather than past-focused (depressive brooding). Body is tense/alert (vigilance) rather than heavy (freeze). Both the mental loop and body tension are present simultaneously.",
    r.evidenceGrade = "Strong",
    r.evidenceNote = "Signature GAD presentation. Worry as cognitive avoidance of somatic anxiety (Borkovec et al.). BNST-DMN coupling in sustained anxiety (Shackman & Fox; Somerville et al.). Well-established in clinical anxiety literature.",
    r.safetyNote = "Sustained anxious rumination is exhausting and can progress to despair. Monitor for transition to hopelessness or 'I can't take this anymore' language.",
    r.contraindicatedTools = ["mindfulness_of_thoughts", "journaling_about_worries", "goal_setting"];


// --------------------------------------------------------
// 2b. SOCIAL THREAT + RUMINATION ("Shame Rumination")
//
// Prevalence: COMMON — social anxiety, rejection sensitivity
//
// Social evaluation threat (mPFC/TPJ modeling negative gaze
// of others) co-occurring with repetitive self-referential
// processing about the social failure/exposure. The person
// is replaying the social event while simultaneously
// experiencing the shame-body (flushing, urge to hide).
//
// Neural mechanism: Social threat activates mPFC self-
// evaluation and TPJ Theory-of-Mind (modeling how others
// see them). The DMN then loops on this self-evaluative
// content: "They must think I'm...", "I can't believe I
// said...", "Everyone noticed when I...". The TPJ's
// perspective-taking capacity is hijacked by the threat
// system to generate increasingly negative models of
// others' judgments.
//
// Sequencing rationale: Address social threat FIRST.
// The shame-body (flushing, behavioral inhibition) is
// maintaining the self-evaluative loop by providing
// continuous somatic evidence that "something is wrong
// with me." Outward-directed sensory contact + self-
// compassion touch (standard social threat protocol)
// breaks the self-focused attention loop that feeds both
// the shame-body and the rumination. Once the shame
// activation decreases, the ruminative content loses
// its emotional charge and becomes more tractable.
//
// Evidence: Clark & Wells (1995, social anxiety model —
// post-event processing); Neff & Germer (self-compassion);
// Eisenberger (2012, social pain); Gilbert (2009,
// compassion-focused therapy for shame)
// --------------------------------------------------------

MATCH (p1:ActivationPattern {id: "social_threat_shame"})
MATCH (p2:ActivationPattern {id: "rumination_loop"})
MERGE (p1)-[r:CO_OCCURS_WITH]->(p2)
SET r.frequency = "common",
    r.clinicalLabel = "shame_rumination",
    r.combinedUserFacingLabel = "You're replaying a social moment, and the shame is keeping the loop going",
    r.primaryRule = "address_social_threat_first",
    r.primaryPatternId = "social_threat_shame",
    r.sequencingNote = "Outward-directed sensory contact + self-compassion touch first (social threat protocol). This breaks self-focused attention that feeds both shame-body and ruminative loop. Once shame activation decreases, ruminative content loses emotional charge. Then external-focus tasks if loop persists.",
    r.sharedMechanism = "TPJ perspective-taking hijacked by threat system to model negative judgments; DMN loops on self-evaluative content fed by mPFC; shame-body provides continuous somatic 'evidence' maintaining the loop",
    r.differentiator = "Ruminative content is specifically SOCIAL-EVALUATIVE ('they must think I'm...', 'everyone noticed when I...'). Body shows shame-specific signature (flushing, urge to hide). Distinct from depressive brooding (loss-focused) and anxious worry (threat-focused).",
    r.evidenceGrade = "Strong",
    r.evidenceNote = "Post-event processing in social anxiety (Clark & Wells 1995) is exactly this co-occurrence — shame activation + ruminative replay of social event. Very well-documented. Self-compassion interventions (Neff & Germer; Gilbert 2009 CFT) target both simultaneously.",
    r.safetyNote = "Shame-rumination combination is associated with chronic low self-worth. Monitor for content shifting from event-specific ('I said something stupid') to global ('I am fundamentally defective') — this signals deepening toward cold shame / freeze.",
    r.contraindicatedTools = ["journaling_about_feelings", "self_focused_meditation", "behavioral_experiments_before_grounding"];


// ============================================================
// SECTION 3: CROSS-QUADRANT CO-OCCURRENCES
//
// These occur when the nervous system is operating across
// arousal zones simultaneously — typically when a high-arousal
// state has been sustained long enough to partially collapse
// into a low-arousal state, or when a traumatic activation
// triggers protective shutdown without fully resolving the
// alarm. These are clinically important because they involve
// CONTRADICTORY physiological states that require careful
// sequencing.
// ============================================================


// --------------------------------------------------------
// 3a. EMOTIONAL FLOODING + DISSOCIATION ("Flooding-Triggered Shutdown")
//
// Prevalence: COMMON in trauma populations
//
// The person was overwhelmed (SN overload, PFC offline)
// and the system's protective response was to dissociate —
// PFC clamped down on the limbic flood. But the flooding
// hasn't fully resolved; the person is simultaneously
// overwhelmed AND disconnected. They may describe being
// "numb but shaking" or "far away but my heart is racing."
//
// Neural mechanism: This is the transition from hyperarousal
// to hypoarousal in the defense cascade (Kozlowska et al.).
// SN overload triggers a PFC protective response that
// dampens limbic signals, but the autonomic activation
// (sympathetic surge) is still present in the body even
// as the person's subjective experience becomes muted.
// The body is in alarm; the mind has disconnected from it.
//
// This is the neurological basis of the dissociative PTSD
// subtype (Lanius 2010, 2012): re-experiencing triggers
// flooding, which triggers dissociative shutdown, producing
// "numb re-experiencing."
//
// Sequencing rationale: Address flooding FIRST with
// autonomic regulation (cold water, paced breathing,
// bilateral stimulation — NOT cognitive tools). Once the
// autonomic activation is reduced, gentle sensory
// reconnection (dissociation protocol) can safely proceed.
// Starting with dissociation tools (which ask the person
// to notice body sensations) when the body is flooded
// risks re-flooding — the sensory reconnection opens
// the gate to the unprocessed autonomic storm.
//
// Evidence: Kozlowska et al. (defense cascade);
// Lanius (2010, 2012, dissociative PTSD subtype);
// van der Kolk (body-centered trauma processing);
// Ogden & Fisher (sensorimotor psychotherapy)
// --------------------------------------------------------

MATCH (p1:ActivationPattern {id: "emotional_flooding"})
MATCH (p2:ActivationPattern {id: "dissociation_overmodulation"})
MERGE (p1)-[r:CO_OCCURS_WITH]->(p2)
SET r.frequency = "common",
    r.clinicalLabel = "flooding_triggered_shutdown",
    r.combinedUserFacingLabel = "Your body is activated, but your mind has pulled away to protect you",
    r.primaryRule = "address_flooding_first",
    r.primaryPatternId = "emotional_flooding",
    r.sequencingNote = "Autonomic down-regulation first (cold water, paced breathing, bilateral stimulation — bottom-up only, NO cognitive tools). Once body activation subsides, then gentle sensory reconnection (dissociation protocol). Do NOT start with interoceptive reconnection — opening the gate to the body while it's flooded risks re-flooding.",
    r.sharedMechanism = "Defense cascade transition: SN overload triggers PFC protective shutdown. Body remains in sympathetic surge while subjective experience is muted. Numb-but-activated.",
    r.differentiator = "Person reports contradictory experiences: 'numb but shaking', 'far away but heart racing', 'can't feel anything but my body won't stop'. Physiological activation + experiential disconnection is the hallmark.",
    r.evidenceGrade = "Strong",
    r.evidenceNote = "Dissociative PTSD subtype (Lanius 2010, 2012). Defense cascade literature (Kozlowska). Well-documented in trauma populations. Sensorimotor psychotherapy (Ogden & Fisher) explicitly sequences autonomic stabilization before interoceptive work.",
    r.safetyNote = "HIGH SAFETY PRIORITY. The dissociative buffer may mask the severity of the autonomic storm. Person appears calm but body is in crisis. If the dissociation lifts suddenly (e.g., from interoceptive reconnection), the full flooding can return immediately. Proceed with extreme caution.",
    r.contraindicatedTools = ["heavy_interoceptive_exposure", "trauma_processing", "affect_labeling", "cognitive_reappraisal"];


// --------------------------------------------------------
// 3b. ACUTE ALARM + DISSOCIATION ("Peritraumatic Dissociation")
//
// Prevalence: OCCASIONAL — associated with traumatic stress
//
// Acute threat response triggers a simultaneous protective
// dissociation. The amygdala is firing (threat detected)
// but PFC is clamping down (disconnecting from the experience).
// Person may feel terrified AND unreal simultaneously.
//
// Neural mechanism: This is the classic peritraumatic
// dissociation response — the defense system detects an
// overwhelming threat and simultaneously activates alarm
// AND protective shutdown. Unlike flooding→dissociation
// (which is a temporal sequence), this can be instantaneous —
// the alarm and dissociation are both primary responses to
// the same trigger.
//
// The Lanius dissociative PTSD subtype model demonstrates
// that some individuals' default threat response includes
// dissociation as a concurrent protective mechanism, not
// just as a downstream consequence of overwhelm.
//
// Sequencing rationale: Address alarm FIRST.
// The acute threat activation needs to be regulated before
// the dissociation can be safely addressed. Grounding and
// safety-signal conditioning (alarm protocol) reduce the
// amygdala-driven activation. Once the alarm subsides,
// the dissociation often resolves spontaneously (it was
// protective, and the protection is no longer needed).
// If it persists, then gentle sensory reconnection.
//
// Evidence: Lanius (2010, 2012, dissociative subtype);
// Peritraumatic dissociation literature (Marmar et al.);
// Bryant et al. (ASD and peritraumatic dissociation)
// --------------------------------------------------------

MATCH (p1:ActivationPattern {id: "acute_alarm"})
MATCH (p2:ActivationPattern {id: "dissociation_overmodulation"})
MERGE (p1)-[r:CO_OCCURS_WITH]->(p2)
SET r.frequency = "occasional",
    r.clinicalLabel = "peritraumatic_dissociation",
    r.combinedUserFacingLabel = "Your alarm system activated and your mind pulled away at the same time — that's a protective response",
    r.primaryRule = "address_alarm_first",
    r.primaryPatternId = "acute_alarm",
    r.sequencingNote = "Grounding and safety-signal conditioning first (alarm protocol — orient to present safety). Once alarm subsides, dissociation often resolves spontaneously since it was protective. If dissociation persists after alarm resolves, then gentle sensory reconnection. Do NOT process the triggering event while either pattern is active.",
    r.sharedMechanism = "Concurrent alarm + protective shutdown. Amygdala threat detection and PFC over-regulation activate simultaneously as dual-response to overwhelming trigger. Not sequential — both primary.",
    r.differentiator = "Person feels terrified AND unreal simultaneously. 'I'm scared but it doesn't feel real' or 'my heart is racing but I feel like I'm watching from outside.' Contradictory arousal states.",
    r.evidenceGrade = "Moderate-Strong",
    r.evidenceNote = "Peritraumatic dissociation is well-documented as a predictor of PTSD (Marmar et al.; Bryant et al.). Lanius (2010, 2012) dissociative subtype demonstrates concurrent alarm + dissociation as stable response pattern.",
    r.safetyNote = "Peritraumatic dissociation is a strong predictor of later PTSD development. If this pattern repeats across multiple check-ins, flag for clinical referral. Do not attempt trauma processing in this state.",
    r.contraindicatedTools = ["trauma_processing", "exposure", "heavy_interoceptive_work", "cognitive_reappraisal"];


// --------------------------------------------------------
// 3c. CHRONIC VIGILANCE + CONSERVATION FREEZE ("Exhaustion Collapse")
//
// Prevalence: OCCASIONAL — burnout, prolonged stress
//
// Sustained hypervigilance has depleted the system's
// resources, leading to a partial collapse into freeze.
// The person is simultaneously "on guard" AND "can't move."
// They feel the urgency to respond to threats but lack the
// energy to act. This is the phenomenology of burnout.
//
// Neural mechanism: Sustained BNST-driven threat monitoring
// maintains cortisol output, which eventually depletes
// available neurotransmitter pools (NE, dopamine, serotonin)
// and triggers HPA axis dysregulation. The system can no
// longer sustain the vigilance — motor and reward systems
// begin to shut down (freeze), but the threat detection
// circuit remains active. The result is a contradictory
// state: high threat-monitoring + low capacity to respond.
//
// Sequencing rationale: Address freeze FIRST.
// The body's energy reserves are depleted. Trying to
// directly calm the vigilance (standard anxiolytic tools)
// demands regulation resources the person doesn't have.
// Gentle proprioceptive up-regulation restores baseline
// body awareness and a minimal sense of agency. Then
// safety-signal conditioning and autonomic settling
// (vigilance protocol) becomes accessible.
//
// Evidence: Maslach & Leiter (burnout model); HPA axis
// dysregulation in chronic stress; allostatic load
// literature (McEwen); Juster et al. (2010)
// --------------------------------------------------------

MATCH (p1:ActivationPattern {id: "chronic_vigilance"})
MATCH (p2:ActivationPattern {id: "conservation_freeze"})
MERGE (p1)-[r:CO_OCCURS_WITH]->(p2)
SET r.frequency = "occasional",
    r.clinicalLabel = "exhaustion_collapse",
    r.combinedUserFacingLabel = "Your system has been on guard for a long time and is running out of fuel",
    r.primaryRule = "address_freeze_first",
    r.primaryPatternId = "conservation_freeze",
    r.sequencingNote = "Gentle proprioceptive up-regulation first (restore baseline body awareness and minimal sense of agency). The system is resource-depleted — demanding cognitive or regulatory effort will fail. Once body is minimally mobilized, then safety-signal conditioning and autonomic settling (vigilance protocol). Also: address sleep and basic needs as top priority.",
    r.sharedMechanism = "Sustained BNST-driven cortisol output depletes neurotransmitter pools and triggers HPA axis dysregulation. Threat detection remains active but response capacity collapses. High monitoring + low capacity.",
    r.differentiator = "Person feels urgency ('I should be doing something') AND inability ('but I can't move'). The 'should' is vigilance; the 'can't' is freeze. Body is simultaneously tense (upper body, scanning) and heavy (limbs, core). Mixed activation.",
    r.evidenceGrade = "Moderate",
    r.evidenceNote = "Burnout literature (Maslach & Leiter). Allostatic load and HPA axis dysregulation in chronic stress (McEwen; Juster et al. 2010). Clinical observation of vigilance-crash cycle well-documented though less neuroimaging evidence for the co-occurring state.",
    r.safetyNote = "Exhaustion collapse often occurs in caregivers, first responders, and individuals in unsafe environments. The 'can't keep going' quality can tip into hopelessness. Consider contextual factors — is the person in an ongoing threatening situation?",
    r.contraindicatedTools = ["deep_breathing", "meditation", "goal_setting", "high_effort_regulatory_tasks"];


// --------------------------------------------------------
// 3d. CHRONIC VIGILANCE + REWARD DRIVE LOW ("Vigilant Anhedonia")
//
// Prevalence: COMMON — comorbid anxiety + depression
//
// Sustained threat monitoring has depleted the reward system.
// The person is simultaneously scanning for threats AND
// unable to experience pleasure. They can't relax (vigilance)
// AND can't enjoy anything (anhedonia). This is the
// quintessential anxious depression presentation.
//
// Neural mechanism: Chronic BNST/amygdala activation
// suppresses NAc/VTA reward signaling through multiple
// pathways: (1) sustained cortisol suppresses dopamine
// synthesis, (2) threat-biased attentional deployment
// starves the reward system of input, (3) sympathetic
// activation inhibits the ventral vagal state needed for
// social reward. The result: threat detection is stuck ON,
// reward detection is stuck OFF.
//
// Sequencing rationale: Address vigilance FIRST.
// The threat-monitoring system is actively suppressing
// the reward system. Behavioral activation (the standard
// anhedonia intervention) fails because the person can't
// engage with rewarding activities while scanning for
// threats. Autonomic down-regulation + safety-signal
// conditioning reduces the threat bias, which releases
// the suppression on the reward system. Then behavioral
// activation becomes possible.
//
// Evidence: Combined anxiety-depression literature;
// Heller et al. (2009, sustained amygdala reactivity
// reduces reward sensitivity); Pizzagalli (2014, stress
// and anhedonia); Treadway & Zald (2013, effort-based
// decision making in depression)
// --------------------------------------------------------

MATCH (p1:ActivationPattern {id: "chronic_vigilance"})
MATCH (p2:ActivationPattern {id: "reward_drive_low"})
MERGE (p1)-[r:CO_OCCURS_WITH]->(p2)
SET r.frequency = "common",
    r.clinicalLabel = "vigilant_anhedonia",
    r.combinedUserFacingLabel = "Your alarm system is running in the background, and it's draining your ability to enjoy things",
    r.primaryRule = "address_vigilance_first",
    r.primaryPatternId = "chronic_vigilance",
    r.sequencingNote = "Autonomic down-regulation + safety-signal conditioning first (vigilance protocol) to reduce threat bias that is actively suppressing reward system. Once body settles, micro-behavioral-activation (reward protocol). Behavioral activation fails while threat-scanning is active — person cannot engage with rewarding activities while on guard.",
    r.sharedMechanism = "Chronic BNST/amygdala activation suppresses NAc/VTA reward signaling: sustained cortisol suppresses dopamine synthesis, threat-biased attention starves reward system of input, sympathetic activation inhibits ventral vagal state needed for social reward",
    r.differentiator = "Person reports BOTH 'I can't relax' (vigilance) AND 'nothing sounds good' (anhedonia). Body is tense but also flat — tense shoulders + no motivation. Distinct from exhaustion collapse (which includes motor immobility) and from pure anhedonia (which lacks the scanning/tension).",
    r.evidenceGrade = "Strong",
    r.evidenceNote = "Anxious depression is one of the most common clinical presentations. Heller et al. (2009) demonstrates sustained amygdala reactivity reduces NAc reward sensitivity. Pizzagalli (2014) reviews stress-anhedonia pathway. Well-supported in comorbidity literature.",
    r.safetyNote = "Combined anxiety + anhedonia is associated with higher treatment resistance and suicidal risk than either alone. The person feels unable to escape threat AND unable to access pleasure — a particularly hopeless phenomenology.",
    r.contraindicatedTools = ["goal_setting", "motivational_framing", "unstructured_meditation"];


// --------------------------------------------------------
// 3e. SOCIAL THREAT + CONSERVATION FREEZE ("Shame Collapse")
//
// Prevalence: COMMON — cold shame presentation
//
// Social evaluation threat has triggered a freeze/collapse
// response rather than the more typical fight-or-flight.
// This is the "cold shame" pathway: instead of flushing
// and wanting to flee (hot shame → social_threat_shame),
// the person collapses, withdraws, and goes still. The
// behavioral inhibition system has overwhelmed the motor
// system entirely.
//
// Neural mechanism: Social threat activates the behavioral
// inhibition system (IFG, premotor cortex suppression).
// In cold shame, this inhibition is so strong that it
// triggers vlPAG-mediated motor shutdown — the full
// conservation/freeze response. The person doesn't just
// want to hide; they can't move. mPFC self-evaluation
// continues (the person is still thinking about how others
// see them) but the motor response has collapsed.
//
// Note: Your emotion schema already has cold_shame in the
// low-unpleasant quadrant and hot_shame in high-unpleasant.
// This co-occurrence is essentially the neural explanation
// for why cold shame lands in a different quadrant —
// the social threat is the same, but the motor response
// is freeze rather than flight.
//
// Sequencing rationale: Address freeze FIRST.
// The person cannot engage with self-compassion or
// outward-directed attention (standard social threat
// protocol) while in motor shutdown. Gentle proprioceptive
// up-regulation restores minimal body engagement. Then
// social-threat-specific tools (self-compassion touch,
// outward sensory contact) become accessible. Crucially:
// do NOT start with tools that increase self-focus (which
// would amplify the shame) or demand social engagement
// (which the behavioral inhibition system is blocking).
//
// Evidence: Gilbert (2009, shame and submission/freeze);
// Porges (social engagement vs immobilization);
// Koch et al. (2023, shame-body response patterns)
// --------------------------------------------------------

MATCH (p1:ActivationPattern {id: "social_threat_shame"})
MATCH (p2:ActivationPattern {id: "conservation_freeze"})
MERGE (p1)-[r:CO_OCCURS_WITH]->(p2)
SET r.frequency = "common",
    r.clinicalLabel = "shame_collapse",
    r.combinedUserFacingLabel = "The weight of being seen has made your whole system go still",
    r.primaryRule = "address_freeze_first",
    r.primaryPatternId = "conservation_freeze",
    r.sequencingNote = "Gentle proprioceptive up-regulation first (restore minimal body engagement). Once minimally mobilized, self-compassion touch + outward sensory contact (social threat protocol). Do NOT start with self-focused tools (amplifies shame) or social engagement demands (behavioral inhibition system is blocking this). Warmth is especially helpful — warm beverage, blanket — signals safety without social demand.",
    r.sharedMechanism = "Behavioral inhibition (IFG/premotor suppression) from social threat is so strong it triggers vlPAG motor shutdown. Social evaluation continues (mPFC active) but motor system has collapsed. The shame is driving the freeze.",
    r.differentiator = "The cold_shame emotion in low-unpleasant quadrant is the subjective marker. Person reports social/evaluative content ('I'm worthless', 'everyone sees how broken I am') combined with physical collapse and withdrawal. Distinct from pure freeze (no social content) and pure social threat (has motor engagement — wants to flee/hide, CAN move).",
    r.evidenceGrade = "Moderate-Strong",
    r.evidenceNote = "Gilbert (2009) CFT model explicitly describes shame-freeze pathway via submission/appeasement system. Cold shame as distinct from hot shame in clinical observation. Koch et al. (2023) shame-body response. Emotion schema already separates hot/cold shame across quadrants.",
    r.safetyNote = "Shame collapse is strongly associated with chronic self-worth deficits and suicidal ideation. The 'I am fundamentally defective' cognition combined with immobility creates a trapped-in-defectiveness experience. Monitor for hopelessness.",
    r.contraindicatedTools = ["journaling", "self_focused_meditation", "social_exposure", "goal_setting", "deep_breathing"];


// ============================================================
// SECTION 4: CROSS-QUADRANT TRIPLE CO-OCCURRENCE NOTE
//
// In rare cases, THREE patterns may be active simultaneously.
// The most clinically significant triple is:
//   chronic_vigilance + reward_drive_low + rumination_loop
//   ("exhausted anxious depression")
//
// This is modeled by the PAIRWISE co-occurrences above:
//   vigilance + reward_drive_low = "vigilant_anhedonia"
//   reward_drive_low + rumination = "anhedonic_rumination"
//   vigilance + rumination = "worried_rumination"
//
// The cloud function should detect when multiple CO_OCCURS_WITH
// pairs are simultaneously plausible and apply the combined
// sequencing: vigilance first (reduce threat bias) → reward
// activation (restore dopamine signaling) → rumination
// redirection (engage CEN once there's something to engage with).
//
// This does NOT require a new relationship type — it's handled
// by the cloud function combining pairwise CO_OCCURS_WITH data.
// The primaryRule cascade is:
//   1. Highest-arousal pattern first (vigilance > freeze)
//   2. Body regulation before cognitive intervention
//   3. Reward engagement before attention redirection
// ============================================================


// ============================================================
// SECTION 5: VALIDATION QUERIES
//
// Run these to verify schema integrity after seeding.
// ============================================================

// 5a. Every CO_OCCURS_WITH should connect two ActivationPatterns
// MATCH (a)-[r:CO_OCCURS_WITH]->(b)
// WHERE NOT (a:ActivationPattern) OR NOT (b:ActivationPattern)
// RETURN "CO_OCCURS_WITH between non-patterns" AS issue,
//        labels(a) AS source_labels, labels(b) AS target_labels;

// 5b. No self-loops
// MATCH (a:ActivationPattern)-[r:CO_OCCURS_WITH]->(a)
// RETURN "Self-loop CO_OCCURS_WITH" AS issue, a.id AS pattern_id;

// 5c. Every CO_OCCURS_WITH should have a primaryPatternId
//     that matches one of the two connected patterns
// MATCH (a:ActivationPattern)-[r:CO_OCCURS_WITH]->(b:ActivationPattern)
// WHERE r.primaryPatternId IS NULL
//    OR (r.primaryPatternId <> a.id AND r.primaryPatternId <> b.id)
// RETURN "Invalid primaryPatternId" AS issue,
//        a.id AS pattern_a, b.id AS pattern_b,
//        r.primaryPatternId AS declared_primary;

// 5d. No duplicate CO_OCCURS_WITH between same pair
// MATCH (a:ActivationPattern)-[r1:CO_OCCURS_WITH]->(b:ActivationPattern)
// MATCH (a)-[r2:CO_OCCURS_WITH]->(b)
// WHERE id(r1) < id(r2)
// RETURN "Duplicate CO_OCCURS_WITH" AS issue,
//        a.id AS pattern_a, b.id AS pattern_b;

// 5e. Verify no overlap with CAN_ESCALATE_TO
//     (same pair should not have both relationship types
//      in the same direction — though A→B escalation and
//      A↔B co-occurrence ARE valid if properly documented)
// MATCH (a:ActivationPattern)-[r1:CO_OCCURS_WITH]->(b:ActivationPattern)
// MATCH (a)-[r2:CAN_ESCALATE_TO]->(b)
// RETURN "Pair has both CO_OCCURS_WITH and CAN_ESCALATE_TO" AS warning,
//        a.id AS pattern_a, b.id AS pattern_b,
//        r1.clinicalLabel AS cooccurrence_label,
//        r2.mechanism AS escalation_mechanism;