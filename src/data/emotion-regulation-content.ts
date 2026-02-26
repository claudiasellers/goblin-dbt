/**
 * Emotion Regulation Content — Linehan-sourced (Handouts 6, 8a, 11, 13)
 *
 * Maps each DBT parent emotion to:
 * - fitsTheFactsWhen: When does this emotion fit the facts? (Handout 8a)
 *   Used for Step 3 Check the Facts: "Does any of this apply right now?" — tappable items.
 *   If user taps one → fits the facts → route to Problem Solve.
 *   If "None of these" / "It's bigger than the situation" → Opposite Action.
 * - commonActionUrges: Typical action urges (Handout 6)
 * - oppositeActionsBasic: Core opposite actions (Handout 10/11)
 * - oppositeActionsAllTheWay: All-the-way opposite actions (Handout 11)
 * - problemSolveActions: What to do when emotion fits the facts (Handout 13)
 */

import type { DBTParentEmotion } from './dbt-parent-mapping';

export interface EmotionRegulationContent {
  /** DBT parent emotion id (fear, anger, sadness, etc.) */
  dbtParent: DBTParentEmotion;
  /** Display label for this emotion in Check the Facts */
  label: string;
  /**
   * When does this emotion fit the facts? (Handout 8a)
   * Shown as "Does any of this apply right now?" — each item is tappable.
   * Tapping one → fits the facts → Problem Solve. "None of these" → Opposite Action.
   */
  fitsTheFactsWhen: string[];
  /**
   * Common action urges for this emotion (Handout 6 — "action urges" / expressions and actions).
   * Optional; used for context or secondary UI.
   */
  commonActionUrges: string[];
  /**
   * Basic opposite actions (Handout 10/11 — "Do the OPPOSITE of your action urges").
   */
  oppositeActionsBasic: string[];
  /**
   * All-the-way opposite actions (Handout 11 — posture, body chemistry, etc.).
   */
  oppositeActionsAllTheWay: string[];
  /**
   * When emotion fits the facts: what to do (Handout 13 — "act on emotion urge, problem-solve, or avoid").
   * Shown after user selects "It fits" / taps a fitsTheFactsWhen item.
   */
  problemSolveActions: string[];
}

/**
 * Linehan-sourced content per DBT parent emotion.
 * Source: DBT Skills Training Handouts and Worksheets, Second Edition (Marsha M. Linehan, 2015).
 * Handouts 6 (Ways to Describe Emotions), 8a (Examples of Emotions That Fit the Facts),
 * 11 (Figuring Out Opposite Actions), 13 (Reviewing Opposite Action and Problem Solving).
 */
