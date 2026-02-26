/**
 * Opposite Action Mappings
 *
 * Maps every emotion in the app to a DBT parent emotion for Opposite Action (OA).
 *
 * KEY CLINICAL PRINCIPLE: Mapping is by ACTION URGE, not by feeling family.
 * Example: "stressed" lives in the fearful family on the emotion wheel, but
 * its dominant action urge is avoidance — which is the fear action urge.
 * Example: "humiliated" lives in the angry family, but its primary urge is
 * to hide/withdraw — which is the shame action urge.
 *
 * The 9 DBT parent emotions and their Opposite Action protocols:
 *
 *   fear      -> approach what you fear (gradually, with coping plan)
 *   anger     -> be kind/gentle, avoid the person (don't attack)
 *   sadness   -> get active, approach (don't withdraw)
 *   disgust   -> approach, don't avoid/push away
 *   shame     -> share/disclose, proud posture (when shame doesn't fit the facts)
 *   guilt     -> repair the harm (when guilt fits facts); let go (when it doesn't)
 *   jealousy  -> let go of controlling, share
 *   envy      -> count your blessings, inhibit destructive urges
 *   love      -> avoid contact, distract, remind of negatives (when love doesn't fit)
 *
 * Emotions NOT candidates for Opposite Action (oppositeActionApplicable: false):
 *   - Positive states    -> redirect to mindfulness (savor the moment)
 *   - Transitional states -> redirect to mindfulness (observe without reacting)
 *   - Depletion states   -> redirect to PLEASE skill (address physical vulnerability)
 *   - Vague states       -> redirect to emotion identification (get specific first)
 *
 * References:
 *   Linehan, M.M. (2015). DBT Skills Training Handouts and Worksheets (2nd ed.)
 *   Emotion Regulation Handouts 10-11 (Opposite Action and When to Use)
 */

// ============================================================
// Types
// ============================================================

export type DbtParentEmotion =
  | 'fear'
  | 'anger'
  | 'sadness'
  | 'disgust'
  | 'shame'
  | 'guilt'
  | 'jealousy'
  | 'envy'
  | 'love';

export type SuggestedAlternative =
  | 'mindfulness'
  | 'please-skill'
  | 'distress-tolerance'
  | 'emotion-identification';

export interface OppositeActionMapping {
  /** The snake_case emotion ID (matches emotions.ts) */
  emotionId: string;
  /** Which of the 9 DBT parent emotions this maps to, or null if OA not applicable */
  dbtParent: DbtParentEmotion | null;
  /** Whether Opposite Action is a clinically appropriate intervention */
  oppositeActionApplicable: boolean;
  /** Brief clinical rationale for this mapping */
  clinicalNote: string;
  /** If OA not applicable, which skill pathway to redirect to */
  suggestedAlternative: SuggestedAlternative | null;
}

// ============================================================
// Complete Mapping — Organized by Emotion Family
// ============================================================

