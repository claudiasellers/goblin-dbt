// ============================================================
// OPPOSITE ACTION DATA — Protocol metadata, Action Urges,
// and per-emotion OA mapping properties.
//
// Run AFTER emotion-regulation-content.cypher (which creates
// EmotionRegulationContent nodes and base properties).
//
// This adds:
//   1. Protocol metadata (fitsFactsGuidance, whyItWorks, etc.)
//   2. ActionUrge nodes with graduated opposites
//   3. Per-emotion OA applicability + clinical notes
//   4. HAS_REGULATION_CONTENT relationships for all applicable emotions
//
// All operations use MERGE — safe to re-run.
// ============================================================


// --- CONSTRAINT ---
CREATE CONSTRAINT action_urge_id IF NOT EXISTS
FOR (u:ActionUrge) REQUIRE u.id IS UNIQUE;


// ============================================================
// 1. PROTOCOL METADATA on EmotionRegulationContent nodes
//    Adds: fitsFactsGuidance, whyItWorks, acknowledgment,
//    bodyOpposite, defaultOppositeSmall/Medium/Bigger
// ============================================================

// --- FEAR ---
MATCH (c:EmotionRegulationContent {dbtParent: 'fear'})
SET c.fitsFactsGuidance = "If there's a real threat, listen to the fear. Remove yourself from danger, problem-solve, or ask for help. Fear that fits the facts is protecting you.",
    c.whyItWorks = "Fear tells you something is dangerous when it may not be. By approaching instead of avoiding, your brain learns the situation is actually safe. Given time, the fear can come down on its own.",
    c.acknowledgment = "Fear is trying to keep you safe by pulling you away from the threat. When the threat isn't real, avoidance keeps the fear alive.",
    c.bodyOpposite = "Relax your jaw and hands. Open your posture. Breathe slowly and deeply. Speak in a steady voice.",
    c.defaultOppositeSmall = "Stay with the discomfort a little longer — even 2 minutes",
    c.defaultOppositeMedium = "Take one step toward what you're avoiding",
    c.defaultOppositeBigger = "Do the thing fully, without escape plans";

// --- ANGER ---
MATCH (c:EmotionRegulationContent {dbtParent: 'anger'})
SET c.fitsFactsGuidance = "If someone actually violated your rights or crossed a boundary, anger is valid. Use it to assert yourself effectively (try DEAR MAN), set boundaries, or problem-solve.",
    c.whyItWorks = "Anger narrows your focus to attack. Kindness and perspective-taking widen it. When you act gently, your brain starts to match — the anger can't sustain itself against genuine compassion.",
    c.acknowledgment = "Anger is mobilizing you to fight back or push against something that feels wrong. When the situation doesn't call for a fight, that energy needs somewhere else to go.",
    c.bodyOpposite = "Relax your face, unclench your fists, drop your shoulders. Speak softly and slowly. Half-smile. Keep your hands open.",
    c.defaultOppositeSmall = "Pause for 10 seconds before doing anything",
    c.defaultOppositeMedium = "Try to see the situation from the other person's perspective",
    c.defaultOppositeBigger = "Do something genuinely kind for the person you're angry at";

// --- SADNESS ---
MATCH (c:EmotionRegulationContent {dbtParent: 'sadness'})
SET c.fitsFactsGuidance = "If you've experienced a real loss, sadness is appropriate. Allow yourself to grieve. Reach out for support rather than isolating, but don't force yourself to get over it.",
    c.whyItWorks = "Sadness tells you to withdraw, which makes sense short-term but keeps you stuck. Activity and connection generate experiences that sadness can't account for. Movement changes brain chemistry.",
    c.acknowledgment = "Sadness is pulling you inward, away from the world. When the withdrawal becomes the thing keeping you stuck, small movements outward can shift everything.",
    c.bodyOpposite = "Sit or stand upright. Look up, not down. Move with purpose even if you're faking it. Speak at a normal volume.",
    c.defaultOppositeSmall = "Do one tiny thing — sit up, open the blinds, send one text",
    c.defaultOppositeMedium = "Get up and do something active for 10 minutes",
    c.defaultOppositeBigger = "Go be around people, even if you don't feel like it";

// --- DISGUST ---
MATCH (c:EmotionRegulationContent {dbtParent: 'disgust'})
SET c.fitsFactsGuidance = "If something genuinely threatens your health or deeply violates your core values, disgust is protective. Remove yourself and problem-solve instead.",
    c.whyItWorks = "Disgust evolved to protect from contamination, but it often fires in social situations where there's no real threat. Approaching teaches your brain the contamination isn't real.",
    c.acknowledgment = "Disgust is pushing you to reject and distance yourself. When the reaction is stronger than the situation warrants, leaning in — even a little — can change the feeling.",
    c.bodyOpposite = "Relax your upper lip and nose. Open your hands. Lean in slightly rather than recoiling. Keep a neutral expression.",
    c.defaultOppositeSmall = "Stay present for 2 more minutes",
    c.defaultOppositeMedium = "Find one thing to appreciate about the situation",
    c.defaultOppositeBigger = "Engage fully, as if the disgust weren't there";

