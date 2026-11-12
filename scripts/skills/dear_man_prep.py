"""DEAR MAN's prep (DBT IE Handouts 4, 5, 5a and 8; PRD IE-01 Mode B, *Plan a conversation*) as a skill on the runtime:
`dear_man_prep` under the `dear-man` tool id (IE-B4 first PR, D11: the third of three skills under the one id;
docs/design/dear-man-prep.md). The port of the hand-built page (`DearManPrep` in src/pages/tools/DearMan.tsx), with
the pieces it had, re-voiced, and the pocket card (Mode C) at the end.

  situation   what kind of conversation? ask · boundary · something that happened · a pattern (DearManSituationType)
  matters     what matters most here? (Handout 4's three priorities: one pick, IE-07's ask column in one tap)
  hard        what makes it hard? (DearManBarrier, own words too)
  who         parts on, with a kept part: who might show up in it? (Cope Ahead's parts step and the part's anchor)
  describe    what happened, the facts (DearManDescribeOption for the situation, own words)
  express     how it feels (DearManFeelingChip; the mirror line for the description; a word carried in comes first)
  assert      what you're asking for (DearManAssertOption for the situation, one ask) → fill when it has a blank
  reinforce   why it's good for them too (DearManReinforceOption)
  mindful     what do you need to hear? (the coaching for the barrier picked first, as a line) → a phrase
  confident   one thing for your body before you start (ConfidenceCue)
  middle      if they push back: a middle ground (with the priority's hint) → walk away (what you won't accept)
  card        the pocket card (Mode C): three cards, say it · stay steady · if they push back; Copy
  hot         only when the body is running hot: *Your plan is ready. Heads up: it's still loud in there.* (never a lock)
  edge        thirty seconds of breathing out longer (`breathPacer`), then the plan once more
  when        *When is the conversation?* (`ask_outcome`: the card opens the debrief, which finds this plan)

The page (src/components/tools/dearMan/DearManPrepSkill.tsx) asks who first (PersonFirstSkill, people.md): someone on the
safety route gets the safety screen and never this skill; *it tends to go badly* comes in as `$ctx.frame = heads_up`
and a refused ask to be heard as `$ctx.refused`. Recover's *Ask them* (not the chase pull) opens it with the situation
(`address`), the feeling chip its word matches and the band. The projection (functions/src/dearMan/prepProjection.ts)
writes the `DearManSession {type: 'prep', mode: 'plan'}` the debrief, History and Reflect read, from option ids only.

Content: the options are DEAR MAN's own graph nodes (`PRESENTS`), with labels re-voiced here where the graph's predate
the voice contract (scripts/dear-man/content.py keeps the ids and the old labels for the sessions that point at them).

Regenerate:  python3 scripts/skills/build.py > /tmp/s.cypher && mv /tmp/s.cypher schema/skills.cypher
             python3 scripts/skills/fixture.py --ship
"""
import importlib.util
import os

HERE = os.path.dirname(os.path.abspath(__file__))
_spec = importlib.util.spec_from_file_location("dear_man_content", os.path.join(os.path.dirname(HERE), "dear-man", "content.py"))
DM = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(DM)

ID = "dear_man_prep"
TOOL_ID = "dear-man"
CONCEPT = "dbt_dear_man"
VERSION = "dm-prep-v1"
OWN_MAX = 140


def a(field):
    return f"$a.{field}"


def is_(field, v):
    return {"eq": [a(field), v]}


def has(field, v):
    return {"has": [f"$a.{field}.ids", v]}


HEADS_UP = {"eq": ["$ctx.frame", "heads_up"]}
REFUSED = {"eq": ["$ctx.refused", "validation"]}
# The plan's heads-up for a carried stirred or flooded reading (a much-quieter P2 reread drops the band).
HOT = {"in": ["$ctx.band", ["stirred", "flooded"]]}
# A carried flooded reading: the body first is offered on the first screen (BandRule dear-man flooded → hand-off), never a gate.
FLOODED = {"eq": ["$ctx.band", "flooded"]}
# *I'm scared of what they'd do* (D4 again, inside the plan): the other-person resources, no plan.
SCARED = {"has": ["$a.hard.ids", "scared"]}
OTHER_PERSON = [{"variant": "other_person", "when": SCARED}]
# Asks to be heard: where a counted refusal offers Let go (IE-B2).
HEARD_SITUATIONS = ["address", "pattern"]

