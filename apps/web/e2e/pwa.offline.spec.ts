import { expect, test, type Page } from '@playwright/test';
import {
  createUser,
  deleteUser,
  expectSynced,
  serverTasks,
  injectSession,
  type TestUser,
} from './fixtures';

let user: TestUser;

test.beforeEach(async ({ page, context }) => {
  user = await createUser();
  await injectSession(context, user);
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Capture', exact: true })).toBeVisible();
  await waitForServiceWorker(page);
});

test.afterEach(async () => {
  await deleteUser(user);
});

async function waitForServiceWorker(page: Page) {
  await page.evaluate(() => navigator.serviceWorker.ready);
  // Once active it claims open pages; a reload guarantees this page is controlled.
  await page.reload();
  await page.waitForFunction(() => navigator.serviceWorker.controller !== null);
  await expect(page.getByRole('heading', { name: 'Capture', exact: true })).toBeVisible();
}

test('is installable: manifest, icons and name', async ({ page, request }) => {
  const manifest = await (await request.get('/manifest.webmanifest')).json();
  expect(manifest).toMatchObject({
    name: 'Regain Focus',
    short_name: 'Regain Focus',
    display: 'standalone',
    start_url: '/',
  });
  const sizes = manifest.icons.map((i: { sizes: string }) => i.sizes);
  expect(sizes).toEqual(expect.arrayContaining(['192x192', '512x512']));
  expect(manifest.icons.some((i: { purpose?: string }) => i.purpose === 'maskable')).toBe(true);
  await expect(page).toHaveTitle('Regain Focus');
  for (const icon of manifest.icons) {
    expect((await request.get(`/${icon.src}`)).ok()).toBe(true);
  }
});

test('opens and captures with no network at all, then syncs on reconnect', async ({
  page,
  context,
}) => {
  await context.setOffline(true);
  await page.reload(); // the app shell comes from the service worker cache
  await expect(page.getByRole('heading', { name: 'Capture', exact: true })).toBeVisible();
  await expect(
    page.getByRole('status').filter({ hasText: 'Offline. Saved on this phone' }),
  ).toBeVisible();

  await page.getByLabel("What's on your mind?").fill('Written with no signal');
  await page.getByRole('button', { name: 'Save to inbox' }).click();
  await expect(page.getByRole('list').getByText('Written with no signal')).toBeVisible();

  // Close the app and open it again, still offline: the capture is still there.
  await page.close();
  const reopened = await context.newPage();
  await reopened.goto('/');
  await expect(reopened.getByRole('list').getByText('Written with no signal')).toBeVisible();
  expect(await serverTasks(user)).toHaveLength(0);

  await context.setOffline(false);
  await expectSynced(reopened);
  expect((await serverTasks(user)).map((t) => t.title)).toEqual(['Written with no signal']);
});
