/**
 * The parts switch (docs/design/parts.md, "The switch"): Settings' and Me's (with parts off) share it.
 * The track is 40×22 inside a 44×44 target; labelled and described by the host's own lines. The knob
 * is pinned with left-0: a button centres its content, so without it an off knob starts mid-track and reads as on.
 */
export function PartsSwitch({ enabled, onClick, labelledBy, describedBy }: {
  enabled: boolean; onClick: () => void; labelledBy: string; describedBy: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={enabled}
      aria-labelledby={labelledBy}
      aria-describedby={describedBy}
      onClick={onClick}
      className="-my-[11px] -mr-0.5 min-w-11 min-h-11 inline-flex items-center justify-center rounded-full flex-shrink-0"
    >
      <span aria-hidden="true" className={`relative block w-10 h-5.5 rounded-full transition-colors ${
        enabled ? 'bg-[var(--color-accent-fill)]' : 'bg-[var(--color-border-accent)]'
      }`}>
        <span
          className={`absolute left-0 top-0.5 w-4.5 h-4.5 rounded-full bg-white transition-transform shadow-sm ${
            enabled ? 'translate-x-5' : 'translate-x-0.5'
          }`}
        />
      </span>
    </button>
  );
}
