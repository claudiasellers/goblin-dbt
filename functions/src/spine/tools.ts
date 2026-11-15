/**
 * Every tool the spine records, with its module and what it asks at its close. Pure.
 *
 * The server derives `module` and `closeKind` from here (the client can't mislabel a session).
 * src/lib/spine/close.ts mirrors TOOL_CLOSE_KIND for the UI; tests/spine-validation.test.mjs
 * asserts the two agree and that every interactive tool in ToolPage.tsx is declared, so a Phase B
 * tool can't ship without declaring its close.
 */
import type { CloseKind, SpineModule, ToolEntry } from './types';

export interface SpineTool { module: SpineModule; closeKind: CloseKind }

export const SPINE_TOOLS: Record<string, SpineTool> = {
  'cool-down': { module: 'dt', closeKind: 'regulation_down' },
  'five-senses': { module: 'dt', closeKind: 'orienting' },
  'pause': { module: 'dt', closeKind: 'urge_change' },
  'urge-surfing': { module: 'dt', closeKind: 'urge_change' },
  'let-it-be': { module: 'dt', closeKind: 'regulation_down' },
  'mind-job': { module: 'dt', closeKind: 'regulation_down' },
  'soothe': { module: 'dt', closeKind: 'regulation_down' },
  'thoughts-passing': { module: 'dt', closeKind: 'regulation_down' },
  // Pros & cons card (DT-10, docs/design/pros-cons.md): made in calm, so no close question ("how strong is it now?"
  // means little here); its outcome is the replay's, inside Hold to wait's own close.
  'pros-cons': { module: 'dt', closeKind: 'none' },
  // When it's a habit (DT-09, docs/design/habit-plan.md): a plan made in calm; its outcome is the habit_renew card.
  'habit-plan': { module: 'dt', closeKind: 'none' },
  // My crisis kit (DT-03, docs/design/crisis-kit.md): opening it asks how it is now in the flow, once, after the cards
  // (askFresh thenVsNow, no SessionClose after it); making it ends with no close.
  'crisis-kit': { module: 'dt', closeKind: 'regulation_down' },
  // Rebel without the wreckage (DT-11): "And the urge to blow it up?", the acted answer on the destructive urge.
  'alternate-rebellion': { module: 'dt', closeKind: 'urge_change' },
  'problem-solve': { module: 'er', closeKind: 'plan' },
  // Cope Ahead (docs/design/cope-ahead.md): screen 1 already asked when, so no close question; its outcome
  // is the cope_ahead_after card.
  'cope-ahead': { module: 'er', closeKind: 'none' },
  // FTF asks its own then-vs-now (stored `close`, mapped at read: R3).
  'find-the-feeling': { module: 'er', closeKind: 'regulation_down' },
  // Check the Facts (docs/design/check-the-facts.md), the first skill on the runtime: "How strong is it now,
  // compared to when you started?", asked before any hand-off leaves.
  'check-the-facts': { module: 'er', closeKind: 'regulation_down' },
  // It isn't working (ER-14, docs/design/er-troubleshoot.md): a calm-time look at why a skill didn't help. No
  // close question: its outcome is the next skill's close, linked by hostSessionId.
  'er-troubleshoot': { module: 'er', closeKind: 'none' },
  // Rewrite the nightmare (ER-15, docs/design/nightmare-rescript.md): no close question ("how strong is it now?"
  // means nothing after rewriting a dream); its practice is the read-through reminders.
  'nightmare-rescript': { module: 'er', closeKind: 'none' },
  // Running low (ER-07, docs/design/running-low.md): a body check and one fix for today. No close question (the
  // fix happens later, if at all); its outcome is the evening card's *Did it happen?* (`please_fix`).
  'please-skill': { module: 'er', closeKind: 'none' },
  // Sleep reset (ER-13, docs/design/sleep-reset.md): no close question (a night isn't rated at 3am); its outcome is
  // the morning card's *How was the night?* (`sleep_morning`).
  'sleep-reset': { module: 'er', closeKind: 'none' },
  // Good things (ER-04, docs/design/good-things.md): no close question; *lighter · same · heavier* is asked on the
  // `good_thing` card's visit, after the thing was done (asking right after picking it would mean nothing).
  'good-things': { module: 'er', closeKind: 'none' },
  // What matters to me (ER-09, docs/design/values.md): no close question; the outcome is the `value_step` card's
  // *Did it happen?*, after the step (a then-vs-now would ask about a sort, which isn't a state change).
  'values-clarification': { module: 'er', closeKind: 'none' },
  'build-mastery': { module: 'er', closeKind: 'none' },
  // Find your people (IE-09, docs/design/find-your-people.md): no close question; the outcome is the
  // `reach_out_outcome` card's *Did you do it?* and *How did it go?*, after the step, against the prediction.
  'finding-connection': { module: 'ie', closeKind: 'none' },
  // Notice them (IE-10, docs/design/notice-them.md): no close question; the practice is checked by the `notice_back`
  // card (*Did you get to notice them?*), and the two columns have no then-vs-now.
  'mindfulness-of-others': { module: 'ie', closeKind: 'none' },
  'rehearse': { module: 'ie', closeKind: 'regulation_down' },
  // Know this feeling (ER-10, docs/design/emotion-guide.md): no close question; a card and a closer word aren't a
  // state change to rate.
  'emotion-guide': { module: 'er', closeKind: 'none' },
  'mindfulness-emotions': { module: 'er', closeKind: 'regulation_down' },
  // These ask their own questions inside their flows; the spine adds none (PR-S4 wraps them).
  'opposite-action': { module: 'er', closeKind: 'regulation_down' },
  'dear-man': { module: 'ie', closeKind: 'none' },
  // Keep your self-respect (docs/design/fast.md), on the skill runtime: "Compared to when you started, it's…".
  'fast': { module: 'ie', closeKind: 'regulation_down' },
  // Ending a relationship that's hurting you (docs/design/ending-relationships.md): no close question. A rating
  // after deciding to end a relationship isn't evidence of anything, and a quiet leave keeps the visit unseen.
  'ending-relationships': { module: 'ie', closeKind: 'none' },
  'say-no': { module: 'ie', closeKind: 'none' },
  // Keep it warm (docs/design/give.md): no close question. How warm a repair felt is asked as its own outcome.
  'give': { module: 'ie', closeKind: 'none' },
  'recovering-from-invalidation': { module: 'wmp', closeKind: 'none' },
  // Meet a part (docs/design/parts.md): "Further away … More here". Not in src/data/tools.ts yet.
  'meet-a-part': { module: 'mf', closeKind: 'orienting' },
  // Two pulls (docs/design/parts.md): the same orienting close, never what-helps evidence.
  'two-pulls': { module: 'mf', closeKind: 'orienting' },
  // Wise mind (docs/design/wise-mind.md): "Further away … More here", unless it handed off. A skill:
  // a "More here" after it counts toward what helps (not in NOT_WHAT_HELPS).
  'wise-mind': { module: 'mf', closeKind: 'orienting' },
  // Notice what's here (MF-01, docs/design/notice-and-name.md): the orienting close asked in the flow.
  'notice-and-name': { module: 'mf', closeKind: 'orienting' },
  'unpack-a-judgment': { module: 'mf', closeKind: 'none' },
  // One thing (MF-05, docs/design/one-thing.md): the loop close (louder · quieter) asked in the flow on a rumination
  // entry; a plain entry's end asks none (`noClose`: the with-it answer is the close).
  'one-thing': { module: 'mf', closeKind: 'regulation_down' },
  // Reserved spine ids (one-shots and embeds).
  'help-now': { module: 'core', closeKind: 'none' },
  'micro-step': { module: 'core', closeKind: 'none' },
  'guided-activity': { module: 'core', closeKind: 'none' },
  // The Practice home's catch-one taps (MF-02, docs/design/practice-home.md): a zero-length one-shot whose only job is
  // the rep (validateRecord pins its skills and source).
  'practice': { module: 'mf', closeKind: 'none' },
};

/**
 * Tools whose close is never evidence that something helped: no what_helps pattern offer, no
 * "went well" in Insights, no "did it help?" card in Today, no compat ToolUsage outcome. "More here"
 * after meeting a part (or sitting with two pulls) is not the same claim as "it calmed me" (docs/design/parts.md).
 */
export const NOT_WHAT_HELPS: readonly string[] = ['meet-a-part', 'two-pulls'];

/** Where the reserved ids may be opened from. */
export const RESERVED_ENTRIES: Record<string, readonly ToolEntry[]> = {
  'help-now': ['checkin_grid', 'direct', 'today'],
  'micro-step': ['checkin_result', 'direct'],
  'guided-activity': ['checkin_result', 'direct'],
  'practice': ['direct'],
};

/** then-vs-now direction of a close kind (R3); null when the kind doesn't ask it. */
export function thenVsNowDirFor(k: CloseKind): 'down' | 'orient' | 'up' | null {
  return k === 'regulation_down' || k === 'urge_change' ? 'down' : k === 'orienting' ? 'orient' : k === 'regulation_up' ? 'up' : null;
}
