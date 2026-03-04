// ============================================================
// DISCRIMINATING QUESTIONS SCHEMA
// schema/discriminating-questions.cypher
//
// PURPOSE:
// When a user lands in a quadrant with multiple candidate activation
// patterns (especially low-unpleasant with 4 very different states),
// emotion labels alone are insufficient to determine which pattern
// is driving the experience. This schema adds phenomenological
// follow-up questions whose responses provide weighted evidence
// toward specific patterns, dramatically improving recommendation
// accuracy.
//
// ARCHITECTURE:
//   (DiscriminatingQuestion)-[:HAS_RESPONSE]->(QuestionResponse)
//   (QuestionResponse)-[:EVIDENCE_FOR {weight, ...}]->(ActivationPattern)
//   (QuestionResponse)-[:TRIGGERS_NEXT]->(DiscriminatingQuestion)
//
// The cloud function queries applicable questions by quadrant,
// presents them in order, accumulates EVIDENCE_FOR weights across
// responses, and combines them with the existing emotion-based
// scoring to select primary (and optionally secondary) patterns.
//
// CLINICAL RATIONALE:
// These questions target the three phenomenological dimensions that
// reliably separate co-quadrant patterns in clinical assessment:
//
//   1. MENTAL ACTIVITY — busy/looping vs quiet/blank vs disconnected
//      (Separates DMN-hyperactive rumination from PAG-mediated freeze
//       and PFC-overmodulated dissociation)
//
//   2. BODY EXPERIENCE — heavy/immobilized vs flat/amotivated vs numb/absent
//      (Separates motor-inhibition freeze from striatal-blunting anhedonia
//       from interoceptive disconnection in dissociation)
//
//   3. EXPERIENTIAL TRIGGER — alarm vs sustained worry vs social vs flooding
//      (Separates phasic amygdala response from BNST-driven vigilance
//       from social-evaluation threat from SN-overload)
//
// CONVENTIONS:
// - MERGE for idempotency (safe to re-run)
// - Properties overwritten via SET after MERGE
// - Node labels: PascalCase
// - Node ids: snake_case
// - Relationship types: SCREAMING_SNAKE
// - Each chunk is self-contained (Aura requirement: no assumed variable
//   persistence across executions)
//
// EVIDENCE:
// - Mental activity dimension: Hamilton et al. (2015) DMN-rumination
//   meta-analysis; Roelofs (2017) freeze/cognitive suppression;
//   Lanius (2010, 2012) dissociative subtype phenomenology
// - Body experience dimension: Kozlowska et al. defense cascade
//   (motor inhibition); Keren et al. (2018) reward/striatal blunting;
//   Lanius (2010) interoceptive disconnection in dissociation
// - Trigger quality dimension: Shin & Liberzon (2010) phasic vs
//   sustained threat; Somerville et al. BNST threat proximity;
//   Eisenberger (2012) social pain; SN overload literature
//
// LAST UPDATED: 2026-03-02
// ============================================================


// ============================================================
// SECTION 1: LOW-UNPLEASANT — QUESTION 1 (MENTAL ACTIVITY)
//
// This is the highest-value discriminating question in the entire
// system. It immediately splits four patterns into interpretable
// clusters:
//
//   "Stuck on replay" → rumination_loop (DMN hyperactive)
//   "Quiet or blank"  → conservation_freeze OR reward_drive_low
//   "Far away/unreal" → dissociation_overmodulation (PFC over-suppression)
//   "I'm not sure"    → freeze OR dissociation (impaired introspection)
//
// Clinical basis: The subjective experience of mental activity
// tracks DMN activation (Hamilton et al., 2015). Freeze produces
// cognitive quieting via PAG-mediated global dampening (Roelofs,
// 2017). Dissociation produces a characteristic "watching from
// outside" quality via PFC over-regulation (Lanius, 2010).
// Low reward drive produces mental flatness without the immobility
// or unreality qualities — "nothing to think about" rather than
// "can't think" or "thinking from far away."
// ============================================================

MERGE (q:DiscriminatingQuestion {id: "lu_mind_quality"})
SET q.text = "Right now, my mind feels...",
    q.subtext = "There's no wrong answer — just pick what's closest.",
    q.applicableQuadrants = ["low-unpleasant"],
    q.order = 1,
    q.required = true,
    q.clinicalDimension = "mental_activity",
    q.clinicalRationale = "Subjective mental activity tracks DMN activation state and separates rumination (DMN hyperactive) from freeze (global dampening) from dissociation (PFC over-regulation) from anhedonia (striatal blunting). Highest single-question discriminating power for low-unpleasant quadrant.",
    q.keyCitations = ["Hamilton et al. (2015, DMN-rumination)", "Roelofs (2017, freeze cognition)", "Lanius (2010, dissociative phenomenology)", "Keren et al. (2018, reward blunting)"];


// --- Response: Stuck on replay ---
// Strong signal for rumination. DMN is hyperactive with sgACC coupling,
// producing repetitive self-referential thought. The person is aware
// their mind is busy — this is NOT an inference, it's a direct report
// of the hallmark feature.
//
// Note: In rare cases, freeze_high_arousal subtype can include
// intrusive thought fragments, but these lack the self-referential
// looping quality. The "replay" framing specifically targets DMN
// self-referential processing, not intrusive trauma fragments.

MERGE (r:QuestionResponse {id: "lu_mind_looping"})
SET r.label = "Stuck on replay",
    r.subtext = "Same thoughts circling — I can't stop going over things.",
    r.order = 1,
    r.clinicalSignal = "Active self-referential processing; DMN-sgACC coupling; mind is busy with negative-valence content. Hallmark phenomenology of depressive brooding and anxious worry.",
    r.isEscapeHatch = false;


// --- Response: Quiet or blank ---
// Ambiguous between freeze and low reward drive. Both produce reduced
// mental activity, but through different mechanisms:
//   - Freeze: PAG-mediated global dampening suppresses cognition
//     along with motor output. Mind goes quiet because the whole
//     system went quiet. Often accompanied by body heaviness.
//   - Low reward: Striatal blunting means nothing is salient enough
//     to generate thought. Mind is quiet because nothing pulls
//     attention. Often accompanied by "nothing sounds good."
//
// This response ALWAYS triggers Q2 (body quality) for disambiguation.

MERGE (r:QuestionResponse {id: "lu_mind_blank"})
SET r.label = "Quiet or blank",
    r.subtext = "Not much going on up there — just... empty.",
    r.order = 2,
    r.clinicalSignal = "Reduced cognitive activity. Ambiguous between PAG-mediated global dampening (freeze) and ventral striatal blunting (anhedonia). Requires body-experience follow-up for disambiguation.",
    r.isEscapeHatch = false;


// --- Response: Far away or unreal ---
// Strong signal for dissociation. The "watching from outside" or
// "behind glass" quality is the phenomenological hallmark of
// depersonalization/derealization, driven by PFC over-suppression
// of limbic signals (Lanius, 2010, 2012).
//
// Distinction from freeze: freeze produces ABSENCE of experience
// (things go blank). Dissociation produces ALTERED experience
// (things feel unreal, distant, dreamlike). The person is still
// processing — but from a disconnected vantage point.
//
// Weak secondary signal for freeze: thalamic suppression in
// severe freeze can produce mild unreality, but without the
// characteristic "observer" quality.