// --- SHAME ---
MATCH (c:EmotionRegulationContent {dbtParent: 'shame'})
SET c.fitsFactsGuidance = "If you actually violated your own deeply-held values, that may be guilt, not shame. Guilt says 'I did something bad'; shame says 'I am bad.' If it's guilt, repair is the right move.",
    c.whyItWorks = "Shame thrives in secrecy and hiding. When you disclose and the world doesn't end — when people still accept you — shame's lie is exposed. You learn that you are not defective.",
    c.acknowledgment = "Shame is telling you to hide — that if people saw the real you, they'd reject you. When shame is lying about your worth, hiding feeds it. Visibility starves it.",
    c.bodyOpposite = "Stand up straight, shoulders back. Lift your chin. Make eye contact. Speak clearly and at full volume. Take up space.",
    c.defaultOppositeSmall = "Stay where you are instead of leaving",
    c.defaultOppositeMedium = "Make eye contact and speak at your normal volume",
    c.defaultOppositeBigger = "Tell someone you trust what happened, with your head held high";

// --- GUILT ---
MATCH (c:EmotionRegulationContent {dbtParent: 'guilt'})
SET c.fitsFactsGuidance = "If you genuinely violated your own values: apologize sincerely, make amends where possible, commit to doing differently, and then — critically — let it go. Ongoing self-punishment isn't repair.",
    c.whyItWorks = "Unjustified guilt is a false alarm. When you keep acting as if you did something wrong, you reinforce the belief. Acting freely teaches your brain that no harm was done.",
    c.acknowledgment = "Guilt is urging you to make amends or punish yourself. When you didn't actually violate your values, the self-punishment is suffering without purpose.",
    c.bodyOpposite = "Stand normally — don't hunch or grovel. Keep a calm, steady voice. Don't wring your hands.",
    c.defaultOppositeSmall = "Notice the self-punishment urge and don't act on it",
    c.defaultOppositeMedium = "Do something neutral instead of punishing yourself",
    c.defaultOppositeBigger = "Act freely, as if you did nothing wrong — because you didn't";

// --- JEALOUSY ---
MATCH (c:EmotionRegulationContent {dbtParent: 'jealousy'})
SET c.fitsFactsGuidance = "If trust has actually been broken, jealousy may be warranted. Address it directly through honest conversation, not surveillance. Consider whether the relationship can be rebuilt.",
    c.whyItWorks = "Jealousy's control behaviors push people away — the opposite of what you want. Letting go of control paradoxically builds the trust and closeness jealousy craves.",
    c.acknowledgment = "Jealousy is tightening your grip — urging you to monitor, control, and hold on tighter. Loosening that grip is what actually builds the trust you're craving.",
    c.bodyOpposite = "Relax your grip — literally and figuratively. Open hands, soft face. Put down the phone.",
    c.defaultOppositeSmall = "Put your phone down for 10 minutes",
    c.defaultOppositeMedium = "Ask once, then accept the answer",
    c.defaultOppositeBigger = "Give them genuine freedom and space — and mean it";

// --- ENVY ---
MATCH (c:EmotionRegulationContent {dbtParent: 'envy'})
SET c.fitsFactsGuidance = "If envy points to something you genuinely want and can pursue, use it as motivation. Channel it into action toward your own goals rather than tearing others down.",
    c.whyItWorks = "Envy focuses you on scarcity — what you don't have. Celebrating others and counting blessings shifts your brain to abundance. Envy can't survive genuine gratitude.",
    c.acknowledgment = "Envy is narrowing your focus to what someone else has and what you lack. Shifting toward what you have — and what you can build — opens it back up.",
    c.bodyOpposite = "Soften your face. Let go of the tight jaw and narrowed eyes. Smile genuinely when acknowledging others.",
    c.defaultOppositeSmall = "Catch the comparison and name it as envy",
    c.defaultOppositeMedium = "List 3 things you're grateful for right now",
    c.defaultOppositeBigger = "Celebrate their success genuinely, then take one step toward your own goals";

// --- LOVE ---
MATCH (c:EmotionRegulationContent {dbtParent: 'love'})
SET c.fitsFactsGuidance = "If the love is for someone available, mutual, and healthy — lean into it. Approach with vulnerability. Express your feelings. Love that fits the facts is worth pursuing.",
    c.whyItWorks = "Love that doesn't fit the facts — someone unavailable, harmful, or gone — keeps you stuck through intermittent reinforcement. Each contact resets the clock. Distance lets the attachment fade.",
    c.acknowledgment = "Love is pulling you toward connection. When someone is unavailable, harmful, or gone, each contact resets the clock. Distance is how this attachment fades.",
    c.bodyOpposite = "When you feel the pull to reach out, put your hands in your lap. Turn away from your phone. Take a breath and ground yourself.",
    c.defaultOppositeSmall = "Write what you want to say, and don't send it",
    c.defaultOppositeMedium = "Put your phone away and do something that requires your full attention",
    c.defaultOppositeBigger = "Go no-contact and fill the space with something that builds YOUR life";


// ============================================================
// 2. ACTION URGE NODES
//    Graduated opposite actions (small / medium / bigger)
//    per specific action urge within each parent.
// ============================================================

