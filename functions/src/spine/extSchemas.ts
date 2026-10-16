/**
 * `ToolSession.ext`: tool-specific detail, namespaced by module (ruling R18). Pure.
 *
 * Each namespace has a registered schema. Values are ids / enums / booleans; integers are allowed
 * only on keys ending `Sec` or `Count` (durations and counts are not scales); the whole object is
 * ≤ 4 KB serialised. No free text, no numeric scale ever reaches a session record.
 */
import { ValidationError } from '../shared/validate';

type Field =
  | { t: 'id' }
  | { t: 'ids'; max: number }
  | { t: 'bool' }
  | { t: 'int'; max: number }                    // key must end in Sec or Count
  | { t: 'obj'; of: Record<string, Field> }
  | { t: 'objs'; max: number; of: Record<string, Field> };

const ID = /^[a-z0-9][a-z0-9_:-]{0,63}$/i;
export const EXT_MAX_BYTES = 4096;

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
    confidence: { t: 'id' },                                                       // high | medium | low | none (checked by the client)
    oaFacts: { t: 'id' },                                                          // Do the Opposite: the check's facts choice
    oaEffect: { t: 'id' },                                                         // its effectiveness choice
    oaRoute: { t: 'id' },                                                          // opposite | problem | clarify | support
    handoffs: {                                                                    // P2 breakdown hand-off (A4-2)
      t: 'objs', max: 4,
      of: {
        primitiveId: { t: 'id' }, completed: { t: 'bool' }, durationSec: { t: 'int', max: 3600 },
        thenVsNow: { t: 'id' }, resumed: { t: 'bool' }, overridden: { t: 'bool' },
      },
    },
  },
  ie: {},
  wmp: {
    angryHurtId: { t: 'id' },                                                      // the angry-part card in Recover: ProtectedHurt id (absent: Not sure)
    angryVoteHeld: { t: 'bool' },                                                  // its vote of confidence held for the full 4 s
    angryExit: { t: 'id' },                                                        // unblend | protects | vote | speak | skipped (checked by the client)
  },
  mf: {},
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
