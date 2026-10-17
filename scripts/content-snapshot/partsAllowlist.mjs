/**
 * What src/data/content/parts.json ships: an allowlist, per row type, of exactly the fields a screen or a
 * client gate reads (src/data/partsContentTypes.ts declares the same fields; tests/content-snapshot.test.mjs
 * holds the two equal). parts.json is public once deployed, so a field added in scripts/parts/content.py
 * stays on the server until it is listed here and typed on the client.
 *
 * The one source for the list: build.mjs's buildParts and the fixture projection the drift test compares it
 * with (tests/lib/partsContentFixture.mjs) both end in shipParts, so the file and the projection can't
 * disagree about what ships. Never shipped: a move's `kind` (proactive / reactive), `offerable`,
 * `trailPhrase` (the server builds the trail statement), prompt placement (`flow`, `step`, `order`,
 * `copyKind`), an option's `kind` (chip / voice) and `sameAs`, `hurtPhrase`, review bookkeeping, every
 * edge property but OFFERED_FOR's order and OFTEN_GUARDS' rank, trail rules, contexts and every PartsPolicy
 * number but `limits`.
 */
export const PARTS_FIELDS = Object.freeze({
  /** moves[]: Meet a part's chips (label), the unblend and goal lines, the name suggestion, the crisis seam. */
  moves: Object.freeze(['id', 'label', 'unblendPhrase', 'nameHint', 'safetyLine']),
  /** prompts[id]: the line itself. */
  prompts: Object.freeze(['copy']),
  /** options[flow][step][]: the chip, its step-machine branch, the tender / danger flag, Self-like grouping, order, moves it is offered for. */
  options: Object.freeze(['id', 'label', 'flag', 'selfLike', 'branch', 'order', 'moves']),
  /** hurts[]: the angry card's chips (label, matters, feltPhrase, order, guardedBy) and DEAR MAN's "I felt" chip (namedAs). */
  hurts: Object.freeze(['id', 'label', 'feltPhrase', 'matters', 'order', 'namedAs', 'guardedBy']),
  /** hurts[].guardedBy[]. */
  guardedBy: Object.freeze(['moveId', 'rank']),
  /** limits: PartsPolicy's two client numbers, once the policy is signed off. */
  limits: Object.freeze(['nameMaxChars', 'maxNonSelfAnswers']),
});

/** The top-level keys of parts.json (`limits` only once the policy is signed off). */
export const PARTS_KEYS = Object.freeze(['version', 'moves', 'prompts', 'options', 'hurts', 'canTouch', 'expresses', 'limits']);

const pick = (row, fields) => Object.fromEntries(fields.filter((k) => k in row).map((k) => [k, row[k]]));
const ids = (list) => list.filter((x) => typeof x === 'string');

/**
 * Content in buildParts' shape (already in its canonical order) cut to the allowlist. `canTouch` and
 * `expresses` are id maps (event → hurt ids; source label → source id → move id): only ids pass.
 */
export function projectParts(c) {
  const mapObj = (o, f) => Object.fromEntries(Object.entries(o).map(([k, v]) => [k, f(v)]));
  return {
    version: c.version,
    moves: c.moves.map((m) => pick(m, PARTS_FIELDS.moves)),
    prompts: mapObj(c.prompts, (p) => pick(p, PARTS_FIELDS.prompts)),
    options: mapObj(c.options, (steps) => mapObj(steps, (list) => list.map((o) => ({ ...pick(o, PARTS_FIELDS.options), moves: ids(o.moves) })))),
    hurts: c.hurts.map((h) => ({
      ...pick(h, PARTS_FIELDS.hurts),
      namedAs: ids(h.namedAs),
      guardedBy: h.guardedBy.map((g) => pick(g, PARTS_FIELDS.guardedBy)),
    })),
    canTouch: mapObj(c.canTouch, ids),
    expresses: mapObj(c.expresses, (table) => mapObj(table, (moveId) => String(moveId))),
    ...(c.limits ? { limits: pick(c.limits, PARTS_FIELDS.limits) } : {}),
  };
}
