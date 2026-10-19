import type { Task } from '../model/types';

export interface PullResult {
  rows: Task[];
  /** Pass back as `since` on the next pull. Null when the server has nothing yet. */
  cursor: string | null;
  hasMore: boolean;
}

/** The server side of sync. The Supabase implementation lives in supabaseRemote.ts. */
export interface RemoteStore {
  /** Idempotent: upserting the same row twice is safe, and stale rows are ignored server-side. */
  upsertTasks(rows: Task[]): Promise<void>;
  pullTasks(since: string | null): Promise<PullResult>;
}
