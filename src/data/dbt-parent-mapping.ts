// ============================================================
// DBT Parent Emotion Mapping
// Maps every emotion in the wheel to its DBT parent emotion
// for Opposite Action protocol selection.
//
// Key principle: map by ACTION URGE, not by feeling family.
// The wheel family doesn't determine the DBT parent.
// ============================================================

export type DBTParentEmotion =
  | 'fear' | 'anger' | 'sadness' | 'disgust'
  | 'shame' | 'guilt' | 'jealousy' | 'envy' | 'love';

export type WheelFamily = 'happy' | 'surprised' | 'bad' | 'fearful' | 'angry' | 'disgusted' | 'sad';

export interface DBTParentMapping {
  emotionId: string;
  wheelFamily: WheelFamily;
  oppositeActionApplicable: boolean;
  primary: DBTParentEmotion | null;
  clinicalNote: string;
  alternativeSkill?: string;
}

// --- Compact helpers ---

function oa(
  id: string, fam: WheelFamily, parent: DBTParentEmotion, note: string
): DBTParentMapping {
  return {
    emotionId: id, wheelFamily: fam, oppositeActionApplicable: true,
    primary: parent, clinicalNote: note,
  };
}

function na(
  id: string, fam: WheelFamily, note: string, alt: string
): DBTParentMapping {
  return {
    emotionId: id, wheelFamily: fam, oppositeActionApplicable: false,
    primary: null, clinicalNote: note, alternativeSkill: alt,
  };
}

// ============================================================
// MAPPINGS — organized by wheel family
// ============================================================

