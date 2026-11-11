# Editable content for Cope Ahead (docs/design/cope-ahead.md). Regenerate schema/cope-ahead.cypher with
# build.py, then tests/fixtures/cope-ahead-content.json with fixture.py, after editing.
#
# DBT Emotion Regulation Handout 19 (Linehan, DBT Skills Training Handouts): describe the situation and
# what's likely to get in the way, decide what to do, imagine it vividly (in it, not watching it),
# rehearse coping with the worst of it, then relax. The core is one if-then line (implementation
# intentions: Gollwitzer & Sheeran 2006; Schweiger Gallo et al. 2009), rehearsed once in the first person
# (field-perspective imagery: Holmes & Mathews 2010; Holmes, Coughtrey & Connor 2008).
#
# Every line is the doc's Copy section as written. Voice (scripts/voice-lint.mjs, user_copy, and the house
# rules): flat and warm, no cheer, no "should", "just" or "but", no exclamation marks. Never predicts how it
# will go and never reassures; the rehearsal ends with getting through it.
# Not gated on sign-off (like Wise mind and Find the feeling). The parts step and the anchor line are parts
# copy (scripts/parts/content.py, DEAR MAN's cope ahead) and wait for the parts sign-off.

VERSION = "cope-ahead-v1"

# Own words: length-checked only, never linted (functions/src/spine/extSchemas.ts, ext.ca).
OWN_MAX = 140       # the situation and the hardest moment
MOVE_OWN_MAX = 90   # a move ("I'll …")

# Find the feeling's four pulls (the same as Urge Surfing's "What does it want to do?").
PULLS = ["fight", "chase", "hide", "blank"]

# Screen 1 → the follow-up window chip (FollowUpType cope_ahead_after, scripts/practice-spine/content.py).
WHEN = [("today", "when_today"), ("tomorrow", "when_tomorrow"), ("this_week", "when_week"), ("later", "when_later")]

# Hard moments (id, label, ifText). `label` is the chip; `ifText` follows "If" in the plan line.
HARD_MOMENTS = [
    ("voice_raised", "They raise their voice", "they raise their voice"),
    ("go_blank", "I go blank", "I go blank"),
    ("not_heard", "They don't listen", "they don't listen"),
    ("start_crying", "I start crying", "I start crying"),
    ("bring_up_past", "They bring up the past", "they bring up the past"),
    ("cold_with_me", "They're cold with me", "they're cold with me"),
    ("old_role", "I slip into an old role", "I slip into an old role"),
    ("criticised", "Someone criticises me", "someone criticises me"),
    ("mistake_seen", "I make a mistake in front of people", "I make a mistake in front of people"),
    ("cant_answer", "I'm asked something I can't answer", "I'm asked something I can't answer"),
    ("nobody_talks", "Nobody talks to me", "nobody talks to me"),
    ("too_much", "It gets too loud or too much", "it gets too loud or too much"),
    ("want_leave", "I want to leave straight away", "I want to leave straight away"),
    ("see_someone", "I see someone I'd rather not", "I see someone I'd rather not"),
    ("wave_hits", "A wave of it hits", "a wave of it hits"),
    ("others_normal", "Everyone acts like it's a normal day", "everyone acts like it's a normal day"),
    ("reminder", "Something reminds me out of nowhere", "something reminds me out of nowhere"),
    ("evening_stretches", "The evening stretches out", "the evening stretches out"),
    ("cant_stop_checking", "I can't stop scrolling or checking", "I can't stop scrolling or checking"),
    ("thoughts_loop", "The same thoughts go round", "the same thoughts go round"),
    ("old_habit", "I want to do the thing I'm trying not to", "I want to do the thing I'm trying not to"),
    ("might_hurt", "They might hurt me", "they start to frighten me"),
    ("might_hurt_self", "I might hurt myself", "I feel like hurting myself"),
]

# Danger moments: CrisisBanner compact under screens 3 and 4, alongside; the flow goes on. Shown last.
DANGER = ["might_hurt", "might_hurt_self"]

