import { useState } from 'react';

const senses = [
  { count: 5, sense: 'SEE', prompt: 'things you can see', emoji: '👁️' },
  { count: 4, sense: 'TOUCH', prompt: 'things you can feel/touch', emoji: '✋' },
  { count: 3, sense: 'HEAR', prompt: 'things you can hear', emoji: '👂' },
  { count: 2, sense: 'SMELL', prompt: 'things you can smell', emoji: '👃' },
  { count: 1, sense: 'TASTE', prompt: 'thing you can taste', emoji: '👅' },
];

export function FiveSenses() {
  const [currentStep, setCurrentStep] = useState(0);
  const [inputs, setInputs] = useState<string[][]>(senses.map(s => Array(s.count).fill('')));
  const [isComplete, setIsComplete] = useState(false);

  const current = senses[currentStep];

  const handleInputChange = (index: number, value: string) => {
    const newInputs = [...inputs];
    newInputs[currentStep][index] = value;
    setInputs(newInputs);
  };

  const canProceed = inputs[currentStep].some(input => input.trim() !== '');

  const nextStep = () => {
    if (currentStep < senses.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      setIsComplete(true);
    }
  };

  const reset = () => {
    setCurrentStep(0);
    setInputs(senses.map(s => Array(s.count).fill('')));
    setIsComplete(false);
  };

  if (isComplete) {
    return (
      <div className="text-center p-8 rounded-xl bg-[var(--color-bg-elevated)]">
        <span className="text-4xl mb-4 block">🌟</span>
        <h3 className="text-xl font-semibold text-[var(--color-text-primary)] mb-2">
          Well done!
        </h3>
        <p className="text-[var(--color-text-secondary)] mb-6">
          You've grounded yourself in the present moment.
        </p>
        <button
          onClick={reset}
          className="py-2 px-4 rounded-lg border border-[var(--color-border)] text-[var(--color-text-secondary)] lift-secondary"
        >
          Do it again
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Progress indicator */}
      <div className="flex justify-center gap-2">
        {senses.map((_, index) => (
          <div
            key={index}
            className={`w-3 h-3 rounded-full transition-colors ${
              index < currentStep
                ? 'bg-[var(--color-accent)]'
                : index === currentStep
                ? 'bg-[var(--color-accent-hover)]'
                : 'bg-[var(--color-bg-secondary)]'
            }`}
          />
        ))}
      </div>

      {/* Current sense */}
      <div className="text-center mb-6">
        <span className="text-4xl mb-2 block">{current.emoji}</span>
        <h3 className="text-2xl font-bold text-[var(--color-text-primary)]">
          {current.count} {current.prompt}
        </h3>
      </div>

      {/* Input fields */}
      <div className="space-y-3">
        {Array.from({ length: current.count }).map((_, index) => (
          <input
            key={index}
            type="text"
            placeholder={`${index + 1}.`}
            value={inputs[currentStep][index]}
            onChange={(e) => handleInputChange(index, e.target.value)}
            className="w-full p-3 rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-input)] text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]"
          />
        ))}
      </div>

      {/* Next button */}
      <button
        onClick={nextStep}
        disabled={!canProceed}
        className={`w-full py-3 px-4 rounded-lg font-medium transition-colors ${
          canProceed
            ? 'bg-[var(--color-accent)] text-white lift-primary'
            : 'bg-[var(--color-bg-secondary)] text-[var(--color-text-muted)] cursor-not-allowed'
        }`}
      >
        {currentStep < senses.length - 1 ? 'Next' : 'Finish'}
      </button>

      <p className="text-sm text-center text-[var(--color-text-tertiary)]">
        You don't have to fill in all {current.count}—just notice what you can.
      </p>
    </div>
  );
}
