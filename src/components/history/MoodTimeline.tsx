import type { CheckInRecord } from '../../services/neo4j';

const quadrantPrefix: Record<string, string> = {
  'high-unpleasant': 'hu',
  'high-pleasant': 'hp',
  'low-unpleasant': 'lu',
  'low-pleasant': 'lp',
};

// Whether a quadrant is on the pleasant side
const isPleasant: Record<string, boolean> = {
  'high-pleasant': true,
  'low-pleasant': true,
  'high-unpleasant': false,
  'low-unpleasant': false,
};

interface MoodTimelineProps {
  checkIns: CheckInRecord[];
}

/**
 * Derive a –1 to +1 pleasantness score from quadrant + intensity.
 * Pleasant quadrants map intensity.y → 0 to +1
 * Unpleasant quadrants map intensity.y → 0 to –1
 * This gives the y-axis a real bipolar spread.
 */
function pleasantnessScore(ci: CheckInRecord): number {
  const mag = ci.intensity.y; // 0–1 magnitude
  return isPleasant[ci.quadrant] ? mag : -mag;
}

export function MoodTimeline({ checkIns }: MoodTimelineProps) {
  if (checkIns.length === 0) return null;

  // Sort by timestamp ascending
  const sorted = [...checkIns].sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

  const labelPadLeft = 48; // room for y-axis labels
  const padRight = 12;
  const svgWidth = 400;
  const svgHeight = 120;
  const plotLeft = labelPadLeft;
  const plotRight = svgWidth - padRight;
  const plotWidth = plotRight - plotLeft;
  const plotTop = 10;
  const plotBottom = svgHeight - 20;
  const plotHeight = plotBottom - plotTop;

  // Time range
  const minTime = sorted[0].timestamp.getTime();
  const maxTime = sorted[sorted.length - 1].timestamp.getTime();
  const timeSpan = maxTime - minTime || 1;

  // Map check-ins to dot positions
  const dots = sorted.map((ci) => {
    const tNorm = sorted.length === 1 ? 0.5 : (ci.timestamp.getTime() - minTime) / timeSpan;
    const x = plotLeft + tNorm * plotWidth;
    // pleasantness: +1 = top, -1 = bottom, 0 = center
    const p = pleasantnessScore(ci);
    const y = plotTop + ((1 - p) / 2) * plotHeight;
    const prefix = quadrantPrefix[ci.quadrant] || 'hu';
    return { x, y, prefix, key: ci.id };
  });

  // Connector line between adjacent dots
  const linePath =
    dots.length >= 2
      ? dots.map((d, i) => `${i === 0 ? 'M' : 'L'}${d.x},${d.y}`).join(' ')
      : null;

  // Date labels (up to 3)
  const dateLabels: { x: number; label: string }[] = [];
  const fmt = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' });
  if (sorted.length === 1) {
    dateLabels.push({ x: plotLeft + plotWidth / 2, label: fmt.format(sorted[0].timestamp) });
  } else {
    const positions = [0, 0.5, 1];
    for (const pos of positions) {
      const t = minTime + pos * timeSpan;
      dateLabels.push({ x: plotLeft + pos * plotWidth, label: fmt.format(new Date(t)) });
    }
  }

  const centerY = plotTop + plotHeight / 2;

  return (
    <div className="bg-[var(--color-glass-card)] backdrop-blur-md border border-[var(--color-glass-border)] rounded-xl p-4">
      <h3 className="text-sm font-medium text-[var(--color-text-tertiary)] mb-2">Mood over time</h3>
      <svg
        viewBox={`0 0 ${svgWidth} ${svgHeight}`}
        className="w-full"
        style={{ height: 120 }}
        role="img"
        aria-label="Mood timeline showing pleasantness over time"
      >
        {/* Pleasant / Unpleasant background tint */}
        <rect
          x={plotLeft}
          y={plotTop}
          width={plotWidth}
          height={plotHeight / 2}
          fill="var(--color-q-hp-fill)"
          opacity={0.04}
        />
        <rect
          x={plotLeft}
          y={centerY}
          width={plotWidth}
          height={plotHeight / 2}
          fill="var(--color-q-hu-fill)"
          opacity={0.04}
        />

        {/* Center line (neutral) */}
        <line
          x1={plotLeft}
          y1={centerY}
          x2={plotRight}
          y2={centerY}
          stroke="var(--color-border-subtle)"
          strokeWidth={1}
          strokeDasharray="4 4"
        />

        {/* Y-axis labels */}
        <text
          x={plotLeft - 6}
          y={plotTop + 4}
          textAnchor="end"
          fill="var(--color-text-tertiary)"
          fontSize={8}
        >
          pleasant
        </text>
        <text
          x={plotLeft - 6}
          y={plotBottom}
          textAnchor="end"
          fill="var(--color-text-tertiary)"
          fontSize={8}
        >
          unpleasant
        </text>

        {/* Connector line */}
        {linePath && (
          <path
            d={linePath}
            fill="none"
            stroke="var(--color-border-subtle)"
            strokeWidth={1}
            opacity={0.4}
          />
        )}

        {/* Dots */}
        {dots.map((d) => (
          <circle
            key={d.key}
            cx={d.x}
            cy={d.y}
            r={4.5}
            fill={`var(--color-q-${d.prefix}-fill)`}
            opacity={0.85}
          />
        ))}

        {/* Date labels */}
        {dateLabels.map((dl, i) => (
          <text
            key={i}
            x={dl.x}
            y={svgHeight - 4}
            textAnchor="middle"
            fill="var(--color-text-tertiary)"
            fontSize={9}
          >
            {dl.label}
          </text>
        ))}
      </svg>
    </div>
  );
}
