"""Keep it warm (GIVE; DBT IE Handouts 6 and 6a; PRD IE-06) as a skill on the runtime: `give` under the new `give`
tool id (IE-B4; docs/design/give.md).

  what         what's going on with them? Four ways in, one tap:
                 someone brought something to me · repair after a fight · it's heating up (break and return) ·
                 an ask I want to keep warm. `?situationId=` puts one first (never picked for them). A carried
                 flooded reading offers break and return only (PRD: you can't validate from flooded)

  brought      what did they bring? → their side first (Validate: one line for how they feel, Interested: one
               question) → then yours (FAST: you can hear them and still disagree) → the pocket card (theirs ·
               stay steady, with *let them finish* and *can I take a minute?* · then mine), and an ask of your own
               (One message)
  repair       did it get physical, or are you scared of them? (either → the other-person resources, no repair, Ending
               in its careful frame) · was it yours? (the guilt check, inline until Check the Facts' mini-card ships):
                 yours or partly → one acknowledgement (one sorry, for what you did), a line for them, one question
                   about what would help → the message card → *Want me to ask how it went?* (`repair_outcome`)
                 not yours → the FAST line: you don't owe a sorry for having a need; something warm without one
  break        how long, and the line with the time in it (*I'm coming back to this in an hour*), copied from the
               boundary card. The return time is the skill (unannounced breaks read as abandonment): the
               `break_return` card comes at that time and reopens the run at *Did you go back?*
  before_ask   GIVE's four rows in under a minute (Gentle swaps, an Interested question, a Validate line, an Easy
               manner), willing hands for the body cue, the pocket card, then One message or the prep

The page (src/pages/tools/Give.tsx) asks who first (PersonPicker, people.md): someone on the safety route gets the
safety screen and never this skill (PRD: keeping it warm isn't your job with someone who isn't safe); *it tends to go
badly* comes in as `$ctx.frame = heads_up`; two or more refused asks to be heard as `$ctx.refused = validation`
(GIVE for practical asks only, never as a way to earn being heard).

Regenerate:  python3 scripts/skills/build.py > /tmp/s.cypher && mv /tmp/s.cypher schema/skills.cypher
             python3 scripts/skills/fixture.py --ship
"""
import importlib.util
import os

HERE = os.path.dirname(os.path.abspath(__file__))
_spec = importlib.util.spec_from_file_location("dear_man_content", os.path.join(os.path.dirname(HERE), "dear-man", "content.py"))
DM = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(DM)

ID = "give"
TOOL_ID = "give"
CONCEPT = "dbt_give"
VERSION = "give-v1"
OWN_MAX = 140


def a(field):
    return f"$a.{field}"


def is_(field, v):
    return {"eq": [a(field), v]}


def in_(field, vs):
    return {"in": [a(field), vs]}


ALWAYS = {"all": []}
FLOODED = {"eq": ["$ctx.band", "flooded"]}
STIRRED = {"eq": ["$ctx.band", "stirred"]}
HEADS_UP = {"eq": ["$ctx.frame", "heads_up"]}
REFUSED = {"eq": ["$ctx.refused", "validation"]}
HURT = in_("fight", ["physical", "scared"])
# After a fight, the visit after a break or a repair, or someone angry at me: any answer that says it isn't safe with
# them goes to `scared` (the other-person resources, no repair, no close).
UNSAFE_BACK = is_("back", "unsafe")
UNSAFE_BETWEEN = is_("between", "unsafe")
UNSAFE_STILL = is_("still_ok", "unsafe")
UNSAFE_ANGRY = is_("angry_ok", "scared")
UNSAFE_REPAIRED = is_("repaired", "unsafe")
UNSAFE_BREAK = is_("not_safe", "unsafe")
OTHER_PERSON = [{"variant": "other_person", "when": HURT}]

PICKER_KEYS = [
    "personWhoGive", "personNew", "personNameLabel", "personNameHint", "personRoleLabel", "personKeepLine", "personNoNameLine",
    "personSignedOutLine", "personGoOn", "personChanged", "personChangedHint", "safeQuestion", "safeYes", "safeNo",
    "safeUnsure", "riskQuestion", "riskHarm", "riskBadly", "riskUnsaid",
    "safetyRouteGiveHeading", "safetyRouteBody", "safetyRouteEnding", "safetyRouteBack",
]
PICKER_COPY = {f"picker_{k}": DM.SAFETY_COPY[k] for k in PICKER_KEYS}