export const oppositeActionMappings: OppositeActionMapping[] = [

  // =====================================================
  // FEARFUL FAMILY
  // =====================================================
  // Core action urge: avoidance, escape, freezing
  // OA: approach what you fear (gradually, with coping plan)

  {
    emotionId: 'fearful',
    dbtParent: 'fear',
    oppositeActionApplicable: true,
    clinicalNote: 'Primary fear emotion. Action urge is to avoid or escape. OA: approach the feared stimulus gradually.',
    suggestedAlternative: null,
  },
  {
    emotionId: 'scared',
    dbtParent: 'fear',
    oppositeActionApplicable: true,
    clinicalNote: 'High-intensity fear. Urge to flee or freeze. OA: approach what is feared, with a coping plan.',
    suggestedAlternative: null,
  },
  {
    emotionId: 'anxious',
    dbtParent: 'fear',
    oppositeActionApplicable: true,
    clinicalNote: 'Future-oriented fear with avoidance urge. OA: approach the anxiety-provoking situation rather than avoiding.',
    suggestedAlternative: null,
  },
  {
    emotionId: 'insecure',
    dbtParent: 'fear',
    oppositeActionApplicable: true,
    clinicalNote: 'Fear of inadequacy drives avoidance of challenges. OA: approach situations that trigger insecurity.',
    suggestedAlternative: null,
  },
  {
    emotionId: 'weak',
    dbtParent: 'fear',
    oppositeActionApplicable: true,
    clinicalNote: 'Perceived powerlessness drives retreat/avoidance. OA: approach with confidence posture, act as if capable.',
    suggestedAlternative: null,
  },
  {
    emotionId: 'rejected',
    dbtParent: 'fear',
    oppositeActionApplicable: true,
    clinicalNote: 'Fear of further rejection drives social avoidance. OA: approach social situations, reach out despite fear.',
    suggestedAlternative: null,
  },
  {
    emotionId: 'threatened',
    dbtParent: 'fear',
    oppositeActionApplicable: true,
    clinicalNote: 'Perceived danger activates avoidance/escape. OA: approach the perceived threat (when it does not fit the facts).',
    suggestedAlternative: null,
  },
  {
    emotionId: 'frightened',
    dbtParent: 'fear',
    oppositeActionApplicable: true,
    clinicalNote: 'Acute fear with strong flight urge. OA: stay present and approach the frightening stimulus gradually.',
    suggestedAlternative: null,
  },
  {
    emotionId: 'nervous',
    dbtParent: 'fear',
    oppositeActionApplicable: true,
    clinicalNote: 'Anticipatory fear with avoidance urge. OA: approach the situation generating nervousness.',
    suggestedAlternative: null,
  },
  {
    emotionId: 'terrified',
    dbtParent: 'fear',
    oppositeActionApplicable: true,
    clinicalNote: 'Extreme fear with freeze/flee urge. OA: approach gradually with support. May need distress tolerance first if intensity is >8.',
    suggestedAlternative: null,
  },
  {
    emotionId: 'panicked',
    dbtParent: 'fear',
    oppositeActionApplicable: true,
    clinicalNote: 'Overwhelming fear with urgency to escape. OA: stay present, approach. May need TIP skills first to reduce arousal.',
    suggestedAlternative: null,
  },
  {
    emotionId: 'stressed',
    dbtParent: 'fear',
    oppositeActionApplicable: true,
    clinicalNote: 'Stress produces avoidance of demands. Action urge is to escape or shut down. OA: approach the stressor step by step.',
    suggestedAlternative: null,
  },
  {
    emotionId: 'vulnerable',
    dbtParent: 'fear',
    oppositeActionApplicable: true,
    clinicalNote: 'Sense of exposure drives urge to hide/protect. OA: approach with openness rather than armoring up.',
    suggestedAlternative: null,
  },
  {
    emotionId: 'worried',
    dbtParent: 'fear',
    oppositeActionApplicable: true,
    clinicalNote: 'Future-oriented fear with cognitive avoidance loops. OA: approach the worry topic directly, check the facts.',
    suggestedAlternative: null,
  },
  {
    emotionId: 'inadequate',
    dbtParent: 'fear',
    oppositeActionApplicable: true,
    clinicalNote: 'Fear of not being enough drives avoidance of evaluation. OA: approach challenges, act as if competent.',
    suggestedAlternative: null,
  },
  {
    emotionId: 'inferior',
    dbtParent: 'fear',
    oppositeActionApplicable: true,
    clinicalNote: 'Perceived lower status drives social avoidance and withdrawal from comparison contexts. OA: approach, engage as an equal.',
    suggestedAlternative: null,
  },
  {
    emotionId: 'overwhelmed',
    dbtParent: 'fear',
    oppositeActionApplicable: true,
    clinicalNote: 'Cognitive overload creates urge to flee or shut down. OA: approach one task at a time rather than avoiding all.',
    suggestedAlternative: null,
  },

  // Additional fearful-family emotions from emotions.ts not in original spec
  {
    emotionId: 'helpless',
    dbtParent: 'fear',
    oppositeActionApplicable: true,
    clinicalNote: 'Perceived inability to cope drives avoidance and surrender. OA: approach one small problem, build mastery.',
    suggestedAlternative: null,
  },
  {
    emotionId: 'worthless',
    dbtParent: 'shame',
    oppositeActionApplicable: true,
    clinicalNote: 'Deep self-devaluation with urge to hide and withdraw from others. Primary urge is concealment — maps to shame, not fear.',
    suggestedAlternative: null,
  },
  {
    emotionId: 'insignificant',
    dbtParent: 'shame',
    oppositeActionApplicable: true,
    clinicalNote: 'Belief that one does not matter drives hiding/shrinking behavior. OA: share, take up space, proud posture.',
    suggestedAlternative: null,
  },
  {
    emotionId: 'excluded',
    dbtParent: 'fear',
    oppositeActionApplicable: true,
    clinicalNote: 'Social exclusion triggers avoidance of further social attempts. OA: approach social connection despite fear of re-rejection.',
    suggestedAlternative: null,
  },
  {
    emotionId: 'persecuted',
    dbtParent: 'fear',
    oppositeActionApplicable: true,
    clinicalNote: 'Perceived targeting drives avoidance and vigilance. OA: approach situations with reality-testing, check the facts.',
    suggestedAlternative: null,
  },
  {
    emotionId: 'exposed',
    dbtParent: 'shame',
    oppositeActionApplicable: true,
    clinicalNote: 'Feeling seen/unmasked drives strong concealment urge. This is a shame action urge, not fear. OA: stay visible, share openly.',
    suggestedAlternative: null,
  },

  // =====================================================
  // ANGRY FAMILY
  // =====================================================
  // Core action urge: attack, criticize, punish, control
  // OA: be kind/gentle, avoid the person (don't attack)
  //
  // NOTE: Several emotions in the "angry" wheel family actually
  // have shame, jealousy, envy, or sadness action urges.

  {
    emotionId: 'angry',
    dbtParent: 'anger',
    oppositeActionApplicable: true,
    clinicalNote: 'Primary anger. Urge to attack, criticize, punish. OA: gently avoid, be kind, relax facial muscles.',
    suggestedAlternative: null,
  },
  {
    emotionId: 'let_down',
    dbtParent: 'sadness',
    oppositeActionApplicable: true,
    clinicalNote: 'Disappointment in others produces withdrawal urge, not attack urge. OA: get active, approach, communicate needs.',
    suggestedAlternative: null,
  },
  {
    emotionId: 'humiliated',
    dbtParent: 'shame',
    oppositeActionApplicable: true,
    clinicalNote: 'Public shaming drives hiding/concealment, not attack. OA: proud posture, share experience (when shame does not fit facts).',
    suggestedAlternative: null,
  },
  {
    emotionId: 'bitter',
    dbtParent: 'anger',
    oppositeActionApplicable: true,
    clinicalNote: 'Chronic resentment with urge to punish or withdraw coldly. OA: practice kindness, let go of grudge.',
    suggestedAlternative: null,
  },
  {
    emotionId: 'mad',
    dbtParent: 'anger',
    oppositeActionApplicable: true,
    clinicalNote: 'Colloquial anger. Attack/lash-out urge. OA: gently avoid, speak softly, relax body.',
    suggestedAlternative: null,
  },
  {
    emotionId: 'aggressive',
    dbtParent: 'anger',
    oppositeActionApplicable: true,
    clinicalNote: 'High-activation anger with strong urge to attack physically or verbally. OA: gently avoid, hands open, soft voice.',
    suggestedAlternative: null,
  },
  {
    emotionId: 'frustrated',
    dbtParent: 'anger',
    oppositeActionApplicable: true,
    clinicalNote: 'Goal-blocked anger. Urge to force through or lash out. OA: step back gently, approach calmly with problem-solving.',
    suggestedAlternative: null,
  },
  {
    emotionId: 'distant',
    dbtParent: 'anger',
    oppositeActionApplicable: true,
    clinicalNote: 'Cold withdrawal as passive expression of anger. OA: approach with gentleness, engage rather than stonewall.',
    suggestedAlternative: null,
  },
  {
    emotionId: 'critical',
    dbtParent: 'anger',
    oppositeActionApplicable: true,
    clinicalNote: 'Verbal attack/judgment urge. OA: practice validation, find something to appreciate, gentle speech.',
    suggestedAlternative: null,
  },
  {
    emotionId: 'violated',
    dbtParent: 'anger',
    oppositeActionApplicable: true,
    clinicalNote: 'Boundary violation triggers retaliatory attack urge. OA: gently avoid, set boundary without aggression.',
    suggestedAlternative: null,
  },
  {
    emotionId: 'furious',
    dbtParent: 'anger',
    oppositeActionApplicable: true,
    clinicalNote: 'Extreme anger with intense attack urge. OA: gently avoid, relax body. May need TIP skills first if >8 intensity.',
    suggestedAlternative: null,
  },
  {
    emotionId: 'jealous',
    dbtParent: 'jealousy',
    oppositeActionApplicable: true,
    clinicalNote: 'Fear of losing what you have drives controlling/monitoring behavior. OA: let go of controlling, share, act trustingly.',
    suggestedAlternative: null,
  },
  {
    emotionId: 'resentful',
    dbtParent: 'anger',
    oppositeActionApplicable: true,
    clinicalNote: 'Stored anger with urge to punish or withdraw hostilely. OA: practice kindness, empathy for the other person.',
    suggestedAlternative: null,
  },
  {
    emotionId: 'hateful',
    dbtParent: 'anger',
    oppositeActionApplicable: true,
    clinicalNote: 'Extreme sustained anger with destruction/exclusion urge. OA: practice empathy, gently avoid, find humanity.',
    suggestedAlternative: null,
  },
  {
    emotionId: 'hostile',
    dbtParent: 'anger',
    oppositeActionApplicable: true,
    clinicalNote: 'Generalized combativeness with attack urge. OA: be gentle, soften face, open posture.',
    suggestedAlternative: null,
  },
  {
    emotionId: 'enraged',
    dbtParent: 'anger',
    oppositeActionApplicable: true,
    clinicalNote: 'Peak anger with violence risk. OA: gently remove yourself, cool down. Use TIP skills first if at crisis intensity.',
    suggestedAlternative: null,
  },
  {
    emotionId: 'irritated',
    dbtParent: 'anger',
    oppositeActionApplicable: true,
    clinicalNote: 'Low-grade anger with snapping/criticizing urge. OA: be gentle, speak kindly, half-smile.',
    suggestedAlternative: null,
  },
  {
    emotionId: 'skeptical',
    dbtParent: 'anger',
    oppositeActionApplicable: true,
    clinicalNote: 'Distrust with dismissal/critiquing urge. OA: approach with openness, give benefit of the doubt.',
    suggestedAlternative: null,
  },
  {
    emotionId: 'dismissive',
    dbtParent: 'anger',
    oppositeActionApplicable: true,
    clinicalNote: 'Contemptuous rejection with urge to invalidate. OA: validate, listen, engage with genuine interest.',
    suggestedAlternative: null,
  },
  {
    emotionId: 'contemptuous',
    dbtParent: 'anger',
    oppositeActionApplicable: true,
    clinicalNote: 'Superiority-based anger with urge to denigrate. OA: practice humility and empathy, validate the other person.',
    suggestedAlternative: null,
  },
  {
    emotionId: 'revulsed',
    dbtParent: 'disgust',
    oppositeActionApplicable: true,
    clinicalNote: 'Strong repulsion with push-away urge. This is disgust, not anger. OA: approach rather than avoid.',
    suggestedAlternative: null,
  },
  {
    emotionId: 'disapproving',
    dbtParent: 'anger',
    oppositeActionApplicable: true,
    clinicalNote: 'Moral judgment with urge to criticize or withdraw. OA: practice acceptance, validate, non-judgmental stance.',
    suggestedAlternative: null,
  },
  {
    emotionId: 'disappointed',
    dbtParent: 'sadness',
    oppositeActionApplicable: true,
    clinicalNote: 'Unmet expectations produce withdrawal, not attack. OA: get active, approach, express needs.',
    suggestedAlternative: null,
  },
  {
    emotionId: 'vengeful',
    dbtParent: 'anger',
    oppositeActionApplicable: true,
    clinicalNote: 'Retaliatory urge to punish or harm. OA: gently avoid, let go, no retaliation.',
    suggestedAlternative: null,
  },
  {
    emotionId: 'envious',
    dbtParent: 'envy',
    oppositeActionApplicable: true,
    clinicalNote: 'Wanting what others have. Urge to tear down or bitterly compare. OA: count blessings, inhibit destructive action.',
    suggestedAlternative: null,
  },
  {
    emotionId: 'betrayed',
    dbtParent: 'anger',
    oppositeActionApplicable: true,
    clinicalNote: 'Trust violation triggers retaliatory and attack urges. OA: gently avoid, process before acting.',
    suggestedAlternative: null,
  },

  // Additional angry-family emotions from emotions.ts not in original spec
  {
    emotionId: 'disrespected',
    dbtParent: 'anger',
    oppositeActionApplicable: true,
    clinicalNote: 'Perceived disrespect triggers attack/retaliation urge. OA: respond with gentleness, assert without aggression.',
    suggestedAlternative: null,
  },
  {
    emotionId: 'ridiculed',
    dbtParent: 'shame',
    oppositeActionApplicable: true,
    clinicalNote: 'Being mocked drives hiding/concealment, not attack. OA: proud posture, share openly (when shame does not fit facts).',
    suggestedAlternative: null,
  },
  {
    emotionId: 'indignant',
    dbtParent: 'anger',
    oppositeActionApplicable: true,
    clinicalNote: 'Righteous anger with urge to confront aggressively. OA: gently avoid, validate the other perspective.',
    suggestedAlternative: null,
  },
  {
    emotionId: 'provoked',
    dbtParent: 'anger',
    oppositeActionApplicable: true,
    clinicalNote: 'Triggered anger with retaliatory urge. OA: do not engage with provocation, gently remove yourself.',
    suggestedAlternative: null,
  },
  {
    emotionId: 'infuriated',
    dbtParent: 'anger',
    oppositeActionApplicable: true,
    clinicalNote: 'High-intensity anger with strong attack urge. OA: gently avoid, cool down. TIP skills may be needed first.',
    suggestedAlternative: null,
  },
  {
    emotionId: 'annoyed',
    dbtParent: 'anger',
    oppositeActionApplicable: true,
    clinicalNote: 'Mild anger with snapping/criticizing urge. OA: be kind, let it go, half-smile.',
    suggestedAlternative: null,
  },
  {
    emotionId: 'withdrawn',
    dbtParent: 'sadness',
    oppositeActionApplicable: true,
    clinicalNote: 'Withdrawal is a sadness/depression action urge despite appearing in the anger family. OA: get active, approach.',
    suggestedAlternative: null,
  },
  {
    emotionId: 'numb',
    dbtParent: 'sadness',
    oppositeActionApplicable: true,
    clinicalNote: 'Emotional numbness is a shutdown/withdrawal state. OA: gentle activation, approach sensory experience.',
    suggestedAlternative: null,
  },

  // =====================================================
  // DISGUSTED FAMILY
  // =====================================================
  // Core action urge: push away, avoid, expel, reject
  // OA: approach, don't avoid or push away

  {
    emotionId: 'disgusted',
    dbtParent: 'disgust',
    oppositeActionApplicable: true,
    clinicalNote: 'Primary disgust. Urge to push away, avoid, reject. OA: approach rather than avoid.',
    suggestedAlternative: null,
  },
  {
    emotionId: 'repelled',
    dbtParent: 'disgust',
    oppositeActionApplicable: true,
    clinicalNote: 'Strong push-away urge. OA: approach, stay present rather than retreating.',
    suggestedAlternative: null,
  },
  {
    emotionId: 'horrified',
    dbtParent: 'fear',
    oppositeActionApplicable: true,
    clinicalNote: 'Although in disgust family, horror has a freeze/avoidance urge more aligned with fear. OA: approach gradually.',
    suggestedAlternative: null,
  },
  {
    emotionId: 'hesitant',
    dbtParent: 'fear',
    oppositeActionApplicable: true,
    clinicalNote: 'Hesitation is approach-avoidance conflict driven by fear. OA: approach what you are hesitating about.',
    suggestedAlternative: null,
  },
  {
    emotionId: 'nauseated',
    dbtParent: 'disgust',
    oppositeActionApplicable: true,
    clinicalNote: 'Somatic disgust with strong expulsion/avoidance urge. OA: approach, stay present.',
    suggestedAlternative: null,
  },
  {
    emotionId: 'appalled',
    dbtParent: 'disgust',
    oppositeActionApplicable: true,
    clinicalNote: 'Moral disgust with rejection/avoidance urge. OA: approach with understanding rather than pushing away.',
    suggestedAlternative: null,
  },
  {
    emotionId: 'detestable',
    dbtParent: 'disgust',
    oppositeActionApplicable: true,
    clinicalNote: 'Extreme aversion with urge to reject and push away. OA: approach, tolerate proximity.',
    suggestedAlternative: null,
  },
  {
    emotionId: 'revolted',
    dbtParent: 'disgust',
    oppositeActionApplicable: true,
    clinicalNote: 'Strong disgust with expulsion urge. OA: approach, don\'t push away.',
    suggestedAlternative: null,
  },
  {
    emotionId: 'offended',
    dbtParent: 'anger',
    oppositeActionApplicable: true,
    clinicalNote: 'Offense triggers counterattack or indignant withdrawal. Primary urge is retaliatory — maps to anger. OA: be kind, validate.',
    suggestedAlternative: null,
  },
  {
    emotionId: 'uncomfortable',
    dbtParent: 'fear',
    oppositeActionApplicable: true,
    clinicalNote: 'Discomfort drives escape/avoidance. OA: approach the discomfort, stay present.',
    suggestedAlternative: null,
  },
  {
    emotionId: 'disturbed',
    dbtParent: 'disgust',
    oppositeActionApplicable: true,
    clinicalNote: 'Unsettled with push-away urge. OA: approach, observe without pushing away.',
    suggestedAlternative: null,
  },
  // Note: 'withdrawn' in disgust family treated as same ID as in angry family (see above)
  {
    emotionId: 'aversive',
    dbtParent: 'disgust',
    oppositeActionApplicable: true,
    clinicalNote: 'Generalized avoidance/push-away. OA: approach what feels aversive.',
    suggestedAlternative: null,
  },

  // Additional disgusted-family emotions from emotions.ts not in original spec
  {
    emotionId: 'judgmental',
    dbtParent: 'anger',
    oppositeActionApplicable: true,
    clinicalNote: 'Moral superiority with urge to criticize and dismiss. Action urge is attack/reject — maps to anger. OA: non-judgmental stance, validate.',
    suggestedAlternative: null,
  },
  {
    emotionId: 'embarrassed',
    dbtParent: 'shame',
    oppositeActionApplicable: true,
    clinicalNote: 'Social exposure triggers hiding/concealment. Shame action urge. OA: stay visible, share the experience.',
    suggestedAlternative: null,
  },
  {
    emotionId: 'awful',
    dbtParent: 'disgust',
    oppositeActionApplicable: true,
    clinicalNote: 'Generalized aversion. Urge to reject and push away. OA: approach, stay present.',
    suggestedAlternative: null,
  },

  // =====================================================
  // SAD FAMILY
  // =====================================================
  // Core action urge: withdraw, isolate, shut down, become passive
  // OA: get active, approach (don't withdraw)
  //
  // NOTE: guilty and ashamed have different action urges
  // and map to guilt and shame parents respectively.

  {
    emotionId: 'sad',
    dbtParent: 'sadness',
    oppositeActionApplicable: true,
    clinicalNote: 'Primary sadness. Urge to withdraw, isolate, be passive. OA: get active, approach people and activities.',
    suggestedAlternative: null,
  },
  {
    emotionId: 'lonely',
    dbtParent: 'sadness',
    oppositeActionApplicable: true,
    clinicalNote: 'Isolation with paradoxical avoidance of social contact. OA: approach others, reach out, join activities.',
    suggestedAlternative: null,
  },
  // Note: 'vulnerable_sad' from spec maps to 'vulnerable' ID in emotions.ts (already mapped in fearful family)
  {
    emotionId: 'despair',
    dbtParent: 'sadness',
    oppositeActionApplicable: true,
    clinicalNote: 'Hopelessness with urge to give up entirely. OA: take one small action, approach anything activating.',
    suggestedAlternative: null,
  },
  {
    emotionId: 'guilty',
    dbtParent: 'guilt',
    oppositeActionApplicable: true,
    clinicalNote: 'Guilt has a unique action urge: rumination, self-punishment, or avoidance of the harmed person. OA depends on check-the-facts: if guilt fits, repair the harm; if not, let go.',
    suggestedAlternative: null,
  },
  {
    emotionId: 'depressed',
    dbtParent: 'sadness',
    oppositeActionApplicable: true,
    clinicalNote: 'Persistent low mood with strong withdrawal and inactivity urges. OA: behavioral activation — get active, approach.',
    suggestedAlternative: null,
  },
  {
    emotionId: 'hurt',
    dbtParent: 'sadness',
    oppositeActionApplicable: true,
    clinicalNote: 'Emotional pain with withdrawal/protection urge. OA: approach others, express feelings rather than retreating.',
    suggestedAlternative: null,
  },
  {
    emotionId: 'empty',
    dbtParent: 'sadness',
    oppositeActionApplicable: true,
    clinicalNote: 'Emotional void with urge to disengage from life. OA: approach activities and people, gentle behavioral activation.',
    suggestedAlternative: null,
  },
  // Note: 'inferior_sad' from spec maps to 'inferior' ID already in fearful family
  {
    emotionId: 'ashamed',
    dbtParent: 'shame',
    oppositeActionApplicable: true,
    clinicalNote: 'Shame drives hiding, shrinking, concealment. Distinct from sadness withdrawal. OA: share/disclose (when shame does not fit facts), proud posture.',
    suggestedAlternative: null,
  },
  {
    emotionId: 'grief',
    dbtParent: 'sadness',
    oppositeActionApplicable: true,
    clinicalNote: 'Loss-related sadness with withdrawal and shutting-down urge. OA: stay engaged with life, approach connection. Note: grief often fits the facts — validate before applying OA.',
    suggestedAlternative: null,
  },
  {
    emotionId: 'neglected',
    dbtParent: 'sadness',
    oppositeActionApplicable: true,
    clinicalNote: 'Feeling overlooked drives withdrawal and giving up on connection. OA: approach, ask for what you need (DEAR MAN).',
    suggestedAlternative: null,
  },
  {
    emotionId: 'isolated',
    dbtParent: 'sadness',
    oppositeActionApplicable: true,
    clinicalNote: 'Cut off from others with urge to stay alone. OA: approach social contact, accept invitations.',
    suggestedAlternative: null,
  },
  {
    emotionId: 'miserable',
    dbtParent: 'sadness',
    oppositeActionApplicable: true,
    clinicalNote: 'Pervasive unhappiness with passivity and withdrawal urge. OA: get active, approach pleasant activities.',
    suggestedAlternative: null,
  },
  {
    emotionId: 'abandoned',
    dbtParent: 'sadness',
    oppositeActionApplicable: true,
    clinicalNote: 'Loss of attachment with withdrawal and despair urge. OA: approach other connections, resist isolation.',
    suggestedAlternative: null,
  },

  // Additional sad-family emotions from emotions.ts not in original spec
  {
    emotionId: 'victimized',
    dbtParent: 'sadness',
    oppositeActionApplicable: true,
    clinicalNote: 'Perceived injustice with helpless withdrawal urge. OA: get active, take effective action.',
    suggestedAlternative: null,
  },
  {
    emotionId: 'fragile',
    dbtParent: 'fear',
    oppositeActionApplicable: true,
    clinicalNote: 'Fragility drives protective avoidance — more fear-like than sadness. OA: approach with gentle courage.',
    suggestedAlternative: null,
  },
  {
    emotionId: 'powerless',
    dbtParent: 'sadness',
    oppositeActionApplicable: true,
    clinicalNote: 'Perceived inability drives passivity and giving up. OA: take one small effective action, approach a solvable problem.',
    suggestedAlternative: null,
  },
  {
    emotionId: 'remorseful',
    dbtParent: 'guilt',
    oppositeActionApplicable: true,
    clinicalNote: 'Regret about specific actions. Same as guilt action urge. OA: repair if guilt fits, let go if it does not.',
    suggestedAlternative: null,
  },

  // =====================================================
  // BAD FAMILY
  // =====================================================
  // This family is heterogeneous — "bad" is too vague,
  // depletion states need PLEASE skill, stress states
  // have fear-like avoidance urges.

  {
    emotionId: 'bad',
    dbtParent: null,
    oppositeActionApplicable: false,
    clinicalNote: 'Too vague for Opposite Action. Needs further differentiation — what kind of bad? Redirect to emotion identification.',
    suggestedAlternative: 'emotion-identification',
  },
  {
    emotionId: 'tired',
    dbtParent: null,
    oppositeActionApplicable: false,
    clinicalNote: 'Physical depletion state, not an emotion with an action urge. Address with PLEASE skill (sleep, rest, physical care).',
    suggestedAlternative: 'please-skill',
  },
  {
    emotionId: 'stressed_bad',
    dbtParent: 'fear',
    oppositeActionApplicable: true,
    clinicalNote: 'Stress with avoidance urge. OA: approach stressors step by step rather than avoiding.',
    suggestedAlternative: null,
  },
  {
    emotionId: 'busy',
    dbtParent: null,
    oppositeActionApplicable: false,
    clinicalNote: 'Activity overload state, not an emotion with a clear action urge. Address with PLEASE skill and one-mindfully.',
    suggestedAlternative: 'please-skill',
  },
  {
    emotionId: 'bored',
    dbtParent: null,
    oppositeActionApplicable: false,
    clinicalNote: 'Low-stimulation state, not an emotion driving harmful action urges. Address with PLEASE skill and behavioral activation.',
    suggestedAlternative: 'please-skill',
  },
  {
    emotionId: 'sleepy',
    dbtParent: null,
    oppositeActionApplicable: false,
    clinicalNote: 'Physical depletion. Not an emotion. Address with PLEASE skill (sleep hygiene).',
    suggestedAlternative: 'please-skill',
  },
  {
    emotionId: 'unfocused',
    dbtParent: null,
    oppositeActionApplicable: false,
    clinicalNote: 'Cognitive state, not an emotion with an action urge. Address with PLEASE skill and one-mindfully.',
    suggestedAlternative: 'please-skill',
  },
  {
    emotionId: 'out_of_control',
    dbtParent: 'fear',
    oppositeActionApplicable: true,
    clinicalNote: 'Loss of control has a panic/avoidance urge. OA: approach one thing you can control, act effectively.',
    suggestedAlternative: null,
  },
  {
    emotionId: 'overwhelmed_bad',
    dbtParent: 'fear',
    oppositeActionApplicable: true,
    clinicalNote: 'Overwhelm drives avoidance/shutdown. OA: approach one small task rather than avoiding everything.',
    suggestedAlternative: null,
  },
  {
    emotionId: 'rushed',
    dbtParent: null,
    oppositeActionApplicable: false,
    clinicalNote: 'Temporal pressure state, not an emotion with a targetable action urge. Address with distress tolerance (one-mindfully).',
    suggestedAlternative: 'distress-tolerance',
  },
  {
    emotionId: 'pressured',
    dbtParent: 'fear',
    oppositeActionApplicable: true,
    clinicalNote: 'External demands create avoidance urge. OA: approach the source of pressure step by step.',
    suggestedAlternative: null,
  },
  {
    emotionId: 'apathetic',
    dbtParent: 'sadness',
    oppositeActionApplicable: true,
    clinicalNote: 'Lack of caring is a withdrawal/disengagement urge aligned with depression. OA: get active, approach engagement.',
    suggestedAlternative: null,
  },
  {
    emotionId: 'indifferent',
    dbtParent: 'sadness',
    oppositeActionApplicable: true,
    clinicalNote: 'Emotional detachment is a form of withdrawal. OA: approach engagement, participate in activities.',
    suggestedAlternative: null,
  },

  // =====================================================
  // HAPPY FAMILY
  // =====================================================
  // Most are positive states -> redirect to mindfulness.
  // Exceptions: loving/intimate -> love parent (OA when love
  // doesn't fit facts); proud -> not applicable.

  {
    emotionId: 'happy',
    dbtParent: null,
    oppositeActionApplicable: false,
    clinicalNote: 'Positive state. No harmful action urge. Redirect to mindfulness to savor and sustain.',
    suggestedAlternative: 'mindfulness',
  },
  {
    emotionId: 'playful',
    dbtParent: null,
    oppositeActionApplicable: false,
    clinicalNote: 'Positive state. No harmful action urge. Redirect to mindfulness.',
    suggestedAlternative: 'mindfulness',
  },
  {
    emotionId: 'content',
    dbtParent: null,
    oppositeActionApplicable: false,
    clinicalNote: 'Positive state of satisfaction. No harmful action urge. Redirect to mindfulness.',
    suggestedAlternative: 'mindfulness',
  },
  {
    emotionId: 'interested',
    dbtParent: null,
    oppositeActionApplicable: false,
    clinicalNote: 'Positive approach state. No harmful action urge. Redirect to mindfulness.',
    suggestedAlternative: 'mindfulness',
  },
  {
    emotionId: 'proud',
    dbtParent: null,
    oppositeActionApplicable: false,
    clinicalNote: 'Positive self-evaluation. Could theoretically be shame-inverted, but clinically better to redirect to mindfulness to savor accomplishment.',
    suggestedAlternative: 'mindfulness',
  },
  {
    emotionId: 'accepted',
    dbtParent: null,
    oppositeActionApplicable: false,
    clinicalNote: 'Positive social state. No harmful action urge. Redirect to mindfulness.',
    suggestedAlternative: 'mindfulness',
  },
  {
    emotionId: 'powerful',
    dbtParent: null,
    oppositeActionApplicable: false,
    clinicalNote: 'Positive competence state. No harmful action urge. Redirect to mindfulness.',
    suggestedAlternative: 'mindfulness',
  },
  {
    emotionId: 'peaceful',
    dbtParent: null,
    oppositeActionApplicable: false,
    clinicalNote: 'Calm positive state. No harmful action urge. Redirect to mindfulness.',
    suggestedAlternative: 'mindfulness',
  },
  {
    emotionId: 'trusting',
    dbtParent: null,
    oppositeActionApplicable: false,
    clinicalNote: 'Positive relational state. No harmful action urge. Redirect to mindfulness.',
    suggestedAlternative: 'mindfulness',
  },
  {
    emotionId: 'optimistic',
    dbtParent: null,
    oppositeActionApplicable: false,
    clinicalNote: 'Positive future-oriented state. No harmful action urge. Redirect to mindfulness.',
    suggestedAlternative: 'mindfulness',
  },
  {
    emotionId: 'aroused',
    dbtParent: null,
    oppositeActionApplicable: false,
    clinicalNote: 'Positive high-energy state. No harmful action urge in this context. Redirect to mindfulness.',
    suggestedAlternative: 'mindfulness',
  },
  {
    emotionId: 'cheeky',
    dbtParent: null,
    oppositeActionApplicable: false,
    clinicalNote: 'Playful positive state. No harmful action urge. Redirect to mindfulness.',
    suggestedAlternative: 'mindfulness',
  },
  {
    emotionId: 'free',
    dbtParent: null,
    oppositeActionApplicable: false,
    clinicalNote: 'Positive liberation state. No harmful action urge. Redirect to mindfulness.',
    suggestedAlternative: 'mindfulness',
  },
  {
    emotionId: 'joyful',
    dbtParent: null,
    oppositeActionApplicable: false,
    clinicalNote: 'Positive high state. No harmful action urge. Redirect to mindfulness.',
    suggestedAlternative: 'mindfulness',
  },
  {
    emotionId: 'curious',
    dbtParent: null,
    oppositeActionApplicable: false,
    clinicalNote: 'Positive approach/exploration state. No harmful action urge. Redirect to mindfulness.',
    suggestedAlternative: 'mindfulness',
  },
  {
    emotionId: 'inquisitive',
    dbtParent: null,
    oppositeActionApplicable: false,
    clinicalNote: 'Positive exploration state. No harmful action urge. Redirect to mindfulness.',
    suggestedAlternative: 'mindfulness',
  },
  {
    emotionId: 'successful',
    dbtParent: null,
    oppositeActionApplicable: false,
    clinicalNote: 'Positive achievement state. No harmful action urge. Redirect to mindfulness.',
    suggestedAlternative: 'mindfulness',
  },
  {
    emotionId: 'confident',
    dbtParent: null,
    oppositeActionApplicable: false,
    clinicalNote: 'Positive self-efficacy state. No harmful action urge. Redirect to mindfulness.',
    suggestedAlternative: 'mindfulness',
  },
  {
    emotionId: 'respected',
    dbtParent: null,
    oppositeActionApplicable: false,
    clinicalNote: 'Positive social recognition state. No harmful action urge. Redirect to mindfulness.',
    suggestedAlternative: 'mindfulness',
  },
  {
    emotionId: 'valued',
    dbtParent: null,
    oppositeActionApplicable: false,
    clinicalNote: 'Positive belonging state. No harmful action urge. Redirect to mindfulness.',
    suggestedAlternative: 'mindfulness',
  },
  {
    emotionId: 'courageous',
    dbtParent: null,
    oppositeActionApplicable: false,
    clinicalNote: 'Positive approach state — this IS the opposite of fear. No harmful action urge. Redirect to mindfulness.',
    suggestedAlternative: 'mindfulness',
  },
  {
    emotionId: 'creative',
    dbtParent: null,
    oppositeActionApplicable: false,
    clinicalNote: 'Positive flow state. No harmful action urge. Redirect to mindfulness.',
    suggestedAlternative: 'mindfulness',
  },
  {
    emotionId: 'loving',
    dbtParent: 'love',
    oppositeActionApplicable: true,
    clinicalNote: 'Love that does not fit the facts (e.g., toward someone harmful). OA: avoid contact, distract, remind of negatives. When love fits the facts, no OA needed.',
    suggestedAlternative: null,
  },
  {
    emotionId: 'thankful',
    dbtParent: null,
    oppositeActionApplicable: false,
    clinicalNote: 'Positive gratitude state. No harmful action urge. Redirect to mindfulness.',
    suggestedAlternative: 'mindfulness',
  },
  {
    emotionId: 'sensitive',
    dbtParent: null,
    oppositeActionApplicable: false,
    clinicalNote: 'Heightened awareness state. Not inherently harmful. Redirect to mindfulness to observe without reactivity.',
    suggestedAlternative: 'mindfulness',
  },
  {
    emotionId: 'intimate',
    dbtParent: 'love',
    oppositeActionApplicable: true,
    clinicalNote: 'Intimacy that does not fit the facts (e.g., with someone harmful or unavailable). OA: create distance, reduce contact. When it fits the facts, no OA needed.',
    suggestedAlternative: null,
  },
  {
    emotionId: 'hopeful',
    dbtParent: null,
    oppositeActionApplicable: false,
    clinicalNote: 'Positive future-oriented state. No harmful action urge. Redirect to mindfulness.',
    suggestedAlternative: 'mindfulness',
  },
  {
    emotionId: 'inspired',
    dbtParent: null,
    oppositeActionApplicable: false,
    clinicalNote: 'Positive motivational state. No harmful action urge. Redirect to mindfulness.',
    suggestedAlternative: 'mindfulness',
  },

  // Additional happy-family emotions from emotions.ts (low-pleasant quadrant)
  {
    emotionId: 'calm',
    dbtParent: null,
    oppositeActionApplicable: false,
    clinicalNote: 'Regulated positive state. No harmful action urge. Redirect to mindfulness.',
    suggestedAlternative: 'mindfulness',
  },
  {
    emotionId: 'relaxed',
    dbtParent: null,
    oppositeActionApplicable: false,
    clinicalNote: 'Positive low-arousal state. No harmful action urge. Redirect to mindfulness.',
    suggestedAlternative: 'mindfulness',
  },
  {
    emotionId: 'good',
    dbtParent: null,
    oppositeActionApplicable: false,
    clinicalNote: 'General positive state. No harmful action urge. Redirect to mindfulness.',
    suggestedAlternative: 'mindfulness',
  },
  {
    emotionId: 'chill',
    dbtParent: null,
    oppositeActionApplicable: false,
    clinicalNote: 'Casual positive state. No harmful action urge. Redirect to mindfulness.',
    suggestedAlternative: 'mindfulness',
  },
  {
    emotionId: 'comfortable',
    dbtParent: null,
    oppositeActionApplicable: false,
    clinicalNote: 'Positive ease state. No harmful action urge. Redirect to mindfulness.',
    suggestedAlternative: 'mindfulness',
  },
  {
    emotionId: 'thoughtful',
    dbtParent: null,
    oppositeActionApplicable: false,
    clinicalNote: 'Reflective positive state. No harmful action urge. Redirect to mindfulness.',
    suggestedAlternative: 'mindfulness',
  },
  {
    emotionId: 'mellow',
    dbtParent: null,
    oppositeActionApplicable: false,
    clinicalNote: 'Low-energy positive state. No harmful action urge. Redirect to mindfulness.',
    suggestedAlternative: 'mindfulness',
  },
  {
    emotionId: 'sympathetic',
    dbtParent: null,
    oppositeActionApplicable: false,
    clinicalNote: 'Positive empathic state. No harmful action urge. Redirect to mindfulness.',
    suggestedAlternative: 'mindfulness',
  },
  {
    emotionId: 'serene',
    dbtParent: null,
    oppositeActionApplicable: false,
    clinicalNote: 'Deep calm positive state. No harmful action urge. Redirect to mindfulness.',
    suggestedAlternative: 'mindfulness',
  },
  {
    emotionId: 'secure',
    dbtParent: null,
    oppositeActionApplicable: false,
    clinicalNote: 'Positive safety state. No harmful action urge. Redirect to mindfulness.',
    suggestedAlternative: 'mindfulness',
  },
  {
    emotionId: 'satisfied',
    dbtParent: null,
    oppositeActionApplicable: false,
    clinicalNote: 'Positive fulfillment state. No harmful action urge. Redirect to mindfulness.',
    suggestedAlternative: 'mindfulness',
  },
  {
    emotionId: 'restful',
    dbtParent: null,
    oppositeActionApplicable: false,
    clinicalNote: 'Positive low-arousal state. No harmful action urge. Redirect to mindfulness.',
    suggestedAlternative: 'mindfulness',
  },
  {
    emotionId: 'appreciative',
    dbtParent: null,
    oppositeActionApplicable: false,
    clinicalNote: 'Positive gratitude state. No harmful action urge. Redirect to mindfulness.',
    suggestedAlternative: 'mindfulness',
  },
  {
    emotionId: 'at_ease',
    dbtParent: null,
    oppositeActionApplicable: false,
    clinicalNote: 'Positive comfort state. No harmful action urge. Redirect to mindfulness.',
    suggestedAlternative: 'mindfulness',
  },
  {
    emotionId: 'balanced',
    dbtParent: null,
    oppositeActionApplicable: false,
    clinicalNote: 'Regulated equilibrium state. No harmful action urge. Redirect to mindfulness.',
    suggestedAlternative: 'mindfulness',
  },
  {
    emotionId: 'grounded',
    dbtParent: null,
    oppositeActionApplicable: false,
    clinicalNote: 'Positive anchored state. No harmful action urge. Redirect to mindfulness.',
    suggestedAlternative: 'mindfulness',
  },
  {
    emotionId: 'tender',
    dbtParent: 'love',
    oppositeActionApplicable: true,
    clinicalNote: 'Tenderness toward someone harmful or unavailable could drive maladaptive approach behavior. OA: create distance when love does not fit facts.',
    suggestedAlternative: null,
  },
  {
    emotionId: 'cozy',
    dbtParent: null,
    oppositeActionApplicable: false,
    clinicalNote: 'Positive comfort state. No harmful action urge. Redirect to mindfulness.',
    suggestedAlternative: 'mindfulness',
  },
  {
    emotionId: 'humble',
    dbtParent: null,
    oppositeActionApplicable: false,
    clinicalNote: 'Positive self-awareness state. No harmful action urge. Redirect to mindfulness.',
    suggestedAlternative: 'mindfulness',
  },

  // =====================================================
  // SURPRISED FAMILY
  // =====================================================
  // Most are transitional/neutral -> mindfulness.
  // Exceptions mapped by action urge.

  {
    emotionId: 'surprised',
    dbtParent: null,
    oppositeActionApplicable: false,
    clinicalNote: 'Transitional orienting response, not a sustained emotion with an action urge. Redirect to mindfulness (observe what just happened).',
    suggestedAlternative: 'mindfulness',
  },
  {
    emotionId: 'startled',
    dbtParent: null,
    oppositeActionApplicable: false,
    clinicalNote: 'Reflexive orienting response. Transient, not an emotion requiring intervention. Redirect to mindfulness.',
    suggestedAlternative: 'mindfulness',
  },
  {
    emotionId: 'confused',
    dbtParent: null,
    oppositeActionApplicable: false,
    clinicalNote: 'Cognitive uncertainty, not an emotional action urge. Redirect to mindfulness (observe, describe).',
    suggestedAlternative: 'mindfulness',
  },
  {
    emotionId: 'amazed',
    dbtParent: null,
    oppositeActionApplicable: false,
    clinicalNote: 'Positive wonder state. No harmful action urge. Redirect to mindfulness.',
    suggestedAlternative: 'mindfulness',
  },
  {
    emotionId: 'excited',
    dbtParent: null,
    oppositeActionApplicable: false,
    clinicalNote: 'Positive high-energy state. No harmful action urge. Redirect to mindfulness.',
    suggestedAlternative: 'mindfulness',
  },
  {
    emotionId: 'shocked',
    dbtParent: 'fear',
    oppositeActionApplicable: true,
    clinicalNote: 'Shock produces freeze/avoidance action urge (not just surprise). OA: approach, re-engage rather than shutting down.',
    suggestedAlternative: null,
  },
  {
    emotionId: 'dismayed',
    dbtParent: 'sadness',
    oppositeActionApplicable: true,
    clinicalNote: 'Dismay produces withdrawal and giving up, not just surprise. OA: get active, approach the situation.',
    suggestedAlternative: null,
  },
  {
    emotionId: 'disillusioned',
    dbtParent: 'sadness',
    oppositeActionApplicable: true,
    clinicalNote: 'Loss of belief produces cynical withdrawal. OA: approach with renewed engagement, get active.',
    suggestedAlternative: null,
  },
  {
    emotionId: 'perplexed',
    dbtParent: null,
    oppositeActionApplicable: false,
    clinicalNote: 'Cognitive confusion, not an emotional action urge. Redirect to mindfulness (observe, describe, check the facts).',
    suggestedAlternative: 'mindfulness',
  },
  {
    emotionId: 'astonished',
    dbtParent: null,
    oppositeActionApplicable: false,
    clinicalNote: 'Intense surprise without sustained harmful action urge. Redirect to mindfulness.',
    suggestedAlternative: 'mindfulness',
  },
  {
    emotionId: 'awe',
    dbtParent: null,
    oppositeActionApplicable: false,
    clinicalNote: 'Positive transcendent state. No harmful action urge. Redirect to mindfulness.',
    suggestedAlternative: 'mindfulness',
  },
  {
    emotionId: 'eager',
    dbtParent: null,
    oppositeActionApplicable: false,
    clinicalNote: 'Positive anticipatory state. No harmful action urge. Redirect to mindfulness.',
    suggestedAlternative: 'mindfulness',
  },
  {
    emotionId: 'energetic',
    dbtParent: null,
    oppositeActionApplicable: false,
    clinicalNote: 'Positive high-energy state. No harmful action urge. Redirect to mindfulness.',
    suggestedAlternative: 'mindfulness',
  },
];

