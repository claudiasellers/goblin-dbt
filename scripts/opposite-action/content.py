"""Do the Opposite's clinical content (DBT ER Handouts 9–11, 13): the one editable source of
schema/opposite-action-data.cypher. Regenerate with `python3 scripts/opposite-action/build.py` (`--check` for
freshness, `--prove <git ref>` to show a regeneration changes no statement).

  PROTOCOL        per DBT parent, on EmotionRegulationContent: fit guidance, why it works, the acknowledgment (the
                  validation line), the body opposite and the default small / medium / bigger opposite steps
  PARENT_URGES    per DBT parent, its ActionUrges (HAS_ACTION_URGE) with graduated opposites, in `order`
  INTERPERSONAL   urges with one person (ER-03 item 8), each under every parent it belongs to (`parents`)
  EMOTION_BLOCKS  every check-in word's Do the Opposite fields (oppositeActionApplicable, oaClinicalNote,
                  oaAlternativeSkill) and, with a parent, its HAS_REGULATION_CONTENT: ("rows", title, rows) per family,
                  ("ids", title, ids, note, alt) for words that share one note, ("one", id, note, alt)
  BEHAVIOUR       DT's behaviour urges (Hold to wait's pulls): no HAS_ACTION_URGE, so Do the Opposite never lists them

Readers: scripts/skills/oa_graph.py and graph_tables.py replay the generated file (scripts/recommendations/
schema_graph.py); build.py's ACTION_URGES reads its urge ids. Mapped (or held) for parts in scripts/parts/content.py.
"""

