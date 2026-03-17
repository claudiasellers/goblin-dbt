// ============================================================
// PROBLEM SOLVE DATA — Protocol metadata, Problem Types,
// Solution Directions, and per-emotion PS mapping properties.
//
// Run AFTER emotion-regulation-content.cypher (which creates
// EmotionRegulationContent nodes and base properties).
//
// This adds:
//   1. Protocol metadata (psAcknowledgment, problemDefinitionPrompts,
//      cannotChangeGuidance, interpersonal detection, rumination guard)
//   2. ProblemType nodes per emotion parent
//   3. SolutionDirection nodes with graduated action steps
//   4. Per-emotion PS applicability + clinical notes
//
// Clinical basis: Linehan Handouts 12, 12a (Problem Solving),
// augmented with emotion-specific problem extraction prompts
// derived from functional emotion theory (Ekman, Lazarus,
// Gross) and problem-solving therapy (D'Zurilla & Nezu).
//
// Voice principle: conversational first-person. The user should
// read these prompts and think "that's exactly my situation."
//
// All operations use MERGE — safe to re-run.
// Chunked per Aura requirement (no variable persistence).
// ============================================================


// --- CONSTRAINTS ---
CREATE CONSTRAINT problem_type_id IF NOT EXISTS
FOR (p:ProblemType) REQUIRE p.id IS UNIQUE;

CREATE CONSTRAINT solution_direction_id IF NOT EXISTS
FOR (s:SolutionDirection) REQUIRE s.id IS UNIQUE;


// ============================================================
// 1. PROTOCOL METADATA on EmotionRegulationContent nodes
//
//    Adds per-parent:
//      psAcknowledgment        — validates the emotion + frames PS
//      problemDefinitionPrompts — emotion-specific extraction questions
//      cannotChangeGuidance    — what to say at the acceptance fork
//      psInterpersonalHint     — when to detect "this is really about
//                                 another person" and route to IE skills
//      ruminationRiskLevel     — "high" | "moderate" | "low"
//      ruminationGuardMessage  — surfaced if looping detected
//      psCompanionTools        — tool IDs that pair naturally
//      psApplicable            — whether PS is a good fit (shame = limited)
//      psRedirectGuidance      — where to go if PS isn't the move
// ============================================================


// --- FEAR ---
MATCH (c:EmotionRegulationContent {dbtParent: 'fear'})
SET c.psAcknowledgment = "Your fear is pointing at something real. That means the move isn't to push through the feeling — it's to address the thing causing it.",
    c.problemDefinitionPrompts = [
      "What specifically are you afraid will happen?",
      "How likely is this — not how it feels, but based on what you actually know?",
      "What's the worst realistic outcome? Not the catastrophic version — the plausible one.",
      "Is there something you can do to reduce this risk, or is this about uncertainty you can't control?"
    ],
    c.cannotChangeGuidance = "Some of what you're afraid of is genuinely outside your control. No amount of planning will eliminate that uncertainty. What you can do is prepare for the most likely scenarios and build your ability to handle whatever comes.",
    c.psInterpersonalHint = "If the fear is about a conversation you're avoiding or a relationship confrontation, the most effective move might be preparing for that conversation rather than solving the fear itself.",
    c.ruminationRiskLevel = "high",
    c.ruminationGuardMessage = "You've been working on this for a while. Sometimes fear disguises worry as problem-solving — the mind keeps generating 'what if' scenarios without landing on action. If this feels like it's going in circles, that's a signal that something different might help.",
    c.psCompanionTools = ["cope-ahead", "please-skill", "dear-man"],
    c.psApplicable = true,
    c.psRedirectGuidance = null;


// --- ANGER ---
MATCH (c:EmotionRegulationContent {dbtParent: 'anger'})
SET c.psAcknowledgment = "Your anger is telling you something was violated — a boundary, a right, an expectation that mattered. That's real. Let's figure out what to do about it.",
    c.problemDefinitionPrompts = [
      "What specifically happened? Not the person's character — what did they do or say?",
      "What was the impact on you? What got blocked, taken away, or crossed?",
      "Is this a pattern, or a one-time thing?",
      "What outcome would actually resolve this for you? Not punishment — resolution."
    ],
    c.cannotChangeGuidance = "You can't control what other people do. What you can influence is how you respond, what boundaries you set, and whether you stay in this situation. Sometimes the most effective anger response isn't changing the other person — it's changing your relationship to the situation.",
    c.psInterpersonalHint = "It sounds like this involves another person's behavior. Most anger problems are really relationship problems — the most effective path forward is usually a conversation, not a solo plan. Would it help to work on how to communicate what you need?",
    c.ruminationRiskLevel = "moderate",
    c.ruminationGuardMessage = "Anger can keep you circling back to what happened and what they should have done differently. If you're replaying it more than solving it, your mind might be stuck in the loop rather than moving toward action.",
    c.psCompanionTools = ["dear-man", "give", "fast", "dialectics"],
    c.psApplicable = true,
    c.psRedirectGuidance = null;


// --- SADNESS ---
MATCH (c:EmotionRegulationContent {dbtParent: 'sadness'})
SET c.psAcknowledgment = "You've lost something real, or something didn't go the way you needed it to. That sadness makes sense. Let's see what parts of this you can actually do something about.",
    c.problemDefinitionPrompts = [
      "What specifically changed or was lost?",
      "What's different about your daily life now compared to before?",
      "Is there a part of this that can't be undone, and a part that you could still influence?",
      "What do you miss most — not the whole thing, but the specific part?"
    ],
    c.cannotChangeGuidance = "The loss itself can't be undone. That's not a failure on your part — some things genuinely can't be changed. But your life after this loss isn't fully written yet. The question isn't how to undo what happened — it's what you do with what comes next.",
    c.psInterpersonalHint = "If the sadness is about a relationship — something someone did or didn't do — the solvable part might be a conversation about what you need from them going forward.",
    c.ruminationRiskLevel = "high",
    c.ruminationGuardMessage = "You've been working on this for a while. Sadness has a way of pulling the mind backward — replaying what happened, asking why. If this feels like it's looping more than landing, that's a signal. We're trying to move forward, not decode the past.",
    c.psCompanionTools = ["build-mastery", "please-skill", "finding-connection"],
    c.psApplicable = true,
    c.psRedirectGuidance = null;


// --- GUILT ---
MATCH (c:EmotionRegulationContent {dbtParent: 'guilt'})
SET c.psAcknowledgment = "You did something that doesn't sit right with your own values. That guilt is telling you something worth listening to. The move now is repair — not endless self-punishment.",
    c.problemDefinitionPrompts = [
      "What specifically did you do that's bothering you?",
      "Which of your own values did this violate — not someone else's expectations, but yours?",
      "Is there someone who was affected? What was the impact on them?",
      "Is this something that can be repaired, or are you trying to undo something that's already done?"
    ],
    c.cannotChangeGuidance = "You can't undo what happened. But you can own it, make whatever amends are possible, and commit to doing differently. After that — and this is the hard part — you have to let go. Ongoing self-punishment doesn't help anyone, including the person you hurt.",
    c.psInterpersonalHint = "If someone was affected by what you did, the most important step might be having a direct conversation with them. Not to seek forgiveness — to take responsibility and understand the impact.",
    c.ruminationRiskLevel = "moderate",
    c.ruminationGuardMessage = "Guilt can keep you stuck in 'what I should have done differently' without moving toward repair. If you've been going back and forth without landing on an action, that's the guilt looping, not helping.",
    c.psCompanionTools = ["dear-man", "give", "let-it-be", "self-validate"],
    c.psApplicable = true,
    c.psRedirectGuidance = null;


// --- SHAME ---
MATCH (c:EmotionRegulationContent {dbtParent: 'shame'})
SET c.psAcknowledgment = "Shame is telling you there's something wrong with who you are. Before we go further — that's almost never a problem you can solve, because it's not actually true.",
    c.problemDefinitionPrompts = [
      "Is this about who you are, or about something you've been doing?",
      "If it's about something you've been doing — what specifically? What would you want to be different?"
    ],
    c.cannotChangeGuidance = "Shame about who you are isn't a solvable problem — it's a belief to examine. Trying to 'fix' yourself to stop feeling shame usually feeds it. The path forward is closer to self-compassion and being seen than to problem-solving.",
    c.psInterpersonalHint = null,
    c.ruminationRiskLevel = "high",
    c.ruminationGuardMessage = "Shame can disguise itself as problem-solving: 'If I just fix this about myself, the shame will stop.' It won't. If you're trying to solve who you are, that's shame talking, not a real problem.",
    c.psCompanionTools = ["opposite-action", "self-validate", "values-clarification"],
    c.psApplicable = false,
    c.psRedirectGuidance = "Shame says 'I am the problem.' That's not something to solve — it's something to challenge. Opposite Action (being visible instead of hiding) and self-validation are usually more effective here. If the shame is about a specific behavior you want to change, we can work on that — but the shame itself isn't the starting point.";


// --- DISGUST ---
MATCH (c:EmotionRegulationContent {dbtParent: 'disgust'})
SET c.psAcknowledgment = "Something is crossing a line for you — a boundary, a value, a standard that matters. Your disgust is saying 'this isn't okay.' Let's figure out what you can do about it.",
    c.problemDefinitionPrompts = [
      "What specifically is happening that feels wrong or contaminating?",
      "Is this about physical safety, or about values being violated?",
      "Can you remove yourself from this, or do you need to manage it while staying?",
      "What would 'enough distance' look like for you?"
    ],
    c.cannotChangeGuidance = "Sometimes you can't fully remove yourself from a situation that feels wrong. What you can do is create as much distance as the situation allows, hold your own values clearly, and work toward a longer-term change.",
    c.psInterpersonalHint = "If this is about someone's behavior — especially behavior that violates your boundaries — the most effective move might be setting or enforcing a clear boundary with them.",
    c.ruminationRiskLevel = "low",
    c.ruminationGuardMessage = null,
    c.psCompanionTools = ["fast", "dear-man", "values-clarification"],
    c.psApplicable = true,
    c.psRedirectGuidance = null;


