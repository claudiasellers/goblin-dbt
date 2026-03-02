export interface Emotion {
  id: string;
  name: string;
  quadrant: string;
  family?: string;
  oppositeIds?: string[];
}

const FAMILY_OPPOSITE: Record<string, string> = {
  happy: 'sad',
  sad: 'happy',
  surprised: 'disgusted',
  disgusted: 'surprised',
  fearful: 'angry',
  angry: 'fearful',
  bad: 'happy',
};

function makeEmotion(
  id: string,
  name: string,
  quadrant: string,
  family: string
): Emotion {
  return {
    id,
    name,
    quadrant,
    family,
  };
}

// Includes the full user-provided wheel vocabulary plus existing low-pleasant states.
export const emotions: Emotion[] = [
  // High Energy Unpleasant
  makeEmotion('fearful', 'Fearful', 'high-unpleasant', 'fearful'),
  makeEmotion('scared', 'Scared', 'high-unpleasant', 'fearful'),
  makeEmotion('anxious', 'Anxious', 'high-unpleasant', 'fearful'),
  makeEmotion('insecure', 'Insecure', 'high-unpleasant', 'fearful'),
  makeEmotion('weak', 'Weak', 'high-unpleasant', 'fearful'),
  makeEmotion('rejected', 'Rejected', 'high-unpleasant', 'fearful'),
  makeEmotion('helpless', 'Helpless', 'high-unpleasant', 'fearful'),
  makeEmotion('frightened', 'Frightened', 'high-unpleasant', 'fearful'),
  makeEmotion('worried', 'Worried', 'high-unpleasant', 'fearful'),
  makeEmotion('overwhelmed', 'Overwhelmed', 'high-unpleasant', 'fearful'),
  makeEmotion('inadequate', 'Inadequate', 'high-unpleasant', 'fearful'),
  makeEmotion('inferior', 'Inferior', 'high-unpleasant', 'fearful'),
  makeEmotion('worthless', 'Worthless', 'high-unpleasant', 'fearful'),
  makeEmotion('insignificant', 'Insignificant', 'high-unpleasant', 'fearful'),
  makeEmotion('excluded', 'Excluded', 'high-unpleasant', 'fearful'),
  makeEmotion('persecuted', 'Persecuted', 'high-unpleasant', 'fearful'),
  makeEmotion('nervous', 'Nervous', 'high-unpleasant', 'fearful'),
  makeEmotion('exposed', 'Exposed', 'high-unpleasant', 'fearful'),

  makeEmotion('angry', 'Angry', 'high-unpleasant', 'angry'),
  makeEmotion('threatened', 'Threatened', 'high-unpleasant', 'angry'),
  makeEmotion('let_down', 'Let down', 'high-unpleasant', 'angry'),
  makeEmotion('humiliated', 'Humiliated', 'high-unpleasant', 'angry'),
  makeEmotion('bitter', 'Bitter', 'high-unpleasant', 'angry'),
  makeEmotion('mad', 'Mad', 'high-unpleasant', 'angry'),
  makeEmotion('aggressive', 'Aggressive', 'high-unpleasant', 'angry'),
  makeEmotion('frustrated', 'Frustrated', 'high-unpleasant', 'angry'),
  makeEmotion('distant', 'Distant', 'high-unpleasant', 'angry'),
  makeEmotion('critical', 'Critical', 'high-unpleasant', 'angry'),
  makeEmotion('betrayed', 'Betrayed', 'high-unpleasant', 'angry'),
  makeEmotion('resentful', 'Resentful', 'high-unpleasant', 'angry'),
  makeEmotion('disrespected', 'Disrespected', 'high-unpleasant', 'angry'),
  makeEmotion('ridiculed', 'Ridiculed', 'high-unpleasant', 'angry'),
  makeEmotion('indignant', 'Indignant', 'high-unpleasant', 'angry'),
  makeEmotion('violated', 'Violated', 'high-unpleasant', 'angry'),
  makeEmotion('furious', 'Furious', 'high-unpleasant', 'angry'),
  makeEmotion('jealous', 'Jealous', 'high-unpleasant', 'angry'),
  makeEmotion('provoked', 'Provoked', 'high-unpleasant', 'angry'),
  makeEmotion('hostile', 'Hostile', 'high-unpleasant', 'angry'),
  makeEmotion('infuriated', 'Infuriated', 'high-unpleasant', 'angry'),
  makeEmotion('annoyed', 'Annoyed', 'high-unpleasant', 'angry'),
  makeEmotion('withdrawn', 'Withdrawn', 'high-unpleasant', 'angry'),
  makeEmotion('numb', 'Numb', 'high-unpleasant', 'angry'),
  makeEmotion('skeptical', 'Skeptical', 'high-unpleasant', 'angry'),
  makeEmotion('dismissive', 'Dismissive', 'high-unpleasant', 'angry'),
  makeEmotion('stressed', 'Stressed', 'high-unpleasant', 'bad'),
  makeEmotion('busy', 'Busy', 'high-unpleasant', 'bad'),
  makeEmotion('rushed', 'Rushed', 'high-unpleasant', 'bad'),
  makeEmotion('pressured', 'Pressured', 'high-unpleasant', 'bad'),
  makeEmotion('out_of_control', 'Out of control', 'high-unpleasant', 'bad'),

  // High Energy Pleasant
  makeEmotion('happy', 'Happy', 'high-pleasant', 'happy'),
  makeEmotion('playful', 'Playful', 'high-pleasant', 'happy'),
  makeEmotion('interested', 'Interested', 'high-pleasant', 'happy'),
  makeEmotion('proud', 'Proud', 'high-pleasant', 'happy'),
  makeEmotion('accepted', 'Accepted', 'high-pleasant', 'happy'),
  makeEmotion('powerful', 'Powerful', 'high-pleasant', 'happy'),
  makeEmotion('optimistic', 'Optimistic', 'high-pleasant', 'happy'),
  makeEmotion('aroused', 'Aroused', 'high-pleasant', 'happy'),
  makeEmotion('cheeky', 'Cheeky', 'high-pleasant', 'happy'),
  makeEmotion('joyful', 'Joyful', 'high-pleasant', 'happy'),
  makeEmotion('curious', 'Curious', 'high-pleasant', 'happy'),
  makeEmotion('inquisitive', 'Inquisitive', 'high-pleasant', 'happy'),
  makeEmotion('successful', 'Successful', 'high-pleasant', 'happy'),
  makeEmotion('confident', 'Confident', 'high-pleasant', 'happy'),
  makeEmotion('respected', 'Respected', 'high-pleasant', 'happy'),
  makeEmotion('valued', 'Valued', 'high-pleasant', 'happy'),
  makeEmotion('courageous', 'Courageous', 'high-pleasant', 'happy'),
  makeEmotion('creative', 'Creative', 'high-pleasant', 'happy'),
  makeEmotion('hopeful', 'Hopeful', 'high-pleasant', 'happy'),
  makeEmotion('inspired', 'Inspired', 'high-pleasant', 'happy'),

  makeEmotion('surprised', 'Surprised', 'high-pleasant', 'surprised'),
  makeEmotion('startled', 'Startled', 'high-pleasant', 'surprised'),
  makeEmotion('confused', 'Confused', 'high-pleasant', 'surprised'),
  makeEmotion('amazed', 'Amazed', 'high-pleasant', 'surprised'),
  makeEmotion('excited', 'Excited', 'high-pleasant', 'surprised'),
  makeEmotion('shocked', 'Shocked', 'high-pleasant', 'surprised'),
  makeEmotion('dismayed', 'Dismayed', 'high-pleasant', 'surprised'),
  makeEmotion('disillusioned', 'Disillusioned', 'high-pleasant', 'surprised'),
  makeEmotion('perplexed', 'Perplexed', 'high-pleasant', 'surprised'),
  makeEmotion('astonished', 'Astonished', 'high-pleasant', 'surprised'),
  makeEmotion('awe', 'Awe', 'high-pleasant', 'surprised'),
  makeEmotion('eager', 'Eager', 'high-pleasant', 'surprised'),
  makeEmotion('energetic', 'Energetic', 'high-pleasant', 'surprised'),

  // Low Energy Unpleasant
  makeEmotion('bad', 'Bad', 'low-unpleasant', 'bad'),
  makeEmotion('tired', 'Tired', 'low-unpleasant', 'bad'),
  makeEmotion('bored', 'Bored', 'low-unpleasant', 'bad'),
  makeEmotion('sleepy', 'Sleepy', 'low-unpleasant', 'bad'),
  makeEmotion('unfocused', 'Unfocused', 'low-unpleasant', 'bad'),
  makeEmotion('apathetic', 'Apathetic', 'low-unpleasant', 'bad'),
  makeEmotion('indifferent', 'Indifferent', 'low-unpleasant', 'bad'),

  makeEmotion('disgusted', 'Disgusted', 'low-unpleasant', 'disgusted'),
  makeEmotion('disapproving', 'Disapproving', 'low-unpleasant', 'disgusted'),
  makeEmotion('disappointed', 'Disappointed', 'low-unpleasant', 'disgusted'),
  makeEmotion('awful', 'Awful', 'low-unpleasant', 'disgusted'),
  makeEmotion('repelled', 'Repelled', 'low-unpleasant', 'disgusted'),
  makeEmotion('judgmental', 'Judgmental', 'low-unpleasant', 'disgusted'),
  makeEmotion('embarrassed', 'Embarrassed', 'low-unpleasant', 'disgusted'),
  makeEmotion('appalled', 'Appalled', 'low-unpleasant', 'disgusted'),
  makeEmotion('revolted', 'Revolted', 'low-unpleasant', 'disgusted'),
  makeEmotion('nauseated', 'Nauseated', 'low-unpleasant', 'disgusted'),
  makeEmotion('detestable', 'Detestable', 'low-unpleasant', 'disgusted'),
  makeEmotion('horrified', 'Horrified', 'low-unpleasant', 'disgusted'),
  makeEmotion('hesitant', 'Hesitant', 'low-unpleasant', 'disgusted'),

  makeEmotion('sad', 'Sad', 'low-unpleasant', 'sad'),
  makeEmotion('lonely', 'Lonely', 'low-unpleasant', 'sad'),
  makeEmotion('vulnerable', 'Vulnerable', 'low-unpleasant', 'sad'),
  makeEmotion('despair', 'Despair', 'low-unpleasant', 'sad'),
  makeEmotion('guilty', 'Guilty', 'low-unpleasant', 'sad'),
  makeEmotion('depressed', 'Depressed', 'low-unpleasant', 'sad'),
  makeEmotion('hurt', 'Hurt', 'low-unpleasant', 'sad'),
  makeEmotion('isolated', 'Isolated', 'low-unpleasant', 'sad'),
  makeEmotion('abandoned', 'Abandoned', 'low-unpleasant', 'sad'),
  makeEmotion('victimized', 'Victimized', 'low-unpleasant', 'sad'),
  makeEmotion('fragile', 'Fragile', 'low-unpleasant', 'sad'),
  makeEmotion('grief', 'Grief', 'low-unpleasant', 'sad'),
  makeEmotion('powerless', 'Powerless', 'low-unpleasant', 'sad'),
  makeEmotion('ashamed', 'Ashamed', 'low-unpleasant', 'sad'),
  makeEmotion('remorseful', 'Remorseful', 'low-unpleasant', 'sad'),
  makeEmotion('empty', 'Empty', 'low-unpleasant', 'sad'),

  // Low Energy Pleasant
  makeEmotion('calm', 'Calm', 'low-pleasant', 'happy'),
  makeEmotion('relaxed', 'Relaxed', 'low-pleasant', 'happy'),
  makeEmotion('peaceful', 'Peaceful', 'low-pleasant', 'happy'),
  makeEmotion('content', 'Content', 'low-pleasant', 'happy'),
  makeEmotion('trusting', 'Trusting', 'low-pleasant', 'happy'),
  makeEmotion('sensitive', 'Sensitive', 'low-pleasant', 'happy'),
  makeEmotion('intimate', 'Intimate', 'low-pleasant', 'happy'),
  makeEmotion('loving', 'Loving', 'low-pleasant', 'happy'),
  makeEmotion('thankful', 'Thankful', 'low-pleasant', 'happy'),
  makeEmotion('good', 'Good', 'low-pleasant', 'happy'),
  makeEmotion('chill', 'Chill', 'low-pleasant', 'happy'),
  makeEmotion('comfortable', 'Comfortable', 'low-pleasant', 'happy'),
  makeEmotion('thoughtful', 'Thoughtful', 'low-pleasant', 'happy'),
  makeEmotion('mellow', 'Mellow', 'low-pleasant', 'happy'),
  makeEmotion('sympathetic', 'Sympathetic', 'low-pleasant', 'happy'),
  makeEmotion('serene', 'Serene', 'low-pleasant', 'happy'),
  makeEmotion('secure', 'Secure', 'low-pleasant', 'happy'),
  makeEmotion('satisfied', 'Satisfied', 'low-pleasant', 'happy'),
  makeEmotion('restful', 'Restful', 'low-pleasant', 'happy'),
  makeEmotion('appreciative', 'Appreciative', 'low-pleasant', 'happy'),
  makeEmotion('at_ease', 'At Ease', 'low-pleasant', 'happy'),
  makeEmotion('balanced', 'Balanced', 'low-pleasant', 'happy'),
  makeEmotion('grounded', 'Grounded', 'low-pleasant', 'happy'),
  makeEmotion('tender', 'Tender', 'low-pleasant', 'happy'),
  makeEmotion('cozy', 'Cozy', 'low-pleasant', 'happy'),
  makeEmotion('humble', 'Humble', 'low-pleasant', 'happy'),
];