// --- FEAR urges ---
MATCH (c:EmotionRegulationContent {dbtParent: 'fear'})
WITH c
UNWIND [
  {id: "fear-avoid", label: "Avoid it entirely", small: "Stay in the room 2 more minutes", medium: "Approach the thing for 10 minutes, then reassess", bigger: "Do the thing you've been avoiding, start to finish", order: 1},
  {id: "fear-escape", label: "Run away or escape", small: "Plant your feet and take 3 slow breaths", medium: "Stay until the fear drops one notch", bigger: "Stay until the fear passes on its own", order: 2},
  {id: "fear-cancel", label: "Cancel plans", small: "Don't cancel yet — wait 30 minutes and decide then", medium: "Go, and give yourself permission to leave early", bigger: "Go and stay the whole time", order: 3},
  {id: "fear-freeze", label: "Freeze and do nothing", small: "Move one part of your body — stand up, stretch", medium: "Take one small action related to what you're avoiding", bigger: "Start the task fully, even imperfectly", order: 4}
] AS urge
MERGE (u:ActionUrge {id: urge.id})
SET u.label = urge.label, u.small = urge.small, u.medium = urge.medium, u.bigger = urge.bigger, u.order = urge.order
MERGE (c)-[:HAS_ACTION_URGE]->(u);

// --- ANGER urges ---
MATCH (c:EmotionRegulationContent {dbtParent: 'anger'})
WITH c
UNWIND [
  {id: "anger-lash", label: "Lash out or say something cutting", small: "Pause and count to 10 before responding", medium: "Write down what you want to say, then set it aside for an hour", bigger: "Say something kind to the person instead", order: 1},
  {id: "anger-stonewall", label: "Shut someone out", small: "Don't block or unfriend yet. Pause", medium: "Send a brief, neutral message acknowledging them", bigger: "Have an honest, gentle conversation about what happened", order: 2},
  {id: "anger-destroy", label: "Break or throw something", small: "Squeeze ice in your hands for 30 seconds", medium: "Do 30 jumping jacks or a brisk walk around the block", bigger: "Channel the energy into cleaning, building, or creating something", order: 3},
  {id: "anger-criticize", label: "Criticize or blame someone", small: "Pause and name one thing they might be going through", medium: "Ask a genuine question about their perspective", bigger: "Offer an honest compliment or acknowledgment", order: 4}
] AS urge
MERGE (u:ActionUrge {id: urge.id})
SET u.label = urge.label, u.small = urge.small, u.medium = urge.medium, u.bigger = urge.bigger, u.order = urge.order
MERGE (c)-[:HAS_ACTION_URGE]->(u);

// --- SADNESS urges ---
MATCH (c:EmotionRegulationContent {dbtParent: 'sadness'})
WITH c
UNWIND [
  {id: "sad-bed", label: "Stay in bed and do nothing", small: "Sit up and open the blinds", medium: "Take a shower and get dressed", bigger: "Go for a 10-minute walk outside", order: 1},
  {id: "sad-isolate", label: "Cancel plans and isolate", small: "Text one person back", medium: "Keep one plan today", bigger: "Call someone and talk for 5 minutes", order: 2},
  {id: "sad-give-up", label: "Give up on something that matters", small: "Do the tiniest next step — open the file, write one sentence", medium: "Work on it for 10 minutes, then stop if you need to", bigger: "Complete one meaningful piece of it", order: 3},
  {id: "sad-scroll", label: "Scroll mindlessly or zone out", small: "Put the phone in another room for 15 minutes", medium: "Do one small task you've been putting off", bigger: "Spend 30 minutes doing something that requires your full attention", order: 4}
] AS urge
MERGE (u:ActionUrge {id: urge.id})
SET u.label = urge.label, u.small = urge.small, u.medium = urge.medium, u.bigger = urge.bigger, u.order = urge.order
MERGE (c)-[:HAS_ACTION_URGE]->(u);

// --- DISGUST urges ---
MATCH (c:EmotionRegulationContent {dbtParent: 'disgust'})
WITH c
UNWIND [
  {id: "disgust-push", label: "Push this person or thing away", small: "Stay present for 2 more minutes", medium: "Find one small thing to appreciate about the situation", bigger: "Engage fully without the disgust filter", order: 1},
  {id: "disgust-leave", label: "Leave the situation", small: "Stay, and shift your attention to something neutral", medium: "Stay and participate, even minimally", bigger: "Stay and engage as if the disgust isn't there", order: 2},
  {id: "disgust-judge", label: "Judge or condemn", small: "Notice the judgment and label it as a judgment, not a fact", medium: "Consider one reason this makes sense from their perspective", bigger: "Actively practice empathy — imagine their full experience", order: 3}
] AS urge
MERGE (u:ActionUrge {id: urge.id})
SET u.label = urge.label, u.small = urge.small, u.medium = urge.medium, u.bigger = urge.bigger, u.order = urge.order
MERGE (c)-[:HAS_ACTION_URGE]->(u);

