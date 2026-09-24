"use strict";
// Callable wrapper for the LLM layer. Thin on purpose: auth, validate, build
// deps from secrets, run the pure step, log one line, return. Everything the
// person could see is decided in composeOpeners.ts.
Object.defineProperty(exports, "__esModule", { value: true });
exports.composeDearManStep = void 0;
const https_1 = require("firebase-functions/v2/https");
const params_1 = require("firebase-functions/params");
const db_1 = require("../db");
const client_1 = require("./client");
const composeOpeners_1 = require("./composeOpeners");
const schemas_1 = require("./schemas");
const anthropicApiKey = (0, params_1.defineSecret)('ANTHROPIC_API_KEY');
let anthropicClient = null;
function getAnthropic() {
    if (!anthropicClient)
        anthropicClient = (0, client_1.makeAnthropic)(anthropicApiKey.value());
    return anthropicClient;
}
exports.composeDearManStep = (0, https_1.onCall)({
    secrets: [db_1.neo4jUri, db_1.neo4jUser, db_1.neo4jPassword, anthropicApiKey],
    // The one function where a cold start sits on a distressed person's wait.
    minInstances: 1,
}, async (request) => {
    if (!request.auth) {
        throw new https_1.HttpsError('unauthenticated', 'User must be logged in');
    }
    const parsed = schemas_1.ComposeRequest.safeParse(request.data);
    if (!parsed.success) {
        // Field paths and codes only; never the values.
        console.warn('llm_request_invalid', {
            event: 'llm_request_invalid',
            issues: parsed.error.issues.slice(0, 10).map(i => ({ path: i.path.join('.'), code: i.code, message: i.message })),
        });
        throw new https_1.HttpsError('invalid-argument', 'Invalid compose request');
    }
    const { step, session } = parsed.data;
    try {
        // Only one step exists today; the switch is where the next ones plug in.
        switch (step) {
            case 'openers': {
                const result = await (0, composeOpeners_1.composeOpenersForSession)(session, {
                    driver: (0, db_1.getDriver)(),
                    anthropic: getAnthropic(),
                });
                console.log('llm_call', Object.assign({ event: 'llm_call' }, result.meta));
                return result.response;
            }
        }
    }
    catch (error) {
        if (error instanceof https_1.HttpsError)
            throw error;
        console.error('Error composing DEAR MAN step:', {
            step,
            message: error instanceof Error ? error.message : String(error),
        });
        throw new https_1.HttpsError('internal', 'Failed to compose step');
    }
});
//# sourceMappingURL=composeDearManStep.js.map