// --- ENVY ---
MATCH (c:EmotionRegulationContent {dbtParent: 'envy'})
SET c.psAcknowledgment = "Your envy is actually giving you useful information — it's pointing directly at something you want. That's not something to feel bad about. Let's use it.",
    c.problemDefinitionPrompts = [
      "What specifically do they have that you want?",
      "Is this something you can actually work toward, or is it out of reach?",
      "What's the biggest real barrier between you and this — not all of them, just the main one?",
      "If you got this thing — what would actually be different about your life? What need would it meet?"
    ],
    c.cannotChangeGuidance = "If what you envy is genuinely out of reach — an opportunity that won't come again, an advantage you can't replicate — the pain of that is real. The work is grieving the specific thing you can't have while redirecting energy toward what you can build.",
    c.psInterpersonalHint = null,
    c.ruminationRiskLevel = "moderate",
    c.ruminationGuardMessage = "Envy can keep you focused on what someone else has instead of what you can do. If you've been comparing more than planning, that's the envy looping.",
    c.psCompanionTools = ["build-mastery", "values-clarification"],
    c.psApplicable = true,
    c.psRedirectGuidance = null;


// --- JEALOUSY ---
MATCH (c:EmotionRegulationContent {dbtParent: 'jealousy'})
SET c.psAcknowledgment = "The threat to this relationship feels real. Your jealousy is trying to protect something that matters to you. Let's figure out what you can actually do — not from a place of control, but from a place of clarity.",
    c.problemDefinitionPrompts = [
      "What specifically happened that told you this relationship is at risk?",
      "Is this based on something that actually happened, or on a fear of what might happen?",
      "What would help you feel more secure — not controlling them, but genuinely secure?",
      "Is this a conversation you need to have with them?"
    ],
    c.cannotChangeGuidance = "You can't control whether someone stays. What you can do is communicate clearly about what you need, decide what you're willing to accept, and show up as the person you want to be in this relationship. The rest is genuinely not in your hands.",
    c.psInterpersonalHint = "This is almost certainly a conversation you need to have with the person you're jealous about — not about accusing them, but about what you need to feel safe in this relationship.",
    c.ruminationRiskLevel = "high",
    c.ruminationGuardMessage = "Jealousy feeds on replaying evidence and imagining scenarios. If you're building a case in your head rather than planning a conversation, the jealousy is running the show.",
    c.psCompanionTools = ["dear-man", "give", "dialectics"],
    c.psApplicable = true,
    c.psRedirectGuidance = null;


// --- LOVE ---
MATCH (c:EmotionRegulationContent {dbtParent: 'love'})
SET c.psAcknowledgment = "The love is real and good — and something is getting in the way. Let's focus on the barrier, not the feeling.",
    c.problemDefinitionPrompts = [
      "What's getting in the way of this relationship being what you want it to be?",
      "Is the barrier between you and them, or is it external — distance, timing, circumstances?",
      "What would this relationship look like if the problem were resolved?"
    ],
    c.cannotChangeGuidance = "Some barriers between people can't be solved by one person. If the other person isn't willing or available, that's a loss to grieve, not a problem to engineer around.",
    c.psInterpersonalHint = "If the barrier is about something between the two of you — a dynamic, a conflict, something unsaid — the path forward is almost always through a conversation.",
    c.ruminationRiskLevel = "moderate",
    c.ruminationGuardMessage = null,
    c.psCompanionTools = ["dear-man", "give", "cope-ahead"],
    c.psApplicable = true,
    c.psRedirectGuidance = null;


// ============================================================
// 2. PROBLEM TYPE NODES
//
//    Per-parent categorization of what the problem typically
//    looks like. Used in the UI to help the user identify
//    which kind of problem they're facing.
//
//    Each ProblemType has:
//      id, label, description, recognitionPrompt, sortOrder
//    Linked via HAS_PROBLEM_TYPE from EmotionRegulationContent
// ============================================================


// --- FEAR PROBLEM TYPES ---

MERGE (pt:ProblemType {id: 'fear-safety-threat'})
SET pt.label = 'My safety is at risk',
    pt.description = 'A real, immediate threat to physical safety — yours or someone you care about.',
    pt.recognitionPrompt = 'Someone or something could hurt me or someone I love right now.',
    pt.sortOrder = 1,
    pt.dbtParent = 'fear';

MERGE (pt:ProblemType {id: 'fear-health-threat'})
SET pt.label = 'A health situation',
    pt.description = 'A medical issue — diagnosis, symptoms, someone else getting sick.',
    pt.recognitionPrompt = 'Something is wrong with my body or someone I care about is sick.',
    pt.sortOrder = 2,
    pt.dbtParent = 'fear';

MERGE (pt:ProblemType {id: 'fear-anticipatory'})
SET pt.label = 'Something bad might happen',
    pt.description = 'A realistic threat that hasn\'t happened yet — job loss, relationship ending, failure.',
    pt.recognitionPrompt = 'I\'m afraid of something that could happen but hasn\'t yet.',
    pt.sortOrder = 3,
    pt.dbtParent = 'fear';

// Link fear problem types (chunked for Aura)
MATCH (c:EmotionRegulationContent {dbtParent: 'fear'})
MATCH (pt:ProblemType {id: 'fear-safety-threat'})
MERGE (c)-[:HAS_PROBLEM_TYPE]->(pt);

MATCH (c:EmotionRegulationContent {dbtParent: 'fear'})
MATCH (pt:ProblemType {id: 'fear-health-threat'})
MERGE (c)-[:HAS_PROBLEM_TYPE]->(pt);

MATCH (c:EmotionRegulationContent {dbtParent: 'fear'})
MATCH (pt:ProblemType {id: 'fear-anticipatory'})
MERGE (c)-[:HAS_PROBLEM_TYPE]->(pt);


// --- ANGER PROBLEM TYPES ---

MERGE (pt:ProblemType {id: 'anger-boundary-violation'})
SET pt.label = 'Someone crossed a line',
    pt.description = 'A boundary was violated — your space, your rights, your dignity.',
    pt.recognitionPrompt = 'Someone did something to me that wasn\'t okay.',
    pt.sortOrder = 1,
    pt.dbtParent = 'anger';

MERGE (pt:ProblemType {id: 'anger-blocked-goal'})
SET pt.label = 'Something is in my way',
    pt.description = 'A goal, need, or plan is being obstructed — by a person, system, or circumstance.',
    pt.recognitionPrompt = 'I\'m trying to get something done and something keeps stopping me.',
    pt.sortOrder = 2,
    pt.dbtParent = 'anger';

MERGE (pt:ProblemType {id: 'anger-injustice'})
SET pt.label = 'Something unfair is happening',
    pt.description = 'An injustice — personal or witnessed — that violates your sense of what\'s right.',
    pt.recognitionPrompt = 'Someone is being treated unfairly and it\'s not okay.',
    pt.sortOrder = 3,
    pt.dbtParent = 'anger';

MATCH (c:EmotionRegulationContent {dbtParent: 'anger'})
MATCH (pt:ProblemType {id: 'anger-boundary-violation'})
MERGE (c)-[:HAS_PROBLEM_TYPE]->(pt);

MATCH (c:EmotionRegulationContent {dbtParent: 'anger'})
MATCH (pt:ProblemType {id: 'anger-blocked-goal'})
MERGE (c)-[:HAS_PROBLEM_TYPE]->(pt);

MATCH (c:EmotionRegulationContent {dbtParent: 'anger'})
MATCH (pt:ProblemType {id: 'anger-injustice'})
MERGE (c)-[:HAS_PROBLEM_TYPE]->(pt);


// --- SADNESS PROBLEM TYPES ---

MERGE (pt:ProblemType {id: 'sadness-relationship-loss'})
SET pt.label = 'I lost a relationship',
    pt.description = 'Breakup, estrangement, death, friendship ending — someone who was in your life isn\'t anymore.',
    pt.recognitionPrompt = 'Someone I care about is gone from my life.',
    pt.sortOrder = 1,
    pt.dbtParent = 'sadness';

MERGE (pt:ProblemType {id: 'sadness-goal-failure'})
SET pt.label = 'Something didn\'t work out',
    pt.description = 'A hope, plan, or attempt that failed or fell short.',
    pt.recognitionPrompt = 'I tried and it didn\'t go the way I needed.',
    pt.sortOrder = 2,
    pt.dbtParent = 'sadness';

MERGE (pt:ProblemType {id: 'sadness-gradual-erosion'})
SET pt.label = 'My life got smaller',
    pt.description = 'A gradual loss — of connection, purpose, identity, or vitality — with no single event to point to.',
    pt.recognitionPrompt = 'Things slipped away slowly and I don\'t know how to get back.',
    pt.sortOrder = 3,
    pt.dbtParent = 'sadness';

MATCH (c:EmotionRegulationContent {dbtParent: 'sadness'})
MATCH (pt:ProblemType {id: 'sadness-relationship-loss'})
MERGE (c)-[:HAS_PROBLEM_TYPE]->(pt);

MATCH (c:EmotionRegulationContent {dbtParent: 'sadness'})
MATCH (pt:ProblemType {id: 'sadness-goal-failure'})
MERGE (c)-[:HAS_PROBLEM_TYPE]->(pt);

MATCH (c:EmotionRegulationContent {dbtParent: 'sadness'})
MATCH (pt:ProblemType {id: 'sadness-gradual-erosion'})
MERGE (c)-[:HAS_PROBLEM_TYPE]->(pt);


