import { useMemo, useState } from 'react';
import type { SafetyContent } from '../data/safetyTypes';
import { COUNTRY_KEY, countryFromLanguages } from '../lib/safetyRoute';

/** The country the lines are for: the person's pick on this device, else the browser's region, else unknown. */
export function useSafetyCountry(content: SafetyContent | null): [string | null, (id: string) => void] {
  const [picked, setPicked] = useState<string | null>(null);
  const fallback = useMemo(() => {
    if (!content) return null;
    let saved: string | null = null;
    try { saved = localStorage.getItem(COUNTRY_KEY); } catch { /* private mode */ }
    if (saved && content.countries.some((c) => c.id === saved)) return saved;
    const langs = typeof navigator === 'undefined' ? [] : (navigator.languages ?? [navigator.language]);
    return countryFromLanguages(langs, content.countries);
  }, [content]);
  const pick = (id: string) => {
    setPicked(id);
    try { localStorage.setItem(COUNTRY_KEY, id); } catch { /* private mode */ }
  };
  return [picked ?? fallback, pick];
}
