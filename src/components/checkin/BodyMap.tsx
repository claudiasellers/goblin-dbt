import { useRef } from 'react';
import { getRegionFromPosition } from '../../data/bodyRegions';

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
}

export function BodyMap({ onTap, onSkip, onComplete, sensations }: BodyMapProps) {
  const svgRef = useRef<SVGSVGElement>(null);

  function handleTap(e: React.MouseEvent | React.TouchEvent) {
    if (!svgRef.current) return;

    const rect = svgRef.current.getBoundingClientRect();
    let clientX: number, clientY: number;

    if ('touches' in e) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }

    const x = (clientX - rect.left) / rect.width;
    const y = (clientY - rect.top) / rect.height;

    const region = getRegionFromPosition(x, y);
    if (region) {
      onTap(x, y, region.name);
    }
  }

  return (
    <div>
      <h2 className="text-xl font-bold text-[var(--color-sage-800)] text-center mb-2">
        Where do you notice a physical sensation?
      </h2>
      <p className="text-sm text-[var(--color-sage-600)] text-center mb-6">
        Tap anywhere on the body, or skip this step
      </p>

      {/* Body SVG */}
      <div className="relative flex justify-center mb-6">
        <svg
          ref={svgRef}
          viewBox="0 0 200 400"
          className="w-48 h-auto cursor-pointer"
          onClick={handleTap}
          onTouchStart={handleTap}
        >
          {/* Simple human body outline */}
          <g fill="none" stroke="var(--color-sage-400)" strokeWidth="2">
            {/* Head */}
            <ellipse cx="100" cy="30" rx="25" ry="28" />
            
            {/* Neck */}
            <line x1="90" y1="56" x2="90" y2="70" />
            <line x1="110" y1="56" x2="110" y2="70" />
            
            {/* Torso */}
            <path d="M 60 70 Q 55 90 55 120 L 55 170 Q 55 180 65 185 L 65 200 L 135 200 L 135 185 Q 145 180 145 170 L 145 120 Q 145 90 140 70 Z" />
            
            {/* Left Arm */}
            <path d="M 55 75 Q 30 85 20 130 Q 15 160 10 180 Q 5 195 15 200" />
            
            {/* Right Arm */}
            <path d="M 145 75 Q 170 85 180 130 Q 185 160 190 180 Q 195 195 185 200" />
            
            {/* Left Leg */}
            <path d="M 70 200 L 65 280 Q 62 320 60 360 Q 58 385 50 395" />
            <path d="M 95 200 L 90 280 Q 85 320 80 360 Q 78 385 70 395" />
            
            {/* Right Leg */}
            <path d="M 105 200 L 110 280 Q 115 320 120 360 Q 122 385 130 395" />
            <path d="M 130 200 L 135 280 Q 138 320 140 360 Q 142 385 150 395" />
          </g>

          {/* Sensation markers */}
          {sensations.map((sensation, index) => (
            <g key={index}>
              <circle
                cx={sensation.x * 200}
                cy={sensation.y * 400}
                r="10"
                fill="var(--color-sage-600)"
                fillOpacity="0.8"
              />
              <circle
                cx={sensation.x * 200}
                cy={sensation.y * 400}
                r="4"
                fill="white"
              />
            </g>
          ))}
        </svg>
      </div>

      {/* Sensation count */}
      {sensations.length > 0 && (
        <p className="text-center text-sm text-[var(--color-sage-600)] mb-4">
          {sensations.length} sensation{sensations.length > 1 ? 's' : ''} added
        </p>
      )}

      {/* Action buttons */}
      <div className="space-y-3">
        {sensations.length > 0 && (
          <button
            onClick={onComplete}
            className="w-full py-3 px-4 rounded-lg bg-[var(--color-sage-600)] hover:bg-[var(--color-sage-700)] text-white font-medium transition-colors"
          >
            Continue
          </button>
        )}
        
        <button
          onClick={onSkip}
          className="w-full py-3 px-4 rounded-lg border border-[var(--color-sage-300)] text-[var(--color-sage-700)] font-medium hover:bg-[var(--color-sage-100)] transition-colors"
        >
          {sensations.length > 0 ? 'Done adding sensations' : 'Skip this step'}
        </button>
      </div>
    </div>
  );
}
