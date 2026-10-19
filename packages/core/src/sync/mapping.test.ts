import { describe, expect, it } from 'vitest';
import type { Task } from '../model/types';
import { rowToTask, taskToRow, type TaskRow } from './mapping';

const full: Task = {
  id: 't1',
  userId: 'u1',
  title: 'AI Platform PRR',
  firstStep: 'Open the DR checklist',
  projectId: 'p1',
  quadrant: 'plan',
  status: 'active',
  when: 'this_week',
  dueAt: '2026-10-21T09:00:00.000Z',
  estimateMinutes: 240,
  energy: 'deep',
  waitingOn: 'Chetan',
  todayOrder: 2,
  todayDate: '2026-10-19',
  focusedMinutes: 30,
  source: 'mobile_voice',
  createdAt: '2026-10-19T08:00:00.000Z',
  updatedAt: '2026-10-19T09:00:00.000Z',
  completedAt: '2026-10-19T10:00:00.000Z',
  deletedAt: '2026-10-19T11:00:00.000Z',
};

describe('task <-> row mapping', () => {
  it('round-trips a full task', () => {
    expect(rowToTask(taskToRow(full))).toEqual(full);
  });

  it('round-trips a bare capture without adding undefined fields', () => {
    const bare: Task = {
      id: 't2',
      userId: 'u1',
      title: 'x',
      quadrant: 'inbox',
      status: 'active',
      focusedMinutes: 0,
      source: 'mobile_text',
      createdAt: '2026-10-19T08:00:00.000Z',
      updatedAt: '2026-10-19T08:00:00.000Z',
    };
    const back = rowToTask(taskToRow(bare));
    expect(back).toEqual(bare);
    expect(Object.keys(back)).not.toContain('firstStep');
  });

  it('maps `when` to the when_bucket column', () => {
    expect(taskToRow(full).when_bucket).toBe('this_week');
  });

  it('sends empty optional fields as null', () => {
    const row = taskToRow({
      ...full,
      firstStep: undefined,
      todayDate: undefined,
      todayOrder: undefined,
    });
    expect(row).toMatchObject({ first_step: null, today_date: null, today_order: null });
  });

  it('normalises PostgREST timestamps to ISO strings', () => {
    const row: TaskRow = {
      ...taskToRow(full),
      created_at: '2026-10-19T08:00:00.123456+00:00',
      updated_at: '2026-10-19T19:00:00.5+10:00',
    };
    const task = rowToTask(row);
    expect(task.createdAt).toBe('2026-10-19T08:00:00.123Z');
    expect(task.updatedAt).toBe('2026-10-19T09:00:00.500Z');
  });
});
