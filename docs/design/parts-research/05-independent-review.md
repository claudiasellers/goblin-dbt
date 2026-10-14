# Independent review of parts.md (first draft), 6 Oct 2026

A separate agent reviewed the first draft of `docs/design/parts.md` cold, as a DBT+IFS clinician with dissociation
expertise, a senior engineer who knows this codebase, and a product designer. All 25 findings below were folded into
the second draft (commit 99af73d). Kept here so a future reader can see what changed and why.

## Safety-critical
1. **The flood gates did nothing.** Since 30 Sep nothing records a band (`band.record` only in FindTheFeeling.tsx, saving null). Fix: server-side gates on stored `CheckIn.activationPatternId` / `routingBand` / `safetyFlagId`; calm-surface entries only until Claudia picks an entry gate that isn't the removed probe. → *Blocker before Phase 2* section.
2. **The in-the-moment unblend line broke opt-in and "never naming".** It was shown to everyone via the witness beat, used a `{part}` slot (naming), and derived the move from check-in words the person never picked. Fix: only from a move the person picked this session (FTF/Recover pull, OA urge), opted-in users only, no `{part}` in-the-moment.
3. **"Disappear" as a move label** reads as echoing suicidal ideation in a high-distress moment. Renamed to `hide`; per-move `unblendPhrase`.
4. **Own words skipped the tender/danger stops.** Fix: own words at the fear step always take the conservative branch; on `safetyLine` moves, own words at voice/job too.
5. **Feel-toward mishandled "not sure" and "nothing".** Two "not sure" ended the session (breaks "I don't know is complete"); "nothing" was reified as a part. Fix: not sure → continue; nothing → grounding offer and gentle end; ask before creating any candidate.
6. **Young parts didn't reach the tender path.** "little" at age now offers the tender path.
7. **Two pulls had none of Meet a part's safeguards**, and a pair included a shutdown move. Fix: same gates; pairs of offerable moves only.
8. **Routing rows put Meet a part on check-in results.** Removed: no `RECOMMENDED_FOR` rows.

## Codebase rules
9. **`PART_PRESENT` edges out of a finalised log record break finalise-once.** Fix: `PartTag` log record with incoming `TAGS` edge.
10. **Profile reads outside sanctioned paths** (rule D, Today check-backs). Fix: through `readProfileSlices(tx, uid, 'today')` with `parts` declared for `today`; `spine/` never imports `profile/`.
11. **`PROFILE_NEEDS` / types as proposed fail `tests/profile-layer.test.mjs`.** Fix: every test change named in the data model section; `partDetail` slice; `my_parts` area; `resting` status.
12. **Two contradictory "only writer" claims for `Part`.** Fix: `keepPart` is the sole writer; `ACCEPTED_FROM` edge; grep test.
13. **Other log→profile moves without a yes** (`hue`, auto-saved keepsake, candidates). Fix: hue computed at read; keepsake kept only on "Keep this"; `PartCandidate` log label.
14. **`TrailRule extends PatternRule` would break the existing evaluator** (hardcodes `what_helps`). Fix: own label, kind filter, separate `answerTrailOffer`.
15. **Episodes need moment clustering** (hand-offs fake triangulation). Fix: records within 2 h merge; rule B needs separate sittings and app-use-normalised baseline.
16. **Offer gates checked at the wrong time** (evaluation is once a day). Fix: re-check at render from stored check-in fields.
17. **`meet-a-part` close kind `regulation_down` was wrong** (feeds `what_helps` and went-well). Fix: `orienting`, excluded from both; `feelTowardIds[]`; `DETAIL` via wrap.ts.

## Clinical and DBT mapping
18. **Overclaimed mappings**: OA `goal` isn't the part's intent; trails aren't a chain miner; updating isn't Check the Facts; app copy can't speak as Self; Wise Mind ≈ Self is a parallel not an equivalent. All reworded; `functional_equivalent` edges flagged for retyping.
19. **Misquoted the agreed angry-part spec** (it does ask *what it protects* in the heat; `ProtectedHurt` maps to Emotion ids). Reconciled and the `SAME_AS` addition flagged as a change.
20. **Opt-in couldn't be reached** (switch lived in an area that didn't exist yet). Fix: Settings → Privacy & Data.
21. **Tag row at the wrong moments** (after Help now, after "same"). Fix: only after better/much better, never after help-now; copy "Was this a part you know?".
22. **Dissociation protection looked only at the latest check-in.** Fix: 2+ in 14 days blocks offers and adds a heads-up on entry.

## Copy and lint
23. First-person move labels don't scan after "A part of you…" (→ `unblendPhrase`); slots rule needs `{name}` etc.; "It usually settles" dropped (prediction); "We'll leave that be today" → "We'll leave that be"; "Thank it for trying" → "…to protect you"; split `parts_prompt` / `parts_chip` scopes.
24. `no_role_labels` too broad (`burdens?` hits DEAR MAN's "Asking isn't a burden"; `managers?` hits "my manager"). Narrowed.

## Gaps
25. Deleting parts leaves names in kept lines; no names in pushes; kill switch must turn off offers only; no flow created `covers_for`; DEAR MAN cope-ahead needed an anchor field; small-n stats need a minimum. All addressed.
