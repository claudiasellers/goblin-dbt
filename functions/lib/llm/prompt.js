"use strict";
// Prompt assembly. Pure functions: graph context in, strings out.
//
// The system prefix carries only what is the same for every person (rules,
// background), in a fixed order with fixed separators, so it caches. The user
// turn carries this person's session. The clinical content in both comes from
// the graph; the framing below is operational wording, not clinical guidance.
Object.defineProperty(exports, "__esModule", { value: true });
exports.PROMPT_VARIANT = exports.STATE_BASED_ASSERT_IDS = void 0;
exports.buildSystemPrefix = buildSystemPrefix;
exports.promptHash = promptHash;
exports.buildUserTurn = buildUserTurn;
const node_crypto_1 = require("node:crypto");
/** Assert options whose label asks for a state, not a behaviour. The person's
 *  answer to the elaborate prompt is used instead of the label. */
exports.STATE_BASED_ASSERT_IDS = new Set([
    'bound_cant_do',
    'addr_hear_me',
    'bound_respect_no',
    'ask_just_listen',
    'patt_actually_stop',
]);
const RELATIONSHIP_LABELS = {
    partner: 'their partner',
    boss: 'their boss',
    friend: 'a friend',
    parent: 'their parent',
    roommate: 'their roommate',
    coworker: 'a coworker',
    other: 'someone in their life',
};
const PRIORITY_LABELS = {
    objective: 'getting what they need',
    relationship: 'keeping the relationship strong',
    'self-respect': 'keeping their self-respect intact',
};
exports.PROMPT_VARIANT = 'rules';
function buildSystemPrefix(ctx) {
    const rules = ctx.rules.map((r, i) => `${i + 1}. ${r.text}`).join('\n');
    const background = ctx.background.map(b => `- ${b}`).join('\n');
    return [
        'You write the exact words a person will say to open one hard conversation. They do not have this skill and may be upset right now. Whatever you write is what they will say aloud, so every sentence must be safe to say to the listener named in the request.',
        '',
        'Return three openers as JSON in the required shape. Each opener is the complete script the person reads, in the first person, addressed to the listener as "you". `why` is one short caption, under twelve words, on why this way in. Never add anything the person did not ask for.',
        '',
        'The rules below say when to set risk.level. risk.reason is for logs only and is never shown to anyone.',
        '',
        'Rules. Follow every one.',
        rules,
        '',
        'Background on how this tool talks to people, for recognition only. Never quote it and never use its tone in an opener.',
        background,
    ].join('\n');
}
function promptHash(prefix) {
    return (0, node_crypto_1.createHash)('sha256').update(prefix).digest('hex').slice(0, 12);
}
function buildUserTurn(session, ctx) {
    var _a, _b, _c, _d;
    const lines = [];
    const ownWords = [];
    const listener = (_a = RELATIONSHIP_LABELS[session.relationshipType]) !== null && _a !== void 0 ? _a : RELATIONSHIP_LABELS.other;
    lines.push(`Listener: ${listener}.`);
    if (ctx.situationLabel)
        lines.push(`Kind of conversation: ${ctx.situationLabel}.`);
    if (session.priorities.length) {
        const p = session.priorities.map(id => { var _a; return (_a = PRIORITY_LABELS[id]) !== null && _a !== void 0 ? _a : id; }).join(', then ');
        lines.push(`What matters most to them, in order: ${p}.`);
    }
    // Describe. Tapped templates land in the box as lines, so a line that
    // matches a template is recognition-only; anything else in the box is theirs.
    lines.push('');
    const templateSet = new Set(ctx.describeLabels.map(l => l.trim()));
    const boxLines = session.describeCustom.split('\n').map(l => l.trim()).filter(Boolean);
    const ownLines = boxLines.filter(l => !templateSet.has(l));
    if (ctx.describeLabels.length) {
        const list = ctx.describeLabels.map(l => `"${l}"`).join('; ');
        lines.push(`What happened, as the option${ctx.describeLabels.length > 1 ? 's' : ''} they tapped (recognition only, do not say these sentences aloud): ${list}`);
    }
    if (ownLines.length) {
        const own = ownLines.join(' ');
        lines.push(`What happened, in their own words (keep their wording): "${own}"`);
        ownWords.push(own);
    }
    // Feelings
    const feelingCustom = session.feelingCustom.trim();
    if (ctx.feelings.length || feelingCustom) {
        const chips = ctx.feelings.map(f => {
            const grp = f.group ? ` (${f.group})` : '';
            return f.isAttribution ? `${f.label}${grp} [an accusation dressed as a feeling; name the primary emotion under it instead]` : `${f.label}${grp}`;
        });
        if (feelingCustom) {
            chips.push(`"${feelingCustom}" (their own words)`);
            ownWords.push(feelingCustom);
        }
        lines.push(`Feelings they picked, in the order they picked them (recognition only; follow the register rule for this listener): ${chips.join('; ')}.`);
    }
    // The one ask
    lines.push('');
    let mustContain = null;
    const assertCustom = session.assertCustom.trim();
    const chosenId = (_b = session.assertIds[0]) !== null && _b !== void 0 ? _b : session.assertId;
    const detail = chosenId ? ((_c = session.assertDetails[chosenId]) !== null && _c !== void 0 ? _c : '').trim() : '';
    if (ctx.assert && chosenId === ctx.assert.id) {
        if (exports.STATE_BASED_ASSERT_IDS.has(ctx.assert.id) && ctx.assert.hasPlaceholder) {
            // "I'm not able to do [thing] and I need that to be okay" and
            // "I need you to respect my decision about [this]": the typed detail IS
            // the blank (the UI says "Fill in the blank"), never an offer. Keep the
            // thing, drop the request for a feeling.
            const thing = detail || '[what they cannot do or have decided]';
            lines.push(`The one ask is a boundary. The thing itself, in their own words: "${thing}". The option they tapped was worded "${ctx.assert.label}", which asks the listener to feel a certain way about it; do not ask for that. State the boundary as what they are not going to do, or the decision they have made, and stop. Do not present the thing as an offer.`);
            if (detail) {
                ownWords.push(detail);
                mustContain = detail;
            }
        }
        else if (exports.STATE_BASED_ASSERT_IDS.has(ctx.assert.id)) {
            const prompt = (_d = ctx.assert.elaboratePrompt) !== null && _d !== void 0 ? _d : 'What do you need them to do?';
            if (detail) {
                lines.push(`The one ask. They were asked "${prompt}" and answered, in their own words: "${detail}". Write the ask from their answer as something the listener can visibly do; do not use the option's wording.`);
                ownWords.push(detail);
                // The model is told to rewrite this answer, so it is not required verbatim.
            }
            else {
                lines.push(`The one ask, from the option they tapped: "${ctx.assert.label}". This wording asks for a state, not a behaviour; rewrite it as one thing the listener can visibly do or stop doing.`);
            }
        }
        else if (ctx.assert.hasPlaceholder && detail) {
            const filled = ctx.assert.label.replace(/\[.*?\]/g, detail);
            lines.push(`The one ask (use their wording for the specific part): "${filled}"`);
            ownWords.push(detail);
            mustContain = detail;
        }
        else if (detail) {
            lines.push(`The one ask: "${ctx.assert.label}". Their added detail, in their own words: "${detail}".`);
            ownWords.push(detail);
            mustContain = detail;
        }
        else {
            lines.push(`The one ask: "${ctx.assert.label}"`);
        }
    }
    else if (assertCustom) {
        lines.push(`The one ask, in their own words (keep it): "${assertCustom}"`);
        ownWords.push(assertCustom);
        mustContain = assertCustom;
    }
    if (assertCustom && ctx.assert && chosenId === ctx.assert.id) {
        lines.push(`They also wrote this about what they want, in their own words: "${assertCustom}". Only one ask may appear; prefer the option above unless their words are clearly the real ask.`);
        ownWords.push(assertCustom);
    }
    // Barriers
    if (ctx.barriers.length) {
        lines.push('');
        const b = ctx.barriers.map(x => (x.coaching ? `${x.label} (${x.coaching})` : x.label)).join('; ');
        lines.push(`What makes this hard for them (recognition only; it may tell you which opener to put first): ${b}.`);
    }
    const barriersCustom = session.barriersCustom.trim();
    if (barriersCustom) {
        lines.push(`In their own words about what makes it hard: "${barriersCustom}"`);
        ownWords.push(barriersCustom);
    }
    // Pattern rules
    if (ctx.patternRules.length) {
        lines.push('');
        lines.push('Extra rules for the state they are in right now:');
        for (const t of ctx.patternRules)
            lines.push(`- ${t}`);
    }
    const typedAsk = detail || assertCustom || null;
    return { text: lines.join('\n'), ownWords, mustContain, typedAsk };
}
//# sourceMappingURL=prompt.js.map