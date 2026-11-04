/**
 * Check the Facts' link contract (docs/design/check-the-facts.md, decision 8): `/tool/check-the-facts?feel=<grid id>`.
 * The word comes first on screen 1 and is never pre-selected; an id that isn't a grid word is dropped. Pure.
 */
export const CHECK_FACTS_PATH = '/tool/check-the-facts';
const ID = /^[a-z][a-z0-9_]{0,63}$/;

export function checkFactsLink({ emotionId }: { emotionId?: string } = {}): string {
  return emotionId && ID.test(emotionId) ? `${CHECK_FACTS_PATH}?feel=${encodeURIComponent(emotionId)}` : CHECK_FACTS_PATH;
}

export function parseCheckFactsEntry(search: string, gridIds: ReadonlySet<string>): { firstEmotionId: string | null } {
  const feel = new URLSearchParams(search).get('feel');
  return { firstEmotionId: feel && gridIds.has(feel) ? feel : null };
}