# Situations (id, label, afterName, likelyFeelings grid ids, hardMoments in order). `afterName` is how the
# after card names it ("How did {afterName} go?"). dangerMomentIds are the hardMoments in DANGER.
SITUATIONS = [
    ("conversation", "A conversation I'm dreading", "the conversation", ["anxious", "nervous", "angry", "hurt"],
     ["voice_raised", "go_blank", "not_heard", "start_crying", "might_hurt"]),
    ("someone", "Seeing someone in particular", "seeing them", ["nervous", "hurt", "angry", "embarrassed"],
     ["bring_up_past", "cold_with_me", "old_role", "go_blank", "might_hurt"]),
    ("work_school", "Something at work or school", "it", ["anxious", "pressured", "inadequate", "exposed"],
     ["go_blank", "criticised", "mistake_seen", "cant_answer"]),
    ("place_event", "A place or an event", "it", ["nervous", "excluded", "overwhelmed", "embarrassed"],
     ["nobody_talks", "too_much", "want_leave", "see_someone"]),
    ("hard_day", "A day that's hard every year", "the day", ["sad", "grief", "lonely", "numb"],
     ["wave_hits", "others_normal", "reminder", "start_crying", "might_hurt_self"]),
    ("alone", "Being on my own", "being on your own", ["lonely", "empty", "anxious", "bored"],
     ["evening_stretches", "cant_stop_checking", "thoughts_loop", "old_habit", "might_hurt_self"]),
    ("other", "Something else", "it", ["anxious", "nervous", "sad", "angry"],
     ["go_blank", "start_crying", "want_leave", "voice_raised"]),
]

# The pull as the "If" (keyed by Find the feeling's pull ids).
PULL_IF = {
    "fight": "I want to say something sharp",
    "chase": "I want to text them over and over",
    "hide": "I want to disappear",
    "blank": "I start to shut down",
}

# Moves (id, kind, label, line, forPulls, general, appToolId, forMoments, forSituations). `label` is the chip;
# `line` follows "I'll" in the plan line. general moves show with no pull or Not sure; forMoments moves show only
# for those moments, first; forSituations moves only for those situations (empty: any). A tool move's label is
# the tool's name in src/data/tools.ts (test-pinned).
MOVES = [
    ("long_out", "body", "Breathe out longer than in", "breathe out longer than in", ["fight", "chase", "hide"], True, None, [], []),
    ("feet", "body", "Feel my feet on the floor", "feel my feet on the floor", ["hide", "blank", "fight"], True, None, [], []),
    ("cold_water", "body", "Cold water on my hands", "put cold water on my hands", ["fight", "chase", "blank"], False, None, [], []),
    ("hold_something", "body", "Hold something in my pocket", "hold something in my pocket", ["blank", "hide"], False, None, [], []),
    ("give_minute", "words", "Say “Give me a minute”", "say “Give me a minute”", ["fight", "blank", "chase"], True, None, [], []),
    ("come_back", "words", "Say “I'll come back to you on that”", "say “I'll come back to you on that”", ["fight", "chase"], False, None, [], []),
    ("say_hard", "words", "Say “This is hard for me”", "say “This is hard for me”", ["hide", "blank"], True, None, [], []),
    ("one_thing", "words", "Say the one thing I came to say", "say the one thing I came to say", ["hide", "chase"], False, None, [], []),
    ("step_out", "action", "Step out for five minutes", "step out for five minutes", ["fight", "chase", "hide"], True, None, [], []),
    ("stay_ten", "action", "Stay ten more minutes, then decide", "stay ten more minutes, then decide", ["hide"], False, None, [], []),
    ("text_trust", "action", "Text someone I trust", "text someone I trust", ["hide", "blank"], True, None, [], []),
    ("phone_away", "action", "Put my phone in another room", "put my phone in another room", ["chase"], False, None, [], []),
    ("leave_safe", "action", "Leave and get somewhere safe", "leave and get somewhere safe", [], False, None, ["might_hurt"], []),
    ("reach_help", "action", "Call or text someone who can help, now", "call or text someone who can help, now", [], False, None, ["might_hurt_self"], []),
    # DEAR MAN's cope-ahead moves, absorbed (plan D10, ER-B2): the ones that are something to do in the moment of
    # a conversation, for a conversation or seeing someone. DEAR MAN's own nodes stay (SAME_MOVE_AS below).
    ("name_it", "words", "Name what's happening", "name what's happening out loud", ["fight"], False, None, [], ["conversation", "someone"]),
    ("validate_first", "words", "Say “I can see this is hard for you too”", "say “I can see this is hard for you too”", ["fight", "hide"], False, None, [], ["conversation", "someone"]),
    ("tears_ok", "words", "Say “I might cry, and I want to keep going”", "say “I might cry, and I want to keep going”", ["hide", "blank"], False, None, [], ["conversation", "someone"]),
    ("no_sorry", "words", "Say “I understand” instead of an extra sorry", "say “I understand” instead of an extra sorry", ["hide"], False, None, [], ["conversation", "someone"]),
    ("notes", "action", "Look at the points I wrote down", "look at the points I wrote down", ["blank", "hide"], False, None, [], ["conversation", "work_school"]),
    ("pause", "tool", "Hold to wait", "open Hold to wait", ["fight", "chase"], False, "pause", [], []),
    ("five_senses", "tool", "5-4-3-2-1", "do 5-4-3-2-1", ["blank", "hide", "fight"], True, "five-senses", [], []),
    ("cool_down", "tool", "Circuit Breaker", "do Circuit Breaker", ["fight", "chase"], False, "cool-down", [], []),
    ("urge_surfing", "tool", "Urge Surfing", "use Urge Surfing", ["chase", "fight"], False, "urge-surfing", [], []),
]