// --- SHAME urges ---
MATCH (c:EmotionRegulationContent {dbtParent: 'shame'})
WITH c
UNWIND [
  {id: "shame-hide", label: "Hide or disappear", small: "Stay where you are instead of leaving", medium: "Make eye contact with one person", bigger: "Stand tall, shoulders back, and take up space", order: 1},
  {id: "shame-secret", label: "Keep it secret", small: "Write it down, even if it's only for yourself", medium: "Tell one trusted person a small piece of it", bigger: "Share openly with someone you trust, looking them in the eye", order: 2},
  {id: "shame-shrink", label: "Make yourself small", small: "Uncross your arms and take up your normal space", medium: "Speak at your normal volume — don't mumble or trail off", bigger: "Share your opinion or ask for what you need out loud", order: 3},
  {id: "shame-avoid-people", label: "Avoid people who might notice", small: "Don't cancel your next social plan", medium: "Go where people are, even briefly", bigger: "Initiate contact with someone — text, call, or show up", order: 4}
] AS urge
MERGE (u:ActionUrge {id: urge.id})
SET u.label = urge.label, u.small = urge.small, u.medium = urge.medium, u.bigger = urge.bigger, u.order = urge.order
MERGE (c)-[:HAS_ACTION_URGE]->(u);

// --- GUILT urges ---
MATCH (c:EmotionRegulationContent {dbtParent: 'guilt'})
WITH c
UNWIND [
  {id: "guilt-apologize", label: "Apologize again (or excessively)", small: "Notice the urge to apologize and don't act on it", medium: "If you've already apologized once, let that be enough", bigger: "Act freely, without hedging or seeking reassurance", order: 1},
  {id: "guilt-punish", label: "Punish yourself", small: "Notice the self-punishment urge and name it out loud", medium: "Do something neutral — a walk, a glass of water", bigger: "Do something kind for yourself — the direct opposite of punishment", order: 2},
  {id: "guilt-avoid", label: "Avoid the person you think you wronged", small: "Don't change your route or routine to avoid them", medium: "Make brief, normal contact — a wave, a hello", bigger: "Engage with them normally, without excessive guilt or apology", order: 3}
] AS urge
MERGE (u:ActionUrge {id: urge.id})
SET u.label = urge.label, u.small = urge.small, u.medium = urge.medium, u.bigger = urge.bigger, u.order = urge.order
MERGE (c)-[:HAS_ACTION_URGE]->(u);

// --- JEALOUSY urges ---
MATCH (c:EmotionRegulationContent {dbtParent: 'jealousy'})
WITH c
UNWIND [
  {id: "jealousy-check", label: "Check their phone, social media, or whereabouts", small: "Put your phone down for 10 minutes", medium: "Delete the checking app from your home screen for today", bigger: "Go a full day without checking", order: 1},
  {id: "jealousy-interrogate", label: "Interrogate or ask repeatedly", small: "Ask once, then accept the answer", medium: "Notice the urge to ask again and do something else instead", bigger: "Say 'have fun' and genuinely mean it", order: 2},
  {id: "jealousy-cling", label: "Cling or demand more attention", small: "Give them 30 minutes of uninterrupted space", medium: "Make plans with someone else", bigger: "Encourage them to spend time with others and enjoy yourself meanwhile", order: 3}
] AS urge
MERGE (u:ActionUrge {id: urge.id})
SET u.label = urge.label, u.small = urge.small, u.medium = urge.medium, u.bigger = urge.bigger, u.order = urge.order
MERGE (c)-[:HAS_ACTION_URGE]->(u);

// --- ENVY urges ---
MATCH (c:EmotionRegulationContent {dbtParent: 'envy'})
WITH c
UNWIND [
  {id: "envy-tear-down", label: "Tear them down (in your head or out loud)", small: "Catch the thought and label it as envy, not truth", medium: "Say one genuinely kind thing about them", bigger: "Celebrate their success as if it were your own", order: 1},
  {id: "envy-compare", label: "Compare and despair", small: "Notice the comparison and redirect your attention", medium: "List 3 things you have that you're genuinely grateful for", bigger: "Use the envy as information — what does it tell you about what YOU want? Take one step toward that", order: 2},
  {id: "envy-give-up", label: "Give up on your own goals", small: "Name one small thing you've accomplished recently", medium: "Take one tiny step toward something you want", bigger: "Make a plan for getting what envy is pointing you toward", order: 3}
] AS urge
MERGE (u:ActionUrge {id: urge.id})
SET u.label = urge.label, u.small = urge.small, u.medium = urge.medium, u.bigger = urge.bigger, u.order = urge.order
MERGE (c)-[:HAS_ACTION_URGE]->(u);

// --- LOVE urges ---
MATCH (c:EmotionRegulationContent {dbtParent: 'love'})
WITH c
UNWIND [
  {id: "love-reach-out", label: "Text, call, or reach out to them", small: "Write the message and don't send it. Wait 1 hour", medium: "Put your phone in another room for an hour", bigger: "Delete the draft, close the app, do something that demands your full attention", order: 1},
  {id: "love-stalk", label: "Check their social media", small: "Notice the urge and set a 10-minute timer before deciding", medium: "Mute or unfollow them", bigger: "Block or remove them from your feed entirely", order: 2},
  {id: "love-proximity", label: "Go places they might be", small: "Choose a different route or venue today", medium: "Make plans that have nothing to do with them", bigger: "Fill the time you'd spend thinking about them with something that builds your life", order: 3},
  {id: "love-idealize", label: "Idealize them and ignore red flags", small: "Write down one realistic negative", medium: "Write the full honest picture — good and bad", bigger: "Talk to a friend about the reality, not the fantasy", order: 4}
] AS urge
MERGE (u:ActionUrge {id: urge.id})
SET u.label = urge.label, u.small = urge.small, u.medium = urge.medium, u.bigger = urge.bigger, u.order = urge.order
MERGE (c)-[:HAS_ACTION_URGE]->(u);


