import { useCallback, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useProfileContext } from './useProfileContext';
import { profileCache } from '../lib/profileCache';
import { kitHasCards, kitCardCount, type KeptKit } from '../lib/crisisKit';
import { PLAN_KEY, devicePlanFor, planFromSlice, planHas, toKeep, type DevicePlan, type SafetyPlan } from '../lib/safetyPlan';
import { keepProfileItem } from '../services/profile';
import { scheduleSafetyPlanReview } from '../services/safety';
import type { SafetyPlanCopy } from '../data/safetyTypes';

export type PlanSaved = 'account' | 'device' | 'failed';

export interface SafetyPlanState {
  /** 'loading' until the account read answers (signed in); signed out it's ready at once. */
  status: 'loading' | 'ready';
  /** The account's plan signed in, else this device's (for this uid); null when there's none. */
  plan: SafetyPlan | null;
  /** Whether `plan` is the account's (false: this device's copy). */
  onAccount: boolean;
  /** A device copy the person could move to their account: signed in, the account read done, the account has none. */
  devicePlan: SafetyPlan | null;
  /** How many cards the person's crisis kit holds (step 2), 0 when none or signed out. */
  kitCards: number;
  /**
   * Save the plan. Signed in: kept on the account (a re-save replaces it), the device copy cleared; the month-on review is
   * booked for a first plan and for a save from a review (`review: true`), never for every edit. Signed out, or when
   * the account save fails, it stays on this device under this uid.
   */
  save(plan: SafetyPlan, copy: SafetyPlanCopy, opts?: { review?: boolean }): Promise<PlanSaved>;
}

function readDevice(uid: string | null): DevicePlan | null {
  try { const v = localStorage.getItem(PLAN_KEY); return v ? devicePlanFor(JSON.parse(v), uid) : null; } catch { return null; }
}
function writeDevice(uid: string | null, plan: SafetyPlan): boolean {
  try { localStorage.setItem(PLAN_KEY, JSON.stringify({ owner: uid, plan })); return true; } catch { return false; }
}
function clearDevice(): void {
  try { localStorage.removeItem(PLAN_KEY); } catch { /* private mode */ }
}

/**
 * The person's safety plan (CORE-02): the `safetyPlan` slice signed in (the one read path), this device's copy
 * otherwise. A device copy still shows signed in until the account has a plan, so someone who made it signed out (or
 * whose save didn't reach the server) never loses sight of it.
 */
export function useSafetyPlan(): SafetyPlanState {
  const { user } = useAuth();
  const uid = user?.uid ?? null;
  const ctx = useProfileContext('safety');
  const [saved, setSaved] = useState<SafetyPlan | null>(null);
  const [device, setDevice] = useState<{ uid: string | null; d: DevicePlan | null }>(() => ({ uid, d: readDevice(uid) }));
  const deviceNow = device.uid === uid ? device.d : readDevice(uid);

  const sliced = ctx.slices ? planFromSlice(ctx.slices.safetyPlan) : null;
  const account = saved ?? sliced;
  const hadAccount = !!sliced;
  const kit = (ctx.slices?.crisisKit ?? null) as KeptKit | null;
  const kitCards = kitHasCards(kit) ? kitCardCount(kit as Record<string, unknown>) : 0;
  const status: SafetyPlanState['status'] = !user || ctx.status === 'ready' || ctx.status === 'error' || saved ? 'ready' : 'loading';

  const save = useCallback(async (plan: SafetyPlan, copy: SafetyPlanCopy, opts: { review?: boolean } = {}): Promise<PlanSaved> => {
    if (!planHas(plan)) return 'failed';
    if (!uid) {
      if (!writeDevice(null, plan)) return 'failed';
      setDevice({ uid, d: { owner: null, plan } });
      return 'device';
    }
    try {
      const r = await keepProfileItem({ kind: 'safety_plan', value: toKeep(plan, copy) });
      profileCache.bump(r.version);
      setSaved(plan);
      clearDevice();
      setDevice({ uid, d: null });
      if (!hadAccount || opts.review) void scheduleSafetyPlanReview().catch(() => { /* offline: no review card */ });
      return 'account';
    } catch {
      // Kept on this device for this account only (cleared on sign-out), so it still opens tonight.
      writeDevice(uid, plan);
      setDevice({ uid, d: { owner: uid, plan } });
      return 'failed';
    }
  }, [uid, hadAccount]);

  const plan = account ?? deviceNow?.plan ?? null;
  return {
    status,
    plan,
    onAccount: !!account,
    devicePlan: user && ctx.status === 'ready' && !account && deviceNow ? deviceNow.plan : null,
    kitCards,
    save,
  };
}
