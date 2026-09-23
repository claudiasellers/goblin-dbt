/** Input validation only. Clinical content and routing stay in the graph. */
export function validateOppositeActionSession(
  input: unknown,
  now: Date = new Date(),
): Record<string, unknown> {
  if (!input || typeof input !== "object" || Array.isArray(input))
    throw new Error("Expected a session");
  const raw = input as Record<string, unknown>;
  if (raw.schemaVersion === 2) return validateV2(raw, now);
  return validateV1(raw);
}

function validateV1(raw: Record<string, unknown>): Record<string, unknown> {
  const strings = [
    "id",
    "contentVersion",
    "emotionId",
    "parentId",
    "urgeId",
    "customUrge",
    "situation",
    "observation",
    "interpretation",
    "goal",
    "safety",
    "facts",
    "effectiveness",
    "actionSize",
    "action",
    "cue",
    "barrier",
    "backup",
    "willingness",
    "status",
    "outcome",
    "reflection",
  ];
  const result: Record<string, unknown> = {};
  for (const key of strings) {
    if (typeof raw[key] !== "string" || (raw[key] as string).length > 1500)
      throw new Error(`Invalid ${key}`);
    result[key] = (raw[key] as string).trim();
  }
  if (!/^[a-f0-9-]{36}$/i.test(result.id as string))
    throw new Error("Invalid session ID");
  for (const key of [
    "emotionId",
    "parentId",
    "urgeId",
    "action",
    "cue",
    "goal",
    "situation",
    "barrier",
  ]) {
    if (!result[key]) throw new Error(`Missing ${key}`);
  }
  const enumField = (key: string, values: string[]) => {
    if (!values.includes(result[key] as string))
      throw new Error(`Invalid ${key}`);
  };
  enumField("safety", ["safe"]);
  enumField("facts", ["fits", "excessive", "not_fit"]);
  enumField("effectiveness", ["unhelpful"]);
  enumField("status", ["planned", "practiced"]);
  enumField("actionSize", ["small", "medium", "bigger", "custom"]);
  enumField("willingness", ["ready"]);
  enumField("situation", ["relationship", "work", "change", "self", "other"]);
  enumField("goal", [
    "connection",
    "boundary",
    "progress",
    "repair",
    "self_respect",
  ]);
  enumField("barrier", ["none", "too_big", "forget", "emotion", "other"]);
  if (result.barrier !== "none" && !result.backup)
    throw new Error("Missing backup");
  if (result.urgeId === "custom" && !result.customUrge)
    throw new Error("Missing custom urge");
  if (raw.schemaVersion !== 1 || raw.bodyPractice !== true)
    throw new Error("Invalid session version or practice");
  const intensity = (v: unknown) =>
    typeof v === "number" && Number.isInteger(v) && v >= 0 && v <= 10;
  if (!intensity(raw.intensityBefore)) throw new Error("Invalid baseline");
  if (result.status === "practiced") {
    if (!intensity(raw.intensityAfter))
      throw new Error("Invalid reflection intensity");
    enumField("outcome", ["toward_goal", "partial", "unclear", "unsafe"]);
  } else if (
    raw.intensityAfter !== null ||
    result.outcome !== "" ||
    result.reflection !== ""
  )
    throw new Error("Plans cannot contain outcomes");
  Object.assign(result, {
    schemaVersion: 1,
    bodyPractice: true,
    intensityBefore: raw.intensityBefore,
    intensityAfter: raw.intensityAfter,
  });
  // Sources are supplied from the server's content record, never trusted from the client.
  return result;
}

const isScore = (v: unknown) =>
  typeof v === "number" && Number.isInteger(v) && v >= 0 && v <= 10;
const isScoreOrNull = (v: unknown) => v === null || isScore(v);

/**
 * schemaVersion 2 (oa-guided-v2): compressed triage, somatic circuit-breaker,
 * urge-first metrics, and follow-up for plans tried later.
 */
