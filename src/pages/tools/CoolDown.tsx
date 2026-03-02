import { useState, useEffect, useRef } from 'react';

const techniques = [
  {
    id: 'cold-water',
    title: 'Cold water on face',
    instruction: 'Hold your breath and put cold water on your face, especially your forehead, eyes, and cheeks. Hold for 30 seconds.',
    tip: 'This triggers your "dive reflex" which naturally slows your heart rate.',
  },
  {
    id: 'ice-cubes',
    title: 'Hold ice cubes',
    instruction: 'Hold ice cubes in your hands or press them against your wrists or neck.',
    tip: 'The cold sensation can help interrupt intense emotions.',
  },
  {
    id: 'cold-shower',
    title: 'Cold shower or splash',
    instruction: 'Take a brief cold shower, or splash cold water on your arms and face.',
    tip: 'Even 30 seconds of cold water can shift your nervous system.',
  },
];

export function CoolDown() {
  const [selectedTechnique, setSelectedTechnique] = useState<string | null>(null);
  const [timerState, setTimerState] = useState<'idle' | 'running' | 'paused' | 'complete'>('idle');
  const [timer, setTimer] = useState(30);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Clean up interval on unmount
  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  // Timer logic
  useEffect(() => {
    if (timerState === 'running') {
      intervalRef.current = setInterval(() => {
        setTimer(prev => {
          if (prev <= 1) {
            setTimerState('complete');
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [timerState]);

  const startTimer = () => {
    setTimer(30);
    setTimerState('running');
  };

  const pauseTimer = () => {
    setTimerState('paused');
  };

  const resumeTimer = () => {
    setTimerState('running');
  };

  const stopTimer = () => {
    setTimerState('idle');
    setTimer(30);
  };

  const selected = techniques.find(t => t.id === selectedTechnique);

  return (
    <div className="space-y-6">
      <p className="text-[var(--color-text-secondary)]">
        Cold temperature can quickly calm your body when emotions are intense. Choose a technique:
      </p>

      {/* Technique selection */}
      <div className="grid gap-3">
        {techniques.map(technique => (
          <button
            key={technique.id}
            onClick={() => {
              setSelectedTechnique(technique.id);
              stopTimer();
            }}
            className={`
              p-4 rounded-xl border-2 text-left transition-all
              ${selectedTechnique === technique.id
                ? 'border-[var(--color-accent)] bg-[var(--color-bg-elevated)]'
                : 'border-[var(--color-border-subtle)] hover:border-[var(--color-border-accent)]'
              }
            `}
          >
            <span className="font-medium text-[var(--color-text-primary)]">
              {technique.title}
            </span>
          </button>
        ))}
      </div>

      {/* Selected technique details */}
      {selected && (
        <div className="p-6 rounded-xl bg-[var(--color-bg-elevated)] border border-[var(--color-border)]">
          <h3 className="font-semibold text-[var(--color-text-primary)] mb-3">
            {selected.title}
          </h3>
          <p className="text-[var(--color-text-secondary)] mb-4">
            {selected.instruction}
          </p>
          <p className="text-sm text-[var(--color-text-tertiary)] italic mb-4">
            💡 {selected.tip}
          </p>

          {/* Timer display */}
          {timerState !== 'idle' && (
            <div className="text-center mb-4">
              <div className={`text-5xl font-bold mb-2 ${
                timerState === 'complete' 
                  ? 'text-[var(--color-text-tertiary)]' 
                  : 'text-[var(--color-accent)]'
              }`}>
                {timer}
              </div>
              <p className="text-sm text-[var(--color-text-secondary)]">
                {timerState === 'complete' 
                  ? 'Done! Great job.' 
                  : timerState === 'paused'
                  ? 'Paused'
                  : 'seconds remaining'
                }
              </p>
            </div>
          )}

          {/* Timer controls */}
          <div className="space-y-2">
            {timerState === 'idle' && (
              <button
                onClick={startTimer}
                className="w-full py-3 px-4 rounded-lg bg-[var(--color-accent)] text-white font-medium lift-primary"
              >
                Start 30-second timer
              </button>
            )}

            {timerState === 'running' && (
              <div className="flex gap-2">
                <button
                  onClick={pauseTimer}
                  className="flex-1 py-3 px-4 rounded-lg bg-[var(--color-bg-secondary)] text-[var(--color-text-primary)] font-medium lift-secondary"
                >
                  Pause
                </button>
                <button
                  onClick={stopTimer}
                  className="flex-1 py-3 px-4 rounded-lg border border-[var(--color-border)] text-[var(--color-text-secondary)] font-medium lift-secondary"
                >
                  Stop
                </button>
              </div>
            )}

            {timerState === 'paused' && (
              <div className="flex gap-2">
                <button
                  onClick={resumeTimer}
                  className="flex-1 py-3 px-4 rounded-lg bg-[var(--color-accent)] text-white font-medium lift-primary"
                >
                  Resume
                </button>
                <button
                  onClick={stopTimer}
                  className="flex-1 py-3 px-4 rounded-lg border border-[var(--color-border)] text-[var(--color-text-secondary)] font-medium lift-secondary"
                >
                  Stop
                </button>
              </div>
            )}

            {timerState === 'complete' && (
              <button
                onClick={startTimer}
                className="w-full py-3 px-4 rounded-lg bg-[var(--color-accent)] text-white font-medium lift-primary"
              >
                Do it again
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