# A danger moment's plan holds only moves that keep the person safe (Gate 3, ER-B2): its own move (listed first),
# plus these, where they fit the pull. No conversation moves (validate, keep going, no sorry, the one thing, come
# back) when someone might hurt them, and nothing that waits it out or only puts the phone away when they might hurt
# themselves. Every other move is left out for that moment.
DANGER_SAFE_MOVES = {
    "might_hurt": ["long_out", "feet", "cold_water", "hold_something", "step_out", "text_trust", "five_senses", "cool_down"],
    "might_hurt_self": ["long_out", "feet", "cold_water", "hold_something", "give_minute", "step_out", "text_trust",
                        "pause", "five_senses", "cool_down", "urge_surfing"],
}
assert set(DANGER_SAFE_MOVES) == set(DANGER)
assert all(m in {x[0] for x in MOVES} and not next(x for x in MOVES if x[0] == m)[7] for ms in DANGER_SAFE_MOVES.values() for m in ms)

# DEAR MAN's 11 CopeAhead moves (schema/dear-man-debrief-content.cypher; scripts/dear-man/content.py) → the
# CopeMove that is the same move (plan D10: absorbed, linked SAME_MOVE_AS, never renamed or deleted: parts map
# them). HELD: not a move for the moment itself, with the reason.
SAME_MOVE_AS = {
    "ca_pause_phrase": "give_minute",
    "ca_body_anchor": "feet",
    "ca_broken_record": "one_thing",
    "ca_planned_exit": "come_back",
    "ca_name_the_dynamic": "name_it",
    "ca_validate_first": "validate_first",
    "ca_tears_plan": "tears_ok",
    "ca_apology_check": "no_sorry",
    "ca_write_it_down": "notes",
}
SAME_MOVE_HELD = {
    "ca_time_limit": "set before the conversation starts, part of DEAR MAN's prep, not something to do at the hard moment",
    "ca_success_anchor": "a debrief reflection on what worked, not a plan for the moment",
}

# Rehearsal beats (id, text), in order. {moment}: the moment's ifText (or own words); {plan}: the move
# lines joined with "and". Beat 7 shows under beat 6 on the same screen. Once more runs beats 3-7 with
# rehearse_new_problem above beat 3.
BEATS = [
    ("arrive", "You're arriving. Picture where it happens."),
    ("around", "Notice what's around you: what you see, what you hear, your feet."),
    ("moment", "Then it happens: {moment}."),
    ("notice", "You feel it rise. You know this moment. You planned for it."),
    ("plan", "You do your plan: {plan}."),
    ("through", "It's still hard, and you keep going."),
    ("over", "Then it's over."),
]

