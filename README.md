# Regain Focus

Quick capture and an Eisenhower matrix for adults with ADHD. Read `CLAUDE.md`, then `docs/SPEC.md` and `docs/DESIGN.md`.

## Layout

| Path            | What                                                      |
| --------------- | --------------------------------------------------------- |
| `apps/web`      | Vite + React PWA (mobile capture and the web app)         |
| `packages/core` | Data model, local store, sync and rules. No React or DOM. |
| `supabase`      | Migrations, pgTAP tests and local config                  |

## Run it locally

Needs Node, pnpm and Docker Desktop.

```
pnpm install
pnpm db:start        # local Supabase; prints the API URL and publishable key
cp apps/web/.env.example apps/web/.env.local   # then paste the key
pnpm dev             # http://127.0.0.1:5173
```

Sign-in: Google needs credentials (see `supabase/.env.example`). Until then, the dev server shows a
"Local development" email and password form on the sign-in screen. It is not in production builds.

Resize the window below 768px wide to get the phone app; wider shows the desk app. Both use the same data.

### Checks

| Command                                    | What it runs                                                                    |
| ------------------------------------------ | ------------------------------------------------------------------------------- |
| `pnpm typecheck`, `pnpm lint`, `pnpm test` | Types, lint, unit tests (core and web)                                          |
| `pnpm db:test`                             | pgTAP database tests (needs `pnpm db:start`)                                    |
| `pnpm test:integration`                    | Core tests plus the Supabase adapter against the local database                 |
| `pnpm --filter @regain/web test:e2e`       | Playwright against the real app: phone, desk, voice, offline PWA, accessibility |

### Trying it on a real Android phone

The service worker, microphone and install prompt need a secure origin, and `localhost` counts. With USB
debugging on, forward the ports and open the app on the phone:

```
adb reverse tcp:5173 tcp:5173
adb reverse tcp:54321 tcp:54321
```

Then open `http://localhost:5173` in Chrome on the phone. For the installed-app and offline behaviour, run
`pnpm --filter @regain/web build && pnpm --filter @regain/web preview` and forward port 4173 instead.

## Moving to a hosted Supabase project

Schema lives only in `supabase/migrations`. Create a project, run `supabase link` then `supabase db push`, enable the Google provider in the dashboard, and set the two `VITE_SUPABASE_*` values. No code changes.
