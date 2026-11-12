/**
 * Pure rules for "Recover from a hurtful moment". Thresholds come from the graph's flow document
 * (flow.gates); functions/src/invalidationRecoveryValidation.ts mirrors gateFor() on the
 * server and tests/invalidation-recovery.test.mjs asserts the two agree.
 */
import type { ExitId, Gate, Pull, RecoveryGates, InvalidationEvent, Zone } from '../data/invalidationRecoveryTypes';

export function gateFor(intensity: number, pull: Pull, state: Pick<InvalidationEvent, 'highRisk' | 'lowArousal'>, g: RecoveryGates): Gate {
  if (pull === 'freeze') return 'orient'; // shutdown never gets a calming routine
  if (intensity >= g.downshiftAt && pull === 'hide') return 'orient';
  if (intensity >= g.downshiftAt && (pull === 'fight' || pull === 'chase')) {
    return intensity >= g.coldAt || state.highRisk ? 'downshift-cold' : 'downshift';
  }
  if (state.lowArousal && pull === 'hide' && intensity >= g.orientLowArousalAt) return 'orient';
  return 'none';
}

/** Low-arousal pulls unlock by moving, never by calming. */
export const needsOrienting = (pull: Pull) => pull === 'hide' || pull === 'freeze';

/** Fill {key} placeholders in graph copy. Unknown keys are left visible so gaps show up in review. */
export function fill(template: string, vars: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (m, k) => (k in vars ? String(vars[k]) : m));
}

/**
 * Validation lines use {N} for distanced self-talk ("Sam, …") and {phrase} for the state.
 * With no name, the line is rewritten in second person.
 */
export function renderValidationLine(line: string, name: string | null, phrase: string): string {
  const s = line.replaceAll('{phrase}', phrase);
  if (name?.trim()) return s.replaceAll('{N}', name.trim());
  const you = s
    .replace(/^\{N\}, /, '')
    .replaceAll("{N}'s", 'your')
    .replaceAll('{N} is', 'you are')
    .replaceAll('{N} can', 'you can')
    .replaceAll('{N} chooses', 'you choose')
    .replaceAll('{N} gets', 'you get')
    .replaceAll('{N}', 'you');
  // Capitalise sentence starts that were "{N}…" ("… sense. you can" → "… sense. You can").
  return you.replace(/(^|[.!?]\s+)([a-z])/g, (_, lead: string, ch: string) => lead + ch.toUpperCase());
}

export function certaintyZone(pct: number, repeated: boolean, g: Pick<RecoveryGates, 'certaintyReal' | 'certaintyBoth'>): Zone {
  if (pct >= g.certaintyReal && repeated) return 'real';
  if (pct >= g.certaintyBoth) return 'both';
  return 'check';
}

export type LockReason = 'unsafe' | 'refused' | 'deliberate';
/** `hot`: the ask is open, with a heads-up that it may come out louder than meant (IE-B4: never a lock). */
export interface ExitOption { id: ExitId; lock: LockReason | null; recommended: boolean; hot: boolean }

export interface RouteInput {
  state: Pick<InvalidationEvent, 'id' | 'protocol' | 'highRisk'>;
  pull: Pull;
  intensityNow: number;
  safe: 'yes' | 'no';
  asks: 0 | 1 | 2;
  zone: Zone | null;
  gates: Pick<RecoveryGates, 'askMax'>;
}

/**
 * Order the exits for this moment. The first usable one is recommended.
 * Asking is locked only for unsafe people, after two refusals, or against deliberate
 * caricature. Above askMax it stays open with a heads-up (`hot`) and the body first on offer;
 * the ask's own cooling screen (One message) does the rest (IE-B4 dropped the soft lock).
 */
export function routeExits(r: RouteInput): ExitOption[] {
  const hardLock: LockReason | null =
    r.safe === 'no' ? 'unsafe'
      : r.asks >= 2 ? 'refused'
        : r.state.highRisk && r.zone === 'real' ? 'deliberate'
          : null;
  const hot = r.intensityNow > r.gates.askMax;

  let order: ExitId[];
  // A hard-locked ask stays visible (with its reason) so the user knows why it isn't offered.
  if (hardLock) order = r.state.protocol === 'blocked_wronged' ? ['land', 'park', 'opposite', 'ask'] : ['land', 'opposite', 'ask'];
  else if (r.state.id === 'blocked') order = ['prefer', 'ask', 'opposite'];
  else if (r.state.id === 'stewing') order = ['park', 'land', 'ask'];
  else if (r.state.protocol === 'diminished_self') order = ['opposite', 'land', 'ask'];
  else if (r.state.protocol === 'attachment_alarm') order = ['opposite', 'ask', 'land'];
  else if (r.pull === 'fight') order = hot ? ['opposite', 'ask', 'land'] : ['ask', 'opposite', 'land'];
  else order = ['ask', 'land', 'opposite'];

  const options = order.map(id => ({ id, lock: id === 'ask' ? hardLock : null, recommended: false, hot: id === 'ask' && !hardLock && hot }));
  const first = options.find(o => !o.lock);
  if (first) first.recommended = true;
  return options;
}

// ── Practice (gamification) ─────────────────────────────────────────────────
/** Uses needed to reach each mastery level. Streak-free by design: nothing decays. */
export const MASTERY_STEPS = [1, 3, 7, 15, 30] as const;

export function masteryOf(uses = 0) {
  const level = MASTERY_STEPS.filter(t => uses >= t).length;
  const next = MASTERY_STEPS[level] ?? null;
  const prev = level === 0 ? 0 : MASTERY_STEPS[level - 1];
  return { level, next, toNext: next === null ? 0 : next - uses, frac: next === null ? 1 : (uses - prev) / (next - prev) };
}

/** Sessions in the last 7 days (rolling), for the reps ring. */
export function repsInLastWeek(createdAt: string[], now = Date.now()): number {
  const since = now - 7 * 86_400_000;
  return createdAt.filter(t => Date.parse(t) >= since).length;
}
