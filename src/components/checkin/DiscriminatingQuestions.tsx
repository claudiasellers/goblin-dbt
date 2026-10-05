import { useState, useCallback, useEffect, useRef } from 'react';
import type { DiscriminatingQuestion } from '../../services/neo4j';

interface DiscriminatingQuestionsProps {
  questions: DiscriminatingQuestion[];
  onComplete: (answers: Array<{ questionId: string; responseId: string }>) => void;
  onSkip: () => void;
}

/**
 * 1-2 discriminating questions to differentiate activation patterns
 * within a quadrant. Shows Q1 (required), then conditionally Q2
 * if the selected response has a triggersNextQuestionId. Skip on Q1 skips
 * them all; Skip on a follow-up completes with the answers so far.
 */
export function DiscriminatingQuestions({
  questions,
  onComplete,
  onSkip,
}: DiscriminatingQuestionsProps) {
  const [answers, setAnswers] = useState<Array<{ questionId: string; responseId: string }>>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [transitioning, setTransitioning] = useState(false);
  const shouldSkip = useRef(false);

  // Find the current question to display
  const getActiveQuestion = useCallback((): DiscriminatingQuestion | null => {
    if (currentQuestionIndex === 0) {
      // Always show the first (required) question
      return questions.find(q => q.required) || questions[0] || null;
    }
    // For Q2, find the question that was triggered by Q1's response
    if (answers.length > 0) {
      const lastAnswer = answers[answers.length - 1];
      const lastQuestion = questions.find(q => q.id === lastAnswer.questionId);
      const selectedResponse = lastQuestion?.responses.find(r => r.id === lastAnswer.responseId);
      if (selectedResponse?.triggersNextQuestionId) {
        return questions.find(q => q.id === selectedResponse.triggersNextQuestionId) || null;
      }
    }
    return null;
  }, [currentQuestionIndex, answers, questions]);

  const activeQuestion = getActiveQuestion();

  // Handle missing question via effect (not during render)
  useEffect(() => {
    if (!activeQuestion && shouldSkip.current) {
      onSkip();
    }
  }, [activeQuestion, onSkip]);

  function handleResponseSelect(questionId: string, responseId: string) {
    // A second tap during the fade would add an answer to the question that's leaving (and could skip
    // the spiral path's safety question): ignore it.
    if (transitioning || answers.some((a) => a.questionId === questionId)) return;
    const newAnswers = [...answers, { questionId, responseId }];
    setAnswers(newAnswers);

    // Check if this response triggers a follow-up
    const question = questions.find(q => q.id === questionId);
    const response = question?.responses.find(r => r.id === responseId);

    if (response?.triggersNextQuestionId) {
      // Transition to Q2
      shouldSkip.current = true;
      setTransitioning(true);
      setTimeout(() => {
        setCurrentQuestionIndex(1);
        setTransitioning(false);
      }, 400);
    } else {
      // Done — no follow-up needed
      onComplete(newAnswers);
    }
  }

  if (!activeQuestion) {
    return null;
  }

  return (
    <div className={`transition-opacity duration-400 ${transitioning ? 'opacity-0' : 'opacity-100'}`}>
      <div className="text-center mb-8">
        <h2 className="text-xl font-semibold text-[var(--color-text-primary)] mb-2">
          {activeQuestion.text}
        </h2>
        {activeQuestion.subtext && (
          <p className="text-sm text-[var(--color-text-tertiary)]">
            {activeQuestion.subtext}
          </p>
        )}
      </div>

      <div className="space-y-3 mb-8">
        {activeQuestion.responses
          .sort((a, b) => a.order - b.order)
          .map(response => (
            <button
              key={response.id}
              onClick={() => handleResponseSelect(activeQuestion.id, response.id)}
              className="w-full text-left py-3.5 px-4 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-elevated)] hover:border-[var(--color-border-accent)] transition-all"
            >
              <span className="block font-medium text-[var(--color-text-primary)]">
                {response.label}
              </span>
              {response.subtext && (
                <span className="block text-sm text-[var(--color-text-tertiary)] mt-0.5">
                  {response.subtext}
                </span>
              )}
            </button>
          ))}
      </div>

      <div className="text-center">
        <button
          // Skip on a follow-up keeps what was already answered: skipping the spiral path's safety
          // question must not throw away "I'm spiraling" (and with it the calm 988 line).
          onClick={answers.length > 0 ? () => onComplete(answers) : onSkip}
          className="text-sm text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)] transition-colors"
        >
          Skip
        </button>
      </div>
    </div>
  );
}
