/** Shared shape for the guided exercise and a future server-side retrieval request.
 * No emotion knowledge or clinical recommendations are stored here. */
export interface FlowChoice {
  id: string;
  label: string;
  detail?: string;
}
export interface OppositeActionFlow {
  version: string;
  copy: Record<string, string>;
  choices: Record<string, FlowChoice[]>;
  routes: Record<string, "opposite" | "problem" | "clarify">;
  sourceIds: string[];
}

export type OppositeActionStatus = "planned" | "practiced" | "missed";

/**
 * schemaVersion 2 (oa-guided-v2).
 * The headline metric is URGE strength (urgeBefore → urgeAfterBody → urgeAfter).
 * Emotion intensity is still captured, but optional and secondary.
 */
export interface OppositeActionSession {
  id: string;
  schemaVersion: 2;
  contentVersion: string;
  emotionId: string;
  parentId: string;
  urgeId: string;
  /** Snapshot of the urge wording shown (graph label or the user's own). */
  urgeLabel: string;
  customUrge: string;
  situation: string;
  observation: string;
  interpretation: string;
  goal: string;
  safety: string;
  facts: string;
  effectiveness: string;
  /** 0–10, "how strong is the pull", captured before anything else. */
  urgeBefore: number;
  /** 0–10, re-rated right after the somatic circuit-breaker. */
  urgeAfterBody: number | null;
  /** 0–10, rated after the attempt (now, or at follow-up). */
  urgeAfter: number | null;
  /** Optional 0–10 emotion intensity. */
  intensityBefore: number | null;
  intensityAfter: number | null;
  /** Wording of each body cue the user completed (held) in the circuit-breaker. */
  bodyCues: string[];
  actionSize: string;
  action: string;
  /** Choice id: now | today | next_time */
  cueId: string;
  /** Snapshot of the cue label shown. */
  cue: string;
  /** ISO timestamp for a follow-up check-in, or "" when none. */
  dueAt: string;
  barrier: string;
  backup: string;
  status: OppositeActionStatus;
  outcome: string;
  missedReason: string;
  reflection: string;
  sourceIds: string[];
}

/** A saved session as returned by getOppositeActionSessions. */
export interface SavedOppositeActionSession extends OppositeActionSession {
  createdAt: string;
  updatedAt: string;
}
