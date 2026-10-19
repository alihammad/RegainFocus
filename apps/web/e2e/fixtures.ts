import { execSync } from 'node:child_process';
import { resolve } from 'node:path';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { expect, type BrowserContext, type Page } from '@playwright/test';

const repoRoot = resolve(import.meta.dirname, '../../..');

function localSupabase(): { url: string; secret: string } {
  const out = execSync('pnpm exec supabase status -o env', { cwd: repoRoot, encoding: 'utf8' });
  const value = (key: string) => out.match(new RegExp(`^${key}="(.*)"$`, 'm'))?.[1] ?? '';
  return { url: value('API_URL'), secret: value('SECRET_KEY') };
}

const { url, secret } = localSupabase();
export const admin: SupabaseClient = createClient(url, secret, { auth: { persistSession: false } });

export interface TestUser {
  id: string;
  email: string;
  password: string;
}

/** A fresh user per test, so tests never see each other's data. */
export async function createUser(): Promise<TestUser> {
  const email = `e2e-${crypto.randomUUID()}@example.com`;
  const password = 'e2e-password-123';
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });
  if (error) throw error;
  return { id: data.user.id, email, password };
}

export async function deleteUser(user: TestUser): Promise<void> {
  await admin.auth.admin.deleteUser(user.id);
}

/** Sign in through the local-development form. */
export async function signIn(page: Page, user: TestUser): Promise<void> {
  await page.goto('/');
  await page.getByLabel('Email').fill(user.email);
  await page.getByLabel('Password').fill(user.password);
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
}

/** Server-side view of a user's tasks, bypassing row-level security. */
export async function serverTasks(user: TestUser) {
  const { data, error } = await admin
    .from('tasks')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at');
  if (error) throw error;
  return data;
}

export async function expectSynced(page: Page): Promise<void> {
  await expect(page.getByRole('status').filter({ hasText: 'Synced to web' })).toBeVisible({
    timeout: 15_000,
  });
}

export async function goOffline(context: BrowserContext): Promise<void> {
  await context.setOffline(true);
}
