"""DEAR MAN's graph content: the one editable source (docs/design/dbt-modules-plan.md C5, IE-B1).

Every situation, option, barrier, anchor, debrief chip, reflection, cope-ahead move and the safety copy that
DEAR MAN (`src/pages/tools/DearMan.tsx`) reads. build.py regenerates the four schema files from it:

  schema/dear-man-content.cypher           (situations, DEAR options, barriers, anchors, negotiate, debrief chips)
  schema/dear-man-content-v2.cypher        (feeling groups, mirroring, elaboration prompts, anchor needs + phrases)
  schema/dear-man-debrief-content.cypher   (turning points, responses, body signals, thoughts, reflections, CopeAhead)
  schema/dear-man-safety-gates.cypher      (DearManSafetyCopy)

  python3 scripts/dear-man/build.py            # write the four files
  python3 scripts/dear-man/build.py --check    # fail if a file is stale (tests/dear-man-content.test.mjs)

Ids are permanent: sessions, Reflect, parts mappings (`scripts/parts/content.py` EXPRESSES / HELD) and Cope
Ahead (ER-B2 links the CopeAhead moves SAME_MOVE_AS) point at them. Change a label, never an id; never delete a
row (retire it in the flow instead). This content predates the voice contract and is not voice-linted as a
flow document yet; the DEAR MAN port (IE-B2 / IE-B4) rewrites the copy that moves onto the skill player.

Generated from the hand-written cypher on 10 Nov 2026 with no change to what loads: the regenerated files send
Neo4j the same statements (same tokens; only whitespace and quote style differ), proven by `build.py --prove`
against the hand-written files at the commit before this one.
"""

