# Editable source for schema/parts.cypher (docs/design/parts.md). build.py reads this file;
# regenerate with build.py, then fixture.py.
#
# WHAT: the shared vocabulary of protective moves, the reviewed mapping from every module's existing
# ids onto it, the hurts a move may guard, and every line of parts copy (Meet a part, Two pulls, the
# trail offer, the tag row, Settings). Nothing here is served to the app yet: Phase 0 only puts it in
# the graph, as drafts, so it can be reviewed and the trail engine has a vocabulary to count with.
#
# WHY one vocabulary: each module asks about urges in its own words (OA's 32 ActionUrges, FTF's four
# pulls, Recover's four, DEAR MAN's debrief answers, Problem Solve's barriers, the check-in's follow-up
# answers). A trail ("when someone pulls away, the pull to hide") is only visible across tools if they
# all reach the same small set of moves. It works like vocabulary.py's SIGNALS: a reviewed table.
#
# RULES the build checks (and the tests pin):
#   - Moves describe what a part DOES, never what it is. No manager / firefighter / exile anywhere a
#     person can see (voice lint: no_role_labels, no_role_manager).
#   - No move is called "disappear": in a high-distress moment "A part of you wants to disappear" reads
#     as the app echoing suicidal ideation (review finding 3). FTF's chip "Disappear" stays the person's
#     choice; the app answers with `hide`.
#   - go_blank and zone_out are offerable False and have no unblendPhrase, trailPhrase or nameHint:
#     shutdown and far-away states are where dissociation lives and parts language most often harms.
#     They still count as evidence for a part the person made themselves.
#   - Every id of every mapped label is either mapped (EXPRESSES and friends) or HELD with a reason. A
#     new id in a module fails the coverage test until someone decides.
#   - Two pulls pairs use offerable moves only.
#   - No crisis numbers in parts copy: crisis resources come from the one crisis seam
#     (functions/src/safety/checkinSafetyFlag.ts), alongside, never instead.
#   - No close copy: the then-vs-now close is the spine's (practice-spine content).
#   - Every user-visible string is written to the voice lint's `// @parts-copy-json` rows with its kind
#     (prompt / chip / voice / keepsake). See scripts/voice-lint.mjs for the scopes and limits.
#
# REVIEW (D-01): clinical content, every node and edge a DRAFT (reviewStatus "draft") until Claudia
# signs it off: add the id (a move, a mapped source id, a hurt, a prompt, an option, a pair, a rule)
# to SIGNED_OFF with the review date. A mapping is keyed by its SOURCE id (signing off "anger-lash"
# approves anger-lash → hit_back). TrailRule.enabled and PartsPolicy.offersEnabled stay False until
# rules have been checked against real data, whatever SIGNED_OFF says.
#
# Points to look at first (changes from parts.md's tables, and the calls most worth a second opinion):
#   - tp_escalated ("It escalated quickly") is HELD, not hit_back: it doesn't say whose move it was.
#   - thought_not_worth ("This isn't worth the fight") is keep_the_peace, not put_it_off: in DEAR MAN
#     it is dropping the ask to avoid the conflict.
#   - hit_back's fear "I'd disappear" is now "I'd stop mattering" (no_ideation_echo).
#   - Danger chips: hit_back "I'd do something I can't take back", turn_on_myself "I'd end up hurting
#     myself". Picking one shows crisis resources alongside and goes straight to Thank it.
#   - The blend check (flow "gate", decided 16 Oct): one question as a parts flow opens; "running
#     things" goes body first. It asks how close the person is to a part, never capacity, so it is
#     not the removed probe and never a band.
#   - "That reaction might be another part" (was "That reaction is a part too"): tentative, never a
#     claim about what's inside someone.

VERSION = "parts-v1"

# id → review date. Nothing is signed off yet.
SIGNED_OFF = {}


def review_status(item_id):
    return "approved" if item_id in SIGNED_OFF else "draft"


# --------------------------------------------------------------------------------------------------
# Protective moves
# --------------------------------------------------------------------------------------------------
# label         chip text, the person's register ("Turn on myself")
# unblendPhrase second person, follows "A part of you …" (fills {move}; ≤ 32 characters)
# trailPhrase   second person infinitive without "to" (fills {pull} / {pull2}; ≤ 18 characters)
# nameHint      a describing name suggestion, never an archetype or a number (fills {name}; ≤ 24)
# kind          proactive | reactive | either: rule logic only, never shown
# safetyLine    a part whose moves include it always shows crisis resources alongside
MOVES = [
    dict(id="hit_back", label="Hit back", unblendPhrase="wants to hit back", trailPhrase="hit back",
         nameHint="the one who hits back", kind="reactive", offerable=True, safetyLine=False),
    dict(id="chase", label="Chase it, fix it now", unblendPhrase="wants to chase this down", trailPhrase="chase it",
         nameHint="the one who chases", kind="reactive", offerable=True, safetyLine=False),
    dict(id="hide", label="Hide", unblendPhrase="wants to hide", trailPhrase="hide",
         nameHint="the one who hides", kind="either", offerable=True, safetyLine=False),
    dict(id="go_blank", label="Go blank", unblendPhrase=None, trailPhrase=None,
         nameHint=None, kind="reactive", offerable=False, safetyLine=False),
    dict(id="zone_out", label="Zone out", unblendPhrase=None, trailPhrase=None,
         nameHint=None, kind="reactive", offerable=False, safetyLine=False),
    dict(id="keep_the_peace", label="Keep the peace", unblendPhrase="wants to keep the peace", trailPhrase="keep the peace",
         nameHint="the one who keeps peace", kind="proactive", offerable=True, safetyLine=False),
    dict(id="turn_on_myself", label="Turn on myself", unblendPhrase="is turning on you", trailPhrase="turn on yourself",
         nameHint="the one who turns on me", kind="proactive", offerable=True, safetyLine=True),
    dict(id="take_less_room", label="Take up less room", unblendPhrase="wants you to take up less room", trailPhrase="take up less room",
         nameHint="the one who stays small", kind="proactive", offerable=True, safetyLine=False),
    dict(id="keep_watch", label="Keep watch", unblendPhrase="is keeping watch", trailPhrase="keep watch",
         nameHint="the one who keeps watch", kind="proactive", offerable=True, safetyLine=False),
    dict(id="put_it_off", label="Put it off", unblendPhrase="wants to put this off", trailPhrase="put it off",
         nameHint="the one who puts it off", kind="proactive", offerable=True, safetyLine=False),
]

# --------------------------------------------------------------------------------------------------
# Recover's pulls live in its flow JSON, not as nodes (FTF's are FeelingUrge nodes). PullOption gives
# them an id the EXPRESSES table can point from. (id, flow, pullId as the flow stores it)
# --------------------------------------------------------------------------------------------------
PULL_OPTIONS = [
    ("recover_fight", "recover", "fight"),
    ("recover_chase", "recover", "chase"),
    ("recover_hide", "recover", "hide"),
    ("recover_freeze", "recover", "freeze"),
]


def _recover_pull_labels():
    """Recover's own pull labels (scripts/invalidation-recovery/content.py FLOW["pulls"]): the one source."""
    import importlib.util
    import os
    path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "invalidation-recovery", "content.py")
    spec = importlib.util.spec_from_file_location("recover_content", path)
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return {p["id"]: p["label"] for p in mod.FLOW["pulls"]}


# Each PullOption's label is the chip the person picked in Recover ("Fight back", "Hide", ...), imported,
# never a second copy: the trail offer's evidence rows show it. A pull Recover drops fails the build here.
RECOVER_PULL_LABELS = _recover_pull_labels()
PULL_LABELS = {pid: RECOVER_PULL_LABELS[pull] for pid, flow, pull in PULL_OPTIONS if flow == "recover"}