// --- INTERPERSONAL urges (ER-03 item 8: the urges Recover's design record asks for) ---
// What a hurt pulls toward with one person. One node per urge, listed under every parent it belongs to; after each
// parent's own urges (`order`). Each is mapped for parts in scripts/parts/content.py.
UNWIND [
  {id: "text-again", label: "Text them again", small: "Write it in your notes, not to them", medium: "Put the phone in another room for an hour, then decide", bigger: "Leave it unsent today and do something that needs your hands", order: 10, parents: ["love"]},
  {id: "check-profile", label: "Check their profile", small: "Wait ten minutes before you look", medium: "Mute them for today", bigger: "Take the app off your home screen for the week", order: 11, parents: ["jealousy", "love"]},
  {id: "pull-away", label: "Pull away from them", small: "Send one ordinary message back", medium: "Keep one plan with them", bigger: "If they are safe to tell, tell them a little of what has been going on", order: 12, parents: ["shame", "sadness"]},
  {id: "fire-back", label: "Fire back", small: "Wait ten breaths before you answer", medium: "Step away until you can answer gently", bigger: "Say one fair or kind thing about their side first", order: 13, parents: ["anger"]},
  {id: "go-quiet", label: "Go quiet on them", small: "Send one line: I need a minute, I'll come back to this", medium: "Come back to it later today, as you said", bigger: "If they are safe to tell, say plainly what upset you", order: 14, parents: ["shame", "sadness"]}
] AS urge
MERGE (u:ActionUrge {id: urge.id})
SET u.label = urge.label, u.small = urge.small, u.medium = urge.medium, u.bigger = urge.bigger, u.order = urge.order, u.interpersonal = true
WITH u, urge
UNWIND urge.parents AS parent
MATCH (c:EmotionRegulationContent {dbtParent: parent})
MERGE (c)-[:HAS_ACTION_URGE]->(u);

// ============================================================
// 3. PER-EMOTION OA PROPERTIES + HAS_REGULATION_CONTENT
//    Sets oppositeActionApplicable, oaClinicalNote,
//    oaAlternativeSkill on every Emotion node, and creates
//    HAS_REGULATION_CONTENT for applicable emotions.
// ============================================================

// --- FEARFUL FAMILY (18) ---
UNWIND [
  {id: "fearful",       applicable: true,  parent: "fear",    note: "Core fear — avoidance/escape urge",                 alt: null},
  {id: "scared",        applicable: true,  parent: "fear",    note: "Acute fear — flee/freeze urge",                     alt: null},
  {id: "anxious",       applicable: true,  parent: "fear",    note: "Anticipatory avoidance urge",                       alt: null},
  {id: "insecure",      applicable: true,  parent: "shame",   note: "Cross-family: hiding/concealment urge, not flight", alt: null},
  {id: "weak",          applicable: true,  parent: "shame",   note: "Cross-family: shrinking/hiding urge",               alt: null},
  {id: "rejected",      applicable: true,  parent: "shame",   note: "Cross-family: urge to hide from further rejection", alt: null},
  {id: "helpless",      applicable: true,  parent: "sadness", note: "Cross-family: withdrawal/giving-up urge",           alt: null},
  {id: "frightened",    applicable: true,  parent: "fear",    note: "Acute fear — startle/freeze",                       alt: null},
  {id: "worried",       applicable: true,  parent: "fear",    note: "Anticipatory avoidance",                            alt: null},
  {id: "overwhelmed",   applicable: true,  parent: "fear",    note: "Avoidance/escape urge from overload",               alt: null},
  {id: "inadequate",    applicable: true,  parent: "shame",   note: "Cross-family: shrinking/hiding from exposure",      alt: null},
  {id: "inferior",      applicable: true,  parent: "shame",   note: "Cross-family: making-self-small urge",              alt: null},
  {id: "worthless",     applicable: true,  parent: "shame",   note: "Cross-family: urge to disappear",                   alt: null},
  {id: "insignificant", applicable: true,  parent: "shame",   note: "Cross-family: urge to shrink away",                 alt: null},
  {id: "excluded",      applicable: true,  parent: "shame",   note: "Cross-family: hiding from social pain",             alt: null},
  {id: "persecuted",    applicable: true,  parent: "fear",    note: "Escape/avoidance from perceived threat",            alt: null},
  {id: "nervous",       applicable: true,  parent: "fear",    note: "Mild avoidance urge",                               alt: null},
  {id: "exposed",       applicable: true,  parent: "shame",   note: "Cross-family: urge to cover/hide self",             alt: null}
] AS m
MATCH (e:Emotion {id: m.id})
SET e.oppositeActionApplicable = m.applicable, e.oaClinicalNote = m.note, e.oaAlternativeSkill = m.alt
WITH e, m
WHERE m.parent IS NOT NULL
MATCH (c:EmotionRegulationContent {dbtParent: m.parent})
MERGE (e)-[:HAS_REGULATION_CONTENT]->(c);