MERGE (r:QuestionResponse {id: "lu_mind_faraway"})
SET r.label = "Far away or unreal",
    r.subtext = "Like I'm behind glass, or watching from the outside.",
    r.order = 3,
    r.clinicalSignal = "Depersonalization/derealization phenomenology. PFC actively over-suppressing limbic signals. Distinct from freeze blankness — person is still processing but from disconnected vantage point. Hallmark of dissociative subtype (Lanius 2010, 2012).",
    r.isEscapeHatch = false;


// --- Response: I'm not sure ---
// This IS clinically informative. Difficulty accessing one's own
// mental state (poor metacognitive clarity) itself suggests either:
//   - Freeze: global dampening reduces conscious access to internal
//     states. Thalamic suppression narrows the bandwidth of
//     information reaching cortical awareness.
//   - Dissociation: interoceptive disconnection via PFC over-regulation
//     impairs self-knowledge. The person is "cut off" from their
//     own experience.
//   - Less likely reward_drive_low: anhedonic individuals can usually
//     describe their mind as flat/empty — they have metacognitive
//     access, just nothing to report.
//
// This response ALWAYS triggers Q2 for disambiguation.

MERGE (r:QuestionResponse {id: "lu_mind_unsure"})
SET r.label = "I'm not sure",
    r.subtext = "I can't really tell what my mind is doing right now.",
    r.order = 4,
    r.clinicalSignal = "Impaired metacognitive access. Itself a discriminating signal — suggests thalamic suppression (freeze) or interoceptive disconnection (dissociation). Less consistent with rumination (high metacognitive access) or anhedonia (preserved metacognition, just nothing salient).",
    r.isEscapeHatch = true;


// ============================================================
// SECTION 2: LOW-UNPLEASANT — QUESTION 2 (BODY EXPERIENCE)
//
// Conditionally triggered when Q1 does not resolve to a single
// high-confidence pattern. Shown when Q1 response was:
//   - "Quiet or blank" (ambiguous between freeze and reward_drive_low)
//   - "I'm not sure" (ambiguous between freeze and dissociation)
//
// NOT shown when Q1 response was:
//   - "Stuck on replay" (sufficient confidence for rumination_loop)
//   - "Far away or unreal" (sufficient confidence for dissociation)
//
// This question targets the somatic dimension, which cleanly
// separates the remaining candidates:
//
//   Heavy/stuck  → conservation_freeze (motor cortex suppression,
//                   vlPAG-mediated immobility; Roelofs 2017)
//   Flat/nothing → reward_drive_low (no physical immobility, just
//                   absence of motivational pull; NAc blunting)
//   Numb/absent  → dissociation (interoceptive disconnection;
//                   body feels "not mine"; Lanius 2010)
//
// Clinical basis: These three somatic profiles map to distinct
// neural mechanisms:
//   - Motor inhibition (freeze): vlPAG → motor cortex suppression
//     produces subjective heaviness and inability to initiate movement
//   - Motivational blunting (anhedonia): NAc/VTA suppression removes
//     the "wanting" signal without physical constraint — person CAN
//     move, but nothing pulls them to
//   - Interoceptive suppression (dissociation): PFC over-regulation of
//     insula/somatosensory signals produces body disconnection — not
//     heavy, not flat, but ABSENT
// ============================================================

MERGE (q:DiscriminatingQuestion {id: "lu_body_quality"})
SET q.text = "My body feels...",
    q.subtext = "Focus on the physical sensation, not the emotion.",
    q.applicableQuadrants = ["low-unpleasant"],
    q.order = 2,
    q.required = false,
    q.clinicalDimension = "somatic_experience",
    q.clinicalRationale = "Somatic experience separates motor inhibition (freeze → heaviness via vlPAG/motor cortex suppression), motivational blunting (anhedonia → flatness without physical constraint via NAc/VTA suppression), and interoceptive disconnection (dissociation → body absence via PFC over-regulation of insula). These are three distinct neural mechanisms with distinct subjective body signatures.",
    q.keyCitations = ["Roelofs (2017, freeze/motor inhibition)", "Kozlowska et al. (defense cascade)", "Keren et al. (2018, reward blunting)", "Lanius (2010, interoceptive disconnection)", "Paulus et al. (2019, interoception)"];


// --- Response: Heavy or stuck ---
// Strong signal for conservation_freeze. Subjective heaviness and
// immobility are the somatic hallmarks of vlPAG-mediated freeze.
// Motor cortex suppression produces the "can't move" quality.
// This is the "can't" pole of the can't/don't-want-to distinction.
//
// Key differentiator: The person WANTS to move but CANNOT.
// In reward_drive_low, the person CAN move but DOESN'T WANT TO.
// This maps to the motor-inhibition vs motivational-blunting
// distinction at the neural level.

MERGE (r:QuestionResponse {id: "lu_body_heavy"})
SET r.label = "Heavy or stuck",
    r.subtext = "Like there's a weight on me — I can't make myself move.",
    r.order = 1,
    r.clinicalSignal = "Motor inhibition via vlPAG → motor cortex suppression. Subjective heaviness + inability to initiate movement. The 'can't' pole (vs 'don't want to'). Hallmark somatic signature of conservation/freeze.",
    r.isEscapeHatch = false;


// --- Response: Flat, nothing sounds good ---
// Strong signal for reward_drive_low. The key phenomenological
// feature is ABSENCE OF PULL — not physical constraint.
// The person can move (no motor inhibition) but nothing is
// salient enough to motivate action.
//
// NAc/VTA suppression reduces the "wanting" signal. Dorsal
// striatum suppression impairs goal initiation. The body doesn't
// feel heavy or stuck — it feels available but purposeless.
//
// This is the "don't want to" / "what's the point" pole.

MERGE (r:QuestionResponse {id: "lu_body_flat"})
SET r.label = "Flat — nothing sounds good",
    r.subtext = "I could move, but nothing pulls me to. What's the point.",
    r.order = 2,
    r.clinicalSignal = "Absence of motivational pull without motor inhibition. NAc/VTA suppression removes 'wanting' signal. Dorsal striatum suppression impairs goal initiation. Body available but purposeless. The 'don't want to' / 'what's the point' pole.",
    r.isEscapeHatch = false;


// --- Response: Numb or disconnected from body ---
// Strong signal for dissociation. Interoceptive disconnection —
// the body feels "not mine" or absent. This is distinct from:
//   - Freeze heaviness (body is very present, just immobilized)
//   - Anhedonic flatness (body is neutral, just unmotivated)
//
// PFC over-regulation of insula and somatosensory signals
// produces a characteristic "cut off from below the neck" quality.
// The person may report not feeling pain, temperature, or even
// knowing where their limbs are.
//
// Secondary weak signal for freeze: thalamic suppression in
// severe freeze can dampen somatosensory signals, but this
// co-occurs with heaviness rather than the "absent body" quality.

MERGE (r:QuestionResponse {id: "lu_body_numb"})
SET r.label = "Numb or disconnected",
    r.subtext = "Like my body isn't quite mine — or I can't feel it well.",
    r.order = 3,
    r.clinicalSignal = "Interoceptive disconnection via PFC over-regulation of insula/somatosensory cortex. Body feels 'not mine' or absent. Distinct from freeze (body present but immobilized) and anhedonia (body neutral but available). Hallmark of dissociative overmodulation (Lanius 2010).",
    r.isEscapeHatch = false;


