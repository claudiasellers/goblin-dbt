import { useRef, useState, useCallback } from 'react';

interface BodySensation {
  x: number;
  y: number;
  region: string;
  intensity: { x: number; y: number };
  tags: string[];
}

interface BodyMapProps {
  onTap: (x: number, y: number, region: string) => void;
  onSkip: () => void;
  onComplete: () => void;
  sensations: BodySensation[];
  isSomaticEntry?: boolean;
}

/**
 * Region paths for the segmented silhouette.
 * Each region is a self-contained SVG path that composes into a full body.
 * Region names match bodyRegions.ts for consistency.
 */
const BODY_REGIONS: Array<{ name: string; path: string }> = [
  {
    name: 'Head',
    path: 'M 100 4 C 82 4 76 18 76 32 C 76 48 86 60 100 60 C 114 60 124 48 124 32 C 124 18 118 4 100 4 Z',
  },
  {
    name: 'Neck',
    path: 'M 90 60 L 110 60 L 112 74 L 88 74 Z',
  },
  {
    name: 'Left Shoulder',
    path: 'M 88 74 L 62 74 C 52 74 44 78 40 86 L 52 92 L 62 86 L 88 82 Z',
  },
  {
    name: 'Right Shoulder',
    path: 'M 112 74 L 138 74 C 148 74 156 78 160 86 L 148 92 L 138 86 L 112 82 Z',
  },
  {
    name: 'Chest',
    path: 'M 88 74 L 112 74 L 112 82 L 138 86 L 140 140 L 60 140 L 62 86 L 88 82 Z',
  },
  {
    name: 'Left Arm',
    path: 'M 40 86 L 52 92 L 42 150 L 36 180 L 20 180 L 24 140 L 30 108 Z',
  },
  {
    name: 'Right Arm',
    path: 'M 160 86 L 148 92 L 158 150 L 164 180 L 180 180 L 176 140 L 170 108 Z',
  },
  {
    name: 'Left Hand',
    path: 'M 20 180 L 36 180 L 34 196 C 33 204 28 210 22 210 C 14 210 12 202 14 194 Z',
  },
  {
    name: 'Right Hand',
    path: 'M 164 180 L 180 180 L 186 194 C 188 202 186 210 178 210 C 172 210 167 204 166 196 Z',
  },
  {
    name: 'Stomach',
    path: 'M 60 140 L 140 140 L 138 200 L 62 200 Z',
  },
  {
    name: 'Hips',
    path: 'M 62 200 L 138 200 L 134 220 L 66 220 Z',
  },
  {
    name: 'Left Thigh',
    path: 'M 66 220 L 100 220 L 96 306 L 70 306 Z',
  },
  {
    name: 'Right Thigh',
    path: 'M 100 220 L 134 220 L 130 306 L 104 306 Z',
  },
  {
    name: 'Left Knee',
    path: 'M 70 306 L 96 306 L 94 330 L 68 330 Z',
  },
  {
    name: 'Right Knee',
    path: 'M 104 306 L 130 306 L 132 330 L 106 330 Z',
  },
  {
    name: 'Left Calf',
    path: 'M 68 330 L 94 330 L 90 390 L 64 390 Z',
  },
  {
    name: 'Right Calf',
    path: 'M 106 330 L 132 330 L 136 390 L 110 390 Z',
  },
  {
    name: 'Left Foot',
    path: 'M 64 390 L 90 390 C 88 404 82 412 72 412 C 60 412 56 404 58 394 Z',
  },
  {
    name: 'Right Foot',
    path: 'M 110 390 L 136 390 C 138 394 140 404 128 412 C 118 412 112 404 110 390 Z',
  },
];

/** Get the visual center of an SVG path for placing sensation markers */
function getPathCenter(pathData: string): { cx: number; cy: number } {
  // Parse all numeric coordinate pairs from the path
  const nums = pathData.match(/-?\d+\.?\d*/g)?.map(Number) || [];
  let sumX = 0, sumY = 0, count = 0;
  for (let i = 0; i < nums.length - 1; i += 2) {
    sumX += nums[i];
    sumY += nums[i + 1];
    count++;
  }
  return count > 0
    ? { cx: sumX / count, cy: sumY / count }
    : { cx: 100, cy: 200 };
}

