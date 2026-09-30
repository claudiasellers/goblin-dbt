/**
 * The routing band (plan E4-3, ruling R1). Pure. The request's band is the check-in's own answer
 * (probe, FTF, or a reading carried ≤ 20 min client-side); the server never reads an earlier band.
 * Without one, the band is inferred: `flooded` for the policy's flooded patterns, else the
 * policy's default (`stirred`). Numeric intensity is never turned into a band.
 */
import type { Band, RoutingBandSource, RoutingPolicy } from './types';

export const DEFAULT_BAND_POLICY: Pick<RoutingPolicy, 'defaultBand' | 'floodedPatterns'> = {
  defaultBand: 'stirred',
  floodedPatterns: ['emotional_flooding'],
};

export function resolveBand(
  req: { band?: Band; bandSource?: Exclude<RoutingBandSource, 'inferred'> },
  patternId: string,
  policy: Pick<RoutingPolicy, 'defaultBand' | 'floodedPatterns'> | null | undefined,
): { band: Band; bandSource: RoutingBandSource } {
  if (req.band) return { band: req.band, bandSource: req.bandSource ?? 'probe' };
  const p = policy ?? DEFAULT_BAND_POLICY;
  return { band: p.floodedPatterns.includes(patternId) ? 'flooded' : p.defaultBand, bandSource: 'inferred' };
}