// --- GUILT PROBLEM TYPES ---

MERGE (pt:ProblemType {id: 'guilt-clear-harm'})
SET pt.label = 'I hurt someone and I can repair it',
    pt.description = 'A specific action that caused harm — and the person is still in your life.',
    pt.recognitionPrompt = 'I did something specific and the person I affected is reachable.',
    pt.sortOrder = 1,
    pt.dbtParent = 'guilt';

MERGE (pt:ProblemType {id: 'guilt-pattern'})
SET pt.label = 'I keep doing this',
    pt.description = 'A repeated behavior that conflicts with your values — not one event, but a pattern.',
    pt.recognitionPrompt = 'It\'s not just one time. I keep falling into this.',
    pt.sortOrder = 2,
    pt.dbtParent = 'guilt';

MERGE (pt:ProblemType {id: 'guilt-values-conflict'})
SET pt.label = 'I was caught between two values',
    pt.description = 'You did what you had to do by one value, but it cost you in another. No clean answer.',
    pt.recognitionPrompt = 'There was no right answer — whatever I did, something would have been sacrificed.',
    pt.sortOrder = 3,
    pt.dbtParent = 'guilt';

MATCH (c:EmotionRegulationContent {dbtParent: 'guilt'})
MATCH (pt:ProblemType {id: 'guilt-clear-harm'})
MERGE (c)-[:HAS_PROBLEM_TYPE]->(pt);

MATCH (c:EmotionRegulationContent {dbtParent: 'guilt'})
MATCH (pt:ProblemType {id: 'guilt-pattern'})
MERGE (c)-[:HAS_PROBLEM_TYPE]->(pt);

MATCH (c:EmotionRegulationContent {dbtParent: 'guilt'})
MATCH (pt:ProblemType {id: 'guilt-values-conflict'})
MERGE (c)-[:HAS_PROBLEM_TYPE]->(pt);


// --- DISGUST PROBLEM TYPES ---

MERGE (pt:ProblemType {id: 'disgust-forced-proximity'})
SET pt.label = 'I\'m stuck near something that feels wrong',
    pt.description = 'Forced proximity to a person, environment, or situation that violates your boundaries or values.',
    pt.recognitionPrompt = 'I can\'t fully get away from this and it\'s wearing on me.',
    pt.sortOrder = 1,
    pt.dbtParent = 'disgust';

MERGE (pt:ProblemType {id: 'disgust-values-violation'})
SET pt.label = 'Something goes against what I believe in',
    pt.description = 'An environment or situation that conflicts with your core values or ethics.',
    pt.recognitionPrompt = 'What\'s happening around me isn\'t okay by my standards.',
    pt.sortOrder = 2,
    pt.dbtParent = 'disgust';

MATCH (c:EmotionRegulationContent {dbtParent: 'disgust'})
MATCH (pt:ProblemType {id: 'disgust-forced-proximity'})
MERGE (c)-[:HAS_PROBLEM_TYPE]->(pt);

MATCH (c:EmotionRegulationContent {dbtParent: 'disgust'})
MATCH (pt:ProblemType {id: 'disgust-values-violation'})
MERGE (c)-[:HAS_PROBLEM_TYPE]->(pt);


// --- ENVY PROBLEM TYPES ---

MERGE (pt:ProblemType {id: 'envy-resource-gap'})
SET pt.label = 'They have something I want',
    pt.description = 'A tangible gap — career, money, relationship, opportunity — between you and someone else.',
    pt.recognitionPrompt = 'There\'s something specific I want that someone else has.',
    pt.sortOrder = 1,
    pt.dbtParent = 'envy';

MERGE (pt:ProblemType {id: 'envy-unfair-advantage'})
SET pt.label = 'The playing field isn\'t level',
    pt.description = 'A structural or circumstantial advantage they had that you didn\'t.',
    pt.recognitionPrompt = 'They had a head start or advantage I didn\'t get.',
    pt.sortOrder = 2,
    pt.dbtParent = 'envy';

MATCH (c:EmotionRegulationContent {dbtParent: 'envy'})
MATCH (pt:ProblemType {id: 'envy-resource-gap'})
MERGE (c)-[:HAS_PROBLEM_TYPE]->(pt);

MATCH (c:EmotionRegulationContent {dbtParent: 'envy'})
MATCH (pt:ProblemType {id: 'envy-unfair-advantage'})
MERGE (c)-[:HAS_PROBLEM_TYPE]->(pt);


// --- JEALOUSY PROBLEM TYPES ---

MERGE (pt:ProblemType {id: 'jealousy-broken-trust'})
SET pt.label = 'Trust was actually broken',
    pt.description = 'Something specific happened — a lie, a betrayal, a secret — that damaged the trust.',
    pt.recognitionPrompt = 'They did something that broke the trust between us.',
    pt.sortOrder = 1,
    pt.dbtParent = 'jealousy';

MERGE (pt:ProblemType {id: 'jealousy-active-threat'})
SET pt.label = 'Someone is actively threatening this relationship',
    pt.description = 'A specific person or situation is putting the relationship at real risk.',
    pt.recognitionPrompt = 'There\'s a real, identifiable threat to this relationship right now.',
    pt.sortOrder = 2,
    pt.dbtParent = 'jealousy';

MATCH (c:EmotionRegulationContent {dbtParent: 'jealousy'})
MATCH (pt:ProblemType {id: 'jealousy-broken-trust'})
MERGE (c)-[:HAS_PROBLEM_TYPE]->(pt);

MATCH (c:EmotionRegulationContent {dbtParent: 'jealousy'})
MATCH (pt:ProblemType {id: 'jealousy-active-threat'})
MERGE (c)-[:HAS_PROBLEM_TYPE]->(pt);


// --- LOVE PROBLEM TYPES ---

MERGE (pt:ProblemType {id: 'love-external-barrier'})
SET pt.label = 'Something external is in the way',
    pt.description = 'Distance, timing, circumstances — the love is mutual but something logistical is blocking it.',
    pt.recognitionPrompt = 'We want to be together but something outside of us is making it hard.',
    pt.sortOrder = 1,
    pt.dbtParent = 'love';

MERGE (pt:ProblemType {id: 'love-internal-conflict'})
SET pt.label = 'Something between us isn\'t working',
    pt.description = 'The relationship is real but there\'s a dynamic, conflict, or unsaid thing creating friction.',
    pt.recognitionPrompt = 'I love them, and something in how we relate needs to change.',
    pt.sortOrder = 2,
    pt.dbtParent = 'love';

MATCH (c:EmotionRegulationContent {dbtParent: 'love'})
MATCH (pt:ProblemType {id: 'love-external-barrier'})
MERGE (c)-[:HAS_PROBLEM_TYPE]->(pt);

MATCH (c:EmotionRegulationContent {dbtParent: 'love'})
MATCH (pt:ProblemType {id: 'love-internal-conflict'})
MERGE (c)-[:HAS_PROBLEM_TYPE]->(pt);


// ============================================================
// 3. SOLUTION DIRECTION NODES
//
//    Per-ProblemType action categories with graduated steps.
//    Each SolutionDirection has:
//      id, label, description, small, medium, bigger,
//      linkedToolId (optional), sortOrder
//
//    Graduated steps follow the same pattern as ActionUrge:
//      small  = can do in the next hour, minimal effort
//      medium = takes some planning, doable today/tomorrow
//      bigger = real change, sustained effort or courage
// ============================================================


// ─── FEAR: Safety Threat ───

MERGE (sd:SolutionDirection {id: 'fear-safety-get-safe'})
SET sd.label = 'Get safe now',
    sd.description = 'Increase physical distance between you and the threat.',
    sd.small = 'Go to a different room or a public space',
    sd.medium = 'Leave the location and go somewhere you feel safe',
    sd.bigger = 'Call someone to come get you, or call a crisis line',
    sd.linkedToolId = null,
    sd.sortOrder = 1;

MERGE (sd:SolutionDirection {id: 'fear-safety-get-help'})
SET sd.label = 'Get help',
    sd.description = 'You don\'t have to handle this alone. Bring in support.',
    sd.small = 'Text one person and tell them what\'s happening',
    sd.medium = 'Call someone you trust and ask for concrete help',
    sd.bigger = 'Contact a professional resource — police, hotline, advocate',
    sd.linkedToolId = null,
    sd.sortOrder = 2;

MERGE (sd:SolutionDirection {id: 'fear-safety-plan-ahead'})
SET sd.label = 'Plan for next time',
    sd.description = 'Make a plan so you\'re not starting from zero if this happens again.',
    sd.small = 'Identify one person you could call in an emergency',
    sd.medium = 'Pack a bag, set up a code word, or save key numbers',
    sd.bigger = 'Create a full safety plan with a trusted person or professional',
    sd.linkedToolId = 'cope-ahead',
    sd.sortOrder = 3;

MATCH (pt:ProblemType {id: 'fear-safety-threat'})
MATCH (sd:SolutionDirection {id: 'fear-safety-get-safe'})
MERGE (pt)-[:HAS_SOLUTION_DIRECTION]->(sd);

MATCH (pt:ProblemType {id: 'fear-safety-threat'})
MATCH (sd:SolutionDirection {id: 'fear-safety-get-help'})
MERGE (pt)-[:HAS_SOLUTION_DIRECTION]->(sd);

MATCH (pt:ProblemType {id: 'fear-safety-threat'})
MATCH (sd:SolutionDirection {id: 'fear-safety-plan-ahead'})
MERGE (pt)-[:HAS_SOLUTION_DIRECTION]->(sd);


// ─── FEAR: Health Threat ───

