import { defineConfig, devices } from '@playwright/test';

// End-to-end tests run the real app against the local Supabase (pnpm db:start).
export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  workers: 2,
  reporter: [['list']],
  use: { baseURL: 'http://127.0.0.1:5173', trace: 'retain-on-failure' },
  projects: [
    { name: 'phone', testMatch: /phone\..*spec\.ts/, use: { ...devices['Pixel 7'] } },
    {
      name: 'desk',
      testMatch: /desk\..*spec\.ts/,
      use: { ...devices['Desktop Chrome'], viewport: { width: 1280, height: 800 } },
    },
  ],
  webServer: {
    command: 'pnpm dev',
    url: 'http://127.0.0.1:5173',
    reuseExistingServer: true,
    timeout: 60_000,
  },
});