# --------------------------------------------------------------------------------------------------
# (x)-[:EXPRESSES]->(:ProtectiveMove). label → {source id: (move id, why)}
# A source maps to at most one move. Unsure → HELD, never a guess: a wrong edge inflates a trail.
# --------------------------------------------------------------------------------------------------
EXPRESSES = {
    "ActionUrge": {  # Do the Opposite (schema/opposite-action-data.cypher)
        "anger-lash":           ("hit_back", "Lash out or say something cutting."),
        "anger-criticize":      ("hit_back", "Criticize or blame someone: hitting back with words."),
        "anger-destroy":        ("hit_back", "Break or throw something: the fight move turned on things."),
        "envy-tear-down":       ("hit_back", "Tear them down, in your head or out loud."),
        "disgust-judge":        ("hit_back", "Judge or condemn: contempt is an attack from a distance."),
        "jealousy-check":       ("chase", "Check their phone or whereabouts: chasing certainty."),
        "jealousy-interrogate": ("chase", "Ask repeatedly: chasing an answer so it can settle."),
        "jealousy-cling":       ("chase", "Cling or demand attention: chasing closeness."),
        "love-stalk":           ("chase", "Check their social media."),
        "love-reach-out":       ("chase", "Reach out when love doesn't fit the facts: chasing contact."),
        "love-proximity":       ("chase", "Go places they might be: chasing proximity."),
        "shame-hide":           ("hide", "Hide or disappear (OA's own label; the move is hide)."),
        "shame-secret":         ("hide", "Keep it secret: hiding what happened."),
        "shame-avoid-people":   ("hide", "Avoid people who might notice."),
        "sad-isolate":          ("hide", "Cancel plans and isolate."),
        "fear-cancel":          ("hide", "Cancel plans: getting out of the way of it."),
        "fear-escape":          ("hide", "Run away or escape."),
        "anger-stonewall":      ("hide", "Shut someone out: hiding behind a wall, not attacking."),
        "disgust-leave":        ("hide", "Leave the situation."),
        "guilt-avoid":          ("hide", "Avoid the person you think you wronged."),
        "fear-freeze":          ("go_blank", "Freeze and do nothing: shutdown, never offered."),
        "sad-scroll":           ("zone_out", "Scroll mindlessly or zone out."),
        "sad-bed":              ("zone_out", "Stay in bed and do nothing."),
        "guilt-apologize":      ("keep_the_peace", "Apologize again or excessively: smoothing it over."),
        "guilt-punish":         ("turn_on_myself", "Punish yourself (safety line)."),
        "envy-compare":         ("turn_on_myself", "Compare and despair: the comparison is turned on yourself."),
        "shame-shrink":         ("take_less_room", "Make yourself small."),
        "fear-avoid":           ("put_it_off", "Avoid it entirely."),
        "sad-give-up":          ("put_it_off", "Give up on something that matters."),
        "envy-give-up":         ("put_it_off", "Give up on your own goals."),
    },
    "FeelingUrge": {  # Find the feeling's pull (schema/find-the-feeling.cypher)
        "fight": ("hit_back", "FTF's fight pull."),
        "chase": ("chase", "FTF's chase pull."),
        "hide":  ("hide", "FTF's hide pull (its chip says \"Disappear\"; the app answers with hide)."),
        "blank": ("go_blank", "FTF's blank pull: shutdown, never offered."),
    },
    "PullOption": {  # Recover's pull (PULL_OPTIONS above)
        "recover_fight":  ("hit_back", "Recover's \"Fight back\"."),
        "recover_chase":  ("chase", "Recover's \"Chase them\"."),
        "recover_hide":   ("hide", "Recover's \"Hide\"."),
        "recover_freeze": ("go_blank", "Recover's \"Shut down\": never offered."),
    },
    "MomentResponse": {  # DEAR MAN debrief: what I did in the moment
        "mr_got_loud":        ("hit_back", "I got loud or intense."),
        "mr_left":            ("hide", "I left / ended it."),
        "mr_went_quiet":      ("hide", "I went quiet."),
        "mr_changed_subject": ("hide", "I changed the subject: stepping out of sight of it."),
        "mr_froze":           ("go_blank", "I froze up."),
        "mr_agreed":          ("keep_the_peace", "I agreed with them."),
    },
    "TurningPoint": {  # DEAR MAN debrief: where it turned
        "tp_no_words":        ("go_blank", "I couldn't find the words."),
        "tp_crying_shutdown": ("go_blank", "I started crying or shutting down."),
        "tp_gave_in":         ("keep_the_peace", "I gave in to keep the peace."),
        "tp_apologized":      ("keep_the_peace", "I apologized when I didn't need to."),
    },
    "ThoughtPattern": {  # DEAR MAN debrief: what went through my head
        "thought_my_fault":    ("turn_on_myself", "This is probably my fault."),
        "thought_too_much":    ("turn_on_myself", "I'm being too much."),
        "thought_dont_deserve": ("take_less_room", "I don't deserve to ask."),
        "thought_wrong":       ("keep_watch", "What if I'm wrong?"),
        "thought_will_leave":  ("keep_watch", "They're going to leave: scanning for the loss."),
        "thought_not_worth":   ("keep_the_peace", "This isn't worth the fight: dropping the ask to avoid the conflict."),
    },
    "DearManBarrier": {  # DEAR MAN prep: what's in the way
        "barrier_no_right": ("take_less_room", "I don't feel like I have the right to ask."),
        "barrier_guilty":   ("take_less_room", "I feel guilty asking."),
        "barrier_angry":    ("keep_the_peace", "I'm afraid they'll get angry."),
    },
    "BarrierSubResponse": {  # Problem Solve: what got in the way
        "person-no-right-to-speak":  ("take_less_room", "I don't feel like I have the right to say something."),
        "person-scared-reaction":    ("keep_the_peace", "I'm scared of their reaction."),
        "cant-keep-putting-off":     ("put_it_off", "I keep putting it off and I don't know why."),
        "cant-afraid-aftermath":     ("put_it_off", "I'm afraid of what happens after."),
        "cant-ambivalent":           ("put_it_off", "Part of me doesn't actually want this to change."),
        "tried-thinking-constantly": ("keep_watch", "I've been thinking about it constantly."),
    },
    "QuestionResponse": {  # the check-in's follow-up answers
        "hu_exp_vigilance": ("keep_watch", "A worry that won't switch off."),
        "hu_exp_social":    ("keep_watch", "About what others think of me: watching for judgement."),
        "hu_body_shame":    ("hide", "Heat in face or chest, want to hide."),
        "lu_mind_faraway":  ("go_blank", "Far away or unreal: never offered."),
        "lu_mind_blank":    ("go_blank", "Quiet or blank: never offered."),
        "lu_body_numb":     ("go_blank", "Numb or disconnected: never offered."),
    },
}

# label → {source id: why it has no move}. Every id of a label in EXPRESSES is here or there.
HELD = {
    "ActionUrge": {
        "disgust-push":  "Pushing away is a boundary as often as a protective move; hit back or hide depends on what and who.",
        "love-idealize": "Idealising protects the attachment but is none of the moves; a 'make it fine' move would need review first.",
    },
    "FeelingUrge": {},
    "PullOption": {},
    "MomentResponse": {
        "mr_cried":         "Crying is a feeling arriving, not a protective move.",
        "mr_stayed_course": "Staying on course is the person leading, not a part.",
    },
    "TurningPoint": {
        "tp_defensive":      "Their move, not the person's.",
        "tp_escalated":      "Doesn't say whose move it was: it can be the other person's.",
        "tp_went_okay":      "Nothing to protect from.",
        "tp_something_else": "Unknown.",
    },
    "ThoughtPattern": {
        "thought_never_listen":   "About them, not a move of the person's.",
        "thought_cant_handle":    "Overwhelm: a flood sign, not a protective move.",
        "thought_should_know":    "An expectation; it comes with any move.",
        "thought_something_else": "Unknown.",
    },
    "DearManBarrier": {
        "barrier_dont_know":    "A skill gap, not a protector.",
        "barrier_tried_before": "Experience, not a move; it can sit under any of them.",
        "barrier_emotional":    "A fear of flooding, read as a flood sign, not a move.",
    },
    "BarrierSubResponse": {
        "cant-no-energy":               "Depletion, not a protective move.",
        "person-dont-know-what-to-say": "A skill gap.",
        "person-tried-they-dont-listen": "About them.",
        "tried-talked-to-them":         "What was tried, not a move.",
        "tried-different-approaches":   "What was tried, not a move.",
        "tried-exhausted":              "Depletion.",
    },
    "QuestionResponse": {
        "lu_mind_looping":    "Looping is a process, not a move; keep_watch only if the person says so in Meet a part.",
        "lu_mind_unsure":     "Unknown.",
        "lu_body_heavy":      "A body state.",
        "lu_body_flat":       "Low drive, not a move.",
        "lu_body_unclear":    "Unknown.",
        "hu_exp_alarm":       "Alarm is the state the moves answer, not a move.",
        "hu_exp_flooding":    "A flood signal: the gates read it; it is never a move.",
        "hu_exp_unsure":      "Unknown.",
        "hu_body_racing":     "A body state.",
        "hu_body_tense":      "A body state.",
        "hu_body_overwhelmed": "Overwhelm: a flood sign.",
        "hu_body_unclear":    "Unknown.",
    },
}

# --------------------------------------------------------------------------------------------------
# (:BodySignal)-[:AT_PLACE]->(:BodyRegion): DEAR MAN's body signals on the body map's 15 places, so a
# trail's `place` context can come from either tool (data fix 6).
# --------------------------------------------------------------------------------------------------
AT_PLACE = {
    "bs_chest_tight":   "chest",
    "bs_stomach_drop":  "stomach",
    "bs_face_hot":      "face",
    "bs_hands_shaking": "hands",
    "bs_throat_closed": "throat",
    "bs_numb":          "body",
    "bs_heart_racing":  "chest",
    "bs_jaw_clenched":  "jaw",
    "bs_shoulders_up":  "shoulders",
}
AT_PLACE_HELD = {"bs_none": "No signal, no place."}

# --------------------------------------------------------------------------------------------------
# What a move may be guarding. The six hurts are the agreed angry-part card's chips
# (alexithymia-first-interaction.md, "What it protects"). These are OFFERING HYPOTHESES for the
# "What's it protecting?" chips, never a reading of the person.
# label       chip ("being brushed off")
# hurtPhrase  fills {hurt} ("being brushed off"; ≤ 28)
# feltPhrase  completes "I felt …" when the angry card speaks for the hurt ("brushed off"; fills {felt}; ≤ 24)
# matters     what the anger says matters, for the angry card's vote of confidence ("… because {matters}
#             matters to you"; fills {matters}; ≤ 28)
# namedAs     existing Emotion ids (the agreed spec's mapping: ProtectedHurt → Emotion)
# --------------------------------------------------------------------------------------------------
HURTS = [
    dict(id="brushed_off", label="being brushed off", hurtPhrase="being brushed off", feltPhrase="brushed off",
         matters="being taken seriously", namedAs=["disrespected", "hurt"]),
    dict(id="made_small", label="being made small", hurtPhrase="being made small", feltPhrase="made small",
         matters="being treated as an equal", namedAs=["inferior", "inadequate"]),
    dict(id="left_out", label="being left out", hurtPhrase="being left out", feltPhrase="left out",
         matters="belonging", namedAs=["excluded", "rejected"]),
    dict(id="not_mattering", label="not mattering", hurtPhrase="not mattering", feltPhrase="like I didn't matter",
         matters="mattering to people", namedAs=["insignificant"]),
    dict(id="laughed_at", label="being laughed at", hurtPhrase="being laughed at", feltPhrase="laughed at",
         matters="being respected", namedAs=["humiliated", "ridiculed"]),
    dict(id="alone_in_this", label="being alone in this", hurtPhrase="being alone in this", feltPhrase="alone in this",
         matters="having someone with you", namedAs=["lonely", "isolated"]),
]