function validateV2(
  raw: Record<string, unknown>,
  now: Date,
): Record<string, unknown> {
  const strings = [
    "id", "contentVersion", "emotionId", "parentId", "urgeId", "urgeLabel",
    "customUrge", "situation", "observation", "interpretation", "goal",
    "safety", "facts", "effectiveness", "actionSize", "action", "cueId",
    "cue", "dueAt", "barrier", "backup", "status", "outcome",
    "missedReason", "reflection",
  ];
  const result: Record<string, unknown> = {};
  for (const key of strings) {
    if (typeof raw[key] !== "string" || (raw[key] as string).length > 1500)
      throw new Error(`Invalid ${key}`);
    result[key] = (raw[key] as string).trim();
  }
  if (!/^[a-f0-9-]{36}$/i.test(result.id as string))
    throw new Error("Invalid session ID");
  for (const key of ["emotionId", "parentId", "urgeId", "urgeLabel", "action", "cueId", "cue", "goal"]) {
    if (!result[key]) throw new Error(`Missing ${key}`);
  }
  const enumField = (key: string, values: string[]) => {
    if (!values.includes(result[key] as string))
      throw new Error(`Invalid ${key}`);
  };
  // Clinical gates are identical to v1: only safe + unhelpful-urge sessions save.
  enumField("safety", ["safe"]);
  enumField("facts", ["fits", "excessive", "not_fit"]);
  enumField("effectiveness", ["unhelpful"]);
  enumField("status", ["planned", "practiced", "missed"]);
  enumField("actionSize", ["small", "medium", "bigger", "custom"]);
  enumField("cueId", ["now", "today", "next_time"]);
  // Situation and snag planning are optional in v2 (compressed triage).
  enumField("situation", ["", "relationship", "work", "change", "self", "other"]);
  enumField("goal", ["connection", "boundary", "progress", "repair", "self_respect"]);
  enumField("barrier", ["", "none", "too_big", "forget", "emotion", "other"]);
  // v2: a backup plan is encouraged but never required (no required free text).
  if (result.urgeId === "custom" && !result.customUrge)
    throw new Error("Missing custom urge");

  // Somatic circuit-breaker: at least one body cue must have been completed.
  if (
    !Array.isArray(raw.bodyCues) ||
    raw.bodyCues.length < 1 ||
    raw.bodyCues.length > 6 ||
    raw.bodyCues.some((c) => typeof c !== "string" || !c.trim() || c.length > 300)
  )
    throw new Error("Invalid body cues");
  result.bodyCues = (raw.bodyCues as string[]).map((c) => c.trim());

  if (!isScore(raw.urgeBefore)) throw new Error("Invalid urge baseline");
  if (!isScoreOrNull(raw.urgeAfterBody)) throw new Error("Invalid body re-rate");
  if (!isScoreOrNull(raw.urgeAfter)) throw new Error("Invalid urge after");
  if (!isScoreOrNull(raw.intensityBefore)) throw new Error("Invalid baseline");
  if (!isScoreOrNull(raw.intensityAfter)) throw new Error("Invalid intensity after");
  if (raw.intensityAfter !== null && raw.intensityBefore === null)
    throw new Error("Intensity after without baseline");

  // Follow-up time: optional ISO timestamp no more than 48h ahead.
  if (result.dueAt) {
    const due = Date.parse(result.dueAt as string);
    if (!Number.isFinite(due)) throw new Error("Invalid dueAt");
    if (due - now.getTime() > 48 * 60 * 60 * 1000) throw new Error("dueAt too far");
    result.dueAt = new Date(due).toISOString();
  }

  if (result.status === "practiced") {
    if (!isScore(raw.urgeAfter)) throw new Error("Invalid reflection urge");
    enumField("outcome", ["toward_goal", "partial", "unclear", "unsafe"]);
    if (result.missedReason !== "") throw new Error("Practiced cannot be missed");
  } else if (result.status === "missed") {
    enumField("missedReason", ["too_strong", "no_moment", "forgot", "chose_not"]);
    if (raw.urgeAfter !== null || result.outcome !== "" || raw.intensityAfter !== null)
      throw new Error("Missed sessions have no attempt outcome");
  } else {
    if (
      raw.urgeAfter !== null ||
      raw.intensityAfter !== null ||
      result.outcome !== "" ||
      result.missedReason !== "" ||
      result.reflection !== ""
    )
      throw new Error("Plans cannot contain outcomes");
    if (result.cueId !== "now" && !result.dueAt)
      throw new Error("Plans for later need a follow-up time");
  }
  Object.assign(result, {
    schemaVersion: 2,
    urgeBefore: raw.urgeBefore,
    urgeAfterBody: raw.urgeAfterBody,
    urgeAfter: raw.urgeAfter,
    intensityBefore: raw.intensityBefore,
    intensityAfter: raw.intensityAfter,
  });
  // Sources are supplied from the server's content record, never trusted from the client.
  return result;
}