// --- Response: I can't really tell ---
// Difficulty reporting body state is itself diagnostic.
// Most consistent with:
//   - Freeze: thalamic suppression reduces sensory bandwidth
//     reaching cortical awareness. Person can't report because
//     the signal isn't getting through.
//   - Dissociation: PFC actively suppressing interoceptive signals.
//     Person can't report because they're cut off.
//   - Less likely anhedonia: anhedonic individuals typically CAN
//     report body state (just "nothing much" / "fine"), because
//     interoceptive channels are intact — it's the reward
//     valuation that's suppressed, not the sensory pipeline.

MERGE (r:QuestionResponse {id: "lu_body_unclear"})
SET r.label = "I can't really tell",
    r.subtext = "I'm not sure what my body feels like right now.",
    r.order = 4,
    r.clinicalSignal = "Impaired interoceptive reporting. Suggests disrupted body-to-brain signaling: thalamic suppression (freeze) or PFC over-regulation of interoceptive signals (dissociation). Less consistent with anhedonia where interoceptive channels are intact but reward valuation is suppressed.",
    r.isEscapeHatch = true;


// ============================================================
// SECTION 3: HIGH-UNPLEASANT — QUESTION 1 (EXPERIENTIAL QUALITY)
//
// The high-unpleasant quadrant has four candidate patterns:
//   - acute_alarm (phasic amygdala-driven threat response)
//   - chronic_vigilance (sustained BNST-driven anticipatory threat)
//   - emotional_flooding (SN overload, PFC offline)
//   - social_threat_shame (social evaluation threat, behavioral inhibition)
//
// These are distinguishable along two primary dimensions:
//   1. Trigger quality: specific threat vs diffuse worry vs social vs overwhelm
//   2. Temporal pattern: sudden onset vs always-on vs acute overload
//
// This question combines both dimensions into a single selection,
// because for high-arousal states, cognitive load must be minimized.
// The person's PFC may already be compromised — one clear question
// is better than two nuanced ones.
//
// Clinical basis:
//   - Acute alarm: amygdala-driven phasic response to identifiable
//     threat. Person can usually name what triggered it.
//     (Shin & Liberzon, 2010; LeDoux, 2016)
//   - Chronic vigilance: BNST-driven sustained anticipatory threat.
//     Person reports "always on," can't identify single trigger.
//     (Somerville et al., BNST threat proximity; Shackman & Fox)
//   - Social threat: distinct neural signature involving mPFC
//     self-evaluation, TPJ Theory-of-Mind engagement, and dACC/
//     insula social pain. Trigger is specifically social.
//     (Eisenberger 2012; Piretti et al. 2023)
//   - Emotional flooding: SN hyperreactivity with OFC/PFC offline.
//     Person cannot sort or label emotions. Everything at once.
//     (Shin & Liberzon 2010; SN hyperreactivity literature)
// ============================================================

MERGE (q:DiscriminatingQuestion {id: "hu_experience_quality"})
SET q.text = "What's happening feels like...",
    q.subtext = "Go with your gut — don't overthink it.",
    q.applicableQuadrants = ["high-unpleasant"],
    q.order = 1,
    q.required = true,
    q.clinicalDimension = "experiential_trigger_quality",
    q.clinicalRationale = "Combines trigger quality and temporal pattern into a single question to minimize cognitive load in high-arousal states. Separates phasic amygdala response (identifiable trigger) from BNST-driven sustained threat (diffuse, always-on) from social evaluation threat (social trigger) from SN overload (everything at once, can't sort).",
    q.keyCitations = ["Shin & Liberzon (2010, phasic vs sustained)", "Somerville et al. (BNST threat proximity)", "Eisenberger (2012, social pain)", "Piretti et al. (2023, social threat meta-analysis)", "LeDoux (2016, threat circuits)"];


// --- Response: My alarm went off — something feels wrong ---
// Moderate-strong signal for acute_alarm. Phasic threat response
// with identifiable onset. Person can usually point to what
// triggered it (even if the trigger is internal, like a body
// sensation or memory).
//
// Weak secondary signal for emotional_flooding: if the trigger
// was intense enough, it may have overwhelmed regulation.
// But the key differentiator is: can the person SORT their
// experience? Acute alarm = yes (one clear emotion: fear/threat).
// Flooding = no (everything at once).

MERGE (r:QuestionResponse {id: "hu_exp_alarm"})
SET r.label = "My alarm went off",
    r.subtext = "Something triggered it — I feel on edge or afraid.",
    r.order = 1,
    r.clinicalSignal = "Phasic threat response with identifiable onset. Amygdala-driven, person can usually identify trigger. Differentiate from flooding by ability to sort experience (alarm = one clear emotion; flooding = everything at once).",
    r.isEscapeHatch = false;


// --- Response: A worry that won't turn off ---
// Strong signal for chronic_vigilance. BNST-driven sustained
// anticipatory threat processing. The defining feature is
// PERSISTENCE — the person can't identify a single trigger
// because the threat detection is continuous and diffuse.
//
// Key distinction from acute_alarm: alarm is PHASIC (something
// happened), vigilance is TONIC (always happening). Alarm has
// a start point; vigilance feels like it's always been there.
// This maps to the amygdala (phasic) vs BNST (sustained)
// distinction (Somerville et al.; Klumpers et al.).

MERGE (r:QuestionResponse {id: "hu_exp_vigilance"})
SET r.label = "A worry that won't turn off",
    r.subtext = "Always running in the background — I can't relax.",
    r.order = 2,
    r.clinicalSignal = "Sustained anticipatory threat processing. BNST-driven tonic threat detection (vs amygdala phasic response). Defining feature is persistence and diffuseness — person cannot identify single trigger because threat monitoring is continuous.",
    r.isEscapeHatch = false;


// --- Response: About what others think of me ---
// Strong signal for social_threat_shame. Social evaluation threat
// has a distinct neural signature: mPFC self-evaluation, TPJ
// Theory-of-Mind (modeling others' negative gaze), dACC/insula
// social pain (Eisenberger 2012).
//
// The trigger is specifically SOCIAL — judgment, rejection,
// evaluation, exposure. Behavioral inhibition system engages
// (urge to hide/flee). This is categorically different from
// environmental threat (alarm/vigilance) or emotional overload
// (flooding).
//
// Note: shame can present as high-arousal (hot shame: flushing,
// wanting to flee) or low-arousal (cold shame: collapse, withdrawal).
// This question catches the high-arousal presentation. Cold shame
// would land in low-unpleasant and be caught by the freeze/
// dissociation pathway.

MERGE (r:QuestionResponse {id: "hu_exp_social"})
SET r.label = "About what others think of me",
    r.subtext = "Judgment, rejection, or being seen in a way I can't handle.",
    r.order = 3,
    r.clinicalSignal = "Social evaluation threat with distinct neural signature: mPFC self-evaluation, TPJ Theory-of-Mind engagement (modeling negative gaze of others), dACC/insula social pain. Behavioral inhibition system engaged (urge to hide). Categorically distinct from environmental threat or emotional overload.",
    r.isEscapeHatch = false;