# ---- schema/dear-man-content.cypher ---------------------------------------------------------
# 1. Situation types (DearManSituationType).
SITUATION_TYPES = [
    {"id": "ask", "label": "I need to ask for something", "sublabel": "A request, favor, or change", "emoji": "🗨️", "sortOrder": 1},
    {"id": "boundary", "label": "I need to set or hold a boundary", "sublabel": "Saying no or protecting my space", "emoji": "🛑", "sortOrder": 2},
    {"id": "address", "label": "I need to address something that happened", "sublabel": "Bringing up a problem or hurt", "emoji": "💬", "sortOrder": 3},
    {"id": "pattern", "label": "I need to address an ongoing pattern", "sublabel": "Something that keeps happening", "emoji": "🔄", "sortOrder": 4},
]
# 2. Describe options (DearManDescribeOption), per situation type: FOR_SITUATION.
DESCRIBE_OPTIONS = {
    "ask": [
        {"id": "ask_need_help", "label": "I need help with something and haven't asked yet", "sort": 1},
        {"id": "ask_not_working", "label": "Something about how we do things isn't working for me", "sort": 2},
        {"id": "ask_time_space", "label": "I need time, space, or flexibility for something", "sort": 3},
        {"id": "ask_support", "label": "I'm going through something and need their support", "sort": 4},
    ],
    "boundary": [
        {"id": "bound_unnamed_line", "label": "They keep crossing a line I haven't clearly named", "sort": 1},
        {"id": "bound_new_thing", "label": "Something new happened that I'm not okay with", "sort": 2},
        {"id": "bound_pressure", "label": "They're pressuring me to do something I don't want to do", "sort": 3},
        {"id": "bound_overcommit", "label": "I said yes to something and need to change that", "sort": 4},
    ],
    "address": [
        {"id": "addr_broke_promise", "label": "They said they'd do something and didn't follow through", "sort": 1},
        {"id": "addr_hurtful", "label": "They said or did something hurtful and didn't seem to notice", "sort": 2},
        {"id": "addr_dismissed", "label": "I told them how I felt and they dismissed it", "sort": 3},
        {"id": "addr_no_consult", "label": "They made a decision that affects me without asking", "sort": 4},
    ],
    "pattern": [
        {"id": "patt_keeps_doing", "label": "They keep doing something I've asked them to stop", "sort": 1},
        {"id": "patt_shuts_down", "label": "They shut down or blow up every time I bring this up", "sort": 2},
        {"id": "patt_avoids", "label": "They avoid the conversation every time I try to talk about it", "sort": 3},
        {"id": "patt_one_sided", "label": "The effort in this relationship feels one-sided", "sort": 4},
    ],
}
# 3. Assert options (DearManAssertOption), per situation type. A row without hasPlaceholder has none (the
# address and pattern blocks default it to false, as the hand-written file did).
ASSERT_OPTIONS = {
    "ask": [
        {"id": "ask_specific_help", "label": "I'd like help with [specific thing]", "hasPlaceholder": True, "sort": 1},
        {"id": "ask_flexibility", "label": "I need [time/space/flexibility] for [this]", "hasPlaceholder": True, "sort": 2},
        {"id": "ask_change_how", "label": "I'd like us to change how we handle [this]", "hasPlaceholder": True, "sort": 3},
        {"id": "ask_just_listen", "label": "I need you to just listen and support me right now", "hasPlaceholder": False, "sort": 4},
    ],
    "boundary": [
        {"id": "bound_stop_behavior", "label": "I need you to stop [specific behavior]", "hasPlaceholder": True, "sort": 1},
        {"id": "bound_respect_no", "label": "I need you to respect my decision about [this]", "hasPlaceholder": True, "sort": 2},
        {"id": "bound_cant_do", "label": "I'm not able to do [thing] and I need that to be okay", "hasPlaceholder": True, "sort": 3},
        {"id": "bound_need_space", "label": "I need space when [this happens]", "hasPlaceholder": True, "sort": 4},
    ],
    "address": [
        {"id": "addr_follow_through", "label": "I need you to follow through on what you said you'd do", "sort": 1},
        {"id": "addr_acknowledge", "label": "I need you to acknowledge what happened and how it affected me", "sort": 2},
        {"id": "addr_check_first", "label": "I'd like you to check with me before deciding things that affect me", "sort": 3},
        {"id": "addr_hear_me", "label": "I need you to hear me out without getting defensive", "sort": 4},
    ],
    "pattern": [
        {"id": "patt_actually_stop", "label": "I need this to actually change, not just be talked about", "sort": 1},
        {"id": "patt_stay_in_it", "label": "I need you to stay in the conversation when it's uncomfortable", "sort": 2},
        {"id": "patt_more_effort", "label": "I need you to put in more effort with [specific thing]", "sort": 3, "hasPlaceholder": True},
        {"id": "patt_new_approach", "label": "I need us to find a different way to handle this", "sort": 4},
    ],
}
# 4. Reinforce options (DearManReinforceOption), universal.
REINFORCE_OPTIONS = [
    {"id": "reinf_less_fighting", "label": "We'd fight less about this", "sort": 1},
    {"id": "reinf_more_relaxed", "label": "Our time together would be more relaxed", "sort": 2},
    {"id": "reinf_stop_bringing_up", "label": "I'd stop bringing it up", "sort": 3},
    {"id": "reinf_more_respected", "label": "We'd both feel more respected", "sort": 4},
    {"id": "reinf_less_pressure", "label": "It would take pressure off both of us", "sort": 5},
    {"id": "reinf_more_trust", "label": "I'd be able to trust them more", "sort": 6},
    {"id": "reinf_closer", "label": "We'd actually be closer", "sort": 7},
    {"id": "reinf_less_resentment", "label": "I wouldn't be resentful", "sort": 8},
]
# 5. Barriers (DearManBarrier).
BARRIERS = [
    {"id": "barrier_angry", "label": "I'm afraid they'll get angry"},
    {"id": "barrier_dont_know", "label": "I don't know how to say it"},
    {"id": "barrier_guilty", "label": "I feel guilty asking"},
    {"id": "barrier_tried_before", "label": "I've tried before and it didn't work"},
    {"id": "barrier_emotional", "label": "I'm worried I'll get emotional"},
    {"id": "barrier_no_right", "label": "I don't feel like I have the right to ask"},
]
# IE-12 (DBT IE Handout 2a, myths in the way of effectiveness): thoughts about asking itself, `kind: 'myth'`, shown in
# DEAR MAN's prep beside the barriers. Received and named, never argued with (the parked-CBT decision): each is
# answered by a cheerleading anchor phrase (HELPS_WITH below), never a disputation.
MYTHS = [
    {"id": "myth_deserve", "label": "I don't deserve it", "kind": "myth"},
    {"id": "myth_weak", "label": "Asking makes me look weak", "kind": "myth"},
    {"id": "myth_matter", "label": "If they say no, it means I don't matter", "kind": "myth"},
    {"id": "myth_know", "label": "They'd know if they cared", "kind": "myth"},
    {"id": "myth_last", "label": "My needs come last", "kind": "myth"},
]
# Coaching per barrier (DearManBarrierCoaching -[:ADDRESSES]-> DearManBarrier); the last is the default.
BARRIER_COACHING = [
    {"id": "coaching_angry", "title": "If they get defensive", "body": "That's their emotion — not proof that you're wrong. You can acknowledge it ('I can see this is frustrating') and come back to what you need.", "barrier": "barrier_angry"},
    {"id": "coaching_dont_know", "title": "If you blank on what to say", "body": "You've already built your plan. It's okay to glance at it. You can even say 'I wrote some things down because this matters to me.'", "barrier": "barrier_dont_know"},
    {"id": "coaching_guilty", "title": "If guilt shows up", "body": "Guilt might tell you to back down or apologize for having needs. Notice it, and stay with your ask anyway. Having needs doesn't make you a burden.", "barrier": "barrier_guilty"},
    {"id": "coaching_tried_before", "title": "If your brain pulls you to the past", "body": "Your mind might want to bring up the last 5 times. Try to stay with this conversation, this specific ask, right now. 'This time, I'm asking differently.'", "barrier": "barrier_tried_before"},
    {"id": "coaching_emotional", "title": "If emotions come up mid-conversation", "body": "Emotions are allowed. If you feel tears or your voice shaking, take a breath. You can say 'This is hard for me to say, and I want to get through it.' That's not weakness — that's staying present.", "barrier": "barrier_emotional"},
    {"id": "coaching_no_right", "title": "If you start doubting yourself", "body": "You don't need to earn the right to have needs. Asking clearly isn't pushy — it's respectful. Remind yourself: I'm allowed to want this.", "barrier": "barrier_no_right"},
    {"id": "coaching_default", "title": "Staying present", "body": "The hardest part of any conversation is staying with it when it gets uncomfortable. If your mind starts racing or shutting down, come back to your anchor phrase.", "isDefault": True},
]
# 6. Anchor phrases (DearManAnchorPhrase), the original four; content-v2 retags them.
ANCHOR_PHRASES_V1 = [
    {"id": "anchor_needs_valid", "label": "My needs are valid", "sortOrder": 1},
    {"id": "anchor_stay_with", "label": "I can stay with this", "sortOrder": 2},
    {"id": "anchor_worth_saying", "label": "This is worth saying", "sortOrder": 3},
    {"id": "anchor_allowed", "label": "I'm allowed to want this", "sortOrder": 4},
]
# 7. Negotiate options (DearManNegotiateOption): middle ground.
NEGOTIATE_MIDDLE_GROUND = [
    {"id": "neg_partial", "label": "They do part of it — not everything", "type": "middle_ground", "sort": 1},
    {"id": "neg_trial", "label": "They try for a set period and we check back in", "type": "middle_ground", "sort": 2},
    {"id": "neg_third_option", "label": "We find a third option together", "type": "middle_ground", "sort": 3},
]
# Walk-away.
NEGOTIATE_WALK_AWAY = [
    {"id": "neg_feelings_dismissed", "label": "Being told my feelings don't matter", "type": "walk_away", "sort": 1},
    {"id": "neg_yelled_at", "label": "Being yelled at or shut down", "type": "walk_away", "sort": 2},
    {"id": "neg_no_change", "label": "Having the same thing happen again with no change", "type": "walk_away", "sort": 3},
    {"id": "neg_give_up_ask", "label": "Giving up on the ask entirely", "type": "walk_away", "sort": 4},
]
# Priority-aware negotiate hints, on the DEAR MAN TherapyConcept.
NEGOTIATE_HINTS = {"negotiateHintObjective": "Since getting what you need is the priority, be clear about your minimum — the thing you won't budge on.",
    "negotiateHintRelationship": "Since keeping the relationship strong matters most, you might flex on specifics — as long as you feel heard.",
    "negotiateHintSelfRespect": "Since your self-respect is the priority, pay attention to any pressure to agree to something that doesn't sit right."}
