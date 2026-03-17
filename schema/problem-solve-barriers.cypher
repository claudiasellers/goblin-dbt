// ============================================================
// PROBLEM SOLVE — BARRIER ASSESSMENT CONTENT
// schema/problem-solve-barriers.cypher
//
// Run AFTER problem-solve-data.cypher
//
// Replaces the old "can you change this? yes/no/parts" with
// an MI-informed barrier assessment. The user answers
// "what's standing between you and doing something about this?"
// and each answer produces a meaningfully different therapeutic
// path.
//
// Node types added:
//   BarrierType        — the 5 top-level barrier categories
//   BarrierSubResponse — per-ProblemType follow-up options within
//                        each barrier type. Each has a therapeutic
//                        response, redirect tool, and/or next action.
//   DecompositionAspect — per-ProblemType "parts of the situation"
//                         used in the "outside my control" path
//   AmbivalenceOption  — per-ProblemType "what does staying the
//                         same protect you from?" options (MI)
//
// Relationships:
//   (ProblemSolveProtocol)-[:HAS_BARRIER_TYPE]->(BarrierType)
//   (BarrierType)-[:HAS_SUB_RESPONSE {problemTypeId}]->(BarrierSubResponse)
//   (ProblemType)-[:HAS_DECOMPOSITION_ASPECT]->(DecompositionAspect)
//   (ProblemType)-[:HAS_AMBIVALENCE_OPTION]->(AmbivalenceOption)
//
// Clinical basis: Miller & Rollnick (2013), Motivational
// Interviewing 3rd ed. Barrier framing, change talk evocation,
// confidence rulers, ambivalence exploration.
//
// All operations use MERGE — safe to re-run.
// Chunked per Aura requirement.
// ============================================================


// --- CONSTRAINTS ---
CREATE CONSTRAINT barrier_type_id IF NOT EXISTS
FOR (b:BarrierType) REQUIRE b.id IS UNIQUE;

CREATE CONSTRAINT barrier_sub_response_id IF NOT EXISTS
FOR (r:BarrierSubResponse) REQUIRE r.id IS UNIQUE;

CREATE CONSTRAINT decomposition_aspect_id IF NOT EXISTS
FOR (d:DecompositionAspect) REQUIRE d.id IS UNIQUE;

CREATE CONSTRAINT ambivalence_option_id IF NOT EXISTS
FOR (a:AmbivalenceOption) REQUIRE a.id IS UNIQUE;


// ============================================================
// 1. BARRIER TYPES — the 5 top-level options
//
// These are universal (not per-emotion). The user sees these
// as the first question after defining their problem.
// ============================================================

MERGE (bt:BarrierType {id: 'know-but-cant'})
SET bt.label = 'I know what to do, I just can\'t make myself do it',
    bt.description = 'You have the answer — the barrier is mobilization, not clarity.',
    bt.sortOrder = 1,
    bt.therapeuticPosture = 'MI: evoke change talk, explore ambivalence, build confidence',
    bt.skipsSolutions = true;

MERGE (bt:BarrierType {id: 'involves-person'})
SET bt.label = 'It involves another person and I don\'t know how to get through to them',
    bt.description = 'The path forward runs through a conversation you haven\'t had or that hasn\'t worked.',
    bt.sortOrder = 2,
    bt.therapeuticPosture = 'Route to interpersonal effectiveness skills based on specific sub-barrier',
    bt.skipsSolutions = true;

MERGE (bt:BarrierType {id: 'not-sure-what'})
SET bt.label = 'I\'m not sure what the right move is',
    bt.description = 'The barrier is clarity — you need options, not motivation.',
    bt.sortOrder = 3,
    bt.therapeuticPosture = 'Standard PS: present scaffolded solution directions',
    bt.skipsSolutions = false;

MERGE (bt:BarrierType {id: 'outside-control'})
SET bt.label = 'This feels completely outside my control',
    bt.description = 'Before accepting that, let\'s look at the pieces.',
    bt.sortOrder = 4,
    bt.therapeuticPosture = 'Guided decomposition: separate unchangeable facts from potential levers',
    bt.skipsSolutions = false;

MERGE (bt:BarrierType {id: 'tried-nothing-works'})
SET bt.label = 'I\'ve tried things and nothing has worked',
    bt.description = 'You\'ve been using your agency. The question is whether to change approach or change target.',
    bt.sortOrder = 5,
    bt.therapeuticPosture = 'Validate effort, differentiate thinking vs doing, explore new angles or acceptance',
    bt.skipsSolutions = false;

// Link barrier types to protocol
MATCH (ps:ProblemSolveProtocol {id: 'problem_solve_protocol'})
MATCH (bt:BarrierType {id: 'know-but-cant'})
MERGE (ps)-[:HAS_BARRIER_TYPE]->(bt);

MATCH (ps:ProblemSolveProtocol {id: 'problem_solve_protocol'})
MATCH (bt:BarrierType {id: 'involves-person'})
MERGE (ps)-[:HAS_BARRIER_TYPE]->(bt);

MATCH (ps:ProblemSolveProtocol {id: 'problem_solve_protocol'})
MATCH (bt:BarrierType {id: 'not-sure-what'})
MERGE (ps)-[:HAS_BARRIER_TYPE]->(bt);

MATCH (ps:ProblemSolveProtocol {id: 'problem_solve_protocol'})
MATCH (bt:BarrierType {id: 'outside-control'})
MERGE (ps)-[:HAS_BARRIER_TYPE]->(bt);

MATCH (ps:ProblemSolveProtocol {id: 'problem_solve_protocol'})
MATCH (bt:BarrierType {id: 'tried-nothing-works'})
MERGE (ps)-[:HAS_BARRIER_TYPE]->(bt);


// ============================================================
// 2. PROTOCOL — MI content on ProblemSolveProtocol node
//
//    Adds cross-cutting MI prompts and framing.
// ============================================================