PICKER_KEYS = [
    "personWho", "personNew", "personNameLabel", "personNameHint", "personRoleLabel", "personKeepLine", "personNoNameLine",
    "personSignedOutLine", "personGoOn", "personChanged", "personChangedHint", "safeQuestion", "safeYes", "safeNo",
    "safeUnsure", "riskQuestion", "riskHarm", "riskBadly", "riskUnsaid",
    "safetyRouteHeading", "safetyRouteBody", "safetyRouteEnding", "safetyRouteBack",
]
PICKER_COPY = {f"picker_{k}": DM.SAFETY_COPY[k] for k in PICKER_KEYS}

# ---- Re-voiced labels (ids are DEAR MAN's; the graph keeps its old labels for old sessions) ----------------------
SITUATIONS = [
    ("ask", "I need to ask for something"),
    ("boundary", "I need to set or hold a limit"),
    ("address", "I need to bring up something that happened"),
    ("pattern", "I need to bring up something that keeps happening"),
]
DESCRIBE = {
    "ask_need_help": "I need help with something and haven't asked yet",
    "ask_not_working": "Something about how we do things isn't working for me",
    "ask_time_space": "I need time, space or some give on something",
    "ask_support": "I'm going through something and need their support",
    "bound_unnamed_line": "They keep crossing a line I haven't said out loud",
    "bound_new_thing": "Something new happened that I'm not okay with",
    "bound_pressure": "They've asked more than once for something I've said no to",
    "bound_overcommit": "I said yes to something and need to change that",
    "addr_broke_promise": "They said they'd do something, and it didn't happen",
    "addr_hurtful": "Something they said or did hurt, and they didn't seem to notice",
    "addr_dismissed": "I told them how I felt and the talk moved on without it",
    "addr_no_consult": "A decision that affects me got made without me",
    "patt_keeps_doing": "Something I've asked them to stop keeps happening",
    "patt_shuts_down": "The last few times I brought this up, it ended in silence or shouting",
    "patt_avoids": "When I try to bring it up, the subject changes",
    "patt_one_sided": "I'm usually the one who reaches out or makes plans",
}
# Express: the chips (one source for the ids), the labels as the graph has them.
FEELINGS = [(c["id"], c["label"]) for c in sorted(DM.FEELING_CHIPS + DM.FEELING_CHIPS_V2, key=lambda c: c["sort"])]
# The mirror line for a description (and per situation, for own words): what people often feel. Re-voiced.
MIRROR = {
    "ask_need_help": "Needing help you haven't asked for often brings overwhelm, a worry about being a burden, and sometimes quiet resentment.",
    "ask_not_working": "When how you do things isn't working, people often feel frustrated, unheard, a bit trapped.",
    "ask_time_space": "Needing time or space you don't have tends to leave people worn out, often with some guilt about wanting it.",
    "ask_support": "Needing support through something hard often comes with loneliness, sadness, and a fear of pushing them away.",
    "bound_unnamed_line": "When a line you haven't named keeps getting crossed, resentment tends to build quietly, along with feeling disrespected.",
    "bound_new_thing": "When something new isn't okay with you, hurt or feeling disrespected is common, and nerves about what to say.",
    "bound_pressure": "Being pressed to do something you don't want to do can feel like being cornered: frustrated, anxious, resentful.",
    "bound_overcommit": "Taking back a yes often brings guilt, worry about letting them down, and tiredness from carrying it.",
    "addr_broke_promise": "When someone doesn't follow through, disappointment often comes first, then frustration, sometimes hurt.",
    "addr_hurtful": "When a hurt goes unnoticed, the hurt is right there, often with feeling invisible, sometimes anger.",
    "addr_dismissed": "Opening up and being brushed aside often leaves people feeling unheard, hurt, then angry.",
    "addr_no_consult": "A decision made without you often leaves people feeling disrespected, invisible, a bit helpless.",
    "patt_keeps_doing": "When it keeps happening after you've asked, frustration and resentment are very common.",
    "patt_shuts_down": "When it ends badly every time, people often feel helpless and worn out before they start.",
    "patt_avoids": "When the conversation keeps getting avoided, people often feel unheard, invisible, lonely in it.",
    "patt_one_sided": "When effort feels one-sided, resentment and tiredness tend to build, and sadness underneath.",
}
MIRROR_SITUATION = {
    "ask": "Asking for something often brings worry about how it'll land, and sometimes guilt for needing it.",
    "boundary": "Setting a limit often comes with guilt and worry about their reaction, on top of what made it necessary.",
    "address": "Bringing something up often has some hurt underneath, some frustration, and nerves about reopening it.",
    "pattern": "A pattern that keeps repeating often leaves people worn out, unheard, with resentment built up.",
}
# Assert: the label's [blank] is filled on the next screen (`fill`), with the graph's own prompt as the question.
ASSERTS = {
    "ask_specific_help": "I'd like help with [this]",
    "ask_flexibility": "I need some give on [this]",
    "ask_change_how": "I'd like us to change how we handle [this]",
    "ask_just_listen": "I need you to listen and be with me in this, not fix it",
    "bound_stop_behavior": "I need you to stop [this]",
    "bound_respect_no": "I need you to respect my decision about [this]",
    "bound_cant_do": "I'm not able to do [this], and I need that to be okay",
    "bound_need_space": "I need space when [this happens]",
    "addr_follow_through": "I need you to follow through on what you said you'd do",
    "addr_acknowledge": "I need you to see what happened and how it affected me",
    "addr_check_first": "I'd like you to check with me before deciding things that affect me",
    "addr_hear_me": "I need you to hear me out before you answer",
    "patt_actually_stop": "I need this to change, not only be talked about",
    "patt_stay_in_it": "I need you to stay in the conversation when it's uncomfortable",
    "patt_more_effort": "I need more effort from you with [this]",
    "patt_new_approach": "I need us to find a different way to handle this",
}
# Asks to be heard (the debrief counts a refusal by the situation; Let go sits beside them, never in the way).
HEARD_ASKS = {"ask_just_listen", "addr_acknowledge", "addr_hear_me", "patt_stay_in_it"}
# The fill-in prompt per ask with a blank (the graph's elaboratePrompt, re-voiced where needed).
FILL = {
    "ask_specific_help": "What kind of help, and by when?",
    "ask_flexibility": "What would that look like in practice?",
    "ask_change_how": "What would you like to be different?",
    "bound_stop_behavior": "What do you need them to stop?",
    "bound_respect_no": "Which decision?",
    "bound_cant_do": "What aren't you able to do?",
    "bound_need_space": "When do you need the space?",
    "patt_more_effort": "What would more effort look like, plainly?",
}
# Starters for the fill-in box (a tap writes them in to change; own.seed), two per ask with a blank.
FILL_STARTERS = {
    "ask_specific_help": ["the shopping this week", "the move on Saturday"],
    "ask_flexibility": ["my hours on Fridays", "the deadline, by a few days"],
    "ask_change_how": ["who does the evenings", "how we split the money"],
    "bound_stop_behavior": ["checking my phone", "talking over me"],
    "bound_respect_no": ["not coming this weekend", "not lending the money"],
    "bound_cant_do": ["the late shifts", "hosting this year"],
    "bound_need_space": ["I get home from work", "we've argued"],
    "patt_more_effort": ["making plans", "staying in touch"],
}
REINFORCE = [(r["id"], r["label"]) for r in DM.REINFORCE_OPTIONS]
BARRIERS = [
    ("barrier_angry", "I'm afraid they'll get angry"),
    ("barrier_dont_know", "I don't know how to say it"),
    ("barrier_guilty", "I feel guilty asking"),
    ("barrier_tried_before", "I've tried before and it didn't work"),
    ("barrier_emotional", "I'm worried I'll get emotional"),
    ("barrier_no_right", "I don't feel I have the right to ask"),
]
# Not a barrier to plan around: the person may not be safe with them (Say no's *scared of what they'd do*).
SCARED_OPTION = ("scared", "I'm scared of what they'd do")
# The coaching for the first barrier picked (in BARRIERS order), as the anchor screen's question. Re-voiced.
COACHING = {
    "barrier_angry": "If they get defensive: that's their feeling, not proof you're wrong. You can name it and come back to what you need.",
    "barrier_dont_know": "If you blank: you've built your plan, and it's fine to glance at it. You can say you wrote it down because it matters.",
    "barrier_guilty": "If guilt shows up, it may tell you to back down or apologise for having needs. Notice it, and stay with your ask.",
    "barrier_tried_before": "If your mind pulls you to the last five times, come back to this conversation, this ask, now.",
    "barrier_emotional": "If tears or a shaky voice come, take a breath. You can say this is hard to say and you want to get through it.",
    "barrier_no_right": "If you start doubting yourself: you don't have to earn the right to need things. Asking clearly is respectful.",
}
# IE-12: the myths about asking (DBT IE Handout 2a and the PRD), on their own light screen after the barriers. Each one's
# coaching is received, not argued with, and comes before a barrier's on the anchor screen.
MYTHS = [(m["id"], m["label"]) for m in DM.MYTHS]
MYTH_COACHING = {
    "myth_deserve": "Feeling undeserving makes sense. You can feel it and still ask, if you choose to.",
    "myth_weak": "Needing things is human. Saying it plainly takes steadiness.",
    "myth_matter": "A no can be about this ask, on this day. It doesn't decide what you're worth.",
    "myth_know": "Wanting them to know without asking is so human. People can care and still not guess.",
    "myth_sure": "Nobody gets to know the answer first. You can ask and find out.",
    "myth_alone": "Needing someone for this doesn't make you less.",
    "myth_last": "Your needs can sit next to theirs. Asking is how they get a place.",
}
COACHING_DEFAULT = "The hard part is staying with it when it gets uncomfortable. When your mind races or shuts down, come back to one line."
NEEDS = [(n["id"], n["label"]) for n in sorted(DM.ANCHOR_NEEDS, key=lambda n: n["sort"])]
PHRASES = [(p["id"], p["label"], p["needs"]) for p in sorted(DM.ANCHOR_PHRASES, key=lambda p: p["sort"])]
CUES = [(c["id"], c["label"]) for c in sorted(DM.CONFIDENCE_CUES, key=lambda c: c["sortOrder"])]
MIDDLE = [
    ("neg_partial", "They do part of it, not all of it"),
    ("neg_trial", "They try it for a while and we check back in"),
    ("neg_third_option", "We find a third option together"),
]
WALK = [
    ("neg_feelings_dismissed", "Being told my feelings don't matter"),
    ("neg_yelled_at", "Being yelled at or shut down"),
    ("neg_no_change", "The same thing happening again with no change"),
    ("neg_give_up_ask", "Giving up on the ask completely"),
]
MATTERS = [
    ("objective", "Getting what I'm asking for"),
    ("relationship", "Keeping things good between us"),
    ("self_respect", "Keeping my self-respect"),
]
HOT_CHOICES = [("edge", "Take the edge off (about 30 seconds)"), ("ready", "I'm good to go")]
# The ask_outcome card's window chips (scripts/practice-spine/content.py).
WHEN = [("today", "Later today"), ("tomorrow", "Tomorrow"), ("this_week", "This week"), ("unsure", "Not sure")]

