// ============================================================
// EMOTION REGULATION CONTENT (Check the Facts, Opposite Action, Problem Solve)
// Linehan-sourced: Handouts 6, 8a, 11, 13 (DBT Skills Training Handouts and Worksheets, 2e)
// ============================================================
// Creates/updates EmotionRegulationContent nodes (one per DBT parent emotion)
// and links them to existing Emotion nodes where id matches dbtParent.
// Use this for Step 3 — Check the Facts: show fitsTheFactsWhen as tappable items.
// ============================================================

// --- FEAR ---
MERGE (c:EmotionRegulationContent {dbtParent: 'fear'})
SET c.label = 'Fear',
    c.fitsTheFactsWhen = [
      "There's a real threat to my life or someone I care about.",
      "There's a real threat to my health or someone I care about.",
      "There's a real threat to my well-being or someone I care about."
    ],
    c.commonActionUrges = [
      'Run away or avoid.',
      'Freeze or try not to move.',
      'Escape the situation.',
      'Plead or cry for help.',
      'Hide from what I fear.'
    ],
    c.oppositeActionsBasic = [
      'Do what you are afraid of doing … over and over.',
      'Approach events, places, tasks, activities, and people you are afraid of.',
      'Do things to give yourself a sense of control and mastery over your fears.'
    ],
    c.oppositeActionsAllTheWay = [
      'Keep your eyes and ears open and focused on the feared event. Look around slowly; explore.',
      'Take in the information from the situation (notice that you are safe).',
      'Change posture and keep a confident voice tone. Head and eyes up, shoulders back but relaxed. Assertive body posture.',
      'Change your body chemistry: paced breathing — breathe in deeply, breathe out slowly.'
    ],
    c.problemSolveActions = [
      'Freeze or run if danger is near.',
      'Remove the threatening event.',
      'Do what gives you a sense of control and mastery of the fearful event.',
      'Avoid the threatening event.'
    ];

MATCH (e:Emotion {id: 'fear'})
MATCH (c:EmotionRegulationContent {dbtParent: 'fear'})
MERGE (e)-[:HAS_REGULATION_CONTENT]->(c);

// --- ANGER ---
MERGE (c:EmotionRegulationContent {dbtParent: 'anger'})
SET c.label = 'Anger',
    c.fitsTheFactsWhen = [
      'An important goal is blocked or a desired activity is interrupted or prevented.',
      'I or someone I care about is attacked or hurt by others.',
      'I or someone I care about is insulted or threatened by others.',
      'The integrity or status of my social group is offended or threatened.'
    ],
    c.commonActionUrges = [
      'Attack (physically or verbally).',
      'Make aggressive or threatening gestures.',
      'Criticize or complain.',
      'Walk out or slam doors.',
      'Use a loud, quarrelsome, or sarcastic voice.'
    ],
    c.oppositeActionsBasic = [
      'Gently avoid the person you are angry with (rather than attacking).',
      'Take a time out; breathe in and out deeply and slowly.',
      'Be kind (rather than mean or insulting).'
    ],
    c.oppositeActionsAllTheWay = [
      'Imagine understanding and empathy for the other person. Step into their shoes. See the situation from their point of view. Imagine really good reasons for what has happened.',
      'Change your posture: unclench hands, palms up, fingers relaxed (willing hands). Relax chest and stomach. Unclench teeth. Relax facial muscles. Half-smile.',
      'Change your body chemistry: paced breathing, or run or engage in another physically energetic, nonviolent activity.'
    ],
    c.problemSolveActions = [
      'Fight back when being attacked, if you have nothing to lose by fighting.',
      'Overcome obstacles to goals.',
      'Work to stop further attacks, insults, and threats.',
      'Avoid or walk out on people who are threatening.'
    ];

MATCH (e:Emotion {id: 'anger'})
MATCH (c:EmotionRegulationContent {dbtParent: 'anger'})
MERGE (e)-[:HAS_REGULATION_CONTENT]->(c);

// --- DISGUST ---
MERGE (c:EmotionRegulationContent {dbtParent: 'disgust'})
SET c.label = 'Disgust',
    c.fitsTheFactsWhen = [
      'Something I am in contact with could poison or contaminate me.',
      'Somebody I deeply dislike is touching me or someone I care about.',
      "I'm around a person or group whose behavior or thinking could seriously damage or harmfully influence me or the group I'm part of."
    ],
    c.commonActionUrges = [
      'Push or kick away; run away.',
      'Vomit, spit out, wash or scrub.',
      'Avoid eating or drinking.',
      'Treat with disdain or disrespect.',
      'Close eyes, look away.'
    ],
    c.oppositeActionsBasic = [
      'Move close. Eat, drink, stand near, or embrace what you found disgusting.',
      "Be kind to those you feel contempt for; step into the other person's shoes."
    ],
    c.oppositeActionsAllTheWay = [
      'Imagine understanding and empathy for the person you feel disgust or contempt for. See the situation from their point of view. Imagine really good reasons for how they are behaving or looking.',
      'Take in what feels repulsive. Be sensual (inhaling, looking at, touching, listening, tasting).',
      'Change your posture: unclench hands, palms up, fingers relaxed. Relax chest and stomach. Unclench teeth. Relax facial muscles. Half-smile.',
      'Change your body chemistry: paced breathing.'
    ],
    c.problemSolveActions = [
      'Remove or clean up revolting things.',
      'Influence others to stop harmful actions or things that contaminate your community.',
      'Avoid or push away harmful people or things.',
      'Imagine understanding a person who has done disgusting things.'
    ];