# --- 1. Protocol metadata on EmotionRegulationContent, per DBT parent ---
PROTOCOL = [
    ("fear", {
        "fitsFactsGuidance": "If there's a real threat, listen to the fear. Remove yourself from danger, problem-solve, or ask for help. Fear that fits the facts is protecting you.",
        "whyItWorks": "Fear tells you something is dangerous when it may not be. By approaching instead of avoiding, your brain learns the situation is actually safe. Given time, the fear can come down on its own.",
        "acknowledgment": "Fear is trying to keep you safe by pulling you away from the threat. When the threat isn't real, avoidance keeps the fear alive.",
        "bodyOpposite": "Relax your jaw and hands. Open your posture. Breathe slowly and deeply. Speak in a steady voice.",
        "defaultOppositeSmall": "Stay with the discomfort a little longer — even 2 minutes",
        "defaultOppositeMedium": "Take one step toward what you're avoiding",
        "defaultOppositeBigger": "Do the thing fully, without escape plans",
    }),
    ("anger", {
        "fitsFactsGuidance": "If someone actually violated your rights or crossed a boundary, anger is valid. Use it to assert yourself effectively (try DEAR MAN), set boundaries, or problem-solve.",
        "whyItWorks": "Anger narrows your focus to attack. Kindness and perspective-taking widen it. When you act gently, your brain starts to match — the anger can't sustain itself against genuine compassion.",
        "acknowledgment": "Anger is mobilizing you to fight back or push against something that feels wrong. When the situation doesn't call for a fight, that energy needs somewhere else to go.",
        "bodyOpposite": "Relax your face, unclench your fists, drop your shoulders. Speak softly and slowly. Half-smile. Keep your hands open.",
        "defaultOppositeSmall": "Pause for 10 seconds before doing anything",
        "defaultOppositeMedium": "Try to see the situation from the other person's perspective",
        "defaultOppositeBigger": "Do something genuinely kind for the person you're angry at",
    }),
    ("sadness", {
        "fitsFactsGuidance": "If you've experienced a real loss, sadness is appropriate. Allow yourself to grieve. Reach out for support rather than isolating, but don't force yourself to get over it.",
        "whyItWorks": "Sadness tells you to withdraw, which makes sense short-term but keeps you stuck. Activity and connection generate experiences that sadness can't account for. Movement changes brain chemistry.",
        "acknowledgment": "Sadness is pulling you inward, away from the world. When the withdrawal becomes the thing keeping you stuck, small movements outward can shift everything.",
        "bodyOpposite": "Sit or stand upright. Look up, not down. Move with purpose even if you're faking it. Speak at a normal volume.",
        "defaultOppositeSmall": "Do one tiny thing — sit up, open the blinds, send one text",
        "defaultOppositeMedium": "Get up and do something active for 10 minutes",
        "defaultOppositeBigger": "Go be around people, even if you don't feel like it",
    }),
    ("disgust", {
        "fitsFactsGuidance": "If something genuinely threatens your health or deeply violates your core values, disgust is protective. Remove yourself and problem-solve instead.",
        "whyItWorks": "Disgust evolved to protect from contamination, but it often fires in social situations where there's no real threat. Approaching teaches your brain the contamination isn't real.",
        "acknowledgment": "Disgust is pushing you to reject and distance yourself. When the reaction is stronger than the situation warrants, leaning in — even a little — can change the feeling.",
        "bodyOpposite": "Relax your upper lip and nose. Open your hands. Lean in slightly rather than recoiling. Keep a neutral expression.",
        "defaultOppositeSmall": "Stay present for 2 more minutes",
        "defaultOppositeMedium": "Find one thing to appreciate about the situation",
        "defaultOppositeBigger": "Engage fully, as if the disgust weren't there",
    }),
    ("shame", {
        "fitsFactsGuidance": "If you actually violated your own deeply-held values, that may be guilt, not shame. Guilt says 'I did something bad'; shame says 'I am bad.' If it's guilt, repair is the right move.",
        "whyItWorks": "Shame thrives in secrecy and hiding. When you disclose and the world doesn't end — when people still accept you — shame's lie is exposed. You learn that you are not defective.",
        "acknowledgment": "Shame is telling you to hide — that if people saw the real you, they'd reject you. When shame is lying about your worth, hiding feeds it. Visibility starves it.",
        "bodyOpposite": "Stand up straight, shoulders back. Lift your chin. Make eye contact. Speak clearly and at full volume. Take up space.",
        "defaultOppositeSmall": "Stay where you are instead of leaving",
        "defaultOppositeMedium": "Make eye contact and speak at your normal volume",
        "defaultOppositeBigger": "Tell someone you trust what happened, with your head held high",
    }),
    ("guilt", {
        "fitsFactsGuidance": "If you genuinely violated your own values: apologize sincerely, make amends where possible, commit to doing differently, and then — critically — let it go. Ongoing self-punishment isn't repair.",
        "whyItWorks": "Unjustified guilt is a false alarm. When you keep acting as if you did something wrong, you reinforce the belief. Acting freely teaches your brain that no harm was done.",
        "acknowledgment": "Guilt is urging you to make amends or punish yourself. When you didn't actually violate your values, the self-punishment is suffering without purpose.",
        "bodyOpposite": "Stand normally — don't hunch or grovel. Keep a calm, steady voice. Don't wring your hands.",
        "defaultOppositeSmall": "Notice the self-punishment urge and don't act on it",
        "defaultOppositeMedium": "Do something neutral instead of punishing yourself",
        "defaultOppositeBigger": "Go about your day openly, without hiding or making yourself small",
    }),
    ("jealousy", {
        "fitsFactsGuidance": "If trust has actually been broken, jealousy may be warranted. Address it directly through honest conversation, not surveillance. Consider whether the relationship can be rebuilt.",
        "whyItWorks": "Jealousy's control behaviors push people away — the opposite of what you want. Letting go of control paradoxically builds the trust and closeness jealousy craves.",
        "acknowledgment": "Jealousy is tightening your grip — urging you to monitor, control, and hold on tighter. Loosening that grip is what actually builds the trust you're craving.",
        "bodyOpposite": "Relax your grip — literally and figuratively. Open hands, soft face. Put down the phone.",
        "defaultOppositeSmall": "Put your phone down for 10 minutes",
        "defaultOppositeMedium": "Ask once, then accept the answer",
        "defaultOppositeBigger": "Give them genuine freedom and space — and mean it",
    }),
    ("envy", {
        "fitsFactsGuidance": "If envy points to something you genuinely want and can pursue, use it as motivation. Channel it into action toward your own goals rather than tearing others down.",
        "whyItWorks": "Envy focuses you on scarcity — what you don't have. Celebrating others and counting blessings shifts your brain to abundance. Envy can't survive genuine gratitude.",
        "acknowledgment": "Envy is narrowing your focus to what someone else has and what you lack. Shifting toward what you have — and what you can build — opens it back up.",
        "bodyOpposite": "Soften your face. Let go of the tight jaw and narrowed eyes. Smile genuinely when acknowledging others.",
        "defaultOppositeSmall": "Catch the comparison and name it as envy",
        "defaultOppositeMedium": "List 3 things you're grateful for right now",
        "defaultOppositeBigger": "Celebrate their success genuinely, then take one step toward your own goals",
    }),
    ("love", {
        "fitsFactsGuidance": "If the love is for someone available, mutual, and healthy — lean into it. Approach with vulnerability. Express your feelings. Love that fits the facts is worth pursuing.",
        "whyItWorks": "Love that doesn't fit the facts — someone unavailable, harmful, or gone — keeps you stuck through intermittent reinforcement. Each contact resets the clock. Distance lets the attachment fade.",
        "acknowledgment": "Love is pulling you toward connection. When someone is unavailable, harmful, or gone, each contact resets the clock. Distance is how this attachment fades.",
        "bodyOpposite": "When you feel the pull to reach out, put your hands in your lap. Turn away from your phone. Take a breath and ground yourself.",
        "defaultOppositeSmall": "Write what you want to say, and don't send it",
        "defaultOppositeMedium": "Put your phone away and do something that requires your full attention",
        "defaultOppositeBigger": "Go no-contact and fill the space with something that builds YOUR life",
    }),
]

