import { useEffect, useRef, type RefObject } from 'react';
import { focusStepStart } from '../../lib/focusStart';

/**
 * Keyboard and screen-reader focus across a parts screen's changes (the app's convention: the new step's
 * heading takes focus, as TapCard and OppositeAction do). Pressing a control that then goes away (a chip
 * that moves the step on, a button replaced by its done line) drops focus to <body>; these put it on what
 * replaced it instead. Focus that is still somewhere (a Prompt that took it, a control that stayed) is
 * left alone. The DOM rules are src/lib/focusStart.ts, shared with Today and DEAR MAN.
 */
export { focusLine, focusLost, focusStepStart } from '../../lib/focusStart';

/** After `step` changes (never on the first render), focusStepStart(ref.current). */
export function useStepFocus(ref: RefObject<HTMLElement | null>, step: unknown): void {
  const last = useRef(step);
  useEffect(() => {
    if (Object.is(last.current, step)) return;
    last.current = step;
    focusStepStart(ref.current);
  }, [ref, step]);
}