# (:ProtectiveMove)-[:OFTEN_GUARDS {rank}]->(:ProtectedHurt): the order the chips are offered in.
OFTEN_GUARDS = {
    "hit_back":       ["brushed_off", "made_small", "laughed_at", "not_mattering"],
    "chase":          ["left_out", "alone_in_this", "not_mattering"],
    "hide":           ["laughed_at", "made_small", "left_out"],
    "keep_the_peace": ["left_out", "alone_in_this", "brushed_off"],
    "turn_on_myself": ["made_small", "laughed_at"],
    "take_less_room": ["brushed_off", "made_small", "not_mattering"],
    "keep_watch":     ["left_out", "laughed_at", "alone_in_this"],
    "put_it_off":     ["made_small", "laughed_at"],
}

# Other modules' ids for the same hurts, so evidence from Recover and DEAR MAN can pre-order the
# chips. An addition to the agreed angry-part spec (parts.md, "Notes on the vocabulary").
# (:InvalidationEvent)-[:CAN_TOUCH]->(:ProtectedHurt): Recover's "what happened"
CAN_TOUCH = {
    "brushed": ["brushed_off"],
    "unheard": ["brushed_off"],
    "mocked":  ["laughed_at"],
    "small":   ["made_small"],
    "ignored": ["left_out", "not_mattering"],
    "leaving": ["left_out", "alone_in_this"],
}
CAN_TOUCH_HELD = {
    "blocked": "A blocked need is about control; none of the six hurts names it.",
    "stewing": "About repetition: it can carry any of the hurts.",
}
# (:UnmetNeed)-[:ANSWERS]->(:ProtectedHurt): Recover's "Under this, I needed…"
ANSWERS = {
    "heard":     ["brushed_off"],
    "respected": ["made_small", "laughed_at"],
    "included":  ["left_out"],
    "matter":    ["not_mattering"],
}
ANSWERS_HELD = {
    "safe": "Safety with them is bigger than any one hurt.",
    "fair": "A control need; none of the six hurts names it.",
    "say":  "A control need; none of the six hurts names it.",
}
# (:Underneath)-[:SAME_AS]->(:ProtectedHurt): DEAR MAN debrief's "What was underneath"
UNDERNEATH_SAME_AS = {
    "under_fear_rejection": ["left_out"],
    "under_loneliness":     ["alone_in_this"],
    "under_powerlessness":  ["made_small"],
}
UNDERNEATH_HELD = {
    "under_shame":    "Shame sits under several hurts; the person picks.",
    "under_grief":    "Grief for how it should be: not a hurt a protector guards against.",
    "under_not_sure": "Unknown.",
}

