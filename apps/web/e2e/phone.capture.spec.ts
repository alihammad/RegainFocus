import { expect, test } from '@playwright/test';
import {
  createUser,
  deleteUser,
  expectSynced,
  goOffline,
  serverTasks,
  signIn,
  type TestUser,
} from './fixtures';

let user: TestUser;

test.beforeEach(async ({ page }) => {
  user = await createUser();
  await signIn(page, user);
  await expect(page.getByRole('heading', { name: 'Capture', exact: true })).toBeVisible();
});

test.afterEach(async () => {
  await deleteUser(user);
});

const box = (page: import('@playwright/test').Page) => page.getByLabel("What's on your mind?");
const save = (page: import('@playwright/test').Page) =>
  page.getByRole('button', { name: 'Save to inbox' });

test('opens on capture with the box focused, and Save is off until there is text', async ({
  page,
}) => {
  await expect(box(page)).toBeFocused();
  await expect(save(page)).toBeDisabled();
  await box(page).fill('   ');
  await expect(save(page)).toBeDisabled();
  await expect(page.getByText('Nothing yet. Your first thought will land here.')).toBeVisible();
});

test('saving shows the item, clears the box, toasts, and syncs to the server', async ({ page }) => {
  await box(page).fill('Ask Chetan for the DR update');
  await save(page).click();

  await expect(box(page)).toHaveValue('');
  const toast = page.getByRole('status').filter({ hasText: 'Saved to inbox' });
  await expect(toast).toBeVisible();
  await expect(page.getByRole('list').getByText('Ask Chetan for the DR update')).toBeVisible();
  await expectSynced(page);

  const rows = await serverTasks(user);
  expect(rows).toHaveLength(1);
  expect(rows[0]).toMatchObject({
    title: 'Ask Chetan for the DR update',
    quadrant: 'inbox',
    source: 'mobile_text',
  });
});

test('the Return key saves', async ({ page }) => {
  await box(page).fill('Return key capture');
  await box(page).press('Enter');
  await expect(page.getByRole('status').filter({ hasText: 'Saved to inbox' })).toBeVisible();
  await expect(box(page)).toHaveValue('');
});

test('the toast goes away after 5 seconds', async ({ page }) => {
  await box(page).fill('temporary toast');
  await save(page).click();
  const toast = page.getByRole('status').filter({ hasText: 'Saved to inbox' });
  await expect(toast).toBeVisible();
  await expect(toast).toBeHidden({ timeout: 7000 });
});

test('tag chips toggle, and Today / This week and Quick win / Deep focus are one at a time', async ({
  page,
}) => {
  const chip = (name: string) => page.getByRole('button', { name, exact: true });
  await chip('Today').click();
  await expect(chip('Today')).toHaveAttribute('aria-pressed', 'true');
  await chip('This week').click();
  await expect(chip('Today')).toHaveAttribute('aria-pressed', 'false');
  await expect(chip('This week')).toHaveAttribute('aria-pressed', 'true');
  await chip('This week').click(); // tapping a selected chip clears it
  await expect(chip('This week')).toHaveAttribute('aria-pressed', 'false');

  await chip('Quick win').click();
  await chip('Deep focus').click();
  await expect(chip('Quick win')).toHaveAttribute('aria-pressed', 'false');
  await expect(chip('Deep focus')).toHaveAttribute('aria-pressed', 'true');
});

test('tags are saved with the capture and reset afterwards', async ({ page }) => {
  await page.getByRole('button', { name: 'Today', exact: true }).click();
  await page.getByRole('button', { name: 'Quick win', exact: true }).click();
  await box(page).fill('Tagged capture');
  await save(page).click();
  await expectSynced(page);

  await expect(page.getByRole('button', { name: 'Today', exact: true })).toHaveAttribute(
    'aria-pressed',
    'false',
  );
  const [row] = await serverTasks(user);
  expect(row).toMatchObject({ when_bucket: 'today', energy: 'quick' });
});