MATCH (e:Emotion {id: 'disgust'})
MATCH (c:EmotionRegulationContent {dbtParent: 'disgust'})
MERGE (e)-[:HAS_REGULATION_CONTENT]->(c);

// --- ENVY ---
MERGE (c:EmotionRegulationContent {dbtParent: 'envy'})
SET c.label = 'Envy',
    c.fitsTheFactsWhen = [
      "Another person or group has what I want or need but don't have."
    ],
    c.commonActionUrges = [
      'Try to take away or ruin what the other person has.',
      'Attack or criticize the other person.',
      'Do something to get even or make them fail.',
      'Say mean things about them or make them look bad.',
      'Avoid people who have what I want.'
    ],
    c.oppositeActionsBasic = [
      'Inhibit destroying what the other person has.',
      'Count your blessings. Make a list of the things you are thankful for.'
    ],
    c.oppositeActionsAllTheWay = [
      'Count all your blessings. Avoid discounting some; avoid exaggerating your deprivations.',
      "Stop exaggerating others' net worth or value; check the facts.",
      'Change your posture: unclench hands, palms up, fingers relaxed. Relax chest and stomach. Unclench teeth. Relax facial muscles. Half-smile.',
      'Change your body chemistry: paced breathing.'
    ],
    c.problemSolveActions = [
      'Improve yourself and your life.',
      'Get others to be fair.',
      "Devalue what others have that you don't have.",
      "Put on rose-colored glasses.",
      'Avoid people who have more than you.'
    ];

// --- JEALOUSY ---
MERGE (c:EmotionRegulationContent {dbtParent: 'jealousy'})
SET c.label = 'Jealousy',
    c.fitsTheFactsWhen = [
      'A very important and desired relationship or object in my life is in danger of being damaged or lost.',
      "Someone is threatening to take a valued relationship or object away from me."
    ],
    c.commonActionUrges = [
      'Control the person; restrict their freedom.',
      'Spy on or interrogate the person.',
      'Demand accounting of time or activities.',
      'Cling; become more dependent.',
      'Accuse them of disloyalty or unfaithfulness.'
    ],
    c.oppositeActionsBasic = [
      "Let go of controlling others' actions.",
      'Share the things and people you have in your life.'
    ],
    c.oppositeActionsAllTheWay = [
      'Stop spying or snooping. Suppress probing questions. Fire your "private detective."',
      'No avoiding. Listen to all the details. Focus on sensations. Keep your eyes open; look around. Take in all the information about the situation.',
      'Change your posture: unclench hands, palms up, fingers relaxed. Relax chest and stomach. Unclench teeth. Relax facial muscles. Half-smile.',
      'Change your body chemistry: paced breathing.'
    ],
    c.problemSolveActions = [
      'Protect what you have.',
      'Work at being more desirable to the person(s) you want to be in a relationship with; fight for the relationship.',
      'Leave the relationship.'
    ];

// --- LOVE ---
MERGE (c:EmotionRegulationContent {dbtParent: 'love'})
SET c.label = 'Love',
    c.fitsTheFactsWhen = [
      'Loving this person, animal, or object enhances quality of life for me or those I care about.',
      'Loving them increases my chances of attaining my own personal goals.'
    ],
    c.commonActionUrges = [
      'Seek out the person; spend time with them.',
      'Express love; say "I love you."',
      'Touch, hug, hold; want physical or emotional closeness.',
      'Do things they want or need.'
    ],
    c.oppositeActionsBasic = [
      'Avoid the person, animal, or object you love.',
      'Distract yourself from thoughts of the person, animal, or object.',
      'Remind yourself of why love is not justified (rehearse the "cons" of loving) when loving thoughts do arise.'
    ],
    c.oppositeActionsAllTheWay = [
      'Avoid contact with everything that reminds you of the person: pictures, messages, belongings, mementos, places you were together. No following, waiting for, or looking for the person.',
      'Stop expressing love for the person, even to friends. Be unfriendly (e.g., unfriend on social media).',
      'If you are around the person: no leaning toward them, no getting close enough to touch, no sighing or gazing.'
    ],
    c.problemSolveActions = [
      'Be with the person, animal, or thing that you love.',
      'Touch, hold, etc., the beloved.',
      'Avoid separations when possible.',
      'If the beloved is lost, fight to find or get the beloved back (if it may be possible).'
    ];

MATCH (e:Emotion {id: 'love'})
MATCH (c:EmotionRegulationContent {dbtParent: 'love'})
MERGE (e)-[:HAS_REGULATION_CONTENT]->(c);