const emotionById = new Map(emotions.map((emotion) => [emotion.id, emotion]));
const emotionByName = new Map(
  emotions.map((emotion) => [emotion.name.toLowerCase(), emotion])
);

export function getEmotionsByQuadrant(quadrant: string): Emotion[] {
  return emotions.filter(e => e.quadrant === quadrant);
}

export function getEmotionById(id: string): Emotion | undefined {
  return emotionById.get(id);
}

export function getEmotionByName(name: string): Emotion | undefined {
  return emotionByName.get(name.toLowerCase());
}

export function getRelatedEmotionIds(emotionId: string): string[] {
  const selected = getEmotionById(emotionId);
  if (!selected?.family) return [];

  return emotions
    .filter(e => e.id !== emotionId && e.family === selected.family)
    .slice(0, 8)
    .map(e => e.id);
}

export function getOppositeEmotionIds(emotionId: string): string[] {
  const selected = getEmotionById(emotionId);
  if (!selected?.family) return [];

  const oppositeFamily = FAMILY_OPPOSITE[selected.family];
  if (!oppositeFamily) return [];

  return emotions
    .filter(e => e.family === oppositeFamily)
    .slice(0, 6)
    .map(e => e.id);
}

export const quadrantColors: Record<string, { bg: string; text: string }> = {
  'high-unpleasant': { bg: 'bg-[var(--color-q-hu-fill)]', text: 'text-white' },
  'high-pleasant': { bg: 'bg-[var(--color-q-hp-fill)]', text: 'text-[var(--color-text-primary)]' },
  'low-unpleasant': { bg: 'bg-[var(--color-q-lu-fill)]', text: 'text-white' },
  'low-pleasant': { bg: 'bg-[var(--color-q-lp-fill)]', text: 'text-[var(--color-text-primary)]' },
};
