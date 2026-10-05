// ============================================================
// CHECK-IN SAFETY QUESTION
// schema/checkin-safety.cypher
//
// Oct 2026 (Claudia). "I'm spiraling and can't stop it" (hu_exp_flooding) is the doorway to
// emotional_flooding, whose TRIGGERS_SAFETY flag is crisis_self_harm ("Self-harm urges + 'out of
// control'", condition out_of_control_with_intent_language). The check-in never asked about urges,
// so the condition could not be checked and every spiral answer showed the full crisis banner.
//
// This file:
//   1. adds an optional, direct follow-up after the spiral answer (hu_safety_urge, kind "safety");
//   2. links Yes and Not sure to crisis_self_harm (RAISES_SAFETY): the full banner, whatever the
//      pattern (an explicit signal is never gated by the quadrant or the routing switch);
//   3. marks flooding's flag withoutSignal "line": with no yes (No, Skip, or never asked), a calm
//      line with 988 shows instead of the banner. 988 is on screen either way.
// The engine reads 2 and 3 in functions/src/safety/checkinSafetyFlag.ts. The answer is sent to
// getStateAndTools and never saved with the check-in (the app drops kind "safety" answers);
// CheckIn.safetyFlagId records that the banner showed.
//
// Loads after discriminating-questions.cypher (hu_exp_flooding) and relationships.cypher (the flag
// edge). MERGE-only; uses existing constraints (DiscriminatingQuestion, QuestionResponse, SafetyFlag).
// ============================================================

// --- 1. The question (shown only after "I'm spiraling and can't stop it") ---
// Direct, as asked: naming self-harm and suicide plainly is recommended practice in screening
// (asking does not raise risk) and lets the banner fire for the people it is for.
MERGE (q:DiscriminatingQuestion {id: "hu_safety_urge"})
SET q += {
  text: "Are you having any thoughts of hurting yourself or ending your life?",
  subtext: "Any answer is okay. It only changes what we show you next.",
  applicableQuadrants: ["high-unpleasant"],
  order: 3,
  required: false,
  kind: "safety",
  clinicalDimension: "self_harm_or_suicidal_ideation",
  clinicalRationale: "Checks the intent half of crisis_self_harm's condition (out of control + intent) for someone who has just said they are spiraling. Yes or not sure raises the full crisis banner; no or skip shows a calm line with 988 instead. Optional and skippable; the answer is not stored.",
  keyCitations: ["Dazzi et al. (2014, asking about suicide does not increase suicidal ideation)", "PHQ-9 item 9 (thoughts of being better off dead or of hurting yourself)"]
};

MERGE (r:QuestionResponse {id: "hu_safety_yes"})
SET r += {
  label: "Yes",
  subtext: "Even a little, or on and off.",
  order: 1,
  isEscapeHatch: false,
  clinicalSignal: "Self-reported self-harm or suicidal thoughts while flooded: the full crisis banner (crisis_self_harm)."
};

MERGE (r:QuestionResponse {id: "hu_safety_unsure"})
SET r += {
  label: "I'm not sure",
  order: 2,
  isEscapeHatch: true,
  clinicalSignal: "Ambivalent answer while flooded: treated as yes (full crisis banner); the cost of a wrong yes is the banner, the cost of a wrong no is missing someone."
};

MERGE (r:QuestionResponse {id: "hu_safety_no"})
SET r += {
  label: "No",
  order: 3,
  isEscapeHatch: false,
  clinicalSignal: "No self-harm or suicidal thoughts reported: flooding shows the calm 988 line, not the crisis banner."
};

MATCH (q:DiscriminatingQuestion {id: "hu_safety_urge"})
MATCH (r:QuestionResponse {id: "hu_safety_yes"})
MERGE (q)-[h:HAS_RESPONSE]->(r)
SET h.order = 1;

MATCH (q:DiscriminatingQuestion {id: "hu_safety_urge"})
MATCH (r:QuestionResponse {id: "hu_safety_unsure"})
MERGE (q)-[h:HAS_RESPONSE]->(r)
SET h.order = 2;

MATCH (q:DiscriminatingQuestion {id: "hu_safety_urge"})
MATCH (r:QuestionResponse {id: "hu_safety_no"})
MERGE (q)-[h:HAS_RESPONSE]->(r)
SET h.order = 3;

// The spiral answer leads to it.
MATCH (r:QuestionResponse {id: "hu_exp_flooding"})
MATCH (q:DiscriminatingQuestion {id: "hu_safety_urge"})
MERGE (r)-[t:TRIGGERS_NEXT]->(q)
SET t.reason = "Spiraling is the doorway to emotional_flooding and its crisis_self_harm flag, whose condition needs intent: ask directly instead of assuming it";

// --- 2. An explicit signal raises the banner ---
MATCH (r:QuestionResponse {id: "hu_safety_yes"})
MATCH (s:SafetyFlag {id: "crisis_self_harm"})
MERGE (r)-[t:RAISES_SAFETY]->(s)
SET t.reason = "Self-reported self-harm or suicidal thoughts";

MATCH (r:QuestionResponse {id: "hu_safety_unsure"})
MATCH (s:SafetyFlag {id: "crisis_self_harm"})
MERGE (r)-[t:RAISES_SAFETY]->(s)
SET t.reason = "Not sure counts as yes";

// --- 3. Flooding without a signal: the calm line ---
MATCH (p:ActivationPattern {id: "emotional_flooding"})
MATCH (s:SafetyFlag {id: "crisis_self_harm"})
MERGE (p)-[t:TRIGGERS_SAFETY]->(s)
SET t += {withoutSignal: "line", signalQuestionId: "hu_safety_urge"};