# --- 2. ActionUrge nodes per DBT parent (graduated opposites) ---
PARENT_URGES = [
    ("fear", [
        {"id": "fear-avoid", "label": "Avoid it entirely", "small": "Stay in the room 2 more minutes", "medium": "Approach the thing for 10 minutes, then reassess", "bigger": "Do the thing you've been avoiding, start to finish", "order": 1},
        {"id": "fear-escape", "label": "Run away or escape", "small": "Plant your feet and take 3 slow breaths", "medium": "Stay until the fear drops one notch", "bigger": "Stay a while, and let the fear rise and settle", "order": 2},
        {"id": "fear-cancel", "label": "Cancel plans", "small": "Don't cancel yet — wait 30 minutes and decide then", "medium": "Go, and give yourself permission to leave early", "bigger": "Go and stay the whole time", "order": 3},
        {"id": "fear-freeze", "label": "Freeze and do nothing", "small": "Move one part of your body — stand up, stretch", "medium": "Take one small action related to what you're avoiding", "bigger": "Start the task fully, even imperfectly", "order": 4},
    ]),
    ("anger", [
        {"id": "anger-lash", "label": "Lash out or say something cutting", "small": "Pause and count to 10 before responding", "medium": "Write down what you want to say, then set it aside for an hour", "bigger": "Say something kind to the person instead", "order": 1},
        {"id": "anger-stonewall", "label": "Shut someone out", "small": "Don't block or unfriend yet. Pause", "medium": "Send a brief, neutral message acknowledging them", "bigger": "Have an honest, gentle conversation about what happened", "order": 2},
        {"id": "anger-destroy", "label": "Break or throw something", "small": "Squeeze a cushion or a stress ball hard for 30 seconds", "medium": "Do 30 jumping jacks or a brisk walk around the block", "bigger": "Channel the energy into cleaning, building, or creating something", "order": 3},
        {"id": "anger-criticize", "label": "Criticize or blame someone", "small": "Pause and name one thing they might be going through", "medium": "Ask a genuine question about their perspective", "bigger": "Offer an honest compliment or acknowledgment", "order": 4},
    ]),
    ("sadness", [
        {"id": "sad-bed", "label": "Stay in bed and do nothing", "small": "Sit up and open the blinds", "medium": "Take a shower and get dressed", "bigger": "Go for a 10-minute walk outside", "order": 1},
        {"id": "sad-isolate", "label": "Cancel plans and isolate", "small": "Text one person back", "medium": "Keep one plan today", "bigger": "Call someone and talk for 5 minutes", "order": 2},
        {"id": "sad-give-up", "label": "Give up on something that matters", "small": "Do the tiniest next step — open the file, write one sentence", "medium": "Work on it for 10 minutes, then stop if you need to", "bigger": "Complete one meaningful piece of it", "order": 3},
        {"id": "sad-scroll", "label": "Scroll mindlessly or zone out", "small": "Put the phone in another room for 15 minutes", "medium": "Do one small task you've been putting off", "bigger": "Spend 30 minutes doing something that requires your full attention", "order": 4},
    ]),
    ("disgust", [
        {"id": "disgust-push", "label": "Push this person or thing away", "small": "Stay present for 2 more minutes", "medium": "Find one small thing to appreciate about the situation", "bigger": "Engage fully without the disgust filter", "order": 1},
        {"id": "disgust-leave", "label": "Leave the situation", "small": "Stay, and shift your attention to something neutral", "medium": "Stay and participate, even minimally", "bigger": "Stay and engage as if the disgust isn't there", "order": 2},
        {"id": "disgust-judge", "label": "Judge or condemn", "small": "Notice the judgment and label it as a judgment, not a fact", "medium": "Consider one reason this makes sense from their perspective", "bigger": "Actively practice empathy — imagine their full experience", "order": 3},
    ]),
    ("shame", [
        {"id": "shame-hide", "label": "Hide or disappear", "small": "Stay where you are instead of leaving", "medium": "Make eye contact with one person", "bigger": "Stand tall, shoulders back, and take up space", "order": 1},
        {"id": "shame-secret", "label": "Keep it secret", "small": "Write it down, even if it's only for yourself", "medium": "Tell one trusted person a small piece of it", "bigger": "Share openly with someone you trust, looking them in the eye", "order": 2},
        {"id": "shame-shrink", "label": "Make yourself small", "small": "Uncross your arms and take up your normal space", "medium": "Speak at your normal volume — don't mumble or trail off", "bigger": "Share your opinion or ask for what you need out loud", "order": 3},
        {"id": "shame-avoid-people", "label": "Avoid people who might notice", "small": "Don't cancel your next social plan", "medium": "Go where people are, even briefly", "bigger": "Initiate contact with someone — text, call, or show up", "order": 4},
    ]),
    ("guilt", [
        {"id": "guilt-apologize", "label": "Apologize again (or excessively)", "small": "Notice the urge to apologize and don't act on it", "medium": "If you've already apologized once, let that be enough", "bigger": "Act freely, without hedging or seeking reassurance", "order": 1},
        {"id": "guilt-punish", "label": "Punish yourself", "small": "Notice the self-punishment urge and name it out loud", "medium": "Do something neutral — a walk, a glass of water", "bigger": "Do something kind for yourself — the direct opposite of punishment", "order": 2},
        {"id": "guilt-avoid", "label": "Avoid the person you think you wronged", "small": "Don't change your route or routine to avoid them", "medium": "Make brief, normal contact — a wave, a hello", "bigger": "Engage with them normally, without excessive guilt or apology", "order": 3},
    ]),
    ("jealousy", [
        {"id": "jealousy-check", "label": "Check their phone, social media, or whereabouts", "small": "Put your phone down for 10 minutes", "medium": "Delete the checking app from your home screen for today", "bigger": "Go a full day without checking", "order": 1},
        {"id": "jealousy-interrogate", "label": "Interrogate or ask repeatedly", "small": "Ask once, then accept the answer", "medium": "Notice the urge to ask again and do something else instead", "bigger": "Say 'have fun' and genuinely mean it", "order": 2},
        {"id": "jealousy-cling", "label": "Cling or demand more attention", "small": "Give them 30 minutes of uninterrupted space", "medium": "Make plans with someone else", "bigger": "Encourage them to spend time with others and enjoy yourself meanwhile", "order": 3},
    ]),
    ("envy", [
        {"id": "envy-tear-down", "label": "Tear them down (in your head or out loud)", "small": "Catch the thought and label it as envy, not truth", "medium": "Say one genuinely kind thing about them", "bigger": "Celebrate their success as if it were your own", "order": 1},
        {"id": "envy-compare", "label": "Compare and despair", "small": "Notice the comparison and redirect your attention", "medium": "List 3 things you have that you're genuinely grateful for", "bigger": "Use the envy as information — what does it tell you about what YOU want? Take one step toward that", "order": 2},
        {"id": "envy-give-up", "label": "Give up on your own goals", "small": "Name one small thing you've accomplished recently", "medium": "Take one tiny step toward something you want", "bigger": "Make a plan for getting what envy is pointing you toward", "order": 3},
    ]),
    ("love", [
        {"id": "love-reach-out", "label": "Text, call, or reach out to them", "small": "Write the message and don't send it. Wait 1 hour", "medium": "Put your phone in another room for an hour", "bigger": "Delete the draft, close the app, do something that demands your full attention", "order": 1},
        {"id": "love-stalk", "label": "Check their social media", "small": "Notice the urge and set a 10-minute timer before deciding", "medium": "Mute or unfollow them", "bigger": "Block or remove them from your feed entirely", "order": 2},
        {"id": "love-proximity", "label": "Go places they might be", "small": "Choose a different route or venue today", "medium": "Make plans that have nothing to do with them", "bigger": "Fill the time you'd spend thinking about them with something that builds your life", "order": 3},
        {"id": "love-idealize", "label": "Idealize them and ignore red flags", "small": "Write down one realistic negative", "medium": "Write the full honest picture — good and bad", "bigger": "Talk to a friend about the reality, not the fantasy", "order": 4},
    ]),
]

