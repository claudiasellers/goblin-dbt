"use strict";
// Graph reads for the LLM layer. Two shapes:
//   - the prefix context: rules and background that are the same for every
//     user, read once per process per step and cached, ordered so the prompt
//     built from them is byte-stable;
//   - the session context: the labels behind the ids this one person chose,
//     read per request and rendered into the user turn.
// Nothing here talks to the model.
Object.defineProperty(exports, "__esModule", { value: true });
exports.readPrefixContext = readPrefixContext;
exports.clearPrefixCache = clearPrefixCache;
exports.readSessionContext = readSessionContext;
const CACHE_MS = 10 * 60 * 1000;
const prefixCache = new Map();
const BACKGROUND_KEYS = [
    'anchorGeneratorIntro',
    'anchorGeneratorMakeItYours',
    'assertBarrierGuilty',
    'confidentBarrierNoRight',
    'confidentCoaching',
    'negotiateHintObjective',
    'negotiateHintRelationship',
    'negotiateHintSelfRespect',
    'revealText',
];
async function readPrefixContext(driver, step) {
    var _a, _b;
    const hit = prefixCache.get(step);
    if (hit && Date.now() - hit.at < CACHE_MS)
        return hit.value;
    const session = driver.session();
    try {
        const rulesRes = await session.run(`
      MATCH (r:DearManRule)
      WHERE ('every' IN r.appliesTo OR $step IN r.appliesTo)
        AND size(coalesce(r.patternIds, [])) = 0
      RETURN r.id AS id, r.text AS text
      ORDER BY r.sortOrder, r.id
      `, { step });
        const rules = rulesRes.records.map(r => ({
            id: String(r.get('id')),
            text: String(r.get('text')),
        }));
        const tcRes = await session.run(`
      MATCH (tc:TherapyConcept {id: 'dbt_dear_man'})
      RETURN tc { .anchorGeneratorIntro, .anchorGeneratorMakeItYours, .assertBarrierGuilty,
                  .confidentBarrierNoRight, .confidentCoaching, .negotiateHintObjective,
                  .negotiateHintRelationship, .negotiateHintSelfRespect, .revealText,
                  .riskNoticeLine } AS tc
      `);
        const tc = ((_b = (_a = tcRes.records[0]) === null || _a === void 0 ? void 0 : _a.get('tc')) !== null && _b !== void 0 ? _b : {});
        const background = BACKGROUND_KEYS
            .map(k => tc[k])
            .filter((v) => typeof v === 'string' && v.trim().length > 0);
        const riskNoticeLine = typeof tc.riskNoticeLine === 'string' && tc.riskNoticeLine.trim()
            ? tc.riskNoticeLine.trim()
            : null;
        const reinfRes = await session.run(`MATCH (r:DearManReinforceOption) RETURN r.label AS label ORDER BY r.sortOrder, r.id`);
        const reinforceLabels = reinfRes.records
            .map(r => r.get('label'))
            .filter((v) => typeof v === 'string');
        const value = { rules, background, riskNoticeLine, reinforceLabels };
        prefixCache.set(step, { at: Date.now(), value });
        return value;
    }
    finally {
        await session.close();
    }
}
/** Test seam: forget cached prefix context. */
function clearPrefixCache() {
    prefixCache.clear();
}
async function readSessionContext(driver, ids) {
    var _a, _b, _c;
    const session = driver.session();
    try {
        const res = await session.run(`
      OPTIONAL MATCH (st:DearManSituationType {id: $situationType})
      OPTIONAL MATCH (a:DearManAssertOption {id: $assertId})
      WITH st, a
      OPTIONAL MATCH (d:DearManDescribeOption) WHERE d.id IN $describeIds
      WITH st, a, collect(DISTINCT CASE WHEN d IS NULL THEN NULL ELSE { id: d.id, label: d.label } END) AS d
      OPTIONAL MATCH (f:DearManFeelingChip) WHERE f.id IN $feelingIds
      OPTIONAL MATCH (f)-[:IN_GROUP]->(g:DearManFeelingGroup)
      WITH st, d, a,
           collect(DISTINCT CASE WHEN f IS NULL THEN NULL ELSE
             { id: f.id, label: f.label, group: g.label, isAttribution: coalesce(f.isAttribution, false) }
           END) AS feelings
      OPTIONAL MATCH (b:DearManBarrier) WHERE b.id IN $barrierIds
      OPTIONAL MATCH (c:DearManBarrierCoaching)-[:ADDRESSES]->(b)
      WITH st, d, a, feelings,
           collect(DISTINCT CASE WHEN b IS NULL THEN NULL ELSE
             { id: b.id, label: b.label, coaching: c.body }
           END) AS barriers
      OPTIONAL MATCH (pr:DearManRule)
        WHERE $activationPatternId IS NOT NULL
          AND $activationPatternId IN coalesce(pr.patternIds, [])
      WITH st, d, a, feelings, barriers, pr
      ORDER BY pr.sortOrder, pr.id
      RETURN st.label AS situationLabel,
             d AS describeRows,
             a.id AS assertOptionId, a.label AS assertLabel,
             a.hasPlaceholder AS assertHasPlaceholder, a.elaboratePrompt AS assertElaboratePrompt,
             feelings, barriers,
             collect(pr.text) AS patternRules
      `, ids);
        const r = res.records[0];
        if (!r) {
            return { situationLabel: null, describeLabels: [], assert: null, feelings: [], barriers: [], patternRules: [] };
        }
        const describeRows = r.get('describeRows').filter((x) => x != null);
        const describeOrder = new Map(ids.describeIds.map((id, i) => [id, i]));
        describeRows.sort((a, b) => { var _a, _b; return ((_a = describeOrder.get(a.id)) !== null && _a !== void 0 ? _a : 0) - ((_b = describeOrder.get(b.id)) !== null && _b !== void 0 ? _b : 0); });
        const feelingRows = r.get('feelings').filter((x) => x != null);
        // Keep the person's tap order, which the graph does not know.
        const order = new Map(ids.feelingIds.map((id, i) => [id, i]));
        feelingRows.sort((a, b) => { var _a, _b; return ((_a = order.get(a.id)) !== null && _a !== void 0 ? _a : 0) - ((_b = order.get(b.id)) !== null && _b !== void 0 ? _b : 0); });
        const barrierRows = r.get('barriers').filter((x) => x != null);
        const assertOptionId = r.get('assertOptionId');
        return {
            situationLabel: (_a = r.get('situationLabel')) !== null && _a !== void 0 ? _a : null,
            describeLabels: describeRows.map(d => d.label),
            assert: assertOptionId
                ? {
                    id: String(assertOptionId),
                    label: String((_b = r.get('assertLabel')) !== null && _b !== void 0 ? _b : ''),
                    hasPlaceholder: Boolean(r.get('assertHasPlaceholder')),
                    elaboratePrompt: (_c = r.get('assertElaboratePrompt')) !== null && _c !== void 0 ? _c : null,
                }
                : null,
            feelings: feelingRows,
            barriers: barrierRows,
            patternRules: r.get('patternRules').filter((t) => typeof t === 'string'),
        };
    }
    finally {
        await session.close();
    }
}
//# sourceMappingURL=context.js.map