MATCH (ps:ProblemSolveProtocol {id: 'problem_solve_protocol'})
SET ps.barrierQuestion = "What's standing between you and doing something about this?",
    ps.barrierQuestionSubtext = "There's no wrong answer — this helps us figure out the best next step.",
    ps.confidenceRulerIntro = "How confident are you that you could do the smallest version of this?",
    ps.confidenceHigh = "I could do this if I decided to",
    ps.confidenceHighResponse = "So the question isn't whether you can — it's whether you will. What would help you decide?",
    ps.confidenceHighTools = ["cope-ahead"],
    ps.confidenceMedium = "I could do a small version of this",
    ps.confidenceMediumResponse = "Good — small is real. Let's find the smallest version that still counts.",
    ps.confidenceLow = "I'd need help or support to do this",
    ps.confidenceLowResponse = "That's honest. Who could help, and what specifically would you need from them?",
    ps.confidenceLowTools = ["dear-man", "finding-connection"],
    ps.confidenceNone = "I honestly don't think I can right now",
    ps.confidenceNoneResponse = "What would need to change for this to feel possible? Not easy — just possible.",
    ps.confidenceNoneTools = ["please-skill", "build-mastery"],
    ps.demoralizationValidation = "You've been trying. That matters, even though it hasn't landed the way you needed.",
    ps.decompositionIntro = "Let's look at the different parts of this. Some are facts you can't change. Some involve other people. Some are actually in your hands.",
    ps.decompositionFactsLabel = "Facts — things that just ARE",
    ps.decompositionOthersLabel = "Other people — you can influence but not control",
    ps.decompositionYoursLabel = "Your moves — things actually in your hands",
    ps.decompositionNothingInYoursMessage = "It looks like most of this is either facts or other people's choices. That's painful, and it's not a failure — it means the skill here is carrying this, not solving it.",
    ps.decompositionSomethingInYoursMessage = "There it is. Even if it's small, that's where your leverage lives. Let's work with that.";


// ============================================================
// 3. BARRIER SUB-RESPONSES — "I know what to do but can't"
//
//    MI path: explore what's blocking mobilization.
//    These are universal (apply across problem types) because
//    the mobilization barriers are about the person's
//    relationship to action, not the problem content.
// ============================================================

MERGE (r:BarrierSubResponse {id: 'cant-afraid-aftermath'})
SET r.label = 'I\'m afraid of what happens after',
    r.therapeuticResponse = 'The fear of consequences is real. But you can prepare for them. Rehearsing the hard part in your mind first makes the real thing less overwhelming.',
    r.redirectToolId = 'cope-ahead',
    r.sortOrder = 1,
    r.barrierTypeId = 'know-but-cant';

MERGE (r:BarrierSubResponse {id: 'cant-no-energy'})
SET r.label = 'I don\'t have the energy or bandwidth right now',
    r.therapeuticResponse = 'That\'s not a character flaw — it\'s a capacity issue. When you\'re depleted, even obvious steps feel impossible. Address the depletion first, then come back.',
    r.redirectToolId = 'please-skill',
    r.sortOrder = 2,
    r.barrierTypeId = 'know-but-cant';

MERGE (r:BarrierSubResponse {id: 'cant-ambivalent'})
SET r.label = 'Part of me doesn\'t actually want this to change',
    r.therapeuticResponse = 'That\'s more honest than most people get. Both sides of that ambivalence are real — the part that wants change AND the part that doesn\'t. Let\'s look at what staying the same protects you from.',
    r.redirectToolId = null,
    r.sortOrder = 3,
    r.barrierTypeId = 'know-but-cant',
    r.triggersAmbivalenceExploration = true;

MERGE (r:BarrierSubResponse {id: 'cant-keep-putting-off'})
SET r.label = 'I keep putting it off and I don\'t know why',
    r.therapeuticResponse = 'Avoidance usually protects you from something — discomfort, failure, conflict. Let\'s find the smallest possible version of this step and see how confident you feel about that.',
    r.redirectToolId = null,
    r.sortOrder = 4,
    r.barrierTypeId = 'know-but-cant',
    r.triggersConfidenceRuler = true;

// Link to barrier type
MATCH (bt:BarrierType {id: 'know-but-cant'})
MATCH (r:BarrierSubResponse {id: 'cant-afraid-aftermath'})
MERGE (bt)-[:HAS_SUB_RESPONSE]->(r);

MATCH (bt:BarrierType {id: 'know-but-cant'})
MATCH (r:BarrierSubResponse {id: 'cant-no-energy'})
MERGE (bt)-[:HAS_SUB_RESPONSE]->(r);

MATCH (bt:BarrierType {id: 'know-but-cant'})
MATCH (r:BarrierSubResponse {id: 'cant-ambivalent'})
MERGE (bt)-[:HAS_SUB_RESPONSE]->(r);

MATCH (bt:BarrierType {id: 'know-but-cant'})
MATCH (r:BarrierSubResponse {id: 'cant-keep-putting-off'})
MERGE (bt)-[:HAS_SUB_RESPONSE]->(r);


// ============================================================
// 4. BARRIER SUB-RESPONSES — "Involves another person"
// ============================================================

MERGE (r:BarrierSubResponse {id: 'person-dont-know-what-to-say'})
SET r.label = 'I don\'t know what to say',
    r.therapeuticResponse = 'That\'s what DEAR MAN is for — it gives you a structure so you don\'t have to figure it out from scratch.',
    r.redirectToolId = 'dear-man',
    r.sortOrder = 1,
    r.barrierTypeId = 'involves-person';

MERGE (r:BarrierSubResponse {id: 'person-scared-reaction'})
SET r.label = 'I\'m scared of their reaction',
    r.therapeuticResponse = 'The fear of their response is worth taking seriously. You can prepare for the conversation AND rehearse how you\'ll handle the hard reactions.',
    r.redirectToolId = 'cope-ahead',
    r.redirectToolIdSecondary = 'dear-man',
    r.sortOrder = 2,
    r.barrierTypeId = 'involves-person';

MERGE (r:BarrierSubResponse {id: 'person-tried-they-dont-listen'})
SET r.label = 'I\'ve tried and they don\'t listen',
    r.therapeuticResponse = 'When something hasn\'t landed, it might be the approach rather than the message. Sometimes changing HOW you say it changes whether it gets through. Or it might be time to accept the limits of your influence over this person.',
    r.redirectToolId = 'give',
    r.redirectToolIdSecondary = 'dialectics',
    r.sortOrder = 3,
    r.barrierTypeId = 'involves-person';

MERGE (r:BarrierSubResponse {id: 'person-no-right-to-speak'})
SET r.label = 'I don\'t feel like I have the right to say something',
    r.therapeuticResponse = 'That feeling is worth examining. You have needs, and communicating them isn\'t selfish — it\'s necessary. This might be more about protecting your self-respect than solving the external problem.',
    r.redirectToolId = 'fast',
    r.redirectToolIdSecondary = 'self-validate',
    r.sortOrder = 4,
    r.barrierTypeId = 'involves-person';

MATCH (bt:BarrierType {id: 'involves-person'})
MATCH (r:BarrierSubResponse {id: 'person-dont-know-what-to-say'})
MERGE (bt)-[:HAS_SUB_RESPONSE]->(r);