// --- ANGRY FAMILY (26) ---
UNWIND [
  {id: "angry",        applicable: true,  parent: "anger",    note: "Core anger — attack/criticize urge",                     alt: null},
  {id: "threatened",   applicable: true,  parent: "fear",     note: "Cross-family: avoidance/escape urge, not attack",        alt: null},
  {id: "let_down",     applicable: true,  parent: "sadness",  note: "Cross-family: withdrawal urge from disappointment",      alt: null},
  {id: "humiliated",   applicable: true,  parent: "shame",    note: "Cross-family: hiding/concealment, not retaliation",      alt: null},
  {id: "bitter",       applicable: true,  parent: "anger",    note: "Resentful attack/criticize urge",                        alt: null},
  {id: "mad",          applicable: true,  parent: "anger",    note: "Attack/lash-out urge",                                   alt: null},
  {id: "aggressive",   applicable: true,  parent: "anger",    note: "Direct attack urge",                                     alt: null},
  {id: "frustrated",   applicable: true,  parent: "anger",    note: "Push-through/attack urge",                               alt: null},
  {id: "distant",      applicable: true,  parent: "sadness",  note: "Cross-family: withdrawal/disengagement",                 alt: null},
  {id: "critical",     applicable: true,  parent: "anger",    note: "Verbal attack urge",                                     alt: null},
  {id: "betrayed",     applicable: true,  parent: "anger",    note: "Retaliatory anger urge",                                 alt: null},
  {id: "resentful",    applicable: true,  parent: "anger",    note: "Chronic attack/criticize urge",                          alt: null},
  {id: "disrespected", applicable: true,  parent: "anger",    note: "Retaliatory anger urge",                                 alt: null},
  {id: "ridiculed",    applicable: true,  parent: "shame",    note: "Cross-family: hiding from mockery",                      alt: null},
  {id: "indignant",    applicable: true,  parent: "anger",    note: "Righteous attack urge",                                  alt: null},
  {id: "violated",     applicable: true,  parent: "anger",    note: "Intense retaliatory urge",                               alt: null},
  {id: "furious",      applicable: true,  parent: "anger",    note: "Intense attack urge",                                    alt: null},
  {id: "jealous",      applicable: true,  parent: "jealousy", note: "Own protocol: control/monitoring urge",                  alt: null},
  {id: "provoked",     applicable: true,  parent: "anger",    note: "Reactive attack urge",                                   alt: null},
  {id: "hostile",      applicable: true,  parent: "anger",    note: "Sustained attack stance",                                alt: null},
  {id: "infuriated",   applicable: true,  parent: "anger",    note: "Intense attack urge",                                    alt: null},
  {id: "annoyed",      applicable: true,  parent: "anger",    note: "Mild attack/criticize urge",                             alt: null},
  {id: "withdrawn",    applicable: true,  parent: "sadness",  note: "Cross-family: withdrawal IS the sadness urge",           alt: null},
  {id: "numb",         applicable: false, parent: null,        note: "Dissociative shutdown — reconnect with body first",      alt: "body-scan"},
  {id: "skeptical",    applicable: false, parent: null,        note: "Cognitive stance, not emotion — examine the facts",      alt: "check-the-facts"},
  {id: "dismissive",   applicable: true,  parent: "disgust",  note: "Cross-family: push-away/rejection urge",                 alt: null}
] AS m
MATCH (e:Emotion {id: m.id})
SET e.oppositeActionApplicable = m.applicable, e.oaClinicalNote = m.note, e.oaAlternativeSkill = m.alt
WITH e, m
WHERE m.applicable = true AND m.parent IS NOT NULL
MATCH (c:EmotionRegulationContent {dbtParent: m.parent})
MERGE (e)-[:HAS_REGULATION_CONTENT]->(c);

// --- BAD FAMILY (12) ---
UNWIND [
  {id: "stressed",       applicable: true,  parent: "fear", note: "Avoidance urge from threat overload",                     alt: null},
  {id: "pressured",      applicable: true,  parent: "fear", note: "Avoidance urge from external demands",                    alt: null},
  {id: "out_of_control", applicable: true,  parent: "fear", note: "Panic/escape urge",                                       alt: null},
  {id: "busy",           applicable: false, parent: null,   note: "Activity state, not emotion — slow down",                  alt: "mindfulness-emotions"},
  {id: "rushed",         applicable: false, parent: null,   note: "Activity state — pause and ground",                        alt: "mindfulness-emotions"},
  {id: "bad",            applicable: false, parent: null,   note: "Too vague — identify the specific emotion",                alt: "name-it"},
  {id: "tired",          applicable: false, parent: null,   note: "Physical depletion — address vulnerability factors",       alt: "please-skill"},
  {id: "bored",          applicable: false, parent: null,   note: "Low engagement — address vulnerability factors",           alt: "please-skill"},
  {id: "sleepy",         applicable: false, parent: null,   note: "Physical depletion — prioritize sleep",                    alt: "please-skill"},
  {id: "unfocused",      applicable: false, parent: null,   note: "Cognitive state — address vulnerability factors",          alt: "please-skill"},
  {id: "apathetic",      applicable: false, parent: null,   note: "Depletion/disengagement — address basics first",           alt: "please-skill"},
  {id: "indifferent",    applicable: false, parent: null,   note: "Low activation — address vulnerability factors",           alt: "please-skill"}
] AS m
MATCH (e:Emotion {id: m.id})
SET e.oppositeActionApplicable = m.applicable, e.oaClinicalNote = m.note, e.oaAlternativeSkill = m.alt
WITH e, m
WHERE m.applicable = true AND m.parent IS NOT NULL
MATCH (c:EmotionRegulationContent {dbtParent: m.parent})
MERGE (e)-[:HAS_REGULATION_CONTENT]->(c);

