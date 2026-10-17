# Editable content for the practice spine (PR-S2): follow-up types, the session close question,
# and the PracticeSkill fields the shared rep log needs. Regenerate schema/practice-spine.cypher
# with build.py after editing.
#
# REVIEW: every user-facing string here is a draft (reviewStatus "draft") until Claudia signs it
# off (decision D-03 approved the canonical then-vs-now pair; the wording is still hers to edit).
# Voice rules (E3 §A5.2.4): no cheer, no "should", no "just", no exclamation marks, no numbers.

VERSION = "spine-v1"
REVIEW_STATUS = "draft"

# ---- Then-vs-now (ruling R3) -------------------------------------------------------------------
# One canonical, direction-relative answer on every record that asks it:
#   thenVsNow in worse | same | better | much_better, thenVsNowDir in down | orient | up.
# The copy is per direction. `up` is reserved (authored by DT when a tool needs it).
THEN_VS_NOW = ["worse", "same", "better", "much_better"]
DIRECTION_LABELS = {
    "down": {"worse": "Louder", "same": "About the same", "better": "Quieter", "much_better": "Much quieter"},
    "orient": {"worse": "Further away", "same": "About the same", "better": "A bit more here", "much_better": "More here"},
}
# closeKind -> direction (regulation_up -> up is reserved)
CLOSE_KIND_DIR = {"regulation_down": "down", "orienting": "orient"}

ACTED_ON_URGE = ["no", "partly", "yes", "not_yet"]

# ---- SessionCloseFlow: the one-tap question at the end of a tool --------------------------------
CLOSE_FLOW = {
    "version": VERSION,
    "kinds": {
        "regulation_down": {
            "dir": "down",
            "question": "Compared to when you started, it's…",
            "choices": [{"id": k, "label": DIRECTION_LABELS["down"][k]} for k in THEN_VS_NOW],
        },
        "orienting": {
            "dir": "orient",
            "question": "Compared to when you started, you feel…",
            "choices": [{"id": k, "label": DIRECTION_LABELS["orient"][k]} for k in THEN_VS_NOW],
        },
        "urge": {
            "question": "Did you act on the urge?",
            "choices": [{"id": "no", "label": "No"}, {"id": "partly", "label": "Partly"}, {"id": "yes", "label": "Yes"}],
        },
        "plan": {
            "question": "When will you take the next step?",
            "choices": [{"id": "today", "label": "Today"}, {"id": "tomorrow", "label": "Tomorrow"}, {"id": "this_week", "label": "This week"}],
        },
    },
    # Per-tool wording of a kind's question (same answer ids).
    "byTool": {
        "pause": {
            "urge": {
                "question": "And the urge?",
                "choices": [{"id": "no", "label": "Held off"}, {"id": "yes", "label": "Went ahead"}, {"id": "not_yet", "label": "Still deciding"}],
            },
        },
    },
    "skip": "Skip",
    "saved": "Noted.",
}

# ---- FollowUpType rows (CORE-owned registry; modules add rows) ----------------------------------
# tier: safety > practice > quality > skills (Today ordering).
# resolveMode inline: the Today card resolves in place (so a follow-up can ship before its host tool).
# window: how the client computes dueAt in the user's local time (src/lib/spine/windows.ts).
# choices: id, label, and what the answer does: status (done/partly/didnt/dismissed) or snoozeHours;
#          thenVsNow answers carry `thenVsNow` (+ the type's `dir`).
# notification: content-free (no feeling, no tool name), for the in-tab / later push reminder.
def tvn_choices(direction):
    return [{"id": k, "label": DIRECTION_LABELS[direction][k], "status": "done", "thenVsNow": k} for k in THEN_VS_NOW]

NOT_NOW = {"id": "not_now", "label": "Not now", "snoozeHours": 3}