MATCH (bt:BarrierType {id: 'involves-person'})
MATCH (r:BarrierSubResponse {id: 'person-scared-reaction'})
MERGE (bt)-[:HAS_SUB_RESPONSE]->(r);

MATCH (bt:BarrierType {id: 'involves-person'})
MATCH (r:BarrierSubResponse {id: 'person-tried-they-dont-listen'})
MERGE (bt)-[:HAS_SUB_RESPONSE]->(r);

MATCH (bt:BarrierType {id: 'involves-person'})
MATCH (r:BarrierSubResponse {id: 'person-no-right-to-speak'})
MERGE (bt)-[:HAS_SUB_RESPONSE]->(r);


// ============================================================
// 5. BARRIER SUB-RESPONSES — "Tried, nothing works"
// ============================================================

MERGE (r:BarrierSubResponse {id: 'tried-talked-to-them'})
SET r.label = 'I\'ve talked to them about it',
    r.therapeuticResponse = 'Maybe it\'s the approach that needs to change, not the goal. There\'s a difference between saying your piece and saying it in a way that actually gets through.',
    r.redirectToolId = 'dear-man',
    r.redirectToolIdSecondary = 'give',
    r.sortOrder = 1,
    r.barrierTypeId = 'tried-nothing-works';

MERGE (r:BarrierSubResponse {id: 'tried-thinking-constantly'})
SET r.label = 'I\'ve been thinking about it constantly',
    r.therapeuticResponse = 'That\'s your mind working on it — and it counts. But thinking and doing are different skills. You\'ve done the thinking part. Let\'s try the doing part, starting with the smallest possible action.',
    r.redirectToolId = null,
    r.sortOrder = 2,
    r.barrierTypeId = 'tried-nothing-works',
    r.routesToSolutions = true,
    r.solutionSizeHint = 'small';

MERGE (r:BarrierSubResponse {id: 'tried-different-approaches'})
SET r.label = 'I\'ve tried different approaches and hit the same wall',
    r.therapeuticResponse = 'That tells you something important — either you need a genuinely different category of strategy, or the wall is one you can\'t get through and the wisdom is knowing when to redirect your energy.',
    r.redirectToolId = null,
    r.sortOrder = 3,
    r.barrierTypeId = 'tried-nothing-works',
    r.routesToSolutions = true;

MERGE (r:BarrierSubResponse {id: 'tried-exhausted'})
SET r.label = 'I don\'t even know anymore, I\'m exhausted',
    r.therapeuticResponse = 'Effort without results is exhausting. You\'re not failing — you\'re depleted. The most effective thing you can do right now is refill the tank, not push harder.',
    r.redirectToolId = 'please-skill',
    r.redirectToolIdSecondary = 'build-mastery',
    r.sortOrder = 4,
    r.barrierTypeId = 'tried-nothing-works';

MATCH (bt:BarrierType {id: 'tried-nothing-works'})
MATCH (r:BarrierSubResponse {id: 'tried-talked-to-them'})
MERGE (bt)-[:HAS_SUB_RESPONSE]->(r);

MATCH (bt:BarrierType {id: 'tried-nothing-works'})
MATCH (r:BarrierSubResponse {id: 'tried-thinking-constantly'})
MERGE (bt)-[:HAS_SUB_RESPONSE]->(r);

MATCH (bt:BarrierType {id: 'tried-nothing-works'})
MATCH (r:BarrierSubResponse {id: 'tried-different-approaches'})
MERGE (bt)-[:HAS_SUB_RESPONSE]->(r);

MATCH (bt:BarrierType {id: 'tried-nothing-works'})
MATCH (r:BarrierSubResponse {id: 'tried-exhausted'})
MERGE (bt)-[:HAS_SUB_RESPONSE]->(r);


// ============================================================
// 6. DECOMPOSITION ASPECTS — per ProblemType
//
//    Used in the "outside my control" barrier path.
//    Each ProblemType gets 3-4 aspects that the user sorts into
//    "fact / other people / my moves".
//
//    Each aspect has a defaultBucket suggestion (what most people
//    would classify it as) but the user makes the final call.
//    The therapeutic value is in the SORTING ACT itself.
// ============================================================

// --- FEAR: Safety Threat ---
MERGE (d:DecompositionAspect {id: 'fear-safety-da-threat-exists'})
SET d.label = 'The threat itself', d.defaultBucket = 'fact', d.sortOrder = 1;
MERGE (d:DecompositionAspect {id: 'fear-safety-da-my-location'})
SET d.label = 'Where I am and whether I stay', d.defaultBucket = 'yours', d.sortOrder = 2;
MERGE (d:DecompositionAspect {id: 'fear-safety-da-who-knows'})
SET d.label = 'Who knows about this and can help', d.defaultBucket = 'yours', d.sortOrder = 3;
MERGE (d:DecompositionAspect {id: 'fear-safety-da-other-behavior'})
SET d.label = 'What the other person does next', d.defaultBucket = 'others', d.sortOrder = 4;

MATCH (pt:ProblemType {id: 'fear-safety-threat'}) MATCH (d:DecompositionAspect {id: 'fear-safety-da-threat-exists'}) MERGE (pt)-[:HAS_DECOMPOSITION_ASPECT]->(d);
MATCH (pt:ProblemType {id: 'fear-safety-threat'}) MATCH (d:DecompositionAspect {id: 'fear-safety-da-my-location'}) MERGE (pt)-[:HAS_DECOMPOSITION_ASPECT]->(d);
MATCH (pt:ProblemType {id: 'fear-safety-threat'}) MATCH (d:DecompositionAspect {id: 'fear-safety-da-who-knows'}) MERGE (pt)-[:HAS_DECOMPOSITION_ASPECT]->(d);
MATCH (pt:ProblemType {id: 'fear-safety-threat'}) MATCH (d:DecompositionAspect {id: 'fear-safety-da-other-behavior'}) MERGE (pt)-[:HAS_DECOMPOSITION_ASPECT]->(d);

// --- FEAR: Health Threat ---
MERGE (d:DecompositionAspect {id: 'fear-health-da-diagnosis'})
SET d.label = 'The diagnosis or symptoms themselves', d.defaultBucket = 'fact', d.sortOrder = 1;
MERGE (d:DecompositionAspect {id: 'fear-health-da-treatment'})
SET d.label = 'What treatment or care I pursue', d.defaultBucket = 'yours', d.sortOrder = 2;
MERGE (d:DecompositionAspect {id: 'fear-health-da-info'})
SET d.label = 'How much I know about what\'s happening', d.defaultBucket = 'yours', d.sortOrder = 3;
MERGE (d:DecompositionAspect {id: 'fear-health-da-others-support'})
SET d.label = 'Whether other people help or show up', d.defaultBucket = 'others', d.sortOrder = 4;

