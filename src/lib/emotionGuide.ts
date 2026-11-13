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
