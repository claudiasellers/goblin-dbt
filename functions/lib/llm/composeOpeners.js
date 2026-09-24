"use strict";
// The openers step, as a pure function of (session, deps). Takes the driver
// and the Anthropic client as arguments so a local script and the eval can
// run it without Firebase; only composeDearManStep.ts touches secrets.
Object.defineProperty(exports, "__esModule", { value: true });
exports.composeOpenersForSession = composeOpenersForSession;
const node_crypto_1 = require("node:crypto");
const context_1 = require("./context");
const prompt_1 = require("./prompt");
const checks_1 = require("./checks");
const client_1 = require("./client");
const STEP = 'openers';
async function composeOpenersForSession(session, deps) {
    var _a, _b, _c, _d;
    const t0 = Date.now();
    const callId = (0, node_crypto_1.randomUUID)();
    const base = {
        callId,
        step: STEP,
        model: client_1.MODEL,
        effort: client_1.EFFORT,
        promptVariant: prompt_1.PROMPT_VARIANT,
        relationshipType: session.relationshipType,
        situationType: session.situationType,
        activationPatternId: (_a = session.activationPatternId) !== null && _a !== void 0 ? _a : null,
    };
    const fallback = (reason, extra, debug) => ({
        response: { source: 'fallback', step: STEP, callId, reason },
        meta: Object.assign(Object.assign(Object.assign({}, base), { source: 'fallback', reason, totalMs: Date.now() - t0 }), extra),
        debug,
    });
    // 1. Graph reads
    const g0 = Date.now();
    let prefixCtx, sessionCtx;
    try {
        const chosenAssertId = (_b = session.assertIds[0]) !== null && _b !== void 0 ? _b : session.assertId;
        [prefixCtx, sessionCtx] = await Promise.all([
            (0, context_1.readPrefixContext)(deps.driver, STEP),
            (0, context_1.readSessionContext)(deps.driver, {
                situationType: session.situationType,
                describeIds: session.describeIds.length ? session.describeIds : (session.describeId ? [session.describeId] : []),
                assertId: chosenAssertId,
                feelingIds: session.feelings,
                barrierIds: session.barriers,
                activationPatternId: (_c = session.activationPatternId) !== null && _c !== void 0 ? _c : null,
            }),
        ]);
    }
    catch (err) {
        console.error('llm graph read failed:', err instanceof Error ? err.message : String(err));
        return fallback('graph_error', { graphMs: Date.now() - g0, modelMs: 0, promptHash: null }, { systemPrefix: '', userTurn: '' });
    }
    const graphMs = Date.now() - g0;
    const systemPrefix = (0, prompt_1.buildSystemPrefix)(prefixCtx);
    const hash = (0, prompt_1.promptHash)(systemPrefix);
    const turn = (0, prompt_1.buildUserTurn)(session, sessionCtx);
    const debug = { systemPrefix, userTurn: turn.text };
    if (prefixCtx.rules.length === 0) {
        return fallback('no_rules', { graphMs, modelMs: 0, promptHash: hash }, debug);
    }
    // 2. Model
    const m0 = Date.now();
    const outcome = await (0, client_1.callOpeners)(deps.anthropic, systemPrefix, turn.text, { structured: prompt_1.PROMPT_VARIANT === 'rules' });
    const modelMs = Date.now() - m0;
    if (!outcome.ok) {
        return fallback(outcome.reason, {
            graphMs, modelMs, promptHash: hash,
            usage: outcome.usage, stopReason: outcome.stopReason, apiStatus: outcome.apiStatus, apiMessage: outcome.apiMessage,
        }, Object.assign(Object.assign({}, debug), { rawText: outcome.rawText }));
    }
    // 3. Deterministic checks, per opener. Hard failures drop that opener;
    //    fewer than two survivors means the template fallback.
    const checks = (0, checks_1.runChecks)(outcome.output, {
        ownWords: turn.ownWords,
        mustContain: turn.mustContain,
        reinforceLabels: prefixCtx.reinforceLabels,
        knownText: [sessionCtx.situationLabel, ...sessionCtx.describeLabels, (_d = sessionCtx.assert) === null || _d === void 0 ? void 0 : _d.label]
            .filter((t) => typeof t === 'string'),
        retainTokens: (0, checks_1.retainableTokens)(turn.typedAsk),
    });
    const riskLevel = outcome.output.risk.level;
    const openerKinds = checks.kept.map(o => o.kind);
    const checkFindings = checks.findings.map(f => `${f.hard ? '!' : ''}${f.opener + 1}:${f.code}`);
    if (checks.fallback) {
        return fallback('check_failed', {
            graphMs, modelMs, promptHash: hash,
            usage: outcome.usage, stopReason: outcome.stopReason, riskLevel,
            openerKinds: outcome.output.openers.map(o => o.kind), checkFindings, keptCount: checks.kept.length,
        }, debug);
    }
    // 4. Risk. Concern: openers with the notice line above them. Crisis: the
    //    notice and nothing else, not even the fallback script (gate 1 ruling).
    //    Either way, fail closed if the graph has no notice line.
    const metaOk = Object.assign(Object.assign({}, base), { promptHash: hash, graphMs, modelMs, usage: outcome.usage, stopReason: outcome.stopReason, riskLevel, openerKinds,
        checkFindings, keptCount: checks.kept.length });
    let notice = null;
    if (riskLevel !== 'none') {
        if (!prefixCtx.riskNoticeLine) {
            return fallback('no_notice', {
                graphMs, modelMs, promptHash: hash, usage: outcome.usage, stopReason: outcome.stopReason, riskLevel, openerKinds,
            }, debug);
        }
        notice = prefixCtx.riskNoticeLine;
    }
    if (riskLevel === 'crisis' && notice) {
        return {
            response: { source: 'notice', step: STEP, callId, notice },
            meta: Object.assign(Object.assign({}, metaOk), { source: 'notice', totalMs: Date.now() - t0 }),
            debug,
        };
    }
    return {
        response: { source: 'model', step: STEP, callId, openers: checks.kept, notice },
        meta: Object.assign(Object.assign({}, metaOk), { source: 'model', totalMs: Date.now() - t0 }),
        debug,
    };
}
//# sourceMappingURL=composeOpeners.js.map