MATCH (pt:ProblemType {id: 'fear-health-threat'}) MATCH (d:DecompositionAspect {id: 'fear-health-da-diagnosis'}) MERGE (pt)-[:HAS_DECOMPOSITION_ASPECT]->(d);
MATCH (pt:ProblemType {id: 'fear-health-threat'}) MATCH (d:DecompositionAspect {id: 'fear-health-da-treatment'}) MERGE (pt)-[:HAS_DECOMPOSITION_ASPECT]->(d);
MATCH (pt:ProblemType {id: 'fear-health-threat'}) MATCH (d:DecompositionAspect {id: 'fear-health-da-info'}) MERGE (pt)-[:HAS_DECOMPOSITION_ASPECT]->(d);
MATCH (pt:ProblemType {id: 'fear-health-threat'}) MATCH (d:DecompositionAspect {id: 'fear-health-da-others-support'}) MERGE (pt)-[:HAS_DECOMPOSITION_ASPECT]->(d);

// --- FEAR: Anticipatory ---
MERGE (d:DecompositionAspect {id: 'fear-antic-da-whether-happens'})
SET d.label = 'Whether the thing actually happens', d.defaultBucket = 'fact', d.sortOrder = 1;
MERGE (d:DecompositionAspect {id: 'fear-antic-da-preparation'})
SET d.label = 'How prepared I am if it does', d.defaultBucket = 'yours', d.sortOrder = 2;
MERGE (d:DecompositionAspect {id: 'fear-antic-da-reduce-risk'})
SET d.label = 'Steps I could take to reduce the risk', d.defaultBucket = 'yours', d.sortOrder = 3;
MERGE (d:DecompositionAspect {id: 'fear-antic-da-others-decisions'})
SET d.label = 'Other people\'s decisions that affect the outcome', d.defaultBucket = 'others', d.sortOrder = 4;

MATCH (pt:ProblemType {id: 'fear-anticipatory'}) MATCH (d:DecompositionAspect {id: 'fear-antic-da-whether-happens'}) MERGE (pt)-[:HAS_DECOMPOSITION_ASPECT]->(d);
MATCH (pt:ProblemType {id: 'fear-anticipatory'}) MATCH (d:DecompositionAspect {id: 'fear-antic-da-preparation'}) MERGE (pt)-[:HAS_DECOMPOSITION_ASPECT]->(d);
MATCH (pt:ProblemType {id: 'fear-anticipatory'}) MATCH (d:DecompositionAspect {id: 'fear-antic-da-reduce-risk'}) MERGE (pt)-[:HAS_DECOMPOSITION_ASPECT]->(d);
MATCH (pt:ProblemType {id: 'fear-anticipatory'}) MATCH (d:DecompositionAspect {id: 'fear-antic-da-others-decisions'}) MERGE (pt)-[:HAS_DECOMPOSITION_ASPECT]->(d);

// --- ANGER: Boundary Violation ---
MERGE (d:DecompositionAspect {id: 'anger-bound-da-what-happened'})
SET d.label = 'What they did', d.defaultBucket = 'fact', d.sortOrder = 1;
MERGE (d:DecompositionAspect {id: 'anger-bound-da-whether-speak'})
SET d.label = 'Whether I say something about it', d.defaultBucket = 'yours', d.sortOrder = 2;
MERGE (d:DecompositionAspect {id: 'anger-bound-da-their-response'})
SET d.label = 'How they respond when I do', d.defaultBucket = 'others', d.sortOrder = 3;
MERGE (d:DecompositionAspect {id: 'anger-bound-da-what-i-tolerate'})
SET d.label = 'What I\'m willing to tolerate going forward', d.defaultBucket = 'yours', d.sortOrder = 4;

MATCH (pt:ProblemType {id: 'anger-boundary-violation'}) MATCH (d:DecompositionAspect {id: 'anger-bound-da-what-happened'}) MERGE (pt)-[:HAS_DECOMPOSITION_ASPECT]->(d);
MATCH (pt:ProblemType {id: 'anger-boundary-violation'}) MATCH (d:DecompositionAspect {id: 'anger-bound-da-whether-speak'}) MERGE (pt)-[:HAS_DECOMPOSITION_ASPECT]->(d);
MATCH (pt:ProblemType {id: 'anger-boundary-violation'}) MATCH (d:DecompositionAspect {id: 'anger-bound-da-their-response'}) MERGE (pt)-[:HAS_DECOMPOSITION_ASPECT]->(d);
MATCH (pt:ProblemType {id: 'anger-boundary-violation'}) MATCH (d:DecompositionAspect {id: 'anger-bound-da-what-i-tolerate'}) MERGE (pt)-[:HAS_DECOMPOSITION_ASPECT]->(d);

// --- ANGER: Blocked Goal ---
MERGE (d:DecompositionAspect {id: 'anger-blocked-da-the-obstacle'})
SET d.label = 'The obstacle itself', d.defaultBucket = 'fact', d.sortOrder = 1;
MERGE (d:DecompositionAspect {id: 'anger-blocked-da-alternate-routes'})
SET d.label = 'Whether there\'s another way to get what I need', d.defaultBucket = 'yours', d.sortOrder = 2;
MERGE (d:DecompositionAspect {id: 'anger-blocked-da-gatekeeper'})
SET d.label = 'The person or system blocking me', d.defaultBucket = 'others', d.sortOrder = 3;
MERGE (d:DecompositionAspect {id: 'anger-blocked-da-worth-fighting'})
SET d.label = 'Whether this fight is worth my energy', d.defaultBucket = 'yours', d.sortOrder = 4;

MATCH (pt:ProblemType {id: 'anger-blocked-goal'}) MATCH (d:DecompositionAspect {id: 'anger-blocked-da-the-obstacle'}) MERGE (pt)-[:HAS_DECOMPOSITION_ASPECT]->(d);
MATCH (pt:ProblemType {id: 'anger-blocked-goal'}) MATCH (d:DecompositionAspect {id: 'anger-blocked-da-alternate-routes'}) MERGE (pt)-[:HAS_DECOMPOSITION_ASPECT]->(d);
MATCH (pt:ProblemType {id: 'anger-blocked-goal'}) MATCH (d:DecompositionAspect {id: 'anger-blocked-da-gatekeeper'}) MERGE (pt)-[:HAS_DECOMPOSITION_ASPECT]->(d);
MATCH (pt:ProblemType {id: 'anger-blocked-goal'}) MATCH (d:DecompositionAspect {id: 'anger-blocked-da-worth-fighting'}) MERGE (pt)-[:HAS_DECOMPOSITION_ASPECT]->(d);

