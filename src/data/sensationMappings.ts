import type { Emotion } from './emotions';
import { getEmotionById } from './emotions';

interface BodySensation {
  region: string;
  tags: string[];
}

export interface ScoredEmotion {
  emotion: Emotion;
  score: number;
  reason: string;
}

// Maps (region, sensation tag) pairs to likely emotion IDs.
// Based on somatic psychology research: emotions reliably manifest
// in specific body regions with characteristic qualities.
const REGION_TAG_EMOTIONS: Record<string, Record<string, string[]>> = {
  Head: {
    Tension: ['stressed', 'anxious', 'overwhelmed', 'frustrated'],
    Pressure: ['stressed', 'overwhelmed', 'worried', 'pressured'],
    Pain: ['stressed', 'angry', 'frustrated', 'overwhelmed'],
    Heaviness: ['sad', 'depressed', 'tired', 'guilty'],
    Buzzing: ['anxious', 'nervous', 'excited', 'overwhelmed'],
    Pulsing: ['angry', 'stressed', 'anxious', 'frustrated'],
    Numbness: ['numb', 'depressed', 'empty', 'apathetic'],
    Warmth: ['embarrassed', 'ashamed', 'angry', 'happy'],
    Lightness: ['happy', 'calm', 'peaceful', 'hopeful'],
    Tingling: ['excited', 'anxious', 'nervous', 'curious'],
  },
  Face: {
    Warmth: ['embarrassed', 'ashamed', 'angry', 'happy'],
    Burning: ['embarrassed', 'ashamed', 'humiliated', 'angry'],
    Tension: ['angry', 'frustrated', 'stressed', 'anxious'],
    Tightness: ['anxious', 'fearful', 'stressed', 'angry'],
    Tingling: ['excited', 'nervous', 'anxious', 'happy'],
    Numbness: ['numb', 'shocked', 'depressed', 'empty'],
    Heaviness: ['sad', 'tired', 'depressed', 'guilty'],
    Pain: ['sad', 'grief', 'hurt', 'stressed'],
  },
  Neck: {
    Tension: ['stressed', 'anxious', 'angry', 'frustrated'],
    Tightness: ['anxious', 'fearful', 'stressed', 'overwhelmed'],
    Pain: ['stressed', 'angry', 'frustrated', 'sad'],
    Constricting: ['anxious', 'fearful', 'overwhelmed', 'stressed'],
    Heaviness: ['sad', 'depressed', 'guilty', 'ashamed'],
  },
  'Left Shoulder': {
    Tension: ['stressed', 'anxious', 'overwhelmed', 'burdened'],
    Heaviness: ['sad', 'depressed', 'overwhelmed', 'guilty'],
    Pain: ['stressed', 'overwhelmed', 'frustrated', 'sad'],
    Tightness: ['anxious', 'stressed', 'fearful', 'angry'],
  },
  'Right Shoulder': {
    Tension: ['stressed', 'anxious', 'overwhelmed', 'burdened'],
    Heaviness: ['sad', 'depressed', 'overwhelmed', 'guilty'],
    Pain: ['stressed', 'overwhelmed', 'frustrated', 'sad'],
    Tightness: ['anxious', 'stressed', 'fearful', 'angry'],
  },
  Chest: {
    Tightness: ['anxious', 'fearful', 'scared', 'worried'],
    Heaviness: ['sad', 'grief', 'depressed', 'lonely'],
    Constricting: ['anxious', 'fearful', 'scared', 'overwhelmed'],
    Pressure: ['anxious', 'stressed', 'overwhelmed', 'fearful'],
    Warmth: ['loving', 'thankful', 'happy', 'content'],
    Expanding: ['happy', 'joyful', 'proud', 'hopeful'],
    Fluttering: ['anxious', 'nervous', 'excited', 'scared'],
    Pain: ['grief', 'hurt', 'sad', 'lonely'],
    Burning: ['angry', 'frustrated', 'resentful', 'hurt'],
    Ease: ['calm', 'peaceful', 'content', 'relaxed'],
    Relaxed: ['calm', 'peaceful', 'content', 'relaxed'],
    Numbness: ['numb', 'empty', 'depressed', 'apathetic'],
    Cold: ['lonely', 'isolated', 'empty', 'sad'],
  },
  'Left Arm': {
    Tension: ['angry', 'stressed', 'frustrated', 'anxious'],
    Heaviness: ['sad', 'tired', 'depressed', 'powerless'],
    Tingling: ['anxious', 'nervous', 'excited', 'fearful'],
    Numbness: ['numb', 'depressed', 'empty', 'apathetic'],
    Weakness: ['helpless', 'powerless', 'weak', 'vulnerable'],
  },
  'Right Arm': {
    Tension: ['angry', 'stressed', 'frustrated', 'anxious'],
    Heaviness: ['sad', 'tired', 'depressed', 'powerless'],
    Tingling: ['anxious', 'nervous', 'excited', 'fearful'],
    Numbness: ['numb', 'depressed', 'empty', 'apathetic'],
    Weakness: ['helpless', 'powerless', 'weak', 'vulnerable'],
  },
  Stomach: {
    Tightness: ['anxious', 'fearful', 'nervous', 'worried'],
    Fluttering: ['anxious', 'nervous', 'excited', 'fearful'],
    Heaviness: ['sad', 'guilty', 'ashamed', 'depressed'],
    Burning: ['angry', 'resentful', 'frustrated', 'bitter'],
    Pain: ['anxious', 'fearful', 'stressed', 'guilty'],
    Constricting: ['anxious', 'fearful', 'stressed', 'worried'],
    Warmth: ['content', 'comfortable', 'loving', 'satisfied'],
    Ease: ['calm', 'content', 'relaxed', 'satisfied'],
    Relaxed: ['calm', 'content', 'relaxed', 'peaceful'],
    Numbness: ['numb', 'empty', 'depressed', 'apathetic'],
    Discomfort: ['anxious', 'disgusted', 'nervous', 'guilty'],
    Clenching: ['anxious', 'fearful', 'angry', 'stressed'],
    Pulsing: ['anxious', 'nervous', 'excited', 'angry'],
  },
  'Left Hand': {
    Tingling: ['anxious', 'nervous', 'excited', 'fearful'],
    Clenching: ['angry', 'frustrated', 'stressed', 'anxious'],
    Cold: ['fearful', 'anxious', 'scared', 'nervous'],
    Numbness: ['numb', 'depressed', 'empty', 'apathetic'],
    Warmth: ['loving', 'content', 'calm', 'peaceful'],
  },
  'Right Hand': {
    Tingling: ['anxious', 'nervous', 'excited', 'fearful'],
    Clenching: ['angry', 'frustrated', 'stressed', 'anxious'],
    Cold: ['fearful', 'anxious', 'scared', 'nervous'],
    Numbness: ['numb', 'depressed', 'empty', 'apathetic'],
    Warmth: ['loving', 'content', 'calm', 'peaceful'],
  },
  Hips: {
    Tension: ['stressed', 'anxious', 'angry', 'frustrated'],
    Heaviness: ['sad', 'depressed', 'tired', 'powerless'],
    Pain: ['stressed', 'sad', 'frustrated', 'anxious'],
    Tightness: ['anxious', 'stressed', 'fearful', 'angry'],
  },
  'Left Thigh': {
    Tension: ['stressed', 'anxious', 'restless', 'frustrated'],
    Heaviness: ['tired', 'sad', 'depressed', 'powerless'],
    Restlessness: ['anxious', 'nervous', 'stressed', 'frustrated'],
  },
  'Right Thigh': {
    Tension: ['stressed', 'anxious', 'restless', 'frustrated'],
    Heaviness: ['tired', 'sad', 'depressed', 'powerless'],
    Restlessness: ['anxious', 'nervous', 'stressed', 'frustrated'],
  },
};

