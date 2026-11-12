/** Know this feeling (ER-10, docs/design/emotion-guide.md): two skills under the one `emotion-guide` tool id. */
export type EmotionGuideSkill = 'emotion_guide' | 'emotion_myths';

/** `?frame=myths` plays the myth cards (part 4: It isn't working's belief check, the Tools card); anything else the card. */
export function emotionGuideSkillFor(frame: string | null): EmotionGuideSkill {
  return frame === 'myths' ? 'emotion_myths' : 'emotion_guide';
}