export const dbtParentMappings: DBTParentMapping[] = [

  // === FEARFUL FAMILY (18) ===
  oa('fearful',      'fearful', 'fear',    'Core fear — avoidance/escape urge'),
  oa('scared',       'fearful', 'fear',    'Acute fear — flee/freeze urge'),
  oa('anxious',      'fearful', 'fear',    'Anticipatory avoidance urge'),
  oa('insecure',     'fearful', 'shame',   'Cross-family: hiding/concealment urge, not flight'),
  oa('weak',         'fearful', 'shame',   'Cross-family: shrinking/hiding urge'),
  oa('rejected',     'fearful', 'shame',   'Cross-family: urge to hide from further rejection'),
  oa('helpless',     'fearful', 'sadness', 'Cross-family: withdrawal/giving-up urge'),
  oa('frightened',   'fearful', 'fear',    'Acute fear — startle/freeze'),
  oa('worried',      'fearful', 'fear',    'Anticipatory avoidance'),
  oa('overwhelmed',  'fearful', 'fear',    'Avoidance/escape urge from overload'),
  oa('inadequate',   'fearful', 'shame',   'Cross-family: shrinking/hiding from exposure'),
  oa('inferior',     'fearful', 'shame',   'Cross-family: making-self-small urge'),
  oa('worthless',    'fearful', 'shame',   'Cross-family: urge to disappear'),
  oa('insignificant','fearful', 'shame',   'Cross-family: urge to shrink away'),
  oa('excluded',     'fearful', 'shame',   'Cross-family: hiding from social pain'),
  oa('persecuted',   'fearful', 'fear',    'Escape/avoidance from perceived threat'),
  oa('nervous',      'fearful', 'fear',    'Mild avoidance urge'),
  oa('exposed',      'fearful', 'shame',   'Cross-family: urge to cover/hide self'),

  // === ANGRY FAMILY (26) ===
  oa('angry',        'angry', 'anger',    'Core anger — attack/criticize urge'),
  oa('threatened',   'angry', 'fear',     'Cross-family: avoidance/escape urge, not attack'),
  oa('let_down',     'angry', 'sadness',  'Cross-family: withdrawal urge from disappointment'),
  oa('humiliated',   'angry', 'shame',    'Cross-family: hiding/concealment, not retaliation'),
  oa('bitter',       'angry', 'anger',    'Resentful attack/criticize urge'),
  oa('mad',          'angry', 'anger',    'Attack/lash-out urge'),
  oa('aggressive',   'angry', 'anger',    'Direct attack urge'),
  oa('frustrated',   'angry', 'anger',    'Push-through/attack urge'),
  oa('distant',      'angry', 'sadness',  'Cross-family: withdrawal/disengagement'),
  oa('critical',     'angry', 'anger',    'Verbal attack urge'),
  oa('betrayed',     'angry', 'anger',    'Retaliatory anger urge'),
  oa('resentful',    'angry', 'anger',    'Chronic attack/criticize urge'),
  oa('disrespected', 'angry', 'anger',    'Retaliatory anger urge'),
  oa('ridiculed',    'angry', 'shame',    'Cross-family: hiding from mockery'),
  oa('indignant',    'angry', 'anger',    'Righteous attack urge'),
  oa('violated',     'angry', 'anger',    'Intense retaliatory urge'),
  oa('furious',      'angry', 'anger',    'Intense attack urge'),
  oa('jealous',      'angry', 'jealousy', 'Own protocol: control/monitoring urge'),
  oa('provoked',     'angry', 'anger',    'Reactive attack urge'),
  oa('hostile',      'angry', 'anger',    'Sustained attack stance'),
  oa('infuriated',   'angry', 'anger',    'Intense attack urge'),
  oa('annoyed',      'angry', 'anger',    'Mild attack/criticize urge'),
  oa('withdrawn',    'angry', 'sadness',  'Cross-family: withdrawal IS the sadness urge'),
  na('numb',         'angry', 'Dissociative shutdown — reconnect with body first', 'body-scan'),
  na('skeptical',    'angry', 'Cognitive stance, not emotion — examine the facts', 'check-the-facts'),
  oa('dismissive',   'angry', 'disgust',  'Cross-family: push-away/rejection urge'),

  // === BAD FAMILY (12) ===
  oa('stressed',       'bad', 'fear',  'Avoidance urge from threat overload'),
  oa('pressured',      'bad', 'fear',  'Avoidance urge from external demands'),
  oa('out_of_control', 'bad', 'fear',  'Panic/escape urge'),
  na('busy',           'bad', 'Activity state, not emotion — slow down', 'mindfulness-emotions'),
  na('rushed',         'bad', 'Activity state — pause and ground', 'mindfulness-emotions'),
  na('bad',            'bad', 'Too vague — identify the specific emotion', 'name-it'),
  na('tired',          'bad', 'Physical depletion — address vulnerability factors', 'please-skill'),
  na('bored',          'bad', 'Low engagement — address vulnerability factors', 'please-skill'),
  na('sleepy',         'bad', 'Physical depletion — prioritize sleep', 'please-skill'),
  na('unfocused',      'bad', 'Cognitive state — address vulnerability factors', 'please-skill'),
  na('apathetic',      'bad', 'Depletion/disengagement — address basics first', 'please-skill'),
  na('indifferent',    'bad', 'Low activation — address vulnerability factors', 'please-skill'),

  // === DISGUSTED FAMILY (13) ===
  oa('disgusted',    'disgusted', 'disgust',  'Core disgust — push-away/rejection urge'),
  oa('disapproving', 'disgusted', 'disgust',  'Rejection/push-away urge'),
  oa('disappointed', 'disgusted', 'sadness',  'Cross-family: withdrawal from unmet expectations'),
  oa('awful',        'disgusted', 'sadness',  'Cross-family: despair/withdrawal urge'),
  oa('repelled',     'disgusted', 'disgust',  'Strong push-away urge'),
  oa('judgmental',   'disgusted', 'anger',    'Cross-family: attack/criticize urge'),
  oa('embarrassed',  'disgusted', 'shame',    'Cross-family: hiding/concealment urge'),
  oa('appalled',     'disgusted', 'disgust',  'Intense push-away/revulsion'),
  oa('revolted',     'disgusted', 'disgust',  'Intense push-away urge'),
  oa('nauseated',    'disgusted', 'disgust',  'Visceral rejection urge'),
  oa('detestable',   'disgusted', 'disgust',  'Strong push-away urge'),
  oa('horrified',    'disgusted', 'fear',     'Cross-family: freeze/avoidance urge'),
  oa('hesitant',     'disgusted', 'fear',     'Cross-family: approach-avoidance conflict'),

  // === SAD FAMILY (16) ===
  oa('sad',        'sad', 'sadness', 'Core sadness — withdrawal/isolation urge'),
  oa('lonely',     'sad', 'sadness', 'Withdrawal despite craving connection'),
  oa('vulnerable', 'sad', 'fear',    'Cross-family: protective avoidance urge'),
  oa('despair',    'sad', 'sadness', 'Deep withdrawal/giving-up urge'),
  oa('guilty',     'sad', 'guilt',   'Own protocol: avoidance/self-punishment urge'),
  oa('depressed',  'sad', 'sadness', 'Pervasive withdrawal/inactivity'),
  oa('hurt',       'sad', 'sadness', 'Withdrawal from source of pain'),
  oa('isolated',   'sad', 'sadness', 'Withdrawal is both urge and state'),
  oa('abandoned',  'sad', 'sadness', 'Withdrawal/despair from loss'),
  oa('victimized', 'sad', 'anger',   'Cross-family: retaliatory/blame urge'),
  oa('fragile',    'sad', 'fear',    'Cross-family: protective avoidance'),
  oa('grief',      'sad', 'sadness', 'Withdrawal/isolation from loss'),
  oa('powerless',  'sad', 'sadness', 'Giving-up/withdrawal urge'),
  oa('ashamed',    'sad', 'shame',   'Own protocol: hiding/concealment urge'),
  oa('remorseful', 'sad', 'guilt',   'Own protocol: avoidance/self-punishment'),
  oa('empty',      'sad', 'sadness', 'Profound disengagement/withdrawal'),

  // === HAPPY FAMILY — OA-applicable exceptions ===
  oa('loving',   'happy', 'love', 'Love OA when attachment doesn\'t fit the facts'),
  oa('intimate', 'happy', 'love', 'Love OA when closeness doesn\'t fit the facts'),
  oa('tender',   'happy', 'love', 'Love OA when tenderness doesn\'t fit the facts'),

  // === HAPPY FAMILY — not OA candidates (43) ===
  ...[
    'happy', 'playful', 'interested', 'proud', 'accepted', 'powerful', 'optimistic',
    'aroused', 'cheeky', 'joyful', 'curious', 'inquisitive', 'successful', 'confident',
    'respected', 'valued', 'courageous', 'creative', 'hopeful', 'inspired',
    'calm', 'relaxed', 'peaceful', 'content', 'trusting', 'sensitive', 'thankful',
    'good', 'chill', 'comfortable', 'thoughtful', 'mellow', 'sympathetic', 'serene',
    'secure', 'satisfied', 'restful', 'appreciative', 'at_ease', 'balanced',
    'grounded', 'cozy', 'humble',
  ].map(id => na(id, 'happy', 'Positive emotion — savor with mindfulness', 'mindfulness-emotions')),

  // === SURPRISED FAMILY — OA-applicable exceptions ===
  oa('shocked',       'surprised', 'fear',    'Cross-family: freeze/avoidance urge'),
  oa('dismayed',      'surprised', 'sadness', 'Cross-family: withdrawal from bad news'),
  oa('disillusioned', 'surprised', 'sadness', 'Cross-family: withdrawal from lost beliefs'),

  // === SURPRISED FAMILY — not OA candidates (10) ===
  ...[
    'surprised', 'startled', 'amazed', 'excited',
    'astonished', 'awe', 'eager', 'energetic',
  ].map(id => na(id, 'surprised', 'Transitional/positive state — observe mindfully', 'mindfulness-emotions')),
  na('confused',  'surprised', 'Cognitive uncertainty — examine the situation', 'check-the-facts'),
  na('perplexed', 'surprised', 'Cognitive uncertainty — examine the situation', 'check-the-facts'),
];

// ============================================================
// LOOKUP UTILITIES
// ============================================================

const mappingById = new Map(dbtParentMappings.map(m => [m.emotionId, m]));

export function getMapping(emotionId: string): DBTParentMapping | undefined {
  return mappingById.get(emotionId);
}

export function isOppositeActionApplicable(emotionId: string): boolean {
  return mappingById.get(emotionId)?.oppositeActionApplicable ?? false;
}

export function getDbtParent(emotionId: string): DBTParentEmotion | null {
  return mappingById.get(emotionId)?.primary ?? null;
}

export function getEmotionsByDbtParent(parent: DBTParentEmotion): DBTParentMapping[] {
  return dbtParentMappings.filter(m => m.primary === parent);
}

// ============================================================
// CHECKSUM: 144 emotions mapped
// fearful: 18 | angry: 26 | bad: 12 | disgusted: 13
// sad: 16 | happy: 46 | surprised: 13
// OA applicable: 80 | Not applicable: 64
// ============================================================