COPY = {
    "situation_title": "What kind of conversation is this?",
    "situation_title_heads_up": DM.SAFETY_COPY["badlyHeadsUp"] + " What kind of conversation is this?",
    "debrief_link": "I've already had the conversation",
    "cool_down": "Settle my body first",
    "scared_line": "Your safety comes first. You don't have to plan this conversation. The people below can help, any time.",
    "matters_title": "What matters most to you here?",
    "matters_hint": "If it gets tough, this is what you'll protect.",
    "hard_title": "What makes this hard?",
    "hard_hint": "Pick any that fit.",
    "thought_title": "Do any of these thoughts show up too?",
    "thought_hint": "Pick up to two, or none.",
    "who_title": "Who might show up in this conversation?",
    "describe_title": "What happened? Say it the way a camera would see it.",
    "describe_hint": "Facts are harder to argue with than judgements.",
    "express_title": "How does it feel?",
    "express_hint": "Naming it helps them see this matters.",
    "assert_title": "What are you asking for?",
    "assert_hint": "A clear ask is easier to say yes to.",
    "assert_title_heads_up": "What's the one practical thing you're asking for?",
    "fill_title": "Say it plainly.",
    "reinforce_title": "What would be better for them, or for you both, if they said yes?",
    "reinforce_hint": "This is the step most people skip. It helps them listen.",
    "mindful_title": "What do you need to hear in that moment?",
    "coach_default": COACHING_DEFAULT,
    "phrase_title": "Pick the line you'll say to yourself, or make it yours.",
    "phrase_hint": "Short enough to fit in one breath.",
    "confident_title": "Your body can help. One thing to do before you start?",
    "confident_hint": "Even when you don't feel confident.",
    "middle_title": "If they push back, what middle ground could you live with?",
    "middle_title_objective": "Getting what you need comes first, so know the part you won't give on. If they push back, what middle ground could you live with?",
    "middle_title_relationship": "Keeping things good comes first, so you can give on details, as long as you feel heard. What middle ground could you live with?",
    "middle_title_self_respect": "Your self-respect comes first, so notice any pressure to agree to what doesn't sit right. What middle ground could you live with?",
    "walk_title": "What won't you accept?",
    "walk_hint": "Knowing this ahead makes it easier to stop or step away.",
    "card_title": "Your plan, on three cards.",
    "card_say": "Say it",
    "card_steady": "Stay steady",
    "card_push": "If they push back",
    "card_prev": "Previous card",
    "card_skip": "Done with the cards",
    "card_felt": "I felt",
    "card_middle": "Middle ground I could live with",
    "card_walk": "I won't accept",
    "card_drift": "If it drifts: say the ask again, same words.",
    "card_attack": "If they attack: you don't have to answer it. Come back to the ask.",
    "card_next_card": "Next card",
    "copy": "Copy",
    "copied": "Copied",
    "selected": "Selected. Copy it from here.",
    "next": "Next",
    "hot_title": DM.SAFETY_COPY["hotHeading"],
    "hot_hint": "When it's loud inside, even a good plan can come out sharper than you mean. Taking the edge off first can help it land.",
    "edge_step1": DM.SAFETY_COPY["hotBodyCue"],
    "edge_start": "Start",
    "edge_in": "In",
    "edge_out": "Out, longer",
    "edge_dizzy": "Feeling dizzy? Stop and breathe normally.",
    "edge_done": "That's the edge off. Read your plan once more, out loud if you can.",
    "edge_next": "Back to my plan",
    "again_title": "Your plan, once more.",
    "when_label": DM.SAFETY_COPY["askOutcomeQuestion"],
    "when_line": "You've planned what to say, what matters most, and what you'll do if it gets hard.",
    "when_line_badly": "You're going in knowing it might not go well. Keep it short, about one thing, and look after yourself after.",
    "own_line": "In my own words",
    "let_go": "I've asked them to hear me before. Look at letting this one go",
    **{f"mirror_{k}": v + " Only keep what fits." for k, v in MIRROR.items()},
    **{f"mirror_sit_{k}": v + " Only keep what fits." for k, v in MIRROR_SITUATION.items()},
    **{f"coach_{k}": v for k, v in COACHING.items()},
    **{f"coach_{k}": v for k, v in MYTH_COACHING.items()},
    **{f"fill_{k}": v for k, v in FILL.items()},
    **PICKER_COPY,
}

