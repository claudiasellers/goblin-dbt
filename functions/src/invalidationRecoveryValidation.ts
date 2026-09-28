/**
 * Input validation for "Recover from a hurtful moment" sessions. Shape and range checks only:
 * clinical content, ids and routing are verified against the graph in the callable.
 * No free text is accepted — drafted messages never leave the device.
 */
export interface InvalidationRecoverySessionInput {
  schemaVersion: 1;
  id: string;
  contentVersion: string;
  stateId: string;
  pull: 'fight' | 'chase' | 'hide' | 'freeze';
  gate: 'downshift' | 'downshift-cold' | 'orient' | 'none';
  emotionId: string;
  needId: string;
  exitId: 'ask' | 'land' | 'opposite' | 'park' | 'prefer';
  zone: 'real' | 'both' | 'check' | null;
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

const PULLS = ['fight', 'chase', 'hide', 'freeze'] as const;
const GATES = ['downshift', 'downshift-cold', 'orient', 'none'] as const;
const EXITS = ['ask', 'land', 'opposite', 'park', 'prefer'] as const;
const ZONES = ['real', 'both', 'check'] as const;
const FOLLOW_UPS = ['tomorrow', 'rehearse', 'experiment'] as const;
const ID = /^[a-z][a-z0-9_-]{0,63}$/;
const UUID = /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i;

const isScore = (v: unknown): v is number =>
  typeof v === 'number' && Number.isInteger(v) && v >= 0 && v <= 10;

function oneOf<T extends string>(values: readonly T[], v: unknown, key: string): T {
  if (typeof v !== 'string' || !(values as readonly string[]).includes(v)) throw new Error(`Invalid ${key}`);
  return v as T;
}

function id(v: unknown, key: string): string {
  if (typeof v !== 'string' || !ID.test(v)) throw new Error(`Invalid ${key}`);
  return v;
}

function uniqueIds(v: unknown, key: string, max: number, allowed?: readonly string[]): string[] {
  if (!Array.isArray(v) || v.length > max) throw new Error(`Invalid ${key}`);
  const out = v.map(x => (allowed ? oneOf(allowed, x, key) : id(x, key)));
  if (new Set(out).size !== out.length) throw new Error(`Duplicate ${key}`);
  return out;
}

export function validateInvalidationRecoverySession(input: unknown): InvalidationRecoverySessionInput {
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw new Error('Expected a session');
  const raw = input as Record<string, unknown>;
  if (raw.schemaVersion !== 1) throw new Error('Invalid schema version');
  if (typeof raw.id !== 'string' || !UUID.test(raw.id)) throw new Error('Invalid session ID');
  if (typeof raw.contentVersion !== 'string' || raw.contentVersion.length > 40) throw new Error('Invalid content version');

  for (const k of ['startIntensity', 'startUrge', 'endIntensity', 'endUrge']) {
    if (!isScore(raw[k])) throw new Error(`Invalid ${k}`);
  }
  // readings = start, any mid-session re-rates, end (the urge wave). 2–8 points.
  if (!Array.isArray(raw.readings) || raw.readings.length < 2 || raw.readings.length > 8 || !raw.readings.every(isScore)) {
    throw new Error('Invalid readings');
  }
  if (raw.readings[0] !== raw.startIntensity || raw.readings[raw.readings.length - 1] !== raw.endIntensity) {
    throw new Error('Readings must start and end with the session intensities');
  }
  const zone = raw.zone === null ? null : oneOf(ZONES, raw.zone, 'zone');
  const safe = raw.safe === null ? null : oneOf(['yes', 'no'] as const, raw.safe, 'safe');
  if (!(raw.asks === null || raw.asks === 0 || raw.asks === 1 || raw.asks === 2)) throw new Error('Invalid asks');
  const exitId = oneOf(EXITS, raw.exitId, 'exitId');
  // Asking is never valid without the safety answers that gate it.
  if (exitId === 'ask' && (safe !== 'yes' || raw.asks === null || raw.asks === 2)) {
    throw new Error('Ask exit requires a safe person who has not refused twice');
  }

  return {
    schemaVersion: 1,
    id: raw.id,
    contentVersion: raw.contentVersion,
    stateId: id(raw.stateId, 'stateId'),
    pull: oneOf(PULLS, raw.pull, 'pull'),
    gate: oneOf(GATES, raw.gate, 'gate'),
    emotionId: id(raw.emotionId, 'emotionId'),
    needId: id(raw.needId, 'needId'),
    exitId,
    zone,
    safe,
    asks: raw.asks as 0 | 1 | 2 | null,
    startIntensity: raw.startIntensity as number,
    startUrge: raw.startUrge as number,
    readings: raw.readings as number[],
    endIntensity: raw.endIntensity as number,
    endUrge: raw.endUrge as number,
    skills: uniqueIds(raw.skills, 'skills', 25),
    followUps: uniqueIds(raw.followUps, 'followUps', FOLLOW_UPS.length, FOLLOW_UPS),
  };
}

export interface RecoveryGates { downshiftAt: number; coldAt: number; askMax: number; orientLowArousalAt: number }

/** Server mirror of gateFor() in src/lib/invalidationRecovery.ts; tests assert the two agree. */
export function expectedRecoveryGate(
  intensity: number,
  pull: string,
  state: { highRisk: boolean; lowArousal: boolean },
  g: RecoveryGates,
): 'downshift' | 'downshift-cold' | 'orient' | 'none' {
  if (pull === 'freeze') return 'orient';
  if (intensity >= g.downshiftAt && pull === 'hide') return 'orient';
  if (intensity >= g.downshiftAt && (pull === 'fight' || pull === 'chase')) {
    return intensity >= g.coldAt || state.highRisk ? 'downshift-cold' : 'downshift';
  }
  if (state.lowArousal && pull === 'hide' && intensity >= g.orientLowArousalAt) return 'orient';
  return 'none';
}

