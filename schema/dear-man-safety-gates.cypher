// ============================================================
// DEAR MAN SAFETY GATES — copy for the arousal gates in DEAR MAN
//
//   Numeric thresholds (downshiftAt, askMax, waitMinutes) and the
//   shared wait-lock / breathing copy are NOT duplicated here: they
//   are read from (:InvalidationRecoveryFlow {id: 'invalidation_recovery_flow'})
//   by getDearManContent. This file holds only the DEAR MAN-specific
//   lines: the carried-over context card, the intensity check, the
//   re-rate prompt, the one-message note and the "still loud" heads-up.
//
//   The plan is never locked. Someone who worked through the whole
//   plan while angry gets a heads-up that it won't land the way they
//   mean it, and an optional 30-second breath to take the edge off.
//   (v1 locked the plan for 20 minutes; that punished the effort and
//   pushed people to send without the plan.)
//
//   handoffSituationId names the DearManSituationType a handoff from
//   "Recover from a hurtful moment" preselects ('address' is defined
//   in dear-man-content.cypher).
//
// All operations use MERGE + SET — safe to re-run.
// Chunked per Aura requirement (no variable persistence).
// Load AFTER dear-man-content.cypher and invalidation-recovery.cypher.
// ============================================================


// --- CONSTRAINTS ---
CREATE CONSTRAINT dearman_safety_copy_id IF NOT EXISTS
FOR (c:DearManSafetyCopy) REQUIRE c.id IS UNIQUE;


// ============================================================
// 1. SAFETY COPY
//    {emotion} / {need} / {minutes} are filled by the frontend.
// ============================================================

MERGE (c:DearManSafetyCopy {id: 'dear_man_safety_copy'})
SET c.version = 'dear-man-safety-v2',
    c.handoffSituationId = 'address',
    c.carriedOver = 'Carried over: {emotion} · you needed {need}',
    c.carriedOverDismiss = 'Hide',
    c.intensityQuestion = 'Before we plan: how loud is it right now?',
    c.intensityHint = "Just a number. Planning goes better when it's quieter.",
    c.intensityLow = 'Quiet',
    c.intensityHigh = 'Too loud to think',
    c.downshiftLead = "That's loud. At this level, words come out sharper than we mean them. Settle your body first, then we'll plan.",
    c.rerateQuestion = 'How loud is it now?',
    c.rerateHint = 'One more number, then we build your plan.',
    c.oneMessageOnly = 'One message only. Say it once, then give them room to answer.',
    c.hotHeading = "Your plan is ready. Heads up: it's still loud in there.",
    c.hotBody = "When you're this angry or worked up, even a good plan comes out sharper than you mean it, and they'll hear the anger before they hear the ask. Taking the edge off first makes it more likely you get what you're asking for.",
    c.hotCoolDown = 'Take the edge off (about 30 seconds)',
    c.hotReady = "I'm good to go",
    c.hotBodyCue = 'Unclench your jaw and drop your shoulders while you read it through.',
    c.hotCooled = "That's the edge off. Read your plan once more, out loud if you can, then go when it feels right."
REMOVE c.planLocked, c.planUnlocked, c.planLockedHeading;


// ============================================================
// 2. LINK TO THE DEAR MAN THERAPY CONCEPT (traceability)
// ============================================================

MATCH (c:DearManSafetyCopy {id: 'dear_man_safety_copy'}), (tc:TherapyConcept {id: 'dbt_dear_man'})
MERGE (tc)-[:HAS_SAFETY_COPY]->(c);