COPY = {
    "situation_title": "What's going on with them?",
    "situation_title_flooded": "Your body's running hot. A break you come back from can be the kind move right now.",
    "situation_hint": "Pick the one closest.",
    "cool_down": "Settle my body first",
    "next": "Next",
    "done": "Done",
    "copy": "Copy",
    "copied": "Copied",
    "selected": "Selected. Copy it from here.",
    "open_messages": "Open messages",
    # Stirred (PRD: GIVE after a one-line self-validation): your own side is held first.
    "stirred_line": "This is a lot to hold. Your side matters too, and it gets its turn.",
    # --- Someone brought something to me ---
    "brought_title": "What did they bring to you?",
    "their_title": "First, their side.",
    "their_hint": "Their feeling can make sense even when you see the facts differently.",
    "validate_label": "One line for how they feel",
    "interested_label": "One question to ask them",
    "own_line": "In my own words",
    "yours_title": "Then yours. You can hear them and still disagree.",
    "stance_label": "Where are you with it?",
    "angry_check_label": "Are you safe with them right now?",
    "mine_label": "Something of yours to say (optional)",
    "card_title": "Your lines for the conversation.",
    "card_theirs": "First, theirs",
    "card_steady": "Stay steady",
    "card_mine": "Then mine",
    "card_prev": "Back",
    "card_next_card": "Next card",
    "card_stance": "Where I stand",
    "card_heats": "If it heats up: I need half an hour. I'm coming back to this.",
    "card_finish": "Let them finish before you answer.",
    "brought_line": "Their feeling first, then yours. You don't have to agree with them to be kind.",
    "brought_line_disagree": "You can take their feeling seriously and still see it your way. Both can be true.",
    # --- Repair after a fight ---
    "fight_title": "Before the repair: did it get physical, or are you scared of them now?",
    "fight_hint": "However it went, you can answer honestly here.",
    "scared_line": "Someone's safety comes before any repair. The people above can help, any time, whichever side of it you're on.",
    "guilt_title": "Looking back, was some of it yours?",
    "guilt_hint": "Feeling bad and having done something wrong aren't always the same thing.",
    "check_facts": "Check the facts first",
    "guilt_unsure_line": "If you're not sure it was yours, checking the facts first can help.",
    "unsure_title": "Not sure is a fair answer. What would you like to do?",
    "ack_title": "One clear acknowledgement, for what you did. One sorry is enough.",
    "ack_title_unsure": "If some of it was yours, one acknowledgement for that part. One sorry is enough.",
    "ack_label": "What you'd own",
    "r_validate_label": "A line for how it was for them (optional)",
    "r_ask_label": "One question about what would help (optional)",
    "r_commit_label": "Something you'll do differently (optional)",
    "repair_msg_title": "Here's your repair.",
    "repair_explain": "Keep it to what you did. A long explanation can sound like an excuse.",
    "repair_again_label": "Want me to ask how it went?",
    "repair_sent_line": "Your repair is ready. When you say it is up to you.",
    "repair_sent_heads_up": "With them, short and in writing can be kinder for you both.",
    "no_sorry_title": "What would you say, without a sorry?",
    "no_sorry_title_unsure": "Something warm, without a sorry. What would you say?",
    "no_sorry_hint": "You don't owe an apology for having a need, or for a fair no.",
    "no_sorry_card_title": "Your line",
    "no_sorry_line": "Warm and steady. You can care about them and not apologise for what wasn't yours.",
    # Afterwards (the repair_outcome card reopens the run here)
    "repaired_title": "Did you get to say it?",
    "between_title": "How are things between you now?",
    "repaired_line": "You owned your part, and things feel okay again.",
    "repaired_line_shaky": "Repairs often take more than one go. Your part was the acknowledgement, and you did it.",
    "repaired_not_yet": "Not yet. Your words are still here when you're ready.",
    "repaired_not_ready": "You said your part. When they're ready to hear it is theirs.",
    # --- Break and return ---
    "break_title": "Say when you'll come back. A return time helps a break feel less like leaving.",
    "break_len_label": "How long?",
    "break_line_label": "What you'll say",
    "break_card_title": "Your line",
    "break_set_line": "Something that settles you can help more than the argument on replay. There'll be a card here when it's time.",
    "back_title": "Did you go back to it?",
    "back_hint": "Any answer is fine here.",
    "still_ok_title": "How are things between you now?",
    "back_line": "You came back when you said you would. That's what helps a break feel safe.",
    "back_line_shaky": "You came back when you said you would. If it still feels raw, a repair can come next.",
    "more_title": "That's okay. When will you go back?",
    "more_line": "There'll be a card here then.",
    "no_return_line": "Not going back to it is an answer too. You can choose what happens next with them.",
    "not_safe_label": "If it isn't safe",
    "refused_line": "You came back. That part was yours, and you did it. They may need longer.",
    # --- Before an ask: GIVE's four rows ---
    "gentle_title": "What would keep it warm while you ask?",
    "gentle_title_heads_up": "Short and plain with them, and a little warmth. What would help?",
    "refused_line_ask": "With them, this works best for practical asks. Being heard is something they haven't been able to give lately.",
    "swap_label": "Gentle: any sharp words to swap?",
    "g_question_label": "Interested: one question to ask them",
    "g_validate_label": "Validate: one line for their side",
    "manner_label": "Easy manner: how it sounds",
    "soft_title": "Easy manner starts in the body.",
    "soft_step1": "Let your hands rest open, palms up.",
    "soft_step2": "Soften your face and jaw.",
    "soft_step3": "Breathe out slowly once.",
    "soft_start": "Start",
    "soft_running": "Open hands, soft face",
    "soft_done": "Done",
    "gentle_card_title": "Take these into your ask.",
    "card_say": "Say",
    "card_how": "How",
    "card_ask_them": "Ask about them",
    "gentle_line": "The warmth goes in around the ask. The ask itself stays clear.",
    **PICKER_COPY,
}

