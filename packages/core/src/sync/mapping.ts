import type { Task } from '../model/types';

/** A tasks row as PostgREST sends and receives it (snake_case, nulls for empty). */
export interface TaskRow {
  id: string;
  user_id: string;
  title: string;
  first_step: string | null;
  project_id: string | null;
  quadrant: Task['quadrant'];
  status: Task['status'];
  when_bucket: Task['when'] | null;
  due_at: string | null;
  estimate_minutes: number | null;
  energy: Task['energy'] | null;
  waiting_on: string | null;
  today_order: number | null;
  today_date: string | null;
  focused_minutes: number;
  source: Task['source'];
  created_at: string;
  updated_at: string;
  completed_at: string | null;
  deleted_at: string | null;
  server_modified_at?: string;
}

const iso = (value: string): string => new Date(value).toISOString();
const optIso = (value: string | null): string | undefined =>
  value === null ? undefined : iso(value);
const opt = <T>(value: T | null): T | undefined => (value === null ? undefined : value);

export function taskToRow(task: Task): TaskRow {
  return {
    id: task.id,
    user_id: task.userId,
    title: task.title,
    first_step: task.firstStep ?? null,
    project_id: task.projectId ?? null,
    quadrant: task.quadrant,
    status: task.status,
    when_bucket: task.when ?? null,
    due_at: task.dueAt ?? null,
    estimate_minutes: task.estimateMinutes ?? null,
    energy: task.energy ?? null,
    waiting_on: task.waitingOn ?? null,
    today_order: task.todayOrder ?? null,
    today_date: task.todayDate ?? null,
    focused_minutes: task.focusedMinutes,
    source: task.source,
    created_at: task.createdAt,
    updated_at: task.updatedAt,
    completed_at: task.completedAt ?? null,
    deleted_at: task.deletedAt ?? null,
  };
}

/** Drops undefined fields, so a pulled task equals one built locally. */
export function rowToTask(row: TaskRow): Task {
  const task: Task = {
    id: row.id,
    userId: row.user_id,
    title: row.title,
    quadrant: row.quadrant,
    status: row.status,
    focusedMinutes: row.focused_minutes,
    source: row.source,
    createdAt: iso(row.created_at),
    updatedAt: iso(row.updated_at),
  };
  const optional: Partial<Task> = {
    firstStep: opt(row.first_step),
    projectId: opt(row.project_id),
    when: opt(row.when_bucket),
    dueAt: optIso(row.due_at),
    estimateMinutes: opt(row.estimate_minutes),
    energy: opt(row.energy),
    waitingOn: opt(row.waiting_on),
    todayOrder: opt(row.today_order),
    todayDate: opt(row.today_date),
    completedAt: optIso(row.completed_at),
    deletedAt: optIso(row.deleted_at),
  };
  for (const [key, value] of Object.entries(optional)) {
    if (value !== undefined) (task as unknown as Record<string, unknown>)[key] = value;
  }
  return task;
}
