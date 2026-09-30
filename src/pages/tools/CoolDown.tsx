import { useState, useEffect, useRef } from 'react';
import { coolDownView, coolDownTimerAllowed, type ColdCheck } from '../../lib/coolDown';
import { useToolSession } from '../../hooks/useToolSession';
import { SessionClose } from '../../components/spine/SessionClose';

// Interim frontend copy (D-06). DT-01 moves this to graph Intervention nodes
// plus the BodySafetyFlags profile slice.
const COLD_WATER_FACE = {
  id: 'cold-water',
  title: 'Cold water on face',
  instruction: 'Put cold water on your face (forehead, eyes and upper cheeks) for up to 30 seconds. Hold your breath if that\'s okay, or breathe out slowly while it\'s on.',
  tip: 'This triggers your "dive reflex" which naturally slows your heart rate.',
};

// One-tap self-check shown before cold on the face. Not stored.
const COLD_FACE_CHECK = {
  question: 'Before cold on your face: does any of these apply?',
  items: [
    'Heart condition, slow heart or heart medication',
    'Fainting',
    'Eating disorder or very low weight',
    'Pregnant',
    'Cold allergy or Raynaud\'s',
    'Been drinking or using today',
  ],
  clear: 'None of these',
  skip: 'One of these, or not sure',
};

// Offered instead of cold when the self-check says skip.
const LONG_EXHALE = {
  title: 'Long, slow breath out',
  instruction: 'Skip the cold today. Breathe in gently through your nose, then out slowly through your mouth, longer than the in-breath. Keep going until the timer ends.',
  tip: 'Dizzy or tingly? Stop and breathe normally.',
};

const techniques = [
  COLD_WATER_FACE,
  {
    id: 'ice-cubes',
    title: 'Hold ice cubes',
    instruction: 'Hold ice cubes in your hands or press them against your wrists or neck.',
    tip: 'The cold sensation can help interrupt intense emotions.',
  },
];

export function CoolDown() {
  const [selectedTechnique, setSelectedTechnique] = useState<string | null>(null);
  // Self-check answer for cold on the face: this page visit only, never persisted.
  const [coldCheck, setColdCheck] = useState<ColdCheck>('unasked');
  const [timerState, setTimerState] = useState<'idle' | 'running' | 'paused' | 'complete'>('idle');
  const [timer, setTimer] = useState(30);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const view = coolDownView(selectedTechnique, coldCheck);
  const session = useToolSession();

  // Practice spine (PR-S3): the rep is cold, or the exhale when cold was skipped.
  useEffect(() => {
    if (timerState === 'complete') session.markComplete();
  }, [timerState, session]);

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
    if (!coolDownTimerAllowed(view)) return;
    const techniqueId = view === 'exhale' ? 'exhale' : (selectedTechnique ?? 'unknown');
    session.setStep('timer');
    session.markPracticed();
    session.setExt({ dt: { techniqueId } });
    session.setSkillIds(view === 'exhale' ? ['sigh'] : ['cold']);
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

  const selected =
    view === 'cold' ? COLD_WATER_FACE
    : view === 'exhale' ? { id: 'exhale', ...LONG_EXHALE }
    : view === 'technique' ? techniques.find(t => t.id === selectedTechnique)
    : undefined;

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

      {/* Self-check before cold on the face */}
      {view === 'check' && (
        <div className="p-6 rounded-xl bg-[var(--color-bg-elevated)] border border-[var(--color-border)]">
          <h3 className="font-semibold text-[var(--color-text-primary)] mb-3">
            {COLD_FACE_CHECK.question}
          </h3>
          <ul className="space-y-1 mb-5 text-[var(--color-text-secondary)]">
            {COLD_FACE_CHECK.items.map(item => (
              <li key={item}>· {item}</li>
            ))}
          </ul>
          <div className="space-y-2">
            <button
              onClick={() => setColdCheck('clear')}
              className="w-full py-3 px-4 rounded-lg bg-[var(--color-accent-fill)] text-white font-medium lift-primary"
            >
              {COLD_FACE_CHECK.clear}
            </button>
            <button
              onClick={() => setColdCheck('skip')}
              className="w-full py-3 px-4 rounded-lg border border-[var(--color-border)] text-[var(--color-text-secondary)] font-medium lift-secondary"
            >
              {COLD_FACE_CHECK.skip}
            </button>
          </div>
        </div>
      )}

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
                className="w-full py-3 px-4 rounded-lg bg-[var(--color-accent-fill)] text-white font-medium lift-primary"
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
                  className="flex-1 py-3 px-4 rounded-lg bg-[var(--color-accent-fill)] text-white font-medium lift-primary"
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
                className="w-full py-3 px-4 rounded-lg bg-[var(--color-accent-fill)] text-white font-medium lift-primary"
              >
                Do it again
              </button>
            )}
          </div>
          {timerState === 'complete' && <SessionClose />}
        </div>
      )}
    </div>
  );
}
