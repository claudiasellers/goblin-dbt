/**
 * PLEASE ("Running low") flow document, as getPleaseContent returns it. Pure, no imports.
 * Mirror of functions/src/please/types.ts (tests/please.test.mjs asserts they stay identical).
 */
export type PleaseAreaId = 'illness' | 'eating' | 'substances' | 'sleep' | 'exercise';

export interface PleaseArea { id: PleaseAreaId; letter: string; name: string }

export interface PleaseFactor {
  id: string;
  area: PleaseAreaId;
  label: string;
  /** Right-now option ids this factor offers, best first. */
  now: string[];
  /** Protect-tomorrow option ids this factor offers, best first. */
  later: string[];
}

export interface PleaseOption { id: string; label: string }

export interface PleaseCheck { id: string; label: string; points: 'body' | 'feeling' }

export interface PleaseCopy {
  stages: Record<'factors' | 'check' | 'now' | 'later' | 'done', string>;
  factors: { title: string; body: string; ownLabel: string; ownPlaceholder: string; none: string; next: string };
  check: { title: string; body: string; next: string };
  feeling: { title: string; body: string; findTheFeeling: string; oppositeAction: string; continue: string };
  now: { title: string; body: string; ownLabel: string; ownPlaceholder: string; next: string };
  later: { title: string; body: string; next: string; skip: string };
  done: { title: string; body: string; nowLabel: string; laterLabel: string; footnote: string; restart: string; otherTools: string };
}

export interface PleaseContent {
  version: string;
  areas: PleaseArea[];
  factors: PleaseFactor[];
  /** Emotion word id → the area to list first (order only, nothing pre-selected). */
  areaFirst: Record<string, PleaseAreaId>;
  check: PleaseCheck[];
  now: PleaseOption[];
  nowAlways: string[];
  later: PleaseOption[];
  laterAlways: string[];
  laterMax: number;
  copy: PleaseCopy;
}
