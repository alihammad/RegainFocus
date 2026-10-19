// Runs against a real local Supabase (pnpm db:start). Skipped unless these are set:
//   SUPABASE_TEST_URL, SUPABASE_TEST_PUBLISHABLE_KEY, SUPABASE_TEST_SECRET_KEY
// Values come from the output of `pnpm db:start`.
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { Task } from '../model/types';
import { RegainDb } from '../store/db';
import { TaskRepository } from '../store/repository';
import { SyncEngine } from './engine';
import { SupabaseRemote } from './supabaseRemote';

const url = process.env.SUPABASE_TEST_URL;
const publishable = process.env.SUPABASE_TEST_PUBLISHABLE_KEY;
const secret = process.env.SUPABASE_TEST_SECRET_KEY;

describe.skipIf(!url || !publishable || !secret)('SupabaseRemote against local Supabase', () => {
  const password = 'test-password-123';
  const emails = [`a-${crypto.randomUUID()}@example.com`, `b-${crypto.randomUUID()}@example.com`];
  const ids: string[] = [];
  let admin: SupabaseClient;
  let clientA: SupabaseClient;
  let clientB: SupabaseClient;
  let userA: string;

  async function signIn(email: string): Promise<{ client: SupabaseClient; userId: string }> {
    const { data: created, error } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });
    if (error) throw error;
    ids.push(created.user.id);
    const client = createClient(url!, publishable!, { auth: { persistSession: false } });
    const { error: signInError } = await client.auth.signInWithPassword({ email, password });
    if (signInError) throw signInError;
    return { client, userId: created.user.id };
  }

  beforeAll(async () => {
    admin = createClient(url!, secret!, { auth: { persistSession: false } });
    const a = await signIn(emails[0]!);
    const b = await signIn(emails[1]!);
    clientA = a.client;
    clientB = b.client;
    userA = a.userId;
  });

  afterAll(async () => {
    for (const id of ids) await admin.auth.admin.deleteUser(id);
  });

  it('a capture made on one device syncs to the server and down to another device', async () => {
    const phone = new RegainDb(`phone-${crypto.randomUUID()}`);
    const web = new RegainDb(`web-${crypto.randomUUID()}`);
    const phoneRepo = new TaskRepository(phone, { userId: userA });
    const phoneSync = new SyncEngine(phone, new SupabaseRemote(clientA), { isOnline: () => true });
    const webSync = new SyncEngine(web, new SupabaseRemote(clientA), { isOnline: () => true });

    const task = await phoneRepo.createCapture({
      title: 'Ask Chetan for the DR update',
      source: 'mobile_voice',
      when: 'today',
      energy: 'quick',
    });
    await phoneSync.sync();
    expect(await phone.outbox.count()).toBe(0);

    await webSync.sync();
    const onWeb = await web.tasks.get(task.id);
    expect(onWeb).toEqual(task); // identical, including tags and timestamps

    // Triage on the web flows back to the phone.
    const webRepo = new TaskRepository(web, { userId: userA });
    await webRepo.triage(task.id, 'plan');
    await webSync.sync();
    await phoneSync.sync();
    expect((await phone.tasks.get(task.id))?.quadrant).toBe('plan');
  });

  it('syncs an undone capture as a delete', async () => {
    const db = new RegainDb(`undo-${crypto.randomUUID()}`);
    const repo = new TaskRepository(db, { userId: userA });
    const sync = new SyncEngine(db, new SupabaseRemote(clientA), { isOnline: () => true });
    const task = await repo.createCapture({ title: 'oops', source: 'mobile_text' });
    await repo.undoCapture(task.id);
    await sync.sync();
    const { data } = await clientA.from('tasks').select('deleted_at').eq('id', task.id).single();
    expect(data?.deleted_at).not.toBeNull();
  });

  it('allows a 4th Today task on the server (the UI warns instead)', async () => {
    const db = new RegainDb(`today-${crypto.randomUUID()}`);
    const repo = new TaskRepository(db, { userId: userA });
    const sync = new SyncEngine(db, new SupabaseRemote(clientA), { isOnline: () => true });
    const date = '2026-10-19';
    for (let i = 0; i < 4; i++) {
      const t = await repo.createCapture({ title: `today ${i}`, source: 'web' });
      await repo.addToToday(t.id, date);
    }
    await sync.sync();
    expect(await db.outbox.count()).toBe(0);
    const { count } = await clientA
      .from('tasks')
      .select('*', { count: 'exact', head: true })
      .eq('today_date', date);
    expect(count).toBe(4);
  });

  it("another user cannot see or push into someone else's tasks", async () => {
    const db = new RegainDb(`iso-${crypto.randomUUID()}`);
    const repo = new TaskRepository(db, { userId: userA });
    const task = await repo.createCapture({ title: 'private', source: 'web' });
    await new SyncEngine(db, new SupabaseRemote(clientA), { isOnline: () => true }).sync();

    const { data } = await clientB.from('tasks').select('id').eq('id', task.id);
    expect(data).toEqual([]);

    const stolen: Task = { ...task, title: 'hijacked' };
    await expect(new SupabaseRemote(clientB).upsertTasks([stolen])).rejects.toThrow();
  });

  it('a stale write from a device does not overwrite newer data', async () => {
    const db = new RegainDb(`stale-${crypto.randomUUID()}`);
    const repo = new TaskRepository(db, { userId: userA });
    const remote = new SupabaseRemote(clientA);
    const task = await repo.createCapture({ title: 'v1', source: 'web' });
    const newer: Task = {
      ...task,
      title: 'v2',
      updatedAt: new Date(Date.now() + 60_000).toISOString(),
    };
    await remote.upsertTasks([newer]);
    await remote.upsertTasks([{ ...task, title: 'old retry' }]);
    const { data } = await clientA.from('tasks').select('title').eq('id', task.id).single();
    expect(data?.title).toBe('v2');
  });
});