// Tag-only fallback: when a region has no specific mapping,
// the sensation quality alone still carries signal.
const TAG_ONLY_EMOTIONS: Record<string, string[]> = {
  Tension: ['stressed', 'anxious', 'angry', 'frustrated'],
  Warmth: ['content', 'loving', 'calm', 'happy'],
  Tightness: ['anxious', 'fearful', 'stressed', 'worried'],
  Pressure: ['stressed', 'overwhelmed', 'anxious', 'pressured'],
  Tingling: ['anxious', 'nervous', 'excited', 'curious'],
  Heaviness: ['sad', 'tired', 'depressed', 'guilty'],
  Lightness: ['happy', 'calm', 'hopeful', 'peaceful'],
  Numbness: ['numb', 'depressed', 'empty', 'apathetic'],
  Pain: ['hurt', 'stressed', 'sad', 'angry'],
  Pulsing: ['angry', 'anxious', 'stressed', 'excited'],
  Fluttering: ['anxious', 'nervous', 'excited', 'fearful'],
  Clenching: ['angry', 'anxious', 'frustrated', 'stressed'],
  Relaxed: ['calm', 'peaceful', 'content', 'relaxed'],
  Expanding: ['happy', 'joyful', 'proud', 'hopeful'],
  Constricting: ['anxious', 'fearful', 'overwhelmed', 'stressed'],
  Burning: ['angry', 'embarrassed', 'frustrated', 'resentful'],
  Cold: ['fearful', 'lonely', 'anxious', 'isolated'],
  Buzzing: ['anxious', 'excited', 'nervous', 'overwhelmed'],
  Ease: ['calm', 'content', 'relaxed', 'peaceful'],
  Discomfort: ['anxious', 'stressed', 'disgusted', 'nervous'],
};