MERGE (sd:SolutionDirection {id: 'fear-health-info'})
SET sd.label = 'Get information',
    sd.description = 'Fear thrives on unknowns. Get the facts you need to make a decision.',
    sd.small = 'Write down the three questions you most need answered',
    sd.medium = 'Call the doctor\'s office, insurance, or relevant resource',
    sd.bigger = 'Schedule the appointment or test you\'ve been putting off',
    sd.linkedToolId = null,
    sd.sortOrder = 1;

MERGE (sd:SolutionDirection {id: 'fear-health-one-step'})
SET sd.label = 'Take one medical or logistical step',
    sd.description = 'One concrete action toward managing the health situation.',
    sd.small = 'Refill the prescription, make the call, open the portal',
    sd.medium = 'Go to the appointment or follow through on the recommendation',
    sd.bigger = 'Start the treatment plan or have the conversation with family about what\'s needed',
    sd.linkedToolId = null,
    sd.sortOrder = 2;

MERGE (sd:SolutionDirection {id: 'fear-health-support'})
SET sd.label = 'Identify your support system',
    sd.description = 'You don\'t have to carry this alone. Who can help?',
    sd.small = 'Tell one person what\'s going on',
    sd.medium = 'Ask someone specific for a specific kind of help',
    sd.bigger = 'Build a support team — medical, emotional, practical',
    sd.linkedToolId = null,
    sd.sortOrder = 3;

MATCH (pt:ProblemType {id: 'fear-health-threat'})
MATCH (sd:SolutionDirection {id: 'fear-health-info'})
MERGE (pt)-[:HAS_SOLUTION_DIRECTION]->(sd);

MATCH (pt:ProblemType {id: 'fear-health-threat'})
MATCH (sd:SolutionDirection {id: 'fear-health-one-step'})
MERGE (pt)-[:HAS_SOLUTION_DIRECTION]->(sd);

MATCH (pt:ProblemType {id: 'fear-health-threat'})
MATCH (sd:SolutionDirection {id: 'fear-health-support'})
MERGE (pt)-[:HAS_SOLUTION_DIRECTION]->(sd);


// ─── FEAR: Anticipatory Threat ───

MERGE (sd:SolutionDirection {id: 'fear-anticipatory-prepare'})
SET sd.label = 'Prepare for the most likely scenario',
    sd.description = 'You can\'t eliminate uncertainty, but you can reduce it. Prepare for what\'s probable, not every possibility.',
    sd.small = 'Write down the most likely outcome — not worst case, most likely',
    sd.medium = 'Make a plan for that scenario: what would you do first?',
    sd.bigger = 'Rehearse your response mentally — walk through it step by step',
    sd.linkedToolId = 'cope-ahead',
    sd.sortOrder = 1;

MERGE (sd:SolutionDirection {id: 'fear-anticipatory-reduce-risk'})
SET sd.label = 'Reduce the risk',
    sd.description = 'Is there something concrete you can do now to make the bad outcome less likely?',
    sd.small = 'Identify the one thing most in your control',
    sd.medium = 'Do that thing today',
    sd.bigger = 'Address the root vulnerability — the thing that makes this risk feel so high',
    sd.linkedToolId = null,
    sd.sortOrder = 2;

MERGE (sd:SolutionDirection {id: 'fear-anticipatory-accept-uncertainty'})
SET sd.label = 'Accept the part you can\'t control',
    sd.description = 'Some of this is genuinely uncertain. Trying to solve uncertainty itself is a trap.',
    sd.small = 'Name what\'s in your control and what isn\'t — out loud or on paper',
    sd.medium = 'Do what you can, then practice letting the rest be',
    sd.bigger = 'Sit with the uncertainty for 10 minutes without trying to resolve it',
    sd.linkedToolId = 'let-it-be',
    sd.sortOrder = 3;

MATCH (pt:ProblemType {id: 'fear-anticipatory'})
MATCH (sd:SolutionDirection {id: 'fear-anticipatory-prepare'})
MERGE (pt)-[:HAS_SOLUTION_DIRECTION]->(sd);

MATCH (pt:ProblemType {id: 'fear-anticipatory'})
MATCH (sd:SolutionDirection {id: 'fear-anticipatory-reduce-risk'})
MERGE (pt)-[:HAS_SOLUTION_DIRECTION]->(sd);

MATCH (pt:ProblemType {id: 'fear-anticipatory'})
MATCH (sd:SolutionDirection {id: 'fear-anticipatory-accept-uncertainty'})
MERGE (pt)-[:HAS_SOLUTION_DIRECTION]->(sd);


// ─── ANGER: Boundary Violation ───

MERGE (sd:SolutionDirection {id: 'anger-boundary-assert'})
SET sd.label = 'Communicate what you need',
    sd.description = 'Tell them what happened, how it affected you, and what you need going forward.',
    sd.small = 'Write down what you want to say — don\'t send it yet',
    sd.medium = 'Have a direct, calm conversation using the DEAR MAN framework',
    sd.bigger = 'Set a clear consequence if the boundary is crossed again, and mean it',
    sd.linkedToolId = 'dear-man',
    sd.sortOrder = 1;

MERGE (sd:SolutionDirection {id: 'anger-boundary-enforce'})
SET sd.label = 'Enforce a boundary you\'ve already set',
    sd.description = 'You told them. They did it again. Now the question is follow-through.',
    sd.small = 'Name the violation calmly: "I told you X, and Y happened again"',
    sd.medium = 'Follow through on the consequence you set',
    sd.bigger = 'Change the terms of the relationship to protect yourself',
    sd.linkedToolId = 'fast',
    sd.sortOrder = 2;

MERGE (sd:SolutionDirection {id: 'anger-boundary-get-support'})
SET sd.label = 'Get support from someone else',
    sd.description = 'Sometimes you need backup, a witness, or just someone who hears you.',
    sd.small = 'Tell one person what happened',
    sd.medium = 'Ask someone to be present for the next conversation',
    sd.bigger = 'Involve a mediator, HR, or professional if the situation warrants it',
    sd.linkedToolId = null,
    sd.sortOrder = 3;

MATCH (pt:ProblemType {id: 'anger-boundary-violation'})
MATCH (sd:SolutionDirection {id: 'anger-boundary-assert'})
MERGE (pt)-[:HAS_SOLUTION_DIRECTION]->(sd);

MATCH (pt:ProblemType {id: 'anger-boundary-violation'})
MATCH (sd:SolutionDirection {id: 'anger-boundary-enforce'})
MERGE (pt)-[:HAS_SOLUTION_DIRECTION]->(sd);

MATCH (pt:ProblemType {id: 'anger-boundary-violation'})
MATCH (sd:SolutionDirection {id: 'anger-boundary-get-support'})
MERGE (pt)-[:HAS_SOLUTION_DIRECTION]->(sd);


// ─── ANGER: Blocked Goal ───

MERGE (sd:SolutionDirection {id: 'anger-blocked-alternate'})
SET sd.label = 'Find an alternate path',
    sd.description = 'The door you were trying is locked. Is there another way in?',
    sd.small = 'List two other ways to get what you need',
    sd.medium = 'Ask someone who\'s navigated this before how they did it',
    sd.bigger = 'Take the alternate route — even if it\'s slower or harder',
    sd.linkedToolId = null,
    sd.sortOrder = 1;

MERGE (sd:SolutionDirection {id: 'anger-blocked-advocate'})
SET sd.label = 'Advocate more effectively',
    sd.description = 'Maybe the approach, not the goal, needs to change.',
    sd.small = 'Identify specifically what hasn\'t worked and why',
    sd.medium = 'Reframe your request in terms of what they care about',
    sd.bigger = 'Escalate — go to someone with more authority or a different lever',
    sd.linkedToolId = 'dear-man',
    sd.sortOrder = 2;

MERGE (sd:SolutionDirection {id: 'anger-blocked-redirect'})
SET sd.label = 'Decide if this fight is worth it',
    sd.description = 'Sometimes the most effective move is to redirect your energy somewhere it can make a difference.',
    sd.small = 'Ask yourself: "If I keep pushing, what\'s the realistic best outcome?"',
    sd.medium = 'Put this fight on hold for one week and see how it feels',
    sd.bigger = 'Let this one go and invest the energy in something you can move',
    sd.linkedToolId = 'effectiveness',
    sd.sortOrder = 3;

MATCH (pt:ProblemType {id: 'anger-blocked-goal'})
MATCH (sd:SolutionDirection {id: 'anger-blocked-alternate'})
MERGE (pt)-[:HAS_SOLUTION_DIRECTION]->(sd);

MATCH (pt:ProblemType {id: 'anger-blocked-goal'})
MATCH (sd:SolutionDirection {id: 'anger-blocked-advocate'})
MERGE (pt)-[:HAS_SOLUTION_DIRECTION]->(sd);

MATCH (pt:ProblemType {id: 'anger-blocked-goal'})
MATCH (sd:SolutionDirection {id: 'anger-blocked-redirect'})
MERGE (pt)-[:HAS_SOLUTION_DIRECTION]->(sd);


// ─── ANGER: Injustice ───

MERGE (sd:SolutionDirection {id: 'anger-injustice-act'})
SET sd.label = 'Act within your power',
    sd.description = 'You can\'t fix all of it. But you might be able to influence part of it.',
    sd.small = 'Name the specific part of this injustice you have any leverage on',
    sd.medium = 'Take one action — speak up, write, show up, support someone affected',
    sd.bigger = 'Commit to sustained action — organize, advocate, build something',
    sd.linkedToolId = null,
    sd.sortOrder = 1;

MERGE (sd:SolutionDirection {id: 'anger-injustice-limits'})
SET sd.label = 'Accept the limits of your influence',
    sd.description = 'The anger is justified AND your power has boundaries. Both are true.',
    sd.small = 'Distinguish between what you can influence and what you can witness',
    sd.medium = 'Do what you can, then let the rest be — without guilt',
    sd.bigger = 'Find a way to live with justified anger without it consuming you',
    sd.linkedToolId = 'dialectics',
    sd.sortOrder = 2;

