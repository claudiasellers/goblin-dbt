/**
 * `ToolSession.ext`: tool-specific detail, namespaced by module (ruling R18). Pure.
 *
 * Each namespace has a registered schema. Values are ids / enums / booleans; integers are allowed
 * only on keys ending `Sec` or `Count` (durations and counts are not scales), or as one of a closed set
 * a key registers as `one` (Cope Ahead's `rehearsed`: 1 or 2 passes, never a scale); the whole object is
 * ≤ 4 KB serialised. No numeric scale ever reaches a session record, and no free text except the
 * person's own words on a key a tool registers as `text` (Wise mind's and Cope Ahead's `*Own`):
 * length-checked only, never linted or interpreted, never shown back outside that visit and My words.
 */
import { ValidationError } from '../shared/validate';

type Field =
  | { t: 'id' }
  | { t: 'ids'; max: number }
  | { t: 'bool' }
  | { t: 'int'; max: number }                    // key must end in Sec or Count
  | { t: 'text'; max: number }                   // key must end in Own: the person's own words, length-checked only
  | { t: 'one'; of: readonly (string | number)[] } // exactly one of a closed set
  | { t: 'obj'; of: Record<string, Field> }
  | { t: 'objs'; max: number; of: Record<string, Field> };

const ID = /^[a-z0-9][a-z0-9_:-]{0,63}$/i;
export const EXT_MAX_BYTES = 4096;
/** Wise mind's own words (scripts/wise-mind/content.py OWN_MAX). */
export const WM_OWN_MAX = 140;
/** Cope Ahead's own words (scripts/cope-ahead/content.py OWN_MAX, MOVE_OWN_MAX). */
export const CA_OWN_MAX = 140;
export const CA_MOVE_OWN_MAX = 90;

/** Own words on a skill-runtime answer (scripts/skills/<skill>.py OWN_MAX). */
export const RUN_OWN_MAX = 140;

