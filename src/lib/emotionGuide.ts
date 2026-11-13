/** Know this feeling (ER-10, docs/design/emotion-guide.md): three skills under the one `emotion-guide` tool id. */
export type EmotionGuideSkill = 'emotion_guide' | 'emotion_myths' | 'walk_the_wave';

/**
 * `?frame=myths` plays the myth cards (part 4: It isn't working's belief check, the Tools card), `?frame=wave` Walk
 * the wave (part 2: one episode laid out start to finish); anything else the card.
 */
export function emotionGuideSkillFor(frame: string | null): EmotionGuideSkill {
  if (frame === 'myths') return 'emotion_myths';
  if (frame === 'wave') return 'walk_the_wave';
  return 'emotion_guide';
}

/**
 * The feeling card after naming (ER-10 part 3, docs/design/emotion-guide.md): the first named word that has a card,
 * that is, a word with one of the nine DBT parents in Do the Opposite's picker content (`parentOf`, the graph's
 * `HAS_REGULATION_CONTENT`). Happiness words have a card too, but the pleasant result offers Good things instead, so
 * they aren't looked up here. Null when none has one: no link (a word with no card would land on *There's no card yet*).
 */
export function feelingCardWord(emotionIds: readonly string[], parentOf: Readonly<Record<string, { parent: string | null }>>): string | null {
  return emotionIds.find((id) => !!parentOf[id]?.parent) ?? null;
}