# 8. Feeling chips (DearManFeelingChip).
FEELING_CHIPS = [
    {"id": "feel_hurt", "label": "Hurt", "sort": 1},
    {"id": "feel_frustrated", "label": "Frustrated", "sort": 2},
    {"id": "feel_anxious", "label": "Anxious", "sort": 3},
    {"id": "feel_sad", "label": "Sad", "sort": 4},
    {"id": "feel_angry", "label": "Angry", "sort": 5},
    {"id": "feel_lonely", "label": "Lonely", "sort": 6},
    {"id": "feel_overwhelmed", "label": "Overwhelmed", "sort": 7},
    {"id": "feel_scared", "label": "Scared", "sort": 8},
    {"id": "feel_disappointed", "label": "Disappointed", "sort": 9},
    {"id": "feel_resentful", "label": "Resentful", "sort": 10},
    {"id": "feel_embarrassed", "label": "Embarrassed", "sort": 11},
    {"id": "feel_disrespected", "label": "Disrespected", "sort": 12},
    {"id": "feel_unheard", "label": "Unheard", "sort": 13},
    {"id": "feel_invisible", "label": "Invisible", "sort": 14},
    {"id": "feel_confused", "label": "Confused", "sort": 15},
    {"id": "feel_helpless", "label": "Helpless", "sort": 16},
    {"id": "feel_exhausted", "label": "Exhausted", "sort": 17},
    {"id": "feel_trapped", "label": "Trapped", "sort": 18},
]
# 9. Step insights (DearManStepInsight), one per DEAR step.
STEP_INSIGHTS = [
    {"id": "insight_describe", "step": "describe", "text": "Facts are harder to argue with than judgments. 'You raised your voice' lands differently than 'you were being rude.'"},
    {"id": "insight_express", "step": "express", "text": "Naming feelings isn't weakness — it's what makes the other person understand this matters to you."},
    {"id": "insight_assert", "step": "assert", "text": "Specific asks are easier to say yes to. 'Text me if you'll be late' beats 'be more considerate.'"},
    {"id": "insight_reinforce", "step": "reinforce", "text": "This is the step most people skip. It's what makes the other person want to listen instead of defend."},
]
# 10. Debrief options (DearManDebriefOption): what went well.
DEBRIEF_WENT_WELL = [
    {"id": "debrief_stayed_calm", "label": "I stayed calm", "type": "went_well", "sort": 1},
    {"id": "debrief_said_it", "label": "I said what I needed to say", "type": "went_well", "sort": 2},
    {"id": "debrief_they_listened", "label": "They actually listened", "type": "went_well", "sort": 3},
    {"id": "debrief_didnt_back_down", "label": "I didn't back down", "type": "went_well", "sort": 4},
    {"id": "debrief_kept_facts", "label": "I kept it about the facts", "type": "went_well", "sort": 5},
    {"id": "debrief_compromised", "label": "We found a compromise", "type": "went_well", "sort": 6},
    {"id": "debrief_no_over_apologize", "label": "I didn't apologize for having needs", "type": "went_well", "sort": 7},
    {"id": "debrief_used_anchor", "label": "I used my anchor phrase", "type": "went_well", "sort": 8},
]
# What to try differently.
DEBRIEF_TO_CHANGE = [
    {"id": "debrief_more_specific", "label": "Get more specific about what I need", "type": "to_change", "sort": 1},
    {"id": "debrief_name_feelings", "label": "Name my feelings earlier", "type": "to_change", "sort": 2},
    {"id": "debrief_stay_with_defense", "label": "Stay with it when they got defensive", "type": "to_change", "sort": 3},
    {"id": "debrief_no_old_stuff", "label": "Not bring up old stuff", "type": "to_change", "sort": 4},
    {"id": "debrief_better_time", "label": "Pick a better time", "type": "to_change", "sort": 5},
    {"id": "debrief_less_apologizing", "label": "Not apologize so much", "type": "to_change", "sort": 6},
    {"id": "debrief_plan_b", "label": "Have a plan B ready", "type": "to_change", "sort": 7},
    {"id": "debrief_breathe", "label": "Take a breath when I felt overwhelmed", "type": "to_change", "sort": 8},
]
# 11. Reveal text and coaching lines, on the DEAR MAN TherapyConcept.
# Appear confident (H5): body and voice cues on the plan card, replacing the hard-coded "Body Reminder" line
# (IE-B2, PRD IE-01 Mode B step 8). ConfidenceCue nodes, IMPLEMENTS dbt_dear_man; the plan shows them in order.
CONFIDENCE_CUES = [
    {"id": "cue_feet", "label": "Feet flat on the ground", "kind": "body", "sortOrder": 1},
    {"id": "cue_shoulders", "label": "Shoulders down and back", "kind": "body", "sortOrder": 2},
    {"id": "cue_breath", "label": "One slow breath out before you start", "kind": "body", "sortOrder": 3},
    {"id": "cue_voice", "label": "An even voice, a little slower than usual", "kind": "voice", "sortOrder": 4},
    {"id": "cue_eyes", "label": "Look at them, or close to them", "kind": "body", "sortOrder": 5},
]
CONCEPT_COPY = {"revealText": "Each step you just did maps to a framework called DEAR MAN from Dialectical Behavior Therapy: Describe the facts. Express your feelings. Assert your need. Reinforce why it matters. Stay Mindful of what pulls you off track. Appear confident — your body helps your brain. Negotiate if needed. You didn't just fill in blanks — you built a real plan for a real conversation.",
    "confidentCoaching": "Even if you don't feel confident, your body can help. Before the conversation: shoulders back, feet on the ground, steady voice. It actually changes how you feel, not just how you look.",
    "confidentBarrierNoRight": "Appearing confident isn't about pretending. It's about honoring the fact that what you need matters.",
    "assertBarrierGuilty": "Asking for what you need is allowed. It doesn't make you demanding."}