SITUATION = [
    ("brought", "They brought something to me", False),
    ("repair", "We had a fight and I want to repair it", False),
    ("heated", "It's heating up and I need a break", True),
    ("before_ask", "I want to ask for something and keep it warm", False),
]
BROUGHT = [
    ("complaint", "A complaint about me"),
    ("request", "A request"),
    ("upset", "They're upset about something else"),
    ("angry", "They're angry at me"),
]
ALL_B = [b for b, _ in BROUGHT]
ANGRY_CHECK = [("safe", "Yes"), ("scared", "I'm scared of how angry they are")]
# Validation of others (PRD: WMP's forOther corpus, levels 1–5; D16: ships here, signed off with the skill, until the
# witness corpus has its own). One line per message (parentification risk: never a stack of them).
VALIDATE = [
    ("v_hear", "I can hear this has been hard for you.", ALL_B),
    ("v_sense", "It makes sense you'd feel that way.", ["complaint", "angry", "upset"]),
    ("v_matter", "I can tell this matters to you.", ["request", "complaint"]),
    ("v_lot", "That sounds like a lot.", ["upset"]),
    ("v_angry", "I get why you're angry.", ["angry", "complaint"]),
    ("v_told", "I'm glad you told me.", ALL_B),
]
INTERESTED = [
    ("q_like", "What's it been like for you?", ["complaint", "angry", "upset"]),
    ("q_help", "What would help from your side?", ["request", "upset", "complaint"]),
    ("q_more", "Can you tell me more?", ALL_B),
    ("q_need", "What do you need from me right now?", ["upset", "angry", "request"]),
]
STANCE = [
    ("agree", "I mostly agree with them"),
    ("partly", "I agree with some of it"),
    ("disagree", "I see it differently"),
    ("unsure", "I'm not sure yet"),
]
MINE = [
    ("m_sorry", "I'm sorry for my part in it.", ["agree", "partly"], ["complaint", "angry"]),
    ("m_my_side", "I see it a bit differently, and I'd like to tell you how.", ["partly", "disagree"], ALL_B),
    ("m_think", "Can I think about it and come back to you?", ["partly", "disagree", "unsure"], ALL_B),
    ("m_yes", "Yes, I can do that.", ["agree"], ["request"]),
    ("m_other", "I can't do that, and I'd like to help another way.", ["partly", "disagree"], ["request"]),
]
FIGHT = [("no", "No"), ("physical", "It got physical"), ("scared", "I'm scared of them")]
GUILT = [
    ("mine", "Yes, I did something I regret"),
    ("partly", "Some of it was mine"),
    ("not_mine", "No. I feel bad, and I don't think I did wrong"),
    ("unsure", "I'm not sure"),
]
UNSURE_WAY = [("own_part", "Own the part I'm sure of"), ("warm", "Say something warm, without a sorry")]
ACK = [
    ("a_said", "I'm sorry for what I said."),
    ("a_voice", "I'm sorry I raised my voice."),
    ("a_handled", "I didn't handle that well, and I'm sorry."),
    ("a_hurt", "I'm sorry I hurt you."),
]
R_VALIDATE = [
    ("rv_hurt", "I can see it hurt."),
    ("rv_sense", "It makes sense you're upset with me."),
    ("rv_hard", "That must have been hard to hear."),
]
# Repair's commitment (Linehan: acknowledge, repair, commit to doing it differently).
R_COMMIT = [
    ("rc_break", "Next time I'll take a break before it gets that heated."),
    ("rc_gentle", "I'll say it more gently next time."),
    ("rc_check", "I'll check in with you first next time."),
]
R_ASK = [
    ("ra_help", "What would help now?"),
    ("ra_need", "Is there something you need from me?"),
    ("ra_ready", "Can we talk about it when you're ready?"),
]
NO_SORRY = [
    ("ns_care", "I care about us, and I'd like to sort this out."),
    ("ns_didnt_like", "I didn't like how that went between us."),
    ("ns_calmer", "Can we talk when we're both calmer?"),
]
# The repair_outcome card's window chips (scripts/practice-spine/content.py). No chip: no card.
AGAIN = [("today", "This evening"), ("tomorrow", "Tomorrow"), ("this_week", "In a few days")]
REPAIRED = [("yes", "Yes"), ("not_yet", "Not yet"), ("wait", "They weren't ready to hear it"), ("unsafe", "I don't feel safe with them")]
BETWEEN = [("yes", "Okay"), ("shaky", "A bit shaky"), ("no", "Not okay yet"), ("unsafe", "I don't feel safe with them")]
# The break_return card's window chips: the line says the same time.
BREAK_LEN = [
    ("m30", "Half an hour"),
    ("m60", "An hour"),
    ("tomorrow", "Till tomorrow"),
]
BREAK_LINE = [
    ("l_30", "I need a break. I'm coming back to this in half an hour.", "m30"),
    ("l_60", "I need a break. I'm coming back to this in an hour.", "m60"),
    ("l_tom", "I need a break. Can we pick this up tomorrow?", "tomorrow"),
    ("c_30", "This matters to me, and I want to do it properly. Back in half an hour.", "m30"),
    ("c_60", "This matters to me, and I want to do it properly. Back in an hour.", "m60"),
    ("c_tom", "This matters to me, and I want to do it properly. Can we talk tomorrow?", "tomorrow"),
]
BACK = [("yes", "Yes"), ("not_yet", "Not yet"), ("they_didnt", "They didn't want to"), ("not_going", "I'm not going back to it for now"),
        ("unsafe", "I don't feel safe going back")]