# --------------------------------------------------------------------------------------------------
# Copy: PartPrompt (the app's questions and statements) and PartOption (chips the person taps).
# Prompts: (id, flow, step, copy). Order within a flow is list order.
# flows: meet (Meet a part), pulls (Two pulls), offer (trail offer), tag (the tag row after a better
# close), unblend (the in-the-moment line), angry (the angry-part card), aftercare, checkback (the
# next-day check-back card), dearman (DEAR MAN's cope ahead), gate, settings, me (Parts of me), ps (Problem Solve's ambivalence line), common (shared), reflect,
# review (rule D's batch in Reflect), den (the den: Me → Parts of me → See them together), story (a part's
# story: on its card in Parts of me, and from a figure in the den)
# --------------------------------------------------------------------------------------------------
PROMPTS = [
    # Meet a part, in order (parts.md "Meet a part")
    # A visit to a kept part that is paused (its next-day check-back said Louder): one line on the first
    # real screen. Nothing locks; the close doesn't offer the check-back for that visit.
    ("paused_heads_up", "meet", "entry", "Things got louder after last time. Going gently is fine, or come back another day."),
    ("meet_find", "meet", "find", "What's showing up?"),
    ("meet_where", "meet", "where", "Where do you notice it?"),
    ("meet_shape", "meet", "shape", "Which is closer to it?"),
    ("meet_age", "meet", "age", "How old does it seem?"),
    ("meet_age_young", "meet", "age_young", "It sounds young. Want to keep it gentle?"),
    ("meet_voice", "meet", "voice", "Does it say anything?"),
    ("meet_feel", "meet", "feel", "How do you feel toward it right now?"),
    ("meet_unblend", "meet", "unblend", "That reaction might be another part. Can it give you some room, for now?"),
    ("meet_unblend_end", "meet", "unblend_end", "That's enough for today. The part that's worried about it counts too."),
    ("meet_unblend_later", "meet", "unblend_later", "Want to get to know that one another time?"),
    ("meet_nothing", "meet", "nothing", "Sometimes there's nothing there yet. That's fine."),
    ("meet_job", "meet", "job", "What's it trying to do for you?"),
    ("meet_likes", "meet", "likes", "Does it like this job?"),
    ("meet_guards", "meet", "guards", "What do you think it's protecting?"),
    # 5d, optional (skipped, not the flow, until signed off): asked only when the person keeps another
    # active or resting part; its chips are their parts by name, then the two below.
    ("meet_front", "meet", "front", "Does it stand in front of another part you know?"),
    ("meet_fear", "meet", "fear", "What's it afraid would happen if it stopped?"),
    ("meet_stop_title", "meet", "stop", "It's guarding something tender."),
    ("meet_stop_body", "meet", "stop", "We'll leave that be. You found the guard, and that counts."),
    ("meet_stop_therapist", "meet", "stop", "If you see a therapist, this is a good thing to bring."),
    ("meet_update", "meet", "update", "Does it know how old you are now?"),
    ("meet_update_show", "meet", "update_show", "Show it something you can do now."),
    ("meet_thank", "meet", "thank", "Thank it for trying to protect you."),
    ("meet_thank_hold", "meet", "thank", "Press and hold"),
    ("meet_thank_done", "meet", "thank", "Thanked"),
    ("meet_rather", "meet", "rather", "If it didn't have to do this, what would it rather do?"),
    ("meet_name", "meet", "name", "Want to give it a name?"),
    ("meet_keep", "meet", "keep", "Keep it, so you can come back to it?"),
    ("meet_tender", "meet", "tender", "Can you let it know you're here?"),
    ("meet_tender_sub", "meet", "tender", "You don't need to do anything else."),
    # The last screen, whether or not the close question was answered
    ("meet_done", "meet", "close", "You can come back to this any time."),
    # Two pulls (parts.md "Two pulls")
    ("pulls_place", "pulls", "place", "Put your light wherever feels right."),
    ("pulls_feel", "pulls", "feel", "How do you feel toward each of them?"),
    ("pulls_needs_time", "pulls", "needs_time", "One of them needs its own time first."),
    ("pulls_step_back", "pulls", "step_back", "Hold a breath, and step back from both of them."),
    ("pulls_worry", "pulls", "worry", "If {B} gets its way, what's {A} afraid of?"),
    ("pulls_both_want", "pulls", "both_want", "What do they both want for you?"),
    # The trail offer (parts.md "The offer card")
    ("offer_eyebrow", "offer", "card", "Something keeps showing up"),
    ("offer_ask", "offer", "card", "Want to take a look?"),
    ("offer_evidence", "offer", "evidence", "What the app saw"),
    ("offer_question", "offer", "evidence", "Does this feel like a part of you?"),
    ("offer_split", "offer", "split", "Which of these feels like its own thing?"),
    # The tag row after a better close
    ("tag_question", "tag", "tag", "Was this a part you know?"),
    ("tag_new_later", "tag", "new", "Want to come back to it later?"),
    # Find the feeling only (parts.md, its over-weeks column): right after a part chip is tapped, when the
    # visit made a shape (Shape it), "Use this shape for {name}?"; _noname for an unnamed chip. Yes gives
    # the part that shape (setPartShape, read from the visit's own record); the done line shows in place
    # for a moment, then the row folds away. No thanks folds it as now.
    ("tag_use_shape", "tag", "shape", "Use this shape for {name}?"),
    ("tag_use_shape_noname", "tag", "shape", "Use this shape for that part?"),
    ("tag_shape_done", "tag", "shape", "Done."),
    # A kept part with no name, wherever parts are listed (the tag row's chips; the part card may reuse
    # them). {place}: the part's first body place, its label from src/data/bodyFigure.ts in lower case.
    ("part_unnamed_place", "common", "name", "The one in your {place}"),
    ("part_unnamed", "common", "name", "One you haven't named"),
    # The integration readout (parts.md "The part card", Reflect): one set of lines for Me's card and
    # Reflect, computed in functions/src/parts/stats.ts, each shown only past its threshold. {tool}: the
    # app's tool name (src/data/tools.ts); {n}: a count of tags (only better closes are tagged, so a
    # count, never "3 of 4"); {then} / {now}: meet/feel option labels; {month}: a locale month name;
    # {when}: a when_* option label.
    ("stats_helped", "common", "stats", "What's helped it settle"),
    ("stats_helped_line", "common", "stats", "{tool} helped {n} times"),
    ("stats_helped_once", "common", "stats", "{tool} helped once"),
    ("stats_felt", "common", "stats", "How you've felt toward it"),
    ("stats_felt_then_now", "common", "stats", "In {month}: {then}. Lately: {now}."),
    ("stats_felt_since", "common", "stats", "Since {month}: {now}."),
    ("stats_when", "common", "stats", "Mostly {when}"),
    # Steps that helped (Me's card and Reflect, after "What's helped it settle"): the steps chosen in the
    # Do the Opposite and Recover sessions tagged with the part, most used first, ≤ 3, joined with " · ".
    # {steps}: each step's graph label (an ActionUrge or default opposite step, a RecoveryExit title),
    # alone when chosen once, else in stats_step_twice / stats_step_times; {n}: 3 or more.
    ("stats_steps", "common", "stats", "Steps that helped: {steps}"),
    ("stats_step_twice", "common", "stats", "{step} (twice)"),
    ("stats_step_times", "common", "stats", "{step} ({n} times)"),
    # Reflect, above the parts' blocks: how the person has met their parts lately, across all of them
    # (each visit's first feel-toward answer, the last 30 days against the 30 before). {feel}: a meet/feel
    # chip label, lower-case. The earlier line only when it has changed. Optional: the section shows without.
    ("stats_feel_lately", "common", "stats", "Lately, meeting your parts, you've mostly been {feel}."),
    ("stats_feel_earlier", "common", "stats", "Earlier, more often {feel}."),
    # Every press-and-hold (Meet a part's thank and tender holds, the angry card's vote): what a screen
    # reader says with the hold's own label (aria-describedby). A quick key press, a switch or a screen
    # reader's activation fills it hands-free (LightHold's HoldButton), so "press once" is true for them.
    ("hold_hint", "common", "hold", "Hold to fill it, or press once and wait."),
    # Reflect: the parts section's title (after Reflect's own sections; parts on only)
    ("reflect_title", "reflect", "parts", "The parts you know"),
    # Reflect: trails answered "It's how things go", kept as plain statements (no parts language) under
    # this heading until the person removes one (patterns_remove, the ×'s label).
    ("patterns_title", "reflect", "patterns", "How things tend to go"),
    # Reflect: rule D's batch ("Was this {name}?", TrailRule trail_known_part's statementTemplate), one
    # block per part with a row per moment. The part with no name: its chip label heads the block
    # (part_unnamed_place / part_unnamed), and this is the question.
    ("review_noname", "review", "question", "Was this that part?"),
    # In the moment: only after a move the person picked themselves, parts on, never named
    ("unblend_line", "unblend", "line", "A part of you {move} right now."),
    # The angry-part card (alexithymia-first-interaction.md, "Anger: the angry part"): the fire back urge,
    # out of the flooded band. Every line has two wordings: X with parts on, X_plain with parts off (plain
    # distanced self-talk, never the word "part": build check). _noname when there is no first name;
    # _unsure after "Not sure" at protects. {matters} and {felt} come from the hurt picked (HURTS).
    # The named vote lines fit the voice lint's 90 characters at slot widths (the agreed "{name}, this part
    # is angry because {matters} matters to you." is 97): parts on says "it" (the part from screens 1-2)
    # and keeps "to you", the point of a vote of confidence; plain drops "to you" ("you're" carries it).
    ("angry_unblend", "angry", "unblend", "A part of you is furious right now."),
    ("angry_unblend_plain", "angry", "unblend", "The anger is loud right now, and you're here too."),
    ("angry_unblend_sub", "angry", "unblend", "Let it stand a little apart from you for a moment."),
    ("angry_unblend_sub_plain", "angry", "unblend", "Let it stand a little apart from you for a moment."),
    ("angry_protects", "angry", "protects", "It's trying to protect something. What?"),
    ("angry_protects_plain", "angry", "protects", "Anger usually protects something. What is it protecting?"),
    ("angry_vote", "angry", "vote", "{name}, it's angry because {matters} matters to you."),
    ("angry_vote_plain", "angry", "vote", "{name}, you're angry because {matters} matters."),
    ("angry_vote_noname", "angry", "vote", "This part is angry because {matters} matters to you."),
    ("angry_vote_noname_plain", "angry", "vote", "You're angry because {matters} matters to you."),
    ("angry_vote_unsure", "angry", "vote", "{name}, this part is angry because something here matters to you."),
    ("angry_vote_unsure_plain", "angry", "vote", "{name}, you're angry because something here matters to you."),
    ("angry_vote_unsure_noname", "angry", "vote", "This part is angry because something here matters to you."),
    ("angry_vote_unsure_noname_plain", "angry", "vote", "You're angry because something here matters to you."),
    ("angry_vote_2", "angry", "vote", "You don't have to let it drive, and you don't have to leave it behind."),
    ("angry_vote_2_plain", "angry", "vote", "You don't have to let it drive, or pretend it isn't there."),
    ("angry_vote_3", "angry", "vote", "{name} can handle what comes next."),
    ("angry_vote_3_plain", "angry", "vote", "{name} can handle what comes next."),
    ("angry_vote_3_noname", "angry", "vote", "You can handle what comes next."),
    ("angry_vote_3_noname_plain", "angry", "vote", "You can handle what comes next."),
    ("angry_hold", "angry", "vote", "Hold while you read it"),
    ("angry_hold_plain", "angry", "vote", "Hold while you read it"),
    ("angry_speak", "angry", "speak", "If you say something, speak for it, not from it:"),
    ("angry_speak_plain", "angry", "speak", "If you say something, say what's under the anger:"),
    ("angry_speak_unsure", "angry", "speak", "If you say something, say what you felt, not what it wants to say."),
    ("angry_speak_unsure_plain", "angry", "speak", "If you say something, say what you felt, not what the anger wants to say."),
    ("angry_speak_line", "angry", "speak", "I felt {felt}."),
    ("angry_speak_line_plain", "angry", "speak", "I felt {felt}."),
    # Parts on only (PARTS_ON_ONLY): after "Spend a minute with it later?" (the option angry_later) queued it
    ("angry_later_done", "angry", "speak", "It's in Me when you want it."),
    # Problem Solve's "the part that doesn't want change" (parts.md "Meet a part → Entries"): after the
    # cant-ambivalent barrier's answer, parts on only, the quiet line ps_later (an option: tapping it is the
    # yes) queues a PartCandidate for put_it_off; this line replaces it. Never opens a parts flow mid-tool.
    ("ps_later_done", "ps", "ambivalence", "It's in Me when you want it."),
    # Aftercare
    ("aftercare_louder", "aftercare", "louder", "Things can get louder after time with a part."),
    ("aftercare_too_many", "aftercare", "too_many", "You don't need to get to know everyone at once."),
    # Check back (parts.md Meet a part step 10, "Over weeks"): on the close's yes, a part_checkback
    # follow-up the next day. _noname for a part kept without a name. "Louder" shows aftercare_louder.
    ("checkback_title", "checkback", "checkback", "How's {name} today?"),
    ("checkback_title_noname", "checkback", "checkback", "How's the part you met yesterday?"),
    ("close_checkback", "meet", "close", "Check back with it tomorrow?"),
    # DEAR MAN cope ahead (parts.md, DEAR MAN row and Phase 3): one screen in prep, after "What makes
    # this hard?" and before the script. A part's anchor is the person's own words or a line they kept.
    ("cope_title", "dearman", "cope", "Who might show up in this conversation?"),
    # Brief: "If {name} shows up: {anchor}". With {anchor} at its width (90, the person's own words or a
    # kept line) that is 128 / 113 characters, over the prompt's 90, so the anchor is not a slot: the
    # app draws it on its own line under this one, in the serif, never linted.
    ("cope_anchor", "dearman", "cope", "If {name} shows up:"),
    ("cope_anchor_noname", "dearman", "cope", "If that part shows up:"),
    ("cope_set_anchor", "dearman", "cope", "What would help if {name} shows up?"),
    ("cope_set_anchor_noname", "dearman", "cope", "What would help if that part shows up?"),
    # Under Save when setPartAnchor fails; the form stays as it was (Claudia, 16 Oct).
    ("cope_save_failed", "dearman", "cope", "Couldn't save that. Try again."),
    # DEAR MAN's debrief, after "Underneath that": who showed up. _named when prep's cope ahead chose a part
    # that is still kept and has a name (Yes / A bit / No, and the tag row's Skip); otherwise the general
    # form with the tag row's chips (tag_new_one, tag_skip, tag_new_later, tag_later_yes / _no, reused).
    ("debrief_who", "dearman", "debrief", "Was one of your parts there?"),
    ("debrief_who_named", "dearman", "debrief", "Did {name} show up?"),
    # Do the Opposite's goal line (parts.md, the Do the Opposite row): on the check's effectiveness card,
    # above its question, parts on only, when the picked urge EXPRESSES an offerable move that is not a
    # safety-line move and a goal was picked. {move} is the move's unblendPhrase (the unblend line's, so the
    # pull reads the same and "it" never lacks a referent); {goal} is OA's own goal
    # label, first letter lower-cased (OA's content, never copied here). No {hurt}: nothing in the visit
    # says what this part fears, so the line gives positive intent instead of a guess.
    ("oa_goal_part", "oa", "goal", "A part of you {move}, and it's trying to help."),
    ("oa_goal_you", "oa", "goal", "You want to {goal}."),
    # Entry gates. The P2 hand-off copy is capacity content; these are parts' own.
    ("gate_far_away", "gate", "dissociation", "If you start to feel far away, stop any time. Coming back into the room comes first."),
    # The blending check (Claudia, 16 Oct: the flood signal at a parts flow's entry). It asks how close
    # the person is to a part they have already named (blended or not), so it comes once "it" points at
    # something: right after Find in Meet a part (first, when the flow starts from a named trailhead),
    # and as Two pulls opens, about both. Shown inside parts flows only, never on the check-in. Not the
    # removed probe: it asks about distance from a part, not capacity, and is never stored as a band,
    # carried between flows or read by routing. "Running things" opens the P2 body hand-off, with keep
    # going still there; stored check-in signals still apply on top (server work, later).
    ("gate_blend_check", "gate", "blend", "Right now, can you notice it, or is it running things?"),
    ("gate_blend_check_pulls", "gate", "blend_pulls", "Right now, can you notice them both, or is one of them running things?"),
    # Settings: the opt-in switch (off by default) with the dissociation lines, and the About line
    ("settings_label", "settings", "switch", "Parts"),
    ("settings_blurb", "settings", "switch", "Ways to get to know the parts of you that try to protect you."),
    ("settings_dissociation", "settings", "switch", "If you live with alters or a lot of dissociation, this way of talking may not fit you."),
    ("settings_off", "settings", "switch", "It stays off unless you turn it on, and you can turn it off any time."),
    ("settings_about_1", "settings", "about", "Draws on ideas from Internal Family Systems, developed by Richard Schwartz."),
    ("settings_about_2", "settings", "about", "Not affiliated with or endorsed by the IFS Institute."),
    # Delete my parts (parts.md "Deleting"): its own confirmed step; turning parts off deletes nothing
    ("settings_delete", "settings", "delete", "Delete your parts"),
    ("settings_delete_confirm", "settings", "delete", "This deletes the parts you've kept and what you've said about them. It can't be undone."),
    ("settings_delete_yes", "settings", "delete", "Delete them"),
    ("settings_delete_no", "settings", "delete", "Keep them"),
    ("settings_delete_done", "settings", "delete", "Deleted."),
    ("settings_delete_failed", "settings", "delete", "Couldn't delete them. Try again."),
    # Me → Parts of me (parts.md "The part card"): the entry line and the card's labels. No stats yet.
    ("me_get_to_know", "me", "card", "Get to know a part"),
    ("card_where", "me", "card", "Where"),
    ("card_job", "me", "card", "Its job"),
    ("card_job_own", "me", "card", "Its job, in your words"),
    ("card_fear", "me", "card", "Afraid that"),
    ("card_rather", "me", "card", "Would rather"),
    ("card_visit", "me", "card", "Spend time with it"),
    ("card_resting", "me", "card", "Resting"),
    # The card's actions (lane 2's part writers); "It feels young or hurt" only on a part not marked tender
    ("card_rename", "me", "card", "Rename"),
    ("card_rest", "me", "card", "Rest it"),
    ("card_back", "me", "card", "It's back"),
    ("card_set_aside", "me", "card", "Set aside"),
    ("card_restore", "me", "card", "Bring it back"),
    ("card_tender", "me", "card", "It feels young or hurt"),
    ("card_rename_save", "me", "card", "Save"),
    ("card_cancel", "me", "card", "Cancel"),
    # The 30-day check-back on the card (parts.md "Still true? = checking back with protectors")
    ("revisit_title", "me", "revisit", "Is {name} still doing the same job?"),
    ("revisit_title_noname", "me", "revisit", "Is this part still doing the same job?"),
    ("revisit_resting", "me", "revisit", "{name} has been resting. Still quiet?"),
    ("revisit_resting_noname", "me", "revisit", "This part has been resting. Still quiet?"),
    ("revisit_new_title", "me", "revisit", "What does it do now?"),
    # Parts to come back to (open PartCandidates, after the cards). {move} = the move's unblendPhrase
    ("candidate_title", "me", "candidate", "To come back to"),
    ("candidate_line", "me", "candidate", "The one that {move}"),
    ("candidate_line_plain", "me", "candidate", "One you wanted to come back to"),
    ("candidate_go", "me", "candidate", "Get to know it"),
    ("candidate_dismiss", "me", "candidate", "Not any more"),
    # The den (parts.md "The den"): Me → Parts of me → See them together. The light is the person and is
    # never labelled; threads appear only on a yes. {month} = the snapshot's month in the locale's words.
    ("den_link", "den", "room", "See them together"),
    ("den_room", "den", "room", "Everyone here is in your house."),
    ("den_unnamed", "den", "room", "A part"),
    ("den_move_help", "den", "room", "Tap one, then another, to say how they go together. Drag to move them."),
    ("den_move_keys", "den", "room", "Enter picks one up, the arrow keys move it, Enter puts it down."),
    ("den_one_part", "den", "room", "When you get to know another part, it will be here too."),
    ("den_list", "den", "room", "See them as a list"),
    ("den_pull_against", "den", "thread", "These two pull against each other"),
    ("den_stands_front", "den", "thread", "This one stands in front of that one"),
    ("den_which_front", "den", "thread", "Which one stands in front?"),
    ("den_thread_cancel", "den", "thread", "Not now"),
    ("den_remove", "den", "thread", "Remove this thread"),
    ("den_then", "den", "then", "How it looked in {month}"),
    ("den_now", "den", "then", "Now"),
    # Wise mind's step back (docs/design/wise-mind.md, 2p; parts on, at least one kept part): the room
    # from the den, small, the light in the middle. The light is the person and is never labelled, never
    # called Self. Parts are asked to take a step back so the person can listen, never to leave or stop.
    ("wm_who", "wise_mind", "who", "Who's here about this?"),
    ("wm_who_help", "wise_mind", "who", "Tap a part to bring it near the light."),
    ("wm_room", "wise_mind", "who", "The room, with the light in the middle"),
    ("wm_step_back", "wise_mind", "step_back", "Ask everyone to take one step back."),
    ("wm_hold", "wise_mind", "step_back", "Hold to ask"),
    ("wm_held", "wise_mind", "step_back", "From here, what's the wise next step?"),
    ("wm_tap_one", "wise_mind", "step_back", "Tap a part if it won't step back."),
    ("wm_wont_line", "wise_mind", "wont", "That's fine. It might need its own time."),
    ("wm_later_done", "wise_mind", "wont", "It's in Me for another time."),
    # The quiet way back to the default form, on every step-back screen
    ("wm_use_minds", "wise_mind", "chrome", "Use the two minds instead"),
    # Screen 5 (Is this wise mind?), the parts form's line for *Pushed, urgent* (the default form's
    # "That might be emotion mind talking." is Wise mind's own content)
    ("wm_pushed", "wise_mind", "feel", "A part might still be close."),
    # A part's story (on its card, and from one figure in the den): how it has changed, oldest first, by
    # month. {month} = a month in the locale's words; {old} / {new} = a job as the card shows it (its chip
    # labels, or the person's own words); {name} = another part's name. How they've felt toward it and
    # what's helped reuse the readout's lines (common/stats). Never a fear; a tender part's story has no job.
    ("story_open", "story", "card", "Its story"),
    ("story_spend_time", "story", "card", "Spend time with it"),
    ("story_met", "story", "line", "Met in {month}"),
    ("story_job_then", "story", "line", "Its job then: {old}"),
    ("story_job_now", "story", "line", "Its job now: {new}"),
    ("story_rested", "story", "line", "Rested in {month}"),
    ("story_back", "story", "line", "Back in {month}"),
    ("story_where", "story", "where", "Where it stands"),
    ("story_front", "story", "where", "Stands in front of {name}"),
    ("story_behind", "story", "where", "Stands behind {name}"),
    ("story_pulls", "story", "where", "Pulls against {name}"),
    ("story_other", "story", "where", "another part"),
    ("story_room_then", "story", "where", "In {month}"),
    ("story_room_now", "story", "where", "Now"),
]

