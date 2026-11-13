/** Profile layer callables (PR-P1). The only way the app reads profile items is getProfileContext. */
import { httpsCallable } from 'firebase/functions';
import { functions } from './firebase';
import type { ClientProfileConsumer, GetProfileContextResponse, PatternOfferAnswer, ProfileAreaId, ProfileItemMeta, QuietHours } from '../data/profileTypes';
import type { PartMessageLine, PartStats } from '../data/partsTypes';

/** getMe's item labels (functions/src/profile/me.ts). `Part` arrives only while parts are on. */
export type MeItemLabel = 'ProfileFact' | 'MyPattern' | 'OwnLine' | 'Part' | 'Person';
export interface MeItem {
  label: MeItemLabel;
  meta: ProfileItemMeta;
  title: string;
  summary: string;
  editor: 'quiet_hours' | 'please_rows' | null;
  value?: Record<string, unknown>;
  stillTrueCopy: string;
  setAsideCopy: string;
  toolId?: string | null;
  /** Part items only (functions/src/profile/me.ts `MePart`): what the Parts of me card shows. */
  part?: MePart;
}
/** Never the own-words fear, and no fears on a tender part (the server leaves them out). */
export interface MePart {
  name: string | null;
  tender: boolean;
  places: string[];
  shapeSig: number[] | null;
  jobIds: string[];
  ownJob: string | null;
  fearIds: string[];
  preferredRoleIds: string[];
  moveIds: string[];
  lastVisitedAt: string | null;
  /** The part safety flag (functions/src/safety/partSafetyFlag.ts): CrisisBanner alongside the card, never instead. */
  safety?: boolean;
  /** Active and resting parts: the readout's counts and ids (functions/src/parts/stats.ts), each line null below its threshold. */
  stats?: PartStats;
  /** Active and resting parts: the latest thing the person said to it (sayToPart). Absent from an older server. */
  told?: PartMessageLine;
}
export interface GetMeResponse {
  version: number;
  staleCount: number;
  name: { firstName: string | null };
  areas: Array<{ id: ProfileAreaId; label: string; blurb: string; items: MeItem[]; kinds: Array<{ id: string; label: string }> }>;
  readOnly: {
    foundWords: Array<{ emotionId: string; name: string | null; count: number }>;
    savedLines: Array<{ lineId: string; text: string }>;
  };
  offers: Array<{ id: string; statement: string; offerCopy: string; toolId: string | null; evidenceCount: number }>;
  /** Open PartCandidates, newest first, at most 3; empty with parts off. Absent from an older server. */
  partCandidates?: MePartCandidate[];
}
/** A part the person said they'd come back to (functions/src/profile/me.ts `MePartCandidate`). */
export interface MePartCandidate {
  id: string;
  origin: string;
  moveIds: string[];
  createdAt: string | null;
}
export interface ProfileItemRef { id: string; label: MeItemLabel }

const ctxFn = httpsCallable<{ toolId: ClientProfileConsumer }, GetProfileContextResponse>(functions, 'getProfileContext');
const meFn = httpsCallable<void, GetMeResponse>(functions, 'getMe');
const upsertFn = httpsCallable<{ kind: 'quiet_hours'; value: QuietHours }, { version: number }>(functions, 'upsertProfileFact');
const confirmFn = httpsCallable<ProfileItemRef, { version: number }>(functions, 'confirmProfileItem');
const setAsideFn = httpsCallable<ProfileItemRef, { version: number }>(functions, 'setAsideProfileItem');
const restoreFn = httpsCallable<ProfileItemRef, { version: number }>(functions, 'restoreProfileItem');
const keepFn = httpsCallable<{ kind: string; id?: string; value: unknown; sourceSessionId?: string }, { version: number; id: string }>(functions, 'keepProfileItem');
const editFn = httpsCallable<{ kind: string; id?: string; value: unknown }, { version: number }>(functions, 'editProfileItem');
const deleteFn = httpsCallable<ProfileItemRef, { version: number }>(functions, 'deleteProfileItem');
const offerFn = httpsCallable<{ id: string; answer: PatternOfferAnswer }, { version: number | null; status: string }>(functions, 'answerPatternOffer');

export async function getProfileContext(toolId: ClientProfileConsumer): Promise<GetProfileContextResponse> {
  return (await ctxFn({ toolId })).data;
}
export async function getMe(): Promise<GetMeResponse> {
  return (await meFn()).data;
}
export async function upsertQuietHours(value: QuietHours): Promise<number> {
  return (await upsertFn({ kind: 'quiet_hours', value })).data.version;
}
export async function confirmProfileItem(ref: ProfileItemRef): Promise<number> {
  return (await confirmFn(ref)).data.version;
}
export async function setAsideProfileItem(ref: ProfileItemRef): Promise<number> {
  return (await setAsideFn(ref)).data.version;
}
export async function restoreProfileItem(ref: ProfileItemRef): Promise<number> {
  return (await restoreFn(ref)).data.version;
}
/**
 * Keep a profile item on the person's tap (the kind registry, functions/src/profile/kinds.ts). One-per-person
 * kinds ignore `id`; others need a client UUID. `sourceSessionId` is the visit it was kept in.
 */
export async function keepProfileItem(input: { kind: string; id?: string; value: unknown; sourceSessionId?: string }): Promise<{ version: number; id: string }> {
  return (await keepFn(input)).data;
}
export async function editProfileItem(input: { kind: string; id?: string; value: unknown }): Promise<number> {
  return (await editFn(input)).data.version;
}
/** "Delete this" in Me (behind a two-step confirm). */
export async function deleteProfileItem(ref: ProfileItemRef): Promise<number> {
  return (await deleteFn(ref)).data.version;
}
export async function answerPatternOffer(id: string, answer: PatternOfferAnswer): Promise<{ version: number | null; status: string }> {
  return (await offerFn({ id, answer })).data;
}
