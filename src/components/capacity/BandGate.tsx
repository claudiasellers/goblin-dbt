import { useEffect, useRef, useState } from 'react';
import type { CapacityReading } from '../../data/capacityTypes';
import { useBand } from '../../hooks/useBand';
import { gateDecision } from '../../lib/bandStore';

/**
 * How the gate resolved: `carried` (a current reading was reused) or `notAsked` (no current reading,
 * or a flooded one the host wanted re-asked: the host continues without a band, never blocked).
 */
export type BandGateHow = 'carried' | 'notAsked';

/**
 * `band.ask()` (E3 §A4.2.5), without the question. The capacity probe ("If someone asked you for a
 * favour right now…") is out (Claudia, 30 Sep) until there is a better way to ask it, so the gate
 * never renders anything: a current reading is carried into `context`, otherwise the host goes on
 * with no band. `force` and `reaskIfFlooded` (D-07) used to mean "ask again"; with nothing to ask,
 * they mean "don't carry" (a stale flooded must not set the host's band without the user saying so).
 */
export function BandGate({ context, force, reaskIfFlooded, hostSessionId, onBand }: {
  context: string;
  force?: boolean;
  reaskIfFlooded?: boolean;
  hostSessionId?: string;
  onBand: (reading: CapacityReading | null, how: BandGateHow) => void;
}) {
  const band = useBand();
  const decided = useRef(false);
  // Decide once, at mount.
  const [decision] = useState(() => gateDecision(band.current(), { force, reaskIfFlooded }));

  useEffect(() => {
    if (decided.current) return;
    decided.current = true;
    const r = decision === 'carry' ? band.carry(context, hostSessionId) : null;
    onBand(r, r ? 'carried' : 'notAsked');
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return null;
}