# What a hurt pulls toward with one person. One node per urge, listed under every parent it belongs to; after each
# parent's own urges (`order`).
INTERPERSONAL = [
    {"id": "text-again", "label": "Text them again", "small": "Write it in your notes, not to them", "medium": "Put the phone in another room for an hour, then decide", "bigger": "Leave it unsent today and do something that needs your hands", "order": 10, "parents": ["love"]},
    {"id": "check-profile", "label": "Check their profile", "small": "Wait ten minutes before you look", "medium": "Mute them for today", "bigger": "Take the app off your home screen for the week", "order": 11, "parents": ["jealousy", "love"]},
    {"id": "pull-away", "label": "Pull away from them", "small": "Send one ordinary message back", "medium": "Keep one plan with them", "bigger": "If they are safe to tell, tell them a little of what has been going on", "order": 12, "parents": ["shame", "sadness"]},
    {"id": "fire-back", "label": "Fire back", "small": "Wait ten breaths before you answer", "medium": "Step away until you can answer gently", "bigger": "Say one fair or kind thing about their side first", "order": 13, "parents": ["anger"]},
    {"id": "go-quiet", "label": "Go quiet on them", "small": "Send one line: I need a minute, I'll come back to this", "medium": "Come back to it later today, as you said", "bigger": "If they are safe to tell, say plainly what upset you", "order": 14, "parents": ["shame", "sadness"]},
]

