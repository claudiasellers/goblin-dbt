import { useState } from 'react';

const steps = [
  {
    letter: 'S',
    title: 'Stop',
    instruction: 'Freeze. Don\'t move. Don\'t react yet.',
    prompt: 'Take a moment to just stop what you\'re doing.',
  },
  {
    letter: 'T',
    title: 'Take a breath',
    instruction: 'Breathe slowly and deeply. In through your nose, out through your mouth.',
    prompt: 'Take 3 slow, deep breaths.',
  },
  {
    letter: 'O',
    title: 'Observe',
    instruction: 'Notice what\'s happening inside you and around you. What are you feeling? What triggered this?',
    prompt: 'What do you notice right now?',
  },
  {
    letter: 'P',
    title: 'Proceed mindfully',
    instruction: 'Now choose how to respond. What action would be effective right now?',
    prompt: 'What\'s one thing you could do that would help?',
  },
];

export function Pause() {
  const [currentStep, setCurrentStep] = useState(0);
  const [responses, setResponses] = useState<string[]>(['', '', '', '']);
  const [isComplete, setIsComplete] = useState(false);

  const current = steps[currentStep];

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      setIsComplete(true);
    }
  };

  const reset = () => {
    setCurrentStep(0);
    setResponses(['', '', '', '']);
    setIsComplete(false);
  };

  if (isComplete) {
    return (
      <div className="text-center p-8 rounded-xl bg-[var(--color-sage-100)] dark:bg-[var(--color-sage-800)]">
        <span className="text-4xl mb-4 block">✨</span>
        <h3 className="text-xl font-semibold text-[var(--color-sage-800)] dark:text-[var(--color-warm-100)] mb-2">
          You paused.
        </h3>
        <p className="text-[var(--color-sage-600)] dark:text-[var(--color-sage-300)] mb-6">
          That moment of pause gave you space to choose your response instead of just reacting.
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

  return (
    <div className="space-y-6">
      {/* STOP letters indicator */}
      <div className="flex justify-center gap-2">
        {steps.map((step, index) => (
          <div
            key={step.letter}
            className={`
              w-10 h-10 rounded-lg flex items-center justify-center font-bold text-lg transition-all
              ${index < currentStep
                ? 'bg-[var(--color-sage-500)] text-white'
                : index === currentStep
                ? 'bg-[var(--color-sage-700)] dark:bg-[var(--color-sage-300)] text-white dark:text-[var(--color-sage-900)]'
                : 'bg-[var(--color-sage-200)] dark:bg-[var(--color-sage-700)] text-[var(--color-sage-400)]'
              }
            `}
          >
            {step.letter}
          </div>
        ))}
      </div>

      {/* Current step */}
      <div className="p-6 rounded-xl bg-[var(--color-warm-100)] dark:bg-[var(--color-sage-800)] border border-[var(--color-sage-200)] dark:border-[var(--color-sage-700)]">
        <div className="text-center mb-4">
          <span className="text-4xl font-bold text-[var(--color-sage-600)] dark:text-[var(--color-sage-400)]">
            {current.letter}
          </span>
          <h3 className="text-xl font-semibold text-[var(--color-sage-800)] dark:text-[var(--color-warm-100)]">
            {current.title}
          </h3>
        </div>

        <p className="text-[var(--color-sage-700)] dark:text-[var(--color-sage-300)] text-center mb-6">
          {current.instruction}
        </p>

        {/* Response input for O and P steps */}
        {(currentStep === 2 || currentStep === 3) && (
          <div className="mb-4">
            <label className="block text-sm text-[var(--color-sage-600)] dark:text-[var(--color-sage-400)] mb-2">
              {current.prompt}
            </label>
            <textarea
              value={responses[currentStep]}
              onChange={(e) => {
                const newResponses = [...responses];
                newResponses[currentStep] = e.target.value;
                setResponses(newResponses);
              }}
              rows={3}
              className="w-full p-3 rounded-lg border border-[var(--color-sage-300)] dark:border-[var(--color-sage-600)] bg-white dark:bg-[var(--color-sage-900)] text-[var(--color-sage-800)] dark:text-[var(--color-warm-100)] placeholder:text-[var(--color-sage-400)] focus:outline-none focus:ring-2 focus:ring-[var(--color-sage-400)] resize-none"
              placeholder="(optional)"
            />
          </div>
        )}

        <button
          onClick={handleNext}
          className="w-full py-3 px-4 rounded-lg bg-[var(--color-sage-600)] hover:bg-[var(--color-sage-700)] text-white font-medium transition-colors"
        >
          {currentStep < steps.length - 1 ? `Next: ${steps[currentStep + 1].title}` : 'Done'}
        </button>
      </div>
    </div>
  );
}
