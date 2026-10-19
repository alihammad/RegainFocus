import { beforeEach, describe, expect, it } from 'vitest';
import type { Task } from '../model/types';
import { RegainDb } from '../store/db';
import { TaskRepository } from '../store/repository';
import { backoffMs } from './backoff';
import { SyncEngine } from './engine';
import type { PullResult, RemoteStore } from './remote';

class FakeRemote implements RemoteStore {
  rows = new Map<string, Task>();
  failAll = false;
  failIds = new Set<string>();
  calls = 0;
  onUpsert?: () => Promise<void>;
  pages: PullResult[] = [];
  pullSince: (string | null)[] = [];

  async upsertTasks(rows: Task[]): Promise<void> {
    this.calls++;
    if (this.onUpsert) await this.onUpsert();
    if (this.failAll) throw new Error('network down');
    if (rows.some((r) => this.failIds.has(r.id))) throw new Error('rejected');
    for (const r of rows) this.rows.set(r.id, r);
  }

  async pullTasks(since: string | null): Promise<PullResult> {
    this.pullSince.push(since);
    return this.pages.shift() ?? { rows: [], cursor: since, hasMore: false };
  }
}

let db: RegainDb;
let repo: TaskRepository;
let remote: FakeRemote;
let online: boolean;
let clock: number;
let engine: SyncEngine;

const makeEngine = (d: RegainDb) =>
  new SyncEngine(d, remote, { now: () => clock, isOnline: () => online, backoff: backoffMs });

beforeEach(() => {
  db = new RegainDb(`test-${crypto.randomUUID()}`);
  remote = new FakeRemote();
  online = true;
  clock = Date.parse('2026-10-19T09:00:00.000Z');
  let n = 0;
  repo = new TaskRepository(db, {
    userId: 'u',
    now: () => new Date(clock),
    newId: () => `task-${++n}`,
  });
  engine = makeEngine(db);
});

describe('sync state (the pill)', () => {
  it('is synced with nothing queued', async () => {
    expect(await engine.state()).toBe('synced');
  });

  it('is pending when online with queued captures', async () => {
    await repo.createCapture({ title: 'a', source: 'mobile_text' });
    expect(await engine.state()).toBe('pending');
  });

  it('is offline when offline, even with nothing queued', async () => {
    online = false;
    expect(await engine.state()).toBe('offline');
  });
});

describe('offline queue', () => {
  it('a capture made offline syncs when the phone reconnects', async () => {
    online = false;
    const task = await repo.createCapture({ title: 'airplane mode', source: 'mobile_text' });
    await engine.sync();
    expect(remote.rows.size).toBe(0); // nothing sent while offline
    expect(await db.outbox.count()).toBe(1);
    expect(await engine.state()).toBe('offline');

    online = true;
    await engine.sync();
    expect(remote.rows.get(task.id)).toEqual(task);
    expect(await db.outbox.count()).toBe(0);
    expect(await engine.state()).toBe('synced');
  });

  it('keeps a failed capture queued and backs off before retrying', async () => {
    await repo.createCapture({ title: 'a', source: 'web' });
    remote.failAll = true;
    await engine.push();
    const entry = (await db.outbox.toArray())[0]!;
    expect(entry).toMatchObject({ attempts: 1, lastError: 'network down' });
    expect(entry.nextAttemptAt).toBe(clock + 2000);

    const callsBefore = remote.calls;
    await engine.push(); // not due yet
    expect(remote.calls).toBe(callsBefore);

    clock += 2000;
    remote.failAll = false;
    await engine.push();
    expect(remote.rows.size).toBe(1);
    expect(await db.outbox.count()).toBe(0);
  });

  it('never drops a capture, however many times sync fails', async () => {
    await repo.createCapture({ title: 'precious', source: 'mobile_voice' });
    remote.failAll = true;
    for (let i = 0; i < 20; i++) {
      await engine.push();
      clock += 10 * 60 * 1000;
    }
    expect(await db.outbox.count()).toBe(1);
    expect((await db.outbox.toArray())[0]!.attempts).toBe(20);
    expect(await db.tasks.count()).toBe(1);
  });

  it('survives an app restart between failure and retry', async () => {
    await repo.createCapture({ title: 'restart', source: 'mobile_text' });
    remote.failAll = true;
    await engine.push();
    const name = db.name;
    db.close();

    const reopened = new RegainDb(name);
    remote.failAll = false;
    clock += 5000;
    await makeEngine(reopened).push();
    expect([...remote.rows.values()].map((t) => t.title)).toEqual(['restart']);
    expect(await reopened.outbox.count()).toBe(0);
  });

  it('one rejected row does not block the others', async () => {
    const bad = await repo.createCapture({ title: 'bad', source: 'web' });
    await repo.createCapture({ title: 'good', source: 'web' });
    remote.failIds.add(bad.id);
    await engine.push();
    expect([...remote.rows.values()].map((t) => t.title)).toEqual(['good']);
    expect((await db.outbox.toArray()).map((e) => e.id)).toEqual([bad.id]);
  });

  it('keeps a newer edit made while a push was in flight', async () => {
    const task = await repo.createCapture({ title: 'a', source: 'web' });
    remote.onUpsert = async () => {
      remote.onUpsert = undefined;
      await repo.triage(task.id, 'plan'); // edit lands mid-send
    };
    await engine.push();
    expect(await db.outbox.count()).toBe(1); // still queued
    await engine.push();
    expect(remote.rows.get(task.id)?.quadrant).toBe('plan');
    expect(await db.outbox.count()).toBe(0);
  });

  it('syncs an undone capture as a tombstone', async () => {
    const task = await repo.createCapture({ title: 'oops', source: 'web' });
    await repo.undoCapture(task.id);
    await engine.push();
    expect(remote.rows.get(task.id)?.deletedAt).toBeDefined();
  });

  it('coalesces several edits into one upsert of the latest state', async () => {
    const task = await repo.createCapture({ title: 'a', source: 'web' });
    await repo.triage(task.id, 'do');
    await repo.triage(task.id, 'plan');
    expect(await db.outbox.count()).toBe(1);
    await engine.push();
    expect(remote.calls).toBe(1);
    expect(remote.rows.get(task.id)?.quadrant).toBe('plan');
  });
});