MATCH (pt:ProblemType {id: 'anger-injustice'})
MATCH (sd:SolutionDirection {id: 'anger-injustice-act'})
MERGE (pt)-[:HAS_SOLUTION_DIRECTION]->(sd);

MATCH (pt:ProblemType {id: 'anger-injustice'})
MATCH (sd:SolutionDirection {id: 'anger-injustice-limits'})
MERGE (pt)-[:HAS_SOLUTION_DIRECTION]->(sd);


// ─── SADNESS: Relationship Loss ───

MERGE (sd:SolutionDirection {id: 'sadness-loss-rebuild-structure'})
SET sd.label = 'Rebuild the structure that was lost',
    sd.description = 'The person is gone. But the routines, roles, and rituals they occupied can be refilled — differently, not as replacement.',
    sd.small = 'Identify one gap in your daily life this loss created',
    sd.medium = 'Fill that gap with something — even temporarily, even imperfectly',
    sd.bigger = 'Create a new routine that belongs to your life after this loss',
    sd.linkedToolId = null,
    sd.sortOrder = 1;

MERGE (sd:SolutionDirection {id: 'sadness-loss-reach-out'})
SET sd.label = 'Reach out for connection',
    sd.description = 'Sadness tells you to withdraw. Connection is the thing that helps most and feels hardest.',
    sd.small = 'Text one person back, or send a message you don\'t have to',
    sd.medium = 'Call someone and talk — not about the loss if you don\'t want to, just talk',
    sd.bigger = 'See someone in person, even if every part of you wants to cancel',
    sd.linkedToolId = 'finding-connection',
    sd.sortOrder = 2;

MERGE (sd:SolutionDirection {id: 'sadness-loss-allow-and-move'})
SET sd.label = 'Allow the grief AND take one step',
    sd.description = 'You don\'t have to choose between feeling the loss and moving forward. Both at the same time.',
    sd.small = 'Give yourself 10 minutes to feel it fully, then do one small thing',
    sd.medium = 'Write a letter to them (you don\'t have to send it), then do something for yourself',
    sd.bigger = 'Honor the loss in a way that matters to you, then commit to one change in how you\'re living now',
    sd.linkedToolId = 'dialectics',
    sd.sortOrder = 3;

MATCH (pt:ProblemType {id: 'sadness-relationship-loss'})
MATCH (sd:SolutionDirection {id: 'sadness-loss-rebuild-structure'})
MERGE (pt)-[:HAS_SOLUTION_DIRECTION]->(sd);

MATCH (pt:ProblemType {id: 'sadness-relationship-loss'})
MATCH (sd:SolutionDirection {id: 'sadness-loss-reach-out'})
MERGE (pt)-[:HAS_SOLUTION_DIRECTION]->(sd);

MATCH (pt:ProblemType {id: 'sadness-relationship-loss'})
MATCH (sd:SolutionDirection {id: 'sadness-loss-allow-and-move'})
MERGE (pt)-[:HAS_SOLUTION_DIRECTION]->(sd);


// ─── SADNESS: Goal Failure ───

MERGE (sd:SolutionDirection {id: 'sadness-failure-try-again'})
SET sd.label = 'Try again — differently',
    sd.description = 'The attempt failed, not the goal. What would you do differently?',
    sd.small = 'Name one thing you\'d change about your approach',
    sd.medium = 'Make a concrete plan for the second attempt',
    sd.bigger = 'Start the revised attempt today — don\'t wait for the feeling to pass',
    sd.linkedToolId = null,
    sd.sortOrder = 1;

MERGE (sd:SolutionDirection {id: 'sadness-failure-redirect'})
SET sd.label = 'Redirect toward something adjacent',
    sd.description = 'Maybe this specific version is done. But the underlying desire might be reachable another way.',
    sd.small = 'Ask: what was I really trying to get from this?',
    sd.medium = 'Identify one adjacent goal that would meet the same need',
    sd.bigger = 'Commit to the new direction and let go of the original plan',
    sd.linkedToolId = 'values-clarification',
    sd.sortOrder = 2;

MERGE (sd:SolutionDirection {id: 'sadness-failure-grieve'})
SET sd.label = 'Grieve this version and open to alternatives',
    sd.description = 'Before you can move forward, you may need to let go of the specific future you imagined.',
    sd.small = 'Name what you\'re sad about losing — be specific',
    sd.medium = 'Allow yourself to feel the disappointment without rushing to fix it',
    sd.bigger = 'Write down what this attempt taught you, then look forward',
    sd.linkedToolId = 'let-it-be',
    sd.sortOrder = 3;

MATCH (pt:ProblemType {id: 'sadness-goal-failure'})
MATCH (sd:SolutionDirection {id: 'sadness-failure-try-again'})
MERGE (pt)-[:HAS_SOLUTION_DIRECTION]->(sd);

MATCH (pt:ProblemType {id: 'sadness-goal-failure'})
MATCH (sd:SolutionDirection {id: 'sadness-failure-redirect'})
MERGE (pt)-[:HAS_SOLUTION_DIRECTION]->(sd);

MATCH (pt:ProblemType {id: 'sadness-goal-failure'})
MATCH (sd:SolutionDirection {id: 'sadness-failure-grieve'})
MERGE (pt)-[:HAS_SOLUTION_DIRECTION]->(sd);


// ─── SADNESS: Gradual Erosion ───

MERGE (sd:SolutionDirection {id: 'sadness-erosion-one-thing'})
SET sd.label = 'Recover one thing you lost',
    sd.description = 'You can\'t rebuild everything at once. Pick the one thing that would make you feel most like yourself again.',
    sd.small = 'Name one activity, person, or habit you stopped doing',
    sd.medium = 'Do a version of that thing today — even a 5-minute version',
    sd.bigger = 'Commit to doing it regularly this week',
    sd.linkedToolId = 'build-mastery',
    sd.sortOrder = 1;

MERGE (sd:SolutionDirection {id: 'sadness-erosion-identify-barrier'})
SET sd.label = 'Name what got in the way',
    sd.description = 'Life got small for a reason. Understanding the barrier is the first step to dismantling it.',
    sd.small = 'Finish this sentence: "I stopped doing [X] because..."',
    sd.medium = 'Is that barrier still real, or has it become a habit?',
    sd.bigger = 'Remove or work around the barrier for one specific activity',
    sd.linkedToolId = null,
    sd.sortOrder = 2;

MERGE (sd:SolutionDirection {id: 'sadness-erosion-structure'})
SET sd.label = 'Add one piece of structure',
    sd.description = 'When life erodes, structure goes first. Adding one anchor point back gives the rest of the day something to organize around.',
    sd.small = 'Set one consistent time for one thing — waking up, a meal, a walk',
    sd.medium = 'Schedule one activity with another person this week',
    sd.bigger = 'Build a minimal daily routine: 3 things, same time each day',
    sd.linkedToolId = 'please-skill',
    sd.sortOrder = 3;

MATCH (pt:ProblemType {id: 'sadness-gradual-erosion'})
MATCH (sd:SolutionDirection {id: 'sadness-erosion-one-thing'})
MERGE (pt)-[:HAS_SOLUTION_DIRECTION]->(sd);

MATCH (pt:ProblemType {id: 'sadness-gradual-erosion'})
MATCH (sd:SolutionDirection {id: 'sadness-erosion-identify-barrier'})
MERGE (pt)-[:HAS_SOLUTION_DIRECTION]->(sd);

MATCH (pt:ProblemType {id: 'sadness-gradual-erosion'})
MATCH (sd:SolutionDirection {id: 'sadness-erosion-structure'})
MERGE (pt)-[:HAS_SOLUTION_DIRECTION]->(sd);


// ─── GUILT: Clear Harm ───

MERGE (sd:SolutionDirection {id: 'guilt-harm-apologize'})
SET sd.label = 'Apologize and take responsibility',
    sd.description = 'A real apology names what you did, acknowledges the impact, and doesn\'t make excuses.',
    sd.small = 'Write out what you want to say — name the specific action and its impact',
    sd.medium = 'Have the conversation: "I did X, it affected you by Y, and I\'m sorry"',
    sd.bigger = 'Ask them what they need from you to repair this — and listen without defending',
    sd.linkedToolId = 'dear-man',
    sd.sortOrder = 1;

MERGE (sd:SolutionDirection {id: 'guilt-harm-make-amends'})
SET sd.label = 'Make concrete amends',
    sd.description = 'Beyond words — what can you do to address the harm?',
    sd.small = 'Identify one tangible thing you can do to make it right',
    sd.medium = 'Do the thing — don\'t just offer, follow through',
    sd.bigger = 'Sustain the amends over time, not just a one-time gesture',
    sd.linkedToolId = null,
    sd.sortOrder = 2;

MERGE (sd:SolutionDirection {id: 'guilt-harm-prevent'})
SET sd.label = 'Change the behavior going forward',
    sd.description = 'The apology is about the past. This is about making sure it doesn\'t happen again.',
    sd.small = 'Identify what led to the behavior — what was the trigger or pattern?',
    sd.medium = 'Commit to one specific alternative action for next time',
    sd.bigger = 'Put a system in place — not willpower, a structural change',
    sd.linkedToolId = 'cope-ahead',
    sd.sortOrder = 3;

MATCH (pt:ProblemType {id: 'guilt-clear-harm'})
MATCH (sd:SolutionDirection {id: 'guilt-harm-apologize'})
MERGE (pt)-[:HAS_SOLUTION_DIRECTION]->(sd);