// --- ANGER: Injustice ---
MERGE (d:DecompositionAspect {id: 'anger-injust-da-what-happened'})
SET d.label = 'The injustice itself', d.defaultBucket = 'fact', d.sortOrder = 1;
MERGE (d:DecompositionAspect {id: 'anger-injust-da-my-voice'})
SET d.label = 'Whether I speak up or take action', d.defaultBucket = 'yours', d.sortOrder = 2;
MERGE (d:DecompositionAspect {id: 'anger-injust-da-system'})
SET d.label = 'The system or people responsible', d.defaultBucket = 'others', d.sortOrder = 3;

MATCH (pt:ProblemType {id: 'anger-injustice'}) MATCH (d:DecompositionAspect {id: 'anger-injust-da-what-happened'}) MERGE (pt)-[:HAS_DECOMPOSITION_ASPECT]->(d);
MATCH (pt:ProblemType {id: 'anger-injustice'}) MATCH (d:DecompositionAspect {id: 'anger-injust-da-my-voice'}) MERGE (pt)-[:HAS_DECOMPOSITION_ASPECT]->(d);
MATCH (pt:ProblemType {id: 'anger-injustice'}) MATCH (d:DecompositionAspect {id: 'anger-injust-da-system'}) MERGE (pt)-[:HAS_DECOMPOSITION_ASPECT]->(d);

// --- SADNESS: Relationship Loss ---
MERGE (d:DecompositionAspect {id: 'sadness-loss-da-the-loss'})
SET d.label = 'The person being gone', d.defaultBucket = 'fact', d.sortOrder = 1;
MERGE (d:DecompositionAspect {id: 'sadness-loss-da-daily-gaps'})
SET d.label = 'The gaps in my daily life this created', d.defaultBucket = 'yours', d.sortOrder = 2;
MERGE (d:DecompositionAspect {id: 'sadness-loss-da-others-reaching'})
SET d.label = 'Whether other people reach out', d.defaultBucket = 'others', d.sortOrder = 3;
MERGE (d:DecompositionAspect {id: 'sadness-loss-da-what-i-do-now'})
SET d.label = 'How I structure my life going forward', d.defaultBucket = 'yours', d.sortOrder = 4;

MATCH (pt:ProblemType {id: 'sadness-relationship-loss'}) MATCH (d:DecompositionAspect {id: 'sadness-loss-da-the-loss'}) MERGE (pt)-[:HAS_DECOMPOSITION_ASPECT]->(d);
MATCH (pt:ProblemType {id: 'sadness-relationship-loss'}) MATCH (d:DecompositionAspect {id: 'sadness-loss-da-daily-gaps'}) MERGE (pt)-[:HAS_DECOMPOSITION_ASPECT]->(d);
MATCH (pt:ProblemType {id: 'sadness-relationship-loss'}) MATCH (d:DecompositionAspect {id: 'sadness-loss-da-others-reaching'}) MERGE (pt)-[:HAS_DECOMPOSITION_ASPECT]->(d);
MATCH (pt:ProblemType {id: 'sadness-relationship-loss'}) MATCH (d:DecompositionAspect {id: 'sadness-loss-da-what-i-do-now'}) MERGE (pt)-[:HAS_DECOMPOSITION_ASPECT]->(d);

// --- SADNESS: Goal Failure ---
MERGE (d:DecompositionAspect {id: 'sadness-fail-da-what-happened'})
SET d.label = 'That it didn\'t work out', d.defaultBucket = 'fact', d.sortOrder = 1;
MERGE (d:DecompositionAspect {id: 'sadness-fail-da-try-again'})
SET d.label = 'Whether I try again or try something different', d.defaultBucket = 'yours', d.sortOrder = 2;
MERGE (d:DecompositionAspect {id: 'sadness-fail-da-external-factors'})
SET d.label = 'External factors that contributed', d.defaultBucket = 'fact', d.sortOrder = 3;
MERGE (d:DecompositionAspect {id: 'sadness-fail-da-what-i-learned'})
SET d.label = 'What I learned and how I use it', d.defaultBucket = 'yours', d.sortOrder = 4;

MATCH (pt:ProblemType {id: 'sadness-goal-failure'}) MATCH (d:DecompositionAspect {id: 'sadness-fail-da-what-happened'}) MERGE (pt)-[:HAS_DECOMPOSITION_ASPECT]->(d);
MATCH (pt:ProblemType {id: 'sadness-goal-failure'}) MATCH (d:DecompositionAspect {id: 'sadness-fail-da-try-again'}) MERGE (pt)-[:HAS_DECOMPOSITION_ASPECT]->(d);
MATCH (pt:ProblemType {id: 'sadness-goal-failure'}) MATCH (d:DecompositionAspect {id: 'sadness-fail-da-external-factors'}) MERGE (pt)-[:HAS_DECOMPOSITION_ASPECT]->(d);
MATCH (pt:ProblemType {id: 'sadness-goal-failure'}) MATCH (d:DecompositionAspect {id: 'sadness-fail-da-what-i-learned'}) MERGE (pt)-[:HAS_DECOMPOSITION_ASPECT]->(d);

// --- SADNESS: Gradual Erosion ---
MERGE (d:DecompositionAspect {id: 'sadness-erosion-da-how-it-happened'})
SET d.label = 'How life got smaller', d.defaultBucket = 'fact', d.sortOrder = 1;
MERGE (d:DecompositionAspect {id: 'sadness-erosion-da-one-thing'})
SET d.label = 'One thing I could bring back or start', d.defaultBucket = 'yours', d.sortOrder = 2;
MERGE (d:DecompositionAspect {id: 'sadness-erosion-da-people-drifted'})
SET d.label = 'People who drifted away', d.defaultBucket = 'others', d.sortOrder = 3;
MERGE (d:DecompositionAspect {id: 'sadness-erosion-da-daily-structure'})
SET d.label = 'Whether I have any structure in my days', d.defaultBucket = 'yours', d.sortOrder = 4;

MATCH (pt:ProblemType {id: 'sadness-gradual-erosion'}) MATCH (d:DecompositionAspect {id: 'sadness-erosion-da-how-it-happened'}) MERGE (pt)-[:HAS_DECOMPOSITION_ASPECT]->(d);
MATCH (pt:ProblemType {id: 'sadness-gradual-erosion'}) MATCH (d:DecompositionAspect {id: 'sadness-erosion-da-one-thing'}) MERGE (pt)-[:HAS_DECOMPOSITION_ASPECT]->(d);
MATCH (pt:ProblemType {id: 'sadness-gradual-erosion'}) MATCH (d:DecompositionAspect {id: 'sadness-erosion-da-people-drifted'}) MERGE (pt)-[:HAS_DECOMPOSITION_ASPECT]->(d);
MATCH (pt:ProblemType {id: 'sadness-gradual-erosion'}) MATCH (d:DecompositionAspect {id: 'sadness-erosion-da-daily-structure'}) MERGE (pt)-[:HAS_DECOMPOSITION_ASPECT]->(d);

