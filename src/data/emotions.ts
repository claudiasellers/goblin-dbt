export interface Emotion {
  id: string;        // Graph emotion ID (matches Neo4j Emotion nodes)
  name: string;      // User-friendly display name
  quadrant: string;
}

export const emotions: Emotion[] = [
  // High Energy Unpleasant (Red/Coral)
  // IDs match the Neo4j graph Emotion node IDs where direct correspondence exists
  { id: 'anger', name: 'Angry', quadrant: 'high-unpleasant' },
  { id: 'anxiety', name: 'Anxious', quadrant: 'high-unpleasant' },
  { id: 'stress', name: 'Stressed', quadrant: 'high-unpleasant' },
  { id: 'overwhelm', name: 'Overwhelmed', quadrant: 'high-unpleasant' },
  { id: 'frustration', name: 'Frustrated', quadrant: 'high-unpleasant' },
  { id: 'irritation', name: 'Irritated', quadrant: 'high-unpleasant' },
  { id: 'annoyed', name: 'Annoyed', quadrant: 'high-unpleasant' },
  { id: 'worried', name: 'Worried', quadrant: 'high-unpleasant' },
  { id: 'nervous', name: 'Nervous', quadrant: 'high-unpleasant' },
  { id: 'tense', name: 'Tense', quadrant: 'high-unpleasant' },
  { id: 'panic', name: 'Panicked', quadrant: 'high-unpleasant' },
  { id: 'fear', name: 'Scared', quadrant: 'high-unpleasant' },
  { id: 'shocked', name: 'Shocked', quadrant: 'high-unpleasant' },
  { id: 'impassioned', name: 'Impassioned', quadrant: 'high-unpleasant' },
  { id: 'hyper', name: 'Hyper', quadrant: 'high-unpleasant' },
  { id: 'jittery', name: 'Jittery', quadrant: 'high-unpleasant' },
  { id: 'fomo', name: 'FOMO', quadrant: 'high-unpleasant' },
  { id: 'confused', name: 'Confused', quadrant: 'high-unpleasant' },
  { id: 'apprehensive', name: 'Apprehensive', quadrant: 'high-unpleasant' },
  { id: 'restless', name: 'Restless', quadrant: 'high-unpleasant' },
  { id: 'hot_shame', name: 'Embarrassed', quadrant: 'high-unpleasant' },
  { id: 'concerned', name: 'Concerned', quadrant: 'high-unpleasant' },
  { id: 'peeved', name: 'Peeved', quadrant: 'high-unpleasant' },
  { id: 'uneasy', name: 'Uneasy', quadrant: 'high-unpleasant' },
  { id: 'pressured', name: 'Pressured', quadrant: 'high-unpleasant' },

  // High Energy Pleasant (Yellow/Gold)
  { id: 'excitement', name: 'Excited', quadrant: 'high-pleasant' },
  { id: 'joy', name: 'Joyful', quadrant: 'high-pleasant' },
  { id: 'energized', name: 'Energized', quadrant: 'high-pleasant' },
  { id: 'happy', name: 'Happy', quadrant: 'high-pleasant' },
  { id: 'thrilled', name: 'Thrilled', quadrant: 'high-pleasant' },
  { id: 'enthusiasm', name: 'Enthusiastic', quadrant: 'high-pleasant' },
  { id: 'eager', name: 'Eager', quadrant: 'high-pleasant' },
  { id: 'surprised', name: 'Surprised', quadrant: 'high-pleasant' },
  { id: 'cheerful', name: 'Cheerful', quadrant: 'high-pleasant' },
  { id: 'curiosity', name: 'Curious', quadrant: 'high-pleasant' },
  { id: 'pleasant', name: 'Pleasant', quadrant: 'high-pleasant' },
  { id: 'focused', name: 'Focused', quadrant: 'high-pleasant' },
  { id: 'pleased', name: 'Pleased', quadrant: 'high-pleasant' },
  { id: 'amusement', name: 'Playful', quadrant: 'high-pleasant' },
  { id: 'hope', name: 'Hopeful', quadrant: 'high-pleasant' },
  { id: 'pride', name: 'Proud', quadrant: 'high-pleasant' },
  { id: 'confident', name: 'Confident', quadrant: 'high-pleasant' },
  { id: 'inspiration', name: 'Inspired', quadrant: 'high-pleasant' },
  { id: 'motivated', name: 'Motivated', quadrant: 'high-pleasant' },
  { id: 'gratitude', name: 'Grateful', quadrant: 'high-pleasant' },

  // Low Energy Unpleasant (Blue)
  { id: 'sadness', name: 'Sad', quadrant: 'low-unpleasant' },
  { id: 'tired', name: 'Tired', quadrant: 'low-unpleasant' },
  { id: 'loneliness', name: 'Lonely', quadrant: 'low-unpleasant' },
  { id: 'boredom', name: 'Bored', quadrant: 'low-unpleasant' },
  { id: 'down', name: 'Down', quadrant: 'low-unpleasant' },
  { id: 'meh', name: 'Meh', quadrant: 'low-unpleasant' },
  { id: 'fatigued', name: 'Fatigued', quadrant: 'low-unpleasant' },
  { id: 'discouraged', name: 'Discouraged', quadrant: 'low-unpleasant' },
  { id: 'disheartened', name: 'Disheartened', quadrant: 'low-unpleasant' },
  { id: 'disappointment', name: 'Disappointed', quadrant: 'low-unpleasant' },
  { id: 'hopelessness', name: 'Hopeless', quadrant: 'low-unpleasant' },
  { id: 'numbness', name: 'Numb', quadrant: 'low-unpleasant' },
  { id: 'emptiness', name: 'Drained', quadrant: 'low-unpleasant' },
  { id: 'insecure', name: 'Insecure', quadrant: 'low-unpleasant' },
  { id: 'lost', name: 'Lost', quadrant: 'low-unpleasant' },
  { id: 'nostalgic', name: 'Nostalgic', quadrant: 'low-unpleasant' },
  { id: 'disengaged', name: 'Disengaged', quadrant: 'low-unpleasant' },
  { id: 'guilt', name: 'Guilty', quadrant: 'low-unpleasant' },
  { id: 'cold_shame', name: 'Ashamed', quadrant: 'low-unpleasant' },
  { id: 'depleted', name: 'Depleted', quadrant: 'low-unpleasant' },

  // Low Energy Pleasant (Green/Teal)
  { id: 'calm', name: 'Calm', quadrant: 'low-pleasant' },
  { id: 'relaxed', name: 'Relaxed', quadrant: 'low-pleasant' },
  { id: 'serenity', name: 'Peaceful', quadrant: 'low-pleasant' },
  { id: 'contentment', name: 'Content', quadrant: 'low-pleasant' },
  { id: 'good', name: 'Good', quadrant: 'low-pleasant' },
  { id: 'chill', name: 'Chill', quadrant: 'low-pleasant' },
  { id: 'comfortable', name: 'Comfortable', quadrant: 'low-pleasant' },
  { id: 'thoughtful', name: 'Thoughtful', quadrant: 'low-pleasant' },
  { id: 'mellow', name: 'Mellow', quadrant: 'low-pleasant' },
  { id: 'compassion', name: 'Sympathetic', quadrant: 'low-pleasant' },
  { id: 'serene', name: 'Serene', quadrant: 'low-pleasant' },
  { id: 'safety', name: 'Secure', quadrant: 'low-pleasant' },
  { id: 'satisfied', name: 'Satisfied', quadrant: 'low-pleasant' },
  { id: 'restful', name: 'Restful', quadrant: 'low-pleasant' },
  { id: 'appreciative', name: 'Appreciative', quadrant: 'low-pleasant' },
  { id: 'at-ease', name: 'At Ease', quadrant: 'low-pleasant' },
  { id: 'balanced', name: 'Balanced', quadrant: 'low-pleasant' },
  { id: 'grounded', name: 'Grounded', quadrant: 'low-pleasant' },
  { id: 'love', name: 'Tender', quadrant: 'low-pleasant' },
  { id: 'cozy', name: 'Cozy', quadrant: 'low-pleasant' },
];

export function getEmotionsByQuadrant(quadrant: string): Emotion[] {
  return emotions.filter(e => e.quadrant === quadrant);
}

export function getEmotionById(id: string): Emotion | undefined {
  return emotions.find(e => e.id === id);
}

export const quadrantColors: Record<string, { bg: string; text: string }> = {
  'high-unpleasant': { bg: 'bg-[#F786AA]', text: 'text-[#4a3259]' },    // Rose Quartz
  'high-pleasant': { bg: 'bg-[#F9E076]', text: 'text-[#4a3259]' },      // Buttercup Gold
  'low-unpleasant': { bg: 'bg-[#A3C1DA]', text: 'text-[#4a3259]' },     // Periwinkle
  'low-pleasant': { bg: 'bg-[#B2E2D4]', text: 'text-[#4a3259]' },       // Seafoam Mint
};
