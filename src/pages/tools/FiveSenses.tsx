import { useState } from 'react';
import { ExerciseProgress } from '../../components/tools/ExerciseProgress';

const senses = [
  { count: 5, name: 'See', prompt: 'things you can see', singular: 'Thing you can see', emoji: '👁️' },
  { count: 4, name: 'Touch', prompt: 'things you can feel or touch', singular: 'Thing you can touch', emoji: '✋' },
  { count: 3, name: 'Hear', prompt: 'things you can hear', singular: 'Thing you can hear', emoji: '👂' },
  { count: 2, name: 'Smell', prompt: 'things you can smell', singular: 'Thing you can smell', emoji: '👃' },
  { count: 1, name: 'Taste', prompt: 'thing you can taste', singular: 'Thing you can taste', emoji: '👅' },
];

/**
 * 5-4-3-2-1 grounding. Typing is optional: noticing is the exercise.
 * The user can move through every stage with zero typed characters,
 * skip a sense they can't use, and go back without losing entries.
 */
export function FiveSenses() {
  const [currentStep, setCurrentStep] = useState(0);
  const [inputs, setInputs] = useState<string[][]>(senses.map(s => Array(s.count).fill('')));
  const [writing, setWriting] = useState(false);
  const [skipped, setSkipped] = useState<boolean[]>(senses.map(() => false));
  const [isComplete, setIsComplete] = useState(false);

  const current = senses[currentStep];
  const isLast = currentStep === senses.length - 1;

  const handleInputChange = (index: number, value: string) => {
    setInputs(prev => {
      const next = prev.map(row => [...row]);
      next[currentStep][index] = value;
      return next;
    });
  };

  const advance = () => {
    if (isLast) setIsComplete(true);
    else setCurrentStep(currentStep + 1);
  };

  const skipSense = () => {
    setSkipped(prev => prev.map((v, i) => (i === currentStep ? true : v)));
    advance();
  };

  const goBack = () => {
    if (currentStep > 0) setCurrentStep(currentStep - 1);
  };

  const reset = () => {
    setCurrentStep(0);
    setInputs(senses.map(s => Array(s.count).fill('')));
    setSkipped(senses.map(() => false));
    setWriting(false);
    setIsComplete(false);
  };

  if (isComplete) {
    const noticedCount = senses.filter((_, i) => !skipped[i]).length;
    return (
      <div className="text-center p-8 rounded-xl bg-[var(--color-bg-elevated)]">
        <span className="text-4xl mb-4 block" aria-hidden="true">🌟</span>
        <h3 className="text-xl font-semibold text-[var(--color-text-primary)] mb-2">
          You're here.
        </h3>
        <p className="text-[var(--color-text-secondary)] mb-6">
          You moved through {noticedCount === senses.length ? 'all five senses' : `${noticedCount} of five senses`} and brought your attention to right now.
        </p>
        <button
          type="button"
          onClick={reset}
          className="py-3 px-4 rounded-lg border border-[var(--color-border)] text-[var(--color-text-secondary)] lift-secondary"
        >
          Do it again
        </button>
        <p className="mt-6 text-sm text-[var(--color-text-tertiary)]">
          Nothing you wrote here is saved.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <ExerciseProgress
        current={currentStep + 1}
        total={senses.length}
        stageName={current.name}
        onBack={currentStep > 0 ? goBack : undefined}
      />

      {/* Current sense */}
      <div className="text-center">
        <span className="text-4xl mb-2 block" aria-hidden="true">{current.emoji}</span>
        <h3 className="text-2xl font-bold text-[var(--color-text-primary)]">
          Notice {current.count} {current.prompt}
        </h3>
        <p className="mt-2 text-[var(--color-text-secondary)]">
          Look around, or close your eyes and notice. You don't need to write anything down.
        </p>
      </div>

      {/* Primary action: noticing is enough */}
      <button
        type="button"
        onClick={advance}
        className="w-full py-3 px-4 rounded-lg bg-[var(--color-accent-fill)] text-[var(--color-on-accent)] font-medium lift-primary"
      >
        {isLast ? "I've noticed it — finish" : "I've noticed them — continue"}
      </button>

      {/* Optional writing */}
      <div>
        {!writing ? (
          <button
            type="button"
            onClick={() => setWriting(true)}
            aria-expanded={false}
            className="text-sm text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] underline underline-offset-2 transition-colors min-h-11"
          >
            Write them down (optional)
          </button>
        ) : (
          <fieldset className="space-y-3">
            <legend className="text-sm text-[var(--color-text-secondary)] mb-2">
              Write down what you notice — as many or as few as you like.
            </legend>
            {Array.from({ length: current.count }).map((_, index) => (
              <input
                key={`${currentStep}-${index}`}
                type="text"
                aria-label={`${current.singular}, ${index + 1} of ${current.count}`}
                placeholder={`${index + 1}.`}
                value={inputs[currentStep][index]}
                onChange={(e) => handleInputChange(index, e.target.value)}
                className="w-full p-3 rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-input)] text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]"
              />
            ))}
          </fieldset>
        )}
      </div>

      {/* Neutral skip path */}
      <p className="text-sm text-center text-[var(--color-text-tertiary)]">
        Can't use this sense right now?{' '}
        <button
          type="button"
          onClick={skipSense}
          className="underline underline-offset-2 hover:text-[var(--color-text-primary)] transition-colors min-h-11"
        >
          Skip it
        </button>
      </p>
    </div>
  );
}