// --- GUILT: Clear Harm ---
MERGE (d:DecompositionAspect {id: 'guilt-harm-da-what-i-did'})
SET d.label = 'What I did', d.defaultBucket = 'fact', d.sortOrder = 1;
MERGE (d:DecompositionAspect {id: 'guilt-harm-da-repair'})
SET d.label = 'Whether I apologize or make amends', d.defaultBucket = 'yours', d.sortOrder = 2;
MERGE (d:DecompositionAspect {id: 'guilt-harm-da-their-forgiveness'})
SET d.label = 'Whether they forgive me', d.defaultBucket = 'others', d.sortOrder = 3;
MERGE (d:DecompositionAspect {id: 'guilt-harm-da-my-behavior'})
SET d.label = 'What I do differently going forward', d.defaultBucket = 'yours', d.sortOrder = 4;

MATCH (pt:ProblemType {id: 'guilt-clear-harm'}) MATCH (d:DecompositionAspect {id: 'guilt-harm-da-what-i-did'}) MERGE (pt)-[:HAS_DECOMPOSITION_ASPECT]->(d);
MATCH (pt:ProblemType {id: 'guilt-clear-harm'}) MATCH (d:DecompositionAspect {id: 'guilt-harm-da-repair'}) MERGE (pt)-[:HAS_DECOMPOSITION_ASPECT]->(d);
MATCH (pt:ProblemType {id: 'guilt-clear-harm'}) MATCH (d:DecompositionAspect {id: 'guilt-harm-da-their-forgiveness'}) MERGE (pt)-[:HAS_DECOMPOSITION_ASPECT]->(d);
MATCH (pt:ProblemType {id: 'guilt-clear-harm'}) MATCH (d:DecompositionAspect {id: 'guilt-harm-da-my-behavior'}) MERGE (pt)-[:HAS_DECOMPOSITION_ASPECT]->(d);

// --- GUILT: Pattern ---
MERGE (d:DecompositionAspect {id: 'guilt-pattern-da-the-pattern'})
SET d.label = 'That this keeps happening', d.defaultBucket = 'fact', d.sortOrder = 1;
MERGE (d:DecompositionAspect {id: 'guilt-pattern-da-trigger'})
SET d.label = 'What triggers it', d.defaultBucket = 'yours', d.sortOrder = 2;
MERGE (d:DecompositionAspect {id: 'guilt-pattern-da-environment'})
SET d.label = 'The environment or conditions that make it worse', d.defaultBucket = 'yours', d.sortOrder = 3;

MATCH (pt:ProblemType {id: 'guilt-pattern'}) MATCH (d:DecompositionAspect {id: 'guilt-pattern-da-the-pattern'}) MERGE (pt)-[:HAS_DECOMPOSITION_ASPECT]->(d);
MATCH (pt:ProblemType {id: 'guilt-pattern'}) MATCH (d:DecompositionAspect {id: 'guilt-pattern-da-trigger'}) MERGE (pt)-[:HAS_DECOMPOSITION_ASPECT]->(d);
MATCH (pt:ProblemType {id: 'guilt-pattern'}) MATCH (d:DecompositionAspect {id: 'guilt-pattern-da-environment'}) MERGE (pt)-[:HAS_DECOMPOSITION_ASPECT]->(d);

// --- GUILT: Values Conflict ---
MERGE (d:DecompositionAspect {id: 'guilt-conflict-da-the-choice'})
SET d.label = 'The choice I made', d.defaultBucket = 'fact', d.sortOrder = 1;
MERGE (d:DecompositionAspect {id: 'guilt-conflict-da-cost'})
SET d.label = 'The cost it had on someone or something', d.defaultBucket = 'fact', d.sortOrder = 2;
MERGE (d:DecompositionAspect {id: 'guilt-conflict-da-mitigate'})
SET d.label = 'Whether I can reduce the damage going forward', d.defaultBucket = 'yours', d.sortOrder = 3;

MATCH (pt:ProblemType {id: 'guilt-values-conflict'}) MATCH (d:DecompositionAspect {id: 'guilt-conflict-da-the-choice'}) MERGE (pt)-[:HAS_DECOMPOSITION_ASPECT]->(d);
MATCH (pt:ProblemType {id: 'guilt-values-conflict'}) MATCH (d:DecompositionAspect {id: 'guilt-conflict-da-cost'}) MERGE (pt)-[:HAS_DECOMPOSITION_ASPECT]->(d);
MATCH (pt:ProblemType {id: 'guilt-values-conflict'}) MATCH (d:DecompositionAspect {id: 'guilt-conflict-da-mitigate'}) MERGE (pt)-[:HAS_DECOMPOSITION_ASPECT]->(d);

// --- DISGUST: Forced Proximity ---
MERGE (d:DecompositionAspect {id: 'disgust-prox-da-the-situation'})
SET d.label = 'That I\'m in this situation', d.defaultBucket = 'fact', d.sortOrder = 1;
MERGE (d:DecompositionAspect {id: 'disgust-prox-da-distance'})
SET d.label = 'How much distance I can create', d.defaultBucket = 'yours', d.sortOrder = 2;
MERGE (d:DecompositionAspect {id: 'disgust-prox-da-their-behavior'})
SET d.label = 'The other person\'s behavior', d.defaultBucket = 'others', d.sortOrder = 3;

MATCH (pt:ProblemType {id: 'disgust-forced-proximity'}) MATCH (d:DecompositionAspect {id: 'disgust-prox-da-the-situation'}) MERGE (pt)-[:HAS_DECOMPOSITION_ASPECT]->(d);
MATCH (pt:ProblemType {id: 'disgust-forced-proximity'}) MATCH (d:DecompositionAspect {id: 'disgust-prox-da-distance'}) MERGE (pt)-[:HAS_DECOMPOSITION_ASPECT]->(d);
MATCH (pt:ProblemType {id: 'disgust-forced-proximity'}) MATCH (d:DecompositionAspect {id: 'disgust-prox-da-their-behavior'}) MERGE (pt)-[:HAS_DECOMPOSITION_ASPECT]->(d);

