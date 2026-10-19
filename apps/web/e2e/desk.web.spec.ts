import { devices, expect, test } from '@playwright/test';
import {
  createUser,
  deleteUser,
  expectSynced,
  serverTasks,
  signIn,
  type TestUser,
} from './fixtures';

let user: TestUser;

test.beforeEach(async ({ page }) => {
  user = await createUser();
  await signIn(page, user);
  await expect(page.getByRole('heading', { name: 'To sort' })).toBeVisible();
});

test.afterEach(async () => {
  await deleteUser(user);
});

const capture = async (page: import('@playwright/test').Page, text: string) => {
  const input = page.getByLabel('Capture a thought');
  await input.fill(text);
  await input.press('Enter');
  await expect(input).toHaveValue('');
};

test('shows calm empty states before anything is captured', async ({ page }) => {
  await expect(page.getByText('Nothing to sort right now.')).toBeVisible();
  await expect(page.getByText('Nothing on fire.')).toBeVisible();
  await expect(page.getByText('Nothing planned yet.')).toBeVisible();
  await expect(page.getByText('Nothing to hand off.')).toBeVisible();
  await expect(page.getByText('Nothing to drop.')).toBeVisible();
});

test('the header capture saves to To sort on Enter without leaving the page', async ({ page }) => {
  await capture(page, 'Talk to Ali T about Ignite Marketplace Resources');
  await expect(page.getByRole('status').filter({ hasText: 'Saved to To sort' })).toBeVisible();
  await expect(
    page.getByText('Talk to Ali T about Ignite Marketplace Resources').first(),
  ).toBeVisible();
  await expect(page.getByLabel('1 waiting')).toBeVisible();
  await expect.poll(async () => (await serverTasks(user)).length).toBe(1);
  expect((await serverTasks(user))[0]).toMatchObject({ source: 'web', quadrant: 'inbox' });
});

test('triage moves the oldest item into a quadrant, and Undo puts it back', async ({ page }) => {
  await capture(page, 'First in');
  await capture(page, 'Second in');
  // To sort shows the oldest first.
  const card = page.locator('.focus-card');
  await expect(card).toContainText('First in');

  await page.getByRole('button', { name: 'Do now' }).click();
  await expect(page.getByRole('status').filter({ hasText: 'Moved to Do now' })).toBeVisible();
  await expect(page.locator('[data-quadrant="do"]')).toContainText('First in');
  await expect(card).toContainText('Second in');
  await expect(page.getByLabel('1 waiting')).toBeVisible();

  await page.getByRole('button', { name: 'Undo' }).click();
  await expect(card).toContainText('First in');
  await expect(page.locator('[data-quadrant="do"]')).toContainText('Nothing on fire.');
  await expect(page.getByLabel('2 waiting')).toBeVisible();
});

test('all four triage buttons work', async ({ page }) => {
  for (const [label, quadrant] of [
    ['Do now', 'do'],
    ['Plan', 'plan'],
    ['Delegate', 'delegate'],
    ['Drop', 'drop'],
  ] as const) {
    await capture(page, `to ${quadrant}`);
    await expect(page.locator('.focus-card')).toContainText(`to ${quadrant}`);
    await page.locator('.w-triage').getByRole('button', { name: label }).click();
    await expect(page.locator(`[data-quadrant="${quadrant}"]`)).toContainText(`to ${quadrant}`);
  }
  await expect(page.getByText('Nothing to sort right now.')).toBeVisible();
  const rows = await expect
    .poll(async () => (await serverTasks(user)).map((r) => r.quadrant).sort())
    .toEqual(['delegate', 'do', 'drop', 'plan']);
  void rows;
});

test('the matrix keeps its fixed layout: urgent left, important on top', async ({ page }) => {
  const box = async (q: string) => (await page.locator(`[data-quadrant="${q}"]`).boundingBox())!;
  const [doBox, planBox, delegateBox, dropBox] = [
    await box('do'),
    await box('plan'),
    await box('delegate'),
    await box('drop'),
  ];
  expect(doBox.x).toBeLessThan(planBox.x);
  expect(delegateBox.x).toBeLessThan(dropBox.x);
  expect(doBox.y).toBeLessThan(delegateBox.y);
  expect(planBox.y).toBeLessThan(dropBox.y);
});

test('long quadrant lists collapse after 3 rows', async ({ page }) => {
  for (let i = 1; i <= 5; i++) {
    await capture(page, `Plan item ${i}`);
    await page.locator('.w-triage').getByRole('button', { name: 'Plan' }).click();
    // Only 3 rows show, so wait on the count rather than the text.
    await expect(page.locator('[data-quadrant="plan"] .w-count')).toHaveText(String(i));
  }
  const plan = page.locator('[data-quadrant="plan"]');
  await expect(plan.getByRole('listitem')).toHaveCount(3);
  await plan.getByRole('button', { name: 'Show 2 more' }).click();
  await expect(plan.getByRole('listitem')).toHaveCount(5);
});

test('a capture made on the phone shows up here within 10 seconds', async ({ page, browser }) => {
  const phone = await browser.newContext({ ...devices['Pixel 7'] });
  const phonePage = await phone.newPage();
  await signIn(phonePage, user);
  await expect(phonePage.getByRole('heading', { name: 'Capture', exact: true })).toBeVisible();

  await phonePage.getByLabel("What's on your mind?").fill('Captured on the go');
  await phonePage.getByRole('button', { name: 'Save to inbox' }).click();
  await expectSynced(phonePage);

  await expect(page.getByText('Captured on the go').first()).toBeVisible({ timeout: 10_000 });
  await phone.close();
});

test('a triage made here shows up on the phone inbox', async ({ page, browser }) => {
  const phone = await browser.newContext({ ...devices['Pixel 7'] });
  const phonePage = await phone.newPage();
  await signIn(phonePage, user);
  await expect(phonePage.getByRole('heading', { name: 'Capture', exact: true })).toBeVisible();

  await capture(page, 'Sort me from the desk');
  await expect(phonePage.getByText('Sort me from the desk')).toBeVisible({ timeout: 10_000 });

  await page.locator('.w-triage').getByRole('button', { name: 'Plan' }).click();
  await phonePage.getByRole('button', { name: /in inbox/ }).click();
  await expect(phonePage.getByText('Inbox is clear. Nothing waiting to be sorted.')).toBeVisible({
    timeout: 10_000,
  });
  await phone.close();
});
