import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getEmotionById } from '../../data/emotions';
import { feelingCardWord } from '../../lib/emotionGuide';
import { getOppositeActionPickerContent } from '../../services/oppositeActionPicker';

/**
 * The feeling card after naming (ER-10 part 3, docs/design/emotion-guide.md): a quiet link under a result, never a
 * screen of its own (the card is one tap away; nothing is added before help). Shown only for a word that has a card;
 * the word goes in as the carried word, so the card opens on it.
 */
export function FeelingCardLink({ emotionIds, state, onOpen, className = '' }: {
  emotionIds: readonly string[];
  /** The link state (`fromCheckIn(…)` from a check-in result): it must carry the word as `checkinEmotions`. */
  state: (word: string) => unknown;
  onOpen?: () => void;
  className?: string;
}) {
  const [found, setFound] = useState<{ key: string; word: string | null } | null>(null);
  const key = emotionIds.join('|');
  useEffect(() => {
    if (!key) return;
    let live = true;
    getOppositeActionPickerContent()
      .then((c) => { if (live) setFound({ key, word: feelingCardWord(key.split('|'), c.words) }); })
      .catch(() => { if (live) setFound({ key, word: null }); });
    return () => { live = false; };
  }, [key]);
  const word = key && found?.key === key ? found.word : null;
  if (!word) return null;
  const name = (getEmotionById(word)?.name ?? word.replace(/_/g, ' ')).toLowerCase();
  return (
    <Link to="/tool/emotion-guide" state={state(word)} onClick={onOpen}
      className={`block w-full min-h-11 py-2 text-center text-[16px] text-[var(--color-text-secondary)] underline underline-offset-2 ${className}`}>
      Get to know “{name}”
    </Link>
  );
}