export function BodyMap({ onTap, onSkip, onComplete, sensations, isSomaticEntry = false }: BodyMapProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [hoveredRegion, setHoveredRegion] = useState<string | null>(null);
  const [labelPos, setLabelPos] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [flashRegion, setFlashRegion] = useState<string | null>(null);

  /** Regions that already have sensations recorded */
  const taggedRegions = new Set(sensations.map(s => s.region));

  const handleRegionClick = useCallback((e: React.MouseEvent, regionName: string) => {
    if (!svgRef.current) return;
    const rect = svgRef.current.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    const y = (e.clientY - rect.top) / rect.height;

    // Flash feedback
    setFlashRegion(regionName);
    setTimeout(() => setFlashRegion(null), 300);

    onTap(x, y, regionName);
  }, [onTap]);

  const handleRegionTouchStart = useCallback((e: React.TouchEvent, regionName: string) => {
    if (!svgRef.current) return;
    const touch = e.touches[0];
    const rect = svgRef.current.getBoundingClientRect();
    const x = (touch.clientX - rect.left) / rect.width;
    const y = (touch.clientY - rect.top) / rect.height;

    setFlashRegion(regionName);
    setTimeout(() => setFlashRegion(null), 300);

    onTap(x, y, regionName);
  }, [onTap]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!svgRef.current) return;
    const rect = svgRef.current.getBoundingClientRect();
    setLabelPos({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    });
  }, []);

  function getRegionFill(regionName: string): string {
    if (flashRegion === regionName) return 'var(--color-accent-flash, rgba(43, 180, 148, 0.35))';
    if (taggedRegions.has(regionName)) return 'var(--color-accent-tagged, rgba(43, 180, 148, 0.15))';
    if (hoveredRegion === regionName) return 'var(--color-accent-hover-region, rgba(43, 180, 148, 0.18))';
    return 'var(--color-body-region-fill, rgba(43, 180, 148, 0.12))';
  }

  function getRegionStroke(regionName: string): string {
    if (flashRegion === regionName) return 'var(--color-accent-flash-stroke, rgba(43, 180, 148, 0.6))';
    if (taggedRegions.has(regionName)) return 'var(--color-accent-tagged-stroke, rgba(43, 180, 148, 0.35))';
    if (hoveredRegion === regionName) return 'var(--color-accent-hover-stroke, rgba(43, 180, 148, 0.4))';
    return 'var(--color-body-region-stroke, rgba(43, 180, 148, 0.2))';
  }

  /** Group sensations by region for the summary chips */
  const sensationsByRegion = sensations.reduce<Record<string, string[]>>((acc, s) => {
    if (!acc[s.region]) acc[s.region] = [];
    acc[s.region].push(...s.tags);
    return acc;
  }, {});

  return (
    <div>
      <h2 className="text-xl font-bold text-[var(--color-text-primary)] text-center mb-2">
        {isSomaticEntry
          ? "Let's start with your body"
          : 'Where do you notice a physical sensation?'
        }
      </h2>
      <p className="text-sm text-[var(--color-text-secondary)] text-center mb-6">
        {isSomaticEntry
          ? "Tap where you feel something — I'll help figure out the rest"
          : 'Tap anywhere on the body, or skip this step'
        }
      </p>

      {/* Body SVG — segmented silhouette */}
      <div className="relative flex justify-center mb-6" onMouseMove={handleMouseMove}>
        <svg
          ref={svgRef}
          viewBox="0 0 200 420"
          className="w-60 sm:w-72 md:w-80 h-auto select-none"
          aria-label="Interactive body map — tap a region to record a sensation"
          role="img"
        >
          {/* Region paths */}
          {BODY_REGIONS.map((region) => (
            <path
              key={region.name}
              d={region.path}
              data-region={region.name}
              fill={getRegionFill(region.name)}
              stroke={getRegionStroke(region.name)}
              strokeWidth="0.5"
              className="cursor-pointer"
              style={{
                transition: 'fill 200ms ease, stroke 200ms ease',
              }}
              onMouseEnter={() => setHoveredRegion(region.name)}
              onMouseLeave={() => setHoveredRegion(null)}
              onClick={(e) => handleRegionClick(e, region.name)}
              onTouchStart={(e) => handleRegionTouchStart(e, region.name)}
              aria-label={`${region.name}${taggedRegions.has(region.name) ? ' — sensation recorded' : ''}`}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  const center = getPathCenter(region.path);
                  onTap(center.cx / 200, center.cy / 420, region.name);
                }
              }}
            />
          ))}

          {/* Sensation markers — pulsing dots on regions that have been tagged */}
          {sensations.map((sensation, index) => (
            <g key={index}>
              <circle
                cx={sensation.x * 200}
                cy={sensation.y * 420}
                r="8"
                fill="var(--color-accent)"
                opacity="0.7"
                style={{
                  animation: 'pulseSpot 2s ease-in-out infinite',
                  transformOrigin: `${sensation.x * 200}px ${sensation.y * 420}px`,
                }}
              />
              <circle
                cx={sensation.x * 200}
                cy={sensation.y * 420}
                r="3"
                fill="var(--color-bg-primary)"
              />
            </g>
          ))}
        </svg>

        {/* Floating region label — desktop hover only */}
        {hoveredRegion && (
          <div
            className="absolute pointer-events-none z-10 hidden sm:block"
            style={{
              left: `${labelPos.x + 14}px`,
              top: `${labelPos.y - 32}px`,
              transition: 'opacity 150ms ease',
            }}
          >
            <span className="bg-[var(--color-accent-fill)] text-white text-xs font-medium px-2.5 py-1 rounded-lg whitespace-nowrap shadow-md">
              {hoveredRegion}
            </span>
          </div>
        )}
      </div>

      {/* Sensation summary chips — replaces plain "N sensations added" */}
      {sensations.length > 0 && (
        <div className="flex flex-wrap gap-2 justify-center mb-5">
          {Object.entries(sensationsByRegion).map(([region, tags]) => (
            <span
              key={region}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border"
              style={{
                backgroundColor: 'var(--color-accent-muted)',
                borderColor: 'color-mix(in srgb, var(--color-accent) 25%, transparent)',
                color: 'var(--color-accent)',
              }}
            >
              <span className="font-semibold">{region}</span>
              <span style={{ opacity: 0.6 }}>·</span>
              <span style={{ opacity: 0.8 }}>{tags.join(', ').toLowerCase()}</span>
            </span>
          ))}
        </div>
      )}

      {/* Action buttons */}
      <div className="space-y-3">
        {sensations.length > 0 && (
          <button
            onClick={onComplete}
            className="w-full py-3 px-4 rounded-lg bg-[var(--color-accent-fill)] text-white font-medium lift-primary"
          >
            {isSomaticEntry ? 'Help me identify my feelings' : 'Continue'}
          </button>
        )}

        <button
          onClick={onSkip}
          className="w-full py-3 px-4 rounded-lg border border-[var(--color-border)] text-[var(--color-text-secondary)] font-medium lift-secondary"
        >
          {sensations.length > 0
            ? 'Done adding sensations'
            : (isSomaticEntry ? 'Pick emotions instead' : 'Skip this step')
          }
        </button>
      </div>
    </div>
  );
}
