import { useState, useRef } from 'react';

interface IntensityGridProps {
  onSelect: (position: { x: number; y: number }) => void;
  onHelpMeNow?: () => void;
  initialPosition?: { x: number; y: number };
}

export function IntensityGrid({ onSelect, onHelpMeNow, initialPosition }: IntensityGridProps) {
  const [position, setPosition] = useState(initialPosition || { x: 0.5, y: 0.5 });
  const [isDragging, setIsDragging] = useState(false);
  const gridRef = useRef<HTMLDivElement>(null);

  function getPositionFromEvent(e: React.MouseEvent | React.TouchEvent) {
    if (!gridRef.current) return null;
    
    const rect = gridRef.current.getBoundingClientRect();
    let clientX: number, clientY: number;
    
    if ('touches' in e) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }
    
    const x = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    const y = Math.max(0, Math.min(1, 1 - (clientY - rect.top) / rect.height));
    
    return { x, y };
  }

  function handleStart(e: React.MouseEvent | React.TouchEvent) {
    setIsDragging(true);
    const pos = getPositionFromEvent(e);
    if (pos) setPosition(pos);
  }

  function handleMove(e: React.MouseEvent | React.TouchEvent) {
    if (!isDragging) return;
    const pos = getPositionFromEvent(e);
    if (pos) setPosition(pos);
  }

  function handleEnd() {
    setIsDragging(false);
  }

  function handleConfirm() {
    onSelect(position);
  }

  // Convert position to labels
  const intensityLabel = position.y > 0.66 ? 'High' : position.y > 0.33 ? 'Medium' : 'Low';
  const pleasantnessLabel = position.x > 0.66 ? 'Pleasant' : position.x > 0.33 ? 'Neutral' : 'Unpleasant';

  return (
    <div>
      <h2 className="text-xl font-bold text-[var(--color-text-primary)] text-center mb-2">
        How intense is this feeling?
      </h2>
      <p className="text-sm text-[var(--color-text-secondary)] text-center mb-6">
        Drag to position on the grid
      </p>

      {/* Grid container */}
      <div className="relative mb-6">
        {/* Y-axis label */}
        <div className="absolute -left-2 top-0 bottom-0 flex flex-col justify-between text-xs text-[var(--color-text-tertiary)] -translate-x-full pr-2">
          <span>High intensity</span>
          <span>Low intensity</span>
        </div>

        {/* The grid */}
        <div
          ref={gridRef}
          className="relative aspect-square bg-[var(--color-bg-elevated)] rounded-2xl overflow-hidden cursor-crosshair touch-none"
          onMouseDown={handleStart}
          onMouseMove={handleMove}
          onMouseUp={handleEnd}
          onMouseLeave={handleEnd}
          onTouchStart={handleStart}
          onTouchMove={handleMove}
          onTouchEnd={handleEnd}
        >
          {/* Dot grid pattern */}
          <div className="absolute inset-0 p-4">
            <div 
              className="w-full h-full"
              style={{
                backgroundImage: `radial-gradient(circle, var(--color-border) 2px, transparent 2px)`,
                backgroundSize: '24px 24px',
              }}
            />
          </div>

          {/* Position marker */}
          <div
            className="absolute w-6 h-6 -translate-x-1/2 translate-y-1/2 pointer-events-none"
            style={{
              left: `${position.x * 100}%`,
              bottom: `${position.y * 100}%`,
            }}
          >
            <div className="w-full h-full rounded-full bg-[var(--color-accent-hover)] border-4 border-white shadow-lg" />
          </div>
        </div>

        {/* X-axis label */}
        <div className="flex justify-between text-xs text-[var(--color-text-tertiary)] mt-2 px-2">
          <span>Unpleasant</span>
          <span>Pleasant</span>
        </div>
      </div>

      {/* Current selection display */}
      <div className="text-center mb-6">
        <p className="text-lg font-medium text-[var(--color-text-secondary)]">
          {intensityLabel} intensity · {pleasantnessLabel}
        </p>
      </div>

      {/* Action buttons - side by side */}
      <div className="flex gap-3">
        {onHelpMeNow && (
          <button
            onClick={onHelpMeNow}
            className="flex-1 py-3 px-4 rounded-lg border-2 border-dashed border-[var(--color-border-accent)] text-[var(--color-text-secondary)] font-medium lift-secondary"
          >
            Help me now
          </button>
        )}
        <button
          onClick={handleConfirm}
          className="flex-1 py-3 px-4 rounded-lg bg-[var(--color-accent)] text-white font-medium lift-primary"
        >
          Add more detail
        </button>
      </div>
    </div>
  );
}