// --- DISGUST: Values Violation ---
MERGE (d:DecompositionAspect {id: 'disgust-values-da-whats-wrong'})
SET d.label = 'What\'s happening that feels wrong', d.defaultBucket = 'fact', d.sortOrder = 1;
MERGE (d:DecompositionAspect {id: 'disgust-values-da-voice'})
SET d.label = 'Whether I say something', d.defaultBucket = 'yours', d.sortOrder = 2;
MERGE (d:DecompositionAspect {id: 'disgust-values-da-exit'})
SET d.label = 'Whether I can move toward an environment that fits my values', d.defaultBucket = 'yours', d.sortOrder = 3;

MATCH (pt:ProblemType {id: 'disgust-values-violation'}) MATCH (d:DecompositionAspect {id: 'disgust-values-da-whats-wrong'}) MERGE (pt)-[:HAS_DECOMPOSITION_ASPECT]->(d);
MATCH (pt:ProblemType {id: 'disgust-values-violation'}) MATCH (d:DecompositionAspect {id: 'disgust-values-da-voice'}) MERGE (pt)-[:HAS_DECOMPOSITION_ASPECT]->(d);
MATCH (pt:ProblemType {id: 'disgust-values-violation'}) MATCH (d:DecompositionAspect {id: 'disgust-values-da-exit'}) MERGE (pt)-[:HAS_DECOMPOSITION_ASPECT]->(d);

// --- ENVY: Resource Gap ---
MERGE (d:DecompositionAspect {id: 'envy-gap-da-what-they-have'})
SET d.label = 'What they have', d.defaultBucket = 'fact', d.sortOrder = 1;
MERGE (d:DecompositionAspect {id: 'envy-gap-da-barriers'})
SET d.label = 'The barriers between me and getting there', d.defaultBucket = 'yours', d.sortOrder = 2;
MERGE (d:DecompositionAspect {id: 'envy-gap-da-what-i-have'})
SET d.label = 'What I already have to work with', d.defaultBucket = 'yours', d.sortOrder = 3;

MATCH (pt:ProblemType {id: 'envy-resource-gap'}) MATCH (d:DecompositionAspect {id: 'envy-gap-da-what-they-have'}) MERGE (pt)-[:HAS_DECOMPOSITION_ASPECT]->(d);
MATCH (pt:ProblemType {id: 'envy-resource-gap'}) MATCH (d:DecompositionAspect {id: 'envy-gap-da-barriers'}) MERGE (pt)-[:HAS_DECOMPOSITION_ASPECT]->(d);
MATCH (pt:ProblemType {id: 'envy-resource-gap'}) MATCH (d:DecompositionAspect {id: 'envy-gap-da-what-i-have'}) MERGE (pt)-[:HAS_DECOMPOSITION_ASPECT]->(d);

// --- ENVY: Unfair Advantage ---
MERGE (d:DecompositionAspect {id: 'envy-unfair-da-the-inequality'})
SET d.label = 'The structural advantage they had', d.defaultBucket = 'fact', d.sortOrder = 1;
MERGE (d:DecompositionAspect {id: 'envy-unfair-da-my-path'})
SET d.label = 'The path available to me from where I actually am', d.defaultBucket = 'yours', d.sortOrder = 2;
MERGE (d:DecompositionAspect {id: 'envy-unfair-da-system-change'})
SET d.label = 'Whether the system itself can be changed', d.defaultBucket = 'others', d.sortOrder = 3;

MATCH (pt:ProblemType {id: 'envy-unfair-advantage'}) MATCH (d:DecompositionAspect {id: 'envy-unfair-da-the-inequality'}) MERGE (pt)-[:HAS_DECOMPOSITION_ASPECT]->(d);
MATCH (pt:ProblemType {id: 'envy-unfair-advantage'}) MATCH (d:DecompositionAspect {id: 'envy-unfair-da-my-path'}) MERGE (pt)-[:HAS_DECOMPOSITION_ASPECT]->(d);
MATCH (pt:ProblemType {id: 'envy-unfair-advantage'}) MATCH (d:DecompositionAspect {id: 'envy-unfair-da-system-change'}) MERGE (pt)-[:HAS_DECOMPOSITION_ASPECT]->(d);

// --- JEALOUSY: Broken Trust ---
MERGE (d:DecompositionAspect {id: 'jealousy-trust-da-what-happened'})
SET d.label = 'What they did', d.defaultBucket = 'fact', d.sortOrder = 1;
MERGE (d:DecompositionAspect {id: 'jealousy-trust-da-conversation'})
SET d.label = 'Whether I address it directly', d.defaultBucket = 'yours', d.sortOrder = 2;
MERGE (d:DecompositionAspect {id: 'jealousy-trust-da-their-willingness'})
SET d.label = 'Whether they\'re willing to rebuild trust', d.defaultBucket = 'others', d.sortOrder = 3;
MERGE (d:DecompositionAspect {id: 'jealousy-trust-da-my-terms'})
SET d.label = 'What I need to feel safe, and whether I stay', d.defaultBucket = 'yours', d.sortOrder = 4;

MATCH (pt:ProblemType {id: 'jealousy-broken-trust'}) MATCH (d:DecompositionAspect {id: 'jealousy-trust-da-what-happened'}) MERGE (pt)-[:HAS_DECOMPOSITION_ASPECT]->(d);
MATCH (pt:ProblemType {id: 'jealousy-broken-trust'}) MATCH (d:DecompositionAspect {id: 'jealousy-trust-da-conversation'}) MERGE (pt)-[:HAS_DECOMPOSITION_ASPECT]->(d);
MATCH (pt:ProblemType {id: 'jealousy-broken-trust'}) MATCH (d:DecompositionAspect {id: 'jealousy-trust-da-their-willingness'}) MERGE (pt)-[:HAS_DECOMPOSITION_ASPECT]->(d);
MATCH (pt:ProblemType {id: 'jealousy-broken-trust'}) MATCH (d:DecompositionAspect {id: 'jealousy-trust-da-my-terms'}) MERGE (pt)-[:HAS_DECOMPOSITION_ASPECT]->(d);

// --- JEALOUSY: Active Threat ---
MERGE (d:DecompositionAspect {id: 'jealousy-threat-da-the-threat'})
SET d.label = 'The person or situation threatening things', d.defaultBucket = 'others', d.sortOrder = 1;
MERGE (d:DecompositionAspect {id: 'jealousy-threat-da-talk-partner'})
SET d.label = 'Whether I talk to my person about it', d.defaultBucket = 'yours', d.sortOrder = 2;
MERGE (d:DecompositionAspect {id: 'jealousy-threat-da-invest'})
SET d.label = 'How I invest in the relationship', d.defaultBucket = 'yours', d.sortOrder = 3;