# The screens (CopeAheadFlow), keyed as the doc's table.
COPY = {
    "what_title": "What's coming up?",
    "what_own_hint": "Say it your way",
    "when_title": "When is it?",
    "when_today": "Today",
    "when_tomorrow": "Tomorrow",
    "when_week": "This week",
    "when_later": "Later, or not sure",
    "feel_title": "What might you feel there?",
    "feel_hint": "Pick up to two.",
    "feel_more": "Something else",
    "pull_title": "What might you want to do?",
    "not_sure": "Not sure",
    "moment_title": "What's the moment you're most worried about?",
    "moment_own_hint": "Say it your way",
    "plan_title": "If it happens, I'll…",
    "plan_if": "If",
    "plan_ill": "I'll",
    "plan_and": "and",
    "plan_use_pull": "Plan for the pull instead",
    "plan_use_moment": "Plan for the moment instead",
    "plan_add": "Add one more",
    "plan_own_hint": "Say it your way",
    "rehearse_intro": "Picture it as if it's happening now. You're in it, not watching.",
    "rehearse_next": "Next",
    "rehearse_again_q": "Once more, with something you didn't expect?",
    "rehearse_again_yes": "Yes",
    "rehearse_again_no": "That's enough",
    "rehearse_new_problem": "Something you didn't plan for happens.",
    "rehearse_keep_move": "Keep the same plan",
    "rehearse_change_move": "Change what I'll do",
    "settle_title": "Let your body come back to now.",
    "settle_breath": "Three long breaths out",
    "settle_five": "5-4-3-2-1",
    "settle_ok": "I'm OK",
    "settle_hold": "Hold while you breathe out, slowly.",
    "settle_hold_hint": "Three times. Let go between them.",
    "keep_title": "Here's your plan.",
    "keep_yes": "Keep this",
    "keep_no": "Not now",
    "keep_failed": "Couldn't save that. Try again.",
    "keep_done": "Kept in My words.",
    "ask_after_q": "Want me to ask how it went?",
    "ask_after_yes": "Yes",
    "ask_after_no": "No thanks",
    "done": "Done",
    "entry_dear_man": "Rehearse it",
    "entry_recover": "Walk through it with Cope Ahead",
}

# The after card (cope_ahead_after), keyed as the doc's table. The Today card reads the plan from the
# session's ext.ca, never a copy.
AFTER = {
    "after_q": "How did {afterName} go?",
    "after_better": "Better than I feared",
    "after_expected": "About what I expected",
    "after_harder": "Harder than I expected",
    "after_not_yet": "It hasn't happened yet",
    "after_plan_q": "Did your plan help?",
    "after_plan_helped": "Used it, it helped",
    "after_plan_unsure": "Used it, not sure",
    "after_plan_unused": "Didn't use it",
    "after_skip": "Skip",
    "after_plan_line": "Your plan: {plan}",
}

# The if-then and imagery sources.
SOURCES = [
    ("gollwitzer_sheeran_2006", "Gollwitzer & Sheeran (2006), Advances in Experimental Social Psychology — implementation intentions and goal achievement: a meta-analysis of effects and processes", "https://doi.org/10.1016/S0065-2601(06)38002-1"),
    ("schweiger_gallo_2009", "Schweiger Gallo, Keil, McCulloch, Rockstroh & Gollwitzer (2009), Journal of Personality and Social Psychology — strategic automation of emotion regulation", "https://doi.org/10.1037/a0013460"),
    ("holmes_mathews_2010", "Holmes & Mathews (2010), Clinical Psychology Review — mental imagery in emotion and emotional disorders", "https://doi.org/10.1016/j.cpr.2010.01.001"),
    ("holmes_coughtrey_connor_2008", "Holmes, Coughtrey & Connor (2008), Emotion — looking at or through rose-tinted glasses? Imagery perspective and positive mood", "https://doi.org/10.1037/a0013617"),
]

FLOW = {
    "version": VERSION,
    "ownMax": OWN_MAX,
    "moveOwnMax": MOVE_OWN_MAX,
    "sourceIds": ["linehan_skills_2015"] + [s[0] for s in SOURCES],
    "when": [{"id": wid, "key": key} for wid, key in WHEN],
    "copy": COPY,
    "pullIf": PULL_IF,
    "after": AFTER,
}
