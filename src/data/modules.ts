export type ModuleId = 'distress-tolerance' | 'emotion-regulation' | 'interpersonal-effectiveness' | 'mindfulness';

export interface Module {
  id: ModuleId;
  name: string;
  order: number;
}

// Mindfulness first: DBT teaches it first and calls it the core skill set (PRD – Mindfulness §2.2 note 9, Q11).
export const modules: Module[] = [
  { id: 'mindfulness', name: 'Mindfulness', order: 1 },
  { id: 'distress-tolerance', name: 'Distress Tolerance', order: 2 },
  { id: 'emotion-regulation', name: 'Emotion Regulation', order: 3 },
  { id: 'interpersonal-effectiveness', name: 'Interpersonal Effectiveness', order: 4 },
];

export function getModuleById(id: string): Module | undefined {
  return modules.find(m => m.id === id);
}
