export type ModuleId = 'distress-tolerance' | 'emotion-regulation' | 'interpersonal-effectiveness' | 'mindfulness';

export interface Module {
  id: ModuleId;
  name: string;
  order: number;
}

export const modules: Module[] = [
  { id: 'distress-tolerance', name: 'Distress Tolerance', order: 1 },
  { id: 'emotion-regulation', name: 'Emotion Regulation', order: 2 },
  { id: 'interpersonal-effectiveness', name: 'Interpersonal Effectiveness', order: 3 },
  { id: 'mindfulness', name: 'Mindfulness', order: 4 },
];

export function getModuleById(id: string): Module | undefined {
  return modules.find(m => m.id === id);
}