MATCH (pt:ProblemType {id: 'jealousy-active-threat'}) MATCH (d:DecompositionAspect {id: 'jealousy-threat-da-the-threat'}) MERGE (pt)-[:HAS_DECOMPOSITION_ASPECT]->(d);
MATCH (pt:ProblemType {id: 'jealousy-active-threat'}) MATCH (d:DecompositionAspect {id: 'jealousy-threat-da-talk-partner'}) MERGE (pt)-[:HAS_DECOMPOSITION_ASPECT]->(d);
MATCH (pt:ProblemType {id: 'jealousy-active-threat'}) MATCH (d:DecompositionAspect {id: 'jealousy-threat-da-invest'}) MERGE (pt)-[:HAS_DECOMPOSITION_ASPECT]->(d);

// --- LOVE: External Barrier ---
MERGE (d:DecompositionAspect {id: 'love-ext-da-the-barrier'})
SET d.label = 'The logistical barrier (distance, timing, etc.)', d.defaultBucket = 'fact', d.sortOrder = 1;
MERGE (d:DecompositionAspect {id: 'love-ext-da-creative-solutions'})
SET d.label = 'Creative options I haven\'t tried', d.defaultBucket = 'yours', d.sortOrder = 2;
MERGE (d:DecompositionAspect {id: 'love-ext-da-their-willingness'})
SET d.label = 'Their willingness to work on this together', d.defaultBucket = 'others', d.sortOrder = 3;

MATCH (pt:ProblemType {id: 'love-external-barrier'}) MATCH (d:DecompositionAspect {id: 'love-ext-da-the-barrier'}) MERGE (pt)-[:HAS_DECOMPOSITION_ASPECT]->(d);
MATCH (pt:ProblemType {id: 'love-external-barrier'}) MATCH (d:DecompositionAspect {id: 'love-ext-da-creative-solutions'}) MERGE (pt)-[:HAS_DECOMPOSITION_ASPECT]->(d);
MATCH (pt:ProblemType {id: 'love-external-barrier'}) MATCH (d:DecompositionAspect {id: 'love-ext-da-their-willingness'}) MERGE (pt)-[:HAS_DECOMPOSITION_ASPECT]->(d);

// --- LOVE: Internal Conflict ---
MERGE (d:DecompositionAspect {id: 'love-int-da-the-pattern'})
SET d.label = 'The dynamic between us that isn\'t working', d.defaultBucket = 'fact', d.sortOrder = 1;
MERGE (d:DecompositionAspect {id: 'love-int-da-conversation'})
SET d.label = 'Whether I bring it up directly', d.defaultBucket = 'yours', d.sortOrder = 2;
MERGE (d:DecompositionAspect {id: 'love-int-da-their-part'})
SET d.label = 'Whether they\'re willing to change their part', d.defaultBucket = 'others', d.sortOrder = 3;

MATCH (pt:ProblemType {id: 'love-internal-conflict'}) MATCH (d:DecompositionAspect {id: 'love-int-da-the-pattern'}) MERGE (pt)-[:HAS_DECOMPOSITION_ASPECT]->(d);
MATCH (pt:ProblemType {id: 'love-internal-conflict'}) MATCH (d:DecompositionAspect {id: 'love-int-da-conversation'}) MERGE (pt)-[:HAS_DECOMPOSITION_ASPECT]->(d);
MATCH (pt:ProblemType {id: 'love-internal-conflict'}) MATCH (d:DecompositionAspect {id: 'love-int-da-their-part'}) MERGE (pt)-[:HAS_DECOMPOSITION_ASPECT]->(d);


// ============================================================
// 7. AMBIVALENCE OPTIONS — per ProblemType
//
//    Used when user selects "part of me doesn't want this
//    to change" in the know-but-cant barrier path.
//    MI ambivalence exploration: "What does staying the
//    same protect you from?"
//
//    Each option has a therapeuticFollow — what to say/do
//    after they name the ambivalence. This is the purest MI
//    moment: reflect, don't push.
// ============================================================

// --- Universal ambivalence options (apply to all problem types) ---
// Stored on the BarrierSubResponse node that triggers them

MERGE (a:AmbivalenceOption {id: 'ambiv-hard-conversation'})
SET a.label = 'A hard conversation I don\'t want to have',
    a.therapeuticFollow = 'That makes sense — hard conversations carry real risk. The question isn\'t whether to avoid the discomfort, it\'s whether the cost of not having the conversation is higher than the cost of having it.',
    a.redirectToolId = 'cope-ahead',
    a.sortOrder = 1;

MERGE (a:AmbivalenceOption {id: 'ambiv-change-might-not-help'})
SET a.label = 'Finding out that the change doesn\'t actually help',
    a.therapeuticFollow = 'If you change things and it still hurts — then what? That fear is real. But staying where you are to avoid finding out is its own kind of answer.',
    a.redirectToolId = null,
    a.sortOrder = 2;

MERGE (a:AmbivalenceOption {id: 'ambiv-losing-something'})
SET a.label = 'Losing something I still value about the current situation',
    a.therapeuticFollow = 'Change usually costs something. What would you lose? Is there a way to make the change and keep the part that matters?',
    a.redirectToolId = 'dialectics',
    a.sortOrder = 3;

MERGE (a:AmbivalenceOption {id: 'ambiv-admitting-need-help'})
SET a.label = 'Having to admit I was wrong or that I need help',
    a.therapeuticFollow = 'Asking for help or admitting a mistake feels like it makes you smaller. In practice, it almost always makes people respect you more, not less.',
    a.redirectToolId = 'fast',
    a.sortOrder = 4;

// Link ambivalence options to the sub-response that triggers them
MATCH (r:BarrierSubResponse {id: 'cant-ambivalent'})
MATCH (a:AmbivalenceOption {id: 'ambiv-hard-conversation'})
MERGE (r)-[:HAS_AMBIVALENCE_OPTION]->(a);

MATCH (r:BarrierSubResponse {id: 'cant-ambivalent'})
MATCH (a:AmbivalenceOption {id: 'ambiv-change-might-not-help'})
MERGE (r)-[:HAS_AMBIVALENCE_OPTION]->(a);

MATCH (r:BarrierSubResponse {id: 'cant-ambivalent'})
MATCH (a:AmbivalenceOption {id: 'ambiv-losing-something'})
MERGE (r)-[:HAS_AMBIVALENCE_OPTION]->(a);

MATCH (r:BarrierSubResponse {id: 'cant-ambivalent'})
MATCH (a:AmbivalenceOption {id: 'ambiv-admitting-need-help'})
MERGE (r)-[:HAS_AMBIVALENCE_OPTION]->(a);