/**
 * Infers likely emotions from body sensations using weighted scoring.
 * Region+tag pairs carry more weight than tag-only matches because
 * location adds diagnostic specificity (e.g. chest tightness vs. hand tightness).
 */
export function getSuggestedEmotions(sensations: BodySensation[]): ScoredEmotion[] {
  const scores = new Map<string, { score: number; reasons: Set<string> }>();

  for (const sensation of sensations) {
    const regionMap = REGION_TAG_EMOTIONS[sensation.region];

    for (const tag of sensation.tags) {
      const regionSpecific = regionMap?.[tag];
      const tagFallback = TAG_ONLY_EMOTIONS[tag];

      if (regionSpecific) {
        // Region+tag match: strongest signal
        for (let i = 0; i < regionSpecific.length; i++) {
          const emotionId = regionSpecific[i];
          const weight = 3 - i * 0.5; // First suggestion = 3, decaying
          const entry = scores.get(emotionId) ?? { score: 0, reasons: new Set() };
          entry.score += weight;
          entry.reasons.add(`${tag.toLowerCase()} in your ${sensation.region.toLowerCase()}`);
          scores.set(emotionId, entry);
        }
      } else if (tagFallback) {
        // Tag-only match: weaker signal
        for (let i = 0; i < tagFallback.length; i++) {
          const emotionId = tagFallback[i];
          const weight = 1.5 - i * 0.25;
          const entry = scores.get(emotionId) ?? { score: 0, reasons: new Set() };
          entry.score += weight;
          entry.reasons.add(`${tag.toLowerCase()} sensation`);
          scores.set(emotionId, entry);
        }
      }
    }
  }

  const results: ScoredEmotion[] = [];
  for (const [emotionId, { score, reasons }] of scores) {
    const emotion = getEmotionById(emotionId);
    if (emotion) {
      const reasonList = Array.from(reasons);
      const reason = reasonList.length <= 2
        ? reasonList.join(' and ')
        : `${reasonList.slice(0, 2).join(', ')}, and more`;
      results.push({ emotion, score, reason });
    }
  }

  results.sort((a, b) => b.score - a.score);

  return results.slice(0, 8);
}