# --- 3. Per-emotion Do the Opposite fields + HAS_REGULATION_CONTENT ---
EMOTION_BLOCKS = [
    ("rows", "FEARFUL FAMILY (18)", [
        {"id": "fearful", "applicable": True, "parent": "fear", "note": "Core fear — avoidance/escape urge", "alt": None},
        {"id": "scared", "applicable": True, "parent": "fear", "note": "Acute fear — flee/freeze urge", "alt": None},
        {"id": "anxious", "applicable": True, "parent": "fear", "note": "Anticipatory avoidance urge", "alt": None},
        {"id": "insecure", "applicable": True, "parent": "shame", "note": "Cross-family: hiding/concealment urge, not flight", "alt": None},
        {"id": "weak", "applicable": True, "parent": "shame", "note": "Cross-family: shrinking/hiding urge", "alt": None},
        {"id": "rejected", "applicable": True, "parent": "shame", "note": "Cross-family: urge to hide from further rejection", "alt": None},
        {"id": "helpless", "applicable": True, "parent": "sadness", "note": "Cross-family: withdrawal/giving-up urge", "alt": None},
        {"id": "frightened", "applicable": True, "parent": "fear", "note": "Acute fear — startle/freeze", "alt": None},
        {"id": "worried", "applicable": True, "parent": "fear", "note": "Anticipatory avoidance", "alt": None},
        {"id": "overwhelmed", "applicable": True, "parent": "fear", "note": "Avoidance/escape urge from overload", "alt": None},
        {"id": "inadequate", "applicable": True, "parent": "shame", "note": "Cross-family: shrinking/hiding from exposure", "alt": None},
        {"id": "inferior", "applicable": True, "parent": "shame", "note": "Cross-family: making-self-small urge", "alt": None},
        {"id": "worthless", "applicable": True, "parent": "shame", "note": "Cross-family: urge to disappear", "alt": None},
        {"id": "insignificant", "applicable": True, "parent": "shame", "note": "Cross-family: urge to shrink away", "alt": None},
        {"id": "excluded", "applicable": True, "parent": "shame", "note": "Cross-family: hiding from social pain", "alt": None},
        {"id": "persecuted", "applicable": True, "parent": "fear", "note": "Escape/avoidance from perceived threat", "alt": None},
        {"id": "nervous", "applicable": True, "parent": "fear", "note": "Mild avoidance urge", "alt": None},
        {"id": "exposed", "applicable": True, "parent": "shame", "note": "Cross-family: urge to cover/hide self", "alt": None},
    ]),
    ("rows", "ANGRY FAMILY (26)", [
        {"id": "angry", "applicable": True, "parent": "anger", "note": "Core anger — attack/criticize urge", "alt": None},
        {"id": "threatened", "applicable": True, "parent": "fear", "note": "Cross-family: avoidance/escape urge, not attack", "alt": None},
        {"id": "let_down", "applicable": True, "parent": "sadness", "note": "Cross-family: withdrawal urge from disappointment", "alt": None},
        {"id": "humiliated", "applicable": True, "parent": "shame", "note": "Cross-family: hiding/concealment, not retaliation", "alt": None},
        {"id": "bitter", "applicable": True, "parent": "anger", "note": "Resentful attack/criticize urge", "alt": None},
        {"id": "mad", "applicable": True, "parent": "anger", "note": "Attack/lash-out urge", "alt": None},
        {"id": "aggressive", "applicable": True, "parent": "anger", "note": "Direct attack urge", "alt": None},
        {"id": "frustrated", "applicable": True, "parent": "anger", "note": "Push-through/attack urge", "alt": None},
        {"id": "distant", "applicable": True, "parent": "sadness", "note": "Cross-family: withdrawal/disengagement", "alt": None},
        {"id": "critical", "applicable": True, "parent": "anger", "note": "Verbal attack urge", "alt": None},
        {"id": "betrayed", "applicable": True, "parent": "anger", "note": "Retaliatory anger urge", "alt": None},
        {"id": "resentful", "applicable": True, "parent": "anger", "note": "Chronic attack/criticize urge", "alt": None},
        {"id": "disrespected", "applicable": True, "parent": "anger", "note": "Retaliatory anger urge", "alt": None},
        {"id": "ridiculed", "applicable": True, "parent": "shame", "note": "Cross-family: hiding from mockery", "alt": None},
        {"id": "indignant", "applicable": True, "parent": "anger", "note": "Righteous attack urge", "alt": None},
        {"id": "violated", "applicable": True, "parent": "anger", "note": "Intense retaliatory urge", "alt": None},
        {"id": "furious", "applicable": True, "parent": "anger", "note": "Intense attack urge", "alt": None},
        {"id": "jealous", "applicable": True, "parent": "jealousy", "note": "Own protocol: control/monitoring urge", "alt": None},
        {"id": "provoked", "applicable": True, "parent": "anger", "note": "Reactive attack urge", "alt": None},
        {"id": "hostile", "applicable": True, "parent": "anger", "note": "Sustained attack stance", "alt": None},
        {"id": "infuriated", "applicable": True, "parent": "anger", "note": "Intense attack urge", "alt": None},
        {"id": "annoyed", "applicable": True, "parent": "anger", "note": "Mild attack/criticize urge", "alt": None},
        {"id": "withdrawn", "applicable": True, "parent": "sadness", "note": "Cross-family: withdrawal IS the sadness urge", "alt": None},
        {"id": "numb", "applicable": False, "parent": None, "note": "Dissociative shutdown — reconnect with body first", "alt": "body-scan"},
        {"id": "skeptical", "applicable": False, "parent": None, "note": "Cognitive stance, not emotion — examine the facts", "alt": "check-the-facts"},
        {"id": "dismissive", "applicable": True, "parent": "disgust", "note": "Cross-family: push-away/rejection urge", "alt": None},
    ]),
    ("rows", "BAD FAMILY (12)", [
        {"id": "stressed", "applicable": True, "parent": "fear", "note": "Avoidance urge from threat overload", "alt": None},
        {"id": "pressured", "applicable": True, "parent": "fear", "note": "Avoidance urge from external demands", "alt": None},
        {"id": "out_of_control", "applicable": True, "parent": "fear", "note": "Panic/escape urge", "alt": None},
        {"id": "busy", "applicable": False, "parent": None, "note": "Activity state, not emotion — slow down", "alt": "mindfulness-emotions"},
        {"id": "rushed", "applicable": False, "parent": None, "note": "Activity state — pause and ground", "alt": "mindfulness-emotions"},
        {"id": "bad", "applicable": False, "parent": None, "note": "Too vague — identify the specific emotion", "alt": "name-it"},
        {"id": "tired", "applicable": False, "parent": None, "note": "Physical depletion — address vulnerability factors", "alt": "please-skill"},
        {"id": "bored", "applicable": False, "parent": None, "note": "Low engagement — address vulnerability factors", "alt": "please-skill"},
        {"id": "sleepy", "applicable": False, "parent": None, "note": "Physical depletion — prioritize sleep", "alt": "please-skill"},
        {"id": "unfocused", "applicable": False, "parent": None, "note": "Cognitive state — address vulnerability factors", "alt": "please-skill"},
        {"id": "apathetic", "applicable": False, "parent": None, "note": "Depletion/disengagement — address basics first", "alt": "please-skill"},
        {"id": "indifferent", "applicable": False, "parent": None, "note": "Low activation — address vulnerability factors", "alt": "please-skill"},
    ]),
    ("rows", "DISGUSTED FAMILY (13)", [
        {"id": "disgusted", "applicable": True, "parent": "disgust", "note": "Core disgust — push-away/rejection urge", "alt": None},
        {"id": "disapproving", "applicable": True, "parent": "disgust", "note": "Rejection/push-away urge", "alt": None},
        {"id": "disappointed", "applicable": True, "parent": "sadness", "note": "Cross-family: withdrawal from unmet expectations", "alt": None},
        {"id": "awful", "applicable": True, "parent": "sadness", "note": "Cross-family: despair/withdrawal urge", "alt": None},
        {"id": "repelled", "applicable": True, "parent": "disgust", "note": "Strong push-away urge", "alt": None},
        {"id": "judgmental", "applicable": True, "parent": "anger", "note": "Cross-family: attack/criticize urge", "alt": None},
        {"id": "embarrassed", "applicable": True, "parent": "shame", "note": "Cross-family: hiding/concealment urge", "alt": None},
        {"id": "appalled", "applicable": True, "parent": "disgust", "note": "Intense push-away/revulsion", "alt": None},
        {"id": "revolted", "applicable": True, "parent": "disgust", "note": "Intense push-away urge", "alt": None},
        {"id": "nauseated", "applicable": True, "parent": "disgust", "note": "Visceral rejection urge", "alt": None},
        {"id": "detestable", "applicable": True, "parent": "disgust", "note": "Strong push-away urge", "alt": None},
        {"id": "horrified", "applicable": True, "parent": "fear", "note": "Cross-family: freeze/avoidance urge", "alt": None},
        {"id": "hesitant", "applicable": True, "parent": "fear", "note": "Cross-family: approach-avoidance conflict", "alt": None},
    ]),
    ("rows", "SAD FAMILY (16)", [
        {"id": "sad", "applicable": True, "parent": "sadness", "note": "Core sadness — withdrawal/isolation urge", "alt": None},
        {"id": "lonely", "applicable": True, "parent": "sadness", "note": "Withdrawal despite craving connection", "alt": None},
        {"id": "vulnerable", "applicable": True, "parent": "fear", "note": "Cross-family: protective avoidance urge", "alt": None},
        {"id": "despair", "applicable": True, "parent": "sadness", "note": "Deep withdrawal/giving-up urge", "alt": None},
        {"id": "guilty", "applicable": True, "parent": "guilt", "note": "Own protocol: avoidance/self-punishment urge", "alt": None},
        {"id": "depressed", "applicable": True, "parent": "sadness", "note": "Pervasive withdrawal/inactivity", "alt": None},
        {"id": "hurt", "applicable": True, "parent": "sadness", "note": "Withdrawal from source of pain", "alt": None},
        {"id": "isolated", "applicable": True, "parent": "sadness", "note": "Withdrawal is both urge and state", "alt": None},
        {"id": "abandoned", "applicable": True, "parent": "sadness", "note": "Withdrawal/despair from loss", "alt": None},
        {"id": "victimized", "applicable": True, "parent": "anger", "note": "Cross-family: retaliatory/blame urge", "alt": None},
        {"id": "fragile", "applicable": True, "parent": "fear", "note": "Cross-family: protective avoidance", "alt": None},
        {"id": "grief", "applicable": True, "parent": "sadness", "note": "Withdrawal/isolation from loss", "alt": None},
        {"id": "powerless", "applicable": True, "parent": "sadness", "note": "Giving-up/withdrawal urge", "alt": None},
        {"id": "ashamed", "applicable": True, "parent": "shame", "note": "Own protocol: hiding/concealment urge", "alt": None},
        {"id": "remorseful", "applicable": True, "parent": "guilt", "note": "Own protocol: avoidance/self-punishment", "alt": None},
        {"id": "empty", "applicable": True, "parent": "sadness", "note": "Profound disengagement/withdrawal", "alt": None},
    ]),
    ("rows", "HAPPY FAMILY: OA-applicable (3)", [
        {"id": "loving", "applicable": True, "parent": "love", "note": "Love OA when attachment doesn't fit the facts", "alt": None},
        {"id": "intimate", "applicable": True, "parent": "love", "note": "Love OA when closeness doesn't fit the facts", "alt": None},
        {"id": "tender", "applicable": True, "parent": "love", "note": "Love OA when tenderness doesn't fit the facts", "alt": None},
    ]),
    ("ids", "HAPPY FAMILY: not OA-applicable (43)", ["happy", "playful", "interested", "proud", "accepted", "powerful", "optimistic", "aroused", "cheeky", "joyful", "curious", "inquisitive", "successful", "confident", "respected", "valued", "courageous", "creative", "hopeful", "inspired", "calm", "relaxed", "peaceful", "content", "trusting", "sensitive", "thankful", "good", "chill", "comfortable", "thoughtful", "mellow", "sympathetic", "serene", "secure", "satisfied", "restful", "appreciative", "at_ease", "balanced", "grounded", "cozy", "humble"],
     "Positive emotion — savor with mindfulness", "mindfulness-emotions"),
    ("rows", "SURPRISED FAMILY: OA-applicable (3)", [
        {"id": "shocked", "applicable": True, "parent": "fear", "note": "Cross-family: freeze/avoidance urge", "alt": None},
        {"id": "dismayed", "applicable": True, "parent": "sadness", "note": "Cross-family: withdrawal from bad news", "alt": None},
        {"id": "disillusioned", "applicable": True, "parent": "sadness", "note": "Cross-family: withdrawal from lost beliefs", "alt": None},
    ]),
    ("ids", "SURPRISED FAMILY: not OA-applicable (10)", ["surprised", "startled", "amazed", "excited", "astonished", "awe", "eager", "energetic"],
     "Transitional/positive state — observe mindfully", "mindfulness-emotions"),
    ("one", "confused", "Cognitive uncertainty — examine the situation", "check-the-facts"),
    ("one", "perplexed", "Cognitive uncertainty — examine the situation", "check-the-facts"),
]

# --- Behaviour urges (DT-02 Hold to wait; plan C5) ---
BEHAVIOUR = [
    {"id": "send", "label": "Send or say something", "lifeThreatening": False},
    {"id": "check", "label": "Check their page, or my phone", "lifeThreatening": False},
    {"id": "hit", "label": "Hit, throw or slam", "lifeThreatening": False},
    {"id": "leave", "label": "Leave, run or disappear", "lifeThreatening": False},
    {"id": "use", "label": "Use, drink, binge or buy", "lifeThreatening": False},
    {"id": "self_harm", "label": "Hurt myself", "lifeThreatening": True},
]
