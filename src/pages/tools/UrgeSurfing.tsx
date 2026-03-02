import { useState, useEffect } from 'react';

export function UrgeSurfing() {
  const [phase, setPhase] = useState<'intro' | 'surfing' | 'complete'>('intro');
  const [intensity, setIntensity] = useState(7);
  const [elapsed, setElapsed] = useState(0);
  const [peakIntensity, setPeakIntensity] = useState(7);

  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    if (phase === 'surfing') {
      interval = setInterval(() => {
        setElapsed(prev => prev + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [phase]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleIntensityChange = (newIntensity: number) => {
    setIntensity(newIntensity);
    if (newIntensity > peakIntensity) {
      setPeakIntensity(newIntensity);
    }
  };

  const startSurfing = () => {
    setPhase('surfing');
    setElapsed(0);
  };

  const finish = () => {
    setPhase('complete');
  };

  const reset = () => {
    setPhase('intro');
    setIntensity(7);
    setElapsed(0);
    setPeakIntensity(7);
  };

  if (phase === 'intro') {
    return (
      <div className="space-y-6">
        <div className="p-6 rounded-xl bg-[var(--color-bg-elevated)] border border-[var(--color-border)]">
          <h3 className="font-semibold text-[var(--color-text-primary)] mb-3">
            How urge surfing works
          </h3>
          <ul className="space-y-2 text-[var(--color-text-secondary)]">
            <li>• Urges are like waves—they rise, peak, and then fall</li>
            <li>• Most urges pass within 20-30 minutes if you don't act on them</li>
            <li>• Your job is to observe the urge without fighting it or giving in</li>
            <li>• You're just riding the wave until it passes</li>
          </ul>
        </div>

        <div>
          <label className="block text-sm text-[var(--color-text-secondary)] mb-2">
            How strong is your urge right now? (1-10)
          </label>
          <input
            type="range"
            min="1"
            max="10"
            value={intensity}
            onChange={(e) => setIntensity(Number(e.target.value))}
            className="w-full accent-[var(--color-accent)]"
          />
          <div className="flex justify-between text-sm text-[var(--color-text-tertiary)] mt-1">
            <span>Mild</span>
            <span className="font-bold text-lg text-[var(--color-text-secondary)]">{intensity}</span>
            <span>Intense</span>
          </div>
        </div>

        <button
          onClick={startSurfing}
          className="w-full py-3 px-4 rounded-lg bg-[var(--color-accent)] text-white font-medium lift-primary"
        >
          Start surfing 🌊
        </button>
      </div>
    );
  }

  if (phase === 'surfing') {
    return (
      <div className="space-y-6">
        {/* Timer */}
        <div className="text-center">
          <div className="text-4xl font-mono font-bold text-[var(--color-text-secondary)]">
            {formatTime(elapsed)}
          </div>
          <p className="text-sm text-[var(--color-text-tertiary)]">
            Time riding the wave
          </p>
        </div>

        {/* Wave visualization */}
        <div className="h-24 flex items-end justify-center">
          <div 
            className="w-full max-w-xs bg-gradient-to-t from-[var(--color-accent)] to-[var(--color-accent-muted)] rounded-t-full transition-all duration-500"
            style={{ height: `${intensity * 10}%` }}
          />
        </div>

        {/* Intensity slider */}
        <div>
          <label className="block text-sm text-[var(--color-text-secondary)] mb-2 text-center">
            Update: How strong is the urge now?
          </label>
          <input
            type="range"
            min="1"
            max="10"
            value={intensity}
            onChange={(e) => handleIntensityChange(Number(e.target.value))}
            className="w-full accent-[var(--color-accent)]"
          />
          <div className="flex justify-between text-sm text-[var(--color-text-tertiary)] mt-1">
            <span>1</span>
            <span className="font-bold text-2xl text-[var(--color-accent)]">{intensity}</span>
            <span>10</span>
          </div>
        </div>

        {/* Guidance */}
        <div className="p-4 rounded-lg bg-[var(--color-bg-elevated)] text-center">
          <p className="text-[var(--color-text-secondary)]">
            {intensity >= 7 
              ? "The wave is high. Just observe it. You don't have to do anything."
              : intensity >= 4
              ? "Notice the wave changing. It will keep shifting."
              : "The wave is getting smaller. You're riding it out."
            }
          </p>
        </div>

        <button
          onClick={finish}
          className="w-full py-3 px-4 rounded-lg border border-[var(--color-border)] text-[var(--color-text-secondary)] font-medium lift-secondary"
        >
          I'm ready to finish
        </button>
      </div>
    );
  }

  // Complete phase
  return (
    <div className="text-center p-8 rounded-xl bg-[var(--color-bg-elevated)] border border-[var(--color-border)]">
      <span className="text-4xl mb-4 block">🌊</span>
      <h3 className="text-xl font-semibold text-[var(--color-text-primary)] mb-2">
        You rode the wave
      </h3>
      <div className="text-[var(--color-text-secondary)] mb-4 space-y-1">
        <p>Time: <strong>{formatTime(elapsed)}</strong></p>
        <p>Peak intensity: <strong>{peakIntensity}/10</strong></p>
        <p>Final intensity: <strong>{intensity}/10</strong></p>
      </div>
      <p className="text-sm text-[var(--color-text-tertiary)] mb-6">
        Every wave you ride without acting on the urge makes you stronger.
      </p>
      <button
        onClick={reset}
        className="py-2 px-4 rounded-lg border border-[var(--color-border)] text-[var(--color-text-secondary)] lift-secondary"
      >
        Start over
      </button>
    </div>
  );
}