SIT_WHERE = {"eq": ["$opt.situation", "$a.situation"]}
ASSERT_WHERE = {"all": [SIT_WHERE, {"any": [{"not": HEADS_UP}, {"not": {"eq": ["$opt.heard", True]}}]}]}
CARD = {
    "say": ["describe", "express", "assert", "reinforce"], "fill": "assert", "detail": "fill",
    "steady": ["phrase", "confident"], "push": ["middle", "walk"],
    "sayLabel": "card_say", "steadyLabel": "card_steady", "pushLabel": "card_push",
    "prevLabel": "card_prev", "nextCardLabel": "card_next_card",
    "copyLabel": "copy", "copiedLabel": "copied", "selectedLabel": "selected", "next": "next", "skipLabel": "card_skip",
    "joinField": "express", "joinLead": "card_felt",
    "labelAField": "middle", "labelA": "card_middle", "labelBField": "walk", "labelB": "card_walk",
    # Handout 5's Mindful: the broken record and ignoring attacks, on the card the person holds in the moment.
    "steadyNoteA": "card_drift", "steadyNoteB": "card_attack",
}

STEPS = [
    {
        "id": "situation", "kind": "ask", "title": [{"key": "situation_title_heads_up", "when": HEADS_UP}, {"key": "situation_title"}],
        "fields": [{"id": "situation", "options": {"list": "situation", "firstFrom": "$ctx.situationId"}, "max": 1, "required": True,
                    # The old page's first screen asked prep or debrief; the debrief is one quiet link away.
                    "links": [{"exit": "debrief", "label": "debrief_link", "when": {"all": []}},
                              {"exit": "cool_down", "label": "cool_down", "when": FLOODED}]}],
        "next": [{"to": "matters"}],
    },
    {
        "id": "matters", "kind": "ask", "title": "matters_title", "hint": "matters_hint",
        "fields": [{"id": "matters", "options": {"list": "matters"}, "max": 1, "required": True}],
        "next": [{"to": "hard"}],
    },
    {
        "id": "hard", "kind": "ask", "title": "hard_title", "hint": "hard_hint",
        "fields": [{"id": "hard", "options": {"list": "hard"}, "max": 3,
                    "own": {"hint": "own_line", "countsAsPick": True, "max": 30}}],
        "crisis": OTHER_PERSON,
        # Scared of them: no plan, the safety screen. Parts on, with a kept part: who might show up (the parts slice is
        # empty with parts off).
        "next": [{"when": SCARED, "to": "scared"}, {"to": "thought"}],
    },
    # IE-12: the thoughts about asking that make it hard (the graph calls them myths; the screen never does).
    # Optional, and its own screen so the barriers' safety option keeps its banner in view.
    {
        "id": "thought", "kind": "ask", "title": "thought_title", "hint": "thought_hint",
        "fields": [{"id": "thought", "options": {"list": "thought"}, "max": 2}],
        # Who might show up: parts on with a kept part, and never on a carried flooded reading (the old page's
        # showCopeAhead rule, Gate 3 on the page's deletion).
        "next": [{"when": {"all": [{"set": "$p.parts"}, {"not": FLOODED}]}, "to": "who"}, {"to": "describe"}],
    },
    {
        "id": "scared", "kind": "handoff", "complete": True, "noClose": True,
        "crisis": [{"variant": "other_person", "when": {"all": []}}],
        "lines": [{"when": None, "key": "scared_line"}],
        "offers": [{"exit": "safety_open", "when": None}, {"exit": "ending_careful", "when": None}],
        "done": "done",
    },
    {
        "id": "who", "kind": "ask", "title": "who_title",
        "slots": [{"after": "$title", "embed": "partsLine", "props": {"promptId": "cope_title_any", "as": "heading"},
                   "showWhen": {"set": "$p.parts"}, "record": "parts_title"},
                  {"after": "part", "embed": "partAnchor", "props": {"partField": "part"}, "showWhen": {"set": a("part")}, "record": "part_anchor"}],
        "fields": [{"id": "part", "options": {"profile": "parts"}, "max": 1}],
        "next": [{"to": "describe"}],
    },
    {
        "id": "describe", "kind": "ask", "title": "describe_title", "hint": "describe_hint",
        "fields": [{"id": "describe", "options": {"list": "describe", "where": SIT_WHERE}, "max": 1, "required": True,
                    "own": {"hint": "own_line", "countsAsPick": True, "max": 60}}],
        "next": [{"to": "express"}],
    },
    {
        "id": "express", "kind": "ask", "title": "express_title",
        # What people often feel here, as a line to take or leave (the old page kept it behind a toggle).
        "lines": ([{"key": f"mirror_{k}", "when": is_("describe", k)} for k in MIRROR]
                  + [{"key": f"mirror_sit_{k}", "when": is_("situation", k)} for k in MIRROR_SITUATION]),
        "hint": "express_hint",
        "fields": [{"id": "express", "options": {"list": "express", "firstFrom": "$ctx.feelingId"}, "max": 3, "required": True}],
        "next": [{"to": "assert"}],
    },
    {
        "id": "assert", "kind": "ask", "title": [{"key": "assert_title_heads_up", "when": HEADS_UP}, {"key": "assert_title"}],
        "hint": "assert_hint",
        "fields": [{"id": "assert", "options": {"list": "assert", "where": ASSERT_WHERE}, "max": 1, "required": True,
                    "own": {"hint": "own_line", "countsAsPick": True, "max": 70},
                    "links": [{"exit": "let_go", "label": "let_go",
                               "when": {"all": [REFUSED, {"in": [a("situation"), HEARD_SITUATIONS]}]}}]}],
        "next": [{"when": {"in": [a("assert"), sorted(FILL)]}, "to": "fill"}, {"to": "reinforce"}],
    },
    {
        "id": "fill", "kind": "ask",
        "title": [{"key": f"fill_{k}", "when": is_("assert", k)} for k in FILL] + [{"key": "fill_title"}],
        "fields": [{"id": "fill", "options": {"list": "fill", "where": {"eq": ["$opt.assert", "$a.assert"]}}, "max": 1, "required": True,
                    "own": {"hint": "own_line", "countsAsPick": True, "max": 30, "open": True, "seed": True}}],
        "next": [{"to": "reinforce"}],
    },
    {
        "id": "reinforce", "kind": "ask", "title": "reinforce_title", "hint": "reinforce_hint",
        "fields": [{"id": "reinforce", "options": {"list": "reinforce"}, "max": 2,
                    "own": {"hint": "own_line", "countsAsPick": True, "max": 35}}],
        "next": [{"to": "mindful"}],
    },
    # Mindful (stay on track): the coaching for the first barrier picked is the screen's question, then what to hear.
    {
        "id": "mindful", "kind": "ask", "title": "mindful_title",
        "lines": [{"key": f"coach_{k}", "when": is_("thought", k)} for k, _ in MYTHS]
        + [{"key": f"coach_{k}", "when": is_("hard", k)} for k, _ in BARRIERS] + [{"key": "coach_default", "when": None}],
        "fields": [{"id": "need", "options": {"list": "need"}, "max": 1, "required": True}],
        "next": [{"to": "phrase"}],
    },
    {
        "id": "phrase", "kind": "ask", "title": "phrase_title", "hint": "phrase_hint",
        "fields": [{"id": "phrase", "options": {"list": "phrase", "where": {"has": ["$opt.needs", "$a.need"]}}, "max": 1,
                    "required": True, "own": {"hint": "own_line", "countsAsPick": True, "max": 30}}],
        "next": [{"to": "confident"}],
    },
    {
        "id": "confident", "kind": "ask", "title": "confident_title", "hint": "confident_hint",
        "fields": [{"id": "confident", "options": {"list": "confident"}, "max": 1}],
        "next": [{"to": "middle"}],
    },
    {
        "id": "middle", "kind": "ask",
        "title": [{"key": f"middle_title_{k}", "when": is_("matters", k)} for k, _ in MATTERS] + [{"key": "middle_title"}],
        "fields": [{"id": "middle", "options": {"list": "middle"}, "max": 1,
                    "own": {"hint": "own_line", "countsAsPick": True, "max": 35}}],
        "next": [{"to": "walk"}],
    },
    {
        "id": "walk", "kind": "ask", "title": "walk_title", "hint": "walk_hint",
        "fields": [{"id": "walk", "options": {"list": "walk"}, "max": 1,
                    "own": {"hint": "own_line", "countsAsPick": True, "max": 35}}],
        "next": [{"to": "card"}],
    },
    {
        "id": "card", "kind": "embed", "embed": "pocketCard", "title": "card_title", "answerAs": "card_how",
        "props": CARD,
        # The heads-up comes after the plan is built, never before it (Claudia, 30 Sep: planning is a thinking moment).
        "next": [{"when": HOT, "to": "hot"}, {"to": "when"}],
    },
    {
        "id": "hot", "kind": "ask", "title": "hot_title", "hint": "hot_hint",
        "fields": [{"id": "hot", "options": {"list": "hot"}, "max": 1, "required": True,
                    "links": [{"exit": "cool_down", "label": "cool_down", "when": FLOODED}]}],
        "next": [{"when": is_("hot", "edge"), "to": "edge"}, {"to": "when"}],
    },
    {
        "id": "edge", "kind": "embed", "embed": "breathPacer", "answerAs": "edge_how",
        "props": {"seconds": 30, "inSec": 4, "outSec": 6, "step1": "edge_step1", "start": "edge_start", "inLabel": "edge_in",
                  "outLabel": "edge_out", "dizzy": "edge_dizzy", "done": "edge_done", "next": "edge_next"},
        "next": [{"to": "again"}],
    },
    {
        "id": "again", "kind": "embed", "embed": "pocketCard", "title": "again_title", "answerAs": "again_how",
        "props": CARD,
        "next": [{"to": "when"}],
    },
    {
        "id": "when", "kind": "handoff", "complete": True,
        "lines": [{"when": HEADS_UP, "key": "when_line_badly"}, {"when": None, "key": "when_line"}],
        "fields": [{"id": "when", "label": "when_label", "max": 1, "options": {"list": "when"}}],
        "followUp": {"type": "ask_outcome", "whenFrom": "when"},
        # The old summary's *Rehearse it*: Cope Ahead for a conversation, with the part picked in `who`. Notice them
        # (IE-10): the PRD's optional *their side*, as an offer here, not a step inside the plan.
        "offers": [{"exit": "cope_ahead", "when": None}, {"exit": "notice_them", "when": None}], "done": "done",
    },
]