// --- Response: Everything hitting at once ---
// Strong signal for emotional_flooding. The defining feature is
// LOSS OF EMOTION SORTING — OFC is offline, so the person cannot
// differentiate or label what they're feeling. SN is overloaded,
// producing a "fire alarm for everything" state.
//
// Key differentiator from acute_alarm: in alarm, the person
// can identify what they feel (fear, threat, specific emotion).
// In flooding, they CANNOT sort it — it's all happening
// simultaneously and the regulatory system has failed.
//
// Key differentiator from chronic_vigilance: vigilance is
// diffuse but MANAGEABLE (person can still function, just
// uncomfortably). Flooding is acute OVERWHELM — functioning
// has broken down.

MERGE (r:QuestionResponse {id: "hu_exp_flooding"})
SET r.label = "Everything hitting at once",
    r.subtext = "I can't sort it out — too many feelings, can't think straight.",
    r.order = 4,
    r.clinicalSignal = "Salience network overload with OFC offline. Defining feature is loss of emotion differentiation — person cannot label or sort experience. Distinct from alarm (one identifiable emotion) and vigilance (diffuse but manageable). PFC regulatory failure.",
    r.isEscapeHatch = false;


// --- Response: I don't know what triggered it ---
// Ambiguous. Could be:
//   - Acute alarm with unconscious trigger (implicit memory,
//     interoceptive cue, environmental trigger below awareness)
//   - Chronic vigilance (diffuse = hard to pinpoint trigger)
//   - Flooding (can't sort = can't identify trigger either)
//
// This response triggers Q2 (body experience) for disambiguation.
// Body signals are often more accessible than cognitive appraisal
// in high-arousal states, because interoception survives PFC
// compromise better than metacognition.

MERGE (r:QuestionResponse {id: "hu_exp_unsure"})
SET r.label = "I don't know what triggered it",
    r.subtext = "Something's wrong but I can't name what started it.",
    r.order = 5,
    r.clinicalSignal = "Ambiguous trigger. Could be unconscious/implicit trigger (alarm), diffuse sustained threat (vigilance), or metacognitive failure (flooding). Body-experience follow-up leverages interoception which survives PFC compromise better than metacognition.",
    r.isEscapeHatch = true;


// ============================================================
// SECTION 4: HIGH-UNPLEASANT — QUESTION 2 (BODY IN ACTIVATION)
//
// Conditionally triggered when Q1 does not resolve to a single
// high-confidence pattern. Shown when Q1 response was:
//   - "My alarm went off" (could be acute alarm or early flooding)
//   - "I don't know what triggered it" (fully ambiguous)
//
// NOT shown when Q1 response was:
//   - "A worry that won't turn off" (sufficient for vigilance)
//   - "About what others think" (sufficient for social threat)
//   - "Everything at once" (sufficient for flooding)
//
// This question uses body state as the discriminator. In high-arousal
// states, somatic signals are often MORE accessible than cognitive
// appraisal (interoception survives sympathetic activation better
// than executive metacognition).
//
// Clinical basis:
//   - Acute alarm: sympathetic surge → racing heart, shallow breathing,
//     hyperalertness. LC-NE system engaged. (Reyes et al. 2025)
//   - Chronic vigilance: sustained muscle tension, scanning behavior,
//     inability to release guard. BNST-maintained. (Shackman & Fox)
//   - Emotional flooding: autonomic overflow → shaking, crying,
//     trembling, or paradoxical shutdown. SN overload. (Shin & Liberzon)
//   - Social threat: facial/chest flushing (shame-specific vasodilation),
//     urge to hide or make oneself small. Behavioral inhibition
//     system. (Piretti et al. 2023; Eisenberger 2012)
// ============================================================

MERGE (q:DiscriminatingQuestion {id: "hu_body_activation"})
SET q.text = "In my body right now...",
    q.subtext = "What do you notice most?",
    q.applicableQuadrants = ["high-unpleasant"],
    q.order = 2,
    q.required = false,
    q.clinicalDimension = "somatic_activation_quality",
    q.clinicalRationale = "Body state discriminates high-arousal patterns when trigger quality is ambiguous. Interoception survives sympathetic activation better than executive metacognition. Each pattern has a distinct somatic signature: sympathetic surge (alarm), sustained tension (vigilance), autonomic overflow (flooding), shame-specific vasodilation and behavioral inhibition (social threat).",
    q.keyCitations = ["Reyes et al. (2025, LC-NE)", "Shackman & Fox (extended amygdala)", "Shin & Liberzon (2010)", "Piretti et al. (2023)", "Eisenberger (2012, social pain)"];


// --- Response: Heart racing, on alert ---
// Strong signal for acute_alarm. Sympathetic surge with
// identifiable onset. LC-NE system driving hyperarousal.
// Person feels wired, alert, ready-to-respond.

MERGE (r:QuestionResponse {id: "hu_body_racing"})
SET r.label = "Heart racing, on alert",
    r.subtext = "Wired up — shallow breathing, can't sit still.",
    r.order = 1,
    r.clinicalSignal = "Acute sympathetic surge. LC-NE driven hyperarousal. Phasic fight-or-flight activation with characteristic cardiac acceleration and respiratory changes.",
    r.isEscapeHatch = false;


// --- Response: Tense everywhere, scanning ---
// Strong signal for chronic_vigilance. Sustained muscle
// tension maintained by BNST-driven anticipatory threat.
// Unlike acute alarm's SURGE, this is GRIP — the body
// won't release.

MERGE (r:QuestionResponse {id: "hu_body_tense"})
SET r.label = "Tense everywhere, scanning",
    r.subtext = "Tight muscles, on guard — my body won't let go.",
    r.order = 2,
    r.clinicalSignal = "Sustained muscle tension maintained by BNST-driven anticipatory threat processing. Distinct from acute alarm surge — this is tonic grip, not phasic activation. Attentional deployment to potential threats.",
    r.isEscapeHatch = false;


// --- Response: Shaking, crying, or overwhelmed ---
// Strong signal for emotional_flooding. Autonomic overflow
// where the body's regulatory capacity has been exceeded.
// Can manifest as shaking, uncontrollable crying, trembling,
// or paradoxical freeze (body shutting down from overload,
// distinct from conservation_freeze PAG-mediated shutdown).

MERGE (r:QuestionResponse {id: "hu_body_overwhelmed"})
SET r.label = "Shaking, crying, or overwhelmed",
    r.subtext = "My body is doing things I can't control right now.",
    r.order = 3,
    r.clinicalSignal = "Autonomic overflow — regulatory capacity exceeded. SN hyperreactivity producing motor discharge (shaking, trembling) or parasympathetic rebound (crying). Distinct from alarm (activation with control) and vigilance (activation with containment).",
    r.isEscapeHatch = false;


// --- Response: Heat in face/chest, want to hide ---
// Moderate-strong signal for social_threat_shame. Facial and
// upper-chest flushing is relatively specific to shame — it's
// a vasodilation response linked to the behavioral inhibition
// system. The urge to hide/shrink/disappear is the action
// tendency of shame (distinct from fear's urge to flee and
// anger's urge to approach).
//
// Included in Q2 because sometimes the social trigger isn't
// conscious. A person may say "I don't know what triggered it"
// in Q1 but then recognize the shame-body in Q2.

