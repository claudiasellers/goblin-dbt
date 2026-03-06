import { activationPatterns } from '../../data/activationPatterns';
import type { SomaticCorrelationData } from '../../services/neo4j';

const quadrantLabels: Record<string, string> = {
  'high-unpleasant': 'high-energy distress',
  'high-pleasant': 'high-energy positive states',
  'low-unpleasant': 'low-energy difficult states',
  'low-pleasant': 'low-energy calm states',
};

// Map body region IDs to SVG coordinates (cx, cy) within the 200x400 viewBox
const regionHotspots: Record<string, { cx: number; cy: number }> = {
  head: { cx: 100, cy: 25 },
  face: { cx: 100, cy: 38 },
  neck: { cx: 100, cy: 63 },
  'left-shoulder': { cx: 55, cy: 78 },
  'right-shoulder': { cx: 145, cy: 78 },
  chest: { cx: 100, cy: 110 },
  'left-arm': { cx: 25, cy: 145 },
  'right-arm': { cx: 175, cy: 145 },
  stomach: { cx: 100, cy: 155 },
  'left-hand': { cx: 12, cy: 198 },
  'right-hand': { cx: 188, cy: 198 },
  hips: { cx: 100, cy: 195 },
  'left-thigh': { cx: 80, cy: 245 },
  'right-thigh': { cx: 120, cy: 245 },
  'left-knee': { cx: 75, cy: 300 },
  'right-knee': { cx: 125, cy: 300 },
  'left-calf': { cx: 70, cy: 345 },
  'right-calf': { cx: 130, cy: 345 },
  'left-foot': { cx: 60, cy: 393 },
  'right-foot': { cx: 140, cy: 393 },
};

// Normalize region name to the kebab-case id format used in the hotspot map
// Backend stores names like "Chest", "Left Shoulder" — map keys are "chest", "left-shoulder"
function toRegionKey(region: string) {
  return region.toLowerCase().replace(/\s+/g, '-');
}

function capitalize(s: string) {
  return s.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

interface Props {
  data: SomaticCorrelationData | null;
  totalCheckIns?: number;
  delay?: number;
}

export function SomaticCorrelation({ data, totalCheckIns, delay = 0 }: Props) {
  const cardClass =
    'rounded-xl bg-[var(--color-bg-card)] border border-[var(--color-border-subtle)] p-6';

  if (!data) {
    return (
      <div
        className={cardClass}
        style={{ animation: `fadeIn 0.5s var(--ease-default) ${delay}s both` }}
      >
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div
              className="w-2 h-2 rounded-full"
              style={{ background: 'var(--color-text-muted)' }}
            />
            <p className="text-xs font-semibold uppercase tracking-wider text-[var(--color-text-tertiary)]">
              Body signal
            </p>
          </div>
        </div>
        <p className="text-sm text-[var(--color-text-secondary)] leading-relaxed">
          {(totalCheckIns ?? 0) < 2
            ? "When you tag body sensations during check-ins, patterns will show up here — like which regions light up before certain emotional states."
            : "No strong body-emotion connections yet. Try tagging where you feel things in your body during check-ins — the signal builds over time."}
        </p>
      </div>
    );
  }

  const topCorrelations = data.correlations.slice(0, 3);
  // Build the narrative text
  const patternId = topCorrelations[0]?.patternId;
  const patternMeta = patternId ? activationPatterns[patternId] : undefined;
  const stateLabel =
    patternMeta?.dashboardSummary ||
    quadrantLabels[patternId] ||
    patternId?.replace(/_/g, ' ').replace(/-/g, ' ') ||
    '';

  const regionNames = topCorrelations.map((c) => capitalize(c.region));
  const boldNames =
    regionNames.length === 1
      ? regionNames[0]
      : regionNames.length === 2
        ? `${regionNames[0]} and ${regionNames[1]}`
        : `${regionNames.slice(0, -1).join(', ')}, and ${regionNames[regionNames.length - 1]}`;

  return (
    <div
      className={cardClass}
      style={{ animation: `fadeIn 0.5s var(--ease-default) ${delay}s both` }}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div
            className="w-2 h-2 rounded-full"
            style={{ background: 'var(--color-quadrant-high-unpleasant)' }}
          />
          <p className="text-xs font-semibold uppercase tracking-wider text-[var(--color-text-tertiary)]">
            Body signal
          </p>
        </div>
        {totalCheckIns != null && (
          <p className="text-xs text-[var(--color-text-muted)]">
            Across {totalCheckIns} check-ins
          </p>
        )}
      </div>

      {/* Body + narrative */}
      <div className="flex items-start gap-4">
        {/* Stick figure with hotspot dots */}
        <div className="flex-shrink-0" style={{ width: 60 }}>
          <svg viewBox="0 0 200 400" className="w-full h-auto overflow-visible">
            {/* Body outline */}
            <g fill="none" stroke="var(--color-text-muted)" strokeWidth="2" opacity="0.4">
              <ellipse cx="100" cy="30" rx="25" ry="28" />
              <line x1="90" y1="56" x2="90" y2="70" />
              <line x1="110" y1="56" x2="110" y2="70" />
              <path d="M 60 70 Q 55 90 55 120 L 55 170 Q 55 180 65 185 L 65 200 L 135 200 L 135 185 Q 145 180 145 170 L 145 120 Q 145 90 140 70 Z" />
              <path d="M 55 75 Q 30 85 20 130 Q 15 160 10 180 Q 5 195 15 200" />
              <path d="M 145 75 Q 170 85 180 130 Q 185 160 190 180 Q 195 195 185 200" />
              <path d="M 70 200 L 65 280 Q 62 320 60 360 Q 58 385 50 395" />
              <path d="M 95 200 L 90 280 Q 85 320 80 360 Q 78 385 70 395" />
              <path d="M 105 200 L 110 280 Q 115 320 120 360 Q 122 385 130 395" />
              <path d="M 130 200 L 135 280 Q 138 320 140 360 Q 142 385 150 395" />
            </g>

            {/* Pulsing hotspot circles */}
            {topCorrelations.map((corr, i) => {
              const pos = regionHotspots[toRegionKey(corr.region)];
              if (!pos) return null;
              return (
                <g key={corr.region}>
                  {/* Outer glow - pulsing */}
                  <circle
                    cx={pos.cx}
                    cy={pos.cy}
                    r="18"
                    fill="var(--color-quadrant-high-unpleasant)"
                    opacity="0.25"
                    style={{
                      transformOrigin: `${pos.cx}px ${pos.cy}px`,
                      animation: `pulseSpot 2s ease-in-out ${i * 0.3}s infinite`,
                    }}
                  />
                  {/* Inner solid dot */}
                  <circle
                    cx={pos.cx}
                    cy={pos.cy}
                    r="10"
                    fill="var(--color-quadrant-high-unpleasant)"
                    opacity="0.45"
                    stroke="var(--color-quadrant-high-unpleasant)"
                    strokeWidth="2"
                    strokeOpacity="0.7"
                  />
                </g>
              );
            })}
          </svg>
        </div>

        {/* Narrative */}
        <p className="text-sm text-[var(--color-text-secondary)] leading-relaxed flex-1">
          <span className="font-semibold text-[var(--color-text-primary)]">{boldNames}</span>
          {topCorrelations.length === 1 ? ' shows' : ' show'} up in almost all your {stateLabel} check-ins.
          {' '}These tend to appear <em>before</em> you report feeling overwhelmed — your body is signaling first.
          {' '}Noticing that sensation early is how you catch the escalation.
        </p>
      </div>
    </div>
  );
}