MATCH (pt:ProblemType {id: 'guilt-clear-harm'})
MATCH (sd:SolutionDirection {id: 'guilt-harm-make-amends'})
MERGE (pt)-[:HAS_SOLUTION_DIRECTION]->(sd);

MATCH (pt:ProblemType {id: 'guilt-clear-harm'})
MATCH (sd:SolutionDirection {id: 'guilt-harm-prevent'})
MERGE (pt)-[:HAS_SOLUTION_DIRECTION]->(sd);


// ─── GUILT: Pattern ───

MERGE (sd:SolutionDirection {id: 'guilt-pattern-understand'})
SET sd.label = 'Understand what\'s driving the pattern',
    sd.description = 'You keep doing this for a reason. Not an excuse — a mechanism. Understanding it is how you interrupt it.',
    sd.small = 'Name the trigger: what\'s happening right before you fall into this?',
    sd.medium = 'Trace the full chain: trigger → thought → urge → behavior → consequence',
    sd.bigger = 'Identify the function — what does this behavior give you or help you avoid?',
    sd.linkedToolId = 'chain-analysis',
    sd.sortOrder = 1;

MERGE (sd:SolutionDirection {id: 'guilt-pattern-replace'})
SET sd.label = 'Build a replacement behavior',
    sd.description = 'You can\'t just stop something. You need something to do instead — something that serves the same function without the cost.',
    sd.small = 'Identify one alternative action you could take at the trigger point',
    sd.medium = 'Practice the alternative once this week — even imperfectly',
    sd.bigger = 'Make the alternative easier and the pattern harder — change the environment',
    sd.linkedToolId = 'cope-ahead',
    sd.sortOrder = 2;

MERGE (sd:SolutionDirection {id: 'guilt-pattern-reduce-vulnerability'})
SET sd.label = 'Reduce what makes you susceptible',
    sd.description = 'Patterns get worse when you\'re depleted, stressed, or running on empty. Address the conditions, not just the behavior.',
    sd.small = 'Check: are you sleep-deprived, hungry, isolated, or overwhelmed?',
    sd.medium = 'Address the most urgent vulnerability factor today',
    sd.bigger = 'Build a sustainable routine that keeps you above the threshold where the pattern takes over',
    sd.linkedToolId = 'please-skill',
    sd.sortOrder = 3;

MATCH (pt:ProblemType {id: 'guilt-pattern'})
MATCH (sd:SolutionDirection {id: 'guilt-pattern-understand'})
MERGE (pt)-[:HAS_SOLUTION_DIRECTION]->(sd);

MATCH (pt:ProblemType {id: 'guilt-pattern'})
MATCH (sd:SolutionDirection {id: 'guilt-pattern-replace'})
MERGE (pt)-[:HAS_SOLUTION_DIRECTION]->(sd);

MATCH (pt:ProblemType {id: 'guilt-pattern'})
MATCH (sd:SolutionDirection {id: 'guilt-pattern-reduce-vulnerability'})
MERGE (pt)-[:HAS_SOLUTION_DIRECTION]->(sd);


// ─── GUILT: Values Conflict ───

MERGE (sd:SolutionDirection {id: 'guilt-conflict-mitigate'})
SET sd.label = 'Mitigate the cost of your choice',
    sd.description = 'You made a choice that honored one value at the expense of another. You can\'t undo the choice, but you might be able to reduce the damage.',
    sd.small = 'Name specifically who or what paid the cost of your decision',
    sd.medium = 'Acknowledge the cost directly to the person affected, without undoing your choice',
    sd.bigger = 'Find a way to invest in the value that was sacrificed — going forward, not backward',
    sd.linkedToolId = 'give',
    sd.sortOrder = 1;

MERGE (sd:SolutionDirection {id: 'guilt-conflict-clarify'})
SET sd.label = 'Clarify which value takes priority',
    sd.description = 'If this conflict keeps recurring, you may need to get clearer about your hierarchy of values — not forever, but for now.',
    sd.small = 'Name the two values that were competing',
    sd.medium = 'For this season of your life, which one comes first? And can you accept the tradeoff?',
    sd.bigger = 'Restructure your life to reduce how often these values collide',
    sd.linkedToolId = 'values-clarification',
    sd.sortOrder = 2;

MERGE (sd:SolutionDirection {id: 'guilt-conflict-accept'})
SET sd.label = 'Accept the impossible choice',
    sd.description = 'Sometimes there was no right answer. Accepting that you did the best you could with competing demands — that\'s not letting yourself off the hook. It\'s being honest.',
    sd.small = 'Say to yourself: "There was no clean answer here. I chose, and it cost something."',
    sd.medium = 'Talk to someone you trust about the dilemma — not for absolution, for perspective',
    sd.bigger = 'Practice self-forgiveness: "I was in an impossible situation, and I did my best"',
    sd.linkedToolId = 'let-it-be',
    sd.sortOrder = 3;

MATCH (pt:ProblemType {id: 'guilt-values-conflict'})
MATCH (sd:SolutionDirection {id: 'guilt-conflict-mitigate'})
MERGE (pt)-[:HAS_SOLUTION_DIRECTION]->(sd);

MATCH (pt:ProblemType {id: 'guilt-values-conflict'})
MATCH (sd:SolutionDirection {id: 'guilt-conflict-clarify'})
MERGE (pt)-[:HAS_SOLUTION_DIRECTION]->(sd);

MATCH (pt:ProblemType {id: 'guilt-values-conflict'})
MATCH (sd:SolutionDirection {id: 'guilt-conflict-accept'})
MERGE (pt)-[:HAS_SOLUTION_DIRECTION]->(sd);


// ─── DISGUST: Forced Proximity ───

MERGE (sd:SolutionDirection {id: 'disgust-proximity-distance'})
SET sd.label = 'Create as much distance as you can',
    sd.description = 'Full removal isn\'t possible right now. Partial distance still helps.',
    sd.small = 'Limit the contact to what\'s strictly necessary — no extra',
    sd.medium = 'Change one thing about the arrangement to reduce exposure',
    sd.bigger = 'Start working toward a structural change — new role, new living situation, new arrangement',
    sd.linkedToolId = null,
    sd.sortOrder = 1;

MERGE (sd:SolutionDirection {id: 'disgust-proximity-boundary'})
SET sd.label = 'Set a boundary on what you\'ll tolerate',
    sd.description = 'You may not be able to leave, but you can define the terms of your presence.',
    sd.small = 'Identify your hardest line: what\'s the thing you will not accept?',
    sd.medium = 'Communicate that line clearly to the relevant person',
    sd.bigger = 'Enforce it — if the line is crossed, follow through on the consequence',
    sd.linkedToolId = 'fast',
    sd.sortOrder = 2;

MATCH (pt:ProblemType {id: 'disgust-forced-proximity'})
MATCH (sd:SolutionDirection {id: 'disgust-proximity-distance'})
MERGE (pt)-[:HAS_SOLUTION_DIRECTION]->(sd);

MATCH (pt:ProblemType {id: 'disgust-forced-proximity'})
MATCH (sd:SolutionDirection {id: 'disgust-proximity-boundary'})
MERGE (pt)-[:HAS_SOLUTION_DIRECTION]->(sd);


// ─── DISGUST: Values Violation ───

MERGE (sd:SolutionDirection {id: 'disgust-values-assert'})
SET sd.label = 'Speak up about what\'s wrong',
    sd.description = 'Disgust is a signal that a standard is being violated. Sometimes the move is to name it.',
    sd.small = 'Name it to yourself clearly: "This is wrong because..."',
    sd.medium = 'Say it to one other person — break the silence',
    sd.bigger = 'Address it directly with whoever has the power to change it',
    sd.linkedToolId = 'dear-man',
    sd.sortOrder = 1;

MERGE (sd:SolutionDirection {id: 'disgust-values-align'})
SET sd.label = 'Move toward alignment with your values',
    sd.description = 'If you\'re in an environment that consistently conflicts with what you believe, the long game is getting to an environment that doesn\'t.',
    sd.small = 'Clarify: what would an environment aligned with your values look like?',
    sd.medium = 'Identify one concrete step toward that environment',
    sd.bigger = 'Make the move — change roles, leave the group, restructure the situation',
    sd.linkedToolId = 'values-clarification',
    sd.sortOrder = 2;

MATCH (pt:ProblemType {id: 'disgust-values-violation'})
MATCH (sd:SolutionDirection {id: 'disgust-values-assert'})
MERGE (pt)-[:HAS_SOLUTION_DIRECTION]->(sd);

MATCH (pt:ProblemType {id: 'disgust-values-violation'})
MATCH (sd:SolutionDirection {id: 'disgust-values-align'})
MERGE (pt)-[:HAS_SOLUTION_DIRECTION]->(sd);


// ─── ENVY: Resource Gap ───

MERGE (sd:SolutionDirection {id: 'envy-gap-one-step'})
SET sd.label = 'Take one step toward closing the gap',
    sd.description = 'Envy points at what you want. The antidote isn\'t suppressing it — it\'s using the information to move.',
    sd.small = 'Name the gap specifically: "I want X and I currently have Y"',
    sd.medium = 'Identify the most important barrier and one action to address it',
    sd.bigger = 'Start today — apply, sign up, reach out, begin',
    sd.linkedToolId = 'build-mastery',
    sd.sortOrder = 1;

MERGE (sd:SolutionDirection {id: 'envy-gap-underlying-need'})
SET sd.label = 'Check what you actually want',
    sd.description = 'Sometimes what we envy isn\'t what we need. The promotion might represent security, not status. The relationship might represent not being alone.',
    sd.small = 'Ask: if I had this thing, what would actually change in my daily life?',
    sd.medium = 'Name the underlying need — security, competence, connection, freedom',
    sd.bigger = 'Find a more direct path to the underlying need, not just the surface want',
    sd.linkedToolId = 'values-clarification',
    sd.sortOrder = 2;