# Lines of a two-wordings flow that show with parts on only, so they have no `_plain` twin (the angry
# card's "later" line queues a part to meet: there is nothing to offer with parts off).
PARTS_ON_ONLY = {"angry_later_done"}

# Prompts in the person's own voice: the sentence they might say, so its "I" is theirs. Linted as
# `first_person` (chip rules, no voice_distance) instead of `prompt`; every other prompt is a prompt.
PROMPT_KINDS = {
    "angry_speak_line": "first_person",
    "angry_speak_line_plain": "first_person",
}

# Options. Each: id, flow, step, label, and optionally
#   kind     'chip' (default) or 'voice' (what a part says; looser lint, ≤ 40)
#   moves    move ids this option is offered for (edges OFFERED_FOR {order}); absent = every move
#   flag     'tender' | 'danger' (the fear step's stops)
#   selfLike True | False | None (feel-toward only)
#   branch   what picking it does: continue | tender_offer | tender_path | grounding | unblend |
#            conservative | danger | body_first | candidate | end
#   sameAs   [(Label, id)]: the same answer in another module (edges SAME_AS)
# "In my words" (own words) is one option per step that allows it; own words at the fear step always
# take the conservative branch, and on a safetyLine move own words at voice or job take danger.
def opt(id, flow, step, label, **kw):
    return dict(id=id, flow=flow, step=step, label=label, kind=kw.get("kind", "chip"), moves=kw.get("moves"),
                flag=kw.get("flag"), selfLike=kw.get("selfLike"), branch=kw.get("branch", "continue"),
                sameAs=kw.get("sameAs", []))


