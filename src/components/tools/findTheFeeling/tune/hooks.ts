import { useCallback, useEffect, useRef } from 'react';

/** setTimeout that is cleared when the component unmounts. */
export function useLater() {
  const ids = useRef<number[]>([]);
  useEffect(() => () => { ids.current.forEach(id => window.clearTimeout(id)); ids.current = []; }, []);
  return useCallback((fn: () => void, ms: number) => {
    const id = window.setTimeout(() => { ids.current = ids.current.filter(x => x !== id); fn(); }, ms);
    ids.current.push(id);
    return id;
  }, []);
}
