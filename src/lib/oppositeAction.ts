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