FOLLOW_UP_TYPES = [
    {
        "id": "oa_plan", "ownerModule": "er", "tier": "quality", "resolveMode": "deeplink",
        "deepLinkTemplate": "/tool/opposite-action?followUp={detailId}", "window": {"kind": "tool"},
        "staleAfterHours": 168, "missedPath": "none", "notify": {"push": False, "inTab": True, "ics": True},
        "enabled": True,
        "copy": {"title": "A plan you made is ready", "body": "Tap to see how it went."},
        "choices": [], "notification": "A plan you made is ready.",
    },
    {
        "id": "recover_next_day", "ownerModule": "wmp", "tier": "quality", "resolveMode": "inline",
        "window": {"kind": "at_local", "days": 1, "time": "10:00"},
        "staleAfterHours": 36, "missedPath": "none", "notify": {"push": False, "inTab": True, "ics": False},
        "enabled": True, "dir": "down",
        "copy": {"title": "Yesterday's hurtful moment", "body": "Compared to yesterday, it's…"},
        "choices": tvn_choices("down") + [NOT_NOW], "notification": "A check-in you asked for is ready.",
    },
    {
        "id": "recover_rehearse", "ownerModule": "wmp", "tier": "quality", "resolveMode": "inline",
        "window": {"kind": "at_local", "days": 2, "time": "18:00"},
        "staleAfterHours": 48, "missedPath": "none", "notify": {"push": False, "inTab": True, "ics": False},
        "enabled": True,
        "copy": {"title": "Rehearse the next time", "body": "Their likely line, your body cue, your move. Did you run it through?"},
        "choices": [{"id": "did_it", "label": "Did it", "status": "done"},
                    {"id": "not_yet", "label": "Not yet", "snoozeHours": 24},
                    {"id": "skip", "label": "Skip", "status": "dismissed"}],
        "notification": "A practice you planned is ready.",
    },
    {
        "id": "recover_log", "ownerModule": "wmp", "tier": "quality", "resolveMode": "inline",
        "window": {"kind": "at_local", "days": 3, "time": "18:00"},
        "staleAfterHours": 72, "missedPath": "none", "notify": {"push": False, "inTab": True, "ics": False},
        "enabled": True,
        "copy": {"title": "How did it actually go?", "body": "Compared to what you expected, it went…"},
        "choices": [{"id": "better", "label": "Better than I thought", "status": "done"},
                    {"id": "as_expected", "label": "About what I thought", "status": "done"},
                    {"id": "worse", "label": "Worse", "status": "done"},
                    {"id": "not_yet", "label": "Didn't happen yet", "snoozeHours": 24}],
        "notification": "A check-in you asked for is ready.",
    },
    {
        "id": "ps_step", "ownerModule": "er", "tier": "quality", "resolveMode": "inline",
        "window": {"kind": "chip", "chips": {"today": {"kind": "at_local", "days": 0, "time": "20:00"},
                                             "tomorrow": {"kind": "at_local", "days": 1, "time": "18:00"},
                                             "this_week": {"kind": "at_local", "days": 4, "time": "18:00"}}},
        "staleAfterHours": 72, "missedPath": "missing_links", "notify": {"push": False, "inTab": True, "ics": False},
        "enabled": True,
        "copy": {"title": "Your next step", "body": "The step you picked in Problem Solve. How did it go?"},
        "choices": [{"id": "did_it", "label": "Did it", "status": "done"},
                    {"id": "did_part", "label": "Did part", "status": "partly"},
                    {"id": "didnt", "label": "Didn't", "status": "didnt"}],
        "notification": "A step you planned is ready.",
    },
    {
        # Derived (no FollowUp node): the latest tool session closed without an answer.
        "id": "tool_outcome", "ownerModule": "core", "tier": "skills", "resolveMode": "inline",
        "window": {"kind": "derived"}, "staleAfterHours": 12, "missedPath": "none",
        "notify": {"push": False, "inTab": False, "ics": False}, "enabled": True,
        "copy": {"title": "{toolName}, earlier", "body": "One tap, then it's out of your way."},
        "choices": [], "notification": "",
    },
    {
        "id": "regulation_recheck", "ownerModule": "dt", "tier": "skills", "resolveMode": "inline",
        "window": {"kind": "after", "minutes": 60}, "staleAfterHours": 6, "missedPath": "none",
        "notify": {"push": False, "inTab": True, "ics": False},
        "enabled": False,  # D-09: authored, off until push (PR-S8)
        "dir": "down",
        "copy": {"title": "An hour later", "body": "Compared to when you finished, it's…"},
        "choices": tvn_choices("down") + [NOT_NOW], "notification": "A check-in you asked for is ready.",
    },
    {
        "id": "pattern_offer", "ownerModule": "core", "tier": "skills", "resolveMode": "inline",
        "window": {"kind": "derived"}, "staleAfterHours": 168, "missedPath": "none",
        "notify": {"push": False, "inTab": False, "ics": False}, "enabled": True,
        "copy": {"title": "Something we noticed", "body": "Want to keep this in Me?"},
        "choices": [{"id": "yes", "label": "Yes, keep it"}, {"id": "not_now", "label": "Not now"}, {"id": "no", "label": "No"}],
        "notification": "",
    },
    {
        "id": "profile_revisit", "ownerModule": "core", "tier": "skills", "resolveMode": "inline",
        "window": {"kind": "derived"}, "staleAfterHours": 168, "missedPath": "none",
        "notify": {"push": False, "inTab": False, "ics": False}, "enabled": False,
        "copy": {"title": "Still true?", "body": "Something you told us a while ago."},
        "choices": [{"id": "yes", "label": "Yes"}, {"id": "not_any_more", "label": "Not any more"}, {"id": "change", "label": "Change it"}],
        "notification": "",
    },
    {
        # E3 §A4.2.6: "Come back to this later" from the breakdown hand-off (A4-2 schedules it).
        "id": "resume_skill", "ownerModule": "er", "tier": "practice", "resolveMode": "deeplink",
        "deepLinkTemplate": "/tool/{sourceToolId}?resume={sourceSessionId}&followUp={followUpId}",
        "window": {"kind": "chip", "chips": {"1h": {"kind": "after", "minutes": 60},
                                             "evening": {"kind": "at_local", "days": 0, "time": "19:00"},
                                             "tomorrow": {"kind": "at_local", "days": 1, "time": "10:00"}}},
        "staleAfterHours": 24, "missedPath": "none", "notify": {"push": False, "inTab": True, "ics": False},
        "enabled": True,
        "copy": {"title": "Pick up where you left off", "body": "You were in the middle of something earlier."},
        "choices": [{"id": "dismiss", "label": "Not any more", "status": "dismissed"}],
        "notification": "Something you set aside is ready when you are.",
    },
    {
        # Parts (docs/design/parts.md, Meet a part step 10): the next-day check-back on the close's yes,
        # scheduled by parts' schedulePartCheckback and answered by answerPartCheckback (Louder pauses the
        # part). Its Today card comes from parts (parts on, the name from the profile slice) and shows the
        # parts copy (checkback_* in scripts/parts/content.py) only once signed off; the copy and choices
        # here are the same drafts, kept so the row has the registry's shape. No reminders of any kind.
        "id": "part_checkback", "ownerModule": "mf", "tier": "quality", "resolveMode": "inline",
        "window": {"kind": "at_local", "days": 1, "time": "10:00"},
        "staleAfterHours": 36, "missedPath": "none", "notify": {"push": False, "inTab": False, "ics": False},
        "enabled": True,
        "copy": {"title": "How's {name} today?"},
        "choices": [{"id": "settled", "label": "Settled", "status": "done"},
                    {"id": "same", "label": "Same", "status": "done"},
                    {"id": "louder", "label": "Louder", "status": "done"},
                    {"id": "skip", "label": "Skip", "status": "dismissed"}],
        "notification": "",
    },
    {
        # Parts (docs/design/parts.md, Two pulls step 7): a week after Two pulls, for both kept parts, on
        # the close's yes; scheduled by schedulePullsCheckback, answered by answerPartCheckback (the same
        # card and answers; Louder shows the aftercare). Its Today card comes from parts (parts on, both
        # names from the profile slice) and shows checkback_title_two only once signed off.
        "id": "two_pulls_checkback", "ownerModule": "mf", "tier": "quality", "resolveMode": "inline",
        "window": {"kind": "at_local", "days": 7, "time": "10:00"},
        "staleAfterHours": 72, "missedPath": "none", "notify": {"push": False, "inTab": False, "ics": False},
        "enabled": True,
        "copy": {"title": "How are {A} and {B} today?"},
        "choices": [{"id": "settled", "label": "Settled", "status": "done"},
                    {"id": "same", "label": "Same", "status": "done"},
                    {"id": "louder", "label": "Louder", "status": "done"},
                    {"id": "skip", "label": "Skip", "status": "dismissed"}],
        "notification": "",
    },
]