MERGE (r:QuestionResponse {id: "hu_body_shame"})
SET r.label = "Heat in face or chest, want to hide",
    r.subtext = "Flushing, shrinking — I want to disappear.",
    r.order = 4,
    r.clinicalSignal = "Shame-specific vasodilation (facial/upper-chest flushing) with behavioral inhibition (urge to hide, make oneself small). Relatively specific to social evaluation threat. Included here because social trigger may not be conscious — person may recognize shame in body before cognition.",
    r.isEscapeHatch = false;


// --- Response: I can't tell, it's all too much ---
// Ambiguous but itself informative — inability to parse body
// state in high arousal suggests PFC compromise, pointing
// toward flooding. Also possible in severe acute alarm where
// LC-NE activation is so high that interoceptive discrimination
// degrades.

MERGE (r:QuestionResponse {id: "hu_body_unclear"})
SET r.label = "I can't tell — it's all too much",
    r.subtext = "Everything's activated and I can't sort it out.",
    r.order = 5,
    r.clinicalSignal = "Interoceptive discrimination failure under high arousal. Most consistent with PFC compromise (flooding) or extreme LC-NE activation (severe alarm). Inability to parse body state is itself a signal of regulatory system overload.",
    r.isEscapeHatch = true;


// ============================================================
// SECTION 5: HAS_RESPONSE RELATIONSHIPS
//
// Links each DiscriminatingQuestion to its response options.
// The order property on the relationship matches the order
// property on the QuestionResponse node (redundant for safety,
// since Aura queries may not preserve node property access
// in all ORDER BY contexts).
// ============================================================

// --- Low-unpleasant Q1 → responses ---
MATCH (q:DiscriminatingQuestion {id: "lu_mind_quality"})
MATCH (r:QuestionResponse {id: "lu_mind_looping"})
MERGE (q)-[:HAS_RESPONSE {order: 1}]->(r);

MATCH (q:DiscriminatingQuestion {id: "lu_mind_quality"})
MATCH (r:QuestionResponse {id: "lu_mind_blank"})
MERGE (q)-[:HAS_RESPONSE {order: 2}]->(r);

MATCH (q:DiscriminatingQuestion {id: "lu_mind_quality"})
MATCH (r:QuestionResponse {id: "lu_mind_faraway"})
MERGE (q)-[:HAS_RESPONSE {order: 3}]->(r);

MATCH (q:DiscriminatingQuestion {id: "lu_mind_quality"})
MATCH (r:QuestionResponse {id: "lu_mind_unsure"})
MERGE (q)-[:HAS_RESPONSE {order: 4}]->(r);

// --- Low-unpleasant Q2 → responses ---
MATCH (q:DiscriminatingQuestion {id: "lu_body_quality"})
MATCH (r:QuestionResponse {id: "lu_body_heavy"})
MERGE (q)-[:HAS_RESPONSE {order: 1}]->(r);

MATCH (q:DiscriminatingQuestion {id: "lu_body_quality"})
MATCH (r:QuestionResponse {id: "lu_body_flat"})
MERGE (q)-[:HAS_RESPONSE {order: 2}]->(r);

MATCH (q:DiscriminatingQuestion {id: "lu_body_quality"})
MATCH (r:QuestionResponse {id: "lu_body_numb"})
MERGE (q)-[:HAS_RESPONSE {order: 3}]->(r);

MATCH (q:DiscriminatingQuestion {id: "lu_body_quality"})
MATCH (r:QuestionResponse {id: "lu_body_unclear"})
MERGE (q)-[:HAS_RESPONSE {order: 4}]->(r);

// --- High-unpleasant Q1 → responses ---
MATCH (q:DiscriminatingQuestion {id: "hu_experience_quality"})
MATCH (r:QuestionResponse {id: "hu_exp_alarm"})
MERGE (q)-[:HAS_RESPONSE {order: 1}]->(r);

MATCH (q:DiscriminatingQuestion {id: "hu_experience_quality"})
MATCH (r:QuestionResponse {id: "hu_exp_vigilance"})
MERGE (q)-[:HAS_RESPONSE {order: 2}]->(r);

MATCH (q:DiscriminatingQuestion {id: "hu_experience_quality"})
MATCH (r:QuestionResponse {id: "hu_exp_social"})
MERGE (q)-[:HAS_RESPONSE {order: 3}]->(r);

MATCH (q:DiscriminatingQuestion {id: "hu_experience_quality"})
MATCH (r:QuestionResponse {id: "hu_exp_flooding"})
MERGE (q)-[:HAS_RESPONSE {order: 4}]->(r);

MATCH (q:DiscriminatingQuestion {id: "hu_experience_quality"})
MATCH (r:QuestionResponse {id: "hu_exp_unsure"})
MERGE (q)-[:HAS_RESPONSE {order: 5}]->(r);

// --- High-unpleasant Q2 → responses ---
MATCH (q:DiscriminatingQuestion {id: "hu_body_activation"})
MATCH (r:QuestionResponse {id: "hu_body_racing"})
MERGE (q)-[:HAS_RESPONSE {order: 1}]->(r);

MATCH (q:DiscriminatingQuestion {id: "hu_body_activation"})
MATCH (r:QuestionResponse {id: "hu_body_tense"})
MERGE (q)-[:HAS_RESPONSE {order: 2}]->(r);

MATCH (q:DiscriminatingQuestion {id: "hu_body_activation"})
MATCH (r:QuestionResponse {id: "hu_body_overwhelmed"})
MERGE (q)-[:HAS_RESPONSE {order: 3}]->(r);

MATCH (q:DiscriminatingQuestion {id: "hu_body_activation"})
MATCH (r:QuestionResponse {id: "hu_body_shame"})
MERGE (q)-[:HAS_RESPONSE {order: 4}]->(r);

MATCH (q:DiscriminatingQuestion {id: "hu_body_activation"})
MATCH (r:QuestionResponse {id: "hu_body_unclear"})
MERGE (q)-[:HAS_RESPONSE {order: 5}]->(r);


// ============================================================
// SECTION 6: EVIDENCE_FOR RELATIONSHIPS
//
// The core of the disambiguation system. Each response provides
// weighted evidence toward one or more activation patterns.
//
// Weight semantics (used by cloud function for scoring):
//   0.80–0.90 = Near-pathognomonic. This response almost certainly
//               indicates this pattern. Single-response resolution.
//   0.50–0.70 = Strong evidence, but ambiguity remains. May need
//               follow-up question to confirm.
//   0.30–0.40 = Moderate evidence. Leans toward this pattern but
//               other patterns are plausible.
//   0.10–0.25 = Weak signal. Slight lean. Insufficient alone but
//               contributes to cumulative scoring.
//
// Strength labels (human-readable, for clinical transparency):
//   "strong"   = well-supported phenomenological mapping
//   "moderate" = clinically plausible, some ambiguity
//   "weak"     = possible but not typical presentation
//
// The cloud function should SUM evidence weights across Q1 + Q2
// responses (plus existing emotion-based scoring) to determine
// final pattern confidence.
//
// IMPORTANT: Weights are calibrated to work WITH the existing
// emotion-based scoring in getStateAndTools, not to replace it.
// The discriminating question weights are ADDITIVE to the
// emotion-matching confidence. A combined score ≥ 0.75 from any
// source should be sufficient for pattern selection.
// ============================================================


// --------------------------------------------------------
// LOW-UNPLEASANT Q1 EVIDENCE
// --------------------------------------------------------

