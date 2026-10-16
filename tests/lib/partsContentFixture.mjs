// The parts fixture (tests/fixtures/parts-content.json, every row with its reviewStatus) projected to
// what src/data/content/parts.json ships: signed-off rows only, in buildParts' shape and order. The drift
// guard compares the shipped file with this, so a content.py change without a graph load fails there.
import { sortParts } from "../../scripts/content-snapshot/build.mjs";

const signedOff = (row) => row.reviewStatus === "approved" && row.pending == null;
/** A row without its bookkeeping: everything in parts.json is approved by construction. */
const strip = ({ reviewStatus: _r, pending: _p, ...row }) => row;

/** `approve(id)` overrides the fixture's own reviewStatus (for checking the shape with every row in). */
export function partsFromFixture(fixture, approve = null) {
  const ok = approve ? (row) => approve(row.id) : signedOff;
  const moves = fixture.moves.filter(ok);
  const moveIds = new Set(moves.map((m) => m.id));
  const options = {};
  for (const [flow, steps] of Object.entries(fixture.options)) {
    for (const [step, list] of Object.entries(steps)) {
      const kept = list.filter(ok).map(strip);
      if (kept.length) (options[flow] ??= {})[step] = kept;
    }
  }
  return sortParts({
    // Every parts node carries content.py's VERSION, the policy node included.
    version: fixture.version,
    moves: moves.map(strip),
    prompts: Object.fromEntries(Object.entries(fixture.prompts).filter(([id, p]) => ok({ id, ...p })).map(([id, p]) => [id, strip(p)])),
    options,
    // OFTEN_GUARDS is reviewed by its move: a hurt ships with the guarding moves that are signed off.
    hurts: fixture.hurts.filter(ok).map((h) => ({ ...strip(h), guardedBy: h.guardedBy.filter((x) => moveIds.has(x.moveId)) })),
  });
}
