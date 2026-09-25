# Editable content for "Recover from a hurtful moment". Regenerate the migration with build.py after editing.
FLOW = {
  "version": "recovery-v1",
  "gates": {"downshiftAt": 7, "coldAt": 9, "askMax": 5, "waitMinutes": 20, "chaseWaitMinutes": 60, "validationMax": 2, "orientLowArousalAt": 5, "certaintyReal": 80, "certaintyBoth": 40},
  "pulls": [
    {"id": "fight", "label": "Fight back", "sub": "retort, prove them wrong", "urgeLabel": "fight back"},
    {"id": "chase", "label": "Chase them", "sub": "text, over-explain, fix it now", "urgeLabel": "chase them"},
    {"id": "hide", "label": "Hide", "sub": "withdraw, cancel, disappear", "urgeLabel": "hide"},
    {"id": "freeze", "label": "Shut down", "sub": "numb, blank, heavy", "urgeLabel": "shut down"}
  ],
  "copy": {
    "hero": {"eyebrow": "90 seconds to 5 minutes", "title": "Recover from a hurtful moment", "body": "Brushed off, mocked, made small, left out, left hanging. Settle your body, then decide what to do about them."},
    "what": {"eyebrow": "Recover from a hurtful moment", "title": "What happened?", "sub": "Pick the closest one. You can change it later."},
    "loud": {"title": "How loud is it right now?", "sub": "Two quick taps, then we'll deal with it.", "pullPrompt": "It's pulling me to…"},
    "stop": {"title": "Don't send. Not yet.", "sub": "At this level, anything you send will be louder than you mean it. Lock it first. You can still write it later.", "hold": "Hold to lock sending", "held": "Locked. Nothing goes out right now."},
    "cold": {"eyebrow": "Too hot to think", "title": "Cold reset", "sub": "Cold on your face slows your heart within seconds.", "steps": ["Cold water, ice pack, or a cold can.", "Press it on your eyes and cheeks.", "Hold your breath for 15 to 30 seconds."], "seconds": 30, "caution": "Skip this if you have a heart condition, an arrhythmia, Raynaud's, or an eating disorder. The effect is brief, so the next step matters."},
    "breathe": {"title": "Let the air out slowly", "sub": "Two breaths in through the nose, then a long exhale through the mouth. Three rounds.", "phases": [{"key": "in", "label": "In through your nose", "ms": 2200}, {"key": "sip", "label": "Sip a little more", "ms": 900}, {"key": "out", "label": "Long, slow exhale", "ms": 5600}], "cycles": 3},
    "orient": {"title": "Come back into the room", "sub": "When you want to disappear, calming down makes it heavier. Come back into the room first.", "look": "Look around slowly. Each time something catches your eye, tap a circle.", "move": "Stand up and shake out your hands", "moveSeconds": 20},
    "rerate": {"title": "Quick check", "sub": "Just a number. No right answer.", "prompt": "How loud is it now?"},
    "secure": {"title": "Before anything else", "sub": "When someone pulls away, the alarm says you're alone. You aren't. Borrow someone who gets you for 25 seconds.", "figures": ["A person who gets me", "A pet", "Someone from my past", "Future me, a year from now", "A spiritual figure", "A character I love"], "prompts": ["See their face.", "Hear them say your name.", "Notice what it's like to be understood by them.", "What would they say about today?"]},
    "label": {"title": "What hit hardest?", "sub": "One tap. Just a word, no explanation."},
    "validate": {"title": "This makes sense", "sub": "Pick one or two that feel true. The feeling makes sense even if the story needs a second look.", "stamp": "Read this once, out loud if you can", "done": "That's enough validating"},
    "compassion": {"title": "Self-compassion break", "sub": "Ninety seconds. The self-critic can wait.", "steps": [{"line": "This is a moment of hurt.", "cue": "Just name it."}, {"line": "Being hurt by people is part of being human. Other people feel this too.", "cue": "You're not the only one."}, {"line": "Hand on your heart, or on your arm if that's easier.", "cue": "Feel the warmth for three breaths."}, {"line": "May I be kind to myself right now.", "cue": "Say it the way a kind friend would."}, {"line": "I won't abandon myself. I can protect this.", "cue": "The fierce part counts too."}], "note": "If kindness toward yourself feels uncomfortable right now, that's common. Imagine saying it to a friend who went through this."},
    "need": {"title": "Under this, I needed…", "sub": "The need points to what helps."},
    "certainty": {"title": "Two quick questions about them", "sub": "This decides what fits next. It doesn't decide whether your hurt counts.", "sure": "How sure are you they meant it?", "pattern": "Has this happened before with them?", "zones": {"real": {"title": "Treat it as real.", "body": "It's a pattern and you're sure. No more second-guessing yourself. Go to a request or a boundary."}, "both": {"title": "Hold both.", "body": "Maybe they dismissed you, maybe they were distracted. Either way your hurt makes sense. A clarifying question fits here."}, "check": {"title": "Worth a second look.", "body": "Old wounds can turn up the volume, and those wounds are real too. A clarifying question costs little."}}},
    "them": {"title": "About this person", "sub": "This decides whether asking them is worth it.", "safe": "Is it safe to bring this up with them?", "asks": "Have you already asked them to hear you on this?", "safetyNote": "If someone is hurting or controlling you, safety comes before any of this. In the US you can call or text 988, or reach the Domestic Violence Hotline at 1-800-799-7233."},
    "route": {"title": "What now?", "best": "Best fit now", "unlockBreathe": "Breathe to unlock", "unlockOrient": "Move to unlock"},
    "locks": {"tooHot": "Unlocks at {max} or under. You're at {now}.", "unsafe": "Not with someone who isn't safe to ask.", "refused": "You've asked twice. Asking again usually re-injures.", "deliberate": "They're doing this on purpose. Asking gives them another shot."},
    "land": {"title": "Let it land", "sub": "You don't need them to get it for the need to be met.", "grief": ["I wanted them to understand.", "They can't, or won't, right now.", "That's a real loss. It's okay to be sad about it.", "I can meet this need somewhere else."], "boundaryIntro": "If you need to say something before you step away, a boundary says what you will do. It doesn't argue.", "boundary": "I've said how this lands. I won't argue about whether my feelings are real. I'm stepping away now.", "skipBoundary": "I don't need to say anything", "cueCalm": "Palms up on your lap. Unclench your jaw. Let your shoulders drop while you read.", "cueOrient": "Feet flat on the floor. Look around the room once while you read.", "values": ["Honesty", "Kindness", "Courage", "Loyalty", "Craft", "Fairness", "Curiosity", "Care for family"]},
    "opposite": {"title": "Do the opposite", "sub": "Acting against the urge takes away its fuel.",
      "fight": {"lead": "The urge says hit back. The opposite is to step back gently, and be a little kind if you can.", "options": ["Leave the conversation for 20 minutes and say when you'll be back", "Put the phone face down and do something with your hands", "Answer something neutral and kind, then stop"], "note": "Stepping back isn't giving in. You can still raise it later, at a 5 or under."},
      "chase": {"lead": "The urge says reach them now. The opposite is wait. After an hour, if you still want to, send one calm message."},
      "hide": {"lead": "The urge says disappear. The opposite is one small step where people can see you.", "options": [{"size": "Small", "text": "Send one friend a hello. No explanation needed."}, {"size": "Medium", "text": "Show up to one thing you were about to cancel."}, {"size": "Bigger", "text": "Say one sentence in the group chat or meeting."}], "hold": "Hold to commit"}},
    "park": {"title": "Park the replay", "sub": "You aren't dropping it. You're giving it a time.", "why": "Replaying feels like solving, but it usually isn't. Give it a set time. When that time comes, you'll use it for one concrete next step, not another replay.", "times": ["6:30 pm tonight", "8:00 pm tonight", "Tomorrow, 9 am"], "thought": "\"why did they say that…\""},
    "prefer": {"title": "Loosen the must", "sub": "Frustration grows from \"must\".", "prompt": "Which \"must\" is running?", "musts": [{"must": "They must listen to me", "prefer": "I strongly prefer that they listen"}, {"must": "I must be understood", "prefer": "I strongly prefer to be understood"}, {"must": "This must go my way", "prefer": "I strongly prefer that this goes my way"}, {"must": "It must be fair", "prefer": "I strongly prefer that things are fair"}], "tail": ", and I can stand it when that doesn't happen. It's hard, and I can stand it.", "note": "Your preference is valid. Only the \"must\" goes."},
    "close": {"eyebrow": "Close", "title": "Where are you now?", "sub": "Two numbers, then you're done.", "down": "The urge peaked and came down while you did something else with it. That's the thing to notice.", "same": "Same number, and you didn't act on it. Holding steady at a high number is still practice.", "up": "The pull went up. That happens, especially when the wound is fresh. You still didn't act on it.", "reps": "Reps count whenever they happen. Missing a day costs nothing."},
    "follow": {"title": "Keep it going", "sub": "Optional. Nothing is scheduled unless you pick it.", "options": [{"id": "tomorrow", "title": "Check in tomorrow", "sub": "A 5-minute look at what led up to this, once it's cooled down."}, {"id": "rehearse", "title": "Rehearse the next time", "sub": "If this person does it again: their likely line, your body cue, your move."}, {"id": "experiment", "title": "Log how it actually went", "sub": "Predict how they'll react, then log what happened. Evidence, not a verdict."}]}
  },
  "sourceIds": ["linehan_skills_2015", "shenk_fruzzetti_2011", "williams_2009", "kross_2014", "balban_2023", "pascual_leone_2007", "ferrari_2019", "gillath_2022", "torre_lieberman_2018", "watkins_2012", "mcgowan_behar_2013"]
}
SOURCES = [
  ("linehan_skills_2015", "Marsha M. Linehan — DBT Skills Training Manual, 2nd ed. (2015): validation, STOP, TIPP, opposite action, DEAR MAN/GIVE/FAST, radical acceptance", "https://www.guilford.com/books/DBT-Skills-Training-Manual/Marsha-Linehan/9781462516995"),
  ("shenk_fruzzetti_2011", "Shenk & Fruzzetti (2011), J. Social and Clinical Psychology — invalidation raises negative affect and arousal; validation prevents the rise", "https://doi.org/10.1521/jscp.2011.30.2.163"),
  ("williams_2009", "Williams (2009), Advances in Experimental Social Psychology — temporal need-threat model of ostracism", "https://doi.org/10.1016/S0065-2601(08)00406-1"),
  ("kross_2014", "Kross et al. (2014), JPSP — self-talk as a regulatory mechanism (distanced self-talk)", "https://doi.org/10.1037/a0035173"),
  ("balban_2023", "Balban et al. (2023), Cell Reports Medicine — brief structured respiration (cyclic sighing) RCT", "https://doi.org/10.1016/j.xcrm.2022.100895"),
  ("pascual_leone_2007", "Pascual-Leone & Greenberg (2007), JCCP — emotional processing: grieving unmet needs", "https://doi.org/10.1037/0022-006X.75.6.875"),
  ("ferrari_2019", "Ferrari et al. (2019), Mindfulness — self-compassion interventions meta-analysis", "https://doi.org/10.1007/s12671-019-01134-6"),
  ("gillath_2022", "Gillath et al. (2022), Personality and Social Psychology Review — attachment security priming meta-analysis", "https://doi.org/10.1177/10888683211054592"),
  ("torre_lieberman_2018", "Torre & Lieberman (2018), Emotion Review — affect labeling as implicit emotion regulation", "https://doi.org/10.1177/1754073917742706"),
  ("watkins_2012", "Watkins et al. (2012), Psychological Medicine — guided self-help concreteness training for depression, Phase II RCT", "https://doi.org/10.1017/S0033291711002480"),
  ("mcgowan_behar_2013", "McGowan & Behar (2013), Behavior Modification — stimulus control training (worry postponement), preliminary RCT", "https://doi.org/10.1177/0145445512455661"),
]
PROTOCOLS = {
  "not_received": ("Not received", ["{N}, of course that stung. You were trying to be heard and got {phrase}.", "Anyone who wanted to be understood would feel this.", "{N}'s hurt makes sense. The story about it might not.", "{N} can know this hurt without needing them to be the villain."], ["self_validation", "affect_labeling", "distanced_self_talk", "dbt_dear_man"]),
  "diminished_self": ("Diminished self", ["{N}, this is a moment of hurt. Being {phrase} hurts anyone.", "{N}'s feeling is real. It isn't a verdict on {N}.", "Feeling small right now doesn't make {N} small.", "Both can be true: {N} is sensitive to this, and it was unkind."], ["self_validation", "self_compassion_break", "act_values", "dbt_opposite_action"]),
  "blocked_wronged": ("Blocked or wronged", ["{N}, it makes sense you're furious. Something mattered and got {phrase}.", "{N} can know this was unfair without replaying it all night.", "It's understandable {N} is angry. {N} chooses the next move.", "Both can be true: this was wrong, and {N} gets to decide what to do with it."], ["self_validation", "dbt_stop", "cbt_should_statements", "rumination_postponement"]),
  "attachment_alarm": ("Attachment alarm", ["{N}, of course you're scared. Losing connection sets off a real alarm.", "This is real pain, not oversensitivity. Rejection sets off alarm systems that overlap with physical pain.", "{N} can hold this fear without chasing.", "The alarm is loud. That doesn't mean the relationship is over."], ["self_validation", "security_priming", "dbt_opposite_action"]),
}
# id, label, covers, protocol, also, phrase, highRisk, lowArousal, emotions(ranked, first=default), patterns
STATES = [
  ("brushed", "They brushed off what I said", ["dismissed","minimized","invalidated"], "not_received", None, "brushed off", False, False, ["hurt","disrespected","frustrated","let_down","lonely"], ["social_threat_shame","reactive_aggression"]),
  ("unheard", "They didn't hear me or got me wrong", ["unheard","misunderstood"], "not_received", None, "not heard", False, False, ["lonely","hurt","frustrated","isolated","let_down"], ["social_threat_shame"]),
  ("mocked", "They mocked me or twisted my words", ["trivialized","caricatured"], "not_received", "blocked_wronged", "made into a caricature", True, False, ["humiliated","ridiculed","furious","embarrassed","disrespected"], ["reactive_aggression","social_threat_shame"]),
  ("small", "They made me feel small", ["devalued","deflated","flawed","insignificant"], "diminished_self", None, "made to feel small", False, True, ["ashamed","inadequate","worthless","insignificant","powerless","numb"], ["social_threat_shame"]),
  ("ignored", "I was ignored or left out", ["invisible","ostracized"], "diminished_self", "attachment_alarm", "left out", False, True, ["excluded","rejected","lonely","isolated","insignificant","numb"], ["social_threat_shame","grief_yearning"]),
  ("leaving", "They pulled away and I'm scared they'll leave", ["abandoned"], "attachment_alarm", None, "left hanging by someone who matters", False, False, ["abandoned","scared","rejected","anxious","lonely","numb"], ["acute_alarm","grief_yearning"]),
  ("blocked", "Something I need keeps getting blocked", ["frustrated"], "blocked_wronged", None, "blocked", False, False, ["frustrated","furious","powerless","annoyed","resentful"], ["reactive_aggression"]),
  ("stewing", "It keeps happening and I can't let it go", ["resentful"], "blocked_wronged", None, "wronged again", False, False, ["resentful","bitter","betrayed","furious","hurt"], ["rumination_loop","reactive_aggression"]),
]
SOCIAL = {
  "belonging": ("Borrow a safe person", "Send one person: \"Can I tell you something? No advice, just listen.\"", "need_restoration", "validating_other"),
  "worth": ("Remember what you stand for", "Pick your top value, then one time this week you lived it.", "act_values", "values"),
  "control": ("Take back one thing", "Choose one thing in the next hour that is fully yours to decide.", "need_restoration", "one_thing"),
  "mattering": ("Matter to someone", "Do one small useful thing for someone. Two minutes is enough.", "need_restoration", "mattering"),
}
NEEDS = [
  ("heard", "To be heard", "mattering"),
  ("respected", "To be respected", "worth"),
  ("included", "To be included", "belonging"),
  ("matter", "To matter", "mattering"),
  ("safe", "To feel safe with them", "belonging"),
  ("fair", "Fairness", "control"),
  ("say", "To have a say", "control"),
]
EXITS = [
  ("ask", "Ask them to hear you", "Take this into Ask for what you need. Your feeling and need come with you.", "One calm message, after a wait. Only one.", ["dbt_dear_man","dbt_give","dbt_fast"]),
  ("land", "Let it land, meet the need elsewhere", "Grieve what you didn't get, set a boundary if you need one, then get the need met another way.", None, ["dbt_radical_acceptance","dbt_fast","need_restoration"]),
  ("opposite", "Do the opposite of the urge", "One small step against the urge.", None, ["dbt_opposite_action"]),
  ("park", "Park the replay", "Give the replay a set time tonight. Until then, back to your day.", None, ["rumination_postponement"]),
  ("prefer", "Loosen the \"must\"", "Change the demand into a strong preference, then take one step.", None, ["cbt_should_statements"]),
]
NEW_CONCEPTS = [
  ("dbt_walking_middle_path", "Walking the Middle Path", "Dialectics, validating yourself and others, and strategies for changing behaviour", "DBT", "Interpersonal Effectiveness", "dbt_interpersonal_effectiveness"),
  ("self_validation", "Self-Validation", "Acknowledging that your emotion is understandable given its causes, without endorsing every interpretation or urge", "DBT", "Interpersonal Effectiveness", "dbt_walking_middle_path"),
  ("affect_labeling", "Affect Labeling", "Putting a single word to a feeling; implicitly down-regulates the threat response", "Cross-modal", None, "rel:dbt_describe"),
  ("distanced_self_talk", "Distanced Self-Talk", "Using your own name or 'you' instead of 'I' to gain psychological distance", "Cross-modal", None, None),
  ("self_compassion_break", "Self-Compassion Break", "Mindfulness of suffering, common humanity, and self-kindness, including a protective (fierce) line", "Compassion-focused", None, None),
  ("security_priming", "Security Priming", "Briefly imagining a secure attachment figure to lower threat and hostility", "Attachment", None, None),
  ("cyclic_sighing", "Cyclic Sighing", "Double inhale through the nose followed by a long exhale; fastest reliable breathing downshift", "Physiological", None, "rel:dbt_tipp"),
  ("rumination_postponement", "Rumination Postponement", "Scheduling a set time for replay and using it for concrete next steps", "CBT", None, None),
  ("need_restoration", "Need Restoration", "Restoring the specific social need threatened by exclusion (belonging, worth, control, mattering) through a prosocial route", "Social psychology", None, None),
  ("dbt_recovering_from_invalidation", "Recovering from Invalidation", "Body-first sequence after someone dismisses, mocks, excludes or pulls away: settle, name it, self-validate, name the need, then ask (DEAR MAN), let it land, or act opposite", "DBT", "Interpersonal Effectiveness", "dbt_walking_middle_path"),
]
# emotions the tool concept ADDRESSES (drives getStateAndTools recommendations)
ADDRESSES = ["hurt","humiliated","rejected","excluded","abandoned","rejection","hot_shame"]
SKILLS = [
  ("sigh", "Cyclic sigh", "Moderate", "body", "cyclic_sighing", "A long exhale slows your breathing and your heart. Daily practice beat mindfulness on mood in a 28-day trial."),
  ("stop", "Don't send yet", "Clinical consensus", "body", "dbt_stop", "A few seconds between urge and action prevents the costliest moves."),
  ("cold", "Cold reset", "Moderate", "body", "dbt_tipp", "Cold on the face triggers the dive reflex and slows the heart. Brief, so it bridges to the next step."),
  ("orient", "Orient + move", "Clinical consensus", "body", "se_orienting", "When you shut down, looking around and moving brings you back. Calming would deepen the slump."),
  ("label", "Name it", "Moderate", "mind", "affect_labeling", "Putting a word on a feeling quiets the brain's alarm. A tap works; typing it out can lock it in."),
  ("validate", "Self-validation", "Moderate", "mind", "self_validation", "Validation stopped the rise in heart rate that invalidation caused. You can give yourself some of it."),
  ("compassion", "Self-compassion break", "Moderate", "mind", "self_compassion_break", "Across 27 trials it cut self-criticism and rumination."),
  ("secure", "Secure base", "Moderate", "people", "security_priming", "Picturing someone who gets you lowers threat and hostility."),
  ("need", "Name the need", "Clinical consensus", "mind", "need_restoration", "The need turns a feeling into a direction."),
  ("request", "Ask for it", "Moderate", "people", "dbt_dear_man", "A calm, specific request makes it more likely you'll feel heard and keeps your self-respect."),
  ("wait_lock", "Wait lock", "Clinical consensus", "people", "dbt_stop", "Messages sent at a 5 or under land better than ones sent at an 8."),
  ("accept", "Let it land", "Clinical consensus", "mind", "dbt_radical_acceptance", "Grieving an unmet need, then meeting it elsewhere, resolves distress better than more protest."),
  ("opposite", "Do the opposite", "Moderate", "body", "dbt_opposite_action", "Acting against the urge takes the fuel away from the emotion."),
  ("park", "Park it", "Preliminary", "mind", "rumination_postponement", "Scheduling the replay for later teaches you rumination can be controlled."),
  ("values", "Values anchor", "Moderate", "mind", "act_values", "Remembering what you stand for makes a threat to your self-image hurt less."),
  ("validating_other", "Borrow a safe person", "Moderate", "people", "need_restoration", "Connection regulates. Ask for listening, not a takedown."),
  ("one_thing", "Take back one thing", "Preliminary", "mind", "need_restoration", "Being excluded threatens control. Restoring a small bit of it helps."),
  ("mattering", "Matter to someone", "Preliminary", "people", "need_restoration", "Doing something that matters to someone restores the sense that you exist to others."),
  ("must_prefer", "Must → prefer", "Moderate", "mind", "cbt_should_statements", "Changing a demand into a strong preference takes the heat out of frustration."),
]

