import { useEffect, useRef, type FocusEvent } from 'react';
import { focusLost, focusStepStart } from '../lib/focusStart';

/**
 * For a list that can disappear with the control that had focus (Today's last card answered, Reflect's
 * last pattern removed): when it unmounts while holding focus and focus fell to the page, focus goes to
 * `target()`'s start (its heading or first line) instead. Put the handlers on the list's root; `target`
 * is read after the list is gone, so it names something outside it. Focus that is somewhere is left alone.
 */
export function useFocusFallback(target: () => HTMLElement | null) {
  const inside = useRef(false);
  const where = useRef(target);
  useEffect(() => { where.current = target; });
  useEffect(() => () => {
    const held = inside;
    const to = where;
    if (held.current) requestAnimationFrame(() => { if (focusLost()) focusStepStart(to.current()); });
  }, []);
  return {
    onFocus: () => { inside.current = true; },
    // Only focus that went somewhere else counts as leaving: a removed control's blur has nowhere to go.
    onBlur: (e: FocusEvent<HTMLElement>) => {
      const to = e.relatedTarget as Node | null;
      if (to && !e.currentTarget.contains(to)) inside.current = false;
    },
  };
}