OFFERABLE = [m["id"] for m in MOVES if m["offerable"]]
SAFETY_LINE = [m["id"] for m in MOVES if m["safetyLine"]]

OPTIONS = [
    # --- shared, any move ---
    opt("own_words", "meet", "any", "In my words", branch="own_words"),
    # Meet a part's house controls: Back (own words), Next (a typed answer, a place, a name, after P2's
    # come back later, after a hold), and the last screen's Done
    opt("meet_back", "meet", "chrome", "Back"),
    opt("meet_next", "meet", "chrome", "Next"),
    opt("meet_finish", "meet", "chrome", "Done"),
    opt("find_something_else", "meet", "find", "Something else"),
    opt("where_nowhere", "meet", "where", "Nowhere I can find"),
    opt("shape_cant_tell", "meet", "shape", "Can't tell"),
    opt("age_school", "meet", "age", "school age"),
    opt("age_teen", "meet", "age", "teenage"),
    opt("age_now", "meet", "age", "about my age"),
    opt("age_older", "meet", "age", "older"),
    opt("age_cant_tell", "meet", "age", "can't tell"),
    opt("age_little", "meet", "age", "little", branch="tender_offer"),
    opt("young_gentle", "meet", "age_young", "Yes, keep it gentle", branch="tender_path"),
    opt("young_go_on", "meet", "age_young", "Keep going as we were"),
    opt("voice_nothing", "meet", "voice", "Nothing"),
    opt("feel_curious", "meet", "feel", "curious", selfLike=True),
    opt("feel_steady", "meet", "feel", "steady", selfLike=True),
    opt("feel_warm", "meet", "feel", "warm toward it", selfLike=True),
    opt("feel_open", "meet", "feel", "open", selfLike=True),
    opt("feel_annoyed", "meet", "feel", "annoyed", selfLike=False, branch="unblend"),
    opt("feel_scared", "meet", "feel", "scared of it", selfLike=False, branch="unblend"),
    opt("feel_gone", "meet", "feel", "want it gone", selfLike=False, branch="unblend"),
    opt("feel_ashamed", "meet", "feel", "ashamed of it", selfLike=False, branch="unblend"),
    opt("feel_tired", "meet", "feel", "tired of it", selfLike=False, branch="unblend"),
    opt("feel_not_sure", "meet", "feel", "not sure"),
    opt("feel_nothing", "meet", "feel", "nothing", branch="grounding"),
    opt("unblend_eased", "meet", "unblend", "It eased off"),
    opt("unblend_still", "meet", "unblend", "It's still here", branch="unblend"),
    opt("unblend_not_sure", "meet", "unblend", "Not sure"),
    opt("later_yes", "meet", "unblend_later", "Yes, another time", branch="candidate"),
    opt("later_no", "meet", "unblend_later", "No", branch="end"),
    opt("nothing_look", "meet", "nothing", "Look around the room", branch="grounding"),
    opt("nothing_body", "meet", "nothing", "Something for my body", branch="body_first"),
    opt("nothing_finish", "meet", "nothing", "Finish here", branch="end"),
    opt("likes_tired", "meet", "likes", "It's tired"),
    opt("likes_proud", "meet", "likes", "It's proud of it"),
    opt("likes_not_sure", "meet", "likes", "Not sure"),
    opt("guards_not_sure", "meet", "guards", "Not sure"),
    opt("front_none", "meet", "front", "No one I know"),
    opt("front_not_sure", "meet", "front", "Not sure"),
    opt("stop_thank", "meet", "stop", "Thank it"),
    opt("stop_body", "meet", "stop", "Something for my body first", branch="body_first"),
    opt("update_yes", "meet", "update", "Yes"),
    opt("update_no", "meet", "update", "It doesn't seem to"),
    opt("update_not_sure", "meet", "update", "Not sure"),
    opt("now_leave", "meet", "update_show", "I can leave a room"),
    opt("now_ask", "meet", "update_show", "I can ask for help"),
    opt("now_people", "meet", "update_show", "I have people now"),
    opt("now_no", "meet", "update_show", "I can say no"),
    opt("rather_not_sure", "meet", "rather", "Not sure yet"),
    opt("name_not_yet", "meet", "name", "Not yet"),
    opt("keep_yes", "meet", "keep", "Yes, keep it", branch="keep"),
    opt("keep_not_now", "meet", "keep", "Not now", branch="end"),

    # --- voice: what it says (per move) ---
    opt("hide_voice_see", "meet", "voice", "Don't let them see", kind="voice", moves=["hide"]),
    opt("hide_voice_leave_first", "meet", "voice", "Get out before they leave", kind="voice", moves=["hide"]),
    opt("hide_voice_safer_alone", "meet", "voice", "It's safer alone", kind="voice", moves=["hide"]),
    opt("chase_voice_fix_now", "meet", "voice", "Fix it now", kind="voice", moves=["chase"]),
    opt("chase_voice_not_angry", "meet", "voice", "Make sure they're not angry", kind="voice", moves=["chase"]),
    opt("chase_voice_dont_let_go", "meet", "voice", "Don't let them go", kind="voice", moves=["chase"]),
    opt("hit_back_voice_cant_talk", "meet", "voice", "They can't talk to you like that", kind="voice", moves=["hit_back"]),
    opt("hit_back_voice_slide", "meet", "voice", "Don't let it slide", kind="voice", moves=["hit_back"]),
    opt("peace_voice_agree", "meet", "voice", "Just agree", kind="voice", moves=["keep_the_peace"]),
    opt("peace_voice_not_a_thing", "meet", "voice", "Don't make it a thing", kind="voice", moves=["keep_the_peace"]),
    opt("peace_voice_not_worth", "meet", "voice", "This isn't worth the fight", kind="voice", moves=["keep_the_peace"],
        sameAs=[("ThoughtPattern", "thought_not_worth")]),
    opt("turn_voice_always", "meet", "voice", "You always do this", kind="voice", moves=["turn_on_myself"]),
    opt("turn_voice_my_fault", "meet", "voice", "This is probably my fault", kind="voice", moves=["turn_on_myself"],
        sameAs=[("ThoughtPattern", "thought_my_fault")]),
    opt("turn_voice_too_much", "meet", "voice", "I'm being too much", kind="voice", moves=["turn_on_myself"],
        sameAs=[("ThoughtPattern", "thought_too_much")]),
    opt("small_voice_dont_ask", "meet", "voice", "Don't ask", kind="voice", moves=["take_less_room"]),
    opt("small_voice_dont_deserve", "meet", "voice", "I don't deserve to ask", kind="voice", moves=["take_less_room"],
        sameAs=[("ThoughtPattern", "thought_dont_deserve")]),
    opt("watch_voice_wrong", "meet", "voice", "What if I'm wrong?", kind="voice", moves=["keep_watch"],
        sameAs=[("ThoughtPattern", "thought_wrong")]),
    opt("watch_voice_leave", "meet", "voice", "They're going to leave", kind="voice", moves=["keep_watch"],
        sameAs=[("ThoughtPattern", "thought_will_leave")]),
    opt("watch_voice_off", "meet", "voice", "Something's off", kind="voice", moves=["keep_watch"]),
    opt("off_voice_later", "meet", "voice", "Later", kind="voice", moves=["put_it_off"]),
    opt("off_voice_not_today", "meet", "voice", "Not today", kind="voice", moves=["put_it_off"]),

    # --- job: what it's trying to do for you ---
    opt("hide_job_out_of_sight", "meet", "job", "Keep me out of sight", moves=["hide"]),
    opt("hide_job_pushed_out", "meet", "job", "Keep me from being pushed out", moves=["hide"]),
    opt("hide_job_worse", "meet", "job", "Keep me from making it worse", moves=["hide"]),
    opt("chase_job_dont_leave", "meet", "job", "Make sure they don't leave", moves=["chase"]),
    opt("chase_job_answer", "meet", "job", "Get an answer so I can breathe", moves=["chase"]),
    opt("hit_back_job_seriously", "meet", "job", "Make sure I'm taken seriously", moves=["hit_back"]),
    opt("hit_back_job_stop_them", "meet", "job", "Stop them before it gets worse", moves=["hit_back"]),
    opt("peace_job_calm", "meet", "job", "Keep everyone calm", moves=["keep_the_peace"]),
    opt("peace_job_nobody_angry", "meet", "job", "Make sure nobody gets angry", moves=["keep_the_peace"]),
    opt("turn_job_not_again", "meet", "job", "Stop me from doing that again", moves=["turn_on_myself"]),
    opt("turn_job_get_there_first", "meet", "job", "Get there before anyone else does", moves=["turn_on_myself"]),
    opt("small_job_too_much", "meet", "job", "Keep me from being too much", moves=["take_less_room"]),
    opt("small_job_bother", "meet", "job", "Keep me from being a bother", moves=["take_less_room"]),
    opt("watch_job_trouble", "meet", "job", "See trouble coming", moves=["keep_watch"]),
    opt("watch_job_surprise", "meet", "job", "Make sure nothing surprises me", moves=["keep_watch"]),
    opt("off_job_failing", "meet", "job", "Keep me from failing at it", moves=["put_it_off"]),
    opt("off_job_hard_talk", "meet", "job", "Keep me from a hard conversation", moves=["put_it_off"]),

    # --- fear: what it's afraid would happen if it stopped ---
    opt("fear_old_hurt", "meet", "fear", "I'd feel the old hurt", flag="tender", branch="conservative",
        moves=["hide", "chase", "keep_the_peace", "take_less_room", "keep_watch"]),
    opt("fear_cant_handle", "meet", "fear", "Something would come up I can't handle", flag="tender", branch="conservative",
        moves=["hide"]),
    opt("hide_fear_too_much", "meet", "fear", "I'd be too much and they'd leave", moves=["hide"]),
    opt("hide_fear_regret", "meet", "fear", "I'd say something I regret", moves=["hide"]),
    opt("chase_fear_not_know", "meet", "fear", "I'd be left and not know why", moves=["chase"]),
    opt("chase_fear_waiting", "meet", "fear", "The waiting would be unbearable", moves=["chase"]),
    opt("hit_back_fear_walk_over", "meet", "fear", "They'd walk all over me", moves=["hit_back"]),
    opt("hit_back_fear_stop_mattering", "meet", "fear", "I'd stop mattering", moves=["hit_back"]),
    opt("hit_back_fear_take_back", "meet", "fear", "I'd do something I can't take back", flag="danger", branch="danger",
        moves=["hit_back"]),
    opt("peace_fear_angry", "meet", "fear", "They'd get angry and I couldn't handle it", moves=["keep_the_peace"]),
    opt("peace_fear_lose_them", "meet", "fear", "I'd lose them", moves=["keep_the_peace"]),
    opt("peace_fear_fight", "meet", "fear", "It would turn into a fight", moves=["keep_the_peace"]),
    opt("turn_fear_hurt_people", "meet", "fear", "I'd turn into someone who hurts people", moves=["turn_on_myself"]),
    opt("turn_fear_careless", "meet", "fear", "I'd get careless and lose everyone", moves=["turn_on_myself"]),
    opt("turn_fear_hurt_myself", "meet", "fear", "I'd end up hurting myself", flag="danger", branch="danger",
        moves=["turn_on_myself"]),
    opt("small_fear_burden", "meet", "fear", "I'd be a burden", moves=["take_less_room"]),
    opt("small_fear_annoyed", "meet", "fear", "They'd be annoyed with me", moves=["take_less_room"]),
    opt("watch_fear_off_guard", "meet", "fear", "I'd be caught off guard", moves=["keep_watch"]),
    opt("watch_fear_miss_it", "meet", "fear", "Something bad would happen and I'd miss it", moves=["keep_watch"]),
    opt("off_fear_cant_do_it", "meet", "fear", "I'd find out I can't do it", moves=["put_it_off"]),
    opt("off_fear_hard_talk", "meet", "fear", "I'd have to have a hard conversation", moves=["put_it_off"],
        sameAs=[("AmbivalenceOption", "ambiv-hard-conversation")]),
    opt("off_fear_might_not_help", "meet", "fear", "It might not help after all", moves=["put_it_off"],
        sameAs=[("AmbivalenceOption", "ambiv-change-might-not-help")]),
    opt("off_fear_lose_something", "meet", "fear", "I'd lose something I still value", moves=["put_it_off"],
        sameAs=[("AmbivalenceOption", "ambiv-losing-something")]),
    opt("off_fear_need_help", "meet", "fear", "I'd have to admit I need help", moves=["put_it_off"],
        sameAs=[("AmbivalenceOption", "ambiv-admitting-need-help")]),

    # --- rather: if it didn't have to do this ---
    opt("hide_rather_need_someone", "meet", "rather", "Let me know when I need someone", moves=["hide"]),
    opt("hide_rather_break", "meet", "rather", "Help me take a break, then come back", moves=["hide"]),
    opt("chase_rather_ask", "meet", "rather", "Tell me when I need reassurance, so I can ask", moves=["chase"]),
    opt("chase_rather_wait", "meet", "rather", "Help me wait a little", moves=["chase"]),
    opt("hit_back_rather_matters", "meet", "rather", "Tell me when something matters", moves=["hit_back"]),
    opt("hit_back_rather_stand_up", "meet", "rather", "Help me stand up for myself, steady and out loud", moves=["hit_back"]),
    opt("peace_rather_notice", "meet", "rather", "Help me notice when I'm agreeing too fast", moves=["keep_the_peace"]),
    opt("peace_rather_say_no", "meet", "rather", "Help me say no kindly", moves=["keep_the_peace"]),
    opt("turn_rather_kindly", "meet", "rather", "Point out what I want to do differently, kindly", moves=["turn_on_myself"]),
    opt("small_rather_small_things", "meet", "rather", "Help me ask for small things first", moves=["take_less_room"]),
    opt("small_rather_allowed", "meet", "rather", "Remind me I'm allowed to want things", moves=["take_less_room"]),
    opt("watch_rather_rest", "meet", "rather", "Keep watch, then let me rest", moves=["keep_watch"]),
    opt("watch_rather_safe", "meet", "rather", "Tell me when it's safe to stop", moves=["keep_watch"]),
    opt("off_rather_start_small", "meet", "rather", "Help me start small", moves=["put_it_off"]),
    opt("off_rather_ready", "meet", "rather", "Tell me when I'm ready", moves=["put_it_off"]),

    # --- Two pulls ---
    opt("pulls_keep", "pulls", "keepsake", "Keep this", branch="keep"),
    opt("pulls_not_now", "pulls", "keepsake", "Not now", branch="end"),
    opt("pulls_another_time", "pulls", "needs_time", "Meet it another time", branch="candidate"),
    # Wise mind's step back. wm_unmet is a figure of its own in the room (its later tap queues a
    # PartCandidate, origin wise_mind); wm_no_one goes on with nobody placed and no step back.
    opt("wm_unmet", "wise_mind", "who", "A part I haven't met"),
    opt("wm_no_one", "wise_mind", "who", "No one in particular", branch="end"),
    opt("wm_wont", "wise_mind", "wont", "It won't step back"),
    opt("wm_meet_later", "wise_mind", "wont", "Meet it another time", branch="candidate"),
    opt("wm_next", "wise_mind", "chrome", "Next"),

    # --- The trail offer ---
    opt("offer_show", "offer", "card", "Show me"),
    opt("offer_not_now", "offer", "card", "Not now", branch="end"),
    opt("offer_no", "offer", "card", "No", branch="end"),
    opt("offer_yes_part", "offer", "evidence", "Yes, a part of me", branch="meet"),
    opt("offer_more_than_one", "offer", "evidence", "More than one", branch="split"),
    opt("offer_how_it_goes", "offer", "evidence", "It's how things go", branch="end"),
    opt("offer_not_me", "offer", "evidence", "Not me", branch="end"),
    # The split ("Which of these feels like its own thing?"): the offer's moves as chips, then this to keep them.
    opt("offer_split_keep", "offer", "split", "Keep these", branch="candidate"),

    # --- Reflect: rule D's batch. Per row (a moment): Yes tags it to the part, No never asks it again for
    # that part, Not sure does nothing. Per block: Done / Not now, either way the part rests for the rule's
    # cooldownDays before it's asked about again. ---
    opt("review_yes", "review", "row", "Yes"),
    opt("review_no", "review", "row", "No"),
    opt("review_not_sure", "review", "row", "Not sure"),
    opt("review_done", "review", "block", "Done", branch="end"),
    opt("review_not_now", "review", "block", "Not now", branch="end"),
    # --- Reflect: a plain pattern's × (its accessible label) ---
    opt("patterns_remove", "reflect", "patterns", "Remove", branch="end"),

    # --- The tag row ---
    opt("tag_new_one", "tag", "tag", "A new one", branch="new"),
    opt("tag_skip", "tag", "tag", "Skip", branch="end"),
    opt("tag_later_yes", "tag", "new", "Yes", branch="candidate"),
    opt("tag_later_no", "tag", "new", "No thanks", branch="end"),
    opt("tag_shape_yes", "tag", "shape", "Yes", branch="keep"),
    opt("tag_shape_no", "tag", "shape", "No thanks", branch="end"),
    # Problem Solve's ambivalence screen (cant-ambivalent only, parts on): the one quiet text button
    opt("ps_later", "ps", "ambivalence", "Want to get to know that part another time?", branch="candidate"),
    # {when} in stats_when: the band most tags fall in, in the person's time zone (05-12, 12-17, 17-22, 22-05)
    opt("when_mornings", "common", "stats", "mornings"),
    opt("when_afternoons", "common", "stats", "afternoons"),
    opt("when_evenings", "common", "stats", "evenings"),
    opt("when_nights", "common", "stats", "at night"),

    # --- The angry-part card (the hurt chips at protects are the ProtectedHurt labels, not options) ---
    opt("angry_next", "angry", "unblend", "Okay"),
    # The card is offered, never imposed: its own way past, in both wordings (the host shows it on screen 1)
    opt("angry_not_now", "angry", "unblend", "Not now", branch="end"),
    opt("angry_not_now_plain", "angry", "unblend", "Not now", branch="end"),
    opt("angry_not_sure", "angry", "protects", "Not sure"),
    opt("angry_done", "angry", "speak", "Done", branch="end"),
    # Back on screens 2-4, and the quiet way past the hold once it was tried (a different control from
    # angry_next's "Okay" on screen 1)
    opt("angry_back", "angry", "chrome", "Back"),
    opt("angry_vote_next", "angry", "vote", "Next"),
    # Parts on only: tapping it is the yes, and queues a PartCandidate (origin angry_card); never opens a flow
    opt("angry_later", "angry", "speak", "Spend a minute with it later?", branch="candidate"),

    # --- Aftercare ---
    opt("louder_body", "aftercare", "louder", "Something for my body", branch="body_first"),
    opt("louder_not_now", "aftercare", "louder", "Not now", branch="end"),

    # --- Check back (the next-day card; Louder → aftercare_louder) and the close question that schedules it ---
    opt("checkback_settled", "checkback", "checkback", "Settled", branch="end"),
    opt("checkback_same", "checkback", "checkback", "Same", branch="end"),
    opt("checkback_louder", "checkback", "checkback", "Louder", branch="aftercare"),
    opt("checkback_skip", "checkback", "checkback", "Skip", branch="end"),
    opt("close_checkback_yes", "meet", "close", "Yes", branch="checkback"),
    opt("close_checkback_no", "meet", "close", "No thanks", branch="end"),

    # --- DEAR MAN cope ahead (one pick; Not sure / Skip go on and write nothing) ---
    opt("cope_not_sure", "dearman", "cope", "Not sure"),
    opt("cope_skip", "dearman", "cope", "Skip"),
    opt("cope_own", "dearman", "cope", "In my words", branch="own_words"),
    opt("cope_change", "dearman", "cope", "Change it"),
    opt("cope_save", "dearman", "cope", "Save"),
    # "Did {name} show up?": Yes and A bit write a debrief PartTag (strength), No writes nothing
    opt("debrief_yes", "dearman", "debrief", "Yes"),
    opt("debrief_a_bit", "dearman", "debrief", "A bit"),
    opt("debrief_no", "dearman", "debrief", "No", branch="end"),

    # --- Gates ---
    opt("far_away_look", "gate", "dissociation", "Look around the room first", branch="grounding"),
    opt("far_away_go_on", "gate", "dissociation", "Go on"),
    # The blending check (decided 16 Oct; see PROMPTS gate_blend_check). Only "running things" changes
    # the flow (body first); "Not sure" is a complete answer and goes on like "I can notice it".
    opt("blend_notice", "gate", "blend", "I can notice it"),
    opt("blend_running", "gate", "blend", "It's running things", branch="body_first"),
    opt("blend_not_sure", "gate", "blend", "Not sure"),
    # Two pulls asks it about both parts at once (one question, not one per side).
    opt("blend_pulls_notice", "gate", "blend_pulls", "I can notice them"),
    opt("blend_pulls_running", "gate", "blend_pulls", "One of them is running things", branch="body_first"),
    opt("blend_pulls_not_sure", "gate", "blend_pulls", "Not sure"),

    # --- Me: the 30-day check-back on a part's card (answers map to answerPartRevisit) ---
    opt("revisit_same", "me", "revisit", "Yes"),
    opt("revisit_less", "me", "revisit", "Less than before"),
    opt("revisit_new", "me", "revisit", "It's doing something new"),
    opt("revisit_resting_opt", "me", "revisit", "It's resting"),
    opt("revisit_still_quiet", "me", "revisit", "Still quiet"),
    opt("revisit_back", "me", "revisit", "It's back"),
]