# Gentle's swaps (Handout 6: no attacks, threats or judgments): the sharp word and its softer swap, on one chip.
SWAP = [
    ("s_always", "Swap \"You always…\" for \"Sometimes…\""),
    ("s_never", "Swap \"You never…\" for \"It's been a while since…\""),
    ("s_why", "Swap \"Why do you…\" for \"I noticed…\""),
    ("s_if", "Swap \"If you don't…\" for \"I'd like…\""),
]
G_QUESTION = [
    ("gq_been", "How's this been for you?"),
    ("gq_work", "What would work for you?"),
    ("gq_think", "What do you think?"),
]
G_VALIDATE = [
    ("gv_busy", "I know you've got a lot on."),
    ("gv_too", "I know this matters to you too."),
    ("gv_try", "I know you've been trying."),
]
# Easy manner (PRD: chips exclude sarcasm, so humour never reads as dismissal).
MANNER = [("lighter", "A lighter opener"), ("warmth", "A bit of warmth"), ("plain", "Keep it plain")]

BROUGHT_WHERE = {"has": ["$opt.about", a("brought")]}
STANCE_WHERE = {"has": ["$opt.stance", a("stance")]}
LEN_WHERE = {"eq": ["$opt.len", a("break_len")]}
SITUATION_WHERE = {"any": [{"not": FLOODED}, {"eq": ["$opt.flooded", True]}]}
STIRRED_LINE = [{"when": STIRRED, "key": "stirred_line"}]
CARD_COMMON = {"prevLabel": "card_prev", "nextCardLabel": "card_next_card", "copyLabel": "copy", "copiedLabel": "copied",
               "selectedLabel": "selected", "next": "next"}