/** Registered namespaces. A module adds its keys here in the PR that writes them. */
export const EXT_SCHEMAS: Record<string, Record<string, Field>> = {
  core: {
    microStepId: { t: 'id' },
    patternId: { t: 'id' },
    activityId: { t: 'id' },
    routing: { t: 'obj', of: { slot: { t: 'id' }, ruleId: { t: 'id' } } },       // WMP-04 / E4
  },
  dt: {
    techniqueId: { t: 'id' },                                                      // cool-down
    sensesDone: { t: 'ids', max: 5 },                                              // five-senses
    stepsDone: { t: 'ids', max: 10 },                                              // pause
  },
  er: {
    problemTypeId: { t: 'id' },                                                    // problem-solve
    directionId: { t: 'id' },
    size: { t: 'id' },
    barrierTypeId: { t: 'id' },                                                    // what got in the way (MI)
    barrierSubId: { t: 'id' },
    ambivalenceId: { t: 'id' },
    psLater: { t: 'bool' },                                                        // parts on: "Want to get to know that part another time?" queued a PartCandidate
    confidence: { t: 'id' },                                                       // high | medium | low | none (checked by the client)
    oaFacts: { t: 'id' },                                                          // Do the Opposite: the check's facts choice
    oaEffect: { t: 'id' },                                                         // its effectiveness choice
    oaRoute: { t: 'id' },                                                          // opposite | problem | clarify | support
    unblendShown: { t: 'bool' },                                                   // parts on: the unblend line showed after FTF's pull / OA's urge
    goalLineShown: { t: 'bool' },                                                  // parts on: Do the Opposite's goal line showed on the effectiveness card
    handoffs: {                                                                    // P2 breakdown hand-off (A4-2)
      t: 'objs', max: 4,
      of: {
        primitiveId: { t: 'id' }, completed: { t: 'bool' }, durationSec: { t: 'int', max: 3600 },
        thenVsNow: { t: 'id' }, resumed: { t: 'bool' }, overridden: { t: 'bool' },
      },
    },
    copeAheadPartId: { t: 'id' },                                                  // DEAR MAN cope ahead: the part picked (id only, never its anchor)
    whoShowedUp: { t: 'id' },                                                      // DEAR MAN debrief, named form only: yes | a_bit | no (checked by the client; never the name)
  },
  ie: {},
  wmp: {
    angryHurtId: { t: 'id' },                                                      // the angry-part card in Recover: ProtectedHurt id (absent: Not sure)
    angryVoteHeld: { t: 'bool' },                                                  // its vote of confidence held for the full 4 s
    angryExit: { t: 'id' },                                                        // unblend | protects | vote | speak | skipped (checked by the client)
    angryLater: { t: 'bool' },                                                     // parts on: "Spend a minute with it later?" queued a PartCandidate
    unblendShown: { t: 'bool' },                                                   // parts on: the unblend line showed after Recover's pull
  },
  mf: {},
  // Wise mind (docs/design/wise-mind.md). wiseMindAnswer itself is the session's top-level ask-fresh field.
  wm: {
    questionId: { t: 'id' },                                                       // WiseMindQuestion id
    questionOwn: { t: 'text', max: WM_OWN_MAX },
    form: { t: 'id' },                                                             // minds | parts (checked by the client)
    emotionSaysIds: { t: 'ids', max: 4 },                                          // MindVoice ids
    emotionSaysOwn: { t: 'text', max: WM_OWN_MAX },
    reasonSaysIds: { t: 'ids', max: 4 },
    reasonSaysOwn: { t: 'text', max: WM_OWN_MAX },
    partIds: { t: 'ids', max: 12 },                                                // parts form: part ids only
    stillCloseIds: { t: 'ids', max: 12 },                                          // parts form: "It won't step back", part ids only
    practiceId: { t: 'id' },                                                       // WiseMindPractice id
    answerOwn: { t: 'text', max: WM_OWN_MAX },
    feel: { t: 'id' },                                                             // calm | pushed | unsure (checked by the client)
    onceMore: { t: 'bool' },                                                       // "Drop in once more" (once)
    nextToolId: { t: 'id' },                                                       // the tool it handed off to
    kept: { t: 'bool' },                                                           // "Keep what wise mind said" wrote an OwnLine
  },
  // Cope Ahead (docs/design/cope-ahead.md). The cope_ahead_after card reads the plan from here.
  ca: {
    situationId: { t: 'id' },                                                      // CopeSituation id
    situationOwn: { t: 'text', max: CA_OWN_MAX },
    when: { t: 'one', of: ['today', 'tomorrow', 'this_week', 'later'] },           // also the follow-up's chip
    feelIds: { t: 'ids', max: 2 },                                                 // grid word ids, up to two
    pullIds: { t: 'ids', max: 4 },                                                 // Find the feeling's pull ids
    partId: { t: 'id' },                                                           // parts on: the part picked (id only, never its anchor)
    hardMomentId: { t: 'id' },                                                     // HardMoment id
    hardMomentOwn: { t: 'text', max: CA_OWN_MAX },
    ifFrom: { t: 'one', of: ['moment', 'pull'] },                                  // the plan's "If"
    moveIds: { t: 'ids', max: 2 },                                                 // CopeMove ids
    moveOwn: { t: 'text', max: CA_MOVE_OWN_MAX },
    rehearsed: { t: 'one', of: [1, 2] },                                           // passes, never a scale
    newMomentId: { t: 'id' },                                                      // once more: the moment you didn't plan for
    newMomentOwn: { t: 'text', max: CA_OWN_MAX },
    newMoveIds: { t: 'ids', max: 2 },                                              // once more: Change what I'll do
    newMoveOwn: { t: 'text', max: CA_MOVE_OWN_MAX },
    settle: { t: 'one', of: ['breath', 'five_senses', 'ok'] },
    kept: { t: 'bool' },                                                           // "Keep this" wrote an OwnLine
    followUp: { t: 'bool' },                                                       // "Want me to ask how it went?" Yes
  },
  // The skill runtime (docs/design/skill-runtime.md): one shape for every skill the player runs, the
  // attempt record a router reads. Ids only, plus the person's own words on an answer (length-checked only).
  run: {
    skillId: { t: 'id' },                                                          // Skill id (schema/skills.cypher)
    versionId: { t: 'id' },                                                        // its version (cf-v1)
    path: { t: 'ids', max: 24 },                                                   // step ids, in the order shown
    answers: {                                                                     // what was chosen, per question
      t: 'objs', max: 16,
      of: { fieldId: { t: 'id' }, optionIds: { t: 'ids', max: 12 }, valueOwn: { t: 'text', max: RUN_OWN_MAX } },
    },
    offeredExitIds: { t: 'ids', max: 8 },                                          // what the hand-off offered
    exitId: { t: 'id' },                                                           // where it went (a SkillExit id, or done)
    embedsShown: { t: 'ids', max: 8 },                                             // e.g. unblend: the parts line showed
    handoffs: {                                                                    // P2 breakdown hand-off, as ext.er.handoffs
      t: 'objs', max: 4,
      of: {
        primitiveId: { t: 'id' }, completed: { t: 'bool' }, durationSec: { t: 'int', max: 3600 },
        thenVsNow: { t: 'id' }, resumed: { t: 'bool' }, overridden: { t: 'bool' },
      },
    },
  },
};

