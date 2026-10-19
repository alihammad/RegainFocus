// Runs the core tests with the Supabase integration tests enabled.
// Needs the local stack: pnpm db:start
import { spawnSync } from 'node:child_process';

const status = spawnSync('pnpm', ['exec', 'supabase', 'status', '-o', 'env'], {
  encoding: 'utf8',
  shell: true,
});
if (status.status !== 0) {
  console.error('Local Supabase is not running. Start it with: pnpm db:start');
  process.exit(1);
}

const values = Object.fromEntries(
  [...status.stdout.matchAll(/^([A-Z_]+)="(.*)"$/gm)].map((m) => [m[1], m[2]]),
);

const run = spawnSync('pnpm', ['--filter', '@regain/core', 'test'], {
  stdio: 'inherit',
  shell: true,
  env: {
    ...process.env,
    SUPABASE_TEST_URL: values.API_URL,
    SUPABASE_TEST_PUBLISHABLE_KEY: values.PUBLISHABLE_KEY,
    SUPABASE_TEST_SECRET_KEY: values.SECRET_KEY,
  },
});
process.exit(run.status ?? 1);