// "Stuck on replay" → rumination_loop
MATCH (r:QuestionResponse {id: "lu_mind_looping"})
MATCH (p:ActivationPattern {id: "rumination_loop"})
MERGE (r)-[e:EVIDENCE_FOR]->(p)
SET e.weight = 0.85,
    e.strength = "strong",
    e.rationale = "Self-reported mental looping directly indexes DMN hyperactivity with sgACC coupling. High metacognitive access to repetitive thought is the hallmark phenomenology of both depressive brooding and anxious worry.";

// "Quiet or blank" → conservation_freeze (moderate)
MATCH (r:QuestionResponse {id: "lu_mind_blank"})
MATCH (p:ActivationPattern {id: "conservation_freeze"})
MERGE (r)-[e:EVIDENCE_FOR]->(p)
SET e.weight = 0.45,
    e.strength = "moderate",
    e.rationale = "Cognitive quieting consistent with PAG-mediated global dampening. Mind goes quiet because the whole system shut down. Ambiguous with reward_drive_low — requires body-quality follow-up.";

// "Quiet or blank" → reward_drive_low (moderate)
MATCH (r:QuestionResponse {id: "lu_mind_blank"})
MATCH (p:ActivationPattern {id: "reward_drive_low"})
MERGE (r)-[e:EVIDENCE_FOR]->(p)
SET e.weight = 0.45,
    e.strength = "moderate",
    e.rationale = "Mental flatness consistent with ventral striatal blunting — nothing salient enough to generate thought. Ambiguous with conservation_freeze — requires body-quality follow-up.";

// "Far away or unreal" → dissociation_overmodulation (strong)
MATCH (r:QuestionResponse {id: "lu_mind_faraway"})
MATCH (p:ActivationPattern {id: "dissociation_overmodulation"})
MERGE (r)-[e:EVIDENCE_FOR]->(p)
SET e.weight = 0.80,
    e.strength = "strong",
    e.rationale = "Depersonalization/derealization phenomenology is the hallmark of PFC over-suppression of limbic signals. The 'watching from outside' quality specifically indexes dissociative overmodulation (Lanius 2010, 2012).";

// "Far away or unreal" → conservation_freeze (weak)
MATCH (r:QuestionResponse {id: "lu_mind_faraway"})
MATCH (p:ActivationPattern {id: "conservation_freeze"})
MERGE (r)-[e:EVIDENCE_FOR]->(p)
SET e.weight = 0.15,
    e.strength = "weak",
    e.rationale = "Thalamic suppression in severe freeze can produce mild unreality, but lacks the characteristic 'observer' quality of dissociation. Freeze unreality is absence-based; dissociation unreality is alteration-based.";

// "I'm not sure" → conservation_freeze (moderate)
MATCH (r:QuestionResponse {id: "lu_mind_unsure"})
MATCH (p:ActivationPattern {id: "conservation_freeze"})
MERGE (r)-[e:EVIDENCE_FOR]->(p)
SET e.weight = 0.35,
    e.strength = "moderate",
    e.rationale = "Difficulty accessing mental state consistent with global dampening — thalamic suppression reduces bandwidth of information reaching cortical awareness. Person cannot introspect because signals are not getting through.";

// "I'm not sure" → dissociation_overmodulation (weak-moderate)
MATCH (r:QuestionResponse {id: "lu_mind_unsure"})
MATCH (p:ActivationPattern {id: "dissociation_overmodulation"})
MERGE (r)-[e:EVIDENCE_FOR]->(p)
SET e.weight = 0.25,
    e.strength = "moderate",
    e.rationale = "Interoceptive disconnection via PFC over-regulation impairs self-knowledge. Person is cut off from own experience. However, dissociative individuals more often report the 'far away' quality than pure confusion.";

// "I'm not sure" → reward_drive_low (weak)
MATCH (r:QuestionResponse {id: "lu_mind_unsure"})
MATCH (p:ActivationPattern {id: "reward_drive_low"})
MERGE (r)-[e:EVIDENCE_FOR]->(p)
SET e.weight = 0.15,
    e.strength = "weak",
    e.rationale = "Less consistent — anhedonic individuals typically have metacognitive access to their flatness. They can usually say 'my mind is quiet/empty.' True confusion about mental state is more suggestive of freeze or dissociation.";


// --------------------------------------------------------
// LOW-UNPLEASANT Q2 EVIDENCE
// --------------------------------------------------------

// "Heavy or stuck" → conservation_freeze (strong)
MATCH (r:QuestionResponse {id: "lu_body_heavy"})
MATCH (p:ActivationPattern {id: "conservation_freeze"})
MERGE (r)-[e:EVIDENCE_FOR]->(p)
SET e.weight = 0.85,
    e.strength = "strong",
    e.rationale = "Subjective heaviness and motor inhibition are the somatic hallmarks of vlPAG-mediated freeze. Motor cortex suppression produces the 'can't move' quality. This is the 'can't' pole of the can't/don't-want-to distinction (Roelofs 2017; Kozlowska defense cascade).";

// "Flat, nothing sounds good" → reward_drive_low (strong)
MATCH (r:QuestionResponse {id: "lu_body_flat"})
MATCH (p:ActivationPattern {id: "reward_drive_low"})
MERGE (r)-[e:EVIDENCE_FOR]->(p)
SET e.weight = 0.80,
    e.strength = "strong",
    e.rationale = "Absence of motivational pull without motor inhibition. NAc/VTA suppression removes wanting signal while dorsal striatum suppression impairs goal initiation. Body available but purposeless. The 'don't want to' pole (Keren et al. 2018; Halahakoon et al. 2020).";

// "Numb or disconnected" → dissociation_overmodulation (strong)
MATCH (r:QuestionResponse {id: "lu_body_numb"})
MATCH (p:ActivationPattern {id: "dissociation_overmodulation"})
MERGE (r)-[e:EVIDENCE_FOR]->(p)
SET e.weight = 0.80,
    e.strength = "strong",
    e.rationale = "Interoceptive disconnection — body feels 'not mine' or absent — via PFC over-regulation of insula/somatosensory signals. Distinct from freeze heaviness (body very present, just immobilized) and anhedonic flatness (body neutral, just unmotivated). Hallmark of dissociative overmodulation (Lanius 2010).";

// "Numb or disconnected" → conservation_freeze (weak)
MATCH (r:QuestionResponse {id: "lu_body_numb"})
MATCH (p:ActivationPattern {id: "conservation_freeze"})
MERGE (r)-[e:EVIDENCE_FOR]->(p)
SET e.weight = 0.20,
    e.strength = "weak",
    e.rationale = "Thalamic suppression in severe freeze can dampen somatosensory signals, but this typically co-occurs with heaviness/immobility rather than the 'absent body' quality characteristic of dissociation.";

// "I can't really tell" → conservation_freeze (moderate)
MATCH (r:QuestionResponse {id: "lu_body_unclear"})
MATCH (p:ActivationPattern {id: "conservation_freeze"})
MERGE (r)-[e:EVIDENCE_FOR]->(p)
SET e.weight = 0.40,
    e.strength = "moderate",
    e.rationale = "Inability to report body state most consistent with thalamic suppression reducing sensory bandwidth to cortical awareness. Person cannot report because the signal is not arriving.";

