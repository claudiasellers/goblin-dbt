/**
 * The skills review page's pure part (dev/skills-review.html): for any skill, a way to every step (the first
 * path the transitions allow, conditions ignored) and the answers that path would have given, so the real
 * player can be opened at that step through its own resume (`?run=&at=`, R9) with a run record the page makes
 * up. The answers are each field's first option: a review shows the screen, not a real person's run.
 */
import type { SkillDef } from '../../src/data/skillTypes';

/** Every step's first path from the start (breadth-first over `next`, conditions ignored). */
export function stepPaths(skill: SkillDef): Record<string, string[]> {
  const paths: Record<string, string[]> = { [skill.start]: [skill.start] };
  const queue = [skill.start];
  while (queue.length) {
    const id = queue.shift()!;
    const st = skill.steps.find((s) => s.id === id);
    for (const t of st?.next ?? []) {
      if (paths[t.to]) continue;
      paths[t.to] = [...paths[id], t.to];
      queue.push(t.to);
    }
  }
  return paths;
}

/** The first option a field offers: an emotion id, or its list's first value (tables and profile options: none). */
function firstOption(skill: SkillDef, f: NonNullable<SkillDef['steps'][number]['fields']>[number]): string | null {
  const o = f.options as { emotions?: string[]; list?: string };
  if (o.emotions?.length) return o.emotions[0];
  if (o.list) return skill.options[o.list]?.[0]?.value ?? null;
  return null;
}

/** The run record that opens `stepId` with the answers its path would have given (each field's first option). */
export function reviewRun(skill: SkillDef, stepId: string) {
  const path = stepPaths(skill)[stepId] ?? [skill.start];
  const answers: { fieldId: string; optionIds: string[] }[] = [];
  for (const id of path.slice(0, -1)) {
    const st = skill.steps.find((s) => s.id === id);
    for (const f of st?.fields ?? []) {
      const v = firstOption(skill, f);
      if (v) answers.push({ fieldId: f.id, optionIds: [v] });
    }
  }
  return { skillId: skill.id, versionId: skill.version, path, answers };
}

/** Steps in the order a person would meet them (path length, then the skill's own order); unreachable ones last. */
export function reviewOrder(skill: SkillDef): string[] {
  const paths = stepPaths(skill);
  const ix = (id: string) => skill.steps.findIndex((s) => s.id === id);
  return skill.steps.map((s) => s.id).sort((a, b) => (paths[a]?.length ?? 99) - (paths[b]?.length ?? 99) || ix(a) - ix(b));
}
