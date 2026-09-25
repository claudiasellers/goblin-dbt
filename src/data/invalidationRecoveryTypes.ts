/** Shapes returned by getInvalidationRecoveryContent. All values come from the graph. */
export type Pull = 'fight' | 'chase' | 'hide' | 'freeze';
export type ExitId = 'ask' | 'land' | 'opposite' | 'park' | 'prefer';
export type Gate = 'downshift' | 'downshift-cold' | 'orient' | 'none';
export type Zone = 'real' | 'both' | 'check';

export interface RecoveryGates {
  downshiftAt: number;
  coldAt: number;
  askMax: number;
  waitMinutes: number;
  chaseWaitMinutes: number;
  validationMax: number;
  orientLowArousalAt: number;
  /** Certainty dial: at/above certaintyReal with a pattern = treat as real; at/above certaintyBoth = hold both. */
  certaintyReal: number;
  certaintyBoth: number;
}

export interface InvalidationEvent {
  id: string;
  label: string;
  phrase: string;
  covers: string[];
  highRisk: boolean;
  lowArousal: boolean;
  protocol: string;
  secondaryProtocol: string | null;
  emotions: { id: string; name: string }[];
  patterns: string[];
}

export interface UnmetNeedContent { id: string; label: string; social: string }
export interface RecoveryExit { id: ExitId; title: string; sub: string; chaseSub: string | null }
export interface PracticeSkill {
  id: string;
  name: string;
  evidenceGrade: 'Strong' | 'Moderate' | 'Preliminary';
  evidenceBasis: string | null;
  family: 'body' | 'mind' | 'people';
  why: string;
  sources: { id: string; title: string; url: string }[];
}

/** The flow document's copy is a versioned UI protocol; typed loosely and read through `copy()` helpers. */
export interface RecoveryFlow {
  version: string;
  gates: RecoveryGates;
  pulls: { id: Pull; label: string; sub: string; urgeLabel: string }[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  copy: Record<string, any>;
  sourceIds: string[];
}

export interface InvalidationRecoveryContent {
  version: string;
  flow: RecoveryFlow;
  states: InvalidationEvent[];
  protocols: Record<string, { label: string; validationLines: string[] }>;
  needs: UnmetNeedContent[];
  /** Williams social needs: where to meet the need elsewhere, and the PracticeSkill that doing so credits. */
  social: Record<string, { title: string; act: string; skill: string }>;
  exits: RecoveryExit[];
  skills: PracticeSkill[];
}

export interface InvalidationRecoverySession {
  schemaVersion: 1;
  id: string;
  contentVersion: string;
  stateId: string;
  pull: Pull;
  gate: Gate;
  emotionId: string;
  needId: string;
  exitId: ExitId;
  zone: Zone | null;
  safe: 'yes' | 'no' | null;
  asks: 0 | 1 | 2 | null;
  startIntensity: number;
  startUrge: number;
  readings: number[];
  endIntensity: number;
  endUrge: number;
  skills: string[];
  followUps: string[];
}

export interface InvalidationRecoveryProgress {
  sessions: (InvalidationRecoverySession & { createdAt: string })[];
  skillUses: Record<string, number>;
}
