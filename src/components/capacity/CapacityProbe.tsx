import type { Band, CapacityContent, ProbeWording } from '../../data/capacityTypes';
import { BANDS } from '../../data/capacityTypes';
import { probePrompt } from '../../lib/bandStore';
import { choiceButton, linkButton } from '../tools/oppositeAction/styles';

/**
 * The capacity probe (ER-01): a relational question with three answers and "I can't tell".
 * One tap. No number anywhere. 48 px targets; the bubble's entrance respects reduced motion.
 */
export function CapacityProbe({ probe, wording = 'default', personLabel, allowCantTell = true, onAnswer }: {
  probe: CapacityContent['probe'];
  wording?: ProbeWording;
  personLabel?: string | null;
  allowCantTell?: boolean;
  onAnswer: (value: Band, viaCantTell: boolean) => void;
}) {
  const w = probe.wordings[wording] ?? probe.wordings.default;
  return (
    <div className="space-y-4" data-testid="capacity-probe">
      <div role="status"
        className="motion-safe:animate-[stepEnter_300ms_ease-out] rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg-elevated)] px-4 py-3 flex items-center gap-3 shadow-sm">
        <span className="size-9 rounded-full grid place-items-center shrink-0 border border-[var(--color-border)] text-[var(--color-text-secondary)]" aria-hidden="true">
          <svg width="16" height="14" viewBox="0 0 16 14" fill="none" stroke="currentColor" strokeWidth="1.4">
            <path d="M2 2h12v8H6l-3 2.5V10H2z" strokeLinejoin="round" />
          </svg>
        </span>
        <span className="text-[15px] leading-snug text-[var(--color-text-primary)]">{w.incoming}</span>
      </div>
      <p className="text-lg font-medium leading-snug text-[var(--color-text-primary)]" style={{ textWrap: 'balance' }}>
        {probePrompt(probe, wording, personLabel)}
      </p>
      <div className="space-y-2" role="group" aria-label={probePrompt(probe, wording, personLabel)}>
        {BANDS.map((b) => (
          <button key={b} type="button" className={choiceButton} data-band={b} onClick={() => onAnswer(b, false)}>
            {w.options[b]}
          </button>
        ))}
      </div>
      {allowCantTell && (
        <button type="button" className={linkButton} data-band="cant-tell" onClick={() => onAnswer('stirred', true)}>
          {probe.cantTell}
        </button>
      )}
    </div>
  );
}
