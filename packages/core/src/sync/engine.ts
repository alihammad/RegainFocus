import type { Task } from '../model/types';
import { backoffMs } from './backoff';
import type { RemoteStore } from './remote';
import type { OutboxEntry, RegainDb } from '../store/db';

/** The sync pill: "Synced to web", "Saving… will sync", "Offline. Saved on this phone". */
export type SyncState = 'synced' | 'pending' | 'offline';

export interface SyncEngineOptions {
  now?: () => number;
  isOnline?: () => boolean;
  backoff?: (attempts: number) => number;
  batchSize?: number;
}

const CURSOR_KEY = 'tasks.cursor';

export class SyncEngine {
  private readonly now: () => number;
  private readonly isOnline: () => boolean;
  private readonly backoff: (attempts: number) => number;
  private readonly batchSize: number;

  constructor(
    private readonly db: RegainDb,
    private readonly remote: RemoteStore,
    opts: SyncEngineOptions = {},
  ) {
    this.now = opts.now ?? Date.now;
    this.isOnline =
      opts.isOnline ?? (() => (typeof navigator === 'undefined' ? true : navigator.onLine));
    this.backoff = opts.backoff ?? backoffMs;
    this.batchSize = opts.batchSize ?? 50;
  }

  async state(): Promise<SyncState> {
    if (!this.isOnline()) return 'offline';
    return (await this.db.outbox.count()) > 0 ? 'pending' : 'synced';
  }

  /** Push everything that is due. Failed entries stay queued and back off; nothing is dropped. */
  async push(): Promise<void> {
    if (!this.isOnline()) return;
    const due = await this.db.outbox.where('nextAttemptAt').belowOrEqual(this.now()).toArray();
    for (let i = 0; i < due.length; i += this.batchSize) {
      await this.pushBatch(due.slice(i, i + this.batchSize));
    }
  }

  private async pushBatch(entries: OutboxEntry[]): Promise<void> {
    const snapshot = await this.snapshot(entries);
    if (snapshot.length === 0) return;
    try {
      await this.remote.upsertTasks(snapshot.map((s) => s.task));
      await this.confirm(snapshot.map((s) => s.entry));
    } catch (batchError) {
      // One bad row must not hold up the rest, so retry the batch row by row.
      if (snapshot.length === 1) {
        await this.fail([snapshot[0]!.entry], batchError);
        return;
      }
      for (const item of snapshot) {
        try {
          await this.remote.upsertTasks([item.task]);
          await this.confirm([item.entry]);
        } catch (error) {
          await this.fail([item.entry], error);
        }
      }
    }
  }

  private async snapshot(entries: OutboxEntry[]): Promise<{ entry: OutboxEntry; task: Task }[]> {
    const out: { entry: OutboxEntry; task: Task }[] = [];
    for (const entry of entries) {
      const task = await this.db.tasks.get(entry.id);
      if (task) out.push({ entry, task });
      else await this.db.outbox.delete(entry.key); // row is gone locally, nothing to send
    }
    return out;
  }

  /** Remove entries the server accepted, unless the task changed again while we were sending. */
  private async confirm(entries: OutboxEntry[]): Promise<void> {
    await this.db.transaction('rw', this.db.outbox, async () => {
      for (const sent of entries) {
        const current = await this.db.outbox.get(sent.key);
        if (current && current.rev === sent.rev) await this.db.outbox.delete(sent.key);
      }
    });
  }

  private async fail(entries: OutboxEntry[], error: unknown): Promise<void> {
    const message = error instanceof Error ? error.message : String(error);
    await this.db.transaction('rw', this.db.outbox, async () => {
      for (const sent of entries) {
        const current = await this.db.outbox.get(sent.key);
        if (!current) continue;
        const attempts = current.rev === sent.rev ? sent.attempts + 1 : current.attempts;
        // A newer local edit keeps its immediate retry; otherwise back off.
        const nextAttemptAt =
          current.rev === sent.rev ? this.now() + this.backoff(attempts) : current.nextAttemptAt;
        await this.db.outbox.put({ ...current, attempts, nextAttemptAt, lastError: message });
      }
    });
  }

  /** Bring in changes from other devices. Per row, the newer updatedAt wins. */
  async pull(): Promise<void> {
    if (!this.isOnline()) return;
    let cursor = (await this.db.meta.get(CURSOR_KEY))?.value ?? null;
    for (;;) {
      const page = await this.remote.pullTasks(cursor);
      await this.db.transaction('rw', this.db.tasks, this.db.meta, async () => {
        for (const remote of page.rows) {
          const local = await this.db.tasks.get(remote.id);
          if (!local || Date.parse(remote.updatedAt) > Date.parse(local.updatedAt)) {
            await this.db.tasks.put(remote);
          }
        }
        if (page.cursor) await this.db.meta.put({ key: CURSOR_KEY, value: page.cursor });
      });
      const advanced = page.cursor !== null && page.cursor !== cursor;
      cursor = page.cursor ?? cursor;
      if (!page.hasMore || !advanced) break;
    }
  }

  /** One full round: push local changes, then pull remote ones. */
  async sync(): Promise<void> {
    await this.push();
    await this.pull();
  }
}