EXITS = [
    {"id": "debrief", "toolId": "dear-man", "query": {"mode": "debrief"}},
    {"id": "let_go", "toolId": "fast", "query": {"frame": "let_go"}},
    {"id": "cool_down", "toolId": "cool-down"},
    {"id": "cope_ahead", "toolId": "cope-ahead", "query": {"situationId": "conversation", "partId": "$a.part"}},
    {"id": "notice_them", "toolId": "mindfulness-of-others", "query": {"situationId": "notice", "person": "$ctx.personId"}},
    {"id": "ending_careful", "toolId": "ending-relationships", "query": {"frame": "careful"}},
    {"id": "safety_open", "toolId": None, "safety": True},
    {"id": "done", "done": True},
]


def options():
    sit = {o["id"]: o for o in DM.SITUATION_TYPES}
    out = [("situation", v, l, {}, ("DearManSituationType", v)) for v, l in SITUATIONS]
    out += [("matters", v, l, {}, None) for v, l in MATTERS]
    out += [("hard", v, l, {}, ("DearManBarrier", v)) for v, l in BARRIERS]
    out += [("thought", v, l, {}, ("DearManBarrier", v)) for v, l in MYTHS]
    out += [("hard", SCARED_OPTION[0], SCARED_OPTION[1], {}, None)]
    for s_id, rows in DM.DESCRIBE_OPTIONS.items():
        assert s_id in sit
        out += [("describe", r["id"], DESCRIBE[r["id"]], {"situation": s_id}, ("DearManDescribeOption", r["id"])) for r in rows]
    # `emotion`: the word the visit names (the session's emotion ids; the old page sent the chip's label).
    out += [("express", v, l, {"emotion": l.lower().replace(" ", "_")}, ("DearManFeelingChip", v)) for v, l in FEELINGS]
    for s_id, rows in DM.ASSERT_OPTIONS.items():
        out += [("assert", r["id"], ASSERTS[r["id"]], {"situation": s_id, "heard": r["id"] in HEARD_ASKS},
                 ("DearManAssertOption", r["id"])) for r in rows]
    out += [("fill", f"{k}_{i}", l, {"assert": k}, None) for k, ls in FILL_STARTERS.items() for i, l in enumerate(ls)]
    out += [("reinforce", v, l, {}, ("DearManReinforceOption", v)) for v, l in REINFORCE]
    out += [("need", v, l, {}, ("DearManAnchorNeed", v)) for v, l in NEEDS]
    out += [("phrase", v, l, {"needs": n}, ("DearManAnchorPhrase", v)) for v, l, n in PHRASES]
    out += [("confident", v, l, {}, ("ConfidenceCue", v)) for v, l in CUES]
    out += [("middle", v, l, {}, ("DearManNegotiateOption", v)) for v, l in MIDDLE]
    out += [("walk", v, l, {}, ("DearManNegotiateOption", v)) for v, l in WALK]
    out += [("hot", v, l, {}, None) for v, l in HOT_CHOICES]
    out += [("when", v, l, {}, None) for v, l in WHEN]
    return out


SKILL = {
    "id": ID, "toolId": TOOL_ID, "concept": CONCEPT, "version": VERSION, "start": "situation", "ownMax": OWN_MAX,
    "accepts": ["personId", "frame", "band", "refused", "situationId", "feelingId"], "copy": COPY,
    "tables": {}, "derive": [],
    "steps": STEPS, "exits": EXITS, "options": options(), "emotionFields": ["express"],
}
