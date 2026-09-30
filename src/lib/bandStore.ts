/**
 * The client band store (E3 §A4.2.5, ruling R1). Pure helpers behind BandProvider: making a reading,
 * carrying it into another context, and persisting the latest `now` reading in sessionStorage.
 *
 * `band.current()` is client-only: memory + sessionStorage (`goblin.band.v1`), fresh for 20 minutes,
 * owned by the signed-in uid (or null when signed out), cleared on sign-out. Nothing here reads the
 * server's log; the server only ever receives a reading on the record that asked.
 */
import type {
  Band, BandFraming, BandSource, CapacityContent, CapacityReading, HandoffResult, ProbeWording,
} from '../data/capacityTypes';
import { BANDS } from '../data/capacityTypes';
import { isCurrent } from './band';

export const BAND_STORE_KEY = 'goblin.band.v1';
export const PROBE_VERSION = 'capacity-v1';
/** Used until content loads (the graph's CapacityProbe.freshMinutes wins once it has). */
export const DEFAULT_FRESH_MINUTES = 20;

export interface RecordInput {
  value: Band;
  viaCantTell?: boolean;
  source: BandSource;
  framing?: BandFraming;
  wording?: ProbeWording;
  context: string;
  hostSessionId?: string;
  carriedFrom?: CapacityReading['carriedFrom'];
}

/** A reading from an answer. "I can't tell" always reads as stirred (D-07). */
export function makeReading(input: RecordInput, id: string, now: Date): CapacityReading {
  const r: CapacityReading = {
    id,
    value: input.viaCantTell ? 'stirred' : input.value,
    viaCantTell: input.viaCantTell === true,
    source: input.source,
    framing: input.framing ?? 'now',
    wording: input.wording ?? 'default',
    context: input.context,
    probeVersion: PROBE_VERSION,
    at: now.toISOString(),
  };
  if (input.hostSessionId) r.hostSessionId = input.hostSessionId;
  if (input.carriedFrom) r.carriedFrom = input.carriedFrom;
  return r;
}

/**
 * The same answer carried into another context (the one sanctioned ask-fresh carry). The carried
 * reading is new (own id, own time) and points at the one the user gave; the server checks the gap
 * is within `freshMinutes`. Carrying a carried reading points at the original answer.
 */
export function carryReading(
  from: CapacityReading,
  target: { context: string; hostSessionId?: string; source?: 'carried' | 'handoff' },
  id: string,
  now: Date,
): CapacityReading {
  const origin = from.carriedFrom ?? { readingId: from.id, context: from.context, at: from.at };
  return makeReading({
    value: from.value,
    viaCantTell: from.viaCantTell,
    source: target.source ?? 'carried',
    framing: 'now',
    wording: from.wording,
    context: target.context,
    hostSessionId: target.hostSessionId,
    carriedFrom: origin,
  }, id, now);
}

/**
 * Whether a gate carries the current reading or asks. D-07: a carried `flooded` is re-asked once
 * (a lot can change in 15 minutes, and a stale `flooded` would open the hand-off unasked).
 */
export function gateDecision(
  current: CapacityReading | null,
  opts: { force?: boolean; reaskIfFlooded?: boolean },
): 'carry' | 'ask' | 'reask' {
  if (opts.force || !current) return 'ask';
  if (opts.reaskIfFlooded && current.value === 'flooded') return 'reask';
  return 'carry';
}

// ---- sessionStorage persistence ----

type StorageLike = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;

interface Stored { v: 1; owner: string | null; reading: CapacityReading }

function isReading(x: unknown): x is CapacityReading {
  if (!x || typeof x !== 'object') return false;
  const r = x as Record<string, unknown>;
  return typeof r.id === 'string' && BANDS.includes(r.value as Band) && typeof r.source === 'string'
    && typeof r.context === 'string' && typeof r.at === 'string' && !Number.isNaN(Date.parse(r.at))
    && typeof r.framing === 'string';
}

export function sessionStore(): StorageLike | null {
  try {
    return typeof window !== 'undefined' ? window.sessionStorage : null;
  } catch {
    return null;
  }
}

/** The stored reading for this owner (null for another owner, a malformed value or no storage). */
export function readStored(storage: StorageLike | null, owner: string | null): CapacityReading | null {
  if (!storage) return null;
  try {
    const raw = storage.getItem(BAND_STORE_KEY);
    if (!raw) return null;
    const s = JSON.parse(raw) as Stored;
    if (s?.v !== 1 || s.owner !== owner || !isReading(s.reading)) return null;
    return s.reading;
  } catch {
    return null;
  }
}

export function writeStored(storage: StorageLike | null, owner: string | null, reading: CapacityReading): void {
  if (!storage) return;
  try {
    storage.setItem(BAND_STORE_KEY, JSON.stringify({ v: 1, owner, reading } satisfies Stored));
  } catch {
    /* storage full or blocked: memory still holds it */
  }
}

export function clearStored(storage: StorageLike | null): void {
  if (!storage) return;
  try {
    storage.removeItem(BAND_STORE_KEY);
  } catch {
    /* nothing to clear */
  }
}

/** The fresher of two readings that is still current (memory vs storage after a reload). */
export function freshest(a: CapacityReading | null, b: CapacityReading | null, now: number, freshMinutes: number): CapacityReading | null {
  const ok = [a, b].filter((r): r is CapacityReading => isCurrent(r, now, freshMinutes));
  ok.sort((x, y) => Date.parse(y.at) - Date.parse(x.at));
  return ok[0] ?? null;
}

// ---- hand-off results onto the host session (ToolSession.ext.er.handoffs, R18) ----

export interface HandoffExtEntry {
  primitiveId?: string;
  completed?: boolean;
  durationSec?: number;
  thenVsNow?: string;
  resumed?: boolean;
  overridden?: boolean;
}

/**
 * `ext.er.handoffs[]` for the host's ToolSession: one entry per primitive run (the last one of each
 * hand-off carries its reread and whether the user resumed), or a bare entry for "keep going
 * anyway". At most 4 entries (the registered schema's cap); the latest are kept.
 */
export function handoffExt(results: HandoffResult[]): HandoffExtEntry[] {
  const out: HandoffExtEntry[] = [];
  for (const r of results) {
    const tail: HandoffExtEntry = { resumed: r.resumed, overridden: r.overridden };
    if (r.thenVsNow) tail.thenVsNow = r.thenVsNow;
    if (r.primitivesRun.length === 0) {
      out.push(tail);
      continue;
    }
    r.primitivesRun.forEach((p, i) => {
      const e: HandoffExtEntry = { primitiveId: p.id, completed: p.completed, durationSec: Math.max(0, Math.min(3600, Math.round(p.durationSec))) };
      out.push(i === r.primitivesRun.length - 1 ? { ...e, ...tail } : e);
    });
  }
  return out.slice(-4);
}

/** The probe prompt for a wording: relational uses the person's label, else the "someone" form (IE PRD). */
export function probePrompt(probe: CapacityContent['probe'], wording: ProbeWording, personLabel?: string | null): string {
  const w = probe.wordings[wording] ?? probe.wordings.default;
  if (wording !== 'relational') return w.prompt;
  const label = personLabel?.trim();
  return label ? w.prompt.replace(/\{label\}/g, label) : (w.someone ?? w.prompt);
}
