import Dexie, { type Table } from 'dexie';
import type { Task } from '../model/types';

/**
 * One entry per task that has local changes the server hasn't confirmed.
 * Entries point at the task row, they don't copy it, so several edits to one task coalesce
 * into a single upsert of its latest state.
 */
export interface OutboxEntry {
  key: string; // `task:<id>`
  entity: 'task';
  id: string;
  rev: number; // bumped on every local change, so a sync never deletes a newer pending edit
  attempts: number;
  nextAttemptAt: number; // epoch ms
  lastError?: string;
}

export interface MetaEntry {
  key: string;
  value: string;
}

export class RegainDb extends Dexie {
  tasks!: Table<Task, string>;
  outbox!: Table<OutboxEntry, string>;
  meta!: Table<MetaEntry, string>;

  constructor(name = 'regain-focus') {
    super(name);
    this.version(1).stores({
      tasks: 'id, userId, quadrant, updatedAt, todayDate',
      outbox: 'key, nextAttemptAt',
      meta: 'key',
    });
  }
}

export const outboxKey = (id: string) => `task:${id}`;
