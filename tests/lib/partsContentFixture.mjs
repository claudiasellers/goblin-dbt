// The parts fixture (tests/fixtures/parts-content.json, every row with its reviewStatus) projected to
// what src/data/content/parts.json ships: signed-off rows only, in buildParts' shape and order, cut to the
// same allowlist (shipParts, scripts/content-snapshot/partsAllowlist.mjs). The fixture itself keeps every
// field (the dev harness and the content tests read it raw). The drift
// guard compares the shipped file with this, so a content.py change without a graph load fails there.
import { shipParts } from "../../scripts/content-snapshot/build.mjs";

const signedOff = (row) => row.reviewStatus === "approved" && row.pending == null;
/** A row without its bookkeeping: everything in parts.json is approved by construction. */
const strip = ({ reviewStatus: _r, pending: _p, ...row }) => row;

/** `approve(id)` overrides the fixture's own reviewStatus (for checking the shape with every row in). */
export function partsFromFixture(fixture, approve = null) {
  const ok = approve ? (row) => approve(row.id) : signedOff;
  const moves = fixture.moves.filter(ok);
  const moveIds = new Set(moves.map((m) => m.id));
  const hurtIds = new Set(fixture.hurts.filter(ok).map((h) => h.id));
  const options = {};
  for (const [flow, steps] of Object.entries(fixture.options)) {
    for (const [step, list] of Object.entries(steps)) {
      const kept = list.filter(ok).map(strip);
      if (kept.length) (options[flow] ??= {})[step] = kept;
    }
  }
  // The keepsake lines are prompts too (flow pulls, after its other prompts, as build.py orders them).
  const pullsAt = Object.values(fixture.prompts).filter((p) => p.flow === "pulls").length;
  const keepsake = (fixture.keepsake ?? []).filter(ok)
    .map((k, i) => [k.id, { flow: "pulls", step: "keepsake", order: pullsAt + i, copy: k.copy }]);
  // A pair ships when signed off with both its moves; each list keeps the signed-off chips, in order.
  const optionIds = new Set(Object.values(options).flatMap((steps) => Object.values(steps).flat().map((o) => o.id)));
  const chips = (list) => list.map((c) => c.id).filter((id) => optionIds.has(id));
  return shipParts({
    // Every parts node carries content.py's VERSION, the policy node included.
    version: fixture.version,
    moves: moves.map(strip),
    prompts: Object.fromEntries([
      ...Object.entries(fixture.prompts).filter(([id, p]) => ok({ id, ...p })).map(([id, p]) => [id, strip(p)]),
      ...keepsake,
    ]),
    options,
    // OFTEN_GUARDS is reviewed by its move: a hurt ships with the guarding moves that are signed off.
    hurts: fixture.hurts.filter(ok).map((h) => ({ ...strip(h), guardedBy: h.guardedBy.filter((x) => moveIds.has(x.moveId)) })),
    // CAN_TOUCH is reviewed by its event (Recover's content): it ships when approved, with the hurts that ship.
    canTouch: Object.fromEntries(Object.entries(fixture.canTouch)
      .filter(([id, t]) => ok({ id, ...t }))
      .map(([id, t]) => [id, t.hurts.filter((h) => hurtIds.has(h))])
      .filter(([, hs]) => hs.length)),
    // EXPRESSES is reviewed by its source id: it ships when approved and its move ships (offerable moves only).
    expresses: Object.fromEntries(Object.entries(fixture.expresses)
      .map(([label, table]) => [label, Object.fromEntries(Object.entries(table)
        .filter(([id, e]) => ok({ id, ...e }) && moveIds.has(e.moveId))
        .map(([id, e]) => [id, e.moveId]))])
      .filter(([, t]) => Object.keys(t).length)),
    pairs: (fixture.pairs ?? []).filter((p) => ok(p) && moveIds.has(p.a) && moveIds.has(p.b))
      .map((p) => ({ id: p.id, a: p.a, b: p.b, bothWant: chips(p.bothWant), worryA: chips(p.worryA), worryB: chips(p.worryB) })),
    // PartsPolicy's two client numbers, once the policy is signed off.
    limits: ok(fixture.policy) ? { nameMaxChars: fixture.policy.nameMaxChars, maxNonSelfAnswers: fixture.policy.maxNonSelfAnswers } : null,
  });
}

/**
 * Shipped parts content with some lines taken out (prompts, options, moves or hurts, by id): every line is
 * signed off since 17 Oct (Claudia: ship it all), so a gate's "anything missing, nothing" path is tested
 * on the real content minus one line rather than on today's file.
 */
export function withoutIds(content, ...ids) {
  const drop = new Set(ids);
  const c = structuredClone(content);
  for (const id of drop) delete c.prompts[id];
  for (const steps of Object.values(c.options)) {
    for (const [step, list] of Object.entries(steps)) steps[step] = list.filter((o) => !drop.has(o.id));
  }
  c.moves = c.moves.filter((m) => !drop.has(m.id));
  c.hurts = c.hurts.filter((h) => !drop.has(h.id));
  return c;
}