# ---- schema/dear-man-content-v2.cypher ------------------------------------------------------
# 1. Feeling groups (DearManFeelingGroup); colorKey is a presentation hint mapped to a theme token.
FEELING_GROUPS = [
    {"id": "fgroup_hurt", "label": "Hurt & unseen", "colorKey": "pink", "sort": 1},
    {"id": "fgroup_angry", "label": "Angry & fed up", "colorKey": "rose", "sort": 2},
    {"id": "fgroup_afraid", "label": "Anxious & on edge", "colorKey": "orange", "sort": 3},
    {"id": "fgroup_sad", "label": "Sad & alone", "colorKey": "blue", "sort": 4},
    {"id": "fgroup_drained", "label": "Worn down", "colorKey": "purple", "sort": 5},
    {"id": "fgroup_guilt", "label": "Guilty & small", "colorKey": "teal", "sort": 6},
]
# 2. Feeling chips added in v2.
FEELING_CHIPS_V2 = [
    {"id": "feel_dismissed", "label": "Dismissed", "sort": 19},
    {"id": "feel_guilty", "label": "Guilty", "sort": 20},
    {"id": "feel_small", "label": "Small", "sort": 21},
    {"id": "feel_nervous", "label": "Nervous", "sort": 22},
]
# Chip -> group membership (IN_GROUP).
CHIP_GROUPS = [
    {"chip": "feel_hurt", "grp": "fgroup_hurt"},
    {"chip": "feel_disappointed", "grp": "fgroup_hurt"},
    {"chip": "feel_unheard", "grp": "fgroup_hurt"},
    {"chip": "feel_invisible", "grp": "fgroup_hurt"},
    {"chip": "feel_disrespected", "grp": "fgroup_hurt"},
    {"chip": "feel_dismissed", "grp": "fgroup_hurt"},
    {"chip": "feel_frustrated", "grp": "fgroup_angry"},
    {"chip": "feel_angry", "grp": "fgroup_angry"},
    {"chip": "feel_resentful", "grp": "fgroup_angry"},
    {"chip": "feel_anxious", "grp": "fgroup_afraid"},
    {"chip": "feel_scared", "grp": "fgroup_afraid"},
    {"chip": "feel_overwhelmed", "grp": "fgroup_afraid"},
    {"chip": "feel_confused", "grp": "fgroup_afraid"},
    {"chip": "feel_nervous", "grp": "fgroup_afraid"},
    {"chip": "feel_sad", "grp": "fgroup_sad"},
    {"chip": "feel_lonely", "grp": "fgroup_sad"},
    {"chip": "feel_helpless", "grp": "fgroup_sad"},
    {"chip": "feel_exhausted", "grp": "fgroup_drained"},
    {"chip": "feel_trapped", "grp": "fgroup_drained"},
    {"chip": "feel_guilty", "grp": "fgroup_guilt"},
    {"chip": "feel_embarrassed", "grp": "fgroup_guilt"},
    {"chip": "feel_small", "grp": "fgroup_guilt"},
]
# 3. Mirroring per describe option: mirrorText, typicalFeelingIds.
MIRROR_DESCRIBE = [
    {"id": "ask_need_help", "text": "When you need help and haven't asked yet, it's common to feel overwhelmed and a little anxious about being a burden. Some people also notice resentment building — even though the other person doesn't know yet.", "feelings": ["feel_overwhelmed", "feel_anxious", "feel_resentful", "feel_exhausted"]},
    {"id": "ask_not_working", "text": "When something about how you do things together isn't working, people often feel frustrated and unheard — and sometimes trapped by a routine they didn't choose.", "feelings": ["feel_frustrated", "feel_unheard", "feel_trapped"]},
    {"id": "ask_time_space", "text": "Needing time or space and not having it tends to leave people exhausted and overwhelmed, often with some guilt about wanting it at all.", "feelings": ["feel_exhausted", "feel_overwhelmed", "feel_guilty", "feel_trapped"]},
    {"id": "ask_support", "text": "Going through something hard and needing support often comes with loneliness and sadness — and sometimes fear that asking will push the other person away.", "feelings": ["feel_lonely", "feel_sad", "feel_scared", "feel_overwhelmed"]},
    {"id": "bound_unnamed_line", "text": "When someone keeps crossing a line you haven't named out loud, resentment usually builds quietly. Many people also feel disrespected, and a bit trapped by having let it go this long.", "feelings": ["feel_resentful", "feel_disrespected", "feel_trapped", "feel_frustrated"]},
    {"id": "bound_new_thing", "text": "When something new happens that isn't okay with you, it's common to feel hurt or disrespected, and nervous about how to respond.", "feelings": ["feel_hurt", "feel_disrespected", "feel_nervous", "feel_angry"]},
    {"id": "bound_pressure", "text": "Being pressured to do something you don't want to do often feels like being cornered. Frustration and anxiety tend to show up, along with resentment if it keeps happening.", "feelings": ["feel_trapped", "feel_frustrated", "feel_anxious", "feel_resentful"]},
    {"id": "bound_overcommit", "text": "Needing to take back a yes usually brings guilt and anxiety about letting someone down — and often exhaustion from carrying something you couldn't.", "feelings": ["feel_guilty", "feel_anxious", "feel_exhausted", "feel_overwhelmed"]},
    {"id": "addr_broke_promise", "text": "When someone doesn't follow through, people typically feel disappointed first, then frustrated — and sometimes hurt, because it can feel like you didn't matter enough.", "feelings": ["feel_disappointed", "feel_frustrated", "feel_hurt"]},
    {"id": "addr_hurtful", "text": "When someone hurts you and doesn't notice, the hurt is usually right at the surface. Feeling invisible often follows, and sometimes anger that they didn't catch it.", "feelings": ["feel_hurt", "feel_invisible", "feel_angry", "feel_sad"]},
    {"id": "addr_dismissed", "text": "Telling someone how you feel and being dismissed often leaves people feeling unheard and disrespected. It's common to feel hurt, and then angry that you opened up at all.", "feelings": ["feel_unheard", "feel_dismissed", "feel_hurt", "feel_angry"]},
    {"id": "addr_no_consult", "text": "When a decision that affects you is made without you, people often feel disrespected and invisible — and sometimes helpless, like it was already out of your hands.", "feelings": ["feel_disrespected", "feel_invisible", "feel_helpless", "feel_frustrated"]},
    {"id": "patt_keeps_doing", "text": "When someone keeps doing something you've asked them to stop, frustration and resentment are almost universal. Underneath is often the sense of not being heard.", "feelings": ["feel_frustrated", "feel_resentful", "feel_unheard", "feel_disrespected"]},
    {"id": "patt_shuts_down", "text": "When they shut down or blow up every time, it's common to feel helpless and exhausted before the conversation even starts — and anxious about trying again.", "feelings": ["feel_helpless", "feel_exhausted", "feel_anxious", "feel_frustrated"]},
    {"id": "patt_avoids", "text": "When the conversation keeps getting avoided, people often feel unheard and invisible, then frustrated — and lonely inside the relationship.", "feelings": ["feel_unheard", "feel_invisible", "feel_frustrated", "feel_lonely"]},
    {"id": "patt_one_sided", "text": "When effort feels one-sided, resentment and exhaustion tend to build. Many people also feel lonely and, underneath, sad about wanting more than they're getting.", "feelings": ["feel_resentful", "feel_exhausted", "feel_lonely", "feel_sad"]},
]
# Per situation type (the fallback when the description is the person's own).
MIRROR_SITUATION = [
    {"id": "ask", "text": "Asking for something you need usually brings up a mix: some anxiety about how it'll land, sometimes guilt for needing it at all, and often relief once it's finally out.", "feelings": ["feel_anxious", "feel_guilty", "feel_overwhelmed"]},
    {"id": "boundary", "text": "Setting a boundary often comes with guilt and anxiety about the other person's reaction, on top of the frustration or resentment that made the boundary necessary in the first place.", "feelings": ["feel_anxious", "feel_guilty", "feel_resentful", "feel_trapped"]},
    {"id": "address", "text": "Bringing up something that happened usually means there's hurt underneath, along with frustration or anger about it, and some nervousness about reopening it.", "feelings": ["feel_hurt", "feel_frustrated", "feel_nervous"]},
    {"id": "pattern", "text": "Addressing a pattern that keeps repeating often means feeling exhausted and unheard, with resentment that's built up over time.", "feelings": ["feel_exhausted", "feel_unheard", "feel_resentful"]},
]
# 4. Assert elaboration prompts (elaboratePrompt).
ASSERT_PROMPTS = [
    {"id": "ask_specific_help", "prompt": "What kind of help, and by when?"},
    {"id": "ask_flexibility", "prompt": "What would that look like in practice?"},
    {"id": "ask_change_how", "prompt": "What would you like to be different?"},
    {"id": "ask_just_listen", "prompt": "Anything you want them to know about what you don't need right now (advice, fixing)?"},
    {"id": "bound_stop_behavior", "prompt": "When does it usually happen?"},
    {"id": "bound_respect_no", "prompt": "What does respecting it look like — no follow-up questions, no guilt trips?"},
    {"id": "bound_cant_do", "prompt": "Is there anything you can offer instead?"},
    {"id": "bound_need_space", "prompt": "How much space, and how will you let them know?"},
    {"id": "addr_follow_through", "prompt": "Which commitment, and by when?"},
    {"id": "addr_acknowledge", "prompt": "What specifically do you want acknowledged?"},
    {"id": "addr_check_first", "prompt": "Which kinds of decisions?"},
    {"id": "addr_hear_me", "prompt": "What does listening look like to you — no interrupting, no explaining?"},
    {"id": "patt_actually_stop", "prompt": "What would 'actually changed' look like a month from now?"},
    {"id": "patt_stay_in_it", "prompt": "What could they do instead of leaving or shutting down?"},
    {"id": "patt_more_effort", "prompt": "What would more effort look like, concretely?"},
    {"id": "patt_new_approach", "prompt": "Any ideas for what the new way could be?"},
]
# 5. Anchor needs (DearManAnchorNeed), each with the barriers it most often answers.
ANCHOR_NEEDS = [
    {"id": "need_permission", "label": "That I'm allowed to ask", "sort": 1, "barriers": ["barrier_guilty", "barrier_no_right", "myth_deserve", "myth_weak", "myth_last"]},
    {"id": "need_reaction", "label": "That their reaction isn't mine to fix", "sort": 2, "barriers": ["barrier_angry", "myth_matter"]},
    {"id": "need_steady", "label": "That I can stay steady", "sort": 3, "barriers": ["barrier_emotional"]},
    {"id": "need_imperfect", "label": "That I don't have to say it perfectly", "sort": 4, "barriers": ["barrier_dont_know"]},
    {"id": "need_different", "label": "That this time can be different", "sort": 5, "barriers": ["barrier_tried_before"]},
    {"id": "need_matters", "label": "That this is worth saying", "sort": 6, "barriers": ["myth_know"]},
]
# 6. Anchor phrases tagged by need and barrier (retags the original four, adds the rest).
ANCHOR_PHRASES = [
    {"id": "anchor_needs_valid", "label": "My needs are valid", "sort": 1, "needs": ["need_permission"], "barriers": ["barrier_guilty", "barrier_no_right", "myth_deserve", "myth_last"]},
    {"id": "anchor_allowed", "label": "I'm allowed to want this", "sort": 2, "needs": ["need_permission"], "barriers": ["barrier_guilty", "barrier_no_right", "myth_deserve"]},
    {"id": "anchor_burden", "label": "Asking isn't a burden. Guessing is.", "sort": 3, "needs": ["need_permission"], "barriers": ["barrier_guilty"]},
    {"id": "anchor_clear_is_kind", "label": "Clear is kind", "sort": 4, "needs": ["need_permission", "need_imperfect"], "barriers": ["barrier_guilty", "barrier_no_right"]},
    {"id": "anchor_their_feelings", "label": "Their feelings are theirs to hold", "sort": 5, "needs": ["need_reaction"], "barriers": ["barrier_angry"]},
    {"id": "anchor_anger_not_verdict", "label": "Their anger isn't a verdict on me", "sort": 6, "needs": ["need_reaction"], "barriers": ["barrier_angry"]},
    {"id": "anchor_hear_no", "label": "I can hear a no and still be okay", "sort": 7, "needs": ["need_reaction", "need_different"], "barriers": ["barrier_angry", "barrier_tried_before", "myth_matter"]},
    {"id": "anchor_stay_kind_firm", "label": "I can be kind and still not back down", "sort": 8, "needs": ["need_reaction", "need_steady"], "barriers": ["barrier_angry", "barrier_guilty"]},
    {"id": "anchor_stay_with", "label": "I can stay with this", "sort": 9, "needs": ["need_steady"], "barriers": ["barrier_emotional"]},
    {"id": "anchor_tears_ok", "label": "Tears don't cancel the point", "sort": 10, "needs": ["need_steady"], "barriers": ["barrier_emotional"]},
    {"id": "anchor_breathe_return", "label": "Breathe, then come back to the ask", "sort": 11, "needs": ["need_steady"], "barriers": ["barrier_emotional", "barrier_angry"]},
    {"id": "anchor_feet", "label": "Feet on the floor. Say the thing.", "sort": 12, "needs": ["need_steady", "need_imperfect"], "barriers": ["barrier_emotional", "barrier_dont_know"]},
    {"id": "anchor_slow", "label": "I can go slow. I don't have to rush.", "sort": 13, "needs": ["need_steady", "need_imperfect"], "barriers": ["barrier_emotional", "barrier_dont_know"]},
    {"id": "anchor_one_sentence", "label": "One clear sentence is enough", "sort": 14, "needs": ["need_imperfect"], "barriers": ["barrier_dont_know"]},
    {"id": "anchor_messy_ok", "label": "Messy and honest beats polished and silent", "sort": 15, "needs": ["need_imperfect"], "barriers": ["barrier_dont_know", "barrier_emotional"]},
    {"id": "anchor_wrote_it_down", "label": "I wrote it down because it matters", "sort": 16, "needs": ["need_imperfect", "need_matters"], "barriers": ["barrier_dont_know"]},
    {"id": "anchor_this_time", "label": "This time, I'm asking differently", "sort": 17, "needs": ["need_different"], "barriers": ["barrier_tried_before"]},
    {"id": "anchor_not_the_past", "label": "I'm here for this conversation, not the last five", "sort": 18, "needs": ["need_different"], "barriers": ["barrier_tried_before"]},
    {"id": "anchor_one_ask", "label": "One ask. This one.", "sort": 19, "needs": ["need_different", "need_imperfect"], "barriers": ["barrier_tried_before", "barrier_dont_know"]},
    {"id": "anchor_worth_saying", "label": "This is worth saying", "sort": 20, "needs": ["need_matters"], "barriers": []},
    {"id": "anchor_matters_to_me", "label": "This matters to me, and that's reason enough", "sort": 21, "needs": ["need_matters", "need_permission"], "barriers": ["barrier_no_right"]},
    {"id": "anchor_future_me", "label": "Future me will be glad I said it", "sort": 22, "needs": ["need_matters"], "barriers": []},
    # IE-12's three (PRD: new phrases where a myth had none).
    {"id": "anchor_human", "label": "Needing things is human, not weak", "sort": 23, "needs": ["need_permission"], "barriers": ["myth_weak", "myth_last"]},
    {"id": "anchor_this_ask", "label": "Their no is about this ask, not about me", "sort": 24, "needs": ["need_reaction"], "barriers": ["myth_matter"]},
    {"id": "anchor_kinder_than_guess", "label": "Saying it clearly is kinder than hoping they guess", "sort": 25, "needs": ["need_permission", "need_matters"], "barriers": ["myth_know"]},
]
# The anchor generator's copy, on the DEAR MAN TherapyConcept.
ANCHOR_GENERATOR = {"anchorGeneratorIntro": "An anchor phrase is one short line you can say to yourself when the conversation gets hard. The best ones answer the specific thing your brain will try to tell you in that moment.",
    "anchorGeneratorMakeItYours": "Edit the words until it sounds like something you'd actually say to yourself. Shorter is better — you want it to fit in one breath."}

