# Finishing Distress Tolerance, Interpersonal Effectiveness and Emotion Regulation

Written 10 Nov 2026. Status: **approved by Claudia on 10 Nov** (all 17 decisions in §7, with her changes to D5, D6, D12 and D13). F1 (#56) and F2 (#62, #63) are merged; the lanes build on main. **D14 partly decided (10 Nov, later):** Claudia unparked ER-15 and IE-08 (*"build them now"*); DT-09 stays parked.

Claudia's ask (10 Nov): *"I want the modules in. I want to aim for finishing distress tolerance,
interpersonal effectiveness and emotional regulation"*, then *"I want this all to be following a plan, if
there isn't one yet, we need to do one first"*, *"some of those lanes will need to collaborate with each
other because of content and technical dependencies as well as how we store this to someone's profile"*,
and *"a little bit of UI design quality control as well as clinical quality control"*.

This doc is that plan. It decides, before any lane starts:

1. what "finished" means for a skill and a module (§1);
2. where every feature of the three modules stands today, what it connects to, and what it needs (§2);
3. the contracts every lane builds against: the attempt record, profile writes, the step and embed
   library, cross-skill edges, shared content, safety, ownership and how existing tools move (§3, C1–C8);
4. the foundation work that lands before the lanes (§4);
5. the three lanes, their batches and what each waits on (§5);
6. the three review gates every lane PR passes (§6);
7. the decisions only Claudia can make, each with a default (§7).

**What it builds on, and doesn't restate**

| Source | What it gives this plan |
|---|---|
| Obsidian `Goblin DBT/DBT Module PRDs/PRD – Distress Tolerance.md`, `PRD – Interpersonal Effectiveness.md`, `PRD – Emotion Regulation.md` and their Architecture Maps | Each feature's full spec: flow, content, evidence, safety. This plan cites them as "PRD DT-02" etc. and never copies a flow |
| Obsidian `DBT Module PRDs – Index.md` | Build order (§3), the 42 cross-module edges (§7b), the 62 reciprocity gaps (§7c), the shared object registry (§8), the shared primitives (§9) |
| [`docs/README.md`](../README.md) (PR #53) | The status of all 72 features and the branch triage, as of 3 Nov |
| [Where it stands and the path forward](https://claude.ai/artifact/QnR4Q9J8HEucUZXsPdq4T2) (3 Nov) | The direction: the stack stays, a flow runtime and one router get added |
| [`skill-runtime.md`](skill-runtime.md) (PR #54) | The runtime this plan ports onto. §C1 extends its attempt record |
| [`user-profile.md`](user-profile.md) (profile thread, branch `claude/project-thread-vdmest`) | What's kept about a person, the kind registry and the one write path (`keepProfileItem`), personal ranking. §C2 defers to it |
| `/mnt/project-files/knowledge/claude/specs/voice.md` | The voice rules (S1–S9, T1–T8) the clinical gate checks copy against |
| `/mnt/project-files/handoffs/safety-plan-resume.md` | Where the safety plan and crisis route (CORE-01/02) stopped when Claudia paused it on 10 Nov |

**Out of scope here:** Mindfulness (MF), Walking the Middle Path (WMP) and CORE as modules. Where an
in-scope feature needs one of their pieces, §5 names it as an external dependency and §3 C7 says who
builds the piece if it's needed first.

---

## 1. What "finished" means

### 1.1 A skill is finished when

1. **It runs on the skill player**, behind its tool id, from a `scripts/skills/<skill>.py` file. A
   hand-built page survives only where §3 C8 says so in writing (a rich screen kept as an embed is fine;
   a whole hand-built step machine is not).
2. **Every step of its PRD flow is in**, or listed in the skill's design note as deferred, with the reason
   and the batch it lands in. Deliberate departures from the PRD are listed the way `skill-runtime.md`
   lists Check the Facts' departures.
3. **Its edges are wired both ways** (§3 C4): every exit the PRD names exists (live, or `planned` when the
   target isn't built), and every inbound edge from a skill already on the runtime exists at the source.
4. **It records per §3 C1**, keeps profile items only per §3 C2, and every new label is registered in
   `functions/src/userdata/layers.ts`.
5. **Its routing rows are authored** in `scripts/recommendations/content.py`, in `SIGNED_OFF` and
   switched on in the skill's own PR.
6. **It passed the three gates** (§6). Its copy (witness lines included) ships in `SIGNED_OFF` in the same PR.
7. **The old page is deleted** (if there was one), its tests carried as parity tests, and its old records
   still read correctly (§3 C8).
8. **Docs updated:** the feature's row in `docs/README.md`, a Product Changelog entry, the PR's Deploy
   section.

### 1.2 A module is finished when

Every feature in its PRD is finished by §1.1, or parked by Claudia in writing (with where the parking is
recorded), or blocked only on something outside the three lanes and listed in §5.5 with what it waits on.
The DBT handouts with no feature of their own are covered by the handout maps in §2 (each row points at the
feature that teaches it).

---

## 2. The modules today

38 features: DT 11, IE 12, ER 15. Eight run today as hand-built pages (Pause, Urge Surfing, Circuit Breaker,
5-4-3-2-1, DEAR MAN, Problem Solve, Opposite Action, Cope Ahead), one runs on the runtime (Check the Facts),
the rest are not built. "Needs" names the runtime pieces from §3 C3 and the shared embeds from §3 C3b.

### 2.1 Distress Tolerance

| ID | Feature (tool id) | Handouts | Today | Connects (in → out, main edges) | Needs | Saves |
|---|---|---|---|---|---|---|
| DT-01 | First, the body (`cool-down`; absorbs `five-senses`) | DT 1–3, 6 TIP | **On the runtime, part 1** (DT-B2, [`first-the-body.md`](first-the-body.md)): state tap (chest pain → `medical` banner; a pull → DT-02), Circuit Breaker cold / cool cloth (cold carries its caution line), squeeze and drop, press, orient, find; the close asked in the flow (`askFresh: 'thenVsNow'`), one swap, then lower the demand with someone on screen; the fork. `CoolDown.tsx` kept, unrouted (C8). Part 2: Help me now and the other hosts, `CrisisState` / `Intervention` nodes and `microSteps.ts`, `five-senses` as orient, reps and fade | In: Help me now, too-much bailout, acute patterns, P2, OA, PS readiness, DEAR MAN debrief, Recover body gate, FTF blank, Cope Ahead / Meet a part / Two pulls. Out: DT-02, Help-me-now fork (PS, DEAR MAN, OA, DT-04, DT-06), kit people, CORE look-back | Whole-screen embeds `doseTimer`, `breathPacer`, `squeezeRelease`, `holdRing`, `orientFind`, `bodyCard`; `$ctx` state; inline mode (`regulate`); mid-flow then-vs-now | `ext.run` + embed outputs; reps per mode |
| DT-02 | Hold to wait (`pause`) | DT 4 STOP | **On the runtime** (DT-B1, [`hold-to-wait.md`](hold-to-wait.md)): pull (hurt myself → `safetyFirst` → `safety.open`, then *are you safe?*), hold, step back (phone down → `waitLock` + `hold_come_back`), observe, the pull's own moves, two-part close; flooded short path. `Pause.tsx` kept, unrouted (C8). Deferred: hold growth, own hold line, next-morning card, MF-01 card, host `enterAt`; the DT-10 replay is built (proceed step, `prosConsReplay`) | In: DT-01 urge state, OA, Recover *Don't send yet*, FTF fight/chase, IE composer, MF-04. Out: `safety.open` (hurt myself), MF-01 card, DT-10 replay, DT-05, kit, DT-06 park, IE The Ask / FAST | `holdRing`, `waitLock`, crisis slot, `safety.open`, two-part close, follow-up action | `ext.run`; spine `actedOnUrge`, `urgeIds` |
| DT-03 | My crisis kit (`crisis-kit`) | DT IMPROVE 9, crisis survival | **None.** Safety batch | In: CORE-02 step 2, DT-01/02 closes, Help me now, CORE crisis screen. Out: DT-01 modes, DT-07, DT-06, DT-10, contacts | keep, profile reads, `cardDeck`, `voiceMemo` (D13), crisis slot | profile `kit_card` under `CrisisKit` |
| DT-04 | Let it be (`let-it-be`; `turning-the-mind`, `willingness` entries) | DT 10–14 | **On the runtime, part 1** (DT-B4, [`let-it-be.md`](let-it-be.md)): changeability check (Tools entry), witness line, what's to accept, the still-happening check (`other_person` slot, Ending careful), the fight, willing or digging in with threat lines, willing hands, a statement on paper, grief, still in my hands, the close on the fight (in flow); stirred short path, flooded body first. Eight skills' planned exits flipped; routing rows renamed, live 12 Nov. Part 2: turning-the-mind card and reminders, `acceptance_target`, `willingness` entry, inline for IE-05 / Recover, witness embed | In: PS "nothing in yours", IE-05 Let go (inline), Recover *Let it land* (inline), ER-02 fits-can't-change, DT-01 fork, DT-06 reopen, DT-11. Out: WMP lines, IE FAST, ER values/PLEASE, DT-07, DT-01 | witness embed, `bodyCard`, `holdRing`, inline mode with `enterAt`, keep, follow-up action, `turnFork` | profile `acceptance_target`; reps |
| DT-05 | Ride it out (`urge-surfing`) | Urge surfing (MBRP), DT 21 adaptive denial | **On the runtime** (DT-B3, [`ride-it-out.md`](ride-it-out.md)): pull (hurt myself → `safetyFirst` → `safety.open`), flooded → body or hold first, the wave (`urgeWave`: soft checks, no digits), *not now* with swaps and a renewable five-minute round, bigger ×2 → DT-01 / DT-02, the trace (`waveTrace`), two-part close. `UrgeSurfing.tsx` kept, unrouted (C8); row live 12 Nov. Deferred: FTF shape / Tune sound / ER-08 engine, backgrounded checks, morning card, host `urgeId`, `NotNowSwap` nodes, fade | In: DT-02, FTF chase, OA urge up, kit, Tools. Out: DT-01/02 on bigger ×2, MF-01, DT-09 lapse plan | `urgeWave` (shared motion engine with ER-08), backgrounded checks (follow-up action), two-part close, `doseTimer` | `ext.run` + wave trace in `out` |
| DT-06 | Give your mind a job (`mind-job`) | DT 7 ACCEPTS | **On the runtime, part 1** (DT-B3, [`mind-job.md`](mind-job.md)): three ways in, each with a return: the ladder (levels 0–2 picked by warmth, `orientFind` tasks, a few seconds of staying with the good ones, *too much · about right · more · enough* moves it), then the check in the flow (`back`, `askFresh: 'thenVsNow'`) and the fork (PS, DEAR MAN, DT-04, the lid); a break (ACCEPTS families, `mind_job_back` reopens at `back`, `resumeAt`); the lid (`lidShelf`, label, `lid_reopen` reopens at `reopen`: PS, ER-02, DT-04). Flooded: body first or the coolest tasks only. DT-01 fork and DT-02 *check* exits flipped; `accepts` rows renamed, live 12 Nov. The `attention-shift` guided activity is unchanged. Part 2: `AttentionLadderState`, level 3 (ER-04), re-park heads-up, worry / therapy reopen times, own-past comparisons, `cardDeck` | In: DT-01 fork, rumination results, kit, PS guard, DT-02 *check*. Out: ER-04 (L3), reopen fork (PS, IE, DT-04, ER-08), CORE-08 | `orientFind`, `lidShelf`, `holdRing`, profile read (ladder level), keep, follow-up + resume | profile `AttentionLadderState` (kind to add, §C2); parked item = follow-up + `ext.run` (D2) |
| DT-07 | Held (`soothe`, `body-scan`) | DT 8, 8a | **On the runtime, part 1** (DT-B5, [`held.md`](held.md)): pick how to be held (hand on heart with a warm mug, something soft or hands on the thighs; warmth; one sense, settling or waking up; kind words on paper, D13 text only), *I don't deserve this* → thirty seconds as an experiment, a minute's hold, the close in the flow (warmer · same · stirred up), backdraft → only the hand and the breath, press, or stop (twice → lighter things and someone to talk to), then *someone you could call or text?*. Flooded: the hand or warmth only. New concept `dbt_self_soothe`; DT-02's *A hand on my heart* move and DT-04's grief exit flipped. One routing row, live: ashamed / embarrassed on replay beside Recover (direction `down`: never blank). Part 2: `body-scan` (still dangling in PS), Held hands, voice memos, kit soothe cards, DT-01 swap, MF-06, night mode | In: DT-01 swap, kit, DT-04 grief, MF-06, IE-06. Out: DT-01, contacts | `bodyCard`, `doseTimer`, `heldHands`, `cardDeck`, `voiceMemo` (D13) | kit cards (section soothe) |
| DT-08 | Thoughts passing through (`thoughts-passing`) | DT 15 | **On the runtime, part 1** (DT-B5, [`thoughts-passing.md`](thoughts-passing.md)): catch (DEAR MAN's `ThoughtPattern`s or own words), file (six kinds; a replay or a thought not their own → orient and a referral line, no close), one move (*I'm having the thought that…*, slow, leaf, screen; no silly voices), back to the room, the close in the flow (louder → DT-01; as loud on a facts kind → ER-02). Flooded: heads-up, body or try anyway. New concept `dbt_mindfulness_current_thoughts`; DT-04's willful threat and the debrief's *belief* fix hand on to it. Tagged, no routing row (every fitting word already shows two signed-off cards). Part 2: stretching words / leaf embeds, MF practice home and fade, CORE-08, `DefusionMove` nodes | In: DEAR MAN debrief (belief fix), DT-04 step 3, CORE-08. Out: DT-01, ER-02, orient + referral lines | defusion embeds, `orientFind`; runs where D3 says | `ext.run` |
| DT-09 | When it's a habit (`habit-plan`) | DT 16–21 | **None.** Blocked on CORE-04 `TargetBehavior` and Claudia's substance-scope call (D14) | In: DT-02/05 acted yes, CORE targets. Out: CORE-08, ER-04, DT-05/10, kit | keep, profile reads, follow-up action, checklist embed | profile `AbstinencePlan` (kind to add) |
| DT-10 | Pros & cons card (`pros-cons`) | DT 5 | **On the runtime** (DT-B2, [`pros-cons.md`](pros-cons.md)): urge frame, own reasons first, pros acknowledged (none listed for hurt myself, which opens `safety.open` first), the card (`prosConsCard`), kept as `pros_cons`; Hold to wait replays it for the same pull (`prosConsReplay` on proceed). Deferred: the commitment / stay-or-end frames and inline builder (IE-08's link waits, planned), frequent-urge offer, fade, lapse edit, kit | In: DT-02 frequent urge, CORE-11, IE-08, ER-12, kit. Out: kit, host return `{lean, cardId}` | keep, `$ctx.frame`, inline mode, `prosConsReplay` | profile `pros_cons` |
| DT-11 | Rebel without the wreckage (`alternate-rebellion`) | DT 21 | **On the runtime** (DT-B1, [`alternate-rebellion.md`](alternate-rebellion.md)): squeeze, function, matched rebellion, card, real-squeeze routes; routing row off. Deferred to after F2: scheduled / irreversible checks, witness embed, `urge_change`; the kit menu to the safety batch (DT-03) | In: DT-02 chip, Tools, kit. Out: PS, DEAR MAN, FAST, DT-04, IE-08 (planned) | chips only; follow-up action for scheduled/irreversible checks | `ext.run`; kit cards (rebellion menu) later |

### 2.2 Interpersonal Effectiveness

| ID | Feature (tool id) | Handouts | Today | Connects | Needs | Saves |
|---|---|---|---|---|---|---|
| IE-01 | Ask for what you need (`dear-man`) | IE 4, 5, 5a, 8 | **Shipped, hand-built** (`DearMan.tsx`; content from `scripts/dear-man/content.py` since IE-B1). Fixed in IE-B2's first PR: *Done for now* → `/`; Body Reminder from `ConfidenceCue`; the picker and safety question (D4) open the prep. IE-B2's second PR (11 Nov, [`dear-man-debrief.md`](dear-man-debrief.md)): the debrief is the `dear_man_debrief` skill (`?mode=debrief`) with the outcome screen and IE-11, the prep↔debrief link, `ask_outcome` on, Let go after a refused ask to be heard. IE-B3's second PR (12 Nov, [`one-message.md`](one-message.md)): **One message** (Mode A) is the `dear_man_one` skill (`?mode=one`, the Tools intent, Recover's chase hand-off) with `wise_mind_check`, the composer, the cooling screen (`waitLock`, `ask_delayed`), the prediction and `ask_outcome` into the debrief. One routing row, live (12 Nov): *let down* / *left out* beside Recover. IE-B4's first PR (12 Nov, [`dear-man-prep.md`](dear-man-prep.md)): **the prep** (Modes B and C) is the `dear_man_prep` skill behind `PREP_ON_PLAYER`, with the `pocketCard` and the `mode: 'plan'` projection. Open: the parts hurt chip, the anchor preview in History, the hand-built page's deletion | In: Recover Ask, Check the Facts, PS, People, debrief retry, CORE chain. Out: `safety.open`, IE-08, IE-05 Let go, IE-02, IE-11, `cool-down`, `cope-ahead`, FTF short, `wise-mind`, `pause` | Split into three skills under one id (D11). `personPicker`, `messageComposer`, `predictOutcome`, `sizeIt`, `planCard`, `pocketCard`, existing `anchorGenerator` / `priorityRank` / `copeAheadStep` / `debriefWho` / `angryPartCard` as embeds, follow-up action, `$ctx` hand-off input, resume | `ext.run` + `DearManSession` projection (§C8); `Interaction` (IE-03) |
| IE-02 | Rehearse it (`rehearse`) | Behavioural rehearsal | **None.** Cope Ahead's `Rehearse` is imaginal, not a two-figure stage | In: IE-01 plan card, IE-04/06 closes, debrief, IE-08. Out: `cope-ahead`, real-conversation follow-up | `rehearsalStage` (Stage runtime, 2D first, D12), Cope Ahead inline if-then | `ext.run` (no new label, D2) |
| IE-03 | People (`Person`, `Interaction`) | IE 4, 8, WS5 | **`Person` built 11 Nov 2026** (IE-B2 first PR, [`people.md`](people.md)): profile kind `person` (label encrypted, role, safe / risk / safeAskedAt), the `people` slice, Me → My people (set aside, two-step *Forget them*), the picker with D4's safety question in DEAR MAN's prep, the safety seam `functions/src/safety/personSafety.ts` (server refuses a prep for a safety-route person). `Interaction` (log, `WITH` the person) and the refusal counts (`Person.refusalsValidation` / `refusalsPractical`, in the `people` slice) built with the debrief (IE-B2 second PR, [`dear-man-debrief.md`](dear-man-debrief.md)) | Picker in every IE skill, Recover, DT-03/04, ER-02/05 | `personPicker` + `safetyGate`, validators | profile `person`; log `Interaction` (new label) |
| IE-04 | Say no (`say-no`) | IE 5 Assert, IE 8 | **Built 11 Nov 2026 (IE-B3 first PR, [`say-no.md`](say-no.md))**: `say_no` on the skill player after the picker (`PersonFirstSkill`, shared with the debrief); No is enough for *scared of what they'd do* and anything sexual or physical; the sizing as a counting derive; the `messageComposer` card with the FAST strip; prediction as plain asks; `no_outcome` reopens the run at *Did you say no?*; the `Interaction{kind:no}` projection. Not yet: the conflict card (needs Interaction history), three nos → GIVE (IE-B4) | In: Tools, IE-01 boundary situations, PS, debrief *gave in*, OA boundary split. Out: CORE resources (*No is enough*), IE-02, `check-the-facts` (guilt) | `personPicker`, `sizeIt`, `messageComposer`, `predictOutcome`, crisis slot, follow-up action | `ext.run`; `Interaction{kind:no}` |
| IE-05 | Keep your self-respect (`fast`) | IE 7 | **Built 10 Nov 2026 (IE-B1)**: standalone review and Let go as two skills, `boundaryLine` embed (`docs/design/fast.md`); the strip, keep and follow-up wait as listed there. Before: **none** as a tool. Recover's Land exit has one boundary line, on the `boundaryLine` card since IE-B4 (the `boundaryLocked` copy lock is gone). 7 dead PS links | In: IE-01 refusal check, composers, Recover Land, PS ×7, debrief. Out: DT-04 (inline), WMP need elsewhere, IE-09, IE-02 | `boundaryLine` (copy), `fastStrip` (slot), DT-04 inline | `ext.run`; profile `boundary_line` |
| IE-06 | Keep it warm (`give`) | IE 6, 6a | **None.** `/tool/give` hard-coded in Problem Solve; 10 dead PS links | In: IE-01 Mode B, IE-04 opener, IE-08, PS. Out: IE-01, IE-02, `check-the-facts` (guilt) | `giveLines`, validation-line picker (WMP `forOther` corpus), `bodyCard`, Check the Facts inline | `ext.run`; `Interaction{repair, break_return}` |
| IE-07 | What matters most, how hard to push (`sizeIt`) | IE 4, 8 | **Partial.** DEAR MAN's priority reorder. The dime game's "no" column built in Say no (IE-B3) as a counting derive (`level` / `final`, five questions + a softer / firmer nudge, named levels); the "ask" column is DEAR MAN's prep's *what matters most* (one pick, IE-B4 first PR); how hard to push on an ask isn't sized yet | Embedded in IE-01, IE-04, IE-08, IE-11 | `sizeIt` embed (or a counting derive) | host's `ext.run` |
| IE-08 | Ending a relationship that's hurting you (`ending-relationships`) | IE 13 | **Built 10 Nov 2026** on the runtime ([`ending-relationships.md`](ending-relationships.md)), unparked by Claudia ("build them now"): safety first every visit, the other-person resources, no scripts / rehearsal / check-ins in the safety branch, R15, quick exit, opt-in content-free check-ins, `after` re-entry; no routing rows by design; Gates 1–3 fixes in. **Listed** 11 Nov (D14), and linked from Problem Solve and Rebel | In: People, IE-01 safety route, IE-11, DT-11. Out: CORE safety, `wise-mind`, DT-10, IE-02, `cope-ahead`, OA love urges | persist-nothing mode, quick exit, crisis slot, DT-10 inline | `ext.run` only when opted in; `Person.status` |
| IE-09 | Find your people (`finding-connection`) | IE 10–11 | **None.** 3 dead PS links | In: Let go *meet it elsewhere*, IE-08 after, People. Out: People, Recover | `predictOutcome` (liking variant), follow-up action | `Interaction{reach_out}` |
| IE-10 | Notice them (`mindfulness-of-others`) | IE 12 | **None** | In: IE-01 *their side*, debrief, Recover v2. Out: IE-05 | `pileSort` (two columns), `personPicker`; runs where D3 says | `ext.run` |
| IE-11 | When it didn't work (inside the debrief) | IE 9 | **Built 11 Nov 2026** inside `dear_man_debrief` ([`dear-man-debrief.md`](dear-man-debrief.md)): one chip from Handout 9's factors (`TroubleshootFactor`), its fix line and conditioned offers, the chain on *look at what happened first* | In: IE-01/04 outcome partly/no. Out: IE-02, IE-07, IE-12, IE-05, DT, `cope-ahead`, DT-04, IE-08 | one ask + conditioned offers (Check the Facts' pattern) | debrief's `ext.run` |
| IE-12 | What gets in the way: factors and myths | IE 2, 2a | **Mostly built** inside DEAR MAN (barriers, anchors) | In: IE-01 scene, IE-11. Out: `check-the-facts`, DT-10 | `pileSort`, Check the Facts inline | profile own counter lines (`own_line`) |

### 2.3 Emotion Regulation

| ID | Feature (tool id) | Handouts | Today | Connects | Needs | Saves |
|---|---|---|---|---|---|---|
| ER-01 | Too hot to think (P2 service) | ER 23 | **Partial, and enough.** `TooMuchLink` + `BreakdownHandoff`; the probe is out (30 Sep). The player puts P2 under every screen | Plays DT-01 rows once DT-01 ships | resume (for *come back later*) | `ext.run.handoffs` |
| ER-02 | Check the facts (`check-the-facts`) | ER 8 | **On the runtime, v1.2** (ER-B1): safety chips (danger from a person → `other_person` crisis slot and a safe hand-off, screens 3–5 skipped), planned exits to DT-04 and ER-08, and the missing-fact step with its `check_fact` follow-up built. 6 routing rows built, live since 12 Nov (default to connected). Not built: loop guard (needs a server-side read), inline mini-card (moved to ER-B5, with its first host) | In: OA, Tools, PS, CORE-08; planned MF-03, Recover, DEAR MAN, IE-06/10/12. Out: PS, DEAR MAN, OA, `wise-mind`, `cope-ahead`; planned DT-04, ER-08 | crisis slot, follow-up action, inline mode | `ext.run`, `fitsFacts` |
| ER-03 | Opposite Action (`opposite-action`) | ER 9–11, 13 | **Shipped, hand-built v2** (1981 lines, own backend with 0–10 numbers). ER-B3 part 1 (#89, supersedes #48): #48's doors and multi-feeling replayed on main; `not_fit:helpful → clarify` and clarify opens Check the Facts (items 5–6); five interpersonal urges (item 8); the support route shows the `other_person` resources and offers Ending careful. Part 2 (built 12 Nov): the port on the skill runtime (`scripts/skills/opposite_action.py`, `doorPicker` embed, per-feeling sub-runs, the danger / boundary / not-sure split, want-change, prediction vs what happened, no numbers, `guilt-punish` → safety.open, `oa_try` reopening the run, `OppositeActionSession` v3 projection, close `regulation_down`); its *As built* lists what's deferred: `docs/design/opposite-action-v3.md` | In: check-in, Check the Facts, FTF, Today `oa_plan`. Out: PS, `pause`, `check-the-facts`, MF P5, ER-08, `urge-surfing`, DEAR MAN | `doorPicker` and `oaSteps` (built); `bodyReset` and `stepPicker` as cue chips + hold and named sizes (v3 *As built*); `urgeReadout` (ER-B5); `followUpResume` is R9's reopen; per-feeling runs, resume, projection (built) | `ext.run` + `OppositeActionSession` v3 projection (no numbers) |
| ER-04 | Good things (`good-things`) | ER 15–17 | **None.** `micro-win` guided activity; positive-state result is a dead end | In: positive state, low-energy result, DT-06 L3, ER-08 savour, PS. Out: follow-ups, WMP-05 | `holdRing`, `cardDeck`, `weekPlanner`, keep, follow-up action, profile read | profile `thing_i_like` |
| ER-05 | Cope ahead (`cope-ahead`) | ER 19 (C) | **On the skill runtime (ER-B2, 11 Nov)**: `cope_ahead` ([`cope-ahead.md`](cope-ahead.md) *On the skill runtime*); DEAR MAN's 11 `CopeAhead` nodes linked `SAME_MOVE_AS` (two held); kept plan is `cope_ahead_plan`. Hand-built 17 Oct; old page unrouted | In: Tools, DEAR MAN, Recover Today card, Check the Facts, IE-02, PS. Out: 5-4-3-2-1, move tools, Today after card | `rehearsal`, `holdRing` (settle), `keepCard`, `planSentence`, `partAnchor`, `partsWhoShowsUp`, crisis slot with variant, per-field own max, "first, not pre-selected", inline mode, projection | `ext.run` + `ext.ca` projection; profile `cope_ahead_plan` (profile plan P6) |
| ER-06 | Route ER by state | — | **Superseded by rf-v2** (live 5 Oct). What's left is rows per new tool | Each lane authors rows, off | — | — |
| ER-07 | PLEASE check (`please-skill`, named "Running low") | ER 20 | **None** on `main`; closed PR #33 is a content source | In: OA/PS redirects (13 refs), FTF *body*, CORE diary. Out: ER-13, Reflect | follow-up action, profile read (hidden rows), one-per-day upsert | `ext.run` (D2) |
| ER-08 | Let it be a wave (`mindfulness-emotions`) | ER 21–22 | **None.** ~53 routes point at it | In: Check the Facts fits-can't-change, OA *keep it*, FTF, DT-06 reopen, positive state. Out: ER-04 | `waveRoom` (FTF rooms; shared engine with DT-05); runs where D3 says | `ext.run` |
| ER-09 | What matters to me (`values-clarification`) | ER 17–18 | **None.** 7 refs | In: PS, OA guilt card, IE FAST/IE-09, ER-04. Out: value-step follow-up | `pileSort`, keep, profile read (*still yours?*) | profile `value` (`Goal`) |
| ER-10 | Know this feeling (`emotion-guide`) | ER 1–6 | **Partial.** Naming is shipped (check-in, FTF); no feeling card, strip or myths | Card after any naming; strip embedded by CORE-08 | `feelingCard`, `episodeStrip` | `FOUND_WORD` from more hosts |
| ER-11 | Build mastery (`build-mastery`) | ER 19 (B) | **None.** 6 PS refs | In: PS, low-energy result, ER-09. Out: follow-ups | follow-up action, profile read (ladder) | WMP-05 ladder (profile) |
| ER-12 | Problem Solve (`problem-solve`) | ER 12 | **On the runtime** (ER-B1, third PR; [`problem-solve.md`](problem-solve.md)): content still from the graph files (`ps_graph.py`, options keep `PRESENTS` edges), `TooMuchLink` from the player, `/tool/give` and every dead link a planned exit, step 7 (evaluation) as a `ps_review` card that reopens the run at `review` (the `reopens` runtime step). The old page stays unrouted until a follow-up PR deletes it. Not built: pros and cons (waits for DT-10 inline), the pile sort (ER-B4) | In: Tools, OA, Check the Facts, check-in, Today `ps_step`. Out: companion tools by `linkedToolId`, CORE-11 | chips only; resume for the evaluation card; DT-10 inline later | `ext.run` (old `ext.er` keys kept readable) |
| ER-13 | Sleep reset (`sleep-reset`) | ER 20b | **None** | In: ER-07, Tools. Out: CORE safety, ER-15 | night mode is CORE's (Index §5.1 #13) | profile anchor times |
| ER-14 | It isn't working (`er-troubleshoot`) | ER 24 | **On the runtime** (ER-B1; [`er-troubleshoot.md`](er-troubleshoot.md)), with its `try_again` nudge on the cards whose move is another go. No routing rows by design (Claudia, 10 Nov) | In: OA readout, ER-08, Tools. Out: ER-07, ER-02, DT, PS, ER-10, CORE-11 | chips + "first yes wins" transitions | `ext.run` |
| ER-15 | Rewrite the nightmare (`nightmare-rescript`) | ER 20a | **On the runtime** (ER-B6; [`nightmare-rescript.md`](nightmare-rescript.md)): replay gate to a clinician card, setting / change / your ending, the `rescriptCard` read-through with Stop, `nightmare_script` keep, `nightmare_rehearse` reminders one at a time. No routing rows by design | In: ER-13. Out: referral (waits on CORE) | `holdRing` (settle), `rescriptCard` | `ext.run`; profile `nightmare_script` (`ProfileFact`) |

---

## 3. Shared contracts

These are fixed before any lane writes a skill. A lane that needs to change one changes it in its own
PR, with the change called out at the top of the PR description and the plan updated in the same PR, and
the other lanes told (§5.4).

### C1. The attempt record

This extends [`skill-runtime.md` "The attempt record"](skill-runtime.md). It is what
[`user-profile.md` §6](user-profile.md) (personal ranking), Reflect, Today, CORE's diary and the router read.

**One visit, one record.** A skill run is a `ToolSession` (the spine's per-visit log record) with the
generic `ext.run`. No skill adds a per-visit log label: not `UrgeEpisode`, `FactCheck`, `RehearsalSession`,
`SayNoSession`, `VulnerabilityCheck` or the other per-visit labels the PRDs name (D2). Readers that the
PRDs gave those labels (CORE diary, Insights) read `ToolSession` + `ext.run` + the spine's ask-fresh
fields instead. The exceptions are the legacy labels in C8, kept as server-written projections, and
genuinely separate objects with their own lifecycle (`Interaction`, IE-03).

**The shape**, as built plus what the lanes add (additions marked new):

```
ext.run = {
  skillId, versionId,
  path: [stepId…],                    // ≤ 48 (new limit; was 24)
  answers: [{fieldId, optionIds, valueOwn?}…],   // ≤ 32 (new limit; was 16)
  offeredExitIds, exitId, embedsShown, handoffs,  // as built
  ctx: { urgeId?, personId?, frame?, enterAt?, situationId?, partId? },   // new: what came in, ids only
  out: { [embedName]: {…} },          // new: embed outputs, each embed's own declared schema
  kept: [{kind, itemId}…],            // new: profile items kept in this run (C2)
  followUps: [{type, followUpId}…],   // new: follow-ups this run scheduled
}
```

Rules:

1. **The whole `ext` stays ≤ 4 KB**, with no numeric scales and no free text except declared own words
   (length-checked, never linted), as `extSchemas.ts` enforces today. `tests/skill-contracts.test.mjs`
   (§4) computes each skill's worst-case record from its longest path and fails a skill that can exceed
   it. A skill whose detail can't fit (DEAR MAN prep's per-step own words) keeps the detail in its C8
   projection and only ids in `ext.run`.
2. **`out` is declared per embed** in the embed registry: field names, closed sets, counts and seconds
   only. Seconds held and counts are measurements of what happened, not ratings, and are allowed; a
   rating the person gives is never a number (an option id instead). DT-05's wave trace is categorical
   samples (`still_here`, `fading`, `gone`, `bigger`) with offsets in seconds. **Amended (DT-05, 11 Nov):** the
   built trace is the samples in order with no offsets, since an embed's `measures` hold single values; offsets wait
   on a `runtime:` PR (C7) that lets an embed declare a list measure (`offsetsSec`), and the cadence is the step's
   `checkSec` until then.
3. **Outcomes live on the spine, not in `ext.run`.** *Did it help* is the close's `thenVsNow`; *did you
   act on it* is `actedOnUrge`; both are ask-fresh fields already registered. A skill that needs both
   asks the new two-part close (C3a, `urge_change`). Mid-flow checks that steer the flow (DT-01's
   *louder · same · quieter*, DT-05's wave taps) are answers or `out`, never pre-filled. A mid-flow check
   that *is* the close carries `askFresh: 'thenVsNow'` (built in DT-01: the newest answer goes to the spine and
   no `SessionClose` follows; `skill-runtime.md`).
4. **One answer may be promoted to an ask-fresh field** (`askFresh` on the field), as `fitsFacts` is. A
   lane adding a promoted field adds it to `ASK_FRESH_FIELDS` and the export test in the same PR.
5. **Chains.** The next skill's session carries this one as `hostSessionId` (as built). An **inline
   sub-run** (C3c: DT-01 inside OA, DT-04 inside IE-05, Check the Facts' mini-card inside IE-06) is its
   own `ToolSession` with the sub-skill's tool id, `entry: 'inline'` and `hostSessionId` = the host. It
   counts toward its own tool in personal ranking (`user-profile.md` §6.1), not the host's. It asks no
   close of its own; if the sub-skill has a mid-flow change check (regulate does), that answer is written
   as the sub-run's `thenVsNow`, so the sub-run still has an outcome.
6. **Legacy ext namespaces are frozen for new skills.** `ext.dt`, `ext.er`, `ext.ie`, `ext.ca`, `ext.wm`
   take no new fields. A ported tool keeps writing its old namespace only as a C8 projection.
7. **Own words are encrypted, and are never data.** From the first lane PR on, every own-words value
   (`answers[].valueOwn`, own text an embed's `out` declares, own text a keep step passes) is written
   through `functions/src/shared/crypto.ts` (envelope encryption, one data key per person, Cloud KMS;
   decided in `user-profile.md` on PR #55). A field is marked own words in the skill file (`own`) or the
   embed's `out` schema (`ownText: true`), and the contract test fails an unmarked free-text field.
   Nothing a reader counts, filters or routes on may be an own-words field: those are option ids.
8. **Store-agnostic.** Whether user data stays in Neo4j or moves to Firestore is still open (Claudia,
   `user-profile.md` §3; recommendation: stay). Nothing here depends on the answer: the record stays
   `ToolSession` + `ext.run`, and every write goes through the userdata registry, so a whole-store move
   would be one migration. No lane puts new data in a second store.

### C2. Profile writes and reads

Defers to [`user-profile.md` §4.2](user-profile.md), and does not restate it. What the lanes hold to:

1. **One write path.** A skill's *keep* step calls `keepProfileItem({kind, value, sourceSessionId})`
   through the runtime's keep action (C3a). No lane writes a profile label directly, and no lane adds a
   callable that does. Parts keep their own writers (test-enforced), as today.
2. **The tap is the yes.** A keep step shows what will be kept and needs a tap. Nothing moves from a log
   record to the profile without one. IE-04's PRD idea of setting `Person.safe` to *not sure* without a
   tap is out; the safety answer is kept only when the person answers it.
3. **A kept value never holds an ask-fresh field.** The kind's validator strips them;
   `tests/user-data-layers.test.mjs` gains a case per kind.
4. **The owning lane writes the kind** (validator, slice resolver, `PROFILE_NEEDS` lines, `ProfileKind`
   copy in `scripts/profile-layer/content.py`) in the PR that ships the first tool that keeps it, never
   before. Kinds the lanes add beyond `user-profile.md` §4.2's table: `attention_ladder` (DT-06),
   `abstinence_plan` (DT-09), `nightmare_script` (ER-15). Each gets a row added to that table in the same
   PR.
5. **Reads only through `getProfileContext(toolId)`** and the skill's `PROFILE_NEEDS` entry. The runtime
   exposes the slices as `$p.<slice>` refs and as an options source (C3a). Resolvers never read a
   `:LogRecord` (test-enforced): a counter that comes from log outcomes (IE-03's refusals) is a field on
   the profile item, written by the server when the person answers the outcome (their answer is the
   yes), or a separate server read, never a resolver reading logs.
6. **Pre-fill only what the profile holds, and say so.** A profile value shown in a flow is shown as
   *still true?* (the profile rule). Ask-fresh fields are still asked every visit.

The `kinds.ts` registry and `keepProfileItem` are `user-profile.md` step P1. The runtime's keep action
waits on it (§4, F2).

### C3. The step and embed library

#### C3a. Runtime capabilities (the player and the pure machine)

Built once, in the foundation (§4), never per lane. Each is generic: no skill id appears in player code.

| # | Capability | What it is | First users |
|---|---|---|---|
| R1 | **Whole-screen embed step** | `kind: 'embed'` renders the registered component; `onDone(output)` writes `out[embed]` and may set answers the transitions read. The embed gets `ctx`, the run's answers and the room tokens | DT-01/02/05, ER-05, IE-02 |
| R2 | **Context in** (`$ctx.*`) | The page passes route state and query (`urgeId`, `personId`, `frame`, `enterAt`, `situationId`, `partId`, `emotionIds`, carried `band`, `returnTo`) into the run. Steps may `showWhen` on them ("skip the urge question when the host sent one"). The skill declares which keys it accepts (`accepts`), and C4's test checks every inbound exit against it. Replaces DEAR MAN's `dearManHandoff` and Cope Ahead's `?first=` | DT-01/02/04/05/10, IE-01, ER-05 |
| R3 | **Profile reads** | `$p.<slice>` refs and an options source `{profile: '<slice>'}` (own items first). Needs the skill's `PROFILE_NEEDS` entry | DT-03/06/10, IE-01 (person), ER-04/05/09 |
| R4 | **Keep action** | A step action `keep: {kind, from: [fieldIds…]}` that runs on the step's primary tap, calls `keepProfileItem`, and records `kept` | DT-04/10, IE-05, ER-04/05/09 |
| R5 | **Follow-up action** | A step action `followUp: {type, whenFrom: fieldId}` calling `scheduleFollowUp`; the type must be in the `FollowUpType` registry (`scripts/practice-spine/content.py`). On an ask step it runs on the primary tap; on a hand-off (ER-B1), `whenFrom` names the card's one optional chip field and the reminder is scheduled as the card is left (see F2 as built) | DT-02/05/06/11, IE-01/04, ER-02/04/12/14 |
| R6 | **Crisis slot and `safety.open`** | A step may declare `crisis: {variant, when}`: `CrisisBanner` (default or `other_person`) shown above the step while the condition holds. `safety.open` is a reserved exit every skill may offer; until CORE-01 ships it opens the interim crisis screen (D5), afterwards CORE-01's route. No lane builds its own crisis screen | DT-02/05, IE-04/08, ER-02/05 |
| R7 | **Two-part close** | A close kind `urge_change` asking *Did you act on it?* (`actedOnUrge`) then then-vs-now, in `functions/src/spine/tools.ts` and `src/lib/spine/close.ts` | DT-02, DT-05 |
| R8 | **Inline mode** | `<SkillPlayer mode="inline" skillId enterAt onReturn>` runs a skill inside a host screen (host stays mounted, like `TooMuchLink`), with its own `ToolSession` (C1 rule 5), returning declared outputs. A skill marks the steps it can start at (`enterAt`) and what it returns (`returns`). This is how the Index §9 primitives that have steps are built (C3c) | DT-01 `regulate`, DT-04 `acceptance`, DT-10 builder, ER-02 mini-card, ER-05 if-then |
| R9 | **Resume** | A run can be reopened at a step from a deep link or a follow-up (`?run=<sessionId>&at=<stepId>`), reading that run's own answers back up to that step (the same visit's answers, so not a pre-fill from memory; later steps are asked again) | ER-12 evaluation, ER-03 `oa_plan`, DT-06 reopen, ER-01 *come back later* |
| R10 | **Counting derive** | `derive: {kind: 'count', from, weights, table}`: count picks (half for *not sure*) and look the total up in a table. Keeps `sizeIt`'s dime game as data instead of code | IE-07 |
| R11 | **Per-field own-words max** | `own.max` per field (Cope Ahead's moves are 90, the skill default 140) | ER-05 |
| R12 | **Option first, not pre-selected** | An option list can put a `$ctx` value first without selecting it (generalises `carriedFirst`) | ER-05 `?first=`, IE-01 Recover hurt chip |
| R13 | **Deadline timer hook** | `useDeadlineTimer` (timestamp deadline, wake lock, chime and buzz, audio twin for iOS, reduced motion), lifted from `CoolDown.tsx` and `WaitLock.tsx`, used by every hold and dose embed | every timed embed |
| R14 | **Projection hook** | Server-side, `functions/src/skills/projections.ts`: a registry `toolId → project(run) → legacy writes`, run in the same transaction as the session write. Empty in the foundation; C8 says who fills it | ER-03, ER-05, IE-01 |
| R15 | **Persist-nothing mode** | A step can switch the run to write nothing (no `ext.run`, a bare session with `status` only) unless the person taps *save privately*. **Built 10 Nov 2026** (IE-08, IE-B6): `persist: {after, nothingWhen}`, a deferred session that writes nothing until the run reaches its end or a check-in, and a bare close (status only) when an answer changes after that; with `quickExit` and `resumeAt` ([`ending-relationships.md`](ending-relationships.md)) | IE-08 safety branch |
| R16 | **Per-pick repeat** | `forEach: fieldId` over a run of steps, one sub-run per pick (C1 rule 5). Built by the ER lane only if D7 keeps multi-feeling OA; otherwise not built | ER-03 |

#### C3b. Shared embeds

A shared embed is one registered component with a declared `props` and `out` schema, registered in both
`src/components/skillPlayer/embeds.ts` and `scripts/skills/content.py` `EMBEDS` (the contract test checks
both). **Wrap the existing component, don't rewrite it.** The owner builds it, the others use it as is,
and a change another lane needs goes through the owner's review (§5.4). Built in the foundation means it
lands with F2 because two lanes need it in their first batch.

| Embed | What it is | Wraps | Owner | Built in | Used by |
|---|---|---|---|---|---|
| `witness` | The receive beat: echo, one witness line, skip, say it my way | `WitnessBeat.tsx`, `getWitnessLines` | Foundation | F2 | DT-04, DT-11, IE-01 direct entry, ER function lines |
| `holdRing` | Press-and-hold or tap-start ring, slowing pulse, early release counts, growth across holds; variants `press`, `timed`, `settle` | `ProgressRing`, OA `HoldToConfirm`, Cope Ahead `Settle`, Wise mind `HoldButton`, R13 | DT | F2 | DT-01/02/04/06/07, ER-04, ER-05 settle, ER-15 |
| `bodyCard` | One pictogram body cue with a ring: willing hands, half-smile, hand on heart, press | OA body cues, Recover compassion copy; **built** in DT-01 part 1 (`BodyEmbeds.tsx` over `src/lib/bodyModes.ts`) | DT | DT-B2 | DT-01/04/07, IE-06, MF-03/06 later |
| `doseTimer` | Hands-free dose with lead-in (cold, move burst, warmth) | `CoolDown.tsx` clock and audio, `ColdReset`; **built** in DT-01 part 1 (`BodyEmbeds.tsx` over `src/lib/bodyModes.ts`) | DT | DT-B2 | DT-01, DT-07 |
| `breathPacer` | Exhale-weighted pacer, dizzy/tingly stop rule | `BreathOrb`, capacity `sigh`; **built** in DT-01 part 1 (`BodyEmbeds.tsx` over `src/lib/bodyModes.ts`) | DT | DT-B2 | DT-01, DT-07, P2 |
| `squeezeRelease` | Squeeze on the in-breath, drop on the out-breath ×3 | FTF Shape blob; **built** in DT-01 part 1 (`BodyEmbeds.tsx` over `src/lib/bodyModes.ts`) | DT | DT-B2 | DT-01 |
| `orientFind` | Eyes-open find-N with date, time and where you are on screen | `Orient`, capacity `orient`, `FiveSenses.tsx`; **built** in DT-01 part 1 (`BodyEmbeds.tsx` over `src/lib/bodyModes.ts`) | DT | DT-B2 | DT-01, DT-06, MF-01 later |
| `rebellionCard` | The rebellion on the square paper (wraps `PaperCard` unchanged, no keep), *against* the squeeze, *for* the function, then *When?* | `RebellionCard.tsx` | DT | DT-B1 | DT-11 (DT-03's kit menu card may reuse it) |
| `waitLock` | Timestamp lock with a come-back, draft stays visible, never locks the send | `WaitLock.tsx`; **built** as an embed in DT-02 (`WaitLockEmbed.tsx`: plain wait, `clock={false}`, *I'm back* always there; `waited` · `back_early` + `durationSec`) | DT | DT-B1 | DT-02, IE composer |
| `urgeWave` | The urge as a moving object animated by taps; axis-free trace at the close. Shares a motion engine with `waveRoom` | FTF Shape urge loop | DT (engine too) | DT-B3 (**built**: `urgeWave` + `waveTrace`, `UrgeWave.tsx` over `src/lib/urgeWave.ts`; 2D, the shared engine waits on ER-08) | DT-05, ER-08 visual |
| `lidShelf`, `turnFork` | The lid (jar, hold, label, shelf) and the Stage fork | Stage prototype | DT | DT-B3 (**built**: `lidShelf`, `LidShelf.tsx` over `src/lib/lidShelf.ts`; the label is the next ask step) / DT-B4 | DT-06, DT-04 turn card |
| `cardDeck` | One card at a time, *next* changes modality, per-card then-vs-now | new | DT | DT-B3 | DT-03, DT-07, DT-10 replay, ER-04 |
| `prosConsReplay` | The 20 s replay of a kept pros & cons card. **Built** (DT-10) as a still card on Hold to wait's proceed step; `prosConsCard` is the build-time read | new | DT | DT-B2 | DT-02, kit, CORE-11 |
| `voiceMemo`, `heldHands` | Own or trusted voice; clay hands holding the shape | new / Held prototype | DT | after D13 | DT-03/04/07 |
| `personPicker` (+ `safetyGate`) | Recent people, *someone new* (label + role); returns `route ok / let_go / safety` | new | IE | IE-B2 | every IE skill, Recover, DT-03/04, ER-02/05 |
| `messageComposer` (+ `fastStrip`, `giveLines` slots) | Chip sentence builder with live preview, copy / open messages, cooling heads-up | new | IE | IE-B3 | IE-01 Mode A, IE-04, IE-06, IE-08 |
| `predictOutcome` | *well · mixed · badly · won't answer* + confidence; liking variant | new | IE | IE-B3 | IE-01, IE-04, IE-09 |
| `sizeIt` | What matters most + how hard (named level on a ladder, never a number) | DEAR MAN priority list, R10 | IE | IE-B3 | IE-01, IE-04, IE-08, IE-11 |
| `boundaryLine` | Copyable boundary line picker | Recover's Land line | IE | IE-B1 | IE-05, Recover Land, IE-08 |
| `pocketCard` | Three swipe cards, no input | new | IE | IE-B4 | IE-01 Mode C, IE-06 |
| `rehearsalStage` | Two figures, scripted turns, move chips, stop (2D first, D12) | `PartFigure`, `PullsStage`, den SVG | IE | IE-B5 | IE-02, IE-08 |
| DEAR MAN's own pieces: `anchorGenerator`, `priorityRank`, `copeAheadStep`, `debriefWho`, `angryPartCard`, `checkInResult` | Existing components, wrapped | as named | IE | IE-B2/B4 | DEAR MAN skills; `angryPartCard` also Recover |
| `keepCard` | The paper keepsake (PaperCard), then the keep action | `PaperCard`, `KeepCard` | ER | ER-B2 | ER-05, IE-01 plan card, ER-04, DT-03 |
| `rehearsal` | Imaginal first-person beats | Cope Ahead `Rehearse` | ER | ER-B2 | ER-05 |
| `rescriptCard` | The rewritten nightmare on the square paper (wraps `PaperCard` unchanged, no keep): *It starts* / *Then* / *It ends*, one read-through with a quiet clock and Stop | `RescriptCard.tsx` | ER | ER-B6 | ER-15 |
| `planSentence`, `partAnchor`, `partsWhoShowsUp` | Cope Ahead's live read-back, part anchor, parts step (built as a `profile: 'parts'` field under a `partsLine` heading, no embed of its own) | Cope Ahead components | ER | ER-B2 | ER-05 |
| `pileSort` | Flick items into two or three piles | new (the family behind IE's two columns, ER-09's card sort, PS decompose, MF-03) | ER | ER-B4 | ER-09, ER-12 decompose, IE-10, IE-12 |
| `weekPlanner` | Place items on days, one follow-up each | new | ER | ER-B4 | ER-04 L2, ER-11 |
| OA's pieces: `doorPicker`, `bodyReset`, `stepPicker`, `urgeReadout`, `followUpResume` | Existing OA components (and PR #48's doors), wrapped | as named | ER | ER-B3 | ER-03; `urgeReadout` also DT-05 close |
| `waveRoom`, `feelingCard`, `episodeStrip` | FTF room variant with gestures; the feeling card; walk the wave | FTF rooms | ER | ER-B5 | ER-08, ER-10, CORE-08 |

#### C3c. Primitives that are skills

The Index §9 primitives that have more than one step are **skills run inline** (R8), not embeds, so they
have one source, one record and their own outcome:

| Primitive (Index §9) | Skill | Enter at | Returns | Owner |
|---|---|---|---|---|
| `dt.regulate`, `dt.holdAlongside` | DT-01 `first_body` | `state`, `mode:<kind>`, `hold` | `{quieter: bool, modes}` | DT |
| `dt.holdToWait` | DT-02 `hold_to_wait` | `hold` | `{held: bool, heldSec}` | DT |
| `dt.acceptance` | DT-04 `let_it_be` | `fight`, `statement` | `{statementId?, turned: bool}` | DT |
| `dt.prosCons` | DT-10 `pros_cons` | `urge`, `commitment` | `{lean, cardId?}` | DT |
| `dt.parkIt` | DT-06 `mind_job` | `lid` | `{parked: bool, followUpId?}` | DT |
| ER P3 check-facts mini-card | ER-02 `check_the_facts` | `story` | `{fits, alternativeIds}` | ER |
| ER P8 `er.copeAhead` | ER-05 `cope_ahead` | `moment` | `{planKept: bool, itemId?}` | ER |
| MF P2 wise-mind check | `wise_mind_check` (new, small) | start | `{answer}` | IE (first consumer, IE-B3: built in One message as an ask step, `source`); MF takes it over later |

Until a primitive's skill ships, a host offers a normal exit to the tool instead (`planned` if the tool
doesn't exist), and switches to inline when it does. That switch is the owner's PR, not the host's.

### C4. Cross-skill edges in the graph

1. **Every jump is a `SkillExit`** with `OPENS → (:TherapyConcept {appToolId})`, its `carry` and `query`
   declared. A page that isn't on the runtime yet links with `linkTo`, as today, and is listed in
   `tests/fixtures/legacy-exits.json` until it ports.
2. **The target declares what it accepts** (`Skill.accepts`, R2). The contract test fails an exit whose
   `query` or `carry` keys the target doesn't accept.
3. **Inline use is an edge too:** `(:SkillStep)-[:EMBEDS_SKILL {enterAt}]->(:Skill)`, so "who embeds
   DT-04" is a graph query.
4. **Exits to unbuilt tools are `planned`.** The exit is written with `planned: true` and the concept it
   will open; the player doesn't show it; the contract test lists every planned exit. When the target
   ships, its PR flips the planned exits that point at it (they're the owner's to flip, so no dead link
   ever renders: the Index §11 dead-link list goes away by construction).
5. **Reciprocity is tested.** `tests/fixtures/module-edges.json` transcribes Index §7b's 42 edges and the
   §7c gaps assigned to these modules, each with `from`, `to`, the batch that builds it and its state.
   `tests/module-edges.test.mjs` fails when an edge whose both ends are on the runtime is missing from the
   graph, or when a built edge isn't in the fixture. A lane adding an edge adds the fixture row.
6. **Carry ids, never answers.** Exits carry emotion ids, `urgeId`, `personId`, `situationId`, `partId`,
   `frame`, `returnTo`. They never carry an ask-fresh value (then-vs-now, acted, fits) or own words. The
   band moves only through the client-side carry (`band.current()`, ≤ 20 min).
7. **Tool ids are decided once** (D6) and recorded in `src/data/tools.ts` before the tool's batch starts.
   Routing, PS links and exits all use that id; a renamed planned id is renamed everywhere in one PR.

### C5. Shared content and who owns it

| Content | Source file | Owner | Others may | Rule |
|---|---|---|---|---|
| `EmotionRegulationContent`, `ActionUrge` (incl. behaviour urges, `self_harm` with `lifeThreatening`) | `schema/opposite-action-data.cypher` (ER-B3 reads it without a database through `scripts/skills/oa_graph.py`; moving it to a `content.py` is ER-B5, so ER-B3 still edits the `.cypher` by hand) | ER | DT adds behaviour urges (send, check, hit, leave, use, binge, buy); `self_harm` is CORE-authored, added by DT-B1 as a reviewed row | A new urge id must be mapped in `scripts/parts/content.py` (`EXPRESSES` or `HELD`) in the same PR, or `tests/parts-content.test.mjs` fails |
| `CopeMove` (one list of moves for DT, IE, ER) | `scripts/cope-ahead/content.py` | ER | IE links `StayOnTrackMove` with `SAME_MOVE_AS` | DEAR MAN's 11 `CopeAhead` nodes are linked `SAME_MOVE_AS` in ER-B2, never deleted or renamed (parts mappings point at them) |
| DEAR MAN graph (situations, options, barriers, anchors, debrief vocabulary) | new `scripts/dear-man/content.py` regenerating today's cypher | IE | — | Ids and labels kept exactly (IE-B1 proves token-equivalence: `build.py --prove`) |
| Check the Facts lists (`Interpretation`, `Alternative`, threats, event kinds) | `scripts/skills/check_the_facts.py` | ER | IE, MF reuse by id or inline | — |
| `Intervention` (body modes) and the migrated `microSteps.ts` | new `scripts/distress-tolerance/content.py` | DT | ER P2, IE body step use DT-01 inline | `microSteps.ts` is deleted when its content is in the graph |
| Witness corpus (`ValidationLine`, hosts, function lines, `forOther`) | `scripts/witness/content.py` | WMP (no lane) | Each lane appends its hosts and lines in its own block, ids prefixed by tool | A lane adds its lines to `SIGNED_OFF` in the same PR. A skill opening with a witness line must work with the line absent (the beat skips) |
| `FollowUpType` registry | `scripts/practice-spine/content.py` | CORE (no lane) | Each lane appends its types | Content-free notification text; the type names the tool that may schedule it |
| Routing rows, concept tags, `PLANNED` | `scripts/recommendations/content.py` | CORE (no lane) | Each lane authors its tools' rows, in `SIGNED_OFF` and on | Claudia can switch any row off |
| Parts mappings | `scripts/parts/content.py` | Parts | Each lane maps its new ids | As today |
| Kit cards, pros & cons, wise mind check, acceptance statements | Their skills (C3c) | DT / IE | Read through profile slices or inline | The safety plan (CORE-02) references kit cards by id, never copies them |
| `Person`, `Interaction` | IE-03 | IE | DT, ER, WMP read through the `people` slice | Read-only outside IE |
| `ThingILike`, `Goal{kind: value}` | ER-04, ER-09 | ER | DT-06/04/09 keep into `thing_i_like` with their `source` | — |

### C6. Safety

Every lane holds to these. The clinical gate (§6, Gate 3) checks each one.

1. **Overwhelm.** `TooMuchLink` sits under every screen (the player does it). Nothing locks; *keep going
   anyway* is always there. No skill asks the capacity question or a reworded version (out since 30 Sep).
2. **The band without the probe.** A skill must work with no band: that's its standard path (the PRDs'
   *stirred* path). It takes the flooded path only when a band is carried (`band.current()`), passed by a
   host, or the entry is Help me now (flooded by rule). A skill never infers flooded from its own
   questions (D1).
3. **Direction is a hard filter.** Blank, freeze and dissociated states never get a calming-only move
   (cold, slow breathing, relaxation, eyes closed); flooded + blank gets a brief regulate, then orient, no
   words. `CONTRAINDICATED_FOR` rows remove options; personal history never brings one back
   (`user-profile.md` §6.2). Cold carries its caution line.
4. **Danger options declare the crisis slot.** Any option that can carry danger has a `danger: 'self' |
   'other'` prop, and its step declares R6's slot with the matching variant (`other_person` for danger from
   someone else). The contract test enforces it, the way Cope Ahead's danger-variant test does.
5. **Self-harm goes to `safety.open` first.** *Hurt myself* (DT-02, DT-05, kit) opens the safety route
   before anything else, 100% of the time (a test per skill). A DT hold runs alongside resources, never
   instead of them.
6. **People who are a risk.** Once IE-03 ships, `Person.risk = harm` removes asks, GIVE, rehearsal tiers
   other than *practise leaving*, and ending scripts, server-side as well as in the flow. IE-01's safety question is live (IE-B2).
7. **Exclusions.** No food, alcohol, shopping or scrolling as soothing or distraction; no enumerated pros
   for self-harm; eating-disorder-safe wording (no amounts); no promised durations; no "makes you
   stronger".
8. **The crisis route and the danger-from-a-person route.** `safety.open` opens the interim crisis screen
   (D5) until CORE-01 ships (`/mnt/project-files/handoffs/safety-plan-resume.md`). Danger from another
   person opens the `other_person` banner (911, then the DV Hotline, then 988), with R15 and a quick exit
   where the skill is IE-08 or its careful frame. Nothing else waits on a safety or clinician review.

### C7. Ownership

| Area | Owner | Notes |
|---|---|---|
| Player, machine, conditions, `skillTypes.ts`, `functions/src/skills/`, `extSchemas.ts` `run` | Foundation, then shared | After F2, a lane changing these does it in a separate small PR titled `runtime:`, reviewed against C3a; never inside a skill PR. Exception for a lane that has one branch (first used by ER-B1's second PR, #67): the change is its own `runtime:` commit, reviewed by the plan thread, and called out at the top of the PR description |
| `scripts/skills/<skill>.py`, its page, its tests | The skill's lane | One file per skill |
| `scripts/skills/content.py` `SKILLS`, `EMBEDS`; `embeds.ts` | Shared, append-only | Merge conflicts resolved by keeping both lines |
| Generated files: `schema/skills.cypher`, `src/data/content/skills.json`, `tests/fixtures/skills-content.json` | Nobody (generated) | Never hand-merged: on conflict, rebase and regenerate |
| Shared embeds | Their owner in C3b | Another lane needing a change opens it against the owner's review |
| `layers.ts`, constraints, `ASK_FRESH_FIELDS`, endpoints fixture, auth matrix | Shared, append-only | |
| Profile kinds | The kind's owner (`user-profile.md` §4.2) | |
| Recover changes the modules need (`personId`, drop `boundaryLocked` and `tooHot` (**done**, IE-B4 second PR), embed IE-05 / DT-04 inline) | IE lane (IE-B2 / IE-B4) | WMP isn't a lane; the IE lane does these in the PR that needs them |
| MF pieces needed first (`wise_mind_check`, MF-01 card fallback) | First consumer (IE / DT) | Handed to MF when it starts |
| CORE pieces needed first (Help-me-now fork, `safety.open` interim) | DT (fork, inside DT-01), Foundation (interim screen) | CORE-07 takes the fork over later |

### C8. Moving an existing tool

1. **Same tool id, same URL.** The page becomes `<SkillPlayer skillId=… />`; links, routing rows, Today
   cards and follow-ups keep working.
2. **Old records keep reading.** Whatever reads the tool's old ext or label today keeps working on the
   day it ports. Either the server writes the old shape as a projection of `ext.run` (R14, the default
   for anything with several readers), or every reader is changed to read `ext.run` **and** fall back to
   the old shape, in the same PR. No migration of old records (the spine's "wrap, don't migrate" rule).
3. **Per tool:**

| Tool | Old shape and readers | Port rule |
|---|---|---|
| Pause (DT-02) | `ext.dt.stepsDone`; nothing else reads it | No projection; `ext.dt` stays readable for old sessions |
| Urge Surfing (DT-05) | `urgeIds`, close; slider numbers never stored | No projection |
| Circuit Breaker, 5-4-3-2-1 (DT-01) | `ext.dt.techniqueId`, `skillIds`, `sensesDone` | No projection; Circuit Breaker's art and audio move into `doseTimer` |
| DEAR MAN (IE-01) | `DearManSession` (Reflect's plans tab, `getDearManSessions`, `getDearManReflection`), `ext.er.handoffs`, `copeAheadPartId`, `whoShowedUp` (parts tags) | Projection writes `DearManSession` and the three `ext.er` fields until those readers read `ext.run`; device resume drafts move to R9 |
| Problem Solve (ER-12) | `ext.er` PS keys; `ps_step` follow-up | Readers changed to `ext.run` with fallback (two readers). Done (ER-B1 third PR): `sessionSourceMatch` matches both; `ps_step` stays registered for the old cards, `ps_review` replaces it |
| Opposite Action (ER-03) | `OppositeActionSession` (5 callables, Today card, `oa_plan` mirror, `UrgeTrend`, Reflect, parts stats), `ext.er.oaFacts/oaEffect/oaRoute` | Projection writes `OppositeActionSession` v3 (no numbers; readers handle v1–v3) and the `ext.er` fields. Server route re-validation pinned against the skill's transitions |
| Cope Ahead (ER-05) | `ext.ca` (`copeAheadAfter.ts`, `followUp.ts`, `tag.ts`, Reflect, `stats.ts`), `cope_ahead_after` | Projection writes `ext.ca` (zero-risk path); kept plan becomes `cope_ahead_plan` (old own lines stay) |

4. **The switch.** `src/lib/skillRuntime/playerTools.ts` lists the tool ids whose page renders the player.
   A port PR adds its id and keeps the old page in the tree, unrouted. After Claudia has used it and the
   gates passed, a follow-up PR deletes the old page and its dead code. Rolling back is removing the id.
5. **Parity tests.** The old page's tests are carried as tests over the skill, plus one parity test per
   step as `tests/skill-check-the-facts.test.mjs` does.

---

## 4. The foundation (lands first)

Two PRs, one after the other, on top of PR #54 (the skill runtime). PR #54 must merge before F1. Nothing
user-visible changes in either: Check the Facts keeps working, and the contract tests run over it.

**F1. Player contract** (no profile work, so it doesn't wait on the profile thread)

- R1 whole-screen embeds with `out`; R2 `$ctx` and `accepts`; R6 crisis slot, reserved `safety.open`
  exit and the interim crisis screen with the non-US lines (D5); R10 counting derive; R11 per-field own
  max; R12 option first; planned exits; the new `ext.run` limits and fields (C1: `ctx`, `out[]`).
- `tests/skill-contracts.test.mjs`: every skill's exits target known or planned tool ids; carry and query
  keys are accepted; embeds are registered on both sides with an `out` schema; danger options have a
  crisis slot; worst-case `ext` ≤ 4 KB and passes the server schema; every step reachable; close kind
  declared; text in `ext.run` only on `*Own` keys (what encryption will cover).
- `tests/module-edges.test.mjs` and `tests/fixtures/module-edges.json` (C4).

R7 and R13 moved to F2 (built 10 Nov): their first user is DT-02, which needs `holdRing` from F2 anyway,
and both are tested best with that embed. The keep and follow-up contract checks move with R4 and R5.

**F2. Writes, inline and the review harness** (after `user-profile.md` P1 lands)

- R3 profile reads, R4 keep action, R5 follow-up action, R7 `urge_change` close, R8 inline mode, R9
  resume, R13 `useDeadlineTimer`, R14 the empty projection registry, `playerTools.ts` and
  `tests/fixtures/legacy-exits.json` (C8).
- Own-words encryption: nothing to register. PR #55 encrypts every `text` field of `EXT_SCHEMAS` at close
  (`spine/extOwn.ts`), so `ext.run`'s `valueOwn` (answers and `out`) is covered; readers call `decryptExtOwn`.
  `tests/skill-contracts.test.mjs` keeps free text in `ext.run` on `*Own` keys only (C1 rule 7).
- Contract checks for keep actions (registered kinds) and follow-up actions (registered types).
- Shared embeds `witness` and `holdRing` (C3b).
- **The skill review harness**, extending `dev/review/` (which already renders Parts and Cope Ahead with
  real components): `dev/skills-review.html` renders any skill with fixture content and stubbed services,
  and `dev/review/skills-shots.mjs` screenshots each step at 390 × 844 and 360 × 780, light and dark. Output:
  a gallery per skill, which Gate 2 reviews and the PR links.

**F2 as built (10 Nov), and where it departs from the above:**

- R8 inline runs use the existing entry `embedded` (host session as `hostSessionId`), not a new `inline`
  entry: the spine already had the shape. R9 resume reads the person's own run through a new callable,
  `getSkillRun` (own session, the asked tool, ≤ 14 days, own words decrypted), opened by
  `?run=<sessionId>&at=<stepId>`; ask-fresh answers are always asked again. Since ER-15 (`runtime:` commit in
  its PR), only the answers of the steps up to the one reopened come back: a later step is asked again, never
  pre-filled (a read-through visit would otherwise re-pick last time's reminder chip and schedule it unasked).
  A field a step's `followUp.whenFrom` names is never read back at all, even at the step reopened (`scheduled`
  isn't restored, so it would book twice). A link's `enterAt` holds only for the run it reopens: when the resume
  finds nothing (too old, another version, a failed read), the fresh run drops it and is a whole first visit.
- Embed and hand-off steps take step-level quiet `links` (ER-15's `runtime:` commit), rendered under the embed
  or the card; an ask step's links stay on its fields. For a way out that belongs on every screen, such as
  *Talk to someone now*. A link's `enterAt` with no `?run=` at all doesn't hold either.
- `own.seed` (ER-15): on an open own-words box of a one-pick list field, the chips are starters, not answers. A
  tap writes the chip's words into the box to change; once the words are the person's own, the chips step aside,
  so a tap never erases what they wrote.
- Embeds hear `covered` while safety.open or P2 sits over the step (it stays mounted). An embed with a clock
  decides what that means: ER-15's read-through counts it as Stop. `TooMuchLink` gained an optional `onOpen`.
- Embeds declare their **props** as well as their output: `EMBED_PROPS` in `embeds.ts`, mirrored in
  `content.py` (`copy` · `int` · `enum` · `field` · `id`, each optionally `optional`). `build.py` checks
  every embed step and slot against it, and a `copy` prop must be a key in the skill's copy, which the
  player swaps for its text, so every word an embed shows is voice-checked graph copy. Embeds receive
  `answerIds` (the run's answers as ids) next to `picked`. A lane adding an embed (IE's `boundaryLine`,
  for example) adds it to both `EMBED_PROPS` as well as `EMBEDS` / `EMBED_OUTPUTS`.
- `holdRing` (built in F2, owned by DT from here): `press` · `timed` · `settle`, on `ProgressRing` and the
  parts flows' press gesture (lifted unchanged into `src/hooks/useHoldGesture.ts`, which `HoldButton` now
  uses). The rules are pure in `src/lib/holdRing.ts`: the 1 Hz pulse slowing 8% a beat to 45%, growth
  across holds (`growthPct`), early release keeping its seconds, settle counting a breath from a quarter.
  It answers `held` · `partly` · `skipped` with seconds, holds done and early releases. No digits; the
  pulse stops under reduced motion; a way past appears after the first try.
- `witness`: `WitnessBeat` unchanged, logged against the visit's ToolSession (`hostKind: 'tool_session'`)
  once the session is written (`ToolSessionApi.ready()`). As a whole step it answers what the person did
  (`yes` · `sort_of` · `no` · `none_fit` · `own` · `skip` · `seen`). A skill's `moment` must be one the
  witness server knows (test-enforced); a module needing its own moment adds it with its lines.
- **R5 on a hand-off** (added in ER-B1's second PR, agreed 10 Nov): a hand-off may carry a `followUp`
  whose `whenFrom` is the card's only field: the type's window chips, one pick, optional, never ask-fresh, no
  own words. The card shows the chips under the line; leaving by its move or *Done* schedules (before any
  navigation), no chip schedules nothing, once per step per run; lines, offers and crisis slots never read
  the chip. `build.py` refuses any other hand-off field. First users: ER-14's nudge to try again.
- The harness opens any step through the player's own resume, with a made-up run whose path reaches it
  (each earlier field's first option), and adds a review-only skill (`dev/review/embeds-skill.json`) that
  shows each shared embed. `--bands` shoots each band and `--all` adds 360 × 780 and a light room. Not
  built yet: walking every branch (one shot per option of every field a transition reads) and running
  `a11y.mjs` over the same screens. Until then, Gate 2 opens branches by hand on the page.

The profile thread builds `user-profile.md` P1 and the own-words crypto (`encryptOwn` / `decryptOwn`,
PR #55); F2 starts when that is pushed and builds on it.

**Lanes may start writing skill files after F1** for skills that need only F1 (§5 marks them).

---

## 5. Lanes

Three lanes run in parallel after F1, one per module. Each lane is one thread with one PR per batch (a
batch may be two PRs when it holds two unrelated skills). Within a lane, batches go in order; across
lanes, only the arrows in §5.4 hold anyone up.

### 5.1 DT lane

| Batch | Skills | Needs | Why this order |
|---|---|---|---|
| DT-B1 | **DT-11** Rebel without the wreckage (new; built, first PR); **DT-02** Hold to wait (replaces Pause); `waitLock`; behaviour urges + `self_harm` urge rows (C5) | F1 (DT-11 needs nothing more from the runtime, but merges and deploys after #55, whose own-words encryption C1 rule 7 needs from the first lane PR on; DT-02 needs R1, R6, R7, and `holdRing` from F2, so DT-02 lands after F2) | DT-11 is pure chips and Claudia's ask. DT-02 is the first whole-screen embed in a small flow and defines the urge vocabulary DT-05/10 use |
| DT-B2 | **DT-10** Pros & cons (keep; inline; `prosConsReplay` into DT-02); **DT-01** First, the body (body-mode embeds, `Intervention` content, `microSteps.ts` into the graph, inline `regulate`, the Help-me-now fork as its hand-off step). **Built:** DT-10 (#77); DT-01 part 1 (#81: the skill, five body embeds, the in-flow close; the hosts, `Intervention` content, `microSteps.ts` and inline `regulate` are part 2) | F2 | DT-10 is the cleanest proof of keep. DT-01 is the heaviest and the most depended-on: half of ER, IE and WMP hand to it |
| DT-B3 | **DT-05** Ride it out (`urgeWave`, slider gone, rows reactivated; **built** 11 Nov, [`ride-it-out.md`](ride-it-out.md)); **DT-06** Give your mind a job levels 0–2, the lid, returns, reopen (`lidShelf`; **built** 12 Nov, [`mind-job.md`](mind-job.md); `cardDeck` moves to its first consumer, DT-03 / DT-07 / ER-04) | DT-B2 (DT-01 as the bigger ×2 escalation), R5, R9 | Both need follow-ups and resume; DT-06 level 3 waits on ER-04 |
| DT-B4 | **DT-04** Let it be, turning the mind, willingness (`bodyCard` in use, `turnFork`, inline `acceptance` for IE-05 and Recover; **part 1 built** 11 Nov, [`let-it-be.md`](let-it-be.md)) | `acceptance_target` kind | IE-05's full Let go and Recover's *Let it land* wait on it |
| DT-B5 | **DT-07** Held, **DT-08** Thoughts passing through (part 1 of both built 12 Nov 2026: [`held.md`](held.md), [`thoughts-passing.md`](thoughts-passing.md)) | D3, D13 | Need the runtime decision for MF practices and, for DT-07's voice, storage |
| Safety batch | **DT-03** My crisis kit | CORE-02 | Ships with CORE-01/02 |
| Blocked | **DT-09** When it's a habit | CORE-04 `TargetBehavior`, D14 | §5.5 |

### 5.2 IE lane

| Batch | Skills | Needs | Why this order |
|---|---|---|---|
| IE-B1 | **Built 10 Nov 2026** (`docs/design/fast.md`; token-equivalent, not byte-equivalent: `build.py --prove`). `scripts/dear-man/content.py` regenerating today's DEAR MAN cypher (no behaviour change); **IE-05** FAST standalone and Let go (`boundaryLine`; `fast` gets its `appToolId`, the 7 PS links resolve; Let go offers DT-04 as a `planned` exit until DT-B4) | F1 | Small, unblocks dead links, and the content source must exist before DEAR MAN can be ported |
| IE-B2 | **Two PRs on the lane's one branch.** First, **built 11 Nov 2026** ([`people.md`](people.md)): `Person`, the `people` slice, the picker (`PersonPicker`, a component the second PR wraps as the `personPicker` embed) with D4's safety question in DEAR MAN's prep and its safety route, server refusal, *Done for now*, `ConfidenceCue`; Recover's `personId` waits for Recover to ask who (WMP's Recover v2). Second, **built 11 Nov 2026** ([`dear-man-debrief.md`](dear-man-debrief.md)): the debrief as `dear_man_debrief` with IE-11, the picker asked by the page before it (not an embed), the outcome screen, `Interaction`, refusal counters, `ask_outcome` on, Let go after a refused ask to be heard; the old end cards and silent check-in dropped. As planned: **IE-03** minimal (`Person`, `Interaction`, `personPicker` + `safetyGate` without the safety question unless D4; validators); **DEAR MAN debrief** as `dear_man_debrief` with **IE-11** (factor sort, conditioned offers), the outcome screen, the prep↔debrief link, `ask_outcome` switched on; fixes: *Done for now*, Body Reminder into the graph as `ConfidenceCue`; Recover passes `personId` | F2; `person` kind | The debrief is a linear chain that maps 1:1 onto steps, and it is where IE-11 lives |
| IE-B3 | **Built** (Say no 11 Nov, [`say-no.md`](say-no.md); One message 12 Nov, [`one-message.md`](one-message.md)). **IE-01 Mode A** one message (`messageComposer`, `predictOutcome`, `fastStrip`, `waitLock` from DT-B1, follow-up); **IE-07** `sizeIt` (R10); **IE-04** Say no; `wise_mind_check` (C3c) | IE-B2, DT-B1 | Say no is greenfield and forces the composer pieces Mode A reuses |
| IE-B4 | **DEAR MAN prep** (Mode B) as `dear_man_prep` (**built 12 Nov, first PR**: [`dear-man-prep.md`](dear-man-prep.md), with the Mode C pocket card) with the existing pieces wrapped, Mode C pocket card, Recover drops `boundaryLocked` and `tooHot` (**built 12 Nov, second PR**: the ask is open above `askMax` with a heads-up and the body first beside it; the Land line is the `boundaryLine` card); **IE-06** Keep it warm; **IE-12** myths into the barrier step; IE-05 Let go switches to DT-04 inline | IE-B3, DT-B4 (Let go), ER-B5 (Check the Facts inline for IE-06 repair; moved from ER-B1 10 Nov, then from ER-B3 12 Nov) | DEAR MAN's whole page can be deleted only after this batch |
| IE-B5 | **IE-02** Rehearse it (`rehearsalStage`, 2D, ~30 scripts); **IE-09** Find your people; **IE-10** Notice them | D12, ER-B2 (Cope Ahead inline), D3 (IE-10) | |
| IE-B6 | **Built 10 Nov 2026** ([`ending-relationships.md`](ending-relationships.md); R15 and the skill in one PR, the lane's one branch). **IE-08** Ending a relationship that's hurting you: R15 persist-nothing mode (its runtime PR first, reviewed against §R), quick exit, crisis slot with the `other_person` banner (911, then the DV Hotline, then 988; CrisisBanner stays the only file with numbers), `Person.status` only once IE-03 exists | F2; D14 decided (Claudia, 10 Nov: build now, on the existing banner and DV resources). DT-10 and Cope Ahead are `planned` exits until DT-B2 / ER-B2 make them inline | Unparked by Claudia. Its clinical gate (§6) reads every path as someone in danger from the other person: nothing kept unless they tap *save privately*, quick exit on every screen, never a plan to confront |

### 5.3 ER lane

| Batch | Skills | Needs | Why this order |
|---|---|---|---|
| ER-B1 | **ER-12** Problem Solve port (adds `TooMuchLink`, `/tool/give` becomes a `planned` exit, evaluation card through resume); **ER-14** It isn't working (new); **ER-02 v1.1** (safety chips with crisis slot, missing-fact follow-up, `planned` exits to DT-04 and ER-08, inline mini-card) | F1 for ER-14; F2 for ER-12's evaluation and ER-02's follow-up and inline mode | Problem Solve is the port `skill-runtime.md` names next and needs no embeds. **First PR (F1 only, merged #58):** ER-14 and ER-02 v1.1's safety chips and planned exits. **Second PR:** R5 on a hand-off, ER-02's missing-fact follow-up (v1.2), ER-14's nudge to try again. **Third PR (built):** ER-12, with the `reopens` runtime step. ER-02's inline mini-card moves to ER-B5 (Do the Opposite's *clarify* is its first host; ER-B3 ships it as a hand-off) |
| ER-B2 | **Built 11 Nov 2026.** **ER-05** Cope Ahead port (its embeds, `ext.ca` projection, `cope_ahead_plan`, DEAR MAN's 11 moves linked `SAME_MOVE_AS`; runtime: slots under `$title`, `followUp.whenFrom` an earlier field with `whenDefault`, `options.emotionsFrom`, resume reading back an earlier whenFrom answer and keeping booked steps, build.py's one booking step per follow-up type). `ext.ca` is ids only (own words stay in `ext.run`, so `{run, ca}` fits 4 KB); a danger moment's plan offers only `DANGER_SAFE_MOVES`. Inline `copeAheadIfThen` waits for its first host (IE-02 / IE-08), like ER-B1's mini-card | F2, IE-B1 (the DEAR MAN content source exists, so ids are stable) | IE-02, IE-08 and the debrief need the inline if-then |
| ER-B3 | **ER-03** Opposite Action v3 port (doors per D7, scale removal, `OppositeActionSession` v3 projection, route fix, danger / boundary / not-sure split, want-change and prediction per D9; R16 if multi-feeling stays). Part 1 is #89; part 2 (the port, built 12 Nov) is `opposite-action-v3.md` | ER-B1, D7, D9. Moved to ER-B5 (12 Nov): Check the Facts' inline mini-card (part 2's *clarify* is a hand-off to Check the Facts) and `ActionUrge` to a `content.py` (oa_graph.py reads the `.cypher` until then) | The biggest port; last of the existing tools |
| ER-B4 | **ER-07** PLEASE (id per D6, shape per D8); **ER-04** Good things (`thing_i_like`, `weekPlanner`, `cardDeck`); **ER-09** Values (`pileSort`, `value`) | F2; DT-B3 (`cardDeck`) | DT-06 level 3, IE-05's value chips and IE-09 wait on ER-04 / ER-09 |
| ER-B5 | **ER-08** Let it be a wave (`waveRoom` on DT's motion engine); **ER-10** Know this feeling; **ER-11** Build mastery (WMP-05 ladder) ; **ER-13** Sleep reset (with CORE's night mode); Check the Facts' inline mini-card (first host: Do the Opposite's clarify); `ActionUrge` to a `content.py`; Do the Opposite's v3 deferrals (`opposite-action-v3.md` *As built*: the deferred fit check, `fitStack`, `urgeReadout`, parts lines, the `repr` frame, the loop guard incl. ER-14's *too strong twice*, H10 step 5) | D3, DT-B3 (motion engine), CORE night mode for ER-13, R8 / F2 (inline mode) | |
| ER-B6 (now, alongside ER-B1; **built**, its own PR after ER-B1's second) | **ER-15** Rewrite the nightmare (`holdRing` for the rehearsal; a `nightmare_script` kind in `kinds.ts` with its `ownFields` encrypted) | F2; D14 decided (Claudia, 10 Nov: build now, on the existing crisis banner) | Unparked by Claudia. Its clinical gate (§6) checks: the person writes the new ending, and no field asks what happened; a crisis slot on every step; *this is too much* reaches P2; no claim that it treats PTSD; one plain line that a clinician can help when nightmares follow a trauma |
| Done already | **ER-01** (P2 is the player's), **ER-06** (rows land with each tool) | — | |

### 5.4 How the lanes work together

**The arrows that hold a lane up** (everything else runs in parallel):

```
F1 ──► F2 ──► DT-B2 ──► DT-B3 ──► DT-B4 ──────────────► IE-B4 (Let go inline)
 │      │       │                   └─► ER-B1's planned DT-04 exit flips
 │      │       └─► DT-01 inline used by IE-01 body step, ER P2, OA (ER-B3)
 │      ├─► IE-B2 ──► IE-B3 ──► IE-B4 ──► IE-B5
 │      │              ▲          ▲         ▲
 │      │   DT-B1 ─────┘          │         │
 │      │   (waitLock)            │         │
 │      ├─► ER-B1 ──► ER-B5 ──────┘ (Check the Facts inline for IE-06)
 │      │
 │      └─► ER-B2 (needs IE-B1) ────────────┘ (Cope Ahead inline for IE-02)
 ├─► DT-B1 (DT-11 now; DT-02 after F2)
 ├─► IE-B1
 └─► ER-B1 (ER-14 now)
DT-B3 (cardDeck, motion engine) ──► ER-B4, ER-B5
ER-B4 (ThingILike) ──► DT-06 level 3
```

**Rules for the lanes:**

1. **Branch from `main` after F1** (and rebase after F2). Every lane PR rebases on `main` before review and
   regenerates the generated files (C7); it never hand-merges them.
2. **Merge order** is first-ready, through Claudia's merge queue. Two PRs touching the same append-only
   registry are both fine; the second rebases.
3. **A change to someone else's piece** (a shared embed, a contract, content another lane owns) goes in as
   its own small PR to the owner's review, not buried in a skill PR.
4. **Telling the other lanes.** A PR that changes a contract, ships a shared embed or flips planned exits
   names the lanes affected in its description. The lane thread messages the affected lane's thread.
5. **This plan is updated in the PR that changes it.** The batch tables and §2's "Today" column are kept
   current, so this doc stays the one place to see where things stand.

### 5.5 Waits outside the lanes

| Waits on | What waits | Owner |
|---|---|---|
| PR #54 merged | Everything | Claudia (merge) |
| `user-profile.md` P1 (`kinds.ts`, `keepProfileItem`) | F2 and every keep | Profile thread (or the foundation lane, §4) |
| CORE-01/02 (crisis route, safety plan) | DT-03; `safety.open` moving off the interim screen | CORE |
| PR #48 (OA doors) | Superseded by #89 (replayed on main, D7) | Claudia closes it |
| PR #47 (`routing/ties-weights-safety-question`) | Nothing in these lanes; it belongs to the safety batch | Safety batch |
| Local branch `dev/hold-to-wait` pushed | DT-B1 can reuse the phone prototype | Claudia |
| CORE-04 `TargetBehavior` | DT-09 | CORE |
| CORE night mode | ER-13 | CORE |
| D3 (skill runtime = MF practice runtime) | DT-07 body scan, DT-08, ER-08, IE-10 | Claudia |
| Router thread (personal ranking) | Nothing waits; it reads C1 | Router thread |

---

## 6. Quality gates

Every lane PR passes three reviews before it goes to Claudia's merge queue. Each review is done by a
reviewer with fresh context (a separate Claude session given the diff, the screenshots and the checklist,
never the author's conclusions), and posted on the PR as one review comment with its checklist ticked or
each failure listed with a file and line. A failure is fixed in the PR and the gate re-run. Claudia's own
look comes after the three gates, not instead of them. Foundation PRs pass Gate 1 only (they
change nothing visible), plus Gate 2 for the harness itself.

### Gate 1: Plan and contract conformance

- [ ] The skill is a `scripts/skills/<skill>.py` file in `SKILLS`; generated files regenerated, none hand-edited.
- [ ] Every PRD step is in, or listed as deferred with a reason and a batch; departures listed (§1.1).
- [ ] `ext.run` follows C1: within limits (contract test passes), no numeric scales, own words only where declared, `out` schema declared for each embed, no new per-visit label.
- [ ] Ask-fresh fields are never pre-filled and never in a kept value; a promoted field is in `ASK_FRESH_FIELDS` and the export test.
- [ ] Profile writes only through the keep action and `keepProfileItem`, on a tap; reads only through `PROFILE_NEEDS`; new kinds registered with validator, slice, copy and a row in `user-profile.md` §4.2.
- [ ] Exits follow C4: targets accept the carried keys; unbuilt targets are `planned`; `module-edges.json` updated; planned exits pointing at this tool flipped.
- [ ] Embeds are registered on both sides; a shared embed is the C3b owner's, used unchanged or changed through the owner.
- [ ] Runtime code changed only in a separate `runtime:` PR (C7).
- [ ] Close kind declared in `functions/src/spine/tools.ts` and `src/lib/spine/close.ts`; follow-up types in the registry.
- [ ] Ported tool: C8 rule followed (projection or reader fallback), old readers proven by tests, parity tests carried, id added to `playerTools.ts`.
- [ ] New labels in `layers.ts` with constraints; export/delete covered; new callables in `functions/src/index.ts`, the endpoints fixture and the auth matrix.
- [ ] Routing rows authored, in `SIGNED_OFF` and on; new urge ids mapped for parts.
- [ ] `npm test`, both builds, lint budget, Cypher lint and voice lint pass.
- [ ] The PR description names affected lanes, updates this plan's tables, and ends with a Deploy section.

### Gate 2: UI design QC

Run on the review harness gallery (§4 F2): every step and branch at 390 and 360 wide, light and dark, the
room palettes where used, and side by side with the old page when it's a port.

- [ ] **Not a digital worksheet.** Each skill has at least one moment that isn't chips and a Next button (a hold, a figure, a stage, a keepsake, a body cue), placed where the PRD's experience is; no screen is a stack of form fields. Compare against the rich patterns already in the app: the den and part figures, Cope Ahead's paper card and rehearsal, Two pulls' stage.
- [ ] **No regression in a port.** Every rich moment the old page had is still there (as an embed), side by side in the gallery.
- [ ] One question per screen; one primary action; the title is the question; chip counts within what fits one phone screen without scrolling where the PRD says so.
- [ ] Tokens only: no raw colours, sizes or shadows; room tokens (`--square-*`, `scripts/rooms/build.py`) where the screen sits in a room; the type scale from `app-design-plan.md`.
- [ ] Serif only for the person's own words and the app's reading of the person, never instructions, buttons or titles (`app-design-plan.md` Part 3).
- [ ] No SaaS card stacks; keepsakes are the only square paper objects; the progress track is unlabelled where it would spoil an acronym reveal.
- [ ] No numbers or scales shown for anything the person rates; levels are named (IE-07's ladder).
- [ ] 44 px targets, focus lands on the title, `aria-pressed` on chips, every control reachable by keyboard, contrast passes (`check.mjs`, `a11y.mjs`), reduced motion respected by every animation.
- [ ] Own-words boxes, empty states, long labels and the 360 width don't break the layout; nothing scrolls sideways.
- [ ] The crisis slot, `TooMuchLink` and quiet links are visible but calm (no alarm colour), and never pushed below the fold by chips.

### Gate 3: Clinical QC

- [ ] **Linehan fidelity.** Each step maps to its handout or worksheet item (a table in the PR); nothing essential to the skill is dropped; any departure from the handout is named and justified against the PRD.
- [ ] **Entry.** Routing rows are on the right patterns and words; contraindications present; the no-band path is the standard path and the flooded path only comes from a carried or host band or Help me now (C6.2); blank and dissociated states get no calming-only move (C6.3).
- [ ] **Exits.** Each exit matches the PRD's hand-off table and the Index §7b edges; nothing sends a person to a tool contraindicated for where they are.
- [ ] **Safety.** Danger options open the crisis slot with the right variant; self-harm reaches `safety.open` first in every path (test named); overwhelm reaches P2 or DT-01; nothing locks; people at risk get the C6.6 limits once IE-03 exists; C6.7 exclusions hold; cold carries its caution line.
- [ ] **Copy against `voice.md`.** S1–S9 (state not trait; no neuro-jargon; no deterministic claims; no "moving on"; no effort-blame; no pathologising; self-compassion where shame is in play; neutral body words; crisis speech) and T1–T8 (second person, present; short sentences; plain words; options not commands; no failure mode; validate before directing; honest hedging; low load when acute). Plus the repo lint: no *should*, *just*, *but*, exclamation marks; witness lines ≤ 90 characters, ≤ 8 words when flooded.
- [ ] **Claims.** No promised durations or outcomes; evidence grades in the content match the PRD's; nothing implies a single in-app dose does what the whole skills package does.
- [ ] **Data.** Nothing stored pathologises or labels the person; ask-fresh rules hold; what's kept is what the person tapped to keep.

---

## 7. Decisions

Claudia approved every default on 10 Nov, with four changes (marked **Changed**). User data stays in
Neo4j (`user-profile.md` §3), and own-words free text is encrypted server-side with Cloud KMS from the
first lane PR on (§3 C1 rule 7).

| # | Decision | Decided |
|---|---|---|
| D1 | With the capacity question out, what drives the PRDs' steady / stirred / flooded branches? | **No band = the standard path.** Flooded only from a carried reading, a host, or Help me now. No skill asks or infers a band |
| D2 | New log labels the PRDs name per visit (`UrgeEpisode`, `FactCheck`, `RehearsalSession`, `SayNoSession`, `VulnerabilityCheck`, `ParkedItem`…) | **None.** `ToolSession` + `ext.run` + spine fields; a parked item is a follow-up plus its run. `Interaction` stays a label (it has its own lifecycle) |
| D3 | Is the skill runtime also MF's practice runtime (DT-07 body scan, DT-08, ER-08, IE-10)? | **Yes.** One player; the MF practice pieces become embeds and runtime options |
| D4 | Two live hazards in shipped tools: Circuit Breaker's cold, and DEAR MAN can build a confrontation plan for someone who is dangerous | **Changed 12 Nov:** no medical screen and no self-check; cold carries its caution line; IE-01's *Is it safe to bring hard things up with them?* in IE-B2 (with the `other_person` banner) |
| D5 | What `safety.open` opens until CORE-01 ships | **The crisis banner as a full screen** (988, text line), with the host still underneath; DT-02's *hurt myself* chip on the first row. **Changed:** add a few non-US crisis numbers now (the banner stays the only file that holds numbers), ahead of CORE-01's full helpline list |
| D6 | Tool ids | **`cool-down`** keeps DT-01 (signed-off rows stay; named "First, the body"; Circuit Breaker becomes its cold mode, **changed:** keeping the label "Circuit Breaker" on that mode); **`five-senses`** stays as an entry that starts DT-01 at orient; **`pause`** (named "Hold to wait"); **`urge-surfing`** (named "Ride it out"); **`let-it-be`** (routing's planned `radical-acceptance` renamed); **`mind-job`** (routing's `accepts` renamed); **`please-skill`** (named "Running low"; 13 graph refs already use it) |
| D7 | PR #48 (OA doors, multi-feeling) | **Merge it as it is first**, then ER-B3 ports the merged page, keeping doors as an embed and multi-feeling as per-feeling sub-runs (R16) |
| D8 | PLEASE's shape | **The PRD's five rows**, reusing PR #33's copy |
| D9 | OA v3's clinical changes: *do I want to change it?*, prediction vs actual, the repair route, removing the 0–10 numbers, splitting danger / boundary / not sure | **All in, as the PRD has them** |
| D10 | Cope Ahead | **Absorb DEAR MAN's 11 moves** (linked, not deleted); a kept plan becomes a `cope_ahead_plan` (`user-profile.md` P6) |
| D11 | DEAR MAN | **Three skills under the one `dear-man` id**: prep, one message, debrief |
| D12 | IE-02's stage | **2D (den / Two pulls style) for v1**, fully scripted other-person turns. **Changed:** AI role-play for the other person is noted as a planned v2 |
| D13 | Voice memos and photos (kit, acceptance statement, trusted voice, safe place) | **Not in v1.** Text only. **Changed:** media storage (with export and delete) is the first thing built after the modules |
| D14 | DT-09's substance scope, ER-15, IE-08 | ER-15 and IE-08 built and listed, on the crisis banner and the `other_person` banner's DV resources (ER-B6, IE-B6). **DT-09 stays parked** (substance scope) |
| D15 | Routing | **Changed 12 Nov:** lanes author rows in `SIGNED_OFF` and switched on, in the skill's PR; you can switch any row off |
| D16 | Witness lines the skills open with (DT-04, DT-11, ER function lines, IE-06 `forOther`) | **Changed 12 Nov:** ship in `SIGNED_OFF` with the skill; skills work with the line absent |
| D17 | Who reviews | **Three independent Claude reviews per PR (§6), then you** for the final look, then your merge queue |
