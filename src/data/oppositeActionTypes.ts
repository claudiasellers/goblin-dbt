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
export interface OppositeActionSession {
  id: string;
  schemaVersion: 1;
  contentVersion: string;
  emotionId: string;
  parentId: string;
  urgeId: string;
  customUrge: string;
  situation: string;
  observation: string;
  interpretation: string;
  goal: string;
  safety: string;
  facts: string;
  effectiveness: string;
  intensityBefore: number;
  intensityAfter: number | null;
  actionSize: string;
  action: string;
  cue: string;
  barrier: string;
  backup: string;
  bodyPractice: boolean;
  willingness: string;
  status: "planned" | "practiced";
  outcome: string;
  reflection: string;
  sourceIds: string[];
}