# ---- schema/dear-man-debrief-content.cypher --------------------------------------------------
# The overall debrief response text, on the DEAR MAN TherapyConcept.
DEBRIEF_RESPONSES = {"debriefResponseBad": "That takes a lot of honesty. Let's look at what happened so you can walk away with something useful.",
    "debriefResponseMixed": "Mixed is actually really normal. Let's pull apart what happened.",
    "debriefResponseGood": "That's great. Let's make sure you can do it again.",
    "debriefResponseNotYet": "Good — you're already thinking about it. Want to prepare, or walk through what you're worried about?"}
# TurningPoint
TURNING_POINTS = [
    {"id": "tp_defensive", "label": "They got defensive", "validationText": "That's one of the hardest things to stay grounded through.", "sortOrder": 1},
    {"id": "tp_crying_shutdown", "label": "I started crying or shutting down", "validationText": "Your body was trying to protect you. That's not weakness.", "sortOrder": 2},
    {"id": "tp_apologized", "label": "I apologized when I didn't need to", "validationText": "That's such a common pattern. It's hard to hold your ground when guilt shows up.", "sortOrder": 3},
    {"id": "tp_no_words", "label": "I couldn't find the words", "validationText": "When emotions are high, the language centers literally go offline. That's neuroscience, not failure.", "sortOrder": 4},
    {"id": "tp_gave_in", "label": "I gave in to keep the peace", "validationText": "That impulse makes sense — your brain was prioritizing safety. Let's look at what was underneath.", "sortOrder": 5},
    {"id": "tp_escalated", "label": "It escalated quickly", "validationText": "When things escalate, it usually means something important was at stake for both of you.", "sortOrder": 6},
    {"id": "tp_went_okay", "label": "Actually, it went okay", "validationText": "Let's figure out what you did right so you can repeat it.", "sortOrder": 7},
    {"id": "tp_something_else", "label": "Something else", "validationText": "Every conversation has its own shape. Let's look at what was happening for you.", "sortOrder": 8},
]
# MomentResponse: what the person did in that moment. Each RESPONDS_TO every TurningPoint but tp_went_okay.
MOMENT_RESPONSES = [
    {"id": "mr_froze", "label": "I froze up", "sortOrder": 1},
    {"id": "mr_got_loud", "label": "I got loud or intense", "sortOrder": 2},
    {"id": "mr_went_quiet", "label": "I went quiet", "sortOrder": 3},
    {"id": "mr_cried", "label": "I cried", "sortOrder": 4},
    {"id": "mr_changed_subject", "label": "I changed the subject", "sortOrder": 5},
    {"id": "mr_agreed", "label": "I agreed with them", "sortOrder": 6},
    {"id": "mr_left", "label": "I left / ended it", "sortOrder": 7},
    {"id": "mr_stayed_course", "label": "I stayed on course", "sortOrder": 8},
]
# BodySignal
BODY_SIGNALS = [
    {"id": "bs_chest_tight", "label": "Chest got tight", "sortOrder": 1},
    {"id": "bs_stomach_drop", "label": "Stomach dropped", "sortOrder": 2},
    {"id": "bs_face_hot", "label": "Face got hot", "sortOrder": 3},
    {"id": "bs_hands_shaking", "label": "Hands were shaking", "sortOrder": 4},
    {"id": "bs_throat_closed", "label": "Throat closed up", "sortOrder": 5},
    {"id": "bs_numb", "label": "Went numb", "sortOrder": 6},
    {"id": "bs_heart_racing", "label": "Heart was racing", "sortOrder": 7},
    {"id": "bs_jaw_clenched", "label": "Jaw clenched", "sortOrder": 8},
    {"id": "bs_shoulders_up", "label": "Shoulders went up", "sortOrder": 9},
    {"id": "bs_none", "label": "I didn't notice anything", "sortOrder": 10},
]
# ThoughtPattern
THOUGHT_PATTERNS = [
    {"id": "thought_not_worth", "label": "This isn't worth the fight", "theme": "avoidance", "sortOrder": 1},
    {"id": "thought_my_fault", "label": "This is probably my fault", "theme": "self_blame", "sortOrder": 2},
    {"id": "thought_never_listen", "label": "They never listen", "theme": "hopelessness", "sortOrder": 3},
    {"id": "thought_too_much", "label": "I'm being too much", "theme": "self_invalidation", "sortOrder": 4},
    {"id": "thought_cant_handle", "label": "I can't handle this", "theme": "overwhelm", "sortOrder": 5},
    {"id": "thought_dont_deserve", "label": "I don't deserve to ask", "theme": "unworthiness", "sortOrder": 6},
    {"id": "thought_should_know", "label": "They should just know", "theme": "expectation", "sortOrder": 7},
    {"id": "thought_wrong", "label": "What if I'm wrong?", "theme": "doubt", "sortOrder": 8},
    {"id": "thought_will_leave", "label": "They're going to leave", "theme": "abandonment", "sortOrder": 9},
    {"id": "thought_something_else", "label": "Something else", "theme": "other", "sortOrder": 10},
]
# Underneath
UNDERNEATH = [
    {"id": "under_fear_rejection", "label": "Fear of rejection", "sortOrder": 1},
    {"id": "under_shame", "label": "Shame", "sortOrder": 2},
    {"id": "under_grief", "label": "Grief — for how it should be", "sortOrder": 3},
    {"id": "under_powerlessness", "label": "Powerlessness", "sortOrder": 4},
    {"id": "under_loneliness", "label": "Loneliness", "sortOrder": 5},
    {"id": "under_not_sure", "label": "I'm not sure", "sortOrder": 6},
]
# Reflection, keyed to a (TurningPoint, MomentResponse) pair (REFLECTS_ON, FOR_RESPONSE); ref_default has none.
REFLECTIONS = [
    {"id": "ref_defensive_froze", "turningPoint": "tp_defensive", "response": "mr_froze", "text": "When someone gets defensive, your nervous system reads it as danger. Freezing isn't giving up — it's your brain hitting pause because the threat level spiked. The skill isn't to never freeze. It's to have a plan for when you do.", "isDefault": False},
    {"id": "ref_defensive_loud", "turningPoint": "tp_defensive", "response": "mr_got_loud", "text": "When they got defensive, your system matched their intensity. That's not a character flaw — it's mirror neurons doing exactly what they're designed to do. The goal isn't to suppress that. It's to notice the surge before it takes over.", "isDefault": False},
    {"id": "ref_defensive_quiet", "turningPoint": "tp_defensive", "response": "mr_went_quiet", "text": "Going quiet when someone gets defensive is actually a sophisticated self-protection move. Your brain decided the safest option was to stop giving them material. The question is whether that quiet served you, or just served the peace.", "isDefault": False},
    {"id": "ref_crying_froze", "turningPoint": "tp_crying_shutdown", "response": "mr_froze", "text": "Crying and freezing happen when your emotional brain overwhelms your thinking brain. It's not that you couldn't handle it — it's that your system was trying to process too much at once. Next time, you can give yourself permission to pause.", "isDefault": False},
    {"id": "ref_crying_cried", "turningPoint": "tp_crying_shutdown", "response": "mr_cried", "text": "Tears during hard conversations usually mean something really matters to you. That's not dysfunction — that's depth. The skill is learning to keep talking through the tears, or to say 'I need a minute' without abandoning what you need.", "isDefault": False},
    {"id": "ref_apologized_agreed", "turningPoint": "tp_apologized", "response": "mr_agreed", "text": "Apologizing and agreeing when you don't mean it is your nervous system's way of making the discomfort stop. It works in the moment, but it costs you later — because the need doesn't go away. It just goes underground.", "isDefault": False},
    {"id": "ref_apologized_quiet", "turningPoint": "tp_apologized", "response": "mr_went_quiet", "text": "Apologizing and then going quiet — that's the double move of someone who learned early that their needs create problems. It's not that you don't have a voice. It's that something taught you it wasn't safe to use it.", "isDefault": False},
    {"id": "ref_nowords_froze", "turningPoint": "tp_no_words", "response": "mr_froze", "text": "When emotions flood in, your prefrontal cortex — the part that finds words — literally goes offline. You didn't lose your argument. Your brain just couldn't access it. Having key phrases ready beforehand can bridge that gap.", "isDefault": False},
    {"id": "ref_nowords_changed", "turningPoint": "tp_no_words", "response": "mr_changed_subject", "text": "Changing the subject when you can't find the words is actually a creative survival move — your brain found an exit when the words couldn't. The skill is having one rehearsed sentence you can reach for in that moment.", "isDefault": False},
    {"id": "ref_gavein_agreed", "turningPoint": "tp_gave_in", "response": "mr_agreed", "text": "Giving in to keep the peace makes total sense when conflict feels dangerous. But peace bought with your needs is expensive. The goal isn't to fight harder — it's to tolerate the discomfort of holding your ground a little longer.", "isDefault": False},
    {"id": "ref_gavein_left", "turningPoint": "tp_gave_in", "response": "mr_left", "text": "Leaving can actually be a wise move — especially if you were about to say something you'd regret. The key is whether you left with a plan to come back, or whether leaving became the end of the conversation.", "isDefault": False},
    {"id": "ref_escalated_loud", "turningPoint": "tp_escalated", "response": "mr_got_loud", "text": "When things escalate and you match the intensity, it's because your amygdala read the situation as a real threat. Volume is your nervous system's way of trying to be heard. But it usually pushes the other person further away from hearing you.", "isDefault": False},
    {"id": "ref_escalated_left", "turningPoint": "tp_escalated", "response": "mr_left", "text": "Leaving when things escalate is actually a skill — if it's done intentionally. The difference between storming out and taking a break is one sentence: 'I need to pause. I want to come back to this.'", "isDefault": False},
    {"id": "ref_okay_stayed", "turningPoint": "tp_went_okay", "response": "mr_stayed_course", "text": "You stayed on course — that means something worked. Let's be specific about what so you can replicate it. Was it something you said, something you didn't say, or something you did with your body?", "isDefault": False},
    {"id": "ref_default", "text": "Whatever happened in that moment, your nervous system was doing its best with what it had. Let's build something you can reach for next time.", "isDefault": True},
]
# CopeAhead: universal, or FOR_RESPONSE the listed MomentResponses (parts and Cope Ahead map these ids: never rename).
COPE_AHEAD = [
    {"id": "ca_pause_phrase", "label": "Have a pause phrase ready", "rehearsal": "Before the conversation, choose one sentence you can say when you feel the moment arriving. Something like: 'I want to keep talking about this — I just need a second.' Practice saying it out loud three times, right now. Notice what it feels like in your mouth.", "isUniversal": True, "responses": []},
    {"id": "ca_body_anchor", "label": "Anchor in your body first", "rehearsal": "When you notice the signal — feet on floor, hands on thighs, one slow breath. You're not calming down. You're buying your thinking brain two seconds to come online. Try it now: feet, hands, breath.", "isUniversal": True, "responses": []},
    {"id": "ca_broken_record", "label": "Use the broken record technique", "rehearsal": "Pick your one key sentence — the thing you actually need to say. When the conversation starts spinning, come back to it. Same words, calm voice. 'What I need is ___.' Practice saying it three times now, each time a little softer.", "isUniversal": False, "responses": ["mr_changed_subject", "mr_went_quiet"]},
    {"id": "ca_name_the_dynamic", "label": "Name what's happening", "rehearsal": "When things escalate, try naming the pattern instead of the content: 'I notice we're both getting louder. I don't want to do that. Can we slow down?' Practice saying this out loud. It's surprisingly disarming.", "isUniversal": False, "responses": ["mr_got_loud", "mr_left"]},
    {"id": "ca_planned_exit", "label": "Plan your exit line in advance", "rehearsal": "Choose your exit sentence now: 'I care about this too much to keep going when we're both activated. Can we come back to this at [specific time]?' Say it out loud. The key is naming a return time — that's what makes it a pause, not an escape.", "isUniversal": False, "responses": ["mr_left", "mr_froze"]},
    {"id": "ca_validate_first", "label": "Lead with validation", "rehearsal": "Before you say what you need, acknowledge what they're feeling first: 'I can see this is hard for you too.' One sentence of validation can lower their defenses enough for them to actually hear you. Practice saying it now.", "isUniversal": False, "responses": ["mr_agreed", "mr_froze"]},
    {"id": "ca_tears_plan", "label": "Make a tears-are-okay plan", "rehearsal": "Give yourself permission in advance: 'If I cry, that's okay. I'm going to keep talking.' You might even tell them: 'I might get emotional. That doesn't mean I want to stop.' Practice saying that sentence. Notice what comes up.", "isUniversal": False, "responses": ["mr_cried"]},
    {"id": "ca_apology_check", "label": "Add an apology checkpoint", "rehearsal": "When you feel the urge to apologize, pause and ask yourself: 'Did I actually do something wrong, or am I just uncomfortable?' If the answer is discomfort, try saying 'I understand this is hard' instead of 'I'm sorry.' Practice the swap now.", "isUniversal": False, "responses": ["mr_agreed"]},
    {"id": "ca_write_it_down", "label": "Write your key points down", "rehearsal": "Take out your phone or a piece of paper. Write down the 2-3 things you want to say. It's not a script — it's a lifeline. When your brain goes offline, you can glance down. Having it written means your thinking brain already did the work.", "isUniversal": False, "responses": ["mr_froze", "mr_went_quiet"]},
    {"id": "ca_time_limit", "label": "Set a time limit for the conversation", "rehearsal": "Before you start, say: 'I want to talk about this for 15 minutes and then check in about how we're both doing.' A time limit makes hard conversations feel survivable. It also gives you a natural exit point that doesn't feel like running.", "isUniversal": False, "responses": ["mr_got_loud", "mr_cried"]},
    {"id": "ca_success_anchor", "label": "Anchor to what worked this time", "rehearsal": "You stayed on course. Before you forget how that felt, describe it to yourself: what did you do with your body? Your voice? What did you focus on? Write it down. This is your playbook for next time.", "isUniversal": False, "responses": ["mr_stayed_course"]},
]
# TroubleshootFactor (IE-11, DBT IE Handout 9: factors reducing interpersonal effectiveness), phrased as things that
# happen, not faults. The debrief's *What got in the way most?* (scripts/skills/dear_man_debrief.py) presents them;
# a TurningPoint SUGGESTS_FACTOR the ones it often points to (knowledge, not routing); `opens` names the tools the fix
# offers (app tool ids; planned ones included).
TROUBLESHOOT_FACTORS = [
    {"id": "no_words", "label": "I couldn't find the words", "handout": "skill", "opens": ["rehearse", "cope-ahead", "dear-man"], "suggestedBy": ["tp_no_words"], "sortOrder": 1},
    {"id": "unclear", "label": "I wasn't sure what I wanted from it", "handout": "indecision", "opens": ["dear-man"], "suggestedBy": [], "sortOrder": 2},
    {"id": "feelings", "label": "My feelings took over", "handout": "emotions", "opens": ["cope-ahead", "dear-man"], "suggestedBy": ["tp_crying_shutdown", "tp_escalated", "tp_defensive"], "sortOrder": 3},
    {"id": "belief", "label": "A worry or belief stopped me", "handout": "worries", "opens": ["check-the-facts", "thoughts-passing", "dear-man"], "suggestedBy": ["tp_apologized", "tp_gave_in"], "sortOrder": 4},
    {"id": "quick_win", "label": "I settled for ending it quickly", "handout": "short_term_goals", "opens": ["fast", "dear-man"], "suggestedBy": ["tp_gave_in"], "sortOrder": 5},
    {"id": "power", "label": "They had more power in this", "handout": "environment", "opens": ["fast", "ending-relationships", "let-it-be"], "suggestedBy": [], "sortOrder": 6},
    {"id": "cant_give", "label": "What I wanted isn't something they can give", "handout": "environment", "opens": ["fast", "finding-connection"], "suggestedBy": [], "sortOrder": 7},
    # Handout 9's environment, the other half: asking skilfully doesn't decide their answer (Gate 3, IE-B2).
    {"id": "not_willing", "label": "I asked well, and they still said no", "handout": "environment", "opens": ["fast"], "suggestedBy": [], "sortOrder": 8},
]
# DearManFeelingChip nodes added for the debrief.
DEBRIEF_FEELING_CHIPS = [
    {"id": "drained", "label": "Drained", "sortOrder": 19},
    {"id": "numb", "label": "Numb", "sortOrder": 20},
    {"id": "shaky", "label": "Shaky", "sortOrder": 21},
    {"id": "wound_up", "label": "Wound up", "sortOrder": 22},
    {"id": "defeated", "label": "Defeated", "sortOrder": 23},
]