export const emotionRegulationContent: Record<DBTParentEmotion, EmotionRegulationContent> = {
  fear: {
    dbtParent: 'fear',
    label: 'Fear',
    fitsTheFactsWhen: [
      "There's a real threat to my life or someone I care about.",
      "There's a real threat to my health or someone I care about.",
      "There's a real threat to my well-being or someone I care about.",
    ],
    commonActionUrges: [
      'Run away or avoid.',
      'Freeze or try not to move.',
      'Escape the situation.',
      'Plead or cry for help.',
      'Hide from what I fear.',
    ],
    oppositeActionsBasic: [
      'Do what you are afraid of doing … over and over.',
      'Approach events, places, tasks, activities, and people you are afraid of.',
      'Do things to give yourself a sense of control and mastery over your fears.',
    ],
    oppositeActionsAllTheWay: [
      'Keep your eyes and ears open and focused on the feared event. Look around slowly; explore.',
      'Take in the information from the situation (notice that you are safe).',
      'Change posture and keep a confident voice tone. Head and eyes up, shoulders back but relaxed. Assertive body posture.',
      'Change your body chemistry: paced breathing — breathe in deeply, breathe out slowly.',
    ],
    problemSolveActions: [
      'Freeze or run if danger is near.',
      'Remove the threatening event.',
      'Do what gives you a sense of control and mastery of the fearful event.',
      'Avoid the threatening event.',
    ],
  },

  anger: {
    dbtParent: 'anger',
    label: 'Anger',
    fitsTheFactsWhen: [
      'An important goal is blocked or a desired activity is interrupted or prevented.',
      'I or someone I care about is attacked or hurt by others.',
      'I or someone I care about is insulted or threatened by others.',
      'The integrity or status of my social group is offended or threatened.',
    ],
    commonActionUrges: [
      'Attack (physically or verbally).',
      'Make aggressive or threatening gestures.',
      'Criticize or complain.',
      'Walk out or slam doors.',
      'Use a loud, quarrelsome, or sarcastic voice.',
    ],
    oppositeActionsBasic: [
      'Gently avoid the person you are angry with (rather than attacking).',
      'Take a time out; breathe in and out deeply and slowly.',
      'Be kind (rather than mean or insulting).',
    ],
    oppositeActionsAllTheWay: [
      'Imagine understanding and empathy for the other person. Step into their shoes. See the situation from their point of view. Imagine really good reasons for what has happened.',
      'Change your posture: unclench hands, palms up, fingers relaxed (willing hands). Relax chest and stomach. Unclench teeth. Relax facial muscles. Half-smile.',
      'Change your body chemistry: paced breathing, or run or engage in another physically energetic, nonviolent activity.',
    ],
    problemSolveActions: [
      'Fight back when being attacked, if you have nothing to lose by fighting.',
      'Overcome obstacles to goals.',
      'Work to stop further attacks, insults, and threats.',
      'Avoid or walk out on people who are threatening.',
    ],
  },

  disgust: {
    dbtParent: 'disgust',
    label: 'Disgust',
    fitsTheFactsWhen: [
      'Something I am in contact with could poison or contaminate me.',
      'Somebody I deeply dislike is touching me or someone I care about.',
      "I'm around a person or group whose behavior or thinking could seriously damage or harmfully influence me or the group I'm part of.",
    ],
    commonActionUrges: [
      'Push or kick away; run away.',
      'Vomit, spit out, wash or scrub.',
      'Avoid eating or drinking.',
      'Treat with disdain or disrespect.',
      'Close eyes, look away.',
    ],
    oppositeActionsBasic: [
      'Move close. Eat, drink, stand near, or embrace what you found disgusting.',
      'Be kind to those you feel contempt for; step into the other person’s shoes.',
    ],
    oppositeActionsAllTheWay: [
      'Imagine understanding and empathy for the person you feel disgust or contempt for. See the situation from their point of view. Imagine really good reasons for how they are behaving or looking.',
      'Take in what feels repulsive. Be sensual (inhaling, looking at, touching, listening, tasting).',
      'Change your posture: unclench hands, palms up, fingers relaxed. Relax chest and stomach. Unclench teeth. Relax facial muscles. Half-smile.',
      'Change your body chemistry: paced breathing.',
    ],
    problemSolveActions: [
      'Remove or clean up revolting things.',
      'Influence others to stop harmful actions or things that contaminate your community.',
      'Avoid or push away harmful people or things.',
      'Imagine understanding a person who has done disgusting things.',
    ],
  },

  envy: {
    dbtParent: 'envy',
    label: 'Envy',
    fitsTheFactsWhen: [
      "Another person or group has what I want or need but don't have.",
    ],
    commonActionUrges: [
      'Try to take away or ruin what the other person has.',
      'Attack or criticize the other person.',
      'Do something to get even or make them fail.',
      'Say mean things about them or make them look bad.',
      'Avoid people who have what I want.',
    ],
    oppositeActionsBasic: [
      'Inhibit destroying what the other person has.',
      'Count your blessings. Make a list of the things you are thankful for.',
    ],
    oppositeActionsAllTheWay: [
      'Count all your blessings. Avoid discounting some; avoid exaggerating your deprivations.',
      "Stop exaggerating others' net worth or value; check the facts.",
      'Change your posture: unclench hands, palms up, fingers relaxed. Relax chest and stomach. Unclench teeth. Relax facial muscles. Half-smile.',
      'Change your body chemistry: paced breathing.',
    ],
    problemSolveActions: [
      'Improve yourself and your life.',
      'Get others to be fair.',
      "Devalue what others have that you don't have.",
      "Put on rose-colored glasses.",
      'Avoid people who have more than you.',
    ],
  },

  jealousy: {
    dbtParent: 'jealousy',
    label: 'Jealousy',
    fitsTheFactsWhen: [
      'A very important and desired relationship or object in my life is in danger of being damaged or lost.',
      "Someone is threatening to take a valued relationship or object away from me.",
    ],
    commonActionUrges: [
      'Control the person; restrict their freedom.',
      'Spy on or interrogate the person.',
      'Demand accounting of time or activities.',
      'Cling; become more dependent.',
      'Accuse them of disloyalty or unfaithfulness.',
    ],
    oppositeActionsBasic: [
      'Let go of controlling others’ actions.',
      'Share the things and people you have in your life.',
    ],
    oppositeActionsAllTheWay: [
      'Stop spying or snooping. Suppress probing questions. Fire your "private detective."',
      'No avoiding. Listen to all the details. Focus on sensations. Keep your eyes open; look around. Take in all the information about the situation.',
      'Change your posture: unclench hands, palms up, fingers relaxed. Relax chest and stomach. Unclench teeth. Relax facial muscles. Half-smile.',
      'Change your body chemistry: paced breathing.',
    ],
    problemSolveActions: [
      'Protect what you have.',
      'Work at being more desirable to the person(s) you want to be in a relationship with; fight for the relationship.',
      'Leave the relationship.',
    ],
  },

  love: {
    dbtParent: 'love',
    label: 'Love',
    fitsTheFactsWhen: [
      'Loving this person, animal, or object enhances quality of life for me or those I care about.',
      'Loving them increases my chances of attaining my own personal goals.',
    ],
    commonActionUrges: [
      'Seek out the person; spend time with them.',
      'Express love; say "I love you."',
      'Touch, hug, hold; want physical or emotional closeness.',
      'Do things they want or need.',
    ],
    oppositeActionsBasic: [
      'Avoid the person, animal, or object you love.',
      'Distract yourself from thoughts of the person, animal, or object.',
      'Remind yourself of why love is not justified (rehearse the "cons" of loving) when loving thoughts do arise.',
    ],
    oppositeActionsAllTheWay: [
      'Avoid contact with everything that reminds you of the person: pictures, messages, belongings, mementos, places you were together. No following, waiting for, or looking for the person.',
      'Stop expressing love for the person, even to friends. Be unfriendly (e.g., unfriend on social media).',
      'If you are around the person: no leaning toward them, no getting close enough to touch, no sighing or gazing.',
    ],
    problemSolveActions: [
      'Be with the person, animal, or thing that you love.',
      'Touch, hold, etc., the beloved.',
      'Avoid separations when possible.',
      'If the beloved is lost, fight to find or get the beloved back (if it may be possible).',
    ],
  },

  sadness: {
    dbtParent: 'sadness',
    label: 'Sadness',
    fitsTheFactsWhen: [
      'I have lost something or someone permanently.',
      "Things are not the way I wanted or expected and hoped them to be.",
    ],
    commonActionUrges: [
      'Withdraw; avoid people and activities.',
      'Stay in bed; be inactive.',
      'Give up and stop trying to improve.',
      'Talk little or not at all; use a quiet, slow voice.',
    ],
    oppositeActionsBasic: [
      'Get active; approach.',
      'Avoid avoiding.',
      'Build mastery: do things that make you feel competent and self-confident.',
      'Increase pleasant events.',
    ],
    oppositeActionsAllTheWay: [
      'Pay attention to the present moment. Be mindful of your environment — each detail as it unfolds. Experience new or positive activities you are engaging in.',
      'Change your posture: adopt a "bright" body posture — head up, eyes open, shoulders back. Keep an upbeat voice tone.',
      'Change your body chemistry: increase physical movement (run, jog, walk, or other active exercise).',
    ],
    problemSolveActions: [
      'Grieve; have a memorial service; visit the cemetery (but don’t build a house at the cemetery).',
      'Retrieve or replace what is lost.',
      'Plan how to rebuild a life worth living without the beloved or expected outcomes.',
      'Accumulate positives.',
      'Build mastery: do things that make you feel competent and self-confident.',
      'Communicate need for help. Accept help offered.',
      'Put on rose-colored glasses.',
    ],
  },

  shame: {
    dbtParent: 'shame',
    label: 'Shame',
    fitsTheFactsWhen: [
      "I will be rejected by a person or group I care about if characteristics of myself or my behavior are made public.",
    ],
    commonActionUrges: [
      'Hide behavior or characteristics from others.',
      'Avoid the person I have harmed or who have criticized me.',
      'Withdraw; cover my face.',
      'Apologize over and over.',
      'Look down and away from others.',
    ],
    oppositeActionsBasic: [
      'Make public your personal characteristics or your behavior (with people who won’t reject you).',
      'Repeat the behavior that sets off shame over and over (without hiding the behavior from those who won’t reject you).',
    ],
    oppositeActionsAllTheWay: [
      'No apologizing or trying to make up for a perceived transgression.',
      'Take in all the information from the situation.',
      'Change your body posture: look innocent and proud. Lift your head; "puff up" your chest; maintain eye contact. Keep your voice tone steady and clear.',
    ],
    problemSolveActions: [
      'Hide what will get you rejected.',
      'Appease those offended.',
      'Change your behavior or personal characteristics to fit in.',
      'Avoid groups who disapprove of you.',
      'Find a new group that fits your values or that likes your personal characteristics.',
      "Work to change society's or a person's values.",
    ],
  },

  guilt: {
    dbtParent: 'guilt',
    label: 'Guilt',
    fitsTheFactsWhen: [
      'My own behavior violates my own values or moral code.',
    ],
    commonActionUrges: [
      'Try to repair the harm; make amends; fix the damage.',
      'Ask for forgiveness; apologize; confess.',
      'Give gifts or make sacrifices to try to make up for the transgression.',
      'Bow my head; kneel before the person.',
    ],
    oppositeActionsBasic: [
      'Make public your personal characteristics or your behavior (with people who won’t reject you).',
      'Repeat the behavior that sets off guilt over and over (without hiding from those who won’t reject you).',
    ],
    oppositeActionsAllTheWay: [
      'No apologizing or trying to make up for a perceived transgression.',
      'Take in all the information from the situation.',
      'Change your body posture: look innocent and proud. Lift your head; "puff up" your chest; maintain eye contact. Keep your voice tone steady and clear.',
    ],
    problemSolveActions: [
      'Seek forgiveness.',
      'Repair the harm; make things better (or, if not possible, work to prevent or repair similar harm for others).',
      'Accept the consequences gracefully.',
      'Commit to avoiding behaviors that violate your moral values in the future.',
    ],
  },
};

const contentByParent = new Map(
  (Object.entries(emotionRegulationContent) as [DBTParentEmotion, EmotionRegulationContent][]).map(
    ([k, v]) => [k, v]
  )
);

/**
 * Get Check the Facts (Handout 8a/11) content for a DBT parent emotion.
 * Use this in Step 3 — show fitsTheFactsWhen as tappable items;
 * tap one → fits the facts → Problem Solve; "None of these" → Opposite Action.
 */
export function getEmotionRegulationContent(
  dbtParent: DBTParentEmotion
): EmotionRegulationContent | undefined {
  return contentByParent.get(dbtParent);
}

/**
 * Get only the "fits the facts when" items for the Check the Facts step.
 * Returns the list of tappable prompts, e.g. for fear:
 * ["There's a real threat to my life or someone I care about.", ...]
 */
export function getFitsTheFactsWhen(dbtParent: DBTParentEmotion): string[] {
  return contentByParent.get(dbtParent)?.fitsTheFactsWhen ?? [];
}