function checkField(key: string, f: Field, v: unknown, path: string): unknown {
  switch (f.t) {
    case 'id':
      if (typeof v !== 'string' || !ID.test(v)) throw new ValidationError(`ext ${path}: expected an id`);
      return v;
    case 'ids':
      if (!Array.isArray(v) || v.length > f.max || !v.every((x) => typeof x === 'string' && ID.test(x))) {
        throw new ValidationError(`ext ${path}: expected up to ${f.max} ids`);
      }
      return v;
    case 'bool':
      if (typeof v !== 'boolean') throw new ValidationError(`ext ${path}: expected a boolean`);
      return v;
    case 'int':
      if (!/(Sec|Count)$/.test(key)) throw new ValidationError(`ext ${path}: integers only on *Sec / *Count keys`);
      if (typeof v !== 'number' || !Number.isInteger(v) || v < 0 || v > f.max) throw new ValidationError(`ext ${path}: expected an integer`);
      return v;
    case 'text': {
      if (!/Own$/.test(key)) throw new ValidationError(`ext ${path}: text only on *Own keys`);
      // eslint-disable-next-line no-control-regex
      const t = typeof v === 'string' ? v.replace(/[\r\n\t]+/g, ' ').replace(/[\u0000-\u001f\u007f-\u009f]/g, '').trim() : '';
      if (!t || t.length > f.max) throw new ValidationError(`ext ${path}: expected 1 to ${f.max} characters`);
      return t;
    }
    case 'one':
      if (!f.of.includes(v as string | number)) throw new ValidationError(`ext ${path}: expected one of ${f.of.join(', ')}`);
      return v;
    case 'obj':
      return checkObject(f.of, v, path);
    case 'objs':
      if (!Array.isArray(v) || v.length > f.max) throw new ValidationError(`ext ${path}: expected up to ${f.max} items`);
      return v.map((x, i) => checkObject(f.of, x, `${path}[${i}]`));
  }
}

function checkObject(schema: Record<string, Field>, v: unknown, path: string): Record<string, unknown> {
  if (!v || typeof v !== 'object' || Array.isArray(v)) throw new ValidationError(`ext ${path}: expected an object`);
  const out: Record<string, unknown> = {};
  for (const [k, x] of Object.entries(v as Record<string, unknown>)) {
    const f = schema[k];
    if (!f) throw new ValidationError(`ext ${path}.${k}: not registered`);
    if (x === undefined || x === null) continue;
    out[k] = checkField(k, f, x, `${path}.${k}`);
  }
  return out;
}

/**
 * One registered field on its own, by the same rules (Meet a part stores P2's `handoffs` on its
 * PartSession in exactly DEAR MAN's `ext.er.handoffs` shape, so the two can't drift).
 */
export function checkExtField(ns: string, key: string, v: unknown): unknown {
  const f = EXT_SCHEMAS[ns]?.[key];
  if (!f) throw new ValidationError(`ext ${ns}.${key}: not registered`);
  return checkField(key, f, v, `${ns}.${key}`);
}

/**
 * Validate `ext` ({namespace: {...}}). Returns the JSON string stored on the session, or null when
 * empty. Throws ValidationError for an unknown namespace or key, a number outside *Sec/*Count, free
 * text, or more than 4 KB.
 */
export function validateExt(raw: unknown): string | null {
  if (raw === undefined || raw === null) return null;
  if (typeof raw !== 'object' || Array.isArray(raw)) throw new ValidationError('ext: expected an object');
  const out: Record<string, unknown> = {};
  for (const [ns, v] of Object.entries(raw as Record<string, unknown>)) {
    const schema = EXT_SCHEMAS[ns];
    if (!schema) throw new ValidationError(`ext ${ns}: unknown namespace`);
    const checked = checkObject(schema, v, ns);
    if (Object.keys(checked).length) out[ns] = checked;
  }
  if (!Object.keys(out).length) return null;
  const s = JSON.stringify(out);
  if (Buffer.byteLength(s, 'utf8') > EXT_MAX_BYTES) throw new ValidationError('ext: over 4 KB');
  return s;
}
