// ============================================================
// EMOTION REGULATION CONTENT — HUMANIZED
// Linehan-sourced: Handouts 6, 8a, 11, 13
// (DBT Skills Training Handouts and Worksheets, 2e)
//
// Voice principle: preserve clinical meaning exactly,
// but write how someone would describe it to a friend.
// First person, plain language, recognition-triggering.
// ============================================================


// --- FEAR ---
MERGE (c:EmotionRegulationContent {dbtParent: 'fear'})
SET c.label = 'Fear',
    c.fitsTheFactsWhen = [
      "I'm in actual danger — something could hurt me or someone I care about.",
      "My health or someone else's health is genuinely at risk right now.",
      "Something is seriously threatening my safety or well-being."
    ],
    c.commonActionUrges = [
      "Get out of here — leave, escape, avoid it entirely.",
      "Freeze up. Don't move, don't speak.",
      "Talk myself out of doing the thing I'm scared of.",
      "Hide or stay away from what's scaring me.",
      "Call for help or cling to someone safe."
    ],
    c.oppositeActionsBasic = [
      "Do the thing you're afraid of — even a small version of it.",
      "Move toward what scares you instead of away from it.",
      "Do something that gives you a sense of 'I can handle this.'"
    ],
    c.oppositeActionsAllTheWay = [
      "Look directly at the situation. Don't close your eyes or look away — take it in slowly.",
      "Notice the evidence that you're actually safe right now.",
      "Stand tall. Head up, shoulders back, voice steady. Take up space.",
      "Slow your breathing: deep breath in, long slow breath out."
    ],
    c.problemSolveActions = [
      "Get to safety if the danger is real and immediate.",
      "Remove or get away from the actual threat.",
      "Take steps to protect yourself — make a plan.",
      "Avoid the genuinely dangerous situation."
    ];

MATCH (e:Emotion {id: 'fear'})
MATCH (c:EmotionRegulationContent {dbtParent: 'fear'})
MERGE (e)-[:HAS_REGULATION_CONTENT]->(c);


// --- ANGER ---
MERGE (c:EmotionRegulationContent {dbtParent: 'anger'})
SET c.label = 'Anger',
    c.fitsTheFactsWhen = [
      "Something important to me is being blocked or taken away.",
      "Someone hurt me or someone I care about — physically or emotionally.",
      "Someone insulted, disrespected, or threatened me or someone I care about.",
      "My people are being treated unfairly or disrespected."
    ],
    c.commonActionUrges = [
      "Lash out — say something cutting or hurtful.",
      "Get loud, argue, or be sarcastic.",
      "Criticize, blame, or complain.",
      "Storm off, slam a door, shut someone out.",
      "Hit something, throw something, break something."
    ],
    c.oppositeActionsBasic = [
      "Give yourself some space from the person — gently, not aggressively.",
      "Take a pause. Breathe slowly and deeply before you respond.",
      "Do something kind instead of mean — even something small."
    ],
    c.oppositeActionsAllTheWay = [
      "Try to imagine their side. What if there's a reason you're not seeing? Step into their shoes for a moment.",
      "Unclench. Open your hands, palms up. Relax your jaw. Let your face soften. Try a half-smile.",
      "Move your body: go for a run, walk fast, do something physical and nonviolent to burn off the energy."
    ],
    c.problemSolveActions = [
      "Stand up for yourself if you need to.",
      "Work to remove what's blocking your goal.",
      "Set a boundary — tell them to stop.",
      "Walk away from someone who's genuinely threatening you."
    ];

MATCH (e:Emotion {id: 'anger'})
MATCH (c:EmotionRegulationContent {dbtParent: 'anger'})
MERGE (e)-[:HAS_REGULATION_CONTENT]->(c);


// --- DISGUST ---
MERGE (c:EmotionRegulationContent {dbtParent: 'disgust'})
SET c.label = 'Disgust',
    c.fitsTheFactsWhen = [
      "Something I'm in contact with could actually make me sick or contaminate me.",
      "Someone who has seriously wronged me is physically too close.",
      "I'm around people whose behavior could genuinely harm me or my community."
    ],
    c.commonActionUrges = [
      "Push it away, get away from it.",
      "Scrub, clean, wash — get it off me.",
      "Refuse to eat or drink.",
      "Treat someone with contempt or look down on them.",
      "Close my eyes, look away, shut it out."
    ],
    c.oppositeActionsBasic = [
      "Move closer instead of pulling away. Stay with the discomfort.",
      "Try seeing the person as human — look for what you might have in common."
    ],
    c.oppositeActionsAllTheWay = [
      "Imagine what it's like to be them. What would make someone act that way? Look for reasons, not excuses.",
      "Let yourself take in what feels repulsive instead of blocking it out.",
      "Unclench. Open your hands, relax your face, soften your jaw. Try a half-smile.",
      "Slow your breathing: deep breath in, long slow breath out."
    ],
    c.problemSolveActions = [
      "Clean up or remove the thing that's actually harmful.",
      "Speak up to stop genuinely harmful behavior in your community.",
      "Distance yourself from people or situations that are truly toxic.",
      "Try to understand what led someone to act in a way you find repulsive."
    ];

