import { createContext, useContext } from 'react';
import type { CapacityReading, ThenVsNow } from '../data/capacityTypes';
import type { ActedOnUrge, CloseKind, CloseStatus, DetailKind, RepSource, ToolEntry } from '../data/spineTypes';
import type { CloseToolSessionResponse, ScheduleFollowUpInput, SessionExt } from '../services/spine';
import type { ToolLinkState } from '../lib/spine/toolLink';

/** What a tool may add when it closes (the provider fills status, step, practiced, duration, ext). */
export interface ToolSessionCloseInput {
  status?: CloseStatus;
  thenVsNow?: ThenVsNow;
  actedOnUrge?: ActedOnUrge;
  /** The band the tool asked after it opened (e.g. BandGate on its first screen). */
  bandAtStart?: CapacityReading;
  bandAtEnd?: CapacityReading;
  urgeIds?: string[];
  detail?: { kind: DetailKind; id: string };
  skillIds?: string[];
  repSource?: RepSource;
  ext?: SessionExt;
  /** Follow-ups to schedule with the close (≤5), e.g. Problem Solve's ps_step. */
  schedule?: ScheduleFollowUpInput[];
}

/**
 * The tool's practice-spine session (PR-S3). `session.record` / `session.close` in the Index are
 * these methods. Outside a provider (e.g. Find the feeling inside the check-in) every method is a
 * no-op; embeds record their one-shot with recordToolSession instead.
 */
export interface ToolSessionApi {
  /** Client id of this session ('' outside a provider). */
  id: string;
  toolId: string;
  entry: ToolEntry;
  checkInId?: string;
  hostSessionId?: string;
  followUpId?: string;
  closeKind: CloseKind;
  /** True when the session is written to the server (signed in, inside a provider). */
  persisted: boolean;
  /** The step the user is on (sent as exitStep if they leave). */
  setStep(stepId: string): void;
  /** The active skill step began: an early exit still logs the rep. */
  markPracticed(): void;
  /** The tool reached its completion screen: leaving now closes it as completed. */
  markComplete(): void;
  /** Tool detail sent at close, namespaced by module (R18). Merged per namespace. */
  setExt(ext: SessionExt): void;
  /** The band asked on the tool's first screen (A4-4): sent with whichever close happens. */
  setBandAtStart(r: CapacityReading): void;
  /** The skills this visit practised, when not the tool's PracticeSkill.defaultFor (e.g. Cool Down's exhale). */
  setSkillIds(ids: string[]): void;
  /**
   * Emotions the person picked inside the tool (ids or display names). Sent at close; the server
   * keeps them only when the session started without any (a hand-off's are never replaced).
   */
  setEmotionIds(ids: string[]): void;
  /**
   * The urge the person picked in this visit (the tool's own graph ids). Sent with whichever close
   * happens, unless the close passes its own `urgeIds`. Ask-fresh: only a pick made in this visit,
   * never one hydrated from a saved session.
   */
  setUrgeIds(ids: string[]): void;
  /**
   * Wise mind's answer in this visit (a WiseMindAnswer id, or `own`), sent with whichever close happens.
   * Ask-fresh (layers.ts ASK_FRESH_FIELDS): only what was picked now, never read back or pre-filled.
   */
  setWiseMindAnswer(id: string | null): void;
  /** Check the Facts' "Does it fit?" in this visit (ask-fresh, like the wise mind answer). */
  setFitsFacts(v: 'fits' | 'partly' | 'doesnt_fit' | 'unsure' | null): void;
  /** Close once (later calls resolve null). Resolves null when nothing was written. */
  close(input?: ToolSessionCloseInput): Promise<CloseToolSessionResponse | null>;
  /** Route + state for handing off to another tool from inside this one. */
  linkTo(toolId: string, state?: Omit<ToolLinkState, 'spine'>): { pathname: string; state: ToolLinkState };
}

export const NO_SESSION: ToolSessionApi = {
  id: '',
  toolId: '',
  entry: 'direct',
  closeKind: 'none',
  persisted: false,
  setStep: () => {},
  markPracticed: () => {},
  markComplete: () => {},
  setExt: () => {},
  setBandAtStart: () => {},
  setSkillIds: () => {},
  setEmotionIds: () => {},
  setUrgeIds: () => {},
  setWiseMindAnswer: () => {},
  setFitsFacts: () => {},
  close: async () => null,
  linkTo: (toolId, state) => ({ pathname: `/tool/${toolId}`, state: { ...state, spine: { entry: 'handoff' } } }),
};

export const ToolSessionContext = createContext<ToolSessionApi | null>(null);

/** The surrounding tool session, or a no-op session outside a provider. */
export function useToolSession(): ToolSessionApi {
  return useContext(ToolSessionContext) ?? NO_SESSION;
}
