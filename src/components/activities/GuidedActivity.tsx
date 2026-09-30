import { useState, useEffect, useCallback } from 'react';
import type { ActivityDefinition, ActivityVisual } from '../../data/guidedActivities';

interface GuidedActivityProps {
  activity: ActivityDefinition;
  patternId: string;
  secondaryPatternId?: string;
  onComplete: () => void;
  onEarlyExit: () => void;
}

type Phase = 'intro' | 'active' | 'completing';

/**
 * Single data-driven component that renders all 4 guided activities.
 * Content in ActivityDefinition differentiates them, not code.
 *
 * Phases: intro → active steps → completion
 * Forward-only — no back button within activity.
 * "That's enough for now" always leads to completion (always a win).
 */
export function GuidedActivity({
  activity,
  onComplete,
}: GuidedActivityProps) {
  const [phase, setPhase] = useState<Phase>('intro');
  const [stepIndex, setStepIndex] = useState(0);
  const [timeRemaining, setTimeRemaining] = useState<number | null>(null);

  const currentStep = activity.steps[stepIndex];
  const isLastStep = stepIndex === activity.steps.length - 1;

  // Auto-advance intro after 2s
  useEffect(() => {
    if (phase !== 'intro') return;
    const timer = setTimeout(() => setPhase('active'), 2000);
    return () => clearTimeout(timer);
  }, [phase]);

  // Auto-exit after completion message
  useEffect(() => {
    if (phase !== 'completing') return;
    const timer = setTimeout(onComplete, 1800);
    return () => clearTimeout(timer);
  }, [phase, onComplete]);

  // Timer for duration-based steps
  useEffect(() => {
    if (phase !== 'active' || !currentStep?.durationSeconds) return;

    setTimeRemaining(currentStep.durationSeconds);

    const interval = setInterval(() => {
      setTimeRemaining(prev => {
        if (prev === null || prev <= 1) {
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [phase, stepIndex, currentStep]);

  // Auto-advance when timer hits 0
  useEffect(() => {
    if (timeRemaining !== 0) return;
    advanceStep();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timeRemaining]);

  const advanceStep = useCallback(() => {
    if (isLastStep) {
      setPhase('completing');
    } else {
      setStepIndex(prev => prev + 1);
      setTimeRemaining(null);
    }
  }, [isLastStep]);

  function handleTap() {
    if (phase === 'active' && currentStep?.waitForTap) {
      advanceStep();
    }
  }

  function handleEarlyExit() {
    setPhase('completing');
  }

  // ========== INTRO ==========
  if (phase === 'intro') {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] px-6 animate-fade-in">
        <p className="text-lg text-[var(--color-text-secondary)] text-center font-medium leading-relaxed">
          {activity.introMessage}
        </p>
      </div>
    );
  }

  // ========== COMPLETING ==========
  if (phase === 'completing') {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] px-6 animate-fade-in">
        <div className={`mb-6 ${getVisualClass('completion_bloom')}`}>
          <div className="w-16 h-16 rounded-full bg-[var(--color-accent-fill)] opacity-20" />
        </div>
        <p className="text-lg text-[var(--color-text-secondary)] text-center font-medium leading-relaxed">
          {activity.completionMessage}
        </p>
      </div>
    );
  }

  // ========== ACTIVE STEP ==========
  return (
    <div className="flex flex-col items-center justify-center min-h-[50vh] px-6">
      {/* Visual */}
      <div className={`mb-8 ${getVisualClass(currentStep.visual)}`}>
        <ActivityVisualElement visual={currentStep.visual} timeRemaining={timeRemaining} />
      </div>

      {/* Instruction */}
      <div className="text-center mb-8 max-w-sm animate-fade-in" key={stepIndex}>
        <p className="text-2xl font-semibold text-[var(--color-text-primary)] leading-snug mb-3">
          {currentStep.instruction}
        </p>
        {currentStep.guidance && (
          <p className="text-base text-[var(--color-text-tertiary)] leading-relaxed">
            {currentStep.guidance}
          </p>
        )}
      </div>

      {/* Timer or tap prompt */}
      {currentStep.durationSeconds && timeRemaining !== null && (
        <div className="mb-6">
          <span className="text-sm text-[var(--color-text-muted)] tabular-nums">
            {timeRemaining}s
          </span>
        </div>
      )}

      {currentStep.waitForTap && (
        <button
          onClick={handleTap}
          className="w-full max-w-xs py-3.5 px-6 rounded-xl bg-[var(--color-accent-fill)] text-[var(--color-on-accent)] font-medium lift-primary mb-4"
        >
          Done
        </button>
      )}

      {/* Progress dots */}
      <div className="flex items-center gap-1.5 mb-6">
        {activity.steps.map((_, i) => (
          <div
            key={i}
            className={`h-1.5 rounded-full transition-all duration-300 ${
              i < stepIndex
                ? 'w-4 bg-[var(--color-accent-fill)]'
                : i === stepIndex
                ? 'w-6 bg-[var(--color-accent-fill)]'
                : 'w-3 bg-[var(--color-bg-secondary)]'
            }`}
          />
        ))}
      </div>

      {/* Early exit — always available, always a win */}
      <button
        onClick={handleEarlyExit}
        className="text-sm text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)] transition-colors"
      >
        That's enough for now
      </button>
    </div>
  );
}

function getVisualClass(visual: ActivityVisual): string {
  switch (visual) {
    case 'pulse':
      return 'animate-pulse';
    case 'breathing_circle':
      return 'animate-breathing';
    case 'ripple':
      return 'animate-ripple';
    case 'color_shift':
      return '';
    case 'count_down':
      return '';
    case 'completion_bloom':
      return 'animate-bloom';
    default:
      return '';
  }
}

function ActivityVisualElement({
  visual,
  timeRemaining,
}: {
  visual: ActivityVisual;
  timeRemaining: number | null;
}) {
  switch (visual) {
    case 'pulse':
      return (
        <div className="w-12 h-12 rounded-full bg-[var(--color-accent-fill)] opacity-30 animate-pulse" />
      );
    case 'breathing_circle':
      return (
        <div className="w-16 h-16 rounded-full border-2 border-[var(--color-accent)] opacity-40 animate-breathing" />
      );
    case 'ripple':
      return (
        <div className="w-12 h-12 rounded-full bg-[var(--color-accent-fill)] opacity-20 animate-ripple" />
      );
    case 'color_shift':
      return (
        <div className="w-12 h-12 rounded-full bg-[var(--color-info)] opacity-30 animate-pulse" />
      );
    case 'count_down':
      return (
        <div className="w-16 h-16 rounded-full border-2 border-[var(--color-accent)] flex items-center justify-center">
          <span className="text-xl font-bold text-[var(--color-accent)] tabular-nums">
            {timeRemaining ?? ''}
          </span>
        </div>
      );
    case 'completion_bloom':
      return (
        <div className="w-16 h-16 rounded-full bg-[var(--color-accent-fill)] opacity-20 animate-bloom" />
      );
    default:
      return <div className="w-12 h-12" />;
  }
}