MATCH (e:Emotion {id: 'disgust'})
MATCH (c:EmotionRegulationContent {dbtParent: 'disgust'})
MERGE (e)-[:HAS_REGULATION_CONTENT]->(c);


// --- ENVY ---
MERGE (c:EmotionRegulationContent {dbtParent: 'envy'})
SET c.label = 'Envy',
    c.fitsTheFactsWhen = [
      "Someone has something I genuinely need or want — and I don't have it."
    ],
    c.commonActionUrges = [
      "Tear down what they have or sabotage it.",
      "Criticize them or find flaws to feel better.",
      "Do something to get even or make them fail.",
      "Talk badly about them to others.",
      "Avoid anyone who has more than me."
    ],
    c.oppositeActionsBasic = [
      "Stop yourself from tearing down what someone else has.",
      "Name what you DO have. Actually list it."
    ],
    c.oppositeActionsAllTheWay = [
      "Really count your blessings — all of them. Don't discount the small ones or exaggerate what you're missing.",
      "Reality-check how much the other person actually has. Are you inflating it?",
      "Unclench. Open your hands, relax your face, soften your jaw. Try a half-smile.",
      "Slow your breathing: deep breath in, long slow breath out."
    ],
    c.problemSolveActions = [
      "Channel it: work to improve your own life.",
      "Advocate for fairness if the situation is genuinely unfair.",
      "Ask yourself how much what they have actually matters to you.",
      "Focus on your own path. Their lane isn't yours."
    ];


// --- JEALOUSY ---
MERGE (c:EmotionRegulationContent {dbtParent: 'jealousy'})
SET c.label = 'Jealousy',
    c.fitsTheFactsWhen = [
      "A relationship or something I deeply value is genuinely at risk of being lost or damaged.",
      "Someone is actually trying to take away a person or thing that matters to me."
    ],
    c.commonActionUrges = [
      "Control them — check their phone, restrict who they see.",
      "Interrogate: 'Where were you? Who were you with?'",
      "Spy, snoop, or collect evidence.",
      "Cling harder. Be more dependent.",
      "Accuse them of being unfaithful or disloyal."
    ],
    c.oppositeActionsBasic = [
      "Let go of trying to control what they do.",
      "Practice sharing the people and things in your life."
    ],
    c.oppositeActionsAllTheWay = [
      "Stop the detective work. No checking their phone, no probing questions, no snooping.",
      "Don't avoid the uncomfortable parts — let yourself hear the details. Stay present with the information instead of shutting down.",
      "Unclench. Open your hands, relax your face, soften your jaw. Try a half-smile.",
      "Slow your breathing: deep breath in, long slow breath out."
    ],
    c.problemSolveActions = [
      "Protect what you have — invest in the relationship.",
      "Show up as the person you want to be in this relationship.",
      "If the relationship is genuinely over, let yourself grieve and move forward."
    ];


// --- LOVE (when it doesn't fit / isn't effective) ---
MERGE (c:EmotionRegulationContent {dbtParent: 'love'})
SET c.label = 'Love',
    c.fitsTheFactsWhen = [
      "Being with this person genuinely makes my life better.",
      "This relationship helps me become who I want to be."
    ],
    c.commonActionUrges = [
      "Seek them out — text, call, show up.",
      "Say 'I love you.' Express how I feel.",
      "Get close — touch, hug, hold on.",
      "Do whatever they need or want."
    ],
    c.oppositeActionsBasic = [
      "Create distance. Stop reaching out.",
      "When thoughts of them come up, redirect your attention to something else.",
      "Remind yourself specifically why this love isn't good for you right now."
    ],
    c.oppositeActionsAllTheWay = [
      "Remove the reminders: photos, messages, mementos, the places you went together. Stop looking for them. Stop waiting.",
      "Stop talking about them — even to friends. Unfollow, unfriend, create a real break.",
      "If you're around them: don't lean in, don't get close enough to touch, don't stare or sigh."
    ],
    c.problemSolveActions = [
      "Be with the person you love. Show up.",
      "Express your love through touch, presence, words.",
      "Minimize unnecessary separations.",
      "If you've lost them and there's a real chance — fight to reconnect."
    ];

MATCH (e:Emotion {id: 'love'})
MATCH (c:EmotionRegulationContent {dbtParent: 'love'})
MERGE (e)-[:HAS_REGULATION_CONTENT]->(c);


