import type { Quadrant, Task } from '../model/types';

export const SORTED_QUADRANTS = ['do', 'plan', 'delegate', 'drop'] as const;
export type SortedQuadrant = (typeof SORTED_QUADRANTS)[number];

/**
 * Triage moves a task between quadrants. It changes nothing else: a task in Drop stays
 * active (dropping is a sorted state, not a failure), and Today picks are unaffected.
 */
export function triagePatch(quadrant: Quadrant): Pick<Task, 'quadrant'> {
  return { quadrant };
}