// ============================================================
// Lookup Utilities
// ============================================================

const mappingById = new Map(
  oppositeActionMappings.map((m) => [m.emotionId, m])
);

/**
 * Get the Opposite Action mapping for a specific emotion.
 */
export function getOppositeActionMapping(emotionId: string): OppositeActionMapping | undefined {
  return mappingById.get(emotionId);
}

/**
 * Get all emotions that map to a specific DBT parent emotion.
 */
export function getEmotionsByDbtParent(parent: DbtParentEmotion): OppositeActionMapping[] {
  return oppositeActionMappings.filter((m) => m.dbtParent === parent);
}

/**
 * Get all emotions where Opposite Action is applicable.
 */
export function getOppositeActionApplicable(): OppositeActionMapping[] {
  return oppositeActionMappings.filter((m) => m.oppositeActionApplicable);
}

/**
 * Get all emotions where Opposite Action is NOT applicable,
 * grouped by suggested alternative.
 */
export function getNotApplicable(): OppositeActionMapping[] {
  return oppositeActionMappings.filter((m) => !m.oppositeActionApplicable);
}

/**
 * Quick check: does this emotion support Opposite Action?
 */
export function isOppositeActionApplicable(emotionId: string): boolean {
  return mappingById.get(emotionId)?.oppositeActionApplicable ?? false;
}

