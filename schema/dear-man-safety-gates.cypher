// ============================================================
// DEAR MAN SAFETY GATES — copy for the arousal gates in DEAR MAN
//
//   Numeric thresholds (downshiftAt, askMax, waitMinutes) and the
//   shared wait-lock / breathing copy are NOT duplicated here: they
//   are read from (:InvalidationRecoveryFlow {id: 'invalidation_recovery_flow'})
//   by getDearManContent. This file holds only the DEAR MAN-specific
//   lines: the carried-over context card, the intensity check, the
//   re-rate prompt, the one-message note and the plan wait lock.
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
SET c.version = 'dear-man-safety-v1',
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
    c.planLocked = 'Your plan unlocks after the wait. Put the phone down, or do something with your hands.',
    c.planUnlocked = 'Unlocked. Re-read your plan once. If it still fits, go ahead.',
    c.planLockedHeading = 'A {minutes}-minute wait before you use this plan';


// ============================================================
// 2. LINK TO THE DEAR MAN THERAPY CONCEPT (traceability)
// ============================================================

MATCH (c:DearManSafetyCopy {id: 'dear_man_safety_copy'}), (tc:TherapyConcept {id: 'dbt_dear_man'})
MERGE (tc)-[:HAS_SAFETY_COPY]->(c);