STEPS = [
    {
        "id": "what", "kind": "ask",
        "title": [{"key": "situation_title_flooded", "when": FLOODED}, {"key": "situation_title"}],
        "lines": [{"when": {"not": FLOODED}, "key": "situation_hint"}],
        "fields": [{"id": "situation", "options": {"list": "situation", "where": SITUATION_WHERE, "firstFrom": "$ctx.situationId"},
                    "max": 1, "required": True,
                    "links": [{"exit": "cool_down", "label": "cool_down", "when": FLOODED}]}],
        "next": [{"when": {"any": [is_("situation", "heated"), FLOODED]}, "to": "break"},
                 {"when": is_("situation", "brought"), "to": "brought"},
                 {"when": is_("situation", "repair"), "to": "fight"},
                 {"to": "gentle"}],
    },
    # --- Someone brought something to me (PRD IE-06: their side first, then yours) ---
    {
        "id": "brought", "kind": "ask", "title": "brought_title", "lines": STIRRED_LINE,
        "fields": [{"id": "brought", "options": {"list": "brought"}, "max": 1, "required": True},
                   {"id": "angry_ok", "label": "angry_check_label", "options": {"list": "angry_ok"}, "max": 1, "required": True,
                    "showWhen": is_("brought", "angry")}],
        "crisis": [{"variant": "other_person", "when": UNSAFE_ANGRY}],
        "next": [{"when": UNSAFE_ANGRY, "to": "scared"}, {"to": "theirs"}],
    },
    {
        "id": "theirs", "kind": "ask", "title": "their_title", "hint": "their_hint",
        "fields": [
            {"id": "validate", "label": "validate_label", "options": {"list": "validate", "where": BROUGHT_WHERE}, "max": 1,
             "required": True, "own": {"hint": "own_line", "countsAsPick": True, "max": 36}},
            {"id": "interested", "label": "interested_label", "options": {"list": "interested", "where": BROUGHT_WHERE}, "max": 1},
        ],
        "next": [{"to": "yours"}],
    },
    {
        "id": "yours", "kind": "ask", "title": "yours_title",
        "fields": [
            {"id": "stance", "label": "stance_label", "options": {"list": "stance"}, "max": 1, "required": True},
            {"id": "mine", "label": "mine_label", "options": {"list": "mine", "where": {"all": [STANCE_WHERE, BROUGHT_WHERE]}}, "max": 1,
             "showWhen": {"set": a("stance")}},
        ],
        "next": [{"to": "b_card"}],
    },
    {
        "id": "b_card", "kind": "embed", "embed": "pocketCard", "title": "card_title", "answerAs": "b_card_how",
        "props": {"say": ["validate", "interested"], "steady": ["stance"], "push": ["mine"],
                  "sayLabel": "card_theirs", "steadyLabel": "card_steady", "pushLabel": "card_mine",
                  "labelAField": "stance", "labelA": "card_stance", "steadyNoteA": "card_finish", "steadyNoteB": "card_heats",
                  **CARD_COMMON},
        "next": [{"to": "b_end"}],
    },
    {
        "id": "b_end", "kind": "handoff", "complete": True,
        "lines": [{"when": is_("stance", "disagree"), "key": "brought_line_disagree"}, {"when": None, "key": "brought_line"}],
        "offers": [{"exit": "one_message", "when": None}, {"exit": "fast", "when": is_("stance", "disagree")}],
        "done": "done",
    },
    # --- Repair after a fight ---
    {
        # A fight can have been more than a fight. Hurt, or scared of them: no repair script (plan D4, C6.6).
        "id": "fight", "kind": "ask", "title": "fight_title", "hint": "fight_hint", "lines": STIRRED_LINE,
        "fields": [{"id": "fight", "options": {"list": "fight"}, "max": 1, "required": True}],
        "crisis": OTHER_PERSON,
        "next": [{"when": HURT, "to": "scared"}, {"to": "guilt"}],
    },
    {
        "id": "scared", "kind": "handoff", "complete": True, "noClose": True,
        "crisis": [{"variant": "other_person", "when": ALWAYS}],
        "lines": [{"when": None, "key": "scared_line"}],
        "offers": [{"exit": "safety_open", "when": None}, {"exit": "ending_careful", "when": None}],
        "done": "done",
    },
    {
        # The guilt check (PRD: ER's, via Check the Facts' inline mini-card once ER-B5 ships; asked plainly until then).
        "id": "guilt", "kind": "ask", "title": "guilt_title", "hint": "guilt_hint",
        "fields": [{"id": "guilt", "options": {"list": "guilt"}, "max": 1, "required": True}],
        "next": [{"when": is_("guilt", "not_mine"), "to": "no_sorry"}, {"when": is_("guilt", "unsure"), "to": "unsure"},
                 {"to": "owning"}],
    },
    {
        # Not sure: a choice, never a forced apology (the over-apologising risk). Check the Facts as a link.
        "id": "unsure", "kind": "ask", "title": "unsure_title", "hint": "guilt_unsure_line",
        "fields": [{"id": "unsure", "options": {"list": "unsure"}, "max": 1, "required": True,
                    "links": [{"exit": "check_the_facts", "label": "check_facts", "when": ALWAYS}]}],
        "next": [{"when": is_("unsure", "warm"), "to": "no_sorry"}, {"to": "owning"}],
    },
    {
        "id": "owning", "kind": "ask", "hint": "repair_explain",
        "title": [{"key": "ack_title_unsure", "when": is_("guilt", "unsure")}, {"key": "ack_title"}],
        "fields": [
            {"id": "ack", "label": "ack_label", "options": {"list": "ack"}, "max": 1, "required": True,
             "own": {"hint": "own_line", "countsAsPick": True, "max": 36}},
            {"id": "r_validate", "label": "r_validate_label", "options": {"list": "r_validate"}, "max": 1},
            {"id": "commit", "label": "r_commit_label", "options": {"list": "commit"}, "max": 1},
            {"id": "r_ask", "label": "r_ask_label", "options": {"list": "r_ask"}, "max": 1},
        ],
        "next": [{"to": "r_msg"}],
    },
    {
        "id": "r_msg", "kind": "embed", "embed": "messageComposer", "title": "repair_msg_title", "answerAs": "repair_how",
        "props": {"parts": ["ack", "r_validate", "commit", "r_ask"], "field": "ack",
                  "copyLabel": "copy", "copiedLabel": "copied", "selectedLabel": "selected", "openLabel": "open_messages",
                  "next": "next"},
        "next": [{"to": "r_sent"}],
    },
    {
        "id": "r_sent", "kind": "handoff", "complete": True,
        "lines": [{"when": HEADS_UP, "key": "repair_sent_heads_up"}, {"when": None, "key": "repair_sent_line"}],
        "fields": [{"id": "again", "label": "repair_again_label", "max": 1, "options": {"list": "again"}}],
        "followUp": {"type": "repair_outcome", "whenFrom": "again"},
        "offers": [{"exit": "rehearse", "when": None}],
        "done": "done",
    },
    {
        # Guilt that doesn't fit the facts (PRD): a FAST line instead of an apology, and still something warm.
        "id": "no_sorry", "kind": "ask",
        "title": [{"key": "no_sorry_title_unsure", "when": is_("guilt", "unsure")}, {"key": "no_sorry_title"}],
        "lines": [{"when": {"not": is_("guilt", "unsure")}, "key": "no_sorry_hint"}],
        "fields": [{"id": "no_sorry", "options": {"list": "no_sorry"}, "max": 1, "required": True}],
        "next": [{"to": "ns_card"}],
    },
    {
        "id": "ns_card", "kind": "embed", "embed": "boundaryLine", "title": "no_sorry_card_title", "answerAs": "ns_copied",
        "props": {"field": "no_sorry", "shape": "line", "copyLabel": "copy", "copiedLabel": "copied", "selectedLabel": "selected", "next": "next"},
        "next": [{"to": "ns_end"}],
    },
    {
        "id": "ns_end", "kind": "handoff", "complete": True,
        "lines": [{"when": None, "key": "no_sorry_line"}],
        "offers": [{"exit": "fast", "when": None}],
        "done": "done",
    },
    # --- Afterwards: the repair_outcome card reopens the run here (R9) ---
    {
        "id": "repaired", "kind": "ask", "reopens": {"after": "r_sent"}, "clears": ["repaired", "between"],
        "title": "repaired_title",
        "fields": [{"id": "repaired", "options": {"list": "repaired"}, "max": 1, "required": True}],
        "crisis": [{"variant": "other_person", "when": UNSAFE_REPAIRED}],
        "next": [{"when": UNSAFE_REPAIRED, "to": "scared"}, {"when": is_("repaired", "not_yet"), "to": "r_later"},
                 {"when": is_("repaired", "wait"), "to": "r_wait"}, {"to": "between"}],
    },
    {
        "id": "between", "kind": "ask", "title": "between_title",
        "fields": [{"id": "between", "options": {"list": "between"}, "max": 1, "required": True}],
        "crisis": [{"variant": "other_person", "when": UNSAFE_BETWEEN}],
        "next": [{"when": UNSAFE_BETWEEN, "to": "scared"}, {"to": "r_end"}],
    },
    {
        "id": "r_end", "kind": "handoff", "complete": True,
        "lines": [{"when": in_("between", ["shaky", "no"]), "key": "repaired_line_shaky"}, {"when": None, "key": "repaired_line"}],
        "offers": [{"exit": "fast_let_go", "when": is_("between", "no")}], "done": "done",
    },
    {
        "id": "r_later", "kind": "handoff", "complete": True,
        "lines": [{"when": None, "key": "repaired_not_yet"}],
        "offers": [], "done": "done",
    },
    {
        "id": "r_wait", "kind": "handoff", "complete": True,
        "lines": [{"when": None, "key": "repaired_not_ready"}],
        "offers": [{"exit": "fast_let_go", "when": None}], "done": "done",
    },
    # --- Break and return (PRD: the return time is the skill) ---
    {
        "id": "break", "kind": "ask", "title": "break_title",
        "fields": [
            {"id": "break_len", "label": "break_len_label", "options": {"list": "break_len"}, "max": 1, "required": True,
             "showWhen": {"not": UNSAFE_BREAK}},
            {"id": "break_line", "label": "break_line_label", "options": {"list": "break_line", "where": LEN_WHERE}, "max": 1,
             "required": True, "showWhen": {"all": [{"set": a("break_len")}, {"not": UNSAFE_BREAK}]}},
            # A way out for someone who isn't safe with them: the answer is recorded (the projection makes their
            # safety answer stale) and the run takes the safety branch; no card is booked (no window picked).
            {"id": "not_safe", "label": "not_safe_label", "options": {"list": "not_safe"}, "max": 1},
        ],
        "crisis": [{"variant": "other_person", "when": UNSAFE_BREAK}],
        # The time the line says is the card's time.
        "followUp": {"type": "break_return", "whenFrom": "break_len"},
        "next": [{"when": UNSAFE_BREAK, "to": "scared"}, {"to": "b_line"}],
    },
    {
        "id": "b_line", "kind": "embed", "embed": "boundaryLine", "title": "break_card_title", "answerAs": "break_copied",
        "props": {"field": "break_line", "shape": "line", "copyLabel": "copy", "copiedLabel": "copied", "selectedLabel": "selected", "next": "next"},
        "next": [{"to": "b_set"}],
    },
    {
        "id": "b_set", "kind": "handoff", "complete": True,
        "lines": [{"when": None, "key": "break_set_line"}],
        "offers": [{"exit": "cool_down", "when": None}], "done": "done",
    },
    # --- Afterwards: the break_return card reopens the run here (R9) ---
    {
        "id": "back", "kind": "ask", "reopens": {"after": "break", "again": ["more"]},
        "clears": ["back", "still_ok", "more"], "title": "back_title", "hint": "back_hint",
        "fields": [{"id": "back", "options": {"list": "back"}, "max": 1, "required": True}],
        "crisis": [{"variant": "other_person", "when": UNSAFE_BACK}],
        "next": [{"when": UNSAFE_BACK, "to": "scared"}, {"when": is_("back", "not_yet"), "to": "more"},
                 {"when": is_("back", "they_didnt"), "to": "refused"}, {"when": is_("back", "not_going"), "to": "no_back"},
                 {"to": "still_ok"}],
    },
    {
        "id": "still_ok", "kind": "ask", "title": "still_ok_title",
        "fields": [{"id": "still_ok", "options": {"list": "between"}, "max": 1, "required": True}],
        "crisis": [{"variant": "other_person", "when": UNSAFE_STILL}],
        "next": [{"when": UNSAFE_STILL, "to": "scared"}, {"to": "back_end"}],
    },
    {
        "id": "back_end", "kind": "handoff", "complete": True,
        "lines": [{"when": in_("still_ok", ["shaky", "no"]), "key": "back_line_shaky"}, {"when": None, "key": "back_line"}],
        "offers": [{"exit": "give_repair", "when": in_("still_ok", ["shaky", "no"])}], "done": "done",
    },
    {
        "id": "more", "kind": "ask", "title": "more_title",
        "fields": [{"id": "more", "options": {"list": "break_len"}, "max": 1, "required": True}],
        "followUp": {"type": "break_return", "whenFrom": "more"},
        "next": [{"to": "more_set"}],
    },
    {
        "id": "more_set", "kind": "handoff", "complete": True,
        "lines": [{"when": None, "key": "more_line"}],
        "offers": [], "done": "done",
    },
    {
        "id": "refused", "kind": "handoff", "complete": True,
        "lines": [{"when": None, "key": "refused_line"}],
        "offers": [{"exit": "fast_let_go", "when": None}], "done": "done",
    },
    {
        # Not going back to it: a real answer. No card after it.
        "id": "no_back", "kind": "handoff", "complete": True,
        "lines": [{"when": None, "key": "no_return_line"}],
        "offers": [{"exit": "fast_let_go", "when": None}], "done": "done",
    },
    # --- Before an ask: GIVE's four rows, all optional (PRD inline layer, ≤30 s) ---
    {
        "id": "gentle", "kind": "ask",
        "title": [{"key": "gentle_title_heads_up", "when": HEADS_UP}, {"key": "gentle_title"}],
        "lines": [{"when": REFUSED, "key": "refused_line_ask"}, *STIRRED_LINE],
        "fields": [
            {"id": "swap", "label": "swap_label", "options": {"list": "swap"}, "max": 2},
            {"id": "g_question", "label": "g_question_label", "options": {"list": "g_question"}, "max": 1},
            {"id": "g_validate", "label": "g_validate_label", "options": {"list": "g_validate"}, "max": 1},
            {"id": "manner", "label": "manner_label", "options": {"list": "manner"}, "max": 1},
        ],
        "next": [{"to": "soft"}],
    },
    {
        "id": "soft", "kind": "embed", "embed": "bodyCard", "title": "soft_title", "answerAs": "soft_how",
        "props": {"kind": "willing", "seconds": 20, "step1": "soft_step1", "step2": "soft_step2", "step3": "soft_step3",
                  "start": "soft_start", "running": "soft_running", "done": "soft_done", "next": "next"},
        # Nothing picked on the four rows: no empty card.
        "next": [{"when": {"any": [{"set": a("swap")}, {"set": a("g_question")}, {"set": a("g_validate")}, {"set": a("manner")}]},
                  "to": "g_card"}, {"to": "g_end"}],
    },
    {
        "id": "g_card", "kind": "embed", "embed": "pocketCard", "title": "gentle_card_title", "answerAs": "g_card_how",
        "props": {"say": ["g_validate"], "steady": ["manner", "swap"], "push": ["g_question"], "steadyNoteA": "card_finish",
                  "sayLabel": "card_say", "steadyLabel": "card_how", "pushLabel": "card_ask_them", **CARD_COMMON},
        "next": [{"to": "g_end"}],
    },
    {
        "id": "g_end", "kind": "handoff", "complete": True,
        "lines": [{"when": None, "key": "gentle_line"}],
        "offers": [{"exit": "fast_let_go", "when": REFUSED}, {"exit": "one_message", "when": None}],
        "done": "done",
    },
]

