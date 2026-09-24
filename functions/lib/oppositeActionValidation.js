"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateOppositeActionSession = validateOppositeActionSession;
/** Input validation only. Clinical content and routing stay in the graph. */
function validateOppositeActionSession(input) {
    if (!input || typeof input !== "object" || Array.isArray(input))
        throw new Error("Expected a session");
    const raw = input;
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
    const result = {};
    for (const key of strings) {
        if (typeof raw[key] !== "string" || raw[key].length > 1500)
            throw new Error(`Invalid ${key}`);
        result[key] = raw[key].trim();
    }
    if (!/^[a-f0-9-]{36}$/i.test(result.id))
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
        if (!result[key])
            throw new Error(`Missing ${key}`);
    }
    const enumField = (key, values) => {
        if (!values.includes(result[key]))
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
    const intensity = (v) => typeof v === "number" && Number.isInteger(v) && v >= 0 && v <= 10;
    if (!intensity(raw.intensityBefore))
        throw new Error("Invalid baseline");
    if (result.status === "practiced") {
        if (!intensity(raw.intensityAfter))
            throw new Error("Invalid reflection intensity");
        enumField("outcome", ["toward_goal", "partial", "unclear", "unsafe"]);
    }
    else if (raw.intensityAfter !== null ||
        result.outcome !== "" ||
        result.reflection !== "")
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
//# sourceMappingURL=oppositeActionValidation.js.map