MATCH (pt:ProblemType {id: 'envy-resource-gap'})
MATCH (sd:SolutionDirection {id: 'envy-gap-one-step'})
MERGE (pt)-[:HAS_SOLUTION_DIRECTION]->(sd);

MATCH (pt:ProblemType {id: 'envy-resource-gap'})
MATCH (sd:SolutionDirection {id: 'envy-gap-underlying-need'})
MERGE (pt)-[:HAS_SOLUTION_DIRECTION]->(sd);


// ─── ENVY: Unfair Advantage ───

MERGE (sd:SolutionDirection {id: 'envy-unfair-effective'})
SET sd.label = 'Play the hand you have',
    sd.description = 'The starting conditions weren\'t equal. That\'s real. AND — what\'s the most effective move from where you actually are?',
    sd.small = 'Name what you DO have access to — resources, skills, people, time',
    sd.medium = 'Make a plan that works from your actual starting point, not theirs',
    sd.bigger = 'Invest fully in your own path without looking sideways',
    sd.linkedToolId = 'effectiveness',
    sd.sortOrder = 1;

MERGE (sd:SolutionDirection {id: 'envy-unfair-advocate'})
SET sd.label = 'Work to change the system',
    sd.description = 'If the unfairness is structural, maybe part of the work is addressing the structure — not just for you, but for everyone.',
    sd.small = 'Name the specific structural barrier',
    sd.medium = 'Find one person or organization already working on this',
    sd.bigger = 'Join the effort, or start one',
    sd.linkedToolId = null,
    sd.sortOrder = 2;

MATCH (pt:ProblemType {id: 'envy-unfair-advantage'})
MATCH (sd:SolutionDirection {id: 'envy-unfair-effective'})
MERGE (pt)-[:HAS_SOLUTION_DIRECTION]->(sd);

MATCH (pt:ProblemType {id: 'envy-unfair-advantage'})
MATCH (sd:SolutionDirection {id: 'envy-unfair-advocate'})
MERGE (pt)-[:HAS_SOLUTION_DIRECTION]->(sd);


// ─── JEALOUSY: Broken Trust ───

MERGE (sd:SolutionDirection {id: 'jealousy-trust-conversation'})
SET sd.label = 'Have the conversation about what happened',
    sd.description = 'Not an interrogation. A conversation about what happened, how it affected you, and what you need.',
    sd.small = 'Write down what you need to say — separate facts from interpretations',
    sd.medium = 'Have the conversation using DEAR MAN: describe what happened, express the impact, ask for what you need',
    sd.bigger = 'Define together what rebuilding trust would look like — specific actions, not just promises',
    sd.linkedToolId = 'dear-man',
    sd.sortOrder = 1;

MERGE (sd:SolutionDirection {id: 'jealousy-trust-terms'})
SET sd.label = 'Define what you need to feel safe',
    sd.description = 'What would need to be different for you to stay in this relationship?',
    sd.small = 'Name one specific thing that would help you feel more secure',
    sd.medium = 'Communicate those needs clearly, without ultimatums',
    sd.bigger = 'Decide together on concrete agreements — and follow up on them',
    sd.linkedToolId = 'give',
    sd.sortOrder = 2;

MERGE (sd:SolutionDirection {id: 'jealousy-trust-decide'})
SET sd.label = 'Decide if this can be repaired',
    sd.description = 'Not every breach of trust is repairable. Knowing when to invest and when to let go is its own kind of wisdom.',
    sd.small = 'Ask yourself honestly: do I want to repair this, or am I staying out of fear?',
    sd.medium = 'Give it a defined timeframe: "I\'ll invest fully for [X weeks/months] and then reassess"',
    sd.bigger = 'Make the decision — stay and rebuild, or leave and grieve',
    sd.linkedToolId = 'ending-relationships',
    sd.sortOrder = 3;

MATCH (pt:ProblemType {id: 'jealousy-broken-trust'})
MATCH (sd:SolutionDirection {id: 'jealousy-trust-conversation'})
MERGE (pt)-[:HAS_SOLUTION_DIRECTION]->(sd);

MATCH (pt:ProblemType {id: 'jealousy-broken-trust'})
MATCH (sd:SolutionDirection {id: 'jealousy-trust-terms'})
MERGE (pt)-[:HAS_SOLUTION_DIRECTION]->(sd);

MATCH (pt:ProblemType {id: 'jealousy-broken-trust'})
MATCH (sd:SolutionDirection {id: 'jealousy-trust-decide'})
MERGE (pt)-[:HAS_SOLUTION_DIRECTION]->(sd);


// ─── JEALOUSY: Active Threat ───

MERGE (sd:SolutionDirection {id: 'jealousy-threat-talk'})
SET sd.label = 'Talk to your person, not the threat',
    sd.description = 'The conversation belongs between you and the person you\'re in the relationship with — not between you and whoever you see as the competitor.',
    sd.small = 'Resist the urge to confront the third party',
    sd.medium = 'Tell your person what you\'re noticing and how it makes you feel',
    sd.bigger = 'Address it together as a team: "This is affecting us. How do we handle it?"',
    sd.linkedToolId = 'dear-man',
    sd.sortOrder = 1;

MERGE (sd:SolutionDirection {id: 'jealousy-threat-strengthen'})
SET sd.label = 'Strengthen what you have',
    sd.description = 'The best defense against a threat isn\'t control — it\'s making what you have worth choosing.',
    sd.small = 'Do one thing that invests in the relationship today',
    sd.medium = 'Create quality time together this week — intentional, not incidental',
    sd.bigger = 'Have an honest conversation about what you both need to feel chosen',
    sd.linkedToolId = 'give',
    sd.sortOrder = 2;

MATCH (pt:ProblemType {id: 'jealousy-active-threat'})
MATCH (sd:SolutionDirection {id: 'jealousy-threat-talk'})
MERGE (pt)-[:HAS_SOLUTION_DIRECTION]->(sd);

MATCH (pt:ProblemType {id: 'jealousy-active-threat'})
MATCH (sd:SolutionDirection {id: 'jealousy-threat-strengthen'})
MERGE (pt)-[:HAS_SOLUTION_DIRECTION]->(sd);


// ─── LOVE: External Barrier ───

MERGE (sd:SolutionDirection {id: 'love-external-logistics'})
SET sd.label = 'Solve the logistics',
    sd.description = 'The love is mutual. The barrier is practical. Treat it like a practical problem.',
    sd.small = 'Name the specific logistical barrier: distance, money, timing, obligation',
    sd.medium = 'Brainstorm together: what are the actual options?',
    sd.bigger = 'Pick an option and commit — even if it\'s imperfect or requires sacrifice',
    sd.linkedToolId = null,
    sd.sortOrder = 1;

MERGE (sd:SolutionDirection {id: 'love-external-bridge'})
SET sd.label = 'Build a bridge for the interim',
    sd.description = 'If the barrier can\'t be removed right now, how do you sustain the connection while it exists?',
    sd.small = 'Establish one consistent touchpoint — daily text, weekly call, something reliable',
    sd.medium = 'Plan the next time you\'ll be together and make it concrete',
    sd.bigger = 'Set a timeline for resolving the barrier, even approximately',
    sd.linkedToolId = null,
    sd.sortOrder = 2;

MATCH (pt:ProblemType {id: 'love-external-barrier'})
MATCH (sd:SolutionDirection {id: 'love-external-logistics'})
MERGE (pt)-[:HAS_SOLUTION_DIRECTION]->(sd);

MATCH (pt:ProblemType {id: 'love-external-barrier'})
MATCH (sd:SolutionDirection {id: 'love-external-bridge'})
MERGE (pt)-[:HAS_SOLUTION_DIRECTION]->(sd);


// ─── LOVE: Internal Conflict ───

MERGE (sd:SolutionDirection {id: 'love-internal-conversation'})
SET sd.label = 'Have the conversation you\'ve been avoiding',
    sd.description = 'If something between you isn\'t working, the path forward is almost always through a direct conversation — not around it.',
    sd.small = 'Name to yourself what isn\'t working. Be specific.',
    sd.medium = 'Tell them: "I love you AND this thing between us needs to change"',
    sd.bigger = 'Use DEAR MAN to structure the conversation so it\'s clear and kind',
    sd.linkedToolId = 'dear-man',
    sd.sortOrder = 1;

MERGE (sd:SolutionDirection {id: 'love-internal-dynamic'})
SET sd.label = 'Change the dynamic, not just the event',
    sd.description = 'If this keeps coming up, the problem might be a pattern between you, not a single incident.',
    sd.small = 'Notice: does this conflict follow a pattern? Same roles, same escalation?',
    sd.medium = 'Name the pattern to your partner without blame: "I notice we keep ending up here"',
    sd.bigger = 'Agree together to try a different approach next time — and practice it',
    sd.linkedToolId = 'dialectics',
    sd.sortOrder = 2;

MATCH (pt:ProblemType {id: 'love-internal-conflict'})
MATCH (sd:SolutionDirection {id: 'love-internal-conversation'})
MERGE (pt)-[:HAS_SOLUTION_DIRECTION]->(sd);

MATCH (pt:ProblemType {id: 'love-internal-conflict'})
MATCH (sd:SolutionDirection {id: 'love-internal-dynamic'})
MERGE (pt)-[:HAS_SOLUTION_DIRECTION]->(sd);


