import type { OppositeActionFlow } from "../data/oppositeActionTypes";

/** The graph owns the decision table. Missing/uncertain answers never imply approval. */
export function oppositeActionRoute(
  flow: OppositeActionFlow,
  safety: string,
  facts: string,
  effectiveness: string,
): "support" | "opposite" | "problem" | "clarify" {
  if (safety !== "safe") return "support";
  return flow.routes[`${facts}:${effectiveness}`] ?? "clarify";
}

export type OppositeActionRoute = ReturnType<typeof oppositeActionRoute>;

/** The check's result as the session's `ext.er` keys (parts data fix 3). */
export interface OaResultExt {
  oaRoute: OppositeActionRoute;
  oaFacts?: string;
  oaEffect?: string;
}

/** Sent when the result no longer stands (Recheck, Previous): `setExt` merges per key, the server drops nulls. */
export const OA_RESULT_CLEARED = { oaFacts: null, oaEffect: null, oaRoute: null } as const;

/** The server's ext id shape (functions/src/spine/extSchemas.ts): anything else is never sent. */
const EXT_ID = /^[a-z0-9][a-z0-9_:-]{0,63}$/i;

/**
 * What a reached check result records on the visit's ToolSession: the facts and effectiveness
 * choice ids and the route, never text. Kept whatever the route, so a protector doing its job
 * (`problem`: the urge fits and would help) is on the record too, not only urges worked against.
 * `support` is decided by the safety answer alone: facts and effect were not asked, so stay unset.
 */
export function oaResultExt(
  safety: string,
  facts: string,
  effectiveness: string,
  route: OppositeActionRoute,
): OaResultExt {
  const out: OaResultExt = { oaRoute: route };
  if (safety !== "safe" || route === "support") return out;
  if (EXT_ID.test(facts)) out.oaFacts = facts;
  if (EXT_ID.test(effectiveness)) out.oaEffect = effectiveness;
  return out;
}

/** v1 emotion-intensity reflection (kept for old saved sessions). */
export function reflectionKey(
  before: number,
  after: number,
  outcome: string,
): string {
  if (outcome === "unsafe") return "reflectionUnsafe";
  if (after > before) return "reflectionHigher";
  if (after === before) return "reflectionSame";
  return "reflectionLower";
}

export type UrgeReadoutKey =
  | "readoutUnsafe"
  | "readoutUrgeLower"
  | "readoutUrgeSlight"
  | "readoutUrgeSame"
  | "readoutUrgeHigher";

/**
 * The readout leads with URGE change, never with a flat emotion number.
 * `to` prefers the post-attempt rating and falls back to the post-body re-rate.
 */
export function urgeReadout(
  before: number,
  afterBody: number | null,
  after: number | null,
  outcome: string,
): { key: UrgeReadoutKey; from: number; to: number | null; drop: number } {
  const to = after ?? afterBody;
  const drop = to === null ? 0 : before - to;
  if (outcome === "unsafe") return { key: "readoutUnsafe", from: before, to, drop };
  if (to === null || drop === 0) return { key: "readoutUrgeSame", from: before, to, drop };
  if (drop < 0) return { key: "readoutUrgeHigher", from: before, to, drop };
  if (drop === 1) return { key: "readoutUrgeSlight", from: before, to, drop };
  return { key: "readoutUrgeLower", from: before, to, drop };
}

/** When the pull is strong, highlight the small step (capacity-matched default). */
export function capacityDefaultSize(urgeBefore: number): "small" | null {
  return urgeBefore >= 7 ? "small" : null;
}

/** Replace {token} placeholders in graph copy. Unknown tokens are left visible. */
export function fill(text: string | undefined, vars: Record<string, string | number>): string {
  return (text ?? "").replace(/\{(\w+)\}/g, (m, k) =>
    k in vars ? String(vars[k]) : m,
  );
}

/** Lower-case the first letter of an urge label so it reads inside a sentence. */
export function urgePhrase(label: string): string {
  const t = label.trim();
  if (!t) return "act on it";
  return t.charAt(0).toLowerCase() + t.slice(1);
}
