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
        <div className="p-6 rounded-xl bg-[var(--color-calm-50)] dark:bg-[var(--color-calm-900)]/20 border border-[var(--color-calm-200)] dark:border-[var(--color-calm-800)]">
          <h3 className="font-semibold text-[var(--color-sage-800)] dark:text-[var(--color-warm-100)] mb-3">
            How urge surfing works
          </h3>
          <ul className="space-y-2 text-[var(--color-sage-700)] dark:text-[var(--color-sage-300)]">
            <li>• Urges are like waves—they rise, peak, and then fall</li>
            <li>• Most urges pass within 20-30 minutes if you don't act on them</li>
            <li>• Your job is to observe the urge without fighting it or giving in</li>
            <li>• You're just riding the wave until it passes</li>
          </ul>
        </div>

        <div>
          <label className="block text-sm text-[var(--color-sage-600)] dark:text-[var(--color-sage-400)] mb-2">
            How strong is your urge right now? (1-10)
          </label>
          <input
            type="range"
            min="1"
            max="10"
            value={intensity}
            onChange={(e) => setIntensity(Number(e.target.value))}
            className="w-full accent-[var(--color-calm-500)]"
          />
          <div className="flex justify-between text-sm text-[var(--color-sage-500)] mt-1">
            <span>Mild</span>
            <span className="font-bold text-lg text-[var(--color-sage-700)] dark:text-[var(--color-sage-300)]">{intensity}</span>
            <span>Intense</span>
          </div>
        </div>

        <button
          onClick={startSurfing}
          className="w-full py-3 px-4 rounded-lg bg-[var(--color-calm-500)] hover:bg-[var(--color-calm-600)] text-white font-medium transition-colors"
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
          <div className="text-4xl font-mono font-bold text-[var(--color-sage-700)] dark:text-[var(--color-sage-300)]">
            {formatTime(elapsed)}
          </div>
          <p className="text-sm text-[var(--color-sage-500)] dark:text-[var(--color-sage-400)]">
            Time riding the wave
          </p>
        </div>

        {/* Wave visualization */}
        <div className="h-24 flex items-end justify-center">
          <div 
            className="w-full max-w-xs bg-gradient-to-t from-[var(--color-calm-400)] to-[var(--color-calm-200)] dark:from-[var(--color-calm-600)] dark:to-[var(--color-calm-800)] rounded-t-full transition-all duration-500"
            style={{ height: `${intensity * 10}%` }}
          />
        </div>

        {/* Intensity slider */}
        <div>
          <label className="block text-sm text-[var(--color-sage-600)] dark:text-[var(--color-sage-400)] mb-2 text-center">
            Update: How strong is the urge now?
          </label>
          <input
            type="range"
            min="1"
            max="10"
            value={intensity}
            onChange={(e) => handleIntensityChange(Number(e.target.value))}
            className="w-full accent-[var(--color-calm-500)]"
          />
          <div className="flex justify-between text-sm text-[var(--color-sage-500)] mt-1">
            <span>1</span>
            <span className="font-bold text-2xl text-[var(--color-calm-600)] dark:text-[var(--color-calm-400)]">{intensity}</span>
            <span>10</span>
          </div>
        </div>

        {/* Guidance */}
        <div className="p-4 rounded-lg bg-[var(--color-warm-100)] dark:bg-[var(--color-sage-800)] text-center">
          <p className="text-[var(--color-sage-700)] dark:text-[var(--color-sage-300)]">
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
          className="w-full py-3 px-4 rounded-lg border border-[var(--color-sage-300)] dark:border-[var(--color-sage-600)] text-[var(--color-sage-700)] dark:text-[var(--color-sage-300)] hover:bg-[var(--color-sage-100)] dark:hover:bg-[var(--color-sage-700)] font-medium transition-colors"
        >
          I'm ready to finish
        </button>
      </div>
    );
  }

  // Complete phase
  return (
    <div className="text-center p-8 rounded-xl bg-[var(--color-calm-50)] dark:bg-[var(--color-calm-900)]/20 border border-[var(--color-calm-200)] dark:border-[var(--color-calm-800)]">
      <span className="text-4xl mb-4 block">🌊</span>
      <h3 className="text-xl font-semibold text-[var(--color-sage-800)] dark:text-[var(--color-warm-100)] mb-2">
        You rode the wave
      </h3>
      <div className="text-[var(--color-sage-600)] dark:text-[var(--color-sage-300)] mb-4 space-y-1">
        <p>Time: <strong>{formatTime(elapsed)}</strong></p>
        <p>Peak intensity: <strong>{peakIntensity}/10</strong></p>
        <p>Final intensity: <strong>{intensity}/10</strong></p>
      </div>
      <p className="text-sm text-[var(--color-sage-500)] dark:text-[var(--color-sage-400)] mb-6">
        Every wave you ride without acting on the urge makes you stronger.
      </p>
      <button
        onClick={reset}
        className="py-2 px-4 rounded-lg border border-[var(--color-sage-300)] dark:border-[var(--color-sage-600)] text-[var(--color-sage-700)] dark:text-[var(--color-sage-300)] hover:bg-[var(--color-sage-200)] dark:hover:bg-[var(--color-sage-700)] transition-colors"
      >
        Start over
      </button>
    </div>
  );
}