/**
 * Get the DBT parent emotion for a given emotion ID.
 * Returns null if not applicable or not found.
 */
export function getDbtParent(emotionId: string): DbtParentEmotion | null {
  return mappingById.get(emotionId)?.dbtParent ?? null;
}

// ============================================================
// Opposite Action Protocol Descriptions
// ============================================================

export interface OppositeActionProtocol {
  parent: DbtParentEmotion;
  actionUrge: string;
  oppositeAction: string;
  keySteps: string[];
  whenToUse: string;
  whenNotToUse: string;
}

export const oppositeActionProtocols: Record<DbtParentEmotion, OppositeActionProtocol> = {
  fear: {
    parent: 'fear',
    actionUrge: 'Avoid, escape, freeze, run away',
    oppositeAction: 'Approach what you fear, gradually',
    keySteps: [
      'Do what you are afraid of, gradually',
      'Approach the feared event, place, person, or activity',
      'Do things that give you a sense of control and mastery',
      'Keep your eyes open — no looking away',
      'Adopt a confident body posture',
    ],
    whenToUse: 'When the fear does NOT fit the facts — the situation is not actually dangerous.',
    whenNotToUse: 'When the fear FITS the facts — the threat is real. Use problem-solving instead.',
  },
  anger: {
    parent: 'anger',
    actionUrge: 'Attack, criticize, punish, lash out, stonewall',
    oppositeAction: 'Be kind and gentle; gently avoid rather than attacking',
    keySteps: [
      'Gently avoid the person you are angry at (instead of attacking)',
      'Do something kind rather than mean or aggressive',
      'Imagine understanding the other person\'s point of view',
      'Relax your face, unclench your hands, relax your body',
      'Change your body chemistry (cold water, slow breathing)',
    ],
    whenToUse: 'When the anger does NOT fit the facts, or when acting on anger would be ineffective.',
    whenNotToUse: 'When anger fits the facts AND the situation calls for assertion. Use DEAR MAN instead.',
  },
  sadness: {
    parent: 'sadness',
    actionUrge: 'Withdraw, isolate, become passive, shut down, cry',
    oppositeAction: 'Get active, approach people and activities',
    keySteps: [
      'Get active — don\'t stay in bed, don\'t avoid',
      'Approach, don\'t withdraw',
      'Do things that make you feel competent and in control',
      'Engage with the world even when you don\'t feel like it',
      'Pay attention to positive events — don\'t push them away',
    ],
    whenToUse: 'When sadness does NOT fit the facts, or when withdrawing makes the sadness worse.',
    whenNotToUse: 'When sadness fits the facts and needs to be expressed. Use mindfulness of emotions instead.',
  },
  disgust: {
    parent: 'disgust',
    actionUrge: 'Push away, avoid, reject, expel',
    oppositeAction: 'Approach rather than avoiding or pushing away',
    keySteps: [
      'Move toward what disgusts you (when safe to do so)',
      'Stay present rather than pulling away',
      'Observe the experience without pushing it away',
      'Practice non-judgmental stance',
    ],
    whenToUse: 'When disgust does NOT fit the facts — the thing is not actually contaminated, dangerous, or morally wrong.',
    whenNotToUse: 'When disgust fits the facts — the thing is genuinely harmful or toxic. Trust the signal.',
  },
  shame: {
    parent: 'shame',
    actionUrge: 'Hide, conceal, shrink, avoid being seen, withdraw',
    oppositeAction: 'Share and disclose; adopt a proud posture',
    keySteps: [
      'Make what you are ashamed of public (talk about it with someone you trust)',
      'Adopt a proud posture — head up, shoulders back',
      'Repeat the behavior that you feel ashamed of (when it was not harmful)',
      'Don\'t apologize or try to make up for not being "enough"',
      'Approach, don\'t avoid',
    ],
    whenToUse: 'When shame does NOT fit the facts — you did not actually violate your own moral code, or the "rule" is unreasonable.',
    whenNotToUse: 'When shame fits the facts (you violated your own values). In that case, it becomes guilt — repair the harm.',
  },
  guilt: {
    parent: 'guilt',
    actionUrge: 'Ruminate, self-punish, confess excessively, avoid the person harmed',
    oppositeAction: 'Repair the harm (when guilt fits); let go and move on (when it does not)',
    keySteps: [
      'If guilt fits: apologize, repair the damage, commit to not repeating the behavior',
      'If guilt does not fit: do what you feel guilty about again (mindfully)',
      'Let go of excessive self-punishment',
      'Accept that you made an error and recommit to your values',
      'Don\'t overapologize or engage in punishing rituals',
    ],
    whenToUse: 'When guilt is driving self-punishment or avoidance that is not helping.',
    whenNotToUse: 'When guilt fits the facts and you have not yet made amends. Repair first, then the guilt should naturally decrease.',
  },
  jealousy: {
    parent: 'jealousy',
    actionUrge: 'Control, monitor, restrict, cling, interrogate, spy',
    oppositeAction: 'Let go of controlling; share; act with trust',
    keySteps: [
      'Stop checking up on the person',
      'Stop trying to control their behavior',
      'Share what you have rather than guarding it',
      'Act in a trusting manner even when you feel jealous',
      'No accusations, no interrogations',
    ],
    whenToUse: 'When jealousy does NOT fit the facts, or when controlling behavior is damaging the relationship.',
    whenNotToUse: 'When there is genuine evidence of betrayal. Use problem-solving and interpersonal effectiveness instead.',
  },
  envy: {
    parent: 'envy',
    actionUrge: 'Tear down, undermine, bitterly compare, sabotage',
    oppositeAction: 'Count your blessings; inhibit destructive urges',
    keySteps: [
      'Count your own blessings and successes',
      'Inhibit the urge to tear down or undermine the envied person',
      'Practice gratitude for what you have',
      'Use the envy as information: what do you want to build in your own life?',
      'Be genuinely complimentary toward the person you envy',
    ],
    whenToUse: 'When envy is leading to destructive behavior (gossip, sabotage, bitterness).',
    whenNotToUse: 'When you can use the information constructively to motivate your own growth. Channel into values-based action.',
  },
  love: {
    parent: 'love',
    actionUrge: 'Approach, seek closeness, nurture, protect, sacrifice',
    oppositeAction: 'Avoid contact; distract yourself; remind yourself of negatives',
    keySteps: [
      'Avoid contact with the person (no calls, texts, social media)',
      'Distract yourself with other activities and people',
      'Remind yourself of the reasons this love doesn\'t fit (harmful person, unavailable, etc.)',
      'Remove reminders from your environment',
      'Practice thought-defusion with loving thoughts',
    ],
    whenToUse: 'When love does NOT fit the facts — the person is harmful, abusive, or the relationship is destructive.',
    whenNotToUse: 'When love fits the facts. Love is healthy and adaptive most of the time. Don\'t use OA on healthy love.',
  },
};

/**
 * Get the Opposite Action protocol for a given DBT parent emotion.
 */
export function getProtocol(parent: DbtParentEmotion): OppositeActionProtocol {
  return oppositeActionProtocols[parent];
}

/**
 * For a specific emotion, get the full OA protocol if applicable.
 * Returns null if OA is not applicable for this emotion.
 */
export function getProtocolForEmotion(emotionId: string): OppositeActionProtocol | null {
  const mapping = getOppositeActionMapping(emotionId);
  if (!mapping?.dbtParent || !mapping.oppositeActionApplicable) return null;
  return oppositeActionProtocols[mapping.dbtParent];
}
