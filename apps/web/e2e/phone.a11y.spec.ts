import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';
import { createUser, deleteUser, signIn, type TestUser } from './fixtures';

let user: TestUser;

const FAKE_RECOGNISER = () => {
  function FakeRecognition(this: Record<string, unknown>) {
    this.start = () => {};
    this.stop = () => {};
    this.abort = () => {};
  }
  // Current Chromium has the unprefixed name natively, and the app prefers it, so replace both.
  (window as unknown as Record<string, unknown>).SpeechRecognition = FakeRecognition;
  (window as unknown as Record<string, unknown>).webkitSpeechRecognition = FakeRecognition;
};

async function expectNoViolations(page: Page) {
  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
    .analyze();
  expect(
    results.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).join(', ')}`),
  ).toEqual([]);
}

test.afterEach(async () => {
  if (user) await deleteUser(user);
});

test('sign-in has no accessibility violations', async ({ page }) => {
  user = undefined as never;
  await page.goto('/');
  await expect(page.getByRole('button', { name: 'Sign in with Google' })).toBeVisible();
  await expectNoViolations(page);
});

test.describe('signed in', () => {
  test.beforeEach(async ({ page }) => {
    user = await createUser();
    await page.addInitScript(FAKE_RECOGNISER);
    await signIn(page, user);
    await expect(page.getByRole('heading', { name: 'Capture', exact: true })).toBeVisible();
  });

  test('capture screen: empty, with text, and with items and a toast', async ({ page }) => {
    await expectNoViolations(page);
    await page.getByLabel("What's on your mind?").fill('Something to save');
    await page.getByRole('button', { name: 'Today', exact: true }).click();
    await expectNoViolations(page);
    await page.getByRole('button', { name: 'Save to inbox' }).click();
    await expect(page.getByRole('status').filter({ hasText: 'Saved to inbox' })).toBeVisible();
    await expectNoViolations(page);
  });

  test('inbox: empty and with items', async ({ page }) => {
    await page.getByRole('button', { name: /in inbox/ }).click();
    await expectNoViolations(page);
    await page.getByRole('button', { name: /Capture/ }).click();
    await page.getByLabel("What's on your mind?").fill('Item one');
    await page.getByRole('button', { name: 'Save to inbox' }).click();
    await page.getByRole('button', { name: /in inbox/ }).click();
    await expectNoViolations(page);
  });

  test('voice sheet', async ({ page }) => {
    await page.getByRole('button', { name: 'Capture by voice' }).click();
    await expect(page.getByRole('dialog', { name: 'Voice capture' })).toBeVisible();
    await expectNoViolations(page);
  });

  test('touch targets are at least 44px', async ({ page }) => {
    const small = await page.evaluate(() =>
      [...document.querySelectorAll('button')]
        .map((b) => ({ name: b.textContent?.trim() || b.ariaLabel, r: b.getBoundingClientRect() }))
        .filter(({ r }) => r.width > 0 && (r.height < 44 || r.width < 44))
        .map(({ name, r }) => `${name}: ${Math.round(r.width)}x${Math.round(r.height)}`),
    );
    expect(small).toEqual([]);
  });
});