EXITS = [
    {"id": "cool_down", "toolId": "cool-down"},
    {"id": "fast", "toolId": "fast"},
    {"id": "fast_let_go", "toolId": "fast", "query": {"frame": "let_go"}},
    {"id": "check_the_facts", "toolId": "check-the-facts"},
    {"id": "one_message", "toolId": "dear-man", "query": {"mode": "one", "person": "$ctx.personId"}},
    {"id": "give_repair", "toolId": "give", "query": {"situationId": "repair", "person": "$ctx.personId"}},
    {"id": "rehearse", "toolId": "rehearse", "planned": True},
    {"id": "ending_careful", "toolId": "ending-relationships", "query": {"frame": "careful"}},
    {"id": "safety_open", "toolId": None, "safety": True},
    {"id": "done", "done": True},
]


def options():
    out = [("situation", v, l, {"flooded": True} if f else {}, None) for v, l, f in SITUATION]
    out += [("brought", v, l, {}, None) for v, l in BROUGHT]
    out += [("validate", v, l, {"about": ab}, None) for v, l, ab in VALIDATE]
    out += [("interested", v, l, {"about": ab}, None) for v, l, ab in INTERESTED]
    out += [("stance", v, l, {}, None) for v, l in STANCE]
    out += [("mine", v, l, {"stance": st, "about": ab}, None) for v, l, st, ab in MINE]
    out += [("fight", v, l, {"danger": "other"} if v != "no" else {}, None) for v, l in FIGHT]
    out += [("guilt", v, l, {}, None) for v, l in GUILT]
    out += [("ack", v, l, {}, None) for v, l in ACK]
    out += [("r_validate", v, l, {}, None) for v, l in R_VALIDATE]
    out += [("r_ask", v, l, {}, None) for v, l in R_ASK]
    out += [("no_sorry", v, l, {}, None) for v, l in NO_SORRY]
    out += [("again", v, l, {}, None) for v, l in AGAIN]
    out += [("repaired", v, l, {"danger": "other"} if v == "unsafe" else {}, None) for v, l in REPAIRED]
    out += [("not_safe", "unsafe", "I don't feel safe with them", {"danger": "other"}, None)]
    out += [("between", v, l, {"danger": "other"} if v == "unsafe" else {}, None) for v, l in BETWEEN]
    out += [("break_len", v, l, {}, None) for v, l in BREAK_LEN]
    out += [("break_line", v, l, {"len": ln}, None) for v, l, ln in BREAK_LINE]
    out += [("back", v, l, {"danger": "other"} if v == "unsafe" else {}, None) for v, l in BACK]
    out += [("angry_ok", v, l, {"danger": "other"} if v == "scared" else {}, None) for v, l in ANGRY_CHECK]
    out += [("unsure", v, l, {}, None) for v, l in UNSURE_WAY]
    out += [("commit", v, l, {}, None) for v, l in R_COMMIT]
    out += [("swap", v, l, {}, None) for v, l in SWAP]
    out += [("g_question", v, l, {}, None) for v, l in G_QUESTION]
    out += [("g_validate", v, l, {}, None) for v, l in G_VALIDATE]
    out += [("manner", v, l, {}, None) for v, l in MANNER]
    return out


SKILL = {
    "id": ID, "toolId": TOOL_ID, "concept": CONCEPT, "version": VERSION, "start": "what", "ownMax": OWN_MAX,
    "accepts": ["personId", "frame", "band", "situationId", "refused"], "copy": COPY,
    "tables": {}, "derive": [],
    "steps": STEPS, "exits": EXITS, "options": options(), "emotionFields": [],
}
