import { beforeEach, describe, expect, it } from 'vitest';
import { RegainDb } from './db';
import { EmptyTitleError, TaskRepository } from './repository';

let db: RegainDb;
let repo: TaskRepository;
let clock: number;
let n: number;

beforeEach(() => {
  db = new RegainDb(`test-${crypto.randomUUID()}`);
  clock = Date.parse('2026-10-19T09:00:00.000Z');
  n = 0;
  repo = new TaskRepository(db, {
    userId: 'user-1',
    now: () => new Date((clock += 1000)),
    newId: () => `task-${++n}`,
  });
});

describe('creating a capture', () => {
  it('saves to the inbox, active, with the source and tags', async () => {
    const task = await repo.createCapture({
      title: '  Ask Chetan for the DR update ',
      source: 'mobile_voice',
      when: 'today',
      energy: 'quick',
    });
    expect(task).toMatchObject({
      id: 'task-1',
      userId: 'user-1',
      title: 'Ask Chetan for the DR update',
      quadrant: 'inbox',
      status: 'active',
      source: 'mobile_voice',
      when: 'today',
      energy: 'quick',
      focusedMinutes: 0,
    });
    expect(await db.tasks.get('task-1')).toEqual(task);
  });

  it('rejects empty or whitespace-only text and stores nothing', async () => {
    await expect(repo.createCapture({ title: '   ', source: 'web' })).rejects.toBeInstanceOf(
      EmptyTitleError,
    );
    expect(await db.tasks.count()).toBe(0);
    expect(await db.outbox.count()).toBe(0);
  });

  it('queues the capture for sync in the same write', async () => {
    await repo.createCapture({ title: 'one', source: 'mobile_text' });
    expect(await db.outbox.toArray()).toMatchObject([
      { key: 'task:task-1', id: 'task-1', rev: 1, attempts: 0, nextAttemptAt: 0 },
    ]);
  });

  it('lists the inbox newest first', async () => {
    await repo.createCapture({ title: 'first', source: 'web' });
    await repo.createCapture({ title: 'second', source: 'web' });
    expect((await repo.listInbox()).map((t) => t.title)).toEqual(['second', 'first']);
  });

  it('survives a restart (reopening the database)', async () => {
    await repo.createCapture({ title: 'kept', source: 'mobile_text' });
    const name = db.name;
    db.close();
    const reopened = new RegainDb(name);
    expect((await reopened.tasks.toArray()).map((t) => t.title)).toEqual(['kept']);
    expect(await reopened.outbox.count()).toBe(1);
  });
});

describe('undo', () => {
  it('undoing a capture removes it from the inbox and queues the delete', async () => {
    const task = await repo.createCapture({ title: 'oops', source: 'mobile_text', when: 'today' });
    const removed = await repo.undoCapture(task.id);
    expect(removed).toMatchObject({ title: 'oops', when: 'today' }); // text and tags to restore
    expect(await repo.listInbox()).toEqual([]);
    expect(await repo.get(task.id)).toBeUndefined();
    expect((await db.tasks.get(task.id))?.deletedAt).toBeDefined(); // tombstone, so it syncs
    expect((await db.outbox.get('task:task-1'))?.rev).toBe(2);
  });

  it('undoing a triage puts the task back', async () => {
    const task = await repo.createCapture({ title: 'sort me', source: 'web' });
    const change = await repo.triage(task.id, 'plan');
    expect((await repo.listInbox()).length).toBe(0);
    await change!.undo();
    expect((await repo.listInbox()).map((t) => t.id)).toEqual([task.id]);
    expect(await repo.listByQuadrant('plan')).toEqual([]);
  });

  it('undoing adding to Today clears the Today fields', async () => {
    const task = await repo.createCapture({ title: 'a', source: 'web' });
    const added = await repo.addToToday(task.id, '2026-10-19');
    await added!.undo();
    expect(await repo.listToday('2026-10-19')).toEqual([]);
    expect((await repo.get(task.id))?.todayDate).toBeUndefined();
  });
});

describe('triage into quadrants', () => {
  it.each(['do', 'plan', 'delegate', 'drop'] as const)('moves an inbox task to %s', async (q) => {
    const task = await repo.createCapture({ title: 'x', source: 'web' });
    const change = await repo.triage(task.id, q);
    expect(change!.task.quadrant).toBe(q);
    expect(await repo.listInbox()).toEqual([]);
    expect((await repo.listByQuadrant(q)).map((t) => t.id)).toEqual([task.id]);
  });

  it('keeps a dropped task active (dropping is a sorted state)', async () => {
    const task = await repo.createCapture({ title: 'x', source: 'web' });
    expect((await repo.triage(task.id, 'drop'))!.task.status).toBe('active');
  });

  it('returns undefined for a missing task', async () => {
    expect(await repo.triage('nope', 'do')).toBeUndefined();
  });
});

describe('Today warning', () => {
  const date = '2026-10-19';

  async function addTasks(count: number) {
    const results = [];
    for (let i = 0; i < count; i++) {
      const t = await repo.createCapture({ title: `t${i}`, source: 'web' });
      results.push(await repo.addToToday(t.id, date));
    }
    return results;
  }

  it('does not warn for the first 3', async () => {
    const results = await addTasks(3);
    expect(results.map((r) => r!.today.isOver)).toEqual([false, false, false]);
  });

  it('allows a 4th task and warns instead of blocking', async () => {
    const results = await addTasks(4);
    expect(results[3]!.today).toMatchObject({ count: 4, isOver: true });
    expect(results[3]!.today.warning).toContain("That's 4 for today");
    expect(await repo.listToday(date)).toHaveLength(4);
  });

  it('orders Today picks and does not double count a re-add', async () => {
    const [a, b] = await addTasks(2);
    const again = await repo.addToToday(a!.task.id, date);
    expect(again!.today.count).toBe(2);
    expect((await repo.listToday(date)).map((t) => t.id)).toEqual([a!.task.id, b!.task.id]);
    expect((await repo.listToday(date)).map((t) => t.todayOrder)).toEqual([1, 2]);
  });
});
