import { useEffect, useRef, useState } from 'react';
import type { CapacityReading, ProbeWording } from '../../data/capacityTypes';
import { useBand } from '../../hooks/useBand';
import { gateDecision } from '../../lib/bandStore';
import { CapacityProbe } from './CapacityProbe';
import { linkButton, secondaryText } from '../tools/oppositeAction/styles';

/**
 * How the gate resolved: `carried` (a current reading was reused, nothing asked), `asked` (the probe
 * was answered), or `unavailable` (the content couldn't load: the host continues without a band,
 * never blocked).
 */
export type BandGateHow = 'carried' | 'asked' | 'unavailable';

/**
 * `band.ask()` (E3 §A4.2.5). With a current reading and no `force`, the reading is carried into
 * `context` and nothing renders. Otherwise the probe renders and the answer is recorded.
 * `reaskIfFlooded` (D-07): a carried `flooded` is asked again, once, instead of carried.
 */
export function BandGate({ context, wording = 'default', personLabel, force, reaskIfFlooded, hostSessionId, allowCantTell = true, onBand }: {
  context: string;
  wording?: ProbeWording;
  personLabel?: string | null;
  force?: boolean;
  reaskIfFlooded?: boolean;
  hostSessionId?: string;
  allowCantTell?: boolean;
  onBand: (reading: CapacityReading | null, how: BandGateHow) => void;
}) {
  const band = useBand();
  const decided = useRef(false);
  // Decide once, at mount: a reading recorded by this gate must not flip it into "carry".
  const [decision] = useState(() => gateDecision(band.current(), { force, reaskIfFlooded }));

  useEffect(() => {
    if (decided.current || decision !== 'carry') return;
    const r = band.carry(context, hostSessionId);
    if (!r) return; // expired between render and effect: the probe renders below
    decided.current = true;
    onBand(r, 'carried');
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => { band.load(); }, [band]);

  if (decision === 'carry' && band.current()) return null;
  if (!band.content) {
    if (band.status === 'error') {
      return (
        <div className="space-y-2">
          <p className={secondaryText}>Couldn't load this question.</p>
          <button type="button" className={linkButton} onClick={() => { decided.current = true; onBand(null, 'unavailable'); }}>
            Continue
          </button>
        </div>
      );
    }
    return <div className="py-8 grid place-items-center" aria-busy="true"><span className="sr-only">Loading</span>
      <span className="inline-block w-6 h-6 border-4 border-[var(--color-border)] border-t-[var(--color-accent)] rounded-full motion-safe:animate-spin" aria-hidden="true" /></div>;
  }
  return (
    <CapacityProbe probe={band.content.probe} wording={wording} personLabel={personLabel} allowCantTell={allowCantTell}
      onAnswer={(value, viaCantTell) => {
        if (decided.current) return;
        decided.current = true;
        const r = band.record({ value, viaCantTell, source: 'probe', framing: 'now', wording, context, hostSessionId });
        onBand(r, 'asked');
      }} />
  );
}
