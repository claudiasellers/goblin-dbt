import { useEffect, useRef, type ReactNode } from "react";
import type { FlowChoice } from "../../../data/oppositeActionTypes";
import { ChoiceList } from "./ui";
import { enterAnimation, linkButton, secondaryText } from "./styles";

interface TapCardProps {
  /** 0-based position in the loop and total number of question cards. */
  index: number;
  total: number;
  question: string;
  options: FlowChoice[] | undefined;
  value: string;
  /** Tapping a choice is the only action; the parent decides whether to advance. */
  onSelect: (id: string, option: FlowChoice) => void;
  onPrevious?: () => void;
  /** Extra content above the choices (e.g. a values check). */
  before?: ReactNode;
  /** Extra content below the choices (e.g. optional details, support). */
  after?: ReactNode;
}

/**
 * One question per card, auto-advancing on tap (no Continue button).
 * The parent keys this by question so each card animates in.
 */
export function TapCard({
  index,
  total,
  question,
  options,
  value,
  onSelect,
  onPrevious,
  before,
  after,
}: TapCardProps) {
  const heading = useRef<HTMLHeadingElement>(null);
  // Tapping a choice unmounts the button that had focus; move focus to the new question.
  useEffect(() => {
    heading.current?.focus();
  }, []);
  return (
    <div
      className={`p-5 rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg-elevated)] space-y-4 ${enterAnimation}`}
    >
      <div className="flex items-center justify-between gap-3">
        {onPrevious ? (
          <button type="button" className={`${linkButton} -ml-2`} onClick={onPrevious}>
            ← Previous
          </button>
        ) : (
          <span />
        )}
        <span className={secondaryText}>
          <span className="sr-only">Question </span>
          {index + 1} / {total}
        </span>
      </div>
      {before}
      <h3 ref={heading} tabIndex={-1} className="font-semibold text-lg outline-none">
        {question}
      </h3>
      <ChoiceList options={options} value={value} onSelect={onSelect} label={question} />
      {after}
    </div>
  );
}
