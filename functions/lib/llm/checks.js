"use strict";
// Deterministic post-checks on model output, applied per opener.
//
// Gate 2 ruling (therapist, 2026-09-14): a hard failure drops that one
// opener; the person still sees the others. Only when fewer than two survive
// does the whole response fall back to the template. Soft failures are
// logged and the opener is shown, so the phase 3 eval can decide which of
// them earn promotion. The reject list itself was written by the therapist
// and amended by the effectiveness reviewer at gate 1.
Object.defineProperty(exports, "__esModule", { value: true });
exports.MAX_WORDS_PER_SENTENCE = exports.MAX_WHY_CHARS = exports.SOFT_MAX_CHARS = exports.HARD_MAX_CHARS = exports.HARD_MAX_SENTENCES = exports.MIN_SURVIVORS = void 0;
exports.retainableTokens = retainableTokens;
exports.splitSentences = splitSentences;
exports.runChecks = runChecks;
const schemas_1 = require("./schemas");
/** Pull the tokens worth retaining (numbers, weekdays) out of typed text. */
function retainableTokens(text) {
    var _a, _b;
    if (!text)
        return [];
    const days = (_a = text.match(/\b(monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b/gi)) !== null && _a !== void 0 ? _a : [];
    const nums = (_b = text.match(/\d+/g)) !== null && _b !== void 0 ? _b : [];
    return Array.from(new Set([...days.map(d => d.toLowerCase()), ...nums]));
}
exports.MIN_SURVIVORS = 2;
// ── Hard: saying this makes the conversation worse ─────────────────────────
const STATE_BASED_ASKS = [
    /\b(be|feel) okay with\b/i,
    /without (getting|being) defensive/i,
    /\bneed you to (understand|realise|realize|appreciate|care|respect (me|my)|get it|support me)\b/i,
    /\b(just )?listen and support\b/i,
    /\bneed that to be okay\b/i,
    /\bactually (change|stop|listen)\b/i,
    /\bnot just (be )?talked about\b/i,
    /\bneed you to be (more|less)\b/i,
];
const CHARACTERISING = [
    /\byou (always|never|constantly)\b/i,
    /\byou don'?t (care|listen|respect)\b/i,
    /\byou'?re (being|so|such a)\b/i,
    /\byou (make|made) me feel\b/i,
    /\byou should\b/i,
    /\b(why (do|did|would|can'?t) you|do you even|how many times)\b/i,
];
const ULTIMATUMS = [
    /\bor (else|i'?m (done|leaving))\b/i,
    /\bif you (don'?t|won'?t)\b.*\bi'?ll\b/i,
];
/** The bargain forms of Reinforce. */
const REINFORCE_BARGAINS = [
    /\bif we can do this\b/i,
    /\bi'?d stop bringing\b/i,
    /\bi wouldn'?t be resentful\b/i,
    /\bwhat'?s in it for\b/i,
];
const HARM_WORDS = /\b(toxic|gaslight(ing|ed)?|narcissist(ic)?)\b/i;
exports.HARD_MAX_SENTENCES = 5; // six or more is a speech
exports.HARD_MAX_CHARS = 400;
// ── Soft: costs credibility, logged, still shown ───────────────────────────
const HEDGING_OPENERS = [
    /^(i'?m )?sorry\b/i,
    /^i know you'?re busy/i,
    /^this (is probably|might be) (nothing|silly|stupid)/i,
    /^i hate to\b/i,
    /^i don'?t want to (be a|make a)\b/i,
    /^no pressure/i,
];
const SOFTENERS = [
    /\bcould you maybe\b/i,
    /\bif (that'?s|it'?s) (okay|alright|not too much)\b/i,
];
const REINFORCE_SOFT = [
    /\bwe'?d (fight less|be closer|both feel)\b/i,
    /\bit would mean a lot\b/i,
    /\bit would (make|help) (things|us|me) (easier|better|feel)\b/i,
];
const JARGON = /\b(DEAR MAN|boundary|boundaries|assert|assertive|validate|regulate|trigger(ed|s)?)\b/i;
const THIRD_PERSON = /\b(they|them|their)\b/gi;
/** Days and months the model may only use if the person (or a tapped label) gave them. */
const TIME_WORDS = /\b(monday|tuesday|wednesday|thursday|friday|saturday|sunday|january|february|march|april|may|june|july|august|september|october|november|december|yesterday|last (week|night|month))\b/gi;
/** Captions must speak to the person, not about them. */
const CAPTION_THIRD_PERSON = /\b(she|he|her|his|him|herself|himself|the user|the person)\b/i;
exports.SOFT_MAX_CHARS = 320;
exports.MAX_WHY_CHARS = 100;
exports.MAX_WORDS_PER_SENTENCE = 25;
function splitSentences(text) {
    return text
        .trim()
        .split(/(?<=[.!?])\s+/)
        .map(s => s.trim())
        .filter(Boolean);
}
const norm = (s) => s.toLowerCase().replace(/\s+/g, ' ').trim();
/** For verbatim comparisons: the model may fix punctuation and case ("fix only grammar"). */
const loose = (s) => norm(s).replace(/[^\p{L}\p{N} ]/gu, '');
function checkOne(o, idx, input, exemptTokens) {
    var _a, _b, _c, _d, _e;
    const f = [];
    const hard = (code) => f.push({ opener: idx, code, hard: true });
    const soft = (code) => f.push({ opener: idx, code, hard: false });
    const text = o.text;
    if (!text.trim()) {
        hard('empty');
        return f;
    }
    // Length and shape
    if (text.length > exports.HARD_MAX_CHARS)
        hard('too_long');
    else if (text.length > exports.SOFT_MAX_CHARS)
        soft('long');
    const sentences = splitSentences(text);
    if (sentences.length > exports.HARD_MAX_SENTENCES)
        hard(`sentences_${sentences.length}`);
    else if (sentences.length < 2 || sentences.length === exports.HARD_MAX_SENTENCES)
        soft(`sentences_${sentences.length}`);
    if (sentences.some(s => s.split(/\s+/).length > exports.MAX_WORDS_PER_SENTENCE))
        soft('sentence_over_25_words');
    if (sentences.slice(1, -1).some(s => s.includes('?')))
        soft('question_mid_opener');
    if (o.why.length > exports.MAX_WHY_CHARS)
        soft('why_too_long');
    // Content
    if (STATE_BASED_ASKS.some(re => re.test(text)))
        hard('state_based_ask');
    if (CHARACTERISING.some(re => re.test(text)))
        hard('characterising');
    if (ULTIMATUMS.some(re => re.test(text)))
        hard('ultimatum');
    if (REINFORCE_BARGAINS.some(re => re.test(text)))
        hard('reinforce_bargain');
    if (HARM_WORDS.test(text))
        hard('harm_word');
    const n = loose(text);
    if (input.reinforceLabels.some(l => l && n.includes(loose(l))))
        hard('reinforce_label_verbatim');
    const first = (_a = sentences[0]) !== null && _a !== void 0 ? _a : '';
    if (HEDGING_OPENERS.some(re => re.test(first)))
        soft('hedging_opener');
    if (SOFTENERS.some(re => re.test(text)))
        soft('softener');
    if (REINFORCE_SOFT.some(re => re.test(text)))
        soft('reinforce_tell');
    if (JARGON.test(text))
        soft('jargon');
    const thirdPerson = Array.from(text.matchAll(THIRD_PERSON))
        .map(m => m[0].toLowerCase())
        .filter(tok => !exemptTokens.has(tok));
    if (thirdPerson.length)
        soft('third_person');
    if (input.mustContain && !n.includes(loose(input.mustContain)))
        soft('typed_ask_missing');
    // Invented specifics: a day or month that appears nowhere in what the person gave.
    const given = loose([...input.ownWords, ...((_b = input.knownText) !== null && _b !== void 0 ? _b : [])].join(' '));
    const invented = Array.from(text.matchAll(TIME_WORDS))
        .map(m => m[0].toLowerCase())
        .filter(w => !given.includes(w));
    if (invented.length)
        soft('invented_time_word');
    // Numbers the person never gave (a date, an amount) are invented facts too.
    const givenNumbers = new Set(((_c = given.match(/\d+/g)) !== null && _c !== void 0 ? _c : []));
    const inventedNumbers = ((_d = text.match(/\d+/g)) !== null && _d !== void 0 ? _d : []).filter(d => !givenNumbers.has(d));
    if (inventedNumbers.length)
        soft('invented_number');
    // Numbers and days from the typed ask must survive into every opener, even
    // when the ask itself is rewritten (state-based asserts).
    if ((_e = input.retainTokens) === null || _e === void 0 ? void 0 : _e.length) {
        const missing = input.retainTokens.filter(t => !n.includes(loose(t)));
        if (missing.length)
            soft('typed_detail_dropped');
    }
    // A caption that talks about the person instead of to them drops the opener (gate 2 ruling).
    if (CAPTION_THIRD_PERSON.test(o.why))
        hard('caption_third_person');
    return f;
}
function runChecks(output, input) {
    const findings = [];
    const setSoft = (code) => findings.push({ opener: -1, code, hard: false });
    if (output.openers.length !== 3)
        setSoft(`count_${output.openers.length}`);
    const kinds = output.openers.map(o => o.kind);
    for (const k of schemas_1.OPENER_KINDS) {
        const c = kinds.filter(x => x === k).length;
        if (c !== 1)
            setSoft(`kind_${k}_x${c}`);
    }
    const exempt = new Set();
    for (const w of input.ownWords) {
        for (const m of w.matchAll(THIRD_PERSON))
            exempt.add(m[0].toLowerCase());
    }
    const kept = [];
    const seen = new Set();
    output.openers.forEach((o, i) => {
        const key = norm(o.text);
        if (seen.has(key)) {
            findings.push({ opener: i, code: 'duplicate', hard: true });
            return;
        }
        seen.add(key);
        const f = checkOne(o, i, input, exempt);
        findings.push(...f);
        if (!f.some(x => x.hard))
            kept.push(o);
    });
    return { kept, findings, fallback: kept.length < exports.MIN_SURVIVORS };
}
//# sourceMappingURL=checks.js.map