// ============================================================
// 4. PER-EMOTION PS APPLICABILITY
//
//    Sets problemSolveApplicable, psClinicalNote,
//    psAlternativeSkill on every Emotion node.
//
//    PS applicability differs from OA:
//    - Almost all emotions are PS-applicable when they fit
//      the facts (that's the whole point — emotion fits, change
//      the situation).
//    - Exceptions: positive emotions (no problem to solve),
//      dissociative/numb states (reconnect with body first),
//      shame-as-identity (not a solvable problem).
//    - Some emotions are PS-applicable but better served by
//      a companion tool (e.g., anger → DEAR MAN first).
//
//    Unlike OA, we don't need per-emotion clinical notes on
//    EVERY emotion because PS routes through the DBT parent.
//    But we do flag the exceptions.
// ============================================================

// --- FEARFUL FAMILY: all PS-applicable ---
UNWIND [
  "fear", "scared", "anxious", "insecure", "worried",
  "overwhelmed", "panic", "terrified", "hypervigilant",
  "dread", "apprehensive", "nervous", "uneasy", "on_edge",
  "wary", "frightened", "threatened"
] AS id
MATCH (e:Emotion {id: id})
SET e.problemSolveApplicable = true,
    e.psClinicalNote = "Fear-family: address the threat or reduce vulnerability",
    e.psAlternativeSkill = null;

// --- ANGRY FAMILY: all PS-applicable ---
UNWIND [
  "angry", "bitter", "mad", "aggressive", "frustrated",
  "distant", "critical", "betrayed", "resentful",
  "disrespected", "ridiculed", "indignant", "violated",
  "furious", "jealous", "provoked", "hostile", "infuriated",
  "annoyed", "withdrawn", "dismissive", "let_down"
] AS id
MATCH (e:Emotion {id: id})
SET e.problemSolveApplicable = true,
    e.psClinicalNote = "Anger-family: address the violation, blocked goal, or injustice",
    e.psAlternativeSkill = null;

// --- SAD FAMILY: all PS-applicable ---
UNWIND [
  "sad", "lonely", "vulnerable", "despair",
  "depressed", "hurt", "isolated", "abandoned",
  "victimized", "fragile", "grief", "powerless",
  "empty", "guilty", "remorseful"
] AS id
MATCH (e:Emotion {id: id})
SET e.problemSolveApplicable = true,
    e.psClinicalNote = "Sadness-family: address the loss, rebuild structure, or reach out",
    e.psAlternativeSkill = null;

// --- BAD FAMILY: mostly PS-applicable ---
UNWIND [
  "stressed", "pressured", "out_of_control", "inadequate",
  "inferior", "worthless", "insignificant", "weak",
  "exposed", "bored", "apathetic", "tired"
] AS id
MATCH (e:Emotion {id: id})
SET e.problemSolveApplicable = true,
    e.psClinicalNote = "Address the situational stressor or build mastery",
    e.psAlternativeSkill = null;

// --- DISGUSTED FAMILY: PS-applicable ---
UNWIND [
  "disgusted", "disapproving", "disappointed", "awful",
  "repelled", "judgmental", "embarrassed", "appalled",
  "revolted", "nauseated", "detestable", "horrified",
  "hesitant"
] AS id
MATCH (e:Emotion {id: id})
SET e.problemSolveApplicable = true,
    e.psClinicalNote = "Disgust-family: address the boundary violation or values misalignment",
    e.psAlternativeSkill = null;

// --- SHAME: limited PS applicability ---
MATCH (e:Emotion {id: 'humiliated'})
SET e.problemSolveApplicable = false,
    e.psClinicalNote = "Shame state — problem-solving identity doesn't work. Visibility and self-compassion are the path.",
    e.psAlternativeSkill = "opposite-action";

MATCH (e:Emotion {id: 'ashamed'})
SET e.problemSolveApplicable = false,
    e.psClinicalNote = "Shame state — 'fixing yourself' feeds shame. Opposite Action (disclosure, visibility) is more effective.",
    e.psAlternativeSkill = "opposite-action";

// Hot shame and cold shame are the core Emotion nodes
MATCH (e:Emotion) WHERE e.id IN ['hot_shame', 'cold_shame']
SET e.problemSolveApplicable = false,
    e.psClinicalNote = "Core shame — not a problem to solve. Opposite Action (being seen) or self-validation.",
    e.psAlternativeSkill = "opposite-action";

// --- NUMB / DISSOCIATIVE: not PS-applicable ---
MATCH (e:Emotion {id: 'numb'})
SET e.problemSolveApplicable = false,
    e.psClinicalNote = "Dissociative shutdown — reconnect with body before cognitive work",
    e.psAlternativeSkill = "body-scan";

// --- COGNITIVE STATES: not PS-applicable ---
MATCH (e:Emotion {id: 'skeptical'})
SET e.problemSolveApplicable = false,
    e.psClinicalNote = "Cognitive stance, not emotional state — examine the situation first",
    e.psAlternativeSkill = "check-the-facts";

MATCH (e:Emotion {id: 'confused'})
SET e.problemSolveApplicable = false,
    e.psClinicalNote = "Cognitive uncertainty — need clarity before problem-solving",
    e.psAlternativeSkill = "check-the-facts";

MATCH (e:Emotion {id: 'perplexed'})
SET e.problemSolveApplicable = false,
    e.psClinicalNote = "Cognitive uncertainty — need clarity before problem-solving",
    e.psAlternativeSkill = "check-the-facts";

// --- HAPPY FAMILY: not PS-applicable (no problem to solve) ---
UNWIND [
  "happy", "playful", "interested", "proud", "accepted", "powerful", "optimistic",
  "aroused", "cheeky", "joyful", "curious", "inquisitive", "successful", "confident",
  "respected", "valued", "courageous", "creative", "hopeful", "inspired",
  "calm", "relaxed", "peaceful", "content", "trusting", "sensitive", "thankful",
  "good", "chill", "comfortable", "thoughtful", "mellow", "sympathetic", "serene",
  "secure", "satisfied", "restful", "appreciative", "at_ease", "balanced",
  "grounded", "cozy", "humble", "loving", "intimate", "tender"
] AS id
MATCH (e:Emotion {id: id})
SET e.problemSolveApplicable = false,
    e.psClinicalNote = "Positive state — savor with mindfulness, no problem to solve",
    e.psAlternativeSkill = "mindfulness-emotions";

// --- SURPRISED FAMILY: mixed ---
UNWIND [
  "surprised", "startled", "amazed", "excited", "astonished",
  "awe", "eager", "energetic"
] AS id
MATCH (e:Emotion {id: id})
SET e.problemSolveApplicable = false,
    e.psClinicalNote = "Transitional/positive state — observe mindfully",
    e.psAlternativeSkill = "mindfulness-emotions";

MATCH (e:Emotion {id: 'shocked'})
SET e.problemSolveApplicable = true,
    e.psClinicalNote = "Shock from bad news — once processed, may have a solvable component",
    e.psAlternativeSkill = null;

MATCH (e:Emotion {id: 'dismayed'})
SET e.problemSolveApplicable = true,
    e.psClinicalNote = "Dismay from bad news — address the situation causing it",
    e.psAlternativeSkill = null;

MATCH (e:Emotion {id: 'disillusioned'})
SET e.problemSolveApplicable = true,
    e.psClinicalNote = "Lost beliefs may point to values realignment or relationship repair",
    e.psAlternativeSkill = null;


// ============================================================
// 5. CROSS-CUTTING CONTENT
//
//    Standalone properties that apply regardless of emotion.
//    Stored on a dedicated ProblemSolveProtocol node.
// ============================================================

MERGE (ps:ProblemSolveProtocol {id: 'problem_solve_protocol'})
SET ps.readinessCheck = "Before we start — can you think about this somewhat clearly right now, or is the feeling too intense? If everything feels like an emergency, a grounding skill first might help more than problem-solving.",
    ps.readinessRedirectMessage = "That makes sense. When the feeling is this intense, problem-solving is harder because the part of your brain that plans and evaluates is partially offline. Try bringing the intensity down first, then come back.",
    ps.readinessRedirectTools = ["cool-down", "five-senses", "pause"],
    ps.changeabilityQuestions = [
      "Can any part of this situation be changed by something you do?",
      "What specifically is within your influence?",
      "Is there a part of this you can't change that you're trying to solve anyway?"
    ],
    ps.nothingCanChangeMessage = "This is a situation where the pain is real and the problem isn't fixable by you. That's not a failure — some things genuinely can't be changed. The skill here isn't solving it — it's learning to carry it without it breaking you.",
    ps.nothingCanChangeTools = ["let-it-be", "willingness", "turning-the-mind"],
    ps.everythingIsPilingUpMessage = "When everything feels like it's piling up, picking one thing — the most changeable thing, not the biggest thing — creates a foothold. You're not ignoring the rest. You're starting somewhere.",
    ps.interpersonalDetectionPrompt = "It sounds like this involves another person's behavior. When the 'problem' is really about a relationship, the most effective move is often a conversation — not a solo plan. Would it help to work on how to communicate what you need?",
    ps.interpersonalRedirectTools = ["dear-man", "give", "fast"],
    ps.notMyProblemPrompt = "It sounds like the part that's in your control is smaller than the part that's in theirs. What would it look like to focus on what you can actually do, even though that feels like less?",
    ps.commitmentFraming = [
      "Small: something you can do in the next hour, with minimal effort.",
      "Medium: something that takes some planning, but you could do today or tomorrow.",
      "Bigger: a real change that addresses the root — takes effort and maybe courage."
    ],
    ps.commitmentValidation = "Any of these is a real step. You don't have to go big to make progress.",
    ps.completionAcknowledgment = "You just defined a real problem, figured out what you can change, and committed to a next step — while you were hurting. That takes clarity and courage.",
    ps.completionFollowUp = "If this doesn't work or the problem shifts, come back. Problem-solving is iterative, not one-shot.",
    ps.copeAheadBridge = "Would it help to mentally rehearse this step before you do it? Walking through it in your mind first can make the real thing easier.",
    ps.copeAheadBridgeToolId = "cope-ahead";