# Prompt and option ids waiting on a decision, not on review: build.py marks them pending. Empty since
# the blending check was decided (16 Oct); id → what it waits on.
PENDING = {}

# --------------------------------------------------------------------------------------------------
# Two pulls: PolarityPair. Offerable moves only (build check). Equal size, equal time: each side's
# worries are what THAT side fears if the OTHER gets its way. Chips are PartOption nodes the pair
# points at: (:PolarityPair)-[:BOTH_WANT {order}]->(:PartOption), -[:WORRY {side, order}]->.
# bothWant fills {want} in the keepsake (≤ 20).
# --------------------------------------------------------------------------------------------------
PAIRS = [
    dict(id="chase_hide", a="chase", b="hide",
         bothWant=[("want_not_left", "not to be left"), ("want_safe_in_it", "to stay safe in it"),
                   ("want_matter_someone", "to matter to someone")],
         worryA=[("chase_worry_drift", "They'd drift away and I'd lose them"),
                 ("chase_worry_nobody_knows", "Nobody would know I need them")],
         worryB=[("hide_worry_too_much", "I'd be too much and they'd leave"),
                 ("hide_worry_hurt_worse", "I'd get hurt worse")]),
    dict(id="hit_back_keep_the_peace", a="hit_back", b="keep_the_peace",
         bothWant=[("want_safe", "to be safe"), ("want_treated_well", "to be treated well"),
                   ("want_keep_what_matters", "to keep what matters")],
         worryA=[("hit_back_worry_walked_over", "I'd get walked over"),
                 ("hit_back_worry_never_change", "Nothing would ever change")],
         worryB=[("peace_worry_blow_up", "It would blow up"),
                 ("peace_worry_lose_them", "I'd lose them")]),
    dict(id="take_less_room_hit_back", a="take_less_room", b="hit_back",
         bothWant=[("want_matter", "to matter"), ("want_safe", "to be safe")],
         worryA=[("small_worry_too_much", "I'd be too much"),
                 ("small_worry_turn_on_me", "They'd turn on me")],
         worryB=[("hit_back_worry_stop_mattering", "I'd stop mattering"),
                 ("hit_back_worry_keep_doing_it", "They'd keep doing it")]),
]