// "I can't really tell" → dissociation_overmodulation (moderate)
MATCH (r:QuestionResponse {id: "lu_body_unclear"})
MATCH (p:ActivationPattern {id: "dissociation_overmodulation"})
MERGE (r)-[e:EVIDENCE_FOR]->(p)
SET e.weight = 0.35,
    e.strength = "moderate",
    e.rationale = "PFC actively suppressing interoceptive signals. Person cut off from body. However, dissociative individuals more often report a specific quality (numbness, unreality) than pure confusion about body state.";

// "I can't really tell" → reward_drive_low (weak)
MATCH (r:QuestionResponse {id: "lu_body_unclear"})
MATCH (p:ActivationPattern {id: "reward_drive_low"})
MERGE (r)-[e:EVIDENCE_FOR]->(p)
SET e.weight = 0.15,
    e.strength = "weak",
    e.rationale = "Less consistent — anhedonic individuals have intact interoceptive channels (reward valuation is suppressed, not the sensory pipeline). They can usually describe body as 'fine' or 'nothing much.'";


// --------------------------------------------------------
// HIGH-UNPLEASANT Q1 EVIDENCE
// --------------------------------------------------------

// "My alarm went off" → acute_alarm (strong)
MATCH (r:QuestionResponse {id: "hu_exp_alarm"})
MATCH (p:ActivationPattern {id: "acute_alarm"})
MERGE (r)-[e:EVIDENCE_FOR]->(p)
SET e.weight = 0.70,
    e.strength = "strong",
    e.rationale = "Identifiable onset with alarm quality indexes phasic amygdala-driven threat response. Person can point to what triggered it. Not scored at 0.85 because intense trigger can also initiate emotional flooding if regulation fails.";

// "My alarm went off" → emotional_flooding (weak)
MATCH (r:QuestionResponse {id: "hu_exp_alarm"})
MATCH (p:ActivationPattern {id: "emotional_flooding"})
MERGE (r)-[e:EVIDENCE_FOR]->(p)
SET e.weight = 0.20,
    e.strength = "weak",
    e.rationale = "Intense phasic trigger can overwhelm regulation, leading to flooding. If person selected 'alarm' rather than 'everything at once,' regulation is likely still partially intact — but worth tracking as secondary.";

// "A worry that won't turn off" → chronic_vigilance (strong)
MATCH (r:QuestionResponse {id: "hu_exp_vigilance"})
MATCH (p:ActivationPattern {id: "chronic_vigilance"})
MERGE (r)-[e:EVIDENCE_FOR]->(p)
SET e.weight = 0.85,
    e.strength = "strong",
    e.rationale = "Sustained, always-on threat processing is the hallmark of BNST-driven anticipatory threat. The 'won't turn off' quality distinguishes from phasic alarm (has a start point) and flooding (acute overwhelm). Somerville et al.; Shackman & Fox.";

// "About what others think" → social_threat_shame (strong)
MATCH (r:QuestionResponse {id: "hu_exp_social"})
MATCH (p:ActivationPattern {id: "social_threat_shame"})
MERGE (r)-[e:EVIDENCE_FOR]->(p)
SET e.weight = 0.85,
    e.strength = "strong",
    e.rationale = "Explicit identification of social evaluation trigger. Social threat has a categorically distinct neural signature involving mPFC self-evaluation, TPJ Theory-of-Mind engagement, and dACC/insula social pain. Eisenberger 2012; Piretti et al. 2023.";

// "Everything at once" → emotional_flooding (strong)
MATCH (r:QuestionResponse {id: "hu_exp_flooding"})
MATCH (p:ActivationPattern {id: "emotional_flooding"})
MERGE (r)-[e:EVIDENCE_FOR]->(p)
SET e.weight = 0.85,
    e.strength = "strong",
    e.rationale = "Inability to sort or differentiate emotions indexes OFC offline with SN overload. This is the defining phenomenology of flooding — not just intensity (alarm is intense too) but loss of emotion differentiation.";

// "I don't know what triggered it" → acute_alarm (moderate)
MATCH (r:QuestionResponse {id: "hu_exp_unsure"})
MATCH (p:ActivationPattern {id: "acute_alarm"})
MERGE (r)-[e:EVIDENCE_FOR]->(p)
SET e.weight = 0.30,
    e.strength = "moderate",
    e.rationale = "Trigger may be unconscious — implicit memory, interoceptive cue, or environmental stimulus below awareness. Amygdala can fire on subcortical 'low road' before conscious appraisal. (LeDoux 2016)";

// "I don't know what triggered it" → chronic_vigilance (moderate)
MATCH (r:QuestionResponse {id: "hu_exp_unsure"})
MATCH (p:ActivationPattern {id: "chronic_vigilance"})
MERGE (r)-[e:EVIDENCE_FOR]->(p)
SET e.weight = 0.30,
    e.strength = "moderate",
    e.rationale = "Diffuse sustained threat can feel triggerless because the threat monitoring is continuous — no single onset to point to. BNST activation does not require identifiable trigger.";

// "I don't know what triggered it" → emotional_flooding (weak-moderate)
MATCH (r:QuestionResponse {id: "hu_exp_unsure"})
MATCH (p:ActivationPattern {id: "emotional_flooding"})
MERGE (r)-[e:EVIDENCE_FOR]->(p)
SET e.weight = 0.20,
    e.strength = "weak",
    e.rationale = "Metacognitive failure from PFC compromise can prevent identifying the trigger. However, flooding typically has a more acute onset that the person experiences as overwhelming, even if they cannot name the specific trigger.";


// --------------------------------------------------------
// HIGH-UNPLEASANT Q2 EVIDENCE
// --------------------------------------------------------

// "Heart racing, on alert" → acute_alarm (strong)
MATCH (r:QuestionResponse {id: "hu_body_racing"})
MATCH (p:ActivationPattern {id: "acute_alarm"})
MERGE (r)-[e:EVIDENCE_FOR]->(p)
SET e.weight = 0.80,
    e.strength = "strong",
    e.rationale = "Acute sympathetic surge with cardiac acceleration and respiratory changes. LC-NE driven hyperarousal with characteristic alertness quality. Phasic activation, not sustained grip.";

// "Tense everywhere, scanning" → chronic_vigilance (strong)
MATCH (r:QuestionResponse {id: "hu_body_tense"})
MATCH (p:ActivationPattern {id: "chronic_vigilance"})
MERGE (r)-[e:EVIDENCE_FOR]->(p)
SET e.weight = 0.80,
    e.strength = "strong",
    e.rationale = "Sustained muscle tension with scanning behavior. BNST-maintained tonic activation distinct from phasic sympathetic surge. Body is in 'grip' mode — can't release. Attentional deployment to potential threats.";

// "Shaking, crying, or overwhelmed" → emotional_flooding (strong)
MATCH (r:QuestionResponse {id: "hu_body_overwhelmed"})
MATCH (p:ActivationPattern {id: "emotional_flooding"})
MERGE (r)-[e:EVIDENCE_FOR]->(p)
SET e.weight = 0.80,
    e.strength = "strong",
    e.rationale = "Autonomic overflow exceeding regulatory capacity. Motor discharge (shaking, trembling) or parasympathetic rebound (crying). Distinct from alarm (activation with control) and vigilance (activation with containment).";

