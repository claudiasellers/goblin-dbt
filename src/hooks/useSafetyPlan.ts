import { useCallback, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useProfileContext } from './useProfileContext';
import { profileCache } from '../lib/profileCache';
import { kitHasCards, kitCardCount, type KeptKit } from '../lib/crisisKit';
import { PLAN_KEY, planFromJson, planFromSlice, planHas, toKeep, type SafetyPlan } from '../lib/safetyPlan';
import { keepProfileItem } from '../services/profile';
import { scheduleSafetyPlanReview } from '../services/safety';
import type { SafetyPlanCopy } from '../data/safetyTypes';

export type PlanSaved = 'account' | 'device' | 'failed';

export interface SafetyPlanState {
  /** 'loading' until the account read answers (signed in); signed out it's ready at once. */
  status: 'loading' | 'ready';
  /** The account's plan signed in, else this device's; null when there's none. */
  plan: SafetyPlan | null;
  /** A plan kept on this device while signed out, when the account has none (offered to move). */
  devicePlan: SafetyPlan | null;
  /** How many cards the person's crisis kit holds (step 2), 0 when none or signed out. */
  kitCards: number;
  save(plan: SafetyPlan, copy: SafetyPlanCopy): Promise<PlanSaved>;
}

function readDevice(): SafetyPlan | null {
  try { const v = localStorage.getItem(PLAN_KEY); return v ? planFromJson(JSON.parse(v)) : null; } catch { return null; }
}
function writeDevice(p: SafetyPlan): boolean {
  try { localStorage.setItem(PLAN_KEY, JSON.stringify(p)); return true; } catch { return false; }
}
function clearDevice(): void {
  try { localStorage.removeItem(PLAN_KEY); } catch { /* private mode */ }
}

/**
 * The person's safety plan (CORE-02): the `safetyPlan` slice signed in (the one read path), this device's copy signed
 * out. Saving signed in keeps `safety_plan` (one per person, a re-save replaces it), books the month-on review and
 * clears the device copy; signed out, or when the save fails, it stays on the device.
 */
export function useSafetyPlan(): SafetyPlanState {
  const { user } = useAuth();
  const ctx = useProfileContext('safety');
  const [saved, setSaved] = useState<SafetyPlan | null>(null);
  const [device, setDevice] = useState<SafetyPlan | null>(() => readDevice());

  const account = saved ?? (ctx.slices ? planFromSlice(ctx.slices.safetyPlan) : null);
  const kit = (ctx.slices?.crisisKit ?? null) as KeptKit | null;
  const kitCards = kitHasCards(kit) ? kitCardCount(kit as Record<string, unknown>) : 0;
  const status: SafetyPlanState['status'] = !user || ctx.status === 'ready' || ctx.status === 'error' || saved ? 'ready' : 'loading';

  const save = useCallback(async (plan: SafetyPlan, copy: SafetyPlanCopy): Promise<PlanSaved> => {
    if (!planHas(plan)) return 'failed';
    if (!user) {
      if (!writeDevice(plan)) return 'failed';
      setDevice(plan);
      return 'device';
    }
    try {
      const r = await keepProfileItem({ kind: 'safety_plan', value: toKeep(plan, copy) });
      profileCache.bump(r.version);
      setSaved(plan);
      clearDevice();
      setDevice(null);
      void scheduleSafetyPlanReview().catch(() => { /* offline: no review card */ });
      return 'account';
    } catch {
      writeDevice(plan);
      setDevice(plan);
      return 'failed';
    }
  }, [user]);

  const plan = user ? (account ?? (ctx.status === 'error' ? device : null)) : device;
  return { status, plan, devicePlan: user && !account ? device : null, kitCards, save };
}
