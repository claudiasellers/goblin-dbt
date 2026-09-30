/** Profile layer callables (PR-P1). The only way the app reads profile items is getProfileContext. */
import { httpsCallable } from 'firebase/functions';
import { functions } from './firebase';
import type { ClientProfileConsumer, GetProfileContextResponse, PatternOfferAnswer, ProfileAreaId, ProfileItemMeta, QuietHours } from '../data/profileTypes';

export interface MeItem {
  label: 'ProfileFact' | 'MyPattern';
  meta: ProfileItemMeta;
  title: string;
  summary: string;
  editor: 'quiet_hours' | null;
  value?: Record<string, unknown>;
  stillTrueCopy: string;
  setAsideCopy: string;
  toolId?: string | null;
}
export interface GetMeResponse {
  version: number;
  staleCount: number;
  name: { firstName: string | null };
  areas: Array<{ id: ProfileAreaId; label: string; blurb: string; items: MeItem[]; kinds: Array<{ id: string; label: string }> }>;
  readOnly: { foundWords: Array<{ emotionId: string; name: string | null; count: number }> };
  offers: Array<{ id: string; statement: string; offerCopy: string; toolId: string | null; evidenceCount: number }>;
}
export interface ProfileItemRef { id: string; label: 'ProfileFact' | 'MyPattern' }

const ctxFn = httpsCallable<{ toolId: ClientProfileConsumer }, GetProfileContextResponse>(functions, 'getProfileContext');
const meFn = httpsCallable<void, GetMeResponse>(functions, 'getMe');
const upsertFn = httpsCallable<{ kind: 'quiet_hours'; value: QuietHours }, { version: number }>(functions, 'upsertProfileFact');
const confirmFn = httpsCallable<ProfileItemRef, { version: number }>(functions, 'confirmProfileItem');
const setAsideFn = httpsCallable<ProfileItemRef, { version: number }>(functions, 'setAsideProfileItem');
const restoreFn = httpsCallable<ProfileItemRef, { version: number }>(functions, 'restoreProfileItem');
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
export async function answerPatternOffer(id: string, answer: PatternOfferAnswer): Promise<{ version: number | null; status: string }> {
  return (await offerFn({ id, answer })).data;
}
