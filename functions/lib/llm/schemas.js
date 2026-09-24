"use strict";
// Shapes for the LLM layer: what the client may send, what the model may
// return, and what the function hands back. The model-output schema is kept
// to enums, objects, arrays and nullables so it translates cleanly to the
// API's structured-output grammar; length and count limits on model output
// are enforced in checks.ts, not here.
Object.defineProperty(exports, "__esModule", { value: true });
exports.FALLBACK_REASONS = exports.OpenersOutput = exports.RiskSchema = exports.RISK_LEVELS = exports.OpenerSchema = exports.OPENER_KINDS = exports.ComposeRequest = exports.SessionInput = exports.STEPS = void 0;
const zod_1 = require("zod");
// ── Request ────────────────────────────────────────────────────────────────
const id = zod_1.z.string().regex(/^[a-z0-9_-]{1,64}$/);
const shortText = (max) => zod_1.z.string().max(max);
exports.STEPS = ['openers'];
/** The DEAR MAN prep state the client has so far. Mirrors DearManSessionData
 *  on the frontend; only the fields the composer reads are validated. */
exports.SessionInput = zod_1.z.object({
    relationshipType: shortText(32),
    situationType: shortText(32),
    priorities: zod_1.z.array(shortText(32)).max(3).default([]),
    barriers: zod_1.z.array(id).max(12).default([]),
    barriersCustom: shortText(600).optional().default(''),
    describeId: id.nullable().default(null),
    describeIds: zod_1.z.array(id).max(8).optional().default([]),
    describeCustom: shortText(600).default(''),
    feelings: zod_1.z.array(id).max(30).default([]),
    feelingCustom: shortText(80).optional().default(''),
    assertId: id.nullable().default(null),
    assertIds: zod_1.z.array(id).max(8).optional().default([]),
    assertDetails: zod_1.z.record(id, shortText(300)).optional().default({}),
    assertCustom: shortText(400).default(''),
    activationPatternId: id.nullable().optional().default(null),
});
exports.ComposeRequest = zod_1.z.object({
    step: zod_1.z.enum(exports.STEPS),
    session: exports.SessionInput,
});
// ── Model output (sent to the API as the required format) ──────────────────
exports.OPENER_KINDS = ['bid', 'direct', 'name_it'];
exports.OpenerSchema = zod_1.z.object({
    kind: zod_1.z.enum(exports.OPENER_KINDS),
    /** The script, three or four sentences, ending on the ask. */
    text: zod_1.z.string(),
    /** One short caption on why this way in; shown under the card. */
    why: zod_1.z.string(),
});
exports.RISK_LEVELS = ['none', 'concern', 'crisis'];
exports.RiskSchema = zod_1.z.object({
    level: zod_1.z.enum(exports.RISK_LEVELS),
    /** Logged, never rendered. */
    reason: zod_1.z.string().nullable(),
});
exports.OpenersOutput = zod_1.z.object({
    openers: zod_1.z.array(exports.OpenerSchema),
    risk: exports.RiskSchema,
});
// ── Response to the client ─────────────────────────────────────────────────
exports.FALLBACK_REASONS = [
    'no_rules', // graph returned zero rule nodes for this step
    'no_notice', // risk flagged but the graph has no notice line to show
    'graph_error', // context read failed
    'timeout',
    'connection',
    'rate_limited',
    'refusal',
    'unparsed', // schema parse failed or parsed_output was null
    'truncated', // stop_reason max_tokens
    'check_failed', // deterministic post-checks rejected the output
    'api_error', // any other API status; status code goes to the log
    'client_error', // set by the frontend wrapper when the call itself failed
];
//# sourceMappingURL=schemas.js.map