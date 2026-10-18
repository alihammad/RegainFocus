// Data model from docs/SPEC.md section 4.

export type Quadrant = 'inbox' | 'do' | 'plan' | 'delegate' | 'drop';
export type Energy = 'quick' | 'medium' | 'deep'; // UI: Quick win, Medium, Deep focus
export type When = 'today' | 'this_week' | 'flexible'; // UI: Today, This week, Flexible
export type Status = 'active' | 'done' | 'dropped';
export type Source = 'mobile_text' | 'mobile_voice' | 'web';

export interface Task {
  id: string; // UUID created on the device that makes the task
  userId: string;
  title: string;
  firstStep?: string;
  projectId?: string;
  quadrant: Quadrant; // new captures start in 'inbox'
  status: Status;
  when?: When;
  dueAt?: string; // ISO 8601; drives labels like "Due in 48h"
  estimateMinutes?: number; // UI shows "2h", "4h+"
  energy?: Energy;
  waitingOn?: string; // a person's name; blocked while set
  todayOrder?: number; // 1-based position; set when the task is in Today
  todayDate?: string; // ISO date the Today pick belongs to
  focusedMinutes: number; // running total from sprints
  source: Source;
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
  // Tombstone so a delete (including undo of a fresh capture) syncs to other devices.
  // Not in the spec's Task; added for sync. Nothing outside the data layer shows deleted tasks.
  deletedAt?: string;
}

export interface Project {
  id: string;
  userId: string;
  name: string;
  archived: boolean;
}

export interface Sprint {
  id: string;
  taskId: string;
  startedAt: string;
  endedAt?: string;
  plannedMinutes: number; // default 25
}

export interface Settings {
  userId: string;
  workdayStart: string; // default "09:00"
  workdayEnd: string; // default "18:00"
  comfortableHours: number; // default 5; the planning limit for Today
  sprintMinutes: number; // default 25
}
