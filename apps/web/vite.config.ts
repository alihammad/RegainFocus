import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: { host: '127.0.0.1', port: 5173 },
  // End-to-end specs in e2e/ belong to Playwright, not Vitest.
  test: { include: ['src/**/*.test.ts'] },
});
