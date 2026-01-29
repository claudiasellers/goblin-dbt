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
      <p className="text-[var(--color-sage-700)] dark:text-[var(--color-sage-300)]">
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
                ? 'border-[var(--color-calm-500)] bg-[var(--color-calm-50)] dark:bg-[var(--color-calm-900)]/20'
                : 'border-[var(--color-sage-200)] dark:border-[var(--color-sage-700)] hover:border-[var(--color-sage-400)]'
              }
            `}
          >
            <span className="font-medium text-[var(--color-sage-800)] dark:text-[var(--color-warm-100)]">
              {technique.title}
            </span>
          </button>
        ))}
      </div>

      {/* Selected technique details */}
      {selected && (
        <div className="p-6 rounded-xl bg-[var(--color-calm-50)] dark:bg-[var(--color-calm-900)]/20 border border-[var(--color-calm-200)] dark:border-[var(--color-calm-800)]">
          <h3 className="font-semibold text-[var(--color-sage-800)] dark:text-[var(--color-warm-100)] mb-3">
            {selected.title}
          </h3>
          <p className="text-[var(--color-sage-700)] dark:text-[var(--color-sage-300)] mb-4">
            {selected.instruction}
          </p>
          <p className="text-sm text-[var(--color-sage-500)] dark:text-[var(--color-sage-400)] italic mb-4">
            💡 {selected.tip}
          </p>

          {/* Timer display */}
          {timerState !== 'idle' && (
            <div className="text-center mb-4">
              <div className={`text-5xl font-bold mb-2 ${
                timerState === 'complete' 
                  ? 'text-[var(--color-sage-500)]' 
                  : 'text-[var(--color-calm-600)] dark:text-[var(--color-calm-400)]'
              }`}>
                {timer}
              </div>
              <p className="text-sm text-[var(--color-sage-600)] dark:text-[var(--color-sage-400)]">
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
                className="w-full py-3 px-4 rounded-lg bg-[var(--color-calm-500)] hover:bg-[var(--color-calm-600)] text-white font-medium transition-colors"
              >
                Start 30-second timer
              </button>
            )}

            {timerState === 'running' && (
              <div className="flex gap-2">
                <button
                  onClick={pauseTimer}
                  className="flex-1 py-3 px-4 rounded-lg bg-[var(--color-warm-300)] hover:bg-[var(--color-warm-400)] text-[var(--color-sage-800)] font-medium transition-colors"
                >
                  Pause
                </button>
                <button
                  onClick={stopTimer}
                  className="flex-1 py-3 px-4 rounded-lg border border-[var(--color-sage-300)] dark:border-[var(--color-sage-600)] text-[var(--color-sage-700)] dark:text-[var(--color-sage-300)] hover:bg-[var(--color-sage-100)] dark:hover:bg-[var(--color-sage-700)] font-medium transition-colors"
                >
                  Stop
                </button>
              </div>
            )}

            {timerState === 'paused' && (
              <div className="flex gap-2">
                <button
                  onClick={resumeTimer}
                  className="flex-1 py-3 px-4 rounded-lg bg-[var(--color-calm-500)] hover:bg-[var(--color-calm-600)] text-white font-medium transition-colors"
                >
                  Resume
                </button>
                <button
                  onClick={stopTimer}
                  className="flex-1 py-3 px-4 rounded-lg border border-[var(--color-sage-300)] dark:border-[var(--color-sage-600)] text-[var(--color-sage-700)] dark:text-[var(--color-sage-300)] hover:bg-[var(--color-sage-100)] dark:hover:bg-[var(--color-sage-700)] font-medium transition-colors"
                >
                  Stop
                </button>
              </div>
            )}

            {timerState === 'complete' && (
              <button
                onClick={startTimer}
                className="w-full py-3 px-4 rounded-lg bg-[var(--color-calm-500)] hover:bg-[var(--color-calm-600)] text-white font-medium transition-colors"
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