# The keepsake (square paper, the only shadow). Kept in My words only on "Keep this".
KEEPSAKE = [
    ("keepsake_both_want", "{A} and {B} both want me {want}."),
    ("keepsake_choose", "I can hear both of them, and choose what I do next."),
]

# --------------------------------------------------------------------------------------------------
# Trails: TrailRule (its own label; the PatternRule evaluator hardcodes what_helps). All off.
# Thresholds are a starting guess (parts.md "Rules"); Claudia sets the real counts on real data.
# statementTemplate is a prompt: {context} {pull} {pull2} {name}.
# --------------------------------------------------------------------------------------------------
TRAIL_RULES = [
    dict(id="trail_move_in_context", shape="A", minEpisodes=4, windowDays=42, minSpanDays=14, minTools=2,
         contextShare=0.6, cooldownDays=28, enabled=False,
         statementTemplate="When {context}, the pull is to {pull}."),
    dict(id="trail_sequence", shape="B", minEpisodes=3, windowDays=42, withinHours=24, lift=2.0,
         cooldownDays=28, enabled=False,
         statementTemplate="After the pull to {pull}, the pull to {pull2} often comes next."),
    dict(id="trail_two_pulls", shape="C", minEpisodes=3, windowDays=42, cooldownDays=28, enabled=False,
         statementTemplate="When {context}, two pulls: to {pull} and to {pull2}."),
    dict(id="trail_known_part", shape="D", minEpisodes=3, cooldownDays=14, enabled=False,
         statementTemplate="Was this {name}?"),
]

# What fills {context}: TrailContext {id, key, value, phrase}. Only contexts the app already stores
# (parts.md "Episodes"). `person` waits for My people; free text never.
CONTEXTS = [
    ("ctx_trigger_someone", "trigger", "someone", "it's about someone"),
    ("ctx_trigger_situation", "trigger", "situation", "it's about a situation"),
    ("ctx_trigger_body", "trigger", "body", "it starts in your body"),
    ("ctx_event_brushed", "event", "brushed", "someone brushes you off"),
    ("ctx_event_unheard", "event", "unheard", "you're not heard"),
    ("ctx_event_mocked", "event", "mocked", "someone mocks you"),
    ("ctx_event_small", "event", "small", "you're made small"),
    ("ctx_event_ignored", "event", "ignored", "you're left out"),
    ("ctx_event_leaving", "event", "leaving", "someone pulls away"),
    ("ctx_event_blocked", "event", "blocked", "you keep getting blocked"),
    ("ctx_event_stewing", "event", "stewing", "it keeps happening"),
    ("ctx_time_morning", "timeBand", "morning", "it's morning"),
    ("ctx_time_afternoon", "timeBand", "afternoon", "it's afternoon"),
    ("ctx_time_evening", "timeBand", "evening", "it's evening"),
    ("ctx_time_night", "timeBand", "night", "it's late at night"),
]

# --------------------------------------------------------------------------------------------------
# PartsPolicy {id: 'parts'}: the kill switch and the safety numbers, in one tunable place.
# offersEnabled turns off trail offers only, never anyone's parts.
# --------------------------------------------------------------------------------------------------
POLICY = dict(
    id="parts",
    offersEnabled=False,
    episodeMergeHours=2,        # records this close are one moment (a hand-off is not two pieces of evidence)
    floodGateHours=2,           # a flooding / crisis check-in this recent opens a parts flow on the P2 hand-off
    crisisPauseHours=48,        # no offer within this long of a crisis flag
    dissociationCount=2,        # this many dissociation / freeze results …
    dissociationDays=14,        # … in this many days: no offers, and a heads-up on entry
    louderPauseHours=72,        # after "Louder", no more of that part for this long
    maxNonSelfAnswers=2,        # a second non-Self-like answer at feel-toward ends the session kindly
    tooManyPartsCount=3,        # this many parts made …
    tooManyPartsDays=7,         # … in this many days: one line, "You don't need to get to know everyone at once."
    harmWindowDays=28,          # the harm signals (functions/src/parts/harm.ts, scripts/parts/report.cypher) look back this far
    tenderRepeatCount=2,        # this many tender / own-words stops (or not-Self endings) in the window is a harm signal
    nameMaxChars=40,
)
