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
      <div className="text-center p-8 rounded-xl bg-[var(--color-sage-100)] dark:bg-[var(--color-sage-800)]">
        <span className="text-4xl mb-4 block">🌟</span>
        <h3 className="text-xl font-semibold text-[var(--color-sage-800)] dark:text-[var(--color-warm-100)] mb-2">
          Well done!
        </h3>
        <p className="text-[var(--color-sage-600)] dark:text-[var(--color-sage-300)] mb-6">
          You've grounded yourself in the present moment.
        </p>
        <button
          onClick={reset}
          className="py-2 px-4 rounded-lg border border-[var(--color-sage-300)] dark:border-[var(--color-sage-600)] text-[var(--color-sage-700)] dark:text-[var(--color-sage-300)] hover:bg-[var(--color-sage-200)] dark:hover:bg-[var(--color-sage-700)] transition-colors"
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
                ? 'bg-[var(--color-sage-500)]'
                : index === currentStep
                ? 'bg-[var(--color-sage-700)] dark:bg-[var(--color-sage-300)]'
                : 'bg-[var(--color-sage-200)] dark:bg-[var(--color-sage-700)]'
            }`}
          />
        ))}
      </div>

      {/* Current sense */}
      <div className="text-center mb-6">
        <span className="text-4xl mb-2 block">{current.emoji}</span>
        <h3 className="text-2xl font-bold text-[var(--color-sage-800)] dark:text-[var(--color-warm-100)]">
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
            className="w-full p-3 rounded-lg border border-[var(--color-sage-300)] dark:border-[var(--color-sage-600)] bg-white dark:bg-[var(--color-sage-800)] text-[var(--color-sage-800)] dark:text-[var(--color-warm-100)] placeholder:text-[var(--color-sage-400)] focus:outline-none focus:ring-2 focus:ring-[var(--color-sage-400)]"
          />
        ))}
      </div>

      {/* Next button */}
      <button
        onClick={nextStep}
        disabled={!canProceed}
        className={`w-full py-3 px-4 rounded-lg font-medium transition-colors ${
          canProceed
            ? 'bg-[var(--color-sage-600)] hover:bg-[var(--color-sage-700)] text-white'
            : 'bg-[var(--color-sage-200)] dark:bg-[var(--color-sage-700)] text-[var(--color-sage-400)] cursor-not-allowed'
        }`}
      >
        {currentStep < senses.length - 1 ? 'Next' : 'Finish'}
      </button>

      <p className="text-sm text-center text-[var(--color-sage-500)] dark:text-[var(--color-sage-400)]">
        You don't have to fill in all {current.count}—just notice what you can.
      </p>
    </div>
  );
}