SKILL_SOURCES = {
  "sigh": ["balban_2023"], "stop": ["linehan_skills_2015"], "cold": ["linehan_skills_2015"], "orient": [],
  "label": ["torre_lieberman_2018"], "validate": ["shenk_fruzzetti_2011", "linehan_skills_2015"],
  "compassion": ["ferrari_2019"], "secure": ["gillath_2022"], "need": ["pascual_leone_2007"],
  "request": ["linehan_skills_2015"], "wait_lock": ["linehan_skills_2015"], "accept": ["pascual_leone_2007", "linehan_skills_2015"],
  "opposite": ["linehan_skills_2015"], "park": ["mcgowan_behar_2013"], "values": [],
  "validating_other": ["shenk_fruzzetti_2011"], "one_thing": ["williams_2009"], "mattering": ["williams_2009"], "must_prefer": [],
}

# ---- copy used by the production UI (phase 2) ----
C = FLOW["copy"]
C["phases"] = {"settle": "Settle", "name": "Name", "validate": "Validate", "need": "Need", "move": "Move", "close": "Close"}
C["common"] = {"continue": "Continue", "next": "Next", "done": "Done", "loading": "Loading…"}
C["hold"] = {"hold": "Tap to start, or press and hold while you do it", "holding": "Keep holding while you do it",
  "countdown": "Do it now · {seconds}s · tap to stop", "srHint": "Tap once to start a {seconds}-second timer, or press and hold. Tap again to stop. Space or Enter works the same way.", "done": "Done"}
