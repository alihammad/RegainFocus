import { describe, expect, it } from 'vitest';
import type { Task } from '../model/types';
import { tasksForToday, todayStatus } from './today';
import { triagePatch } from './triage';

const task = (over: Partial<Task>): Task => ({
  id: 'x',
  userId: 'u',
  title: 't',
  quadrant: 'plan',
  status: 'active',
  focusedMinutes: 0,
  source: 'web',
  createdAt: '2026-10-19T00:00:00.000Z',
  updatedAt: '2026-10-19T00:00:00.000Z',
  ...over,
});

describe('todayStatus', () => {
  it.each([0, 1, 2, 3])('has no warning at %i tasks', (n) => {
    expect(todayStatus(n)).toMatchObject({ isOver: false, warning: null });
  });

  it('warns calmly at 4 and does not block', () => {
    const s = todayStatus(4);
    expect(s.isOver).toBe(true);
    expect(s.warning).toBe(
      "That's 4 for today. Three is easier to finish. Keep it, or move one to tomorrow.",
    );
  });

  it('keeps warning as the count grows', () => {
    expect(todayStatus(7).warning).toContain("That's 7 for today");
  });
});

describe('tasksForToday', () => {
  it('returns active, undeleted tasks for the date in order', () => {
    const tasks = [
      task({ id: 'b', todayDate: '2026-10-19', todayOrder: 2 }),
      task({ id: 'a', todayDate: '2026-10-19', todayOrder: 1 }),
      task({ id: 'old', todayDate: '2026-10-18', todayOrder: 1 }),
      task({ id: 'done', todayDate: '2026-10-19', todayOrder: 3, status: 'done' }),
      task({
        id: 'gone',
        todayDate: '2026-10-19',
        todayOrder: 4,
        deletedAt: '2026-10-19T01:00:00.000Z',
      }),
    ];
    expect(tasksForToday(tasks, '2026-10-19').map((t) => t.id)).toEqual(['a', 'b']);
  });
});

describe('triagePatch', () => {
  it('only changes the quadrant', () => {
    expect(triagePatch('drop')).toEqual({ quadrant: 'drop' });
  });
});