// "Heat in face/chest, want to hide" → social_threat_shame (strong)
MATCH (r:QuestionResponse {id: "hu_body_shame"})
MATCH (p:ActivationPattern {id: "social_threat_shame"})
MERGE (r)-[e:EVIDENCE_FOR]->(p)
SET e.weight = 0.75,
    e.strength = "strong",
    e.rationale = "Shame-specific vasodilation (facial/upper-chest flushing) combined with behavioral inhibition (urge to hide). Relatively specific to social evaluation threat. The 'want to disappear' action tendency distinguishes from fear (flee) and anger (approach).";

// "Heat in face/chest, want to hide" → acute_alarm (weak)
MATCH (r:QuestionResponse {id: "hu_body_shame"})
MATCH (p:ActivationPattern {id: "acute_alarm"})
MERGE (r)-[e:EVIDENCE_FOR]->(p)
SET e.weight = 0.15,
    e.strength = "weak",
    e.rationale = "Flushing can occur in acute alarm (vasodilation component of fight-or-flight), but the 'want to hide' action tendency is shame-specific. If present, social threat is much more likely.";

// "I can't tell, it's all too much" → emotional_flooding (moderate)
MATCH (r:QuestionResponse {id: "hu_body_unclear"})
MATCH (p:ActivationPattern {id: "emotional_flooding"})
MERGE (r)-[e:EVIDENCE_FOR]->(p)
SET e.weight = 0.50,
    e.strength = "moderate",
    e.rationale = "Inability to parse body state under high arousal most consistent with PFC compromise and interoceptive discrimination failure. SN overload degrades the ability to differentiate discrete somatic signals.";

// "I can't tell, it's all too much" → acute_alarm (weak)
MATCH (r:QuestionResponse {id: "hu_body_unclear"})
MATCH (p:ActivationPattern {id: "acute_alarm"})
MERGE (r)-[e:EVIDENCE_FOR]->(p)
SET e.weight = 0.25,
    e.strength = "weak",
    e.rationale = "Extreme LC-NE activation can degrade interoceptive discrimination, but person typically retains awareness of cardiac acceleration even when other signals are muddled.";


// ============================================================
// SECTION 7: TRIGGERS_NEXT RELATIONSHIPS
//
// Defines the conditional question flow. A TRIGGERS_NEXT
// relationship from a QuestionResponse to a DiscriminatingQuestion
// means: "If the user selects this response, show the target
// question next."
//
// Responses that provide sufficient evidence for a single pattern
// (weight ≥ 0.75 for one pattern) do NOT trigger a follow-up.
// Responses that split evidence across multiple patterns DO
// trigger the follow-up question for disambiguation.
//
// FLOW LOGIC:
//
// LOW-UNPLEASANT:
//   Q1: lu_mind_quality (always shown)
//     "Stuck on replay"  → 0.85 rumination    → DONE (no Q2)
//     "Quiet or blank"   → 0.45/0.45 split    → SHOW lu_body_quality
//     "Far away/unreal"  → 0.80 dissociation  → DONE (no Q2)
//     "I'm not sure"     → 0.35/0.25 spread   → SHOW lu_body_quality
//
// HIGH-UNPLEASANT:
//   Q1: hu_experience_quality (always shown)
//     "Alarm went off"          → 0.70 alarm       → SHOW hu_body_activation
//     "Worry won't turn off"    → 0.85 vigilance   → DONE (no Q2)
//     "About others' judgment"  → 0.85 social      → DONE (no Q2)
//     "Everything at once"      → 0.85 flooding    → DONE (no Q2)
//     "Don't know trigger"      → 0.30/0.30 spread → SHOW hu_body_activation
// ============================================================

// --- Low-unpleasant: responses that trigger Q2 ---

// "Quiet or blank" triggers body quality question
MATCH (r:QuestionResponse {id: "lu_mind_blank"})
MATCH (q:DiscriminatingQuestion {id: "lu_body_quality"})
MERGE (r)-[:TRIGGERS_NEXT {
    reason: "Ambiguous between conservation_freeze and reward_drive_low — body experience resolves the can't-vs-don't-want-to distinction"
}]->(q);

// "I'm not sure" triggers body quality question
MATCH (r:QuestionResponse {id: "lu_mind_unsure"})
MATCH (q:DiscriminatingQuestion {id: "lu_body_quality"})
MERGE (r)-[:TRIGGERS_NEXT {
    reason: "Impaired metacognition ambiguous between freeze and dissociation — body experience provides alternative access to discriminating information"
}]->(q);

// --- High-unpleasant: responses that trigger Q2 ---

// "My alarm went off" triggers body activation question
// (0.70 for alarm is strong but not sufficient — could be early flooding)
MATCH (r:QuestionResponse {id: "hu_exp_alarm"})
MATCH (q:DiscriminatingQuestion {id: "hu_body_activation"})
MERGE (r)-[:TRIGGERS_NEXT {
    reason: "Phasic trigger at 0.70 confidence — strong lean toward acute_alarm but intense trigger can also initiate flooding. Body state disambiguates activation-with-control (alarm) from activation-with-overflow (flooding)"
}]->(q);

// "I don't know what triggered it" triggers body activation question
MATCH (r:QuestionResponse {id: "hu_exp_unsure"})
MATCH (q:DiscriminatingQuestion {id: "hu_body_activation"})
MERGE (r)-[:TRIGGERS_NEXT {
    reason: "Ambiguous trigger — body signals more accessible than metacognition in high-arousal states. Interoception survives PFC compromise better than executive appraisal"
}]->(q);


// ============================================================
// SECTION 8: VALIDATION QUERIES
//
// Run these to verify schema integrity after seeding.
// ============================================================

// 8a. Every DiscriminatingQuestion should have at least 3 responses
// MATCH (q:DiscriminatingQuestion)
// OPTIONAL MATCH (q)-[:HAS_RESPONSE]->(r:QuestionResponse)
// WITH q, count(r) AS responseCount
// WHERE responseCount < 3
// RETURN "Question with insufficient responses" AS issue,
//        q.id AS question_id, responseCount;

// 8b. Every QuestionResponse should have at least one EVIDENCE_FOR
// MATCH (r:QuestionResponse)
// WHERE NOT (r)-[:EVIDENCE_FOR]->(:ActivationPattern)
// RETURN "Response with no evidence links" AS issue, r.id AS response_id;

// 8c. EVIDENCE_FOR weights should sum to ≤ 1.5 per response
//     (allows multi-pattern evidence but prevents runaway inflation)
// MATCH (r:QuestionResponse)-[e:EVIDENCE_FOR]->(p:ActivationPattern)
// WITH r, sum(e.weight) AS totalWeight
// WHERE totalWeight > 1.5
// RETURN "Response with excessive total evidence weight" AS issue,
//        r.id AS response_id, totalWeight;

// 8d. Conditional questions should only be reachable via TRIGGERS_NEXT
// MATCH (q:DiscriminatingQuestion)
// WHERE q.required = false
//   AND NOT (:QuestionResponse)-[:TRIGGERS_NEXT]->(q)
// RETURN "Conditional question with no trigger path" AS issue,
//        q.id AS question_id;

// 8e. Verify no orphaned QuestionResponse nodes
// MATCH (r:QuestionResponse)
// WHERE NOT (:DiscriminatingQuestion)-[:HAS_RESPONSE]->(r)
// RETURN "Orphaned QuestionResponse" AS issue, r.id AS response_id;