C["loud"].update({"intensityLabel": "How loud is it right now?", "urgeLabel": "How strong is the pull to {pull}?", "low": "Quiet", "high": "Too loud to think"})
C["stop"].update({"lockText": "Put the phone down. Nothing gets sent.", "held": "Locked. Nothing goes out right now."})
C["cold"].update({"start": "I've got something cold · start", "skip": "Breathe instead", "doneEarly": "Done early"})
C["breathe"].update({"start": "Start · about {seconds} seconds", "skip": "I'm calmer, skip ahead", "done": "Good."})
C["orient"].update({"startMove": "I'm standing · start", "seen": "{n} of 3 noticed"})
C["secure"].update({"prompt": "Who gets you? It doesn't have to be a person.", "start": "Picture them · 25 seconds", "continue": "Continue"})
C["validate"].update({"voice": "Speaking as {voice} · switch"})
C["compassion"].update({"next": "Next", "done": "Done"})
C["certainty"].update({"yes": "Yes, it's a pattern", "no": "Not really", "continue": "Continue"})
C["them"].update({"safeYes": "Yes, mostly", "safeNo": "No, or I'm not sure", "asksOptions": ["Not yet", "Once", "Twice or more"], "cta": "Show my options"})
C["route"].update({"sub": "You're at {now}. The first one fits best right now."})
C["wait"] = {"locked": "Your message is saved. It unlocks when the timer ends. Put the phone down, or do something with your hands.",
  "unlocked": "Unlocked. Re-read it once. If it still fits, send it.", "unlockedShort": "open",
  "waiting": "Phone down. The urge will peak and pass while this runs.", "done": "The wait is over. If you still want to, send one calm message.",
  "copy": "Copy message", "copied": "Copied"}