// --- DISGUSTED FAMILY (13) ---
UNWIND [
  {id: "disgusted",    applicable: true, parent: "disgust",  note: "Core disgust — push-away/rejection urge",                 alt: null},
  {id: "disapproving", applicable: true, parent: "disgust",  note: "Rejection/push-away urge",                                alt: null},
  {id: "disappointed", applicable: true, parent: "sadness",  note: "Cross-family: withdrawal from unmet expectations",        alt: null},
  {id: "awful",        applicable: true, parent: "sadness",  note: "Cross-family: despair/withdrawal urge",                   alt: null},
  {id: "repelled",     applicable: true, parent: "disgust",  note: "Strong push-away urge",                                   alt: null},
  {id: "judgmental",   applicable: true, parent: "anger",    note: "Cross-family: attack/criticize urge",                     alt: null},
  {id: "embarrassed",  applicable: true, parent: "shame",    note: "Cross-family: hiding/concealment urge",                   alt: null},
  {id: "appalled",     applicable: true, parent: "disgust",  note: "Intense push-away/revulsion",                             alt: null},
  {id: "revolted",     applicable: true, parent: "disgust",  note: "Intense push-away urge",                                  alt: null},
  {id: "nauseated",    applicable: true, parent: "disgust",  note: "Visceral rejection urge",                                 alt: null},
  {id: "detestable",   applicable: true, parent: "disgust",  note: "Strong push-away urge",                                   alt: null},
  {id: "horrified",    applicable: true, parent: "fear",     note: "Cross-family: freeze/avoidance urge",                     alt: null},
  {id: "hesitant",     applicable: true, parent: "fear",     note: "Cross-family: approach-avoidance conflict",               alt: null}
] AS m
MATCH (e:Emotion {id: m.id})
SET e.oppositeActionApplicable = m.applicable, e.oaClinicalNote = m.note, e.oaAlternativeSkill = m.alt
WITH e, m
WHERE m.parent IS NOT NULL
MATCH (c:EmotionRegulationContent {dbtParent: m.parent})
MERGE (e)-[:HAS_REGULATION_CONTENT]->(c);

// --- SAD FAMILY (16) ---
UNWIND [
  {id: "sad",        applicable: true, parent: "sadness", note: "Core sadness — withdrawal/isolation urge",          alt: null},
  {id: "lonely",     applicable: true, parent: "sadness", note: "Withdrawal despite craving connection",             alt: null},
  {id: "vulnerable", applicable: true, parent: "fear",    note: "Cross-family: protective avoidance urge",           alt: null},
  {id: "despair",    applicable: true, parent: "sadness", note: "Deep withdrawal/giving-up urge",                    alt: null},
  {id: "guilty",     applicable: true, parent: "guilt",   note: "Own protocol: avoidance/self-punishment urge",      alt: null},
  {id: "depressed",  applicable: true, parent: "sadness", note: "Pervasive withdrawal/inactivity",                   alt: null},
  {id: "hurt",       applicable: true, parent: "sadness", note: "Withdrawal from source of pain",                    alt: null},
  {id: "isolated",   applicable: true, parent: "sadness", note: "Withdrawal is both urge and state",                 alt: null},
  {id: "abandoned",  applicable: true, parent: "sadness", note: "Withdrawal/despair from loss",                      alt: null},
  {id: "victimized", applicable: true, parent: "anger",   note: "Cross-family: retaliatory/blame urge",              alt: null},
  {id: "fragile",    applicable: true, parent: "fear",    note: "Cross-family: protective avoidance",                alt: null},
  {id: "grief",      applicable: true, parent: "sadness", note: "Withdrawal/isolation from loss",                    alt: null},
  {id: "powerless",  applicable: true, parent: "sadness", note: "Giving-up/withdrawal urge",                         alt: null},
  {id: "ashamed",    applicable: true, parent: "shame",   note: "Own protocol: hiding/concealment urge",             alt: null},
  {id: "remorseful", applicable: true, parent: "guilt",   note: "Own protocol: avoidance/self-punishment",           alt: null},
  {id: "empty",      applicable: true, parent: "sadness", note: "Profound disengagement/withdrawal",                 alt: null}
] AS m
MATCH (e:Emotion {id: m.id})
SET e.oppositeActionApplicable = m.applicable, e.oaClinicalNote = m.note, e.oaAlternativeSkill = m.alt
WITH e, m
WHERE m.parent IS NOT NULL
MATCH (c:EmotionRegulationContent {dbtParent: m.parent})
MERGE (e)-[:HAS_REGULATION_CONTENT]->(c);

