import type { SupabaseClient } from '@supabase/supabase-js';
import type { Task } from '../model/types';
import { rowToTask, taskToRow, type TaskRow } from './mapping';
import type { PullResult, RemoteStore } from './remote';

const PAGE_SIZE = 500;

/**
 * RemoteStore backed by Supabase. It takes an already-built client, so local and hosted
 * projects differ only in the URL and key the app passes to createClient.
 */
export class SupabaseRemote implements RemoteStore {
  constructor(private readonly client: SupabaseClient) {}

  async upsertTasks(rows: Task[]): Promise<void> {
    const { error } = await this.client
      .from('tasks')
      .upsert(rows.map(taskToRow), { onConflict: 'id' });
    if (error) throw new Error(error.message);
  }

  async pullTasks(since: string | null): Promise<PullResult> {
    let query = this.client
      .from('tasks')
      .select('*')
      .order('server_modified_at', { ascending: true })
      .limit(PAGE_SIZE);
    // gte, not gt: rows written in one transaction share a timestamp. Re-reading is harmless
    // because applying a row is idempotent.
    if (since) query = query.gte('server_modified_at', since);
    const { data, error } = await query;
    if (error) throw new Error(error.message);
    const rows = (data ?? []) as TaskRow[];
    const cursor = rows.length ? (rows[rows.length - 1]!.server_modified_at ?? null) : since;
    return { rows: rows.map(rowToTask), cursor, hasMore: rows.length === PAGE_SIZE };
  }
}
