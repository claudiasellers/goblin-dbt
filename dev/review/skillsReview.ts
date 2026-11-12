/**
 * The skills review page's pure part (dev/skills-review.html): for any skill, a way to every step (the first
 * path the transitions allow, conditions ignored) and the answers that path would have given, so the real
 * player can be opened at that step through its own resume (`?run=&at=`, R9) with a run record the page makes
 * up. The answers are each field's first option: a review shows the screen, not a real person's run.
 */
import type { SkillDef } from '../../src/data/skillTypes';

/**
 * Every step's first path from the start (breadth-first over `next`, conditions ignored). A `reopens` step, which only
 * a reopened run starts on, comes after its `after` step's path, and the steps after it from there. A re-entry step
 * (`resumeAt`, opened by a check-in off the run's path) that no transition reaches follows the deepest step that
 * schedules a follow-up: the run the check-in came back to.
 */
export function stepPaths(skill: SkillDef): Record<string, string[]> {
  const paths: Record<string, string[]> = { [skill.start]: [skill.start] };
  const walk = (queue: string[]) => {
    while (queue.length) {
      const id = queue.shift()!;
      const st = skill.steps.find((s) => s.id === id);
      for (const t of st?.next ?? []) {
        if (paths[t.to]) continue;
        paths[t.to] = [...paths[id], t.to];
        queue.push(t.to);
      }
    }
  };
  walk([skill.start]);
  for (const st of skill.steps.filter((s) => s.reopens && !paths[s.id] && paths[s.reopens.after])) {
    paths[st.id] = [...paths[st.reopens!.after], st.id];
    walk([st.id]);
  }
  for (const at of skill.resumeAt ?? []) {
    if (paths[at]) continue;
    const from = skill.steps.filter((s) => s.followUp && paths[s.id])
      .sort((a, b) => paths[b.id].length - paths[a.id].length)[0];
    if (!from) continue;
    paths[at] = [...paths[from.id], at];
    walk([at]);
  }
  return paths;
}

/**
 * Answers a review seeds where the first option would show an empty screen: a word for an `emotions` embed (the
 * per-pick steps repeat over it), and per-pick picks whose lists filter on the one before (Do the Opposite: the
 * urge's own cues and steps). Dev only; a review shows the screen, not a real person's run.
 */
const SEEDS: Record<string, Record<string, string[]>> = {
  opposite_action: { feel: ['anxious'], urge: ['fear-escape'], fits: ['not_fit'], help: ['unhelpful'], size: ['fear-escape:small'] },
  // Running low: sleep short and food skipped, so the readout drains Sleep and the fix screen lists real fixes.
  please_skill: { sleep: ['sleep_short'], food: ['food_skipped'], fix: ['fix_rest'], when: ['later'], remind: ['evening'] },
  good_things: { start: ['one'], energy: ['little'], pick: ['outside'], when: ['evening'], remind: ['yes'], kind: ['colour'], keepit: ['keep'], happened: ['yes'], compared: ['lighter'], mind: ['here'] },
  values: { start: ['step'], mine: ['honesty', 'friendship', 'calm', 'fun', 'learning'], kept: ['friendship', 'honesty'], focus: ['friendship'], focus_kept: ['friendship'], step: ['friendship_1'], when: ['few_days'], remind: ['yes'], happened: ['yes'] },
  build_mastery: { area: ['caring'], rung: ['caring_2'], when: ['tomorrow'], remind: ['yes'], happened: ['done'], ican: ['yes'], then: ['up'], again: ['smaller'] },
  finding_connection: { area: ['friend'], step: ['friend_thought'], predict: ['badly'], liking: ['not_much'], when: ['tomorrow'], remind: ['yes'], happened: ['did'], went: ['well'], liked: ['some'], again: ['new_time'] },
};

/** The first option a field offers: a seed, an emotion id, or its list's first value (tables and profile options: none). */
function firstOption(skill: SkillDef, f: NonNullable<SkillDef['steps'][number]['fields']>[number]): string | null {
  const seed = SEEDS[skill.id];
  if (seed?.[f.id]) return seed[f.id][0];
  const o = f.options as { emotions?: string[]; list?: string };
  if (o.emotions?.length) return o.emotions[0];
  const list = o.list ? skill.options[o.list] ?? [] : [];
  // A list filtered on the seeded urge (its cues): the first option that names it.
  const urge = seed?.urge?.[0];
  const forUrge = urge ? list.find((x) => Array.isArray(x.urges) && (x.urges as string[]).includes(urge)) : undefined;
  return forUrge?.value ?? list[0]?.value ?? null;
}

/** The run record that opens `stepId` with the answers its path would have given (each field's first option). */
export function reviewRun(skill: SkillDef, stepId: string) {
  const raw = stepPaths(skill)[stepId] ?? [skill.start];
  const seed = SEEDS[skill.id] ?? {};
  const answers: { fieldId: string; optionIds: string[]; pick?: string }[] = [];
  // R16: a per-pick step is on the path with its pick's index, and its answers carry the pick (the first seeded word).
  const path = raw.map((id) => (skill.steps.find((s) => s.id === id)?.each ? `${id}:0` : id));
  for (const id of raw.slice(0, -1)) {
    const st = skill.steps.find((s) => s.id === id);
    const pick = st?.each ? seed[st.each]?.[0] : undefined;
    if (st?.each && !pick) continue;
    if (st?.answerAs && seed[st.answerAs]) answers.push({ fieldId: st.answerAs, optionIds: seed[st.answerAs] });
    for (const f of st?.fields ?? []) {
      // A multi-pick field seeded with several (a sort, then three of it) gets them all, so later filtered lists fill.
      const many = !st?.each && f.max > 1 && (seed[f.id]?.length ?? 0) > 1 ? seed[f.id] : null;
      const v = firstOption(skill, f);
      if (many) answers.push({ fieldId: f.id, optionIds: many });
      else if (v) answers.push({ fieldId: f.id, optionIds: [v], ...(pick ? { pick } : {}) });
    }
  }
  // A `reopens` step is where a reopened run starts, never on its record: the record stops at the step before it.
  const reopens = !!skill.steps.find((s) => s.id === stepId)?.reopens;
  return { skillId: skill.id, versionId: skill.version, path: reopens ? path.slice(0, -1) : path, answers };
}

/** Steps in the order a person would meet them (path length, then the skill's own order); unreachable ones last. */
export function reviewOrder(skill: SkillDef): string[] {
  const paths = stepPaths(skill);
  const ix = (id: string) => skill.steps.findIndex((s) => s.id === id);
  return skill.steps.map((s) => s.id).sort((a, b) => (paths[a]?.length ?? 99) - (paths[b]?.length ?? 99) || ix(a) - ix(b));
}
