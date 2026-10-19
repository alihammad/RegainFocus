import { expect, test } from '@playwright/test';
import {
  createUser,
  deleteUser,
  expectSynced,
  serverTasks,
  signIn,
  type TestUser,
} from './fixtures';

let user: TestUser;

declare global {
  interface Window {
    __speech?: { onresult: (e: unknown) => void; onerror: (e: unknown) => void };
  }
}

// Headless Chromium can't hear anything, so a fake recogniser stands in for the microphone.
const FAKE_RECOGNISER = () => {
  // A plain constructor function: class fields would be compiled with helpers that don't exist
  // inside the page.
  function FakeRecognition(this: Record<string, unknown>) {
    this.onresult = null;
    this.onerror = null;
    this.onend = null;
    this.start = () => {
      (window as unknown as { __speech: unknown }).__speech = this;
    };
    this.stop = () => {};
    this.abort = () => {};
  }
  // Current Chromium has the unprefixed name natively, and the app prefers it, so replace both.
  (window as unknown as Record<string, unknown>).SpeechRecognition = FakeRecognition;
  (window as unknown as Record<string, unknown>).webkitSpeechRecognition = FakeRecognition;
};

const hear = (page: import('@playwright/test').Page, text: string) =>
  page.evaluate((t) => window.__speech?.onresult({ results: [{ 0: { transcript: t } }] }), text);

test.afterEach(async () => {
  await deleteUser(user);
});

test.describe('with speech recognition', () => {
  test.beforeEach(async ({ page }) => {
    user = await createUser();
    await page.addInitScript(FAKE_RECOGNISER);
    await signIn(page, user);
    await expect(page.getByRole('heading', { name: 'Capture', exact: true })).toBeVisible();
  });

  test('listens, shows the transcript, and saves as a voice capture', async ({ page }) => {
    await page.getByRole('button', { name: 'Capture by voice' }).click();
    const sheet = page.getByRole('dialog', { name: 'Voice capture' });
    await expect(sheet).toBeVisible();
    await expect(sheet.getByText('Listening')).toBeVisible();
    await expect(sheet.getByText('Speak now…')).toBeVisible();
    await expect(sheet.getByRole('button', { name: 'Save to inbox' })).toBeDisabled();

    await hear(page, 'Ask Chetan for the DR update');
    await expect(sheet.getByText('Got it. Save, or cancel and try again.')).toBeVisible();
    await expect(sheet.getByText('Ask Chetan for the DR update')).toBeVisible();

    await sheet.getByRole('button', { name: 'Save to inbox' }).click();
    await expect(sheet).toBeHidden();
    await expect(page.getByRole('status').filter({ hasText: 'Saved to inbox' })).toBeVisible();
    await expectSynced(page);

    const [row] = await serverTasks(user);
    expect(row).toMatchObject({ title: 'Ask Chetan for the DR update', source: 'mobile_voice' });
  });

  test('Cancel discards the transcript', async ({ page }) => {
    await page.getByRole('button', { name: 'Capture by voice' }).click();
    await hear(page, 'never mind this');
    await page.getByRole('button', { name: 'Cancel' }).click();
    await expect(page.getByRole('dialog')).toBeHidden();
    await expect(page.getByText('Nothing yet. Your first thought will land here.')).toBeVisible();
    expect(await serverTasks(user)).toHaveLength(0);
  });

  test('Escape closes the sheet and focus moves into it while open', async ({ page }) => {
    await page.getByRole('button', { name: 'Capture by voice' }).click();
    await expect(page.getByRole('button', { name: 'Cancel' })).toBeFocused();
    await page.keyboard.press('Escape');
    await expect(page.getByRole('dialog')).toBeHidden();
  });

  test('typing more words does not steal focus from the sheet', async ({ page }) => {
    await page.getByRole('button', { name: 'Capture by voice' }).click();
    const save = page.getByRole('button', { name: 'Save to inbox' }).last();
    await hear(page, 'one');
    await save.focus();
    await hear(page, 'one two three');
    await expect(save).toBeFocused();
  });

  test('a blocked microphone gives a calm message', async ({ page }) => {
    await page.getByRole('button', { name: 'Capture by voice' }).click();
    await page.evaluate(() => window.__speech?.onerror({ error: 'not-allowed' }));
    await expect(page.getByText('The microphone is blocked. You can type instead.')).toBeVisible();
  });
});

test.describe('without speech recognition', () => {
  test.beforeEach(async ({ page }) => {
    user = await createUser();
    await page.addInitScript(() => {
      delete (window as unknown as Record<string, unknown>).webkitSpeechRecognition;
      delete (window as unknown as Record<string, unknown>).SpeechRecognition;
    });
    await signIn(page, user);
    await expect(page.getByRole('heading', { name: 'Capture', exact: true })).toBeVisible();
  });

  test('falls back to keyboard dictation: focuses the box and explains', async ({ page }) => {
    await page.getByRole('button', { name: 'Capture by voice' }).click();
    await expect(page.getByRole('dialog')).toBeHidden();
    await expect(page.getByLabel("What's on your mind?")).toBeFocused();
    await expect(page.getByText(/Tap the microphone on your keyboard to dictate/)).toBeVisible();
  });
});