// --- SADNESS ---
MERGE (c:EmotionRegulationContent {dbtParent: 'sadness'})
SET c.label = 'Sadness',
    c.fitsTheFactsWhen = [
      "I've lost something or someone — and they're not coming back.",
      "Things didn't turn out how I hoped or expected."
    ],
    c.commonActionUrges = [
      "Pull away from everyone. Cancel plans.",
      "Stay in bed. Do nothing.",
      "Give up on trying to make things better.",
      "Go quiet — stop talking, stop reaching out."
    ],
    c.oppositeActionsBasic = [
      "Do something — anything. Get moving, even a little.",
      "Don't cancel. Show up even when you don't feel like it.",
      "Do one thing that makes you feel capable or competent.",
      "Add something small and pleasant to your day."
    ],
    c.oppositeActionsAllTheWay = [
      "Be here right now. Notice what's around you — the details, the textures, the sounds. Stay in this moment instead of replaying the loss.",
      "Stand up straight. Head up, eyes open, shoulders back. Use a brighter voice than you feel.",
      "Move your body: walk, jog, stretch, dance — anything that gets you physically activated."
    ],
    c.problemSolveActions = [
      "Let yourself grieve — but don't move in with the grief permanently.",
      "Look for ways to rebuild or replace what was lost.",
      "Start planning a life that works without what you lost.",
      "Build up good things, even small ones.",
      "Ask for help. Accept it when it's offered."
    ];

MATCH (e:Emotion {id: 'sadness'})
MATCH (c:EmotionRegulationContent {dbtParent: 'sadness'})
MERGE (e)-[:HAS_REGULATION_CONTENT]->(c);


// --- SHAME ---
MERGE (c:EmotionRegulationContent {dbtParent: 'shame'})
SET c.label = 'Shame',
    c.fitsTheFactsWhen = [
      "If people I care about found out about this, they would actually reject me — not just disapprove, but leave."
    ],
    c.commonActionUrges = [
      "Hide it. Make sure no one finds out.",
      "Avoid the person I hurt or who saw what I did.",
      "Disappear — withdraw, cover my face, shrink.",
      "Apologize over and over and over.",
      "Can't look anyone in the eye."
    ],
    c.oppositeActionsBasic = [
      "Tell someone safe. Share the thing you're hiding — with someone you trust not to reject you.",
      "Do the thing that triggers the shame again — openly, around people who accept you."
    ],
    c.oppositeActionsAllTheWay = [
      "Stop over-apologizing. You don't need to keep making up for something that doesn't warrant it.",
      "Take in the full picture — not just the worst-case version your shame is showing you.",
      "Stand tall. Head up, chest open, eyes forward. Speak clearly and steadily."
    ],
    c.problemSolveActions = [
      "Protect yourself from groups that would genuinely reject you unfairly.",
      "Find people who share your values and accept you.",
      "Work to change the norms that are causing the rejection.",
      "If you did violate your own values: apologize, repair the damage, commit to doing better, then forgive yourself and move on."
    ];

MATCH (c:EmotionRegulationContent {dbtParent: 'shame'})
MATCH (e:Emotion) WHERE e.id IN ['hot_shame', 'cold_shame']
MERGE (e)-[:HAS_REGULATION_CONTENT]->(c);


// --- GUILT ---
MERGE (c:EmotionRegulationContent {dbtParent: 'guilt'})
SET c.label = 'Guilt',
    c.fitsTheFactsWhen = [
      "What I did actually goes against my own values — not someone else's rules, but mine."
    ],
    c.commonActionUrges = [
      "Fix it, undo it, make it right.",
      "Confess. Apologize. Beg forgiveness.",
      "Give something up to make up for it.",
      "Punish myself."
    ],
    c.oppositeActionsBasic = [
      "Tell someone safe what you did — someone who won't reject you for it.",
      "Do the thing that triggered the guilt again, without hiding, around people who accept you."
    ],
    c.oppositeActionsAllTheWay = [
      "Stop the apology loop. You've said sorry — now stop.",
      "Look at the full picture: what actually happened, what you actually did, what the real impact was.",
      "Stand tall. Head up, chest open, eyes forward. You made a mistake — you're not the mistake."
    ],
    c.problemSolveActions = [
      "Make it right if you can — apologize sincerely, repair the damage.",
      "If you can't undo it, do something to prevent similar harm in the future.",
      "Accept the consequences without spiraling.",
      "Commit to doing differently next time — then actually follow through."
    ];

MATCH (e:Emotion {id: 'guilt'})
MATCH (c:EmotionRegulationContent {dbtParent: 'guilt'})
MERGE (e)-[:HAS_REGULATION_CONTENT]->(c);