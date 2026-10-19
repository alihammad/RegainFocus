import type { Energy, Quadrant, Source, Task, When } from '../model/types';
import { tasksForToday, todayStatus, type TodayStatus } from '../rules/today';
import { triagePatch } from '../rules/triage';
import { outboxKey, type RegainDb } from './db';

export interface CaptureInput {
  title: string;
  source: Source;
  /** Optional capture tags: Today / This week, Quick win / Deep focus. */
  when?: Extract<When, 'today' | 'this_week'>;
  energy?: Extract<Energy, 'quick' | 'deep'>;
}

export type TaskPatch = Partial<Omit<Task, 'id' | 'userId' | 'createdAt' | 'updatedAt'>>;

export interface Change<T = Task> {
  task: T;
  /** Reverts this change. Resolves to the restored task. */
  undo: () => Promise<Task | undefined>;
}

export class EmptyTitleError extends Error {
  constructor() {
    super('A task needs some text.');
  }
}

export interface RepositoryOptions {
  userId: string;
  now?: () => Date;
  newId?: () => string;
}

export class TaskRepository {
  private readonly userId: string;
  private readonly now: () => Date;
  private readonly newId: () => string;

  constructor(
    private readonly db: RegainDb,
    opts: RepositoryOptions,
  ) {
    this.userId = opts.userId;
    this.now = opts.now ?? (() => new Date());
    this.newId = opts.newId ?? (() => crypto.randomUUID());
  }

  private iso(): string {
    return this.now().toISOString();
  }

  /** Queue a task for sync. Must run inside a transaction that includes db.outbox. */
  private async enqueue(id: string): Promise<void> {
    const key = outboxKey(id);
    const existing = await this.db.outbox.get(key);
    await this.db.outbox.put({
      key,
      entity: 'task',
      id,
      rev: (existing?.rev ?? 0) + 1,
      attempts: 0,
      nextAttemptAt: 0,
    });
  }

  /**
   * Save a capture. Writes the task and its sync entry in one transaction, so a capture is
   * never stored without being queued. Never asks a question: the only rule is non-empty text.
   */
  async createCapture(input: CaptureInput): Promise<Task> {
    const title = input.title.trim();
    if (!title) throw new EmptyTitleError();
    const at = this.iso();
    const task: Task = {
      id: this.newId(),
      userId: this.userId,
      title,
      quadrant: 'inbox',
      status: 'active',
      focusedMinutes: 0,
      source: input.source,
      createdAt: at,
      updatedAt: at,
      ...(input.when ? { when: input.when } : {}),
      ...(input.energy ? { energy: input.energy } : {}),
    };
    await this.db.transaction('rw', this.db.tasks, this.db.outbox, async () => {
      await this.db.tasks.add(task);
      await this.enqueue(task.id);
    });
    return task;
  }

  /** Undo a capture: tombstone it so the delete syncs. Resolves to the removed task. */
  async undoCapture(id: string): Promise<Task | undefined> {
    return this.db.transaction('rw', this.db.tasks, this.db.outbox, async () => {
      const task = await this.db.tasks.get(id);
      if (!task || task.deletedAt) return task;
      const at = this.iso();
      const next: Task = { ...task, deletedAt: at, updatedAt: at };
      await this.db.tasks.put(next);
      await this.enqueue(id);
      return task;
    });
  }

  /** Change fields on a task. The returned undo puts the previous values back. */
  async update(id: string, patch: TaskPatch): Promise<Change | undefined> {
    const result = await this.db.transaction('rw', this.db.tasks, this.db.outbox, async () => {
      const task = await this.db.tasks.get(id);
      if (!task || task.deletedAt) return undefined;
      const previous: TaskPatch = {};
      for (const key of Object.keys(patch) as (keyof TaskPatch)[]) {
        (previous as Record<string, unknown>)[key] = task[key];
      }
      const next: Task = { ...task, ...patch, updatedAt: this.iso() };
      await this.db.tasks.put(next);
      await this.enqueue(id);
      return { task: next, previous };
    });
    if (!result) return undefined;
    return {
      task: result.task,
      undo: async () => (await this.update(id, result.previous))?.task,
    };
  }

  /** Move a task to a quadrant (the four triage buttons). */
  triage(id: string, quadrant: Quadrant): Promise<Change | undefined> {
    return this.update(id, triagePatch(quadrant));
  }

  /**
   * Put a task in Today for a date (YYYY-MM-DD). Never blocked: going over the suggested size
   * only returns a warning for the UI to show.
   */
  async addToToday(
    id: string,
    date: string,
  ): Promise<(Change & { today: TodayStatus }) | undefined> {
    const current = await this.listToday(date);
    const already = current.find((t) => t.id === id);
    const order = already?.todayOrder ?? Math.max(0, ...current.map((t) => t.todayOrder ?? 0)) + 1;
    const change = await this.update(id, { todayDate: date, todayOrder: order });
    if (!change) return undefined;
    const count = already ? current.length : current.length + 1;
    return { ...change, today: todayStatus(count) };
  }

  removeFromToday(id: string): Promise<Change | undefined> {
    return this.update(id, { todayDate: undefined, todayOrder: undefined });
  }

  async get(id: string): Promise<Task | undefined> {
    const task = await this.db.tasks.get(id);
    return task && !task.deletedAt ? task : undefined;
  }

  private async live(): Promise<Task[]> {
    const all = await this.db.tasks.where('userId').equals(this.userId).toArray();
    return all.filter((t) => !t.deletedAt);
  }

  /** The inbox, newest first. */
  async listInbox(): Promise<Task[]> {
    return (await this.live())
      .filter((t) => t.quadrant === 'inbox' && t.status === 'active')
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  async listByQuadrant(quadrant: Exclude<Quadrant, 'inbox'>): Promise<Task[]> {
    return (await this.live())
      .filter((t) => t.quadrant === quadrant && t.status === 'active')
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  }

  async listToday(date: string): Promise<Task[]> {
    return tasksForToday(await this.live(), date);
  }
}
