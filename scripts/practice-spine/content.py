# Editable content for the practice spine (PR-S2): follow-up types, the session close question,
# and the PracticeSkill fields the shared rep log needs. Regenerate schema/practice-spine.cypher
# with build.py after editing.
#
# REVIEW: every user-facing string here is a draft (reviewStatus "draft") until Claudia signs it
# off (decision D-03 approved the canonical then-vs-now pair; the wording is still hers to edit).
# Voice rules (E3 §A5.2.4): no cheer, no "should", no "just", no exclamation marks, no numbers.

VERSION = "spine-v1"
REVIEW_STATUS = "draft"

# Sleep reset's wake times (scripts/skills/sleep_reset.py `WAKE`, test-pinned): the mornings by half hours, then
# shift and night times by the hour (ER-13 part 2: a night-shift worker's wake time is theirs too).
SLEEP_WAKE_TIMES = [f"{h:02d}{m:02d}" for h in range(6, 10) for m in (0, 30)] + \
    [f"{h:02d}00" for h in [*range(10, 24), *range(0, 6)]]

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
        # Hold to wait (DT-02): the two-part close (urge_change, R7). PRD: "Did you act on it? no · partly · yes",
        # never red or green; then the pull now.
        "pause": {
            "urge": {
                "question": "Did you act on it?",
                "choices": [{"id": "no", "label": "No"}, {"id": "partly", "label": "Partly"}, {"id": "yes", "label": "Yes"}],
            },
            "regulation_down": {
                "dir": "down",
                "question": "And the pull now, compared to when you started?",
                "choices": [{"id": k, "label": DIRECTION_LABELS["down"][k]} for k in THEN_VS_NOW],
            },
        },
        # DT-11: the acted answer is on the destructive urge, not on the rebellion picked.
        "alternate-rebellion": {
            "urge": {
                "question": "And the urge to blow it all up?",
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
        # Problem Solve on the skill runtime (ER-12, docs/design/problem-solve.md): Handout 12's evaluate step. The
        # commit card's chips schedule it; its card reopens that visit's run at *How did it go?* (`review`, a
        # `reopens` step, R9). Opening it is the resolution, as for resume_skill (functions/src/spine/toolSession.ts);
        # *Not any more* dismisses it. ps_step (above) stays for the cards the hand-built page scheduled.
        "id": "ps_review", "ownerModule": "er", "tier": "quality", "resolveMode": "deeplink",
        "deepLinkTemplate": "/tool/problem-solve?run={sourceSessionId}&at=review&followUp={followUpId}",
        "window": {"kind": "chip", "chips": {"today": {"kind": "at_local", "days": 0, "time": "20:00"},
                                             "tomorrow": {"kind": "at_local", "days": 1, "time": "18:00"},
                                             "this_week": {"kind": "at_local", "days": 4, "time": "18:00"}}},
        "staleAfterHours": 72, "missedPath": "missing_links", "notify": {"push": False, "inTab": True, "ics": False},
        "enabled": True,
        "copy": {"title": "Your next step", "body": "The step you picked in Problem Solve. How did it go?"},
        "choices": [{"id": "dismiss", "label": "Not any more", "status": "dismissed"}],
        "notification": "A step you planned is ready.",
    },
    {
        # Do the Opposite on the skill runtime (ER-03, ER-B3, docs/design/opposite-action-v3.md): a plan for later.
        # The *When will you try it?* chips schedule it; its card reopens that visit's run at *Did you get to try it?*
        # (`back`, a `reopens` step, R9). Opening it is the resolution, as for ps_review. oa_plan (above) stays for
        # the plans the hand-built page saved.
        "id": "oa_try", "ownerModule": "er", "tier": "quality", "resolveMode": "deeplink",
        "deepLinkTemplate": "/tool/opposite-action?run={sourceSessionId}&at=back&followUp={followUpId}",
        "window": {"kind": "chip", "chips": {"hour": {"kind": "after", "minutes": 60},
                                             "evening": {"kind": "at_local", "days": 0, "time": "20:00"},
                                             "tomorrow": {"kind": "at_local", "days": 1, "time": "18:00"},
                                             "this_week": {"kind": "at_local", "days": 4, "time": "18:00"}}},
        "staleAfterHours": 168, "missedPath": "none", "notify": {"push": False, "inTab": True, "ics": True},
        "enabled": True,
        "copy": {"title": "A plan you made is ready", "body": "The step you picked in Do the Opposite. Did you get to try it?"},
        "choices": [{"id": "dismiss", "label": "Not any more", "status": "dismissed"}],
        "notification": "A plan you made is ready.",
    },
    {
        # Running low on the skill runtime (ER-07, ER-B4, docs/design/running-low.md): the PRD's evening check. The
        # *Want me to ask tonight?* chip (on *Later today*) schedules it; its card reopens that visit's run at *Did
        # the fix happen?* (`back`, a `reopens` step, R9). Opening it is the resolution, as for oa_try. It's about
        # today only, so it goes stale overnight and has no missed path.
        "id": "please_fix", "ownerModule": "er", "tier": "quality", "resolveMode": "deeplink",
        "deepLinkTemplate": "/tool/please-skill?run={sourceSessionId}&at=back&followUp={followUpId}",
        "window": {"kind": "chip", "chips": {"evening": {"kind": "at_local", "days": 0, "time": "20:00"}}},
        "staleAfterHours": 16, "missedPath": "none", "notify": {"push": False, "inTab": True, "ics": False},
        "enabled": True,
        "copy": {"title": "The one thing for today", "body": "The fix you picked in Running low. Did it happen?"},
        "choices": [{"id": "dismiss", "label": "Not today", "status": "dismissed"}],
        "notification": "Your check from Running low is ready.",
    },
    {
        # Sleep reset (ER-13, docs/design/sleep-reset.md): the morning check at the wake time the person set, the next
        # time it comes round (`next_local`: a plan made at 1am means this morning). The card reopens that visit at `morning` (R9 `reopens`: *How was the night?*, then *Same again
        # tomorrow?*, which books it again). Opening it is the resolution. Content-free: never names the time or the
        # night. About one morning only, so it goes stale by the afternoon.
        "id": "sleep_morning", "ownerModule": "er", "tier": "practice", "resolveMode": "deeplink",
        "deepLinkTemplate": "/tool/sleep-reset?run={sourceSessionId}&at=morning&followUp={followUpId}",
        # Every wake time Sleep reset offers (its `WAKE`: the mornings by half hours, then shift and night
        # times by the hour), the next time it comes round; then the morning's renewal (*Same again
        # tomorrow?*): the next wake time at least 12 hours on (a 6:00 answer for a 7:00 wake would book this
        # morning again; a 0:30 answer for a 23:00 wake still books tonight, not the night after).
        "window": {"kind": "chip", "chips": {
            **{f"w{t}": {"kind": "next_local", "time": f"{t[:2]}:{t[2:]}"} for t in SLEEP_WAKE_TIMES},
            **{f"n{t}": {"kind": "next_local", "time": f"{t[:2]}:{t[2:]}", "minAheadHours": 12} for t in SLEEP_WAKE_TIMES}}},
        "staleAfterHours": 8, "missedPath": "none", "notify": {"push": False, "inTab": True, "ics": False},
        "enabled": True,
        "copy": {"title": "Sleep check", "body": "From Sleep Reset. How was your sleep?"},
        "choices": [{"id": "dismiss", "label": "Not today", "status": "dismissed"}],
        "notification": "Your sleep check is ready.",
    },
    {
        # What matters to me (ER-09, docs/design/values.md): the one small step for a value, checked when the person
        # said (tomorrow, three days, a week; evenings). The card reopens that visit at `back` (R9 `reopens`: *Did it
        # happen?*). Opening it is the resolution. Content-free: never names the value or the step.
        "id": "value_step", "ownerModule": "er", "tier": "practice", "resolveMode": "deeplink",
        "deepLinkTemplate": "/tool/values-clarification?run={sourceSessionId}&at=back&followUp={followUpId}",
        "window": {"kind": "chip", "chips": {"tomorrow": {"kind": "at_local", "days": 1, "time": "18:00"},
                                             "few_days": {"kind": "at_local", "days": 3, "time": "18:00"},
                                             "this_week": {"kind": "at_local", "days": 6, "time": "18:00"}}},
        "staleAfterHours": 72, "missedPath": "none", "notify": {"push": False, "inTab": True, "ics": False},
        "enabled": True,
        "copy": {"title": "Your small step", "body": "A step you picked for something that matters to you. Did it happen?"},
        "choices": [{"id": "dismiss", "label": "Not this time", "status": "dismissed"}],
        "notification": "Your small step is ready to check.",
    },
    {
        # Build mastery (ER-11, docs/design/build-mastery.md): the one step the person picked from a ladder, when they
        # said (later today, tomorrow, a few days). The card reopens that visit at `back` (R9 `reopens`: *How did it
        # go?* done · partly · not yet). Opening it is the resolution. Content-free: never names the area or the step.
        "id": "mastery_step", "ownerModule": "er", "tier": "practice", "resolveMode": "deeplink",
        "deepLinkTemplate": "/tool/build-mastery?run={sourceSessionId}&at=back&followUp={followUpId}",
        "window": {"kind": "chip", "chips": {"today": {"kind": "at_local", "days": 0, "time": "20:00"},
                                             "tomorrow": {"kind": "at_local", "days": 1, "time": "18:00"},
                                             "few_days": {"kind": "at_local", "days": 3, "time": "18:00"}}},
        "staleAfterHours": 72, "missedPath": "none", "notify": {"push": False, "inTab": True, "ics": False},
        "enabled": True,
        "copy": {"title": "Your step", "body": "A step you picked to get one thing done. How did it go?"},
        "choices": [{"id": "dismiss", "label": "Not yet", "status": "dismissed"}],
        "notification": "Your step is ready to check.",
    },
    {
        # Find your people (IE-09, docs/design/find-your-people.md): the one small step towards people, checked when
        # the person said. The card reopens that visit at `back` (R9 `reopens`: *Did you do it?*, then how it went
        # against the prediction). Opening it is the resolution. Content-free: never names the step or anyone.
        "id": "reach_out_outcome", "ownerModule": "ie", "tier": "practice", "resolveMode": "deeplink",
        "deepLinkTemplate": "/tool/finding-connection?run={sourceSessionId}&at=back&followUp={followUpId}",
        "window": {"kind": "chip", "chips": {"today": {"kind": "after", "minutes": 180},
                                             "evening": {"kind": "at_local", "days": 0, "time": "21:00"},
                                             "tomorrow": {"kind": "at_local", "days": 1, "time": "19:00"},
                                             "few_days": {"kind": "at_local", "days": 3, "time": "19:00"},
                                             "this_week": {"kind": "at_local", "days": 6, "time": "19:00"}}},
        "staleAfterHours": 72, "missedPath": "none", "notify": {"push": False, "inTab": True, "ics": False},
        "enabled": True,
        "copy": {"title": "Your small step", "body": "A step towards people you picked. Did you do it?"},
        "choices": [{"id": "dismiss", "label": "Not this time", "status": "dismissed"}],
        "notification": "Your small step is ready to check.",
    },
    {
        # Notice them (IE-10, docs/design/notice-them.md): the off-phone practice (notice one thing about them with
        # curiosity, or do one thing with them fully), checked when the person said they'd see them. The card reopens
        # that visit at `back` (R9 `reopens`: *Did you get to notice them?*). Opening it is the resolution.
        # Content-free: never names the person or the practice.
        "id": "notice_back", "ownerModule": "ie", "tier": "practice", "resolveMode": "deeplink",
        "deepLinkTemplate": "/tool/mindfulness-of-others?run={sourceSessionId}&at=back&followUp={followUpId}",
        "window": {"kind": "chip", "chips": {"today": {"kind": "at_local", "days": 0, "time": "21:00"},
                                             "tomorrow": {"kind": "at_local", "days": 1, "time": "20:00"},
                                             "few_days": {"kind": "at_local", "days": 3, "time": "20:00"},
                                             "this_week": {"kind": "at_local", "days": 6, "time": "20:00"}}},
        "staleAfterHours": 72, "missedPath": "none", "notify": {"push": False, "inTab": True, "ics": False},
        "enabled": True,
        "copy": {"title": "Your practice", "body": "A practice in noticing someone you picked. How did it go?"},
        "choices": [{"id": "dismiss", "label": "Not this time", "status": "dismissed"}],
        "notification": "Your practice is ready to check.",
    },
    {
        # Good things (ER-04, docs/design/good-things.md): the one good thing the person picked for today, at the time
        # they picked (now → an hour from now). The card reopens that visit at `back` (R9 `reopens`: *Did it happen?*,
        # then lighter / same / heavier and where the mind was). Opening it is the resolution. Content-free (PRD).
        "id": "good_thing", "ownerModule": "er", "tier": "practice", "resolveMode": "deeplink",
        "deepLinkTemplate": "/tool/good-things?run={sourceSessionId}&at=back&followUp={followUpId}",
        "window": {"kind": "chip", "chips": {"hour": {"kind": "after", "minutes": 60},
                                             "afternoon": {"kind": "at_local", "days": 0, "time": "16:00"},
                                             "evening": {"kind": "at_local", "days": 0, "time": "20:00"},
                                             "tomorrow": {"kind": "at_local", "days": 1, "time": "18:00"}}},
        "staleAfterHours": 24, "missedPath": "none", "notify": {"push": False, "inTab": True, "ics": False},
        "enabled": True,
        "copy": {"title": "Your good thing", "body": "Something good you picked earlier. Did it happen?"},
        "choices": [{"id": "dismiss", "label": "Not today", "status": "dismissed"}],
        "notification": "Your good thing is ready to check.",
    },
        # Good things' week plan (ER-04 level 2, docs/design/good-things.md *Plan the week*): one card per good thing
        # planned, on its day, in the evening. Each card's body differs a little, so three on one evening aren't identical. One type per slot, like Give's two cards (one card reopens one step):
        # each reopens the visit at its own `back_w<n>` (R9). Content-free: never names the thing or the day.
    {
        "id": "good_week_one", "ownerModule": "er", "tier": "practice", "resolveMode": "deeplink",
        "deepLinkTemplate": "/tool/good-things?run={sourceSessionId}&at=back_w1&followUp={followUpId}",
        "window": {"kind": "chip", "chips": {"evening": {"kind": "at_local", "days": 0, "time": "20:00"},
                                             "tomorrow": {"kind": "at_local", "days": 1, "time": "18:00"},
                                             "day_after": {"kind": "at_local", "days": 2, "time": "18:00"},
                                             "few_days": {"kind": "at_local", "days": 3, "time": "18:00"},
                                             "this_week": {"kind": "at_local", "days": 6, "time": "18:00"}}},
        "staleAfterHours": 24, "missedPath": "none", "notify": {"push": False, "inTab": True, "ics": False},
        "enabled": True,
        "copy": {"title": "Your good thing", "body": "A good thing you planned. Did it happen?"},
        "choices": [{"id": "dismiss", "label": "Not today", "status": "dismissed"}],
        "notification": "Your good thing is ready to check.",
    },
    {
        "id": "good_week_two", "ownerModule": "er", "tier": "practice", "resolveMode": "deeplink",
        "deepLinkTemplate": "/tool/good-things?run={sourceSessionId}&at=back_w2&followUp={followUpId}",
        "window": {"kind": "chip", "chips": {"evening": {"kind": "at_local", "days": 0, "time": "20:00"},
                                             "tomorrow": {"kind": "at_local", "days": 1, "time": "18:00"},
                                             "day_after": {"kind": "at_local", "days": 2, "time": "18:00"},
                                             "few_days": {"kind": "at_local", "days": 3, "time": "18:00"},
                                             "this_week": {"kind": "at_local", "days": 6, "time": "18:00"}}},
        "staleAfterHours": 24, "missedPath": "none", "notify": {"push": False, "inTab": True, "ics": False},
        "enabled": True,
        "copy": {"title": "Your good thing", "body": "Another good thing you planned. Did it happen?"},
        "choices": [{"id": "dismiss", "label": "Not today", "status": "dismissed"}],
        "notification": "Your good thing is ready to check.",
    },
    {
        "id": "good_week_three", "ownerModule": "er", "tier": "practice", "resolveMode": "deeplink",
        "deepLinkTemplate": "/tool/good-things?run={sourceSessionId}&at=back_w3&followUp={followUpId}",
        "window": {"kind": "chip", "chips": {"evening": {"kind": "at_local", "days": 0, "time": "20:00"},
                                             "tomorrow": {"kind": "at_local", "days": 1, "time": "18:00"},
                                             "day_after": {"kind": "at_local", "days": 2, "time": "18:00"},
                                             "few_days": {"kind": "at_local", "days": 3, "time": "18:00"},
                                             "this_week": {"kind": "at_local", "days": 6, "time": "18:00"}}},
        "staleAfterHours": 24, "missedPath": "none", "notify": {"push": False, "inTab": True, "ics": False},
        "enabled": True,
        "copy": {"title": "Your good thing", "body": "One more good thing you planned. Did it happen?"},
        "choices": [{"id": "dismiss", "label": "Not today", "status": "dismissed"}],
        "notification": "Your good thing is ready to check.",
    },
    {
        # Cope Ahead (docs/design/cope-ahead.md, "Today, afterwards"): on the keep screen's "Want me to ask how
        # it went?" Yes, for the time from screen 1 (the chip is ext.ca.when). Scheduled only on the caller's
        # own cope-ahead ToolSession. Its Today card is the tool's own (cope-ahead.json's after_* lines, the
        # plan line composed from the session's ext.ca ids): "How did {afterName} go?", then "Did your plan
        # help?"; both answers go in one resolve as log fields (howItWent, planHelped). The copy and choices
        # here are the first question's, in the registry's shape: the server checks the answer against them.
        # Stale and missed: as recover_log, the closest existing type.
        "id": "cope_ahead_after", "ownerModule": "er", "tier": "quality", "resolveMode": "inline",
        "window": {"kind": "chip", "chips": {"today": {"kind": "at_local", "days": 0, "time": "20:00"},
                                             "tomorrow": {"kind": "at_local", "days": 1, "time": "18:00"},
                                             "this_week": {"kind": "at_local", "days": 4, "time": "18:00"},
                                             "later": {"kind": "at_local", "days": 7, "time": "18:00"}}},
        "staleAfterHours": 72, "missedPath": "none", "notify": {"push": False, "inTab": True, "ics": False},
        "enabled": True,
        "copy": {"title": "How did it go?", "body": "Something you planned for in Cope Ahead."},
        "choices": [{"id": "better", "label": "Better than I feared", "status": "done"},
                    {"id": "as_expected", "label": "About what I expected", "status": "done"},
                    {"id": "harder", "label": "Harder than I expected", "status": "done"},
                    {"id": "not_yet", "label": "It hasn't happened yet", "snoozeHours": 24}],
        "notification": "A plan you made is ready.",
    },
    {
        # Check the Facts v1.2 (PRD ER-02, *still don't know*): "Did you find out?" about the one missing fact,
        # at the time the person picked (the missing step's chip; no chip, no follow-up). Scheduled by the skill
        # player with the check-the-facts session as its source (not bound server-side: its card reads nothing from
        # the session, unlike cope_ahead_after). Resolved in place; the answer is a log field.
        "id": "check_fact", "ownerModule": "er", "tier": "quality", "resolveMode": "inline",
        "window": {"kind": "chip", "chips": {"today": {"kind": "at_local", "days": 0, "time": "20:00"},
                                             "tomorrow": {"kind": "at_local", "days": 1, "time": "18:00"},
                                             "this_week": {"kind": "at_local", "days": 4, "time": "18:00"}}},
        "staleAfterHours": 72, "missedPath": "none", "notify": {"push": False, "inTab": True, "ics": False},
        "enabled": True,
        "copy": {"title": "Did you find out?", "body": "The one thing you wanted to know, from Check the Facts."},
        "choices": [{"id": "fit", "label": "Yes, and the feeling fit", "status": "done"},
                    {"id": "didnt_fit", "label": "Yes, and it didn't fit", "status": "done"},
                    {"id": "still", "label": "Still don't know", "status": "partly"},
                    NOT_NOW],
        "notification": "A check-in you asked for is ready.",
    },
    {
        # It isn't working v1.1 (PRD ER-14, "one next move + FollowUp"): a nudge to give the skill another go, on
        # the fix cards whose move is another try of the same skill (smaller, with willingness, with a bit more room:
        # fix_way, fix_will, fix_much). Not on body (its move is looking after the body) or nothing stood out (missing
        # links), and never on the hopelessness card. Picked as a chip and scheduled as the person leaves the card.
        "id": "try_again", "ownerModule": "er", "tier": "quality", "resolveMode": "inline",
        "window": {"kind": "chip", "chips": {"today": {"kind": "at_local", "days": 0, "time": "20:00"},
                                             "tomorrow": {"kind": "at_local", "days": 1, "time": "18:00"},
                                             "this_week": {"kind": "at_local", "days": 4, "time": "18:00"}}},
        "staleAfterHours": 72, "missedPath": "none", "notify": {"push": False, "inTab": True, "ics": False},
        "enabled": True,
        "copy": {"title": "Another go?", "body": "A nudge you asked for in It isn't working. Did you get a chance to try it again?"},
        "choices": [{"id": "helped", "label": "Tried it, it helped", "status": "done"},
                    {"id": "still_stuck", "label": "Tried it, still stuck", "status": "done"},
                    {"id": "not_yet", "label": "Not yet", "snoozeHours": 24},
                    {"id": "skip", "label": "Skip", "status": "dismissed"}],
        "notification": "A check-in you asked for is ready.",
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
        # Rewrite the nightmare (ER-15, docs/design/nightmare-rescript.md): a read-through the person asked for, on
        # the keep step's chips or a read-through's own end card (each visit sets the next, one at a time). It
        # reopens the visit's run at the read-through (R9 resume; `enterAt` takes it straight to the end card after).
        # Opening it is the resolution, as for resume_skill (functions/src/spine/toolSession.ts); *Not today*
        # dismisses it. The copy and the notification never name the nightmare.
        "id": "nightmare_rehearse", "ownerModule": "er", "tier": "practice", "resolveMode": "deeplink",
        "deepLinkTemplate": "/tool/nightmare-rescript?run={sourceSessionId}&at=rehearse&enterAt=rehearse&followUp={followUpId}",
        # tonight: a first visit's; tomorrow_night: a read-through visit's (it ends near bedtime, so not "tonight"
        # again within the hour); tomorrow: daytime, the only one after a read-through that stirred them up.
        "window": {"kind": "chip", "chips": {"tonight": {"kind": "at_local", "days": 0, "time": "21:00"},
                                             "tomorrow_night": {"kind": "at_local", "days": 1, "time": "21:00"},
                                             "tomorrow": {"kind": "at_local", "days": 1, "time": "12:00"}}},
        "staleAfterHours": 36, "missedPath": "none", "notify": {"push": False, "inTab": True, "ics": False},
        "enabled": True,
        "copy": {"title": "Your new version", "body": "A read-through you asked for. A minute, eyes open."},
        "choices": [{"id": "not_today", "label": "Not today", "status": "dismissed"}],
        "notification": "Something you asked to be reminded of is ready.",
    },
    {
        # Hold to wait (DT-02): ten minutes after the phone went down, or after the short path's body-first card
        # (a carried flooded reading: the observe and proceed steps wait for this). It reopens that visit at the
        # step back (R9), whose Next goes on to observe and proceed; a visit that never closed (the phone-down wait
        # still on screen) can't be reopened, so the link starts a fresh one. Opening it is the resolution, as for
        # resume_skill. The copy and the notification never name the urge.
        "id": "hold_come_back", "ownerModule": "dt", "tier": "practice", "resolveMode": "deeplink",
        "deepLinkTemplate": "/tool/pause?run={sourceSessionId}&at=step_back&followUp={followUpId}",
        "window": {"kind": "after", "minutes": 10},
        "staleAfterHours": 6, "missedPath": "none", "notify": {"push": False, "inTab": True, "ics": False},
        "enabled": True,
        "copy": {"title": "A little later", "body": "Quieter now? Want to decide what to do with the pull?"},
        "choices": [{"id": "not_now", "label": "Not now", "status": "dismissed"}],
        "notification": "Something you asked to come back to is ready.",
    },
    {
        # Give your mind a job (DT-06, docs/design/mind-job.md): a break's return. The person picks when (5, 15 or 30
        # minutes, or about an hour for "when I'm done"); the card reopens that visit at its check (`back`, a resumeAt
        # re-entry: *Back. Is it louder, the same, quieter?*, then the fork). Opening it is the resolution. The copy
        # never names what they were taking a break from.
        "id": "mind_job_back", "ownerModule": "dt", "tier": "practice", "resolveMode": "deeplink",
        "deepLinkTemplate": "/tool/mind-job?run={sourceSessionId}&at=back&followUp={followUpId}",
        "window": {"kind": "chip", "chips": {"m5": {"kind": "after", "minutes": 5},
                                             "m15": {"kind": "after", "minutes": 15},
                                             "m30": {"kind": "after", "minutes": 30},
                                             "m60": {"kind": "after", "minutes": 60}}},
        "staleAfterHours": 6, "missedPath": "none", "notify": {"push": False, "inTab": True, "ics": False},
        "enabled": True,
        "copy": {"title": "Back from your break", "body": "How is it now? Louder, the same, quieter?"},
        "choices": [{"id": "not_now", "label": "Not now", "status": "dismissed"}],
        "notification": "Your break's up. How is it now?",
    },
    {
        # Give your mind a job's lid (DT-06): the reopen the person booked when they put it on the shelf (tonight,
        # tomorrow, in a few days). The card reopens that visit at `reopen` (R9 `reopens`: *It's still on the shelf.
        # Open it for five minutes?*); *Not yet* books it again. Opening it is the resolution. Never names what's in it.
        "id": "lid_reopen", "ownerModule": "dt", "tier": "practice", "resolveMode": "deeplink",
        "deepLinkTemplate": "/tool/mind-job?run={sourceSessionId}&at=reopen&followUp={followUpId}",
        "window": {"kind": "chip", "chips": {"tonight": {"kind": "at_local", "days": 0, "time": "20:00"},
                                             "tomorrow": {"kind": "at_local", "days": 1, "time": "18:00"},
                                             "few_days": {"kind": "at_local", "days": 3, "time": "18:00"}}},
        "staleAfterHours": 72, "missedPath": "none", "notify": {"push": False, "inTab": True, "ics": False},
        "enabled": True,
        "copy": {"title": "On the shelf", "body": "It's still on the shelf. Open it for five minutes?"},
        "choices": [{"id": "not_now", "label": "Not now", "status": "dismissed"}],
        "notification": "Something you put on the shelf is ready to open.",
    },
    {
        # Let it be's turning the mind (DT-04 part 2, DBT DT Handout 12): acceptance is chosen again and again, so the
        # person can ask to be reminded (tonight, tomorrow, in a few days). The card reopens that visit at `turn_back`
        # (R9 `reopens`: the fork, turn again, willing hands, book the next one). Opening it is the resolution. Never
        # names what's being accepted (Today can be seen by others).
        "id": "turn_mind", "ownerModule": "dt", "tier": "practice", "resolveMode": "deeplink",
        "deepLinkTemplate": "/tool/let-it-be?run={sourceSessionId}&at=turn_back&followUp={followUpId}",
        "window": {"kind": "chip", "chips": {"tonight": {"kind": "at_local", "days": 0, "time": "20:00"},
                                             "tomorrow": {"kind": "at_local", "days": 1, "time": "18:00"},
                                             "few_days": {"kind": "at_local", "days": 3, "time": "18:00"}}},
        "staleAfterHours": 72, "missedPath": "none", "notify": {"push": False, "inTab": True, "ics": False},
        "enabled": True,
        "copy": {"title": "Turn your mind", "body": "About a minute, if you want it."},
        "choices": [{"id": "not_now", "label": "Not now", "status": "dismissed"}],
        "notification": "A minute to turn your mind, if you want it.",
    },
    {
        # Held (DT-07 part 2, docs/design/held.md): when being held helped, the person can ask to practise it once on a
        # calmer day (tomorrow, in a few days), since soothing comes more easily on a hard night after a rep on an okay
        # one. The card opens a fresh visit (not a reopen: the practice is a new minute). Opening it is the resolution.
        # Content-free: it never says what was hard.
        "id": "held_practice", "ownerModule": "dt", "tier": "practice", "resolveMode": "deeplink",
        "deepLinkTemplate": "/tool/soothe?frame=practice&followUp={followUpId}",
        "window": {"kind": "chip", "chips": {"tomorrow": {"kind": "at_local", "days": 1, "time": "18:00"},
                                             "few_days": {"kind": "at_local", "days": 3, "time": "18:00"}}},
        "staleAfterHours": 48, "missedPath": "none", "notify": {"push": False, "inTab": True, "ics": False},
        "enabled": True,
        "copy": {"title": "A calm-day practice", "body": "A minute of being held, while things are okay."},
        "choices": [{"id": "not_now", "label": "Not now", "status": "dismissed"}],
        "notification": "A minute of being held, if you want it.",
    },
    {
        # When it's a habit (DT-09, docs/design/habit-plan.md): the stretch the person committed to has ended. The chips
        # are the stretch itself (the next hour, the rest of today, three days, a week). The card reopens that visit at
        # `renew` (R9 `reopens`: kept to it → the next stretch; slipped → the lapse plan they wrote, then recommit).
        # Opening it is the resolution. It never names the behaviour (Today can be seen by others).
        "id": "habit_renew", "ownerModule": "dt", "tier": "practice", "resolveMode": "deeplink",
        "deepLinkTemplate": "/tool/habit-plan?run={sourceSessionId}&at=renew&followUp={followUpId}",
        "window": {"kind": "chip", "chips": {"hour": {"kind": "after", "minutes": 60},
                                             "tonight": {"kind": "at_local", "days": 0, "time": "21:00"},
                                             "few_days": {"kind": "at_local", "days": 3, "time": "18:00"},
                                             "this_week": {"kind": "at_local", "days": 7, "time": "18:00"}}},
        "staleAfterHours": 48, "missedPath": "none", "notify": {"push": False, "inTab": True, "ics": False},
        "enabled": True,
        "copy": {"title": "Your stretch is up", "body": "How did it go? Whatever happened, there's a next step."},
        "choices": [{"id": "not_now", "label": "Not now", "status": "dismissed"}],
        "notification": "A stretch you committed to is up.",
    },
    {
        # When it's a habit's weekly clear-mind check (DT-09 part 2, DBT DT Handout 17): booked on the plan's optional
        # *once a week*. The card reopens that visit at `clear` (R9 `reopens`: which signs showed up, the week named by
        # its loudest mind, the lapse plan after *I did it*, next week's check). Opening it is the resolution. Never
        # names the behaviour (Today can be seen by others).
        "id": "clear_mind", "ownerModule": "dt", "tier": "practice", "resolveMode": "deeplink",
        "deepLinkTemplate": "/tool/habit-plan?run={sourceSessionId}&at=clear&followUp={followUpId}",
        "window": {"kind": "chip", "chips": {"week": {"kind": "at_local", "days": 7, "time": "18:00"}}},
        "staleAfterHours": 72, "missedPath": "none", "notify": {"push": False, "inTab": True, "ics": False},
        "enabled": True,
        "copy": {"title": "Your weekly check", "body": "How has the last week been? About a minute."},
        "choices": [{"id": "not_now", "label": "Not now", "status": "dismissed"}],
        "notification": "Your weekly check is here, if you want it.",
    },
    {
        # The safety route's next-morning check (CORE-01, docs/design/safety-route.md): offered at the route's exit and
        # after a *passing* answer (opt-in: yes · no thanks). The card and the notification are content-free (Today can
        # be seen by others): opening it asks *How are you this morning?* on the route's own screen (doing okay · still
        # hard · I'm not safe; not safe reopens the calm crisis screen). The first tier: it sorts above every other card.
        # Scheduled by the route only, after the person's yes; nothing schedules it while SafetyPolicy is off.
        "id": "safety_checkin", "ownerModule": "core", "tier": "safety", "resolveMode": "deeplink",
        "deepLinkTemplate": "/safety?checkin={followUpId}",
        "window": {"kind": "chip", "chips": {"tomorrow": {"kind": "at_local", "days": 1, "time": "09:30"}}},
        "staleAfterHours": 30, "missedPath": "none", "notify": {"push": False, "inTab": True, "ics": False},
        "enabled": True,
        "copy": {"title": "Checking in", "body": "How are you this morning?"},
        "choices": [{"id": "not_now", "label": "Not now", "status": "dismissed"}],
        "notification": "Checking in",
    },
    {
        # The safety plan's review (CORE-02, docs/design/safety-route.md): a month after the plan is saved, *Did anything
        # on it help? Anything to change?* (keep as is · change something). Content-free on Today and in notifications,
        # like the morning check. Scheduled on save, signed in only; a re-save books a new one.
        "id": "safety_plan_review", "ownerModule": "core", "tier": "safety", "resolveMode": "deeplink",
        "deepLinkTemplate": "/safety/plan?review={followUpId}",
        "window": {"kind": "chip", "chips": {"month": {"kind": "at_local", "days": 30, "time": "10:00"}}},
        "staleAfterHours": 336, "missedPath": "none", "notify": {"push": False, "inTab": True, "ics": False},
        "enabled": True,
        "copy": {"title": "Your plan", "body": "A month on: still right for you?"},
        "choices": [{"id": "not_now", "label": "Not now", "status": "dismissed"}],
        "notification": "A month on: a look at your plan",
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

# Ending a relationship (IE-08, docs/design/ending-relationships.md): check-ins the person opts into, only from a
# visit that saved (never from the safety branch). Content-free on purpose (PRD IE-08, tech safety): nothing on the
# card, the notification or the calendar says what it's about. Each reopens the person's own run (R9) at the step
# it names; session-bound (copeAheadAfter.ts FOLLOW_UP_SESSION_TOOL), so only an Ending visit can schedule one.
ENDING_COPY = {"title": "A check-in you asked for", "body": "Open it when you're ready."}
ENDING_NOTE = "A check-in you asked for is ready."
ENDING_DISMISS = [{"id": "dismiss", "label": "Not any more", "status": "dismissed"}]
FOLLOW_UP_TYPES += [
    {
        # After a plan to end it or step back: the day after "today", a week after "this week" or "not sure".
        "id": "ending_after", "ownerModule": "ie", "tier": "quality", "resolveMode": "deeplink",
        "deepLinkTemplate": "/tool/ending-relationships?run={sourceSessionId}&at=after&followUp={followUpId}",
        "window": {"kind": "chip", "chips": {"today": {"kind": "at_local", "days": 1, "time": "10:00"},
                                             "this_week": {"kind": "at_local", "days": 7, "time": "10:00"},
                                             "unsure": {"kind": "at_local", "days": 7, "time": "10:00"}}},
        "staleAfterHours": 168, "missedPath": "none", "notify": {"push": False, "inTab": True, "ics": False},
        "enabled": True, "copy": ENDING_COPY, "choices": ENDING_DISMISS, "notification": ENDING_NOTE,
    },
    {
        # From the after step: the next check-in, a week or a month on (PRD: +1 week, +1 month), the person's pick.
        "id": "ending_again", "ownerModule": "ie", "tier": "quality", "resolveMode": "deeplink",
        "deepLinkTemplate": "/tool/ending-relationships?run={sourceSessionId}&at=after&followUp={followUpId}",
        "window": {"kind": "chip", "chips": {"this_week": {"kind": "at_local", "days": 7, "time": "10:00"},
                                             "month": {"kind": "at_local", "days": 30, "time": "10:00"}}},
        "staleAfterHours": 168, "missedPath": "none", "notify": {"push": False, "inTab": True, "ics": False},
        "enabled": True, "copy": ENDING_COPY, "choices": ENDING_DISMISS, "notification": ENDING_NOTE,
    },
    {
        # *Not yet* is a real answer; on a yes, two weeks on the skill opens again from its start (PRD step 4): a fresh
        # visit, so safety is asked again and nothing from two weeks ago is filled in.
        "id": "ending_revisit", "ownerModule": "ie", "tier": "quality", "resolveMode": "deeplink",
        "deepLinkTemplate": "/tool/ending-relationships?followUp={followUpId}",
        "window": {"kind": "at_local", "days": 14, "time": "10:00"},
        "staleAfterHours": 168, "missedPath": "none", "notify": {"push": False, "inTab": True, "ics": False},
        "enabled": True, "copy": ENDING_COPY, "choices": ENDING_DISMISS, "notification": ENDING_NOTE,
    },
]

# DEAR MAN's "How did it go?" (IE-B2, docs/design/dear-man-debrief.md): the prep's saved screen asks when the
# conversation is; the card opens the debrief (`?mode=debrief`), and opening it resolves it (toolSession.ts
# OPEN_RESOLVES). Session-bound (copeAheadAfter.ts FOLLOW_UP_SESSION_TOOL): only a DEAR MAN visit schedules one. The
# copy names no one: a Today card or notification can be seen by someone else.
FOLLOW_UP_TYPES += [
    {
        "id": "ask_outcome", "ownerModule": "ie", "tier": "quality", "resolveMode": "deeplink",
        "deepLinkTemplate": "/tool/dear-man?mode=debrief&followUp={followUpId}",
        "window": {"kind": "chip", "chips": {"today": {"kind": "at_local", "days": 0, "time": "20:00"},
                                             "tomorrow": {"kind": "at_local", "days": 1, "time": "19:00"},
                                             "this_week": {"kind": "at_local", "days": 4, "time": "19:00"},
                                             "unsure": {"kind": "at_local", "days": 4, "time": "19:00"}}},
        "staleAfterHours": 120, "missedPath": "none", "notify": {"push": False, "inTab": True, "ics": False},
        "enabled": True,
        "copy": {"title": "Ready to look back?", "body": "A few taps, when you're ready."},
        "choices": [{"id": "dismiss", "label": "No need", "status": "dismissed"}],
        "notification": "Ready to look back?",
    },
    {
        # One message (IE-01 Mode A, IE-B3; docs/design/one-message.md): *Save it and remind me* on the cooling screen.
        # Its card reopens that visit's run at *Still want to send it?* (`back`, a `reopens` step, R9); opening it is the
        # resolution (OPEN_RESOLVES). Session-bound: only a DEAR MAN visit schedules one. Tech safety (PRD): the copy
        # never names the person or says what the message is.
        "id": "ask_delayed", "ownerModule": "ie", "tier": "quality", "resolveMode": "deeplink",
        "deepLinkTemplate": "/tool/dear-man?mode=one&run={sourceSessionId}&at=back&followUp={followUpId}",
        "window": {"kind": "chip", "chips": {"hour": {"kind": "after", "minutes": 60},
                                             "today": {"kind": "at_local", "days": 0, "time": "19:00"},
                                             "tomorrow": {"kind": "at_local", "days": 1, "time": "10:00"}}},
        "staleAfterHours": 48, "missedPath": "none", "notify": {"push": False, "inTab": True, "ics": False},
        "enabled": True,
        "copy": {"title": "Something you saved", "body": "Still there when you're ready."},
        "choices": [{"id": "dismiss", "label": "No need", "status": "dismissed"}],
        "notification": "Something you saved",
    },
    {
        # Say no (IE-04, IE-B3; docs/design/say-no.md): the sent card's "Want me to ask how it went?" chips. Its card
        # reopens that visit's run at *Did you say no?* (`said`, a `reopens` step, R9); opening it is the resolution
        # (OPEN_RESOLVES). Session-bound: only a Say no visit schedules one. The copy names no one and says nothing
        # about a refusal: a Today card or notification can be seen by the person it was for.
        "id": "no_outcome", "ownerModule": "ie", "tier": "quality", "resolveMode": "deeplink",
        "deepLinkTemplate": "/tool/say-no?run={sourceSessionId}&at=said&followUp={followUpId}",
        "window": {"kind": "chip", "chips": {"today": {"kind": "at_local", "days": 0, "time": "20:00"},
                                             "tomorrow": {"kind": "at_local", "days": 1, "time": "19:00"},
                                             "this_week": {"kind": "at_local", "days": 4, "time": "19:00"}}},
        "staleAfterHours": 120, "missedPath": "none", "notify": {"push": False, "inTab": True, "ics": False},
        "enabled": True,
        "copy": {"title": "How did it go?", "body": "A few taps, when you're ready."},
        "choices": [{"id": "dismiss", "label": "No need", "status": "dismissed"}],
        "notification": "How did it go?",
    },
    {
        # Keep it warm (IE-06, IE-B4; docs/design/give.md): break and return. The return time the person said in their
        # line is the card's time (unannounced breaks read as abandonment, so the time is the skill). Its card reopens
        # that visit's run at *Did you go back?* (`back`, R9); opening it is the resolution (OPEN_RESOLVES). Session-
        # bound: only a Keep it warm visit schedules one. The copy names no one and says nothing about a fight.
        "id": "break_return", "ownerModule": "ie", "tier": "quality", "resolveMode": "deeplink",
        "deepLinkTemplate": "/tool/give?run={sourceSessionId}&at=back&followUp={followUpId}",
        "window": {"kind": "chip", "chips": {"m30": {"kind": "after", "minutes": 30},
                                             "m60": {"kind": "after", "minutes": 60},
                                             "tomorrow": {"kind": "at_local", "days": 1, "time": "10:00"}}},
        "staleAfterHours": 48, "missedPath": "none", "notify": {"push": False, "inTab": True, "ics": False},
        "enabled": True,
        "copy": {"title": "Time to go back?", "body": "When you're ready."},
        "choices": [{"id": "dismiss", "label": "No need", "status": "dismissed"}],
        "notification": "Time to go back?",
    },
    {
        # Keep it warm's repair (IE-06): *Want me to ask how it went?* on the repair's sent card. Its card reopens the
        # run at *Did you get to say it?* (`repaired`, R9). Session-bound; the copy names no one.
        "id": "repair_outcome", "ownerModule": "ie", "tier": "quality", "resolveMode": "deeplink",
        "deepLinkTemplate": "/tool/give?run={sourceSessionId}&at=repaired&followUp={followUpId}",
        "window": {"kind": "chip", "chips": {"today": {"kind": "at_local", "days": 0, "time": "20:00"},
                                             "tomorrow": {"kind": "at_local", "days": 1, "time": "19:00"},
                                             "this_week": {"kind": "at_local", "days": 4, "time": "19:00"}}},
        "staleAfterHours": 120, "missedPath": "none", "notify": {"push": False, "inTab": True, "ics": False},
        "enabled": True,
        "copy": {"title": "How did it go?", "body": "A few taps, when you're ready."},
        "choices": [{"id": "dismiss", "label": "No need", "status": "dismissed"}],
        "notification": "How did it go?",
    },
]

# Reserved rows: authored now so the ids exist, enabled false until their owners ship. (safety_checkin was
# one until CORE-01 authored it above.)
RESERVED = [
    ("chain_nextday", "core", "quality"),   # CORE-08
    ("missed_step", "core", "quality"),     # CORE-11
    ("diary_daily", "core", "practice"),    # CORE-04 (needs rrule)
    ("practice_daily", "mf", "practice"),   # MF (needs rrule)
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
    # Cope Ahead (docs/design/cope-ahead.md): a completed visit (the plan rehearsed and kept, or not) is
    # the rep. If-then plans: Gollwitzer & Sheeran 2006; DBT Emotion Regulation Handout 19.
    ("cope_ahead", "Cope Ahead", "Moderate", "mind", "dbt_cope_ahead",
     "Deciding what you'll do at the hardest moment, and rehearsing it once in your mind, makes the plan easier to reach when it comes.",
     ["linehan_skills_2015"], ["cope-ahead"]),
]

SOURCES = [
    ("bowen_marlatt_2009", "Bowen & Marlatt (2009), Psychology of Addictive Behaviors — surfing the urge: brief mindfulness-based intervention for college student smokers", "https://doi.org/10.1037/a0017127"),
]
