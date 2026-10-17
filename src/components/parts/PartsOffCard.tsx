import { useId } from 'react';
import type { PartsMeOffPromptId } from '../../lib/partsSettings';
import { PartsSwitch } from './PartsSwitch';

/**
 * Me with parts off (docs/design/parts.md, "The switch"): a quiet card where Parts of me would be, so the
 * switch isn't only in Privacy & Data. The switch's own lines: its label as the title, the blurb beside
 * it, then the small print. One write (`partsEnabled`, the same path Settings uses); once parts are on,
 * Me shows Parts of me in its place. Me renders it only when its copy and Parts of me's have shipped.
 */
export function PartsOffCard({ copy, enabled, onToggle }: {
  copy: Record<PartsMeOffPromptId, string>; enabled: boolean; onToggle: (on: boolean) => void;
}) {
  const labelId = useId();
  const blurbId = useId();
  return (
    <section aria-labelledby={labelId} className="p-4 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-card)]">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 id={labelId} className="text-sm font-semibold text-[var(--color-text-primary)]">{copy.settings_label}</h3>
          <p id={blurbId} className="text-xs text-[var(--color-text-tertiary)] mt-0.5">{copy.settings_blurb}</p>
        </div>
        <PartsSwitch enabled={enabled} onClick={() => onToggle(!enabled)} labelledBy={labelId} describedBy={blurbId} />
      </div>
      <p className="mt-2 text-xs text-[var(--color-text-secondary)]">{copy.settings_dissociation}</p>
      <p className="text-xs text-[var(--color-text-secondary)]">{copy.settings_off}</p>
    </section>
  );
}
