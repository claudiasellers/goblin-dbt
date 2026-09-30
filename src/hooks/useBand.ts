import { createContext, useContext } from 'react';
import type { CapacityContent, CapacityReading } from '../data/capacityTypes';
import type { RecordInput } from '../lib/bandStore';

export type BandContentStatus = 'idle' | 'loading' | 'ready' | 'error';

/**
 * The capacity band (ER-01, E3 §A4.2.5). `band.current()` is client-only (R1): the latest `now`
 * reading, fresh for 20 minutes, cleared on sign-out.
 */
export interface BandApi {
  /** Probe + hand-off copy, primitives and band rules (getCapacityContent); null until loaded. */
  content: CapacityContent | null;
  status: BandContentStatus;
  /** Start loading the content (idempotent; a failed load can be retried). */
  load(): void;
  /** The current reading (framing `now`, ≤ freshMinutes old), or null. */
  current(now?: number): CapacityReading | null;
  /** Record an answer; a `now` reading becomes current. Returns the reading (to send with the host record). */
  record(input: RecordInput): CapacityReading;
  /** The current reading carried into `context` (a new `carried` reading), or null when none is current. */
  carry(context: string, hostSessionId?: string): CapacityReading | null;
  /** Forget the current reading. */
  clear(): void;
}

const noop: BandApi = {
  content: null,
  status: 'idle',
  load: () => {},
  current: () => null,
  record: () => { throw new Error('useBand: no BandProvider'); },
  carry: () => null,
  clear: () => {},
};

export const BandContext = createContext<BandApi | null>(null);

/** The band store. Outside a provider it holds nothing (and `record` throws: mount BandProvider). */
export function useBand(): BandApi {
  return useContext(BandContext) ?? noop;
}