# ---- schema/dear-man-safety-gates.cypher ----------------------------------------------------
# DearManSafetyCopy: the carried-over card, the one-message note and the still-loud heads-up.
# {emotion} / {need} / {minutes} are filled by the frontend.
SAFETY_COPY = {"id": "dear_man_safety_copy",
    "version": "dear-man-safety-v3",
    "handoffSituationId": "address",
    "carriedOver": "Carried over: {emotion} · you needed {need}",
    "carriedOverDismiss": "Hide",
    "oneMessageOnly": "One message only. Say it once, then give them room to answer.",
    "hotHeading": "Your plan is ready. Heads up: it's still loud in there.",
    "hotBody": "When you're this angry or worked up, even a good plan comes out sharper than you mean it, and they'll hear the anger before they hear the ask. Taking the edge off first makes it more likely you get what you're asking for.",
    "hotCoolDown": "Take the edge off (about 30 seconds)",
    "hotReady": "I'm good to go",
    "hotBodyCue": "Unclench your jaw and drop your shoulders while you read it through.",
    "hotCooled": "That's the edge off. Read your plan once more, out loud if you can, then go when it feels right.",
    # People and safety (IE-B2, IE-03 minimal + D4: "Is it safe to bring hard things up with them?" in the prep, with
    # the other_person banner). {who} is the person's name, or "them". src/components/people/PersonPicker.tsx.
    "personWho": "Who is this conversation with?",
    "personNew": "Someone new",
    "personNameLabel": "What do you call them?",
    "personNameHint": "A nickname is fine. No real names needed.",
    "personRoleLabel": "Who are they to you?",
    "personKeepLine": "The app will remember {who} for next time: the name you gave, who they are to you, and your answer about safety. Nothing else.",
    "personNoNameLine": "Without a name, nothing about them is kept.",
    "personSignedOutLine": "This stays on this screen only.",
    "personGoOn": "Go on",
    "personChanged": "Things changed with someone?",
    "personChangedHint": "Pick who it is, and you'll be asked about them again.",
    "safeQuestion": "Is it safe to bring hard things up with {who}?",
    "safeYes": "Yes, mostly",
    "safeNo": "No",
    "safeUnsure": "Not sure",
    "riskQuestion": "Is it more that they might hurt or control you, or that it tends to go badly?",
    "riskHarm": "They might hurt or control me",
    "riskBadly": "It tends to go badly",
    "riskUnsaid": "I'd rather not say",
    "safetyRouteHeading": "Planning a hard talk with {who} can wait. Your safety comes first.",
    "safetyRouteDebriefHeading": "With {who}, your safety comes first. Looking back can wait.",
    "safetyRouteBody": "The people below can help you think it through, any time, and you don't have to be sure.",
    "safetyRouteEnding": "Thinking about ending the relationship",
    "safetyRouteBack": "This is about someone else",
    "badlyHeadsUp": "When talks with them tend to go badly, it can help to keep it short, about one thing, and in writing if that suits.",
    # The debrief (IE-B2, docs/design/dear-man-debrief.md): the picker's question, after the conversation.
    "personWhoDebrief": "Who was the conversation with?",
    # Say no (IE-04, IE-B3; docs/design/say-no.md): the picker's question and the safety screen's heading.
    "personWhoSayNo": "Who's asking?",
    "safetyRouteSayNoHeading": "With {who}, your safety comes first. Working out how to say no can wait.",
    "personWhoOne": "Who's the message for?",
    "safetyRouteOneHeading": "A message to {who} can wait. Your safety comes first.",
    # Keep it warm (IE-06, IE-B4; docs/design/give.md): PRD, keeping it warm isn't your job with someone who isn't safe.
    "personWhoGive": "Who's it with?",
    "safetyRouteGiveHeading": "Keeping it warm isn't your job with {who}. Your safety comes first.",
    # The prep's saved screen: when it is, so "How did it go?" comes after (the ask_outcome follow-up). Names no one.
    "askOutcomeQuestion": "When is the conversation? I can ask how it went, after.",
    "askOutcomeToday": "Later today",
    "askOutcomeTomorrow": "Tomorrow",
    "askOutcomeWeek": "This week",
    "askOutcomeUnsure": "Not sure",
    "askOutcomeFailed": "That didn't save. You can try again.",
    "askOutcomeSet": "I'll ask how it went.",
    # A refused ask to be heard, counted by the debrief: Let go (FAST), offered on the next ask to be heard by them.
    "letGoLine": "Last time you asked {who} to hear you, it didn't land. You can ask again. If it goes the same way, letting it go is a way to keep your self-respect too.",
    "letGoLink": "Letting it go, and keeping my self-respect"}