test('Undo removes the item and puts the text and tags back in the box', async ({ page }) => {
  await page.getByRole('button', { name: 'This week', exact: true }).click();
  await page.getByRole('button', { name: 'Deep focus', exact: true }).click();
  await box(page).fill('Oops, wrong one');
  await save(page).click();
  await page.getByRole('button', { name: 'Undo' }).click();

  await expect(box(page)).toHaveValue('Oops, wrong one');
  await expect(page.getByRole('button', { name: 'This week', exact: true })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  await expect(page.getByRole('button', { name: 'Deep focus', exact: true })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  await expect(page.getByText('Nothing yet. Your first thought will land here.')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Undo' })).toBeHidden();

  await expectSynced(page);
  const [row] = await serverTasks(user);
  expect(row?.deleted_at).not.toBeNull(); // the delete reached the server
});

test('a capture made offline is saved on the phone and syncs when it reconnects', async ({
  page,
  context,
}) => {
  await goOffline(context);
  await expect(
    page.getByRole('status').filter({ hasText: 'Offline. Saved on this phone' }),
  ).toBeVisible();

  await box(page).fill('Captured in airplane mode');
  await save(page).click();
  await expect(page.getByRole('list').getByText('Captured in airplane mode')).toBeVisible();
  expect(await serverTasks(user)).toHaveLength(0); // nothing reached the server yet

  await context.setOffline(false);
  await expectSynced(page);
  const rows = await serverTasks(user);
  expect(rows.map((r) => r.title)).toEqual(['Captured in airplane mode']);
});

test('a capture survives closing the app while the server is unreachable, then syncs', async ({
  page,
  context,
}) => {
  // Block only the backend, so the app itself can still reload (no service worker in dev).
  await context.route(/127\.0\.0\.1:54321/, (route) => route.abort());
  await box(page).fill('Survives a restart');
  await save(page).click();
  await expect(page.getByRole('list').getByText('Survives a restart')).toBeVisible();
  await expect(page.getByRole('status').filter({ hasText: 'Saving… will sync' })).toBeVisible();

  await page.close();
  const reopened = await context.newPage();
  await reopened.goto('/');
  await expect(reopened.getByRole('list').getByText('Survives a restart')).toBeVisible();
  expect(await serverTasks(user)).toHaveLength(0);

  await context.unroute(/127\.0\.0\.1:54321/);
  await expectSynced(reopened);
  expect((await serverTasks(user)).map((r) => r.title)).toEqual(['Survives a restart']);
});

test('the inbox lists captures with a count, and the tab bar shows it too', async ({ page }) => {
  await expect(page.getByRole('button', { name: /0 in inbox/ })).toBeVisible();
  await box(page).fill('First thought');
  await save(page).click();
  await box(page).fill('Second thought');
  await save(page).click();
  await expect(page.getByRole('button', { name: /2 in inbox/ })).toBeVisible();

  await page.getByRole('button', { name: /in inbox/ }).click();
  await expect(page.getByRole('heading', { name: /Inbox/ })).toBeVisible();
  await expect(page.getByRole('button', { name: /in inbox/ })).toHaveAttribute(
    'aria-current',
    'page',
  );
  await expect(page.getByRole('heading', { name: 'Today' })).toBeVisible();
  const items = page.getByRole('listitem');
  await expect(items.first()).toContainText('Second thought'); // newest first
  await expect(page.getByText(/These wait in To sort on your web matrix/)).toBeVisible();
});

test('an empty inbox is reassuring', async ({ page }) => {
  await page.getByRole('button', { name: /in inbox/ }).click();
  await expect(page.getByText('Inbox is clear. Nothing waiting to be sorted.')).toBeVisible();
});

test('long inbox lists collapse and expand', async ({ page }) => {
  for (let i = 1; i <= 7; i++) {
    await box(page).fill(`Thought ${i}`);
    await save(page).click();
    await expect(box(page)).toHaveValue('');
  }
  await page.getByRole('button', { name: /in inbox/ }).click();
  await expect(page.getByRole('listitem')).toHaveCount(5);
  await page.getByRole('button', { name: 'Show 2 more' }).click();
  await expect(page.getByRole('listitem')).toHaveCount(7);
});

test('See all opens the inbox', async ({ page }) => {
  await box(page).fill('One');
  await save(page).click();
  await page.getByRole('button', { name: 'See all 1' }).click();
  await expect(page.getByRole('heading', { name: /Inbox/ })).toBeVisible();
});