// --- HAPPY FAMILY: OA-applicable (3) ---
UNWIND [
  {id: "loving",   applicable: true, parent: "love", note: "Love OA when attachment doesn't fit the facts", alt: null},
  {id: "intimate", applicable: true, parent: "love", note: "Love OA when closeness doesn't fit the facts",  alt: null},
  {id: "tender",   applicable: true, parent: "love", note: "Love OA when tenderness doesn't fit the facts", alt: null}
] AS m
MATCH (e:Emotion {id: m.id})
SET e.oppositeActionApplicable = m.applicable, e.oaClinicalNote = m.note, e.oaAlternativeSkill = m.alt
WITH e, m
WHERE m.parent IS NOT NULL
MATCH (c:EmotionRegulationContent {dbtParent: m.parent})
MERGE (e)-[:HAS_REGULATION_CONTENT]->(c);

// --- HAPPY FAMILY: not OA-applicable (43) ---
UNWIND [
  "happy", "playful", "interested", "proud", "accepted", "powerful", "optimistic",
  "aroused", "cheeky", "joyful", "curious", "inquisitive", "successful", "confident",
  "respected", "valued", "courageous", "creative", "hopeful", "inspired",
  "calm", "relaxed", "peaceful", "content", "trusting", "sensitive", "thankful",
  "good", "chill", "comfortable", "thoughtful", "mellow", "sympathetic", "serene",
  "secure", "satisfied", "restful", "appreciative", "at_ease", "balanced",
  "grounded", "cozy", "humble"
] AS id
MATCH (e:Emotion {id: id})
SET e.oppositeActionApplicable = false,
    e.oaClinicalNote = "Positive emotion — savor with mindfulness",
    e.oaAlternativeSkill = "mindfulness-emotions";

// --- SURPRISED FAMILY: OA-applicable (3) ---
UNWIND [
  {id: "shocked",       applicable: true, parent: "fear",    note: "Cross-family: freeze/avoidance urge",              alt: null},
  {id: "dismayed",      applicable: true, parent: "sadness", note: "Cross-family: withdrawal from bad news",           alt: null},
  {id: "disillusioned", applicable: true, parent: "sadness", note: "Cross-family: withdrawal from lost beliefs",       alt: null}
] AS m
MATCH (e:Emotion {id: m.id})
SET e.oppositeActionApplicable = m.applicable, e.oaClinicalNote = m.note, e.oaAlternativeSkill = m.alt
WITH e, m
WHERE m.parent IS NOT NULL
MATCH (c:EmotionRegulationContent {dbtParent: m.parent})
MERGE (e)-[:HAS_REGULATION_CONTENT]->(c);

// --- SURPRISED FAMILY: not OA-applicable (10) ---
UNWIND ["surprised", "startled", "amazed", "excited", "astonished", "awe", "eager", "energetic"] AS id
MATCH (e:Emotion {id: id})
SET e.oppositeActionApplicable = false,
    e.oaClinicalNote = "Transitional/positive state — observe mindfully",
    e.oaAlternativeSkill = "mindfulness-emotions";

MATCH (e:Emotion {id: "confused"})
SET e.oppositeActionApplicable = false,
    e.oaClinicalNote = "Cognitive uncertainty — examine the situation",
    e.oaAlternativeSkill = "check-the-facts";

MATCH (e:Emotion {id: "perplexed"})
SET e.oppositeActionApplicable = false,
    e.oaClinicalNote = "Cognitive uncertainty — examine the situation",
    e.oaAlternativeSkill = "check-the-facts";

// --- BEHAVIOUR URGES (DT-02 Hold to wait; plan C5: DT adds behaviour urges, self_harm as a reviewed row) ---
// What the person is about to do, not what a feeling pulls toward, so no HAS_ACTION_URGE: Do the Opposite's urge
// lists never show them. Hold to wait's *What's pulling at you?* chips record these ids as the session's urgeIds;
// DT-05 Ride it out and DT-10 Pros & cons use the same vocabulary. `use` covers use, drink, binge and buy until
// DT-09's substance scope is decided (D14). self_harm is life-threatening: every flow that names it opens
// safety.open first (plan C6.5). Mapped (or held) for parts in scripts/parts/content.py.
UNWIND [
  {id: "send", label: "Send or say something", lifeThreatening: false},
  {id: "check", label: "Check their page, or my phone", lifeThreatening: false},
  {id: "hit", label: "Hit, throw or slam", lifeThreatening: false},
  {id: "leave", label: "Leave, run or disappear", lifeThreatening: false},
  {id: "use", label: "Use, drink, binge or buy", lifeThreatening: false},
  {id: "self_harm", label: "Hurt myself", lifeThreatening: true}
] AS urge
MERGE (u:ActionUrge {id: urge.id})
SET u.label = urge.label, u.kind = "behaviour", u.lifeThreatening = urge.lifeThreatening, u.module = "dt";