describe('backoff', () => {
  it('doubles from 2s and caps at 5 minutes', () => {
    expect([1, 2, 3, 4].map(backoffMs)).toEqual([2000, 4000, 8000, 16000]);
    expect(backoffMs(50)).toBe(300000);
  });
});

describe('pull', () => {
  const remoteTask = (over: Partial<Task>): Task => ({
    id: 'r1',
    userId: 'u',
    title: 'from web',
    quadrant: 'inbox',
    status: 'active',
    focusedMinutes: 0,
    source: 'web',
    createdAt: '2026-10-19T08:00:00.000Z',
    updatedAt: '2026-10-19T08:00:00.000Z',
    ...over,
  });

  it('brings in new rows and remembers the cursor', async () => {
    remote.pages = [{ rows: [remoteTask({})], cursor: 'c1', hasMore: false }];
    await engine.pull();
    expect((await db.tasks.get('r1'))?.title).toBe('from web');
    expect(await db.outbox.count()).toBe(0); // pulled rows are not pushed back
    await engine.pull();
    expect(remote.pullSince).toEqual([null, 'c1']);
  });

  it('newer updatedAt wins, older is ignored', async () => {
    const local = await repo.createCapture({ title: 'local', source: 'web' });
    const older = remoteTask({
      id: local.id,
      title: 'older',
      updatedAt: '2026-10-19T08:00:00.000Z',
    });
    const newer = remoteTask({
      id: local.id,
      title: 'newer',
      updatedAt: '2026-10-19T10:00:00.000Z',
    });

    remote.pages = [{ rows: [older], cursor: 'c1', hasMore: false }];
    await engine.pull();
    expect((await db.tasks.get(local.id))?.title).toBe('local');

    remote.pages = [{ rows: [newer], cursor: 'c2', hasMore: false }];
    await engine.pull();
    expect((await db.tasks.get(local.id))?.title).toBe('newer');
  });

  it('reads every page', async () => {
    remote.pages = [
      { rows: [remoteTask({ id: 'a' })], cursor: 'c1', hasMore: true },
      { rows: [remoteTask({ id: 'b' })], cursor: 'c2', hasMore: false },
    ];
    await engine.pull();
    expect(await db.tasks.count()).toBe(2);
    expect(remote.pullSince).toEqual([null, 'c1']);
  });

  it('does nothing offline', async () => {
    online = false;
    remote.pages = [{ rows: [remoteTask({})], cursor: 'c1', hasMore: false }];
    await engine.pull();
    expect(await db.tasks.count()).toBe(0);
  });
});