# Reserved rows: authored now so the ids exist, enabled false until their owners ship.
RESERVED = [
    ("safety_checkin", "core", "safety"),   # CORE-01; sorts first, push-cap exempt
    ("chain_nextday", "core", "quality"),   # CORE-08
    ("missed_step", "core", "quality"),     # CORE-11
    ("diary_daily", "core", "practice"),    # CORE-04 (needs rrule)
    ("practice_daily", "mf", "practice"),   # MF (needs rrule)
    ("ask_outcome", "ie", "quality"),       # IE prediction log
]
for rid, owner, tier in RESERVED:
    FOLLOW_UP_TYPES.append({
        "id": rid, "ownerModule": owner, "tier": tier, "resolveMode": "inline", "window": {"kind": "derived"},
        "staleAfterHours": 36, "missedPath": "none", "notify": {"push": False, "inTab": False, "ics": False},
        "enabled": False, "reserved": True, "copy": {"title": "", "body": ""}, "choices": [], "notification": "",
    })

# ---- PracticeSkill: the shared rep log's catalogue ---------------------------------------------
# defaultFor: the app tools whose completed session logs a rep of this skill (unless the tool
# passes its own skillIds). displayLabel: a neutral name for the Practice view (Recover's names
# are in Recover's voice, e.g. "Don't send yet"). Existing skills are Recover's (their name/why/
# grade stay owned by scripts/invalidation-recovery/content.py); this file only adds fields.
SKILL_FIELDS = {
    "cold": {"defaultFor": ["cool-down"], "displayLabel": "Cold reset"},
    "sigh": {"defaultFor": [], "displayLabel": "Cyclic sigh"},
    "stop": {"defaultFor": ["pause"], "displayLabel": "Pause before acting"},
    "orient": {"defaultFor": ["five-senses"], "displayLabel": "Orient"},
    "opposite": {"defaultFor": ["opposite-action"], "displayLabel": "Opposite action"},
    "request": {"defaultFor": ["dear-man"], "displayLabel": "Ask for it"},
    "label": {"defaultFor": ["find-the-feeling"], "displayLabel": "Name it"},
}

