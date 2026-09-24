"use strict";
// The one place that talks to the Anthropic API. Structured output via Zod,
// a hard timeout, no retries (one retry would blow the latency budget), and
// every way a call can fail mapped to a named fallback reason.
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.TIMEOUT_MS = exports.MAX_TOKENS = exports.EFFORT = exports.MODEL = void 0;
exports.makeAnthropic = makeAnthropic;
exports.callOpeners = callOpeners;
const sdk_1 = __importDefault(require("@anthropic-ai/sdk"));
const zod_1 = require("@anthropic-ai/sdk/helpers/zod");
const schemas_1 = require("./schemas");
exports.MODEL = 'claude-opus-5';
exports.EFFORT = 'low'; // measured 2026-09-14: medium 10-20 s, low 6-7 s cold; quality equal
exports.MAX_TOKENS = 2000;
exports.TIMEOUT_MS = 12000; // the cards load beside a script that is already on screen, so this does not block the person
function makeAnthropic(apiKey, timeoutMs = exports.TIMEOUT_MS) {
    return new sdk_1.default({ apiKey, timeout: timeoutMs, maxRetries: 0 });
}
/** First 200 chars of an API error message; these are Anthropic's words, never the person's. */
const brief = (m) => String(m !== null && m !== void 0 ? m : '').replace(/\s+/g, ' ').slice(0, 200);
/** Pull the last top-level JSON object out of free text. */
function extractJson(text) {
    const end = text.lastIndexOf('}');
    if (end < 0)
        return null;
    let depth = 0;
    for (let i = end; i >= 0; i--) {
        if (text[i] === '}')
            depth++;
        else if (text[i] === '{') {
            depth--;
            if (depth === 0)
                return text.slice(i, end + 1);
        }
    }
    return null;
}
async function callOpeners(client, systemPrefix, userTurn, opts = { structured: true }) {
    var _a, _b, _c, _d;
    try {
        // messages.create rather than messages.parse: the parse helper throws
        // before stop_reason can be read, which would log a truncation as
        // "unparsed". The API still enforces the schema through output_config.
        const res = await client.messages.create({
            model: exports.MODEL,
            max_tokens: exports.MAX_TOKENS,
            output_config: opts.structured
                ? { effort: exports.EFFORT, format: (0, zod_1.zodOutputFormat)(schemas_1.OpenersOutput) }
                : { effort: exports.EFFORT },
            system: [{ type: 'text', text: systemPrefix, cache_control: { type: 'ephemeral' } }],
            messages: [{ role: 'user', content: userTurn }],
        });
        const usage = {
            input: res.usage.input_tokens,
            cacheRead: (_a = res.usage.cache_read_input_tokens) !== null && _a !== void 0 ? _a : 0,
            cacheWrite: (_b = res.usage.cache_creation_input_tokens) !== null && _b !== void 0 ? _b : 0,
            output: res.usage.output_tokens,
        };
        if (res.stop_reason === 'refusal')
            return { ok: false, reason: 'refusal', usage, stopReason: res.stop_reason };
        if (res.stop_reason === 'max_tokens')
            return { ok: false, reason: 'truncated', usage, stopReason: res.stop_reason };
        const text = (_d = (_c = res.content.find(b => b.type === 'text')) === null || _c === void 0 ? void 0 : _c.text) !== null && _d !== void 0 ? _d : '';
        const jsonText = opts.structured ? text : extractJson(text);
        // rawText is model output, kept only for the local script's diagnosis; the function never logs it.
        const raw = opts.structured ? undefined : text;
        if (!jsonText)
            return { ok: false, reason: 'unparsed', usage, stopReason: res.stop_reason, rawText: raw };
        let json;
        try {
            json = JSON.parse(jsonText);
        }
        catch (_e) {
            return { ok: false, reason: 'unparsed', usage, stopReason: res.stop_reason, rawText: raw };
        }
        const parsed = schemas_1.OpenersOutput.safeParse(json);
        if (!parsed.success)
            return { ok: false, reason: 'unparsed', usage, stopReason: res.stop_reason, rawText: raw };
        return { ok: true, output: parsed.data, usage, stopReason: res.stop_reason };
    }
    catch (err) {
        if (err instanceof sdk_1.default.APIConnectionTimeoutError)
            return { ok: false, reason: 'timeout' };
        if (err instanceof sdk_1.default.RateLimitError)
            return { ok: false, reason: 'rate_limited', apiStatus: err.status, apiMessage: brief(err.message) };
        if (err instanceof sdk_1.default.APIConnectionError)
            return { ok: false, reason: 'connection', apiMessage: brief(err.message) };
        if (err instanceof sdk_1.default.APIError)
            return { ok: false, reason: 'api_error', apiStatus: err.status, apiMessage: brief(err.message) };
        return { ok: false, reason: 'unparsed', apiMessage: brief(err instanceof Error ? err.message : err) };
    }
}
//# sourceMappingURL=client.js.map