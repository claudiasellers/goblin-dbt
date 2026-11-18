export type ModuleId = 'distress-tolerance' | 'emotion-regulation' | 'interpersonal-effectiveness' | 'mindfulness';

export interface Module {
  id: ModuleId;
  name: string;
  order: number;
  /** What the module is for, in plain words: the line under its row on the Tools page. */
  blurb: string;
}

// Mindfulness first: DBT teaches it first and calls it the core skill set (PRD – Mindfulness §2.2 note 9, Q11).
export const modules: Module[] = [
  { id: 'mindfulness', name: 'Mindfulness', order: 1, blurb: 'Notice, name and steady your mind' },
  { id: 'distress-tolerance', name: 'Distress Tolerance', order: 2, blurb: 'Get through a hard moment' },
  { id: 'emotion-regulation', name: 'Emotion Regulation', order: 3, blurb: 'Change how a feeling goes' },
  { id: 'interpersonal-effectiveness', name: 'Interpersonal Effectiveness', order: 4, blurb: 'Ask, say no, repair, connect' },
];

export function getModuleById(id: string): Module | undefined {
  return modules.find(m => m.id === id);
}