# New skills (id, name, grade, family, concept, why, sources). Grades follow the project scale.
NEW_SKILLS = [
    ("urge_surf", "Ride the urge", "Preliminary", "mind", "urge_surfing",
     "Watching an urge rise and fall without acting on it teaches that it passes on its own.",
     ["bowen_marlatt_2009"], ["urge-surfing"]),
    ("problem_solve", "Solve the problem", "Moderate", "mind", "dbt_problem_solving",
     "When the facts are the problem, a small concrete step changes the situation that keeps the feeling going.",
     ["linehan_skills_2015"], ["problem-solve"]),
    # Wise mind (docs/design/wise-mind.md): a practice started (Stone on the lake, Wise in mind out, Ask
    # and listen) is the rep, through the tool's markPracticed.
    ("wise_mind", "Wise mind", "Preliminary", "mind", "dbt_wise_mind",
     "Hearing what feeling and thinking each say, then pausing to listen, leaves room for a choice that fits both.",
     ["linehan_skills_2015"], ["wise-mind"]),
]

SOURCES = [
    ("bowen_marlatt_2009", "Bowen & Marlatt (2009), Psychology of Addictive Behaviors — surfing the urge: brief mindfulness-based intervention for college student smokers", "https://doi.org/10.1037/a0017127"),
]
