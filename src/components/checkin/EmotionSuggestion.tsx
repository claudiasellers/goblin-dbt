import { useEffect, useState } from 'react';
import { suggestEmotionsFromBody } from '../../services/bodyMap';
import type { BodySuggestion } from '../../data/bodyMapTypes';
import { getEmotionById } from '../../data/emotions';
import { QUADRANT_ABBR } from '../../lib/feelingSquare';
import { regionLabel } from '../../data/bodyFigure';
import type { BodyMark } from './body/BodyStep';

interface EmotionSuggestionProps {
  bodySensations: BodyMark[];
  onSelect: (emotions: string[], quadrant: string) => void;
  onShowAllEmotions: () => void;
  onSkip: () => void;
}

/** Words offered per map: the common ones first, then the rest, up to this many. */
const WORDS_PER_MAP = 6;

function wordsFor(s: BodySuggestion) {
  const known = s.wordIds.map((id) => getEmotionById(id)).filter((e): e is NonNullable<typeof e> => Boolean(e));
  return [...known.filter((e) => e.core), ...known.filter((e) => !e.core)].slice(0, WORDS_PER_MAP);
}

function becauseText(s: BodySuggestion) {
  return s.because.map((b) => `${regionLabel(b.region).toLowerCase()} ${b.label.toLowerCase()}`).join(', ');
}

/** Maps offered for the same places read as one section ("Often with chest racing"), strongest first. */
function sections(suggestions: BodySuggestion[]) {
  const out: Array<{ because: string; words: ReturnType<typeof wordsFor> }> = [];
  for (const s of suggestions) {
    const because = becauseText(s);
    const words = wordsFor(s);
    const same = out.find((x) => x.because === because);
    if (same) same.words.push(...words.filter((w) => !same.words.some((x) => x.id === w.id)));
    else out.push({ because, words });
  }
  return out;
}

/**
 * Body-first entry, after the body step: the feelings the marked places often go with, from the
 * graph's body maps (suggestEmotionsFromBody), grouped by map. Tap any that fit.
 */
export function EmotionSuggestion({ bodySensations, onSelect, onShowAllEmotions, onSkip }: EmotionSuggestionProps) {
  const [suggestions, setSuggestions] = useState<BodySuggestion[] | null>(null);
  const [picked, setPicked] = useState<string[]>([]);

  useEffect(() => {
    let live = true;
    suggestEmotionsFromBody(bodySensations.map((m) => ({ region: m.region, sensationIds: m.sensationIds ?? [] })))
      .then((s) => { if (live) setSuggestions(s); })
      .catch(() => { if (live) setSuggestions([]); });
    return () => { live = false; };
  }, [bodySensations]);

  function toggle(id: string) {
    setPicked((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]));
  }

  function handleContinue() {
    const chosen = picked.map((id) => getEmotionById(id)).filter((e): e is NonNullable<typeof e> => Boolean(e));
    if (chosen.length === 0) return;
    onSelect(chosen.map((e) => e.name), chosen[0].quadrant);
  }

  if (suggestions === null) {
    return <p className="max-w-md mx-auto text-center py-12 text-[var(--color-text-secondary)]">Looking at what your body is telling you…</p>;
  }

  if (suggestions.length === 0) {
    return (
      <div className="max-w-md mx-auto py-6">
        <h2 className="m-0 text-[2rem] leading-[1.08] text-[var(--color-text-primary)]">Not sure yet</h2>
        <p className="mt-3 text-[16px] leading-relaxed text-[var(--color-text-secondary)]">
          Your body is telling you something, but there isn’t enough to go on yet. You can pick from all the words instead.
        </p>
        <div className="mt-6 flex flex-col gap-3">
          <button type="button" onClick={onShowAllEmotions}
            className="w-full min-h-[56px] rounded-[18px] text-[17px] font-bold bg-[var(--color-accent-fill)] text-[var(--color-on-accent)] border-none cursor-pointer lift-primary">
            Pick from all the words
          </button>
          <button type="button" onClick={onSkip} className="den-chip w-full">Skip, just help me now</button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto flex flex-col">
      <h2 className="m-0 text-[2rem] leading-[1.08] text-[var(--color-text-primary)] [text-wrap:balance]">
        These often go with what you noticed
      </h2>
      <p className="mt-2 text-[15px] text-[var(--color-text-secondary)]">Tap any that fit. “Sort of” counts.</p>

      {sections(suggestions).map((sec) => (
        <section key={sec.because} className="mt-5" aria-label={`Often with ${sec.because}`}>
          <p className="m-0 mb-2 text-[13px] font-bold text-[var(--color-text-secondary)]">
            Often with {sec.because}
          </p>
          <div className="flex flex-wrap gap-2">
            {sec.words.map((e) => (
              <button key={e.id} type="button" className="den-chip den-chip--small" aria-pressed={picked.includes(e.id)}
                style={{ ['--chip-on' as string]: `var(--color-q-${QUADRANT_ABBR[e.quadrant] ?? 'hu'}-fill)` }}
                onClick={() => toggle(e.id)}>
                {e.name}
              </button>
            ))}
          </div>
        </section>
      ))}

      <div className="mt-5 flex justify-center">
        <button type="button" onClick={onShowAllEmotions}
          className="min-h-11 px-2 text-[15px] font-semibold text-[var(--color-accent)] bg-transparent border-none cursor-pointer">
          I feel something else
        </button>
      </div>

      <div className="action-dock">
        {picked.length > 0 ? (
          <button type="button" onClick={handleContinue}
            className="w-full min-h-[60px] rounded-[18px] text-[17px] font-bold bg-[var(--color-accent-fill)] text-[var(--color-on-accent)] border-none cursor-pointer lift-primary">
            {`Continue with ${picked.length} ${picked.length === 1 ? 'word' : 'words'}`}
          </button>
        ) : (
          <button type="button" onClick={onSkip} className="den-chip w-full min-h-[56px]">Skip, just help me now</button>
        )}
      </div>
    </div>
  );
}