C["land"].update({"next": "Next", "continue": "Continue", "copy": "Copy", "copied": "Copied",
  "boundaryLocked": "Copying unlocks at {max} or under. You can still step away without saying anything.", "elsewhere": "Meet it elsewhere", "commit": "I'll do this"})
C["opposite"].update({"continue": "Continue", "commit": "I'll do this now"})
C["park"].update({"spot": "parking spot", "cta": "Park it", "back": "Back to my day"})
C["prefer"].update({"tapToRewrite": "tap to rewrite", "continue": "Continue"})
C["close"].update({"intensityPrompt": "How loud is it now?", "urgePrompt": "How strong is the pull to {pull} now?", "reveal": "See what changed",
  "pullHeading": "Pull to {pull}", "waveCaption": "How loud it was, start to now", "waveStart": "Start", "waveNow": "Now", "skillsHeading": "Skills you used",
  "level": "Lv {level} · {toNext} more to Lv {next}", "locked": "Use once to unlock", "mastered": "Mastered",
  "repsLabel": "{reps} of {goal} practice reps this week", "repsMet": "Weekly practice goal met", "weeklyGoal": 4, "next": "Next",
  "signIn": "Sign in to keep your skill cards between sessions.", "saveError": "This session couldn't be saved. Your results are still here.", "retry": "Try again", "saving": "Saving…"})
C["follow"].update({"submit": "Set these and finish", "finish": "Finish"})
C["label"].update({"other": "Another word", "pickerPrompt": "Which word fits best?"})
C["loadError"] = "This tool couldn't load. Try again, or choose another tool."

C["ask"] = {"title": "Ask them to hear you", "sub": "Asking is its own skill. We'll hand what you told us to Ask for what you need.",
  "carry": ["The feeling: {feeling}", "What you needed: {need}", "A {minutes}-minute wait before anything gets sent"],
  "carryHeading": "Coming with you", "cta": "Continue", "finish": "Continue to Ask for what you need"}
TOOL_NAME = "Recover from a hurtful moment"
C["orient"]["skip"] = "I can't do this right now · skip"
C["opposite"]["freeze"] = {"lead": "The urge says go numb and stay there. The opposite is one small step back toward people."}
C["close"]["changedTitle"] = "What changed"