// --- SADNESS ---
MERGE (c:EmotionRegulationContent {dbtParent: 'sadness'})
SET c.label = 'Sadness',
    c.fitsTheFactsWhen = [
      'I have lost something or someone permanently.',
      "Things are not the way I wanted or expected and hoped them to be."
    ],
    c.commonActionUrges = [
      'Withdraw; avoid people and activities.',
      'Stay in bed; be inactive.',
      'Give up and stop trying to improve.',
      'Talk little or not at all; use a quiet, slow voice.'
    ],
    c.oppositeActionsBasic = [
      'Get active; approach.',
      'Avoid avoiding.',
      'Build mastery: do things that make you feel competent and self-confident.',
      'Increase pleasant events.'
    ],
    c.oppositeActionsAllTheWay = [
      'Pay attention to the present moment. Be mindful of your environment — each detail as it unfolds. Experience new or positive activities you are engaging in.',
      'Change your posture: adopt a "bright" body posture — head up, eyes open, shoulders back. Keep an upbeat voice tone.',
      'Change your body chemistry: increase physical movement (run, jog, walk, or other active exercise).'
    ],
    c.problemSolveActions = [
      "Grieve; have a memorial service; visit the cemetery (but don't build a house at the cemetery).",
      'Retrieve or replace what is lost.',
      'Plan how to rebuild a life worth living without the beloved or expected outcomes.',
      'Accumulate positives.',
      'Build mastery: do things that make you feel competent and self-confident.',
      'Communicate need for help. Accept help offered.',
      'Put on rose-colored glasses.'
    ];

MATCH (e:Emotion {id: 'sadness'})
MATCH (c:EmotionRegulationContent {dbtParent: 'sadness'})
MERGE (e)-[:HAS_REGULATION_CONTENT]->(c);

// --- SHAME ---
MERGE (c:EmotionRegulationContent {dbtParent: 'shame'})
SET c.label = 'Shame',
    c.fitsTheFactsWhen = [
      "I will be rejected by a person or group I care about if characteristics of myself or my behavior are made public."
    ],
    c.commonActionUrges = [
      'Hide behavior or characteristics from others.',
      'Avoid the person I have harmed or who have criticized me.',
      'Withdraw; cover my face.',
      'Apologize over and over.',
      'Look down and away from others.'
    ],
    c.oppositeActionsBasic = [
      "Make public your personal characteristics or your behavior (with people who won't reject you).",
      "Repeat the behavior that sets off shame over and over (without hiding the behavior from those who won't reject you)."
    ],
    c.oppositeActionsAllTheWay = [
      'No apologizing or trying to make up for a perceived transgression.',
      'Take in all the information from the situation.',
      'Change your body posture: look innocent and proud. Lift your head; "puff up" your chest; maintain eye contact. Keep your voice tone steady and clear.'
    ],
    c.problemSolveActions = [
      'Hide what will get you rejected.',
      'Appease those offended.',
      'Change your behavior or personal characteristics to fit in.',
      'Avoid groups who disapprove of you.',
      'Find a new group that fits your values or that likes your personal characteristics.',
      "Work to change society's or a person's values."
    ];

// Link hot_shame and cold_shame to the same shame content
MATCH (c:EmotionRegulationContent {dbtParent: 'shame'})
MATCH (e:Emotion) WHERE e.id IN ['hot_shame', 'cold_shame']
MERGE (e)-[:HAS_REGULATION_CONTENT]->(c);

// --- GUILT ---
MERGE (c:EmotionRegulationContent {dbtParent: 'guilt'})
SET c.label = 'Guilt',
    c.fitsTheFactsWhen = [
      'My own behavior violates my own values or moral code.'
    ],
    c.commonActionUrges = [
      'Try to repair the harm; make amends; fix the damage.',
      'Ask for forgiveness; apologize; confess.',
      'Give gifts or make sacrifices to try to make up for the transgression.',
      'Bow my head; kneel before the person.'
    ],
    c.oppositeActionsBasic = [
      "Make public your personal characteristics or your behavior (with people who won't reject you).",
      "Repeat the behavior that sets off guilt over and over (without hiding from those who won't reject you)."
    ],
    c.oppositeActionsAllTheWay = [
      'No apologizing or trying to make up for a perceived transgression.',
      'Take in all the information from the situation.',
      'Change your body posture: look innocent and proud. Lift your head; "puff up" your chest; maintain eye contact. Keep your voice tone steady and clear.'
    ],
    c.problemSolveActions = [
      'Seek forgiveness.',
      'Repair the harm; make things better (or, if not possible, work to prevent or repair similar harm for others).',
      'Accept the consequences gracefully.',
      'Commit to avoiding behaviors that violate your moral values in the future.'
    ];

MATCH (e:Emotion {id: 'guilt'})
MATCH (c:EmotionRegulationContent {dbtParent: 'guilt'})
MERGE (e)-[:HAS_REGULATION_CONTENT]->(c);
